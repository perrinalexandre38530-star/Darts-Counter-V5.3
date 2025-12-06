// =============================================================
// src/pages/Home.tsx — Home v2 (dashboard futuriste)
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
import { History } from "../lib/history";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

const PAGE_MAX_WIDTH = 520;
const DETAIL_INTERVAL_MS = 7000;
const TIP_SWIPE_THRESHOLD = 25;

// ------------------------------------------------------------
// Tickers : images multiples par thème (choix aléatoire)
// ------------------------------------------------------------
const GH_IMG_BASE =
  "https://raw.githubusercontent.com/perrinalexandre38530-star/Darts-Counter-V5.3/main/public/img/";

const TICKER_IMAGES = {
  records: ["ticker-records.jpg", "ticker-records-2.jpg"],
  local: ["ticker-x01.jpg", "ticker-x01-2.jpg"],
  onlineLast: ["ticker-online.jpg", "ticker-online-2.jpg"],
  leaderboard: ["ticker-leaderboard.jpg", "ticker-leaderboard-2.jpg"],
  training: ["ticker-training.jpg", "ticker-training-2.jpg"],
  global: ["ticker-global.jpg", "ticker-global-2.jpg"],
  tip: ["ticker-tip.jpg", "ticker-tip-2.jpg"],
  tipAdvice: ["ticker-tip-advice.jpg", "ticker-tip-advice-2.jpg"],
  tipAds: ["ticker-tip-ads.jpg", "ticker-tip-ads-2.jpg"],
  tipNews: ["ticker-tip-news.jpg", "ticker-tip-news-2.jpg"],
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

function emptyActiveProfileStats(): ActiveProfileStats {
  return {
    ratingGlobal: 0,
    winrateGlobal: 0,
    avg3DGlobal: 0,
    sessionsGlobal: 0,
    favoriteNumberLabel: null,

    recordBestVisitX01: 0,
    recordBestCOX01: 0,
    recordMinDarts501: null,
    recordBestAvg3DX01: 0,
    recordBestStreak: null,
    recordBestCricketScore: null,

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

/* ============================================================
   Training X01 agrégé (localStorage)
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

      const hasProfileId =
        row.profileId !== undefined &&
        row.profileId !== null &&
        String(row.profileId) !== "";

      if (hasProfileId && String(row.profileId) !== profileId) {
        continue;
      }

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

/* ============================================================
   Tour de l’Horloge agrégé (localStorage)
============================================================ */

const TRAINING_CLOCK_STATS_KEY = "dc_training_clock_stats_v1";

type ClockAgg = {
  runs: number;
  targetsHitTotal: number;
  attemptsTotal: number;
  totalTimeSec: number;
  bestStreak: number;
};

function makeEmptyClockAgg(): ClockAgg {
  return {
    runs: 0,
    targetsHitTotal: 0,
    attemptsTotal: 0,
    totalTimeSec: 0,
    bestStreak: 0,
  };
}

function loadClockAggForProfile(profileId: string): ClockAgg {
  if (typeof window === "undefined") return makeEmptyClockAgg();

  try {
    const raw = window.localStorage.getItem(TRAINING_CLOCK_STATS_KEY);
    if (!raw) return makeEmptyClockAgg();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return makeEmptyClockAgg();

    const agg = makeEmptyClockAgg();

    for (const row of parsed) {
      if (!row) continue;

      const hasProfileId =
        row.profileId !== undefined &&
        row.profileId !== null &&
        String(row.profileId) !== "";

      if (hasProfileId && String(row.profileId) !== profileId) {
        continue;
      }

      const targetsHit = Number(row.targetsHit ?? row.hits ?? 0) || 0;
      const attempts = Number(row.attempts ?? row.throws ?? 0) || 0;
      const timeSec = Number(row.totalTimeSec ?? row.timeSec ?? 0) || 0;
      const streak = Number(row.bestStreak ?? row.streak ?? 0) || 0;

      agg.runs += 1;
      agg.targetsHitTotal += targetsHit;
      agg.attemptsTotal += attempts;
      agg.totalTimeSec += timeSec;
      if (streak > agg.bestStreak) agg.bestStreak = streak;
    }

    return agg;
  } catch (e) {
    console.warn("[Home] loadClockAggForProfile failed", e);
    return makeEmptyClockAgg();
  }
}

/* ============================================================
   buildStatsForProfile
   - + vrai agrégat X01 multi
   - + records minDarts501
============================================================ */

/* ============================================================
   buildStatsForProfile
   - + vrai agrégat X01 multi
   - + records minDarts501
   - + lecture robuste des stats globales (games / wins / winRate)
============================================================ */

async function buildStatsForProfile(
  profileId: string
): Promise<ActiveProfileStats> {
  try {
    const [base, multiRaw, cricket] = await Promise.all([
      getBasicProfileStatsAsync(profileId),
      (async () => {
        try {
          const anyHistory: any = History as any;
          if (anyHistory.list) {
            return await anyHistory.list({
              game: "x01_multi",
              includePlayers: true,
            });
          }
        } catch (e) {
          console.warn("[Home] History.list x01_multi failed", e);
        }
        return [] as any[];
      })(),
      (async () => {
        try {
          return await getCricketProfileStats(profileId);
        } catch (e) {
          console.warn("[Home] getCricketProfileStats failed", e);
          return null;
        }
      })(),
    ]);

    const multiMatches: any[] = Array.isArray(multiRaw) ? multiRaw : [];

    const asNum = (v: any): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    // --------- GLOBAL (games / wins / winRate / avg3 / records) ---------
    const b: any = base ?? {};

    const games =
      asNum(b.games) ||
      asNum(b.gamesTotal) ||
      asNum(b.sessions) ||
      asNum(b.totalGames) ||
      asNum(b.totalSessions) ||
      asNum(b.matchCount) ||
      asNum(b.matches);

    const wins =
      asNum(b.wins) ||
      asNum(b.winsTotal) ||
      asNum(b.victories) ||
      asNum(b.totalWins) ||
      asNum(b.matchWins);

    // winRate peut être stocké en 0-1 ou 0-100
    const winRateRaw =
      asNum(b.winRate) ||
      asNum(b.winrate) ||
      asNum(b.win_rate) ||
      asNum(b.winPct) ||
      asNum(b.win_pct) ||
      asNum(b.winPercentage);

    const winRate01 =
      winRateRaw > 0
        ? winRateRaw > 1.0001
          ? winRateRaw / 100
          : winRateRaw
        : games > 0
        ? wins / games
        : 0;

    const avg3 =
      asNum(b.avg3D) ||
      asNum(b.avg3) ||
      asNum(b.avg_3) ||
      asNum(b.avgThreeDarts);

    const bestVisit =
      asNum(b.bestVisit) ||
      asNum(b.bestVisitScore) ||
      asNum(b.recordBestVisit);

    const bestCheckout =
      asNum(b.bestCheckout) ||
      asNum(b.bestCo) ||
      asNum(b.bestFinish) ||
      asNum(b.recordBestCheckout);

    // --------- Record global "min darts" (profil agrégé) ---------
    const minDartsCandidates: number[] = [];

    const addMinCandidate = (v: any) => {
      const n = asNum(v);
      if (n > 0) minDartsCandidates.push(n);
    };

    if (b && typeof b === "object") {
      // clés explicites
      addMinCandidate(b.minDarts);
      addMinCandidate(b.min_darts);
      addMinCandidate(b.minDarts501);
      addMinCandidate(b.min_darts_501);
      addMinCandidate(b.minDartsX01);
      addMinCandidate(b.fastestLeg);
      addMinCandidate(b.fastest_leg);
      addMinCandidate(b.bestLegDarts);
      addMinCandidate(b.best_leg_darts);
      addMinCandidate(b.recordMinDarts501);
      addMinCandidate(b.record_min_darts_501);

      // scan automatique de toutes les clés contenant "min" + "dart" ou "fastest" + "leg"
      for (const key of Object.keys(b)) {
        const lk = key.toLowerCase();
        if (lk.includes("min") && lk.includes("dart")) addMinCandidate(b[key]);
        if (lk.includes("fastest") && lk.includes("leg")) addMinCandidate(b[key]);
      }
    }

    const minDartsRecord =
      minDartsCandidates.length > 0 ? Math.min(...minDartsCandidates) : 0;

    const ratingGlobal = avg3 || 0;

    // =============================================================
    // ---------- X01 MULTI — AGRÉGATION OFFICIELLE V3 -------------
    // =============================================================

    let multiSessions = 0;
    let multiWins = 0;
    let multiTotalAvg3 = 0;
    let multiTotalAvg3Count = 0;

    let multiBestVisit = 0;
    let multiBestCheckout = 0;
    let multiMinDarts = Infinity;

    try {
      for (const match of multiMatches || []) {
        const summary: any = match.summary ?? match;
        const players: any[] =
          summary?.perPlayer ?? summary?.players ?? match.players ?? [];

        if (!players || !players.length) continue;

        const me =
          players.find(
            (p: any) =>
              p.profileId === profileId ||
              p.playerId === profileId ||
              p.id === profileId
          ) ?? null;

        if (!me) continue;

        multiSessions += 1;

        // win ?
        let isWinner = false;
        if (me.isWinner === true || me.winner === true) isWinner = true;
        if ([me.rank, me.place, me.position].some((v: any) => asNum(v) === 1)) {
          isWinner = true;
        }
        if (
          typeof me.result === "string" &&
          me.result.toLowerCase().startsWith("win")
        ) {
          isWinner = true;
        }
        if (
          typeof me.outcome === "string" &&
          me.outcome.toLowerCase().startsWith("win")
        ) {
          isWinner = true;
        }
        if (
          summary &&
          summary.winnerId &&
          [me.profileId, me.playerId, me.id].some(
            (id: any) => id && String(id) === String(summary.winnerId)
          )
        ) {
          isWinner = true;
        }
        if (isWinner) multiWins += 1;

        // avg3
        const avg3Player =
          asNum(
            me.avg3D ??
              me.avg3 ??
              me.stats?.avg3D ??
              me.stats?.avg3 ??
              0
          ) || 0;

        if (avg3Player > 0) {
          multiTotalAvg3 += avg3Player;
          multiTotalAvg3Count += 1;
        }

        // best visit
        const bv =
          asNum(
            me.bestVisit ??
              me.bestVisitScore ??
              me.best_visit ??
              0
          ) || 0;
        if (bv > multiBestVisit) multiBestVisit = bv;

        // best checkout
        const bco =
          asNum(
            me.bestCheckout ??
              me.bestCo ??
              me.bestFinish ??
              me.best_checkout ??
              0
          ) || 0;
        if (bco > multiBestCheckout) multiBestCheckout = bco;

        // min darts (tous candidats possibles)
        const dartsCandidates: number[] = [];
        const addD = (v: any) => {
          const n = asNum(v);
          if (n > 0) dartsCandidates.push(n);
        };

        addD(me.minDarts);
        addD(me.minDarts501);
        addD(me.bestLegDarts);
        addD(me.fastestLeg);
        addD(me.best_leg_darts);
        addD(summary?.minDarts501);
        addD((match as any).totalDarts501);

        if (dartsCandidates.length > 0) {
          const localMin = Math.min(...dartsCandidates);
          if (localMin > 0 && localMin < multiMinDarts) {
            multiMinDarts = localMin;
          }
        }
      }
    } catch (e) {
      console.warn("[Home] X01 multi aggregate failed", e);
    }

    const hasMulti = multiSessions > 0;

    const x01MultiAvg3D =
      multiTotalAvg3Count > 0 ? multiTotalAvg3 / multiTotalAvg3Count : avg3 || 0;

    const x01MultiWinrate =
      hasMulti && multiSessions > 0
        ? multiWins / multiSessions
        : winRate01;

    const x01MultiMinDartsLabel =
      multiMinDarts !== Infinity
        ? `${multiMinDarts}`
        : minDartsRecord > 0
        ? `${minDartsRecord}`
        : null;

    // ---------- Training X01 ----------
    const tAgg = loadTrainingAggForProfile(profileId);
    const trainingAvg3D =
      tAgg.sessions > 0 ? tAgg.sumAvg3D / tAgg.sessions : 0;

    // ---------- Cricket ----------
    const cricketMatches = asNum(cricket?.matchesTotal);
    const cricketBestPoints = asNum(cricket?.bestPointsInMatch);
    const cricketWinsTotal = asNum(cricket?.winsTotal);
    const cricketWinRate =
      cricketMatches > 0 ? cricketWinsTotal / cricketMatches : 0;

    // ---------- Horloge ----------
    const cAgg = loadClockAggForProfile(profileId);
    const clockTargetsHit = cAgg.targetsHitTotal;
    const clockSuccessRate =
      cAgg.attemptsTotal > 0 ? cAgg.targetsHitTotal / cAgg.attemptsTotal : 0;
    const clockTotalTimeSec = cAgg.totalTimeSec;
    const clockBestStreak = cAgg.bestStreak;

    const s: ActiveProfileStats = {
      // globale
      ratingGlobal,
      winrateGlobal: winRate01,
      avg3DGlobal: avg3 || 0,
      sessionsGlobal: games,
      favoriteNumberLabel: null,

      // records
      recordBestVisitX01: bestVisit || 0,
      recordBestCOX01: bestCheckout || 0,
      recordMinDarts501: minDartsRecord || null,
      recordBestAvg3DX01: avg3 || 0,
      recordBestStreak: null,
      recordBestCricketScore: cricketBestPoints || null,

      // online (sera complété plus tard)
      onlineMatches: 0,
      onlineWinrate: 0,
      onlineAvg3D: 0,
      onlineBestVisit: 0,
      onlineBestCO: 0,
      onlineRank: null,
      onlineBestRank: null,

      // ---- X01 Multi ----
      x01MultiAvg3D,
      x01MultiSessions: hasMulti ? multiSessions : games,
      x01MultiWinrate,
      x01MultiBestVisit: hasMulti ? multiBestVisit : bestVisit || 0,
      x01MultiBestCO: hasMulti ? multiBestCheckout : bestCheckout || 0,
      x01MultiMinDartsLabel: x01MultiMinDartsLabel,

      // cricket
      cricketPointsPerRound: cricketBestPoints || 0,
      cricketHitsTotal: cricketMatches || 0,
      cricketCloseRate: cricketWinRate || 0,
      cricketLegsWinrate: cricketWinRate || 0,
      cricketAvgClose201918: 0,
      cricketOpenings: cricketMatches || 0,

      // training X01
      trainingAvg3D,
      trainingHitsS: tAgg.hitsS || 0,
      trainingHitsD: tAgg.hitsD || 0,
      trainingHitsT: tAgg.hitsT || 0,
      trainingGoalSuccessRate: 0,
      trainingBestCO: tAgg.bestCheckout ?? 0,

      // horloge
      clockTargetsHit,
      clockSuccessRate,
      clockTotalTimeSec,
      clockBestStreak,
    };

    return s;
  } catch (err) {
    console.warn("[Home] buildStatsForProfile error, fallback zeros:", err);
    return emptyActiveProfileStats();
  }
}


/* ============================================================
   Helpers pour les détails du ticker
============================================================ */

type DetailRow = { label: string; value: string };

function fmtNumHome(v?: number | null, decimals = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  const n = Number(v);
  return n % 1 === 0 ? String(n) : n.toFixed(decimals);
}
function fmtPctHome01(v?: number | null): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(0)}%`;
}

/**
 * Détails en dessous du ticker principal
 * -> on renforce "Derniers records" + "Dernier match local" + "Stats du mois"
 */
function buildTickerDetailRows(
  tickerId: string,
  s: ActiveProfileStats,
  t: (k: string, d?: string) => string
): DetailRow[] {
  const rows: DetailRow[] = [];

  const trainingHitsTotal =
    (s.trainingHitsS ?? 0) +
    (s.trainingHitsD ?? 0) +
    (s.trainingHitsT ?? 0);

  switch (tickerId) {
    case "last-records": {
      const snap = getRecordSnapshotFromStats(s);

      if (snap.bestVisit > 0) {
        rows.push({
          label: t("home.detail.bestVisit", "best visit x01"),
          value: fmtNumHome(snap.bestVisit, 0),
        });
      }
      if (snap.bestCo > 0) {
        rows.push({
          label: t("home.detail.bestCO", "best checkout"),
          value: fmtNumHome(snap.bestCo, 0),
        });
      }
      if (snap.bestAvg > 0) {
        rows.push({
          label: t("home.detail.bestAvg3d", "best avg 3d"),
          value: fmtNumHome(snap.bestAvg, 2),
        });
      }
      if (snap.minDarts > 0) {
        rows.push({
          label: t("home.detail.bestMinDarts", "leg le plus court"),
          value: fmtNumHome(snap.minDarts, 0),
        });
      }
      break;
    }

    case "last-local-match": {
      const sessions = s.x01MultiSessions ?? 0;
      if (sessions > 0) {
        rows.push(
          {
            label: t("home.detail.localSessions", "matchs X01 multi"),
            value: fmtNumHome(sessions, 0),
          },
          {
            label: t("home.detail.localWinrate", "win% local"),
            value: fmtPctHome01(s.x01MultiWinrate ?? 0),
          },
          {
            label: t("home.detail.localAvg3d", "moy. 3d"),
            value: fmtNumHome(s.x01MultiAvg3D, 2),
          },
          {
            label: t("home.detail.localBestVisit", "best visit"),
            value: fmtNumHome(s.x01MultiBestVisit, 0),
          },
          {
            label: t("home.detail.localBestCO", "best co"),
            value: fmtNumHome(s.x01MultiBestCO, 0),
          }
        );

        const snap = getRecordSnapshotFromStats(s);
        const minDarts =
          s.x01MultiMinDartsLabel &&
          Number(s.x01MultiMinDartsLabel) > 0
            ? Number(s.x01MultiMinDartsLabel)
            : snap.minDarts;

        if (minDarts > 0) {
          rows.push({
            label: t("home.detail.localMinDarts", "min darts"),
            value: fmtNumHome(minDarts, 0),
          });
        }
      }
      break;
    }

    case "training-summary": {
      if (trainingHitsTotal > 0) {
        rows.push(
          {
            label: t("home.detail.trainingHits", "hits total"),
            value: fmtNumHome(trainingHitsTotal, 0),
          },
          {
            label: t("home.detail.trainingAvg3d", "moy. 3d"),
            value: fmtNumHome(s.trainingAvg3D ?? 0, 2),
          },
          {
            label: t("home.detail.trainingHitsS", "hits S"),
            value: fmtNumHome(s.trainingHitsS ?? 0, 0),
          },
          {
            label: t("home.detail.trainingHitsD", "hits D"),
            value: fmtNumHome(s.trainingHitsD ?? 0, 0),
          },
          {
            label: t("home.detail.trainingHitsT", "hits T"),
            value: fmtNumHome(s.trainingHitsT ?? 0, 0),
          },
          {
            label: t("home.detail.trainingBestCO", "best co"),
            value: fmtNumHome(s.trainingBestCO ?? 0, 0),
          }
        );
      }
      break;
    }

    case "month-summary": {
      const sessions = s.sessionsGlobal ?? 0;
      if (sessions > 0) {
        rows.push(
          {
            label: t("home.detail.globalSessions", "sessions totales"),
            value: fmtNumHome(sessions, 0),
          },
          {
            label: t("home.detail.globalWinrate", "win%"),
            value: fmtPctHome01(s.winrateGlobal ?? 0),
          },
          {
            label: t("home.detail.globalAvg3d", "moy. 3d"),
            value: fmtNumHome(s.avg3DGlobal ?? 0, 2),
          },
          {
            label: t("home.detail.rating", "rating"),
            value: fmtNumHome(s.ratingGlobal ?? 0, 1),
          }
        );
      }
      break;
    }

    case "last-online-match":
    case "online-leader":
    case "tip-of-day":
    default:
      break;
  }

  return rows;
}

/* ============================================================
   Blocs visuels pour les 2 mini-cards
============================================================ */

// Image de fond pour la mini-card STATS (gauche) — différente du bandeau
function pickStatsBackgroundForTicker(tickerId: string): string {
  switch (tickerId) {
    case "last-records":
      return pickTickerImage("leaderboard"); // bandeau = records
    case "last-local-match":
      return pickTickerImage("training"); // bandeau = local
    case "last-online-match":
      return pickTickerImage("leaderboard"); // bandeau = onlineLast
    case "online-leader":
      return pickTickerImage("onlineLast"); // bandeau = leaderboard
    case "training-summary":
      return pickTickerImage("global"); // bandeau = training
    case "month-summary":
      return pickTickerImage("training"); // bandeau = global
    case "tip-of-day":
    default:
      return pickTickerImage("global"); // bandeau = tip
  }
}

// -------- Mini-carousel pour ASTUCES / PUBS / NOUVEAUTÉS (droite) --------

type TipSlide = {
  id: string;
  kind: "tip" | "ad" | "news";
  title: string;
  text: string;
  backgroundImage: string;
};

function buildTipSlides(
  t: (k: string, d?: string) => string
): TipSlide[] {
  return [
    {
      id: "tip-training",
      kind: "tip",
      title: t("home.tip.training.title", "Astuce Training X01"),
      text: t(
        "home.tip.training.text",
        "Travaille toujours la même finition pendant quelques minutes, puis change de cible pour rester focus."
      ),
      backgroundImage: pickTickerImage("tipAdvice"),
    },
    {
      id: "tip-bots",
      kind: "ad",
      title: t("home.tip.bots.title", "Crée un BOT local"),
      text: t(
        "home.tip.bots.text",
        "Ajoute un BOT dans tes profils pour t’entraîner en conditions réelles, même si tu es seul."
      ),
      backgroundImage: pickTickerImage("tipAds"),
    },
    {
      id: "tip-news",
      kind: "news",
      title: t("home.tip.news.title", "Nouveautés Darts Counter"),
      text: t(
        "home.tip.news.text",
        "Découvre les nouveaux thèmes néon, les stats Horloge et bientôt les classements Online."
      ),
      backgroundImage: pickTickerImage("tipNews"),
    },
    {
      id: "tip-clock",
      kind: "tip",
      title: t("home.tip.clock.title", "Astuce Tour de l’Horloge"),
      text: t(
        "home.tip.clock.text",
        "Sur le Tour de l’Horloge, vise toujours un repère visuel précis sur le segment pour gagner en régularité."
      ),
      backgroundImage: pickTickerImage("tipAdvice"),
    },
    {
      id: "tip-stats",
      kind: "news",
      title: t("home.tip.stats.title", "Lis tes stats"),
      text: t(
        "home.tip.stats.text",
        "Va dans l’onglet Stats pour suivre ton avg 3D, tes records et l’évolution de ton niveau."
      ),
      backgroundImage: pickTickerImage("tipNews"),
    },
  ];
}

/* ============================================================
   Petit bloc KPI pour le détail du ticker
============================================================ */
type DetailKpiProps = {
  label: string;
  value: string;
  primary: string;
  theme: any;
};

function DetailKpi({ label, value, primary, theme }: DetailKpiProps) {
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
          fontSize: 9,
          letterSpacing: 0.4,
          opacity: 0.8,
          marginBottom: 3,
          textTransform: "lowercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          height: 2,
          width: 26,
          borderRadius: 999,
          marginBottom: 4,
          background: `linear-gradient(90deg, transparent, ${primary}, transparent)`,
          boxShadow: `0 0 6px ${primary}66`,
        }}
      />
      <div
        style={{
          fontSize: 16,
          fontWeight: 900,
          color: primary,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function getRecordSnapshotFromStats(s: ActiveProfileStats) {
  const bestVisit = s.recordBestVisitX01 || s.x01MultiBestVisit || 0;
  const bestCo = s.recordBestCOX01 || s.x01MultiBestCO || 0;
  const bestAvg = s.recordBestAvg3DX01 || s.x01MultiAvg3D || 0;
  const minDarts =
    s.recordMinDarts501 ??
    (s.x01MultiMinDartsLabel
      ? Number(s.x01MultiMinDartsLabel)
      : 0);

  return { bestVisit, bestCo, bestAvg, minDarts };
}


// Bandeau arcade : messages + images différentes (textes traduits via t)
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

  const recordSnap = getRecordSnapshotFromStats(s);

  const hasRecordX01 =
    recordSnap.bestVisit > 0 ||
    recordSnap.bestCo > 0 ||
    recordSnap.bestAvg > 0 ||
    recordSnap.minDarts > 0;

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
            recordSnap.bestVisit
              ? `Best visit : ${recordSnap.bestVisit}`
              : null,
            recordSnap.bestCo ? `Best CO : ${recordSnap.bestCo}` : null,
            recordSnap.minDarts
              ? `Min darts : ${recordSnap.minDarts}`
              : null,
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

  // ---------- 6) Stats globales / profil ----------
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

/* =============================================================
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

  const onlineStatusForUi: "online" | "away" | "offline" =
    auth.status === "signed_in" ? selfStatus : "offline";

  const activeProfile = useMemo(() => getActiveProfile(store), [store]);

  const [stats, setStats] = useState<ActiveProfileStats>(
    () => emptyActiveProfileStats()
  );

  // index du ticker pour le bloc détail (synchronisé sur ArcadeTicker)
  const [tickerIndex, setTickerIndex] = useState(0);

  // mini-carousel Astuce/Pub/News
  const [tipIndex, setTipIndex] = useState(0);
  const [tipTouchStartX, setTipTouchStartX] = useState<number | null>(null);

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
    () => buildArcadeItems(store, activeProfile, stats, t),
    [store, activeProfile, stats, t]
  );

  // Auto-rotation du bloc détail pour rester synchro avec le bandeau
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!tickerItems.length) return;

    const id = window.setInterval(() => {
      setTickerIndex((prev) =>
        tickerItems.length ? (prev + 1) % tickerItems.length : 0
      );
    }, DETAIL_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [tickerItems.length]);

  // clamp / reset l'index quand la liste change
  useEffect(() => {
    if (!tickerItems.length) {
      setTickerIndex(0);
      return;
    }
    setTickerIndex((i) => (i >= tickerItems.length ? 0 : i));
  }, [tickerItems.length]);

  const currentTicker: ArcadeTickerItem | null =
    tickerItems.length > 0
      ? tickerItems[Math.min(tickerIndex, tickerItems.length - 1)]
      : null;

  const detailRows: DetailRow[] = useMemo(() => {
    if (!currentTicker) return [];
    return buildTickerDetailRows(currentTicker.id, stats, t);
  }, [currentTicker?.id, stats, t]);

  const hasDetailStats = detailRows.length > 0;
  const detailAccent =
    currentTicker?.accentColor ?? theme.primary ?? "#F6C256";

  // Si pas de stats => card gauche = message général
  const statsTitle = hasDetailStats
    ? currentTicker?.title ?? ""
    : t("home.detail.stats.title", "Stats du profil");
  const statsText = hasDetailStats
    ? currentTicker?.text ?? ""
    : t(
        "home.detail.stats.text",
        "Tes stats détaillées apparaîtront ici dès que tu auras joué quelques matchs ou trainings."
      );

  const statsBackgroundImage = currentTicker
    ? pickStatsBackgroundForTicker(currentTicker.id)
    : "";

  // -------- Mini-carousel Astuces / Pubs / News (droite) --------
  const tipSlides = useMemo(() => buildTipSlides(t), [t]);

  // clamp tipIndex si la taille change
  useEffect(() => {
    if (!tipSlides.length) {
      setTipIndex(0);
      return;
    }
    setTipIndex((i) => (i >= tipSlides.length ? 0 : i));
  }, [tipSlides.length]);

  // Auto-slide du mini-carousel Astuce/Pub/News
  useEffect(() => {
    if (typeof window === "undefined" || !tipSlides.length) return;
    const id = window.setInterval(() => {
      setTipIndex((i) =>
        tipSlides.length ? (i + 1) % tipSlides.length : 0
      );
    }, DETAIL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [tipSlides.length]);

  const currentTip: TipSlide | null =
    tipSlides.length > 0
      ? tipSlides[Math.min(tipIndex, tipSlides.length - 1)]
      : null;

  const handleTipTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const x = e.touches[0]?.clientX;
    if (x != null) setTipTouchStartX(x);
  };

  const handleTipTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (tipTouchStartX == null || !tipSlides.length) return;
    const x = e.changedTouches[0]?.clientX ?? tipTouchStartX;
    const dx = x - tipTouchStartX;

    if (Math.abs(dx) < TIP_SWIPE_THRESHOLD) {
      setTipTouchStartX(null);
      return;
    }

    setTipIndex((prev) => {
      if (!tipSlides.length) return 0;
      if (dx < 0) {
        // swipe gauche => slide suivant
        return (prev + 1) % tipSlides.length;
      } else {
        // swipe droite => slide précédent
        return (prev - 1 + tipSlides.length) % tipSlides.length;
      }
    });

    setTipTouchStartX(null);
  };

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

        {/* Haut de page */}
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

        {/* Carte joueur actif */}
        {activeProfile && (
          <ActiveProfileCard
            profile={activeProfile}
            stats={stats}
            status={onlineStatusForUi}
          />
        )}

        {/* Petit bandeau arcade (auto-slide interne) */}
        <ArcadeTicker
          items={tickerItems}
          intervalMs={DETAIL_INTERVAL_MS}
          // on câble TOUT ce qui peut exister côté ArcadeTicker
          onIndexChange={(index: number) => {
            if (!tickerItems.length) return;
            const safe = Math.min(
              Math.max(index, 0),
              tickerItems.length - 1
            );
            setTickerIndex(safe);
          }}
          onActiveIndexChange={(index: number) => {
            if (!tickerItems.length) return;
            const safe = Math.min(
              Math.max(index, 0),
              tickerItems.length - 1
            );
            setTickerIndex(safe);
          }}
        />

        {/* Bloc détail du ticker : 2 mini-cards côte à côte */}
        {currentTicker && (
          <div
            style={{
              marginTop: 10,
              marginBottom: 10,
              borderRadius: 22,
              border: `1px solid ${
                theme.borderSoft ?? "rgba(255,255,255,0.12)"
              }`,
              boxShadow: "0 18px 40px rgba(0,0,0,0.85)",
              padding: 8,
              background:
                "radial-gradient(circle at top, rgba(255,255,255,0.06), rgba(3,4,10,1))",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
              }}
            >
              {/* --------- Card gauche : STATS du slide --------- */}
              <div
                style={{
                  flex: 1,
                  borderRadius: 18,
                  overflow: "hidden",
                  position: "relative",
                  minHeight: 96,
                  backgroundColor: "#05060C",
                  backgroundImage: statsBackgroundImage
                    ? `url("${statsBackgroundImage}")`
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(130deg, rgba(0,0,0,0.85), rgba(0,0,0,0.45))",
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    padding: "8px 9px 9px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      color: detailAccent,
                    }}
                  >
                    {statsTitle}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      lineHeight: 1.35,
                      color: theme.textSoft ?? "rgba(255,255,255,0.9)",
                    }}
                  >
                    {statsText}
                  </div>

                  {hasDetailStats && (
                    <div
                      style={{
                        marginTop: 4,
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0,1fr))",
                        gap: 6,
                      }}
                    >
                      {detailRows.map((row) => (
                        <DetailKpi
                          key={row.label}
                          label={row.label}
                          value={row.value}
                          primary={detailAccent}
                          theme={theme}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* --------- Card droite : ASTUCE / PUB / NOUVEAUTÉ (mini-carousel) --------- */}
              <div
                style={{
                  flex: 1,
                  borderRadius: 18,
                  overflow: "hidden",
                  position: "relative",
                  minHeight: 96,
                  backgroundColor: "#05060C",
                  backgroundImage: currentTip?.backgroundImage
                    ? `url("${currentTip.backgroundImage}")`
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                onTouchStart={handleTipTouchStart}
                onTouchEnd={handleTipTouchEnd}
              >
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(230deg, rgba(0,0,0,0.9), rgba(0,0,0,0.4))",
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    padding: "8px 9px 9px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    height: "100%",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: 0.8,
                        textTransform: "uppercase",
                        color: theme.accent1 ?? "#FFD980",
                        marginBottom: 3,
                      }}
                    >
                      {currentTip?.title ??
                        t(
                          "home.detail.tip.title",
                          "Astuce, pub & nouveautés du moment"
                        )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        lineHeight: 1.35,
                        color: theme.textSoft ?? "rgba(255,255,255,0.9)",
                      }}
                    >
                      {currentTip?.text ??
                        t(
                          "home.detail.tip.text",
                          "Découvre les nouveautés, astuces ou pubs liées à cette section."
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gros boutons de navigation */}
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
