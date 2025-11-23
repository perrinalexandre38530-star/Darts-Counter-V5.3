// =============================================================
// src/pages/X01OnlinePlayV3.tsx
// X01 V3 ONLINE — même UI que X01PlayV3, moteur enveloppé online
// - Utilise useX01OnlineV3 (moteur + réseau)
// - L'UI reste identique (score, classement, checkout, overlay)
// =============================================================

import React from "react";

import type { X01ConfigV3, X01PlayerId } from "../types/x01v3";
import { useX01OnlineV3 } from "../hooks/useX01OnlineV3";

import Keypad from "../components/Keypad";
import { DuelHeaderCompact } from "../components/DuelHeaderCompact";
import X01LegOverlayV3 from "../components/x01v3/X01LegOverlayV3";

import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import type { X01DartInputV3 } from "../lib/x01v3/x01LogicV3";

type Props = {
  config: X01ConfigV3;
  // Meta online (lobby/match/host) viendront plus tard depuis FriendsPage
  lobbyId: string;
  matchId: string;
  role: "host" | "guest";
  // Callbacks réseau à brancher plus tard
  onSendCommand?: any;
  onSendSnapshot?: any;
};

export default function X01OnlinePlayV3({
  config,
  lobbyId,
  matchId,
  role,
  onSendCommand,
  onSendSnapshot,
}: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const online = useX01OnlineV3({
    role,
    meta: {
      lobbyId,
      matchId,
      createdAt: Date.now(),
      hostId: "", // à compléter plus tard si besoin
    },
    config,
    onSendCommand,
    onSendSnapshot,
  });

  const {
    engine,
  } = online;

  const {
    state,
    liveStatsByPlayer,
    activePlayerId,
    scores,
    status,
    startNextLeg,
  } = engine;

  const activePlayer = config.players.find(p => p.id === activePlayerId);
  const currentVisit = state.visit;

  // ===== Helpers UI (identiques à X01PlayV3) =====

  function formatCheckout() {
    const suggestion = currentVisit.checkoutSuggestion;
    if (!suggestion) return "";

    return suggestion.darts
      .map(d => {
        const seg = d.segment === 25 ? "BULL" : String(d.segment);
        if (d.multiplier === 1) return seg;
        if (d.multiplier === 2) return `D${seg}`;
        if (d.multiplier === 3) return `T${seg}`;
        return seg;
      })
      .join(" • ");
  }

  function computeAvg3For(playerId: X01PlayerId): number {
    const live = liveStatsByPlayer[playerId];
    if (!live || live.dartsThrown === 0) return 0;
    const perDart = live.totalScore / live.dartsThrown;
    return perDart * 3;
  }

  const miniRanking = React.useMemo(() => {
    return config.players
      .map(p => {
        const avg3 = computeAvg3For(p.id);
        return {
          id: p.id,
          name: p.name,
          score: scores[p.id] ?? config.startScore,
          legsWon: state.legsWon[p.id] ?? 0,
          setsWon: state.setsWon[p.id] ?? 0,
          avg3,
        };
      })
      .sort((a, b) => {
        if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
        if (b.legsWon !== a.legsWon) return b.legsWon - a.legsWon;
        return a.score - b.score;
      });
  }, [config.players, scores, state.legsWon, state.setsWon]);

  // Keypad → moteur online (local throw + envoi réseau)
  function handleKeypadDart(input: X01DartInputV3) {
    online.sendLocalThrow(input);
  }

  return (
    <div className={`x01-play-v3-page theme-${theme.id}`}>
      {/* Header (même style que X01PlayV3) */}
      <header className="x01-header">
        <DuelHeaderCompact
          // @ts-expect-error: adapter aux props réels
          players={config.players}
          scores={scores}
          currentSet={state.currentSet}
          currentLeg={state.currentLeg}
          activePlayerId={activePlayerId}
        />
      </header>

      <main className="x01-main">
        {/* Joueur actif + score + checkout + mini stats */}
        <section className="x01-active-player-block">
          {activePlayer && (
            <>
              <div className="x01-active-name">{activePlayer.name}</div>
              <div className="x01-active-score">
                {scores[activePlayer.id] ?? config.startScore}
              </div>

              <div className="x01-checkout-hint">
                {currentVisit.checkoutSuggestion ? (
                  <>
                    <span className="x01-checkout-label">
                      {t("x01.checkout", "Check-out")}
                    </span>
                    <span className="x01-checkout-value">
                      {formatCheckout()}
                    </span>
                  </>
                ) : (
                  <span className="x01-checkout-none">
                    {t("x01.no_checkout", "Pas de check-out direct")}
                  </span>
                )}
              </div>

              <div className="x01-active-mini-stats">
                {(() => {
                  const live = liveStatsByPlayer[activePlayer.id];
                  const avg3 = computeAvg3For(activePlayer.id);
                  const darts = live?.dartsThrown ?? 0;
                  const bestVisit = live?.bestVisit ?? 0;
                  return (
                    <>
                      <div className="x01-mini-stat">
                        <span className="label">{t("x01.avg3", "Moy. 3")}</span>
                        <span className="value">{avg3.toFixed(1)}</span>
                      </div>
                      <div className="x01-mini-stat">
                        <span className="label">{t("x01.darts", "Fléchettes")}</span>
                        <span className="value">{darts}</span>
                      </div>
                      <div className="x01-mini-stat">
                        <span className="label">
                          {t("x01.best_visit", "Meilleure volée")}
                        </span>
                        <span className="value">{bestVisit}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </>
          )}
        </section>

        {/* Mini classement sous le score */}
        <section className="x01-mini-ranking">
          {miniRanking.map(row => (
            <div
              key={row.id}
              className={`x01-mini-ranking-row ${
                row.id === activePlayerId ? "is-active" : ""
              }`}
            >
              <div className="x01-mini-ranking-left">
                <span className="x01-mini-ranking-name">{row.name}</span>
              </div>
              <div className="x01-mini-ranking-right">
                <div className="pill">
                  <span className="label">Sets</span>
                  <span className="value">{row.setsWon}</span>
                </div>
                <div className="pill">
                  <span className="label">Legs</span>
                  <span className="value">{row.legsWon}</span>
                </div>
                <div className="pill">
                  <span className="label">Score</span>
                  <span className="value">{row.score}</span>
                </div>
                <div className="pill">
                  <span className="label">Moy. 3</span>
                  <span className="value">{row.avg3.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>

      {/* Keypad en bas */}
      <footer className="x01-keypad-footer">
        <Keypad
          // @ts-expect-error: à adapter à ton Keypad réel
          onDart={(segment: number | 25, multiplier: 0 | 1 | 2 | 3) =>
            handleKeypadDart({ segment, multiplier })
          }
        />
      </footer>

      {/* Mini overlay fin de manche / set */}
      <X01LegOverlayV3
        open={status === "leg_end" || status === "set_end"}
        config={config}
        state={state}
        liveStatsByPlayer={liveStatsByPlayer}
        onNextLeg={startNextLeg}
      />
    </div>
  );
}
