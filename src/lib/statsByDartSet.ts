// =============================================================
// src/lib/statsByDartSet.ts
// Stats X01 agrégées par set de fléchettes (dartSetId / dartPresetId)
// - Compatible X01 legacy + X01 V3 (mode/variant/game = "x01v3")
// =============================================================

import { History } from "./history";

export type DartSetAgg = {
  dartSetId: string;
  matches: number;

  darts: number;
  avg3SumPoints: number;
  avg3SumDarts: number;

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

export type DartSetAggOut = DartSetAgg & {
  avg3: number;
};

const N = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);

function pickPerPlayer(summary: any): any[] {
  if (!summary) return [];
  if (Array.isArray(summary.perPlayer)) return summary.perPlayer;
  if (Array.isArray(summary.players)) return summary.players;

  // fallback objet map { [pid]: {...} }
  if (summary.players && typeof summary.players === "object") {
    return Object.entries(summary.players).map(([playerId, v]) => ({
      playerId,
      ...(v as any),
    }));
  }
  if (summary.perPlayer && typeof summary.perPlayer === "object") {
    return Object.entries(summary.perPlayer).map(([playerId, v]) => ({
      playerId,
      ...(v as any),
    }));
  }
  return [];
}

function resolveProfileId(pp: any): string | null {
  return (
    (pp?.profileId ?? null) ||
    (pp?.playerId ?? null) ||
    (pp?.id ?? null) ||
    null
  );
}

function resolveDartSetId(pp: any): string | null {
  return (
    (pp?.dartSetId ?? null) ||
    (pp?.dartPresetId ?? null) ||
    (pp?.dartsetId ?? null) ||
    null
  );
}

function resolvePoints(pp: any): number {
  // si tu l’enregistres déjà
  if (pp?._sumPoints !== undefined) return N(pp._sumPoints, 0);
  if (pp?.sumPoints !== undefined) return N(pp.sumPoints, 0);

  // fallback possible
  if (pp?.points !== undefined) return N(pp.points, 0);
  if (pp?.scoredPoints !== undefined) return N(pp.scoredPoints, 0);

  return 0;
}

function resolveHits(pp: any): { S: number; D: number; T: number; M: number } {
  const h = pp?.hits ?? pp?.hit ?? pp?.segments ?? null;
  if (h && typeof h === "object") {
    return {
      S: N((h as any).S, 0),
      D: N((h as any).D, 0),
      T: N((h as any).T, 0),
      M: N((h as any).M ?? (h as any).miss, 0),
    };
  }
  return { S: 0, D: 0, T: 0, M: 0 };
}

function isX01Record(r: any): boolean {
  const kind = String(r?.kind ?? "").toLowerCase();
  const game = String(r?.game ?? "").toLowerCase();
  const mode = String(r?.mode ?? "").toLowerCase();
  const variant = String(r?.variant ?? "").toLowerCase();

  // ✅ On accepte x01 + x01v3 partout
  if (kind === "x01" || kind === "x01v3") return true;
  if (game === "x01" || game === "x01v3") return true;
  if (mode === "x01" || mode === "x01v3") return true;
  if (variant === "x01" || variant === "x01v3") return true;

  return false;
}

// ------------------------------------------------------------
// Fonction principale
// ------------------------------------------------------------
export async function getX01StatsByDartSet(profileId?: string) {
  const rows = await History.list?.();
  const agg: Record<string, DartSetAgg> = {};

  for (const r of rows || []) {
    if (!isX01Record(r)) continue;

    const status = r?.status ?? r?.state ?? "";
    // si status absent => on accepte (certains historiques n’ont pas ce champ)
    if (status && status !== "finished") continue;

    const summary = r?.summary ?? r?.payload?.summary ?? null;
    const perPlayer = pickPerPlayer(summary);

    for (const pp of perPlayer) {
      const pid = resolveProfileId(pp);

      // filtrage profil si demandé
      if (profileId && pid !== profileId) continue;

      const dartSetId = resolveDartSetId(pp);
      if (!dartSetId) continue;

      const a = (agg[dartSetId] ||= {
        dartSetId,
        matches: 0,
        darts: 0,
        avg3SumPoints: 0,
        avg3SumDarts: 0,
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

      const darts = N(pp?.darts, 0);
      a.darts += darts;

      // avg3 recalcul solide : points/darts * 3
      const points = resolvePoints(pp);
      a.avg3SumPoints += points;
      a.avg3SumDarts += darts;

      a.bestVisit = Math.max(a.bestVisit, N(pp?.bestVisit, 0));
      a.bestCheckout = Math.max(a.bestCheckout, N(pp?.bestCheckout, 0));

      const hits = resolveHits(pp);
      a.hitsS += hits.S;
      a.hitsD += hits.D;
      a.hitsT += hits.T;
      a.miss += hits.M;

      a.bull += N(pp?.bull, 0);
      a.dBull += N(pp?.dBull ?? pp?.dbull, 0);
      a.bust += N(pp?.bust, 0);
    }
  }

  const out: DartSetAggOut[] = Object.values(agg).map((a) => ({
    ...a,
    avg3: a.avg3SumDarts > 0 ? (a.avg3SumPoints / a.avg3SumDarts) * 3 : 0,
  }));

  // Tri utile : plus joués en premier, puis avg3
  out.sort((x, y) => (y.matches - x.matches) || (y.avg3 - x.avg3));
  return out;
}

// ✅ Export attendu par StatsDartSetsSection
export async function getX01StatsByDartSetForProfile(profileId: string) {
  return getX01StatsByDartSet(profileId);
}
