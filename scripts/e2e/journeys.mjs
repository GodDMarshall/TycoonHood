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
 *   9. 3D campus   /world is optional: phones, tablets, reduced motion and
 *                  software GPUs get its 2D page, and nothing else loads three
 *
 * Usage:  pnpm e2e:journeys              (the web app must be on :3000)
 *   JOURNEYS=1,4   run a subset (later journeys reuse the sign-up from 2)
 *   TH_WEB_LOG     the `next start` log; DEV_MODE mail (verification links) is read from it
 *   TH_SHOTS       directory for screenshots (skipped when unset)
 *   TH_WEB         base URL (default http://localhost:3000)
 *   TH_WORLD_ENGINE=1  journey 9 also loads the 3D engine on Chromium's software
 *                  GPU, posing as a hardware one, and drives every way back to
 *                  2D (slow: SwiftShader draws about a frame a second, so its
 *                  frames are timed as 16 ms ones unless a check says otherwise)
 *
 * Prints PASS/FAIL per check and exits non-zero when any check fails.
 * Every check is something a member or staff member could see on screen; the
 * database is read only to learn ids and quiz answers, never to assert.
 */
import { chromium, devices } from "playwright";
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
const ONLY = new Set((process.env.JOURNEYS ?? "1,2,3,4,5,6,7,8,9").split(",").map((s) => Number(s.trim())));
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

// ════════════════════════════════════════════════════════════════════════════
await journey(9, "3D CAMPUS — OPTIONAL, 2D FALLBACK", async () => {
  // DR-31: the campus is an optional extra for signed-in members on a computer
  // with a real GPU. Headless Chromium draws WebGL in software (SwiftShader),
  // so here every visit is expected to get the 2D page.
  const SECTIONS = ["Today", "Courses", "Community", "Leaderboard", "Mining", "Store"];
  const RETIRED = /\b(Command Center|Arena|Vault|Treasury|Network|HQ)\b/;
  const SOFTWARE = ["software-gpu", "no-webgl2"];
  const MAC_SAFARI = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
  const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  /** The status line's words for each way the page stays, or goes back to, 2D (world-host.tsx). */
  const WHY = {
    device: "The 3D campus is made for a computer. Everything in it is below.",
    narrow: "The campus needs a window at least 1024 pixels wide.",
    "reduced-motion": "Your device asks for less motion, so the campus stays 2D.",
    gpu: "This browser can't draw the campus smoothly.",
    "load-failed": "The campus didn't finish loading.",
    "context-lost": "The graphics stopped responding, so the campus closed.",
    "too-slow": "The campus ran too slowly on this device, so it closed.",
    chosen: "You're on the 2D view.",
  };
  await admin();
  const storageState = await (await member()).storageState();

  /**
   * Every name /world could leak if it ever showed people rather than counts:
   * usernames, display names, names and emails of the top ten of this week's
   * board and of all time, of everyone active in the last 24 hours, and of the
   * e2e admin. Never the viewer, nor a name the viewer shares.
   */
  async function leakableNames(viewerEmail) {
    const me = await q1(`select u.id, u.name, p.username, p."displayName" from "User" u join "Profile" p on p."userId"=u.id where u.email=$1`, [viewerEmail]);
    const now = new Date();
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((now.getUTCDay() + 6) % 7)));
    const top = (since) =>
      qa(
        `select e."userId" as id from "XpEvent" e join "User" u on u.id=e."userId" left join "Profile" p on p."userId"=u.id
         where u."suspendedAt" is null and e."createdAt" >= $1 and (p.privacy ->> 'leaderboard') is distinct from 'false'
         group by e."userId" having sum(e.amount) > 0 order by sum(e.amount) desc limit 10`,
        [since]
      );
    const active = await qa(
      `select "userId" as id from "StandardDay" where "metAt" >= now() - interval '1 day'
       union select "userId" from "LessonProgress" where "completedAt" >= now() - interval '1 day'
       union select "authorId" from "Message" where "createdAt" >= now() - interval '1 day'
       union select "authorId" from "CommunityPost" where "createdAt" >= now() - interval '1 day'
       union select "userId" from "UserAchievement" where "unlockedAt" >= now() - interval '1 day'
       union select id from "User" where email = $1`,
      [ADMIN_EMAIL]
    );
    const ids = [...new Set([...(await top(monday)), ...(await top(new Date(0))), ...active].map((r) => r.id))].filter((id) => id !== me.id);
    const rows = await qa(`select u.email, u.name, p.username, p."displayName" from "User" u join "Profile" p on p."userId"=u.id where u.id = any($1)`, [ids]);
    const mine = new Set([me.name, me.username, me.displayName].filter(Boolean).map((n) => n.toLowerCase()));
    const names = new Set();
    for (const r of rows) for (const n of [r.username, r.displayName, r.name, r.email]) if (n && n.length >= 4 && !mine.has(n.toLowerCase())) names.add(n);
    return [...names];
  }

  /** Every request a page makes, and every script it ran that carries three.js's renderer. */
  function loads(page) {
    const seen = { urls: [], three: [], pending: [] };
    page.on("request", (r) => seen.urls.push(r.url()));
    page.on("response", (r) => {
      if (r.request().resourceType() !== "script") return;
      seen.pending.push(
        r.text().then(
          (body) => body.includes("isWebGLRenderer") && seen.three.push(pathOf(r.url())),
          () => {}
        )
      );
    });
    return seen;
  }
  const settled = (seen) => Promise.all(seen.pending);
  const campusAssets = (seen) => seen.urls.filter((u) => /^\/world\/(tex|hdri|models)\//.test(pathOf(u)));
  const state = (page) =>
    page.evaluate(() => {
      const r = document.querySelector("[data-world-root]");
      return r && { mode: r.getAttribute("data-world-mode"), reason: r.getAttribute("data-world-fallback"), engine: r.getAttribute("data-world-engine") };
    });
  /** The device's decision: waits for the 2D page, then reads whatever the host says. */
  async function decision(page) {
    await page.waitForSelector("[data-world-root][data-world-mode='2d']", { timeout: 20000 }).catch(() => {});
    return state(page);
  }
  const worldLinks = (page) => page.locator('a[href^="/world"]').count();
  const line = async (page) => (await page.locator("[data-world-root] [role='status']").innerText().catch(() => "")).trim();

  // ── a guest is asked to sign in first
  {
    const ctx = await newCtx();
    const page = await ctx.newPage();
    await go(page, "/world");
    const u = new URL(page.url());
    ok("guest: /world goes to sign-in, then back to /world", u.pathname === "/login" && u.searchParams.get("next") === "/world", `${u.pathname}${u.search}`);
    ok("guest: no campus is rendered", (await page.locator("[data-world-root]").count()) === 0);
    await ctx.close();
  }

  // ── desktop member, 1280×720, software GPU
  const desk = await newCtx({ storageState });
  {
    const page = await desk.newPage();
    const errors = watch(page);
    const seen = loads(page);
    const r = await go(page, "/world");
    const d = await decision(page);
    await settled(seen);
    ok("desktop: /world answers 200", r?.status() === 200, `status ${r?.status()}`);
    ok("desktop: the software GPU keeps the 2D page", d?.mode === "2d" && SOFTWARE.includes(d.reason), JSON.stringify(d));
    ok("desktop: no canvas", (await page.locator("canvas").count()) === 0);
    ok("desktop: no campus texture, HDRI or model is fetched", campusAssets(seen).length === 0, campusAssets(seen).join(", "));
    ok("desktop: no script carries three.js", seen.three.length === 0, seen.three.join(", "));
    const robots = await page.locator('meta[name="robots"]').getAttribute("content").catch(() => null);
    ok("desktop: the page asks not to be indexed", /noindex/.test(robots ?? ""), robots ?? "no meta robots");
    const h1 = await page.locator("h1").count();
    ok("desktop: exactly one h1", h1 === 1, `${h1} h1`);
    const heads = (await page.locator("[data-world-card] h2").allInnerTexts()).map((t) => t.trim());
    ok("desktop: six cards, Today to Store", heads.join() === SECTIONS.join(), heads.join(", "));
    const text = await bodyText(page);
    ok("desktop: none of the retired HQ names appear", !RETIRED.test(text), text.match(RETIRED)?.[0] ?? "");
    const said = await line(page);
    ok("desktop: the status line says why, in the page's words", said === WHY.gpu, said);
    await shot(page, "world-desktop");

    const hrefs = [...new Set(await page.locator("[data-world-root] a[href^='/']").evaluateAll((as) => as.map((a) => a.getAttribute("href"))))];
    const broken = [];
    for (const href of hrefs) {
      const res = await desk.request.get(`${WEB}${href}`, { maxRedirects: 0, failOnStatusCode: false });
      if (res.status() !== 200) broken.push(`${href} → ${res.status()} ${res.headers().location ?? ""}`.trim());
    }
    ok("desktop: every link on the 2D page opens (200, no redirect)", hrefs.length >= 15 && broken.length === 0, broken.join(", ") || `${hrefs.length} links`);

    // The page and its inlined payload: counts only, never a member it could have shown.
    const html = await page.content();
    const leakable = await leakableNames(S.member.email);
    const leaked = leakable.filter((n) => html.includes(n));
    ok("desktop: counts only, none of the board's top members or the day's active members in the page", leakable.length > 0 && leaked.length === 0, leaked.length ? leaked.slice(0, 5).join(", ") : `${leakable.length} names looked for`);
    ok("no console errors (desktop)", errors.length === 0, errors.join(" | "));
    await page.close();
  }

  // ── the one way in: a quiet sidebar link, never prefetched
  {
    const page = await desk.newPage();
    const errors = watch(page);
    const seen = loads(page);
    await go(page, "/today");
    const link = page.locator('aside a[href="/world"]');
    await link.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    const label = (await link.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    ok("/today: the sidebar offers the 3D campus, marked optional", /3D campus/.test(label) && /optional/.test(label), label || "no link");
    const n = await worldLinks(page);
    ok("/today: it is the only link to /world", n === 1, `${n} links`);
    await settled(seen);
    const fetched = [...campusAssets(seen), ...seen.three, ...seen.urls.filter((u) => pathOf(u) === "/world")];
    ok("/today: nothing of the campus is fetched or prefetched", fetched.length === 0, fetched.join(", "));
    await link.click();
    await page.waitForURL((u) => pathOf(u.href) === "/world", { timeout: 20000 }).catch(() => {});
    const d = await decision(page);
    ok("the sidebar link opens /world on the 2D page", pathOf(page.url()) === "/world" && d?.mode === "2d", `${pathOf(page.url())} ${JSON.stringify(d)}`);
    const current = await page.locator('aside a[href="/world"]').getAttribute("aria-current").catch(() => null);
    ok("/world: the sidebar link is marked as the current page", current === "page", String(current));
    ok("no console errors (sidebar link)", errors.length === 0, errors.join(" | "));
    await page.close();
  }

  // ── ?world= picks a tier for QA; it never skips a gate
  {
    const page = await desk.newPage();
    const errors = watch(page);
    const seen = loads(page);
    await go(page, "/world?world=cinematic");
    const d = await decision(page);
    await settled(seen);
    ok("desktop ?world=cinematic: still 2D on a software GPU", d?.mode === "2d" && SOFTWARE.includes(d.reason), JSON.stringify(d));
    ok("desktop ?world=cinematic: nothing of the campus is fetched", campusAssets(seen).length === 0 && seen.three.length === 0, [...campusAssets(seen), ...seen.three].join(", "));
    ok("no console errors (override)", errors.length === 0, errors.join(" | "));
    await page.close();
  }

  // ── no WebGL2 at all
  {
    const ctx = await newCtx({ storageState });
    await ctx.addInitScript(() => {
      const getContext = window.HTMLCanvasElement.prototype.getContext;
      window.HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        return type === "webgl2" ? null : getContext.call(this, type, ...rest);
      };
    });
    const page = await ctx.newPage();
    const errors = watch(page);
    await go(page, "/world");
    const d = await decision(page);
    ok("no WebGL2: the 2D page (no-webgl2), saying why", d?.mode === "2d" && d.reason === "no-webgl2" && (await line(page)) === WHY.gpu, `${JSON.stringify(d)} "${await line(page)}"`);
    ok("no console errors (no WebGL2)", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  // ── reduced motion
  {
    const ctx = await newCtx({ storageState, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    const errors = watch(page);
    await go(page, "/world");
    const d = await decision(page);
    ok("reduced motion: the 2D page (reduced-motion), saying why", d?.mode === "2d" && d.reason === "reduced-motion" && (await line(page)) === WHY["reduced-motion"], `${JSON.stringify(d)} "${await line(page)}"`);
    await go(page, "/today");
    await page.waitForTimeout(800);
    ok("reduced motion: /today has no campus link", (await worldLinks(page)) === 0);
    ok("no console errors (reduced motion)", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  // ── a narrow window: the line promises nothing the device can't keep
  {
    const ctx = await newCtx({ storageState, viewport: { width: 1000, height: 720 } });
    const page = await ctx.newPage();
    const errors = watch(page);
    await go(page, "/world");
    const d = await decision(page);
    ok("narrow window (1000 px): the 2D page (narrow), naming the width it needs", d?.reason === "narrow" && (await line(page)) === WHY.narrow, `${JSON.stringify(d)} "${await line(page)}"`);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForSelector("[data-world-root]:not([data-world-fallback='narrow'])", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(300);
    const wide = await state(page);
    const walk = await page.getByRole("button", { name: "Walk the campus" }).count();
    ok("widened, on a software GPU: the real reason, and no offer to walk", SOFTWARE.includes(wide?.reason) && (await line(page)) === WHY.gpu && walk === 0, `${JSON.stringify(wide)} "${await line(page)}", ${walk} walk buttons`);
    ok("no console errors (narrow)", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
  {
    const ctx = await newCtx({ storageState, reducedMotion: "reduce", viewport: { width: 1000, height: 720 } });
    const page = await ctx.newPage();
    const errors = watch(page);
    await go(page, "/world");
    const d = await decision(page);
    ok("reduced motion in a narrow window: reduced-motion, not narrow", d?.reason === "reduced-motion" && (await line(page)) === WHY["reduced-motion"], `${JSON.stringify(d)} "${await line(page)}"`);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(800);
    const wide = await state(page);
    const walk = await page.getByRole("button", { name: "Walk the campus" }).count();
    ok("reduced motion, widened: still reduced-motion, and no offer to walk", wide?.reason === "reduced-motion" && walk === 0, `${JSON.stringify(wide)}, ${walk} walk buttons`);
    ok("no console errors (reduced motion, narrow)", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  // ── phone, as in journey 8
  {
    const ctx = await newCtx({ ...phone, storageState });
    const page = await ctx.newPage();
    const errors = watch(page);
    const seen = loads(page);
    const r = await go(page, "/world");
    const d = await decision(page);
    ok("phone: /world answers 200 with the 2D page (phone), saying why", r?.status() === 200 && d?.mode === "2d" && d.reason === "phone" && (await line(page)) === WHY.device, `status ${r?.status()} ${JSON.stringify(d)} "${await line(page)}"`);
    ok("phone: no canvas", (await page.locator("canvas").count()) === 0);
    const w = await noHorizontalScroll(page);
    ok("phone: /world has no horizontal scroll", w.scrollWidth <= w.inner && w.bodyScroll <= w.inner, `scrollWidth ${w.scrollWidth}/${w.bodyScroll}, innerWidth ${w.inner}`);
    await shot(page, "world-phone");
    await go(page, "/world?world=cinematic");
    const d2 = await decision(page);
    ok("phone ?world=cinematic: still the 2D page (phone)", d2?.mode === "2d" && d2.reason === "phone", JSON.stringify(d2));
    await go(page, "/today");
    await page.waitForTimeout(800);
    ok("phone: the bottom nav has no campus link", (await page.locator('nav[aria-label="App"] a[href^="/world"]').count()) === 0);
    await page.getByRole("button", { name: /^more$/i }).click();
    const sheet = page.locator('dialog[aria-label="More"]');
    await sheet.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    const inSheet = await sheet.locator('a[href^="/world"]').count();
    ok("phone: the More sheet opens and has no campus link", (await sheet.isVisible().catch(() => false)) && inSheet === 0, `${inSheet} links`);
    await settled(seen);
    ok("phone: nothing of the campus is fetched", campusAssets(seen).length === 0 && seen.three.length === 0, [...campusAssets(seen), ...seen.three].join(", "));
    ok("no console errors (phone)", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  // ── tablets: an iPad, and an iPad that asks for the desktop site
  {
    const { defaultBrowserType: _browser, ...ipad } = devices["iPad Pro 11"];
    const ctx = await newCtx({ ...ipad, storageState });
    const page = await ctx.newPage();
    const errors = watch(page);
    await go(page, "/world");
    const d = await decision(page);
    ok("iPad Pro 11: the 2D page (tablet), saying why", d?.mode === "2d" && d.reason === "tablet" && (await line(page)) === WHY.device, `${JSON.stringify(d)} "${await line(page)}"`);
    ok("no console errors (iPad)", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
  {
    const ctx = await newCtx({ storageState, userAgent: MAC_SAFARI, hasTouch: true, viewport: { width: 1194, height: 834 } });
    const page = await ctx.newPage();
    const errors = watch(page);
    await go(page, "/world");
    const d = await decision(page);
    ok("iPad as a desktop (Mac UA, touch, 1194×834): the 2D page (tablet), saying why", d?.mode === "2d" && d.reason === "tablet" && (await line(page)) === WHY.device, `${JSON.stringify(d)} "${await line(page)}"`);
    await go(page, "/today");
    await page.waitForTimeout(800);
    const sidebar = page.locator("aside", { has: page.locator('nav[aria-label="App"]') });
    ok("iPad as a desktop: the sidebar shows, with no campus link", (await sidebar.isVisible().catch(() => false)) && (await worldLinks(page)) === 0);
    ok("no console errors (iPad as a desktop)", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  // ── search engines
  {
    const robots = await (await desk.request.get(`${WEB}/robots.txt`)).text();
    ok("robots.txt disallows /world", /^Disallow: \/world$/m.test(robots));
    const sitemap = await (await desk.request.get(`${WEB}/sitemap.xml`)).text();
    ok("sitemap.xml does not list /world", !/\/world(?=[/<?"]|$)/m.test(sitemap));
  }

  // ── sign-in still lands on /today, and comes back to /world only when asked
  {
    const ctx = await newCtx();
    const page = await signIn(ctx, S.member.email);
    ok("sign-in from /login still lands on /today", pathOf(page.url()) === "/today", pathOf(page.url()));
    await ctx.close();
  }
  {
    const ctx = await newCtx();
    const page = await ctx.newPage();
    const errors = watch(page);
    await go(page, "/world");
    await page.fill('input[name="email"]', S.member.email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 }).catch(() => {});
    const d = await decision(page);
    ok("a guest who signs in from /world comes back to its 2D page", pathOf(page.url()) === "/world" && d?.mode === "2d", `${pathOf(page.url())} ${JSON.stringify(d)}`);
    ok("no console errors (sign-in return)", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }

  // ── optional: the engine itself, on the software GPU posing as a hardware one
  if (process.env.TH_WORLD_ENGINE !== "1") {
    skip("engine: loads, draws one canvas, every way back to 2D, releases its GL context", "set TH_WORLD_ENGINE=1 to run it (SwiftShader draws about a frame a second)");
  } else {
    /**
     * In the page, before anything else: WebGL2 asks no longer refuse the
     * software GPU and report a hardware one; every context is kept, weakly,
     * in window.__worldGl; and frames are timed as __worldFrameMs apart (16 ms
     * unless a check changes it), so the frame governor judges the campus and
     * not SwiftShader's second-long frames.
     */
    const engineInit = () => {
      const gl = [];
      window.__worldGl = gl;
      const getContext = window.HTMLCanvasElement.prototype.getContext;
      window.HTMLCanvasElement.prototype.getContext = function (type, attrs, ...rest) {
        let keep = attrs;
        if (type === "webgl2" && attrs && attrs.failIfMajorPerformanceCaveat) {
          const { failIfMajorPerformanceCaveat: _strict, ...others } = attrs;
          keep = others;
        }
        const made = getContext.call(this, type, keep, ...rest);
        if (type === "webgl2" && made && !gl.some((r) => r.deref() === made)) gl.push(new WeakRef(made));
        return made;
      };
      const getParameter = window.WebGL2RenderingContext.prototype.getParameter;
      window.WebGL2RenderingContext.prototype.getParameter = function (p) {
        return p === 0x9246 || p === 0x1f01 ? "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)" : getParameter.call(this, p);
      };
      window.__worldFrameMs = 16;
      const raf = window.requestAnimationFrame.bind(window);
      let frameAt = -1;
      let fake = window.performance.now();
      window.requestAnimationFrame = (cb) =>
        raf((now) => {
          if (now !== frameAt) {
            frameAt = now;
            fake += window.__worldFrameMs;
          }
          cb(fake);
        });
    };
    const live = (page) => page.evaluate(() => window.__worldGl.map((r) => r.deref()).filter((g) => g && !g.isContextLost()).length);
    const canvases = (page) => page.locator("canvas").count();
    const cards = (page) => page.locator("[data-world-card]").count();
    const loaded = (page, timeout = 90000) => page.waitForSelector("[data-world-root][data-world-mode='3d'][data-world-engine='loaded']", { timeout }).catch(() => {});
    const twoD = (page, reason, timeout = 30000) => page.waitForSelector(`[data-world-root][data-world-fallback='${reason}']`, { timeout }).catch(() => {});
    const up = (x) => x?.mode === "3d" && x.engine === "loaded";
    const focused = (page) =>
      page.evaluate(() => {
        const a = document.activeElement;
        return a && a !== document.body ? a.getAttribute("role") || a.tagName.toLowerCase() : "body";
      });

    const ctx = await newCtx({ storageState });
    await ctx.addInitScript(engineInit);
    const page = await ctx.newPage();
    const errors = watch(page);
    const tooMany = [];
    page.on("console", (m) => /Too many active WebGL contexts/i.test(m.text()) && tooMany.push(m.text()));
    const seen = loads(page);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("HeapProfiler.enable");
    /** WebGL2 contexts still in memory after a full garbage collection, lost or not. */
    async function inMemory() {
      for (let i = 0; i < 3; i++) await cdp.send("HeapProfiler.collectGarbage");
      const { result: proto } = await cdp.send("Runtime.evaluate", { expression: "WebGL2RenderingContext.prototype", objectGroup: "gl" });
      const { objects } = await cdp.send("Runtime.queryObjects", { prototypeObjectId: proto.objectId, objectGroup: "gl" });
      const { result } = await cdp.send("Runtime.callFunctionOn", { objectId: objects.objectId, functionDeclaration: "function () { return this.length; }", returnByValue: true });
      await cdp.send("Runtime.releaseObjectGroup", { objectGroup: "gl" });
      return result.value;
    }

    await go(page, "/world?world=performance");
    await loaded(page);
    const s = await state(page);
    ok("engine: loads on a hardware-class GPU", up(s), JSON.stringify(s));
    ok("engine: draws exactly one canvas", (await canvases(page)) === 1, `${await canvases(page)} canvas`);
    ok("engine: the status line says it is ready", (await line(page)) === "The 3D campus is ready.", await line(page));
    const fetched = campusAssets(seen);
    ok("engine: fetches only its own textures", fetched.length > 0 && fetched.every((u) => /^\/world\/tex\/[^/]+\.jpg$/.test(pathOf(u))), `${fetched.length} requests${fetched.length ? `, e.g. ${pathOf(fetched[0])}` : ""}`);
    await shot(page, "world-3d");

    await page.locator('aside nav a[href="/today"]').first().click({ timeout: 30000 });
    await page.waitForURL((u) => pathOf(u.href) === "/today", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(500);
    const left = { canvases: await canvases(page), live: await live(page), inMemory: await inMemory() };
    ok("engine: leaving for /today removes the canvas and frees every GL context, down to the memory", left.canvases === 0 && left.live === 0 && left.inMemory === 0, JSON.stringify(left));

    await page.locator('aside a[href="/world"]').click({ timeout: 30000 });
    await page.waitForURL((u) => pathOf(u.href) === "/world", { timeout: 30000 }).catch(() => {});
    await loaded(page);
    const back = await state(page);
    ok("engine: coming back loads it again", up(back), JSON.stringify(back));
    ok("engine: no 'Too many active WebGL contexts' warning", tooMany.length === 0, tooMany.join(" | "));

    // '2D view', from the keyboard: the 2D page is back, and so is focus, on the status line.
    await page.getByRole("button", { name: "2D view" }).focus();
    await page.keyboard.press("Enter");
    await twoD(page, "chosen");
    const chosen = await state(page);
    const walk = page.getByRole("button", { name: "Walk the campus" });
    const after = { ...chosen, canvases: await canvases(page), cards: await cards(page), walk: await walk.count(), live: await live(page), line: await line(page) };
    ok("engine: '2D view' closes it, brings back the 2D page and offers the walk again", after.reason === "chosen" && after.engine === "disposed" && after.canvases === 0 && after.cards === 6 && after.walk === 1 && after.live === 0 && after.line === WHY.chosen, JSON.stringify(after));
    ok("engine: after '2D view', focus is on the status line, not lost", (await focused(page)) === "status", await focused(page));

    // 'Walk the campus', from the keyboard: once it is up, focus is in the campus, with a ring that shows.
    await walk.focus();
    await page.keyboard.press("Enter");
    await loaded(page);
    await page.waitForTimeout(300);
    const ring = await page.evaluate(() => {
      const host = document.querySelector("[data-world-root] [role='application']");
      const mark = host?.nextElementSibling;
      return { inCampus: !!host && document.activeElement === host, ringShows: !!mark && window.getComputedStyle(mark).display !== "none" };
    });
    ok("engine: after 'Walk the campus', focus is in the campus, with a visible focus ring", ring.inCampus && ring.ringShows, JSON.stringify(ring));

    // Reduced motion switched on while it runs.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await twoD(page, "reduced-motion");
    const calm = { ...(await state(page)), live: await live(page), line: await line(page) };
    ok("engine: reduced motion switched on closes it (reduced-motion) and releases its GL context", calm.reason === "reduced-motion" && calm.engine === "disposed" && calm.live === 0 && calm.line === WHY["reduced-motion"], JSON.stringify(calm));
    await page.emulateMedia({ reducedMotion: "no-preference" });

    // The GPU drops the context.
    await go(page, "/world?world=performance");
    await loaded(page);
    await page.evaluate(() => {
      for (const r of window.__worldGl) {
        const g = r.deref();
        if (g && !g.isContextLost()) g.getExtension("WEBGL_lose_context")?.loseContext();
      }
    });
    await twoD(page, "context-lost");
    const lost = { ...(await state(page)), canvases: await canvases(page), line: await line(page) };
    ok("engine: a lost GL context closes it (context-lost)", lost.reason === "context-lost" && lost.engine === "disposed" && lost.canvases === 0 && lost.line === WHY["context-lost"], JSON.stringify(lost));

    // A window made too narrow closes it; wide again, the walk is offered.
    await go(page, "/world?world=performance");
    await loaded(page);
    await page.setViewportSize({ width: 900, height: 720 });
    await twoD(page, "narrow");
    const thin = { ...(await state(page)), live: await live(page), line: await line(page) };
    ok("engine: a window made narrower than 1024 px closes it (narrow)", thin.reason === "narrow" && thin.engine === "disposed" && thin.live === 0 && thin.line === WHY.narrow, JSON.stringify(thin));
    await page.setViewportSize({ width: 1280, height: 720 });
    await walk.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    ok("engine: wide again, it offers the walk", (await line(page)) === "The window is wide enough now." && (await walk.count()) === 1, await line(page));

    // Frames a second or more apart close it within seconds, at any tier.
    await walk.click();
    await loaded(page);
    await page.evaluate(() => {
      window.__worldFrameMs = 1200;
    });
    await twoD(page, "too-slow", 60000);
    const slow = { ...(await state(page)), live: await live(page), line: await line(page) };
    ok("engine: frames over a second apart close it (too-slow)", slow.reason === "too-slow" && slow.engine === "disposed" && slow.live === 0 && slow.line === WHY["too-slow"], JSON.stringify(slow));
    ok("no console errors (engine)", errors.length === 0, errors.join(" | "));
    await ctx.close();

    // Failed and stalled loads. The 2D page stays up throughout, and a stalled load can be stopped or gives up.
    {
      const c = await newCtx({ storageState, serviceWorkers: "block" });
      await c.addInitScript(engineInit);
      const p = await c.newPage();
      const errs = watch(p);
      const stopped = [];
      p.on("requestfailed", (r) => stopped.push(pathOf(r.url())));

      await p.route("**/world/tex/*.jpg", (r) => r.abort());
      await go(p, "/world?world=performance");
      await twoD(p, "load-failed", 60000);
      const failedLoad = { ...(await state(p)), cards: await cards(p), retry: await p.getByRole("button", { name: "Try again" }).count(), line: await line(p) };
      ok("engine: textures that fail give the 2D page (load-failed) with 'Try again'", failedLoad.reason === "load-failed" && failedLoad.cards === 6 && failedLoad.retry === 1 && failedLoad.line === WHY["load-failed"], JSON.stringify(failedLoad));
      await p.unroute("**/world/tex/*.jpg");

      // One texture never answers.
      const HUNG = "/world/tex/oak_normal.jpg";
      await p.route(`**${HUNG}`, () => {});
      await p.goto(`${WEB}/world?world=performance`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await p.waitForSelector("[data-world-root][data-world-mode='loading']", { timeout: 30000 }).catch(() => {});
      await p.waitForTimeout(1500);
      const during = { ...(await state(p)), cards: await cards(p), out: await p.getByRole("button", { name: "2D view" }).count(), line: await line(p) };
      ok("engine: while it loads, the 2D page stays up, with '2D view'", during.mode === "loading" && during.cards === 6 && during.out === 1 && during.line === "Loading the 3D campus.", JSON.stringify(during));
      stopped.length = 0;
      await p.getByRole("button", { name: "2D view" }).click();
      await twoD(p, "chosen", 10000);
      await p.waitForTimeout(500);
      const out = { ...(await state(p)), cards: await cards(p), canvases: await canvases(p), live: await live(p), stopped: stopped.includes(HUNG) };
      ok("engine: '2D view' while it loads stops it, and the download with it", out.reason === "chosen" && out.cards === 6 && out.canvases === 0 && out.live === 0 && out.stopped, JSON.stringify(out));

      const started = Date.now();
      await p.goto(`${WEB}/world?world=performance`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await twoD(p, "load-failed", 60000);
      const gaveUp = { ...(await state(p)), cards: await cards(p), retry: await p.getByRole("button", { name: "Try again" }).count(), seconds: Math.round((Date.now() - started) / 1000) };
      ok("engine: a load that stalls gives up by itself (load-failed, 'Try again')", gaveUp.reason === "load-failed" && gaveUp.cards === 6 && gaveUp.retry === 1 && gaveUp.seconds <= 45, JSON.stringify(gaveUp));
      // The aborted and hung requests are logged by the browser; nothing else may be.
      const unexpected = errs.filter((e) => !/Failed to load resource/.test(e));
      ok("no console errors (failed loads), beyond the refused requests", unexpected.length === 0, unexpected.join(" | "));
      await c.close();
    }
  }
  await desk.close();
});

// ── summary ────────────────────────────────────────────────────────────────
await browser.close();
await db.end();
console.log(`\n${"═".repeat(60)}\n${fails === 0 ? "ALL PASS" : "FAILURES"}: ${passes} passed, ${fails} failed, ${skipped.length} skipped`);
for (const f of failed) console.log(`  FAIL ${f}`);
for (const f of skipped) console.log(`  SKIP ${f}`);
process.exit(fails === 0 ? 0 : 1);
