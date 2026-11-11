"use client";
/**
 * Shown across the member app until the email is confirmed. Dismissible for
 * the rest of the browser session; it comes back next time, because the
 * account still is not verified. Never blocks anything — learning works
 * either way.
 */
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Button, Icon } from "@tycoonhood/ui";

type State = { ok?: string; error?: string };
const KEY = "th_verify_banner_dismissed";

export function VerifyBanner({ email, resend }: { email: string; resend: (prev: State, fd: FormData) => Promise<State> }) {
  const [hidden, setHidden] = useState(true);
  const [state, formAction, pending] = useActionState(resend, {} as State);

  useEffect(() => {
    try {
      setHidden(sessionStorage.getItem(KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* private mode: dismissed for this page view only */
    }
  };

  return (
    <div role="region" aria-label="Confirm your email" className="border-b border-gold-deep/40 bg-bg-1">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-10">
        <Icon name="info" size={16} className="shrink-0 text-gold" />
        <p className="min-w-0 flex-1 text-[13.5px] text-ink-2">
          {state.ok ?? state.error ?? (
            <>
              Confirm your email — we sent a link to <span className="text-ink-1">{email}</span>.{" "}
              <Link href="/settings#email" className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">
                Wrong address?
              </Link>
            </>
          )}
        </p>
        <form action={formAction}>
          <Button type="submit" size="sm" variant="secondary" loading={pending}>
            Resend link
          </Button>
        </form>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex size-8 items-center justify-center rounded-md text-ink-3 hover:bg-bg-2 hover:text-ink-1"
        >
          <Icon name="x" size={16} />
        </button>
      </div>
    </div>
  );
}
