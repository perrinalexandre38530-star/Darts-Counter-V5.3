// ============================================
// src/contexts/LangContext.tsx
// Contexte langue + i18n très simple
// - Langues : fr, en, es, de, it, pt, nl, ru, zh, ja, ar,
//             hi, tr, da, no, sv, is, pl, ro, sr, hr, cs
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
  | "ar"
  | "hi"
  | "tr"
  | "da"
  | "no"
  | "sv"
  | "is"
  | "pl"
  | "ro"
  | "sr"
  | "hr"
  | "cs";

const LANG_STORAGE_KEY = "dc_lang_v1";

// --------------------------------------------------
// DICTIONNAIRES DE TRADUCTION
// --------------------------------------------------

type Dict = Record<string, string>;
type LangDict = Record<Lang, Dict>;

const DICT: LangDict = {
 // ---------- FRANÇAIS ----------
fr: {
  // --- NAV ---
  "nav.home": "Accueil",
  "nav.games": "Jeux",
  "nav.profiles": "Profils",
  "nav.friends": "Amis",
  "nav.stats": "Stats",
  "nav.settings": "Réglages",

  // --- SETTINGS ---
  "settings.back": "Retour",
  "settings.title": "Réglages",
  "settings.subtitle": "Personnalise le thème et la langue de l'application",
  "settings.theme": "Thème",
  "settings.lang": "Langue",

  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "Thème premium doré",
  "settings.theme.pink.label": "ROSE FLUO",
  "settings.theme.pink.desc": "Ambiance arcade rose",
  "settings.theme.petrol.label": "BLEU PETROLE",
  "settings.theme.petrol.desc": "Bleu profond néon",
  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "Style practice lumineux",
  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "Violet / magenta intense",
  "settings.theme.red.label": "ROUGE VIF",
  "settings.theme.red.desc": "Rouge arcade agressif",
  "settings.theme.orange.label": "ORANGE FEU",
  "settings.theme.orange.desc": "Orange chaud énergique",
  "settings.theme.white.label": "BLANC NEIGE",
  "settings.theme.white.desc": "Fond clair moderne",

  // --- HOME ---
  "home.greeting": "Bienvenue",
  "home.titleApp": "DARTS COUNTER",
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

  // --- STATUS ---
  "status.online": "En ligne",
  "status.away": "Absent",
  "status.offline": "Hors ligne",

  // --- GAMES ---
  "games.title": "TOUS LES JEUX",
  "games.subtitle": "Sélectionne un mode de jeu",

  "games.training.title": "TRAINING",
  "games.training.subtitle": "Améliore ta progression.",
  "games.training.infoTitle": "Training",
  "games.training.infoBody":
    "Mode d'entraînement pour travailler ta régularité, ton scoring et tes fins de partie.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "Classique X01 avec statistiques, historique et options de règles.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "Ferme les zones 15…20 + Bull.",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "Ferme les zones 15 à 20 et le Bull avant ton adversaire.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "Double ton numéro… deviens Killer.",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "Devient Killer en touchant ton numéro puis élimine les autres joueurs.",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "Cible du tour, S-D-T = Shanghai.",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "Atteins Simple+Double+Triple sur le même numéro : Shanghai.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "Mode fun — éliminations.",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "Mode fun multijoueur avec éliminations successives.",

  "games.status.comingSoon": "En développement",
  "games.info.close": "Fermer",

  // --- TRAINING MENU ---
  "training.menu.title": "TRAINING",
  "training.menu.subtitle": "Sélectionne un mode d'entraînement",

  "training.menu.x01.title": "Training X01",
  "training.menu.x01.subtitle": "Travaille scoring et finishing",
  "training.menu.x01.info":
    "Entraînement X01 complet : scoring, régularité, stats avancées.",

  "training.menu.clock.title": "Tour de l’horloge",
  "training.menu.clock.subtitle": "Simple / Double / Triple",
  "training.menu.clock.info":
    "Touches 1 → 20 + Bull. Choisis mode simple, double ou triple.",

  "training.menu.evolution.title": "Évolution",
  "training.menu.evolution.subtitle": "Bientôt disponible",
  "training.menu.evolution.info":
    "Un nouveau mode d'entraînement arrive bientôt.",

  "training.menu.comingSoon": "En développement",
  "training.menu.info.close": "Fermer",

  // --- PAGE PROFILS (ajoutée) ---
  "profiles.title": "PROFILS",
  "profiles.create": "Créer un profil",
  "profiles.edit": "Modifier le profil",
  "profiles.delete": "Supprimer le profil",
  "profiles.confirmDeleteTitle": "Supprimer ce profil ?",
  "profiles.confirmDeleteBody":
    "Ce profil et toutes ses statistiques seront définitivement supprimés.",
  "profiles.confirmDeleteYes": "Supprimer",
  "profiles.confirmDeleteNo": "Annuler",

  "profiles.name": "Nom",
  "profiles.avatar": "Avatar",
  "profiles.stats": "Statistiques",
  "profiles.noProfiles": "Aucun profil existant.",
  "profiles.pickOne": "Choisis un profil",
  "profiles.active": "Profil actif",

  // --- LANGUES ---
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
  "lang.hi": "Hindi",
  "lang.tr": "Turc",
  "lang.da": "Danois",
  "lang.no": "Norvégien",
  "lang.sv": "Suédois",
  "lang.is": "Islandais",
  "lang.pl": "Polonais",
  "lang.ro": "Roumain",
  "lang.at": "Autrichien",
  "lang.sr": "Serbe",
  "lang.hr": "Croate",
  "lang.cs": "Tchèque",
},

  // ---------- ENGLISH ----------
  en: {
    // --- NAV ---
    "nav.home": "Home",
    "nav.games": "Games",
    "nav.profiles": "Profiles",
    "nav.friends": "Friends",
    "nav.stats": "Stats",
    "nav.settings": "Settings",

    // --- SETTINGS ---
    "settings.back": "Back",
    "settings.title": "Settings",
    "settings.subtitle": "Customize the app theme and language",
    "settings.theme": "Theme",
    "settings.lang": "Language",

    "settings.theme.gold.label": "GOLD NEON",
"settings.theme.gold.desc": "Premium golden theme",

"settings.theme.pink.label": "PINK FLUO",
"settings.theme.pink.desc": "Arcade pink ambience",

"settings.theme.petrol.label": "PETROL BLUE",
"settings.theme.petrol.desc": "Deep neon blue",

"settings.theme.green.label": "VEGETAL",
"settings.theme.green.desc": "Bright practice style",

"settings.theme.magenta.label": "MAGENTA",
"settings.theme.magenta.desc": "Intense violet / magenta",

"settings.theme.red.label": "BRIGHT RED",
"settings.theme.red.desc": "Aggressive arcade red",

"settings.theme.orange.label": "FIRE ORANGE",
"settings.theme.orange.desc": "Warm energetic orange",

"settings.theme.white.label": "SNOW WHITE",
"settings.theme.white.desc": "Modern light background",

    // --- HOME ---
    "home.greeting": "Welcome",
    "home.titleApp": "DARTS COUNTER",
    "home.connect": "SIGN IN",

    "home.card.profiles.title": "PROFILES",
    "home.card.profiles.subtitle": "Create and manage profiles",

    "home.card.local.title": "LOCAL PLAY",
    "home.card.local.subtitle": "Access all game modes",

    "home.card.online.title": "ONLINE PLAY",
    "home.card.online.subtitle": "Remote matches (coming soon)",

    "home.card.stats.title": "STATS",
    "home.card.stats.subtitle": "Statistics and history",

    "home.seeStats": "View my statistics",

    "home.stats.avg3": "Avg/3",
    "home.stats.best": "Best",
    "home.stats.co": "CO",
    "home.stats.winPct": "Win%",

    // STATUS
    "status.online": "Online",
    "status.away": "Away",
    "status.offline": "Offline",

    // --- GAMES PAGE ---
    "games.title": "ALL GAMES",
    "games.subtitle": "Select a game mode",
    "games.training.title": "TRAINING",
    "games.training.subtitle": "Improve your progression.",
    "games.training.infoTitle": "Training",
    "games.training.infoBody":
      "Practice mode to work on consistency, scoring and finishing.",
    "games.x01.title": "X01",
    "games.x01.subtitle": "301 / 501 / 701 / 901.",
    "games.x01.infoTitle": "X01",
    "games.x01.infoBody":
      "Classic 301/501/701/901 games with stats, history and several rule options.",
    "games.cricket.title": "CRICKET",
    "games.cricket.subtitle": "Close 15–20 + Bull.",
    "games.cricket.infoTitle": "Cricket",
    "games.cricket.infoBody":
      "Close numbers 15 to 20 and the Bull before your opponent while scoring as many points as possible.",
    "games.killer.title": "KILLER",
    "games.killer.subtitle": "Hit your number… become Killer.",
    "games.killer.infoTitle": "Killer",
    "games.killer.infoBody":
      "Each player has a number. Become Killer by hitting yours, then eliminate the other players.",
    "games.shanghai.title": "SHANGHAI",
    "games.shanghai.subtitle":
      "Target of the round, S-D-T = Shanghai to win.",
    "games.shanghai.infoTitle": "Shanghai",
    "games.shanghai.infoBody":
      "Each round has a different target. Hit single, double and triple on the same visit to score a Shanghai.",
    "games.battle.title": "BATTLE ROYALE",
    "games.battle.subtitle": "Fun multiplayer mode — eliminations.",
    "games.battle.infoTitle": "Battle Royale",
    "games.battle.infoBody":
      "Fun multiplayer mode with successive eliminations. Last player standing wins.",
    "games.status.comingSoon": "Coming soon",
    "games.info.close": "Close",

      // --- TRAINING MENU ---
  "training.menu.title": "TRAINING",
  "training.menu.subtitle": "Choose a training mode",

  "training.menu.x01.title": "Training X01",
  "training.menu.x01.subtitle": "Improve scoring and finishing",
  "training.menu.x01.info":
    "X01 training dedicated to progression: scoring, consistency, finishing, advanced stats.",

  "training.menu.clock.title": "Around the Clock",
  "training.menu.clock.subtitle": "Single / Double / Triple",
  "training.menu.clock.info":
    "Hit numbers from 1 to 20 and Bull. Choose Single, Double or Triple mode.",

  "training.menu.evolution.title": "Evolution",
  "training.menu.evolution.subtitle": "Coming soon",
  "training.menu.evolution.info": "A new training mode is coming soon.",

  "training.menu.comingSoon": "Coming soon",
  "training.menu.info.close": "Close",

    // Language names
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
    "lang.hi": "Hindi",
    "lang.tr": "Turkish",
    "lang.da": "Danish",
    "lang.no": "Norwegian",
    "lang.sv": "Swedish",
    "lang.is": "Icelandic",
    "lang.pl": "Polish",
    "lang.ro": "Romanian",
    "lang.at": "Austrian",
    "lang.sr": "Serbian",
    "lang.hr": "Croatian",
    "lang.cs": "Czech",
  },

// ---------- ESPAÑOL ----------
es: {
  // --- NAV ---
  "nav.home": "Inicio",
  "nav.games": "Juegos",
  "nav.profiles": "Perfiles",
  "nav.friends": "Amigos",
  "nav.stats": "Estadísticas",
  "nav.settings": "Ajustes",

  // --- SETTINGS ---
  "settings.back": "Volver",
  "settings.title": "Ajustes",
  "settings.subtitle": "Personaliza el tema y el idioma de la aplicación",
  "settings.theme": "Tema",
  "settings.lang": "Idioma",

  // THÈMES (VERSION PREMIUM CORRIGÉE)
  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "Tema dorado premium",

  "settings.theme.pink.label": "ROSA FLUO",
  "settings.theme.pink.desc": "Ambiente arcade rosa",

  "settings.theme.petrol.label": "AZUL PETRÓLEO",
  "settings.theme.petrol.desc": "Azul neón profundo",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "Estilo de práctica brillante",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "Magenta / violeta intenso",

  "settings.theme.red.label": "ROJO VIVO",
  "settings.theme.red.desc": "Rojo arcade agresivo",

  "settings.theme.orange.label": "NARANJA FUEGO",
  "settings.theme.orange.desc": "Naranja cálido y enérgico",

  "settings.theme.white.label": "BLANCO NIEVE",
  "settings.theme.white.desc": "Fondo moderno y claro",

  // --- HOME ---
  "home.greeting": "Bienvenido",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "INICIAR SESIÓN",

  "home.card.profiles.title": "PERFILES",
  "home.card.profiles.subtitle": "Crear y gestionar perfiles",

  "home.card.local.title": "JUEGO LOCAL",
  "home.card.local.subtitle": "Acceso a todos los modos de juego",

  "home.card.online.title": "JUEGO ONLINE",
  "home.card.online.subtitle": "Partidas remotas (próximamente)",

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

  // --- PROFILES ---
  "profiles.title": "PERFILES",
  "profiles.create": "Crear perfil",
  "profiles.edit": "Editar perfil",
  "profiles.delete": "Eliminar perfil",

  "profiles.confirmDeleteTitle": "¿Eliminar perfil?",
  "profiles.confirmDeleteBody":
    "Este perfil y todas sus estadísticas se borrarán de forma permanente.",
  "profiles.confirmDeleteYes": "Eliminar",
  "profiles.confirmDeleteNo": "Cancelar",

  "profiles.name": "Nombre",
  "profiles.avatar": "Avatar",
  "profiles.stats": "Estadísticas",
  "profiles.noProfiles": "Aún no hay perfiles.",
  "profiles.pickOne": "Selecciona un perfil",
  "profiles.active": "Perfil activo",

  // --- GAMES ---
  "games.title": "TODOS LOS JUEGOS",
  "games.subtitle": "Selecciona un modo de juego",

  "games.training.title": "ENTRENAMIENTO",
  "games.training.subtitle": "Mejora tu progresión.",
  "games.training.infoTitle": "Entrenamiento",
  "games.training.infoBody":
    "Modo de práctica para trabajar tu regularidad, tu puntuación y tus cierres.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "Clásicos X01 con estadísticas, historial y múltiples opciones de reglas.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "Cierra 15–20 + Bull.",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "Cierra los números 15 a 20 y el Bull antes que tu oponente, anotando tantos puntos como sea posible.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "Duplica tu número… conviértete en Killer.",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "Cada jugador recibe un número. Duplica el tuyo para ser Killer y elimina a los demás jugadores.",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "Objetivo de la ronda, S-D-T = Shanghai.",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "Cada ronda tiene un objetivo distinto. Consigue simple + doble + triple en el mismo número para lograr un Shanghai.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "Modo divertido — eliminaciones.",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "Modo multijugador con eliminaciones sucesivas. El último jugador en pie gana.",

  "games.status.comingSoon": "En desarrollo",
  "games.info.close": "Cerrar",

  // --- TRAINING MENU ---
  "training.menu.title": "ENTRENAMIENTO",
  "training.menu.subtitle": "Elige un modo de entrenamiento",

  "training.menu.x01.title": "Entrenamiento X01",
  "training.menu.x01.subtitle": "Mejora puntuación y cierres",
  "training.menu.x01.info":
    "Entrenamiento X01 centrado en progresión: regularidad, scoring, cierres, estadísticas avanzadas.",

  "training.menu.clock.title": "Ronda del Reloj",
  "training.menu.clock.subtitle": "Simple / Doble / Triple",
  "training.menu.clock.info":
    "Golpea del 1 al 20 y Bull. Elige modo Simple, Doble o Triple.",

  "training.menu.evolution.title": "Evolución",
  "training.menu.evolution.subtitle": "Próximamente",
  "training.menu.evolution.info":
    "Un nuevo modo de entrenamiento estará disponible próximamente.",

  "training.menu.comingSoon": "Próximamente",
  "training.menu.info.close": "Cerrar",

  // --- LANGUAGE NAMES ---
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
  "lang.hi": "Hindi",
  "lang.tr": "Turco",
  "lang.da": "Danés",
  "lang.no": "Noruego",
  "lang.sv": "Sueco",
  "lang.is": "Islandés",
  "lang.pl": "Polaco",
  "lang.ro": "Rumano",
  "lang.at": "Austriaco",
  "lang.sr": "Serbio",
  "lang.hr": "Croata",
  "lang.cs": "Checo",
},

  // ---------- DEUTSCH ----------
  de: {
    "nav.home": "Start",
    "nav.games": "Spiele",
    "nav.profiles": "Profile",
    "nav.friends": "Freunde",
    "nav.stats": "Statistiken",
    "nav.settings": "Einstellungen",

    "settings.back": "Zurück",
    "settings.title": "Einstellungen",
    "settings.subtitle":
      "Passe Design und Sprache der App an",
    "settings.theme": "Design",
    "settings.lang": "Sprache",

    "settings.theme.gold.label": "Gold Neon",
    "settings.theme.gold.desc": "Premium-Gold-Design",

    "settings.theme.pink.label": "Pink Neon",
    "settings.theme.pink.desc": "Arcade-Pink Atmosphäre",

    "settings.theme.petrol.label": "Petrolblau",
    "settings.theme.petrol.desc": "Tiefes Neonblau",

    "settings.theme.green.label": "Grün Neon",
    "settings.theme.green.desc": "Helles Trainings-Design",

    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Intensives Violett / Magenta",

    "settings.theme.red.label": "Rot",
    "settings.theme.red.desc": "Aggressives Arcade-Rot",

    "settings.theme.orange.label": "Orange",
    "settings.theme.orange.desc": "Kräftiges warmes Orange",

    "settings.theme.white.label": "Weiß",
    "settings.theme.white.desc": "Modernes helles Layout",
    
    // GAMES PAGE
"games.title": "ALLE SPIELE",
"games.subtitle": "Wähle einen Spielmodus",

"games.training.title": "TRAINING",
"games.training.subtitle": "Verbessere deine Entwicklung.",
"games.training.infoTitle": "Training",
"games.training.infoBody":
  "Trainingsmodus, um Konstanz, Scoring und Finishes zu üben.",

"games.x01.title": "X01",
"games.x01.subtitle": "301 / 501 / 701 / 901.",
"games.x01.infoTitle": "X01",
"games.x01.infoBody":
  "Klassische 301/501/701/901-Spiele mit Statistiken, Verlauf und mehreren Regeloptionen.",

"games.cricket.title": "CRICKET",
"games.cricket.subtitle": "Schließe 15–20 + Bull.",
"games.cricket.infoTitle": "Cricket",
"games.cricket.infoBody":
  "Schließe die Zahlen 15 bis 20 und das Bull vor deinem Gegner, während du möglichst viele Punkte sammelst.",

"games.killer.title": "KILLER",
"games.killer.subtitle": "Triff deine Zahl… werde Killer.",
"games.killer.infoTitle": "Killer",
"games.killer.infoBody":
  "Jeder Spieler hat eine Zahl. Werde Killer, indem du deine Zahl triffst, und eliminiere dann die anderen Spieler.",

"games.shanghai.title": "SHANGHAI",
"games.shanghai.subtitle":
  "Ziel der Runde, S-D-T = Shanghai zum Sieg.",
"games.shanghai.infoTitle": "Shanghai",
"games.shanghai.infoBody":
  "Jede Runde hat ein anderes Ziel. Triff Single, Double und Triple im selben Besuch, um ein Shanghai zu erzielen.",

"games.battle.title": "BATTLE ROYALE",
"games.battle.subtitle": "Spaßiger Mehrspielermodus — Eliminierungen.",
"games.battle.infoTitle": "Battle Royale",
"games.battle.infoBody":
  "Spaßiger Mehrspielermodus mit aufeinanderfolgenden Eliminierungen. Der letzte verbleibende Spieler gewinnt.",

"games.status.comingSoon": "In Entwicklung",
"games.info.close": "Schließen",

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
    "lang.hi": "Hindi",
    "lang.tr": "Türkisch",
    "lang.da": "Dänisch",
    "lang.no": "Norwegisch",
    "lang.sv": "Schwedisch",
    "lang.is": "Isländisch",
    "lang.pl": "Polnisch",
    "lang.ro": "Rumänisch",
    "lang.at": "österreichisch",
    "lang.sr": "Serbisch",
    "lang.hr": "Kroatisch",
    "lang.cs": "Tschechisch",
  },

  // ---------- ITALIANO ----------
  it: {
    "nav.home": "Home",
    "nav.games": "Giochi",
    "nav.profiles": "Profili",
    "nav.friends": "Amici",
    "nav.stats": "Statistiche",
    "nav.settings": "Impostazioni",

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
    "settings.theme.magenta.desc": "Viola / magenta intenso",

    "settings.theme.red.label": "Rosso",
    "settings.theme.red.desc": "Rosso arcade aggressivo",

    "settings.theme.orange.label": "Arancione",
    "settings.theme.orange.desc": "Arancione caldo ed energico",

    "settings.theme.white.label": "Bianco",
    "settings.theme.white.desc": "Sfondo chiaro moderno",

    // GAMES PAGE
"games.title": "TUTTI I GIOCHI",
"games.subtitle": "Seleziona una modalità di gioco",

"games.training.title": "TRAINING",
"games.training.subtitle": "Migliora la tua progressione.",
"games.training.infoTitle": "Training",
"games.training.infoBody":
  "Modalità di allenamento per lavorare su costanza, punteggio e chiusure.",

"games.x01.title": "X01",
"games.x01.subtitle": "301 / 501 / 701 / 901.",
"games.x01.infoTitle": "X01",
"games.x01.infoBody":
  "Classici 301/501/701/901 con statistiche, storico e varie opzioni di regole.",

"games.cricket.title": "CRICKET",
"games.cricket.subtitle": "Chiudi 15–20 + Bull.",
"games.cricket.infoTitle": "Cricket",
"games.cricket.infoBody":
  "Chiudi i numeri dal 15 al 20 e il Bull prima dell'avversario, segnando il maggior numero possibile di punti.",

"games.killer.title": "KILLER",
"games.killer.subtitle": "Raddoppia il tuo numero… diventa Killer.",
"games.killer.infoTitle": "Killer",
"games.killer.infoBody":
  "Ogni giocatore ha un numero. Diventa Killer colpendo il tuo numero e poi elimina gli altri giocatori.",

"games.shanghai.title": "SHANGHAI",
"games.shanghai.subtitle":
  "Bersaglio del turno, S-D-T = Shanghai per vincere.",
"games.shanghai.infoTitle": "Shanghai",
"games.shanghai.infoBody":
  "Ogni turno ha un bersaglio diverso. Colpisci singolo, doppio e triplo nella stessa visita per realizzare uno Shanghai.",

"games.battle.title": "BATTLE ROYALE",
"games.battle.subtitle": "Modalità divertente multi-giocatore — eliminazioni.",
"games.battle.infoTitle": "Battle Royale",
"games.battle.infoBody":
  "Modalità divertente con eliminazioni successive. Vince l’ultimo giocatore rimasto.",

"games.status.comingSoon": "In sviluppo",
"games.info.close": "Chiudi",

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
    "lang.hi": "Hindi",
    "lang.tr": "Turco",
    "lang.da": "Danese",
    "lang.no": "Norvegese",
    "lang.sv": "Svedese",
    "lang.is": "Islandese",
    "lang.pl": "Polacco",
    "lang.ro": "Rumeno",
    "lang.at": "Austriaco",
    "lang.sr": "Serbo",
    "lang.hr": "Croato",
    "lang.cs": "Ceco",
  },

  // ---------- PORTUGUÊS ----------
  pt: {
    "nav.home": "Início",
    "nav.games": "Jogos",
    "nav.profiles": "Perfis",
    "nav.friends": "Amigos",
    "nav.stats": "Estatísticas",
    "nav.settings": "Definições",

    "settings.back": "Voltar",
    "settings.title": "Definições",
    "settings.subtitle":
      "Personaliza o tema e o idioma da aplicação",
    "settings.theme": "Tema",
    "settings.lang": "Idioma",

    "settings.theme.gold.label": "Ouro néon",
    "settings.theme.gold.desc": "Tema dourado premium",

    "settings.theme.pink.label": "Rosa néon",
    "settings.theme.pink.desc": "Ambiente arcade rosa",

    "settings.theme.petrol.label": "Azul petróleo",
    "settings.theme.petrol.desc": "Azul néon profundo",

    "settings.theme.green.label": "Verde néon",
    "settings.theme.green.desc": "Estilo de treino luminoso",

    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Violeta / magenta intenso",

    "settings.theme.red.label": "Vermelho",
    "settings.theme.red.desc": "Vermelho arcade agressivo",

    "settings.theme.orange.label": "Laranja",
    "settings.theme.orange.desc": "Laranja quente e enérgico",

    "settings.theme.white.label": "Branco",
    "settings.theme.white.desc": "Fundo claro moderno",

    // GAMES PAGE
"games.title": "TODOS OS JOGOS",
"games.subtitle": "Selecione um modo de jogo",

"games.training.title": "TREINO",
"games.training.subtitle": "Melhore a sua evolução.",
"games.training.infoTitle": "Treino",
"games.training.infoBody":
  "Modo de treino para trabalhar consistência, pontuação e fechamentos.",

"games.x01.title": "X01",
"games.x01.subtitle": "301 / 501 / 701 / 901.",
"games.x01.infoTitle": "X01",
"games.x01.infoBody":
  "Clássicos 301/501/701/901 com estatísticas, histórico e várias opções de regras.",

"games.cricket.title": "CRICKET",
"games.cricket.subtitle": "Feche 15–20 + Bull.",
"games.cricket.infoTitle": "Cricket",
"games.cricket.infoBody":
  "Feche os números de 15 a 20 e o Bull antes do adversário enquanto marca o máximo de pontos possível.",

"games.killer.title": "KILLER",
"games.killer.subtitle": "Duplique o seu número… torne-se Killer.",
"games.killer.infoTitle": "Killer",
"games.killer.infoBody":
  "Cada jogador tem um número. Torne-se Killer acertando o seu e depois elimine os outros jogadores.",

"games.shanghai.title": "SHANGHAI",
"games.shanghai.subtitle":
  "Alvo da rodada, S-D-T = Shanghai para vencer.",
"games.shanghai.infoTitle": "Shanghai",
"games.shanghai.infoBody":
  "Cada rodada tem um alvo diferente. Acerte simples, dupla e tripla na mesma visita para conseguir um Shanghai.",

"games.battle.title": "BATTLE ROYALE",
"games.battle.subtitle": "Modo divertido multijogador — eliminações.",
"games.battle.infoTitle": "Battle Royale",
"games.battle.infoBody":
  "Modo divertido com eliminações sucessivas. O último jogador em jogo vence.",

"games.status.comingSoon": "Em desenvolvimento",
"games.info.close": "Fechar",

    "lang.fr": "Francês",
    "lang.en": "Inglês",
    "lang.es": "Espanhol",
    "lang.de": "Alemão",
    "lang.it": "Italiano",
    "lang.pt": "Português",
    "lang.nl": "Neerlandês",
    "lang.ru": "Russo",
    "lang.zh": "Chinês",
    "lang.ja": "Japonês",
    "lang.ar": "Árabe",
    "lang.hi": "Hindi",
    "lang.tr": "Turco",
    "lang.da": "Dinamarquês",
    "lang.no": "Norueguês",
    "lang.sv": "Sueco",
    "lang.is": "Islandês",
    "lang.pl": "Polaco",
    "lang.ro": "Romeno",
    "lang.at": "Austríaco",
    "lang.sr": "Sérvio",
    "lang.hr": "Croata",
    "lang.cs": "Checo",
  },

  // ---------- NEDERLANDS ----------
  nl: {
    "nav.home": "Start",
    "nav.games": "Spellen",
    "nav.profiles": "Profielen",
    "nav.friends": "Vrienden",
    "nav.stats": "Stats",
    "nav.settings": "Instellingen",

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
    "settings.theme.green.desc": "Helder trainings-stijl",

    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Intens violet / magenta",

    "settings.theme.red.label": "Rood",
    "settings.theme.red.desc": "Agressief arcade-rood",

    "settings.theme.orange.label": "Oranje",
    "settings.theme.orange.desc": "Warm energiek oranje",

    "settings.theme.white.label": "Wit",
    "settings.theme.white.desc": "Modern licht thema",

    // GAMES PAGE
"games.title": "ALLE SPELLEN",
"games.subtitle": "Kies een spelmodus",

"games.training.title": "TRAINING",
"games.training.subtitle": "Verbeter je vooruitgang.",
"games.training.infoTitle": "Training",
"games.training.infoBody":
  "Trainingsmodus om aan consistentie, scoring en finishes te werken.",

"games.x01.title": "X01",
"games.x01.subtitle": "301 / 501 / 701 / 901.",
"games.x01.infoTitle": "X01",
"games.x01.infoBody":
  "Klassieke 301/501/701/901-spellen met statistieken, geschiedenis en meerdere regelopties.",

"games.cricket.title": "CRICKET",
"games.cricket.subtitle": "Sluit 15–20 + Bull.",
"games.cricket.infoTitle": "Cricket",
"games.cricket.infoBody":
  "Sluit de nummers 15 tot en met 20 en de Bull eerder dan je tegenstander terwijl je zoveel mogelijk punten scoort.",

"games.killer.title": "KILLER",
"games.killer.subtitle": "Raak je nummer… word Killer.",
"games.killer.infoTitle": "Killer",
"games.killer.infoBody":
  "Elke speler heeft een nummer. Word Killer door je eigen nummer te raken en elimineer daarna de andere spelers.",

"games.shanghai.title": "SHANGHAI",
"games.shanghai.subtitle":
  "Doel van de beurt, S-D-T = Shanghai om te winnen.",
"games.shanghai.infoTitle": "Shanghai",
"games.shanghai.infoBody":
  "Elke beurt heeft een ander doel. Raak single, double en triple in dezelfde beurt om een Shanghai te scoren.",

"games.battle.title": "BATTLE ROYALE",
"games.battle.subtitle": "Leuke multiplayer-modus — eliminaties.",
"games.battle.infoTitle": "Battle Royale",
"games.battle.infoBody":
  "Leuke multiplayer-modus met opeenvolgende eliminaties. De laatste overgebleven speler wint.",

"games.status.comingSoon": "In ontwikkeling",
"games.info.close": "Sluiten",

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
    "lang.hi": "Hindi",
    "lang.tr": "Turks",
    "lang.da": "Deens",
    "lang.no": "Noors",
    "lang.sv": "Zweeds",
    "lang.is": "IJslands",
    "lang.pl": "Pools",
    "lang.ro": "Roemeens",
    "lang.sr": "Servisch",
    "lang.hr": "Kroatisch",
    "lang.cs": "Tsjechisch",
  },

  // ---------- RUSSIAN ----------
  ru: {
    "nav.home": "Главная",
    "nav.games": "Игры",
    "nav.profiles": "Профили",
    "nav.friends": "Друзья",
    "nav.stats": "Статистика",
    "nav.settings": "Настройки",

    "settings.back": "Назад",
    "settings.title": "Настройки",
    "settings.subtitle":
      "Настройте тему и язык приложения",
    "settings.theme": "Тема",
    "settings.lang": "Язык",

    "settings.theme.gold.label": "Золотой неон",
    "settings.theme.gold.desc": "Премиальная золотая тема",
    "settings.theme.pink.label": "Розовый неон",
    "settings.theme.pink.desc": "Аркадная розовая атмосфера",
    "settings.theme.petrol.label": "Нефтяной синий",
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

    // GAMES PAGE
"games.title": "ВСЕ ИГРЫ",
"games.subtitle": "Выберите режим игры",

"games.training.title": "ТРЕНИРОВКА",
"games.training.subtitle": "Улучшайте своё мастерство.",
"games.training.infoTitle": "Тренировка",
"games.training.infoBody":
  "Режим практики для работы над стабильностью, набором очков и завершением легов.",

"games.x01.title": "X01",
"games.x01.subtitle": "301 / 501 / 701 / 901.",
"games.x01.infoTitle": "X01",
"games.x01.infoBody":
  "Классические игры 301/501/701/901 со статистикой, историей и различными параметрами правил.",

"games.cricket.title": "CRICKET",
"games.cricket.subtitle": "Закройте 15–20 + Bull.",
"games.cricket.infoTitle": "Cricket",
"games.cricket.infoBody":
  "Закройте номера от 15 до 20 и Bull раньше соперника, набирая как можно больше очков.",

"games.killer.title": "KILLER",
"games.killer.subtitle": "Попадите в своё число… станьте Killer.",
"games.killer.infoTitle": "Killer",
"games.killer.infoBody":
  "У каждого игрока есть число. Станьте Killer, попав в своё, а затем выбивайте других игроков.",

"games.shanghai.title": "SHANGHAI",
"games.shanghai.subtitle": "Цель раунда, S-D-T = Shanghai для победы.",
"games.shanghai.infoTitle": "Shanghai",
"games.shanghai.infoBody":
  "В каждом раунде своя цель. Попадите single, double и triple за один визит, чтобы сделать Shanghai.",

"games.battle.title": "BATTLE ROYALE",
"games.battle.subtitle": "Весёлый режим — выбывания.",
"games.battle.infoTitle": "Battle Royale",
"games.battle.infoBody":
  "Весёлый многопользовательский режим с последовательными выбываниями. Последний выживший игрок выигрывает.",

"games.status.comingSoon": "В разработке",
"games.info.close": "Закрыть",

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
    "lang.hi": "Хинди",
    "lang.tr": "Турецкий",
    "lang.da": "Датский",
    "lang.no": "Норвежский",
    "lang.sv": "Шведский",
    "lang.is": "Исландский",
    "lang.pl": "Польский",
    "lang.ro": "Румынский",
    "lang.at": "австрийский",
    "lang.sr": "Сербский",
    "lang.hr": "Хорватский",
    "lang.cs": "Чешский",
  },

  // ---------- CHINESE (SIMPLIFIED) ----------
  zh: {
    "nav.home": "主页",
    "nav.games": "游戏",
    "nav.profiles": "档案",
    "nav.friends": "好友",
    "nav.stats": "统计",
    "nav.settings": "设置",

    "settings.back": "返回",
    "settings.title": "设置",
    "settings.subtitle": "自定义应用的主题和语言",
    "settings.theme": "主题",
    "settings.lang": "语言",

    "settings.theme.gold.label": "金色霓虹",
    "settings.theme.gold.desc": "高级金色主题",
    "settings.theme.pink.label": "粉色霓虹",
    "settings.theme.pink.desc": "街机粉色风格",
    "settings.theme.petrol.label": "石油蓝",
    "settings.theme.petrol.desc": "深色霓虹蓝",
    "settings.theme.green.label": "绿色霓虹",
    "settings.theme.green.desc": "明亮练习风格",
    "settings.theme.magenta.label": "洋红",
    "settings.theme.magenta.desc": "强烈的紫色 / 洋红",
    "settings.theme.red.label": "红色",
    "settings.theme.red.desc": "激进街机红",
    "settings.theme.orange.label": "橙色",
    "settings.theme.orange.desc": "温暖有活力的橙色",
    "settings.theme.white.label": "白色",
    "settings.theme.white.desc": "现代浅色背景",

    // GAMES PAGE
"games.title": "全部游戏",
"games.subtitle": "选择一种游戏模式",

"games.training.title": "训练",
"games.training.subtitle": "提升你的进步。",
"games.training.infoTitle": "训练",
"games.training.infoBody":
  "练习模式，用于提高稳定性、得分能力和收尾能力。",

"games.x01.title": "X01",
"games.x01.subtitle": "301 / 501 / 701 / 901。",
"games.x01.infoTitle": "X01",
"games.x01.infoBody":
  "经典的301/501/701/901游戏，包含统计、历史记录和多种规则设置。",

"games.cricket.title": "CRICKET",
"games.cricket.subtitle": "关闭 15–20 + Bull。",
"games.cricket.infoTitle": "Cricket",
"games.cricket.infoBody":
  "在对手之前关闭15到20号和Bull，并尽可能多得分。",

"games.killer.title": "KILLER",
"games.killer.subtitle": "击中你的号码…成为Killer。",
"games.killer.infoTitle": "Killer",
"games.killer.infoBody":
  "每位玩家都有一个号码。击中自己的号码成为Killer，然后淘汰其他玩家。",

"games.shanghai.title": "SHANGHAI",
"games.shanghai.subtitle": "本轮目标，S-D-T = 上海赢。",
"games.shanghai.infoTitle": "Shanghai",
"games.shanghai.infoBody":
  "每一轮都有不同的目标。在同一轮中击中单倍、双倍和三倍即可完成上海。",

"games.battle.title": "BATTLE ROYALE",
"games.battle.subtitle": "多人欢乐模式 — 淘汰赛。",
"games.battle.infoTitle": "Battle Royale",
"games.battle.infoBody":
  "多人欢乐模式，连续淘汰。最后留下的玩家获胜。",

"games.status.comingSoon": "开发中",
"games.info.close": "关闭",

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
    "lang.hi": "印地语",
    "lang.tr": "土耳其语",
    "lang.da": "丹麦语",
    "lang.no": "挪威语",
    "lang.sv": "瑞典语",
    "lang.is": "冰岛语",
    "lang.pl": "波兰语",
    "lang.ro": "罗马尼亚语",
    "lang.at": "奥地利人",
    "lang.sr": "塞尔维亚语",
    "lang.hr": "克罗地亚语",
    "lang.cs": "捷克语",
  },

  // ---------- JAPANESE ----------
  ja: {
    "nav.home": "ホーム",
    "nav.games": "ゲーム",
    "nav.profiles": "プロフィール",
    "nav.friends": "フレンド",
    "nav.stats": "統計",
    "nav.settings": "設定",

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
    "settings.theme.green.desc": "明るい練習スタイル",
    "settings.theme.magenta.label": "マゼンタ",
    "settings.theme.magenta.desc": "強いバイオレット／マゼンタ",
    "settings.theme.red.label": "レッド",
    "settings.theme.red.desc": "アグレッシブなアーケードレッド",
    "settings.theme.orange.label": "オレンジ",
    "settings.theme.orange.desc": "暖かくエネルギッシュなオレンジ",
    "settings.theme.white.label": "ホワイト",
    "settings.theme.white.desc": "モダンなライト背景",

    // GAMES PAGE
"games.title": "すべてのゲーム",
"games.subtitle": "ゲームモードを選択",

"games.training.title": "トレーニング",
"games.training.subtitle": "上達をサポート。",
"games.training.infoTitle": "トレーニング",
"games.training.infoBody":
  "安定性、スコアリング、フィニッシュ力を向上させるための練習モード。",

"games.x01.title": "X01",
"games.x01.subtitle": "301 / 501 / 701 / 901.",
"games.x01.infoTitle": "X01",
"games.x01.infoBody":
  "統計、履歴、ルール設定を備えたクラシックな301/501/701/901ゲーム。",

"games.cricket.title": "CRICKET",
"games.cricket.subtitle": "15〜20 + Bull をクローズ。",
"games.cricket.infoTitle": "Cricket",
"games.cricket.infoBody":
  "対戦相手より先に15〜20とBullをクローズし、できるだけ多く得点を稼ぎます。",

"games.killer.title": "KILLER",
"games.killer.subtitle": "自分の番号をヒットして…Killerに。",
"games.killer.infoTitle": "Killer",
"games.killer.infoBody":
  "各プレイヤーには番号があります。自分の番号を当ててKillerになり、他のプレイヤーを排除します。",

"games.shanghai.title": "SHANGHAI",
"games.shanghai.subtitle": "このラウンドのターゲット、S-D-Tで勝利。",
"games.shanghai.infoTitle": "Shanghai",
"games.shanghai.infoBody":
  "各ラウンドには異なるターゲットがあります。シングル、ダブル、トリプルを同一ラウンドで当てると上海達成。",

"games.battle.title": "BATTLE ROYALE",
"games.battle.subtitle": "楽しいマルチプレイヤー — 脱落形式。",
"games.battle.infoTitle": "Battle Royale",
"games.battle.infoBody":
  "連続脱落方式のマルチプレイヤーモード。最後に残ったプレイヤーが勝者です。",

"games.status.comingSoon": "開発中",
"games.info.close": "閉じる",

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
    "lang.hi": "ヒンディー語",
    "lang.tr": "トルコ語",
    "lang.da": "デンマーク語",
    "lang.no": "ノルウェー語",
    "lang.sv": "スウェーデン語",
    "lang.is": "アイスランド語",
    "lang.pl": "ポーランド語",
    "lang.ro": "ルーマニア語",
    "lang.at": "オーストリア人",
    "lang.sr": "セルビア語",
    "lang.hr": "クロアチア語",
    "lang.cs": "チェコ語",
  },

  // ---------- ARABIC ----------
  ar: {
    "nav.home": "الرئيسية",
    "nav.games": "الألعاب",
    "nav.profiles": "الملفات",
    "nav.friends": "الأصدقاء",
    "nav.stats": "الإحصائيات",
    "nav.settings": "الإعدادات",

    "settings.back": "رجوع",
    "settings.title": "الإعدادات",
    "settings.subtitle": "قم بتخصيص سمة التطبيق واللغة",
    "settings.theme": "السمة",
    "settings.lang": "اللغة",

    "settings.theme.gold.label": "نيون ذهبي",
    "settings.theme.gold.desc": "سمة ذهبية مميزة",
    "settings.theme.pink.label": "نيون وردي",
    "settings.theme.pink.desc": "أجواء أركيد وردية",
    "settings.theme.petrol.label": "أزرق بترولي",
    "settings.theme.petrol.desc": "أزرق نيون عميق",
    "settings.theme.green.label": "نيون أخضر",
    "settings.theme.green.desc": "نمط تدريب ساطع",
    "settings.theme.magenta.label": "ماجنتا",
    "settings.theme.magenta.desc": "أرجواني / ماجنتا قوي",
    "settings.theme.red.label": "أحمر",
    "settings.theme.red.desc": "أحمر أركيد هجومي",
    "settings.theme.orange.label": "برتقالي",
    "settings.theme.orange.desc": "برتقالي دافئ وحيوي",
    "settings.theme.white.label": "أبيض",
    "settings.theme.white.desc": "خلفية فاتحة عصرية",

    // GAMES PAGE
"games.title": "جميع الألعاب",
"games.subtitle": "اختر وضع اللعب",

"games.training.title": "التدريب",
"games.training.subtitle": "حسّن تقدمك.",
"games.training.infoTitle": "التدريب",
"games.training.infoBody":
  "وضع تدريب للعمل على الثبات، التسجيل، وإنهاء الرميات.",

"games.x01.title": "X01",
"games.x01.subtitle": "301 / 501 / 701 / 901.",
"games.x01.infoTitle": "X01",
"games.x01.infoBody":
  "ألعاب كلاسيكية 301/501/701/901 مع إحصائيات وسجلّ وخيارات قواعد متعددة.",

"games.cricket.title": "CRICKET",
"games.cricket.subtitle": "أغلق 15–20 + Bull.",
"games.cricket.infoTitle": "Cricket",
"games.cricket.infoBody":
  "أغلق الأرقام 15 إلى 20 وBull قبل خصمك بينما تسجل أكبر عدد ممكن من النقاط.",

"games.killer.title": "KILLER",
"games.killer.subtitle": "أصب رقمك… واصبح Killer.",
"games.killer.infoTitle": "Killer",
"games.killer.infoBody":
  "لكل لاعب رقم. يصبح اللاعب Killer عند إصابة رقمه، ثم يمكنه إقصاء اللاعبين الآخرين.",

"games.shanghai.title": "SHANGHAI",
"games.shanghai.subtitle": "هدف الجولة، S-D-T للفوز.",
"games.shanghai.infoTitle": "Shanghai",
"games.shanghai.infoBody":
  "لكل جولة هدف مختلف. أصب الفردي والمزدوج والثلاثي في نفس الزيارة لتحقق Shanghai.",

"games.battle.title": "BATTLE ROYALE",
"games.battle.subtitle": "وضع ممتع متعدد اللاعبين — إقصاءات.",
"games.battle.infoTitle": "Battle Royale",
"games.battle.infoBody":
  "وضع ممتع متعدد اللاعبين مع إقصاءات متتالية. آخر لاعب يبقى هو الفائز.",

"games.status.comingSoon": "قيد التطوير",
"games.info.close": "إغلاق",

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
    "lang.hi": "الهندية",
    "lang.tr": "التركية",
    "lang.da": "الدانماركية",
    "lang.no": "النرويجية",
    "lang.sv": "السويدية",
    "lang.is": "الآيسلندية",
    "lang.pl": "البولندية",
    "lang.ro": "الرومانية",
    "lang.at": "النمساوي",
    "lang.sr": "الصربية",
    "lang.hr": "الكرواتية",
    "lang.cs": "التشيكية",
  },

  // ---------- HINDI ----------
  hi: {
    "nav.home": "होम",
    "nav.games": "गेम्स",
    "nav.profiles": "प्रोफ़ाइल",
    "nav.friends": "दोस्त",
    "nav.stats": "आँकड़े",
    "nav.settings": "सेटिंग्स",

    "settings.back": "वापस",
    "settings.title": "सेटिंग्स",
    "settings.subtitle": "ऐप का थीम और भाषा बदलें",
    "settings.theme": "थीम",
    "settings.lang": "भाषा",

    "settings.theme.gold.label": "गोल्ड नीयन",
    "settings.theme.gold.desc": "प्रीमियम गोल्ड थीम",
    "settings.theme.pink.label": "पिंक नीयन",
    "settings.theme.pink.desc": "आर्केड पिंक माहौल",
    "settings.theme.petrol.label": "पेट्रोल ब्लू",
    "settings.theme.petrol.desc": "गहरा नीयन नीला",
    "settings.theme.green.label": "ग्रीन नीयन",
    "settings.theme.green.desc": "चमकीला प्रैक्टिस स्टाइल",
    "settings.theme.magenta.label": "मैजेंटा",
    "settings.theme.magenta.desc": "तेज़ वायलेट / मैजेंटा",
    "settings.theme.red.label": "रेड",
    "settings.theme.red.desc": "आक्रामक आर्केड रेड",
    "settings.theme.orange.label": "ऑरेंज",
    "settings.theme.orange.desc": "गर्म और एनर्जेटिक ऑरेंज",
    "settings.theme.white.label": "व्हाइट",
    "settings.theme.white.desc": "आधुनिक हल्का बैकग्राउंड",

    // GAMES PAGE
"games.title": "सभी खेल",
"games.subtitle": "एक खेल मोड चुनें",

"games.training.title": "ट्रेनिंग",
"games.training.subtitle": "अपनी प्रगति सुधारें.",
"games.training.infoTitle": "ट्रेनिंग",
"games.training.infoBody":
  "अभ्यास मोड जो स्थिरता, स्कोरिंग और फिनिशिंग में सुधार करता है।",

"games.x01.title": "X01",
"games.x01.subtitle": "301 / 501 / 701 / 901.",
"games.x01.infoTitle": "X01",
"games.x01.infoBody":
  "क्लासिक 301/501/701/901 गेम, आँकड़ों, इतिहास और कई नियम विकल्पों के साथ।",

"games.cricket.title": "CRICKET",
"games.cricket.subtitle": "15–20 + Bull बंद करें.",
"games.cricket.infoTitle": "Cricket",
"games.cricket.infoBody":
  "अपने प्रतिद्वंद्वी से पहले 15 से 20 और Bull बंद करें, और अधिकतम अंक प्राप्त करें।",

"games.killer.title": "KILLER",
"games.killer.subtitle": "अपना नंबर हिट करें… Killer बनें.",
"games.killer.infoTitle": "Killer",
"games.killer.infoBody":
  "हर खिलाड़ी का एक नंबर होता है। अपना नंबर हिट करके Killer बनें, फिर दूसरों को बाहर करें।",

"games.shanghai.title": "SHANGHAI",
"games.shanghai.subtitle": "इस राउंड का लक्ष्य, S-D-T = Shanghai.",
"games.shanghai.infoTitle": "Shanghai",
"games.shanghai.infoBody":
  "हर राउंड का अपना लक्ष्य होता है। एक ही विज़िट में सिंगल, डबल और ट्रिपल हिट करें ताकि Shanghai मिल सके।",

"games.battle.title": "BATTLE ROYALE",
"games.battle.subtitle": "मज़ेदार मल्टीप्लेयर मोड — एलिमिनेशन.",
"games.battle.infoTitle": "Battle Royale",
"games.battle.infoBody":
  "लगातार एलिमिनेशन वाले मल्टीप्लेयर मोड में अंतिम बचा खिलाड़ी जीतता है।",

"games.status.comingSoon": "जल्द आ रहा है",
"games.info.close": "बंद करें",

    "lang.fr": "फ़्रेंच",
    "lang.en": "अंग्रेज़ी",
    "lang.es": "स्पैनिश",
    "lang.de": "जर्मन",
    "lang.it": "इटैलियन",
    "lang.pt": "पुर्तगाली",
    "lang.nl": "डच",
    "lang.ru": "रूसी",
    "lang.zh": "चीनी",
    "lang.ja": "जापानी",
    "lang.ar": "अरबी",
    "lang.hi": "हिंदी",
    "lang.tr": "तुर्की",
    "lang.da": "डैनिश",
    "lang.no": "नॉर्वेजियन",
    "lang.sv": "स्वीडिश",
    "lang.is": "आइसलैंडिक",
    "lang.pl": "पोलिश",
    "lang.ro": "रोमानियाई",
    "lang.at": "ऑस्ट्रिया",
    "lang.sr": "सर्बियाई",
    "lang.hr": "क्रोएशियाई",
    "lang.cs": "चेक",
  },

  // ---------- TURKISH ----------
  tr: {
    "nav.home": "Ana sayfa",
    "nav.games": "Oyunlar",
    "nav.profiles": "Profiller",
    "nav.friends": "Arkadaşlar",
    "nav.stats": "İstatistikler",
    "nav.settings": "Ayarlar",

    "settings.back": "Geri",
    "settings.title": "Ayarlar",
    "settings.subtitle":
      "Uygulamanın temasını ve dilini özelleştir",
    "settings.theme": "Tema",
    "settings.lang": "Dil",

    "settings.theme.gold.label": "Altın neon",
    "settings.theme.gold.desc": "Premium altın tema",
    "settings.theme.pink.label": "Pembe neon",
    "settings.theme.pink.desc": "Atari tarzı pembe ortam",
    "settings.theme.petrol.label": "Petrol mavisi",
    "settings.theme.petrol.desc": "Derin neon mavi",
    "settings.theme.green.label": "Yeşil neon",
    "settings.theme.green.desc": "Parlak antrenman stili",
    "settings.theme.magenta.label": "Macenta",
    "settings.theme.magenta.desc": "Yoğun mor / macenta",
    "settings.theme.red.label": "Kırmızı",
    "settings.theme.red.desc": "Agresif atari kırmızısı",
    "settings.theme.orange.label": "Turuncu",
    "settings.theme.orange.desc": "Sıcak ve enerjik turuncu",
    "settings.theme.white.label": "Beyaz",
    "settings.theme.white.desc": "Modern açık arka plan",

    // GAMES PAGE
"games.title": "TÜM OYUNLAR",
"games.subtitle": "Bir oyun modu seçin",

"games.training.title": "EĞİTİM",
"games.training.subtitle": "Gelişiminizi artırın.",
"games.training.infoTitle": "Eğitim",
"games.training.infoBody":
  "Stabilite, skor ve bitiriş pratiği yapmak için antrenman modu.",

"games.x01.title": "X01",
"games.x01.subtitle": "301 / 501 / 701 / 901.",
"games.x01.infoTitle": "X01",
"games.x01.infoBody":
  "İstatistikler, geçmiş ve çeşitli kural seçenekleriyle klasik 301/501/701/901 oyunları.",

"games.cricket.title": "CRICKET",
"games.cricket.subtitle": "15–20 + Bull’u kapat.",
"games.cricket.infoTitle": "Cricket",
"games.cricket.infoBody":
  "15–20 ve Bull’u rakibinizden önce kapatırken mümkün olduğunca çok puan kazanın.",

"games.killer.title": "KILLER",
"games.killer.subtitle": "Numaranı vur… Killer ol.",
"games.killer.infoTitle": "Killer",
"games.killer.infoBody":
  "Her oyuncunun bir numarası vardır. Kendi numaranızı vurarak Killer olun ve diğer oyuncuları eleyin.",

"games.shanghai.title": "SHANGHAI",
"games.shanghai.subtitle":
  "Bu turun hedefi, S-D-T = Shanghai.",
"games.shanghai.infoTitle": "Shanghai",
"games.shanghai.infoBody":
  "Her turun farklı bir hedefi vardır. Aynı turda tek, çift ve üçlüye isabet ederek Shanghai yapın.",

"games.battle.title": "BATTLE ROYALE",
"games.battle.subtitle": "Eğlenceli çok oyunculu mod — eleme.",
"games.battle.infoTitle": "Battle Royale",
"games.battle.infoBody":
  "Ardışık elemeli çok oyunculu bir mod. Ayakta kalan son oyuncu kazanır.",

"games.status.comingSoon": "Yakında",
"games.info.close": "Kapat",

    "lang.fr": "Fransızca",
    "lang.en": "İngilizce",
    "lang.es": "İspanyolca",
    "lang.de": "Almanca",
    "lang.it": "İtalyanca",
    "lang.pt": "Portekizce",
    "lang.nl": "Felemenkçe",
    "lang.ru": "Rusça",
    "lang.zh": "Çince",
    "lang.ja": "Japonca",
    "lang.ar": "Arapça",
    "lang.hi": "Hintçe",
    "lang.tr": "Türkçe",
    "lang.da": "Danca",
    "lang.no": "Norveççe",
    "lang.sv": "İsveççe",
    "lang.is": "İzlandaca",
    "lang.pl": "Lehçe",
    "lang.ro": "Romence",
    "lang.at": "Avusturya",
    "lang.sr": "Sırpça",
    "lang.hr": "Hırvatça",
    "lang.cs": "Çekçe",
  },

  // ---------- DANISH ----------
  da: {
    "nav.home": "Hjem",
    "nav.games": "Spil",
    "nav.profiles": "Profiler",
    "nav.friends": "Venner",
    "nav.stats": "Statistik",
    "nav.settings": "Indstillinger",

    "settings.back": "Tilbage",
    "settings.title": "Indstillinger",
    "settings.subtitle":
      "Tilpas appens tema og sprog",
    "settings.theme": "Tema",
    "settings.lang": "Sprog",

    "settings.theme.gold.label": "Guld neon",
    "settings.theme.gold.desc": "Premium guldt tema",
    "settings.theme.pink.label": "Pink neon",
    "settings.theme.pink.desc": "Arkade-pink stemning",
    "settings.theme.petrol.label": "Petrolblå",
    "settings.theme.petrol.desc": "Dybt neonblåt",
    "settings.theme.green.label": "Grøn neon",
    "settings.theme.green.desc": "Lyst trænings-look",
    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Intens violet / magenta",
    "settings.theme.red.label": "Rød",
    "settings.theme.red.desc": "Aggressiv arkade-rød",
    "settings.theme.orange.label": "Orange",
    "settings.theme.orange.desc": "Varm energisk orange",
    "settings.theme.white.label": "Hvid",
    "settings.theme.white.desc": "Moderne lyst tema",

    // GAMES PAGE
"games.title": "ALLE SPIL",
"games.subtitle": "Vælg en spiltilstand",

"games.training.title": "TRÆNING",
"games.training.subtitle": "Forbedr din udvikling.",
"games.training.infoTitle": "Træning",
"games.training.infoBody":
  "Practice mode to work on consistency, scoring and finishing.",

"games.x01.title": "X01",
"games.x01.subtitle": "301 / 501 / 701 / 901.",
"games.x01.infoTitle": "X01",
"games.x01.infoBody":
  "Classic 301/501/701/901 games with stats, history and several rule options.",

"games.cricket.title": "CRICKET",
"games.cricket.subtitle": "Luk 15–20 + Bull.",
"games.cricket.infoTitle": "Cricket",
"games.cricket.infoBody":
  "Close numbers 15 to 20 and the Bull before your opponent while scoring as many points as possible.",

"games.killer.title": "KILLER",
"games.killer.subtitle": "Ramt dit nummer… bliv Killer.",
"games.killer.infoTitle": "Killer",
"games.killer.infoBody":
  "Each player has a number. Become Killer by hitting yours, then eliminate the other players.",

"games.shanghai.title": "SHANGHAI",
"games.shanghai.subtitle": "Rundens mål, S-D-T = Shanghai.",
"games.shanghai.infoTitle": "Shanghai",
"games.shanghai.infoBody":
  "Each round has a different target. Hit single, double and triple on the same visit to score a Shanghai.",

"games.battle.title": "BATTLE ROYALE",
"games.battle.subtitle": "Sjov multiplayer — eliminering.",
"games.battle.infoTitle": "Battle Royale",
"games.battle.infoBody":
  "Fun multiplayer mode with successive eliminations. Last player standing wins.",

"games.status.comingSoon": "Kommer snart",
"games.info.close": "Luk",

    "lang.fr": "Fransk",
    "lang.en": "Engelsk",
    "lang.es": "Spansk",
    "lang.de": "Tysk",
    "lang.it": "Italiensk",
    "lang.pt": "Portugisisk",
    "lang.nl": "Hollandsk",
    "lang.ru": "Russisk",
    "lang.zh": "Kinesisk",
    "lang.ja": "Japansk",
    "lang.ar": "Arabisk",
    "lang.hi": "Hindi",
    "lang.tr": "Tyrkisk",
    "lang.da": "Dansk",
    "lang.no": "Norsk",
    "lang.sv": "Svensk",
    "lang.is": "Islandsk",
    "lang.pl": "Polsk",
    "lang.ro": "Rumænsk",
    "lang.at": "østrigsk",
    "lang.sr": "Serbisk",
    "lang.hr": "Kroatisk",
    "lang.cs": "Tjekkisk",
  },

  // ---------- NORWEGIAN ----------
  no: {
    "nav.home": "Hjem",
    "nav.games": "Spill",
    "nav.profiles": "Profiler",
    "nav.friends": "Venner",
    "nav.stats": "Statistikk",
    "nav.settings": "Innstillinger",

    "settings.back": "Tilbake",
    "settings.title": "Innstillinger",
    "settings.subtitle":
      "Tilpass appens tema og språk",
    "settings.theme": "Tema",
    "settings.lang": "Språk",

    "settings.theme.gold.label": "Gull-neon",
    "settings.theme.gold.desc": "Premium gulltema",
    "settings.theme.pink.label": "Rosa neon",
    "settings.theme.pink.desc": "Arkade-rosa stemning",
    "settings.theme.petrol.label": "Petrolblå",
    "settings.theme.petrol.desc": "Dyp neonlys blå",
    "settings.theme.green.label": "Grønn neon",
    "settings.theme.green.desc": "Lyst treningsdesign",
    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Kraftig fiolett / magenta",
    "settings.theme.red.label": "Rød",
    "settings.theme.red.desc": "Aggressiv arkade-rød",
    "settings.theme.orange.label": "Oransje",
    "settings.theme.orange.desc": "Varm og energisk oransje",
    "settings.theme.white.label": "Hvit",
    "settings.theme.white.desc": "Moderne lyst tema",

    // GAMES PAGE
"games.title": "ALLE SPILL",
"games.subtitle": "Velg en spillmodus",

"games.training.title": "TRENING",
"games.training.subtitle": "Forbedre utviklingen din.",
"games.training.infoTitle": "Trening",
"games.training.infoBody":
  "Practice mode to work on consistency, scoring and finishing.",

"games.x01.title": "X01",
"games.x01.subtitle": "301 / 501 / 701 / 901.",
"games.x01.infoTitle": "X01",
"games.x01.infoBody":
  "Classic 301/501/701/901 games with stats, history and several rule options.",

"games.cricket.title": "CRICKET",
"games.cricket.subtitle": "Lukk 15–20 + Bull.",
"games.cricket.infoTitle": "Cricket",
"games.cricket.infoBody":
  "Close numbers 15 to 20 and the Bull before your opponent while scoring as many points as possible.",

"games.killer.title": "KILLER",
"games.killer.subtitle": "Treff tallet ditt… bli Killer.",
"games.killer.infoTitle": "Killer",
"games.killer.infoBody":
  "Each player has a number. Become Killer by hitting yours, then eliminate the other players.",

"games.shanghai.title": "SHANGHAI",
"games.shanghai.subtitle": "Rundens mål, S-D-T = Shanghai.",
"games.shanghai.infoTitle": "Shanghai",
"games.shanghai.infoBody":
  "Each round has a different target. Hit single, double and triple on the same visit to score a Shanghai.",

"games.battle.title": "BATTLE ROYALE",
"games.battle.subtitle": "Morsom flerspiller — eliminering.",
"games.battle.infoTitle": "Battle Royale",
"games.battle.infoBody":
  "Fun multiplayer mode with successive eliminations. Last player standing wins.",

"games.status.comingSoon": "Kommer snart",
"games.info.close": "Lukk",

    "lang.fr": "Fransk",
    "lang.en": "Engelsk",
    "lang.es": "Spansk",
    "lang.de": "Tysk",
    "lang.it": "Italiensk",
    "lang.pt": "Portugisisk",
    "lang.nl": "Nederlandsk",
    "lang.ru": "Russisk",
    "lang.zh": "Kinesisk",
    "lang.ja": "Japansk",
    "lang.ar": "Arabisk",
    "lang.hi": "Hindi",
    "lang.tr": "Tyrkisk",
    "lang.da": "Dansk",
    "lang.no": "Norsk",
    "lang.sv": "Svensk",
    "lang.is": "Islandsk",
    "lang.pl": "Polsk",
    "lang.ro": "Rumensk",
    "lang.at": "østerriksk",
    "lang.sr": "Serbisk",
    "lang.hr": "Kroatisk",
    "lang.cs": "Tsjekkisk",
  },

  // ---------- SWEDISH ----------
  sv: {
    "nav.home": "Hem",
    "nav.games": "Spel",
    "nav.profiles": "Profiler",
    "nav.friends": "Vänner",
    "nav.stats": "Statistik",
    "nav.settings": "Inställningar",

    "settings.back": "Tillbaka",
    "settings.title": "Inställningar",
    "settings.subtitle":
      "Anpassa appens tema och språk",
    "settings.theme": "Tema",
    "settings.lang": "Språk",

    "settings.theme.gold.label": "Guldneon",
    "settings.theme.gold.desc": "Premium guldtema",
    "settings.theme.pink.label": "Rosa neon",
    "settings.theme.pink.desc": "Arkadinspirerad rosa stil",
    "settings.theme.petrol.label": "Petrolblå",
    "settings.theme.petrol.desc": "Djup neonsblå",
    "settings.theme.green.label": "Grön neon",
    "settings.theme.green.desc": "Ljus träningsstil",
    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Intensiv violett / magenta",
    "settings.theme.red.label": "Röd",
    "settings.theme.red.desc": "Aggressiv arkadröd",
    "settings.theme.orange.label": "Orange",
    "settings.theme.orange.desc": "Varm energisk orange",
    "settings.theme.white.label": "Vit",
    "settings.theme.white.desc": "Modernt ljust tema",

    // GAMES PAGE
"games.title": "ALLA SPEL",
"games.subtitle": "Välj ett spelläge",

"games.training.title": "TRÄNING",
"games.training.subtitle": "Förbättra din utveckling.",
"games.training.infoTitle": "Träning",
"games.training.infoBody":
  "Practice mode to work on consistency, scoring and finishing.",

"games.x01.title": "X01",
"games.x01.subtitle": "301 / 501 / 701 / 901.",
"games.x01.infoTitle": "X01",
"games.x01.infoBody":
  "Classic 301/501/701/901 games with stats, history and several rule options.",

"games.cricket.title": "CRICKET",
"games.cricket.subtitle": "Stäng 15–20 + Bull.",
"games.cricket.infoTitle": "Cricket",
"games.cricket.infoBody":
  "Close numbers 15 to 20 and the Bull before your opponent while scoring as many points as possible.",

"games.killer.title": "KILLER",
"games.killer.subtitle": "Träffa ditt nummer… bli Killer.",
"games.killer.infoTitle": "Killer",
"games.killer.infoBody":
  "Each player has a number. Become Killer by hitting yours, then eliminate the other players.",

"games.shanghai.title": "SHANGHAI",
"games.shanghai.subtitle": "Rundans mål, S-D-T = Shanghai.",
"games.shanghai.infoTitle": "Shanghai",
"games.shanghai.infoBody":
  "Each round has a different target. Hit single, double and triple on the same visit to score a Shanghai.",

"games.battle.title": "BATTLE ROYALE",
"games.battle.subtitle": "Roligt flerspelarläge — eliminering.",
"games.battle.infoTitle": "Battle Royale",
"games.battle.infoBody":
  "Fun multiplayer mode with successive eliminations. Last player standing wins.",

"games.status.comingSoon": "Kommer snart",
"games.info.close": "Stäng",

    "lang.fr": "Franska",
    "lang.en": "Engelska",
    "lang.es": "Spanska",
    "lang.de": "Tyska",
    "lang.it": "Italienska",
    "lang.pt": "Portugisiska",
    "lang.nl": "Nederländska",
    "lang.ru": "Ryska",
    "lang.zh": "Kinesiska",
    "lang.ja": "Japanska",
    "lang.ar": "Arabiska",
    "lang.hi": "Hindi",
    "lang.tr": "Turkiska",
    "lang.da": "Danska",
    "lang.no": "Norska",
    "lang.sv": "Svenska",
    "lang.is": "Isländska",
    "lang.pl": "Polska",
    "lang.ro": "Rumänska",
    "lang.at": "österrikisk",
    "lang.sr": "Serbiska",
    "lang.hr": "Kroatiska",
    "lang.cs": "Tjeckiska",
  },

  // ---------- ICELANDIC ----------
  is: {
    "nav.home": "Heim",
    "nav.games": "Leikir",
    "nav.profiles": "Prófílar",
    "nav.friends": "Vinir",
    "nav.stats": "Tölfræði",
    "nav.settings": "Stillingar",

    "settings.back": "Til baka",
    "settings.title": "Stillingar",
    "settings.subtitle":
      "Sérstilltu þema og tungumál forritsins",
    "settings.theme": "Þema",
    "settings.lang": "Tungumál",

    "settings.theme.gold.label": "Gull-neon",
    "settings.theme.gold.desc": "Gæðagullþema",
    "settings.theme.pink.label": "Bleikt neon",
    "settings.theme.pink.desc": "Spilasalastemning í bleiku",
    "settings.theme.petrol.label": "Petrolblár",
    "settings.theme.petrol.desc": "Djúp neonblá",
    "settings.theme.green.label": "Grænt neon",
    "settings.theme.green.desc": "Björt æfingahönnun",
    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Sterkur fjólublár / magenta",
    "settings.theme.red.label": "Rautt",
    "settings.theme.red.desc": "Árásargjarnt spilasalarautt",
    "settings.theme.orange.label": "Appelsínugult",
    "settings.theme.orange.desc": "Hlýtt og kraftmikið appelsínugult",
    "settings.theme.white.label": "Hvítt",
    "settings.theme.white.desc": "Nútímalegt ljós þema",

    // GAMES PAGE
"games.title": "ALLIR LEIKIR",
"games.subtitle": "Veldu leikham",

"games.training.title": "ÞJÁLFUN",
"games.training.subtitle": "Bættu frammistöðu þína.",
"games.training.infoTitle": "Þjálfun",
"games.training.infoBody":
  "Practice mode to work on consistency, scoring and finishing.",

"games.x01.title": "X01",
"games.x01.subtitle": "301 / 501 / 701 / 901.",
"games.x01.infoTitle": "X01",
"games.x01.infoBody":
  "Classic 301/501/701/901 games with stats, history and several rule options.",

"games.cricket.title": "CRICKET",
"games.cricket.subtitle": "Lokaðu 15–20 + Bull.",
"games.cricket.infoTitle": "Cricket",
"games.cricket.infoBody":
  "Close numbers 15 to 20 and the Bull before your opponent while scoring as many points as possible.",

"games.killer.title": "KILLER",
"games.killer.subtitle": "Hittu númerið þitt… vertu Killer.",
"games.killer.infoTitle": "Killer",
"games.killer.infoBody":
  "Each player has a number. Become Killer by hitting yours, then eliminate the other players.",

"games.shanghai.title": "SHANGHAI",
"games.shanghai.subtitle": "Mark raundar, S-D-T = Shanghai.",
"games.shanghai.infoTitle": "Shanghai",
"games.shanghai.infoBody":
  "Each round has a different target. Hit single, double and triple on the same visit to score a Shanghai.",

"games.battle.title": "BATTLE ROYALE",
"games.battle.subtitle": "Skemmtilegur fjölspilunarhamur — brottfall.",
"games.battle.infoTitle": "Battle Royale",
"games.battle.infoBody":
  "Fun multiplayer mode with successive eliminations. Last player standing wins.",

"games.status.comingSoon": "Væntanlegt",
"games.info.close": "Loka",

    "lang.fr": "Franska",
    "lang.en": "Enska",
    "lang.es": "Spænska",
    "lang.de": "Þýska",
    "lang.it": "Ítalska",
    "lang.pt": "Portúgalska",
    "lang.nl": "Hollenska",
    "lang.ru": "Rússneska",
    "lang.zh": "Kínverska",
    "lang.ja": "Japanska",
    "lang.ar": "Arabíska",
    "lang.hi": "Hindí",
    "lang.tr": "Tyrkneska",
    "lang.da": "Danska",
    "lang.no": "Norska",
    "lang.sv": "Sænska",
    "lang.is": "Íslenska",
    "lang.pl": "Pólska",
    "lang.ro": "Rúmenska",
    "lang.at": "austurrískur",
    "lang.sr": "Serbneska",
    "lang.hr": "Króatíska",
    "lang.cs": "Tékkneska",
  },

  // ---------- POLISH ----------
  pl: {
    "nav.home": "Start",
    "nav.games": "Gry",
    "nav.profiles": "Profile",
    "nav.friends": "Znajomi",
    "nav.stats": "Statystyki",
    "nav.settings": "Ustawienia",

    "settings.back": "Wstecz",
    "settings.title": "Ustawienia",
    "settings.subtitle":
      "Dostosuj motyw i język aplikacji",
    "settings.theme": "Motyw",
    "settings.lang": "Język",

    "settings.theme.gold.label": "Złoty neon",
    "settings.theme.gold.desc": "Premium złoty motyw",
    "settings.theme.pink.label": "Różowy neon",
    "settings.theme.pink.desc": "Różowa atmosfera arcade",
    "settings.theme.petrol.label": "Petrolowy niebieski",
    "settings.theme.petrol.desc": "Głęboki neonowy niebieski",
    "settings.theme.green.label": "Zielony neon",
    "settings.theme.green.desc": "Jasny styl treningowy",
    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Intensywny fiolet / magenta",
    "settings.theme.red.label": "Czerwony",
    "settings.theme.red.desc": "Agresywna czerwień arcade",
    "settings.theme.orange.label": "Pomarańczowy",
    "settings.theme.orange.desc": "Ciepły, energetyczny pomarańcz",
    "settings.theme.white.label": "Biały",
    "settings.theme.white.desc": "Nowoczesne jasne tło",

    // GAMES PAGE
"games.title": "WSZYSTKIE GRY",
"games.subtitle": "Wybierz tryb gry",

"games.training.title": "TRENING",
"games.training.subtitle": "Popraw swoje umiejętności.",
"games.training.infoTitle": "Trening",
"games.training.infoBody":
  "Practice mode to work on consistency, scoring and finishing.",

"games.x01.title": "X01",
"games.x01.subtitle": "301 / 501 / 701 / 901.",
"games.x01.infoTitle": "X01",
"games.x01.infoBody":
  "Classic 301/501/701/901 games with stats, history and several rule options.",

"games.cricket.title": "CRICKET",
"games.cricket.subtitle": "Zamknij 15–20 + Bull.",
"games.cricket.infoTitle": "Cricket",
"games.cricket.infoBody":
  "Close numbers 15 to 20 and the Bull before your opponent while scoring as many points as possible.",

"games.killer.title": "KILLER",
"games.killer.subtitle": "Traf swój numer… zostań Killerem.",
"games.killer.infoTitle": "Killer",
"games.killer.infoBody":
  "Each player has a number. Become Killer by hitting yours, then eliminate the other players.",

"games.shanghai.title": "SHANGHAI",
"games.shanghai.subtitle": "Cel rundy, S-D-T = Shanghai.",
"games.shanghai.infoTitle": "Shanghai",
"games.shanghai.infoBody":
  "Each round has a different target. Hit single, double and triple on the same visit to score a Shanghai.",

"games.battle.title": "BATTLE ROYALE",
"games.battle.subtitle": "Zabawa multiplayer — eliminacje.",
"games.battle.infoTitle": "Battle Royale",
"games.battle.infoBody":
  "Fun multiplayer mode with successive eliminations. Last player standing wins.",

"games.status.comingSoon": "Wkrótce",
"games.info.close": "Zamknij",

    "lang.fr": "Francuski",
    "lang.en": "Angielski",
    "lang.es": "Hiszpański",
    "lang.de": "Niemiecki",
    "lang.it": "Włoski",
    "lang.pt": "Portugalski",
    "lang.nl": "Holenderski",
    "lang.ru": "Rosyjski",
    "lang.zh": "Chiński",
    "lang.ja": "Japoński",
    "lang.ar": "Arabski",
    "lang.hi": "Hindi",
    "lang.tr": "Turecki",
    "lang.da": "Duński",
    "lang.no": "Norweski",
    "lang.sv": "Szwedzki",
    "lang.is": "Islandzki",
    "lang.pl": "Polski",
    "lang.ro": "Rumuński",
    "lang.at": "austriacki",
    "lang.sr": "Serbski",
    "lang.hr": "Chorwacki",
    "lang.cs": "Czeski",
  },

  // ---------- ROMANIAN ----------
  ro: {
    "nav.home": "Acasă",
    "nav.games": "Jocuri",
    "nav.profiles": "Profiluri",
    "nav.friends": "Prieteni",
    "nav.stats": "Statistici",
    "nav.settings": "Setări",

    "settings.back": "Înapoi",
    "settings.title": "Setări",
    "settings.subtitle":
      "Personalizează tema și limba aplicației",
    "settings.theme": "Temă",
    "settings.lang": "Limbă",

    "settings.theme.gold.label": "Neon auriu",
    "settings.theme.gold.desc": "Temă premium aurie",
    "settings.theme.pink.label": "Neon roz",
    "settings.theme.pink.desc": "Ambianță arcade roz",
    "settings.theme.petrol.label": "Albastru petrol",
    "settings.theme.petrol.desc": "Albastru neon profund",
    "settings.theme.green.label": "Neon verde",
    "settings.theme.green.desc": "Stil de antrenament luminos",
    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Violet / magenta intens",
    "settings.theme.red.label": "Roșu",
    "settings.theme.red.desc": "Roșu arcade agresiv",
    "settings.theme.orange.label": "Portocaliu",
    "settings.theme.orange.desc": "Portocaliu cald și energic",
    "settings.theme.white.label": "Alb",
    "settings.theme.white.desc": "Fundal modern, deschis",

    // GAMES PAGE
"games.title": "TOATE JOCURILE",
"games.subtitle": "Selectează un mod de joc",

"games.training.title": "ANTRENAMENT",
"games.training.subtitle": "Îmbunătățește-ți progresul.",
"games.training.infoTitle": "Antrenament",
"games.training.infoBody":
  "Practice mode to work on consistency, scoring and finishing.",

"games.x01.title": "X01",
"games.x01.subtitle": "301 / 501 / 701 / 901.",
"games.x01.infoTitle": "X01",
"games.x01.infoBody":
  "Classic 301/501/701/901 games with stats, history and several rule options.",

"games.cricket.title": "CRICKET",
"games.cricket.subtitle": "Închide 15–20 + Bull.",
"games.cricket.infoTitle": "Cricket",
"games.cricket.infoBody":
  "Close numbers 15 to 20 and the Bull before your opponent while scoring as many points as possible.",

"games.killer.title": "KILLER",
"games.killer.subtitle": "Lovește numărul tău… devino Killer.",
"games.killer.infoTitle": "Killer",
"games.killer.infoBody":
  "Each player has a number. Become Killer by hitting yours, then eliminate the other players.",

"games.shanghai.title": "SHANGHAI",
"games.shanghai.subtitle": "Ținta rundei, S-D-T = Shanghai.",
"games.shanghai.infoTitle": "Shanghai",
"games.shanghai.infoBody":
  "Each round has a different target. Hit single, double and triple on the same visit to score a Shanghai.",

"games.battle.title": "BATTLE ROYALE",
"games.battle.subtitle": "Mod distractiv — eliminări.",
"games.battle.infoTitle": "Battle Royale",
"games.battle.infoBody":
  "Fun multiplayer mode with successive eliminations. Last player standing wins.",

"games.status.comingSoon": "În curând",
"games.info.close": "Închide",

    "lang.fr": "Franceză",
    "lang.en": "Engleză",
    "lang.es": "Spaniolă",
    "lang.de": "Germană",
    "lang.it": "Italiană",
    "lang.pt": "Portugheză",
    "lang.nl": "Olandeză",
    "lang.ru": "Rusă",
    "lang.zh": "Chineză",
    "lang.ja": "Japoneză",
    "lang.ar": "Arabă",
    "lang.hi": "Hindi",
    "lang.tr": "Turcă",
    "lang.da": "Daneză",
    "lang.no": "Norvegiană",
    "lang.sv": "Suedeză",
    "lang.is": "Islandeză",
    "lang.pl": "Poloneză",
    "lang.ro": "Română",
    "lang.at": "austriac",
    "lang.sr": "Sârbă",
    "lang.hr": "Croată",
    "lang.cs": "Cehă",
  },

// ---------- ÖSTERREICHISCHES DEUTSCH ----------
at: {
  // --- NAV ---
  "nav.home": "Startseite",
  "nav.games": "Spiele",
  "nav.profiles": "Profile",
  "nav.friends": "Freunde",
  "nav.stats": "Statistiken",
  "nav.settings": "Einstellungen",

  // --- SETTINGS ---
  "settings.back": "Zurück",
  "settings.title": "Einstellungen",
  "settings.subtitle": "Passe Design und Sprache der App an",
  "settings.theme": "Design",
  "settings.lang": "Sprache",

  "settings.theme.gold.label": "Gold-Neon",
  "settings.theme.gold.desc": "Edles goldfarbenes Premium-Design",

  "settings.theme.pink.label": "Pink-Neon",
  "settings.theme.pink.desc": "Arcade-Pink Look",

  "settings.theme.petrol.label": "Petrolblau",
  "settings.theme.petrol.desc": "Tiefes Neon-Blau",

  "settings.theme.green.label": "Grün-Neon",
  "settings.theme.green.desc": "Helles Trainings-Design",

  "settings.theme.magenta.label": "Magenta",
  "settings.theme.magenta.desc": "Intensives Magenta/Violett",

  "settings.theme.red.label": "Rot",
  "settings.theme.red.desc": "Kräftiges Arcade-Rot",

  "settings.theme.orange.label": "Orange",
  "settings.theme.orange.desc": "Warm und energiegeladen",

  "settings.theme.white.label": "Weiß",
  "settings.theme.white.desc": "Modernes helles Layout",

  // --- HOME ---
  "home.greeting": "Willkommen",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "ANMELDEN",

  "home.card.profiles.title": "PROFILE",
  "home.card.profiles.subtitle": "Profile erstellen und verwalten",

  "home.card.local.title": "LOKALES SPIEL",
  "home.card.local.subtitle": "Zugriff auf alle Spielmodi",

  "home.card.online.title": "ONLINE-SPIEL",
  "home.card.online.subtitle": "Online-Partien (bald verfügbar)",

  "home.card.stats.title": "STATISTIKEN",
  "home.card.stats.subtitle": "Statistiken und Verlauf",

  "home.seeStats": "Meine Statistiken ansehen",

  "home.stats.avg3": "Schnitt/3",
  "home.stats.best": "Best",
  "home.stats.co": "CO",
  "home.stats.winPct": "Win%",

  // STATUS
  "status.online": "Online",
  "status.away": "Abwesend",
  "status.offline": "Offline",

  // --- GAMES ---
  "games.title": "ALLE SPIELE",
  "games.subtitle": "Wähle einen Spielmodus",

  "games.training.title": "TRAINING",
  "games.training.subtitle": "Verbessere deinen Fortschritt.",
  "games.training.infoTitle": "Training",
  "games.training.infoBody":
    "Trainingsmodus zur Verbesserung von Konstanz, Scoring und Finishing.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "Klassische X01-Varianten mit Statistiken, Verlauf und mehreren Regeloptionen.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "Schließe 15–20 + Bull.",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "Schließe die Zahlen 15–20 und Bull vor deinem Gegner und sammle Punkte.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "Triff deine Zahl… werde Killer.",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "Werde zum Killer, indem du deine Zahl triffst — eliminiere danach die anderen Spieler.",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle":
    "Rundenziel, E-D-T = Shanghai.",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "Ziel ändert sich jede Runde. Einfach/Doppel/Triple auf dieselbe Zahl ergibt ein Shanghai.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "Multiplayer-Spaß — Eliminierungen.",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "Mehrspieler-Modus mit fortlaufenden Eliminierungen. Wer zuletzt steht, gewinnt.",

  "games.status.comingSoon": "Bald verfügbar",
  "games.info.close": "Schließen",

  // --- TRAINING MENU (COMPLET) ---
  "training.menu.title": "TRAINING",
  "training.menu.subtitle": "Wähle einen Trainingsmodus",

  "training.menu.x01.title": "Training X01",
  "training.menu.x01.subtitle": "Scoring & Finishing verbessern",
  "training.menu.x01.info":
    "Verbessere Konstanz, Scoring und Finishing im speziellen X01-Training.",

  "training.menu.clock.title": "Around the Clock",
  "training.menu.clock.subtitle": "Einfach / Doppel / Triple",
  "training.menu.clock.info":
    "Treffe die Zahlen 1–20 und Bull. Wähle Einfach, Doppel oder Triple.",

  "training.menu.evolution.title": "Evolution",
  "training.menu.evolution.subtitle": "Bald verfügbar",
  "training.menu.evolution.info":
    "Ein neuer Trainingsmodus wird bald freigeschaltet.",

  "training.menu.comingSoon": "Bald verfügbar",
  "training.menu.info.close": "Schließen",

  // --- PROFILE PAGE (NOUVEAU) ---
  "profiles.title": "PROFILE",
  "profiles.create": "Profil erstellen",
  "profiles.edit": "Profil bearbeiten",
  "profiles.delete": "Profil löschen",
  "profiles.confirmDeleteTitle": "Profil wirklich löschen?",
  "profiles.confirmDeleteBody":
    "Dieses Profil und alle zugehörigen Statistiken werden dauerhaft gelöscht.",
  "profiles.confirmDeleteYes": "Löschen",
  "profiles.confirmDeleteNo": "Abbrechen",

  "profiles.name": "Name",
  "profiles.avatar": "Avatar",
  "profiles.stats": "Statistiken",
  "profiles.noProfiles": "Noch keine Profile vorhanden.",
  "profiles.pickOne": "Wähle ein Profil",
  "profiles.active": "Aktives Profil",

  // --- LANG NAMES ---
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
  "lang.hi": "Hindi",
  "lang.tr": "Türkisch",
  "lang.da": "Dänisch",
  "lang.no": "Norwegisch",
  "lang.sv": "Schwedisch",
  "lang.is": "Isländisch",
  "lang.pl": "Polnisch",
  "lang.ro": "Rumänisch",
  "lang.at": "Österreichisch",
  "lang.sr": "Serbisch",
  "lang.hr": "Kroatisch",
  "lang.cs": "Tschechisch",
},

  // ---------- SERBIAN ----------
  sr: {
    "nav.home": "Početna",
    "nav.games": "Igre",
    "nav.profiles": "Profili",
    "nav.friends": "Prijatelji",
    "nav.stats": "Statistika",
    "nav.settings": "Podešavanja",

    "settings.back": "Nazad",
    "settings.title": "Podešavanja",
    "settings.subtitle":
      "Prilagodi temu i jezik aplikacije",
    "settings.theme": "Tema",
    "settings.lang": "Jezik",

    "settings.theme.gold.label": "Zlatni neon",
    "settings.theme.gold.desc": "Premium zlatna tema",
    "settings.theme.pink.label": "Roze neon",
    "settings.theme.pink.desc": "Arkada roze atmosfera",
    "settings.theme.petrol.label": "Petrol plava",
    "settings.theme.petrol.desc": "Duboka neonska plava",
    "settings.theme.green.label": "Zeleni neon",
    "settings.theme.green.desc": "Svetao trening stil",
    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Intenzivna ljubičasta / magenta",
    "settings.theme.red.label": "Crvena",
    "settings.theme.red.desc": "Agresivna arkada crvena",
    "settings.theme.orange.label": "Narandžasta",
    "settings.theme.orange.desc": "Topla energična narandžasta",
    "settings.theme.white.label": "Bela",
    "settings.theme.white.desc": "Moderan svetao pozadinski dizajn",

    // GAMES PAGE
"games.title": "SVE IGRE",
"games.subtitle": "Izaberite način igre",

"games.training.title": "TRENING",
"games.training.subtitle": "Poboljšajte svoj napredak.",
"games.training.infoTitle": "Trening",
"games.training.infoBody":
  "Practice mode to work on consistency, scoring and finishing.",

"games.x01.title": "X01",
"games.x01.subtitle": "301 / 501 / 701 / 901.",
"games.x01.infoTitle": "X01",
"games.x01.infoBody":
  "Classic 301/501/701/901 games with stats, history and several rule options.",

"games.cricket.title": "CRICKET",
"games.cricket.subtitle": "Zatvori 15–20 + Bull.",
"games.cricket.infoTitle": "Cricket",
"games.cricket.infoBody":
  "Close numbers 15 to 20 and the Bull before your opponent while scoring as many points as possible.",

"games.killer.title": "KILLER",
"games.killer.subtitle": "Pogodi svoj broj… postani Killer.",
"games.killer.infoTitle": "Killer",
"games.killer.infoBody":
  "Each player has a number. Become Killer by hitting yours, then eliminate the other players.",

"games.shanghai.title": "SHANGHAI",
"games.shanghai.subtitle": "Cilj runde, S-D-T = Shanghai.",
"games.shanghai.infoTitle": "Shanghai",
"games.shanghai.infoBody":
  "Each round has a different target. Hit single, double and triple on the same visit to score a Shanghai.",

"games.battle.title": "BATTLE ROYALE",
"games.battle.subtitle": "Zabavan režim — eliminacije.",
"games.battle.infoTitle": "Battle Royale",
"games.battle.infoBody":
  "Fun multiplayer mode with successive eliminations. Last player standing wins.",

"games.status.comingSoon": "Uskoro",
"games.info.close": "Zatvori",

    "lang.fr": "Francuski",
    "lang.en": "Engleski",
    "lang.es": "Španski",
    "lang.de": "Nemački",
    "lang.it": "Italijanski",
    "lang.pt": "Portugalski",
    "lang.nl": "Holandski",
    "lang.ru": "Ruski",
    "lang.zh": "Kineski",
    "lang.ja": "Japanski",
    "lang.ar": "Arapski",
    "lang.hi": "Hindi",
    "lang.tr": "Turski",
    "lang.da": "Danski",
    "lang.no": "Norveški",
    "lang.sv": "Švedski",
    "lang.is": "Islandski",
    "lang.pl": "Poljski",
    "lang.ro": "Rumunski",
    "lang.at": "аустријски",
    "lang.sr": "Srpski",
    "lang.hr": "Hrvatski",
    "lang.cs": "Češki",
  },

  // ---------- CROATIAN ----------
  hr: {
    "nav.home": "Početna",
    "nav.games": "Igre",
    "nav.profiles": "Profili",
    "nav.friends": "Prijatelji",
    "nav.stats": "Statistika",
    "nav.settings": "Postavke",

    "settings.back": "Natrag",
    "settings.title": "Postavke",
    "settings.subtitle":
      "Prilagodi temu i jezik aplikacije",
    "settings.theme": "Tema",
    "settings.lang": "Jezik",

    "settings.theme.gold.label": "Zlatni neon",
    "settings.theme.gold.desc": "Premium zlatna tema",
    "settings.theme.pink.label": "Rozi neon",
    "settings.theme.pink.desc": "Arkada roza atmosfera",
    "settings.theme.petrol.label": "Petrol plava",
    "settings.theme.petrol.desc": "Duboka neonska plava",
    "settings.theme.green.label": "Zeleni neon",
    "settings.theme.green.desc": "Svijetli trening stil",
    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Intenzivna ljubičasta / magenta",
    "settings.theme.red.label": "Crvena",
    "settings.theme.red.desc": "Agresivna arkada crvena",
    "settings.theme.orange.label": "Narančasta",
    "settings.theme.orange.desc": "Topla energična narančasta",
    "settings.theme.white.label": "Bijela",
    "settings.theme.white.desc": "Moderan svijetli izgled",

    // GAMES PAGE
"games.title": "SVE IGRE",
"games.subtitle": "Odaberite način igre",

"games.training.title": "TRENING",
"games.training.subtitle": "Poboljšajte svoj napredak.",
"games.training.infoTitle": "Trening",
"games.training.infoBody":
  "Practice mode to work on consistency, scoring and finishing.",

"games.x01.title": "X01",
"games.x01.subtitle": "301 / 501 / 701 / 901.",
"games.x01.infoTitle": "X01",
"games.x01.infoBody":
  "Classic 301/501/701/901 games with stats, history and several rule options.",

"games.cricket.title": "CRICKET",
"games.cricket.subtitle": "Zatvori 15–20 + Bull.",
"games.cricket.infoTitle": "Cricket",
"games.cricket.infoBody":
  "Close numbers 15 to 20 and the Bull before your opponent while scoring as many points as possible.",

"games.killer.title": "KILLER",
"games.killer.subtitle": "Pogodi svoj broj… postani Killer.",
"games.killer.infoTitle": "Killer",
"games.killer.infoBody":
  "Each player has a number. Become Killer by hitting yours, then eliminate the other players.",

"games.shanghai.title": "SHANGHAI",
"games.shanghai.subtitle": "Cilj runde, S-D-T = Shanghai.",
"games.shanghai.infoTitle": "Shanghai",
"games.shanghai.infoBody":
  "Each round has a different target. Hit single, double and triple on the same visit to score a Shanghai.",

"games.battle.title": "BATTLE ROYALE",
"games.battle.subtitle": "Zabavan način — eliminacije.",
"games.battle.infoTitle": "Battle Royale",
"games.battle.infoBody":
  "Fun multiplayer mode with successive eliminations. Last player standing wins.",

"games.status.comingSoon": "Uskoro",
"games.info.close": "Zatvori",


    "lang.fr": "Francuski",
    "lang.en": "Engleski",
    "lang.es": "Španjolski",
    "lang.de": "Njemački",
    "lang.it": "Talijanski",
    "lang.pt": "Portugalski",
    "lang.nl": "Nizozemski",
    "lang.ru": "Ruski",
    "lang.zh": "Kineski",
    "lang.ja": "Japanski",
    "lang.ar": "Arapski",
    "lang.hi": "Hindski",
    "lang.tr": "Turski",
    "lang.da": "Danski",
    "lang.no": "Norveški",
    "lang.sv": "Švedski",
    "lang.is": "Islandski",
    "lang.pl": "Poljski",
    "lang.ro": "Rumunjski",
    "lang.at": "austrijski",
    "lang.sr": "Srpski",
    "lang.hr": "Hrvatski",
    "lang.cs": "Češki",
  },

  // ---------- CZECH ----------
  cs: {
    "nav.home": "Domů",
    "nav.games": "Hry",
    "nav.profiles": "Profily",
    "nav.friends": "Přátelé",
    "nav.stats": "Statistiky",
    "nav.settings": "Nastavení",

    "settings.back": "Zpět",
    "settings.title": "Nastavení",
    "settings.subtitle":
      "Upravte vzhled a jazyk aplikace",
    "settings.theme": "Motiv",
    "settings.lang": "Jazyk",

    "settings.theme.gold.label": "Zlatý neon",
    "settings.theme.gold.desc": "Prémiový zlatý motiv",
    "settings.theme.pink.label": "Růžový neon",
    "settings.theme.pink.desc": "Arkádová růžová atmosféra",
    "settings.theme.petrol.label": "Petrolejová modrá",
    "settings.theme.petrol.desc": "Hluboká neonová modrá",
    "settings.theme.green.label": "Zelený neon",
    "settings.theme.green.desc": "Světlý tréninkový styl",
    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Intenzivní fialová / magenta",
    "settings.theme.red.label": "Červená",
    "settings.theme.red.desc": "Agresivní arkádová červená",
    "settings.theme.orange.label": "Oranžová",
    "settings.theme.orange.desc": "Teplá energická oranžová",
    "settings.theme.white.label": "Bílá",
    "settings.theme.white.desc": "Moderní světlé pozadí",

    // GAMES PAGE
"games.title": "VŠECHNY HRY",
"games.subtitle": "Vyberte herní režim",

"games.training.title": "TRÉNINK",
"games.training.subtitle": "Zlepšete svůj pokrok.",
"games.training.infoTitle": "Trénink",
"games.training.infoBody":
  "Practice mode to work on consistency, scoring and finishing.",

"games.x01.title": "X01",
"games.x01.subtitle": "301 / 501 / 701 / 901.",
"games.x01.infoTitle": "X01",
"games.x01.infoBody":
  "Classic 301/501/701/901 games with stats, history and several rule options.",

"games.cricket.title": "CRICKET",
"games.cricket.subtitle": "Uzavřete 15–20 + Bull.",
"games.cricket.infoTitle": "Cricket",
"games.cricket.infoBody":
  "Close numbers 15 to 20 and the Bull before your opponent while scoring as many points as possible.",

"games.killer.title": "KILLER",
"games.killer.subtitle": "Trefte své číslo… staňte se Killerem.",
"games.killer.infoTitle": "Killer",
"games.killer.infoBody":
  "Each player has a number. Become Killer by hitting yours, then eliminate the other players.",

"games.shanghai.title": "SHANGHAI",
"games.shanghai.subtitle": "Cíl kola, S-D-T = Shanghai.",
"games.shanghai.infoTitle": "Shanghai",
"games.shanghai.infoBody":
  "Each round has a different target. Hit single, double and triple on the same visit to score a Shanghai.",

"games.battle.title": "BATTLE ROYALE",
"games.battle.subtitle": "Zábavný režim — eliminace.",
"games.battle.infoTitle": "Battle Royale",
"games.battle.infoBody":
  "Fun multiplayer mode with successive eliminations. Last player standing wins.",

"games.status.comingSoon": "Brzy",
"games.info.close": "Zavřít",

    "lang.fr": "Francouzština",
    "lang.en": "Angličtina",
    "lang.es": "Španělština",
    "lang.de": "Němčina",
    "lang.it": "Italština",
    "lang.pt": "Portugalština",
    "lang.nl": "Nizozemština",
    "lang.ru": "Ruština",
    "lang.zh": "Čínština",
    "lang.ja": "Japonština",
    "lang.ar": "Arabština",
    "lang.hi": "Hindština",
    "lang.tr": "Turečtina",
    "lang.da": "Dánština",
    "lang.no": "Norština",
    "lang.sv": "Švédština",
    "lang.is": "Islandština",
    "lang.pl": "Polština",
    "lang.ro": "Rumunština",
    "lang.at": "rakouský",
    "lang.sr": "Srbština",
    "lang.hr": "Chorvatština",
    "lang.cs": "Čeština",
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
    const stored = window.localStorage.getItem(
      LANG_STORAGE_KEY
    ) as Lang | null;
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
      // 1) langue courante
      const dict = DICT[lang] || {};
      if (Object.prototype.hasOwnProperty.call(dict, key)) {
        return dict[key];
      }

      // 2) fallback EN par défaut pour toutes les autres langues
      const enDict = DICT.en;
      if (enDict && Object.prototype.hasOwnProperty.call(enDict, key)) {
        return enDict[key];
      }

      // 3) fallback passé au composant
      if (fallback !== undefined) {
        return fallback;
      }

      // 4) dernier recours : la clé elle-même
      return key;
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
