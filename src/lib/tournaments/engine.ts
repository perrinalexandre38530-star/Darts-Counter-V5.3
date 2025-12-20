// ============================================
// src/lib/tournaments/engine.ts
// Moteur tournois (LOCAL-first) :
// ✅ Round Robin (poules) + Single Elim (bracket)
// ✅ Multi-match parallèle : pending / playing / done
// ✅ Dépendances : SE round N jouable si joueurs connus
// ✅ Pipeline: Poules/Qualifs -> Finale auto (génère stage suivant)
// ✅ FIX: ne JAMAIS créer de match "__BYE__ vs __BYE__" + purge safety
// ✅ FIX: auto-finish "joueur vs BYE" (ne doit JAMAIS être pending)
// ✅ FIX: progress/playable basés sur matches "sanitized"
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

/** ✅ Helpers BYE/TBD */
const BYE = "__BYE__";
const TBD = "__TBD__";
function isByeId(x: any) {
  return String(x || "") === BYE;
}
function isTbdId(x: any) {
  return String(x || "") === TBD;
}
function isVoidByeMatch(m: any) {
  return isByeId(m?.aPlayerId) && isByeId(m?.bPlayerId);
}

/**
 * ✅ SANITIZE (core fix)
 * - supprime définitivement "__BYE__ vs __BYE__"
 * - auto-finish tout match "joueur vs BYE" (winner = joueur réel)
 * - auto-finish aussi si un placeholder se résout vers BYE plus tard
 */
function sanitizeMatches(t: Tournament, matches: TournamentMatch[]): TournamentMatch[] {
  const tid = t.id;
  const out: TournamentMatch[] = [];

  for (const m of matches) {
    if (m.tournamentId !== tid) {
      out.push(m);
      continue;
    }

    // 1) purge BYE/BYE
    if (isVoidByeMatch(m)) continue;

    // 2) si match pending mais contient BYE => auto-finish
    if (m.status === "pending" && (isByeId(m.aPlayerId) || isByeId(m.bPlayerId))) {
      const winner = isByeId(m.aPlayerId) ? m.bPlayerId : m.aPlayerId;
      out.push({
        ...m,
        status: "done",
        winnerId: winner || BYE,
        sessionId: null,
        startedAt: null,
        startedBy: null,
        updatedAt: now(),
      });
      continue;
    }

    out.push(m);
  }

  return out;
}

