import { Link } from 'react-router-dom';

/**
 * The mark: a phone with a "C" for Chala on its screen, on the amber tile.
 * The same drawing is the browser icon (public/favicon.svg), so keep the two in step.
 */
export function LogoMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={`shrink-0 ${className}`} aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="11" fill="var(--color-brand)" />
      <rect x="10" y="5.5" width="20" height="29" rx="5" fill="#171717" />
      <path d="M25.2 15.4A6.2 6.2 0 1 0 25.2 24.6" fill="none" stroke="var(--color-brand)" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

interface Props {
  /** "dark" is for the black footer. */
  tone?: 'light' | 'dark';
  /** Phones: show only the mark, to leave room for the language, cart and Log in. */
  markOnPhone?: boolean;
  onClick?: () => void;
  size?: number;
}

/** The mark and the name, as a link to the home page. */
export function Logo({ tone = 'light', markOnPhone = false, onClick, size = 36 }: Props) {
  const dark = tone === 'dark';
  return (
    <Link to="/" onClick={onClick} className="inline-flex shrink-0 items-center gap-2.5" aria-label="Chala Mobile">
      <LogoMark size={size} />
      <span className={`${markOnPhone ? 'hidden sm:inline' : ''} text-xl font-extrabold leading-none tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>
        Chala <span className={`font-medium ${dark ? 'text-brand' : 'text-brand-ink'}`}>Mobile</span>
      </span>
    </Link>
  );
}
