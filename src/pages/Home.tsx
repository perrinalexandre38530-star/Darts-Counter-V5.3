// =============================================================
// src/pages/Home.tsx — Home v2 (dashboard futuriste)
// - Haut de page : "Bienvenue" + logo DARTS COUNTER (centré + animé)
// - Carte joueur actif (ActiveProfileCard) : avatar + statut + carrousel de stats
// - Bandeau arcade (ArcadeTicker) : infos importantes avec image spécifique
// - Gros boutons de navigation (Profils / Local / Online / Stats / Réglages)
// - Stats du joueur actif : branchées sur statsBridge (X01 global + X01 multi)
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

// 🔗 Stats X01 (quick + historique)
import { getBasicProfileStatsAsync } from "../lib/statsBridge";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

const PAGE_MAX_WIDTH = 520;

/* ============================================================
   Helpers
============================================================ */

function getActiveProfile(store: Store): Profile | null {
  const anyStore = store as any;
  const profiles: Profile[] = anyStore.profiles ?? [];
  const activeProfileId: string | null = anyStore.activeProfileId ?? null;
  if (!profiles.length) return null;
  if (!activeProfileId) return profiles[0];
  return profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
}

// Stats vides (pour init / fallback)
function emptyActiveProfileStats(): ActiveProfileStats {
  return {
    // ---- Vue globale ----
    ratingGlobal: 0,
    winrateGlobal: 0,
    avg3DGlobal: 0,
    sessionsGlobal: 0,
    favoriteNumberLabel: null,

    // ---- Records ----
    recordBestVisitX01: 0,
    recordBestCOX01: 0,
    recordMinDarts501: null,
    recordBestAvg3DX01: 0,
    recordBestStreak: null,
    recordBestCricketScore: null,

    // ---- Online ----
    onlineMatches: 0,
    onlineWinrate: 0,
    onlineAvg3D: 0,
    onlineBestVisit: 0,
    onlineBestCO: 0,
    onlineRank: null,
    onlineBestRank: null,

    // ---- X01 Multi ----
    x01MultiAvg3D: 0,
    x01MultiSessions: 0,
    x01MultiWinrate: 0,
    x01MultiBestVisit: 0,
    x01MultiBestCO: 0,
    x01MultiMinDartsLabel: null,

    // ---- Cricket ----
    cricketPointsPerRound: 0,
    cricketHitsTotal: 0,
    cricketCloseRate: 0,
    cricketLegsWinrate: 0,
    cricketAvgClose201918: 0,
    cricketOpenings: 0,

    // ---- Training X01 ----
    trainingAvg3D: 0,
    trainingHitsS: 0,
    trainingHitsD: 0,
    trainingHitsT: 0,
    trainingGoalSuccessRate: 0,
    trainingBestCO: 0,

    // ---- Tour de l'Horloge ----
    clockTargetsHit: 0,
    clockSuccessRate: 0,
    clockTotalTimeSec: 0,
    clockBestStreak: 0,
  };
}

/**
 * buildStatsForProfile(profileId)
 * - Lit les quick-stats + historique via statsBridge
 * - Pour l’instant : branche X01 global + X01 multi + records
 *   (Online / Cricket / Training / Horloge restent à 0 → slides masquées)
 */
