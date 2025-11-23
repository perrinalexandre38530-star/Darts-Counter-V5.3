// ============================================
// src/pages/StatsOnline.tsx
// Stats ONLINE X01
// - Même UI que la page "Training X01"
// - Filtres de période (Jour / Semaine / Mois / Année / All)
// - Cartes : Session, Stats détaillées, Mots du Coach,
//            Progression, Radar Hits, Hits par segment,
//            Dernières sessions
// - Données lues depuis localStorage (dc_online_matches_v1)
//   → structure volontairement souple (any) pour ne pas casser
//     ton typage actuel : tu pourras affiner le calcul facilement
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

// ⚠️ même clé que sur FriendsPage pour réutiliser les matchs online
const LS_ONLINE_MATCHES_KEY = "dc_online_matches_v1";

type TimeRange = "day" | "week" | "month" | "year" | "all";

type OnlineAgg = {
  sessions: number;
  totalDarts: number;
  avg3: number;
  bestVisit: number;
  bestCheckout: number;
  h60: number;
  h100: number;
  h140: number;
  h180: number;
};

function getRangeStart(range: TimeRange): number | null {
  const now = new Date();
  const start = new Date(now);

  switch (range) {
    case "day":
      start.setHours(0, 0, 0, 0);
      return start.getTime();
    case "week": {
      const day = start.getDay() || 7; // lundi = 1 -> 7
      start.setDate(start.getDate() - (day - 1));
      start.setHours(0, 0, 0, 0);
      return start.getTime();
    }
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return start.getTime();
    case "year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      return start.getTime();
    case "all":
    default:
      return null;
  }
}

// Petit helper ultra souple : on accepte "any" pour coller
// à ta structure actuelle de OnlineMatch sans rien casser.
function loadOnlineMatches(range: TimeRange): any[] {
  try {
    const raw = window.localStorage.getItem(LS_ONLINE_MATCHES_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) || [];
    const fromTs = getRangeStart(range);
    if (!fromTs) return all;

    return all.filter((m: any) => {
      const ts = m?.createdAt ?? m?.date ?? m?.ts ?? 0;
      return typeof ts === "number" && ts >= fromTs;
    });
  } catch (err) {
    console.warn("[StatsOnline] Impossible de lire les matchs online", err);
    return [];
  }
}

// Calcul super basique (safe) en attendant que tu affines
function aggregateOnline(matches: any[]): OnlineAgg {
  if (!matches.length) {
    return {
      sessions: 0,
      totalDarts: 0,
      avg3: 0,
      bestVisit: 0,
      bestCheckout: 0,
      h60: 0,
      h100: 0,
      h140: 0,
      h180: 0,
    };
  }

  let sessions = matches.length;
  let totalDarts = 0;
  let totalScore = 0;
  let bestVisit = 0;
  let bestCheckout = 0;

  let h60 = 0;
  let h100 = 0;
  let h140 = 0;
  let h180 = 0;

  for (const m of matches) {
    // On laisse "any" mais on essaie de récupérer des infos
    const darts = Number(m?.stats?.darts ?? m?.darts ?? 0);
    const score = Number(m?.stats?.totalScore ?? m?.totalScore ?? 0);

    totalDarts += Number.isFinite(darts) ? darts : 0;
    totalScore += Number.isFinite(score) ? score : 0;

    const bestVisitCandidate = Number(
      m?.stats?.bestVisit ?? m?.bestVisit ?? 0
    );
    if (bestVisitCandidate > bestVisit) bestVisit = bestVisitCandidate;

    const bestCoCandidate = Number(
      m?.stats?.bestCheckout ?? m?.bestCheckout ?? 0
    );
    if (bestCoCandidate > bestCheckout) bestCheckout = bestCoCandidate;

    // Buckets (optionnels, si tu les as déjà côté online)
    const buckets = m?.stats?.buckets ?? m?.buckets ?? {};
    h60 += Number(buckets["60+"] ?? buckets.h60 ?? 0);
    h100 += Number(buckets["100+"] ?? buckets.h100 ?? 0);
    h140 += Number(buckets["140+"] ?? buckets.h140 ?? 0);
    h180 += Number(buckets["180"] ?? buckets.h180 ?? 0);
  }

  const avg3 =
    totalDarts > 0 ? Math.round(((totalScore / totalDarts) * 3) * 10) / 10 : 0;

  return {
    sessions,
    totalDarts,
    avg3,
    bestVisit,
    bestCheckout,
    h60,
    h100,
    h140,
    h180,
  };
}

