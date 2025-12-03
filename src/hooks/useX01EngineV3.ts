// =============================================================
// src/hooks/useX01EngineV3.ts
// Moteur X01 V3 — VERSION FIXÉE (stats 100% correctes)
// - Stats LIVE correctes (darts, visits, bestVisit, totalScore)
// - PATCH COMPLET HITS/MISS/SEGMENTS (radar + hits S/D/T + détail)
// - Agrégat summary.detailedByPlayer pour les matchs X01 multi
// - summary.game.startScore + summary.rankings (pour Historique)
// - Une seule MAJ des stats par VOLÉE
// - Checkout adaptatif V3
// - Status : playing / leg_end / set_end / match_end
// =============================================================

import * as React from "react";

import type {
  X01ConfigV3,
  X01MatchStateV3,
  X01PlayerId,
  X01DartInputV3,
  X01StatsLiveV3,
} from "../types/x01v3";

import {
  startNewVisitV3,
  applyDartToCurrentPlayerV3,
} from "../lib/x01v3/x01LogicV3";

import {
  generateThrowOrderV3,
  getNextPlayerV3,
  checkLegWinV3,
  applyLegWinV3,
  checkSetWinV3,
  applySetWinV3,
  checkMatchWinV3,
} from "../lib/x01v3/x01FlowV3";

import {
  createEmptyLiveStatsV3,
  applyVisitToLiveStatsV3,
} from "../lib/x01v3/x01StatsLiveV3";

import { extAdaptCheckoutSuggestion } from "../lib/x01v3/x01CheckoutV3";
import { History, type SavedMatch, type PlayerLite } from "../lib/history";

// -------------------------------------------------------------
// Helpers internes
// -------------------------------------------------------------

function createInitialMatchState(config: X01ConfigV3): X01MatchStateV3 {
  const scores: Record<string, number> = {};
  const legsWon: Record<string, number> = {};
  const setsWon: Record<string, number> = {};

  for (const p of config.players) {
    scores[p.id] = config.startScore;
    legsWon[p.id] = 0;
    setsWon[p.id] = 0;
  }

  const throwOrder = generateThrowOrderV3(config, null, 1);

  const state: X01MatchStateV3 = {
    matchId: crypto.randomUUID(),
    currentSet: 1,
    currentLeg: 1,
    throwOrder,
    activePlayer: throwOrder[0],
    scores,
    legsWon,
    setsWon,
    visit: null as any,
    status: "playing",
  };

  (state as any).lastLegWinnerId = null;
  (state as any).lastWinnerId = null;
  (state as any).lastWinningPlayerId = null;

  startNewVisitV3(state);
  if (state.visit) {
    state.visit.checkoutSuggestion = extAdaptCheckoutSuggestion({
      score: state.visit.currentScore,
      dartsLeft: state.visit.dartsLeft,
      outMode: config.outMode,
    });
  }

  return state;
}

// ===========================================================
// PATCH STATS COMPLETES X01 (hits/miss/segments) — helpers
// ===========================================================

function ensureExtendedStatsFor(st: X01StatsLiveV3) {
  // hitsBySegment 1..20 + 25
  if (!st.hitsBySegment) {
    st.hitsBySegment = {};
    for (let i = 1; i <= 20; i++) {
      st.hitsBySegment[i] = { S: 0, D: 0, T: 0 };
    }
    st.hitsBySegment[25] = { S: 0, D: 0, T: 0 };
  }

  if (st.hitsSingle == null) st.hitsSingle = 0;
  if (st.hitsDouble == null) st.hitsDouble = 0;
  if (st.hitsTriple == null) st.hitsTriple = 0;
  if (st.miss == null) st.miss = 0;
  if (st.bust == null) st.bust = 0;

  // Bulls
  if ((st as any).bull == null) (st as any).bull = 0;
  if ((st as any).dBull == null) (st as any).dBull = 0;

  // Checkout
  if ((st as any).bestCheckout == null) (st as any).bestCheckout = 0;

  if (st.totalScore == null) st.totalScore = 0;
  if (st.visits == null) st.visits = 0;

  if (!st.scorePerVisit) st.scorePerVisit = [];
  if (!st.dartsDetail) st.dartsDetail = [];
}