async function buildStatsForProfile(
  profileId: string
): Promise<ActiveProfileStats> {
  try {
    const base = await getBasicProfileStatsAsync(profileId);

    const games = Number(base.games || 0);
    const wins = Number(base.wins || 0);
    const avg3 = Number(base.avg3 || 0);
    const bestVisit = Number(base.bestVisit || 0);
    const bestCheckout = Number(base.bestCheckout || 0);

    // winRate dans base = 0..100 (si présent)
    const winRatePct = Number(
      (base as any).winRate != null ? (base as any).winRate : 0
    );
    const winRate01 =
      winRatePct > 0 ? winRatePct / 100 : games > 0 ? wins / games : 0;

    // Rating global : pour l’instant, on réutilise la moy. 3D
    const ratingGlobal = avg3;

    const s: ActiveProfileStats = {
      // ---- Vue globale (tous jeux confondus, pour l’instant X01) ----
      ratingGlobal,
      winrateGlobal: winRate01, // 0..1
      avg3DGlobal: avg3,
      sessionsGlobal: games,
      favoriteNumberLabel: null, // Numéro favori : à brancher plus tard (hits par segment)

      // ---- Records ----
      recordBestVisitX01: bestVisit,
      recordBestCOX01: bestCheckout,
      // Min darts 501 + meilleure moy 3D X01 demandent un scan plus fin des legs,
      // on les complètera plus tard.
      recordMinDarts501: null,
      recordBestAvg3DX01: avg3,
      recordBestStreak: null,
      recordBestCricketScore: null,

      // ---- Online (à brancher plus tard sur onlineApi / historique online) ----
      onlineMatches: 0,
      onlineWinrate: 0,
      onlineAvg3D: 0,
      onlineBestVisit: 0,
      onlineBestCO: 0,
      onlineRank: null,
      onlineBestRank: null,

      // ---- X01 Multi (on réutilise les mêmes stats X01 pour l’instant) ----
      x01MultiAvg3D: avg3,
      x01MultiSessions: games,
      x01MultiWinrate: winRate01,
      x01MultiBestVisit: bestVisit,
      x01MultiBestCO: bestCheckout,
      x01MultiMinDartsLabel: null, // ex: "18 darts (501)" quand on aura le calcul

      // ---- Cricket (à brancher sur CricketProfileStats) ----
      cricketPointsPerRound: 0,
      cricketHitsTotal: 0,
      cricketCloseRate: 0,
      cricketLegsWinrate: 0,
      cricketAvgClose201918: 0,
      cricketOpenings: 0,

      // ---- Training X01 (à brancher sur TrainingX01Store) ----
      trainingAvg3D: 0,
      trainingHitsS: 0,
      trainingHitsD: 0,
      trainingHitsT: 0,
      trainingGoalSuccessRate: 0,
      trainingBestCO: 0,

      // ---- Tour de l'Horloge (à brancher sur TrainingStore) ----
      clockTargetsHit: 0,
      clockSuccessRate: 0,
      clockTotalTimeSec: 0,
      clockBestStreak: 0,
    };

    return s;
  } catch (err) {
    console.warn("[Home] buildStatsForProfile error, fallback zeros:", err);
    return emptyActiveProfileStats();
  }
}

// Bandeau arcade : messages + images différentes
function buildArcadeItems(
  _store: Store,
  profile: Profile | null,
  t: (k: string, d: string) => string
): ArcadeTickerItem[] {
  const items: ArcadeTickerItem[] = [];

  // TODO : brancher tes vrais résumés (dernier match, records, leader online, etc.)
  // Pour l’instant, textes génériques mais les images sont déjà séparées par thème.

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

/* ============================================================
   Component
============================================================ */

export default function Home({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const auth = useAuthOnline();

  const primary = theme.primary ?? "#F6C256";
  const homeHeaderCss = `
    @keyframes dcTitlePulse {
      0%,100% { transform: scale(1); text-shadow: 0 0 8px ${primary}55; }
      50% { transform: scale(1.03); text-shadow: 0 0 18px ${primary}AA; }
    }
    @keyframes dcTitleShimmer {
      0% { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }
  `;

  const anyStore = store as any;
  const selfStatus: "online" | "away" | "offline" =
    anyStore.selfStatus ?? "online";

  // Même logique que Profiles.tsx : si pas signed_in => toujours offline
  const onlineStatusForUi: "online" | "away" | "offline" =
    auth.status === "signed_in" ? selfStatus : "offline";

  const activeProfile = useMemo(() => getActiveProfile(store), [store]);

  // 🔢 Stats du joueur actif (chargées async)
  const [stats, setStats] = useState<ActiveProfileStats>(
    () => emptyActiveProfileStats()
  );

  useEffect(() => {
    let cancelled = false;

    if (!activeProfile) {
      setStats(emptyActiveProfileStats());
      return;
    }

    (async () => {
      const s = await buildStatsForProfile(activeProfile.id);
      if (!cancelled) setStats(s);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id]);

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
        <style dangerouslySetInnerHTML={{ __html: homeHeaderCss }} />

        {/* ------------ Haut de page (dashboard + titre animé) ------------ */}
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
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              padding: "5px 18px",
              borderRadius: 999,
              border: `1px solid ${primary}`,
              background:
                "linear-gradient(135deg, rgba(0,0,0,0.9), rgba(255,255,255,0.06))",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1.1,
                textTransform: "uppercase",
                color: primary,
              }}
            >
              {t("home.welcome", "Bienvenue")}
            </span>
          </div>

          <div
            style={{
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: 3,
              textAlign: "center",
              textTransform: "uppercase",
              backgroundImage: `linear-gradient(120deg, ${primary}, #ffffff, ${primary})`,
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              color: "transparent",
              animation:
                "dcTitlePulse 3.6s ease-in-out infinite, dcTitleShimmer 7s linear infinite",
            }}
          >
            DARTS COUNTER
          </div>
        </div>

        {/* ------------ Carte joueur actif + carrousel stats ------------ */}
        {activeProfile && (
          <ActiveProfileCard
            profile={activeProfile}
            stats={stats}
            // Tu pourras plus tard faire évoluer ActiveProfileCard
            // pour accepter `status={onlineStatusForUi}` si besoin.
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

/* ============================================================
   Gros boutons Home
============================================================ */

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
