// =============================================================
// src/pages/X01ConfigV3.tsx
// Paramètres X01 V3 — style "Cricket params" + gestion d'équipes
// =============================================================

import React from "react";
import type { X01ConfigV3 } from "../types/x01v3";
import type { Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";

type MatchModeV3 = "solo" | "multi" | "teams";
type InModeV3 = "simple" | "double" | "master";
type OutModeV3 = "simple" | "double" | "master";
type ServiceModeV3 = "random" | "alternate";

type TeamId = "gold" | "pink" | "blue" | "green";

type Props = {
  profiles: Profile[];
  onBack: () => void;
  onStart: (cfg: X01ConfigV3) => void;
};

const START_SCORES: Array<301 | 501 | 701 | 901> = [301, 501, 701, 901];
const LEGS_OPTIONS = [1, 3, 5, 7, 9, 11, 13];
const SETS_OPTIONS = [1, 3, 5, 7, 9, 11, 13];

const TEAM_LABELS: Record<TeamId, string> = {
  gold: "Team Gold",
  pink: "Team Pink",
  blue: "Team Blue",
  green: "Team Green",
};

const TEAM_COLORS: Record<TeamId, string> = {
  gold: "#f7c85c",
  pink: "#ff4fa2",
  blue: "#4fc3ff",
  green: "#6dff7c",
};

export default function X01ConfigV3({ profiles, onBack, onStart }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  // ---- état local des paramètres ----
  const [startScore, setStartScore] =
    React.useState<301 | 501 | 701 | 901>(501);
  const [inMode, setInMode] = React.useState<InModeV3>("simple");
  const [outMode, setOutMode] = React.useState<OutModeV3>("double");
  const [legsPerSet, setLegsPerSet] = React.useState<number>(3);
  const [setsToWin, setSetsToWin] = React.useState<number>(1);
  const [serveMode, setServeMode] =
    React.useState<ServiceModeV3>("alternate");
  const [matchMode, setMatchMode] = React.useState<MatchModeV3>("solo");

  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => {
    if (!profiles.length) return [];
    if (profiles.length === 1) return [profiles[0].id];
    return [profiles[0].id, profiles[1].id];
  });

  // playerId -> teamId
  const [teamAssignments, setTeamAssignments] = React.useState<
    Record<string, TeamId | null>
  >({});

  // ---- helpers sélection joueurs ----
  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];

      // nettoie l'affectation d'équipe si on retire un joueur
      setTeamAssignments((prevTeams) => {
        if (!exists) return prevTeams;
        const clone = { ...prevTeams };
        delete clone[id];
        return clone;
      });

      return next;
    });
  }

  function setPlayerTeam(playerId: string, teamId: TeamId) {
    setTeamAssignments((prev) => {
      const current = prev[playerId] ?? null;
      const next = { ...prev };
      // re-click sur la même team => désaffectation
      next[playerId] = current === teamId ? null : teamId;
      return next;
    });
  }

  // ---- conditions pour pouvoir démarrer ----
  const canStart = React.useMemo(() => {
    if (selectedIds.length === 0) return false;
    if (matchMode === "solo") {
      return selectedIds.length === 2;
    }
    if (matchMode === "multi") {
      return selectedIds.length >= 2;
    }
    // teams : on fera la validation fine au moment de handleStart
    return selectedIds.length >= 4; // au moins 4 joueurs pour faire des équipes
  }, [selectedIds, matchMode]);

  // ---- validation mode équipes ----
  function validateTeams() {
    const teamBuckets: Record<TeamId, string[]> = {
      gold: [],
      pink: [],
      blue: [],
      green: [],
    };

    selectedIds.forEach((pid) => {
      const tId = teamAssignments[pid];
      if (tId) {
        teamBuckets[tId].push(pid);
      }
    });

    const usedTeams = (Object.keys(teamBuckets) as TeamId[]).filter(
      (tid) => teamBuckets[tid].length > 0
    );

    if (usedTeams.length < 2) {
      alert(
        t(
          "x01v3.teams.needTwoTeams",
          "Sélectionne au moins 2 équipes (Gold / Pink / Blue / Green)."
        )
      );
      return null;
    }

    const sizes = Array.from(
      new Set(usedTeams.map((tid) => teamBuckets[tid].length))
    ).filter((n) => n > 0);

    if (sizes.length !== 1) {
      alert(
        t(
          "x01v3.teams.sameSize",
          "Toutes les équipes doivent avoir le même nombre de joueurs."
        )
      );
      return null;
    }

    const size = sizes[0];
    const teamCount = usedTeams.length;

    // Combos autorisés :
    // 2 équipes : 2v2, 3v3, 4v4
    // 3 équipes : 2v2v2
    // 4 équipes : 2v2v2v2
    const ok =
      (teamCount === 2 && (size === 2 || size === 3 || size === 4)) ||
      (teamCount === 3 && size === 2) ||
      (teamCount === 4 && size === 2);

    if (!ok) {
      alert(
        t(
          "x01v3.teams.invalidCombo",
          "Combinaisons autorisées : 2v2 / 3v3 / 4v4, 2v2v2 ou 2v2v2v2."
        )
      );
      return null;
    }

    return usedTeams.map((tid) => ({
      id: tid,
      name: TEAM_LABELS[tid],
      color: TEAM_COLORS[tid],
      playerIds: teamBuckets[tid],
    }));
  }

  // ---- validation & lancement ----
  function handleStart() {
    if (!canStart) {
      if (selectedIds.length === 0) {
        alert(
          t(
            "x01v3.config.needPlayer",
            "Sélectionne au moins un joueur local."
          )
        );
        return;
      }
      if (matchMode === "solo" && selectedIds.length !== 2) {
        alert(
          t(
            "x01v3.config.needTwoPlayersSolo",
            "En mode Solo (1v1), sélectionne exactement 2 joueurs."
          )
        );
        return;
      }
      if (selectedIds.length < 2) {
        alert(
          t(
            "x01v3.config.needTwoPlayers",
            "Sélectionne au moins 2 joueurs pour ce mode."
          )
        );
        return;
      }
    }

    let teams: null | Array<{
      id: TeamId;
      name: string;
      color: string;
      playerIds: string[];
    }> = null;

    if (matchMode === "teams") {
      teams = validateTeams();
      if (!teams) return; // validation échouée
    }

    const players = selectedIds
      .map((id) => profiles.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => ({
        id: p!.id,
        name: p!.name,
        avatarDataUrl: p!.avatarDataUrl ?? null,
      }));

    const baseCfg: any = {
      id: `x01v3-${Date.now()}`,
      startScore,
      inMode,
      outMode,
      legsPerSet,
      setsToWin,
      serveMode,
      matchMode,
      players,
      createdAt: Date.now(),
    };

    if (matchMode === "teams" && teams) {
      // @ts-expect-error: champ "teams" prévu pour l’extension du moteur
      baseCfg.teams = teams;
    }

    const cfg: X01ConfigV3 = baseCfg as X01ConfigV3;

    try {
      onStart(cfg);
    } catch (e) {
      console.warn("[X01ConfigV3] onStart a échoué :", e);
    }
  }

  // ---- Style / thème ----
  const primary = theme?.primary ?? "#f7c85c";
  const primarySoft = theme?.primarySoft ?? "rgba(247,200,92,0.16)";
  const textMain = theme?.text ?? "#f5f5ff";
  const cardBg = "rgba(10, 12, 24, 0.96)";

  // ---- UI style Cricket ----
  return (
    <div
      className="screen x01-config-v3-screen"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        padding: "12px 12px 76px",
        background:
          "radial-gradient(circle at top, #15192c 0, #05060c 50%, #020308 100%)",
        color: textMain,
      }}
    >
      {/* HEADER */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 8,
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            border: "none",
            background: "transparent",
            color: "#f5f5f5",
            padding: "6px 4px",
            fontSize: 14,
          }}
        >
          ← {t("x01v3.config.back", "Retour")}
        </button>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 1,
              color: primary,
            }}
          >
            X01
          </div>
          <div
            style={{
              fontSize: 12,
              opacity: 0.7,
              color: "#d9d9e4",
            }}
          >
            {t(
              "x01v3.config.subtitle",
              "Configure ton match X01 avant de commencer."
            )}
          </div>
        </div>
      </header>

      {/* CONTENU SCROLLABLE */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingTop: 4,
          paddingBottom: 12,
        }}
      >
        {/* --------- BLOC JOUEURS (style Cricket) --------- */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: "12px 12px 4px",
            marginBottom: 12,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: `1px solid rgba(255,255,255,0.04)`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 600,
              color: "#9fa4c0",
              marginBottom: 8,
            }}
          >
            {t("x01v3.localPlayers", "Joueurs")}
          </div>

          {profiles.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: "#b3b8d0",
                marginBottom: 8,
              }}
            >
              {t(
                "x01v3.noProfiles",
                "Aucun profil local. Crée des joueurs dans le menu Profils."
              )}
            </p>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  overflowX: "auto",
                  paddingBottom: 8,
                  marginBottom: 4,
                }}
              >
                {profiles.map((p) => {
                  const active = selectedIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlayer(p.id)}
                      style={{
                        minWidth: 86,
                        borderRadius: 18,
                        padding: 8,
                        border: active
                          ? `1px solid ${primary}`
                          : "1px solid rgba(255,255,255,0.04)",
                        background: active ? primarySoft : "transparent",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        color: "#f5f5ff",
                      }}
                    >
                      <div style={{ position: "relative" }}>
                        <ProfileStarRing
                          size={56}
                          rank={p.rank ?? 1}
                          glowColor={primary}
                        >
                          <ProfileAvatar profile={p} size={44} />
                        </ProfileStarRing>
                        {active && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: -2,
                              right: -2,
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                              background: primary,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#111217",
                              boxShadow: "0 0 8px rgba(0,0,0,0.65)",
                            }}
                          >
                            ✓
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          maxWidth: 70,
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.name}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p
                style={{
                  fontSize: 11,
                  color: "#7c80a0",
                  marginBottom: 4,
                }}
              >
                {t(
                  "x01v3.playersHint",
                  "2 joueurs pour un duel, 3+ pour Multi ou Équipes."
                )}
              </p>
            </>
          )}
        </section>

        {/* --------- BLOC PARAMÈTRES DE BASE --------- */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: 12,
            marginBottom: 12,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: `1px solid rgba(255,255,255,0.04)`,
          }}
        >
          <h3
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 600,
              color: "#9fa4c0",
              marginBottom: 10,
            }}
          >
            {t("x01v3.baseParams", "Paramètres de base")}
          </h3>

          {/* Score de départ */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 12,
                color: "#c8cbe4",
                marginBottom: 6,
              }}
            >
              {t("x01v3.startScore", "Score de départ")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {START_SCORES.map((s) => (
                <PillButton
                  key={s}
                  label={String(s)}
                  active={startScore === s}
                  onClick={() => setStartScore(s)}
                  primary={primary}
                  primarySoft={primarySoft}
                />
              ))}
            </div>
          </div>

          {/* Mode d'entrée */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 12,
                color: "#c8cbe4",
                marginBottom: 6,
              }}
            >
              {t("x01v3.inMode", "Mode d'entrée")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("x01v3.in.simple", "Simple IN")}
                active={inMode === "simple"}
                onClick={() => setInMode("simple")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("x01v3.in.double", "Double IN")}
                active={inMode === "double"}
                onClick={() => setInMode("double")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("x01v3.in.master", "Master IN")}
                active={inMode === "master"}
                onClick={() => setInMode("master")}
                primary={primary}
                primarySoft={primarySoft}
              />
            </div>
          </div>

          {/* Mode de sortie */}
          <div>
            <div
              style={{
                fontSize: 12,
                color: "#c8cbe4",
                marginBottom: 6,
              }}
            >
              {t("x01v3.outMode", "Mode de sortie")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("x01v3.out.simple", "Simple OUT")}
                active={outMode === "simple"}
                onClick={() => setOutMode("simple")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("x01v3.out.double", "Double OUT")}
                active={outMode === "double"}
                onClick={() => setOutMode("double")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("x01v3.out.master", "Master OUT")}
                active={outMode === "master"}
                onClick={() => setOutMode("master")}
                primary={primary}
                primarySoft={primarySoft}
              />
            </div>
          </div>
        </section>

        {/* --------- BLOC FORMAT DU MATCH --------- */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: 12,
            marginBottom: 12,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: `1px solid rgba(255,255,255,0.04)`,
          }}
        >
          <h3
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 600,
              color: "#9fa4c0",
              marginBottom: 10,
            }}
          >
            {t("x01v3.format", "Format du match")}
          </h3>

          {/* Legs par set */}
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                fontSize: 12,
                color: "#c8cbe4",
                marginBottom: 6,
              }}
            >
              {t("x01v3.legsPerSet", "Manches par set")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {LEGS_OPTIONS.map((n) => (
                <PillButton
                  key={n}
                  label={String(n)}
                  active={legsPerSet === n}
                  onClick={() => setLegsPerSet(n)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
              ))}
            </div>
          </div>

          {/* Sets à gagner */}
          <div>
            <div
              style={{
                fontSize: 12,
                color: "#c8cbe4",
                marginBottom: 6,
              }}
            >
              {t("x01v3.setsToWin", "Sets à gagner")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SETS_OPTIONS.map((n) => (
                <PillButton
                  key={n}
                  label={String(n)}
                  active={setsToWin === n}
                  onClick={() => setSetsToWin(n)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
              ))}
            </div>
          </div>
        </section>

        {/* --------- BLOC SERVICE + MODE DE MATCH --------- */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: 12,
            marginBottom: 12,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: `1px solid rgba(255,255,255,0.04)`,
          }}
        >
          {/* Service / ordre de départ */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 12,
                color: "#c8cbe4",
                marginBottom: 6,
              }}
            >
              {t("x01v3.service", "Service / ordre de départ")}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <PillButton
                label={t("x01v3.service.random", "Aléatoire")}
                active={serveMode === "random"}
                onClick={() => setServeMode("random")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("x01v3.service.alternate", "Alterné (officiel)")}
                active={serveMode === "alternate"}
                onClick={() => setServeMode("alternate")}
                primary={primary}
                primarySoft={primarySoft}
              />
            </div>
          </div>

          {/* Mode de match */}
          <div>
            <div
              style={{
                fontSize: 12,
                color: "#c8cbe4",
                marginBottom: 6,
              }}
            >
              {t("x01v3.matchMode", "Mode de match")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("x01v3.mode.solo", "Solo (1v1)")}
                active={matchMode === "solo"}
                onClick={() => setMatchMode("solo")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("x01v3.mode.multi", "Multi (FFA)")}
                active={matchMode === "multi"}
                onClick={() => setMatchMode("multi")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("x01v3.mode.teams", "Équipes")}
                active={matchMode === "teams"}
                onClick={() => setMatchMode("teams")}
                primary={primary}
                primarySoft={primarySoft}
              />
            </div>
          </div>
        </section>

        {/* --------- BLOC COMPO ÉQUIPES (si mode teams) --------- */}
        {matchMode === "teams" && selectedIds.length >= 2 && (
          <section
            style={{
              background: cardBg,
              borderRadius: 18,
              padding: 12,
              marginBottom: 12,
              boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
              border: `1px solid rgba(255,255,255,0.04)`,
            }}
          >
            <h3
              style={{
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: 1,
                fontWeight: 600,
                color: "#9fa4c0",
                marginBottom: 6,
              }}
            >
              {t("x01v3.teams.title", "Composition des équipes")}
            </h3>
            <p
              style={{
                fontSize: 11,
                color: "#7c80a0",
                marginBottom: 10,
              }}
            >
              {t(
                "x01v3.teams.subtitle",
                "Assigne chaque joueur à une Team : Gold, Pink, Blue ou Green. Combos possibles : 2v2, 3v3, 4v4, 2v2v2, 2v2v2v2."
              )}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {selectedIds.map((pid) => {
                const p = profiles.find((pr) => pr.id === pid);
                if (!p) return null;
                const team = teamAssignments[pid] ?? null;
                return (
                  <div
                    key={pid}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        minWidth: 0,
                      }}
                    >
                      <ProfileAvatar profile={p} size={28} />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          maxWidth: 90,
                        }}
                      >
                        {p.name}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      {(["gold", "pink", "blue", "green"] as TeamId[]).map(
                        (tid) => (
                          <TeamPillButton
                            key={tid}
                            label={TEAM_LABELS[tid].replace("Team ", "")}
                            color={TEAM_COLORS[tid]}
                            active={team === tid}
                            onClick={() => setPlayerTeam(pid, tid)}
                          />
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* CTA collée en bas comme Cricket */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "8px 12px 10px",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.4), transparent)",
          backdropFilter: "blur(10px)",
        }}
      >
        <button
          type="button"
          onClick={handleStart}
          disabled={!canStart}
          style={{
            width: "100%",
            height: 46,
            borderRadius: 999,
            border: "none",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: 1,
            textTransform: "uppercase",
            background: canStart
              ? `linear-gradient(90deg, ${primary}, #ffe9a3)`
              : "rgba(120,120,120,0.5)",
            color: canStart ? "#151515" : "#2b2b2b",
            boxShadow: canStart
              ? "0 0 18px rgba(255, 207, 120, 0.65)"
              : "none",
            opacity: canStart ? 1 : 0.6,
          }}
        >
          {t("x01v3.start", "Lancer la partie")}
        </button>
      </div>
    </div>
  );
}

/* ------------------ Pills réutilisables ------------------ */

type PillProps = {
  label: string;
  active: boolean;
  onClick: () => void;
  primary: string;
  primarySoft: string;
  compact?: boolean;
};

function PillButton({
  label,
  active,
  onClick,
  primary,
  primarySoft,
  compact,
}: PillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: compact ? "4px 9px" : "6px 12px",
        border: active
          ? `1px solid ${primary}`
          : "1px solid rgba(255,255,255,0.07)",
        background: active ? primarySoft : "rgba(9,11,20,0.9)",
        color: active ? "#fdf9ee" : "#d0d3ea",
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        boxShadow: active ? "0 0 12px rgba(0,0,0,0.7)" : "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

type TeamPillProps = {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
};

function TeamPillButton({ label, color, active, onClick }: TeamPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: "3px 8px",
        border: active ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.07)",
        background: active ? color : "rgba(9,11,20,0.9)",
        color: active ? "#151515" : "#e5e7f8",
        fontSize: 11,
        fontWeight: 600,
        boxShadow: active ? `0 0 10px ${color}55` : "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
