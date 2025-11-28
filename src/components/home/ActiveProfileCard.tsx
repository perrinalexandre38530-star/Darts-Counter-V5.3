// =============================================================
// src/components/home/ActiveProfileCard.tsx
// Carte joueur actif scindée en 2 :
// - Gauche : avatar + nom + statut
// - Droite : carrousel auto de stats (7 slides max)
//   Vue globale / Records / Online / X01 / Cricket / Training X01 / Horloge
// - N'affiche que les slides qui ont des données (ex : sessions > 0)
// - Style : mini-card thème + halo néon + valeurs qui scintillent
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import ProfileAvatar from "../ProfileAvatar";
import type { Profile } from "../../lib/types";

type MaybeNum = number | null | undefined;

export type ActiveProfileStats = {
  // ---- Vue globale ----
  ratingGlobal?: MaybeNum;
  winrateGlobal?: MaybeNum; // 0–1
  avg3DGlobal?: MaybeNum;
  sessionsGlobal?: MaybeNum;
  favoriteNumberLabel?: string | null; // ex: "T20", "D16", "S19"

  // ---- Records ----
  recordBestVisitX01?: MaybeNum;
  recordBestCOX01?: MaybeNum;
  recordMinDarts501?: MaybeNum;
  recordBestAvg3DX01?: MaybeNum;
  recordBestStreak?: MaybeNum;
  recordBestCricketScore?: MaybeNum;

  // ---- Online ----
  onlineMatches?: MaybeNum;
  onlineWinrate?: MaybeNum; // 0–1
  onlineAvg3D?: MaybeNum;
  onlineBestVisit?: MaybeNum;
  onlineBestCO?: MaybeNum;
  onlineRank?: MaybeNum;
  onlineBestRank?: MaybeNum;

  // ---- X01 Multi ----
  x01MultiAvg3D?: MaybeNum;
  x01MultiSessions?: MaybeNum;
  x01MultiWinrate?: MaybeNum;
  x01MultiBestVisit?: MaybeNum;
  x01MultiBestCO?: MaybeNum;
  x01MultiMinDartsLabel?: string | null; // ex: "11 darts (501)"

  // ---- Cricket ----
  cricketPointsPerRound?: MaybeNum;
  cricketHitsTotal?: MaybeNum;
  cricketCloseRate?: MaybeNum; // 0–1
  cricketLegsWinrate?: MaybeNum; // 0–1
  cricketAvgClose201918?: MaybeNum;
  cricketOpenings?: MaybeNum;

  // ---- Training X01 ----
  trainingAvg3D?: MaybeNum;
  trainingHitsS?: MaybeNum;
  trainingHitsD?: MaybeNum;
  trainingHitsT?: MaybeNum;
  trainingGoalSuccessRate?: MaybeNum; // 0–1
  trainingBestCO?: MaybeNum;

  // ---- Tour de l'Horloge ----
  clockTargetsHit?: MaybeNum;
  clockSuccessRate?: MaybeNum; // 0–1
  clockTotalTimeSec?: MaybeNum;
  clockBestStreak?: MaybeNum;
};

type Props = {
  profile: Profile | null;
  stats: ActiveProfileStats;
};

type SlideDef = {
  id: string;
  title: string;
  subtitle?: string;
  rows: { label: string; value: string }[];
};

