/**
 * USER JOURNEYS, driven through a real browser against a running build.
 *
 *   1. Guest       every public page, the founder on /about, the contact form
 *   2. Sign-up     /register → onboarding → email verification → /today
 *   3. Learner     enrol, complete lessons, pass a quiz, XP rises, gating holds
 *   4. Shop        cart → coupon → sandbox checkout → order timeline → refund
 *   5. Earn        affiliate applies, is approved, a referred buyer pays
 *   6. Community   post, comment, react, report, moderator resolves
 *   7. Roles       role change, suspend/unsuspend, audit, permission walls
 *   8. Mobile      390×844: no sideways scroll, the nav opens
 *
 * Usage:  pnpm e2e:journeys              (the web app must be on :3000)
 *   JOURNEYS=1,4   run a subset (later journeys reuse the sign-up from 2)
 *   TH_WEB_LOG     the `next start` log; DEV_MODE mail (verification links) is read from it
 *   TH_SHOTS       directory for screenshots (skipped when unset)
 *   TH_WEB         base URL (default http://localhost:3000)
 *
 * Prints PASS/FAIL per check and exits non-zero when any check fails.
 * Every check is something a member or staff member could see on screen; the
 * database is read only to learn ids and quiz answers, never to assert.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import pg from "pg";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const WEB = process.env.TH_WEB ?? "http://localhost:3000";
const LOG = process.env.TH_WEB_LOG ?? "";
const SHOTS = process.env.TH_SHOTS ?? "";
const ONLY = new Set((process.env.JOURNEYS ?? "1,2,3,4,5,6,7,8").split(",").map((s) => Number(s.trim())));
const stamp = Date.now().toString(36);
const PASSWORD = "a-strong-password-here";
const ADMIN_EMAIL = "e2e-admin@tycoonhood.test";

// ── environment ────────────────────────────────────────────────────────────
for (const line of existsSync(`${ROOT}/.env`) ? readFileSync(`${ROOT}/.env`, "utf8").split("\n") : []) {
  const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const q1 = async (text, params = []) => (await db.query(text, params)).rows[0];
const qa = async (text, params = []) => (await db.query(text, params)).rows;

function fixture(...args) {
  return execFileSync("pnpm", ["--filter", "@tycoonhood/core", "exec", "tsx", "scripts/e2e-fixture.ts", ...args], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .pop();
}

// ── reporting ──────────────────────────────────────────────────────────────
let fails = 0;
let passes = 0;
const failed = [];
let current = "";
const ok = (label, cond, detail = "") => {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (cond) passes++;
  else {
    fails++;
    failed.push(`[${current}] ${label}${detail ? ` — ${detail}` : ""}`);
  }
  return !!cond;
};
const skipped = [];
/** Not verified on this server, and why. Never counted as a pass. */
const skip = (label, why) => {
  console.log(`  SKIP  ${label} — ${why}`);
  skipped.push(`[${current}] ${label} — ${why}`);
};
const pathOf = (u) => new URL(u).pathname;

// ── browser helpers ────────────────────────────────────────────────────────
const browser = await chromium.launch();
let ipSeq = 1 + Math.floor(Math.random() * 200);
/** Each context is its own visitor with its own address, so the per-IP auth throttle (10 per 10 min) never trips across a run. */
async function newCtx(opts = {}) {
  const ctx = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": `10.77.${ipSeq % 250}.${(ipSeq++ * 7) % 250}` },
    ...opts,
  });
  return ctx;
}

/** Console errors and uncaught exceptions on a page, for the "no console errors" checks. */
function watch(page) {
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${pathOf(page.url())}: ${m.text().slice(0, 300)}`);
  });
  page.on("pageerror", (e) => errors.push(`${pathOf(page.url())}: pageerror: ${String(e.message).slice(0, 200)}`));
  return errors;
}

const bodyText = (page) => page.locator("body").innerText();
async function waitText(page, re, timeout = 20000) {
  await page
    .waitForFunction((src) => new RegExp(src[0], src[1]).test(document.body.innerText), [re.source, re.flags], { timeout })
    .catch(() => {});
  return re.test(await bodyText(page));
}
async function go(page, path) {
  const r = await page.goto(`${WEB}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  return r;
}

async function signIn(ctx, email, password = PASSWORD) {
  const page = await ctx.newPage();
  await go(page, "/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await Promise.race([
    page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 }),
    page.getByRole("alert").filter({ hasText: /\S/ }).first().waitFor({ timeout: 20000 }),
  ]).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  if (pathOf(page.url()).startsWith("/login")) {
    const why = (await bodyText(page)).match(/(Too many attempts|incorrect|invalid|suspended)[^\n]*/i)?.[0];
    throw new Error(`sign-in failed for ${email}: ${why ?? "no message"}`);
  }
  return page;
}

