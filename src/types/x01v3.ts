// ===============================================
// src/types/x01v3.ts
// Types unifiés pour le moteur X01 V3
// - Solo, Multi, Teams, Online
// - Stats live + Match
// - Legs / Sets / Visits / Darts
// - Checkout suggestions
// ===============================================

/* -----------------------------------------------
   ID / Identité
----------------------------------------------- */
export type X01PlayerId = string;
export type X01TeamId = string;

/* -----------------------------------------------
   Modes de jeu
----------------------------------------------- */
export type X01InMode = "single" | "double" | "master";
export type X01OutMode = "single" | "double" | "master";

export type X01GameMode = "solo" | "multi" | "teams";

/* -----------------------------------------------
   Joueurs & Équipes
----------------------------------------------- */
export interface X01PlayerV3 {
  id: X01PlayerId;
  name: string;
  avatar?: string; // dataURL ou url
}

export interface X01TeamV3 {
  id: X01TeamId;
  name: string;
  players: X01PlayerId[];
}

/* -----------------------------------------------
   Configuration du match
----------------------------------------------- */
export interface X01ConfigV3 {
  startScore: 301 | 501 | 701 | 901;
  inMode: X01InMode;
  outMode: X01OutMode;

  gameMode: X01GameMode;

  players: X01PlayerV3[]; // multi / solo
  teams?: X01TeamV3[] | null; // teams

  // Format Sets / Legs
  legsPerSet: 1 | 3 | 5 | 7 | 9 | 11 | 13;
  setsToWin: 1 | 3 | 5 | 7 | 9 | 11 | 13;

  // Serve: random / alterné
  serveMode: "random" | "alternate";
}

/* -----------------------------------------------
   Statut du match
----------------------------------------------- */
export interface X01MatchStateV3 {
  matchId: string;

  currentSet: number;
  currentLeg: number;

  activePlayer: X01PlayerId; // joueur qui tire maintenant
  throwOrder: X01PlayerId[]; // ordre complet rotation

  // Score pour chaque joueur dans la leg en cours
  scores: Record<X01PlayerId, number>;

  // Legs & sets gagnés
  legsWon: Record<X01PlayerId, number>;
  setsWon: Record<X01PlayerId, number>;

  // Équipes : score team
  teamLegsWon?: Record<X01TeamId, number>;
  teamSetsWon?: Record<X01TeamId, number>;

  // Visite en cours
  visit: X01VisitStateV3;

  // Statut global du match
  status: "playing" | "leg_end" | "set_end" | "match_end";
}

/* -----------------------------------------------
   Une visite (volée de 3 fléchettes)
----------------------------------------------- */
export interface X01VisitStateV3 {
  dartsLeft: 0 | 1 | 2 | 3; // fléchettes restantes
  startingScore: number; // score avant la volée
  currentScore: number; // score après chaque dart
  darts: X01DartV3[]; // données des fléchettes
  checkoutSuggestion: X01CheckoutSuggestionV3 | null;
}

/* -----------------------------------------------
   Un lancer de fléchette
----------------------------------------------- */
export interface X01DartV3 {
  segment: number | 25; // 1-20 ou 25 pour bull
  multiplier: 0 | 1 | 2 | 3; // 0=miss, 1=S, 2=D, 3=T
  score: number; // segment * multiplier
}

/* -----------------------------------------------
   Checkout Suggestion (UNE SEULE LIGNE)
----------------------------------------------- */
export interface X01CheckoutSuggestionV3 {
  darts: X01CheckoutDartV3[];
  total: number;
}

export interface X01CheckoutDartV3 {
  segment: number | 25;
  multiplier: 1 | 2 | 3; // jamais 0 dans suggestion
}

/* -----------------------------------------------
   Stats LIVE (par leg)
----------------------------------------------- */

// Hits S/D/T pour un segment donné
export interface X01SegmentHits {
  S: number; // simple
  D: number; // double
  T: number; // triple
}

export interface X01StatsLiveV3 {
  // -------- Stats classiques --------
  dartsThrown: number;
  visits: number;
  totalScore: number;

  bestVisit: number;

