// ============================================
// src/hooks/useCricketStats.ts
// Stats globales Cricket par profil
// - Lit l'historique pour trouver les matchs "cricket"
// - Charge chaque payload via History.get(id)
// - Récupère / calcule legStats par joueur (computeCricketLegStats)
// - Agrège par profil (aggregateCricketMatches)
//
// ✅ FIX V2 (robuste):
// - NE DEPEND PLUS de History.listFinished() (qui peut ne pas exister selon ton history.ts)
//   => fallback automatique : History.list() + filtre status
// - Supporte payload "string" (base64+gzip OU json direct) + payload objet
// - Détecte cricket aussi via champs usuels (kind/mode/config)
// - Si profileId est undefined => retourne automatiquement le 1er profil dispo
// ============================================

import * as React from "react";
import { History } from "../lib/history";
import type { SavedMatch } from "../lib/history";
import {
  computeCricketLegStats,
  aggregateCricketMatches,
  type CricketLegStats,
  type CricketMatchAgg,
} from "../lib/StatsCricket";

export type CricketPlayerDashboardStats = CricketMatchAgg & {
  profileId: string;
  profileName?: string;
};

type StateByProfile = Record<string, CricketPlayerDashboardStats>;

/* =========================
   decode helpers (base64+gzip OR json OR object)
========================= */
async function decodeMaybe(raw: any): Promise<any | null> {
  if (!raw) return null;

  // already object
  if (typeof raw === "object") return raw;

  if (typeof raw !== "string") return null;

  const s = raw.trim();
  if (!s) return null;

  // 1) raw JSON direct
  if (s.startsWith("{") || s.startsWith("[")) {
    try {
      return JSON.parse(s);
    } catch {
      // continue
    }
  }

  // 2) try base64 (maybe gzip, maybe json string)
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
        // not gzipped or fail -> continue
      }
    }

    // base64 but not gzip => maybe JSON in decoded text
    try {
      return JSON.parse(bin);
    } catch {
      // continue
    }
  } catch {
    // not base64
  }

  // 3) last chance: parse string as JSON anyway
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/* =========================
   helpers payload structure
========================= */
function pickPlayers(payload: any): any[] {
  if (!payload || typeof payload !== "object") return [];
  const p1 = Array.isArray(payload.players) ? payload.players : [];
  const p2 = Array.isArray(payload.result?.players) ? payload.result.players : [];
  const p3 = Array.isArray(payload.summary?.players) ? payload.summary.players : [];
  return p1.length ? p1 : p2.length ? p2 : p3.length ? p3 : [];
}

function getPid(p: any): string {
  if (!p) return "";
  return String(
    p.profileId ||
      p.id ||
      p.playerId ||
      p.player_id ||
      p.uuid ||
      p.uid ||
      ""
  );
}

function getPname(p: any): string | undefined {
  if (!p) return undefined;
  return p.name || p.displayName || p.username || p.nickname || undefined;
}

function looksLikeCricketRow(m: any): boolean {
  const k = String(m?.kind || "").toLowerCase();
  const mode =
    String(m?.mode || "").toLowerCase() ||
    String(m?.game?.mode || "").toLowerCase() ||
    String(m?.summary?.mode || "").toLowerCase();

  if (k === "cricket") return true;
  if (mode.includes("cricket")) return true;
  return false;
}

function looksLikeCricketPayload(payload: any, fallbackRow?: any): boolean {
  if (!payload || typeof payload !== "object") return false;

  const pkind = String(payload?.kind || payload?.game?.kind || "").toLowerCase();
  const pmode = String(
    payload?.config?.mode ||
      payload?.game?.mode ||
      payload?.mode ||
      payload?.summary?.mode ||
      ""
  ).toLowerCase();

  if (pkind === "cricket") return true;
  if (pmode.includes("cricket")) return true;

  // si la row "light" dit cricket, on tolère
  if (String(fallbackRow?.kind || "").toLowerCase() === "cricket") return true;

  return false;
}

function isFinishedRow(m: any): boolean {
  const s = String(m?.status || "").toLowerCase();
  if (s === "finished") return true;
  // fallback legacy
  if (s === "done" || s === "completed") return true;
  // si pas de status, on considère que c'est fini (historique ancien)
  if (!s) return true;
  return false;
}

/* =========================
   load finished rows (robuste)
========================= */
async function loadFinishedRows(): Promise<SavedMatch[]> {
  // ⚠️ selon ton history.ts, listFinished peut exister OU PAS.
  const anyH: any = History as any;

  try {
    if (typeof anyH.listFinished === "function") {
      return (await anyH.listFinished()) as SavedMatch[];
    }
  } catch {
    // ignore -> fallback
  }

  // fallback standard : list() + filtre
  try {
    const all = (await anyH.list()) as SavedMatch[];
    return (all || []).filter(isFinishedRow);
  } catch {
    return [];
  }
}

/* =========================
   hook principal
========================= */
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
        const allFinished: SavedMatch[] = await loadFinishedRows();

        // ✅ détecte cricket "light"
        const cricketRows = (allFinished || []).filter((m: any) =>
          looksLikeCricketRow(m)
        );

        const legsByProfile: Record<
          string,
          { name?: string; legs: CricketLegStats[] }
        > = {};

        for (const row of cricketRows) {
          if (cancelled) break;

          // charge full payload (decompress côté History.get si besoin)
          const full = await (History as any).get?.((row as any).id);
          const rawPayload =
            (full as any)?.payload ??
            (row as any)?.payload ??
            (full as any) ??
            null;

          const payload = await decodeMaybe(rawPayload);
          if (!payload || typeof payload !== "object") continue;

          // ✅ re-check : payload doit vraiment être cricket
          if (!looksLikeCricketPayload(payload, row)) continue;

          const players = pickPlayers(payload);
          if (!players.length) continue;

          for (const p of players) {
            const pid = getPid(p);
            if (!pid) continue;

            const hits =
              Array.isArray(p.hits)
                ? p.hits
                : Array.isArray(p.throws)
                  ? p.throws
                  : Array.isArray(p.darts)
                    ? p.darts
                    : [];

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
      // ✅ si profileId manquant => prend le premier dispo
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
