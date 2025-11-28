// =============================================================
// src/pages/Home.tsx — Home v2 (dashboard futuriste)
// - Haut de page : "Bienvenue" + logo DARTS COUNTER
// - Carte joueur actif (ActiveProfileCard) : avatar + statut + carrousel de stats
// - Bandeau arcade (ArcadeTicker) : infos importantes avec image spécifique
// - Gros boutons de navigation (Profils / Local / Online / Stats / Réglages)
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { useAuthOnline } from "../hooks/useAuthOnline";

import type { Store, Profile } from "../lib/types";
import ActiveProfileCard, {
  type ActiveProfileStats,
} from "../components/home/ActiveProfileCard";
import ArcadeTicker, {
  type ArcadeTickerItem,
} from "../components/home/ArcadeTicker";

import { History } from "../lib/history";
import {
  getBasicProfileStatsAsync,
  getCricketProfileStats,
} from "../lib/statsBridge";

const PAGE_MAX_WIDTH = 520;

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

// ---------- Helpers ----------

function getActiveProfile(store: Store): Profile | null {
  const anyStore = store as any;
  const profiles: Profile[] = anyStore.profiles ?? [];
  const activeProfileId: string | null = anyStore.activeProfileId ?? null;
  if (!profiles.length) return null;
  if (!activeProfileId) return profiles[0];
  return profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
}

/* ----------------------
   Extraction records X01
-----------------------*/
async function extractX01Records(profileId: string) {
  const list = await History.list().catch(() => [] as any[]);

  let bestVisit = 0;
  let bestCO = 0;
  let minDarts501 = 0;
  let bestAvg3 = 0;
  let bestStreak = 0;
  let bestCricketScore = 0;

  for (const item of list as any[]) {
    const p = item?.payload as any;
    if (!p) continue;

    const players: any[] = Array.isArray(p.players) ? p.players : [];
    const me = players.find((pl) => pl && pl.id === profileId);
    if (!me) continue;

    const mode = p.mode;
    const startScore = p.startScore;

    // X01 records
    if (mode === "x01" || mode === "x01_multi" || mode === "x01v3" || mode === undefined) {
      if (typeof me.bestVisit === "number" && me.bestVisit > bestVisit) {
        bestVisit = me.bestVisit;
      }
      if (
        typeof me.bestCheckout === "number" &&
        me.bestCheckout > bestCO
      ) {
        bestCO = me.bestCheckout;
      }
      if (
        startScore === 501 &&
        typeof me.finishDarts === "number" &&
        me.finishDarts > 0 &&
        (minDarts501 === 0 || me.finishDarts < minDarts501)
      ) {
        minDarts501 = me.finishDarts;
      }
      if (typeof me.avg3 === "number" && me.avg3 > bestAvg3) {
        bestAvg3 = me.avg3;
      }
      if (typeof me.streak === "number" && me.streak > bestStreak) {
        bestStreak = me.streak;
      }
    }

    // Cricket score (si dispo dans l’historique)
    if (mode === "cricket") {
      const score = typeof me.score === "number" ? me.score : 0;
      if (score > bestCricketScore) bestCricketScore = score;
    }
  }

  return {
    bestVisit,
    bestCO,
    minDarts501,
    bestAvg3,
    bestStreak,
    bestCricketScore,
  };
}

/* ----------------------
   Stats X01 multi
   (on prend les matchs X01 avec au moins 2 joueurs)
-----------------------*/
async function extractX01MultiStats(profileId: string) {
  const list = await History.list().catch(() => [] as any[]);

  let sessions = 0;
  let avg3Sum = 0;
  let avg3Count = 0;
  let bestVisit = 0;
  let bestCO = 0;
  let minDartsLabel: string | null = null;
  let wins = 0;

  for (const item of list as any[]) {
    const p = item?.payload as any;
    if (!p) continue;
    const mode = p.mode;
    if (mode !== "x01" && mode !== "x01v3" && mode !== "x01_multi") continue;

    const players: any[] = Array.isArray(p.players) ? p.players : [];
    if (players.length < 2) continue;

    const me = players.find((pl) => pl && pl.id === profileId);
    if (!me) continue;

    sessions++;

    if (typeof me.avg3 === "number" && me.avg3 > 0) {
      avg3Sum += me.avg3;
      avg3Count++;
    }

    if (typeof me.bestVisit === "number" && me.bestVisit > bestVisit) {
      bestVisit = me.bestVisit;
    }

    if (
      typeof me.bestCheckout === "number" &&
      me.bestCheckout > bestCO
    ) {
      bestCO = me.bestCheckout;
    }

    if (
      typeof me.finishDarts === "number" &&
      me.finishDarts > 0 &&
      typeof p.startScore === "number"
    ) {
      const label = `${me.finishDarts} darts (${p.startScore})`;
      if (!minDartsLabel) {
        minDartsLabel = label;
      } else {
        const currentDarts = parseInt(minDartsLabel.split(" ")[0], 10);
        if (me.finishDarts < currentDarts) {
          minDartsLabel = label;
        }
      }
    }

    if (me.isWinner === true) {
      wins++;
    }
  }

  const avg3 =
    avg3Count > 0 ? avg3Sum / avg3Count : 0;
  const winrate =
    sessions > 0 ? wins / sessions : 0;

  return {
    sessions,
    avg3,
    bestVisit,
    bestCO,
    minDartsLabel,
    winrate,
  };
}

