// =============================================================
// src/pages/X01ConfigV3.tsx
// Paramètres X01 V3 — style "Cricket params" + gestion d'équipes
// + Sélection de BOTS IA créés dans Profils (go("create_bot"))
// =============================================================

import React from "react";
import type { X01ConfigV3 } from "../types/x01v3";
import type { Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ProfileAvatar from "../components/ProfileAvatar";

type MatchModeV3 = "solo" | "multi" | "teams";
type InModeV3 = "simple" | "double" | "master";
type OutModeV3 = "simple" | "double" | "master";
type ServiceModeV3 = "random" | "alternate";

type TeamId = "gold" | "pink" | "blue" | "green";

type Props = {
  profiles: Profile[];
  onBack: () => void;
  onStart: (cfg: X01ConfigV3) => void;
  go?: (tab: any, params?: any) => void; // ✅ pour ouvrir "Créer BOT"
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

export default function X01ConfigV3({
  profiles,
  onBack,
  onStart,
  go,
}: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const allProfiles: Profile[] = profiles ?? [];
  const humanProfiles = allProfiles.filter((p) => !(p as any).isBot);
  const botProfiles = allProfiles.filter((p) => (p as any).isBot);

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
    if (humanProfiles.length >= 2)
      return [humanProfiles[0].id, humanProfiles[1].id];
    if (humanProfiles.length === 1) return [humanProfiles[0].id];
    return [];
  });

  // playerId -> teamId
  const [teamAssignments, setTeamAssignments] = React.useState<
    Record<string, TeamId | null>
  >({});

  // ---- helpers sélection joueurs (humains + bots) ----
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
      next[playerId] = current === teamId ? null : teamId;
      return next;
    });
  }

  const totalPlayers = selectedIds.length;

  // ---- conditions pour pouvoir démarrer ----
  const canStart = React.useMemo(() => {
    if (totalPlayers === 0) return false;
    if (matchMode === "solo") return totalPlayers === 2;
    if (matchMode === "multi") return totalPlayers >= 2;
    // mode équipes : au moins 4 joueurs
    return totalPlayers >= 4;
  }, [totalPlayers, matchMode]);

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
      if (tId) teamBuckets[tId].push(pid);
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

    const ok =
      (teamCount === 2 && (size === 2 || size === 3 || size === 4)) ||
      (teamCount === 3 && size === 2) ||
      (teamCount === 4 && size === 2);

    if (!ok) {
      alert(
        t(
          "x01v3.teams.invalidCombo",
          "Combinaisons autorisées : 2v2, 3v3, 4v4, 2v2v2 ou 2v2v2v2."
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
      if (totalPlayers === 0) {
        alert(
          t(
            "x01v3.config.needPlayer",
            "Sélectionne au moins un joueur local."
          )
        );
        return;
      }
      if (matchMode === "solo" && totalPlayers !== 2) {
        alert(
          t(
            "x01v3.config.needTwoPlayersSolo",
            "En mode Solo (1v1), sélectionne exactement 2 joueurs."
          )
        );
        return;
      }
      if (totalPlayers < 2) {
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
      if (!teams) return;
    }

    const players = selectedIds
      .map((id) => allProfiles.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => ({
        id: p!.id,
        name: p!.name,
        avatarDataUrl: (p as any).avatarDataUrl ?? null,
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
      // @ts-expect-error champ "teams" prévu pour l’extension du moteur
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
          marginBottom: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <button
            type="button"
            onClick={onBack}
            style={{
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(10,12,24,0.9)",
              color: "#f5f5f5",
              padding: "5px 10px",
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            <span>{t("x01v3.config.back", "Retour")}</span>
          </button>
        </div>
        <div
          style={{
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: 2,
              color: primary,
              textTransform: "uppercase",
            }}
          >
            X01
          </div>
          <div
            style={{
              fontSize: 12,
              opacity: 0.7,
              color: "#d9d9e4",
              marginTop: 2,
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
        {/* --------- BLOC JOUEURS (HUMAINS) --------- */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: "20px 12px 16px",
            marginBottom: 16,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 700,
              color: primary,
              marginBottom: 10,
            }}
          >
            {t("x01v3.localPlayers", "Joueurs")}
          </div>

          {humanProfiles.length === 0 ? (
            <p
              style={{ fontSize: 13, color: "#b3b8d0", marginBottom: 8 }}
            >
              {t(
                "x01v3.noProfiles",
                "Aucun profil local. Tu peux créer des joueurs et des BOTS dans le menu Profils."
              )}
            </p>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 18,
                  overflowX: "auto",
                  paddingBottom: 12,
                  marginBottom: 6,
                  justifyContent:
                    humanProfiles.length <= 4 ? "center" : "flex-start",
                }}
              >
                {humanProfiles.map((p) => {
                  const active = selectedIds.includes(p.id);

                  const teamId =
                    matchMode === "teams"
                      ? (teamAssignments[p.id] as TeamId | null) ?? null
                      : null;
                  const haloColor = teamId ? TEAM_COLORS[teamId] : primary;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlayer(p.id)}
                      style={{
                        minWidth: 90,
                        maxWidth: 90,
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 78,
                          height: 78,
                          borderRadius: "50%",
                          overflow: "hidden",
                          boxShadow: active
                            ? `0 0 28px ${haloColor}aa`
                            : "0 0 14px rgba(0,0,0,0.65)",
                          background: active
                            ? `radial-gradient(circle at 30% 20%, #fff8d0, ${haloColor})`
                            : "#111320",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            overflow: "hidden",
                            filter: active
                              ? "none"
                              : "grayscale(100%) brightness(0.55)",
                            opacity: active ? 1 : 0.6,
                            transition:
                              "filter 0.2s ease, opacity 0.2s ease",
                          }}
                        >
                          <ProfileAvatar profile={p} size={78} />
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          textAlign: "center",
                          color: active ? "#f6f2e9" : "#7e8299",
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
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
                style={{ fontSize: 11, color: "#7c80a0", marginBottom: 0 }}
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
              fontWeight: 700,
              color: primary,
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
              fontWeight: 700,
              color: primary,
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
                label={t(
                  "x01v3.service.alternate",
                  "Alterné (officiel)"
                )}
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
        {matchMode === "teams" && totalPlayers >= 2 && (
          <TeamsSection
            profiles={allProfiles}
            selectedIds={selectedIds}
            teamAssignments={teamAssignments}
            setPlayerTeam={setPlayerTeam}
          />
        )}

        {/* --------- BLOC BOTS IA --------- */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: 12,
            marginBottom: 80,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: `1px solid rgba(255,255,255,0.04)`,
          }}
        >
          <h3
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 700,
              color: primary,
              marginBottom: 10,
            }}
          >
            {t("x01v3.bots.title", "Bots IA")}
          </h3>

          {botProfiles.length === 0 ? (
            <>
              <p
                style={{
                  fontSize: 12,
                  color: "#b3b8d0",
                  marginBottom: 12,
                }}
              >
                {t(
                  "x01v3.bots.none",
                  "Aucun BOT IA pour l’instant. Tu peux en créer dans le menu Profils."
                )}
              </p>

              <button
                type="button"
                onClick={() => go && go("create_bot")}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: `1px solid ${primary}`,
                  background: primarySoft,
                  color: primary,
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  cursor: "pointer",
                  width: "fit-content",
                  alignSelf: "flex-start",
                }}
              >
                {t("x01v3.bots.create", "Créer BOT")}
              </button>
            </>
          ) : (
            <>
              <p
                style={{
                  fontSize: 11,
                  color: "#7c80a0",
                  marginBottom: 10,
                }}
              >
                {t(
                  "x01v3.bots.subtitle",
                  "Sélectionne un ou plusieurs bots créés dans ton menu Profils. Ils joueront automatiquement selon leur niveau."
                )}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 14,
                  overflowX: "auto",
                  paddingBottom: 10,
                  marginBottom: 10,
                }}
                className="dc-scroll-thin"
              >
                {botProfiles.map((bot) => {
                  const active = selectedIds.includes(bot.id);
                  const level = (bot as any).botLevel as
                    | "easy"
                    | "medium"
                    | "hard"
                    | undefined;

                  return (
                    <button
                      key={bot.id}
                      type="button"
                      onClick={() => togglePlayer(bot.id)}
                      style={{
                        minWidth: 90,
                        maxWidth: 90,
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 78,
                          height: 78,
                          borderRadius: "50%",
                          overflow: "hidden",
                          boxShadow: active
                            ? `0 0 28px ${primary}aa`
                            : "0 0 14px rgba(0,0,0,0.65)",
                          background: active
                            ? `radial-gradient(circle at 30% 20%, #fff8d0, ${primary})`
                            : "#111320",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ProfileAvatar profile={bot} size={78} />
                      </div>

                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          textAlign: "center",
                          color: active ? "#f6f2e9" : "#7e8299",
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {bot.name}
                      </div>

                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          opacity: 0.7,
                          color: primary,
                        }}
                      >
                        {level
                          ? `BOT ${
                              level === "easy"
                                ? "EASY"
                                : level === "medium"
                                ? "MEDIUM"
                                : "HARD"
                            }`
                          : "BOT"}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => go && go("create_bot")}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: `1px solid ${primary}`,
                  background: "rgba(255,255,255,0.04)",
                  color: primary,
                  fontWeight: 600,
                  fontSize: 11,
                  textTransform: "uppercase",
                }}
              >
                {t("x01v3.bots.manage", "Créer BOT")}
              </button>
            </>
          )}
        </section>
      </div>

      {/* CTA collée au-dessus de la barre de nav */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 88,
          padding: "6px 12px 8px",
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>
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
    </div>
  );
}

/* --------- Sous-section équipes avec grissage intelligent --------- */

type TeamsSectionProps = {
  profiles: Profile[];
  selectedIds: string[];
  teamAssignments: Record<string, TeamId | null>;
  setPlayerTeam: (playerId: string, tid: TeamId) => void;
};

function TeamsSection({
  profiles,
  selectedIds,
  teamAssignments,
  setPlayerTeam,
}: TeamsSectionProps) {
  const { t } = useLang();
  const cardBg = "rgba(10, 12, 24, 0.96)";
  const totalPlayers = selectedIds.length;

  const counts: Record<TeamId, number> = {
    gold: 0,
    pink: 0,
    blue: 0,
    green: 0,
  };

  selectedIds.forEach((pid) => {
    const tId = teamAssignments[pid];
    if (tId) counts[tId]++;
  });

  const orderedTeams: TeamId[] = ["gold", "pink", "blue", "green"];

  const maxTeams =
    totalPlayers <= 4 ? 2 : totalPlayers <= 6 ? 3 : 4;

  const maxPerTeamBase =
    totalPlayers >= 8 ? 4 : totalPlayers >= 6 ? 3 : 2;

  const usedTeamsCount = orderedTeams.filter(
    (tid) => counts[tid] > 0
  ).length;

  const maxPerTeam = usedTeamsCount >= 3 ? 2 : maxPerTeamBase;

  return (
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
          "Assigne chaque joueur à une Team : Gold, Pink, Blue ou Green. Combos possibles : 2v2, 3v3, 4v4, 2v2v2 ou 2v2v2v2."
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
                {orderedTeams.map((tid, idx) => {
                  const allowedTeamSlot = idx < maxTeams;
                  const full =
                    counts[tid] >= maxPerTeam && team !== tid;

                  const disabled = !allowedTeamSlot || full;

                  return (
                    <TeamPillButton
                      key={tid}
                      label={TEAM_LABELS[tid].replace("Team ", "")}
                      color={TEAM_COLORS[tid]}
                      active={team === tid}
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) return;
                        setPlayerTeam(pid, tid);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
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
  disabled: boolean;
  onClick: () => void;
};

function TeamPillButton({
  label,
  color,
  active,
  disabled,
  onClick,
}: TeamPillProps) {
  const baseBg = active ? color : "rgba(9,11,20,0.9)";
  const baseColor = active ? "#151515" : "#e5e7f8";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        borderRadius: 999,
        padding: "3px 8px",
        border: disabled
          ? "1px solid rgba(255,255,255,0.06)"
          : active
          ? `1px solid ${color}`
          : "1px solid rgba(255,255,255,0.12)",
        background: disabled ? "rgba(40,42,60,0.6)" : baseBg,
        color: disabled ? "#777b92" : baseColor,
        fontSize: 11,
        fontWeight: 600,
        boxShadow:
          active && !disabled ? `0 0 10px ${color}55` : "none",
        whiteSpace: "nowrap",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}
