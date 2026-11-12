/**
 * ACCESSIBILITY AUDIT of the public site, with axe-core, in a real browser.
 *
 *   pnpm e2e:a11y                 (the web app must be on :3000)
 *   TH_WEB                        base URL (default http://localhost:3000)
 *
 * Every public page, and the sign-in pages, at a desktop width (1280×800) and
 * a phone width (390×844), against the WCAG 2.0 and 2.1 A and AA rules. It
 * prints each rule that fails, with how many elements fail it and where, and
 * exits non-zero when any violation is serious or critical.
 */
import { chromium } from "playwright";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AXE = require.resolve("axe-core/axe.min.js");
const WEB = process.env.TH_WEB ?? "http://localhost:3000";

const PAGES = [
  "/", "/about", "/learning", "/programs", "/earn", "/earn/terms", "/marketplace", "/connect",
  "/blog", "/success-stories", "/challenges", "/thc", "/roadmap", "/status", "/contact", "/faq",
  "/terms", "/privacy", "/refund-policy", "/login", "/register", "/forgot-password",
];
const VIEWPORTS = [
  { name: "desktop", viewport: { width: 1280, height: 800 } },
  { name: "phone", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const browser = await chromium.launch();
const failures = [];
let pagesChecked = 0;

// The four programme pages and one blog post, found from the site itself.
{
  const page = await browser.newPage();
  await page.goto(`${WEB}/programs`, { waitUntil: "networkidle" });
  const programmes = await page.$$eval('a[href^="/programs/"]', (as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
  await page.goto(`${WEB}/blog`, { waitUntil: "networkidle" });
  const posts = await page.$$eval('a[href^="/blog/"]', (as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
  PAGES.push(...programmes, ...posts.slice(0, 1));
  await page.close();
}

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: vp.viewport, isMobile: vp.isMobile, hasTouch: vp.hasTouch, reducedMotion: "reduce" });
  for (const path of PAGES) {
    const page = await ctx.newPage();
    const res = await page.goto(`${WEB}${path}`, { waitUntil: "networkidle" });
    if (!res || res.status() >= 400) {
      failures.push({ vp: vp.name, path, rule: "page-loads", impact: "critical", nodes: [`HTTP ${res?.status()}`], help: "The page did not load" });
      await page.close();
      continue;
    }
    await page.addScriptTag({ path: AXE });
    const result = await page.evaluate(async (tags) => {
      // eslint-disable-next-line no-undef
      const r = await axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] });
      return r.violations.map((v) => ({ rule: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) , count: v.nodes.length }));
    }, TAGS);
    pagesChecked++;
    for (const v of result) failures.push({ vp: vp.name, path, ...v });
    const tag = result.length ? `${result.length} rule(s)` : "clean";
    console.log(`  ${result.length ? "FAIL" : "PASS"}  [${vp.name}] ${path} — ${tag}`);
    for (const v of result) console.log(`        ${v.impact}: ${v.rule} × ${v.count} — ${v.help} — e.g. ${v.nodes.join(" | ")}`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();

const serious = failures.filter((f) => f.impact === "serious" || f.impact === "critical");
console.log(`\n${"═".repeat(60)}`);
console.log(`${pagesChecked} page views checked (${PAGES.length} pages × ${VIEWPORTS.length} widths).`);
console.log(`${failures.length} violations: ${serious.length} serious or critical, ${failures.length - serious.length} moderate or minor.`);
process.exit(serious.length ? 1 : 0);
