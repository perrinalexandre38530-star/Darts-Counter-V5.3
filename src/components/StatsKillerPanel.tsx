// @ts-nocheck
// =============================================================
// src/components/StatsKillerPanel.tsx
// Panneau Stats KILLER (profil actif)
// - Lit computeKillerRows()
// - Affiche : matchs, wins, winRate, kills, darts, favSegment, favNumber
// =============================================================

import * as React from "react";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ProfileAvatar from "./ProfileAvatar";
import { History } from "../lib/history";
import { computeKillerRows, type PeriodKey } from "../lib/killerStats";

type Props = {
  store: Store;
  profileId?: string; // si absent, on essaye store.activeProfileId / store.active?.id
};

function pickActiveProfileId(store: any): string | null {
  return (
    store?.activeProfileId ||
    store?.active?.id ||
    store?.activeProfile?.id ||
    store?.profiles?.find?.((p: any) => p?.isActive)?.id ||
    null
  );
}

export default function StatsKillerPanel({ store, profileId }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const profiles: Profile[] = (store as any)?.profiles ?? [];
  const activeId = profileId || pickActiveProfileId(store) || (profiles?.[0]?.id ?? null);

  const [period, setPeriod] = React.useState<PeriodKey>("ALL");
  const [historySource, setHistorySource] = React.useState<any[]>(
    (((store as any)?.history) as any[]) || []
  );

  // store.history (fallback)
  React.useEffect(() => {
    setHistorySource(((((store as any)?.history) as any[]) || []) as any[]);
  }, [store]);

  // IDB history (prioritaire si dispo)
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const api: any = History as any;
        let list: any[] = [];

        if (typeof api.getAll === "function") list = await api.getAll();
        else if (typeof api.list === "function") list = await api.list();
        else if (typeof api.getAllSorted === "function") list = await api.getAllSorted();

        if (alive && Array.isArray(list) && list.length) setHistorySource(list);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  const rows = React.useMemo(() => computeKillerRows(historySource, profiles, period), [
    historySource,
    profiles,
    period,
  ]);

  const me = rows.find((r) => r.id === activeId) || null;

  const badge = (label: string, value: any) => (
    <div
      style={{
        padding: "10px 10px",
        borderRadius: 14,
        border: `1px solid ${theme.borderSoft}`,
        background: "rgba(0,0,0,.22)",
        boxShadow: `0 10px 22px rgba(0,0,0,.55)`,
      }}
    >
      <div style={{ fontSize: 10, opacity: 0.75, fontWeight: 800, letterSpacing: 0.7, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ marginTop: 4, fontSize: 16, fontWeight: 900, color: theme.primary, textShadow: `0 0 12px ${theme.primary}55` }}>
        {value}
      </div>
    </div>
  );

  const periodLabel = (p: PeriodKey) => {
    switch (p) {
      case "D": return "J";
      case "W": return "S";
      case "M": return "M";
      case "Y": return "A";
      case "ALL": return "All";
      case "TOUT": return "Tout";
    }
  };

  const activeProfile = profiles.find((p) => p.id === activeId) || null;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 520,
        margin: "0 auto",
        padding: 12,
        borderRadius: 20,
        background: theme.card,
        border: `1px solid ${theme.borderSoft}`,
        boxShadow: `0 16px 34px rgba(0,0,0,.68), 0 0 22px ${theme.primary}22`,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            overflow: "hidden",
            border: `1px solid ${theme.borderSoft}`,
            boxShadow: `0 0 14px ${theme.primary}33`,
            background: "#000",
            flexShrink: 0,
          }}
        >
          {activeProfile?.avatarDataUrl || (activeProfile as any)?.avatar ? (
            <img
              src={(activeProfile as any)?.avatarDataUrl ?? (activeProfile as any)?.avatar}
              alt={activeProfile?.name || "Profile"}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              draggable={false}
            />
          ) : (
            <ProfileAvatar size={44} dataUrl={null} label={(activeProfile?.name || "—")[0]?.toUpperCase?.() || "?"} showStars={false} />
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 900,
              letterSpacing: 0.9,
              textTransform: "uppercase",
              color: theme.primary,
              fontSize: 18,
              textShadow: `0 0 14px ${theme.primary}66`,
              marginBottom: 2,
            }}
          >
            {t("stats.killer.title", "KILLER")}
          </div>
          <div style={{ fontSize: 12, opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {activeProfile?.name || me?.name || "—"}
          </div>
        </div>

        {/* Période */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {(["D", "W", "M", "Y", "ALL", "TOUT"] as PeriodKey[]).map((p) => {
            const active = p === period;
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  borderRadius: 999,
                  border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
                  padding: "3px 7px",
                  fontSize: 9,
                  fontWeight: 800,
                  background: active ? theme.primary : "transparent",
                  color: active ? "#000" : theme.textSoft,
                  cursor: "pointer",
                }}
              >
                {periodLabel(p)}
              </button>
            );
          })}
        </div>
      </div>

      {!me ? (
        <div style={{ padding: 12, textAlign: "center", color: theme.textSoft, fontSize: 12 }}>
          {t("stats.killer.empty", "Aucune partie KILLER trouvée pour ce profil.")}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {badge("Matchs", me.matches)}
            {badge("Victoires", me.wins)}
            {badge("% Win", `${me.winRate.toFixed(1)}%`)}
            {badge("Kills (moy.)", me.killsAvg.toFixed(2))}
            {badge("Darts (moy.)", me.dartsAvg.toFixed(1))}
            {badge("Darts (total)", me.darts)}
          </div>

          {/* Favoris */}
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 16,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,.18)",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.8, textTransform: "uppercase", color: theme.primary, marginBottom: 6 }}>
              {t("stats.killer.favs", "Préférences (Option A)")}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div
                style={{
                  padding: 10,
                  borderRadius: 14,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,.22)",
                }}
              >
                <div style={{ fontSize: 10, opacity: 0.75, fontWeight: 800, textTransform: "uppercase" }}>
                  Segment favori
                </div>
                <div style={{ marginTop: 4, fontSize: 18, fontWeight: 950, color: theme.primary, textShadow: `0 0 14px ${theme.primary}55` }}>
                  {me.favSegment || "—"}
                </div>
              </div>

              <div
                style={{
                  padding: 10,
                  borderRadius: 14,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,.22)",
                }}
              >
                <div style={{ fontSize: 10, opacity: 0.75, fontWeight: 800, textTransform: "uppercase" }}>
                  Numéro favori
                </div>
                <div style={{ marginTop: 4, fontSize: 18, fontWeight: 950, color: theme.primary, textShadow: `0 0 14px ${theme.primary}55` }}>
                  {me.favNumber || "—"}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 8, fontSize: 11, opacity: 0.72 }}>
              (Dérivé de <b>hitsBySegment</b> — donc ultra stable, compatible multi, et déjà utilisable pour les classements.)
            </div>
          </div>
        </>
      )}
    </div>
  );
}
