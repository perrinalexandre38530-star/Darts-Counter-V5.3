// ============================================
// src/lib/statsBridge.ts
// Pont de stats "tolérant" + exports attendus par l'UI
// Expose :
//   - types: Visit, PlayerLite, BasicProfileStats
//   - objet StatsBridge { makeLeg, commitLegAndAccumulate, makeMatch,
//                         commitMatchAndSave, getBasicProfileStats,
//                         getMergedProfilesStats, getProfileQuickStats,
//                         getBasicProfileStatsAsync, getCricketProfileStats,
//                         getX01MultiLegsSetsForProfile }
//   - alias nommés (compat pages): getBasicProfileStats, getMergedProfilesStats,
//                                  getProfileQuickStats, getBasicProfileStatsAsync,
//                                  getCricketProfileStats,
//                                  getX01MultiLegsSetsForProfile
// ============================================

import { History } from "./history";
import type { SavedMatch } from "./history";
import {
  aggregateCricketProfileStats,
  type CricketLegStats,
  type CricketProfileStats,
} from "./cricketStats";

/* ---------- Types publics ---------- */

export type Seg = {
  v: number;
  mult?: 1 | 2 | 3;
};

export type Visit = {
  p: string; // playerId
  segments?: Seg[]; // flèches de la volée
  score?: number; // points de la volée (0 si bust)
  bust?: boolean;
  isCheckout?: boolean; // true si fin du leg
  remainingAfter?: number; // reste après la volée
  ts?: number;
};

export type PlayerLite = {
  id: string;
  name?: string;
  avatarDataUrl?: string | null;
};

export type BasicProfileStats = {
  games: number;
  darts: number;
  avg3: number;
  bestVisit: number;
  bestCheckout: number;
  wins: number;

  // Extensions (facultatives, non breaking)
  coTotal?: number; // total checkouts cumulés (summary.co)
  winRate?: number; // % de victoires 0..100
};

/* ---------- Maps "legacy" internes (overlay X01 etc.) ---------- */

type LegacyMaps = {
  order: string[];
  winnerId: string | null;

  remaining: Record<string, number>;
  darts: Record<string, number>;
  visits: Record<string, number>;
  points: Record<string, number>;
  avg3: Record<string, number>;
  bestVisit: Record<string, number>;
  bestCheckout: Record<string, number>;

  h60: Record<string, number>;
  h100: Record<string, number>;
  h140: Record<string, number>;
  h180: Record<string, number>;

  miss: Record<string, number>;
  missPct: Record<string, number>;

  bust: Record<string, number>;
  bustPct: Record<string, number>;

  dbull: Record<string, number>;
  dbullPct: Record<string, number>;

  doubles: Record<string, number>;
  triples: Record<string, number>;
  bulls: Record<string, number>;
};

/* ---------- Utils internes ---------- */

function newMap<T = number>(
  players: PlayerLite[],
  v: T | number = 0
): Record<string, T> {
  const m: Record<string, any> = {};
  for (const p of players) m[p.id] = v;
  return m as Record<string, T>;
}

function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 1000) / 10 : 0;
}

function dartValue(seg?: Seg) {
  if (!seg) return 0;
  if (seg.v === 25 && seg.mult === 2) return 50;
  return (seg.v || 0) * (seg.mult || 1);
}

/* ---------- Helper interne : charger les CricketLegStats d'un profil ---------- */
/* NOTE:
   On suppose que History.list() renvoie des rows pouvant contenir un champ
   `cricketLegs` (ou `summary.cricketLegs`) = CricketLegStats[] pour chaque match Cricket.
   Si ce n'est pas (encore) le cas, la fonction renvoie simplement [].
*/

async function loadCricketLegStatsForProfile(
  profileId: string
): Promise<CricketLegStats[]> {
  try {
    const rows = await History.list();
    const out: CricketLegStats[] = [];

    for (const r of rows as any[]) {
      const legsRaw: any =
        (r && (r.cricketLegs as any)) ??
        (r && r.summary && (r.summary.cricketLegs as any));

      if (!Array.isArray(legsRaw)) continue;

      for (const leg of legsRaw) {
        if (leg && leg.playerId === profileId) {
          out.push(leg as CricketLegStats);
        }
      }
    }

    return out;
  } catch {
    return [];
  }
}

