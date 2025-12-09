// @ts-nocheck
// =============================================================
// src/pages/StatsX01Compare.tsx
// Comparateur X01 (LOCAL / ONLINE / TRAINING X01)
// - Page complète ou embed (compact)
// - Données : History + TrainingX01 localStorage
// - Tableau comparatif + sparkline + camembert
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { History } from "../lib/history";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ----------------- Types -----------------

type ModeKey = "x01_local" | "x01_online" | "training_x01";
type PeriodKey = "D" | "W" | "M" | "Y" | "ALL" | "ARV";

type X01Sample = {
  createdAt: number;
  mode: ModeKey;
  profileId: string;
  avg3?: number;
  bestVisit?: number;
  bestCheckout?: number;
  dartsThrown?: number;
  legsWon?: number;
  legsLost?: number;
  matchesPlayed?: number;
  matchesWon?: number;
};

type AggregatedStats = {
  count: number;
  avg3: number | null;
  bestVisit: number | null;
  bestCheckout: number | null;
  darts: number;
  legsPlayed: number;
  legsWon: number;
  legsLost: number;
  matchesPlayed: number;
  matchesWon: number;
};

type Props = {
  store: Store;
  go?: (tab: any, params?: any) => void;
  profileId?: string | null;
  compact?: boolean;
};

// ---------- Training X01 (localStorage) ----------

const TRAINING_X01_STATS_KEY = "dc_training_x01_stats_v1";

type TrainingX01SessionLite = {
  id: string;
  date: number;
  profileId: string;
  darts: number;
  avg3D: number;
  bestVisit: number;
  bestCheckout: number | null;
};

