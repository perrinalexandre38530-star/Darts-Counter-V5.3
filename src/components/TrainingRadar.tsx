// ============================================
// src/components/TrainingRadar.tsx
// Radar "dartboard" simplifié pour Training X01
// - Prend toutes les fléchettes (UIDart[])
// - Calcule le nb de hits par segment (1..20 + 25)
// - Dessine un radar polygonal + labels du board
// ============================================
import React from "react";
import type { Dart as UIDart } from "../lib/types";

type Props = {
  darts: UIDart[];
};

const BOARD_ORDER = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
  3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];

const TrainingRadar: React.FC<Props> = ({ darts }) => {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = 90;

  // Compte les hits par valeur (1..20, 25)
  const counts: Record<number, number> = {};
  for (const d of darts || []) {
    if (!d) continue;
    const v = Number(d.v);
    if (!v) continue;
    if (v < 1 || (v > 20 && v !== 25)) continue;
    counts[v] = (counts[v] || 0) + 1;
  }

  // max pour normaliser le rayon
  const maxCount = Object.values(counts).reduce(
    (m, v) => (v > m ? v : m),
    0
  );

  const norm = (val: number) =>
    maxCount === 0 ? 0 : val / maxCount;

  // Points du polygone radar (ordre standard + bull)
  const polyPoints: string[] = [];

  BOARD_ORDER.forEach((num, idx) => {
    const angle = ((-90 + (idx / BOARD_ORDER.length) * 360) * Math.PI) / 180;
    const r =
      20 + norm(counts[num] || 0) * maxRadius;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    polyPoints.push(`${x},${y}`);
  });

  // BULL (25)
  const bullCount = counts[25] || 0;
  const bullR =
    20 + norm(bullCount) * maxRadius;

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ maxWidth: size, display: "block" }}
      >
        {/* fond */}
        <defs>
          <radialGradient
            id="radarBg"
            cx="50%"
            cy="50%"
            r="50%"
          >
            <stop
              offset="0%"
              stopColor="rgba(255,255,255,0.05)"
            />
            <stop
              offset="100%"
              stopColor="rgba(0,0,0,1)"
            />
          </radialGradient>
        </defs>
        <circle
          cx={cx}
          cy={cy}
          r={maxRadius + 20}
          fill="url(#radarBg)"
          stroke="rgba(255,255,255,.12)"
          strokeWidth={2}
        />

        {/* cercles concentriques */}
        {[0.25, 0.5, 0.75, 1].map((f, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={maxRadius * f}
            fill="none"
            stroke="rgba(255,255,255,.10)"
            strokeWidth={1}
          />
        ))}

        {/* rayons */}
        {BOARD_ORDER.map((_, idx) => {
          const angle =
            ((-90 + (idx / BOARD_ORDER.length) * 360) * Math.PI) /
            180;
          const x = cx + (maxRadius + 5) * Math.cos(angle);
          const y = cy + (maxRadius + 5) * Math.sin(angle);
          return (
            <line
              key={idx}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="rgba(255,255,255,.08)"
              strokeWidth={1}
            />
          );
        })}

        {/* polygone des hits */}
        {polyPoints.length > 0 && (
          <>
            <polygon
              points={polyPoints.join(" ")}
              fill="rgba(246,194,86,0.25)"
              stroke="#F6C256"
              strokeWidth={2}
            />
            {/* bull interne (pour 25) */}
            <circle
              cx={cx}
              cy={cy}
              r={bullR}
              fill="rgba(246,194,86,0.1)"
              stroke="#F6C256"
              strokeWidth={1}
            />
          </>
        )}

        {/* centre */}
        <circle
          cx={cx}
          cy={cy}
          r={3}
          fill="#F6C256"
        />

        {/* labels autour du board */}
        {BOARD_ORDER.map((num, idx) => {
          const angle =
            ((-90 + (idx / BOARD_ORDER.length) * 360) * Math.PI) /
            180;
          const r = maxRadius + 14;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          return (
            <text
              key={num}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fill="#FFFFFF"
            >
              {num}
            </text>
          );
        })}

        {/* label 25 (bull) en haut */}
        <text
          x={cx}
          y={cy - (maxRadius + 26)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fill="#FFFFFF"
        >
          25
        </text>
      </svg>
    </div>
  );
};

export default TrainingRadar;
