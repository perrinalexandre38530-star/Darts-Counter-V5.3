// @ts-nocheck
// ============================================
// src/pages/TournamentMatchPlay.tsx
// TOURNOIS — MATCH PLAY
// ✅ Lance une vraie partie pour un match de tournoi
// ✅ Auto-submit résultat => tournament engine + persistence locale
// ✅ X01 V3 / CRICKET / KILLER branchés
// - Horloge : fallback (à brancher quand tu as un vrai ClockPlay)
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import type { Tournament, TournamentMatch } from "../lib/tournaments/types";
import { submitResult } from "../lib/tournaments/engine";
import {
  getTournamentLocal,
  listMatchesForTournamentLocal,
  upsertTournamentLocal,
  upsertMatchesForTournamentLocal,
} from "../lib/tournaments/storeLocal";

import { History } from "../lib/history";

// ✅ Jeux existants
import X01PlayV3 from "./X01PlayV3";
import CricketPlay from "./CricketPlay";
import KillerPlay from "./KillerPlay";

const LS_ONLINE_MATCHES_KEY = "dc_online_matches_v1";

function nameOf(t: Tournament, pid: string) {
  const p = (t.players || []).find((x) => x.id === pid);
  return p?.name || "Joueur";
}

function avatarOf(t: Tournament, pid: string) {
  const p = (t.players || []).find((x) => x.id === pid);
  return p?.avatarDataUrl ?? null;
}

function extractWinnerId(m: any) {
  return (
    m?.winnerId ||
    m?.payload?.winnerId ||
    m?.summary?.winnerId ||
    m?.payload?.summary?.winnerId ||
    null
  );
}

function ensureTournamentLikeMatchId(m: any) {
  const now = Date.now();
  return (
    m?.id ||
    m?.matchId ||
    `tmatch-${now}-${Math.random().toString(36).slice(2, 8)}`
  );
}

/**
 * Sauvegarde "best effort" dans History IDB + miroir LS (StatsOnline) sans toucher au state App.
 * (On évite pushHistory() car ça navigue vers StatsHub et casse le flow tournoi)
 */
