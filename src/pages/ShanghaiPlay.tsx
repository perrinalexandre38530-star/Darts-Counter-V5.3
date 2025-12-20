// ============================================
// src/pages/ShanghaiPlay.tsx
// SHANGHAI — PLAY (Header refacto selon maquette + Keypad X01)
// ✅ Top: titre SHANGHAI (theme glow) + bouton "i" (règles) — PLUS de sous-titre
// ✅ Supprime bouton "Terminer"
// ✅ Header (carte) réorganisé:
//    - KPI "Tour 2/20" -> bloc KPI NEON lumineux (à gauche)
//    - Avatar joueur actif (à gauche, sous le KPI)
//    - Centre: "cible" façon visuel dartboard + chiffre cible au centre
//    - Sous la cible: 3 cases flèches (— / D1 / etc.) façon Cricket
// ✅ Supprime "Shanghai = win" du header (mis dans le bouton i)
// ✅ Supprime "Flèches 0/3" (inutile, déjà visible via 3 cases)
// ✅ Supprime texte inutile au-dessus du keypad (tout dans le bouton i)
// ✅ Supprime les boutons supplémentaires sous le keypad (VALIDER -> / Réinitialiser)
// ✅ Keypad = src/components/Keypad.tsx (or) + hidePreview
// ✅ Logique Shanghai:
//    - Seuls les hits sur la cible du tour comptent
//    - Shanghai = S + D + T sur la cible dans la même volée (3 flèches)
//    - winRule: shanghai_or_points (Shanghai instant) ou points_only
//
// ASSET: /public/assets/SHANGHAI.png (optionnel) utilisé en fond discret
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import Keypad from "../components/Keypad";
import InfoDot from "../components/InfoDot";
import type { Dart as UIDart } from "../lib/types";

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

function fmtDart(d?: UIDart) {
  if (!d) return "—";
  if (d.v === 0) return "MISS";
  if (d.v === 25) return d.mult === 2 ? "DBULL" : "BULL";
  return `${d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S"}${d.v}`;
}

