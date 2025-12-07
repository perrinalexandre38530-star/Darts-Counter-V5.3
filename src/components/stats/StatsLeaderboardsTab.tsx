// ============================================================
// src/components/stats/StatsLeaderboardsTab.tsx
// Onglet "Classements" — centre de stats
// - Toggle Local / Online (Online WIP)
// - Carrousel modes (X01 Multi, X01 Solo, Cricket, Training…)
// - Filtres métriques (Wins, %Win, Avg3, BV, CO)
// - Filtres période (7j / 30j / 12m / Tout)
// - Tableau classement avec avatars dans le style X01 Multi
// ============================================================

import * as React from "react";
import type { CSSProperties } from "react";
import ProfileAvatar from "../ProfileAvatar";
import { GoldPill } from "../StatsPlayerDashboard";

type PlayerLite = {
  id: string;
  name?: string;
  avatarDataUrl?: string | null;
};

type SavedMatch = {
  id: string;
  game?: string;
  mode?: string;
  variant?: string;
  players?: PlayerLite[];
  winnerId?: string | null;
  createdAt?: number;
  updatedAt?: number;
  summary?: any;
  payload?: any;
};

type Props = {
  records: SavedMatch[];
};

type Scope = "local" | "online";
type GameKey =
  | "x01_multi"
  | "x01_solo"
  | "cricket"
  | "training_x01"
  | "clock";

type MetricKey =
  | "wins"
  | "winPct"
  | "matches"
  | "avg3"
  | "bestVisit"
  | "bestCheckout";

type RangeKey = "7d" | "30d" | "365d" | "all";

type LBRow = {
  playerId: string;
  name: string;
  avatarDataUrl?: string | null;
  matches: number;
  wins: number;
  winPct: number;
  avg3: number;
  bestVisit: number;
  bestCheckout: number;
};

const T = {
  gold: "#F6C256",
  text: "#FFFFFF",
  text70: "rgba(255,255,255,.70)",
  text40: "rgba(255,255,255,.40)",
  edge: "rgba(255,255,255,.10)",
  card: "linear-gradient(180deg,rgba(17,18,20,.96),rgba(8,9,12,.94))",
};

const card: CSSProperties = {
  background: T.card,
  border: `1px solid ${T.edge}`,
  borderRadius: 20,
  padding: 14,
  boxShadow: "0 14px 32px rgba(0,0,0,.65)",
};

const toArr = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);
const N = (x: any, d = 0) =>
  Number.isFinite(Number(x)) ? Number(x) : d;

function isOnlineRecord(r: SavedMatch): boolean {
  const mode = (r.mode || r.variant || "").toLowerCase();
  const summary = r.summary ?? r.payload?.summary ?? {};
  return (
    mode.includes("online") ||
    Boolean((r.payload as any)?.onlineMatchId) ||
    summary.isOnline === true
  );
}

function filterByRange(
  records: SavedMatch[],
  range: RangeKey
): SavedMatch[] {
  if (range === "all") return records;
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const delta =
    range === "7d"
      ? 7 * ONE_DAY
      : range === "30d"
      ? 30 * ONE_DAY
      : 365 * ONE_DAY;
  const minTs = now - delta;

  return records.filter((r) => {
    const ts = r.updatedAt ?? r.createdAt;
    if (!ts) return true; // si on ne sait pas → on garde
    return ts >= minTs;
  });
}

function isX01Match(r: SavedMatch): boolean {
  const g = (r.game || r.mode || r.variant || "").toLowerCase();
  if (!g) return false;
  if (g.includes("training")) return false;
  return g.includes("x01");
}

/**
 * Agrégateur X01 (multi) par joueur
 * - ne regarde que les matchs Local
 * - utilise summary.perPlayer si dispo
 */
