// ============================================
// src/pages/HistoryPage.tsx — Historique V2 Neon Deluxe
// ============================================

import React, { useEffect, useMemo, useState } from "react";
import type { Store } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { History, type SavedMatch } from "../lib/history";

/* ---------------------------------------------
   Icons
--------------------------------------------- */

const Icon = {
  Trophy: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path
        fill="currentColor"
        d="M6 2h12v2h3a1 1 0 0 1 1 1v1a5 5 0 0 1-5 5h-1.1A6 6 0 0 1 13 13.9V16h3v2H8v-2h3v-2.1A6 6 0 0 1 8.1 11H7A5 5 0 0 1 2 6V5a1 1 0 0 1 1-1h3V2Z"
      />
    </svg>
  ),
  Eye: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path
        fill="currentColor"
        d="M12 5c5.5 0 9.5 4.5 10 7-0.5 2.5-4.5 7-10 7S2.5 14.5 2 12c.5-2.5 4.5-7 10-7Zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
      />
    </svg>
  ),
  Play: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path fill="currentColor" d="M8 5v14l11-7z" />
    </svg>
  ),
  Trash: (p: any) => (
    <svg viewBox="0 0 24 24" width={18} height={18} {...p}>
      <path
        fill="currentColor"
        d="M9 3h6l1 2h5v2H3V5h5l1-2Zm-3 6h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 9Z"
      />
    </svg>
  ),
};

/* ---------------------------------------------
   Types
--------------------------------------------- */

export type SavedEntry = SavedMatch & {
  resumeId?: string;
  game?: { mode?: string; startScore?: number; teams?: any[] };
  winnerName?: string | null;
};

/* ---------------------------------------------
   Helpers : player & avatar
--------------------------------------------- */

function getId(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return String(v.id || v.playerId || v.profileId || v._id || "");
}

function getName(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return String(v.name || v.displayName || v.username || "");
}

function getAvatarUrl(store: Store, v: any): string | null {
  if (v && typeof v === "object" && v.avatarDataUrl) return String(v.avatarDataUrl);
  const id = getId(v);
  const anyStore: any = store as any;
  const list: any[] = Array.isArray(anyStore?.profiles)
    ? anyStore.profiles
    : Array.isArray(anyStore?.profiles?.list)
    ? anyStore.profiles.list
    : [];
  const hit = list.find((p) => getId(p) === id);
  return hit?.avatarDataUrl ?? null;
}

/* ---------------------------------------------
   Mode + params
--------------------------------------------- */

function baseMode(e: SavedEntry) {
  const k = (e.kind || "").toLowerCase();
  const m = (e.game?.mode || "").toLowerCase();
  if (k === "leg") return m || "x01";
  return k || m || "x01";
}

// trouve un startScore 301 / 501 / 701 / 901 n'importe où dans l'objet
function deepFindStart(obj: any, depth = 4): number | undefined {
  if (!obj || depth < 0) return undefined;
  if (typeof obj !== "object") return undefined;

  const candidates = new Set<number>();

  function walk(o: any, d: number) {
    if (!o || d < 0) return;
    if (typeof o !== "object") return;

    for (const [, val] of Object.entries(o)) {
      if (typeof val === "number") {
        if ([301, 501, 701, 901].includes(val)) {
          candidates.add(val);
        }
      } else if (typeof val === "string") {
        const trimmed = val.trim();
        if (/^\d{3}$/.test(trimmed)) {
          const n = Number(trimmed);
          if ([301, 501, 701, 901].includes(n)) {
            candidates.add(n);
          }
        }
      } else if (Array.isArray(val)) {
        for (const it of val) walk(it, d - 1);
      } else if (typeof val === "object") {
        walk(val, d - 1);
      }
    }
  }

  walk(obj, depth);

  if (candidates.size === 0) return undefined;
  // on choisit un des classiques, priorité 301 puis 501, etc.
  const order = [301, 501, 701, 901];
  for (const v of order) {
    if (candidates.has(v)) return v;
  }
  return undefined;
}

