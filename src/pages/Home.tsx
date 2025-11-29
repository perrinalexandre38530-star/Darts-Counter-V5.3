// =============================================================
// src/pages/Home.tsx — Home v2 (dashboard futuriste)
// - Haut de page : "Bienvenue" + logo DARTS COUNTER (centré + animé)
// - Carte joueur actif (ActiveProfileCard) : avatar + statut + carrousel de stats
// - Bandeau arcade (ArcadeTicker) : infos importantes avec image spécifique
// - Gros boutons de navigation (Profils / Local / Online / Stats / Réglages)
// - Stats du joueur actif :
//     • X01 global + X01 multi via statsBridge
//     • Training X01 via TrainingStore (localStorage, legacy inclus)
//     • Cricket via getCricketProfileStats (profil)
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

// 🔗 Stats X01 (quick + historique) + Cricket
import {
  getBasicProfileStatsAsync,
  getCricketProfileStats,
} from "../lib/statsBridge";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

const PAGE_MAX_WIDTH = 520;

// ------------------------------------------------------------
// Tickers : images multiples par thème (choix aléatoire)
// (base GitHub raw pour que ça marche sur le téléphone)
// ------------------------------------------------------------
const GH_IMG_BASE =
  "https://raw.githubusercontent.com/perrinalexandre38530-star/Darts-Counter-V5.3/main/public/img/";

const TICKER_IMAGES = {
  records: [
    "ticker-records.jpg",
    // "ticker-records-2.jpg",
    // "ticker-records-3.jpg",
  ],
  local: [
    "ticker-x01.jpg",
    // "ticker-x01-2.jpg",
  ],
  onlineLast: [
    "ticker-online.jpg",
    // "ticker-online-2.jpg",
  ],
  leaderboard: [
    "ticker-leaderboard.jpg",
    // "ticker-leaderboard-2.jpg",
  ],
  training: [
    "ticker-training.jpg",
    // "ticker-training-2.jpg",
  ],
  global: [
    "ticker-global.jpg",
    // "ticker-global-2.jpg",
  ],
  tip: [
    "ticker-tip.jpg",
    // "ticker-tip-2.jpg",
  ],
} as const;

function pickTickerImage<K extends keyof typeof TICKER_IMAGES>(key: K): string {
  const arr = TICKER_IMAGES[key];
  if (!arr || arr.length === 0) return "";
  const idx = Math.floor(Math.random() * arr.length);
  return GH_IMG_BASE + arr[idx];
}

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

/* ============================================================
   Aggreg Training X01 pour 1 profil (dc_training_x01_stats_v1)
   - Compatible ancien format sans profileId (legacy)
============================================================ */

const TRAINING_X01_STATS_KEY = "dc_training_x01_stats_v1";

type TrainingX01Agg = {
  sessions: number;
  totalDarts: number;
  sumAvg3D: number;
  hitsS: number;
  hitsD: number;
  hitsT: number;
  bestCheckout: number | null;
};

function makeEmptyTrainingAgg(): TrainingX01Agg {
  return {
    sessions: 0,
    totalDarts: 0,
    sumAvg3D: 0,
    hitsS: 0,
    hitsD: 0,
    hitsT: 0,
    bestCheckout: null,
  };
}

function loadTrainingAggForProfile(profileId: string): TrainingX01Agg {
  if (typeof window === "undefined") return makeEmptyTrainingAgg();

  try {
    const raw = window.localStorage.getItem(TRAINING_X01_STATS_KEY);
    if (!raw) return makeEmptyTrainingAgg();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return makeEmptyTrainingAgg();

    const agg = makeEmptyTrainingAgg();

    for (const row of parsed) {
      if (!row) continue;

      // ⚠️ Compat ancien format :
      // - si profileId présent ➜ on filtre dessus
      // - si PAS de profileId ➜ on considère que c'est du "legacy"
      //   et on l'inclut pour tous les profils (donc aussi l'actif)
      const hasProfileId =
        row.profileId !== undefined &&
        row.profileId !== null &&
        String(row.profileId) !== "";

      if (hasProfileId && String(row.profileId) !== profileId) {
        continue;
      }

      // ➜ Ici : soit c'est bien ce profil, soit c'est du legacy sans profilId
      agg.sessions += 1;
      agg.totalDarts += Number(row.darts) || 0;
      agg.sumAvg3D += Number(row.avg3D) || 0;
      agg.hitsS += Number(row.hitsS) || 0;
      agg.hitsD += Number(row.hitsD) || 0;
      agg.hitsT += Number(row.hitsT) || 0;

      const bestCheckoutRaw =
        row.bestCheckout !== undefined && row.bestCheckout !== null
          ? row.bestCheckout
          : row.checkout;

      const bestCheckout =
        bestCheckoutRaw === null || bestCheckoutRaw === undefined
          ? null
          : Number(bestCheckoutRaw) || 0;

      if (
        bestCheckout &&
        (!agg.bestCheckout || bestCheckout > agg.bestCheckout)
      ) {
        agg.bestCheckout = bestCheckout;
      }
    }

    return agg;
  } catch (e) {
    console.warn("[Home] loadTrainingAggForProfile failed", e);
    return makeEmptyTrainingAgg();
  }
}

