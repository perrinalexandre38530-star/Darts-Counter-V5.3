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

    // Noms de langues
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
    "lang.sr": "Serbian",
    "lang.hr": "Croatian",
    "lang.cs": "Czech",
  },

  // ---------- ESPAÑOL ----------
  es: {
    "nav.home": "Inicio",
    "nav.games": "Juegos",
    "nav.profiles": "Perfiles",
    "nav.friends": "Amigos",
    "nav.stats": "Estadísticas",
    "nav.settings": "Ajustes",

    "settings.back": "Volver",
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
    "settings.theme.green.desc": "Estilo de práctica brillante",

    "settings.theme.magenta.label": "Magenta",
    "settings.theme.magenta.desc": "Violeta / magenta intenso",

    "settings.theme.red.label": "Rojo",
    "settings.theme.red.desc": "Rojo arcade agresivo",

    "settings.theme.orange.label": "Naranja",
    "settings.theme.orange.desc": "Naranja cálido y enérgico",

    "settings.theme.white.label": "Blanco",
    "settings.theme.white.desc": "Fondo claro moderno",

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
    "lang.sr": "Sârbă",
    "lang.hr": "Croată",
    "lang.cs": "Cehă",
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
