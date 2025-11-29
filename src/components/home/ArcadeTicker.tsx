// =============================================================
// src/components/home/ArcadeTicker.tsx
// Bandeau arcade — image très visible + texte léger
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

export type ArcadeTickerItem = {
  id: string;
  title: string;
  text: string;
  detail?: string;
  backgroundImage?: string;
  accentColor?: string;
};

type Props = {
  items: ArcadeTickerItem[];
};

export default function ArcadeTicker({ items }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const [index, setIndex] = React.useState(0);

  if (!items || items.length === 0) return null;

  // Auto-carrousel toutes les 7s
  React.useEffect(() => {
    if (items.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, [items.length]);

  const item = items[index] ?? items[0];
  const accent = item.accentColor ?? theme.primary ?? "#F6C256";
  const bgImage = item.backgroundImage || "";
  const hasBg = !!bgImage;

  return (
    <div style={{ marginTop: 10, marginBottom: 8 }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.12)"}`,
          boxShadow: "0 16px 32px rgba(0,0,0,0.75)",
          height: 92,
          backgroundColor: "#05060C",
          backgroundImage: hasBg
            ? `url("${bgImage}")`
            : "radial-gradient(circle at top, #333, #000)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Voile léger (garde l’image bien visible) */}
        {hasBg && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.25), rgba(0,0,0,0.55))",
            }}
          />
        )}

        {/* ----------- Panneau texte ULTRA transparent ----------- */}
        <div
          style={{
            position: "relative",
            height: "100%",
            display: "flex",
            alignItems: "center",
            padding: "10px 14px",
          }}
        >
          <div
            style={{
              maxWidth: "100%",
              padding: "6px 10px",
              borderRadius: 14,
              background: "rgba(0,0,0,0.25)", // 🔥 plus transparent
              backdropFilter: "blur(2px)", // blur plus léger
              WebkitBackdropFilter: "blur(2px)",
              boxShadow: "0 6px 14px rgba(0,0,0,0.45)", // ombre allégée
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 0.9,
                textTransform: "uppercase",
                color: accent,
                marginBottom: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.title}
            </div>

            <div
              style={{
                fontSize: 11,
                lineHeight: 1.3,
                color: theme.textSoft ?? "rgba(255,255,255,0.85)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {item.text}
            </div>

            {item.detail && (
              <div
                style={{
                  marginTop: 3,
                  fontSize: 10,
                  color: "rgba(255,255,255,0.75)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.detail}
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {items.length > 1 && (
          <div
            style={{
              position: "absolute",
              right: 10,
              bottom: 8,
              display: "flex",
              gap: 4,
            }}
          >
            {items.map((it, i) => (
              <span
                key={it.id}
                style={{
                  width: i === index ? 10 : 6,
                  height: 6,
                  borderRadius: 999,
                  backgroundColor:
                    i === index
                      ? accent
                      : "rgba(255,255,255,0.35)",
                  opacity: i === index ? 1 : 0.6,
                  transition: "all 0.25s ease-out",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
