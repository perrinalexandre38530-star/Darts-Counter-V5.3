// ============================================
// src/components/x01v3/X01LegOverlayV3.tsx
// Overlay fin de manche / set pour X01 V3
// - Card flottante style "beau X01Play"
// - Titre Manche X/Y • Set A/B
// - Nom du vainqueur + Sets / Legs
// - 3 mini-stats : Moy.3D / Fléchettes / Meilleure volée
// - Bouton "Manche suivante"
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

type Props = {
  open: boolean;
  // on garde les types larges pour rester compatible avec le moteur
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

  // ---------------- Détection vainqueur ----------------

  const winnerId =
    state?.lastLegWinnerId ||
    state?.lastWinnerId ||
    state?.lastWinningPlayerId ||
    null;

  const winner =
    players.find((p: any) => p.id === winnerId) || players[0] || null;

  const isSetEnd = state?.status === "set_end" || state?.lastEvent === "set_end";

  const subtitle = isSetEnd
    ? t("x01.leg_overlay.set_won", "Set gagné")
    : t("x01.leg_overlay.leg_won", "Manche gagnée");

  // ---------------- Stats vainqueur (manche en cours) ----------------
  // On essaie d’abord de lire un snapshot de manche si le moteur l’expose,
  // sinon on retombe sur les stats live.

  function getWinnerLegStats() {
    if (!winner) return null;

    const wid = winner.id;

    // Quelques noms possibles pour un snapshot de manche côté moteur V3
    const legStatsByPlayer =
      state?.lastLegStatsByPlayer ||
      state?.lastLegStats ||
      state?.legSnapshotByPlayer ||
      null;

    let s: any = null;

    if (legStatsByPlayer && legStatsByPlayer[wid]) {
      s = legStatsByPlayer[wid];
    } else if (state?.lastLegResult && state.lastLegResult.byPlayer) {
      // autre forme possible : lastLegResult.byPlayer[pid]
      s = state.lastLegResult.byPlayer[wid];
    } else if (liveStatsByPlayer && liveStatsByPlayer[wid]) {
      // fallback : stats live (match complet)
      s = liveStatsByPlayer[wid];
    }

    if (!s) return null;

    // On essaie plusieurs noms de champs pour être robuste
    const darts =
      s.legDarts ??
      s.dartsInLeg ??
      s.darts ??
      s.dartsThrown ??
      0;

    const bestVisit =
      s.legBestVisit ??
      s.bestVisit ??
      s.best_visit ??
      0;

    const totalScore =
      s.legScore ??
      s.totalScore ??
      s.sumScore ??
      0;

    const dartsForAvg =
      s.legDarts ??
      s.dartsThrown ??
      s.darts ??
      0;

    const avg3 =
      dartsForAvg > 0
        ? ((totalScore / dartsForAvg) * 3).toFixed(1)
        : "0.0";

    return {
      darts: Number(darts) || 0,
      bestVisit: Number(bestVisit) || 0,
      avg3,
    };
  }

  const legStats = getWinnerLegStats();

  // ---------------- Rendu ----------------

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
          maxWidth: 460,
          borderRadius: 20,
          padding: 14,
          boxShadow: "0 18px 40px rgba(0,0,0,0.85)",
          background:
            "radial-gradient(140% 180% at 0% 0%, rgba(255,195,26,0.18), transparent 55%), linear-gradient(180deg, rgba(12,12,16,0.98), rgba(6,6,9,0.98))",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Ligne titre Manche / Set */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "#ffd98a",
            }}
          >
            {t("x01.leg_overlay.match_header", "Manche")} {currentLeg}/
            {legsPerSet} · {t("x01.leg_overlay.set", "Set")} {currentSet}/
            {setsToWin}
          </div>

          {winner && (
            <div
              style={{
                fontSize: 11,
                padding: "4px 9px",
                borderRadius: 999,
                border: "1px solid rgba(255,207,87,0.55)",
                background:
                  "linear-gradient(180deg, rgba(255,207,87,0.16), rgba(30,30,32,0.95))",
                color: "#ffcf57",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              Sets {setsWon[winner.id] ?? 0} • Legs{" "}
              {legsWon[winner.id] ?? 0}
            </div>
          )}
        </div>

        {/* Nom vainqueur + sous-titre */}
        {winner && (
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#ffffff",
                marginBottom: 2,
              }}
            >
              {winner.name}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#ffd98a",
              }}
            >
              {subtitle}
            </div>
          </div>
        )}

        {/* Mini-stats vainqueur */}
        {winner && legStats && (
          <div
            className="x01-leg-overlay-v3-ministats"
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 12,
              marginTop: 4,
            }}
          >
            <MiniStat
              label={t("x01.avg3", "Moy. 3D")}
              value={legStats.avg3}
            />
            <MiniStat
              label={t("x01.darts", "Fléchettes")}
              value={String(legStats.darts)}
            />
            <MiniStat
              label={t("x01.best_visit", "Meilleure volée")}
              value={String(legStats.bestVisit)}
            />
          </div>
        )}

        {/* Bouton principal */}
        <div style={{ marginTop: 4 }}>
          <button
            type="button"
            onClick={onNextLeg}
            style={{
              width: "100%",
              padding: "11px 16px",
              borderRadius: 999,
              border: "none",
              fontWeight: 800,
              fontSize: 15,
              background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
              color: "#111",
              boxShadow: "0 10px 26px rgba(255,180,0,0.35)",
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
        background: "rgba(0,0,0,0.35)",
        borderRadius: 14,
        padding: "6px 8px",
        textAlign: "center",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          color: "#c0c2c8",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: "#ffffff",
        }}
      >
        {value}
      </div>
    </div>
  );
}
