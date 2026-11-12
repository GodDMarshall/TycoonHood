import { describe, it, expect } from "vitest";
import { jsonLdHtml } from "../src/content/json-ld";

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

/** The block exactly as the programme page writes it. */
const block = (data: object) => `<script type="application/ld+json">${jsonLdHtml(data)}</script>`;

describe("jsonLdHtml — JSON-LD that cannot end its own <script> block", () => {
  const course = (name: string, description: string, instructor: string) => ({
    "@context": "https://schema.org",
    "@type": "Course",
    name,
    description,
    provider: { "@type": "Organization", name: "Tycoonhood" },
    isAccessibleForFree: true,
    instructor: { "@type": "Person", name: instructor },
    aggregateRating: { "@type": "AggregateRating", ratingValue: 4.5, ratingCount: 12, bestRating: 5, worstRating: 1 },
  });

  it("keeps a course whose fields try to break out inside one script element", () => {
    const data = course(
      "</script><script>alert(document.domain)</script>",
      "Fine print </SCRIPT ><img src=x onerror=alert(1)> and <!--<script>",
      "</script><script>fetch('/admin/members')</script>",
    );
    // What the page wrote before: the first "</script>" ends the block.
    expect(JSON.stringify(data)).toMatch(/<\/script/i);
    const html = block(data);
    // One opening tag and one closing tag: the ones the page wrote.
    expect(html.match(/<script/gi)).toHaveLength(1);
    expect(html.match(/<\/script/gi)).toHaveLength(1);
    expect(html.endsWith("</script>")).toBe(true);
    expect(jsonLdHtml(data)).not.toMatch(/[<>]/);
  });

  it("escapes <, > and & as JSON unicode escapes", () => {
    expect(jsonLdHtml({ name: "<b>AT&T</b>" })).toBe('{"name":"\\u003cb\\u003eAT\\u0026T\\u003c/b\\u003e"}');
  });

  it("escapes U+2028 and U+2029", () => {
    const out = jsonLdHtml({ name: `a${LINE_SEPARATOR}b${PARAGRAPH_SEPARATOR}c` });
    expect(out).toBe('{"name":"a\\u2028b\\u2029c"}');
    expect(out).not.toContain(LINE_SEPARATOR);
    expect(out).not.toContain(PARAGRAPH_SEPARATOR);
  });

  it("is still JSON for the same data", () => {
    const data = course(
      `Business </script> Mastery & <more> ${LINE_SEPARATOR}${PARAGRAPH_SEPARATOR}`,
      "Unit economics, \"pricing\" and \\ back-slashes",
      "Harsha",
    );
    expect(JSON.parse(jsonLdHtml(data))).toEqual(data);
  });

  it("leaves ordinary data exactly as JSON.stringify writes it", () => {
    const data = course("Warrior", "Discipline, built daily.", "Harsha");
    expect(jsonLdHtml(data)).toBe(JSON.stringify(data));
  });
});
