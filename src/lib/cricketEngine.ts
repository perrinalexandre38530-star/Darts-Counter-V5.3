// ============================================
// src/lib/cricketEngine.ts
// Moteur Cricket v2
// - Cibles 15..20 + Bull (25)
// - 0..14 = MISS : consomme la fléchette, pas de marks/points
// - Option withPoints : mode "points" / "sans points"
// - Historique pour Undo
// ============================================

export type CricketTarget = 15 | 16 | 17 | 18 | 19 | 20 | 25;
export type Multiplier = 1 | 2 | 3;

// à l'exécution on autorise aussi 0..14 pour gérer les MISS
export type RawTarget = CricketTarget | number;

export type CricketPlayerState = {
  id: string;
  name: string;
  marks: Record<CricketTarget, number>;
  score: number;
};

export type CricketHistoryEntry = {
  playerIndex: number;
  target: RawTarget;
  mult: Multiplier;
  prevMarks: number;
  prevScore: number;
  prevCurrentPlayerIndex: number;
  prevRemainingDarts: number;
  prevWinnerId: string | null;
};

export type CricketState = {
  players: CricketPlayerState[];
  currentPlayerIndex: number;
  remainingDarts: number;
  winnerId: string | null;
  withPoints: boolean;
  maxRounds: number;
  roundNumber: number;
  history: CricketHistoryEntry[];
};

export const CRICKET_TARGETS: CricketTarget[] = [20, 19, 18, 17, 16, 15, 25];

function isClosed(marks: number): boolean {
  return marks >= 3;
}

function cloneState(state: CricketState): CricketState {
  return {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      marks: { ...p.marks },
    })),
    history: [...state.history],
  };
}

function isTargetValid(t: RawTarget): t is CricketTarget {
  return CRICKET_TARGETS.includes(t as CricketTarget);
}

// ---------- Création match ----------

export type CreateCricketMatchOptions = {
  withPoints?: boolean;
  maxRounds?: number;
};

export function createCricketMatch(
  players: { id: string; name: string }[],
  opts: CreateCricketMatchOptions = {}
): CricketState {
  const withPoints = opts.withPoints ?? true;
  const maxRounds = opts.maxRounds ?? 20;

  const baseMarks: Record<CricketTarget, number> = {
    15: 0,
    16: 0,
    17: 0,
    18: 0,
    19: 0,
    20: 0,
    25: 0,
  };

  const playerStates: CricketPlayerState[] = players.map((p) => ({
    id: p.id,
    name: p.name,
    marks: { ...baseMarks },
    score: 0,
  }));

  return {
    players: playerStates,
    currentPlayerIndex: 0,
    remainingDarts: 3,
    winnerId: null,
    withPoints,
    maxRounds,
    roundNumber: 1,
    history: [],
  };
}

// ---------- Calcul vainqueur ----------

function checkWinner(state: CricketState): string | null {
  // tous les joueurs qui ont tout fermé
  const closedPlayers = state.players.filter((p) =>
    CRICKET_TARGETS.every((t) => isClosed(p.marks[t] ?? 0))
  );
  if (closedPlayers.length === 0) return null;

  if (!state.withPoints) {
    // sans points : premier qui ferme tout gagne
    return closedPlayers[0].id;
  }

  // avec points : fermé + score >= aux autres, et meilleur score
  const bestCandidate = closedPlayers.reduce<CricketPlayerState | null>(
    (best, player) => {
      const otherScores = state.players
        .filter((p) => p.id !== player.id)
        .map((p) => p.score);
      const maxOther = otherScores.length
        ? Math.max(...otherScores)
        : Number.NEGATIVE_INFINITY;

      // doit être au moins à égalité de points
      if (player.score < maxOther) return best;

      if (!best || player.score > best.score) return player;
      return best;
    },
    null
  );

  return bestCandidate ? bestCandidate.id : null;
}

// ---------- Application d'un hit ----------

export function applyCricketHit(
  state: CricketState,
  target: RawTarget,
  mult: Multiplier
): CricketState {
  if (state.winnerId) return state;

  const next = cloneState(state);
  const playerIndex = next.currentPlayerIndex;
  const player = next.players[playerIndex];

  const isValid = isTargetValid(target);
  const cricketTarget = isValid ? (target as CricketTarget) : null;

  const beforeMarks = cricketTarget ? player.marks[cricketTarget] ?? 0 : 0;
  const beforeScore = player.score;

  // --- Marks + points seulement si cible Cricket (15..20 / Bull) ---
  if (cricketTarget) {
    let newMarks = beforeMarks + mult;
    if (newMarks < 0) newMarks = 0;
    player.marks[cricketTarget] = newMarks;

    if (next.withPoints) {
      const anyOpponentOpen = next.players.some((p, idx) => {
        if (idx === playerIndex) return false;
        const oppMarks = p.marks[cricketTarget] ?? 0;
        return !isClosed(oppMarks);
      });

      if (anyOpponentOpen) {
        const prevSurplus = Math.max(0, beforeMarks - 3);
        const newSurplus = Math.max(0, newMarks - 3);
        const surplusDelta = newSurplus - prevSurplus;

        if (surplusDelta > 0) {
          const value = cricketTarget === 25 ? 25 : (cricketTarget as number);
          player.score += surplusDelta * value;
        }
      }
    }
  }
  // si 0..14 : on ne touche à rien, ce sera un MISS "pur"

  // --- Historique pour Undo (y compris MISS) ---
  next.history.push({
    playerIndex,
    target,
    mult,
    prevMarks: beforeMarks,
    prevScore: beforeScore,
    prevCurrentPlayerIndex: state.currentPlayerIndex,
    prevRemainingDarts: state.remainingDarts,
    prevWinnerId: state.winnerId,
  });

  // --- Consommation fléchette + passage joueur ---
  next.remainingDarts -= 1;

  if (next.remainingDarts <= 0 && !next.winnerId) {
    next.currentPlayerIndex =
      (next.currentPlayerIndex + 1) % next.players.length;
    next.remainingDarts = 3;
    next.roundNumber = Math.min(next.roundNumber + 1, next.maxRounds);
  }

  // --- Vérifier victoire seulement si cible valide ---
  if (cricketTarget) {
    const winner = checkWinner(next);
    if (winner) {
      next.winnerId = winner;
      next.remainingDarts = 0;
    }
  }

  return next;
}

// ---------- Undo ----------

export function undoLastCricketHit(state: CricketState): CricketState {
  if (!state.history.length) return state;
  const entry = state.history[state.history.length - 1];

  const next = cloneState(state);
  next.history.pop();

  const player = next.players[entry.playerIndex];

  // si la cible était valide, on peut restaurer les marks
  if (isTargetValid(entry.target)) {
    player.marks[entry.target] = entry.prevMarks;
  }
  player.score = entry.prevScore;

  next.currentPlayerIndex = entry.prevCurrentPlayerIndex;
  next.remainingDarts = entry.prevRemainingDarts;
  next.winnerId = entry.prevWinnerId;

  return next;
}