function buildX01MultiLeaderboard(
  records: SavedMatch[],
  scope: Scope,
  range: RangeKey
): LBRow[] {
  const scoped = records.filter((r) =>
    scope === "local" ? !isOnlineRecord(r) : isOnlineRecord(r)
  );

  const ranged = filterByRange(scoped, range);

  const map = new Map<string, LBRow & { _sumAvg3: number }>();

  for (const r of ranged) {
    if (!isX01Match(r)) continue;

    const ss: any = r.summary ?? r.payload?.summary ?? {};
    const per: any[] =
      ss.perPlayer ??
      ss.players ??
      r.payload?.summary?.perPlayer ??
      [];

    const players = toArr<PlayerLite>(r.players);

    function getPStat(pid: string): any {
      const fromArr =
        per.find((x) => x?.playerId === pid) ?? null;
      const byId =
        ss[pid] ||
        ss.players?.[pid] ||
        ss.perPlayer?.[pid] ||
        null;
      return fromArr || byId || {};
    }

    // 1) matches + stats
    for (const p of players) {
      if (!p?.id) continue;
      const pid = p.id;

      let row = map.get(pid);
      if (!row) {
        row = {
          playerId: pid,
          name: p.name || "Joueur",
          avatarDataUrl: p.avatarDataUrl ?? null,
          matches: 0,
          wins: 0,
          winPct: 0,
          avg3: 0,
          bestVisit: 0,
          bestCheckout: 0,
          _sumAvg3: 0,
        };
        map.set(pid, row);
      }

      row.matches += 1;

      const st = getPStat(pid);

      const a3 =
        N(st.avg3) ||
        N(st.avg_3) ||
        N(st.avg3Darts) ||
        N(st.average3);

      const bestV = N(st.bestVisit);
      const bestCO = N(st.bestCheckout);

      if (a3 > 0) {
        row._sumAvg3 += a3;
      }
      if (bestV > row.bestVisit) row.bestVisit = bestV;
      if (bestCO > row.bestCheckout) row.bestCheckout = bestCO;
    }

    // 2) wins
    if (r.winnerId && map.has(r.winnerId)) {
      map.get(r.winnerId)!.wins += 1;
    }
  }

  // Finalisation : win% + avg3
  const out: LBRow[] = [];
  for (const row of map.values()) {
    const avg3 =
      row.matches > 0 ? row._sumAvg3 / row.matches : 0;
    const winPct =
      row.matches > 0 ? (row.wins / row.matches) * 100 : 0;

    out.push({
      playerId: row.playerId,
      name: row.name,
      avatarDataUrl: row.avatarDataUrl,
      matches: row.matches,
      wins: row.wins,
      winPct,
      avg3,
      bestVisit: row.bestVisit,
      bestCheckout: row.bestCheckout,
    });
  }

  return out;
}

function formatRangeLabel(range: RangeKey): string {
  switch (range) {
    case "7d":
      return "7 jours";
    case "30d":
      return "30 jours";
    case "365d":
      return "12 mois";
    case "all":
    default:
      return "Tout";
  }
}

