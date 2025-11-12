// ============================================
// src/pages/X01Play.tsx
// Wrapper (chargement snapshot) + X01Core (moteur & UI)
// + AUTOSAVE (fallback localStorage si IDB vide/HS)
// Corrige l’erreur React: "Rendered more hooks than during the previous render"
// + PATCHS reprise: remount via key + persist après changement de joueur
// + PATCHS A/B/C : autosave restore unique + listeners stables + throttling
// ============================================

import React from "react";
import { useX01Engine } from "../hooks/useX01Engine";
import Keypad from "../components/Keypad";
import EndOfLegOverlay from "../components/EndOfLegOverlay";
import { playSound } from "../lib/sound";
import { History, type SavedMatch } from "../lib/history";

// Réseau Stats / Agg
import type { Visit as VisitType, PlayerLite as PlayerLiteType } from "../lib/types";
import { StatsBridge } from "../lib/statsBridge";
import { addMatchSummary, commitLiteFromLeg } from "../lib/statsLiteIDB";
import { extractAggFromSavedMatch } from "../lib/aggFromHistory";
import * as StatsOnce from "../lib/statsOnce";
import { saveMatchStats, aggregateMatch } from "../lib/stats";
import { commitMatchSummary, buildX01Summary } from "../lib/playerStats";

// Types app
import type {
  Profile,
  MatchRecord,
  Dart as UIDart,
  LegResult,
  FinishPolicy,
  X01Snapshot,
} from "../lib/types";

/* ==================== AUTOSAVE (backup local si IDB HS) ==================== */
const AUTOSAVE_KEY = "dc-x01-autosave-v1";
function loadAutosave(): X01Snapshot | null {
  try {
    const s = localStorage.getItem(AUTOSAVE_KEY);
    if (s) return JSON.parse(s) as X01Snapshot;
  } catch {}
  return null;
}
// PATCH C — throttling
let __lastAutosaveTs = 0;
function saveAutosave(snap: X01Snapshot | null) {
  try {
    if (!snap) return;
    const now = Date.now();
    if (now - __lastAutosaveTs < 800) return; // throttle 0.8s
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snap));
    __lastAutosaveTs = now;
  } catch {}
}
function clearAutosave() {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch {}
}

/* ===== Styles mini-cards & ranking (placés en haut pour éviter la TDZ) ===== */
const miniCard: React.CSSProperties = {
  width: "clamp(150px, 22vw, 190px)",
  height: 86,
  padding: 6,
  borderRadius: 12,
  background: "linear-gradient(180deg, rgba(22,22,26,.96), rgba(14,14,16,.98))",
  border: "1px solid rgba(255,255,255,.10)",
  boxShadow: "0 10px 22px rgba(0,0,0,.35)",
};
const miniText: React.CSSProperties = { fontSize: 12, color: "#d9dbe3", lineHeight: 1.25 };
const miniRankRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "3px 6px",
  borderRadius: 6,
  background: "rgba(255,255,255,.04)",
  marginBottom: 3,
  fontSize: 11,
  lineHeight: 1.15,
};
const miniRankName: React.CSSProperties = { fontWeight: 700, color: "#ffcf57" };
const miniRankScore: React.CSSProperties = { fontWeight: 800, color: "#ffcf57" };
const miniRankScoreFini: React.CSSProperties = { fontWeight: 800, color: "#7fe2a9" };

/* ---------------------------------------------
   Constantes UI
----------------------------------------------*/
type Mode = "simple" | "double" | "master";
const NAV_HEIGHT = 64;
const KEYPAD_HEIGHT = 260;
const KEYPAD_SCALE = 0.88;
const CONTENT_MAX = 520;

type EnginePlayer = { id: string; name: string };

/* ---------------------------------------------
   Helpers visuels — pastilles de volée
----------------------------------------------*/
function fmt(d?: UIDart) {
  if (!d) return "—";
  if (d.v === 0) return "MISS";
  if (d.v === 25) return d.mult === 2 ? "DBULL" : "BULL";
  const prefix = d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S";
  return `${prefix}${d.v}`;
}
function chipStyle(d?: UIDart, red = false): React.CSSProperties {
  if (!d)
    return { background: "rgba(255,255,255,.06)", color: "#bbb", border: "1px solid rgba(255,255,255,.08)" };
  if (red)
    return { background: "rgba(200,30,30,.18)", color: "#ff8a8a", border: "1px solid rgba(255,80,80,.35)" };
  if (d.v === 25 && d.mult === 2)
    return { background: "rgba(13,160,98,.18)", color: "#8ee6bf", border: "1px solid rgba(13,160,98,.35)" };
  if (d.v === 25)
    return { background: "rgba(13,160,98,.12)", color: "#7bd6b0", border: "1px solid rgba(13,160,98,.3)" };
  if (d.mult === 3)
    return { background: "rgba(179,68,151,.18)", color: "#ffd0ff", border: "1px solid rgba(179,68,151,.35)" };
  if (d.mult === 2)
    return { background: "rgba(46,150,193,.18)", color: "#cfeaff", border: "1px solid rgba(46,150,193,.35)" };
  return { background: "rgba(255,187,51,.12)", color: "#ffc63a", border: "1px solid rgba(255,187,51,.4)" };
}

/** Pastilles “dernière volée” (3 pastilles + “Bust” si besoin) */
type VisitLite = {
  p: string;
  segments: { v: number; mult?: 1 | 2 | 3 }[];
  bust?: boolean;
  score?: number;
  ts?: number;
  isCheckout?: boolean;
  remainingAfter?: number;
};
function renderLastVisitChipsFromLog(visitsLog: VisitLite[], pid: string) {
  const v = [...(visitsLog || [])].filter((vv) => vv.p === pid).pop();
  if (!v || !Array.isArray(v.segments) || v.segments.length === 0) return null;

  const chipBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 38,
    height: 24,
    padding: "0 10px",
    borderRadius: 10,
    fontWeight: 800,
    fontSize: 12,
    marginLeft: 6,
  };

  const chips = v.segments.map((s, i) => {
    const d = { v: Number(s?.v || 0), mult: Number(s?.mult || 1) as 1 | 2 | 3 } as UIDart;
    const st = chipStyle(d);
    return (
      <span
        key={i}
        style={{ ...chipBase, border: st.border as string, background: st.background as string, color: st.color as string }}
      >
        {fmt(d)}
      </span>
    );
  });

  if (v.bust) {
    const st = chipStyle(undefined, true);
    chips.push(
      <span key="__bust" style={{ ...chipBase, border: st.border as string, background: st.background as string, color: st.color as string }}>
        Bust
      </span>
    );
  }

  return <span style={{ display: "inline-flex", flexWrap: "wrap" }}>{chips}</span>;
}

/* ---------------------------------------------
   Paramètres de départ (lecture robuste)
----------------------------------------------*/
type StartParams = {
  playerIds: string[];
  start: 301 | 501 | 701 | 901 | 1001;
  outMode?: Mode;
  inMode?: Mode;
  setsToWin?: number;
  legsPerSet?: number;
  finishPolicy?: FinishPolicy;
  officialMatch?: boolean;
  resume?: X01Snapshot | null;
};
function readStartParams(
  propIds: string[] | undefined,
  propStart: 301 | 501 | 701 | 901 | 1001 | undefined,
  propOut: Mode | undefined,
  propIn: Mode | undefined,
  propSets?: number,
  propLegs?: number,
  params?: any
): StartParams {
  const fromProps: Partial<StartParams> = {
    playerIds: propIds || [],
    start: (propStart as any) || 501,
    outMode: propOut,
    inMode: propIn,
    setsToWin: propSets,
    legsPerSet: propLegs,
  };
  const fromParams: Partial<StartParams> = (params?.startParams ?? {}) as Partial<StartParams>;
  const fromGlobal: Partial<StartParams> =
    (typeof window !== "undefined" && (window as any).__x01StartParams) || {};
  return {
    playerIds: fromParams.playerIds ?? fromGlobal.playerIds ?? fromProps.playerIds ?? [],
    start: (fromParams.start ?? fromGlobal.start ?? fromProps.start ?? 501) as 301 | 501 | 701 | 901 | 1001,
    outMode: (fromParams.outMode ?? fromGlobal.outMode ?? fromProps.outMode ?? "double") as Mode,
    inMode: (fromParams.inMode ?? fromGlobal.inMode ?? fromProps.inMode ?? "simple") as Mode,
    setsToWin: fromParams.setsToWin ?? fromGlobal.setsToWin ?? fromProps.setsToWin ?? 1,
    legsPerSet: fromParams.legsPerSet ?? fromGlobal.legsPerSet ?? fromProps.legsPerSet ?? 1,
    finishPolicy:
      (fromParams.finishPolicy ?? fromGlobal.finishPolicy ?? ("firstToZero" as FinishPolicy)) as FinishPolicy,
    officialMatch: fromParams.officialMatch ?? fromGlobal.officialMatch ?? false,
    resume: (fromParams.resume ?? fromGlobal.resume ?? null) as X01Snapshot | null,
  };
}

