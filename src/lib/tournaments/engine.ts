// ============================================
// src/lib/tournaments/engine.ts
// Moteur tournois (LOCAL-first) :
// ✅ Round Robin (poules) + Single Elim (bracket)
// ✅ Multi-match parallèle : pending / playing / done
// ✅ Dépendances : SE round N jouable si joueurs connus
// ✅ Pipeline: Poules/Qualifs -> Finale auto (génère stage suivant)
// ============================================

import type {
  MatchStatus,
  Tournament,
  TournamentMatch,
  TournamentPlayer,
  TournamentStage,
} from "./types";

function uid(prefix = "t") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return Date.now();
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function chunk<T>(arr: T[], chunks: number): T[][] {
  const n = Math.max(1, chunks | 0);
  const out: T[][] = Array.from({ length: n }, () => []);
  arr.forEach((x, i) => out[i % n].push(x));
  return out;
}

// ------------------------------
// Round Robin (méthode du cercle)
// ------------------------------
function roundRobinPairs(playerIds: string[]): Array<[string, string]>[] {
  const ids = playerIds.slice();
  if (ids.length < 2) return [];

  const hasBye = ids.length % 2 === 1;
  if (hasBye) ids.push("__BYE__");

  const n = ids.length;
  const rounds: Array<[string, string]>[] = [];

  const arr = ids.slice();
  for (let r = 0; r < n - 1; r++) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== "__BYE__" && b !== "__BYE__") pairs.push([a, b]);
    }
    rounds.push(pairs);

    // rotation (garde arr[0] fixe)
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop() as string);
    arr.splice(0, arr.length, fixed, ...rest);
  }

  return rounds;
}

// ------------------------------
// Single Elim bracket generation
// ------------------------------
function nextPow2(n: number) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function bracketFirstRoundSeeding(ids: string[]): Array<[string, string]> {
  const n = nextPow2(ids.length);
  const padded = ids.slice();
  while (padded.length < n) padded.push("__BYE__");

  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < n / 2; i++) {
    const a = padded[i];
    const b = padded[n - 1 - i];
    pairs.push([a, b]);
  }
  return pairs;
}

// ------------------------------
// Public API
// ------------------------------
export function createTournamentDraft(args: {
  name: string;
  source: "local" | "online";
  ownerProfileId?: string | null;
  players: TournamentPlayer[];
  stages: TournamentStage[];
  game: { mode: any; rules: Record<string, any> };
}): Tournament {
  const t: Tournament = {
    id: uid("tour"),
    source: args.source,
    name: args.name?.trim() || "Tournoi",
    status: "draft",
    createdAt: now(),
    updatedAt: now(),
    ownerProfileId: args.ownerProfileId ?? null,
    players: args.players || [],
    stages: args.stages || [],
    game: { mode: args.game.mode, rules: args.game.rules || {} },
    currentStageIndex: 0,
  };
  return t;
}

/**
 * Build matches for ALL stages upfront where possible.
 * - RR : tous les matchs sont connus dès le départ
 * - SE : si les joueurs du stage sont connus -> bracket complet
 *        sinon -> placeholders (TBD) (stage suivant des poules)
 */
export function buildInitialMatches(t: Tournament): TournamentMatch[] {
  const createdAt = now();
  const matches: TournamentMatch[] = [];
  let order = 0;

  // stage 0 players = tous
  const stagePlayersByIndex: Record<number, string[]> = {};
  stagePlayersByIndex[0] = (t.players || []).map((p) => p.id);

  for (let s = 0; s < t.stages.length; s++) {
    const st = t.stages[s];

    const ids = stagePlayersByIndex[s] || [];
    const groupCount = Math.max(1, st.groups ?? 1);

    if (st.type === "round_robin") {
      const groups = chunk(ids, groupCount);

      groups.forEach((groupIds, g) => {
        const rounds = roundRobinPairs(groupIds);
        rounds.forEach((pairs, rIdx) => {
          pairs.forEach(([a, b]) => {
            matches.push({
              id: uid("m"),
              tournamentId: t.id,
              stageIndex: s,
              groupIndex: g,
              roundIndex: rIdx,
              orderIndex: order++,
              aPlayerId: a,
              bPlayerId: b,
              status: "pending",
              winnerId: null,
              sessionId: null,
              startedAt: null,
              startedBy: null,
              historyMatchId: null,
              createdAt,
              updatedAt: createdAt,
            });
          });
        });
      });

      // stage suivant sera déterminé quand les poules seront terminées
      stagePlayersByIndex[s + 1] = [];
    } else if (st.type === "single_elim") {
      if (!ids.length) {
        // placeholders : on ne sait pas encore combien ? -> on génère au minimum un bracket "vide"
        // On régénérera proprement dès qu’on aura la liste des qualifiés.
        // Ici, on fait un placeholder minimal (1 match TBD) pour éviter une vue vide.
        matches.push({
          id: uid("m"),
          tournamentId: t.id,
          stageIndex: s,
          groupIndex: 0,
          roundIndex: 0,
          orderIndex: order++,
          aPlayerId: "__TBD__",
          bPlayerId: "__TBD__",
          status: "pending",
          winnerId: null,
          sessionId: null,
          startedAt: null,
          startedBy: null,
          historyMatchId: null,
          createdAt,
          updatedAt: createdAt,
        });
        stagePlayersByIndex[s + 1] = [];
        continue;
      }

      // seeding: random ou ordre fourni
      const ordered = st.seeding === "random" ? shuffle(ids) : ids.slice();

      const stageMatches = buildSingleElimMatches({
        tournamentId: t.id,
        stageIndex: s,
        playerIds: ordered,
        startOrderIndex: order,
      });
      order += stageMatches.length;
      matches.push(...stageMatches);

      stagePlayersByIndex[s + 1] = [];
    }
  }

  return resolveBracketPlaceholders(t, matches);
}