function getStartScore(e: SavedEntry): number {
  const anyE: any = e;

  const paths = [
    anyE.game?.startScore,
    anyE.summary?.game?.startScore,
    anyE.payload?.game?.startScore,

    anyE.config?.startScore,
    anyE.summary?.config?.startScore,
    anyE.payload?.config?.startScore,

    anyE.config?.start,
    anyE.summary?.config?.start,
    anyE.payload?.config?.start,

    anyE.payload?.x01?.startScore,
    anyE.payload?.x01?.start,
    anyE.summary?.x01?.startScore,
    anyE.summary?.x01?.start,

    anyE.engineConfig?.startScore,
    anyE.engineConfig?.start,
  ];

  for (const v of paths) {
    if (typeof v === "number" && [301, 501, 701, 901].includes(v)) {
      return v;
    }
  }

  return 501; // fallback
}

function modeLabel(e: SavedEntry) {
  const m = baseMode(e);
  if (m === "x01") {
    const sc = getStartScore(e);
    return `X01 · ${sc}`;
  }
  return m.toUpperCase();
}

/* ---------------------------------------------
   Status
--------------------------------------------- */

function statusOf(e: SavedEntry): "finished" | "in_progress" {
  const s = (e.status || "").toLowerCase();
  if (s === "finished") return "finished";
  if (s === "inprogress" || s === "in_progress") return "in_progress";
  const sum: any = e.summary || e.payload || {};
  if (sum?.finished === true || sum?.result?.finished === true) return "finished";
  return "in_progress";
}

/* ---------------------------------------------
   Match Link
--------------------------------------------- */

function matchLink(e: SavedEntry): string | undefined {
  return (
    e.resumeId ||
    (e.summary as any)?.resumeId ||
    (e.summary as any)?.matchId ||
    (e.payload as any)?.resumeId ||
    (e.payload as any)?.matchId
  );
}

/* ---------------------------------------------
   Team Format
--------------------------------------------- */

function detectFormat(e: SavedEntry): string {
  const cfg: any = (e as any)?.game || (e as any)?.payload?.game;
  if (!cfg) return "Solo";

  const teams = cfg?.teams;
  if (!teams || teams.length <= 1) return "Solo";

  const sizes = teams.map((t: any) => t.players?.length || 1);
  if (sizes.every((s) => s === sizes[0])) return sizes[0] + "v" + sizes[0];

  return sizes.join("v");
}

/* ---------------------------------------------
   Score Summary (classement)
--------------------------------------------- */

function cleanName(raw: any): string | undefined {
  if (typeof raw !== "string") return undefined;
  const name = raw.trim();
  if (!name) return undefined;
  // on évite d'afficher des IDs type uuid
  if (name.length > 24 && name.includes("-")) return undefined;
  return name;
}

function cleanScore(raw: any): string | undefined {
  if (typeof raw === "number") return String(raw);
  if (typeof raw !== "string") return undefined;
  const s = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(s)) return undefined;
  return s;
}

function summarizeScore(e: SavedEntry): string {
  const data: any = e.summary || e.payload || {};
  const result = data.result || {};

  // 1) rankings / players / standings
  const rankings =
    data.rankings ||
    result.rankings ||
    result.players ||
    data.players ||
    result.standings;

  if (Array.isArray(rankings)) {
    const parts = rankings
      .map((r: any) => {
        const name =
          cleanName(r.name || r.playerName || r.label || r.id || r.playerId) ||
          undefined;
        const score =
          cleanScore(
            r.score ??
              r.legsWon ??
              r.legs ??
              r.setsWon ??
              r.sets ??
              r.points ??
              r.total,
          ) ||
          (typeof r.avg3 === "number" ? r.avg3.toFixed(1) : undefined);

        if (!name && !score) return null;
        if (name && score) return `${name}: ${score}`;
        return name || score || null;
      })
      .filter(Boolean) as string[];

    if (parts.length) return parts.join(" • ");
  }

  // 2) detailedByPlayer / byPlayer (X01 V3)
  const detailed = data.detailedByPlayer || data.byPlayer;
  if (detailed && typeof detailed === "object") {
    const parts = Object.entries(detailed)
      .map(([rawName, val]: [string, any]) => {
        const name = cleanName(rawName);
        const legs = cleanScore(val.legsWon ?? val.legs);
        const avg =
          typeof val.avg3 === "number" ? val.avg3.toFixed(1) : undefined;

        if (!name && !legs && !avg) return null;

        const sub = [];
        if (legs) sub.push(`${legs}L`);
        if (avg) sub.push(avg);

        if (name && sub.length) return `${name}: ${sub.join(" • ")}`;
        if (name) return name;
        if (sub.length) return sub.join(" • ");
        return null;
      })
      .filter(Boolean) as string[];

    if (parts.length) return parts.join(" • ");
  }

  // 3) on NE TOUCHE PLUS aux objets generic scores pour éviter les IDs chelous

  return "";
}

