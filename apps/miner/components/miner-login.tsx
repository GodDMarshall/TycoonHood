"use client";
import { useActionState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, CoinMark, Field, Input } from "@tycoonhood/ui";
import { minerLoginAction, type MinerFormState } from "../app/actions";

export function MinerLogin({ mainSiteUrl }: { mainSiteUrl: string }) {
  const [state, formAction, pending] = useActionState(minerLoginAction, {} as MinerFormState);
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 py-12">
      <CoinMark size={72} className="mb-6" />
      <h1 className="display mb-1 text-[28px]">Tycoonhood Miner</h1>
      <p className="mb-8 text-center text-[13px] text-ink-2">
        Your rig, your ledger. Sign in with your Tycoonhood account.
      </p>
      <Card variant="raised" className="w-full">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>One account across the whole house.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            {state.error && (
              <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
                {state.error}
              </p>
            )}
            <Field label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" autoComplete="email" />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input id="password" name="password" type="password" autoComplete="current-password" />
            </Field>
            <Button type="submit" loading={pending}>Start mining</Button>
            <p className="text-center text-[12px] text-ink-3">
              New here?{" "}
              <a href={`${mainSiteUrl}/register`} className="text-gold hover:underline underline-offset-4">
                Create your account at Tycoonhood
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
