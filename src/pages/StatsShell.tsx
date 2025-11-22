// ============================================
// src/pages/StatsShell.tsx
// Menu Stats — style identique Home / Games / Profils
// - Carte 1 : STATS "Nom du joueur" -> StatsHub onglet "players"
// - Carte 2 : TRAINING -> StatsHub onglet "training"
// - Carte 3 : ONLINE     (réservé, plus tard)
// - Carte 4 : AMIS       (réservé, plus tard)
// - Carte 5 : HISTORIQUE -> StatsHub onglet "history"
// ============================================

import React from "react";
import type { Store } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

export default function StatsShell({ store, go }: Props) {
  const { theme } = useTheme();

  const profiles = store.profiles ?? [];
  const active =
    profiles.find((p) => p.id === store.activeProfileId) ||
    profiles[0] ||
    null;
  const playerName = (active?.name || "Joueur").toUpperCase();

  const T = {
    bg: theme.bg,
    card: theme.card,
    text: theme.text,
    textSoft: theme.textSoft,
    primary: theme.primary,
    borderSoft: theme.borderSoft,
  };

  const cards: {
    id: string;
    title: string;
    subtitle: string;
    chips?: string[];
    onClick: () => void;
  }[] = [
    {
      id: "player",
      title: `STATS ${playerName}`,
      subtitle: "Vue générale, X01 Multi, Cricket, Killer…",
      chips: ["OVERWIEW", "X01", "CRICKET", "KILLER"],
      // 🔑 ICI : ouverture StatsHub sur l’onglet "Stats joueurs"
      onClick: () => go("stats_hub", { tab: "players" }),
    },
    {
      id: "training",
      title: "TRAINING",
      subtitle: "Stats Training X01 et Tour de l’horloge.",
      chips: ["TRAINING X01", "TOUR DE L’HORLOGE"],
      onClick: () => go("stats_hub", { tab: "training" }),
    },
    {
      id: "online",
      title: "ONLINE",
      subtitle: "Stats de tes parties Online (bientôt).",
      onClick: () => {
        // plus tard : onglet spécifique dans StatsHub
        go("stats_hub", { tab: "online" });
      },
    },
    {
      id: "friends",
      title: "AMIS",
      subtitle: "Compare tes stats avec celles de tes amis.",
      onClick: () => {
        // plus tard : onglet spécifique dans StatsHub ou FriendsPage
        go("stats_hub", { tab: "friends" });
      },
    },
    {
      id: "history",
      title: "HISTORIQUE",
      subtitle: "Toutes tes parties et la reprise des parties en cours.",
      onClick: () => go("stats_hub", { tab: "history" }),
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        padding: "24px 16px 32px",
        color: T.text,
      }}
    >
      {/* Titre page */}
      <header style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: 2,
            color: T.primary,
          }}
        >
          STATS
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            color: T.textSoft,
            maxWidth: 260,
          }}
        >
          Analyse tes performances, ton training et ton historique.
        </div>
      </header>

      {/* Liste des cartes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={card.onClick}
            style={{
              textAlign: "left",
              border: `1px solid ${T.borderSoft}`,
              borderRadius: 18,
              padding: "16px 16px",
              background: T.card,
              color: "inherit",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              boxShadow: "0 14px 32px rgba(0,0,0,.55)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: 1,
                  color: T.primary,
                }}
              >
                {card.title}
              </div>
              {/* chevron droit */}
              <svg
                viewBox="0 0 24 24"
                width={18}
                height={18}
                style={{ opacity: 0.8 }}
              >
                <path
                  fill="currentColor"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>

            <div
              style={{
                fontSize: 11,
                color: T.textSoft,
                maxWidth: 260,
              }}
            >
              {card.subtitle}
            </div>

            {card.chips && card.chips.length > 0 && (
              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {card.chips.map((label) => (
                  <span
                    key={label}
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 0.5,
                      padding: "4px 8px",
                      borderRadius: 999,
                      border: `1px solid ${T.borderSoft}`,
                      background: "rgba(0,0,0,.35)",
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
