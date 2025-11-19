// ============================================
// src/pages/StatsHub.tsx — Stats + Historique + Training (v2 complet)
// ============================================
import React from "react";
import { History } from "../lib/history";
import { loadStore } from "../lib/storage";
import StatsPlayerDashboard, {
  type PlayerDashboardStats,
  GoldPill,
  ProfilePill,
} from "../components/StatsPlayerDashboard";
import { useQuickStats } from "../hooks/useQuickStats";
import HistoryPage from "./HistoryPage";
import SparklinePro from "../components/SparklinePro";
import TrainingRadar from "../components/TrainingRadar";
import type { Dart as UIDart } from "../lib/types";
import type { TrainingX01Session } from "../lib/TrainingStore";

/* ---------- Thème ---------- */
const T = {
  gold: "#F6C256",
  text: "#FFFFFF",
  text70: "rgba(255,255,255,.70)",
  edge: "rgba(255,255,255,.10)",
  card: "linear-gradient(180deg,rgba(17,18,20,.94),rgba(13,14,17,.92))",
};

const goldNeon = {
  fontSize: 14,
  fontWeight: 900,
  textTransform: "uppercase",
  color: "#F6C256",
  textShadow: "0 0 8px rgba(246,194,86,.9), 0 0 16px rgba(246,194,86,.45)",
  letterSpacing: 0.8,
};

/* ---------- Types ---------- */
type PlayerLite = {
  id: string;
  name?: string;
  avatarDataUrl?: string | null;
};

type SavedMatch = {
  id: string;
  kind?: "x01" | "cricket" | string;
  status?: "in_progress" | "finished";
  players?: PlayerLite[];
  winnerId?: string | null;
  createdAt?: number;
  updatedAt?: number;
  summary?: any;
  payload?: any;
};

type Props = {
  go?: (tab: string, params?: any) => void;
  tab?: "history" | "stats" | "training";
  memHistory?: SavedMatch[];
};

/* ---------- Helpers génériques ---------- */
const toArr = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);
const toObj = <T,>(v: any): T => (v && typeof v === "object" ? v : ({} as T));
const N = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
const fmtDate = (ts?: number) =>
  new Date(N(ts, Date.now())).toLocaleString();

/* ========== TRAINING X01 : SESSIONS LOCALSTORAGE ========== */

type TimeRange = "all" | "day" | "week" | "month" | "year";

export type TrainingX01Session = {
  id: string;
  date: number;
  profileId: string;
  darts: number;
  avg3D: number;
  avg1D: number;
  bestVisit: number;
  bestCheckout: number | null;
  hitsS: number;
  hitsD: number;
  hitsT: number;
  miss: number;
  bull: number;
  dBull: number;
  bust: number;
  bySegment?: Record<string, number>;
  dartsDetail?: UIDart[];
};

const TRAINING_X01_STATS_KEY = "dc_training_x01_stats_v1";

const SEGMENTS: number[] = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
  3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 25, // +25 ajouté
];

/* ---------- Charge sessions ---------- */
function loadTrainingSessions(): TrainingX01Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TRAINING_X01_STATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((row: any, idx: number) => {
      const darts = Number(row.darts) || 0;
      const avg3D = Number(row.avg3D) || 0;

      const avg1DExplicit =
        row.avg1D !== undefined && row.avg1D !== null
          ? Number(row.avg1D) || 0
          : null;
      const avg1D =
        avg1DExplicit !== null
          ? avg1DExplicit
          : darts > 0
          ? avg3D / 3
          : 0;

      const bestCheckoutRaw =
        row.bestCheckout !== undefined && row.bestCheckout !== null
          ? row.bestCheckout
          : row.checkout;
      const bestCheckout =
        bestCheckoutRaw === null || bestCheckoutRaw === undefined
          ? null
          : Number(bestCheckoutRaw) || 0;

      const bySegmentRaw =
        row.bySegment && typeof row.bySegment === "object"
          ? (row.bySegment as Record<string, any>)
          : undefined;

      const bySegmentSRaw =
        row.bySegmentS && typeof row.bySegmentS === "object"
          ? (row.bySegmentS as Record<string, any>)
          : undefined;

      const bySegmentDRaw =
        row.bySegmentD && typeof row.bySegmentD === "object"
          ? (row.bySegmentD as Record<string, any>)
          : undefined;

      const bySegmentTRaw =
        row.bySegmentT && typeof row.bySegmentT === "object"
          ? (row.bySegmentT as Record<string, any>)
          : undefined;

      // --------------------------------------------------
      // Reconstruit dartsDetail si manquant
      // --------------------------------------------------
      let dartsDetail: UIDart[] | undefined = undefined;

      if (Array.isArray(row.dartsDetail)) {
        // Nouveau format déjà avec détail
        dartsDetail = row.dartsDetail;
      } else if (bySegmentSRaw || bySegmentDRaw || bySegmentTRaw) {
        // ✅ Format TrainingX01Play actuel : S/D/T séparés
        const tmp: UIDart[] = [];
        const keys = new Set<string>([
          ...Object.keys(bySegmentSRaw || {}),
          ...Object.keys(bySegmentDRaw || {}),
          ...Object.keys(bySegmentTRaw || {}),
        ]);

        const cap = (n: number) =>
          Math.min(200, Math.max(0, Math.round(n)));

        for (const segStr of keys) {
          const seg = Number(segStr);
          if (!Number.isFinite(seg) || seg <= 0) continue;

          const sCount = cap(Number(bySegmentSRaw?.[segStr] || 0));
          const dCount = cap(Number(bySegmentDRaw?.[segStr] || 0));
          const tCount = cap(Number(bySegmentTRaw?.[segStr] || 0));

          for (let i = 0; i < sCount; i++) {
            tmp.push({ v: seg, mult: 1 } as UIDart);
          }
          for (let i = 0; i < dCount; i++) {
            tmp.push({ v: seg, mult: 2 } as UIDart);
          }
          for (let i = 0; i < tCount; i++) {
            tmp.push({ v: seg, mult: 3 } as UIDart);
          }
        }

        dartsDetail = tmp;
      } else if (bySegmentRaw) {
        // ⚠️ Ancien format : tout mélangé, ou éventuellement objet {S,D,T}
        const tmp: UIDart[] = [];

        const cap = (n: number) =>
          Math.min(200, Math.max(0, Math.round(n)));

        for (const [segStr, entry] of Object.entries(bySegmentRaw)) {
          const seg = Number(segStr);
          if (!Number.isFinite(seg) || seg <= 0) continue;

          let sCount = 0,
            dCount = 0,
            tCount = 0;

          if (typeof entry === "number") {
            // Vieux de vieux : tout en simple
            sCount = cap(entry);
          } else if (entry && typeof entry === "object") {
            sCount = cap(Number((entry as any).S || 0));
            dCount = cap(Number((entry as any).D || 0));
            tCount = cap(Number((entry as any).T || 0));
          }

          for (let i = 0; i < sCount; i++) {
            tmp.push({ v: seg, mult: 1 } as UIDart);
          }
          for (let i = 0; i < dCount; i++) {
            tmp.push({ v: seg, mult: 2 } as UIDart);
          }
          for (let i = 0; i < tCount; i++) {
            tmp.push({ v: seg, mult: 3 } as UIDart);
          }
        }

        dartsDetail = tmp;
      }

      return {
        id: row.id ?? String(idx),
        date: Number(row.date) || Date.now(),
        profileId: String(row.profileId ?? "unknown"),
        darts,
        avg3D,
        avg1D,
        bestVisit: Number(row.bestVisit) || 0,
        bestCheckout,
        hitsS: Number(row.hitsS) || 0,
        hitsD: Number(row.hitsD) || 0,
        hitsT: Number(row.hitsT) || 0,
        miss: Number(row.miss) || 0,
        bull: Number(row.bull) || 0,
        dBull: Number(row.dBull) || 0,
        bust: Number(row.bust) || 0,
        bySegment: bySegmentRaw,
        bySegmentS: bySegmentSRaw,
        bySegmentD: bySegmentDRaw,
        bySegmentT: bySegmentTRaw,
        dartsDetail,
      } as TrainingX01Session;
    });
  } catch (e) {
    console.warn("[StatsHub] loadTrainingSessions failed", e);
    return [];
  }
}

function filterByRange(sessions: TrainingX01Session[], range: TimeRange) {
  if (range === "all") return sessions;
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const delta =
    range === "day"
      ? ONE_DAY
      : range === "week"
      ? 7 * ONE_DAY
      : range === "month"
      ? 30 * ONE_DAY
      : 365 * ONE_DAY;
  const minDate = now - delta;
  return sessions.filter((s) => s.date >= minDate);
}

function formatShortDate(ts: number) {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function safePercent(num: number, den: number) {
  if (!den) return 0;
  return (num / den) * 100;
}

/* ---------- Normalise les joueurs ---------- */
function normalizeRecordPlayers(
  rec: SavedMatch,
  storeProfiles: PlayerLite[]
): SavedMatch {
  const pick = (Array.isArray(rec.players) && rec.players!.length
    ? rec.players!
    : toArr<PlayerLite>(rec.payload?.players)) as PlayerLite[];

  const withAvatars = pick.map((p) => {
    const prof = storeProfiles.find((sp) => sp.id === p?.id);
    return {
      id: p?.id,
      name: p?.name ?? prof?.name ?? "",
      avatarDataUrl: p?.avatarDataUrl ?? prof?.avatarDataUrl ?? null,
    };
  });

  return {
    ...rec,
    players: withAvatars,
    payload: { ...(rec.payload ?? {}), players: withAvatars },
  };
}

/* ---------- Hooks Historique ---------- */
function useHistoryAPI(): SavedMatch[] {
  const [rows, setRows] = React.useState<SavedMatch[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        const list = await History.list();
        setRows(toArr<SavedMatch>(list));
      } catch {
        setRows([]);
      }
    })();

    const onUpd = () => {
      (async () => {
        try {
          const list = await History.list();
          setRows(toArr<SavedMatch>(list));
        } catch {
          setRows([]);
        }
      })();
    };

    window.addEventListener("dc-history-updated", onUpd);
    return () =>
      window.removeEventListener("dc-history-updated", onUpd);
  }, []);

  return rows;
}

