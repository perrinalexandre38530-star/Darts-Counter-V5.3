// @ts-nocheck
// ============================================
// src/pages/TournamentView.tsx
// Tournois (LOCAL) — View (multi-visuals) — V4
//
// ✅ Onglets DYNAMIQUES selon tour.viewKind :
// - single_ko : Accueil / Tableau / Matchs / Stats
// - double_ko : Accueil / Tableau / Matchs / Repêchage / Stats
// - round_robin : Accueil / Classement / Matchs / Stats
// - groups_ko : Accueil / Poules / Classement / Tableau / Matchs / (Repêchage?) / Stats
//
// ✅ FIX UI: BYE/TBD jamais jouable
// ✅ FIX UI: masquer les matchs vs BYE -> bloc "Qualifiés d’office"
// ✅ TBD : affiche "Vainqueur match X" + avatars des 2 joueurs du feeder
//
// ✅ FIX 1: Onglets sur UNE SEULE LIGNE (responsive, shrink auto)
// ✅ FIX 2: Match cards ne dépassent plus la largeur écran
// ✅ NEW: Onglet STATS (vraies stats: W/L, winrate, points, scored, conceded)
// ============================================

import React from "react";
import type { Store } from "../lib/types";
import type { Tournament, TournamentMatch } from "../lib/tournaments/types";

import { startMatch, submitResult } from "../lib/tournaments/engine";
import {
  getTournamentLocal,
  listMatchesForTournamentLocal,
  upsertTournamentLocal,
  upsertMatchesForTournamentLocal,
  deleteTournamentLocal,
  deleteMatchesForTournamentLocal,
} from "../lib/tournaments/storeLocal";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  id: string;
};

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
function isByeMatch(m: any) {
  if (!m) return false;
  if (isVoidByeMatch(m)) return true;
  return isByeId(m?.aPlayerId) || isByeId(m?.bPlayerId);
}
function otherIdIfBye(m: any) {
  const a = String(m?.aPlayerId || "");
  const b = String(m?.bPlayerId || "");
  if (isByeId(a) && !isByeId(b) && b && !isTbdId(b)) return b;
  if (isByeId(b) && !isByeId(a) && a && !isTbdId(a)) return a;
  return "";
}
function isRealPlayable(m: any) {
  if (!m) return false;
  if (String(m.status || "") !== "pending") return false;
  if (!m?.aPlayerId || !m?.bPlayerId) return false;
  if (isTbdId(m.aPlayerId) || isTbdId(m.bPlayerId)) return false;
  if (isByeId(m.aPlayerId) || isByeId(m.bPlayerId)) return false;
  if (isVoidByeMatch(m)) return false;
  return true;
}

function formatDate(ts?: number) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString().slice(0, 5);
  } catch {
    return "";
  }
}

function getInitials(name?: string) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] || "").toUpperCase();
  const b = (parts[1]?.[0] || parts[0]?.[1] || "").toUpperCase();
  return (a + b) || "?";
}

/* -------------------------
   ✅ Tabs single-line auto-fit
-------------------------- */
function useTabFit(tabCount: number) {
  const [w, setW] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 420
  );

  React.useEffect(() => {
    const onResize = () => setW(window.innerWidth || 420);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const tightness = Math.max(0, tabCount - 4);
  const baseFont = w < 380 ? 10.2 : w < 430 ? 10.8 : w < 520 ? 11.2 : 11.8;
  const fontSize = Math.max(9.8, baseFont - tightness * 0.45);

  const px = Math.max(6, 9 - tightness * 0.8);
  const py = Math.max(5, 7 - tightness * 0.55);

  return { fontSize, px, py };
}

function Pill({ active, label, onClick, accent = "#ffcf57", fit }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: "1 1 0px",
        minWidth: 0,
        borderRadius: 999,
        padding: `${fit?.py ?? 7}px ${fit?.px ?? 12}px`,
        border: active
          ? `1px solid ${accent}AA`
          : "1px solid rgba(255,255,255,0.12)",
        background: active
          ? `linear-gradient(180deg, ${accent}, ${accent}CC)`
          : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        color: active ? "#1b1508" : "rgba(255,255,255,0.92)",
        fontWeight: active ? 950 : 850,
        fontSize: fit?.fontSize ?? 12.2,
        cursor: "pointer",
        boxShadow: active ? `0 10px 22px ${accent}25` : "none",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      title={label}
    >
      {label}
    </button>
  );
}

function Card({ title, subtitle, badge, children, accent = "#ffcf57", icon }: any) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 14,
        marginTop: 12,
        background:
          "radial-gradient(120% 160% at 0% 0%, rgba(255,195,26,0.08), transparent 55%), linear-gradient(180deg, rgba(20,20,26,0.96), rgba(10,10,14,0.98))",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 14px 30px rgba(0,0,0,0.55)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
          {icon ? (
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: `radial-gradient(circle at 30% 0%, ${accent}, ${accent}55)`,
                color: "#150d06",
                fontWeight: 950,
                flex: "0 0 auto",
              }}
            >
              {icon}
            </div>
          ) : null}
          <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 950,
                letterSpacing: 0.3,
                color: accent,
                textShadow: `0 0 10px ${accent}40`,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </div>
            {subtitle ? (
              <div style={{ fontSize: 11.5, opacity: 0.78, lineHeight: 1.35 }}>
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
        {badge}
      </div>

      {children ? <div style={{ marginTop: 12, overflow: "hidden" }}>{children}</div> : null}
    </div>
  );
}

function MiniBadge({ label, value, accent = "#ffcf57" }: any) {
  return (
    <div
      style={{
        borderRadius: 999,
        padding: "6px 10px",
        border: `1px solid ${accent}55`,
        background: `linear-gradient(180deg, ${accent}22, rgba(255,255,255,0.04))`,
        color: "rgba(255,255,255,0.92)",
        fontWeight: 900,
        fontSize: 12,
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        whiteSpace: "nowrap",
        flex: "0 0 auto",
      }}
    >
      <span style={{ opacity: 0.75, fontWeight: 850, fontSize: 11.5 }}>{label}</span>
      <span style={{ color: accent, textShadow: `0 0 10px ${accent}30` }}>{value}</span>
    </div>
  );
}

