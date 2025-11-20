// ============================================
// src/contexts/LangContext.tsx
// Contexte global pour la langue / i18n
// ============================================

import React from "react";
import {
  AVAILABLE_LANGS,
  I18N_STRINGS,
  type LangCode,
  type I18nKey,
} from "../i18n/i18n";

export const LANG_STORAGE_KEY = "dc_app_lang_v1";
const DEFAULT_LANG: LangCode = "fr";

type LangContextValue = {
  lang: LangCode;
  setLang: (code: LangCode) => void;
  t: (key: I18nKey) => string;
  availableLangs: typeof AVAILABLE_LANGS;
};

const LangContext = React.createContext<LangContextValue | undefined>(
  undefined
);

function loadInitialLang(): LangCode {
  if (typeof window === "undefined") return DEFAULT_LANG;
  try {
    const raw = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (!raw) return DEFAULT_LANG;
    const code = raw as LangCode;
    const exists = AVAILABLE_LANGS.some((l) => l.code === code);
    return exists ? code : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<LangCode>(() => loadInitialLang());

  const setLang = React.useCallback((code: LangCode) => {
    setLangState(code);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LANG_STORAGE_KEY, code);
      }
    } catch {
      // ignore
    }
  }, []);

  const t = React.useCallback(
    (key: I18nKey): string => {
      const table = I18N_STRINGS[lang] ?? I18N_STRINGS[DEFAULT_LANG];
      return table[key] ?? key;
    },
    [lang]
  );

  const value: LangContextValue = React.useMemo(
    () => ({ lang, setLang, t, availableLangs: AVAILABLE_LANGS }),
    [lang, setLang, t]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = React.useContext(LangContext);
  if (!ctx) {
    throw new Error("useLang must be used within a LangProvider");
  }
  return ctx;
}