export function getTournamentProgress(t: Tournament, matches: TournamentMatch[]) {
  const tid = t.id;
  const list = matches.filter((m) => m.tournamentId === tid);
  const total = list.length;
  const done = list.filter((m) => m.status === "done").length;
  const playing = list.filter((m) => m.status === "playing").length;
  const pending = total - done - playing;
  return { total, done, playing, pending };
}

export function getPlayableMatches(t: Tournament, matches: TournamentMatch[]): TournamentMatch[] {
  const tid = t.id;
  const list = matches.filter((m) => m.tournamentId === tid);

  return list.filter((m) => {
    if (m.status !== "pending") return false;
    if (m.aPlayerId === "__TBD__" || m.bPlayerId === "__TBD__") return false;
    if (m.aPlayerId === "__BYE__" || m.bPlayerId === "__BYE__") return false;
    return true;
  });
}

export function startMatch(args: {
  tournament: Tournament;
  matches: TournamentMatch[];
  matchId: string;
  startedBy?: string | null;
}): { tournament: Tournament; matches: TournamentMatch[] } {
  const m = args.matches.find((x) => x.id === args.matchId);
  if (!m) return { tournament: args.tournament, matches: args.matches };

  if (m.status !== "pending") return { tournament: args.tournament, matches: args.matches };
  if (m.aPlayerId === "__TBD__" || m.bPlayerId === "__TBD__") return { tournament: args.tournament, matches: args.matches };

  const next = args.matches.map((x) => {
    if (x.id !== m.id) return x;
    return {
      ...x,
      status: "playing" as MatchStatus,
      sessionId: x.sessionId || uid("sess"),
      startedAt: x.startedAt || now(),
      startedBy: args.startedBy ?? null,
      updatedAt: now(),
    };
  });

  const t2 = {
    ...args.tournament,
    status: args.tournament.status === "draft" ? "running" : args.tournament.status,
    updatedAt: now(),
  };

  return { tournament: t2, matches: next };
}

export function submitResult(args: {
  tournament: Tournament;
  matches: TournamentMatch[];
  matchId: string;
  winnerId: string;
  historyMatchId?: string | null;
}): { tournament: Tournament; matches: TournamentMatch[] } {
  const m = args.matches.find((x) => x.id === args.matchId);
  if (!m) return { tournament: args.tournament, matches: args.matches };
  if (m.status === "done") return { tournament: args.tournament, matches: args.matches };

  const winner = args.winnerId;

  let nextMatches = args.matches.map((x) => {
    if (x.id !== m.id) return x;
    return {
      ...x,
      status: "done" as MatchStatus,
      winnerId: winner,
      historyMatchId: args.historyMatchId ?? x.historyMatchId ?? null,
      updatedAt: now(),
    };
  });

  // 1) résout les brackets SE (TBD -> winners)
  nextMatches = resolveBracketPlaceholders(args.tournament, nextMatches);

  // 2) applique le pipeline (RR terminé -> génère SE suivant)
  const adv = applyPipelineAdvancement(args.tournament, nextMatches);
  const nextTournament = adv.tournament;
  nextMatches = adv.matches;

  // 3) statut finished si tout est done
  const prog = getTournamentProgress(nextTournament, nextMatches);
  const status =
    prog.done === prog.total && prog.total > 0 ? "finished"
    : nextTournament.status === "draft" ? "running"
    : nextTournament.status;

  return {
    tournament: { ...nextTournament, status, updatedAt: now() },
    matches: nextMatches,
  };
}

// =====================================================
// ✅ STANDINGS (Round Robin) + QUALIFIERS
// =====================================================
export type RRStandingRow = {
  playerId: string;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
};

