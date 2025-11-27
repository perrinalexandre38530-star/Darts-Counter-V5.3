// ============================================
// src/hooks/useCricketStats.ts
// Stats globales Cricket par profil
// - Lit History.listFinished() pour trouver les matchs "cricket"
// - Charge chaque payload via History.get(id)
// - Récupère / calcule legStats par joueur (computeCricketLegStats)
// - Agrège par profil (aggregateCricketMatches)
// ============================================

import * as React from "react";
import { History } from "../lib/history";
import {
  computeCricketLegStats,
  aggregateCricketMatches,
  type CricketLegStats,
  type CricketMatchAgg,
} from "../lib/statsCricket";
import type { SavedMatch } from "../lib/history";

export type CricketPlayerDashboardStats = CricketMatchAgg & {
  profileId: string;
  profileName?: string;
};

type StateByProfile = Record<string, CricketPlayerDashboardStats>;

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
        // 1) On récupère tous les matchs terminés
        const all: SavedMatch[] = await History.listFinished();
        const cricketRows = all.filter((m) => m.kind === "cricket");

        const legsByProfile: Record<
          string,
          { name?: string; legs: CricketLegStats[] }
        > = {};

        // 2) Pour chaque match cricket, on recharge le payload complet
        for (const row of cricketRows) {
          const full = await History.get(row.id);
          if (!full || !full.payload || typeof full.payload !== "object") {
            continue;
          }

          const payload: any = full.payload;
          const players = Array.isArray(payload.players) ? payload.players : [];

          for (const p of players) {
            const pid =
              p.profileId || p.id || p.playerId || p.player_id || p.uuid;
            if (!pid) continue;

            const legStats: CricketLegStats =
              p.legStats && typeof p.legStats === "object"
                ? p.legStats
                : computeCricketLegStats(Array.isArray(p.hits) ? p.hits : []);

            if (!legsByProfile[pid]) {
              legsByProfile[pid] = {
                name: p.name,
                legs: [],
              };
            }
            legsByProfile[pid].legs.push(legStats);
          }
        }

        // 3) Agrégation globale par profil
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
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  const getForProfile = React.useCallback(
    (profileId?: string | null) => {
      if (!profileId) return null;
      return statsByProfile[profileId] ?? null;
    },
    [statsByProfile]
  );

  return {
    loading,
    error,
    statsByProfile,
    getForProfile,
  };
}

// Petit hook pratique, pour un seul profil
export function useCricketStatsForProfile(profileId?: string | null) {
  const { loading, error, getForProfile } = useCricketStats();
  const stats = getForProfile(profileId ?? undefined);
  return { loading, error, stats };
}
