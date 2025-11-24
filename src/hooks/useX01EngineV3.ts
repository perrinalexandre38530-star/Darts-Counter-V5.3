// =============================================================
// src/hooks/useX01EngineV3.ts
// Moteur X01 V3 — VERSION FIXÉE (stats 100% correctes)
// - Stats LIVE correctes (darts, visits, bestVisit, totalScore)
// - Une seule MAJ des stats par VOLÉE
// - Plus aucune double comptabilisation
// - Checkout adaptatif V3
// - Status : playing / leg_end / set_end / match_end
// - Expose lastLegWinnerId / lastWinnerId pour l’overlay
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

import { getAdaptiveCheckoutSuggestion } from "../lib/x01v3/x01CheckoutV3";

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
    currentSet: 1,
    currentLeg: 1,
    throwOrder,
    activePlayer: throwOrder[0],
    scores,
    legsWon,
    setsWon,
    visit: null,
    status: "playing",
  };

  // on initialise ces champs pour l’overlay
  (state as any).lastLegWinnerId = null;
  (state as any).lastWinnerId = null;
  (state as any).lastWinningPlayerId = null;

  startNewVisitV3(state);
  if (state.visit) {
    state.visit.checkoutSuggestion = getAdaptiveCheckoutSuggestion({
      score: state.visit.currentScore,
      dartsLeft: state.visit.dartsLeft,
      outMode: config.outMode,
    });
  }

  return state;
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

        // Mise à jour du checkout tant que la visite continue
        if (!result.bust && visit.dartsLeft > 0 && result.scoreAfter > 1) {
          visit.checkoutSuggestion = getAdaptiveCheckoutSuggestion({
            score: visit.currentScore,
            dartsLeft: visit.dartsLeft,
            outMode: config.outMode,
          });
        } else {
          visit.checkoutSuggestion = null;
        }

        const visitEnded =
          result.bust || visit.dartsLeft === 0 || result.scoreAfter === 0;

        // ----------- FIN DE VISITE (1 seule MAJ DES STATS) -----------
        if (visitEnded) {
          const pid = m.activePlayer;

          // ✅ une seule mise à jour des stats LIVE par volée
          setLiveStatsByPlayer((prev) => {
            const nextStats = structuredClone(prev);
            applyVisitToLiveStatsV3(nextStats[pid], visit, result.bust);
            return nextStats;
          });

          // Détection fin de leg / set / match
          const legWinner = checkLegWinV3(config, m);
          if (legWinner) {
            applyLegWinV3(config, m, legWinner);

            // ✅ on mémorise le vainqueur pour l'overlay
            if (legWinner.winnerPlayerId) {
              (m as any).lastLegWinnerId = legWinner.winnerPlayerId;
              (m as any).lastWinnerId = legWinner.winnerPlayerId;
              (m as any).lastWinningPlayerId = legWinner.winnerPlayerId;
            }

            const setWinner = checkSetWinV3(config, m);
            if (setWinner) {
              applySetWinV3(config, m, setWinner);

              const matchWinner = checkMatchWinV3(config, m);
              if (matchWinner) {
                m.status = "match_end";
                return m;
              }

              m.status = "set_end";
              return m;
            }

            m.status = "leg_end";
            return m;
          }

          // Pas de leg gagné → joueur suivant
          const nextPlayer = getNextPlayerV3(m);
          m.activePlayer = nextPlayer;

          startNewVisitV3(m);
          if (m.visit) {
            m.visit.checkoutSuggestion = getAdaptiveCheckoutSuggestion({
              score: m.visit.currentScore,
              dartsLeft: m.visit.dartsLeft,
              outMode: config.outMode,
            });
          }

          return m;
        }

        // Visite en cours
        return m;
      });
    },
    [config]
  );

  // -----------------------------------------------------------
  // startNextLeg
  // -----------------------------------------------------------

  const startNextLeg = React.useCallback(() => {
    setState((prev) => {
      const m = structuredClone(prev);

      // 🔒 si le match est terminé, on ne relance rien
      if (m.status === "match_end") return m;

      const setWinner = checkSetWinV3(config, m);

      if (setWinner) {
        // Nouveau set
        m.currentSet += 1;
        m.currentLeg = 1;

        // Reset des legs gagnés
        for (const pid of Object.keys(m.legsWon)) {
          m.legsWon[pid] = 0;
        }

        m.throwOrder = generateThrowOrderV3(
          config,
          m.throwOrder,
          m.currentSet
        );
        m.activePlayer = m.throwOrder[0];
      } else {
        // Nouveau leg dans le même set
        m.currentLeg += 1;
        m.activePlayer = getNextPlayerV3(m);
      }

      // Reset des scores
      for (const pid of Object.keys(m.scores)) {
        m.scores[pid] = config.startScore;
      }

      // Reset LIVE stats du leg uniquement
      setLiveStatsByPlayer(() => {
        const out: Record<X01PlayerId, X01StatsLiveV3> = {};
        for (const p of config.players) {
          out[p.id] = createEmptyLiveStatsV3();
        }
        return out;
      });

      // Reset vainqueur pour la manche suivante
      (m as any).lastLegWinnerId = null;
      (m as any).lastWinnerId = null;
      (m as any).lastWinningPlayerId = null;

      startNewVisitV3(m);
      if (m.visit) {
        m.visit.checkoutSuggestion = getAdaptiveCheckoutSuggestion({
          score: m.visit.currentScore,
          dartsLeft: m.visit.dartsLeft,
          outMode: config.outMode,
        });
      }

      m.status = "playing";
      return m;
    });
  }, [config]);

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
