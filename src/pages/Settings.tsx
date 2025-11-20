// ============================================
// src/pages/Settings.tsx — Thème + Langue
// Fond toujours sombre (ne varie pas avec le thème)
// Les thèmes ne changent que les néons / accents / textes
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

type Props = { go?: (tab: any, params?: any) => void };

// Options de thèmes affichés
const THEME_CHOICES: {
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
  { id: "white", label: "Blanc", desc: "Fond clair moderne" },
];

// Options langues
const LANG_CHOICES: { id: Lang; label: string }[] = [
  { id: "fr", label: "Français" },
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "de", label: "Deutsch" },
  { id: "it", label: "Italiano" },
  { id: "pt", label: "Português" },
  { id: "nl", label: "Nederlands" },
];

export default function Settings({ go }: Props) {
  const { theme, themeId, setThemeId } = useTheme();
  const { lang, setLang, t } = useLang();

  // 🎨 Fond dark fixe pour toute la page
  const PAGE_BG = "#050712";
  const CARD_BG = "rgba(8, 10, 20, 0.98)";

  return (
    <div
      className="container"
      style={{
        minHeight: "100vh",
        padding: 16,
        paddingBottom: 90,
        background: PAGE_BG, // <-- ne dépend plus du thème
        color: theme.text,
      }}
    >
      {/* Retour */}
      <button
        onClick={() => go && go("home")}
        style={{
          border: "none",
          background: "transparent",
          color: theme.textSoft,
          marginBottom: 8,
          fontSize: 15,
        }}
      >
        ← {t("settings.back", "Retour")}
      </button>

      {/* Titre */}
      <h1
        style={{
          margin: 0,
          fontSize: 26,
          color: theme.primary,
          textShadow: `0 0 12px ${theme.primary}66`,
        }}
      >
        {t("settings.title", "Réglages")}
      </h1>

      <div style={{ fontSize: 14, color: theme.textSoft, marginBottom: 16 }}>
        {t(
          "settings.subtitle",
          "Personnalise le thème et la langue de l'application"
        )}
      </div>

      {/* ---------- BLOC THEME ---------- */}

      <section
        style={{
          background: CARD_BG, // <-- fond de carte fixe sombre
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <h2
          style={{ margin: 0, marginBottom: 6, fontSize: 18, color: theme.primary }}
        >
          {t("settings.theme", "Thème")}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))",
            gap: 12,
            marginTop: 12,
          }}
        >
          {THEME_CHOICES.map((opt) => {
            const active = opt.id === themeId;
            return (
              <button
                key={opt.id}
                onClick={() => setThemeId(opt.id)}
                style={{
                  textAlign: "left",
                  borderRadius: 14,
                  padding: 12,
                  background: active
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.02)",
                  border: active
                    ? `1px solid ${theme.primary}`
                    : `1px solid ${theme.borderSoft}`,
                  boxShadow: active
                    ? `0 0 18px ${theme.primary}88`
                    : "none",
                  color: theme.text,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 700,
                    fontSize: 14,
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: theme.primary,
                      boxShadow: `0 0 6px ${theme.primary}`,
                    }}
                  />
                  {opt.label}
                </div>
                <div style={{ fontSize: 12, color: theme.textSoft }}>
                  {opt.desc}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ---------- BLOC LANGUE ---------- */}

      <section
        style={{
          background: CARD_BG, // <-- idem bloc thème
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <h2
          style={{ margin: 0, marginBottom: 6, fontSize: 18, color: theme.primary }}
        >
          {t("settings.lang", "Langue")}
        </h2>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
          {LANG_CHOICES.map((opt) => {
            const active = opt.id === lang;
            return (
              <button
                key={opt.id}
                onClick={() => setLang(opt.id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: active
                    ? `1px solid ${theme.primary}`
                    : `1px solid ${theme.borderSoft}`,
                  background: active
                    ? "rgba(0,0,0,0.85)"
                    : "rgba(255,255,255,0.04)",
                  color: active ? theme.primary : theme.textSoft,
                  fontWeight: active ? 700 : 500,
                  fontSize: 13,
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