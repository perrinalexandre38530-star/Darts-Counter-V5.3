// ============================================
// src/lib/statsKiller.ts
// Agrégateur simple KILLER à partir de l'historique (store.history / memHistory)
// - totalMatches, wins, winRate
// - totalKills, avgKills
// - deaths (fois éliminé), avgDeaths
// - lastPlayedAt
// ============================================

export type KillerStatsAgg = {
    totalMatches: number;
    wins: number;
    winRate: number; // 0..1
    totalKills: number;
    avgKills: number;
    deaths: number;
    avgDeaths: number;
    lastPlayedAt: number | null;
  };
  
  function safeNum(n: any, fb = 0) {
    const x = Number(n);
    return Number.isFinite(x) ? x : fb;
  }
  
  function safeArr(a: any) {
    return Array.isArray(a) ? a : [];
  }
  
  function readKillerPlayersFromRecord(rec: any) {
    // On privilégie summary.players (c'est là qu'on a kills/number/lives)
    const sumPlayers = safeArr(rec?.summary?.players);
    if (sumPlayers.length) return sumPlayers;
  
    // fallback: payload.summary.players
    const sumPlayers2 = safeArr(rec?.payload?.summary?.players);
    if (sumPlayers2.length) return sumPlayers2;
  
    // fallback: payload.state.players (si jamais)
    const stPlayers = safeArr(rec?.payload?.state?.players);
    if (stPlayers.length) return stPlayers;
  
    return [];
  }
  
  export function computeKillerStatsAggForProfile(
    records: any[],
    profileId: string | null | undefined
  ): KillerStatsAgg {
    const agg: KillerStatsAgg = {
      totalMatches: 0,
      wins: 0,
      winRate: 0,
      totalKills: 0,
      avgKills: 0,
      deaths: 0,
      avgDeaths: 0,
      lastPlayedAt: null,
    };
  
    if (!profileId) return agg;
  
    const list = safeArr(records).filter((r) => (r?.kind || r?.mode) === "killer");
  
    for (const rec of list) {
      const players = readKillerPlayersFromRecord(rec);
  
      // Le match compte seulement si le profil est dans la partie
      const me = players.find((p: any) => p?.id === profileId);
      if (!me) continue;
  
      agg.totalMatches += 1;
  
      const winnerId = rec?.winnerId ?? rec?.payload?.winnerId ?? rec?.summary?.winnerId ?? null;
      if (winnerId && winnerId === profileId) agg.wins += 1;
  
      const kills = safeNum(me?.kills, 0);
      agg.totalKills += kills;
  
      const eliminated = !!(me?.eliminated);
      if (eliminated) agg.deaths += 1;
  
      const when = safeNum(rec?.updatedAt ?? rec?.finishedAt ?? rec?.createdAt, 0);
      if (when) agg.lastPlayedAt = Math.max(agg.lastPlayedAt ?? 0, when);
    }
  
    agg.winRate = agg.totalMatches > 0 ? agg.wins / agg.totalMatches : 0;
    agg.avgKills = agg.totalMatches > 0 ? agg.totalKills / agg.totalMatches : 0;
    agg.avgDeaths = agg.totalMatches > 0 ? agg.deaths / agg.totalMatches : 0;
  
    return agg;
  }
  