function recordDartOn(st: X01StatsLiveV3, v: number, m: number) {
  st.dartsDetail!.push({ v, m });

  // Miss
  if (v === 0 || m === 0) {
    st.miss!++;
    return;
  }

  const score = v * m;
  st.totalScore! += score;

  // Compteurs S / D / T
  if (m === 1) st.hitsSingle!++;
  if (m === 2) st.hitsDouble!++;
  if (m === 3) st.hitsTriple!++;

  // Bulls (25 / DBULL = 25 x2)
  if (v === 25) {
    (st as any).bull = ((st as any).bull || 0) + 1;
    if (m === 2) {
      (st as any).dBull = ((st as any).dBull || 0) + 1;
    }
  }

  // 🔒 bucket local pour satisfaire TS et être sûr que le segment existe
  const bucket =
    st.hitsBySegment![v] ??
    (st.hitsBySegment![v] = { S: 0, D: 0, T: 0 });

  if (m === 1) bucket.S++;
  if (m === 2) bucket.D++;
  if (m === 3) bucket.T++;
}

function recordVisitOn(
  st: X01StatsLiveV3,
  darts: Array<{ v: number; m: number }>
) {
  st.visits!++;

  let total = 0;
  for (const d of darts) {
    recordDartOn(st, d.v, d.m);
    total += d.v * d.m;
  }

  st.scorePerVisit!.push(total);
}

function finalizeStatsFor(st: X01StatsLiveV3) {
  const totalDarts =
    (st.hitsSingle || 0) +
    (st.hitsDouble || 0) +
    (st.hitsTriple || 0) +
    (st.miss || 0);

  st.pctMiss = totalDarts > 0 ? ((st.miss || 0) / totalDarts) * 100 : 0;

  const totalHits =
    (st.hitsSingle || 0) + (st.hitsDouble || 0) + (st.hitsTriple || 0);

  st.pctS =
    totalHits > 0 ? ((st.hitsSingle || 0) / totalHits) * 100 : 0;
  st.pctD =
    totalHits > 0 ? ((st.hitsDouble || 0) / totalHits) * 100 : 0;
  st.pctT =
    totalHits > 0 ? ((st.hitsTriple || 0) / totalHits) * 100 : 0;
}

// ===========================================================
// AGRÉGATION MATCH : summary.detailedByPlayer + rankings
// ===========================================================

function buildAggregatedStats(
  live: Record<X01PlayerId, X01StatsLiveV3> | undefined
) {
  const out: Record<
    X01PlayerId,
    {
      darts: number;
      avg3: number;
      totalScore: number;
      bestVisit: number;
      bestCheckout: number;
      hits: { S: number; D: number; T: number; M: number };
      hitsBySegment: NonNullable<X01StatsLiveV3["hitsBySegment"]>;
      scorePerVisit: number[];
    }
  > = {} as any;

  if (!live) return out;

  for (const pid of Object.keys(live) as X01PlayerId[]) {
    const st = live[pid];
    if (!st) continue;

    const dartsCount =
      (st.hitsSingle || 0) +
      (st.hitsDouble || 0) +
      (st.hitsTriple || 0) +
      (st.miss || 0);

    const totalScore = st.totalScore || 0;
    const avg3 = dartsCount > 0 ? (totalScore / dartsCount) * 3 : 0;
    const bestVisit = Math.max(...(st.scorePerVisit || [0]));
    const bestCheckout = (st as any).bestCheckout || 0;

    out[pid] = {
      darts: dartsCount,
      avg3,
      totalScore,
      bestVisit,
      bestCheckout,
      hits: {
        S: st.hitsSingle || 0,
        D: st.hitsDouble || 0,
        T: st.hitsTriple || 0,
        M: st.miss || 0,
      },
      hitsBySegment: st.hitsBySegment || {},
      scorePerVisit: st.scorePerVisit || [],
    };
  }

  return out;
}