/**
 * buildStatsForProfile(profileId)
 * - X01 global + X01 multi + records via statsBridge
 * - Complète avec Training X01 (localStorage dc_training_x01_stats_v1)
 *   en incluant aussi les sessions legacy (sans profileId)
 * - Complète avec Cricket profil via getCricketProfileStats
 * - Online / Horloge restent à 0 pour l’instant
 */
async function buildStatsForProfile(
  profileId: string
): Promise<ActiveProfileStats> {
  try {
    const base: any = await getBasicProfileStatsAsync(profileId);

    // Cricket : on sécurise avec un try interne au cas où
    let cricket: any = null;
    try {
      cricket = await getCricketProfileStats(profileId);
    } catch (e) {
      console.warn("[Home] getCricketProfileStats failed", e);
    }

    const games = Number(base?.games || 0);
    const wins = Number(base?.wins || 0);
    const avg3 = Number(base?.avg3 || 0);
    const bestVisit = Number(base?.bestVisit || 0);
    const bestCheckout = Number(base?.bestCheckout || 0);

    // winRate dans base = 0..100 (si présent)
    const winRatePct = Number(base?.winRate != null ? base.winRate : 0);
    const winRate01 =
      winRatePct > 0 ? winRatePct / 100 : games > 0 ? wins / games : 0;

    // Rating global : pour l’instant, on réutilise la moy. 3D
    const ratingGlobal = avg3;

    // 🔹 Training X01 (agrégat localStorage par profil + legacy)
    const tAgg = loadTrainingAggForProfile(profileId);
    const trainingAvg3D =
      tAgg.sessions > 0 ? tAgg.sumAvg3D / tAgg.sessions : 0;

    // 🔹 Cricket (profil) — mapping macro pour débloquer le slide
    const cricketMatches = Number(cricket?.matchesTotal ?? 0);
    const cricketBestPoints = Number(cricket?.bestPointsInMatch ?? 0);
    const cricketWinsSolo = Number(cricket?.winsSolo ?? 0);
    const cricketWinsTeams = Number(cricket?.winsTeams ?? 0);
    const cricketWinsGeneric = Number(cricket?.wins ?? 0);
    const cricketWins =
      cricketWinsSolo + cricketWinsTeams + cricketWinsGeneric;
    const cricketWinRate =
      cricketMatches > 0 ? cricketWins / cricketMatches : 0;

    const s: ActiveProfileStats = {
      // ---- Vue globale (tous jeux confondus, pour l’instant X01) ----
      ratingGlobal,
      winrateGlobal: winRate01, // 0..1
      avg3DGlobal: avg3,
      sessionsGlobal: games,
      favoriteNumberLabel: null,

      // ---- Records ----
      recordBestVisitX01: bestVisit,
      recordBestCOX01: bestCheckout,
      recordMinDarts501: null,
      recordBestAvg3DX01: avg3,
      recordBestStreak: null,
      recordBestCricketScore: cricketBestPoints || null,

      // ---- Online (non branché pour l’instant) ----
      onlineMatches: 0,
      onlineWinrate: 0,
      onlineAvg3D: 0,
      onlineBestVisit: 0,
      onlineBestCO: 0,
      onlineRank: null,
      onlineBestRank: null,

      // ---- X01 Multi ----
      x01MultiAvg3D: avg3,
      x01MultiSessions: games,
      x01MultiWinrate: winRate01,
      x01MultiBestVisit: bestVisit,
      x01MultiBestCO: bestCheckout,
      x01MultiMinDartsLabel: null,

      // ---- Cricket (macro profil) ----
      cricketPointsPerRound: cricketBestPoints || 0, // record points / match
      cricketHitsTotal: cricketMatches || 0, // nb de parties jouées
      cricketCloseRate: cricketWinRate || 0,
      cricketLegsWinrate: cricketWinRate || 0,
      cricketAvgClose201918: 0,
      cricketOpenings: cricketMatches || 0,

      // ---- Training X01 (agrégat réel) ----
      trainingAvg3D,
      trainingHitsS: tAgg.hitsS || 0,
      trainingHitsD: tAgg.hitsD || 0,
      trainingHitsT: tAgg.hitsT || 0,
      // pour l’instant pas d’objectifs stockés → on laisse 0 => "—" dans la carte
      trainingGoalSuccessRate: 0,
      trainingBestCO: tAgg.bestCheckout ?? 0,

      // ---- Tour de l'Horloge (sera branché ensuite) ----
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

// Bandeau arcade : messages + images différentes (textes traduits via t)
// ⚠️ Version dynamique : se base sur les stats du joueur actif
function buildArcadeItems(
  _store: Store,
  profile: Profile | null,
  stats: ActiveProfileStats | null | undefined,
  t: (k: string, d?: string) => string
): ArcadeTickerItem[] {
  const items: ArcadeTickerItem[] = [];
  const s: ActiveProfileStats = stats ?? emptyActiveProfileStats();

  const sessionsGlobal = s.sessionsGlobal ?? 0;
  const winrateGlobalPct =
    s.winrateGlobal != null ? Math.round(s.winrateGlobal * 100) : null;

  const x01MultiSessions = s.x01MultiSessions ?? 0;

  const onlineMatches = s.onlineMatches ?? 0;
  const onlineWinratePct =
    s.onlineWinrate != null ? Math.round(s.onlineWinrate * 100) : null;
  const onlineBestRank = s.onlineBestRank ?? s.onlineRank ?? null;

  const trainingHitsTotal =
    (s.trainingHitsS ?? 0) +
    (s.trainingHitsD ?? 0) +
    (s.trainingHitsT ?? 0);
  const trainingGoalPct =
    s.trainingGoalSuccessRate != null
      ? Math.round(s.trainingGoalSuccessRate * 100)
      : null;

  const clockTargets = s.clockTargetsHit ?? 0;

  const hasRecordX01 =
    (s.recordBestVisitX01 ?? 0) > 0 ||
    (s.recordBestCOX01 ?? 0) > 0 ||
    (s.recordMinDarts501 ?? 0) > 0 ||
    (s.recordBestAvg3DX01 ?? 0) > 0;

  // ---------- 1) Derniers records ----------
  items.push({
    id: "last-records",
    title: t("home.ticker.records", "Derniers records"),
    text: hasRecordX01
      ? t(
          "home.ticker.records.text.dynamic",
          "Plusieurs records X01 déjà enregistrés sur ce profil."
        )
      : t(
          "home.ticker.records.text.empty",
          "Aucun record pour l’instant, lance un premier match pour en créer."
        ),
    detail: hasRecordX01
      ? [
          s.recordBestVisitX01 != null
            ? `Best visit : ${s.recordBestVisitX01}`
            : null,
          s.recordBestCOX01 != null ? `Best CO : ${s.recordBestCOX01}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : "",
    backgroundImage: pickTickerImage("records"),
    accentColor: "#F6C256",
  });

  // ---------- 2) Dernier match / activité locale ----------
  items.push({
    id: "last-local-match",
    title: t("home.ticker.localLast", "Dernier match local"),
    text:
      x01MultiSessions > 0
        ? t(
            "home.ticker.localLast.text.dynamic",
            `Tu as déjà joué ${x01MultiSessions} matchs X01 multi en local.`
          )
        : t(
            "home.ticker.localLast.text.empty",
            "Aucun match local pour l’instant, invite des amis et lance une partie."
          ),
    detail:
      x01MultiSessions > 0 ? `${x01MultiSessions} matchs X01 multi` : "",
    backgroundImage: pickTickerImage("local"),
    accentColor: "#52FFC4",
  });

  // ---------- 3) Dernier match / activité online ----------
  items.push({
    id: "last-online-match",
    title: t("home.ticker.onlineLast", "Dernier match online"),
    text:
      onlineMatches > 0
        ? t(
            "home.ticker.onlineLast.text.dynamic",
            `Tu as joué ${onlineMatches} matchs online.`
          )
        : t(
            "home.ticker.onlineLast.text.empty",
            "Aucun duel online pour l’instant, crée un salon pour affronter tes amis."
          ),
    detail:
      onlineMatches > 0
        ? [
            `${onlineMatches} matchs`,
            onlineWinratePct != null
              ? `${onlineWinratePct}% de victoires`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : "",
    backgroundImage: pickTickerImage("onlineLast"),
    accentColor: "#5ED3FF",
  });

  // ---------- 4) Leader / meilleur rang online ----------
  items.push({
    id: "online-leader",
    title: t("home.ticker.onlineLeader", "Leader du classement"),
    text:
      onlineBestRank != null
        ? t(
            "home.ticker.onlineLeader.text.dynamic",
            `Ton meilleur rang online est #${onlineBestRank}.`
          )
        : t(
            "home.ticker.onlineLeader.text.empty",
            "Monte dans le classement en enchaînant les victoires online."
          ),
    backgroundImage: pickTickerImage("leaderboard"),
    accentColor: "#FF5E9E",
  });

  // ---------- 5) Training X01 ----------
  items.push({
    id: "training-summary",
    title: t("home.ticker.training", "Training du moment"),
    text:
      trainingHitsTotal > 0
        ? t(
            "home.ticker.training.text.dynamic",
            `Tu as déjà enregistré ${trainingHitsTotal} hits en Training X01.`
          )
        : t(
            "home.ticker.training.text.empty",
            "Aucun Training X01 enregistré, lance une session pour travailler tes segments."
          ),
    detail:
      trainingHitsTotal > 0 && trainingGoalPct != null
        ? `Objectifs réussis : ${trainingGoalPct}%`
        : "",
    backgroundImage: pickTickerImage("training"),
    accentColor: "#9EFF5E",
  });

  // ---------- 6) Stats globales / mois ----------
  items.push({
    id: "month-summary",
    title: t("home.ticker.month", "Stats du profil"),
    text:
      sessionsGlobal > 0
        ? t(
            "home.ticker.month.text.dynamic",
            `Ce profil a enregistré ${sessionsGlobal} sessions au total.`
          )
        : t(
            "home.ticker.month.text.empty",
            "Aucune session enregistrée, commence par un match X01 ou un training."
          ),
    detail: [
      sessionsGlobal > 0 ? `${sessionsGlobal} sessions` : null,
      winrateGlobalPct != null ? `${winrateGlobalPct}% de victoires` : null,
      clockTargets > 0 ? `${clockTargets} cibles à l’Horloge` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    backgroundImage: pickTickerImage("global"),
    accentColor: "#F6C256",
  });

  // ---------- 7) Astuce du jour ----------
  if (profile) {
    items.push({
      id: "tip-of-day",
      title: t("home.ticker.tip", "Astuce du jour"),
      text: t(
        "home.ticker.tip.text",
        "Ancre ta finition préférée en la rejouant régulièrement."
      ),
      backgroundImage: pickTickerImage("tip"),
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

  // Si pas signed_in => toujours offline
  const onlineStatusForUi: "online" | "away" | "offline" =
    auth.status === "signed_in" ? selfStatus : "offline";

  const activeProfile = useMemo(() => getActiveProfile(store), [store]);

  // 🔢 Stats du joueur actif (chargées async pour ActiveProfileCard + ArcadeTicker)
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

 // On laisse tourner le random à chaque render (au moins à chaque reload)
const tickerItems = buildArcadeItems(store, activeProfile, stats, t);


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

        {/* ------------ Carte joueur actif + carrousel stats (ActiveProfileCard) ------------ */}
        {activeProfile && (
          <ActiveProfileCard
            profile={activeProfile}
            stats={stats}
            status={onlineStatusForUi}
          />
        )}

        {/* ------------ Bandeau arcade (infos importantes dynamiques) ------------ */}
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
            label={t("home.nav.profiles", "Profils")}
            subtitle={t(
              "home.nav.profiles.desc",
              "Profils locaux, avatars & BOTS"
            )}
            icon="user"
            onClick={() => go("profiles")}
          />
          <HomeBigButton
            label={t("home.nav.local", "Local")}
            subtitle={t(
              "home.nav.local.desc",
              "Jouer sur cette cible en présentiel"
            )}
            icon="target"
            onClick={() => go("local")}
          />
          <HomeBigButton
            label={t("home.nav.online", "Online")}
            subtitle={t(
              "home.nav.online.desc",
              "Matchs à distance avec tes amis"
            )}
            icon="globe"
            onClick={() => go("online")}
          />
          <HomeBigButton
            label={t("home.nav.stats", "Stats")}
            subtitle={t(
              "home.nav.stats.desc",
              "Dashboards, courbes, historique"
            )}
            icon="stats"
            onClick={() => go("stats")}
          />
          <HomeBigButton
            label={t("home.nav.settings", "Réglages")}
            subtitle={t(
              "home.nav.settings.desc",
              "Thèmes, langue, reset complet"
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
