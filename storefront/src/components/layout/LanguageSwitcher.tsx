import { useEffect, useRef, useState } from 'react';
import { LANGS, useLang, useT } from '../../i18n';
import { Icon } from '../ui/Icon';

/** The language picker beside the cart: "EN ▾" opens English, Afaan Oromoo and Amharic. */
export function LanguageSwitcher() {
  const t = useT();
  const lang = useLang(s => s.lang);
  const setLang = useLang(s => s.setLang);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGS.find(l => l.code === lang) ?? LANGS[0]!;

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu"
        aria-label={`${t('header.language')}: ${current.name}`}
        className="inline-flex h-10 items-center gap-0.5 rounded-full px-2 text-sm font-bold transition-colors hover:bg-sunken sm:px-2.5"
      >
        {current.short}
        <Icon name="chevronDown" size={15} className="text-muted" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+6px)] z-50 w-48 overflow-hidden rounded-2xl border border-line bg-surface py-1 shadow-pop">
          {LANGS.map(l => (
            <button
              key={l.code} type="button" role="menuitemradio" aria-checked={l.code === lang}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className="flex min-h-11 w-full items-center justify-between gap-3 px-4 text-left text-[15px] hover:bg-sunken"
            >
              <span className={l.code === lang ? 'font-bold' : ''}>{l.name}</span>
              {l.code === lang && <Icon name="check" size={17} className="text-brand-ink" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
