// ============================================
// src/pages/ShanghaiPlay.tsx
// PATCH UI header :
// ✅ Supprime NOM + "Actif" dans le bloc header (avatar only)
// ✅ Grossit l’avatar pour remplir le bloc gauche
// ✅ KPI "TOUR" moins haut + contenu centré (2/20)
// ✅ AJOUT : image légère en fond derrière la cible (TargetBg)
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import InfoDot from "../components/InfoDot";
import Keypad from "../components/Keypad";
import type { Dart as UIDart } from "../lib/types";
import ShanghaiLogo from "../assets/SHANGHAI.png";

// ✅ Mets ton image de fond de cible ici (png/jpg)
// Exemple: src/assets/shanghai_target_bg.png
import TargetBg from "../assets/target_bg.png";

type PlayerLite = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  isBot?: boolean;
};

export type ShanghaiConfig = {
  players: PlayerLite[];
  maxRounds: number;
  winRule: "shanghai_or_points" | "points_only";
};

type Props = {
  config?: ShanghaiConfig;
  params?: any;
  onFinish?: (m: any) => void;
  onExit?: () => void;
};

function clampRounds(n: any) {
  const v = Number(n || 20);
  if (!Number.isFinite(v)) return 20;
  return Math.max(1, Math.min(20, Math.round(v)));
}

function shanghaiThrowTotal(target: number, throwDarts: UIDart[]) {
  return (throwDarts || []).reduce((acc, d) => {
    if (!d) return acc;
    if (d.v === 0) return acc;
    if (d.v !== target) return acc;
    return acc + target * (d.mult || 1);
  }, 0);
}

function isShanghaiOnTarget(target: number, throwDarts: UIDart[]) {
  const hits = (throwDarts || []).filter((d) => d && d.v === target);
  const s = hits.some((d) => d.mult === 1);
  const dd = hits.some((d) => d.mult === 2);
  const t = hits.some((d) => d.mult === 3);
  return s && dd && t;
}