/* ---------------------------------------------
   Mode colors
--------------------------------------------- */

const modeColor: Record<string, string> = {
  x01: "#e4c06b",
  cricket: "#4da84d",
  clock: "#ff40b4",
  training: "#71c9ff",
  killer: "#ff6a3c",
  default: "#888",
};

function getModeColor(e: SavedEntry) {
  const m = baseMode(e);
  return modeColor[m] || modeColor.default;
}

/* ---------------------------------------------
   Dedup & Filter
--------------------------------------------- */

function better(a: SavedEntry, b: SavedEntry): SavedEntry {
  const ta = a.updatedAt || a.createdAt || 0;
  const tb = b.updatedAt || b.createdAt || 0;
  if (ta !== tb) return ta > tb ? a : b;
  const sa = statusOf(a),
    sb = statusOf(b);
  if (sa !== sb) return sa === "finished" ? a : b;
  return a;
}

function sameBucket(a: SavedEntry, b: SavedEntry): boolean {
  if (baseMode(a) !== baseMode(b)) return false;
  const ta = a.updatedAt || a.createdAt || 0;
  const tb = b.updatedAt || b.createdAt || 0;
  if (Math.abs(ta - tb) > 20 * 60 * 1000) return false;
  const A = new Set((a.players || []).map(getId).filter(Boolean));
  const B = new Set((b.players || []).map(getId).filter(Boolean));
  if (!A.size || !B.size) return true;
  for (const id of A) if (B.has(id)) return true;
  return false;
}

function dedupe(list: SavedEntry[]): SavedEntry[] {
  const byLink = new Map<string, SavedEntry>();
  const rest: SavedEntry[] = [];

  for (const e of list) {
    const link = matchLink(e);
    if (link) byLink.set(link, byLink.has(link) ? better(byLink.get(link)!, e) : e);
    else rest.push(e);
  }

  const base = [...byLink.values(), ...rest];
  const buckets: { rep: SavedEntry }[] = [];

  for (const e of base.sort(
    (a, b) => (a.updatedAt || a.createdAt || 0) - (b.updatedAt || b.createdAt || 0)
  )) {
    let ok = false;
    for (const bkt of buckets) {
      if (sameBucket(bkt.rep, e)) {
        bkt.rep = better(bkt.rep, e);
        ok = true;
        break;
      }
    }
    if (!ok) buckets.push({ rep: e });
  }
  return buckets
    .map((b) => b.rep)
    .sort(
      (a, b) =>
        (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
    );
}

/* ---------------------------------------------
   Range Filters
--------------------------------------------- */

type RangeKey = "today" | "week" | "month" | "year" | "archives";

function startOf(period: RangeKey) {
  const now = new Date();
  if (period === "today") {
    now.setHours(0, 0, 0, 0);
    return now.getTime();
  }
  if (period === "week") {
    const d = (now.getDay() + 6) % 7;
    now.setDate(now.getDate() - d);
    now.setHours(0, 0, 0, 0);
    return now.getTime();
  }
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }
  if (period === "year") {
    return new Date(now.getFullYear(), 0, 1).getTime();
  }
  return 0;
}

