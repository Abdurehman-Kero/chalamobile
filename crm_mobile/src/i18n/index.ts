import { useMemo } from 'react';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { om } from './om';
import { am } from './am';

export type Lang = 'en' | 'om' | 'am';

/** The languages of the app, as people write them. English is the default. */
export const LANGS: { code: Lang; name: string; short: string }[] = [
  { code: 'en', name: 'English', short: 'EN' },
  { code: 'om', name: 'Afaan Oromoo', short: 'OM' },
  { code: 'am', name: 'አማርኛ', short: 'አማ' },
];

// English text is its own key: t('Save changes'). A line that has no translation yet shows in English,
// so the app never shows a blank or a raw key. `npm run i18n:check` lists what is still missing.
const DICTS: Record<Lang, Record<string, string>> = { en: {}, om, am };
const STORAGE_KEY = 'app_language';
const isLang = (v: unknown): v is Lang => v === 'en' || v === 'om' || v === 'am';

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Reads the saved choice. Called once while the app starts. */
  restoreLang: () => Promise<void>;
}

export const useLang = create<LangState>((set) => ({
  lang: 'en',
  setLang: (lang) => {
    set({ lang });
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
  },
  restoreLang: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (isLang(saved)) set({ lang: saved });
    } catch { /* keep English */ }
  },
}));

type Vars = Record<string, string | number>;
export type TFunction = (text: string, vars?: Vars) => string;

export function translate(lang: Lang, text: string, vars?: Vars): string {
  let out: string = DICTS[lang][text] ?? text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/** Marks a label kept in a constant. It is translated where it is drawn: t(LABELS.x). */
export const tx = (text: string): string => text;

/** For code that is not a component (error messages, formatters). */
export const tr: TFunction = (text, vars) => translate(useLang.getState().lang, text, vars);

/** In a component: `const t = useT();`. The component redraws when the language changes. */
export function useT(): TFunction {
  const lang = useLang(s => s.lang);
  return useMemo<TFunction>(() => (text, vars) => translate(lang, text, vars), [lang]);
}
