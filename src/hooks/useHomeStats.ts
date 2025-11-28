// ============================================================
// src/hooks/useHomeStats.ts
// Agrégateur complet des stats pour la Home v2
// - Local X01 (History)
// - X01 Multi (History)
// - Online (Supabase)
// - Cricket (statsBridge)
// - Training X01 (lib/TrainingX01Store)
// - Tour de l’Horloge (TODO: TrainingStore)
// - Records globaux (fusion local + online + training)
// ============================================================

import { useEffect, useState } from "react";
import { History } from "../lib/history";
import { supabase } from "../lib/supabase";
import { TrainingX01Store } from "../lib/TrainingX01Store";
import { getCricketProfileStats } from "../lib/statsBridge";

export type HomeStats = {
  global: any | null;
  multi: any | null;
  online: any | null;
  cricket: any | null;
  trainingX01: any | null;
  clock: any | null;
  records: any | null;
};

export function useHomeStats(activeProfileId: string | null) {
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<HomeStats | null>(null);

  useEffect(() => {
    if (!activeProfileId) {
      setStats(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);

      try {
        // ---------------------------------
        // LOCAL X01 (legs / matchs classiques)
        // ---------------------------------
        const localMatches = await History.list({
          profileId: activeProfileId,
          game: "x01",
        });

        // ---------------------------------
        // X01 MULTI (tous joueurs, mode multi)
        // ---------------------------------
        const localMulti = await History.list({
          game: "x01_multi",
          includePlayers: true,
        });

        // ---------------------------------
        // TRAINING X01 (store localStorage existant)
        // ---------------------------------
        const allTraining = TrainingX01Store.getAll();
        const trainingX01 = allTraining.filter(
          (s) => s.profileId === activeProfileId
        );

        // ---------------------------------
        // TOUR DE L’HORLOGE
        // TODO : à brancher sur ton vrai TrainingStore
        // Pour l’instant : aucune session => null
        // ---------------------------------
        const clockSessions: any[] = []; // placeholder

        // ---------------------------------
        // CRICKET (agrégateur déjà existant)
        // ---------------------------------
        const cricket = await getCricketProfileStats(activeProfileId);

        // ---------------------------------
        // ONLINE (via Supabase)
        // NOTE : à adapter si ton schéma diffère
        // ---------------------------------
        let onlineMatches: any[] = [];
        try {
          const { data, error } = await supabase
            .from("online_matches")
            .select("*")
            .eq("profileId", activeProfileId);

          if (!error && Array.isArray(data)) {
            onlineMatches = data;
          } else if (error) {
            // on log mais on ne casse pas la Home
            console.warn("[useHomeStats] supabase online_matches error:", error);
          }
        } catch (e) {
          console.warn("[useHomeStats] supabase call failed:", e);
        }

        // ---------------------------------
        // RECORDS (fusion global local + online + training)
        // ---------------------------------
        const records = computeRecords({
          localMatches,
          onlineMatches,
          trainingX01,
        });

        const nextStats: HomeStats = {
          global: computeGlobal(localMatches),
          multi: computeX01Multi(localMulti),
          online: computeOnline(onlineMatches),
          cricket,
          trainingX01: computeTrainingX01(trainingX01),
          clock: computeClock(clockSessions),
          records,
        };

        if (!cancelled) {
          setStats(nextStats);
        }
      } catch (e) {
        console.warn("[useHomeStats] error:", e);
        if (!cancelled) {
          setStats({
            global: null,
            multi: null,
            online: null,
            cricket: null,
            trainingX01: null,
            clock: null,
            records: null,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProfileId]);

  return { loading, stats };
}

// ============================================================
// --------------- CALCULATEURS SIMPLIFIÉS ---------------------
// ============================================================

function computeGlobal(matches: any[] | null | undefined) {
  if (!matches || !matches.length) return null;

  const darts = matches.flatMap((m) => m.darts || []);
  if (!darts.length) {
    return {
      matches: matches.length,
      avg3: 0,
      last10: [],
    };
  }

  const sum = darts.reduce((a: number, b: number) => a + (b || 0), 0);
  const avg1 = sum / darts.length;
  const avg3 = avg1 * 3;

  return {
    matches: matches.length,
    avg3: Math.round(avg3),
    last10: matches.slice(-10).map((m) => m.avg3 || 0),
  };
}

function computeX01Multi(matches: any[] | null | undefined) {
  if (!matches || !matches.length) return null;

  const avg =
    matches.reduce((a: number, m: any) => a + (m.avg3 || 0), 0) /
    matches.length;

  return {
    count: matches.length,
    avg: Math.round(avg),
  };
}

function computeOnline(matches: any[] | null | undefined) {
  if (!matches || !matches.length) return null;

  const avg =
    matches.reduce((a: number, m: any) => a + (m.avg3 || 0), 0) /
    matches.length;

  return {
    count: matches.length,
    avg: Math.round(avg),
  };
}

function computeTrainingX01(sessions: any[] | null | undefined) {
  if (!sessions || !sessions.length) return null;

  const avg =
    sessions.reduce((a: number, s: any) => a + (s.avg3D || 0), 0) /
    sessions.length;

  return {
    count: sessions.length,
    avg: Math.round(avg),
  };
}

function computeClock(sessions: any[] | null | undefined) {
  if (!sessions || !sessions.length) return null;

  const hitRate =
    sessions.reduce((a: number, s: any) => a + (s.hitRate || 0), 0) /
    sessions.length;

  return {
    count: sessions.length,
    hitRate: Math.round(hitRate * 10) / 10,
  };
}

function computeRecords({
  localMatches,
  onlineMatches,
  trainingX01,
}: {
  localMatches: any[];
  onlineMatches: any[];
  trainingX01: any[];
}) {
  const all: any[] = [
    ...(localMatches || []),
    ...(onlineMatches || []),
    ...(trainingX01 || []),
  ];

  if (!all.length) return null;

  const bestAvg3 = Math.max(
    ...all.map((s) => Number(s.avg3 ?? s.avg3D ?? 0))
  );

  const bestVisit = Math.max(...all.map((s) => Number(s.bestVisit ?? 0)));

  const dartsCandidates = all
    .map((m) => Number(m.totalDarts501 ?? m.darts ?? m.dartsCount ?? 0))
    .filter((n) => n > 0);

  const minDarts501 =
    dartsCandidates.length > 0 ? Math.min(...dartsCandidates) : null;

  return {
    bestAvg3,
    bestVisit,
    minDarts501,
  };
}
