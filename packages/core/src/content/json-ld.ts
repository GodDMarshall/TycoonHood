/**
 * JSON-LD for a <script type="application/ld+json"> block. JSON.stringify
 * leaves "<" alone, so a course title or instructor name containing
 * "</script>" would end the block early and run whatever follows it. Every
 * JSON-LD block is written with jsonLdHtml().
 *
 * <, > and & are written as the JSON escapes \u003c, \u003e and \u0026, and
 * U+2028 and U+2029 as \u2028 and \u2029. These characters only ever appear
 * inside JSON strings, so the result is still valid JSON for the same data.
 */
const UNSAFE = /[<>&\u2028\u2029]/g;

const ESCAPED: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

export function jsonLdHtml(data: object): string {
  return JSON.stringify(data).replace(UNSAFE, (c) => ESCAPED[c]);
}
