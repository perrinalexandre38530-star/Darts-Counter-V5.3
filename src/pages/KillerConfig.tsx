// @ts-nocheck
// =============================================================
// src/pages/KillerConfig.tsx
// KILLER — CONFIG (V3 look & feel, FR, robust profils)
// - Style proche X01ConfigV3 (cards, pills, carrousels)
// - 100% labels FR
// - Affiche profils locaux depuis store.profiles
// - Ajout bots : PRO + bots user depuis localStorage dc_bots_v1 (fallback)
// - Corrige warning: pas de <button> imbriqués
// - Sort un KillerConfig consommé par KillerPlay (routeParams.config)
// - FIX: onStart peut être absent -> fallback go("killer_play", { config })
// =============================================================

import React from "react";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";

// 🔽 AVATARS BOTS PRO (mêmes chemins que X01ConfigV3)
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

// --------------------------------------------------
// Types exportés (utilisés par KillerPlay.tsx)
// --------------------------------------------------
export type KillerBecomeRule = "single" | "double";
export type KillerDamageRule = "one" | "multiplier";

export type KillerConfigPlayer = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  isBot?: boolean;
  botLevel?: string;
  number: number; // 1..20 (Killer number)
};

export type KillerConfig = {
  id: string;
  mode: "killer";
  createdAt: number;

  lives: number; // vies de départ
  becomeRule: KillerBecomeRule; // simple/double sur son numéro
  damageRule: KillerDamageRule; // -1 ou multiplicateur S/D/T

  // variantes
  friendlyFire: boolean; // le killer peut se toucher (ou variantes)
  ownNumberHurtsWhenKiller: boolean; // toucher son numéro quand killer coûte des vies
  exactLivesRequired: boolean; // élimination seulement si on tombe EXACT à 0

  players: KillerConfigPlayer[];
};

type Props = {
  store: Store;

  // ✅ parfois tu as go, parfois non
  go?: (tab: any, params?: any) => void;
  onBack?: () => void;

  // ✅ selon les pages, le parent peut exposer différents noms
  onStart?: (cfg: KillerConfig) => void;
  onStartGame?: (cfg: KillerConfig) => void;
  onPlay?: (cfg: KillerConfig) => void;
};

type BotLite = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  botLevel?: string;
};

// Clé LS bots
const LS_BOTS_KEY = "dc_bots_v1";

// Bots PRO (comme X01)
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

function clampInt(n: any, min: number, max: number, fb: number) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return fb;
  return Math.max(min, Math.min(max, x));
}

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
  if (v.includes("fort") || v.includes("hard") || v.includes("difficile")) return { level: 3 };
  if (v.includes("standard") || v.includes("normal") || v.includes("moyen")) return { level: 2 };
  if (v.includes("easy") || v.includes("facile") || v.includes("débutant")) return { level: 1 };
  return { level: 1 };
}

function pickAvatar(p: any): string | null {
  if (!p) return null;
  return p.avatarDataUrl ?? p.avatar ?? p.avatarUrl ?? p.photoDataUrl ?? null;
}

// ------------------ UI bits ------------------

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
        fontWeight: active && !isDisabled ? 700 : 600,
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

/* Médaillon BOT – doré PRO, bleu bots user */
function BotMedallion({ bot, level, active }: { bot: BotLite; level: number; active: boolean }) {
  const isPro = bot.id.startsWith("bot_pro_");
  const COLOR = isPro ? "#f7c85c" : "#00b4ff";
  const COLOR_GLOW = isPro ? "rgba(247,200,92,0.9)" : "rgba(0,172,255,0.65)";

  const SCALE = 0.62;
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
          // @ts-ignore (support dataUrl chez toi)
          dataUrl={bot.avatarDataUrl ?? undefined}
          label={bot.name?.[0]?.toUpperCase() || "B"}
          showStars={false}
        />
      </div>
    </div>
  );
}

function uniqueKillerNumbers(selected: Record<string, number>) {
  const used = new Set<number>();
  const out: Record<string, number> = { ...selected };
  for (const pid of Object.keys(out)) {
    let n = clampInt(out[pid], 1, 20, 20);
    // décale jusqu’à numéro libre
    for (let k = 0; k < 40; k++) {
      if (!used.has(n)) break;
      n = n - 1;
      if (n < 1) n = 20;
    }
    used.add(n);
    out[pid] = n;
  }
  return out;
}

