/**
 * Where a lesson's video plays. YouTube and Vimeo embed through their
 * privacy-enhanced players (youtube-nocookie.com, Vimeo with dnt=1); any
 * other https URL is shown as a link rather than embedded blindly.
 */
import { extractVideoId } from "./youtube";

export type VideoEmbed = { kind: "youtube" | "vimeo"; src: string } | { kind: "link"; href: string };

export function vimeoId(raw: string): string | null {
  const m = raw.trim().match(/^https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{6,12})(?:[/?#]|$)/i);
  return m ? m[1] : null;
}

export function videoEmbed(url: string | null | undefined): VideoEmbed | null {
  if (!url) return null;
  const yt = /youtu\.?be/i.test(url) ? extractVideoId(url) : null;
  if (yt) return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1` };
  const vm = vimeoId(url);
  if (vm) return { kind: "vimeo", src: `https://player.vimeo.com/video/${vm}?dnt=1` };
  if (/^https:\/\//i.test(url)) return { kind: "link", href: url };
  return null;
}
