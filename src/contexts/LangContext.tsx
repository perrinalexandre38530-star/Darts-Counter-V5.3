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

  "settings.theme.gold.label": "NÉON DORÉ",
  "settings.theme.gold.desc": "Thème premium doré",

  "settings.theme.pink.label": "ROSE FLUO",
  "settings.theme.pink.desc": "Ambiance arcade rose",

  "settings.theme.petrol.label": "BLEU PÉTROLE",
  "settings.theme.petrol.desc": "Bleu néon profond",

  "settings.theme.green.label": "VÉGÉTAL",
  "settings.theme.green.desc": "Style clair pour s'entraîner",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "Violet / magenta intense",

  "settings.theme.red.label": "ROUGE VIF",
  "settings.theme.red.desc": "Rouge arcade agressif",

  "settings.theme.orange.label": "ORANGE FEU",
  "settings.theme.orange.desc": "Orange chaleureux et énergique",

  "settings.theme.white.label": "BLANC NEIGE",
  "settings.theme.white.desc": "Interface claire moderne",

  // --- HOME ---
  "home.greeting": "Bienvenue",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "SE CONNECTER",

  "home.card.profiles.title": "PROFILS",
  "home.card.profiles.subtitle": "Créer et gérer les profils",

  "home.card.local.title": "JEU LOCAL",
  "home.card.local.subtitle": "Accéder à tous les modes de jeu",

  "home.card.online.title": "JEU EN LIGNE",
  "home.card.online.subtitle": "Matchs à distance (bientôt dispo)",

  "home.card.stats.title": "STATS",
  "home.card.stats.subtitle": "Statistiques et historique",

  "home.seeStats": "Voir mes statistiques",

  "home.stats.avg3": "Moy/3",
  "home.stats.best": "Best",
  "home.stats.co": "CO",
  "home.stats.winPct": "% Vic.",

  // STATUS
  "status.online": "En ligne",
  "status.away": "Absent",
  "status.offline": "Hors ligne",

  // --- GAMES PAGE ---
  "games.title": "TOUS LES JEUX",
  "games.subtitle": "Choisis un mode de jeu",

  "games.training.title": "TRAINING",
  "games.training.subtitle": "Améliore ta progression.",
  "games.training.infoTitle": "Training",
  "games.training.infoBody":
    "Mode entraînement pour travailler la régularité, le scoring et les finitions.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "Parties classiques de 301/501/701/901 avec statistiques, historique et options avancées.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "Ferme 15–20 + Bull.",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "Ferme les cases 15 à 20 et le Bull avant ton adversaire tout en marquant un maximum de points.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "Touche ton numéro… deviens Killer.",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "Chaque joueur possède un numéro. Deviens Killer en touchant le tien, puis élimine les autres joueurs.",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "Cible du round, S-D-T = Shanghai.",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "Chaque round possède une cible. Touche simple, double et triple sur la même visite pour un Shanghai.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "Mode fun — éliminations.",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "Mode multijoueur fun avec éliminations successives. Le dernier joueur en vie gagne.",

  "games.status.comingSoon": "Bientôt disponible",
  "games.info.close": "Fermer",

  // --- TRAINING MENU ---
  "training.menu.title": "TRAINING",
  "training.menu.subtitle": "Améliore ta progression dans différents modes d’entraînement.",

  "training.menu.x01.title": "Training X01",
  "training.menu.x01.subtitle": "Travaille ton scoring et tes fins",
  "training.menu.x01.info":
    "Entraînement X01 dédié à la progression : scoring, régularité, finitions et statistiques détaillées.",

  "training.menu.clock.title": "Tour de l’horloge",
  "training.menu.clock.subtitle": "Simple / Double / Triple",
  "training.menu.clock.info":
    "Atteins chaque segment du 1 au 20 puis le Bull, en simple, double ou triple.",

  "training.menu.evolution.title": "Évolution",
  "training.menu.evolution.subtitle": "Accès direct aux stats Training X01",
  "training.menu.evolution.info":
    "Accède directement aux statistiques détaillées de tes sessions Training X01 dans l’onglet Stats.",

  "training.menu.comingSoon": "En développement",
  "training.menu.info.close": "Fermer",

  // --- LANGUAGES ---
  "lang.fr": "Français",
  "lang.en": "Anglais",
  "lang.es": "Espagnol",
  "lang.de": "Allemand",
  "lang.it": "Italien",
  "lang.pt": "Portugais",
  "lang.nl": "Néerlandais",
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
  "games.shanghai.subtitle": "Target of the round, S-D-T = Shanghai to win.",
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
  "training.menu.subtitle": "Improve your progression with different training modes.",

  "training.menu.x01.title": "Training X01",
  "training.menu.x01.subtitle": "Work on scoring and finishes",
  "training.menu.x01.info":
    "X01 training focused on progression: scoring, consistency, finishes and detailed stats.",

  "training.menu.clock.title": "Clock Training",
  "training.menu.clock.subtitle": "Single / Double / Triple",
  "training.menu.clock.info":
    "Hit every segment from 1 to 20 then Bull, in single, double or triple mode.",

  "training.menu.evolution.title": "Evolution",
  "training.menu.evolution.subtitle": "Direct access to Training X01 stats",
  "training.menu.evolution.info":
    "Jump directly to the detailed statistics of your Training X01 sessions in the Stats tab.",

  "training.menu.comingSoon": "In development",
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

  "settings.theme.gold.label": "NÉON DORADO",
  "settings.theme.gold.desc": "Tema dorado premium",

  "settings.theme.pink.label": "ROSA FLUO",
  "settings.theme.pink.desc": "Ambiente arcade rosado",

  "settings.theme.petrol.label": "AZUL PETRÓLEO",
  "settings.theme.petrol.desc": "Azul neón profundo",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "Estilo claro para entrenamiento",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "Violeta / magenta intenso",

  "settings.theme.red.label": "ROJO VIVO",
  "settings.theme.red.desc": "Rojo arcade agresivo",

  "settings.theme.orange.label": "NARANJA FUEGO",
  "settings.theme.orange.desc": "Naranja cálido y energético",

  "settings.theme.white.label": "BLANCO NIEVE",
  "settings.theme.white.desc": "Interfaz clara moderna",

  // --- HOME ---
  "home.greeting": "Bienvenido",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "INICIAR SESIÓN",

  "home.card.profiles.title": "PERFILES",
  "home.card.profiles.subtitle": "Crear y gestionar perfiles",

  "home.card.local.title": "JUEGO LOCAL",
  "home.card.local.subtitle": "Accede a todos los modos de juego",

  "home.card.online.title": "JUEGO EN LÍNEA",
  "home.card.online.subtitle": "Partidas remotas (próximamente)",

  "home.card.stats.title": "ESTADÍSTICAS",
  "home.card.stats.subtitle": "Estadísticas e historial",

  "home.seeStats": "Ver mis estadísticas",

  "home.stats.avg3": "Prom/3",
  "home.stats.best": "Mejor",
  "home.stats.co": "CO",
  "home.stats.winPct": "% Victorias",

  // STATUS
  "status.online": "En línea",
  "status.away": "Ausente",
  "status.offline": "Desconectado",

  // --- GAMES PAGE ---
  "games.title": "TODOS LOS JUEGOS",
  "games.subtitle": "Selecciona un modo de juego",

  "games.training.title": "TRAINING",
  "games.training.subtitle": "Mejora tu progresión.",
  "games.training.infoTitle": "Training",
  "games.training.infoBody":
    "Modo de entrenamiento para trabajar la consistencia, el scoring y los cierres.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "Partidas clásicas de 301/501/701/901 con estadísticas, historial y opciones avanzadas.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "Cierra 15–20 + Bull.",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "Cierra los números del 15 al 20 y el Bull antes que tu oponente, puntuando lo máximo posible.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "Golpea tu número… conviértete en Killer.",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "Cada jugador tiene un número. Conviértete en Killer golpeando el tuyo y elimina a los demás jugadores.",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "Objetivo del turno, S-D-T = Shanghai.",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "Cada ronda tiene un objetivo diferente. Golpea simple, doble y triple en la misma visita para lograr un Shanghai.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "Modo divertido — eliminaciones.",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "Modo multijugador divertido con eliminaciones sucesivas. Gana el último jugador en pie.",

  "games.status.comingSoon": "Próximamente",
  "games.info.close": "Cerrar",

  // --- TRAINING MENU ---
  "training.menu.title": "TRAINING",
  "training.menu.subtitle": "Mejora tu progresión en distintos modos de entrenamiento.",

  "training.menu.x01.title": "Training X01",
  "training.menu.x01.subtitle": "Trabaja tu scoring y tus cierres",
  "training.menu.x01.info":
    "Entrenamiento X01 centrado en la progresión: scoring, consistencia, cierres y estadísticas detalladas.",

  "training.menu.clock.title": "Ronda del Reloj",
  "training.menu.clock.subtitle": "Simple / Doble / Triple",
  "training.menu.clock.info":
    "Golpea todos los segmentos del 1 al 20 y el Bull, en modo simple, doble o triple.",

  "training.menu.evolution.title": "Evolución",
  "training.menu.evolution.subtitle": "Acceso directo a las stats Training X01",
  "training.menu.evolution.info":
    "Accede directamente a las estadísticas detalladas de tus sesiones Training X01 en la pestaña Stats.",

  "training.menu.comingSoon": "En desarrollo",
  "training.menu.info.close": "Cerrar",

  // --- LANGUAGES ---
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
  "settings.subtitle": "Passe das Design und die Sprache der App an",
  "settings.theme": "Design",
  "settings.lang": "Sprache",

  // THEMES (PREMIUM – MAJUSKELN)
  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "Edles goldenes Premium-Design",

  "settings.theme.pink.label": "PINK FLUO",
  "settings.theme.pink.desc": "Arcade-Pink Atmosphäre",

  "settings.theme.petrol.label": "PETROLBLAU",
  "settings.theme.petrol.desc": "Tiefes Neonblau",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "Helles Training-Design",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "Intensives Violett / Magenta",

  "settings.theme.red.label": "KRÄFTIGES ROT",
  "settings.theme.red.desc": "Aggressives Arcade-Rot",

  "settings.theme.orange.label": "FEUERORANGE",
  "settings.theme.orange.desc": "Warm und energiegeladen",

  "settings.theme.white.label": "SCHNEEWEISS",
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
  "home.card.stats.subtitle": "Statistiken & Spielverlauf",

  "home.seeStats": "Meine Statistiken ansehen",

  "home.stats.avg3": "Schnitt/3",
  "home.stats.best": "Best",
  "home.stats.co": "CO",
  "home.stats.winPct": "Win%",

  // STATUS
  "status.online": "Online",
  "status.away": "Abwesend",
  "status.offline": "Offline",

  // --- PROFILES ---
  "profiles.title": "PROFILE",
  "profiles.create": "Profil erstellen",
  "profiles.edit": "Profil bearbeiten",
  "profiles.delete": "Profil löschen",

  "profiles.confirmDeleteTitle": "Profil löschen?",
  "profiles.confirmDeleteBody":
    "Dieses Profil und alle dazugehörigen Statistiken werden dauerhaft gelöscht.",
  "profiles.confirmDeleteYes": "Löschen",
  "profiles.confirmDeleteNo": "Abbrechen",

  "profiles.name": "Name",
  "profiles.avatar": "Avatar",
  "profiles.stats": "Statistiken",
  "profiles.noProfiles": "Noch keine Profile vorhanden.",
  "profiles.pickOne": "Wähle ein Profil",
  "profiles.active": "Aktives Profil",

  // --- GAMES ---
  "games.title": "ALLE SPIELE",
  "games.subtitle": "Wähle einen Spielmodus",

  "games.training.title": "TRAINING",
  "games.training.subtitle": "Verbessere deine Leistung.",
  "games.training.infoTitle": "Training",
  "games.training.infoBody":
    "Trainingsmodus zur Verbesserung von Konstanz, Scoring und Checkouts.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "Klassische X01-Spiele mit Statistiken, Verlauf und mehreren Regeloptionen.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "Schließe 15–20 + Bull.",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "Schließe die Felder 15 bis 20 und Bull vor deinem Gegner und sammle Punkte.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "Triff deine Zahl… werde Killer.",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "Jeder Spieler erhält eine Zahl. Triff deine doppelt, um Killer zu werden, und eliminiere dann die anderen.",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "Rundenwert, E-D-T = Shanghai.",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "Jede Runde hat einen neuen Zielwert. Einfach + Doppel + Triple auf derselben Zahl ergibt ein Shanghai.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "Multiplayer-Spaß — Eliminierungen.",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "Mehrspieler-Modus mit fortlaufenden Eliminierungen. Der letzte Spieler gewinnt.",

  "games.status.comingSoon": "Kommt bald",
  "games.info.close": "Schließen",

  // --- TRAINING MENU ---
  "training.menu.title": "TRAINING",
  "training.menu.subtitle": "Wähle eine Trainingsart",

  "training.menu.x01.title": "Training X01",
  "training.menu.x01.subtitle": "Verbessere Scoring & Checkouts",
  "training.menu.x01.info":
    "X01-Training zur Verbesserung von Konstanz, Scoring, Checkouts und fortgeschrittenen Statistiken.",

  "training.menu.clock.title": "Around the Clock",
  "training.menu.clock.subtitle": "Einfach / Doppel / Triple",
  "training.menu.clock.info":
    "Triff die Zahlen 1–20 und Bull. Wähle Einfach, Doppel oder Triple.",

  "training.menu.evolution.title": "Evolution",
  "training.menu.evolution.subtitle": "Kommt bald",
  "training.menu.evolution.info":
    "Ein neuer Trainingsmodus wird bald verfügbar sein.",

  "training.menu.comingSoon": "Kommt bald",
  "training.menu.info.close": "Schließen",

  // --- LANGUAGE NAMES ---
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

 // ---------- ITALIANO ----------
