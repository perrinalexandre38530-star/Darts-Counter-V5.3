// ============================================
// src/pages/Settings.tsx — Thème + Langue
// Fond toujours sombre (ne varie pas avec le thème)
// Les thèmes ne changent que les néons / accents / textes
// + Drapeaux pour les langues
// + Catégories + carrousels horizontaux pour les thèmes
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang, type Lang } from "../contexts/LangContext";
import { THEMES, type ThemeId, type AppTheme } from "../theme/themePresets";
import { nukeAll } from "../lib/storage";

type Props = { go?: (tab: any, params?: any) => void };

// ---------------- Thèmes dispo + descriptions fallback ----------------

const NEONS: ThemeId[] = [
  "gold",
  "pink",
  "petrol",
  "green",
  "magenta",
  "red",
  "orange",
  "white",
];

const SOFTS: ThemeId[] = ["blueOcean", "limeYellow", "sage", "skyBlue"];

const DARKS: ThemeId[] = [
  "darkTitanium",
  "darkCarbon",
  "darkFrost",
  "darkObsidian",
];

const THEME_META: Record<
  ThemeId,
  { defaultLabel: string; defaultDesc: string }
> = {
  gold: { defaultLabel: "Gold néon", defaultDesc: "Thème premium doré" },
  pink: { defaultLabel: "Rose fluo", defaultDesc: "Ambiance arcade rose" },
  petrol: {
    defaultLabel: "Bleu pétrole",
    defaultDesc: "Bleu profond néon",
  },
  green: {
    defaultLabel: "Vert néon",
    defaultDesc: "Style practice lumineux",
  },
  magenta: {
    defaultLabel: "Magenta",
    defaultDesc: "Violet / magenta intense",
  },
  red: { defaultLabel: "Rouge", defaultDesc: "Rouge arcade agressif" },
  orange: {
    defaultLabel: "Orange",
    defaultDesc: "Orange chaud énergique",
  },
  white: { defaultLabel: "Blanc", defaultDesc: "Fond clair moderne" },

  // Soft accents
  blueOcean: {
    defaultLabel: "Bleu océan",
    defaultDesc: "Bleu naturel océan / ciel",
  },
  limeYellow: {
    defaultLabel: "Vert jaune",
    defaultDesc: "Couleur lime hyper flashy",
  },
  sage: {
    defaultLabel: "Vert sauge",
    defaultDesc: "Tons verts naturels et doux",
  },
  skyBlue: {
    defaultLabel: "Bleu pastel",
    defaultDesc: "Bleu très doux et lumineux",
  },

  // Dark premiums
  darkTitanium: {
    defaultLabel: "Titane sombre",
    defaultDesc: "Look métal premium mat",
  },
  darkCarbon: {
    defaultLabel: "Carbone",
    defaultDesc: "Ambiance fibre carbone moderne",
  },
  darkFrost: {
    defaultLabel: "Givre sombre",
    defaultDesc: "Noir givré futuriste",
  },
  darkObsidian: {
    defaultLabel: "Obsidienne",
    defaultDesc: "Noir poli premium et lisible",
  },
};

function getPreset(id: ThemeId): AppTheme {
  const found = THEMES.find((t) => t.id === id);
  return found ?? THEMES[0];
}

// ---------------- Langues + libellés fallback ----------------

const LANG_CHOICES: { id: Lang; defaultLabel: string; short: string }[] = [
  { id: "fr", defaultLabel: "Français", short: "FR" },
  { id: "en", defaultLabel: "English", short: "GB" },
  { id: "es", defaultLabel: "Español", short: "ES" },
  { id: "de", defaultLabel: "Deutsch", short: "DE" },
  { id: "it", defaultLabel: "Italiano", short: "IT" },
  { id: "pt", defaultLabel: "Português", short: "PT" },
  { id: "nl", defaultLabel: "Nederlands", short: "NL" },

  { id: "ru", defaultLabel: "Русский", short: "RU" },
  { id: "zh", defaultLabel: "中文", short: "CN" },
  { id: "ja", defaultLabel: "日本語", short: "JP" },
  { id: "ar", defaultLabel: "العربية", short: "AR" },

  { id: "hi", defaultLabel: "हिन्दी", short: "HI" },
  { id: "tr", defaultLabel: "Türkçe", short: "TR" },

  { id: "da", defaultLabel: "Dansk", short: "DK" },
  { id: "no", defaultLabel: "Norsk", short: "NO" },
  { id: "sv", defaultLabel: "Svenska", short: "SE" },
  { id: "is", defaultLabel: "Íslenska", short: "IS" },

  { id: "pl", defaultLabel: "Polski", short: "PL" },
  { id: "ro", defaultLabel: "Română", short: "RO" },
  { id: "at", defaultLabel: "Österreichisch", short: "AT" }, // (variante DE)
  { id: "sr", defaultLabel: "Српски", short: "RS" },
  { id: "hr", defaultLabel: "Hrvatski", short: "HR" },
  { id: "cs", defaultLabel: "Čeština", short: "CZ" },
];

const LANG_FLAGS: Record<Lang, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  es: "🇪🇸",
  de: "🇩🇪",
  it: "🇮🇹",
  pt: "🇵🇹",
  nl: "🇳🇱",
  ru: "🇷🇺",
  zh: "🇨🇳",
  ja: "🇯🇵",
  ar: "🇸🇦",
  hi: "🇮🇳",
  tr: "🇹🇷",
  da: "🇩🇰",
  no: "🇳🇴",
  sv: "🇸🇪",
  is: "🇮🇸",
  pl: "🇵🇱",
  ro: "🇷🇴",
  at: "🇦🇹",
  sr: "🇷🇸",
  hr: "🇭🇷",
  cs: "🇨🇿",
};

