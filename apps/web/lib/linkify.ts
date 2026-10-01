/**
 * Split message text into plain runs and links. Pure and dependency-free, so
 * a client component can render the parts as React nodes — never as HTML.
 * Only http(s) URLs become links; everything else stays text.
 */
const URL_RE = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/gi;

export type TextPart = { kind: "text"; value: string } | { kind: "link"; href: string; value: string };

export function linkify(text: string): TextPart[] {
  const out: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: "text", value: text.slice(last, at) });
    out.push({ kind: "link", href: m[0], value: m[0].length > 60 ? m[0].slice(0, 57) + "…" : m[0] });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", value: text.slice(last) });
  return out;
}
