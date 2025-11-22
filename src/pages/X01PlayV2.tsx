// ============================================
// X01PlayV2 — Version CLEAN 100% Training-like
// UI identique X01Play (header + players + keypad)
// Moteur useX01Engine
// Stats = modèle TrainingX01 (darts / avg3D / hits / segments…)
// + EN PLUS : envoi vers StatsBridge pour Stats globales
// ============================================

import React from "react";
import { useX01Engine } from "../hooks/useX01Engine";

// UI
import Keypad from "../components/Keypad";
import EndOfLegOverlay from "../components/EndOfLegOverlay";
import trophyCup from "../ui_assets/trophy-cup.png";
import { playSound } from "../lib/sound";

// Types
import type {
  Profile,
  MatchRecord,
  Dart as UIDart,
  X01Snapshot,
  LegResult,
  FinishPolicy,
} from "../lib/types";

// History minimum (pour compatibilité reprise)
import { History, type SavedMatch } from "../lib/history";

// 🔥 Stats globales (StatsHub / X01End)
import {
  StatsBridge,
  type Visit as BridgeVisit,
  type PlayerLite as BridgePlayer,
} from "../lib/statsBridge";

/* ============================================================
   TRAINING-LIKE STATS STRUCTURE
   (Identique à TrainingX01)
============================================================ */

type TrainingX01Stats = {
  date: number;
  darts: number;
  avg3D: number;
  bestVisit: number;
  checkout: number;
  hitsS: number;
  hitsD: number;
  hitsT: number;
  miss: number;
  bull: number;
  dBull: number;
  bust: number;
  bySegment: Record<string, number>;
  bySegmentS: Record<string, number>;
  bySegmentD: Record<string, number>;
  bySegmentT: Record<string, number>;
  visits: number;
  startScore: number;
  playerId: string;
};

const TRAINING_X01_KEY = "dc_training_x01_stats_v2";

function loadTrainingX01(): TrainingX01Stats[] {
  try {
    const raw = localStorage.getItem(TRAINING_X01_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveTrainingX01(arr: TrainingX01Stats[]) {
  try {
    localStorage.setItem(TRAINING_X01_KEY, JSON.stringify(arr));
  } catch {
    // quota plein => on ignore
  }
}

function addTrainingX01Entry(e: TrainingX01Stats) {
  const prev = loadTrainingX01();
  prev.push(e);
  saveTrainingX01(prev);
}

/* ============================================================
   AUTOSAVE : version propre
============================================================ */

const AUTOSAVE_KEY = "dc-x01-v2-autosave-clean";

function loadAutosave(): X01Snapshot | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

let __lastAuto = 0;
function saveAutosave(snap: X01Snapshot | null) {
  if (!snap) return;
  const now = Date.now();
  if (now - __lastAuto < 600) return;
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snap));
    __lastAuto = now;
  } catch {
    // rien
  }
}

function clearAutosave() {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    // rien
  }
}

/* ============================================================
   HELPERS VISUELS / DART
============================================================ */

function dartValue(d: UIDart) {
  if (d.v === 25 && d.mult === 2) return 50;
  return d.v * d.mult;
}

function fmt(d?: UIDart) {
  if (!d) return "—";
  if (d.v === 0) return "MISS";
  if (d.v === 25) return d.mult === 2 ? "DBULL" : "BULL";
  const p = d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S";
  return `${p}${d.v}`;
}