it: {
  // --- NAV ---
  "nav.home": "Home",
  "nav.games": "Giochi",
  "nav.profiles": "Profili",
  "nav.friends": "Amici",
  "nav.stats": "Statistiche",
  "nav.settings": "Impostazioni",

  // --- SETTINGS ---
  "settings.back": "Indietro",
  "settings.title": "Impostazioni",
  "settings.subtitle": "Personalizza il tema e la lingua dell'app",
  "settings.theme": "Tema",
  "settings.lang": "Lingua",

  // THÈMES (VERSION PREMIUM MAJUSCULE)
  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "Tema dorato premium",

  "settings.theme.pink.label": "ROSA FLUO",
  "settings.theme.pink.desc": "Atmosfera arcade rosa",

  "settings.theme.petrol.label": "BLU PETROLIO",
  "settings.theme.petrol.desc": "Blu neon profondo",

  "settings.theme.green.label": "VEGETALE",
  "settings.theme.green.desc": "Stile pratica luminoso",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "Violetto / magenta intenso",

  "settings.theme.red.label": "ROSSO VIVO",
  "settings.theme.red.desc": "Rosso arcade aggressivo",

  "settings.theme.orange.label": "ARANCIO FUOCO",
  "settings.theme.orange.desc": "Arancione caldo ed energico",

  "settings.theme.white.label": "BIANCO NEVE",
  "settings.theme.white.desc": "Sfondo moderno e chiaro",

  // --- HOME ---
  "home.greeting": "Benvenuto",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "ACCEDI",

  "home.card.profiles.title": "PROFILI",
  "home.card.profiles.subtitle": "Crea e gestisci i profili",

  "home.card.local.title": "GIOCO LOCALE",
  "home.card.local.subtitle": "Accedi a tutte le modalità di gioco",

  "home.card.online.title": "GIOCO ONLINE",
  "home.card.online.subtitle": "Partite a distanza (in arrivo)",

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

  // --- PROFILES ---
  "profiles.title": "PROFILI",
  "profiles.create": "Crea profilo",
  "profiles.edit": "Modifica profilo",
  "profiles.delete": "Elimina profilo",

  "profiles.confirmDeleteTitle": "Eliminare il profilo?",
  "profiles.confirmDeleteBody":
    "Questo profilo e tutte le sue statistiche verranno eliminati definitivamente.",
  "profiles.confirmDeleteYes": "Elimina",
  "profiles.confirmDeleteNo": "Annulla",

  "profiles.name": "Nome",
  "profiles.avatar": "Avatar",
  "profiles.stats": "Statistiche",
  "profiles.noProfiles": "Nessun profilo disponibile.",
  "profiles.pickOne": "Seleziona un profilo",
  "profiles.active": "Profilo attivo",

  // --- GAMES ---
  "games.title": "TUTTI I GIOCHI",
  "games.subtitle": "Seleziona una modalità di gioco",

  "games.training.title": "TRAINING",
  "games.training.subtitle": "Migliora la tua progressione.",
  "games.training.infoTitle": "Training",
  "games.training.infoBody":
    "Modalità di allenamento per migliorare costanza, punteggio e chiusure.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "Classici giochi X01 con statistiche, cronologia e varie opzioni di regole.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "Chiudi 15–20 + Bull.",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "Chiudi i numeri 15–20 e Bull prima dell'avversario e accumula più punti.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "Raddoppia il tuo numero… diventa Killer.",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "Ogni giocatore ha un numero. Raddoppia il tuo per diventare Killer ed elimina gli altri giocatori.",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle":
    "Numero del turno, S-D-T = Shanghai.",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "Ogni turno ha un bersaglio diverso. Semplice + doppio + triplo sullo stesso numero = Shanghai.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "Modalità divertente — eliminazioni.",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "Modalità multiplayer con eliminazioni successive. Vince l'ultimo giocatore rimasto.",

  "games.status.comingSoon": "In arrivo",
  "games.info.close": "Chiudi",

  // --- TRAINING MENU ---
  "training.menu.title": "TRAINING",
  "training.menu.subtitle": "Scegli una modalità di allenamento",

  "training.menu.x01.title": "Training X01",
  "training.menu.x01.subtitle": "Migliora punteggio e chiusure",
  "training.menu.x01.info":
    "Training X01 dedicato alla progressione: costanza, scoring, chiusure, statistiche avanzate.",

  "training.menu.clock.title": "Giro dell’Orologio",
  "training.menu.clock.subtitle": "Semplice / Doppio / Triplo",
  "training.menu.clock.info":
    "Colpisci i numeri da 1 a 20 e il Bull. Scegli Semplice, Doppio o Triplo.",

  "training.menu.evolution.title": "Evoluzione",
  "training.menu.evolution.subtitle": "In arrivo",
  "training.menu.evolution.info":
    "Una nuova modalità di training sarà disponibile presto.",

  "training.menu.comingSoon": "In arrivo",
  "training.menu.info.close": "Chiudi",

  // --- LANGUAGE NAMES ---
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
  // --- NAV ---
  "nav.home": "Início",
  "nav.games": "Jogos",
  "nav.profiles": "Perfis",
  "nav.friends": "Amigos",
  "nav.stats": "Estatísticas",
  "nav.settings": "Configurações",

  // --- SETTINGS ---
  "settings.back": "Voltar",
  "settings.title": "Configurações",
  "settings.subtitle": "Personalize o tema e o idioma da aplicação",
  "settings.theme": "Tema",
  "settings.lang": "Idioma",

  // THÈMES (VERSÃO PREMIUM EM MAIÚSCULAS)
  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "Tema dourado premium",

  "settings.theme.pink.label": "ROSA FLUO",
  "settings.theme.pink.desc": "Ambiente arcade rosa",

  "settings.theme.petrol.label": "AZUL PETRÓLEO",
  "settings.theme.petrol.desc": "Azul neon profundo",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "Estilo de prática luminoso",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "Violeta / magenta intenso",

  "settings.theme.red.label": "VERMELHO VIVO",
  "settings.theme.red.desc": "Vermelho arcade agressivo",

  "settings.theme.orange.label": "LARANJA FOGO",
  "settings.theme.orange.desc": "Laranja quente e energético",

  "settings.theme.white.label": "BRANCO NEVE",
  "settings.theme.white.desc": "Fundo moderno e claro",

  // --- HOME ---
  "home.greeting": "Bem-vindo",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "ENTRAR",

  "home.card.profiles.title": "PERFIS",
  "home.card.profiles.subtitle": "Criar e gerir perfis",

  "home.card.local.title": "JOGO LOCAL",
  "home.card.local.subtitle": "Aceda a todos os modos de jogo",

  "home.card.online.title": "JOGO ONLINE",
  "home.card.online.subtitle": "Partidas remotas (em breve)",

  "home.card.stats.title": "ESTATÍSTICAS",
  "home.card.stats.subtitle": "Estatísticas e histórico",

  "home.seeStats": "Ver as minhas estatísticas",

  "home.stats.avg3": "Média/3",
  "home.stats.best": "Melhor",
  "home.stats.co": "CO",
  "home.stats.winPct": "Win%",

  // STATUS
  "status.online": "Online",
  "status.away": "Ausente",
  "status.offline": "Offline",

  // --- PROFILES ---
  "profiles.title": "PERFIS",
  "profiles.create": "Criar perfil",
  "profiles.edit": "Editar perfil",
  "profiles.delete": "Eliminar perfil",

  "profiles.confirmDeleteTitle": "Eliminar o perfil?",
  "profiles.confirmDeleteBody":
    "Este perfil e todas as estatísticas associadas serão eliminados permanentemente.",
  "profiles.confirmDeleteYes": "Eliminar",
  "profiles.confirmDeleteNo": "Cancelar",

  "profiles.name": "Nome",
  "profiles.avatar": "Avatar",
  "profiles.stats": "Estatísticas",
  "profiles.noProfiles": "Ainda não existem perfis.",
  "profiles.pickOne": "Selecione um perfil",
  "profiles.active": "Perfil ativo",

  // --- GAMES ---
  "games.title": "TODOS OS JOGOS",
  "games.subtitle": "Selecione um modo de jogo",

  "games.training.title": "TREINO",
  "games.training.subtitle": "Melhore a sua progressão.",
  "games.training.infoTitle": "Treino",
  "games.training.infoBody":
    "Modo de prática para melhorar consistência, pontuação e finalizações.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "Clássicos X01 com estatísticas, histórico e várias opções de regras.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "Feche 15–20 + Bull.",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "Feche os números 15 a 20 e o Bull antes do adversário, marcando o máximo de pontos.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "Duplique o seu número… torne-se Killer.",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "Cada jogador recebe um número. Duplique o seu para se tornar Killer e elimine os restantes.",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "Alvo da ronda, S-D-T = Shanghai.",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "Cada ronda tem um número-alvo. Simples + duplo + triplo no mesmo número = Shanghai.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "Modo divertido — eliminações.",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "Modo multijogador com eliminações sucessivas. O último jogador de pé vence.",

  "games.status.comingSoon": "Em breve",
  "games.info.close": "Fechar",

  // --- TRAINING MENU ---
  "training.menu.title": "TREINO",
  "training.menu.subtitle": "Escolha um modo de treino",

  "training.menu.x01.title": "Treino X01",
  "training.menu.x01.subtitle": "Melhore pontuação e finalizações",
  "training.menu.x01.info":
    "Treino X01 focado na progressão: consistência, pontuação, finalizações e estatísticas avançadas.",

  "training.menu.clock.title": "Volta ao Relógio",
  "training.menu.clock.subtitle": "Simples / Duplo / Triplo",
  "training.menu.clock.info":
    "Acerte de 1 a 20 e Bull. Escolha modo Simples, Duplo ou Triplo.",

  "training.menu.evolution.title": "Evolução",
  "training.menu.evolution.subtitle": "Em breve",
  "training.menu.evolution.info":
    "Um novo modo de treino estará disponível em breve.",

  "training.menu.comingSoon": "Em breve",
  "training.menu.info.close": "Fechar",

  // --- LANGUAGE NAMES ---
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
  // --- NAV ---
  "nav.home": "Start",
  "nav.games": "Spellen",
  "nav.profiles": "Profielen",
  "nav.friends": "Vrienden",
  "nav.stats": "Statistieken",
  "nav.settings": "Instellingen",

  // --- SETTINGS ---
  "settings.back": "Terug",
  "settings.title": "Instellingen",
  "settings.subtitle": "Pas het thema en de taal van de app aan",
  "settings.theme": "Thema",
  "settings.lang": "Taal",

  // THEMES (PREMIUM – CAPS)
  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "Premium goudkleurig thema",

  "settings.theme.pink.label": "ROZE FLUO",
  "settings.theme.pink.desc": "Arcade-achtige roze sfeer",

  "settings.theme.petrol.label": "PETROLBLAUW",
  "settings.theme.petrol.desc": "Diep neonblauw",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "Helder trainings-thema",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "Intens magenta/violet",

  "settings.theme.red.label": "FEL ROOD",
  "settings.theme.red.desc": "Fel arcade-rood",

  "settings.theme.orange.label": "VUURORANJE",
  "settings.theme.orange.desc": "Warme en energieke oranje tint",

  "settings.theme.white.label": "SNEEUWWIT",
  "settings.theme.white.desc": "Modern licht thema",

  // --- HOME ---
  "home.greeting": "Welkom",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "INLOGGEN",

  "home.card.profiles.title": "PROFIELEN",
  "home.card.profiles.subtitle": "Profielen aanmaken en beheren",

  "home.card.local.title": "LOKAAL SPEL",
  "home.card.local.subtitle": "Toegang tot alle spelmodi",

  "home.card.online.title": "ONLINE SPEL",
  "home.card.online.subtitle": "Online partijen (binnenkort)",

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

  // --- PROFILES ---
  "profiles.title": "PROFIELEN",
  "profiles.create": "Profiel aanmaken",
  "profiles.edit": "Profiel bewerken",
  "profiles.delete": "Profiel verwijderen",

  "profiles.confirmDeleteTitle": "Profiel verwijderen?",
  "profiles.confirmDeleteBody":
    "Dit profiel en alle bijbehorende statistieken worden definitief verwijderd.",
  "profiles.confirmDeleteYes": "Verwijderen",
  "profiles.confirmDeleteNo": "Annuleren",

  "profiles.name": "Naam",
  "profiles.avatar": "Avatar",
  "profiles.stats": "Statistieken",
  "profiles.noProfiles": "Nog geen profielen.",
  "profiles.pickOne": "Kies een profiel",
  "profiles.active": "Actief profiel",

  // --- GAMES ---
  "games.title": "ALLE SPELLEN",
  "games.subtitle": "Kies een spelmodus",

  "games.training.title": "TRAINING",
  "games.training.subtitle": "Verbeter je vooruitgang.",
  "games.training.infoTitle": "Training",
  "games.training.infoBody":
    "Trainingsmodus om constante scores, punten en finishes te verbeteren.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "Klassieke X01-spellen met statistieken, geschiedenis en verschillende regelopties.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "Sluit 15–20 + Bull.",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "Sluit de nummers 15 t/m 20 en Bull eerder dan je tegenstander en scoor zoveel mogelijk punten.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "Raak je nummer… word Killer.",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "Elke speler heeft een nummer. Raak jouw nummer om Killer te worden en elimineer de andere spelers.",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "Rondedoel, S-D-T = Shanghai.",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "Elke ronde heeft een andere waarde als doel. Enkel + dubbel + triple op hetzelfde getal = Shanghai.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "Leuke multiplayer — eliminaties.",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "Multiplayer-modus met opeenvolgende eliminaties. De laatste overblijvende speler wint.",

  "games.status.comingSoon": "Binnenkort beschikbaar",
  "games.info.close": "Sluiten",

  // --- TRAINING MENU ---
  "training.menu.title": "TRAINING",
  "training.menu.subtitle": "Kies een trainingsmodus",

  "training.menu.x01.title": "Training X01",
  "training.menu.x01.subtitle": "Verbeter scoring en finishes",
  "training.menu.x01.info":
    "X01-training gericht op progressie: consistentie, scoring, finishes en geavanceerde statistieken.",

  "training.menu.clock.title": "Rondje om de Klok",
  "training.menu.clock.subtitle": "Single / Double / Triple",
  "training.menu.clock.info":
    "Raak de nummers 1 t/m 20 en Bull. Kies Single, Double of Triple.",

  "training.menu.evolution.title": "Evolutie",
  "training.menu.evolution.subtitle": "Binnenkort",
  "training.menu.evolution.info":
    "Een nieuwe trainingsmodus wordt binnenkort beschikbaar.",

  "training.menu.comingSoon": "Binnenkort",
  "training.menu.info.close": "Sluiten",

  // --- LANGUAGE NAMES ---
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
  "lang.at": "Oostenrijks",
  "lang.sr": "Servisch",
  "lang.hr": "Kroatisch",
  "lang.cs": "Tsjechisch",
},

  // ---------- РУССКИЙ ----------
