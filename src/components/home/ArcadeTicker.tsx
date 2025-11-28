// =============================================================
// src/components/home/ArcadeTicker.tsx
// Bandeau arcade sous la carte joueur :
// - Suite de cartes horizontales qui glissent toutes les X secondes
// - Chaque carte a : titre, texte, image de fond différente, couleur d'accent
// - Style "dashboard futuriste" (sobre + lisible)
// =============================================================

import React, { useEffect, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";

export type ArcadeTickerItem = {
  id: string;
  title: string;
  text: string;
  detail?: string;
  // chemin vers une image de fond (tu peux les créer ensuite dans /public/img)
  // ex: "/img/ticker-global.jpg", "/img/ticker-online.jpg", ...
  backgroundImage: string;
  accentColor?: string; // sinon theme.primary
};

type Props = {
  items: ArcadeTickerItem[];
  intervalMs?: number;
};

export default function ArcadeTicker({
  items,
  intervalMs = 4000,
}: Props) {
  const { theme } = useTheme();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % items.length),
      intervalMs
    );
    return () => clearInterval(id);
  }, [items.length, intervalMs]);

  if (!items.length) return null;

  const item = items[index];

  return (
    <div
      style={{
        marginTop: 14,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        height: 72,
        border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.12)"}`,
        boxShadow: "0 16px 30px rgba(0,0,0,0.65)",
      }}
    >
      {/* Fond image + overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("${item.backgroundImage}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(0.5px) brightness(0.55)",
          transform: "scale(1.03)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(2,4,10,0.9), rgba(2,4,10,0.6), rgba(2,4,10,0.9))",
        }}
      />

      {/* Contenu */}
      <div
        key={item.id}
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          gap: 12,
          animation: "dcTickerSlideIn 0.35s ease",
        }}
      >
        <div
          style={{
            width: 6,
            borderRadius: 999,
            alignSelf: "stretch",
            background: `linear-gradient(180deg, ${
              item.accentColor ?? theme.primary ?? "#F6C256"
            }, transparent)`,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: item.accentColor ?? theme.primary ?? "#F6C256",
              marginBottom: 2,
            }}
          >
            {item.title}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: theme.textSoft ?? "rgba(235,240,255,0.8)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.text}
          </div>
          {item.detail && (
            <div
              style={{
                fontSize: 11,
                marginTop: 2,
                color:
                  theme.textMuted ?? "rgba(200,210,230,0.75)",
              }}
            >
              {item.detail}
            </div>
          )}
        </div>
        <div
          style={{
            fontSize: 10,
            color: theme.textMuted ?? "rgba(180,190,210,0.7)",
            textTransform: "uppercase",
          }}
        >
          {index + 1}/{items.length}
        </div>
      </div>

      <style>
        {`
          @keyframes dcTickerSlideIn {
            from {
              opacity: 0;
              transform: translateX(10px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}
      </style>
    </div>
  );
}