/* ---------- Helper X01 : extraction tolérante des stats joueur ---------- */

// --- extrait les stats X01 pour un joueur dans un match ---
function extractX01PlayerStats(rec: SavedMatch, pid: string) {
  const Nloc = (x: any) => (Number.isFinite(Number(x)) ? Number(x) : 0);

  let avg3 = 0;
  let bestVisit = 0;
  let bestCheckout = 0;

  const ss: any = (rec as any).summary ?? (rec as any).payload?.summary ?? {};
  const per: any[] =
    ss.perPlayer ??
    ss.players ??
    (rec as any).payload?.summary?.perPlayer ??
    [];

  const liveStatsByPlayer: any = (rec as any).liveStatsByPlayer;
  const live = liveStatsByPlayer?.[pid];

  // 0) 🔹 V3 / snapshot direct via liveStatsByPlayer (nouveau)
  if (live) {
    const dartsThrown = Nloc(live.dartsThrown);
    const totalScore = Nloc(live.totalScore);

    if (dartsThrown > 0 && totalScore > 0) {
      avg3 = (totalScore / dartsThrown) * 3;
    }

    bestVisit = Math.max(bestVisit, Nloc(live.bestVisit));
    bestCheckout = Math.max(bestCheckout, Nloc(live.bestCheckout));
  }

  // A) 🔹 Nouveau format : maps par joueur (finalizeMatch v2)
  if (!avg3 && ss.avg3ByPlayer && ss.avg3ByPlayer[pid] != null) {
    avg3 = Nloc(ss.avg3ByPlayer[pid]);
  }
  if (ss.bestVisitByPlayer && ss.bestVisitByPlayer[pid] != null) {
    bestVisit = Math.max(bestVisit, Nloc(ss.bestVisitByPlayer[pid]));
  }
  if (ss.bestCheckoutByPlayer && ss.bestCheckoutByPlayer[pid] != null) {
    bestCheckout = Math.max(
      bestCheckout,
      Nloc(ss.bestCheckoutByPlayer[pid])
    );
  }

  // B) 🔹 perPlayer (summaryPerPlayer de finalizeMatch)
  const pstat =
    per.find((x) => x?.playerId === pid) ??
    (ss[pid] || ss.players?.[pid] || ss.perPlayer?.[pid]) ??
    {};

  if (!avg3) {
    avg3 =
      Nloc(pstat.avg3) ||
      Nloc(pstat.avg_3) ||
      Nloc(pstat.avg3Darts) ||
      Nloc(pstat.average3) ||
      Nloc(pstat.avg3D);
  }

  bestVisit = Math.max(
    bestVisit,
    Nloc(pstat.bestVisit),
    Nloc(pstat.best_visit)
  );
  bestCheckout = Math.max(
    bestCheckout,
    Nloc(pstat.bestCheckout),
    Nloc(pstat.best_co),
    Nloc(pstat.bestFinish)
  );

  // C) 🔹 Fallback sur payload.legs (au cas où summary est pauvre)
  if ((!avg3 || (!bestVisit && !bestCheckout)) && (rec as any).payload?.legs) {
    const legs: any[] = Array.isArray((rec as any).payload.legs)
      ? (rec as any).payload.legs
      : [];

    let sumAvg3 = 0;
    let legsCount = 0;

    for (const leg of legs) {
      const plArr: any[] = Array.isArray(leg.perPlayer)
        ? leg.perPlayer
        : [];
      const pl = plArr.find((x) => x?.playerId === pid);
      if (!pl) continue;

      const legAvg =
        Nloc(pl.avg3) ||
        Nloc(pl.avg_3) ||
        Nloc(pl.avg3Darts) ||
        Nloc(pl.average3) ||
        Nloc(pl.avg3D);

      if (legAvg > 0) {
        sumAvg3 += legAvg;
        legsCount++;
      }

      bestVisit = Math.max(
        bestVisit,
        Nloc(pl.bestVisit),
        Nloc(pl.best_visit)
      );
      bestCheckout = Math.max(
        bestCheckout,
        Nloc(pl.bestCheckout),
        Nloc(pl.best_co),
        Nloc(pl.bestFinish)
      );
    }

    if (legsCount > 0 && (!avg3 || avg3 === 0)) {
      avg3 = sumAvg3 / legsCount;
    }
  }

  // D) 🔹 Fallback ultime : payload.visits (recalcul complet)
  if (
    (!avg3 || (!bestVisit && !bestCheckout)) &&
    (rec as any).payload?.visits
  ) {
    const visits: any[] = Array.isArray((rec as any).payload.visits)
      ? (rec as any).payload.visits
      : [];

    let darts = 0;
    let scored = 0;

    for (const v of visits) {
      if (v.p !== pid) continue;

      const segs = Array.isArray(v.segments) ? v.segments : [];
      const nbDarts = segs.length || 0;

      darts += nbDarts;
      scored += Nloc(v.score);

      if (!v.bust) {
        const sc = Nloc(v.score);
        if (sc > bestVisit) bestVisit = sc;
        if (v.isCheckout && sc > bestCheckout) {
          bestCheckout = sc;
        }
      }
    }

    if (darts > 0 && (!avg3 || avg3 === 0)) {
      avg3 = (scored / darts) * 3;
    }
  }

  return {
    avg3,
    bestVisit,
    bestCheckout,
  };
}

