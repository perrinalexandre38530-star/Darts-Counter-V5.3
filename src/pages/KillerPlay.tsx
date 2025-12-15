// @ts-nocheck
// ============================================
// src/pages/KillerPlay.tsx
// KILLER — PLAY (V1.3 + BOTS) — UI refacto X01-like
// ✅ Liste joueurs scrollable (header + joueur actif + keypad restent visibles)
// ✅ "i" = InfoDot (style Games) + texte "i" blanc
// ✅ Supprime tous les halos autour du médaillon du profil actif
// ✅ Liste joueurs : plus de “fond blanc/halo” derrière les avatars
// ✅ Affiche dernière volée du joueur (3 chips colorées) à côté du nom (style X01MultiV3)
// ✅ Message “Appuie sur VALIDER…” => 1 seule phrase dans un petit bloc flottant
// ✅ FIX: chips au-dessus du Keypad restent GROS (chipStyleBig)
// ✅ FIX: chips mini dans la liste joueurs (chipStyleMini)
// ✅ FIX: DOUBLE/TRIPLE reset après chaque lancer (setMultiplier(1) après snapshot())
// ============================================

import React from "react";
import type { Store, MatchRecord, Dart as UIDart } from "../lib/types";
import type { KillerConfig, KillerDamageRule, KillerBecomeRule } from "./KillerConfig";
import Keypad from "../components/Keypad";
import InfoDot from "../components/InfoDot";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  config: KillerConfig;
  onFinish: (m: MatchRecord | any) => void;
};

type Mult = 1 | 2 | 3;

type ThrowInput = {
  target: number; // 0 = MISS, 1..20, 25 = BULL
  mult: Mult; // S=1 D=2 T=3
};

type KillerPlayerState = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  isBot?: boolean;
  botLevel?: string;

  number: number; // 1..20
  lives: number; // >=0
  isKiller: boolean;
  eliminated: boolean;

  kills: number;
  hitsOnSelf: number;
  totalThrows: number;
  killerThrows: number;
  offensiveThrows: number;
  killerHits: number;
  uselessHits: number;

  livesTaken: number;
  livesLost: number;

  throwsToBecomeKiller: number;
  becameAtThrow?: number | null;
  eliminatedAt?: number | null;

  hitsBySegment: Record<string, number>;
  hitsByNumber: Record<string, number>;

  // ✅ UI: dernière volée jouée (affichage liste joueurs)
  lastVisit?: ThrowInput[] | null;
};

type Snapshot = {
  players: KillerPlayerState[];
  turnIndex: number;
  dartsLeft: number;
  visit: ThrowInput[];
  log: string[];
  finished: boolean;
  elimOrder: string[];
  multiplier: Mult;
};

function clampInt(n: any, min: number, max: number, fallback: number) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return fallback;
  return Math.max(min, Math.min(max, x));
}

function isDouble(mult: Mult) {
  return mult === 2;
}

function canBecomeKiller(rule: KillerBecomeRule, t: ThrowInput) {
  if (rule === "single") return true;
  return isDouble(t.mult);
}

function dmgFrom(mult: Mult, rule: KillerDamageRule): number {
  return rule === "multiplier" ? mult : 1;
}

function nextAliveIndex(players: KillerPlayerState[], from: number) {
  if (!players.length) return 0;
  for (let i = 1; i <= players.length; i++) {
    const idx = (from + i) % players.length;
    if (!players[idx].eliminated) return idx;
  }
  return from;
}

function winner(players: KillerPlayerState[]) {
  const alive = players.filter((p) => !p.eliminated);
  return alive.length === 1 ? alive[0] : null;
}

function fmtThrow(t: ThrowInput) {
  const m = t.mult === 1 ? "S" : t.mult === 2 ? "D" : "T";
  if (t.target === 0) return "MISS";
  if (t.target === 25) return t.mult === 2 ? "DBULL" : "BULL";
  return `${m}${t.target}`;
}

function segmentKey(t: ThrowInput) {
  if (t.target === 0) return "MISS";
  if (t.target === 25) return t.mult === 2 ? "DBULL" : "BULL";
  return fmtThrow(t);
}

function incMap(map: any, key: any, by = 1) {
  const k = String(key);
  const next = { ...(map || {}) };
  next[k] = (Number(next[k]) || 0) + by;
  return next;
}

// -----------------------------
// BOT helpers
// -----------------------------
function resolveBotSkill(botLevelRaw?: string | null): number {
  const v = String(botLevelRaw || "").toLowerCase().trim();
  if (!v) return 2;

  const digits = v.replace(/[^0-9]/g, "");
  if (digits) {
    const n = parseInt(digits, 10);
    if (Number.isFinite(n)) return Math.max(1, Math.min(5, n));
  }

  if (v.includes("legend") || v.includes("légende")) return 5;
  if (v.includes("prodige")) return 4;
  if (v.includes("pro")) return 4;
  if (v.includes("fort") || v.includes("hard") || v.includes("difficile")) return 3;
  if (v.includes("standard") || v.includes("normal") || v.includes("moyen")) return 2;
  if (v.includes("easy") || v.includes("facile") || v.includes("débutant")) return 1;

  return 2;
}

function rand01() {
  return Math.random();
}