export default function StatsLeaderboardsTab({
  records,
}: Props) {
  const [scope, setScope] = React.useState<Scope>("local");
  const [game, setGame] =
    React.useState<GameKey>("x01_multi");
  const [metric, setMetric] =
    React.useState<MetricKey>("wins");
  const [range, setRange] =
    React.useState<RangeKey>("all");

  // ====== LEADERBOARD DATA (X01 MULTI pour l'instant) ======
  const x01Rows = React.useMemo(
    () => buildX01MultiLeaderboard(records, scope, range),
    [records, scope, range]
  );

  function sortRows(rows: LBRow[]): LBRow[] {
    const get = (r: LBRow): number => {
      switch (metric) {
        case "wins":
          return r.wins;
        case "winPct":
          return r.winPct;
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

    return rows
      .slice()
      .sort((a, b) => {
        const va = get(a);
        const vb = get(b);
        if (vb !== va) return vb - va;
        // tie-break : plus de matchs > nom
        if (b.matches !== a.matches) {
          return b.matches - a.matches;
        }
        return a.name.localeCompare(b.name, "fr", {
          sensitivity: "base",
        });
      });
  }

  const rowsSorted =
    game === "x01_multi" ? sortRows(x01Rows) : [];

  const totalPlayers = rowsSorted.length;
  const totalMatches = rowsSorted.reduce(
    (s, r) => s + r.matches,
    0
  );

  const isX01Available = game === "x01_multi";
  const showOnlinePlaceholder =
    scope === "online";

  // ====== STYLES COURTS ======
  const headerTitle: CSSProperties = {
    fontSize: 14,
    fontWeight: 900,
    textTransform: "uppercase",
    color: T.gold,
    letterSpacing: 0.9,
    textAlign: "center",
    textShadow:
      "0 0 10px rgba(246,194,86,.9), 0 0 22px rgba(246,194,86,.5)",
  };

  const pillRow: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  };

  const metricPill: CSSProperties = {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    border: "1px solid rgba(255,255,255,.20)",
    background: "rgba(0,0,0,.60)",
    cursor: "pointer",
  };

  const smallLabel: CSSProperties = {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: T.text40,
  };

  // ====== RENDER ======
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* TITRE */}
      <div style={card}>
        <div style={headerTitle}>Classements</div>

        {/* LOCAL / ONLINE */}
        <div
          style={{
            marginTop: 10,
            display: "flex",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <GoldPill
            active={scope === "local"}
            onClick={() => setScope("local")}
          >
            LOCAL
          </GoldPill>
          <GoldPill
            active={scope === "online"}
            onClick={() => setScope("online")}
          >
            ONLINE
          </GoldPill>
        </div>

        {/* MODES DE JEU */}
        <div
          style={{
            marginTop: 10,
            ...pillRow,
          }}
        >
          {[
            ["x01_multi", "X01 Multi"],
            ["x01_solo", "X01 Solo"],
            ["cricket", "Cricket"],
            ["training_x01", "Training X01"],
            ["clock", "Tour de l’horloge"],
          ].map(([k, label]) => {
            const active = game === k;
            const disabled = k !== "x01_multi"; // pour l’instant, seul X01 multi est câblé
            return (
              <button
                key={k}
                onClick={() =>
                  !disabled && setGame(k as GameKey)
                }
                style={{
                  padding: "4px 12px",
                  borderRadius: 999,
                  border: `1px solid ${
                    active ? T.gold : "rgba(255,255,255,.25)"
                  }`,
                  background: disabled
                    ? "rgba(0,0,0,.40)"
                    : active
                    ? "linear-gradient(135deg,#F6C256,#FBE29A)"
                    : "rgba(0,0,0,.65)",
                  color: disabled
                    ? T.text40
                    : active
                    ? "#000"
                    : "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  cursor: disabled ? "default" : "pointer",
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* FILTRES PÉRIODE */}
        <div
          style={{
            marginTop: 10,
            display: "flex",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {(["7d", "30d", "365d", "all"] as RangeKey[]).map(
            (r) => (
              <GoldPill
                key={r}
                active={range === r}
                onClick={() => setRange(r)}
                style={{ fontSize: 11, paddingInline: 10 }}
              >
                {formatRangeLabel(r)}
              </GoldPill>
            )
          )}
        </div>

        {/* PETITS KPIs HEADER */}
        {isX01Available && (
          <div
            style={{
              marginTop: 10,
              display: "flex",
              justifyContent: "space-around",
              textAlign: "center",
            }}
          >
            <div>
              <div style={smallLabel}>Joueurs</div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 16,
                  color: "#FFFFFF",
                }}
              >
                {totalPlayers}
              </div>
            </div>
            <div>
              <div style={smallLabel}>Matches</div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 16,
                  color: "#FFFFFF",
                }}
              >
                {totalMatches}
              </div>
            </div>
            <div>
              <div style={smallLabel}>Période</div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 13,
                  color: T.gold,
                }}
              >
                {formatRangeLabel(range)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* METRIQUES (classement par…) */}
      {isX01Available && (
        <div style={card}>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              color: T.text70,
              marginBottom: 6,
            }}
          >
            Classement par :
          </div>

          <div style={pillRow}>
            {(
              [
                ["wins", "Victoires"],
                ["winPct", "% Win"],
                ["matches", "Matches joués"],
                ["avg3", "Moy. 3 darts"],
                ["bestVisit", "Best visit"],
                ["bestCheckout", "Best CO"],
              ] as [MetricKey, string][]
            ).map(([key, label]) => {
              const active = metric === key;
              return (
                <button
                  key={key}
                  onClick={() => setMetric(key)}
                  style={{
                    ...metricPill,
                    borderColor: active
                      ? T.gold
                      : "rgba(255,255,255,.18)",
                    color: active ? T.gold : T.text70,
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TABLEAU CLASSEMENT */}
      <div style={card}>
        {showOnlinePlaceholder && (
          <div
            style={{
              fontSize: 12,
              color: T.text70,
              textAlign: "center",
            }}
          >
            Classements <b>Online</b> en cours de
            développement. Pour l’instant, seuls les
            matchs <b>Locaux</b> sont pris en compte.
          </div>
        )}

        {!showOnlinePlaceholder && !isX01Available && (
          <div
            style={{
              fontSize: 12,
              color: T.text70,
              textAlign: "center",
            }}
          >
            Les classements pour ce mode de jeu seront
            ajoutés prochainement.
          </div>
        )}

        {!showOnlinePlaceholder &&
          isX01Available &&
          rowsSorted.length === 0 && (
            <div
              style={{
                fontSize: 12,
                color: T.text70,
                textAlign: "center",
              }}
            >
              Aucun match enregistré pour ce mode / période.
            </div>
          )}

        {!showOnlinePlaceholder &&
          isX01Available &&
          rowsSorted.length > 0 && (
            <div
              style={{
                marginTop: 4,
                borderRadius: 14,
                background:
                  "linear-gradient(180deg,#141418,#0B0C0F)",
                border: "1px solid rgba(255,255,255,.12)",
                overflow: "hidden",
              }}
            >
              {/* En-tête */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "32px minmax(0,1.9fr) 0.8fr 0.8fr 0.9fr 0.9fr 0.9fr 0.9fr",
                  padding: "6px 8px",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  background:
                    "linear-gradient(90deg,rgba(246,194,86,.16),transparent)",
                  borderBottom:
                    "1px solid rgba(255,255,255,.12)",
                  color: T.text70,
                }}
              >
                <div>#</div>
                <div>Joueur</div>
                <div style={{ textAlign: "right" }}>
                  MJ
                </div>
                <div style={{ textAlign: "right" }}>
                  V
                </div>
                <div style={{ textAlign: "right" }}>
                  % Win
                </div>
                <div style={{ textAlign: "right" }}>
                  Moy.3D
                </div>
                <div style={{ textAlign: "right" }}>
                  BV
                </div>
                <div style={{ textAlign: "right" }}>
                  CO
                </div>
              </div>

              {/* Lignes */}
              <div>
                {rowsSorted.map((r, idx) => {
                  const rank = idx + 1;
                  const isTop1 = rank === 1;
                  const isTop3 = rank <= 3;

                  const rowBg = isTop1
                    ? "linear-gradient(90deg,rgba(246,194,86,.25),rgba(122,78,17,.8))"
                    : idx % 2 === 0
                    ? "rgba(255,255,255,.02)"
                    : "rgba(255,255,255,.00)";

                  const rankBadgeBg = isTop1
                    ? "linear-gradient(135deg,#F6C256,#FFF1B8)"
                    : isTop3
                    ? "linear-gradient(135deg,#C0C6D8,#FFFFFF)"
                    : "rgba(0,0,0,.75)";

                  const rankBadgeColor = isTop1
                    ? "#000"
                    : "#fff";

                  return (
                    <div
                      key={r.playerId}
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "32px minmax(0,1.9fr) 0.8fr 0.8fr 0.9fr 0.9fr 0.9fr 0.9fr",
                        padding: "6px 8px",
                        alignItems: "center",
                        background: rowBg,
                        borderBottom:
                          "1px solid rgba(255,255,255,.04)",
                      }}
                    >
                      {/* Rang */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            minWidth: 22,
                            height: 22,
                            borderRadius: 999,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 800,
                            background: rankBadgeBg,
                            color: rankBadgeColor,
                            boxShadow: isTop3
                              ? "0 0 10px rgba(246,194,86,.65)"
                              : "none",
                          }}
                        >
                          {rank}
                        </div>
                      </div>

                      {/* Joueur : avatar + nom */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            overflow: "hidden",
                            boxShadow:
                              "0 0 8px rgba(0,0,0,.8)",
                            flexShrink: 0,
                          }}
                        >
                          {r.avatarDataUrl ? (
                            <img
                              src={r.avatarDataUrl}
                              alt={r.name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <ProfileAvatar
                              size={30}
                              dataUrl={undefined}
                              label={
                                r.name?.[0]?.toUpperCase() ||
                                "?"
                              }
                              showStars={false}
                            />
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {r.name}
                        </div>
                      </div>

                      {/* MJ */}
                      <div
                        style={{
                          textAlign: "right",
                          fontSize: 11,
                        }}
                      >
                        {r.matches}
                      </div>

                      {/* V */}
                      <div
                        style={{
                          textAlign: "right",
                          fontSize: 11,
                        }}
                      >
                        {r.wins}
                      </div>

                      {/* % Win */}
                      <div
                        style={{
                          textAlign: "right",
                          fontSize: 11,
                          color:
                            r.winPct >= 60
                              ? "#7CFF9A"
                              : r.winPct >= 40
                              ? "#F6C256"
                              : "#FF7F7F",
                          fontWeight: 700,
                        }}
                      >
                        {r.winPct.toFixed(1)}%
                      </div>

                      {/* Moy.3D */}
                      <div
                        style={{
                          textAlign: "right",
                          fontSize: 11,
                        }}
                      >
                        {r.avg3.toFixed(1)}
                      </div>

                      {/* BV */}
                      <div
                        style={{
                          textAlign: "right",
                          fontSize: 11,
                        }}
                      >
                        {r.bestVisit || "—"}
                      </div>

                      {/* CO */}
                      <div
                        style={{
                          textAlign: "right",
                          fontSize: 11,
                        }}
                      >
                        {r.bestCheckout || "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
