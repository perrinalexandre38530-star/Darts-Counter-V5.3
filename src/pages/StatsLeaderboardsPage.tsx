// @ts-nocheck
// =============================================================
// src/pages/StatsLeaderboardsPage.tsx
// Page CLASSEMENTS globale (tous profils)
// - Accès depuis StatsShell via go("stats_leaderboards")
// - Scope : LOCAL / ONLINE   (V1 : même source = store.history)
// - Modes : X01 MULTI / CRICKET / KILLER / SHANGHAI / BATTLE ROYALE / HORLOGE
// - Périodes : J / S / M / Y / All / Tout (V1 : visuel, pas encore de filtrage date)
// - Carrousel compact avec flèches (mode + métrique)
// - Classement global par mode / stat, basé sur store.history (summary/perPlayer)
// =============================================================

import * as React from "react";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ProfileAvatar from "../components/ProfileAvatar";

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

// ------ DEFS MODE + METRICS -----------------------------------

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
  {
    id: "cricket",
    label: "CRICKET",
    metrics: ["winRate", "wins", "matches"],
  },
  {
    id: "killer",
    label: "KILLER",
    metrics: ["wins", "winRate", "matches"],
  },
  {
    id: "shanghai",
    label: "SHANGHAI",
    metrics: ["wins", "winRate", "matches"],
  },
  {
    id: "battle_royale",
    label: "BATTLE ROYALE",
    metrics: ["wins", "winRate", "matches"],
  },
  {
    id: "clock",
    label: "TOUR DE L’HORLOGE",
    metrics: ["wins", "winRate", "matches"],
  },
];

// --------- Helpers AGGREGATION À PARTIR DE store.history ------

// mappe rec.kind → LeaderboardMode
function kindToMode(kind: string | null | undefined): LeaderboardMode | null {
  if (!kind) return null;
  const k = kind.toLowerCase();
  if (k.startsWith("x01") || k.includes("x01")) return "x01_multi";
  if (k.includes("cricket")) return "cricket";
  if (k.includes("killer")) return "killer";
  if (k.includes("shanghai")) return "shanghai";
  if (k.includes("battle")) return "battle_royale";
  if (k.includes("clock") || k.includes("horloge")) return "clock";
  return null;
}