/* =============================================================
// X01 MULTI — agrégat Legs / Sets par profil (Duo / Multi / Team)
============================================================= */

export type X01MultiModeCounters = {
  matchesWin: number;
  matchesTotal: number;
  legsWin: number;
  legsTotal: number;
  setsWin: number;
  setsTotal: number;
};

export type X01MultiLegsSets = {
  duo: X01MultiModeCounters;
  multi: X01MultiModeCounters;
  team: X01MultiModeCounters;
};

function createEmptyMultiCounters(): X01MultiModeCounters {
  return {
    matchesWin: 0,
    matchesTotal: 0,
    legsWin: 0,
    legsTotal: 0,
    setsWin: 0,
    setsTotal: 0,
  };
}

function createEmptyMultiLegsSets(): X01MultiLegsSets {
  return {
    duo: createEmptyMultiCounters(),
    multi: createEmptyMultiCounters(),
    team: createEmptyMultiCounters(),
  };
}

/**
 * Agrège Legs / Sets gagnés + totaux pour un profil donné
 * à partir d'une liste de matches X01 (V3 ou anciens).
 *
 * - Duo   = X01 sans teams avec 2 joueurs
 * - Multi = X01 sans teams avec 3+ joueurs
 * - Team  = X01 avec teams (payload.mode === "x01_teams")
 */
