/** The program's own fields, shared by the create and edit forms. Server component. */
import { Input, Label, Select, Textarea } from "@tycoonhood/ui";

export const STATUS_TONE = { DRAFT: "neutral", PUBLISHED: "success", ARCHIVED: "warning" } as const;

const PILLARS = [
  ["WARRIOR", "Warrior"],
  ["BUILDER", "Builder"],
  ["TYCOON", "Tycoon"],
  ["MIND", "Mind"],
] as const;

/**
 * Who teaches the program. A course manager chooses from `instructors`; anyone
 * else is shown `teacher` and the form sends no instructor at all, so saving
 * keeps it and a new program is the author's own (DR-34).
 */
type Teaching = { instructors: { id: string; name: string }[]; teacher?: never } | { instructors?: never; teacher: string | null };

export function CourseFields(
  props: {
    course?: {
      title: string;
      slug: string;
      pillar: string;
      subtitle: string | null;
      description: string;
      coverImage: string | null;
      instructorId: string | null;
      xpOnCompletion: number;
    };
  } & Teaching
) {
  const { course } = props;
  const k = course?.slug ?? "new";
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`c-title-${k}`}>Title</Label>
          <Input id={`c-title-${k}`} name="title" required maxLength={120} defaultValue={course?.title} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`c-slug-${k}`}>Slug</Label>
          <Input id={`c-slug-${k}`} name="slug" required maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={course?.slug} placeholder="my-program" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`c-pillar-${k}`}>Pillar</Label>
          <Select id={`c-pillar-${k}`} name="pillar" defaultValue={course?.pillar ?? "WARRIOR"}>
            {PILLARS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`c-instr-${k}`}>Instructor</Label>
          {props.instructors ? (
            <Select id={`c-instr-${k}`} name="instructorId" defaultValue={course?.instructorId ?? ""}>
              <option value="">None</option>
              {props.instructors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          ) : (
            <>
              {/* Shown, not sent: the field has no name, so the form carries no instructor. */}
              <Input id={`c-instr-${k}`} readOnly defaultValue={props.teacher ?? "None"} aria-describedby={`c-instr-hint-${k}`} />
              <span id={`c-instr-hint-${k}`} className="text-[12px] text-ink-3">
                Only an administrator can change it.
              </span>
            </>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`c-xp-${k}`}>XP on completion</Label>
          <Input id={`c-xp-${k}`} name="xpOnCompletion" type="number" min={0} max={10000} defaultValue={course?.xpOnCompletion ?? 500} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`c-sub-${k}`}>Subtitle</Label>
        <Input id={`c-sub-${k}`} name="subtitle" maxLength={200} defaultValue={course?.subtitle ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`c-desc-${k}`}>Description</Label>
        <Textarea id={`c-desc-${k}`} name="description" required rows={4} maxLength={5000} defaultValue={course?.description} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`c-cover-${k}`}>Cover image</Label>
        <Input id={`c-cover-${k}`} name="coverImage" maxLength={2000} defaultValue={course?.coverImage ?? ""} placeholder="/photos/cover.jpg or https://…" />
      </div>
    </>
  );
}