ru: {
  // --- NAV ---
  "nav.home": "Главная",
  "nav.games": "Игры",
  "nav.profiles": "Профили",
  "nav.friends": "Друзья",
  "nav.stats": "Статистика",
  "nav.settings": "Настройки",

  // --- SETTINGS ---
  "settings.back": "Назад",
  "settings.title": "Настройки",
  "settings.subtitle": "Настройте тему и язык приложения",
  "settings.theme": "Тема",
  "settings.lang": "Язык",

  // THEMES (PREMIUM – CAPS)
  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "Премиальная золотая тема",

  "settings.theme.pink.label": "ROSE FLUO",
  "settings.theme.pink.desc": "Розовая аркадная атмосфера",

  "settings.theme.petrol.label": "PETROL BLUE",
  "settings.theme.petrol.desc": "Глубокий неоновый синий",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "Яркая тренировочная тема",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "Насыщенный фиолетовый/магентовый цвет",

  "settings.theme.red.label": "BRIGHT RED",
  "settings.theme.red.desc": "Агрессивный аркадный красный",

  "settings.theme.orange.label": "FIRE ORANGE",
  "settings.theme.orange.desc": "Тёплый и энергичный оранжевый",

  "settings.theme.white.label": "SNOW WHITE",
  "settings.theme.white.desc": "Современный светлый фон",

  // --- HOME ---
  "home.greeting": "Добро пожаловать",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "ВОЙТИ",

  "home.card.profiles.title": "ПРОФИЛИ",
  "home.card.profiles.subtitle": "Создание и управление профилями",

  "home.card.local.title": "ЛОКАЛЬНАЯ ИГРА",
  "home.card.local.subtitle": "Доступ ко всем игровым режимам",

  "home.card.online.title": "ОНЛАЙН-ИГРА",
  "home.card.online.subtitle": "Игры на расстоянии (скоро)",

  "home.card.stats.title": "СТАТИСТИКА",
  "home.card.stats.subtitle": "Статистика и история",

  "home.seeStats": "Посмотреть мою статистику",

  "home.stats.avg3": "Сред/3",
  "home.stats.best": "Лучший",
  "home.stats.co": "CO",
  "home.stats.winPct": "Win%",

  // STATUS
  "status.online": "Онлайн",
  "status.away": "Нет на месте",
  "status.offline": "Офлайн",

  // --- PROFILES ---
  "profiles.title": "ПРОФИЛИ",
  "profiles.create": "Создать профиль",
  "profiles.edit": "Редактировать профиль",
  "profiles.delete": "Удалить профиль",

  "profiles.confirmDeleteTitle": "Удалить профиль?",
  "profiles.confirmDeleteBody":
    "Этот профиль и вся связанная с ним статистика будут безвозвратно удалены.",
  "profiles.confirmDeleteYes": "Удалить",
  "profiles.confirmDeleteNo": "Отмена",

  "profiles.name": "Имя",
  "profiles.avatar": "Аватар",
  "profiles.stats": "Статистика",
  "profiles.noProfiles": "Пока нет ни одного профиля.",
  "profiles.pickOne": "Выберите профиль",
  "profiles.active": "Активный профиль",

  // --- GAMES ---
  "games.title": "ВСЕ ИГРЫ",
  "games.subtitle": "Выберите игровой режим",

  "games.training.title": "ТРЕНИРОВКА",
  "games.training.subtitle": "Улучшайте свои результаты.",
  "games.training.infoTitle": "Тренировка",
  "games.training.infoBody":
    "Режим тренировки для развития стабильности, набора очков и завершения легов.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "Классические игры X01 со статистикой, историей и гибкими настройками правил.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "Закрой 15–20 + Bull.",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "Закройте номера 15–20 и Bull раньше соперника, набирая как можно больше очков.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "Попади в свой номер… стань Killer.",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "У каждого игрока есть свой номер. Попадите по нему, чтобы стать Killer, а затем выбивайте других игроков.",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle":
    "Цель раунда, S-D-T = Shanghai.",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "В каждом раунде своя целевая цифра. Попадите в Single + Double + Triple по одному и тому же номеру, чтобы сделать Shanghai.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "Весёлый режим — выбывание.",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "Многопользовательский режим с последовательным выбыванием. Побеждает последний оставшийся игрок.",

  "games.status.comingSoon": "Скоро",
  "games.info.close": "Закрыть",

  // --- TRAINING MENU ---
  "training.menu.title": "ТРЕНИРОВКА",
  "training.menu.subtitle": "Выберите режим тренировки",

  "training.menu.x01.title": "Тренировка X01",
  "training.menu.x01.subtitle": "Улучшайте набор очков и завершения",
  "training.menu.x01.info":
    "Специальный тренировочный режим X01: стабильность, набор очков, завершения и расширенная статистика.",

  "training.menu.clock.title": "Around the Clock",
  "training.menu.clock.subtitle": "Single / Double / Triple",
  "training.menu.clock.info":
    "Попадайте по номерам с 1 по 20 и Bull. Выберите режим Single, Double или Triple.",

  "training.menu.evolution.title": "Эволюция",
  "training.menu.evolution.subtitle": "Скоро",
  "training.menu.evolution.info":
    "Новый тренировочный режим станет доступен в ближайшее время.",

  "training.menu.comingSoon": "Скоро",
  "training.menu.info.close": "Закрыть",

  // --- LANGUAGE NAMES ---
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
  "lang.at": "Австрийский",
  "lang.sr": "Сербский",
  "lang.hr": "Хорватский",
  "lang.cs": "Чешский",
},

  // ---------- 中文（简体） ----------
zh: {
  // --- NAV ---
  "nav.home": "首页",
  "nav.games": "游戏",
  "nav.profiles": "档案",
  "nav.friends": "好友",
  "nav.stats": "统计",
  "nav.settings": "设置",

  // --- SETTINGS ---
  "settings.back": "返回",
  "settings.title": "设置",
  "settings.subtitle": "自定义应用的主题和语言",
  "settings.theme": "主题",
  "settings.lang": "语言",

  // THEMES (PREMIUM – CAPS 保持品牌感)
  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "高档金色霓虹主题",

  "settings.theme.pink.label": "ROSE FLUO",
  "settings.theme.pink.desc": "粉色街机风格氛围",

  "settings.theme.petrol.label": "PETROL BLUE",
  "settings.theme.petrol.desc": "深邃霓虹蓝色",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "明亮训练风格主题",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "浓郁洋红 / 紫色",

  "settings.theme.red.label": "BRIGHT RED",
  "settings.theme.red.desc": "强烈街机红色",

  "settings.theme.orange.label": "FIRE ORANGE",
  "settings.theme.orange.desc": "温暖而充满活力的橙色",

  "settings.theme.white.label": "SNOW WHITE",
  "settings.theme.white.desc": "现代浅色背景",

  // --- HOME ---
  "home.greeting": "欢迎",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "登录",

  "home.card.profiles.title": "档案",
  "home.card.profiles.subtitle": "创建并管理玩家档案",

  "home.card.local.title": "本地对战",
  "home.card.local.subtitle": "访问所有游戏模式",

  "home.card.online.title": "在线对战",
  "home.card.online.subtitle": "远程比赛（即将推出）",

  "home.card.stats.title": "统计",
  "home.card.stats.subtitle": "数据统计与历史记录",

  "home.seeStats": "查看我的统计数据",

  "home.stats.avg3": "三镖均分",
  "home.stats.best": "最高分",
  "home.stats.co": "CO",
  "home.stats.winPct": "胜率",

  // STATUS
  "status.online": "在线",
  "status.away": "暂离",
  "status.offline": "离线",

  // --- PROFILES ---
  "profiles.title": "档案",
  "profiles.create": "创建档案",
  "profiles.edit": "编辑档案",
  "profiles.delete": "删除档案",

  "profiles.confirmDeleteTitle": "删除该档案？",
  "profiles.confirmDeleteBody":
    "此档案及其所有统计数据将被永久删除。",
  "profiles.confirmDeleteYes": "删除",
  "profiles.confirmDeleteNo": "取消",

  "profiles.name": "名称",
  "profiles.avatar": "头像",
  "profiles.stats": "统计数据",
  "profiles.noProfiles": "尚未创建任何档案。",
  "profiles.pickOne": "选择一个档案",
  "profiles.active": "当前档案",

  // --- GAMES ---
  "games.title": "所有游戏",
  "games.subtitle": "请选择一种游戏模式",

  "games.training.title": "训练",
  "games.training.subtitle": "提升你的水平。",
  "games.training.infoTitle": "训练",
  "games.training.infoBody":
    "训练模式，用于提升稳定性、得分能力和收镖能力。",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901。",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "经典 X01 模式，带有统计数据、历史记录和多种规则选项。",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "关闭 15–20 + Bull。",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "在对手之前关闭 15–20 与 Bull 区域，同时尽可能多地得分。",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "命中你的号码… 成为 Killer。",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "每位玩家都有一个号码。命中自己的号码成为 Killer，然后淘汰其他玩家。",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "本轮目标，单/双/三 = Shanghai。",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "每一轮都有不同目标数字。在同一数字上命中单倍、双倍与三倍即为 Shanghai。",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "多人欢乐模式 — 淘汰制。",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "多人淘汰模式，最后留下的玩家获胜。",

  "games.status.comingSoon": "即将推出",
  "games.info.close": "关闭",

  // --- TRAINING MENU ---
  "training.menu.title": "训练",
  "training.menu.subtitle": "选择一种训练模式",

  "training.menu.x01.title": "X01 训练",
  "training.menu.x01.subtitle": "提升得分与收镖",
  "training.menu.x01.info":
    "专注 X01 的训练模式：稳定性、得分、收镖和高级统计。",

  "training.menu.clock.title": "顺时针训练",
  "training.menu.clock.subtitle": "单倍 / 双倍 / 三倍",
  "training.menu.clock.info":
    "依次命中 1–20 与 Bull。可选择单倍、双倍或三倍模式。",

  "training.menu.evolution.title": "进阶训练",
  "training.menu.evolution.subtitle": "即将推出",
  "training.menu.evolution.info":
    "全新的训练模式即将上线。",

  "training.menu.comingSoon": "即将推出",
  "training.menu.info.close": "关闭",

  // --- LANGUAGE NAMES ---
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
  "lang.at": "奥地利语",
  "lang.sr": "塞尔维亚语",
  "lang.hr": "克罗地亚语",
  "lang.cs": "捷克语",
},

 // ---------- 日本語 ----------