function chipStyle(d?: UIDart, red = false): React.CSSProperties {
  if (!d)
    return {
      background: "rgba(255,255,255,.08)",
      color: "#ccc",
      border: "1px solid rgba(255,255,255,.15)",
    };
  if (red)
    return {
      background: "rgba(255,0,0,.25)",
      color: "#ffbaba",
      border: "1px solid rgba(255,0,0,.45)",
    };
  if (d.v === 25 && d.mult === 2)
    return {
      background: "rgba(10,150,90,.22)",
      color: "#b8ffe1",
      border: "1px solid rgba(10,150,90,.45)",
    };
  if (d.v === 25)
    return {
      background: "rgba(10,150,90,.15)",
      color: "#a9ffd6",
      border: "1px solid rgba(10,150,90,.35)",
    };
  if (d.mult === 3)
    return {
      background: "rgba(170,60,165,.22)",
      color: "#ffd4ff",
      border: "1px solid rgba(170,60,165,.45)",
    };
  if (d.mult === 2)
    return {
      background: "rgba(40,150,200,.22)",
      color: "#cfeeff",
      border: "1px solid rgba(40,150,200,.45)",
    };
  return {
    background: "rgba(255,190,60,.22)",
    color: "#ffcf57",
    border: "1px solid rgba(255,190,60,.45)",
  };
}

/* =====================================================================
   VISITS MINIMAL (log pour overlay & stats)
===================================================================== */

type VisitLite = {
  playerId: string;
  darts: UIDart[];
  score: number;
  bust: boolean;
  isCheckout: boolean;
  remainingAfter: number;
  ts: number;
};

/* ============================================================
   WRAPPER PRINCIPAL
============================================================ */

export default function X01PlayV2(props: {
  profiles?: Profile[];
  playerIds?: string[];
  start?: 301 | 501 | 701 | 901 | 1001;
  outMode?: "simple" | "double" | "master";
  inMode?: "simple" | "double" | "master";
  setsToWin?: number;
  legsPerSet?: number;
  finishPolicy?: FinishPolicy;
  params?: any;
  onFinish: (m: MatchRecord) => void;
  onExit: () => void;
}) {
  const {
    profiles = [],
    playerIds = [],
    start = 501,
    outMode = "double",
    inMode = "simple",
    setsToWin = 1,
    legsPerSet = 1,
    finishPolicy = "firstToZero",
    params,
    onFinish,
    onExit,
  } = props;

  const resumeId: string | undefined = params?.resumeId;

  // PlayerIds merges (et sécurise le fait que ce soit bien un tableau)
  const mergedPlayerIdsRaw =
    params?.startParams?.playerIds ?? playerIds ?? [];
  const mergedPlayerIds: string[] = Array.isArray(mergedPlayerIdsRaw)
    ? mergedPlayerIdsRaw
    : [String(mergedPlayerIdsRaw)];

  const mergedStart: number =
    params?.startParams?.start ?? start ?? 501;

  const mergedOut: "simple" | "double" | "master" =
    params?.startParams?.outMode ?? outMode ?? "double";

  const mergedIn: "simple" | "double" | "master" =
    params?.startParams?.inMode ?? inMode ?? "simple";

  const mergedSets: number =
    params?.startParams?.setsToWin ?? setsToWin ?? 1;

  const mergedLegs: number =
    params?.startParams?.legsPerSet ?? legsPerSet ?? 1;

  const mergedFinishPolicy: FinishPolicy =
    params?.startParams?.finishPolicy ?? finishPolicy;

  const initialResume: X01Snapshot | null =
    params?.startParams?.resume ?? null;

  /* --------- AUTOSAVE LOADING --------- */

  const [ready, setReady] = React.useState(false);
  const [resumeSnapshot, setResumeSnapshot] =
    React.useState<X01Snapshot | null>(initialResume);

  const mustResume = !!initialResume || !!resumeId;

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!mustResume) {
        clearAutosave();
        if (alive) {
          setResumeSnapshot(null);
          setReady(true);
        }
        return;
      }

      if (initialResume) {
        if (alive) {
          setResumeSnapshot(initialResume);
          setReady(true);
        }
        return;
      }

      if (resumeId) {
        const r: SavedMatch | null = await History.get(resumeId);
        const snap = (r?.payload as any)?.state ?? null;
        if (alive) {
          setResumeSnapshot(snap);
          setReady(true);
        }
        return;
      }

      const auto = loadAutosave();
      if (alive) {
        setResumeSnapshot(auto);
        setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [initialResume, resumeId, mustResume]);

  if (!ready) {
    return (
      <div
        style={{
          padding: 20,
          marginTop: 50,
          color: "#ffcf57",
          textAlign: "center",
          fontWeight: 900,
        }}
      >
        Chargement…
      </div>
    );
  }

  /* --------- ENGINE KEY (SANS .join !) --------- */

  const freshNonce = React.useRef(
    !mustResume ? crypto.randomUUID?.() ?? String(Date.now()) : ""
  ).current;

  const engineKey = resumeSnapshot ? "resume" : `fresh:${freshNonce}`;

  /* --------- RENDER DU CORE --------- */

  return (
    <X01CoreV2
      key={engineKey}
      profiles={profiles}
      playerIds={mergedPlayerIds}
      start={mergedStart}
      outMode={mergedOut}
      inMode={mergedIn}
      setsToWin={mergedSets}
      legsPerSet={mergedLegs}
      finishPolicy={mergedFinishPolicy}
      resumeSnapshot={resumeSnapshot}
      resumeId={resumeId}
      onFinish={onFinish}
      onExit={onExit}
    />
  );
}

