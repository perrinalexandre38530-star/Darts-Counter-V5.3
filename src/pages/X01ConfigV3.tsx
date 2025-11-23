// =============================================================
// src/pages/X01ConfigV3.tsx
// Paramètres X01 V3 (squelette fonctionnel)
// - Score de départ (301 / 501 / 701 / 901)
// - Mode d'entrée : simple / double / master in
// - Mode de sortie : simple / double / master out
// - Legs par set : 1 / 3 / 5 / 7 / 9 / 11 / 13
// - Sets à gagner : 1 / 3 / 5 / 7 / 9 / 11 / 13
// - Service : aléatoire / alterné
// - Mode de match : solo (1v1), multi (FFA), équipes (squelette pour plus tard)
// - Sélection de joueurs locaux
// - Bouton "Lancer la partie" qui appelle onStart(config)
// =============================================================

import React from "react";
import type { X01ConfigV3 } from "../types/x01v3";
import type { Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

type MatchModeV3 = "solo" | "multi" | "teams";
type InModeV3 = "simple" | "double" | "master";
type OutModeV3 = "simple" | "double" | "master";
type ServiceModeV3 = "random" | "alternate";

type Props = {
  profiles: Profile[];
  onBack: () => void;
  onStart: (cfg: X01ConfigV3) => void;
};

const START_SCORES: Array<301 | 501 | 701 | 901> = [301, 501, 701, 901];
const LEGS_OPTIONS = [1, 3, 5, 7, 9, 11, 13];
const SETS_OPTIONS = [1, 3, 5, 7, 9, 11, 13];

export default function X01ConfigV3({ profiles, onBack, onStart }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  // ---- état local des paramètres ----
  const [startScore, setStartScore] = React.useState<301 | 501 | 701 | 901>(501);
  const [inMode, setInMode] = React.useState<InModeV3>("simple");
  const [outMode, setOutMode] = React.useState<OutModeV3>("double");
  const [legsPerSet, setLegsPerSet] = React.useState<number>(3);
  const [setsToWin, setSetsToWin] = React.useState<number>(1);
  const [serviceMode, setServiceMode] =
    React.useState<ServiceModeV3>("alternate");
  const [matchMode, setMatchMode] = React.useState<MatchModeV3>("solo");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // ---- helpers sélection joueurs ----
  function togglePlayer(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // ---- validation & lancement ----
  function handleStart() {
    if (selectedIds.length === 0) {
      alert(
        t(
          "x01v3.config.needPlayer",
          "Sélectionne au moins un joueur local."
        )
      );
      return;
    }

    // pour l’instant : on considère les joueurs dans l’ordre choisi
    const players = selectedIds
      .map((id) => profiles.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => ({
        id: p!.id,
        name: p!.name,
        avatarDataUrl: p!.avatarDataUrl ?? null,
      }));

    const cfg: X01ConfigV3 = {
      // @ts-expect-error: on complète le reste dans le moteur
      id: `x01v3-${Date.now()}`,
      startScore,
      inMode,
      outMode,
      legsPerSet,
      setsToWin,
      serviceMode,
      matchMode,
      players,
      createdAt: Date.now(),
    } as any;

    try {
      onStart(cfg);
    } catch (e) {
      console.warn("[X01ConfigV3] onStart a échoué :", e);
    }
  }

  // ---- UI squelette (fonctionnel mais brut) ----
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        paddingBottom: 90,
        background: "#000",
        color: "#fff",
      }}
    >
      <button
        type="button"
        onClick={onBack}
        style={{
          marginBottom: 12,
          padding: "4px 10px",
          borderRadius: 6,
          border: "1px solid #666",
          background: "#111",
          color: "#eee",
          cursor: "pointer",
        }}
      >
        ← {t("x01v3.config.back", "Retour")}
      </button>

      <h1 style={{ marginTop: 0, marginBottom: 8 }}>
        {t("x01v3.config.title", "Paramètres X01")}
      </h1>
      <p style={{ marginTop: 0, marginBottom: 16 }}>
        {t(
          "x01v3.config.subtitle",
          "Configure ton match X01 avant de commencer."
        )}
      </p>

      {/* Score de départ */}
      <Section title={t("x01v3.startScore", "Score de départ")}>
        <Row>
          {START_SCORES.map((s) => (
            <ToggleButton
              key={s}
              active={startScore === s}
              onClick={() => setStartScore(s)}
            >
              {s}
            </ToggleButton>
          ))}
        </Row>
      </Section>

      {/* Mode d'entrée */}
      <Section title={t("x01v3.inMode", "Mode d'entrée")}>
        <Row>
          <ToggleButton
            active={inMode === "simple"}
            onClick={() => setInMode("simple")}
          >
            {t("x01v3.in.simple", "Simple IN")}
          </ToggleButton>
          <ToggleButton
            active={inMode === "double"}
            onClick={() => setInMode("double")}
          >
            {t("x01v3.in.double", "Double IN")}
          </ToggleButton>
          <ToggleButton
            active={inMode === "master"}
            onClick={() => setInMode("master")}
          >
            {t("x01v3.in.master", "Master IN")}
          </ToggleButton>
        </Row>
      </Section>

      {/* Mode de sortie */}
      <Section title={t("x01v3.outMode", "Mode de sortie")}>
        <Row>
          <ToggleButton
            active={outMode === "simple"}
            onClick={() => setOutMode("simple")}
          >
            {t("x01v3.out.simple", "Simple OUT")}
          </ToggleButton>
          <ToggleButton
            active={outMode === "double"}
            onClick={() => setOutMode("double")}
          >
            {t("x01v3.out.double", "Double OUT")}
          </ToggleButton>
          <ToggleButton
            active={outMode === "master"}
            onClick={() => setOutMode("master")}
          >
            {t("x01v3.out.master", "Master OUT")}
          </ToggleButton>
        </Row>
      </Section>

      {/* Format du match : legs / sets */}
      <Section title={t("x01v3.format", "Format du match")}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}>
            {t("x01v3.legsPerSet", "Manches par set")}
          </div>
          <Row>
            {LEGS_OPTIONS.map((n) => (
              <ToggleButton
                key={n}
                active={legsPerSet === n}
                onClick={() => setLegsPerSet(n)}
              >
                {n}
              </ToggleButton>
            ))}
          </Row>
        </div>
        <div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>
            {t("x01v3.setsToWin", "Sets à gagner")}
          </div>
          <Row>
            {SETS_OPTIONS.map((n) => (
              <ToggleButton
                key={n}
                active={setsToWin === n}
                onClick={() => setSetsToWin(n)}
              >
                {n}
              </ToggleButton>
            ))}
          </Row>
        </div>
      </Section>

      {/* Service / ordre de départ */}
      <Section title={t("x01v3.service", "Service / ordre de départ")}>
        <Row>
          <ToggleButton
            active={serviceMode === "random"}
            onClick={() => setServiceMode("random")}
          >
            {t("x01v3.service.random", "Aléatoire")}
          </ToggleButton>
          <ToggleButton
            active={serviceMode === "alternate"}
            onClick={() => setServiceMode("alternate")}
          >
            {t("x01v3.service.alternate", "Alterné (officiel)")}
          </ToggleButton>
        </Row>
      </Section>

      {/* Mode de match */}
      <Section title={t("x01v3.matchMode", "Mode de match")}>
        <Row>
          <ToggleButton
            active={matchMode === "solo"}
            onClick={() => setMatchMode("solo")}
          >
            {t("x01v3.mode.solo", "Solo (1v1)")}
          </ToggleButton>
          <ToggleButton
            active={matchMode === "multi"}
            onClick={() => setMatchMode("multi")}
          >
            {t("x01v3.mode.multi", "Multi (FFA)")}
          </ToggleButton>
          <ToggleButton
            active={matchMode === "teams"}
            onClick={() => setMatchMode("teams")}
          >
            {t("x01v3.mode.teams", "Équipes")}
          </ToggleButton>
        </Row>
      </Section>

      {/* Joueurs locaux */}
      <Section title={t("x01v3.localPlayers", "Joueurs locaux")}>
        {profiles.length === 0 ? (
          <p style={{ fontSize: 13 }}>
            {t(
              "x01v3.noProfiles",
              "Aucun profil local. Crée des joueurs dans le menu Profils."
            )}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {profiles.map((p) => {
              const selected = selectedIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlayer(p.id)}
                  style={{
                    textAlign: "left",
                    borderRadius: 8,
                    padding: "6px 10px",
                    border: selected
                      ? "1px solid #ffd34a"
                      : "1px solid #333",
                    background: selected ? "#222" : "#111",
                    color: "#eee",
                    cursor: "pointer",
                  }}
                >
                  {p.name || "—"}
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {/* Bouton Lancer */}
      <div style={{ marginTop: 20 }}>
        <button
          type="button"
          onClick={handleStart}
          disabled={selectedIds.length === 0}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 999,
            border: "none",
            background:
              selectedIds.length === 0
                ? "#555"
                : "linear-gradient(180deg,#ffc63a,#ffaf00)",
            color: selectedIds.length === 0 ? "#999" : "#000",
            fontWeight: 700,
            fontSize: 15,
            cursor: selectedIds.length === 0 ? "default" : "pointer",
          }}
        >
          {t("x01v3.start", "Lancer la partie")}
        </button>
      </div>
    </div>
  );
}

/* ===== Petits composants UI de base (squelette) ===== */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 16, margin: "0 0 6px" }}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "4px 10px",
        borderRadius: 6,
        border: active ? "1px solid #ffd34a" : "1px solid #555",
        background: active ? "#333" : "#111",
        color: "#eee",
        cursor: "pointer",
        fontSize: 13,
      }}
    >
      {children}
    </button>
  );
}
