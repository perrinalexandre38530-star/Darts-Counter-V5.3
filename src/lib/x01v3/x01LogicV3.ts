// =======================================================
// src/lib/x01v3/x01LogicV3.ts
// Logique de base X01 V3 : score, bust, visits, dartsLeft
// - Calcul du score d'une fléchette
// - Application à la visite en cours
// - Gestion bust (simple / double / master-out)
// - Respect du nombre de fléchettes restantes
// - Préparation pour le moteur / UI / stats
// =======================================================

import type {
    X01ConfigV3,
    X01MatchStateV3,
    X01VisitStateV3,
    X01DartV3,
    X01OutMode,
  } from "../../types/x01v3";
  
  /* -------------------------------------------------------
     Type d'entrée depuis le Keypad
  ------------------------------------------------------- */
  export interface X01DartInputV3 {
    segment: number | 25;      // 1-20, 25 pour bull
    multiplier: 0 | 1 | 2 | 3; // 0=miss, 1=S, 2=D, 3=T
  }
  
  /* -------------------------------------------------------
     Résultat d'un lancer
  ------------------------------------------------------- */
  export interface X01DartResultV3 {
    dart: X01DartV3;
    scoreBefore: number;
    scoreAfter: number;
    bust: boolean;
    finishingAttempt: boolean;
  }
  
  /* -------------------------------------------------------
     1. Calcul du score d'une fléchette
  ------------------------------------------------------- */
  export function scoreDartV3(input: X01DartInputV3): number {
    const { segment, multiplier } = input;
  
    if (multiplier === 0) return 0; // MISS
  
    // Triple bull n'existe pas
    if (segment === 25 && multiplier === 3) return 0;
  
    // Sécurité : segments valides uniquement
    if (segment < 1 || (segment > 20 && segment !== 25)) {
      return 0;
    }
  
    // Bull = 25, DBull = 50
    if (segment === 25) {
      return 25 * multiplier;
    }
  
    return segment * multiplier;
  }
  
  /* -------------------------------------------------------
     2. Le dernier dart respecte-t-il le mode de sortie ?
     - simple : tout est autorisé (y compris bull / double / triple)
     - double : dernier dart doit être un double
     - master : dernier dart doit être double ou triple
  ------------------------------------------------------- */
  export function isFinishingDartValidV3(
    outMode: X01OutMode,
    dart: X01DartV3
  ): boolean {
    if (outMode === "single") {
      return true;
    }
  
    if (outMode === "double") {
      // Double : dernier dart doit être un double (D1-D20 ou DBull)
      return dart.multiplier === 2;
    }
  
    if (outMode === "master") {
      // Master : dernier dart doit être double ou triple
      return dart.multiplier === 2 || dart.multiplier === 3;
    }
  
    return true;
  }
  
  /* -------------------------------------------------------
     3. Initialiser une nouvelle visite pour le joueur actif
     - 3 fléchettes
     - startingScore = score courant du joueur
  ------------------------------------------------------- */
  export function startNewVisitV3(
    state: X01MatchStateV3
  ): X01VisitStateV3 {
    const currentScore = state.scores[state.activePlayer];
  
    const visit: X01VisitStateV3 = {
      dartsLeft: 3,
      startingScore: currentScore,
      currentScore,
      darts: [],
      checkoutSuggestion: null, // sera calculé plus tard par un module dédié
    };
  
    state.visit = visit;
    return visit;
  }
  
  /* -------------------------------------------------------
     4. Appliquer une fléchette à la visite en cours
     - met à jour visit.currentScore
     - décrémente dartsLeft
     - gère bust
     - NE gère PAS encore legs/sets/match (flow séparé)
  ------------------------------------------------------- */
  export function applyDartToCurrentPlayerV3(
    config: X01ConfigV3,
    state: X01MatchStateV3,
    input: X01DartInputV3
  ): X01DartResultV3 {
    const visit = state.visit;
  
    if (!visit) {
      throw new Error("[X01LogicV3] Visit inexistante : appelez startNewVisitV3 d'abord.");
    }
    if (visit.dartsLeft <= 0) {
      throw new Error("[X01LogicV3] Plus de fléchettes disponibles dans cette visite.");
    }
  
    const scoreBefore = visit.currentScore;
  
    // Construction du dart complet
    const dart: X01DartV3 = {
      segment: input.segment,
      multiplier: input.multiplier,
      score: scoreDartV3(input),
    };
  
    // Nouveau score temporaire
    let scoreAfter = scoreBefore - dart.score;
    let bust = false;
    let finishingAttempt = false;
  
    // Règles de bust
    if (scoreAfter < 0) {
      // Score négatif = bust
      bust = true;
    } else if (scoreAfter === 0) {
      // Tentative de finish
      finishingAttempt = true;
  
      // Vérifier le mode de sortie (simple / double / master)
      const validFinish = isFinishingDartValidV3(config.outMode, dart);
  
      if (!validFinish) {
        // Sortie invalide → bust
        bust = true;
      }
    } else if (scoreAfter === 1 && config.outMode !== "single") {
      // Double-out / Master-out : score de 1 = impossible → bust
      bust = true;
    }
  
    // Mise à jour de la visite selon bust ou pas
    if (bust) {
      // On ajoute quand même le dart à l'historique de la volée
      visit.darts.push(dart);
  
      // BUST → score du joueur revient à startingScore
      visit.currentScore = visit.startingScore;
  
      // Mise à jour du score global du joueur actif
      state.scores[state.activePlayer] = visit.startingScore;
  
      // La visite est terminée (toutes les fléchettes "consommées")
      visit.dartsLeft = 0;
      state.status = "playing"; // le flow global décidera du next player
  
      return {
        dart,
        scoreBefore,
        scoreAfter: visit.startingScore,
        bust: true,
        finishingAttempt,
      };
    }
  
    // Pas bust → on applique le nouveau score
    visit.currentScore = scoreAfter;
    state.scores[state.activePlayer] = scoreAfter;
  
    // On enregistre le dart
    visit.darts.push(dart);
  
    // Une fléchette de moins
    visit.dartsLeft = (visit.dartsLeft - 1) as 0 | 1 | 2 | 3;
  
    // Si scoreAfter > 0 → la manche continue
    // Si scoreAfter === 0 → le flow global (x01FlowV3 + moteur) gérera leg/set/match
  
    const result: X01DartResultV3 = {
      dart,
      scoreBefore,
      scoreAfter,
      bust: false,
      finishingAttempt,
    };
  
    return result;
  }
  