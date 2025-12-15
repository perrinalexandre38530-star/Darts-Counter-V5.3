// @ts-nocheck
// =============================================================
// src/pages/KillerSummaryPage.tsx
// Résumé de match KILLER (spécifique, pas X01)
// - Classement + winner + règles
// - Stats par joueur : kills / dmg / throws / becomes / hits top
// - Log (timeline inversée)
// =============================================================

import * as React from "react";
import type { Store, MatchRecord } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any; // { rec? , id? }
};

const pageBg =
  "radial-gradient(circle at 25% 0%, rgba(255,198,58,.18) 0, rgba(0,0,0,0) 35%), radial-gradient(circle at 80% 30%, rgba(255,198,58,.10) 0, rgba(0,0,0,0) 40%), linear-gradient(180deg, #0a0a0c, #050507 60%, #020203)";

const card: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(22,22,23,.85), rgba(12,12,14,.95))",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 18,
  boxShadow: "0 10px 30px rgba(0,0,0,.35)",
};

function safeNum(n: any, d = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : d;
}

function fmtDate(ts: any) {
  const t = safeNum(ts, 0);
  if (!t) return "—";
  try {
    return new Date(t).toLocaleString();
  } catch {
    return "—";
  }
}

function Avatar({ size, src, name }: { size: number; src?: string | null; name?: string }) {
  const initials = String(name || "J").trim().slice(0, 1).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", background: "transparent" }}>
      {src ? (
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            placeItems: "center",
            borderRadius: "50%",
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.10)",
            fontWeight: 1000,
            color: "#fff",
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children, accent }: any) {
  return (
    <div
      style={{
        fontWeight: 1000,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        fontSize: 12,
        color: accent,
      }}
    >
      {children}
    </div>
  );
}

function StatPill({ label, value, accent }: any) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,.10)",
        background: "rgba(0,0,0,.28)",
        padding: "8px 10px",
        display: "grid",
        gap: 2,
        minWidth: 90,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 9, opacity: 0.8, fontWeight: 900, letterSpacing: 1.0, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 1000, color: accent }}>{value}</div>
    </div>
  );
}

function normalizeSegKey(k: any) {
  return String(k || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "")
    .replace(/-/g, "");
}

function topFromMap(map: Record<string, number> | null | undefined, limit = 6) {
  const entries = Object.entries(map || {})
    .map(([k, v]) => [String(k), safeNum(v, 0)] as const)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  return entries.slice(0, limit);
}

function resolveKillerRecord(store: Store, params: any): any | null {
  if (params?.rec) return params.rec;
  const id = params?.id || params?.matchId || params?.recordId;
  if (!id) return null;

  // store.history peut être array ou object selon ton app
  const h: any = (store as any)?.history;
  if (!h) return null;

  if (Array.isArray(h)) {
    return h.find((x) => x?.id === id || x?.matchId === id || x?.createdAt === id) || null;
  }

  // object map
  if (typeof h === "object") {
    if (h[id]) return h[id];
    const vals = Object.values(h);
    return vals.find((x: any) => x?.id === id || x?.matchId === id) || null;
  }

  return null;
}

