// ============================================
// src/pages/TrainingMenu.tsx
// Menu Training (solo) — boutons centrés + popups info
// ============================================

import React from "react";

type Props = {
  go?: (tab: any, params?: any) => void;
};

type InfoMode = "x01" | "clock" | "evolution";

export default function TrainingMenu({ go }: Props) {
  const [infoMode, setInfoMode] = React.useState<InfoMode | null>(null);

  function startX01Training() {
    if (!go) return console.warn("[TrainingMenu] go() manquant");
    go("training_x01");
  }

  function startClockTraining() {
    if (!go) return console.warn("[TrainingMenu] go() manquant");
    go("training_clock");
  }

  function openStats() {
    if (!go) return console.warn("[TrainingMenu] go() manquant");
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
            fontSize: 24,
            fontWeight: 900,
            marginBottom: 4,
            letterSpacing: 1,
          }}
        >
          TRAINING
        </div>
        <div
          style={{
            opacity: 0.75,
            fontSize: 14,
            marginBottom: 12,
            textAlign: "center",
            maxWidth: 520,
          }}
        >
          Améliorez votre progression dans plusieurs modes de jeux d'entrainements solo ou à plusieurs et suivez votre évolution en statistiques.
        </div>

        {/* -------- Cartes Training -------- */}
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <TrainingCard
            mainLabel="TRAINING X01 SOLO"
            onClick={startX01Training}
            onInfo={() => openInfo("x01")}
          />

          <TrainingCard
            mainLabel="TOUR DE L'HORLOGE"
            onClick={startClockTraining}
            onInfo={() => openInfo("clock")}
          />

          <TrainingCard
            mainLabel="EVOLUTION"
            onClick={openStats}
            onInfo={() => openInfo("evolution")}
          />
        </div>
      </div>

      {/* -------- Popup d'info -------- */}
      {infoMode && (
        <InfoOverlay mode={infoMode} onClose={closeInfo} />
      )}
    </>
  );
}

/* ---------- Carte Training : texte centré + bouton "i" à droite ---------- */
function TrainingCard({
  mainLabel,
  onClick,
  onInfo,
}: {
  mainLabel: string;
  onClick: () => void;
  onInfo?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "14px 18px",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,.08)",
        background:
          "linear-gradient(180deg, rgba(25,25,28,.8), rgba(15,15,18,.95))",
        cursor: "pointer",
        display: "block",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.02)";
        e.currentTarget.style.boxShadow = "0 0 18px rgba(240,177,42,.28)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* zone centrale qui prend toute la largeur et centre le bouton doré */}
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              background: "linear-gradient(180deg, #ffc63a, #ffaf00)",
              color: "#111",
              borderRadius: 999,
              padding: "6px 14px",
              fontWeight: 800,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.06 * 16 + "px",
              border: "1px solid rgba(255,180,0,.4)",
              boxShadow: "0 0 10px rgba(240,177,42,.35)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              whiteSpace: "nowrap",
            }}
          >
            {mainLabel}
          </span>
        </div>

        {/* bouton "i" tout à droite */}
        {onInfo && (
          <span
            onClick={(e) => {
              e.stopPropagation(); // ne pas lancer la partie
              onInfo();
            }}
            style={{
              width: 26,
              height: 26,
              marginLeft: 8,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.35)",
              background: "#111",
              color: "#fff",
              fontWeight: 800,
              fontSize: 14,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 6px rgba(0,0,0,.6)",
            }}
          >
            i
          </span>
        )}
      </div>
    </button>
  );
}

/* ---------- Overlay d'informations ---------- */

function InfoOverlay({ mode, onClose }: { mode: InfoMode; onClose: () => void }) {
  let title = "";
  let lines: string[] = [];

  if (mode === "x01") {
    title = "Training X01 solo";
    lines = [
      "Joue en 301 / 501 / 701 / 901 (selon les paramètres que tu as choisis).",
      "Chaque volée et chaque fléchette est enregistrée.",
      "Les stats sont visibles dans l’onglet Evolution (moyennes, % de hits, meilleurs finishes…).",
    ];
  } else if (mode === "clock") {
    title = "Tour de l'horloge";
    lines = [
      "Objectif : toucher 1 → 20 puis Bull, dans l’ordre.",
      "Choisis le mode : Simple, Double, Triple ou S-D-T (Simple/Double/Triple).",
      "Chaque cible réussie est mémorisée pour suivre ton % de réussite.",
    ];
  } else {
    title = "Evolution";
    lines = [
      "Historique de tes sessions de training.",
      "Graphiques et pourcentages de hits par cible / par mode.",
      "Permet de suivre ta progression au fil du temps.",
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
          width: "80%",
          maxWidth: 360,
          borderRadius: 18,
          padding: 18,
          background:
            "linear-gradient(180deg, rgba(22,22,25,.98), rgba(10,10,12,.98))",
          border: "1px solid rgba(255,255,255,.12)",
          boxShadow: "0 18px 40px rgba(0,0,0,.7)",
        }}
      >
        <div
          style={{
            fontSize: 18,
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
          {lines.map((l) => (
            <li key={l}>{l}</li>
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
            color: "#111",
            boxShadow: "0 0 10px rgba(240,177,42,.5)",
            cursor: "pointer",
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
