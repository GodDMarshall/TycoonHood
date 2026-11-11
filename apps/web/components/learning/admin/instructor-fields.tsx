/** An instructor's public profile fields. Server component. */
import { Input, Label, Textarea } from "@tycoonhood/ui";

export function InstructorFields({ i }: { i?: { id: string; slug: string; name: string; headline: string | null; bio: string; avatar: string | null } }) {
  const k = i?.id ?? "new";
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`i-name-${k}`}>Name</Label>
          <Input id={`i-name-${k}`} name="name" required maxLength={80} defaultValue={i?.name} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`i-slug-${k}`}>Slug (public URL /instructors/…)</Label>
          <Input id={`i-slug-${k}`} name="slug" required maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={i?.slug} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`i-head-${k}`}>Headline</Label>
          <Input id={`i-head-${k}`} name="headline" maxLength={160} defaultValue={i?.headline ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`i-avatar-${k}`}>Photo</Label>
          <Input id={`i-avatar-${k}`} name="avatar" maxLength={2000} defaultValue={i?.avatar ?? ""} placeholder="/founder/photo.jpg or https://…" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`i-bio-${k}`}>Bio</Label>
        <Textarea id={`i-bio-${k}`} name="bio" required rows={4} maxLength={4000} defaultValue={i?.bio} />
      </div>
    </>
  );
}
