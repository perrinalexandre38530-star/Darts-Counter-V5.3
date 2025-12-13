// ============================================
// src/pages/StatsKiller.tsx
// Onglet KILLER dans le "Centre de statistiques" (StatsHub)
// - Robuste: lit memHistory (agrégé App.tsx) et filtre kind === "killer"
// - Support: scope "active" (playerId forcé) ou "locals" (playerId optionnel)
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

export default function StatsKiller({
  profiles,
  memHistory,
  playerId = null,
  title = "KILLER",
}: Props) {
  const { theme } = useTheme();

  const rows = React.useMemo(() => {
    const list = Array.isArray(memHistory) ? memHistory : [];
    const killer = list.filter((r) => (r?.kind || r?.payload?.kind) === "killer");

    const filtered = playerId
      ? killer.filter((r) =>
          (r?.players || r?.payload?.players || []).some((p: any) => p?.id === playerId)
        )
      : killer;

    let played = 0;
    let wins = 0;
    let lastAt = 0;

    const items = filtered
      .slice()
      .sort((a: any, b: any) => Number(b?.updatedAt ?? b?.createdAt ?? 0) - Number(a?.updatedAt ?? a?.createdAt ?? 0))
      .map((r: any) => {
        const when = Number(r?.updatedAt ?? r?.createdAt ?? 0);
        if (when > lastAt) lastAt = when;

        played += 1;
        const w = r?.winnerId ?? r?.payload?.winnerId ?? null;
        if (playerId && w && w === playerId) wins += 1;

        const players = (r?.players || r?.payload?.players || []) as any[];
        const names = players.map((p) => p?.name).filter(Boolean).join(" · ");

        const winnerName =
          w ? (profiles.find((p) => p.id === w)?.name ?? players.find((p) => p?.id === w)?.name ?? "—") : "—";

        return {
          id: r?.id,
          when,
          names,
          winnerName,
        };
      });

    const winRate = playerId && played > 0 ? (wins / played) * 100 : 0;

    return {
      played,
      wins,
      winRate,
      lastAt,
      items: items.slice(0, 20),
    };
  }, [memHistory, playerId, profiles]);

  const lastStr = rows.lastAt ? new Date(rows.lastAt).toLocaleString() : "—";

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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <Kpi label="Matchs" value={`${rows.played}`} theme={theme} />
        <Kpi label={playerId ? "Victoires" : "Dernier match"} value={playerId ? `${rows.wins}` : lastStr} theme={theme} />
        {playerId && (
          <>
            <Kpi label="Win %" value={`${pct(rows.winRate)}`} theme={theme} />
            <Kpi label="Dernier match" value={lastStr} theme={theme} />
          </>
        )}
      </div>

      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${theme.borderSoft}`,
          background: theme.card,
          overflow: "hidden",
          boxShadow: `0 14px 28px rgba(0,0,0,.55), 0 0 14px ${theme.primary}22`,
        }}
      >
        <div style={{ padding: "10px 12px", borderBottom: `1px solid ${theme.borderSoft}`, color: theme.textSoft, fontSize: 12 }}>
          Historique KILLER (20 derniers)
        </div>

        {rows.items.length === 0 ? (
          <div style={{ padding: 12, color: theme.textSoft, fontSize: 12 }}>
            Aucun match KILLER trouvé.
          </div>
        ) : (
          rows.items.map((it: any) => (
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
                {new Date(it.when).toLocaleString()}
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

function Kpi({ label, value, theme }: any) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${theme.borderSoft}`,
        background: theme.card,
        padding: "10px 12px",
        boxShadow: `0 12px 24px rgba(0,0,0,.45), 0 0 12px ${theme.primary}18`,
        minHeight: 64,
      }}
    >
      <div style={{ fontSize: 11, color: theme.textSoft, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 900, color: theme.text }}>
        {value}
      </div>
    </div>
  );
}