export function computeX01MultiLegsSetsForProfileFromMatches(
  profileId: string,
  matches: SavedMatch[]
): X01MultiLegsSets {
  const out = createEmptyMultiLegsSets();

  if (!profileId || !Array.isArray(matches) || !matches.length) {
    return out;
  }

  for (const m of matches) {
    if (!m || (m as any).kind !== "x01") continue;

    const payload: any = (m as any).payload || {};
    const mode: string =
      payload.mode ||
      payload.gameMode ||
      ""; // "x01_solo" | "x01_multi" | "x01_teams"

    if (!mode || mode === "x01_solo") continue;

    // -------------------------------
    // Récupération des joueurs + pid
    // -------------------------------
    const players: any[] =
      (payload.config && payload.config.players) ||
      (m as any).players ||
      [];

    if (!players.length) continue;

    const me = players.find(
      (p) =>
        String(p.profileId || "") === String(profileId) ||
        String(p.id || "") === String(profileId)
    );
    if (!me) continue;

    const pid: string = String(me.id);

    // -------------------------------
    // Legs / Sets par joueur
    // -------------------------------
    const summary: any =
      (m as any).summary || payload.summary || {};
    const rankings: any[] = Array.isArray(summary.rankings)
      ? summary.rankings
      : [];

    let myLegs = 0;
    let mySets = 0;
    let totalLegs = 0;
    let totalSets = 0;

    if (rankings.length) {
      for (const r of rankings) {
        const rLegs =
          Number(r.legsWon ?? r.legs ?? 0) || 0;
        const rSets =
          Number(r.setsWon ?? r.sets ?? 0) || 0;
        totalLegs += rLegs;
        totalSets += rSets;

        const rid = String(r.id ?? r.playerId ?? "");
        if (rid === pid) {
          myLegs = rLegs;
          mySets = rSets;
        }
      }
    } else {
      // Fallback : maps legsWon / setsWon (summary ou payload)
      const legsMap: any =
        summary.legsWon ||
        payload.legsWon ||
        (payload.state && payload.state.legsWon);
      const setsMap: any =
        summary.setsWon ||
        payload.setsWon ||
        (payload.state && payload.state.setsWon);

      if (legsMap && typeof legsMap === "object") {
        for (const [k, v] of Object.entries(legsMap)) {
          const val = Number(v) || 0;
          totalLegs += val;
          if (String(k) === pid) myLegs = val;
        }
      }
      if (setsMap && typeof setsMap === "object") {
        for (const [k, v] of Object.entries(setsMap)) {
          const val = Number(v) || 0;
          totalSets += val;
          if (String(k) === pid) mySets = val;
        }
      }
    }

    // Sélection du "bucket" (duo / multi / team)
    let bucketKey: keyof X01MultiLegsSets;

    if (mode === "x01_teams") {
      bucketKey = "team";
    } else {
      const playerCount = players.length;
      bucketKey = playerCount <= 2 ? "duo" : "multi";
    }

    const bucket = out[bucketKey];

    // Matchs
    bucket.matchesTotal += 1;
    if (
      (m as any).winnerId &&
      String((m as any).winnerId) === pid
    ) {
      bucket.matchesWin += 1;
    }

    // Legs / Sets
    bucket.legsWin += myLegs;
    bucket.legsTotal += totalLegs;
    bucket.setsWin += mySets;
    bucket.setsTotal += totalSets;
  }

  return out;
}

/* ================================================================
   StatsBridge — implémentation principale
================================================================ */

