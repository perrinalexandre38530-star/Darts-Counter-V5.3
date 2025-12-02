// =============================================================
// src/pages/X01PlayV3.tsx
// X01 V3 — moteur neuf + UI du "beau" X01Play
// + Tour automatique des BOTS (isBot / botLevel)
// + Sauvegarde Historique à la fin du match
// + Autosave localStorage (reprise après coupure)
// =============================================================

import React from "react";

import type {
  X01ConfigV3,
  X01PlayerId,
  X01DartInputV3,
} from "../types/x01v3";
import { useX01EngineV3 } from "../hooks/useX01EngineV3";
import type { Dart as UIDart } from "../lib/types";

import Keypad from "../components/Keypad";
import { DuelHeaderCompact } from "../components/DuelHeaderCompact";
import X01LegOverlayV3 from "../lib/x01v3/x01LegOverlayV3";

import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { History } from "../lib/history";

// ---------------- Constantes visuelles / autosave ----------------

const NAV_HEIGHT = 64;
const CONTENT_MAX = 520;
const AUTOSAVE_KEY = "x01v3:autosave";

const miniCard: React.CSSProperties = {
  width: "clamp(150px, 22vw, 190px)",
  height: 86,
  padding: 6,
  borderRadius: 12,
  background:
    "linear-gradient(180deg,rgba(22,22,26,.96),rgba(14,14,16,.98))",
  border: "1px solid rgba(255,255,255,.10)",
  boxShadow: "0 10px 22px rgba(0,0,0,.35)",
};

const miniText: React.CSSProperties = {
  fontSize: 12,
  color: "#d9dbe3",
  lineHeight: 1.25,
};

const miniRankRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "3px 6px",
  borderRadius: 6,
  background: "rgba(255,255,255,.04)",
  marginBottom: 3,
  fontSize: 11,
  lineHeight: 1.15,
};

const miniRankName: React.CSSProperties = {
  fontWeight: 700,
  color: "#ffcf57",
};

const miniRankScore: React.CSSProperties = {
  fontWeight: 800,
  color: "#ffcf57",
};

const miniRankScoreFini: React.CSSProperties = {
  fontWeight: 800,
  color: "#7fe2a9",
};

// ---------------- Types & helpers locaux ----------------

type Props = {
  config: X01ConfigV3;
  onExit?: () => void; // QUITTER -> Home (via App)
  onShowSummary?: (matchId: string) => void; // RÉSUMÉ -> Historique détaillé
  onReplayNewConfig?: () => void; // REJOUER -> changer paramètres (App)
};

type MiniRankingRow = {
  id: X01PlayerId;
  name: string;
  score: number;
  legsWon: number;
  setsWon: number;
  avg3: number;
};

type X01V3AutosaveSnapshot = {
  id: string;
  createdAt: number;
  config: X01ConfigV3;
  darts: X01DartInputV3[];
};

function fmt(d?: UIDart) {
  if (!d) return "—";
  if (d.v === 0) return "MISS";
  if (d.v === 25) return d.mult === 2 ? "DBULL" : "BULL";
  const prefix = d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S";
  return `${prefix}${d.v}`;
}

function chipStyle(d?: UIDart, red = false): React.CSSProperties {
  if (!d)
    return {
      background: "rgba(255,255,255,.06)",
      color: "#bbb",
      border: "1px solid rgba(255,255,255,.08)",
    };

  if (red)
    return {
      background: "rgba(200,30,30,.18)",
      color: "#ff8a8a",
      border: "1px solid rgba(255,80,80,.35)",
    };

  if (d.v === 25 && d.mult === 2)
    return {
      background: "rgba(13,160,98,.18)",
      color: "#8ee6bf",
      border: "1px solid rgba(13,160,98,.35)",
    };

  if (d.v === 25)
    return {
      background: "rgba(13,160,98,.12)",
      color: "#7bd6b0",
      border: "1px solid rgba(13,160,98,.3)",
    };

  if (d.mult === 3)
    return {
      background: "rgba(179,68,151,.18)",
      color: "#ffd0ff",
      border: "1px solid rgba(179,68,151,.35)",
    };

  if (d.mult === 2)
    return {
      background: "rgba(46,150,193,.18)",
      color: "#cfeaff",
      border: "1px solid rgba(46,150,193,.35)",
    };

  return {
    background: "rgba(255,187,51,.12)",
    color: "#ffc63a",
    border: "1px solid rgba(255,187,51,.4)",
  };
}

function dartValue(d: UIDart) {
  if (d.v === 25 && d.mult === 2) return 50;
  return d.v * d.mult;
}

// Checkout suggestion à partir de la structure V3
function formatCheckoutFromVisit(suggestion: any): string {
  if (!suggestion?.darts || !Array.isArray(suggestion.darts)) return "";
  return suggestion.darts
    .map((d: any) => {
      const seg = d.segment === 25 ? "BULL" : String(d.segment);
      if (d.multiplier === 1) return seg;
      if (d.multiplier === 2) return `D${seg}`;
      if (d.multiplier === 3) return `T${seg}`;
      return seg;
    })
    .join(" • ");
}

// Pastilles pour la dernière volée d’un joueur
function renderLastVisitChips(
  pid: string,
  lastVisits: Record<string, UIDart[]>
) {
  const darts = lastVisits[pid] ?? [];
  if (!darts.length) return null;

  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      {darts.map((d, i) => {
        const st = chipStyle(d, false);
        return (
          <span
            key={i}
            style={{
              minWidth: 36,
              padding: "2px 8px",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
              background: st.background,
              border: st.border as string,
              color: st.color as string,
            }}
          >
            {fmt(d)}
          </span>
        );
      })}
    </span>
  );
}

/* ---------------------------------------------------
   Petit "cerveau" BOT local (placeholder)
   - plus tard tu pourras le déplacer dans ../lib/botBrain.ts
--------------------------------------------------- */

type BotLevel = "easy" | "medium" | "hard" | "pro" | "legend" | undefined;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type BotStyle = "balanced" | "aggressive" | "safe" | "clutch";