function useStoreHistory(): SavedMatch[] {
  const [rows, setRows] = React.useState<SavedMatch[]>([]);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const store: any = await loadStore<any>();
        if (!mounted) return;
        setRows(toArr<SavedMatch>(store?.history));
      } catch {
        setRows([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return rows;
}

/* ---------- Adaptateur → PlayerDashboardStats ---------- */
function buildDashboardForPlayer(
  player: PlayerLite,
  records: SavedMatch[],
  quick?
):
  | {
      avg3: number;
      bestVisit: number;
      bestCheckout?: number;
      winRatePct: number;
      buckets: Record<string, number>;
    }
  | null
{
  const pid = player.id;

  let fbAvg3 = 0,
    fbBestVisit = 0,
    fbBestCO = 0,
    fbWins = 0,
    fbMatches = 0;

  const fbBuckets = {
    "0-59": 0,
    "60-99": 0,
    "100+": 0,
    "140+": 0,
    "180": 0,
  };

  const evo: Array<{ date: string; avg3: number }> = [];
  const byDate: Array<{ t: number; a3: number }> = [];

  const toArrLoc = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);
  const Nloc = (x: any) => (Number.isFinite(Number(x)) ? Number(x) : 0);

  for (const r of records) {
    const inMatch = toArrLoc<PlayerLite>(r.players).some(
      (p) => p?.id === pid
    );
    if (!inMatch) continue;

    fbMatches++;

    const ss: any = r.summary ?? r.payload?.summary ?? {};
    const per: any[] =
      ss.perPlayer ?? ss.players ?? r.payload?.summary?.perPlayer ?? [];

    const pstat =
      per.find((x) => x?.playerId === pid) ??
      (ss[pid] || ss.players?.[pid] || ss.perPlayer?.[pid]) ??
      {};

    const a3 =
      Nloc(pstat.avg3) ||
      Nloc(pstat.avg_3) ||
      Nloc(pstat.avg3Darts) ||
      Nloc(pstat.average3);

    const bestV = Nloc(pstat.bestVisit);
    const bestCO = Nloc(pstat.bestCheckout);

    if (a3 > 0) {
      byDate.push({
        t: Nloc(r.updatedAt ?? r.createdAt),
        a3,
      });
    }

    fbAvg3 += a3;
    fbBestVisit = Math.max(fbBestVisit, bestV);
    fbBestCO = Math.max(fbBestCO, bestCO);
    if (r.winnerId === pid) fbWins++;

    const buckets =
      ss.buckets?.[pid] ?? pstat.buckets ?? null;

    if (buckets) {
      fbBuckets["0-59"] += Nloc(buckets["0-59"]);
      fbBuckets["60-99"] += Nloc(buckets["60-99"]);
      fbBuckets["100+"] += Nloc(buckets["100+"]);
      fbBuckets["140+"] += Nloc(buckets["140+"]);
      fbBuckets["180"] += Nloc(buckets["180"]);
    }
  }

  byDate.sort((a, b) => a.t - b.t);
  for (const it of byDate.slice(-20)) {
    evo.push({
      date: new Date(it.t).toLocaleDateString(),
      avg3: it.a3,
    });
  }

  const fbAvg3Mean = fbMatches > 0 ? fbAvg3 / fbMatches : 0;
  const fbWinPct =
    fbMatches > 0 ? Math.round((fbWins / fbMatches) * 1000) / 10 : 0;

  return {
    playerId: pid,
    playerName: player.name || "Joueur",
    avg3Overall: quick?.avg3 ?? fbAvg3Mean,
    bestVisit: quick?.bestVisit ?? fbBestVisit,
    bestCheckout: quick?.bestCheckout ?? fbBestCO,
    winRatePct: Number.isFinite(quick?.winRatePct ?? null)
      ? quick!.winRatePct
      : fbWinPct,
    distribution: quick?.buckets ?? fbBuckets,
    evolution: evo.length
      ? evo
      : [
          {
            date: new Date().toLocaleDateString(),
            avg3: quick?.avg3 ?? fbAvg3Mean,
          },
        ],
  };
}

/* ---------- Styles cartes/verre ---------- */
const card: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.edge}`,
  borderRadius: 20,
  padding: 16,
  boxShadow: "0 10px 26px rgba(0,0,0,.35)",
  backdropFilter: "blur(10px)",
};

const row: React.CSSProperties = {
  ...card,
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: 8,
};

/* ============================================================
   ONGLET TRAINING X01 — v2 complet
   ============================================================ */
   function TrainingX01StatsTab() {
    const [sessions, setSessions] = React.useState<TrainingX01Session[]>([]);
    const [range, setRange] = React.useState<TimeRange>("all");
    const [selected, setSelected] = React.useState<TrainingX01Session | null>(null);
  
    // Ordre de défilement des métriques de la sparkline
    const metricKeys: Array<
      "darts" | "avg3D" | "pctS" | "pctD" | "pctT" | "BV" | "CO"
    > = ["darts", "avg3D", "pctS", "pctD", "pctT", "BV", "CO"];
  
    const [metric, setMetric] = React.useState<
      "darts" | "avg3D" | "pctS" | "pctD" | "pctT" | "BV" | "CO"
    >("avg3D");
  
    // true = l’utilisateur a cliqué, on met l’auto défilement en pause
    const [metricLocked, setMetricLocked] = React.useState(false);
  
    const [page, setPage] = React.useState(1);
  
    React.useEffect(() => {
      setSessions(loadTrainingSessions());
    }, []);

    // Auto-défilement des métriques de la sparkline (toutes les 4s)
  React.useEffect(() => {
    if (!sessions.length) return; // rien à afficher
    if (metricLocked) return;     // l'utilisateur a cliqué, on laisse tranquille

    const id = window.setInterval(() => {
      setMetric((prev) => {
        const idx = metricKeys.indexOf(prev);
        const nextIdx =
          idx === -1 ? 0 : (idx + 1) % metricKeys.length;
        return metricKeys[nextIdx];
      });
    }, 4000);

    return () => window.clearInterval(id);
  }, [sessions.length, metricLocked]);

  // Quand l'utilisateur clique sur une métrique, on bloque l'auto-défilement 15s
  React.useEffect(() => {
    if (!metricLocked) return;
    const id = window.setTimeout(() => {
      setMetricLocked(false);
    }, 15000); // 15 secondes de « pause utilisateur »

    return () => window.clearTimeout(id);
  }, [metricLocked]);
  
    /* ---------- Sessions filtrées ---------- */
    const filtered = React.useMemo(
      () =>
        filterByRange(sessions, range).sort((a, b) => a.date - b.date),
      [sessions, range]
    );
  
    const totalSessions = filtered.length;
    const totalDarts = filtered.reduce((s, x) => s + x.darts, 0);
    const avgDarts = totalSessions > 0 ? totalDarts / totalSessions : 0;
  
    const bestVisit =
      totalSessions > 0
        ? Math.max(...filtered.map((x) => x.bestVisit))
        : 0;
  
    const bestCheckout =
      totalSessions > 0
        ? Math.max(...filtered.map((x) => x.bestCheckout || 0))
        : 0;
  
    const globalAvg3D =
      totalSessions > 0
        ? filtered.reduce((s, x) => s + x.avg3D, 0) / totalSessions
        : 0;
  
    const globalAvg1D =
      totalSessions > 0
        ? filtered.reduce((s, x) => s + x.avg1D, 0) / totalSessions
        : 0;
  
    /* ============================================================
       AGRÉGATION FLÉCHETTES GLOBALES (période)
       ============================================================ */
       let gHitsS = 0,
       gHitsD = 0,
       gHitsT = 0,
       gMiss = 0,
       gBull = 0,
       gDBull = 0,
       gBust = 0;
 
     // Min / Max par session
     let minDarts: number | null = null,
       maxDarts: number | null = null,
       minHits: number | null = null,
       maxHits: number | null = null,
       minS: number | null = null,
       maxS: number | null = null,
       minD: number | null = null,
       maxD: number | null = null,
       minT: number | null = null,
       maxT: number | null = null,
       minMiss: number | null = null,
       maxMiss: number | null = null,
       minBull: number | null = null,
       maxBull: number | null = null,
       minDBull: number | null = null,
       maxDBull: number | null = null,
       minBust: number | null = null,
       maxBust: number | null = null;
 
     for (const s of filtered) {
       const darts = s.darts || 0;
       const sS = s.hitsS ?? 0;
       const sD = s.hitsD ?? 0;
       const sT = s.hitsT ?? 0;
       const sMiss = s.miss ?? 0;
       const sBull = s.bull ?? 0;
       const sDBull = s.dBull ?? 0;
       const sBust = s.bust ?? 0;
       const sHits = sS + sD + sT;
 
       const hasCounters =
         sS + sD + sT + sMiss + sBull + sDBull + sBust > 0;
 
       if (hasCounters) {
         // Totaux globaux
         gHitsS += sS;
         gHitsD += sD;
         gHitsT += sT;
         gMiss += sMiss;
         gBull += sBull;
         gDBull += sDBull;
         gBust += sBust;
 
         if (darts > 0) {
           // Darts
           if (minDarts === null || darts < minDarts) minDarts = darts;
           if (maxDarts === null || darts > maxDarts) maxDarts = darts;
 
           // Hits
           if (minHits === null || sHits < minHits) minHits = sHits;
           if (maxHits === null || sHits > maxHits) maxHits = sHits;
 
           // S / D / T
           if (minS === null || sS < minS) minS = sS;
           if (maxS === null || sS > maxS) maxS = sS;
 
           if (minD === null || sD < minD) minD = sD;
           if (maxD === null || sD > maxD) maxD = sD;
 
           if (minT === null || sT < minT) minT = sT;
           if (maxT === null || sT > maxT) maxT = sT;
 
           // Miss / Bull / DBull / Bust
           if (minMiss === null || sMiss < minMiss) minMiss = sMiss;
           if (maxMiss === null || sMiss > maxMiss) maxMiss = sMiss;
 
           if (minBull === null || sBull < minBull) minBull = sBull;
           if (maxBull === null || sBull > maxBull) maxBull = sBull;
 
           if (minDBull === null || sDBull < minDBull) minDBull = sDBull;
           if (maxDBull === null || sDBull > maxDBull) maxDBull = sDBull;
 
           if (minBust === null || sBust < minBust) minBust = sBust;
           if (maxBust === null || sBust > maxBust) maxBust = sBust;
         }
 
         continue;
       }
 
       /* ---------- Fallback depuis dartsDetail (vieux enregistrements) ---------- */
       if (Array.isArray(s.dartsDetail)) {
         for (const d of s.dartsDetail) {
           const v = Number((d as any)?.v) || 0;
           const mult = Number((d as any)?.mult) || 0;
 
           if (v === 0 || mult === 0) {
             gMiss++;
             continue;
           }
 
           if (v === 25 && mult === 2) gDBull++;
           else if (v === 25) gBull++;
 
           if (mult === 1) gHitsS++;
           else if (mult === 2) gHitsD++;
           else if (mult === 3) gHitsT++;
         }
       }
     }
 
     const totalHits = gHitsS + gHitsD + gHitsT;
     const totalThrows = totalHits + gMiss;
 
     const hitsPercent = totalThrows > 0 ? (totalHits / totalThrows) * 100 : 0;
     const simplePercent = totalHits > 0 ? (gHitsS / totalHits) * 100 : 0;
     const doublePercent = totalHits > 0 ? (gHitsD / totalHits) * 100 : 0;
     const triplePercent = totalHits > 0 ? (gHitsT / totalHits) * 100 : 0;
 
  
    /* ---------- Dérivés session ---------- */
    const avgHitsSPerSession =
      totalSessions > 0 ? gHitsS / totalSessions : 0;
    const avgHitsDPerSession =
      totalSessions > 0 ? gHitsD / totalSessions : 0;
    const avgHitsTPerSession =
      totalSessions > 0 ? gHitsT / totalSessions : 0;
    const avgMissPerSession =
      totalSessions > 0 ? gMiss / totalSessions : 0;
    const avgBustPerSession =
      totalSessions > 0 ? gBust / totalSessions : 0;
    const avgBullPerSession =
      totalSessions > 0 ? gBull / totalSessions : 0;
    const avgDBullPerSession =
      totalSessions > 0 ? gDBull / totalSessions : 0;
    const bestAvg3DSession =
      totalSessions > 0 ? Math.max(...filtered.map((x) => x.avg3D || 0)) : 0;  
  
    const pctHitsGlobal = totalThrows > 0 ? hitsPercent : null;
    const pctMissGlobal =
      totalThrows > 0 ? (gMiss / totalThrows) * 100 : null;
    const pctSimpleGlobal =
      totalHits > 0 ? (gHitsS / totalHits) * 100 : null;
    const pctDoubleGlobal =
      totalHits > 0 ? (gHitsD / totalHits) * 100 : null;
    const pctTripleGlobal =
      totalHits > 0 ? (gHitsT / totalHits) * 100 : null;
  
    const totalBullHits = gBull + gDBull;
    // %Bull et %DBull calculés sur le total de darts
    const pctBullGlobal =
      totalDarts > 0 ? (gBull / totalDarts) * 100 : null;

    const pctDBullGlobal =
      totalDarts > 0 ? (gDBull / totalDarts) * 100 : null;
    const pctBustGlobal =
      totalThrows > 0 ? (gBust / totalThrows) * 100 : null;
  
    /* ---------- Normalisation d’une fléchette ---------- */
    function normalizeTrainingDart(raw: any): UIDart | null {
      if (!raw) return null;

      const rawV =
        (raw as any).v ??
        (raw as any).value ??
        (raw as any).segment ??
        (raw as any).s;

      const rawMult =
        (raw as any).mult ??
        (raw as any).m ??
        (raw as any).multiplier ??
        (raw as any).type;

      const vNum = Number(rawV) || 0;

      let mNum: number;
      if (rawMult === "S") mNum = 1;
      else if (rawMult === "D") mNum = 2;
      else if (rawMult === "T") mNum = 3;
      else mNum = Number(rawMult) || 0;

      if (!Number.isFinite(vNum)) return null;
      if (!Number.isFinite(mNum)) mNum = 0;

      return { v: vNum, mult: mNum as 0 | 1 | 2 | 3 };
    }

    /* ---------- Détails fléchettes pour graph + radar ---------- */
    const trainingDartsAll: UIDart[] = React.useMemo(() => {
      const out: UIDart[] = [];
    
      for (const s of filtered) {
        // 1) Cas idéal : on a le détail fléchette par fléchette
        if (Array.isArray(s.dartsDetail) && s.dartsDetail.length) {
          for (const raw of s.dartsDetail) {
            const nd = normalizeTrainingDart(raw);
            if (nd) out.push(nd);
          }
          continue;
        }
    
        // 2) Fallback : on reconstruit depuis bySegment (sessions plus anciennes)
        if (s.bySegment && typeof s.bySegment === "object") {
          for (const [segStr, entry] of Object.entries(s.bySegment)) {
            const seg = Number(segStr);
            if (!Number.isFinite(seg) || seg <= 0) continue;
    
            // entry peut être : nombre, ou {S,D,T}
            let S = 0, D = 0, T = 0;
    
            if (typeof entry === "number") {
              // vieux format = tout en simple
              S = Math.max(0, Math.round(entry));
            } else if (typeof entry === "object") {
              S = Number((entry as any).S) || 0;
              D = Number((entry as any).D) || 0;
              T = Number((entry as any).T) || 0;
            }
    
            // Simple
            for (let i = 0; i < S; i++) {
              out.push({ v: seg, mult: 1 });
            }
            // Double
            for (let i = 0; i < D; i++) {
              out.push({ v: seg, mult: 2 });
            }
            // Triple
            for (let i = 0; i < T; i++) {
              out.push({ v: seg, mult: 3 });
            }
          }
        }
      }

      return out;
    }, [filtered]);
  
    /* ============================================================
       HIT PRÉFÉRÉ (GLOBAL)
       ============================================================ */
       const segmentCount: Record<string, number> = {};
       for (const d of trainingDartsAll) {
      const v = Number((d as any)?.v) || 0;
      if (v <= 0) continue;
      const key = v === 25 ? "25" : String(v);
      segmentCount[key] = (segmentCount[key] || 0) + 1;
    }
  
    let favoriteSegmentKey: string | null = null;
    let favoriteSegmentCount = 0;
  
    for (const [k, c] of Object.entries(segmentCount)) {
      if (c > favoriteSegmentCount) {
        favoriteSegmentCount = c;
        favoriteSegmentKey = k;
      }
    }
  
    let favoriteHitDisplay: string | null = null;
    if (favoriteSegmentKey !== null) {
      favoriteHitDisplay =
        favoriteSegmentKey === "25"
          ? "25 (Bull)"
          : `${favoriteSegmentKey}`;
    }
  
   /* ============================================================
   STACK S/D/T PAR SEGMENT + MISS
   ============================================================ */
// S/D/T par valeur, construits à partir de trainingDartsAll (hits uniquement)
const segSDTMap: Record<string, { S: number; D: number; T: number }> = {};

// Miss = compteur global déjà calculé plus haut
let chartMissCount = gMiss;

for (const d of trainingDartsAll) {
  const v = Number((d as any)?.v) || 0;
  const mult = Number((d as any)?.mult) || 0;

  // On ignore les miss dans trainingDartsAll
  if (v === 0 || mult === 0) {
    continue;
  }

  const key = v === 25 ? "25" : String(v);
  if (!segSDTMap[key]) segSDTMap[key] = { S: 0, D: 0, T: 0 };

  if (mult === 1) segSDTMap[key].S++;
  else if (mult === 2) segSDTMap[key].D++;
  else if (mult === 3) segSDTMap[key].T++;
}

const HITS_SEGMENTS: (number | "MISS")[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  25,
  "MISS",
];

const maxStackHits = HITS_SEGMENTS.reduce(
  (max, seg) => {
    if (seg === "MISS") {
      return chartMissCount > max ? chartMissCount : max;
    }
    const data = segSDTMap[String(seg)];
    const tot = data ? data.S + data.D + data.T : 0;
    return tot > max ? tot : max;
  },
  0
);

    // Préférences par type de hit (S / D / T) + segment le moins touché
    let favSimpleKey: string | null = null;
    let favSimpleCount = 0;
    let favDoubleKey: string | null = null;
    let favDoubleCount = 0;
    let favTripleKey: string | null = null;
    let favTripleCount = 0;

    for (const [key, val] of Object.entries(segSDTMap)) {
      if (val.S > favSimpleCount) {
        favSimpleCount = val.S;
        favSimpleKey = key;
      }
      if (val.D > favDoubleCount) {
        favDoubleCount = val.D;
        favDoubleKey = key;
      }
      if (val.T > favTripleCount) {
        favTripleCount = val.T;
        favTripleKey = key;
      }
    }

    let leastHitKey: string | null = null;
    let leastHitCount = Infinity;

    for (const [key, count] of Object.entries(segmentCount)) {
      if (count > 0 && count < leastHitCount) {
        leastHitCount = count;
        leastHitKey = key;
      }
    }

    const labelForSegment = (k: string | null) =>
      k === null ? null : k === "25" ? "25 (Bull)" : k;

    const favoriteSimpleDisplay = labelForSegment(favSimpleKey);
    const favoriteDoubleDisplay = labelForSegment(favDoubleKey);
    const favoriteTripleDisplay = labelForSegment(favTripleKey);
    const leastHitDisplay = labelForSegment(leastHitKey);
  
    /* ============================================================
       Sparkline
       ============================================================ */
    function valueForMetric(
      s: TrainingX01Session,
      m: "darts" | "avg3D" | "pctS" | "pctD" | "pctT" | "BV" | "CO"
    ): number {
      switch (m) {
        case "darts":
          return s.darts;
        case "avg3D":
          return s.avg3D;
        case "pctS": {
          const t = s.hitsS + s.hitsD + s.hitsT;
          return t > 0 ? (s.hitsS / t) * 100 : 0;
        }
        case "pctD": {
          const t = s.hitsS + s.hitsD + s.hitsT;
          return t > 0 ? (s.hitsD / t) * 100 : 0;
        }
        case "pctT": {
          const t = s.hitsS + s.hitsD + s.hitsT;
          return t > 0 ? (s.hitsT / t) * 100 : 0;
        }
        case "BV":
          return s.bestVisit;
        case "CO":
          return s.bestCheckout || 0;
        default:
          return 0;
      }
    }
  
    const sparkSeries = filtered.map((s) => ({
      x: s.date,
      y: valueForMetric(s, metric),
      session: s,
    }));
  
    /* ============================================================
       KPI CARROUSELS (5 BLOCS)
       ============================================================ */
  
    type RawKpiItem =
      | {
          kind: "num";
          label: string;
          raw: number | null;
          format?: (v: number) => string;
          allowZero?: boolean;
        }
      | {
          kind: "text";
          label: string;
          text: string | null;
        };
  
    type KpiDisplayItem = { label: string; value: string };
  
    function finalizeKpiItems(items: RawKpiItem[]): KpiDisplayItem[] {
      const out: KpiDisplayItem[] = [];
  
      for (const it of items) {
        if (it.kind === "num") {
          if (it.raw === null || Number.isNaN(it.raw)) continue;
          if (!it.allowZero && it.raw === 0) continue;
          const fmt = it.format ?? ((v: number) => `${v}`);
          out.push({ label: it.label, value: fmt(it.raw) });
        } else {
          if (!it.text) continue;
          out.push({ label: it.label, value: it.text });
        }
      }
      return out;
    }
  
    /* ---------- Bloc 1 — Doré (Cumul) ---------- */
    const goldItems = finalizeKpiItems([
      { kind: "num", label: "Darts totaux", raw: totalDarts, allowZero: true },
      { kind: "num", label: "Sessions", raw: totalSessions, allowZero: true },
      { kind: "num", label: "Hits S cumulés", raw: gHitsS },
      { kind: "num", label: "Hits D cumulés", raw: gHitsD },
      { kind: "num", label: "Hits T cumulés", raw: gHitsT },
      { kind: "num", label: "Miss cumulés", raw: gMiss },
      { kind: "num", label: "Bull cumulés", raw: gBull },
      { kind: "num", label: "DBull cumulés", raw: gDBull },
      { kind: "num", label: "Bust cumulés", raw: gBust },
    ]);
  
    /* ---------- Bloc 2 — Rose (Moyennes) ---------- */
    const pinkItems = finalizeKpiItems([
      {
        kind: "num",
        label: "Moy.3D (période)",
        raw: totalSessions > 0 ? globalAvg3D : null,
        format: (v) => v.toFixed(1),
      },
      {
        kind: "num",
        label: "Moy.1D (période)",
        raw: totalSessions > 0 ? globalAvg1D : null,
        format: (v) => v.toFixed(2),
      },
      {
        kind: "num",
        label: "Darts / session",
        raw: totalSessions > 0 ? avgDarts : null,
        format: (v) => v.toFixed(1),
      },
      {
        kind: "num",
        label: "Hits S / session",
        raw: totalSessions > 0 ? avgHitsSPerSession : null,
        format: (v) => v.toFixed(1),
      },
      {
        kind: "num",
        label: "Hits D / session",
        raw: totalSessions > 0 ? avgHitsDPerSession : null,
        format: (v) => v.toFixed(1),
      },
      {
        kind: "num",
        label: "Hits T / session",
        raw: totalSessions > 0 ? avgHitsTPerSession : null,
        format: (v) => v.toFixed(1),
      },
      {
        kind: "num",
        label: "Miss / session",
        raw: totalSessions > 0 ? avgMissPerSession : null,
        format: (v) => v.toFixed(1),
      },
      {
        kind: "num",
        label: "Bust / session",
        raw: totalSessions > 0 ? avgBustPerSession : null,
        format: (v) => v.toFixed(1),
      },
      {
        kind: "num",
        label: "Bull / session",
        raw: totalSessions > 0 ? avgBullPerSession : null,
        format: (v) => v.toFixed(1),
      },
      {
        kind: "num",
        label: "DBull / session",
        raw: totalSessions > 0 ? avgDBullPerSession : null,
        format: (v) => v.toFixed(1),
      },
    ]);
  
    /* ---------- Bloc 3 — Bleu (Records + Hit préféré) ---------- */
    const blueItems = finalizeKpiItems([
      {
        kind: "text",
        label: "Hit préféré (global)",
        text: favoriteHitDisplay
          ? `${favoriteHitDisplay}`
          : null,
      },
      { kind: "num", label: "Best Visit (session)", raw: bestVisit },
      {
        kind: "num",
        label: "Best Checkout (session)",
        raw: bestCheckout > 0 ? bestCheckout : null,
      },
      {
        kind: "num",
        label: "Miss min / session",
        raw: minMiss,
        allowZero: true,
      },
      {
        kind: "num",
        label: "Miss max / session",
        raw: maxMiss,
      },
      {
        kind: "num",
        label: "Bust min / session",
        raw: minBust,
        allowZero: true,
      },
      {
        kind: "num",
        label: "Bust max / session",
        raw: maxBust,
      },
    ]);
  
    /* ---------- Bloc 4 — Vert clair (pourcentages généraux) ---------- */
    const green1Items = finalizeKpiItems([
      {
        kind: "num",
        label: "%Hits global",
        raw: pctHitsGlobal,
        format: (v) => `${v.toFixed(1)}%`,
      },
      {
        kind: "num",
        label: "%Miss",
        raw: pctMissGlobal,
        format: (v) => `${v.toFixed(1)}%`,
      },
      {
        kind: "num",
        label: "%S",
        raw: pctSimpleGlobal,
        format: (v) => `${v.toFixed(1)}%`,
      },
      {
        kind: "num",
        label: "%D",
        raw: pctDoubleGlobal,
        format: (v) => `${v.toFixed(1)}%`,
      },
      {
        kind: "num",
        label: "%T",
        raw: pctTripleGlobal,
        format: (v) => `${v.toFixed(1)}%`,
      },
      {
        kind: "num",
        label: "%Bull (Bull+DBull)",
        raw: pctBullGlobal,
        format: (v) => `${v.toFixed(1)}%`,
      },
      {
        kind: "num",
        label: "%DBull (Bull+DBull)",
        raw: pctDBullGlobal,
        format: (v) => `${v.toFixed(1)}%`,
      },
    ]);
  
    /* ---------- Bloc 5 — Vert clair (BV / CO + dérivés) ---------- */
    const green2Items = finalizeKpiItems([
      { kind: "num", label: "Best Visit", raw: bestVisit },
      {
        kind: "num",
        label: "Best Checkout",
        raw: bestCheckout > 0 ? bestCheckout : null,
      },
      {
        kind: "num",
        label: "Moy.3D (période)",
        raw: totalSessions > 0 ? globalAvg3D : null,
        format: (v) => v.toFixed(1),
      },
      {
        kind: "num",
        label: "%Hits global",
        raw: pctHitsGlobal,
        format: (v) => `${v.toFixed(1)}%`,
      },
      {
        kind: "num",
        label: "%T (global)",
        raw: pctTripleGlobal,
        format: (v) => `${v.toFixed(1)}%`,
      },
    ]);
  
    const hasAnyKpi =
      goldItems.length ||
      pinkItems.length ||
      blueItems.length ||
      green1Items.length ||
      green2Items.length;
  
    /* ---------- Animation du carrousel ---------- */
    const [ticker, setTicker] = React.useState(0);
    React.useEffect(() => {
      if (!hasAnyKpi) return;
      const id = window.setInterval(() => {
        setTicker((t) => t + 1);
      }, 4000);
      return () => window.clearInterval(id);
    }, [hasAnyKpi, filtered.length]);
  
    const currentGold =
      goldItems.length > 0
        ? goldItems[ticker % goldItems.length]
        : null;
    const currentPink =
      pinkItems.length > 0
        ? pinkItems[ticker % pinkItems.length]
        : null;
    const currentBlue =
      blueItems.length > 0
        ? blueItems[ticker % blueItems.length]
        : null;
    const currentGreen1 =
      green1Items.length > 0
        ? green1Items[ticker % green1Items.length]
        : null;
    const currentGreen2 =
      green2Items.length > 0
        ? green2Items[ticker % green2Items.length]
        : null;
  
    /* ---------- Styles KPI ---------- */
    const baseKpiBox: React.CSSProperties = {
      borderRadius: 22,
      padding: 10,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",      // ← centrage horizontal
      justifyContent: "center",  // ← centrage vertical
      textAlign: "center",       // ← centrage du texte
      gap: 4,
      background: "linear-gradient(180deg,#15171B,#101115)",
      minHeight: 78,
    };
  
    const makeKpiBox = (accent: string): React.CSSProperties => ({
      ...baseKpiBox,
      border: `1px solid ${accent}`,
      boxShadow: `0 0 0 1px ${accent}33, 0 0 14px ${accent}88, 0 0 28px ${accent}55`,
      background:
        "radial-gradient(circle at 0% 0%, " +
        accent +
        "26 0, transparent 55%), linear-gradient(180deg,#15171B,#101115)",
    });
  
    const kpiLabel: React.CSSProperties = {
      fontSize: 10,
      color: T.text70,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    };
  
    const kpiSub: React.CSSProperties = {
      fontSize: 11,
      color: T.text70,
    };
  
    const statRowBox: React.CSSProperties = {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13,
      padding: "6px 0",
      borderTop: `1px solid rgba(255,255,255,.06)`,
    };
  
    const metricPill: React.CSSProperties = {
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 11,
      border: "1px solid rgba(255,255,255,.18)",
      background: "rgba(0,0,0,.45)",
      cursor: "pointer",
    };
  
    /* ---------- Pagination sessions ---------- */
    React.useEffect(() => {
      setPage(1);
    }, [range, sessions.length]);
  
    const pageSize = 10;
    const totalPages =
      totalSessions > 0
        ? Math.max(1, Math.ceil(totalSessions / pageSize))
        : 1;
  
    const reversedSessions = filtered.slice().reverse();
  
    const pagedSessions = reversedSessions.slice(
      (page - 1) * pageSize,
      page * pageSize
    );

        /* ---------- Résumé période (profil joueur Training X01) ---------- */
        let summaryTitle = "Mots du Coach";
        const summaryLines: string[] = [];
    
        if (totalSessions === 0) {
          summaryLines.push("Aucune session sur la période sélectionnée.");
        } else {
          // 1) Scoring global (Moy.3D)
          if (globalAvg3D >= 70) {
            summaryLines.push(
              "Très gros scoring global, moyenne 3D élevée sur la période."
            );
          } else if (globalAvg3D >= 60) {
            summaryLines.push(
              "Scoring solide avec une moyenne 3D correcte et régulière."
            );
          } else if (globalAvg3D >= 50) {
            summaryLines.push(
              "Scoring en progression, objectif : stabiliser au-dessus de 60 de moyenne 3D."
            );
          } else {
            summaryLines.push(
              "Scoring encore irrégulier, l’objectif est de stabiliser les visites et les scores moyens."
            );
          }
    
          // 2) Profil S / D / T (agressivité)
          if (pctTripleGlobal !== null && pctTripleGlobal >= 20) {
            summaryLines.push(
              "Fort volume de triples, jeu très offensif sur les segments T."
            );
          } else if (pctTripleGlobal !== null && pctTripleGlobal >= 10) {
            summaryLines.push(
              "Les triples commencent à bien rentrer, volume intéressant sur les T."
            );
          } else {
            summaryLines.push(
              "Peu de triples sur la période, axe de travail possible sur les segments T."
            );
          }
    
          // 3) Sécurité : Miss
          if (pctMissGlobal !== null) {
            if (pctMissGlobal <= 20) {
              summaryLines.push(
                "Taux de miss maîtrisé, bonne sécurité générale au tir."
              );
            } else if (pctMissGlobal <= 35) {
              summaryLines.push(
                "Taux de miss moyen, encore perfectible pour gagner en régularité."
              );
            } else {
              summaryLines.push(
                "Taux de miss élevé, priorité à la régularité et au contrôle des lancers."
              );
            }
          }
    
          // 4) Busts : gestion des fins
          if (avgBustPerSession > 0) {
            if (avgBustPerSession <= 1) {
              summaryLines.push(
                "Les busts restent rares, gestion des fins de legs plutôt propre."
              );
            } else if (avgBustPerSession <= 3) {
              summaryLines.push(
                "Quelques busts par session, attention aux fins de legs et aux calculs de checkout."
              );
            } else {
              summaryLines.push(
                "Beaucoup de busts sur la période, le travail sur les fins de legs et les checkouts est prioritaire."
              );
            }
          }
    
          // 5) Zone centrale : Bull / DBull
          const totalBullHits = gBull + gDBull;
          if (totalBullHits > 0) {
            if (pctDBullGlobal !== null && pctDBullGlobal >= 40) {
              summaryLines.push(
                "Très bon ratio DBull dans la zone centrale, excellente précision au centre."
              );
            } else if (pctBullGlobal !== null) {
              summaryLines.push(
                "Zone Bull utilisée régulièrement, précision correcte dans l’axe central."
              );
            }
          }
        }    
  
    /* ============================================================
       RENDER
       ============================================================ */
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ============================================================
          FILTRES JOUR / SEMAINE / MOIS / ANNÉE / TOTAL
          ============================================================ */}
      {/* FILTRES J/S/M/A/ALL — TITRE CENTRÉ, BOUTONS SUR UNE LIGNE SÉPARÉE */}
<div style={{ ...card, padding: 14, textAlign: "center" }}>
  
  {/* Titre centré */}
  <div
  style={{
    ...goldNeon,
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
  }}
>
  TRAINING X01
</div>

  {/* Ligne unique de boutons */}
  <div
    style={{
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      gap: 6,
      flexWrap: "nowrap",        // ❗ force une seule ligne
      transform: "scale(0.92)",  // ❗ légèrement plus petit
      transformOrigin: "center",
    }}
  >
    {(["day", "week", "month", "year", "all"] as TimeRange[]).map(
      (r) => (
        <GoldPill
          key={r}
          active={range === r}
          onClick={() => setRange(r)}
          style={{
            padding: "4px 12px",
            fontSize: 11,
            minWidth: "unset",
            whiteSpace: "nowrap",
          }}
        >
          {r === "day" && "Jour"}
          {r === "week" && "Semaine"}
          {r === "month" && "Mois"}
          {r === "year" && "Année"}
          {r === "all" && "All"}
        </GoldPill>
      )
    )}
  </div>

</div>

{/* ZONE KPI — 5 BLOCS AVEC DÉFILEMENT AUTO (2 LIGNES) */}
{totalSessions > 0 && hasAnyKpi && (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}
  >
    {/* ---------- LIGNE 1 : CUMUL (BLEU) + MOYENNES (ROSE) ---------- */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
      }}
    >
      {/* 🔵 CUMUL */}
      <div style={makeKpiBox("#47B5FF")}>
        <div style={{ ...kpiLabel, color: "#47B5FF" }}>CUMUL</div>
        {currentGold ? (
          <>
            <div style={kpiSub}>{currentGold.label}</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#47B5FF",
              }}
            >
              {currentGold.value}
            </div>
          </>
        ) : (
          <div style={kpiSub}>Aucune donnée</div>
        )}
      </div>

      {/* 🌸 MOYENNES */}
      <div style={makeKpiBox("#FF6FB5")}>
        <div style={{ ...kpiLabel, color: "#FF6FB5" }}>MOYENNES</div>
        {currentPink ? (
          <>
            <div style={kpiSub}>{currentPink.label}</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#FFB8DE",
              }}
            >
              {currentPink.value}
            </div>
          </>
        ) : (
          <div style={kpiSub}>Aucune donnée</div>
        )}
      </div>
    </div>

    {/* ---------- LIGNE 2 : RECORDS (OR) + POURCENTAGES (VERT) + BV/CO (VERT) ---------- */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 10,
      }}
    >
      {/* 🟡 RECORDS */}
      <div style={makeKpiBox(T.gold)}>
        <div style={{ ...kpiLabel, color: T.gold }}>RECORDS</div>
        {currentBlue ? (
          <>
            <div style={kpiSub}>{currentBlue.label}</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: T.gold,
              }}
            >
              {currentBlue.value}
            </div>
          </>
        ) : (
          <div style={kpiSub}>Aucune donnée</div>
        )}
      </div>

      {/* 🟩 POURCENTAGES */}
      <div style={makeKpiBox("#7CFF9A")}>
        <div style={{ ...kpiLabel, color: "#7CFF9A" }}>POURCENTAGES</div>
        {currentGreen1 ? (
          <>
            <div style={kpiSub}>{currentGreen1.label}</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#E5FFEF",
              }}
            >
              {currentGreen1.value}
            </div>
          </>
        ) : (
          <div style={kpiSub}>Aucune donnée</div>
        )}
      </div>

      {/* 🟩 BV / CO */}
      <div style={makeKpiBox("#7CFF9A")}>
        <div style={{ ...kpiLabel, color: "#7CFF9A" }}>% / BV / CO</div>
        {currentGreen2 ? (
          <>
            <div style={kpiSub}>{currentGreen2.label}</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#E5FFEF",
              }}
            >
              {currentGreen2.value}
            </div>
          </>
        ) : (
          <div style={kpiSub}>Aucune donnée</div>
        )}
      </div>
    </div>
  </div>
)}

{/* ============================================================
    RÉSUMÉ DE LA PÉRIODE — Sessions
   ============================================================ */}
<div
  style={{
    borderRadius: 20,
    padding: "12px 14px",
    marginBottom: 3,     // marge réduite vers Stats détaillées
    marginTop: 15,       // marge augmentée vers les KPI
    background: "linear-gradient(180deg,#18181A,#0F0F11)",
    border: "1px solid rgba(255,255,255,.12)",
    boxShadow: "0 6px 18px rgba(0,0,0,.55)",
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: 13,
      fontWeight: 700,
      color: T.gold,
    }}
  >
    <span>Session</span>

    <span
      style={{
        fontWeight: 900,
        fontSize: 15,
        color: T.gold,
        textShadow:
          "0 0 6px rgba(246,194,86,.9), 0 0 14px rgba(246,194,86,.55)",
      }}
    >
      {totalSessions}
    </span>
  </div>
</div>

      {/* ============================================================
          STATS DÉTAILLÉES — style bronze/doré (NOUVELLE VERSION)
          ============================================================ */}
      <div
        style={{
          borderRadius: 26,
          padding: 16,
          background: "linear-gradient(180deg,#141416,#0E0F12)",
          border: "1px solid rgba(255,255,255,.14)",
          boxShadow: "0 12px 26px rgba(0,0,0,.65)",
        }}
      >
        <div
  style={{
    fontSize: 14,
    fontWeight: 900,
    textTransform: "uppercase",
    color: T.gold,
    textShadow:
      "0 0 8px rgba(246,194,86,.9), 0 0 16px rgba(246,194,86,.45)",
    letterSpacing: 0.8,
    marginBottom: 10,
    textAlign: "center",
  }}
>
  Stats détaillées (période)
</div>

        {totalSessions === 0 ? (
          <div style={{ fontSize: 12, color: T.text70, textAlign: "center" }}>
            Aucune session de training enregistrée sur la période sélectionnée.
          </div>
        ) : (
          <>
            {/* Helpers locaux */}
            {(() => {
              const fmtRange = (min: number | null, max: number | null) => {
                if (min === null && max === null) return "—";
                if (min === null) return `— / ${max}`;
                if (max === null) return `${min} / —`;
                if (min === max) return `${min}`;
                return `${min} / ${max}`;
              };

              const fmtPercent = (v: number | null) =>
                v === null ? "—" : `${v.toFixed(1)}%`;

                            /* =======================
                 1) TABLEAU PRINCIPAL
                 ======================= */
                 const rows = [
                  {
                    label: "Darts",
                    range: fmtRange(minDarts, maxDarts),
                    total: totalDarts,
                    pct: "", // ✅ colonne % vide pour Darts
                  },
                  {
                    label: "Hits",
                    range: fmtRange(minHits, maxHits),
                    total: totalHits,
                    pct: fmtPercent(totalThrows > 0 ? hitsPercent : null),
                  },
                  {
                    label: "Miss",
                    range: fmtRange(minMiss, maxMiss),
                    total: gMiss,
                    pct: fmtPercent(pctMissGlobal),
                  },
                  {
                    label: "S",
                    range: fmtRange(minS, maxS),
                    total: gHitsS,
                    pct: fmtPercent(pctSimpleGlobal),
                  },
                  {
                    label: "D",
                    range: fmtRange(minD, maxD),
                    total: gHitsD,
                    pct: fmtPercent(pctDoubleGlobal),
                  },
                  {
                    label: "T",
                    range: fmtRange(minT, maxT),
                    total: gHitsT,
                    pct: fmtPercent(pctTripleGlobal),
                  },
                  {
                    label: "Bull",
                    range: fmtRange(minBull, maxBull),
                    total: gBull,
                    pct: fmtPercent(pctBullGlobal),
                  },
                  {
                    label: "DBull",
                    range: fmtRange(minDBull, maxDBull),
                    total: gDBull,
                    pct: fmtPercent(pctDBullGlobal),
                  },
                  {
                    label: "Bust",
                    range: fmtRange(minBust, maxBust),
                    total: gBust,
                    pct: fmtPercent(pctBustGlobal),
                  },
                ];
  
                return (
                  <>
                    {/* En-têtes des colonnes */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.1fr 1.4fr 1.1fr 0.9fr",
                        fontSize: 11,
                        paddingBottom: 4,
                        borderBottom: "1px solid rgba(246,194,86,.45)",
                        marginBottom: 4,
                      }}
                    >
                      {/* Colonne label — sans texte "Intitulé" */}
                      <div />
  
                      {/* Colonne Session avec saut de ligne */}
                      <div
                        style={{
                          textAlign: "center",
                          color: T.text70,
                          display: "flex",
                          flexDirection: "column",
                          lineHeight: 1.1,
                        }}
                      >
                        <span>Session</span>
                        <span style={{ fontSize: 10 }}>min / max</span>
                      </div>
  
                      {/* Colonne Total */}
                      <div
                        style={{
                          textAlign: "center",
                          color: T.text70,
                        }}
                      >
                        Total
                      </div>
  
                      {/* Colonne % */}
                      <div
                        style={{
                          textAlign: "right",
                          color: T.text70,
                        }}
                      >
                        %
                      </div>
                    </div>
  
                    {/* Lignes */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      {rows.map((r) => (
                        <div
                          key={r.label}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1.1fr 1.4fr 1.1fr 0.9fr",
                            fontSize: 11,
                            padding: "4px 0",
                            borderBottom:
                              "1px solid rgba(246,194,86,.18)",
                          }}
                        >
                          <div style={{ color: T.text70 }}>{r.label}</div>
                          <div
                            style={{
                              textAlign: "center",
                              fontWeight: 600,
                            }}
                          >
                            {r.range}
                          </div>
                          <div
                            style={{
                              textAlign: "center",
                              fontWeight: 600,
                            }}
                          >
                            {r.total}
                          </div>
                          <div
                            style={{
                              textAlign: "right",
                              fontWeight: 600,
                            }}
                          >
                            {r.pct}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
            })()}

            {/* =======================
    2) MOYENNES — ROSE
   ======================= */}
<div
  style={{
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px solid rgba(246,194,86,.45)",
  }}
>
  <div
    style={{
      fontSize: 12,
      fontWeight: 800,
      color: "#FF6FB5", // ROSE
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 6,
      textAlign: "center",
    }}
  >
    Moyennes
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-around",
      textAlign: "center",
      gap: 8,
    }}
  >
    <div>
      <div style={{ fontSize: 11, color: T.text70, marginBottom: 2 }}>
        Moy.1D
      </div>
      <div
        style={{
          fontWeight: 900,
          fontSize: 17,
          color: "#FFB8DE",
          textShadow:
            "0 0 10px rgba(255,135,200,.8), 0 0 20px rgba(255,135,200,.4)",
        }}
      >
        {globalAvg1D.toFixed(2)}
      </div>
    </div>

    <div>
      <div style={{ fontSize: 11, color: T.text70, marginBottom: 2 }}>
        Moy.3D
      </div>
      <div
        style={{
          fontWeight: 900,
          fontSize: 17,
          color: "#FFB8DE",
          textShadow:
            "0 0 10px rgba(255,135,200,.8), 0 0 20px rgba(255,135,200,.4)",
        }}
      >
        {globalAvg3D.toFixed(1)}
      </div>
    </div>

    <div>
      <div style={{ fontSize: 11, color: T.text70, marginBottom: 2 }}>
        Best Moy./S
      </div>
      <div
        style={{
          fontWeight: 900,
          fontSize: 17,
          color: "#FFB8DE",
          textShadow:
            "0 0 10px rgba(255,135,200,.8), 0 0 20px rgba(255,135,200,.4)",
        }}
      >
        {bestAvg3DSession.toFixed(1)}
      </div>
    </div>
  </div>
</div>


  {/* =======================
    3) RECORDS — VERT
   ======================= */}
<div
  style={{
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px solid rgba(246,194,86,.45)",
  }}
>
  <div
    style={{
      fontSize: 12,
      fontWeight: 800,
      color: "#7CFF9A", // VERT
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 6,
      textAlign: "center",
    }}
  >
    Records
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-around",
      textAlign: "center",
      gap: 8,
      paddingBottom: 6,
    }}
  >
    <div>
      <div style={{ color: T.text70, marginBottom: 2 }}>Best Visit</div>
      <div
        style={{
          fontWeight: 900,
          fontSize: 17,
          color: "#B2FFD0",
          textShadow:
            "0 0 10px rgba(100,255,180,.7), 0 0 20px rgba(100,255,180,.4)",
        }}
      >
        {bestVisit}
      </div>
    </div>

    <div>
      <div style={{ color: T.text70, marginBottom: 2 }}>Best CO</div>
      <div
        style={{
          fontWeight: 900,
          fontSize: 17,
          color: "#B2FFD0",
          textShadow:
            "0 0 10px rgba(100,255,180,.7), 0 0 20px rgba(100,255,180,.4)",
        }}
      >
        {bestCheckout || 0}
      </div>
    </div>
  </div>
</div>

{/* =======================
    FAVORIS — BLEU
   ======================= */}
<div
  style={{
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px solid rgba(246,194,86,.45)",
  }}
>
  <div
    style={{
      fontSize: 12,
      fontWeight: 800,
      color: "#47B5FF", // BLEU
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 6,
      textAlign: "center",
    }}
  >
    Favoris
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "space-around",
      textAlign: "center",
      gap: 8,
      marginBottom: 2,
    }}
  >
    <div>
      <div style={{ color: T.text70, marginBottom: 2 }}>S</div>
      <div
        style={{
          fontWeight: 900,
          fontSize: 17,
          color: "#A6D4FF",
          textShadow:
            "0 0 10px rgba(100,160,255,.8), 0 0 20px rgba(100,160,255,.45)",
        }}
      >
        {favoriteSimpleDisplay ?? "—"}
      </div>
    </div>

    <div>
      <div style={{ color: T.text70, marginBottom: 2 }}>D</div>
      <div
        style={{
          fontWeight: 900,
          fontSize: 17,
          color: "#A6D4FF",
          textShadow:
            "0 0 10px rgba(100,160,255,.8), 0 0 20px rgba(100,160,255,.45)",
        }}
      >
        {favoriteDoubleDisplay ?? "—"}
      </div>
    </div>

    <div>
      <div style={{ color: T.text70, marginBottom: 2 }}>T</div>
      <div
        style={{
          fontWeight: 900,
          fontSize: 17,
          color: "#A6D4FF",
          textShadow:
            "0 0 10px rgba(100,160,255,.8), 0 0 20px rgba(100,160,255,.45)",
        }}
      >
        {favoriteTripleDisplay ?? "—"}
      </div>
    </div>
  </div>
</div>

          </>
        )}
      </div>

      {/* ------ 4) Résumé texte de la période ------ */}
      <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid rgba(246,194,86,.35)",
            fontSize: 11,
            color: T.text70,
            lineHeight: 1.45,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 4,
              color: T.gold,
            }}
          >
            {summaryTitle}
          </div>

          {summaryLines.length ? (
            <ul
              style={{
                margin: 0,
                paddingLeft: 16,
                listStyleType: "disc",
              }}
            >
              {summaryLines.map((line, idx) => (
                <li key={idx} style={{ marginBottom: 2 }}>
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <div>
              Aucune donnée exploitable sur la période sélectionnée.
            </div>
          )}
        </div>

      {/* ============================================================
    SPARKLINE + PANNEAU DÉROULANT
    ============================================================ */}
<div style={card}>
  {/* Titre */}
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 8,
      alignItems: "center",
      marginBottom: 8,
    }}
  >
    <div
      style={{
        fontSize: 13,
        fontWeight: 800,
        textTransform: "uppercase",
        color: T.gold,
        textShadow:
          "0 0 6px rgba(246,194,86,.9), 0 0 14px rgba(246,194,86,.45)",
        letterSpacing: 0.8,
      }}
    >
      Progression
    </div>
  </div>

  {/* Layout Sparkline + liste */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "2fr minmax(120px,1.1fr)",
      gap: 10,
      alignItems: "stretch",
    }}
  >
    {/* Sparkline */}
    <div style={{ display: "flex", alignItems: "center" }}>
      {sparkSeries.length ? (
        <SparklinePro
          points={sparkSeries.map((p) => ({ x: p.x, y: p.y }))}
          height={64}
        />
      ) : (
        <div style={{ fontSize: 12, color: T.text70 }}>
          Aucune session sur la période.
        </div>
      )}
    </div>

    {/* Liste déroulante des points */}
    <div
      style={{
        fontSize: 11,
        color: T.text70,
        maxHeight: 90,
        overflowY: "auto",
        paddingLeft: 4,
        borderLeft: "1px solid rgba(255,255,255,.12)",
      }}
    >
      {sparkSeries
        .slice()
        .reverse()
        .map((p, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "2px 0",
              gap: 6,
            }}
          >
            <span style={{ whiteSpace: "nowrap" }}>
              {formatShortDate(p.session.date)}
            </span>
            <span style={{ fontWeight: 700, color: T.gold }}>
              {p.y.toFixed(1)}
            </span>
          </div>
        ))}
    </div>
  </div>

  {/* Sélecteur de métrique */}
  <div
    style={{
      marginTop: 8,
      display: "flex",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 8,
    }}
  >
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {(
        [
          ["darts", "Darts"],
          ["avg3D", "3D"],
          ["pctS", "%S"],
          ["pctD", "%D"],
          ["pctT", "%T"],
          ["BV", "BV"],
          ["CO", "CO"],
        ] as const
      ).map(([k, lbl]) => (
        <button
          key={k}
          onClick={() => setMetric(k)}
          style={{
            ...metricPill,
            borderColor: metric === k ? T.gold : "rgba(255,255,255,.18)",
            color: metric === k ? T.gold : T.text70,
          }}
        >
          {lbl}
        </button>
      ))}
    </div>
  </div>
</div>

     {/* ============================================================
    RADAR HITS
    ============================================================ */}
<div style={card}>
  <div
    style={{
      fontSize: 13,
      fontWeight: 800,
      textTransform: "uppercase",
      color: T.gold,
      textShadow:
        "0 0 6px rgba(246,194,86,.9), 0 0 14px rgba(246,194,86,.45)",
      letterSpacing: 0.8,
      marginBottom: 6,
    }}
  >
    RADAR HITS
  </div>

  {trainingDartsAll.length ? (
    <TrainingRadar darts={trainingDartsAll} />
  ) : (
    <div style={{ fontSize: 12, color: T.text70 }}>
      Aucune fléchette enregistrée sur la période.
    </div>
  )}
</div>

{/* ============================================================
    GRAPHIQUE EN BÂTONS : HITS PAR SEGMENT (2 LIGNES CUSTOM ORDER)
    ============================================================ */}
<div style={card}>
  <div
    style={{
      fontSize: 13,
      fontWeight: 700,
      color: T.gold,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      textShadow: "0 0 6px rgba(246,194,86,.6)",
    }}
  >
    Hits par segment
  </div>

  {trainingDartsAll.length ? (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        background: "linear-gradient(180deg,#15171B,#0C0D10)",
        padding: "12px 6px",
        borderRadius: 12,
      }}
    >
      {/* ORDRE EXACT demandé */}
      {[
        ["MISS", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // Ligne 1
        [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25], // Ligne 2
      ].map((rowSegs, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 4,
            height: 120,
          }}
        >
          {rowSegs.map((seg) => {
            // MISS
            if (seg === "MISS") {
              const count = chartMissCount;
              const hPct =
                maxStackHits > 0 ? (count / maxStackHits) * 100 : 0;
              return (
                <div
                  key="MISS"
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 3,
                    height: "100%", // ✅ important
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      borderRadius: 999,
                      background: "#FF4B4B",
                      boxShadow: count
                        ? "0 0 6px rgba(255,75,75,0.85)"
                        : "none",
                      height: count
                        ? `${Math.max(10, hPct)}%`
                        : 4,
                      opacity: count ? 1 : 0.18,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 8,
                      color: T.text70,
                    }}
                  >
                    M
                  </div>
                </div>
              );
            }

            // SEGMENTS 1–20 + 25
            const key = String(seg);
            const data = segSDTMap[key] || { S: 0, D: 0, T: 0 };
            const total = data.S + data.D + data.T;

            const hPct =
              maxStackHits > 0 ? (total / maxStackHits) * 100 : 0;

            const baseHeight = total ? Math.max(10, hPct) : 4;

            const totalForRatio = total > 0 ? total : 1;

            const hS =
              total > 0
                ? Math.max(2, (data.S / totalForRatio) * baseHeight)
                : 0;

            const hD =
              total > 0
                ? Math.max(2, (data.D / totalForRatio) * baseHeight)
                : 0;

            const hT =
              total > 0
                ? Math.max(2, (data.T / totalForRatio) * baseHeight)
                : 0;

            return (
              <div
                key={seg}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 3,
                  height: "100%", // ✅ important
                }}
              >
                <div
                  style={{
                    width: 12,
                    borderRadius: 999,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column-reverse",
                    opacity: total ? 1 : 0.18,
                    boxShadow: total
                      ? "0 0 6px rgba(255,255,255,0.15)"
                      : "none",
                    height: total ? `${baseHeight}%` : 4,
                  }}
                >
                  {data.S > 0 && (
                    <div
                      style={{
                        height: `${hS}%`,
                        background: T.gold, // SIMPLE doré
                      }}
                    />
                  )}
                  {data.D > 0 && (
                    <div
                      style={{
                        height: `${hD}%`,
                        background: "#007A88", // DOUBLE bleu pétrole
                      }}
                    />
                  )}
                  {data.T > 0 && (
                    <div
                      style={{
                        height: `${hT}%`,
                        background: "#A259FF", // TRIPLE violet
                      }}
                    />
                  )}
                </div>

                {/* Label segment */}
                <div
                  style={{
                    fontSize: 8,
                    color: T.text70,
                  }}
                >
                  {seg === 25 ? "25" : seg}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  ) : (
    <div style={{ fontSize: 12, color: T.text70 }}>
      Aucune fléchette enregistrée sur la période.
    </div>
  )}
</div>

              {/* ============================================================
          LISTE DES DERNIÈRES SESSIONS + PAGINATION
          ============================================================ */}
      <div style={card}>
      <div
  style={{
    ...goldNeon,
    fontSize: 13,
    marginBottom: 6,
  }}
>
  DERNIÈRES SESSIONS
</div>

        {filtered.length === 0 && (
          <div style={{ fontSize: 12, color: T.text70 }}>
            Aucune session de training enregistrée pour l’instant.
          </div>
        )}

        {/* Sessions affichées 10 par page */}
        {pagedSessions.map((s) => (
          <div
            key={s.id}
            style={{
              marginTop: 6,
              padding: 8,
              borderRadius: 12,
              background: "rgba(0,0,0,.45)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: T.text70,
                fontSize: 12,
              }}
            >
              <span>{formatShortDate(s.date)}</span>
              <span style={{ fontWeight: 700 }}>
                {s.avg3D.toFixed(1)} Moy.3D
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 6,
                color: T.text70,
                fontSize: 12,
              }}
            >
              <div>
                <span>{s.darts} darts</span>
                <span>
                  {" "}
                  · BV {s.bestVisit}
                  {s.bestCheckout ? ` · CO ${s.bestCheckout}` : ""}
                </span>
              </div>

              {/* Petit bouton Détails à droite */}
              <button
                onClick={() => setSelected(s)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "none",
                  fontSize: 11,
                  fontWeight: 600,
                  background:
                    "linear-gradient(135deg,#F6C256,#FBE29A)",
                  color: "#141416",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Détails
              </button>
            </div>
          </div>
        ))}

        {/* Pagination 10 par page */}
        {totalPages > 1 && (
          <div
            style={{
              marginTop: 10,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                border: "none",
                background:
                  page === 1
                    ? "rgba(255,255,255,.05)"
                    : "rgba(255,255,255,.18)",
                color: "#fff",
                fontSize: 11,
                cursor: page === 1 ? "default" : "pointer",
              }}
            >
              ‹
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              const active = p === page;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: "none",
                    background: active
                      ? T.gold
                      : "rgba(255,255,255,.12)",
                    color: active ? "#000" : "#fff",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() =>
                setPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={page === totalPages}
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                border: "none",
                background:
                  page === totalPages
                    ? "rgba(255,255,255,.05)"
                    : "rgba(255,255,255,.18)",
                color: "#fff",
                fontSize: 11,
                cursor:
                  page === totalPages ? "default" : "pointer",
              }}
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* ============================================================
          MODAL DÉTAIL SESSION — avec radar + hits par segment
          ============================================================ */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              ...card,
              maxWidth: 340,
              width: "92%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Header modal */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                Session du {formatShortDate(selected.date)}
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: T.text70,
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Stats principales */}
            <div>
              <div style={statRowBox}>
                <span>Moy.3D</span>
                <span>{selected.avg3D.toFixed(1)}</span>
              </div>
              <div style={statRowBox}>
                <span>Moy.1D</span>
                <span>{selected.avg1D.toFixed(2)}</span>
              </div>
              <div style={statRowBox}>
                <span>Darts</span>
                <span>{selected.darts}</span>
              </div>
              <div style={statRowBox}>
                <span>Best visit</span>
                <span>{selected.bestVisit}</span>
              </div>
              <div style={statRowBox}>
                <span>Best checkout</span>
                <span>{selected.bestCheckout ?? "—"}</span>
              </div>
              <div style={statRowBox}>
                <span>S / D / T</span>
                <span>
                  {(selected.hitsS ?? 0)} / {(selected.hitsD ?? 0)} /{" "}
                  {(selected.hitsT ?? 0)}
                </span>
              </div>
              <div style={statRowBox}>
                <span>Miss / Bust</span>
                <span>
                  {(selected.miss ?? 0)} / {(selected.bust ?? 0)}
                </span>
              </div>
              <div style={statRowBox}>
                <span>Bull / DBull</span>
                <span>
                  {(selected.bull ?? 0)} / {(selected.dBull ?? 0)}
                </span>
              </div>
            </div>

            {/* Radar de la session */}
            <div
              style={{
                marginTop: 12,
                paddingTop: 8,
                borderTop: "1px solid rgba(255,255,255,.12)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: T.text70,
                  marginBottom: 4,
                }}
              >
                Radar — session
              </div>
              {Array.isArray(selected.dartsDetail) &&
              selected.dartsDetail.length ? (
                <TrainingRadar darts={selected.dartsDetail} />
              ) : (
                <div style={{ fontSize: 11, color: T.text70 }}>
                  Pas de détail flèche par flèche pour cette session.
                </div>
              )}
            </div>

            {/* Hits par segment — session */}
            <div
              style={{
                marginTop: 12,
                paddingTop: 8,
                borderTop: "1px solid rgba(255,255,255,.12)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: T.text70,
                  marginBottom: 4,
                }}
              >
                Hits par segment (session)
              </div>

              {Array.isArray(selected.dartsDetail) &&
              selected.dartsDetail.length ? (() => {
                const localMap: Record<
                  string,
                  { S: number; D: number; T: number }
                > = {};
                let localMiss = 0;

                for (const d of selected.dartsDetail!) {
                  const v = Number((d as any)?.v) || 0;
                  const mult = Number((d as any)?.mult) || 0;

                  if (v === 0 || mult === 0) {
                    localMiss++;
                    continue;
                  }

                  const key = v === 25 ? "25" : String(v);
                  if (!localMap[key]) {
                    localMap[key] = { S: 0, D: 0, T: 0 };
                  }
                  if (mult === 1) localMap[key].S++;
                  else if (mult === 2) localMap[key].D++;
                  else if (mult === 3) localMap[key].T++;
                }

                const SESSION_SEGMENTS: (number | "MISS")[] = [
                  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
                  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
                  25,
                  "MISS",
                ];

                const maxLocal = SESSION_SEGMENTS.reduce((m, seg) => {
                  if (seg === "MISS") {
                    return localMiss > m ? localMiss : m;
                  }
                  const d = localMap[String(seg)];
                  const tot = d ? d.S + d.D + d.T : 0;
                  return tot > m ? tot : m;
                }, 0);

                if (maxLocal === 0) {
                  return (
                    <div
                      style={{ fontSize: 11, color: T.text70 }}
                    >
                      Aucun hit enregistré pour cette session.
                    </div>
                  );
                }

                return (
                  <div
                    style={{
                      height: 110,
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 3,
                      padding: "6px 2px",
                      borderRadius: 14,
                      background:
                        "linear-gradient(180deg,#15171B,#0C0D10)",
                    }}
                  >
                    {SESSION_SEGMENTS.map((seg) => {
                      if (seg === "MISS") {
                        const count = localMiss;
                        const hPct =
                          maxLocal > 0
                            ? (count / maxLocal) * 100
                            : 0;
                        return (
                          <div
                            key="MISS"
                            style={{
                              flex: 1,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 3,
                            }}
                          >
                            <div
                              style={{
                                width: 9,
                                borderRadius: 999,
                                background: "#FF4B4B",
                                boxShadow: count
                                  ? "0 0 6px rgba(255,75,75,0.85)"
                                  : "none",
                                height: count
                                  ? `${Math.max(10, hPct)}%`
                                  : 4,
                                opacity: count ? 1 : 0.25,
                              }}
                            />
                            <div
                              style={{
                                fontSize: 7,
                                color: T.text70,
                              }}
                            >
                              M
                            </div>
                          </div>
                        );
                      }

                      const key = String(seg);
                      const data =
                        localMap[key] || { S: 0, D: 0, T: 0 };
                      const total = data.S + data.D + data.T;
                      const hPct =
                        maxLocal > 0
                          ? (total / maxLocal) * 100
                          : 0;

                      const baseHeight = total
                        ? Math.max(12, hPct)
                        : 4;
                      const totalForRatio =
                        total > 0 ? total : 1;
                      const hS =
                        total > 0
                          ? Math.max(
                              3,
                              (data.S / totalForRatio) * baseHeight
                            )
                          : 0;
                      const hD =
                        total > 0
                          ? Math.max(
                              3,
                              (data.D / totalForRatio) * baseHeight
                            )
                          : 0;
                      const hT =
                        total > 0
                          ? Math.max(
                              3,
                              (data.T / totalForRatio) * baseHeight
                            )
                          : 0;

                      return (
                        <div
                          key={seg}
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 3,
                          }}
                        >
                          <div
                            style={{
                              width: 10,
                              borderRadius: 999,
                              overflow: "hidden",
                              display: "flex",
                              flexDirection: "column-reverse",
                              opacity: total ? 1 : 0.2,
                              boxShadow: total
                                ? "0 0 6px rgba(255,255,255,0.2)"
                                : "none",
                              height: total
                                ? `${baseHeight}%`
                                : 4,
                            }}
                          >
                            {data.S > 0 && (
                              <div
                                style={{
                                  height: `${hS}%`,
                                  background: T.gold, // S = doré
                                }}
                              />
                            )}
                            {data.D > 0 && (
                              <div
                                style={{
                                  height: `${hD}%`,
                                  background: "#007A88", // D = bleu pétrole
                                }}
                              />
                            )}
                            {data.T > 0 && (
                              <div
                                style={{
                                  height: `${hT}%`,
                                  background: "#A259FF", // T = violet
                                }}
                              />
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 7,
                              color: T.text70,
                            }}
                          >
                            {seg === 25 ? "25" : seg}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })() : (
                <div style={{ fontSize: 11, color: T.text70 }}>
                  Pas de détail flèche par flèche pour cette session.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ============================================
// Sous-composant : TrainingHitsBySegment
// - utilise TrainingX01Session (TrainingStore)
// - ajoute un segment spécial "MISS"
// ============================================

const TRAINING_SEGMENTS: number[] = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
  3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 25,
];

type SegmentBarAgg = {
  key: string;   // "1".."20","25","MISS"
  label: string; // texte affiché sous la barre
  s: number;
  d: number;
  t: number;
};

/**
 * Construit les données pour "Hits par segment" à partir des sessions X01.
 * - Empile S/D/T pour chaque valeur 1..20,25
 * - Ajoute un segment spécial "MISS" alimenté par session.miss
 */
function buildTrainingBarsFromSessions(
  sessions: TrainingX01Session[],
): SegmentBarAgg[] {
  const map: Record<string, SegmentBarAgg> = {};

  // initialise 1..20,25
  for (const v of TRAINING_SEGMENTS) {
    const k = String(v);
    map[k] = {
      key: k,
      label: k,
      s: 0,
      d: 0,
      t: 0,
    };
  }

  // initialise le segment spécial "MISS"
  map["MISS"] = {
    key: "MISS",
    label: "Miss",
    s: 0,
    d: 0,
    t: 0,
  };

  for (const s of sessions) {
    // agrégats détaillés par valeur
    if (s.bySegmentS) {
      for (const [k, val] of Object.entries(s.bySegmentS)) {
        if (!map[k]) continue;
        map[k].s += val || 0;
      }
    }
    if (s.bySegmentD) {
      for (const [k, val] of Object.entries(s.bySegmentD)) {
        if (!map[k]) continue;
        map[k].d += val || 0;
      }
    }
    if (s.bySegmentT) {
      for (const [k, val] of Object.entries(s.bySegmentT)) {
        if (!map[k]) continue;
        map[k].t += val || 0;
      }
    }

    // 👉 Miss : on utilise le compteur global s.miss
    const missCount = s.miss ?? 0;
    if (missCount > 0) {
      // on le met dans "s" (Simple) pour une seule couleur
      map["MISS"].s += missCount;
    }
  }

  // On renvoie les segments dans l'ordre radar + Miss en dernier
  const ordered: SegmentBarAgg[] = [];

  for (const v of TRAINING_SEGMENTS) {
    const k = String(v);
    if (map[k]) ordered.push(map[k]);
  }

  // segment Miss à la fin
  ordered.push(map["MISS"]);

  return ordered;
}

type TrainingHitsBySegmentProps = {
  sessions: TrainingX01Session[];
};

function TrainingHitsBySegment({ sessions }: TrainingHitsBySegmentProps) {
  const bars = buildTrainingBarsFromSessions(sessions);

  if (!bars.length) {
    return (
      <div className="panel-card training-card">
        <div className="panel-card-header">
          <span>Hits par segment</span>
        </div>
        <div className="panel-card-body text-muted">
          Aucune session Training X01 pour ce joueur.
        </div>
      </div>
    );
  }

  return (
    <div className="panel-card training-card">
      <div className="panel-card-header">
        <span>Hits par segment</span>
      </div>

      <div className="training-bars">
        {bars.map((b) => {
          const total = b.s + b.d + b.t;
          const sHeight = total ? (b.s / total) * 100 : 0;
          const dHeight = total ? (b.d / total) * 100 : 0;
          const tHeight = total ? (b.t / total) * 100 : 0;

          return (
            <div key={b.key} className="training-bar">
              <div className="training-bar-stack">
                {/* Simple = doré */}
                <div
                  className="training-bar-seg training-bar-seg-s"
                  style={{ height: `${sHeight}%` }}
                />
                {/* Double = bleu pétrole */}
                <div
                  className="training-bar-seg training-bar-seg-d"
                  style={{ height: `${dHeight}%` }}
                />
                {/* Triple = violet */}
                <div
                  className="training-bar-seg training-bar-seg-t"
                  style={{ height: `${tHeight}%` }}
                />
              </div>
              <div className="training-bar-label">{b.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
 
// ============================================================
// Onglet "X01 multi" dans Stats joueurs
// - Stats par joueur à partir de l'historique X01 (X01Play)
// - Filtres J/S/M/A/All
// ============================================================

type X01MultiSession = {
  id: string;
  date: number;
  avg3D: number;
  bestVisit: number;
  bestCheckout: number;
};

type X01MultiStatsTabProps = {
  records: SavedMatch[];
  playerId: string;
};

function X01MultiStatsTab({ records, playerId }: X01MultiStatsTabProps) {
  const [range, setRange] = React.useState<TimeRange>("all");

  // --- helpers dates ---
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  function inRange(ts: number | undefined, r: TimeRange) {
    if (!ts) return false;
    if (r === "all") return true;
    const t = ts;
    const delta =
      r === "day"
        ? ONE_DAY
        : r === "week"
        ? 7 * ONE_DAY
        : r === "month"
        ? 30 * ONE_DAY
        : 365 * ONE_DAY;
    return t >= now - delta;
  }

// --- extrait les stats X01 pour un joueur dans un match ---
function extractX01PlayerStats(rec: SavedMatch, pid: string) {
  const ss: any = rec.summary ?? rec.payload?.summary ?? {};
  const per: any[] =
    ss.perPlayer ??
    ss.players ??
    rec.payload?.summary?.perPlayer ??
    [];

  const Nloc = (x: any) => (Number.isFinite(Number(x)) ? Number(x) : 0);

  let avg3 = 0;
  let bestVisit = 0;
  let bestCheckout = 0;

  // A) 🔹 Nouveau format : maps par joueur (finalizeMatch v2)
  if (ss.avg3ByPlayer && ss.avg3ByPlayer[pid] != null) {
    avg3 = Nloc(ss.avg3ByPlayer[pid]);
  }
  if (ss.bestVisitByPlayer && ss.bestVisitByPlayer[pid] != null) {
    bestVisit = Math.max(bestVisit, Nloc(ss.bestVisitByPlayer[pid]));
  }
  if (ss.bestCheckoutByPlayer && ss.bestCheckoutByPlayer[pid] != null) {
    bestCheckout = Math.max(
      bestCheckout,
      Nloc(ss.bestCheckoutByPlayer[pid])
    );
  }

  // B) 🔹 perPlayer (summaryPerPlayer de finalizeMatch)
  const pstat =
    per.find((x) => x?.playerId === pid) ??
    (ss[pid] || ss.players?.[pid] || ss.perPlayer?.[pid]) ??
    {};

  if (!avg3) {
    avg3 =
      Nloc(pstat.avg3) ||
      Nloc(pstat.avg_3) ||
      Nloc(pstat.avg3Darts) ||
      Nloc(pstat.average3) ||
      Nloc(pstat.avg3D);
  }

  bestVisit = Math.max(
    bestVisit,
    Nloc(pstat.bestVisit),
    Nloc(pstat.best_visit)
  );
  bestCheckout = Math.max(
    bestCheckout,
    Nloc(pstat.bestCheckout),
    Nloc(pstat.best_co),
    Nloc(pstat.bestFinish)
  );

  // C) 🔹 Fallback sur payload.legs (au cas où summary est pauvre)
  if ((!avg3 || (!bestVisit && !bestCheckout)) && rec.payload?.legs) {
    const legs: any[] = Array.isArray((rec.payload as any).legs)
      ? (rec.payload as any).legs
      : [];

    let sumAvg3 = 0;
    let legsCount = 0;

    for (const leg of legs) {
      const plArr: any[] = Array.isArray(leg.perPlayer)
        ? leg.perPlayer
        : [];
      const pl = plArr.find((x) => x?.playerId === pid);
      if (!pl) continue;

      const legAvg =
        Nloc(pl.avg3) ||
        Nloc(pl.avg_3) ||
        Nloc(pl.avg3Darts) ||
        Nloc(pl.average3) ||
        Nloc(pl.avg3D);

      if (legAvg > 0) {
        sumAvg3 += legAvg;
        legsCount++;
      }

      bestVisit = Math.max(
        bestVisit,
        Nloc(pl.bestVisit),
        Nloc(pl.best_visit)
      );
      bestCheckout = Math.max(
        bestCheckout,
        Nloc(pl.bestCheckout),
        Nloc(pl.best_co),
        Nloc(pl.bestFinish)
      );
    }

    if (legsCount > 0 && (!avg3 || avg3 === 0)) {
      avg3 = sumAvg3 / legsCount;
    }
  }

  // D) 🔹 Fallback ultime : payload.visits (recalcul complet)
  if ((!avg3 || (!bestVisit && !bestCheckout)) && rec.payload?.visits) {
    const visits: any[] = Array.isArray((rec.payload as any).visits)
      ? (rec.payload as any).visits
      : [];

    let darts = 0;
    let scored = 0;

    for (const v of visits) {
      if (v.p !== pid) continue;

      const segs = Array.isArray(v.segments) ? v.segments : [];
      const nbDarts = segs.length || 0;

      darts += nbDarts;
      scored += Nloc(v.score);

      if (!v.bust) {
        const sc = Nloc(v.score);
        if (sc > bestVisit) bestVisit = sc;
        if (v.isCheckout && sc > bestCheckout) {
          bestCheckout = sc;
        }
      }
    }

    if (darts > 0 && (!avg3 || avg3 === 0)) {
      avg3 = (scored / darts) * 3;
    }
  }

  return {
    avg3,
    bestVisit,
    bestCheckout,
  };
}

  // --- matches X01 du joueur sélectionné ---
  const x01Matches = React.useMemo(() => {
    const out: Array<{
      rec: SavedMatch;
      t: number;
      avg3: number;
      bestVisit: number;
      bestCheckout: number;
    }> = [];

    const seen = new Set<string>(); // évite les doublons de match

    for (const rec of records) {
      // 🔹 1) On ne garde que les matchs X01 :
      //    kind peut être "x01", "x01_multi", "x01_local", etc. ou undefined.
      const kind = (rec.kind || "").toLowerCase();
      if (kind && !kind.startsWith("x01")) continue;

      // 🔹 2) On ignore uniquement ceux explicitement "in_progress"
      if (rec.status && rec.status !== "finished") continue;

      // déduplication forte par id
      if (rec.id && seen.has(rec.id)) continue;
      if (rec.id) seen.add(rec.id);

      const players = toArr<PlayerLite>(rec.players);
      if (!players.some((p) => p?.id === playerId)) continue;

      // timestamp (fallback sur createdAt, sinon date courante)
      const tRaw = rec.updatedAt ?? rec.createdAt ?? 0;
      const t = tRaw || Date.now();
      if (!inRange(t, range)) continue;

      const s = extractX01PlayerStats(rec, playerId);

      // ⚠️ Avant on faisait : if (!s.avg3 && !s.bestVisit && !s.bestCheckout) continue;
      //    → ça jetait tous les matchs dont History n’a pas les stats détaillées.
      //    On garde maintenant le match même si les stats sont à 0.
      out.push({
        rec,
        t,
        avg3: s.avg3 || 0,
        bestVisit: s.bestVisit || 0,
        bestCheckout: s.bestCheckout || 0,
      });
    }

    // tri chronologique
    out.sort((a, b) => a.t - b.t);
    return out;
  }, [records, playerId, range]);

  const matchCount = x01Matches.length;

  const avg3Period =
    matchCount > 0
      ? x01Matches.reduce((s, m) => s + (m.avg3 || 0), 0) / matchCount
      : 0;

  const bestVisitPeriod =
    matchCount > 0
      ? Math.max(...x01Matches.map((m) => m.bestVisit || 0))
      : 0;

  const bestCheckoutPeriod =
    matchCount > 0
      ? Math.max(...x01Matches.map((m) => m.bestCheckout || 0))
      : 0;

  // --- sparkline ---
  const sparkPoints = x01Matches.map((m) => ({
    x: m.t,
    y: m.avg3 || 0,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* HEADER + FILTRES TEMPORELS */}
      <div style={card}>
        <div
          style={{
            ...goldNeon,
            fontSize: 16,
            marginBottom: 6,
          }}
        >
          X01 multi — stats par joueur
        </div>

        {/* Filtres J/S/M/A/All */}
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          {(["day", "week", "month", "year", "all"] as TimeRange[]).map(
            (r) => (
              <GoldPill
                key={r}
                active={range === r}
                onClick={() => setRange(r)}
                style={{
                  padding: "4px 10px",
                  fontSize: 11,
                  minWidth: "unset",
                  whiteSpace: "nowrap",
                }}
              >
                {r === "day" && "Jour"}
                {r === "week" && "Semaine"}
                {r === "month" && "Mois"}
                {r === "year" && "Année"}
                {r === "all" && "All"}
              </GoldPill>
            )
          )}
        </div>

        {/* Petits KPI période */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 8,
          }}
        >
          <div
            style={{
              borderRadius: 16,
              padding: 8,
              background: "linear-gradient(180deg,#18181A,#101015)",
              border: "1px solid rgba(255,255,255,.12)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 10, color: T.text70 }}>
              Matchs X01 (période)
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: T.gold,
              }}
            >
              {matchCount}
            </div>
          </div>

          <div
            style={{
              borderRadius: 16,
              padding: 8,
              background: "linear-gradient(180deg,#18181A,#101015)",
              border: "1px solid rgba(255,255,255,.12)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 10, color: T.text70 }}>
              Moy.3D (période)
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: "#FFB8DE",
              }}
            >
              {avg3Period.toFixed(1)}
            </div>
          </div>

          <div
            style={{
              borderRadius: 16,
              padding: 8,
              background: "linear-gradient(180deg,#18181A,#101015)",
              border: "1px solid rgba(255,255,255,.12)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 10, color: T.text70 }}>
              Best Visit / Best CO
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: "#7CFF9A",
              }}
            >
              {bestVisitPeriod || 0} / {bestCheckoutPeriod || 0}
            </div>
          </div>
        </div>
      </div>

      {/* SPARKLINE PROGRESSION */}
      <div style={card}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            textTransform: "uppercase",
            color: T.gold,
            textShadow:
              "0 0 6px rgba(246,194,86,.9), 0 0 14px rgba(246,194,86,.45)",
            letterSpacing: 0.8,
            marginBottom: 6,
          }}
        >
          Progression X01
        </div>

        {sparkPoints.length ? (
          <SparklinePro points={sparkPoints} height={64} />
        ) : (
          <div style={{ fontSize: 12, color: T.text70 }}>
            Aucun match X01 dans la période sélectionnée.
          </div>
        )}
      </div>

      {/* LISTE DÉTAILLÉE DES MATCHS */}
      <div style={card}>
        <div
          style={{
            ...goldNeon,
            fontSize: 13,
            marginBottom: 6,
          }}
        >
          Matchs X01 (détail)
        </div>

        {x01Matches.length === 0 ? (
          <div style={{ fontSize: 12, color: T.text70 }}>
            Aucun match X01 pour cette période.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {x01Matches
              .slice()
              .reverse()
              .map((m) => (
                <div
                  key={m.rec.id}
                  style={{
                    padding: 8,
                    borderRadius: 12,
                    background: "rgba(0,0,0,.45)",
                    fontSize: 11,
                    color: T.text70,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 2,
                    }}
                  >
                    <span>
                      {formatShortDate(
                        m.rec.updatedAt ?? m.rec.createdAt ?? Date.now()
                      )}
                    </span>
                    <span style={{ fontWeight: 700, color: T.gold }}>
                      {m.avg3.toFixed(1)} Moy.3D
                    </span>
                  </div>
                  <div>
                    BV {m.bestVisit || 0}
                    {m.bestCheckout ? ` · CO ${m.bestCheckout}` : ""}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function StatsHub(props: Props) {
  const go = props.go ?? (() => {});
  const initialTab: "history" | "stats" | "training" =
    props.tab === "stats"
      ? "stats"
      : props.tab === "training"
      ? "training"
      : "history";
  const [tab, setTab] = React.useState<
    "history" | "stats" | "training"
  >(initialTab);

   // Sous-onglets dans "Stats joueurs" :
  // - "dashboard" = vue générale StatsPlayerDashboard
  // - "x01_multi" = stats X01Play (multijoueurs)
  const [statsSubTab, setStatsSubTab] =
  React.useState<"dashboard" | "x01_multi">("dashboard");

  // 0) Récupère les profils (pour enrichir avatars si manquants)
  const [storeProfiles, setStoreProfiles] =
    React.useState<PlayerLite[]>([]);
  React.useEffect(() => {
    (async () => {
      try {
        const s: any = await loadStore<any>();
        setStoreProfiles(toArr<PlayerLite>(s?.profiles));
      } catch {
        setStoreProfiles([]);
      }
    })();
  }, []);

  // 1) Sources d'historique
  const persisted = useHistoryAPI();
  const mem = toArr<SavedMatch>(props.memHistory);
  const fromStore = useStoreHistory();

  // 2) Fusion & déduplication (par id)
  //    → on préfère les records avec un summary riche
  const records = React.useMemo(() => {
    const byId = new Map<string, SavedMatch>();

    // Score de "qualité" d'un record : plus il a de summary, mieux c'est
    const qualityOf = (rec: SavedMatch | undefined): number => {
      if (!rec) return -1;
      const ss: any = rec.summary ?? rec.payload?.summary ?? {};
      if (!ss) return 0;

      // summary "riche" = perPlayer[] ou avg3ByPlayer / bestVisitByPlayer / bestCheckoutByPlayer
      if (
        Array.isArray(ss.perPlayer) ||
        ss.avg3ByPlayer ||
        ss.bestVisitByPlayer ||
        ss.bestCheckoutByPlayer
      ) {
        return 2;
      }

      // summary présent mais minimal
      if (Object.keys(ss).length > 0) return 1;

      return 0;
    };

    const push = (raw: any) => {
      const rec = toObj<SavedMatch>(raw);
      if (!rec.id) return;

      const prev = byId.get(rec.id);
      if (!prev) {
        byId.set(rec.id, rec);
        return;
      }

      const prevQ = qualityOf(prev);
      const curQ = qualityOf(rec);

      // Si le nouveau a un summary de meilleure qualité → on remplace
      if (curQ > prevQ) {
        byId.set(rec.id, rec);
        return;
      }
      // Si le nouveau est moins bon → on garde l’ancien
      if (curQ < prevQ) {
        return;
      }

      // Même qualité → on départage à la date
      const curT = N(rec.updatedAt ?? rec.createdAt, 0);
      const prevT = N(prev.updatedAt ?? prev.createdAt, -1);
      if (curT > prevT) byId.set(rec.id, rec);
    };

    persisted.forEach(push); // IndexedDB (History.list) — records complets
    mem.forEach(push);       // éventuellement passés via props
    fromStore.forEach(push); // vieux store.history (plus pauvre)

    // Normalise joueurs + avatars et trie par date décroissante
    return Array.from(byId.values())
      .map((r) => normalizeRecordPlayers(r, storeProfiles))
      .sort(
        (a, b) =>
          N(b.updatedAt ?? b.createdAt, 0) -
          N(a.updatedAt ?? a.createdAt, 0)
      );
  }, [persisted, mem, fromStore, storeProfiles]);

  // 3) Liste des joueurs rencontrés dans l'historique
  const players = React.useMemo<PlayerLite[]>(() => {
    const map = new Map<string, PlayerLite>();
    for (const r of records)
      for (const p of toArr<PlayerLite>(r.players)) {
        if (!p?.id) continue;
        if (!map.has(p.id))
          map.set(p.id, {
            id: p.id,
            name: p.name ?? `Joueur ${map.size + 1}`,
            avatarDataUrl: p.avatarDataUrl ?? null,
          });
      }
    return Array.from(map.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }, [records]);

  // 4) Sélection du joueur + quick stats
  const [selectedPlayerId, setSelectedPlayerId] =
    React.useState<string | null>(players[0]?.id ?? null);
  React.useEffect(() => {
    if (!selectedPlayerId && players[0]?.id)
      setSelectedPlayerId(players[0].id);
  }, [players, selectedPlayerId]);
  const selectedPlayer =
    players.find((p) => p.id === selectedPlayerId) ||
    players[0];

  const quick = useQuickStats(selectedPlayer?.id || null);

  // 5) Bloc dépliant (sélecteur joueurs)
  const [openPlayers, setOpenPlayers] =
    React.useState(true);

  return (
    <div
      className="container"
      style={{ padding: 12, maxWidth: 1100, color: T.text }}
    >
      {/* Onglets */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <GoldPill
          active={tab === "history"}
          onClick={() => setTab("history")}
        >
          Historique
        </GoldPill>
        <GoldPill
          active={tab === "stats"}
          onClick={() => setTab("stats")}
        >
          Stats joueurs
        </GoldPill>
        <GoldPill
          active={tab === "training"}
          onClick={() => setTab("training")}
        >
          Training
        </GoldPill>
      </div>

      {tab === "history" && (
        <HistoryPage
          store={{ history: records } as any}
          go={go}
        />
      )}

{tab === "stats" && (
        <>
          {/* ===== Bloc dépliant Joueurs (au-dessus du dashboard) ===== */}
          <div style={{ ...card, marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontWeight: 800 }}>
                Joueurs ({players.length})
              </div>
              <GoldPill
                active={openPlayers}
                onClick={() => setOpenPlayers((o) => !o)}
              >
                {openPlayers ? "Replier" : "Déplier"}
              </GoldPill>
            </div>

            {openPlayers && (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {players.length ? (
                  players.map((p) => (
                    <ProfilePill
                      key={p.id}
                      name={p.name || "Joueur"}
                      avatarDataUrl={p.avatarDataUrl || undefined}
                      active={p.id === selectedPlayer?.id}
                      onClick={() => setSelectedPlayerId(p.id)}
                    />
                  ))
                ) : (
                  <div
                    style={{
                      color: T.text70,
                      fontSize: 13,
                    }}
                  >
                    Aucun joueur détecté.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===== Sous-onglets de "Stats joueurs" ===== */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <GoldPill
              active={statsSubTab === "dashboard"}
              onClick={() => setStatsSubTab("dashboard")}
            >
              Vue générale
            </GoldPill>
            <GoldPill
              active={statsSubTab === "x01_multi"}
              onClick={() => setStatsSubTab("x01_multi")}
            >
              X01 multi
            </GoldPill>
          </div>

          {/* ===== Contenu selon sous-onglet ===== */}
          {statsSubTab === "dashboard" && (
            <>
              {selectedPlayer ? (
                <StatsPlayerDashboard
                  data={buildDashboardForPlayer(
                    selectedPlayer,
                    records,
                    quick || null
                  )}
                />
              ) : (
                <div style={card}>
                  Sélectionne un joueur pour afficher ses stats.
                </div>
              )}
            </>
          )}

          {statsSubTab === "x01_multi" && (
            <>
              {selectedPlayer ? (
                <X01MultiStatsTab
                  records={records}
                  playerId={selectedPlayer.id}
                />
              ) : (
                <div style={card}>
                  Sélectionne un joueur pour afficher ses stats X01.
                </div>
              )}
            </>
          )}
        </>
      )}

      {tab === "training" && <TrainingX01StatsTab />}
    </div>
  );
}

/* ---------- Historique (ancien composant) ----------
   Conservé ci-dessous mais plus utilisé. Tu peux le supprimer plus tard si tu veux.
*/
function HistoryList({
  records,
  onOpen,
}: {
  records: SavedMatch[];
  onOpen: (r: SavedMatch) => void;
}) {
  if (!records.length) {
    return (
      <div style={card}>
        <div style={{ color: T.text70 }}>
          Aucun enregistrement pour l’instant.
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {records.map((rec) => {
        const players = toArr<PlayerLite>(rec.players);
        const status = rec.status ?? "finished";
        const winnerId = rec.winnerId ?? null;
        const first = players[0]?.name || "—";
        const sub =
          players.length > 1
            ? `${first} + ${
                players.length - 1
              } autre(s)`
            : first;
        return (
          <div key={rec.id} style={row}>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 800,
                  color: T.gold,
                }}
              >
                {rec.kind?.toUpperCase?.() ?? "MATCH"} ·{" "}
                {status === "in_progress"
                  ? "En cours"
                  : "Terminé"}
              </div>
              <div
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: T.text70,
                }}
              >
                {sub}
              </div>
              <div style={{ color: T.text70 }}>
                {fmtDate(
                  rec.updatedAt ?? rec.createdAt
                )}
              </div>
              {winnerId && (
                <div style={{ marginTop: 4 }}>
                  Vainqueur :{" "}
                  <b>
                    {players.find(
                      (p) => p.id === winnerId
                    )?.name ?? "—"}
                  </b>
                </div>
              )}
            </div>
            <div>
              <GoldPill onClick={() => onOpen(rec)}>
                Voir
              </GoldPill>
            </div>
          </div>
        );
      })}
    </div>
  );
}