/**
 * The verification link for this address. Preferred source: the DEV_MODE mailer's
 * log line (the dev outbox is the server log). A production build has no dev
 * mailer by design, so when nothing was logged the fixture issues a token the
 * same way sign-up does and returns the link the email would carry.
 * Returns { link, via }.
 */
async function verificationLinkFor(email, userId, timeout = 4000) {
  const logged = await loggedVerificationLink(email, timeout);
  if (logged) return { link: logged, via: "dev mail log" };
  if (!userId) return { link: null, via: "none" };
  return { link: fixture("verify-link", userId), via: "fixture (no mailer in a production build)" };
}
async function loggedVerificationLink(email, timeout) {
  if (!LOG || !existsSync(LOG)) return null;
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const log = readFileSync(LOG, "utf8");
    const at = log.lastIndexOf(`[mail:dev] to=${email} subject="Confirm your email`);
    if (at >= 0) {
      const m = log.slice(at).match(/https?:\/\/\S+\/verify-email\/[A-Za-z0-9_-]+/);
      if (m) return m[0];
    }
    await sleep(300);
  }
  return null;
}

/** Fill the onboarding wizard through the UI. */
async function onboard(page, username, displayName) {
  await page.fill("#username", username);
  await page.fill("#displayName", displayName);
  await page.locator('input[name="goals"]').first().check({ force: true });
  await page.locator('input[name="experienceLevel"]').first().check({ force: true });
  await page.getByRole("button", { name: /enter tycoonhood/i }).click();
  await page.waitForURL(/\/today/, { timeout: 20000 }).catch(() => {});
}

async function register(page, { name, email, path = "/register" }) {
  if (path) await go(page, path);
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL(/\/onboarding/, { timeout: 20000 }).catch(() => {});
}

async function noHorizontalScroll(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    bodyScroll: document.body.scrollWidth,
    inner: window.innerWidth,
  }));
}