function computeBotVisit(
  level: BotLevel,
  currentScore: number,
  doubleOut: boolean,
  styleOverride?: BotStyle
): UIDart[] {
  const darts: UIDart[] = [];
  const lvl = level || "easy";

  // -----------------------------
  // Profils de précision par niveau
  // -----------------------------
  type EffLevel = "easy" | "medium" | "hard" | "pro" | "legend";

  type BotSkillProfile = {
    miss: number;   // probabilité de MISS
    single: number; // prob S
    double: number; // prob D
    triple: number; // prob T
  };

  const BOT_SKILL: Record<EffLevel, BotSkillProfile> = {
    easy:   { miss: 0.45, single: 0.40, double: 0.10, triple: 0.05 },
    medium: { miss: 0.30, single: 0.40, double: 0.20, triple: 0.10 },
    hard:   { miss: 0.18, single: 0.35, double: 0.25, triple: 0.22 },
    pro:    { miss: 0.12, single: 0.33, double: 0.25, triple: 0.30 },
    legend: { miss: 0.06, single: 0.29, double: 0.25, triple: 0.40 },
  };

  const effLevel: EffLevel =
    lvl === "medium" ||
    lvl === "hard" ||
    lvl === "pro" ||
    lvl === "legend"
      ? (lvl as EffLevel)
      : "easy";

  const skill = BOT_SKILL[effLevel];

  // -----------------------------
  // Style (pas besoin de le stocker en dur, on dérive du niveau)
  // -----------------------------
  const style: BotStyle =
    styleOverride ??
    (effLevel === "easy"
      ? "safe"
      : effLevel === "medium"
      ? "balanced"
      : effLevel === "hard"
      ? "aggressive"
      : effLevel === "pro"
      ? "aggressive"
      : "clutch"); // legend

  // Segments favoris pour le scoring (T20/T19 privilégiés)
  const preferredSegs = [20, 20, 20, 19, 19, 18, 17, 16];

  let remaining = currentScore;

  // Helper: calcul valeur d'une fléchette
  const dartVal = (d: UIDart) =>
    d.v === 25 && d.mult === 2 ? 50 : d.v * d.mult;

  // Helper: choix d'un dart de checkout (simple mais efficace)
  function tryCheckout(remainingScore: number): UIDart | null {
    if (!doubleOut) return null;

    // Checkouts 1 dart
    if (remainingScore === 50) {
      return { v: 25, mult: 2 }; // DBULL
    }
    if (remainingScore <= 40 && remainingScore % 2 === 0) {
      return { v: remainingScore / 2, mult: 2 };
    }

    // Petits setups "safe" pour laisser 32 ou 40
    if (remainingScore > 40 && remainingScore <= 80) {
      // laisser 40 (D20)
      if (remainingScore - 40 > 0 && (remainingScore - 40) <= 20) {
        return { v: remainingScore - 40, mult: 1 };
      }
      // laisser 32 (D16)
      if (remainingScore - 32 > 0 && (remainingScore - 32) <= 20) {
        return { v: remainingScore - 32, mult: 1 };
      }
    }

    return null;
  }

  for (let i = 0; i < 3; i++) {
    if (remaining <= 0) break;

    // 1) Probabilité de MISS, modulée par le style
    let missThreshold = skill.miss;
    if (style === "clutch" && remaining <= 80) {
      missThreshold *= 0.5; // les legends ratent beaucoup moins en fin de leg
    } else if (style === "safe" && remaining > 200) {
      missThreshold *= 1.1; // safe un peu plus brouillon loin du finish
    }

    const rMiss = Math.random();
    if (rMiss < missThreshold) {
      darts.push({ v: 0, mult: 1 });
      continue;
    }

    // 2) Tentative checkout / setup si on est dans la zone 0–110
    if (remaining <= 110) {
      const finisher = tryCheckout(remaining);
      if (finisher) {
        darts.push(finisher);
        remaining -= dartVal(finisher);
        continue;
      }
    }

    // 3) Sinon, on score
    const seg =
      remaining > 170
        ? 20 // très loin -> full T20
        : preferredSegs[randomInt(0, preferredSegs.length - 1)];

    // Base sur le profil
    const r = Math.random();
    const singleThreshold = skill.single;
    const doubleThreshold = skill.single + skill.double;
    let mult: 1 | 2 | 3;

    if (r < singleThreshold) mult = 1;
    else if (r < doubleThreshold) mult = 2;
    else mult = 3;

    // Modulation par style
    if (style === "aggressive" && remaining > 120 && mult === 1) {
      // prend plus souvent le risque du T20/T19
      if (Math.random() < 0.6) mult = 3;
    }

    if (style === "safe" && remaining <= 120 && mult === 3) {
      // en dessous de 120, il évite les triples trop dangereux
      if (Math.random() < 0.7) mult = 1;
    }

    // Protector anti-bust débile quand on approche du finish
    const potential = seg * mult;
    if (doubleOut && remaining <= 80 && remaining - potential < 2) {
      // si ça bust ou laisse 1, on passe en simple
      mult = 1;
    }

    const d: UIDart = { v: seg, mult };
    darts.push(d);
    remaining = Math.max(remaining - dartVal(d), 0);
  }

  return darts;
}

// =============================================================
// Composant principal X01PlayV3
// =============================================================

