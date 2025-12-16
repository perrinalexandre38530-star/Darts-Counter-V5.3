// =============================================================
// src/lib/statsUnifiedAgg.ts
// PHASE 2 — Agrégateurs unifiés (basés sur NormalizedMatch)
// ✅ Dashboard player (avg3, bestVisit, bestCO, winRate, evolution, buckets, sessionsByMode)
// =============================================================

import type { NormalizedMatch } from "./statsNormalized";

type VisitBucket = "0-59" | "60-99" | "100+" | "140+" | "180";
type PlayerDistribution = Record<VisitBucket, number>;

export type UnifiedPlayerDashboardStats = {
  playerId: string;
  playerName: string;
  avg3Overall: number;
  bestVisit: number;
  winRatePct: number;
  bestCheckout?: number;
  evolution: Array<{ date: string; avg3: number }>;
  distribution: PlayerDistribution;
  sessionsByMode?: Record<string, number>;
};

const N = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
const fmt1 = (x: number) => Math.round(x * 10) / 10;

function bucketForVisit(score: number): VisitBucket {
  if (score >= 180) return "180";
  if (score >= 140) return "140+";
  if (score >= 100) return "100+";
  if (score >= 60) return "60-99";
  return "0-59";
}

function safeDate(ts: number) {
  try {
    const d = new Date(ts);
    // format court et stable
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}/${d.getFullYear()}`;
  } catch {
    return "—";
  }
}

export function buildDashboardFromNormalized(
  playerId: string,
  playerName: string,
  matches: NormalizedMatch[]
): UnifiedPlayerDashboardStats {
  const dist: PlayerDistribution = {
    "0-59": 0,
    "60-99": 0,
    "100+": 0,
    "140+": 0,
    "180": 0,
  };

  const sessionsByMode: Record<string, number> = {};
  let totalX01VisitScore = 0;
  let totalX01Visits = 0;

  let bestVisit = 0;
  let bestCheckout = 0;

  let matchesPlayed = 0;
  let wins = 0;

  const evolution: Array<{ date: string; avg3: number }> = [];

  for (const m of matches || []) {
    const playersIn = (m.players || []).some((p) => String(p.playerId) === String(playerId));
    if (!playersIn) continue;

    matchesPlayed += 1;
    sessionsByMode[m.mode || "unknown"] = (sessionsByMode[m.mode || "unknown"] || 0) + 1;

    // win (si winnerIds contient le playerId)
    if ((m.winnerIds || []).some((w) => String(w) === String(playerId))) {
      wins += 1;
    }

    // X01 : visits
    if (m.mode === "x01") {
      const myVisits = (m.visits || []).filter((v) => String(v.playerId) === String(playerId));
      if (myVisits.length) {
        let sum = 0;
        for (const v of myVisits) {
          const sc = N(v.score, 0);
          sum += sc;

          // best visit
          if (sc > bestVisit) bestVisit = sc;

          // distribution
          dist[bucketForVisit(sc)] += 1;

          // best checkout (visit marquée checkout)
          if (v.isCheckout) {
            if (sc > bestCheckout) bestCheckout = sc;
          }
        }

        totalX01VisitScore += sum;
        totalX01Visits += myVisits.length;

        const matchAvg3 = myVisits.length ? sum / myVisits.length : 0;
        evolution.push({ date: safeDate(m.date || Date.now()), avg3: fmt1(matchAvg3) });
      }
    }
  }

  const avg3Overall = totalX01Visits ? totalX01VisitScore / totalX01Visits : 0;
  const winRatePct = matchesPlayed ? (wins / matchesPlayed) * 100 : 0;

  // tri évolution par date (au cas où)
  const evoSorted = evolution
    .map((e) => e)
    .sort((a, b) => {
      // on tente un tri via “dd/mm/yyyy”
      const pa = a.date.split("/").map((x) => Number(x));
      const pb = b.date.split("/").map((x) => Number(x));
      const ta = pa.length === 3 ? new Date(pa[2], pa[1] - 1, pa[0]).getTime() : 0;
      const tb = pb.length === 3 ? new Date(pb[2], pb[1] - 1, pb[0]).getTime() : 0;
      return ta - tb;
    });

  return {
    playerId,
    playerName,
    avg3Overall: fmt1(avg3Overall),
    bestVisit: N(bestVisit, 0),
    winRatePct: fmt1(winRatePct),
    bestCheckout: bestCheckout ? N(bestCheckout, 0) : undefined,
    evolution: evoSorted,
    distribution: dist,
    sessionsByMode,
  };
}
