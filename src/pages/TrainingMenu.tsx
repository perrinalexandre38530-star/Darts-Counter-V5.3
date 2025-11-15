// ============================================
// src/pages/TrainingMenu.tsx
// Menu Training (solo) — style harmonisé
// ============================================

import React from "react";

type Props = {
  // fonction go fournie par App.tsx (setTab interne)
  go: (tab: any, params?: any) => void;
};

export default function TrainingMenu({ go }: Props) {
  function startX01Training() {
    go("training_x01");
  }

  function openStats() {
    go("training_stats");
  }

  return (
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
        Joue en solo, chaque fléchette est mémorisée pour suivre ta
        progression et ton pourcentage de réussite.
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
          title="X01 solo — Training"
          subtitle="501 • enregistre chaque volée et chaque fléchette"
          actionLabel="Lancer"
          onClick={startX01Training}
        />

        <TrainingCard
          title="Voir l'évolution"
          subtitle="Historique des sessions et % de hits"
          actionLabel="Ouvrir"
          onClick={openStats}
        />
      </div>
    </div>
  );
}

/* ---------- Carte Training ---------- */
function TrainingCard({
  title,
  subtitle,
  actionLabel,
  onClick,
}: {
  title: string;
  subtitle?: string;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "14px 18px",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,.08)",
        background:
          "linear-gradient(180deg, rgba(25,25,28,.8), rgba(15,15,18,.95))",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
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
      <div>
        <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
        {subtitle && (
          <div
            style={{
              fontSize: 13,
              opacity: 0.78,
              marginTop: 2,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      <span
        style={{
          background: "linear-gradient(180deg, #ffc63a, #ffaf00)",
          color: "#111",
          borderRadius: 999,
          padding: "6px 14px",
          fontWeight: 800,
          fontSize: 13,
          border: "1px solid rgba(255,180,0,.4)",
          boxShadow: "0 0 10px rgba(240,177,42,.35)",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          whiteSpace: "nowrap",
        }}
      >
        {actionLabel}
      </span>
    </button>
  );
}
