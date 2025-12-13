// =============================================================
// src/components/StatsDartSetsSection.tsx
// Section StatsHub — "Stats par fléchettes"
// - Agrège les matchs X01 depuis History (legacy + V3 via statsByDartSet)
// - Affiche les stats par dartSetId (ou dartPresetId)
// - ✅ Carrousel principal : 1 carte par set
// - ✅ Mini-carrousel "Derniers matchs" DANS CHAQUE set
// - ✅ Ticker sans icône (label "Nombre" + valeur "X preset(s)")
// - ✅ Petit classement "Meilleurs presets" sous le ticker (max 3 lignes sinon scroll horizontal)
// - ✅ Photo plus grosse + nom centré + halo
// - ✅ KPIs en "boutons néon" sur UNE LIGNE (adaptatif)
// - ✅ Sparkline (AVG/3D derniers matchs du set)
// - ✅ Radar Hits (S/D/T + Bull/DBull)
// - ✅ Hits par segments (Top segments, scroll si trop)
// =============================================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import { getDartSetsForProfile, type DartSet } from "../lib/dartSetsStore";
import { dartPresets } from "../lib/dartPresets";
import { getX01StatsByDartSetForProfile } from "../lib/statsByDartSet";
import { History } from "../lib/history";

// recharts déjà utilisé chez toi (EndOfLegOverlay, etc.)
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Tooltip,
} from "recharts";

const N = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function fmt1(n: number) {
  return (N(n, 0)).toFixed(1);
}
function fmt0(n: number) {
  return String(Math.round(N(n, 0)));
}
function fmtPct1(n: number) {
  return (N(n, 0)).toFixed(1);
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
  return (pp?.profileId ?? null) || (pp?.playerId ?? null) || (pp?.id ?? null) || null;
}
function resolveDartSetId(pp: any): string | null {
  return (pp?.dartSetId ?? null) || (pp?.dartPresetId ?? null) || (pp?.dartsetId ?? null) || null;
}

function pickNum(r: any, ...keys: string[]) {
  for (const k of keys) {
    const v = Number(r?.[k]);
    if (Number.isFinite(v)) return v;
  }
  return null;
}
function pickObj(r: any, ...keys: string[]) {
  for (const k of keys) {
    const v = r?.[k];
    if (v && typeof v === "object") return v;
  }
  return null;
}
function pickArr(r: any, ...keys: string[]) {
  for (const k of keys) {
    const v = r?.[k];
    if (Array.isArray(v)) return v;
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
  label: string; // WIN / LOSE
  score?: string;
  opponent?: string;
  avg3?: number | null; // pour sparkline fallback
};

function buildRecentMatchesMap(
  allHistory: any[],
  profileId: string
): Record<string, MiniMatch[]> {
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
      N(r?.ts, 0) ||
      Date.now();

    const others = perPlayer.filter((pp: any) => resolveProfileId(pp) !== profileId);
    const oppName =
      (others[0]?.name ?? null) ||
      (others[0]?.playerName ?? null) ||
      (others[0]?.profileName ?? null) ||
      null;

    const winnerId =
      summary?.winnerId ?? summary?.winnerPid ?? summary?.winnerPlayerId ?? null;
    const isWinner =
      mine?.isWinner === true ||
      mine?.win === true ||
      mine?.won === true ||
      (winnerId && String(winnerId) === String(profileId));

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

    // avg3 fallback (si disponible dans summary/perPlayer)
    const avg3 =
      pickNum(mine, "avg3", "avg3d", "avgPer3", "avgPerThree") ??
      pickNum(summary, "avg3", "avg3d") ??
      null;

    const item: MiniMatch = {
      id: String(r?.id ?? r?.matchId ?? `${dsid}-${at}`),
      at,
      dateLabel: fmtDateShort(at),
      label: isWinner ? "WIN" : "LOSE",
      score,
      opponent: oppName ? String(oppName) : undefined,
      avg3,
    };

    (map[String(dsid)] ||= []).push(item);
  }

  for (const k of Object.keys(map)) {
    map[k].sort((a, b) => b.at - a.at);
    map[k] = map[k].slice(0, 12);
  }

  return map;
}

