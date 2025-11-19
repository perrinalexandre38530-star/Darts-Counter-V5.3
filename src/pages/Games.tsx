// ============================================
// src/pages/Games.tsx — Sélecteur de modes (Option C compact)
// ============================================
import React from "react";

type GameId = "training" | "x01" | "cricket" | "killer" | "shanghai" | "battle";

export default function Games({ setTab }: { setTab: (tab: any) => void }) {
  const [openInfoId, setOpenInfoId] = React.useState<GameId | null>(null);

  const GAMES = [
    {
      id: "training",
      title: "TRAINING",
      subtitle: "Améliorez votre progression",
      tab: "training",
      enabled: true,
    },
    {
      id: "x01",
      title: "X01",
      subtitle: "301 / 501 / 701 / 901",
      tab: "x01setup",
      enabled: true,
    },
    {
      id: "cricket",
      title: "CRICKET",
      subtitle: "Fermez les zones 15…20 + Bull",
      tab: "cricket",
      enabled: true,
    },
    {
      id: "killer",
      title: "KILLER",
      subtitle: "Double ton numéro → deviens Killer",
      tab: "killer",
      enabled: false,
    },
    {
      id: "shanghai",
      title: "SHANGHAI",
      subtitle: "Cible du tour, S/D/T → Shanghai = win",
      tab: "shanghai",
      enabled: false,
    },
    {
      id: "battle",
      title: "BATTLE ROYALE",
      subtitle:
        "Mode fun à plusieurs — éliminations successives",
      tab: "battle",
      enabled: false,
    },
  ] as const;

  const GAME_INFOS: Record<GameId, string> = {
    training:
      "Mode entraînement solo : scoring, sorties, radar, moyennes, historique.",
    x01:
      "01 classique : partez de 301 / 501 / 701 / 901 et terminez exactement à 0 selon les règles (simple-out / double-out / master-out).",
    cricket:
      "Cricket : fermez les zones 15,16,17,18,19,20 & Bull avec 3 marques. Les sur-marques rapportent des points tant qu’un adversaire n’a pas fermé.",
    killer:
      "Chaque joueur reçoit un numéro. Double-le pour devenir Killer, puis élimine les autres.",
    shanghai:
      "À chaque tour une cible différente. Shanghai = simple + double + triple de la cible en une volée.",
    battle:
      "Mode fun à plusieurs : vies, malus, bonus, éliminations successives.",
  };

  const currentInfoGame =
    openInfoId ? GAMES.find((g) => g.id === openInfoId) : null;

  return (
    <div
      style={{
        padding: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          fontSize: 20,
          fontWeight: 900,
          letterSpacing: 1,
          color: "#F6C256",
          textShadow:
            "0 0 6px rgba(246,194,86,.9), 0 0 14px rgba(246,194,86,.6)",
        }}
      >
        TOUS LES JEUX
      </div>

      <div
        style={{
          opacity: 0.7,
          fontSize: 11,
          color: "#E5E7EB",
        }}
      >
        Sélectionne un mode de jeu :
      </div>

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
            onClick={() => setTab(g.tab)}
            onInfoClick={() => setOpenInfoId(g.id)}
          />
        ))}
      </div>

      {currentInfoGame && (
        <InfoModal
          title={currentInfoGame.title}
          description={GAME_INFOS[currentInfoGame.id]}
          onClose={() => setOpenInfoId(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------
// CARD
// ---------------------------------------------
function GameCard({
  title,
  subtitle,
  disabled,
  onClick,
  onInfoClick,
}: {
  title: string;
  subtitle: string;
  disabled: boolean;
  onClick: () => void;
  onInfoClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => !disabled && onClick()}
      style={{
        width: "100%",
        padding: "10px 14px",
        borderRadius: 14,
        background:
          "linear-gradient(180deg, rgba(15,16,28,.8), rgba(5,7,18,.9))",
        border: "1px solid rgba(255,255,255,.07)",
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* LEFT */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* LINE 1 : i + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* i button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInfoClick();
            }}
            style={{
              width: 18,
              height: 18,
              borderRadius: "999px",
              border: "1px solid rgba(246,194,86,.75)",
              background:
                "radial-gradient(circle, #fff 0, #F6C256 40%, #8b5a16 100%)",
              boxShadow:
                "0 0 5px rgba(246,194,86,.8), 0 0 10px rgba(246,194,86,.5)",
              color: "#1f1303",
              fontSize: 10,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              cursor: "pointer",
            }}
          >
            i
          </button>

          {/* TITLE */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: 1,
              color: "#F6C256",
              textShadow:
                "0 0 4px rgba(246,194,86,.8), 0 0 10px rgba(246,194,86,.5)",
              textTransform: "uppercase",
            }}
          >
            {title}
          </div>
        </div>

        {/* SUBTITLE */}
        <div
          style={{
            fontSize: 8,
            opacity: 0.85,
            marginLeft: 26,
            color: "#F8FAFC",
          }}
        >
          {subtitle}
        </div>
      </div>

      {/* RIGHT : PLAY BUTTON */}
      <div
        style={{
          padding: "4px 10px",
          borderRadius: 999,
          fontSize: 9,
          fontWeight: 800,
          color: disabled ? "#e5e7eb" : "#211500",
          background: disabled
            ? "linear-gradient(180deg,#6b7280,#4b5563)"
            : "linear-gradient(180deg,#ffc63a,#ffaf00)",
          border: disabled
            ? "1px solid rgba(148,163,184,.35)"
            : "1px solid rgba(255,180,0,.3)",
          boxShadow: disabled ? "none" : "0 0 8px rgba(240,177,42,.3)",
        }}
      >
        {disabled ? "Bientôt" : "Jouer"}
      </div>
    </button>
  );
}

// ---------------------------------------------
// MODAL
// ---------------------------------------------
function InfoModal({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 80,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "90%",
          maxWidth: 400,
          borderRadius: 14,
          padding: 14,
          background:
            "radial-gradient(circle, #111827 0, #020617 65%, #000 100%)",
          border: "1px solid rgba(255,255,255,.12)",
          color: "#fff",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 900,
            color: "#F6C256",
            textShadow:
              "0 0 5px rgba(246,194,86,.9), 0 0 14px rgba(246,194,86,.6)",
            marginBottom: 6,
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: 10,
            opacity: 0.9,
            marginBottom: 12,
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "6px 10px",
            borderRadius: 999,
            border: "none",
            background:
              "linear-gradient(135deg,#ffc63a,#ffaf00)",
            color: "#211500",
            fontSize: 10,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 0 12px rgba(240,177,42,.4)",
          }}
        >
          Compris
        </button>
      </div>
    </div>
  );
}
