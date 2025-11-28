// ============================================================
// src/hooks/useHomeStats.ts
// Agrégateur complet des stats Home
// - Local X01
// - X01 Multi
// - Online (Supabase)
// - Cricket
// - Training X01
// - Tour de l’Horloge
// - Records globaux
// ============================================================

import { useEffect, useState } from "react";
import { History } from "../lib/history";
import { supabase } from "../lib/supabase";
import { TrainingX01Store } from "../training/TrainingX01Store";
import { TrainingClockStore } from "../training/TrainingClockStore";
import { getCricketProfileStats } from "../lib/statsBridge";

export function useHomeStats(activeProfileId: string | null) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!activeProfileId) return;

    (async () => {
      setLoading(true);

      // LOCAL X01
      const localMatches = await History.list({
        profileId: activeProfileId,
        game: "x01",
      });

      // X01 MULTI
      const localMulti = await History.list({
        game: "x01_multi",
        includePlayers: true,
      });

      // TRAINING X01
      const trainingX01 = TrainingX01Store.getSessions(activeProfileId);

      // CLOCK
      const clock = TrainingClockStore.getSessions(activeProfileId);

      // CRICKET
      const cricket = await getCricketProfileStats(activeProfileId);

      // ONLINE
      const { data: onlineMatches } = await supabase
        .from("online_matches")
        .select("*")
        .eq("profileId", activeProfileId);

      // RECORDS (fusion totale)
      const records = computeRecords({
        localMatches,
        onlineMatches,
        trainingX01,
      });

      setStats({
        global: computeGlobal(localMatches),
        multi: computeX01Multi(localMulti),
        online: computeOnline(onlineMatches),
        cricket,
        trainingX01: computeTrainingX01(trainingX01),
        clock: computeClock(clock),
        records,
      });

      setLoading(false);
    })();
  }, [activeProfileId]);

  return { loading, stats };
}

// ============================================================
// --------------- CALCULATEURS SIMPLIFIÉS ---------------------
// ============================================================

function computeGlobal(matches) {
  if (!matches?.length) return null;
  const darts = matches.flatMap((m) => m.darts || []);
  const avg3 = (darts.reduce((a, b) => a + b, 0) / darts.length) * 3;
  return {
    matches: matches.length,
    avg3: Math.round(avg3),
    last10: matches.slice(-10).map(m => m.avg3 || 0),
  };
}

function computeX01Multi(matches) {
  if (!matches?.length) return null;
  const avg = Math.round(
    matches.reduce((a, m) => a + (m.avg3 || 0), 0) / matches.length
  );
  return { count: matches.length, avg };
}

function computeOnline(matches) {
  if (!matches?.length) return null;
  const avg = Math.round(
    matches.reduce((a, m) => a + (m.avg3 || 0), 0) / matches.length
  );
  return { count: matches.length, avg };
}

function computeTrainingX01(sessions) {
  if (!sessions?.length) return null;
  const avg = Math.round(
    sessions.reduce((a, s) => a + (s.avg3D || 0), 0) / sessions.length
  );
  return { count: sessions.length, avg };
}

function computeClock(sessions) {
  if (!sessions?.length) return null;
  const hitRate =
    Math.round(
      (sessions.reduce((a, s) => a + (s.hitRate || 0), 0) /
        sessions.length) *
        10
    ) / 10;

  return { count: sessions.length, hitRate };
}

function computeRecords({ localMatches, onlineMatches, trainingX01 }) {
  const all = [
    ...localMatches,
    ...(onlineMatches || []),
    ...trainingX01,
  ];

  if (!all.length) return null;

  return {
    bestAvg3: Math.max(...all.map((s) => s.avg3 || s.avg3D || 0)),
    bestVisit: Math.max(...all.map((s) => s.bestVisit || 0)),
    minDarts501: Math.min(
      ...all.map((m) => (m.totalDarts500 || m.dartsCount || 999))
    ),
  };
}