/* =====================================================================
   CORE V2 + STATS TRAINING-LIKE + StatsBridge
===================================================================== */

function X01CoreV2({
  profiles,
  playerIds,
  start,
  outMode,
  inMode,
  setsToWin,
  legsPerSet,
  finishPolicy,
  resumeSnapshot,
  resumeId,
  onFinish,
  onExit,
}: {
  profiles: Profile[];
  playerIds: string[];
  start: number;
  outMode: "simple" | "double" | "master";
  inMode: "simple" | "double" | "master";
  setsToWin: number;
  legsPerSet: number;
  finishPolicy: FinishPolicy;
  resumeSnapshot: X01Snapshot | null;
  resumeId?: string;
  onFinish: (m: MatchRecord) => void;
  onExit: () => void;
}) {
  /* ------------------------ ENGINE ------------------------ */

  const pendingMatchRef = React.useRef<MatchRecord | null>(null);

  /* ------------------------ LOG STATS TRAINING-LIKE ------------------------ */

  const visitsLog = React.useRef<VisitLite[]>([]);
  const bestVisitByPlayer = React.useRef<Record<string, number>>({});
  const checkoutByPlayer = React.useRef<Record<string, number>>({});
  const dartsCount = React.useRef<Record<string, number>>({});
  const pointsSum = React.useRef<Record<string, number>>({});
  const missCount = React.useRef<Record<string, number>>({});
  const bustCount = React.useRef<Record<string, number>>({});
  const bullCount = React.useRef<Record<string, number>>({});
  const dBullCount = React.useRef<Record<string, number>>({});
  const hitsS = React.useRef<Record<string, number>>({});
  const hitsD = React.useRef<Record<string, number>>({});
  const hitsT = React.useRef<Record<string, number>>({});
  const segAll = React.useRef<Record<string, Record<string, number>>>({});
  const segS = React.useRef<Record<string, Record<string, number>>>({});
  const segD = React.useRef<Record<string, Record<string, number>>>({});
  const segT = React.useRef<Record<string, Record<string, number>>>({});
  const visitsCount = React.useRef<Record<string, number>>({});

  const {
    state,
    currentPlayer,
    scoresByPlayer,
    submitThrowUI,
    undoLast,
    pendingFirstWin,
    finishedOrder,
    continueAfterFirst,
    endNow,
    ruleWinnerId,
    currentSet,
    currentLegInSet,
    setsTarget,
    legsTarget,
    setsWon,
    legsWon,
  } = useX01Engine({
    profiles,
    playerIds,
    start,
    doubleOut: outMode !== "simple",
    resume: resumeSnapshot,
    setsToWin,
    legsPerSet,
    outMode,
    inMode,
    finishPolicy,
    onFinish: (m: MatchRecord) => {
      pendingMatchRef.current = m;

      // Stats training-like pour tous les joueurs (identique avant)
      saveTrainingLikeStatsForMatch(playerIds, start, {
        dartsCount,
        pointsSum,
        bestVisitByPlayer,
        checkoutByPlayer,
        hitsS,
        hitsD,
        hitsT,
        missCount,
        bustCount,
        bullCount,
        dBullCount,
        segAll,
        segS,
        segD,
        segT,
        visitsCount,
      });

      // 🔥 EN PLUS : push vers StatsBridge pour Stats globales
      try {
        // visits → format StatsBridge.Visit
        const visitsForBridge: BridgeVisit[] = visitsLog.current.map((v) => ({
          p: v.playerId,
          segments: v.darts,
          score: v.score,
          bust: v.bust,
          isCheckout: v.isCheckout,
          remainingAfter: v.remainingAfter,
          ts: v.ts,
        }));

        // joueurs au format PlayerLite
        const playersLite: BridgePlayer[] = (state.players || []).map(
          (p: any): BridgePlayer => ({
            id: p.id,
            name: p.name,
            avatarDataUrl:
              profiles.find((pp) => pp.id === p.id)?.avatarDataUrl ?? null,
          })
        );

        const winnerId = (m as any).winnerId ?? ruleWinnerId ?? null;

        if (visitsForBridge.length && playersLite.length) {
          const { leg, legacy } = StatsBridge.makeLeg(
            visitsForBridge,
            playersLite,
            winnerId
          );

          // Quick stats (Stats > vue générale)
          void StatsBridge.commitLegAndAccumulate(leg, legacy);

          // Synthèse match X01 simplifiée (Stats X01 multi)
          const mid =
            (m as any).id ??
            (m as any).matchId ??
            crypto.randomUUID?.() ??
            String(Date.now());

          const summary = StatsBridge.makeMatch(
            [leg],
            playersLite,
            mid,
            "x01"
          );

          void StatsBridge.commitMatchAndSave(summary, {
            kind: "x01",
            startScore: start,
            outMode,
            inMode,
            setsToWin,
            legsPerSet,
            finishPolicy,
          });
        }
      } catch (e) {
        console.warn("[X01PlayV2] StatsBridge error", e);
      }

      // On laisse l'appelant gérer la suite (StatsHub / retour écran etc.)
      onFinish(m);
      clearAutosave();

      // on vide les logs pour la prochaine partie
      visitsLog.current = [];
    },
    onLegEnd: (leg: LegResult) => handleLegEnd(leg),
  });

  // Init des maps segments
  React.useEffect(() => {
    for (const p of playerIds) {
      segAll.current[p] = segAll.current[p] || {};
      segS.current[p] = segS.current[p] || {};
      segD.current[p] = segD.current[p] || {};
      segT.current[p] = segT.current[p] || {};
    }
  }, [playerIds]);

  /* ------------------------ CURRENT THROW ------------------------ */

  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);

  const currentRemaining =
    scoresByPlayer[currentPlayer?.id ?? ""] ?? start;

  /* ------------------------ REGISTER VISIT ------------------------ */

  function recordVisit(
    darts: UIDart[],
    bust: boolean,
    isCheckout: boolean,
    remainingAfter: number
  ) {
    if (!currentPlayer) return;

    const pid = currentPlayer.id;
    const pts = bust
      ? 0
      : darts.reduce((s, d) => s + dartValue(d), 0);

    // log interne (UI + StatsBridge)
    visitsLog.current.push({
      playerId: pid,
      darts,
      score: pts,
      bust,
      isCheckout,
      remainingAfter,
      ts: Date.now(),
    });

    dartsCount.current[pid] = (dartsCount.current[pid] || 0) + darts.length;
    pointsSum.current[pid] = (pointsSum.current[pid] || 0) + pts;
    visitsCount.current[pid] =
      (visitsCount.current[pid] || 0) + 1;

    for (const d of darts) {
      if (d.v === 0)
        missCount.current[pid] =
          (missCount.current[pid] || 0) + 1;
      if (d.v === 25 && d.mult === 1)
        bullCount.current[pid] =
          (bullCount.current[pid] || 0) + 1;
      if (d.v === 25 && d.mult === 2)
        dBullCount.current[pid] =
          (dBullCount.current[pid] || 0) + 1;
      if (d.mult === 1)
        hitsS.current[pid] = (hitsS.current[pid] || 0) + 1;
      if (d.mult === 2)
        hitsD.current[pid] = (hitsD.current[pid] || 0) + 1;
      if (d.mult === 3)
        hitsT.current[pid] = (hitsT.current[pid] || 0) + 1;

      const key = String(d.v);
      segAll.current[pid][key] =
        (segAll.current[pid][key] || 0) + 1;
      if (d.mult === 1)
        segS.current[pid][key] =
          (segS.current[pid][key] || 0) + 1;
      else if (d.mult === 2)
        segD.current[pid][key] =
          (segD.current[pid][key] || 0) + 1;
      else if (d.mult === 3)
        segT.current[pid][key] =
          (segT.current[pid][key] || 0) + 1;
    }

    if (isCheckout) {
      checkoutByPlayer.current[pid] = Math.max(
        checkoutByPlayer.current[pid] || 0,
        pts
      );
    }

    bestVisitByPlayer.current[pid] = Math.max(
      bestVisitByPlayer.current[pid] || 0,
      pts
    );
  }

  /* ------------------------ VALIDATION D'UNE VOLÉE ------------------------ */

  function validateThrow() {
    if (!currentThrow.length || !currentPlayer) return;

    const pid = currentPlayer.id;
    const curRemaining = scoresByPlayer[pid];
    const pts = currentThrow.reduce(
      (s, d) => s + dartValue(d),
      0
    );
    const after = curRemaining - pts;

    let bust =
      after < 0 ||
      (outMode !== "simple" &&
        after === 0 &&
        !(() => {
          const last = currentThrow[currentThrow.length - 1];
          return last?.mult === 2;
        })());

    const isCheckout = !bust && after === 0;

    if (bust)
      bustCount.current[pid] =
        (bustCount.current[pid] || 0) + 1;

    const remainingAfter = bust
      ? curRemaining
      : Math.max(after, 0);

    recordVisit(
      currentThrow,
      bust,
      isCheckout,
      remainingAfter
    );

    submitThrowUI(currentThrow);
    setCurrentThrow([]);
    setMultiplier(1);

    playSound("dart-hit");

    // autosave minimal (état engine exposé dans resumeSnapshot via History)
    // ici on ne sait pas snapshotter proprement, donc on ignore saveAutosave.
  }

  function handleNumber(n: number) {
    if (currentThrow.length >= 3) return;
    const d: UIDart = { v: n, mult: multiplier };
    setCurrentThrow((t) => [...t, d]);
    setMultiplier(1);
  }

  function handleBull() {
    if (currentThrow.length >= 3) return;
    const d: UIDart = { v: 25, mult: multiplier === 2 ? 2 : 1 };
    setCurrentThrow((t) => [...t, d]);
    setMultiplier(1);
  }

  function handleBackspace() {
    setCurrentThrow((t) => t.slice(0, -1));
  }

  function handleCancel() {
    if (currentThrow.length) setCurrentThrow((t) => t.slice(0, -1));
    else undoLast?.();
  }

  /* ------------------------ FIN DE MANCHE ------------------------ */

  const [overlayOpen, setOverlayOpen] = React.useState(false);
  const [lastLegResult, setLastLegResult] =
    React.useState<any>(null);

  function handleLegEnd(res: LegResult) {
    setLastLegResult({
      ...res,
      finishedAt: Date.now(),
    });
    setOverlayOpen(true);
    // IMPORTANT : on NE reset PAS les compteurs ici
    // pour garder les stats sur tout le match
  }

  /* ------------------------ UI HELPERS ------------------------ */

  const playersById = React.useMemo(
    () =>
      Object.fromEntries(
        (state.players || []).map((p: any) => [
          p.id,
          {
            id: p.id,
            name: p.name,
            avatarDataUrl:
              profiles.find((pp) => pp.id === p.id)
                ?.avatarDataUrl ?? null,
          },
        ])
      ),
    [state.players, profiles]
  );

  const headerTopHeight = 160; // hauteur approximative du header
  const keypadHeight = 180; // espace réservé keypad

  /* ------------------------ RENDER COMPLET ------------------------ */

  return (
    <div
      className="x01play-container"
      style={{ overflow: "hidden", minHeight: "100vh", color: "#fff" }}
    >
      {/* ================= HEADER ================= */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(100%,520px)",
          padding: "6px 10px",
          zIndex: 50,
          background: "rgba(10,10,12,0.85)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255,255,255,.08)",
        }}
      >
        {/* Ligne top : Quitter + Set/Leg */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          {/* Quitter */}
          <button
            onClick={() => onExit()}
            style={{
              borderRadius: 10,
              padding: "6px 12px",
              border: "1px solid rgba(255,180,0,.3)",
              background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
              color: "#1a1a1a",
              fontWeight: 900,
              boxShadow: "0 8px 18px rgba(255,170,0,.25)",
              fontSize: 13,
            }}
          >
            ← Quitter
          </button>

          {/* SET / LEG */}
          <span
            style={{
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
              borderRadius: 999,
            }}
          >
            {setsTarget > 1 ? (
              <>
                <span>
                  Set {currentSet}/{setsTarget}
                </span>
                <span style={{ opacity: 0.6 }}>•</span>
                <span>
                  Leg {currentLegInSet}/{legsTarget}
                </span>
              </>
            ) : (
              <span>
                Leg {currentLegInSet}/{legsTarget}
              </span>
            )}
          </span>
        </div>

        {/* Bloc header principal */}
        <HeaderBlock
          currentPlayer={currentPlayer}
          currentRemaining={currentRemaining}
          currentThrow={currentThrow}
          doubleOut={outMode !== "simple"}
          dartsCount={dartsCount.current}
          pointsSum={pointsSum.current}
          bestVisitByPlayer={bestVisitByPlayer.current}
          avatar={
            currentPlayer
              ? profiles.find((p) => p.id === currentPlayer.id)
                  ?.avatarDataUrl ?? null
              : null
          }
        />
      </div>

      {/* ================= PLAYERS LIST ================= */}
      <div
        style={{
          position: "fixed",
          top: headerTopHeight,
          bottom: keypadHeight + 64,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(100%,520px)",
          overflowY: "auto",
          padding: "0 10px",
        }}
      >
        <PlayersList
          players={state.players}
          profiles={profiles}
          dartsCount={dartsCount.current}
          pointsSum={pointsSum.current}
          scoresByPlayer={scoresByPlayer}
          start={start}
          visitsLog={visitsLog.current}
          legsWon={legsWon}
          setsWon={setsWon}
          setsMode={setsTarget > 1}
        />
      </div>

      {/* ================= KEYPAD ================= */}
      <div
        style={{
          position: "fixed",
          bottom: 64,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(100%,520px)",
          padding: "0 10px",
        }}
      >
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
      </div>

      {/* ================= OVERLAY FIN DE MANCHE ================= */}
      {overlayOpen && lastLegResult && (
        <EndOfLegOverlay
          open={overlayOpen}
          result={lastLegResult}
          playersById={playersById}
          onClose={() => setOverlayOpen(false)}
          onReplay={() => setOverlayOpen(false)}
          onSave={() => {}}
        />
      )}
    </div>
  );
}