ja: {
  // --- NAV ---
  "nav.home": "ホーム",
  "nav.games": "ゲーム",
  "nav.profiles": "プロフィール",
  "nav.friends": "フレンド",
  "nav.stats": "統計",
  "nav.settings": "設定",

  // --- SETTINGS ---
  "settings.back": "戻る",
  "settings.title": "設定",
  "settings.subtitle": "アプリのテーマと言語をカスタマイズ",
  "settings.theme": "テーマ",
  "settings.lang": "言語",

  // THEMES (PREMIUM – 全て大文字維持)
  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "プレミアムなゴールドテーマ",

  "settings.theme.pink.label": "ROSE FLUO",
  "settings.theme.pink.desc": "アーケード風ピンク",

  "settings.theme.petrol.label": "PETROL BLUE",
  "settings.theme.petrol.desc": "深いネオンブルー",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "明るいトレーニングスタイル",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "濃いマゼンタ／バイオレット",

  "settings.theme.red.label": "BRIGHT RED",
  "settings.theme.red.desc": "攻撃的なアーケードレッド",

  "settings.theme.orange.label": "FIRE ORANGE",
  "settings.theme.orange.desc": "暖かくエネルギッシュなオレンジ",

  "settings.theme.white.label": "SNOW WHITE",
  "settings.theme.white.desc": "モダンで明るい背景",

  // --- HOME ---
  "home.greeting": "ようこそ",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "ログイン",

  "home.card.profiles.title": "プロフィール",
  "home.card.profiles.subtitle": "プロフィールの作成と管理",

  "home.card.local.title": "ローカルプレイ",
  "home.card.local.subtitle": "すべてのモードにアクセス",

  "home.card.online.title": "オンラインプレイ",
  "home.card.online.subtitle": "遠隔対戦（近日公開）",

  "home.card.stats.title": "統計",
  "home.card.stats.subtitle": "統計と履歴",

  "home.seeStats": "統計を見る",

  "home.stats.avg3": "平均/3",
  "home.stats.best": "ベスト",
  "home.stats.co": "CO",
  "home.stats.winPct": "勝率",

  // STATUS
  "status.online": "オンライン",
  "status.away": "退席中",
  "status.offline": "オフライン",

  // --- PROFILES ---
  "profiles.title": "プロフィール",
  "profiles.create": "プロフィール作成",
  "profiles.edit": "プロフィール編集",
  "profiles.delete": "プロフィール削除",

  "profiles.confirmDeleteTitle": "プロフィールを削除しますか？",
  "profiles.confirmDeleteBody":
    "このプロフィールと関連するすべての統計が完全に削除されます。",
  "profiles.confirmDeleteYes": "削除",
  "profiles.confirmDeleteNo": "キャンセル",

  "profiles.name": "名前",
  "profiles.avatar": "アバター",
  "profiles.stats": "統計",
  "profiles.noProfiles": "プロフィールがありません。",
  "profiles.pickOne": "プロフィールを選択",
  "profiles.active": "アクティブなプロフィール",

  // --- GAMES ---
  "games.title": "すべてのゲーム",
  "games.subtitle": "モードを選択してください",

  "games.training.title": "トレーニング",
  "games.training.subtitle": "上達しよう。",
  "games.training.infoTitle": "トレーニング",
  "games.training.infoBody":
    "安定性、スコアリング、フィニッシュ力を鍛えるモードです。",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901。",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "統計、履歴、ルール設定を備えたクラシックX01。",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "15〜20＋Bullを閉じる。",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "相手より先に15〜20とBullを閉じ、高得点を狙うゲーム。",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "自分の番号を当て…Killerへ。",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "自分の番号を当ててKillerとなり、相手を排除していくモードです。",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "今ラウンドのターゲット、S-D-T = Shanghai。",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "1つの数字にシングル・ダブル・トリプルを全て当てればShanghai。",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "楽しいマルチ — 脱落方式。",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "脱落形式のマルチプレイ。最後まで残ったプレイヤーが勝者。",

  "games.status.comingSoon": "近日公開",
  "games.info.close": "閉じる",

  // --- TRAINING MENU ---
  "training.menu.title": "トレーニング",
  "training.menu.subtitle": "トレーニングモードを選択",

  "training.menu.x01.title": "X01 トレーニング",
  "training.menu.x01.subtitle": "スコアとフィニッシュを強化",
  "training.menu.x01.info":
    "安定性、スコア、フィニッシュを高める進化型X01トレーニング。",

  "training.menu.clock.title": "アラウンド・ザ・クロック",
  "training.menu.clock.subtitle": "シングル / ダブル / トリプル",
  "training.menu.clock.info":
    "1〜20とBullを順番に狙うモード。",

  "training.menu.evolution.title": "エボリューション",
  "training.menu.evolution.subtitle": "近日公開",
  "training.menu.evolution.info":
    "新しいトレーニングモードが近日登場。",

  "training.menu.comingSoon": "近日公開",
  "training.menu.info.close": "閉じる",

  // --- LANG NAMES ---
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
  "lang.at": "オーストリア語",
  "lang.sr": "セルビア語",
  "lang.hr": "クロアチア語",
  "lang.cs": "チェコ語",
},

 // ---------- العربية ----------
ar: {
  // --- NAV ---
  "nav.home": "الرئيسية",
  "nav.games": "الألعاب",
  "nav.profiles": "الملفات",
  "nav.friends": "الأصدقاء",
  "nav.stats": "الإحصائيات",
  "nav.settings": "الإعدادات",

  // --- SETTINGS ---
  "settings.back": "رجوع",
  "settings.title": "الإعدادات",
  "settings.subtitle": "تخصيص المظهر واللغة",
  "settings.theme": "المظهر",
  "settings.lang": "اللغة",

  // THEMES (PREMIUM)
  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "مظهر ذهبي فاخر",

  "settings.theme.pink.label": "ROSE FLUO",
  "settings.theme.pink.desc": "أجواء آركيد وردية",

  "settings.theme.petrol.label": "PETROL BLUE",
  "settings.theme.petrol.desc": "أزرق نيون عميق",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "مظهر تدريب مشرق",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "أرجواني/ماجنتا قوي",

  "settings.theme.red.label": "BRIGHT RED",
  "settings.theme.red.desc": "أحمر آركيد قوي",

  "settings.theme.orange.label": "FIRE ORANGE",
  "settings.theme.orange.desc": "برتقالي دافئ وحيوي",

  "settings.theme.white.label": "SNOW WHITE",
  "settings.theme.white.desc": "خلفية حديثة فاتحة",

  // --- HOME ---
  "home.greeting": "مرحباً",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "تسجيل الدخول",

  "home.card.profiles.title": "الملفات",
  "home.card.profiles.subtitle": "إنشاء وإدارة الملفات",

  "home.card.local.title": "اللعب المحلي",
  "home.card.local.subtitle": "الوصول إلى جميع أنماط اللعب",

  "home.card.online.title": "اللعب عبر الإنترنت",
  "home.card.online.subtitle": "مباريات عن بُعد (قريباً)",

  "home.card.stats.title": "الإحصائيات",
  "home.card.stats.subtitle": "الإحصائيات والسجل",

  "home.seeStats": "عرض إحصائياتي",

  "home.stats.avg3": "متوسط/3",
  "home.stats.best": "أفضل نتيجة",
  "home.stats.co": "CO",
  "home.stats.winPct": "نسبة الفوز",

  // STATUS
  "status.online": "متصل",
  "status.away": "بعيد",
  "status.offline": "غير متصل",

  // --- PROFILES ---
  "profiles.title": "الملفات",
  "profiles.create": "إنشاء ملف",
  "profiles.edit": "تعديل الملف",
  "profiles.delete": "حذف الملف",

  "profiles.confirmDeleteTitle": "حذف الملف؟",
  "profiles.confirmDeleteBody":
    "سيتم حذف هذا الملف وجميع بياناته بشكل دائم.",
  "profiles.confirmDeleteYes": "حذف",
  "profiles.confirmDeleteNo": "إلغاء",

  "profiles.name": "الاسم",
  "profiles.avatar": "الصورة",
  "profiles.stats": "الإحصائيات",
  "profiles.noProfiles": "لا توجد ملفات بعد.",
  "profiles.pickOne": "اختر ملفاً",
  "profiles.active": "الملف النشط",

  // --- GAMES ---
  "games.title": "جميع الألعاب",
  "games.subtitle": "اختر نمط اللعب",

  "games.training.title": "التدريب",
  "games.training.subtitle": "طور مستواك.",
  "games.training.infoTitle": "التدريب",
  "games.training.infoBody":
    "وضع تدريب لتحسين الثبات، التسجيل، وإنهاء الجولات.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "ألعاب X01 الكلاسيكية مع إحصائيات وسجل وخيارات قواعد متعددة.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "إغلاق 15–20 + Bull.",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "أغلق الأرقام 15 إلى 20 مع Bull قبل خصمك وسجّل أكبر عدد ممكن من النقاط.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "أصب رقمك… وكن Killer.",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "لكل لاعب رقم. أصب رقمك لتصبح Killer ثم أخرج اللاعبين الآخرين.",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "هدف الجولة، S-D-T = Shanghai.",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "أصب الهدف في الفردي والمزدوج والثلاثي على نفس الرقم لتحقيق Shanghai.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "وضع ممتع — إقصاء.",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "وضع متعدد اللاعبين بإقصاء متتابع. آخر لاعب يفوز.",

  "games.status.comingSoon": "قريباً",
  "games.info.close": "إغلاق",

  // --- TRAINING MENU ---
  "training.menu.title": "التدريب",
  "training.menu.subtitle": "اختر وضع التدريب",

  "training.menu.x01.title": "تدريب X01",
  "training.menu.x01.subtitle": "طور التسجيل والإنهاء",
  "training.menu.x01.info":
    "تدريب X01 متقدم لتحسين الثبات والتسجيل والإنهاء.",

  "training.menu.clock.title": "Around the Clock",
  "training.menu.clock.subtitle": "Single / Double / Triple",
  "training.menu.clock.info":
    "أصب الأرقام من 1 إلى 20 وBull. اختر Single أو Double أو Triple.",

  "training.menu.evolution.title": "التطوير",
  "training.menu.evolution.subtitle": "قريباً",
  "training.menu.evolution.info":
    "وضع تدريب جديد قادم قريباً.",

  "training.menu.comingSoon": "قريباً",
  "training.menu.info.close": "إغلاق",

  // --- LANG NAMES ---
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
  "lang.at": "النمساوية",
  "lang.sr": "الصربية",
  "lang.hr": "الكرواتية",
  "lang.cs": "التشيكية",
},

 // ---------- हिन्दी ----------
