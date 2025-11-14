// ============================================
// src/hooks/useX01Engine.ts
// X01 engine wrapper: playTurn + safe BUST + CONTINUER + stats exclusives
// + SKIP auto des joueurs terminés (score = 0)
// + Reprise sûre depuis snapshot (hydrateFromSnapshot) — priorité RESUME
// + NEW: Règles de match Sets/Legs (victoire par Sets)
//   - legs gagnés -> set gagné (reset legs + set++)
//   - fin du match quand sets gagnés >= setsTarget
//   - expose currentSet/currentLegInSet/setsTarget/legsTarget/setsWon/legsWon/ruleWinnerId
// + NEW: Modes d'entrée/sortie (inMode/outMode)
//   - inMode: simple | double | master (double||triple)  => gating des points avant “entrée”
//   - outMode: simple | double | master (double||triple)  => validation du checkout
// + NEW: Mode match officiel (serve alterné) — officialMatch
// ============================================
import * as React from "react";
import type {
  Profile,
  Throw as UIThrow,
  MatchRecord,
  Dart as UIDart,
  FinishPolicy,
  LegResult,
  X01Snapshot,
} from "../lib/types";
import type { MatchRules, GameDart, Player } from "../lib/types-game";
import { getEngine } from "../lib/gameEngines";

/* -------- utils mapping (ROBUSTE) -------- */
function toPlayersFromIds(
  profiles: Profile[],
  idsInput: unknown
): Player[] {
  const arr = Array.isArray(idsInput) ? idsInput : [];
  const ids: string[] = arr
    .map((it: any) =>
      typeof it === "string" ? it : it && typeof it === "object" ? it.id : null
    )
    .filter((x: any): x is string => typeof x === "string" && x.length > 0);

  const map = new Map(profiles.map((p) => [p.id, p]));
  return ids
    .map((id) => map.get(id))
    .filter((p): p is Profile => !!p)
    .map((p) => ({ id: p.id, name: p.name || "Player" }));
}

// Si le snapshot contient ses propres joueurs, on respecte leur ordre + nom
function toPlayersFromSnapshot(snap: X01Snapshot | any, profiles: Profile[]): Player[] | null {
  try {
    const snapPlayers = Array.isArray((snap as any)?.players) ? (snap as any).players : null;
    if (!snapPlayers) return null;
    return snapPlayers
      .map((p: any) => {
        const id = typeof p?.id === "string" ? p.id : null;
        if (!id) return null;
        const prof = profiles.find((x) => x.id === id);
        // priorité au nom du snapshot, fallback profil
        const name = (typeof p?.name === "string" && p.name) || prof?.name || "Player";
        return { id, name } as Player;
      })
      .filter(Boolean) as Player[];
  } catch {
    return null;
  }
}

function uiToGameDarts(throwUI: UIThrow): GameDart[] {
  return (throwUI || []).slice(0, 3).map((d) => {
    if (!d || d.v === 0) return { bed: "MISS" };
    if (d.v === 25 && d.mult === 2) return { bed: "IB" }; // 50
    if (d.v === 25) return { bed: "OB" }; // 25
    const number = Math.max(1, Math.min(20, Math.floor(d.v)));
    const bed = d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S";
    return { bed, number };
  });
}
function gameToUIDart(d: GameDart): UIDart {
  if (d.bed === "MISS") return { v: 0, mult: 1, label: "MISS" };
  if (d.bed === "OB") return { v: 25, mult: 1, label: "OB" };
  if (d.bed === "IB") return { v: 25, mult: 2, label: "IB" };
  const mult = d.bed === "T" ? 3 : d.bed === "D" ? 2 : 1;
  return { v: d.number ?? 0, mult };
}
function makeId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

/* -------- record builder (fin de partie "moteur") -------- */
function buildMatchRecordX01(params: { state: any; startedAt: number }): MatchRecord {
  const { state, startedAt } = params;
  const players: Player[] = state.players || [];
  const perTurn: Array<{ playerId: string; darts: GameDart[] }> = state.history || [];

  const rounds: Array<UIThrow[]> = [];
  let currentRound: Record<string, UIThrow> = {};

  for (const t of perTurn) {
    currentRound[t.playerId] = (t.darts || []).map(gameToUIDart);
    const filled = players.every((p) => currentRound[p.id] !== undefined);
    if (filled) {
      rounds.push(players.map((p) => currentRound[p.id] || []));
      currentRound = {};
    }
  }

  const winner = players.find((p) => state.table?.[p.id]?.score === 0) || null;

  return {
    header: {
      id: makeId(),
      mode: "X01",
      startedAt,
      players: players.map((p) => p.id),
      winner: winner ? winner.id : null,
      meta: { rules: state.rules, endedAt: state.endedAt ?? Date.now() },
    },
    rounds,
  };
}