/** ---------- Segments helpers ---------- **/

type SegMap = Record<string, number>;

function normalizeSegKey(k: string) {
  return String(k || "").trim().toUpperCase().replace(/\s+/g, "");
}

// essaie de récupérer le mapping segments depuis tes stats calculées
function extractSegmentsMap(r: any): SegMap | null {
  const obj =
    pickObj(
      r,
      "hitsBySegment",
      "segmentsHits",
      "hitsSegments",
      "segmentHits",
      "hitsBySeg",
      "segHits",
      "segments"
    ) || null;

  if (!obj) return null;

  const out: SegMap = {};
  for (const [k, v] of Object.entries(obj)) {
    const kk = normalizeSegKey(k);
    const n = Number(v);
    if (!kk) continue;
    if (!Number.isFinite(n)) continue;
    if (n <= 0) continue;
    out[kk] = (out[kk] || 0) + n;
  }
  return Object.keys(out).length ? out : null;
}

// top segments triés
function topSegments(map: SegMap, limit = 12) {
  return Object.entries(map)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .slice(0, limit)
    .map(([k, v]) => ({ seg: k, count: v }));
}

/** ---------- Sparkline helpers ---------- **/

function extractSparkValuesFromRow(r: any, recent: MiniMatch[]): number[] {
  // 1) si tes statsByDartSet fournit déjà un array (idéal)
  const arr =
    pickArr(r, "spark", "sparkline", "avg3Spark", "avg3Series", "seriesAvg3", "lastAvg3") ||
    null;

  if (arr && arr.length) {
    const vals = arr.map((x: any) => N(x, 0)).filter((n: number) => Number.isFinite(n));
    if (vals.length >= 2) return vals.slice(-18);
  }

  // 2) fallback : avg3 des récents matchs
  const vals2 = (recent || [])
    .slice()
    .reverse()
    .map((m) => N(m?.avg3, NaN))
    .filter((n) => Number.isFinite(n)) as number[];

  if (vals2.length >= 2) return vals2.slice(-18);

  // 3) rien
  return [];
}

function extractRadarData(r: any) {
  const s = N(r?.hitsS ?? r?.s ?? r?.singles ?? r?.single, 0);
  const d = N(r?.hitsD ?? r?.d ?? r?.doubles ?? r?.double, 0);
  const t = N(r?.hitsT ?? r?.t ?? r?.triples ?? r?.triple, 0);
  const b = N(r?.bull ?? r?.hitsBull ?? 0, 0);
  const db = N(r?.dBull ?? r?.dbull ?? r?.hitsDBull ?? 0, 0);

  // radar recharts -> [{k:"S", v:..}, ...]
  return [
    { k: "S", v: s },
    { k: "D", v: d },
    { k: "T", v: t },
    { k: "B", v: b },
    { k: "DB", v: db },
  ];
}

