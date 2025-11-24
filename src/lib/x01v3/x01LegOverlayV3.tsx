// ============================================
// src/lib/x01v3/X01LegOverlayV3.tsx
// Overlay fin de manche / set / match pour X01 V3
// - Style proche de la V2 "beau" que tu aimes
// - Affiche : manche / set, vainqueur, score Sets/Legs
// - Gère bien les 3 états : leg_end / set_end / match_end
//   • leg_end / set_end → bouton "Manche suivante" → onNextLeg()
//   • match_end         → bouton "Terminer le match" → onExitMatch()
// - Mini-stats vainqueur (Moy.3D / Darts / Best visit)
//   → masquées si aucune data
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { getAvg3FromLiveStatsV3 } from "./x01StatsLiveV3";

type X01OverlayStatus = "leg_end" | "set_end" | "match_end" | string;

type Props = {
  open: boolean;
  status: X01OverlayStatus;
  // on reste souple côté types pour éviter les erreurs TS
  config: any;
  state: any;
  liveStatsByPlayer: Record<string, any>;
  onNextLeg: () => void;
  onExitMatch: () => void;
};

/* -------------------------------------------------------
   Helper : trouver le vainqueur à partir du state
   - leg_end  → joueur avec le plus de legsWon
   - set_end  → joueur avec le plus de setsWon
   - match_end→ joueur avec le plus de setsWon
------------------------------------------------------- */
function getWinnerIdFromState(
  config: any,
  state: any,
  status: X01OverlayStatus
): string | null {
  const players = config?.players ?? [];
  const ids: string[] = players.map((p: any) => p.id).filter(Boolean);
  if (!ids.length) return null;

  const legsWon = state?.legsWon || {};
  const setsWon = state?.setsWon || {};

  // Teams non géré finement ici (tu joues surtout en 1v1 / multi)
  if (config?.gameMode === "teams") {
    return null;
  }

  if (status === "match_end" || status === "set_end") {
    let bestId: string | null = null;
    let best = -Infinity;
    for (const pid of ids) {
      const v = setsWon[pid] ?? 0;
      if (v > best) {
        best = v;
        bestId = pid;
      }
    }
    return bestId;
  }

  // leg_end ou fallback
  let bestId: string | null = null;
  let best = -Infinity;
  for (const pid of ids) {
    const v = legsWon[pid] ?? 0;
    if (v > best) {
      best = v;
      bestId = pid;
    }
  }
  return bestId;
}

