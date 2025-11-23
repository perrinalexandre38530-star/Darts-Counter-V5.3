// ============================================
// src/pages/X01OnlineSetup.tsx
// Setup d'une partie X01 ONLINE (mock)
// - Tu règles : 301 / 501 / 701 / 1001 + Double Out
// - Joueur = profil actif uniquement
// - Optionnel : affiche le code de salon (mock)
// ============================================

import React from "react";
import type { Profile } from "../lib/types";

type StartValue = 301 | 501 | 701 | 1001;

type Props = {
  profile: Profile | null;
  defaults: {
    start: StartValue;
    doubleOut: boolean;
  };
  lobbyCode?: string | null;
  onBack: () => void;
  onStart: (params: { start: StartValue; doubleOut: boolean }) => void;
};

const START_CHOICES: StartValue[] = [301, 501, 701, 1001];

export default function X01OnlineSetup({
  profile,
  defaults,
  lobbyCode,
  onBack,
  onStart,
}: Props) {
  const [start, setStart] = React.useState<StartValue>(defaults.start);
  const [doubleOut, setDoubleOut] = React.useState<boolean>(defaults.doubleOut);

  const displayName = profile?.name || "Profil local";

  function handleStart() {
    onStart({ start, doubleOut });
  }

  return (
    <div
      className="container"
      style={{
        padding: 16,
        paddingBottom: 96,
        color: "#f5f5f7",
      }}
    >
      {/* Header simple */}
      <button
        type="button"
        onClick={onBack}
        style={{
          marginBottom: 12,
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.25)",
          background: "rgba(0,0,0,.65)",
          color: "#f5f5f7",
          fontSize: 12,
        }}
      >
        ← Retour
      </button>

      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          marginBottom: 4,
        }}
      >
        X01 Online (mock)
      </h2>

      <p
        style={{
          fontSize: 13,
          opacity: 0.8,
          marginBottom: 12,
        }}
      >
        Paramètre ta partie X01 Online locale avant de la lancer. Plus tard, cet
        écran sera relié à un vrai serveur.
      </p>

      {/* Info salon (optionnel) */}
      {lobbyCode && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(255,213,106,.4)",
            background:
              "linear-gradient(180deg, rgba(40,32,16,.96), rgba(12,8,4,.98))",
            fontSize: 12,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 4,
              color: "#ffd56a",
            }}
          >
            Salon Online (mock)
          </div>
          <div style={{ opacity: 0.85 }}>Code du salon :</div>
          <div
            style={{
              marginTop: 4,
              padding: "6px 10px",
              borderRadius: 8,
              background: "#111",
              border: "1px solid rgba(255,255,255,.15)",
              fontFamily: "monospace",
              letterSpacing: 2,
              fontSize: 14,
              fontWeight: 800,
              textAlign: "center",
              color: "#ffd56a",
            }}
          >
            {lobbyCode}
          </div>
        </div>
      )}

      {/* Joueur */}
      <div
        style={{
          marginBottom: 14,
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.12)",
          background:
            "linear-gradient(180deg, rgba(24,24,32,.96), rgba(8,8,12,.98))",
          fontSize: 12,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Joueur
        </div>
        <div style={{ opacity: 0.9 }}>
          Partie Online lancée pour : <b>{displayName}</b>
        </div>
        <div style={{ marginTop: 4, opacity: 0.7, fontSize: 11 }}>
          Pour l’instant, seul ton profil local est utilisé. Les autres joueurs
          online seront gérés plus tard.
        </div>
      </div>

      {/* Choix du départ */}
      <div
        style={{
          marginBottom: 14,
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.12)",
          background:
            "linear-gradient(180deg, rgba(26,26,40,.96), rgba(8,8,12,.98))",
          fontSize: 12,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Score de départ
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          {START_CHOICES.map((value) => {
            const selected = start === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setStart(value)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 999,
                  border: selected
                    ? "1px solid rgba(255,213,106,.9)"
                    : "1px solid rgba(255,255,255,.18)",
                  background: selected
                    ? "linear-gradient(180deg,#ffd56a,#e9a93d)"
                    : "linear-gradient(180deg,#262633,#151520)",
                  color: selected ? "#1b1404" : "#f5f5f7",
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>

      {/* Double out */}
      <div
        style={{
          marginBottom: 20,
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.12)",
          background:
            "linear-gradient(180deg, rgba(24,32,24,.96), rgba(8,12,8,.98))",
          fontSize: 12,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Règle de sortie
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => setDoubleOut(false)}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 999,
              border: !doubleOut
                ? "1px solid rgba(127,226,169,.9)"
                : "1px solid rgba(255,255,255,.18)",
              background: !doubleOut
                ? "linear-gradient(180deg,#7fe2a9,#35c86d)"
                : "linear-gradient(180deg,#262633,#151520)",
              color: !doubleOut ? "#04120a" : "#f5f5f7",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Sortie simple
          </button>
          <button
            type="button"
            onClick={() => setDoubleOut(true)}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 999,
              border: doubleOut
                ? "1px solid rgba(127,226,169,.9)"
                : "1px solid rgba(255,255,255,.18)",
              background: doubleOut
                ? "linear-gradient(180deg,#7fe2a9,#35c86d)"
                : "linear-gradient(180deg,#262633,#151520)",
              color: doubleOut ? "#04120a" : "#f5f5f7",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Double-Out
          </button>
        </div>
      </div>

      {/* Bouton lancer */}
      <button
        type="button"
        onClick={handleStart}
        style={{
          width: "100%",
          borderRadius: 999,
          padding: "10px 14px",
          border: "none",
          fontWeight: 800,
          fontSize: 14,
          background: "linear-gradient(180deg,#7fe2a9,#35c86d)",
          color: "#04120a",
          boxShadow: "0 10px 22px rgba(0,0,0,.65)",
          cursor: "pointer",
        }}
      >
        Lancer la partie X01 Online (mock)
      </button>
    </div>
  );
}
