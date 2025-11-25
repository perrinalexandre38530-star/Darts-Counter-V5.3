// =============================================================
// src/components/x01v3/X01LegOverlayV3.tsx
// Overlay fin de manche / set / match pour X01 V3
// - Style néon + trophée 🏆
// - Affiche : Manche / Set, vainqueur, score Sets/Legs
// - Mini-stats vainqueur (Moy.3D / Darts / Best visit)
// - Boutons fin de match :
//      CONTINUER (3+) / REJOUER / NOUVELLE PARTIE / RÉSUMÉ / QUITTER
// - Callbacks fournis par X01PlayV3
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import trophyCup from "../../ui_assets/trophy-cup.png";

type Props = {
  open: boolean;
  status: "playing" | "leg_end" | "set_end" | "match_end";
  config: any;
  state: any;
  liveStatsByPlayer: any;

  onNextLeg: () => void;
  onExitMatch?: () => void;

  onReplaySameConfig?: () => void;
  onReplayNewConfig?: () => void;
  onShowSummary?: (matchId: string) => void;
  onContinueMulti?: () => void;
};

export default function X01LegOverlayV3({
  open,
  status,
  config,
  state,
  liveStatsByPlayer,
  onNextLeg,
  onExitMatch,
  onReplaySameConfig,
  onReplayNewConfig,
  onShowSummary,
  onContinueMulti,
}: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  if (!open || status === "playing") return null;

  const players = config?.players ?? [];
  const scores = state?.scores ?? {};
  const legsWon = state?.legsWon ?? {};
  const setsWon = state?.setsWon ?? {};

  const currentSet = state?.currentSet ?? 1;
  const currentLeg = state?.currentLeg ?? 1;
  const legsPerSet = config?.legsPerSet ?? "?";
  const setsToWin = config?.setsToWin ?? "?";
  const matchId = state?.matchId;

  // ------------------------------------------------------------
  // Détermination vainqueur / classement
  // ------------------------------------------------------------
  const winnerId =
    state?.lastLegWinnerId ||
    state?.lastWinnerId ||
    state?.lastWinningPlayerId ||
    null;

  const winner =
    players.find((p: any) => p.id === winnerId) || players[0] || null;

  const opponent =
    winner && players.length >= 2
      ? players.find((p: any) => p.id !== winner.id)
      : null;

  const winnerSets = winner ? setsWon[winner.id] ?? 0 : 0;
  const winnerLegs = winner ? legsWon[winner.id] ?? 0 : 0;
  const opponentSets = opponent ? setsWon[opponent.id] ?? 0 : 0;
  const opponentLegs = opponent ? legsWon[opponent.id] ?? 0 : 0;

  const subtitle =
    status === "match_end"
      ? t("x01.leg_overlay.match_won", "Match gagné")
      : status === "set_end"
      ? t("x01.leg_overlay.set_won", "Set gagné")
      : t("x01.leg_overlay.leg_won", "Manche gagnée");

  // CONTINUER (3+ joueurs)
  const finishedCount = players.filter((p: any) => scores[p.id] === 0).length;
  const showContinueMulti =
    players.length >= 3 &&
    finishedCount >= 1 &&
    finishedCount < players.length &&
    typeof onContinueMulti === "function";

  // ------------------------------------------------------------
  // Mini stats vainqueur
  // ------------------------------------------------------------
  const stats = winner ? liveStatsByPlayer?.[winner.id] : null;

  const darts = stats?.dartsThrown ?? 0;
  const totalScore = stats?.totalScore ?? 0;
  const bestVisit = stats?.bestVisit ?? 0;

  const showMiniStats = darts > 0 || totalScore > 0 || bestVisit > 0;

  const avg3 =
    darts > 0 ? ((totalScore / darts) * 3).toFixed(1) : "0.0";

  // ------------------------------------------------------------
  // Callbacks
  // ------------------------------------------------------------
  const nextLeg = () => onNextLeg();

  const quitMatch = () => {
    if (onExitMatch) onExitMatch();
  };

  const replaySame = () => {
    if (onReplaySameConfig) onReplaySameConfig();
  };

  const replayNew = () => {
    if (onReplayNewConfig) onReplayNewConfig();
  };

  const showSummary = () => {
    if (matchId && onShowSummary) onShowSummary(matchId);
  };

  const continueMulti = () => {
    if (onContinueMulti) onContinueMulti();
  };

  // ------------------------------------------------------------
  // Rendu
  // ------------------------------------------------------------

  return (
    <div
      className="x01legoverlay-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
        padding: 12,
      }}
    >
      <div
        style={{
          width: "min(92vw,520px)",
          borderRadius: 22,
          padding: 18,
          background:
            "radial-gradient(circle at top,#141824 0%,#05060b 58%,#020308 100%)",
          position: "relative",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 0 32px rgba(0,0,0,0.9)",
          overflow: "hidden",
        }}
      >
        {/* Halo */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 10% 0%,rgba(255,215,120,0.25),transparent 55%)",
            pointerEvents: "none",
          }}
        />

        {/* Trophée */}
        <div
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            width: 82,
            height: 82,
            opacity: 0.9,
            filter: "drop-shadow(0 0 18px rgba(255,190,60,0.6))",
          }}
        >
          <img
            src={trophyCup}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>

        <div style={{ position: "relative", zIndex: 2 }}>
          {/* Manche / Set */}
          <div
            style={{
              color: "#ffd98a",
              fontSize: 11,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            {t("x01.leg_overlay.leg", "Manche")} {currentLeg}/{legsPerSet} ·{" "}
            {t("x01.leg_overlay.set", "Set")} {currentSet}/{setsToWin}
          </div>

          {/* Nom + Scoreboard */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            {/* Nom */}
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 20 }}>
                {winner?.name ?? "—"}
              </div>
              <div style={{ color: "#ffd98a", fontSize: 13, marginTop: 2 }}>
                {subtitle}
              </div>
            </div>

            {/* Scoreboard */}
            <div
              style={{
                minWidth: 110,
                padding: "6px 10px",
                borderRadius: 16,
                background:
                  "linear-gradient(145deg,rgba(0,0,0,0.85),rgba(0,0,0,0.35))",
                border: "1px solid rgba(255,255,255,0.16)",
                textAlign: "right",
                color: "#fff",
              }}
            >
              <div style={{ fontSize: 10, color: "#aaa" }}>
                {t("x01.leg_overlay.score", "Score")}
              </div>
              <div style={{ fontSize: 12 }}>
                Sets {winnerSets}
                {opponent && " - " + opponentSets}
              </div>
              <div style={{ fontSize: 12 }}>
                Legs {winnerLegs}
                {opponent && " - " + opponentLegs}
              </div>
            </div>
          </div>

          {/* Mini stats */}
          {showMiniStats && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
              }}
            >
              <Mini label="Moy.3D" value={avg3} />
              <Mini label="Darts" value={String(darts)} />
              <Mini label="Best" value={String(bestVisit)} />
            </div>
          )}

          {/* BOUTONS */}
          {status !== "match_end" ? (
            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button
                style={btnGold}
                onClick={nextLeg}
              >
                {t("x01.leg_overlay.next_leg", "MANCHE SUIVANTE")}
              </button>

              <button style={btnGhost} onClick={quitMatch}>
                {t("common.quit", "Quitter")}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 14 }}>
              {/* REJOUER */}
              {onReplaySameConfig && (
                <button style={btnGoldFull} onClick={replaySame}>
                  🏆 {t("x01.leg_overlay.replay_same", "Rejouer (mêmes paramètres)")}
                </button>
              )}

              {/* Actions secondaires */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {onReplayNewConfig && (
                  <button style={btnGhostWide} onClick={replayNew}>
                    {t("x01.leg_overlay.new_match", "Nouvelle partie")}
                  </button>
                )}

                {onShowSummary && (
                  <button style={btnGhostWide} onClick={showSummary}>
                    {t("x01.leg_overlay.summary", "Résumé")}
                  </button>
                )}

                {showContinueMulti && (
                  <button style={btnGhostWide} onClick={continueMulti}>
                    {t("x01.leg_overlay.continue", "Continuer")}
                  </button>
                )}

                <button style={btnGhostWide} onClick={quitMatch}>
                  {t("common.quit", "Quitter")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// MINI KPI
// ------------------------------------------------------------
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        flex: 1,
        borderRadius: 14,
        textAlign: "center",
        padding: "6px 8px",
        background: "rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.7 }}>{label}</div>
      <div style={{ fontWeight: 800, color: "#ffc63a", fontSize: 17 }}>
        {value}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// STYLES BOUTONS
// ------------------------------------------------------------

const btnGold: React.CSSProperties = {
  flex: 1,
  padding: "11px 16px",
  borderRadius: 999,
  fontWeight: 800,
  background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
  color: "#000",
  border: "none",
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  padding: "11px 16px",
  borderRadius: 999,
  fontWeight: 700,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#fff",
  cursor: "pointer",
};

const btnGoldFull: React.CSSProperties = {
  width: "100%",
  marginBottom: 10,
  padding: "11px 16px",
  borderRadius: 999,
  fontWeight: 800,
  background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
  color: "#000",
  border: "none",
  cursor: "pointer",
};

const btnGhostWide: React.CSSProperties = {
  flex: 1,
  minWidth: 120,
  padding: "10px 12px",
  borderRadius: 999,
  fontWeight: 700,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#fff",
  cursor: "pointer",
};
