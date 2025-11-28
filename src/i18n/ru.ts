// ============================================
// src/i18n/ru.ts
// Dictionnaire Russe (RU) — v1
// - Couvre : navigation de base + page Settings
// - Les autres clés retomberont sur le fallback FR
// ============================================

import type { Dict } from "../contexts/LangContext";

export const ru: Dict = {
  // -----------------------------
  // NAVIGATION / TABS (minimum)
  // -----------------------------
  "nav.home": "Главная",
  "nav.local": "Локальный",
  "nav.games": "Игры",
  "nav.training": "Тренировка",
  "nav.online": "Онлайн",
  "nav.stats": "Статистика",
  "nav.settings": "Настройки",
  "nav.profiles": "Профили",
  "nav.sync": "Синхронизация",
  "nav.back": "Назад",
  "nav.close": "Закрыть",

  // -----------------------------
  // HOME (titre minimum)
  // -----------------------------
  "home.title": "Панель управления",

  // -----------------------------
  // SETTINGS / НАСТРОЙКИ
  // -----------------------------
  "settings.back": "Назад",
  "settings.title": "Настройки",
  "settings.subtitle":
    "Настройте оформление приложения и язык интерфейса",

  "settings.theme": "Тема",
  "settings.theme.group.neons": "Классические неоновые",
  "settings.theme.group.soft": "Мягкие цвета",
  "settings.theme.group.dark": "Тёмные премиум-темы",

  "settings.theme.gold.label": "Неон-золото",
  "settings.theme.gold.desc": "Премиальная золотая тема",

  "settings.theme.pink.label": "Неон-розовый",
  "settings.theme.pink.desc": "Аркадная атмосфера в розовом",

  "settings.theme.petrol.label": "Нефтяной синий",
  "settings.theme.petrol.desc": "Глубокий неоновый синий",

  "settings.theme.green.label": "Неон-зелёный",
  "settings.theme.green.desc": "Яркий тренировочный стиль",

  "settings.theme.magenta.label": "Маджента",
  "settings.theme.magenta.desc": "Насыщённый фиолетовый / маджента",

  "settings.theme.red.label": "Красный",
  "settings.theme.red.desc": "Агрессивный аркадный красный",

  "settings.theme.orange.label": "Оранжевый",
  "settings.theme.orange.desc": "Тёплый и энергичный оранжевый",

  "settings.theme.white.label": "Белый",
  "settings.theme.white.desc": "Современный светлый фон",

  "settings.theme.blueOcean.label": "Океанический синий",
  "settings.theme.blueOcean.desc": "Естественный цвет моря и неба",

  "settings.theme.limeYellow.label": "Лаймовый жёлтый",
  "settings.theme.limeYellow.desc": "Очень яркий лаймовый оттенок",

  "settings.theme.sage.label": "Шалфейный зелёный",
  "settings.theme.sage.desc": "Мягкие естественные зелёные тона",

  "settings.theme.skyBlue.label": "Небесно-голубой",
  "settings.theme.skyBlue.desc": "Очень мягкий и светлый голубой",

  "settings.theme.darkTitanium.label": "Тёмный титан",
  "settings.theme.darkTitanium.desc": "Премиальный матовый металл",

  "settings.theme.darkCarbon.label": "Карбон",
  "settings.theme.darkCarbon.desc": "Современный стиль карбонового волокна",

  "settings.theme.darkFrost.label": "Тёмный иней",
  "settings.theme.darkFrost.desc": "Матовый чёрный с эффектом изморози",

  "settings.theme.darkObsidian.label": "Обсидиан",
  "settings.theme.darkObsidian.desc":
    "Полированный премиальный чёрный, хорошая читаемость",

  "settings.lang": "Язык",

  "settings.reset.title": "Сбросить приложение",
  "settings.reset.subtitle":
    "Удалит все локальные профили, BOTS, статистику, историю матчей и настройки. Действие необратимо.",
  "settings.reset.button": "Сбросить всё",

  // -----------------------------
  // НАЗВАНИЯ ЯЗЫКОВ (RU)
  // -----------------------------
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
};

export default ru;
