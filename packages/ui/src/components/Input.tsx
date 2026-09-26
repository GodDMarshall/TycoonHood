"use client";
import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type LabelHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../cn";

/**
 * Controls. The boundary is `line-input` (3.3:1 against the page) so a field
 * is visible before it is focused; `aria-invalid` turns it danger.
 */
const fieldBase =
  "w-full rounded-md border border-line-input/70 bg-bg-0/60 px-3.5 text-[14px] text-ink-1 " +
  "placeholder:text-ink-3 transition-[border-color,background-color,box-shadow] duration-[var(--dur-2)] " +
  "hover:border-line-input focus:border-gold focus:bg-bg-0 focus:outline-none focus:shadow-[0_0_0_3px_rgb(207_169_94/0.14)] " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:shadow-[0_0_0_3px_rgb(217_112_95/0.12)] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldBase, "h-11", className)} {...props} />;
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(fieldBase, "min-h-28 py-3 leading-relaxed", className)} {...props} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <span className="relative block">
        <select ref={ref} className={cn(fieldBase, "h-11 appearance-none pr-10", className)} {...props}>
          {children}
        </select>
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    );
  }
);

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-2", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] leading-snug text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}
