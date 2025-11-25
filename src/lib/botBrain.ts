// ============================================
// src/lib/botBrain.ts
// Petit "cerveau" BOT pour X01 V3
// - renvoie une volée de 3 fléchettes { seg, mul }
// - botLevel : "easy" | "medium" | "hard" | "pro" | "legend"
// ============================================

export type BotLevel = "easy" | "medium" | "hard" | "pro" | "legend";

export type BotDart = {
  seg: number; // 1–20 ou 25 (bull)
  mul: 1 | 2 | 3;
};

export type BotVisit = BotDart[];

export function computeBotVisit(
  level: BotLevel | undefined,
  currentScore: number
): BotVisit {
  const lvl: BotLevel =
    level && ["easy", "medium", "hard", "pro", "legend"].includes(level)
      ? (level as BotLevel)
      : "medium";

  // 1) Si on peut finir proprement → tenter le checkout
  const checkout = basicCheckout(currentScore, lvl);
  if (checkout) return checkout;

  // 2) Sinon, scorer en fonction du niveau
  return scoringPattern(currentScore, lvl);
}

// --------- FINISHER BASIQUE (double out only) ----------

function basicCheckout(score: number, level: BotLevel): BotVisit | null {
  // ignore les scores exotiques
  if (score <= 1 || score > 170) return null;

  // quelques checkouts classiques (échantillon)
  const table: Record<number, BotVisit> = {
    170: [
      { seg: 20, mul: 3 },
      { seg: 20, mul: 3 },
      { seg: 25, mul: 2 },
    ],
    167: [
      { seg: 20, mul: 3 },
      { seg: 19, mul: 3 },
      { seg: 25, mul: 2 },
    ],
    164: [
      { seg: 20, mul: 3 },
      { seg: 18, mul: 3 },
      { seg: 25, mul: 2 },
    ],
    160: [
      { seg: 20, mul: 3 },
      { seg: 20, mul: 3 },
      { seg: 20, mul: 2 },
    ],
    121: [
      { seg: 20, mul: 3 },
      { seg: 11, mul: 1 },
      { seg: 25, mul: 2 },
    ],
    110: [
      { seg: 20, mul: 1 },
      { seg: 18, mul: 2 },
      { seg: 16, mul: 2 },
    ],
    100: [
      { seg: 20, mul: 1 },
      { seg: 20, mul: 1 },
      { seg: 20, mul: 2 },
    ],
    64: [
      { seg: 16, mul: 3 },
      { seg: 8, mul: 2 },
      { seg: 0 as any, mul: 1 }, // "sécurité"
    ],
    40: [
      { seg: 20, mul: 2 },
      { seg: 0 as any, mul: 1 },
      { seg: 0 as any, mul: 1 },
    ],
    32: [
      { seg: 16, mul: 2 },
      { seg: 0 as any, mul: 1 },
      { seg: 0 as any, mul: 1 },
    ],
  };

  const forced = table[score];
  if (!forced) return null;

  // Niveau faible : chance de "louper" le checkout
  const missProb =
    level === "easy" ? 0.7 : level === "medium" ? 0.4 : level === "hard" ? 0.25 : 0.15;

  if (Math.random() < missProb) {
    return randomizeVisitAround(forced);
  }
  return forced;
}

function randomizeVisitAround(visit: BotVisit): BotVisit {
  // On "lâche" un peu les segments pour simuler un raté
  return visit.map((d) => {
    if (d.seg === 0) return d;
    const drift = Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? -1 : +1;
    const seg = Math.min(20, Math.max(1, d.seg + drift));
    const mul = Math.random() < 0.3 ? 1 : d.mul; // parfois simple
    return { seg, mul: mul as 1 | 2 | 3 };
  });
}

// --------- SCORING GÉNÉRAL ----------

function scoringPattern(score: number, level: BotLevel): BotVisit {
  // cible principale
  const mainTarget =
    level === "easy"
      ? 19
      : level === "medium"
      ? 18
      : level === "hard"
      ? 20
      : 20; // pro/legend

  const tripleProb =
    level === "easy"
      ? 0.2
      : level === "medium"
      ? 0.4
      : level === "hard"
      ? 0.6
      : level === "pro"
      ? 0.75
      : 0.85;

  const bullProb = level === "legend" ? 0.25 : level === "pro" ? 0.15 : 0.05;

  const darts: BotVisit = [];

  for (let i = 0; i < 3; i++) {
    // parfois bull pour les forts
    if (Math.random() < bullProb && score > 50) {
      darts.push({ seg: 25, mul: Math.random() < 0.4 ? 2 : 1 });
      continue;
    }

    let seg = mainTarget;
    let mul: 1 | 2 | 3 = Math.random() < tripleProb ? 3 : 1;

    // un peu de drift sur le segment
    const off =
      Math.random() < 0.4
        ? 0
        : Math.random() < 0.5
        ? -1
        : +1;
    seg = Math.min(20, Math.max(1, seg + off));

    // petits niveaux : plus de simples
    if (level === "easy" && Math.random() < 0.6) mul = 1;
    if (level === "medium" && Math.random() < 0.3) mul = 1;

    darts.push({ seg, mul });
  }

  return darts;
}
