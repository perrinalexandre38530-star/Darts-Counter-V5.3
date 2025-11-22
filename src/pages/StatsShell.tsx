// ============================================
// src/pages/StatsShell.tsx
// Hub Stats (style Home / Games / Profils)
// - Vue MENU avec 5 cartes :
//   1) STATS "Nom du joueur"
//   2) TRAINING (délègue à StatsHub existant)
//   3) ONLINE
//   4) AMIS
//   5) HISTORIQUE (délègue à HistoryPage)
// ============================================

import React from "react";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

// ⚠️ on réutilise ton StatsHub actuel pour la partie Training X01
import StatsHub from "./StatsHub";
// ⚠️ et ta page d'historique existante
import HistoryPage from "./HistoryPage";

type Props = {
  store: Store;
  go: (to: any, params?: any) => void;
};

type View = "menu" | "player" | "online" | "friends" | "training" | "history";
type PlayerSub = "overview" | "x01" | "cricket" | "killer";

const Icon = {
  ChevronRight: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path
        fill="currentColor"
        d="M8.3 5.3a1 1 0 0 0 0 1.4L12.6 11l-4.3 4.3a1 1 0 0 0 1.4 1.4l5-5a1 1 0 0 0 0-1.4l-5-5a1 1 0 0 0-1.4 0Z"
      />
    </svg>
  ),
  ChevronLeft: (p: any) => (
    <svg viewBox="0 0 24 24" width={20} height={20} {...p}>
      <path
        fill="currentColor"
        d="M15.7 5.3a1 1 0 0 1 0 1.4L11.4 11l4.3 4.3a1 1 0 0 1-1.4 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z"
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

/* ===== styles dépendants du thème ===== */

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
    padding: "18px 16px 10px 16px",
  };

  const title: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  };

  const subtitle: React.CSSProperties = {
    fontSize: 11,
    color: textSoft,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    marginTop: 4,
  };

  const list: React.CSSProperties = {
    padding: "4px 12px 24px 12px",
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
    gap: 2,
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
    marginTop: 8,
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

  const backBar: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px 8px 16px",
    borderBottom: `1px solid ${edge}`,
    background: "rgba(0,0,0,0.35)",
  };

  const backBtn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 999,
    border: `1px solid ${edge}`,
    background: "rgba(0,0,0,0.7)",
    color: theme.text,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };

  const backLabel: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: textSoft,
  };

  const subTabsRow: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    padding: "8px 12px 10px 12px",
    borderBottom: `1px solid ${edge}`,
    background: "rgba(0,0,0,0.28)",
    backdropFilter: "blur(6px)",
  };

  const subTab = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    height: 28,
    padding: "0 10px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: 0.3,
    border: `1px solid ${active ? theme.primary : edge}`,
    background: active ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.04)",
    color: active ? theme.primary : theme.text,
    cursor: "pointer",
  });

  const placeholder: React.CSSProperties = {
    padding: 16,
    fontSize: 13,
    color: textSoft,
    lineHeight: 1.5,
    maxWidth: 760,
    margin: "12px auto 0 auto",
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
    backBar,
    backBtn,
    backLabel,
    subTabsRow,
    subTab,
    placeholder,
  };
}

/* ===== composant principal ===== */