async function shot(page, name) {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS.replace(/\/?$/, "/")}${name}.png`, fullPage: false });
  console.log(`        (screenshot ${name}.png)`);
}

async function xpOf(page) {
  await go(page, "/profile");
  const m = (await bodyText(page)).match(/Level\s+\d+\s*·\s*([\d,]+)\s*XP/);
  return m ? Number(m[1].replace(/,/g, "")) : NaN;
}

// ── shared state between journeys ──────────────────────────────────────────
const S = {
  member: { email: `e2e-j-${stamp}@tycoonhood.test`, username: `j${stamp}`.slice(0, 20), name: "Journey Member" },
};
let adminCtx;
let adminPage;
let memberCtx;

async function admin() {
  if (!adminPage) {
    fixture("admin", ADMIN_EMAIL, PASSWORD);
    adminCtx = await newCtx();
    adminPage = await signIn(adminCtx, ADMIN_EMAIL);
  }
  return adminPage;
}

/** The member from journey 2; signed up via a fixture (and verified via the UI) when journey 2 is skipped. */
async function member() {
  if (memberCtx) return memberCtx;
  memberCtx = await newCtx();
  const id = fixture("member", S.member.email, PASSWORD, S.member.name);
  S.member.id = id;
  S.member.username = (await q1(`select username from "Profile" where "userId"=$1`, [id])).username;
  // Mark the email verified the way the link does: through the UI.
  const page = await signIn(memberCtx, S.member.email);
  const { link } = await verificationLinkFor(S.member.email, id);
  if (link) {
    await page.goto(link);
    await page.getByRole("button", { name: /confirm my email/i }).click();
    await waitText(page, /confirmed|verified|dashboard/i);
  }
  await page.close();
  return memberCtx;
}

async function journey(n, title, fn) {
  if (!ONLY.has(n)) return;
  current = `J${n} ${title}`;
  console.log(`\n══ ${n}. ${title} ══`);
  try {
    await fn();
  } catch (e) {
    ok(`journey ${n} ran to the end`, false, String(e?.message ?? e).split("\n")[0].slice(0, 300));
  }
}

// ════════════════════════════════════════════════════════════════════════════
await journey(1, "GUEST — PUBLIC PAGES", async () => {
  const ctx = await newCtx();
  const pages = [
    "/",
    "/about",
    "/learning",
    "/programs",
    "/programs/warrior",
    "/earn",
    "/earn/terms",
    "/marketplace",
    "/marketplace/founders-playbook",
    "/connect",
    "/blog",
    "/success-stories",
    "/contact",
    "/faq",
    "/terms",
    "/privacy",
    "/refund-policy",
  ];
  for (const path of pages) {
    const page = await ctx.newPage();
    const errors = watch(page);
    const r = await go(page, path);
    const h1 = await page.locator("h1").count();
    const h1Text = h1 ? (await page.locator("h1").first().innerText()).replace(/\s+/g, " ").slice(0, 50) : "";
    ok(
      `${path} → 200, has an h1, no console errors`,
      r?.status() === 200 && h1 > 0 && errors.length === 0,
      `status ${r?.status()}, h1 "${h1Text}"${errors.length ? `, errors: ${errors.join(" | ")}` : ""}`
    );
    if (path === "/") await shot(page, "home-desktop");
    if (path === "/about") {
      const img = page.locator('img[alt^="Harsha"]').first();
      const src = decodeURIComponent((await img.getAttribute("src").catch(() => "")) ?? "");
      const loaded = await img.evaluate((el) => el.complete && el.naturalWidth > 0).catch(() => false);
      ok("/about shows the founder photo /founder/harsha.jpg", src.includes("/founder/harsha.jpg") && loaded, src);
      ok("/about names the founder HARSHA", /HARSHA/.test(await page.locator("h1").first().innerText()));
      await shot(page, "about-desktop");
    }
    if (path === "/contact") {
      await page.fill("#c-name", "Journey Guest");
      await page.fill("#c-email", `guest-${stamp}@tycoonhood.test`);
      await page.selectOption("#c-topic", { index: 1 });
      await page.fill("#c-message", "Hello from the browser journey check — please ignore this test message.");
      await page.getByRole("button", { name: /send message/i }).click();
      ok("contact form submits", await waitText(page, /Message received/));
    }
    await page.close();
  }
  await ctx.close();
});

// ════════════════════════════════════════════════════════════════════════════
await journey(2, "SIGN UP → ONBOARDING → VERIFY → TODAY", async () => {
  memberCtx = await newCtx();
  const page = await memberCtx.newPage();
  const errors = watch(page);
  await register(page, { name: S.member.name, email: S.member.email });
  ok("register lands on onboarding", pathOf(page.url()) === "/onboarding", page.url());
  await onboard(page, S.member.username, S.member.name);
  ok("onboarding lands on /today", pathOf(page.url()) === "/today", page.url());
  ok("today shows the unverified-email banner", await waitText(page, /Confirm your email/, 8000));
  S.member.id = (await q1(`select id from "User" where email=$1`, [S.member.email]))?.id;

  const { link, via } = await verificationLinkFor(S.member.email, S.member.id);
  ok("a verification link is available", !!link, `via ${via}`);
  if (link) {
    await page.goto(link);
    await page.getByRole("button", { name: /confirm my email/i }).click();
    ok("verification link confirms the email", await waitText(page, /Go to your dashboard/));
    await page.getByRole("link", { name: /go to your dashboard/i }).click();
    await page.waitForURL(/\/today/, { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});
    ok("lands on the /today dashboard", pathOf(page.url()) === "/today" && (await page.locator("h1").count()) > 0, page.url());
    ok("the verify banner is gone", !/Confirm your email — we sent/.test(await bodyText(page)));
    // A spent link must not work twice.
    await page.goto(link);
    await page.getByRole("button", { name: /confirm my email/i }).click();
    ok("a used link is refused", await waitText(page, /invalid|expired|already|used/i));
  }
  ok("no console errors during sign-up", errors.length === 0, errors.join(" | "));
  await page.close();
});

// ════════════════════════════════════════════════════════════════════════════
await journey(3, "LEARNER — ENROL, COMPLETE, QUIZ, XP, GATING", async () => {
  const ctx = await member();
  const page = await ctx.newPage();
  const errors = watch(page);
  const lessons = await qa(
    `select l.id, l.title, l.type from "Lesson" l join "CourseModule" m on m.id=l."moduleId" join "Course" c on c.id=m."courseId"
     where c.slug='warrior' order by m."sortOrder", l."sortOrder"`
  );
  const xp0 = await xpOf(page);

  await go(page, "/courses/warrior");
  await page.locator("main").getByRole("button", { name: /enroll/i }).first().click();
  // Enrolling returns to the programme page, now with the way in.
  const start = page.locator(`main a[href="/courses/warrior/lesson/${lessons[0].id}"]`).filter({ hasText: /start|continue|begin|lesson/i }).first();
  await start.waitFor({ timeout: 20000 }).catch(() => {});
  ok("enrolling offers the first lesson", (await start.count()) > 0 && !(await page.locator("main").getByRole("button", { name: /enroll/i }).count()));
  await start.click();
  await page.waitForURL(/\/lesson\//, { timeout: 20000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  ok("the first lesson opens", page.url().includes(`/lesson/${lessons[0].id}`), page.url());
  await shot(page, "lesson-desktop");

  // Gating: the third lesson is locked until the second is done.
  await go(page, `/courses/warrior/lesson/${lessons[2].id}`);
  ok("a later lesson is locked before its predecessor", /This lesson opens when you finish/.test(await bodyText(page)));
  await go(page, `/courses/warrior/lesson/${lessons[10].id}`);
  ok("a lesson far ahead is locked too", /This lesson opens when you finish/.test(await bodyText(page)));

  // Complete the reading/assignment lessons through the button.
  for (let i = 0; i < 3; i++) {
    await go(page, `/courses/warrior/lesson/${lessons[i].id}`);
    await page.getByRole("button", { name: /complete and continue/i }).click();
    await page.waitForURL((u) => !u.pathname.endsWith(lessons[i].id), { timeout: 20000 }).catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});
    ok(`completes "${lessons[i].title}" and moves on`, page.url().includes(lessons[i + 1].id), page.url());
  }

  // Quiz with the right answers.
  const quiz = await qa(
    `select qq."correctIndex" from "QuizQuestion" qq join "Quiz" q on q.id=qq."quizId" where q."lessonId"=$1 order by qq."sortOrder"`,
    [lessons[3].id]
  );
  await go(page, `/courses/warrior/lesson/${lessons[3].id}`);
  for (let i = 0; i < quiz.length; i++) {
    await page.locator(`input[name="q${i}"][value="${quiz[i].correctIndex}"]`).check({ force: true });
  }
  await page.getByRole("button", { name: /submit answers/i }).click();
  ok("quiz with correct answers passes", await waitText(page, /Passed/), (await bodyText(page)).match(/\d+% · \d+\/\d+/)?.[0] ?? "");

  // The next module is open now, the one after still locked.
  await go(page, `/courses/warrior/lesson/${lessons[4].id}`);
  ok("the next module's first lesson is open after the quiz", !/This lesson opens when you finish/.test(await bodyText(page)));
  await go(page, `/courses/warrior/lesson/${lessons[6].id}`);
  ok("gating still holds further on", /This lesson opens when you finish/.test(await bodyText(page)));

  const xp1 = await xpOf(page);
  ok("XP increased", xp1 > xp0, `${xp0} → ${xp1} XP`);

  await go(page, "/certificates");
  ok("/certificates loads", (await page.locator("h1").innerText()).includes("Certificates"));
  ok("no console errors while learning", errors.length === 0, errors.join(" | "));
  await page.close();
});

// ════════════════════════════════════════════════════════════════════════════
await journey(4, "SHOP — CART, COUPON, SANDBOX CHECKOUT, ORDER, REFUND", async () => {
  // Admin creates a coupon through the UI.
  const a = await admin();
  const coupon = `E2E${stamp.toUpperCase()}`.slice(0, 16);
  await go(a, "/admin/coupons");
  await a.fill("#c-code", coupon);
  await a.fill("#c-desc", "Browser journey check");
  await a.selectOption("#c-type", "percent");
  await a.fill("#c-value", "20");
  await a.check('input[name="active"]');
  await a.getByRole("button", { name: /create coupon/i }).click();
  ok("admin creates a coupon", await waitText(a, new RegExp(`${coupon}`)));

  const ctx = await member();
  const page = await ctx.newPage();
  const errors = watch(page);
  await go(page, "/store");
  ok("/store lists products", (await page.locator('a[href^="/store/"]').count()) > 0);
  await page.locator('a[href="/store/founders-playbook"]').first().click();
  await page.waitForURL(/\/store\/founders-playbook/);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.getByRole("button", { name: /add to cart/i }).click();
  await waitText(page, /added|in your cart|view cart/i, 10000);
  await go(page, "/cart");
  ok("the cart holds the item", /Founder's Playbook/.test(await bodyText(page)));

  await go(page, "/checkout");
  const checkoutText = await bodyText(page);
  S.sandbox = /Test mode — no real money is charged/.test(checkoutText);
  let orderId;
  if (S.sandbox) {
    ok("checkout is clearly labelled TEST mode", true);
    await page.fill("#coupon", coupon);
    await page.getByRole("button", { name: /^apply$/i }).click();
    ok("coupon applies with a saving shown", await waitText(page, /You save/), (await bodyText(page)).match(/[^\n]*You save[^\n]*/)?.[0] ?? "");
    await shot(page, "checkout-desktop");
    await page.getByRole("button", { name: /continue to payment/i }).click();
    await page.waitForURL(/\/checkout\/[^/]+$/, { timeout: 20000 }).catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});
    orderId = pathOf(page.url()).split("/")[2];
    ok("order placed, on the payment step", /^c[a-z0-9]{20,}$/.test(orderId ?? ""), page.url());
    const payText = await bodyText(page);
    ok("payment step is labelled test mode", /Test mode/.test(payText) && /\(test\)/.test(payText));
    ok("discount shows on the order", new RegExp(`Coupon ${coupon}`).test(payText));
    await page.getByRole("button", { name: /\(test\)/ }).click();
    await page.waitForURL(/\/done/, { timeout: 20000 }).catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});
    ok("sandbox payment succeeds", pathOf(page.url()).endsWith("/done"), page.url());
  } else {
    // A production build never runs the sandbox (DEV_MODE needs NODE_ENV!=production).
    const why = checkoutText.match(/Card payments are not configured[^\n]*/)?.[0] ?? "no test-mode banner and no rupee provider";
    skip("checkout in SANDBOX mode, labelled test mode", `${why} — run against \`next dev\` with DEV_MODE=true for the sandbox`);
    skip("coupon on a rupee checkout", "coupons apply to rupee payments only, and no rupee provider is configured");
    await shot(page, "checkout-desktop");
    // Still prove the rest of the order flow, paying with THC.
    fixture("fund", S.member.id, "20000");
    await go(page, "/checkout");
    await page.locator('input[name="rail"][value="thc"]').check();
    await page.getByRole("button", { name: /^pay .* THC$/i }).click();
    await page.waitForURL(/\/done/, { timeout: 20000 }).catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});
    orderId = pathOf(page.url()).split("/")[2];
    ok("THC checkout succeeds (fallback, no sandbox)", pathOf(page.url()).endsWith("/done"), page.url());
  }

  await go(page, "/orders");
  ok("the order is listed in /orders", (await page.locator(`a[href="/orders/${orderId}"]`).count()) > 0);
  await go(page, `/orders/${orderId}`);
  const steps = await page.locator('ol[aria-label="Order status"] li').count();
  ok("the order shows its timeline", steps >= 2, `${steps} steps`);
  if (S.sandbox) ok("the order page carries the test-mode label", /test/i.test(await bodyText(page)));
  await page.fill("#refund-reason", "Bought by the journey check — refund please, this was a test purchase.");
  await page.getByRole("button", { name: /request a refund/i }).click();
  const gone = await page.locator("#refund-reason").waitFor({ state: "detached", timeout: 15000 }).then(() => true, () => false);
  ok("refund request accepted", gone, (await page.locator('[role="alert"], [role="status"]').allInnerTexts().catch(() => [])).join(" ").slice(0, 160));
  S.refundOrder = orderId;

  await go(a, "/admin/refunds");
  const shortId = orderId.slice(-6).toUpperCase();
  ok("admin sees the refund request", new RegExp(`#${shortId}`).test(await bodyText(a)), `order #${shortId}`);
  ok("no console errors while shopping", errors.length === 0, errors.join(" | "));
  await page.close();
});

