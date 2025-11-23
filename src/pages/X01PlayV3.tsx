// =============================================================
// src/pages/X01PlayV3.tsx
// X01 V3 — même UI que X01 actuel, moteur entièrement neuf
// - Header DuelHeaderCompact
// - Keypad existant
// - Mini classement sous le score
// - Suggestion de checkout (1 ligne) via visit.checkoutSuggestion
// - Mini overlay de fin de manche / set (X01LegOverlayV3)
// =============================================================

import React from "react";

import type { X01ConfigV3, X01PlayerId } from "../types/x01v3";
import { useX01EngineV3 } from "../hooks/useX01EngineV3";

// UI existants
import Keypad from "../components/Keypad";
import { DuelHeaderCompact } from "../components/DuelHeaderCompact";
import X01LegOverlayV3 from "../lib/x01v3/x01LegOverlayV3";

import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import type { X01DartInputV3 } from "../lib/x01v3/x01LogicV3";

type Props = {
  config: X01ConfigV3;
};

export default function X01PlayV3({ config }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const {
    state,
    liveStatsByPlayer,
    activePlayerId,
    scores,
    status,
    throwDart,
    startNextLeg,
  } = useX01EngineV3({ config });

  const activePlayer =
    config.players.find((p) => p.id === activePlayerId) || config.players[0];

  const currentVisit = state.visit;

  // ---------- Helpers UI ----------
  function formatCheckout(): string {
    const suggestion = currentVisit.checkoutSuggestion;
    if (!suggestion) return "";

    return suggestion.darts
      .map((d) => {
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
    return (live.totalScore / live.dartsThrown) * 3;
  }

  // Mini classement sous le score
  const miniRanking = React.useMemo(
    () =>
      config.players
        .map((p) => {
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
        }),
    [config.players, scores, state.legsWon, state.setsWon]
  );

  // Adaptateur Keypad → moteur V3
  function handleKeypadDart(
    segment: number | 25,
    multiplier: 0 | 1 | 2 | 3
  ) {
    const input: X01DartInputV3 = { segment, multiplier };
    throwDart(input);
  }

  // ---------- Rendu ----------
  return (
    <div className={`x01-play-v3-page theme-${theme.id}`}>
      {/* Header identique à ton X01 actuel */}
      <header className="x01-header">
        <DuelHeaderCompact
          // @ts-expect-error: adapter à ta vraie signature si besoin
          players={config.players}
          scores={scores}
          currentSet={state.currentSet}
          currentLeg={state.currentLeg}
          activePlayerId={activePlayerId}
        />
      </header>

      {/* Contenu principal */}
      <main className="x01-main">
        {/* Joueur actif + score + checkout + mini stats */}
        <section className="x01-active-player-block">
          <div className="x01-active-name">{activePlayer?.name}</div>
          <div className="x01-active-score">
            {scores[activePlayer.id] ?? config.startScore}
          </div>

          {/* Suggestion de checkout */}
          <div className="x01-checkout-hint">
            {currentVisit.checkoutSuggestion ? (
              <>
                <span className="x01-checkout-label">
                  {t("x01.checkout", "Check-out")}
                </span>
                <span className="x01-checkout-value">{formatCheckout()}</span>
              </>
            ) : (
              <span className="x01-checkout-none">
                {t("x01.no_checkout", "Pas de check-out direct")}
              </span>
            )}
          </div>

          {/* Mini stats joueur actif */}
          <div className="x01-active-mini-stats">
            {(() => {
              const live = liveStatsByPlayer[activePlayer.id];
              const avg3 = computeAvg3For(activePlayer.id);
              const darts = live?.dartsThrown ?? 0;
              const bestVisit = live?.bestVisit ?? 0;

              return (
                <>
                  <div className="x01-mini-stat">
                    <span className="label">
                      {t("x01.avg3", "Moy. 3")}
                    </span>
                    <span className="value">{avg3.toFixed(1)}</span>
                  </div>
                  <div className="x01-mini-stat">
                    <span className="label">
                      {t("x01.darts", "Fléchettes")}
                    </span>
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
        </section>

        {/* Mini classement sous le score */}
        <section className="x01-mini-ranking">
          {miniRanking.map((row) => (
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

      {/* Keypad fixé en bas (comme ton X01 actuel) */}
      <footer className="x01-keypad-footer">
        <Keypad
          // @ts-expect-error: adapter aux props réelles
          onDart={handleKeypadDart}
        />
      </footer>

      {/* Mini overlay de fin de leg / set */}
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
