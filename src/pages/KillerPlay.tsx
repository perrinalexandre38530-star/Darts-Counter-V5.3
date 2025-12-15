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
// ✅ NEW: logo KILLER (PNG transparent) remplace 🔥 partout
// ✅ NEW: logo DEAD (rouge, sans halo) + ligne DEAD en rouge
// ✅ FIX: fin de partie -> overlay victoire + classement + bouton Terminer
// ============================================

import React from "react";
import type { Store, MatchRecord, Dart as UIDart } from "../lib/types";
import type { KillerConfig, KillerDamageRule, KillerBecomeRule } from "./KillerConfig";
import Keypad from "../components/Keypad";
import InfoDot from "../components/InfoDot";

import killerActiveIcon from "../assets/icons/killer-active.png";
import killerListIcon from "../assets/icons/killer-list.png";
import deadActiveIcon from "../assets/icons/dead-active.png";
import deadListIcon from "../assets/icons/dead-list.png";

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

  // UI: dernière volée jouée (affichage liste joueurs)
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

// chips BIG
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

// chips MINI
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
    { title: "But", body: "Tu as un numéro (#1…#20). D’abord tu dois devenir KILLER, puis éliminer les autres en touchant leur numéro." },
    { title: "Départ", body: `Chaque joueur commence avec ${lives} vie(s). Un joueur est éliminé quand ses vies tombent à 0.` },
    { title: "Devenir KILLER", body: `${becomeRuleText}\nImportant : toucher un autre numéro que le tien ne te rend pas KILLER.` },
    { title: "Attaquer (quand tu es KILLER)", body: `${damageText}\nSi tu réduis un joueur à 0 vie → il est DEAD immédiatement.` },
    { title: "Ce qui ne fait rien", body: "MISS (0) : aucun effet.\nBULL / DBULL : aucun effet.\nToucher un joueur déjà DEAD : aucun effet." },
    { title: "Tour de jeu", body: "À ton tour : 3 fléchettes.\nPuis VALIDER pour passer au joueur suivant." },
    { title: "Fin de partie", body: "La partie se termine quand il ne reste plus qu’un seul joueur vivant : il gagne 🏆" },
  ];
}

