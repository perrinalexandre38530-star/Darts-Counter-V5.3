// ============================================
// src/pages/TrainingX01Play.tsx
// X01 solo — Training compact + Radar + Sparkline overlay
// ============================================

import React from "react";
import Keypad from "../components/Keypad";
import type { Dart as UIDart, Profile } from "../lib/types";
import { playSound } from "../lib/sound";
import { useCurrentProfile } from "../hooks/useCurrentProfile";
import { TrainingStore } from "../lib/TrainingStore";

const NAV_HEIGHT = 64; // hauteur du BottomNav (approx)

// --------------------------------------------------
// TYPES
// --------------------------------------------------

export type MetricKey =
  | "darts"
  | "avg3D"
  | "pctS"
  | "pctD"
  | "pctT"
  | "bestVisit"
  | "checkout";

export type RangeKey = "day" | "week" | "month" | "year";

export type TrainingFinishStats = {
  date: number;
  darts: number;
  avg3D: number;
  pctS: number;
  pctD: number;
  pctT: number;
  bestVisit: number;
  checkout: number;
};

export type HitMap = Record<string, number>;

export type SparkPoint = {
  date: number;
  value: number;
};

// --------------------------------------------------
// CONSTANTES
// --------------------------------------------------

export const START_CHOICES = [301, 501, 701, 901] as const;
export const OUT_CHOICES = ["simple", "double", "master"] as const;

export const SEGMENTS: number[] = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
  3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 25,
];

// --------------------------------------------------
// HELPERS — DARTS
// --------------------------------------------------

export function dartValue(d: UIDart) {
  if (!d) return 0;
  if (d.v === 25 && d.mult === 2) return 50;
  if (d.v === 25) return 25;
  if (d.v === 0) return 0;
  return d.v * d.mult;
}

export function throwTotal(throwDarts: UIDart[]) {
  return (throwDarts || []).reduce((acc, d) => acc + dartValue(d), 0);
}

// --------------------------------------------------
// HELPERS — OUTPUT MODE / BUST LOGIC
// --------------------------------------------------

export function isValidOut(
  d: UIDart,
  outMode: "simple" | "double" | "master"
): boolean {
  if (!d) return false;
  const val = dartValue(d);

  if (outMode === "simple") {
    return val > 0;
  }

  if (outMode === "double") {
    if (d.v === 25 && d.mult === 2) return true; // DBULL
    return d.mult === 2;
  }

  if (outMode === "master") {
    if (d.v === 25 && d.mult === 2) return true;
    if (d.mult === 2 || d.mult === 3) return true;
    return false;
  }

  return false;
}

// --------------------------------------------------
// HELPERS — CHIP DESIGN
// --------------------------------------------------

export function chipBg(d?: UIDart) {
  if (!d) {
    return "linear-gradient(180deg,#222227,#111117)";
  }

  if (d.v === 25) {
    if (d.mult === 2) {
      return "linear-gradient(180deg,#ffcf61,#c17b0c)";
    }
    return "linear-gradient(180deg,#0ca86b,#05563c)";
  }

  if (d.mult === 3) {
    return "linear-gradient(180deg,#5a2a7a,#37154c)";
  }
  if (d.mult === 2) {
    return "linear-gradient(180deg,#106a6a,#043c3f)";
  }
  return "linear-gradient(180deg,#ffcf61,#c17b0c)";
}

export function chipLabel(d?: UIDart): string {
  if (!d) return "—";
  if (d.v === 0) return "MISS";
  if (d.v === 25) return d.mult === 2 ? "DBULL" : "BULL";
  const prefix = d.mult === 2 ? "D" : d.mult === 3 ? "T" : "S";
  return `${prefix}${d.v}`;
}

// --------------------------------------------------
// HELPERS — AVG / PERCENT
// --------------------------------------------------

export function percent(part: number, total: number): string {
  if (total <= 0) return "0.0%";
  return ((part / total) * 100).toFixed(1) + "%";
}

// --------------------------------------------------
// SPARKLINE HELPERS
// --------------------------------------------------

export function filterByRange(
  items: TrainingFinishStats[],
  range: RangeKey
): TrainingFinishStats[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  let span = 7;
  if (range === "day") span = 1;
  if (range === "month") span = 30;
  if (range === "year") span = 365;

  const minDate = now - span * day;
  return items.filter((x) => x.date >= minDate);
}

