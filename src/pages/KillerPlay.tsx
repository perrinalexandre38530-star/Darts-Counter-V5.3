// @ts-nocheck
// ============================================
// src/pages/KillerPlay.tsx
// KILLER — PLAY (V1.3 + BOTS)
// ✅ MISS (0) + BULL (25 / DBULL)
// ✅ UNDO RÉEL (rollback état complet)
// ✅ Auto-fin de tour quand dartsLeft = 0
// ✅ Hook input externe (CustomEvent "dc:throw")
// ✅ NEW (Stats Killer enrichies - Option A étendue)
//    - totalThrows / killerThrows / offensiveThrows
//    - hitsBySegment (S20/T8/DBULL...) + hitsByNumber (1..20 + 25)
//    - livesTaken / livesLost
//    - killerHits / uselessHits
//    - throwsToBecomeKiller
//    - survivalTimeMs + finalRank (calcul fin de match)
// ✅ IMPORTANT : écrit summary.perPlayer + summary.detailedByPlayer (compat statsKiller.ts + leaderboards)
// ✅ NEW : BOTS autoplay (si player.isBot)
//    - utilise botLevel pour viser + mult
//    - stats/record incluent isBot/botLevel
// - Reçoit config depuis KillerConfig : routeParams.config
// - Tour par tour (3 fléchettes)
// - Devenir Killer en touchant SON numéro (règle single/double)
// - Quand Killer : toucher le numéro d’un autre joueur -> retire des vies
// - Élimination à 0 vie ; dernier vivant gagne
// - onFinish(matchRecord) => App.pushHistory()
// ============================================

import React from "react";
import type { Store, MatchRecord } from "../lib/types";
import type { KillerConfig, KillerDamageRule, KillerBecomeRule } from "./KillerConfig";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  config: KillerConfig;
  onFinish: (m: MatchRecord | any) => void;
};

type Mult = 1 | 2 | 3;

type ThrowInput = {
  target: number; // 0 = MISS, 1..20, 25 = BULL
  mult: Mult; // S=1 D=2 T=3 (sur bull on utilise surtout 1/2)
};

type KillerPlayerState = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;

  // ✅ bots
  isBot?: boolean;
  botLevel?: string;

  number: number; // 1..20
  lives: number; // >=0
  isKiller: boolean;
  eliminated: boolean;
  kills: number;
  hitsOnSelf: number;

  // ✅ NEW stats
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

  // ✅ Option A maps (utilisées par statsKiller + leaderboards)
  hitsBySegment: Record<string, number>;
  hitsByNumber: Record<string, number>;
};