// ------------------------------
// Round Robin (méthode du cercle)
// ------------------------------
function roundRobinPairs(playerIds: string[]): Array<[string, string]>[] {
  const ids = playerIds.slice();
  if (ids.length < 2) return [];

  const hasBye = ids.length % 2 === 1;
  if (hasBye) ids.push(BYE);

  const n = ids.length;
  const rounds: Array<[string, string]>[] = [];

  const arr = ids.slice();
  for (let r = 0; r < n - 1; r++) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== BYE && b !== BYE) pairs.push([a, b]);
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
  while (padded.length < n) padded.push(BYE);

  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < n / 2; i++) {
    const a = padded[i];
    const b = padded[n - 1 - i];

    // ✅ FIX: jamais de "__BYE__ vs __BYE__"
    if (a === BYE && b === BYE) continue;

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
        // placeholders
        matches.push({
          id: uid("m"),
          tournamentId: t.id,
          stageIndex: s,
          groupIndex: 0,
          roundIndex: 0,
          orderIndex: order++,
          aPlayerId: TBD,
          bPlayerId: TBD,
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

  // ✅ resolve + sanitize (bye auto-finish + purge bye/bye)
  const resolved = resolveBracketPlaceholders(t, matches);
  return sanitizeMatches(t, resolved);
}

export function getTournamentProgress(t: Tournament, matches: TournamentMatch[]) {
  const tid = t.id;

  // ✅ IMPORTANT: counts on sanitized list
  const list = sanitizeMatches(t, matches).filter((m) => m.tournamentId === tid);

  const total = list.length;
  const done = list.filter((m) => m.status === "done").length;
  const playing = list.filter((m) => m.status === "playing").length;
  const pending = total - done - playing;
  return { total, done, playing, pending };
}

export function getPlayableMatches(t: Tournament, matches: TournamentMatch[]): TournamentMatch[] {
  const tid = t.id;

  // ✅ IMPORTANT: only sanitized list (bye auto-finished and bye/bye purged)
  const list = sanitizeMatches(t, matches).filter((m) => m.tournamentId === tid);

  return list.filter((m) => {
    if (m.status !== "pending") return false;
    if (isTbdId(m.aPlayerId) || isTbdId(m.bPlayerId)) return false;
    if (isByeId(m.aPlayerId) || isByeId(m.bPlayerId)) return false;
    if (isVoidByeMatch(m)) return false;
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

  // ✅ Start basé sur sanitized state (sécurité)
  const safeAll = sanitizeMatches(args.tournament, args.matches);
  const safe = safeAll.find((x) => x.id === args.matchId) || m;

  if (safe.status !== "pending") return { tournament: args.tournament, matches: safeAll };
  if (isTbdId(safe.aPlayerId) || isTbdId(safe.bPlayerId)) return { tournament: args.tournament, matches: safeAll };
  if (isByeId(safe.aPlayerId) || isByeId(safe.bPlayerId)) return { tournament: args.tournament, matches: safeAll };
  if (isVoidByeMatch(safe)) return { tournament: args.tournament, matches: safeAll };

  const next = safeAll.map((x) => {
    if (x.id !== safe.id) return x;
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

  // 2) pipeline
  const adv = applyPipelineAdvancement(args.tournament, nextMatches);
  const nextTournament = adv.tournament;
  nextMatches = adv.matches;

  // ✅ 3) sanitize final (bye auto-finish + purge bye/bye)
  nextMatches = sanitizeMatches(nextTournament, nextMatches);

  // 4) finished ?
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
  const stageMatches = sanitizeMatches(t, matches).filter(
    (m) =>
      m.tournamentId === t.id &&
      m.stageIndex === stageIndex &&
      m.groupIndex === groupIndex
  );

  const ids = new Set<string>();
  stageMatches.forEach((m) => {
    if (m.aPlayerId && !String(m.aPlayerId).startsWith("__")) ids.add(m.aPlayerId);
    if (m.bPlayerId && !String(m.bPlayerId).startsWith("__")) ids.add(m.bPlayerId);
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

  for (let s = 0; s < t.stages.length - 1; s++) {
    const st = t.stages[s];
    const nextSt = t.stages[s + 1];

    const stageMatches = sanitizeMatches(t, ms).filter((m) => m.tournamentId === t.id && m.stageIndex === s);
    const stageDone = stageMatches.length > 0 && stageMatches.every((m) => m.status === "done");
    if (!stageDone) continue;

    if (st.type === "round_robin" && nextSt?.type === "single_elim") {
      const qualified = getQualifiedPlayersFromRRStage(t, ms, s);
      if (qualified.length >= 2) {
        ms = regenerateSingleElimStage(t, ms, s + 1, qualified, nextSt.seeding === "random");
        t = { ...t, currentStageIndex: Math.max(t.currentStageIndex, s + 1), updatedAt: now() };
      }
    }
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

  const keep = matches.filter((m) => !(m.tournamentId === t.id && m.stageIndex === stageIndex));
  const merged = [...keep, ...newStageMatches].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  return sanitizeMatches(t, resolveBracketPlaceholders(t, merged));
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
    // ✅ FIX: jamais BYE vs BYE
    if (a === BYE && b === BYE) return;

    const isBye = a === BYE || b === BYE;
    const winner = a === BYE ? b : b === BYE ? a : null;

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
        aPlayerId: TBD,
        bPlayerId: TBD,
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
        const wA = winners[i * 2] || TBD;
        const wB = winners[i * 2 + 1] || TBD;

        const target = next[i];
        const needUpdate = target.aPlayerId !== wA || target.bPlayerId !== wB;

        if (!needUpdate) continue;

        const idx = list.findIndex((m) => m.id === target.id);
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            aPlayerId: wA,
            bPlayerId: wB,
            // on laisse pending, sanitize() s’occupera des BYE
            status: "pending",
            winnerId: null,
            sessionId: null,
            startedAt: null,
            startedBy: null,
            updatedAt: now(),
          };
        }
      }
    }
  });

  // ✅ purge safety (au cas où)
  return list.filter((m) => !isVoidByeMatch(m));
}

function nameOf(t: Tournament, pid: string) {
  const p = (t.players || []).find((x) => x.id === pid);
  return p?.name || pid;
}
