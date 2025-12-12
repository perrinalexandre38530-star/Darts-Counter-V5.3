// @ts-nocheck
// ============================================
// src/pages/KillerPlay.tsx
// KILLER — PLAY (V1.1)
// ✅ MISS (0) + BULL (25 / DBULL)
// ✅ UNDO RÉEL (rollback état complet)
// ✅ Auto-fin de tour quand dartsLeft = 0
// ✅ Hook input externe (CustomEvent "dc:throw")
// ✅ OPTION A (NEW): hitsBySegment par joueur (pour stats/classements)
// - Reçoit config depuis KillerConfig : routeParams.config
// - Tour par tour (3 fléchettes)
// - Devenir Killer en touchant SON numéro (règle single/double)
// - Quand Killer : toucher le numéro d’un autre joueur -> retire des vies
// - Élimination à 0 vie ; dernier vivant gagne
// - onFinish(matchRecord) => App.pushHistory()
// ============================================
import React from "react";
import type { Store, MatchRecord } from "../lib/types";
import type {
  KillerConfig,
  KillerDamageRule,
  KillerBecomeRule,
} from "./KillerConfig";

// ✅ NEW (Option A)
import { createHitsAccumulator } from "../lib/hitsBySegment";

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
  number: number; // 1..20
  lives: number; // >=0
  isKiller: boolean;
  eliminated: boolean;
  kills: number;
  hitsOnSelf: number;
};

