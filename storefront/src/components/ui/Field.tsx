import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
}

const input = (error?: string) =>
  `block w-full rounded-xl border bg-surface px-3.5 text-base placeholder:text-muted/70 ${error ? 'border-danger' : 'border-line-strong'} focus:border-brand`;

export const TextField = forwardRef<HTMLInputElement, FieldProps & InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ label, error, hint, optional, className = '', ...rest }, ref) {
    const id = useId();
    return (
      <div className={className}>
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
          {label}{optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
        </label>
        <input
          ref={ref} id={id} className={`${input(error)} h-12`}
          aria-invalid={!!error} aria-describedby={error || hint ? `${id}-note` : undefined} {...rest}
        />
        {(error || hint) && (
          <p id={`${id}-note`} className={`mt-1.5 text-sm ${error ? 'text-danger' : 'text-muted'}`}>{error || hint}</p>
        )}
      </div>
    );
  },
);

export const TextArea = forwardRef<HTMLTextAreaElement, FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ label, error, hint, optional, className = '', ...rest }, ref) {
    const id = useId();
    return (
      <div className={className}>
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
          {label}{optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
        </label>
        <textarea
          ref={ref} id={id} rows={3} className={`${input(error)} py-3`}
          aria-invalid={!!error} aria-describedby={error || hint ? `${id}-note` : undefined} {...rest}
        />
        {(error || hint) && (
          <p id={`${id}-note`} className={`mt-1.5 text-sm ${error ? 'text-danger' : 'text-muted'}`}>{error || hint}</p>
        )}
      </div>
    );
  },
);

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{message}</p>;
}