function scoreOfDart(d: UIDart) {
  if (!d) return 0;
  if (d.v === 0) return 0;
  if (d.v === 25) return d.mult === 2 ? 50 : 25;
  return d.v * d.mult;
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
  const [scores, setScores] = React.useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const p of safePlayers) m[p.id] = 0;
    return m;
  });

  // --- Keypad X01 state ---
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [infoOpen, setInfoOpen] = React.useState(false);

  const target = round; // 1..maxRounds (souvent 20)
  const active = safePlayers[turn] || safePlayers[0];

  // Fond discret (optionnel)
  const SHANGHAI_BG_URL = "/assets/SHANGHAI.png";

  const cardShell: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: theme.card,
    boxShadow: `0 10px 24px rgba(0,0,0,0.55)`,
    overflow: "hidden",
  };

  // KPI neon (Tour)
  const kpiNeon: React.CSSProperties = {
    borderRadius: 16,
    border: `1px solid ${theme.primary}66`,
    background:
      `linear-gradient(180deg, ${theme.primary}1a, rgba(0,0,0,.35))`,
    boxShadow: `0 0 22px ${theme.primary}2a, 0 0 48px ${theme.primary}1a`,
    padding: "10px 12px",
    display: "grid",
    gap: 2,
    minWidth: 86,
    justifyItems: "center",
  };

  const kpiLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.6,
    color: theme.textSoft,
    opacity: 0.95,
    textTransform: "uppercase",
  };

  const kpiValue: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 1000,
    color: theme.primary,
    textShadow: `0 0 14px ${theme.primary}99`,
    letterSpacing: 0.4,
  };

  // “Cible dartboard” au centre (style maquette)
  const targetBoard: React.CSSProperties = {
    width: "100%",
    maxWidth: 260,
    aspectRatio: "1 / 1",
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background:
      "radial-gradient(circle at 50% 50%, rgba(255,220,130,.55) 0 2px, transparent 3px 100%)," +
      "radial-gradient(circle at 50% 50%, rgba(255,206,74,.20) 0 26px, rgba(0,0,0,.25) 27px 100%)," +
      "radial-gradient(circle at 50% 50%, rgba(255,206,74,.10) 0 44px, rgba(0,0,0,.38) 45px 100%)," +
      "radial-gradient(circle at 50% 50%, rgba(255,206,74,.08) 0 70px, rgba(0,0,0,.50) 71px 100%)",
    boxShadow: `0 0 26px ${theme.primary}22, 0 22px 40px rgba(0,0,0,.55)`,
    position: "relative",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
  };

  const targetNumberPill: React.CSSProperties = {
    width: 78,
    height: 78,
    borderRadius: 999,
    border: `1px solid ${theme.primary}88`,
    background: "rgba(0,0,0,.62)",
    display: "grid",
    placeItems: "center",
    boxShadow: `0 0 26px ${theme.primary}30`,
  };

  const targetNumberTxt: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 1100 as any,
    color: theme.primary,
    textShadow: `0 0 18px ${theme.primary}aa`,
    letterSpacing: 0.5,
  };

  // 3 cases flèches façon “cricket-like”
  const dartCell = (accent: string): React.CSSProperties => ({
    height: 36,
    borderRadius: 14,
    border: `1px solid ${accent}66`,
    background: `${accent}14`,
    color: theme.text,
    display: "grid",
    placeItems: "center",
    fontWeight: 950,
    fontSize: 12.5,
    letterSpacing: 0.3,
    boxShadow: `0 0 14px ${accent}22`,
  });

  // Points du tour: seuls hits SUR la cible comptent
  const pointsThisThrow = React.useMemo(() => {
    return (currentThrow || []).reduce((acc, d) => {
      if (!d) return acc;
      if (d.v === 0) return acc;
      if (d.v === 25) return acc + (target === 25 ? scoreOfDart(d) : 0);
      return acc + (d.v === target ? scoreOfDart(d) : 0);
    }, 0);
  }, [currentThrow, target]);

  const isShanghaiThisThrow = React.useMemo(() => {
    if ((currentThrow || []).length !== 3) return false;
    const ds = currentThrow.filter(Boolean) as UIDart[];
    if (ds.length !== 3) return false;

    const onTarget = (d: UIDart) => {
      if (!d) return false;
      if (d.v === 0) return false;
      if (d.v === 25) return target === 25;
      return d.v === target;
    };

    if (!ds.every(onTarget)) return false;

    const hasS = ds.some((d) => d.mult === 1);
    const hasD = ds.some((d) => d.mult === 2);
    const hasT = ds.some((d) => d.mult === 3);
    return hasS && hasD && hasT;
  }, [currentThrow, target]);

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

  function applyValidate() {
    if ((currentThrow || []).length !== 3) return;

    const pid = active.id;
    const add = pointsThisThrow;

    setScores((prev) => {
      const next = { ...prev };
      next[pid] = (next[pid] ?? 0) + add;
      return next;
    });

    const shanghaiNow = isShanghaiThisThrow;

    // reset throw + mult
    setCurrentThrow([]);
    setMultiplier(1);

    // win instant si autorisé
    if (winRule === "shanghai_or_points" && shanghaiNow) {
      finishMatch(pid, "shanghai");
      return;
    }

    // next player / next round
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

    // fin de partie: meilleur score
    const ranked = safePlayers
      .map((p) => ({ id: p.id, v: scores[p.id] ?? 0 }))
      .sort((a, b) => b.v - a.v);

    finishMatch(ranked[0]?.id ?? null, "points");
  }

  // --- Keypad handlers ---
  const onNumber = (n: number) => {
    setCurrentThrow((prev) => {
      if ((prev || []).length >= 3) return prev;
      const d: UIDart = { v: n, mult: n === 0 ? 1 : multiplier };
      return [...prev, d];
    });
    setMultiplier(1);
  };

  const onBull = () => {
    setCurrentThrow((prev) => {
      if ((prev || []).length >= 3) return prev;
      const d: UIDart = { v: 25, mult: multiplier === 2 ? 2 : 1 };
      return [...prev, d];
    });
    setMultiplier(1);
  };

  const undoLocal = () => setCurrentThrow((prev) => prev.slice(0, -1));

  const onCancel = () => {
    // Annuler = retire la dernière entrée (conforme usage Keypad)
    undoLocal();
    setMultiplier(1);
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

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        paddingBottom: 96,
        background: theme.bg,
        color: theme.text,
      }}
    >
      {/* TOP BAR : retour + titre + InfoDot */}
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

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 1100 as any,
              letterSpacing: 1.2,
              color: theme.primary,
              textShadow: `0 0 18px ${theme.primary}AA, 0 0 40px ${theme.primary}33`,
              lineHeight: 1.05,
              textTransform: "uppercase",
            }}
          >
            SHANGHAI
          </div>
          {/* ✅ SUPPRIMÉ : plus de sous-titre ici */}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
          <InfoDot
            onClick={(ev) => {
              ev.stopPropagation();
              setInfoOpen(true);
            }}
            glow={theme.primary + "88"}
          />
          {/* ✅ SUPPRIMÉ : bouton Terminer */}
        </div>
      </div>

      {/* HEADER CARD (selon maquette) */}
      <div
        style={{
          ...cardShell,
          marginBottom: 12,
          background:
            `linear-gradient(180deg, rgba(0,0,0,.25), rgba(0,0,0,.78)), url(${SHANGHAI_BG_URL}) center/cover no-repeat`,
        }}
      >
        <div style={{ padding: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: 12, alignItems: "start" }}>
            {/* Colonne gauche : KPI Tour + Avatar actif */}
            <div style={{ display: "grid", gap: 10, justifyItems: "center" }}>
              <div style={kpiNeon}>
                <div style={kpiLabel}>{t("shanghai.round", "Tour")}</div>
                <div style={kpiValue}>
                  {round}/{maxRounds}
                </div>
              </div>

              <div
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 999,
                  overflow: "hidden",
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(255,255,255,0.06)",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: `0 0 18px rgba(0,0,0,.40)`,
                }}
                title={active.name}
              >
                {active.avatarDataUrl ? (
                  <img
                    src={active.avatarDataUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ opacity: 0.75, fontWeight: 900 }}>?</span>
                )}
              </div>
            </div>

            {/* Colonne droite : Cible + 3 flèches */}
            <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
              {/* Cible visuelle */}
              <div style={targetBoard} aria-label={`Cible ${target}`}>
                <div style={targetNumberPill}>
                  <div style={targetNumberTxt}>{target}</div>
                </div>

                {/* liseré lumineux interne */}
                <div
                  style={{
                    position: "absolute",
                    inset: 10,
                    borderRadius: 16,
                    border: `1px solid ${theme.primary}22`,
                    boxShadow: `inset 0 0 30px ${theme.primary}10`,
                    pointerEvents: "none",
                  }}
                />
              </div>

              {/* 3 flèches (cases) */}
              <div style={{ width: "100%", maxWidth: 260, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <div style={dartCell(theme.primary)}>{fmtDart(currentThrow[0])}</div>
                <div style={dartCell("#34d399")}>{fmtDart(currentThrow[1])}</div>
                <div style={dartCell("#fb7185")}>{fmtDart(currentThrow[2])}</div>
              </div>

              {/* ✅ SUPPRIMÉ : points / texte actif / flèches / shanghai=win */}
              {/* (si tu veux un mini +points discret, dis-moi et je le mets sans polluer) */}
            </div>
          </div>
        </div>
      </div>

      {/* Scores (sans intitulé "Scores") */}
      <div style={{ ...cardShell, padding: 12, marginBottom: 12 }}>
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
                  border: `1px solid ${isActive ? theme.primary + "88" : theme.borderSoft}`,
                  background: isActive ? `${theme.primary}14` : "rgba(0,0,0,0.18)",
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
                  <div style={{ fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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

      {/* KEYpad (aucun texte au-dessus) */}
      <div style={{ ...cardShell, padding: 12 }}>
        <Keypad
          currentThrow={currentThrow}
          multiplier={multiplier}
          onSimple={() => setMultiplier(1)}
          onDouble={() => setMultiplier(2)}
          onTriple={() => setMultiplier(3)}
          onBackspace={undoLocal}
          onCancel={onCancel}
          onNumber={onNumber}
          onBull={onBull}
          onValidate={applyValidate}
          hidePreview
        />
        {/* ✅ SUPPRIMÉ : boutons additionnels sous keypad */}
      </div>

      {/* Overlay règles (InfoDot) — contient aussi "Shanghai = win" & toutes infos */}
      {infoOpen && (
        <div
          onClick={() => setInfoOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 520,
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
                fontWeight: 1000,
                marginBottom: 10,
                color: theme.primary,
                textTransform: "uppercase",
                textShadow: `0 0 10px ${theme.primary}66`,
                letterSpacing: 0.6,
              }}
            >
              {t("shanghai.rules.title", "Règles — Shanghai")}
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.48, color: theme.textSoft }}>
              <div style={{ marginBottom: 10 }}>
                • <b>{t("shanghai.rules.targetTitle", "Cible du tour")}</b> :{" "}
                {t("shanghai.rules.targetBody", "la cible vaut le numéro du tour (1 → 20).")}
              </div>

              <div style={{ marginBottom: 10 }}>
                • <b>{t("shanghai.rules.scoreTitle", "Score")}</b> :{" "}
                {t(
                  "shanghai.rules.scoreBody",
                  "seuls les coups sur la cible comptent (S=×1, D=×2, T=×3). Les autres numéros = 0 point (mais consomment une flèche)."
                )}
              </div>

              <div style={{ marginBottom: 10 }}>
                • <b>{t("shanghai.rules.shanghaiTitle", "Shanghai")}</b> :{" "}
                {t(
                  "shanghai.rules.shanghaiBody",
                  "réussir SIMPLE + DOUBLE + TRIPLE sur la cible dans la même volée (3 flèches)."
                )}
              </div>

              <div style={{ marginBottom: 10 }}>
                • <b>{t("shanghai.rules.winTitle", "Victoire")}</b> :{" "}
                {winRule === "shanghai_or_points"
                  ? t(
                      "shanghai.rules.winBody1",
                      "si tu fais un Shanghai, victoire instantanée. Sinon, meilleur total de points à la fin."
                    )
                  : t(
                      "shanghai.rules.winBody2",
                      "pas de victoire instantanée : on joue tous les tours, puis le meilleur total de points gagne."
                    )}
              </div>

              <div>
                • <b>{t("shanghai.rules.inputTitle", "Saisie")}</b> :{" "}
                {t(
                  "shanghai.rules.inputBody",
                  "appuie sur DOUBLE/TRIPLE si besoin, puis sur le numéro touché (0 = MISS). Valide après 3 flèches."
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setInfoOpen(false)}
              style={{
                display: "block",
                marginLeft: "auto",
                marginTop: 14,
                padding: "6px 14px",
                borderRadius: 999,
                border: "none",
                background: theme.primary,
                color: "#000",
                fontWeight: 900,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: `0 10px 22px ${theme.primary}33`,
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
