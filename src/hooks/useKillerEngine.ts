// =============================================================
// src/hooks/useKillerEngine.ts
// KILLER ENGINE — DC-V5
// - State pur, sérialisable (online-friendly plus tard)
// - Phase BUILD : on gagne des vies sur SON numéro jusqu'à maxLives
// - Phase KILL : un "Killer" peut enlever des vies aux autres
// - Elimination : lives = 0 => dead
// - Winner : dernier vivant
// =============================================================

import * as React from "react";

// -----------------------------
// Types
// -----------------------------
export type Mult = 1 | 2 | 3;

export type KillerHit = {
  value: number; // 1..20 (on ignore bull ici; tu pourras l'ajouter ensuite)
  mult: Mult;    // S/D/T => 1/2/3
};

export type KillerPlayerState = {
  pid: string;             // player id (match)
  name: string;
  killerNumber: number;    // 1..20
  lives: number;           // 0..maxLives
  isDead: boolean;
};

export type KillerEngineParams = {
  maxLives: number;              // ex: 3
  allowFriendlyFire: boolean;    // si true : toucher son numéro quand killer peut aussi te faire perdre/gagner? (ici: ignoré, par défaut false)
  loseLivesOnOwnNumberWhenKiller: boolean; // si true : quand tu es killer et que tu touches ton propre numéro => tu PERDS des vies (variante)
  mustReachExactLives: boolean;  // si true : doit atteindre exactement maxLives (sinon cap)
};

export type KillerPhase = "build" | "kill" | "ended";

export type KillerGameState = {
  players: KillerPlayerState[];
  currentIndex: number;   // index joueur courant
  phase: KillerPhase;
  turn: number;           // compteur de tours (1-based), utile stats plus tard
  winnerPid?: string;
  lastEvent?: KillerEvent; // pour UI (flash)
};

export type KillerEvent =
  | { kind: "hit_own"; pid: string; gained: number; lives: number }
  | { kind: "became_killer"; pid: string }
  | { kind: "hit_other"; attackerPid: string; targetPid: string; lost: number; targetLives: number }
  | { kind: "killed"; attackerPid: string; targetPid: string }
  | { kind: "no_effect"; pid: string; reason: string }
  | { kind: "winner"; pid: string };

type Action =
  | { type: "RESET"; payload: { players: Array<{ pid: string; name: string; killerNumber: number }>; params?: Partial<KillerEngineParams> } }
  | { type: "SET_NUMBER"; payload: { pid: string; killerNumber: number } }
  | { type: "THROW"; payload: { hit: KillerHit } }
  | { type: "NEXT_PLAYER" }
  | { type: "SET_CURRENT"; payload: { pid: string } }
  | { type: "NUDGE_PHASE" }; // recalc phase / winner (sécurité)

// -----------------------------
// Defaults
// -----------------------------
export const defaultKillerParams: KillerEngineParams = {
  maxLives: 3,
  allowFriendlyFire: false,
  loseLivesOnOwnNumberWhenKiller: false,
  mustReachExactLives: false,
};

// -----------------------------
// Helpers
// -----------------------------
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function alivePlayers(players: KillerPlayerState[]) {
  return players.filter((p) => !p.isDead);
}

function isKiller(p: KillerPlayerState, params: KillerEngineParams) {
  return p.lives >= params.maxLives && !p.isDead;
}

function computePhase(state: KillerGameState, params: KillerEngineParams): KillerPhase {
  if (state.winnerPid) return "ended";
  const alive = alivePlayers(state.players);
  if (alive.length <= 1) return "ended";

  // Phase "kill" dès qu'il y a au moins 1 killer vivant
  const anyKiller = alive.some((p) => isKiller(p, params));
  return anyKiller ? "kill" : "build";
}

function computeWinnerPid(players: KillerPlayerState[]) {
  const alive = alivePlayers(players);
  if (alive.length === 1) return alive[0].pid;
  return undefined;
}

