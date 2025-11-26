// =============================================================
// src/components/x01v3/X01LegOverlayV3.tsx
// Overlay fin de manche / set / match pour X01 V3
// - Style néon + trophée 🏆
// - 2 joueurs : layout duel (trophée + vainqueur vs adversaire)
// - 3+ joueurs : classement final (1er / 2e / 3e...)
// - Mini-stats vainqueur (Moy.3D / Darts / Best visit)
// - Boutons fin de match :
//      CONTINUER (3+) / REJOUER / NOUVELLE PARTIE / RÉSUMÉ / QUITTER
// - Callbacks fournis par X01PlayV3
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import trophyCup from "../../ui_assets/trophy-cup.png";

type Props = {
  open: boolean;
  status: "playing" | "leg_end" | "set_end" | "match_end";
  config: any;
  state: any;
  liveStatsByPlayer: any;

  onNextLeg: () => void;
  onExitMatch?: () => void;

  onReplaySameConfig?: () => void;
  onReplayNewConfig?: () => void;
  onShowSummary?: (matchId: string) => void;
  onContinueMulti?: () => void;
};

export default function X01LegOverlayV3({
  open,
  status,
  config,
  state,
  liveStatsByPlayer,
  onNextLeg,
  onExitMatch,
  onReplaySameConfig,
  onReplayNewConfig,
  onShowSummary,
  onContinueMulti,
}: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  if (!open || status === "playing") return null;

  const players = config?.players ?? [];
  const scores = state?.scores ?? {};
  const legsWon = state?.legsWon ?? {};
  const setsWon = state?.setsWon ?? {};

  const currentSet = state?.currentSet ?? 1;
  const currentLeg = state?.currentLeg ?? 1;
  const legsPerSet = config?.legsPerSet ?? "?";
  const setsToWin = config?.setsToWin ?? "?";
  const matchId = state?.matchId;

  const isDuel = players.length === 2;

  // Couleur accent du thème (fallback or)
  const accent =
    (theme as any)?.accent ||
    (theme as any)?.colors?.accent ||
    "#ffc63a";

  // ------------------------------------------------------------
  // Utilitaires joueurs / avatars
  // ------------------------------------------------------------
  const getAvatarUrl = (p: any) =>
    p?.avatarDataUrl ?? p?.avatarUrl ?? p?.photoUrl ?? null;

  // ------------------------------------------------------------
  // Détermination vainqueur / classement
  // ------------------------------------------------------------
  const winnerId =
    state?.lastLegWinnerId ||
    state?.lastWinnerId ||
    state?.lastWinningPlayerId ||
    null;

  const winner =
    players.find((p: any) => p.id === winnerId) || players[0] || null;

  const opponent =
    isDuel && winner
      ? players.find((p: any) => p.id !== winner.id)
      : null;

  const winnerSets = winner ? setsWon[winner.id] ?? 0 : 0;
  const winnerLegs = winner ? legsWon[winner.id] ?? 0 : 0;
  const opponentSets = opponent ? setsWon[opponent.id] ?? 0 : 0;
  const opponentLegs = opponent ? legsWon[opponent.id] ?? 0 : 0;

  const subtitle =
    status === "match_end"
      ? t("x01.leg_overlay.match_won", "Match gagné")
      : status === "set_end"
      ? t("x01.leg_overlay.set_won", "Set gagné")
      : t("x01.leg_overlay.leg_won", "Manche gagnée");

  // CONTINUER (3+ joueurs)
  const finishedCount = players.filter((p: any) => scores[p.id] === 0).length;
  const showContinueMulti =
    players.length >= 3 &&
    finishedCount >= 1 &&
    finishedCount < players.length &&
    typeof onContinueMulti === "function";

  // ------------------------------------------------------------
  // Mini stats vainqueur
  // ------------------------------------------------------------
  const stats = winner ? liveStatsByPlayer?.[winner.id] : null;

  const darts = stats?.dartsThrown ?? 0;
  const totalScore = stats?.totalScore ?? 0;
  const bestVisit = stats?.bestVisit ?? 0;

  const showMiniStats = darts > 0 || totalScore > 0 || bestVisit > 0;

  const avg3 =
    darts > 0 ? ((totalScore / darts) * 3).toFixed(1) : "0.0";

  // ------------------------------------------------------------
  // Classement multi (3+)
  // ------------------------------------------------------------
  const ranking =
    players.length >= 3
      ? [...players]
          .map((p: any) => {
            const id = p.id;
            return {
              id,
              name: p.name,
              sets: setsWon[id] ?? 0,
              legs: legsWon[id] ?? 0,
              score: scores[id] ?? config.startScore ?? 0,
            };
          })
          .sort((a, b) => {
            if (b.sets !== a.sets) return b.sets - a.sets;
            if (b.legs !== a.legs) return b.legs - a.legs;
            return a.score - b.score; // le plus petit score = le mieux
          })
      : [];

  // ------------------------------------------------------------
  // Callbacks
  // ------------------------------------------------------------
  const nextLeg = () => onNextLeg();

  const quitMatch = () => {
    if (onExitMatch) onExitMatch();
  };

  const replaySame = () => {
    if (onReplaySameConfig) onReplaySameConfig();
  };

  const replayNew = () => {
    if (onReplayNewConfig) onReplayNewConfig();
  };

  const showSummary = () => {
    if (matchId && onShowSummary) onShowSummary(matchId);
  };

  const continueMulti = () => {
    if (onContinueMulti) onContinueMulti();
  };

  // ------------------------------------------------------------
  // Rendu
  // ------------------------------------------------------------

  return (
    <div
      className="x01legoverlay-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
        padding: 12,
      }}
    >
      <div
        style={{
          width: "min(92vw,520px)",
          borderRadius: 22,
          padding: 18,
          background:
            "radial-gradient(circle at top,#141824 0%,#05060b 58%,#020308 100%)",
          position: "relative",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 0 32px rgba(0,0,0,0.9)",
          overflow: "hidden",
        }}
      >
        {/* Halo */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 10% 0%,rgba(255,215,120,0.25),transparent 55%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 2 }}>
          {/* Manche / Set (pill néon thème) */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "4px 10px",
              borderRadius: 999,
              border: `1px solid ${accent}`,
              background:
                "linear-gradient(135deg,rgba(0,0,0,0.85),rgba(0,0,0,0.45))",
              color: accent,
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            {t("x01.leg_overlay.leg", "Manche")} {currentLeg}/{legsPerSet} ·{" "}
            {t("x01.leg_overlay.set", "Set")} {currentSet}/{setsToWin}
          </div>

          {/* DUEL (2 joueurs) OU CLASSEMENT MULTI */}
          {isDuel ? (
            <DuelHeaderRow
              winner={winner}
              opponent={opponent}
              subtitle={subtitle}
              winnerSets={winnerSets}
              winnerLegs={winnerLegs}
              opponentSets={opponentSets}
              opponentLegs={opponentLegs}
              getAvatarUrl={getAvatarUrl}
              accent={accent}
            />
          ) : (
            <MultiRankingBlock
              ranking={ranking}
              getAvatarUrl={getAvatarUrl}
              accent={accent}
              t={t}
            />
          )}

          {/* Mini stats vainqueur (même pour multi, on garde le top 1) */}
          {showMiniStats && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
              }}
            >
              <Mini label="Moy.3D" value={avg3} />
              <Mini label="Darts" value={String(darts)} />
              <Mini label="Best" value={String(bestVisit)} />
            </div>
          )}

          {/* BOUTONS */}
          {status !== "match_end" ? (
            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button
                style={btnGold}
                onClick={nextLeg}
              >
                {t("x01.leg_overlay.next_leg", "MANCHE SUIVANTE")}
              </button>

              <button style={btnDanger} onClick={quitMatch}>
                {t("common.quit", "Quitter")}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 14 }}>
              {/* REJOUER */}
              {onReplaySameConfig && (
                <button style={btnGoldFull} onClick={replaySame}>
                  🏆{" "}
                  {t(
                    "x01.leg_overlay.replay_same",
                    "Rejouer (mêmes paramètres)"
                  )}
                </button>
              )}

              {/* Actions secondaires */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {onReplayNewConfig && (
                  <button style={btnGhostWide} onClick={replayNew}>
                    {t("x01.leg_overlay.new_match", "Nouvelle partie")}
                  </button>
                )}

                {onShowSummary && (
                  <button style={btnGhostWide} onClick={showSummary}>
                    {t("x01.leg_overlay.summary", "Résumé")}
                  </button>
                )}

                {showContinueMulti && (
                  <button style={btnGhostWide} onClick={continueMulti}>
                    {t("x01.leg_overlay.continue", "Continuer")}
                  </button>
                )}

                <button style={btnGhostWideDanger} onClick={quitMatch}>
                  {t("common.quit", "Quitter")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Layout duel (2 joueurs)
// ------------------------------------------------------------
function DuelHeaderRow(props: {
  winner: any;
  opponent: any;
  subtitle: string;
  winnerSets: number;
  winnerLegs: number;
  opponentSets: number;
  opponentLegs: number;
  getAvatarUrl: (p: any) => string | null;
  accent: string;
}) {
  const {
    winner,
    opponent,
    subtitle,
    winnerSets,
    winnerLegs,
    opponentSets,
    opponentLegs,
    getAvatarUrl,
    accent,
  } = props;

  const winnerAvatar = winner ? getAvatarUrl(winner) : null;
  const opponentAvatar = opponent ? getAvatarUrl(opponent) : null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "center",
      }}
    >
      {/* Gagnant : trophée + nom + statut + avatar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
          flex: 1,
        }}
      >
        {/* Trophée déplacé ici */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            overflow: "hidden",
            background:
              "radial-gradient(circle,#ffde72 0%,#ffb23a 55%,#c07a13 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 18px rgba(255,190,60,0.7)",
            flexShrink: 0,
          }}
        >
          <img
            src={trophyCup}
            style={{
              width: "85%",
              height: "85%",
              objectFit: "contain",
            }}
          />
        </div>

        {/* Nom + statut */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <div
            style={{
              color: "#fff",
              fontWeight: 900,
              fontSize: 20,
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {winner?.name ?? "—"}
          </div>
          <div
            style={{
              color: accent,
              fontSize: 13,
              marginTop: 2,
              fontWeight: 700,
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* Avatar vainqueur */}
        <AvatarMedallion src={winnerAvatar} />
      </div>

      {/* Bloc score central */}
      <div
        style={{
          minWidth: 120,
          padding: "6px 10px",
          borderRadius: 16,
          background:
            "linear-gradient(145deg,rgba(0,0,0,0.85),rgba(0,0,0,0.35))",
          border: "1px solid rgba(255,255,255,0.16)",
          textAlign: "center",
          color: "#fff",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "#aaa",
            textTransform: "uppercase",
            letterSpacing: 0.7,
            marginBottom: 2,
          }}
        >
          Score
        </div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          Sets {winnerSets}
          {typeof opponentSets === "number" ? ` - ${opponentSets}` : ""}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          Legs {winnerLegs}
          {typeof opponentLegs === "number" ? ` - ${opponentLegs}` : ""}
        </div>
      </div>

      {/* Perdant : avatar + nom + "Défaite" */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
          flex: 1,
          justifyContent: "flex-end",
        }}
      >
        {/* Avatar adversaire */}
        <AvatarMedallion src={opponentAvatar} />

        {/* Nom + défaite */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            minWidth: 0,
          }}
        >
          <div
            style={{
              color: "#ffffff",
              fontWeight: 800,
              fontSize: 16,
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {opponent?.name ?? "—"}
          </div>
          <div
            style={{
              color: "#ff8a8a",
              fontSize: 13,
              marginTop: 2,
              fontWeight: 700,
            }}
          >
            Défaite
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Classement multi (3+ joueurs)
// ------------------------------------------------------------
function MultiRankingBlock(props: {
  ranking: {
    id: string;
    name: string;
    sets: number;
    legs: number;
    score: number;
  }[];
  getAvatarUrl: (p: any) => string | null;
  accent: string;
  t: (k: string, fallback: string) => string;
}) {
  const { ranking, getAvatarUrl, accent, t } = props;

  return (
    <div style={{ marginTop: 4 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: "#fff",
          marginBottom: 6,
        }}
      >
        {t("x01.leg_overlay.final_standings", "Classement final")}
      </div>

      <div
        style={{
          borderRadius: 16,
          padding: 8,
          background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {ranking.map((r, idx) => {
          const pos = idx + 1;
          const isWinner = pos === 1;
          const medalColor = isWinner
            ? accent
            : pos === 2
            ? "#d0d5ff"
            : pos === 3
            ? "#ffb37a"
            : "#888";

          return (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 6px",
                borderRadius: 10,
                background:
                  idx % 2 === 0
                    ? "rgba(255,255,255,0.04)"
                    : "transparent",
              }}
            >
              {/* Rang + nom */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    minWidth: 26,
                    height: 26,
                    borderRadius: 999,
                    border: `1px solid ${medalColor}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 800,
                    color: medalColor,
                  }}
                >
                  {pos}
                </div>
                <div
                  style={{
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.name}
                </div>
              </div>

              {/* Stats sets/legs/score */}
              <div
                style={{
                  fontSize: 11.5,
                  color: "#d6d7e0",
                  textAlign: "right",
                }}
              >
                <div>
                  Sets <b>{r.sets}</b> · Legs <b>{r.legs}</b>
                </div>
                <div>
                  Score{" "}
                  <b style={{ color: r.score === 0 ? "#7fe2a9" : "#ffd98a" }}>
                    {r.score === 0 ? "FINI" : r.score}
                  </b>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Avatar medaillon
// ------------------------------------------------------------
function AvatarMedallion({ src }: { src: string | null }) {
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        overflow: "hidden",
        background: "rgba(255,255,255,0.06)",
        boxShadow: "0 4px 14px rgba(0,0,0,0.6)",
        flexShrink: 0,
      }}
    >
      {src ? (
        <img
          src={src}
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
  );
}

// ------------------------------------------------------------
// MINI KPI
// ------------------------------------------------------------
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        flex: 1,
        borderRadius: 14,
        textAlign: "center",
        padding: "6px 8px",
        background: "rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.7 }}>{label}</div>
      <div style={{ fontWeight: 800, color: "#ffc63a", fontSize: 17 }}>
        {value}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// STYLES BOUTONS
// ------------------------------------------------------------

const btnGold: React.CSSProperties = {
  flex: 1,
  padding: "11px 16px",
  borderRadius: 999,
  fontWeight: 800,
  background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
  color: "#000",
  border: "none",
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  padding: "11px 16px",
  borderRadius: 999,
  fontWeight: 700,
  background: "linear-gradient(180deg,#ff5a5a,#d92626)",
  border: "1px solid rgba(255,120,120,0.9)",
  color: "#fff",
  cursor: "pointer",
};

const btnGoldFull: React.CSSProperties = {
  width: "100%",
  marginBottom: 10,
  padding: "11px 16px",
  borderRadius: 999,
  fontWeight: 800,
  background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
  color: "#000",
  border: "none",
  cursor: "pointer",
};

const btnGhostWide: React.CSSProperties = {
  flex: 1,
  minWidth: 120,
  padding: "10px 12px",
  borderRadius: 999,
  fontWeight: 700,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#fff",
  cursor: "pointer",
};

const btnGhostWideDanger: React.CSSProperties = {
  ...btnGhostWide,
  background: "rgba(255,80,80,0.12)",
  border: "1px solid rgba(255,120,120,0.7)",
  color: "#ffb3b3",
};
