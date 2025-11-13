// ============================================
// src/pages/StatsHub.tsx — Stats + Historique (safe)
// Sélecteur de joueurs AU-DESSUS du dashboard dans un bloc dépliant
// + Fix avatars : normalisation rec.players / rec.payload.players
// ============================================
import React from "react";
import { History } from "../lib/history";
import { loadStore } from "../lib/storage";
import StatsPlayerDashboard, {
  type PlayerDashboardStats,
  GoldPill,
  ProfilePill,
} from "../components/StatsPlayerDashboard";
import { useQuickStats } from "../hooks/useQuickStats";
import HistoryPage from "./HistoryPage";

/* ---------- Thème local ---------- */
const T = {
  gold: "#F6C256",
  text: "#FFFFFF",
  text70: "rgba(255,255,255,.70)",
  edge: "rgba(255,255,255,.10)",
  card: "linear-gradient(180deg,rgba(17,18,20,.94),rgba(13,14,17,.92))",
};

/* ---------- Types ---------- */
type PlayerLite = { id: string; name?: string; avatarDataUrl?: string | null };
type SavedMatch = {
  id: string;
  kind?: "x01" | "cricket" | string;
  status?: "in_progress" | "finished";
  players?: PlayerLite[];
  winnerId?: string | null;
  createdAt?: number;
  updatedAt?: number;
  summary?: any;
  payload?: any;
};

type Props = {
  go?: (tab: string, params?: any) => void;
  tab?: "history" | "stats";
  memHistory?: SavedMatch[];
};

/* ---------- Helpers ---------- */
const toArr = <T,>(v: any): T[] => (Array.isArray(v) ? (v as T[]) : []);
const toObj = <T,>(v: any): T => (v && typeof v === "object" ? (v as T) : ({} as T));
const N = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
const fmtDate = (ts?: number) => new Date(N(ts, Date.now())).toLocaleString();

/** Normalise les joueurs d’un record :
 * - prend rec.players sinon rec.payload.players
 * - injecte avatarDataUrl/name depuis le store si manquant
 * - reflète aussi dans rec.payload.players pour les composants qui le lisent
 */
function normalizeRecordPlayers(rec: SavedMatch, storeProfiles: PlayerLite[]): SavedMatch {
  const pick = (Array.isArray(rec.players) && rec.players!.length
    ? rec.players!
    : toArr<PlayerLite>(rec.payload?.players)) as PlayerLite[];

  const withAvatars = pick.map((p) => {
    const prof = storeProfiles.find((sp) => sp.id === p?.id);
    return {
      id: p?.id,
      name: p?.name ?? prof?.name ?? "",
      avatarDataUrl: p?.avatarDataUrl ?? prof?.avatarDataUrl ?? null,
    } as PlayerLite;
  });

  // retourne un nouvel objet pour ne rien muter
  return {
    ...rec,
    players: withAvatars,
    payload: { ...(rec.payload ?? {}), players: withAvatars },
  };
}

/* ---------- Hooks ---------- */
function useHistoryAPI(): SavedMatch[] {
  const [rows, setRows] = React.useState<SavedMatch[]>([]);
  React.useEffect(() => {
    (async () => {
      try {
        const list = await History.list();
        setRows(toArr<SavedMatch>(list));
      } catch {
        setRows([]);
      }
    })();

    const onUpd = () => {
      (async () => {
        try {
          const list = await History.list();
          setRows(toArr<SavedMatch>(list));
        } catch {
          setRows([]);
        }
      })();
    };
    window.addEventListener("dc-history-updated", onUpd);
    return () => window.removeEventListener("dc-history-updated", onUpd);
  }, []);
  return rows;
}

