import { useT } from '../../i18n';

/**
 * The one loading spinner of the store: a light ring with an amber arc turning round it.
 * It carries a hidden label so screen readers announce that something is loading.
 */
export function Spinner({ size = 28, className = '', label }: { size?: number; className?: string; label?: string }) {
  const t = useT();
  return (
    <span role="status" className={`inline-flex shrink-0 ${className}`}>
      <svg
        width={size} height={size} viewBox="0 0 24 24" fill="none"
        className="animate-spin motion-reduce:animate-none" aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.18" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="var(--color-brand)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label ?? t('common.loading')}</span>
    </span>
  );
}
