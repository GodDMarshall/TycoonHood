"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, Notice } from "@tycoonhood/ui";
import type { UndoState } from "../app/(auth)/actions";

const linkCls = "text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold";

/**
 * One button, like the confirmation page: mail scanners prefetch links, so
 * the click is what spends the token. On success the action moves this
 * browser to the new-password page, so only a failure renders here.
 */
export function UndoEmailForm({ action }: { action: (prev: UndoState, fd: FormData) => Promise<UndoState> }) {
  const [state, formAction, pending] = useActionState(action, {} as UndoState);
  return (
    <Card variant="raised" className="w-full">
      <CardHeader>
        <h1 className="display text-h2">Undo the email change</h1>
        <CardDescription>
          This puts your old address back on your account and signs out every device. You&rsquo;ll choose a new password next.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state.error && <Notice tone="danger">{state.error}</Notice>}
          <Button type="submit" size="lg" loading={pending} className="w-full">
            Undo the change
          </Button>
          {state.error && (
            <p className="text-center text-[13px] text-ink-3">
              If someone else changed your email,{" "}
              <Link href="/contact" className={linkCls}>
                contact us
              </Link>
              .
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