function useStoreHistory(): SavedMatch[] {
  const [rows, setRows] = React.useState<SavedMatch[]>([]);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const store: any = await loadStore<any>();
        if (!mounted) return;
        setRows(toArr<SavedMatch>(store?.history));
      } catch {
        setRows([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  return rows;
}

/* ---------- Adaptateur -> PlayerDashboardStats (fusion QUICK + fallback Historique) ---------- */
function buildDashboardForPlayer(
  player: PlayerLite,
  records: SavedMatch[],
  quick?: {
    avg3: number;
    bestVisit: number;
    bestCheckout?: number;
    winRatePct: number;
    buckets: Record<string, number>;
  } | null
): PlayerDashboardStats {
  const pid = player.id;
  const pname = player.name || "Joueur";

  // ==== Fallback: calcule depuis l'historique si quick vide ====
  let fbAvg3 = 0, fbBestVisit = 0, fbBestCO = 0, fbWins = 0, fbMatches = 0;
  const fbBuckets = { "0-59": 0, "60-99": 0, "100+": 0, "140+": 0, "180": 0 };
  const evo: Array<{ date: string; avg3: number }> = [];

  const toArr = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);
  const N = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);

  const byDate: { t: number; a3: number }[] = [];

  for (const r of records) {
    // Matchs où le joueur a participé
    const inMatch = toArr<PlayerLite>(r.players).some((p) => p?.id === pid);
    if (!inMatch) continue;

    fbMatches++;

    const ss: any = r.summary ?? r.payload?.summary ?? {};
    const per: any[] =
      ss.perPlayer ??
      ss.players ??
      r.payload?.summary?.perPlayer ??
      [];

    const pstat =
      per.find((x) => x?.playerId === pid) ??
      (ss[pid] || ss.players?.[pid] || ss.perPlayer?.[pid]) ??
      {};

    const a3 =
      N(pstat.avg3) ||
      N(pstat.avg_3) ||
      N(pstat.avg3Darts) ||
      N(pstat.average3);

    const bestV = N(pstat.bestVisit);
    const bestCO = N(pstat.bestCheckout);

    if (a3 > 0) {
      byDate.push({ t: N(r.updatedAt ?? r.createdAt, Date.now()), a3 });
    }

    fbAvg3 += a3;
    fbBestVisit = Math.max(fbBestVisit, bestV);
    fbBestCO = Math.max(fbBestCO, bestCO);

    if (r.winnerId && r.winnerId === pid) fbWins++;

    // Buckets
    const buckets = ss.buckets?.[pid] ?? pstat.buckets ?? null;

    if (buckets) {
      fbBuckets["0-59"] += N(buckets["0-59"]);
      fbBuckets["60-99"] += N(buckets["60-99"]);
      fbBuckets["100+"] += N(buckets["100+"]);
      fbBuckets["140+"] += N(buckets["140+"]);
      fbBuckets["180"] += N(buckets["180"]);
    } else if (Array.isArray(r.payload?.legs)) {
      for (const leg of r.payload.legs as any[]) {
        const pp = toArr<any>(leg.perPlayer).find((x) => x.playerId === pid);
        const v = N(pp?.bestVisit);
        if (v >= 180) fbBuckets["180"]++;
        else if (v >= 140) fbBuckets["140+"]++;
        else if (v >= 100) fbBuckets["100+"]++;
        else if (v >= 60) fbBuckets["60-99"]++;
        else if (v > 0) fbBuckets["0-59"]++;
      }
    }
  }

  byDate.sort((a, b) => a.t - b.t);
  for (const it of byDate.slice(-20)) {
    evo.push({ date: new Date(it.t).toLocaleDateString(), avg3: it.a3 });
  }

  const fbAvg3Mean = fbMatches > 0 ? +(fbAvg3 / fbMatches).toFixed(2) : 0;
  const fbWinPct = fbMatches > 0 ? Math.round((fbWins / fbMatches) * 1000) / 10 : 0;

  const avg3Overall = quick?.avg3 ?? fbAvg3Mean;
  const bestVisit = quick?.bestVisit ?? fbBestVisit;
  const bestCheckout = quick?.bestCheckout ?? (fbBestCO || undefined);
  const winRatePct = Number.isFinite(quick?.winRatePct as any) ? quick!.winRatePct : fbWinPct;
  const distribution = quick?.buckets
    ? {
        "0-59": N(quick.buckets["0-59"]),
        "60-99": N(quick.buckets["60-99"]),
        "100+": N(quick.buckets["100+"]),
        "140+": N(quick.buckets["140+"]),
        "180": N(quick.buckets["180"]),
      }
    : fbBuckets;

  const evolution = evo.length ? evo : [{ date: new Date().toLocaleDateString(), avg3: avg3Overall }];

  return {
    playerId: pid,
    playerName: pname,
    avg3Overall,
    bestVisit,
    winRatePct,
    bestCheckout,
    evolution,
    distribution,
  };
}