/* -------- points helpers -------- */
function dartPoints(d: UIDart): number {
  if (!d) return 0;
  if (d.v === 25 && d.mult === 2) return 50;
  return d.v * d.mult;
}
function dartPointsGame(d: GameDart): number {
  if (!d) return 0 as never;
  if (d.bed === "MISS") return 0;
  if (d.bed === "OB") return 25;
  if (d.bed === "IB") return 50;
  const mult = d.bed === "T" ? 3 : d.bed === "D" ? 2 : 1;
  return (d.number ?? 0) * mult;
}

/* -------- modes entrée/sortie helpers -------- */
type Mode = "simple" | "double" | "master";
function qualifiesEntry(d: UIDart, inMode: Mode) {
  if (inMode === "simple") return true;
  if (!d) return false;
  if (inMode === "double") return d.mult === 2;
  return d.mult === 2 || d.mult === 3; // master
}
function qualifiesFinish(last: UIDart | undefined, outMode: Mode) {
  if (outMode === "simple") return true;
  if (!last) return false;
  if (outMode === "double") return last.mult === 2;
  return last.mult === 2 || last.mult === 3; // master
}

/* -------- BUST qui respecte l'entrée/outMode -------- */
function wouldBustWithEntry(
  state: any,
  dartsUI: UIThrow,
  inMode: Mode,
  outMode: Mode,
  enteredNow: boolean
): { bust: boolean; reason: "over" | "oneLeft" | "needFinish" | null; mappedThrow: UIThrow; willEnter: boolean } {
  const idx = state.currentPlayerIndex ?? 0;
  const players: Player[] = state.players || [];
  if (!players.length || idx < 0 || idx >= players.length) {
    return { bust: false, reason: null, mappedThrow: dartsUI || [], willEnter: false };
  }
  const p = players[idx];
  const remaining = state.table?.[p.id]?.score ?? 0;

  let mapped: UIThrow = [];
  let entered = enteredNow || inMode === "simple";
  let willEnter = false;
  for (const d of (dartsUI || [])) {
    if (!entered) {
      if (qualifiesEntry(d, inMode)) {
        entered = true;
        willEnter = true;
        mapped.push(d);
      } else {
        mapped.push({ v: 0, mult: 1 });
      }
    } else {
      mapped.push(d);
    }
  }

  const sum = (mapped || []).reduce((s, d) => s + dartPoints(d), 0);
  const after = remaining - sum;
  const outRequired = outMode !== "simple";

  if (after < 0) return { bust: true, reason: "over", mappedThrow: mapped, willEnter };
  if (outRequired && after === 1) return { bust: true, reason: "oneLeft", mappedThrow: mapped, willEnter };
  if (after === 0 && outRequired) {
    const last = mapped.slice().reverse().find(Boolean);
    if (!qualifiesFinish(last, outMode)) {
      return { bust: true, reason: "needFinish", mappedThrow: mapped, willEnter };
    }
  }
  return { bust: false, reason: null, mappedThrow: mapped, willEnter };
}

/* -------- NEW: agrégats & LegResult -------- */
type HitsBySector = Record<string, number>; // S20/D20/T20... S1/D1/T1, OB/IB/MISS

