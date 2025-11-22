// ============================================
// src/pages/StatsShell.tsx
// Menu principal Stats (style identique Jeux/Training)
// - Carte "STATS — [profil]" -> Stats joueurs (StatsHub onglet "stats")
// - Carte "TRAINING"         -> StatsHub onglet "training"
// - Carte "ONLINE"           -> page Amis avec bloc historique online (mock)
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

// Petit composant flèche cercle néon (comme dans le menu Jeux)
function ArrowCircle() {
  const { theme } = useTheme();
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "999px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 0 14px ${theme.primary}`,
        background:
          "radial-gradient(circle at 30% 0%, rgba(255,255,255,0.15), transparent 55%)",
      }}
    >
      <span
        style={{
          color: "#fff",
          fontSize: 18,
          lineHeight: 1,
          transform: "translateX(1px)",
        }}
      >
        ›
      </span>
    </div>
  );
}

// Titre jaune "STATS" avec halo (comme "TOUS LES JEUX")
function SectionTitle({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <h1
      style={{
        fontSize: 20,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: theme.primary,
        textShadow: `0 0 8px ${theme.primary}, 0 0 18px rgba(0,0,0,0.9)`,
        margin: "0 0 4px 0",
      }}
    >
      {children}
    </h1>
  );
}

// Sous-titre en gris doux
function SectionSubtitle({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <p
      style={{
        margin: "0 0 16px 0",
        fontSize: 13,
        color: theme.textSoft,
      }}
    >
      {children}
    </p>
  );
}

// Carte de menu (même style que Games / TrainingMenu)
type CardProps = {
  label: string;
  description: string;
  onClick?: () => void;
  childrenPills?: React.ReactNode;
};

function StatsMenuCard({ label, description, onClick, childrenPills }: CardProps) {
  const { theme } = useTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        background:
          "linear-gradient(180deg, rgba(18,18,27,0.98), rgba(9,10,16,0.98))",
        borderRadius: 18,
        padding: "14px 14px 12px 16px",
        border: "none",
        marginBottom: 12,
        cursor: "pointer",
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        boxShadow:
          "0 18px 40px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04)",
      }}
    >
      <div style={{ flex: 1, paddingRight: 8 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            color: theme.primary,
            marginBottom: 4,
            textShadow: `0 0 6px ${theme.primary}, 0 0 14px rgba(0,0,0,0.9)`,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 12,
            color: theme.textSoft,
            marginBottom: childrenPills ? 10 : 0,
          }}
        >
          {description}
        </div>
        {childrenPills && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {childrenPills}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          paddingLeft: 8,
        }}
      >
        <ArrowCircle />
      </div>
    </button>
  );
}

// Petits boutons pill comme sur "Vue générale / X01 multi / ... "
function Pill({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <span
      style={{
        fontSize: 11,
        textTransform: "uppercase",
        padding: "5px 10px",
        borderRadius: 999,
        border: `1px solid rgba(255,255,255,0.18)`,
        color: theme.text,
        background:
          "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.14), transparent 55%)",
        boxShadow: `0 0 10px rgba(0,0,0,0.9)`,
      }}
    >
      {children}
    </span>
  );
}

// ======================= PAGE ===========================
export default function StatsShell({ store, go }: Props) {
  const { t } = useLang();
  const { theme } = useTheme();

  const activeProfile =
    (store.profiles || []).find((p) => p.id === store.activeProfileId) || null;
  const playerName = activeProfile?.name || "—";

  return (
    <div
      style={{
        padding: 16,
        paddingBottom: 96,
        background: theme.bg,
        minHeight: "100vh",
      }}
    >
      <SectionTitle>{t("stats.title", "STATS")}</SectionTitle>
      <SectionSubtitle>
        {t(
          "stats.subtitle",
          "Analyse tes performances, ton training et ton historique."
        )}
      </SectionSubtitle>

      {/* ======= Carte STATS JOUEURS ======= */}
      <StatsMenuCard
        label={`STATS — ${playerName}`}
        description={t(
          "stats.cardPlayers.desc",
          "Vue générale, X01 multi, Cricket, Killer…"
        )}
        onClick={() => go("statsHub", { tab: "stats" })}
        childrenPills={
          <>
            <Pill>{t("stats.cardPlayers.general", "Vue générale")}</Pill>
            <Pill>{t("stats.cardPlayers.x01multi", "X01 multi")}</Pill>
            <Pill>{t("stats.cardPlayers.cricket", "Cricket")}</Pill>
            <Pill>{t("stats.cardPlayers.killer", "Killer")}</Pill>
          </>
        }
      />

      {/* ======= Carte TRAINING ======= */}
      <StatsMenuCard
        label={t("stats.cardTraining.title", "TRAINING")}
        description={t(
          "stats.cardTraining.desc",
          "Stats Training X01 et Tour de l’horloge."
        )}
        onClick={() => go("statsHub", { tab: "training" })}
        childrenPills={
          <>
            <Pill>{t("stats.cardTraining.x01", "Training X01")}</Pill>
            <Pill>{t("stats.cardTraining.clock", "Tour de l’horloge")}</Pill>
          </>
        }
      />

      {/* ======= Carte ONLINE ======= */}
      <StatsMenuCard
        label={t("stats.cardOnline.title", "ONLINE")}
        description={t(
          "stats.cardOnline.desc",
          "Stats de tes parties Online (bientôt)."
        )}
        onClick={() => go("friends", { from: "stats", section: "online" })}
        childrenPills={
          <>
            <Pill>{t("stats.cardOnline.history", "Historique Online (mock)")}</Pill>
          </>
        }
      />

      {/* ======= Carte HISTORIQUE ======= */}
      <StatsMenuCard
        label={t("stats.cardHistory.title", "HISTORIQUE")}
        description={t(
          "stats.cardHistory.desc",
          "Toutes tes parties et la reprise des parties en cours."
        )}
        onClick={() => go("statsHub", { tab: "history" })}
        childrenPills={
          <>
            <Pill>{t("stats.cardHistory.last", "Dernières parties")}</Pill>
            <Pill>{t("stats.cardHistory.resume", "Reprises en cours")}</Pill>
          </>
        }
      />
    </div>
  );
}