/* ---------- Styles cartes/verre ---------- */
const card: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.edge}`,
  borderRadius: 20,
  padding: 16,
  boxShadow: "0 10px 26px rgba(0,0,0,.35)",
  backdropFilter: "blur(10px)",
};
const row: React.CSSProperties = {
  ...card,
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: 8,
};

/* ---------- Page ---------- */
export default function StatsHub(props: Props) {
  const go = props.go ?? (() => {});
  const initialTab: "history" | "stats" = props.tab === "stats" ? "stats" : "history";
  const [tab, setTab] = React.useState<"history" | "stats">(initialTab);

  // 0) Récupère les profils (pour enrichir avatars si manquants)
  const [storeProfiles, setStoreProfiles] = React.useState<PlayerLite[]>([]);
  React.useEffect(() => {
    (async () => {
      try {
        const s: any = await loadStore<any>();
        setStoreProfiles(toArr<PlayerLite>(s?.profiles));
      } catch {
        setStoreProfiles([]);
      }
    })();
  }, []);

  // 1) Sources d'historique
  const persisted = useHistoryAPI();
  const mem = toArr<SavedMatch>(props.memHistory);
  const fromStore = useStoreHistory();

  // 2) Fusion & déduplication (par id, conserve la version la plus récente)
  const records = React.useMemo(() => {
    const byId = new Map<string, SavedMatch>();
    const push = (r: any) => {
      const rec = toObj<SavedMatch>(r);
      if (!rec.id) return;
      const prev = byId.get(rec.id);
      const curT = N(rec.updatedAt ?? rec.createdAt, 0);
      const prevT = N(prev?.updatedAt ?? prev?.createdAt, -1);
      if (!prev || curT > prevT) byId.set(rec.id, rec);
    };
    persisted.forEach(push);
    mem.forEach(push);
    fromStore.forEach(push);

    // 2bis) Normalise les joueurs + avatars pour TOUS les records
    return Array.from(byId.values())
      .map((r) => normalizeRecordPlayers(r, storeProfiles))
      .sort((a, b) => N(b.updatedAt ?? b.createdAt, 0) - N(a.updatedAt ?? a.createdAt, 0));
  }, [persisted, mem, fromStore, storeProfiles]);

  // 3) Liste des joueurs rencontrés dans l'historique
  const players = React.useMemo<PlayerLite[]>(() => {
    const map = new Map<string, PlayerLite>();
    for (const r of records)
      for (const p of toArr<PlayerLite>(r.players)) {
        if (!p?.id) continue;
        if (!map.has(p.id))
          map.set(p.id, {
            id: p.id,
            name: p.name ?? `Joueur ${map.size + 1}`,
            avatarDataUrl: p.avatarDataUrl ?? null,
          });
      }
    return Array.from(map.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }, [records]);

  // 4) Sélection du joueur + quick stats
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string | null>(
    players[0]?.id ?? null
  );
  React.useEffect(() => {
    if (!selectedPlayerId && players[0]?.id) setSelectedPlayerId(players[0].id);
  }, [players, selectedPlayerId]);
  const selectedPlayer =
    players.find((p) => p.id === selectedPlayerId) || players[0];

  const quick = useQuickStats(selectedPlayer?.id || null);

  // 5) Bloc dépliant (sélecteur joueurs)
  const [openPlayers, setOpenPlayers] = React.useState(true);

  return (
    <div className="container" style={{ padding: 12, maxWidth: 1100, color: T.text }}>
      {/* Onglets */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <GoldPill active={tab === "history"} onClick={() => setTab("history")}>
          Historique
        </GoldPill>
        <GoldPill active={tab === "stats"} onClick={() => setTab("stats")}>
          Stats
        </GoldPill>
      </div>

      {tab === "history" ? (
        // Page Historique (records déjà normalisés avec avatars)
        <HistoryPage store={{ history: records } as any} go={go} />
      ) : (
        <>
          {/* ===== Bloc dépliant Joueurs (au-dessus du dashboard) ===== */}
          <div style={{ ...card, marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontWeight: 800 }}>Joueurs ({players.length})</div>
              <GoldPill active={openPlayers} onClick={() => setOpenPlayers((o) => !o)}>
                {openPlayers ? "Replier" : "Déplier"}
              </GoldPill>
            </div>

            {openPlayers && (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {players.length ? (
                  players.map((p) => (
                    <ProfilePill
                      key={p.id}
                      name={p.name || "Joueur"}
                      avatarDataUrl={p.avatarDataUrl || undefined}
                      active={p.id === selectedPlayer?.id}
                      onClick={() => setSelectedPlayerId(p.id)}
                    />
                  ))
                ) : (
                  <div style={{ color: T.text70, fontSize: 13 }}>Aucun joueur détecté.</div>
                )}
              </div>
            )}
          </div>

          {/* ===== Dashboard joueur ===== */}
          {selectedPlayer ? (
            <StatsPlayerDashboard
              data={buildDashboardForPlayer(selectedPlayer, records, quick || null)}
            />
          ) : (
            <div style={card}>Sélectionne un joueur pour afficher ses stats.</div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- Historique (ancien composant) ----------
   Conservé ci-dessous mais plus utilisé. Tu peux le supprimer plus tard si tu veux.
*/
function HistoryList({
  records,
  onOpen,
}: {
  records: SavedMatch[];
  onOpen: (r: SavedMatch) => void;
}) {
  if (!records.length) {
    return (
      <div style={card}>
        <div style={{ color: T.text70 }}>Aucun enregistrement pour l’instant.</div>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {records.map((rec) => {
        const players = toArr<PlayerLite>(rec.players);
        const status = rec.status ?? "finished";
        const winnerId = rec.winnerId ?? null;
        const first = players[0]?.name || "—";
        const sub = players.length > 1 ? `${first} + ${players.length - 1} autre(s)` : first;
        return (
          <div key={rec.id} style={row}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: T.gold }}>
                {rec.kind?.toUpperCase?.() ?? "MATCH"} ·{" "}
                {status === "in_progress" ? "En cours" : "Terminé"}
              </div>
              <div
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: T.text70,
                }}
              >
                {sub}
              </div>
              <div style={{ color: T.text70 }}>{fmtDate(rec.updatedAt ?? rec.createdAt)}</div>
              {winnerId && (
                <div style={{ marginTop: 4 }}>
                  Vainqueur : <b>{players.find((p) => p.id === winnerId)?.name ?? "—"}</b>
                </div>
              )}
            </div>
            <div>
              <GoldPill onClick={() => onOpen(rec)}>Voir</GoldPill>
            </div>
          </div>
        );
      })}
    </div>
  );
}
