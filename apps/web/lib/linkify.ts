/**
 * Split message text into plain runs and links. Pure (its one import is a
 * pure core helper), so a client component can render the parts as React
 * nodes — never as HTML. Only http(s) URLs become links; everything else
 * stays text.
 */
import { sliceWhole } from "@tycoonhood/core/src/text/clip";

const URL_RE = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/gi;

export type TextPart = { kind: "text"; value: string } | { kind: "link"; href: string; value: string };

export function linkify(text: string): TextPart[] {
  const out: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: "text", value: text.slice(last, at) });
    // A long link is shortened for display; never through the middle of an emoji.
    out.push({ kind: "link", href: m[0], value: m[0].length > 60 ? sliceWhole(m[0], 0, 57) + "…" : m[0] });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", value: text.slice(last) });
  return out;
}
