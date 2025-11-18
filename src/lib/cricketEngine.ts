// ============================================
// src/lib/cricketEngine.ts
// Moteur Cricket standard (20–15 + Bull)
// - Marquage : 3 croix pour fermer un numéro
// - Sur-marques = points si les adversaires n'ont pas fermé
// - Victoire : joueur qui a tout fermé ET score >= aux autres
// ============================================

export type CricketTarget = 15 | 16 | 17 | 18 | 19 | 20 | 25;

export const CRICKET_TARGETS: CricketTarget[] = [20, 19, 18, 17, 16, 15, 25];

export type Multiplier = 1 | 2 | 3;

export type CricketPlayerInput = {
  id: string;
  name: string;
};

export type CricketPlayerState = {
  id: string;
  name: string;
  marks: Record<CricketTarget, number>; // 0..3 (+ sur-marques ignorées ici)
  score: number;
};

export type CricketHitEvent = {
  playerId: string;
  target: CricketTarget;
  mult: Multiplier;
  scored: number; // points gagnés sur ce dart
  overMarks: number; // sur-marques (au-delà de la 3ème croix)
  beforeMarks: number;
  afterMarks: number;
};

export type CricketState = {
  players: CricketPlayerState[];
  currentPlayerIndex: number;
  remainingDarts: number; // 3 -> 0
  winnerId: string | null;
  history: CricketHitEvent[]; // pour stats / undo simple
};

// Helper : valeur d’un target (Bull = 25)
export function cricketTargetValue(target: CricketTarget): number {
  return target === 25 ? 25 : target;
}

// Crée l’état initial d’un joueur
function createPlayerState(input: CricketPlayerInput): CricketPlayerState {
  const marks: Record<CricketTarget, number> = {
    20: 0,
    19: 0,
    18: 0,
    17: 0,
    16: 0,
    15: 0,
    25: 0,
  };
  return {
    id: input.id,
    name: input.name,
    marks,
    score: 0,
  };
}

// Crée un match de Cricket
export function createCricketMatch(
  players: CricketPlayerInput[]
): CricketState {
  if (players.length < 2) {
    throw new Error("Cricket nécessite au moins 2 joueurs");
  }
  return {
    players: players.map(createPlayerState),
    currentPlayerIndex: 0,
    remainingDarts: 3,
    winnerId: null,
    history: [],
  };
}

// Check si un target est "ouvert pour scorer" pour playerId (au moins un adversaire n'a pas fermé)
function isTargetScoringOpen(
  state: CricketState,
  target: CricketTarget,
  scoringPlayerId: string
): boolean {
  for (const p of state.players) {
    if (p.id === scoringPlayerId) continue;
    if (p.marks[target] < 3) return true;
  }
  return false;
}

// Vérifie si un joueur a tout fermé
function hasClosedAllTargets(player: CricketPlayerState): boolean {
  return CRICKET_TARGETS.every((t) => player.marks[t] >= 3);
}

// Applique un hit (un dart) et retourne un **nouvel** état
export function applyCricketHit(
  prev: CricketState,
  target: CricketTarget,
  mult: Multiplier
): CricketState {
  if (prev.winnerId) {
    // Manche déjà terminée
    return prev;
  }

  const currentPlayer = prev.players[prev.currentPlayerIndex];

  // Clone profond minimal
  const players: CricketPlayerState[] = prev.players.map((p) => ({
    ...p,
    marks: { ...p.marks },
  }));

  const player = players[prev.currentPlayerIndex];

  const beforeMarks = player.marks[target];
  const totalMarks = beforeMarks + mult;
  const afterMarks = Math.min(3, totalMarks);
  const gainedMarks = afterMarks - beforeMarks;
  const overMarks = totalMarks - afterMarks; // peut être 0..2

  let scored = 0;
  if (overMarks > 0 && isTargetScoringOpen(prev, target, player.id)) {
    scored = overMarks * cricketTargetValue(target);
  }

  player.marks[target] = afterMarks;
  player.score += scored;

  let winnerId: string | null = prev.winnerId;

  // Condition de victoire : tout fermé + score >= tous les autres
  if (!winnerId && hasClosedAllTargets(player)) {
    const bestOpponentScore = prev.players
      .filter((p) => p.id !== player.id)
      .reduce((max, p) => (p.score > max ? p.score : max), 0);
    if (player.score >= bestOpponentScore) {
      winnerId = player.id;
    }
  }

  // Gestion du tour (3 fléchettes max)
  let remainingDarts = prev.remainingDarts - 1;
  let currentPlayerIndex = prev.currentPlayerIndex;
  if (remainingDarts <= 0 && !winnerId) {
    remainingDarts = 3;
    currentPlayerIndex = (prev.currentPlayerIndex + 1) % players.length;
  }

  const hit: CricketHitEvent = {
    playerId: player.id,
    target,
    mult,
    scored,
    overMarks,
    beforeMarks,
    afterMarks,
  };

  return {
    players,
    currentPlayerIndex,
    remainingDarts,
    winnerId,
    history: [...prev.history, hit],
  };
}

// Undo du **dernier dart**
export function undoLastCricketHit(prev: CricketState): CricketState {
  if (prev.history.length === 0) return prev;

  const last = prev.history[prev.history.length - 1];

  const players: CricketPlayerState[] = prev.players.map((p) => ({
    ...p,
    marks: { ...p.marks },
  }));

  const playerIndex = players.findIndex((p) => p.id === last.playerId);
  if (playerIndex === -1) return prev;

  const player = players[playerIndex];

  // Restaure les marks de ce target
  player.marks[last.target] = last.beforeMarks;
  player.score -= last.scored;

  // Gestion du tour : on "remonte" d'une fléchette
  let remainingDarts = prev.remainingDarts + 1;
  let currentPlayerIndex = prev.currentPlayerIndex;

  if (remainingDarts > 3) {
    remainingDarts = 1;
    currentPlayerIndex =
      (prev.currentPlayerIndex - 1 + players.length) % players.length;
  }

  const history = prev.history.slice(0, -1);

  return {
    players,
    currentPlayerIndex,
    remainingDarts,
    winnerId: null, // annule la victoire potentielle, on recalcule à la suite
    history,
  };
}
