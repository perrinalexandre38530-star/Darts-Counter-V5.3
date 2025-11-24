// =============================================================
// src/hooks/useX01EngineV3.ts
// Moteur X01 V3 (hook React)
// - Orchestration logique : score, bust, visits
// - Flow : rotation joueurs, legs, sets, match
// - Checkout adaptatif (1/2/3 darts) via x01CheckoutV3
// - Stats live par joueur (darts, totalScore, bestVisit) PAR MANCHE
// - Status : "playing" | "leg_end" | "set_end" | "match_end"
// =============================================================

import * as React from "react";

import type {
  X01ConfigV3,
  X01MatchStateV3,
  X01PlayerId,
  X01OutMode,
  X01DartV3,
} from "../types/x01v3";

import {
  startNewVisitV3,
  applyDartToCurrentPlayerV3,
  type X01DartInputV3,
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

import { getAdaptiveCheckoutSuggestionV3 } from "../lib/x01v3/x01CheckoutV3";

// -------------------------------------------------------------
// Types locaux
// -------------------------------------------------------------

type LiveStats = {
  dartsThrown: number; // nb de fléchettes jouées dans la manche courante
  totalScore: number;  // total des points marqués dans la manche courante
  bestVisit: number;   // meilleure VOLÉE (max 180)
};

type StatusV3 = "playing" | "leg_end" | "set_end" | "match_end";

// -------------------------------------------------------------
// Helpers internes
// -------------------------------------------------------------

function initLiveStats(config: X01ConfigV3): Record<string, LiveStats> {
  const res: Record<string, LiveStats> = {};
  for (const p of config.players) {
    res[p.id] = { dartsThrown: 0, totalScore: 0, bestVisit: 0 };
  }
  return res;
}

function canSuggestCheckout(
  score: number,
  dartsLeft: number,
  outMode: X01OutMode
): boolean {
  if (score <= 1) return false;
  if (score > 170) return false;
  if (dartsLeft <= 0) return false;

  // Garde-fou pour tous les outMode
  if (score === 1) return false;

  return true;
}

function updateVisitCheckout(config: X01ConfigV3, state: X01MatchStateV3) {
  const visit = state.visit;
  if (!visit) return;

  if (!canSuggestCheckout(visit.currentScore, visit.dartsLeft, config.outMode)) {
    visit.checkoutSuggestion = null;
    return;
  }

  visit.checkoutSuggestion = getAdaptiveCheckoutSuggestionV3({
    score: visit.currentScore,
    dartsLeft: visit.dartsLeft,
    outMode: config.outMode as any,
  });
}

function createInitialMatchState(config: X01ConfigV3): X01MatchStateV3 {
  const scores: Record<string, number> = {};
  for (const p of config.players) {
    scores[p.id] = config.startScore;
  }

  const throwOrder = generateThrowOrderV3(config, null, 1);

  const base: X01MatchStateV3 = {
    scores,
    activePlayer: throwOrder[0],
    throwOrder,
    currentSet: 1,
    currentLeg: 1,
    legsWon: {},
    setsWon: {},
    teamLegsWon: config.gameMode === "teams" ? {} : undefined,
    teamSetsWon: config.gameMode === "teams" ? {} : undefined,
    status: "playing",
    visit: null,
  } as X01MatchStateV3;

  // Première visite
  startNewVisitV3(base);
  updateVisitCheckout(config, base);

  return base;
}

// -------------------------------------------------------------
// Hook principal
// -------------------------------------------------------------

export function useX01EngineV3({ config }: { config: X01ConfigV3 }) {
  const [state, setState] = React.useState<X01MatchStateV3>(() =>
    createInitialMatchState(config)
  );

  // Stats live PAR MANCHE (remises à zéro à chaque leg)
  const [liveStatsByPlayer, setLiveStatsByPlayer] =
    React.useState<Record<string, LiveStats>>(() =>
      initLiveStats(config)
    );

  // Score de la VOLÉE en cours par joueur (pour bestVisit)
  const visitScoreRef = React.useRef<Record<string, number>>({});

  // -----------------------------------------------------------
  // Helper : démarrer une nouvelle visite pour le joueur actif
  // -----------------------------------------------------------
  function startVisitForActivePlayer(nextState: X01MatchStateV3) {
    startNewVisitV3(nextState);
    const v = nextState.visit!;
    visitScoreRef.current[nextState.activePlayer] = 0;

    if (canSuggestCheckout(v.currentScore, v.dartsLeft, config.outMode)) {
      v.checkoutSuggestion = getAdaptiveCheckoutSuggestionV3({
        score: v.currentScore,
        dartsLeft: v.dartsLeft,
        outMode: config.outMode as any,
      });
    } else {
      v.checkoutSuggestion = null;
    }
  }

  // -----------------------------------------------------------
  // throwDart : appliqué à CHAQUE fléchette
  // -----------------------------------------------------------
  const throwDart = React.useCallback(
    (input: X01DartInputV3) => {
      setState((prev) => {
        const next = { ...prev } as X01MatchStateV3;

        // S'il n'y a pas de visite (cas limite) → on en crée une
        if (!next.visit) {
          startVisitForActivePlayer(next);
        }

        const activeId = next.activePlayer as X01PlayerId;

        // Appliquer la fléchette via la logique V3
        const result = applyDartToCurrentPlayerV3(config, next, input);
        const visit = next.visit!;
        const dartsThisVisit = visit.darts.length;

        // MAJ score de volée courant (uniquement pour cette visite)
        const prevVisitScore = visitScoreRef.current[activeId] ?? 0;
        const newVisitScore = prevVisitScore + result.dart.score;
        visitScoreRef.current[activeId] = newVisitScore;

        // Visite terminée ?
        const visitFinished =
          result.bust ||
          result.scoreAfter === 0 ||
          visit.dartsLeft === 0;

        // Si la visite est terminée → MAJ stats live UNE FOIS
        if (visitFinished) {
          const visitScore = newVisitScore;

          setLiveStatsByPlayer((prevStats) => {
            const cur = prevStats[activeId] ?? {
              dartsThrown: 0,
              totalScore: 0,
              bestVisit: 0,
            };

            const dartsThrown = cur.dartsThrown + dartsThisVisit;
            const totalScore = cur.totalScore + visitScore;
            const bestVisit = Math.max(cur.bestVisit, visitScore);

            return {
              ...prevStats,
              [activeId]: {
                dartsThrown,
                totalScore,
                bestVisit,
              },
            };
          });

          // Reset compteur de volée pour ce joueur
          visitScoreRef.current[activeId] = 0;
        }

        // Checkout : seulement si la visite n'est pas terminée
        if (!result.bust && visit.dartsLeft > 0 && result.scoreAfter > 1) {
          updateVisitCheckout(config, next);
        } else if (next.visit) {
          next.visit.checkoutSuggestion = null;
        }

        // --------- Détection fin de leg / set / match ----------
        const legWin = checkLegWinV3(config, next);

        if (legWin) {
          // Leg gagné
          applyLegWinV3(config, next, legWin);

          const setWin = checkSetWinV3(config, next);

          if (setWin) {
            // Set gagné
            applySetWinV3(config, next, setWin);

            // IMPORTANT : reset des legs pour le prochain set
            if (config.gameMode === "teams") {
              next.teamLegsWon = {};
            } else {
              next.legsWon = {};
            }

            const matchWin = checkMatchWinV3(config, next);
            if (matchWin) {
              // Match gagné → status final
              next.status = "match_end" as StatusV3;
            } else {
              // Set gagné, match NON terminé
              next.status = "set_end" as StatusV3;
            }
          } else {
            // Leg gagné, set non encore gagné
            next.status = "leg_end" as StatusV3;
          }

          // Quoi qu'il arrive, la visite est terminée
          if (next.visit) {
            next.visit.dartsLeft = 0;
            next.visit.checkoutSuggestion = null;
          }

          return next;
        }

        // --------- Pas de leg gagné : on continue ----------
        // Si bust ou plus de fléchettes → fin de visite, joueur suivant
        const visitReallyFinished =
          result.bust || (next.visit && next.visit.dartsLeft === 0);

        if (visitReallyFinished) {
          const nextPlayer = getNextPlayerV3(next);
          next.activePlayer = nextPlayer;
          next.visit = null;
          next.status = "playing" as StatusV3;
          startVisitForActivePlayer(next);
          return next;
        }

        // Visite toujours en cours
        next.status = "playing" as StatusV3;
        return next;
      });
    },
    [config]
  );

  // -----------------------------------------------------------
  // startNextLeg : appelé par l'overlay de fin de manche/set
  // -----------------------------------------------------------
  const startNextLeg = React.useCallback(() => {
    setState((prev) => {
      const next = { ...prev } as X01MatchStateV3;

      // Si le match est déjà gagné, on ne relance rien
      const matchWin = checkMatchWinV3(config, next);
      if (matchWin) {
        next.status = "match_end" as StatusV3;
        return next;
      }

      // On distingue deux cas :
      // - on vient de finir un SET
      // - on vient "juste" de finir un LEG
      const setWin = checkSetWinV3(config, next);

      if (setWin) {
        // Nouveau set
        next.currentSet += 1;
        next.currentLeg = 1;

        // Legs remis à zéro pour ce nouveau set
        if (config.gameMode === "teams") {
          next.teamLegsWon = {};
        } else {
          next.legsWon = {};
        }

        // Nouvel ordre de tir pour ce set (serveMode random/alternate)
        next.throwOrder = generateThrowOrderV3(
          config,
          next.throwOrder,
          next.currentSet
        );
        next.activePlayer = next.throwOrder[0];
      } else {
        // Même set → leg suivant
        next.currentLeg += 1;

        // Joueur qui commence le leg suivant : suivant dans l'ordre
        const nextPlayer = getNextPlayerV3(next);
        next.activePlayer = nextPlayer;
      }

      // Reset des scores pour tous les joueurs
      for (const pid of Object.keys(next.scores)) {
        next.scores[pid] = config.startScore;
      }

      // Reset visite
      next.visit = null;
      next.status = "playing" as StatusV3;
      startVisitForActivePlayer(next);

      return next;
    });

    // Reset des stats live & des scores de volée pour la nouvelle manche
    setLiveStatsByPlayer(() => initLiveStats(config));
    visitScoreRef.current = {};
  }, [config]);

  // -----------------------------------------------------------
  // Exposition au composant UI
  // -----------------------------------------------------------

  const activePlayerId = state.activePlayer as X01PlayerId;
  const scores = state.scores;
  const status = state.status as StatusV3;

  return {
    state,
    liveStatsByPlayer,
    activePlayerId,
    scores,
    status,
    throwDart,
    startNextLeg,
  };
}
