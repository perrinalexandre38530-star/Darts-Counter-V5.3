// ============================================
// src/pages/CricketPlay.tsx
// Mode Cricket — profils réels + tableau centré
// - Setup : sélection 2 à 4 profils + options simples
// - Play  : tableau Cricket (20..15 + Bull) avec colonnes centrées
// - Keypad 0..20 (3 × 7) + bouton BULL
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
import {
  DartIconColorizable,
  CricketMarkIcon,
} from "../components/MaskIcon";

const T = {
  bg: "#050712",
  card: "#121420",
  text: "#FFFFFF",
  textSoft: "rgba(255,255,255,0.7)",
  gold: "#F6C256",
  borderSoft: "rgba(255,255,255,0.08)",
};

// Couleurs d’accent par joueur (1 à 4)
// 1 : doré / 2 : rose / 3 : vert / 4 : bleu clair
const ACCENTS = ["#fbbf24", "#f472b6", "#22c55e", "#38bdf8"];

type Phase = "setup" | "play";
type ScoreMode = "points" | "no-points";
type HitMode = "S" | "D" | "T";

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
  const [rotateFirstPlayer, setRotateFirstPlayer] =
    React.useState<boolean>(true);

  // ---- Match en cours (phase PLAY) ----
  const [state, setState] = React.useState<CricketState | null>(null);
  const [hitMode, setHitMode] = React.useState<HitMode>("S");

  const currentPlayer =
    state && state.players[state.currentPlayerIndex]
      ? state.players[state.currentPlayerIndex]
      : null;

  const isFinished = !!state?.winnerId;

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
    setHitMode("S");
    playSound("start");
  }

  // --------------------------------------------------
  // PLAY : moteur / actions
  // --------------------------------------------------

  function registerHit(target: CricketTarget) {
    if (!state || !currentPlayer) return;
    if (state.winnerId) return;

    let mult: Multiplier = 1;
    if (hitMode === "D") mult = 2;
    if (hitMode === "T") mult = 3;

    const next = applyCricketHit(state, target, mult);
    setState(next);
    playSound("ok");
  }

  function handleKeyPress(value: number) {
    if (!state || !currentPlayer) return;
    if (state.winnerId) return;

    // 0..20 = valeur de fléchette, Cricket n'utilise que 15..20 pour les marks
    const target = value as CricketTarget;
    registerHit(target);
  }

  function handleBull() {
    if (!state || !currentPlayer) return;
    if (state.winnerId) return;
    // 25 = Bull, multiplicateur selon hitMode (S/D/T)
    registerHit(25 as CricketTarget);
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
    setHitMode("S");
    playSound("start");
  }

  function handleQuit() {
    setState(null);
    setPhase("setup");
    setHitMode("S");
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

  const totalDartsPerTurn = 3;
  const thrown = Math.max(
    0,
    Math.min(totalDartsPerTurn, totalDartsPerTurn - state.remainingDarts)
  );

  const activePlayerIndex = state.players.findIndex(
    (p) => p.id === currentPlayer.id
  );
  const activeAccent =
    ACCENTS[activePlayerIndex >= 0 ? activePlayerIndex : 0];

  // Palette pour cartes joueurs (fond)
  const playerCardColors = ["#1f2937", "#2d1b2f", "#052e16", "#082f49"];

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
    const hasMarks = marks > 0;

    return (
      <div
        style={{
          height: 26,
          borderRadius: 10,
          background: "rgba(15,23,42,0.95)", // fond sombre fixe
          border: hasMarks
            ? `1px solid ${accent}`
            : `1px solid rgba(148,163,184,0.5)`,
          boxShadow:
            hasMarks && isActive
              ? `0 0 14px ${accent}aa`
              : hasMarks
              ? `0 0 6px ${accent}55`
              : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2px 0",
          transition: "all 0.12s ease",
        }}
      >
        {hasMarks && (
          <CricketMarkIcon
            marks={marks}
            color={accent}
            size={18}
            glow={isActive}
          />
        )}
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

          {/* 3 fléchettes (PNG masqué, pointe vers le bas, aura couleur joueur actif) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {Array.from({ length: totalDartsPerTurn }).map((_, i) => {
              const active = i < thrown;
              return (
                <div
                  key={i}
                  style={{
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <DartIconColorizable
                    color={activeAccent}
                    active={active}
                    size={30}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CARTES JOUEURS : avatar + score (pas de noms) */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {state.players.map((p, idx) => {
          const isActive = p.id === currentPlayer.id;
          const isWinnerPlayer = p.id === state.winnerId;
          const prof = profileById.get(p.id) ?? null;
          const accent = ACCENTS[idx % ACCENTS.length];
          const baseColor = playerCardColors[idx % playerCardColors.length];

          const bg = isActive
            ? "linear-gradient(135deg,#111827,#020617)"
            : baseColor;
          const border = isActive
            ? `1px solid ${accent}`
            : `1px solid ${T.borderSoft}`;
          const glow = isActive
            ? `0 0 22px ${accent}80`
            : "0 0 6px rgba(0,0,0,0.7)";

          const scoreColor = isActive
            ? "#fef9c3"
            : isWinnerPlayer
            ? accent
            : T.text;

          const scoreShadow = isActive
            ? `0 0 10px ${accent}cc, 0 0 25px ${accent}80`
            : isWinnerPlayer
            ? `0 0 10px ${accent}aa`
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
                selected: isActive || isWinnerPlayer,
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
          - 2 joueurs : P1 | cible | P2
          - 4 joueurs : P1,P2 | cible | P3,P4
          - sinon : layout multi-col classique
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
            {CRICKET_TARGETS.map((target) => {
              const label = target === 25 ? "Bull" : String(target);
              return (
                <div
                  key={target}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 40px 1fr",
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
        ) : state.players.length === 4 ? (
          <>
            {CRICKET_TARGETS.map((target) => {
              const label = target === 25 ? "Bull" : String(target);
              return (
                <div
                  key={target}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 40px 1fr 1fr",
                    gap: 8,
                    alignItems: "center",
                    padding: "5px 0",
                    borderTop: `1px solid rgba(255,255,255,0.04)`,
                  }}
                >
                  {/* J1 / J2 à gauche */}
                  <MarkCell
                    marks={state.players[0].marks[target]}
                    playerIndex={0}
                    isActive={state.players[0].id === currentPlayer.id}
                  />
                  <MarkCell
                    marks={state.players[1].marks[target]}
                    playerIndex={1}
                    isActive={state.players[1].id === currentPlayer.id}
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

                  {/* J3 / J4 à droite */}
                  <MarkCell
                    marks={state.players[2].marks[target]}
                    playerIndex={2}
                    isActive={state.players[2].id === currentPlayer.id}
                  />
                  <MarkCell
                    marks={state.players[3].marks[target]}
                    playerIndex={3}
                    isActive={state.players[3].id === currentPlayer.id}
                  />
                </div>
              );
            })}
          </>
        ) : (
          <>
            {/* fallback 3 joueurs : cible à gauche, colonnes joueurs à droite */}
            {CRICKET_TARGETS.map((target) => {
              const label = target === 25 ? "Bull" : String(target);
              return (
                <div
                  key={target}
                  style={{
                    display: "grid",
                    gridTemplateColumns: `40px repeat(${state.players.length}, 1fr)`,
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

      {/* MULTIPLIERS : SIMPLE / DOUBLE / TRIPLE */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {[
          { label: "Simple", mode: "S" as HitMode },
          { label: "Double", mode: "D" as HitMode },
          { label: "Triple", mode: "T" as HitMode },
        ].map((btn, idx) => {
          const active = hitMode === btn.mode;
          const accent = ACCENTS[idx % ACCENTS.length];

          return (
            <button
              key={btn.mode}
              onClick={() => setHitMode(btn.mode)}
              style={{
                flex: 1,
                padding: "9px 12px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1.1,
                background: active
                  ? `linear-gradient(135deg,${accent},${accent}aa)`
                  : "#111827",
                color: active ? "#020617" : "#e5e7eb",
                boxShadow: active
                  ? `0 0 18px ${accent}80`
                  : "0 0 0 rgba(0,0,0,0)",
                transition: "all 0.12s ease",
              }}
            >
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* CLAVIER 0–20 : 3 lignes × 7 colonnes */}
      <div
        style={{
          borderRadius: 20,
          background: "#050816",
          border: `1px solid ${T.borderSoft}`,
          padding: 10,
          marginBottom: 10,
          boxShadow: "0 0 24px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(0,1fr))",
            gap: 8,
          }}
        >
          {Array.from({ length: 21 }).map((_, value) => (
            <button
              key={value}
              onClick={() => handleKeyPress(value)}
              style={{
                padding: "11px 0",
                borderRadius: 16,
                border: "none",
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 700,
                background: "linear-gradient(135deg,#111827,#020617)",
                color: "#f9fafb",
                boxShadow: "0 0 14px rgba(0,0,0,0.65)",
              }}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {/* BOUTON BULL séparé (25 / 50 avec DOUBLE) */}
      <div
        style={{
          marginBottom: 12,
        }}
      >
        <button
          onClick={handleBull}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 999,
            border: "none",
            background: "linear-gradient(135deg,#22c55e,#16a34a)",
            color: "#02120a",
            fontSize: 14,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 1.2,
            cursor: "pointer",
            boxShadow: "0 0 18px rgba(34,197,94,0.6)",
          }}
        >
          Bull
        </button>
      </div>

      {/* BAS : ANNULER / (QUITTER) / VALIDER ou REJOUER */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {/* ANNULER LAST DART */}
        <button
          onClick={handleUndo}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 999,
            border: "none",
            background: "linear-gradient(135deg,#4b5563,#111827)",
            color: "#e5e7eb",
            fontSize: 14,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1.1,
            cursor: "pointer",
          }}
        >
          Annuler
        </button>

        {/* QUITTER visible seulement si fini */}
        {isFinished && (
          <button
            onClick={handleQuit}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 999,
              border: "none",
              background: "linear-gradient(135deg,#ef4444,#b91c1c)",
              color: "#fef2f2",
              fontSize: 14,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.1,
              cursor: "pointer",
            }}
          >
            Quitter
          </button>
        )}

        {/* VALIDER / REJOUER */}
        <button
          onClick={isFinished ? handleNewLeg : () => {}}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 999,
            border: "none",
            background: "linear-gradient(135deg,#ffc63a,#ffaf00)",
            color: "#211500",
            fontSize: 14,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1.1,
            cursor: "pointer",
          }}
        >
          {isFinished ? "Rejouer" : "Valider"}
        </button>
      </div>
    </div>
  );
}
