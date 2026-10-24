import { useEffect, useState } from 'react';
import { useT } from '../../i18n';
import { Icon } from '../ui/Icon';

/** Appears after scrolling down a screen or so, and jumps back to the top. */
export function BackToTop() {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={t('common.backToTop')}
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-4 right-3 z-30 inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-3 text-sm font-semibold shadow-pop transition-all duration-200 hover:bg-sunken sm:bottom-5 sm:right-6 sm:h-12 sm:px-4 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <Icon name="arrowUp" size={18} />
      <span className="hidden sm:inline">{t('common.backToTop')}</span>
    </button>
  );
}
