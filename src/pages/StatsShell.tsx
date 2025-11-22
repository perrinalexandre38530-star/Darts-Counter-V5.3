// ============================================
// src/pages/StatsShell.tsx
// Menu Stats (comme Home / Games / Profils)
// - Carte "STATS — XXX"      -> StatsHub onglet "stats" (Stats joueurs)
// - Carte "TRAINING"         -> StatsHub onglet "training"
// - Carte "ONLINE"           -> FriendsPage (mode Online & Amis)
// - Carte "HISTORIQUE"       -> StatsHub onglet "history"
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

  const name = activeProfile?.name || t("stats.defaultName", "Alex");

  const cardStyle: React.CSSProperties = {
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    background:
      "linear-gradient(180deg,rgba(12,13,18,.94),rgba(6,6,10,.96))",
    border: `1px solid rgba(255,255,255,.08)`,
    boxShadow: "0 10px 24px rgba(0,0,0,.55)",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
  };

  const leftCol: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 800,
    textTransform: "uppercase",
    color: theme.primary,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 11,
    opacity: 0.75,
  };

  const chipRow: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  };

  const chip: React.CSSProperties = {
    fontSize: 10,
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.18)",
    background: "rgba(0,0,0,.45)",
  };

  const arrowStyle: React.CSSProperties = {
    fontSize: 18,
    opacity: 0.7,
  };

  return (
    <div className="container" style={{ padding: 12, color: "#fff" }}>
      {/* Titre global de la page Stats */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {t("stats.title", "Stats")}
        </div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
          {t(
            "stats.subtitle",
            "Analyse tes performances, ton training et ton historique."
          )}
        </div>
      </div>

      {/* =========================
          1) STATS JOUEURS
          ========================= */}
      <div
        style={cardStyle}
        onClick={() => go("statsHub", { tab: "stats" })}
      >
        <div style={leftCol}>
          <div style={titleStyle}>
            {t("stats.players.title", "Stats — ") + name}
          </div>
          <div style={subtitleStyle}>
            {t(
              "stats.players.subtitle",
              "Vue générale, X01 multi, Cricket, Killer…"
            )}
          </div>

          <div style={chipRow}>
            <div style={chip}>{t("stats.players.general", "Vue générale")}</div>
            <div style={chip}>{t("stats.players.x01", "X01 multi")}</div>
            <div style={chip}>{t("stats.players.cricket", "Cricket")}</div>
            <div style={chip}>{t("stats.players.killer", "Killer")}</div>
          </div>
        </div>
        <div style={arrowStyle}>›</div>
      </div>

      {/* =========================
          2) TRAINING (stats)
          ========================= */}
      <div
        style={cardStyle}
        onClick={() => go("statsHub", { tab: "training" })}
      >
        <div style={leftCol}>
          <div style={titleStyle}>
            {t("stats.training.title", "Training")}
          </div>
          <div style={subtitleStyle}>
            {t(
              "stats.training.subtitle",
              "Stats Training X01 et Tour de l’horloge."
            )}
          </div>

          <div style={chipRow}>
            <div style={chip}>{t("stats.training.x01", "Training X01")}</div>
            <div style={chip}>
              {t("stats.training.clock", "Tour de l’horloge")}
            </div>
          </div>
        </div>
        <div style={arrowStyle}>›</div>
      </div>

      {/* =========================
          3) ONLINE (mock actuel)
          ========================= */}
      <div
        style={cardStyle}
        onClick={() => go("friends")}
      >
        <div style={leftCol}>
          <div style={titleStyle}>
            {t("stats.online.title", "Online")}
          </div>
          <div style={subtitleStyle}>
            {t(
              "stats.online.subtitle",
              "Stats de tes parties Online (bientôt)."
            )}
          </div>
        </div>
        <div style={arrowStyle}>›</div>
      </div>

      {/* =========================
          4) HISTORIQUE
          ========================= */}
      <div
        style={cardStyle}
        onClick={() => go("statsHub", { tab: "history" })}
      >
        <div style={leftCol}>
          <div style={titleStyle}>
            {t("stats.history.title", "Historique")}
          </div>
          <div style={subtitleStyle}>
            {t(
              "stats.history.subtitle",
              "Toutes tes parties et la reprise des parties en cours."
            )}
          </div>
        </div>
        <div style={arrowStyle}>›</div>
      </div>
    </div>
  );
}