/* ----------------------
   buildStatsForProfile (ASYNC)
   - Global via getBasicProfileStatsAsync (StatsBridge)
   - Records via History (extractX01Records)
   - X01 multi via History (extractX01MultiStats)
   - Cricket via getCricketProfileStats
   - Training / Online / Horloge : placeholders (0) pour l’instant
-----------------------*/
async function buildStatsForProfile(
  _store: Store,
  profile: Profile | null
): Promise<ActiveProfileStats> {
  if (!profile) {
    return {
      ratingGlobal: 0,
      winrateGlobal: 0,
      avg3DGlobal: 0,
      sessionsGlobal: 0,
      favoriteNumberLabel: null,

      recordBestVisitX01: 0,
      recordBestCOX01: 0,
      recordMinDarts501: 0,
      recordBestAvg3DX01: 0,
      recordBestStreak: 0,
      recordBestCricketScore: 0,

      onlineMatches: 0,
      onlineWinrate: 0,
      onlineAvg3D: 0,
      onlineBestVisit: 0,
      onlineBestCO: 0,
      onlineRank: null,
      onlineBestRank: null,

      x01MultiAvg3D: 0,
      x01MultiSessions: 0,
      x01MultiWinrate: 0,
      x01MultiBestVisit: 0,
      x01MultiBestCO: 0,
      x01MultiMinDartsLabel: null,

      cricketPointsPerRound: 0,
      cricketHitsTotal: 0,
      cricketCloseRate: 0,
      cricketLegsWinrate: 0,
      cricketAvgClose201918: 0,
      cricketOpenings: 0,

      trainingAvg3D: 0,
      trainingHitsS: 0,
      trainingHitsD: 0,
      trainingHitsT: 0,
      trainingGoalSuccessRate: 0,
      trainingBestCO: 0,

      clockTargetsHit: 0,
      clockSuccessRate: 0,
      clockTotalTimeSec: 0,
      clockBestStreak: 0,
    };
  }

  const pid = profile.id;

  // ---- Récup globale + records/multi/cricket en parallèle ----
  const [base, rec, multi, cricket] = await Promise.all([
    getBasicProfileStatsAsync(pid),
    extractX01Records(pid),
    extractX01MultiStats(pid),
    getCricketProfileStats(pid).catch(() => null),
  ]);

  // ---- GLOBAL ----
  const sessionsGlobal = Number(base.games ?? 0);
  const winsGlobal = Number(base.wins ?? 0);

  // base.winRate est déjà en % (0..100) dans StatsBridge
  const winrateGlobal =
    base.winRate != null
      ? Number(base.winRate) / 100
      : sessionsGlobal > 0
      ? winsGlobal / sessionsGlobal
      : 0;

  const avg3DGlobal = Number(base.avg3 ?? 0);

  // Rating global : on recycle la moyenne /3 pour l’instant
  const ratingGlobal = avg3DGlobal;

  // Numéro favori : TODO — nécessite l’agrégat par segment
  const favoriteNumberLabel: string | null = null;

  // ---- Training X01 (placeholder) ----
  const training = {
    avg3: 0,
    hitsS: 0,
    hitsD: 0,
    hitsT: 0,
    goalRate: 0,
    bestCO: 0,
  };

  // ---- Online (placeholder, à brancher sur OnlineProfile.stats) ----
  const online = {
    matches: 0,
    winrate: 0,
    avg3D: 0,
    bestVisit: 0,
    bestCO: 0,
    rank: null as number | null,
    bestRank: null as number | null,
  };

  // ---- Horloge (pas encore de moteur) ----
  const clockTargetsHit = 0;
  const clockSuccessRate = 0;
  const clockTotalTimeSec = 0;
  const clockBestStreak = 0;

  const out: ActiveProfileStats = {
    // --- VUE GLOBALE ---
    ratingGlobal,
    winrateGlobal,
    avg3DGlobal,
    sessionsGlobal,
    favoriteNumberLabel,

    // --- RECORDS ---
    recordBestVisitX01: rec.bestVisit,
    recordBestCOX01: rec.bestCO,
    recordMinDarts501: rec.minDarts501,
    recordBestAvg3DX01: rec.bestAvg3,
    recordBestStreak: rec.bestStreak,
    recordBestCricketScore: rec.bestCricketScore,

    // --- ONLINE (placeholder) ---
    onlineMatches: online.matches,
    onlineWinrate: online.winrate,
    onlineAvg3D: online.avg3D,
    onlineBestVisit: online.bestVisit,
    onlineBestCO: online.bestCO,
    onlineRank: online.rank,
    onlineBestRank: online.bestRank,

    // --- X01 MULTI ---
    x01MultiAvg3D: multi.avg3 ?? 0,
    x01MultiSessions: multi.sessions ?? 0,
    x01MultiWinrate: multi.winrate ?? 0,
    x01MultiBestVisit: multi.bestVisit ?? 0,
    x01MultiBestCO: multi.bestCO ?? 0,
    x01MultiMinDartsLabel: multi.minDartsLabel ?? null,

    // --- CRICKET ---
    cricketPointsPerRound: (cricket as any)?.pointsPerRound ?? 0,
    cricketHitsTotal: (cricket as any)?.hitsTotal ?? 0,
    cricketCloseRate: (cricket as any)?.closeRate ?? 0,
    cricketLegsWinrate: (cricket as any)?.legsWinrate ?? 0,
    cricketAvgClose201918: (cricket as any)?.avgClose201918 ?? 0,
    cricketOpenings: (cricket as any)?.openings ?? 0,

    // --- TRAINING X01 (placeholder) ---
    trainingAvg3D: training.avg3,
    trainingHitsS: training.hitsS,
    trainingHitsD: training.hitsD,
    trainingHitsT: training.hitsT,
    trainingGoalSuccessRate: training.goalRate,
    trainingBestCO: training.bestCO,

    // --- HORLOGE ---
    clockTargetsHit,
    clockSuccessRate,
    clockTotalTimeSec,
    clockBestStreak,
  };

  return out;
}

