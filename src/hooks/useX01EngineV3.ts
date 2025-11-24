// =======================================================
// src/hooks/useX01EngineV3.ts
// Moteur X01 V3 — version stable (celle qui comptait juste)
// =======================================================

import * as React from "react";
import type {
  X01ConfigV3,
  X01MatchStateV3,
  X01PlayerId,
  X01StatsLiveV3,
  X01MatchStatsV3,
  X01EngineEventsV3,
} from "../types/x01v3";

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
  startNewVisitV3,
  applyDartToCurrentPlayerV3,
  type X01DartInputV3,
} from "../lib/x01v3/x01LogicV3";

import {
  createEmptyLiveStatsV3,
  applyVisitToLiveStatsV3,
} from "../lib/x01v3/x01StatsLiveV3";

import {
  createEmptyMatchStatsV3,
  applyLiveStatsToMatchStatsV3,
  finalizeMatchStatsV3,
} from "../lib/x01v3/x01StatsMatchV3";

import { getAdaptiveCheckoutSuggestion } from "../lib/x01v3/x01CheckoutV3";

// -------------------------------------------------------
// Types internes
// -------------------------------------------------------

interface X01EngineInternalStateV3 {
  match: X01MatchStateV3;
  liveStatsByPlayer: Record<X01PlayerId, X01StatsLiveV3>;
  matchStats: X01MatchStatsV3 | null;
}

export interface UseX01EngineV3Args {
  config: X01ConfigV3;
  matchId?: string;
  events?: X01EngineEventsV3;
}

export interface UseX01EngineV3Value {
  state: X01MatchStateV3;
  liveStatsByPlayer: Record<X01PlayerId, X01StatsLiveV3>;
  matchStats: X01MatchStatsV3 | null;
  activePlayerId: X01PlayerId;
  scores: Record<X01PlayerId, number>;
  status: X01MatchStateV3["status"];
  throwDart: (input: X01DartInputV3) => void;
  startNextLeg: () => void;
}

// -------------------------------------------------------
// Création état initial
// -------------------------------------------------------

function createInitialEngineStateV3(
  config: X01ConfigV3,
  matchId?: string
): X01EngineInternalStateV3 {
  const match: X01MatchStateV3 = {
    matchId: matchId ?? `x01v3_${Date.now()}`,
    currentSet: 1,
    currentLeg: 1,
    activePlayer: config.players[0]?.id ?? "",
    throwOrder: [],
    scores: {},
    legsWon: {},
    setsWon: {},
    teamLegsWon: config.gameMode === "teams" ? {} : undefined,
    teamSetsWon: config.gameMode === "teams" ? {} : undefined,
    visit: {
      dartsLeft: 3,
      startingScore: config.startScore,
      currentScore: config.startScore,
      darts: [],
      checkoutSuggestion: null,
    },
    status: "playing",
  };

  // Init scores
  for (const p of config.players) {
    match.scores[p.id] = config.startScore;
    match.legsWon[p.id] = 0;
    match.setsWon[p.id] = 0;
  }

  // Teams init
  if (
    config.gameMode === "teams" &&
    match.teamLegsWon &&
    match.teamSetsWon &&
    config.teams
  ) {
    for (const t of config.teams) {
      match.teamLegsWon[t.id] = 0;
      match.teamSetsWon[t.id] = 0;
    }
  }

  // Ordre du premier set
  const throwOrder = generateThrowOrderV3(config, null, 1);
  match.throwOrder = throwOrder;
  match.activePlayer = throwOrder[0];

  // Première visite
  startNewVisitV3(match);
  match.visit.checkoutSuggestion = getAdaptiveCheckoutSuggestion({
    score: match.visit.currentScore,
    dartsLeft: match.visit.dartsLeft,
    outMode: config.outMode,
  });

  // Stats live initiales
  const liveStatsByPlayer: Record<X01PlayerId, X01StatsLiveV3> = {};
  for (const p of config.players) {
    liveStatsByPlayer[p.id] = createEmptyLiveStatsV3();
  }

  return {
    match,
    liveStatsByPlayer,
    matchStats: createEmptyMatchStatsV3(
      config.players.map((p) => p.id)
    ),
  };
}

// -------------------------------------------------------
// Hook principal
// -------------------------------------------------------