// ---------------- Animation halo une seule fois ----------------

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

// ---------------- Bouton de thème (compact) ----------------

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
  const preset = getPreset(id);
  const neonColor = preset.primary;
  const [hovered, setHovered] = React.useState(false);

  const cardBoxShadow =
    active || hovered ? `0 0 14px ${neonColor}66` : "0 0 0 rgba(0,0,0,0)";
  const scale = hovered ? 1.01 : 1.0; // 🔽 plus discret pour éviter de dépasser
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
        padding: "8px 10px", // 🔽 hauteur réduite
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
        minWidth: 140,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontWeight: 700,
          fontSize: 13, // 🔽 un poil plus petit
          marginBottom: 2,
        }}
      >
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: `2px solid ${neonColor}`,
            background: "transparent",
            color: neonColor,
            boxShadow: active
              ? `0 0 8px ${neonColor}, 0 0 18px ${neonColor}`
              : hovered
              ? `0 0 5px ${neonColor}`
              : "none",
            animation: active
              ? "dcSettingsHaloPulse 2.1s ease-in-out infinite"
              : "",
            flexShrink: 0,
          }}
        />
        <span style={{ color: titleColor }}>{label}</span>
      </div>
      <div style={{ fontSize: 11, color: descColor, lineHeight: 1.25 }}>
        {desc}
      </div>
    </button>
  );
}

// ---------------- Bouton de langue ----------------

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
  const flag = LANG_FLAGS[id] ?? id.toUpperCase();

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
      <span
        style={{
          fontSize: 16,
          minWidth: 24,
          textAlign: "center",
        }}
      >
        {flag}
      </span>
      <span>{label}</span>
    </button>
  );
}

// ---------------- Composant principal ----------------

export default function Settings({ go }: Props) {
  const { theme, themeId, setThemeId } = useTheme();
  const { lang, setLang, t } = useLang();

  React.useEffect(() => {
    injectSettingsAnimationsOnce();
  }, []);

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

      {/* ---------- BLOC THEME AVEC CARROUSELS ---------- */}

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
            marginBottom: 10,
            fontSize: 18,
            color: theme.primary,
          }}
        >
          {t("settings.theme", "Thème")}
        </h2>

        {/* --- Catégorie Néons --- */}
        <div
          style={{
            marginTop: 12,
            marginBottom: 6,
            color: theme.textSoft,
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          ⚡ {t("settings.theme.group.neons", "Néons classiques")}
        </div>

        <div
           className="dc-scroll-thin"
           style={{
             overflowX: "auto",
             padding: "6px 0 10px 0",  // ✨ marge en haut et en bas
             marginTop: 4,
             marginBottom: 4, }}
        >
          <div style={{ display: "flex", flexWrap: "nowrap", gap: 12 }}>
            {NEONS.map((id) => {
              const meta = THEME_META[id];
              const label = t(
                `settings.theme.${id}.label`,
                meta.defaultLabel
              );
              const desc = t(
                `settings.theme.${id}.desc`,
                meta.defaultDesc
              );

              return (
                <ThemeChoiceButton
                  key={id}
                  id={id}
                  label={label}
                  desc={desc}
                  active={id === themeId}
                  onClick={() => setThemeId(id)}
                />
              );
            })}
          </div>
        </div>

        {/* --- Catégorie Douces --- */}
        <div
          style={{
            marginTop: 16,
            marginBottom: 6,
            color: theme.textSoft,
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          🎨 {t("settings.theme.group.soft", "Couleurs douces")}
        </div>

        <div
          className="dc-scroll-thin"
          style={{
            overflowX: "auto",
            padding: "6px 0 10px 0",  // ✨ marge en haut et en bas
            marginTop: 4,
            marginBottom: 4, }}
        >
          <div style={{ display: "flex", flexWrap: "nowrap", gap: 12 }}>
            {SOFTS.map((id) => {
              const meta = THEME_META[id];
              const label = t(
                `settings.theme.${id}.label`,
                meta.defaultLabel
              );
              const desc = t(
                `settings.theme.${id}.desc`,
                meta.defaultDesc
              );

              return (
                <ThemeChoiceButton
                  key={id}
                  id={id}
                  label={label}
                  desc={desc}
                  active={id === themeId}
                  onClick={() => setThemeId(id)}
                />
              );
            })}
          </div>
        </div>

        {/* --- Catégorie DARK --- */}
        <div
          style={{
            marginTop: 16,
            marginBottom: 6,
            color: theme.textSoft,
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          🌑 {t("settings.theme.group.dark", "Thèmes Dark Premium")}
        </div>

        <div
          style={{
            overflowX: "auto",
            padding: "6px 0 10px 0",
            marginTop: 4,
            marginBottom: 4, }}
        >
          <div style={{ display: "flex", flexWrap: "nowrap", gap: 12 }}>
            {DARKS.map((id) => {
              const meta = THEME_META[id];
              const label = t(
                `settings.theme.${id}.label`,
                meta.defaultLabel
              );
              const desc = t(
                `settings.theme.${id}.desc`,
                meta.defaultDesc
              );

              return (
                <ThemeChoiceButton
                  key={id}
                  id={id}
                  label={label}
                  desc={desc}
                  active={id === themeId}
                  onClick={() => setThemeId(id)}
                />
              );
            })}
          </div>
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
