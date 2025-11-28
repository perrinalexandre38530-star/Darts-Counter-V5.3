// =============================================================
// src/components/home/ActiveProfileCard.tsx
// Carte joueur actif scindée en 2 :
// - Gauche : avatar + nom + statut
// - Droite : carrousel auto de stats (7 slides max)
//   Vue globale / Records / Online / X01 / Cricket / Training X01 / Horloge
// - N'affiche que les slides qui ont des données (ex : sessions > 0)
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
  status: "online" | "away" | "offline";
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

export default function ActiveProfileCard({ profile, stats, status }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const [index, setIndex] = useState(0);

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
    if (
      (s.trainingHitsS ?? 0) +
        (s.trainingHitsD ?? 0) +
        (s.trainingHitsT ?? 0) >
      0
    ) {
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

  if (!profile) {
    return null;
  }

  const slide = slides[index] ?? null;

  // --------- Texte / couleur de statut (comme dans Profiles.tsx) ----------
  const statusLabelKey =
    status === "away"
      ? "profiles.status.away"
      : status === "offline"
      ? "profiles.status.offline"
      : "profiles.status.online";

  const statusLabel = t(
    statusLabelKey,
    status === "away"
      ? "Absent"
      : status === "offline"
      ? "Hors ligne"
      : "En ligne"
  );

  const statusColor =
    status === "away"
      ? "#F6C256"
      : status === "offline"
      ? "#9AA0AA"
      : "#1FB46A";

  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.06), rgba(0,0,0,0.9))",
        border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.08)"}`,
        boxShadow: `0 0 24px rgba(0,0,0,0.8), 0 0 30px ${
          theme.primaryGlow ?? "rgba(255,215,128,0.35)"
        }`,
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
            boxShadow: `0 0 18px ${
              theme.primaryGlow ?? "rgba(255,215,128,0.5)"
            }`,
          }}
        >
          <ProfileAvatar
            profile={profile}
            size={76}
            glowColor={theme.primary}
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
                status === "offline" ? "none" : `0 0 8px ${statusColor}`,
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: statusColor,
            }}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Colonne droite : carrousel de stats */}
      <div
        style={{
          flex: 1,
          borderRadius: 18,
          padding: 12,
          background:
            "linear-gradient(135deg, rgba(0,0,0,0.9), rgba(255,255,255,0.02))",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {slide && (
          <div
            key={slide.id}
            style={{
              transition: "opacity 0.4s ease, transform 0.4s ease",
              opacity: 1,
              transform: "translateX(0)",
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
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  color: theme.primary ?? "#F6C256",
                }}
              >
                {slide.title}
              </div>
              {slides.length > 1 && (
                <div
                  style={{
                    fontSize: 11,
                    color:
                      theme.textMuted ?? "rgba(255,255,255,0.6)",
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
              {slide.rows.map((row) => (
                <div key={row.label} style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                      color:
                        theme.textMuted ??
                        "rgba(255,255,255,0.55)",
                      marginBottom: 2,
                    }}
                  >
                    {row.label}
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: theme.textStrong ?? "#ffffff",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
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
  );
}