export default function X01PlayV3({
  config,
  onExit,
  onShowSummary,
  onReplayNewConfig,
}: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  // Pour éviter de sauvegarder le match plusieurs fois (History)
  const hasSavedMatchRef = React.useRef(false);

  // Autosave : log de toutes les fléchettes (dans l'ordre global)
  const replayDartsRef = React.useRef<X01DartInputV3[]>([]);
  const isReplayingRef = React.useRef(false);
  const hasReplayedRef = React.useRef(false);

  const {
    state,
    liveStatsByPlayer,
    activePlayerId,
    scores,
    status,
    throwDart,
    startNextLeg,
  } = useX01EngineV3({ config });

  const players = config.players;
  const activePlayer = players.find((p) => p.id === activePlayerId) || null;

  const setsTarget = config.setsToWin ?? 1;
  const legsTarget = config.legsPerSet ?? 1;
  const isDuel = players.length === 2;
  const useSetsUi = isDuel && setsTarget > 1;

  // ---------------- Avatars (depuis config.players) ----------------

  const profileById = React.useMemo(() => {
    const m: Record<string, { avatarDataUrl: string | null; name: string }> =
      {};
    for (const p of players as any[]) {
      m[p.id] = {
        avatarDataUrl:
          p.avatarDataUrl ??
          (p as any).avatarUrl ??
          (p as any).photoUrl ??
          null,
        name: p.name,
      };
    }
    return m;
  }, [players]);

  const currentScore =
    (activePlayer && scores[activePlayer.id]) ?? config.startScore;

  const currentVisit = state.visit;

  // double-out ? on essaie de lire config
  const doubleOut =
    (config as any).doubleOut === true ||
    (config as any).finishMode === "double" ||
    (config as any).outMode === "double";

  // =====================================================
  // Autosave : persistance / reprise (A1 basé sur la liste des darts)
  // =====================================================

  const persistAutosave = React.useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const snap: X01V3AutosaveSnapshot = {
        id: `x01v3-${config.startScore}-${config.players
          .map((p: any) => p.name)
          .join("-")}`,
        createdAt: Date.now(),
        config,
        darts: replayDartsRef.current,
      };
      window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snap));
    } catch (e) {
      console.warn("[X01PlayV3] persistAutosave failed", e);
    }
  }, [config]);

  // Reprise auto : au premier rendu, on rejoue toutes les fléchettes sauvegardées
  React.useEffect(() => {
    if (hasReplayedRef.current) return;
    hasReplayedRef.current = true;

    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const snap = JSON.parse(raw) as X01V3AutosaveSnapshot;
      if (!snap || !Array.isArray(snap.darts)) return;

      const snapPlayers = (snap.config?.players ?? []) as any[];

      // Compat rapide : même startScore + même nombre de joueurs + mêmes noms à l’index
      if (
        snap.config?.startScore !== config.startScore ||
        !Array.isArray(snapPlayers) ||
        snapPlayers.length !== config.players.length
      ) {
        return;
      }

      const sameNames = snapPlayers.every((p, idx) => {
        const target = config.players[idx] as any;
        return p.name === target.name;
      });
      if (!sameNames) return;

      // OK, on rejoue
      isReplayingRef.current = true;
      replayDartsRef.current = snap.darts.slice();

      snap.darts.forEach((d) => {
        throwDart(d);
      });

      isReplayingRef.current = false;
    } catch (e) {
      console.warn("[X01PlayV3] autosave resume failed", e);
    }
  }, [config, throwDart]);

  // Quand le match est terminé : on vide l’autosave
  React.useEffect(() => {
    if (status === "match_end") {
      replayDartsRef.current = [];
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(AUTOSAVE_KEY);
        } catch (e) {
          console.warn("[X01PlayV3] clear autosave failed", e);
        }
      }
    }
  }, [status]);

  // =====================================================
  // ÉTAT LOCAL KEYPAD (logique v1)
  // =====================================================

  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [lastVisitsByPlayer, setLastVisitsByPlayer] = React.useState<
    Record<string, UIDart[]>
  >({});

  // 🔒 garde-fou anti double-validation HUMAIN
  const isValidatingRef = React.useRef(false);

  function pushDart(value: number) {
    setCurrentThrow((prev) => {
      if (prev.length >= 3) return prev;
      const next: UIDart = { v: value, mult: multiplier } as UIDart;
      return [...prev, next];
    });
    // ✅ on désélectionne Double / Triple après CHAQUE fléchette
    setMultiplier(1);
  }

  const handleNumber = (value: number) => {
    pushDart(value);
  };

  const handleBull = () => {
    pushDart(25);
  };

  const handleBackspace = () => {
    setCurrentThrow((prev) => prev.slice(0, -1));
  };

  const handleCancel = () => {
    setCurrentThrow([]);
    setMultiplier(1);
  };

  const validateThrow = () => {
    // 🛑 pas de volée vide
    if (!currentThrow.length) return;
    // 🛑 si déjà en train de valider (double tap / double évènement)
    if (isValidatingRef.current) return;
    isValidatingRef.current = true;

    const toSend = [...currentThrow];

    // 🔥 mémorise dernière volée pour pastilles (UI ONLY)
    const pid = activePlayerId;
    if (pid) {
      setLastVisitsByPlayer((m) => ({
        ...m,
        [pid]: toSend,
      }));
    }

    // Conversion vers input V3
    const inputs: X01DartInputV3[] = toSend.map((d) => ({
      segment: d.v === 25 ? 25 : d.v,
      multiplier: d.mult as 1 | 2 | 3,
    }));

    // moteur V3 : une fléchette = un appel
    inputs.forEach((input) => {
      throwDart(input);
    });

    // Autosave : on enrichit le log complet + on persiste
    replayDartsRef.current = replayDartsRef.current.concat(inputs);
    persistAutosave();

    setCurrentThrow([]);
    setMultiplier(1);
    isValidatingRef.current = false;
  };

  // =====================================================
  // STATS LIVE & MINI-RANKING
  // =====================================================

  const avg3ByPlayer: Record<string, number> = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of players as any[]) {
      const pid = p.id as X01PlayerId;
      const live = liveStatsByPlayer[pid];
      const dartsThrown = live?.dartsThrown ?? 0;
      if (!dartsThrown) {
        map[pid] = 0;
        continue;
      }
      const scoreNow = scores[pid] ?? config.startScore;
      const scored = config.startScore - scoreNow;
      if (scored <= 0) {
        map[pid] = 0;
        continue;
      }
      map[pid] = (scored / dartsThrown) * 3;
    }
    return map;
  }, [players, liveStatsByPlayer, scores, config.startScore]);

  const miniRanking: MiniRankingRow[] = React.useMemo(() => {
    return players
      .map((p: any) => {
        const pid = p.id as X01PlayerId;
        const avg3 = avg3ByPlayer[pid] ?? 0;
        return {
          id: pid,
          name: p.name,
          score: scores[pid] ?? config.startScore,
          legsWon: (state as any).legsWon?.[pid] ?? 0,
          setsWon: (state as any).setsWon?.[pid] ?? 0,
          avg3,
        };
      })
      .sort((a, b) => {
        if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
        if (b.legsWon !== a.legsWon) return b.legsWon - a.legsWon;
        return a.score - b.score;
      });
  }, [players, scores, state, config.startScore, avg3ByPlayer]);

  const liveRanking = React.useMemo(
    () =>
      miniRanking.map((r) => ({
        id: r.id,
        name: r.name,
        score: r.score,
      })),
    [miniRanking]
  );

  // Stats joueur actif
  const activeStats = activePlayer
    ? liveStatsByPlayer[activePlayer.id]
    : undefined;

  const curDarts = activeStats?.dartsThrown ?? 0;
  const curM3D = activePlayer
    ? (avg3ByPlayer[activePlayer.id] ?? 0).toFixed(2)
    : "0.00";
  const bestVisit = activeStats?.bestVisit ?? 0;

  // --- nouveaux compteurs live (garde pour Stats globales, pas affichés) ---
  const missCount =
    activeStats?.miss ??
    activeStats?.missCount ??
    activeStats?.misses ??
    0;

  const bustCount =
    activeStats?.bust ??
    activeStats?.bustCount ??
    activeStats?.busts ??
    0;

  const dBullCount =
    activeStats?.dBull ??
    activeStats?.doubleBull ??
    activeStats?.dBullCount ??
    0;

  const missPct =
    curDarts > 0 ? ((missCount / curDarts) * 100).toFixed(0) : "0";
  const bustPct =
    curDarts > 0 ? ((bustCount / curDarts) * 100).toFixed(0) : "0";
  const dBullPct =
    curDarts > 0 ? ((dBullCount / curDarts) * 100).toFixed(0) : "0";

  // =====================================================
  // Mesure header & keypad (pour scroll zone joueurs)
  // =====================================================

  const headerWrapRef = React.useRef<HTMLDivElement | null>(null);
  const [headerH, setHeaderH] = React.useState(0);

  React.useEffect(() => {
    const el = headerWrapRef.current;
    if (!el) return;
    const measure = () =>
      setHeaderH(Math.ceil(el.getBoundingClientRect().height));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const keypadWrapRef = React.useRef<HTMLDivElement | null>(null);
  const [keypadH, setKeypadH] = React.useState(0);

  React.useEffect(() => {
    const el = keypadWrapRef.current;
    if (!el) return;
    const measure = () =>
      setKeypadH(Math.ceil(el.getBoundingClientRect().height));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // =====================================================
  // Quitter / Rejouer / Résumé / Continuer
  // =====================================================

  function handleQuit() {
    if (onExit) {
      onExit();
      return;
    }
    if (typeof window !== "undefined") {
      window.history.back();
    }
  }

  // REJOUER même config : on relance l'écran avec la même config
  function handleReplaySameConfig() {
    // 🔁 Pour l’instant: reload complet de la page -> recrée un match X01V3
    if (typeof window !== "undefined") {
      window.location.reload();
      return;
    }
  }

  // NOUVELLE PARTIE (retour écran de config)
  function handleReplayNewConfigInternal() {
    if (onReplayNewConfig) {
      onReplayNewConfig();
      return;
    }
    // fallback : on quitte
    handleQuit();
  }

  // RÉSUMÉ : l'overlay envoie toujours un matchId: string
  function handleShowSummary(matchId: string) {
    if (!onShowSummary) return;
    const id = matchId || (state as any).matchId || "";
    onShowSummary(id);
  }

  // CONTINUER (3+ joueurs) : on laisse le moteur passer à la suite
  function handleContinueMulti() {
    startNextLeg();
  }

  // =====================================================
  // Sauvegarde du match dans l'Historique / Stats
  // =====================================================

  React.useEffect(() => {
    if (status !== "match_end") return;
    if (hasSavedMatchRef.current) return;
    hasSavedMatchRef.current = true;

    try {
      saveX01V3MatchToHistory({
        config,
        state,
        scores,
        liveStatsByPlayer,
      });
    } catch (err) {
      console.warn("[X01PlayV3] saveX01V3MatchToHistory failed", err);
    }
  }, [status, config, state, scores, liveStatsByPlayer]);

  // =====================================================
  // BOT : tour auto si joueur courant est un BOT
  // =====================================================

  const isBotTurn = !!(activePlayer && (activePlayer as any).isBot);
  const currentSetIndex = (state as any).currentSet ?? 1;
  const currentLegIndex = (state as any).currentLeg ?? 1;

  React.useEffect(() => {
    // Pendant la reprise depuis autosave, on NE JOUE PAS les bots
    if (isReplayingRef.current) return;

    if (
      !activePlayer ||
      !(activePlayer as any).isBot ||
      status === "leg_end" ||
      status === "set_end" ||
      status === "match_end"
    ) {
      return;
    }

    const pid = activePlayer.id;
    const scoreNow = scores[pid] ?? config.startScore;
    const level = ((activePlayer as any).botLevel as BotLevel) ?? "easy";

// style optionnel côté profil (sinon dérivé du niveau)
const style =
  ((activePlayer as any).botStyle as BotStyle) ?? undefined;

const timeout = setTimeout(() => {
  const visit = computeBotVisit(level, scoreNow, doubleOut, style);

  // UI : mémorise la volée du BOT ...
      setLastVisitsByPlayer((m) => ({
        ...m,
        [pid]: visit,
      }));

      const inputs: X01DartInputV3[] = [];

      visit.forEach((d) => {
        if (d.v <= 0) {
          // MISS = dart de valeur 0
          const inputMiss: X01DartInputV3 = {
            segment: 0 as any,
            multiplier: 1,
          };
          inputs.push(inputMiss);
          throwDart(inputMiss);
          return;
        }

        const input: X01DartInputV3 = {
          segment: d.v === 25 ? 25 : d.v,
          multiplier: d.mult as 1 | 2 | 3,
        };
        inputs.push(input);
        throwDart(input);
      });

      // Autosave : on enregistre aussi les volées des bots
      replayDartsRef.current = replayDartsRef.current.concat(inputs);
      persistAutosave();
    }, 650);

    return () => clearTimeout(timeout);
  }, [
    activePlayer,
    status,
    scores,
    config.startScore,
    currentSetIndex,
    currentLegIndex,
    throwDart,
    persistAutosave,
  ]);

  // =====================================================
  // Rendu principal : UI du "beau" X01Play
  // =====================================================

  return (
    <div
      className={`x01play-container theme-${theme.id}`}
      style={{ overflow: "hidden", minHeight: "100vh" }}
    >
      {/* HEADER FIXE */}
      <div
        ref={headerWrapRef}
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          top: 0,
          zIndex: 60,
          width: `min(100%, ${CONTENT_MAX}px)`,
          paddingInline: 10,
          paddingTop: 4,
          paddingBottom: 4,
        }}
      >
        {/* Barre haute */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            marginBottom: 6,
          }}
        >
          {/* BOUTON QUITTER */}
          <button
            onClick={handleQuit}
            style={{
              borderRadius: 10,
              padding: "5px 11px",
              border: "1px solid rgba(255,180,0,.3)",
              background: "linear-gradient(180deg, #ffc63a, #ffaf00)",
              color: "#1a1a1a",
              fontWeight: 900,
              boxShadow: "0 8px 18px rgba(255,170,0,.25)",
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            ← {t("common.quit", "Quitter")}
          </button>

          {/* HEADER COMPACT (AVATARS + SCORE) */}
          <div
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
            }}
          >
            {isDuel && useSetsUi && (
              <DuelHeaderCompact
                leftAvatarUrl={
                  profileById[players[0].id]?.avatarDataUrl ?? ""
                }
                rightAvatarUrl={
                  profileById[players[1].id]?.avatarDataUrl ?? ""
                }
                leftSets={(state as any).setsWon?.[players[0].id] ?? 0}
                rightSets={(state as any).setsWon?.[players[1].id] ?? 0}
                leftLegs={(state as any).legsWon?.[players[0].id] ?? 0}
                rightLegs={(state as any).legsWon?.[players[1].id] ?? 0}
              />
            )}
          </div>

          {/* CAPSULE SET / LEG */}
          <SetLegChip
            currentSet={(state as any).currentSet ?? 1}
            currentLegInSet={(state as any).currentLeg ?? 1}
            setsTarget={setsTarget}
            legsTarget={legsTarget}
            useSets={useSetsUi}
          />
        </div>

        {/* HEADER BLOCK (avatar + score + chips + mini ranking) */}
        <div
          style={{
            maxWidth: CONTENT_MAX,
            margin: "0 auto",
          }}
        >
          <HeaderBlock
            currentPlayer={activePlayer}
            currentAvatar={
              activePlayer
                ? profileById[activePlayer.id]?.avatarDataUrl ?? null
                : null
            }
            currentRemaining={currentScore}
            currentThrow={currentThrow}
            doubleOut={doubleOut}
            liveRanking={liveRanking}
            curDarts={curDarts}
            curM3D={curM3D}
            bestVisit={bestVisit}
            legsWon={(state as any).legsWon ?? {}}
            setsWon={(state as any).setsWon ?? {}}
            useSets={useSetsUi}
            currentVisit={currentVisit}
          />
        </div>
      </div>

      {/* ZONE JOUEURS — SCROLLABLE ENTRE HEADER ET KEYPAD */}
      <div
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          top: headerH,
          bottom: NAV_HEIGHT + keypadH + 8,
          width: `min(100%, ${CONTENT_MAX}px)`,
          paddingInline: 10,
          paddingTop: 4,
          paddingBottom: 4,
          overflowY: "auto",
          zIndex: 40,
        }}
      >
        <PlayersListOnly
          players={players}
          profileById={profileById}
          liveStatsByPlayer={liveStatsByPlayer}
          start={config.startScore}
          scoresByPlayer={scores}
          legsWon={(state as any).legsWon ?? {}}
          setsWon={(state as any).setsWon ?? {}}
          useSets={useSetsUi}
          lastVisitsByPlayer={lastVisitsByPlayer}
          avg3ByPlayer={avg3ByPlayer}
        />
      </div>

      {/* KEYPAD FIXE EN BAS, ALIGNÉ EN LARGEUR */}
      <div
        ref={keypadWrapRef}
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: NAV_HEIGHT,
          zIndex: 45,
          padding: "0 10px 4px",
          width: `min(100%, ${CONTENT_MAX}px)`,
        }}
      >
        {isBotTurn ? (
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(10,10,12,.9), rgba(6,6,8,.95))",
              textAlign: "center",
              fontSize: 13,
              color: "#e3e6ff",
              boxShadow: "0 10px 24px rgba(0,0,0,.5)",
            }}
          >
            🤖 {activePlayer?.name ?? t("x01v3.bot.name", "BOT")}{" "}
            {t("x01v3.bot.playing", "joue son tour...")}
          </div>
        ) : (
          <Keypad
            currentThrow={currentThrow}
            multiplier={multiplier}
            onSimple={() => setMultiplier(1)}
            onDouble={() => setMultiplier(2)}
            onTriple={() => setMultiplier(3)}
            onBackspace={handleBackspace}
            onCancel={handleCancel}
            onNumber={handleNumber}
            onBull={handleBull}
            onValidate={validateThrow}
            hidePreview
          />
        )}
      </div>

      {/* OVERLAY FIN DE MANCHE / SET / MATCH (V3) */}
      <X01LegOverlayV3
        open={
          status === "leg_end" ||
          status === "set_end" ||
          status === "match_end"
        }
        status={status}
        config={config}
        state={state}
        liveStatsByPlayer={liveStatsByPlayer}
        onNextLeg={startNextLeg}
        onExitMatch={handleQuit}
        onReplaySameConfig={handleReplaySameConfig}
        onReplayNewConfig={handleReplayNewConfigInternal}
        onShowSummary={handleShowSummary}
        onContinueMulti={players.length >= 3 ? handleContinueMulti : undefined}
      />
    </div>
  );
}

