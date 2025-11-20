// ============================================
// src/contexts/LangContext.tsx
// Contexte Langue + petites traductions
// - lang: langue courante
// - setLang: changer de langue
// - t(key, fallback): traduction avec fallback
// ============================================

import React from "react";

export type Lang = "fr" | "en" | "es" | "de" | "it" | "pt" | "nl";

type LangContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, fallback?: string) => string;
};

const LangContext = React.createContext<LangContextValue | undefined>(
  undefined
);

const STORAGE_KEY = "dc_lang_v1";

/* --------- Dictionnaires de base --------- */

const fr: Record<string, string> = {
  // Home — titres
  "home.welcome": "Bienvenue",
  "home.title": "DARTS COUNTER",
  "home.connect": "SE CONNECTER",
  "home.seeStats": "Voir mes statistiques",

  // Home — stats mini
  "home.stats.avg3": "Moy/3",
  "home.stats.best": "Best",
  "home.stats.co": "CO",
  "home.stats.winPct": "Win%",

  // Home — cartes menu
  "home.card.profiles.title": "PROFILS",
  "home.card.profiles.subtitle": "Création et gestion de profils",

  "home.card.local.title": "JEU LOCAL",
  "home.card.local.subtitle": "Accède à tous les modes de jeu",

  "home.card.online.title": "JEU ONLINE",
  "home.card.online.subtitle": "Parties à distance (mode à venir)",

  "home.card.stats.title": "STATS",
  "home.card.stats.subtitle": "Statistiques et historiques",

  // Statuts
  "status.online": "En ligne",
  "status.away": "Absent",
  "status.offline": "Hors ligne",
};

const en: Record<string, string> = {
  // Home — titles
  "home.welcome": "Welcome",
  "home.title": "DARTS COUNTER",
  "home.connect": "SIGN IN",
  "home.seeStats": "View my stats",

  // Home — stats
  "home.stats.avg3": "Avg/3",
  "home.stats.best": "Best",
  "home.stats.co": "CO",
  "home.stats.winPct": "Win%",

  // Home — cards
  "home.card.profiles.title": "PROFILES",
  "home.card.profiles.subtitle": "Create and manage profiles",

  "home.card.local.title": "LOCAL GAME",
  "home.card.local.subtitle": "Access all game modes",

  "home.card.online.title": "ONLINE GAME",
  "home.card.online.subtitle": "Remote matches (coming soon)",

  "home.card.stats.title": "STATS",
  "home.card.stats.subtitle": "Statistics and history",

  // Status
  "status.online": "Online",
  "status.away": "Away",
  "status.offline": "Offline",
};

// Pour les autres langues, on laissera retomber sur le FR par défaut
const messages: Record<Lang, Record<string, string>> = {
  fr,
  en,
  es: {},
  de: {},
  it: {},
  pt: {},
  nl: {},
};

/* --------- Provider --------- */

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>(() => {
    if (typeof window === "undefined") return "fr";
    const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    return stored || "fr";
  });

  const setLang = React.useCallback((next: Lang) => {
    setLangState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const t = React.useCallback(
    (key: string, fallback?: string) => {
      const dictLang = messages[lang] || {};
      const dictFr = messages["fr"] || {};
      // 1) traduction dans la langue courante
      // 2) fallback FR
      // 3) fallback passé en paramètre
      // 4) à défaut, la clé (cas extrême)
      return dictLang[key] ?? dictFr[key] ?? fallback ?? key;
    },
    [lang]
  );

  const value = React.useMemo(
    () => ({ lang, setLang, t }),
    [lang, setLang, t]
  );

  return (
    <LangContext.Provider value={value}>{children}</LangContext.Provider>
  );
}

/* --------- Hook --------- */

export function useLang() {
  const ctx = React.useContext(LangContext);
  if (!ctx) {
    throw new Error("useLang must be used within LangProvider");
  }
  return ctx;
}