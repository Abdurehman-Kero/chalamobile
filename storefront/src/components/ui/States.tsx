import { useEffect, useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

/** After a few seconds of loading, explains that the shop's server may be waking up. */
export function useSlowHint(loading: boolean, afterMs = 4000): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setSlow(true), afterMs);
    return () => { clearTimeout(t); setSlow(false); };
  }, [loading, afterMs]);
  return slow;
}

export function SlowHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p role="status" className="mx-auto mt-4 max-w-md rounded-xl bg-sunken px-4 py-3 text-center text-sm text-muted">
      Waking up the shop server. The first visit can take up to a minute, thanks for your patience.
    </p>
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
  return (
    <div role="alert" className="mx-auto flex max-w-sm flex-col items-center px-4 py-14 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-danger-soft text-danger"><Icon name="x" size={26} /></span>
      <h2 className="text-lg font-semibold">We couldn't load this</h2>
      <p className="mt-1 text-sm text-muted">{message}</p>
      {onRetry && <Button className="mt-5" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}