// Bandeau arcade : messages + images différentes
function buildArcadeItems(
  _store: Store,
  profile: Profile | null,
  t: (k: string, d: string) => string
): ArcadeTickerItem[] {
  const items: ArcadeTickerItem[] = [];

  items.push({
    id: "last-records",
    title: t("home.ticker.records", "Derniers records"),
    text: t(
      "home.ticker.records.text",
      "Plusieurs records battus récemment, continue sur ta lancée !"
    ),
    detail: "",
    backgroundImage: "/img/ticker-records.jpg",
    accentColor: "#F6C256",
  });

  items.push({
    id: "last-local-match",
    title: t("home.ticker.localLast", "Dernier match local"),
    text: t(
      "home.ticker.localLast.text",
      "Résumé du dernier match joué en local."
    ),
    backgroundImage: "/img/ticker-x01.jpg",
    accentColor: "#52FFC4",
  });

  items.push({
    id: "last-online-match",
    title: t("home.ticker.onlineLast", "Dernier match online"),
    text: t(
      "home.ticker.onlineLast.text",
      "Ton dernier duel online est prêt pour la revanche."
    ),
    backgroundImage: "/img/ticker-online.jpg",
    accentColor: "#5ED3FF",
  });

  items.push({
    id: "online-leader",
    title: t("home.ticker.onlineLeader", "Leader du classement"),
    text: t(
      "home.ticker.onlineLeader.text",
      "Découvre qui est en tête du classement online."
    ),
    backgroundImage: "/img/ticker-leaderboard.jpg",
    accentColor: "#FF5E9E",
  });

  items.push({
    id: "training-summary",
    title: t("home.ticker.training", "Training du moment"),
    text: t(
      "home.ticker.training.text",
      "Total des sessions Training X01 et Tour de l’Horloge."
    ),
    backgroundImage: "/img/ticker-training.jpg",
    accentColor: "#9EFF5E",
  });

  items.push({
    id: "month-summary",
    title: t("home.ticker.month", "Stats du mois"),
    text: t(
      "home.ticker.month.text",
      "Total des matchs et des hits pour ce mois."
    ),
    backgroundImage: "/img/ticker-global.jpg",
    accentColor: "#F6C256",
  });

  if (profile) {
    items.push({
      id: "tip-of-day",
      title: t("home.ticker.tip", "Astuce du jour"),
      text: t(
        "home.ticker.tip.text",
        "Ancre ta finition préférée en la rejouant régulièrement."
      ),
      backgroundImage: "/img/ticker-tip.jpg",
      accentColor: "#FFFFFF",
    });
  }

  return items;
}

