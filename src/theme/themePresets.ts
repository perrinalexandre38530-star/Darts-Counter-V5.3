// ============================================
// src/theme/themePresets.ts
// Thèmes néon : seuls les accents changent,
// le fond reste toujours sombre.
// ============================================

export type ThemeId =
  | "gold"
  | "pink"
  | "petrol"
  | "green"
  | "magenta"
  | "red"
  | "orange"
  | "white"
  | "electricBlue"
  | "limeYellow"
  | "sage"
  | "skyBlue"
  | "darkSteel";

export type AppTheme = {
  id: ThemeId;
  name: string;
  primary: string;
  bg: string;        // toujours sombre
  card: string;      // toujours sombre
  text: string;
  textSoft: string;
  accent1: string;
  accent2: string;
  borderSoft: string;
  success: string;
  danger: string;
};

export const DEFAULT_THEME_ID: ThemeId = "gold";
export const THEME_STORAGE_KEY = "dc_app_theme_v1";

// Fond sombre fixe global
const DARK_BG = "#050712";
const DARK_CARD = "#121420";

export const THEMES: AppTheme[] = [
  {
    id: "gold",
    name: "Néon Doré",
    primary: "#F6C256",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#FFFFFF",
    textSoft: "rgba(255,255,255,0.7)",
    accent1: "#F6C256",
    accent2: "#FF4A4A",
    borderSoft: "rgba(255,255,255,0.08)",
    success: "#4CD964",
    danger: "#FF4A4A",
  },
  {
    id: "pink",
    name: "Rose Néon",
    primary: "#FF4FA3",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#FFFFFF",
    textSoft: "rgba(255,220,245,0.8)",
    accent1: "#FF4FA3",
    accent2: "#FFC857",
    borderSoft: "rgba(255,79,163,0.3)",
    success: "#4CD964",
    danger: "#FF4A4A",
  },
  {
    id: "petrol",
    name: "Bleu Pétrole",
    primary: "#1ABC9C",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#EFFFFF",
    textSoft: "rgba(210,245,245,0.8)",
    accent1: "#1ABC9C",
    accent2: "#F6C256",
    borderSoft: "rgba(26,188,156,0.35)",
    success: "#2ECC71",
    danger: "#E74C3C",
  },
  {
    id: "green",
    name: "Vert Néon",
    primary: "#2ECC71",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#EFFFFF",
    textSoft: "rgba(200,255,220,0.8)",
    accent1: "#2ECC71",
    accent2: "#F6C256",
    borderSoft: "rgba(46,204,113,0.35)",
    success: "#2ECC71",
    danger: "#E74C3C",
  },
  {
    id: "magenta",
    name: "Magenta / Violet",
    primary: "#C678DD",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#F9F5FF",
    textSoft: "rgba(230,210,255,0.8)",
    accent1: "#C678DD",
    accent2: "#61AFEF",
    borderSoft: "rgba(198,120,221,0.35)",
    success: "#98C379",
    danger: "#E06C75",
  },
  {
    id: "red",
    name: "Rouge Esport",
    primary: "#FF4A4A",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#FFEFEF",
    textSoft: "rgba(255,220,220,0.8)",
    accent1: "#FF4A4A",
    accent2: "#FFD166",
    borderSoft: "rgba(255,74,74,0.35)",
    success: "#4CD964",
    danger: "#FF4A4A",
  },
  {
    id: "orange",
    name: "Orange Flame",
    primary: "#FF9F43",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#FFF5E8",
    textSoft: "rgba(255,230,200,0.8)",
    accent1: "#FF9F43",
    accent2: "#F6C256",
    borderSoft: "rgba(255,159,67,0.35)",
    success: "#2ECC71",
    danger: "#E74C3C",
  },
  {
    id: "white",
    name: "Clair / Blanc",
    primary: "#FFFFFF",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#FFFFFF",
    textSoft: "rgba(255,255,255,0.7)",
    accent1: "#FFFFFF",
    accent2: "#F6C256",
    borderSoft: "rgba(255,255,255,0.15)",
    success: "#2ECC71",
    danger: "#E74C3C",
  },

  // --------------------------------------------
  // 🚀 Nouveaux thèmes ajoutés ici
  // --------------------------------------------

  {
    id: "electricBlue",
    name: "Bleu Électrique",
    primary: "#103C94",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#F8FAFF",
    textSoft: "rgba(180,195,255,0.75)",
    accent1: "#103C94",
    accent2: "#4FA3FF",
    borderSoft: "rgba(16,60,148,0.35)",
    success: "#4CD964",
    danger: "#FF4A4A",
  },

  {
    id: "limeYellow",
    name: "Vert Jaune",
    primary: "#B1DB07",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#F7FFDF",
    textSoft: "rgba(200,240,150,0.75)",
    accent1: "#B1DB07",
    accent2: "#DFFF4F",
    borderSoft: "rgba(177,219,7,0.35)",
    success: "#4CD964",
    danger: "#FF4A4A",
  },

  {
    id: "sage",
    name: "Vert Sauge",
    primary: "#A3B18A",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#F6F7F2",
    textSoft: "rgba(210,220,210,0.75)",
    accent1: "#A3B18A",
    accent2: "#C7D8B7",
    borderSoft: "rgba(163,177,138,0.35)",
    success: "#8BC34A",
    danger: "#E06C75",
  },

  {
    id: "skyBlue",
    name: "Bleu Pastel",
    primary: "#A7D8FF",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#F8FBFF",
    textSoft: "rgba(190,220,255,0.75)",
    accent1: "#A7D8FF",
    accent2: "#C2E3FF",
    borderSoft: "rgba(167,216,255,0.35)",
    success: "#4CD964",
    danger: "#FF4A4A",
  },

  {
    id: "darkSteel",
    name: "Gris Acier",
    primary: "#2A2A2A",
    bg: DARK_BG,
    card: DARK_CARD,
    text: "#EEEEEE",
    textSoft: "rgba(200,200,200,0.65)",
    accent1: "#2A2A2A",
    accent2: "#555555",
    borderSoft: "rgba(255,255,255,0.12)",
    success: "#4CD964",
    danger: "#FF4A4A",
  },
];
