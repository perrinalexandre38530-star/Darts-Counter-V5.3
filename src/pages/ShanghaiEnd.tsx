// @ts-nocheck
// ============================================
// src/pages/ShanghaiEnd.tsx — STATS SHANGHAI (PRO)
// - Classement + gagnant / égalité
// - ✅ Sparkline commune multi-joueurs (1 ligne par joueur, couleur diff)
// - ✅ Points de la sparkline = FIN DE MANCHE / CIBLE (1 point par cible terminée)
// - ✅ Hits par cible : n’affiche QUE les cibles avec points > 0
// - ✅ Affiche le NUMÉRO DE CIBLE (pas 1..10)
// - Robust: supporte rec.payload objet OU string (base64/gzip) OU rec.decoded (HistoryPage)
// - Compatible HistoryPage: go("shanghai_end", { rec })
// ============================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

type Props = {
  store?: any;
  go?: (to: string, params?: any) => void;
  params?: any;
};

function safeNum(n: any, def = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : def;
}

function pickRec(props: Props) {
  return props?.params?.rec || props?.params?.record || props?.params?.match || null;
}

function colorForIndex(i: number) {
  const hue = (i * 72) % 360; // 5 couleurs bien espacées
  return `hsl(${hue} 90% 65%)`;
}

/* ---------- Décodage payload (base64 + gzip) ---------- */
async function decodePayloadMaybe(raw: any): Promise<any | null> {
  if (!raw || typeof raw !== "string") return null;
  try {
    const bin = atob(raw);
    const buf = Uint8Array.from(bin, (c) => c.charCodeAt(0));

    const DS: any = (window as any).DecompressionStream;
    if (typeof DS === "function") {
      const ds = new DS("gzip");
      const stream = new Blob([buf]).stream().pipeThrough(ds);
      const resp = new Response(stream);
      return await resp.json();
    }

    // fallback (si pas gzip en réalité)
    return JSON.parse(bin);
  } catch {
    return null;
  }
}

/* ---------- Unpack “Shanghai pack” ultra robuste ---------- */
function getShanghaiPack(rec: any, decodedFromString: any) {
  // Priorité : rec.decoded (HistoryPage) > decodedFromString > rec.payload si objet
  const decoded = rec?.decoded || decodedFromString || null;

  const payloadObj =
    (rec?.payload && typeof rec.payload === "object" ? rec.payload : null) ||
    (decoded && typeof decoded === "object" ? decoded : null) ||
    {};

  const summary =
    rec?.summary ||
    payloadObj?.summary ||
    payloadObj?.payload?.summary ||
    decoded?.summary ||
    decoded?.payload?.summary ||
    {};

  const stats =
    payloadObj?.statsShanghai ||
    payloadObj?.payload?.statsShanghai ||
    decoded?.statsShanghai ||
    decoded?.payload?.statsShanghai ||
    {};

  const config =
    payloadObj?.config ||
    payloadObj?.payload?.config ||
    decoded?.config ||
    decoded?.payload?.config ||
    summary?.config ||
    {};

  const players =
    rec?.players ||
    payloadObj?.players ||
    summary?.scores ||
    summary?.players ||
    [];

  return { decoded, payloadObj, summary, stats, config, players };
}