// =============================================================

export default function Home({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const auth = useAuthOnline();

  const anyStore = store as any;
  const selfStatus: "online" | "away" | "offline" =
    anyStore.selfStatus ?? "online";

  // Même logique que Profiles.tsx : si pas signed_in => toujours offline
  const onlineStatusForUi: "online" | "away" | "offline" =
    auth.status === "signed_in" ? selfStatus : "offline";

  const activeProfile = useMemo(
    () => getActiveProfile(store),
    [store]
  );

  // On ajoute le statut directement sur le profil passé à la carte
  const activeProfileWithStatus = useMemo(
    () =>
      activeProfile
        ? ({ ...activeProfile, status: onlineStatusForUi } as any)
        : null,
    [activeProfile, onlineStatusForUi]
  );

  const [stats, setStats] = useState<ActiveProfileStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const s = await buildStatsForProfile(store, activeProfile);
      if (!cancelled) setStats(s);
    })();

    return () => {
      cancelled = true;
    };
  }, [store, activeProfile]);

  const tickerItems = useMemo(
    () => buildArcadeItems(store, activeProfile, t),
    [store, activeProfile, t]
  );

  return (
    <div
      style={{
        minHeight: "100%",
        background: "#05060C",
        color: "#FFFFFF",
        display: "flex",
        justifyContent: "center",
        padding: "16px 12px 84px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: PAGE_MAX_WIDTH,
        }}
      >
        {/* ------------ Haut de page (conservé / stylé dashboard) ------------ */}
        <div
          style={{
            borderRadius: 28,
            padding: 18,
            marginBottom: 16,
            background:
              "linear-gradient(135deg, rgba(8,10,20,0.98), rgba(14,18,34,0.98))",
            border: `1px solid ${
              theme.borderSoft ?? "rgba(255,255,255,0.10)"
            }`,
            boxShadow: "0 20px 40px rgba(0,0,0,0.7)",
          }}
        >
          <div
            style={{
              alignSelf: "center",
              display: "inline-flex",
              padding: "4px 16px",
              borderRadius: 999,
              border: `1px solid ${theme.primary ?? "#F6C256"}`,
              background:
                "linear-gradient(135deg, rgba(0,0,0,0.9), rgba(255,255,255,0.06))",
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: "uppercase",
                color: theme.primary ?? "#F6C256",
              }}
            >
              {t("home.welcome", "Bienvenue")}
            </span>
          </div>

          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: 2.4,
              textAlign: "center",
              textTransform: "uppercase",
              color: theme.primary ?? "#F6C256",
              textShadow: `0 0 14px ${
                theme.primaryGlow ?? "rgba(246,194,86,0.55)"
              }`,
            }}
          >
            DARTS COUNTER
          </div>
        </div>

        {/* ------------ Carte joueur actif + carrousel stats ------------ */}
        {activeProfileWithStatus && stats && (
          <ActiveProfileCard
            profile={activeProfileWithStatus}
            stats={stats}
          />
        )}

        {/* ------------ Bandeau arcade (infos importantes) ------------ */}
        <ArcadeTicker items={tickerItems} />

        {/* ------------ Gros boutons de navigation ------------ */}
        <div
          style={{
            marginTop: 22,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <HomeBigButton
            label={t("home.profiles", "Profils")}
            subtitle={t(
              "home.profiles.subtitle",
              "Gérer tes profils, avatars, amis et BOTS"
            )}
            icon="user"
            onClick={() => go("profiles")}
          />
          <HomeBigButton
            label={t("home.localPlay", "Jeu local")}
            subtitle={t(
              "home.localPlay.subtitle",
              "Accéder à tous les modes de jeu locaux"
            )}
            icon="target"
            onClick={() => go("local")}
          />
          <HomeBigButton
            label={t("home.online", "Online")}
            subtitle={t(
              "home.online.subtitle",
              "Matchs en ligne, salons et classement"
            )}
            icon="globe"
            onClick={() => go("online")}
          />
          <HomeBigButton
            label={t("home.stats", "Stats")}
            subtitle={t(
              "home.stats.subtitle",
              "Tous tes dashboards de performance"
            )}
            icon="stats"
            onClick={() => go("stats")}
          />
          <HomeBigButton
            label={t("home.settings", "Réglages")}
            subtitle={t(
              "home.settings.subtitle",
              "Thèmes, langues et options avancées"
            )}
            icon="settings"
            onClick={() => go("settings")}
          />
        </div>
      </div>
    </div>
  );
}

