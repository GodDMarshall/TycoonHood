"use client";
import { useActionState } from "react";
import { Button, Field, Input, Notice, Select, Textarea } from "@tycoonhood/ui";
import type { ContactState } from "../app/(public)/contact/actions";

export function ContactForm({
  action,
  topics,
  defaultTopic,
  defaults,
}: {
  action: (prev: ContactState, fd: FormData) => Promise<ContactState>;
  topics: readonly string[];
  defaultTopic?: string;
  defaults?: { name?: string; email?: string };
}) {
  const [state, formAction, pending] = useActionState(action, {} as ContactState);

  if (state.sent) {
    return (
      <Notice tone="success" title="Message received">
        Thank you. A person reads every message; we&rsquo;ll reply to the email you gave.
      </Notice>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="c-name">
          <Input id="c-name" name="name" autoComplete="name" maxLength={80} defaultValue={defaults?.name} required />
        </Field>
        <Field label="Email" htmlFor="c-email">
          <Input id="c-email" name="email" type="email" autoComplete="email" maxLength={200} defaultValue={defaults?.email} required />
        </Field>
      </div>
      <Field label="Topic" htmlFor="c-topic">
        <Select id="c-topic" name="topic" defaultValue={defaultTopic ?? topics[0]}>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Message" htmlFor="c-message" hint="At least 10 characters.">
        <Textarea id="c-message" name="message" rows={6} maxLength={4000} required />
      </Field>
      {/* Honeypot: hidden from people and assistive tech; bots fill it in. */}
      <div aria-hidden className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <Button type="submit" size="lg" loading={pending}>
          Send message
        </Button>
      </div>
    </form>
  );
}
