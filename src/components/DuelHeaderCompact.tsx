// ============================================
// src/components/DuelHeaderCompact.tsx
// Header duel compact : avatars réduits + score set/legs
// Une seule ligne, sans texte, design premium
// ============================================

import React from "react";

type Props = {
  leftAvatarUrl: string;
  rightAvatarUrl: string;
  leftSets: number;
  rightSets: number;
  leftLegs: number;
  rightLegs: number;
};

export const DuelHeaderCompact: React.FC<Props> = ({
  leftAvatarUrl,
  rightAvatarUrl,
  leftSets,
  rightSets,
  leftLegs,
  rightLegs,
}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "2px 10px",
        borderRadius: 999,
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(0,0,0,0.45))",
        boxShadow: "0 0 12px rgba(0,0,0,0.5)",
      }}
    >
      {/* Avatar gauche */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "999px",
          overflow: "hidden",
          boxShadow: "0 0 0 2px rgba(246,194,86,0.55)",
          flexShrink: 0,
        }}
      >
        <img
          src={leftAvatarUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {/* SCORE CENTRAL */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontWeight: 700,
          gap: 6,
          position: "relative",
        }}
      >
        {/* fond doré subtil derrière le score */}
        <div
          style={{
            position: "absolute",
            width: "90%",
            height: "70%",
            borderRadius: 999,
            background:
              "radial-gradient(circle, rgba(246,194,86,0.22), transparent 70%)",
            filter: "blur(3px)",
            zIndex: 0,
          }}
        ></div>

        {/* (setsA) */}
        <span
          style={{
            opacity: 0.75,
            fontSize: 12,
            zIndex: 1,
          }}
        >
          ({leftSets})
        </span>

        {/* legsA */}
        <span
          style={{
            padding: "1px 8px",
            borderRadius: 999,
            background: "rgba(246,194,86,0.20)",
            fontSize: 16,
            zIndex: 1,
          }}
        >
          {leftLegs}
        </span>

        <span style={{ opacity: 0.7, zIndex: 1 }}>-</span>

        {/* legsB */}
        <span
          style={{
            padding: "1px 8px",
            borderRadius: 999,
            background: "rgba(246,194,86,0.20)",
            fontSize: 16,
            zIndex: 1,
          }}
        >
          {rightLegs}
        </span>

        {/* (setsB) */}
        <span
          style={{
            opacity: 0.75,
            fontSize: 12,
            zIndex: 1,
          }}
        >
          ({rightSets})
        </span>
      </div>

      {/* Avatar droite */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "999px",
          overflow: "hidden",
          boxShadow: "0 0 0 2px rgba(246,194,86,0.55)",
          flexShrink: 0,
        }}
      >
        <img
          src={rightAvatarUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    </div>
  );
};
