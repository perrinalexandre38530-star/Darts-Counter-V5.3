// @ts-nocheck
// ============================================
// src/pages/ShanghaiEnd.tsx
// SHANGHAI — End / Stats match (depuis Historique)
// - Affiche le résumé d'une partie Shanghai terminée
// - Supporte égalité (winnerId null OU scores ex-aequo)
// - Lit rec.summary + fallback decode payload (base64+gzip)
// - UI neon propre, boutons Retour Historique / Rejouer (optionnel) / Quitter
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

type Props = {
  params?: any; // { rec, resumeId, from, go? }
  go?: (to: string, params?: any) => void;
};

async function decodePayload(raw: any): Promise<any | null> {
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

    return JSON.parse(bin);
  } catch {
    return null;
  }
}

function getId(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return String(v.id || v.playerId || v.profileId || v._id || "");
}
function getName(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return String(v.name || v.displayName || v.username || "");
}
function fmtDate(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

export default function ShanghaiEnd(props: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const go =
    props.go ||
    (props as any)?.params?.go ||
    (props as any)?.params?.store?.go ||
    (props as any)?.params?.router?.go;

  const rec = (props as any)?.params?.rec || (props as any)?.rec || null;

  const [decoded, setDecoded] = React.useState<any>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!rec) return;
      if (rec.decoded) {
        setDecoded(rec.decoded);
        return;
      }
      if (typeof rec.payload === "string") {
        const d = await decodePayload(rec.payload);
        if (alive) setDecoded(d);
      }
    })();
    return () => {
      alive = false;
    };
  }, [rec]);

  const mergedSummary = React.useMemo(() => {
    const s = (rec?.summary && typeof rec.summary === "object") ? rec.summary : {};
    const dsum =
      decoded?.summary ||
      decoded?.result ||
      decoded?.stats ||
      decoded?.payload?.summary ||
      {};
    // summary du match ShanghaiPlay : { mode, winRule, maxRounds, reason, targetOrderMode, targetOrder, scores[] }
    return { ...dsum, ...s };
  }, [rec, decoded]);

  const cfg = React.useMemo(() => {
    return (
      decoded?.config ||
      decoded?.payload?.config ||
      rec?.payload?.config ||
      rec?.config ||
      {}
    );
  }, [decoded, rec]);

  const createdAt =
    rec?.createdAt || rec?.updatedAt || mergedSummary?.createdAt || Date.now();

  const players = React.useMemo(() => {
    const arr = Array.isArray(rec?.players) ? rec.players : [];
    return arr.map((p: any) => ({
      id: getId(p),
      name: getName(p) || "Joueur",
      avatarDataUrl: p?.avatarDataUrl ?? null,
      isBot: !!p?.isBot,
    }));
  }, [rec]);

  const scoresArr = React.useMemo(() => {
    // prioritaire : summary.scores (comme ton ShanghaiPlay)
    const s = mergedSummary?.scores;
    if (Array.isArray(s) && s.length) {
      return s
        .map((x: any) => ({
          id: String(x.id ?? ""),
          name: String(x.name ?? "") || (players.find((p) => p.id === String(x.id))?.name ?? "Joueur"),
          score: Number(x.score ?? 0) || 0,
          avatarDataUrl: players.find((p) => p.id === String(x.id))?.avatarDataUrl ?? null,
        }))
        .filter((x: any) => x.id || x.name);
    }

    // fallback : summary.rankings / players
    const rk = mergedSummary?.rankings || mergedSummary?.players || mergedSummary?.standings;
    if (Array.isArray(rk) && rk.length) {
      return rk.map((x: any) => ({
        id: String(x.id ?? x.playerId ?? ""),
        name: String(x.name ?? x.playerName ?? "") || "Joueur",
        score: Number(x.score ?? x.points ?? x.total ?? 0) || 0,
        avatarDataUrl: players.find((p) => p.id === String(x.id ?? x.playerId))?.avatarDataUrl ?? null,
      }));
    }

    // fallback : players avec score 0
    return players.map((p) => ({ ...p, score: 0 }));
  }, [mergedSummary, players]);

  const ranked = React.useMemo(() => {
    const r = [...scoresArr].sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));
    return r;
  }, [scoresArr]);

  const topScore = ranked[0]?.score ?? 0;
  const tied = ranked.filter((x: any) => (x.score ?? 0) === topScore);
  const isTie = tied.length >= 2;

  const reason = String(mergedSummary?.reason || mergedSummary?.winReason || "").toLowerCase();
  const winRule = mergedSummary?.winRule || cfg?.winRule || "shanghai_or_points";
  const maxRounds = Number(mergedSummary?.maxRounds ?? cfg?.maxRounds ?? 20) || 20;
  const targetOrderMode = mergedSummary?.targetOrderMode || cfg?.targetOrderMode || "chronological";
  const targetOrder = mergedSummary?.targetOrder || cfg?.targetOrder || [];

  const cardShell: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: theme.card,
    boxShadow: `0 14px 38px rgba(0,0,0,0.6)`,
    overflow: "hidden",
  };

  function goBackHistory() {
    if (typeof go === "function") {
      try {
        go("history");
        return;
      } catch {}
      try {
        go("stats_history");
        return;
      } catch {}
      try {
        go("stats");
        return;
      } catch {}
    }
    try {
      window.history.back();
    } catch {}
  }

  function replayShanghai() {
    if (!rec) return;
    const resumeId = (props as any)?.params?.resumeId || rec?.resumeId || rec?.id;
    if (typeof go === "function") {
      // tentative routes
      const params = { resumeId, from: "shanghai_end", mode: "shanghai", preview: true };
      try {
        go("shanghai_play", params);
        return;
      } catch {}
      try {
        go("shanghai", params);
        return;
      } catch {}
    }
  }

  if (!rec) {
    return (
      <div style={{ minHeight: "100dvh", background: theme.bg, color: theme.text, padding: 16 }}>
        <div style={{ ...cardShell, padding: 16 }}>
          <div style={{ fontWeight: 1000, fontSize: 16, color: theme.primary }}>
            Shanghai — Résumé
          </div>
          <div style={{ marginTop: 10, opacity: 0.8 }}>Aucun match à afficher.</div>
          <button
            onClick={goBackHistory}
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
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: theme.bg,
        color: theme.text,
        padding: 16,
        paddingBottom: 90,
      }}
    >
      <div style={{ width: "100%", maxWidth: 520, margin: "0 auto" }}>
        <div style={{ ...cardShell }}>
          <div style={{ padding: 16 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 1000,
                color: theme.primary,
                textTransform: "uppercase",
                textShadow: `0 0 10px ${theme.primary}55`,
              }}
            >
              SHANGHAI — {t("common.match_end", "Résumé")}
            </div>

            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
              {fmtDate(createdAt)}
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div
                style={{
                  borderRadius: 999,
                  padding: "8px 12px",
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,0.18)",
                  fontWeight: 950,
                  fontSize: 12.5,
                }}
              >
                {t("shanghai.round", "Manches")} : {maxRounds}
              </div>

              <div
                style={{
                  borderRadius: 999,
                  padding: "8px 12px",
                  border: `1px solid ${theme.primary}66`,
                  background: `${theme.primary}12`,
                  color: theme.primary,
                  fontWeight: 950,
                  fontSize: 12.5,
                  textShadow: `0 0 10px ${theme.primary}33`,
                }}
              >
                {isTie
                  ? "🤝 ÉGALITÉ"
                  : reason === "shanghai"
                  ? "💥 Victoire SHANGHAI"
                  : "🏁 Victoire aux points"}
              </div>
            </div>

            <div style={{ marginTop: 12, fontWeight: 950, fontSize: 14 }}>
              {isTie ? (
                <>
                  🤝 {t("common.tie", "Égalité")} :{" "}
                  <span style={{ color: theme.primary, textShadow: `0 0 10px ${theme.primary}33` }}>
                    {tied.map((x: any) => x.name).join(" • ")}
                  </span>
                </>
              ) : (
                <>
                  🏆 {t("common.winner", "Gagnant")} :{" "}
                  <span style={{ color: theme.primary, textShadow: `0 0 10px ${theme.primary}33` }}>
                    {ranked[0]?.name || "—"}
                  </span>
                </>
              )}
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {ranked.map((r: any, idx: number) => (
                <div
                  key={(r.id || r.name) + "-" + idx}
                  style={{
                    padding: 10,
                    borderRadius: 16,
                    border: `1px solid ${idx === 0 ? theme.primary + "66" : theme.borderSoft}`,
                    background: idx === 0 ? `${theme.primary}12` : "rgba(0,0,0,0.18)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      textAlign: "center",
                      fontWeight: 1000,
                      color: idx === 0 ? theme.primary : theme.textSoft,
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      overflow: "hidden",
                      border: `1px solid ${theme.borderSoft}`,
                      background: "rgba(255,255,255,0.06)",
                      display: "grid",
                      placeItems: "center",
                      flex: "0 0 auto",
                    }}
                  >
                    {r.avatarDataUrl ? (
                      <img
                        src={r.avatarDataUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <span style={{ opacity: 0.75, fontWeight: 900 }}>?</span>
                    )}
                  </div>

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

                  <div style={{ fontWeight: 1000, fontSize: 16 }}>{r.score ?? 0}</div>
                </div>
              ))}
            </div>

            {/* --- Détails config --- */}
            <div style={{ marginTop: 14, ...cardShell, padding: 12, background: "rgba(0,0,0,0.18)" }}>
              <div style={{ fontWeight: 950, fontSize: 12.5, marginBottom: 8, color: theme.primary }}>
                {t("common.details", "Détails")}
              </div>

              <div style={{ fontSize: 12, lineHeight: 1.5, color: theme.textSoft }}>
                <div>• winRule : <b style={{ color: theme.text }}>{String(winRule)}</b></div>
                <div>• order : <b style={{ color: theme.text }}>{String(targetOrderMode)}</b></div>
                {Array.isArray(targetOrder) && targetOrder.length ? (
                  <div style={{ marginTop: 6 }}>
                    • targets :{" "}
                    <span style={{ color: theme.text }}>{targetOrder.join(" → ")}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* --- Actions --- */}
          <div
            style={{
              padding: 14,
              borderTop: `1px solid ${theme.borderSoft}`,
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              background: "rgba(0,0,0,0.18)",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={goBackHistory}
              style={{
                borderRadius: 999,
                padding: "10px 14px",
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,0.22)",
                color: theme.text,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              ← {t("common.back", "Retour")}
            </button>

            <button
              type="button"
              onClick={replayShanghai}
              style={{
                borderRadius: 999,
                padding: "10px 14px",
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,0.22)",
                color: theme.text,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {t("common.replay", "Rejouer")}
            </button>

            <button
              type="button"
              onClick={() => {
                // Quitter = retour historique (comme ton UX)
                goBackHistory();
              }}
              style={{
                borderRadius: 999,
                padding: "10px 14px",
                border: "none",
                background: theme.primary,
                color: "#000",
                fontWeight: 1000,
                cursor: "pointer",
                boxShadow: `0 12px 26px ${theme.primary}22`,
              }}
            >
              {t("common.quit", "Quitter")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
