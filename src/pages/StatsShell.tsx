// ============================================
// src/pages/StatsShell.tsx
// Menu STATS (style aligné sur Home / Games)
// - 4 cartes : Stats joueurs / Training / Online / Historique
// - Bouton "i" sur chaque carte -> panneau d'info flottant
// - Halo doux autour des cartes comme le menu Jeux
// ============================================

import React from "react";
import type { Store } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

type InfoKey = "players" | "training" | "online" | "history" | null;

export default function StatsShell({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const profiles = store?.profiles ?? [];
  const activeProfileId = store?.activeProfileId ?? null;
  const active = profiles.find((p) => p.id === activeProfileId) ?? null;
  const playerName = active?.name || t("stats.shell.noPlayer", "joueur");

  const [infoMode, setInfoMode] = React.useState<InfoKey>(null);

  return (
    <div
      className="stats-shell-page container"
      style={{
        minHeight: "100vh",
        paddingTop: 18,
        paddingBottom: 0,
        paddingInline: 12,
        background: theme.bg,
        color: theme.text,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <style>{`
        .stats-shell-page {
          --title-min: 26px;
          --title-ideal: 7.4vw;
          --title-max: 38px;
          --card-pad: 14px;
          --card-radius: 16px;
          --card-gap: 10px;
          --subtitle-size: 12.5px;
        }
        @media (max-height: 680px), (max-width: 360px) {
          .stats-shell-page {
            --title-min: 22px;
            --title-ideal: 7vw;
            --title-max: 32px;
            --card-pad: 12px;
            --card-radius: 14px;
            --card-gap: 8px;
            --subtitle-size: 11.5px;
          }
        }
      `}</style>

      {/* HEADER */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 13,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            fontWeight: 700,
            color: theme.textSoft,
            marginBottom: 4,
          }}
        >
          STATS
        </div>

        <h1
          style={{
            fontSize: "clamp(var(--title-min), var(--title-ideal), var(--title-max))",
            lineHeight: 1.05,
            margin: "0 0 6px",
            color: theme.primary,
            textShadow: `0 6px 18px ${theme.primary}55`,
          }}
        >
          {t(
            "stats.shell.title",
            "Analyse tes performances, ton training et ton historique."
          )}
        </h1>
      </div>

      {/* LISTE DES 4 CARTES */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          gap: "var(--card-gap)",
          marginBottom: 24,
        }}
      >
        {/* -------- Carte STATS JOUEURS -------- */}
        <StatsShellCard
          theme={theme}
          title={t("stats.shell.card.players.title", "STATS — ") + playerName}
          subtitle={t(
            "stats.shell.card.players.subtitle",
            "Vue générale, X01 multi, Cricket, Killer..."
          )}
          onClick={() => go("statsHub", { tab: "stats" })}
          onInfo={() => setInfoMode("players")}
        />

        {/* -------- Carte TRAINING -------- */}
        <StatsShellCard
          theme={theme}
          title={t("stats.shell.card.training.title", "TRAINING")}
          subtitle={t(
            "stats.shell.card.training.subtitle",
            "Stats Training X01 et Tour de l’horloge."
          )}
          onClick={() => go("statsHub", { tab: "training" })}
          onInfo={() => setInfoMode("training")}
        />

        {/* -------- Carte ONLINE -------- */}
        <StatsShellCard
          theme={theme}
          title={t("stats.shell.card.online.title", "ONLINE")}
          subtitle={t(
            "stats.shell.card.online.subtitle",
            "Stats de tes parties Online (bientôt)."
          )}
          onClick={() => go("friends", { section: "online_history" })}
          onInfo={() => setInfoMode("online")}
        />

        {/* -------- Carte HISTORIQUE -------- */}
        <StatsShellCard
          theme={theme}
          title={t("stats.shell.card.history.title", "HISTORIQUE")}
          subtitle={t(
            "stats.shell.card.history.subtitle",
            "Toutes tes parties et la reprise des parties en cours."
          )}
          onClick={() => go("statsHub", { tab: "history" })}
          onInfo={() => setInfoMode("history")}
        />
      </div>

      {/* Espace bottom-nav */}
      <div style={{ height: 70 }} />

      {/* PANNEAU D'INFO FLOTTANT */}
      {infoMode && (
        <InfoOverlay
          mode={infoMode}
          playerName={playerName}
          onClose={() => setInfoMode(null)}
        />
      )}
    </div>
  );
}

/* --------------------------------------------
   CARTE UNIQUE (style aligné sur Games / Home)
---------------------------------------------*/
function StatsShellCard({
  theme,
  title,
  subtitle,
  onClick,
  onInfo,
}: {
  theme: any;
  title: string;
  subtitle: string;
  onClick?: () => void;
  onInfo?: () => void;
}) {
  return (
    <button
      className="stats-shell-card"
      onClick={onClick}
      style={{
        width: "100%",
        position: "relative",
        padding: "var(--card-pad)",
        paddingRight: 14,
        borderRadius: "var(--card-radius)",
        border: `1px solid ${theme.borderSoft}`,
        background: theme.card,
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        boxShadow: `
          0 18px 36px rgba(0,0,0,.55),
          0 0 22px ${theme.primary}22
        `,
        overflow: "hidden",
      }}
    >
      {/* léger voile lumineux en haut à gauche */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 0 0, rgba(255,255,255,.10) 0, transparent 55%)",
          opacity: 0.9,
          pointerEvents: "none",
        }}
      />

      {/* contenu réel */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: 0.7,
            textTransform: "uppercase",
            color: theme.primary,
            textShadow: `0 0 10px ${theme.primary}55`,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 2,
            fontSize: "var(--subtitle-size)",
            color: theme.textSoft,
            maxWidth: "90%",
          }}
        >
          {subtitle}
        </div>
      </div>

      {/* Bouton "i" à droite (comme Games) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onInfo?.();
        }}
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          width: 26,
          height: 26,
          borderRadius: "999px",
          border: `1px solid ${theme.borderSoft}`,
          display: "grid",
          placeItems: "center",
          background: "rgba(0,0,0,0.75)",
          color: theme.primary,
          boxShadow: `0 0 12px ${theme.primary}55`,
          fontSize: 15,
          fontWeight: 800,
          padding: 0,
        }}
      >
        i
      </button>
    </button>
  );
}

/* --------------------------------------------
   OVERLAY D'INFOS
---------------------------------------------*/
function InfoOverlay({
  mode,
  playerName,
  onClose,
}: {
  mode: InfoKey;
  playerName: string;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useLang();

  let title = "";
  let body = "";

  switch (mode) {
    case "players":
      title = t("stats.shell.info.players.title", "Stats joueurs");
      body = t(
        "stats.shell.info.players.body",
        `Vue détaillée des performances de ${playerName} : X01 multi, Cricket, Killer et autres modes. Moyennes, meilleurs scores, taux de victoire et évolution par match.`
      );
      break;
    case "training":
      title = t("stats.shell.info.training.title", "Stats Training");
      body = t(
        "stats.shell.info.training.body",
        "Analyse tes sessions Training X01 et Tour de l’horloge : moyennes, hits par segments, progression dans le temps et best sessions."
      );
      break;
    case "online":
      title = t("stats.shell.info.online.title", "Stats Online (mock)");
      body = t(
        "stats.shell.info.online.body",
        "Aperçu des futures stats Online : historiques de parties jouées à distance, résultats contre tes amis et résumé des performances réseau."
      );
      break;
    case "history":
      title = t("stats.shell.info.history.title", "Historique & reprises");
      body = t(
        "stats.shell.info.history.body",
        "Liste complète de toutes tes parties enregistrées, avec accès rapide aux fiches détaillées et aux parties en cours pour les reprendre."
      );
      break;
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.70)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 420,
          width: "100%",
          borderRadius: 18,
          padding: 16,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: "0 24px 64px rgba(0,0,0,.85)",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: theme.primary,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: theme.textSoft,
            lineHeight: 1.4,
            marginBottom: 12,
          }}
        >
          {body}
        </div>
        <div style={{ textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              borderRadius: 999,
              border: "none",
              padding: "6px 18px",
              background: theme.primary,
              color: "#000",
              fontWeight: 700,
              boxShadow: `0 0 14px ${theme.primary}66`,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {t("common.close", "Fermer")}
          </button>
        </div>
      </div>
    </div>
  );
}