function computeLegAggFromHistory(state: any) {
  const players: Player[] = state.players || [];
  const hist: Array<{ playerId: string; darts: GameDart[] }> = state.history || [];

  const darts: Record<string, number> = {};
  const visits: Record<string, number> = {};
  const bestVisit: Record<string, number> = {};
  const bestCheckout: Record<string, number | null> = {};
  const x180: Record<string, number> = {};
  const doubles: Record<string, number> = {};
  const triples: Record<string, number> = {};
  const bulls: Record<string, number> = {};
  const visitSumsByPlayer: Record<string, number[]> = {};
  const checkoutDartsByPlayer: Record<string, number[]> = {};
  const hitsBySector: Record<string, HitsBySector> = {};
  const h60: Record<string, number> = {};
  const h100: Record<string, number> = {};
  const h140: Record<string, number> = {};
  const h180: Record<string, number> = {};
  const sumPointsByVisit: Record<string, number> = {};

  for (const p of players) {
    darts[p.id] = 0;
    visits[p.id] = 0;
    bestVisit[p.id] = 0;
    bestCheckout[p.id] = null;
    x180[p.id] = 0;
    doubles[p.id] = 0;
    triples[p.id] = 0;
    bulls[p.id] = 0;
    visitSumsByPlayer[p.id] = [];
    checkoutDartsByPlayer[p.id] = [];
    hitsBySector[p.id] = {};
    h60[p.id] = 0; h100[p.id] = 0; h140[p.id] = 0; h180[p.id] = 0;
    sumPointsByVisit[p.id] = 0;
  }

  const startScore = state.rules?.startingScore ?? 501;
  const runningScores: Record<string, number> = Object.fromEntries(
    players.map((p) => [p.id, startScore])
  );

  const markHit = (pid: string, d: GameDart) => {
    let key = "MISS";
    if (d.bed === "OB" || d.bed === "IB") key = d.bed;
    else if (d.bed === "S" || d.bed === "D" || d.bed === "T")
      key = `${d.bed}${d.number ?? 0}`;
    hitsBySector[pid][key] = (hitsBySector[pid][key] || 0) + 1;
  };

  for (const t of hist) {
    const pid = t.playerId;
    const arr = (t.darts || []).slice(0, 3);
    let volSum = 0;

    visits[pid] += 1;
    darts[pid] += arr.length;

    for (const d of arr) {
      markHit(pid, d);
      const pts = dartPointsGame(d);
      volSum += pts;
      if (d.bed === "D") doubles[pid] += 1;
      if (d.bed === "T") triples[pid] += 1;
      if (d.bed === "OB" || d.bed === "IB") bulls[pid] += 1;
    }

    if (arr.length === 3 && volSum === 180) {
      h180[pid] += 1; x180[pid] += 1;
    } else if (volSum >= 140) h140[pid] += 1;
    else if (volSum >= 100) h100[pid] += 1;
    else if (volSum >= 60) h60[pid] += 1;

    bestVisit[pid] = Math.max(bestVisit[pid], volSum);
    sumPointsByVisit[pid] += volSum;
    visitSumsByPlayer[pid].push(volSum);

    const before = runningScores[pid];
    let after = before - volSum;

    const doubleOut = !!state.rules?.doubleOut;
    const bust = after < 0 || (doubleOut && after === 1);
    if (bust) after = before;
    else if (after === 0) {
      checkoutDartsByPlayer[pid].push(arr.length);
      const prevCo = bestCheckout[pid] ?? 0;
      bestCheckout[pid] = Math.max(prevCo, volSum);
    }
    runningScores[pid] = after;
  }

  const avg3: Record<string, number> = {};
  for (const p of players) {
    avg3[p.id] = visits[p.id]
      ? Math.round((sumPointsByVisit[p.id] / visits[p.id]) * 100) / 100
      : 0;
  }

  return {
    darts, visits, bestVisit, bestCheckout, x180, doubles, triples, bulls,
    avg3, visitSumsByPlayer, checkoutDartsByPlayer, hitsBySector,
    h60, h100, h140, h180,
  };
}

/* -------- policy normalizer -------- */
function normalizePolicy(
  p: FinishPolicy | string | undefined
): "firstToZero" | "continueToPenultimate" {
  if (!p) return "firstToZero";
  if (p === "continueToPenultimate" || p === "continueUntilPenultimate")
    return "continueToPenultimate";
  return "firstToZero";
}

/* ===== Helpers SKIP joueurs finis ===== */
function isFinished(state: any, playerId: string) {
  return (state.table?.[playerId]?.score ?? 1) === 0;
}
function nextAliveIndex(state: any, fromIndex: number) {
  const n = state.players?.length ?? 0;
  if (!n) return 0;
  let i = fromIndex;
  for (let step = 0; step < n; step++) {
    i = (i + 1) % n;
    const pid = state.players[i].id;
    if (!isFinished(state, pid)) return i;
  }
  return fromIndex;
}
function ensureActiveIsAlive(state: any) {
  const idx = state.currentPlayerIndex ?? 0;
  const pid = state.players?.[idx]?.id;
  if (!pid) return state;
  if (isFinished(state, pid)) {
    return { ...state, currentPlayerIndex: nextAliveIndex(state, idx) };
  }
  return state;
}

