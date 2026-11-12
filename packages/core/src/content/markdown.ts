/**
 * The one Markdown renderer. Lessons, programme previews, the admin editor's
 * preview, blog posts and library items all render through renderMarkdown().
 *
 * Authors are not all trusted: instructors write lessons and course text.
 * marked passes raw HTML and any link URL straight through, so its output is
 * cleaned with sanitize-html before anything injects it. What survives is the
 * HTML Markdown itself produces: no script, style, iframe, SVG or MathML, no
 * event handler, style, class or id attributes, and links and images only to
 * http, https, mailto (links only) or a path on this site. Absolute http(s)
 * links get rel="noopener noreferrer nofollow".
 *
 * Pure and DOM-free, so the server and the browser produce the same HTML.
 * Client components import this file by its deep path
 * (@tycoonhood/core/src/content/markdown), never the package barrel, which
 * would pull Prisma into the browser bundle.
 */
import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";

/** Its own instance, so options set on the global `marked` elsewhere never reach it. */
const markdown = new Marked({ async: false, gfm: true, breaks: false });

export const EXTERNAL_LINK_REL = "noopener noreferrer nofollow";

/** Absolute http(s) links leave the site. Any rel the author wrote is replaced. */
function linkRel(tagName: string, attribs: sanitizeHtml.Attributes): sanitizeHtml.Tag {
  const { rel: _authorRel, ...rest } = attribs;
  // Read the scheme the way the sanitiser does: browsers ignore these characters in URLs.
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point
  const href = (rest.href ?? "").replace(/[\x00-\x20]+/g, "");
  return { tagName, attribs: /^https?:/i.test(href) ? { ...rest, rel: EXTERNAL_LINK_REL } : rest };
}

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr",
    "strong", "em", "del", "code", "pre", "blockquote",
    "ul", "ol", "li", "a", "img",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel"],
    img: ["src", "alt", "title"],
    ol: ["start"],
    th: ["align"],
    td: ["align"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  // "//host" and "/\host" lead off the site without a scheme to check.
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  // Elements a browser does not parse as ordinary HTML: drop what is inside them too.
  nonTextTags: [
    "script", "style", "textarea", "option", "xmp", "title",
    "iframe", "noembed", "noframes", "noscript", "plaintext", "template",
    "svg", "math",
  ],
  transformTags: { a: linkRel },
};

/** HTML from any author, reduced to the allowlist above. */
export function sanitizeContentHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}

/** Markdown from any author, as HTML that is safe to inject. */
export function renderMarkdown(md: string): string {
  return sanitizeContentHtml(markdown.parse(md, { async: false }));
}