// ════════════════════════════════════════════════════════════════════════════
await journey(5, "EARN — AFFILIATE LINK → REFERRED PURCHASE → COMMISSION", async () => {
  const ctx = await member();
  const page = await ctx.newPage();
  const errors = watch(page);
  await go(page, "/earnings");
  await page.fill("#aff-channels", "A newsletter about training and discipline, sent weekly to readers.");
  await page.selectOption("#aff-method", "UPI");
  await page.fill("#aff-upi", "journey@okbank");
  await page.locator('input[name="acceptTerms"]').check();
  await page.getByRole("button", { name: /^apply$/i }).click();
  ok("affiliate application submitted", await waitText(page, /review|pending|waiting/i));

  const a = await admin();
  await go(a, "/admin/earn?tab=applications&status=all");
  const row = a.locator("p", { hasText: `@${S.member.username} ·` }).first();
  ok("admin sees the application", (await row.count()) > 0, `@${S.member.username}`);
  const card = row.locator('xpath=ancestor::div[contains(@class,"py-3.5")][1]');
  await card.getByRole("button", { name: /^approve$/i }).click();
  ok("admin approves it", await card.getByText(/approved/i).first().waitFor({ timeout: 15000 }).then(() => true, () => false));

  await go(page, "/earnings");
  const link = (await bodyText(page)).match(/https?:\/\/[^\s]+\/r\/([A-Z0-9]+)/);
  ok("member now has an affiliate link /r/<code>", !!link, link?.[0] ?? "no /r/ link on /earnings");
  if (!link) return;
  const code = link[1];

  // A different visitor follows the link, signs up and buys.
  const buyerCtx = await newCtx();
  const buyer = await buyerCtx.newPage();
  const berrors = watch(buyer);
  await buyer.goto(`${WEB}/r/${code}`);
  await buyer.waitForLoadState("networkidle").catch(() => {});
  const cookies = await buyerCtx.cookies();
  ok("the link sets the affiliate cookie", cookies.some((c) => c.name === "th_aff" && c.value === code));
  S.buyer = { email: `e2e-b-${stamp}@tycoonhood.test`, username: `b${stamp}`.slice(0, 20), name: "Journey Buyer" };
  await register(buyer, { name: S.buyer.name, email: S.buyer.email });
  await onboard(buyer, S.buyer.username, S.buyer.name);
  ok("the referred visitor signs up and onboards", pathOf(buyer.url()) === "/today", buyer.url());
  await go(buyer, "/store/founders-playbook");
  await buyer.getByRole("button", { name: /add to cart/i }).click();
  await waitText(buyer, /added|in your cart|view cart/i, 10000);
  await go(buyer, "/checkout");
  if (!/Test mode — no real money is charged/.test(await bodyText(buyer))) {
    skip("referred buyer pays in sandbox; admin sees the commission", "no rupee provider on this server (sandbox needs DEV_MODE=true and NODE_ENV!=production); commissions are paid only on rupee orders");
    S.buyerCtx = buyerCtx;
    return;
  }
  await buyer.getByRole("button", { name: /continue to payment/i }).click();
  await buyer.waitForURL(/\/checkout\/[^/]+$/, { timeout: 20000 }).catch(() => {});
  await buyer.getByRole("button", { name: /\(test\)/ }).click();
  await buyer.waitForURL(/\/done/, { timeout: 20000 }).catch(() => {});
  ok("the referred buyer pays (sandbox)", pathOf(buyer.url()).endsWith("/done"), buyer.url());
  S.buyerCtx = buyerCtx;

  await go(a, "/admin/earn?tab=commissions&status=all");
  const t = await bodyText(a);
  const hit = new RegExp(`to @${S.member.username}[\\s\\S]{0,300}?buyer ${S.buyer.email.replace(/[.]/g, "\\.")}`).test(t);
  ok("admin sees a commission for the affiliate", hit, t.match(new RegExp(`[^\\n]*to @${S.member.username}[^\\n]*`))?.[0] ?? "none listed");
  ok("the commission is pending/held", /Pending|hold until/i.test(t));
  ok("no console errors (affiliate)", errors.length === 0, errors.join(" | "));
  ok("no console errors (buyer)", berrors.length === 0, berrors.join(" | "));
  await page.close();
});

