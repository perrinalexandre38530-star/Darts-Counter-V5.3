// @ts-nocheck
// ============================================
// src/pages/StatsKiller.tsx
// Onglet KILLER dans le "Centre de statistiques" (StatsHub)
// ✅ Les STATS vivent dans ../lib/statsKiller
// - Robuste: lit memHistory (agrégé App.tsx) et filtre kind === "killer"
// - Support: playerId (profil actif) => stats perso complètes
// - Affiche: matchs / wins / win% / kills / fav segment / fav numéro / hits total + historique
// ============================================

import React from "react";
import type { Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { computeKillerStatsAggForProfile } from "../lib/statsKiller";

type Props = {
  profiles: Profile[];
  memHistory: any[];              // records déjà "withAvatars"
  playerId?: string | null;       // si défini, filtre par joueur
  title?: string;                // optionnel
};

function pct(n: number) {
  if (!Number.isFinite(n)) return "0";
  return String(Math.round(n));
}

function fixed1(n: number) {
  if (!Number.isFinite(n)) return "0.0";
  return n.toFixed(1);
}

export default function StatsKiller({
  profiles,
  memHistory,
  playerId = null,
  title = "KILLER",
}: Props) {
  const { theme } = useTheme();

  const agg = React.useMemo(() => {
    return computeKillerStatsAggForProfile(memHistory, playerId || null);
  }, [memHistory, playerId]);

  const historyItems = React.useMemo(() => {
    const list = Array.isArray(memHistory) ? memHistory : [];
    const killer = list.filter((r) => (r?.kind || r?.payload?.kind) === "killer");

    const filtered = playerId
      ? killer.filter((r) =>
          (r?.players || r?.payload?.players || []).some((p: any) => String(p?.id) === String(playerId))
        )
      : killer;

    const sorted = filtered
      .slice()
      .sort((a: any, b: any) => Number(b?.updatedAt ?? b?.createdAt ?? 0) - Number(a?.updatedAt ?? a?.createdAt ?? 0));

    return sorted.slice(0, 20).map((r: any) => {
      const when = Number(r?.updatedAt ?? r?.createdAt ?? 0);
      const w = r?.winnerId ?? r?.payload?.winnerId ?? null;

      const players = (r?.players || r?.payload?.players || []) as any[];
      const names = players.map((p) => p?.name).filter(Boolean).join(" · ");

      const winnerName =
        w ? (profiles.find((p) => p.id === w)?.name ?? players.find((p) => p?.id === w)?.name ?? "—") : "—";

      return { id: r?.id ?? `${when}-${Math.random()}`, when, names, winnerName };
    });
  }, [memHistory, playerId, profiles]);

  const lastStr = agg.lastAt ? new Date(agg.lastAt).toLocaleString() : "—";

  const favNumLabel = agg.favNumber ? `#${agg.favNumber}` : "—";
  const favNumSub =
    agg.favNumberHits > 0 ? `${agg.favNumberHits} hit(s)` : `${agg.totalHits || 0} hit(s)`;

  const favSegLabel = agg.favSegment ? `${agg.favSegment}` : "—";
  const favSegSub =
    agg.favSegmentHits > 0 ? `${agg.favSegmentHits} hit(s)` : `${agg.totalHits || 0} hit(s)`;

  return (
    <div style={{ padding: 12 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: theme.primary,
          textShadow: `0 0 12px ${theme.primary}66`,
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <Kpi label="Matchs" value={`${agg.played}`} theme={theme} />

        <Kpi
          label={playerId ? "Victoires" : "Dernier match"}
          value={playerId ? `${agg.wins}` : lastStr}
          theme={theme}
        />

        {playerId && (
          <>
            <Kpi label="Win %" value={`${pct(agg.winRate)}`} theme={theme} />
            <Kpi label="Kills" value={`${agg.killsTotal || 0}`} theme={theme} />
            <Kpi label="Kills / match" value={fixed1(agg.killsAvg || 0)} theme={theme} />
            <Kpi label="Hits total" value={`${agg.totalHits || 0}`} theme={theme} />
            <Kpi label="Segment favori" value={favSegLabel} sub={favSegSub} theme={theme} />
            <Kpi label="Numéro favori" value={favNumLabel} sub={favNumSub} theme={theme} />
          </>
        )}
      </div>

      {/* HISTORIQUE */}
      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${theme.borderSoft}`,
          background: theme.card,
          overflow: "hidden",
          boxShadow: `0 14px 28px rgba(0,0,0,.55), 0 0 14px ${theme.primary}22`,
        }}
      >
        <div
          style={{
            padding: "10px 12px",
            borderBottom: `1px solid ${theme.borderSoft}`,
            color: theme.textSoft,
            fontSize: 12,
          }}
        >
          Historique KILLER (20 derniers)
        </div>

        {historyItems.length === 0 ? (
          <div style={{ padding: 12, color: theme.textSoft, fontSize: 12 }}>
            Aucun match KILLER trouvé.
          </div>
        ) : (
          historyItems.map((it: any) => (
            <div
              key={it.id}
              style={{
                padding: "10px 12px",
                borderBottom: `1px solid ${theme.borderSoft}`,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 800, color: theme.text }}>
                {it.when ? new Date(it.when).toLocaleString() : "—"}
              </div>
              <div style={{ fontSize: 12, color: theme.textSoft }}>
                {it.names || "—"}
              </div>
              <div style={{ fontSize: 12, color: theme.primary }}>
                Vainqueur : {it.winnerName}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, theme }: any) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${theme.borderSoft}`,
        background: theme.card,
        padding: "10px 12px",
        boxShadow: `0 12px 24px rgba(0,0,0,.45), 0 0 12px ${theme.primary}18`,
        minHeight: 64,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: theme.textSoft,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: 0.7,
          fontWeight: 800,
        }}
      >
        {label}
      </div>

      <div style={{ fontSize: 16, fontWeight: 900, color: theme.text, lineHeight: 1.05 }}>
        {value}
      </div>

      {sub ? (
        <div style={{ marginTop: 6, fontSize: 10.5, color: theme.textSoft, opacity: 0.9 }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}