function saveMatchToHistoryIDB(args: {
  tournament: Tournament;
  matchPayload: any;
  profiles: any[];
}) {
  const { tournament, matchPayload, profiles } = args;

  const now = Date.now();
  const id = ensureTournamentLikeMatchId(matchPayload);

  const rawPlayers =
    matchPayload?.players ?? matchPayload?.payload?.players ?? [];

  const players = (rawPlayers || []).map((p: any) => {
    const prof = (profiles || []).find((pr: any) => pr.id === p?.id);
    return {
      id: p?.id,
      name: p?.name ?? prof?.name ?? "",
      avatarDataUrl: p?.avatarDataUrl ?? prof?.avatarDataUrl ?? null,
    };
  });

  const summary =
    matchPayload?.summary ?? matchPayload?.payload?.summary ?? null;

  const saved: any = {
    id,
    kind: matchPayload?.kind || tournament?.game?.mode || "match",
    status: "finished",
    players,
    winnerId: extractWinnerId(matchPayload),
    createdAt: matchPayload?.createdAt || now,
    updatedAt: now,
    summary,
    payload: { ...(matchPayload || {}), players },
  };

  try {
    (History as any)?.upsert?.(saved);
  } catch {}

  // miroir LS (StatsOnline) — best effort
  try {
    const raw = localStorage.getItem(LS_ONLINE_MATCHES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift({
      id: saved.id,
      mode: saved.kind,
      createdAt: saved.createdAt,
      finishedAt: saved.updatedAt,
      players: saved.players,
      winnerId: saved.winnerId,
      summary: saved.summary ?? null,
      stats: saved.payload?.stats ?? null,
    });
    localStorage.setItem(LS_ONLINE_MATCHES_KEY, JSON.stringify(list.slice(0, 200)));
  } catch {}

  return saved;
}

export default function TournamentMatchPlay({ store, go, params }: any) {
  const { theme } = useTheme();
  const { t } = useLang();

  const tournamentId = String(params?.tournamentId || params?.id || "");
  const matchId = String(params?.matchId || "");

  const [tour, setTour] = React.useState<Tournament | null>(() =>
    tournamentId ? (getTournamentLocal(tournamentId) as any) : null
  );
  const [matches, setMatches] = React.useState<TournamentMatch[]>(() =>
    tournamentId ? (listMatchesForTournamentLocal(tournamentId) as any) : []
  );
  const [tm, setTm] = React.useState<TournamentMatch | null>(() =>
    (matches || []).find((m) => m.id === matchId) ?? null
  );

  const mode = String(tour?.game?.mode || "");

  React.useEffect(() => {
    if (!tournamentId) return;
    const T = getTournamentLocal(tournamentId) as any;
    const M = listMatchesForTournamentLocal(tournamentId) as any;
    setTour(T);
    setMatches(M);
    setTm((M || []).find((x: any) => x.id === matchId) ?? null);
  }, [tournamentId, matchId]);

  function persist(nextTour: Tournament, nextMatches: TournamentMatch[]) {
    upsertTournamentLocal(nextTour);
    upsertMatchesForTournamentLocal(nextTour.id, nextMatches);
    setTour(nextTour);
    setMatches(nextMatches);
    setTm((nextMatches || []).find((x: any) => x.id === matchId) ?? null);
  }

  async function finishAndSubmit(matchPayload: any, historyMatchIdMaybe?: string | null) {
    if (!tour || !tm) return;

    // 1) sauvegarde History (IDB) sans naviguer
    const saved = saveMatchToHistoryIDB({
      tournament: tour as any,
      matchPayload,
      profiles: store?.profiles ?? [],
    });

    const winnerId = extractWinnerId(matchPayload) || saved?.winnerId;
    const historyMatchId = historyMatchIdMaybe || saved?.id || null;

    // 2) submit tournoi
    if (winnerId) {
      try {
        const r = submitResult({
          tournament: tour as any,
          matches: matches as any,
          matchId: tm.id,
          winnerId,
          historyMatchId,
        });
        persist(r.tournament as any, r.matches as any);
      } catch (e) {
        console.error("[tournament_match_play] submitResult error:", e);
      }
    } else {
      console.warn("[tournament_match_play] winnerId introuvable, retour tournoi (saisie manuelle possible).");
    }

    // 3) retour tournoi (enchaînement multi-match)
    go("tournament_view", { id: tour.id });
  }

  if (!tour || !tm) {
    return (
      <div style={{ minHeight: "100vh", padding: 16, background: theme.bg, color: theme.text }}>
        <button onClick={() => go("tournament_view", { id: tournamentId })}>← Retour tournoi</button>
        <div style={{ marginTop: 10, opacity: 0.9 }}>
          Match de tournoi introuvable (tournamentId/matchId manquant).
        </div>
      </div>
    );
  }

  const aId = tm.aPlayerId;
  const bId = tm.bPlayerId;

  // ------------------------------------------------------------
  // ✅ X01 V3
  // ------------------------------------------------------------
  if (mode === "x01") {
    const cfgFromTour = tour?.game?.rules?.x01v3 ?? null;

    const config: any =
      cfgFromTour ||
      ({
        mode: "x01",
        players: [
          { id: aId, name: nameOf(tour, aId), avatarDataUrl: avatarOf(tour, aId) },
          { id: bId, name: nameOf(tour, bId), avatarDataUrl: avatarOf(tour, bId) },
        ],
        start: tour?.game?.rules?.start ?? 501,
        doubleOut: tour?.game?.rules?.doubleOut ?? true,
        inMode: tour?.game?.rules?.inMode ?? "simple",
      } as any);

    return (
      <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text }}>
        <div style={{ padding: 12, paddingBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => go("tournament_view", { id: tournamentId })}
              style={{
                borderRadius: 12,
                padding: "8px 10px",
                border: `1px solid ${theme.borderSoft}`,
                background: theme.card,
                color: theme.text,
                cursor: "pointer",
              }}
            >
              ← Tournoi
            </button>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontWeight: 950, color: theme.primary, textShadow: `0 0 10px ${theme.primary}55` }}>
                {tour.name}
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.8 }}>
                Match • {nameOf(tour, aId)} vs {nameOf(tour, bId)}
              </div>
            </div>
            <div style={{ width: 90 }} />
          </div>
        </div>

        <X01PlayV3
          config={config}
          onExit={() => go("tournament_view", { id: tournamentId })}
          onReplayNewConfig={() => go("tournament_view", { id: tournamentId })}
          onShowSummary={async (historyMatchId: string) => {
            try {
              // Récup winnerId depuis History
              let rec: any = null;
              try {
                rec = await (History as any)?.get?.(historyMatchId);
              } catch {}

              const winnerId =
                rec?.winnerId ||
                rec?.payload?.winnerId ||
                rec?.summary?.winnerId ||
                null;

              if (winnerId) {
                const r = submitResult({
                  tournament: tour as any,
                  matches: matches as any,
                  matchId: tm.id,
                  winnerId,
                  historyMatchId,
                });
                persist(r.tournament as any, r.matches as any);
              } else {
                console.warn("[tournament_match_play] X01V3: winnerId not found in history record");
              }
            } catch (e) {
              console.error("[tournament_match_play] X01V3 submitResult error:", e);
            } finally {
              go("tournament_view", { id: tournamentId });
            }
          }}
        />
      </div>
    );
  }

  // ------------------------------------------------------------
  // ✅ CRICKET
  // ------------------------------------------------------------
  if (mode === "cricket") {
    // CricketPlay existant: on lui donne les profils, et on capte onFinish
    return (
      <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text }}>
        <div style={{ padding: 12, paddingBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => go("tournament_view", { id: tournamentId })}
              style={{
                borderRadius: 12,
                padding: "8px 10px",
                border: `1px solid ${theme.borderSoft}`,
                background: theme.card,
                color: theme.text,
                cursor: "pointer",
              }}
            >
              ← Tournoi
            </button>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontWeight: 950, color: theme.primary, textShadow: `0 0 10px ${theme.primary}55` }}>
                {tour.name}
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.8 }}>
                Cricket • {nameOf(tour, aId)} vs {nameOf(tour, bId)}
              </div>
            </div>
            <div style={{ width: 90 }} />
          </div>
        </div>

        <CricketPlay
          profiles={store?.profiles ?? []}
          onFinish={async (m: any) => {
            // On force une kind si jamais
            const payload = { ...(m || {}), kind: m?.kind || "cricket" };
            await finishAndSubmit(payload, null);
          }}
        />
      </div>
    );
  }

  // ------------------------------------------------------------
  // ✅ KILLER (best effort config 1v1)
  // ------------------------------------------------------------
  if (mode === "killer") {
    const cfg: any = tour?.game?.rules?.killerConfig || {
      players: [
        {
          id: aId,
          name: nameOf(tour, aId),
          avatarDataUrl: avatarOf(tour, aId),
          // numéro par défaut : on met 20/19 (tu ajusteras via rules)
          number: 20,
        },
        {
          id: bId,
          name: nameOf(tour, bId),
          avatarDataUrl: avatarOf(tour, bId),
          number: 19,
        },
      ],
      damageRule: "classic",
      becomeRule: "oneHit",
      lives: 3,
    };

    return (
      <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text }}>
        <div style={{ padding: 12, paddingBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => go("tournament_view", { id: tournamentId })}
              style={{
                borderRadius: 12,
                padding: "8px 10px",
                border: `1px solid ${theme.borderSoft}`,
                background: theme.card,
                color: theme.text,
                cursor: "pointer",
              }}
            >
              ← Tournoi
            </button>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontWeight: 950, color: theme.primary, textShadow: `0 0 10px ${theme.primary}55` }}>
                {tour.name}
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.8 }}>
                Killer • {nameOf(tour, aId)} vs {nameOf(tour, bId)}
              </div>
            </div>
            <div style={{ width: 90 }} />
          </div>
        </div>

        <KillerPlay
          store={store}
          go={go}
          config={cfg}
          onFinish={async (m: any) => {
            const payload = { ...(m || {}), kind: m?.kind || "killer" };
            await finishAndSubmit(payload, null);
          }}
        />
      </div>
    );
  }

  // ------------------------------------------------------------
  // ⏱️ HORLOGE / autres modes : fallback
  // ------------------------------------------------------------
  return (
    <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 90, background: theme.bg, color: theme.text }}>
      <button onClick={() => go("tournament_view", { id: tournamentId })}>← Retour tournoi</button>

      <div
        style={{
          marginTop: 12,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          background: theme.card,
          padding: 14,
        }}
      >
        <div style={{ fontWeight: 950, color: theme.primary, textShadow: `0 0 10px ${theme.primary}55` }}>
          Mode pas encore branché automatiquement
        </div>
        <div style={{ marginTop: 8, opacity: 0.85, lineHeight: 1.35 }}>
          Mode du tournoi : <b>{String(mode).toUpperCase()}</b>
          <br />
          Match : <b>{nameOf(tour, aId)}</b> vs <b>{nameOf(tour, bId)}</b>
        </div>

        <div style={{ marginTop: 10, fontSize: 12.5, opacity: 0.8 }}>
          Dès que tu as un vrai écran “ClockPlay” (non training), je le branche comme les autres
          (onFinish → History → submitResult → retour tournoi).
        </div>

        <button
          onClick={() => go("tournament_view", { id: tournamentId })}
          style={{
            marginTop: 12,
            borderRadius: 999,
            padding: "10px 12px",
            border: "none",
            fontWeight: 950,
            background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
            color: "#1b1508",
            cursor: "pointer",
          }}
        >
          Retour au tournoi
        </button>
      </div>
    </div>
  );
}
