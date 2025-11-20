// ============================================
// src/pages/Games.tsx — Sélecteur de modes de jeu
// Style harmonisé avec TrainingMenu
// - Cartes sombres, titre doré néon
// - Modes grisés : titre + sous-titre gris, non cliquables
// - Pastille "i" blanche à droite (overlay d'aide)
// ============================================

import React from "react";

type Props = {
  setTab: (tab: any) => void;
};

type GameId = "training" | "x01" | "cricket" | "killer" | "shanghai" | "battle";

type GameDef = {
  id: GameId;
  title: string;
  subtitle: string;
  tab: string;
  enabled: boolean;
};

const GAMES: GameDef[] = [
  {
    id: "training",
    title: "TRAINING",
    subtitle: "Améliorez votre progression.",
    tab: "training",
    enabled: true,
  },
  {
    id: "x01",
    title: "X01",
    subtitle: "301 / 501 / 701 / 901.",
    tab: "x01setup",
    enabled: true,
  },
  {
    id: "cricket",
    title: "CRICKET",
    subtitle: "Fermez les zones 15…20 + Bull.",
    tab: "cricket",
    enabled: true,
  },
  {
    id: "killer",
    title: "KILLER",
    subtitle: "Double ton numéro — deviens Killer.",
    tab: "killer",
    enabled: false,
  },
  {
    id: "shanghai",
    title: "SHANGHAI",
    subtitle: "Cible du tour, SDT — Shanghai = win.",
    tab: "shanghai",
    enabled: false,
  },
  {
    id: "battle",
    title: "BATTLE ROYALE",
    subtitle: "Mode fun à plusieurs — éliminations.",
    tab: "battle",
    enabled: false,
  },
];

type InfoGame = GameId | null;

export default function Games({ setTab }: Props) {
  const [infoGame, setInfoGame] = React.useState<InfoGame>(null);

  function openInfo(id: GameId) {
    setInfoGame(id);
  }

  function closeInfo() {
    setInfoGame(null);
  }

  return (
    <>
      <div
        className="container"
        style={{
          padding: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* -------- Titre principal -------- */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: 1.5,
            marginTop: 8,
            marginBottom: 4,
            textTransform: "uppercase",
            color: "#F6C256",
            textShadow:
              "0 0 8px rgba(246,194,86,0.85), 0 0 18px rgba(246,194,86,0.5)",
          }}
        >
          TOUS LES JEUX
        </div>

        <div
          style={{
            opacity: 0.75,
            fontSize: 12,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Sélectionne un mode de jeu :
        </div>

        {/* -------- Liste des cartes Jeux -------- */}
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
            <GameCard
              key={g.id}
              title={g.title}
              subtitle={g.subtitle}
              disabled={!g.enabled}
              onClick={() => {
                if (!g.enabled) return;
                setTab(g.tab);
              }}
              onInfo={() => openInfo(g.id)}
            />
          ))}
        </div>
      </div>

      {infoGame && <InfoOverlay game={infoGame} onClose={closeInfo} />}
    </>
  );
}

/* ---------- Carte de jeu ---------- */

type GameCardProps = {
  title: string;
  subtitle?: string;
  onClick: () => void;
  onInfo?: () => void;
  disabled?: boolean;
};