export default function KillerSummaryPage({ store, go, params }: Props) {
  const { theme } = useTheme();
  const accent = (theme as any)?.primary || "#ffc63a";
  const accent2 = (theme as any)?.primary2 || "#ffaf00";

  const rec = React.useMemo(() => resolveKillerRecord(store, params), [store, params]);

  const killer = React.useMemo(() => {
    if (!rec) return null;
    const kind = String((rec as any)?.kind || (rec as any)?.summary?.mode || "").toLowerCase();
    if (kind.includes("killer")) return rec;
    // certains records peuvent avoir kind="match" mais summary.mode="killer"
    if (String((rec as any)?.summary?.mode || "").toLowerCase() === "killer") return rec;
    if (String((rec as any)?.payload?.mode || "").toLowerCase() === "killer") return rec;
    return null;
  }, [rec]);

  const data = React.useMemo(() => {
    if (!killer) return null;

    const summary = (killer as any)?.summary || (killer as any)?.payload?.summary || {};
    const config = (killer as any)?.payload?.config || (killer as any)?.payload?.payload?.config || (killer as any)?.payload?.config || {};

    const perPlayer = (summary?.perPlayer || summary?.detailedByPlayer ? null : null) as any;
    const detailedByPlayer = summary?.detailedByPlayer || {};

    // on reconstruit une liste "players"
    let players: any[] = [];
    if (Array.isArray(summary?.perPlayer) && summary.perPlayer.length) {
      players = summary.perPlayer;
    } else if (detailedByPlayer && typeof detailedByPlayer === "object") {
      players = Object.values(detailedByPlayer);
    } else if (Array.isArray((killer as any)?.players)) {
      players = (killer as any)?.players || [];
    }

    // normalise
    const rows = players
      .map((p: any) => {
        const id = String(p?.id || p?.playerId || "");
        const name = p?.name || "Joueur";
        const avatarDataUrl = p?.avatarDataUrl || null;
        const finalRank = safeNum(p?.finalRank, 999);
        const kills = safeNum(p?.kills, 0);
        const livesTaken = safeNum(p?.livesTaken, 0);
        const livesLost = safeNum(p?.livesLost, 0);
        const totalThrows = safeNum(p?.totalThrows, 0);
        const killerThrows = safeNum(p?.killerThrows, 0);
        const offensiveThrows = safeNum(p?.offensiveThrows, 0);
        const uselessHits = safeNum(p?.uselessHits, 0);
        const hitsOnSelf = safeNum(p?.hitsOnSelf, 0);
        const becameAtThrow = p?.becameAtThrow ?? null;
        const throwsToBecomeKiller = safeNum(p?.throwsToBecomeKiller, 0);
        const number = safeNum(p?.number, 0);

        const hitsBySegment = p?.hitsBySegment || {};
        const hitsByNumber = p?.hitsByNumber || {};

        return {
          id,
          name,
          avatarDataUrl,
          finalRank,
          number,
          kills,
          livesTaken,
          livesLost,
          totalThrows,
          killerThrows,
          offensiveThrows,
          uselessHits,
          hitsOnSelf,
          becameAtThrow,
          throwsToBecomeKiller,
          hitsBySegment,
          hitsByNumber,
        };
      })
      .sort((a: any, b: any) => (a.finalRank || 999) - (b.finalRank || 999));

    const winnerId = String((killer as any)?.winnerId || "");
    const winnerRow = rows.find((r) => r.id === winnerId) || rows[0] || null;

    const livesStart = safeNum(summary?.livesStart ?? config?.lives, 3);
    const becomeRule = String(summary?.becomeRule ?? config?.becomeRule ?? "single");
    const damageRule = String(summary?.damageRule ?? config?.damageRule ?? "multiplier");

    return {
      rows,
      winnerRow,
      winnerId,
      livesStart,
      becomeRule,
      damageRule,
      createdAt: (killer as any)?.createdAt || (killer as any)?.updatedAt || 0,
      updatedAt: (killer as any)?.updatedAt || 0,
    };
  }, [killer]);

  if (!killer || !data) {
    return (
      <div style={{ minHeight: "100vh", background: pageBg, color: "#fff", padding: 14 }}>
        <div style={{ ...card, padding: 12 }}>
          <div style={{ fontWeight: 1000, color: accent, letterSpacing: 1.4, textTransform: "uppercase" }}>Résumé KILLER</div>
          <div style={{ marginTop: 8, opacity: 0.85 }}>Aucun match KILLER trouvé.</div>
          <button
            type="button"
            onClick={() => go("history")}
            style={{
              marginTop: 12,
              height: 40,
              padding: "0 14px",
              borderRadius: 14,
              border: "1px solid rgba(255,180,0,.30)",
              background: `linear-gradient(180deg, ${accent}, ${accent2})`,
              color: "#1a1a1a",
              fontWeight: 1000,
              cursor: "pointer",
            }}
          >
            ← Retour Historique
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: pageBg, color: "#fff", padding: "12px 12px 92px" }}>
      {/* HEADER */}
      <div style={{ ...card, padding: 10, display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          onClick={() => go("history")}
          style={{
            height: 34,
            padding: "0 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,180,0,.30)",
            background: `linear-gradient(180deg, ${accent}, ${accent2})`,
            color: "#1a1a1a",
            fontWeight: 1000,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          ← Historique
        </button>

        <div style={{ textAlign: "center", lineHeight: 1 }}>
          <div style={{ fontWeight: 1000, color: accent, letterSpacing: 1.6, textTransform: "uppercase" }}>Résumé KILLER</div>
          <div style={{ marginTop: 4, fontSize: 11, opacity: 0.75 }}>
            {fmtDate(data.createdAt)} {data.updatedAt ? `· fin ${fmtDate(data.updatedAt)}` : ""}
          </div>
        </div>

        <div style={{ width: 34 }} />
      </div>

      {/* WINNER CARD */}
      <div style={{ marginTop: 10, ...card, padding: 12, border: "1px solid rgba(255,198,58,.22)" }}>
        <SectionTitle accent={accent}>Victoire</SectionTitle>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "72px 1fr", gap: 12, alignItems: "center" }}>
          <Avatar size={64} src={data.winnerRow?.avatarDataUrl} name={data.winnerRow?.name} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>🏆 Gagnant</div>
            <div style={{ fontSize: 18, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {data.winnerRow?.name || "—"}
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <StatPill label="Kills" value={safeNum(data.winnerRow?.kills, 0)} accent={accent} />
              <StatPill label="Dégâts" value={safeNum(data.winnerRow?.livesTaken, 0)} accent={accent} />
              <StatPill label="Lancers" value={safeNum(data.winnerRow?.totalThrows, 0)} accent={accent} />
            </div>
          </div>
        </div>
      </div>

      {/* RULES SUMMARY */}
      <div style={{ marginTop: 10, ...card, padding: 12 }}>
        <SectionTitle accent={accent}>Règles</SectionTitle>
        <div style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 12, opacity: 0.9, lineHeight: 1.35 }}>
          <div>• Vies départ : <b style={{ color: "#ffe7b0" }}>{data.livesStart}</b></div>
          <div>• Devenir KILLER : <b style={{ color: "#ffe7b0" }}>{data.becomeRule === "double" ? "DOUBLE sur ton numéro" : "SIMPLE suffit"}</b></div>
          <div>• Dégâts : <b style={{ color: "#ffe7b0" }}>{data.damageRule === "multiplier" ? "S/D/T = 1/2/3 vies" : "Toujours 1 vie"}</b></div>
        </div>
      </div>

      {/* RANKING */}
      <div style={{ marginTop: 10, ...card, padding: 12 }}>
        <SectionTitle accent={accent}>Classement</SectionTitle>

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {data.rows.map((p: any, idx: number) => {
            const isWin = idx === 0;
            return (
              <div
                key={p.id || idx}
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,.08)",
                  background: isWin ? "rgba(255,198,58,.10)" : "rgba(0,0,0,.22)",
                  padding: "10px 10px",
                  display: "grid",
                  gridTemplateColumns: "34px 1fr auto",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 1000, textAlign: "center", color: isWin ? accent : "#fff" }}>{idx + 1}</div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Avatar size={34} src={p.avatarDataUrl} name={p.name} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.name}{" "}
                      <span style={{ fontSize: 12, opacity: 0.75 }}>#{p.number || "?"}</span>
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.78 }}>
                      kills {p.kills} · dmg {p.livesTaken} · lancers {p.totalThrows}
                    </div>
                  </div>
                </div>

                <div style={{ fontWeight: 1000, color: isWin ? accent : "#ffe7b0" }}>{isWin ? "WIN" : ""}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PLAYER DETAILS */}
      <div style={{ marginTop: 10, ...card, padding: 12 }}>
        <SectionTitle accent={accent}>Détails joueurs</SectionTitle>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {data.rows.map((p: any, idx: number) => {
            const topSeg = topFromMap(p.hitsBySegment, 6);
            const topNum = topFromMap(p.hitsByNumber, 6)
              .map(([k, v]) => [String(k), v] as const)
              .sort((a, b) => b[1] - a[1]);

            return (
              <div key={p.id || idx} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.22)", padding: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar size={38} src={p.avatarDataUrl} name={p.name} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.name} <span style={{ fontSize: 12, opacity: 0.75 }}>#{p.number || "?"}</span>
                    </div>
                    <div style={{ marginTop: 2, fontSize: 11, opacity: 0.78 }}>
                      rang {idx + 1} · kills {p.kills} · dmg {p.livesTaken} · lancers {p.totalThrows}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  <StatPill label="Kills" value={p.kills} accent={accent} />
                  <StatPill label="Dégâts" value={p.livesTaken} accent={accent} />
                  <StatPill label="Lancers" value={p.totalThrows} accent={accent} />
                  <StatPill label="Hits inutiles" value={p.uselessHits} accent={accent} />
                </div>

                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 1000, opacity: 0.85, letterSpacing: 1.0, textTransform: "uppercase", color: "#ffe7b0" }}>
                      Top segments
                    </div>
                    <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {topSeg.length ? (
                        topSeg.map(([k, v]) => (
                          <span
                            key={k}
                            style={{
                              borderRadius: 999,
                              border: "1px solid rgba(255,255,255,.12)",
                              background: "rgba(255,255,255,.06)",
                              padding: "6px 10px",
                              fontSize: 11,
                              fontWeight: 900,
                            }}
                          >
                            {normalizeSegKey(k)} <span style={{ opacity: 0.7 }}>·</span> {v}
                          </span>
                        ))
                      ) : (
                        <div style={{ fontSize: 12, opacity: 0.7 }}>—</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 1000, opacity: 0.85, letterSpacing: 1.0, textTransform: "uppercase", color: "#ffe7b0" }}>
                      Top numéros
                    </div>
                    <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {topNum.length ? (
                        topNum.map(([k, v]) => (
                          <span
                            key={k}
                            style={{
                              borderRadius: 999,
                              border: "1px solid rgba(255,255,255,.12)",
                              background: "rgba(255,255,255,.06)",
                              padding: "6px 10px",
                              fontSize: 11,
                              fontWeight: 900,
                            }}
                          >
                            #{k} <span style={{ opacity: 0.7 }}>·</span> {v}
                          </span>
                        ))
                      ) : (
                        <div style={{ fontSize: 12, opacity: 0.7 }}>—</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LOG */}
      <div style={{ marginTop: 10, ...card, padding: 12 }}>
        <SectionTitle accent={accent}>Journal (log)</SectionTitle>
        <div style={{ marginTop: 10, maxHeight: 280, overflow: "auto", paddingRight: 4 }}>
          {(Array.isArray((killer as any)?.log) ? (killer as any)?.log : Array.isArray((killer as any)?.payload?.log) ? (killer as any)?.payload?.log : []).length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {(Array.isArray((killer as any)?.log) ? (killer as any)?.log : (killer as any)?.payload?.log).map((line: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,.08)",
                    background: "rgba(0,0,0,.22)",
                    padding: "8px 10px",
                    fontSize: 12,
                    opacity: 0.92,
                  }}
                >
                  {String(line)}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.7 }}>—</div>
          )}
        </div>
      </div>
    </div>
  );
}
