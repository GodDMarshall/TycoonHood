"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "../cn";

/**
 * Modal, on the native <dialog>: the browser traps focus, Escape closes,
 * the backdrop is inert, and focus returns to the opener on close — no
 * re-implemented focus management to get wrong.
 *
 *   standard      information and forms
 *   confirmation  a consequential action; the destructive choice is explicit
 *   premium       a lit moment (a rank-up, a certificate) — the gold edge
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  tone = "standard",
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  tone?: "standard" | "confirmation" | "premium";
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[min(92vw,480px)] rounded-xl border bg-bg-1 p-0 text-ink-1 shadow-[var(--shadow-3)]",
        "backdrop:bg-black/70 backdrop:backdrop-blur-[2px]",
        "open:animate-rise",
        tone === "premium" ? "border-gold-deep shadow-[var(--shadow-gold)]" : tone === "confirmation" ? "border-line-input/60" : "border-line-strong"
      )}
    >
      <div className="p-6">
        <h2 id={titleId} className="display text-[20px]">
          {title}
        </h2>
        {description && (
          <div id={descId} className="mt-2 text-[14px] leading-relaxed text-ink-2">
            {description}
          </div>
        )}
        {children && <div className="mt-5">{children}</div>}
      </div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-bg-0/40 px-6 py-4">{footer}</div>}
    </dialog>
  );
}
