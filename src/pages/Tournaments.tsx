// @ts-nocheck
// ============================================
// src/pages/Tournaments.tsx
// TOURNOIS — LISTE / CREATE (Local)
// ✅ Liste des tournois locaux
// ✅ Création rapide (RR -> SE) en 1 clic
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import type { Tournament } from "../lib/tournaments/types";
import { createTournamentDraft, buildInitialMatches } from "../lib/tournaments/engine";
import { listTournamentsLocal, upsertTournamentLocal, upsertMatchesForTournamentLocal } from "../lib/tournaments/storeLocal";

export default function Tournaments({ store, go }: any) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [list, setList] = React.useState<Tournament[]>(() => (listTournamentsLocal?.() as any) || []);
  const [name, setName] = React.useState("Tournoi");
  const [mode, setMode] = React.useState<"x01" | "cricket" | "killer">("x01");
  const [groups, setGroups] = React.useState(2);
  const [qualifiers, setQualifiers] = React.useState(2);

  React.useEffect(() => {
    try {
      setList((listTournamentsLocal?.() as any) || []);
    } catch {
      setList([]);
    }
  }, []);

  function refresh() {
    try {
      setList((listTournamentsLocal?.() as any) || []);
    } catch {
      setList([]);
    }
  }

  function createQuick() {
    const players = (store?.profiles || [])
      .filter((p: any) => p?.id)
      .map((p: any) => ({
        id: String(p.id),
        name: p.name || "Joueur",
        avatarDataUrl: p.avatarDataUrl ?? null,
        source: "local",
      }));

    if (players.length < 2) {
      alert("Ajoute au moins 2 profils locaux pour créer un tournoi.");
      return;
    }

    const tour = createTournamentDraft({
      name: name?.trim() || "Tournoi",
      source: "local",
      ownerProfileId: store?.activeProfileId ?? null,
      players,
      game: {
        mode,
        rules:
          mode === "x01"
            ? { start: 501, doubleOut: true } // tu rendras ça configurable ensuite
            : {},
      },
      stages: [
        {
          id: "rr",
          type: "round_robin",
          name: "Poules",
          groups: Math.max(1, Number(groups) || 1),
          qualifiersPerGroup: Math.max(1, Number(qualifiers) || 1),
          seeding: "random",
        },
        {
          id: "se",
          type: "single_elim",
          name: "Phase finale",
          seeding: "random",
        },
      ],
    });

    const matches = buildInitialMatches(tour);

    upsertTournamentLocal(tour as any);
    upsertMatchesForTournamentLocal(tour.id, matches as any);

    refresh();
    go("tournament_view", { id: tour.id });
  }

  return (
    <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 90, background: theme.bg, color: theme.text }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => go("games")}
          style={{ borderRadius: 12, padding: "8px 10px", border: `1px solid ${theme.borderSoft}`, background: theme.card, color: theme.text }}
        >
          ←
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 950, color: theme.primary, textShadow: `0 0 12px ${theme.primary}66` }}>
            TOURNOIS (LOCAL)
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 4 }}>
            Crée et joue plusieurs matchs en parallèle
          </div>
        </div>
        <div style={{ width: 44 }} />
      </div>

      {/* CREATE */}
      <div
        style={{
          marginTop: 14,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          background: theme.card,
          padding: 14,
          boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ fontWeight: 950, color: theme.primary, textShadow: `0 0 10px ${theme.primary}44`, marginBottom: 10 }}>
          ➕ Créer un tournoi
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du tournoi"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 14,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,.18)",
              color: theme.text,
              outline: "none",
              fontSize: 13.5,
            }}
          />

          <div style={{ display: "flex", gap: 10 }}>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 14,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,.18)",
                color: theme.text,
              }}
            >
              <option value="x01">X01</option>
              <option value="cricket">Cricket</option>
              <option value="killer">Killer</option>
            </select>

            <select
              value={groups}
              onChange={(e) => setGroups(Number(e.target.value))}
              style={{
                width: 130,
                padding: "10px 12px",
                borderRadius: 14,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,.18)",
                color: theme.text,
              }}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} poule{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>

            <select
              value={qualifiers}
              onChange={(e) => setQualifiers(Number(e.target.value))}
              style={{
                width: 140,
                padding: "10px 12px",
                borderRadius: 14,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,.18)",
                color: theme.text,
              }}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} qualif/poule
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={createQuick}
            style={{
              borderRadius: 999,
              padding: "11px 12px",
              border: "none",
              fontWeight: 950,
              background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
              color: "#1b1508",
              cursor: "pointer",
            }}
          >
            Créer & ouvrir
          </button>

          <div style={{ fontSize: 12.5, opacity: 0.78, lineHeight: 1.35 }}>
            (Pour l’instant : création rapide. Ensuite on ajoute tous les réglages par mode, têtes de série, tie-breakers, etc.)
          </div>
        </div>
      </div>

      {/* LIST */}
      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {list.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Aucun tournoi pour le moment.</div>
        ) : (
          list.map((tour: any) => (
            <button
              key={tour.id}
              onClick={() => go("tournament_view", { id: tour.id })}
              style={{
                width: "100%",
                textAlign: "left",
                borderRadius: 16,
                border: `1px solid ${theme.borderSoft}`,
                background: theme.card,
                padding: 14,
                cursor: "pointer",
                boxShadow: "0 10px 24px rgba(0,0,0,0.40)",
              }}
            >
              <div style={{ fontWeight: 950, color: theme.primary, textShadow: `0 0 10px ${theme.primary}44` }}>
                {tour.name}
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.82, marginTop: 4 }}>
                {String(tour.game?.mode || "").toUpperCase()} • {String(tour.status || "").toUpperCase()} • {(tour.players || []).length} joueurs
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
