"use client";
import { useActionState } from "react";
import { Button, Field, Input, Textarea } from "@tycoonhood/ui";
import type { AdminActionState } from "../app/(app)/admin/actions";

export function PostEditor({
  action,
  initial,
}: {
  action: (prev: AdminActionState, fd: FormData) => Promise<AdminActionState>;
  initial: { title: string; slug: string; excerpt: string; contentMd: string; published: boolean } | null;
}) {
  const [state, formAction, pending] = useActionState(action, {} as AdminActionState);
  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      {state.error && <p className="text-[13px] text-danger">{state.error}</p>}
      <Field label="Title" htmlFor="title"><Input id="title" name="title" defaultValue={initial?.title} /></Field>
      <Field label="Slug" htmlFor="slug"><Input id="slug" name="slug" defaultValue={initial?.slug} placeholder="lowercase-with-dashes" /></Field>
      <Field label="Excerpt" htmlFor="excerpt"><Input id="excerpt" name="excerpt" defaultValue={initial?.excerpt} /></Field>
      <Field label="Content (Markdown)" htmlFor="contentMd">
        <Textarea id="contentMd" name="contentMd" rows={18} defaultValue={initial?.contentMd} className="figures text-[13px]" />
      </Field>
      <label className="flex items-center gap-3 text-[14px] text-ink-1">
        <input type="checkbox" name="publish" defaultChecked={initial?.published ?? false} className="accent-[#c9a227]" />
        Published
      </label>
      <div><Button type="submit" loading={pending}>Save essay</Button></div>
    </form>
  );
}
