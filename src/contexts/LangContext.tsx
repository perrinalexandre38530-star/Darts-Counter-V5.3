// ============================================
// src/contexts/LangContext.tsx
// Contexte langue + i18n très simple
// - Langues : fr, en, es, de, it, pt, nl
// - t(key, fallback) :
//     1) cherche dans la langue courante
//     2) sinon dans le FR
//     3) sinon retourne fallback ou la key
// - Persistance dans localStorage ("dc_lang_v1")
// ============================================

import React from "react";

export type Lang = "fr" | "en" | "es" | "de" | "it" | "pt" | "nl";

const LANG_STORAGE_KEY = "dc_lang_v1";

// --------------------------------------------------
// DICTIONNAIRES DE TRADUCTION
// Tu peux ajouter autant de clés que tu veux au fur et à mesure
// --------------------------------------------------
type Dict = Record<string, string>;
type LangDict = Record<Lang, Dict>;

const DICT: LangDict = {
  fr: {
    // --- GÉNÉRAL ---
    "nav.home": "Accueil",
    "nav.games": "Jeux",
    "nav.profiles": "Profils",
    "nav.friends": "Amis",
    "nav.stats": "Stats",
    "nav.settings": "Réglages",

    // --- SETTINGS PAGE ---
    "settings.back": "Retour",
    "settings.title": "Réglages",
    "settings.subtitle":
      "Personnalise le thème et la langue de l'application",
    "settings.theme": "Thème",
    "settings.lang": "Langue",

    "settings.theme.gold.label": "Gold néon",
    "settings.theme.gold.desc": "Thème premium doré",

    "settings.theme.pink.label": "Rose fluo",
    "settings.theme.pink.desc": "Ambiance arcade rose",

    "settings.theme.petrol.label": "Bleu pétrole",
    "settings.theme.petrol.desc": "Bleu profond néon",

    "settings.theme.green.label": "Vert néon",
    "settings.theme.green.desc": "Style practice lumineux",

    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Violet / magenta intense",

    "settings.theme.red.label": "Rouge",
    "settings.theme.red.desc": "Rouge arcade agressif",

    "settings.theme.orange.label": "Orange",
    "settings.theme.orange.desc": "Orange chaud énergique",

    "settings.theme.white.label": "Blanc",
    "settings.theme.white.desc": "Fond clair moderne",

    "lang.fr": "Français",
    "lang.en": "English",
    "lang.es": "Español",
    "lang.de": "Deutsch",
    "lang.it": "Italiano",
    "lang.pt": "Português",
    "lang.nl": "Nederlands",
  },

  en: {
    // --- GENERAL ---
    "nav.home": "Home",
    "nav.games": "Games",
    "nav.profiles": "Profiles",
    "nav.friends": "Friends",
    "nav.stats": "Stats",
    "nav.settings": "Settings",

    // --- SETTINGS PAGE ---
    "settings.back": "Back",
    "settings.title": "Settings",
    "settings.subtitle": "Customize the app theme and language",
    "settings.theme": "Theme",
    "settings.lang": "Language",

    "settings.theme.gold.label": "Gold neon",
    "settings.theme.gold.desc": "Premium gold theme",

    "settings.theme.pink.label": "Pink neon",
    "settings.theme.pink.desc": "Arcade pink ambience",

    "settings.theme.petrol.label": "Petrol blue",
    "settings.theme.petrol.desc": "Deep neon blue",

    "settings.theme.green.label": "Green neon",
    "settings.theme.green.desc": "Bright practice style",

    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Intense violet / magenta",

    "settings.theme.red.label": "Red",
    "settings.theme.red.desc": "Aggressive arcade red",

    "settings.theme.orange.label": "Orange",
    "settings.theme.orange.desc": "Energetic warm orange",

    "settings.theme.white.label": "White",
    "settings.theme.white.desc": "Modern light background",

    "lang.fr": "French",
    "lang.en": "English",
    "lang.es": "Spanish",
    "lang.de": "German",
    "lang.it": "Italian",
    "lang.pt": "Portuguese",
    "lang.nl": "Dutch",
  },

  // Pour l’instant, les autres langues ne remplissent que les noms de langue
  // Tu pourras compléter au fur et à mesure
  es: {
    "lang.fr": "Francés",
    "lang.en": "Inglés",
    "lang.es": "Español",
    "lang.de": "Alemán",
    "lang.it": "Italiano",
    "lang.pt": "Portugués",
    "lang.nl": "Neerlandés",
  },
  de: {
    "lang.fr": "Französisch",
    "lang.en": "Englisch",
    "lang.es": "Spanisch",
    "lang.de": "Deutsch",
    "lang.it": "Italienisch",
    "lang.pt": "Portugiesisch",
    "lang.nl": "Niederländisch",
  },
  it: {
    "lang.fr": "Francese",
    "lang.en": "Inglese",
    "lang.es": "Spagnolo",
    "lang.de": "Tedesco",
    "lang.it": "Italiano",
    "lang.pt": "Portoghese",
    "lang.nl": "Olandese",
  },
  pt: {
    "lang.fr": "Francês",
    "lang.en": "Inglês",
    "lang.es": "Espanhol",
    "lang.de": "Alemão",
    "lang.it": "Italiano",
    "lang.pt": "Português",
    "lang.nl": "Holandês",
  },
  nl: {
    "lang.fr": "Frans",
    "lang.en": "Engels",
    "lang.es": "Spaans",
    "lang.de": "Duits",
    "lang.it": "Italiaans",
    "lang.pt": "Portugees",
    "lang.nl": "Nederlands",
  },
};

// --------------------------------------------------
// CONTEXTE
// --------------------------------------------------

type LangContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, fallback?: string) => string;
};

const LangContext = React.createContext<LangContextValue | undefined>(
  undefined
);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>("fr");

  // Chargement initial depuis localStorage
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
    if (stored && DICT[stored]) {
      setLangState(stored);
    }
  }, []);

  const setLang = React.useCallback((next: Lang) => {
    setLangState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    }
  }, []);

  const t = React.useCallback(
    (key: string, fallback?: string): string => {
      const dict = DICT[lang] || {};
      if (Object.prototype.hasOwnProperty.call(dict, key)) {
        return dict[key];
      }

      // fallback FR si dispo
      const frDict = DICT.fr;
      if (Object.prototype.hasOwnProperty.call(frDict, key)) {
        return frDict[key];
      }

      return fallback ?? key;
    },
    [lang]
  );

  const value: LangContextValue = { lang, setLang, t };

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = React.useContext(LangContext);
  if (!ctx) {
    throw new Error("useLang must be used within LangProvider");
  }
  return ctx;
}
