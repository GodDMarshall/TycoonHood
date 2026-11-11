/** Title, URL and kind for a downloadable resource. Server component. */
import { Input, Label, Select } from "@tycoonhood/ui";

export function ResourceFields({ k }: { k: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_140px]">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`r-title-${k}`}>Title</Label>
        <Input id={`r-title-${k}`} name="title" required maxLength={120} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`r-url-${k}`}>URL</Label>
        <Input id={`r-url-${k}`} name="url" required maxLength={2000} placeholder="https://… or /files/…" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`r-kind-${k}`}>Kind</Label>
        <Select id={`r-kind-${k}`} name="kind" defaultValue="link">
          <option value="link">Link</option>
          <option value="file">File</option>
          <option value="template">Template</option>
        </Select>
      </div>
    </div>
  );
}