/* ---------------------------------------------
   Divers helpers
----------------------------------------------*/
const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);
function dartValue(d: UIDart): number {
  if (!d) return 0;
  if (d.v === 25 && d.mult === 2) return 50;
  return d.v * d.mult;
}
function isDoubleFinish(darts: UIDart[]): boolean {
  const last = darts[darts.length - 1];
  if (!last) return false;
  if (last.v === 25 && last.mult === 2) return true;
  return last.mult === 2;
}
function safeGetLocalStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function createAudio(urls: string[]) {
  try {
    const a = new Audio();
    const pick = urls.find((u) => {
      const ext = u.split(".").pop() || "";
      const mime = ext === "mp3" ? "audio/mpeg" : ext === "ogg" ? "audio/ogg" : "";
      return !!a.canPlayType(mime);
    });
    if (pick) a.src = pick;
    return a;
  } catch {
    return { play: () => Promise.reject(), pause: () => {}, currentTime: 0, loop: false, volume: 1 } as any;
  }
}
function mapEnginePlayersToLite(
  enginePlayers: Array<{ id: string; name: string }>,
  profiles: Profile[]
): PlayerLiteType[] {
  return (enginePlayers || []).map((p) => ({
    id: p.id,
    name: p.name || "",
    avatarDataUrl: (profiles.find((pr) => pr.id === p.id)?.avatarDataUrl ?? null) as string | null,
  }));
}
function suggestCheckout(rest: number, doubleOut: boolean, dartsLeft: 1 | 2 | 3): string[] {
  if (rest < 2 || rest > 170) return [];
  if (doubleOut) {
    const map: Record<number, string> = {
      170: "T20 T20 D25", 167: "T20 T19 D25", 164: "T20 T18 D25", 161: "T20 T17 D25",
      160: "T20 T20 D20", 158: "T20 T20 D19", 157: "T20 T19 D20", 156: "T20 T20 D18",
      155: "T20 T19 D19", 154: "T20 T18 D20", 153: "T20 T19 D18", 152: "T20 T20 D16",
      151: "T20 T17 D20", 150: "T20 T18 D18", 140: "T20 T20 D10", 139: "T20 T13 D20",
      138: "T20 T18 D12", 137: "T20 T15 D16", 136: "T20 T20 D8", 135: "T20 T17 D12",
      130: "T20 T18 D8", 129: "T19 T16 D12", 128: "T18 T14 D16", 127: "T20 T17 D8",
      126: "T19 T19 D6", 125: "25 T20 D20", 124: "T20 T16 D8", 123: "T19 T16 D9",
      122: "T18 T18 D7", 121: "T20 11 D25", 120: "T20 D20", 119: "T19 10 D25",
      118: "T20 18 D20", 117: "T20 17 D20", 116: "T20 16 D20", 115: "T20 15 D20",
      110: "T20 10 D20", 109: "T20 9 D20", 108: "T20 16 D16", 107: "T19 18 D16",
      101: "T20 9 D16", 100: "T20 D20", 99: "T19 10 D16", 98: "T20 D19", 97: "T19 D20",
      96: "T20 D18", 95: "T19 D19", 94: "T18 D20", 93: "T19 D18", 92: "T20 D16",
      91: "T17 D20", 90: "T18 D18", 89: "T19 D16", 88: "T16 D20", 87: "T17 D18",
      86: "T18 D16", 85: "T15 D20", 84: "T16 D18", 83: "T17 D16", 82: "BULL D16",
      81: "T15 D18", 80: "T20 D10", 79: "T19 D11", 78: "T18 D12", 77: "T19 D10",
      76: "T20 D8", 75: "T17 D12", 74: "T14 D16", 73: "T19 D8", 72: "T16 D12",
      71: "T13 D16", 70: "T20 D5",
    };
    const best = map[rest];
    if (best && best.split(" ").length <= dartsLeft) return [best];
    return [];
  } else {
    if (rest <= 50) return [rest === 50 ? "BULL" : rest === 25 ? "25" : `S${rest}`];
    return [];
  }
}

/* ---------------------------------------------
   (Optionnel) Fallback local si emitHistoryRecord_X01 non exporté
----------------------------------------------*/
async function emitHistoryRecord_X01(args: {
  playersLite: PlayerLiteType[];
  winnerId: string | null;
  resumeId: string | null;
  legStats: any;
  visitsLog: any[];
  onFinish: (m: MatchRecord) => void;
}) {
  try {
    const id = crypto.randomUUID?.() ?? String(Date.now());
    await History.upsert({
      id,
      kind: "x01",
      status: "finished",
      players: args.playersLite,
      winnerId: args.winnerId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      summary: null,
      payload: { legs: [args.legStats], visits: args.visitsLog },
    } as any);
    await History.list();
  } catch (e) {
    console.warn("[emitHistoryRecord_X01:fallback] ", e);
  }
}

/* ======================================================================
   WRAPPER — charge la reprise puis rend X01Core (ordre des hooks garanti)
====================================================================== */
export default function X01Play(props: {
  profiles?: Profile[];
  playerIds?: string[];
  start?: 301 | 501 | 701 | 901 | 1001;
  outMode?: Mode;
  inMode?: Mode;
  onFinish: (m: MatchRecord) => void;
  onExit: () => void;
  params?: { resumeId?: string; startParams?: StartParams } | any;
  setsToWin?: number;
  legsPerSet?: number;
}) {
  const {
    profiles = [],
    playerIds = [],
    start = 501,
    outMode = "double",
    inMode = "simple",
    onFinish,
    onExit,
    params,
    setsToWin = 1,
    legsPerSet = 1,
  } = props;

  const merged = readStartParams(playerIds, start as any, outMode, inMode, setsToWin, legsPerSet, params);
  const resumeId: string | undefined = params?.resumeId;

  const [ready, setReady] = React.useState(false);
  const [resumeSnapshot, setResumeSnapshot] = React.useState<X01Snapshot | null>(merged.resume ?? null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (merged.resume) {
          if (alive) setResumeSnapshot(merged.resume as X01Snapshot);
          if (alive) setReady(true);
          return;
        }
        if (!resumeId) {
          if (alive) setResumeSnapshot(null);
          if (alive) setReady(true);
          return;
        }
        const rec: SavedMatch | null = await History.get(resumeId);
        const snap = (rec && rec.kind === "x01" ? (rec.payload as any)?.state : null) as X01Snapshot | null;
        if (alive) setResumeSnapshot(snap ?? null);
      } catch {
        if (alive) setResumeSnapshot(null);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => { alive = false; };
  }, [resumeId, merged.resume]);

  // PATCH A — Boot AUTOSAVE: restore une seule fois, pas de spam / pas d'écriture ici
  const restoredOnceRef = React.useRef(false);
  React.useEffect(() => {
    if (!ready) return;
    if (restoredOnceRef.current) return; // ne restore qu'une fois
    if (resumeSnapshot) {
      restoredOnceRef.current = true; // un snapshot est déjà présent (via props/History)
      return;
    }
    const snap = loadAutosave();
    if (snap) setResumeSnapshot(snap);
    restoredOnceRef.current = true;
  }, [ready, resumeSnapshot]);

  // ====== KEY de remount pour reprise propre (PATCH #1)
  const engineKey = React.useMemo(() => {
    if (resumeSnapshot) {
      const idx = (resumeSnapshot as any)?.currentIndex ?? 0;
      const scores = Array.isArray((resumeSnapshot as any)?.scores)
        ? (resumeSnapshot as any).scores.join("-")
        : "noscores";
      return `resume:${idx}:${scores}`;
    }
    return `fresh:${(merged.playerIds || []).join("-")}:${merged.start}`;
  }, [resumeSnapshot, merged.playerIds, merged.start]);

  if (!ready) {
    return (
      <div style={{ padding: 16, maxWidth: CONTENT_MAX, margin: "40px auto", textAlign: "center" }}>
        <div style={{ color: "#ffcf57", fontWeight: 900, fontSize: 16 }}>Chargement de la reprise…</div>
      </div>
    );
  }

  return (
    <X01Core
      key={engineKey} // <-- remount propre dès qu’on a un snapshot
      profiles={profiles}
      playerIds={merged.playerIds}
      start={merged.start}
      outMode={(merged.outMode || "double") as Mode}
      inMode={(merged.inMode || "simple") as Mode}
      setsToWin={merged.setsToWin || 1}
      legsPerSet={merged.legsPerSet || 1}
      finishPref={merged.finishPolicy as FinishPolicy}
      resumeSnapshot={resumeSnapshot}
      resumeId={resumeId}
      onFinish={onFinish}
      onExit={onExit}
    />
  );
}