type Snapshot = {
  players: KillerPlayerState[];
  turnIndex: number;
  dartsLeft: number;
  visit: ThrowInput[];
  log: string[];
  finished: boolean;
  elimOrder: string[];
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
  const v = String(botLevelRaw || "")
    .toLowerCase()
    .trim();

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

// distribution mult selon skill
function pickMultForBot(skill: number, becomeRule: KillerBecomeRule, wantsDouble: boolean): Mult {
  // skill 1 => surtout S
  // skill 5 => plus de D/T
  const r = rand01();

  if (wantsDouble) {
    // pour devenir killer en règle "double", on force + de D
    if (skill >= 4) return r < 0.78 ? 2 : r < 0.90 ? 3 : 1;
    if (skill === 3) return r < 0.65 ? 2 : r < 0.78 ? 1 : 3;
    if (skill === 2) return r < 0.55 ? 2 : r < 0.90 ? 1 : 3;
    return r < 0.45 ? 2 : 1;
  }

  // sinon mult “naturel”
  if (skill >= 5) return r < 0.55 ? 2 : r < 0.80 ? 3 : 1;
  if (skill === 4) return r < 0.45 ? 2 : r < 0.65 ? 3 : 1;
  if (skill === 3) return r < 0.30 ? 2 : r < 0.40 ? 3 : 1;
  if (skill === 2) return r < 0.18 ? 2 : r < 0.22 ? 3 : 1;
  return r < 0.10 ? 2 : 1;
}

function decideBotThrow(me: KillerPlayerState, all: KillerPlayerState[], config: KillerConfig): ThrowInput {
  const skill = resolveBotSkill(me.botLevel);
  const aliveOthers = all.filter((p) => !p.eliminated && p.id !== me.id);

  // chance d’erreur / miss
  const missRate = skill <= 1 ? 0.22 : skill === 2 ? 0.16 : skill === 3 ? 0.10 : skill === 4 ? 0.06 : 0.03;

  // bull = coup “inutile” parfois (ça fait joli)
  const bullRate = skill >= 4 ? 0.03 : 0.015;

  const r = rand01();
  if (r < missRate) return { target: 0, mult: 1 };
  if (r < missRate + bullRate) return { target: 25, mult: rand01() < 0.25 ? 2 : 1 };

  // pas killer -> vise son numéro (avec précision selon skill)
  if (!me.isKiller) {
    const wantsDouble = config.becomeRule === "double";
    const hitOwnRate = skill <= 1 ? 0.55 : skill === 2 ? 0.68 : skill === 3 ? 0.78 : skill === 4 ? 0.88 : 0.94;

    if (rand01() < hitOwnRate) {
      return { target: me.number, mult: pickMultForBot(skill, config.becomeRule, wantsDouble) };
    }

    // erreur: vise un numéro random
    const n = 1 + Math.floor(Math.random() * 20);
    return { target: n, mult: pickMultForBot(skill, config.becomeRule, false) };
  }

  // killer -> vise un vivant (avec précision)
  const hitVictimRate = skill <= 1 ? 0.52 : skill === 2 ? 0.66 : skill === 3 ? 0.76 : skill === 4 ? 0.86 : 0.92;

  if (aliveOthers.length === 0) {
    return { target: 0, mult: 1 };
  }

  if (rand01() < hitVictimRate) {
    // cible: de préférence celui avec le moins de vies (finir)
    const sorted = [...aliveOthers].sort((a, b) => (a.lives ?? 0) - (b.lives ?? 0));
    const pick = sorted[0];
    return { target: pick.number, mult: pickMultForBot(skill, config.becomeRule, false) };
  }

  // erreur: vise un numéro pas forcément assigné
  const n = 1 + Math.floor(Math.random() * 20);
  return { target: n, mult: pickMultForBot(skill, config.becomeRule, false) };
}

/* -----------------------------
   ThrowPad (UI simple)
----------------------------- */
function ThrowPad({
  disabled,
  dartsLeft,
  onThrow,
  onEndTurn,
  onUndo,
}: {
  disabled: boolean;
  dartsLeft: number;
  onThrow: (t: ThrowInput) => void;
  onEndTurn: () => void;
  onUndo: () => void;
}) {
  const [mult, setMult] = React.useState<Mult>(1);

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,.10)",
        background: "rgba(255,255,255,.04)",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 8 }}>Saisie fléchette</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {[1, 2, 3].map((m) => {
          const mm = m as Mult;
          const active = mult === mm;
          return (
            <button
              key={m}
              onClick={() => setMult(mm)}
              style={{
                flex: 1,
                padding: "10px 10px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.12)",
                background: active ? "rgba(255,198,58,.85)" : "rgba(0,0,0,.25)",
                color: active ? "#1b1508" : "inherit",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {mm === 1 ? "S" : mm === 2 ? "D" : "T"}
            </button>
          );
        })}
      </div>

      {/* Quick actions: MISS / BULL */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button
          disabled={disabled}
          onClick={() => onThrow({ target: 0, mult: 1 })}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(0,0,0,.25)",
            fontWeight: 900,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          MISS
        </button>

        <button
          disabled={disabled}
          onClick={() => onThrow({ target: 25, mult: 1 })}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(0,0,0,.25)",
            fontWeight: 900,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          BULL
        </button>

        <button
          disabled={disabled}
          onClick={() => onThrow({ target: 25, mult: 2 })}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(0,0,0,.25)",
            fontWeight: 900,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          DBULL
        </button>
      </div>

      {/* Numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
        {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            disabled={disabled}
            onClick={() => onThrow({ target: n, mult })}
            style={{
              padding: "10px 0",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.10)",
              background: "rgba(0,0,0,.25)",
              fontWeight: 900,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {n}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
        <button
          onClick={onEndTurn}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(0,0,0,.25)",
            fontWeight: 900,
            cursor: "pointer",
            flex: 1,
          }}
        >
          Fin de tour
        </button>

        <button
          onClick={onUndo}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(0,0,0,.25)",
            fontWeight: 900,
            cursor: "pointer",
            opacity: 0.9,
          }}
          title="Annuler la dernière fléchette"
        >
          Undo
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
        Darts restantes : <b>{dartsLeft}</b>
      </div>
    </div>
  );
}

export default function KillerPlay({ store, go, config, onFinish }: Props) {
  const startedAt = React.useMemo(() => Date.now(), []);
  const finishedRef = React.useRef(false);

  // ✅ elimOrder en ref (évite setState dans setPlayers + évite les stales)
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

  // UNDO stack
  const undoRef = React.useRef<Snapshot[]>([]);

  // BOT timers
  const botTimerRef = React.useRef<any>(null);
  const botBusyRef = React.useRef(false);

  const current = players[turnIndex] ?? players[0];
  const w = winner(players);
  const inputDisabled = finished || dartsLeft <= 0 || !!w || !current || current.eliminated;

  function pushLog(line: string) {
    setLog((prev) => [line, ...prev].slice(0, 120));
  }

  function snapshot() {
    const snap: Snapshot = {
      players: players.map((p) => ({ ...p, hitsBySegment: { ...p.hitsBySegment }, hitsByNumber: { ...p.hitsByNumber } })),
      turnIndex,
      dartsLeft,
      visit: visit.map((t) => ({ ...t })),
      log: log.slice(),
      finished,
      elimOrder: (elimOrderRef.current || []).slice(),
    };
    undoRef.current = [snap, ...undoRef.current].slice(0, 60);
  }

  function undo() {
    const s = undoRef.current[0];
    if (!s) return;
    undoRef.current = undoRef.current.slice(1);

    // stop bot “en vol”
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
    finishedRef.current = !!s.finished;
    elimOrderRef.current = (s.elimOrder || []).slice();
  }

  function endTurn(nextPlayers?: KillerPlayerState[]) {
    setVisit([]);
    setDartsLeft(3);
    const base = nextPlayers || players;
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

        // ✅ bots
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

      // ✅ bots
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

        players: finalPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          number: p.number,
          lives: p.lives,
          eliminated: p.eliminated,
          isKiller: p.isKiller,
          kills: p.kills,

          // ✅ bots
          isBot: !!p.isBot,
          botLevel: p.botLevel ?? "",

          finalRank: p.finalRank || 0,
          survivalTimeMs: p.survivalTimeMs || 0,
          livesTaken: p.livesTaken || 0,
          livesLost: p.livesLost || 0,
          totalThrows: p.totalThrows || 0,
          hitsOnSelf: p.hitsOnSelf || 0,
        })),
      },
      payload: {
        mode: "killer",
        config,
        state: { players: finalPlayers, elimOrder: elim || [] },
        summary: {
          mode: "killer",
          detailedByPlayer,
          perPlayer,
        },
      },
    };

    return rec as MatchRecord;
  }

  function applyThrow(t: ThrowInput) {
    if (inputDisabled) return;

    snapshot();

    const thr: ThrowInput = {
      target: clampInt(t.target, 0, 25, 0),
      mult: clampInt(t.mult, 1, 3, 1) as Mult,
    };

    setVisit((v) => [...v, thr]);
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

      if (!me.isKiller && !me.becameAtThrow) {
        me.throwsToBecomeKiller += 1;
      }
      if (me.isKiller) me.killerThrows += 1;

      // MISS / BULL => neutre
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

      // 1) devenir killer
      if (!me.isKiller && thr.target === me.number && canBecomeKiller(config.becomeRule, thr)) {
        me.isKiller = true;
        me.hitsOnSelf += 1;

        if (!me.becameAtThrow) me.becameAtThrow = me.throwsToBecomeKiller;

        pushLog(`🟡 ${me.name} devient KILLER en touchant ${fmtThrow(thr)} (#${thr.target})`);
        return next;
      }

      // 2) dégâts si killer : toucher numéro d’un autre vivant
      if (me.isKiller) {
        const victimIdx = next.findIndex(
          (p, idx) => idx !== turnIndex && !p.eliminated && p.number === thr.target
        );

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
            pushLog(
              `🔻 ${me.name} touche ${victim.name} (${fmtThrow(thr)} sur #${thr.target}, -${dmg}) → ${victim.lives} vie(s)`
            );
          }

          return next;
        }
      }

      // 3) neutre
      me.uselessHits += 1;
      pushLog(`🎯 ${me.name} : ${fmtThrow(thr)}`);
      return next;
    });
  }

  // Auto fin de tour
  React.useEffect(() => {
    if (finishedRef.current) return;
    if (winner(players)) return;
    if (dartsLeft === 0) endTurn(players);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dartsLeft]);

  // Détection victoire (une seule fois)
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

  // Si joueur courant éliminé => saute
  React.useEffect(() => {
    if (!players.length) return;
    if (!current || current.eliminated) {
      setTurnIndex((prev) => nextAliveIndex(players, prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  // Hook input externe
  React.useEffect(() => {
    function onExternal(ev: any) {
      const d = ev?.detail || {};
      const target = clampInt(d.target, 0, 25, 0);
      const mult = clampInt(d.mult, 1, 3, 1) as Mult;
      applyThrow({ target, mult });
    }
    window.addEventListener("dc:throw", onExternal as any);
    return () => window.removeEventListener("dc:throw", onExternal as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnIndex, dartsLeft, finished, inputDisabled]);

  // ✅ BOT AUTOPLAY
  React.useEffect(() => {
    if (!players.length) return;
    if (finishedRef.current) return;
    if (finished) return;
    if (winner(players)) return;

    const me = players[turnIndex];
    if (!me || me.eliminated) return;

    const isBot = !!me.isBot;
    if (!isBot) return;

    // si plus de darts, la logique auto-fin va déjà endTurn
    if (dartsLeft <= 0) return;

    // évite double scheduling
    if (botBusyRef.current) return;
    botBusyRef.current = true;

    // petite latence “humaine”
    const delay = 380 + Math.floor(Math.random() * 420); // 380..800ms

    botTimerRef.current = setTimeout(() => {
      botTimerRef.current = null;

      // recheck rapide (si undo / fin / etc.)
      if (finishedRef.current || finished) {
        botBusyRef.current = false;
        return;
      }

      const nowMe = players[turnIndex];
      if (!nowMe || nowMe.eliminated || !nowMe.isBot) {
        botBusyRef.current = false;
        return;
      }

      const thr = decideBotThrow(nowMe, players, config);
      applyThrow(thr);

      // libère le lock après le throw (sinon boucle infinie)
      botBusyRef.current = false;
    }, delay);

    return () => {
      // cleanup sur changement de deps
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

  const isBotTurn = !!current?.isBot;

  return (
    <div style={{ padding: 16, paddingBottom: 90 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => go("killer_config")}>←</button>
        <h2 style={{ margin: 0 }}>KILLER — Partie</h2>
      </div>

      <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
        Règles : devenir killer = <b>{config.becomeRule === "double" ? "Double" : "Simple"}</b> · dégâts ={" "}
        <b>{config.damageRule === "multiplier" ? "Multiplicateur" : "-1"}</b> · vies = <b>{config.lives}</b>
      </div>

      {/* Current */}
      <div
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.10)",
          background: "rgba(255,255,255,.04)",
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.75 }}>Tour de</div>
        <div style={{ fontSize: 18, fontWeight: 900 }}>
          {current?.name ?? "—"}{" "}
          <span style={{ fontSize: 13, opacity: 0.85 }}>(#{current?.number ?? "?"})</span>
          {current?.isKiller && <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 900 }}>🔥 KILLER</span>}
          {current?.isBot && (
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 900, opacity: 0.9 }}>
              🤖 BOT{current?.botLevel ? ` · ${current.botLevel}` : ""}
            </span>
          )}
        </div>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
          Vies : <b>{current?.lives ?? 0}</b> · Darts : <b>{dartsLeft}</b>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
          <span style={{ marginRight: 10 }}>
            Lancers : <b>{current?.totalThrows ?? 0}</b>
          </span>
          <span style={{ marginRight: 10 }}>
            Dégâts : <b>{current?.livesTaken ?? 0}</b>
          </span>
          <span>
            Kills : <b>{current?.kills ?? 0}</b>
          </span>
        </div>

        {isBotTurn && !finished && !w && (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
            🤖 Le bot joue automatiquement…
          </div>
        )}
      </div>

      {/* Scoreboard */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Joueurs</div>
        <div style={{ display: "grid", gap: 8 }}>
          {players.map((p, idx) => {
            const isMe = idx === turnIndex;
            return (
              <div
                key={p.id}
                style={{
                  padding: "10px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.10)",
                  background: isMe
                    ? "radial-gradient(circle at 0% 0%, rgba(255,198,58,.22), transparent 60%)"
                    : "rgba(255,255,255,.04)",
                  opacity: p.eliminated ? 0.5 : 1,
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontWeight: 900 }}>
                    {p.name} <span style={{ fontSize: 12, opacity: 0.8 }}>#{p.number}</span>
                    {p.isKiller && <span style={{ marginLeft: 6 }}>🔥</span>}
                    {p.eliminated && <span style={{ marginLeft: 6 }}>💀</span>}
                    {p.isBot && (
                      <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.85 }}>
                        🤖{p.botLevel ? ` ${p.botLevel}` : ""}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    kills: {p.kills} · vies: {p.lives} · dmg: {p.livesTaken} · lancers: {p.totalThrows}
                  </div>
                </div>

                <div style={{ fontWeight: 900, fontSize: 13 }}>{p.eliminated ? "OUT" : `${p.lives} ♥`}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visit recap */}
      <div style={{ marginTop: 14, fontSize: 13, opacity: 0.9 }}>
        Volée : {visit.length ? visit.map(fmtThrow).join(" · ") : "—"}
      </div>

      {/* Input (humain uniquement) */}
      {!w && !finished && !isBotTurn && (
        <ThrowPad
          disabled={inputDisabled}
          dartsLeft={dartsLeft}
          onThrow={applyThrow}
          onEndTurn={() => endTurn(players)}
          onUndo={undo}
        />
      )}

      {/* Log */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Log</div>
        <div
          style={{
            maxHeight: 220,
            overflow: "auto",
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.10)",
            background: "rgba(0,0,0,.20)",
            fontSize: 12,
            lineHeight: 1.35,
            opacity: 0.95,
          }}
        >
          {log.length === 0 ? (
            <div style={{ opacity: 0.7 }}>—</div>
          ) : (
            log.map((l, i) => (
              <div key={i} style={{ padding: "3px 0" }}>
                {l}
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
          <button
            onClick={() => go("killer_config")}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(0,0,0,.25)",
              fontWeight: 900,
              cursor: "pointer",
              flex: 1,
            }}
          >
            Quitter
          </button>

          <button
            onClick={undo}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(0,0,0,.25)",
              fontWeight: 900,
              cursor: "pointer",
              opacity: 0.9,
            }}
            title="Undo"
          >
            Undo
          </button>
        </div>
      </div>
    </div>
  );
}
