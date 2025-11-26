// =============================================================
// src/lib/x01v3/X01LegOverlayV3.tsx
// Overlay fin de manche / set / match pour X01 V3
// - 1v1 : vainqueur vs adversaire + trophée + scoreboard central
// - 3+ joueurs : classement final
// - Boutons correctement câblés : Rejouer / Nouvelle partie / Résumé / Continuer / Quitter
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

  const accent =
    (theme as any)?.accent ||
    (theme as any)?.colors?.accent ||
    "#ffc63a";

  const [isNarrow, setIsNarrow] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handle = () => setIsNarrow(window.innerWidth <= 420);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const getAvatarUrl = (p: any) =>
    p?.avatarDataUrl ?? p?.avatarUrl ?? p?.photoUrl ?? null;

  // ---- Vainqueur / perdant (1v1) ----
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

  // Texte type "Gain Leg" / "Gain Set" / "Victoire"
  const victoryLabel =
    status === "match_end"
      ? t("x01v3.overlay.victory", "Victoire")
      : status === "set_end"
      ? t("x01v3.overlay.set_win", "Gain Set")
      : t("x01v3.overlay.leg_win", "Gain Leg");

  // Multi-joueurs : classement
  const ranking =
    players.length >= 3
      ? [...players]
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            sets: setsWon[p.id] ?? 0,
            legs: legsWon[p.id] ?? 0,
            score: scores[p.id] ?? config.startScore ?? 0,
          }))
          .sort((a, b) => {
            if (b.sets !== a.sets) return b.sets - a.sets;
            if (b.legs !== a.legs) return b.legs - a.legs;
            return a.score - b.score;
          })
      : [];

  // Mini stats vainqueur (pour les KPI en bas)
  const winnerStats = winner ? liveStatsByPlayer?.[winner.id] : null;
  const darts = winnerStats?.dartsThrown ?? 0;
  const totalScore = winnerStats?.totalScore ?? 0;
  const bestVisit = winnerStats?.bestVisit ?? 0;
  const showMiniStats = darts > 0 || totalScore > 0 || bestVisit > 0;
  const avg3 =
    darts > 0 ? ((totalScore / darts) * 3).toFixed(1) : "0.0";

  // ---- Callbacks boutons ----
  const handleNextLeg = () => {
    onNextLeg();
  };

  const handleQuit = () => {
    if (onExitMatch) onExitMatch();
  };

  const handleReplaySame = () => {
    if (onReplaySameConfig) onReplaySameConfig();
  };

  const handleReplayNew = () => {
    if (onReplayNewConfig) onReplayNewConfig();
  };

  const handleSummary = () => {
    if (matchId && onShowSummary) onShowSummary(matchId);
  };

  const handleContinueMulti = () => {
    if (onContinueMulti) onContinueMulti();
  };

  const showContinueMulti =
    players.length >= 3 && typeof onContinueMulti === "function";

  return (
    <div
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
        {/* Halo léger */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 10% 0%,rgba(255,215,120,0.2),transparent 55%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 2 }}>
          {/* Capsule Manche / Set */}
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

          {/* Contenu principal */}
          {isDuel ? (
            <DuelLayout
              winner={winner}
              opponent={opponent}
              victoryLabel={victoryLabel}
              winnerSets={winnerSets}
              winnerLegs={winnerLegs}
              opponentSets={opponentSets}
              opponentLegs={opponentLegs}
              getAvatarUrl={getAvatarUrl}
              accent={accent}
              isNarrow={isNarrow}
            />
          ) : (
            <MultiRankingBlock
              ranking={ranking}
              accent={accent}
              t={t}
            />
          )}

          {/* Mini KPI vainqueur */}
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

          {/* Boutons */}
          {status !== "match_end" ? (
            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button style={btnGold} onClick={handleNextLeg}>
                {t("x01.leg_overlay.next_leg", "MANCHE SUIVANTE")}
              </button>
              <button style={btnDanger} onClick={handleQuit}>
                {t("common.quit", "Quitter")}
              </button>
            </div>
          ) : (
            <div
              style={{
                marginTop: 14,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {/* Rejouer mêmes paramètres */}
              {onReplaySameConfig && (
                <button style={btnGoldFull} onClick={handleReplaySame}>
                  🏆{" "}
                  {t(
                    "x01.leg_overlay.replay_same",
                    "Rejouer (mêmes paramètres)"
                  )}
                </button>
              )}

              {/* Ligne de boutons secondaires */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {onReplayNewConfig && (
                  <button style={btnGhostWide} onClick={handleReplayNew}>
                    {t("x01.leg_overlay.new_match", "Nouvelle partie")}
                  </button>
                )}
                {onShowSummary && (
                  <button style={btnGhostWide} onClick={handleSummary}>
                    {t("x01.leg_overlay.summary", "Résumé")}
                  </button>
                )}
                {showContinueMulti && (
                  <button
                    style={btnGhostWide}
                    onClick={handleContinueMulti}
                  >
                    {t("x01.leg_overlay.continue", "Continuer")}
                  </button>
                )}
                <button
                  style={btnGhostWideDanger}
                  onClick={handleQuit}
                >
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

// =============================================================
// DUEL 1v1 : layout avec scoreboard central
// =============================================================

function DuelLayout(props: {
  winner: any;
  opponent: any;
  victoryLabel: string;
  winnerSets: number;
  winnerLegs: number;
  opponentSets: number;
  opponentLegs: number;
  getAvatarUrl: (p: any) => string | null;
  accent: string;
  isNarrow: boolean;
}) {
  const {
    winner,
    opponent,
    victoryLabel,
    winnerSets,
    winnerLegs,
    opponentSets,
    opponentLegs,
    getAvatarUrl,
    accent,
    isNarrow,
  } = props;

  const winnerAvatar = winner ? getAvatarUrl(winner) : null;
  const opponentAvatar = opponent ? getAvatarUrl(opponent) : null;

  // Layout colonne sur mobile, mais on garde la logique
  if (isNarrow) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginTop: 4,
        }}
      >
        {/* bloc gagnant */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: accent,
                fontWeight: 900,
                fontSize: 18,
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              {winner?.name ?? "—"}
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                marginTop: 2,
              }}
            >
              <TrophyInline />
              <span
                style={{
                  color: accent,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {victoryLabel}
              </span>
            </div>
          </div>
          <AvatarMedallion src={winnerAvatar} />
        </div>

        {/* scoreboard central */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <ScoreCard
            accent={accent}
            winnerSets={winnerSets}
            winnerLegs={winnerLegs}
            opponentSets={opponentSets}
            opponentLegs={opponentLegs}
          />
        </div>

        {/* bloc perdant */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
            <div
              style={{
                color: accent,
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
                marginTop: 2,
                color: "#ff8a8a",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Défaite
            </div>
          </div>
          <AvatarMedallion src={opponentAvatar} />
        </div>
      </div>
    );
  }

  // Layout horizontal (téléphone large / tablette)
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1.1fr) auto minmax(0,1.1fr)",
        gap: 12,
        alignItems: "center",
        marginTop: 4,
      }}
    >
      {/* gagnant */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: accent,
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
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginTop: 3,
            }}
          >
            <TrophyInline />
            <span
              style={{
                color: accent,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {victoryLabel}
            </span>
          </div>
        </div>
        <AvatarMedallion src={winnerAvatar} />
      </div>

      {/* Scoreboard central */}
      <ScoreCard
        accent={accent}
        winnerSets={winnerSets}
        winnerLegs={winnerLegs}
        opponentSets={opponentSets}
        opponentLegs={opponentLegs}
      />

      {/* perdant */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          justifyContent: "flex-end",
          minWidth: 0,
        }}
      >
        <AvatarMedallion src={opponentAvatar} />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: "right",
          }}
        >
          <div
            style={{
              color: accent,
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
              marginTop: 2,
              color: "#ff8a8a",
              fontSize: 13,
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

// Trophée petit à côté du libellé
function TrophyInline() {
  return (
    <span
      style={{
        width: 18,
        height: 18,
        borderRadius: "50%",
        overflow: "hidden",
        background:
          "radial-gradient(circle,#ffeb9a 0%,#ffc63a 60%,#c48b18 100%)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 8px rgba(255,210,90,0.6)",
        flexShrink: 0,
      }}
    >
      <img
        src={trophyCup}
        style={{
          width: "80%",
          height: "80%",
          objectFit: "contain",
        }}
      />
    </span>
  );
}

// =============================================================
// Carte SCORE centrale :
// [valeur] [Set] [valeur]
// [valeur] [Leg] [valeur]
// =============================================================

function ScoreCard(props: {
  accent: string;
  winnerSets: number;
  winnerLegs: number;
  opponentSets: number;
  opponentLegs: number;
}) {
  const { accent, winnerSets, winnerLegs, opponentSets, opponentLegs } =
    props;

  const cellLabel: React.CSSProperties = {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#d0d2dd",
    paddingInline: 4,
  };

  const cellValue: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 900,
    color: accent,
    minWidth: 32,
    textAlign: "center",
  };

  return (
    <div
      style={{
        minWidth: 150,
        padding: "8px 10px",
        borderRadius: 16,
        background:
          "linear-gradient(145deg,rgba(0,0,0,0.85),rgba(0,0,0,0.35))",
        border: `1px solid ${accent}`,
        boxShadow: "0 0 14px rgba(0,0,0,0.65)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "#aaa",
          textTransform: "uppercase",
          letterSpacing: 0.7,
          marginBottom: 4,
        }}
      >
        SCORE
      </div>

      {/* Ligne Sets */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 6,
          marginBottom: 2,
        }}
      >
        <span style={cellValue}>{winnerSets}</span>
        <span style={cellLabel}>Set</span>
        <span style={cellValue}>{opponentSets}</span>
      </div>

      {/* Ligne Legs */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <span style={cellValue}>{winnerLegs}</span>
        <span style={cellLabel}>Leg</span>
        <span style={cellValue}>{opponentLegs}</span>
      </div>
    </div>
  );
}

// =============================================================
// Classement multi (3+ joueurs)
// =============================================================

function MultiRankingBlock(props: {
  ranking: {
    id: string;
    name: string;
    sets: number;
    legs: number;
    score: number;
  }[];
  accent: string;
  t: (k: string, fallback: string) => string;
}) {
  const { ranking, accent, t } = props;

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

// =============================================================
// Avatars & mini-KPI
// =============================================================

function AvatarMedallion({ src }: { src: string | null }) {
  return (
    <div
      style={{
        width: 52,
        height: 52,
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

// =============================================================
// Styles boutons
// =============================================================

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
