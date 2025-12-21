// ============================================
// src/pages/ShanghaiPlay.tsx
// FIN DE PARTIE + RESUME + SAVE HISTORY
// ✅ Header FIXE (toujours visible) + réduit en hauteur
// ✅ ✅ FIX SCROLL: la liste joueurs est le SEUL conteneur scrollable
//    - top = hauteur header mesurée
//    - bottom = hauteur keypad mesurée + BottomNav + safe-area
//    -> plus aucun joueur caché / premier non coupé / dernier visible
// ✅ Keypad fixe en bas (compact) AU-DESSUS de BottomNav
// ✅ End modal cliquable (zIndex/pointerEvents)
// ✅ FIX MOBILE: avatar header = médaillon CERCLE (pas image plein bloc) + pas de fond blanc
// ✅ NEW: ordre des cibles (chronologique / aléatoire) via cfg.targetOrderMode + cfg.targetOrder persisté
// ✅ FIX: suppression du “+0 pts” sous le keypad (supprimé totalement)
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import InfoDot from "../components/InfoDot";
import Keypad from "../components/Keypad";
import type { Dart as UIDart } from "../lib/types";
import ShanghaiLogo from "../assets/SHANGHAI.png";
import TargetBg from "../assets/target_bg.png";

// ✅ SFX + Voice
import {
  setSfxEnabled,
  playImpactFromDart,
  playShanghaiIntro,
  playShanghaiMiss,
} from "../lib/sfx";
import {
  setVoiceEnabled,
  announceTurn,
  announceVolleyScore,
} from "../lib/voice";

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

  sfxEnabled?: boolean;
  voiceEnabled?: boolean;
  introPlayed?: boolean;

  // ✅ NEW: ordre des cibles
  targetOrderMode?: "chronological" | "random";
  // ✅ NEW: ordre concret (persisté) des cibles de la partie
  targetOrder?: number[];
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

function makeRange(n: number) {
  const out: number[] = [];
  for (let i = 1; i <= n; i++) out.push(i);
  return out;
}

