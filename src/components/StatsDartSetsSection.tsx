// =============================================================
// src/components/StatsDartSetsSection.tsx
// Section StatsHub — "Stats par fléchettes"
// - Agrège les matchs X01 depuis History (legacy + V3 via statsByDartSet)
// - Affiche les stats par dartSetId (ou dartPresetId)
// - ✅ NEW : un mini-carrousel "Derniers matchs" DANS CHAQUE set
// =============================================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import { getDartSetsForProfile, type DartSet } from "../lib/dartSetsStore";
import { dartPresets } from "../lib/dartPresets";
import { getX01StatsByDartSetForProfile } from "../lib/statsByDartSet";
import { History } from "../lib/history";

const N = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function fmt1(n: number) {
  const v = N(n, 0);
  return v.toFixed(1);
}

function safeLower(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

function isX01Record(r: any): boolean {
  const kind = safeLower(r?.kind);
  const game = safeLower(r?.game);
  const mode = safeLower(r?.mode);
  const variant = safeLower(r?.variant);
  if (kind === "x01" || kind === "x01v3") return true;
  if (game === "x01" || game === "x01v3") return true;
  if (mode === "x01" || mode === "x01v3") return true;
  if (variant === "x01" || variant === "x01v3") return true;
  return false;
}

function asUrl(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (typeof (v as any).default === "string") return (v as any).default;
    if (typeof (v as any).src === "string") return (v as any).src;
    if (typeof (v as any).url === "string") return (v as any).url;
  }
  return null;
}

function presetById(id: string) {
  const sid = String(id || "");
  return (dartPresets || []).find((p: any) => String(p?.id) === sid) || null;
}

function presetByName(name: string) {
  const n = safeLower(name);
  if (!n) return null;
  return (
    (dartPresets || []).find((p: any) => safeLower(p?.name) === n) ||
    (dartPresets || []).find((p: any) => safeLower(p?.name).includes(n)) ||
    (dartPresets || []).find((p: any) => n.includes(safeLower(p?.name))) ||
    null
  );
}

function presetImage(pr: any): string | null {
  if (!pr) return null;
  return (
    asUrl(pr.imgUrlThumb) ||
    asUrl(pr.imgUrlMain) ||
    asUrl(pr.imgUrl) ||
    asUrl(pr.thumb) ||
    asUrl(pr.thumbnail) ||
    asUrl(pr.imageThumb) ||
    asUrl(pr.imageMain) ||
    asUrl(pr.image) ||
    asUrl(pr.img) ||
    asUrl(pr.url) ||
    asUrl(pr.src) ||
    null
  );
}

function pickAccent(theme: any) {
  return theme?.primary || theme?.accent || theme?.colors?.primary || "#F6C256";
}

function pickPerPlayer(summary: any): any[] {
  if (!summary) return [];
  if (Array.isArray(summary.perPlayer)) return summary.perPlayer;
  if (Array.isArray(summary.players)) return summary.players;

  if (summary.players && typeof summary.players === "object") {
    return Object.entries(summary.players).map(([playerId, v]) => ({
      playerId,
      ...(v as any),
    }));
  }
  if (summary.perPlayer && typeof summary.perPlayer === "object") {
    return Object.entries(summary.perPlayer).map(([playerId, v]) => ({
      playerId,
      ...(v as any),
    }));
  }
  return [];
}

function resolveProfileId(pp: any): string | null {
  return (
    (pp?.profileId ?? null) ||
    (pp?.playerId ?? null) ||
    (pp?.id ?? null) ||
    null
  );
}

function resolveDartSetId(pp: any): string | null {
  return (
    (pp?.dartSetId ?? null) ||
    (pp?.dartPresetId ?? null) ||
    (pp?.dartsetId ?? null) ||
    null
  );
}

function pickNum(r: any, ...keys: string[]) {
  for (const k of keys) {
    const v = Number(r?.[k]);
    if (Number.isFinite(v)) return v;
  }
  return null;
}