function pickMultForBot(skill: number, becomeRule: KillerBecomeRule, wantsDouble: boolean): Mult {
  const r = rand01();

  if (wantsDouble) {
    if (skill >= 4) return r < 0.78 ? 2 : r < 0.9 ? 3 : 1;
    if (skill === 3) return r < 0.65 ? 2 : r < 0.78 ? 1 : 3;
    if (skill === 2) return r < 0.55 ? 2 : r < 0.9 ? 1 : 3;
    return r < 0.45 ? 2 : 1;
  }

  if (skill >= 5) return r < 0.55 ? 2 : r < 0.8 ? 3 : 1;
  if (skill === 4) return r < 0.45 ? 2 : r < 0.65 ? 3 : 1;
  if (skill === 3) return r < 0.3 ? 2 : r < 0.4 ? 3 : 1;
  if (skill === 2) return r < 0.18 ? 2 : r < 0.22 ? 3 : 1;
  return r < 0.1 ? 2 : 1;
}

function decideBotThrow(me: KillerPlayerState, all: KillerPlayerState[], config: KillerConfig): ThrowInput {
  const skill = resolveBotSkill(me.botLevel);

  const aliveOthers = all.filter((p) => !p.eliminated && p.id !== me.id);

  const missRate = skill <= 1 ? 0.22 : skill === 2 ? 0.16 : skill === 3 ? 0.1 : skill === 4 ? 0.06 : 0.03;
  const bullRate = skill >= 4 ? 0.03 : 0.015;

  const r = rand01();
  if (r < missRate) return { target: 0, mult: 1 };
  if (r < missRate + bullRate) return { target: 25, mult: rand01() < 0.25 ? 2 : 1 };

  if (!me.isKiller) {
    const wantsDouble = config.becomeRule === "double";
    const hitOwnRate = skill <= 1 ? 0.55 : skill === 2 ? 0.68 : skill === 3 ? 0.78 : skill === 4 ? 0.88 : 0.94;
    if (rand01() < hitOwnRate) return { target: me.number, mult: pickMultForBot(skill, config.becomeRule, wantsDouble) };

    const n = 1 + Math.floor(Math.random() * 20);
    return { target: n, mult: pickMultForBot(skill, config.becomeRule, false) };
  }

  const hitVictimRate = skill <= 1 ? 0.52 : skill === 2 ? 0.66 : skill === 3 ? 0.76 : skill === 4 ? 0.86 : 0.92;
  if (aliveOthers.length === 0) return { target: 0, mult: 1 };

  if (rand01() < hitVictimRate) {
    const sorted = [...aliveOthers].sort((a, b) => (a.lives ?? 0) - (b.lives ?? 0));
    const pick = sorted[0];
    return { target: pick.number, mult: pickMultForBot(skill, config.becomeRule, false) };
  }

  const n = 1 + Math.floor(Math.random() * 20);
  return { target: n, mult: pickMultForBot(skill, config.becomeRule, false) };
}

// -----------------------------
// UI helpers
// -----------------------------
const pageBg =
  "radial-gradient(circle at 25% 0%, rgba(255,198,58,.18) 0, rgba(0,0,0,0) 35%), radial-gradient(circle at 80% 30%, rgba(255,198,58,.10) 0, rgba(0,0,0,0) 40%), linear-gradient(180deg, #0a0a0c, #050507 60%, #020203)";

const card: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(22,22,23,.85), rgba(12,12,14,.95))",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 18,
  boxShadow: "0 10px 30px rgba(0,0,0,.35)",
};

const gold = "#ffc63a";
const gold2 = "#ffaf00";

function toKeypadThrow(visit: ThrowInput[]): UIDart[] {
  const v = (visit || []).slice(0, 3);
  const out: UIDart[] = [];
  for (const t of v) {
    const target = clampInt(t?.target, 0, 25, 0);
    const mult = clampInt(t?.mult, 1, 3, 1) as any;
    out.push({ v: target, mult });
  }
  while (out.length < 3) out.push(undefined as any);
  return out;
}

function fmtChip(d?: UIDart) {
  if (!d) return "—";
  if (d.v === 0) return "MISS";
  if (d.v === 25) return d.mult === 2 ? "DBULL" : "BULL";
  return `${d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S"}${d.v}`;
}

// ✅ chips BIG (au-dessus du Keypad)
function chipStyleBig(d?: UIDart): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 56,
    height: 34,
    padding: "0 14px",
    borderRadius: 14,
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: 0.5,
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(0,0,0,.55)",
    boxShadow: "0 0 22px rgba(250,213,75,.18)",
  };

  if (!d) return base;
  if (d.v === 0) return { ...base, color: "rgba(255,255,255,.65)" };

  if (d.v === 25) {
    return d.mult === 2
      ? { ...base, background: "rgba(255,80,80,.14)", border: "1px solid rgba(255,80,80,.30)", color: "#ffd2d2" }
      : { ...base, background: "rgba(80,180,255,.14)", border: "1px solid rgba(80,180,255,.30)", color: "#d6efff" };
  }

  if (d.mult === 3) return { ...base, background: "rgba(164,80,255,.14)", border: "1px solid rgba(164,80,255,.30)", color: "#e8d6ff" };
  if (d.mult === 2) return { ...base, background: "rgba(80,200,255,.12)", border: "1px solid rgba(80,200,255,.30)", color: "#d6f3ff" };
  return { ...base, background: "rgba(255,198,58,.10)", border: "1px solid rgba(255,198,58,.22)", color: "#ffe7b0" };
}

