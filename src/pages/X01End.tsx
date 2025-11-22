// ============================================
// src/pages/X01End.tsx
// Fin de partie X01 — stats par joueur (colonnes = joueurs)
// Version allégée, sûre niveau syntaxe
// ============================================
import React from "react";
import { History } from "../lib/history";
import EndOfLegOverlay from "../components/EndOfLegOverlay";

/* ==========================
   Types simples
========================== */
type PlayerLite = {
  id: string;
  name?: string;
  avatarDataUrl?: string | null;
};

type Props = {
  go: (tab: string, params?: any) => void;
  params?: {
    matchId?: string;
    resumeId?: string | null;
    rec?: any;
    showEnd?: boolean;
  };
};

type PlayerMetrics = {
  id: string;
  name: string;
  darts: number;
  avg3: number;
  bestVisit: number;
  bestCO: number;
  visits: number;
  points: number;
  t60: number;
  t100: number;
  t140: number;
  t180: number;
};

type Col = { key: string; title: string };
type RowDef = { label: string; get: (m: PlayerMetrics) => string | number };

const D = {
  fsBody: 12,
  fsHead: 12,
  padCellV: 6,
  padCellH: 10,
  cardPad: 10,
  radius: 14,
};

const mobileDenseCss = `
@media (max-width: 420px){
  .x-end h2{ font-size:16px; }
  .x-card h3{ font-size:13px; }
  .x-table{ font-size:11px; }
  .x-th, .x-td{ padding:4px 6px; }
}
`;

