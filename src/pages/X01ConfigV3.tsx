// =============================================================
// src/pages/X01ConfigV3.tsx
// Paramètres X01 V3 — style "Cricket params" + gestion d'équipes
// + Sélection de BOTS IA créés dans Profils (LS "dc_bots_v1")
// + Intégration de BOTS IA "pro" prédéfinis (Green Machine, Snake King…)
// + NEW : audio config (Sons Arcade / Bruitages / Voix IA + voix sélection)
// + NEW : Comptage externe (vidéo / bridge) + bouton "i" explicatif
// =============================================================

import React from "react";
import type { X01ConfigV3 } from "../types/x01v3";
import type { Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import {
  getDartSetsForProfile,
  getFavoriteDartSetForProfile,
  type DartSet,
} from "../lib/dartSetsStore";

// 🔽 IMPORTS DE TOUS LES AVATARS BOTS PRO
import avatarGreenMachine from "../assets/avatars/bots-pro/green-machine.png";
import avatarSnakeKing from "../assets/avatars/bots-pro/snake-king.png";
import avatarWonderKid from "../assets/avatars/bots-pro/wonder-kid.png";
import avatarIceMan from "../assets/avatars/bots-pro/ice-man.png";
import avatarFlyingScotsman from "../assets/avatars/bots-pro/flying-scotsman.png";
import avatarCoolHand from "../assets/avatars/bots-pro/cool-hand.png";
import avatarThePower from "../assets/avatars/bots-pro/the-power.png";
import avatarBullyBoy from "../assets/avatars/bots-pro/bully-boy.png";
import avatarTheAsp from "../assets/avatars/bots-pro/the-asp.png";
import avatarHollywood from "../assets/avatars/bots-pro/hollywood.png";
import avatarTheFerret from "../assets/avatars/bots-pro/the-ferret.png";

type MatchModeV3 = "solo" | "multi" | "teams";
type InModeV3 = "simple" | "double" | "master";
type OutModeV3 = "simple" | "double" | "master";
type ServiceModeV3 = "random" | "alternate";

type TeamId = "gold" | "pink" | "blue" | "green";

type Props = {
  profiles: Profile[];
  onBack: () => void;
  onStart: (cfg: X01ConfigV3) => void;
  go?: (tab: any, params?: any) => void; // pour ouvrir "Créer BOT"
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

// Clé locale BOTS (même que Profils>Bots)
const LS_BOTS_KEY = "dc_bots_v1";

// ---------- Audio / voix ----------
type VoiceOption = { id: string; label: string };

const VOICE_OPTIONS: VoiceOption[] = [
  { id: "default", label: "Défaut" },
  { id: "female", label: "Voix féminine" },
  { id: "male", label: "Voix masculine" },
  { id: "robot", label: "Voix robot" },
];

type BotLite = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  botLevel?: string; // libellé ("Easy", "Standard", "Pro", "Légende", etc.)
};

// -------------------------------------------------------------
// PlayerDartBadge
// - Petit badge "jeu de fléchettes" sous un joueur X01
// - Affiche l'image (plus tard) + nom du set
// - Chaque tap passe au set suivant (cycle)
// -------------------------------------------------------------
type PlayerDartBadgeProps = {
  profileId?: string | null;
  dartSetId?: string | null;
  onChange: (id: string | null) => void;
};

const PlayerDartBadge: React.FC<PlayerDartBadgeProps> = ({
  profileId,
  dartSetId,
  onChange,
}) => {
  const { palette } = useTheme();
  const { lang } = useLang();
  const primary = palette?.primary || "#f5c35b";

  const [sets, setSets] = React.useState<DartSet[]>([]);
  const [favorite, setFavorite] = React.useState<DartSet | null>(null);

  React.useEffect(() => {
    if (!profileId) {
      setSets([]);
      setFavorite(null);
      return;
    }
    const all = getDartSetsForProfile(profileId);
    setSets(all);
    setFavorite(getFavoriteDartSetForProfile(profileId) || null);
  }, [profileId]);

  // Pas de profil ou pas de set → pas de badge
  if (!profileId || sets.length === 0) return null;

  // Set courant : soit celui explicitement choisi, soit le préféré
  const explicit = dartSetId ? sets.find((s) => s.id === dartSetId) || null : null;
  const current = explicit || favorite || sets[0];

  const handleClick = () => {
    if (sets.length === 0 || !current) return;
    const idx = sets.findIndex((s) => s.id === current.id);
    const next = sets[(idx + 1) % sets.length];
    onChange(next.id); // on force un set explicite
  };

  const labelBase =
    lang === "fr"
      ? "Jeu de fléchettes"
      : lang === "es"
      ? "Juego de dardos"
      : lang === "de"
      ? "Dart-Set"
      : "Dart set";

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        marginTop: 6,
        alignSelf: "center",
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,.18)",
        background:
          "radial-gradient(circle at 0% 0%, rgba(245,195,91,.22), rgba(8,8,20,.96))",
        display: "flex",
        alignItems: "center",
        gap: 6,
        color: "#fff",
        fontSize: 10,
        maxWidth: 180,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      aria-label={labelBase}
      title={labelBase}
    >
      {/* Mini visuel fléchettes */}
      {(current as any)?.thumbImageUrl ? (
        <img
          src={(current as any).thumbImageUrl}
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            objectFit: "cover",
            boxShadow: "0 0 6px rgba(0,0,0,.9)",
          }}
        />
      ) : (
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: (current as any)?.bgColor || "#050509",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            boxShadow: "0 0 6px rgba(0,0,0,.9)",
            border: `1px solid rgba(245,195,91,.8)`,
          }}
        >
          🎯
        </div>
      )}

      {/* Nom du set UNIQUEMENT */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          overflow: "hidden",
        }}
      >
        {current.name}
      </span>
    </button>
  );
};

