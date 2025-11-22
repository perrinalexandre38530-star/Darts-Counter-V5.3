// ============================================
// src/pages/StatsShell.tsx
// Hub Stats (style Home / Games / Profils)
// - Cartes :
//   1) STATS "<Nom du joueur>"  -> StatsHub onglet "players"
//   2) TRAINING                 -> StatsHub onglet "training"
//   3) ONLINE                   -> StatsHub onglet "online" (plus tard)
//   4) AMIS                     -> StatsHub onglet "friends" (plus tard)
//   5) HISTORIQUE               -> StatsHub onglet "history"
// ============================================

import React from "react";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

type Props = {
  store: Store;
  go: (to: any, params?: any) => void;
};

const Icon = {
  ChevronRight: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path
        fill="currentColor"
        d="M8.3 5.3a1 1 0 0 0 0 1.4L12.6 11l-4.3 4.3a1 1 0 0 0 1.4 1.4l5-5a1 1 0 0 0 0-1.4l-5-5a1 1 0 0 0-1.4 0Z"
      />
    </svg>
  ),
};

/* ===== helpers profil actif ===== */

function getId(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return String(v.id || v.playerId || v.profileId || v._id || "");
}

function getActiveProfile(store: Store): Profile | null {
  const anyStore: any = store as any;
  const profiles: Profile[] = Array.isArray(anyStore?.profiles)
    ? anyStore.profiles
    : Array.isArray(anyStore?.profiles?.list)
    ? anyStore.profiles.list
    : [];
  if (!profiles.length) return null;

  const activeId =
    anyStore.activeProfileId ||
    anyStore.currentProfileId ||
    anyStore.profileId ||
    null;

  if (activeId) {
    const hit = profiles.find((p: any) => getId(p) === String(activeId));
    if (hit) return hit;
  }
  return profiles[0] || null;
}

function getActiveProfileName(store: Store): string | null {
  const p = getActiveProfile(store);
  if (!p) return null;
  // @ts-ignore
  return p.name || p.displayName || null;
}

/* ===== styles dépendants du thème (copie spirituelle Games/Training) ===== */

function useStyles(theme: any) {
  const textSoft = theme.textSoft || "rgba(255,255,255,0.7)";
  const edge = theme.borderSoft || "rgba(255,255,255,0.15)";

  const page: React.CSSProperties = {
    minHeight: "100dvh",
    background: theme.bg,
    color: theme.text,
    paddingBottom: 96,
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  };

  const header: React.CSSProperties = {
    padding: "22px 16px 10px 16px",
  };

  const title: React.CSSProperties = {
    fontSize: 26,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  };

  const subtitle: React.CSSProperties = {
    fontSize: 11,
    color: textSoft,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    marginTop: 6,
  };

  const list: React.CSSProperties = {
    padding: "8px 12px 24px 12px",
    display: "grid",
    gap: 10,
    maxWidth: 760,
    margin: "0 auto",
  };

  const cardBtn: React.CSSProperties = {
    width: "100%",
    borderRadius: 18,
    padding: 14,
    border: `1px solid ${edge}`,
    background: theme.card,
    boxShadow: "0 16px 40px rgba(0,0,0,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
  };

  const cardTextWrap: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  };

  const cardTitle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  };

  const cardSubtitle: React.CSSProperties = {
    fontSize: 12,
    color: textSoft,
  };

  const pillRow: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  };

  const pill: React.CSSProperties = {
    fontSize: 10,
    padding: "3px 8px",
    borderRadius: 999,
    border: `1px solid ${edge}`,
    background: "rgba(0,0,0,0.6)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  };

  return {
    page,
    header,
    title,
    subtitle,
    list,
    cardBtn,
    cardTextWrap,
    cardTitle,
    cardSubtitle,
    pillRow,
    pill,
  };
}

/* ===== composant principal ===== */

function StatsShell({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const S = useStyles(theme);

  const activeProfileName =
    getActiveProfileName(store) || t("stats.player.me", "Ninja");

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.title}>{t("stats.title", "Stats").toUpperCase()}</div>
        <div style={S.subtitle}>
          {t(
            "stats.subtitle",
            "Analyse tes performances, ton training et ton historique."
          )}
        </div>
      </header>

      <div style={S.list}>
        {/* 1) Stats joueur */}
        <button
          type="button"
          style={S.cardBtn}
          onClick={() =>
            go("stats", {
              mode: "hub",
              tab: "players", // onglet "Stats joueurs" du StatsHub
            })
          }
        >
          <div style={S.cardTextWrap}>
            <div style={S.cardTitle}>
              {t(
                "stats.menu.player",
                `Stats ${activeProfileName || "joueur"}`
              )}
            </div>
            <div style={S.cardSubtitle}>
              {t(
                "stats.menu.player.subtitle",
                "Vue générale, X01 Multi, Cricket, Killer…"
              )}
            </div>
            <div style={S.pillRow}>
              <span style={S.pill}>Overview</span>
              <span style={S.pill}>X01</span>
              <span style={S.pill}>Cricket</span>
              <span style={S.pill}>Killer</span>
            </div>
          </div>
          <Icon.ChevronRight />
        </button>

        {/* 2) Training */}
        <button
          type="button"
          style={S.cardBtn}
          onClick={() =>
            go("stats", {
              mode: "hub",
              tab: "training",
            })
          }
        >
          <div style={S.cardTextWrap}>
            <div style={S.cardTitle}>
              {t("stats.menu.training", "Training")}
            </div>
            <div style={S.cardSubtitle}>
              {t(
                "stats.menu.training.subtitle",
                "Stats Training X01 et Tour de l’horloge."
              )}
            </div>
            <div style={S.pillRow}>
              <span style={S.pill}>Training X01</span>
              <span style={S.pill}>Tour de l’horloge</span>
            </div>
          </div>
          <Icon.ChevronRight />
        </button>

        {/* 3) Online */}
        <button
          type="button"
          style={S.cardBtn}
          onClick={() =>
            go("stats", {
              mode: "hub",
              tab: "online",
            })
          }
        >
          <div style={S.cardTextWrap}>
            <div style={S.cardTitle}>
              {t("stats.menu.online", "Online")}
            </div>
            <div style={S.cardSubtitle}>
              {t(
                "stats.menu.online.subtitle",
                "Stats de tes parties Online (bientôt)."
              )}
            </div>
          </div>
          <Icon.ChevronRight />
        </button>

        {/* 4) Amis */}
        <button
          type="button"
          style={S.cardBtn}
          onClick={() =>
            go("stats", {
              mode: "hub",
              tab: "friends",
            })
          }
        >
          <div style={S.cardTextWrap}>
            <div style={S.cardTitle}>{t("stats.menu.friends", "Amis")}</div>
            <div style={S.cardSubtitle}>
              {t(
                "stats.menu.friends.subtitle",
                "Compare tes stats avec celles de tes amis."
              )}
            </div>
          </div>
          <Icon.ChevronRight />
        </button>

        {/* 5) Historique */}
        <button
          type="button"
          style={S.cardBtn}
          onClick={() =>
            go("stats", {
              mode: "hub",
              tab: "history",
            })
          }
        >
          <div style={S.cardTextWrap}>
            <div style={S.cardTitle}>
              {t("stats.menu.history", "Historique")}
            </div>
            <div style={S.cardSubtitle}>
              {t(
                "stats.menu.history.subtitle",
                "Toutes tes parties et la reprise des parties en cours."
              )}
            </div>
          </div>
          <Icon.ChevronRight />
        </button>
      </div>
    </div>
  );
}

export default StatsShell;
