// ============================================
// src/pages/TournamentsHome.tsx
// TOURNOIS — HOME (Local)
// ✅ Liste + Créer + Ouvrir + Supprimer
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import {
  listTournamentsLocal,
  deleteTournamentLocal,
  listMatchesForTournamentLocal,
} from "../lib/tournaments/storeLocal";
import { getTournamentProgress } from "../lib/tournaments/engine";

type Props = {
  store: any;
  go: (tab: any, params?: any) => void;
  update: (mut: (s: any) => any) => void;
  source: "local" | "online";
};

export default function TournamentsHome({ store, go, update, source }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  // (évite warnings TS/ESLint si non utilisés pour l’instant)
  void store;
  void update;

  const [tick, setTick] = React.useState(0);

  const tournaments = React.useMemo(() => {
    if (source !== "local") return [];
    return listTournamentsLocal();
  }, [source, tick]);

  function refresh() {
    setTick((x) => x + 1);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        paddingBottom: 90,
        background: theme.bg,
        color: theme.text,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => go(source === "online" ? "friends" : "games")}
          style={{
            borderRadius: 12,
            padding: "8px 10px",
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            color: theme.text,
          }}
        >
          ←
        </button>

        <div style={{ flex: 1, textAlign: "center" }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 950,
              color: theme.primary,
              textShadow: `0 0 12px ${theme.primary}66`,
            }}
          >
            {source === "online"
              ? t("tournaments.online.title", "TOURNOIS (ONLINE)")
              : t("tournaments.local.title", "TOURNOIS (LOCAL)")}
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 4 }}>
            {source === "online"
              ? t(
                  "tournaments.online.subtitle",
                  "Bientôt : tournois synchronisés, multi-appareils."
                )
              : t(
                  "tournaments.local.subtitle",
                  "Poules • Qualifs • Élimination • Têtes de série • Matchs en parallèle"
                )}
          </div>
        </div>

        <button
          onClick={refresh}
          style={{
            borderRadius: 12,
            padding: "8px 10px",
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            color: theme.text,
          }}
          title="Rafraîchir"
        >
          ↻
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button
          onClick={() => go("tournament_create")}
          style={{
            flex: 1,
            borderRadius: 999,
            padding: "10px 12px",
            border: "none",
            fontWeight: 950,
            background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
            color: "#1b1508",
            cursor: "pointer",
          }}
        >
          + {t("tournaments.create", "Créer un tournoi")}
        </button>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        {source !== "local" ? (
          <div
            style={{
              borderRadius: 18,
              border: `1px solid ${theme.borderSoft}`,
              background: theme.card,
              padding: 14,
              opacity: 0.9,
            }}
          >
            Online n’est pas branché encore. (On ajoutera la carte “Tournois
            Online” plus tard dans le menu Online.)
          </div>
        ) : tournaments.length === 0 ? (
          <div
            style={{
              borderRadius: 18,
              border: `1px solid ${theme.borderSoft}`,
              background: theme.card,
              padding: 14,
              opacity: 0.9,
            }}
          >
            Aucun tournoi pour le moment.
          </div>
        ) : (
          tournaments.map((tour) => {
            const matches = listMatchesForTournamentLocal(tour.id);
            const prog = getTournamentProgress(tour as any, matches as any);

            return (
              <div
                key={tour.id}
                style={{
                  borderRadius: 18,
                  border: `1px solid ${theme.borderSoft}`,
                  background: theme.card,
                  padding: 14,
                  boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
                  display: "grid",
                  gap: 10,
                }}
              >
                <div
                  style={{ display: "flex", gap: 10, alignItems: "center" }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 950,
                        color: theme.primary,
                        textShadow: `0 0 10px ${theme.primary}44`,
                      }}
                    >
                      {tour.name}
                    </div>
                    <div style={{ fontSize: 12.5, opacity: 0.8 }}>
                      {String(tour.game?.mode || "").toUpperCase()} •{" "}
                      {tour.status.toUpperCase()} • {prog.done}/{prog.total}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm("Supprimer ce tournoi ?")) {
                        deleteTournamentLocal(tour.id);
                        refresh();
                      }
                    }}
                    style={{
                      borderRadius: 12,
                      padding: "8px 10px",
                      border: `1px solid ${theme.borderSoft}`,
                      background: "rgba(255,255,255,.04)",
                      color: theme.text,
                      cursor: "pointer",
                    }}
                    title="Supprimer"
                  >
                    🗑
                  </button>
                </div>

                <button
                  onClick={() => go("tournament_view", { id: tour.id })}
                  style={{
                    borderRadius: 999,
                    padding: "10px 12px",
                    border: "none",
                    fontWeight: 950,
                    background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
                    color: "#1b1508",
                    cursor: "pointer",
                  }}
                >
                  Ouvrir
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