hi: {
  // --- NAV ---
  "nav.home": "होम",
  "nav.games": "खेल",
  "nav.profiles": "प्रोफाइल",
  "nav.friends": "दोस्त",
  "nav.stats": "आँकड़े",
  "nav.settings": "सेटिंग्स",

  // --- SETTINGS ---
  "settings.back": "वापस",
  "settings.title": "सेटिंग्स",
  "settings.subtitle": "ऐप की थीम और भाषा को कस्टमाइज़ करें",
  "settings.theme": "थीम",
  "settings.lang": "भाषा",

  // THEMES (PREMIUM CAPS)
  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "प्रीमियम गोल्ड थीम",

  "settings.theme.pink.label": "ROSE FLUO",
  "settings.theme.pink.desc": "आर्केड पिंक माहौल",

  "settings.theme.petrol.label": "PETROL BLUE",
  "settings.theme.petrol.desc": "गहरा नीयॉन नीला",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "उज्ज्वल प्रैक्टिस स्टाइल",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "गहरा मैजेंटा / वायलेट",

  "settings.theme.red.label": "BRIGHT RED",
  "settings.theme.red.desc": "तेज़ आर्केड रेड",

  "settings.theme.orange.label": "FIRE ORANGE",
  "settings.theme.orange.desc": "गर्म और ऊर्जावान ऑरेंज",

  "settings.theme.white.label": "SNOW WHITE",
  "settings.theme.white.desc": "आधुनिक हल्का बैकग्राउंड",

  // --- HOME ---
  "home.greeting": "स्वागत है",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "लॉग इन करें",

  "home.card.profiles.title": "प्रोफाइल",
  "home.card.profiles.subtitle": "प्रोफाइल बनाएं और प्रबंधित करें",

  "home.card.local.title": "लोकल खेल",
  "home.card.local.subtitle": "सभी गेम मोड तक पहुँच",

  "home.card.online.title": "ऑनलाइन खेल",
  "home.card.online.subtitle": "दूरस्थ मैच (जल्द ही)",

  "home.card.stats.title": "आँकड़े",
  "home.card.stats.subtitle": "आँकड़े और इतिहास",

  "home.seeStats": "मेरे आँकड़े देखें",

  "home.stats.avg3": "औसत/3",
  "home.stats.best": "सर्वश्रेष्ठ",
  "home.stats.co": "CO",
  "home.stats.winPct": "जीत%",

  // STATUS
  "status.online": "ऑनलाइन",
  "status.away": "दूर",
  "status.offline": "ऑफलाइन",

  // --- PROFILES ---
  "profiles.title": "प्रोफाइल",
  "profiles.create": "प्रोफाइल बनाएँ",
  "profiles.edit": "प्रोफाइल संपादित करें",
  "profiles.delete": "प्रोफाइल हटाएँ",

  "profiles.confirmDeleteTitle": "प्रोफाइल हटाएँ?",
  "profiles.confirmDeleteBody":
    "यह प्रोफाइल और इससे जुड़े सभी आँकड़े स्थायी रूप से हट जाएंगे।",
  "profiles.confirmDeleteYes": "हटाएँ",
  "profiles.confirmDeleteNo": "रद्द करें",

  "profiles.name": "नाम",
  "profiles.avatar": "अवतार",
  "profiles.stats": "आँकड़े",
  "profiles.noProfiles": "अभी तक कोई प्रोफाइल नहीं।",
  "profiles.pickOne": "एक प्रोफाइल चुनें",
  "profiles.active": "सक्रिय प्रोफाइल",

  // --- GAMES ---
  "games.title": "सभी खेल",
  "games.subtitle": "एक गेम मोड चुनें",

  "games.training.title": "ट्रेनिंग",
  "games.training.subtitle": "अपनी प्रगति सुधारें।",
  "games.training.infoTitle": "Training",
  "games.training.infoBody":
    "नियमितता, स्कोरिंग और फिनिशिंग सुधारने के लिए ट्रेनिंग मोड।",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "क्लासिक X01 खेल, आँकड़ों, इतिहास और नियम विकल्पों के साथ।",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "15–20 + Bull बंद करें।",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "15 से 20 और Bull को प्रतिद्वंद्वी से पहले बंद करें और अधिक अंक प्राप्त करें।",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "अपना नंबर हिट करें… Killer बनें।",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "हर खिलाड़ी को एक नंबर मिलता है। अपना नंबर हिट करें ताकि Killer बनें और दूसरों को बाहर करें।",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "इस राउंड का लक्ष्य, S-D-T = Shanghai.",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "एक ही नंबर पर सिंगल, डबल और ट्रिपल हिट करने पर Shanghai मिलता है।",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "मज़ेदार मोड — एलिमिनेशन।",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "एलिमिनेशन आधारित मल्टीप्लेयर मोड। आखिरी खिलाड़ी विजेता होता है।",

  "games.status.comingSoon": "जल्द ही",
  "games.info.close": "बंद करें",

  // --- TRAINING MENU ---
  "training.menu.title": "ट्रेनिंग",
  "training.menu.subtitle": "एक ट्रेनिंग मोड चुनें",

  "training.menu.x01.title": "Training X01",
  "training.menu.x01.subtitle": "स्कोरिंग और फिनिशिंग सुधारें",
  "training.menu.x01.info":
    "X01 ट्रेनिंग: नियमितता, स्कोर, फिनिशिंग और उन्नत आँकड़े।",

  "training.menu.clock.title": "Around the Clock",
  "training.menu.clock.subtitle": "Single / Double / Triple",
  "training.menu.clock.info":
    "1 से 20 और Bull को क्रम से हिट करें।",

  "training.menu.evolution.title": "Evolution",
  "training.menu.evolution.subtitle": "जल्द ही",
  "training.menu.evolution.info":
    "एक नया ट्रेनिंग मोड जल्द ही उपलब्ध होगा।",

  "training.menu.comingSoon": "जल्द ही",
  "training.menu.info.close": "बंद करें",

  // --- LANGUAGE NAMES ---
  "lang.fr": "फ़्रेंच",
  "lang.en": "अंग्रेज़ी",
  "lang.es": "स्पेनिश",
  "lang.de": "जर्मन",
  "lang.it": "इतालवी",
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
  "lang.at": "ऑस्ट्रियन",
  "lang.sr": "सर्बियाई",
  "lang.hr": "क्रोएशियाई",
  "lang.cs": "चेक",
},

 // ---------- TÜRKÇE ----------
tr: {
  // --- NAV ---
  "nav.home": "Ana Sayfa",
  "nav.games": "Oyunlar",
  "nav.profiles": "Profiller",
  "nav.friends": "Arkadaşlar",
  "nav.stats": "İstatistikler",
  "nav.settings": "Ayarlar",

  // --- SETTINGS ---
  "settings.back": "Geri",
  "settings.title": "Ayarlar",
  "settings.subtitle": "Uygulama temasını ve dilini özelleştir",
  "settings.theme": "Tema",
  "settings.lang": "Dil",

  // THEMES (PREMIUM – tümü MAJUSCULES korunur)
  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "Premium altın neon tema",

  "settings.theme.pink.label": "ROSE FLUO",
  "settings.theme.pink.desc": "Pembe arcade atmosferi",

  "settings.theme.petrol.label": "PETROL BLUE",
  "settings.theme.petrol.desc": "Derin neon mavisi",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "Aydınlık antrenman stili",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "Yoğun mor / magenta",

  "settings.theme.red.label": "BRIGHT RED",
  "settings.theme.red.desc": "Agresif arcade kırmızısı",

  "settings.theme.orange.label": "FIRE ORANGE",
  "settings.theme.orange.desc": "Sıcak ve enerjik turuncu",

  "settings.theme.white.label": "SNOW WHITE",
  "settings.theme.white.desc": "Modern açık arka plan",

  // --- HOME ---
  "home.greeting": "Hoş geldin",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "GİRİŞ YAP",

  "home.card.profiles.title": "PROFİLLER",
  "home.card.profiles.subtitle": "Profil oluştur ve yönet",

  "home.card.local.title": "YEREL OYUN",
  "home.card.local.subtitle": "Tüm oyun modlarına eriş",

  "home.card.online.title": "ÇEVRİMİÇİ OYUN",
  "home.card.online.subtitle": "Uzaktan maçlar (yakında)",

  "home.card.stats.title": "İSTATİSTİKLER",
  "home.card.stats.subtitle": "İstatistikler ve geçmiş",

  "home.seeStats": "İstatistiklerimi görüntüle",

  "home.stats.avg3": "Ort/3",
  "home.stats.best": "En iyi",
  "home.stats.co": "CO",
  "home.stats.winPct": "Kazanma%",

  // STATUS
  "status.online": "Çevrimiçi",
  "status.away": "Uzakta",
  "status.offline": "Çevrimdışı",

  // --- PROFILES ---
  "profiles.title": "Profiller",
  "profiles.create": "Profil oluştur",
  "profiles.edit": "Profili düzenle",
  "profiles.delete": "Profili sil",

  "profiles.confirmDeleteTitle": "Profil silinsin mi?",
  "profiles.confirmDeleteBody":
    "Bu profil ve tüm istatistikler kalıcı olarak silinecek.",
  "profiles.confirmDeleteYes": "Sil",
  "profiles.confirmDeleteNo": "İptal",

  "profiles.name": "İsim",
  "profiles.avatar": "Avatar",
  "profiles.stats": "İstatistikler",
  "profiles.noProfiles": "Henüz profil yok.",
  "profiles.pickOne": "Bir profil seç",
  "profiles.active": "Aktif profil",

  // --- GAMES ---
  "games.title": "TÜM OYUNLAR",
  "games.subtitle": "Bir oyun modu seç",

  "games.training.title": "ANTRENMAN",
  "games.training.subtitle": "Gelişimini artır.",
  "games.training.infoTitle": "Antrenman",
  "games.training.infoBody":
    "Düzenlilik, skor ve bitiriş becerilerini geliştirmek için antrenman modu.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "Klasik 301/501/701/901 modları; istatistikler, geçmiş ve çeşitli kural seçenekleriyle.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "15–20 + Bull kapat.",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "Rakibinden önce 15–20 ve Bull’u kapatırken mümkün olduğunca çok puan topla.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "Numaranı vur… Killer ol.",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "Her oyuncunun bir numarası vardır. Kendi numaranı vur, Killer ol ve rakipleri ele.",
  
  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "Raund hedefi, S-D-T = Shanghai.",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "Aynı hedefte tek, çift ve üçlü vuruş yaparak Shanghai kazan.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "Eğlenceli mod — eleme sistemi.",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "Eleme tabanlı çok oyunculu mod. Ayakta kalan son oyuncu kazanır.",

  "games.status.comingSoon": "Yakında",
  "games.info.close": "Kapat",

  // --- TRAINING MENU ---
  "training.menu.title": "ANTRENMAN",
  "training.menu.subtitle": "Bir antrenman modu seç",

  "training.menu.x01.title": "Training X01",
  "training.menu.x01.subtitle": "Skor ve bitiriş gelişimi",
  "training.menu.x01.info":
    "Düzenlilik, skor ve bitiriş becerilerini geliştirmeye yönelik X01 antrenmanı.",

  "training.menu.clock.title": "Around the Clock",
  "training.menu.clock.subtitle": "Single / Double / Triple",
  "training.menu.clock.info":
    "1’den 20’ye ve Bull’a sırayla atış yap.",

  "training.menu.evolution.title": "Evrim",
  "training.menu.evolution.subtitle": "Yakında",
  "training.menu.evolution.info":
    "Yeni bir antrenman modu yakında geliyor.",

  "training.menu.comingSoon": "Yakında",
  "training.menu.info.close": "Kapat",

  // --- LANGUAGE NAMES ---
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
  "lang.at": "Avusturya Almancası",
  "lang.sr": "Sırpça",
  "lang.hr": "Hırvatça",
  "lang.cs": "Çekçe",
},

  // ---------- DANSK ----------
da: {
  // --- NAV ---
  "nav.home": "Hjem",
  "nav.games": "Spil",
  "nav.profiles": "Profiler",
  "nav.friends": "Venner",
  "nav.stats": "Statistikker",
  "nav.settings": "Indstillinger",

  // --- SETTINGS ---
  "settings.back": "Tilbage",
  "settings.title": "Indstillinger",
  "settings.subtitle": "Tilpas tema og app-sprog",
  "settings.theme": "Tema",
  "settings.lang": "Sprog",

  // THEMES (PREMIUM)
  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "Premium gyldent tema",

  "settings.theme.pink.label": "ROSE FLUO",
  "settings.theme.pink.desc": "Pink arcade-stemning",

  "settings.theme.petrol.label": "PETROL BLUE",
  "settings.theme.petrol.desc": "Dyb neonblå",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "Lyst træningsdesign",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "Intens violet / magenta",

  "settings.theme.red.label": "BRIGHT RED",
  "settings.theme.red.desc": "Aggressiv arcade-rød",

  "settings.theme.orange.label": "FIRE ORANGE",
  "settings.theme.orange.desc": "Varm og energisk orange",

  "settings.theme.white.label": "SNOW WHITE",
  "settings.theme.white.desc": "Moderne lyst tema",

  // --- HOME ---
  "home.greeting": "Velkommen",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "LOG IND",

  "home.card.profiles.title": "PROFILER",
  "home.card.profiles.subtitle": "Opret og administrér profiler",

  "home.card.local.title": "LOKALT SPIL",
  "home.card.local.subtitle": "Adgang til alle spiltilstande",

  "home.card.online.title": "ONLINE SPIL",
  "home.card.online.subtitle": "Fjernkampe (kommer snart)",

  "home.card.stats.title": "STATISTIKKER",
  "home.card.stats.subtitle": "Statistikker og historik",

  "home.seeStats": "Se mine statistikker",

  "home.stats.avg3": "Gns/3",
  "home.stats.best": "Bedste",
  "home.stats.co": "CO",
  "home.stats.winPct": "Sejr%",

  // STATUS
  "status.online": "Online",
  "status.away": "Væk",
  "status.offline": "Offline",

  // --- PROFILES ---
  "profiles.title": "Profiler",
  "profiles.create": "Opret profil",
  "profiles.edit": "Rediger profil",
  "profiles.delete": "Slet profil",

  "profiles.confirmDeleteTitle": "Slet profil?",
  "profiles.confirmDeleteBody":
    "Denne profil og alle tilknyttede statistikker bliver slettet permanent.",
  "profiles.confirmDeleteYes": "Slet",
  "profiles.confirmDeleteNo": "Annullér",

  "profiles.name": "Navn",
  "profiles.avatar": "Avatar",
  "profiles.stats": "Statistikker",
  "profiles.noProfiles": "Ingen profiler endnu.",
  "profiles.pickOne": "Vælg en profil",
  "profiles.active": "Aktiv profil",

  // --- GAMES ---
  "games.title": "ALLE SPIL",
  "games.subtitle": "Vælg en spiltilstand",

  "games.training.title": "TRÆNING",
  "games.training.subtitle": "Forbedr din udvikling.",
  "games.training.infoTitle": "Træning",
  "games.training.infoBody":
    "Træningstilstand til præcision, scoring og afslutninger.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "Klassiske X01-spil med statistik, historik og regelmuligheder.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "Luk 15–20 + Bull.",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "Luk 15 til 20 og Bull før din modstander, og scor flest mulige point.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "Dublér dit nummer… bliv Killer.",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "Hver spiller har et nummer. Dublér dit eget for at blive Killer og eliminer de andre.",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "Rundeværdi, S-D-T = Shanghai.",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "Ram single, double og triple på samme nummer for at lave Shanghai.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "Flerspillersjov — elimineringer.",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "Flerspillertilstand med løbende elimineringer. Sidste spiller vinder.",

  "games.status.comingSoon": "Kommer snart",
  "games.info.close": "Luk",

  // --- TRAINING MENU ---
  "training.menu.title": "TRÆNING",
  "training.menu.subtitle": "Vælg en træningstilstand",

  "training.menu.x01.title": "X01 Træning",
  "training.menu.x01.subtitle": "Bedre scoring & afslutninger",
  "training.menu.x01.info":
    "X01-træning med fokus på regularitet, præcision og statistikker.",

  "training.menu.clock.title": "Around the Clock",
  "training.menu.clock.subtitle": "Single / Double / Triple",
  "training.menu.clock.info":
    "Ram tallene 1–20 og Bull i rækkefølge.",

  "training.menu.evolution.title": "Evolution",
  "training.menu.evolution.subtitle": "Kommer snart",
  "training.menu.evolution.info":
    "En ny træningstilstand kommer snart.",

  "training.menu.comingSoon": "Kommer snart",
  "training.menu.info.close": "Luk",

  // --- LANGUAGE NAMES ---
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
  "lang.at": "Østrigsk",
  "lang.sr": "Serbisk",
  "lang.hr": "Kroatisk",
  "lang.cs": "Tjekkisk",
},

 // ---------- NORSK ----------
