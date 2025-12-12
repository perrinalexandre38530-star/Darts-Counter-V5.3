// =============================================================
// src/components/StatsDartSetsSection.tsx
// Section StatsHub — "Stats par fléchettes"
// - Agrège les matchs X01 depuis History (legacy + V3 via statsByDartSet)
// - Affiche les stats par dartSetId (ou dartPresetId)
// =============================================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import {
  getDartSetsForProfile,
  type DartSet,
} from "../lib/dartSetsStore";

import { dartPresets } from "../lib/dartPresets";
import { getX01StatsByDartSetForProfile } from "../lib/statsByDartSet";

const N = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function fmt1(n: number) {
  const v = N(n, 0);
  return v.toFixed(1);
}

function presetById(id: string) {
  return (dartPresets || []).find((p) => p.id === id) || null;
}

function pickAccent(theme: any) {
  // on reste ultra safe : si ton ThemeContext expose primary, on le prend
  return (
    theme?.primary ||
    theme?.accent ||
    theme?.colors?.primary ||
    "#F6C256"
  );
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
            background:
              `radial-gradient(circle at 0% 0%, ${accentSoft}, transparent 60%), rgba(0,0,0,.28)`,
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
              AVG/3D {fmt1(top.avg3 || 0)}
            </span>
          </div>
        </div>
      )}

      {/* States */}
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

              const my = mySets.find((s: any) => s?.id === id) || null;
              const pr = !my ? presetById(id) : null;

              const name =
                my?.name ||
                pr?.name ||
                t("stats.dartSets.unknown", "Set inconnu");

              const img =
                my?.photoDataUrl ||
                my?.imgUrlMain ||
                pr?.imgUrlThumb ||
                pr?.imgUrlMain ||
                null;

              const avg3 = N(r.avg3, 0);
              const quality = clamp01(avg3 / 90);
              const badgeColor =
                quality > 0.72 ? "#7fe2a9" : quality > 0.45 ? accent : "#cfd1d7";

              return (
                <div
                  key={id || String(idx)}
                  style={{
                    minWidth: 252,
                    maxWidth: 252,
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,.10)",
                    background:
                      `radial-gradient(circle at 0% 0%, ${accentSoft}, transparent 60%), linear-gradient(180deg, rgba(18,18,22,.92), rgba(10,10,12,.90))`,
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
                        <Pill
                          text={`AVG/3D ${fmt1(avg3)}`}
                          color={badgeColor}
                        />
                        <Pill
                          text={`${t("stats.matches", "Matchs")} ${N(r.matches, 0)}`}
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
                    <KPI label={t("stats.bestVisit", "Best volée")} value={String(N(r.bestVisit, 0))} />
                    <KPI label={t("stats.bestCheckout", "Best CO")} value={String(N(r.bestCheckout, 0))} />
                    <KPI
                      label={t("stats.hits", "Hits")}
                      value={`S${N(r.hitsS, 0)} D${N(r.hitsD, 0)} T${N(r.hitsT, 0)}`}
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
                      label={t("stats.setType", "Type")}
                      value={my ? t("stats.dartSets.custom", "Perso") : pr ? t("stats.dartSets.preset", "Preset") : "—"}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* note */}
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
  const my = mySets?.find((s: any) => s?.id === id) || null;
  if (my?.name) return my.name;
  const pr = (dartPresets || []).find((p) => p.id === id) || null;
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
