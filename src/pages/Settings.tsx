// ============================================
// src/pages/Settings.tsx
// Page Réglages — Thème global + Langue
// - Sélection du thème (couleurs néon)
// - Sélection de la langue (i18n)
// - Appliqué à TOUTE l’application via ThemeProvider / LangProvider
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

type Props = {
  go?: (tab: any, params?: any) => void;
};

export default function Settings({ go }: Props) {
  const { theme, themeId, setThemeId, themes } = useTheme();
  const { lang, setLang, availableLangs } = useLang();

  return (
    <div
      className="container"
      style={{
        minHeight: "100vh",
        padding: 16,
        paddingBottom: 90,
        boxSizing: "border-box",
        background: theme.bg,
        color: theme.text,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 16,
          gap: 8,
        }}
      >
        {go && (
          <button
            onClick={() => go("home")}
            style={{
              border: "none",
              background: "transparent",
              color: theme.textSoft,
              fontSize: 18,
              padding: 4,
            }}
          >
            ←
          </button>
        )}
        <h1
          style={{
            fontSize: 20,
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: 1.5,
            color: theme.text,
          }}
        >
          Réglages
        </h1>
      </div>

      {/* Bloc THÈME */}
      <section
        style={{
          marginBottom: 20,
          padding: 16,
          borderRadius: 16,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: "0 12px 30px rgba(0,0,0,.45)",
        }}
      >
        <h2
          style={{
            fontSize: 15,
            margin: 0,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: 1.2,
            color: theme.text,
          }}
        >
          Thème de l'application
        </h2>
        <p
          style={{
            margin: 0,
            marginBottom: 10,
            fontSize: 12,
            color: theme.textSoft,
          }}
        >
          Choisis le style de couleurs néon pour toute l’interface.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 6,
          }}
        >
          {themes.map((t) => {
            const selected = t.id === themeId;
            const displayName =
              (t as any).label || (t as any).name || t.id.toUpperCase();

            return (
              <button
                key={t.id}
                onClick={() => setThemeId(t.id)}
                style={{
                  flexGrow: 0,
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: selected
                    ? `1px solid ${theme.primary}`
                    : `1px solid ${theme.borderSoft}`,
                  background: selected
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.3)",
                  color: theme.text,
                  fontSize: 12,
                  fontWeight: selected ? 700 : 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: (t as any).primary || theme.primary,
                    boxShadow: selected
                      ? `0 0 10px ${(t as any).primary || theme.primary}`
                      : "none",
                  }}
                />
                <span>{displayName}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Bloc LANGUE */}
      <section
        style={{
          marginBottom: 20,
          padding: 16,
          borderRadius: 16,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: "0 12px 30px rgba(0,0,0,.45)",
        }}
      >
        <h2
          style={{
            fontSize: 15,
            margin: 0,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: 1.2,
            color: theme.text,
          }}
        >
          Langue
        </h2>
        <p
          style={{
            margin: 0,
            marginBottom: 10,
            fontSize: 12,
            color: theme.textSoft,
          }}
        >
          Choisis la langue d’affichage de l’application.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 6,
          }}
        >
          {availableLangs.map((l) => {
            const selected = l.code === lang;
            const label = (l as any).label || l.code.toUpperCase();

            return (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                style={{
                  padding: "7px 12px",
                  borderRadius: 999,
                  border: selected
                    ? `1px solid ${theme.primary}`
                    : `1px solid ${theme.borderSoft}`,
                  background: selected
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.3)",
                  color: theme.text,
                  fontSize: 12,
                  fontWeight: selected ? 700 : 500,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Bloc info / version (optionnel) */}
      <section
        style={{
          padding: 14,
          borderRadius: 14,
          background: "rgba(0,0,0,0.45)",
          border: `1px dashed ${theme.borderSoft}`,
          fontSize: 11,
          color: theme.textSoft,
        }}
      >
        <div style={{ marginBottom: 4 }}>
          Darts Counter — Réglages globaux (thème &amp; langue).
        </div>
        <div>Les changements sont sauvegardés automatiquement.</div>
      </section>
    </div>
  );
}