export function getMetricValue(
  item: TrainingFinishStats,
  key: MetricKey
): number {
  switch (key) {
    case "darts":
      return item.darts;
    case "avg3D":
      return item.avg3D;
    case "pctS":
      return item.pctS;
    case "pctD":
      return item.pctD;
    case "pctT":
      return item.pctT;
    case "bestVisit":
      return item.bestVisit;
    case "checkout":
      return item.checkout;
    default:
      return 0;
  }
}

// ============================================
// RadarHitChart — cible précision
// ============================================

function RadarHitChart({ hitMap }: { hitMap: HitMap }) {
  const size = 120;
  const center = size / 2;
  const maxRadius = size / 2 - 12;

  const values = SEGMENTS.map((key) => hitMap[String(key)] ?? 0);
  const maxVal = Math.max(...values, 1);

  const polygonPoints = SEGMENTS.map((key, idx) => {
    const v = hitMap[String(key)] ?? 0;
    const ratio = v / maxVal;
    const radius = maxRadius * ratio;
    const angle = (Math.PI * 2 * idx) / SEGMENTS.length - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const guideRings = [0.4, 0.7, 1];

  return (
    <svg
      width={size}
      height={size}
      style={{
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 50% 50%, #1d1d21 0%, #050507 70%, #000000 100%)",
        boxShadow: "0 0 16px rgba(0,0,0,0.7)",
      }}
    >
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe69b" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#ffb800" stopOpacity="0.35" />
        </radialGradient>
      </defs>

      {guideRings.map((r, i) => (
        <circle
          key={i}
          cx={center}
          cy={center}
          r={maxRadius * r}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
          fill="none"
        />
      ))}

      {SEGMENTS.map((_key, idx) => {
        const angle = (Math.PI * 2 * idx) / SEGMENTS.length - Math.PI / 2;
        const x = center + maxRadius * Math.cos(angle);
        const y = center + maxRadius * Math.sin(angle);
        return (
          <line
            key={"r" + idx}
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        );
      })}

      <polygon
        points={polygonPoints}
        fill="url(#radarFill)"
        stroke="#ffcc55"
        strokeWidth={1.3}
        strokeLinejoin="round"
      />

      {SEGMENTS.map((key, idx) => {
        const angle = (Math.PI * 2 * idx) / SEGMENTS.length - Math.PI / 2;
        const radius = maxRadius + 8;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle) + 3;
        return (
          <text
            key={"lbl" + key}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize={8}
            fontWeight={600}
            fill="rgba(245,245,255,0.9)"
          >
            {key}
          </text>
        );
      })}
    </svg>
  );
}

// ============================================
// Sparkline PRO (utilisée dans overlay Progression)
// ============================================

function SparkChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "2px 8px",
        borderRadius: 999,
        border: active
          ? "1px solid rgba(255,200,90,0.9)"
          : "1px solid rgba(255,255,255,0.16)",
        background: active
          ? "linear-gradient(180deg,#ffcf61,#c17b0c)"
          : "rgba(10,10,12,0.95)",
        color: active ? "#221600" : "rgba(225,225,240,0.9)",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function TimeSelector({
  range,
  onChange,
}: {
  range: RangeKey;
  onChange: (r: RangeKey) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <SparkChip
        label="J"
        active={range === "day"}
        onClick={() => onChange("day")}
      />
      <SparkChip
        label="S"
        active={range === "week"}
        onClick={() => onChange("week")}
      />
      <SparkChip
        label="M"
        active={range === "month"}
        onClick={() => onChange("month")}
      />
      <SparkChip
        label="A"
        active={range === "year"}
        onClick={() => onChange("year")}
      />
    </div>
  );
}

function MetricSelector({
  metric,
  onChange,
}: {
  metric: MetricKey;
  onChange: (m: MetricKey) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        marginTop: 8,
      }}
    >
      <SparkChip
        label="Darts"
        active={metric === "darts"}
        onClick={() => onChange("darts")}
      />
      <SparkChip
        label="3D"
        active={metric === "avg3D"}
        onClick={() => onChange("avg3D")}
      />
      <SparkChip
        label="%S"
        active={metric === "pctS"}
        onClick={() => onChange("pctS")}
      />
      <SparkChip
        label="%D"
        active={metric === "pctD"}
        onClick={() => onChange("pctD")}
      />
      <SparkChip
        label="%T"
        active={metric === "pctT"}
        onClick={() => onChange("pctT")}
      />
      <SparkChip
        label="BV"
        active={metric === "bestVisit"}
        onClick={() => onChange("bestVisit")}
      />
      <SparkChip
        label="CO"
        active={metric === "checkout"}
        onClick={() => onChange("checkout")}
      />
    </div>
  );
}

