// ============================================
// src/components/InfoDot.tsx
// Bouton "i" universel avec halo néon léger
// Utilisé dans Games, TrainingMenu, StatsShell…
// ============================================

import React from "react";

export default function InfoDot({
  onClick,
  size = 30,
  color = "#FFFFFF",
  glow = "rgba(255,255,255,0.35)",
}: {
  onClick?: (e: React.MouseEvent) => void;
  size?: number;
  color?: string;
  glow?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(0,0,0,0.9)",
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color,
        fontWeight: 800,
        fontSize: size * 0.5,
        cursor: "pointer",

        // 🌟 léger halo néon + petit scintillement
        boxShadow: `
          0 0 6px ${glow},
          0 0 12px ${glow}
        `,
        animation: "infodotPulse 1.9s infinite ease-in-out",
      }}
    >
      i

      {/* Animation CSS */}
      <style>
        {`
          @keyframes infodotPulse {
            0%   { box-shadow: 0 0 6px ${glow}, 0 0 12px ${glow}; }
            50%  { box-shadow: 0 0 10px ${glow}, 0 0 18px ${glow}; }
            100% { box-shadow: 0 0 6px ${glow}, 0 0 12px ${glow}; }
          }
        `}
      </style>
    </button>
  );
}