// ------------------------------------------------------
// BOTS IA "PRO" PRÉDÉFINIS (joueurs de référence, surnoms)
// ------------------------------------------------------
const PRO_BOTS: BotLite[] = [
  { id: "bot_pro_mvg", name: "Green Machine", botLevel: "Légende", avatarDataUrl: avatarGreenMachine },
  { id: "bot_pro_wright", name: "Snake King", botLevel: "Pro", avatarDataUrl: avatarSnakeKing },
  { id: "bot_pro_littler", name: "Wonder Kid", botLevel: "Prodige Pro", avatarDataUrl: avatarWonderKid },
  { id: "bot_pro_price", name: "Ice Man", botLevel: "Pro", avatarDataUrl: avatarIceMan },
  { id: "bot_pro_anderson", name: "Flying Scotsman", botLevel: "Pro", avatarDataUrl: avatarFlyingScotsman },
  { id: "bot_pro_humphries", name: "Cool Hand", botLevel: "Pro", avatarDataUrl: avatarCoolHand },
  { id: "bot_pro_taylor", name: "The Power", botLevel: "Légende", avatarDataUrl: avatarThePower },
  { id: "bot_pro_smith", name: "Bully Boy", botLevel: "Pro", avatarDataUrl: avatarBullyBoy },
  { id: "bot_pro_aspinall", name: "The Asp", botLevel: "Fort", avatarDataUrl: avatarTheAsp },
  { id: "bot_pro_dobey", name: "Hollywood", botLevel: "Fort", avatarDataUrl: avatarHollywood },
  { id: "bot_pro_clayton", name: "The Ferret", botLevel: "Fort", avatarDataUrl: avatarTheFerret },
];

// -------------------------------------------------------------
// Petit chip "Jeu de fléchettes" pour un joueur X01
// - Compact, une seule pastille cliquable
// - Chaque clic fait défiler : AUTO -> Set1 -> Set2 -> ... -> AUTO
// -------------------------------------------------------------
type PlayerDartChipProps = {
  profileId?: string | null;
  dartSetId?: string | null;
  onChange: (id: string | null) => void;
};

