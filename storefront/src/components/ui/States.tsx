import { useEffect, useState, type ReactNode } from 'react';
import { useT } from '../../i18n';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Spinner } from './Spinner';

/** True once something has been loading for a few seconds, so a gentle note can be shown. */
export function useSlowHint(loading: boolean, afterMs = 4000): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setSlow(true), afterMs);
    return () => { clearTimeout(timer); setSlow(false); };
  }, [loading, afterMs]);
  return slow;
}

/**
 * A page or a section that is loading: the spinner, and after a few seconds a calm note that
 * it is taking a little longer than usual. `compact` is for a section inside a page.
 */
export function PageLoader({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const slow = useSlowHint(true);
  return (
    <div className={`grid place-items-center px-4 ${compact ? 'min-h-[220px] py-10' : 'min-h-[55vh] py-16'}`}>
      <div className="flex flex-col items-center text-center">
        <Spinner size={compact ? 34 : 42} className="text-ink" />
        <p role="status" className={`mt-4 max-w-xs text-sm text-muted transition-opacity duration-500 ${slow ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!slow}>
          {t('slow.hint')}
        </p>
      </div>
    </div>
  );
}

export function EmptyState({ icon = 'box', title, message, action }: { icon?: IconName; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-14 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-sunken text-muted"><Icon name={icon} size={26} /></span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {message && <p className="mt-1 text-sm text-muted">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <div role="alert" className="mx-auto flex max-w-sm flex-col items-center px-4 py-14 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-danger-soft text-danger"><Icon name="x" size={26} /></span>
      <h2 className="text-lg font-semibold">{t('err.title')}</h2>
      <p className="mt-1 text-sm text-muted">{message}</p>
      {onRetry && <Button className="mt-5" onClick={onRetry}>{t('common.tryAgain')}</Button>}
    </div>
  );
}