function Sparkline({
  sessions,
  range,
  metric,
  onRangeChange,
  onMetricChange,
}: {
  sessions: TrainingFinishStats[];
  range: RangeKey;
  metric: MetricKey;
  onRangeChange: (r: RangeKey) => void;
  onMetricChange: (m: MetricKey) => void;
}) {
  const filtered = filterByRange(sessions, range);

  const width = 320;
  const height = 90;
  const padX = 16;
  const padY = 12;

  if (filtered.length === 0) {
    return (
      <div
        style={{
          padding: "10px 12px 12px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.12)",
          background:
            "linear-gradient(180deg,rgba(12,12,18,0.98),rgba(7,7,11,0.98))",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4,
            fontSize: 12,
            color: "rgba(225,225,240,0.9)",
          }}
        >
          <span>Progression</span>
          <TimeSelector range={range} onChange={onRangeChange} />
        </div>

        <MetricSelector metric={metric} onChange={onMetricChange} />

        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "rgba(200,200,220,0.75)",
            textAlign: "center",
          }}
        >
          Aucune partie terminée sur cette période.
        </div>
      </div>
    );
  }

  const minTs = Math.min(...filtered.map((s) => s.date));
  const maxTs = Math.max(...filtered.map((s) => s.date));
  const minY = Math.min(...filtered.map((s) => getMetricValue(s, metric)));
  const maxY = Math.max(...filtered.map((s) => getMetricValue(s, metric)));
  const spanTs = maxTs - minTs || 1;
  const spanY = maxY - minY || 1;

  const points = filtered.map((s) => {
    const x =
      padX + ((s.date - minTs) / spanTs) * (width - padX * 2);
    const y =
      height -
      padY -
      ((getMetricValue(s, metric) - minY) / spanY) *
        (height - padY * 2);
    return { x, y, ...s };
  });

  const poly = points
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const last = points[points.length - 1];

  function formatDate(ts: number) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
    });
  }

  return (
    <div
      style={{
        padding: "10px 12px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(180deg,rgba(12,12,18,0.98),rgba(7,7,11,0.98))",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
          fontSize: 12,
          color: "rgba(225,225,240,0.9)",
        }}
      >
        <span>Progression</span>
        <TimeSelector range={range} onChange={onRangeChange} />
      </div>

      <MetricSelector metric={metric} onChange={onMetricChange} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 8,
        }}
      >
        <svg width={width} height={height}>
          <line
            x1={padX}
            y1={height - padY}
            x2={width - padX}
            y2={height - padY}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
          />

          <polyline
            points={poly}
            fill="none"
            stroke="#ffcf61"
            strokeWidth={1.8}
          />

          <circle
            cx={last.x}
            cy={last.y}
            r={4}
            fill="#ffcf61"
            stroke="#3b2600"
            strokeWidth={1}
          />
        </svg>

        <div
          style={{
            fontSize: 12,
            color: "#ffcf61",
            fontWeight: 700,
            minWidth: 110,
            textAlign: "right",
          }}
        >
          {getMetricValue(last, metric).toFixed(1)} — {formatDate(last.date)}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Mini tableau stats (S1 optimisé)
// ============================================

