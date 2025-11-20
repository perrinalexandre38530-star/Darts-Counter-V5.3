// ============================================
// src/pages/Settings.tsx
// Menu Réglages — Thème global + Langue
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

type Props = {
  go?: (tab: any, params?: any) => void;
};

export default function Settings({ go }: Props) {
  const { theme, themeId, setThemeId, themes } = useTheme();
  const { lang, setLang, t, availableLangs } = useLang();

  function handleBackHome() {
    if (!go) return;
    // adapte la valeur du tab selon ton App.tsx ("home", "menu", etc.)
    go("home");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "16px",
        paddingBottom: 80,
        background: `radial-gradient(circle at top, rgba(255,255,255,0.08) 0, transparent 55%), ${theme.bg}`,
        color: theme.text,
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <button
          onClick={handleBackHome}
          style={{
            border: "none",
            background: "transparent",
            color: theme.textSoft,
            fontSize: 18,
            marginRight: 12,
            cursor: "pointer",
          }}
        >
          ←
        </button>
        <div>
          <div
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: theme.textSoft,
            }}
          >
            Darts Counter
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.8,
            }}
          >
            {t("settings_title")}
          </div>
        </div>
      </div>

      {/* CARTE THEME */}
      <div
        style={{
          background: theme.card,
          borderRadius: 18,
          padding: 16,
          marginBottom: 16,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: `0 0 40px rgba(0,0,0,0.55)`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                textTransform: "uppercase",
                letterSpacing: 1.4,
                color: theme.textSoft,
              }}
            >
              {t("settings_theme_section")}
            </div>
          </div>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "999px",
              background: theme.primary,
              boxShadow: `0 0 12px ${theme.primary}`,
            }}
          />
        </div>

        <p
          style={{
            fontSize: 12,
            color: theme.textSoft,
            marginBottom: 12,
          }}
        >
          {t("settings_theme_hint")}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 10,
            marginTop: 8,
          }}
        >
          {themes.map((th) => {
            const active = th.id === themeId;
            return (
              <button
                key={th.id}
                onClick={() => setThemeId(th.id)}
                style={{
                  position: "relative",
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: active
                    ? `1px solid ${th.primary}`
                    : `1px solid ${theme.borderSoft}`,
                  background: `linear-gradient(135deg, ${th.card} 0%, ${th.bg} 100%)`,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: active
                    ? `0 0 12px ${th.primary}`
                    : "0 0 0 rgba(0,0,0,0)",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: th.text,
                  }}
                >
                  {th.name}
                </span>
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "999px",
                      background: th.primary,
                    }}
                  />
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "999px",
                      background: th.accent1,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CARTE LANGUE */}
      <div
        style={{
          background: theme.card,
          borderRadius: 18,
          padding: 16,
          marginBottom: 16,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: `0 0 40px rgba(0,0,0,0.55)`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                textTransform: "uppercase",
                letterSpacing: 1.4,
                color: theme.textSoft,
              }}
            >
              {t("settings_language_section")}
            </div>
          </div>
          <div
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              border: `1px solid ${theme.borderSoft}`,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: theme.textSoft,
            }}
          >
            {lang.toUpperCase()}
          </div>
        </div>

        <p
          style={{
            fontSize: 12,
            color: theme.textSoft,
            marginBottom: 12,
          }}
        >
          {t("settings_language_hint")}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 8,
          }}
        >
          {availableLangs.map((l) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 999,
                  border: active
                    ? `1px solid ${theme.primary}`
                    : `1px solid ${theme.borderSoft}`,
                  background: active
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  color: theme.text,
                  boxShadow: active
                    ? `0 0 10px ${theme.primary}`
                    : "0 0 0 rgba(0,0,0,0)",
                }}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* BOUTON RETOUR ACCUEIL */}
      <button
        onClick={handleBackHome}
        style={{
          width: "100%",
          marginTop: 8,
          padding: "10px 14px",
          borderRadius: 999,
          border: "none",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 1.4,
          background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent1})`,
          color: "#000",
          boxShadow: `0 0 16px ${theme.primary}`,
        }}
      >
        {t("settings_back_home")}
      </button>
    </div>
  );
}
