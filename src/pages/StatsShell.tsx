// ============================================
// src/pages/StatsShell.tsx
// Menu Stats — style identique à Games / Training / Profils
// - Cartes : Stats joueurs / Training / Online / Historique
// - Bouton principal : navigation
// - Bouton "i" : popin d'aide (légère aura animée comme Games)
// ============================================
import React from "react";
import type { Store } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

type InfoMode = "players" | "training" | "online" | "history" | null;

export default function StatsShell({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const profiles = store?.profiles ?? [];
  const activeProfileId = store?.activeProfileId ?? null;
  const active =
    profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;

  const [infoMode, setInfoMode] = React.useState<InfoMode>(null);

  return (
    <div
      className="stats-shell-page container"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingTop: 16,
        paddingBottom: 0,
        alignItems: "center",
        background: theme.bg,
        color: theme.text,
      }}
    >
      <style>{`
        .stats-shell-page {
          --title-min: 26px;
          --title-ideal: 7.6vw;
          --title-max: 38px;
          --card-pad: 14px;
          --menu-gap: 10px;
          --menu-title: 14px;
          --menu-sub: 12px;
        }
        @media (max-height: 680px), (max-width: 360px) {
          .stats-shell-page {
            --title-min: 24px;
            --title-ideal: 6.8vw;
            --title-max: 34px;
            --card-pad: 12px;
            --menu-gap: 8px;
            --menu-title: 13.5px;
            --menu-sub: 11px;
          }
        }

        /* Bouton "i" avec halo léger (cohérent avec Games) */
        .stats-shell-info-btn {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.45);
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.18), rgba(0,0,0,0.7));
          color: #fff;
          display: grid;
          place-items: center;
          font-size: 17px;
          font-weight: 700;
          box-shadow:
            0 0 0 1px rgba(255,255,255,.06),
            0 0 10px rgba(255,255,255,.22);
          cursor: pointer;
          flex-shrink: 0;
          transition: transform .15s ease, box-shadow .15s ease, background .15s ease, opacity .15s ease;
          opacity: 0.9;
          position: relative;
          overflow: hidden;
        }
        .stats-shell-info-btn::before {
          content: "";
          position: absolute;
          inset: -40%;
          background: radial-gradient(circle, rgba(255,255,255,.22), transparent 65%);
          opacity: 0.0;
          transform: scale(0.8);
          animation: statsInfoGlow 2.4s ease-in-out infinite;
          pointer-events: none;
        }
        .stats-shell-info-btn:hover {
          transform: translateY(-1px) scale(1.03);
          box-shadow:
            0 0 0 1px rgba(255,255,255,.10),
            0 0 14px rgba(255,255,255,.32);
          opacity: 1;
        }
        .stats-shell-info-btn:active {
          transform: translateY(0) scale(0.98);
          box-shadow:
            0 0 0 1px rgba(255,255,255,.18),
            0 0 6px rgba(255,255,255,.26);
        }
        @keyframes statsInfoGlow {
          0%, 100% {
            opacity: 0.05;
            transform: scale(0.9);
          }
          50% {
            opacity: 0.25;
            transform: scale(1.05);
          }
        }
      `}</style>

      {/* ===== HEADER ===== */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          paddingInline: 18,
          marginBottom: 16,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontWeight: 900,
            letterSpacing: 0.9,
            textTransform: "uppercase",
            color: theme.primary,
            fontSize:
              "clamp(var(--title-min), var(--title-ideal), var(--title-max))",
            textShadow: `0 0 12px ${theme.primary}66`,
            marginBottom: 6,
          }}
        >
          {t("statsShell.title", "STATS")}
        </div>
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.35,
            color: theme.textSoft,
            maxWidth: 340,
            margin: "0 auto",
          }}
        >
          {t(
            "statsShell.subtitle",
            "Analyse tes performances, ton training et ton historique."
          )}
        </div>
      </div>

      {/* ===== LISTE CARTES ===== */}
      <div
        className="stats-shell-list"
        style={{
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          gap: "var(--menu-gap)",
          paddingInline: 12,
        }}
      >
        {/* STATS JOUEURS */}
        <StatsShellCard
          title={
            active
              ? t("statsShell.players.title", "STATS — ") + (active.name || "")
              : t("statsShell.players.titleDefault", "STATS JOUEURS")
          }
          theme={theme}
          onClick={() => go("statsHub", { tab: "stats" })}
          onInfo={() => setInfoMode("players")}
        />

        {/* TRAINING */}
        <StatsShellCard
          title={t("statsShell.training.title", "TRAINING")}
          theme={theme}
          onClick={() => go("statsHub", { tab: "training" })}
          onInfo={() => setInfoMode("training")}
        />

        {/* ONLINE */}
        <StatsShellCard
          title={t("statsShell.online.title", "ONLINE")}
          theme={theme}
          onClick={() => go("friends", { from: "stats" })}
          onInfo={() => setInfoMode("online")}
        />

        {/* HISTORIQUE */}
        <StatsShellCard
          title={t("statsShell.history.title", "HISTORIQUE")}
          theme={theme}
          onClick={() => go("statsHub", { tab: "history" })}
          onInfo={() => setInfoMode("history")}
        />
      </div>

      {/* Espace BottomNav */}
      <div style={{ height: 80 }} />

      {/* POPIN INFOS */}
      {infoMode && (
        <InfoOverlay
          mode={infoMode}
          theme={theme}
          t={t}
          onClose={() => setInfoMode(null)}
        />
      )}
    </div>
  );
}