function AvatarCircle({ name, avatarUrl, size = 30, dim }: any) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        overflow: "hidden",
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.12)",
        display: "grid",
        placeItems: "center",
        flex: "0 0 auto",
        opacity: dim ? 0.65 : 1,
      }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ fontWeight: 950, fontSize: Math.max(11, Math.floor(size * 0.4)) }}>
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}

function PlayerPill({ name, avatarUrl, dim, extra }: any) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0, opacity: dim ? 0.6 : 1 }}>
      <AvatarCircle name={name} avatarUrl={avatarUrl} size={30} dim={dim} />
      <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
        <div style={{ fontWeight: 900, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name || "Joueur"}
        </div>
        {extra ? (
          <div style={{ fontSize: 11, opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {extra}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function scoreText(m: any) {
  const a = typeof m?.scoreA === "number" ? m.scoreA : null;
  const b = typeof m?.scoreB === "number" ? m.scoreB : null;
  if (a == null && b == null) return "";
  return `${a ?? 0} - ${b ?? 0}`;
}

function matchKeyHuman(m: any) {
  const r = typeof m?.roundIndex === "number" ? m.roundIndex : null;
  if (r != null) return `R${r + 1}`;
  return "Match";
}

function koTourLabel(roundIndex: number, totalRounds: number) {
  const remaining = totalRounds - roundIndex;
  if (remaining <= 1) return "Finale";
  if (remaining === 2) return "Demi-finale";
  if (remaining === 3) return "Quart de finale";
  if (remaining === 4) return "Huitième de finale";
  return `Tour ${roundIndex + 1}`;
}

function pickFirstDefined(obj: any, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && v !== "") return v;
  }
  return null;
}

function resolveSourceMatchForTbdSide(allMatches: any[], current: any, side: "a" | "b"): any | null {
  const directKeysA = ["aFromMatchId", "fromMatchIdA", "prevMatchIdA", "sourceMatchIdA", "feederMatchIdA"];
  const directKeysB = ["bFromMatchId", "fromMatchIdB", "prevMatchIdB", "sourceMatchIdB", "feederMatchIdB"];

  const direct = pickFirstDefined(current, side === "a" ? directKeysA : directKeysB);
  if (direct) {
    const f = allMatches.find((m) => String(m?.id) === String(direct));
    if (f) return f;
  }

  const currentId = String(current?.id || "");
  if (!currentId) return null;

  const candidates = allMatches.filter((m) => {
    const next = pickFirstDefined(m, ["nextMatchId", "nextId", "winnerToMatchId", "toMatchId"]);
    if (!next) return false;
    return String(next) === currentId;
  });

  if (!candidates.length) return null;

  const bySide = candidates.find((m) => {
    const slot = pickFirstDefined(m, ["nextSlot", "toSlot", "winnerToSlot", "slot"]);
    if (!slot) return false;
    const s = String(slot).toLowerCase();
    return side === "a" ? s.includes("a") || s.includes("left") : s.includes("b") || s.includes("right");
  });

  return bySide || candidates[0] || null;
}

function WinnerPlaceholder({ label, leftAvatarUrl, leftName, rightAvatarUrl, rightName }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: -8, flex: "0 0 auto" }}>
        <div style={{ marginRight: -8, zIndex: 2 }}>
          <AvatarCircle name={leftName} avatarUrl={leftAvatarUrl} size={26} />
        </div>
        <AvatarCircle name={rightName} avatarUrl={rightAvatarUrl} size={26} />
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 950, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </div>
        <div style={{ fontSize: 11, opacity: 0.72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {leftName} vs {rightName}
        </div>
      </div>
    </div>
  );
}

function renderPlayerOrTbd(allMatches: any[], current: any, side: "a" | "b", playersById: Record<string, any>) {
  const pid = String(side === "a" ? current?.aPlayerId : current?.bPlayerId || "");
  if (!pid) return <PlayerPill name="TBD" dim />;

  if (isByeId(pid)) return <PlayerPill name="BYE" dim />;

  if (!isTbdId(pid)) {
    const pl = playersById[pid];
    return <PlayerPill name={pl?.name || "Joueur"} avatarUrl={pl?.avatar} />;
  }

  const feeder = resolveSourceMatchForTbdSide(allMatches, current, side);
  if (!feeder) return <PlayerPill name="Vainqueur du match précédent" dim extra={matchKeyHuman(current)} />;

  const fa = String(feeder?.aPlayerId || "");
  const fb = String(feeder?.bPlayerId || "");
  const pa = fa && playersById[fa] ? playersById[fa] : null;
  const pb = fb && playersById[fb] ? playersById[fb] : null;

  const leftName = pa?.name || (isByeId(fa) ? "BYE" : isTbdId(fa) ? "TBD" : "Joueur");
  const rightName = pb?.name || (isByeId(fb) ? "BYE" : isTbdId(fb) ? "TBD" : "Joueur");
  const label = `Vainqueur ${matchKeyHuman(feeder)}`;

  return (
    <WinnerPlaceholder
      label={label}
      leftName={leftName}
      leftAvatarUrl={pa?.avatar || null}
      rightName={rightName}
      rightAvatarUrl={pb?.avatar || null}
    />
  );
}

function computeStandings(groupPlayerIds: string[], groupMatches: any[]) {
  const rows: Record<
    string,
    { id: string; played: number; wins: number; losses: number; points: number; scored: number; conceded: number }
  > = {};
  for (const pid of groupPlayerIds) rows[pid] = { id: pid, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0 };

  for (const m of groupMatches) {
    if (m?.status !== "done") continue;

    const a = String(m?.aPlayerId || "");
    const b = String(m?.bPlayerId || "");
    if (!a || !b) continue;
    if (isByeId(a) || isByeId(b)) continue;
    if (isTbdId(a) || isTbdId(b)) continue;

    if (!rows[a]) rows[a] = { id: a, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0 };
    if (!rows[b]) rows[b] = { id: b, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0 };

    const sa = typeof m?.scoreA === "number" ? m.scoreA : 0;
    const sb = typeof m?.scoreB === "number" ? m.scoreB : 0;

    rows[a].played += 1;
    rows[b].played += 1;
    rows[a].scored += sa;
    rows[a].conceded += sb;
    rows[b].scored += sb;
    rows[b].conceded += sa;

    const w = String(m?.winnerId || "");
    if (w && w === a) {
      rows[a].wins += 1;
      rows[b].losses += 1;
      rows[a].points += 2;
    } else if (w && w === b) {
      rows[b].wins += 1;
      rows[a].losses += 1;
      rows[b].points += 2;
    }
  }

  const arr = Object.values(rows);
  arr.sort((r1, r2) => {
    if (r2.points !== r1.points) return r2.points - r1.points;
    const diff1 = r1.scored - r1.conceded;
    const diff2 = r2.scored - r2.conceded;
    if (diff2 !== diff1) return diff2 - diff1;
    return r2.wins - r1.wins;
  });
  return arr;
}

/* -------------------------
   ✅ STATS (global + per player)
-------------------------- */
function computeTournamentStats(playersById: Record<string, any>, matches: any[]) {
  const rows: Record<string, any> = {};
  const ids = Object.keys(playersById || {});
  for (const pid of ids) {
    rows[pid] = {
      id: pid,
      name: playersById[pid]?.name || "Joueur",
      played: 0,
      wins: 0,
      losses: 0,
      scored: 0,
      conceded: 0,
      points: 0,
    };
  }

  const done = (matches || []).filter(
    (m) => String(m?.status) === "done" && !isByeMatch(m) && !isVoidByeMatch(m)
  );

  for (const m of done) {
    const a = String(m?.aPlayerId || "");
    const b = String(m?.bPlayerId || "");
    if (!a || !b) continue;

    if (!rows[a])
      rows[a] = { id: a, name: playersById[a]?.name || "Joueur", played: 0, wins: 0, losses: 0, scored: 0, conceded: 0, points: 0 };
    if (!rows[b])
      rows[b] = { id: b, name: playersById[b]?.name || "Joueur", played: 0, wins: 0, losses: 0, scored: 0, conceded: 0, points: 0 };

    const sa = typeof m?.scoreA === "number" ? m.scoreA : 0;
    const sb = typeof m?.scoreB === "number" ? m.scoreB : 0;

    rows[a].played += 1;
    rows[b].played += 1;
    rows[a].scored += sa;
    rows[a].conceded += sb;
    rows[b].scored += sb;
    rows[b].conceded += sa;

    const w = String(m?.winnerId || "");
    if (w && w === a) {
      rows[a].wins += 1;
      rows[b].losses += 1;
      rows[a].points += 2;
    } else if (w && w === b) {
      rows[b].wins += 1;
      rows[a].losses += 1;
      rows[b].points += 2;
    }
  }

  const list = Object.values(rows).map((r: any) => {
    const diff = r.scored - r.conceded;
    const winrate = r.played ? Math.round((r.wins / r.played) * 100) : 0;
    return { ...r, diff, winrate };
  });

  list.sort((a: any, b: any) => (b.points - a.points) || (b.diff - a.diff) || (b.wins - a.wins));

  const global = {
    totalMatches: (matches || []).filter((m) => !isVoidByeMatch(m)).length,
    doneMatches: done.length,
    runningMatches: (matches || []).filter((m) => ["running", "playing"].includes(String(m?.status || ""))).length,
    playableMatches: (matches || []).filter((m) => isRealPlayable(m)).length,
    players: ids.length,
  };

  const leaders = {
    points: list[0] || null,
    wins: [...list].sort((a: any, b: any) => (b.wins - a.wins) || (b.winrate - a.winrate))[0] || null,
    diff: [...list].sort((a: any, b: any) => (b.diff - a.diff) || (b.points - a.points))[0] || null,
    scored: [...list].sort((a: any, b: any) => (b.scored - a.scored) || (b.points - a.points))[0] || null,
  };

  return { global, list, leaders };
}

export default function TournamentView({ store, go, id }: Props) {
  const [tour, setTour] = React.useState<Tournament | null>(null);
  const [matches, setMatches] = React.useState<TournamentMatch[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [resultMatch, setResultMatch] = React.useState<TournamentMatch | null>(null);

  const safeMatches: TournamentMatch[] = React.useMemo(
    () => (Array.isArray(matches) ? matches : []),
    [matches]
  );
  const visibleMatches: TournamentMatch[] = React.useMemo(
    () => safeMatches.filter((m: any) => !isVoidByeMatch(m)),
    [safeMatches]
  );

  const playersById = React.useMemo(() => {
    const out: Record<string, any> = {};
    const pls = (tour as any)?.players || [];
    for (const p of pls) {
      if (!p?.id) continue;
      out[String(p.id)] = {
        id: String(p.id),
        name: p?.name || "Joueur",
        avatar: p?.avatar || p?.avatarDataUrl || p?.avatarUrl || null,
        countryCode: p?.countryCode || null,
      };
    }
    return out;
  }, [tour]);

  React.useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const t = await getTournamentLocal(id);
        const ms = await listMatchesForTournamentLocal(id);
        if (!alive) return;
        setTour((t as any) ?? null);
        setMatches(Array.isArray(ms) ? (ms as any) : []);
      } catch (e) {
        console.error("[TournamentView] load error:", e);
        if (alive) {
          setTour(null);
          setMatches([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [id]);

  const persist = React.useCallback(async (nextTour: Tournament, nextMatches: TournamentMatch[]) => {
    const fixedMatches = Array.isArray(nextMatches) ? nextMatches : [];
    setTour(nextTour);
    setMatches(fixedMatches);
    try {
      await upsertTournamentLocal(nextTour as any);
      await upsertMatchesForTournamentLocal((nextTour as any).id, fixedMatches as any);
    } catch (e) {
      console.error("[TournamentView] persist error:", e);
    }
  }, []);

  const onStartMatch = React.useCallback(
    async (matchId: string) => {
      if (!tour) return;
      try {
        const r = startMatch({ tournament: tour as any, matches: safeMatches as any, matchId });
        await persist(r.tournament as any, r.matches as any);
        go("tournament_match_play", { tournamentId: (tour as any).id, matchId });
      } catch (e) {
        console.error("[TournamentView] startMatch error:", e);
      }
    },
    [tour, safeMatches, persist, go]
  );

  const onOpenResult = React.useCallback((m: any) => setResultMatch(m), []);

  const autoQualified = React.useMemo(() => {
    const ids: string[] = [];
    for (const m of visibleMatches as any[]) {
      if (!m) continue;
      if (!isByeMatch(m)) continue;
      if (isVoidByeMatch(m)) continue;
      const pid = otherIdIfBye(m);
      if (!pid) continue;
      ids.push(pid);
    }
    const uniq = Array.from(new Set(ids)).filter((x) => x && !isByeId(x) && !isTbdId(x));
    return uniq.map((pid) => playersById[pid]).filter(Boolean);
  }, [visibleMatches, playersById]);

  const displayMatches = React.useMemo(() => visibleMatches.filter((m: any) => !isByeMatch(m)), [visibleMatches]);

  const byPhase = React.useMemo(() => {
    const groups = displayMatches.filter((m: any) => String(m.phase || "") === "groups" || m.stageIndex === 0);
    const ko = displayMatches.filter((m: any) => String(m.phase || "") === "ko" || (m.stageIndex === 0 ? false : true));
    const rep = displayMatches.filter(
      (m: any) =>
        String(m.phase || "") === "repechage" ||
        m.stageIndex === 2 ||
        (m.stageIndex === 1 && (tour as any)?.viewKind === "double_ko")
    );
    return { groups, ko, rep };
  }, [displayMatches, tour]);

  const playableMatches = React.useMemo(() => displayMatches.filter((m: any) => isRealPlayable(m)), [displayMatches]);
  const runningMatches = React.useMemo(
    () => displayMatches.filter((m: any) => ["running", "playing"].includes(String(m?.status || ""))),
    [displayMatches]
  );
  const doneMatches = React.useMemo(() => displayMatches.filter((m: any) => String(m?.status || "") === "done"), [displayMatches]);

  const groupsMeta = React.useMemo(() => Math.max(1, Number((tour as any)?.stages?.[0]?.groups || 1)), [tour]);
  const repechageEnabled = !!(tour as any)?.repechage?.enabled || (tour as any)?.viewKind === "double_ko";
  const viewKind = String((tour as any)?.viewKind || "groups_ko");

  const TABS = React.useMemo(() => {
    if (viewKind === "single_ko") return ["home", "bracket", "matches", "stats"];
    if (viewKind === "double_ko") return ["home", "bracket", "matches", "repechage", "stats"];
    if (viewKind === "round_robin") return ["home", "standings", "matches", "stats"];
    return ["home", "pools", "standings", "bracket", "matches", ...(repechageEnabled ? ["repechage"] : []), "stats"];
  }, [viewKind, repechageEnabled]);

  const [tab, setTab] = React.useState<string>("home");
  React.useEffect(() => {
    if (!TABS.includes(tab)) setTab("home");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [TABS.join("|")]);

  const tabLabel: Record<string, string> = {
    home: "Accueil",
    bracket: "Tableau",
    matches: "Matchs",
    standings: "Classement",
    pools: "Poules",
    repechage: "Repêchage",
    stats: "Stats",
  };

  const [activeGroupIdx, setActiveGroupIdx] = React.useState(0);

  const rrMatchesByGroup = React.useMemo(() => {
    const out: any[] = Array.from({ length: groupsMeta }, () => []);
    for (const m of byPhase.groups as any[]) {
      const gi = typeof m.groupIndex === "number" ? m.groupIndex : 0;
      if (!out[gi]) out[gi] = [];
      out[gi].push(m);
    }
    for (const arr of out) arr.sort((a, b) => (a.roundIndex ?? 0) - (b.roundIndex ?? 0) || (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    return out;
  }, [byPhase.groups, groupsMeta]);

  const rrPlayersByGroup = React.useMemo(() => {
    const out: string[][] = Array.from({ length: groupsMeta }, () => []);
    for (let g = 0; g < groupsMeta; g++) {
      const set = new Set<string>();
      for (const m of rrMatchesByGroup[g] || []) {
        const a = String(m.aPlayerId || "");
        const b = String(m.bPlayerId || "");
        if (a && !isByeId(a) && !isTbdId(a)) set.add(a);
        if (b && !isByeId(b) && !isTbdId(b)) set.add(b);
      }
      out[g] = Array.from(set);
    }
    return out;
  }, [rrMatchesByGroup, groupsMeta]);

  const rrStandingsByGroup = React.useMemo(() => {
    const out: any[] = [];
    for (let g = 0; g < groupsMeta; g++) out[g] = computeStandings(rrPlayersByGroup[g] || [], rrMatchesByGroup[g] || []);
    return out;
  }, [rrPlayersByGroup, rrMatchesByGroup, groupsMeta]);

  const koRoundsCount = React.useMemo(() => {
    const ko = byPhase.ko.filter((m: any) => typeof m.roundIndex === "number");
    const max = ko.reduce((acc: number, m: any) => Math.max(acc, Number(m.roundIndex)), 0);
    return max + 1;
  }, [byPhase.ko]);

  function renderMatchCard(m: any, accent: string) {
    const status = String(m?.status || "pending");
    const playable = isRealPlayable(m);
    const running = status === "running" || status === "playing";
    const done = status === "done";
    const topTag = done ? "TERMINÉ" : running ? "EN COURS" : playable ? "À JOUER" : "ATTENTE";
    const topColor = done ? "#7fe2a9" : running ? "#4fb4ff" : playable ? "#ffcf57" : "rgba(255,255,255,0.55)";

    return (
      <div
        key={m.id}
        style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(255,255,255,0.03))",
          padding: 12,
          boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", minWidth: 0 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: 99, background: topColor, boxShadow: `0 0 14px ${topColor}55`, flex: "0 0 auto" }} />
            <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
              <div style={{ fontWeight: 950, fontSize: 12.5, color: topColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {topTag}
              </div>
              <div style={{ fontSize: 11.5, opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m?.updatedAt ? `• ${formatDate(m.updatedAt)}` : ""}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (done) onOpenResult(m);
              else if (running || playable) onStartMatch(m.id);
            }}
            disabled={!done && !running && !playable}
            style={{
              borderRadius: 999,
              padding: "8px 12px",
              border: "none",
              fontWeight: 950,
              cursor: !done && !running && !playable ? "default" : "pointer",
              background: !done && !running && !playable
                ? "linear-gradient(180deg,#3a3a3a,#232323)"
                : running
                ? "linear-gradient(180deg,#4fb4ff,#1c78d5)"
                : done
                ? "linear-gradient(180deg,#7fe2a9,#2da36a)"
                : "linear-gradient(180deg,#ffc63a,#ffaf00)",
              color: !done && !running && !playable ? "rgba(255,255,255,0.55)" : "#120c06",
              opacity: !done && !running && !playable ? 0.6 : 1,
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
          >
            {done ? "Voir" : running ? "Reprendre" : playable ? "Jouer" : "—"}
          </button>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10, width: "100%", maxWidth: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", minWidth: 0 }}>
            <div style={{ minWidth: 0, flex: "1 1 0", overflow: "hidden" }}>{renderPlayerOrTbd(safeMatches as any, m, "a", playersById)}</div>
            <div style={{ fontWeight: 950, fontSize: 13, opacity: 0.9, flex: "0 0 auto" }}>{done ? scoreText(m) : "VS"}</div>
            <div style={{ minWidth: 0, flex: "1 1 0", display: "flex", justifyContent: "flex-end", overflow: "hidden" }}>
              {renderPlayerOrTbd(safeMatches as any, m, "b", playersById)}
            </div>
          </div>

          {done && m?.winnerId ? (
            <div style={{ fontSize: 11.5, opacity: 0.78, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              ✅ Vainqueur : <b style={{ color: "#7fe2a9" }}>{playersById[String(m.winnerId)]?.name || "—"}</b>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function sectionTitleForMatches() {
    if (viewKind === "round_robin") return "Tous les rounds à jouer";
    if (viewKind === "groups_ko") return "Tous les matchs à venir (poules + phases finales)";
    return "Matchs à jouer";
  }

  const tabFit = useTabFit(TABS.length);
  const groupFit = useTabFit(groupsMeta);

  const stats = React.useMemo(() => computeTournamentStats(playersById, displayMatches), [playersById, displayMatches]);

  return (
    <div className="container" style={{ padding: 16, paddingBottom: 96, color: "#f5f5f7" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button
          type="button"
          onClick={() => go("tournaments")}
          style={{
            borderRadius: 999,
            padding: "7px 12px",
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.92)",
            fontWeight: 850,
            cursor: "pointer",
          }}
        >
          ←
        </button>

        <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
          <button
            type="button"
            onClick={async () => {
              if (!id) return;
              const ok = window.confirm("Supprimer ce tournoi et tous ses matchs ?");
              if (!ok) return;
              try {
                await deleteMatchesForTournamentLocal(id);
                await deleteTournamentLocal(id);
              } catch (e) {
                console.error("[TournamentView] delete error:", e);
              } finally {
                go("tournaments");
              }
            }}
            style={{
              borderRadius: 999,
              padding: "7px 12px",
              border: "1px solid rgba(255,80,120,0.45)",
              background: "linear-gradient(180deg, rgba(255,80,120,0.18), rgba(255,80,120,0.06))",
              color: "rgba(255,255,255,0.92)",
              fontWeight: 950,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
            title="Supprimer le tournoi"
          >
            🗑 Supprimer
          </button>

          <div style={{ textAlign: "right", minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 950, letterSpacing: 0.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {(tour as any)?.name || "Tournoi"}
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {(tour as any)?.status ? String((tour as any).status).toUpperCase() : "—"} • {playableMatches.length} à jouer
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Tabs (1 line) */}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 6,
          flexWrap: "nowrap",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          paddingBottom: 4,
          width: "100%",
          maxWidth: "100%",
        }}
        className="dc-scroll-thin"
      >
        {TABS.map((k) => (
          <Pill
            key={k}
            fit={tabFit}
            active={tab === k}
            label={tabLabel[k] || k}
            onClick={() => setTab(k)}
            accent={
              k === "home" ? "#ffcf57" :
              k === "bracket" ? "#4fb4ff" :
              k === "matches" ? "#ff4fd8" :
              k === "standings" ? "#7fe2a9" :
              k === "pools" ? "#7fe2a9" :
              k === "repechage" ? "#ff8f2b" :
              "#b6b6ff"
            }
          />
        ))}
      </div>

      {loading ? (
        <Card title="Chargement…" subtitle="Récupération du tournoi et des matchs." accent="#ffcf57" />
      ) : !tour ? (
        <Card title="Introuvable" subtitle="Ce tournoi n'existe pas (ou a été supprimé)." accent="#ff4fd8" />
      ) : (
        <>
          {/* HOME */}
          {tab === "home" ? (
            <>
              {autoQualified.length ? (
                <Card
                  title="Qualifiés d’office"
                  subtitle="Exempt (BYE) — ces joueurs passent automatiquement."
                  accent="#7fe2a9"
                  icon="★"
                  badge={<MiniBadge label="Qualifiés" value={autoQualified.length} accent="#7fe2a9" />}
                >
                  <div style={{ display: "grid", gap: 10 }}>
                    {autoQualified.map((p: any) => (
                      <div
                        key={String(p.id)}
                        style={{
                          borderRadius: 16,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "linear-gradient(180deg, rgba(0,0,0,0.28), rgba(255,255,255,0.03))",
                          padding: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                          width: "100%",
                          maxWidth: "100%",
                          overflow: "hidden",
                        }}
                      >
                        <PlayerPill name={p?.name || "Joueur"} avatarUrl={p?.avatar || null} />
                        <div style={{ fontWeight: 950, color: "#7fe2a9", opacity: 0.95, whiteSpace: "nowrap" }}>✅ Qualifié</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}

              <Card
                title="À jouer"
                subtitle={playableMatches.length ? "Les prochains matchs jouables." : "Aucun match jouable pour le moment."}
                accent="#ffcf57"
                icon="⚡"
                badge={<MiniBadge label="À jouer" value={playableMatches.length} accent="#ffcf57" />}
              >
                {playableMatches.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {playableMatches.slice(0, 6).map((m: any) => (
                      <div
                        key={m.id}
                        style={{
                          borderRadius: 16,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(255,255,255,0.03))",
                          padding: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "center",
                          width: "100%",
                          maxWidth: "100%",
                          overflow: "hidden",
                        }}
                      >
                        <div style={{ display: "grid", gap: 8, minWidth: 0, flex: "1 1 0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, minWidth: 0 }}>
                            <div style={{ minWidth: 0, flex: "1 1 0", overflow: "hidden" }}>
                              {renderPlayerOrTbd(safeMatches as any, m, "a", playersById)}
                            </div>
                            <div style={{ fontWeight: 950, opacity: 0.8, flex: "0 0 auto" }}>VS</div>
                            <div style={{ minWidth: 0, flex: "1 1 0", display: "flex", justifyContent: "flex-end", overflow: "hidden" }}>
                              {renderPlayerOrTbd(safeMatches as any, m, "b", playersById)}
                            </div>
                          </div>
                          <div style={{ fontSize: 11.5, opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {viewKind.includes("ko") || viewKind === "groups_ko"
                              ? koTourLabel(m.roundIndex ?? 0, koRoundsCount)
                              : `ROUND ${(m.roundIndex ?? 0) + 1}`}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onStartMatch(m.id)}
                          style={{
                            borderRadius: 999,
                            padding: "8px 12px",
                            border: "none",
                            fontWeight: 950,
                            cursor: "pointer",
                            background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
                            color: "#120c06",
                            whiteSpace: "nowrap",
                            flex: "0 0 auto",
                          }}
                        >
                          Jouer
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>

              <Card
                title="Derniers matchs terminés"
                subtitle={doneMatches.length ? "Résultats récents." : "Aucun match terminé."}
                accent="#7fe2a9"
                icon="✓"
                badge={<MiniBadge label="Terminés" value={doneMatches.length} accent="#7fe2a9" />}
              >
                {doneMatches.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {doneMatches
                      .slice()
                      .sort((a: any, b: any) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
                      .slice(0, 4)
                      .map((m: any) => renderMatchCard(m, "#7fe2a9"))}
                  </div>
                ) : null}
              </Card>
            </>
          ) : null}

          {/* POOLS */}
          {tab === "pools" ? (
            <Card title="Poules" subtitle="Sous-onglets par poule + rounds." accent="#7fe2a9" icon="▦">
              <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }} className="dc-scroll-thin">
                {Array.from({ length: groupsMeta }, (_, i) => (
                  <Pill
                    key={i}
                    fit={groupFit}
                    active={activeGroupIdx === i}
                    label={`Poule ${String.fromCharCode(65 + i)}`}
                    onClick={() => setActiveGroupIdx(i)}
                    accent="#7fe2a9"
                  />
                ))}
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                {(() => {
                  const arr = rrMatchesByGroup[activeGroupIdx] || [];
                  const byRound: Record<number, any[]> = {};
                  for (const m of arr) {
                    const r = Number(m.roundIndex ?? 0);
                    if (!byRound[r]) byRound[r] = [];
                    byRound[r].push(m);
                  }
                  const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);
                  return rounds.map((r) => (
                    <div key={r} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", padding: 12, overflow: "hidden" }}>
                      <div style={{ fontWeight: 950, color: "#7fe2a9", marginBottom: 10 }}>ROUND {r + 1}</div>
                      <div style={{ display: "grid", gap: 10 }}>
                        {byRound[r].filter((m) => !isByeMatch(m)).map((m: any) => renderMatchCard(m, "#7fe2a9"))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </Card>
          ) : null}

          {/* STANDINGS */}
          {tab === "standings" ? (
            <Card
              title="Classement"
              subtitle={viewKind === "round_robin" ? "Classement du championnat." : "Classement par poule."}
              accent="#7fe2a9"
              icon="🏁"
            >
              {viewKind === "round_robin" ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {computeStandings(Object.keys(playersById), byPhase.groups).map((r: any, idx: number) => {
                    const pl = playersById[String(r.id)];
                    const diff = r.scored - r.conceded;
                    return (
                      <div
                        key={r.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "28px 1fr auto",
                          gap: 10,
                          alignItems: "center",
                          padding: "10px 12px",
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "rgba(0,0,0,0.25)",
                          width: "100%",
                          maxWidth: "100%",
                          overflow: "hidden",
                        }}
                      >
                        <div style={{ fontWeight: 950, color: idx === 0 ? "#ffcf57" : "rgba(255,255,255,0.75)" }}>{idx + 1}</div>
                        <PlayerPill name={pl?.name || "Joueur"} avatarUrl={pl?.avatar} />
                        <div style={{ textAlign: "right", fontSize: 11.5, opacity: 0.9, whiteSpace: "nowrap" }}>
                          <b style={{ color: "#7fe2a9" }}>{r.points}</b> pts • {r.wins}-{r.losses} • Δ {diff}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }} className="dc-scroll-thin">
                    {Array.from({ length: groupsMeta }, (_, i) => (
                      <Pill
                        key={i}
                        fit={groupFit}
                        active={activeGroupIdx === i}
                        label={`Poule ${String.fromCharCode(65 + i)}`}
                        onClick={() => setActiveGroupIdx(i)}
                        accent="#7fe2a9"
                      />
                    ))}
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {(rrStandingsByGroup[activeGroupIdx] || []).map((r: any, idx: number) => {
                      const pl = playersById[String(r.id)];
                      const diff = r.scored - r.conceded;
                      return (
                        <div
                          key={r.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "28px 1fr auto",
                            gap: 10,
                            alignItems: "center",
                            padding: "10px 12px",
                            borderRadius: 14,
                            border: "1px solid rgba(255,255,255,0.10)",
                            background: "rgba(0,0,0,0.25)",
                            width: "100%",
                            maxWidth: "100%",
                            overflow: "hidden",
                          }}
                        >
                          <div style={{ fontWeight: 950, color: idx === 0 ? "#ffcf57" : "rgba(255,255,255,0.75)" }}>{idx + 1}</div>
                          <PlayerPill name={pl?.name || "Joueur"} avatarUrl={pl?.avatar} />
                          <div style={{ textAlign: "right", fontSize: 11.5, opacity: 0.9, whiteSpace: "nowrap" }}>
                            <b style={{ color: "#7fe2a9" }}>{r.points}</b> pts • {r.wins}-{r.losses} • Δ {diff}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          ) : null}

          {/* BRACKET */}
          {tab === "bracket" ? (
            <Card
              title="Tableau"
              subtitle={viewKind === "round_robin" ? "Le classement est dans l’onglet Classement." : "Bracket des phases finales (sans matchs vs BYE)."}
              accent="#4fb4ff"
              icon="⟂"
            >
              {viewKind === "round_robin" ? (
                <div style={{ fontSize: 12, opacity: 0.78 }}>Pas de bracket en championnat.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {(() => {
                    const koMatches = (byPhase.ko || [])
                      .filter((m: any) => !m?.groupId)
                      .filter((m: any) => !isVoidByeMatch(m))
                      .filter((m: any) => !isByeMatch(m))
                      .slice();

                    if (!koMatches.length) return <div style={{ fontSize: 12, opacity: 0.78 }}>Aucun match KO à afficher.</div>;

                    const rounds = Array.from(new Set(koMatches.map((m: any) => Number(m.roundIndex ?? 0)))).sort((a, b) => a - b);
                    const byRound: Record<number, any[]> = {};
                    for (const r of rounds) byRound[r] = [];
                    for (const m of koMatches) {
                      const r = Number(m.roundIndex ?? 0);
                      if (!byRound[r]) byRound[r] = [];
                      byRound[r].push(m);
                    }
                    for (const r of Object.keys(byRound)) byRound[Number(r)].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

                    return (
                      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch" }}>
                        {rounds.map((r) => (
                          <div
                            key={r}
                            style={{
                              width: 280,
                              flex: "0 0 auto",
                              borderRadius: 16,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: "rgba(255,255,255,0.03)",
                              padding: 10,
                              overflow: "hidden",
                            }}
                          >
                            <div style={{ fontWeight: 950, fontSize: 12, color: "#4fb4ff", textShadow: "0 0 10px rgba(79,180,255,0.35)", marginBottom: 8 }}>
                              {koTourLabel(r, rounds.length)}
                            </div>

                            <div style={{ display: "grid", gap: 10 }}>
                              {byRound[r]?.map((m: any) => (
                                <div
                                  key={m.id}
                                  style={{
                                    borderRadius: 14,
                                    border: "1px solid rgba(255,255,255,0.10)",
                                    background: "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(255,255,255,0.03))",
                                    padding: 10,
                                    overflow: "hidden",
                                  }}
                                >
                                  <div style={{ display: "grid", gap: 8 }}>
                                    <div style={{ minWidth: 0 }}>{renderPlayerOrTbd(safeMatches as any, m, "a", playersById)}</div>
                                    <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
                                    <div style={{ minWidth: 0 }}>{renderPlayerOrTbd(safeMatches as any, m, "b", playersById)}</div>
                                  </div>

                                  <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                                    <div style={{ fontWeight: 950, color: String(m.status) === "done" ? "#7fe2a9" : isRealPlayable(m) ? "#ffcf57" : "#4fb4ff", whiteSpace: "nowrap" }}>
                                      {String(m.status) === "done"
                                        ? scoreText(m)
                                        : String(m.status) === "playing"
                                        ? "EN COURS"
                                        : isRealPlayable(m)
                                        ? "À JOUER"
                                        : "ATTENTE"}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (String(m.status) === "done") onOpenResult(m);
                                        else if (String(m.status) === "playing" || isRealPlayable(m)) onStartMatch(m.id);
                                      }}
                                      disabled={!(String(m.status) === "done" || String(m.status) === "playing" || isRealPlayable(m))}
                                      style={{
                                        borderRadius: 999,
                                        padding: "7px 10px",
                                        border: "none",
                                        fontWeight: 950,
                                        cursor: !(String(m.status) === "done" || String(m.status) === "playing" || isRealPlayable(m)) ? "default" : "pointer",
                                        background: !(String(m.status) === "done" || String(m.status) === "playing" || isRealPlayable(m))
                                          ? "linear-gradient(180deg,#3a3a3a,#232323)"
                                          : String(m.status) === "playing"
                                          ? "linear-gradient(180deg,#4fb4ff,#1c78d5)"
                                          : String(m.status) === "done"
                                          ? "linear-gradient(180deg,#7fe2a9,#2da36a)"
                                          : "linear-gradient(180deg,#ffc63a,#ffaf00)",
                                        color: !(String(m.status) === "done" || String(m.status) === "playing" || isRealPlayable(m)) ? "rgba(255,255,255,0.55)" : "#120c06",
                                        opacity: !(String(m.status) === "done" || String(m.status) === "playing" || isRealPlayable(m)) ? 0.6 : 1,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {String(m.status) === "done" ? "Voir" : String(m.status) === "playing" ? "Reprendre" : isRealPlayable(m) ? "Jouer" : "—"}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </Card>
          ) : null}

          {/* MATCHES */}
          {tab === "matches" ? (
            <Card title="Matchs" subtitle={sectionTitleForMatches()} accent="#ff4fd8" icon="≡">
              {(() => {
                let arr: any[] = [];
                if (viewKind === "round_robin") arr = byPhase.groups.slice();
                else if (viewKind === "groups_ko") arr = displayMatches.slice();
                else arr = byPhase.ko.slice();

                arr = arr.filter((m) => !isByeMatch(m)).filter((m) => !isVoidByeMatch(m));
                if (!arr.length) return <div style={{ fontSize: 12, opacity: 0.78 }}>Aucun match à afficher.</div>;

                const blocks: Array<{ key: string; title: string; items: any[] }> = [];
                const byRound: Record<string, any[]> = {};

                for (const m of arr) {
                  const isRR = m.stageIndex === 0 && (viewKind === "round_robin" || viewKind === "groups_ko");
                  const k = isRR ? `RR_${m.roundIndex ?? 0}` : `KO_${m.roundIndex ?? 0}`;
                  if (!byRound[k]) byRound[k] = [];
                  byRound[k].push(m);
                }

                const keys = Object.keys(byRound).sort((a, b) => {
                  const [ka, ra] = a.split("_");
                  const [kb, rb] = b.split("_");
                  if (ka !== kb) return ka.localeCompare(kb);
                  return Number(ra) - Number(rb);
                });

                for (const k of keys) {
                  const [type, rStr] = k.split("_");
                  const r = Number(rStr || 0);
                  const title = type === "RR" ? `ROUND ${r + 1}` : koTourLabel(r, koRoundsCount);
                  blocks.push({ key: k, title, items: byRound[k].slice().sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)) });
                }

                return (
                  <div style={{ display: "grid", gap: 12 }}>
                    {blocks.map((b) => (
                      <div key={b.key} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", padding: 12, overflow: "hidden" }}>
                        <div style={{ fontWeight: 950, color: "#ff4fd8", marginBottom: 10 }}>{b.title}</div>
                        <div style={{ display: "grid", gap: 10 }}>{b.items.map((m) => renderMatchCard(m, "#ff4fd8"))}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </Card>
          ) : null}

          {/* REPECHAGE */}
          {tab === "repechage" ? (
            <Card title="Repêchage" subtitle="Matchs de repêchage (Losers / ou stage dédié)." accent="#ff8f2b" icon="↻">
              {(() => {
                const rep = byPhase.rep
                  .filter((m: any) => !isByeMatch(m))
                  .filter((m: any) => !isVoidByeMatch(m))
                  .slice()
                  .sort((a: any, b: any) => (a.roundIndex ?? 0) - (b.roundIndex ?? 0) || (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

                if (!rep.length) return <div style={{ fontSize: 12, opacity: 0.78 }}>Aucun match de repêchage.</div>;

                return <div style={{ display: "grid", gap: 10 }}>{rep.map((m) => renderMatchCard(m, "#ff8f2b"))}</div>;
              })()}
            </Card>
          ) : null}

          {/* ✅ STATS */}
          {tab === "stats" ? (
            <Card title="Statistiques" subtitle="Classement stats (points, winrate, diff, scored)." accent="#b6b6ff" icon="📊">
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <MiniBadge label="Matchs" value={stats.global.totalMatches} accent="#b6b6ff" />
                  <MiniBadge label="Terminés" value={stats.global.doneMatches} accent="#7fe2a9" />
                  <MiniBadge label="En cours" value={stats.global.runningMatches} accent="#4fb4ff" />
                  <MiniBadge label="À jouer" value={stats.global.playableMatches} accent="#ffcf57" />
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  {stats.list.map((r: any, idx: number) => (
                    <div
                      key={r.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "28px 1fr auto",
                        gap: 10,
                        alignItems: "center",
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(0,0,0,0.25)",
                        width: "100%",
                        maxWidth: "100%",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ fontWeight: 950, color: idx === 0 ? "#ffcf57" : "rgba(255,255,255,0.75)" }}>{idx + 1}</div>
                      <PlayerPill name={r.name} avatarUrl={playersById[String(r.id)]?.avatar} />
                      <div style={{ textAlign: "right", fontSize: 11.5, opacity: 0.9, whiteSpace: "nowrap" }}>
                        <b style={{ color: "#b6b6ff" }}>{r.points}</b> pts • {r.wins}-{r.losses} • <b style={{ color: "#7fe2a9" }}>{r.winrate}%</b> • Δ {r.diff}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.82, lineHeight: 1.45 }}>
                  🏆 Leader points : <b style={{ color: "#ffcf57" }}>{stats.leaders.points?.name || "—"}</b>
                  <br />
                  ⚔️ Plus de victoires : <b style={{ color: "#7fe2a9" }}>{stats.leaders.wins?.name || "—"}</b>
                  <br />
                  📈 Meilleure diff : <b style={{ color: "#4fb4ff" }}>{stats.leaders.diff?.name || "—"}</b>
                  <br />
                  💥 Plus de points marqués : <b style={{ color: "#ff4fd8" }}>{stats.leaders.scored?.name || "—"}</b>
                </div>
              </div>
            </Card>
          ) : null}
        </>
      )}

      {/* Modal résultat */}
      {resultMatch ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.62)",
            display: "grid",
            placeItems: "end center",
            padding: 12,
          }}
          onMouseDown={() => setResultMatch(null)}
        >
          <div
            style={{
              width: "min(520px, 96vw)",
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "linear-gradient(180deg, rgba(24,24,30,0.98), rgba(10,10,14,0.995))",
              boxShadow: "0 22px 80px rgba(0,0,0,0.7)",
              overflow: "hidden",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ fontWeight: 950, fontSize: 14, color: "#ffcf57" }}>Résultat</div>
              <button
                type="button"
                onClick={() => setResultMatch(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 20,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
                aria-label="Fermer"
                title="Fermer"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>Choisis le vainqueur pour enregistrer le résultat.</div>

              <div style={{ display: "grid", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!tour) return;
                    const r = submitResult({
                      tournament: tour as any,
                      matches: safeMatches as any,
                      matchId: (resultMatch as any).id,
                      winnerId: String((resultMatch as any).aPlayerId),
                      historyMatchId: null,
                    });
                    persist(r.tournament as any, r.matches as any);
                    setResultMatch(null);
                  }}
                  style={{
                    borderRadius: 16,
                    padding: "12px 12px",
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "linear-gradient(180deg, rgba(255,207,87,0.18), rgba(255,207,87,0.08))",
                    color: "rgba(255,255,255,0.92)",
                    fontWeight: 950,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  ✅ {playersById[String((resultMatch as any).aPlayerId)]?.name || "Joueur A"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!tour) return;
                    const r = submitResult({
                      tournament: tour as any,
                      matches: safeMatches as any,
                      matchId: (resultMatch as any).id,
                      winnerId: String((resultMatch as any).bPlayerId),
                      historyMatchId: null,
                    });
                    persist(r.tournament as any, r.matches as any);
                    setResultMatch(null);
                  }}
                  style={{
                    borderRadius: 16,
                    padding: "12px 12px",
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "linear-gradient(180deg, rgba(79,180,255,0.18), rgba(79,180,255,0.08))",
                    color: "rgba(255,255,255,0.92)",
                    fontWeight: 950,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  ✅ {playersById[String((resultMatch as any).bPlayerId)]?.name || "Joueur B"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
