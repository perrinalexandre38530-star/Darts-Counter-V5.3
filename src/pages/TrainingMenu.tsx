// ============================================
// src/pages/TrainingMenu.tsx
// Menu Training (solo) — style identique au menu Jeux
// - Cartes sombres, titre doré, bouton "Jouer" / "Bientôt"
// - Pastille "i" à gauche qui ouvre une popup d'aide
// ============================================

import React from "react";

type Props = {
  go?: (tab: any, params?: any) => void;
};

type InfoMode = "x01" | "clock" | "evolution";

export default function TrainingMenu({ go }: Props) {
  const [infoMode, setInfoMode] = React.useState<InfoMode | null>(null);

  function startX01Training() {
    if (!go) {
      console.warn("[TrainingMenu] go() manquant");
      return;
    }
    go("training_x01");
  }

  function startClockTraining() {
    if (!go) {
      console.warn("[TrainingMenu] go() manquant");
      return;
    }
    go("training_clock");
  }

  function openStats() {
    if (!go) {
      console.warn("[TrainingMenu] go() manquant");
      return;
    }
    // 👉 Stats Training X01
    go("training_stats");
  }

  function openInfo(mode: InfoMode) {
    setInfoMode(mode);
  }

  function closeInfo() {
    setInfoMode(null);
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
          TRAINING
        </div>
        <div
          style={{
            opacity: 0.75,
            fontSize: 12,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Améliorez votre progression dans différents modes
          d&apos;entraînement et suivez votre évolution en statistiques.
        </div>

        {/* -------- Liste des cartes Training -------- */}
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <TrainingCard
            title="TRAINING X01 SOLO"
            subtitle="Séances X01 en solo avec stats détaillées."
            onClick={startX01Training}
            onInfo={() => openInfo("x01")}
            disabled={false}
          />

          <TrainingCard
            title="TOUR DE L'HORLOGE"
            subtitle="1 → 20 + Bull en simple / double / triple."
            onClick={startClockTraining}
            onInfo={() => openInfo("clock")}
            disabled={false}
          />

          <TrainingCard
            title="EVOLUTION"
            subtitle="Accès direct aux statistiques Training X01."
            onClick={openStats}
            onInfo={() => openInfo("evolution")}
            disabled={false} // ✅ actif
          />
        </div>
      </div>

      {/* -------- Popup d'info -------- */}
      {infoMode && <InfoOverlay mode={infoMode} onClose={closeInfo} />}
    </>
  );
}

/* ---------- Carte Training : style identique à Games + pastille "i" ---------- */

type TrainingCardProps = {
  title: string;
  subtitle?: string;
  onClick: () => void;
  onInfo?: () => void;
  disabled?: boolean;
};

function TrainingCard({
  title,
  subtitle,
  onClick,
  onInfo,
  disabled,
}: TrainingCardProps) {
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
      onKeyDown={(e) => {
        if (disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
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
      {/* Colonne gauche : pastille info */}
      <div
        style={{
          marginRight: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
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
            padding: 0,
            cursor: "pointer",
          }}
        >
          i
        </button>
      </div>

      {/* Centre : titres */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: 12,            // ▼ réduit
            textTransform: "uppercase",
            letterSpacing: 0.7,      // ▼ réduit
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

      {/* Droite : bouton Jouer / Bientôt (toujours Jouer ici) */}
      <span
        style={{
          marginLeft: 10,
          background: disabled
            ? "linear-gradient(180deg, #6b7280, #4b5563)"
            : "linear-gradient(180deg, #ffc63a, #ffaf00)",
          color: disabled ? "#e5e7eb" : "#111827",
          borderRadius: 999,
          padding: "4px 10px",        // ▼ réduit
          fontWeight: 800,
          fontSize: 10.5,             // ▼ réduit
          textTransform: "uppercase",
          letterSpacing: 0.7,         // ▼ cohérent
          border: disabled
            ? "1px solid rgba(148,163,184,.35)"
            : "1px solid rgba(255,180,0,.45)",
          boxShadow: disabled
            ? "none"
            : "0 0 10px rgba(240,177,42,.3)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 56,               // ▼ réduit
        }}
      >
        {disabled ? "Bientôt" : "Jouer"}
      </span>
    </button>
  );
}

/* ---------- Overlay d'informations ---------- */

function InfoOverlay({
  mode,
  onClose,
}: {
  mode: InfoMode;
  onClose: () => void;
}) {
  let title = "";
  let lines: string[] = [];

  if (mode === "x01") {
    title = "Training X01 solo";
    lines = [
      "Joue en 301 / 501 / 701 / 901 selon les paramètres choisis.",
      "Chaque volée et chaque fléchette est enregistrée.",
      "Retrouve toutes les stats détaillées dans la section Evolution.",
    ];
  } else if (mode === "clock") {
    title = "Tour de l'horloge";
    lines = [
      "Objectif : toucher 1 → 20 puis Bull, dans l’ordre.",
      "Choisis le mode : Simple, Double, Triple ou S-D-T.",
      "Chaque cible réussie est mémorisée pour suivre ton pourcentage de réussite.",
    ];
  } else {
    title = "Evolution";
    lines = [
      "Accès direct aux statistiques de Training X01.",
      "Moyennes, meilleurs finishes, volume de fléchettes, progression dans le temps.",
      "Idéal pour suivre précisément ton niveau et tes progrès.",
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
