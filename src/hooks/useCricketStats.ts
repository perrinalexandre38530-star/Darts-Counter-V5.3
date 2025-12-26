// ============================================
// src/hooks/useCricketStats.ts
// Stats globales Cricket par profil
// - Lit History.listFinished() pour trouver les matchs "cricket"
// - Charge chaque payload via History.get(id)
// - Récupère / calcule legStats par joueur (computeCricketLegStats)
// - Agrège par profil (aggregateCricketMatches)
//
// ✅ FIX V3 (anti "tout à 0"):
// - Decode payload string: base64+gzip, base64->json, json direct
// - Détection cricket robuste (kind/mode + inspection payload)
// - Extraction hits ultra permissive (hits/throws/darts/turns/visits/rounds/events…)
// - Normalisation hits (S/D/T + 15..20 + 25/50 + MISS)
// - Si profileId undefined => retourne le 1er profil dispo
// ============================================

import * as React from "react";
import { History } from "../lib/history";
import {
  computeCricketLegStats,
  aggregateCricketMatches,
  type CricketLegStats,
  type CricketMatchAgg,
  type CricketHit, // ✅ important
} from "../lib/StatsCricket";
import type { SavedMatch } from "../lib/history";

export type CricketPlayerDashboardStats = CricketMatchAgg & {
  profileId: string;
  profileName?: string;
};

type StateByProfile = Record<string, CricketPlayerDashboardStats>;

/* ---------------------------------------------
   Decode helpers (base64+gzip OR json OR object)
--------------------------------------------- */
async function decodeMaybe(raw: any): Promise<any | null> {
  if (!raw) return null;

  // already object
  if (typeof raw === "object") return raw;

  if (typeof raw !== "string") return null;

  const s = raw.trim();
  if (!s) return null;

  // 1) raw JSON
  if (s.startsWith("{") || s.startsWith("[")) {
    try {
      return JSON.parse(s);
    } catch {
      // continue
    }
  }

  // 2) base64 -> maybe gzip(json) OR json
  try {
    const bin = atob(s);
    const buf = Uint8Array.from(bin, (c) => c.charCodeAt(0));

    const DS: any = (window as any).DecompressionStream;
    if (typeof DS === "function") {
      try {
        const ds = new DS("gzip");
        const stream = new Blob([buf]).stream().pipeThrough(ds);
        const resp = new Response(stream);
        return await resp.json();
      } catch {
        // not gzipped
      }
    }

    // base64 contained plain JSON string
    try {
      return JSON.parse(bin);
    } catch {
      // continue
    }
  } catch {
    // not base64
  }

  return null;
}

/* ---------------------------------------------
   Helpers: payload navigation
--------------------------------------------- */
function lower(v: any) {
  return String(v ?? "").toLowerCase();
}

function isCricketPayload(payload: any): boolean {
  if (!payload || typeof payload !== "object") return false;

  const pk = lower(payload.kind);
  const pm =
    lower(payload.mode) ||
    lower(payload.config?.mode) ||
    lower(payload.game?.mode) ||
    lower(payload.summary?.mode) ||
    lower(payload.match?.mode);

  if (pk === "cricket") return true;
  if (pm.includes("cricket")) return true;

  // parfois le mode est dans engineState / state
  const em =
    lower(payload.engineState?.mode) ||
    lower(payload.engineState?.config?.mode) ||
    lower(payload.state?.mode) ||
    lower(payload.state?.config?.mode);

  if (em.includes("cricket")) return true;

  return false;
}

function pickPlayers(payload: any): any[] {
  if (!payload || typeof payload !== "object") return [];

  const candidates: any[] = [];

  // direct
  if (Array.isArray(payload.players)) candidates.push(payload.players);

  // common wrappers
  if (Array.isArray(payload.result?.players)) candidates.push(payload.result.players);
  if (Array.isArray(payload.summary?.players)) candidates.push(payload.summary.players);

  // engine/state variants
  if (Array.isArray(payload.engineState?.players)) candidates.push(payload.engineState.players);
  if (Array.isArray(payload.state?.players)) candidates.push(payload.state.players);
  if (Array.isArray(payload.match?.players)) candidates.push(payload.match.players);

  // pick first non-empty
  for (const arr of candidates) {
    if (Array.isArray(arr) && arr.length) return arr;
  }
  return [];
}