export function computeRRStandings(
  t: Tournament,
  matches: TournamentMatch[],
  stageIndex: number,
  groupIndex: number
): RRStandingRow[] {
  const stageMatches = matches.filter(
    (m) =>
      m.tournamentId === t.id &&
      m.stageIndex === stageIndex &&
      m.groupIndex === groupIndex
  );

  // players in this group = those appearing in matches (or can be inferred)
  const ids = new Set<string>();
  stageMatches.forEach((m) => {
    if (m.aPlayerId && !m.aPlayerId.startsWith("__")) ids.add(m.aPlayerId);
    if (m.bPlayerId && !m.bPlayerId.startsWith("__")) ids.add(m.bPlayerId);
  });

  const rows: Record<string, RRStandingRow> = {};
  ids.forEach((pid) => {
    rows[pid] = {
      playerId: pid,
      played: 0,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    };
  });

  // Pour l’instant : pointsFor/Against = nombre de victoires (proxy),
  // on remplacera par un vrai score dès qu’on branche les résultats détaillés depuis History.
  stageMatches.forEach((m) => {
    if (m.status !== "done") return;
    const a = m.aPlayerId;
    const b = m.bPlayerId;
    if (!rows[a] || !rows[b]) return;

    rows[a].played += 1;
    rows[b].played += 1;

    if (m.winnerId === a) {
      rows[a].wins += 1;
      rows[b].losses += 1;
      rows[a].pointsFor += 1;
      rows[b].pointsAgainst += 1;
    } else if (m.winnerId === b) {
      rows[b].wins += 1;
      rows[a].losses += 1;
      rows[b].pointsFor += 1;
      rows[a].pointsAgainst += 1;
    }
  });

  const list = Object.values(rows);

  // tri : wins desc, pointsFor desc, name asc
  list.sort((ra, rb) => {
    if (rb.wins !== ra.wins) return rb.wins - ra.wins;
    if (rb.pointsFor !== ra.pointsFor) return rb.pointsFor - ra.pointsFor;
    const na = nameOf(t, ra.playerId);
    const nb = nameOf(t, rb.playerId);
    return na.localeCompare(nb);
  });

  return list;
}

export function getQualifiedPlayersFromRRStage(
  t: Tournament,
  matches: TournamentMatch[],
  stageIndex: number
): string[] {
  const st = t.stages[stageIndex];
  if (!st || st.type !== "round_robin") return [];

  const groupCount = Math.max(1, st.groups ?? 1);
  const q = Math.max(1, st.qualifiersPerGroup ?? 1);

  const out: string[] = [];
  for (let g = 0; g < groupCount; g++) {
    const standings = computeRRStandings(t, matches, stageIndex, g);
    standings.slice(0, q).forEach((r) => out.push(r.playerId));
  }
  return out;
}

// =====================================================
// ✅ Pipeline advancement : RR terminé -> générer stage suivant
// =====================================================
function applyPipelineAdvancement(
  tournament: Tournament,
  matches: TournamentMatch[]
): { tournament: Tournament; matches: TournamentMatch[] } {
  let t = tournament;
  let ms = matches.slice();

  // On avance stage par stage si terminé
  for (let s = 0; s < t.stages.length - 1; s++) {
    const st = t.stages[s];
    const nextSt = t.stages[s + 1];

    // stage terminé ?
    const stageMatches = ms.filter((m) => m.tournamentId === t.id && m.stageIndex === s);
    const stageDone = stageMatches.length > 0 && stageMatches.every((m) => m.status === "done");
    if (!stageDone) continue;

    // Si c’est un RR et le next est SE : générer bracket avec qualifiés
    if (st.type === "round_robin" && nextSt?.type === "single_elim") {
      const qualified = getQualifiedPlayersFromRRStage(t, ms, s);
      if (qualified.length >= 2) {
        ms = regenerateSingleElimStage(t, ms, s + 1, qualified, nextSt.seeding === "random");
        t = { ...t, currentStageIndex: Math.max(t.currentStageIndex, s + 1), updatedAt: now() };
      }
    }

    // Si on veut d’autres pipelines plus tard (qualifs -> poules -> etc), c’est ici.
  }

  return { tournament: t, matches: ms };
}

function regenerateSingleElimStage(
  t: Tournament,
  matches: TournamentMatch[],
  stageIndex: number,
  playerIds: string[],
  randomSeeding: boolean
): TournamentMatch[] {
  const startOrderIndex =
    matches.reduce((mx, m) => Math.max(mx, m.orderIndex ?? 0), 0) + 1;

  const ordered = randomSeeding ? shuffle(playerIds) : playerIds.slice();

  const newStageMatches = buildSingleElimMatches({
    tournamentId: t.id,
    stageIndex,
    playerIds: ordered,
    startOrderIndex,
  });

  // supprimer anciens matchs de ce stage
  const keep = matches.filter((m) => !(m.tournamentId === t.id && m.stageIndex === stageIndex));
  const merged = [...keep, ...newStageMatches].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  // résout auto BYE
  return resolveBracketPlaceholders(t, merged);
}

