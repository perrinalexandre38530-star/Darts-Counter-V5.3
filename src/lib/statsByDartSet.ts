// =============================================================
// src/lib/statsByDartSet.ts
// Agrégation des stats X01 par set de fléchettes (dartSetId / dartPresetId)
// Source: History (records kind="x01", status="finished")
// Sortie: stats par dartSetId pour un profileId donné (optionnel)
// =============================================================

import { History } from "./history";

export type DartSetAgg = {
  dartSetId: string;
  matches: number;
  darts: number;

  // pour avg3 solide : (sumPoints / sumDarts) * 3
  avg3SumPoints: number;
  avg3SumDarts: number;

  // calculé à la fin
  avg3: number;

  bestVisit: number;
  bestCheckout: number;

  hitsS: number;
  hitsD: number;
  hitsT: number;
  miss: number;
  bull: number;
  dBull: number;
  bust: number;
};

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function listHistorySafe(): Promise<any[]> {
  try {
    if ((History as any).list) return (await (History as any).list()) || [];
  } catch {}
  try {
    if ((History as any).getAll) return (await (History as any).getAll()) || [];
  } catch {}
  try {
    if ((History as any).all) return (await (History as any).all()) || [];
  } catch {}
  try {
    if ((History as any).query) return (await (History as any).query({})) || [];
  } catch {}
  return [];
}

/**
 * Stats par set de fléchettes.
 * - profileId optionnel : si fourni, filtre un seul profil (local/online)
 * - nécessite idéalement pp.profileId + pp.dartSetId/dartPresetId dans summary.perPlayer
 * - fallback si pp.profileId absent : on tente r.players[] (si ton History record le contient)
 */
export async function getX01StatsByDartSet(profileId?: string) {
  const rows = await listHistorySafe();
  const agg: Record<string, DartSetAgg> = {};

  for (const r of rows || []) {
    if (!r) continue;
    if (r.kind !== "x01") continue;
    if (r.status && r.status !== "finished") continue;

    const perPlayer: any[] = Array.isArray(r?.summary?.perPlayer)
      ? r.summary.perPlayer
      : [];

    // fallback: players dans le record History (si présent)
    const recordPlayers: any[] = Array.isArray(r?.players) ? r.players : [];

    for (const pp of perPlayer) {
      if (!pp) continue;

      // --- filtre profil ---
      if (profileId) {
        const ppProfileId = pp.profileId ?? null;

        let ok = false;

        if (ppProfileId && ppProfileId === profileId) {
          ok = true;
        } else {
          // fallback : chercher playerId dans record.players et comparer profileId
          const pid = pp.playerId ?? pp.id ?? null;
          if (pid) {
            const found = recordPlayers.find((x: any) => x?.id === pid);
            if (found?.profileId && found.profileId === profileId) ok = true;
          }
        }

        if (!ok) continue;
      }

      const dartSetId = pp.dartSetId || pp.dartPresetId;
      if (!dartSetId) continue;

      const a =
        (agg[dartSetId] ||= {
          dartSetId,
          matches: 0,
          darts: 0,
          avg3SumPoints: 0,
          avg3SumDarts: 0,
          avg3: 0,
          bestVisit: 0,
          bestCheckout: 0,
          hitsS: 0,
          hitsD: 0,
          hitsT: 0,
          miss: 0,
          bull: 0,
          dBull: 0,
          bust: 0,
        });

      a.matches += 1;

      const darts = num(pp.darts);
      a.darts += darts;

      // points : on prend _sumPoints si dispo (recommandé), sinon fallback pp.points
      const points =
        pp._sumPoints != null ? num(pp._sumPoints) : num(pp.points);

      a.avg3SumPoints += points;
      a.avg3SumDarts += darts;

      a.bestVisit = Math.max(a.bestVisit, num(pp.bestVisit));
      a.bestCheckout = Math.max(a.bestCheckout, num(pp.bestCheckout));

      const hits = pp.hits || {};
      a.hitsS += num(hits.S);
      a.hitsD += num(hits.D);
      a.hitsT += num(hits.T);
      a.miss += num(hits.M);

      a.bull += num(pp.bull);
      a.dBull += num(pp.dBull);
      a.bust += num(pp.bust);
    }
  }

  // sortie + avg3 final
  const out: DartSetAgg[] = Object.values(agg).map((a) => ({
    ...a,
    avg3: a.avg3SumDarts > 0 ? (a.avg3SumPoints / a.avg3SumDarts) * 3 : 0,
  }));

  // tri : meilleur avg3 puis plus de matchs
  out.sort((x, y) => {
    if (y.avg3 !== x.avg3) return y.avg3 - x.avg3;
    return y.matches - x.matches;
  });

  return out;
}
