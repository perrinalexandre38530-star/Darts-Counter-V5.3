// ============================================
// src/pages/CricketPlay.tsx
// Mode Cricket — profils réels + tableau centré
// - Setup : sélection 2 à 4 profils + options
// - Play  : tableau Cricket (15..20 + Bull) avec colonnes centrées
// - Keypad 0..20 (3 × 7) + bouton BULL
// - Intégration Historique : enregistre chaque manche dans History (kind: "cricket")
// ✅ FIX: maxRounds appliqué (force end quand round atteint)
// ✅ NEW: 2v2 (équipe) + bots pour compléter à 4
// ✅ NEW: ordre de départ aléatoire OU ordre choisi
// ✅ NEW: SFX arcade DOUBLE/TRIPLE/BULL/DBULL + MISS(0..14)=BUST
// ✅ NEW: Fin de partie = résumé propre + save history + actions
// ✅ NEW: legStats cricket par joueur dans payload.players pour StatsCricket
// ✅ NEW: choix dartSet + sauvegarde dans payload (stats par set possible)
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
import type { SavedMatch } from "../lib/history";
import { DartIconColorizable, CricketMarkIcon } from "../components/MaskIcon";

// (optionnel) dart sets (si ton app l’a déjà)
import { getDartSetsForProfile, type DartSet } from "../lib/dartSetsStore";

const T = {
  bg: "#050712",
  card: "#121420",
  text: "#FFFFFF",
  textSoft: "rgba(255,255,255,0.7)",
  gold: "#F6C256",
  borderSoft: "rgba(255,255,255,0.08)",
};

// Couleurs d’accent par joueur (1 à 4)
const ACCENTS = ["#fbbf24", "#f472b6", "#22c55e", "#38bdf8"];

// Ordre d’affichage de la colonne centrale (croissant)
const CRICKET_UI_TARGETS: CricketTarget[] = [15, 16, 17, 18, 19, 20, 25];

// Dégradé 15 → Bull (doré → rouge)
const TARGET_COLORS: Record<number, string> = {
  15: "#F6C256",
  16: "#fbbf24",
  17: "#fb923c",
  18: "#f97316",
  19: "#fb7185",
  20: "#ef4444",
  25: "#b91c1c",
};

function getTargetColor(target: CricketTarget): string {
  return TARGET_COLORS[target] ?? "#fef3c7";
}

// Petit helper pour assombrir une couleur hex
function darkenColor(hex: string, factor: number = 0.7): string {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return hex;
  const r = Math.round(parseInt(m[1], 16) * factor);
  const g = Math.round(parseInt(m[2], 16) * factor);
  const b = Math.round(parseInt(m[3], 16) * factor);
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

type Phase = "setup" | "play";
type ScoreMode = "points" | "no-points";
type HitMode = "S" | "D" | "T";

type BotDef = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  rating?: number;
};

type SelectablePlayer = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  isBot?: boolean;
};

type Props = {
  profiles?: Profile[];
  // 🔥 callback pour enregistrer la manche dans l’historique
  onFinish?: (m: SavedMatch) => void;
};