function shuffleArray<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function buildTargetOrder(maxRounds: number, mode: "chronological" | "random") {
  const base = makeRange(20); // Shanghai classique: 1..20
  const order = mode === "random" ? shuffleArray(base) : base;
  return order.slice(0, maxRounds);
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

function fmtChip(d?: UIDart) {
  if (!d) return "—";
  const v = d.v ?? 0;
  const m = d.mult ?? 1;
  if (v === 0) return "MISS";
  if (v === 25) return m === 2 ? "DBULL" : "BULL";
  return `${m === 3 ? "T" : m === 2 ? "D" : "S"}${v}`;
}

type EndData = {
  winnerId: string | null;
  reason: "shanghai" | "points";
  ranked: Array<{
    id: string;
    name: string;
    avatarDataUrl?: string | null;
    score: number;
  }>;
  createdAt: number;
};

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
  const winRule: ShanghaiConfig["winRule"] =
    cfg?.winRule ?? "shanghai_or_points";

  // ✅ NEW: mode ordre des cibles + ordre stable pour la partie
  const targetOrderMode: "chronological" | "random" =
    (cfg as any)?.targetOrderMode ?? "chronological";

  const targetOrderRef = React.useRef<number[] | null>(null);
  if (!targetOrderRef.current) {
    const provided = Array.isArray((cfg as any)?.targetOrder)
      ? (cfg as any).targetOrder
          .map((x: any) => Number(x))
          .filter((n: any) => Number.isFinite(n) && n >= 1 && n <= 20)
      : null;

    targetOrderRef.current =
      provided && provided.length >= maxRounds
        ? provided.slice(0, maxRounds)
        : buildTargetOrder(maxRounds, targetOrderMode);
  }

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

  const [lastThrowsById, setLastThrowsById] = React.useState<
    Record<string, UIDart[]>
  >(() => {
    const m: Record<string, UIDart[]> = {};
    for (const p of safePlayers) m[p.id] = [];
    return m;
  });

  const [showInfo, setShowInfo] = React.useState(false);
  const [endData, setEndData] = React.useState<EndData | null>(null);

  // ✅ NEW: target selon ordre défini
  const target = targetOrderRef.current?.[round - 1] ?? round;

  const active = safePlayers[turn] || safePlayers[0];

  const sfxEnabled =
    (cfg as any)?.sfxEnabled ??
    ((props as any)?.params?.store?.settings?.sfxEnabled ?? true);

  const voiceEnabled =
    (cfg as any)?.voiceEnabled ??
    ((props as any)?.params?.store?.settings?.voiceEnabled ?? true);

  const introPlayedRef = React.useRef<boolean>(!!(cfg as any)?.introPlayed);
  const prevTurnRef = React.useRef<string>("");

  const INTRO_DELAY_MS = 10000;
  const NEXT_TURN_DELAY_MS = 220;

  const voiceTimerRef = React.useRef<number | null>(null);
  const voiceBlockUntilRef = React.useRef<number>(0);

  const didSaveRef = React.useRef(false);

  // ✅ BottomNav: hauteur approximative de la barre d’icônes (ou override via params)
  const BOTTOM_NAV_H =
    Number((props as any)?.params?.bottomNavH) > 0
      ? Number((props as any)?.params?.bottomNavH)
      : 64;

  // ✅ HEADER FIXE: on mesure sa hauteur pour BORNER le scroll (top)
  const headerRef = React.useRef<HTMLDivElement | null>(null);
  const [headerH, setHeaderH] = React.useState<number>(210); // fallback

  React.useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const measure = () => {
      const h = el.getBoundingClientRect().height || 0;
      if (h > 0) setHeaderH(Math.round(h));
    };

    measure();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      ro.observe(el);
    } else {
      const id = window.setInterval(measure, 500);
      return () => window.clearInterval(id);
    }
    return () => ro?.disconnect();
  }, []);

  // ✅ KEYPAD: mesure hauteur réelle (pour BORNER le scroll bottom)
  const keypadWrapRef = React.useRef<HTMLDivElement | null>(null);
  const [keypadH, setKeypadH] = React.useState<number>(300); // fallback

  React.useEffect(() => {
    const el = keypadWrapRef.current;
    if (!el) return;

    const measure = () => {
      const h = el.getBoundingClientRect().height || 0;
      if (h > 0) setKeypadH(Math.round(h));
    };

    // petit délai pour laisser Keypad se layout + scale
    const t0 = window.setTimeout(measure, 60);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      ro.observe(el);
    } else {
      const id = window.setInterval(measure, 500);
      return () => {
        window.clearTimeout(t0);
        window.clearInterval(id);
      };
    }

    return () => {
      window.clearTimeout(t0);
      ro?.disconnect();
    };
  }, []);

  function scheduleAnnounce(name: string, delayMs: number) {
    if (!name) return;
    if (voiceTimerRef.current) {
      window.clearTimeout(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    voiceTimerRef.current = window.setTimeout(() => {
      if (voiceEnabled !== false) announceTurn(name);
    }, Math.max(0, delayMs)) as any;
  }

  React.useEffect(() => {
    setSfxEnabled(sfxEnabled !== false);
    setVoiceEnabled(voiceEnabled !== false);

    prevTurnRef.current = `${round}-${active?.id ?? ""}`;

    if (!introPlayedRef.current && sfxEnabled !== false) {
      try {
        playShanghaiIntro();
        introPlayedRef.current = true;
      } catch {}
    }

    voiceBlockUntilRef.current = Date.now() + INTRO_DELAY_MS;

    if (voiceEnabled !== false && active?.name) {
      scheduleAnnounce(active.name, INTRO_DELAY_MS);
    }

    return () => {
      if (voiceTimerRef.current) {
        window.clearTimeout(voiceTimerRef.current);
        voiceTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (endData) return;

    const key = `${round}-${active?.id ?? ""}`;
    if (prevTurnRef.current === key) return;
    prevTurnRef.current = key;

    setSfxEnabled(sfxEnabled !== false);
    setVoiceEnabled(voiceEnabled !== false);

    if (Date.now() < voiceBlockUntilRef.current) return;

    if (voiceEnabled !== false && active?.name) {
      scheduleAnnounce(active.name, NEXT_TURN_DELAY_MS);
    }
  }, [round, active?.id, endData, sfxEnabled, voiceEnabled, active?.name]);

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

      if (sfxEnabled !== false) {
        if ((d?.v ?? 0) === 0) playShanghaiMiss();
        else {
          playImpactFromDart({
            value: d.v as any,
            mult: d.mult as any,
          } as any);
        }
      }

      return [...prev, d];
    });
  }

  function cancelTurn() {
    setCurrentThrow((prev) => prev.slice(0, -1));
    setMultiplier(1);
  }

  function computeRanking(extra?: { pid: string; add: number }) {
    const ranked = safePlayers
      .map((p) => {
        const base = scores[p.id] ?? 0;
        const plus = extra && extra.pid === p.id ? extra.add : 0;
        return {
          id: p.id,
          name: p.name,
          avatarDataUrl: p.avatarDataUrl ?? null,
          score: base + plus,
        };
      })
      .sort((a, b) => b.score - a.score);

    return ranked;
  }

  function buildMatchPayload(
    winnerId: string | null,
    reason: "shanghai" | "points",
    createdAt: number
  ) {
    const summary = {
      mode: "shanghai",
      winRule,
      maxRounds,
      reason,
      targetOrderMode,
      targetOrder: targetOrderRef.current,
      scores: safePlayers.map((p) => ({
        id: p.id,
        name: p.name,
        score: scores[p.id] ?? 0,
      })),
    };

    return {
      id: `shanghai-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
      kind: "shanghai",
      status: "finished",
      createdAt,
      updatedAt: createdAt,
      players: safePlayers.map((p) => ({
        id: p.id,
        name: p.name,
        avatarDataUrl: p.avatarDataUrl ?? null,
        isBot: !!(p as any).isBot,
      })),
      winnerId,
      summary,
      payload: {
        config: {
          ...(cfg as any),
          targetOrderMode,
          targetOrder: targetOrderRef.current,
        },
        summary,
        lastThrowsById,
      },
    };
  }

  function openEndScreen(
    winnerId: string | null,
    reason: "shanghai" | "points",
    extra?: { pid: string; add: number }
  ) {
    const createdAt = Date.now();
    const ranked = computeRanking(extra);
    didSaveRef.current = false;
    setEndData({ winnerId, reason, ranked, createdAt });
  }

  function validateTurn() {
    if (endData) return;
    if (currentThrow.length !== 3) return;

    const pid = active.id;
    const snapshot = [...currentThrow].slice(0, 3);

    const add = shanghaiThrowTotal(target, snapshot);
    const isSh = isShanghaiOnTarget(target, snapshot);

    setLastThrowsById((prev) => ({ ...prev, [pid]: snapshot }));

    if (voiceEnabled !== false) {
      announceVolleyScore(active.name, add);
    }

    setScores((prev) => {
      const next = { ...prev };
      next[pid] = (next[pid] ?? 0) + add;
      return next;
    });

    clearThrow();

    if (winRule === "shanghai_or_points" && isSh) {
      openEndScreen(pid, "shanghai", { pid, add });
      return;
    }

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

    const ranked = computeRanking({ pid, add });
    openEndScreen(ranked[0]?.id ?? null, "points", { pid, add });
  }

  const cardShell: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: theme.card,
    boxShadow: `0 10px 24px rgba(0,0,0,0.55)`,
    overflow: "hidden",
  };

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

  const renderThrowChips = (arr?: UIDart[]) => {
    const a = arr || [];
    const chip = (d?: UIDart, idx?: number) => {
      const empty = !d;
      const v = d?.v ?? 0;
      const m = d?.mult ?? 1;

      const accent =
        empty || v === 0
          ? "rgba(255,255,255,.18)"
          : m === 3
          ? "rgba(251,113,133,.55)"
          : m === 2
          ? "rgba(52,211,153,.55)"
          : `${theme.primary}88`;

      return (
        <div
          key={idx ?? Math.random()}
          style={{
            minWidth: 34,
            textAlign: "center",
            padding: "5px 7px",
            borderRadius: 10,
            border: `1px solid ${accent}`,
            background: "rgba(0,0,0,0.22)",
            color: theme.text,
            fontWeight: 950,
            fontSize: 11,
            letterSpacing: 0.2,
            boxShadow: empty ? "none" : `0 0 9px ${accent}`,
            lineHeight: 1.05,
          }}
        >
          {fmtChip(d)}
        </div>
      );
    };

    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {chip(a[0], 0)}
        {chip(a[1], 1)}
        {chip(a[2], 2)}
      </div>
    );
  };

  const bottomOffsetPx = BOTTOM_NAV_H; // safe-area géré via env() dans les calc CSS

  return (
    <div
      style={{
        height: "100vh",
        background: theme.bg,
        color: theme.text,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ===================== */}
      {/* HEADER FIXE (réduit) */}
      {/* ===================== */}
      <div
        ref={headerRef}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          top: 0,
          zIndex: 40,
          padding: 10,
          paddingBottom: 8,
          background:
            "linear-gradient(180deg, rgba(0,0,0,.65), rgba(0,0,0,.10))",
          backdropFilter: "blur(6px)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 520, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 6,
            }}
          >
            <button
              onClick={props.onExit}
              style={{
                width: 36,
                height: 36,
                borderRadius: 13,
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
                  height: 34,
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

          <div style={{ ...cardShell, width: "100%" }}>
            <div
              style={{
                padding: 8,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                alignItems: "stretch",
              }}
            >
              {/* gauche */}
              <div
                style={{
                  borderRadius: 16,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,0.18)",
                  padding: 8,
                  display: "grid",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    borderRadius: 14,
                    border: `1px solid ${theme.primary}44`,
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,.22), rgba(0,0,0,.34))",
                    boxShadow: `0 0 18px ${theme.primary}22`,
                    padding: "5px 10px",
                    display: "grid",
                    placeItems: "center",
                    minHeight: 36,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10.2,
                      letterSpacing: 0.9,
                      opacity: 0.85,
                      textTransform: "uppercase",
                    }}
                  >
                    {t("shanghai.round", "Tour")}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 1000,
                      color: theme.primary,
                      textShadow: `0 0 10px ${theme.primary}55`,
                      lineHeight: 1,
                      marginTop: 1,
                    }}
                  >
                    {round}/{maxRounds}
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${theme.borderSoft}`,
                    background: "rgba(0,0,0,0.14)",
                    padding: 8,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 84,
                      height: 84,
                      borderRadius: 999,
                      overflow: "hidden",
                      background: "rgba(0,0,0,0.22)",
                      border: `1px solid ${theme.borderSoft}`,
                      boxShadow: `0 0 16px rgba(0,0,0,.35)`,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {active.avatarDataUrl ? (
                      <img
                        src={active.avatarDataUrl}
                        alt=""
                        draggable={false}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          background: "transparent",
                          display: "block",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          opacity: 0.75,
                          fontWeight: 950,
                          fontSize: 22,
                        }}
                      >
                        ?
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* droite */}
              <div
                style={{
                  borderRadius: 16,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,0.18)",
                  padding: 8,
                  display: "grid",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${theme.borderSoft}`,
                    background:
                      "radial-gradient(circle at 50% 45%, rgba(255,198,58,.16), rgba(0,0,0,.60) 64%), rgba(0,0,0,.22)",
                    position: "relative",
                    overflow: "hidden",
                    minHeight: 92,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage: `url(${TargetBg})`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                      backgroundSize: "cover",
                      opacity: 0.42,
                      filter: "saturate(1.12) contrast(1.05)",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.10)",
                    }}
                  />

                  <div
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      background:
                        "linear-gradient(180deg, rgba(255,210,90,.22), rgba(0,0,0,.35))",
                      border: `1px solid ${theme.primary}66`,
                      boxShadow: `0 0 22px ${theme.primary}33`,
                      position: "relative",
                      zIndex: 1,
                    }}
                    aria-label={`Cible ${target}`}
                    title={`Cible ${target}`}
                  >
                    <div
                      style={{
                        fontSize: 21,
                        fontWeight: 1000,
                        color: theme.primary,
                        textShadow: `0 0 16px ${theme.primary}66`,
                      }}
                    >
                      {target}
                    </div>
                  </div>
                </div>

                <div
                  style={{ display: "flex", justifyContent: "center", gap: 8 }}
                >
                  {renderThrowChips(currentThrow)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== */}
      {/* LISTE JOUEURS — SEUL CONTENEUR SCROLLABLE */}
      {/* ===================== */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          // ✅ borne top exactement sous le header
          top: headerH,
          // ✅ borne bottom exactement au-dessus du keypad + BottomNav + safe-area
          bottom: `calc(${bottomOffsetPx + keypadH}px + env(safe-area-inset-bottom, 0px))`,
          zIndex: 5,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          paddingTop: 10,
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 10,
        }}
      >
        <div style={{ width: "100%", maxWidth: 520, margin: "0 auto" }}>
          <div style={{ ...cardShell, padding: 10 }}>
            <div style={{ display: "grid", gap: 8 }}>
              {safePlayers.map((p) => {
                const isActive = p.id === active.id;
                const val = scores[p.id] ?? 0;
                const last = lastThrowsById[p.id] || [];

                return (
                  <div
                    key={p.id}
                    style={{
                      padding: "7px 10px",
                      borderRadius: 14,
                      border: `1px solid ${
                        isActive ? theme.primary + "66" : theme.borderSoft
                      }`,
                      background: isActive
                        ? `${theme.primary}10`
                        : "rgba(0,0,0,0.16)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minHeight: 52,
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 999,
                        overflow: "hidden",
                        border: `1px solid ${theme.borderSoft}`,
                        background: "rgba(0,0,0,0.18)",
                        display: "grid",
                        placeItems: "center",
                        flex: "0 0 auto",
                      }}
                    >
                      {p.avatarDataUrl ? (
                        <img
                          src={p.avatarDataUrl}
                          alt=""
                          draggable={false}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            opacity: 0.75,
                            fontWeight: 900,
                            fontSize: 14,
                          }}
                        >
                          ?
                        </span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 950,
                          fontSize: 12.6,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: 1.05,
                        }}
                      >
                        {p.name}
                      </div>

                      {isActive ? (
                        <div
                          style={{
                            fontSize: 10.8,
                            color: theme.primary,
                            fontWeight: 900,
                            marginTop: 1,
                          }}
                        >
                          {t("common.active", "Actif")}
                        </div>
                      ) : (
                        <div style={{ height: 12 }} />
                      )}
                    </div>

                    <div style={{ flex: "0 0 auto" }}>
                      {renderThrowChips(last)}
                    </div>

                    <div
                      style={{
                        fontWeight: 1000,
                        fontSize: 15,
                        minWidth: 26,
                        textAlign: "right",
                      }}
                    >
                      {val}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== */}
      {/* KEYPAD FIXE BOTTOM (au-dessus BottomNav) */}
      {/* ===================== */}
      <div
        ref={keypadWrapRef}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: `calc(${BOTTOM_NAV_H}px + env(safe-area-inset-bottom, 0px))`,
          zIndex: 20,
          padding: 10,
          paddingBottom: 12,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.00), rgba(0,0,0,0.55) 18%, rgba(0,0,0,0.82))",
          backdropFilter: "blur(6px)",
          pointerEvents: endData ? "none" : "auto",
        }}
      >
        <div style={{ width: "100%", maxWidth: 520, margin: "0 auto" }}>
          <div
            style={{
              transform: "scale(0.92)",
              transformOrigin: "bottom center",
            }}
          >
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
                const mult = multiplier === 2 ? 2 : 1;
                pushDart({ v: 25, mult } as any);
                setMultiplier(1);
              }}
              onValidate={validateTurn}
              hidePreview={true}
            />
          </div>

          {/* ✅ +0 pts SUPPRIMÉ.
              On garde uniquement l’indicateur SHANGHAI (quand pertinent) */}
          {winRule === "shanghai_or_points" &&
          shanghaiNow &&
          currentThrow.length > 0 ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 6,
              }}
            >
              <div
                style={{
                  borderRadius: 999,
                  padding: "6px 10px",
                  border: `1px solid ${theme.primary}66`,
                  background: `${theme.primary}12`,
                  color: theme.primary,
                  fontWeight: 950,
                  fontSize: 12,
                  textShadow: `0 0 10px ${theme.primary}55`,
                }}
              >
                💥 SHANGHAI !
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ============================= */}
      {/*  FIN DE PARTIE — RESUME */}
      {/* ============================= */}
      {endData && (
        <div
          onClick={() => setEndData(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            pointerEvents: "auto",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              borderRadius: 18,
              border: `1px solid ${theme.primary}55`,
              background: theme.card,
              boxShadow: `0 18px 44px rgba(0,0,0,.75)`,
              overflow: "hidden",
              pointerEvents: "auto",
            }}
          >
            <div style={{ padding: 16 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 1000,
                  color: theme.primary,
                  textTransform: "uppercase",
                  textShadow: `0 0 10px ${theme.primary}55`,
                }}
              >
                {t("common.match_end", "Fin de partie")}
              </div>

              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    borderRadius: 999,
                    padding: "8px 12px",
                    border: `1px solid ${theme.borderSoft}`,
                    background: "rgba(0,0,0,0.18)",
                    fontWeight: 950,
                    fontSize: 12.5,
                  }}
                >
                  {t("shanghai.round", "Tour")} {round}/{maxRounds}
                </div>

                <div
                  style={{
                    borderRadius: 999,
                    padding: "8px 12px",
                    border: `1px solid ${theme.primary}66`,
                    background: `${theme.primary}12`,
                    color: theme.primary,
                    fontWeight: 950,
                    fontSize: 12.5,
                    textShadow: `0 0 10px ${theme.primary}33`,
                  }}
                >
                  {endData.reason === "shanghai"
                    ? "💥 Victoire SHANGHAI"
                    : "🏁 Victoire aux points"}
                </div>
              </div>

              <div style={{ marginTop: 10, fontWeight: 950, fontSize: 14 }}>
                🏆 {t("common.winner", "Gagnant")} :{" "}
                <span
                  style={{
                    color: theme.primary,
                    textShadow: `0 0 10px ${theme.primary}33`,
                  }}
                >
                  {endData?.winnerId
                    ? safePlayers.find((p) => p.id === endData.winnerId)?.name ||
                      "—"
                    : "—"}
                </span>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {endData.ranked.map((r, idx) => (
                  <div
                    key={r.id}
                    style={{
                      padding: 10,
                      borderRadius: 16,
                      border: `1px solid ${
                        idx === 0 ? theme.primary + "66" : theme.borderSoft
                      }`,
                      background:
                        idx === 0 ? `${theme.primary}12` : "rgba(0,0,0,0.18)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        textAlign: "center",
                        fontWeight: 1000,
                        color: idx === 0 ? theme.primary : theme.textSoft,
                      }}
                    >
                      {idx + 1}
                    </div>

                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 999,
                        overflow: "hidden",
                        border: `1px solid ${theme.borderSoft}`,
                        background: "rgba(255,255,255,0.06)",
                        display: "grid",
                        placeItems: "center",
                        flex: "0 0 auto",
                      }}
                    >
                      {r.avatarDataUrl ? (
                        <img
                          src={r.avatarDataUrl}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <span style={{ opacity: 0.75, fontWeight: 900 }}>?</span>
                      )}
                    </div>

                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontWeight: 950,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {r.name}
                    </div>

                    <div style={{ fontWeight: 1000, fontSize: 16 }}>
                      {r.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                padding: 14,
                borderTop: `1px solid ${theme.borderSoft}`,
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                background: "rgba(0,0,0,0.18)",
              }}
            >
              <button
                type="button"
                onClick={() => setEndData(null)}
                style={{
                  borderRadius: 999,
                  padding: "10px 14px",
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,0.22)",
                  color: theme.text,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {t("common.close", "Fermer")}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEndData(null);
                  props.onExit?.();
                }}
                style={{
                  borderRadius: 999,
                  padding: "10px 14px",
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,0.22)",
                  color: theme.text,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {t("common.quit", "Quitter")}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (didSaveRef.current) return;
                  didSaveRef.current = true;

                  const match = buildMatchPayload(
                    endData.winnerId,
                    endData.reason,
                    endData.createdAt
                  );

                  setEndData(null);
                  props.onFinish?.(match);
                }}
                style={{
                  borderRadius: 999,
                  padding: "10px 14px",
                  border: "none",
                  background: theme.primary,
                  color: "#000",
                  fontWeight: 1000,
                  cursor: "pointer",
                  boxShadow: `0 12px 26px ${theme.primary}22`,
                }}
              >
                {t("common.save_exit", "Sauvegarder & quitter")}
              </button>
            </div>
          </div>
        </div>
      )}

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
            zIndex: 9998,
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

            <div
              style={{ fontSize: 13, lineHeight: 1.45, color: theme.textSoft }}
            >
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
                {/* ✅ bonus: affiche l’ordre si random */}
                {targetOrderMode === "random" ? (
                  <li>
                    {t("shanghai.rules.order", "Ordre des cibles (aléatoire)")} :{" "}
                    {(targetOrderRef.current || []).join(" → ")}
                  </li>
                ) : null}
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
