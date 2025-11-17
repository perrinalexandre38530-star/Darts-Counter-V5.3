// ============================================
// src/pages/StatsHub.tsx — Stats + Historique + Training (safe)
// Sélecteur de joueurs AU-DESSUS du dashboard dans un bloc dépliant
// + Fix avatars : normalisation rec.players / rec.payload.players
// + Onglet "Training X01" (localStorage dc_training_x01_stats_v1)
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
import SparklinePro from "../components/SparklinePro"; // sparkline PRO
import TrainingRadar from "../components/TrainingRadar"; // radar Training
import type { Dart as UIDart } from "../lib/types";

/* ---------- Thème local ---------- */
const T = {
  gold: "#F6C256",
  text: "#FFFFFF",
  text70: "rgba(255,255,255,.70)",
  edge: "rgba(255,255,255,.10)",
  card: "linear-gradient(180deg,rgba(17,18,20,.94),rgba(13,14,17,.92))",
};

/* ---------- Types ---------- */
type PlayerLite = { id: string; name?: string; avatarDataUrl?: string | null };
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
const toArr = <T,>(v: any): T[] => (Array.isArray(v) ? (v as T[]) : []);
const toObj = <T,>(v: any): T =>
  v && typeof v === "object" ? (v as T) : ({} as T);
const N = (x: any, d = 0) =>
  Number.isFinite(Number(x)) ? Number(x) : d;
const fmtDate = (ts?: number) =>
  new Date(N(ts, Date.now())).toLocaleString();

/* ---------- TRAINING X01 (stats sessions) ---------- */
type TimeRange = "all" | "day" | "week" | "month" | "year";

export type TrainingX01Session = {
  id: string;
  date: number; // timestamp (ms)
  profileId: string;
  darts: number; // nb total de fléchettes
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
  // détail flèche par flèche pour le radar
  dartsDetail?: UIDart[];
};

const TRAINING_X01_STATS_KEY = "dc_training_x01_stats_v1";

function loadTrainingSessions(): TrainingX01Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TRAINING_X01_STATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((row: any, idx: number) => ({
      id: row.id ?? String(idx),
      date: Number(row.date) || Date.now(),
      profileId: String(row.profileId ?? "unknown"),
      darts: Number(row.darts) || 0,
      avg3D: Number(row.avg3D) || 0,
      avg1D: Number(row.avg1D) || 0,
      bestVisit: Number(row.bestVisit) || 0,
      bestCheckout:
        row.bestCheckout === null || row.bestCheckout === undefined
          ? null
          : Number(row.bestCheckout),
      hitsS: Number(row.hitsS) || 0,
      hitsD: Number(row.hitsD) || 0,
      hitsT: Number(row.hitsT) || 0,
      miss: Number(row.miss) || 0,
      bull: Number(row.bull) || 0,
      dBull: Number(row.dBull) || 0,
      bust: Number(row.bust) || 0,
      dartsDetail: Array.isArray(row.dartsDetail)
        ? row.dartsDetail
        : undefined,
    }));
  } catch (e) {
    console.warn("[StatsHub] loadTrainingSessions failed", e);
    return [];
  }
}

function filterByRange(
  sessions: TrainingX01Session[],
  range: TimeRange
) {
  if (range === "all") return sessions;
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  let delta = ONE_DAY;
  if (range === "week") delta = 7 * ONE_DAY;
  if (range === "month") delta = 30 * ONE_DAY;
  if (range === "year") delta = 365 * ONE_DAY;

  const minDate = now - delta;
  return sessions.filter((s) => s.date >= minDate);
}

function formatShortDate(ts: number) {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
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

/** Normalise les joueurs d’un record :
 * - prend rec.players sinon rec.payload.players
 * - injecte avatarDataUrl/name depuis le store si manquant
 * - reflète aussi dans rec.payload.players pour les composants qui le lisent
 */
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
    } as PlayerLite;
  });

  // retourne un nouvel objet pour ne rien muter
  return {
    ...rec,
    players: withAvatars,
    payload: { ...(rec.payload ?? {}), players: withAvatars },
  };
}

/* ---------- Hooks ---------- */
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
    return () => window.removeEventListener("dc-history-updated", onUpd);
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