export default function StatsShell({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const S = useStyles(theme);

  const [view, setView] = React.useState<View>("menu");
  const [playerSub, setPlayerSub] = React.useState<PlayerSub>("overview");

  const activeProfileName =
    getActiveProfileName(store) || t("stats.player.me", "Mon joueur");

  // ---- vues qui délèguent entièrement à d'autres pages ----
  if (view === "training") {
    // On laisse TON StatsHub faire sa vie (Training X01)
    return <StatsHub store={store} go={go} />;
  }

  if (view === "history") {
    // On réutilise ta page History telle quelle
    return <HistoryPage store={store} go={go} />;
  }

  // ---- VUE MENU ----
  if (view === "menu") {
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
            onClick={() => setView("player")}
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
                  "Vue générale, X01 Multi, Cricket, Killer..."
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
            onClick={() => setView("training")}
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
            onClick={() => setView("online")}
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
            onClick={() => setView("friends")}
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
            onClick={() => setView("history")}
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

  // ---- header retour commun pour les sous-vues "player / online / friends" ----
  const BackHeader = ({
    label,
  }: {
    label: string;
  }): React.ReactElement => (
    <header style={S.backBar}>
      <button
        type="button"
        style={S.backBtn}
        onClick={() => setView("menu")}
      >
        <Icon.ChevronLeft />
        {t("common.back", "Retour")}
      </button>
      <span style={S.backLabel}>{label.toUpperCase()}</span>
    </header>
  );

  // ---- VUE STATS JOUEUR ----
  if (view === "player") {
    return (
      <div style={S.page}>
        <BackHeader
          label={t(
            "stats.player.header",
            `Stats ${activeProfileName || "joueur"}`
          )}
        />

        <div style={S.subTabsRow}>
          <button
            type="button"
            style={S.subTab(playerSub === "overview")}
            onClick={() => setPlayerSub("overview")}
          >
            {t("stats.player.tab.overview", "Vue générale")}
          </button>
          <button
            type="button"
            style={S.subTab(playerSub === "x01")}
            onClick={() => setPlayerSub("x01")}
          >
            {t("stats.player.tab.x01", "X01 Multi")}
          </button>
          <button
            type="button"
            style={S.subTab(playerSub === "cricket")}
            onClick={() => setPlayerSub("cricket")}
          >
            {t("stats.player.tab.cricket", "Cricket")}
          </button>
          <button
            type="button"
            style={S.subTab(playerSub === "killer")}
            onClick={() => setPlayerSub("killer")}
          >
            {t("stats.player.tab.killer", "Killer")}
          </button>
        </div>

        <div style={S.placeholder}>
          {playerSub === "overview" && (
            <>
              <strong>
                {t(
                  "stats.player.overview.title",
                  "Vue générale du joueur"
                )}
              </strong>
              <p>
                {t(
                  "stats.player.overview.body",
                  "Ici on viendra plugger ton dashboard global : moyennes, meilleurs legs, checkouts, radar, etc."
                )}
              </p>
            </>
          )}
          {playerSub === "x01" && (
            <>
              <strong>{t("stats.player.x01.title", "X01 Multi")}</strong>
              <p>
                {t(
                  "stats.player.x01.body",
                  "Future vue dédiée aux stats X01 multi-joueurs."
                )}
              </p>
            </>
          )}
          {playerSub === "cricket" && (
            <>
              <strong>{t("stats.player.cricket.title", "Cricket")}</strong>
              <p>
                {t(
                  "stats.player.cricket.body",
                  "Future vue dédiée aux stats Cricket."
                )}
              </p>
            </>
          )}
          {playerSub === "killer" && (
            <>
              <strong>{t("stats.player.killer.title", "Killer")}</strong>
              <p>
                {t(
                  "stats.player.killer.body",
                  "Future vue dédiée aux stats Killer."
                )}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- VUE ONLINE ----
  if (view === "online") {
    return (
      <div style={S.page}>
        <BackHeader
          label={t("stats.online.header", "Stats Online")}
        />
        <div style={S.placeholder}>
          <strong>
            {t(
              "stats.online.placeholder.title",
              "Stats Online — en développement"
            )}
          </strong>
          <p>
            {t(
              "stats.online.placeholder.body",
              "Cette section accueillera toutes tes stats de parties Online : classement, ratio de victoires, historique des salons, etc."
            )}
          </p>
        </div>
      </div>
    );
  }

  // ---- VUE AMIS ----
  if (view === "friends") {
    return (
      <div style={S.page}>
        <BackHeader
          label={t("stats.friends.header", "Stats Amis")}
        />
        <div style={S.placeholder}>
          <strong>
            {t(
              "stats.friends.placeholder.title",
              "Stats Amis — en développement"
            )}
          </strong>
          <p>
            {t(
              "stats.friends.placeholder.body",
              "Ici tu pourras comparer tes stats avec celles de tes amis : head-to-head, séries de victoires, etc."
            )}
          </p>
        </div>
      </div>
    );
  }

  // fallback de sécurité
  return <div style={S.page} />;
}