function GameCard({
  title,
  subtitle,
  onClick,
  onInfo,
  disabled,
}: GameCardProps) {
  const isDisabled = !!disabled;

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    if (isDisabled) {
      // on ne navigue pas, mais on laisse le clic atteindre le bouton "i" si besoin
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick();
  };

  return (
    <button
      aria-disabled={isDisabled ? true : undefined}
      // ⚠️ surtout PAS de disabled ici, sinon le "i" ne reçoit plus les clics
      onClick={handleClick}
      style={{
        position: "relative",
        width: "100%",
        textAlign: "center",
        padding: "14px 16px",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,.08)",
        background:
          "linear-gradient(180deg, rgba(15,15,20,.92), rgba(5,5,10,.96))",
        opacity: isDisabled ? 0.55 : 1,
        cursor: isDisabled ? "default" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        pointerEvents: "auto",
        boxShadow: isDisabled ? "none" : "0 0 12px rgba(0,0,0,0.8)",
      }}
      onMouseEnter={(e) => {
        if (isDisabled) return;
        e.currentTarget.style.transform = "scale(1.02)";
        e.currentTarget.style.boxShadow = "0 0 18px rgba(240,177,42,.3)";
      }}
      onMouseLeave={(e) => {
        if (isDisabled) return;
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 0 12px rgba(0,0,0,0.8)";
      }}
    >
      {/* Texte centré */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: 16,
            textTransform: "uppercase",
            letterSpacing: 0.9,
            color: isDisabled ? "#9CA3AF" : "#FDE68A",
            textShadow: isDisabled
              ? "none"
              : "0 0 6px rgba(250,204,21,0.9), 0 0 14px rgba(250,204,21,0.5)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </div>

        {subtitle && (
          <div
            style={{
              fontSize: 12,
              opacity: 0.9,
              color: isDisabled ? "#6B7280" : "#E5E7EB",
              marginTop: 3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {/* Pastille "i" blanche à droite */}
      <div
        style={{
          position: "absolute",
          right: 14,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            if (onInfo) onInfo();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              if (onInfo) onInfo();
            }
          }}
          style={{
            width: 24,
            height: 24,
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.8)",
            background:
              "radial-gradient(circle at 30% 20%, #ffffff 0, #e5e7eb 40%, #9ca3af 100%)",
            boxShadow:
              "0 0 8px rgba(255,255,255,0.8), 0 0 16px rgba(148,163,184,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 800,
            color: "#111827",
            cursor: "pointer",
          }}
        >
          i
        </div>
      </div>
    </button>
  );
}

/* ---------- Overlay d'infos par jeu ---------- */

function InfoOverlay({ game, onClose }: { game: GameId; onClose: () => void }) {
  let title = "";
  let lines: string[] = [];

  if (game === "training") {
    title = "Training";
    lines = [
      "Accède au menu Training dédié.",
      "Retrouve le Training X01 solo, le Tour de l’horloge, et l’Evolution de tes stats.",
    ];
  } else if (game === "x01") {
    title = "X01";
    lines = [
      "Modes 301 / 501 / 701 / 901, en Multi local.",
      "Gestion des sets / legs selon tes paramètres.",
    ];
  } else if (game === "cricket") {
    title = "Cricket";
    lines = [
      "Objectif : fermer les zones 15 à 20 + Bull.",
      "Une fois ta zone fermée, tu marques des points tant que l’adversaire ne l’a pas fermée.",
    ];
  } else if (game === "killer" || game === "shanghai" || game === "battle") {
    if (game === "killer") title = "Killer";
    else if (game === "shanghai") title = "Shanghai";
    else title = "Battle Royale";

    lines = ["En développement"];
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "82%",
          maxWidth: 380,
          borderRadius: 18,
          padding: 18,
          background:
            "linear-gradient(180deg, rgba(22,22,28,.98), rgba(8,8,12,.98))",
          border: "1px solid rgba(255,255,255,.12)",
          boxShadow: "0 18px 40px rgba(0,0,0,.75)",
        }}
      >
        <div
          style={{
            fontSize: 17,
            fontWeight: 800,
            marginBottom: 10,
          }}
        >
          {title}
        </div>

        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            fontSize: 13,
            lineHeight: 1.5,
            opacity: 0.9,
            marginBottom: 14,
          }}
        >
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            borderRadius: 999,
            border: "none",
            padding: "8px 0",
            fontWeight: 700,
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: 1,
            background: "linear-gradient(180deg, #ffc63a, #ffaf00)",
            color: "#111827",
            boxShadow: "0 0 12px rgba(240,177,42,.6)",
            cursor: "pointer",
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
