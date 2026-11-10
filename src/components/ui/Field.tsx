"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

type FieldShellProps = {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
};

export function FieldShell({ label, hint, error, htmlFor, children, className }: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-bone/90">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[12.5px] text-coral">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] text-fog">{hint}</p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "h-11 w-full rounded-[var(--radius-control)] border border-line bg-graphite px-3.5 text-[15px] text-bone placeholder:text-fog transition-colors hover:border-line-strong focus:border-lime/70 focus:outline-none aria-[invalid=true]:border-coral/70";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  suffix?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, suffix, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId} className={className}>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={cn(inputClass, suffix && "pr-12")}
          {...rest}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[13px] text-fog">
            {suffix}
          </span>
        )}
      </div>
    </FieldShell>
  );
});

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId} className={className}>
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(inputClass, "h-auto min-h-24 py-3 leading-relaxed")}
        {...rest}
      />
    </FieldShell>
  );
});

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string; error?: string };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, id, children, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId} className={className}>
      <select ref={ref} id={inputId} aria-invalid={error ? true : undefined} className={cn(inputClass, "appearance-none")} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
});