function inRange(ts: number, key: RangeKey): boolean {
  const t = ts || Date.now();
  if (key === "archives") return t < startOf("year");
  return t >= startOf(key);
}

/* ---------------------------------------------
   History API Wrapper
--------------------------------------------- */

const HistoryAPI = {
  async list(store: Store): Promise<SavedEntry[]> {
    try {
      const rows = await History.list();

      // 🔍 DEBUG : affiche la 1ère entrée brute dans la console
      if (rows && rows.length > 0) {
        console.log(
          "[HISTORY DEBUG] first row =",
          JSON.stringify(rows[0], null, 2)
        );
      }

      return rows as SavedEntry[];
    } catch {
      const anyStore = store as any;
      return anyStore.history ?? [];
    }
  },
  async remove(id: string) {
    try {
      await History.remove(id);
    } catch {}
  },
};

/* ---------------------------------------------
   Styles
--------------------------------------------- */

function makeStyles(theme: any) {
  const edge = theme.borderSoft ?? "rgba(255,255,255,0.12)";
  const text70 = theme.textSoft ?? "rgba(255,255,255,0.7)";

  return {
    page: {
      minHeight: "100dvh",
      background: theme.bg,
      color: theme.text,
      paddingBottom: 96,
    },

    title: {
      marginTop: 20,
      textAlign: "center",
      fontSize: 28,
      fontWeight: 900,
      textTransform: "uppercase",
      letterSpacing: 3,
      color: theme.primary,
      textShadow: `
        0 0 8px ${theme.primary},
        0 0 18px ${theme.primary},
        0 0 28px ${theme.primary}AA
      `,
    },

    /* KPIs */
    kpiRow: {
      marginTop: 20,
      display: "flex",
      gap: 12,
      padding: "0 12px",
    },

    kpiCard: (active: boolean, borderColor: string) => ({
      flex: 1,
      padding: "12px 6px",
      borderRadius: 16,
      cursor: "pointer",
      textAlign: "center",
      background: "linear-gradient(180deg,#15171B,#0F0F11)",
      border: `1px solid ${active ? borderColor : "rgba(255,255,255,0.15)"}`,
      boxShadow: active ? `0 0 14px ${borderColor}` : "none",
    }),

    kpiLabel: {
      fontSize: 11,
      opacity: 0.7,
    },
    kpiValue: {
      marginTop: 4,
      fontSize: 20,
      fontWeight: 900,
    },

    reloadBtn: {
      margin: "14px auto 0 auto",
      padding: "6px 14px",
      fontSize: 13,
      fontWeight: 900,
      borderRadius: 12,
      border: `1px solid ${theme.primary}`,
      background: "rgba(0,0,0,0.4)",
      color: theme.primary,
      display: "block",
      boxShadow: `0 0 10px ${theme.primary}AA`,
    },

    /* Filters */
    filtersRow: {
      marginTop: 18,
      display: "flex",
      gap: 8,
      justifyContent: "center",
      padding: "0 12px",
    },
    filterBtn: (active: boolean) => ({
      padding: "6px 10px",
      fontSize: 12,
      fontWeight: 800,
      borderRadius: 10,
      border: `1px solid ${active ? theme.primary : edge}`,
      background: active
        ? "rgba(255,255,255,0.18)"
        : "rgba(255,255,255,0.06)",
      color: active ? theme.primary : theme.text,
      boxShadow: active ? `0 0 10px ${theme.primary}88` : "none",
      cursor: "pointer",
    }),

    /* List & cards */
    list: {
      marginTop: 20,
      padding: "0 12px",
      display: "grid",
      gap: 14,
    },

    card: {
      background: theme.card,
      borderRadius: 18,
      padding: 14,
      border: `1px solid ${edge}`,
      boxShadow: "0 12px 28px rgba(0,0,0,.4)",
    },

    rowBetween: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },

    /* Avatars */
    avatars: { display: "flex" },
    avWrap: {
      width: 42,
      height: 42,
      borderRadius: "50%",
      overflow: "hidden",
      background: "rgba(255,255,255,.08)",
      border: "2px solid rgba(0,0,0,.4)",
      marginLeft: -8,
    },
    avImg: { width: "100%", height: "100%", objectFit: "cover" },
    avFallback: {
      width: "100%",
      height: "100%",
      display: "grid",
      placeItems: "center",
      fontWeight: 900,
      color: text70,
    },

    pillRow: {
      marginTop: 12,
      display: "flex",
      gap: 8,
    },
    pill: {
      flex: 1,
      padding: "8px 10px",
      textAlign: "center",
      borderRadius: 999,
      fontWeight: 900,
      cursor: "pointer",
      fontSize: 12,
      border: `1px solid ${edge}`,
      background: "rgba(255,255,255,.06)",
    },
    pillGold: {
      color: theme.primary,
      border: `1px solid ${theme.primary}`,
      background: "rgba(0,0,0,.4)",
    },
    pillDanger: {
      color: "#ffbcbc",
      border: `1px solid ${theme.danger}`,
      background: "rgba(255,0,0,.15)",
    },
  };
}

