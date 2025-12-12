// =============================================================
// src/pages/KillerPlay.tsx
// KILLER — PLAY (DC-V5) — V1.6 (SAVE + STATS BASIC)
// - Volées (3 fléchettes) + auto fin de tour
// - Undo UI (sans rewind engine)
// - Auto-skip dead players
// - Profils réels via config.players[].profileId
// - Enregistrement match (kind:"killer") via onFinish -> pushHistory(App)
// - Stats BASIC (kills/deaths/hits/turnsToKiller) dans payload.stats.killer
// =============================================================

import * as React from "react";
import type { Store, MatchRecord } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import { useKillerEngine, type KillerHit } from "../hooks/useKillerEngine";
import type { KillerMatchConfig } from "./KillerConfig";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  config: KillerMatchConfig;
  onFinish: (m: MatchRecord) => void;
};

type DartRecord = KillerHit;

const SEGMENTS = Array.from({ length: 20 }, (_, i) => i + 1);
const MAX_DARTS = 3;

function uid() {
  return `killer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function KillerPlay({ store, go, config, onFinish }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const primary = (theme as any)?.primary || "#f7c948";
  const stroke = "rgba(255,255,255,.12)";
  const card = "rgba(255,255,255,.06)";
  const bg = "rgba(8,10,16,.96)";

  // ------------------------------------------------------------
  // Mapping matchPid -> profileId (important)
  // ------------------------------------------------------------
  const pidToProfileId = React.useMemo(() => {
    const m = new Map<string, string>();
    (config.players || []).forEach((p) => m.set(p.pid, p.profileId));
    return m;
  }, [config.players]);

  const getProfile = React.useCallback(
    (matchPid: string) => {
      const profileId = pidToProfileId.get(matchPid) || "";
      const prof = (store.profiles || []).find((p: any) => p?.id === profileId) || null;
      return prof;
    },
    [pidToProfileId, store.profiles]
  );

  // ------------------------------------------------------------
  // Engine
  // ------------------------------------------------------------
  const engine = useKillerEngine({
    players: config.players.map((p) => ({
      pid: p.pid, // match pid
      name: p.name,
      killerNumber: p.killerNumber,
    })),
    params: config.params,
  });

  const { state } = engine;
  const current = engine.getCurrent();

  // ------------------------------------------------------------
  // Volée management
  // ------------------------------------------------------------
  const [dartIndex, setDartIndex] = React.useState(0);
  const [visit, setVisit] = React.useState<DartRecord[]>([]);
  const [selectedMult, setSelectedMult] = React.useState<1 | 2 | 3>(1);

  React.useEffect(() => {
    setDartIndex(0);
    setVisit([]);
    setSelectedMult(1);
  }, [state.currentIndex]);

  // Auto-skip dead current
  React.useEffect(() => {
    if (!current) return;
    if (current.isDead) engine.nextPlayer();
  }, [current, engine]);

  // ------------------------------------------------------------
  // BASIC STATS (local runtime)
  // ------------------------------------------------------------
  type PStats = {
    hitsOwn: number;
    hitsOther: number;
    kills: number;
    deaths: number;
    turnsToKiller: number | null;
    becameKillerTurn: number | null;
  };

  const [pstats, setPstats] = React.useState<Record<string, PStats>>(() => {
    const init: Record<string, PStats> = {};
    state.players.forEach((p) => {
      init[p.pid] = {
        hitsOwn: 0,
        hitsOther: 0,
        kills: 0,
        deaths: 0,
        turnsToKiller: null,
        becameKillerTurn: null,
      };
    });
    return init;
  });

  // Keep keys in sync if needed
  React.useEffect(() => {
    setPstats((prev) => {
      const next = { ...prev };
      state.players.forEach((p) => {
        if (!next[p.pid]) {
          next[p.pid] = {
            hitsOwn: 0,
            hitsOther: 0,
            kills: 0,
            deaths: 0,
            turnsToKiller: null,
            becameKillerTurn: null,
          };
        }
      });
      return next;
    });
  }, [state.players]);

  // Listen engine events for stats (minimal)
  React.useEffect(() => {
    const ev = state.lastEvent as any;
    if (!ev) return;

    setPstats((prev) => {
      const next = { ...prev };

      if (ev.kind === "hit_own") {
        const pid = ev.pid as string;
        if (next[pid]) next[pid] = { ...next[pid], hitsOwn: next[pid].hitsOwn + 1 };
      }

      if (ev.kind === "became_killer") {
        const pid = ev.pid as string;
        if (next[pid] && next[pid].becameKillerTurn == null) {
          next[pid] = {
            ...next[pid],
            becameKillerTurn: state.turn,
            turnsToKiller: state.turn, // simple : turn où il devient killer
          };
        }
      }

      if (ev.kind === "hit_other") {
        const a = ev.attackerPid as string;
        if (next[a]) next[a] = { ...next[a], hitsOther: next[a].hitsOther + 1 };
      }

      if (ev.kind === "killed") {
        const a = ev.attackerPid as string;
        const tpid = ev.targetPid as string;
        if (next[a]) next[a] = { ...next[a], kills: next[a].kills + 1 };
        if (next[tpid]) next[tpid] = { ...next[tpid], deaths: next[tpid].deaths + 1 };
      }

      return next;
    });
  }, [state.lastEvent, state.turn]);

  // ------------------------------------------------------------
  // Throw / Undo / End turn
  // ------------------------------------------------------------
  const throwDart = (value: number) => {
    if (!current || current.isDead) return;
    if (state.phase === "ended") return;
    if (dartIndex >= MAX_DARTS) return;

    const hit: KillerHit = { value, mult: selectedMult };
    engine.throwDart(hit);

    setVisit((h) => [...h, hit]);
    setDartIndex((d) => d + 1);

    if (dartIndex + 1 >= MAX_DARTS) {
      setTimeout(() => engine.nextPlayer(), 160);
    }
  };

  const undoDart = () => {
    if (!visit.length) return;
    // UI only (pas de rewind engine)
    setVisit((h) => h.slice(0, -1));
    setDartIndex((d) => Math.max(0, d - 1));
  };

  const endTurnNow = () => {
    engine.nextPlayer();
  };

  // ------------------------------------------------------------
  // SAVE MATCH once at end
  // ------------------------------------------------------------
  const didFinishRef = React.useRef(false);

  React.useEffect(() => {
    if (state.phase !== "ended") return;
    if (!state.winnerPid) return;
    if (didFinishRef.current) return;

    didFinishRef.current = true;

    const now = Date.now();
    const matchId = uid();
    const winnerMatchPid = state.winnerPid;
    const winnerProfileId = pidToProfileId.get(winnerMatchPid) || null;

    const playersForHistory = state.players.map((p) => {
      const profileId = pidToProfileId.get(p.pid) || null;
      const prof = profileId
        ? (store.profiles || []).find((x: any) => x?.id === profileId) || null
        : null;

      return {
        id: profileId, // IMPORTANT: id = profileId (comme X01/Cricket)
        name: p.name || prof?.name || "",
        avatarDataUrl: prof?.avatarDataUrl ?? null,
      };
    });

    const statsKiller = {
      version: 1,
      maxLives: config.params.maxLives,
      params: { ...config.params },
      perPlayer: state.players.map((p) => {
        const profileId = pidToProfileId.get(p.pid) || null;
        const s = pstats[p.pid] || {
          hitsOwn: 0,
          hitsOther: 0,
          kills: 0,
          deaths: 0,
          turnsToKiller: null,
          becameKillerTurn: null,
        };
        return {
          matchPid: p.pid,
          profileId,
          name: p.name,
          killerNumber: p.killerNumber,
          livesEnd: p.lives,
          isDead: p.isDead,
          ...s,
        };
      }),
    };

    const summary = {
      mode: "killer",
      turnCount: state.turn,
      winnerProfileId,
      winnerMatchPid,
    };

    const record: any = {
      id: matchId,
      kind: "killer",
      createdAt: now,
      updatedAt: now,
      players: playersForHistory,
      winnerId: winnerProfileId,
      summary,
      payload: {
        kind: "killer",
        createdAt: now,
        updatedAt: now,
        summary,
        config,
        engineEndState: {
          turn: state.turn,
          winnerPid: state.winnerPid,
          players: state.players,
        },
        stats: { killer: statsKiller },
      },
    };

    try {
      onFinish(record as MatchRecord);
    } catch {
      // si onFinish crash, on retombe au menu jeux
      go("games");
    }
  }, [state.phase, state.winnerPid, state.turn, state.players, pidToProfileId, store.profiles, config, pstats, onFinish, go]);

  // ------------------------------------------------------------
  // Winner overlay (affichage) — la sauvegarde est faite via effect
  // ------------------------------------------------------------
  if (state.phase === "ended" && state.winnerPid) {
    const prof = getProfile(state.winnerPid);
    const winnerName =
      state.players.find((p) => p.pid === state.winnerPid)?.name || prof?.name || "—";

    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ maxWidth: 420, width: "100%", borderRadius: 24, border: `1px solid ${stroke}`, background: card, padding: 24, textAlign: "center", boxShadow: "0 25px 80px rgba(0,0,0,.55)" }}>
          <div style={{ fontSize: 30, fontWeight: 1100, letterSpacing: 1.6, color: primary, textTransform: "uppercase" }}>
            👑 Winner 👑
          </div>

          <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
            <div style={{ position: "relative" }}>
              <ProfileAvatar profile={prof as any} size={96} />
              <div style={{ position: "absolute", inset: -12 }}>
                <ProfileStarRing size={120} active />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, fontSize: 22, fontWeight: 1000, color: "#fff" }}>
            {winnerName}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button onClick={() => go("games")} style={btnSoft}>
              {t?.("Quit") || "Quitter"}
            </button>
            <button onClick={() => go("killer_config")} style={btnGold}>
              {t?.("Play again") || "Rejouer"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // Main UI
  // ------------------------------------------------------------
  return (
    <div style={{ minHeight: "100vh", background: bg, padding: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button style={btnSoft} onClick={() => go("killer_config")}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 1000, color: "#fff" }}>KILLER</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>
            {String(state.phase || "build").toUpperCase()} • Tour {state.turn}
          </div>
        </div>
      </div>

      {/* Players bar */}
      <div style={{ display: "flex", gap: 10, overflowX: "auto", marginTop: 12 }}>
        {state.players.map((p) => {
          const prof = getProfile(p.pid);
          const isCurrent = current?.pid === p.pid;
          const isKiller = engine.isPlayerKiller(p.pid);

          return (
            <div
              key={p.pid}
              style={{
                minWidth: 160,
                padding: 10,
                borderRadius: 16,
                border: `1px solid ${stroke}`,
                background: p.isDead
                  ? "rgba(255,80,80,.14)"
                  : isCurrent
                  ? "linear-gradient(180deg, rgba(255,215,120,.22), rgba(255,255,255,.06))"
                  : card,
                opacity: p.isDead ? 0.45 : 1,
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ position: "relative" }}>
                  <ProfileAvatar profile={prof as any} size={42} />
                  {isKiller && (
                    <div style={{ position: "absolute", inset: -6 }}>
                      <ProfileStarRing size={54} active />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>🎯 {p.killerNumber}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                {Array.from({ length: config.params.maxLives }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 10,
                      borderRadius: 6,
                      background: i < p.lives ? "linear-gradient(180deg,#ff5c5c,#ff2e2e)" : "rgba(255,255,255,.18)",
                    }}
                  />
                ))}
              </div>

              {p.isDead ? (
                <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, color: "#ff6b6b", textAlign: "center" }}>☠ DEAD</div>
              ) : isKiller ? (
                <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, color: primary, textAlign: "center" }}>👑 KILLER</div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Current */}
      <div style={{ marginTop: 14, padding: 14, borderRadius: 18, border: `1px solid ${stroke}`, background: card }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>Joueur actuel</div>
        <div style={{ fontSize: 22, fontWeight: 1100, color: "#fff" }}>{current?.name}</div>
        <div style={{ marginTop: 6, fontSize: 12, color: primary }}>
          Fléchette {Math.min(dartIndex + 1, MAX_DARTS)} / {MAX_DARTS}
        </div>
      </div>

      {/* Hitpad */}
      <div style={{ marginTop: 12, padding: 14, borderRadius: 18, border: `1px solid ${stroke}`, background: card }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          {[1, 2, 3].map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMult(m as any)}
              style={{
                ...btnSoft,
                flex: 1,
                background: selectedMult === m ? "linear-gradient(180deg,#ffd98a,#e6a93c)" : btnSoft.background,
                color: selectedMult === m ? "#000" : "#fff",
              }}
            >
              {m === 1 ? "S" : m === 2 ? "D" : "T"}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
          {SEGMENTS.map((v) => (
            <button key={v} style={btnSoft} onClick={() => throwDart(v)}>
              {v}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button style={btnSoft} onClick={undoDart}>Undo</button>
          <button style={btnGold} onClick={endTurnNow}>Fin de tour</button>
        </div>
      </div>
    </div>
  );
}

const btnSoft: React.CSSProperties = {
  padding: "12px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.15)",
  background: "rgba(255,255,255,.08)",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const btnGold: React.CSSProperties = {
  ...btnSoft,
  background: "linear-gradient(180deg,#ffd98a,#e6a93c)",
  color: "#000",
};
