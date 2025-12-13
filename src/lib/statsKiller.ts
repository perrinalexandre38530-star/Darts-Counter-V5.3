// @ts-nocheck
// ============================================
// src/pages/StatsKiller.tsx
// Page STATS KILLER (StatsHub)
// - Affiche stats détaillées quand playerId est fourni
// - Utilise l'agrégateur unique statsKillerAgg.ts
// ============================================

import React from "react";
import type { Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { computeKillerAgg } from "../lib/statsKillerAgg";

type Props = {
  profiles: Profile[];
  memHistory: any[];
  playerId?: string | null;
  title?: string;
};

// ✅ bots map (fallback pour name/avatar)
function loadBotsMap(): Record<string, { avatarDataUrl?: string | null; name?: string }> {
  try {
    const raw = localStorage.getItem("dc_bots_v1");
    if (!raw) return {};
    const bots = JSON.parse(raw);
    const map: Record<string, any> = {};
    for (const b of bots || []) {
      if (!b?.id) continue;
      map[b.id] = { avatarDataUrl: b.avatarDataUrl ?? null, name: b.name };
    }
    return map;
  } catch {
    return {};
  }
}

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

  const data = React.useMemo(() => {
    const botsMap = loadBotsMap();
    const agg = computeKillerAgg(memHistory || [], profiles || [], botsMap);

    const player = playerId ? agg[playerId] : null;

    // historique (20 derniers)
    const list = Array.isArray(memHistory) ? memHistory : [];
    const killer = list
      .filter((r) => (r?.kind || r?.payload?.kind) === "killer" || (r?.payload?.mode) === "killer")
      .slice()
      .sort((a: any, b: any) => Number(b?.updatedAt ?? b?.createdAt ?? 0) - Number(a?.updatedAt ?? a?.createdAt ?? 0))
      .slice(0, 20)
      .map((r: any) => {
        const when = Number(r?.updatedAt ?? r?.createdAt ?? 0);
        const w = r?.winnerId ?? r?.payload?.winnerId ?? null;
        const players = (r?.players || r?.payload?.players || []) as any[];
        const names = players.map((p) => p?.name).filter(Boolean).join(" · ");
        const winnerName =
          w ? (profiles.find((p) => p.id === w)?.name ?? players.find((p) => p?.id === w)?.name ?? "—") : "—";
        return { id: r?.id || `${when}-${Math.random()}`, when, names, winnerName };
      });

    const lastAt = killer.length ? killer[0].when : 0;

    return { agg, player, killer, lastAt };
  }, [memHistory, profiles, playerId]);

  const lastStr = data.lastAt ? new Date(data.lastAt).toLocaleString() : "—";

  const player = data.player;

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

      {/* ✅ STATS (si playerId) */}
      {playerId && player ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <Kpi label="Matchs" value={`${player.played}`} theme={theme} />
          <Kpi label="Victoires" value={`${player.wins}`} theme={theme} />
          <Kpi label="Win %" value={`${pct(player.winRate)}`} theme={theme} />
          <Kpi label="Kills" value={`${player.kills}`} theme={theme} />
          <Kpi label="Hits total" value={`${player.totalHits}`} theme={theme} />
          <Kpi
            label="Segment favori"
            value={player.favSegment ? `${player.favSegment} (${player.favSegmentHits})` : "—"}
            theme={theme}
          />
          <Kpi
            label="Numéro favori"
            value={player.favNumber ? `#${player.favNumber} (${player.favNumberHits})` : "—"}
            theme={theme}
          />
          <Kpi label="Dernier match" value={lastStr} theme={theme} />
        </div>
      ) : (
        // scope global
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <Kpi label="Dernier match" value={lastStr} theme={theme} />
          <Kpi label="Total joueurs" value={`${Object.keys(data.agg || {}).length}`} theme={theme} />
        </div>
      )}

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

        {data.killer.length === 0 ? (
          <div style={{ padding: 12, color: theme.textSoft, fontSize: 12 }}>
            Aucun match KILLER trouvé.
          </div>
        ) : (
          data.killer.map((it: any) => (
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
              <div style={{ fontSize: 12, color: theme.textSoft }}>{it.names || "—"}</div>
              <div style={{ fontSize: 12, color: theme.primary }}>Vainqueur : {it.winnerName}</div>
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
      <div style={{ fontSize: 16, fontWeight: 900, color: theme.text }}>{value}</div>
    </div>
  );
}