function getPid(p: any): string {
  if (!p) return "";
  return String(p.profileId || p.id || p.playerId || p.player_id || p.uuid || "");
}

function getPname(p: any): string | undefined {
  if (!p) return undefined;
  return p.name || p.displayName || p.username || undefined;
}

/* ---------------------------------------------
   ✅ HIT NORMALIZATION (S/D/T + 15..20 + 25/50 + MISS)
   On renvoie un CricketHit "riche" (plusieurs clés) pour être compatible
--------------------------------------------- */
function normalizeOneHit(h: any): CricketHit | null {
  if (!h) return null;

  // string like "T20", "D19", "S15", "SB", "DB", "25", "50", "MISS"
  if (typeof h === "string") {
    const s = h.trim().toUpperCase();
    if (!s) return null;
    if (s === "MISS" || s === "0" || s === "X") {
      return { type: "MISS", target: "MISS", mult: 0 } as any;
    }
    if (s === "SB" || s === "B" || s === "BULL" || s === "25") {
      return { type: "BULL", target: 25, n: 25, mult: 1, ring: "S" } as any;
    }
    if (s === "DB" || s === "DBULL" || s === "50") {
      return { type: "DBULL", target: 25, n: 25, mult: 2, ring: "D" } as any;
    }

    const m = s.match(/^([SDT])\s*(\d{1,2})$/);
    if (m) {
      const ring = m[1];
      const n = Number(m[2]);
      const mult = ring === "S" ? 1 : ring === "D" ? 2 : 3;
      if (!Number.isFinite(n) || n <= 0) return null;
      return { type: ring, ring, target: n, n, mult } as any;
    }

    const m2 = s.match(/^(\d{1,2})$/);
    if (m2) {
      const n = Number(m2[1]);
      if (n === 25) return { type: "BULL", target: 25, n: 25, mult: 1, ring: "S" } as any;
      if (n === 50) return { type: "DBULL", target: 25, n: 25, mult: 2, ring: "D" } as any;
      return { type: "S", ring: "S", target: n, n, mult: 1 } as any;
    }

    return null;
  }

  // object variants
  if (typeof h === "object") {
    // already looks like a CricketHit
    const t = (h as any).target ?? (h as any).n ?? (h as any).number ?? (h as any).value ?? null;
    const multRaw =
      (h as any).mult ??
      (h as any).multiplier ??
      (h as any).m ??
      (h as any).ringMult ??
      null;

    const ringRaw =
      (h as any).ring ??
      (h as any).type ??
      (h as any).segment ??
      (h as any).kind ??
      (h as any).area ??
      null;

    // MISS flags
    if ((h as any).miss === true || (h as any).isMiss === true) {
      return { type: "MISS", target: "MISS", mult: 0 } as any;
    }

    // bull variants
    const bullLike = String((h as any).bull ?? (h as any).isBull ?? "").toLowerCase();
    if (bullLike === "true") {
      return { type: "BULL", target: 25, n: 25, mult: 1, ring: "S" } as any;
    }

    // If target is 25/50
    if (t === 25 || t === "25") {
      const mult = Number(multRaw ?? 1);
      return { type: mult >= 2 ? "DBULL" : "BULL", target: 25, n: 25, mult: mult >= 2 ? 2 : 1, ring: mult >= 2 ? "D" : "S" } as any;
    }
    if (t === 50 || t === "50") {
      return { type: "DBULL", target: 25, n: 25, mult: 2, ring: "D" } as any;
    }

    const n = Number(t);
    if (!Number.isFinite(n) || n <= 0) return null;

    let mult = Number(multRaw);
    if (!Number.isFinite(mult) || mult <= 0) {
      const r = String(ringRaw ?? "").toUpperCase();
      mult = r === "D" ? 2 : r === "T" ? 3 : 1;
    }

    const ring = mult === 2 ? "D" : mult === 3 ? "T" : "S";
    return { ...h, ring, target: n, n, mult } as any;
  }

  return null;
}