// ---------- Gros boutons Home ----------

type HomeBtnProps = {
  label: string;
  subtitle: string;
  icon: "user" | "target" | "globe" | "stats" | "settings";
  onClick: () => void;
};

function HomeBigButton({ label, subtitle, icon, onClick }: HomeBtnProps) {
  const { theme } = useTheme();

  const Icon = useMemo(() => {
    const common = {
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    } as const;

    switch (icon) {
      case "user":
        return (
          <svg width={24} height={24} viewBox="0 0 24 24">
            <path
              {...common}
              d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4Z"
            />
          </svg>
        );
      case "target":
        return (
          <svg width={24} height={24} viewBox="0 0 24 24">
            <circle {...common} cx="12" cy="12" r="9" />
            <circle {...common} cx="12" cy="12" r="5" />
            <path {...common} d="M12 7v5l3 3" />
          </svg>
        );
      case "globe":
        return (
          <svg width={24} height={24} viewBox="0 0 24 24">
            <circle {...common} cx="12" cy="12" r="9" />
            <path
              {...common}
              d="M3 12h18M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9Z"
            />
          </svg>
        );
      case "stats":
        return (
          <svg width={24} height={24} viewBox="0 0 24 24">
            <path {...common} d="M4 19V9M10 19V5M16 19v-7M4 19h16" />
          </svg>
        );
      case "settings":
      default:
        return (
          <svg width={24} height={24} viewBox="0 0 24 24">
            <path
              {...common}
              d="M19.4 13a7.7 7.7 0 0 0 .1-1 7.7 7.7 0 0 0-.1-1l2-1.5a.5.5 0 0 0 .1-.6l-1.9-3.3a.5.5 0 0 0-.6-.2l-2.3.9a7.3 7.3 0 0 0-1.7-1L14.7 2h-3.4L10.9 4.3a7.3 7.3 0 0 0-1.7 1l-2.3-.9a.5.5 0 0 0-.6.2L4.4 8a.5.5 0 0 0 .1.6L6.5 10a7.7 7.7 0 0 0-.1 1 7.7 7.7 0 0 0 .1 1l-2 1.5a.5.5 0 0 0-.1.6l1.9 3.3a.5.5 0 0 0 .6.2l2.3-.9a7.3 7.3 0 0 0 1.7 1l.4 2.3h3.4l.4-2.3a7.3 7.3 0 0 0 1.7-1l2.3.9a.5.5 0 0 0 .6-.2l1.9-3.3a.5.5 0 0 0-.1-.6ZM12 15a3 3 0 1 1 3-3 3 3 0 0 1-3 3Z"
            />
          </svg>
        );
    }
  }, [icon, theme]);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        borderRadius: 22,
        padding: 14,
        border: "none",
        background:
          "linear-gradient(135deg, rgba(10,12,24,0.98), rgba(18,22,40,0.98))",
        boxShadow: "0 14px 30px rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        color: theme.textStrong ?? "#FFFFFF",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 16,
            background:
              "radial-gradient(circle at 30% 0%, rgba(255,255,255,0.06), rgba(5,7,16,1))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: theme.primary ?? "#F6C256",
            boxShadow: "0 10px 20px rgba(0,0,0,0.75)",
          }}
        >
          {Icon}
        </div>
        <div style={{ textAlign: "left" }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              marginBottom: 2,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 12,
              color: theme.textSoft ?? "rgba(255,255,255,0.7)",
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: `1px solid ${
            theme.borderSoft ?? "rgba(255,255,255,0.4)"
          }`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          opacity: 0.8,
        }}
      >
        ▶
      </div>
    </button>
  );
}
