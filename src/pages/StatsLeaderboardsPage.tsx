// @ts-nocheck
// =============================================================
// src/pages/StatsLeaderboardsPage.tsx
// Page CLASSEMENTS globale (tous profils)
// - Accès depuis StatsShell via go("stats_leaderboards")
// - Agrège TOUT l'historique (IndexedDB History + store.history)
// - Support X01 V3 (payload.variant === "x01_v3" / payload.mode === "x01_multi")
// - Filtre période (D/W/M/Y/ALL/TOUT)
// =============================================================

import * as React from "react";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ProfileAvatar from "../components/ProfileAvatar";
import { History } from "../lib/history";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

type Scope = "local" | "online";

type LeaderboardMode =
  | "x01_multi"
  | "cricket"
  | "killer"
  | "shanghai"
  | "battle_royale"
  | "clock";

type PeriodKey = "D" | "W" | "M" | "Y" | "ALL" | "TOUT";

type MetricKey =
  | "wins"
  | "winRate"
  | "matches"
  | "avg3"
  | "bestVisit"
  | "bestCheckout";

type Row = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  wins: number;
  losses: number;
  matches: number;
  winRate: number;
  avg3: number;
  bestVisit: number;
  bestCheckout: number;
};

// ------ DEFS MODE + METRICS ---

const MODE_DEFS: {
  id: LeaderboardMode;
  label: string;
  metrics: MetricKey[];
}[] = [
  {
    id: "x01_multi",
    label: "X01 MULTI",
    metrics: ["avg3", "wins", "winRate", "matches", "bestVisit", "bestCheckout"],
  },
  { id: "cricket", label: "CRICKET", metrics: ["winRate", "wins", "matches"] },
  { id: "killer", label: "KILLER", metrics: ["wins", "winRate", "matches"] },
  { id: "shanghai", label: "SHANGHAI", metrics: ["wins", "winRate", "matches"] },
  {
    id: "battle_royale",
    label: "BATTLE ROYALE",
    metrics: ["wins", "winRate", "matches"],
  },
  { id: "clock", label: "TOUR DE L’HORLOGE", metrics: ["wins", "winRate", "matches"] },
];

// ------------------------------
// Helpers
// ------------------------------

