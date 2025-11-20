// ============================================
// src/contexts/LangContext.tsx
// Contexte langue + i18n simple
// - Langues : fr, en, es, de, it, pt, nl
// - t(key, fallback?) :
//     1) cherche dans la langue courante
//     2) sinon dans le FR
//     3) sinon fallback ou la clé
// - Persistance dans localStorage ("dc_lang_v1")
// ============================================

import React from "react";

export type Lang = "fr" | "en" | "es" | "de" | "it" | "pt" | "nl";

const LANG_STORAGE_KEY = "dc_lang_v1";

type Dict = Record<string, string>;
type LangDict = Record<Lang, Dict>;

// --------------------------------------------------
// DICTIONNAIRE DE TRADUCTIONS
// (Home + Settings + Nav + noms de langues + statuts)
// --------------------------------------------------
const DICT: LangDict = {
  /* ---------- FRANÇAIS ---------- */
  fr: {
    // NAV
    "nav.home": "Accueil",
    "nav.games": "Jeux",
    "nav.profiles": "Profils",
    "nav.friends": "Amis",
    "nav.stats": "Stats",
    "nav.settings": "Réglages",

    // SETTINGS
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

    // HOME
    "home.welcome": "Bienvenue",
    "home.title": "DARTS COUNTER",
    "home.connect": "SE CONNECTER",

    "home.card.profiles.title": "PROFILS",
    "home.card.profiles.subtitle": "Création et gestion de profils",

    "home.card.local.title": "JEU LOCAL",
    "home.card.local.subtitle": "Accède à tous les modes de jeu",

    "home.card.online.title": "JEU ONLINE",
    "home.card.online.subtitle": "Parties à distance (mode à venir)",

    "home.card.stats.title": "STATS",
    "home.card.stats.subtitle": "Statistiques et historiques",

    "home.seeStats": "Voir mes statistiques",

    "home.stats.avg3": "Moy/3",
    "home.stats.best": "Best",
    "home.stats.co": "CO",
    "home.stats.winPct": "Win%",

    // STATUS
    "status.online": "En ligne",
    "status.away": "Absent",
    "status.offline": "Hors ligne",

    // NOMS DE LANGUE
    "lang.fr": "Français",
    "lang.en": "English",
    "lang.es": "Español",
    "lang.de": "Deutsch",
    "lang.it": "Italiano",
    "lang.pt": "Português",
    "lang.nl": "Nederlands",
  },

  /* ---------- ENGLISH ---------- */
  en: {
    // NAV
    "nav.home": "Home",
    "nav.games": "Games",
    "nav.profiles": "Profiles",
    "nav.friends": "Friends",
    "nav.stats": "Stats",
    "nav.settings": "Settings",

    // SETTINGS
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

    // HOME
    "home.welcome": "Welcome",
    "home.title": "DARTS COUNTER",
    "home.connect": "SIGN IN",

    "home.card.profiles.title": "PROFILES",
    "home.card.profiles.subtitle": "Create and manage profiles",

    "home.card.local.title": "LOCAL GAME",
    "home.card.local.subtitle": "Access all offline game modes",

    "home.card.online.title": "ONLINE GAME",
    "home.card.online.subtitle": "Remote matches (coming soon)",

    "home.card.stats.title": "STATS",
    "home.card.stats.subtitle": "Statistics and history",

    "home.seeStats": "View my stats",

    "home.stats.avg3": "Avg/3",
    "home.stats.best": "Best",
    "home.stats.co": "CO",
    "home.stats.winPct": "Win%",

    // STATUS
    "status.online": "Online",
    "status.away": "Away",
    "status.offline": "Offline",

    // NOMS DE LANGUE
    "lang.fr": "French",
    "lang.en": "English",
    "lang.es": "Spanish",
    "lang.de": "German",
    "lang.it": "Italian",
    "lang.pt": "Portuguese",
    "lang.nl": "Dutch",
  },

  /* ---------- ESPAÑOL ---------- */
  es: {
    // NAV
    "nav.home": "Inicio",
    "nav.games": "Juegos",
    "nav.profiles": "Perfiles",
    "nav.friends": "Amigos",
    "nav.stats": "Estadísticas",
    "nav.settings": "Ajustes",

    // SETTINGS
    "settings.back": "Atrás",
    "settings.title": "Ajustes",
    "settings.subtitle":
      "Personaliza el tema y el idioma de la aplicación",
    "settings.theme": "Tema",
    "settings.lang": "Idioma",

    "settings.theme.gold.label": "Oro neón",
    "settings.theme.gold.desc": "Tema dorado premium",
    "settings.theme.pink.label": "Rosa neón",
    "settings.theme.pink.desc": "Ambiente arcade rosa",
    "settings.theme.petrol.label": "Azul petróleo",
    "settings.theme.petrol.desc": "Azul neón profundo",
    "settings.theme.green.label": "Verde neón",
    "settings.theme.green.desc": "Estilo de práctica luminoso",
    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Violeta / magenta intenso",
    "settings.theme.red.label": "Rojo",
    "settings.theme.red.desc": "Rojo arcade agresivo",
    "settings.theme.orange.label": "Naranja",
    "settings.theme.orange.desc": "Naranja cálido enérgico",
    "settings.theme.white.label": "Blanco",
    "settings.theme.white.desc": "Fondo claro moderno",

    // HOME
    "home.welcome": "Bienvenido",
    "home.title": "DARTS COUNTER",
    "home.connect": "INICIAR SESIÓN",

    "home.card.profiles.title": "PERFILES",
    "home.card.profiles.subtitle": "Creación y gestión de perfiles",

    "home.card.local.title": "JUEGO LOCAL",
    "home.card.local.subtitle": "Accede a todos los modos de juego",

    "home.card.online.title": "JUEGO ONLINE",
    "home.card.online.subtitle": "Partidas a distancia (modo próximamente)",

    "home.card.stats.title": "ESTADÍSTICAS",
    "home.card.stats.subtitle": "Estadísticas e historial",

    "home.seeStats": "Ver mis estadísticas",

    "home.stats.avg3": "Prom/3",
    "home.stats.best": "Mejor",
    "home.stats.co": "CO",
    "home.stats.winPct": "Win%",

    // STATUS
    "status.online": "En línea",
    "status.away": "Ausente",
    "status.offline": "Desconectado",

    // NOMS DE LANGUE
    "lang.fr": "Francés",
    "lang.en": "Inglés",
    "lang.es": "Español",
    "lang.de": "Alemán",
    "lang.it": "Italiano",
    "lang.pt": "Portugués",
    "lang.nl": "Neerlandés",
  },

  /* ---------- DEUTSCH ---------- */
  de: {
    // NAV
    "nav.home": "Start",
    "nav.games": "Spiele",
    "nav.profiles": "Profile",
    "nav.friends": "Freunde",
    "nav.stats": "Statistiken",
    "nav.settings": "Einstellungen",

    // SETTINGS
    "settings.back": "Zurück",
    "settings.title": "Einstellungen",
    "settings.subtitle":
      "Passe das Thema und die Sprache der App an",
    "settings.theme": "Thema",
    "settings.lang": "Sprache",

    "settings.theme.gold.label": "Gold-Neon",
    "settings.theme.gold.desc": "Premium-Gold-Thema",
    "settings.theme.pink.label": "Pink-Neon",
    "settings.theme.pink.desc": "Arcade-Pink-Atmosphäre",
    "settings.theme.petrol.label": "Petrolblau",
    "settings.theme.petrol.desc": "Tiefes Neonblau",
    "settings.theme.green.label": "Grün-Neon",
    "settings.theme.green.desc": "Helles Trainings-Design",
    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Intensives Violett/Magenta",
    "settings.theme.red.label": "Rot",
    "settings.theme.red.desc": "Aggressives Arcade-Rot",
    "settings.theme.orange.label": "Orange",
    "settings.theme.orange.desc": "Energisches warmes Orange",
    "settings.theme.white.label": "Weiß",
    "settings.theme.white.desc": "Modernes helles Layout",

    // HOME
    "home.welcome": "Willkommen",
    "home.title": "DARTS COUNTER",
    "home.connect": "ANMELDEN",

    "home.card.profiles.title": "PROFILE",
    "home.card.profiles.subtitle": "Profile erstellen und verwalten",

    "home.card.local.title": "LOKALES SPIEL",
    "home.card.local.subtitle": "Greife auf alle Spielmodi zu",

    "home.card.online.title": "ONLINE-SPIEL",
    "home.card.online.subtitle":
      "Spiele auf Distanz (Modus in Vorbereitung)",

    "home.card.stats.title": "STATISTIKEN",
    "home.card.stats.subtitle": "Statistiken und Verlauf",

    "home.seeStats": "Meine Statistiken ansehen",

    "home.stats.avg3": "Schnitt/3",
    "home.stats.best": "Best",
    "home.stats.co": "CO",
    "home.stats.winPct": "Sieg%",

    // STATUS
    "status.online": "Online",
    "status.away": "Abwesend",
    "status.offline": "Offline",

    // NOMS DE LANGUE
    "lang.fr": "Französisch",
    "lang.en": "Englisch",
    "lang.es": "Spanisch",
    "lang.de": "Deutsch",
    "lang.it": "Italienisch",
    "lang.pt": "Portugiesisch",
    "lang.nl": "Niederländisch",
  },

  /* ---------- ITALIANO ---------- */
  it: {
    // NAV
    "nav.home": "Home",
    "nav.games": "Giochi",
    "nav.profiles": "Profili",
    "nav.friends": "Amici",
    "nav.stats": "Statistiche",
    "nav.settings": "Impostazioni",

    // SETTINGS
    "settings.back": "Indietro",
    "settings.title": "Impostazioni",
    "settings.subtitle":
      "Personalizza il tema e la lingua dell'app",
    "settings.theme": "Tema",
    "settings.lang": "Lingua",

    "settings.theme.gold.label": "Oro neon",
    "settings.theme.gold.desc": "Tema oro premium",
    "settings.theme.pink.label": "Rosa neon",
    "settings.theme.pink.desc": "Atmosfera arcade rosa",
    "settings.theme.petrol.label": "Blu petrolio",
    "settings.theme.petrol.desc": "Blu neon profondo",
    "settings.theme.green.label": "Verde neon",
    "settings.theme.green.desc": "Stile pratica luminoso",
    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Violetto/magenta intenso",
    "settings.theme.red.label": "Rosso",
    "settings.theme.red.desc": "Rosso arcade aggressivo",
    "settings.theme.orange.label": "Arancione",
    "settings.theme.orange.desc": "Arancione caldo e energico",
    "settings.theme.white.label": "Bianco",
    "settings.theme.white.desc": "Sfondo chiaro moderno",

    // HOME
    "home.welcome": "Benvenuto",
    "home.title": "DARTS COUNTER",
    "home.connect": "ACCEDI",

    "home.card.profiles.title": "PROFILI",
    "home.card.profiles.subtitle": "Creazione e gestione dei profili",

    "home.card.local.title": "GIOCO LOCALE",
    "home.card.local.subtitle": "Accedi a tutte le modalità di gioco",

    "home.card.online.title": "GIOCO ONLINE",
    "home.card.online.subtitle":
      "Partite a distanza (modalità in arrivo)",

    "home.card.stats.title": "STATISTICHE",
    "home.card.stats.subtitle": "Statistiche e cronologia",

    "home.seeStats": "Vedi le mie statistiche",

    "home.stats.avg3": "Media/3",
    "home.stats.best": "Best",
    "home.stats.co": "CO",
    "home.stats.winPct": "Win%",

    // STATUS
    "status.online": "Online",
    "status.away": "Assente",
    "status.offline": "Offline",

    // NOMS DE LANGUE
    "lang.fr": "Francese",
    "lang.en": "Inglese",
    "lang.es": "Spagnolo",
    "lang.de": "Tedesco",
    "lang.it": "Italiano",
    "lang.pt": "Portoghese",
    "lang.nl": "Olandese",
  },

  /* ---------- PORTUGUÊS ---------- */
  pt: {
    // NAV
    "nav.home": "Início",
    "nav.games": "Jogos",
    "nav.profiles": "Perfis",
    "nav.friends": "Amigos",
    "nav.stats": "Estatísticas",
    "nav.settings": "Configurações",

    // SETTINGS
    "settings.back": "Voltar",
    "settings.title": "Configurações",
    "settings.subtitle":
      "Personalize o tema e o idioma do aplicativo",
    "settings.theme": "Tema",
    "settings.lang": "Idioma",

    "settings.theme.gold.label": "Ouro neon",
    "settings.theme.gold.desc": "Tema dourado premium",
    "settings.theme.pink.label": "Rosa neon",
    "settings.theme.pink.desc": "Ambiente arcade rosa",
    "settings.theme.petrol.label": "Azul petróleo",
    "settings.theme.petrol.desc": "Azul neon profundo",
    "settings.theme.green.label": "Verde neon",
    "settings.theme.green.desc": "Estilo de treino luminoso",
    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Violeta/magenta intenso",
    "settings.theme.red.label": "Vermelho",
    "settings.theme.red.desc": "Vermelho arcade agressivo",
    "settings.theme.orange.label": "Laranja",
    "settings.theme.orange.desc": "Laranja quente e enérgico",
    "settings.theme.white.label": "Branco",
    "settings.theme.white.desc": "Fundo claro moderno",

    // HOME
    "home.welcome": "Bem-vindo",
    "home.title": "DARTS COUNTER",
    "home.connect": "INICIAR SESSÃO",

    "home.card.profiles.title": "PERFIS",
    "home.card.profiles.subtitle":
      "Criação e gestão de perfis",

    "home.card.local.title": "JOGO LOCAL",
    "home.card.local.subtitle":
      "Aceda a todos os modos de jogo",

    "home.card.online.title": "JOGO ONLINE",
    "home.card.online.subtitle":
      "Partidas à distância (modo em breve)",

    "home.card.stats.title": "ESTATÍSTICAS",
    "home.card.stats.subtitle": "Estatísticas e histórico",

    "home.seeStats": "Ver as minhas estatísticas",

    "home.stats.avg3": "Méd/3",
    "home.stats.best": "Best",
    "home.stats.co": "CO",
    "home.stats.winPct": "Win%",

    // STATUS
    "status.online": "Online",
    "status.away": "Ausente",
    "status.offline": "Offline",

    // NOMS DE LANGUE
    "lang.fr": "Francês",
    "lang.en": "Inglês",
    "lang.es": "Espanhol",
    "lang.de": "Alemão",
    "lang.it": "Italiano",
    "lang.pt": "Português",
    "lang.nl": "Holandês",
  },

  /* ---------- NEDERLANDS ---------- */
  nl: {
    // NAV
    "nav.home": "Home",
    "nav.games": "Spellen",
    "nav.profiles": "Profielen",
    "nav.friends": "Vrienden",
    "nav.stats": "Statistieken",
    "nav.settings": "Instellingen",

    // SETTINGS
    "settings.back": "Terug",
    "settings.title": "Instellingen",
    "settings.subtitle":
      "Pas het thema en de taal van de app aan",
    "settings.theme": "Thema",
    "settings.lang": "Taal",

    "settings.theme.gold.label": "Goud neon",
    "settings.theme.gold.desc": "Premium goud thema",
    "settings.theme.pink.label": "Roze neon",
    "settings.theme.pink.desc": "Arcade roze sfeer",
    "settings.theme.petrol.label": "Petrolblauw",
    "settings.theme.petrol.desc": "Diep neonblauw",
    "settings.theme.green.label": "Groen neon",
    "settings.theme.green.desc": "Licht oefenstijl",
    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Intens violet/magenta",
    "settings.theme.red.label": "Rood",
    "settings.theme.red.desc": "Agressief arcade-rood",
    "settings.theme.orange.label": "Oranje",
    "settings.theme.orange.desc": "Energiek warm oranje",
    "settings.theme.white.label": "Wit",
    "settings.theme.white.desc": "Modern licht thema",

    // HOME
    "home.welcome": "Welkom",
    "home.title": "DARTS COUNTER",
    "home.connect": "INLOGGEN",

    "home.card.profiles.title": "PROFIELEN",
    "home.card.profiles.subtitle":
      "Aanmaken en beheren van profielen",

    "home.card.local.title": "LOKAAL SPEL",
    "home.card.local.subtitle":
      "Toegang tot alle spelmodi",

    "home.card.online.title": "ONLINE SPEL",
    "home.card.online.subtitle":
      "Wedstrijden op afstand (modus binnenkort)",

    "home.card.stats.title": "STATISTIEKEN",
    "home.card.stats.subtitle": "Statistieken en geschiedenis",

    "home.seeStats": "Mijn statistieken bekijken",

    "home.stats.avg3": "Gem/3",
    "home.stats.best": "Best",
    "home.stats.co": "CO",
    "home.stats.winPct": "Win%",

    // STATUS
    "status.online": "Online",
    "status.away": "Afwezig",
    "status.offline": "Offline",

    // NOMS DE LANGUE
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

  // Chargement initial
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

      // fallback FR
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