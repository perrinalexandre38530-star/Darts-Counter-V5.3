// =============================================================
// src/components/StatsDartSetsSection.tsx
// Section StatsHub — "Stats par fléchettes"
// - Agrège les matchs X01 depuis History (legacy + V3 via statsByDartSet)
// - Affiche les stats par dartSetId (ou dartPresetId)
// =============================================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import { getDartSetsForProfile, type DartSet } from "../lib/dartSetsStore";
import { dartPresets } from "../lib/dartPresets";
import { getX01StatsByDartSetForProfile } from "../lib/statsByDartSet";

const N = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function fmt1(n: number) {
  const v = N(n, 0);
  return v.toFixed(1);
}

function presetById(id: string) {
  return (dartPresets || []).find((p) => String(p?.id) === String(id)) || null;
}

// ✅ accepte string OU import d’asset (module avec default), etc.
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

function pickNum(r: any, ...keys: string[]) {
  for (const k of keys) {
    const v = Number(r?.[k]);
    if (Number.isFinite(v)) return v;
  }
  return null;
}

function pickAccent(theme: any) {
  return theme?.primary || theme?.accent || theme?.colors?.primary || "#F6C256";
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

      {/* States */}
      {loading ? (
        <div
          style={{
            color: "rgba(255,255,255,.75)",
            fontSize: 12,
            padding: 8,
          }}
        >
          {t("common.loading", "Chargement...")}
        </div>
      ) : err ? (
        <div style={{ color: "#ff8a8a", fontSize: 12, padding: 8 }}>
          {t("common.error", "Erreur")} : {String(err)}
        </div>
      ) : !rows.length ? (
        <div
          style={{
            color: "rgba(255,255,255,.75)",
            fontSize: 12,
            padding: 8,
          }}
        >
          {t(
            "stats.dartSets.empty",
            "Aucune partie X01 trouvée pour ce profil."
          )}
        </div>
      ) : (
        <>
          {/* Carrousel */}
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

              // set perso ?
              const my = mySets.find((s: any) => String(s?.id) === id) || null;

              // preset direct (si la stat est un preset id)
              const prDirect = !my ? presetById(id) : null;

              // ✅ si c’est un set perso SANS photo, on tente de retrouver son preset d’origine
              const myPresetId =
                (my as any)?.dartPresetId ||
                (my as any)?.presetId ||
                (my as any)?.preset ||
                (my as any)?.basePresetId ||
                (my as any)?.refPresetId ||
                null;

              const prFromMy = myPresetId ? presetById(String(myPresetId)) : null;

              const pr = prDirect || prFromMy;

              const name =
                my?.name ||
                pr?.name ||
                t("stats.dartSets.unknown", "Set inconnu");

              // ✅ image: photo perso > imgUrl du set > image preset (même si Type=Perso)
              const img =
                asUrl((my as any)?.photoDataUrl) ||
                asUrl((my as any)?.imgUrlMain) ||
                asUrl((my as any)?.imgUrlThumb) ||
                presetImage(pr) ||
                null;

              const avg3v = pickNum(r, "avg3") ?? 0;

              const quality = clamp01(avg3v / 90);
              const badgeColor =
                quality > 0.72
                  ? "#7fe2a9"
                  : quality > 0.45
                  ? accent
                  : "#cfd1d7";

              // stats enrichies (si présentes)
              const bestLeg = pickNum(r, "bestLeg", "bestLegScore");
              const first9 = pickNum(r, "first9", "avgFirst9", "avg9");
              const coPct = pickNum(r, "checkoutPct", "coPct", "checkoutRate");
              const dblPct = pickNum(r, "doublePct", "dblPct", "doublesRate");
              const ton80 = pickNum(r, "ton80", "s180", "count180");
              const high140 = pickNum(r, "high140", "count140");
              const high100 = pickNum(r, "high100", "count100");

              return (
                <div
                  key={id || String(idx)}
                  style={{
                    minWidth: 252,
                    maxWidth: 252,
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,.10)",
                    background: `radial-gradient(circle at 0% 0%, ${accentSoft}, transparent 60%), linear-gradient(180deg, rgba(18,18,22,.92), rgba(10,10,12,.90))`,
                    boxShadow: "0 10px 26px rgba(0,0,0,.42)",
                    padding: 10,
                  }}
                >
                  {/* Top row */}
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
                          onError={(e) => {
                            // fallback visuel si url cassée
                            (e.currentTarget as any).style.display = "none";
                          }}
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

                      {/* si img fail et cachée, on met un fallback par-dessus */}
                      {img ? (
                        <div
                          style={{
                            position: "relative",
                            marginTop: -66,
                            width: 66,
                            height: 66,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            pointerEvents: "none",
                            color: "rgba(255,255,255,.40)",
                            fontWeight: 900,
                          }}
                        >
                          {/* visible uniquement si l'image a été cachée via onError */}
                        </div>
                      ) : null}
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

                      <div
                        style={{
                          marginTop: 6,
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <Pill text={`AVG/3D ${fmt1(avg3v)}`} color={badgeColor} />
                        <Pill
                          text={`${t("stats.matches", "Matchs")} ${N(
                            r.matches,
                            0
                          )}`}
                          color={"rgba(255,255,255,.75)"}
                        />
                        <Pill
                          text={`${t("stats.darts", "Darts")} ${N(r.darts, 0)}`}
                          color={"rgba(255,255,255,.75)"}
                        />
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
                    <KPI
                      label={t("stats.bestVisit", "Best volée")}
                      value={String(N(r.bestVisit, 0))}
                    />
                    <KPI
                      label={t("stats.bestCheckout", "Best CO")}
                      value={String(N(r.bestCheckout, 0))}
                    />
                    <KPI label={t("stats.avg3", "AVG/3D")} value={fmt1(avg3v)} />
                    <KPI
                      label={t("stats.first9", "First 9")}
                      value={first9 !== null ? fmt1(first9) : "—"}
                    />
                    <KPI
                      label={t("stats.matches", "Matchs")}
                      value={String(N(r.matches, 0))}
                    />
                    <KPI
                      label={t("stats.darts", "Darts")}
                      value={String(N(r.darts, 0))}
                    />
                    <KPI
                      label={t("stats.checkoutPct", "Checkout %")}
                      value={coPct !== null ? `${fmt1(coPct)}%` : "—"}
                    />
                    <KPI
                      label={t("stats.doublePct", "Doubles %")}
                      value={dblPct !== null ? `${fmt1(dblPct)}%` : "—"}
                    />
                    <KPI
                      label={t("stats.hits", "Hits")}
                      value={`S${N(r.hitsS, 0)} D${N(r.hitsD, 0)} T${N(
                        r.hitsT,
                        0
                      )}`}
                    />
                    <KPI
                      label={t("stats.missBust", "Miss / Bust")}
                      value={`${N(r.miss, 0)} / ${N(r.bust, 0)}`}
                    />
                    <KPI
                      label={t("stats.bull", "Bull / DBull")}
                      value={`${N(r.bull, 0)} / ${N(r.dBull, 0)}`}
                    />
                    <KPI
                      label={t("stats.bestLeg", "Best leg")}
                      value={bestLeg !== null ? String(bestLeg) : "—"}
                    />
                    <KPI label={"180"} value={ton80 !== null ? String(ton80) : "—"} />
                    <KPI
                      label={"140+"}
                      value={high140 !== null ? String(high140) : "—"}
                    />
                    <KPI
                      label={"100+"}
                      value={high100 !== null ? String(high100) : "—"}
                    />
                    <KPI
                      label={t("stats.setType", "Type")}
                      value={
                        my
                          ? t("stats.dartSets.custom", "Perso")
                          : prDirect
                          ? t("stats.dartSets.preset", "Preset")
                          : prFromMy
                          ? t("stats.dartSets.preset", "Preset")
                          : "—"
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "rgba(255,255,255,.55)",
            }}
          >
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
  const pr = (dartPresets || []).find((p) => String(p?.id) === String(id)) || null;
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