/* ==========================
   Composant principal
========================== */
export default function X01End({ go, params }: Props) {
  const [rec, setRec] = React.useState<any | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // Overlay optionnel (résumé rapide de manche)
  const [overlayOpen, setOverlayOpen] = React.useState<boolean>(
    !!params?.showEnd
  );
  const [overlayResult, setOverlayResult] = React.useState<any | null>(null);
  const [playersById, setPlayersById] = React.useState<
    Record<string, PlayerLite>
  >({});

  // Chargement de l’enregistrement
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (params?.rec) {
          if (mounted) setRec(params.rec);
          return;
        }

        if (params?.matchId && (History as any)?.get) {
          const row = await (History as any).get(params.matchId);
          if (mounted && row) {
            setRec(row);
            return;
          }
        }

        // Fallback : dernier finished en mémoire
        const mem = (window as any)?.__appStore?.history as any[] | undefined;
        if (mem?.length) {
          const lastFin = mem.find(
            (r) => String(r?.status).toLowerCase() === "finished"
          );
          if (mounted && lastFin) {
            setRec(lastFin);
            return;
          }
        }

        if (mounted) setErr("Impossible de charger l'enregistrement.");
      } catch (e) {
        console.warn("[X01End] load error:", e);
        if (mounted) setErr("Erreur de chargement.");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [params?.matchId, params?.rec]);

  const finished = normalizeStatus(rec ?? {}) === "finished";
  const when = n(rec?.updatedAt ?? rec?.createdAt ?? Date.now());
  const dateStr = new Date(when).toLocaleString();

  const players: PlayerLite[] = React.useMemo(() => {
    if (!rec) return [];
    const base =
      rec.players?.length > 0 ? rec.players : rec.payload?.players || [];
    return base.map((p: any) => ({
      id: p.id,
      name: p.name || "—",
      avatarDataUrl: p.avatarDataUrl ?? null,
    }));
  }, [rec]);

  React.useEffect(() => {
    if (!players.length) return;
    setPlayersById(
      Object.fromEntries(players.map((p) => [p.id, p])) as Record<
        string,
        PlayerLite
      >
    );
  }, [players]);

  const winnerId: string | null =
    rec?.winnerId ?? rec?.payload?.winnerId ?? rec?.summary?.winnerId ?? null;
  const winnerName =
    (winnerId && players.find((p) => p.id === winnerId)?.name) || null;

  const metricsMap = React.useMemo(
    () => buildPerPlayerMetrics(rec, players),
    [rec, players]
  );

  const cols: Col[] = players.map((p) => ({
    key: p.id,
    title: p.name || "—",
  }));

  const resumeId =
    params?.resumeId ?? rec?.resumeId ?? rec?.payload?.resumeId ?? null;

  // Overlay simple basé sur les métriques (optionnel)
  React.useEffect(() => {
    if (!params?.showEnd || !players.length || !rec) return;

    const ids = players.map((p) => p.id);
    const remaining = idMap(ids, 0);
    const darts = idMap(ids, 0);
    const visits = idMap(ids, 0);
    const avg3 = idMap(ids, 0);
    const bestVisit = idMap(ids, 0);
    const bestCheckout = idMap(ids, 0);
    const h60 = idMap(ids, 0);
    const h100 = idMap(ids, 0);
    const h140 = idMap(ids, 0);
    const h180 = idMap(ids, 0);

    for (const id of ids) {
      const m = metricsMap[id];
      if (!m) continue;
      darts[id] = m.darts;
      visits[id] = m.visits;
      avg3[id] = m.avg3;
      bestVisit[id] = m.bestVisit;
      bestCheckout[id] = m.bestCO;
      h60[id] = m.t60;
      h100[id] = m.t100;
      h140[id] = m.t140;
      h180[id] = m.t180;
      remaining[id] = 0;
    }

    const order = [...ids].sort((a, b) => avg3[b] - avg3[a]);

    setOverlayResult({
      legNo: 1,
      winnerId: winnerId ?? order[0] ?? ids[0],
      order,
      finishedAt: rec.updatedAt ?? Date.now(),
      remaining,
      darts,
      visits,
      avg3,
      bestVisit,
      bestCheckout,
      h60,
      h100,
      h140,
      h180,
      miss: idMap(ids, 0),
      missPct: idMap(ids, 0),
      bust: idMap(ids, 0),
      bustPct: idMap(ids, 0),
      dbull: idMap(ids, 0),
      dbullPct: idMap(ids, 0),
      doubles: idMap(ids, 0),
      triples: idMap(ids, 0),
      bulls: idMap(ids, 0),
    });
  }, [params?.showEnd, players, rec, metricsMap, winnerId]);

  // Rendu
  if (err)
    return (
      <Shell go={go} title="Fin de partie">
        <Notice>{err}</Notice>
      </Shell>
    );

  if (!rec)
    return (
      <Shell go={go}>
        <Notice>Chargement…</Notice>
      </Shell>
    );

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    fontSize: D.fsBody,
  };

  const rowsVolumes: RowDef[] = [
    { label: "Avg/3D", get: (m) => f2(m.avg3) },
    { label: "Darts", get: (m) => f0(m.darts) },
    { label: "Visits", get: (m) => f0(m.visits) },
    { label: "Points", get: (m) => f0(m.points) },
    { label: "Best visit", get: (m) => f0(m.bestVisit) },
    { label: "Best CO", get: (m) => f0(m.bestCO) },
    {
      label: "Score/visit",
      get: (m) => (m.visits > 0 ? f2(m.points / m.visits) : "—"),
    },
  ];

  const rowsPower: RowDef[] = [
    { label: "60+", get: (m) => f0(m.t60) },
    { label: "100+", get: (m) => f0(m.t100) },
    { label: "140+", get: (m) => f0(m.t140) },
    { label: "180", get: (m) => f0(m.t180) },
    {
      label: "Tons (Σ)",
      get: (m) => f0(m.t60 + m.t100 + m.t140 + m.t180),
    },
  ];

  return (
    <Shell
      go={go}
      title={
        ((rec?.kind === "x01" || rec?.kind === "leg"
          ? "LEG"
          : String(rec?.kind || "Fin").toUpperCase()) +
          " — " +
          dateStr) as string
      }
      canResume={!!resumeId && !finished}
      resumeId={resumeId}
    >
      <style dangerouslySetInnerHTML={{ __html: mobileDenseCss }} />

      {/* Bandeau joueurs */}
      <Panel>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              color: "#e8e8ec",
              fontSize: 12,
            }}
          >
            Joueurs :{" "}
            {players.map((p) => p.name || "—").join(" · ") || "—"}
          </div>
          {winnerName ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "#ffcf57",
                fontWeight: 900,
              }}
            >
              <Trophy />
              <span>{winnerName}</span>
            </div>
          ) : null}
        </div>
      </Panel>

      {/* Volumes */}
      <CardTable title="Volumes">
        <TableColMajor
          columns={cols}
          rows={rowsVolumes}
          dataMap={metricsMap}
          tableStyle={tableStyle}
        />
      </CardTable>

      {/* Power scoring */}
      <CardTable title="Power scoring">
        <TableColMajor
          columns={cols}
          rows={rowsPower}
          dataMap={metricsMap}
          tableStyle={tableStyle}
        />
      </CardTable>

      {/* Overlay fin (optionnel) */}
      {overlayOpen && overlayResult && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
          <EndOfLegOverlay
            open={overlayOpen}
            result={overlayResult}
            playersById={playersById}
            onClose={() => setOverlayOpen(false)}
            onReplay={() => setOverlayOpen(false)}
            onSave={() => setOverlayOpen(false)}
          />
        </div>
      )}
    </Shell>
  );
}

