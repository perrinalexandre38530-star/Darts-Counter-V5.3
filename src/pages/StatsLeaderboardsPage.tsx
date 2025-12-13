// @ts-nocheck
// =============================================================
// src/pages/StatsLeaderboardsPage.tsx
// Page CLASSEMENTS globale (tous profils)
// - Agrège store.history + IDB History
// - Robust: supporte multiples formats de summary (V1/V2/V3)
// - Avatars: récup depuis profiles OU history.players OU summary
// - + BotsMap: récup avatars/noms depuis localStorage dc_bots_v1
// - Metrics: wins / matches / winRate / avg3 / bestVisit / bestCheckout
// - ✅ NEW (KILLER Option A): kills / favNumber / favSegment / favHits
// - Filtre période D/W/M/Y/ALL/TOUT
// =============================================================

import * as React from "react";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ProfileAvatar from "../components/ProfileAvatar";
import { History } from "../lib/history";
import { computeKillerAgg } from "../lib/statsKillerAgg";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

type Scope = "local" | "online";

type LeaderboardMode =
  | "x01_multi"
  | "cricket"
  | "killer"
  | "shanghai"
  | "battle_royale"
  | "clock";

type PeriodKey = "D" | "W" | "M" | "Y" | "ALL" | "TOUT";

type MetricKey =
  | "wins"
  | "winRate"
  | "matches"
  | "avg3"
  | "bestVisit"
  | "bestCheckout"
  // ✅ NEW (killer option A)
  | "kills"
  | "favNumberHits"
  | "favSegmentHits"
  | "totalHits";

type Row = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;

  wins: number;
  losses: number;
  matches: number;
  winRate: number;

  avg3: number;
  bestVisit: number;
  bestCheckout: number;

  // ✅ NEW
  kills: number;
  favNumber: number; // 0 si inconnu, sinon 1..20 ou 25
  favNumberHits: number;
  favSegment: string; // "S20" / "T8" / "DB" ...
  favSegmentHits: number;
  totalHits: number;
};

const MODE_DEFS: {
  id: LeaderboardMode;
  label: string;
  metrics: MetricKey[];
}[] = [
  {
    id: "x01_multi",
    label: "X01 MULTI",
    metrics: ["avg3", "wins", "winRate", "matches", "bestVisit", "bestCheckout"],
  },
  { id: "cricket", label: "CRICKET", metrics: ["winRate", "wins", "matches"] },

  // ✅ NEW: killer expose kills + favoris
  {
    id: "killer",
    label: "KILLER",
    metrics: ["kills", "wins", "winRate", "matches", "favSegmentHits", "favNumberHits", "totalHits"],
  },

  { id: "shanghai", label: "SHANGHAI", metrics: ["wins", "winRate", "matches"] },
  {
    id: "battle_royale",
    label: "BATTLE ROYALE",
    metrics: ["wins", "winRate", "matches"],
  },
  {
    id: "clock",
    label: "TOUR DE L’HORLOGE",
    metrics: ["wins", "winRate", "matches"],
  },
];

// ------------------------------
// Utils robustes
// ------------------------------

function safeStr(v: any): string {
  if (v === undefined || v === null) return "";
  return String(v);
}