/* ---------------------------------------------
   ✅ Extract hits from MANY shapes
--------------------------------------------- */
function flattenAnyArray(x: any): any[] {
  if (!x) return [];
  if (!Array.isArray(x)) return [];
  const out: any[] = [];
  for (const it of x) {
    if (Array.isArray(it)) out.push(...flattenAnyArray(it));
    else out.push(it);
  }
  return out;
}

function tryGetArray(obj: any, path: string[]): any[] {
  try {
    let cur = obj;
    for (const k of path) {
      if (!cur || typeof cur !== "object") return [];
      cur = cur[k];
    }
    return Array.isArray(cur) ? cur : [];
  } catch {
    return [];
  }
}

function extractHitsFromPlayer(p: any, payload: any): any[] {
  if (!p || typeof p !== "object") return [];

  // direct common fields
  const direct =
    (Array.isArray((p as any).hits) && (p as any).hits) ||
    (Array.isArray((p as any).throws) && (p as any).throws) ||
    (Array.isArray((p as any).darts) && (p as any).darts) ||
    null;

  if (direct && direct.length) return flattenAnyArray(direct);

  // turns/visits/rounds => darts/throws/hits
  const turns = (Array.isArray((p as any).turns) && (p as any).turns) ||
    (Array.isArray((p as any).visits) && (p as any).visits) ||
    (Array.isArray((p as any).rounds) && (p as any).rounds) ||
    null;

  if (turns && turns.length) {
    const acc: any[] = [];
    for (const t of turns) {
      if (!t) continue;
      const a =
        (Array.isArray((t as any).darts) && (t as any).darts) ||
        (Array.isArray((t as any).throws) && (t as any).throws) ||
        (Array.isArray((t as any).hits) && (t as any).hits) ||
        null;
      if (a && a.length) acc.push(...flattenAnyArray(a));
    }
    if (acc.length) return acc;
  }

  // player log / actions
  const log =
    (Array.isArray((p as any).log) && (p as any).log) ||
    (Array.isArray((p as any).actions) && (p as any).actions) ||
    (Array.isArray((p as any).events) && (p as any).events) ||
    null;

  if (log && log.length) {
    // often each event has dart/segment/value
    return flattenAnyArray(log);
  }

  // global events filtered by player id (best effort)
  const pid = getPid(p);
  if (pid && payload && typeof payload === "object") {
    const globalEvents =
      (Array.isArray(payload.events) && payload.events) ||
      (Array.isArray(payload.log) && payload.log) ||
      (Array.isArray(payload.actions) && payload.actions) ||
      (Array.isArray(payload.engineState?.events) && payload.engineState.events) ||
      (Array.isArray(payload.state?.events) && payload.state.events) ||
      null;

    if (globalEvents && globalEvents.length) {
      const mine = globalEvents.filter((e: any) => {
        const ep = String(e?.playerId || e?.profileId || e?.pid || e?.id || "");
        return ep && ep === pid;
      });
      if (mine.length) return flattenAnyArray(mine);
    }
  }

  return [];
}

function normalizeHits(rawHits: any[]): CricketHit[] {
  const out: CricketHit[] = [];
  const flat = flattenAnyArray(rawHits);

  for (const h of flat) {
    // Sometimes events look like {dart:"T20"} or {hit:"D19"} or {segment:"T", n:20}
    if (h && typeof h === "object") {
      const token =
        (h as any).dart ??
        (h as any).hit ??
        (h as any).code ??
        (h as any).label ??
        (h as any).valueStr ??
        null;

      if (typeof token === "string") {
        const nh = normalizeOneHit(token);
        if (nh) out.push(nh);
        continue;
      }
    }

    const nh = normalizeOneHit(h);
    if (nh) out.push(nh);
  }

  return out;
}