// =============================================================
// Sous-composants UI (repris du beau X01Play, adaptés V3)
// =============================================================

function HeaderBlock(props: {
  currentPlayer: any;
  currentAvatar: string | null;
  currentRemaining: number;
  currentThrow: UIDart[];
  doubleOut: boolean;
  liveRanking: { id: string; name: string; score: number }[];
  curDarts: number;
  curM3D: string;
  bestVisit: number;
  useSets: boolean;
  legsWon: Record<string, number>;
  setsWon: Record<string, number>;
  currentVisit: any;
}) {
  const {
    currentPlayer,
    currentAvatar,
    currentRemaining,
    currentThrow,
    doubleOut, // pas encore utilisé
    liveRanking,
    curDarts,
    curM3D,
    bestVisit,
    useSets,
    legsWon,
    setsWon,
    currentVisit,
  } = props;

  const legsWonThisSet =
    (currentPlayer && legsWon[currentPlayer.id]) ?? 0;
  const setsWonTotal =
    (currentPlayer && setsWon[currentPlayer.id]) ?? 0;

  const remainingAfterAll = Math.max(
    currentRemaining -
      currentThrow.reduce(
        (s: number, d: UIDart) => s + dartValue(d),
        0
      ),
    0
  );

  return (
    <div
      style={{
        background:
          "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.10), transparent 55%), linear-gradient(180deg, rgba(15,15,18,.9), rgba(10,10,12,.8))",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 18,
        padding: 7,
        boxShadow: "0 8px 26px rgba(0,0,0,.35)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 8,
          alignItems: "center",
        }}
      >
        {/* AVATAR + STATS */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 5,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              overflow: "hidden",
              background:
                "linear-gradient(180deg,#1b1b1f,#111114)",
              boxShadow: "0 6px 22px rgba(0,0,0,.35)",
            }}
          >
            {currentAvatar ? (
              <img
                src={currentAvatar}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  color: "#999",
                  fontWeight: 700,
                }}
              >
                ?
              </div>
            )}
          </div>
          <div
            style={{
              fontWeight: 900,
              fontSize: 17,
              color: "#ffcf57",
            }}
          >
            {currentPlayer?.name ?? "—"}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "#d9dbe3",
            }}
          >
            {useSets ? (
              <>
                Manches : <b>{legsWonThisSet}</b> • Sets :{" "}
                <b>{setsWonTotal}</b>
              </>
            ) : (
              <>
                Manches : <b>{legsWonThisSet}</b>
              </>
            )}
          </div>

          {/* Mini card stats joueur actif */}
          <div
            style={{
              ...miniCard,
              width: 176,
              height: "auto",
              padding: 7,
            }}
          >
            <div style={miniText}>
              <div>
                Meilleure volée : <b>{bestVisit}</b>
              </div>
              <div>
                Moy/3D : <b>{curM3D}</b>
              </div>
              <div>
                Darts jouées : <b>{curDarts}</b>
              </div>
              <div>
                Volée : <b>{currentThrow.length}/3</b>
              </div>
            </div>
          </div>
        </div>

        {/* SCORE + PASTILLES + RANKING */}
        <div
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
        >
          {/* SCORE CENTRAL */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: "#ffcf57",
              textShadow: "0 4px 18px rgba(255,195,26,.25)",
              lineHeight: 1.02,
            }}
          >
            {remainingAfterAll}
          </div>

          {/* Pastilles live */}
          <div
            style={{
              display: "flex",
              gap: 5,
              justifyContent: "center",
            }}
          >
            {[0, 1, 2].map((i) => {
              const d = currentThrow[i];

              const wouldBust =
                currentRemaining -
                  currentThrow
                    .slice(0, i + 1)
                    .reduce(
                      (s: number, x: UIDart) => s + dartValue(x),
                      0
                    ) <
                0;

              const st = chipStyle(d, wouldBust);

              return (
                <span
                  key={i}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 40,
                    height: 28,
                    padding: "0 10px",
                    borderRadius: 10,
                    border: st.border as string,
                    background: st.background as string,
                    color: st.color as string,
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  {fmt(d)}
                </span>
              );
            })}
          </div>

          {/* Checkout suggestion (moteur V3) */}
          {currentVisit?.checkoutSuggestion ? (
            <div
              style={{
                marginTop: 3,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  padding: 5,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.08)",
                  background:
                    "radial-gradient(120% 120% at 50% 0%, rgba(255,195,26,.10), rgba(30,30,34,.95))",
                  minWidth: 170,
                  gap: 6,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,187,51,.4)",
                    background: "rgba(255,187,51,.12)",
                    color: "#ffc63a",
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                    fontSize: 13,
                  }}
                >
                  {formatCheckoutFromVisit(
                    currentVisit.checkoutSuggestion
                  )}
                </span>
              </div>
            </div>
          ) : null}

          {/* Mini ranking */}
          <div
            style={{
              ...miniCard,
              alignSelf: "center",
              width: "min(310px,100%)",
              height: "auto",
              padding: 6,
            }}
          >
            <div
              style={{
                maxHeight: 3 * 26,
                overflow: liveRanking.length > 3 ? "auto" : "visible",
              }}
            >
              {liveRanking.map((r, i) => (
                <div key={r.id} style={miniRankRow}>
                  <div style={miniRankName}>
                    {i + 1}. {r.name}
                  </div>
                  <div
                    style={
                      r.score === 0
                        ? miniRankScoreFini
                        : miniRankScore
                    }
                  >
                    {r.score === 0 ? "FINI" : r.score}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayersListOnly(props: {
  players: any[];
  profileById: Record<
    string,
    { avatarDataUrl: string | null; name: string }
  >;
  liveStatsByPlayer: Record<string, any>;
  start: number;
  scoresByPlayer: Record<string, number>;
  legsWon: Record<string, number>;
  setsWon: Record<string, number>;
  useSets: boolean;
  lastVisitsByPlayer: Record<string, UIDart[]>;
  avg3ByPlayer: Record<string, number>;
}) {
  const {
    players,
    profileById,
    liveStatsByPlayer,
    start,
    scoresByPlayer,
    legsWon,
    setsWon,
    useSets,
    lastVisitsByPlayer,
    avg3ByPlayer,
  } = props;

  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, rgba(15,15,18,.9), rgba(10,10,12,.85))",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 18,
        padding: 9,
        marginBottom: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,.35)",
      }}
    >
      {players.map((p: any) => {
        const prof = profileById[p.id];
        const avatarSrc = prof?.avatarDataUrl ?? null;
        const live = liveStatsByPlayer[p.id];

        const dCount: number = live?.dartsThrown ?? 0;
        const a3d =
          dCount > 0 ? (avg3ByPlayer[p.id] ?? 0).toFixed(2) : "0.00";

        const score = scoresByPlayer[p.id] ?? start;
        const legsWonThisSet = legsWon?.[p.id] ?? 0;
        const setsWonTotal = setsWon?.[p.id] ?? 0;

        const isBot = !!(p as any).isBot;
        const level = (p as any).botLevel as BotLevel;

        return (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "7px 9px",
              borderRadius: 12,
              background:
                "linear-gradient(180deg, rgba(28,28,32,.65), rgba(18,18,20,.65))",
              border: "1px solid rgba(255,255,255,.07)",
              marginBottom: 5,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                overflow: "hidden",
                background: "rgba(255,255,255,.06)",
              }}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: "#999",
                  }}
                >
                  ?
                </div>
              )}
            </div>

            {/* Bloc central */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    color: "#ffcf57",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                  {isBot && (
                    <span
                      style={{
                        fontSize: 10,
                        marginLeft: 4,
                        color: "#9fa4ff",
                        fontWeight: 700,
                      }}
                    >
                      · BOT {(level || "easy").toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Pastilles dernière volée */}
                {renderLastVisitChips(p.id, lastVisitsByPlayer)}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: "#cfd1d7",
                  marginTop: 2,
                }}
              >
                Darts: {dCount} • Moy/3D: {a3d}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: "#cfd1d7",
                  marginTop: 1,
                }}
              >
                {useSets
                  ? `Manches : ${legsWonThisSet} • Sets : ${setsWonTotal}`
                  : `Manches : ${legsWonThisSet}`}
              </div>
            </div>

            {/* Score */}
            <div
              style={{
                fontWeight: 900,
                color: score === 0 ? "#7fe2a9" : "#ffcf57",
              }}
            >
              {score}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SetLegChip(props: {
  currentSet: number;
  currentLegInSet: number;
  setsTarget: number;
  legsTarget: number;
  useSets: boolean;
}) {
  const { currentSet, currentLegInSet, setsTarget, legsTarget, useSets } =
    props;

  const st: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "5px 9px",
    border: "1px solid rgba(255,200,80,.35)",
    background:
      "linear-gradient(180deg, rgba(255,195,26,.12), rgba(30,30,34,.95))",
    color: "#ffcf57",
    fontWeight: 800,
    fontSize: 11.5,
    boxShadow: "0 6px 18px rgba(255,195,26,.15)",
    whiteSpace: "nowrap",
    borderRadius: 999,
  };

  if (!useSets) {
    return (
      <span style={st}>
        <span>
          Leg {currentLegInSet}/{legsTarget}
        </span>
      </span>
    );
  }

  return (
    <span style={st}>
      <span>
        Set {currentSet}/{setsTarget}
      </span>
      <span style={{ opacity: 0.6 }}>•</span>
      <span>
        Leg {currentLegInSet}/{legsTarget}
      </span>
    </span>
  );
}

