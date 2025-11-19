// ============================================
// src/pages/Games.tsx — Sélecteur de modes de jeu
// Style harmonisé avec TrainingMenu
// - Cartes sombres, titre doré néon
// - Pastille "i" à gauche par jeu
// - Bouton "Jouer" / "Bientôt" à droite
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
    subtitle: "Cible du tour, S/D/T — Shanghai = win.",
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

/* ---------- Carte de jeu : même style que TrainingCard ---------- */

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
  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    if (disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick();
  };

  return (
    <button
      aria-disabled={disabled ? true : undefined}
      disabled={disabled}
      onClick={handleClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "10px 14px",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,.08)",
        background:
          "linear-gradient(180deg, rgba(15,15,20,.92), rgba(5,5,10,.96))",
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        pointerEvents: "auto",
        boxShadow: disabled ? "none" : "0 0 12px rgba(0,0,0,0.8)",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "scale(1.02)";
        e.currentTarget.style.boxShadow = "0 0 18px rgba(240,177,42,.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = disabled
          ? "none"
          : "0 0 12px rgba(0,0,0,0.8)";
      }}
    >
      {/* Pastille "i" */}
      <div style={{ marginRight: 10, display: "flex", alignItems: "center" }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onInfo) onInfo();
          }}
          style={{
            width: 26,
            height: 26,
            borderRadius: "999px",
            border: "1px solid rgba(252,211,77,0.8)",
            background:
              "radial-gradient(circle at 30% 20%, #fffde7 0, #fde68a 30%, #facc15 60%, #78350f 100%)",
            boxShadow:
              "0 0 10px rgba(250,204,21,0.9), 0 0 20px rgba(250,204,21,0.45)",
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
        </button>
      </div>

      {/* Texte */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: 0.7,
            color: "#FDE68A",
            textShadow:
              "0 0 6px rgba(250,204,21,0.9), 0 0 14px rgba(250,204,21,0.5)",
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
              fontSize: 11,
              opacity: 0.78,
              color: "#E5E7EB",
              marginTop: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {/* Bouton Jouer / Bientôt */}
      <span
        style={{
          marginLeft: 10,
          background: disabled
            ? "linear-gradient(180deg, #6b7280, #4b5563)"
            : "linear-gradient(180deg, #ffc63a, #ffaf00)",
          color: disabled ? "#e5e7eb" : "#111827",
          borderRadius: 999,
          padding: "4px 10px",
          fontWeight: 800,
          fontSize: 10.5,
          textTransform: "uppercase",
          letterSpacing: 0.7,
          border: disabled
            ? "1px solid rgba(148,163,184,.35)"
            : "1px solid rgba(255,180,0,.45)",
          boxShadow: disabled
            ? "none"
            : "0 0 10px rgba(240,177,42,.3)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 56,
        }}
      >
        {disabled ? "Bientôt" : "Jouer"}
      </span>
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
      "Idéal pour travailler ton niveau en détail.",
    ];
  } else if (game === "x01") {
    title = "X01";
    lines = [
      "Modes 301 / 501 / 701 / 901, en Multi local.",
      "Gestion des sets / legs selon tes paramètres.",
      "Double out, simple out, statistiques complètes en fin de match.",
    ];
  } else if (game === "cricket") {
    title = "Cricket";
    lines = [
      "Objectif : fermer les zones 15 à 20 + Bull.",
      "Une fois ta zone fermée, tu marques des points tant que l’adversaire ne l’a pas fermée.",
      "Le premier à atteindre le meilleur total une fois tout fermé gagne la manche.",
    ];
  } else if (game === "killer") {
    title = "Killer";
    lines = [
      "Chaque joueur choisit un numéro.",
      "Devient Killer en touchant ton numéro en double.",
      "Ensuite, vise les numéros des autres pour les éliminer.",
    ];
  } else if (game === "shanghai") {
    title = "Shanghai";
    lines = [
      "Chaque tour, une cible est définie (1, 2, 3, …).",
      "Simple / Double / Triple sur la cible du tour pour marquer.",
      "Shanghai = S + D + T sur la même cible → victoire instantanée.",
    ];
  } else {
    title = "Battle Royale";
    lines = [
      "Mode fun à plusieurs avec éliminations successives.",
      "Chaque joueur a un capital de points / vies.",
      "Perds des points si tu rates, élimine les autres en marquant.",
    ];
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
