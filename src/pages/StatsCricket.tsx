// ============================================================
// src/pages/StatsCricket.tsx
// Page Stats Cricket — style uniforme avec StatsHub / Training
// - Header titre
// - Carrousel joueurs (comme params Cricket)
// - KPIs principaux + grille par numéro
// - Charge automatiquement les stats depuis l'historique
//   via loadCricketStatsByProfileFromHistory()
// ============================================================

import React, { useState, useMemo, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import type { Profile } from "../lib/types";
import type {
  CricketPlayerStats,
  CricketNumberKey,
} from "../lib/StatsCricket"; // ⚠️ S majuscule

import {
  loadCricketStatsByProfileFromHistory,
} from "../lib/statsCricketProfileAgg";

import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import { GoldPill } from "../components/StatsPlayerDashboard";

// -------- Styles utilitaires ---------------------------------

const sectionTitleStyle = (color: string): React.CSSProperties => ({
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  color,
  letterSpacing: 0.6,
  marginBottom: 8,
});

const card: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)",
  padding: 14,
  borderRadius: 14,
  marginBottom: 14,
  border: "1px solid rgba(255,255,255,0.06)",
};

const kpiChip: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
};

const numberCell: React.CSSProperties = {
  flex: "1 1 30%",
  minWidth: 90,
  padding: 8,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.06)",
  marginBottom: 8,
};

// -------- Props -----------------------------------------------

type Props = {
  profiles: Profile[];
  activeProfileId?: string | null;
  // Optionnel : override externe si tu veux injecter un cache
  cricketStatsByProfile?: Record<string, CricketPlayerStats>;
};

// ============================================================