// ✅ chips MINI (dans la liste joueurs)
function chipStyleMini(d?: UIDart): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 28,
    height: 18,
    padding: "0 6px",
    borderRadius: 999,
    fontWeight: 1000,
    fontSize: 10,
    letterSpacing: 0,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.55)",
    lineHeight: "18px",
    transform: "translateY(-1px)",
  };

  if (!d) return base;
  if (d.v === 0) return { ...base, color: "rgba(255,255,255,.60)" };

  if (d.v === 25) {
    return d.mult === 2
      ? { ...base, background: "rgba(255,80,80,.14)", border: "1px solid rgba(255,80,80,.30)", color: "#ffd2d2" }
      : { ...base, background: "rgba(80,180,255,.14)", border: "1px solid rgba(80,180,255,.30)", color: "#d6efff" };
  }

  if (d.mult === 3) return { ...base, background: "rgba(164,80,255,.14)", border: "1px solid rgba(164,80,255,.30)", color: "#e8d6ff" };
  if (d.mult === 2) return { ...base, background: "rgba(80,200,255,.12)", border: "1px solid rgba(80,200,255,.30)", color: "#d6f3ff" };
  return { ...base, background: "rgba(255,198,58,.10)", border: "1px solid rgba(255,198,58,.22)", color: "#ffe7b0" };
}

function rulesText(config: KillerConfig) {
  const lives = clampInt((config as any)?.lives, 1, 9, 3);

  const becomeRuleText =
    config.becomeRule === "double"
      ? "Tu deviens KILLER uniquement si tu touches TON numéro en DOUBLE (Dxx)."
      : "Tu deviens KILLER dès que tu touches TON numéro, même en SIMPLE (Sxx).";

  const damageText =
    config.damageRule === "multiplier"
      ? "Quand tu touches le numéro d’un adversaire, il perd 1/2/3 vies selon S/D/T."
      : "Quand tu touches le numéro d’un adversaire, il perd toujours 1 vie (S/D/T ne change rien).";

  return [
    {
      title: "But",
      body:
        "Tu as un numéro (#1…#20). D’abord tu dois devenir KILLER, puis éliminer les autres en touchant leur numéro.",
    },

    {
      title: "Départ",
      body:
        `Chaque joueur commence avec ${lives} vie(s). Un joueur est éliminé quand ses vies tombent à 0.`,
    },

    {
      title: "Devenir KILLER",
      body:
        `${becomeRuleText}\n` +
        "Important : toucher un autre numéro que le tien ne te rend pas KILLER.",
    },

    {
      title: "Attaquer (quand tu es KILLER)",
      body:
        `${damageText}\n` +
        "Seuls les adversaires vivants peuvent perdre des vies. Si tu réduis un joueur à 0 vie → il est OUT immédiatement.",
    },

    {
      title: "Ce qui ne fait rien",
      body:
        "MISS (0) : aucun effet.\n" +
        "BULL / DBULL : aucun effet (ni pour devenir KILLER, ni pour enlever des vies).\n" +
        "Toucher un numéro d’un joueur déjà OUT : aucun effet.",
    },

    {
      title: "Tour de jeu",
      body:
        "À ton tour : 3 fléchettes.\n" +
        "Le changement de joueur se fait en appuyant sur VALIDER (après tes 3 fléchettes ou quand tu veux finir le tour).",
    },

    {
      title: "Fin de partie",
      body:
        "La partie se termine quand il ne reste plus qu’un seul joueur vivant : il gagne 🏆",
    },
  ];
}


function AvatarMedallion({
  size,
  src,
  name,
}: {
  size: number;
  src?: string | null;
  name?: string;
}) {
  const initials = String(name || "J").trim().slice(0, 1).toUpperCase();

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: "transparent", // ✅ aucun halo / aucun fond “blanc”
      }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            placeItems: "center",
            borderRadius: "50%",
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.10)",
            fontWeight: 1000,
            color: "#fff",
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

