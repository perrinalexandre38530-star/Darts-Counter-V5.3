// ============================================
// src/pages/StatsShell.tsx
// Menu Stats (style Home / Games / Profils)
// - Carte "STATS — Nom du joueur" -> StatsHub onglet "players"
// - Carte "TRAINING"              -> StatsHub onglet "training"
// - Carte "ONLINE"                -> StatsHub onglet "online"  (future)
// - Carte "AMIS"                  -> StatsHub onglet "friends" (future)
// - Carte "HISTORIQUE"           -> StatsHub onglet "history"
// ============================================

import React from "react";
import type { Store } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

export default function StatsShell({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const activeProfile =
    (store.profiles || []).find((p) => p.id === store.activeProfileId) ||
    (store.profiles || [])[0] ||
    null;

  const playerName = activeProfile?.name || t("stats.player_fallback_name", "joueur");

  function openPlayersStats() {
    // 👉 ouvre directement StatsHub onglet "Stats joueurs"
    go("statsHub", { tab: "players" });
  }

  function openTrainingStats() {
    go("statsHub", { tab: "training" });
  }

  function openOnlineStats() {
    go("statsHub", { tab: "online" });
  }

  function openFriendsStats() {
    go("statsHub", { tab: "friends" });
  }

  function openHistory() {
    go("statsHub", { tab: "history" });
  }

  const cardBase: React.CSSProperties = {
    width: "100%",
    textAlign: "left",
    border: "none",
    background: theme.card,
    color: theme.text,
    borderRadius: 18,
    padding: "14px 16px",
    marginBottom: 12,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    boxShadow: "0 10px 25px rgba(0,0,0,0.55)",
    position: "relative",
    overflow: "hidden",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: theme.primary,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 11,
    opacity: 0.8,
  };

  const chipsRow: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  };

  const chip: React.CSSProperties = {
    fontSize: 10,
    padding: "4px 8px",
    borderRadius: 999,
    border: `1px solid rgba(255,255,255,0.12)`,
    background: "rgba(0,0,0,0.35)",
    color: theme.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  };

  const arrowStyle: React.CSSProperties = {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: 18,
    color: theme.textSoft,
  };

  return (
    <div style={{ padding: 16 }}>
      {/* Titre page */}
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: theme.primary,
          }}
        >
          {t("stats.menu_title", "STATS")}
        </div>
        <div
          style={{
            fontSize: 11,
            marginTop: 4,
            color: theme.textSoft,
            maxWidth: 260,
          }}
        >
          {t(
            "stats.menu_subtitle",
            "Analyse tes performances, ton training et ton historique."
          )}
        </div>
      </div>

      {/* Carte 1 : Stats joueur */}
      <button style={cardBase} onClick={openPlayersStats}>
        <div style={titleStyle}>
          {t("stats.card_player_title", "STATS — {{name}}").replace(
            "{{name}}",
            playerName
          )}
        </div>
        <div style={subtitleStyle}>
          {t(
            "stats.card_player_subtitle",
            "Vue générale, X01 multi, Cricket, Killer…"
          )}
        </div>
        <div style={chipsRow}>
          <span style={chip}>{t("stats.players.chip_overview", "Vue générale")}</span>
          <span style={chip}>{t("stats.players.chip_x01", "X01 multi")}</span>
          <span style={chip}>{t("stats.players.chip_cricket", "Cricket")}</span>
          <span style={chip}>{t("stats.players.chip_killer", "Killer")}</span>
        </div>
        <span style={arrowStyle}>›</span>
      </button>

      {/* Carte 2 : Training */}
      <button style={cardBase} onClick={openTrainingStats}>
        <div style={titleStyle}>{t("stats.card_training_title", "TRAINING")}</div>
        <div style={subtitleStyle}>
          {t(
            "stats.card_training_subtitle",
            "Stats Training X01 et Tour de l'horloge."
          )}
        </div>
        <div style={chipsRow}>
          <span style={chip}>{t("stats.training.chip_x01", "Training X01")}</span>
          <span style={chip}>
            {t("stats.training.chip_clock", "Tour de l'horloge")}
          </span>
        </div>
        <span style={arrowStyle}>›</span>
      </button>

      {/* Carte 3 : Online */}
      <button style={cardBase} onClick={openOnlineStats}>
        <div style={titleStyle}>{t("stats.card_online_title", "ONLINE")}</div>
        <div style={subtitleStyle}>
          {t("stats.card_online_subtitle", "Stats de tes parties Online (bientôt).")}
        </div>
        <span style={arrowStyle}>›</span>
      </button>

      {/* Carte 4 : Amis */}
      <button style={cardBase} onClick={openFriendsStats}>
        <div style={titleStyle}>{t("stats.card_friends_title", "AMIS")}</div>
        <div style={subtitleStyle}>
          {t("stats.card_friends_subtitle", "Compare tes stats avec celles de tes amis.")}
        </div>
        <span style={arrowStyle}>›</span>
      </button>

      {/* Carte 5 : Historique */}
      <button style={cardBase} onClick={openHistory}>
        <div style={titleStyle}>{t("stats.card_history_title", "HISTORIQUE")}</div>
        <div style={subtitleStyle}>
          {t(
            "stats.card_history_subtitle",
            "Toutes tes parties et la reprise des parties en cours."
          )}
        </div>
        <span style={arrowStyle}>›</span>
      </button>
    </div>
  );
}