// =============================================================
// Bridge X01 V3 -> Historique / Stats
// =============================================================

type X01V3HistoryPayload = {
  config: X01ConfigV3;
  state: any;
  scores: Record<string, number>;
  liveStatsByPlayer: any;
};

/* -------------------------------------------------------------
   Helpers : extraction des stats détaillées depuis liveStatsByPlayer
   Objectif : hitsS / hitsD / hitsT / miss / bull / dBull / bust
   + bySegmentS / bySegmentD / bySegmentT
------------------------------------------------------------- */

function numOr0(...values: any[]): number {
  for (const v of values) {
    if (v === undefined || v === null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function cloneNumberMap(obj: any | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) {
    const n = Number(v);
    if (Number.isFinite(n) && n !== 0) {
      out[String(k)] = n;
    }
  }
  return out;
}

function extractSegmentMapsFromLive(live: any) {
  // 1) Si on a déjà bySegmentS/D/T, on les clone tels quels
  let bySegmentS = cloneNumberMap(
    live?.bySegmentS ?? live?.segmentsS ?? live?.hitsBySegmentS
  );
  let bySegmentD = cloneNumberMap(
    live?.bySegmentD ?? live?.segmentsD ?? live?.hitsBySegmentD
  );
  let bySegmentT = cloneNumberMap(
    live?.bySegmentT ?? live?.segmentsT ?? live?.hitsBySegmentT
  );

  // 2) Fallback : structure combinée { [seg]: {S,D,T} }
  const combined =
    live?.bySegment ??
    live?.segmentHits ??
    live?.segmentsAll ??
    undefined;

  if (combined && typeof combined === "object") {
    for (const [segStr, entry] of Object.entries(combined)) {
      const segKey = String(segStr);
      if (!entry || typeof entry !== "object") continue;
      const e: any = entry;
      const s = numOr0(e.S, e.s, e.single, e.singles);
      const d = numOr0(e.D, e.d, e.double, e.doubles);
      const t = numOr0(e.T, e.t, e.triple, e.triples);
      if (s) bySegmentS[segKey] = (bySegmentS[segKey] || 0) + s;
      if (d) bySegmentD[segKey] = (bySegmentD[segKey] || 0) + d;
      if (t) bySegmentT[segKey] = (bySegmentT[segKey] || 0) + t;
    }
  }

  return { bySegmentS, bySegmentD, bySegmentT };
}

function extractDetailedStatsFromLive(live: any) {
  const hitsS = numOr0(live?.hitsS, live?.S, live?.singles, live?.hitsSingle);
  const hitsD = numOr0(live?.hitsD, live?.D, live?.doubles, live?.hitsDouble);
  const hitsT = numOr0(live?.hitsT, live?.T, live?.triples, live?.hitsTriple);

  const miss = numOr0(
    live?.miss,
    live?.misses,
    live?.missCount,
    live?.nbMiss
  );
  const bull = numOr0(
    live?.bull,
    live?.bulls,
    live?.bullHits,
    live?.hitsBull
  );
  const dBull = numOr0(
    live?.dBull,
    live?.doubleBull,
    live?.dbulls,
    live?.bullDoubleHits
  );
  const bust = numOr0(
    live?.bust,
    live?.busts,
    live?.bustCount,
    live?.nbBust
  );

  let darts = numOr0(
    live?.dartsThrown,
    live?.darts,
    live?.totalDarts
  );
  if (!darts) {
    darts = hitsS + hitsD + hitsT + miss; // fallback minimum
  }

  const { bySegmentS, bySegmentD, bySegmentT } =
    extractSegmentMapsFromLive(live);

  return {
    darts,
    hitsS,
    hitsD,
    hitsT,
    miss,
    bull,
    dBull,
    bust,
    bySegmentS,
    bySegmentD,
    bySegmentT,
  };
}

/* -------------------------------------------------------------
   Sauvegarde X01 V3 dans l'Historique
   - summary : toutes les stats utiles pour StatsHub / X01Multi
   - payload : VERSION LÉGÈRE (sans engineState ni liveStatsByPlayer)
     => évite les erreurs de quota (dbv2-autosave)
------------------------------------------------------------- */

function saveX01V3MatchToHistory({
  config,
  state,
  scores,
  liveStatsByPlayer,
}: X01V3HistoryPayload) {
  const players = config.players || [];

  const matchId =
    state?.matchId ||
    `x01v3-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const createdAt = state?.createdAt || Date.now();

  // -------------------------
  // Maps compatibles Summary
  // -------------------------
  const avg3ByPlayer: Record<string, number> = {};
  const bestVisitByPlayer: Record<string, number> = {};
  const bestCheckoutByPlayer: Record<string, number> = {};
  const perPlayer: any[] = [];
  const detailedByPlayer: Record<string, any> = {};

  let winnerId: string | null = null;

  for (const p of players as any[]) {
    const pid = p.id as string;
    const live = (liveStatsByPlayer && liveStatsByPlayer[pid]) || {};
    const dartsThrown = live.dartsThrown ?? live.darts ?? 0;

    const startScore = config.startScore ?? 501;
    const scoreNow = scores[pid] ?? startScore;
    const scored = startScore - scoreNow;

    let avg3 = 0;
    if (dartsThrown > 0 && scored > 0) {
      avg3 = (scored / dartsThrown) * 3;
    }

    const bestVisit = live.bestVisit ?? 0;
    const bestCheckout = live.bestCheckout ?? 0;

    avg3ByPlayer[pid] = avg3;
    bestVisitByPlayer[pid] = bestVisit;
    bestCheckoutByPlayer[pid] = bestCheckout;

    // 🔍 Stats détaillées (hits S/D/T, miss, bull, etc.)
    const detail = extractDetailedStatsFromLive(live);

    detailedByPlayer[pid] = detail;

    perPlayer.push({
      playerId: pid,
      avg3,
      bestVisit,
      bestCheckout,
      darts: detail.darts,
      hitsS: detail.hitsS,
      hitsD: detail.hitsD,
      hitsT: detail.hitsT,
      miss: detail.miss,
      bull: detail.bull,
      dBull: detail.dBull,
      bust: detail.bust,
      bySegmentS: detail.bySegmentS,
      bySegmentD: detail.bySegmentD,
      bySegmentT: detail.bySegmentT,
    });

    // Gagnant simple : score à 0
    if (scoreNow === 0 && !winnerId) {
      winnerId = pid;
    }
  }

  const summary = {
    avg3ByPlayer,
    bestVisitByPlayer,
    bestCheckoutByPlayer,
    perPlayer,
    // 🧩 Map par joueur pour les stats avancées X01Multi
    detailedByPlayer,
  };

  // -------------------------
  // Payload "léger" pour l'historique
  //  -> PAS de engineState complet
  //  -> PAS de liveStatsByPlayer complet
  // -------------------------

  const lightPlayers = players.map((p: any) => ({
    id: p.id,
    name: p.name,
    profileId: p.profileId ?? null,
    isBot: !!p.isBot,
    botLevel: p.botLevel ?? null,
    avatarDataUrl: p.avatarDataUrl ?? null,
  }));

  const lightConfig: X01ConfigV3 = {
    ...config,
    players: lightPlayers as any,
  };

   // Détermine un mode compatible avec les anciens agrégateurs
   const isSolo = players.length === 1;
   const hasTeams =
     Array.isArray((config as any).teams) &&
     (config as any).teams.length > 0;
 
   let gameMode: "x01_solo" | "x01_multi" | "x01_teams" = "x01_multi";
   if (isSolo) gameMode = "x01_solo";
   else if (hasTeams) gameMode = "x01_teams";
 
   const payload = {
     // 👇 ancien champ utilisé par tes agrégateurs
     mode: gameMode,           // "x01_solo" | "x01_multi" | "x01_teams"
 
     // 👇 nouvelle info pour distinguer la V3
     variant: "x01_v3",
 
     game: "x01",
     startScore: config.startScore,
     config: lightConfig,
     finalScores: scores,
     legsWon: state?.legsWon ?? {},
     setsWon: state?.setsWon ?? {},
   };

  // -------------------------
  // Record History (léger)
  // -------------------------
  const record: any = {
    id: matchId,
    kind: "x01",
    status: "finished",
    createdAt,
    players: lightPlayers.map((p) => ({
      id: p.id,
      name: p.name,
      avatarDataUrl: p.avatarDataUrl,
    })),
    winnerId,
    summary,
    payload,
  };

  try {
    History.upsert(record);
  } catch (err) {
    console.warn("[X01PlayV3] History.upsert failed (probably quota)", err);
  }
}