function fmtDateShort(ts: any) {
  const d = new Date(ts || 0);
  if (!Number.isFinite(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

type MiniMatch = {
  id: string;
  at: number;
  dateLabel: string;
  label: string; // ex: "Win" / "Lose" / "Match"
  score?: string;
  opponent?: string;
};

function buildRecentMatchesMap(allHistory: any[], profileId: string): Record<string, MiniMatch[]> {
  const map: Record<string, MiniMatch[]> = {};

  for (const r of allHistory || []) {
    if (!isX01Record(r)) continue;

    const status = r?.status ?? r?.state ?? "";
    if (status && status !== "finished") continue;

    const summary = r?.summary ?? r?.payload?.summary ?? null;
    const perPlayer = pickPerPlayer(summary);

    const mine = perPlayer.find((pp: any) => resolveProfileId(pp) === profileId);
    if (!mine) continue;

    const dsid = resolveDartSetId(mine);
    if (!dsid) continue;

    const at =
      N(r?.endedAt, 0) ||
      N(r?.finishedAt, 0) ||
      N(r?.createdAt, 0) ||
      N(r?.at, 0) ||
      Date.now();

    // opponent name (best-effort)
    const others = perPlayer.filter((pp: any) => resolveProfileId(pp) !== profileId);
    const oppName =
      (others[0]?.name ?? null) ||
      (others[0]?.playerName ?? null) ||
      (others[0]?.profileName ?? null) ||
      null;

    // win/lose (best-effort)
    const winnerId =
      summary?.winnerId ?? summary?.winnerPid ?? summary?.winnerPlayerId ?? null;
    const isWinner =
      (mine?.isWinner === true) ||
      (mine?.win === true) ||
      (mine?.won === true) ||
      (winnerId && String(winnerId) === String(profileId));

    // score (best-effort)
    const legsW = pickNum(mine, "legsWin", "legsWon", "legsW");
    const legsL = pickNum(mine, "legsLose", "legsLost", "legsL");
    const setsW = pickNum(mine, "setsWin", "setsWon", "setsW");
    const setsL = pickNum(mine, "setsLose", "setsLost", "setsL");

    let score: string | undefined = undefined;
    if (setsW !== null || setsL !== null) {
      score = `${N(setsW, 0)}-${N(setsL, 0)}`;
      if (legsW !== null || legsL !== null) score += ` • ${N(legsW, 0)}-${N(legsL, 0)}`;
    } else if (legsW !== null || legsL !== null) {
      score = `${N(legsW, 0)}-${N(legsL, 0)}`;
    }

    const item: MiniMatch = {
      id: String(r?.id ?? r?.matchId ?? `${dsid}-${at}`),
      at,
      dateLabel: fmtDateShort(at),
      label: isWinner ? "WIN" : "LOSE",
      score,
      opponent: oppName ? String(oppName) : undefined,
    };

    (map[String(dsid)] ||= []).push(item);
  }

  // tri desc + limit
  for (const k of Object.keys(map)) {
    map[k].sort((a, b) => b.at - a.at);
    map[k] = map[k].slice(0, 10);
  }

  return map;
}

export default function StatsDartSetsSection(props: {
  activeProfileId: string | null;
  title?: string;
}) {
  const { activeProfileId, title } = props;
  const { theme } = useTheme();
  const { t } = useLang() as any;

  const accent = pickAccent(theme);
  const accentSoft = "rgba(246,194,86,.22)";

  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<any[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [mySets, setMySets] = React.useState<DartSet[]>([]);
  const [recentBySet, setRecentBySet] = React.useState<Record<string, MiniMatch[]>>({});

  React.useEffect(() => {
    let mounted = true;

    async function run() {
      if (!activeProfileId) return;
      setLoading(true);
      setErr(null);

      try {
        const s = getDartSetsForProfile(activeProfileId);
        if (mounted) setMySets(s || []);
      } catch {
        if (mounted) setMySets([]);
      }

      try {
        const stats = await getX01StatsByDartSetForProfile(activeProfileId);
        if (mounted) setRows(Array.isArray(stats) ? stats : []);
      } catch (e: any) {
        if (mounted) setErr(e?.message || "failed");
      }

      // ✅ mini-carrousels : on lit History une seule fois
      try {
        const all = await History.list?.();
        const map = buildRecentMatchesMap(all || [], activeProfileId);
        if (mounted) setRecentBySet(map);
      } catch {
        if (mounted) setRecentBySet({});
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [activeProfileId]);

  if (!activeProfileId) return null;

  const cardBg =
    "linear-gradient(180deg, rgba(17,18,20,.94), rgba(13,14,17,.92))";

  const top = rows?.[0] || null;

  return (
    <div
      style={{
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,.10)",
        background: cardBg,
        boxShadow: "0 10px 26px rgba(0,0,0,.45)",
        padding: 12,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            fontWeight: 900,
            fontSize: 15,
            textTransform: "uppercase",
            letterSpacing: 1.0,
            color: accent,
            textShadow: `0 0 10px ${accent}, 0 0 22px rgba(0,0,0,.35)`,
          }}
        >
          {title || t("stats.dartSets.title", "Stats par fléchettes")}
        </div>

        <div style={{ marginLeft: "auto" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 999,
              border: `1px solid ${accentSoft}`,
              background: "rgba(0,0,0,.35)",
              color: "rgba(255,255,255,.8)",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            🎯 {t("stats.dartSets.count", "Sets")} :{" "}
            <span style={{ color: "#fff" }}>{rows?.length || 0}</span>
          </span>
        </div>
      </div>

      {/* mini résumé */}
      {top && !loading && !err && (
        <div
          style={{
            marginTop: 10,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,.08)",
            background: `radial-gradient(circle at 0% 0%, ${accentSoft}, transparent 60%), rgba(0,0,0,.28)`,
            padding: 10,
          }}
        >
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.70)" }}>
            {t("stats.dartSets.best", "Meilleur set (sur la période totale)")}
          </div>
          <div
            style={{
              marginTop: 4,
              fontWeight: 900,
              color: "#fff",
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              alignItems: "baseline",
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {resolveSetName(top.dartSetId, mySets, t)}
            </span>
            <span style={{ color: accent }}>
              AVG/3D {fmt1(pickNum(top, "avg3") ?? 0)}
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: "rgba(255,255,255,.75)", fontSize: 12, padding: 8 }}>
          {t("common.loading", "Chargement...")}
        </div>
      ) : err ? (
        <div style={{ color: "#ff8a8a", fontSize: 12, padding: 8 }}>
          {t("common.error", "Erreur")} : {String(err)}
        </div>
      ) : !rows.length ? (
        <div style={{ color: "rgba(255,255,255,.75)", fontSize: 12, padding: 8 }}>
          {t("stats.dartSets.empty", "Aucune partie X01 trouvée pour ce profil.")}
        </div>
      ) : (
        <>
          {/* Carrousel principal : 1 carte par set */}
          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 10,
              overflowX: "auto",
              paddingBottom: 6,
              WebkitOverflowScrolling: "touch",
            }}
          >
            {rows.map((r: any, idx: number) => {
              const id: string = String(r.dartSetId || "");

              const my = mySets.find((s: any) => String(s?.id) === id) || null;
              const prDirect = !my ? presetById(id) : null;

              const myPresetId =
                (my as any)?.dartPresetId ||
                (my as any)?.presetId ||
                (my as any)?.preset ||
                (my as any)?.basePresetId ||
                (my as any)?.refPresetId ||
                null;

              const prFromMyId = myPresetId ? presetById(String(myPresetId)) : null;
              const prFromMyName = !prFromMyId && my?.name ? presetByName(String(my.name)) : null;

              const pr = prDirect || prFromMyId || prFromMyName;

              const name =
                my?.name ||
                pr?.name ||
                t("stats.dartSets.unknown", "Set inconnu");

              const img =
                asUrl((my as any)?.photoDataUrl) ||
                asUrl((my as any)?.imgUrlMain) ||
                asUrl((my as any)?.imgUrlThumb) ||
                presetImage(pr) ||
                null;

              const avg3v = pickNum(r, "avg3") ?? 0;
              const quality = clamp01(avg3v / 90);
              const badgeColor =
                quality > 0.72 ? "#7fe2a9" : quality > 0.45 ? accent : "#cfd1d7";

              const recent = recentBySet?.[id] || [];

              return (
                <div
                  key={id || String(idx)}
                  style={{
                    minWidth: 268,
                    maxWidth: 268,
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,.10)",
                    background: `radial-gradient(circle at 0% 0%, ${accentSoft}, transparent 60%), linear-gradient(180deg, rgba(18,18,22,.92), rgba(10,10,12,.90))`,
                    boxShadow: "0 10px 26px rgba(0,0,0,.42)",
                    padding: 10,
                  }}
                >
                  {/* top row */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <div
                      style={{
                        width: 66,
                        height: 66,
                        borderRadius: 16,
                        overflow: "hidden",
                        background: "rgba(255,255,255,.06)",
                        border: "1px solid rgba(255,255,255,.10)",
                        flex: "0 0 auto",
                      }}
                    >
                      {img ? (
                        <img
                          src={img}
                          alt={name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "rgba(255,255,255,.55)",
                            fontWeight: 900,
                          }}
                        >
                          ?
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 900,
                          color: accent,
                          fontSize: 13,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {name}
                      </div>

                      <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Pill text={`AVG/3D ${fmt1(avg3v)}`} color={badgeColor} />
                        <Pill text={`${t("stats.matches", "Matchs")} ${N(r.matches, 0)}`} color={"rgba(255,255,255,.75)"} />
                        <Pill text={`${t("stats.darts", "Darts")} ${N(r.darts, 0)}`} color={"rgba(255,255,255,.75)"} />
                      </div>
                    </div>
                  </div>

                  {/* KPIs */}
                  <div
                    style={{
                      marginTop: 10,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    <KPI label={t("stats.bestVisit", "Best volée")} value={String(N(r.bestVisit, 0))} />
                    <KPI label={t("stats.bestCheckout", "Best CO")} value={String(N(r.bestCheckout, 0))} />
                    <KPI label={t("stats.hits", "Hits")} value={`S${N(r.hitsS, 0)} D${N(r.hitsD, 0)} T${N(r.hitsT, 0)}`} />
                    <KPI label={t("stats.missBust", "Miss / Bust")} value={`${N(r.miss, 0)} / ${N(r.bust, 0)}`} />
                    <KPI label={t("stats.bull", "Bull / DBull")} value={`${N(r.bull, 0)} / ${N(r.dBull, 0)}`} />
                    <KPI
                      label={t("stats.setType", "Type")}
                      value={
                        my
                          ? t("stats.dartSets.custom", "Perso")
                          : prDirect || prFromMyId || prFromMyName
                          ? t("stats.dartSets.preset", "Preset")
                          : "—"
                      }
                    />
                  </div>

                  {/* ✅ NEW : carrousel par set */}
                  <div
                    style={{
                      marginTop: 10,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,.08)",
                      background: "rgba(0,0,0,.22)",
                      padding: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 900,
                          color: "rgba(255,255,255,.80)",
                          letterSpacing: 0.5,
                          textTransform: "uppercase",
                        }}
                      >
                        {t("stats.dartSets.recent", "Derniers matchs")}
                      </div>
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.55)", fontWeight: 800 }}>
                        {recent.length ? `${recent.length}` : "0"}
                      </div>
                    </div>

                    {!recent.length ? (
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>
                        {t("stats.dartSets.noRecent", "Aucun match récent pour ce set.")}
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          overflowX: "auto",
                          paddingBottom: 2,
                          WebkitOverflowScrolling: "touch",
                        }}
                      >
                        {recent.map((m) => {
                          const win = m.label === "WIN";
                          const c = win ? "#7fe2a9" : "#ff8a8a";
                          return (
                            <div
                              key={m.id}
                              style={{
                                minWidth: 130,
                                maxWidth: 130,
                                borderRadius: 12,
                                border: `1px solid ${c}22`,
                                background: `radial-gradient(circle at 0% 0%, ${c}22, transparent 60%), rgba(255,255,255,.03)`,
                                padding: 8,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "baseline",
                                  gap: 6,
                                }}
                              >
                                <div style={{ fontWeight: 900, color: "#fff", fontSize: 12 }}>
                                  {m.dateLabel}
                                </div>
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 900,
                                    color: c,
                                    border: `1px solid ${c}33`,
                                    padding: "2px 6px",
                                    borderRadius: 999,
                                    background: "rgba(0,0,0,.25)",
                                  }}
                                >
                                  {m.label}
                                </span>
                              </div>

                              <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,.75)", fontWeight: 800 }}>
                                {m.opponent ? `${t("stats.vs", "vs")} ${m.opponent}` : t("stats.match", "Match")}
                              </div>

                              <div style={{ marginTop: 4, fontSize: 11.5, color: "#fff", fontWeight: 900 }}>
                                {m.score || "—"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,.55)" }}>
            {t(
              "stats.dartSets.note",
              "Ces stats sont calculées uniquement sur les matchs X01 terminés, et groupées par set sélectionné."
            )}
          </div>
        </>
      )}
    </div>
  );
}

function resolveSetName(id: string, mySets: any[], t: any) {
  const my = mySets?.find((s: any) => String(s?.id) === String(id)) || null;
  if (my?.name) return my.name;
  const pr = (dartPresets || []).find((p: any) => String(p?.id) === String(id)) || null;
  if (pr?.name) return pr.name;
  return t?.("stats.dartSets.unknown", "Set inconnu") ?? "Set inconnu";
}

function Pill(props: { text: string; color: string }) {
  const { text, color } = props;
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "3px 8px",
        borderRadius: 999,
        border: `1px solid rgba(255,255,255,.12)`,
        background: "rgba(0,0,0,.35)",
        color,
        fontWeight: 900,
        fontSize: 10.5,
        letterSpacing: 0.2,
      }}
    >
      {text}
    </span>
  );
}

function KPI(props: { label: string; value: string }) {
  const { label, value } = props;
  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,.08)",
        background: "rgba(255,255,255,.04)",
        padding: "7px 8px",
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          color: "rgba(255,255,255,.70)",
          marginBottom: 2,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </div>
      <div style={{ fontWeight: 900, color: "#fff", fontSize: 12.5 }}>
        {value}
      </div>
    </div>
  );
}