function numOr0(...values: any[]): number {
  for (const v of values) {
    if (v === undefined || v === null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function periodToMs(p: PeriodKey): number {
  const day = 24 * 60 * 60 * 1000;
  switch (p) {
    case "D":
      return day;
    case "W":
      return 7 * day;
    case "M":
      return 31 * day;
    case "Y":
      return 366 * day;
    case "ALL":
    case "TOUT":
    default:
      return 0;
  }
}

function getRecTimestamp(rec: any): number {
  return (
    numOr0(
      rec?.updatedAt,
      rec?.createdAt,
      rec?.summary?.updatedAt,
      rec?.summary?.finishedAt,
      rec?.payload?.updatedAt,
      rec?.payload?.createdAt,
      rec?.payload?.summary?.updatedAt
    ) || 0
  );
}

function inPeriod(rec: any, period: PeriodKey): boolean {
  if (period === "ALL" || period === "TOUT") return true;
  const dt = getRecTimestamp(rec);
  if (!dt) return true; // si pas de date fiable, on ne jette pas
  const span = periodToMs(period);
  if (!span) return true;
  return Date.now() - dt <= span;
}

// extrait un map per-player à partir de summary
function extractPerPlayerSummary(summary: any): Record<string, any> {
  if (!summary) return {};
  const result: Record<string, any> = {};

  // ✅ V3: detailedByPlayer
  if (summary.detailedByPlayer && typeof summary.detailedByPlayer === "object") {
    return summary.detailedByPlayer as Record<string, any>;
  }

  // ✅ V3/V2: perPlayer[]
  if (Array.isArray(summary.perPlayer)) {
    for (const p of summary.perPlayer) {
      const pid = p.playerId || p.profileId || p.id;
      if (!pid) continue;
      result[pid] = p;
    }
  }

  // ✅ V2/V1: players map
  if (summary.players && typeof summary.players === "object") {
    for (const [pid, p] of Object.entries(summary.players)) {
      if (!pid) continue;
      result[String(pid)] = p as any;
    }
  }

  return result;
}

type Agg = {
  wins: number;
  matches: number;
  avg3Sum: number;
  avg3Count: number;
  bestVisit: number;
  bestCheckout: number;
};

type ExtraInfo = {
  name?: string;
  avatarDataUrl?: string | null;
};

function isRecordMatchingMode(rec: any, mode: LeaderboardMode, scope: Scope): boolean {
  // scope online/local : pour l’instant on ne segmente pas réellement
  // (tu pourras plus tard filtrer via rec.origin / rec.isOnline / etc.)
  void scope;

  const kind = rec?.kind || rec?.summary?.kind || rec?.payload?.kind;
  const payloadMode = rec?.payload?.mode;
  const payloadVariant = rec?.payload?.variant;
  const game = rec?.payload?.game || rec?.summary?.game?.mode || rec?.summary?.game?.game;

  // ✅ X01 MULTI : accepter V3
  const isX01 =
    kind === "x01" ||
    game === "x01" ||
    rec?.summary?.game?.mode === "x01" ||
    payloadVariant === "x01_v3" ||
    payloadMode === "x01_multi" ||
    payloadMode === "x01_teams";

  if (mode === "x01_multi") return isX01;

  // autres modes : stub (à compléter quand tu stockes ces kinds)
  if (mode === "cricket") return kind === "cricket" || game === "cricket";
  if (mode === "killer") return kind === "killer" || game === "killer";
  if (mode === "shanghai") return kind === "shanghai" || game === "shanghai";
  if (mode === "battle_royale") return kind === "battle_royale" || game === "battle_royale";
  if (mode === "clock") return kind === "clock" || game === "clock";

  return true;
}

function computeRowsFromHistory(
  history: any[],
  profiles: Profile[],
  mode: LeaderboardMode,
  scope: Scope,
  period: PeriodKey
): Row[] {
  if (import.meta.env.DEV) {
    console.log("[Leaderboards] history size =", history.length);
  }

  const aggByPlayer: Record<string, Agg> = {};
  const infoByPlayer: Record<string, ExtraInfo> = {};
  const profileById: Record<string, Profile> = {};

  // seed profils locaux (si existants)
  for (const p of profiles || []) {
    profileById[p.id] = p;
    aggByPlayer[p.id] = {
      wins: 0,
      matches: 0,
      avg3Sum: 0,
      avg3Count: 0,
      bestVisit: 0,
      bestCheckout: 0,
    };
    infoByPlayer[p.id] = {
      name: p.name,
      avatarDataUrl: (p as any).avatarDataUrl ?? null,
    };
  }

  for (const rec of history || []) {
    if (!rec) continue;

    // filtre période
    if (!inPeriod(rec, period)) continue;

    // filtre mode
    if (!isRecordMatchingMode(rec, mode, scope)) continue;

    const winnerId =
      rec.winnerId ||
      rec.payload?.winnerId ||
      rec.summary?.winnerId ||
      rec.payload?.summary?.winnerId ||
      null;

    const summary = rec.summary || rec.payload?.summary || null;
    const per = extractPerPlayerSummary(summary);

    // 1) summary.detailedByPlayer / perPlayer / players-map
    if (per && Object.keys(per).length > 0) {
      for (const key of Object.keys(per)) {
        const det: any = per[key] || {};
        const pid: string = det.profileId || det.playerId || det.id || key;
        if (!pid) continue;

        if (!aggByPlayer[pid]) {
          aggByPlayer[pid] = {
            wins: 0,
            matches: 0,
            avg3Sum: 0,
            avg3Count: 0,
            bestVisit: 0,
            bestCheckout: 0,
          };
        }

        if (!infoByPlayer[pid]) {
          infoByPlayer[pid] = {
            name: det.name || "",
            avatarDataUrl: det.avatarDataUrl ?? null,
          };
        }

        const agg = aggByPlayer[pid];

        // matches & wins
        agg.matches += 1;
        if (winnerId && winnerId === pid) agg.wins += 1;

        // avg3
        const avg3Candidate = numOr0(det.avg3, det.moy3, det.avg, det.avg3d);
        if (avg3Candidate > 0) {
          agg.avg3Sum += avg3Candidate;
          agg.avg3Count += 1;
        }

        // best visit
        const bvCandidate = numOr0(det.bestVisit, det.bv, det.bestVisit3, det.bv3);
        if (bvCandidate > 0) agg.bestVisit = Math.max(agg.bestVisit, bvCandidate);

        // best checkout
        const coCandidate = numOr0(det.bestCheckout, det.bestCo, det.coBest, det.co);
        if (coCandidate > 0) agg.bestCheckout = Math.max(agg.bestCheckout, coCandidate);
      }
      continue;
    }

    // 2) FALLBACK : rec.players / rec.payload.players
    const playersArr: any[] = Array.isArray(rec.players)
      ? rec.players
      : Array.isArray(rec.payload?.players)
      ? rec.payload.players
      : [];

    if (!playersArr.length) continue;

    for (const pl of playersArr) {
      const pid: string | undefined = pl.id || pl.profileId || pl.playerId || pl._id || pl.pid;
      const name = pl.name || pl.playerName || "";
      if (!pid && !name) continue;

      // si pas d'id, on agrège quand même par "name" (évite le vide quand profiles locaux inexistants)
      const key = pid || `name:${String(name).trim().toLowerCase()}`;
      if (!aggByPlayer[key]) {
        aggByPlayer[key] = {
          wins: 0,
          matches: 0,
          avg3Sum: 0,
          avg3Count: 0,
          bestVisit: 0,
          bestCheckout: 0,
        };
      }
      if (!infoByPlayer[key]) {
        infoByPlayer[key] = {
          name: name || "—",
          avatarDataUrl: pl.avatarDataUrl ?? null,
        };
      }

      const agg = aggByPlayer[key];
      agg.matches += 1;
      if (winnerId && pid && winnerId === pid) agg.wins += 1;
    }
  }

  const rows: Row[] = Object.keys(aggByPlayer).map((pid) => {
    const agg = aggByPlayer[pid];
    const prof = profileById[pid];
    const extra = infoByPlayer[pid] || {};

    const matches = agg.matches;
    const wins = agg.wins;
    const winRate = matches > 0 ? (wins / matches) * 100 : 0;
    const avg3 = agg.avg3Count > 0 ? agg.avg3Sum / agg.avg3Count : 0;

    return {
      id: pid,
      name: prof?.name || extra.name || "—",
      avatarDataUrl: (prof as any)?.avatarDataUrl ?? extra.avatarDataUrl ?? null,
      wins,
      losses: Math.max(0, matches - wins),
      matches,
      winRate,
      avg3,
      bestVisit: agg.bestVisit,
      bestCheckout: agg.bestCheckout,
    };
  });

  return rows;
}

// =============================================================

export default function StatsLeaderboardsPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const profiles: Profile[] = (store as any)?.profiles ?? [];

  const [scope, setScope] = React.useState<Scope>("local");
  const [mode, setMode] = React.useState<LeaderboardMode>("x01_multi");
  const [period, setPeriod] = React.useState<PeriodKey>("ALL");

  // source : store.history (si présent)
  const [historySource, setHistorySource] = React.useState<any[]>(
    (((store as any)?.history) as any[]) || []
  );

  // garde en synchro avec store.history
  React.useEffect(() => {
    setHistorySource(((((store as any)?.history) as any[]) || []) as any[]);
  }, [store]);

  // charge TOUT l'historique depuis IndexedDB (History)
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const api: any = History as any;
        let list: any[] = [];

        if (typeof api.getAll === "function") list = await api.getAll();
        else if (typeof api.list === "function") list = await api.list();
        else if (typeof api.getAllSorted === "function") list = await api.getAllSorted();

        if (alive && Array.isArray(list) && list.length) {
          if (import.meta.env.DEV) {
            console.log("[Leaderboards] IDB history size =", list.length);
          }
          setHistorySource(list);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.log("[Leaderboards] History IDB load error", err);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const initialMetric = MODE_DEFS.find((m) => m.id === mode)?.metrics[0] ?? "wins";
  const [metric, setMetric] = React.useState<MetricKey>(initialMetric);

  const currentModeDef = MODE_DEFS.find((m) => m.id === mode);
  const currentModeIndex = MODE_DEFS.findIndex((m) => m.id === mode);
  const metricList = currentModeDef?.metrics ?? [];
  const currentMetricIndex = Math.max(0, metricList.findIndex((m) => m === metric));

  React.useEffect(() => {
    const def = MODE_DEFS.find((m) => m.id === mode);
    if (!def) return;
    if (!def.metrics.includes(metric)) setMetric(def.metrics[0]);
  }, [mode, metric]);

  const cycleMode = (dir: "prev" | "next") => {
    if (!MODE_DEFS.length) return;
    let idx = currentModeIndex;
    if (idx < 0) idx = 0;
    const len = MODE_DEFS.length;
    const newIndex = dir === "prev" ? (idx - 1 + len) % len : (idx + 1) % len;
    setMode(MODE_DEFS[newIndex].id);
  };

  const cycleMetric = (dir: "prev" | "next") => {
    if (!metricList.length) return;
    let idx = currentMetricIndex;
    const len = metricList.length;
    const newIndex = dir === "prev" ? (idx - 1 + len) % len : (idx + 1) % len;
    setMetric(metricList[newIndex]);
  };

  // 🔥 construit lignes depuis historySource + filtre période + mode
  const rows = React.useMemo(() => {
    const baseRows = computeRowsFromHistory(historySource, profiles, mode, scope, period);

    const value = (r: Row): number => {
      switch (metric) {
        case "wins":
          return r.wins;
        case "winRate":
          return r.winRate;
        case "matches":
          return r.matches;
        case "avg3":
          return r.avg3;
        case "bestVisit":
          return r.bestVisit;
        case "bestCheckout":
          return r.bestCheckout;
        default:
          return 0;
      }
    };

    return [...baseRows].sort((a, b) => value(b) - value(a));
  }, [historySource, profiles, mode, scope, metric, period]);

  const hasData = rows.length > 0;

  const periodLabel = (p: PeriodKey) => {
    switch (p) {
      case "D":
        return "J";
      case "W":
        return "S";
      case "M":
        return "M";
      case "Y":
        return "A";
      case "ALL":
        return "All";
      case "TOUT":
        return "Tout";
    }
  };

  const metricLabel = (m: MetricKey) => {
    switch (m) {
      case "wins":
        return "Victoires";
      case "winRate":
        return "% Win";
      case "matches":
        return "Matchs joués";
      case "avg3":
        return "Moy. 3 darts";
      case "bestVisit":
        return "Best visit";
      case "bestCheckout":
        return "Best CO";
    }
  };

  const currentMetricLabel = metricLabel(metric) || t("stats.leaderboards.metric", "Stat");

  return (
    <div
      className="stats-leaderboards-page"
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 12,
        paddingTop: 20,
        background: theme.bg,
        color: theme.text,
      }}
    >
      {/* HEADER simple */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 900,
              letterSpacing: 0.9,
              textTransform: "uppercase",
              color: theme.primary,
              fontSize: 20,
              textShadow: `0 0 14px ${theme.primary}66`,
              marginBottom: 4,
            }}
          >
            {t("stats.leaderboards.titleMain", "CLASSEMENTS")}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.3, color: theme.textSoft }}>
            Classements globaux par mode de jeu et par stat.
          </div>
        </div>

        <button
          onClick={() => go("stats")}
          style={{
            borderRadius: 999,
            border: `1px solid ${theme.borderSoft}`,
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 700,
            background: theme.card,
            color: theme.textSoft,
            cursor: "pointer",
          }}
        >
          ← Retour
        </button>
      </div>

      {/* ---------- CARD : SCOPE + MODE ---------- */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 20,
          padding: 10,
          marginBottom: 14,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: `0 16px 32px rgba(0,0,0,.65), 0 0 20px ${theme.primary}33`,
        }}
      >
        {/* Scope LOCAL / ONLINE */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {(["local", "online"] as Scope[]).map((s) => {
            const active = s === scope;
            return (
              <button
                key={s}
                onClick={() => setScope(s)}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
                  padding: "6px 8px",
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  background: active ? `linear-gradient(135deg, ${theme.primary}, #ffea9a)` : "transparent",
                  color: active ? "#000" : theme.textSoft,
                  boxShadow: active ? `0 0 14px ${theme.primary}77` : "none",
                  cursor: "pointer",
                }}
              >
                {s === "local" ? "LOCAL" : "ONLINE"}
              </button>
            );
          })}
        </div>

        {/* Carrousel mode */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <button
            onClick={() => cycleMode("prev")}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: `1px solid ${theme.borderSoft}`,
              background: "#050608",
              color: theme.textSoft,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {"<"}
          </button>

          <div
            style={{
              flex: 1,
              borderRadius: 999,
              padding: "6px 10px",
              textAlign: "center",
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.95))",
              color: theme.primary,
              boxShadow: `0 0 14px ${theme.primary}33`,
            }}
          >
            {currentModeDef?.label ?? ""}
          </div>

          <button
            onClick={() => cycleMode("next")}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: `1px solid ${theme.borderSoft}`,
              background: "#050608",
              color: theme.textSoft,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {">"}
          </button>
        </div>
      </div>

      {/* ---------- PÉRIODE + STAT CARROUSEL ---------- */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 18,
          padding: 12,
          marginBottom: 10,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: `0 12px 26px rgba(0,0,0,.7)`,
        }}
      >
        {/* Bandeau période */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.7,
              color: theme.primary,
            }}
          >
            {t("stats.leaderboards.period", "Période")}
          </div>

          <div style={{ display: "flex", gap: 4 }}>
            {(["D", "W", "M", "Y", "ALL", "TOUT"] as PeriodKey[]).map((p) => {
              const active = p === period;
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    borderRadius: 999,
                    border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
                    padding: "3px 7px",
                    fontSize: 9,
                    fontWeight: 700,
                    background: active ? theme.primary : "transparent",
                    color: active ? "#000" : theme.textSoft,
                    cursor: "pointer",
                  }}
                >
                  {periodLabel(p)}
                </button>
              );
            })}
          </div>
        </div>

        {/* "Classement par" */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.7,
            color: theme.primary,
            marginBottom: 4,
          }}
        >
          {t("stats.leaderboards.sortBy", "Classement par")}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => cycleMetric("prev")}
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: `1px solid ${theme.borderSoft}`,
              background: "#050608",
              color: theme.textSoft,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {"<"}
          </button>

          <div
            style={{
              flex: 1,
              borderRadius: 999,
              padding: "5px 10px",
              textAlign: "center",
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.7,
              background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(0,0,0,0.95))",
              color: theme.primary,
              boxShadow: `0 0 10px ${theme.primary}33`,
            }}
          >
            {currentMetricLabel}
          </div>

          <button
            onClick={() => cycleMetric("next")}
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: `1px solid ${theme.borderSoft}`,
              background: "#050608",
              color: theme.textSoft,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {">"}
          </button>
        </div>
      </div>

      {/* ---------- BLOC CLASSEMENTS ---------- */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 18,
          padding: 10,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: `0 14px 30px rgba(0,0,0,.8)`,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            color: theme.textSoft,
            marginBottom: 6,
          }}
        >
          {t("stats.leaderboards.titleList", "Classements")}
        </div>

        {!hasData ? (
          <div style={{ padding: 16, textAlign: "center", fontSize: 11.5, color: theme.textSoft }}>
            {t("stats.leaderboards.empty", "Aucun profil enregistré sur cet appareil.")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rows.map((row, index) => {
              const rank = index + 1;
              const isFirst = rank === 1;
              const isSecond = rank === 2;
              const isThird = rank === 3;

              let rankColor = theme.textSoft;
              if (isFirst) rankColor = "#ffd700";
              else if (isSecond) rankColor = "#c0c0c0";
              else if (isThird) rankColor = "#cd7f32";

              let metricValue: string;
              switch (metric) {
                case "wins":
                  metricValue = `${row.wins}`;
                  break;
                case "winRate":
                  metricValue = `${row.winRate.toFixed(1)}%`;
                  break;
                case "matches":
                  metricValue = `${row.matches}`;
                  break;
                case "avg3":
                  metricValue = row.avg3.toFixed(1);
                  break;
                case "bestVisit":
                  metricValue = `${row.bestVisit}`;
                  break;
                case "bestCheckout":
                  metricValue = `${row.bestCheckout}`;
                  break;
                default:
                  metricValue = "0";
              }

              return (
                <div
                  key={row.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "6px 8px",
                    borderRadius: 12,
                    background: rank <= 3 ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.45)",
                    border: rank <= 3 ? `1px solid ${theme.primary}55` : `1px solid ${theme.borderSoft}`,
                  }}
                >
                  {/* Rang */}
                  <div style={{ width: 26, textAlign: "center", fontWeight: 900, fontSize: 13, color: rankColor }}>
                    {rank}
                  </div>

                  {/* Nom + avatar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        overflow: "hidden",
                        boxShadow: `0 0 8px ${theme.primary}33`,
                        border: `1px solid ${theme.borderSoft}`,
                        background: "#000",
                        flexShrink: 0,
                      }}
                    >
                      {row.avatarDataUrl ? (
                        <img
                          src={row.avatarDataUrl}
                          alt={row.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          draggable={false}
                        />
                      ) : (
                        <ProfileAvatar
                          size={30}
                          dataUrl={undefined}
                          label={row.name?.[0]?.toUpperCase() || "?"}
                          showStars={false}
                        />
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: theme.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row.name}
                    </div>
                  </div>

                  {/* Valeur + matchs */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: 11 }}>
                    <div style={{ fontWeight: 800, color: theme.primary }}>{metricValue}</div>
                    <div style={{ fontSize: 9.5, color: theme.textSoft }}>{row.matches} matchs</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ height: 80 }} />
    </div>
  );
}
