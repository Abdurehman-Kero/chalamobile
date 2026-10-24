import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg' | 'sm';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-hover disabled:bg-line-strong disabled:text-muted',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-sunken disabled:text-muted',
  ghost: 'bg-transparent text-brand-ink hover:bg-brand-soft',
};
const SIZE: Record<Size, string> = {
  sm: 'min-h-10 px-3.5 text-sm',
  md: 'min-h-11 px-5 text-[15px]',
  lg: 'min-h-12 px-6 text-base',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', extra = '') =>
  `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed ${VARIANT[variant]} ${SIZE[size]} ${extra}`;

interface BaseProps { variant?: Variant; size?: Size; className?: string; children: ReactNode }

export function Button({ variant, size, className, children, ...rest }: BaseProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={buttonClass(variant, size, className)} {...rest}>{children}</button>;
}

export function LinkButton({ variant, size, className, children, ...rest }: BaseProps & LinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest}>{children}</Link>;
}
