// ============================================
// src/lib/statsLiteIDB.ts
// Mini-cache profils (localStorage) pour Home/Profils/Stats
// - commitLiteFromLeg : alimente depuis un LEG "legacy maps"
// - addMatchSummary   : alimente depuis un résumé de match
// - getBasicProfileStatsSync : lecture (avg3, best, win%, co%)
// ============================================

export type LiteAcc = {
  // accumulateurs
  sumPoints: number;   // somme des points "validés"
  sumDarts: number;    // nombre de fléchettes jouées
  bestVisit: number;   // meilleure volée (max 3 darts)
  bestCheckout: number; // meilleur checkout
  legs: number;        // nombre de legs terminés
  wins: number;        // legs gagnés
  coHits: number;      // checkouts réussis
  coAtt: number;       // tentatives de checkout
};

type LiteDB = Record<string, LiteAcc>; // clé = playerId

const KEY = "dc-lite-v1";

function load(): LiteDB {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return typeof obj === "object" && obj ? obj : {};
  } catch {
    return {};
  }
}
function save(db: LiteDB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // ignore
  }
}

function acc(db: LiteDB, id: string): LiteAcc {
  if (!db[id]) {
    db[id] = {
      sumPoints: 0,
      sumDarts: 0,
      bestVisit: 0,
      bestCheckout: 0,
      legs: 0,
      wins: 0,
      coHits: 0,
      coAtt: 0,
    };
  }
  return db[id];
}

const N = (x: any, d = 0) => {
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
};
const clampCO = (v: any) => {
  const n = Math.round(N(v));
  return n === 50 || (n >= 2 && n <= 170) ? n : 0;
};

// --------------------------------------------
// API 1 — Commit depuis un LEG (legacy maps)
// Expecte un objet "legacy-like" tel que passé à EndOfLegOverlay
//   - darts[pid], pointsScored[pid] (ou avg3 + darts → points)
//   - bestVisit[pid], bestCheckout[pid]
//   - checkoutHits[pid], checkoutAttempts[pid]
// --------------------------------------------
export function commitLiteFromLeg(
  legacyOrRes: any,
  playersLite: Array<{ id: string; name?: string }>,
  winnerId: string | null
) {
  const db = load();

  const players = Array.isArray(playersLite) ? playersLite : [];
  const darts = legacyOrRes?.darts || {};
  const pointsScored = legacyOrRes?.pointsScored || {};
  const avg3 = legacyOrRes?.avg3 || {};
  const bestVisit = legacyOrRes?.bestVisit || {};
  const bestCheckout = legacyOrRes?.bestCheckout || {};
  const coHits = legacyOrRes?.checkoutHits || {};
  const coAtt = legacyOrRes?.checkoutAttempts || {};

  for (const p of players) {
    const pid = String(p.id);
    const a = acc(db, pid);

    const d = N(darts[pid], 0);
    // points : si absents, on reconstruit avec avg3 * darts / 3
    const pts =
      pointsScored && pid in pointsScored
        ? N(pointsScored[pid], 0)
        : d > 0
        ? (N(avg3[pid], 0) / 3) * d
        : 0;

    a.sumDarts += d;
    a.sumPoints += pts;

    a.bestVisit = Math.max(a.bestVisit, N(bestVisit[pid], 0));
    a.bestCheckout = Math.max(a.bestCheckout, clampCO(bestCheckout[pid]));

    a.coHits += N(coHits[pid], 0);
    a.coAtt += N(coAtt[pid], 0);

    a.legs += 1;
    if (winnerId && pid === winnerId) a.wins += 1;
  }

  save(db);
}

// --------------------------------------------
// API 2 — Commit depuis un résumé de match
//   addMatchSummary({ winnerId, perPlayer: { [pid]: { darts, points, bestVisit, bestCheckout, coHits, coAtt, legs? } } })
// --------------------------------------------
export async function addMatchSummary(arg: {
  winnerId?: string | null;
  perPlayer: Record<
    string,
    {
      darts?: number;
      points?: number;
      bestVisit?: number;
      bestCheckout?: number;
      coHits?: number;
      coAtt?: number;
      legs?: number;
      win?: boolean;
    }
  >;
}) {
  const db = load();
  const per = arg?.perPlayer || {};
  const winnerId = arg?.winnerId || null;

  for (const pid of Object.keys(per)) {
    const p = per[pid] || {};
    const a = acc(db, pid);

    a.sumDarts += N(p.darts, 0);
    a.sumPoints += N(p.points, 0);
    a.bestVisit = Math.max(a.bestVisit, N(p.bestVisit, 0));
    a.bestCheckout = Math.max(a.bestCheckout, clampCO(p.bestCheckout));
    a.coHits += N(p.coHits, 0);
    a.coAtt += N(p.coAtt, 0);

    const legsInc = Math.max(1, N(p.legs, 1)); // au moins 1 match = 1 leg minimal pour le % simple
    a.legs += legsInc;

    if (p.win || (winnerId && pid === winnerId)) a.wins += 1;
  }

  save(db);
}

// --------------------------------------------
// API 3 — Lecture simplifiée pour cartes Home/Profils/Stats
// --------------------------------------------
export function getBasicProfileStatsSync(playerId: string) {
  const db = load();
  const a = db[playerId];
  if (!a) {
    return {
      avg3: 0,
      bestVisit: 0,
      bestCheckout: 0,
      winPct: 0,
      coPct: 0,
      legs: 0,
    };
  }
  const avg3 = a.sumDarts > 0 ? (a.sumPoints / a.sumDarts) * 3 : 0;
  const winPct = a.legs > 0 ? Math.round((a.wins / a.legs) * 1000) / 10 : 0;
  const coPct = a.coAtt > 0 ? Math.round((a.coHits / a.coAtt) * 1000) / 10 : 0;

  return {
    avg3: Math.round(avg3 * 100) / 100,
    bestVisit: a.bestVisit,
    bestCheckout: a.bestCheckout,
    winPct,
    coPct,
    legs: a.legs,
  };
}

// (optionnel) reset manuel
export function __resetLiteStats() {
  save({});
}