export const StatsBridge = {
  /* --------------------------------------------------------------
     makeLeg : construit un leg + maps "legacy"
     - visits = liste de volées { p, segments[], score, bust, isCheckout, remainingAfter }
     - players = PlayerLite[]
     - winnerId (optionnel) : forçage, sinon déduit par remaining
  -------------------------------------------------------------- */
  makeLeg(visits: Visit[], players: PlayerLite[], winnerId: string | null) {
    const darts = newMap<number>(players, 0);
    const visitsCount = newMap<number>(players, 0);
    const points = newMap<number>(players, 0);
    const remaining = newMap<number>(players, 0);

    const bestVisit = newMap<number>(players, 0);
    const bestCheckout = newMap<number>(players, 0);

    const h60 = newMap<number>(players, 0);
    const h100 = newMap<number>(players, 0);
    const h140 = newMap<number>(players, 0);
    const h180 = newMap<number>(players, 0);

    const miss = newMap<number>(players, 0);
    const bust = newMap<number>(players, 0);
    const dbull = newMap<number>(players, 0);

    const doubles = newMap<number>(players, 0);
    const triples = newMap<number>(players, 0);
    const bulls = newMap<number>(players, 0);

    for (const v of visits || []) {
      const pid = v.p;
      const segs = Array.isArray(v.segments) ? v.segments : [];
      const visitPoints = Number(v.score || 0);

      visitsCount[pid] = (visitsCount[pid] || 0) + 1;
      darts[pid] = (darts[pid] || 0) + segs.length;
      points[pid] = (points[pid] || 0) + visitPoints;

      if (v.remainingAfter != null) {
        remaining[pid] = Number(v.remainingAfter);
      }

      // Best visit = meilleure volée (points)
      bestVisit[pid] = Math.max(bestVisit[pid] || 0, visitPoints);

      // Best checkout : valeur de la dernière flèche du checkout
      if (v.isCheckout && segs.length) {
        const last = segs[segs.length - 1];
        const lastVal = dartValue(last);
        bestCheckout[pid] = Math.max(bestCheckout[pid] || 0, lastVal);
      }

      // Power scoring par volée
      if (visitPoints >= 60) h60[pid] += 1;
      if (visitPoints >= 100) h100[pid] += 1;
      if (visitPoints >= 140) h140[pid] += 1;
      if (visitPoints === 180) h180[pid] += 1;

      // Busts + détails flèches
      bust[pid] += v.bust ? 1 : 0;

      for (const s of segs) {
        if ((s.v || 0) === 0) miss[pid] += 1;
        if (s.v === 25 && s.mult === 2) dbull[pid] += 1;

        if (s.mult === 2) doubles[pid] += 1;
        if (s.mult === 3) triples[pid] += 1;
        if (s.v === 25) bulls[pid] += s.mult === 2 ? 1 : 0.5;
      }
    }

    const avg3 = newMap<number>(players, 0);
    const missPct = newMap<number>(players, 0);
    const bustPct = newMap<number>(players, 0);
    const dbullPct = newMap<number>(players, 0);

    for (const p of players) {
      const pid = p.id;
      const d = darts[pid] || 0;
      const pts = points[pid] || 0;

      avg3[pid] = d > 0 ? Math.round(((pts / d) * 3) * 100) / 100 : 0;
      missPct[pid] = pct(miss[pid] || 0, d);
      dbullPct[pid] = pct(dbull[pid] || 0, d);
      bustPct[pid] = pct(bust[pid] || 0, visitsCount[pid] || 0); // bust par volée
    }

    const order = [...players]
      .sort((a, b) => {
        const ar = remaining[a.id] ?? Number.MAX_SAFE_INTEGER;
        const br = remaining[b.id] ?? Number.MAX_SAFE_INTEGER;
        if (ar === 0 && br !== 0) return -1;
        if (ar !== 0 && br === 0) return 1;
        if (ar !== br) return ar - br;
        return (avg3[b.id] ?? 0) - (avg3[a.id] ?? 0);
      })
      .map((p) => p.id);

    const legacy: LegacyMaps = {
      order,
      winnerId: winnerId ?? (order[0] ?? null),

      remaining,
      darts,
      visits: visitsCount,
      points,
      avg3,
      bestVisit,
      bestCheckout,

      h60,
      h100,
      h140,
      h180,

      miss,
      missPct,

      bust,
      bustPct,

      dbull,
      dbullPct,

      doubles,
      triples,
      bulls,
    };

    const leg = {
      winnerId: legacy.winnerId,
      perPlayer: players.map((p) => {
        const pid = p.id;
        return {
          playerId: pid,
          darts: darts[pid] || 0,
          points: points[pid] || 0,
          avg3: avg3[pid] || 0,
          bestVisit: bestVisit[pid] || 0,
          bestCheckout: bestCheckout[pid] || 0,
          h60: h60[pid] || 0,
          h100: h100[pid] || 0,
          h140: h140[pid] || 0,
          h180: h180[pid] || 0,
          miss: miss[pid] || 0,
          bust: bust[pid] || 0,
          dbull: dbull[pid] || 0,
        };
      }),
    };

    return { leg, legacy };
  },

  /* --------------------------------------------------------------
     commitLegAndAccumulate :
     - prend les maps legacy d'un leg
     - met à jour un sac local "dc-quick-stats"
       utilisé pour getBasicProfileStats / Profiles / StatsHub
  -------------------------------------------------------------- */
  async commitLegAndAccumulate(_leg: any, legacy: LegacyMaps) {
    try {
      const key = "dc-quick-stats";
      const raw = localStorage.getItem(key);
      const bag: Record<
        string,
        {
          games: number;
          darts: number;
          points: number;
          avg3: number;
          bestVisit: number;
          bestCheckout: number;
          wins: number;
        }
      > = raw ? JSON.parse(raw) : {};

      const pids = Object.keys(legacy?.darts || {});
      const winnerId = legacy?.winnerId || null;

      for (const pid of pids) {
        const s =
          (bag[pid] ??= {
            games: 0,
            darts: 0,
            points: 0,
            avg3: 0,
            bestVisit: 0,
            bestCheckout: 0,
            wins: 0,
          });

        // On compte 1 "game" par LEG terminé
        s.games += 1;

        const d = Number(legacy.darts[pid] || 0);
        const a3 = Number(legacy.avg3[pid] || 0);
        const ptsApprox = d > 0 ? (a3 / 3) * d : 0;

        s.darts += d;
        s.points += ptsApprox;
        s.avg3 = s.darts > 0 ? (s.points / s.darts) * 3 : 0;

        s.bestVisit = Math.max(
          s.bestVisit,
          Number(legacy.bestVisit[pid] || 0)
        );
        s.bestCheckout = Math.max(
          s.bestCheckout,
          Number(legacy.bestCheckout[pid] || 0)
        );

        if (winnerId && winnerId === pid) s.wins += 1;
      }

      localStorage.setItem(key, JSON.stringify(bag));
    } catch {
      // on reste silencieux
    }
  },

  /* --------------------------------------------------------------
     makeMatch : synthèse "match" à partir d'une liste de legs
     => renvoie un petit summary consommable par StatsHub / History
  -------------------------------------------------------------- */
  makeMatch(legs: any[], players: PlayerLite[], matchId: string, kind: string) {
    const perPid: Record<
      string,
      {
        playerId: string;
        darts: number;
        points: number;
        bestVisit: number;
        bestCheckout: number;
        h60: number;
        h100: number;
        h140: number;
        h180: number;
      }
    > = Object.fromEntries(
      players.map((p) => [
        p.id,
        {
          playerId: p.id,
          darts: 0,
          points: 0,
          bestVisit: 0,
          bestCheckout: 0,
          h60: 0,
          h100: 0,
          h140: 0,
          h180: 0,
        },
      ])
    );

    let winnerId: string | null = null;

    for (const leg of legs || []) {
      if (!winnerId && leg?.winnerId) winnerId = leg.winnerId;
      for (const pp of leg?.perPlayer || []) {
        const acc = perPid[pp.playerId];
        if (!acc) continue;

        acc.darts += Number(pp.darts || 0);
        acc.points += Number(pp.points || 0);
        acc.bestVisit = Math.max(
          acc.bestVisit,
          Number(pp.bestVisit || 0)
        );
        acc.bestCheckout = Math.max(
          acc.bestCheckout,
          Number(pp.bestCheckout || 0)
        );
        acc.h60 += Number(pp.h60 || 0);
        acc.h100 += Number(pp.h100 || 0);
        acc.h140 += Number(pp.h140 || 0);
        acc.h180 += Number(pp.h180 || 0);
      }
    }

    const perPlayer = players.map((p) => {
      const acc = perPid[p.id];
      const avg3 =
        acc.darts > 0 ? (acc.points / acc.darts) * 3 : 0;
      return {
        playerId: p.id,
        name: p.name || "",
        darts: acc.darts,
        avg3: Math.round(avg3 * 100) / 100,
        bestVisit: acc.bestVisit,
        bestCheckout: acc.bestCheckout,
        h60: acc.h60,
        h100: acc.h100,
        h140: acc.h140,
        h180: acc.h180,
        win: !!winnerId && winnerId === p.id,
      };
    });

    return {
      id: matchId,
      kind,
      createdAt: Date.now(),
      winnerId: winnerId ?? null,
      perPlayer,
    };
  },

  /* --------------------------------------------------------------
     commitMatchAndSave :
     - persiste un "summary" de match dans un tableau local simple
     - met aussi à jour les quick-stats (games / wins)
  -------------------------------------------------------------- */
  async commitMatchAndSave(summary: any, extra?: any) {
    try {
      const allKey = "dc-matches";
      const raw = localStorage.getItem(allKey);
      const arr: any[] = raw ? JSON.parse(raw) : [];
      arr.unshift({ summary, extra, ts: Date.now() });
      while (arr.length > 200) arr.pop();
      localStorage.setItem(allKey, JSON.stringify(arr));

      // Met à jour les quick-stats (games / wins) si on a winnerId
      const bagRaw = localStorage.getItem("dc-quick-stats");
      const bag: Record<
        string,
        {
          games: number;
          darts: number;
          points: number;
          avg3: number;
          bestVisit: number;
          bestCheckout: number;
          wins: number;
        }
      > = bagRaw ? JSON.parse(bagRaw) : {};

      const pids: string[] = (summary?.perPlayer || []).map(
        (pp: any) => pp.playerId
      );

      for (const pid of pids) {
        const s =
          (bag[pid] ??= {
            games: 0,
            darts: 0,
            points: 0,
            avg3: 0,
            bestVisit: 0,
            bestCheckout: 0,
            wins: 0,
          });

        s.games += 1;
        if (summary?.winnerId && summary.winnerId === pid) {
          s.wins += 1;
        }
        // bestVisit / bestCheckout déjà mis à jour via commitLegAndAccumulate
      }

      localStorage.setItem("dc-quick-stats", JSON.stringify(bag));
    } catch {
      // silencieux
    }
  },

  /* --------------------------------------------------------------
     getBasicProfileStats : quick stats synchrones d'un profil
     (utilise seulement localStorage / dc-quick-stats)
  -------------------------------------------------------------- */
  getBasicProfileStats(profileId: string): BasicProfileStats {
    try {
      const raw = localStorage.getItem("dc-quick-stats");
      const bag = raw ? JSON.parse(raw) : {};
      const s = bag[profileId] || null;

      if (!s) {
        return {
          games: 0,
          darts: 0,
          avg3: 0,
          bestVisit: 0,
          bestCheckout: 0,
          wins: 0,
        };
      }

      return {
        games: Number(s.games || 0),
        darts: Number(s.darts || 0),
        avg3: Number(s.avg3 || 0),
        bestVisit: Number(s.bestVisit || 0),
        bestCheckout: Number(s.bestCheckout || 0),
        wins: Number(s.wins || 0),
      };
    } catch {
      return {
        games: 0,
        darts: 0,
        avg3: 0,
        bestVisit: 0,
        bestCheckout: 0,
        wins: 0,
      };
    }
  },

  /* --------------------------------------------------------------
     getMergedProfilesStats : merge simple pour plusieurs profils
  -------------------------------------------------------------- */
  getMergedProfilesStats(profiles: PlayerLite[]) {
    const out: Record<string, BasicProfileStats> = {};
    for (const p of profiles || []) {
      out[p.id] = this.getBasicProfileStats(p.id);
    }
    return out;
  },

  /* --------------------------------------------------------------
     getProfileQuickStats : alias demandé par certaines pages
  -------------------------------------------------------------- */
  getProfileQuickStats(profileId: string) {
    return this.getBasicProfileStats(profileId);
  },

  /* --------------------------------------------------------------
     getBasicProfileStatsAsync :
     - part de quick-stats (localStorage)
     - complète avec l'historique (History.list)
       -> coTotal + winRate + X01 avg3/bestVisit/bestCheckout
  -------------------------------------------------------------- */
  async getBasicProfileStatsAsync(
    profileId: string
  ): Promise<BasicProfileStats> {
    const base = this.getBasicProfileStats(profileId);
    let gamesFromHistory = 0;
    let winsFromHistory = 0;
    let coTotal = 0;

    let histAvgSum = 0;
    let histAvgCount = 0;
    let histBestVisit = 0;
    let histBestCheckout = 0;

    try {
      const rows = await History.list();

      for (const r of rows as SavedMatch[]) {
        const played = !!(r as any).players?.some(
          (p: any) => p.id === profileId
        );
        if (!played) continue;

        gamesFromHistory++;
        if ((r as any).winnerId && (r as any).winnerId === profileId) {
          winsFromHistory++;
        }

        const summary: any =
          (r as any).summary ?? (r as any).payload?.summary ?? {};
        coTotal += Number(summary?.co ?? 0);

        // On ne tire des stats X01 que sur les matchs X01 / X01V3
        const game = (r as any).game;
        const variant = (r as any).variant;
        const isX01 =
          game === "x01" ||
          variant === "x01" ||
          variant === "x01v3" ||
          variant === "x01v2";

        if (isX01) {
          const x = extractX01PlayerStats(r, profileId);
          if (x.avg3 > 0) {
            histAvgSum += x.avg3;
            histAvgCount++;
          }
          histBestVisit = Math.max(histBestVisit, x.bestVisit || 0);
          histBestCheckout = Math.max(
            histBestCheckout,
            x.bestCheckout || 0
          );
        }
      }
    } catch {
      // si IDB indispo : on garde base
    }

    const games = Math.max(Number(base.games || 0), gamesFromHistory);
    const wins = Math.max(Number(base.wins || 0), winsFromHistory);
    const winRate = games ? Math.round((wins / games) * 100) : 0;

    const avgFromHistory =
      histAvgCount > 0 ? histAvgSum / histAvgCount : 0;

    const avg3 = base.avg3 || avgFromHistory || 0;
    const bestVisit = Math.max(
      Number(base.bestVisit || 0),
      histBestVisit
    );
    const bestCheckout = Math.max(
      Number(base.bestCheckout || 0),
      histBestCheckout
    );

    return {
      ...base,
      games,
      wins,
      coTotal,
      winRate,
      avg3,
      bestVisit,
      bestCheckout,
    };
  },

  /* --------------------------------------------------------------
     getCricketProfileStats :
     - charge toutes les CricketLegStats d'un profil (History.list)
     - agrège en bloc CricketProfileStats (matches, solo/teams,
       victoires, records, historique des scores)
  -------------------------------------------------------------- */
  async getCricketProfileStats(
    profileId: string
  ): Promise<CricketProfileStats> {
    const legs = await loadCricketLegStatsForProfile(profileId);
    return aggregateCricketProfileStats(legs, { maxHistoryItems: 30 });
  },

  /* --------------------------------------------------------------
     getX01MultiLegsSetsForProfile :
     - agrège Legs / Sets (gagnés + totaux) pour un profil
       sur les matchs X01 multi (duo / multi / team)
  -------------------------------------------------------------- */
  async getX01MultiLegsSetsForProfile(
    profileId: string
  ): Promise<X01MultiLegsSets> {
    if (!profileId) return createEmptyMultiLegsSets();

    try {
      const rows = await History.list();
      const matches = (rows as SavedMatch[]).filter(
        (m) => (m as any).kind === "x01"
      );

      return computeX01MultiLegsSetsForProfileFromMatches(
        profileId,
        matches
      );
    } catch {
      return createEmptyMultiLegsSets();
    }
  },
};

/* ---------- Alias en export NOMMÉ (compat import { ... } ) ---------- */

export const getBasicProfileStats = (profileId: string) =>
  StatsBridge.getBasicProfileStats(profileId);

export const getMergedProfilesStats = (profiles: PlayerLite[]) =>
  StatsBridge.getMergedProfilesStats(profiles);

export const getProfileQuickStats = (profileId: string) =>
  StatsBridge.getProfileQuickStats(profileId);

export const getBasicProfileStatsAsync = (profileId: string) =>
  StatsBridge.getBasicProfileStatsAsync(profileId);

// 🔸 Nouveau : stats Cricket complètes pour un profil
export const getCricketProfileStats = (profileId: string) =>
  StatsBridge.getCricketProfileStats(profileId);

// 🔸 Nouveau : agrégat Legs / Sets X01 multi (duo / multi / team)
export const getX01MultiLegsSetsForProfile = (profileId: string) =>
  StatsBridge.getX01MultiLegsSetsForProfile(profileId);
