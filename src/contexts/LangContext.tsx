// ============================================
// src/contexts/LangContext.tsx
// Contexte langue + i18n très simple
// - Langues : fr, en, es, de, it, pt, nl, ru, zh, ja, ar
// - t(key, fallback) :
//     1) cherche dans la langue courante
//     2) sinon dans le FR
//     3) sinon retourne fallback ou la key
// - Persistance dans localStorage ("dc_lang_v1")
// ============================================

import React from "react";

export type Lang =
  | "fr"
  | "en"
  | "es"
  | "de"
  | "it"
  | "pt"
  | "nl"
  | "ru"
  | "zh"
  | "ja"
  | "ar";

const LANG_STORAGE_KEY = "dc_lang_v1";

// --------------------------------------------------
// DICTIONNAIRES DE TRADUCTION
// --------------------------------------------------
type Dict = Record<string, string>;
type LangDict = Record<Lang, Dict>;

const DICT: LangDict = {
  // ============================
  // FRANÇAIS
  // ============================
  fr: {
    // --- NAV / BOTTOM NAV ---
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

    // --- NOMS DES LANGUES ---
    "lang.fr": "Français",
    "lang.en": "English",
    "lang.es": "Español",
    "lang.de": "Deutsch",
    "lang.it": "Italiano",
    "lang.pt": "Português",
    "lang.nl": "Nederlands",
    "lang.ru": "Russe",
    "lang.zh": "Chinois",
    "lang.ja": "Japonais",
    "lang.ar": "Arabe",

    // --- HOME ---
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

    // --- STATUT EN LIGNE ---
    "status.online": "En ligne",
    "status.away": "Absent",
    "status.offline": "Hors ligne",
  },

  // ============================
  // ENGLISH
  // ============================
  en: {
    // --- NAV / BOTTOM NAV ---
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

    // --- LANGUAGE NAMES ---
    "lang.fr": "French",
    "lang.en": "English",
    "lang.es": "Spanish",
    "lang.de": "German",
    "lang.it": "Italian",
    "lang.pt": "Portuguese",
    "lang.nl": "Dutch",
    "lang.ru": "Russian",
    "lang.zh": "Chinese",
    "lang.ja": "Japanese",
    "lang.ar": "Arabic",

    // --- HOME ---
    "home.welcome": "Welcome",
    "home.title": "DARTS COUNTER",
    "home.connect": "CONNECT",

    "home.card.profiles.title": "PROFILES",
    "home.card.profiles.subtitle": "Create and manage profiles",

    "home.card.local.title": "LOCAL PLAY",
    "home.card.local.subtitle": "Access all game modes",

    "home.card.online.title": "ONLINE PLAY",
    "home.card.online.subtitle": "Remote games (coming soon)",

    "home.card.stats.title": "STATS",
    "home.card.stats.subtitle": "Statistics and history",

    "home.seeStats": "View my statistics",

    "home.stats.avg3": "Avg/3",
    "home.stats.best": "Best",
    "home.stats.co": "CO",
    "home.stats.winPct": "Win%",

    // --- ONLINE STATUS ---
    "status.online": "Online",
    "status.away": "Away",
    "status.offline": "Offline",
  },

  // ============================
  // ESPAÑOL
  // ============================
  es: {
    // NAV
    "nav.home": "Inicio",
    "nav.games": "Juegos",
    "nav.profiles": "Perfiles",
    "nav.friends": "Amigos",
    "nav.stats": "Estadísticas",
    "nav.settings": "Ajustes",

    // SETTINGS
    "settings.back": "Volver",
    "settings.title": "Ajustes",
    "settings.subtitle":
      "Personaliza el tema y el idioma de la aplicación",
    "settings.theme": "Tema",
    "settings.lang": "Idioma",

    "settings.theme.gold.label": "Neón dorado",
    "settings.theme.gold.desc": "Tema dorado premium",

    "settings.theme.pink.label": "Neón rosa",
    "settings.theme.pink.desc": "Ambiente arcade rosa",

    "settings.theme.petrol.label": "Azul petróleo",
    "settings.theme.petrol.desc": "Azul neón profundo",

    "settings.theme.green.label": "Neón verde",
    "settings.theme.green.desc": "Estilo de práctica luminoso",

    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Violeta / magenta intenso",

    "settings.theme.red.label": "Rojo",
    "settings.theme.red.desc": "Rojo arcade agresivo",

    "settings.theme.orange.label": "Naranja",
    "settings.theme.orange.desc": "Naranja cálido y enérgico",

    "settings.theme.white.label": "Blanco",
    "settings.theme.white.desc": "Fondo claro moderno",

    // NOMS DES LANGUES
    "lang.fr": "Francés",
    "lang.en": "Inglés",
    "lang.es": "Español",
    "lang.de": "Alemán",
    "lang.it": "Italiano",
    "lang.pt": "Portugués",
    "lang.nl": "Neerlandés",
    "lang.ru": "Ruso",
    "lang.zh": "Chino",
    "lang.ja": "Japonés",
    "lang.ar": "Árabe",

    // HOME
    "home.welcome": "Bienvenido",
    "home.title": "DARTS COUNTER",
    "home.connect": "INICIAR SESIÓN",

    "home.card.profiles.title": "PERFILES",
    "home.card.profiles.subtitle": "Creación y gestión de perfiles",

    "home.card.local.title": "JUEGO LOCAL",
    "home.card.local.subtitle": "Accede a todos los modos de juego",

    "home.card.online.title": "JUEGO ONLINE",
    "home.card.online.subtitle":
      "Partidas a distancia (modo próximamente)",

    "home.card.stats.title": "ESTADÍSTICAS",
    "home.card.stats.subtitle": "Estadísticas e históricos",

    "home.seeStats": "Ver mis estadísticas",

    "home.stats.avg3": "Prom/3",
    "home.stats.best": "Mejor",
    "home.stats.co": "CO",
    "home.stats.winPct": "% Victorias",

    // STATUS
    "status.online": "En línea",
    "status.away": "Ausente",
    "status.offline": "Desconectado",
  },

  // ============================
  // DEUTSCH
  // ============================
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
      "Passe das Design und die Sprache der App an",
    "settings.theme": "Design",
    "settings.lang": "Sprache",

    "settings.theme.gold.label": "Gold-Neon",
    "settings.theme.gold.desc": "Premium-Gold-Design",

    "settings.theme.pink.label": "Pink-Neon",
    "settings.theme.pink.desc": "Arcade-Pink-Atmosphäre",

    "settings.theme.petrol.label": "Petrolblau",
    "settings.theme.petrol.desc": "Tiefes Neonblau",

    "settings.theme.green.label": "Grün-Neon",
    "settings.theme.green.desc": "Helles Trainingsdesign",

    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Intensives Violett/Magenta",

    "settings.theme.red.label": "Rot",
    "settings.theme.red.desc": "Aggressives Arcade-Rot",

    "settings.theme.orange.label": "Orange",
    "settings.theme.orange.desc": "Kräftiges warmes Orange",

    "settings.theme.white.label": "Weiß",
    "settings.theme.white.desc": "Modernes helles Layout",

    // LANGUAGE NAMES
    "lang.fr": "Französisch",
    "lang.en": "Englisch",
    "lang.es": "Spanisch",
    "lang.de": "Deutsch",
    "lang.it": "Italienisch",
    "lang.pt": "Portugiesisch",
    "lang.nl": "Niederländisch",
    "lang.ru": "Russisch",
    "lang.zh": "Chinesisch",
    "lang.ja": "Japanisch",
    "lang.ar": "Arabisch",

    // HOME
    "home.welcome": "Willkommen",
    "home.title": "DARTS COUNTER",
    "home.connect": "VERBINDEN",

    "home.card.profiles.title": "PROFILE",
    "home.card.profiles.subtitle": "Profile erstellen und verwalten",

    "home.card.local.title": "LOKALES SPIEL",
    "home.card.local.subtitle": "Greife auf alle Spielmodi zu",

    "home.card.online.title": "ONLINE-SPIEL",
    "home.card.online.subtitle": "Online-Partien (bald verfügbar)",

    "home.card.stats.title": "STATS",
    "home.card.stats.subtitle": "Statistiken und Historie",

    "home.seeStats": "Meine Statistiken ansehen",

    "home.stats.avg3": "Schnitt/3",
    "home.stats.best": "Best",
    "home.stats.co": "CO",
    "home.stats.winPct": "Siege%",

    // STATUS
    "status.online": "Online",
    "status.away": "Abwesend",
    "status.offline": "Offline",
  },

  // ============================
  // ITALIANO
  // ============================
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

    "settings.theme.gold.label": "Neon oro",
    "settings.theme.gold.desc": "Tema oro premium",

    "settings.theme.pink.label": "Neon rosa",
    "settings.theme.pink.desc": "Atmosfera arcade rosa",

    "settings.theme.petrol.label": "Blu petrolio",
    "settings.theme.petrol.desc": "Blu neon profondo",

    "settings.theme.green.label": "Neon verde",
    "settings.theme.green.desc": "Stile practice luminoso",

    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Viola/magenta intenso",

    "settings.theme.red.label": "Rosso",
    "settings.theme.red.desc": "Rosso arcade aggressivo",

    "settings.theme.orange.label": "Arancione",
    "settings.theme.orange.desc": "Arancione caldo ed energico",

    "settings.theme.white.label": "Bianco",
    "settings.theme.white.desc": "Sfondo chiaro moderno",

    // LANGUAGE NAMES
    "lang.fr": "Francese",
    "lang.en": "Inglese",
    "lang.es": "Spagnolo",
    "lang.de": "Tedesco",
    "lang.it": "Italiano",
    "lang.pt": "Portoghese",
    "lang.nl": "Olandese",
    "lang.ru": "Russo",
    "lang.zh": "Cinese",
    "lang.ja": "Giapponese",
    "lang.ar": "Arabo",

    // HOME
    "home.welcome": "Benvenuto",
    "home.title": "DARTS COUNTER",
    "home.connect": "CONNETTITI",

    "home.card.profiles.title": "PROFILI",
    "home.card.profiles.subtitle":
      "Creazione e gestione dei profili",

    "home.card.local.title": "GIOCO LOCALE",
    "home.card.local.subtitle":
      "Accedi a tutte le modalità di gioco",

    "home.card.online.title": "GIOCO ONLINE",
    "home.card.online.subtitle":
      "Partite a distanza (modalità in arrivo)",

    "home.card.stats.title": "STATISTICHE",
    "home.card.stats.subtitle": "Statistiche e cronologia",

    "home.seeStats": "Vedi le mie statistiche",

    "home.stats.avg3": "Media/3",
    "home.stats.best": "Best",
    "home.stats.co": "CO",
    "home.stats.winPct": "Vitt%",

    // STATUS
    "status.online": "Online",
    "status.away": "Assente",
    "status.offline": "Offline",
  },

  // ============================
  // PORTUGUÊS
  // ============================
  pt: {
    // NAV
    "nav.home": "Início",
    "nav.games": "Jogos",
    "nav.profiles": "Perfis",
    "nav.friends": "Amigos",
    "nav.stats": "Estatísticas",
    "nav.settings": "Definições",

    // SETTINGS
    "settings.back": "Voltar",
    "settings.title": "Definições",
    "settings.subtitle":
      "Personaliza o tema e o idioma da aplicação",
    "settings.theme": "Tema",
    "settings.lang": "Idioma",

    "settings.theme.gold.label": "Neon dourado",
    "settings.theme.gold.desc": "Tema dourado premium",

    "settings.theme.pink.label": "Neon rosa",
    "settings.theme.pink.desc": "Ambiente arcade rosa",

    "settings.theme.petrol.label": "Azul petróleo",
    "settings.theme.petrol.desc": "Azul neon profundo",

    "settings.theme.green.label": "Neon verde",
    "settings.theme.green.desc": "Estilo de treino luminoso",

    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Violeta/magenta intenso",

    "settings.theme.red.label": "Vermelho",
    "settings.theme.red.desc": "Vermelho arcade agressivo",

    "settings.theme.orange.label": "Laranja",
    "settings.theme.orange.desc": "Laranja quente e enérgico",

    "settings.theme.white.label": "Branco",
    "settings.theme.white.desc": "Fundo claro moderno",

    // LANGUAGE NAMES
    "lang.fr": "Francês",
    "lang.en": "Inglês",
    "lang.es": "Espanhol",
    "lang.de": "Alemão",
    "lang.it": "Italiano",
    "lang.pt": "Português",
    "lang.nl": "Holandês",
    "lang.ru": "Russo",
    "lang.zh": "Chinês",
    "lang.ja": "Japonês",
    "lang.ar": "Árabe",

    // HOME
    "home.welcome": "Bem-vindo",
    "home.title": "DARTS COUNTER",
    "home.connect": "LIGAR",

    "home.card.profiles.title": "PERFIS",
    "home.card.profiles.subtitle":
      "Criação e gestão de perfis",

    "home.card.local.title": "JOGO LOCAL",
    "home.card.local.subtitle":
      "Acede a todos os modos de jogo",

    "home.card.online.title": "JOGO ONLINE",
    "home.card.online.subtitle":
      "Partidas à distância (modo em breve)",

    "home.card.stats.title": "ESTATÍSTICAS",
    "home.card.stats.subtitle": "Estatísticas e histórico",

    "home.seeStats": "Ver as minhas estatísticas",

    "home.stats.avg3": "Méd/3",
    "home.stats.best": "Melhor",
    "home.stats.co": "CO",
    "home.stats.winPct": "Vit%",

    // STATUS
    "status.online": "Online",
    "status.away": "Ausente",
    "status.offline": "Offline",
  },

  // ============================
  // NEDERLANDS
  // ============================
  nl: {
    // NAV
    "nav.home": "Home",
    "nav.games": "Spellen",
    "nav.profiles": "Profielen",
    "nav.friends": "Vrienden",
    "nav.stats": "Stats",
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
    "settings.theme.green.desc": "Helder oefen-thema",

    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Intens violet/magenta",

    "settings.theme.red.label": "Rood",
    "settings.theme.red.desc": "Fel arcade-rood",

    "settings.theme.orange.label": "Oranje",
    "settings.theme.orange.desc": "Warm energiek oranje",

    "settings.theme.white.label": "Wit",
    "settings.theme.white.desc": "Modern licht thema",

    // LANGUAGE NAMES
    "lang.fr": "Frans",
    "lang.en": "Engels",
    "lang.es": "Spaans",
    "lang.de": "Duits",
    "lang.it": "Italiaans",
    "lang.pt": "Portugees",
    "lang.nl": "Nederlands",
    "lang.ru": "Russisch",
    "lang.zh": "Chinees",
    "lang.ja": "Japans",
    "lang.ar": "Arabisch",

    // HOME
    "home.welcome": "Welkom",
    "home.title": "DARTS COUNTER",
    "home.connect": "VERBINDEN",

    "home.card.profiles.title": "PROFIELEN",
    "home.card.profiles.subtitle":
      "Profielen aanmaken en beheren",

    "home.card.local.title": "LOKAAL SPEL",
    "home.card.local.subtitle":
      "Toegang tot alle spelmodi",

    "home.card.online.title": "ONLINE SPEL",
    "home.card.online.subtitle":
      "Online wedstrijden (binnenkort beschikbaar)",

    "home.card.stats.title": "STATS",
    "home.card.stats.subtitle":
      "Statistieken en geschiedenis",

    "home.seeStats": "Mijn statistieken bekijken",

    "home.stats.avg3": "Gem/3",
    "home.stats.best": "Best",
    "home.stats.co": "CO",
    "home.stats.winPct": "Win%",

    // STATUS
    "status.online": "Online",
    "status.away": "Afwezig",
    "status.offline": "Offline",
  },

  // ============================
  // РУССКИЙ
  // ============================
  ru: {
    // NAV
    "nav.home": "Главная",
    "nav.games": "Игры",
    "nav.profiles": "Профили",
    "nav.friends": "Друзья",
    "nav.stats": "Статистика",
    "nav.settings": "Настройки",

    // SETTINGS
    "settings.back": "Назад",
    "settings.title": "Настройки",
    "settings.subtitle":
      "Настройте тему и язык приложения",
    "settings.theme": "Тема",
    "settings.lang": "Язык",

    "settings.theme.gold.label": "Золотой неон",
    "settings.theme.gold.desc": "Премиум золотая тема",

    "settings.theme.pink.label": "Розовый неон",
    "settings.theme.pink.desc": "Аркадная розовая атмосфера",

    "settings.theme.petrol.label": "Петролеум",
    "settings.theme.petrol.desc": "Глубокий неоновый синий",

    "settings.theme.green.label": "Зелёный неон",
    "settings.theme.green.desc": "Яркий тренировочный стиль",

    "settings.theme.magenta.label": "Маджента",
    "settings.theme.magenta.desc": "Интенсивный фиолетовый / маджента",

    "settings.theme.red.label": "Красный",
    "settings.theme.red.desc": "Агрессивный аркадный красный",

    "settings.theme.orange.label": "Оранжевый",
    "settings.theme.orange.desc": "Тёплый энергичный оранжевый",

    "settings.theme.white.label": "Белый",
    "settings.theme.white.desc": "Современный светлый фон",

    // LANGUAGE NAMES
    "lang.fr": "Французский",
    "lang.en": "Английский",
    "lang.es": "Испанский",
    "lang.de": "Немецкий",
    "lang.it": "Итальянский",
    "lang.pt": "Португальский",
    "lang.nl": "Нидерландский",
    "lang.ru": "Русский",
    "lang.zh": "Китайский",
    "lang.ja": "Японский",
    "lang.ar": "Арабский",

    // HOME
    "home.welcome": "Добро пожаловать",
    "home.title": "DARTS COUNTER",
    "home.connect": "ПОДКЛЮЧИТЬСЯ",

    "home.card.profiles.title": "ПРОФИЛИ",
    "home.card.profiles.subtitle": "Создание и управление профилями",

    "home.card.local.title": "ЛОКАЛЬНАЯ ИГРА",
    "home.card.local.subtitle": "Доступ ко всем режимам игры",

    "home.card.online.title": "ОНЛАЙН-ИГРА",
    "home.card.online.subtitle": "Игра на расстоянии (режим скоро)",

    "home.card.stats.title": "СТАТИСТИКА",
    "home.card.stats.subtitle": "Статистика и история",

    "home.seeStats": "Посмотреть мою статистику",

    "home.stats.avg3": "Ср/3",
    "home.stats.best": "Лучший",
    "home.stats.co": "CO",
    "home.stats.winPct": "Победы%",

    // STATUS
    "status.online": "В сети",
    "status.away": "Отсутствует",
    "status.offline": "Не в сети",
  },

  // ============================
  // 中文 (简体)
  // ============================
  zh: {
    // NAV
    "nav.home": "首页",
    "nav.games": "游戏",
    "nav.profiles": "资料",
    "nav.friends": "好友",
    "nav.stats": "统计",
    "nav.settings": "设置",

    // SETTINGS
    "settings.back": "返回",
    "settings.title": "设置",
    "settings.subtitle": "自定义应用的主题和语言",
    "settings.theme": "主题",
    "settings.lang": "语言",

    "settings.theme.gold.label": "金色霓虹",
    "settings.theme.gold.desc": "高级金色主题",

    "settings.theme.pink.label": "粉色霓虹",
    "settings.theme.pink.desc": "粉色街机风格",

    "settings.theme.petrol.label": "石油蓝",
    "settings.theme.petrol.desc": "深邃霓虹蓝",

    "settings.theme.green.label": "绿色霓虹",
    "settings.theme.green.desc": "明亮练习风格",

    "settings.theme.magenta.label": "洋红",
    "settings.theme.magenta.desc": "强烈紫色 / 洋红",

    "settings.theme.red.label": "红色",
    "settings.theme.red.desc": "强烈街机红",

    "settings.theme.orange.label": "橙色",
    "settings.theme.orange.desc": "温暖有活力的橙色",

    "settings.theme.white.label": "白色",
    "settings.theme.white.desc": "现代浅色背景",

    // LANGUAGE NAMES
    "lang.fr": "法语",
    "lang.en": "英语",
    "lang.es": "西班牙语",
    "lang.de": "德语",
    "lang.it": "意大利语",
    "lang.pt": "葡萄牙语",
    "lang.nl": "荷兰语",
    "lang.ru": "俄语",
    "lang.zh": "中文",
    "lang.ja": "日语",
    "lang.ar": "阿拉伯语",

    // HOME
    "home.welcome": "欢迎",
    "home.title": "DARTS COUNTER",
    "home.connect": "连接",

    "home.card.profiles.title": "资料",
    "home.card.profiles.subtitle": "创建和管理玩家资料",

    "home.card.local.title": "本地对战",
    "home.card.local.subtitle": "进入所有游戏模式",

    "home.card.online.title": "在线对战",
    "home.card.online.subtitle": "远程对战（即将推出）",

    "home.card.stats.title": "统计",
    "home.card.stats.subtitle": "统计数据和历史记录",

    "home.seeStats": "查看我的统计数据",

    "home.stats.avg3": "平均/3",
    "home.stats.best": "最佳",
    "home.stats.co": "CO",
    "home.stats.winPct": "胜率%",

    // STATUS
    "status.online": "在线",
    "status.away": "离开",
    "status.offline": "离线",
  },

  // ============================
  // 日本語
  // ============================
  ja: {
    // NAV
    "nav.home": "ホーム",
    "nav.games": "ゲーム",
    "nav.profiles": "プロフィール",
    "nav.friends": "フレンド",
    "nav.stats": "統計",
    "nav.settings": "設定",

    // SETTINGS
    "settings.back": "戻る",
    "settings.title": "設定",
    "settings.subtitle": "アプリのテーマと言語をカスタマイズ",
    "settings.theme": "テーマ",
    "settings.lang": "言語",

    "settings.theme.gold.label": "ゴールドネオン",
    "settings.theme.gold.desc": "プレミアムゴールドテーマ",

    "settings.theme.pink.label": "ピンクネオン",
    "settings.theme.pink.desc": "アーケード風ピンク",

    "settings.theme.petrol.label": "ペトロールブルー",
    "settings.theme.petrol.desc": "深いネオンブルー",

    "settings.theme.green.label": "グリーンネオン",
    "settings.theme.green.desc": "明るい練習用スタイル",

    "settings.theme.magenta.label": "マゼンタ",
    "settings.theme.magenta.desc": "強いバイオレット／マゼンタ",

    "settings.theme.red.label": "レッド",
    "settings.theme.red.desc": "アグレッシブなアーケードレッド",

    "settings.theme.orange.label": "オレンジ",
    "settings.theme.orange.desc": "暖かくエネルギッシュなオレンジ",

    "settings.theme.white.label": "ホワイト",
    "settings.theme.white.desc": "モダンなライト背景",

    // LANGUAGE NAMES
    "lang.fr": "フランス語",
    "lang.en": "英語",
    "lang.es": "スペイン語",
    "lang.de": "ドイツ語",
    "lang.it": "イタリア語",
    "lang.pt": "ポルトガル語",
    "lang.nl": "オランダ語",
    "lang.ru": "ロシア語",
    "lang.zh": "中国語",
    "lang.ja": "日本語",
    "lang.ar": "アラビア語",

    // HOME
    "home.welcome": "ようこそ",
    "home.title": "DARTS COUNTER",
    "home.connect": "接続",

    "home.card.profiles.title": "プロフィール",
    "home.card.profiles.subtitle": "プロフィールの作成と管理",

    "home.card.local.title": "ローカルプレイ",
    "home.card.local.subtitle": "すべてのゲームモードにアクセス",

    "home.card.online.title": "オンラインプレイ",
    "home.card.online.subtitle": "遠隔対戦（近日追加）",

    "home.card.stats.title": "統計",
    "home.card.stats.subtitle": "統計と履歴",

    "home.seeStats": "自分の統計を見る",

    "home.stats.avg3": "平均/3",
    "home.stats.best": "ベスト",
    "home.stats.co": "CO",
    "home.stats.winPct": "勝率%",

    // STATUS
    "status.online": "オンライン",
    "status.away": "退席中",
    "status.offline": "オフライン",
  },

  // ============================
  // العربية
  // ============================
  ar: {
    // NAV  (RTL naturellement)
    "nav.home": "الرئيسية",
    "nav.games": "الألعاب",
    "nav.profiles": "الملفات الشخصية",
    "nav.friends": "الأصدقاء",
    "nav.stats": "الإحصائيات",
    "nav.settings": "الإعدادات",

    // SETTINGS
    "settings.back": "رجوع",
    "settings.title": "الإعدادات",
    "settings.subtitle": "قم بتخصيص سمة وتنسيق لغة التطبيق",
    "settings.theme": "السمة",
    "settings.lang": "اللغة",

    "settings.theme.gold.label": "نيون ذهبي",
    "settings.theme.gold.desc": "سمة ذهبية مميزة",

    "settings.theme.pink.label": "نيون وردي",
    "settings.theme.pink.desc": "أجواء آركيد وردية",

    "settings.theme.petrol.label": "أزرق بترولي",
    "settings.theme.petrol.desc": "أزرق نيون عميق",

    "settings.theme.green.label": "نيون أخضر",
    "settings.theme.green.desc": "أسلوب تدريب مضيء",

    "settings.theme.magenta.label": "ماجنتا",
    "settings.theme.magenta.desc": "بنفسجي / ماجنتا قوي",

    "settings.theme.red.label": "أحمر",
    "settings.theme.red.desc": "أحمر آركيد هجومي",

    "settings.theme.orange.label": "برتقالي",
    "settings.theme.orange.desc": "برتقالي دافئ وحيوي",

    "settings.theme.white.label": "أبيض",
    "settings.theme.white.desc": "خلفية فاتحة عصرية",

    // LANGUAGE NAMES
    "lang.fr": "الفرنسية",
    "lang.en": "الإنجليزية",
    "lang.es": "الإسبانية",
    "lang.de": "الألمانية",
    "lang.it": "الإيطالية",
    "lang.pt": "البرتغالية",
    "lang.nl": "الهولندية",
    "lang.ru": "الروسية",
    "lang.zh": "الصينية",
    "lang.ja": "اليابانية",
    "lang.ar": "العربية",

    // HOME
    "home.welcome": "مرحبًا",
    "home.title": "DARTS COUNTER",
    "home.connect": "اتصال",

    "home.card.profiles.title": "الملفات الشخصية",
    "home.card.profiles.subtitle": "إنشاء وإدارة ملفات اللاعبين",

    "home.card.local.title": "لعبة محلية",
    "home.card.local.subtitle": "الوصول إلى جميع أوضاع اللعب",

    "home.card.online.title": "لعبة أونلاين",
    "home.card.online.subtitle": "مباريات عن بُعد (قريبًا)",

    "home.card.stats.title": "الإحصائيات",
    "home.card.stats.subtitle": "الإحصائيات والسجل",

    "home.seeStats": "عرض إحصائياتي",

    "home.stats.avg3": "متوسط/3",
    "home.stats.best": "أفضل",
    "home.stats.co": "CO",
    "home.stats.winPct": "نسبة الفوز",

    // STATUS
    "status.online": "متصل",
    "status.away": "بعيد",
    "status.offline": "غير متصل",
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