function numOr0(...values: any[]): number {
  for (const v of values) {
    if (v === undefined || v === null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function pickAvatar(obj: any): string | null {
  if (!obj) return null;
  return (
    obj.avatarDataUrl ||
    obj.avatar_data_url ||
    obj.avatar ||
    obj.avatarUrl ||
    obj.avatarURL ||
    obj.avatarBase64 ||
    obj.avatar_b64 ||
    obj.dataUrl ||
    obj.dataURL ||
    obj.photoDataUrl ||
    obj.photo ||
    null
  );
}

function pickName(obj: any): string {
  if (!obj) return "";
  return (
    obj.name ||
    obj.playerName ||
    obj.profileName ||
    obj.label ||
    obj.nickname ||
    obj.displayName ||
    ""
  );
}

function pickId(obj: any): string {
  if (!obj) return "";
  return (
    obj.profileId ||
    obj.playerId ||
    obj.pid ||
    obj.id ||
    obj._id ||
    obj.uid ||
    ""
  );
}

// ✅ NEW: récupère tous les bots depuis le storage (pour avatars manquants en history)
function loadBotsMap(): Record<string, { avatarDataUrl?: string | null; name?: string }> {
  try {
    const raw = localStorage.getItem("dc_bots_v1");
    if (!raw) return {};
    const bots = JSON.parse(raw);
    const map: Record<string, any> = {};
    for (const b of bots || []) {
      if (!b?.id) continue;
      map[b.id] = {
        avatarDataUrl: b.avatarDataUrl ?? null,
        name: b.name,
      };
    }
    return map;
  } catch {
    return {};
  }
}

function periodToMs(p: PeriodKey): number {
  const day = 24 * 60 * 60 * 1000;
  switch (p) {
    case "D":
      return day;
    case "W":
      return 7 * day;
    case "M":
      return 31 * day;
    case "Y":
      return 366 * day;
    case "ALL":
    case "TOUT":
    default:
      return 0;
  }
}

function getRecTimestamp(rec: any): number {
  return (
    numOr0(
      rec?.updatedAt,
      rec?.createdAt,
      rec?.ts,
      rec?.date,
      rec?.summary?.updatedAt,
      rec?.summary?.createdAt,
      rec?.summary?.finishedAt,
      rec?.payload?.updatedAt,
      rec?.payload?.createdAt,
      rec?.payload?.ts,
      rec?.payload?.summary?.updatedAt,
      rec?.payload?.summary?.finishedAt
    ) || 0
  );
}

function inPeriod(rec: any, period: PeriodKey): boolean {
  if (period === "ALL" || period === "TOUT") return true;
  const dt = getRecTimestamp(rec);
  if (!dt) return true; // si pas de date fiable, on conserve
  const span = periodToMs(period);
  if (!span) return true;
  return Date.now() - dt <= span;
}

function isRecordMatchingMode(rec: any, mode: LeaderboardMode, scope: Scope): boolean {
  // scope online/local : à brancher plus tard si tu as un flag fiable
  void scope;

  const kind = rec?.kind || rec?.summary?.kind || rec?.payload?.kind;
  const payloadMode = rec?.payload?.mode;
  const payloadVariant = rec?.payload?.variant;
  const game = rec?.payload?.game || rec?.summary?.game?.mode || rec?.summary?.game?.game;

  const isX01 =
    kind === "x01" ||
    game === "x01" ||
    rec?.summary?.game?.mode === "x01" ||
    payloadVariant === "x01_v3" ||
    payloadMode === "x01_multi" ||
    payloadMode === "x01_teams";

  if (mode === "x01_multi") return isX01;

  if (mode === "cricket") return kind === "cricket" || game === "cricket";
  if (mode === "killer") return kind === "killer" || game === "killer" || payloadMode === "killer";
  if (mode === "shanghai") return kind === "shanghai" || game === "shanghai";
  if (mode === "battle_royale") return kind === "battle_royale" || game === "battle_royale";
  if (mode === "clock") return kind === "clock" || game === "clock";

  return true;
}

// ------------------------------
// Extraction per-player (câblage stats)
// ------------------------------

function extractPerPlayerSummary(summary: any): Record<string, any> {
  if (!summary) return {};

  if (summary.detailedByPlayer && typeof summary.detailedByPlayer === "object") {
    return summary.detailedByPlayer as Record<string, any>;
  }

  const out: Record<string, any> = {};

  if (Array.isArray(summary.perPlayer)) {
    for (const p of summary.perPlayer) {
      const pid = pickId(p) || safeStr(p?.id);
      if (!pid) continue;
      out[pid] = p;
    }
    if (Object.keys(out).length) return out;
  }

  const avg3Map =
    summary.avg3ByPlayer ||
    summary.avg3_by_player ||
    summary.moy3ByPlayer ||
    summary.moy3_by_player ||
    summary.avgByPlayer ||
    null;

  const bestVisitMap =
    summary.bestVisitByPlayer ||
    summary.bestVisit_by_player ||
    summary.bvByPlayer ||
    summary.bv_by_player ||
    null;

  const bestCheckoutMap =
    summary.bestCheckoutByPlayer ||
    summary.bestCheckout_by_player ||
    summary.bestCoByPlayer ||
    summary.bestCo_by_player ||
    summary.coByPlayer ||
    null;

  // ✅ NEW: hitsBySegment map possible (Option A)
  const hitsBySegMap =
    summary.hitsBySegmentByPlayer ||
    summary.hits_by_segment_by_player ||
    summary.hitsBySegment ||
    null;

  const nameMap = summary.nameByPlayer || summary.playerNames || null;
  const avatarMap = summary.avatarByPlayer || summary.avatarDataUrlByPlayer || null;

  const keys = new Set<string>();
  const collectKeys = (m: any) => {
    if (!m || typeof m !== "object") return;
    for (const k of Object.keys(m)) keys.add(String(k));
  };
  collectKeys(avg3Map);
  collectKeys(bestVisitMap);
  collectKeys(bestCheckoutMap);
  collectKeys(nameMap);
  collectKeys(avatarMap);
  collectKeys(hitsBySegMap);

  if (keys.size) {
    for (const pid of keys) {
      out[pid] = {
        playerId: pid,
        profileId: pid,
        name: nameMap?.[pid],
        avatarDataUrl: avatarMap?.[pid],
        avg3: numOr0(avg3Map?.[pid]),
        bestVisit: numOr0(bestVisitMap?.[pid]),
        bestCheckout: numOr0(bestCheckoutMap?.[pid]),
        hitsBySegment: hitsBySegMap?.[pid] || undefined,
      };
    }
    return out;
  }

  if (summary.players && typeof summary.players === "object") {
    for (const [pid, p] of Object.entries(summary.players)) {
      if (!pid) continue;
      out[String(pid)] = p as any;
    }
    if (Object.keys(out).length) return out;
  }

  return {};
}

// ✅ NEW helpers: fav number/segment from hitsBySegment
function parseSegmentKeyToNumber(segKey: string): number {
  const k = safeStr(segKey).toUpperCase();
  if (k === "SB" || k === "BULL") return 25;
  if (k === "DB" || k === "DBULL") return 25;
  // format S20 / D8 / T19
  const m = k.match(/^([SDT])(\d{1,2})$/);
  if (m) {
    const n = Number(m[2]);
    if (n >= 1 && n <= 20) return n;
  }
  return 0;
}

function computeFavsFromHitsMap(hitsBySegment: any) {
  const segCounts: Record<string, number> = {};
  const numCounts: Record<string, number> = {};
  let totalHits = 0;

  if (hitsBySegment && typeof hitsBySegment === "object") {
    for (const [k0, v0] of Object.entries(hitsBySegment)) {
      const k = safeStr(k0).toUpperCase();
      const c = numOr0(v0);
      if (c <= 0) continue;
      segCounts[k] = (segCounts[k] || 0) + c;
      totalHits += c;

      const n = parseSegmentKeyToNumber(k);
      if (n > 0) {
        const nk = String(n);
        numCounts[nk] = (numCounts[nk] || 0) + c;
      }
    }
  }

  let favSegment = "";
  let favSegmentHits = 0;
  for (const [k, c] of Object.entries(segCounts)) {
    if (c > favSegmentHits) {
      favSegmentHits = c;
      favSegment = k;
    }
  }

  let favNumber = 0;
  let favNumberHits = 0;
  for (const [nk, c] of Object.entries(numCounts)) {
    const n = Number(nk);
    if (c > favNumberHits) {
      favNumberHits = c;
      favNumber = n;
    }
  }

  return { favSegment, favSegmentHits, favNumber, favNumberHits, totalHits };
}

type Agg = {
  wins: number;
  matches: number;

  avg3Sum: number;
  avg3Count: number;
  bestVisit: number;
  bestCheckout: number;

  // ✅ NEW
  kills: number;
  hitsBySegmentAgg: Record<string, number>;
  totalHits: number;
};

type ExtraInfo = {
  name?: string;
  avatarDataUrl?: string | null;
};

function computeRowsFromHistory(
  history: any[],
  profiles: Profile[],
  mode: LeaderboardMode,
  scope: Scope,
  period: PeriodKey
): Row[] {
  const aggByPlayer: Record<string, Agg> = {};
  const infoByPlayer: Record<string, ExtraInfo> = {};
  const profileById: Record<string, Profile> = {};

  // ✅ NEW: map bots (corrige avatars manquants des bots dans history)
  const botsMap = loadBotsMap();

  // seed profils locaux (y compris bots si ils sont dans store.profiles)
  for (const p of profiles || []) {
    profileById[p.id] = p;
    aggByPlayer[p.id] = {
      wins: 0,
      matches: 0,
      avg3Sum: 0,
      avg3Count: 0,
      bestVisit: 0,
      bestCheckout: 0,

      kills: 0,
      hitsBySegmentAgg: {},
      totalHits: 0,
    };
    infoByPlayer[p.id] = {
      name: p.name,
      avatarDataUrl: (p as any).avatarDataUrl ?? (p as any).avatar ?? null,
    };
  }

  for (const rec of history || []) {
    if (!rec) continue;
    if (!inPeriod(rec, period)) continue;
    if (!isRecordMatchingMode(rec, mode, scope)) continue;

    const winnerId =
      rec.winnerId ||
      rec.payload?.winnerId ||
      rec.summary?.winnerId ||
      rec.payload?.summary?.winnerId ||
      null;

    const summary = rec.summary || rec.payload?.summary || null;
    const per = extractPerPlayerSummary(summary);

    // For killer: sometimes summary.players contains kills, but perPlayer has hitsBySegment
    const summaryPlayersArr: any[] = Array.isArray(summary?.players) ? summary.players : [];

    // ------------------------------
    // 1) Per-player via summary (meilleur câblage)
    // ------------------------------
    if (per && Object.keys(per).length > 0) {
      for (const key of Object.keys(per)) {
        const det: any = per[key] || {};
        const pid: string = pickId(det) || key;
        if (!pid) continue;

        if (!aggByPlayer[pid]) {
          aggByPlayer[pid] = {
            wins: 0,
            matches: 0,
            avg3Sum: 0,
            avg3Count: 0,
            bestVisit: 0,
            bestCheckout: 0,
            kills: 0,
            hitsBySegmentAgg: {},
            totalHits: 0,
          };
        }

        // infos (nom/avatar) : ne remplace pas si déjà mieux
        if (!infoByPlayer[pid]) infoByPlayer[pid] = {};

        if (!infoByPlayer[pid].name) {
          infoByPlayer[pid].name =
            pickName(det) ||
            botsMap?.[pid]?.name ||
            infoByPlayer[pid].name ||
            "";
        }

        if (!infoByPlayer[pid].avatarDataUrl) {
          infoByPlayer[pid].avatarDataUrl =
            pickAvatar(det) ||
            botsMap?.[pid]?.avatarDataUrl ||
            infoByPlayer[pid].avatarDataUrl ||
            null;
        }

        const agg = aggByPlayer[pid];

        agg.matches += 1;
        if (winnerId && winnerId === pid) agg.wins += 1;

        // X01 metrics
        const avg3Candidate = numOr0(det.avg3, det.moy3, det.avg, det.avg3d, det.avg_3);
        if (avg3Candidate > 0) {
          agg.avg3Sum += avg3Candidate;
          agg.avg3Count += 1;
        }

        const bvCandidate = numOr0(det.bestVisit, det.bv, det.bestVisit3, det.bv3, det.best_visit);
        if (bvCandidate > 0) agg.bestVisit = Math.max(agg.bestVisit, bvCandidate);

        const coCandidate = numOr0(det.bestCheckout, det.bestCo, det.coBest, det.co, det.best_co);
        if (coCandidate > 0) agg.bestCheckout = Math.max(agg.bestCheckout, coCandidate);

        // ✅ KILLER: kills (si dispo dans summary.players)
        if (mode === "killer" && summaryPlayersArr.length) {
          const sp = summaryPlayersArr.find((x) => String(pickId(x) || x?.id) === String(pid));
          if (sp) {
            const k = numOr0(sp.kills, sp.killCount, sp.k);
            if (k > 0) agg.kills += k;
          }
        } else if (mode === "killer") {
          // fallback si kills packé dans det
          const k = numOr0(det.kills, det.killCount, det.k);
          if (k > 0) agg.kills += k;
        }

        // ✅ KILLER Option A: hitsBySegment
        const hbs = det.hitsBySegment || det.hits_by_segment || det.hits || null;
        if (hbs && typeof hbs === "object") {
          for (const [seg, c0] of Object.entries(hbs)) {
            const c = numOr0(c0);
            if (c <= 0) continue;
            const s = safeStr(seg).toUpperCase();
            agg.hitsBySegmentAgg[s] = (agg.hitsBySegmentAgg[s] || 0) + c;
            agg.totalHits += c;
          }
        }
      }
      continue;
    }

    // ------------------------------
    // 2) Fallback via players array
    // ------------------------------
    const playersArr: any[] = Array.isArray(rec.players)
      ? rec.players
      : Array.isArray(rec.payload?.players)
      ? rec.payload.players
      : Array.isArray(rec.payload?.summary?.players)
      ? rec.payload.summary.players
      : [];

    if (!playersArr.length) continue;

    for (const pl of playersArr) {
      const pid = pickId(pl);
      const name = pickName(pl);
      const avatar = pickAvatar(pl);

      // si pas d'id on agrège quand même par nom (évite le vide)
      const key = pid || `name:${safeStr(name).trim().toLowerCase()}`;
      if (!key) continue;

      if (!aggByPlayer[key]) {
        aggByPlayer[key] = {
          wins: 0,
          matches: 0,
          avg3Sum: 0,
          avg3Count: 0,
          bestVisit: 0,
          bestCheckout: 0,

          kills: 0,
          hitsBySegmentAgg: {},
          totalHits: 0,
        };
      }

      if (!infoByPlayer[key]) infoByPlayer[key] = {};

      if (!infoByPlayer[key].name) {
        infoByPlayer[key].name = name || botsMap?.[pid]?.name || "—";
      }

      if (!infoByPlayer[key].avatarDataUrl) {
        infoByPlayer[key].avatarDataUrl = avatar || botsMap?.[pid]?.avatarDataUrl || null;
      }

      const agg = aggByPlayer[key];
      agg.matches += 1;
      if (winnerId && pid && winnerId === pid) agg.wins += 1;

      // X01 fallbacks
      const avg3Candidate = numOr0(pl.avg3, pl.moy3, pl.avg3d);
      if (avg3Candidate > 0) {
        agg.avg3Sum += avg3Candidate;
        agg.avg3Count += 1;
      }
      const bvCandidate = numOr0(pl.bestVisit, pl.bv, pl.bestVisit3);
      if (bvCandidate > 0) agg.bestVisit = Math.max(agg.bestVisit, bvCandidate);
      const coCandidate = numOr0(pl.bestCheckout, pl.bestCo, pl.coBest);
      if (coCandidate > 0) agg.bestCheckout = Math.max(agg.bestCheckout, coCandidate);

      // KILLER fallback kills
      if (mode === "killer") {
        const k = numOr0(pl.kills, pl.killCount, pl.k);
        if (k > 0) agg.kills += k;
      }
    }
  }

  const rows: Row[] = Object.keys(aggByPlayer).map((pid) => {
    const agg = aggByPlayer[pid];
    const prof = profileById[pid];
    const extra = infoByPlayer[pid] || {};

    const matches = agg.matches;
    const wins = agg.wins;
    const winRate = matches > 0 ? (wins / matches) * 100 : 0;
    const avg3 = agg.avg3Count > 0 ? agg.avg3Sum / agg.avg3Count : 0;

    const fav = computeFavsFromHitsMap(agg.hitsBySegmentAgg);

    // ✅ NEW: si avatar manquant, on tente botsMap (utile si row seed par name:xxx ou info manquante)
    const botFallbackAvatar = botsMap?.[pid]?.avatarDataUrl || null;
    const botFallbackName = botsMap?.[pid]?.name || undefined;

    return {
      id: pid,
      name: prof?.name || extra.name || botFallbackName || "—",
      avatarDataUrl:
        (prof as any)?.avatarDataUrl ??
        (prof as any)?.avatar ??
        extra.avatarDataUrl ??
        botFallbackAvatar ??
        null,

      wins,
      losses: Math.max(0, matches - wins),
      matches,
      winRate,

      avg3,
      bestVisit: agg.bestVisit,
      bestCheckout: agg.bestCheckout,

      kills: agg.kills || 0,
      favNumber: fav.favNumber || 0,
      favNumberHits: fav.favNumberHits || 0,
      favSegment: fav.favSegment || "",
      favSegmentHits: fav.favSegmentHits || 0,
      totalHits: fav.totalHits || agg.totalHits || 0,
    };
  });

  return rows;
}

function metricLabel(m: MetricKey) {
  switch (m) {
    case "wins":
      return "Victoires";
    case "winRate":
      return "% Win";
    case "matches":
      return "Matchs joués";
    case "avg3":
      return "Moy. 3 darts";
    case "bestVisit":
      return "Best visit";
    case "bestCheckout":
      return "Best CO";

    // ✅ NEW
    case "kills":
      return "Kills";
    case "favNumberHits":
      return "Numéro favori";
    case "favSegmentHits":
      return "Segment favori";
    case "totalHits":
      return "Hits total";
    default:
      return "Stat";
  }
}

function periodLabel(p: PeriodKey) {
  switch (p) {
    case "D":
      return "J";
    case "W":
      return "S";
    case "M":
      return "M";
    case "Y":
      return "A";
    case "ALL":
      return "All";
    case "TOUT":
      return "Tout";
    default:
      return "All";
  }
}

// =============================================================

export default function StatsLeaderboardsPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const profiles: Profile[] = (store as any)?.profiles ?? [];

  const [scope, setScope] = React.useState<Scope>("local");
  const [mode, setMode] = React.useState<LeaderboardMode>("x01_multi");
  const [period, setPeriod] = React.useState<PeriodKey>("ALL");

  const [historySource, setHistorySource] = React.useState<any[]>(
    ((((store as any)?.history) as any[]) || []) as any[]
  );

  React.useEffect(() => {
    setHistorySource(((((store as any)?.history) as any[]) || []) as any[]);
  }, [store]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const api: any = History as any;
        let list: any[] = [];

        if (typeof api.getAll === "function") list = await api.getAll();
        else if (typeof api.list === "function") list = await api.list();
        else if (typeof api.getAllSorted === "function") list = await api.getAllSorted();

        if (alive && Array.isArray(list) && list.length) {
          if (import.meta.env.DEV) console.log("[Leaderboards] IDB history size =", list.length);
          setHistorySource(list);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.log("[Leaderboards] History IDB load error", err);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const currentModeDef = MODE_DEFS.find((m) => m.id === mode);
  const metricList = currentModeDef?.metrics ?? [];
  const [metric, setMetric] = React.useState<MetricKey>(metricList[0] ?? "wins");

  React.useEffect(() => {
    const def = MODE_DEFS.find((m) => m.id === mode);
    if (!def) return;
    if (!def.metrics.includes(metric)) setMetric(def.metrics[0]);
  }, [mode]); // eslint-disable-line

  const currentModeIndex = MODE_DEFS.findIndex((m) => m.id === mode);
  const currentMetricIndex = Math.max(0, metricList.findIndex((m) => m === metric));

  const cycleMode = (dir: "prev" | "next") => {
    if (!MODE_DEFS.length) return;
    let idx = currentModeIndex < 0 ? 0 : currentModeIndex;
    const len = MODE_DEFS.length;
    const newIndex = dir === "prev" ? (idx - 1 + len) % len : (idx + 1) % len;
    setMode(MODE_DEFS[newIndex].id);
  };

  const cycleMetric = (dir: "prev" | "next") => {
    if (!metricList.length) return;
    let idx = currentMetricIndex;
    const len = metricList.length;
    const newIndex = dir === "prev" ? (idx - 1 + len) % len : (idx + 1) % len;
    setMetric(metricList[newIndex]);
  };

  const rows = React.useMemo(() => {
    // ✅ KILLER: on classe depuis l'agrégateur unique
if (mode === "killer") {
  const botsMap = (function loadBotsMap() {
    try {
      const raw = localStorage.getItem("dc_bots_v1");
      if (!raw) return {};
      const bots = JSON.parse(raw);
      const map: any = {};
      for (const b of bots || []) if (b?.id) map[b.id] = { name: b.name, avatarDataUrl: b.avatarDataUrl ?? null };
      return map;
    } catch {
      return {};
    }
  })();

  const agg = computeKillerAgg(historySource || [], profiles || [], botsMap);
  const base = Object.values(agg);

  const value = (r: any) => {
    switch (metric) {
      case "wins":
        return r.wins;
      case "winRate":
        return r.winRate;
      case "matches":
        return r.played;
      case "kills":
        return r.kills;
      case "favSegmentHits":
        return r.favSegmentHits;
      case "favNumberHits":
        return r.favNumberHits;
      case "totalHits":
        return r.totalHits;
      default:
        return 0;
    }
  };

  return [...base].sort((a, b) => value(b) - value(a));
}
  
    // ✅ autres modes: logique actuelle
    const baseRows = computeRowsFromHistory(historySource, profiles, mode, scope, period);
  
    const value = (r: Row): number => {
      switch (metric) {
        case "wins":
          return r.wins;
        case "winRate":
          return r.winRate;
        case "matches":
          return r.matches;
        case "avg3":
          return r.avg3;
        case "bestVisit":
          return r.bestVisit;
        case "bestCheckout":
          return r.bestCheckout;
  
        // ✅ NEW (killer option A, mais ici pour les autres modes ça reste 0)
        case "kills":
          return r.kills;
        case "favNumberHits":
          return r.favNumberHits;
        case "favSegmentHits":
          return r.favSegmentHits;
        case "totalHits":
          return r.totalHits;
        default:
          return 0;
      }
    };

    return [...baseRows].sort((a, b) => value(b) - value(a));
  }, [historySource, profiles, mode, scope, metric, period]);

  const hasData = rows.length > 0;
  const currentMetricLabel = metricLabel(metric) || t("stats.leaderboards.metric", "Stat");

  return (
    <div
      className="stats-leaderboards-page"
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 12,
        paddingTop: 20,
        background: theme.bg,
        color: theme.text,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 900,
              letterSpacing: 0.9,
              textTransform: "uppercase",
              color: theme.primary,
              fontSize: 20,
              textShadow: `0 0 14px ${theme.primary}66`,
              marginBottom: 4,
            }}
          >
            {t("stats.leaderboards.titleMain", "CLASSEMENTS")}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.3, color: theme.textSoft }}>
            Classements globaux par mode de jeu et par stat.
          </div>
        </div>

        <button
          onClick={() => go("stats")}
          style={{
            borderRadius: 999,
            border: `1px solid ${theme.borderSoft}`,
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 700,
            background: theme.card,
            color: theme.textSoft,
            cursor: "pointer",
          }}
        >
          ← Retour
        </button>
      </div>

      {/* CARD : SCOPE + MODE */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 20,
          padding: 10,
          marginBottom: 14,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: `0 16px 32px rgba(0,0,0,.65), 0 0 20px ${theme.primary}33`,
        }}
      >
        {/* Scope */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {(["local", "online"] as Scope[]).map((s) => {
            const active = s === scope;
            return (
              <button
                key={s}
                onClick={() => setScope(s)}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
                  padding: "6px 8px",
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  background: active
                    ? `linear-gradient(135deg, ${theme.primary}, #ffea9a)`
                    : "transparent",
                  color: active ? "#000" : theme.textSoft,
                  boxShadow: active ? `0 0 14px ${theme.primary}77` : "none",
                  cursor: "pointer",
                }}
              >
                {s === "local" ? "LOCAL" : "ONLINE"}
              </button>
            );
          })}
        </div>

        {/* Mode carousel */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <button
            onClick={() => cycleMode("prev")}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: `1px solid ${theme.borderSoft}`,
              background: "#050608",
              color: theme.textSoft,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {"<"}
          </button>

          <div
            style={{
              flex: 1,
              borderRadius: 999,
              padding: "6px 10px",
              textAlign: "center",
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.95))",
              color: theme.primary,
              boxShadow: `0 0 14px ${theme.primary}33`,
            }}
          >
            {currentModeDef?.label ?? ""}
          </div>

          <button
            onClick={() => cycleMode("next")}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: `1px solid ${theme.borderSoft}`,
              background: "#050608",
              color: theme.textSoft,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {">"}
          </button>
        </div>
      </div>

      {/* PÉRIODE + STAT */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 18,
          padding: 12,
          marginBottom: 10,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: `0 12px 26px rgba(0,0,0,.7)`,
        }}
      >
        {/* Période */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.7,
              color: theme.primary,
            }}
          >
            {t("stats.leaderboards.period", "Période")}
          </div>

          <div style={{ display: "flex", gap: 4 }}>
            {(["D", "W", "M", "Y", "ALL", "TOUT"] as PeriodKey[]).map((p) => {
              const active = p === period;
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    borderRadius: 999,
                    border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
                    padding: "3px 7px",
                    fontSize: 9,
                    fontWeight: 700,
                    background: active ? theme.primary : "transparent",
                    color: active ? "#000" : theme.textSoft,
                    cursor: "pointer",
                  }}
                >
                  {periodLabel(p)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tri */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.7,
            color: theme.primary,
            marginBottom: 4,
          }}
        >
          {t("stats.leaderboards.sortBy", "Classement par")}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => cycleMetric("prev")}
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: `1px solid ${theme.borderSoft}`,
              background: "#050608",
              color: theme.textSoft,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {"<"}
          </button>

          <div
            style={{
              flex: 1,
              borderRadius: 999,
              padding: "5px 10px",
              textAlign: "center",
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.7,
              background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(0,0,0,0.95))",
              color: theme.primary,
              boxShadow: `0 0 10px ${theme.primary}33`,
            }}
          >
            {currentMetricLabel}
          </div>

          <button
            onClick={() => cycleMetric("next")}
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: `1px solid ${theme.borderSoft}`,
              background: "#050608",
              color: theme.textSoft,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {">"}
          </button>
        </div>
      </div>

      {/* LISTE */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 18,
          padding: 10,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: `0 14px 30px rgba(0,0,0,.8)`,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            color: theme.textSoft,
            marginBottom: 6,
          }}
        >
          {t("stats.leaderboards.titleList", "Classements")}
        </div>

        {!hasData ? (
          <div style={{ padding: 16, textAlign: "center", fontSize: 11.5, color: theme.textSoft }}>
            {t("stats.leaderboards.empty", "Aucune donnée de classement.")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rows.map((row, index) => {
              const rank = index + 1;
              const isFirst = rank === 1;
              const isSecond = rank === 2;
              const isThird = rank === 3;

              let rankColor = theme.textSoft;
              if (isFirst) rankColor = "#ffd700";
              else if (isSecond) rankColor = "#c0c0c0";
              else if (isThird) rankColor = "#cd7f32";

              let metricValue: string;
              let metricSub: string | null = null;

              switch (metric) {
                case "wins":
                  metricValue = `${row.wins}`;
                  metricSub = `${row.matches} matchs`;
                  break;
                case "winRate":
                  metricValue = `${row.winRate.toFixed(1)}%`;
                  metricSub = `${row.wins}/${row.matches}`;
                  break;
                case "matches":
                  metricValue = `${row.matches}`;
                  metricSub = `${row.wins} win`;
                  break;
                case "avg3":
                  metricValue = row.avg3 ? row.avg3.toFixed(1) : "0.0";
                  metricSub = `${row.matches} matchs`;
                  break;
                case "bestVisit":
                  metricValue = `${row.bestVisit || 0}`;
                  metricSub = `${row.matches} matchs`;
                  break;
                case "bestCheckout":
                  metricValue = `${row.bestCheckout || 0}`;
                  metricSub = `${row.matches} matchs`;
                  break;

                // ✅ NEW (killer)
                case "kills":
                  metricValue = `${row.kills || 0}`;
                  metricSub = `${row.matches} matchs`;
                  break;
                case "favNumberHits":
                  metricValue = row.favNumber ? `#${row.favNumber}` : "—";
                  metricSub = row.favNumberHits
                    ? `${row.favNumberHits} hit(s)`
                    : `${row.totalHits || 0} hit(s)`;
                  break;
                case "favSegmentHits":
                  metricValue = row.favSegment ? `${row.favSegment}` : "—";
                  metricSub = row.favSegmentHits
                    ? `${row.favSegmentHits} hit(s)`
                    : `${row.totalHits || 0} hit(s)`;
                  break;
                case "totalHits":
                  metricValue = `${row.totalHits || 0}`;
                  metricSub = row.favSegment ? `fav: ${row.favSegment}` : null;
                  break;

                default:
                  metricValue = "0";
                  metricSub = `${row.matches} matchs`;
              }

              const label = row.name || "—";
              const letter = label?.[0]?.toUpperCase() || "🤖";

              return (
                <div
                  key={row.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "6px 8px",
                    borderRadius: 12,
                    background: rank <= 3 ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.45)",
                    border: rank <= 3 ? `1px solid ${theme.primary}55` : `1px solid ${theme.borderSoft}`,
                  }}
                >
                  {/* Rang */}
                  <div
                    style={{
                      width: 26,
                      textAlign: "center",
                      fontWeight: 900,
                      fontSize: 13,
                      color: rankColor,
                    }}
                  >
                    {rank}
                  </div>

                  {/* Avatar + nom */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        overflow: "hidden",
                        boxShadow: `0 0 8px ${theme.primary}33`,
                        border: `1px solid ${theme.borderSoft}`,
                        background: "#000",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {row.avatarDataUrl ? (
                        <img
                          src={row.avatarDataUrl}
                          alt={label}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          draggable={false}
                        />
                      ) : (
                        // ✅ fallback BOT-friendly (évite les "?" vides)
                        <ProfileAvatar
                          size={30}
                          dataUrl={null}
                          label={letter || "🤖"}
                          showStars={false}
                          isBot={true}
                        />
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: theme.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {label}
                    </div>
                  </div>

                  {/* Valeur */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: 11 }}>
                    <div style={{ fontWeight: 800, color: theme.primary }}>{metricValue}</div>
                    <div style={{ fontSize: 9.5, color: theme.textSoft }}>
                      {metricSub ?? `${row.matches} matchs`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ height: 80 }} />
    </div>
  );
}