/* ---------------------------------------------
   Cricket row detection (light)
--------------------------------------------- */
function isCricketRowLight(m: any): boolean {
  const k = lower(m?.kind);
  if (k === "cricket") return true;

  const mode =
    lower(m?.mode) ||
    lower(m?.game?.mode) ||
    lower(m?.summary?.mode);

  if (mode.includes("cricket")) return true;
  return false;
}

/* ---------------------------------------------
   Hook
--------------------------------------------- */
export function useCricketStats() {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [statsByProfile, setStatsByProfile] = React.useState<StateByProfile>({});

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        // ✅ compat: certaines versions n'ont pas listFinished()
        const all: SavedMatch[] =
          typeof (History as any).listFinished === "function"
            ? await (History as any).listFinished()
            : typeof (History as any).listByStatus === "function"
              ? await (History as any).listByStatus("finished")
              : await History.list();

        // pré-filtre (light) + on confirmera avec le payload ensuite
        const maybeCricket = (all || []).filter(isCricketRowLight);

        const legsByProfile: Record<string, { name?: string; legs: CricketLegStats[] }> = {};

        for (const row of maybeCricket) {
          const rid = String((row as any)?.id ?? "");
          if (!rid) continue;

          const full = await History.get(rid);
          const rawPayload =
            (full as any)?.payload ??
            (row as any)?.payload ??
            null;

          const payload = await decodeMaybe(rawPayload);
          if (!payload || typeof payload !== "object") continue;

          // ✅ confirmer cricket
          if (!isCricketPayload(payload)) {
            // si row.kind disait cricket, on tolère quand même
            if (lower((row as any)?.kind) !== "cricket") continue;
          }

          const players = pickPlayers(payload);
          if (!players.length) continue;

          for (const p of players) {
            const pid = getPid(p);
            if (!pid) continue;

            // ✅ try already computed legStats first
            const existingLegStats =
              (p as any).legStats && typeof (p as any).legStats === "object"
                ? (p as any).legStats
                : null;

            let legStats: CricketLegStats | null = null;

            if (existingLegStats) {
              legStats = existingLegStats as CricketLegStats;
            } else {
              const rawHits = extractHitsFromPlayer(p, payload);
              const hits = normalizeHits(rawHits);

              // ⚠️ si hits vides -> on retombe à 0 (mais au moins on a tenté partout)
              legStats = computeCricketLegStats(hits);
            }

            if (!legsByProfile[pid]) legsByProfile[pid] = { name: getPname(p), legs: [] };
            if (!legsByProfile[pid].name) legsByProfile[pid].name = getPname(p);

            legsByProfile[pid].legs.push(legStats);
          }
        }

        const out: StateByProfile = {};
        Object.entries(legsByProfile).forEach(([pid, bucket]) => {
          const agg = aggregateCricketMatches(bucket.legs);
          out[pid] = { ...agg, profileId: pid, profileName: bucket.name };
        });

        if (!cancelled) {
          setStatsByProfile(out);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error("Cricket stats error"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const getForProfile = React.useCallback(
    (profileId?: string | null) => {
      if (!profileId) {
        const first = Object.values(statsByProfile)[0];
        return first ?? null;
      }
      return statsByProfile[profileId] ?? null;
    },
    [statsByProfile]
  );

  return { loading, error, statsByProfile, getForProfile };
}

// Petit hook pratique, pour un seul profil
export function useCricketStatsForProfile(profileId?: string | null) {
  const { loading, error, getForProfile } = useCricketStats();
  const stats = getForProfile(profileId ?? undefined);
  return { loading, error, stats };
}
