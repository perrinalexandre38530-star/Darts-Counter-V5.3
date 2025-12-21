// ============================================
// src/components/BackDot.tsx
// Bouton retour compact — style identique à InfoDot (pastille "i")
// - Cercle + halo
// - Icône flèche à l'intérieur
// ============================================
import React from "react";

type Props = {
  onClick?: (e: React.MouseEvent) => void;
  glow?: string; // ex: theme.primary + "88"
  size?: number; // default 34
  title?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
};

export default function BackDot({
  onClick,
  glow = "rgba(255,180,0,.55)",
  size = 34,
  title = "Retour",
  disabled = false,
  style,
}: Props) {
  const s = size;

  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      aria-label={title}
      onClick={(e) => {
        if (disabled) return;
        onClick?.(e);
      }}
      style={{
        width: s,
        height: s,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,.12)",
        background: "rgba(0,0,0,0.22)",
        color: "#fff",
        display: "grid",
        placeItems: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: `0 0 16px ${glow}`,
        backdropFilter: "blur(6px)",
        WebkitTapHighlightColor: "transparent",
        opacity: disabled ? 0.55 : 1,
        ...style,
      }}
    >
      {/* Flèche gauche (SVG) */}
      <svg
        width={Math.round(s * 0.55)}
        height={Math.round(s * 0.55)}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M14.5 5.5L8.5 12L14.5 18.5"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
