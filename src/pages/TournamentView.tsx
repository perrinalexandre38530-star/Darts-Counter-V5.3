// ============================================
// src/pages/TournamentView.tsx
// TOURNOIS — VIEW (Local)
// ✅ Sections: Jouables / En cours / Terminés
// ✅ startMatch => playing (plusieurs en parallèle)
// ✅ submitResult => done (dans n'importe quel ordre)
// ✅ NEW: bouton "Lancer" => ouvre la page TournamentMatchPlay
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import type { Tournament, TournamentMatch } from "../lib/tournaments/types";
import {
  getPlayableMatches,
  startMatch,
  submitResult,
  getTournamentProgress,
} from "../lib/tournaments/engine";
import {
  getTournamentLocal,
  listMatchesForTournamentLocal,
  upsertTournamentLocal,
  upsertMatchesForTournamentLocal,
} from "../lib/tournaments/storeLocal";

type Props = {
  store: any;
  go: (tab: any, params?: any) => void;
  params: any;
};

function nameOf(t: Tournament, pid: string) {
  const p = (t.players || []).find((x) => x.id === pid);
  if (!p)
    return pid === "__TBD__" ? "TBD" : pid === "__BYE__" ? "BYE" : "Joueur";
  return p.name || "Joueur";
}

export default function TournamentView({ store, go, params }: Props) {
  const { theme } = useTheme();
  const { t: tt } = useLang();

  const tid = String(params?.id || "");
  const [tour, setTour] = React.useState<Tournament | null>(() =>
    tid ? (getTournamentLocal(tid) as any) : null
  );
  const [matches, setMatches] = React.useState<TournamentMatch[]>(() =>
    tid ? (listMatchesForTournamentLocal(tid) as any) : []
  );

  const [resultMatch, setResultMatch] = React.useState<TournamentMatch | null>(
    null
  );

  React.useEffect(() => {
    if (!tid) return;
    setTour(getTournamentLocal(tid) as any);
    setMatches(listMatchesForTournamentLocal(tid) as any);
  }, [tid]);

  function persist(nextTour: Tournament, nextMatches: TournamentMatch[]) {
    upsertTournamentLocal(nextTour);
    upsertMatchesForTournamentLocal(nextTour.id, nextMatches);
    setTour(nextTour);
    setMatches(nextMatches);
  }

  if (!tour) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 16,
          background: theme.bg,
          color: theme.text,
        }}
      >
        <button onClick={() => go("tournaments")}>← Retour</button>
        <p>Tournoi introuvable.</p>
      </div>
    );
  }

  const playable = getPlayableMatches(tour, matches);
  const playing = matches.filter((m) => m.status === "playing");
  const done = matches.filter((m) => m.status === "done");
  const prog = getTournamentProgress(tour, matches);

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
            {tour.name}
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 4 }}>
            {String(tour.game?.mode || "").toUpperCase()} •{" "}
            {tour.status.toUpperCase()} • {prog.done}/{prog.total}
          </div>
        </div>
        <div style={{ width: 44 }} />
      </div>

      {/* Quick KPIs */}
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        {[
          ["À jouer", playable.length],
          ["En cours", playing.length],
          ["Terminés", done.length],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            style={{
              flex: 1,
              borderRadius: 16,
              border: `1px solid ${theme.borderSoft}`,
              background: theme.card,
              padding: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 950,
                color: theme.primary,
                textShadow: `0 0 10px ${theme.primary}44`,
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* PLAYABLE */}
      <Section title="⚡ À jouer maintenant" theme={theme}>
        {playable.length === 0 ? (
          <Empty text="Aucun match jouable pour le moment." />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {playable.slice(0, 50).map((m) => (
              <MatchRow
                key={m.id}
                theme={theme}
                label={`Stage ${m.stageIndex + 1} • ${
                  tour.stages[m.stageIndex]?.name || ""
                } • G${m.groupIndex + 1} • R${m.roundIndex + 1}`}
                a={nameOf(tour, m.aPlayerId)}
                b={nameOf(tour, m.bPlayerId)}
                actions={[
                  {
                    text: "Lancer",
                    onClick: () => {
                      // 1) passe en "playing"
                      const r = startMatch({
                        tournament: tour,
                        matches,
                        matchId: m.id,
                        startedBy: store?.activeProfileId ?? null,
                      });
                      persist(r.tournament, r.matches);

                      // 2) ouvre la page qui lance la vraie partie
                      go("tournament_match_play", {
                        tournamentId: tour.id,
                        matchId: m.id,
                      });
                    },
                    primary: true,
                  },
                  {
                    text: "Saisir résultat",
                    onClick: () => setResultMatch(m),
                  },
                ]}
              />
            ))}
          </div>
        )}
      </Section>

      {/* PLAYING */}
      <Section title="🟠 Matchs en cours" theme={theme}>
        {playing.length === 0 ? (
          <Empty text="Aucun match en cours." />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {playing.map((m) => (
              <MatchRow
                key={m.id}
                theme={theme}
                label={`Stage ${m.stageIndex + 1} • ${
                  tour.stages[m.stageIndex]?.name || ""
                }`}
                a={nameOf(tour, m.aPlayerId)}
                b={nameOf(tour, m.bPlayerId)}
                actions={[
                  {
                    text: "Saisir résultat",
                    onClick: () => setResultMatch(m),
                    primary: true,
                  },
                ]}
              />
            ))}
          </div>
        )}
      </Section>

      {/* DONE */}
      <Section title="✅ Terminés" theme={theme}>
        {done.length === 0 ? (
          <Empty text="Aucun match terminé." />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {done.slice(0, 80).map((m) => (
              <MatchRow
                key={m.id}
                theme={theme}
                label={`Stage ${m.stageIndex + 1} • ${
                  tour.stages[m.stageIndex]?.name || ""
                }`}
                a={nameOf(tour, m.aPlayerId)}
                b={nameOf(tour, m.bPlayerId)}
                winner={m.winnerId ? nameOf(tour, m.winnerId) : null}
                actions={[
                  m.historyMatchId
                    ? {
                        text: "Voir match",
                        onClick: () =>
                          go("statsDetail", { matchId: m.historyMatchId }),
                      }
                    : null,
                ].filter(Boolean) as any}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Modal saisie résultat */}
      {resultMatch && (
        <ResultModal
          theme={theme}
          title="Saisir résultat"
          aName={nameOf(tour, resultMatch.aPlayerId)}
          bName={nameOf(tour, resultMatch.bPlayerId)}
          onClose={() => setResultMatch(null)}
          onPickWinner={(winnerId) => {
            const r = submitResult({
              tournament: tour,
              matches,
              matchId: resultMatch.id,
              winnerId,
              historyMatchId: null,
            });
            persist(r.tournament, r.matches);
            setResultMatch(null);
          }}
          aId={resultMatch.aPlayerId}
          bId={resultMatch.bPlayerId}
        />
      )}
    </div>
  );
}

function Section({ title, theme, children }: any) {
  return (
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
      <div
        style={{
          fontWeight: 950,
          color: theme.primary,
          textShadow: `0 0 10px ${theme.primary}44`,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: any) {
  return <div style={{ fontSize: 13, opacity: 0.8 }}>{text}</div>;
}

function MatchRow({ theme, label, a, b, winner, actions }: any) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${theme.borderSoft}`,
        background: "rgba(0,0,0,.14)",
        padding: 10,
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.75 }}>{label}</div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, fontWeight: 950 }}>{a}</div>
        <div style={{ opacity: 0.6 }}>vs</div>
        <div style={{ flex: 1, fontWeight: 950, textAlign: "right" }}>{b}</div>
      </div>

      {winner ? (
        <div style={{ fontSize: 12.5, opacity: 0.9 }}>
          🏆 Vainqueur : <b>{winner}</b>
        </div>
      ) : null}

      {actions?.length ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {actions.map((a: any, i: number) => (
            <button
              key={i}
              onClick={a.onClick}
              style={{
                borderRadius: 999,
                padding: "8px 12px",
                border: a.primary ? "none" : `1px solid ${theme.borderSoft}`,
                background: a.primary
                  ? "linear-gradient(180deg,#ffc63a,#ffaf00)"
                  : "rgba(0,0,0,.10)",
                color: a.primary ? "#1b1508" : theme.text,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {a.text}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ResultModal({
  theme,
  title,
  aName,
  bName,
  aId,
  bId,
  onPickWinner,
  onClose,
}: any) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.72)",
        display: "grid",
        placeItems: "center",
        zIndex: 60,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, 92vw)",
          borderRadius: 18,
          border: `1px solid ${theme.primary}55`,
          background: theme.card,
          padding: 14,
          boxShadow: "0 22px 60px rgba(0,0,0,.65)",
        }}
      >
        <div
          style={{
            fontWeight: 950,
            color: theme.primary,
            textShadow: `0 0 10px ${theme.primary}44`,
          }}
        >
          {title}
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <button
            onClick={() => onPickWinner(aId)}
            style={{
              borderRadius: 14,
              padding: 12,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,.12)",
              color: theme.text,
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            🏆 {aName}
          </button>

          <button
            onClick={() => onPickWinner(bId)}
            style={{
              borderRadius: 14,
              padding: 12,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,.12)",
              color: theme.text,
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            🏆 {bName}
          </button>

          <button
            onClick={onClose}
            style={{
              borderRadius: 999,
              padding: "10px 12px",
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,.10)",
              color: theme.text,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