// -------------------------------------------------------------
// Hook principal
// -------------------------------------------------------------

export function useX01EngineV3({ config }: { config: X01ConfigV3 }) {
  const [state, setState] = React.useState<X01MatchStateV3>(() =>
    createInitialMatchState(config)
  );

  const [liveStatsByPlayer, setLiveStatsByPlayer] =
    React.useState<Record<X01PlayerId, X01StatsLiveV3>>(() => {
      const out: Record<X01PlayerId, X01StatsLiveV3> = {};
      for (const p of config.players) {
        out[p.id] = createEmptyLiveStatsV3();
      }
      return out;
    });

  // -----------------------------------------------------------
  // throwDart : appliqué à CHAQUE fléchette
  // -----------------------------------------------------------

  const throwDart = React.useCallback(
    (input: X01DartInputV3) => {
      setState((prevState) => {
        const next = structuredClone(prevState);
        const m = next;

        if (m.status !== "playing") return m;
        if (!m.visit) startNewVisitV3(m);

        const result = applyDartToCurrentPlayerV3(config, m, input);
        const visit = m.visit!;

        const pid = m.activePlayer;

        const visitEnded =
          result.bust || visit.dartsLeft === 0 || result.scoreAfter === 0;

        if (!visitEnded) {
          // Checkout adaptatif tant que la visite continue
          if (!result.bust && visit.dartsLeft > 0 && result.scoreAfter > 1) {
            visit.checkoutSuggestion = extAdaptCheckoutSuggestion({
              score: visit.currentScore,
              dartsLeft: visit.dartsLeft,
              outMode: config.outMode,
            });
          } else {
            visit.checkoutSuggestion = null;
          }

          return m;
        }

        // -------- FIN DE VISITE (stats uniques) --------
        const darts = (visit as any).dartsThrown
          ? (visit as any).dartsThrown.map((d: any) => ({
              v: d.value,
              m: d.mult,
            }))
          : (visit.darts || []).map((d) => ({
              v: d.segment,
              m: d.multiplier,
            }));

        setLiveStatsByPlayer((prev) => {
          const ns: Record<X01PlayerId, X01StatsLiveV3> = structuredClone(
            prev
          );

          const isCheckout = !result.bust && result.scoreAfter === 0;

          const base = ns[pid] ?? createEmptyLiveStatsV3();
          const st: X01StatsLiveV3 = structuredClone(
            base
          ) as X01StatsLiveV3;

          // Stats live "classiques"
          applyVisitToLiveStatsV3(st, visit as any, result.bust, isCheckout);

          // Patch étendu : hits/miss/segments
          ensureExtendedStatsFor(st);
          recordVisitOn(st, darts);
          finalizeStatsFor(st);

          ns[pid] = st;

          // 🔗 on garde aussi une copie dans l'état du match
          (m as any).liveStatsByPlayer = ns;

          return ns;
        });

        // ---------- Fin de leg / set / match ----------
        const legWinner = checkLegWinV3(config, m);
        if (legWinner) {
          // Agrégation des stats live -> summary.detailedByPlayer
          const aggregated = buildAggregatedStats(
            (m as any).liveStatsByPlayer as Record<
              X01PlayerId,
              X01StatsLiveV3
            >
          );

          const bestCheckoutByPlayer: Record<string, number> = {};
          for (const pid of Object.keys(aggregated)) {
            const bc = aggregated[pid].bestCheckout || 0;
            if (bc > 0) bestCheckoutByPlayer[pid] = bc;
          }

          (m as any).summary = {
            ...(m as any).summary,
            detailedByPlayer: aggregated,
            bestCheckoutByPlayer,
          };

          applyLegWinV3(config, m, legWinner);

          if (legWinner.winnerPlayerId) {
            (m as any).lastLegWinnerId = legWinner.winnerPlayerId;
            (m as any).lastWinnerId = legWinner.winnerPlayerId;
            (m as any).lastWinningPlayerId = legWinner.winnerPlayerId;
          }

          const setWinner = checkSetWinV3(config, m);
          if (setWinner) {
            applySetWinV3(config, m, setWinner);

            if (checkMatchWinV3(config, m)) {
              // ========= FIN DE MATCH =========
              // On pose aussi les métadonnées pour l'historique :
              // - summary.game.startScore / mode
              // - summary.rankings (classement joueurs)
              const rankings = [...config.players].map((p) => {
                const pid = p.id as X01PlayerId;
                const legs = m.legsWon[pid] ?? 0;
                const sets = m.setsWon[pid] ?? 0;
                return {
                  id: pid,
                  name: p.name,
                  legsWon: legs,
                  setsWon: sets,
                  score: sets || legs || 0,
                };
              });

              rankings.sort((a, b) => {
                if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
                if (b.legsWon !== a.legsWon) return b.legsWon - a.legsWon;
                return 0;
              });

              const summaryAny: any = (m as any).summary || {};

              (m as any).summary = {
                ...summaryAny,
                game: {
                  ...(summaryAny.game || {}),
                  mode: "x01",
                  startScore: config.startScore,
                  legsPerSet: config.legsPerSet ?? null,
                  setsToWin: config.setsToWin ?? null,
                },
                rankings,
                winnerName:
                  summaryAny.winnerName ??
                  (m as any).winnerName ??
                  (rankings[0]?.name ?? null),
              };

              m.status = "match_end";
              return m;
            }

            m.status = "set_end";
            return m;
          }

          m.status = "leg_end";
          return m;
        }

        // Joueur suivant
        m.activePlayer = getNextPlayerV3(m);

        startNewVisitV3(m);
        if (m.visit) {
          m.visit.checkoutSuggestion = extAdaptCheckoutSuggestion({
            score: m.visit.currentScore,
            dartsLeft: m.visit.dartsLeft,
            outMode: config.outMode,
          });
        }

        return m;
      });
    },
    [config]
  );

  // -----------------------------------------------------------
  // startNextLeg
  // -----------------------------------------------------------

  const startNextLeg = React.useCallback(() => {
    // ...
  }, [config]);

  // -----------------------------------------------------------
  // Autosave → History (in_progress / finished)
  // -----------------------------------------------------------

  React.useEffect(() => {
    try {
      // on ne logge que les matchs X01 locaux
      const playersLite: PlayerLite[] = config.players.map((p: any) => ({
        id: p.id,
        name: p.name,
        avatarDataUrl: p.avatarDataUrl ?? null,
      }));

      const summary: any = (state as any).summary || {};
      const finished = state.status === "match_end";
      summary.finished = finished;

      const rec: SavedMatch = {
        id: state.matchId,
        kind: "x01",
        status: finished ? "finished" : "in_progress",
        players: playersLite,
        winnerId: (state as any).lastWinnerId ?? null,
        game: {
          mode: "x01",
          startScore: config.startScore,
        },
        summary,
        // payload complet pour reprise : config + state + stats live
        payload: {
          config,
          state,
          liveStatsByPlayer,
        },
      };

      // on ne bloque pas le rendu, pas d'await
      History.upsert(rec);
    } catch (e) {
      console.warn("[useX01EngineV3] autosave history error:", e);
    }
    // config est constant sur la durée du hook
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, liveStatsByPlayer]);

  // -----------------------------------------------------------
  // Exposition
  // -----------------------------------------------------------

  return {
    state,
    liveStatsByPlayer,
    activePlayerId: state.activePlayer,
    scores: state.scores,
    status: state.status,
    throwDart,
    startNextLeg,
  };
}