no: {
  // --- NAV ---
  "nav.home": "Hjem",
  "nav.games": "Spill",
  "nav.profiles": "Profiler",
  "nav.friends": "Venner",
  "nav.stats": "Statistikk",
  "nav.settings": "Innstillinger",

  // --- SETTINGS ---
  "settings.back": "Tilbake",
  "settings.title": "Innstillinger",
  "settings.subtitle": "Tilpass appens tema og språk",
  "settings.theme": "Tema",
  "settings.lang": "Språk",

  // THEMES PREMIUM
  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "Premium gyldent tema",

  "settings.theme.pink.label": "ROSE FLUO",
  "settings.theme.pink.desc": "Rosa arcade-stemning",

  "settings.theme.petrol.label": "PETROL BLUE",
  "settings.theme.petrol.desc": "Dyp neonblå",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "Lys treningsstil",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "Intens lilla / magenta",

  "settings.theme.red.label": "BRIGHT RED",
  "settings.theme.red.desc": "Aggressiv arcade-rød",

  "settings.theme.orange.label": "FIRE ORANGE",
  "settings.theme.orange.desc": "Varm og energisk oransje",

  "settings.theme.white.label": "SNOW WHITE",
  "settings.theme.white.desc": "Moderne lyst tema",

  // --- HOME ---
  "home.greeting": "Velkommen",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "LOGG INN",

  "home.card.profiles.title": "PROFILER",
  "home.card.profiles.subtitle": "Opprett og administrer profiler",

  "home.card.local.title": "LOKALT SPILL",
  "home.card.local.subtitle": "Tilgang til alle spillmoduser",

  "home.card.online.title": "ONLINE SPILL",
  "home.card.online.subtitle": "Fjernkamper (kommer snart)",

  "home.card.stats.title": "STATISTIKK",
  "home.card.stats.subtitle": "Statistikk og historikk",

  "home.seeStats": "Se mine statistikker",

  "home.stats.avg3": "Snitt/3",
  "home.stats.best": "Beste",
  "home.stats.co": "CO",
  "home.stats.winPct": "Sjanse%",

  // STATUS
  "status.online": "Online",
  "status.away": "Borte",
  "status.offline": "Offline",

  // --- PROFILES ---
  "profiles.title": "Profiler",
  "profiles.create": "Opprett profil",
  "profiles.edit": "Rediger profil",
  "profiles.delete": "Slett profil",

  "profiles.confirmDeleteTitle": "Slette profil?",
  "profiles.confirmDeleteBody":
    "Denne profilen og alle statistikker blir slettet permanent.",
  "profiles.confirmDeleteYes": "Slett",
  "profiles.confirmDeleteNo": "Avbryt",

  "profiles.name": "Navn",
  "profiles.avatar": "Avatar",
  "profiles.stats": "Statistikk",
  "profiles.noProfiles": "Ingen profiler ennå.",
  "profiles.pickOne": "Velg en profil",
  "profiles.active": "Aktiv profil",

  // --- GAMES ---
  "games.title": "ALLE SPILL",
  "games.subtitle": "Velg en spillmodus",

  "games.training.title": "TRENING",
  "games.training.subtitle": "Forbedre ferdighetene dine.",
  "games.training.infoTitle": "Trening",
  "games.training.infoBody":
    "Treningsmodus for presisjon, poeng og avslutninger.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "Klassiske X01-spill med statistikk, historikk og flere regelvalg.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "Lukk 15–20 + Bull.",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "Lukk feltene 15 til 20 og Bull før motstanderen og få flere poeng.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "Doble tallet ditt… bli Killer.",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "Doble nummeret ditt for å bli Killer, og eliminer de andre spillerne.",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "Rundetall, S-D-T = Shanghai.",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "Treff singel, dobbel og trippel på samme verdi for Shanghai.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "Morsom modus — elimineringer.",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "Flerspiller med elimineringer. Siste spiller vinner.",

  "games.status.comingSoon": "Kommer snart",
  "games.info.close": "Lukk",

  // --- TRAINING MENU ---
  "training.menu.title": "TRENING",
  "training.menu.subtitle": "Velg en treningsmodus",

  "training.menu.x01.title": "X01 Trening",
  "training.menu.x01.subtitle": "Bedre poeng og avslutninger",
  "training.menu.x01.info":
    "X01-trening for presisjon, stabilitet og statistikk.",

  "training.menu.clock.title": "Around the Clock",
  "training.menu.clock.subtitle": "Single / Double / Triple",
  "training.menu.clock.info":
    "Treff tallene fra 1 til 20 og Bull.",

  "training.menu.evolution.title": "Evolusjon",
  "training.menu.evolution.subtitle": "Kommer snart",
  "training.menu.evolution.info":
    "En ny treningsmodus kommer snart.",

  "training.menu.comingSoon": "Kommer snart",
  "training.menu.info.close": "Lukk",

  // LANG NAMES
  "lang.no": "Norsk",
},

 // ---------- SVENSKA ----------
sv: {
  "nav.home": "Hem",
  "nav.games": "Spel",
  "nav.profiles": "Profiler",
  "nav.friends": "Vänner",
  "nav.stats": "Statistik",
  "nav.settings": "Inställningar",

  "settings.back": "Tillbaka",
  "settings.title": "Inställningar",
  "settings.subtitle": "Anpassa appens tema och språk",
  "settings.theme": "Tema",
  "settings.lang": "Språk",

  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "Exklusivt guldtema",

  "settings.theme.pink.label": "ROSE FLUO",
  "settings.theme.pink.desc": "Rosa arcade-stämning",

  "settings.theme.petrol.label": "PETROL BLUE",
  "settings.theme.petrol.desc": "Djup neonblå",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "Ljust träningsstil",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "Intensiv lila/magenta",

  "settings.theme.red.label": "BRIGHT RED",
  "settings.theme.red.desc": "Aggressiv arcade-röd",

  "settings.theme.orange.label": "FIRE ORANGE",
  "settings.theme.orange.desc": "Varm och energisk orange",

  "settings.theme.white.label": "SNOW WHITE",
  "settings.theme.white.desc": "Modern ljus bakgrund",

  "home.greeting": "Välkommen",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "LOGGA IN",

  "home.card.profiles.title": "PROFILER",
  "home.card.profiles.subtitle": "Skapa och hantera profiler",

  "home.card.local.title": "LOKALT SPEL",
  "home.card.local.subtitle": "Tillgång till alla spellägen",

  "home.card.online.title": "ONLINE-SPEL",
  "home.card.online.subtitle": "Fjärrmatcher (kommer snart)",

  "home.card.stats.title": "STATISTIK",
  "home.card.stats.subtitle": "Statistik och historik",

  "home.seeStats": "Visa min statistik",

  "home.stats.avg3": "Snitt/3",
  "home.stats.best": "Bästa",
  "home.stats.co": "CO",
  "home.stats.winPct": "Vinst%",

  "status.online": "Online",
  "status.away": "Borta",
  "status.offline": "Offline",

  "profiles.title": "Profiler",
  "profiles.create": "Skapa profil",
  "profiles.edit": "Redigera profil",
  "profiles.delete": "Radera profil",

  "profiles.confirmDeleteTitle": "Radera profil?",
  "profiles.confirmDeleteBody":
    "Denna profil och all statistik kommer att raderas permanent.",
  "profiles.confirmDeleteYes": "Radera",
  "profiles.confirmDeleteNo": "Avbryt",

  "profiles.name": "Namn",
  "profiles.avatar": "Avatar",
  "profiles.stats": "Statistik",
  "profiles.noProfiles": "Inga profiler ännu.",
  "profiles.pickOne": "Välj en profil",
  "profiles.active": "Aktiv profil",

  "games.title": "ALLA SPEL",
  "games.subtitle": "Välj ett spelläge",

  "games.training.title": "TRÄNING",
  "games.training.subtitle": "Förbättra din utveckling.",
  "games.training.infoTitle": "Träning",
  "games.training.infoBody":
    "Träningsläge för träffsäkerhet, scoring och avslut.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "Klassiska X01-spel med statistik, historik och regelval.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "Stäng 15–20 + Bull.",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "Stäng 15–20 och Bull innan motståndaren och få poäng.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "Dubbla din siffra… bli Killer.",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "Dubbla ditt nummer för att bli Killer och slå ut andra spelare.",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "Rundvärde, S-D-T = Shanghai.",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "Träffa singel, dubbel och trippel på samma värde för Shanghai.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "Roligt läge — elimineringar.",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "Fler spelare med elimineringar. Sista spelaren vinner.",

  "games.status.comingSoon": "Kommer snart",
  "games.info.close": "Stäng",

  "training.menu.title": "TRÄNING",
  "training.menu.subtitle": "Välj ett träningsläge",

  "training.menu.x01.title": "X01 Träning",
  "training.menu.x01.subtitle": "Bättre scoring och avslut",
  "training.menu.x01.info":
    "X01-träning med fokus på precision och statistik.",

  "training.menu.clock.title": "Around the Clock",
  "training.menu.clock.subtitle": "Single / Double / Triple",
  "training.menu.clock.info":
    "Träffa siffrorna 1–20 och Bull.",

  "training.menu.evolution.title": "Evolution",
  "training.menu.evolution.subtitle": "Kommer snart",
  "training.menu.evolution.info":
    "Ett nytt träningsläge kommer snart.",

  "training.menu.comingSoon": "Kommer snart",
  "training.menu.info.close": "Stäng",

  "lang.sv": "Svenska",
},

 // ---------- ÍSLENSKA ----------
is: {
  // --- NAV ---
  "nav.home": "Heim",
  "nav.games": "Leikir",
  "nav.profiles": "Prófílar",
  "nav.friends": "Vinir",
  "nav.stats": "Tölfræði",
  "nav.settings": "Stillingar",

  // --- SETTINGS ---
  "settings.back": "Til baka",
  "settings.title": "Stillingar",
  "settings.subtitle": "Sérsníddu útlit og tungumál appsins",
  "settings.theme": "Þema",
  "settings.lang": "Tungumál",

  // THEMES
  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "Gullið premium þema",

  "settings.theme.pink.label": "ROSE FLUO",
  "settings.theme.pink.desc": "Bleik arcade stemning",

  "settings.theme.petrol.label": "PETROL BLUE",
  "settings.theme.petrol.desc": "Djúpur neonblár",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "Bjart æfingaþema",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "Sterkt fjólublátt / magenta",

  "settings.theme.red.label": "BRIGHT RED",
  "settings.theme.red.desc": "Árásargjarnt arcade-rautt",

  "settings.theme.orange.label": "FIRE ORANGE",
  "settings.theme.orange.desc": "Hlý og kraftmikil appelsínugul",

  "settings.theme.white.label": "SNOW WHITE",
  "settings.theme.white.desc": "Ljóst og nútímalegt yfirbragð",

  // HOME
  "home.greeting": "Velkomin",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "SKRÁ INN",

  "home.card.profiles.title": "PRÓFÍLAR",
  "home.card.profiles.subtitle": "Búa til og stjórna prófílum",

  "home.card.local.title": "STAÐBUNDINN LEIKUR",
  "home.card.local.subtitle": "Aðgangur að öllum leikjamátum",

  "home.card.online.title": "NETLEIKUR",
  "home.card.online.subtitle": "Fjartengdir leikir (fljótlega)",

  "home.card.stats.title": "TÖLFRÆÐI",
  "home.card.stats.subtitle": "Tölfræði og saga",

  "home.seeStats": "Skoða mína tölfræði",

  "home.stats.avg3": "Með/3",
  "home.stats.best": "Best",
  "home.stats.co": "CO",
  "home.stats.winPct": "Sigur%",

  // STATUS
  "status.online": "Á neti",
  "status.away": "Fjarverandi",
  "status.offline": "Ótengdur",

  // PROFILES
  "profiles.title": "Prófílar",
  "profiles.create": "Búa til prófíl",
  "profiles.edit": "Breyta prófíl",
  "profiles.delete": "Eyða prófíl",

  "profiles.confirmDeleteTitle": "Eyða prófíl?",
  "profiles.confirmDeleteBody":
    "Þessum prófíl og allri tengdri tölfræði verður eytt varanlega.",
  "profiles.confirmDeleteYes": "Eyða",
  "profiles.confirmDeleteNo": "Hætta við",

  "profiles.name": "Nafn",
  "profiles.avatar": "Avatar",
  "profiles.stats": "Tölfræði",
  "profiles.noProfiles": "Engir prófílar enn.",
  "profiles.pickOne": "Veldu prófíl",
  "profiles.active": "Virkur prófíl",

  // GAMES
  "games.title": "ALLIR LEIKIR",
  "games.subtitle": "Veldu leikjamáta",

  "games.training.title": "ÆFING",
  "games.training.subtitle": "Bættu frammistöðu þína.",
  "games.training.infoTitle": "Æfing",
  "games.training.infoBody":
    "Æfingahamur til að bæta nákvæmni, stig og lokahögg.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoBody":
    "Klassískir X01 leikir með tölfræði, sögu og reglur valfrjálsar.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "Loka 15–20 + Bull.",
  "games.cricket.infoBody":
    "Lokaðu 15 til 20 og Bull á undan andstæðingi og náðu stigum.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "Tvíefldu töluna þína… vertu Killer.",
  "games.killer.infoBody":
    "Tvíefldu númerið til að verða Killer og útrýma mótherjum.",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "Einfalt/dúbbult/þríeyri = Shanghai.",
  "games.shanghai.infoBody":
    "Hittaðu einfalt, dúbbult og þríeyri á sömu tölu fyrir Shanghai.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "Fjölspilun — útrýming.",
  "games.battle.infoBody":
    "Síðasti leikmaðurinn sem lifir vinnur.",

  "games.status.comingSoon": "Kemur fljótlega",
  "games.info.close": "Loka",

  // TRAINING MENU
  "training.menu.title": "ÆFING",
  "training.menu.subtitle": "Veldu æfingarmáta",

  "training.menu.x01.title": "X01 Æfing",
  "training.menu.x01.subtitle": "Betri stig & lokahögg",
  "training.menu.x01.info":
    "X01 æfing með nákvæmni og tölfræði í fyrirrúmi.",

  "training.menu.clock.title": "Around the Clock",
  "training.menu.clock.subtitle": "Einfalt / Dúbbult / Þríeyri",
  "training.menu.clock.info":
    "Hittaðu tölur 1–20 og Bull í röð.",

  "training.menu.evolution.title": "Framþróun",
  "training.menu.evolution.subtitle": "Kemur fljótlega",
  "training.menu.evolution.info":
    "Nýr æfingarmáti kemur fljótlega.",

  "training.menu.comingSoon": "Kemur fljótlega",
  "training.menu.info.close": "Loka",

  // LANG
  "lang.is": "Íslenska",
},

 // ---------- POLSKI ----------
