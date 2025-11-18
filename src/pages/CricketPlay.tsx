// ============================================
// src/pages/CricketPlay.tsx
// Mode Cricket — v1 avec vrais profils
// - Phase SETUP : sélection de 2 à 4 profils locaux
// - Phase PLAY  : moteur Cricket (marks + score)
// ============================================

import React from "react";
import {
  createCricketMatch,
  applyCricketHit,
  undoLastCricketHit,
  CRICKET_TARGETS,
  type CricketTarget,
  type Multiplier,
  type CricketState,
} from "../lib/cricketEngine";
import { playSound } from "../lib/sound";
import type { Profile } from "../lib/types";

const T = {
  bg: "#050712",
  card: "#121420",
  text: "#FFFFFF",
  textSoft: "rgba(255,255,255,0.7)",
  gold: "#F6C256",
  red: "#FF4A4A",
  green: "#37D99A",
  borderSoft: "rgba(255,255,255,0.08)",
};

type Phase = "setup" | "play";

type Props = {
  profiles: Profile[];
};

export default function CricketPlay({ profiles }: Props) {
  // ---- Phase (setup -> play) ----
  const [phase, setPhase] = React.useState<Phase>("setup");

  // ---- Joueurs sélectionnés (ids de profils) ----
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // ---- Match en cours (phase PLAY) ----
  const [state, setState] = React.useState<CricketState | null>(null);

  const [currentMult, setCurrentMult] = React.useState<Multiplier>(1);

  const currentPlayer =
    state && state.players[state.currentPlayerIndex]
      ? state.players[state.currentPlayerIndex]
      : null;

  // --------------------------------------------------
  // SETUP : sélection des profils
  // --------------------------------------------------

  function toggleProfile(id: string) {
    setSelectedIds((prev) => {
      const idx = prev.indexOf(id);
      // Si déjà sélectionné → on retire
      if (idx !== -1) {
        const copy = [...prev];
        copy.splice(idx, 1);
        return copy;
      }
      // Sinon on ajoute à la fin (ordre de jeu)
      if (prev.length >= 4) return prev; // max 4
      return [...prev, id];
    });
  }

  const selectedCount = selectedIds.length;
  const canStart = selectedCount >= 2 && selectedCount <= 4;

  function handleStartMatch() {
    if (!canStart) return;

    const selectedProfiles = profiles.filter((p) =>
      selectedIds.includes(p.id)
    );

    if (selectedProfiles.length < 2) return;

    const match = createCricketMatch(
      selectedProfiles.map((p) => ({
        id: p.id,
        name: p.name, // on utilise le nom du profil
      }))
    );

    setState(match);
    setPhase("play");
    setCurrentMult(1);
    playSound("start");
  }

  // --------------------------------------------------
  // PLAY : moteur / actions
  // --------------------------------------------------

  function handleHit(target: CricketTarget) {
    if (!state || !currentPlayer) return;
    if (state.winnerId) return;

    const next = applyCricketHit(state, target, currentMult);
    setState(next);
    playSound("ok");
  }

  function handleUndo() {
    if (!state) return;
    const next = undoLastCricketHit(state);
    setState(next);
    playSound("undo");
  }

  function handleNewLeg() {
    if (!state) return;

    const match = createCricketMatch(
      state.players.map((p) => ({ id: p.id, name: p.name }))
    );
    setState(match);
    setCurrentMult(1);
    playSound("start");
  }

  const winner =
    state && state.winnerId
      ? state.players.find((p) => p.id === state.winnerId) || null
      : null;

  // --------------------------------------------------
  // CAS : aucun profil → écran d'info
  // --------------------------------------------------
  if (phase === "setup" && (!profiles || profiles.length === 0)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: `radial-gradient(circle at top, #1c2540 0, #050712 55%, #000 100%)`,
          color: T.text,
          padding: "16px 12px 80px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            Aucun profil disponible
          </div>
          <div
            style={{
              fontSize: 14,
              color: T.textSoft,
              maxWidth: 320,
              margin: "0 auto 16px",
            }}
          >
            Crée au moins deux profils dans l&apos;onglet{" "}
            <strong>Profils</strong> avant de lancer une partie de Cricket.
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // RENDER : PHASE SETUP
  // --------------------------------------------------
  if (phase === "setup") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: `radial-gradient(circle at top, #1c2540 0, #050712 55%, #000 100%)`,
          color: T.text,
          padding: "16px 12px 80px",
          boxSizing: "border-box",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: T.textSoft,
              marginBottom: 4,
            }}
          >
            Préparation
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            Cricket
          </div>
          <div
            style={{
              fontSize: 13,
              marginTop: 4,
              color: T.textSoft,
            }}
          >
            Sélectionne les joueurs pour cette manche (2 à 4 profils).
          </div>
        </div>

        {/* CARTE JOUEURS */}
        <div
          style={{
            borderRadius: 18,
            background: T.card,
            border: `1px solid ${T.borderSoft}`,
            padding: 14,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: T.textSoft,
              marginBottom: 8,
            }}
          >
            Joueurs
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {profiles.map((p) => {
              const idx = selectedIds.indexOf(p.id);
              const isSelected = idx !== -1;
              const orderLabel = isSelected ? `J${idx + 1}` : "";

              const initials =
                (p.name || "")
                  .split(" ")
                  .filter(Boolean)
                  .map((s) => s[0])
                  .join("")
                  .toUpperCase() || "?";

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleProfile(p.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    borderRadius: 12,
                    border: isSelected
                      ? `1px solid ${T.gold}`
                      : `1px solid ${T.borderSoft}`,
                    background: isSelected
                      ? "linear-gradient(135deg,#262a3f,#111320)"
                      : "rgba(8,10,20,0.9)",
                    padding: "8px 10px",
                    cursor: "pointer",
                    boxShadow: isSelected
                      ? "0 0 18px rgba(246,194,86,0.3)"
                      : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {/* pseudo avatar rond avec initiales */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: isSelected ? T.gold : "#0f172a",
                        color: isSelected ? "#3A2300" : "#e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {initials}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        {p.name}
                      </span>
                      {p.nickname && (
                        <span
                          style={{
                            fontSize: 11,
                            color: T.textSoft,
                          }}
                        >
                          {p.nickname}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: isSelected ? T.gold : T.textSoft,
                      minWidth: 32,
                      textAlign: "right",
                    }}
                  >
                    {orderLabel}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Info sous la liste */}
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: T.textSoft,
            }}
          >
            {selectedCount === 0 && "Choisis au moins deux joueurs."}
            {selectedCount === 1 && "Ajoute encore un joueur."}
            {selectedCount >= 2 && selectedCount <= 4 && (
              <>Ordre de jeu : {selectedIds.map((id, i) => {
                const p = profiles.find((pr) => pr.id === id);
                return p
                  ? `${i > 0 ? " · " : ""}${i + 1}. ${p.name}`
                  : "";
              })}</>
            )}
            {selectedCount > 4 && "Maximum 4 joueurs."}
          </div>
        </div>

        {/* PARAMÈTRES (simple pour l'instant) */}
        <div
          style={{
            borderRadius: 18,
            background: T.card,
            border: `1px solid ${T.borderSoft}`,
            padding: 14,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: T.textSoft,
              marginBottom: 8,
            }}
          >
            Paramètres
          </div>

          <div
            style={{
              fontSize: 13,
              color: T.textSoft,
              lineHeight: 1.5,
            }}
          >
            Mode Cricket standard :{" "}
            <span style={{ color: T.text }}>
              20, 19, 18, 17, 16, 15 &amp; Bull
            </span>{" "}
            (fermures à 3 marques, sur-marques = points si les autres
            n&apos;ont pas fermé).
          </div>
        </div>

        {/* BOUTON LANCER */}
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 80,
            padding: "0 16px",
          }}
        >
          <button
            type="button"
            onClick={handleStartMatch}
            disabled={!canStart}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 999,
              border: "none",
              background: canStart
                ? "linear-gradient(135deg,#ffc63a,#ffaf00)"
                : "linear-gradient(135deg,#6b7280,#4b5563)",
              color: canStart ? "#211500" : "#e5e7eb",
              fontSize: 15,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.4,
              cursor: canStart ? "pointer" : "not-allowed",
              boxShadow: canStart
                ? "0 0 20px rgba(240,177,42,.35)"
                : "none",
            }}
          >
            Lancer la partie
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // RENDER : PHASE PLAY (écran de jeu)
  // --------------------------------------------------

  if (!state || !currentPlayer) {
    // sécurité : si jamais on arrive ici sans setup
    return (
      <div
        style={{
          minHeight: "100vh",
          background: `radial-gradient(circle at top, #1c2540 0, #050712 55%, #000 100%)`,
          color: T.text,
          padding: "16px 12px 80px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Configuration manquante
          </div>
          <div style={{ fontSize: 14, color: T.textSoft, marginBottom: 16 }}>
            Retourne à l&apos;écran de préparation pour lancer une partie de
            Cricket.
          </div>
          <button
            type="button"
            onClick={() => {
              setState(null);
              setPhase("setup");
            }}
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "none",
              background: T.gold,
              color: "#3A2300",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Revenir au setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(circle at top, #1c2540 0, #050712 55%, #000 100%)`,
        color: T.text,
        padding: "12px 10px 80px",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER SIMPLE */}
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: T.textSoft,
            }}
          >
            Mode
          </div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Cricket</div>
        </div>
        <div
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            border: `1px solid ${T.borderSoft}`,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: 1.2,
            color: T.textSoft,
          }}
        >
          {state.remainingDarts} dart
          {state.remainingDarts > 1 ? "s" : ""} · Tour de{" "}
          <span style={{ color: T.gold, fontWeight: 600 }}>
            {currentPlayer.name}
          </span>
        </div>
      </div>

      {/* SCORES JOUEURS */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {state.players.map((p) => {
          const isActive = p.id === currentPlayer.id;
          const isWinner = p.id === state.winnerId;
          return (
            <div
              key={p.id}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 12,
                background: isActive
                  ? "linear-gradient(135deg,#20263a,#121420)"
                  : T.card,
                border: isActive
                  ? `1px solid ${T.gold}`
                  : `1px solid ${T.borderSoft}`,
                boxShadow: isActive
                  ? "0 0 20px rgba(246,194,86,0.25)"
                  : "none",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  color: T.textSoft,
                  marginBottom: 4,
                }}
              >
                {isWinner
                  ? "Gagnant"
                  : isActive
                  ? "Joue maintenant"
                  : "En attente"}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                {p.name}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: isWinner ? T.green : T.gold,
                }}
              >
                {p.score}
              </div>
            </div>
          );
        })}
      </div>

      {/* TABLEAU MARQUES */}
      <div
        style={{
          borderRadius: 16,
          background: T.card,
          border: `1px solid ${T.borderSoft}`,
          padding: 10,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `60px repeat(${state.players.length}, 1fr)`,
            gap: 8,
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <div />
          {state.players.map((p) => (
            <div
              key={p.id}
              style={{ fontSize: 12, color: T.textSoft, textAlign: "center" }}
            >
              {p.name}
            </div>
          ))}
        </div>

        {CRICKET_TARGETS.map((target) => (
          <div
            key={target}
            style={{
              display: "grid",
              gridTemplateColumns: `60px repeat(${state.players.length}, 1fr)`,
              gap: 8,
              alignItems: "center",
              padding: "4px 0",
              borderTop: `1px solid rgba(255,255,255,0.04)`,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: T.gold,
                textAlign: "center",
              }}
            >
              {target === 25 ? "Bull" : target}
            </div>
            {state.players.map((p) => {
              const marks = p.marks[target];
              let symbol = "";
              if (marks === 0) symbol = "";
              if (marks === 1) symbol = "•";
              if (marks === 2) symbol = "••";
              if (marks >= 3) symbol = "✕";

              return (
                <div
                  key={p.id}
                  style={{
                    textAlign: "center",
                    fontSize: 18,
                    fontWeight: 600,
                    color:
                      marks >= 3
                        ? T.green
                        : p.id === currentPlayer.id
                        ? T.text
                        : T.textSoft,
                  }}
                >
                  {symbol}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* MULTIPLIERS */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {([
          { label: "Simple", value: 1 as Multiplier },
          { label: "Double", value: 2 as Multiplier },
          { label: "Triple", value: 3 as Multiplier },
        ] as const).map((m) => {
          const active = currentMult === m.value;
          return (
            <button
              key={m.value}
              onClick={() => setCurrentMult(m.value)}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 1.1,
                background: active ? T.gold : "#1B1F30",
                color: active ? "#3A2300" : T.textSoft,
                boxShadow: active
                  ? "0 0 18px rgba(246,194,86,0.45)"
                  : "0 0 0 rgba(0,0,0,0)",
                transition: "all 0.12s ease",
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* TARGETS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0,1fr))",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {CRICKET_TARGETS.map((target) => (
          <button
            key={target}
            onClick={() => handleHit(target)}
            style={{
              padding: "12px 0",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 700,
              background:
                target === 25
                  ? "linear-gradient(135deg,#5c2cff,#ba7bff)"
                  : "linear-gradient(135deg,#25304a,#151827)",
              color: "#FFFFFF",
              boxShadow:
                "0 0 12px rgba(0,0,0,0.35), 0 0 10px rgba(0,0,0,0.5)",
            }}
          >
            {target === 25 ? "Bull" : target}
          </button>
        ))}
      </div>

      {/* CONTROLES BAS */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <button
          onClick={handleUndo}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 999,
            border: `1px solid ${T.borderSoft}`,
            background: "transparent",
            color: T.textSoft,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Annuler dernier dart
        </button>
        <button
          onClick={handleNewLeg}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 999,
            border: "none",
            background: T.red,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: 1.1,
          }}
        >
          Nouvelle manche
        </button>
      </div>

      {/* BANDEAU FIN DE MANCHE */}
      {winner && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 80,
            padding: "12px 16px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(135deg,rgba(10,14,30,0.95),rgba(8,10,25,0.97))",
              borderRadius: 16,
              padding: 12,
              border: `1px solid ${T.gold}`,
              boxShadow: "0 0 32px rgba(246,194,86,0.35)",
              maxWidth: 400,
              width: "100%",
            }}
          >
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: T.textSoft,
                marginBottom: 4,
              }}
            >
              Manche terminée
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              {winner.name} remporte le Cricket 🎯
            </div>
            <button
              onClick={handleNewLeg}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 999,
                border: "none",
                background: T.gold,
                color: "#3A2300",
                fontSize: 14,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 1.1,
                cursor: "pointer",
              }}
            >
              Rejouer une manche
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
