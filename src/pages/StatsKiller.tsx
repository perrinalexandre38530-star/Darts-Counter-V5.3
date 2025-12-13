// ============================================
// src/pages/StatsKiller.tsx
// Onglet KILLER dans le "Centre de statistiques" (StatsHub)
// - Stats globales ou par joueur
// - Basé sur statsKiller.ts (agrégateur)
// ============================================

import React from "react";
import type { Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { computeKillerStatsAggForProfile } from "../lib/statsKiller";

type Props = {
  profiles: Profile[];
  memHistory: any[];
  playerId?: string | null;
  title?: string;
};

function pct(n: number) {
  if (!Number.isFinite(n)) return "0";
  return String(Math.round(n));
}

export default function StatsKiller({
  profiles,
  memHistory,
  playerId = null,
  title = "KILLER",
}: Props) {
  const { theme } = useTheme();

  const agg = React.useMemo(() => {
    return computeKillerStatsAggForProfile(memHistory, playerId);
  }, [memHistory, playerId]);

  const lastStr = agg.lastPlayedAt
    ? new Date(agg.lastPlayedAt).toLocaleString()
    : "—";

  return (
    <div style={{ padding: 12 }}>
      {/* TITLE */}
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
        <Kpi label="Matchs joués" value={`${agg.totalMatches}`} theme={theme} />
        <Kpi label="Victoires" value={`${agg.wins}`} theme={theme} />
        <Kpi label="Win %" value={pct(agg.winRate * 100)} theme={theme} />
        <Kpi label="Kills total" value={`${agg.totalKills}`} theme={theme} />
        <Kpi label="Kills / match" value={agg.avgKills.toFixed(2)} theme={theme} />
        <Kpi label="Éliminations" value={`${agg.deaths}`} theme={theme} />
      </div>

      {/* META */}
      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${theme.borderSoft}`,
          background: theme.card,
          padding: "10px 12px",
          boxShadow: `0 14px 28px rgba(0,0,0,.55), 0 0 14px ${theme.primary}22`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: theme.textSoft,
            textTransform: "uppercase",
            letterSpacing: 0.7,
            marginBottom: 6,
          }}
        >
          Dernière partie
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: theme.text }}>
          {lastStr}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------

function Kpi({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: any;
}) {
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
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 900,
          color: theme.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}
