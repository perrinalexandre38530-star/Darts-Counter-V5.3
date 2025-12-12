// =============================================================
// src/components/StatsDartSetsSection.tsx
// Section StatsHub — "Stats par fléchettes"
// - Agrège les matchs X01 depuis History
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

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function fmt2(n: number) {
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

function presetById(id: string) {
  return (dartPresets || []).find((p) => p.id === id) || null;
}

export default function StatsDartSetsSection(props: {
  activeProfileId: string | null;
  title?: string;
}) {
  const { activeProfileId, title } = props;
  const { theme } = useTheme();
  const { t } = useLang() as any;

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
        // sets du profil (tes sets persos)
        const s = getDartSetsForProfile(activeProfileId);
        if (mounted) setMySets(s || []);
      } catch {
        if (mounted) setMySets([]);
      }

      try {
        const stats = await getX01StatsByDartSetForProfile(activeProfileId);
        if (mounted) setRows(stats || []);
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

  const cardBg =
    "linear-gradient(180deg, rgba(15,15,18,.92), rgba(10,10,12,.88))";
  const cardBorder = "1px solid rgba(255,255,255,.08)";
  const glow = "0 10px 26px rgba(0,0,0,.45)";

  if (!activeProfileId) {
    return null;
  }

  return (
    <div
      style={{
        borderRadius: 18,
        border: cardBorder,
        background: cardBg,
        boxShadow: glow,
        padding: 10,
      }}
    >
      <div
        style={{
          fontWeight: 900,
          fontSize: 16,
          color: "#ffcf57",
          letterSpacing: 0.6,
          textTransform: "uppercase",
          marginBottom: 8,
          textShadow: "0 0 14px rgba(255,195,26,.22)",
        }}
      >
        {title || t("stats.dartSets.title", "Stats par fléchettes")}
      </div>

      {loading ? (
        <div style={{ color: "#cfd1d7", fontSize: 12, padding: 6 }}>
          {t("common.loading", "Chargement...")}
        </div>
      ) : err ? (
        <div style={{ color: "#ff8a8a", fontSize: 12, padding: 6 }}>
          {t("common.error", "Erreur")} : {String(err)}
        </div>
      ) : !rows.length ? (
        <div style={{ color: "#cfd1d7", fontSize: 12, padding: 6 }}>
          {t(
            "stats.dartSets.empty",
            "Aucune partie X01 trouvée pour ce profil."
          )}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 6,
          }}
        >
          {rows.map((r: any) => {
            const id: string = r.dartSetId;

            // 1) set perso ?
            const my = mySets.find((s: any) => s?.id === id) || null;

            // 2) preset ?
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

            // petit score "qualité" pour badge (bonus)
            const avg3 = Number(r.avg3 || 0);
            const quality = clamp01(avg3 / 90); // 90 = très bon repère visuel
            const badgeColor =
              quality > 0.72
                ? "#7fe2a9"
                : quality > 0.45
                ? "#ffcf57"
                : "#cfd1d7";

            return (
              <div
                key={id}
                style={{
                  minWidth: 240,
                  maxWidth: 240,
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,.08)",
                  background:
                    "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.10), transparent 55%), linear-gradient(180deg, rgba(18,18,22,.92), rgba(10,10,12,.9))",
                  boxShadow: "0 10px 26px rgba(0,0,0,.42)",
                  padding: 10,
                }}
              >
                <div style={{ display: "flex", gap: 10 }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 14,
                      overflow: "hidden",
                      background: "rgba(255,255,255,.06)",
                      border: "1px solid rgba(255,255,255,.08)",
                      flex: "0 0 auto",
                    }}
                  >
                    {img ? (
                      <img
                        src={img}
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
                          color: "#999",
                          fontWeight: 800,
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
                        color: "#ffcf57",
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
                        display: "inline-flex",
                        padding: "3px 8px",
                        borderRadius: 999,
                        border: `1px solid ${badgeColor}55`,
                        background: "rgba(255,255,255,.04)",
                        color: badgeColor,
                        fontWeight: 900,
                        fontSize: 11,
                      }}
                    >
                      AVG/3D {fmt2(avg3)}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        color: "#cfd1d7",
                        fontSize: 11.5,
                      }}
                    >
                      {t("stats.matches", "Matchs")} :{" "}
                      <b style={{ color: "#fff" }}>{r.matches}</b>
                      {"  "}•{" "}
                      {t("stats.darts", "Darts")} :{" "}
                      <b style={{ color: "#fff" }}>{r.darts}</b>
                    </div>
                  </div>
                </div>

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
                    value={String(r.bestVisit ?? 0)}
                  />
                  <KPI
                    label={t("stats.bestCheckout", "Best CO")}
                    value={String(r.bestCheckout ?? 0)}
                  />
                  <KPI
                    label={t("stats.hits", "Hits")}
                    value={`S${r.hitsS || 0} D${r.hitsD || 0} T${r.hitsT || 0}`}
                  />
                  <KPI
                    label={t("stats.misc", "Miss/Bust")}
                    value={`${r.miss || 0} / ${r.bust || 0}`}
                  />
                  <KPI
                    label={t("stats.bull", "Bull")}
                    value={`${r.bull || 0} / ${r.dBull || 0}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KPI(props: { label: string; value: string }) {
  const { label, value } = props;
  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,.07)",
        background: "rgba(255,255,255,.04)",
        padding: "7px 8px",
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          color: "#cfd1d7",
          opacity: 0.95,
          marginBottom: 2,
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