export default function KillerPlay({ store, go, config, onFinish }: Props) {
  const startedAt = React.useMemo(() => Date.now(), []);
  const finishedRef = React.useRef(false);
  const elimOrderRef = React.useRef<string[]>([]);

  const initialPlayers: KillerPlayerState[] = React.useMemo(() => {
    const lives = clampInt(config?.lives, 1, 9, 3);
    return (config?.players || []).map((p) => ({
      id: p.id,
      name: p.name,
      avatarDataUrl: p.avatarDataUrl ?? null,
      isBot: !!p.isBot,
      botLevel: p.botLevel ?? "",

      number: clampInt(p.number, 1, 20, 1),
      lives,
      isKiller: false,
      eliminated: false,

      kills: 0,
      hitsOnSelf: 0,
      totalThrows: 0,
      killerThrows: 0,
      offensiveThrows: 0,
      killerHits: 0,
      uselessHits: 0,

      livesTaken: 0,
      livesLost: 0,

      throwsToBecomeKiller: 0,
      becameAtThrow: null,
      eliminatedAt: null,

      hitsBySegment: {},
      hitsByNumber: {},

      lastVisit: null,
    }));
  }, [config]);

  const [players, setPlayers] = React.useState<KillerPlayerState[]>(initialPlayers);
  const [turnIndex, setTurnIndex] = React.useState<number>(() => {
    const i = initialPlayers.findIndex((p) => !p.eliminated);
    return i >= 0 ? i : 0;
  });

  const [dartsLeft, setDartsLeft] = React.useState<number>(3);
  const [visit, setVisit] = React.useState<ThrowInput[]>([]);
  const [log, setLog] = React.useState<string[]>([]);
  const [finished, setFinished] = React.useState<boolean>(false);
  const [multiplier, setMultiplier] = React.useState<Mult>(1);
  const [showRules, setShowRules] = React.useState(false);

  const undoRef = React.useRef<Snapshot[]>([]);
  const botTimerRef = React.useRef<any>(null);
  const botBusyRef = React.useRef(false);

  const current = players[turnIndex] ?? players[0];
  const w = winner(players);
  const aliveCount = players.filter((p) => !p.eliminated).length;
  const totalCount = players.length;
  const isBotTurn = !!current?.isBot;

  const inputDisabledBase = finished || !!w || !current || current.eliminated;
  const waitingValidate = !inputDisabledBase && !isBotTurn && dartsLeft === 0;

  function pushLog(line: string) {
    setLog((prev) => [line, ...prev].slice(0, 120));
  }

  function snapshot() {
    const snap: Snapshot = {
      players: players.map((p) => ({
        ...p,
        hitsBySegment: { ...p.hitsBySegment },
        hitsByNumber: { ...p.hitsByNumber },
        lastVisit: (p.lastVisit || []).map((t) => ({ ...t })),
      })),
      turnIndex,
      dartsLeft,
      visit: visit.map((t) => ({ ...t })),
      log: log.slice(),
      finished,
      elimOrder: (elimOrderRef.current || []).slice(),
      multiplier,
    };
    undoRef.current = [snap, ...undoRef.current].slice(0, 60);
  }

  function undo() {
    const s = undoRef.current[0];
    if (!s) return;

    undoRef.current = undoRef.current.slice(1);

    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
    botBusyRef.current = false;

    setPlayers(s.players);
    setTurnIndex(s.turnIndex);
    setDartsLeft(s.dartsLeft);
    setVisit(s.visit);
    setLog(s.log);
    setFinished(s.finished);
    setMultiplier((s.multiplier || 1) as Mult);

    finishedRef.current = !!s.finished;
    elimOrderRef.current = (s.elimOrder || []).slice();
  }

  function endTurn(nextPlayers?: KillerPlayerState[]) {
    const base = nextPlayers || players;

    // ✅ mémorise la dernière volée du joueur courant (liste joueurs)
    setPlayers((prev) => {
      const next = prev.map((p, i) => {
        if (i !== turnIndex) return p;
        return { ...p, lastVisit: (visit || []).slice(0, 3).map((t) => ({ ...t })) };
      });
      return next;
    });

    setVisit([]);
    setDartsLeft(3);
    setMultiplier(1);
    setTurnIndex((prev) => nextAliveIndex(base, prev));
  }

  function computeFinalRanks(finalPlayers: KillerPlayerState[], winnerId: string, elim: string[]) {
    const n = finalPlayers.length;
    const rankById: Record<string, number> = {};

    let rank = n;
    for (const pid of elim || []) {
      if (!pid) continue;
      if (rankById[pid] == null) {
        rankById[pid] = rank;
        rank -= 1;
      }
    }

    rankById[winnerId] = 1;

    let nextRank = 2;
    const alive = finalPlayers.filter((p) => !p.eliminated).map((p) => p.id);
    for (const pid of alive) {
      if (pid === winnerId) continue;
      if (rankById[pid] == null) rankById[pid] = nextRank++;
    }

    for (const p of finalPlayers) {
      if (rankById[p.id] == null) rankById[p.id] = Math.max(2, n);
    }

    return rankById;
  }

  function buildMatchRecord(finalPlayersRaw: KillerPlayerState[], winnerId: string, elim: string[]) {
    const finishedAt = Date.now();
    const rankById = computeFinalRanks(finalPlayersRaw, winnerId, elim);

    const finalPlayers = finalPlayersRaw.map((p) => {
      const eliminatedAt = p.eliminatedAt || (p.eliminated ? finishedAt : null);
      const survivalTimeMs = p.eliminated
        ? Math.max(0, (eliminatedAt || finishedAt) - startedAt)
        : Math.max(0, finishedAt - startedAt);

      return {
        ...p,
        finalRank: rankById[p.id] || 0,
        survivalTimeMs,
      };
    });

    const detailedByPlayer: Record<string, any> = {};
    for (const p of finalPlayers) {
      detailedByPlayer[p.id] = {
        playerId: p.id,
        profileId: p.id,
        id: p.id,
        name: p.name,
        avatarDataUrl: p.avatarDataUrl ?? null,
        isBot: !!p.isBot,
        botLevel: p.botLevel ?? "",
        number: p.number,
        eliminated: !!p.eliminated,
        isKiller: !!p.isKiller,
        kills: p.kills,
        hitsOnSelf: p.hitsOnSelf,
        totalThrows: p.totalThrows,
        killerThrows: p.killerThrows,
        offensiveThrows: p.offensiveThrows,
        killerHits: p.killerHits,
        uselessHits: p.uselessHits,
        livesTaken: p.livesTaken,
        livesLost: p.livesLost,
        throwsToBecomeKiller: p.becameAtThrow ? p.becameAtThrow : p.throwsToBecomeKiller,
        hitsBySegment: p.hitsBySegment || {},
        hitsByNumber: p.hitsByNumber || {},
        finalRank: p.finalRank || 0,
        survivalTimeMs: p.survivalTimeMs || 0,
      };
    }

    const perPlayer = finalPlayers.map((p) => ({
      id: p.id,
      playerId: p.id,
      profileId: p.id,
      name: p.name,
      avatarDataUrl: p.avatarDataUrl ?? null,
      isBot: !!p.isBot,
      botLevel: p.botLevel ?? "",
      hitsBySegment: p.hitsBySegment || {},
      hitsByNumber: p.hitsByNumber || {},
      totalThrows: p.totalThrows,
      killerThrows: p.killerThrows,
      offensiveThrows: p.offensiveThrows,
      killerHits: p.killerHits,
      uselessHits: p.uselessHits,
      livesTaken: p.livesTaken,
      livesLost: p.livesLost,
      kills: p.kills,
      finalRank: p.finalRank || 0,
      survivalTimeMs: p.survivalTimeMs || 0,
    }));

    const rec: any = {
      kind: "killer",
      createdAt: startedAt,
      updatedAt: finishedAt,
      winnerId,
      players: finalPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        avatarDataUrl: p.avatarDataUrl ?? null,
        isBot: !!p.isBot,
        botLevel: p.botLevel ?? "",
      })),
      summary: {
        mode: "killer",
        livesStart: config.lives,
        becomeRule: config.becomeRule,
        damageRule: config.damageRule,
        detailedByPlayer,
        perPlayer,
      },
      payload: {
        mode: "killer",
        config,
        summary: { mode: "killer", detailedByPlayer, perPlayer },
      },
    };

    return rec as MatchRecord;
  }

  function applyThrow(t: ThrowInput) {
    if (inputDisabledBase) return;
    if (dartsLeft <= 0) return;
    if (isBotTurn) return;

    snapshot();
    setMultiplier(1); // ✅ reset Double/Triple après un lancer

    const thr: ThrowInput = {
      target: clampInt(t.target, 0, 25, 0),
      mult: clampInt(t.mult, 1, 3, 1) as Mult,
    };

    setVisit((v) => [...v, thr].slice(0, 3));
    setDartsLeft((d) => Math.max(0, d - 1));

    setPlayers((prev) => {
      const next = prev.map((p) => ({
        ...p,
        hitsBySegment: { ...(p.hitsBySegment || {}) },
        hitsByNumber: { ...(p.hitsByNumber || {}) },
      }));

      const me = next[turnIndex];
      if (!me || me.eliminated) return prev;

      me.totalThrows += 1;

      const seg = segmentKey(thr);
      me.hitsBySegment = incMap(me.hitsBySegment, seg, 1);
      if (thr.target !== 0) me.hitsByNumber = incMap(me.hitsByNumber, thr.target, 1);

      if (!me.isKiller && !me.becameAtThrow) me.throwsToBecomeKiller += 1;
      if (me.isKiller) me.killerThrows += 1;

      if (thr.target === 0) {
        me.uselessHits += 1;
        pushLog(`🎯 ${me.name} : MISS`);
        return next;
      }

      if (thr.target === 25) {
        me.uselessHits += 1;
        pushLog(`🎯 ${me.name} : ${fmtThrow(thr)}`);
        return next;
      }

      if (!me.isKiller && thr.target === me.number && canBecomeKiller(config.becomeRule, thr)) {
        me.isKiller = true;
        me.hitsOnSelf += 1;
        if (!me.becameAtThrow) me.becameAtThrow = me.throwsToBecomeKiller;
        pushLog(`🟡 ${me.name} devient KILLER en touchant ${fmtThrow(thr)} (#${thr.target})`);
        return next;
      }

      if (me.isKiller) {
        const victimIdx = next.findIndex((p, idx) => idx !== turnIndex && !p.eliminated && p.number === thr.target);
        if (victimIdx >= 0) {
          const victim = next[victimIdx];

          me.offensiveThrows += 1;

          const dmg = dmgFrom(thr.mult, config.damageRule);
          const before = victim.lives;
          victim.lives = Math.max(0, victim.lives - dmg);

          const actualLoss = Math.max(0, before - victim.lives);
          if (actualLoss > 0) {
            me.killerHits += 1;
            me.livesTaken += actualLoss;
            victim.livesLost += actualLoss;
          }

          if (victim.lives <= 0) {
            victim.eliminated = true;
            victim.eliminatedAt = Date.now();
            me.kills += 1;

            elimOrderRef.current = [...(elimOrderRef.current || []), victim.id];
            pushLog(`💀 ${me.name} élimine ${victim.name} (${fmtThrow(thr)} sur #${thr.target}, -${dmg})`);
          } else {
            pushLog(`🔻 ${me.name} touche ${victim.name} (${fmtThrow(thr)} sur #${thr.target}, -${dmg}) → ${victim.lives} vie(s)`);
          }

          return next;
        }
      }

      me.uselessHits += 1;
      pushLog(`🎯 ${me.name} : ${fmtThrow(thr)}`);
      return next;
    });
  }

  React.useEffect(() => {
    const ww = winner(players);
    if (ww && !finishedRef.current) {
      finishedRef.current = true;
      setFinished(true);
      pushLog(`🏆 ${ww.name} gagne !`);
      const rec = buildMatchRecord(players, ww.id, elimOrderRef.current || []);
      onFinish(rec);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  React.useEffect(() => {
    if (!players.length) return;
    if (!current || current.eliminated) setTurnIndex((prev) => nextAliveIndex(players, prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  React.useEffect(() => {
    function onExternal(ev: any) {
      const d = ev?.detail || {};
      const target = clampInt(d.target, 0, 25, 0);
      const mult = clampInt(d.mult, 1, 3, 1) as Mult;
      if (dartsLeft <= 0) return;
      if (isBotTurn) return;
      applyThrow({ target, mult });
    }
    window.addEventListener("dc:throw", onExternal as any);
    return () => window.removeEventListener("dc:throw", onExternal as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnIndex, dartsLeft, finished, isBotTurn, inputDisabledBase]);

  // BOT AUTOPLAY (3 flèches puis VALIDER auto)
  React.useEffect(() => {
    if (!players.length) return;
    if (finishedRef.current) return;
    if (finished) return;
    if (winner(players)) return;

    const me = players[turnIndex];
    if (!me || me.eliminated) return;
    if (!me.isBot) return;

    if (dartsLeft <= 0) {
      if (botBusyRef.current) return;
      botBusyRef.current = true;
      botTimerRef.current = setTimeout(() => {
        botTimerRef.current = null;
        if (finishedRef.current || finished) {
          botBusyRef.current = false;
          return;
        }
        endTurn(players);
        botBusyRef.current = false;
      }, 380);

      return () => {
        if (botTimerRef.current) {
          clearTimeout(botTimerRef.current);
          botTimerRef.current = null;
        }
        botBusyRef.current = false;
      };
    }

    if (botBusyRef.current) return;
    botBusyRef.current = true;

    const delay = 380 + Math.floor(Math.random() * 420);
    botTimerRef.current = setTimeout(() => {
      botTimerRef.current = null;
      if (finishedRef.current || finished) {
        botBusyRef.current = false;
        return;
      }

      const nowMe = players[turnIndex];
      if (!nowMe || nowMe.eliminated || !nowMe.isBot) {
        botBusyRef.current = false;
        return;
      }

      snapshot();

      const thr = decideBotThrow(nowMe, players, config);
      const thrSafe: ThrowInput = {
        target: clampInt(thr.target, 0, 25, 0),
        mult: clampInt(thr.mult, 1, 3, 1) as Mult,
      };

      setVisit((v) => [...v, thrSafe].slice(0, 3));
      setDartsLeft((d) => Math.max(0, d - 1));

      setPlayers((prev) => {
        const next = prev.map((p) => ({
          ...p,
          hitsBySegment: { ...(p.hitsBySegment || {}) },
          hitsByNumber: { ...(p.hitsByNumber || {}) },
        }));

        const me2 = next[turnIndex];
        if (!me2 || me2.eliminated) return prev;

        me2.totalThrows += 1;

        const seg = segmentKey(thrSafe);
        me2.hitsBySegment = incMap(me2.hitsBySegment, seg, 1);
        if (thrSafe.target !== 0) me2.hitsByNumber = incMap(me2.hitsByNumber, thrSafe.target, 1);

        if (!me2.isKiller && !me2.becameAtThrow) me2.throwsToBecomeKiller += 1;
        if (me2.isKiller) me2.killerThrows += 1;

        if (thrSafe.target === 0) {
          me2.uselessHits += 1;
          pushLog(`🎯 ${me2.name} : MISS`);
          return next;
        }

        if (thrSafe.target === 25) {
          me2.uselessHits += 1;
          pushLog(`🎯 ${me2.name} : ${fmtThrow(thrSafe)}`);
          return next;
        }

        if (!me2.isKiller && thrSafe.target === me2.number && canBecomeKiller(config.becomeRule, thrSafe)) {
          me2.isKiller = true;
          me2.hitsOnSelf += 1;
          if (!me2.becameAtThrow) me2.becameAtThrow = me2.throwsToBecomeKiller;
          pushLog(`🟡 ${me2.name} devient KILLER en touchant ${fmtThrow(thrSafe)} (#${thrSafe.target})`);
          return next;
        }

        if (me2.isKiller) {
          const victimIdx = next.findIndex((p, idx) => idx !== turnIndex && !p.eliminated && p.number === thrSafe.target);
          if (victimIdx >= 0) {
            const victim = next[victimIdx];

            me2.offensiveThrows += 1;

            const dmg = dmgFrom(thrSafe.mult, config.damageRule);
            const before = victim.lives;
            victim.lives = Math.max(0, victim.lives - dmg);

            const actualLoss = Math.max(0, before - victim.lives);
            if (actualLoss > 0) {
              me2.killerHits += 1;
              me2.livesTaken += actualLoss;
              victim.livesLost += actualLoss;
            }

            if (victim.lives <= 0) {
              victim.eliminated = true;
              victim.eliminatedAt = Date.now();
              me2.kills += 1;

              elimOrderRef.current = [...(elimOrderRef.current || []), victim.id];
              pushLog(`💀 ${me2.name} élimine ${victim.name} (${fmtThrow(thrSafe)} sur #${thrSafe.target}, -${dmg})`);
            } else {
              pushLog(`🔻 ${me2.name} touche ${victim.name} (${fmtThrow(thrSafe)} sur #${thrSafe.target}, -${dmg}) → ${victim.lives} vie(s)`);
            }

            return next;
          }
        }

        me2.uselessHits += 1;
        pushLog(`🎯 ${me2.name} : ${fmtThrow(thrSafe)}`);
        return next;
      });

      botBusyRef.current = false;
    }, delay);

    return () => {
      if (botTimerRef.current) {
        clearTimeout(botTimerRef.current);
        botTimerRef.current = null;
      }
      botBusyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnIndex, dartsLeft, finished, players]);

  if (!config || !config.players || config.players.length < 2) {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => go("killer_config")}>← Retour</button>
        <p>Configuration KILLER invalide.</p>
      </div>
    );
  }

  const currentThrow = toKeypadThrow(visit);
  const canValidateTurn = !inputDisabledBase && !isBotTurn && (visit.length > 0 || dartsLeft === 0);

  function handleValidate() {
    if (inputDisabledBase) return;
    if (isBotTurn) return;
    if (!canValidateTurn) return;
    endTurn(players);
  }

  const RULES = rulesText(config);

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        background: pageBg,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        padding: "10px 12px 92px",
      }}
    >
      {/* RULES POPIN */}
      {showRules && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowRules(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.55)",
            zIndex: 9999,
            padding: 14,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              ...card,
              padding: 14,
              marginTop: 70,
              border: "1px solid rgba(255,198,58,.25)",
              boxShadow: "0 18px 55px rgba(0,0,0,.6)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 1000, letterSpacing: 1.2, color: gold, textTransform: "uppercase" }}>
                Règles KILLER
              </div>
              <button
                type="button"
                onClick={() => setShowRules(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.10)",
                  background: "rgba(255,255,255,.06)",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
                aria-label="Fermer"
                title="Fermer"
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {RULES.map((r, idx) => (
                <div
                  key={idx}
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,.08)",
                    background: "rgba(0,0,0,.25)",
                    padding: 10,
                  }}
                >
                  <div style={{ fontWeight: 950, fontSize: 12, color: "#ffe7b0", textTransform: "uppercase" }}>
                    {r.title}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.9, lineHeight: 1.35 }}>{r.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div
        style={{
          ...card,
          padding: 10,
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: 10,
          flex: "0 0 auto",
        }}
      >
        <button
          type="button"
          onClick={() => go("killer_config")}
          style={{
            height: 34,
            padding: "0 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,180,0,.30)",
            background: `linear-gradient(180deg, ${gold}, ${gold2})`,
            color: "#1a1a1a",
            fontWeight: 1000,
            cursor: "pointer",
            boxShadow: "0 10px 22px rgba(255,170,0,.18)",
            whiteSpace: "nowrap",
          }}
        >
          ← Quitter
        </button>

        <div style={{ textAlign: "center", lineHeight: 1 }}>
          <span
            style={{
              display: "inline-block",
              color: gold,
              fontWeight: 1000,
              textTransform: "uppercase",
              letterSpacing: 1.6,
              textShadow: "0 0 14px rgba(255,198,58,.25)",
              filter: "drop-shadow(0 0 10px rgba(255,198,58,.15))",
              animation: "killerGlowPulse 1.6s ease-in-out infinite",
            }}
          >
            KILLER
          </span>
          <style>{`
            @keyframes killerGlowPulse {
              0%   { text-shadow: 0 0 10px rgba(255,198,58,.20); }
              50%  { text-shadow: 0 0 18px rgba(255,198,58,.35); }
              100% { text-shadow: 0 0 10px rgba(255,198,58,.20); }
            }
          `}</style>
        </div>

        {/* ✅ “i” à l’extrême droite (InfoDot style Games) */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <InfoDot onClick={() => setShowRules(true)} size={30} color="#FFFFFF" glow="rgba(255,198,58,.45)" />
        </div>
      </div>

      {/* ACTIVE PLAYER */}
      <div style={{ marginTop: 10, ...card, padding: 12, flex: "0 0 auto", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "92px 1fr 104px", gap: 10, alignItems: "center" }}>
          {/* ✅ Médaillon SANS halo */}
          <div style={{ display: "grid", justifyItems: "center", gap: 8 }}>
            <AvatarMedallion size={84} src={current?.avatarDataUrl} name={current?.name} />
            <div
              style={{
                fontSize: 14,
                fontWeight: 1000,
                color: gold,
                letterSpacing: 1,
                textTransform: "uppercase",
                textAlign: "center",
                width: 92,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={current?.name}
            >
              {current?.name ?? "—"}
            </div>
          </div>

          {/* mini bloc KPI central */}
          <div
            style={{
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,.08)",
              background: "rgba(0,0,0,.28)",
              padding: 10,
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Darts</div>
              <div style={{ fontSize: 13, fontWeight: 1000 }}>{dartsLeft}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Lancers</div>
              <div style={{ fontSize: 13, fontWeight: 1000 }}>{current?.totalThrows ?? 0}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Dégâts</div>
              <div style={{ fontSize: 13, fontWeight: 1000 }}>{current?.livesTaken ?? 0}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Kills</div>
              <div style={{ fontSize: 13, fontWeight: 1000 }}>{current?.kills ?? 0}</div>
            </div>
          </div>

          {/* ✅ colonne droite compactée et alignée */}
          <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
            <div
              style={{
                width: 96,
                textAlign: "center",
                fontWeight: 1000,
                fontSize: 22,
                color: gold,
                letterSpacing: 0.8,
                textShadow: "0 0 14px rgba(255,198,58,.18)",
                marginBottom: -2,
              }}
            >
              #{current?.number ?? "?"}
              {current?.isKiller && <span style={{ marginLeft: 6, fontSize: 18 }}>🔥</span>}
              {current?.isBot && <span style={{ marginLeft: 6, fontSize: 16, opacity: 0.9 }}>🤖</span>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: 96 }}>
              {/* VIES */}
              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,198,58,.20)",
                  background: "rgba(255,198,58,.08)",
                  padding: "8px 6px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 9, opacity: 0.85, fontWeight: 900, letterSpacing: 0.8 }}>VIES</div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 1000,
                    color: gold,
                    fontFamily: "Baloo 2, Comic Sans MS, system-ui",
                    lineHeight: 1.0,
                  }}
                >
                  {current?.lives ?? 0}
                </div>
              </div>

              {/* SURVIVANTS */}
              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,.10)",
                  background: "rgba(0,0,0,.30)",
                  padding: "8px 6px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 9, opacity: 0.85, fontWeight: 900, letterSpacing: 0.8 }}>SURV.</div>
                <div style={{ fontSize: 12, fontWeight: 1000, color: "#ffe7b0", lineHeight: 1.0 }}>
                  {aliveCount}/{totalCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ UN SEUL message, dans un petit bloc flottant */}
        {(waitingValidate || isBotTurn) && !finished && !w && (
          <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
            <div
              style={{
                borderRadius: 999,
                padding: "8px 12px",
                background: "rgba(0,0,0,.35)",
                border: "1px solid rgba(255,198,58,.18)",
                boxShadow: "0 12px 35px rgba(0,0,0,.35)",
                fontSize: 12,
                fontWeight: 900,
                color: "#ffe7b0",
                textAlign: "center",
              }}
            >
              {isBotTurn ? "🤖 Le bot joue…" : "Appuie sur VALIDER pour passer au joueur suivant"}
            </div>
          </div>
        )}
      </div>

      {/* ✅ ZONE SCROLLABLE : LISTE JOUEURS UNIQUEMENT */}
      <div
        style={{
          marginTop: 10,
          flex: "1 1 auto",
          minHeight: 0,
          overflow: "auto",
          paddingRight: 2,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ display: "grid", gap: 10 }}>
          {players.map((p, idx) => {
            const isMe = idx === turnIndex;
            const last = (p.lastVisit || []).slice(0, 3);
            const lastDarts = toKeypadThrow(last as any);

            return (
              <div
                key={p.id}
                style={{
                  ...card,
                  padding: 10,
                  opacity: p.eliminated ? 0.55 : 1,
                  border: isMe ? "1px solid rgba(255,198,58,.35)" : "1px solid rgba(255,255,255,.08)",
                  background: isMe
                    ? "radial-gradient(circle at 0% 0%, rgba(255,198,58,.18), rgba(12,12,14,.95) 65%)"
                    : "linear-gradient(180deg, rgba(22,22,23,.78), rgba(12,12,14,.95))",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {/* ✅ avatar sans fond blanc/halo */}
                <AvatarMedallion size={44} src={p.avatarDataUrl} name={p.name} />

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ fontWeight: 1000, minWidth: 0 }}>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.name} <span style={{ fontSize: 12, opacity: 0.8 }}>#{p.number}</span>
                      </span>
                      {p.isKiller && <span style={{ marginLeft: 6 }}>🔥</span>}
                      {p.eliminated && <span style={{ marginLeft: 6 }}>💀</span>}
                      {p.isBot && (
                        <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.85, whiteSpace: "nowrap" }}>
                          🤖{p.botLevel ? ` ${p.botLevel}` : ""}
                        </span>
                      )}
                    </div>

                    {/* ✅ dernière volée (chips MINI) */}
                    <div style={{ display: "flex", gap: 4, flex: "0 0 auto", transform: "scale(.92)", transformOrigin: "right center" }}>
                      <span style={chipStyleMini(lastDarts[0])}>{fmtChip(lastDarts[0])}</span>
                      <span style={chipStyleMini(lastDarts[1])}>{fmtChip(lastDarts[1])}</span>
                      <span style={chipStyleMini(lastDarts[2])}>{fmtChip(lastDarts[2])}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.78, marginTop: 4 }}>
                    kills: {p.kills} · dmg: {p.livesTaken} · lancers: {p.totalThrows}
                  </div>
                </div>

                <div
                  style={{
                    minWidth: 54,
                    textAlign: "center",
                    fontWeight: 1000,
                    borderRadius: 14,
                    padding: "8px 10px",
                    background: "rgba(0,0,0,.45)",
                    border: "1px solid rgba(255,255,255,.08)",
                    color: p.eliminated ? "#aaa" : gold,
                  }}
                >
                  {p.eliminated ? "OUT" : `${p.lives} ♥`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHIPS VOLÉE (au-dessus du Keypad) — ✅ RESTENT GROS */}
      {!w && !finished && !isBotTurn && (
        <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 10, flex: "0 0 auto" }}>
          <span style={chipStyleBig(currentThrow[0])}>{fmtChip(currentThrow[0])}</span>
          <span style={chipStyleBig(currentThrow[1])}>{fmtChip(currentThrow[1])}</span>
          <span style={chipStyleBig(currentThrow[2])}>{fmtChip(currentThrow[2])}</span>
        </div>
      )}

      {/* KEYPAD (toujours visible) */}
      {!w && !finished && !isBotTurn && (
        <div style={{ marginTop: 10, flex: "0 0 auto" }}>
          <Keypad
            currentThrow={currentThrow}
            multiplier={multiplier}
            onSimple={() => setMultiplier(1)}
            onDouble={() => setMultiplier(2)}
            onTriple={() => setMultiplier(3)}
            onBackspace={() => {}}
            onCancel={undo} // ✅ ANNULER = undo réel
            onNumber={(n: number) => applyThrow({ target: n, mult: multiplier })}
            onBull={() => {
              const m: Mult = multiplier === 2 ? 2 : 1;
              applyThrow({ target: 25, mult: m });
            }}
            onValidate={handleValidate}
            hidePreview={true}
          />
        </div>
      )}
    </div>
  );
}