export default function StatsCricket({
  profiles,
  activeProfileId,
  cricketStatsByProfile,
}: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [openPlayers, setOpenPlayers] = useState(true);

  const allPlayers = profiles ?? [];

  // ---------- Chargement des stats depuis l'historique ----------
  const [statsMap, setStatsMap] = useState<
    Record<string, CricketPlayerStats> | null
  >(cricketStatsByProfile ?? null);
  const [loading, setLoading] = useState(!cricketStatsByProfile);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    // si l'appelant fournit déjà les stats, on les prend telles quelles
    if (cricketStatsByProfile) {
      setStatsMap(cricketStatsByProfile);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await loadCricketStatsByProfileFromHistory();
        if (!alive) return;
        setStatsMap(res);
      } catch (e) {
        console.warn("[StatsCricket] loadCricketStatsByProfileFromHistory error:", e);
        if (!alive) return;
        setError("failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [cricketStatsByProfile]);

  // index initial : profil actif si présent, sinon 0
  const initialIndex = useMemo(() => {
    if (!activeProfileId) return 0;
    const foundIndex = allPlayers.findIndex((p) => p.id === activeProfileId);
    return foundIndex >= 0 ? foundIndex : 0;
  }, [allPlayers, activeProfileId]);

  const [idx, setIdx] = useState(initialIndex);

  const current = allPlayers[idx] ?? null;
  const accent = theme.accent;

  const canScrollLeft = idx > 0;
  const canScrollRight = idx < allPlayers.length - 1;

  const currentStats: CricketPlayerStats | null = useMemo(() => {
    if (!current || !statsMap) return null;
    return statsMap[current.id] ?? null;
  }, [current, statsMap]);

  const numbersOrder: CricketNumberKey[] = [
    "20",
    "19",
    "18",
    "17",
    "16",
    "15",
    "25", // bull
  ];

  // -----------------------------------------------------------
  // Carrousel joueurs
  // -----------------------------------------------------------

  const PlayerCarousel = () => (
    <div style={{ ...card }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: openPlayers ? 10 : 0,
        }}
      >
        <div style={sectionTitleStyle(accent)}>
          {t("stats.players", "Joueurs")} ({allPlayers.length})
        </div>

        <GoldPill
          active={openPlayers}
          onClick={() => setOpenPlayers((o) => !o)}
          style={{ fontSize: 11, padding: "4px 10px" }}
        >
          {openPlayers ? t("common.hide", "Masquer") : t("common.show", "Afficher")}
        </GoldPill>
      </div>

      {openPlayers && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              marginBottom: 14,
              marginTop: -4,
            }}
          >
            <button
              disabled={!canScrollLeft}
              onClick={() => canScrollLeft && setIdx((i) => i - 1)}
              style={{
                opacity: canScrollLeft ? 1 : 0.25,
                fontSize: 22,
                color: accent,
                background: "none",
                border: "none",
                cursor: canScrollLeft ? "pointer" : "default",
              }}
            >
              ◀
            </button>

            {current && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div style={{ position: "relative" }}>
                  <ProfileStarRing size={80} color={accent} />
                  <ProfileAvatar
                    profile={current}
                    size={62}
                    style={{ position: "absolute", top: 9, left: 9 }}
                  />
                </div>
                <div
                  style={{
                    color: theme.text,
                    fontSize: 14,
                    fontWeight: 700,
                    marginTop: 2,
                  }}
                >
                  {current.name}
                </div>
              </div>
            )}

            <button
              disabled={!canScrollRight}
              onClick={() => canScrollRight && setIdx((i) => i + 1)}
              style={{
                opacity: canScrollRight ? 1 : 0.25,
                fontSize: 22,
                color: accent,
                background: "none",
                border: "none",
                cursor: canScrollRight ? "pointer" : "default",
              }}
            >
              ▶
            </button>
          </div>
        </>
      )}
    </div>
  );

  // -----------------------------------------------------------
  // Contenu stats
  // -----------------------------------------------------------

  const StatsContent = () => {
    // aucun joueur
    if (!current) {
      return (
        <div style={card}>
          <div style={sectionTitleStyle(accent)}>
            {t("stats.cricket.title", "Statistiques Cricket")}
          </div>
          <div
            style={{
              textAlign: "center",
              color: theme.textSoft,
              padding: "18px 0",
              fontSize: 13,
            }}
          >
            {t(
              "stats.cricket.noPlayer",
              "Aucun joueur sélectionné. Ajoute un profil local pour voir ses stats."
            )}
          </div>
        </div>
      );
    }

    // loading global (avant même d'avoir les données)
    if (loading && !statsMap) {
      return (
        <div style={card}>
          <div style={sectionTitleStyle(accent)}>
            {t("stats.cricket.title", "Statistiques Cricket")}
          </div>
          <div
            style={{
              textAlign: "center",
              color: theme.textSoft,
              padding: "18px 0",
              fontSize: 13,
            }}
          >
            {t(
              "stats.cricket.loading",
              "Chargement des statistiques Cricket…"
            )}
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div style={card}>
          <div style={sectionTitleStyle(accent)}>
            {t("stats.cricket.title", "Statistiques Cricket")}
          </div>
          <div
            style={{
              textAlign: "center",
              color: theme.textSoft,
              padding: "18px 0",
              fontSize: 13,
            }}
          >
            {t(
              "stats.cricket.error",
              "Impossible de charger les données Cricket pour le moment."
            )}
          </div>
        </div>
      );
    }

    if (!currentStats) {
      return (
        <div style={card}>
          <div style={sectionTitleStyle(accent)}>
            {t("stats.cricket.title", "Statistiques Cricket")}
          </div>
          <div
            style={{
              textAlign: "center",
              color: theme.textSoft,
              padding: "18px 0",
              fontSize: 13,
            }}
          >
            {t(
              "stats.cricket.noDataYet",
              "Aucune donnée Cricket pour ce joueur pour le moment."
            )}
          </div>
        </div>
      );
    }

    const winrate =
      currentStats.games > 0 ? (currentStats.wins / currentStats.games) * 100 : 0;

    return (
      <>
        {/* KPIs principaux */}
        <div style={card}>
          <div style={sectionTitleStyle(accent)}>
            {t("stats.cricket.overview", "Vue d’ensemble")}
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div style={kpiChip}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  color: theme.textSoft,
                  marginBottom: 4,
                }}
              >
                {t("stats.cricket.games", "Matches")}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                }}
              >
                {currentStats.games}
              </div>
            </div>

            <div style={kpiChip}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  color: theme.textSoft,
                  marginBottom: 4,
                }}
              >
                {t("stats.cricket.wins", "Victoires")}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                }}
              >
                {currentStats.wins}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: theme.textSoft,
                  marginTop: 2,
                }}
              >
                {winrate.toFixed(0)}%
              </div>
            </div>

            <div style={kpiChip}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  color: theme.textSoft,
                  marginBottom: 4,
                }}
              >
                {t("stats.cricket.mpr", "Marks / Round")}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                }}
              >
                {currentStats.marksPerRound.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Détail par numéro */}
        <div style={card}>
          <div style={sectionTitleStyle(accent)}>
            {t("cricket.hits", "Touches / points par numéro")}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {numbersOrder.map((numKey) => {
              const s = currentStats.numbers[numKey] ?? {
                hits: 0,
                closes: 0,
                points: 0,
              };

              const label = numKey === "25" ? "BULL" : numKey;

              return (
                <div key={numKey} style={numberCell}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: accent,
                      }}
                    >
                      {label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: theme.textSoft,
                        textTransform: "uppercase",
                      }}
                    >
                      {t("stats.cricket.marksShort", "marks")}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    {s.hits}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      color: theme.textSoft,
                    }}
                  >
                    <span>
                      {t("stats.cricket.closesShort", "ferm.")}: {s.closes}
                    </span>
                    <span>
                      {t("stats.cricket.pointsShort", "pts")}: {s.points}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  };

  // -----------------------------------------------------------
  // Rendu global
  // -----------------------------------------------------------

  return (
    <div
      style={{
        padding: 16,
        paddingTop: 20,
        color: theme.text,
        background: "rgba(0,0,0,0)",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Titre principal */}
      <h1
        style={{
          color: accent,
          fontSize: 22,
          fontWeight: 800,
          textAlign: "center",
          marginBottom: 16,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {t("stats.cricket.title", "Statistiques Cricket")}
      </h1>

      <PlayerCarousel />

      <StatsContent />
    </div>
  );
}
