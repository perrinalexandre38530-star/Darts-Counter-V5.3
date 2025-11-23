// ============================================
// src/components/x01v3/X01LegOverlayV3.tsx
// Mini overlay fin de manche / set pour X01 V3
// - S'affiche au centre de l'écran
// - Indique manche / set + vainqueur
// - Bouton "Manche suivante"
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

  const winnerId =
    state?.lastLegWinnerId ||
    state?.lastWinnerId ||
    state?.lastWinningPlayerId ||
    null;

  const winner =
    players.find((p: any) => p.id === winnerId) || players[0] || null;

  const subtitle =
    state?.status === "set_end"
      ? t("x01.leg_overlay.set_won", "Set gagné")
      : t("x01.leg_overlay.leg_won", "Manche gagnée");

  return (
    <div
      className="x01-leg-overlay-v3-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
      }}
    >
      <div
        className={`x01-leg-overlay-v3-card theme-${theme.id}`}
        style={{
          width: "90%",
          maxWidth: 420,
          background: "#05060b",
          borderRadius: 20,
          padding: 16,
          boxShadow: "0 0 25px rgba(0,0,0,0.8)",
          border: `1px solid ${theme.primary}`,
        }}
      >
        <div className="x01-leg-overlay-v3-header" style={{ marginBottom: 12 }}>
          <div
            className="x01-leg-overlay-v3-label"
            style={{
              fontSize: 12,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: theme.primary,
              marginBottom: 4,
            }}
          >
            {t("x01.leg_overlay.title", "Manche")} {currentLeg}/{legsPerSet} ·{" "}
            {t("x01.leg_overlay.set", "Set")} {currentSet}/{setsToWin}
          </div>

          {winner && (
            <div
              className="x01-leg-overlay-v3-scoreline"
              style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}
            >
              <span className="winner-name">{winner.name}</span>
              <span style={{ marginLeft: 8, opacity: 0.85 }}>
                • {t("x01.leg_overlay.sets", "Sets")}{" "}
                {setsWon[winner.id] ?? 0} ·{" "}
                {t("x01.leg_overlay.legs", "Legs")} {legsWon[winner.id] ?? 0}
              </span>
            </div>
          )}

          <div
            className="x01-leg-overlay-v3-subtitle"
            style={{ marginTop: 4, fontSize: 13, color: "#ffd98a" }}
          >
            {subtitle}
          </div>
        </div>

        {/* mini stats vainqueur (optionnel) */}
        {winner && liveStatsByPlayer && liveStatsByPlayer[winner.id] && (
          <div
            className="x01-leg-overlay-v3-ministats"
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {(() => {
              const s = liveStatsByPlayer[winner.id];
              const darts = s?.dartsThrown ?? 0;
              const bestVisit = s?.bestVisit ?? 0;
              const avg3 =
                darts > 0 && s?.totalScore != null
                  ? ((s.totalScore / darts) * 3).toFixed(1)
                  : "0.0";
              return (
                <>
                  <MiniStat
                    label={t("x01.avg3", "Moy. 3")}
                    value={avg3}
                  />
                  <MiniStat
                    label={t("x01.darts", "Fléchettes")}
                    value={String(darts)}
                  />
                  <MiniStat
                    label={t("x01.best_visit", "Meilleure volée")}
                    value={String(bestVisit)}
                  />
                </>
              );
            })()}
          </div>
        )}

        <div className="x01-leg-overlay-v3-actions" style={{ marginTop: 8 }}>
          <button
            type="button"
            className="x01-leg-overlay-v3-primary"
            onClick={onNextLeg}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 999,
              border: "none",
              fontWeight: 700,
              fontSize: 15,
              background:
                "linear-gradient(180deg,#ffc63a,#ffaf00)",
              color: "#000",
              boxShadow: "0 0 16px rgba(0,0,0,0.6)",
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
        background: "rgba(255,255,255,0.03)",
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
          color: "#999",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{value}</div>
    </div>
  );
}