export default function KillerConfigPage(props: Props) {
  const { store, go, onBack } = props;

  // ✅ FIX: onStart peut être absent / mauvais nom -> on résout un callback fiable
  const startCb =
    (typeof (props as any).onStart === "function" && (props as any).onStart) ||
    (typeof (props as any).onStartGame === "function" && (props as any).onStartGame) ||
    (typeof (props as any).onPlay === "function" && (props as any).onPlay) ||
    null;

  const { theme } = useTheme();
  const { t } = useLang();

  const primary = theme?.primary ?? "#f7c85c";
  const primarySoft = theme?.primarySoft ?? "rgba(247,200,92,0.16)";
  const textMain = theme?.text ?? "#f5f5ff";
  const cardBg = "rgba(10, 12, 24, 0.96)";

  // ✅ Profils robustes
  const profiles: Profile[] = ((store as any)?.profiles || []) as Profile[];
  const humanProfiles = (profiles || []).filter((p: any) => !p?.isBot);
  const storeBots = (profiles || []).filter((p: any) => !!p?.isBot);

  // ✅ bots LS fallback
  const [botsFromLS, setBotsFromLS] = React.useState<BotLite[]>([]);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_BOTS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as any[];
      const mapped: BotLite[] = (parsed || []).map((b) => ({
        id: b.id,
        name: b.name || "BOT",
        avatarDataUrl: b.avatarDataUrl ?? null,
        botLevel: b.botLevel ?? b.levelLabel ?? b.levelName ?? b.performanceLevel ?? b.difficulty ?? "",
      }));
      setBotsFromLS(mapped);
    } catch {}
  }, []);

  const userBots: BotLite[] = React.useMemo(() => {
    // priorité store (si tu as migré les bots dedans)
    if (storeBots.length > 0) {
      return storeBots.map((p: any) => ({
        id: p.id,
        name: p.name || "BOT",
        avatarDataUrl: pickAvatar(p),
        botLevel: p.botLevel ?? p.levelLabel ?? p.levelName ?? p.performanceLevel ?? p.difficulty ?? "",
      }));
    }
    return botsFromLS;
  }, [storeBots, botsFromLS]);

  const botProfiles: BotLite[] = React.useMemo(() => [...PRO_BOTS, ...userBots], [userBots]);

  // ------------------ state config ------------------
  const [lives, setLives] = React.useState<number>(3);
  const [becomeRule, setBecomeRule] = React.useState<KillerBecomeRule>("single");
  const [damageRule, setDamageRule] = React.useState<KillerDamageRule>("one");

  const [friendlyFire, setFriendlyFire] = React.useState<boolean>(false);
  const [ownNumberHurtsWhenKiller, setOwnNumberHurtsWhenKiller] = React.useState<boolean>(false);
  const [exactLivesRequired, setExactLivesRequired] = React.useState<boolean>(false);

  // sélection joueurs (par défaut: 2 premiers humains si dispo)
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => {
    if (humanProfiles.length >= 2) return [humanProfiles[0].id, humanProfiles[1].id];
    if (humanProfiles.length === 1) return [humanProfiles[0].id];
    return [];
  });

  // numéro killer par joueur
  const [killerNumberById, setKillerNumberById] = React.useState<Record<string, number>>({});

  // init numbers quand on sélectionne
  React.useEffect(() => {
    setKillerNumberById((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) {
        if (!next[id]) next[id] = 20; // défaut
      }
      // supprime ceux non sélectionnés
      for (const id of Object.keys(next)) {
        if (!selectedIds.includes(id)) delete next[id];
      }
      return uniqueKillerNumbers(next);
    });
  }, [selectedIds]);

  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      return next;
    });
  }

  function randomizeNumbers() {
    setKillerNumberById((prev) => {
      const ids = Object.keys(prev);
      const pool = Array.from({ length: 20 }, (_, i) => i + 1);
      // shuffle simple
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const next: Record<string, number> = {};
      ids.forEach((id, idx) => (next[id] = pool[idx % pool.length]));
      return uniqueKillerNumbers(next);
    });
  }

  const canStart = selectedIds.length >= 2;

  function resolvePlayer(id: string) {
    const human = profiles.find((p) => p.id === id);
    if (human) {
      return {
        id: human.id,
        name: human.name,
        avatarDataUrl: pickAvatar(human),
        isBot: !!(human as any).isBot,
        botLevel: (human as any).botLevel ?? undefined,
      };
    }
    const bot = botProfiles.find((b) => b.id === id);
    if (bot) {
      return {
        id: bot.id,
        name: bot.name,
        avatarDataUrl: bot.avatarDataUrl ?? null,
        isBot: true,
        botLevel: bot.botLevel ?? undefined,
      };
    }
    return null;
  }

  function handleStart() {
    if (!canStart) {
      alert("Ajoute au moins 2 joueurs (profils locaux ou bots).");
      return;
    }

    const players: KillerConfigPlayer[] = selectedIds
      .map((id) => {
        const base = resolvePlayer(id);
        if (!base) return null;
        return {
          id: base.id,
          name: base.name,
          avatarDataUrl: base.avatarDataUrl ?? null,
          isBot: !!base.isBot,
          botLevel: base.botLevel,
          number: clampInt(killerNumberById[id], 1, 20, 20),
        };
      })
      .filter(Boolean) as any[];

    // sécurité: numéros uniques
    const used = new Set<number>();
    for (const p of players) {
      let n = clampInt(p.number, 1, 20, 20);
      while (used.has(n)) {
        n = n - 1;
        if (n < 1) n = 20;
      }
      used.add(n);
      p.number = n;
    }

    const cfg: KillerConfig = {
      id: `killer-${Date.now()}`,
      mode: "killer",
      createdAt: Date.now(),
      lives: clampInt(lives, 1, 9, 3),
      becomeRule,
      damageRule,
      friendlyFire,
      ownNumberHurtsWhenKiller,
      exactLivesRequired,
      players,
    };

    // ✅ FIX: onStart absent -> fallback go(...)
    if (startCb) {
      startCb(cfg);
      return;
    }

    if (typeof go === "function") {
      go("killer_play", { config: cfg });
      return;
    }

    console.error("[KillerConfig] Aucun callback de start fourni (onStart/onStartGame/onPlay/go).", {
      onStart: typeof (props as any).onStart,
      onStartGame: typeof (props as any).onStartGame,
      onPlay: typeof (props as any).onPlay,
      go: typeof go,
    });

    alert("Impossible de lancer : callback manquant (voir console).");
  }

  // ------------------ render ------------------
  return (
    <div
      className="screen killer-config-v3"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        padding: "12px 12px 76px",
        background: "radial-gradient(circle at top, #15192c 0, #05060c 50%, #020308 100%)",
        color: textMain,
      }}
    >
      {/* HEADER */}
      <header style={{ marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <button
            type="button"
            onClick={() => (onBack ? onBack() : (typeof go === "function" ? go("games") : null))}
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
            <span>Retour</span>
          </button>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: 2,
              color: primary,
              textTransform: "uppercase",
            }}
          >
            KILLER
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, color: "#d9d9e4", marginTop: 2 }}>
            Choisis les joueurs, assigne les numéros, puis lance le chaos.
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: 4, paddingBottom: 12 }}>
        {/* JOUEURS LOCAUX */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: "18px 12px 14px",
            marginBottom: 14,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 1,
                fontWeight: 800,
                color: primary,
              }}
            >
              Joueurs
            </div>

            <button
              type="button"
              onClick={randomizeNumbers}
              style={{
                borderRadius: 999,
                border: `1px solid ${primary}55`,
                padding: "5px 10px",
                background: "rgba(255,255,255,0.04)",
                color: primary,
                fontWeight: 800,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.7,
              }}
            >
              Numéros aléatoires
            </button>
          </div>

          {humanProfiles.length === 0 ? (
            <p style={{ fontSize: 13, color: "#b3b8d0", marginTop: 10, marginBottom: 0 }}>
              Aucun profil local. Crée des joueurs (et des bots) dans <b>Profils</b>.
            </p>
          ) : (
            <>
              <div
                className="dc-scroll-thin"
                style={{
                  display: "flex",
                  gap: 18,
                  overflowX: "auto",
                  paddingBottom: 10,
                  marginTop: 12,
                  paddingLeft: 14,
                  paddingRight: 8,
                }}
              >
                {humanProfiles.map((p) => {
                  const active = selectedIds.includes(p.id);
                  const num = killerNumberById[p.id] ?? 20;

                  return (
                    <div
                      key={p.id}
                      role="button"
                      onClick={() => togglePlayer(p.id)}
                      style={{
                        minWidth: 122,
                        maxWidth: 122,
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 7,
                        flexShrink: 0,
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      <div
                        style={{
                          width: 78,
                          height: 78,
                          borderRadius: "50%",
                          overflow: "hidden",
                          boxShadow: active ? `0 0 28px ${primary}aa` : "0 0 14px rgba(0,0,0,0.65)",
                          background: active
                            ? `radial-gradient(circle at 30% 20%, #fff8d0, ${primary})`
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
                            transition: "filter .2s ease, opacity .2s ease",
                          }}
                        >
                          <ProfileAvatar profile={p} size={78} />
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
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

                      {/* numéro killer */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          width: "100%",
                          justifyContent: "center",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setKillerNumberById((prev) =>
                              uniqueKillerNumbers({ ...prev, [p.id]: num - 1 < 1 ? 20 : num - 1 })
                            )
                          }
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,.12)",
                            background: "rgba(0,0,0,.25)",
                            color: "#fff",
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                          title="Diminuer"
                        >
                          −
                        </button>

                        <div
                          style={{
                            width: 44,
                            height: 34,
                            borderRadius: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 900,
                            color: "#111",
                            background: `linear-gradient(135deg, ${primary}, #ffe9a3)`,
                            boxShadow: `0 0 14px ${primary}55`,
                          }}
                          title="Numéro KILLER"
                        >
                          {num}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setKillerNumberById((prev) =>
                              uniqueKillerNumbers({ ...prev, [p.id]: num + 1 > 20 ? 1 : num + 1 })
                            )
                          }
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,.12)",
                            background: "rgba(0,0,0,.25)",
                            color: "#fff",
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                          title="Augmenter"
                        >
                          +
                        </button>
                      </div>

                      <div style={{ fontSize: 10, opacity: 0.65 }}>Numéro KILLER</div>
                    </div>
                  );
                })}
              </div>

              <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 0 }}>
                Il faut au moins <b>2 joueurs</b> pour démarrer.
              </p>
            </>
          )}
        </section>

        {/* OPTIONS */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: 12,
            marginBottom: 14,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 800,
              color: primary,
              marginBottom: 10,
            }}
          >
            Options
          </div>

          {/* vies */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>Vies de départ</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <PillButton
                  key={n}
                  label={String(n)}
                  active={lives === n}
                  onClick={() => setLives(n)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>
              Vies identiques pour tous les joueurs.
            </div>
          </div>

          {/* become rule */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>Règle pour devenir KILLER</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label="Toucher son numéro (simple)"
                active={becomeRule === "single"}
                onClick={() => setBecomeRule("single")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label="Double sur son numéro"
                active={becomeRule === "double"}
                onClick={() => setBecomeRule("double")}
                primary={primary}
                primarySoft={primarySoft}
              />
            </div>
          </div>

          {/* damage rule */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>Dégâts quand on est KILLER</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label="-1 par hit"
                active={damageRule === "one"}
                onClick={() => setDamageRule("one")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label="Multiplicateur (S/D/T)"
                active={damageRule === "multiplier"}
                onClick={() => setDamageRule("multiplier")}
                primary={primary}
                primarySoft={primarySoft}
              />
            </div>
            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>
              Quand tu touches le numéro d’un adversaire vivant.
            </div>
          </div>

          {/* variantes */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: "#9fa4c0", textTransform: "uppercase", letterSpacing: 0.9 }}>
              Variantes
            </div>

            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
              <VariantRow
                title="Friendly Fire"
                desc="Si ON, certaines variantes permettent de se toucher (auto-pénalités)."
                value={friendlyFire}
                onChange={setFriendlyFire}
                primary={primary}
                primarySoft={primarySoft}
              />
              <VariantRow
                title="Son numéro blesse quand KILLER"
                desc="Si ON, toucher son propre numéro quand on est KILLER fait perdre des vies."
                value={ownNumberHurtsWhenKiller}
                onChange={setOwnNumberHurtsWhenKiller}
                primary={primary}
                primarySoft={primarySoft}
              />
              <VariantRow
                title="Exact lives required"
                desc="Si ON, élimination seulement si on tombe EXACTEMENT à 0."
                value={exactLivesRequired}
                onChange={setExactLivesRequired}
                primary={primary}
                primarySoft={primarySoft}
              />
            </div>
          </div>
        </section>

        {/* BOTS */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: 12,
            marginBottom: 80,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 800,
              color: primary,
              marginBottom: 10,
            }}
          >
            Bots IA
          </div>

          <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 10 }}>
            Ajoute des bots “PRO” prédéfinis ou tes bots créés dans Profils.
          </p>

          <div
            className="dc-scroll-thin"
            style={{
              display: "flex",
              gap: 14,
              overflowX: "auto",
              overflowY: "visible",
              paddingBottom: 10,
              paddingTop: 14,
              marginTop: 6,
              marginBottom: 10,
            }}
          >
            {botProfiles.map((bot) => {
              const { level } = resolveBotLevel(bot.botLevel);
              const active = selectedIds.includes(bot.id);

              return (
                <div
                  key={bot.id}
                  role="button"
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
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <BotMedallion bot={bot} level={level} active={active} />

                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textAlign: "center",
                      color: active ? "#f6f2e9" : "#7e8299",
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginTop: 4,
                    }}
                    title={bot.name}
                  >
                    {bot.name}
                  </div>

                  <div style={{ marginTop: 2, display: "flex", justifyContent: "center" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 9,
                        fontWeight: 900,
                        letterSpacing: 0.7,
                        textTransform: "uppercase",
                        background: bot.id.startsWith("bot_pro_")
                          ? "radial-gradient(circle at 30% 0, #ffeaa8, #f7c85c)"
                          : "radial-gradient(circle at 30% 0, #6af3ff, #008cff)",
                        color: "#020611",
                        boxShadow: bot.id.startsWith("bot_pro_")
                          ? "0 0 12px rgba(247,200,92,0.5)"
                          : "0 0 12px rgba(0,172,255,0.55)",
                        border: "1px solid rgba(255,255,255,0.25)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {bot.id.startsWith("bot_pro_") ? "PRO" : "BOT"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => (typeof go === "function" ? go("profiles_bots") : null)}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: `1px solid ${primary}`,
              background: "rgba(255,255,255,0.04)",
              color: primary,
              fontWeight: 800,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.7,
            }}
          >
            Gérer mes bots
          </button>
        </section>
      </div>

      {/* CTA */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 88, padding: "6px 12px 8px", pointerEvents: "none" }}>
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
              fontWeight: 900,
              fontSize: 14,
              letterSpacing: 1,
              textTransform: "uppercase",
              background: canStart ? `linear-gradient(90deg, ${primary}, #ffe9a3)` : "rgba(120,120,120,0.5)",
              color: canStart ? "#151515" : "#2b2bb2",
              boxShadow: canStart ? "0 0 18px rgba(255, 207, 120, 0.65)" : "none",
              opacity: canStart ? 1 : 0.6,
              cursor: canStart ? "pointer" : "default",
            }}
            title={canStart ? "Démarrer la partie" : "Ajoute au moins 2 joueurs"}
          >
            Lancer la partie
          </button>

          {!canStart && (
            <div style={{ marginTop: 6, textAlign: "center", fontSize: 11, color: "#ff6b6b", fontWeight: 800 }}>
              Ajoute au moins 2 joueurs pour démarrer
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VariantRow({
  title,
  desc,
  value,
  onChange,
  primary,
  primarySoft,
}: {
  title: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  primary: string;
  primarySoft: string;
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.20)",
        padding: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, textTransform: "uppercase", color: "#d6d8ea" }}>
          {title}
        </div>
        <div style={{ marginTop: 4, fontSize: 10.5, color: "#7c80a0", lineHeight: 1.25 }}>{desc}</div>
      </div>

      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <PillButton
          label="ON"
          active={value === true}
          onClick={() => onChange(true)}
          primary={primary}
          primarySoft={primarySoft}
          compact
        />
        <PillButton
          label="OFF"
          active={value === false}
          onClick={() => onChange(false)}
          primary={primary}
          primarySoft={primarySoft}
          compact
        />
      </div>
    </div>
  );
}