// récupère un map per-player à partir de summary
function extractPerPlayerSummary(summary: any): Record<string, any> {
  if (!summary) return {};
  const result: Record<string, any> = {};

  if (summary.detailedByPlayer && typeof summary.detailedByPlayer === "object") {
    return summary.detailedByPlayer as Record<string, any>;
  }

  if (Array.isArray(summary.perPlayer)) {
    for (const p of summary.perPlayer) {
      const pid = p.playerId || p.profileId || p.id;
      if (!pid) continue;
      result[pid] = p;
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

function looksLikeX01Match(summary: any): boolean {
  if (!summary) return false;
  const per = extractPerPlayerSummary(summary);
  const vals = Object.values(per);
  if (!vals.length) return false;
  const sample: any = vals[0] || {};
  const avg3 = sample.avg3 ?? sample.moy3 ?? sample.avg ?? sample.avg3d;
  const bv = sample.bestVisit ?? sample.bv ?? sample.bestVisit3 ?? sample.bv3;
  const co =
    sample.bestCheckout ?? sample.bestCo ?? sample.coBest ?? sample.co;
  return (
    (typeof avg3 === "number" && avg3 > 0) ||
    (typeof bv === "number" && bv > 0) ||
    (typeof co === "number" && co > 0)
  );
}

function computeRowsFromHistory(
  store: Store,
  profiles: Profile[],
  mode: LeaderboardMode,
  scope: Scope
): Row[] {
  const history: any[] = (store.history || []) as any[];

  if (import.meta.env.DEV) {
    const kinds = Array.from(
      new Set(
        history.map(
          (r) => r?.kind || r?.payload?.kind || r?.payload?.mode || "??"
        )
      )
    );
    console.log("[Leaderboards] history size =", history.length, "; kinds:", kinds);
  }

  const aggByPlayer: Record<string, Agg> = {};
  const infoByPlayer: Record<string, ExtraInfo> = {};
  const profileById: Record<string, Profile> = {};

  for (const p of profiles) {
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

  for (const rec of history) {
    if (!rec) continue;

    const rawKind = rec.kind || rec.payload?.kind || rec.payload?.mode || null;
    let recMode = kindToMode(rawKind);

    const summary = rec.summary || rec.payload?.summary || null;
    const per = extractPerPlayerSummary(summary);

    if (!recMode && mode === "x01_multi" && looksLikeX01Match(summary)) {
      recMode = "x01_multi";
    }

    if (recMode !== mode) continue;
    if (!per || !Object.keys(per).length) continue;

    for (const key of Object.keys(per)) {
      const det: any = per[key] || {};
      const pid: string =
        det.profileId || det.playerId || det.id || key;

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
      if (rec.winnerId && rec.winnerId === pid) {
        agg.wins += 1;
      }

      // avg3
      const avg3Candidate =
        det.avg3 ?? det.moy3 ?? det.avg ?? det.avg3d ?? 0;
      if (typeof avg3Candidate === "number" && avg3Candidate > 0) {
        agg.avg3Sum += avg3Candidate;
        agg.avg3Count += 1;
      }

      // best visit
      const bvCandidate =
        det.bestVisit ?? det.bv ?? det.bestVisit3 ?? det.bv3 ?? 0;
      if (typeof bvCandidate === "number" && bvCandidate > 0) {
        if (bvCandidate > agg.bestVisit) agg.bestVisit = bvCandidate;
      }

      // best checkout
      const coCandidate =
        det.bestCheckout ??
        det.bestCo ??
        det.coBest ??
        det.co ??
        0;
      if (typeof coCandidate === "number" && coCandidate > 0) {
        if (coCandidate > agg.bestCheckout) agg.bestCheckout = coCandidate;
      }
    }
  }

  const rows: Row[] = Object.keys(aggByPlayer).map((pid) => {
    const agg = aggByPlayer[pid];
    const prof = profileById[pid];
    const extra = infoByPlayer[pid] || {};

    const matches = agg.matches;
    const wins = agg.wins;
    const winRate = matches > 0 ? (wins / matches) * 100 : 0;
    const avg3 =
      agg.avg3Count > 0 ? agg.avg3Sum / agg.avg3Count : 0;

    return {
      id: pid,
      name: prof?.name || extra.name || "—",
      avatarDataUrl:
        (prof as any)?.avatarDataUrl ??
        extra.avatarDataUrl ??
        null,
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

  const profiles: Profile[] = store?.profiles ?? [];

  const [scope, setScope] = React.useState<Scope>("local");
  const [mode, setMode] = React.useState<LeaderboardMode>("x01_multi");
  const [period, setPeriod] = React.useState<PeriodKey>("ALL");

  const initialMetric =
    MODE_DEFS.find((m) => m.id === mode)?.metrics[0] ?? "wins";
  const [metric, setMetric] = React.useState<MetricKey>(initialMetric);

  const currentModeDef = MODE_DEFS.find((m) => m.id === mode);
  const currentModeIndex = MODE_DEFS.findIndex((m) => m.id === mode);
  const metricList = currentModeDef?.metrics ?? [];
  const currentMetricIndex = Math.max(
    0,
    metricList.findIndex((m) => m === metric)
  );

  React.useEffect(() => {
    const def = MODE_DEFS.find((m) => m.id === mode);
    if (!def) return;
    if (!def.metrics.includes(metric)) {
      setMetric(def.metrics[0]);
    }
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

  const rows = React.useMemo(() => {
    if (!profiles.length) return [];
    const baseRows = computeRowsFromHistory(store, profiles, mode, scope);

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
  }, [store.history, profiles, mode, scope, metric]);

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

  const currentMetricLabel =
    metricLabel(metric) || t("stats.leaderboards.metric", "Stat");

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
      {/* HEADER simple, sans avatar global */}
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
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.3,
              color: theme.textSoft,
            }}
          >
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
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 8,
          }}
        >
          {(["local", "online"] as Scope[]).map((s) => {
            const active = s === scope;
            return (
              <button
                key={s}
                onClick={() => setScope(s)}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  border: active
                    ? `1px solid ${theme.primary}`
                    : `1px solid ${theme.borderSoft}`,
                  padding: "6px 8px",
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  background: active
                    ? `linear-gradient(135deg, ${theme.primary}, #ffea9a)`
                    : "transparent",
                  color: active ? "#000" : theme.textSoft,
                  boxShadow: active
                    ? `0 0 14px ${theme.primary}77`
                    : "none",
                  cursor: "pointer",
                }}
              >
                {s === "local" ? "LOCAL" : "ONLINE"}
              </button>
            );
          })}
        </div>

        {/* Carrousel mode : flèches + mode courant */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 4,
          }}
        >
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
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.95))",
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
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
          <div
            style={{
              display: "flex",
              gap: 4,
            }}
          >
            {(["D", "W", "M", "Y", "ALL", "TOUT"] as PeriodKey[]).map((p) => {
              const active = p === period;
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    borderRadius: 999,
                    border: active
                      ? `1px solid ${theme.primary}`
                      : `1px solid ${theme.borderSoft}`,
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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
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
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(0,0,0,0.95))",
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
          <div
            style={{
              padding: 16,
              textAlign: "center",
              fontSize: 11.5,
              color: theme.textSoft,
            }}
          >
            {t(
              "stats.leaderboards.empty",
              "Aucun profil enregistré sur cet appareil."
            )}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
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
                    background:
                      rank <= 3
                        ? "rgba(0,0,0,0.65)"
                        : "rgba(0,0,0,0.45)",
                    border:
                      rank <= 3
                        ? `1px solid ${theme.primary}55`
                        : `1px solid ${theme.borderSoft}`,
                  }}
                >
                  {/* Rang */}
                  <div
                    style={{
                      width: 26,
                      textAlign: "center",
                      fontWeight: 900,
                      fontSize: 13,
                      color: rankColor,
                    }}
                  >
                    {rank}
                  </div>

                  {/* Nom + avatar */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
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
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
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
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      fontSize: 11,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        color: theme.primary,
                      }}
                    >
                      {metricValue}
                    </div>
                    <div
                      style={{
                        fontSize: 9.5,
                        color: theme.textSoft,
                      }}
                    >
                      {row.matches} matchs
                    </div>
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
