// ============================================
// src/pages/TrainingMenu.tsx
// Menu Training (solo) — style aligné avec Games
// - 3 cartes : X01 solo / Tour de l'horloge / Evolution (bientôt)
// - Petit bouton "i" à gauche qui ouvre un mini panneau d'aide
// ============================================

import React from "react";

type Props = {
  // fonction go fournie par App.tsx (setTab interne)
  go?: (tab: any, params?: any) => void;
};

type TrainingGame = {
  id: string;
  title: string;
  subtitle: string;
  tab: string;
  enabled: boolean;
  info: string;
};

const T = {
  gold: "#F6C256",
  bgCard: "linear-gradient(180deg, rgba(18,18,25,.9), rgba(9,9,15,.95))",
  borderSoft: "rgba(255,255,255,.08)",
  textSoft: "rgba(255,255,255,.72)",
};

export default function TrainingMenu({ go }: Props) {
  const GAMES: TrainingGame[] = [
    {
      id: "training_x01",
      title: "Training X01 solo",
      subtitle: "Séances X01 en solo avec stats détaillées.",
      tab: "training_x01",
      enabled: true,
      info:
        "Enchaînez des legs X01 en solo (301 à 1001), suivez vos moyennes, " +
        "vos meilleurs finish et vos séries de scores.",
    },
    {
      id: "training_clock",
      title: "Tour de l'horloge",
      subtitle: "Tour 1 → 20 + Bull en simple / double / triple.",
      tab: "training_clock",
      enabled: true,
      info:
        "Visez chaque segment de 1 à 20 puis le Bull. Choisissez simple, " +
        "double ou triple et suivez le nombre de fléchettes utilisées.",
    },
    {
      id: "training_evolution",
      title: "Évolution",
      subtitle: "Courbes de progression et paliers de niveau (bientôt).",
      tab: "training_evolution",
      enabled: false,
      info:
        "Vue globale de votre progression : moyennes, checkpoints, badges " +
        "et paliers de niveau. Fonctionnalité en préparation.",
    },
  ];

  const [infoOpenId, setInfoOpenId] = React.useState<string | null>(null);

  function openTab(tab: string, disabled: boolean) {
    if (disabled) return;
    if (!go) {
      console.warn("[TrainingMenu] go() manquant");
      return;
    }
    go(tab);
  }

  function toggleInfo(id: string) {
    setInfoOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "18px 16px 80px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background:
          "radial-gradient(circle at top, #111827 0, #020617 55%, #000 100%)",
        color: "#fff",
      }}
    >
      {/* ---------- Titre principal ---------- */}
      <div
        style={{
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          marginBottom: 6,
          color: T.gold,
          textShadow:
            "0 0 7px rgba(246,194,86,0.9), 0 0 18px rgba(246,194,86,0.7)",
        }}
      >
        Training
      </div>
      <div
        style={{
          opacity: 0.8,
          fontSize: 13,
          textAlign: "center",
          maxWidth: 320,
          marginBottom: 18,
        }}
      >
        Améliorez votre progression dans plusieurs modes d&apos;entraînement
        et suivez vos résultats en statistiques.
      </div>

      {/* ---------- Liste des cartes ---------- */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {GAMES.map((g) => (
          <TrainingCard
            key={g.id}
            game={g}
            isInfoOpen={infoOpenId === g.id}
            onToggleInfo={() => toggleInfo(g.id)}
            onOpen={() => openTab(g.tab, !g.enabled)}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- Carte d'un mode de training ---------- */

function TrainingCard({
  game,
  isInfoOpen,
  onToggleInfo,
  onOpen,
}: {
  game: TrainingGame;
  isInfoOpen: boolean;
  onToggleInfo: () => void;
  onOpen: () => void;
}) {
  const { title, subtitle, enabled } = game;

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    if (!enabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onOpen();
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        aria-disabled={!enabled ? true : undefined}
        disabled={!enabled}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (!enabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "10px 14px",
          borderRadius: 16,
          border: `1px solid ${T.borderSoft}`,
          background: T.bgCard,
          opacity: enabled ? 1 : 0.45,
          cursor: enabled ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          transition: "transform 0.15s ease",
        }}
        onMouseEnter={(e) =>
          enabled && (e.currentTarget.style.transform = "scale(1.02)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.transform = "scale(1)")
        }
      >
        {/* Bloc gauche : icône info + titres */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
            flex: 1,
          }}
        >
          {/* Bouton "i" */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleInfo();
            }}
            style={{
              width: 20,
              height: 20,
              borderRadius: "999px",
              border: "none",
              padding: 0,
              background:
                "radial-gradient(circle at 30% 0%, #fff 0, #ffe7a3 20%, #f6c256 55%, #8a5a16 100%)",
              boxShadow:
                "0 0 8px rgba(246,194,86,0.9), 0 0 16px rgba(246,194,86,0.7)",
              color: "#111827",
              fontSize: 11,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            i
          </button>

          {/* Titres */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: 0.7,
                textTransform: "uppercase",
                color: T.gold,
                textShadow:
                  "0 0 6px rgba(246,194,86,0.9), 0 0 14px rgba(246,194,86,0.6)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 11,
                color: T.textSoft,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {subtitle}
            </div>
          </div>
        </div>

        {/* Bouton à droite : JOUER / BIENTÔT */}
        <span
          style={{
            background: enabled
              ? "linear-gradient(180deg, #ffc63a, #ffaf00)"
              : "linear-gradient(180deg, #6b7280, #4b5563)",
            color: enabled ? "#111" : "#e5e7eb",
            borderRadius: 999,
            padding: "4px 10px",
            fontWeight: 800,
            fontSize: 11,
            border: enabled
              ? "1px solid rgba(255,180,0,.4)"
              : "1px solid rgba(148,163,184,.5)",
            boxShadow: enabled
              ? "0 0 10px rgba(240,177,42,.35)"
              : "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          {enabled ? "Jouer" : "Bientôt"}
        </span>
      </button>

      {/* Mini panneau d'aide */}
      {isInfoOpen && (
        <div
          style={{
            position: "absolute",
            left: 10,
            right: 10,
            top: "100%",
            marginTop: 6,
            padding: "8px 10px",
            borderRadius: 12,
            background: "rgba(15,23,42,0.96)",
            border: `1px solid ${T.borderSoft}`,
            boxShadow: "0 18px 30px rgba(0,0,0,0.6)",
            fontSize: 11,
            color: "#e5e7eb",
            lineHeight: 1.45,
            zIndex: 20,
          }}
        >
          {game.info}
        </div>
      )}
    </div>
  );
}
