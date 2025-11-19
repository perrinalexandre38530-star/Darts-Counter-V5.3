// ============================================
// src/pages/CricketPlay.tsx
// Mode Cricket — v1 avec vrais profils & avatars
// - Phase SETUP : sélection de 2 à 4 profils locaux + paramètres
// - Phase PLAY  : moteur Cricket (marks + score) avec scoreboard néon
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

// Couleurs d’accent par joueur (pour les marques / halos)
const ACCENTS = ["#f97316", "#38bdf8", "#a855f7", "#22c55e"];

type Phase = "setup" | "play";
type ScoreMode = "points" | "no-points";

type Props = {
  profiles?: Profile[];
};

export default function CricketPlay({ profiles }: Props) {
  const allProfiles = profiles ?? [];

  // ---- Phase (setup -> play) ----
  const [phase, setPhase] = React.useState<Phase>("setup");

  // ---- Joueurs sélectionnés (ids de profils) ----
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // ---- Paramètres de jeu ----
  const [scoreMode, setScoreMode] = React.useState<ScoreMode>("points");
  const [maxRounds, setMaxRounds] = React.useState<number>(20);
  const [rotateFirstPlayer, setRotateFirstPlayer] = React.useState<boolean>(true);

  // ---- Match en cours (phase PLAY) ----
  const [state, setState] = React.useState<CricketState | null>(null);
  const [currentMult, setCurrentMult] = React.useState<Multiplier>(1);

  const currentPlayer =
    state && state.players[state.currentPlayerIndex]
      ? state.players[state.currentPlayerIndex]
      : null;

  // Map id -> profil (pour avatars pendant le jeu)
  const profileById = React.useMemo(() => {
    const m = new Map<string, Profile>();
    for (const p of allProfiles) m.set(p.id, p);
    return m;
  }, [allProfiles]);

  // --------------------------------------------------
  // Helpers visuels
  // --------------------------------------------------

  function renderAvatarCircle(
    prof: Profile | null,
    opts?: { selected?: boolean; size?: number }
  ) {
    const size = opts?.size ?? 40;
    const selected = !!opts?.selected;
    const initials =
      (prof?.name || "")
        .split(" ")
        .filter(Boolean)
        .map((s) => s[0])
        .join("")
        .toUpperCase() || "?";

    const borderColor = selected ? T.gold : T.borderSoft;

    if (prof?.avatarDataUrl) {
      return (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            overflow: "hidden",
            border: `2px solid ${borderColor}`,
            boxShadow: selected
              ? "0 0 16px rgba(246,194,86,0.8)"
              : "0 0 6px rgba(0,0,0,0.7)",
            background: "#000",
            flexShrink: 0,
          }}
        >
          <img
            src={prof.avatarDataUrl}
            alt={prof?.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>
      );
    }

    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: selected ? T.gold : "#0f172a",
          color: selected ? "#3A2300" : "#e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.42,
          fontWeight: 800,
          border: `2px solid ${borderColor}`,
          boxShadow: selected
            ? "0 0 16px rgba(246,194,86,0.8)"
            : "0 0 6px rgba(0,0,0,0.7)",
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
    );
  }

  function cricketSymbol(marks: number): string {
    if (marks <= 0) return "";
    if (marks === 1) return "/";
    if (marks === 2) return "X";
    return "⦻"; // fermé
  }

  // --------------------------------------------------
  // SETUP : sélection des profils + options
  // --------------------------------------------------

  function toggleProfile(id: string) {
    setSelectedIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx !== -1) {
        const copy = [...prev];
        copy.splice(idx, 1);
        return copy;
      }
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }

  const selectedCount = selectedIds.length;
  const canStart =
    selectedCount >= 2 && selectedCount <= 4 && allProfiles.length >= 2;

  function handleStartMatch() {
    if (!canStart) return;

    const selectedProfiles = allProfiles.filter((p) =>
      selectedIds.includes(p.id)
    );
    if (selectedProfiles.length < 2) return;

    const match = createCricketMatch(
      selectedProfiles.map((p) => ({
        id: p.id,
        name: p.name,
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

    let nextPlayers = state.players;
    if (rotateFirstPlayer && state.players.length > 1) {
      const [first, ...rest] = state.players;
      nextPlayers = [...rest, first];
    }

    const match = createCricketMatch(
      nextPlayers.map((p) => ({ id: p.id, name: p.name }))
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
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: T.gold,
              textShadow:
                "0 0 6px rgba(246,194,86,0.8), 0 0 18px rgba(246,194,86,0.6)",
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
            Sélectionne les joueurs et les options pour cette manche.
          </div>
        </div>

        {/* JOUEURS */}
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

          {allProfiles.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "32px 16px 8px",
                fontSize: 14,
                color: T.textSoft,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  marginBottom: 8,
                }}
              >
                Aucun profil disponible
              </div>
              <div>
                Crée au moins deux profils dans l&apos;onglet{" "}
                <strong>Profils</strong> avant de lancer une partie de Cricket.
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {allProfiles.map((p) => {
                  const idx = selectedIds.indexOf(p.id);
                  const isSelected = idx !== -1;
                  const orderLabel = isSelected ? `J${idx + 1}` : "";

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
                        {renderAvatarCircle(p, { selected: isSelected, size: 32 })}
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
                  <>
                    Ordre de jeu :
                    {selectedIds.map((id, i) => {
                      const p = allProfiles.find((pr) => pr.id === id);
                      return p
                        ? `${i > 0 ? " · " : " "}${i + 1}. ${p.name}`
                        : "";
                    })}
                  </>
                )}
                {selectedCount > 4 && "Maximum 4 joueurs."}
              </div>
            </>
          )}
        </div>

        {/* PARAMÈTRES DE BASE */}
        <div
          style={{
            borderRadius: 18,
            background: T.card,
            border: `1px solid ${T.borderSoft}`,
            padding: 14,
            marginBottom: 14,
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
            Paramètres de base
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

        {/* OPTIONS AVANCÉES */}
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
            Options avancées
          </div>

          {/* Mode scores */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, color: T.textSoft }}>
              Mode de score
            </span>
            <div
              style={{
                display: "inline-flex",
                padding: 3,
                borderRadius: 999,
                background: "#050816",
                border: `1px solid ${T.borderSoft}`,
                gap: 4,
              }}
            >
              <button
                type="button"
                onClick={() => setScoreMode("points")}
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  background:
                    scoreMode === "points"
                      ? "linear-gradient(135deg,#22c55e,#16a34a)"
                      : "transparent",
                  color: scoreMode === "points" ? "#02120a" : T.textSoft,
                }}
              >
                Points
              </button>
              <button
                type="button"
                onClick={() => setScoreMode("no-points")}
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  background:
                    scoreMode === "no-points"
                      ? "linear-gradient(135deg,#6b7280,#4b5563)"
                      : "transparent",
                  color: scoreMode === "no-points" ? "#020617" : T.textSoft,
                }}
              >
                Sans points
              </button>
            </div>
          </div>

          {/* Nombre de manches */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, color: T.textSoft }}>
              Nombre max de manches
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {[10, 15, 20].map((n) => {
                const active = maxRounds === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMaxRounds(n)}
                    style={{
                      minWidth: 40,
                      padding: "5px 8px",
                      borderRadius: 999,
                      border: active
                        ? `1px solid ${T.gold}`
                        : `1px solid ${T.borderSoft}`,
                      background: active ? "#1e293b" : "transparent",
                      color: active ? T.gold : T.textSoft,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rotation du premier joueur */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, color: T.textSoft }}>
              Premier joueur tourne{" "}
              <span style={{ opacity: 0.7 }}>
                (le lanceur 1 passe en dernier à chaque nouvelle manche)
              </span>
            </span>
            <button
              type="button"
              onClick={() => setRotateFirstPlayer((v) => !v)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 999,
                border: "none",
                background: rotateFirstPlayer ? "#22c55e" : "#4b5563",
                position: "relative",
                cursor: "pointer",
                padding: 2,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  bottom: 2,
                  left: rotateFirstPlayer ? 22 : 2,
                  width: 20,
                  borderRadius: "999px",
                  background: "#0b1120",
                  transition: "left 0.15s ease",
                }}
              />
            </button>
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
  // RENDER : PHASE PLAY
  // --------------------------------------------------

  if (!state || !currentPlayer) {
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

  const scoreModeLabel =
    scoreMode === "points" ? "Score : points" : "Score : sans points";

  const totalDartsPerTurn = 3;
  const thrown = Math.max(
    0,
    Math.min(totalDartsPerTurn, totalDartsPerTurn - state.remainingDarts)
  );

  // Palette pour cartes joueurs (fond)
  const playerCardColors = ["#0f172a", "#111827", "#1f2937", "#172554"];

  // Helper cellule marques (pour layout 3+ joueurs)
  function MarkCell({
    marks,
    playerIndex,
    isActive,
  }: {
    marks: number;
    playerIndex: number;
    isActive: boolean;
  }) {
    const accent = ACCENTS[playerIndex % ACCENTS.length];
    const filled = Math.min(marks, 3);
    const ratio = filled / 3;
    const symbol = cricketSymbol(marks);

    return (
      <div
        style={{
          position: "relative",
          height: 22,
          borderRadius: 10,
          overflow: "hidden",
          background: isActive
            ? "rgba(15,23,42,0.9)"
            : "rgba(15,23,42,0.7)",
          border:
            marks >= 3
              ? `1px solid ${accent}`
              : isActive
              ? `1px solid ${T.gold}`
              : `1px solid rgba(148,163,184,0.4)`,
          boxShadow:
            marks >= 3
              ? `0 0 12px ${accent}80`
              : isActive
              ? "0 0 16px rgba(246,194,86,0.5)"
              : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: 2,
          }}
        >
          <div
            style={{
              width: `${ratio * 100}%`,
              height: "100%",
              borderRadius: 8,
              background:
                marks >= 3
                  ? `linear-gradient(90deg,${accent},#22c55e)`
                  : isActive
                  ? "linear-gradient(90deg,rgba(250,204,21,0.7),rgba(250,204,21,0.2))"
                  : `linear-gradient(90deg,${accent}55,${accent}20)`,
              transition: "width 0.15s ease",
            }}
          />
        </div>
        <div
          style={{
            position: "relative",
            fontSize: 15,
            fontWeight: 800,
            color:
              marks >= 3
                ? "#0f172a"
                : isActive
                ? "#f9fafb"
                : "#e5e7eb",
          }}
        >
          {symbol}
        </div>
      </div>
    );
  }

  // --------------------------------------------
  // UI Play
  // --------------------------------------------
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
      {/* HEADER : titre + fléchettes */}
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          flexDirection: "column",
          gap: 6,
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
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: T.gold,
              textShadow:
                "0 0 6px rgba(246,194,86,0.8), 0 0 18px rgba(246,194,86,0.7)",
            }}
          >
            Cricket
          </div>

          {/* 3 fléchettes inspirées de l'icône */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {Array.from({ length: totalDartsPerTurn }).map((_, i) => {
              const active = i < thrown;
              return (
                <div
                  key={i}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: active
                      ? "1px solid rgba(250,204,21,0.9)"
                      : `1px solid ${T.borderSoft}`,
                    background: active
                      ? "radial-gradient(circle at 30% 20%, #fff, #facc15)"
                      : "radial-gradient(circle at 30% 20%, #020617, #020617)",
                    boxShadow: active
                      ? "0 0 12px rgba(250,204,21,0.9)"
                      : "0 0 4px rgba(0,0,0,0.7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      transform: "rotate(135deg)", // pointe vers bas droite
                      color: active ? "#fbbf24" : "#ffffff",
                    }}
                  >
                    ➤
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Infos mode / params */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: T.textSoft,
          }}
        >
          <span>{scoreModeLabel}</span>
          <span>· Max manches : {maxRounds}</span>
          {rotateFirstPlayer && <span>· Premier joueur tourne</span>}
        </div>
      </div>

      {/* CARTES JOUEURS : avatar + score */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {state.players.map((p, idx) => {
          const isActive = p.id === currentPlayer.id;
          const isWinner = p.id === state.winnerId;
          const prof = profileById.get(p.id) ?? null;
          const baseColor = playerCardColors[idx % playerCardColors.length];

          const bg = isActive
            ? "linear-gradient(135deg,#1f2937,#111827)"
            : baseColor;
          const border = isActive
            ? `1px solid ${T.gold}`
            : `1px solid ${T.borderSoft}`;
          const glow = isActive
            ? "0 0 22px rgba(246,194,86,0.6)"
            : "0 0 6px rgba(0,0,0,0.7)";

          const scoreColor = isActive
            ? "#fef9c3"
            : isWinner
            ? T.green
            : T.text;

          const scoreShadow = isActive
            ? "0 0 10px rgba(250,204,21,0.9), 0 0 25px rgba(234,179,8,0.7)"
            : isWinner
            ? "0 0 10px rgba(34,197,94,0.7)"
            : "none";

          return (
            <div
              key={p.id}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 16,
                background: bg,
                border,
                boxShadow: glow,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                transition: "all 0.15s ease",
              }}
            >
              {renderAvatarCircle(prof, {
                selected: isActive || isWinner,
                size: 42,
              })}

              <div
                style={{
                  flex: 1,
                  textAlign: "right",
                  fontSize: 26,
                  fontWeight: 900,
                  color: scoreColor,
                  textShadow: scoreShadow,
                }}
              >
                {p.score}
              </div>
            </div>
          );
        })}
      </div>

      {/* TABLEAU MARQUES :
          - si 2 joueurs : P1 | cible | P2 (cibles au milieu)
          - sinon : layout multi-colonnes classique
      */}
      <div
        style={{
          borderRadius: 16,
          background: T.card,
          border: `1px solid ${T.borderSoft}`,
          padding: 10,
          marginBottom: 12,
        }}
      >
        {state.players.length === 2 ? (
          <>
            {/* entêtes P1 | cible | P2 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 70px 1fr",
                gap: 8,
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              {state.players.map((p, idx) => {
                const isActive = p.id === currentPlayer.id;
                const align = idx === 0 ? "right" : "left";
                return (
                  <div
                    key={p.id}
                    style={{
                      gridColumn: idx === 0 ? 1 : 3,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      textAlign: align as any,
                      color: isActive ? T.gold : T.textSoft,
                      textShadow: isActive
                        ? "0 0 8px rgba(246,194,86,0.7)"
                        : "none",
                      padding: "2px 0",
                      borderBottom: isActive
                        ? `2px solid rgba(246,194,86,0.8)`
                        : "2px solid transparent",
                    }}
                  >
                    {p.name}
                  </div>
                );
              })}

              <div />
            </div>

            {CRICKET_TARGETS.map((target) => {
              const label = target === 25 ? "Bull" : String(target);
              return (
                <div
                  key={target}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 70px 1fr",
                    gap: 8,
                    alignItems: "center",
                    padding: "5px 0",
                    borderTop: `1px solid rgba(255,255,255,0.04)`,
                  }}
                >
                  {/* Joueur 1 */}
                  <MarkCell
                    marks={state.players[0].marks[target]}
                    playerIndex={0}
                    isActive={state.players[0].id === currentPlayer.id}
                  />

                  {/* Cible au centre */}
                  <div
                    style={{
                      fontSize: label === "Bull" ? 16 : 18,
                      fontWeight: 900,
                      textAlign: "center",
                      color: "#fef3c7",
                      textShadow:
                        "0 0 6px rgba(250,204,21,0.8), 0 0 16px rgba(234,179,8,0.8)",
                      letterSpacing: 1,
                      padding: "2px 0",
                      borderLeft: `1px solid rgba(148,163,184,0.5)`,
                      borderRight: `1px solid rgba(148,163,184,0.5)`,
                    }}
                  >
                    {label}
                  </div>

                  {/* Joueur 2 */}
                  <MarkCell
                    marks={state.players[1].marks[target]}
                    playerIndex={1}
                    isActive={state.players[1].id === currentPlayer.id}
                  />
                </div>
              );
            })}
          </>
        ) : (
          <>
            {/* layout multi-colonnes (3-4 joueurs) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `70px repeat(${state.players.length}, 1fr)`,
                gap: 8,
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <div />
              {state.players.map((p) => {
                const isActive = p.id === currentPlayer.id;
                return (
                  <div
                    key={p.id}
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      textAlign: "center",
                      color: isActive ? T.gold : T.textSoft,
                      textShadow: isActive
                        ? "0 0 8px rgba(246,194,86,0.7)"
                        : "none",
                      padding: "2px 0",
                      borderBottom: isActive
                        ? `2px solid rgba(246,194,86,0.8)`
                        : "2px solid transparent",
                    }}
                  >
                    {p.name}
                  </div>
                );
              })}
            </div>

            {CRICKET_TARGETS.map((target) => {
              const label = target === 25 ? "Bull" : String(target);
              return (
                <div
                  key={target}
                  style={{
                    display: "grid",
                    gridTemplateColumns: `70px repeat(${state.players.length}, 1fr)`,
                    gap: 8,
                    alignItems: "center",
                    padding: "5px 0",
                    borderTop: `1px solid rgba(255,255,255,0.04)`,
                  }}
                >
                  <div
                    style={{
                      fontSize: label === "Bull" ? 16 : 18,
                      fontWeight: 900,
                      textAlign: "center",
                      color: "#fef3c7",
                      textShadow:
                        "0 0 6px rgba(250,204,21,0.8), 0 0 16px rgba(234,179,8,0.8)",
                      letterSpacing: 1,
                      padding: "2px 0",
                      borderRight: `1px solid rgba(148,163,184,0.5)`,
                    }}
                  >
                    {label}
                  </div>

                  {state.players.map((p, idx) => (
                    <MarkCell
                      key={p.id}
                      marks={p.marks[target]}
                      playerIndex={idx}
                      isActive={p.id === currentPlayer.id}
                    />
                  ))}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* MULTIPLIERS (style pill façon keypad X01) */}
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
                background: active
                  ? "linear-gradient(135deg,#ffc63a,#ffaf00)"
                  : "#1B1F30",
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

      {/* BOUTONS CIBLES 20–15 + Bull (style keypad) */}
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
                  : "linear-gradient(135deg,#1f2937,#020617)",
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
