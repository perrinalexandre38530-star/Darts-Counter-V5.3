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

// Options de thèmes (id + valeurs par défaut FR)
const THEME_CHOICES: {
  id: ThemeId;
  defaultLabel: string;
  defaultDesc: string;
}[] = [
  { id: "gold", defaultLabel: "Gold néon", defaultDesc: "Thème premium doré" },
  { id: "pink", defaultLabel: "Rose fluo", defaultDesc: "Ambiance arcade rose" },
  {
    id: "petrol",
    defaultLabel: "Bleu pétrole",
    defaultDesc: "Bleu profond néon",
  },
  {
    id: "green",
    defaultLabel: "Vert néon",
    defaultDesc: "Style practice lumineux",
  },
  {
    id: "magenta",
    defaultLabel: "Magenta",
    defaultDesc: "Violet / magenta intense",
  },
  { id: "red", defaultLabel: "Rouge", defaultDesc: "Rouge arcade agressif" },
  {
    id: "orange",
    defaultLabel: "Orange",
    defaultDesc: "Orange chaud énergique",
  },
  { id: "white", defaultLabel: "Blanc", defaultDesc: "Fond clair moderne" },
];

// Options langues (id + valeur par défaut)
const LANG_CHOICES: { id: Lang; defaultLabel: string }[] = [
  { id: "fr", defaultLabel: "Français" },
  { id: "en", defaultLabel: "English" },
  { id: "es", defaultLabel: "Español" },
  { id: "de", defaultLabel: "Deutsch" },
  { id: "it", defaultLabel: "Italiano" },
  { id: "pt", defaultLabel: "Português" },
  { id: "nl", defaultLabel: "Nederlands" },
];

// Drapeaux (emoji) associés aux langues
const LANG_FLAGS: Record<Lang, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  es: "🇪🇸",
  de: "🇩🇪",
  it: "🇮🇹",
  pt: "🇵🇹",
  nl: "🇳🇱",
};

// --------------------------------------------------
// Helpers pour les thèmes (couleurs propres à chaque carte)
// + injection de l'animation halo
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

// ---------- Carte individuelle de thème ----------

type ThemeChoiceButtonProps = {
  id: ThemeId;
  label: string;
  desc: string;
  active: boolean;
  onClick: () => void;
};

function ThemeChoiceButton({
  id,
  label,
  desc,
  active,
  onClick,
}: ThemeChoiceButtonProps) {
  const preset = getThemePreset(id);
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
        <span style={{ color: titleColor }}>{label}</span>
      </div>
      <div style={{ fontSize: 12, color: descColor }}>{desc}</div>
    </button>
  );
}

// ---------- Bouton individuel de langue ----------

type LanguageChoiceButtonProps = {
  id: Lang;
  label: string;
  active: boolean;
  onClick: () => void;
  primary: string;
};

function LanguageChoiceButton({
  id,
  label,
  active,
  onClick,
  primary,
}: LanguageChoiceButtonProps) {
  const [hovered, setHovered] = React.useState(false);
  const flag = LANG_FLAGS[id];

  const borderColor = active ? primary : "rgba(255,255,255,0.18)";
  const textColor = active ? primary : "rgba(255,255,255,0.8)";
  const bg = active ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.04)";
  const boxShadow =
    active || hovered ? `0 0 12px ${primary}66` : "0 0 0 rgba(0,0,0,0)";
  const scale = hovered ? 1.03 : 1.0;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: `1px solid ${borderColor}`,
        background: bg,
        color: textColor,
        fontWeight: active ? 700 : 500,
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        boxShadow,
        transform: `scale(${scale})`,
        transition:
          "transform 0.18s ease-out, box-shadow 0.18s ease-out, border-color 0.18s ease-out, background 0.18s ease-out, color 0.18s ease-out",
      }}
    >
      <span style={{ fontSize: 16 }}>{flag}</span>
      <span>{label}</span>
    </button>
  );
}

// ---------- Composant principal Settings ----------

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
        background: PAGE_BG,
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
          background: CARD_BG,
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
          {THEME_CHOICES.map((opt) => {
            const label = t(
              `settings.theme.${opt.id}.label`,
              opt.defaultLabel
            );
            const desc = t(
              `settings.theme.${opt.id}.desc`,
              opt.defaultDesc
            );
            return (
              <ThemeChoiceButton
                key={opt.id}
                id={opt.id}
                label={label}
                desc={desc}
                active={opt.id === themeId}
                onClick={() => setThemeId(opt.id)}
              />
            );
          })}
        </div>
      </section>

      {/* ---------- BLOC LANGUE ---------- */}

      <section
        style={{
          background: CARD_BG,
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

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 12,
          }}
        >
          {LANG_CHOICES.map((opt) => {
            const label = t(`lang.${opt.id}`, opt.defaultLabel);
            return (
              <LanguageChoiceButton
                key={opt.id}
                id={opt.id}
                label={label}
                active={opt.id === lang}
                onClick={() => setLang(opt.id)}
                primary={theme.primary}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}