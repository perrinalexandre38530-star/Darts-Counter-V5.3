// ============================================
// src/hooks/useCricketStats.ts
// Stats globales Cricket par profil
// - Lit History.listFinished() pour trouver les matchs "cricket"
// - Charge chaque payload via History.get(id)
// - Récupère / calcule legStats par joueur (computeCricketLegStats)
// - Agrège par profil (aggregateCricketMatches)
//
// ✅ FIX V2:
// - Supporte payload "string" (base64 + gzip OU json direct) + payload objet
// - Si profileId est undefined => retourne automatiquement le 1er profil dispo
//   (évite "Aucune donnée Cricket" quand StatsHub ne passe pas le profileId)
// - Détecte cricket aussi via champs usuels (kind/mode/config)
// ============================================

import * as React from "react";
import { History } from "../lib/history";
import {
  computeCricketLegStats,
  aggregateCricketMatches,
  type CricketLegStats,
  type CricketMatchAgg,
} from "../lib/StatsCricket";
import type { SavedMatch } from "../lib/history";

export type CricketPlayerDashboardStats = CricketMatchAgg & {
  profileId: string;
  profileName?: string;
};

type StateByProfile = Record<string, CricketPlayerDashboardStats>;

/** ---- decode helpers (base64+gzip OR json) ---- */
async function decodeMaybe(raw: any): Promise<any | null> {
  if (!raw) return null;

  // already object
  if (typeof raw === "object") return raw;

  if (typeof raw !== "string") return null;

  // Try base64 first
  try {
    const bin = atob(raw);
    const buf = Uint8Array.from(bin, (c) => c.charCodeAt(0));

    const DS: any = (window as any).DecompressionStream;
    if (typeof DS === "function") {
      try {
        const ds = new DS("gzip");
        const stream = new Blob([buf]).stream().pipeThrough(ds);
        const resp = new Response(stream);
        return await resp.json();
      } catch {
        // if not gzipped, fallthrough
      }
    }

    // not gzipped -> maybe plain json inside base64
    try {
      return JSON.parse(bin);
    } catch {
      // fallthrough
    }
  } catch {
    // not base64
  }

  // Try raw json
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function pickPlayers(payload: any): any[] {
  if (!payload || typeof payload !== "object") return [];
  const p1 = Array.isArray(payload.players) ? payload.players : [];
  const p2 = Array.isArray(payload.result?.players) ? payload.result.players : [];
  const p3 = Array.isArray(payload.summary?.players) ? payload.summary.players : [];
  return p1.length ? p1 : p2.length ? p2 : p3.length ? p3 : [];
}

function getPid(p: any): string {
  if (!p) return "";
  return String(p.profileId || p.id || p.playerId || p.player_id || p.uuid || "");
}

function getPname(p: any): string | undefined {
  if (!p) return undefined;
  return p.name || p.displayName || p.username || undefined;
}

function isCricketRow(m: any): boolean {
  const k = String(m?.kind || "").toLowerCase();
  const mode =
    String(m?.mode || "").toLowerCase() ||
    String(m?.game?.mode || "").toLowerCase() ||
    String(m?.summary?.mode || "").toLowerCase();

  if (k === "cricket") return true;
  if (mode.includes("cricket")) return true;

  // some history rows are "leg" with config.mode inside decoded payload, we can't see it here
  // so we stay permissive when kind is unknown
  return false;
}

export function useCricketStats() {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [statsByProfile, setStatsByProfile] = React.useState<StateByProfile>(
    {}
  );

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const all: SavedMatch[] = await History.listFinished();

        // ✅ detect cricket robustly
        const cricketRows = all.filter((m: any) => {
          const k = String((m as any)?.kind || "").toLowerCase();
          if (k === "cricket") return true;
          const mode =
            String((m as any)?.mode || "").toLowerCase() ||
            String((m as any)?.game?.mode || "").toLowerCase() ||
            String((m as any)?.summary?.mode || "").toLowerCase();
          return mode.includes("cricket");
        });

        const legsByProfile: Record<
          string,
          { name?: string; legs: CricketLegStats[] }
        > = {};

        for (const row of cricketRows) {
          const full = await History.get((row as any).id);
          const rawPayload =
            (full as any)?.payload ?? (row as any)?.payload ?? (full as any) ?? null;

          const payload = await decodeMaybe(rawPayload);
          if (!payload || typeof payload !== "object") continue;

          // ✅ ensure it's really cricket (sometimes listFinished includes weird legacy)
          const pmode =
            String(payload?.config?.mode || payload?.game?.mode || payload?.mode || payload?.summary?.mode || "")
              .toLowerCase();
          const pkind = String(payload?.kind || "").toLowerCase();
          if (!(pkind === "cricket" || pmode.includes("cricket"))) {
            // allow anyway if row.kind already says cricket
            if (String((row as any)?.kind || "").toLowerCase() !== "cricket") continue;
          }

          const players = pickPlayers(payload);

          for (const p of players) {
            const pid = getPid(p);
            if (!pid) continue;

            const hits =
              Array.isArray(p.hits) ? p.hits :
              Array.isArray(p.throws) ? p.throws :
              Array.isArray(p.darts) ? p.darts :
              [];

            const legStats: CricketLegStats =
              p.legStats && typeof p.legStats === "object"
                ? p.legStats
                : computeCricketLegStats(hits);

            if (!legsByProfile[pid]) {
              legsByProfile[pid] = { name: getPname(p), legs: [] };
            }
            if (!legsByProfile[pid].name) legsByProfile[pid].name = getPname(p);
            legsByProfile[pid].legs.push(legStats);
          }
        }

        const out: StateByProfile = {};
        Object.entries(legsByProfile).forEach(([pid, bucket]) => {
          const agg = aggregateCricketMatches(bucket.legs);
          out[pid] = {
            ...agg,
            profileId: pid,
            profileName: bucket.name,
          };
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
      // ✅ if missing, return first available profile stats
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
