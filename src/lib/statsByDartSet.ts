// =============================================================
// src/lib/statsByDartSet.ts
// Stats X01 agrégées par set de fléchettes (dartSetId / dartPresetId)
// - Compatible X01 legacy + X01 V3 (mode/variant/game = "x01v3")
// - Ajoute quelques stats utiles si présentes dans summary (first9, checkout, doubles, records)
// =============================================================

import { History } from "./history";

export type DartSetAgg = {
  dartSetId: string;
  matches: number;

  darts: number;

  // AVG/3D solide
  avg3SumPoints: number;
  avg3SumDarts: number;

  // optionnel si dispo (sinon restera 0)
  first9SumPoints: number;
  first9SumDarts: number; // souvent 9 par match, mais on reste safe

  bestVisit: number;
  bestCheckout: number;

  hitsS: number;
  hitsD: number;
  hitsT: number;
  miss: number;

  bull: number;
  dBull: number;
  bust: number;

  // checkout/doubles si dispo
  checkoutMade: number;
  checkoutAtt: number;
  doublesHit: number;
  doublesAtt: number;

  // records si dispo
  n180: number;
  n140: number;
  n100: number;
};

export type DartSetAggOut = DartSetAgg & {
  avg3: number;
  first9: number;
  checkoutPct: number;
  doublesPct: number;
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
  if (pp?._sumPoints !== undefined) return N(pp._sumPoints, 0);
  if (pp?.sumPoints !== undefined) return N(pp.sumPoints, 0);
  if (pp?.points !== undefined) return N(pp.points, 0);
  if (pp?.scoredPoints !== undefined) return N(pp.scoredPoints, 0);
  if (pp?.totalPoints !== undefined) return N(pp.totalPoints, 0);
  return 0;
}

function resolveFirst9(pp: any): { points: number; darts: number } {
  // ultra tolérant : plusieurs clés possibles selon tes anciens résumés
  const p =
    pp?.first9Points ??
    pp?.first9_sumPoints ??
    pp?.sumFirst9Points ??
    pp?.f9Points ??
    (pp?.first9 && (pp.first9.points ?? pp.first9.sumPoints)) ??
    0;

  const d =
    pp?.first9Darts ??
    pp?.first9_sumDarts ??
    pp?.sumFirst9Darts ??
    pp?.f9Darts ??
    (pp?.first9 && (pp.first9.darts ?? pp.first9.sumDarts)) ??
    0;

  return { points: N(p, 0), darts: N(d, 0) };
}

function resolveCheckout(pp: any): { made: number; att: number } {
  const made =
    pp?.checkoutMade ??
    pp?.coMade ??
    (pp?.checkout && (pp.checkout.made ?? pp.checkout.done)) ??
    0;
  const att =
    pp?.checkoutAttempts ??
    pp?.checkoutAtt ??
    pp?.coAtt ??
    (pp?.checkout && (pp.checkout.att ?? pp.checkout.attempts)) ??
    0;
  return { made: N(made, 0), att: N(att, 0) };
}

function resolveDoubles(pp: any): { hit: number; att: number } {
  const hit =
    pp?.doublesHit ??
    pp?.dblHit ??
    (pp?.doubles && (pp.doubles.hit ?? pp.doubles.made)) ??
    0;
  const att =
    pp?.doublesAttempts ??
    pp?.dblAtt ??
    (pp?.doubles && (pp.doubles.att ?? pp.doubles.attempts)) ??
    0;
  return { hit: N(hit, 0), att: N(att, 0) };
}

function resolveRecords(pp: any): { n180: number; n140: number; n100: number } {
  // selon comment tu logges (records / tops / visits)
  const rec = pp?.records ?? pp?.tops ?? pp?.visits ?? null;

  const n180 =
    pp?.n180 ??
    pp?.count180 ??
    rec?.n180 ??
    rec?.["180"] ??
    rec?.top180 ??
    0;

  const n140 =
    pp?.n140 ??
    pp?.count140 ??
    rec?.n140 ??
    rec?.["140"] ??
    rec?.top140 ??
    0;

  const n100 =
    pp?.n100 ??
    pp?.count100 ??
    rec?.n100 ??
    rec?.["100"] ??
    rec?.top100 ??
    rec?.top100Plus ??
    0;

  return { n180: N(n180, 0), n140: N(n140, 0), n100: N(n100, 0) };
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
    if (status && status !== "finished") continue;

    const summary = r?.summary ?? r?.payload?.summary ?? null;
    const perPlayer = pickPerPlayer(summary);

    for (const pp of perPlayer) {
      const pid = resolveProfileId(pp);
      if (profileId && pid !== profileId) continue;

      const dartSetId = resolveDartSetId(pp);
      if (!dartSetId) continue;

      const a = (agg[dartSetId] ||= {
        dartSetId,
        matches: 0,
        darts: 0,

        avg3SumPoints: 0,
        avg3SumDarts: 0,

        first9SumPoints: 0,
        first9SumDarts: 0,

        bestVisit: 0,
        bestCheckout: 0,

        hitsS: 0,
        hitsD: 0,
        hitsT: 0,
        miss: 0,

        bull: 0,
        dBull: 0,
        bust: 0,

        checkoutMade: 0,
        checkoutAtt: 0,
        doublesHit: 0,
        doublesAtt: 0,

        n180: 0,
        n140: 0,
        n100: 0,
      });

      a.matches += 1;

      const darts = N(pp?.darts, 0);
      a.darts += darts;

      const points = resolvePoints(pp);
      a.avg3SumPoints += points;
      a.avg3SumDarts += darts;

      const f9 = resolveFirst9(pp);
      a.first9SumPoints += f9.points;
      a.first9SumDarts += f9.darts;

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

      const co = resolveCheckout(pp);
      a.checkoutMade += co.made;
      a.checkoutAtt += co.att;

      const db = resolveDoubles(pp);
      a.doublesHit += db.hit;
      a.doublesAtt += db.att;

      const rec = resolveRecords(pp);
      a.n180 += rec.n180;
      a.n140 += rec.n140;
      a.n100 += rec.n100;
    }
  }

  const out: DartSetAggOut[] = Object.values(agg).map((a) => {
    const avg3 = a.avg3SumDarts > 0 ? (a.avg3SumPoints / a.avg3SumDarts) * 3 : 0;
    const first9 =
      a.first9SumDarts > 0 ? (a.first9SumPoints / a.first9SumDarts) * 3 : 0;

    const checkoutPct =
      a.checkoutAtt > 0 ? (a.checkoutMade / a.checkoutAtt) * 100 : 0;

    const doublesPct =
      a.doublesAtt > 0 ? (a.doublesHit / a.doublesAtt) * 100 : 0;

    return { ...a, avg3, first9, checkoutPct, doublesPct };
  });

  out.sort((x, y) => (y.matches - x.matches) || (y.avg3 - x.avg3));
  return out;
}

export async function getX01StatsByDartSetForProfile(profileId: string) {
  return getX01StatsByDartSet(profileId);
}
