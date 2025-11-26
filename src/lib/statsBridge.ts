// ============================================
// src/lib/statsBridge.ts
// Pont de stats "tolérant" + exports attendus par l'UI
// Expose :
//   - types: Visit, PlayerLite, BasicProfileStats
//   - objet StatsBridge { makeLeg, commitLegAndAccumulate, makeMatch,
//                         commitMatchAndSave, getBasicProfileStats,
//                         getMergedProfilesStats, getProfileQuickStats,
//                         getBasicProfileStatsAsync, getCricketProfileStats }
//   - alias nommés (compat pages): getBasicProfileStats, getMergedProfilesStats,
//                                  getProfileQuickStats, getBasicProfileStatsAsync,
//                                  getCricketProfileStats
// ============================================

import { History } from "./history";
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
       -> coTotal + winRate
  -------------------------------------------------------------- */
  async getBasicProfileStatsAsync(
    profileId: string
  ): Promise<BasicProfileStats> {
    const base = this.getBasicProfileStats(profileId);
    let gamesFromHistory = 0;
    let winsFromHistory = 0;
    let coTotal = 0;

    try {
      const rows = await History.list();
      for (const r of rows) {
        const played = !!r.players?.some((p: any) => p.id === profileId);
        if (!played) continue;

        gamesFromHistory++;
        if (r.winnerId && r.winnerId === profileId) {
          winsFromHistory++;
        }
        coTotal += Number(r.summary?.co ?? 0);
      }
    } catch {
      // si IDB indispo : on garde base
    }

    const games = Math.max(Number(base.games || 0), gamesFromHistory);
    const wins = Math.max(Number(base.wins || 0), winsFromHistory);
    const winRate = games ? Math.round((wins / games) * 100) : 0;

    return {
      ...base,
      games,
      wins,
      coTotal,
      winRate,
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