/* ===== Hydratation depuis snapshot ===== */
function readStartFromSnapRules(snap: X01Snapshot | any, fallback: number) {
  const r = (snap as any)?.rules || {};
  // accept "startScore" ou "start"
  return typeof r.startScore === "number" ? r.startScore
       : typeof r.start === "number" ? r.start
       : fallback;
}
function readDoubleOutFromSnapRules(snap: X01Snapshot | any, fallback: boolean) {
  const r = (snap as any)?.rules || {};
  if (typeof r.doubleOut === "boolean") return r.doubleOut;
  if (typeof r.outMode === "string") return r.outMode !== "simple";
  return fallback;
}
function readDoubleInFromSnapRules(snap: X01Snapshot | any, fallback: boolean) {
  const r = (snap as any)?.rules || {};
  if (typeof r.doubleIn === "boolean") return r.doubleIn;
  if (typeof r.inMode === "string") return r.inMode !== "simple";
  return fallback;
}

function hydrateFromSnapshot(
  engine: any,
  snap: X01Snapshot,
  players: Player[],
  rules: MatchRules
) {
  let s = engine.initGame(players, rules);
  const ids = players.map((p) => p.id);

  // scores
  if (Array.isArray((snap as any).scores)) {
    for (let i = 0; i < ids.length; i++) {
      const pid = ids[i];
      const score = (snap as any).scores[i];
      if (typeof score === "number" && s.table?.[pid]) s.table[pid].score = score;
    }
  }

  // current index
  if (typeof (snap as any).currentIndex === "number") {
    s.currentPlayerIndex = Math.max(0, Math.min(ids.length - 1, (snap as any).currentIndex));
  }

  // règles
  if (s.rules) {
    (s.rules as any).startingScore = readStartFromSnapRules(snap, rules.startingScore);
    (s.rules as any).doubleOut = readDoubleOutFromSnapRules(snap, !!rules.doubleOut);
    (s.rules as any).doubleIn  = readDoubleInFromSnapRules(snap, !!rules.doubleIn);
  }

  return s;
}

/* --- lecture LS pour officialMatch si non passé --- */
function lsOfficialMatch(defaultVal = false): boolean {
  try {
    const raw = localStorage.getItem("settings_x01");
    if (!raw) return defaultVal;
    const obj = JSON.parse(raw);
    return typeof obj.officialMatch === "boolean" ? obj.officialMatch : defaultVal;
  } catch {
    return defaultVal;
  }
}

