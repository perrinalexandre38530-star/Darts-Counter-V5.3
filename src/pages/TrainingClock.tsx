// ============================================
// src/pages/TrainingClock.tsx
// Training — Tour de l'horloge (design v5)
// Solo only, avec écran de paramétrage
// ============================================

import React from "react";
import { playSound } from "../lib/sound";
import { useCurrentProfile } from "../hooks/useCurrentProfile";

type ClockMode = "classic" | "doubles" | "triples" | "sdt";

type ClockConfig = {
  mode: ClockMode;
  showTimer: boolean;
  dartLimit: number | null; // ex : 30 fléchettes max ou null = illimité
};

type Target = number | "BULL";

const TARGETS: Target[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  "BULL",
];

type StageSDT = 0 | 1 | 2; // 0 = Simple, 1 = Double, 2 = Triple

type ClockSession = {
  id: string;
  profileId: string | null;
  profileName: string;
  config: ClockConfig;
  startedAt: string;
  endedAt: string;
  dartsThrown: number;
  hits: number;
  completed: boolean;
  elapsedMs: number;
  bestStreak: number;
};

const STORAGE_KEY = "dc-training-clock-v1";

// --------- helpers temps / format ---------
function formatTime(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min.toString().padStart(2, "0")}:${sec
    .toString()
    .padStart(2, "0")}`;
}

function generateId() {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

// ============================================
// Component principal
// ============================================

const TrainingClock: React.FC = () => {
  // useCurrentProfile peut retourner null → on sécurise
  const cp = useCurrentProfile() ?? ({} as any);
  const profile = cp.profile as any | null;

  const playerName = profile?.nickname ?? profile?.name ?? "Joueur solo";
  const playerId = profile?.id ?? null;

  const [step, setStep] = React.useState<"setup" | "play" | "summary">(
    "setup"
  );

  const [config, setConfig] = React.useState<ClockConfig>({
    mode: "classic",
    showTimer: true,
    dartLimit: null,
  });

  // état de la session en cours
  const [currentTargetIndex, setCurrentTargetIndex] = React.useState(0);
  const [stageSDT, setStageSDT] = React.useState<StageSDT>(0);
  const [dartsThrown, setDartsThrown] = React.useState(0);
  const [hits, setHits] = React.useState(0);
  const [bestStreak, setBestStreak] = React.useState(0);
  const [currentStreak, setCurrentStreak] = React.useState(0);
  const [startTime, setStartTime] = React.useState<number | null>(null);
  const [endTime, setEndTime] = React.useState<number | null>(null);

  // sélection actuelle sur le mini keypad
  const [selectedValue, setSelectedValue] = React.useState<Target | null>(null);
  const [selectedMult, setSelectedMult] = React.useState<1 | 2 | 3>(1);
  const [isMiss, setIsMiss] = React.useState(false);

  // résumé de la session terminée
  const [lastSession, setLastSession] = React.useState<ClockSession | null>(
    null
  );
  const [history, setHistory] = React.useState<ClockSession[]>([]);

  // Charger historique local au mount
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ClockSession[];
      setHistory(parsed);
    } catch (e) {
      console.warn("Impossible de charger l'historique Tour de l'horloge", e);
    }
  }, []);

  // sauver historique local
  function saveSessionToHistory(session: ClockSession) {
    try {
      const next = [session, ...history].slice(0, 50);
      setHistory(next);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn(
        "Impossible de sauvegarder l'historique Tour de l'horloge",
        e
      );
    }
  }

  const currentTarget = TARGETS[currentTargetIndex];

  // ------------ logique de hit / avance cible --------------

  function isHit(
    target: Target,
    mode: ClockMode,
    value: Target | null,
    mult: 1 | 2 | 3,
    stage: StageSDT
  ): { hit: boolean; nextStage?: StageSDT; advanceTarget?: boolean } {
    if (!value) return { hit: false };

    // Gestion spéciale BULL
    if (target === "BULL") {
      if (value !== "BULL") return { hit: false };

      if (mode === "classic") {
        return { hit: true, advanceTarget: true };
      }
      if (mode === "doubles") {
        return { hit: mult === 2, advanceTarget: mult === 2 };
      }
      if (mode === "triples") {
        // Triple bull n'existe pas vraiment, on considère double-only
        return { hit: false };
      }
      // mode sdt sur bull — S=25, D=50
      if (mode === "sdt") {
        if (stage === 0 && mult === 1) {
          return { hit: true, nextStage: 1, advanceTarget: false };
        }
        if (stage === 1 && mult === 2) {
          return { hit: true, nextStage: 0, advanceTarget: true };
        }
        return { hit: false };
      }
      return { hit: false };
    }

    // Cible numérique 1-20
    if (typeof target === "number") {
      if (value !== target) return { hit: false };

      if (mode === "classic") {
        return { hit: true, advanceTarget: true };
      }
      if (mode === "doubles") {
        return { hit: mult === 2, advanceTarget: mult === 2 };
      }
      if (mode === "triples") {
        return { hit: mult === 3, advanceTarget: mult === 3 };
      }
      if (mode === "sdt") {
        if (stage === 0 && mult === 1) {
          return { hit: true, nextStage: 1, advanceTarget: false };
        }
        if (stage === 1 && mult === 2) {
          return { hit: true, nextStage: 2, advanceTarget: false };
        }
        if (stage === 2 && mult === 3) {
          return { hit: true, nextStage: 0, advanceTarget: true };
        }
        return { hit: false };
      }
    }

    return { hit: false };
  }

  function resetGameState() {
    setCurrentTargetIndex(0);
    setStageSDT(0);
    setDartsThrown(0);
    setHits(0);
    setCurrentStreak(0);
    setBestStreak(0);
    setStartTime(null);
    setEndTime(null);
    setSelectedValue(null);
    setSelectedMult(1);
    setIsMiss(false);
  }

  function handleStart() {
    resetGameState();
    setLastSession(null);
    setStep("play");
    const now = Date.now();
    setStartTime(now);
    setEndTime(null);
    playSound("start");
  }

  function handleAbort() {
    setStep("setup");
  }

  function finishSession(completed: boolean) {
    const now = Date.now();
    setEndTime(now);

    const elapsed =
      startTime != null ? Math.max(0, now - startTime) : 0;

    const session: ClockSession = {
      id: generateId(),
      profileId: playerId,
      profileName: playerName,
      config,
      startedAt:
        startTime != null
          ? new Date(startTime).toISOString()
          : new Date().toISOString(),
      endedAt: new Date(now).toISOString(),
      dartsThrown,
      hits,
      completed,
      elapsedMs: elapsed,
      bestStreak,
    };

    setLastSession(session);
    saveSessionToHistory(session);
    setStep("summary");
    playSound(completed ? "win" : "lose");
  }

  function handleThrow() {
    if (!isMiss && !selectedValue) return;

    if (config.dartLimit != null && dartsThrown >= config.dartLimit) {
      return;
    }

    const newDarts = dartsThrown + 1;
    setDartsThrown(newDarts);

    if (isMiss) {
      setCurrentStreak(0);
      playSound("miss");
    } else {
      const res = isHit(
        currentTarget,
        config.mode,
        selectedValue,
        selectedMult,
        stageSDT
      );

      if (res.hit) {
        const newHits = hits + 1;
        setHits(newHits);

        const newStreak = currentStreak + 1;
        setCurrentStreak(newStreak);
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }

        playSound("hit");

        if (res.nextStage !== undefined) {
          setStageSDT(res.nextStage);
        }
        if (res.advanceTarget) {
          const nextIndex = currentTargetIndex + 1;
          if (nextIndex >= TARGETS.length) {
            setCurrentTargetIndex(nextIndex - 1);
            finishSession(true);
            return;
          } else {
            setCurrentTargetIndex(nextIndex);
            setStageSDT(0);
          }
        }
      } else {
        setCurrentStreak(0);
        playSound("miss");
      }
    }

    if (
      config.dartLimit != null &&
      newDarts >= config.dartLimit &&
      step === "play"
    ) {
      finishSession(false);
    }
  }

  const elapsedNow =
    startTime != null
      ? (endTime ?? Date.now()) - startTime
      : 0;

  // ---------------- UI helpers ----------------

  function labelMode(mode: ClockMode): string {
    switch (mode) {
      case "classic":
        return "Classique (1→20 + Bull)";
      case "doubles":
        return "Doubles only";
      case "triples":
        return "Triples only";
      case "sdt":
        return "S → D → T par numéro";
      default:
        return mode;
    }
  }

  function labelTarget(target: Target, mode: ClockMode, stage: StageSDT) {
    if (mode !== "sdt") {
      return target === "BULL" ? "Bull" : target.toString();
    }
    const stageLabel =
      stage === 0 ? "Simple" : stage === 1 ? "Double" : "Triple";
    const base = target === "BULL" ? "Bull" : target.toString();
    return `${base} (${stageLabel})`;
  }

  // ============================================
  // Rendu
  // ============================================
  return (
    <div
      className="page training-clock-page"
      style={{
        padding: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Header / breadcrumb */}
        <div style={{ marginBottom: 4 }}>
          <button
            type="button"
            onClick={() => window.history.back()}
            style={{
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.12)",
              padding: "4px 10px",
              fontSize: 11,
              background:
                "linear-gradient(180deg, rgba(40,40,45,.9), rgba(15,15,20,.95))",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              opacity: 0.9,
            }}
          >
            <span style={{ fontSize: 12 }}>←</span>
            <span>Games / Training</span>
          </button>
        </div>

        <div style={{ marginBottom: 4 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: 0.5,
              marginBottom: 4,
            }}
          >
            Tour de l&apos;horloge
          </div>
          <div
            style={{
              fontSize: 12,
              opacity: 0.8,
            }}
          >
            Vise 1 → 20 puis Bull. Choisis ton mode et suis ta précision.
          </div>
        </div>

        <div
          style={{
            alignSelf: "flex-start",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,.12)",
            padding: "4px 10px",
            fontSize: 11,
            opacity: 0.85,
            background:
              "linear-gradient(180deg, rgba(30,30,35,.9), rgba(10,10,12,.95))",
          }}
        >
          Profil : <strong>{playerName}</strong>
        </div>

        {/* ================== STEP SETUP ================== */}
        {step === "setup" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Choix du mode */}
            <section
              className="card"
              style={{
                borderRadius: 18,
                padding: 14,
                background:
                  "linear-gradient(180deg, rgba(25,25,30,.95), rgba(10,10,14,.98))",
                border: "1px solid rgba(255,255,255,.08)",
                boxShadow: "0 0 16px rgba(0,0,0,.6)",
              }}
            >
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                Mode de jeu
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(["classic", "doubles", "triples", "sdt"] as ClockMode[]).map(
                  (mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={
                        "chip w-full justify-between " +
                        (config.mode === mode ? "chip-active" : "")
                      }
                      style={{
                        justifyContent: "space-between",
                        fontSize: 13,
                      }}
                      onClick={() =>
                        setConfig((c) => ({ ...c, mode }))
                      }
                    >
                      <span>{labelMode(mode)}</span>
                      {config.mode === mode && (
                        <span
                          style={{
                            fontSize: 11,
                            opacity: 0.75,
                          }}
                        >
                          ✓ sélectionné
                        </span>
                      )}
                    </button>
                  )
                )}
              </div>
            </section>

            {/* Options timer / limite fléchettes */}
            <section
              className="card"
              style={{
                borderRadius: 18,
                padding: 14,
                background:
                  "linear-gradient(180deg, rgba(25,25,30,.95), rgba(10,10,14,.98))",
                border: "1px solid rgba(255,255,255,.08)",
                boxShadow: "0 0 16px rgba(0,0,0,.6)",
              }}
            >
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                Options
              </h2>

              {/* Timer */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ fontSize: 13 }}>Afficher le timer</div>
                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.7,
                    }}
                  >
                    Chrono visible pendant la session
                  </div>
                </div>
                <button
                  type="button"
                  className={
                    "chip " + (config.showTimer ? "chip-active" : "")
                  }
                  style={{ fontSize: 12 }}
                  onClick={() =>
                    setConfig((c) => ({
                      ...c,
                      showTimer: !c.showTimer,
                    }))
                  }
                >
                  {config.showTimer ? "Oui" : "Non"}
                </button>
              </div>

              {/* Limite de fléchettes */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ fontSize: 13 }}>
                    Limite de fléchettes
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.7,
                    }}
                  >
                    0 = illimité, sinon fin auto quand la limite
                    est atteinte
                  </div>
                </div>
                <select
                  className="chip"
                  style={{ fontSize: 12 }}
                  value={config.dartLimit ?? 0}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setConfig((c) => ({
                      ...c,
                      dartLimit: v > 0 ? v : null,
                    }));
                  }}
                >
                  <option value={0}>Illimité</option>
                  <option value={30}>30 fléchettes</option>
                  <option value={60}>60 fléchettes</option>
                  <option value={90}>90 fléchettes</option>
                </select>
              </div>
            </section>

            {/* Bouton démarrer */}
            <button
              type="button"
              className="btn-primary"
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 16,
                fontSize: 15,
                fontWeight: 700,
                marginTop: 2,
              }}
              onClick={handleStart}
            >
              Commencer la session
            </button>

            {/* Historique en bas */}
            {history.length > 0 && (
              <section style={{ marginTop: 6 }}>
                <h2
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  Dernières sessions
                </h2>
                <HistoryList history={history.slice(0, 5)} />
              </section>
            )}
          </div>
        )}

        {/* ================== STEP PLAY ================== */}
        {step === "play" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Bandeau infos */}
            <section
              className="card"
              style={{
                borderRadius: 16,
                padding: 12,
                background:
                  "linear-gradient(180deg, rgba(25,25,30,.95), rgba(8,8,12,.98))",
                border: "1px solid rgba(255,255,255,.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                <div>
                  Cible actuelle :{" "}
                  <strong>
                    {labelTarget(
                      currentTarget,
                      config.mode,
                      stageSDT
                    )}
                  </strong>
                </div>
                {config.showTimer && (
                  <div>
                    Temps :{" "}
                    <strong>{formatTime(elapsedNow)}</strong>
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  opacity: 0.85,
                }}
              >
                <div>
                  Fléchettes :{" "}
                  <strong>{dartsThrown}</strong>
                  {config.dartLimit != null &&
                    ` / ${config.dartLimit}`}
                </div>
                <div>
                  Hits : <strong>{hits}</strong>
                </div>
                <div>
                  Meilleure série :{" "}
                  <strong>{bestStreak}</strong>
                </div>
              </div>
            </section>

            {/* Mini keypad Tour de l'horloge */}
            <ClockPad
              selectedValue={selectedValue}
              setSelectedValue={setSelectedValue}
              selectedMult={selectedMult}
              setSelectedMult={setSelectedMult}
              isMiss={isMiss}
              setIsMiss={setIsMiss}
            />

            {/* Actions bas */}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="btn-ghost"
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 14,
                  fontSize: 13,
                }}
                onClick={handleAbort}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 14,
                  fontSize: 13,
                  fontWeight: 700,
                }}
                onClick={handleThrow}
              >
                Valider la fléchette
              </button>
            </div>
          </div>
        )}

        {/* ================== STEP SUMMARY ================== */}
        {step === "summary" && lastSession && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <section
              className="card"
              style={{
                borderRadius: 18,
                padding: 14,
                background:
                  "linear-gradient(180deg, rgba(25,25,30,.95), rgba(10,10,14,.98))",
                border: "1px solid rgba(255,255,255,.08)",
                boxShadow: "0 0 16px rgba(0,0,0,.6)",
                fontSize: 13,
              }}
            >
              <h2
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                Résumé de la session
              </h2>
              <div style={{ marginBottom: 2 }}>
                Mode :{" "}
                <strong>{labelMode(lastSession.config.mode)}</strong>
              </div>
              <div style={{ marginBottom: 2 }}>
                Terminé ?{" "}
                <strong>
                  {lastSession.completed ? "Oui 🎯" : "Non"}
                </strong>
              </div>
              <div style={{ marginBottom: 2 }}>
                Fléchettes :{" "}
                <strong>{lastSession.dartsThrown}</strong>
                {lastSession.config.dartLimit != null &&
                  ` / ${lastSession.config.dartLimit}`}
              </div>
              <div style={{ marginBottom: 2 }}>
                Hits : <strong>{lastSession.hits}</strong>
              </div>
              <div style={{ marginBottom: 2 }}>
                Meilleure série :{" "}
                <strong>{lastSession.bestStreak}</strong>
              </div>
              {lastSession.config.showTimer && (
                <div style={{ marginTop: 2 }}>
                  Temps :{" "}
                  <strong>
                    {formatTime(lastSession.elapsedMs)}
                  </strong>
                </div>
              )}
            </section>

            {history.length > 0 && (
              <section>
                <h2
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  Historique (local)
                </h2>
                <HistoryList history={history.slice(0, 10)} />
              </section>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="btn-ghost"
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 14,
                  fontSize: 13,
                }}
                onClick={() => setStep("setup")}
              >
                Retour au paramétrage
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 14,
                  fontSize: 13,
                  fontWeight: 700,
                }}
                onClick={handleStart}
              >
                Rejouer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingClock;

// ============================================
// Mini keypad spécifique Tour de l'horloge
// ============================================

type ClockPadProps = {
  selectedValue: Target | null;
  setSelectedValue: (v: Target | null) => void;
  selectedMult: 1 | 2 | 3;
  setSelectedMult: (m: 1 | 2 | 3) => void;
  isMiss: boolean;
  setIsMiss: (v: boolean) => void;
};

const ClockPad: React.FC<ClockPadProps> = ({
  selectedValue,
  setSelectedValue,
  selectedMult,
  setSelectedMult,
  isMiss,
  setIsMiss,
}) => {
  const handleSelectValue = (v: Target | null) => {
    setIsMiss(false);
    setSelectedValue(v);
  };

  const handleSelectMiss = () => {
    setIsMiss(true);
    setSelectedValue(null);
  };

  return (
    <section
      className="card"
      style={{
        borderRadius: 18,
        padding: 12,
        background:
          "linear-gradient(180deg, rgba(25,25,30,.95), rgba(8,8,12,.98))",
        border: "1px solid rgba(255,255,255,.08)",
        boxShadow: "0 0 14px rgba(0,0,0,.55)",
      }}
    >
      {/* Ligne Miss + Bull */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          className={
            "chip flex-1 " + (isMiss ? "chip-active" : "")
          }
          onClick={handleSelectMiss}
        >
          Miss
        </button>
        <button
          type="button"
          className={
            "chip flex-1 " +
            (selectedValue === "BULL" && !isMiss
              ? "chip-active"
              : "")
          }
          onClick={() => handleSelectValue("BULL")}
        >
          Bull
        </button>
      </div>

      {/* Grille 1-20 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 4,
          fontSize: 13,
        }}
      >
        {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            className={
              "chip py-1 " +
              (selectedValue === n && !isMiss
                ? "chip-active"
                : "")
            }
            onClick={() => handleSelectValue(n as Target)}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Multiplicateurs */}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          type="button"
          className={
            "chip flex-1 " +
            (!isMiss && selectedMult === 1
              ? "chip-active"
              : "")
          }
          onClick={() => {
            setIsMiss(false);
            setSelectedMult(1);
          }}
        >
          Simple
        </button>
        <button
          type="button"
          className={
            "chip flex-1 " +
            (!isMiss && selectedMult === 2
              ? "chip-active"
              : "")
          }
          onClick={() => {
            setIsMiss(false);
            setSelectedMult(2);
          }}
        >
          Double
        </button>
        <button
          type="button"
          className={
            "chip flex-1 " +
            (!isMiss && selectedMult === 3
              ? "chip-active"
              : "")
          }
          onClick={() => {
            setIsMiss(false);
            setSelectedMult(3);
          }}
        >
          Triple
        </button>
      </div>
    </section>
  );
};

// ============================================
// Liste historique (localStorage)
// ============================================

type HistoryListProps = {
  history: ClockSession[];
};

const HistoryList: React.FC<HistoryListProps> = ({ history }) => {
  if (!history.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {history.map((s) => (
        <div
          key={s.id}
          className="card"
          style={{
            borderRadius: 12,
            padding: "6px 8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            background:
              "linear-gradient(180deg, rgba(20,20,24,.95), rgba(8,8,10,.98))",
            border: "1px solid rgba(255,255,255,.06)",
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>
              {s.profileName} — {labelShortMode(s.config.mode)}
            </div>
            <div style={{ opacity: 0.7 }}>
              {new Date(s.startedAt).toLocaleString()} •{" "}
              {s.completed ? "Terminé" : "Interrompu"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div>
              🎯 {s.hits} / {s.dartsThrown}
            </div>
            {s.config.showTimer && (
              <div style={{ opacity: 0.7 }}>
                {formatTime(s.elapsedMs)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

function labelShortMode(mode: ClockMode): string {
  switch (mode) {
    case "classic":
      return "Classique";
    case "doubles":
      return "Doubles";
    case "triples":
      return "Triples";
    case "sdt":
      return "S-D-T";
    default:
      return mode;
  }
}
