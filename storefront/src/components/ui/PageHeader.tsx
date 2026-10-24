import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { key } = useLocation();
  // "default" is the key of the first page opened in this tab: there is nothing before it.
  const goBack = () => (key === 'default' ? navigate(fallback) : navigate(-1));
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <button
        type="button" onClick={goBack}
        className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-sunken pl-2.5 pr-4 text-sm font-semibold transition-colors hover:bg-line"
      >
        <Icon name="chevronLeft" size={18} /> Back
      </button>
      <h1 className="min-w-0 text-2xl font-bold tracking-tight sm:text-3xl">
        {title}{note && <span className="ml-2 text-lg font-medium text-muted">{note}</span>}
      </h1>
      {children}
    </div>
  );
}
