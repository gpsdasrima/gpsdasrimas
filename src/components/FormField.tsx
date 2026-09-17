import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

interface BaseProps {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
}

export function TextField({
  label,
  error,
  required,
  hint,
  ...rest
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-chalk-300">
        {label} {required && <span className="text-signal-red">*</span>}
      </span>
      <input
        {...rest}
        className={`mt-1.5 w-full rounded-xl border bg-ink-900 px-3.5 py-2.5 text-sm text-chalk-100 placeholder:text-chalk-500 focus:outline-none ${
          error ? 'border-signal-red' : 'border-ink-600 focus:border-signal-yellow'
        }`}
      />
      {hint && !error && <span className="mt-1 block text-xs text-chalk-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-signal-red">{error}</span>}
    </label>
  );
}

export function TextAreaField({
  label,
  error,
  required,
  hint,
  ...rest
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-chalk-300">
        {label} {required && <span className="text-signal-red">*</span>}
      </span>
      <textarea
        {...rest}
        className={`mt-1.5 w-full rounded-xl border bg-ink-900 px-3.5 py-2.5 text-sm text-chalk-100 placeholder:text-chalk-500 focus:outline-none ${
          error ? 'border-signal-red' : 'border-ink-600 focus:border-signal-yellow'
        }`}
      />
      {hint && !error && <span className="mt-1 block text-xs text-chalk-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-signal-red">{error}</span>}
    </label>
  );
}

export function SelectField({
  label,
  error,
  required,
  children,
  ...rest
}: BaseProps & { children: ReactNode } & Omit<InputHTMLAttributes<HTMLSelectElement>, 'children'>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-chalk-300">
        {label} {required && <span className="text-signal-red">*</span>}
      </span>
      <select
        {...(rest as React.SelectHTMLAttributes<HTMLSelectElement>)}
        className={`mt-1.5 w-full rounded-xl border bg-ink-900 px-3.5 py-2.5 text-sm text-chalk-100 focus:outline-none ${
          error ? 'border-signal-red' : 'border-ink-600 focus:border-signal-yellow'
        }`}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-xs text-signal-red">{error}</span>}
    </label>
  );
}