  // Miss + bust (toutes flèches confondues)
  miss: number;
  bust: number;

  // Résumé global des hits (ancienne structure)
  hits: {
    S: number;
    D: number;
    T: number;
    Bull: number;
    DBull: number;
  };

  // Ancienne structure par segment (toujours utile pour compat)
  bySegment: Record<string, { S: number; D: number; T: number }>;

  // -------- PATCH STATS COMPLETES (RADAR + HITS DÉTAILLÉS) --------

  // Hits par segment 1..20 + 25 (bull)
  hitsBySegment: Record<number, X01SegmentHits>;

  // Nombre de coups simples / doubles / triples
  hitsSingle: number;
  hitsDouble: number;
  hitsTriple: number;

  // Pourcentages
  pctMiss: number; // % de miss sur l'ensemble des darts
  pctS: number;    // % des hits qui sont des simples
  pctD: number;    // % des hits qui sont des doubles
  pctT: number;    // % des hits qui sont des triples

  // Détail complet des darts : [{ v, m }]
  dartsDetail: Array<{ v: number; m: number }>;

  // Score total par visite (pour graph "score per visit")
  scorePerVisit: number[];
}


export interface X01StatsLiveV3 {
  // -------- Stats classiques --------
  dartsThrown: number;
  visits: number;
  totalScore: number;
  bestVisit: number;

  // (peut être calculé à partir de dartsThrown + totalScore)
  avg3?: number;

  // Miss + bust (toutes flèches confondues)
  miss: number;
  bust: number;

  // Résumé global des hits (ancienne structure)
  hits: {
    S: number;
    D: number;
    T: number;
    Bull: number;
    DBull: number;
  };

  // Ancienne structure par segment (toujours utile pour compat)
  bySegment: Record<string, { S: number; D: number; T: number }>;

  // -------- PATCH STATS COMPLETES (RADAR + HITS DÉTAILLÉS) --------

  // Hits par segment 1..20 + 25 (bull)
  hitsBySegment: Record<number, X01SegmentHits>;

  // Nombre de coups simples / doubles / triples
  hitsSingle: number;
  hitsDouble: number;
  hitsTriple: number;

  // Pourcentages
  pctMiss: number; // % de miss sur l'ensemble des darts
  pctS: number; // % des hits qui sont des simples
  pctD: number; // % des hits qui sont des doubles
  pctT: number; // % des hits qui sont des triples

  // Détail complet des darts : [{ v, m }]
  dartsDetail: Array<{ v: number; m: number }>;

  // Score total par visite (pour graph "score per visit")
  scorePerVisit: number[];
}

/* -----------------------------------------------
   Stats d’un match complet
----------------------------------------------- */
export interface X01MatchStatsV3 {
  players: Record<
    X01PlayerId,
    {
      legsWon: number;
      setsWon: number;
      avg3: number;
      dartsThrown: number;
      visits: number;
      bestVisit: number;

      miss: number;
      bust: number;

      hits: {
        S: number;
        D: number;
        T: number;
        Bull: number;
        DBull: number;
      };

      bySegment: Record<string, { S: number; D: number; T: number }>;

      // Score total cumulé du match
      totalScore: number;
    }
  >;

  winnerPlayerId?: X01PlayerId;
  winnerTeamId?: X01TeamId;
}

/* -----------------------------------------------
   Événements envoyés au moteur UI
----------------------------------------------- */
export interface X01EngineEventsV3 {
  onScoreChange?: (playerId: X01PlayerId, score: number) => void;

  onNextPlayer?: (playerId: X01PlayerId) => void;

  onLegWin?: (playerIdOrTeamId: string) => void;
  onSetWin?: (playerIdOrTeamId: string) => void;
  onMatchWin?: (playerIdOrTeamId: string) => void;

  onVisitChange?: (visit: X01VisitStateV3) => void;
}

/* -----------------------------------------------
   Commandes de moteur (local + online)
----------------------------------------------- */
export type X01CommandV3 =
  | { type: "throw"; dart: X01DartV3 }
  | { type: "undo" }
  | { type: "next" }
  | { type: "force_next_player" }
  | { type: "sync_state"; state: X01MatchStateV3 };