export default function StatsDartSetsSection(props: {
  activeProfileId: string | null;
  title?: string;
}) {
  const { activeProfileId, title } = props;
  const { theme } = useTheme();
  const { t } = useLang() as any;

  const accent = pickAccent(theme);
  const accentSoft = `rgba(246,194,86,.22)`;

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

  const cardBg = "linear-gradient(180deg, rgba(17,18,20,.94), rgba(13,14,17,.92))";
  const top = rows?.[0] || null;

  const countPresets = rows?.length || 0;

  const bestPresets = (rows || [])
    .map((r: any) => {
      const id = String(r?.dartSetId || "");
      const isMy = !!mySets.find((s: any) => String(s?.id) === id);
      if (isMy) return null;
      const pr = presetById(id);
      if (!pr) return null;
      const avg3 = pickNum(r, "avg3") ?? 0;
      return { id, name: pr?.name || "Preset", avg3 };
    })
    .filter(Boolean) as Array<{ id: string; name: string; avg3: number }>;

  bestPresets.sort((a, b) => b.avg3 - a.avg3);
  const bestTop = bestPresets.slice(0, 10);

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
            fontWeight: 950,
            fontSize: 15,
            textTransform: "uppercase",
            letterSpacing: 1.0,
            color: accent,
            textShadow: `0 0 10px ${accent}, 0 0 22px rgba(0,0,0,.35)`,
          }}
        >
          {title || t("stats.dartSets.title", "Stats par fléchettes")}
        </div>

        {/* ticker SANS icône */}
        <div style={{ marginLeft: "auto" }}>
          <NeonTicker
            accent={accent}
            label={t("stats.dartSets.countLabel", "Nombre")}
            value={`${countPresets} ${t("stats.dartSets.countValue", "preset")}${countPresets > 1 ? "s" : ""}`}
          />
        </div>
      </div>

      {/* petit classement sous ticker */}
      {bestTop.length > 0 && !loading && !err && (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 950,
              color: "rgba(255,255,255,.70)",
              letterSpacing: 0.6,
              textTransform: "uppercase",
            }}
          >
            {t("stats.dartSets.bestPresets", "Meilleurs presets")}
          </div>

          {bestTop.length <= 3 ? (
            <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
              {bestTop.slice(0, 3).map((b, i) => (
                <RankRow key={b.id} accent={accent} rank={i + 1} name={b.name} value={`AVG/3D ${fmt1(b.avg3)}`} />
              ))}
            </div>
          ) : (
            <div
              style={{
                marginTop: 6,
                display: "flex",
                gap: 8,
                overflowX: "auto",
                paddingBottom: 6,
                WebkitOverflowScrolling: "touch",
              }}
            >
              {bestTop.map((b, i) => (
                <div key={b.id} style={{ minWidth: 220 }}>
                  <RankRow accent={accent} rank={i + 1} name={b.name} value={`AVG/3D ${fmt1(b.avg3)}`} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
              marginTop: 6,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontWeight: 950,
                color: "#fff",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {resolveSetName(top.dartSetId, mySets, t)}
            </div>

            <NeonKPIButton accent={accent} label={"AVG/3D"} value={fmt1(pickNum(top, "avg3") ?? 0)} />
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

              const name = my?.name || pr?.name || t("stats.dartSets.unknown", "Set inconnu");

              const img =
                asUrl((my as any)?.photoDataUrl) ||
                asUrl((my as any)?.imgUrlMain) ||
                asUrl((my as any)?.imgUrlThumb) ||
                presetImage(pr) ||
                null;

              const avg3v = pickNum(r, "avg3") ?? 0;

              const quality = clamp01(avg3v / 90);
              const glow = quality > 0.72 ? "#7fe2a9" : quality > 0.45 ? accent : "#cfd1d7";

              const recent = recentBySet?.[id] || [];

              // KPIs étendus
              const first9 = pickNum(r, "first9") ?? 0;
              const checkoutPct = pickNum(r, "checkoutPct") ?? 0;
              const doublesPct = pickNum(r, "doublesPct") ?? 0;
              const n180 = pickNum(r, "n180") ?? 0;
              const n140 = pickNum(r, "n140") ?? 0;
              const n100 = pickNum(r, "n100") ?? 0;

              // Sparkline values
              const sparkVals = extractSparkValuesFromRow(r, recent);

              // Radar
              const radar = extractRadarData(r);

              // Segments
              const segMap = extractSegmentsMap(r);
              const segTop = segMap ? topSegments(segMap, 12) : [];

              return (
                <div
                  key={id || String(idx)}
                  style={{
                    minWidth: 304,
                    maxWidth: 304,
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,.10)",
                    background: `radial-gradient(circle at 0% 0%, ${accentSoft}, transparent 60%), linear-gradient(180deg, rgba(18,18,22,.92), rgba(10,10,12,.90))`,
                    boxShadow: "0 10px 26px rgba(0,0,0,.42)",
                    padding: 10,
                  }}
                >
                  {/* TOP : photo + nom centré */}
                  <div style={{ display: "grid", gridTemplateColumns: "86px 1fr", gap: 10, alignItems: "center" }}>
                    <div
                      style={{
                        width: 86,
                        height: 86,
                        borderRadius: 18,
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

                    <div style={{ minWidth: 0 }}>
                      {/* nom : theme + halo + 2 lignes */}
                      <div
                        style={{
                          fontWeight: 950,
                          color: accent,
                          fontSize: 13.8,
                          textAlign: "center",
                          textShadow: `0 0 12px ${accent}55`,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: 1.15,
                        }}
                      >
                        {name}
                      </div>

                      {/* KPI boutons néon — UNE LIGNE (wrap si besoin) */}
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 8,
                          justifyContent: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <NeonKPIButton accent={glow} label="AVG/3D" value={fmt1(avg3v)} />
                        <NeonPill accent={accent} text={`${t("stats.matches", "Matchs")} ${fmt0(N(r.matches, 0))}`} />
                        <NeonPill accent={accent} text={`${t("stats.darts", "Darts")} ${fmt0(N(r.darts, 0))}`} />
                      </div>
                    </div>
                  </div>

                  {/* Sparkline + Radar (comme demandé) */}
                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <BoxTitle title={t("stats.dartSets.spark", "Sparkline AVG/3D")} />
                    <BoxTitle title={t("stats.dartSets.radarHits", "Radar Hits")} />
                  </div>

                  <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={boxStyle()}>
                      {sparkVals.length >= 2 ? (
                        <Sparkline values={sparkVals} accent={accent} />
                      ) : (
                        <EmptySmall text={t("common.na", "—")} />
                      )}
                    </div>

                    <div style={boxStyle()}>
                      <div style={{ width: "100%", height: 86 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radar}>
                            <PolarGrid stroke="rgba(255,255,255,.10)" />
                            <PolarAngleAxis dataKey="k" tick={{ fill: "rgba(255,255,255,.80)", fontSize: 10 }} />
                            <Radar
                              dataKey="v"
                              stroke={accent}
                              fill={accent}
                              fillOpacity={0.18}
                              strokeWidth={2}
                            />
                            <Tooltip
                              contentStyle={{
                                background: "rgba(0,0,0,.85)",
                                border: "1px solid rgba(255,255,255,.12)",
                                borderRadius: 12,
                                color: "#fff",
                                fontWeight: 900,
                              }}
                              formatter={(value: any) => [String(value), ""]}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Hits par segments */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 950,
                          color: "rgba(255,255,255,.80)",
                          letterSpacing: 0.5,
                          textTransform: "uppercase",
                        }}
                      >
                        {t("stats.dartSets.hitsBySegment", "Hits par segments")}
                      </div>
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.55)", fontWeight: 900 }}>
                        {segTop.length ? `${segTop.length}` : "0"}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,.08)",
                        background: "rgba(0,0,0,.22)",
                        padding: 8,
                      }}
                    >
                      {!segTop.length ? (
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>
                          {t("stats.dartSets.noSegments", "Segments non disponibles pour ce set.")}
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, WebkitOverflowScrolling: "touch" }}>
                          {segTop.map((s) => (
                            <SegChip key={s.seg} accent={accent} seg={s.seg} count={s.count} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* KPIs (stats enrichies) */}
                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <KPI label={t("stats.bestVisit", "Best volée")} value={String(N(r.bestVisit, 0))} />
                    <KPI label={t("stats.bestCheckout", "Best CO")} value={String(N(r.bestCheckout, 0))} />

                    <KPI label={t("stats.first9", "First 9")} value={first9 > 0 ? fmt1(first9) : "—"} />
                    <KPI label={t("stats.checkoutPct", "Checkout %")} value={checkoutPct > 0 ? `${fmtPct1(checkoutPct)}%` : "—"} />
                    <KPI label={t("stats.doublesPct", "Doubles %")} value={doublesPct > 0 ? `${fmtPct1(doublesPct)}%` : "—"} />
                    <KPI label={t("stats.records", "Records")} value={`180:${fmt0(n180)}  140:${fmt0(n140)}  100+:${fmt0(n100)}`} />

                    <KPI
                      label={t("stats.hits", "Hits")}
                      value={`S${fmt0(N(r.hitsS, 0))} D${fmt0(N(r.hitsD, 0))} T${fmt0(N(r.hitsT, 0))}`}
                    />
                    <KPI label={t("stats.missBust", "Miss / Bust")} value={`${fmt0(N(r.miss, 0))} / ${fmt0(N(r.bust, 0))}`} />
                    <KPI label={t("stats.bull", "Bull / DBull")} value={`${fmt0(N(r.bull, 0))} / ${fmt0(N(r.dBull, 0))}`} />
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

                  {/* carrousel "Derniers matchs" */}
                  <div
                    style={{
                      marginTop: 10,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,.08)",
                      background: "rgba(0,0,0,.22)",
                      padding: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 950,
                          color: "rgba(255,255,255,.80)",
                          letterSpacing: 0.5,
                          textTransform: "uppercase",
                        }}
                      >
                        {t("stats.dartSets.recent", "Derniers matchs")}
                      </div>
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.55)", fontWeight: 900 }}>
                        {recent.length ? `${recent.length}` : "0"}
                      </div>
                    </div>

                    {!recent.length ? (
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>
                        {t("stats.dartSets.noRecent", "Aucun match récent pour ce set.")}
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, WebkitOverflowScrolling: "touch" }}>
                        {recent.map((m) => (
                          <MatchChip key={m.id} item={m} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,.55)" }}>
            {t("stats.dartSets.note", "Ces stats sont calculées uniquement sur les matchs X01 terminés, et groupées par set sélectionné.")}
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

/* ---------------- UI bits ---------------- */

function boxStyle(): React.CSSProperties {
  return {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(255,255,255,.04)",
    padding: "7px 8px",
  };
}

function BoxTitle(props: { title: string }) {
  return (
    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.70)", fontWeight: 950, textTransform: "uppercase", letterSpacing: 0.4 }}>
      {props.title}
    </div>
  );
}

function EmptySmall(props: { text: string }) {
  return <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,.55)", padding: "12px 6px", textAlign: "center" }}>{props.text}</div>;
}

function NeonTicker(props: { accent: string; label: string; value: string }) {
  const { accent, label, value } = props;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid rgba(255,255,255,.12)`,
        background: "rgba(0,0,0,.35)",
        boxShadow: `0 0 18px ${accent}22`,
      }}
    >
      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.65)", fontWeight: 950, letterSpacing: 0.5, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 11.5, color: accent, fontWeight: 950, textShadow: `0 0 12px ${accent}55`, whiteSpace: "nowrap" }}>
        {value}
      </div>
    </div>
  );
}

/** KPI "bouton néon" (celui que tu demandes : valeur + label, même couleur, très visible) */
function NeonKPIButton(props: { accent: string; label: string; value: string }) {
  const { accent, label, value } = props;
  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${accent}88`,
        background: `radial-gradient(circle at 50% 0%, ${accent}22, transparent 62%), rgba(0,0,0,.40)`,
        padding: "7px 10px",
        minWidth: 98,
        textAlign: "center",
        boxShadow: `0 0 18px ${accent}40`,
      }}
    >
      <div style={{ fontSize: 10.5, color: accent, fontWeight: 950, letterSpacing: 0.4, textShadow: `0 0 12px ${accent}66` }}>
        {label}
      </div>
      <div style={{ marginTop: 2, fontWeight: 950, color: accent, fontSize: 13.5, textShadow: `0 0 14px ${accent}88` }}>
        {value}
      </div>
    </div>
  );
}