/* -------- hook -------- */
export function useX01Engine(args: {
  profiles: Profile[];
  // ⬇ accepte string[] OU {id:string}[]
  playerIds: Array<string | { id: string }> | undefined;
  start: 301 | 501 | 701 | 1001;
  doubleOut: boolean; // rétro-compat (sera dérivé d’outMode si fourni)
  onFinish: (m: MatchRecord) => void;
  finishPolicy?: FinishPolicy;
  onLegEnd?: (res: LegResult) => void;
  resume?: X01Snapshot | any;

  // NEW — règles de match
  setsToWin?: number;   // 1/3/5/7/9/11/13
  legsPerSet?: number;  // 1/3/5/7

  // NEW — modes d’entrée / sortie
  inMode?: Mode;        // default "simple"
  outMode?: Mode;       // default dérivé de doubleOut ? "double" : "simple"

  // NEW — mode officiel (serve alterné)
  officialMatch?: boolean; // si absent, lu depuis localStorage
}) {
  const {
    profiles,
    playerIds,
    start,
    doubleOut: legacyDoubleOut,
    onFinish,
    finishPolicy = "firstToZero",
    onLegEnd,
    resume,

    setsToWin = 1,
    legsPerSet = 1,

    inMode = "simple",
    outMode = legacyDoubleOut ? "double" : "simple",

    officialMatch: officialMatchProp,
  } = args;

  const officialMatch = officialMatchProp ?? lsOfficialMatch(false);

  // ============================
  // BEST OF (mode tennis)
  // - setsToWin = nb total de sets configurés : 1,3,5,7,9,11,13
  //   -> setsTarget = nb de sets À GAGNER = (total+1)/2
  // - legsPerSet = nb total de manches par set : 1,3,5,7,...
  //   -> legsTarget = nb de manches À GAGNER = (total+1)/2
  // ============================
  const setsConfig = Math.max(1, Math.floor(setsToWin));
  const legsConfig = Math.max(1, Math.floor(legsPerSet));

  const setsTarget = Math.max(1, Math.floor((setsConfig + 1) / 2));
  const legsTarget = Math.max(1, Math.floor((legsConfig + 1) / 2));

  // ⚠️ Si snapshot contient ses joueurs → priorité au snapshot (ordre + nom)
  const playersFromSnap = React.useMemo(
    () => (resume ? toPlayersFromSnapshot(resume, profiles) : null),
    // dépend seulement de l'identité du resume et des profils (noms)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resume, profiles]
  );

  const players = React.useMemo(
    () => playersFromSnap ?? toPlayersFromIds(profiles || [], playerIds),
    [playersFromSnap, profiles, playerIds]
  );

  // Le moteur “classique” comprend doubleOut/doubleIn
  const rules: MatchRules = React.useMemo(
    () => ({
      mode: "x01",
      startingScore: resume ? readStartFromSnapRules(resume, start) : start,
      doubleOut: resume ? readDoubleOutFromSnapRules(resume, outMode !== "simple") : (outMode !== "simple"),
      doubleIn: resume ? readDoubleInFromSnapRules(resume, inMode !== "simple") : (inMode !== "simple"),
    }),
    // ⚠️ tant que 'resume' ne change pas, on ne réécrit pas les règles
    [resume, start, inMode, outMode]
  );

  const engine = React.useMemo(() => getEngine("x01"), []);
  const [startedAt] = React.useState<number>(() => Date.now());

  // ====== INIT KEY (seulement si vraies modifs) ======
  const initKey = React.useMemo(() => {
    if (resume) {
      const r = resume as any;
      const scores = Array.isArray(r?.scores) ? r.scores.join(",") : "noscores";
      const pids = Array.isArray(r?.players) ? r.players.map((p: any) => p.id).join(",") : "noplayers";
      const idx = typeof r?.currentIndex === "number" ? r.currentIndex : 0;
      const rs = readStartFromSnapRules(resume, start);
      const dout = readDoubleOutFromSnapRules(resume, outMode !== "simple") ? 1 : 0;
      const din  = readDoubleInFromSnapRules(resume, inMode !== "simple") ? 1 : 0;
      return `RESUME|${pids}|${scores}|i${idx}|s${rs}|do${dout}|di${din}|sets${setsTarget}|legs${legsTarget}|official${officialMatch ? 1 : 0}`;
    }
    const pids = (players || []).map((p) => p.id).join(",");
    return `FRESH|${pids}|s${start}|in${inMode}|out${outMode}|sets${setsTarget}|legs${legsTarget}|official${officialMatch ? 1 : 0}`;
  }, [resume, players, start, inMode, outMode, setsTarget, legsTarget, officialMatch]);

  // ====== ÉTAT — INIT UNIQUEMENT À LA CRÉATION OU SI initKey CHANGE ======
  const initialState = React.useMemo(() => {
    let s0: any;
    if (resume && (resume as any)?.rules) {
      const pl = playersFromSnap ?? players; // encore une fois priorité aux joueurs du snap
      s0 = hydrateFromSnapshot(engine, resume as X01Snapshot, pl, rules);
    } else {
      s0 = engine.initGame(players, rules);
    }
    if (officialMatch && s0) {
      s0.currentPlayerIndex = 0; // sera ajusté après si nécessaire
    }
    return ensureActiveIsAlive(s0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initKey]);

  const [state, setState] = React.useState<any>(initialState);

  React.useEffect(() => {
    // Si l’initKey change (nouveau snapshot ou vraies règles différentes) → reinit
    setState(initialState);
  }, [initialState]);

  // index du starter de leg (pour officialMatch)
  const [legStarterIndex, setLegStarterIndex] = React.useState<number>(0);
  const legStarterRef = React.useRef<number>(0);

  // “Entrée” par joueur (utile si inMode != simple)
  const [enteredBy, setEnteredBy] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const p of (state.players || []) as Player[]) {
      init[p.id] = (rules as any)?.doubleIn ? false : true;
    }
    return init;
  });

  const [lastBust, setLastBust] = React.useState<null | { reason: string }>(null);
  const [finishedOrder, setFinishedOrder] = React.useState<string[]>([]);
  const [pendingFirstWin, setPendingFirstWin] =
    React.useState<null | { playerId: string }>(null);
  const [liveFinishPolicy, setLiveFinishPolicy] =
    React.useState<"firstToZero" | "continueToPenultimate">(
      normalizePolicy(finishPolicy)
    );

  // NEW — suivi Sets/Legs pour l'UI + victoire
  const [currentSet, setCurrentSet] = React.useState<number>(1);
  const [currentLegInSet, setCurrentLegInSet] = React.useState<number>(1);
  const [legsWon, setLegsWon] = React.useState<Record<string, number>>({});
  const [setsWon, setSetsWon] = React.useState<Record<string, number>>({});
  const [ruleWinnerId, setRuleWinnerId] = React.useState<string | null>(null);

  // (re)init complet si initKey change (pas sur chaque re-render)
  React.useEffect(() => {
    // reset overlay/politiques
    setLastBust(null);
    setFinishedOrder([]);
    setPendingFirstWin(null);
    setLiveFinishPolicy(normalizePolicy(finishPolicy));

    // reset sets/legs
    setCurrentSet(1);
    setCurrentLegInSet(1);

    // reset compteurs joueurs
    const initLegs: Record<string, number> = {};
    const initSets: Record<string, number> = {};
    const initEntered: Record<string, boolean> = {};
    for (const p of (state.players || []) as Player[]) {
      initLegs[p.id] = 0;
      initSets[p.id] = 0;
      initEntered[p.id] = (rules as any)?.doubleIn ? false : true;
    }
    setLegsWon(initLegs);
    setSetsWon(initSets);
    setEnteredBy(initEntered);
    setRuleWinnerId(null);

    // officialMatch: fix starter
    if (officialMatch) {
      const nb = (state.players?.length as number) || 1;
      const nextStarter = legStarterRef.current % Math.max(1, nb);
      setLegStarterIndex(nextStarter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initKey]);

  // keep entered map in sync when players array changes (sans reset global)
  React.useEffect(() => {
    const ids = (state.players || []).map((p: Player) => p.id);
    if (!ids.length) return;
    setEnteredBy((prev) => {
      const next: Record<string, boolean> = {};
      ids.forEach((id) => { next[id] = prev[id] ?? ((rules as any)?.doubleIn ? false : true); });
      return next;
    });
    setLegsWon((prev) => {
      const next: Record<string, number> = {};
      ids.forEach((id) => { next[id] = prev[id] ?? 0; });
      return next;
    });
    setSetsWon((prev) => {
      const next: Record<string, number> = {};
      ids.forEach((id) => { next[id] = prev[id] ?? 0; });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.players]);

  // ---- helpers manche
  function buildLegResultLocal(s: any): LegResult {
    const remaining: Record<string, number> = {};
    for (const p of s.players || [])
      remaining[p.id] = s.table?.[p.id]?.score ?? 0;

    const order = [...finishedOrder];
    for (const p of s.players || []) if (!order.includes(p.id)) order.push(p.id);

    const agg = computeLegAggFromHistory(s);
    return {
      legNo: currentLegInSet,
      winnerId: order[0],
      order,
      finishedAt: Date.now(),
      remaining,
      darts: agg.darts,
      visits: agg.visits,
      avg3: agg.avg3,
      bestVisit: agg.bestVisit,
      bestCheckout: agg.bestCheckout,
      x180: agg.x180,
      doubles: agg.doubles,
      triples: agg.triples,
      bulls: agg.bulls,
      visitSumsByPlayer: agg.visitSumsByPlayer,
      checkoutDartsByPlayer: agg.checkoutDartsByPlayer,
      hitsBySector: agg.hitsBySector,
      h60: agg.h60,
      h100: agg.h100,
      h140: agg.h140,
      h180: agg.h180,
      meta: { setNo: currentSet, setsTarget, legsTarget },
    } as unknown as LegResult;
  }

  function resetForNextLeg() {
    const nb = (state.players?.length as number) || 1;
    const nextStarter = officialMatch ? ((legStarterRef.current + 1) % nb) : legStarterRef.current;

    const s0 = engine.initGame(state.players, rules);
    if (officialMatch) {
      (s0 as any).currentPlayerIndex = nextStarter;
      legStarterRef.current = nextStarter;
      setLegStarterIndex(nextStarter);
    }
    const s1 = ensureActiveIsAlive(s0);
    setState(s1);

    setFinishedOrder([]);
    setPendingFirstWin(null);
    setLiveFinishPolicy(normalizePolicy(finishPolicy));
    setLastBust(null);

    setEnteredBy(() => {
      const next: Record<string, boolean> = {};
      for (const p of (state.players || []) as Player[]) {
        next[p.id] = (rules as any)?.doubleIn ? false : true;
      }
      return next;
    });
  }

  // NEW — règle Sets/Legs (version simple, 1 appel = 1 leg)
  function applySetLegRule(winnerId: string | null) {
    if (!winnerId) {
      // leg nul (personne n'a fini) → on avance juste le compteur de leg
      setCurrentLegInSet((x) => x + 1);
      return;
    }
    setLegsWon((prev) => {
      const next = { ...prev, [winnerId]: (prev[winnerId] || 0) + 1 };
      const reachedLegTarget = (next[winnerId] || 0) >= legsTarget;

      if (reachedLegTarget) {
        setSetsWon((prevSets) => {
          const ns = { ...prevSets, [winnerId]: (prevSets[winnerId] || 0) + 1 };

          // reset legs de tout le monde
          const resetLegs: Record<string, number> = {};
          Object.keys(next).forEach((id) => { resetLegs[id] = 0; });
          setLegsWon(resetLegs);

          // nouveau set, leg = 1
          setCurrentSet((s) => s + 1);
          setCurrentLegInSet(1);

          // match gagné ?
          if (ns[winnerId] >= setsTarget) setRuleWinnerId(winnerId);
          return ns;
        });
      } else {
        // même set, leg suivant
        setCurrentLegInSet((x) => x + 1);
      }
      return next;
    });
  }

  // ---- API CONTINUER
  function continueAfterFirst() {
    if (!pendingFirstWin) return;
    setLiveFinishPolicy("continueToPenultimate");
    setFinishedOrder((arr) =>
      arr.includes(pendingFirstWin.playerId) ? arr : [...arr, pendingFirstWin.playerId]
    );
    setPendingFirstWin(null);
  }
  function endNow() {
    const res = buildLegResultLocal(state);
    applySetLegRule(res.winnerId || null);
    onLegEnd?.(res);
    resetForNextLeg();
  }

  // ---- jouer une volée (respecte entrée/outMode) ou BUST
  function submitThrowUI(throwUI: UIThrow) {
    setState((prev: any) => {
      const curr = prev.players?.[prev.currentPlayerIndex];
      const pid: string | undefined = curr?.id;
      const enteredNow = pid ? !!enteredBy[pid] : true;

      const check = wouldBustWithEntry(prev, throwUI, inMode, outMode, enteredNow);
      const mappedThrow = check.mappedThrow;

      if (check.bust) {
        const historyEntry = { playerId: pid, darts: uiToGameDarts(mappedThrow) };
        let next = {
          ...prev,
          history: [...(prev.history || []), historyEntry],
          currentPlayerIndex: (prev.currentPlayerIndex + 1) % (prev.players?.length || 1),
          turnIndex: 0,
        };
        next = ensureActiveIsAlive(next);
        setLastBust({ reason: check.reason! });
        if (pid && check.willEnter) {
          setEnteredBy((m) => ({ ...m, [pid]: true }));
        }
        return next;
      }

      setLastBust(null);
      let s2 = engine.playTurn(prev, uiToGameDarts(mappedThrow));
      s2 = ensureActiveIsAlive(s2);

      if (pid && check.willEnter) {
        setEnteredBy((m) => ({ ...m, [pid]: true }));
      }

      try {
        const last = (s2.history || [])[Math.max(0, (s2.history || []).length - 1)];
        const pid2: string | undefined = last?.playerId;
        if (pid2 && s2.table?.[pid2]) {
          const scoreNow = s2.table[pid2].score;
          const justFinished = scoreNow === 0;

          if (justFinished) {
            if (finishedOrder.length === 0 && liveFinishPolicy === "firstToZero") {
              // 1er joueur terminé → on attend la décision de l'utilisateur
              setPendingFirstWin({ playerId: pid2 });
              return s2;
            }

            // sinon, on ajoute au classement
            setFinishedOrder((arr) => (arr.includes(pid2) ? arr : [...arr, pid2]));

            if (liveFinishPolicy === "continueToPenultimate") {
              const finishedCountNext = finishedOrder.includes(pid2)
                ? finishedOrder.length
                : finishedOrder.length + 1;
              if (finishedCountNext >= (s2.players?.length ?? 0) - 1) {
                const res = buildLegResultLocal(s2);
                applySetLegRule(res.winnerId || null);
                onLegEnd?.(res);
                setTimeout(() => resetForNextLeg(), 0);
              }
            } else {
              const res = buildLegResultLocal(s2);
              applySetLegRule(res.winnerId || null);
              onLegEnd?.(res);
              setTimeout(() => resetForNextLeg(), 0);
            }
          }
        }
      } catch {
        // tolérance si la forme du state diffère
      }
      return s2;
    });
  }

  // undo (replay de l'historique + reconstruction des “entrées”)
  function undoLast() {
    setState((prev: any) => {
      if (!prev.history?.length) return prev;
      const base = engine.initGame(prev.players, prev.rules);
      let replay = { ...base };
      const hist = prev.history.slice(0, -1);

      const rebuiltEntered: Record<string, boolean> = {};
      for (const p of (prev.players || []) as Player[]) {
        rebuiltEntered[p.id] = (prev.rules?.doubleIn ? false : true);
      }

      for (const h of hist) {
        const pid: string = h.playerId;
        const ui: UIThrow = (h.darts || []).map(gameToUIDart);
        const mapped: UIThrow = [];
        let entered = rebuiltEntered[pid];
        for (const d of ui) {
          if (!entered) {
            if (qualifiesEntry(d, inMode)) {
              entered = true;
              mapped.push(d);
            } else {
              mapped.push({ v: 0, mult: 1 });
            }
          } else mapped.push(d);
        }
        replay = engine.playTurn(replay, uiToGameDarts(mapped));
        if (!rebuiltEntered[pid] && entered) rebuiltEntered[pid] = true;
      }
      replay = ensureActiveIsAlive(replay);
      setEnteredBy(rebuiltEntered);
      setFinishedOrder([]);
      setPendingFirstWin(null);
      setLiveFinishPolicy(normalizePolicy(finishPolicy));
      setLastBust(null);
      return replay;
    });
  }

  const nbPlayers = state.players?.length ?? 0;
  const finishedCount = finishedOrder.length;
  const isContinuing =
    (liveFinishPolicy === "firstToZero" && !!pendingFirstWin) ||
    (liveFinishPolicy === "continueToPenultimate" &&
      finishedCount < Math.max(0, nbPlayers - 1));

  React.useEffect(() => {
    if (!engine.isGameOver(state)) return;
    if (isContinuing) return;
    // L’UI pilotera via endNow/overlay, la fin de MATCH est gérée par ruleWinnerId.
  }, [state, engine, isContinuing]);

  const currentPlayer: Player | null =
    state?.players?.[state?.currentPlayerIndex] ?? null;

  const scoresByPlayer: Record<string, number> = React.useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of state.players || [])
      out[p.id] = state.table?.[p.id]?.score ?? 0;
    return out;
  }, [state]);

  const isOver = !isContinuing && engine.isGameOver(state);
  const winner: Player | null =
    ruleWinnerId
      ? ((state.players || []) as Player[]).find((p) => p.id === ruleWinnerId) || null
      : engine.getWinner(state);

  React.useEffect(() => {
    if (!ruleWinnerId) return;
    const rec = buildMatchRecordX01({ state, startedAt });
    if (rec?.header) (rec.header as any).winner = ruleWinnerId;
    onFinish(rec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleWinnerId]);

  return {
    state,
    currentPlayer,
    turnIndex: state?.turnIndex ?? 0,
    scoresByPlayer,

    // manche
    isOver,
    winner,

    submitThrowUI,
    undoLast,
    lastBust,

    // CONTINUER
    finishedOrder,
    pendingFirstWin,
    continueAfterFirst,
    endNow,
    isContinuing,

    // Sets/Legs pour l'UI
    currentSet,
    currentLegInSet,
    setsTarget,   // nb de sets à gagner
    legsTarget,   // nb de legs à gagner dans un set
    setsWon,
    legsWon,
    ruleWinnerId,

    // config brute (1,3,5,7...) au cas où
    _setsConfig: setsConfig,
    _legsConfig: legsConfig,

    // info entrée (optionnel si tu veux afficher un indicateur)
    _enteredBy: enteredBy,
    _inMode: inMode,
    _outMode: outMode,

    // debug/inspect
    _officialMatch: officialMatch,
    _legStarterIndex: legStarterIndex,
  };
}