const PlayerDartChip: React.FC<PlayerDartChipProps> = ({
  profileId,
  dartSetId,
  onChange,
}) => {
  const { lang } = useLang();

  const [sets, setSets] = React.useState<DartSet[]>([]);
  const [favorite, setFavorite] = React.useState<DartSet | null>(null);

  React.useEffect(() => {
    if (!profileId) {
      setSets([]);
      setFavorite(null);
      return;
    }
    const all = getDartSetsForProfile(profileId);
    setSets(all);
    setFavorite(getFavoriteDartSetForProfile(profileId) || null);
  }, [profileId]);

  if (!profileId || sets.length === 0) return null;

  const currentIndex = dartSetId ? sets.findIndex((s) => s.id === dartSetId) : -1; // -1 = AUTO (préféré)

  const handleClick = () => {
    if (sets.length === 0) return;

    // N sets + 1 état AUTO
    const total = sets.length + 1;
    const nextIndex = (currentIndex + 1 + total) % total;

    if (nextIndex === 0) onChange(null);
    else onChange(sets[nextIndex - 1].id);
  };

  const isAuto = currentIndex === -1;
  const currentSet =
    isAuto && favorite ? favorite : sets.find((s) => s.id === dartSetId) || null;

  const autoText =
    lang === "fr" ? "AUTO · préf" : lang === "es" ? "AUTO · favorito" : lang === "de" ? "AUTO · Favorit" : "AUTO · fav";

  const text =
    isAuto && currentSet ? `${autoText} · ${currentSet.name}` : currentSet ? currentSet.name : autoText;

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        marginTop: 6,
        alignSelf: "center",
        padding: "4px 10px",
        borderRadius: 999,
        border: `1px solid rgba(255,255,255,.14)`,
        background: isAuto
          ? "radial-gradient(circle at 0% 0%, rgba(245,195,91,.3), rgba(10,10,22,.95))"
          : "radial-gradient(circle at 0% 0%, rgba(127,226,169,.32), rgba(6,24,16,.96))",
        display: "flex",
        alignItems: "center",
        gap: 6,
        color: "#fff",
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: 1.4,
        maxWidth: 170,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <span style={{ fontSize: 13 }}>🎯</span>
      <span style={{ opacity: 0.9 }}>{text}</span>
    </button>
  );
};

