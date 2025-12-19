// ============================================
// src/pages/TournamentCreate.tsx
// TOURNOIS — CREATE (Local)
// ✅ Fix: évite blocage silencieux si localStorage plein (QuotaExceededError)
// ✅ UX: état "Création…" + anti double-clic
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import type {
  TournamentPlayer,
  TournamentStage,
  TournamentMode,
} from "../lib/tournaments/types";
import {
  createTournamentDraft,
  buildInitialMatches,
} from "../lib/tournaments/engine";
import {
  upsertTournamentLocal,
  upsertMatchesForTournamentLocal,
} from "../lib/tournaments/storeLocal";

type Props = {
  store: any;
  go: (tab: any, params?: any) => void;
};

function isQuotaError(err: any) {
  const name = String(err?.name || "");
  const msg = String(err?.message || "");
  return (
    name === "QuotaExceededError" ||
    msg.includes("QuotaExceededError") ||
    msg.includes("exceeded the quota") ||
    msg.includes("setItem") ||
    msg.includes("Storage")
  );
}

export default function TournamentCreate({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const profiles = (store?.profiles || []).filter((p: any) => !!p?.id);

  const [name, setName] = React.useState("Tournoi");
  const [mode, setMode] = React.useState<TournamentMode>("x01");
  const [format, setFormat] = React.useState<"rr" | "se" | "rr_se">("rr_se");

  const [selected, setSelected] = React.useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    profiles.forEach((p: any) => (m[p.id] = true));
    return m;
  });

  const [creating, setCreating] = React.useState(false);

  function toggle(pid: string) {
    setSelected((s) => ({ ...s, [pid]: !s[pid] }));
  }

  function buildStages(): TournamentStage[] {
    if (format === "rr") {
      return [
        {
          id: "stage-rr",
          type: "round_robin",
          groups: 1,
          seeding: "random",
          name: "Round Robin",
        },
      ];
    }
    if (format === "se") {
      return [
        {
          id: "stage-se",
          type: "single_elim",
          seeding: "random",
          name: "Élimination",
        },
      ];
    }
    // rr + finale
    return [
      {
        id: "stage-rr",
        type: "round_robin",
        groups: 2,
        qualifiersPerGroup: 2,
        seeding: "random",
        name: "Poules",
      },
      {
        id: "stage-se",
        type: "single_elim",
        seeding: "random",
        name: "Finale",
      },
    ];
  }

  function create() {
    if (creating) return;

    setCreating(true);

    try {
      const players: TournamentPlayer[] = profiles
        .filter((p: any) => selected[p.id])
        .map((p: any) => ({
          id: p.id,
          name: p.name || "Joueur",
          avatarDataUrl: p.avatarDataUrl ?? null,
          isBot: false,
          seed: null,
        }));

      if (players.length < 2) {
        alert("Sélectionne au moins 2 joueurs.");
        setCreating(false);
        return;
      }

      const tournament = createTournamentDraft({
        name,
        source: "local",
        ownerProfileId: store?.activeProfileId ?? null,
        players,
        stages: buildStages(),
        game: {
          mode,
          // TODO: brancher tes configs réelles par mode
          rules: { preset: "default" },
        },
      });

      const matches = buildInitialMatches(tournament);

      // ⚠️ Ici ça peut planter si localStorage est plein
      upsertTournamentLocal(tournament);
      upsertMatchesForTournamentLocal(tournament.id, matches);

      go("tournament_view", { id: tournament.id });
    } catch (e: any) {
      console.error("[TOURNAMENT CREATE FAILED]", e);

      if (isQuotaError(e)) {
        alert(
          "Création impossible : stockage local saturé (quota navigateur).\n\n" +
            "➡️ Solution rapide : supprime d’anciens matchs / historiques / images.\n" +
            "➡️ Solution propre : migrer les tournois vers IndexedDB (je te le fais après)."
        );
      } else {
        alert("Erreur lors de la création du tournoi. Voir console.");
      }
    } finally {
      setCreating(false);
    }
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
          onClick={() => go("tournaments")}
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
              fontSize: 20,
              fontWeight: 950,
              color: theme.primary,
              textShadow: `0 0 12px ${theme.primary}66`,
            }}
          >
            {t("tournament.create.title", "CRÉER UN TOURNOI")}
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 4 }}>
            {t("tournament.create.subtitle", "Local — configurations personnalisées")}
          </div>
        </div>
        <div style={{ width: 44 }} />
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <div
          style={{
            borderRadius: 18,
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Nom</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 12,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,.18)",
              color: theme.text,
            }}
          />
        </div>

        <div
          style={{
            borderRadius: 18,
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Mode</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["x01", "cricket", "killer", "clock"] as TournamentMode[]).map(
              (m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    borderRadius: 999,
                    padding: "8px 12px",
                    border: `1px solid ${
                      m === mode ? theme.primary : theme.borderSoft
                    }`,
                    background:
                      m === mode ? `${theme.primary}22` : "rgba(0,0,0,.10)",
                    color: theme.text,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {String(m).toUpperCase()}
                </button>
              )
            )}
          </div>
          <div style={{ marginTop: 8, fontSize: 12.5, opacity: 0.8 }}>
            (La config détaillée par mode arrive juste après : X01 legs/sets,
            Cricket rules, Killer rules, Horloge…)
          </div>
        </div>

        <div
          style={{
            borderRadius: 18,
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Format</div>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="radio"
                checked={format === "rr"}
                onChange={() => setFormat("rr")}
              />
              <span>Round Robin (tous contre tous)</span>
            </label>
            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="radio"
                checked={format === "se"}
                onChange={() => setFormat("se")}
              />
              <span>Élimination directe (bracket)</span>
            </label>
            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="radio"
                checked={format === "rr_se"}
                onChange={() => setFormat("rr_se")}
              />
              <span>Poules → Finale (RR + phase finale)</span>
            </label>
          </div>
        </div>

        <div
          style={{
            borderRadius: 18,
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Joueurs</div>
          <div style={{ display: "grid", gap: 8 }}>
            {profiles.map((p: any) => {
              const checked = !!selected[p.id];
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    textAlign: "left",
                    padding: 10,
                    borderRadius: 14,
                    border: `1px solid ${
                      checked ? theme.primary : theme.borderSoft
                    }`,
                    background: checked
                      ? `${theme.primary}18`
                      : "rgba(0,0,0,.12)",
                    color: theme.text,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      background: "rgba(255,255,255,.08)",
                      overflow: "hidden",
                      border: `1px solid ${theme.borderSoft}`,
                      flex: "0 0 auto",
                    }}
                  >
                    {p.avatarDataUrl ? (
                      <img
                        src={p.avatarDataUrl}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : null}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 950 }}>{p.name || "Joueur"}</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      {checked ? "Sélectionné" : "Non sélectionné"}
                    </div>
                  </div>
                  <div style={{ fontWeight: 900 }}>{checked ? "✓" : ""}</div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={create}
          disabled={creating}
          style={{
            borderRadius: 999,
            padding: "12px 14px",
            border: "none",
            fontWeight: 950,
            background: creating
              ? "linear-gradient(180deg,#a1a1a1,#7a7a7a)"
              : "linear-gradient(180deg,#ffc63a,#ffaf00)",
            color: "#1b1508",
            cursor: creating ? "not-allowed" : "pointer",
            opacity: creating ? 0.85 : 1,
          }}
        >
          {creating ? "Création…" : "Créer le tournoi"}
        </button>
      </div>
    </div>
  );
}
