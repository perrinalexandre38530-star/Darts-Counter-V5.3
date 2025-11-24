// ============================================
// src/components/x01v3/X01LegOverlayV3.tsx
// Overlay fin de manche / set pour X01 V3
// - Style proche de la V2 (capture que tu aimes)
// - Affiche : manche / set, vainqueur, score Sets/Legs
// - Mini-stats vainqueur (Moy.3D / Darts / Best visit)
//   → MASQUÉES si tout est à 0 pour éviter l’affichage pourri
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

type Props = {
  open: boolean;
  // on reste souple côté types pour éviter les erreurs TS
  config: any;
  state: any;
  liveStatsByPlayer: any;
  onNextLeg: () => void;
};

export default function X01LegOverlayV3({
  open,
  config,
  state,
  liveStatsByPlayer,
  onNextLeg,
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

  // --- Vainqueur ---
  const winnerId =
    state?.lastLegWinnerId ||
    state?.lastWinnerId ||
    state?.lastWinningPlayerId ||
    null;

  const winner =
    players.find((p: any) => p.id === winnerId) || players[0] || null;

  // Adversaire principal (2 joueurs : classique)
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

  const subtitle =
    state?.status === "set_end"
      ? t("x01.leg_overlay.set_won", "Set gagné")
      : state?.status === "match_end"
      ? t("x01.leg_overlay.match_won", "Match gagné")
      : t("x01.leg_overlay.leg_won", "Manche gagnée");

  // --- Mini-stats vainqueur ---
  let miniStatsNode: React.ReactNode = null;
  if (winner && liveStatsByPlayer && liveStatsByPlayer[winner.id]) {
    const s = liveStatsByPlayer[winner.id];
    const darts = s?.dartsThrown ?? 0;
    const totalScore = s?.totalScore ?? 0;
    const bestVisit = s?.bestVisit ?? 0;

    // On ne montre les mini-stats que si on a VRAIMENT des données
    if (darts > 0 || bestVisit > 0 || totalScore > 0) {
      const avg3 =
        darts > 0 && totalScore != null
          ? ((totalScore / darts) * 3).toFixed(1)
          : "0.0";

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
              {t("x01.leg_overlay.sets_short", "Sets")}{" "}
              {winnerSets}
              {opponent && " - " + opponentSets}
            </div>
            <div style={{ fontSize: 12, color: "#fff" }}>
              {t("x01.leg_overlay.legs_short", "Legs")}{" "}
              {winnerLegs}
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
            onClick={onNextLeg}
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
            {t("x01.leg_overlay.next_leg", "Manche suivante")}
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