// ════════════════════════════════════════════════════════════════════════════
await journey(6, "COMMUNITY — POST, COMMENT, REACT, REPORT, MODERATE", async () => {
  const ctx = await member();
  const page = await ctx.newPage();
  const errors = watch(page);
  await go(page, "/community/discussions/new");
  await page.selectOption("#pf-cat", { index: 1 });
  const title = `Journey check ${stamp}: how do you keep a training contract?`;
  await page.fill("#pf-title", title);
  await page.fill("#pf-body", "Posted by the browser journey check. What helps you keep showing up on the bad days?");
  await page.getByRole("button", { name: /^post$/i }).click();
  await page.waitForURL(/\/community\/discussions\/(?!new)[^/]+$/, { timeout: 20000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  const postUrl = page.url();
  ok("discussion posted", (await page.locator("h1").innerText().catch(() => "")).includes(stamp), postUrl);

  // Someone else comments, reacts and reports it.
  let otherCtx = S.buyerCtx;
  if (!otherCtx) {
    const email = `e2e-o-${stamp}@tycoonhood.test`;
    fixture("member", email, PASSWORD, "Journey Other");
    otherCtx = await newCtx();
    (await signIn(otherCtx, email)).close();
  }
  const other = await otherCtx.newPage();
  const oerrors = watch(other);
  await other.goto(postUrl);
  await other.waitForLoadState("networkidle").catch(() => {});
  await other.fill("#cf-body", "Same time every day, and a minimum session for the bad ones.");
  await other.getByRole("button", { name: /^comment$/i }).click();
  ok("another member comments", await waitText(other, /minimum session for the bad ones/));
  const respect = other.getByRole("button", { name: /^Respect/ }).first();
  await respect.click();
  await other.waitForFunction(() => document.querySelector('button[aria-pressed="true"]'), null, { timeout: 10000 }).catch(() => {});
  ok("they react to the post", (await respect.getAttribute("aria-pressed")) === "true");
  // The reaction is saved by a server action in a transition; the buttons are disabled until it settles.
  await other.waitForFunction(() => { const b = [...document.querySelectorAll("button[aria-pressed]")]; return b.length && b.every((x) => !x.disabled); }, null, { timeout: 15000 }).catch(() => {});
  await other.waitForLoadState("networkidle").catch(() => {});
  await other.reload();
  await other.waitForLoadState("networkidle").catch(() => {});
  ok("the reaction persists", (await other.getByRole("button", { name: /^Respect/ }).first().getAttribute("aria-pressed")) === "true");
  await other.getByRole("button", { name: /^report$/i }).first().click();
  const reason = `Journey report ${stamp}: off-topic test content`;
  await other.getByRole("dialog").locator("textarea").fill(reason);
  await other.getByRole("button", { name: /send report/i }).click();
  ok("they report the post", await waitText(other, /Reported/));

  const a = await admin();
  await go(a, "/admin/moderation");
  const card = a.locator("li, article, div").filter({ hasText: reason }).last();
  ok("the report reaches /admin/moderation", (await card.count()) > 0);
  const acts = a.locator("form", { has: a.getByRole("button") }).filter({ hasText: /Hide|Remove|Dismiss/ });
  void acts;
  // Resolve it: hide the post (the moderator action), from the report's own card.
  const reportCard = a.locator(":is(li,article,section,div)").filter({ hasText: reason }).filter({ has: a.getByRole("button", { name: /^hide$/i }) }).last();
  if ((await reportCard.count()) > 0) await reportCard.getByRole("button", { name: /^hide$/i }).first().click();
  else await a.locator(":is(li,article,section,div)").filter({ hasText: reason }).getByRole("button", { name: /^dismiss$/i }).last().click();
  await a.waitForLoadState("networkidle").catch(() => {});
  await a.waitForTimeout(800);
  await go(a, "/admin/moderation");
  ok("the report leaves the open queue", !(await bodyText(a)).includes(reason));
  await go(a, "/admin/moderation?status=ACTIONED");
  const actioned = (await bodyText(a)).includes(reason);
  if (!actioned) await go(a, "/admin/moderation?status=DISMISSED");
  ok("the report is recorded as resolved", actioned || (await bodyText(a)).includes(reason));

  for (const p of ["/leaderboard", "/achievements"]) {
    const r = await go(page, p);
    ok(`${p} loads`, r?.status() === 200 && (await page.locator("h1").count()) > 0);
  }
  ok("no console errors (poster)", errors.length === 0, errors.join(" | "));
  ok("no console errors (other member)", oerrors.length === 0, oerrors.join(" | "));
  await page.close();
  await other.close();
});

// ════════════════════════════════════════════════════════════════════════════
await journey(7, "ADMIN AND ROLES", async () => {
  const a = await admin();
  const errors = watch(a);
  const email = `e2e-t-${stamp}@tycoonhood.test`;
  const targetId = fixture("member", email, PASSWORD, "Journey Target");

  await go(a, `/admin/members/${targetId}`);
  ok("member detail page opens", (await bodyText(a)).includes("Journey Target"));
  await a.selectOption("#role", "INSTRUCTOR");
  await a.getByRole("button", { name: /change role/i }).click();
  const status = a.locator('main [role="status"]').filter({ hasText: /\S/ }).first();
  const said = await status.waitFor({ timeout: 15000 }).then(() => status.innerText(), () => "");
  ok("admin changes the role to Instructor", !!said, said || "no confirmation shown");

  // The instructor's walls.
  const tctx = await newCtx();
  const t = await signIn(tctx, email);
  let r = await go(t, "/admin/courses");
  ok("an INSTRUCTOR can open /admin/courses", pathOf(t.url()) === "/admin/courses" && r?.status() === 200, t.url());
  await go(t, "/admin/members");
  ok("an INSTRUCTOR cannot open /admin/members", pathOf(t.url()) !== "/admin/members", `went to ${pathOf(t.url())}`);

  // A plain member is turned away from /admin.
  const m = await (await member()).newPage();
  await go(m, "/admin");
  ok("a MEMBER is redirected away from /admin", !pathOf(m.url()).startsWith("/admin"), `went to ${pathOf(m.url())}`);
  await go(m, "/admin/members");
  ok("a MEMBER is redirected away from /admin/members", !pathOf(m.url()).startsWith("/admin"), `went to ${pathOf(m.url())}`);
  await m.close();

  // Suspend, then lift it.
  await go(a, `/admin/members/${targetId}`);
  await a.getByRole("button", { name: /^suspend member$/i }).click();
  await a.getByRole("dialog").getByRole("button", { name: /^suspend member$/i }).click();
  ok("admin suspends the member", await waitText(a, /Suspended \d|Lift suspension/));
  await go(t, "/today");
  ok("the suspended member is signed out", pathOf(t.url()).startsWith("/login"), t.url());
  await go(a, `/admin/members/${targetId}`);
  await a.getByRole("button", { name: /^lift suspension$/i }).click();
  await a.getByRole("dialog").getByRole("button", { name: /^lift suspension$/i }).click();
  ok("admin lifts the suspension", await waitText(a, /Suspend member/));

  await go(a, "/admin/audit?action=user.");
  const auditText = await bodyText(a);
  const linked = await a.locator(`a[href="/admin/members/${targetId}"]`).count();
  ok("audit log shows the role change", /user\.role\.change/.test(auditText));
  ok("audit log shows the suspension", /user\.suspend\b/.test(auditText));
  ok("audit log shows the unsuspension", /user\.unsuspend/.test(auditText));
  ok("audit rows link to the member", linked >= 3, `${linked} rows`);
  await shot(a, "admin-desktop");
  ok("no console errors (admin)", errors.length === 0, errors.join(" | "));
  await tctx.close();
});

// ════════════════════════════════════════════════════════════════════════════
await journey(8, "MOBILE 390×844", async () => {
  const mctx = await member();
  await admin();
  const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  const memberPhone = await newCtx({ ...phone, storageState: await mctx.storageState() });
  const adminPhone = await newCtx({ ...phone, storageState: await adminCtx.storageState() });
  const guestPhone = await newCtx(phone);
  const firstLesson = (
    await q1(
      `select l.id from "Lesson" l join "CourseModule" m on m.id=l."moduleId" join "Course" c on c.id=m."courseId" where c.slug='warrior' order by m."sortOrder", l."sortOrder" limit 1`
    )
  ).id;
  const cases = [
    [guestPhone, "/", "home-phone"],
    [guestPhone, "/about", "about-phone"],
    [memberPhone, "/today", null],
    [memberPhone, "/store", null],
    [memberPhone, `/courses/warrior/lesson/${firstLesson}`, "lesson-phone"],
    [adminPhone, "/admin", "admin-phone"],
  ];
  for (const [ctx, path, name] of cases) {
    const page = await ctx.newPage();
    await go(page, path);
    await page.waitForTimeout(300);
    const w = await noHorizontalScroll(page);
    ok(`${path.replace(/[a-z0-9]{20,}/, "<id>")} has no horizontal scroll`, w.scrollWidth <= w.inner && w.bodyScroll <= w.inner, `scrollWidth ${w.scrollWidth}/${w.bodyScroll}, innerWidth ${w.inner}`);
    if (name) await shot(page, name);

    if (ctx === guestPhone && path === "/") {
      const open = page.getByRole("button", { name: /open menu/i });
      ok("public nav: the menu button is visible", await open.isVisible());
      await open.click();
      const nav = page.locator('nav[aria-label="Primary"]').last();
      await nav.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
      const learn = nav.getByRole("link", { name: /learn/i }).first();
      ok("public nav: the menu opens with links", await learn.isVisible().catch(() => false));
      await learn.click().catch(() => {});
      await page.waitForURL((u) => pathOf(u.href) !== "/", { timeout: 10000 }).catch(() => {});
      ok("public nav: a menu link navigates", pathOf(page.url()) !== "/", page.url());
    } else if (ctx !== guestPhone) {
      const bar = page.locator('nav[aria-label="App"]').last();
      ok(`${path.split("/")[1] || "home"}: bottom app nav is visible`, await bar.isVisible());
      if (path === "/today") {
        await page.getByRole("button", { name: /^more$/i }).click();
        const sheet = page.locator('dialog[aria-label="More"]');
        ok("app nav: More opens the sheet", await sheet.isVisible().catch(() => false));
        const link = sheet.getByRole("link").first();
        const href = await link.getAttribute("href");
        await link.click();
        await page.waitForURL((u) => pathOf(u.href) !== "/today", { timeout: 10000 }).catch(() => {});
        ok("app nav: a link in More navigates", pathOf(page.url()) === href, `${href} → ${pathOf(page.url())}`);
      }
      if (path === "/store") {
        await page.locator('a[href="/store/founders-playbook"]').first().click();
        await page.waitForURL(/founders-playbook/, { timeout: 10000 }).catch(() => {});
        ok("store: a product opens by tap", page.url().includes("founders-playbook"));
        const w2 = await noHorizontalScroll(page);
        ok("store product page has no horizontal scroll", w2.scrollWidth <= w2.inner, `scrollWidth ${w2.scrollWidth}, innerWidth ${w2.inner}`);
        await page.getByRole("button", { name: /add to cart/i }).click();
        await waitText(page, /added|in your cart|view cart/i, 10000);
        await go(page, "/checkout");
        const w3 = await noHorizontalScroll(page);
        ok("checkout has no horizontal scroll", w3.scrollWidth <= w3.inner, `scrollWidth ${w3.scrollWidth}, innerWidth ${w3.inner}`);
        await shot(page, "checkout-phone");
      }
    }
    await page.close();
  }
  await memberPhone.close();
  await adminPhone.close();
  await guestPhone.close();
});

// ── summary ────────────────────────────────────────────────────────────────
await browser.close();
await db.end();
console.log(`\n${"═".repeat(60)}\n${fails === 0 ? "ALL PASS" : "FAILURES"}: ${passes} passed, ${fails} failed, ${skipped.length} skipped`);
for (const f of failed) console.log(`  FAIL ${f}`);
for (const f of skipped) console.log(`  SKIP ${f}`);
process.exit(fails === 0 ? 0 : 1);