/* ==========================
   Construction métriques
========================== */
function emptyMetrics(p: PlayerLite): PlayerMetrics {
  return {
    id: p.id,
    name: p.name || "—",
    darts: 0,
    avg3: 0,
    bestVisit: 0,
    bestCO: 0,
    visits: 0,
    points: 0,
    t60: 0,
    t100: 0,
    t140: 0,
    t180: 0,
  };
}

function buildPerPlayerMetrics(
  rec: any,
  players: PlayerLite[]
): Record<string, PlayerMetrics> {
  const out: Record<string, PlayerMetrics> = {};
  if (!rec || !players.length) return out;

  const summary = rec.summary?.kind === "x01" ? rec.summary : null;
  const legacy = rec.payload || rec;

  for (const pl of players) {
    const pid = pl.id;
    const m = emptyMetrics(pl);

    // Summary moderne
    const s = summary?.players?.[pid];
    if (s) {
      m.avg3 = n(s.avg3);
      m.bestVisit = n(s.bestVisit);
      m.bestCO = n(s.bestCheckout);
      m.darts = n(s.darts);
      m.points = n(s._sumPoints, (m.avg3 / 3) * m.darts);
      m.visits = s._sumVisits ? n(s._sumVisits) : m.darts ? Math.ceil(m.darts / 3) : 0;
      const b = s.buckets || {};
      m.t180 = n(b["180"]);
      m.t140 = n(b["140+"]);
      m.t100 = n(b["100+"]);
      m.t60 = n(b["60+"]);
    }

    // Fallback legacy
    if (!m.avg3) m.avg3 = n(pick(legacy, [`avg3.${pid}`, `avg3d.${pid}`]), 0);
    if (!m.darts) m.darts = n(pick(legacy, [`darts.${pid}`, `dartsThrown.${pid}`]), 0);
    if (!m.points)
      m.points = n(
        pick(legacy, [`pointsScored.${pid}`, `points.${pid}`]),
        (m.avg3 / 3) * m.darts
      );
    if (!m.visits)
      m.visits = n(pick(legacy, [`visits.${pid}`]), m.darts ? Math.ceil(m.darts / 3) : 0);
    if (!m.bestVisit) m.bestVisit = n(pick(legacy, [`bestVisit.${pid}`]), 0);
    if (!m.bestCO)
      m.bestCO = sanitizeCO(
        pick(legacy, [`bestCheckout.${pid}`, `highestCheckout.${pid}`, `bestCO.${pid}`])
      );

    if (!m.t180) m.t180 = n(pick(legacy, [`h180.${pid}`, `t180.${pid}`]), 0);
    if (!m.t140) m.t140 = n(pick(legacy, [`h140.${pid}`, `t140.${pid}`]), 0);
    if (!m.t100) m.t100 = n(pick(legacy, [`h100.${pid}`, `t100.${pid}`]), 0);
    if (!m.t60) m.t60 = n(pick(legacy, [`h60.${pid}`, `t60.${pid}`]), 0);

    out[pid] = m;
  }

  return out;
}