function safeParseJSON<T>(s: any, fallback: T): T {
  try {
    const v = JSON.parse(String(s));
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

// bots stockés chez toi (souvent dc_bots_v1)
function loadBotsFromLocalStorage(): BotDef[] {
  const raw = typeof window !== "undefined" ? localStorage.getItem("dc_bots_v1") : null;
  if (!raw) return [];
  const data = safeParseJSON<any>(raw, null);
  if (!data) return [];

  // support: array ou map
  if (Array.isArray(data)) {
    return data
      .map((b: any) => ({
        id: String(b?.id ?? ""),
        name: String(b?.name ?? b?.displayName ?? "BOT"),
        avatarDataUrl: b?.avatarDataUrl ?? b?.avatar ?? null,
        rating: typeof b?.rating === "number" ? b.rating : undefined,
      }))
      .filter((b: BotDef) => b.id && b.name);
  }

  if (typeof data === "object") {
    return Object.values(data)
      .map((b: any) => ({
        id: String(b?.id ?? ""),
        name: String(b?.name ?? b?.displayName ?? "BOT"),
        avatarDataUrl: b?.avatarDataUrl ?? b?.avatar ?? null,
        rating: typeof b?.rating === "number" ? b.rating : undefined,
      }))
      .filter((b: BotDef) => b.id && b.name);
  }

  return [];
}

function countMarksTotal(marks: any) {
  return CRICKET_TARGETS.reduce((acc: number, t: any) => acc + Number(marks?.[t] ?? 0), 0);
}

function countClosedTargets(marks: any) {
  return CRICKET_TARGETS.reduce((acc: number, t: any) => acc + (Number(marks?.[t] ?? 0) >= 3 ? 1 : 0), 0);
}

function computeCricketMiniStatsFromHits(hits: any[]) {
  // hits attendus: [{ target, mult }] ou [{ t, m }] ou autres -> on tente
  let doubles = 0;
  let triples = 0;
  let bulls = 0;
  let dbulls = 0;
  let misses = 0;

  for (const h of hits ?? []) {
    const target = Number(h?.target ?? h?.t ?? h?.value ?? h?.v ?? NaN);
    const mult = Number(h?.mult ?? h?.m ?? 1);

    if (!Number.isFinite(target)) continue;

    if (target >= 0 && target <= 14) misses += 1;
    if (mult === 2) doubles += 1;
    if (mult === 3) triples += 1;

    if (target === 25) {
      if (mult === 2) dbulls += 1;
      else bulls += 1;
    }
  }

  return { doubles, triples, bulls, dbulls, misses };
}

export default function CricketPlay({ profiles, onFinish }: Props) {
  const allProfiles = profiles ?? [];

  // ---- Phase (setup -> play) ----
  const [phase, setPhase] = React.useState<Phase>("setup");

  // ---- Joueurs sélectionnés ----
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // ---- Paramètres ----
  const [scoreMode, setScoreMode] = React.useState<ScoreMode>("points");
  const [maxRounds, setMaxRounds] = React.useState<number>(20);
  const [rotateFirstPlayer, setRotateFirstPlayer] = React.useState<boolean>(true);

  // ✅ ordre départ
  const [randomStart, setRandomStart] = React.useState<boolean>(false);

  // ✅ équipes
  const [teamMode, setTeamMode] = React.useState<boolean>(false);

  // ✅ compléter avec bots si teamMode et joueurs < 4
  const [fillWithBots, setFillWithBots] = React.useState<boolean>(true);

  // ✅ dart set selection
  const [dartSets, setDartSets] = React.useState<DartSet[]>([]);
  const [selectedDartSetId, setSelectedDartSetId] = React.useState<string>("");

  // ---- Match en cours ----
  const [state, setState] = React.useState<CricketState | null>(null);
  const [hitMode, setHitMode] = React.useState<HitMode>("S");
  const [showHelp, setShowHelp] = React.useState(false);

  // ✅ modal fin de partie
  const [showEnd, setShowEnd] = React.useState(false);

  // 🕒 timestamp de début de manche (pour createdAt)
  const [legStartAt, setLegStartAt] = React.useState<number | null>(null);

  // bots
  const bots = React.useMemo(() => loadBotsFromLocalStorage(), []);
  const selectablePlayers: SelectablePlayer[] = React.useMemo(() => {
    const real: SelectablePlayer[] = allProfiles.map((p) => ({
      id: p.id,
      name: p.name,
      avatarDataUrl: (p as any)?.avatarDataUrl ?? null,
      isBot: false,
    }));

    const botPlayers: SelectablePlayer[] = bots.map((b) => ({
      id: `bot:${b.id}`,
      name: b.name,
      avatarDataUrl: b.avatarDataUrl ?? null,
      isBot: true,
    }));

    // bots visibles dans la liste pour selection manuelle
    return [...real, ...botPlayers];
  }, [allProfiles, bots]);

  const profileById = React.useMemo(() => {
    const m = new Map<string, Profile>();
    for (const p of allProfiles) m.set(p.id, p);
    return m;
  }, [allProfiles]);

  const currentPlayer =
    state && (state as any).players && (state as any).players[(state as any).currentPlayerIndex]
      ? (state as any).players[(state as any).currentPlayerIndex]
      : null;

  const isFinished = !!(state as any)?.winnerId;

  React.useEffect(() => {
    if (isFinished) setShowEnd(true);
  }, [isFinished]);

  // --------------------------------------------------
  // Helpers visuels
  // --------------------------------------------------

  function renderAvatarCircle(
    prof: { name?: string; avatarDataUrl?: string | null } | null,
    opts?: { selected?: boolean; size?: number; mode?: "setup" | "play"; isBot?: boolean }
  ) {
    const size = opts?.size ?? 40;
    const selected = !!opts?.selected;
    const mode = opts?.mode ?? "play";
    const grayscale = mode === "setup" && !selected;

    const initials =
      (prof?.name || "")
        .split(" ")
        .filter(Boolean)
        .map((s) => s[0])
        .join("")
        .toUpperCase() || "?";

    const borderColor = selected ? T.gold : "rgba(148,163,184,0.3)";
    const showNeon = selected;

    if (prof?.avatarDataUrl) {
      return (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            overflow: "hidden",
            border: `2px solid ${borderColor}`,
            boxShadow: showNeon
              ? "0 0 10px rgba(246,194,86,0.9), 0 0 24px rgba(246,194,86,0.7)"
              : "0 0 4px rgba(0,0,0,0.8)",
            background:
              mode === "setup"
                ? "radial-gradient(circle at 30% 0%, #1f2937 0, #020617 80%)"
                : "#000",
            flexShrink: 0,
            position: "relative",
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
              filter: grayscale ? "grayscale(1) brightness(0.6)" : "none",
              opacity: grayscale ? 0.7 : 1,
            }}
          />
          {opts?.isBot && (
            <div
              style={{
                position: "absolute",
                right: -6,
                bottom: -6,
                background: "rgba(0,0,0,0.7)",
                border: "1px solid rgba(246,194,86,0.4)",
                color: T.gold,
                fontSize: 9,
                fontWeight: 900,
                padding: "2px 6px",
                borderRadius: 999,
              }}
            >
              BOT
            </div>
          )}
        </div>
      );
    }

    // Fallback initiales
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
          boxShadow: showNeon
            ? "0 0 10px rgba(246,194,86,0.9), 0 0 24px rgba(246,194,86,0.7)"
            : "0 0 4px rgba(0,0,0,0.8)",
          flexShrink: 0,
          position: "relative",
        }}
      >
        {initials}
        {opts?.isBot && (
          <div
            style={{
              position: "absolute",
              right: -6,
              bottom: -6,
              background: "rgba(0,0,0,0.7)",
              border: "1px solid rgba(246,194,86,0.4)",
              color: T.gold,
              fontSize: 9,
              fontWeight: 900,
              padding: "2px 6px",
              borderRadius: 999,
            }}
          >
            BOT
          </div>
        )}
      </div>
    );
  }

  // --------------------------------------------------
  // SETUP
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
  const canStart = selectedCount >= 2 && selectedCount <= 4 && selectablePlayers.length >= 2;

  // load dart sets for first REAL profile selected
  React.useEffect(() => {
    const firstRealId = selectedIds.find((id) => !String(id).startsWith("bot:"));
    if (!firstRealId) {
      setDartSets([]);
      setSelectedDartSetId("");
      return;
    }

    const sets = getDartSetsForProfile(firstRealId) as any;
    const arr = Array.isArray(sets) ? (sets as DartSet[]) : [];
    setDartSets(arr);

    // auto default
    if (arr.length > 0) {
      const keep = arr.find((s) => s.id === selectedDartSetId);
      if (!keep) setSelectedDartSetId(arr[0].id);
    } else {
      setSelectedDartSetId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  function resolveSelectedPlayers(): SelectablePlayer[] {
    const selected = selectedIds
      .map((id) => selectablePlayers.find((p) => p.id === id) || null)
      .filter(Boolean) as SelectablePlayer[];

    // si mode équipe et fill bots ON => on complète à 4 (max 4)
    if (teamMode && fillWithBots && selected.length < 4) {
      const needed = 4 - selected.length;
      const availableBots = selectablePlayers.filter((p) => p.isBot && !selectedIds.includes(p.id));
      const take = availableBots.slice(0, Math.max(0, needed));
      return [...selected, ...take].slice(0, 4);
    }

    return selected;
  }

  function handleStartMatch() {
    if (!canStart) return;

    const selectedPlayers = resolveSelectedPlayers();
    if (selectedPlayers.length < 2) return;

    let players = selectedPlayers.map((p) => ({ id: p.id, name: p.name }));

    // ordre départ
    if (randomStart) {
      players = [...players].sort(() => Math.random() - 0.5);
    }

    const match = createCricketMatch(players, {
      withPoints: scoreMode === "points",
      maxRounds,
    });

    // on attache infos match au state (non destructif)
    const extra: any = {
      __meta: {
        scoreMode,
        maxRounds,
        rotateFirstPlayer,
        randomStart,
        teamMode,
        fillWithBots,
        dartSetId: selectedDartSetId || null,
      },
      // équipes auto si teamMode + 4 joueurs : (0,2) vs (1,3)
      teams:
        teamMode && (match as any)?.players?.length === 4
          ? [
              { id: "A", name: "Équipe A", playerIds: [(match as any).players[0].id, (match as any).players[2].id] },
              { id: "B", name: "Équipe B", playerIds: [(match as any).players[1].id, (match as any).players[3].id] },
            ]
          : null,
    };

    setState(Object.assign({}, match, extra));
    setPhase("play");
    setHitMode("S");
    setLegStartAt(Date.now());
    setShowEnd(false);
    playSound("start");
  }

  // --------------------------------------------------
  // PLAY : SFX + logique
  // --------------------------------------------------

  function sfxForHit(target: number, mult: Multiplier) {
    // 0..14 => MISS = son BUST demandé
    if (target >= 0 && target <= 14) {
      playSound("bust");
      return;
    }

    // Bull / DBull
    if (target === 25) {
      if (mult === 2) playSound("dbull");
      else playSound("bull");
      return;
    }

    // Double / Triple
    if (mult === 2) {
      playSound("double");
      return;
    }
    if (mult === 3) {
      playSound("triple");
      return;
    }

    // Simple valide
    playSound("ok");
  }

  function computeWinnerAtRoundCap(st: any): string | null {
    // règle simple au cap:
    // 1) plus de cibles fermées
    // 2) égalité => plus de points
    // 3) égalité => plus de marks totaux
    const rows = (st?.players ?? []).map((p: any) => {
      const closed = countClosedTargets(p?.marks);
      const points = Number(p?.score ?? 0);
      const marksTotal = countMarksTotal(p?.marks);
      return { id: p.id, closed, points, marksTotal };
    });

    rows.sort((a: any, b: any) => {
      if (b.closed !== a.closed) return b.closed - a.closed;
      if (b.points !== a.points) return b.points - a.points;
      return b.marksTotal - a.marksTotal;
    });

    return rows[0]?.id ?? null;
  }

  function maybeApplyMaxRoundsEnd(nextState: any) {
    // on force la fin si roundNumber atteint maxRounds
    // on essaye plusieurs champs possibles selon ton engine
    const rn =
      Number(nextState?.roundNumber ?? nextState?.round ?? nextState?.turn ?? nextState?.currentRound ?? NaN);

    if (!Number.isFinite(rn)) return nextState;

    if (rn >= maxRounds && !nextState?.winnerId) {
      const wid = computeWinnerAtRoundCap(nextState);
      if (wid) {
        const forced = { ...nextState, winnerId: wid, finishedReason: "maxRounds" };
        return forced;
      }
    }
    return nextState;
  }

  function registerHit(rawTarget: number) {
    if (!state || !currentPlayer) return;
    if ((state as any).winnerId) return;

    let mult: Multiplier = 1;
    if (hitMode === "D") mult = 2;
    if (hitMode === "T") mult = 3;

    const next0 = applyCricketHit(state as any, rawTarget as any, mult);

    // SFX
    sfxForHit(rawTarget, mult);

    // après saisie, on revient en "simple" si D/T
    if (hitMode === "D" || hitMode === "T") setHitMode("S");

    // ✅ FORCE maxRounds
    const next = maybeApplyMaxRoundsEnd(next0);

    setState(next);
  }

  function handleKeyPress(value: number) {
    if (!state || !currentPlayer) return;
    if ((state as any).winnerId) return;
    registerHit(value);
  }

  function handleBull() {
    if (!state || !currentPlayer) return;
    if ((state as any).winnerId) return;
    registerHit(25);
  }

  function handleUndo() {
    if (!state) return;
    const next = undoLastCricketHit(state as any);
    setState(next);
    playSound("undo");
  }

  function handleNewLegInternal() {
    if (!state) return;

    let nextPlayers = (state as any).players;

    if (rotateFirstPlayer && Array.isArray(nextPlayers) && nextPlayers.length > 1) {
      const [first, ...rest] = nextPlayers;
      nextPlayers = [...rest, first];
    }

    // si teams activé => on garde même ordre/teams et mêmes options
    const match = createCricketMatch(
      nextPlayers.map((p: any) => ({ id: p.id, name: p.name })),
      {
        withPoints: scoreMode === "points",
        maxRounds,
      }
    );

    const extra: any = {
      __meta: (state as any).__meta ?? null,
      teams: (state as any).teams ?? null,
    };

    setState(Object.assign({}, match, extra));
    setHitMode("S");
    setLegStartAt(Date.now());
    setShowEnd(false);
    playSound("start");
  }

  function handleQuitInternal() {
    setState(null);
    setPhase("setup");
    setHitMode("S");
    setLegStartAt(null);
    setShowEnd(false);
  }

  // --------------------------------------------------
  // CONSTRUCTION DU RECORD POUR L'HISTORIQUE
  // --------------------------------------------------

  function computeLegStatsForPlayer(p: any) {
    const marks = p?.marks || {};
    const totalMarks = CRICKET_TARGETS.reduce((acc: number, t: any) => acc + Number(marks[t] ?? 0), 0);
    const totalPoints = Number(p?.score ?? 0);
    const closedTargets = countClosedTargets(marks);

    const hits = Array.isArray(p?.hits) ? p.hits : [];
    const mini = computeCricketMiniStatsFromHits(hits);

    return {
      legs: 1,
      totalMarks,
      totalPoints,
      closedTargets,
      ...mini,
    };
  }

  function buildHistoryRecord(): SavedMatch | null {
    if (!state) return null;

    const now = Date.now();
    const createdAt = legStartAt ?? now;

    // Players "light" pour la liste
    const playersLite = (state as any).players.map((p: any) => {
      const isBot = String(p.id).startsWith("bot:");
      const prof = isBot ? null : profileById.get(p.id) ?? null;

      // tente de trouver avatar bot
      const botAvatar =
        isBot ? selectablePlayers.find((x) => x.id === p.id)?.avatarDataUrl ?? null : null;

      return {
        id: p.id,
        name: p.name,
        avatarDataUrl: (prof as any)?.avatarDataUrl ?? botAvatar ?? null,
        isBot: !!isBot,
      };
    });

    // Payload complet Cricket
    const playersPayload = (state as any).players.map((p: any) => {
      const hits = Array.isArray(p.hits) ? p.hits : [];
      const isBot = String(p.id).startsWith("bot:");
      const prof = isBot ? null : profileById.get(p.id) ?? null;

      return {
        id: p.id,
        name: p.name,
        isBot: !!isBot,
        score: p.score,
        marks: p.marks,
        hits,
        // dart set
        dartSetId: selectedDartSetId || null,
        // ✅ IMPORTANT pour StatsCricket.tsx
        legStats: computeLegStatsForPlayer(p),
        // meta visuel utile
        avatarDataUrl: (prof as any)?.avatarDataUrl ?? selectablePlayers.find((x) => x.id === p.id)?.avatarDataUrl ?? null,
      };
    });

    const totalDarts = playersPayload.reduce((acc: number, p: any) => acc + (Array.isArray(p.hits) ? p.hits.length : 0), 0);

    const teams = (state as any).teams ?? null;

    const rec: SavedMatch = {
      id: `cricket-${createdAt}-` + Math.random().toString(36).slice(2, 8),
      kind: "cricket",
      status: "finished",
      players: playersLite as any,
      winnerId: (state as any).winnerId ?? null,
      createdAt,
      updatedAt: now,
      summary: {
        legs: 1,
        darts: totalDarts,
        // cricket: on ne force pas avg3
        avg3ByPlayer: undefined,
        co: undefined,
      },
      payload: {
        mode: "cricket",
        withPoints: scoreMode === "points",
        maxRounds,
        rotateFirstPlayer,
        randomStart,
        teamMode,
        teams,
        dartSetId: selectedDartSetId || null,
        finishedReason: (state as any).finishedReason ?? null,
        roundNumber: (state as any).roundNumber ?? (state as any).round ?? null,
        players: playersPayload,
      } as any,
    };

    return rec;
  }

  function handleSaveAndQuit() {
    if (isFinished && onFinish) {
      const rec = buildHistoryRecord();
      if (rec) onFinish(rec);
    }
    handleQuitInternal();
  }

  function handleSaveAndReplay() {
    if (isFinished && onFinish) {
      const rec = buildHistoryRecord();
      if (rec) onFinish(rec);
    }
    handleNewLegInternal();
  }

  // --------------------------------------------------
  // PHASE SETUP RENDER
  // --------------------------------------------------

  if (phase === "setup") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: `radial-gradient(circle at top, #1c2540 0, #050712 55%, #000 100%)`,
          color: T.text,
          padding: "16px 12px calc(170px + env(safe-area-inset-bottom))",
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
              textShadow: "0 0 6px rgba(246,194,86,0.8), 0 0 18px rgba(246,194,86,0.6)",
            }}
          >
            Cricket
          </div>
          <div style={{ fontSize: 13, marginTop: 4, color: T.textSoft }}>
            Sélectionne les joueurs et les options pour cette manche.
          </div>
        </div>

        {/* JOUEURS — CARROUSEL HORIZONTAL */}
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
              marginBottom: 4,
            }}
          >
            Joueurs
          </div>

          <div style={{ fontSize: 12, color: T.textSoft, marginBottom: 10 }}>
            Sélectionne <strong>2 à 4 joueurs</strong>. L’ordre est celui de sélection (sauf si “départ aléatoire”).
          </div>

          <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
            <button
              onClick={() => {
                const el = document.getElementById("cricket-profiles-scroll");
                if (el) el.scrollBy({ left: -90, behavior: "smooth" });
              }}
              style={{
                position: "absolute",
                left: -4,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 10,
                background: "rgba(0,0,0,0.6)",
                border: `1px solid ${T.borderSoft}`,
                color: T.gold,
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 0 10px rgba(0,0,0,0.7)",
              }}
            >
              ‹
            </button>

            <div
              id="cricket-profiles-scroll"
              style={{
                display: "flex",
                gap: 14,
                overflowX: "auto",
                scrollSnapType: "x mandatory",
                padding: "0 26px 8px 26px",
              }}
            >
              {selectablePlayers.map((p) => {
                const idx = selectedIds.indexOf(p.id);
                const isSelected = idx !== -1;

                return (
                  <div
                    key={p.id}
                    onClick={() => toggleProfile(p.id)}
                    style={{
                      scrollSnapAlign: "start",
                      minWidth: "25%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    {renderAvatarCircle(
                      { name: p.name, avatarDataUrl: p.avatarDataUrl ?? null },
                      { selected: isSelected, size: 58, mode: "setup", isBot: !!p.isBot }
                    )}

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        color: isSelected ? "#ffffff" : T.textSoft,
                        textAlign: "center",
                      }}
                    >
                      {p.name}
                    </div>

                    <div
                      style={{
                        marginTop: 2,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: isSelected ? "rgba(246,194,86,0.2)" : "rgba(255,255,255,0.07)",
                        color: isSelected ? T.gold : T.textSoft,
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {isSelected ? `J${idx + 1}` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                const el = document.getElementById("cricket-profiles-scroll");
                if (el) el.scrollBy({ left: 90, behavior: "smooth" });
              }}
              style={{
                position: "absolute",
                right: -4,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 10,
                background: "rgba(0,0,0,0.6)",
                border: `1px solid ${T.borderSoft}`,
                color: T.gold,
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 0 10px rgba(0,0,0,0.7)",
              }}
            >
              ›
            </button>
          </div>
        </div>

        {/* PARAMÈTRES */}
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

          <div style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.5 }}>
            Mode Cricket standard :{" "}
            <span style={{ color: T.text }}>20, 19, 18, 17, 16, 15 &amp; Bull</span>{" "}
            (fermures à 3 marques, sur-marques = points si les autres n&apos;ont pas fermé).
          </div>
        </div>

        {/* OPTIONS AVANCÉES */}
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
            <span style={{ fontSize: 13, color: T.textSoft }}>Mode de score</span>
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
                  background: scoreMode === "points" ? "linear-gradient(135deg,#22c55e,#16a34a)" : "transparent",
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
                  background: scoreMode === "no-points" ? "linear-gradient(135deg,#6b7280,#4b5563)" : "transparent",
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
            <span style={{ fontSize: 13, color: T.textSoft }}>Nombre max de manches</span>
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
                      border: active ? `1px solid ${T.gold}` : `1px solid ${T.borderSoft}`,
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
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 13, color: T.textSoft }}>
              Premier joueur tourne{" "}
              <span style={{ opacity: 0.7 }}>(le lanceur 1 passe en dernier à chaque nouvelle manche)</span>
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

          {/* Départ aléatoire */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: T.textSoft }}>
              Ordre de départ aléatoire{" "}
              <span style={{ opacity: 0.7 }}>(sinon = ordre de sélection)</span>
            </span>
            <button
              type="button"
              onClick={() => setRandomStart((v) => !v)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 999,
                border: "none",
                background: randomStart ? "#22c55e" : "#4b5563",
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
                  left: randomStart ? 22 : 2,
                  width: 20,
                  borderRadius: "999px",
                  background: "#0b1120",
                  transition: "left 0.15s ease",
                }}
              />
            </button>
          </div>

          {/* 2v2 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: T.textSoft }}>
              Mode équipe 2v2{" "}
              <span style={{ opacity: 0.7 }}>(4 joueurs, équipes auto)</span>
            </span>
            <button
              type="button"
              onClick={() => setTeamMode((v) => !v)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 999,
                border: "none",
                background: teamMode ? "#22c55e" : "#4b5563",
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
                  left: teamMode ? 22 : 2,
                  width: 20,
                  borderRadius: "999px",
                  background: "#0b1120",
                  transition: "left 0.15s ease",
                }}
              />
            </button>
          </div>

          {/* compléter avec bots */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 13, color: T.textSoft }}>
              Compléter avec bots{" "}
              <span style={{ opacity: 0.7 }}>(si tu es 3 → ajoute 1 bot)</span>
            </span>
            <button
              type="button"
              onClick={() => setFillWithBots((v) => !v)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 999,
                border: "none",
                background: fillWithBots ? "#22c55e" : "#4b5563",
                position: "relative",
                cursor: "pointer",
                padding: 2,
                opacity: teamMode ? 1 : 0.55,
              }}
              disabled={!teamMode}
              title={!teamMode ? "Active d’abord le mode 2v2" : ""}
            >
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  bottom: 2,
                  left: fillWithBots ? 22 : 2,
                  width: 20,
                  borderRadius: "999px",
                  background: "#0b1120",
                  transition: "left 0.15s ease",
                }}
              />
            </button>
          </div>
        </div>

        {/* DART SET */}
        {dartSets.length > 0 && (
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
              Fléchettes
            </div>

            <select
              value={selectedDartSetId}
              onChange={(e) => setSelectedDartSetId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 14,
                border: `1px solid ${T.borderSoft}`,
                background: "#050816",
                color: "#fff",
                fontWeight: 700,
                outline: "none",
              }}
            >
              {dartSets.map((ds) => (
                <option key={ds.id} value={ds.id} style={{ color: "#000" }}>
                  {(ds as any).name ?? "Set"}
                </option>
              ))}
            </select>

            <div style={{ marginTop: 6, fontSize: 12, color: T.textSoft }}>
              Sauvegardé dans History → stats possibles par set.
            </div>
          </div>
        )}

        {/* BOUTON LANCER */}
        <div style={{ position: "fixed", left: 0, right: 0, bottom: `calc(86px + env(safe-area-inset-bottom))`, padding: "0 16px" }}>
          <button
            type="button"
            onClick={handleStartMatch}
            disabled={!canStart}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 999,
              border: "none",
              background: canStart ? "linear-gradient(135deg,#ffc63a,#ffaf00)" : "linear-gradient(135deg,#6b7280,#4b5563)",
              color: canStart ? "#211500" : "#e5e7eb",
              fontSize: 15,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.4,
              cursor: canStart ? "pointer" : "not-allowed",
              boxShadow: canStart ? "0 0 20px rgba(240,177,42,.35)" : "none",
            }}
          >
            Lancer la partie
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // PHASE PLAY
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
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Configuration manquante</div>
          <div style={{ fontSize: 14, color: T.textSoft, marginBottom: 16 }}>
            Retourne à l&apos;écran de préparation pour lancer une partie de Cricket.
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
  const thrown = Math.max(0, Math.min(totalDartsPerTurn, totalDartsPerTurn - (state as any).remainingDarts));

  const activePlayerIndex = (state as any).players.findIndex((p: any) => p.id === currentPlayer.id);
  const activeAccent = ACCENTS[activePlayerIndex >= 0 ? activePlayerIndex : 0];

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
    const isClosed = marks >= 3;

    const darkerAccent = darkenColor(accent, 0.55);

    const background = isClosed ? accent : "rgba(15,23,42,0.95)";
    const borderColor = isClosed ? darkerAccent : hasMarks ? "rgba(148,163,184,0.9)" : "rgba(51,65,85,0.9)";

    const boxShadow = isClosed ? `0 0 18px ${accent}aa` : hasMarks && isActive ? `0 0 12px ${accent}99` : "none";

    return (
      <div
        style={{
          height: 32,
          borderRadius: 10,
          background,
          border: `1px solid ${borderColor}`,
          boxShadow,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2px 0",
          transition: "all 0.12s ease",
        }}
      >
        {!hasMarks ? null : isClosed ? (
          <CricketMarkIcon marks={3} color={accent} size={36} glow={isActive} />
        ) : (
          <CricketMarkIcon marks={marks} color={accent} size={28} glow={isActive} />
        )}
      </div>
    );
  }

  const winnerName = (() => {
    const wid = (state as any).winnerId;
    if (!wid) return null;
    const p = (state as any).players.find((x: any) => x.id === wid);
    return p?.name ?? null;
  })();

  const finishedReason = (state as any).finishedReason;

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
      {/* HEADER */}
      <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: T.gold,
                textShadow: "0 0 6px rgba(246,194,86,0.8), 0 0 18px rgba(246,194,86,0.7)",
              }}
            >
              Cricket
            </div>

            <button
              onClick={() => setShowHelp(true)}
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                border: "1px solid rgba(246,194,86,0.6)",
                background: "rgba(0,0,0,0.4)",
                color: T.gold,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                textShadow: "0 0 6px rgba(246,194,86,0.8)",
                boxShadow: "0 0 8px rgba(246,194,86,0.5)",
              }}
            >
              i
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {Array.from({ length: totalDartsPerTurn }).map((_, i) => {
              const active = i < thrown;
              return (
                <div
                  key={i}
                  style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <DartIconColorizable color={activeAccent} active={active} size={30} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL AIDE */}
      {showHelp && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 999,
          }}
          onClick={() => setShowHelp(false)}
        >
          <div
            style={{
              background: "#111827",
              borderRadius: 18,
              padding: 20,
              border: "1px solid rgba(246,194,86,0.4)",
              boxShadow: "0 0 20px rgba(246,194,86,0.4)",
              maxWidth: 340,
              color: "#fff",
              fontSize: 14,
              lineHeight: 1.45,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, color: T.gold, textAlign: "center" }}>
              Règles du Cricket
            </div>

            <div>
              • Tu dois fermer <strong>15,16,17,18,19,20 & Bull</strong>
              <br />
              • Pour fermer : <strong>3 marques</strong>
              <br />
              • Si tu dépasses 3 marques alors que les autres n’ont pas fermé, tu marques des <strong>points</strong>
              <br />
              • Si tous les joueurs ont fermé une valeur : plus de points possibles
              <br />
              • MISS : <strong>0 à 14</strong> = son “bust”
            </div>

            <button
              onClick={() => setShowHelp(false)}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "10px 0",
                borderRadius: 999,
                background: T.gold,
                border: "none",
                color: "#402800",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ✅ MODAL FIN DE PARTIE */}
      {showEnd && isFinished && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.68)",
            backdropFilter: "blur(7px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
            zIndex: 1000,
          }}
          onClick={() => setShowEnd(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 390,
              borderRadius: 18,
              background: "#111827",
              border: "1px solid rgba(246,194,86,0.45)",
              boxShadow: "0 0 24px rgba(246,194,86,0.25)",
              padding: 16,
              color: "#fff",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                letterSpacing: 1.2,
                color: T.gold,
                textAlign: "center",
                textShadow: "0 0 10px rgba(246,194,86,0.65)",
                marginBottom: 6,
              }}
            >
              Fin de partie
            </div>

            <div style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
              {winnerName ? (
                <>
                  Vainqueur : <strong style={{ color: "#fff" }}>{winnerName}</strong>
                </>
              ) : (
                "Partie terminée"
              )}
              {finishedReason === "maxRounds" && (
                <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                  Arrêt automatique : <strong>{maxRounds}</strong> manches
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: scoreMode === "points" ? "1.6fr .9fr .8fr .8fr" : "1.6fr .9fr .8fr",
                  padding: "8px 10px",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: "rgba(255,255,255,0.7)",
                  background: "rgba(0,0,0,0.35)",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div>Joueur</div>
                <div style={{ textAlign: "right" }}>Marks</div>
                <div style={{ textAlign: "right" }}>Fermés</div>
                {scoreMode === "points" && <div style={{ textAlign: "right" }}>Pts</div>}
              </div>

              {(state as any).players.map((p: any, idx: number) => {
                const accent = ACCENTS[idx % ACCENTS.length];
                const marksTotal = countMarksTotal(p.marks);
                const closed = countClosedTargets(p.marks);
                const winner = p.id === (state as any).winnerId;
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: scoreMode === "points" ? "1.6fr .9fr .8fr .8fr" : "1.6fr .9fr .8fr",
                      padding: "8px 10px",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      background: winner ? "rgba(246,194,86,0.12)" : "transparent",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: accent,
                          boxShadow: `0 0 10px ${accent}aa`,
                          flexShrink: 0,
                        }}
                      />
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.name}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 13, fontWeight: 800 }}>{marksTotal}</div>
                    <div style={{ textAlign: "right", fontSize: 13, fontWeight: 800 }}>{closed}</div>
                    {scoreMode === "points" && (
                      <div style={{ textAlign: "right", fontSize: 13, fontWeight: 800 }}>{p.score}</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={handleSaveAndQuit}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 999,
                  border: "none",
                  background: "linear-gradient(135deg,#ef4444,#b91c1c)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  cursor: "pointer",
                }}
              >
                Sauver & quitter
              </button>
              <button
                onClick={handleSaveAndReplay}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 999,
                  border: "none",
                  background: "linear-gradient(135deg,#ffc63a,#ffaf00)",
                  color: "#211500",
                  fontSize: 13,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  cursor: "pointer",
                }}
              >
                Rejouer
              </button>
            </div>

            <button
              onClick={() => setShowEnd(false)}
              style={{
                marginTop: 10,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.25)",
                color: "rgba(255,255,255,0.85)",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1,
                cursor: "pointer",
              }}
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {/* CARTES JOUEURS */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(state as any).players.map((p: any, idx: number) => {
          const isActive = p.id === currentPlayer.id;
          const isWinnerPlayer = p.id === (state as any).winnerId;
          const isBot = String(p.id).startsWith("bot:");

          const prof = isBot ? null : profileById.get(p.id) ?? null;
          const botAvatar = isBot ? selectablePlayers.find((x) => x.id === p.id)?.avatarDataUrl ?? null : null;

          const accent = ACCENTS[idx % ACCENTS.length];
          const baseColor = playerCardColors[idx % playerCardColors.length];

          const bg = isActive ? "linear-gradient(135deg,#111827,#020617)" : baseColor;
          const border = isActive ? `1px solid ${accent}` : `1px solid ${T.borderSoft}`;
          const glow = isActive ? `0 0 22px ${accent}80` : "0 0 6px rgba(0,0,0,0.7)";

          const scoreColor = isActive ? "#fef9c3" : isWinnerPlayer ? accent : T.text;
          const scoreShadow = isActive ? `0 0 10px ${accent}cc, 0 0 25px ${accent}80` : isWinnerPlayer ? `0 0 10px ${accent}aa` : "none";

          const totalPlayers = (state as any).players.length;
          const avatarSize = totalPlayers === 2 ? 58 : totalPlayers === 4 ? 40 : 48;
          const layout4Players = totalPlayers === 4;

          return (
            <div
              key={p.id}
              style={{
                flex: 1,
                padding: layout4Players ? "8px 6px" : "10px",
                borderRadius: 16,
                background: bg,
                border,
                boxShadow: glow,
                display: "flex",
                flexDirection: layout4Players ? "column" : "row",
                alignItems: "center",
                justifyContent: "center",
                gap: layout4Players ? 6 : 8,
                transition: "all 0.15s ease",
              }}
            >
              {renderAvatarCircle(
                { name: p.name, avatarDataUrl: (prof as any)?.avatarDataUrl ?? botAvatar ?? null },
                { selected: isActive || isWinnerPlayer, size: avatarSize, mode: "play", isBot }
              )}

              {layout4Players ? (
                <div style={{ fontSize: 22, fontWeight: 900, color: scoreColor, textShadow: scoreShadow, marginTop: 2 }}>
                  {p.score}
                </div>
              ) : (
                <div style={{ flex: 1, textAlign: "right", fontSize: 26, fontWeight: 900, color: scoreColor, textShadow: scoreShadow }}>
                  {p.score}
                </div>
              )}
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
        {((state as any).players.length === 2 && (
          <>
            {CRICKET_UI_TARGETS.map((target) => {
              const label = target === 25 ? "Bull" : String(target);
              const colColor = getTargetColor(target);
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
                  <MarkCell marks={((state as any).players[0].marks as any)[target]} playerIndex={0} isActive={(state as any).players[0].id === currentPlayer.id} />

                  <div
                    style={{
                      fontSize: label === "Bull" ? 16 : 18,
                      fontWeight: 900,
                      textAlign: "center",
                      color: colColor,
                      textShadow: `0 0 8px ${colColor}cc, 0 0 18px ${colColor}80`,
                      letterSpacing: 1,
                      padding: "2px 0",
                      borderLeft: `1px solid rgba(148,163,184,0.5)`,
                      borderRight: `1px solid rgba(148,163,184,0.5)`,
                    }}
                  >
                    {label}
                  </div>

                  <MarkCell marks={((state as any).players[1].marks as any)[target]} playerIndex={1} isActive={(state as any).players[1].id === currentPlayer.id} />
                </div>
              );
            })}
          </>
        )) ||
          (((state as any).players.length === 4 && (
            <>
              {CRICKET_UI_TARGETS.map((target) => {
                const label = target === 25 ? "Bull" : String(target);
                const colColor = getTargetColor(target);
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
                    <MarkCell marks={((state as any).players[0].marks as any)[target]} playerIndex={0} isActive={(state as any).players[0].id === currentPlayer.id} />
                    <MarkCell marks={((state as any).players[1].marks as any)[target]} playerIndex={1} isActive={(state as any).players[1].id === currentPlayer.id} />

                    <div
                      style={{
                        fontSize: label === "Bull" ? 16 : 18,
                        fontWeight: 900,
                        textAlign: "center",
                        color: colColor,
                        textShadow: `0 0 8px ${colColor}cc, 0 0 18px ${colColor}80`,
                        letterSpacing: 1,
                        padding: "2px 0",
                        borderLeft: `1px solid rgba(148,163,184,0.5)`,
                        borderRight: `1px solid rgba(148,163,184,0.5)`,
                      }}
                    >
                      {label}
                    </div>

                    <MarkCell marks={((state as any).players[2].marks as any)[target]} playerIndex={2} isActive={(state as any).players[2].id === currentPlayer.id} />
                    <MarkCell marks={((state as any).players[3].marks as any)[target]} playerIndex={3} isActive={(state as any).players[3].id === currentPlayer.id} />
                  </div>
                );
              })}
            </>
          )) || (
            <>
              {CRICKET_UI_TARGETS.map((target) => {
                const label = target === 25 ? "Bull" : String(target);
                const colColor = getTargetColor(target);
                return (
                  <div
                    key={target}
                    style={{
                      display: "grid",
                      gridTemplateColumns: `40px repeat(${(state as any).players.length}, 1fr)`,
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
                        color: colColor,
                        textShadow: `0 0 8px ${colColor}cc, 0 0 18px ${colColor}80`,
                        letterSpacing: 1,
                        padding: "2px 0",
                        borderRight: `1px solid rgba(148,163,184,0.5)`,
                      }}
                    >
                      {label}
                    </div>

                    {(state as any).players.map((pp: any, idx: number) => (
                      <MarkCell key={pp.id} marks={(pp.marks as any)[target]} playerIndex={idx} isActive={pp.id === currentPlayer.id} />
                    ))}
                  </div>
                );
              })}
            </>
          ))}
      </div>

      {/* DOUBLE / TRIPLE / BULL */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setHitMode("D")}
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
            background: "linear-gradient(135deg,#0f766e,#0b3b4b)",
            color: "#7dd3fc",
            boxShadow: hitMode === "D" ? "0 0 20px rgba(56,189,248,0.8)" : "0 0 8px rgba(15,23,42,0.9)",
            transition: "all 0.12s ease",
          }}
        >
          Double
        </button>

        <button
          type="button"
          onClick={() => setHitMode("T")}
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
            background: "linear-gradient(135deg,#7e22ce,#4c1d95)",
            color: "#f9a8d4",
            boxShadow: hitMode === "T" ? "0 0 20px rgba(244,114,182,0.8)" : "0 0 8px rgba(15,23,42,0.9)",
            transition: "all 0.12s ease",
          }}
        >
          Triple
        </button>

        <button
          type="button"
          onClick={handleBull}
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
            background: "linear-gradient(135deg,#059669,#065f46)",
            color: "#bbf7d0",
            boxShadow: "0 0 16px rgba(34,197,94,0.8)",
            transition: "all 0.12s ease",
          }}
        >
          Bull
        </button>
      </div>

      {/* CLAVIER 0–20 */}
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 8 }}>
          {Array.from({ length: 21 }).map((_, value) => {
            const isCricketNumber = value >= 15 && value <= 20;
            const accent = isCricketNumber ? getTargetColor(value as CricketTarget) : "#111827";

            return (
              <button
                key={value}
                onClick={() => handleKeyPress(value)}
                style={{
                  padding: "11px 0",
                  borderRadius: 16,
                  border: isCricketNumber ? `1px solid ${accent}dd` : "none",
                  cursor: "pointer",
                  fontSize: 16,
                  fontWeight: 700,
                  background: "linear-gradient(135deg,#111827,#020617)",
                  color: isCricketNumber ? accent : "#f9fafb",
                  boxShadow: isCricketNumber ? `0 0 12px ${accent}66` : "0 0 14px rgba(0,0,0,0.65)",
                  transition: "all 0.1s ease",
                }}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>

      {/* BAS */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={handleUndo}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 999,
            border: "none",
            background: "linear-gradient(135deg,#dc2626,#7f1d1d)",
            color: "#fee2e2",
            fontSize: 14,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1.1,
            cursor: "pointer",
            boxShadow: "0 0 16px rgba(248,113,113,0.8)",
          }}
        >
          Annuler
        </button>

        {isFinished && (
          <button
            onClick={() => setShowEnd(true)}
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

        <button
          onClick={() => (isFinished ? setShowEnd(true) : null)}
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
