// ============================================
// src/lib/statsKiller.ts
// Agrégateur KILLER à partir de l'historique (store.history / memHistory)
// - totalMatches, wins, winRate (0..1)
// - totalKills, avgKills
// - deaths (fois éliminé), avgDeaths
// - lastPlayedAt
// ✅ Option A (NEW):
// - totalDarts, avgDarts (depuis hitsBySegment)
// - favSegment (ex: "T20", "S7", "DB", "SB")
// - favNumber  (ex: "20", "7", "BULL")
// ============================================

export type KillerStatsAgg = {
  totalMatches: number;
  wins: number;
  winRate: number; // 0..1

  totalKills: number;
  avgKills: number;

  deaths: number; // fois éliminé
  avgDeaths: number;

  lastPlayedAt: number | null;

  // ✅ Option A
  totalDarts: number; // somme des hitsBySegment
  avgDarts: number;
  favSegment: string | null;
  favNumber: string | null;
};

function safeNum(n: any, fb = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fb;
}

function safeArr(a: any) {
  return Array.isArray(a) ? a : [];
}

function safeObj(o: any) {
  return o && typeof o === "object" ? o : null;
}

function pickId(obj: any) {
  if (!obj) return "";
  return (
    obj.profileId ||
    obj.playerId ||
    obj.pid ||
    obj.id ||
    obj._id ||
    obj.uid ||
    ""
  );
}

function isKillerRecord(rec: any) {
  const kind = rec?.kind || rec?.summary?.kind || rec?.payload?.kind;
  const mode = rec?.mode || rec?.summary?.mode || rec?.payload?.mode || rec?.payload?.summary?.mode;
  return kind === "killer" || mode === "killer";
}

// --- Lecture "players" (kills/eliminated/number/lives) ---
function readKillerPlayersFromRecord(rec: any) {
  const sumPlayers = safeArr(rec?.summary?.players);
  if (sumPlayers.length) return sumPlayers;

  const sumPlayers2 = safeArr(rec?.payload?.summary?.players);
  if (sumPlayers2.length) return sumPlayers2;

  const stPlayers = safeArr(rec?.payload?.state?.players);
  if (stPlayers.length) return stPlayers;

  return [];
}

// --- Lecture perPlayer Option A (hitsBySegment) ---
function readPerPlayerFromRecord(rec: any): Record<string, any> {
  const summary = rec?.summary || rec?.payload?.summary || null;

  const perArr = safeArr(summary?.perPlayer);
  if (perArr.length) {
    const out: Record<string, any> = {};
    for (const p of perArr) {
      const pid = String(pickId(p) || p?.id || "");
      if (!pid) continue;
      out[pid] = p;
    }
    return out;
  }

  const perObj = safeObj(summary?.detailedByPlayer) || safeObj(summary?.perPlayerMap);
  if (perObj) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(perObj)) out[String(k)] = v as any;
    return out;
  }

  return {};
}

function sumHits(hitsBySegment: any): number {
  const obj = safeObj(hitsBySegment);
  if (!obj) return 0;
  let s = 0;
  for (const v of Object.values(obj)) s += safeNum(v, 0);
  return s;
}

function mergeHits(into: Record<string, number>, hitsBySegment: any) {
  const obj = safeObj(hitsBySegment);
  if (!obj) return;
  for (const [k, v] of Object.entries(obj)) {
    const key = String(k);
    const n = safeNum(v, 0);
    if (n <= 0) continue;
    into[key] = (into[key] || 0) + n;
  }
}

function computeFavFromHits(hitsMerged: Record<string, number>): { favSegment: string | null; favNumber: string | null } {
  const entries = Object.entries(hitsMerged || {});
  if (!entries.length) return { favSegment: null, favNumber: null };

  let bestSeg: string | null = null;
  let bestSegVal = -1;

  const byNumber: Record<string, number> = {};

  for (const [k, v] of entries) {
    const vv = safeNum(v, 0);
    if (vv <= 0) continue;

    if (vv > bestSegVal) {
      bestSegVal = vv;
      bestSeg = k;
    }

    const up = String(k).toUpperCase();
    let numKey = "OTHER";

    if (up === "SB" || up === "DB" || up.includes("BULL")) {
      numKey = "BULL";
    } else {
      const m = up.match(/(\d{1,2})$/);
      if (m?.[1]) numKey = m[1];
    }

    byNumber[numKey] = (byNumber[numKey] || 0) + vv;
  }

  let bestNum: string | null = null;
  let bestNumVal = -1;
  for (const [nk, nv] of Object.entries(byNumber)) {
    if (nv > bestNumVal) {
      bestNumVal = nv;
      bestNum = nk;
    }
  }

  return { favSegment: bestSeg, favNumber: bestNum };
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

    // ✅ Option A
    totalDarts: 0,
    avgDarts: 0,
    favSegment: null,
    favNumber: null,
  };

  if (!profileId) return agg;

  const list = safeArr(records).filter((r) => isKillerRecord(r));

  const mergedHits: Record<string, number> = {};

  for (const rec of list) {
    const players = readKillerPlayersFromRecord(rec);

    const me = players.find((p: any) => String(p?.id) === String(profileId));
    if (!me) continue;

    agg.totalMatches += 1;

    const winnerId =
      rec?.winnerId ??
      rec?.payload?.winnerId ??
      rec?.summary?.winnerId ??
      rec?.payload?.summary?.winnerId ??
      null;

    if (winnerId && String(winnerId) === String(profileId)) agg.wins += 1;

    const kills = safeNum(me?.kills, 0);
    agg.totalKills += kills;

    const eliminated = !!me?.eliminated;
    if (eliminated) agg.deaths += 1;

    const when = safeNum(rec?.updatedAt ?? rec?.finishedAt ?? rec?.createdAt ?? rec?.ts ?? rec?.date, 0);
    if (when) agg.lastPlayedAt = Math.max(agg.lastPlayedAt ?? 0, when);

    // ✅ Option A: hitsBySegment via summary.perPlayer
    const perMap = readPerPlayerFromRecord(rec);
    const det = perMap?.[String(profileId)] || null;
    if (det?.hitsBySegment) {
      agg.totalDarts += sumHits(det.hitsBySegment);
      mergeHits(mergedHits, det.hitsBySegment);
    }
  }

  agg.winRate = agg.totalMatches > 0 ? agg.wins / agg.totalMatches : 0;
  agg.avgKills = agg.totalMatches > 0 ? agg.totalKills / agg.totalMatches : 0;
  agg.avgDeaths = agg.totalMatches > 0 ? agg.deaths / agg.totalMatches : 0;

  // ✅ Option A
  agg.avgDarts = agg.totalMatches > 0 ? agg.totalDarts / agg.totalMatches : 0;
  const fav = computeFavFromHits(mergedHits);
  agg.favSegment = fav.favSegment;
  agg.favNumber = fav.favNumber;

  return agg;
}