function buildSingleElimMatches(args: {
  tournamentId: string;
  stageIndex: number;
  playerIds: string[];
  startOrderIndex: number;
}): TournamentMatch[] {
  const createdAt = now();
  const ids = args.playerIds.slice();
  const firstPairs = bracketFirstRoundSeeding(ids);
  const n = nextPow2(ids.length);
  const roundsCount = Math.log2(n);

  const out: TournamentMatch[] = [];
  let order = args.startOrderIndex;

  // round 0
  firstPairs.forEach(([a, b]) => {
    const isBye = a === "__BYE__" || b === "__BYE__";
    const winner = a === "__BYE__" ? b : b === "__BYE__" ? a : null;

    out.push({
      id: uid("m"),
      tournamentId: args.tournamentId,
      stageIndex: args.stageIndex,
      groupIndex: 0,
      roundIndex: 0,
      orderIndex: order++,
      aPlayerId: a,
      bPlayerId: b,
      status: isBye ? "done" : "pending",
      winnerId: isBye ? winner : null,
      sessionId: null,
      startedAt: null,
      startedBy: null,
      historyMatchId: null,
      createdAt,
      updatedAt: createdAt,
    });
  });

  // rounds 1..k placeholders
  for (let r = 1; r < roundsCount; r++) {
    const count = n / Math.pow(2, r + 1);
    for (let i = 0; i < count; i++) {
      out.push({
        id: uid("m"),
        tournamentId: args.tournamentId,
        stageIndex: args.stageIndex,
        groupIndex: 0,
        roundIndex: r,
        orderIndex: order++,
        aPlayerId: "__TBD__",
        bPlayerId: "__TBD__",
        status: "pending",
        winnerId: null,
        sessionId: null,
        startedAt: null,
        startedBy: null,
        historyMatchId: null,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  return out;
}

// ------------------------------
// Bracket placeholder resolution
// ------------------------------
function resolveBracketPlaceholders(t: Tournament, matches: TournamentMatch[]): TournamentMatch[] {
  const list = matches.slice();

  t.stages.forEach((st, sIdx) => {
    if (st.type !== "single_elim") return;

    const stageMatches = list
      .filter((m) => m.tournamentId === t.id && m.stageIndex === sIdx)
      .sort((a, b) => (a.roundIndex - b.roundIndex) || (a.orderIndex - b.orderIndex));

    if (stageMatches.length === 0) return;

    const rounds: Record<number, TournamentMatch[]> = {};
    stageMatches.forEach((m) => {
      rounds[m.roundIndex] = rounds[m.roundIndex] || [];
      rounds[m.roundIndex].push(m);
    });

    const roundIndices = Object.keys(rounds).map(Number).sort((a, b) => a - b);

    for (let r = 0; r < roundIndices.length - 1; r++) {
      const curr = rounds[roundIndices[r]] || [];
      const next = rounds[roundIndices[r + 1]] || [];
      if (!curr.length || !next.length) continue;

      const winners = curr.map((m) => (m.status === "done" ? (m.winnerId || null) : null));

      for (let i = 0; i < next.length; i++) {
        const wA = winners[i * 2] || "__TBD__";
        const wB = winners[i * 2 + 1] || "__TBD__";

        const target = next[i];
        const needUpdate =
          target.aPlayerId !== wA ||
          target.bPlayerId !== wB ||
          (target.status === "done" && (wA === "__TBD__" || wB === "__TBD__"));

        if (!needUpdate) continue;

        const isBye = wA === "__BYE__" || wB === "__BYE__";
        const winner = wA === "__BYE__" ? wB : wB === "__BYE__" ? wA : null;

        const idx = list.findIndex((m) => m.id === target.id);
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            aPlayerId: wA,
            bPlayerId: wB,
            status: isBye ? "done" : "pending",
            winnerId: isBye ? winner : null,
            sessionId: null,
            startedAt: null,
            startedBy: null,
            updatedAt: now(),
          };
        }
      }
    }
  });

  // safety auto-finish BYE
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (m.status !== "pending") continue;
    if (m.aPlayerId === "__BYE__" || m.bPlayerId === "__BYE__") {
      const winner = m.aPlayerId === "__BYE__" ? m.bPlayerId : m.aPlayerId;
      list[i] = { ...m, status: "done", winnerId: winner, updatedAt: now() };
    }
  }

  return list;
}

function nameOf(t: Tournament, pid: string) {
  const p = (t.players || []).find((x) => x.id === pid);
  return p?.name || pid;
}