/* =====================================================================
   SOUS-COMPONENTS UI (HEADER + LISTE JOUEURS)
===================================================================== */

function HeaderBlock({
  currentPlayer,
  currentRemaining,
  currentThrow,
  doubleOut,
  dartsCount,
  pointsSum,
  bestVisitByPlayer,
  avatar,
}: {
  currentPlayer: any;
  currentRemaining: number;
  currentThrow: UIDart[];
  doubleOut: boolean;
  dartsCount: Record<string, number>;
  pointsSum: Record<string, number>;
  bestVisitByPlayer: Record<string, number>;
  avatar: string | null;
}) {
  const pid = currentPlayer?.id ?? "";
  const darts = dartsCount[pid] || 0;
  const pts = pointsSum[pid] || 0;
  const avg3D = darts > 0 ? ((pts / darts) * 3).toFixed(2) : "0.00";
  const bestVisit = bestVisitByPlayer[pid] || 0;

  const remainingAfterThrow = Math.max(
    currentRemaining -
      currentThrow.reduce((s, d) => s + dartValue(d), 0),
    0
  );

  return (
    <div
      style={{
        background:
          "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.10), transparent 55%), linear-gradient(180deg, rgba(15,15,18,.9), rgba(10,10,12,.8))",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 18,
        padding: 8,
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
        {/* AVATAR + INFOS JOUEUR */}
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
              background: "linear-gradient(180deg,#1b1b1f,#111114)",
              boxShadow: "0 6px 22px rgba(0,0,0,.35)",
            }}
          >
            {avatar ? (
              <img
                src={avatar}
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
            Darts jouées : <b>{darts}</b>
          </div>

          <div
            style={{
              fontSize: 11.5,
              color: "#d9dbe3",
            }}
          >
            Moy/3D : <b>{avg3D}</b>
          </div>

          <div
            style={{
              fontSize: 11.5,
              color: "#d9dbe3",
            }}
          >
            Meilleure volée : <b>{bestVisit}</b>
          </div>
        </div>

        {/* SCORE + VOLÉE */}
        <div
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {/* SCORE */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: "#ffcf57",
              textShadow: "0 4px 18px rgba(255,195,26,.25)",
              lineHeight: 1.02,
            }}
          >
            {remainingAfterThrow}
          </div>

          {/* Pastilles volée */}
          <div
            style={{
              display: "flex",
              gap: 5,
              justifyContent: "center",
            }}
          >
            {[0, 1, 2].map((i) => {
              const d = currentThrow[i];
              const afterNow =
                currentRemaining -
                currentThrow
                  .slice(0, i + 1)
                  .reduce((s, x) => s + dartValue(x), 0);

              const wouldBust =
                afterNow < 0 ||
                (doubleOut &&
                  afterNow === 0 &&
                  !(() => {
                    const last = currentThrow[i];
                    return last?.mult === 2;
                  })());

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
        </div>
      </div>
    </div>
  );
}

function PlayersList({
  players,
  profiles,
  dartsCount,
  pointsSum,
  scoresByPlayer,
  start,
  visitsLog,
  legsWon,
  setsWon,
  setsMode,
}: {
  players: any[];
  profiles: Profile[];
  dartsCount: Record<string, number>;
  pointsSum: Record<string, number>;
  scoresByPlayer: Record<string, number>;
  start: number;
  visitsLog: VisitLite[];
  legsWon: Record<string, number>;
  setsWon: Record<string, number>;
  setsMode: boolean;
}) {
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
        const prof = profiles.find((pp) => pp.id === p.id);
        const avatarSrc = prof?.avatarDataUrl ?? null;

        const dCount = dartsCount[p.id] || 0;
        const pSum = pointsSum[p.id] || 0;
        const a3d =
          dCount > 0 ? ((pSum / dCount) * 3).toFixed(2) : "0.00";
        const score = scoresByPlayer[p.id] ?? start;
        const legsWonThisSet = legsWon?.[p.id] ?? 0;
        const setsWonTotal = setsWon?.[p.id] ?? 0;

        const lastVisit = [...visitsLog]
          .reverse()
          .find((v) => v.playerId === p.id);

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
                </div>

                {/* dernière volée rapide */}
                {lastVisit && (
                  <div style={{ display: "inline-flex", gap: 4 }}>
                    {lastVisit.darts.map((d, i) => {
                      const st = chipStyle(d);
                      return (
                        <span
                          key={i}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 32,
                            height: 22,
                            padding: "0 8px",
                            borderRadius: 9,
                            border: st.border as string,
                            background: st.background as string,
                            color: st.color as string,
                            fontWeight: 800,
                            fontSize: 11,
                          }}
                        >
                          {fmt(d)}
                        </span>
                      );
                    })}
                    {lastVisit.bust && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: 32,
                          height: 22,
                          padding: "0 8px",
                          borderRadius: 9,
                          border: "1px solid rgba(255,0,0,.45)",
                          background: "rgba(255,0,0,.25)",
                          color: "#ffbaba",
                          fontWeight: 800,
                          fontSize: 11,
                        }}
                      >
                        Bust
                      </span>
                    )}
                  </div>
                )}
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
                {setsMode
                  ? `Manches : ${legsWonThisSet} • Sets : ${setsWonTotal}`
                  : `Manches : ${legsWonThisSet}`}
              </div>
            </div>

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