function NeonPill(props: { accent: string; text: string }) {
  const { accent, text } = props;
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${accent}44`,
        background: "rgba(0,0,0,.28)",
        color: "rgba(255,255,255,.90)",
        fontWeight: 950,
        fontSize: 10.6,
        letterSpacing: 0.2,
        boxShadow: `0 0 14px ${accent}22`,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function KPI(props: { label: string; value: string }) {
  const { label, value } = props;
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", padding: "7px 8px" }}>
      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.70)", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 950 }}>
        {label}
      </div>
      <div style={{ fontWeight: 950, color: "#fff", fontSize: 12.6 }}>{value}</div>
    </div>
  );
}

function MatchChip(props: { item: MiniMatch }) {
  const { item } = props;
  const win = item?.label === "WIN";
  const c = win ? "#7fe2a9" : "#ff8a8a";

  return (
    <div
      style={{
        minWidth: 130,
        maxWidth: 130,
        borderRadius: 12,
        border: `1px solid ${c}22`,
        background: `radial-gradient(circle at 0% 0%, ${c}22, transparent 60%), rgba(255,255,255,.03)`,
        padding: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
        <div style={{ fontWeight: 950, color: "#fff", fontSize: 12 }}>{item.dateLabel}</div>
        <span style={{ fontSize: 10, fontWeight: 950, color: c, border: `1px solid ${c}33`, padding: "2px 6px", borderRadius: 999, background: "rgba(0,0,0,.25)" }}>
          {item.label}
        </span>
      </div>

      <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,.75)", fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {item.opponent ? `vs ${item.opponent}` : "Match"}
      </div>

      <div style={{ marginTop: 4, fontSize: 11.5, color: "#fff", fontWeight: 950 }}>
        {item.score || "—"}
      </div>
    </div>
  );
}

function RankRow(props: { accent: string; rank: number; name: string; value: string }) {
  const { accent, rank, name, value } = props;
  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,.10)",
        background: "rgba(0,0,0,.28)",
        padding: "8px 10px",
        display: "grid",
        gridTemplateColumns: "28px 1fr auto",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 9,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 950,
          color: accent,
          border: `1px solid ${accent}66`,
          background: "rgba(0,0,0,.25)",
          textShadow: `0 0 12px ${accent}55`,
        }}
      >
        {rank}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 950, color: "#fff", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {name}
        </div>
      </div>

      <div style={{ fontWeight: 950, fontSize: 11, color: accent, textShadow: `0 0 10px ${accent}55`, whiteSpace: "nowrap" }}>
        {value}
      </div>
    </div>
  );
}

function SegChip(props: { accent: string; seg: string; count: number }) {
  const { accent, seg, count } = props;
  return (
    <div
      style={{
        minWidth: 92,
        borderRadius: 12,
        border: `1px solid ${accent}22`,
        background: `radial-gradient(circle at 0% 0%, ${accent}18, transparent 62%), rgba(255,255,255,.03)`,
        padding: "7px 8px",
      }}
    >
      <div style={{ fontWeight: 950, color: accent, fontSize: 12, textShadow: `0 0 12px ${accent}55` }}>{seg}</div>
      <div style={{ marginTop: 2, fontWeight: 950, color: "#fff", fontSize: 12.5 }}>{fmt0(count)}</div>
    </div>
  );
}

/** Sparkline SVG (léger, sans dépendances) */
function Sparkline(props: { values: number[]; accent: string }) {
  const { values, accent } = props;
  const w = 220;
  const h = 60;
  const pad = 6;

  const vals = values.slice(-18);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(1e-6, max - min);

  const pts = vals.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, vals.length - 1);
    const y = pad + (h - pad * 2) * (1 - (v - min) / span);
    return { x, y, v };
  });

  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");

  const last = pts[pts.length - 1]?.v ?? null;

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
        <path d={d} fill="none" stroke={accent} strokeWidth="2.2" />
        <path
          d={`${d} L ${pts[pts.length - 1].x.toFixed(2)} ${h - pad} L ${pts[0].x.toFixed(2)} ${h - pad} Z`}
          fill={accent}
          opacity="0.10"
        />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3.4" fill={accent} />
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.65)", fontWeight: 950 }}>
          min {fmt1(min)} • max {fmt1(max)}
        </div>
        <div style={{ fontSize: 11.5, color: accent, fontWeight: 950, textShadow: `0 0 12px ${accent}66` }}>
          {last !== null ? `dernier ${fmt1(last)}` : "—"}
        </div>
      </div>
    </div>
  );
}
