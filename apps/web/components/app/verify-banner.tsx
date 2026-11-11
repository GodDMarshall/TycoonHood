"use client";
/**
 * Shown across the member app until the email is confirmed. Dismissible for
 * the rest of the browser session; it comes back next time, because the
 * account still is not verified. Never blocks anything — learning works
 * either way.
 *
 * It says "we sent a link" only when one went out (see lib/mail/verification).
 * With no mail provider it says so and offers no button that cannot work.
 */
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import type { VerifyLinkState } from "@tycoonhood/core";
import { Button, Icon, buttonStyles } from "@tycoonhood/ui";

type State = { ok?: string; error?: string };
const KEY = "th_verify_banner_dismissed";
const linkCls = "text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold";

export function VerifyBanner({
  email,
  link,
  resend,
}: {
  email: string;
  /** Where the member's confirmation link stands, worked out on the server. */
  link: VerifyLinkState;
  resend: (prev: State, fd: FormData) => Promise<State>;
}) {
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

  const address = <span className="text-ink-1">{email}</span>;
  const message = {
    sent: <>Confirm your email — we sent a link to {address}.</>,
    logged: <>Confirm your email. Dev mode: nothing was emailed — the link for {address} is in the server log.</>,
    unsent: <>Confirm your email. We couldn&rsquo;t send a link to {address}, or it has expired. Send a new one, or contact us.</>,
    off: <>Confirm your email. We couldn&rsquo;t send a link to {address}: email isn&rsquo;t available right now. Try again later, or contact us.</>,
  }[link];
  const offerContact = !!state.error || link === "unsent" || link === "off";

  return (
    <div role="region" aria-label="Confirm your email" className="border-b border-gold-deep/40 bg-bg-1">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-10">
        <Icon name="info" size={16} className="shrink-0 text-gold" />
        <p className="min-w-0 flex-1 text-[13.5px] text-ink-2">
          {state.ok ?? state.error ?? message}{" "}
          <Link href="/settings#email" className={linkCls}>
            Wrong address?
          </Link>
        </p>
        <div className="flex items-center gap-2">
          {offerContact && (
            <Link href="/contact" className={buttonStyles({ variant: "ghost", size: "sm" })}>
              Contact us
            </Link>
          )}
          {link !== "off" && (
            <form action={formAction}>
              <Button type="submit" size="sm" variant="secondary" loading={pending}>
                {link === "unsent" ? "Send a new link" : "Resend link"}
              </Button>
            </form>
          )}
        </div>
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