export default function ShanghaiPlay(props: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const cfg: ShanghaiConfig | null =
    (props as any)?.config || (props as any)?.params?.config || null;

  const players = (cfg?.players || []).map((p) => ({
    id: String(p.id),
    name: p.name || "Joueur",
    avatarDataUrl: p.avatarDataUrl ?? null,
    isBot: !!p.isBot,
  }));

  const maxRounds = clampRounds(cfg?.maxRounds ?? 20);
  const winRule: ShanghaiConfig["winRule"] = cfg?.winRule ?? "shanghai_or_points";

  const safePlayers = players.length
    ? players
    : [{ id: "p1", name: "Joueur", avatarDataUrl: null }];

  const [round, setRound] = React.useState(1);
  const [turn, setTurn] = React.useState(0);

  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);

  const [scores, setScores] = React.useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const p of safePlayers) m[p.id] = 0;
    return m;
  });

  const [showInfo, setShowInfo] = React.useState(false);

  const target = round;
  const active = safePlayers[turn] || safePlayers[0];

  const thisTurnTotal = React.useMemo(
    () => shanghaiThrowTotal(target, currentThrow),
    [target, currentThrow]
  );

  const shanghaiNow = React.useMemo(
    () => isShanghaiOnTarget(target, currentThrow),
    [target, currentThrow]
  );

  function clearThrow() {
    setCurrentThrow([]);
    setMultiplier(1);
  }

  function pushDart(d: UIDart) {
    setCurrentThrow((prev) => {
      if (prev.length >= 3) return prev;
      return [...prev, d];
    });
  }

  function backspace() {
    setCurrentThrow((prev) => prev.slice(0, -1));
  }

  function cancelTurn() {
    backspace();
    setMultiplier(1);
  }

  function finishMatch(winnerId: string | null, reason: string) {
    const now = Date.now();
    const summary = {
      mode: "shanghai",
      winRule,
      maxRounds,
      reason,
      scores: safePlayers.map((p) => ({
        id: p.id,
        name: p.name,
        score: scores[p.id] ?? 0,
      })),
    };

    const match = {
      id: `shanghai-${now}-${Math.random().toString(36).slice(2, 8)}`,
      kind: "shanghai",
      status: "finished",
      createdAt: now,
      updatedAt: now,
      players: safePlayers.map((p) => ({
        id: p.id,
        name: p.name,
        avatarDataUrl: p.avatarDataUrl ?? null,
      })),
      winnerId,
      summary,
      payload: { config: cfg, summary },
    };

    props.onFinish?.(match);
  }

  function goNextAfterValidate(pidForSafety: string, extraScoreForSafety: number) {
    const nextTurn = turn + 1;

    if (nextTurn < safePlayers.length) {
      setTurn(nextTurn);
      return;
    }

    if (round < maxRounds) {
      setRound((r) => r + 1);
      setTurn(0);
      return;
    }

    const ranked = safePlayers
      .map((p) => ({
        id: p.id,
        v: (scores[p.id] ?? 0) + (p.id === pidForSafety ? extraScoreForSafety : 0),
      }))
      .sort((a, b) => b.v - a.v);

    finishMatch(ranked[0]?.id ?? null, "points");
  }

  function validateTurn() {
    if (currentThrow.length !== 3) return;

    const pid = active.id;
    const add = shanghaiThrowTotal(target, currentThrow);
    const isSh = isShanghaiOnTarget(target, currentThrow);

    setScores((prev) => {
      const next = { ...prev };
      next[pid] = (next[pid] ?? 0) + add;
      return next;
    });

    clearThrow();

    if (winRule === "shanghai_or_points" && isSh) {
      finishMatch(pid, "shanghai");
      return;
    }

    goNextAfterValidate(pid, add);
  }

  const cardShell: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: theme.card,
    boxShadow: `0 10px 24px rgba(0,0,0,0.55)`,
    overflow: "hidden",
  };

  const KEYPAD_H = 360;

  if (!cfg || !cfg.players?.length) {
    return (
      <div style={{ padding: 16, color: theme.text }}>
        <button onClick={props.onExit} style={{ marginBottom: 12 }}>
          ← Retour
        </button>
        <div>Configuration Shanghai manquante.</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ==== TOP (fix) : retour + logo + info ==== */}
      <div
        style={{
          padding: 16,
          paddingBottom: 10,
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: theme.bg,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <button
            onClick={props.onExit}
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,0.22)",
              color: theme.text,
              fontWeight: 950,
              cursor: "pointer",
            }}
            title="Retour"
          >
            ←
          </button>

          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <img
              src={ShanghaiLogo}
              alt="Shanghai"
              style={{
                height: 44,
                width: "auto",
                maxWidth: "100%",
                display: "block",
                filter: "drop-shadow(0 0 10px rgba(255,180,0,.25))",
              }}
            />
          </div>

          <InfoDot
            onClick={(ev) => {
              ev.stopPropagation();
              setShowInfo(true);
            }}
            glow={theme.primary + "88"}
          />
        </div>

        {/* ==== HEADER (fix) ==== */}
        <div style={{ ...cardShell, width: "100%", maxWidth: 520, margin: "0 auto" }}>
          <div
            style={{
              padding: 12,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              alignItems: "stretch",
            }}
          >
            {/* gauche */}
            <div
              style={{
                borderRadius: 16,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,0.18)",
                padding: 12,
                display: "grid",
                gap: 10,
              }}
            >
              {/* ✅ KPI TOUR compact + 2/20 centré */}
              <div
                style={{
                  borderRadius: 14,
                  border: `1px solid ${theme.primary}44`,
                  background: "linear-gradient(180deg, rgba(0,0,0,.22), rgba(0,0,0,.34))",
                  boxShadow: `0 0 18px ${theme.primary}22`,
                  padding: "8px 10px",
                  display: "grid",
                  placeItems: "center",
                  minHeight: 44,
                }}
              >
                <div style={{ fontSize: 10.5, letterSpacing: 0.9, opacity: 0.85, textTransform: "uppercase" }}>
                  {t("shanghai.round", "Tour")}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 1000,
                    color: theme.primary,
                    textShadow: `0 0 10px ${theme.primary}55`,
                    lineHeight: 1,
                    marginTop: 2,
                  }}
                >
                  {round}/{maxRounds}
                </div>
              </div>

              {/* ✅ AVATAR ONLY (plus gros) */}
              <div
                style={{
                  borderRadius: 16,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,0.14)",
                  overflow: "hidden",
                  width: "100%",
                  aspectRatio: "1 / 1",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {active.avatarDataUrl ? (
                  <img
                    src={active.avatarDataUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ opacity: 0.75, fontWeight: 950, fontSize: 22 }}>?</span>
                )}
              </div>
            </div>

            {/* droite */}
            <div
              style={{
                borderRadius: 16,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,0.18)",
                padding: 12,
                display: "grid",
                gap: 10,
              }}
            >
              {/* ✅ CIBLE + image de fond très légère */}
              <div
                style={{
                  borderRadius: 16,
                  border: `1px solid ${theme.borderSoft}`,
                  background:
                    "radial-gradient(circle at 50% 45%, rgba(255,198,58,.18), rgba(0,0,0,.55) 62%), rgba(0,0,0,.22)",
                  position: "relative",
                  overflow: "hidden",
                  minHeight: 120,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {/* ✅ IMAGE DE FOND ULTRA LÉGÈRE */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `url(${TargetBg})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                    opacity: 0.10, // ajuste 0.06..0.14
                    filter: "blur(0.2px) saturate(1.05)",
                    mixBlendMode: "screen",
                    pointerEvents: "none",
                  }}
                />
                {/* (Optionnel) voile sombre léger */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.20)",
                    pointerEvents: "none",
                  }}
                />

                <svg
                  viewBox="0 0 200 200"
                  width="120"
                  height="120"
                  style={{ position: "absolute", inset: 0, margin: "auto", opacity: 0.22 }}
                >
                  <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(255,198,58,.65)" strokeWidth="4" />
                  <circle cx="100" cy="100" r="62" fill="none" stroke="rgba(255,198,58,.35)" strokeWidth="3" />
                  <circle cx="100" cy="100" r="38" fill="none" stroke="rgba(255,198,58,.25)" strokeWidth="3" />
                  <circle cx="100" cy="100" r="14" fill="none" stroke="rgba(255,198,58,.55)" strokeWidth="4" />
                  <line x1="100" y1="10" x2="100" y2="190" stroke="rgba(255,198,58,.18)" strokeWidth="2" />
                  <line x1="10" y1="100" x2="190" y2="100" stroke="rgba(255,198,58,.18)" strokeWidth="2" />
                </svg>

                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background: "linear-gradient(180deg, rgba(255,210,90,.22), rgba(0,0,0,.35))",
                    border: `1px solid ${theme.primary}66`,
                    boxShadow: `0 0 24px ${theme.primary}33`,
                    position: "relative",
                    zIndex: 1,
                  }}
                  aria-label={`Cible ${target}`}
                  title={`Cible ${target}`}
                >
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 1000,
                      color: theme.primary,
                      textShadow: `0 0 16px ${theme.primary}66`,
                    }}
                  >
                    {target}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                {(() => {
                  const chip = (d?: UIDart, idx?: number) => {
                    const empty = !d;
                    const v = d?.v ?? 0;
                    const m = d?.mult ?? 1;

                    let txt = "—";
                    if (!empty) {
                      if (v === 0) txt = "MISS";
                      else txt = `${m === 3 ? "T" : m === 2 ? "D" : "S"}${v}`;
                    }

                    const accent =
                      empty || v === 0
                        ? "rgba(255,255,255,.20)"
                        : m === 3
                          ? "rgba(251,113,133,.55)"
                          : m === 2
                            ? "rgba(52,211,153,.55)"
                            : `${theme.primary}88`;

                    return (
                      <div
                        key={idx ?? Math.random()}
                        style={{
                          minWidth: 64,
                          textAlign: "center",
                          padding: "10px 12px",
                          borderRadius: 14,
                          border: `1px solid ${accent}`,
                          background: "rgba(0,0,0,0.22)",
                          color: theme.text,
                          fontWeight: 950,
                          letterSpacing: 0.4,
                          boxShadow: empty ? "none" : `0 0 14px ${accent}`,
                        }}
                      >
                        {txt}
                      </div>
                    );
                  };
                  return (
                    <>
                      {chip(currentThrow[0], 0)}
                      {chip(currentThrow[1], 1)}
                      {chip(currentThrow[2], 2)}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==== ZONE SCROLL (liste joueurs uniquement) ==== */}
      <div
        style={{
          position: "relative",
          padding: "0 16px",
          paddingBottom: KEYPAD_H + 20,
        }}
      >
        <div style={{ width: "100%", maxWidth: 520, margin: "0 auto" }}>
          <div
            style={{
              ...cardShell,
              padding: 12,
              marginBottom: 12,
              maxHeight: `calc(100vh - ${KEYPAD_H + 220}px)`,
              overflowY: "auto",
              overscrollBehavior: "contain",
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              {safePlayers.map((p) => {
                const isActive = p.id === active.id;
                const val = scores[p.id] ?? 0;

                return (
                  <div
                    key={p.id}
                    style={{
                      padding: 10,
                      borderRadius: 16,
                      border: `1px solid ${isActive ? theme.primary + "66" : theme.borderSoft}`,
                      background: isActive ? `${theme.primary}12` : "rgba(0,0,0,0.18)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 999,
                        overflow: "hidden",
                        border: `1px solid ${theme.borderSoft}`,
                        background: "rgba(255,255,255,0.06)",
                        display: "grid",
                        placeItems: "center",
                        flex: "0 0 auto",
                      }}
                    >
                      {p.avatarDataUrl ? (
                        <img
                          src={p.avatarDataUrl}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <span style={{ opacity: 0.75, fontWeight: 900 }}>?</span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 950,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {p.name}
                      </div>
                      {isActive ? (
                        <div style={{ fontSize: 12, color: theme.primary, fontWeight: 900, marginTop: 2 }}>
                          {t("common.active", "Actif")}
                        </div>
                      ) : (
                        <div style={{ height: 16 }} />
                      )}
                    </div>

                    <div style={{ fontWeight: 950, fontSize: 16 }}>{val}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ==== KEYPAD FIXE BOTTOM ==== */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 20,
          padding: 16,
          paddingBottom: 18,
          background: "linear-gradient(180deg, rgba(0,0,0,0.00), rgba(0,0,0,0.55) 18%, rgba(0,0,0,0.82))",
          backdropFilter: "blur(6px)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 520, margin: "0 auto" }}>
          <Keypad
            currentThrow={currentThrow}
            multiplier={multiplier}
            onSimple={() => setMultiplier(1)}
            onDouble={() => setMultiplier(2)}
            onTriple={() => setMultiplier(3)}
            onBackspace={() => setCurrentThrow((prev) => prev.slice(0, -1))}
            onCancel={cancelTurn}
            onNumber={(n) => {
              const v = Number(n);
              if (!Number.isFinite(v)) return;
              pushDart({ v, mult: v === 0 ? 1 : multiplier } as any);
              setMultiplier(1);
            }}
            onBull={() => {
              pushDart({ v: 0, mult: 1 } as any);
              setMultiplier(1);
            }}
            onValidate={validateTurn}
            hidePreview={true}
          />

          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 10 }}>
            <div
              style={{
                borderRadius: 999,
                padding: "8px 12px",
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,0.18)",
                color: theme.textSoft,
                fontWeight: 900,
                fontSize: 12.5,
              }}
            >
              +{thisTurnTotal} pts
            </div>

            {winRule === "shanghai_or_points" && shanghaiNow && currentThrow.length > 0 ? (
              <div
                style={{
                  borderRadius: 999,
                  padding: "8px 12px",
                  border: `1px solid ${theme.primary}66`,
                  background: `${theme.primary}12`,
                  color: theme.primary,
                  fontWeight: 950,
                  fontSize: 12.5,
                  textShadow: `0 0 10px ${theme.primary}55`,
                }}
              >
                💥 SHANGHAI !
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ==== MODAL INFO ==== */}
      {showInfo && (
        <div
          onClick={() => setShowInfo(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 460,
              margin: 16,
              padding: 18,
              borderRadius: 18,
              background: theme.card,
              border: `1px solid ${theme.primary}55`,
              boxShadow: `0 18px 40px rgba(0,0,0,.7)`,
              color: theme.text,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                marginBottom: 8,
                color: theme.primary,
                textTransform: "uppercase",
                textShadow: `0 0 10px ${theme.primary}55`,
              }}
            >
              {t("shanghai.rules.title", "Règles Shanghai")}
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.45, color: theme.textSoft }}>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>
                  {t(
                    "shanghai.rules.target",
                    "La cible correspond au numéro du tour (Tour 1 → viser 1, Tour 2 → viser 2, …)."
                  )}
                </li>
                <li>
                  {t(
                    "shanghai.rules.scoring",
                    "Seuls les hits sur la cible comptent : SIMPLE = ×1, DOUBLE = ×2, TRIPLE = ×3."
                  )}
                </li>
                <li>
                  {t(
                    "shanghai.rules.shanghai",
                    "Un SHANGHAI = faire SIMPLE + DOUBLE + TRIPLE sur la cible dans la même volée (3 flèches)."
                  )}
                </li>
                <li>
                  {winRule === "shanghai_or_points"
                    ? t(
                        "shanghai.rules.win1",
                        "Si tu fais un SHANGHAI, tu gagnes immédiatement. Sinon, le gagnant est celui qui a le plus de points à la fin."
                      )
                    : t(
                        "shanghai.rules.win2",
                        "Pas de victoire instantanée : le gagnant est celui qui a le plus de points à la fin."
                      )}
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setShowInfo(false)}
              style={{
                display: "block",
                marginLeft: "auto",
                marginTop: 14,
                padding: "6px 14px",
                borderRadius: 999,
                border: "none",
                background: theme.primary,
                color: "#000",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {t("games.info.close", "Fermer")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
