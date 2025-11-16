// ============================================
// src/pages/TrainingClock.tsx
// Training — Tour de l'horloge (v5, solo + multi)
// - Choix de 1+ joueurs via médaillons d'avatars
// - Chaque joueur joue sa session à la suite
// - Historique local par session
// ============================================

import React from "react";
import { playSound } from "../lib/sound";
import type { Profile } from "../lib/types";

type ClockMode = "classic" | "doubles" | "triples" | "sdt";

type ClockConfig = {
  mode: ClockMode;
  showTimer: boolean;
  dartLimit: number | null; // nb de fléchettes max par joueur, null = illimité
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

type PlayerLite = { id: string | null; name: string };

type Props = {
  profiles: Profile[];
  activeProfileId: string | null;
};

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

function initialsFromName(name: string | undefined | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ============================================
// Component principal
// ============================================

const TrainingClock: React.FC<Props> = ({ profiles, activeProfileId }) => {
  // --- sélection de joueurs (solo + multi) ---
  const [selectedPlayerIds, setSelectedPlayerIds] = React.useState<string[]>(() => {
    const list = profiles || [];
    if (!list.length) return [];
    const found = activeProfileId && list.find((p) => p.id === activeProfileId);
    return [found?.id ?? list[0].id];
  });

  const players: PlayerLite[] = React.useMemo(
    () =>
      (selectedPlayerIds || []).map((id) => {
        const p = profiles.find((pr) => pr.id === id);
        return {
          id,
          name: p?.nickname ?? p?.name ?? "Joueur",
        };
      }),
    [selectedPlayerIds, profiles]
  );

  // index du joueur actuellement en train de jouer (step = "play" / "summary")
  const [currentPlayerIndex, setCurrentPlayerIndex] = React.useState(0);

  const currentPlayer: PlayerLite | null =
    players[currentPlayerIndex] ?? players[0] ?? {
      id: null,
      name: "Joueur solo",
    };

  const [step, setStep] = React.useState<"setup" | "play" | "summary">(
    "setup"
  );

  const [config, setConfig] = React.useState<ClockConfig>({
    mode: "classic",
    showTimer: true,
    dartLimit: null,
  });

  // état de la session en cours (pour LE joueur courant uniquement)
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

  // résumé de la session terminée (joueur courant)
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

  function handleStartForPlayer(playerIndex: number) {
    if (!players.length) return;
    const bounded = Math.max(0, Math.min(playerIndex, players.length - 1));
    setCurrentPlayerIndex(bounded);
    resetGameState();
    setLastSession(null);
    setStep("play");
    const now = Date.now();
    setStartTime(now);
    setEndTime(null);
    playSound("start");
  }

  function handleStart() {
    handleStartForPlayer(0);
  }

  function handleAbort() {
    setStep("setup");
  }

  function finishSessionForCurrentPlayer(completed: boolean) {
    const player = currentPlayer;
    const now = Date.now();
    setEndTime(now);

    const elapsed =
      startTime != null ? Math.max(0, now - startTime) : 0;

    const session: ClockSession = {
      id: generateId(),
      profileId: player?.id ?? null,
      profileName: player?.name ?? "Joueur solo",
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
    if (step !== "play") return;
    if (!isMiss && !selectedValue) return;

    // limite de fléchettes (par joueur)
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
            finishSessionForCurrentPlayer(true);
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

    // si limite atteinte -> fin de session pour ce joueur
    if (
      config.dartLimit != null &&
      newDarts >= config.dartLimit &&
      step === "play"
    ) {
      finishSessionForCurrentPlayer(false);
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

  const isMulti = players.length > 1;

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

        {/* Titre avec accent or (rappel X01Setup) */}
        <div
          style={{
            borderRadius: 22,
            padding: "10px 14px 12px",
            background:
              "linear-gradient(180deg, #ffc63a, #ffaf00)",
            color: "#111",
            boxShadow: "0 0 22px rgba(255,198,58,.55)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
              letterSpacing: 0.5,
            }}
          >
            Tour de l&apos;horloge
          </div>
          <div
            style={{
              fontSize: 11,
              opacity: 0.9,
            }}
          >
            Vise 1 → 20 puis Bull. Choisis ton mode et suis ta précision.
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 10,
              opacity: 0.85,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                background: "rgba(0,0,0,.12)",
                fontWeight: 700,
              }}
            >
              Training
            </span>
            <span>Sessions enregistrées localement (hors stats globales).</span>
          </div>
        </div>

        {/* ================== STEP SETUP ================== */}
        {step === "setup" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* JOUERS */}
            <section
              className="card"
              style={{
                borderRadius: 18,
                padding: 14,
                marginTop: 2,
                background:
                  "linear-gradient(180deg, rgba(25,25,30,.98), rgba(5,5,8,.98))",
                border: "1px solid rgba(255,255,255,.10)",
                boxShadow: "0 0 16px rgba(0,0,0,.7)",
              }}
            >
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                Joueurs
              </h2>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.75,
                  marginBottom: 10,
                }}
              >
                Sélectionne 1 à 4 joueurs. Chaque joueur jouera une
                session à la suite.
              </div>

              {profiles.length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Aucun profil pour l&apos;instant. Crée un profil dans
                  l&apos;onglet &quot;Profils&quot; pour enregistrer tes
                  stats.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 14,
                    paddingBottom: 4,
                  }}
                >
                  {profiles.map((p) => {
                    const selected = selectedPlayerIds.includes(p.id);
                    const name = p.nickname ?? p.name ?? "Joueur";
                    const initials = initialsFromName(name);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        title={name}
                        onClick={() => {
                          setSelectedPlayerIds((prev) => {
                            const exists = prev.includes(p.id);
                            if (exists) {
                              // ne jamais vider complètement
                              if (prev.length === 1) return prev;
                              return prev.filter((id) => id !== p.id);
                            }
                            if (prev.length >= 4) return prev;
                            return [...prev, p.id];
                          });
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          position: "relative",
                          width: 70,
                        }}
                      >
                        <div
                          style={{
                            borderRadius: "50%",
                            padding: 2,
                            background: selected
                              ? "linear-gradient(180deg,#ffc63a,#ffaf00)"
                              : "rgba(255,255,255,0.12)",
                            boxShadow: selected
                              ? "0 0 16px rgba(255,198,58,.55)"
                              : "none",
                            transition: "transform .12s ease, box-shadow .12s ease",
                          }}
                        >
                          <div
                            style={{
                              width: 60,
                              height: 60,
                              borderRadius: "50%",
                              overflow: "hidden",
                              background: "#222",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {p.avatarDataUrl ? (
                              <img
                                src={p.avatarDataUrl}
                                alt={name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <span
                                style={{
                                  fontSize: 18,
                                  fontWeight: 700,
                                  color: "#f5f5f5",
                                }}
                              >
                                {initials}
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 10,
                            textAlign: "center",
                            opacity: 0.9,
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                          }}
                        >
                          {name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Infos résumé joueurs */}
            <div
              style={{
                alignSelf: "flex-start",
                borderRadius: 999,
                border: "1px solid rgba(255,198,58,.45)",
                padding: "4px 10px",
                fontSize: 11,
                background:
                  "linear-gradient(180deg, rgba(50,40,20,.95), rgba(20,14,6,.98))",
                boxShadow: "0 0 12px rgba(255,198,58,.4)",
              }}
            >
              {isMulti
                ? `${players.length} joueurs sélectionnés`
                : `Mode solo • ${
                    currentPlayer?.name ?? "Joueur solo"
                  }`}
            </div>

            {/* Choix du mode */}
            <section
              className="card"
              style={{
                borderRadius: 18,
                padding: 14,
                background:
                  "linear-gradient(180deg, rgba(25,25,30,.98), rgba(5,5,8,.98))",
                border: "1px solid rgba(255,255,255,.10)",
                boxShadow: "0 0 16px rgba(0,0,0,.7)",
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
                  (mode) => {
                    const active = config.mode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        className={
                          "chip w-full justify-between " +
                          (active ? "chip-active" : "")
                        }
                        style={{
                          justifyContent: "space-between",
                          fontSize: 13,
                          background: active
                            ? "linear-gradient(180deg,#ffc63a,#ffaf00)"
                            : undefined,
                          color: active ? "#111" : undefined,
                          borderColor: active
                            ? "rgba(0,0,0,.45)"
                            : undefined,
                          boxShadow: active
                            ? "0 0 14px rgba(255,198,58,.55)"
                            : undefined,
                        }}
                        onClick={() =>
                          setConfig((c) => ({ ...c, mode }))
                        }
                      >
                        <span>{labelMode(mode)}</span>
                        {active && (
                          <span
                            style={{
                              fontSize: 11,
                              opacity: 0.8,
                            }}
                          >
                            ✓ sélectionné
                          </span>
                        )}
                      </button>
                    );
                  }
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
                  "linear-gradient(180deg, rgba(25,25,30,.98), rgba(5,5,8,.98))",
                border: "1px solid rgba(255,255,255,.10)",
                boxShadow: "0 0 16px rgba(0,0,0,.7)",
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
                  style={{
                    fontSize: 12,
                    minWidth: 64,
                    background: config.showTimer
                      ? "linear-gradient(180deg,#ffc63a,#ffaf00)"
                      : undefined,
                    color: config.showTimer ? "#111" : undefined,
                    borderColor: config.showTimer
                      ? "rgba(0,0,0,.45)"
                      : undefined,
                    boxShadow: config.showTimer
                      ? "0 0 10px rgba(255,198,58,.55)"
                      : undefined,
                  }}
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
                    Par joueur : 0 = illimité, sinon fin auto quand
                    la limite est atteinte
                  </div>
                </div>
                <select
                  className="chip"
                  style={{
                    fontSize: 12,
                    minWidth: 132,
                    background:
                      "linear-gradient(180deg, rgba(40,40,46,.95), rgba(18,18,24,.98))",
                    borderColor: "rgba(255,255,255,.22)",
                  }}
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

            {/* Bouton démarrer — style global doré */}
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
              disabled={!players.length}
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
                border: "1px solid rgba(255,255,255,.10)",
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
                  Joueur{" "}
                  {isMulti
                    ? `${currentPlayerIndex + 1}/${players.length}`
                    : "solo"}
                  :{" "}
                  <strong>{currentPlayer?.name}</strong>
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
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                <div>
                  Cible :{" "}
                  <strong>
                    {labelTarget(
                      currentTarget,
                      config.mode,
                      stageSDT
                    )}
                  </strong>
                </div>
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
                  "linear-gradient(180deg, rgba(25,25,30,.98), rgba(5,5,8,.98))",
                border: "1px solid rgba(255,255,255,.10)",
                boxShadow: "0 0 16px rgba(0,0,0,.7)",
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
                Joueur :{" "}
                <strong>{lastSession.profileName}</strong>
              </div>
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

            {/* Boutons bas : suivant / rejouer / retour */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {isMulti && currentPlayerIndex < players.length - 1 && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    borderRadius: 14,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                  onClick={() =>
                    handleStartForPlayer(currentPlayerIndex + 1)
                  }
                >
                  Joueur suivant :{" "}
                  {players[currentPlayerIndex + 1]?.name ?? ""}
                </button>
              )}

              <div style={{ display: "flex", gap: 8 }}>
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
                  onClick={() =>
                    handleStartForPlayer(currentPlayerIndex)
                  }
                >
                  Rejouer ce joueur
                </button>
              </div>
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
// Look harmonisé avec le Keypad X01
// ============================================

type ClockPadProps = {
  selectedValue: Target | null;
  setSelectedValue: (v: Target | null) => void;
  selectedMult: 1 | 2 | 3;
  setSelectedMult: (m: 1 | 2 | 3) => void;
  isMiss: boolean;
  setIsMiss: (v: boolean) => void;
};

type KeyVariant = "default" | "gold" | "teal" | "purple" | "green" | "grey";

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

  const Key = ({
    variant,
    active,
    children,
    onClick,
    grow,
  }: {
    variant: KeyVariant;
    active?: boolean;
    children: React.ReactNode;
    onClick: () => void;
    grow?: boolean;
  }) => {
    // Styles de base par variante (inspirés du keypad X01)
    let bg = "linear-gradient(180deg,#3b3f49,#262830)";
    let border = "1px solid rgba(0,0,0,.75)";
    let color = "#f5f5f5";
    let boxShadow = "inset 0 1px 0 rgba(255,255,255,.12)";

    if (variant === "gold") {
      bg = "linear-gradient(180deg,#ffc63a,#ffaf00)";
      border = "1px solid rgba(0,0,0,.75)";
      color = "#111";
      boxShadow = "0 0 12px rgba(255,198,58,.55)";
    }

    if (variant === "teal") {
      bg = "linear-gradient(180deg,#26d0a8,#1ca086)";
      border = "1px solid rgba(0,0,0,.75)";
      color = "#061312";
      boxShadow = "0 0 10px rgba(38,208,168,.45)";
    }

    if (variant === "purple") {
      bg = "linear-gradient(180deg,#b16adf,#8e44ad)";
      border = "1px solid rgba(0,0,0,.75)";
      color = "#110713";
      boxShadow = "0 0 10px rgba(177,106,223,.45)";
    }

    if (variant === "green") {
      bg = "linear-gradient(180deg,#29c76f,#1e8b4a)";
      border = "1px solid rgba(0,0,0,.75)";
      color = "#03140a";
      boxShadow = "0 0 10px rgba(41,199,111,.45)";
    }

    if (variant === "grey") {
      bg = "linear-gradient(180deg,#565a61,#3a3d43)";
      border = "1px solid rgba(0,0,0,.75)";
      color = "#f5f5f5";
      boxShadow = "inset 0 1px 0 rgba(255,255,255,.14)";
    }

    // Effet "actif" : on surligne en or, comme la touche active du keypad X01
    if (active && variant === "default") {
      bg = "linear-gradient(180deg,#ffc63a,#ffaf00)";
      border = "1px solid rgba(0,0,0,.8)";
      color = "#111";
      boxShadow = "0 0 10px rgba(255,198,58,.55)";
    }

    // Pour les variantes colorées, on renforce la lumière en actif
    if (active && variant !== "default") {
      boxShadow = boxShadow + ", 0 0 8px rgba(255,255,255,.2)";
    }

    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          flex: grow ? 1 : undefined,
          minWidth: grow ? undefined : 32,
          height: 34,
          borderRadius: 10,
          border,
          background: bg,
          boxShadow,
          color,
          fontSize: 13,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 6px",
        }}
      >
        {children}
      </button>
    );
  };

  return (
    <section
      className="card"
      style={{
        borderRadius: 18,
        padding: 10,
        background:
          "linear-gradient(180deg, rgba(18,18,22,.98), rgba(5,5,8,.98))",
        border: "1px solid rgba(255,255,255,.10)",
        boxShadow: "0 0 16px rgba(0,0,0,.7)",
      }}
    >
      <div
        style={{
          borderRadius: 16,
          padding: 10,
          background:
            "linear-gradient(180deg, rgba(35,35,42,.96), rgba(16,16,22,.99))",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.08)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Ligne Miss / Bull (Miss ~ bouton gris, Bull ~ bouton vert X01) */}
        <div style={{ display: "flex", gap: 6 }}>
          <Key
            variant="grey"
            active={isMiss}
            onClick={handleSelectMiss}
            grow
          >
            Miss
          </Key>
          <Key
            variant="green"
            active={selectedValue === "BULL" && !isMiss}
            onClick={() => handleSelectValue("BULL")}
            grow
          >
            Bull
          </Key>
        </div>

        {/* Grille 1–20 (touches chiffres gris foncé, actif en or) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 4,
          }}
        >
          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
            const active = selectedValue === n && !isMiss;
            return (
              <Key
                key={n}
                variant="default"
                active={active}
                onClick={() => handleSelectValue(n as Target)}
              >
                {n}
              </Key>
            );
          })}
        </div>

        {/* Ligne Simple / Double / Triple 
           → mapping visuel vers X01 :
           - Simple  = BLEU (comme "DOUBLE")
           - Double  = VIOLET (comme "TRIPLE")
           - Triple  = OR (comme "VALIDER")
        */}
        <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
          {/* Simple = bleu */}
          <Key
            variant="teal"
            active={!isMiss && selectedMult === 1}
            onClick={() => {
              setIsMiss(false);
              setSelectedMult(1);
            }}
            grow
          >
            Simple
          </Key>

          {/* Double = violet */}
          <Key
            variant="purple"
            active={!isMiss && selectedMult === 2}
            onClick={() => {
              setIsMiss(false);
              setSelectedMult(2);
            }}
            grow
          >
            Double
          </Key>

          {/* Triple = or */}
          <Key
            variant="gold"
            active={!isMiss && selectedMult === 3}
            onClick={() => {
              setIsMiss(false);
              setSelectedMult(3);
            }}
            grow
          >
            Triple
          </Key>
        </div>
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
            border: "1px solid rgba(255,255,255,.08)",
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
