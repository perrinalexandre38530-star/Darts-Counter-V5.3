// ============================================
// src/components/AvatarHalo.tsx
// Halo lumineux autour de l'avatar sélectionné
// ============================================

import React from "react";

export default function AvatarHalo({ size = 78, children, active }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {active && (
        <div
          style={{
            position: "absolute",
            width: size + 18,
            height: size + 18,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.45), transparent 70%)",
            filter: "blur(18px)",
            zIndex: 0,
          }}
        />
      )}

      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  );
}
