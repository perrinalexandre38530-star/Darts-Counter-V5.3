// =============================================================
// src/lib/statsCricket.ts
// Système complet de statistiques Cricket (Leg + Match + Global)
// - Log par dart (target, multiplier, scoring, state)
// - ComputeLegStats : stats détaillées par cible
// - aggregateCricketMatches : cumul historique multi-parties
// - 100% compatible StatsHub / StatsShell / quickStats
// =============================================================

export type CricketHit = {
    dartIndex: number;
    target: number;       // 15–20 ou 25/50 (bull)
    multiplier: 1 | 2 | 3;
    isScoring: boolean;   // true si points générés
    beforeHits: number;   // état avant la flèche
    afterHits: number;    // état après la flèche
    opponentOpen: boolean;
  };
  
  export type CricketTargetStats = {
    hits: number;
    singles: number;
    doubles: number;
    triples: number;
  
    openedAt?: number;    // dart index
    closedAt?: number;    // dart index
  
    pointsScored: number;
    pointsConceded: number;
  
    domination: number;   // durée seule open
  };
  
  export type CricketLegStats = {
    darts: number;
    visits: number;
  
    // global
    totalHits: number;
    singles: number;
    doubles: number;
    triples: number;
    accuracy: number;
  
    // advanced
    avgOpenTime: number;
    avgCloseTime: number;
    clutchCloses: number;
    choke: number;
  
    // par cible
    targets: Record<number, CricketTargetStats>;
  };
  
  export type CricketMatchAgg = {
    legs: number;
  
    darts: number;
    totalHits: number;
    singles: number;
    doubles: number;
    triples: number;
  
    accuracy: number;
    bestLeg: number;
    worstLeg: number;
  
    targets: Record<number, CricketTargetStats>;
  };
  
  
  // =============================================================
  // 1) Compute stats d'un leg Cricket
  // =============================================================
  export function computeCricketLegStats(hits: CricketHit[]): CricketLegStats {
    const targets = [15,16,17,18,19,20,25]; // 25=SB/DB
  
    const tStats: Record<number, CricketTargetStats> = {};
    targets.forEach(t => {
      tStats[t] = {
        hits: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        pointsScored: 0,
        pointsConceded: 0,
        domination: 0
      };
    });
  
    let totalHits = 0;
    let singles = 0;
    let doubles = 0;
    let triples = 0;
  
    // ouverture / fermeture par cible
    const openedAt: Record<number, number|undefined> = {};
    const closedAt: Record<number, number|undefined> = {};
  
    let clutchCloses = 0;
    let choke = 0;
  
    hits.forEach((h, i) => {
      const T = h.target;
      if (!tStats[T]) return;
  
      const ts = tStats[T];
      const m = h.multiplier;
  
      ts.hits += m;
      totalHits += m;
  
      if (m === 1) { ts.singles++; singles++; }
      if (m === 2) { ts.doubles++; doubles++; }
      if (m === 3) { ts.triples++; triples++; }
  
      // ouverture
      if (!ts.openedAt && h.afterHits >= 3) {
        ts.openedAt = i;
        openedAt[T] = i;
      }
  
      // fermeture
      if (!ts.closedAt && h.afterHits >= 3) {
        // fermé quand hits ≥3 ET opponentOpen == false
        if (!h.opponentOpen) {
          ts.closedAt = i;
          closedAt[T] = i;
  
          // clutch close ?
          if (h.opponentOpen) clutchCloses++;
        }
      }
  
      // points générés
      if (h.isScoring) {
        ts.pointsScored += (T === 25 ? 25 : T) * m;
      }
  
      // points concédés (si l'adversaire avait ouvert avant)
      if (!h.isScoring && h.opponentOpen && h.beforeHits < 3) {
        ts.pointsConceded += (T === 25 ? 25 : T) * m;
      }
    });
  
    // temps ouverture / fermeture
    const openTimes: number[] = [];
    const closeTimes: number[] = [];
  
    targets.forEach(T => {
      const ts = tStats[T];
      if (ts.openedAt !== undefined) openTimes.push(ts.openedAt);
      if (ts.closedAt !== undefined) closeTimes.push(ts.closedAt - (ts.openedAt ?? 0));
    });
  
    const avgOpen = openTimes.length ? (openTimes.reduce((a,b)=>a+b,0) / openTimes.length) : 0;
    const avgClose = closeTimes.length ? (closeTimes.reduce((a,b)=>a+b,0) / closeTimes.length) : 0;
  
    const darts = hits.length;
    const visits = Math.ceil(darts / 3);
    const accuracy = darts > 0 ? totalHits / darts : 0;
  
    return {
      darts,
      visits,
      totalHits,
      singles,
      doubles,
      triples,
      accuracy,
      avgOpenTime: avgOpen,
      avgCloseTime: avgClose,
      clutchCloses,
      choke,
      targets: tStats
    };
  }
  
  
  // =============================================================
  // 2) Agrégation multi-matchs Cricket
  // =============================================================
  export function aggregateCricketMatches(legs: CricketLegStats[]): CricketMatchAgg {
    const targets = [15,16,17,18,19,20,25];
  
    const base: CricketMatchAgg = {
      legs: legs.length,
      darts: 0,
      totalHits: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      accuracy: 0,
      bestLeg: Infinity,
      worstLeg: 0,
      targets: {}
    };
  
    targets.forEach(t => {
      base.targets[t] = {
        hits: 0, singles: 0, doubles: 0, triples: 0,
        pointsScored: 0, pointsConceded: 0,
        domination: 0
      };
    });
  
    legs.forEach(L => {
      base.darts += L.darts;
      base.totalHits += L.totalHits;
      base.singles += L.singles;
      base.doubles += L.doubles;
      base.triples += L.triples;
  
      if (L.totalHits > base.worstLeg) base.worstLeg = L.totalHits;
      if (L.totalHits < base.bestLeg) base.bestLeg = L.totalHits;
  
      // par cible
      Object.entries(L.targets).forEach(([k, ts]) => {
        const T = Number(k);
        if (!base.targets[T]) return;
  
        base.targets[T].hits += ts.hits;
        base.targets[T].singles += ts.singles;
        base.targets[T].doubles += ts.doubles;
        base.targets[T].triples += ts.triples;
        base.targets[T].pointsScored += ts.pointsScored;
        base.targets[T].pointsConceded += ts.pointsConceded;
        base.targets[T].domination += ts.domination;
      });
    });
  
    base.accuracy = base.darts > 0 ? base.totalHits / base.darts : 0;
  
    return base;
  }
  