function polylinePoints(
  series: number[],
  w: number,
  h: number,
  padX: number,
  padY: number,
  yMax: number
) {
  const arr = Array.isArray(series) ? series : [];
  const n = Math.max(1, arr.length);
  const innerW = Math.max(1, w - padX * 2);
  const innerH = Math.max(1, h - padY * 2);

  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = padX + innerW * (n === 1 ? 0 : i / (n - 1));
    const v = safeNum(arr[i], 0);
    const y = padY + innerH * (1 - (yMax <= 0 ? 0 : v / yMax));
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

/* ---------- Build series “1 point par cible” ---------- */
function buildSeriesPerTarget(
  pid: string,
  targetOrder: number[],
  hitsById: any,
  finalScoreFallback: number
) {
  const map = hitsById?.[pid] || {};
  let cum = 0;
  const out: number[] = [0];
  for (const target of targetOrder) {
    const hc = map?.[target];
    const pts = safeNum(hc?.points, 0);
    cum += pts;
    out.push(cum);
  }
  // si jamais tout est vide mais on a un score final connu, on force le dernier point
  if (out.length >= 2 && out[out.length - 1] === 0 && finalScoreFallback > 0) {
    out[out.length - 1] = finalScoreFallback;
  }
  return out;
}

export default function ShanghaiEnd(props: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const rec = pickRec(props);

  const [decodedFromString, setDecodedFromString] = useState<any>(null);

  // Si rec.payload est une string (History), on tente de décoder ici
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!rec) return;
        if (rec?.decoded) return;
        if (typeof rec?.payload !== "string") return;
        const dec = await decodePayloadMaybe(rec.payload);
        if (!alive) return;
        setDecodedFromString(dec);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [rec?.id]);

  if (!rec) {
    return (
      <div style={{ minHeight: "100dvh", background: theme.bg, color: theme.text, padding: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 16, color: theme.primary }}>SHANGHAI — RÉSUMÉ</div>
        <div style={{ opacity: 0.75, marginTop: 10 }}>Aucune partie à afficher.</div>
        <button
          onClick={() => props?.go?.("history")}
          style={{
            marginTop: 14,
            borderRadius: 999,
            padding: "10px 14px",
            border: `1px solid ${theme.borderSoft}`,
            background: "rgba(0,0,0,0.22)",
            color: theme.text,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          ← Retour
        </button>
      </div>
    );
  }

  const { summary, stats, config } = getShanghaiPack(rec, decodedFromString);

  const ranked = useMemo(() => {
    // scores d’abord dans summary.scores (ton buildMatchPayload le met)
    const s = summary?.scores;
    let arr =
      Array.isArray(s) && s.length
        ? s.map((x: any) => ({
            id: String(x.id),
            name: x.name || "Joueur",
            score: safeNum(x.score, 0),
          }))
        : [];

    // fallback: rec.players + summary.scoresById / summary.byId
    if (!arr.length) {
      const pl = Array.isArray(rec?.players) ? rec.players : [];
      arr = pl.map((p: any) => {
        const id = String(p?.id || "");
        const nm = p?.name || "Joueur";
        const byId = summary?.byId?.[id] || summary?.scoresById?.[id] || {};
        return { id, name: nm, score: safeNum(byId?.score, 0) };
      });
    }

    // fallback ultra: si on a un “scores” map
    if (!arr.length && summary?.scoresById && typeof summary.scoresById === "object") {
      arr = Object.entries(summary.scoresById).map(([id, v]: any) => ({
        id: String(id),
        name: v?.name || String(id),
        score: safeNum(v?.score, 0),
      }));
    }

    return [...arr].filter((x) => x.id).sort((a, b) => b.score - a.score);
  }, [rec?.id, summary]);

  const top = ranked?.[0]?.score ?? 0;
  const isTie = !!summary?.isTie || ranked.filter((r) => r.score === top).length >= 2;

  const hitsById = stats?.hitsById || {};
  const scoreTimelineById = stats?.scoreTimelineById || {};

  const targetOrder: number[] = useMemo(() => {
    const fromStats = stats?.targetOrder;
    const fromCfg = config?.targetOrder;
    const fromSummary = summary?.targetOrder;

    const picked =
      (Array.isArray(fromStats) && fromStats) ||
      (Array.isArray(fromCfg) && fromCfg) ||
      (Array.isArray(fromSummary) && fromSummary) ||
      null;

    if (picked && picked.length) {
      return picked.map((n: any) => safeNum(n, 0)).filter((n: number) => n >= 1 && n <= 20);
    }

    const mr = safeNum(summary?.maxRounds, safeNum(config?.maxRounds, 10));
    const base = Array.from({ length: Math.max(1, Math.min(20, mr)) }, (_, i) => i + 1);
    return base;
  }, [stats?.targetOrder, config?.targetOrder, summary?.targetOrder, summary?.maxRounds, config?.maxRounds]);

  // ✅ Série “par cible” (1 point à chaque fin de manche/cible)
  const seriesById = useMemo(() => {
    const out: Record<string, number[]> = {};
    for (const r of ranked) {
      const raw = scoreTimelineById?.[r.id];
      const maybe = Array.isArray(raw) ? raw.map((x: any) => safeNum(x, 0)) : null;

      // si la timeline est absente ou trop courte, on reconstruit depuis hitsById + targetOrder
      const rebuilt = buildSeriesPerTarget(r.id, targetOrder, hitsById, safeNum(r.score, 0));

      // On force “1 point par cible” (length = targetOrder.length + 1)
      if (!maybe || maybe.length < 2) {
        out[r.id] = rebuilt;
      } else {
        // si la timeline existante ne colle pas au “par cible”, on la remappe au bon format
        // (important pour ton souhait “1 point fin de manche/cible”)
        if (maybe.length !== targetOrder.length + 1) out[r.id] = rebuilt;
        else out[r.id] = maybe;
      }
    }
    return out;
  }, [ranked, scoreTimelineById, hitsById, targetOrder]);

  const yMax = useMemo(() => {
    let m = 1;
    for (const r of ranked) {
      const arr = seriesById?.[r.id];
      if (Array.isArray(arr)) for (const v of arr) m = Math.max(m, safeNum(v, 0));
      m = Math.max(m, safeNum(r.score, 0));
    }
    return m || 1;
  }, [ranked, seriesById]);

  const hasDetailed =
    !!stats &&
    (Object.keys(hitsById || {}).length > 0 || Object.keys(scoreTimelineById || {}).length > 0);

  const card: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: theme.card,
    boxShadow: "0 12px 28px rgba(0,0,0,.45)",
    overflow: "hidden",
  };

  const sectionTitle: React.CSSProperties = {
    marginTop: 14,
    fontWeight: 950,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: theme.primary,
    textShadow: `0 0 10px ${theme.primary}33`,
  };

  const chartW = 440;
  const chartH = 96;
  const padX = 12;
  const padY = 12;

  return (
    <div style={{ minHeight: "100dvh", background: theme.bg, color: theme.text, paddingBottom: 96 }}>
      <div style={{ padding: 14, maxWidth: 520, margin: "0 auto" }}>
        <div style={{ fontWeight: 1000, fontSize: 16, color: theme.primary, textTransform: "uppercase" }}>
          SHANGHAI — RÉSUMÉ
        </div>
        <div style={{ opacity: 0.75, fontSize: 12, marginTop: 2 }}>
          {new Date(rec?.updatedAt || rec?.createdAt || Date.now()).toLocaleString()}
        </div>

        {!hasDetailed ? (
          <div
            style={{
              marginTop: 10,
              borderRadius: 14,
              border: `1px solid ${theme.danger}55`,
              background: "rgba(255,0,0,0.08)",
              padding: 10,
              fontSize: 12,
              color: theme.text,
              opacity: 0.9,
            }}
          >
            ⚠️ Les stats détaillées ne sont pas présentes dans cet enregistrement (payload).
            <br />
            Le classement reste OK, mais hits/sparkline détaillés peuvent être incomplets.
          </div>
        ) : null}

        {/* HEADER / CLASSEMENT */}
        <div style={{ ...card, marginTop: 12, padding: 12, borderColor: theme.primary + "55" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,0.18)",
                fontWeight: 900,
                fontSize: 12,
              }}
            >
              Manches : {safeNum(summary?.maxRounds, targetOrder.length)}
            </div>

            <div
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,0.18)",
                fontWeight: 900,
                fontSize: 12,
                opacity: 0.9,
              }}
            >
              Règle : {String(summary?.winRule || summary?.reason || "shanghai / points")}
            </div>

            <div
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: `1px solid ${theme.primary}66`,
                background: `${theme.primary}14`,
                color: theme.primary,
                fontWeight: 950,
                fontSize: 12,
              }}
            >
              {isTie ? "🤝 Égalité" : `🏆 Gagnant : ${ranked?.[0]?.name || "—"}`}
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, fontWeight: 950, opacity: 0.9 }}>CLASSEMENT</div>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {ranked.map((r, idx) => (
              <div
                key={r.id}
                style={{
                  padding: 10,
                  borderRadius: 16,
                  border: `1px solid ${idx === 0 ? theme.primary + "66" : theme.borderSoft}`,
                  background: idx === 0 ? `${theme.primary}10` : "rgba(0,0,0,0.18)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 22,
                    textAlign: "center",
                    fontWeight: 1000,
                    color: idx === 0 ? theme.primary : theme.textSoft,
                  }}
                >
                  {idx + 1}
                </div>

                <div style={{ width: 10, height: 10, borderRadius: 999, background: colorForIndex(idx) }} />

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontWeight: 950,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {r.name}
                </div>

                <div style={{ fontWeight: 1000, fontSize: 16 }}>{r.score}</div>
              </div>
            ))}
          </div>

          {/* ✅ SPARKLINE COMMUNE MULTI-JOUEURS */}
          <div style={sectionTitle}>ÉVOLUTION DU SCORE</div>

          <div
            style={{
              marginTop: 8,
              borderRadius: 14,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,0.18)",
              padding: 10,
            }}
          >
            <div style={{ width: "100%", overflow: "hidden" }}>
              <svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" height={chartH} style={{ display: "block" }}>
                {/* grille */}
                <path
                  d={`M ${padX} ${chartH - padY} L ${chartW - padX} ${chartH - padY}`}
                  stroke="rgba(255,255,255,0.16)"
                  strokeWidth="1"
                  fill="none"
                />
                <path
                  d={`M ${padX} ${padY} L ${padX} ${chartH - padY}`}
                  stroke="rgba(255,255,255,0.10)"
                  strokeWidth="1"
                  fill="none"
                />

                {/* lignes verticales (une par cible) */}
                {(() => {
                  const n = Math.max(2, targetOrder.length + 1);
                  const innerW = Math.max(1, chartW - padX * 2);
                  const step = innerW / (n - 1);
                  const lines: any[] = [];
                  for (let i = 1; i < n - 1; i++) {
                    const x = padX + step * i;
                    lines.push(
                      <path
                        key={i}
                        d={`M ${x.toFixed(1)} ${padY} L ${x.toFixed(1)} ${(chartH - padY).toFixed(1)}`}
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="1"
                        fill="none"
                      />
                    );
                  }
                  return lines;
                })()}

                {ranked.map((r, i) => {
                  const series = seriesById?.[r.id] || [0, safeNum(r.score, 0)];
                  const col = colorForIndex(i);
                  const pts = polylinePoints(series, chartW, chartH, padX, padY, yMax);

                  // points visibles à chaque fin de cible
                  const innerW = Math.max(1, chartW - padX * 2);
                  const innerH = Math.max(1, chartH - padY * 2);

                  return (
                    <g key={r.id}>
                      <polyline
                        points={pts}
                        fill="none"
                        stroke={col}
                        strokeWidth="3"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />

                      {series.map((v: any, idx: number) => {
                        const n = Math.max(1, series.length);
                        const x = padX + innerW * (n === 1 ? 0 : idx / (n - 1));
                        const y = padY + innerH * (1 - safeNum(v, 0) / yMax);
                        return <circle key={idx} cx={x} cy={y} r={2.8} fill={col} opacity={idx === series.length - 1 ? 1 : 0.8} />;
                      })}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* légende */}
            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
              {ranked.map((r, i) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <div
                    style={{
                      width: 14,
                      height: 4,
                      borderRadius: 999,
                      background: colorForIndex(i),
                      boxShadow: `0 0 10px ${colorForIndex(i)}55`,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.name}
                  </div>
                  <div style={{ fontWeight: 950, opacity: 0.9 }}>Final {r.score}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 8, fontSize: 11, opacity: 0.65 }}>
              (1 point = fin d’une manche/cible — cible jouée une fois par joueur)
            </div>
          </div>

          {/* HITS PAR CIBLE */}
          <div style={sectionTitle}>HISTORIQUE DES HITS PAR CIBLE</div>

          <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
            {ranked.map((r, idx) => {
              const map = hitsById?.[r.id] || {};
              const rows = targetOrder
                .map((target) => {
                  const hc = map?.[target] || null;
                  const pts = safeNum(hc?.points, 0);
                  if (pts <= 0) return null; // ✅ n’affiche que les hits qui font des points
                  return {
                    target,
                    S: safeNum(hc?.S, 0),
                    D: safeNum(hc?.D, 0),
                    T: safeNum(hc?.T, 0),
                    MISS: safeNum(hc?.MISS, 0),
                    points: pts,
                  };
                })
                .filter(Boolean);

              return (
                <div
                  key={r.id}
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${theme.borderSoft}`,
                    background: "rgba(0,0,0,0.18)",
                    padding: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 999, background: colorForIndex(idx) }} />
                    <div style={{ fontWeight: 950 }}>{r.name}</div>
                  </div>

                  {!rows.length ? (
                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>Aucun hit marquant.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      {rows.map((row: any) => (
                        <div
                          key={row.target}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 10px",
                            borderRadius: 14,
                            border: `1px solid ${theme.borderSoft}`,
                            background: "rgba(0,0,0,0.14)",
                          }}
                        >
                          {/* ✅ numéro de cible (pas 1..10) */}
                          <div
                            style={{
                              width: 34,
                              textAlign: "center",
                              fontWeight: 1000,
                              color: theme.primary,
                              borderRadius: 10,
                              border: `1px solid ${theme.primary}55`,
                              background: `${theme.primary}12`,
                              padding: "4px 0",
                            }}
                          >
                            {row.target}
                          </div>

                          <div
                            style={{
                              flex: 1,
                              fontSize: 12,
                              opacity: 0.92,
                              display: "flex",
                              gap: 10,
                              flexWrap: "wrap",
                            }}
                          >
                            <span>S:{row.S}</span>
                            <span>D:{row.D}</span>
                            <span>T:{row.T}</span>
                            <span style={{ opacity: 0.75 }}>MISS:{row.MISS}</span>
                          </div>

                          <div style={{ fontWeight: 1000, color: theme.primary }}>{row.points} pts</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ACTIONS */}
        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 14 }}>
          <button
            onClick={() => props?.go?.("history")}
            style={{
              borderRadius: 999,
              padding: "10px 14px",
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,0.22)",
              color: theme.text,
              fontWeight: 900,
              flex: 1,
              cursor: "pointer",
            }}
          >
            ← Retour
          </button>

          <button
            onClick={() => props?.go?.("shanghai")}
            style={{
              borderRadius: 999,
              padding: "10px 14px",
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,0.22)",
              color: theme.text,
              fontWeight: 900,
              flex: 1,
              cursor: "pointer",
            }}
          >
            Rejouer
          </button>

          <button
            onClick={() => props?.go?.("games")}
            style={{
              borderRadius: 999,
              padding: "10px 14px",
              border: "none",
              background: theme.primary,
              color: "#000",
              fontWeight: 1000,
              flex: 1,
              boxShadow: `0 12px 26px ${theme.primary}22`,
              cursor: "pointer",
            }}
          >
            Quitter
          </button>
        </div>
      </div>
    </div>
  );
}