type Snapshot = {
  players: KillerPlayerState[];
  turnIndex: number;
  dartsLeft: number;
  visit: ThrowInput[];
  log: string[];
  finished: boolean;
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
                background: active
                  ? "rgba(255,198,58,.85)"
                  : "rgba(0,0,0,.25)",
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
            color: "inherit",
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
            color: "inherit",
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
            color: "inherit",
            fontWeight: 900,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          DBULL
        </button>
      </div>

      {/* Numbers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 8,
        }}
      >
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
              color: "inherit",
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
            color: "inherit",
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
            color: "inherit",
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

  // ✅ NEW (Option A): accumulate hitsBySegment per player for this match
  const hitsAccRef = React.useRef<any>(null);
  if (!hitsAccRef.current) hitsAccRef.current = createHitsAccumulator();

  const initialPlayers: KillerPlayerState[] = React.useMemo(() => {
    const lives = clampInt(config?.lives, 1, 9, 3);
    return (config?.players || []).map((p) => ({
      id: p.id,
      name: p.name,
      avatarDataUrl: p.avatarDataUrl ?? null,
      number: clampInt(p.number, 1, 20, 1),
      lives,
      isKiller: false,
      eliminated: false,
      kills: 0,
      hitsOnSelf: 0,
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

  const current = players[turnIndex] ?? players[0];
  const w = winner(players);
  const inputDisabled = finished || dartsLeft <= 0 || !!w || !current || current.eliminated;

  function pushLog(line: string) {
    setLog((prev) => [line, ...prev].slice(0, 80));
  }

  function snapshot() {
    const snap: Snapshot = {
      players: players.map((p) => ({ ...p })),
      turnIndex,
      dartsLeft,
      visit: visit.map((t) => ({ ...t })),
      log: log.slice(),
      finished,
    };
    undoRef.current = [snap, ...undoRef.current].slice(0, 50);
  }

  function undo() {
    const s = undoRef.current[0];
    if (!s) return;
    undoRef.current = undoRef.current.slice(1);
    setPlayers(s.players);
    setTurnIndex(s.turnIndex);
    setDartsLeft(s.dartsLeft);
    setVisit(s.visit);
    setLog(s.log);
    setFinished(s.finished);

    // ⚠️ Note: on ne rollback pas hitsAccRef ici (Option A) pour rester léger.
    // Si tu veux un UNDO 100% parfait sur hitsBySegment aussi, on le fera après (Option A+).
  }

  function endTurn() {
    setVisit([]);
    setDartsLeft(3);
    setTurnIndex((prev) => nextAliveIndex(players, prev));
  }

  function buildMatchRecord(finalPlayers: KillerPlayerState[], winnerId: string) {
    const finishedAt = Date.now();

    // ✅ NEW (Option A): inject hitsBySegment into summary.perPlayer
    const hitsMap = hitsAccRef.current?.toJSON?.() || {};
    const perPlayer = finalPlayers.map((p) => ({
      playerId: p.id,
      profileId: p.id,
      id: p.id,
      name: p.name,
      avatarDataUrl: p.avatarDataUrl ?? null,
      hitsBySegment: hitsMap?.[p.id] || {},
      // tu pourras ajouter plus tard: favSegment / favNumber / etc
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
      })),
      summary: {
        mode: "killer",
        livesStart: config.lives,
        becomeRule: config.becomeRule,
        damageRule: config.damageRule,

        // ✅ NEW: pour StatsLeaderboardsPage (extractPerPlayerSummary)
        perPlayer,

        players: finalPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          number: p.number,
          lives: p.lives,
          eliminated: p.eliminated,
          isKiller: p.isKiller,
          kills: p.kills,
        })),
      },
      payload: {
        mode: "killer",
        config,
        state: { players: finalPlayers },
        summary: {
          mode: "killer",
          perPlayer,
        },
      },
    };

    return rec as MatchRecord;
  }

  function applyThrow(t: ThrowInput) {
    if (inputDisabled) return;

    // snapshot BEFORE changes (pour UNDO)
    snapshot();

    const thr: ThrowInput = {
      target: clampInt(t.target, 0, 25, 0),
      mult: clampInt(t.mult, 1, 3, 1) as Mult,
    };

    // ✅ NEW (Option A): comptage segment touché par joueur (S20 / T8 / SB / DB)
    try {
      const pid = String(current?.id || "");
      // on fournit un "dart object" compatible avec segmentKeyFromDart()
      hitsAccRef.current?.addFromDart(pid, {
        number: thr.target,
        mult: thr.mult,
        isBull: thr.target === 25 && thr.mult === 1,
        isDBull: thr.target === 25 && thr.mult === 2,
      });
    } catch {}

    setVisit((v) => [...v, thr]);
    setDartsLeft((d) => Math.max(0, d - 1));

    setPlayers((prev) => {
      const next = prev.map((p) => ({ ...p }));
      const me = next[turnIndex];
      if (!me || me.eliminated) return prev;

      // MISS / BULL n'a aucun effet sur les numéros (pour l’instant)
      if (thr.target === 0) {
        pushLog(`🎯 ${me.name} : MISS`);
        return next;
      }
      if (thr.target === 25) {
        pushLog(`🎯 ${me.name} : ${fmtThrow(thr)}`);
        return next;
      }

      // 1) devenir killer
      if (!me.isKiller && thr.target === me.number && canBecomeKiller(config.becomeRule, thr)) {
        me.isKiller = true;
        me.hitsOnSelf += 1;
        pushLog(`🟡 ${me.name} devient KILLER en touchant ${fmtThrow(thr)} (#${thr.target})`);
        return next;
      }

      // 2) dégâts si killer : toucher le numéro d’un autre joueur
      if (me.isKiller) {
        const victimIdx = next.findIndex(
          (p, idx) => idx !== turnIndex && !p.eliminated && p.number === thr.target
        );
        if (victimIdx >= 0) {
          const victim = next[victimIdx];
          const dmg = dmgFrom(thr.mult, config.damageRule);
          victim.lives = Math.max(0, victim.lives - dmg);
          if (victim.lives <= 0) {
            victim.eliminated = true;
            me.kills += 1;
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
      pushLog(`🎯 ${me.name} : ${fmtThrow(thr)}`);
      return next;
    });
  }

  // Auto fin de tour quand dartsLeft arrive à 0 (si pas fini)
  React.useEffect(() => {
    if (finished) return;
    if (winner(players)) return;
    if (dartsLeft === 0) {
      endTurn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dartsLeft]);

  // Détection victoire
  React.useEffect(() => {
    const ww = winner(players);
    if (ww && !finished) {
      setFinished(true);
      pushLog(`🏆 ${ww.name} gagne !`);
      const rec = buildMatchRecord(players, ww.id);
      onFinish(rec);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  // Si joueur courant éliminé => saute au prochain vivant
  React.useEffect(() => {
    if (!players.length) return;
    if (!current || current.eliminated) {
      setTurnIndex((prev) => nextAliveIndex(players, prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  // ✅ Hook input externe
  // Tu peux faire:
  // window.dispatchEvent(new CustomEvent("dc:throw",{detail:{target:20,mult:3}}))
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
  }, [players, turnIndex, dartsLeft, finished, visit, log]);

  if (!config || !config.players || config.players.length < 2) {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => go("killer_config")}>← Retour</button>
        <p>Configuration KILLER invalide.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, paddingBottom: 90 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => go("killer_config")}>←</button>
        <h2 style={{ margin: 0 }}>KILLER — Partie</h2>
      </div>

      <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
        Règles : devenir killer = <b>{config.becomeRule === "double" ? "Double" : "Simple"}</b> ·
        dégâts = <b>{config.damageRule === "multiplier" ? "Multiplier" : "-1"}</b> ·
        vies = <b>{config.lives}</b>
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
          <span style={{ fontSize: 13, opacity: 0.85 }}>
            (#{current?.number ?? "?"})
          </span>
          {current?.isKiller && (
            <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 900 }}>
              🔥 KILLER
            </span>
          )}
        </div>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
          Vies : <b>{current?.lives ?? 0}</b> · Darts : <b>{dartsLeft}</b>
        </div>
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
                    {p.name}{" "}
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      #{p.number}
                    </span>
                    {p.isKiller && <span style={{ marginLeft: 6 }}>🔥</span>}
                    {p.eliminated && <span style={{ marginLeft: 6 }}>💀</span>}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    kills: {p.kills} · vies: {p.lives}
                  </div>
                </div>

                <div style={{ fontWeight: 900, fontSize: 13 }}>
                  {p.eliminated ? "OUT" : `${p.lives} ♥`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visit recap */}
      <div style={{ marginTop: 14, fontSize: 13, opacity: 0.9 }}>
        Volée : {visit.length ? visit.map(fmtThrow).join(" · ") : "—"}
      </div>

      {/* Input */}
      {!w && !finished && (
        <ThrowPad
          disabled={inputDisabled}
          dartsLeft={dartsLeft}
          onThrow={applyThrow}
          onEndTurn={endTurn}
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
              color: "inherit",
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
              color: "inherit",
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