function loadTrainingSessionsForProfile(
  profileId: string | null
): TrainingX01SessionLite[] {
  if (typeof window === "undefined" || !profileId) return [];
  try {
    const raw = window.localStorage.getItem(TRAINING_X01_STATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((row: any, idx: number) => ({
        id: row.id ?? String(idx),
        date: Number(row.date) || Date.now(),
        profileId: String(row.profileId ?? "unknown"),
        darts: Number(row.darts) || 0,
        avg3D: Number(row.avg3D) || 0,
        bestVisit: Number(row.bestVisit) || 0,
        bestCheckout:
          row.bestCheckout === null || row.bestCheckout === undefined
            ? null
            : Number(row.bestCheckout) || 0,
      }))
      .filter((s) => s.profileId === profileId);
  } catch (e) {
    console.warn("[StatsX01Compare] loadTrainingSessions failed", e);
    return [];
  }
}

// ----------------- Helpers génériques -----------------

const N = (x: any, d = 0) =>
  Number.isFinite(Number(x)) ? Number(x) : d;

// ----------------- Helpers période -----------------

function getPeriodRange(
  key: PeriodKey
): { from?: number; to?: number; archivesOnly?: boolean } {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const today = todayStart.getTime();

  switch (key) {
    case "D":
      return { from: today, to: now };
    case "W":
      return { from: today - 7 * oneDay, to: now };
    case "M":
      return { from: today - 30 * oneDay, to: now };
    case "Y":
      return { from: today - 365 * oneDay, to: now };
    case "ALL":
      return { from: undefined, to: undefined };
    case "ARV":
      return { from: undefined, to: today - 365 * oneDay, archivesOnly: true };
    default:
      return { from: undefined, to: undefined };
  }
}

// ----------------- Aggregation globale -----------------

function aggregateSamples(samples: X01Sample[]): AggregatedStats {
  if (!samples.length) {
    return {
      count: 0,
      avg3: null,
      bestVisit: null,
      bestCheckout: null,
      darts: 0,
      legsPlayed: 0,
      legsWon: 0,
      legsLost: 0,
      matchesPlayed: 0,
      matchesWon: 0,
    };
  }

  let sumAvg3 = 0;
  let countAvg3 = 0;
  let bestVisit: number | null = null;
  let bestCheckout: number | null = null;

  let darts = 0;
  let legsWon = 0;
  let legsLost = 0;
  let matchesPlayed = 0;
  let matchesWon = 0;

  for (const s of samples) {
    if (typeof s.avg3 === "number") {
      sumAvg3 += s.avg3;
      countAvg3++;
    }
    if (typeof s.bestVisit === "number") {
      bestVisit =
        bestVisit == null ? s.bestVisit : Math.max(bestVisit, s.bestVisit);
    }
    if (typeof s.bestCheckout === "number") {
      bestCheckout =
        bestCheckout == null
          ? s.bestCheckout
          : Math.max(bestCheckout, s.bestCheckout);
    }

    if (typeof s.dartsThrown === "number") darts += s.dartsThrown;
    if (typeof s.legsWon === "number") legsWon += s.legsWon;
    if (typeof s.legsLost === "number") legsLost += s.legsLost;
    if (typeof s.matchesPlayed === "number") matchesPlayed += s.matchesPlayed;
    if (typeof s.matchesWon === "number") matchesWon += s.matchesWon;
  }

  const legsPlayed = legsWon + legsLost;

  return {
    count: samples.length,
    avg3: countAvg3 ? sumAvg3 / countAvg3 : null,
    bestVisit,
    bestCheckout,
    darts,
    legsPlayed,
    legsWon,
    legsLost,
    matchesPlayed,
    matchesWon,
  };
}

// ----------------- Formatters -----------------

function fmtNum(v: number | null | undefined, decimals = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(decimals);
}

function fmtInt(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return String(v);
}

function fmtPct(
  num: number | null | undefined,
  den: number | null | undefined,
  decimals = 1
): string {
  if (num == null || den == null || !den) return "—";
  return `${((num / den) * 100).toFixed(decimals)} %`;
}

// ----------------- Sparkline / camembert -----------------

type FilteredBuckets = {
  local: X01Sample[];
  online: X01Sample[];
  training: X01Sample[];
};

type SparkPoint = {
  key: string;
  label: string;
  local?: number;
  online?: number;
  training?: number;
};

function buildSparkData(filtered: FilteredBuckets): SparkPoint[] {
  const dayMapLocal: Record<string, { sum: number; count: number }> = {};
  const dayMapOnline: Record<string, { sum: number; count: number }> = {};
  const dayMapTraining: Record<string, { sum: number; count: number }> = {};

  const pushSample = (
    s: X01Sample,
    map: Record<string, { sum: number; count: number }>
  ) => {
    if (typeof s.avg3 !== "number") return;
    const d = new Date(s.createdAt);
    const key = d.toISOString().slice(0, 10);
    if (!map[key]) map[key] = { sum: 0, count: 0 };
    map[key].sum += s.avg3;
    map[key].count += 1;
  };

  filtered.local.forEach((s) => pushSample(s, dayMapLocal));
  filtered.online.forEach((s) => pushSample(s, dayMapOnline));
  filtered.training.forEach((s) => pushSample(s, dayMapTraining));

  const allKeys = Array.from(
    new Set([
      ...Object.keys(dayMapLocal),
      ...Object.keys(dayMapOnline),
      ...Object.keys(dayMapTraining),
    ])
  ).sort();

  return allKeys.map((key) => {
    const [year, month, day] = key.split("-");
    const label = `${day}/${month}`;
    const lp = dayMapLocal[key];
    const op = dayMapOnline[key];
    const tp = dayMapTraining[key];

    return {
      key,
      label,
      local: lp ? lp.sum / lp.count : undefined,
      online: op ? op.sum / op.count : undefined,
      training: tp ? tp.sum / tp.count : undefined,
    };
  });
}

// ----------------- Tableau -----------------

type TableRow =
  | { kind: "section"; label: string }
  | {
      kind: "stat";
      label: string;
      training: string;
      local: string;
      online: string;
    };

// ----------------- Composant principal -----------------

const StatsX01Compare: React.FC<Props> = ({ store, profileId, compact }) => {
  const { theme } = useTheme();
  useLang();

  const [period, setPeriod] = useState<PeriodKey>("M");
  const [samples, setSamples] = useState<X01Sample[] | null>(null);

  const profiles: Profile[] = store.profiles || [];
  const activeFromStore =
    profiles.find((p) => p.id === store.activeProfileId) || profiles[0] || null;

  const targetProfile: Profile | null =
    (profileId && profiles.find((p) => p.id === profileId)) || activeFromStore;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!targetProfile) {
        setSamples([]);
        return;
      }

      try {
        let allMatches: any[] = [];

        if (History && typeof (History as any).getAllMatches === "function") {
          allMatches = await (History as any).getAllMatches();
        } else if (History && typeof (History as any).list === "function") {
          allMatches = await (History as any).list();
        }
        // @ts-ignore
        else if (typeof window !== "undefined" && window.History?.list) {
          // @ts-ignore
          allMatches = await window.History.list();
        }

        const result: X01Sample[] = [];
        const pid = targetProfile.id;

        for (const m of allMatches) {
          const createdAt: number =
            m.createdAt ||
            m.updatedAt ||
            m.summary?.createdAt ||
            m.summary?.endedAt ||
            Date.now();

          const kind = m.kind || m.summary?.kind;
          const gameType =
            m.game ||
            m.gameType ||
            m.mode ||
            m.variant ||
            m.summary?.gameType ||
            m.summary?.mode;

          const isTrainingX01 =
            kind === "training_x01" ||
            gameType === "training_x01" ||
            gameType === "training-x01";

          const isX01 =
            !isTrainingX01 &&
            (gameType === "x01" ||
              gameType === "x01v3" ||
              kind === "x01" ||
              m.mode === "x01" ||
              m.variant === "x01v3");

          if (!isX01 && !isTrainingX01) continue;

          const isOnline =
            m.summary?.online === true ||
            m.meta?.online === true ||
            m.mode === "x01_online" ||
            m.game === "x01_online";

          let mode: ModeKey | null = null;
          if (isTrainingX01) mode = "training_x01";
          else if (isX01 && isOnline) mode = "x01_online";
          else if (isX01 && !isOnline) mode = "x01_local";

          if (!mode) continue;

          const ss: any = m.summary ?? m.payload?.summary ?? {};

          const perArray: any[] = Array.isArray(ss.perPlayer)
            ? ss.perPlayer
            : Array.isArray(ss.players)
            ? ss.players
            : [];

          const keyCandidates = [
            pid,
            (targetProfile as any).profileId,
            targetProfile.name,
            (targetProfile as any).uuid,
            (targetProfile as any)._id,
          ]
            .filter(Boolean)
            .map((x) => String(x));

          let statsForTarget: any = null;

          if (perArray.length) {
            statsForTarget =
              perArray.find((x) =>
                keyCandidates.includes(String(x.playerId ?? x.id ?? x.profileId))
              ) || null;
          }

          if (!statsForTarget) {
            const perMap =
              ss.perPlayer || ss.players || ss.detailedByPlayer || {};
            for (const k of keyCandidates) {
              if (perMap[k]) {
                statsForTarget = perMap[k];
                break;
              }
            }
          }

          if (!statsForTarget) continue;

          const avg3 =
            N(statsForTarget.avg3) ||
            N(statsForTarget.avg_3) ||
            N(statsForTarget.avg3Darts) ||
            N(statsForTarget.average3);

          const bestVisit =
            N(statsForTarget.bestVisit) ||
            N(statsForTarget.bestVisitScore) ||
            N(statsForTarget.bestThreeDarts) ||
            N(statsForTarget.best_visit);

          const bestCheckout =
            N(statsForTarget.bestCheckout) ||
            N(statsForTarget.bestFinish) ||
            N(statsForTarget.bestCo) ||
            N(statsForTarget.checkout);

          const darts =
            N(statsForTarget.darts) ||
            N(statsForTarget.dartsThrown) ||
            N(statsForTarget.totalDarts);

          const legsWon =
            N(
              statsForTarget.legsWon ??
                statsForTarget.legsW ??
                statsForTarget.legs_won
            ) || 0;
          const legsLost =
            N(
              statsForTarget.legsLost ??
                statsForTarget.legsL ??
                statsForTarget.legs_lost
            ) || 0;

          const isWinner =
            statsForTarget.isWinner === true ||
            statsForTarget.winner === true ||
            (m.winnerId && String(m.winnerId) === String(pid));

          const sample: X01Sample = {
            createdAt,
            mode,
            profileId: pid,
            avg3: avg3 || undefined,
            bestVisit: bestVisit || undefined,
            bestCheckout: bestCheckout || undefined,
            dartsThrown: darts || undefined,
            legsWon,
            legsLost,
            matchesPlayed: 1,
            matchesWon: isWinner ? 1 : 0,
          };

          result.push(sample);
        }

        const trainingSessions = loadTrainingSessionsForProfile(pid);
        for (const s of trainingSessions) {
          result.push({
            createdAt: s.date,
            mode: "training_x01",
            profileId: pid,
            avg3: s.avg3D || undefined,
            bestVisit: s.bestVisit || undefined,
            bestCheckout: s.bestCheckout ?? undefined,
            dartsThrown: s.darts || undefined,
            legsWon: undefined,
            legsLost: undefined,
            matchesPlayed: 1,
            matchesWon: 0,
          });
        }

        if (!cancelled) {
          setSamples(result);
        }
      } catch (err) {
        console.error("StatsX01Compare — error loading history", err);
        if (!cancelled) {
          setSamples([]);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [targetProfile?.id]);

  const { from, to, archivesOnly } = useMemo(
    () => getPeriodRange(period),
    [period]
  );

  const filtered: FilteredBuckets = useMemo(() => {
    if (!samples || !samples.length) {
      return { local: [], online: [], training: [] };
    }

    const inRange = (s: X01Sample) => {
      if (archivesOnly) {
        if (typeof to === "number" && s.createdAt >= to) return false;
        return true;
      }
      if (typeof from === "number" && s.createdAt < from) return false;
      if (typeof to === "number" && s.createdAt > to) return false;
      return true;
    };

    return {
      local: samples.filter((s) => s.mode === "x01_local" && inRange(s)),
      online: samples.filter((s) => s.mode === "x01_online" && inRange(s)),
      training: samples.filter((s) => s.mode === "training_x01" && inRange(s)),
    };
  }, [samples, from, to, archivesOnly]);

  const aggLocal = useMemo(() => aggregateSamples(filtered.local), [filtered.local]);
  const aggOnline = useMemo(() => aggregateSamples(filtered.online), [filtered.online]);
  const aggTraining = useMemo(
    () => aggregateSamples(filtered.training),
    [filtered.training]
  );

  const sparkData: SparkPoint[] = useMemo(
    () => buildSparkData(filtered),
    [filtered]
  );

  const pieData = useMemo(() => {
    const t = aggTraining.matchesPlayed || aggTraining.count || 0;
    const l = aggLocal.matchesPlayed || aggLocal.count || 0;
    const o = aggOnline.matchesPlayed || aggOnline.count || 0;
    const total = t + l + o;
    if (!total) return [];
    return [
      { name: "Training", value: t, color: "#82ffb5" },
      { name: "Local", value: l, color: "#ffd86f" },
      { name: "Online", value: o, color: "#63e1ff" },
    ];
  }, [aggTraining, aggLocal, aggOnline]);

  const bg = theme.background || "#050712";
  const primary = theme.primary || "#ffd86f";

  const trainingColor = "#82ffb5";
  const localColor = "#ffd86f";
  const onlineColor = "#63e1ff";

  const outerStyle: React.CSSProperties = compact
    ? {
        width: "100%",
        padding: 8,
        borderRadius: 16,
        background:
          "radial-gradient(circle at 0 0, rgba(255,216,111,0.06), transparent 55%), rgba(0,0,0,0.9)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }
    : {
        minHeight: "100%",
        padding: 16,
        background:
          "radial-gradient(circle at 0 0, rgba(255,216,111,0.08), transparent 55%), " +
          bg,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      };

  if (!targetProfile) {
    return (
      <div style={outerStyle}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: 1.4,
            textTransform: "uppercase",
          }}
        >
          Comparateur X01
        </div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>Aucun profil actif trouvé.</div>
      </div>
    );
  }

  // ---------- LIGNES DU TABLEAU ----------

  const ratio = (s: AggregatedStats) =>
    s.legsPlayed ? s.legsWon / s.legsPlayed : null;

  const avg1D = (s: AggregatedStats) =>
    s.avg3 != null ? s.avg3 / 3 : null;

  const winPct = (s: AggregatedStats) =>
    s.matchesPlayed ? s.matchesWon / s.matchesPlayed : null;

  const rowsRecords: TableRow[] = [
    { kind: "section", label: "RECORDS" },
    {
      kind: "stat",
      label: "Sessions / Matchs",
      training: fmtInt(aggTraining.matchesPlayed || aggTraining.count),
      local: fmtInt(aggLocal.matchesPlayed || aggLocal.count),
      online: fmtInt(aggOnline.matchesPlayed || aggOnline.count),
    },
    {
      kind: "stat",
      label: "Victoires",
      training: fmtInt(aggTraining.matchesWon),
      local: fmtInt(aggLocal.matchesWon),
      online: fmtInt(aggOnline.matchesWon),
    },
    {
      kind: "stat",
      label: "Win %",
      training: fmtPct(aggTraining.matchesWon, aggTraining.matchesPlayed || aggTraining.count),
      local: fmtPct(aggLocal.matchesWon, aggLocal.matchesPlayed || aggLocal.count),
      online: fmtPct(aggOnline.matchesWon, aggOnline.matchesPlayed || aggOnline.count),
    },
    {
      kind: "stat",
      label: "AVG 3 darts",
      training: fmtNum(aggTraining.avg3, 1),
      local: fmtNum(aggLocal.avg3, 1),
      online: fmtNum(aggOnline.avg3, 1),
    },
    {
      kind: "stat",
      label: "AVG 1 dart",
      training: fmtNum(avg1D(aggTraining), 2),
      local: fmtNum(avg1D(aggLocal), 2),
      online: fmtNum(avg1D(aggOnline), 2),
    },
    {
      kind: "stat",
      label: "Ratio legs W / legs",
      training: fmtPct(aggTraining.legsWon, aggTraining.legsPlayed, 1),
      local: fmtPct(aggLocal.legsWon, aggLocal.legsPlayed, 1),
      online: fmtPct(aggOnline.legsWon, aggOnline.legsPlayed, 1),
    },
    {
      kind: "stat",
      label: "Best visit",
      training: fmtNum(aggTraining.bestVisit, 0),
      local: fmtNum(aggLocal.bestVisit, 0),
      online: fmtNum(aggOnline.bestVisit, 0),
    },
    {
      kind: "stat",
      label: "Best 9 darts",
      training: "—",
      local: "—",
      online: "—",
    },
    {
      kind: "stat",
      label: "Best checkout",
      training: fmtNum(aggTraining.bestCheckout, 0),
      local: fmtNum(aggLocal.bestCheckout, 0),
      online: fmtNum(aggOnline.bestCheckout, 0),
    },
    {
      kind: "stat",
      label: "Best CO %",
      training: "—",
      local: "—",
      online: "—",
    },
  ];

  const rowsHits: TableRow[] = [
    { kind: "section", label: "HITS / PRÉCISION" },
    {
      kind: "stat",
      label: "Total darts",
      training: fmtInt(aggTraining.darts),
      local: fmtInt(aggLocal.darts),
      online: fmtInt(aggOnline.darts),
    },
    { kind: "stat", label: "Hits totaux", training: "—", local: "—", online: "—" },
    { kind: "stat", label: "%Hits", training: "—", local: "—", online: "—" },
    { kind: "stat", label: "60+", training: "—", local: "—", online: "—" },
    { kind: "stat", label: "80+", training: "—", local: "—", online: "—" },
    { kind: "stat", label: "100+", training: "—", local: "—", online: "—" },
    { kind: "stat", label: "120+", training: "—", local: "—", online: "—" },
    { kind: "stat", label: "140+", training: "—", local: "—", online: "—" },
    { kind: "stat", label: "180", training: "—", local: "—", online: "—" },
    { kind: "stat", label: "Miss", training: "—", local: "—", online: "—" },
    { kind: "stat", label: "%Miss", training: "—", local: "—", online: "—" },
    {
      kind: "stat",
      label: "Simple / %Simple",
      training: "—",
      local: "—",
      online: "—",
    },
    {
      kind: "stat",
      label: "Double / %Double",
      training: "—",
      local: "—",
      online: "—",
    },
    {
      kind: "stat",
      label: "Triple / %Triple",
      training: "—",
      local: "—",
      online: "—",
    },
    {
      kind: "stat",
      label: "Bull (25) / %Bull",
      training: "—",
      local: "—",
      online: "—",
    },
    {
      kind: "stat",
      label: "DBull (50) / %DBull",
      training: "—",
      local: "—",
      online: "—",
    },
    {
      kind: "stat",
      label: "Bust / %Bust",
      training: "—",
      local: "—",
      online: "—",
    },
    {
      kind: "stat",
      label: "CO tentés",
      training: "—",
      local: "—",
      online: "—",
    },
    {
      kind: "stat",
      label: "CO réussis (%CO)",
      training: "—",
      local: "—",
      online: "—",
    },
  ];

  const rowsMatch: TableRow[] = [
    { kind: "section", label: "MATCHS (TRAINING VIDE)" },
    {
      kind: "stat",
      label: "Matchs DUO",
      training: "—",
      local: "—",
      online: "—",
    },
    {
      kind: "stat",
      label: "Victoires DUO",
      training: "—",
      local: "—",
      online: "—",
    },
    {
      kind: "stat",
      label: "Win% DUO",
      training: "—",
      local: "—",
      online: "—",
    },
    {
      kind: "stat",
      label: "Matchs MULTI",
      training: "—",
      local: "—",
      online: "—",
    },
    {
      kind: "stat",
      label: "Victoires MULTI",
      training: "—",
      local: "—",
      online: "—",
    },
    {
      kind: "stat",
      label: "Podiums MULTI",
      training: "—",
      local: "—",
      online: "—",
    },
    {
      kind: "stat",
      label: "%Win MULTI",
      training: "—",
      local: "—",
      online: "—",
    },
    {
      kind: "stat",
      label: "FINISH total",
      training: "—",
      local: "—",
      online: "—",
    },
    {
      kind: "stat",
      label: "%FINISH (CO success)",
      training: "—",
      local: "—",
      online: "—",
    },
    {
      kind: "stat",
      label: "Matchs TEAM",
      training: "—",
      local: "—",
      online: "—",
    },
    {
      kind: "stat",
      label: "Victoires TEAM",
      training: "—",
      local: "—",
      online: "—",
    },
    {
      kind: "stat",
      label: "%Win TEAM",
      training: "—",
      local: "—",
      online: "—",
    },
  ];

  const renderRows = (rows: TableRow[]) =>
    rows.map((row, idx) => {
      if (row.kind === "section") {
        return (
          <div
            key={`sec-${row.label}-${idx}`}
            style={{
              padding: "6px 10px 4px",
              fontSize: 11,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              opacity: 0.85,
              borderTop: "1px solid rgba(255,255,255,0.12)",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.05), transparent)",
            }}
          >
            {row.label}
          </div>
        );
      }

      const isEven = idx % 2 === 0;

      return (
        <div
          key={`row-${row.label}-${idx}`}
          style={{
            padding: "4px 10px",
            display: "grid",
            gridTemplateColumns: "minmax(0,1.6fr) repeat(3, minmax(0,1fr))",
            columnGap: 8,
            fontSize: 11,
            alignItems: "center",
            background: isEven ? "rgba(255,255,255,0.02)" : "transparent",
          }}
        >
          <div style={{ opacity: 0.8 }}>{row.label}</div>
          <div
            style={{
              textAlign: "right",
              color: trainingColor,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {row.training}
          </div>
          <div
            style={{
              textAlign: "right",
              color: localColor,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {row.local}
          </div>
          <div
            style={{
              textAlign: "right",
              color: onlineColor,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {row.online}
          </div>
        </div>
      );
    });

  // ---------- RENDER ----------

  return (
    <div style={outerStyle}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            fontSize: compact ? 16 : 20,
            fontWeight: 800,
            letterSpacing: 1.4,
            textTransform: "uppercase",
          }}
        >
          Comparateur X01
        </div>
        {!compact && (
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            Profil : {targetProfile ? targetProfile.name : "—"}
          </div>
        )}
      </div>

      {/* Période */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: compact ? 0 : 4,
          marginTop: 4,
        }}
      >
        {(
          [
            ["D", "J"],
            ["W", "S"],
            ["M", "M"],
            ["Y", "A"],
            ["ALL", "ALL"],
            ["ARV", "ARV"],
          ] as [PeriodKey, string][]
        ).map(([key, label]) => {
          const isActive = period === key;
          return (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              style={{
                borderRadius: 999,
                padding: "5px 9px",
                fontSize: 11,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                border: "none",
                cursor: "pointer",
                background: isActive
                  ? `linear-gradient(135deg, ${primary}, ${primary}80)`
                  : "rgba(255,255,255,0.06)",
                color: isActive ? "#000" : "#fff",
                fontWeight: 600,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Carte principale */}
      <div
        style={{
          marginTop: compact ? 6 : 8,
          borderRadius: 18,
          background:
            "radial-gradient(circle at 0 0, rgba(255,255,255,0.06), transparent 55%), rgba(0,0,0,0.9)",
          border: "1px solid rgba(255,255,255,0.16)",
          boxShadow: "0 0 35px rgba(0,0,0,0.85)",
          padding: 10,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Header colonnes */}
        <div
          style={{
            padding: "6px 10px",
            display: "grid",
            gridTemplateColumns: "minmax(0,1.6fr) repeat(3, minmax(0,1fr))",
            columnGap: 8,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 1.3,
            fontWeight: 700,
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.14), rgba(0,0,0,0.9))",
          }}
        >
          <div style={{ opacity: 0.75 }}>Stat</div>
          <div style={{ textAlign: "right", color: trainingColor }}>Training</div>
          <div style={{ textAlign: "right", color: localColor }}>Local</div>
          <div style={{ textAlign: "right", color: onlineColor }}>Online</div>
        </div>

        {/* RECORDS */}
        <div
          style={{
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {renderRows(rowsRecords)}

          {/* Sparkline entre RECORDS et HITS */}
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.12)",
              padding: "8px 10px 10px",
              background: "rgba(0,0,0,0.85)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.1,
                opacity: 0.8,
                marginBottom: 4,
              }}
            >
              Évolution AVG 3 darts
            </div>
            <div style={{ width: "100%", height: 110 }}>
              <ResponsiveContainer>
                <LineChart
                  data={sparkData}
                  margin={{ left: -20, right: 4, top: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#ccc" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#ccc" }}
                    tickLine={false}
                    width={28}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#050712",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="training"
                    stroke={trainingColor}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                    name="Training"
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="local"
                    stroke={localColor}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                    name="Local"
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="online"
                    stroke={onlineColor}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                    name="Online"
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* HITS */}
          {renderRows(rowsHits)}

          {/* Camembert entre HITS et MATCHS */}
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.12)",
              padding: "8px 10px 6px",
              background: "rgba(0,0,0,0.9)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.1,
                opacity: 0.8,
                marginBottom: 4,
              }}
            >
              Répartition sessions / matchs par mode
            </div>
            <div style={{ width: "100%", height: 140 }}>
              {pieData.length ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={32}
                      outerRadius={55}
                      paddingAngle={2}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#050712",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                      formatter={(value: any, name: any) => [
                        `${value}`,
                        name,
                      ]}
                    />
                    <Legend
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                      iconSize={8}
                      wrapperStyle={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ fontSize: 11, opacity: 0.6 }}>
                  Pas encore assez de données pour ce graphique.
                </div>
              )}
            </div>
          </div>

          {/* MATCHS */}
          {renderRows(rowsMatch)}
        </div>
      </div>
    </div>
  );
};

export default StatsX01Compare;