pl: {
  "nav.home": "Strona główna",
  "nav.games": "Gry",
  "nav.profiles": "Profile",
  "nav.friends": "Znajomi",
  "nav.stats": "Statystyki",
  "nav.settings": "Ustawienia",

  "settings.back": "Wróć",
  "settings.title": "Ustawienia",
  "settings.subtitle": "Dostosuj motyw i język aplikacji",
  "settings.theme": "Motyw",
  "settings.lang": "Język",

  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "Złoty motyw premium",

  "settings.theme.pink.label": "ROSE FLUO",
  "settings.theme.pink.desc": "Różowa atmosfera arcade",

  "settings.theme.petrol.label": "PETROL BLUE",
  "settings.theme.petrol.desc": "Głęboki neonowy niebieski",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "Jasny styl treningowy",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "Intensywna purpura / magenta",

  "settings.theme.red.label": "BRIGHT RED",
  "settings.theme.red.desc": "Agresywna czerwień arcade",

  "settings.theme.orange.label": "FIRE ORANGE",
  "settings.theme.orange.desc": "Ciepła i energetyczna pomarańcz",

  "settings.theme.white.label": "SNOW WHITE",
  "settings.theme.white.desc": "Nowoczesne jasne tło",

  "home.greeting": "Witaj",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "ZALOGUJ SIĘ",

  "home.card.profiles.title": "PROFILE",
  "home.card.profiles.subtitle": "Tworzenie i zarządzanie profilami",

  "home.card.local.title": "GRA LOKALNA",
  "home.card.local.subtitle": "Dostęp do wszystkich trybów gry",

  "home.card.online.title": "GRA ONLINE",
  "home.card.online.subtitle": "Zdalne mecze (wkrótce)",

  "home.card.stats.title": "STATYSTYKI",
  "home.card.stats.subtitle": "Statystyki i historia",

  "home.seeStats": "Zobacz moje statystyki",

  "home.stats.avg3": "Śr/3",
  "home.stats.best": "Najlepszy",
  "home.stats.co": "CO",
  "home.stats.winPct": "Wygrane%",

  "status.online": "Online",
  "status.away": "Zaraz wracam",
  "status.offline": "Offline",

  "profiles.title": "Profile",
  "profiles.create": "Utwórz profil",
  "profiles.edit": "Edytuj profil",
  "profiles.delete": "Usuń profil",

  "profiles.confirmDeleteTitle": "Usunąć profil?",
  "profiles.confirmDeleteBody":
    "Ten profil i wszystkie statystyki zostaną trwale usunięte.",
  "profiles.confirmDeleteYes": "Usuń",
  "profiles.confirmDeleteNo": "Anuluj",

  "profiles.name": "Nazwa",
  "profiles.avatar": "Avatar",
  "profiles.stats": "Statystyki",
  "profiles.noProfiles": "Brak profili.",
  "profiles.pickOne": "Wybierz profil",
  "profiles.active": "Aktywny profil",

  "games.title": "WSZYSTKIE GRY",
  "games.subtitle": "Wybierz tryb gry",

  "games.training.title": "TRENING",
  "games.training.subtitle": "Popraw swoje umiejętności.",
  "games.training.infoBody":
    "Tryb treningowy dla precyzji, punktacji i wykończeń.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "Zamknij 15–20 + Bull.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "Podwój swoją liczbę… zostań Killerem.",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "Cel rundy, S-D-T = Shanghai.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "Tryb zabawy — eliminacje.",

  "games.status.comingSoon": "Wkrótce",
  "games.info.close": "Zamknij",

  "training.menu.title": "TRENING",
  "training.menu.subtitle": "Wybierz tryb treningowy",

  "training.menu.x01.title": "Trening X01",
  "training.menu.x01.subtitle": "Ulepsz scoring i wykończenia",

  "training.menu.clock.title": "Around the Clock",
  "training.menu.clock.subtitle": "Single / Double / Triple",

  "training.menu.evolution.title": "Ewolucja",

  "lang.pl": "Polski",
},

 // ---------- ROMÂNĂ ----------