/* ======================================================================
   X01Core — tout le jeu (tous les hooks, ordre constant)
====================================================================== */
function X01Core({
  profiles,
  playerIds,
  start,
  outMode,
  inMode,
  setsToWin,
  legsPerSet,
  finishPref,
  resumeSnapshot,
  resumeId,
  onFinish,
  onExit,
}: {
  profiles: Profile[];
  playerIds: string[];
  start: 301 | 501 | 701 | 901 | 1001;
  outMode: Mode;
  inMode: Mode;
  setsToWin: number;
  legsPerSet: number;
  finishPref: FinishPolicy;
  resumeSnapshot: X01Snapshot | null;
  resumeId?: string;
  onFinish: (m: MatchRecord) => void;
  onExit: () => void;
}) {
  // ===== Règles effectives (snapshot > props)
  const resumeRules = resumeSnapshot?.rules as
    | { start: number; outMode?: Mode; inMode?: Mode; setsToWin?: number; legsPerSet?: number }
    | undefined;

  const startFromResume = (resumeRules?.start ?? start) as 301 | 501 | 701 | 901 | 1001;
  const playerIdsFromResume =
    (resumeSnapshot?.players?.map((p: any) => p.id) as string[]) ?? playerIds;
  const outMFromResume = (resumeRules?.outMode as Mode | undefined) ?? outMode;
  const inMFromResume = (resumeRules?.inMode as Mode | undefined) ?? inMode;
  const setsFromResume = resumeRules?.setsToWin ?? setsToWin;
  const legsFromResume = resumeRules?.legsPerSet ?? legsPerSet;

  // ===== Overlay de manche
  const [lastLegResult, setLastLegResult] = React.useState<any | null>(null);
  const [overlayOpen, setOverlayOpen] = React.useState(false);
  const overlayClosedOnceRef = React.useRef(false);

  // Ouvrir l’overlay une seule fois par leg (clé stable)
  const lastLegKeyRef = React.useRef<string>("");
  React.useEffect(() => {
    if (!lastLegResult) return;
    const key =
      String((lastLegResult as any)?.finishedAt ?? "") +
      "|" +
      String((lastLegResult as any)?.legNo ?? "");
    if (key && key !== lastLegKeyRef.current) {
      lastLegKeyRef.current = key;
      setOverlayOpen(true); // une seule ouverture pour cette clé
    }
  }, [lastLegResult]);

  // ===== Log volées
  const [visitsLog, setVisitsLog] = React.useState<VisitLite[]>([]);
  const visitNoRef = React.useRef<number>(0);
  const matchLegsRef = React.useRef<any[]>([]);

  function pushVisitLog(visit: any) {
    setVisitsLog((prev) => {
      const arr = [...(prev || [])];
      const segs =
        Array.isArray(visit?.darts)
          ? visit.darts.map((d: UIDart) => ({ v: Number(d?.v || 0), mult: Number(d?.mult || 1) }))
          : Array.isArray((visit as any)?.segments)
          ? (visit as any).segments.map((s: any) => ({ v: Number(s?.v || 0), mult: Number(s?.mult || 1) }))
          : [];
      arr.push({
        p: visit.playerId,
        score: Number(visit.score || 0),
        remainingAfter: Number((visit as any).remainingAfter || 0),
        bust: !!visit.bust,
        isCheckout: visit.isCheckout,
        segments: segs,
        ts: Date.now(),
      });
      return arr;
    });
  }

  // ===== onFinish différé
  const [pendingFinish, setPendingFinish] = React.useState<MatchRecord | null>(null);
  const defaultFinishPolicy: FinishPolicy =
    finishPref ?? ((safeGetLocalStorage("opt_continue_policy") ?? "firstToZero") as FinishPolicy);

  // ====== Hook moteur
  const {
    state,
    currentPlayer,
    scoresByPlayer,
    isOver,
    winner,
    submitThrowUI,
    undoLast,
    pendingFirstWin,
    continueAfterFirst,
    endNow,
    isContinuing,
    currentSet,
    currentLegInSet,
  } = useX01Engine({
    profiles,
    playerIds: playerIdsFromResume,
    start: startFromResume,
    doubleOut: outMFromResume !== "simple",
    resume: resumeSnapshot ?? null,
    setsToWin: setsFromResume,
    legsPerSet: legsFromResume,
    outMode: outMFromResume,
    inMode: inMFromResume,
    finishPolicy: defaultFinishPolicy,
    onFinish: (m: MatchRecord) => {
      if (overlayOpen || pendingFinish) setPendingFinish(m);
      else onFinish(m);
    },
    onLegEnd: async (res: LegResult) => {
      StatsOnce.commitX01Leg?.({
        matchId: matchIdRef.current,
        profiles,
        leg: res as any,
        winnerId: res.winnerId ?? null,
        startScore: startFromResume,
      });

      const playersLite: PlayerLiteType[] = mapEnginePlayersToLite(
        (state.players || []) as EnginePlayer[],
        profiles
      );

      const visits: VisitType[] = (visitsLog || []).map((v) => ({
        p: v.p,
        segments: (v.segments || []).map((s) => ({ v: Number(s.v || 0), mult: Number(s.mult || 1) as 1 | 2 | 3 })),
        bust: !!v.bust,
        score: Number(v.score || 0),
        ts: v.ts || Date.now(),
        isCheckout: v.isCheckout,
        // @ts-ignore
        remainingAfter: v.remainingAfter,
      }));

      // 1) Construire leg + legacy (overlay)
      const { leg, legacy } = StatsBridge.makeLeg(visits as any, playersLite, res.winnerId ?? null);
      setLastLegResult({ ...legacy, winnerId: res.winnerId ?? null, __legStats: leg });

      // Garde-fou de ré-entrée (StrictMode)
      const guardReentryRef = (X01Core as any).__guardRef || ((X01Core as any).__guardRef = { current: false });
      if (!guardReentryRef.current) {
        guardReentryRef.current = true;
        setOverlayOpen(true);
        queueMicrotask(() => { guardReentryRef.current = false; });
      }

      // 2) Mini-agrégats “lite”
      try {
        commitLiteFromLeg(legacy, playersLite, res.winnerId ?? null);
      } catch (e) {
        console.warn("commitLiteFromLeg skipped:", e);
      }

      // 3) Accumulation match
      matchLegsRef.current.push(leg);

      // 4) Historique leg
      try {
        const id = crypto.randomUUID?.() ?? String(Date.now());
        await History.upsert({
          id,
          kind: "leg",
          status: "finished",
          players: playersLite,
          winnerId: res.winnerId ?? null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          summary: {
            legs: 1,
            darts: Object.fromEntries(Object.keys(legacy.darts || {}).map((k) => [k, (legacy.darts as any)[k] || 0])),
            avg3ByPlayer: Object.fromEntries(Object.keys(legacy.avg3 || {}).map((k) => [k, (legacy.avg3 as any)[k] || 0])),
            co: Object.values((legacy as any).coHits || {}).reduce((s: any, n: any) => s + (n || 0), 0),
          },
          payload: { leg, legacy },
        } as any);
        await History.list();
      } catch (e) {
        console.warn("[history] upsert leg failed:", e);
      }

      // 5) Reset volée/log & compteurs
      visitNoRef.current = 0;
      setVisitsLog([]);
      setMissByPlayer({});
      setBustByPlayer({});
      setDBullByPlayer({});
    },
  });

  // Historique id / match id
  const historyIdRef = React.useRef<string | undefined>(resumeId);
  const matchIdRef = React.useRef<string>(resumeId ?? (crypto.randomUUID?.() ?? String(Date.now())));

  // ----- Statistiques live pour l’affichage
  const [lastByPlayer, setLastByPlayer] = React.useState<Record<string, UIDart[]>>({});
  const [lastBustByPlayer, setLastBustByPlayer] = React.useState<Record<string, boolean>>({});
  const [dartsCount, setDartsCount] = React.useState<Record<string, number>>({});
  const [pointsSum, setPointsSum] = React.useState<Record<string, number>>({});
  const [visitsCount, setVisitsCount] = React.useState<Record<string, number>>({});
  const [bestVisitByPlayer, setBestVisitByPlayer] = React.useState<Record<string, number>>({});
  const [missByPlayer, setMissByPlayer] = React.useState<Record<string, number>>({});
  const [bustByPlayer, setBustByPlayer] = React.useState<Record<string, number>>({});
  const [dbullByPlayer, setDBullByPlayer] = React.useState<Record<string, number>>({});
  const [hitsByPlayer, setHitsByPlayer] = React.useState<
    Record<string, { h60: number; h100: number; h140: number; h180: number }>
  >({});
  const [impactByPlayer, setImpactByPlayer] = React.useState<
    Record<string, { doubles: number; triples: number; bulls: number }>
  >({});

  // SFX
  const dartHit = React.useMemo(() => createAudio(["/sounds/dart-hit.mp3", "/sounds/dart-hit.ogg"]), []);
  const bustSnd = React.useMemo(() => createAudio(["/sounds/bust.mp3", "/sounds/bust.ogg"]), []);
  const voiceOn = React.useMemo<boolean>(() => (safeGetLocalStorage("opt_voice") ?? "true") === "true", []);

  const profileById = React.useMemo(() => {
    const map: Record<string, Profile> = {};
    for (const p of profiles) map[p.id] = p;
    return map;
  }, [profiles]);

  // Map pour EndOfLegOverlay (hoisté hors JSX)
  const playersByIdMemo = React.useMemo(() => {
    const entries = ((state.players || []) as EnginePlayer[]).map((p) => {
      const prof = profileById[p.id];
      return [p.id, { id: p.id, name: p.name, avatarDataUrl: (prof as any)?.avatarDataUrl }];
    });
    return Object.fromEntries(entries);
  }, [state.players, profileById]);

  // ----- Volée courante
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);

  const currentRemaining = scoresByPlayer[(currentPlayer?.id as string) || ""] ?? startFromResume;

  function playDartSfx(d: UIDart, nextThrow: UIDart[]) {
    const visitSum = nextThrow.reduce((s, x) => s + dartValue(x), 0);
    if (nextThrow.length === 3 && visitSum === 180) return playSound("180");
    if (d.v === 25 && d.mult === 2) return playSound("doublebull");
    if (d.v === 25 && d.mult === 1) return playSound("bull");
    if (d.mult === 3) return playSound("triple");
    if (d.mult === 2) return playSound("double");
    playSound("dart-hit");
  }
  function handleNumber(n: number) {
    if (currentThrow.length >= 3) return;
    const d: UIDart = { v: n, mult: n === 0 ? 1 : multiplier };
    const next = [...currentThrow, d];
    playDartSfx(d, next);
    try { (dartHit as any).currentTime = 0; (typeof (window as any).safePlay === "function" ? (window as any).safePlay(dartHit) : (dartHit as any).play?.()); } catch {}
    (navigator as any).vibrate?.(25);
    setCurrentThrow(next);
    setMultiplier(1);
  }
  function handleBull() {
    if (currentThrow.length >= 3) return;
    const d: UIDart = { v: 25, mult: multiplier === 2 ? 2 : 1 };
    const next = [...currentThrow, d];
    playDartSfx(d, next);
    try { (dartHit as any).currentTime = 0; (typeof (window as any).safePlay === "function" ? (window as any).safePlay(dartHit) : (dartHit as any).play?.()); } catch {}
    (navigator as any).vibrate?.(25);
    setCurrentThrow(next);
    setMultiplier(1);
  }

  // ----- Validation d’une volée (moteur AVANT persistance + micro-tick)
  function validateThrow() {
    if (!currentThrow.length || !currentPlayer) return;

    const currentRemainingLocal = scoresByPlayer[currentPlayer.id] ?? startFromResume;
    const volleyPts = currentThrow.reduce((s, d) => s + dartValue(d), 0);
    const after = currentRemainingLocal - volleyPts;

    let willBust = after < 0;
    const needDoubleOut = outMFromResume !== "simple";
    if (!willBust && needDoubleOut && after === 0) willBust = !isDoubleFinish(currentThrow);

    const ptsForStats = willBust ? 0 : volleyPts;

    // MISS / DBULL / BUST
    const missCount = currentThrow.reduce((n, d) => n + (d.v === 0 ? 1 : 0), 0);
    const dbullCount = currentThrow.reduce((n, d) => n + (d.v === 25 && d.mult === 2 ? 1 : 0), 0);
    if (missCount > 0) setMissByPlayer((m) => ({ ...m, [currentPlayer.id]: (m[currentPlayer.id] || 0) + missCount }));
    if (dbullCount > 0) setDBullByPlayer((m) => ({ ...m, [currentPlayer.id]: (m[currentPlayer.id] || 0) + dbullCount }));
    if (willBust) setBustByPlayer((m) => ({ ...m, [currentPlayer.id]: (m[currentPlayer.id] || 0) + 1 }));

    // Log visite
    pushVisitLog({
      playerId: currentPlayer.id,
      score: ptsForStats,
      remainingAfter: Math.max(after, 0),
      bust: willBust,
      isCheckout: !willBust && after === 0,
      dartsUsed: !willBust && after === 0 ? currentThrow.length : 3,
      darts: currentThrow,
    });

    // Stats live simple
    setDartsCount((m) => ({ ...m, [currentPlayer.id]: (m[currentPlayer.id] || 0) + currentThrow.length }));
    setPointsSum((m) => ({ ...m, [currentPlayer.id]: (m[currentPlayer.id] || 0) + ptsForStats }));
    setVisitsCount((m) => ({ ...m, [currentPlayer.id]: (m[currentPlayer.id] || 0) + 1 }));
    setBestVisitByPlayer((m) => ({ ...m, [currentPlayer.id]: Math.max(m[currentPlayer.id] || 0, volleyPts) }));
    setHitsByPlayer((m) => {
      const prev = m[currentPlayer.id] || { h60: 0, h100: 0, h140: 0, h180: 0 };
      const add = { ...prev };
      if (volleyPts >= 60) add.h60++;
      if (volleyPts >= 100) add.h100++;
      if (volleyPts >= 140) add.h140++;
      if (volleyPts === 180) add.h180++;
      return { ...m, [currentPlayer.id]: add };
    });
    setImpactByPlayer((m) => {
      const add = m[currentPlayer.id] || { doubles: 0, triples: 0, bulls: 0 };
      for (const d of currentThrow) {
        if (d.v === 25) add.bulls += d.mult === 2 ? 1 : 0.5;
        if (d.mult === 2) add.doubles++;
        if (d.mult === 3) add.triples++;
      }
      return { ...m, [currentPlayer.id]: add };
    });

    // IMPORTANT : appliquer le lancer AU MOTEUR AVANT la persistance
    submitThrowUI(currentThrow);

    // Effets audio/retour haptique + pastilles UI
    setLastByPlayer((m) => ({ ...m, [currentPlayer.id]: currentThrow }));
    setLastBustByPlayer((m) => ({ ...m, [currentPlayer.id]: !!willBust }));

    if (willBust) {
      try { (bustSnd as any).currentTime = 0; (typeof (window as any).safePlay === "function" ? (window as any).safePlay(bustSnd) : (bustSnd as any).play?.()); } catch {}
      (navigator as any).vibrate?.([120, 60, 140]);
    } else {
      const voice = voiceOn && "speechSynthesis" in window;
      if (voice) {
        const u = new SpeechSynthesisUtterance(`${currentPlayer.name || ""}, ${volleyPts} points`);
        u.rate = 1;
        try { window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch {}
      }
    }

    // Vider la volée entrée côté UI
    setCurrentThrow([]);
    setMultiplier(1);

    // PERSISTENCE après changement de joueur (snapshot propre : dartsThisTurn = [])
    queueMicrotask(() => {
      try {
        const rec: MatchRecord = makeX01RecordFromEngineCompat({
          engine: buildEngineLike([], winner?.id ?? null),
          existingId: historyIdRef.current,
        });
        // @ts-ignore
        History.upsert(rec);
        historyIdRef.current = rec.id;
        saveAutosave((rec as any).payload.state as X01Snapshot);
      } catch (e) {
        console.warn("[validateThrow:persist-after] fail:", e);
      }
    });
  }

  function handleBackspace() { playSound("dart-hit"); setCurrentThrow((t) => t.slice(0, -1)); }
  function handleCancel() { playSound("bust"); if (currentThrow.length) setCurrentThrow((t) => t.slice(0, -1)); else undoLast?.(); }

  // Classement live
  const liveRanking = React.useMemo(() => {
    const items = ((state.players || []) as EnginePlayer[]).map((p) => ({
      id: p.id, name: p.name, score: scoresByPlayer[p.id] ?? startFromResume,
    }));
    items.sort((a, b) => {
      const az = a.score === 0, bz = b.score === 0;
      if (az && !bz) return -1;
      if (!az && bz) return 1;
      return a.score - b.score;
    });
    return items;
  }, [state.players, scoresByPlayer, startFromResume]);

  const goldBtn: React.CSSProperties = {
    borderRadius: 10,
    padding: "6px 12px",
    border: "1px solid rgba(255,180,0,.3)",
    background: "linear-gradient(180deg, #ffc63a, #ffaf00)",
    color: "#1a1a1a",
    fontWeight: 900,
    boxShadow: "0 10px 22px rgba(255,170,0,.28)",
    cursor: "pointer",
  };

  const flushPendingFinish = React.useCallback(() => {
    if (pendingFinish) {
      const m: MatchRecord = pendingFinish;
      setPendingFinish(null);
      setOverlayOpen(false);
      onFinish(m);
      return;
    }
    const rec: MatchRecord = makeX01RecordFromEngineCompat({
      engine: buildEngineLike([], winner?.id ?? null),
      existingId: historyIdRef.current,
    });
    // @ts-ignore History.upsert accepte MatchRecord
    History.upsert(rec);
    historyIdRef.current = rec.id;
    onFinish(rec);
  }, [pendingFinish, onFinish, winner?.id]);

  // ===== Persist NOW avant de quitter (→ AUTOSAVE intégré)
  function persistNowBeforeExit() {
    try {
      const rec: MatchRecord = makeX01RecordFromEngineCompat({
        engine: buildEngineLike(currentThrow, winner?.id ?? null),
        existingId: historyIdRef.current ?? matchIdRef.current,
      });
      (rec as any).status = winner?.id ? "finished" : "in_progress";
      // @ts-ignore
      History.upsert(rec);
      historyIdRef.current = rec.id;
      if (!winner?.id) {
        // BACKUP local si la partie n'est PAS finie
        saveAutosave((rec as any).payload.state as X01Snapshot);
      } else {
        clearAutosave();
      }
    } catch (e) {
      console.warn("[persistNowBeforeExit] fail:", e);
    }
  }
  function handleQuit() {
    if (pendingFinish) {
      flushPendingFinish();
    } else {
      persistNowBeforeExit();
      onExit();
    }
  }

  // PATCH B — écouteurs stables (refs + deps [])
  const latestPersistFnRef = React.useRef<() => void>(() => {});
  latestPersistFnRef.current = persistNowBeforeExit;
  React.useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        try { latestPersistFnRef.current(); } catch {}
      }
    };
    const onBeforeUnload = () => {
      try { latestPersistFnRef.current(); } catch {}
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []); // attaché une seule fois

  if (!state.players?.length) {
    return (
      <div style={{ padding: 16, maxWidth: CONTENT_MAX, margin: "0 auto" }}>
        <button onClick={handleQuit} style={goldBtn}>← Quitter</button>
        <p>Aucun joueur sélectionné. Reviens au lobby.</p>
      </div>
    );
  }

  const currentAvatar =
    (currentPlayer && (profileById[currentPlayer.id]?.avatarDataUrl as string | null)) ?? null;

  const curDarts = currentPlayer ? (dartsCount[currentPlayer.id] || 0) : 0;
  const curPts = currentPlayer ? (pointsSum[currentPlayer.id] || 0) : 0;
  const curM3D = curDarts > 0 ? ((curPts / curDarts) * 3).toFixed(2) : "0.00";

  // ===== Fin de match : résumés & sauvegardes
  const prevIsOver = React.useRef(false);
  React.useEffect(() => {
    const justFinished = !prevIsOver.current && isOver;
    prevIsOver.current = isOver;

    if (justFinished) {
      persistOnFinish();

      (async () => {
        try {
          const playersArr: PlayerLiteType[] = mapEnginePlayersToLite(
            (state.players || []) as EnginePlayer[],
            profiles
          );
          const matchId = matchIdRef.current;
          const summary = StatsBridge.makeMatch(matchLegsRef.current, playersArr, matchId, "x01");

          try {
            const winnerIdNow: string | null = summary.winnerId ?? (winner?.id ?? null);
            await addMatchSummary({
              winnerId: winnerIdNow,
              perPlayer: Object.fromEntries(
                playersArr.map((p) => [
                  p.id,
                  {
                    id: p.id,
                    games: 1,
                    wins: winnerIdNow === p.id ? 1 : 0,
                    avg3:
                      typeof summary?.perPlayerAvg3?.[p.id] === "number"
                        ? summary.perPlayerAvg3[p.id]
                        : undefined,
                  },
                ])
              ),
            });
          } catch (e) {
            console.warn("[lite] addMatchSummary failed:", e);
          }

          const visitsForPersist: VisitType[] = (visitsLog || []).map((v) => ({
            p: v.p,
            segments: (v.segments || []).map((s) => ({ v: Number(s.v || 0), mult: Number(s.mult || 1) as 1 | 2 | 3 })),
            bust: !!v.bust,
            score: Number(v.score || 0),
            ts: v.ts || Date.now(),
            isCheckout: v.isCheckout,
            // @ts-ignore
            remainingAfter: v.remainingAfter,
          }));

          const per = matchLegsRef.current.flatMap((l: any) => l.perPlayer || []);
          const dartsTotal = per.reduce((n: number, p: any) => n + (p.darts || 0), 0);
          const avg3ByPlayer: Record<string, number> = Object.fromEntries(
            playersArr.map((pl) => {
              const perP = per.filter((x: any) => x.playerId === pl.id);
              const pts = perP.reduce((s: number, x: any) => s + (x.points || 0), 0);
              const d = perP.reduce((s: number, x: any) => s + (x.darts || 0), 0);
              const a3 = d > 0 ? (pts / d) * 3 : 0;
              return [pl.id, Math.round(a3 * 100) / 100];
            })
          );
          const co = matchLegsRef.current.filter((l: any) => !!l.winnerId).length;

          await safeSaveMatch({
            id: matchId || (crypto.randomUUID?.() ?? String(Date.now())),
            players: playersArr,
            winnerId: summary.winnerId ?? null,
            summary: { legs: matchLegsRef.current.length, darts: dartsTotal, avg3ByPlayer, co },
            payload: { visits: visitsForPersist || [], legs: matchLegsRef.current || [], meta: { currentSet, currentLeg: currentLegInSet, legsTarget: legsFromResume } },
          });

          try {
            const legForLegacy = (lastLegResult?.__legStats as any) || (matchLegsRef.current.at(-1) as any);
            if (legForLegacy && Array.isArray(legForLegacy.players)) {
              await emitHistoryRecord_X01({
                playersLite: playersArr,
                winnerId: summary.winnerId ?? null,
                resumeId: resumeId ?? null,
                legStats: legForLegacy,
                visitsLog: [] as any[],
                onFinish, // App.pushHistory()
              });
            }
          } catch (e) {
            console.warn("[emitHistoryRecord_X01] failed:", e);
          }

          try {
            commitMatchSummary(
              buildX01Summary({
                kind: "x01",
                winnerId: summary.winnerId ?? null,
                perPlayer: summary.perPlayer?.map((pp: any) => ({
                  playerId: pp.playerId,
                  name: playersArr.find((p) => p.id === pp.playerId)?.name || "",
                  avg3: Number(pp.avg3 || 0),
                  bestVisit: Number(pp.bestVisit || 0),
                  bestCheckout: Number(pp.bestCheckout || 0),
                  darts: Number(pp.darts || 0),
                  win: !!pp.win,
                  buckets: pp.buckets || undefined,
                })),
              })
            );
          } catch (e) {
            console.warn("[commitMatchSummary] compat failed:", e);
          }

          try {
            const winnerIdNow = summary.winnerId ?? (winner?.id ?? playersArr[0]?.id);
            const m = aggregateMatch(matchLegsRef.current as any, playersArr.map((p) => p.id));
            saveMatchStats({
              id: crypto.randomUUID?.() ?? String(Date.now()),
              createdAt: Date.now(),
              rules: {
                x01Start: startFromResume,
                finishPolicy: outMFromResume !== "simple" ? "doubleOut" : "singleOut",
                setsToWin: setsFromResume,
                legsPerSet: legsFromResume,
              },
              players: playersArr.map((p) => p.id),
              winnerId: winnerIdNow,
              computed: m,
            } as any);
          } catch (e) {
            console.warn("aggregateMatch/saveMatchStats:", e);
          }

          // TTS victoire
          const voice = (safeGetLocalStorage("opt_voice") ?? "true") === "true";
          if (voice && "speechSynthesis" in window) {
            const ordered = [...liveRanking].sort((a, b) => {
              const az = a.score === 0, bz = b.score === 0;
              if (az && !bz) return -1;
              if (!az && bz) return 1;
              return a.score - b.score;
            });
            const ords = ["", "Deuxième", "Troisième", "Quatrième", "Cinquième", "Sixième", "Septième", "Huitième"];
            const parts: string[] = [];
            if (ordered[0]) parts.push(`Victoire ${ordered[0].name}`);
            for (let i = 1; i < ordered.length && i < 8; i++) parts.push(`${ords[i]} ${ordered[i].name}`);
            const text = parts.join(". ") + ".";
            try { const u = new SpeechSynthesisUtterance(text); u.rate = 1; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch {}
          }
        } catch (e) {
          console.warn("[X01Play] makeMatch/save failed:", e);
        }
      })();
    }
  }, [
    isOver, liveRanking, winner?.id, state.players, scoresByPlayer, startFromResume,
    setsFromResume, legsFromResume, outMFromResume, inMFromResume, profiles, lastLegResult, onFinish,
    resumeId, currentLegInSet, currentSet
  ]);

  const showEndBanner = isOver && !pendingFirstWin && !isContinuing;

  // Musique fond overlay/fin
  const [bgMusic] = React.useState(() => {
    try { return createAudio(["/sounds/victory.mp3", "/sounds/victory.ogg"]); } catch { return null as any; }
  });
  React.useEffect(() => {
    const shouldPlay = overlayOpen || showEndBanner;
    const a: any = bgMusic;
    if (!a || typeof a.play !== "function" || typeof a.pause !== "function") return;
    try {
      if (shouldPlay) { a.loop = true; a.volume = 0.6; a.currentTime = 0; a.play()?.catch(() => {}); }
      else { a.pause?.(); a.currentTime = 0; }
    } catch {}
  }, [overlayOpen, showEndBanner, bgMusic]);

  // ===== Handler FERMETURE OVERLAY
  function handleContinueFromRanking(e?: React.MouseEvent) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    overlayClosedOnceRef.current = true;
    setOverlayOpen(false);
    setLastLegResult(null);
    queueMicrotask(() => { overlayClosedOnceRef.current = false; });
  }

  // ===== Fallback overlay si besoin (au cas où pas de legacy)
  React.useEffect(() => {
    if (overlayClosedOnceRef.current) return;
    if (!isOver) return;
    if (!overlayOpen) setOverlayOpen(true);
    if (!lastLegResult) {
      const playersArr = (state.players || []) as { id: string; name: string }[];
      const remaining: Record<string, number> = {};
      const darts: Record<string, number> = {};
      const visits: Record<string, number> = {};
      const avg3: Record<string, number> = {};
      const bestVisit: Record<string, number> = {};
      const bestCheckout: Record<string, number> = {};
      const h60: Record<string, number> = {};
      const h100: Record<string, number> = {};
      const h140: Record<string, number> = {};
      const h180: Record<string, number> = {};
      const miss: Record<string, number> = {};
      const bust: Record<string, number> = {};
      const dbull: Record<string, number> = {};
      const missPct: Record<string, number> = {};
      const bustPct: Record<string, number> = {};
      const dbullPct: Record<string, number> = {};
      const doubles: Record<string, number> = {};
      const triples: Record<string, number> = {};
      const bulls: Record<string, number> = {};

      for (const p of playersArr) {
        const pid = p.id;
        const dCount = dartsCount[pid] || 0;
        const pSum = pointsSum[pid] || 0;
        const a3d = dCount > 0 ? (pSum / dCount) * 3 : 0;

        remaining[pid] = scoresByPlayer[pid] ?? startFromResume;
        darts[pid] = dCount;
        visits[pid] = visitsCount[pid] || (dCount ? Math.ceil(dCount / 3) : 0);
        avg3[pid] = Math.round(a3d * 100) / 100;
        bestVisit[pid] = bestVisitByPlayer[pid] || 0;
        bestCheckout[pid] = 0;
        h60[pid] = hitsByPlayer[pid]?.h60 || 0;
        h100[pid] = hitsByPlayer[pid]?.h100 || 0;
        h140[pid] = hitsByPlayer[pid]?.h140 || 0;
        h180[pid] = hitsByPlayer[pid]?.h180 || 0;

        miss[pid] = missByPlayer[pid] || 0;
        bust[pid] = bustByPlayer[pid] || 0;
        dbull[pid] = dbullByPlayer[pid] || 0;
        missPct[pid] = pct(miss[pid], dCount);
        bustPct[pid] = pct(bust[pid], visits[pid]);
        dbullPct[pid] = pct(dbull[pid], dCount);

        doubles[pid] = impactByPlayer[pid]?.doubles || 0;
        triples[pid] = impactByPlayer[pid]?.triples || 0;
        bulls[pid] = impactByPlayer[pid]?.bulls || 0;
      }

      const order = [...playersArr]
        .sort((a, b) => {
          const as = remaining[a.id] ?? startFromResume;
          const bs = remaining[b.id] ?? startFromResume;
          if (as === 0 && bs !== 0) return -1;
          if (as !== 0 && bs === 0) return 1;
          if (as !== bs) return as - bs;
          return (avg3[b.id] ?? 0) - (avg3[a.id] ?? 0);
        })
        .map((p) => p.id);

      setLastLegResult({
        legNo: 1,
        winnerId: order[0] || playersArr[0]?.id || "",
        order,
        finishedAt: Date.now(),
        remaining,
        darts,
        visits,
        avg3,
        bestVisit,
        bestCheckout,
        h60,
        h100,
        h140,
        h180,
        miss,
        misses: miss,
        missPct,
        bust,
        busts: bust,
        bustPct,
        dbull,
        dbulls: dbull,
        dbullPct,
        doubles,
        triples,
        bulls,
      } as LegResult);
    }
  }, [
    isOver, overlayOpen, lastLegResult, state.players, scoresByPlayer, startFromResume,
    dartsCount, pointsSum, visitsCount, bestVisitByPlayer, hitsByPlayer, missByPlayer,
    dbullByPlayer, impactByPlayer, bustByPlayer
  ]);

  // Persistance “en cours”
  function buildEngineLike(dartsThisTurn: UIDart[], winnerId?: string | null) {
    const playersArr: EnginePlayer[] = ((state.players || []) as EnginePlayer[]).map((p) => ({ id: p.id, name: p.name }));
    const scores: number[] = playersArr.map((p) => scoresByPlayer[p.id] ?? startFromResume);
    const idx = playersArr.findIndex((p) => p.id === (currentPlayer?.id as string));
    return {
      rules: { start: startFromResume, doubleOut: outMFromResume !== "simple", setsToWin: setsFromResume, legsPerSet: legsFromResume, outMode: outMFromResume, inMode: inMFromResume },
      players: playersArr, scores, currentIndex: idx >= 0 ? idx : 0, dartsThisTurn, winnerId: winnerId ?? null,
    };
  }

  // ======= PERSIST (AUTOSAVE ajouté) =======
  function persistAfterThrow(_dartsJustThrown: UIDart[]) {
    const rec: MatchRecord = makeX01RecordFromEngineCompat({
      engine: buildEngineLike(_dartsJustThrown, null),
      existingId: historyIdRef.current,
    });
    // @ts-ignore
    History.upsert(rec);
    historyIdRef.current = rec.id;
    saveAutosave((rec as any).payload.state as X01Snapshot);
  }
  function persistOnFinish() {
    const rec: MatchRecord = makeX01RecordFromEngineCompat({
      engine: buildEngineLike([], winner?.id ?? null),
      existingId: historyIdRef.current,
    });
    // @ts-ignore
    History.upsert(rec);
    historyIdRef.current = rec.id;
    clearAutosave();
  }

  /* ===== Mesure du header ===== */
  const headerWrapRef = React.useRef<HTMLDivElement | null>(null);
  const [headerH, setHeaderH] = React.useState<number>(0);
  React.useEffect(() => {
    const el = headerWrapRef.current;
    if (!el) return;
    const measure = () => setHeaderH(Math.ceil(el.getBoundingClientRect().height));
    measure();
    const ro = (window as any).ResizeObserver ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro?.disconnect?.(); window.removeEventListener("resize", measure); };
  }, []);

  /* ===== Layout fixe ===== */
  return (
    <div className="x01play-container" style={{ overflow: "hidden" }}>
      {/* ===== TOP FIXE : barre haute + header ===== */}
      <div
        ref={headerWrapRef}
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          top: 0,
          zIndex: 60,
          width: `min(100%, ${CONTENT_MAX}px)`,
          paddingInline: 12,
          paddingTop: 6,
          paddingBottom: 6,
          background: "transparent",
        }}
      >
        {/* Barre haute */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <button onClick={handleQuit} style={goldBtn}>← Quitter</button>
          <SetLegChip currentSet={currentSet} currentLegInSet={currentLegInSet} setsTarget={setsFromResume} legsTarget={legsFromResume} />
        </div>

        {/* HEADER */}
        <div style={{ maxWidth: CONTENT_MAX, margin: "0 auto", paddingInline: 0 }}>
          <HeaderBlock
            currentPlayer={currentPlayer as any}
            currentAvatar={(currentPlayer && profileById[currentPlayer.id]?.avatarDataUrl) || null}
            currentRemaining={currentRemaining}
            currentThrow={currentThrow}
            doubleOut={outMFromResume !== "simple"}
            liveRanking={liveRanking}
            curDarts={curDarts}
            curM3D={curM3D}
            bestVisit={bestVisitByPlayer[currentPlayer?.id ?? ""] ?? 0}
            dartsLeft={(3 - currentThrow.length) as 1 | 2 | 3}
          />
        </div>
      </div>

      {/* ===== ZONE JOUEURS — liste scrollable entre header et keypad ===== */}
      <div
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          top: Math.max((headerH || 0) - 6, 0),
          bottom: NAV_HEIGHT + Math.round(KEYPAD_HEIGHT * KEYPAD_SCALE) + 8,
          zIndex: 40,
          width: `min(100%, ${CONTENT_MAX}px)`,
          paddingInline: 12,
          overflow: "auto",
        }}
      >
        <PlayersListOnly
          statePlayers={(state.players || []) as EnginePlayer[]}
          profileById={profileById}
          dartsCount={dartsCount}
          pointsSum={pointsSum}
          start={startFromResume}
          scoresByPlayer={scoresByPlayer}
          visitsLog={visitsLog}
        />
      </div>

      {/* ===== KEYPAD FIXE ===== */}
      <div
        style={{
          position: "fixed",
          left: "50%",
          transform: `translateX(-50%) scale(${KEYPAD_SCALE})`,
          bottom: NAV_HEIGHT,
          zIndex: 45,
          padding: "0 12px 8px",
          width: `min(100%, ${CONTENT_MAX}px)`,
        }}
      >
        <Keypad
          currentThrow={currentThrow}
          multiplier={multiplier}
          onSimple={() => setMultiplier(1)}
          onDouble={() => setMultiplier(2)}
          onTriple={() => setMultiplier(3)}
          onBackspace={handleBackspace}
          onCancel={handleCancel}
          onNumber={handleNumber}
          onBull={handleBull}
          onValidate={validateThrow}
          hidePreview
        />
      </div>

      {/* Modale CONTINUER ? */}
      {pendingFirstWin && (
        <ContinueModal endNow={endNow} continueAfterFirst={continueAfterFirst} />
      )}

      {/* Overlay fin de manche */}
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: overlayOpen ? "auto" : "none" }}>
        <EndOfLegOverlay
          open={overlayOpen}
          result={lastLegResult as any}
          playersById={playersByIdMemo}
          onClose={handleContinueFromRanking}
          onReplay={handleContinueFromRanking}
          onSave={(res) => {
            try {
              const playersNow: PlayerLiteType[] = mapEnginePlayersToLite(
                (state.players || []) as EnginePlayer[],
                profiles
              );
              // @ts-ignore
              History.upsert({
                kind: "leg",
                id: crypto.randomUUID?.() ?? String(Date.now()),
                status: "finished",
                players: playersNow,
                updatedAt: Date.now(),
                createdAt: Date.now(),
                payload: { ...res, meta: { currentSet, currentLegInSet, setsTarget: setsFromResume, legsTarget: legsFromResume } },
              } as any);
              History.list();
              (navigator as any).vibrate?.(50);
            } catch (e) {
              console.warn("Impossible de sauvegarder la manche:", e);
            }
            handleContinueFromRanking();
          }}
        />
      </div>

      {/* Bandeau fin de partie (boutons) */}
      {isOver && !pendingFirstWin && !isContinuing && (
        <EndBanner
          winnerName={winner?.name || "—"}
          continueAfterFirst={continueAfterFirst}
          openOverlay={() => setOverlayOpen(true)}
          flushPendingFinish={flushPendingFinish}
          goldBtn={goldBtn}
        />
      )}
    </div>
  );

  /* ===== Sous-composants ===== */

  function HeaderBlock(props: {
    currentPlayer?: EnginePlayer | null;
    currentAvatar: string | null;
    currentRemaining: number;
    currentThrow: UIDart[];
    doubleOut: boolean;
    liveRanking: { id: string; name: string; score: number }[];
    curDarts: number;
    curM3D: string;
    bestVisit: number;
    dartsLeft: 1 | 2 | 3;
  }) {
    const { currentPlayer, currentAvatar, currentRemaining, currentThrow, doubleOut, liveRanking, curDarts, curM3D, bestVisit } = props;

    return (
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background:
            "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.10), transparent 55%), linear-gradient(180deg, rgba(15,15,18,.9), rgba(10,10,12,.8))",
          border: "1px solid rgba(255,255,255,.08)",
          borderRadius: 18,
          padding: 8,
          boxShadow: "0 10px 30px rgba(0,0,0,.35)",
          marginBottom: 4,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10, alignItems: "center" }}>
          {/* Avatar + mini stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
            <div style={{ width: 108, height: 108, borderRadius: "50%", overflow: "hidden", background: "linear-gradient(180deg, #1b1b1f, #111114)", boxShadow: "0 8px 28px rgba(0,0,0,.35)" }}>
              {currentAvatar ? (
                <img src={currentAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontWeight: 700 }}>?</div>
              )}
            </div>
            <div style={{ fontWeight: 900, fontSize: 18, color: "#ffcf57", letterSpacing: 0.3 }}>{currentPlayer?.name ?? "—"}</div>
            <div style={{ ...miniCard, width: 180, height: 86, padding: 8 }}>
              <div style={miniText}>
                <div>Meilleure volée : <b>{Math.max(0, bestVisit)}</b></div>
                <div>Moy/3D : <b>{curM3D}</b></div>
                <div>Darts jouées : <b>{curDarts}</b></div>
                <div>Volée : <b>{Math.min(currentThrow.length, 3)}/3</b></div>
              </div>
            </div>
          </div>

          {/* Score + volée + checkout + mini-ranking */}
          <div style={{ textAlign: "center", minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 72, lineHeight: 1, fontWeight: 900, color: "#ffcf57", textShadow: "0 4px 20px rgba(255,195,26,.25)", letterSpacing: 0.5, marginTop: 2 }}>
              {Math.max(currentRemaining - currentThrow.reduce((s, d) => s + dartValue(d), 0), 0)}
            </div>

            {/* Pastilles volée (en live) */}
            <div style={{ marginTop: 2, display: "flex", gap: 6, justifyContent: "center" }}>
              {[0, 1, 2].map((i: number) => {
                const d = currentThrow[i];
                const afterNow = currentRemaining - currentThrow.slice(0, i + 1).reduce((s, x) => s + dartValue(x), 0);
                const wouldBust = afterNow < 0 || (doubleOut && afterNow === 0 && !isDoubleFinish(currentThrow.slice(0, i + 1)));
                const st = chipStyle(d, wouldBust);
                return (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 44, height: 32, padding: "0 12px", borderRadius: 10, border: st.border as string, background: st.background as string, color: st.color as string, fontWeight: 800 }}>
                    {fmt(d)}
                  </span>
                );
              })}
            </div>

            {/* Checkout header */}
            {(() => {
              const only = suggestCheckout(
                Math.max(currentRemaining - currentThrow.reduce((s, d) => s + dartValue(d), 0), 0),
                doubleOut,
                (3 - currentThrow.length) as 1 | 2 | 3
              )[0];
              if (!only || currentThrow.length >= 3) return null;
              return (
                <div style={{ marginTop: 4, display: "flex", justifyContent: "center" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "radial-gradient(120% 120% at 50% 0%, rgba(255,195,26,.10), rgba(30,30,34,.95))", minWidth: 180, maxWidth: 520 }}>
                    <span style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid rgba(255,187,51,.4)", background: "rgba(255,187,51,.12)", color: "#ffc63a", fontWeight: 900, whiteSpace: "nowrap" }}>
                      {only}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Mini-Classement */}
            <div style={{ ...miniCard, alignSelf: "center", width: "min(320px, 100%)", height: "auto", padding: 6 }}>
              <div style={{ maxHeight: 3 * 28, overflow: (liveRanking.length > 3 ? "auto" : "visible") as any }}>
                {liveRanking.map((r, i) => (
                  <div key={r.id} style={{ ...miniRankRow, marginBottom: 3 }}>
                    <div style={miniRankName}>{i + 1}. {r.name}</div>
                    <div style={r.score === 0 ? miniRankScoreFini : miniRankScore}>{r.score === 0 ? "FINI" : r.score}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /** Liste de joueurs — pastilles collées au nom (AVANT le score) */
  function PlayersListOnly(props: {
    statePlayers: EnginePlayer[];
    profileById: Record<string, Profile>;
    dartsCount: Record<string, number>;
    pointsSum: Record<string, number>;
    start: number;
    scoresByPlayer: Record<string, number>;
    visitsLog: VisitLite[];
  }) {
    const { statePlayers, profileById, dartsCount, pointsSum, start, scoresByPlayer, visitsLog } = props;

    return (
      <div
        style={{
          background: "linear-gradient(180deg, rgba(15,15,18,.9), rgba(10,10,12,.85))",
          border: "1px solid rgba(255,255,255,.08)",
          borderRadius: 18,
          padding: 10,
          marginBottom: 10,
          boxShadow: "0 10px 30px rgba(0,0,0,.35)",
        }}
      >
        <div style={{ marginTop: 0, maxHeight: "100%", overflow: "visible" }}>
          {statePlayers.map((p) => {
            const prof = profileById[p.id];
            const avatarSrc = (prof?.avatarDataUrl as string | null) ?? null;
            const dCount = dartsCount[p.id] || 0;
            const pSum = pointsSum[p.id] || 0;
            const a3d = dCount > 0 ? ((pSum / dCount) * 3).toFixed(2) : "0.00";
            const score = scoresByPlayer[p.id] ?? start;

            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 12,
                  background: "linear-gradient(180deg, rgba(28,28,32,.65), rgba(18,18,20,.65))",
                  border: "1px solid rgba(255,255,255,.07)",
                  marginBottom: 6,
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "rgba(255,255,255,.06)",
                    flex: "0 0 auto",
                  }}
                >
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#999",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      ?
                    </div>
                  )}
                </div>

                {/* Bloc central : Nom + pastilles de volée + sous-ligne stats */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Ligne 1 : Nom + pastilles */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ fontWeight: 800, color: "#ffcf57", whiteSpace: "nowrap" }}>{p.name}</div>

                    {/* Pastilles de la dernière volée */}
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                        overflow: "hidden",
                      }}
                    >
                      {renderLastVisitChipsFromLog(visitsLog, p.id)}
                    </div>
                  </div>

                  {/* Ligne 2 : petites stats */}
                  <div style={{ fontSize: 11.5, color: "#cfd1d7", marginTop: 2 }}>
                    Darts: {dCount} • Moy/3D: {a3d}
                  </div>
                </div>

                {/* Score à droite */}
                <div
                  style={{
                    fontWeight: 900,
                    color: score === 0 ? "#7fe2a9" : "#ffcf57",
                    marginLeft: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  {score}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function EndBanner({
    winnerName,
    continueAfterFirst,
    openOverlay,
    flushPendingFinish,
    goldBtn,
  }: {
    winnerName: string;
    continueAfterFirst: () => void;
    openOverlay: () => void;
    flushPendingFinish: () => void;
    goldBtn: React.CSSProperties;
  }) {
    return (
      <div
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: NAV_HEIGHT + Math.round(KEYPAD_HEIGHT * KEYPAD_SCALE) + 80,
          zIndex: 47,
          background: "linear-gradient(180deg, #ffc63a, #ffaf00)",
          color: "#1a1a1a",
          fontWeight: 900,
          textAlign: "center",
          padding: 12,
          borderRadius: 12,
          boxShadow: "0 10px 28px rgba(0,0,0,.35)",
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <span>Victoire : {winnerName}</span>
        <button onClick={continueAfterFirst} style={goldBtn}>Continuer (laisser finir)</button>
        <button onClick={openOverlay} style={goldBtn}>Classement</button>
        <button onClick={flushPendingFinish} style={goldBtn}>Terminer</button>
      </div>
    );
  }

  /* ===== ContinueModal ===== */
  function ContinueModal({
    endNow,
    continueAfterFirst,
  }: {
    endNow: () => void;
    continueAfterFirst: () => void;
  }) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          background: "rgba(0,0,0,.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          style={{
            width: "min(440px, 92%)",
            borderRadius: 16,
            padding: 16,
            background:
              "linear-gradient(180deg, rgba(20,20,24,.96), rgba(14,14,16,.98))",
            border: "1px solid rgba(255,255,255,.12)",
            boxShadow: "0 18px 40px rgba(0,0,0,.45)",
            color: "#eee",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>
            Continuer la manche ?
          </div>
          <div style={{ opacity: 0.85, marginBottom: 14 }}>
            Un joueur a fini. Tu veux laisser les autres terminer leur leg ou
            arrêter maintenant ?
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={continueAfterFirst}
              style={{
                borderRadius: 10,
                padding: "8px 12px",
                border: "1px solid rgba(120,200,130,.35)",
                background: "linear-gradient(180deg,#3cc86d,#2aa85a)",
                color: "#101214",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Continuer
            </button>
            <button
              onClick={endNow}
              style={{
                borderRadius: 10,
                padding: "8px 12px",
                border: "1px solid rgba(255,180,0,.35)",
                background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
                color: "#101214",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Terminer
            </button>
          </div>
        </div>
      </div>
    );
  }

/* ===== Persist helpers ===== */
function makeX01RecordFromEngineCompat(args: {
  engine: {
    rules: {
      start: number;
      doubleOut: boolean;
      setsToWin?: number;
      legsPerSet?: number;
      outMode?: Mode;
      inMode?: Mode;
    };
    players: EnginePlayer[];
    scores: number[];
    currentIndex: number;
    dartsThisTurn: UIDart[];
    winnerId: string | null;
  };
  existingId?: string;
}): MatchRecord {
  const { engine, existingId } = args;
  const payload = {
    state: {
      rules: engine.rules,
      players: engine.players,
      scores: engine.scores,
      currentIndex: engine.currentIndex,
      dartsThisTurn: engine.dartsThisTurn,
      winnerId: engine.winnerId,
    },
    kind: "x01",
  };
  const now = Date.now();
  const rec: any = {
    id: existingId ?? (crypto.randomUUID?.() ?? String(now)),
    kind: "x01",
    status: engine.winnerId ? "finished" : "in_progress",
    players: engine.players,
    winnerId: engine.winnerId || null,
    createdAt: now,
    updatedAt: now,
    payload,
  };
  return rec as MatchRecord;
}

async function safeSaveMatch({
  id,
  players,
  winnerId,
  summary,
  payload,
}: {
  id: string;
  players: { id: string; name?: string; avatarDataUrl?: string | null }[];
  winnerId: string | null;
  summary: {
    legs?: number;
    darts?: number;
    avg3ByPlayer?: Record<string, number>;
    co?: number;
  } | null;
  payload: any;
}) {
  try {
    const now = Date.now();
    await History.upsert({
      id,
      kind: "x01",
      status: "finished",
      players,
      winnerId,
      createdAt: now,
      updatedAt: now,
      summary: summary || null,
      payload,
    });
    const { winnerId: w, perPlayer } = extractAggFromSavedMatch({
      id,
      players,
      winnerId,
      summary,
      payload,
    });
    if (Object.keys(perPlayer || {}).length)
      await addMatchSummary({ winnerId: w, perPlayer });
    await History.list();
  } catch (e) {
    console.warn("[HIST:FAIL]", e);
  }
}

function SetLegChip({
  currentSet,
  currentLegInSet,
  setsTarget,
  legsTarget,
}: {
  currentSet: number;
  currentLegInSet: number;
  setsTarget: number;
  legsTarget: number;
}) {
  const st: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    border: "1px solid rgba(255,200,80,.35)",
    background:
      "linear-gradient(180deg, rgba(255,195,26,.12), rgba(30,30,34,.95))",
    color: "#ffcf57",
    fontWeight: 800,
    fontSize: 12,
    boxShadow: "0 6px 18px rgba(255,195,26,.15)",
    whiteSpace: "nowrap",
    borderRadius: 999,
  };
  return (
    <span style={st}>
      <span>
        Set {currentSet}/{setsTarget}
      </span>
      <span style={{ opacity: 0.6 }}>•</span>
      <span>
        Leg {currentLegInSet}/{legsTarget}
      </span>
    </span>
  );
}
}