/* ---------------------------------------------
   Component
--------------------------------------------- */

export default function HistoryPage({
  store,
  go,
}: {
  store: Store;
  go: (to: string, params?: any) => void;
}) {
  const { theme } = useTheme();
  const { t } = useLang();
  const S = useMemo(() => makeStyles(theme), [theme]);

  const [tab, setTab] = useState<"done" | "running">("done");
  const [sub, setSub] = useState<RangeKey>("today");
  const [items, setItems] = useState<SavedEntry[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadHistory() {
    setLoading(true);
    try {
      setItems(await HistoryAPI.list(store));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, [store]);

  // tri / dedupe
  const { done, running } = useMemo(() => {
    const fins = items.filter((e) => statusOf(e) === "finished");
    const inprog = items.filter((e) => statusOf(e) !== "finished");
    return {
      done: dedupe(fins),
      running: inprog.sort(
        (a, b) =>
          (b.updatedAt || b.createdAt || 0) -
          (a.updatedAt || a.createdAt || 0)
      ),
    };
  }, [items]);

  const source = tab === "done" ? done : running;
  const filtered = source.filter((e) =>
    inRange(e.updatedAt || e.createdAt, sub)
  );

  async function handleDelete(e: SavedEntry) {
    if (!window.confirm("Supprimer cette partie ?")) return;
    await HistoryAPI.remove(e.id);
    await loadHistory();
  }

  return (
    <div style={S.page}>
      {/* ===== TITLE ===== */}
      <div style={S.title}>HISTORIQUE</div>

      {/* ===== KPIs ===== */}
      <div style={S.kpiRow}>
        {/* SAUVEGARDEES (info only) */}
        <div style={S.kpiCard(false, theme.primary)}>
          <div style={S.kpiLabel}>Sauvegardées</div>
          <div style={S.kpiValue}>{items.length}</div>
        </div>

        {/* TERMINÉES */}
        <div
          style={S.kpiCard(tab === "done", theme.primary)}
          onClick={() => setTab("done")}
        >
          <div style={S.kpiLabel}>Terminées</div>
          <div style={S.kpiValue}>{done.length}</div>
        </div>

        {/* EN COURS */}
        <div
          style={S.kpiCard(tab === "running", theme.danger)}
          onClick={() => setTab("running")}
        >
          <div style={S.kpiLabel}>En cours</div>
          <div style={{ ...S.kpiValue, color: theme.danger }}>{running.length}</div>
        </div>
      </div>

      {/* ===== RELOAD ===== */}
      <button
        style={{
          ...S.reloadBtn,
          opacity: loading ? 0.5 : 1,
        }}
        onClick={() => loadHistory()}
      >
        {loading ? "Chargement..." : "Recharger"}
      </button>

      {/* ===== FILTERS ===== */}
      <div style={S.filtersRow}>
        {[["today", "J"], ["week", "S"], ["month", "M"], ["year", "A"], ["archives", "ARV"]].map(
          ([key, label]) => (
            <div
              key={key}
              style={S.filterBtn(sub === key)}
              onClick={() => setSub(key as RangeKey)}
            >
              {label}
            </div>
          )
        )}
      </div>

      {/* ===== LIST ===== */}
      <div style={S.list}>
        {filtered.length === 0 ? (
          <div style={{ opacity: 0.7, textAlign: "center", marginTop: 20 }}>
            Aucune partie ici.
          </div>
        ) : (
          filtered.map((e) => {
            const inProg = statusOf(e) === "in_progress";
            const key = matchLink(e) || e.id;

            return (
              <div key={key} style={S.card}>
                {/* Top row */}
                <div style={S.rowBetween}>
                  <div style={{ display: "flex", gap: 8 }}>
                    {/* MODE BADGE coloré */}
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 800,
                        background: getModeColor(e) + "22",
                        border: `1px solid ${getModeColor(e)}99`,
                        color: getModeColor(e),
                        textShadow: "0 0 4px rgba(0,0,0,0.6)",
                      }}
                    >
                      {modeLabel(e)}
                    </span>

                    {/* STATUT stylé */}
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 800,
                        background: inProg ? "rgba(255,0,0,0.1)" : getModeColor(e) + "22",
                        border: "1px solid " + (inProg ? theme.danger : getModeColor(e)),
                        color: inProg ? theme.danger : getModeColor(e),
                        textShadow: "0 0 4px rgba(0,0,0,0.6)",
                      }}
                    >
                      {inProg ? "En cours" : "Terminé"}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: theme.primary }}>
                    {fmtDate(e.updatedAt || e.createdAt)}
                  </span>
                </div>

                {/* FORMAT + SCORE / CLASSEMENT */}
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "rgba(255,255,255,0.9)",
                  }}
                >
                  {detectFormat(e)}
                  {(() => {
                    const s = summarizeScore(e);
                    return s ? " • " + s : "";
                  })()}
                </div>

                {/* Avatars & Winner */}
                <div style={{ ...S.rowBetween, marginTop: 10 }}>
                  <div style={S.avatars}>
                    {(e.players || []).slice(0, 6).map((p, i) => {
                      const nm = getName(p);
                      const url = getAvatarUrl(store, p);
                      return (
                        <div
                          key={i}
                          style={{ ...S.avWrap, marginLeft: i === 0 ? 0 : -8 }}
                        >
                          {url ? (
                            <img src={url} style={S.avImg} />
                          ) : (
                            <div style={S.avFallback}>{nm.slice(0, 2)}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {inProg ? (
                    <div style={{ opacity: 0.7 }}>À reprendre</div>
                  ) : e.winnerName ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: theme.primary,
                      }}
                    >
                      <Icon.Trophy /> {e.winnerName}
                    </div>
                  ) : null}
                </div>

                {/* Buttons */}
                <div style={S.pillRow}>
                  {inProg ? (
                    <>
                      <div
                        style={{ ...S.pill, ...S.pillGold }}
                        onClick={() =>
                          go("x01", {
                            resumeId: e.id,
                            players: e.players || [],
                          })
                        }
                      >
                        <Icon.Play /> Reprendre
                      </div>

                      <div
                        style={S.pill}
                        onClick={() =>
                          go("x01", {
                            resumeId: e.id,
                            players: e.players || [],
                            preview: true,
                          })
                        }
                      >
                        <Icon.Eye /> Voir
                      </div>
                    </>
                  ) : (
                    <div
                      style={{ ...S.pill, ...S.pillGold }}
                      onClick={() =>
                        go("x01_end", {
                          rec: e,
                          resumeId: e.id,
                          showEnd: true,
                          from: "history",
                        })
                      }
                    >
                      <Icon.Eye /> Voir stats
                    </div>
                  )}

                  <div
                    style={{ ...S.pill, ...S.pillDanger }}
                    onClick={() => handleDelete(e)}
                  >
                    <Icon.Trash /> Supprimer
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------
   Date format
--------------------------------------------- */

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString();
}
