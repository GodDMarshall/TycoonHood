"use client";
import { useActionState, useState } from "react";
import { Button, Input, Label, Notice, Select, Textarea } from "@tycoonhood/ui";

type State = { ok?: string; error?: string };

export function PostForm({
  action,
  categories,
  groupId,
  defaultCategoryId,
  initial,
  submit,
  limits,
}: {
  action: (prev: State, fd: FormData) => Promise<State>;
  categories?: { id: string; name: string }[];
  groupId?: string;
  defaultCategoryId?: string;
  initial?: { title: string; body: string };
  submit: string;
  limits: { titleMin: number; titleMax: number; bodyMax: number };
}) {
  const [state, formAction, pending] = useActionState(action, {} as State);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {groupId && <input type="hidden" name="groupId" value={groupId} />}
      {categories && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pf-cat">Category</Label>
          <Select id="pf-cat" name="categoryId" required defaultValue={defaultCategoryId ?? ""}>
            <option value="" disabled>
              Choose one
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pf-title">Title</Label>
        <Input
          id="pf-title"
          name="title"
          required
          minLength={limits.titleMin}
          maxLength={limits.titleMax}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Say what it is about in one line"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="pf-body">Post</Label>
          <span className="text-[12px] tabular-nums text-ink-3">
            {body.length.toLocaleString("en-US")} / {limits.bodyMax.toLocaleString("en-US")}
          </span>
        </div>
        <Textarea
          id="pf-body"
          name="body"
          required
          rows={10}
          maxLength={limits.bodyMax}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Context, what you tried, what you need. Links are fine; formatting shows as written."
        />
      </div>
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      <div>
        <Button type="submit" loading={pending}>
          {submit}
        </Button>
      </div>
    </form>
  );
}