function findPlayerIndexByPid(players: KillerPlayerState[], pid: string) {
  return players.findIndex((p) => p.pid === pid);
}

function nextAliveIndex(players: KillerPlayerState[], fromIndex: number) {
  const n = players.length;
  if (n === 0) return 0;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n;
    if (!players[idx].isDead) return idx;
  }
  return fromIndex; // fallback
}

function normalizeNumber(num: number) {
  const n = Math.floor(num);
  return clamp(n, 1, 20);
}

// -----------------------------
// Reducer core
// -----------------------------
function reduceWithParams(state: KillerGameState, params: KillerEngineParams, action: Action): KillerGameState {
  if (action.type === "RESET") {
    const merged: KillerEngineParams = { ...defaultKillerParams, ...(action.payload.params || {}) };

    const players: KillerPlayerState[] = action.payload.players.map((p) => ({
      pid: p.pid,
      name: p.name,
      killerNumber: normalizeNumber(p.killerNumber),
      lives: 0,
      isDead: false,
    }));

    const winnerPid = computeWinnerPid(players);
    const base: KillerGameState = {
      players,
      currentIndex: players.length ? 0 : 0,
      phase: "build",
      turn: 1,
      winnerPid,
      lastEvent: undefined,
    };

    const phase = computePhase(base, merged);
    const ended = phase === "ended";
    return {
      ...base,
      phase,
      winnerPid: ended ? winnerPid : undefined,
      lastEvent: winnerPid ? { kind: "winner", pid: winnerPid } : undefined,
    };
  }

  if (state.phase === "ended") {
    // jeu fini : on ignore tout sauf RESET
    return state;
  }

  switch (action.type) {
    case "SET_NUMBER": {
      const { pid, killerNumber } = action.payload;
      const idx = findPlayerIndexByPid(state.players, pid);
      if (idx < 0) return state;

      const nextPlayers = state.players.map((p) =>
        p.pid === pid ? { ...p, killerNumber: normalizeNumber(killerNumber) } : p
      );

      const winnerPid = computeWinnerPid(nextPlayers);
      const nextState: KillerGameState = {
        ...state,
        players: nextPlayers,
        winnerPid,
      };
      const phase = computePhase(nextState, params);
      if (phase === "ended" && winnerPid) {
        return { ...nextState, phase, lastEvent: { kind: "winner", pid: winnerPid } };
      }
      return { ...nextState, phase, lastEvent: undefined };
    }

    case "SET_CURRENT": {
      const idx = findPlayerIndexByPid(state.players, action.payload.pid);
      if (idx < 0) return state;
      if (state.players[idx].isDead) return state;
      return { ...state, currentIndex: idx, lastEvent: undefined };
    }

    case "NEXT_PLAYER": {
      const nextIdx = nextAliveIndex(state.players, state.currentIndex);
      const turnBump = nextIdx <= state.currentIndex ? 1 : 0;
      const nextState = {
        ...state,
        currentIndex: nextIdx,
        turn: state.turn + turnBump,
        lastEvent: undefined,
      };
      const phase = computePhase(nextState, params);
      return { ...nextState, phase };
    }

    case "THROW": {
      const hit = action.payload.hit;

      // sécurité
      const value = normalizeNumber(hit.value);
      const mult: Mult = hit.mult === 1 || hit.mult === 2 || hit.mult === 3 ? hit.mult : 1;

      const attacker = state.players[state.currentIndex];
      if (!attacker || attacker.isDead) return state;

      const attackerIsKiller = isKiller(attacker, params);

      // 1) Si pas killer => BUILD : toucher son numéro donne des vies
      if (!attackerIsKiller) {
        if (value !== attacker.killerNumber) {
          return { ...state, lastEvent: { kind: "no_effect", pid: attacker.pid, reason: "not_own_number" } };
        }

        const gained = mult;
        let nextLives = attacker.lives + gained;

        if (params.mustReachExactLives && nextLives > params.maxLives) {
          // dépassement = aucun gain (variante)
          return { ...state, lastEvent: { kind: "no_effect", pid: attacker.pid, reason: "exceeds_max_exact" } };
        }

        nextLives = clamp(nextLives, 0, params.maxLives);

        const nextPlayers = state.players.map((p) =>
          p.pid === attacker.pid ? { ...p, lives: nextLives } : p
        );

        const becameKiller = nextLives >= params.maxLives;
        const winnerPid = computeWinnerPid(nextPlayers);

        const tempState: KillerGameState = {
          ...state,
          players: nextPlayers,
          winnerPid,
          lastEvent: { kind: "hit_own", pid: attacker.pid, gained, lives: nextLives },
        };

        let phase = computePhase(tempState, params);

        // Event "became_killer" prioritaire si tu veux l'animer
        if (becameKiller) {
          tempState.lastEvent = { kind: "became_killer", pid: attacker.pid };
          phase = computePhase(tempState, params);
        }

        if (phase === "ended" && winnerPid) {
          return { ...tempState, phase, lastEvent: { kind: "winner", pid: winnerPid } };
        }
        return { ...tempState, phase };
      }

      // 2) Attacker est killer => KILL
      // Variante : toucher son propre numéro peut te faire PERDRE des vies (si activé)
      if (value === attacker.killerNumber) {
        if (!params.allowFriendlyFire && !params.loseLivesOnOwnNumberWhenKiller) {
          return { ...state, lastEvent: { kind: "no_effect", pid: attacker.pid, reason: "own_number_ignored" } };
        }

        if (params.loseLivesOnOwnNumberWhenKiller) {
          const lost = mult;
          const nextLives = clamp(attacker.lives - lost, 0, params.maxLives);
          const died = nextLives <= 0;

          const nextPlayers = state.players.map((p) =>
            p.pid === attacker.pid ? { ...p, lives: nextLives, isDead: died } : p
          );

          const winnerPid = computeWinnerPid(nextPlayers);
          const nextState: KillerGameState = {
            ...state,
            players: nextPlayers,
            winnerPid,
            lastEvent: died
              ? { kind: "killed", attackerPid: attacker.pid, targetPid: attacker.pid }
              : { kind: "hit_other", attackerPid: attacker.pid, targetPid: attacker.pid, lost, targetLives: nextLives },
          };

          const phase = computePhase(nextState, params);
          if (phase === "ended" && winnerPid) {
            return { ...nextState, phase, lastEvent: { kind: "winner", pid: winnerPid } };
          }
          return { ...nextState, phase };
        }

        return { ...state, lastEvent: { kind: "no_effect", pid: attacker.pid, reason: "own_number" } };
      }

      // Trouver la cible par numéro
      const target = state.players.find((p) => !p.isDead && p.killerNumber === value);
      if (!target) {
        return { ...state, lastEvent: { kind: "no_effect", pid: attacker.pid, reason: "no_target_for_number" } };
      }
      if (!params.allowFriendlyFire && target.pid === attacker.pid) {
        return { ...state, lastEvent: { kind: "no_effect", pid: attacker.pid, reason: "friendly_fire_blocked" } };
      }

      const lost = mult;
      const nextTargetLives = clamp(target.lives - lost, 0, params.maxLives);
      const killed = nextTargetLives <= 0;

      const nextPlayers = state.players.map((p) => {
        if (p.pid !== target.pid) return p;
        return {
          ...p,
          lives: nextTargetLives,
          isDead: killed ? true : p.isDead,
        };
      });

      const winnerPid = computeWinnerPid(nextPlayers);

      let nextState: KillerGameState = {
        ...state,
        players: nextPlayers,
        winnerPid,
        lastEvent: killed
          ? { kind: "killed", attackerPid: attacker.pid, targetPid: target.pid }
          : { kind: "hit_other", attackerPid: attacker.pid, targetPid: target.pid, lost, targetLives: nextTargetLives },
      };

      const phase = computePhase(nextState, params);

      if (phase === "ended" && winnerPid) {
        nextState = { ...nextState, phase, lastEvent: { kind: "winner", pid: winnerPid } };
      } else {
        nextState = { ...nextState, phase };
      }

      return nextState;
    }

    case "NUDGE_PHASE": {
      const winnerPid = computeWinnerPid(state.players);
      const nextState = { ...state, winnerPid };
      const phase = computePhase(nextState, params);
      if (phase === "ended" && winnerPid) {
        return { ...nextState, phase, lastEvent: { kind: "winner", pid: winnerPid } };
      }
      return { ...nextState, phase };
    }

    default:
      return state;
  }
}

