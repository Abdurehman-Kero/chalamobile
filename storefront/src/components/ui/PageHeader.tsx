import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useT } from '../../i18n';
import { Icon } from './Icon';

interface Props {
  title: string;
  /** Small text after the title, e.g. a count. */
  note?: string;
  /** Where Back goes when there is nothing to go back to (the page was opened directly). */
  fallback?: string;
  children?: ReactNode;
}

/** The top of an inner page: a Back button, then the title. */
export function PageHeader({ title, note, fallback = '/', children }: Props) {
  const t = useT();
  const navigate = useNavigate();
  const { key } = useLocation();
  // "default" is the key of the first page opened in this tab: there is nothing before it.
  const goBack = () => (key === 'default' ? navigate(fallback) : navigate(-1));
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
      <button
        type="button" onClick={goBack}
        className="inline-flex h-10 items-center gap-1 rounded-xl bg-sunken pl-2 pr-3.5 text-sm font-semibold transition-colors hover:bg-line sm:h-11 sm:pl-2.5 sm:pr-4"
      >
        <Icon name="chevronLeft" size={18} /> {t('common.back')}
      </button>
      <h1 className="min-w-0 text-xl font-bold tracking-tight sm:text-3xl">
        {title}{note && <span className="ml-2 text-base font-medium text-muted sm:text-lg">{note}</span>}
      </h1>
      {children}
    </div>
  );
}