export function useX01EngineV3({
  config,
  matchId,
  events,
}: UseX01EngineV3Args): UseX01EngineV3Value {
  const [engineState, setEngineState] =
    React.useState<X01EngineInternalStateV3>(() =>
      createInitialEngineStateV3(config, matchId)
    );

  const { match, liveStatsByPlayer, matchStats } = engineState;

  // -------------------------------------------------------
  // LANCER une fléchette
  // -------------------------------------------------------

  const throwDart = React.useCallback(
    (input: X01DartInputV3) => {
      setEngineState((prev) => {
        const next: X01EngineInternalStateV3 = {
          match: {
            ...prev.match,
            scores: { ...prev.match.scores },
            legsWon: { ...prev.match.legsWon },
            setsWon: { ...prev.match.setsWon },
            teamLegsWon: prev.match.teamLegsWon
              ? { ...prev.match.teamLegsWon }
              : undefined,
            teamSetsWon: prev.match.teamSetsWon
              ? { ...prev.match.teamSetsWon }
              : undefined,
            visit: {
              ...prev.match.visit,
              darts: [...prev.match.visit.darts],
            },
          },
          liveStatsByPlayer: { ...prev.liveStatsByPlayer },
          matchStats: prev.matchStats
            ? {
                ...prev.matchStats,
                players: { ...prev.matchStats.players },
              }
            : null,
        };

        const m = next.match;
        if (m.status !== "playing") return next;

        const currentPlayerId = m.activePlayer;

        const result = applyDartToCurrentPlayerV3(
          config,
          m,
          input
        );
        const visit = m.visit;

        const wasBust = result.bust;
        const visitEnded =
          wasBust ||
          visit.dartsLeft === 0 ||
          result.scoreAfter === 0;

        // MAJ checkout suggestion
        visit.checkoutSuggestion = getAdaptiveCheckoutSuggestion({
          score: visit.currentScore,
          dartsLeft: visit.dartsLeft,
          outMode: config.outMode,
        });

        if (visitEnded) {
          applyVisitToLiveStatsV3(
            next.liveStatsByPlayer[currentPlayerId],
            visit,
            wasBust
          );
        }

        // Fin de leg ?
        if (!wasBust && result.scoreAfter === 0) {
          const legWinner = checkLegWinV3(config, m);
          if (legWinner) {
            applyLegWinV3(config, m, legWinner);

            const setWinner = checkSetWinV3(config, m);
            if (setWinner) {
              applySetWinV3(config, m, setWinner);

              const matchWinner = checkMatchWinV3(
                config,
                m
              );
              if (matchWinner) {
                m.status = "match_end";
                if (next.matchStats)
                  finalizeMatchStatsV3(
                    config,
                    m,
                    next.matchStats
                  );
                return next;
              }

              m.status = "set_end";
              return next;
            }

            m.status = "leg_end";
            return next;
          }
        }

        // Visite NON terminée → même joueur
        if (!visitEnded && !wasBust && visit.dartsLeft > 0) {
          return next;
        }

        // Changement joueur
        if (m.status === "playing") {
          const nextPlayerId = getNextPlayerV3(m);
          m.activePlayer = nextPlayerId;

          startNewVisitV3(m);
          m.visit.checkoutSuggestion =
            getAdaptiveCheckoutSuggestion({
              score: m.visit.currentScore,
              dartsLeft: m.visit.dartsLeft,
              outMode: config.outMode,
            });
        }

        return next;
      });
    },
    [config]
  );

  // -------------------------------------------------------
  // MANCHES SUIVANTE
  // -------------------------------------------------------

  const startNextLeg = React.useCallback(() => {
    setEngineState((prev) => {
      const next = JSON.parse(
        JSON.stringify(prev)
      ) as X01EngineInternalStateV3;

      const m = next.match;

      // Fusion stats live → stats match
      if (next.matchStats) {
        for (const pid of Object.keys(
          next.liveStatsByPlayer
        )) {
          applyLiveStatsToMatchStatsV3(
            next.matchStats,
            pid as X01PlayerId,
            next.liveStatsByPlayer[pid]
          );
        }
      }

      // Reset stats LIVE
      next.liveStatsByPlayer = {};
      for (const p of config.players) {
        next.liveStatsByPlayer[p.id] =
          createEmptyLiveStatsV3();
      }

      // Nouveau LEG
      m.currentLeg++;

      for (const pid of Object.keys(m.scores)) {
        m.scores[pid] = config.startScore;
      }

      startNewVisitV3(m);
      m.visit.checkoutSuggestion = getAdaptiveCheckoutSuggestion(
        {
          score: m.visit.currentScore,
          dartsLeft: m.visit.dartsLeft,
          outMode: config.outMode,
        }
      );

      m.status = "playing";
      return next;
    });
  }, [config]);

  // -------------------------------------------------------
  // Retour hook
  // -------------------------------------------------------

  return {
    state: match,
    liveStatsByPlayer,
    matchStats,
    activePlayerId: match.activePlayer,
    scores: match.scores,
    status: match.status,
    throwDart,
    startNextLeg,
  };
}