export default function X01ConfigV3({ profiles, onBack, onStart, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const allProfiles: Profile[] = profiles ?? [];
  const humanProfiles = allProfiles.filter((p) => !(p as any).isBot);

  // ---- BOTS depuis localStorage (fallback si pas dans store.profiles) ----
  const [botsFromLS, setBotsFromLS] = React.useState<BotLite[]>([]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LS_BOTS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as any[];

      const mapped: BotLite[] = parsed.map((b) => {
        const levelLabel: string =
          b.botLevel ??
          b.levelLabel ??
          b.levelName ??
          b.performanceLevel ??
          b.performance ??
          b.skill ??
          b.difficulty ??
          "";

        return {
          id: b.id,
          name: b.name || "BOT",
          avatarDataUrl: b.avatarDataUrl ?? null,
          botLevel: levelLabel,
        };
      });

      setBotsFromLS(mapped);
    } catch (e) {
      console.warn("[X01ConfigV3] load BOTS LS failed:", e);
    }
  }, []);

  // Bots créés dans le store (Profils) marqués isBot
  const userBotsFromStore: BotLite[] = React.useMemo(() => {
    return (allProfiles || [])
      .filter((p) => (p as any).isBot)
      .map((p: any) => ({
        id: p.id,
        name: p.name || "BOT",
        avatarDataUrl: p.avatarDataUrl ?? null,
        botLevel:
          p.botLevel ??
          p.levelLabel ??
          p.levelName ??
          p.performanceLevel ??
          p.performance ??
          p.skill ??
          p.difficulty ??
          "",
      }));
  }, [allProfiles]);

  // Base user bots = store ou LS
  const userBots: BotLite[] = React.useMemo(() => {
    if (userBotsFromStore.length > 0) return userBotsFromStore;
    return botsFromLS;
  }, [userBotsFromStore, botsFromLS]);

  // BOTS finaux = PRO + user
  const botProfiles: BotLite[] = React.useMemo(() => {
    return [...PRO_BOTS, ...userBots];
  }, [userBots]);

  // ---- état local des paramètres ----
  const [startScore, setStartScore] = React.useState<301 | 501 | 701 | 901>(501);
  const [inMode, setInMode] = React.useState<InModeV3>("simple");
  const [outMode, setOutMode] = React.useState<OutModeV3>("double");
  const [legsPerSet, setLegsPerSet] = React.useState<number>(3);
  const [setsToWin, setSetsToWin] = React.useState<number>(1);
  const [serveMode, setServeMode] = React.useState<ServiceModeV3>("alternate");
  const [matchMode, setMatchMode] = React.useState<MatchModeV3>("solo");

  // ---- NEW : AUDIO OPTIONS (pour X01PlayV3) ----
  const [arcadeEnabled, setArcadeEnabled] = React.useState<boolean>(true);
  const [hitEnabled, setHitEnabled] = React.useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = React.useState<boolean>(true);
  const [voiceId, setVoiceId] = React.useState<string>("default");

  // ---- NEW : COMPTAGE EXTERNE (vidéo / bridge) ----
  const [externalScoringEnabled, setExternalScoringEnabled] = React.useState<boolean>(false);
  const [externalInfoOpen, setExternalInfoOpen] = React.useState<boolean>(false);

  // évite d’écraser le choix manuel si on change de joueur sélectionné
  const voiceTouchedRef = React.useRef(false);

  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => {
    if (humanProfiles.length >= 2) return [humanProfiles[0].id, humanProfiles[1].id];
    if (humanProfiles.length === 1) return [humanProfiles[0].id];
    return [];
  });

  // ⚙️ pré-remplit la voix depuis le 1er profil humain sélectionné (si dispo)
  React.useEffect(() => {
    if (voiceTouchedRef.current) return;

    const firstHumanSelectedId =
      selectedIds.find((id) => humanProfiles.some((p) => p.id === id)) ??
      humanProfiles[0]?.id ??
      null;

    if (!firstHumanSelectedId) return;

    const p: any = humanProfiles.find((x) => x.id === firstHumanSelectedId);
    if (!p) return;

    const candidate: string | undefined = p.ttsVoice ?? p.voiceId ?? p.voice ?? p.tts ?? undefined;
    if (candidate && typeof candidate === "string") setVoiceId(candidate);
  }, [selectedIds, humanProfiles]);

  // playerId -> teamId
  const [teamAssignments, setTeamAssignments] = React.useState<Record<string, TeamId | null>>({});

  // profileId -> dartSetId (ou null)
  const [playerDartSets, setPlayerDartSets] = React.useState<Record<string, string | null>>({});

  const handleChangePlayerDartSet = (profileId: string, dartSetId: string | null) => {
    setPlayerDartSets((prev) => ({ ...prev, [profileId]: dartSetId }));
  };

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

  // ---- désactivation visuelle des modes impossibles (Option A) ----
  const soloDisabled = totalPlayers !== 2;
  const multiDisabled = totalPlayers < 2;
  const teamsDisabled = totalPlayers < 4;

  // ---- validation mode équipes ----
  function validateTeams() {
    const teamBuckets: Record<TeamId, string[]> = { gold: [], pink: [], blue: [], green: [] };

    selectedIds.forEach((pid) => {
      const tId = teamAssignments[pid];
      if (tId) teamBuckets[tId].push(pid);
    });

    const usedTeams = (Object.keys(teamBuckets) as TeamId[]).filter((tid) => teamBuckets[tid].length > 0);

    if (usedTeams.length < 2) {
      alert(
        t(
          "x01v3.teams.needTwoTeams",
          "Sélectionne au moins 2 équipes (Gold / Pink / Blue / Green)."
        )
      );
      return null;
    }

    const sizes = Array.from(new Set(usedTeams.map((tid) => teamBuckets[tid].length))).filter((n) => n > 0);

    if (sizes.length !== 1) {
      alert(t("x01v3.teams.sameSize", "Toutes les équipes doivent avoir le même nombre de joueurs."));
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
        alert(t("x01v3.config.needPlayer", "Sélectionne au moins un joueur local ou un BOT IA."));
        return;
      }
      if (matchMode === "solo" && totalPlayers !== 2) {
        alert(t("x01v3.config.needTwoPlayersSolo", "En mode Solo (1v1), sélectionne exactement 2 joueurs."));
        return;
      }
      if (totalPlayers < 2) {
        alert(t("x01v3.config.needTwoPlayers", "Sélectionne au moins 2 joueurs pour ce mode."));
        return;
      }
    }

    let teams: null | Array<{ id: TeamId; name: string; color: string; playerIds: string[] }> = null;

    if (matchMode === "teams") {
      teams = validateTeams();
      if (!teams) return;
    }

    // résout les IDs : humains d'abord, puis bots (user + pro)
    const players = selectedIds
      .map((id) => {
        const human = allProfiles.find((p) => p.id === id);
        if (human) {
          const dartSetId = playerDartSets[human.id] ?? null;
          return {
            id: human.id,
            profileId: human.id,
            name: human.name,
            avatarDataUrl: (human as any).avatarDataUrl ?? null,
            isBot: !!(human as any).isBot,
            botLevel: (human as any).botLevel ?? undefined,
            dartSetId,
          };
        }

        const bot = botProfiles.find((b) => b.id === id);
        if (bot) {
          return {
            id: bot.id,
            profileId: null,
            name: bot.name,
            avatarDataUrl: bot.avatarDataUrl ?? null,
            isBot: true,
            botLevel: bot.botLevel ?? undefined,
            dartSetId: null,
          };
        }

        return null;
      })
      .filter(Boolean) as any[];

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

      // ✅ NEW : source de scoring (keypad vs externe)
      scoringSource: externalScoringEnabled ? "external" : "manual",

      // ✅ NEW : audio config consommée par X01PlayV3
      audio: {
        arcadeEnabled,
        hitEnabled,
        voiceEnabled,
        voiceId,
      },
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
      <header style={{ marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
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
        <div style={{ textAlign: "center" }}>
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
            {t("x01v3.config.subtitle", "Configure ton match X01 avant de commencer.")}
          </div>
        </div>
      </header>

      {/* CONTENU SCROLLABLE */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: 4, paddingBottom: 12 }}>
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
            <p style={{ fontSize: 13, color: "#b3b8d0", marginBottom: 8 }}>
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
                  paddingLeft: 24,
                  paddingRight: 8,
                  justifyContent: "flex-start",
                }}
                className="dc-scroll-thin"
              >
                {humanProfiles.map((p) => {
                  const active = selectedIds.includes(p.id);

                  const teamId =
                    matchMode === "teams"
                      ? (teamAssignments[p.id] as TeamId | null) ?? null
                      : null;
                  const haloColor = teamId ? TEAM_COLORS[teamId] : primary;

                  return (
                    <div
                      key={p.id}
                      role="button"
                      onClick={() => togglePlayer(p.id)}
                      style={{
                        minWidth: 120,
                        maxWidth: 120,
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 0,
                        cursor: "pointer",
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
                            filter: active ? "none" : "grayscale(100%) brightness(0.55)",
                            opacity: active ? 1 : 0.6,
                            transition: "filter 0.2s ease, opacity 0.2s ease",
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

                      {/* ⬇⬇⬇ BADGE "JEU DE FLÉCHETTES" ICI ⬇⬇⬇ */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: "100%", display: "flex", justifyContent: "center" }}
                      >
                        <PlayerDartBadge
                          profileId={p.id}
                          dartSetId={playerDartSets[p.id] ?? null}
                          onChange={(id) => handleChangePlayerDartSet(p.id, id)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 0 }}>
                {t("x01v3.playersHint", "2 joueurs pour un duel, 3+ pour Multi ou Équipes.")}
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
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
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
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
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
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
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

          {/* ✅ NEW : AUDIO / VOIX */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 1,
                fontWeight: 700,
                color: primary,
                marginBottom: 8,
              }}
            >
              {t("x01v3.audio.title", "Audio")}
            </div>

            {/* Sons Arcade */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
                {t("x01v3.audio.arcade", "Sons Arcade")}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <PillButton
                  label={t("common.on", "ON")}
                  active={arcadeEnabled === true}
                  onClick={() => setArcadeEnabled(true)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
                <PillButton
                  label={t("common.off", "OFF")}
                  active={arcadeEnabled === false}
                  onClick={() => setArcadeEnabled(false)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
              </div>
              <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>
                {t("x01v3.audio.arcadeHint", "DBULL / BULL / DOUBLE / TRIPLE / 180 / BUST / victoire")}
              </div>
            </div>

            {/* Bruitages (dart_hit) */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
                {t("x01v3.audio.hit", "Bruitages")}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <PillButton
                  label={t("common.on", "ON")}
                  active={hitEnabled === true}
                  onClick={() => setHitEnabled(true)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
                <PillButton
                  label={t("common.off", "OFF")}
                  active={hitEnabled === false}
                  onClick={() => setHitEnabled(false)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
              </div>
              <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>
                {t("x01v3.audio.hitHint", "Son de fléchette (dart-hit)")}
              </div>
            </div>

            {/* Voix IA + sélection */}
            <div>
              <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
                {t("x01v3.audio.voice", "Voix IA")}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <PillButton
                  label={t("common.on", "ON")}
                  active={voiceEnabled === true}
                  onClick={() => setVoiceEnabled(true)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
                <PillButton
                  label={t("common.off", "OFF")}
                  active={voiceEnabled === false}
                  onClick={() => setVoiceEnabled(false)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
                  {t("x01v3.audio.voiceSelect", "Voix")}
                </div>
                <select
                  value={voiceId}
                  onChange={(e) => {
                    voiceTouchedRef.current = true;
                    setVoiceId(e.target.value);
                  }}
                  style={{
                    width: "100%",
                    height: 38,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(9,11,20,0.9)",
                    color: "#f2f2ff",
                    padding: "0 10px",
                    fontSize: 13,
                    outline: "none",
                  }}
                >
                  {VOICE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>

                <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>
                  {t("x01v3.audio.voiceHint", "Utilisée pour l'annonce des scores / fin de match.")}
                </div>
              </div>
            </div>
          </div>

          {/* ✅ NEW : COMPTAGE EXTERNE (vidéo) + bouton info */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  fontWeight: 700,
                  color: primary,
                }}
              >
                {t("x01v3.external.title", "Comptage externe (vidéo)")}
              </div>

              <button
                type="button"
                onClick={() => setExternalInfoOpen(true)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontWeight: 900,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 12px rgba(0,0,0,0.55)",
                  cursor: "pointer",
                  flex: "0 0 auto",
                }}
                aria-label="Info comptage externe"
                title="Info"
              >
                i
              </button>
            </div>

            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
              {t(
                "x01v3.external.desc",
                "Active si tu veux que le match soit piloté par une source externe (caméra / bridge / automatisation)."
              )}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("common.off", "OFF")}
                active={externalScoringEnabled === false}
                onClick={() => setExternalScoringEnabled(false)}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
              <PillButton
                label={t("common.on", "ON")}
                active={externalScoringEnabled === true}
                onClick={() => setExternalScoringEnabled(true)}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
            </div>

            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 8 }}>
              {externalScoringEnabled
                ? t(
                    "x01v3.external.onHint",
                    "ON : le keypad pourra être masqué côté X01PlayV3, et les tirs arriveront depuis l’extérieur."
                  )
                : t("x01v3.external.offHint", "OFF : mode normal au keypad.")}
            </div>
          </div>

          {/* ✅ MODAL FLOTTANT : aide comptage externe */}
          {externalInfoOpen && (
            <div
              onClick={() => setExternalInfoOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.55)",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 12,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "min(520px, 100%)",
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background:
                    "linear-gradient(180deg, rgba(10,12,24,0.96), rgba(6,7,14,0.98))",
                  boxShadow: "0 18px 60px rgba(0,0,0,0.65)",
                  padding: 14,
                  color: "#f2f2ff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontWeight: 900, color: primary, fontSize: 14 }}>
                    {t("x01v3.external.howTitle", "Comment ça fonctionne ?")}
                  </div>
                  <button
                    type="button"
                    onClick={() => setExternalInfoOpen(false)}
                    style={{
                      borderRadius: 10,
                      padding: "6px 10px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {t("common.close", "Fermer")}
                  </button>
                </div>

                <div style={{ fontSize: 12, color: "#d7d9f0", lineHeight: 1.4 }}>
                  <p style={{ marginTop: 0 }}>
                    Ce mode sert à préparer la compatibilité avec un système externe (caméra/bridge).
                    <br />
                    Tu peux déjà tester <b>sans Scolia</b> : un script peut envoyer des tirs à l’app.
                  </p>

                  <div
                    style={{
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: 14,
                      padding: 10,
                      marginTop: 10,
                    }}
                  >
                    <div style={{ fontWeight: 800, marginBottom: 6, color: primary }}>
                      Exemple d’envoi d’un tir (depuis la console / bridge)
                    </div>

                    <pre
                      style={{
                        margin: 0,
                        padding: 10,
                        borderRadius: 12,
                        background: "rgba(0,0,0,0.35)",
                        overflowX: "auto",
                        fontSize: 12,
                        lineHeight: 1.35,
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >{`window.dispatchEvent(new CustomEvent("dc:x01:external_dart", {
  detail: { segment: 20, multiplier: 3 } // T20
}));

// BULL
window.dispatchEvent(new CustomEvent("dc:x01:external_dart", {
  detail: { segment: 25, multiplier: 1 }
}));

// DBULL
window.dispatchEvent(new CustomEvent("dc:x01:external_dart", {
  detail: { segment: 25, multiplier: 2 }
}));

// MISS
window.dispatchEvent(new CustomEvent("dc:x01:external_dart", {
  detail: { segment: 0, multiplier: 1 }
}));`}</pre>

                    <div style={{ marginTop: 8, fontSize: 11, color: "#aeb2d3" }}>
                      À brancher plus tard sur un vrai flux vidéo (Scolia-like) via un “bridge”, mais
                      ça marche déjà pour des tests.
                    </div>
                  </div>

                  <p style={{ marginBottom: 0, marginTop: 10, fontSize: 11, color: "#aeb2d3" }}>
                    Note : en mode externe, X01PlayV3 doit écouter cet événement et appliquer les tirs
                    reçus au moteur.
                  </p>
                </div>
              </div>
            </div>
          )}
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
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
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
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
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
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
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
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>
              {t("x01v3.matchMode", "Mode de match")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("x01v3.mode.solo", "Solo (1v1)")}
                active={matchMode === "solo"}
                onClick={() => {
                  if (soloDisabled) return;
                  setMatchMode("solo");
                }}
                primary={primary}
                primarySoft={primarySoft}
                disabled={soloDisabled}
              />
              <PillButton
                label={t("x01v3.mode.multi", "Multi (FFA)")}
                active={matchMode === "multi"}
                onClick={() => {
                  if (multiDisabled) return;
                  setMatchMode("multi");
                }}
                primary={primary}
                primarySoft={primarySoft}
                disabled={multiDisabled}
              />
              <PillButton
                label={t("x01v3.mode.teams", "Équipes")}
                active={matchMode === "teams"}
                onClick={() => {
                  if (teamsDisabled) return;
                  setMatchMode("teams");
                }}
                primary={primary}
                primarySoft={primarySoft}
                disabled={teamsDisabled}
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

          <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 10 }}>
            {t(
              "x01v3.bots.subtitle",
              'Ajoute des BOTS IA à ta partie : bots "pro" prédéfinis ou BOTS que tu as créés dans le menu Profils.'
            )}
          </p>

          <div
            style={{
              display: "flex",
              gap: 14,
              overflowX: "auto",
              overflowY: "visible",
              paddingBottom: 10,
              paddingTop: 16,
              marginTop: 10,
              marginBottom: 10,
            }}
            className="dc-scroll-thin"
          >
            {botProfiles.map((bot) => {
              const { level } = resolveBotLevel(bot.botLevel);
              const active = selectedIds.includes(bot.id);

              return (
                <button
                  key={bot.id}
                  type="button"
                  onClick={() => togglePlayer(bot.id)}
                  style={{
                    minWidth: 96,
                    maxWidth: 96,
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
                  <BotMedallion bot={bot} level={level} active={active} />

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
                      marginTop: 4,
                    }}
                  >
                    {bot.name}
                  </div>

                  {/* Chip BOT bleu néon */}
                  <div style={{ marginTop: 2, display: "flex", justifyContent: "center" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: 0.7,
                        textTransform: "uppercase",
                        background: "radial-gradient(circle at 30% 0, #6af3ff, #008cff)",
                        color: "#020611",
                        boxShadow:
                          "0 0 10px rgba(0,172,255,0.55), 0 0 18px rgba(0,172,255,0.35)",
                        border: "1px solid rgba(144,228,255,0.9)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      BOT
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => go && go("profiles_bots")}
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
            {t("x01v3.bots.manage", "Gérer les BOTS")}
          </button>
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
              background: canStart ? `linear-gradient(90deg, ${primary}, #ffe9a3)` : "rgba(120,120,120,0.5)",
              color: canStart ? "#151515" : "#2b2bb2",
              boxShadow: canStart ? "0 0 18px rgba(255, 207, 120, 0.65)" : "none",
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

function TeamsSection({ profiles, selectedIds, teamAssignments, setPlayerTeam }: TeamsSectionProps) {
  const { t } = useLang();
  const cardBg = "rgba(10, 12, 24, 0.96)";
  const totalPlayers = selectedIds.length;

  const counts: Record<TeamId, number> = { gold: 0, pink: 0, blue: 0, green: 0 };

  selectedIds.forEach((pid) => {
    const tId = teamAssignments[pid];
    if (tId) counts[tId]++;
  });

  const orderedTeams: TeamId[] = ["gold", "pink", "blue", "green"];

  const maxTeams = totalPlayers <= 4 ? 2 : totalPlayers <= 6 ? 3 : 4;
  const maxPerTeamBase = totalPlayers >= 8 ? 4 : totalPlayers >= 6 ? 3 : 2;
  const usedTeamsCount = orderedTeams.filter((tid) => counts[tid] > 0).length;
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
      <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 10 }}>
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
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
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

              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {orderedTeams.map((tid, idx) => {
                  const allowedTeamSlot = idx < maxTeams;
                  const full = counts[tid] >= maxPerTeam && team !== tid;
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

/* --------- Helpers niveau BOT (1 à 5 étoiles) --------- */

function resolveBotLevel(botLevelRaw?: string | null): { level: number } {
  const v = (botLevelRaw || "").toLowerCase().trim();
  if (!v) return { level: 1 };

  const digits = v.replace(/[^0-9]/g, "");
  if (digits) {
    const n = parseInt(digits, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 5) return { level: n };
  }

  if (v.includes("legend") || v.includes("légende")) return { level: 5 };
  if (v.includes("pro")) return { level: 4 };

  if (v.includes("fort") || v.includes("strong") || v.includes("hard") || v.includes("difficile")) return { level: 3 };
  if (v.includes("standard") || v.includes("normal") || v.includes("medium") || v.includes("moyen")) return { level: 2 };
  if (v.includes("easy") || v.includes("facile") || v.includes("beginner") || v.includes("débutant") || v.includes("rookie")) return { level: 1 };

  return { level: 1 };
}

/* Médaillon BOT – doré pour les PRO IA, bleu pour les bots classiques */
function BotMedallion({
  bot,
  level,
  active,
}: {
  bot: BotLite;
  level: number; // 1..5
  active: boolean;
}) {
  const isPro = bot.id.startsWith("bot_pro_");
  const COLOR = isPro ? "#f7c85c" : "#00b4ff";
  const COLOR_GLOW = isPro ? "rgba(247,200,92,0.9)" : "rgba(0,172,255,0.65)";

  const SCALE = 0.6;
  const AVATAR = 96 * SCALE;
  const MEDALLION = 104 * SCALE;
  const STAR = 18 * SCALE;
  const WRAP = MEDALLION + STAR;

  const lvl = Math.max(1, Math.min(5, level));
  const fakeAvg3d = 15 + (lvl - 1) * 12;

  return (
    <div style={{ position: "relative", width: WRAP, height: WRAP, flex: "0 0 auto", overflow: "visible" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 3,
          filter: `drop-shadow(0 0 6px ${COLOR_GLOW})`,
        }}
      >
        <ProfileStarRing
          anchorSize={MEDALLION}
          gapPx={-2 * SCALE}
          starSize={STAR}
          stepDeg={10}
          avg3d={fakeAvg3d}
          color={COLOR}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: (WRAP - MEDALLION) / 2,
          left: (WRAP - MEDALLION) / 2,
          width: MEDALLION,
          height: MEDALLION,
          borderRadius: "50%",
          padding: 6 * SCALE,
          background: active
            ? isPro
              ? "linear-gradient(135deg, #fff3c2, #f7c85c)"
              : "linear-gradient(135deg, #7df3ff, #00b4ff)"
            : isPro
            ? "linear-gradient(135deg, #2a2a1f, #1a1a12)"
            : "linear-gradient(135deg, #2c3640, #141b26)",
          boxShadow: active
            ? `0 0 24px ${COLOR_GLOW}, inset 0 0 10px rgba(0,0,0,.7)`
            : `0 0 14px rgba(0,0,0,0.7)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: active ? "scale(1.05)" : "scale(1)",
          transition: "transform .15s ease, box-shadow .15s ease",
          border: active ? `2px solid ${COLOR}` : `2px solid ${isPro ? "rgba(247,200,92,0.5)" : "rgba(144,228,255,0.9)"}`,
        }}
      >
        <ProfileAvatar
          size={AVATAR}
          // @ts-ignore (ProfileAvatar supporte déjà dataUrl chez toi)
          dataUrl={bot.avatarDataUrl ?? undefined}
          label={bot.name?.[0]?.toUpperCase() || "B"}
          showStars={false}
        />
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
  disabled?: boolean;
};

function PillButton({ label, active, onClick, primary, primarySoft, compact, disabled }: PillProps) {
  const isDisabled = !!disabled;

  const bg = isDisabled
    ? "rgba(40,42,60,0.7)"
    : active
    ? primarySoft
    : "rgba(9,11,20,0.9)";

  const border = isDisabled
    ? "1px solid rgba(255,255,255,0.04)"
    : active
    ? `1px solid ${primary}`
    : "1px solid rgba(255,255,255,0.07)";

  const color = isDisabled ? "#777b92" : active ? "#fdf9ee" : "#d0d3ea";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      style={{
        borderRadius: 999,
        padding: compact ? "4px 9px" : "6px 12px",
        border,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: active && !isDisabled ? 600 : 500,
        boxShadow: active && !isDisabled ? "0 0 12px rgba(0,0,0,0.7)" : "none",
        whiteSpace: "nowrap",
        opacity: isDisabled ? 0.7 : 1,
        cursor: isDisabled ? "default" : "pointer",
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

function TeamPillButton({ label, color, active, disabled, onClick }: TeamPillProps) {
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
        boxShadow: active && !disabled ? `0 0 10px ${color}55` : "none",
        whiteSpace: "nowrap",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}