/* ---------- Carte unique (style = Games) ---------- */
function StatsShellCard({
  title,
  theme,
  onClick,
  onInfo,
}: {
  title: string;
  theme: any;
  onClick?: () => void;
  onInfo?: () => void;
}) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 16,
        background: theme.card,
        border: `1px solid ${theme.borderSoft}`,
        boxShadow: "0 16px 32px rgba(0,0,0,.55)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={onClick}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--card-pad)",
          paddingRight: 54,
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            textAlign: "left",
          }}
        >
          <div
            style={{
              fontSize: "var(--menu-title)",
              fontWeight: 900,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: theme.primary,
              textShadow: `0 0 10px ${theme.primary}55`,
              // 🔥 plus de troncature : on laisse le titre passer sur 2 lignes si besoin
              whiteSpace: "normal",
              maxWidth: "100%",
            }}
          >
            {title}
          </div>
          {/* plus de sous-titre dans les cartes :
              toutes les descriptions sont dans la popin du bouton "i"
          */}
        </div>
      </button>

      {/* Bouton "i" */}
      <button
        type="button"
        className="stats-shell-info-btn"
        onClick={(e) => {
          e.stopPropagation();
          onInfo?.();
        }}
        aria-label="Informations"
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        i
      </button>
    </div>
  );
}

/* ---------- Popin d'aide (même esprit que TrainingMenu) ---------- */
function InfoOverlay({
  mode,
  theme,
  t,
  onClose,
}: {
  mode: InfoMode;
  theme: any;
  t: (k: string, f: string) => string;
  onClose: () => void;
}) {
  let title = "";
  let body = "";

  switch (mode) {
    case "players":
      title = t("statsShell.info.players.title", "STATS — Joueurs");
      body = t(
        "statsShell.info.players.body",
        "Vue générale de tes performances par joueur : moyenne X01, X01 multi, Cricket, Killer et autres modes."
      );
      break;
    case "training":
      title = t("statsShell.info.training.title", "TRAINING");
      body = t(
        "statsShell.info.training.body",
        "Accès aux statistiques détaillées de tes sessions Training X01 et du Tour de l’horloge."
      );
      break;
    case "online":
      title = t("statsShell.info.online.title", "ONLINE");
      body = t(
        "statsShell.info.online.body",
        "Historique des parties jouées en mode Online (mock pour l’instant, prêt pour un futur backend)."
      );
      break;
    case "history":
      title = t("statsShell.info.history.title", "HISTORIQUE");
      body = t(
        "statsShell.info.history.body",
        "Liste complète de tes parties locales avec reprise des parties en cours et accès au détail."
      );
      break;
  }

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 80,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 999,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          marginInline: 16,
          borderRadius: 18,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: "0 18px 40px rgba(0,0,0,.85)",
          padding: 14,
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: theme.primary,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12.5,
            lineHeight: 1.4,
            color: theme.textSoft,
            marginBottom: 10,
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
              padding: "6px 16px",
              fontSize: 12.5,
              fontWeight: 700,
              background: theme.primary,
              color: "#000",
              cursor: "pointer",
              boxShadow: `0 0 14px ${theme.primary}55`,
            }}
          >
            {t("statsShell.info.close", "Fermer")}
          </button>
        </div>
      </div>
    </div>
  );
}
