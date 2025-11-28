// =============================================================
// src/components/home/ActiveProfileCard.tsx
// Carte joueur actif scindée en 2 :
// - Gauche : avatar médaillon + nom + statut (sur carte dorée)
// - Droite : carrousel auto de stats (7 slides max)
//   Vue globale / Records / Online / X01 / Cricket / Training X01 / Horloge
// - N'affiche que les slides qui ont des données (ex : sessions > 0)
// - Stats affichées en blocs KPI centrés avec halo léger
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
  // optionnel : si Home le fournit, on l'utilise, sinon fallback sur profile.status
  status?: "online" | "away" | "offline";
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
  const n = Number(v);
  return n % 1 === 0 ? String(n) : n.toFixed(decimals);
}

/* ============ Composant principal ============ */

export default function ActiveProfileCard({
  profile,
  stats,
  status: statusProp,
}: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const [index, setIndex] = useState(0);

  if (!profile) return null;

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

    // 1) Vue globale — TOUJOURS AFFICHÉE
    out.push({
      id: "global",
      title: t("home.stats.global", "Vue globale"),
      rows: [
        {
          label: t("home.stats.rating", "rating"),
          value: fmtNum(s.ratingGlobal, 1),
        },
        {
          label: t("home.stats.winrateGlobal", "win%"),
          value: fmtPct(s.winrateGlobal),
        },
        {
          label: t("home.stats.avg3dGlobal", "moy.3d"),
          value: fmtNum(s.avg3DGlobal, 2),
        },
        {
          label: t("home.stats.sessionsGlobal", "sessions"),
          value: fmtNum(s.sessionsGlobal, 0),
        },
        {
          label: t("home.stats.favoriteNumber", "numéro favori"),
          value: s.favoriteNumberLabel ?? "—",
        },
      ],
    });

    // 2) Records — on exige au moins un record X01
    if (
      (s.recordBestVisitX01 ?? 0) > 0 ||
      (s.recordBestCOX01 ?? 0) > 0 ||
      (s.recordBestCricketScore ?? 0) > 0
    ) {
      out.push({
        id: "records",
        title: t("home.stats.records", "records"),
        rows: [
          {
            label: t("home.stats.bestVisitX01", "best visit"),
            value: fmtNum(s.recordBestVisitX01, 0),
          },
          {
            label: t("home.stats.bestCOX01", "best co"),
            value: fmtNum(s.recordBestCOX01, 0),
          },
          {
            label: t("home.stats.minDarts501", "min darts 501"),
            value: fmtNum(s.recordMinDarts501, 0),
          },
          {
            label: t("home.stats.bestAvg3DX01", "best moy.3d"),
            value: fmtNum(s.recordBestAvg3DX01, 2),
          },
          {
            label: t("home.stats.bestStreak", "meilleure série"),
            value: fmtNum(s.recordBestStreak, 0),
          },
          {
            label: t("home.stats.bestCricketScore", "best cricket"),
            value: fmtNum(s.recordBestCricketScore, 0),
          },
        ],
      });
    }

    // 3) Online — au moins un match
    if ((s.onlineMatches ?? 0) > 0) {
      out.push({
        id: "online",
        title: t("home.stats.online", "online"),
        rows: [
          {
            label: t("home.stats.onlineMatches", "matchs"),
            value: fmtNum(s.onlineMatches, 0),
          },
          {
            label: t("home.stats.onlineWinrate", "win%"),
            value: fmtPct(s.onlineWinrate),
          },
          {
            label: t("home.stats.onlineAvg3D", "moy.3d"),
            value: fmtNum(s.onlineAvg3D, 2),
          },
          {
            label: t("home.stats.onlineBestVisit", "best visit"),
            value: fmtNum(s.onlineBestVisit, 0),
          },
          {
            label: t("home.stats.onlineBestCO", "best co"),
            value: fmtNum(s.onlineBestCO, 0),
          },
          {
            label: t("home.stats.onlineRank", "rank"),
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

    // 4) X01 Multi — au moins 1 session
    if ((s.x01MultiSessions ?? 0) > 0) {
      out.push({
        id: "x01multi",
        title: t("home.stats.x01multi", "x01 multi"),
        rows: [
          {
            label: t("home.stats.avg3d", "moy.3d"),
            value: fmtNum(s.x01MultiAvg3D, 2),
          },
          {
            label: t("home.stats.sessions", "sessions"),
            value: fmtNum(s.x01MultiSessions, 0),
          },
          {
            label: t("home.stats.winrate", "win%"),
            value: fmtPct(s.x01MultiWinrate),
          },
          {
            label: t("home.stats.bestVisit", "best visit"),
            value: fmtNum(s.x01MultiBestVisit, 0),
          },
          {
            label: t("home.stats.bestCO", "best co"),
            value: fmtNum(s.x01MultiBestCO, 0),
          },
          {
            label: t("home.stats.minDarts", "min darts"),
            value: s.x01MultiMinDartsLabel ?? "—",
          },
        ],
      });
    }

    // 5) Cricket — au moins 1 leg
    if ((s.cricketHitsTotal ?? 0) > 0) {
      out.push({
        id: "cricket",
        title: t("home.stats.cricket", "cricket"),
        rows: [
          {
            label: t("home.stats.pointsPerRound", "pts/round"),
            value: fmtNum(s.cricketPointsPerRound, 1),
          },
          {
            label: t("home.stats.hitsTotal", "hits"),
            value: fmtNum(s.cricketHitsTotal, 0),
          },
          {
            label: t("home.stats.closeRate", "close%"),
            value: fmtPct(s.cricketCloseRate),
          },
          {
            label: t("home.stats.legsWinrate", "legs%"),
            value: fmtPct(s.cricketLegsWinrate),
          },
          {
            label: t("home.stats.close201918", "20/19/18"),
            value: fmtNum(s.cricketAvgClose201918, 1),
          },
          {
            label: t("home.stats.openings", "openings"),
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
        title: t("home.stats.trainingX01", "training x01"),
        rows: [
          {
            label: t("home.stats.avg3dTraining", "moy.3d"),
            value: fmtNum(s.trainingAvg3D, 2),
          },
          {
            label: t("home.stats.hitsS", "hits s"),
            value: fmtNum(s.trainingHitsS, 0),
          },
          {
            label: t("home.stats.hitsD", "hits d"),
            value: fmtNum(s.trainingHitsD, 0),
          },
          {
            label: t("home.stats.hitsT", "hits t"),
            value: fmtNum(s.trainingHitsT, 0),
          },
          {
            label: t("home.stats.goalSuccess", "obj%"),
            value: fmtPct(s.trainingGoalSuccessRate),
          },
          {
            label: t("home.stats.bestCOTraining", "best co"),
            value: fmtNum(s.trainingBestCO, 0),
          },
        ],
      });
    }

    // 7) Tour de l'Horloge — au moins 1 run
    if ((s.clockTargetsHit ?? 0) > 0) {
      out.push({
        id: "clock",
        title: t("home.stats.clock", "horloge"),
        rows: [
          {
            label: t("home.stats.targetsHit", "cibles"),
            value: fmtNum(s.clockTargetsHit, 0),
          },
          {
            label: t("home.stats.clockSuccess", "succès%"),
            value: fmtPct(s.clockSuccessRate),
          },
          {
            label: t("home.stats.clockTime", "temps"),
            value:
              s.clockTotalTimeSec != null
                ? `${Math.round(s.clockTotalTimeSec / 60)} min`
                : "—",
          },
          {
            label: t("home.stats.bestStreakClock", "série"),
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

  const slide = slides[index] ?? slides[0];

  // Statut (prop > profil > online par défaut)
  const status: "online" | "away" | "offline" =
    statusProp ??
    (((profile as any).status as "online" | "away" | "offline" | undefined) ??
      "online");

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
        {/* Colonne gauche : avatar médaillon + nom + statut sur carte dorée */}
        <div
          style={{
            width: 130,
            minWidth: 130,
            display: "flex",
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              borderRadius: 22,
              padding: 10,
              background:
                "radial-gradient(circle at 0% 0%, rgba(246,194,86,0.22), rgba(5,7,16,0.96))",
              border: `1px solid ${primary}77`,
              boxShadow: `0 0 28px ${primary}55`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
            }}
          >
            {/* ✅ Médaillon brut, sans halo, sans wrapper */}
            <ProfileAvatar
              size={78}
              dataUrl={(profile as any)?.avatarDataUrl}
              label={profile?.name?.[0]?.toUpperCase() || "?"}
              showStars={false}
            />

            <div
              style={{
                fontWeight: 900,
                fontSize: 18,
                marginTop: 2,
                color: theme.textStrong ?? "#FFFFFF",
                maxWidth: "100%",
                textAlign: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
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
        </div>

        {/* Colonne droite : mini-card thème + KPIs centrés */}
        <div
          style={{
            flex: 1,
            borderRadius: 18,
            padding: 12,
            background: `linear-gradient(135deg, ${primary}18, rgba(0,0,0,0.98))`,
            position: "relative",
            overflow: "hidden",
            boxShadow: `0 0 24px ${primary}55, inset 0 0 0 1px rgba(0,0,0,0.8)`,
            border: `1px solid ${primary}AA`,
          }}
        >
          {/* halo externe léger pour la carte de stats (OK) */}
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
                    textTransform: "none",
                    animation: "apcTitlePulse 3.2s ease-in-out infinite",
                  }}
                >
                  {slide.title}
                </div>
                {/* pas de 1/2, 2/3 */}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0,1fr))",
                  gap: 8,
                }}
              >
                {slide.rows.map((row) => (
                  <KpiCell
                    key={row.label}
                    label={row.label}
                    value={row.value}
                    primary={primary}
                    theme={theme}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ============================================================
   Bloc KPI (style Training X01) — label minuscule + valeur centrée
============================================================ */

type KpiCellProps = {
  label: string;
  value: string;
  primary: string;
  theme: any;
};

function KpiCell({ label, value, primary, theme }: KpiCellProps) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: "6px 8px 8px",
        background:
          "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.06), rgba(5,7,16,0.96))",
        border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.18)"}`,
        boxShadow: "0 10px 22px rgba(0,0,0,0.75)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: 0.4,
          opacity: 0.8,
          marginBottom: 3,
          textTransform: "lowercase",
        }}
      >
        {label}
      </div>

      {/* petite séparation néon */}
      <div
        style={{
          height: 2,
          width: 32,
          borderRadius: 999,
          marginBottom: 4,
          background: `linear-gradient(90deg, transparent, ${primary}, transparent)`,
          boxShadow: `0 0 8px ${primary}66`,
        }}
      />

      <div
        style={{
          fontSize: 20,
          fontWeight: 900,
          color: primary,
          lineHeight: 1.1,
          animation: "apcValueGlow 2.8s ease-in-out infinite",
        }}
      >
        {value}
      </div>
    </div>
  );
}
