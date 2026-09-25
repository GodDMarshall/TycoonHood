"use client";
/**
 * The mission author's form (spec §17, §31).
 *
 * The rule is built from discrete fields rather than a JSON textarea, because
 * the point of the engine is that a non-engineer can add a way to earn. The
 * server still validates with the engine's own parser — this form makes the
 * common rules obvious, it does not make them safe.
 */
import { useActionState, useState } from "react";
import { Button, Field, Input } from "@tycoonhood/ui";
import { saveMissionAction, type MissionFormState } from "../app/(app)/admin/missions/actions";

const EVENTS = [
  ["LESSON_COMPLETED", "completes a lesson"],
  ["COURSE_COMPLETED", "finishes a program"],
  ["QUIZ_PASSED", "passes a quiz"],
  ["CHALLENGE_COMPLETED", "completes a challenge"],
  ["DAILY_ACTIVE", "checks in for the day"],
  ["STREAK", "reaches a streak"],
  ["MINING_CLAIMED", "claims from the rig"],
  ["PURCHASE_MADE", "buys something"],
  ["ONBOARDED", "finishes onboarding"],
  ["VIDEO_WATCHED", "watches a video (needs watch-to-earn)"],
  ["COMMUNITY_CONTRIBUTION", "contributes in the community (no source yet)"],
] as const;

const NO_SOURCE = new Set(["VIDEO_WATCHED", "COMMUNITY_CONTRIBUTION"]);

export interface MissionDraft {
  id?: string;
  slug?: string;
  name?: string;
  description?: string;
  event?: string;
  count?: number | null;
  within?: string | null;
  days?: number | null;
  pillar?: string | null;
  xpReward?: number;
  thcReward?: string;
  repeatable?: boolean;
  cooldownHours?: number | null;
  active?: boolean;
}

export function MissionForm({ draft = {} }: { draft?: MissionDraft }) {
  const [state, action, pending] = useActionState<MissionFormState, FormData>(
    saveMissionAction.bind(null, draft.id ?? null),
    {}
  );
  const [event, setEvent] = useState(draft.event ?? "LESSON_COMPLETED");
  const [repeatable, setRepeatable] = useState(draft.repeatable ?? false);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Slug" htmlFor="slug" hint="lowercase-with-dashes; permanent id">
          <Input id="slug" name="slug" defaultValue={draft.slug} required />
        </Field>
        <Field label="Name" htmlFor="name" hint="what the member sees">
          <Input id="name" name="name" defaultValue={draft.name} required />
        </Field>
      </div>

      <Field label="Description" htmlFor="description">
        <Input id="description" name="description" defaultValue={draft.description} />
      </Field>

      <fieldset className="rounded-md border border-line p-4">
        <legend className="eyebrow px-2 text-gold">The rule</legend>

        <Field label="Pays when the member…" htmlFor="event">
          <select
            id="event"
            name="event"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            className="h-10 w-full rounded-md border border-line-strong bg-bg-2 px-3 text-[14px] text-ink-1"
          >
            {EVENTS.map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </Field>

        {NO_SOURCE.has(event) && (
          <p className="mt-2 text-[12px] text-warning">
            Nothing records this yet, so the engine will never pay it. Safe to save; it activates
            when that feature ships.
          </p>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {event === "STREAK" ? (
            <Field label="Consecutive days" htmlFor="days">
              <Input id="days" name="days" type="number" min={1} defaultValue={draft.days ?? 7} />
            </Field>
          ) : (
            <Field label="How many times" htmlFor="count" hint="default 1">
              <Input id="count" name="count" type="number" min={1} defaultValue={draft.count ?? 1} />
            </Field>
          )}
          <Field label="Within" htmlFor="within" hint='e.g. 7d or 24h — blank = ever'>
            <Input id="within" name="within" defaultValue={draft.within ?? ""} placeholder="7d" />
          </Field>
          {(event === "LESSON_COMPLETED" || event === "COURSE_COMPLETED") && (
            <Field label="Pillar only" htmlFor="pillar" hint="blank = any">
              <select
                id="pillar"
                name="pillar"
                defaultValue={draft.pillar ?? ""}
                className="h-10 w-full rounded-md border border-line-strong bg-bg-2 px-3 text-[14px] text-ink-1"
              >
                <option value="">Any pillar</option>
                <option value="WARRIOR">Warrior</option>
                <option value="BUILDER">Builder</option>
                <option value="TYCOON">Tycoon</option>
                <option value="MIND">Mind</option>
              </select>
            </Field>
          )}
          {event === "QUIZ_PASSED" && (
            <Field label="Minimum score %" htmlFor="minScore" hint="blank = any pass">
              <Input id="minScore" name="minScore" type="number" min={0} max={100} />
            </Field>
          )}
        </div>
      </fieldset>

      <fieldset className="rounded-md border border-line p-4">
        <legend className="eyebrow px-2 text-gold">The reward</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="XP" htmlFor="xpReward">
            <Input id="xpReward" name="xpReward" type="number" min={0} defaultValue={draft.xpReward ?? 50} />
          </Field>
          <Field label="THC" htmlFor="thcReward">
            <Input id="thcReward" name="thcReward" defaultValue={draft.thcReward ?? "100"} />
          </Field>
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-[14px] text-ink-2">
        <input
          type="checkbox"
          name="repeatable"
          defaultChecked={draft.repeatable}
          onChange={(e) => setRepeatable(e.target.checked)}
          className="accent-[#c9a227]"
        />
        Repeatable — can be earned again
      </label>

      {repeatable && (
        <Field label="Cooldown (hours)" htmlFor="cooldownHours" hint="blank = once per local day">
          <Input id="cooldownHours" name="cooldownHours" type="number" min={1} defaultValue={draft.cooldownHours ?? ""} />
        </Field>
      )}

      <label className="flex items-center gap-2 text-[14px] text-ink-2">
        <input type="checkbox" name="active" defaultChecked={draft.active ?? true} className="accent-[#c9a227]" />
        Active — members can earn it now
      </label>

      {state.error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {state.error}
        </div>
      )}
      {state.message && (
        <div className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-[13px] text-success">
          {state.message}
        </div>
      )}

      <div>
        <Button type="submit" loading={pending}>
          {draft.id ? "Save mission" : "Create mission"}
        </Button>
      </div>
    </form>
  );
}
