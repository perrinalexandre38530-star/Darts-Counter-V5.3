// ============================================
// src/pages/Settings.tsx — Thème + Langue
// Fond toujours sombre (ne varie pas avec le thème)
// Les thèmes ne changent que les néons / accents / textes
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang, type Lang } from "../contexts/LangContext";
import { THEMES, type AppTheme } from "../theme/themePresets";

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

// --------------------------------------------------
// Helpers pour les thèmes (couleurs propres à chaque carte)
// --------------------------------------------------
function injectSettingsAnimationsOnce() {
  if (typeof document === "undefined") return;

  const STYLE_ID = "dc-settings-theme-animations";
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.innerHTML = `
    @keyframes dcSettingsHaloPulse {
      0%   { box-shadow: 0 0 0px rgba(255,255,255,0.0); }
      40%  { box-shadow: 0 0 12px currentColor, 0 0 26px currentColor; }
      100% { box-shadow: 0 0 0px rgba(255,255,255,0.0); }
    }
  `;
  document.head.appendChild(style);
}

function getThemePreset(id: ThemeId): AppTheme {
  const found = THEMES.find((t) => t.id === id);
  return found ?? THEMES[0];
}

type ThemeChoiceButtonProps = {
  opt: { id: ThemeId; label: string; desc: string };
  active: boolean;
  onClick: () => void;
};

// Carte individuelle pour un thème
function ThemeChoiceButton({ opt, active, onClick }: ThemeChoiceButtonProps) {
  const preset = getThemePreset(opt.id);
  const neonColor = preset.primary;

  const [hovered, setHovered] = React.useState(false);

  const cardBoxShadow =
    active || hovered ? `0 0 18px ${neonColor}66` : "0 0 0 rgba(0,0,0,0)";
  const scale = hovered ? 1.02 : 1.0;
  const borderColor = active ? neonColor : "rgba(255,255,255,0.12)";
  const titleColor = active ? neonColor : "#FFFFFF";
  const descColor = active ? neonColor : "rgba(255,255,255,0.6)";

  return (
    <button
      key={opt.id}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textAlign: "left",
        borderRadius: 14,
        padding: 12,
        background: active
          ? "rgba(255,255,255,0.05)"
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${borderColor}`,
        boxShadow: cardBoxShadow,
        color: "#FFFFFF",
        cursor: "pointer",
        transform: `scale(${scale})`,
        transition:
          "transform 0.18s ease-out, box-shadow 0.18s ease-out, border-color 0.18s ease-out, background 0.18s ease-out",
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
        {/* Cercle transparent + halo néon animé */}
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            border: `2px solid ${neonColor}`,
            background: "transparent",
            color: neonColor, // pour currentColor dans l'animation
            boxShadow: active
              ? `0 0 10px ${neonColor}, 0 0 22px ${neonColor}`
              : hovered
              ? `0 0 6px ${neonColor}`
              : "none",
            animation: active ? "dcSettingsHaloPulse 2.1s ease-in-out infinite" : "",
            flexShrink: 0,
          }}
        />
        <span style={{ color: titleColor }}>{opt.label}</span>
      </div>
      <div style={{ fontSize: 12, color: descColor }}>{opt.desc}</div>
    </button>
  );
}

export default function Settings({ go }: Props) {
  const { theme, themeId, setThemeId } = useTheme();
  const { lang, setLang, t } = useLang();

  React.useEffect(() => {
    injectSettingsAnimationsOnce();
  }, []);

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
          style={{
            margin: 0,
            marginBottom: 6,
            fontSize: 18,
            color: theme.primary,
          }}
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
          {THEME_CHOICES.map((opt) => (
            <ThemeChoiceButton
              key={opt.id}
              opt={opt}
              active={opt.id === themeId}
              onClick={() => setThemeId(opt.id)}
            />
          ))}
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
          style={{
            margin: 0,
            marginBottom: 6,
            fontSize: 18,
            color: theme.primary,
          }}
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