/* =====================================================================
   SAUVEGARDE STATS TRAINING-LIKE À LA FIN DU MATCH
===================================================================== */

function saveTrainingLikeStatsForMatch(
  playerIds: string[],
  startScore: number,
  refs: {
    dartsCount: React.MutableRefObject<Record<string, number>>;
    pointsSum: React.MutableRefObject<Record<string, number>>;
    bestVisitByPlayer: React.MutableRefObject<Record<string, number>>;
    checkoutByPlayer: React.MutableRefObject<Record<string, number>>;
    hitsS: React.MutableRefObject<Record<string, number>>;
    hitsD: React.MutableRefObject<Record<string, number>>;
    hitsT: React.MutableRefObject<Record<string, number>>;
    missCount: React.MutableRefObject<Record<string, number>>;
    bustCount: React.MutableRefObject<Record<string, number>>;
    bullCount: React.MutableRefObject<Record<string, number>>;
    dBullCount: React.MutableRefObject<Record<string, number>>;
    segAll: React.MutableRefObject<Record<string, Record<string, number>>>;
    segS: React.MutableRefObject<Record<string, Record<string, number>>>;
    segD: React.MutableRefObject<Record<string, Record<string, number>>>;
    segT: React.MutableRefObject<Record<string, Record<string, number>>>;
    visitsCount: React.MutableRefObject<Record<string, number>>;
  }
) {
  const {
    dartsCount,
    pointsSum,
    bestVisitByPlayer,
    checkoutByPlayer,
    hitsS,
    hitsD,
    hitsT,
    missCount,
    bustCount,
    bullCount,
    dBullCount,
    segAll,
    segS,
    segD,
    segT,
    visitsCount,
  } = refs;

  for (const pid of playerIds) {
    const darts = dartsCount.current[pid] || 0;
    const scored = pointsSum.current[pid] || 0;
    const avg3D = darts > 0 ? (scored / darts) * 3 : 0;

    const entry: TrainingX01Stats = {
      date: Date.now(),
      darts,
      avg3D,
      bestVisit: bestVisitByPlayer.current[pid] || 0,
      checkout: checkoutByPlayer.current[pid] || 0,
      hitsS: hitsS.current[pid] || 0,
      hitsD: hitsD.current[pid] || 0,
      hitsT: hitsT.current[pid] || 0,
      miss: missCount.current[pid] || 0,
      bull: bullCount.current[pid] || 0,
      dBull: dBullCount.current[pid] || 0,
      bust: bustCount.current[pid] || 0,
      bySegment: segAll.current[pid] || {},
      bySegmentS: segS.current[pid] || {},
      bySegmentD: segD.current[pid] || {},
      bySegmentT: segT.current[pid] || {},
      visits: visitsCount.current[pid] || 0,
      startScore,
      playerId: pid,
    };

    addTrainingX01Entry(entry);
  }
}
