import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { en, type Key } from './en';
import { om } from './om';
import { am } from './am';

export type Lang = 'en' | 'om' | 'am';
export type { Key };

/** The languages of the store, as people write them. English is the default for now. */
export const LANGS: { code: Lang; name: string; short: string }[] = [
  { code: 'en', name: 'English', short: 'EN' },
  { code: 'om', name: 'Afaan Oromoo', short: 'OM' },
  { code: 'am', name: 'አማርኛ', short: 'አማ' },
];

const DICTS = { en, om, am } as const;

interface LangState { lang: Lang; setLang: (lang: Lang) => void }

export const useLang = create<LangState>()(
  persist(
    (set) => ({ lang: 'en', setLang: (lang) => set({ lang }) }),
    {
      name: 'chala-lang',
      // A saved value that is not one of ours (old or edited) falls back to English.
      merge: (saved, current) => {
        const lang = (saved as Partial<LangState> | undefined)?.lang;
        return { ...current, lang: lang === 'om' || lang === 'am' || lang === 'en' ? lang : 'en' };
      },
    },
  ),
);

type Vars = Record<string, string | number>;
export type TFunction = (key: Key, vars?: Vars) => string;

export function translate(lang: Lang, key: Key, vars?: Vars): string {
  let text: string = DICTS[lang][key] ?? en[key];
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
  return text;
}

/** For code that is not a React component (error messages, formatters). */
export const tr: TFunction = (key, vars) => translate(useLang.getState().lang, key, vars);

/** In a component: `const t = useT();` The component redraws when the language changes. */
export function useT(): TFunction {
  const lang = useLang(s => s.lang);
  return useMemo<TFunction>(() => (key, vars) => translate(lang, key, vars), [lang]);
}

/** The locale used to write dates and month names. */
export const dateLocale = (lang: Lang): string => (lang === 'am' ? 'am-ET' : lang === 'om' ? 'om-ET' : 'en-GB');

/** A category as shown to the customer: translated when we know it, as typed in the CRM otherwise. */
export function categoryName(t: TFunction, name: string): string {
  const key = `cat.${name.trim().toLowerCase()}` as Key;
  return key in en ? t(key) : name;
}