/* ---------- Adaptateur -> PlayerDashboardStats (fusion QUICK + fallback Historique) ---------- */
function buildDashboardForPlayer(
  player: PlayerLite,
  records: SavedMatch[],
  quick?:
    | {
        avg3: number;
        bestVisit: number;
        bestCheckout?: number;
        winRatePct: number;
        buckets: Record<string, number>;
      }
    | null
): PlayerDashboardStats {
  const pid = player.id;
  const pname = player.name || "Joueur";

  // ==== Fallback: calcule depuis l'historique si quick vide ====
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

  const toArrLoc = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);
  const Nloc = (x: any, d = 0) =>
    Number.isFinite(Number(x)) ? Number(x) : d;

  const byDate: { t: number; a3: number }[] = [];

  for (const r of records) {
    // Matchs où le joueur a participé
    const inMatch = toArrLoc<PlayerLite>(r.players).some(
      (p) => p?.id === pid
    );
    if (!inMatch) continue;

    fbMatches++;

    const ss: any = r.summary ?? r.payload?.summary ?? {};
    const per: any[] =
      ss.perPlayer ??
      ss.players ??
      r.payload?.summary?.perPlayer ??
      [];

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
        t: Nloc(r.updatedAt ?? r.createdAt, Date.now()),
        a3,
      });
    }

    fbAvg3 += a3;
    fbBestVisit = Math.max(fbBestVisit, bestV);
    fbBestCO = Math.max(fbBestCO, bestCO);

    if (r.winnerId && r.winnerId === pid) fbWins++;

    // Buckets
    const buckets =
      ss.buckets?.[pid] ?? pstat.buckets ?? null;

    if (buckets) {
      fbBuckets["0-59"] += Nloc(buckets["0-59"]);
      fbBuckets["60-99"] += Nloc(buckets["60-99"]);
      fbBuckets["100+"] += Nloc(buckets["100+"]);
      fbBuckets["140+"] += Nloc(buckets["140+"]);
      fbBuckets["180"] += Nloc(buckets["180"]);
    } else if (Array.isArray(r.payload?.legs)) {
      for (const leg of r.payload.legs as any[]) {
        const pp = toArrLoc<any>(leg.perPlayer).find(
          (x) => x.playerId === pid
        );
        const v = Nloc(pp?.bestVisit);
        if (v >= 180) fbBuckets["180"]++;
        else if (v >= 140) fbBuckets["140+"]++;
        else if (v >= 100) fbBuckets["100+"]++;
        else if (v >= 60) fbBuckets["60-99"]++;
        else if (v > 0) fbBuckets["0-59"]++;
      }
    }
  }

  byDate.sort((a, b) => a.t - b.t);
  for (const it of byDate.slice(-20)) {
    evo.push({
      date: new Date(it.t).toLocaleDateString(),
      avg3: it.a3,
    });
  }

  const fbAvg3Mean =
    fbMatches > 0 ? +(fbAvg3 / fbMatches).toFixed(2) : 0;
  const fbWinPct =
    fbMatches > 0
      ? Math.round((fbWins / fbMatches) * 1000) / 10
      : 0;

  const avg3Overall = quick?.avg3 ?? fbAvg3Mean;
  const bestVisit = quick?.bestVisit ?? fbBestVisit;
  const bestCheckout = quick?.bestCheckout ?? (fbBestCO || undefined);
  const winRatePct = Number.isFinite(
    quick?.winRatePct as any
  )
    ? quick!.winRatePct
    : fbWinPct;
  const distribution = quick?.buckets
    ? {
        "0-59": N(quick.buckets["0-59"]),
        "60-99": N(quick.buckets["60-99"]),
        "100+": N(quick.buckets["100+"]),
        "140+": N(quick.buckets["140+"]),
        "180": N(quick.buckets["180"]),
      }
    : fbBuckets;

  const evolution = evo.length
    ? evo
    : [
        {
          date: new Date().toLocaleDateString(),
          avg3: avg3Overall,
        },
      ];

  return {
    playerId: pid,
    playerName: pname,
    avg3Overall,
    bestVisit,
    winRatePct,
    bestCheckout,
    evolution,
    distribution,
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

/* ---------- ONGLET TRAINING X01 (sparkline + radar + liste) ---------- */
function TrainingX01StatsTab() {
  const [sessions, setSessions] =
    React.useState<TrainingX01Session[]>([]);
  const [range, setRange] =
    React.useState<TimeRange>("all");
  const [selected, setSelected] =
    React.useState<TrainingX01Session | null>(null);
  const [metric, setMetric] =
    React.useState<
      "darts" | "avg3D" | "pctS" | "pctD" | "pctT" | "BV" | "CO"
    >("avg3D");

  React.useEffect(() => {
    setSessions(loadTrainingSessions());
  }, []);

  const filtered = React.useMemo(
    () =>
      filterByRange(sessions, range).sort(
        (a, b) => a.date - b.date
      ),
    [sessions, range]
  );

  const totalSessions = filtered.length;
  const totalDarts = filtered.reduce(
    (sum, s) => sum + (s.darts || 0),
    0
  );
  const avgDarts =
    totalSessions > 0 ? totalDarts / totalSessions : 0;
  const bestAvg3D = filtered.reduce(
    (max, s) => (s.avg3D > max ? s.avg3D : max),
    0
  );
  const bestVisit = filtered.reduce(
    (max, s) => (s.bestVisit > max ? s.bestVisit : max),
    0
  );
  const bestCheckout = filtered.reduce(
    (max, s) =>
      s.bestCheckout && s.bestCheckout > max
        ? s.bestCheckout
        : max,
    0
  );

  const globalAvg3D =
  totalSessions > 0
    ? filtered.reduce((s, x) => s + x.avg3D, 0) / totalSessions
    : 0;

  const globalAvg1D =
  totalSessions > 0
    ? filtered.reduce((s, x) => s + x.avg1D, 0) / totalSessions
    : 0;

  /* ---------- Agrégation fléchettes pour stats détaillées / radar ---------- */

  let gHitsS = 0,
    gHitsD = 0,
    gHitsT = 0,
    gMiss = 0,
    gBull = 0,
    gDBull = 0,
    gBust = 0;

  for (const s of filtered) {
    // si la session a déjà des compteurs -> on les utilise
    if (
      (s.hitsS ?? 0) +
        (s.hitsD ?? 0) +
        (s.hitsT ?? 0) +
        (s.miss ?? 0) +
        (s.bull ?? 0) +
        (s.dBull ?? 0) +
        (s.bust ?? 0) >
      0
    ) {
      gHitsS += s.hitsS ?? 0;
      gHitsD += s.hitsD ?? 0;
      gHitsT += s.hitsT ?? 0;
      gMiss += s.miss ?? 0;
      gBull += s.bull ?? 0;
      gDBull += s.dBull ?? 0;
      gBust += s.bust ?? 0;
      continue;
    }

    // sinon, fallback depuis dartsDetail si dispo
    if (Array.isArray(s.dartsDetail)) {
      for (const d of s.dartsDetail) {
        const v = Number((d as any)?.v) || 0;
        const mult = Number((d as any)?.mult) || 0;
        if (v === 0 || mult === 0) {
          gMiss++;
        } else {
          if (v === 25 && mult === 2) gDBull++;
          else if (v === 25) gBull++;
          if (mult === 1) gHitsS++;
          else if (mult === 2) gHitsD++;
          else if (mult === 3) gHitsT++;
        }
      }
    }
  }

  const totalHits = gHitsS + gHitsD + gHitsT;
  const hitsPercent =
    totalHits + gMiss > 0
      ? (totalHits / (totalHits + gMiss)) * 100
      : 0;
  const simplePercent =
    totalHits > 0 ? (gHitsS / totalHits) * 100 : 0;
  const doublePercent =
    totalHits > 0 ? (gHitsD / totalHits) * 100 : 0;
  const triplePercent =
    totalHits > 0 ? (gHitsT / totalHits) * 100 : 0;

  const allDartsDetail =
    filtered.flatMap((s) => s.dartsDetail ?? []) ?? [];

  /* ---------- Sparkline façon TrainingX01Play ---------- */

  function valueForMetric(
    s: TrainingX01Session,
    m:
      | "darts"
      | "avg3D"
      | "pctS"
      | "pctD"
      | "pctT"
      | "BV"
      | "CO"
  ): number {
    switch (m) {
      case "darts":
        return s.darts || 0;
      case "avg3D":
        return s.avg3D || 0;
      case "pctS": {
        const total =
          (s.hitsS || 0) + (s.hitsD || 0) + (s.hitsT || 0);
        return total > 0
          ? ((s.hitsS || 0) / total) * 100
          : 0;
      }
      case "pctD": {
        const total =
          (s.hitsS || 0) + (s.hitsD || 0) + (s.hitsT || 0);
        return total > 0
          ? ((s.hitsD || 0) / total) * 100
          : 0;
      }
      case "pctT": {
        const total =
          (s.hitsS || 0) + (s.hitsD || 0) + (s.hitsT || 0);
        return total > 0
          ? ((s.hitsT || 0) / total) * 100
          : 0;
      }
      case "BV":
        return s.bestVisit || 0;
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

  /* ---------- Styles ---------- */

  // 4 KPI du haut
  const baseKpiBox: React.CSSProperties = {
    borderRadius: 22,
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    background: "linear-gradient(180deg,#15171B,#101115)",
  };

  const makeKpiBox = (accent: string): React.CSSProperties => ({
    ...baseKpiBox,
    border: `1px solid ${accent}`,
    boxShadow: `0 0 0 1px ${accent}40, 0 0 22px ${accent}55`,
  });

  const kpiLabel: React.CSSProperties = {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* FILTRES J/S/M/A */}
      <div style={{ ...card, padding: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 15 }}>
            Training X01
          </div>
          <div
            style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
          >
            {(["day", "week", "month", "year", "all"] as TimeRange[]).map(
              (r) => (
                <GoldPill
                  key={r}
                  active={range === r}
                  onClick={() => setRange(r)}
                >
                  {r === "day" && "Jour"}
                  {r === "week" && "Semaine"}
                  {r === "month" && "Mois"}
                  {r === "year" && "Année"}
                  {r === "all" && "Total"}
                </GoldPill>
              )
            )}
          </div>
        </div>
      </div>

      {/* 4 BLOCS DU HAUT AVEC AURA COULEUR = TEXTE */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {/* Sessions (or) */}
        <div style={makeKpiBox(T.gold)}>
          <div style={kpiLabel}>Sessions</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: T.gold,
            }}
          >
            {totalSessions}
          </div>
        </div>

        {/* Moy. darts / session (or) */}
        <div style={makeKpiBox(T.gold)}>
          <div style={kpiLabel}>Moy. darts / session</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: T.gold,
            }}
          >
            {avgDarts.toFixed(1)}
          </div>
        </div>

        {/* Meilleure Moy.3D (bleu ciel) */}
        <div style={makeKpiBox("#47B5FF")}>
          <div style={kpiLabel}>Meilleure Moy.3D</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#47B5FF",
            }}
          >
            {bestAvg3D.toFixed(1)}
          </div>
        </div>

        {/* Best visit / checkout (vert clair) */}
        <div style={makeKpiBox("#7CFF9A")}>
          <div style={kpiLabel}>Best visit / checkout</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            <span style={{ color: "#FFFFFF" }}>BV </span>
            <span style={{ color: "#47B5FF" }}>{bestVisit}</span>
            <span style={{ color: "#FFFFFF" }}> — CO </span>
            <span style={{ color: "#7CFF9A" }}>
              {bestCheckout}
            </span>
          </div>
        </div>
      </div>

      {/* ⚠️ Bloc "Aucune session de training..." SUPPRIMÉ */}
      {/* SPARKLINE PRO + PANNEAU DÉROULANT */}
      <div style={card}>
        {/* Titre seul */}
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
              color: T.text70,
            }}
          >
            Progression
          </div>
        </div>

        {/* Sparkline + panneau déroulant */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr minmax(120px,1.1fr)",
            gap: 10,
            alignItems: "stretch",
          }}
        >
          {/* Sparkline elle-même */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            {sparkSeries.length ? (
              <SparklinePro
                points={sparkSeries.map((p) => ({
                  x: p.x,
                  y: p.y,
                }))}
                height={64}
              />
            ) : (
              <div
                style={{
                  fontSize: 12,
                  color: T.text70,
                }}
              >
                Aucune session sur la période.
              </div>
            )}
          </div>

          {/* Panneau déroulant avec les valeurs des points */}
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
              .map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 6,
                    padding: "2px 0",
                  }}
                >
                  <span
                    style={{
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatShortDate(p.session.date)}
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: T.gold,
                    }}
                  >
                    {p.y.toFixed(1)}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Sous la sparkline : sélecteur de métrique (+ éventuel TimeSelector à droite) */}
        <div
          style={{
            marginTop: 8,
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {/* MetricSelector */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
            }}
          >
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
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setMetric(key)}
                style={{
                  ...metricPill,
                  borderColor:
                    metric === key
                      ? T.gold
                      : "rgba(255,255,255,.18)",
                  color: metric === key ? T.gold : T.text70,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Ici tu peux brancher ton TimeSelector si tu veux les J/S/M/A à droite
          <TimeSelector range={range} onChange={setRange} />
          */}
        </div>
      </div>

      {/* RADAR */}
      <div style={card}>
        <div
          style={{
            fontSize: 13,
            color: T.text70,
            marginBottom: 6,
          }}
        >
          Radar — toutes les fléchettes
        </div>
        {allDartsDetail.length ? (
          <TrainingRadar darts={allDartsDetail} />
        ) : (
          <div style={{ fontSize: 12, color: T.text70 }}>
            Aucune fléchette enregistrée sur la période.
          </div>
        )}
      </div>

                  {/* STATS DÉTAILLÉES — reproduction style bronze/doré TrainingX01Play */}
      <div
        style={{
          borderRadius: 26,
          padding: 16,
          background:
            "linear-gradient(180deg,#141416,#0E0F12)",
          border: "1px solid rgba(255,255,255,.14)",
          boxShadow: "0 12px 26px rgba(0,0,0,.65)",
        }}
      >
        {/* ENTÊTE */}
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: T.gold,
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          Stats détaillées (période)
        </div>

        {/* Groupes de lignes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Ligne 1 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              borderBottom: "1px solid rgba(246,194,86,.35)",
              fontSize: 13,
            }}
          >
            <span style={{ color: T.text70 }}>Moy.3D</span>
            <span style={{ fontWeight: 700 }}>{globalAvg3D.toFixed(1)}</span>
          </div>

          {/* Ligne 2 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              borderBottom: "1px solid rgba(246,194,86,.35)",
              fontSize: 13,
            }}
          >
            <span style={{ color: T.text70 }}>Moy.1D</span>
            <span style={{ fontWeight: 700 }}>{globalAvg1D.toFixed(2)}</span>
          </div>

          {/* Ligne 3 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              borderBottom: "1px solid rgba(246,194,86,.35)",
              fontSize: 13,
            }}
          >
            <span style={{ color: T.text70 }}>Best Visit</span>
            <span style={{ fontWeight: 700 }}>{bestVisit}</span>
          </div>

          {/* Ligne 4 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              borderBottom: "1px solid rgba(246,194,86,.35)",
              fontSize: 13,
            }}
          >
            <span style={{ color: T.text70 }}>Darts</span>
            <span style={{ fontWeight: 700 }}>{totalDarts}</span>
          </div>

          {/* Ligne 5 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              borderBottom: "1px solid rgba(246,194,86,.35)",
              fontSize: 13,
            }}
          >
            <span style={{ color: T.text70 }}>%Hits</span>
            <span style={{ fontWeight: 700 }}>{hitsPercent.toFixed(1)}%</span>
          </div>
        </div>

        {/* Bloc S / D / T */}
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid rgba(246,194,86,.35)",
            display: "flex",
            justifyContent: "space-around",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ color: T.text70, fontSize: 11 }}>S%</div>
            <div style={{ fontWeight: 700 }}>{simplePercent.toFixed(1)}%</div>
          </div>
          <div>
            <div style={{ color: T.text70, fontSize: 11 }}>D%</div>
            <div style={{ fontWeight: 700 }}>{doublePercent.toFixed(1)}%</div>
          </div>
          <div>
            <div style={{ color: T.text70, fontSize: 11 }}>T%</div>
            <div style={{ fontWeight: 700 }}>{triplePercent.toFixed(1)}%</div>
          </div>
        </div>

        {/* Miss / Bull / DBull / Bust */}
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid rgba(246,194,86,.35)",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            textAlign: "center",
            gap: 4,
          }}
        >
          <div>
            <div style={{ color: T.text70, fontSize: 11 }}>Miss</div>
            <div style={{ fontWeight: 700 }}>{gMiss}</div>
          </div>

          <div>
            <div style={{ color: T.text70, fontSize: 11 }}>Bull</div>
            <div style={{ fontWeight: 700 }}>{gBull}</div>
          </div>

          <div>
            <div style={{ color: T.text70, fontSize: 11 }}>DBull</div>
            <div style={{ fontWeight: 700 }}>{gDBull}</div>
          </div>

          <div>
            <div style={{ color: T.text70, fontSize: 11 }}>Bust</div>
            <div style={{ fontWeight: 700 }}>{gBust}</div>
          </div>
        </div>
      </div>

      {/* LISTE DES DERNIÈRES SESSIONS */}
      <div style={card}>
        <div
          style={{
            fontWeight: 800,
            marginBottom: 6,
          }}
        >
          Dernières sessions
        </div>

        {filtered.length === 0 && (
          <div style={{ fontSize: 12, color: T.text70 }}>
            Aucune session de training enregistrée pour
            l’instant.
          </div>
        )}

        {filtered
          .slice()
          .reverse()
          .slice(0, 30)
          .map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              style={{
                width: "100%",
                textAlign: "left",
                marginTop: 6,
                padding: 8,
                borderRadius: 12,
                background: "rgba(0,0,0,.45)",
                border: "none",
                color: T.text,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: T.text70,
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
                  color: T.text70,
                }}
              >
                <span>{s.darts} darts</span>
                <span>
                  BV {s.bestVisit}{" "}
                  {s.bestCheckout
                    ? `• CO ${s.bestCheckout}`
                    : ""}
                </span>
              </div>
            </button>
          ))}
      </div>

      {/* Modal détail session (inchangé, tu peux le garder si tu l’avais déjà) */}
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
              maxWidth: 320,
              width: "90%",
            }}
          >
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
                Session du{" "}
                {formatShortDate(selected.date)}
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
                <span>
                  {selected.bestCheckout ?? "—"}
                </span>
              </div>
              <div style={statRowBox}>
                <span>S / D / T</span>
                <span>
                  {(selected.hitsS ?? 0)} /{" "}
                  {(selected.hitsD ?? 0)} /{" "}
                  {(selected.hitsT ?? 0)}
                </span>
              </div>
              <div style={statRowBox}>
                <span>Miss / Bust</span>
                <span>
                  {(selected.miss ?? 0)} /{" "}
                  {(selected.bust ?? 0)}
                </span>
              </div>
              <div style={statRowBox}>
                <span>Bull / DBull</span>
                <span>
                  {(selected.bull ?? 0)} /{" "}
                  {(selected.dBull ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
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

  // 2) Fusion & déduplication (par id, conserve la version la plus récente)
  const records = React.useMemo(() => {
    const byId = new Map<string, SavedMatch>();
    const push = (r: any) => {
      const rec = toObj<SavedMatch>(r);
      if (!rec.id) return;
      const prev = byId.get(rec.id);
      const curT = N(rec.updatedAt ?? rec.createdAt, 0);
      const prevT = N(prev?.updatedAt ?? prev?.createdAt, -1);
      if (!prev || curT > prevT) byId.set(rec.id, rec);
    };
    persisted.forEach(push);
    mem.forEach(push);
    fromStore.forEach(push);

    // 2bis) Normalise les joueurs + avatars pour TOUS les records
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
                onClick={() =>
                  setOpenPlayers((o) => !o)
                }
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
                      avatarDataUrl={
                        p.avatarDataUrl || undefined
                      }
                      active={p.id === selectedPlayer?.id}
                      onClick={() =>
                        setSelectedPlayerId(p.id)
                      }
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

          {/* ===== Dashboard joueur ===== */}
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
              Sélectionne un joueur pour afficher ses
              stats.
            </div>
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