function TrainingStatsTable({
  avg3D,
  avg1D,
  bestVisit,
  darts,
  hitRate,
  pctS,
  pctD,
  pctT,
  miss,
  bull,
  dbull,
  bust,
}: {
  avg3D: string;
  avg1D: string;
  bestVisit: number;
  darts: number;
  hitRate: string;
  pctS: string;
  pctD: string;
  pctT: string;
  miss: number;
  bull: number;
  dbull: number;
  bust: number;
}) {
  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 11,
  };

  const labelStyle: React.CSSProperties = {
    color: "#ffcf61",
    fontWeight: 700,
  };

  const valueStyle: React.CSSProperties = {
    color: "#ffffff",
    fontWeight: 700,
  };

  const sepStyle: React.CSSProperties = {
    height: 1,
    margin: "4px 0",
    background:
      "linear-gradient(90deg,rgba(255,207,97,0.0),rgba(255,207,97,0.55),rgba(193,123,12,0.5),rgba(255,207,97,0.0))",
  };

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {/* Moy.3D */}
      <div style={rowStyle}>
        <span style={labelStyle}>Moy.3D</span>
        <span style={valueStyle}>{avg3D}</span>
      </div>
      <div style={sepStyle} />

      {/* Moy.1D */}
      <div style={rowStyle}>
        <span style={labelStyle}>Moy.1D</span>
        <span style={valueStyle}>{avg1D}</span>
      </div>
      <div style={sepStyle} />

      {/* Best Visit */}
      <div style={rowStyle}>
        <span style={labelStyle}>Best Visit</span>
        <span style={valueStyle}>{bestVisit}</span>
      </div>

      <div
        style={{
          height: 1,
          margin: "6px 0 4px",
          background:
            "linear-gradient(90deg,rgba(255,207,97,0.0),rgba(255,207,97,0.7),rgba(193,123,12,0.7),rgba(255,207,97,0.0))",
        }}
      />

      {/* Darts / %Hits */}
      <div style={rowStyle}>
        <span style={labelStyle}>Darts</span>
        <span style={valueStyle}>{darts}</span>
      </div>
      <div style={sepStyle} />
      <div style={rowStyle}>
        <span style={labelStyle}>%Hits</span>
        <span style={valueStyle}>{hitRate}</span>
      </div>

      <div
        style={{
          height: 1,
          margin: "6px 0 4px",
          background:
            "linear-gradient(90deg,rgba(255,207,97,0.0),rgba(255,207,97,0.7),rgba(193,123,12,0.7),rgba(255,207,97,0.0))",
        }}
      />

      {/* S / D / T */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 4,
          fontSize: 10.5,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={labelStyle}>S%</div>
          <div style={valueStyle}>{pctS}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={labelStyle}>D%</div>
          <div style={valueStyle}>{pctD}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={labelStyle}>T%</div>
          <div style={valueStyle}>{pctT}</div>
        </div>
      </div>

      <div
        style={{
          height: 1,
          margin: "6px 0 4px",
          background:
            "linear-gradient(90deg,rgba(255,207,97,0.0),rgba(255,207,97,0.7),rgba(193,123,12,0.7),rgba(255,207,97,0.0))",
        }}
      />

      {/* Miss / Bull / DBull / Bust */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 4,
          fontSize: 10.5,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={labelStyle}>Miss</div>
          <div style={valueStyle}>{miss}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={labelStyle}>Bull</div>
          <div style={valueStyle}>{bull}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={labelStyle}>DBull</div>
          <div style={valueStyle}>{dbull}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={labelStyle}>Bust</div>
          <div style={valueStyle}>{bust}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Volée en cours — 3 chips + total
// ============================================

function ThrowPreviewBar({ darts }: { darts: UIDart[] }) {
  const total = throwTotal(darts);

  return (
    <div
      style={{
        marginTop: 8,
        paddingTop: 6,
        borderTop: "1px solid rgba(255,255,255,0.09)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#ffcf61",
          fontWeight: 700,
          marginBottom: 4,
          textAlign: "center",
        }}
      >
        Volée
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {[0, 1, 2].map((idx) => {
            const d = darts[idx];
            const label = chipLabel(d);
            return (
              <div
                key={"chip" + idx}
                style={{
                  minWidth: 40,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: chipBg(d),
                  boxShadow: d
                    ? "0 4px 12px rgba(0,0,0,0.7)"
                    : "0 2px 8px rgba(0,0,0,0.6)",
                  border: d
                    ? "1px solid rgba(0,0,0,0.4)"
                    : "1px solid rgba(255,255,255,0.06)",
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: d ? "#fff7dc" : "rgba(180,180,190,0.75)",
                  textAlign: "center",
                }}
              >
                {label}
              </div>
            );
          })}
        </div>

        <div
          style={{
            minWidth: 40,
            padding: "4px 8px",
            borderRadius: 8,
            background: "#050506",
            border: "1px solid #ffcf61",
            boxShadow:
              "0 0 12px rgba(255,195,80,0.6), 0 0 0 1px rgba(0,0,0,0.9)",
            textAlign: "center",
            fontSize: 13,
            fontWeight: 900,
            color: "#ffcf61",
          }}
        >
          {total}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Composant principal
// ============================================

export default function TrainingX01Play({
  go,
}: {
  go?: (tab: any, p?: any) => void;
}) {
  // --------------------------------------------------
  // PROFIL COURANT + AVATAR
  // --------------------------------------------------
  const currentProfile = useCurrentProfile() as Profile | null;

  let avatarSrc: string | null = null;
  if (currentProfile) {
    const p = currentProfile as any;

    // 1. Clés les plus probables
    if (typeof p.avatarUrl === "string") {
      avatarSrc = p.avatarUrl;
    } else if (typeof p.avatar === "string") {
      avatarSrc = p.avatar;
    } else {
      // 2. Fallback : on cherche un string qui ressemble à une image
      for (const [key, value] of Object.entries(p)) {
        if (
          typeof value === "string" &&
          /\.(png|jpe?g|webp|gif)$/i.test(value)
        ) {
          avatarSrc = value;
          break;
        }
        if (
          typeof value === "string" &&
          /data:image\//.test(value)
        ) {
          avatarSrc = value;
          break;
        }
      }
    }
  }

  const [startScore, setStartScore] = React.useState<301 | 501 | 701 | 901>(
    501
  );
  const [outMode, setOutMode] = React.useState<
    "simple" | "double" | "master"
  >("double");

  const [remaining, setRemaining] = React.useState<number>(startScore);
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);

  const [totalDarts, setTotalDarts] = React.useState(0);
  const [totalHits, setTotalHits] = React.useState(0);
  const [bestVisit, setBestVisit] = React.useState(0);

  const [singleHits, setSingleHits] = React.useState(0);
  const [doubleHits, setDoubleHits] = React.useState(0);
  const [tripleHits, setTripleHits] = React.useState(0);

  const [bullHits, setBullHits] = React.useState(0);
  const [dBullHits, setDBullHits] = React.useState(0);
  const [missHits, setMissHits] = React.useState(0);
  const [bustCount, setBustCount] = React.useState(0);

  const [hitMap, setHitMap] = React.useState<HitMap>({});
  const [finishedSessions, setFinishedSessions] = React.useState<
    TrainingFinishStats[]
  >([]);
  const [metricKey, setMetricKey] = React.useState<MetricKey>("darts");
  const [rangeKey, setRangeKey] = React.useState<RangeKey>("week");

  const [showInfo, setShowInfo] = React.useState(false);
  const [showProgress, setShowProgress] = React.useState(false);

  const sessionIdRef = React.useRef<string | null>(null);
  const visitCountRef = React.useRef<number>(0);

  React.useEffect(() => {
    const s = TrainingStore.startSession(
      "x01_solo" as any,
      currentProfile?.id ?? null,
      String(startScore)
    );
    sessionIdRef.current = s.id;

    setRemaining(startScore);
    setCurrentThrow([]);
    setMultiplier(1);

    setTotalDarts(0);
    setTotalHits(0);
    setBestVisit(0);

    setSingleHits(0);
    setDoubleHits(0);
    setTripleHits(0);

    setBullHits(0);
    setDBullHits(0);
    setMissHits(0);
    setBustCount(0);

    setHitMap({});
    visitCountRef.current = 0;

    return () => {
      if (sessionIdRef.current) {
        TrainingStore.finishSession(sessionIdRef.current);
      }
    };
  }, [currentProfile?.id, startScore, outMode]);

  const currentThrowTotal = throwTotal(currentThrow);
  const scoredSoFar = startScore - remaining;
  const avgPerDart = totalDarts > 0 ? scoredSoFar / totalDarts : 0;

  const avg1D = avgPerDart.toFixed(1);
  const avg3D = (avgPerDart * 3).toFixed(1);

  const hitRate =
    totalDarts > 0
      ? ((totalHits / totalDarts) * 100).toFixed(1) + "%"
      : "0.0%";

  const pctS = percent(singleHits, totalHits);
  const pctD = percent(doubleHits, totalHits);
  const pctT = percent(tripleHits, totalHits);

  const effectiveRemaining = Math.max(0, remaining - currentThrowTotal);

  // HANDLERS

  function handleNumber(n: number) {
    if (currentThrow.length >= 3) return;
    const d: UIDart = { v: n, mult: multiplier };
    setCurrentThrow((t) => [...t, d]);
    setMultiplier(1);
    playSound("dart-hit");
    navigator.vibrate?.(20);
  }

  function handleBull() {
    if (currentThrow.length >= 3) return;
    const d: UIDart = { v: 25, mult: multiplier === 2 ? 2 : 1 };
    setCurrentThrow((t) => [...t, d]);
    setMultiplier(1);
    playSound("dart-hit");
    navigator.vibrate?.(20);
  }

  function handleBackspace() {
    if (!currentThrow.length) return;
    setCurrentThrow((t) => t.slice(0, -1));
    playSound("dart-hit");
  }

  function handleCancel() {
    if (currentThrow.length > 0) {
      setCurrentThrow([]);
      setMultiplier(1);
      playSound("bust");
      return;
    }
  }

  function handleValidate() {
    if (!currentThrow.length || remaining <= 0 || !sessionIdRef.current) return;

    const volleyTotal = throwTotal(currentThrow);
    const after = remaining - volleyTotal;

    let isBust = false;
    if (after < 0) {
      isBust = true;
    } else if (after === 0) {
      const last = currentThrow[currentThrow.length - 1];
      if (!isValidOut(last, outMode)) {
        isBust = true;
      }
    }

    const didCheckout = !isBust && after === 0;

    const hitsPayload = currentThrow.map((d) => ({
      profileId: currentProfile?.id ?? null,
      value: dartValue(d),
      mult: d.mult,
      isHit: d.v !== 0 && !isBust,
      remainingBefore: remaining,
      remainingAfter: isBust ? remaining : after,
      mode: "x01_solo" as any,
    }));

    try {
      TrainingStore.addHits(sessionIdRef.current, hitsPayload as any);
    } catch (err) {
      console.warn("TrainingX01Play addHits failed", err);
    }

    setTotalDarts((n) => n + currentThrow.length);

    const missCount = currentThrow.filter((d) => d.v === 0).length;
    setMissHits((n) => n + missCount);

    if (isBust) {
      setBustCount((n) => n + 1);
      playSound("bust");
      navigator.vibrate?.([120, 60, 140]);
    } else {
      const validHits = currentThrow.filter((d) => d.v !== 0);
      const addHits = validHits.length;
      let addS = 0;
      let addD = 0;
      let addT = 0;
      let addB = 0;
      let addDB = 0;

      for (const d of validHits) {
        if (d.v === 25) {
          if (d.mult === 2) addDB++;
          else addB++;
        } else if (d.mult === 1) addS++;
        else if (d.mult === 2) addD++;
        else if (d.mult === 3) addT++;
      }

      setTotalHits((n) => n + addHits);
      setSingleHits((n) => n + addS);
      setDoubleHits((n) => n + addD);
      setTripleHits((n) => n + addT);
      setBullHits((n) => n + addB);
      setDBullHits((n) => n + addDB);

      setHitMap((prev) => {
        const next: HitMap = { ...prev };
        for (const d of validHits) {
          const key = d.v === 25 ? "25" : String(d.v);
          next[key] =
            (next[key] ?? 0) + (d.mult === 3 ? 3 : d.mult === 2 ? 2 : 1);
        }
        return next;
      });

      setBestVisit((b) => Math.max(b, volleyTotal));
      setRemaining(after);

      if (didCheckout) {
        playSound("doubleout");
      }

      if (didCheckout) {
        const finalDarts = totalDarts + currentThrow.length;
        const avgPerDartFinal =
          finalDarts > 0 ? startScore / finalDarts : 0;

        const newTotalHits = totalHits + addHits;
        const newS = singleHits + addS;
        const newD = doubleHits + addD;
        const newT = tripleHits + addT;

        const stat: TrainingFinishStats = {
          date: Date.now(),
          darts: finalDarts,
          avg3D: avgPerDartFinal * 3,
          pctS: newTotalHits > 0 ? (newS / newTotalHits) * 100 : 0,
          pctD: newTotalHits > 0 ? (newD / newTotalHits) * 100 : 0,
          pctT: newTotalHits > 0 ? (newT / newTotalHits) * 100 : 0,
          bestVisit: Math.max(bestVisit, volleyTotal),
          checkout: dartValue(currentThrow[currentThrow.length - 1]),
        };

        setFinishedSessions((arr) => [...arr, stat]);
      }
    }

    setCurrentThrow([]);
    setMultiplier(1);
  }

  function handleExit() {
    if (sessionIdRef.current) {
      TrainingStore.finishSession(sessionIdRef.current);
    }
    go?.("training");
  }

 // RENDER — compact sans scroll

return (
  <div
    style={{
      position: "fixed",
      inset: 0,
      paddingBottom: NAV_HEIGHT,
      overflow: "hidden",
      background: "#020205",
      zIndex: 1,
    }}
  >
    {/* HEADER FIXE */}
    <div
      style={{
        position: "fixed",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(100%,520px)",
        zIndex: 50,
        padding: "6px 10px 4px",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <button
          type="button"
          onClick={handleExit}
          style={{
            borderRadius: 10,
            padding: "5px 10px",
            border: "1px solid rgba(255,180,0,.35)",
            background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
            fontWeight: 900,
            color: "#1a1a1a",
            boxShadow: "0 4px 14px rgba(255,170,0,.25)",
            fontSize: 12,
          }}
        >
          ← Training
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            style={{
              borderRadius: 999,
              padding: "5px 12px",
              border: "1px solid rgba(255,200,80,.45)",
              background: "linear-gradient(180deg,#ffd865,#ffb700)",
              color: "#221800",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            Training X01
          </button>

          <button
            onClick={() => setShowInfo(true)}
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "#ffffff",
              border: "1px solid #000",
              color: "#000",
              fontWeight: 900,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            i
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {START_CHOICES.map((sc) => (
            <button
              key={sc}
              onClick={() => setStartScore(sc)}
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                border:
                  startScore === sc
                    ? "1px solid rgba(255,200,90,0.9)"
                    : "1px solid rgba(255,255,255,0.16)",
                background:
                  startScore === sc
                    ? "linear-gradient(180deg,#ffcf61,#c17b0c)"
                    : "rgba(10,10,12,0.9)",
                color:
                  startScore === sc
                    ? "#221600"
                    : "rgba(230,230,240,0.95)",
              }}
            >
              {sc}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {OUT_CHOICES.map((om) => (
            <button
              key={om}
              onClick={() => setOutMode(om)}
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                border:
                  outMode === om
                    ? "1px solid rgba(255,200,90,0.9)"
                    : "1px solid rgba(255,255,255,0.16)",
                background:
                  outMode === om
                    ? "linear-gradient(180deg,#ffcf61,#c17b0c)"
                    : "rgba(10,10,12,0.9)",
                color:
                  outMode === om ? "#221600" : "rgba(230,230,240,0.95)",
                textTransform: "capitalize",
              }}
            >
              {om}
            </button>
          ))}
        </div>
      </div>
    </div>

    {/* MARGE sous header */}
    <div style={{ height: 70 }} />

    {/* BLOC CENTRAL : 2 colonnes + volée */}
    <div
      style={{
        width: "min(100%,520px)",
        margin: "0 auto",
        padding: "0 10px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {/* Colonne gauche : avatar + stats */}
        <div
          style={{
            background:
              "linear-gradient(180deg,rgba(10,10,15,0.96),rgba(5,5,9,0.96))",
            borderRadius: 16,
            padding: 8,
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 6,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                padding: 3,
                background:
                  "conic-gradient(from 200deg,#ffdf8f,#ffb53a,#ffdf8f)",
                boxShadow:
                  "0 0 0 2px rgba(0,0,0,0.8),0 0 16px rgba(255,200,50,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "50%",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: 18,
                    color: "#1c1302",
                  }}
                >
                  {currentProfile?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </div>
          </div>

          <TrainingStatsTable
            avg3D={avg3D}
            avg1D={avg1D}
            bestVisit={bestVisit}
            darts={totalDarts}
            hitRate={hitRate}
            pctS={pctS}
            pctD={pctD}
            pctT={pctT}
            miss={missHits}
            bull={bullHits}
            dbull={dBullHits}
            bust={bustCount}
          />
        </div>

        {/* Colonne droite : nom + score + radar + bouton Progression */}
        <div
          style={{
            background:
              "linear-gradient(180deg,rgba(10,10,15,0.96),rgba(5,5,9,0.96))",
            borderRadius: 16,
            padding: 8,
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#ffffff",
              marginBottom: 2,
              textAlign: "center",
            }}
          >
            {currentProfile?.name ?? "Joueur"}
          </div>

          <div
            style={{
              fontSize: 40,
              fontWeight: 900,
              color: "#ffcf61",
              textShadow: "0 4px 14px rgba(255,195,26,.3)",
              marginBottom: 4,
              lineHeight: 1,
              textAlign: "center",
            }}
          >
            {effectiveRemaining}
          </div>

          <RadarHitChart hitMap={hitMap} />

          <button
            type="button"
            onClick={() => setShowProgress(true)}
            style={{
              marginTop: 6,
              padding: "4px 12px",
              borderRadius: 999,
              border: "1px solid rgba(255,200,80,.6)",
              background: "linear-gradient(180deg,#ffcf61,#c17b0c)",
              color: "#221600",
              fontWeight: 800,
              fontSize: 11,
            }}
          >
            Progression
          </button>
        </div>
      </div>

      {/* Volée */}
      <ThrowPreviewBar darts={currentThrow} />
    </div>

    {/* KEYPAD FIXE EN BAS (au-dessus du BottomNav) */}
    <div
      style={{
        position: "fixed",
        bottom: NAV_HEIGHT,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(100%,520px)",
        background: "rgba(0,0,0,0.9)",
        padding: "6px 10px 10px",
        zIndex: 60,
        boxShadow: "0 -6px 18px rgba(0,0,0,0.55)",
        borderTop: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <Keypad
        currentThrow={currentThrow}
        multiplier={multiplier}
        onSimple={() => setMultiplier(1)}
        onDouble={() => setMultiplier(2)}
        onTriple={() => setMultiplier(3)}
        onNumber={handleNumber}
        onBull={handleBull}
        onBackspace={handleBackspace}
        onCancel={handleCancel}
        onValidate={handleValidate}
        hidePreview={true}
      />
    </div>

    {/* OVERLAY INFO ("i") */}
    {showInfo && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          zIndex: 90,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
        onClick={() => setShowInfo(false)}
      >
        <div
          style={{
            width: "min(100%,420px)",
            background:
              "linear-gradient(180deg,#14141a 0%,#07070a 100%)",
            borderRadius: 16,
            padding: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 12px 28px rgba(0,0,0,0.7)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#ffffff",
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Règles du Training X01</span>
            <button
              onClick={() => setShowInfo(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              fontSize: 12.5,
              lineHeight: 1.45,
              color: "#e2e4ef",
            }}
          >
            <ul style={{ paddingLeft: 18 }}>
              <li>Score de départ : {startScore}.</li>
              <li>
                Sortie : <b>{outMode}</b> (
                {outMode === "simple"
                  ? "n'importe quel coup valide"
                  : outMode === "double"
                  ? "le dernier coup doit être un double ou DBULL"
                  : "dernier coup simple/double/triple/DBULL"}
                ).
              </li>
              <li>
                Chaque fléchette est enregistrée dans l’historique Training
                pour suivre votre progression.
              </li>
              <li>
                Le radar montre les segments les plus touchés (1–20 + 25),
                pondérés par simple/double/triple.
              </li>
              <li>
                La fenêtre “Progression” affiche la Sparkline des parties
                terminées avec plusieurs métriques.
              </li>
            </ul>
          </div>
        </div>
      </div>
    )}

    {/* OVERLAY PROGRESSION (Sparkline plein écran) */}
    {showProgress && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          zIndex: 95,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 10,
        }}
        onClick={() => setShowProgress(false)}
      >
        <div
          style={{
            width: "min(100%,520px)",
            background:
              "linear-gradient(180deg,#14141a 0%,#050509 100%)",
            borderRadius: 16,
            padding: 12,
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 16px 36px rgba(0,0,0,0.8)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
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
                fontSize: 15,
                fontWeight: 800,
                color: "#ffffff",
              }}
            >
              Progression des stats
            </div>
            <button
              onClick={() => setShowProgress(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              ×
            </button>
          </div>

          <Sparkline
            sessions={finishedSessions}
            range={rangeKey}
            metric={metricKey}
            onRangeChange={setRangeKey}
            onMetricChange={setMetricKey}
          />
        </div>
      </div>
    )}
  </div>
);
}