function useOnlineAgg(range: TimeRange) {
  const [agg, setAgg] = React.useState<OnlineAgg>(() =>
    aggregateOnline(loadOnlineMatches("all"))
  );

  React.useEffect(() => {
    const matches = loadOnlineMatches(range);
    setAgg(aggregateOnline(matches));
  }, [range]);

  return agg;
}

// Petit composant pastille chiffre (comme sur Training X01)
function StatChip({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <div
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        border: `1px solid ${theme.borderSoft}`,
        fontSize: 11,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        marginRight: 6,
        marginBottom: 6,
        background:
          "radial-gradient(circle at 0 0, rgba(255,255,255,0.08), transparent)",
      }}
    >
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}

export default function StatsOnline() {
  const theme = useTheme();
  const { t } = useLang();
  const [range, setRange] = React.useState<TimeRange>("day");

  const agg = useOnlineAgg(range);

  const rangeTabs: { id: TimeRange; label: string }[] = [
    { id: "day", label: t("stats_range_day", "Jour") },
    { id: "week", label: t("stats_range_week", "Semaine") },
    { id: "month", label: t("stats_range_month", "Mois") },
    { id: "year", label: t("stats_range_year", "Année") },
    { id: "all", label: t("stats_range_all", "All") },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        padding: "24px 16px 100px",
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Titre centré */}
      <h1
        style={{
          textAlign: "center",
          fontSize: 24,
          letterSpacing: 3,
          marginBottom: 16,
          fontWeight: 800,
          textTransform: "uppercase",
          color: theme.primary,
          textShadow: `0 0 12px ${theme.primary}`,
        }}
      >
        ONLINE
      </h1>

      {/* Sous-titre */}
      <p
        style={{
          textAlign: "center",
          fontSize: 12,
          opacity: 0.8,
          marginBottom: 18,
        }}
      >
        {t(
          "stats_online_subtitle",
          "Analyse toutes tes performances Online sur la période sélectionnée."
        )}
      </p>

      {/* Tabs de période */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          marginBottom: 20,
        }}
      >
        {rangeTabs.map((tab) => {
          const active = tab.id === range;
          return (
            <button
              key={tab.id}
              onClick={() => setRange(tab.id)}
              style={{
                borderRadius: 999,
                border: "none",
                padding: "6px 12px",
                fontSize: 11,
                letterSpacing: 1,
                textTransform: "uppercase",
                cursor: "pointer",
                background: active ? theme.primary : "transparent",
                color: active ? "#000" : theme.text,
                boxShadow: active ? `0 0 12px ${theme.primary}` : "none",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Carte: résumé sessions */}
      <section
        style={{
          background: theme.card,
          borderRadius: 20,
          padding: "14px 16px",
          marginBottom: 14,
          boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            opacity: 0.7,
            marginBottom: 4,
          }}
        >
          {t("stats_online_sessions_label", "Sessions")}
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: theme.primary,
          }}
        >
          {agg.sessions}
        </div>
      </section>

      {/* Carte: stats détaillées */}
      <section
        style={{
          background: theme.card,
          borderRadius: 20,
          padding: "14px 16px",
          marginBottom: 14,
          boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          {t(
            "stats_online_detailed_title",
            "STATS DÉTAILLÉES (PÉRIODE)"
          )}
        </div>
        {agg.sessions === 0 ? (
          <p style={{ fontSize: 11, opacity: 0.7 }}>
            {t(
              "stats_online_empty_period",
              "Aucune partie Online enregistrée sur la période sélectionnée."
            )}
          </p>
        ) : (
          <div style={{ fontSize: 11, opacity: 0.85, lineHeight: 1.5 }}>
            {t(
              "stats_online_summary_text",
              "Tu as joué {{sessions}} sessions Online pour un total de {{darts}} fléchettes, avec une moyenne de {{avg3}} points / 3 darts.",
            )
              .replace("{{sessions}}", String(agg.sessions))
              .replace("{{darts}}", String(agg.totalDarts))
              .replace("{{avg3}}", agg.avg3.toFixed(1))}
          </div>
        )}
      </section>

      {/* Carte: Mots du Coach */}
      <section
        style={{
          background: theme.card,
          borderRadius: 20,
          padding: "14px 16px",
          marginBottom: 14,
          boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          {t("stats_online_coach_title", "Mots du Coach")}
        </div>
        <p style={{ fontSize: 11, opacity: 0.8 }}>
          {agg.sessions === 0
            ? t(
                "stats_online_coach_empty",
                "Aucune session Online sur la période sélectionnée."
              )
            : t(
                "stats_online_coach_tip",
                "Continue de jouer Online régulièrement pour stabiliser ta moyenne et tes gros scores (100+, 140+, 180)."
              )}
        </p>
      </section>

      {/* Carte: Progression (pastilles de stats, comme Training X01) */}
      <section
        style={{
          background: theme.card,
          borderRadius: 20,
          padding: "14px 16px",
          marginBottom: 14,
          boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 10,
          }}
        >
          {t("stats_online_progress_title", "Progression")}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          <StatChip
            label={t("stats_online_chip_darts", "Darts")}
            value={agg.totalDarts.toString()}
          />
          <StatChip
            label={t("stats_online_chip_avg3", "3D")}
            value={agg.avg3.toFixed(1)}
          />
          <StatChip
            label={t("stats_online_chip_bestVisit", "Best Visit")}
            value={agg.bestVisit.toString()}
          />
          <StatChip
            label={t("stats_online_chip_bestCheckout", "Best CO")}
            value={agg.bestCheckout.toString()}
          />
          <StatChip label="60+" value={agg.h60.toString()} />
          <StatChip label="100+" value={agg.h100.toString()} />
          <StatChip label="140+" value={agg.h140.toString()} />
          <StatChip label="180" value={agg.h180.toString()} />
        </div>
      </section>

      {/* Carte: Radar Hits (placeholder visuel identique, tu pourras plugger ton vrai radar plus tard) */}
      <section
        style={{
          background: theme.card,
          borderRadius: 20,
          padding: "14px 16px",
          marginBottom: 14,
          boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          {t("stats_online_radar_title", "RADAR HITS")}
        </div>
        <p style={{ fontSize: 11, opacity: 0.7 }}>
          {t(
            "stats_online_radar_placeholder",
            "Aucune fléchette enregistrée sur la période."
          )}
        </p>
      </section>

      {/* Carte: Hits par segment */}
      <section
        style={{
          background: theme.card,
          borderRadius: 20,
          padding: "14px 16px",
          marginBottom: 14,
          boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          {t("stats_online_segments_title", "HITS PAR SEGMENT")}
        </div>
        <p style={{ fontSize: 11, opacity: 0.7 }}>
          {t(
            "stats_online_segments_placeholder",
            "Aucune fléchette enregistrée sur la période."
          )}
        </p>
      </section>

      {/* Carte: Dernières sessions */}
      <section
        style={{
          background: theme.card,
          borderRadius: 20,
          padding: "14px 16px",
          marginBottom: 32,
          boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          {t(
            "stats_online_last_sessions_title",
            "DERNIÈRES SESSIONS"
          )}
        </div>
        <p style={{ fontSize: 11, opacity: 0.7 }}>
          {t(
            "stats_online_last_sessions_placeholder",
            "Aucune session Online enregistrée pour l’instant."
          )}
        </p>
      </section>
    </div>
  );
}
