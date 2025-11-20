// ============================================
// src/pages/Settings.tsx
// Page Réglages — Thème + Langue globaux
// - Choix du thème (gold / rose / pétrole / …)
// - Choix de la langue (FR / EN / ES / …)
// - Utilise ThemeContext + LangContext
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang, type Lang } from "../contexts/LangContext";

type ThemeId =
  | "gold"
  | "pink"
  | "petrol"
  | "green"
  | "magenta"
  | "red"
  | "orange"
  | "white";

type Props = {
  go?: (tab: any, params?: any) => void;
};

/* ---------- Options locales ---------- */

const THEME_OPTIONS: {
  id: ThemeId;
  label: string;
  desc: string;
}[] = [
  { id: "gold", label: "Gold néon", desc: "Thème premium doré" },
  { id: "pink", label: "Rose fluo", desc: "Ambiance arcade rose" },
  { id: "petrol", label: "Bleu pétrole", desc: "Bleu profond néon" },
  { id: "green", label: "Vert néon", desc: "Style practice lumineux" },
  { id: "magenta", label: "Magenta", desc: "Violet / magenta intense" },
  { id: "red", label: "Rouge", desc: "Rouge arcade agressif" },
  { id: "orange", label: "Orange", desc: "Orange chaud énergique" },
  { id: "white", label: "Blanc", desc: "Fond clair / tokens foncés" },
];

const LANG_OPTIONS: { id: Lang; label: string }[] = [
  { id: "fr", label: "Français" },
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "de", label: "Deutsch" },
  { id: "it", label: "Italiano" },
  { id: "pt", label: "Português" },
  { id: "nl", label: "Nederlands" },
];

/* ---------- Composant principal ---------- */

export default function Settings({ go }: Props) {
  // on cast en any pour être compatible avec la version actuelle du ThemeContext
  const { theme, themeName, setThemeName } = useTheme() as any;
  const { lang, setLang, t } = useLang();

  const currentThemeId: ThemeId = (themeName as ThemeId) || "gold";

  return (
    <div
      className="container"
      style={{
        minHeight: "100vh",
        padding: 16,
        paddingBottom: 90,
        background: theme?.bg ?? "#050712",
        color: theme?.text ?? "#ffffff",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => go && go("home")}
          style={{
            border: "none",
            background: "transparent",
            color: theme.textSoft,
            marginBottom: 8,
            fontSize: 14,
          }}
        >
          ← {t("settings.back", "Retour")}
        </button>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            color: theme.primary,
            textShadow: `0 0 12px ${theme.primary}55`,
          }}
        >
          {t("settings.title", "Réglages")}
        </h1>
        <div style={{ fontSize: 13, color: theme.textSoft, marginTop: 4 }}>
          {t(
            "settings.subtitle",
            "Personnalise le thème et la langue de l'application"
          )}
        </div>
      </div>

      {/* Carte Thème */}
      <section
        style={{
          background: theme.card,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          padding: 16,
          marginBottom: 16,
          boxShadow: "0 14px 30px rgba(0,0,0,.45)",
        }}
      >
        <h2
          style={{
            fontSize: 16,
            margin: 0,
            marginBottom: 4,
            color: theme.primary,
          }}
        >
          {t("settings.theme.title", "Thème")}
        </h2>
        <p
          style={{
            margin: 0,
            marginBottom: 12,
            fontSize: 13,
            color: theme.textSoft,
          }}
        >
          {t(
            "settings.theme.subtitle",
            "Choisis les couleurs principales de l'application."
          )}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))",
            gap: 10,
          }}
        >
          {THEME_OPTIONS.map((opt) => {
            const active = opt.id === currentThemeId;
            return (
              <button
                key={opt.id}
                onClick={() => setThemeName && setThemeName(opt.id)}
                style={{
                  position: "relative",
                  textAlign: "left",
                  borderRadius: 14,
                  padding: 10,
                  border: active
                    ? `1px solid ${theme.primary}`
                    : `1px solid ${theme.borderSoft}`,
                  background: active
                    ? "rgba(0,0,0,0.8)"
                    : "rgba(255,255,255,0.02)",
                  color: theme.text,
                  boxShadow: active
                    ? `0 0 14px ${theme.primary}77`
                    : "none",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: theme.primary,
                      boxShadow: `0 0 10px ${theme.primary}aa`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {opt.label}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: theme.textSoft,
                    lineHeight: 1.3,
                  }}
                >
                  {opt.desc}
                </div>
                {active && (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 10,
                      fontSize: 11,
                      color: theme.primary,
                    }}
                  >
                    ✓
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Carte Langue */}
      <section
        style={{
          background: theme.card,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          padding: 16,
          marginBottom: 16,
          boxShadow: "0 14px 30px rgba(0,0,0,.45)",
        }}
      >
        <h2
          style={{
            fontSize: 16,
            margin: 0,
            marginBottom: 4,
            color: theme.primary,
          }}
        >
          {t("settings.lang.title", "Langue")}
        </h2>
        <p
          style={{
            margin: 0,
            marginBottom: 12,
            fontSize: 13,
            color: theme.textSoft,
          }}
        >
          {t(
            "settings.lang.subtitle",
            "Sélectionne la langue de l'interface."
          )}
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {LANG_OPTIONS.map((opt) => {
            const active = opt.id === lang;
            return (
              <button
                key={opt.id}
                onClick={() => setLang(opt.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: active
                    ? `1px solid ${theme.primary}`
                    : `1px solid ${theme.borderSoft}`,
                  background: active
                    ? "rgba(0,0,0,0.85)"
                    : "rgba(255,255,255,0.03)",
                  color: active ? theme.primary : theme.textSoft,
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  boxShadow: active
                    ? `0 0 10px ${theme.primary}66`
                    : "none",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}