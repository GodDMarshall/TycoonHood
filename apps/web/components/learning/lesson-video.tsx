/** A lesson's video: an embedded privacy-enhanced player, or a plain link. Server component. */
import { Badge, Icon } from "@tycoonhood/ui";
import { videoEmbed } from "../../lib/video";

export function LessonVideo({ url, title }: { url: string | null; title: string }) {
  const v = videoEmbed(url);
  if (!v) return null;
  if (v.kind === "link") {
    return (
      <a
        href={v.href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 flex items-center gap-3 rounded-lg border border-line bg-bg-1 p-4 text-[14.5px] text-ink-1 hover:border-gold-deep"
      >
        <Icon name="play" size={18} className="text-gold" />
        <span className="flex-1">Watch the video for this lesson</span>
        <Icon name="external" size={15} className="text-ink-3" />
      </a>
    );
  }
  return (
    <div className="mt-6 aspect-video overflow-hidden rounded-lg border border-line bg-black">
      <iframe
        src={v.src}
        title={title}
        className="size-full"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

export const RESOURCE_KIND_LABEL: Record<string, string> = { link: "Link", file: "File", template: "Template" };

/** Downloadable resources with a kind badge. */
export function ResourceList({ resources }: { resources: { id: string; title: string; url: string; kind: string }[] }) {
  if (resources.length === 0) return null;
  return (
    <ul className="flex flex-col divide-y divide-line">
      {resources.map((r) => (
        <li key={r.id}>
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 py-2.5 text-[14px] text-ink-1 hover:text-gold-bright"
          >
            <Icon name={r.kind === "link" ? "external" : "download"} size={15} className="text-ink-3" />
            <span className="min-w-0 flex-1 truncate">{r.title}</span>
            <Badge tone="neutral">{RESOURCE_KIND_LABEL[r.kind] ?? r.kind}</Badge>
          </a>
        </li>
      ))}
    </ul>
  );
}