function fmtPct(v?: MaybeNum): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(0)}%`;
}

function fmtNum(v?: MaybeNum, decimals = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v % 1 === 0 ? String(v) : v.toFixed(decimals);
}

export default function ActiveProfileCard({ profile, stats }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const [index, setIndex] = useState(0);

  // Petit CSS pour les animations (titre stats + valeurs scintillantes)
  const primary = theme.primary ?? "#F6C256";

  const shimmerCss = `
    @keyframes apcTitlePulse {
      0%, 100% { transform: translateY(0) scale(1); text-shadow: 0 0 6px ${primary}55; }
      50% { transform: translateY(-1px) scale(1.01); text-shadow: 0 0 12px ${primary}AA; }
    }
    @keyframes apcValueGlow {
      0%, 100% { text-shadow: 0 0 6px ${primary}66; }
      50% { text-shadow: 0 0 12px ${primary}CC; }
    }
  `;

  // ---------- Construction des slides à partir des stats ----------
  const slides = useMemo<SlideDef[]>(() => {
    const s = stats;
    const out: SlideDef[] = [];

    // 1) Vue globale — on exige au moins 1 session
    if ((s.sessionsGlobal ?? 0) > 0) {
      out.push({
        id: "global",
        title: t("home.stats.global", "Vue globale"),
        rows: [
          {
            label: t("home.stats.rating", "Rating global"),
            value: fmtNum(s.ratingGlobal, 1),
          },
          {
            label: t("home.stats.winrateGlobal", "% victoires"),
            value: fmtPct(s.winrateGlobal),
          },
          {
            label: t("home.stats.avg3dGlobal", "Moy. 3D"),
            value: fmtNum(s.avg3DGlobal, 2),
          },
          {
            label: t("home.stats.sessionsGlobal", "Sessions totales"),
            value: fmtNum(s.sessionsGlobal, 0),
          },
          {
            label: t("home.stats.favoriteNumber", "Numéro favori"),
            value: s.favoriteNumberLabel ?? "—",
          },
        ],
      });
    }

    // 2) Records — on exige au moins un record X01
    if (
      (s.recordBestVisitX01 ?? 0) > 0 ||
      (s.recordBestCOX01 ?? 0) > 0 ||
      (s.recordBestCricketScore ?? 0) > 0
    ) {
      out.push({
        id: "records",
        title: t("home.stats.records", "Records"),
        rows: [
          {
            label: t("home.stats.bestVisitX01", "Best visit X01"),
            value: fmtNum(s.recordBestVisitX01, 0),
          },
          {
            label: t("home.stats.bestCOX01", "Best CO X01"),
            value: fmtNum(s.recordBestCOX01, 0),
          },
          {
            label: t("home.stats.minDarts501", "Min darts 501"),
            value: fmtNum(s.recordMinDarts501, 0),
          },
          {
            label: t("home.stats.bestAvg3DX01", "Best moy. 3D X01"),
            value: fmtNum(s.recordBestAvg3DX01, 2),
          },
          {
            label: t("home.stats.bestStreak", "Plus grosse série"),
            value: fmtNum(s.recordBestStreak, 0),
          },
          {
            label: t("home.stats.bestCricketScore", "Best score Cricket"),
            value: fmtNum(s.recordBestCricketScore, 0),
          },
        ],
      });
    }

    // 3) Online — on exige au moins un match
    if ((s.onlineMatches ?? 0) > 0) {
      out.push({
        id: "online",
        title: t("home.stats.online", "Stats Online"),
        rows: [
          {
            label: t("home.stats.onlineMatches", "Matchs online"),
            value: fmtNum(s.onlineMatches, 0),
          },
          {
            label: t("home.stats.onlineWinrate", "% victoires"),
            value: fmtPct(s.onlineWinrate),
          },
          {
            label: t("home.stats.onlineAvg3D", "Moy. 3D"),
            value: fmtNum(s.onlineAvg3D, 2),
          },
          {
            label: t("home.stats.onlineBestVisit", "Best visit online"),
            value: fmtNum(s.onlineBestVisit, 0),
          },
          {
            label: t("home.stats.onlineBestCO", "Best CO online"),
            value: fmtNum(s.onlineBestCO, 0),
          },
          {
            label: t("home.stats.onlineRank", "Classement"),
            value:
              s.onlineRank != null
                ? s.onlineBestRank != null
                  ? `${fmtNum(s.onlineRank, 0)} (${fmtNum(
                      s.onlineBestRank,
                      0
                    )})`
                  : fmtNum(s.onlineRank, 0)
                : "—",
          },
        ],
      });
    }

    // 4) X01 Multi — on exige au moins 1 session
    if ((s.x01MultiSessions ?? 0) > 0) {
      out.push({
        id: "x01multi",
        title: t("home.stats.x01multi", "X01 multi"),
        rows: [
          {
            label: t("home.stats.avg3d", "Moy. 3D"),
            value: fmtNum(s.x01MultiAvg3D, 2),
          },
          {
            label: t("home.stats.sessions", "Sessions"),
            value: fmtNum(s.x01MultiSessions, 0),
          },
          {
            label: t("home.stats.winrate", "% victoires"),
            value: fmtPct(s.x01MultiWinrate),
          },
          {
            label: t("home.stats.bestVisit", "Best visit"),
            value: fmtNum(s.x01MultiBestVisit, 0),
          },
          {
            label: t("home.stats.bestCO", "Best CO"),
            value: fmtNum(s.x01MultiBestCO, 0),
          },
          {
            label: t("home.stats.minDarts", "Min darts"),
            value: s.x01MultiMinDartsLabel ?? "—",
          },
        ],
      });
    }

    // 5) Cricket — on exige au moins 1 leg
    if ((s.cricketHitsTotal ?? 0) > 0) {
      out.push({
        id: "cricket",
        title: t("home.stats.cricket", "Cricket"),
        rows: [
          {
            label: t("home.stats.pointsPerRound", "Pts / round"),
            value: fmtNum(s.cricketPointsPerRound, 1),
          },
          {
            label: t("home.stats.hitsTotal", "Hits totaux"),
            value: fmtNum(s.cricketHitsTotal, 0),
          },
          {
            label: t("home.stats.closeRate", "Taux fermeture"),
            value: fmtPct(s.cricketCloseRate),
          },
          {
            label: t("home.stats.legsWinrate", "% legs gagnés"),
            value: fmtPct(s.cricketLegsWinrate),
          },
          {
            label: t(
              "home.stats.close201918",
              "Temps moy. fermer 20/19/18"
            ),
            value: fmtNum(s.cricketAvgClose201918, 1),
          },
          {
            label: t("home.stats.openings", "Ouvertures réussies"),
            value: fmtNum(s.cricketOpenings, 0),
          },
        ],
      });
    }

    // 6) Training X01 — au moins 1 session
    if ((s.trainingHitsS ?? 0) + (s.trainingHitsD ?? 0) + (s.trainingHitsT ?? 0) > 0) {
      out.push({
        id: "trainingx01",
        title: t("home.stats.trainingX01", "Training X01"),
        rows: [
          {
            label: t("home.stats.avg3dTraining", "Moy. 3D"),
            value: fmtNum(s.trainingAvg3D, 2),
          },
          {
            label: t("home.stats.hitsS", "Hits S"),
            value: fmtNum(s.trainingHitsS, 0),
          },
          {
            label: t("home.stats.hitsD", "Hits D"),
            value: fmtNum(s.trainingHitsD, 0),
          },
          {
            label: t("home.stats.hitsT", "Hits T"),
            value: fmtNum(s.trainingHitsT, 0),
          },
          {
            label: t("home.stats.goalSuccess", "Réussite objectifs"),
            value: fmtPct(s.trainingGoalSuccessRate),
          },
          {
            label: t("home.stats.bestCOTraining", "Best CO"),
            value: fmtNum(s.trainingBestCO, 0),
          },
        ],
      });
    }

    // 7) Tour de l'Horloge — au moins 1 run
    if ((s.clockTargetsHit ?? 0) > 0) {
      out.push({
        id: "clock",
        title: t("home.stats.clock", "Tour de l'Horloge"),
        rows: [
          {
            label: t("home.stats.targetsHit", "Cibles réussies"),
            value: fmtNum(s.clockTargetsHit, 0),
          },
          {
            label: t("home.stats.clockSuccess", "% réussite"),
            value: fmtPct(s.clockSuccessRate),
          },
          {
            label: t("home.stats.clockTime", "Temps total"),
            value:
              s.clockTotalTimeSec != null
                ? `${Math.round(s.clockTotalTimeSec / 60)} min`
                : "—",
          },
          {
            label: t("home.stats.bestStreakClock", "Meilleure série"),
            value: fmtNum(s.clockBestStreak, 0),
          },
        ],
      });
    }

    return out;
  }, [stats, t]);

  // --------- Auto-carrousel 5s ----------
  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  if (!profile) return null;

  const slide = slides[index] ?? null;

  // Statut (pour l’instant on force online si rien)
  const status: "online" | "away" | "offline" =
    ((profile as any).status as any) ?? "online";

  const statusColor =
    status === "online" ? "#18FF6D" : status === "away" ? "#FFD95E" : "#888888";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: shimmerCss }} />
      <div
        style={{
          borderRadius: 24,
          padding: 16,
          marginBottom: 14,
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.04), rgba(0,0,0,0.95))",
          border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.10)"}`,
          boxShadow: `0 0 24px rgba(0,0,0,0.8), 0 0 30px ${primary}33`,
          display: "flex",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        {/* Colonne gauche : avatar + nom + statut */}
        <div
          style={{
            width: 120,
            minWidth: 120,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              position: "relative",
              padding: 4,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(0,0,0,0.3) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0.3) 100%)",
              boxShadow: `0 0 26px ${primary}66`,
            }}
          >
            <ProfileAvatar
              size={76}
              dataUrl={profile?.avatarDataUrl}
              label={profile?.name?.[0]?.toUpperCase() || "?"}
              showStars={false}
            />
          </div>

          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
              marginTop: 4,
              color: theme.textStrong ?? "#FFFFFF",
            }}
          >
            {profile.name}
          </div>

          {/* Statut */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 2,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: statusColor,
                boxShadow:
                  status === "offline"
                    ? "none"
                    : `0 0 8px ${statusColor}, 0 0 14px ${statusColor}`,
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: theme.textSoft ?? "rgba(255,255,255,0.7)",
              }}
            >
              {status === "online"
                ? t("status.online", "En ligne")
                : status === "away"
                ? t("status.away", "Absent")
                : t("status.offline", "Hors ligne")}
            </span>
          </div>
        </div>

        {/* Colonne droite : mini-card thème + stats */}
        <div
          style={{
            flex: 1,
            borderRadius: 18,
            padding: 12,
            background: `linear-gradient(135deg, ${primary}22, rgba(0,0,0,0.95))`,
            position: "relative",
            overflow: "hidden",
            boxShadow: `0 0 24px ${primary}55, inset 0 0 0 1px rgba(0,0,0,0.7)`,
            border: `1px solid ${primary}AA`,
          }}
        >
          {/* halo externe */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: -20,
              background: `radial-gradient(circle at top, ${primary}22, transparent 60%)`,
              opacity: 0.6,
              pointerEvents: "none",
            }}
          />

          {slide && (
            <div
              key={slide.id}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: 0.8,
                    color: primary,
                    animation: "apcTitlePulse 3.2s ease-in-out infinite",
                  }}
                >
                  {slide.title}
                </div>
                {slides.length > 1 && (
                  <div
                    style={{
                      fontSize: 11,
                      color:
                        theme.textMuted ?? "rgba(255,255,255,0.65)",
                    }}
                  >
                    {index + 1}/{slides.length}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                  rowGap: 6,
                  columnGap: 8,
                }}
              >
                {slide.rows.map((row, idx) => (
                  <div
                    key={row.label}
                    style={{
                      minWidth: 0,
                      paddingBottom: 4,
                      borderBottom:
                        idx < slide.rows.length - 3
                          ? `1px solid ${primary}33`
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        letterSpacing: 0.3,
                        color:
                          theme.textMuted ??
                          "rgba(255,255,255,0.65)",
                        marginBottom: 2,
                        textTransform: "none",
                      }}
                    >
                      {row.label}
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: primary,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        animation:
                          "apcValueGlow 2.8s ease-in-out infinite",
                      }}
                    >
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