ro: {
  "nav.home": "Acasă",
  "nav.games": "Jocuri",
  "nav.profiles": "Profiluri",
  "nav.friends": "Prieteni",
  "nav.stats": "Statistici",
  "nav.settings": "Setări",

  "settings.back": "Înapoi",
  "settings.title": "Setări",
  "settings.subtitle": "Personalizează tema și limba aplicației",
  "settings.theme": "Temă",
  "settings.lang": "Limbă",

  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "Temă premium aurie",

  "settings.theme.pink.label": "ROSE FLUO",
  "settings.theme.pink.desc": "Atmosferă arcade roz",

  "settings.theme.petrol.label": "PETROL BLUE",
  "settings.theme.petrol.desc": "Albastru neon profund",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "Stil luminos de antrenament",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "Violet / magenta intens",

  "settings.theme.red.label": "BRIGHT RED",
  "settings.theme.red.desc": "Roșu arcade agresiv",

  "settings.theme.orange.label": "FIRE ORANGE",
  "settings.theme.orange.desc": "Portocaliu cald și energic",

  "settings.theme.white.label": "SNOW WHITE",
  "settings.theme.white.desc": "Fundal modern și luminos",

  "home.greeting": "Bun venit",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "AUTENTIFICARE",

  "home.card.profiles.title": "PROFILURI",
  "home.card.profiles.subtitle": "Creează și gestionează profiluri",

  "home.card.local.title": "JOC LOCAL",
  "home.card.local.subtitle": "Acces la toate modurile de joc",

  "home.card.online.title": "JOC ONLINE",
  "home.card.online.subtitle": "Meciuri la distanță (în curând)",

  "home.card.stats.title": "STATISTICI",
  "home.card.stats.subtitle": "Statistici și istoric",

  "home.seeStats": "Vezi statisticile mele",

  "home.stats.avg3": "Med/3",
  "home.stats.best": "Cel mai bun",
  "home.stats.co": "CO",
  "home.stats.winPct": "Win%",

  "status.online": "Online",
  "status.away": "Plecat",
  "status.offline": "Offline",

  "profiles.title": "Profiluri",
  "profiles.create": "Creează profil",
  "profiles.edit": "Editează profil",
  "profiles.delete": "Șterge profil",

  "games.title": "TOATE JOCURILE",
  "games.subtitle": "Selectează un mod de joc",

  "training.menu.title": "ANTRENAMENT",
  "training.menu.subtitle": "Alege un mod de antrenament",

  "lang.ro": "Română",
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

 // ---------- СРПСКИ ----------
sr: {
  // --- NAV ---
  "nav.home": "Почетна",
  "nav.games": "Игре",
  "nav.profiles": "Профили",
  "nav.friends": "Пријатељи",
  "nav.stats": "Статистика",
  "nav.settings": "Подешавања",

  // --- SETTINGS ---
  "settings.back": "Назад",
  "settings.title": "Подешавања",
  "settings.subtitle": "Прилагоди тему и језик апликације",
  "settings.theme": "Тема",
  "settings.lang": "Језик",

  // THEMES (labels MAJUSCULES, EN inchangé)
  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "Премијум златна неон тема",

  "settings.theme.pink.label": "ROSE FLUO",
  "settings.theme.pink.desc": "Розe аркад атмосфера",

  "settings.theme.petrol.label": "PETROL BLUE",
  "settings.theme.petrol.desc": "Дубока неон плава",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "Светао тренинг стил",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "Интензивна љубичаста / магента",

  "settings.theme.red.label": "BRIGHT RED",
  "settings.theme.red.desc": "Агресивна аркад црвена",

  "settings.theme.orange.label": "FIRE ORANGE",
  "settings.theme.orange.desc": "Топла и енергична наранџаста",

  "settings.theme.white.label": "SNOW WHITE",
  "settings.theme.white.desc": "Модерна светла позадина",

  // --- HOME ---
  "home.greeting": "Добродошли",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "ПРИЈАВИ СЕ",

  "home.card.profiles.title": "ПРОФИЛИ",
  "home.card.profiles.subtitle": "Креирање и управљање профилима",

  "home.card.local.title": "ЛОКАЛНА ИГРА",
  "home.card.local.subtitle": "Приступ свим режимима игре",

  "home.card.online.title": "ОНЛАЈН ИГРА",
  "home.card.online.subtitle": "Удаљене партије (ускоро)",

  "home.card.stats.title": "СТАТИСТИКА",
  "home.card.stats.subtitle": "Статистика и историја",

  "home.seeStats": "Погледај моју статистику",

  "home.stats.avg3": "Прос/3",
  "home.stats.best": "Најбоље",
  "home.stats.co": "CO",
  "home.stats.winPct": "Win%",

  // STATUS
  "status.online": "На мрежи",
  "status.away": "Одсутан",
  "status.offline": "Ван мреже",

  // --- PROFILES ---
  "profiles.title": "Профили",
  "profiles.create": "Креирај профил",
  "profiles.edit": "Уреди профил",
  "profiles.delete": "Обриши профил",

  "profiles.confirmDeleteTitle": "Обрисати профил?",
  "profiles.confirmDeleteBody":
    "Овај профил и сва повезана статистика биће трајно обрисани.",
  "profiles.confirmDeleteYes": "Обриши",
  "profiles.confirmDeleteNo": "Откажи",

  "profiles.name": "Име",
  "profiles.avatar": "Аватар",
  "profiles.stats": "Статистика",
  "profiles.noProfiles": "Још увек нема профила.",
  "profiles.pickOne": "Изабери профил",
  "profiles.active": "Активни профил",

  // --- GAMES ---
  "games.title": "СВЕ ИГРЕ",
  "games.subtitle": "Изабери режим игре",

  "games.training.title": "ТРЕНИНГ",
  "games.training.subtitle": "Побољшај свој напредак.",
  "games.training.infoTitle": "Тренинг",
  "games.training.infoBody":
    "Режим тренинга за рад на прецизности, скорингу и завршницама.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "Класичне X01 партије са статистиком, историјом и различитим правилима.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "Затвори 15–20 + Bull.",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "Затвори бројеве 15 до 20 и Bull пре противника и сакупи што више поена.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "Погоди свој број… постани Killer.",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "Сваки играч има број. Погоди свој број да постанеш Killer, затим елиминиши остале.",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "Вредност рунде, S-D-T = Shanghai.",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "Погоди single, double и triple на истој вредности у једној посети за Shanghai.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "Забаван режим — елиминације.",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "Забаван вишекориснички режим са постепеним елиминацијама. Последњи играч побеђује.",

  "games.status.comingSoon": "Ускоро",
  "games.info.close": "Затвори",

  // --- TRAINING MENU ---
  "training.menu.title": "ТРЕНИНГ",
  "training.menu.subtitle": "Изабери режим тренинга",

  "training.menu.x01.title": "Training X01",
  "training.menu.x01.subtitle": "Побољшај скоринг и завршнице",
  "training.menu.x01.info":
    "X01 тренинг посвећен прецизности, стабилности и напредним статистикама.",

  "training.menu.clock.title": "Around the Clock",
  "training.menu.clock.subtitle": "Single / Double / Triple",
  "training.menu.clock.info":
    "Гађај бројеве 1 до 20 и Bull редом. Одабери Single, Double или Triple режим.",

  "training.menu.evolution.title": "Еволуција",
  "training.menu.evolution.subtitle": "Ускоро",
  "training.menu.evolution.info":
    "Нови тренинг режим долази ускоро.",

  "training.menu.comingSoon": "Ускоро",
  "training.menu.info.close": "Затвори",

  // --- LANG NAMES (liste complète) ---
  "lang.fr": "Француски",
  "lang.en": "Енглески",
  "lang.es": "Шпански",
  "lang.de": "Немачки",
  "lang.it": "Италијански",
  "lang.pt": "Португалски",
  "lang.nl": "Холандски",
  "lang.ru": "Руски",
  "lang.zh": "Кинески",
  "lang.ja": "Јапански",
  "lang.ar": "Арапски",
  "lang.hi": "Хинди",
  "lang.tr": "Турски",
  "lang.da": "Дански",
  "lang.no": "Норвешки",
  "lang.sv": "Шведски",
  "lang.is": "Исландски",
  "lang.pl": "Пољски",
  "lang.ro": "Румунски",
  "lang.at": "Аустријски",
  "lang.sr": "Српски",
  "lang.hr": "Хрватски",
  "lang.cs": "Чешки",
},

  // ---------- HRVATSKI ----------
hr: {
  // --- NAV ---
  "nav.home": "Početna",
  "nav.games": "Igre",
  "nav.profiles": "Profili",
  "nav.friends": "Prijatelji",
  "nav.stats": "Statistike",
  "nav.settings": "Postavke",

  // --- SETTINGS ---
  "settings.back": "Natrag",
  "settings.title": "Postavke",
  "settings.subtitle": "Prilagodi temu i jezik aplikacije",
  "settings.theme": "Tema",
  "settings.lang": "Jezik",

  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "Premium zlatna neon tema",

  "settings.theme.pink.label": "ROSE FLUO",
  "settings.theme.pink.desc": "Roza arkadna atmosfera",

  "settings.theme.petrol.label": "PETROL BLUE",
  "settings.theme.petrol.desc": "Duboka neonsko plava",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "Svijetli trening stil",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "Intenzivna ljubičasta / magenta",

  "settings.theme.red.label": "BRIGHT RED",
  "settings.theme.red.desc": "Agresivna arkadna crvena",

  "settings.theme.orange.label": "FIRE ORANGE",
  "settings.theme.orange.desc": "Topla i energična narančasta",

  "settings.theme.white.label": "SNOW WHITE",
  "settings.theme.white.desc": "Moderan svijetli background",

  // --- HOME ---
  "home.greeting": "Dobrodošli",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "PRIJAVA",

  "home.card.profiles.title": "PROFILI",
  "home.card.profiles.subtitle": "Kreiranje i upravljanje profilima",

  "home.card.local.title": "LOKALNA IGRA",
  "home.card.local.subtitle": "Pristup svim načinima igre",

  "home.card.online.title": "ONLINE IGRA",
  "home.card.online.subtitle": "Udaljene partije (uskoro)",

  "home.card.stats.title": "STATISTIKE",
  "home.card.stats.subtitle": "Statistike i povijest",

  "home.seeStats": "Pogledaj moje statistike",

  "home.stats.avg3": "Pros/3",
  "home.stats.best": "Najbolji",
  "home.stats.co": "CO",
  "home.stats.winPct": "Win%",

  // STATUS
  "status.online": "Online",
  "status.away": "Odsutan",
  "status.offline": "Offline",

  // --- PROFILES ---
  "profiles.title": "Profili",
  "profiles.create": "Kreiraj profil",
  "profiles.edit": "Uredi profil",
  "profiles.delete": "Obriši profil",

  "profiles.confirmDeleteTitle": "Obrisati profil?",
  "profiles.confirmDeleteBody":
    "Ovaj profil i sve povezane statistike bit će trajno obrisani.",
  "profiles.confirmDeleteYes": "Obriši",
  "profiles.confirmDeleteNo": "Odustani",

  "profiles.name": "Ime",
  "profiles.avatar": "Avatar",
  "profiles.stats": "Statistike",
  "profiles.noProfiles": "Još nema profila.",
  "profiles.pickOne": "Odaberi profil",
  "profiles.active": "Aktivni profil",

  // --- GAMES ---
  "games.title": "SVE IGRE",
  "games.subtitle": "Odaberi način igre",

  "games.training.title": "TRENING",
  "games.training.subtitle": "Poboljšaj svoj napredak.",
  "games.training.infoTitle": "Trening",
  "games.training.infoBody":
    "Trening način za rad na preciznosti, bodovima i završnicama.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "Klasične X01 partije sa statistikama, poviješću i opcijama pravila.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "Zatvori 15–20 + Bull.",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "Zatvori brojeve 15 do 20 i Bull prije protivnika, uz što više bodova.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "Pogodi svoj broj… postani Killer.",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "Svaki igrač ima broj. Pogodi svoj broj da postaneš Killer, zatim eliminiraj ostale.",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "Vrijednost runde, S-D-T = Shanghai.",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "Pogodi single, double i triple na istoj vrijednosti u jednoj rundi za Shanghai.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "Zabavan način — eliminacije.",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "Zabavan multiplayer s postupnim eliminacijama. Posljednji igrač pobjeđuje.",

  "games.status.comingSoon": "Uskoro",
  "games.info.close": "Zatvori",

  // --- TRAINING MENU ---
  "training.menu.title": "TRENING",
  "training.menu.subtitle": "Odaberi trening način",

  "training.menu.x01.title": "Training X01",
  "training.menu.x01.subtitle": "Poboljšaj scoring i završnice",
  "training.menu.x01.info":
    "X01 trening namijenjen preciznosti, konzistentnosti i naprednim statistikama.",

  "training.menu.clock.title": "Around the Clock",
  "training.menu.clock.subtitle": "Single / Double / Triple",
  "training.menu.clock.info":
    "Gađaj brojeve od 1 do 20 i Bull redom. Odaberi Single, Double ili Triple način.",

  "training.menu.evolution.title": "Evolucija",
  "training.menu.evolution.subtitle": "Uskoro",
  "training.menu.evolution.info":
    "Novi trening način dolazi uskoro.",

  "training.menu.comingSoon": "Uskoro",
  "training.menu.info.close": "Zatvori",

  // --- LANG NAMES ---
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
  "lang.at": "Austrijski",
  "lang.sr": "Srpski",
  "lang.hr": "Hrvatski",
  "lang.cs": "Češki",
},

// ---------- ČEŠTINA ----------
cs: {
  // --- NAV ---
  "nav.home": "Domů",
  "nav.games": "Hry",
  "nav.profiles": "Profily",
  "nav.friends": "Přátelé",
  "nav.stats": "Statistiky",
  "nav.settings": "Nastavení",

  // --- SETTINGS ---
  "settings.back": "Zpět",
  "settings.title": "Nastavení",
  "settings.subtitle": "Přizpůsob vzhled aplikace a jazyk",
  "settings.theme": "Motiv",
  "settings.lang": "Jazyk",

  "settings.theme.gold.label": "GOLD NEON",
  "settings.theme.gold.desc": "Prémiový zlatý neonový motiv",

  "settings.theme.pink.label": "ROSE FLUO",
  "settings.theme.pink.desc": "Růžová arcade atmosféra",

  "settings.theme.petrol.label": "PETROL BLUE",
  "settings.theme.petrol.desc": "Hluboká neonová modrá",

  "settings.theme.green.label": "VEGETAL",
  "settings.theme.green.desc": "Světlý tréninkový styl",

  "settings.theme.magenta.label": "MAGENTA",
  "settings.theme.magenta.desc": "Intenzivní fialová / magenta",

  "settings.theme.red.label": "BRIGHT RED",
  "settings.theme.red.desc": "Agresivní arcade červená",

  "settings.theme.orange.label": "FIRE ORANGE",
  "settings.theme.orange.desc": "Teplá a energická oranžová",

  "settings.theme.white.label": "SNOW WHITE",
  "settings.theme.white.desc": "Moderní světlé pozadí",

  // --- HOME ---
  "home.greeting": "Vítejte",
  "home.titleApp": "DARTS COUNTER",
  "home.connect": "PŘIHLÁSIT SE",

  "home.card.profiles.title": "PROFILY",
  "home.card.profiles.subtitle": "Vytvářej a spravuj profily",

  "home.card.local.title": "LOKÁLNÍ HRA",
  "home.card.local.subtitle": "Přístup ke všem herním módům",

  "home.card.online.title": "ONLINE HRA",
  "home.card.online.subtitle": "Vzdálené zápasy (již brzy)",

  "home.card.stats.title": "STATISTIKY",
  "home.card.stats.subtitle": "Statistiky a historie",

  "home.seeStats": "Zobrazit moje statistiky",

  "home.stats.avg3": "Prům/3",
  "home.stats.best": "Nejlepší",
  "home.stats.co": "CO",
  "home.stats.winPct": "Výher%",

  // STATUS
  "status.online": "Online",
  "status.away": "Nepřítomen",
  "status.offline": "Offline",

  // --- PROFILES ---
  "profiles.title": "Profily",
  "profiles.create": "Vytvořit profil",
  "profiles.edit": "Upravit profil",
  "profiles.delete": "Smazat profil",

  "profiles.confirmDeleteTitle": "Smazat profil?",
  "profiles.confirmDeleteBody":
    "Tento profil a všechny související statistiky budou trvale odstraněny.",
  "profiles.confirmDeleteYes": "Smazat",
  "profiles.confirmDeleteNo": "Zrušit",

  "profiles.name": "Jméno",
  "profiles.avatar": "Avatar",
  "profiles.stats": "Statistiky",
  "profiles.noProfiles": "Zatím žádné profily.",
  "profiles.pickOne": "Vyber profil",
  "profiles.active": "Aktivní profil",

  // --- GAMES ---
  "games.title": "VŠECHNY HRY",
  "games.subtitle": "Vyber herní mód",

  "games.training.title": "TRÉNINK",
  "games.training.subtitle": "Zlepši svůj výkon.",
  "games.training.infoTitle": "Trénink",
  "games.training.infoBody":
    "Tréninkový režim pro přesnost, skórování a zakončení.",

  "games.x01.title": "X01",
  "games.x01.subtitle": "301 / 501 / 701 / 901.",
  "games.x01.infoTitle": "X01",
  "games.x01.infoBody":
    "Klasické X01 hry se statistikami, historií a různými pravidly.",

  "games.cricket.title": "CRICKET",
  "games.cricket.subtitle": "Uzavři 15–20 + Bull.",
  "games.cricket.infoTitle": "Cricket",
  "games.cricket.infoBody":
    "Uzavři čísla 15 až 20 a Bull dříve než soupeř a nasbírej co nejvíce bodů.",

  "games.killer.title": "KILLER",
  "games.killer.subtitle": "Zasáhni své číslo… staň se Killerem.",
  "games.killer.infoTitle": "Killer",
  "games.killer.infoBody":
    "Každý hráč má své číslo. Zasáhni ho, staň se Killerem a vyřaď ostatní.",

  "games.shanghai.title": "SHANGHAI",
  "games.shanghai.subtitle": "Cíl kola, S-D-T = Shanghai.",
  "games.shanghai.infoTitle": "Shanghai",
  "games.shanghai.infoBody":
    "Zasáhni single, double a triple na stejné hodnotě v jedné návštěvě pro Shanghai.",

  "games.battle.title": "BATTLE ROYALE",
  "games.battle.subtitle": "Zábavný mód — eliminace.",
  "games.battle.infoTitle": "Battle Royale",
  "games.battle.infoBody":
    "Zábavný multiplayer s postupnými eliminacemi. Poslední hráč vyhrává.",

  "games.status.comingSoon": "Již brzy",
  "games.info.close": "Zavřít",

  // --- TRAINING MENU ---
  "training.menu.title": "TRÉNINK",
  "training.menu.subtitle": "Vyber tréninkový mód",

  "training.menu.x01.title": "Training X01",
  "training.menu.x01.subtitle": "Zlepši skórování a zakončení",
  "training.menu.x01.info":
    "X01 trénink zaměřený na přesnost, konzistenci a pokročilé statistiky.",

  "training.menu.clock.title": "Around the Clock",
  "training.menu.clock.subtitle": "Single / Double / Triple",
  "training.menu.clock.info":
    "Zasahuj čísla 1 až 20 a Bull postupně. Vyber si Single, Double nebo Triple mód.",

  "training.menu.evolution.title": "Evoluce",
  "training.menu.evolution.subtitle": "Již brzy",
  "training.menu.evolution.info":
    "Nový tréninkový mód bude brzy dostupný.",

  "training.menu.comingSoon": "Již brzy",
  "training.menu.info.close": "Zavřít",

  // --- LANG NAMES ---
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
  "lang.at": "Rakušanská němčina",
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