export default function X01LegOverlayV3({
  open,
  status,
  config,
  state,
  liveStatsByPlayer,
  onNextLeg,
  onExitMatch,
}: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  if (!open) return null;

  const players = config?.players ?? [];
  const currentSet = state?.currentSet ?? 1;
  const currentLeg = state?.currentLeg ?? 1;

  const legsPerSet = config?.legsPerSet ?? "?";
  const setsToWin = config?.setsToWin ?? "?";

  const legsWon = state?.legsWon || {};
  const setsWon = state?.setsWon || {};

  const isMatchEnd = status === "match_end";
  const isSetEnd = status === "set_end";

  // --- Vainqueur ---
  const winnerIdFromState = getWinnerIdFromState(config, state, status);

  const winner =
    players.find((p: any) => p.id === winnerIdFromState) ||
    players[0] ||
    null;

  const opponent =
    winner && players.length >= 2
      ? players.find((p: any) => p.id !== winner.id) || null
      : null;

  // --- Scoreboard Sets / Legs (winner vs opponent) ---
  const winnerSets = winner ? setsWon[winner.id] ?? 0 : 0;
  const winnerLegs = winner ? legsWon[winner.id] ?? 0 : 0;
  const opponentSets =
    opponent && opponent.id ? setsWon[opponent.id] ?? 0 : 0;
  const opponentLegs =
    opponent && opponent.id ? legsWon[opponent.id] ?? 0 : 0;

  // --- Texte principal ---
  const subtitle = isMatchEnd
    ? t("x01.leg_overlay.match_won", "Match gagné")
    : isSetEnd
    ? t("x01.leg_overlay.set_won", "Set gagné")
    : t("x01.leg_overlay.leg_won", "Manche gagnée");

  const primaryLabel = isMatchEnd
    ? t("x01.leg_overlay.finish_match", "Terminer le match")
    : t("x01.leg_overlay.next_leg", "Manche suivante");

  const handlePrimaryClick = () => {
    if (isMatchEnd) {
      onExitMatch();
    } else {
      onNextLeg();
    }
  };

  // --- Mini-stats vainqueur ---
  let miniStatsNode: React.ReactNode = null;
  if (winner && liveStatsByPlayer && liveStatsByPlayer[winner.id]) {
    const s = liveStatsByPlayer[winner.id];
    const darts = s?.dartsThrown ?? 0;
    const totalScore = s?.totalScore ?? 0;
    const bestVisit = s?.bestVisit ?? 0;

    if (darts > 0 || bestVisit > 0 || totalScore > 0) {
      const avg3 =
        darts > 0 ? getAvg3FromLiveStatsV3(s).toFixed(1) : "0.0";

      miniStatsNode = (
        <div
          className="x01-leg-overlay-v3-ministats"
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            marginTop: 12,
            marginBottom: 12,
          }}
        >
          <MiniStat label={t("x01.avg3", "Moy. 3D")} value={String(avg3)} />
          <MiniStat
            label={t("x01.darts", "Fléchettes")}
            value={String(darts)}
          />
          <MiniStat
            label={t("x01.best_visit", "Meilleure volée")}
            value={String(bestVisit)}
          />
        </div>
      );
    }
  }

  return (
    <div
      className="x01-leg-overlay-v3-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.70)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
      }}
    >
      <div
        className={`x01-leg-overlay-v3-card theme-${theme.id}`}
        style={{
          width: "92%",
          maxWidth: 440,
          borderRadius: 22,
          padding: 16,
          background:
            "radial-gradient(circle at top,#141824 0%,#05060b 55%,#020308 100%)",
          boxShadow: "0 0 32px rgba(0,0,0,0.95)",
          border: `1px solid rgba(255,255,255,0.06)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Bandeau manche / set */}
        <div
          style={{
            fontSize: 11,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "#ffd98a",
            marginBottom: 6,
          }}
        >
          {t("x01.leg_overlay.leg", "Manche")} {currentLeg}/{legsPerSet} ·{" "}
          {t("x01.leg_overlay.set", "Set")} {currentSet}/{setsToWin}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* Bloc gauche : nom + texte */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {winner && (
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#ffffff",
                }}
              >
                {winner.name}
              </div>
            )}
            <div
              style={{
                marginTop: 4,
                fontSize: 13,
                color: "#ffd98a",
              }}
            >
              {subtitle}
            </div>
          </div>

          {/* Bloc droit : petit scoreboard Sets / Legs */}
          <div
            style={{
              minWidth: 96,
              padding: "6px 10px",
              borderRadius: 14,
              background:
                "linear-gradient(145deg,rgba(0,0,0,0.85),rgba(0,0,0,0.35))",
              border: `1px solid rgba(255,255,255,0.16)`,
              textAlign: "right",
            }}
          >
            <div
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                color: "#aaa",
                marginBottom: 2,
              }}
            >
              {t("x01.leg_overlay.score", "Score")}
            </div>
            <div style={{ fontSize: 12, color: "#fff" }}>
              {t("x01.leg_overlay.sets_short", "Sets")} {winnerSets}
              {opponent && " - " + opponentSets}
            </div>
            <div style={{ fontSize: 12, color: "#fff" }}>
              {t("x01.leg_overlay.legs_short", "Legs")} {winnerLegs}
              {opponent && " - " + opponentLegs}
            </div>
          </div>
        </div>

        {/* Mini-stats vainqueur (si disponibles) */}
        {miniStatsNode}

        {/* Bouton principal */}
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            onClick={handlePrimaryClick}
            style={{
              width: "100%",
              padding: "11px 16px",
              borderRadius: 999,
              border: "none",
              fontWeight: 700,
              fontSize: 15,
              background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
              color: "#000",
              boxShadow: "0 0 20px rgba(0,0,0,0.75)",
              cursor: "pointer",
            }}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type MiniStatProps = { label: string; value: string };

function MiniStat({ label, value }: MiniStatProps) {
  return (
    <div
      style={{
        flex: 1,
        background: "rgba(255,255,255,0.04)",
        borderRadius: 14,
        padding: "6px 8px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: "#a3a3a3",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>
        {value}
      </div>
    </div>
  );
}