// -----------------------------
// Public hook API
// -----------------------------
export function useKillerEngine(options: {
  players: Array<{ pid: string; name: string; killerNumber: number }>;
  params?: Partial<KillerEngineParams>;
}) {
  const paramsRef = React.useRef<KillerEngineParams>({
    ...defaultKillerParams,
    ...(options.params || {}),
  });

  React.useEffect(() => {
    paramsRef.current = { ...defaultKillerParams, ...(options.params || {}) };
  }, [options.params]);

  const [state, dispatch] = React.useReducer(
    (s: KillerGameState, a: Action) => reduceWithParams(s, paramsRef.current, a),
    undefined as any,
    () => {
      const merged = { ...defaultKillerParams, ...(options.params || {}) };
      const players = options.players || [];
      const initPlayers: KillerPlayerState[] = players.map((p) => ({
        pid: p.pid,
        name: p.name,
        killerNumber: normalizeNumber(p.killerNumber),
        lives: 0,
        isDead: false,
      }));

      const winnerPid = computeWinnerPid(initPlayers);
      const base: KillerGameState = {
        players: initPlayers,
        currentIndex: initPlayers.length ? 0 : 0,
        phase: "build",
        turn: 1,
        winnerPid,
        lastEvent: undefined,
      };

      const phase = computePhase(base, merged);
      return {
        ...base,
        phase,
        winnerPid: phase === "ended" ? winnerPid : undefined,
        lastEvent: winnerPid ? { kind: "winner", pid: winnerPid } : undefined,
      };
    }
  );

  // Reset si la liste des joueurs change (nouveau match)
  const playersKey = React.useMemo(() => {
    return (options.players || []).map((p) => `${p.pid}:${p.killerNumber}:${p.name}`).join("|");
  }, [options.players]);

  React.useEffect(() => {
    dispatch({ type: "RESET", payload: { players: options.players || [], params: options.params } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playersKey]);

  const api = React.useMemo(() => {
    return {
      state,

      params: paramsRef.current,

      reset: () => dispatch({ type: "RESET", payload: { players: options.players || [], params: options.params } }),

      setPlayerNumber: (pid: string, killerNumber: number) =>
        dispatch({ type: "SET_NUMBER", payload: { pid, killerNumber } }),

      setCurrentPlayer: (pid: string) => dispatch({ type: "SET_CURRENT", payload: { pid } }),

      throwDart: (hit: KillerHit) => dispatch({ type: "THROW", payload: { hit } }),

      nextPlayer: () => dispatch({ type: "NEXT_PLAYER" }),

      nudgePhase: () => dispatch({ type: "NUDGE_PHASE" }),

      // Helpers UI
      getCurrent: () => state.players[state.currentIndex],
      getAlive: () => alivePlayers(state.players),
      isPlayerKiller: (pid: string) => {
        const p = state.players.find((x) => x.pid === pid);
        return p ? isKiller(p, paramsRef.current) : false;
      },
    };
  }, [state, options.players, options.params]);

  return api;
}
