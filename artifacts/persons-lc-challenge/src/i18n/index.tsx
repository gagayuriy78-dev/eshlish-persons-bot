import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { dictionaries, type Language, type TranslationKey } from "./dictionaries";

export type { Language, TranslationKey };

interface I18nValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  formatNumber: (n: number) => string;
  formatDate: (iso: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);
const STORAGE_KEY = "plc.lang";

function initialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "uz" || stored === "en") return stored;
  } catch {
    /* storage unavailable */
  }
  return "uz";
}

/**
 * The server-saved user language is authoritative: call setLang(me.language)
 * after the session loads, and PATCH /me when the user switches.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(initialLanguage);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const dict = dictionaries[lang];
    const locale = lang === "uz" ? "uz-UZ" : "en-GB";
    return {
      lang,
      setLang,
      t: (key, vars) => {
        let text = dict[key] ?? dictionaries.uz[key] ?? key;
        if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
        return text;
      },
      formatNumber: (n) => n.toLocaleString("ru-RU").replace(/\u00a0/g, " "),
      formatDate: (iso) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