function AvatarMedallion({ size, src, name }: { size: number; src?: string | null; name?: string }) {
  const initials = String(name || "J").trim().slice(0, 1).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", background: "transparent" }}>
      {src ? (
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
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

function KillerIcon({ size = 26, variant = "active" }: { size?: number; variant?: "active" | "list" }) {
  const src = variant === "list" ? killerListIcon : killerActiveIcon;
  return (
    <img
      src={src}
      alt="Killer"
      style={{ width: size, height: size, marginLeft: 6, display: "inline-block", verticalAlign: "middle", objectFit: "contain", filter: "contrast(1.1) brightness(1.05)" }}
    />
  );
}

function DeadIcon({ size = 18, variant = "list" }: { size?: number; variant?: "active" | "list" }) {
  const src = variant === "active" ? deadActiveIcon : deadListIcon;
  return (
    <img
      src={src}
      alt="Dead"
      style={{ width: size, height: size, marginLeft: 6, display: "inline-block", verticalAlign: "middle", objectFit: "contain", filter: "contrast(1.15) brightness(1.05)" }}
    />
  );
}

function StatRow({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
      <div style={{ fontSize: 11, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 1000 }}>{value}</div>
    </div>
  );
}

function StatBox({ label, value, small }: { label: string; value: any; small?: boolean }) {
  return (
    <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.10)", background: "rgba(0,0,0,.30)", padding: "8px 6px", textAlign: "center" }}>
      <div style={{ fontSize: 9, opacity: 0.85, fontWeight: 900, letterSpacing: 0.8 }}>{label}</div>
      <div style={{ fontSize: small ? 12 : 22, fontWeight: 1000, color: "#ffe7b0", lineHeight: 1.0 }}>{value}</div>
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

  // ✅ écran de fin local
  const [endRec, setEndRec] = React.useState<any>(null);
  const [showEnd, setShowEnd] = React.useState(false);

  const undoRef = React.useRef<Snapshot[]>([]);
  const botTimerRef = React.useRef<any>(null);
  const botBusyRef = React.useRef(false);

  const current = players[turnIndex] ?? players[0];
  const w = winner(players);
  const aliveCount = players.filter((p) => !p.eliminated).length;
  const totalCount = players.length;
  const isBotTurn = !!current?.isBot;

  const inputDisabledBase = finished || !!w || !current || current.eliminated || showEnd;
  const waitingValidate = !inputDisabledBase && !isBotTurn && dartsLeft === 0;

  function pushLog(line: string) {
    setLog((prev) => [line, ...prev].slice(0, 120));
  }

  function snapshot() {
    const snap: Snapshot = {
      players: players.map((p) => ({
        ...p,
        hitsBySegment: { ...(p.hitsBySegment || {}) },
        hitsByNumber: { ...(p.hitsByNumber || {}) },
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

    // mémorise la dernière volée du joueur courant
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

    for (const p of finalPlayers) {
      if (rankById[p.id] == null) rankById[p.id] = Math.max(2, n);
    }
    return rankById;
  }

  function buildMatchRecord(finalPlayersRaw: KillerPlayerState[], winnerId: string, elim: string[]) {
    const finishedAt = Date.now();
    const rankById = computeFinalRanks(finalPlayersRaw, winnerId, elim);

    const detailedByPlayer: Record<string, any> = {};
    for (const p of finalPlayersRaw) {
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
        finalRank: rankById[p.id] || 0,
      };
    }

    const perPlayer = finalPlayersRaw.map((p) => ({
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
      finalRank: rankById[p.id] || 0,
    }));

    const rec: any = {
      kind: "killer",
      createdAt: startedAt,
      updatedAt: finishedAt,
      winnerId,
      players: finalPlayersRaw.map((p) => ({
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
      payload: { mode: "killer", config, summary: { mode: "killer", detailedByPlayer, perPlayer } },
    };

    return rec as MatchRecord;
  }

  function applyThrow(t: ThrowInput) {
    if (inputDisabledBase) return;
    if (dartsLeft <= 0) return;
    if (isBotTurn) return;

    snapshot();
    setMultiplier(1); // reset double/triple après un lancer

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

  // ✅ Fin de partie : overlay (PAS de onFinish direct)
  React.useEffect(() => {
    const ww = winner(players);
    if (ww && !finishedRef.current) {
      finishedRef.current = true;
      setFinished(true);
      pushLog(`🏆 ${ww.name} gagne !`);

      let rec: any = null;
      try {
        rec = buildMatchRecord(players, ww.id, elimOrderRef.current || []);
      } catch (e) {
        rec = null;
      }

      setEndRec(rec);
      setShowEnd(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  // BOT AUTOPLAY (3 flèches puis VALIDER)
  React.useEffect(() => {
    if (!players.length) return;
    if (finishedRef.current || finished) return;
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
      }, 360);

      return () => {
        if (botTimerRef.current) clearTimeout(botTimerRef.current);
        botTimerRef.current = null;
        botBusyRef.current = false;
      };
    }

    if (botBusyRef.current) return;
    botBusyRef.current = true;

    const delay = 360 + Math.floor(Math.random() * 420);
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
      setMultiplier(1);

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
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
      botBusyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnIndex, dartsLeft, finished, players]);

  // keep turnIndex safe
  React.useEffect(() => {
    if (!players.length) return;
    const me = players[turnIndex];
    if (!me || me.eliminated) setTurnIndex((prev) => nextAliveIndex(players, prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  if (!config || !config.players || config.players.length < 2) {
    return (
      <div style={{ padding: 16, color: "#fff" }}>
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
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.9, lineHeight: 1.35, whiteSpace: "pre-line" }}>
                    {r.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ✅ END OVERLAY (FIN DE PARTIE) */}
      {showEnd && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.72)",
            zIndex: 10000,
            padding: 14,
            display: "flex",
            alignItems: "center",
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
              border: "1px solid rgba(255,198,58,.22)",
              boxShadow: "0 18px 65px rgba(0,0,0,.65)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 1000, letterSpacing: 1.6, textTransform: "uppercase", color: gold, opacity: 0.95 }}>
                FIN DE PARTIE
              </div>

              <div style={{ marginTop: 6, fontSize: 20, fontWeight: 1000, color: "#fff" }}>
                🏆 {(winner(players)?.name || "—")} gagne !
              </div>

              <div style={{ marginTop: 10, height: 6, borderRadius: 999, background: "rgba(255,198,58,.14)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: "100%",
                    transformOrigin: "left center",
                    animation: "killerEndBar 900ms ease-out forwards",
                    background: `linear-gradient(90deg, ${gold2}, ${gold})`,
                  }}
                />
              </div>

              <style>{`
                @keyframes killerEndBar {
                  from { transform: scaleX(0); opacity: .2; }
                  to   { transform: scaleX(1); opacity: 1; }
                }
              `}</style>
            </div>

            {/* CLASSEMENT */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 1000, color: "#ffe7b0", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2 }}>
                Classement
              </div>

              <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                {(() => {
                  const recPlayers = (endRec?.summary?.perPlayer || endRec?.payload?.summary?.perPlayer || null) as any[] | null;

                  let rows: any[] = [];
                  if (recPlayers && Array.isArray(recPlayers) && recPlayers.length) {
                    rows = [...recPlayers]
                      .map((p) => ({
                        id: p.id || p.playerId,
                        name: p.name || "Joueur",
                        avatarDataUrl: p.avatarDataUrl,
                        rank: Number(p.finalRank) || 999,
                        kills: Number(p.kills) || 0,
                        taken: Number(p.livesTaken) || 0,
                      }))
                      .sort((a, b) => a.rank - b.rank);
                  } else {
                    // fallback sans record
                    const ww = winner(players);
                    const elim = (elimOrderRef.current || []).slice();
                    const rankById: Record<string, number> = {};
                    let r = players.length;
                    for (const id of elim) if (rankById[id] == null) rankById[id] = r--;
                    if (ww?.id) rankById[ww.id] = 1;

                    rows = players
                      .map((p) => ({
                        id: p.id,
                        name: p.name,
                        avatarDataUrl: p.avatarDataUrl,
                        rank: rankById[p.id] ?? 999,
                        kills: p.kills || 0,
                        taken: p.livesTaken || 0,
                      }))
                      .sort((a, b) => a.rank - b.rank);
                  }

                  return rows.map((p, i) => (
                    <div
                      key={p.id || i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "34px 1fr auto",
                        gap: 10,
                        alignItems: "center",
                        padding: "8px 10px",
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,.08)",
                        background: i === 0 ? "rgba(255,198,58,.10)" : "rgba(0,0,0,.22)",
                      }}
                    >
                      <div style={{ fontWeight: 1000, color: i === 0 ? gold : "#fff", textAlign: "center" }}>{i + 1}</div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <AvatarMedallion size={28} src={p.avatarDataUrl} name={p.name} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                          <div style={{ fontSize: 11, opacity: 0.78 }}>kills {p.kills} · dmg {p.taken}</div>
                        </div>
                      </div>

                      <div style={{ fontWeight: 1000, color: i === 0 ? gold : "#ffe7b0" }}>{i === 0 ? "WIN" : ""}</div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* ACTIONS */}
            <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  setShowEnd(false);
                  if (endRec) onFinish(endRec);
                  else go("history");
                }}
                style={{
                  height: 42,
                  padding: "0 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,180,0,.30)",
                  background: `linear-gradient(180deg, ${gold}, ${gold2})`,
                  color: "#1a1a1a",
                  fontWeight: 1000,
                  cursor: "pointer",
                  boxShadow: "0 10px 22px rgba(255,170,0,.18)",
                }}
              >
                Terminer
              </button>

              <button
                type="button"
                onClick={() => {
                  // plus tard: go("killer_summary", { rec: endRec })
                }}
                style={{
                  height: 42,
                  padding: "0 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,.12)",
                  background: "rgba(255,255,255,.06)",
                  color: "#fff",
                  fontWeight: 1000,
                  cursor: "pointer",
                }}
              >
                Voir résumé
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= HEADER ================= */}
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
          <span style={{ display: "inline-block", color: gold, fontWeight: 1000, textTransform: "uppercase", letterSpacing: 1.6, textShadow: "0 0 14px rgba(255,198,58,.25)" }}>
            KILLER
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <InfoDot onClick={() => setShowRules(true)} size={30} color="#FFFFFF" />
        </div>
      </div>

      {/* ================= ACTIVE PLAYER ================= */}
      <div style={{ marginTop: 10, ...card, padding: 12, flex: "0 0 auto", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "92px 1fr 104px", gap: 10, alignItems: "center" }}>
          <div style={{ display: "grid", justifyItems: "center", gap: 8 }}>
            <AvatarMedallion size={84} src={current?.avatarDataUrl} name={current?.name} />
            <div
              style={{
                fontSize: 14,
                fontWeight: 1000,
                color: gold,
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

          <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.28)", padding: 10, display: "grid", gap: 8 }}>
            <StatRow label="Darts" value={dartsLeft} />
            <StatRow label="Lancers" value={current?.totalThrows ?? 0} />
            <StatRow label="Dégâts" value={current?.livesTaken ?? 0} />
            <StatRow label="Kills" value={current?.kills ?? 0} />
          </div>

          <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
            <div style={{ width: 96, textAlign: "center", fontWeight: 1000, fontSize: 22, color: gold, letterSpacing: 0.8 }}>
              #{current?.number ?? "?"}
              {current?.isKiller && <KillerIcon size={46} variant="active" />}
              {current?.eliminated && <DeadIcon size={46} variant="active" />}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: 96 }}>
              <div style={{ borderRadius: 14, border: "1px solid rgba(255,198,58,.20)", background: "rgba(255,198,58,.08)", padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 9, opacity: 0.85, fontWeight: 900, letterSpacing: 0.8 }}>VIES</div>
                <div style={{ fontSize: 22, fontWeight: 1000, color: gold, lineHeight: 1.0 }}>{current?.lives ?? 0}</div>
              </div>

              <StatBox label="SURV." value={`${aliveCount}/${totalCount}`} small />
            </div>
          </div>
        </div>

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

      {/* ================= LISTE JOUEURS ================= */}
      <div style={{ marginTop: 10, flex: "1 1 auto", minHeight: 0, overflow: "auto", paddingRight: 2, WebkitOverflowScrolling: "touch" }}>
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
                  opacity: p.eliminated ? 0.92 : 1,
                  border: p.eliminated
                    ? "1px solid rgba(255,80,80,.55)"
                    : isMe
                    ? "1px solid rgba(255,198,58,.35)"
                    : "1px solid rgba(255,255,255,.08)",
                  background: p.eliminated
                    ? "linear-gradient(180deg, rgba(70,10,10,.90), rgba(16,8,10,.98))"
                    : isMe
                    ? "radial-gradient(circle at 0% 0%, rgba(255,198,58,.18), rgba(12,12,14,.95) 65%)"
                    : "linear-gradient(180deg, rgba(22,22,23,.78), rgba(12,12,14,.95))",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <AvatarMedallion size={44} src={p.avatarDataUrl} name={p.name} />

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ fontWeight: 1000, minWidth: 0 }}>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        <span style={{ color: p.eliminated ? "rgba(255,140,140,.95)" : "#fff" }}>{p.name}</span>{" "}
                        <span style={{ fontSize: 12, opacity: 0.8, color: p.eliminated ? "rgba(255,140,140,.85)" : "rgba(255,255,255,.8)" }}>
                          #{p.number}
                        </span>
                      </span>

                      {p.isKiller && !p.eliminated && <KillerIcon size={18} variant="list" />}
                      {p.eliminated && <DeadIcon size={18} variant="list" />}

                      {p.isBot && (
                        <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.85, whiteSpace: "nowrap" }}>
                          🤖{p.botLevel ? ` ${p.botLevel}` : ""}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 4, flex: "0 0 auto", transform: "scale(.92)", transformOrigin: "right center" }}>
                      <span style={chipStyleMini(lastDarts[0])}>{fmtChip(lastDarts[0])}</span>
                      <span style={chipStyleMini(lastDarts[1])}>{fmtChip(lastDarts[1])}</span>
                      <span style={chipStyleMini(lastDarts[2])}>{fmtChip(lastDarts[2])}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.78, marginTop: 4, color: p.eliminated ? "rgba(255,140,140,.85)" : "rgba(255,255,255,.78)" }}>
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
                    background: p.eliminated ? "rgba(255,80,80,.12)" : "rgba(0,0,0,.45)",
                    border: p.eliminated ? "1px solid rgba(255,80,80,.35)" : "1px solid rgba(255,255,255,.08)",
                    color: p.eliminated ? "rgba(255,140,140,.95)" : gold,
                  }}
                >
                  {p.eliminated ? "DEAD" : `${p.lives} ♥`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= CHIPS + KEYPAD ================= */}
      {!w && !finished && !isBotTurn && !showEnd && (
        <>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 10, flex: "0 0 auto" }}>
            <span style={chipStyleBig(currentThrow[0])}>{fmtChip(currentThrow[0])}</span>
            <span style={chipStyleBig(currentThrow[1])}>{fmtChip(currentThrow[1])}</span>
            <span style={chipStyleBig(currentThrow[2])}>{fmtChip(currentThrow[2])}</span>
          </div>

          <div style={{ marginTop: 10, flex: "0 0 auto" }}>
            <Keypad
              currentThrow={currentThrow}
              multiplier={multiplier}
              onSimple={() => setMultiplier(1)}
              onDouble={() => setMultiplier(2)}
              onTriple={() => setMultiplier(3)}
              onBackspace={() => {}}
              onCancel={undo}
              onNumber={(n: number) => applyThrow({ target: n, mult: multiplier })}
              onBull={() => {
                const m: Mult = multiplier === 2 ? 2 : 1;
                applyThrow({ target: 25, mult: m });
              }}
              onValidate={handleValidate}
              hidePreview={true}
            />
          </div>
        </>
      )}
    </div>
  );
}