/* ==========================
   Table simple col-major
========================== */
function TableColMajor({
  columns,
  rows,
  dataMap,
  tableStyle,
}: {
  columns: Col[];
  rows: RowDef[];
  dataMap: Record<string, PlayerMetrics>;
  tableStyle?: React.CSSProperties;
}) {
  return (
    <div
      className="x-table"
      style={{
        overflowX: "auto",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: D.radius,
      }}
    >
      <table style={tableStyle}>
        <thead>
          <tr>
            <th className="x-th" style={thStyle(true)}>
              Stat
            </th>
            {columns.map((c) => (
              <th key={c.key} className="x-th" style={thStyle(false)}>
                <span style={{ fontWeight: 900, color: "#ffcf57" }}>
                  {c.title}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx}>
              <td className="x-td" style={tdStyle(true)}>
                {r.label}
              </td>
              {columns.map((c) => {
                const m = dataMap[c.key] || emptyMetrics({ id: c.key });
                return (
                  <td key={c.key} className="x-td" style={tdStyle(false)}>
                    {r.get(m)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ==========================
   UI de base
========================== */
function Shell({
  go,
  title,
  children,
  canResume,
  resumeId,
}: {
  go: (t: string, p?: any) => void;
  title?: string;
  children?: React.ReactNode;
  canResume?: boolean;
  resumeId?: string | null;
}) {
  return (
    <div
      className="x-end"
      style={{ padding: 12, maxWidth: 640, margin: "0 auto" }}
    >
      <button onClick={() => go("stats", { tab: "history" })} style={btn()}>
        ← Retour
      </button>
      <h2 style={{ margin: "10px 0 8px", letterSpacing: 0.3 }}>
        {title || "Fin de partie"}
      </h2>
      {children}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={() => go("stats", { tab: "history" })} style={btn()}>
          ← Historique
        </button>
        {canResume && resumeId ? (
          <button onClick={() => go("x01", { resumeId })} style={btnGold()}>
            Reprendre
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Panel({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        padding: D.cardPad,
        borderRadius: D.radius,
        border: "1px solid rgba(255,255,255,.08)",
        background:
          "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.06), transparent 55%), linear-gradient(180deg, rgba(22,22,26,.96), rgba(14,14,16,.98))",
        boxShadow: "0 18px 46px rgba(0,0,0,.35)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardTable({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Panel className="x-card" style={{ padding: D.cardPad }}>
      <h3
        style={{
          margin: "0 0 6px",
          fontSize: D.fsHead + 1,
          letterSpacing: 0.2,
          color: "#ffcf57",
        }}
      >
        {title}
      </h3>
      {children}
    </Panel>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <Panel>
      <div style={{ color: "#bbb" }}>{children}</div>
    </Panel>
  );
}

function Trophy(props: any) {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} {...props}>
      <path
        fill="currentColor"
        d="M6 2h12v2h3a1 1 0 0 1 1 1v1a5 5 0 0 1-5 5h-1.1A6 6 0 0 1 13 13.9V16h3v2H8v-2h3v-2.1A6 6 0 0 1 8.1 11H7A5 5 0 0 1 2 6V5a1 1 0 0 1 1-1h3V2Z"
      />
    </svg>
  );
}

/* ==========================
   Styles cellules
========================== */
function thStyle(isRowHeader: boolean): React.CSSProperties {
  return {
    textAlign: isRowHeader ? "left" : "right",
    padding: `${D.padCellV}px ${D.padCellH}px`,
    color: "#ffcf57",
    fontWeight: 800,
    background: "rgba(255,255,255,.04)",
    whiteSpace: "nowrap",
  };
}

function tdStyle(isRowHeader: boolean): React.CSSProperties {
  return {
    textAlign: isRowHeader ? "left" : "right",
    padding: `${D.padCellV}px ${D.padCellH}px`,
    color: "#e8e8ec",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
    borderTop: "1px solid rgba(255,255,255,.05)",
  };
}

/* ==========================
   Utils
========================== */
function idMap(ids: string[], val: number) {
  return Object.fromEntries(ids.map((id) => [id, val])) as Record<string, number>;
}

function normalizeStatus(rec: any): "finished" | "in_progress" {
  const raw = String(rec?.status ?? rec?.payload?.status ?? "").toLowerCase();
  if (raw === "finished") return "finished";
  if (raw === "inprogress" || raw === "in_progress") return "in_progress";
  const sum = rec?.summary ?? rec?.payload ?? {};
  if (sum?.finished === true || sum?.result?.finished === true) return "finished";
  return "in_progress";
}

function sanitizeCO(v: any): number {
  const num = Number(v);
  if (!Number.isFinite(num)) return 0;
  const r = Math.round(num);
  if (r === 50) return 50;
  if (r >= 2 && r <= 170) return r;
  return 0;
}

function btn(): React.CSSProperties {
  return {
    borderRadius: 10,
    padding: "6px 10px",
    border: "1px solid rgba(255,255,255,.12)",
    background: "transparent",
    color: "#e8e8ec",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 12,
  };
}

function btnGold(): React.CSSProperties {
  return {
    borderRadius: 10,
    padding: "6px 10px",
    border: "1px solid rgba(255,180,0,.3)",
    background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
    color: "#141417",
    fontWeight: 900,
    boxShadow: "0 10px 22px rgba(255,170,0,.28)",
    fontSize: 12,
  };
}

function n(x: any, d = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? v : d;
}

function f2(x: any) {
  const v = Number(x);
  return Number.isFinite(v) ? v.toFixed(2) : "0.00";
}

function f0(x: any) {
  const v = Number(x);
  return Number.isFinite(v) ? (v | 0) : 0;
}

function pick(obj: any, paths: string[], def?: any) {
  for (const p of paths) {
    try {
      const segs = p.split(".");
      let cur: any = obj;
      let ok = true;
      for (const s of segs) {
        if (cur == null) {
          ok = false;
          break;
        }
        if (s in cur) cur = cur[s];
        else {
          ok = false;
          break;
        }
      }
      if (ok) return cur;
    } catch {
      /* ignore */
    }
  }
  return def;
}
