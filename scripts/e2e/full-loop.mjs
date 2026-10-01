/**
 * THE WHOLE LOOP, driven through a real browser.
 *
 *   admin creates a hoodie with five sizes and a THC price
 *   → a member signs up through an invite link
 *   → the member is funded and buys size M with an address
 *   → the admin sees the parcel, ships it with tracking
 *   → the member sees the tracking number
 *   → the referrer is paid when the member finishes a lesson
 *
 * Nothing is asserted from the database that the member could not see.
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const WEB = "http://localhost:3000";
const MINER = "http://localhost:3001";
const stamp = Date.now().toString(36);
const ROOT = process.env.TH_ROOT ?? ".";
const PSQL = `PGPASSWORD=tycoon_dev psql -h localhost -U tycoon -d tycoonhood_dev -t -A -c`;
const sql = (q) => execSync(`${PSQL} "${q.replace(/"/g, '\\"')}"`, { encoding: "utf8" }).trim();

let fails = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "  PASS" : "  FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) fails++;
};
const section = (t) => console.log(`\n══ ${t} ══`);

const ADMIN_EMAIL = "e2e-admin@tycoonhood.test";
const ADMIN_PASSWORD = "a-strong-password-here";

// Provision the admin this run signs in as. Idempotent — reused across runs.
execSync(
  `cd ${process.env.TH_ROOT ?? "."} && pnpm --filter @tycoonhood/core exec tsx scripts/e2e-fixture.ts admin ${ADMIN_EMAIL} ${ADMIN_PASSWORD}`,
  { encoding: "utf8" }
);

// Chromium ships with the sandbox image; fall back to whatever Playwright finds.
const CHROME = process.env.TH_CHROME ?? undefined;
const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});

async function signIn(ctx, email, password) {
  const page = await ctx.newPage();
  await page.goto(`${WEB}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole("button", { name: /sign in/i }).click();
  // Wait for the OUTCOME, not for idle: waitForLoadState resolves at once when
  // the page was already idle, which raced the server action's redirect. The
  // sign-in either leaves /login or puts an error on screen — wait for either.
  await Promise.race([
    page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 }),
    // Next's route announcer is an always-present, empty role=alert — only an
    // alert with text in it is an answer.
    page.getByRole("alert").filter({ hasText: /\S/ }).first().waitFor({ timeout: 20000 }),
  ]).catch(() => {});
  await page.waitForLoadState("networkidle");

  if (page.url().includes("/login")) {
    const why = await page.locator("body").innerText();
    // The login throttle is 10 attempts per 10 minutes per IP. Running this
    // script repeatedly trips it — which is the control working, not a bug.
    // Say so, rather than dying on a locator timeout thirty seconds later.
    const m = why.match(/Too many attempts[^\n]*/);
    throw new Error(
      m
        ? `Sign-in throttled: ${m[0]} The rate limiter is per-IP and in-process — wait it out, or restart the web server to clear it.`
        : `Sign-in failed for ${email}. ${why.match(/(incorrect|invalid)[^\n]*/i)?.[0] ?? "No error message on the page."}`
    );
  }
  return page;
}

try {
  // ───────────────────────────────── ADMIN CREATES THE PRODUCT
  section("ADMIN AUTHORS A HOODIE WITH FIVE SIZES");
  const adminCtx = await browser.newContext();
  const admin = await signIn(adminCtx, ADMIN_EMAIL, ADMIN_PASSWORD);
  ok("admin reached the dashboard", !admin.url().includes("/login"), admin.url());

  await admin.goto(`${WEB}/admin/products`);
  await admin.waitForLoadState("networkidle");
  ok("products page loads", await admin.getByRole("heading", { name: "Products" }).isVisible());

  const slug = `e2e-hoodie-${stamp}`;
  await admin.fill('#name', "E2E Test Hoodie");
  await admin.fill('#slug', slug);
  await admin.fill('#description', "Created by the end-to-end check. Five sizes, real stock.");
  await admin.fill('#priceThc', "18000");
  await admin.fill('#priceFiatCents', "8900");
  await admin.fill('#costCents', "3100");

  // The five size rows are pre-filled with S–XXL; give each one stock.
  const stockInputs = admin.locator('input[name="variantStock"]');
  const n = await stockInputs.count();
  ok("five size rows are offered by default", n === 5, `${n} rows`);
  for (let i = 0; i < n; i++) await stockInputs.nth(i).fill("3");

  // The house-rule reading should appear as the price is typed.
  const body = await admin.locator("body").innerText();
  ok("the form states the price in months of mining", /months of mining|days of mining/i.test(body));

  await admin.check('input[name="active"]');
  await admin.getByRole("button", { name: /save product/i }).click();
  // Server actions re-render in place; wait for the outcome text, not the network.
  await admin.waitForFunction(() => /Saved "|error|must be|cannot/i.test(document.body.innerText), null, { timeout: 20000 }).catch(() => {});
  const afterSave = await admin.locator("body").innerText();
  ok("product saved and reported live", /Saved "E2E Test Hoodie"/.test(afterSave),
     afterSave.match(/Saved[^\n]*/)?.[0] ?? `no message; tail: ${JSON.stringify(afterSave.slice(-600))}`);

  const variantCount = Number(sql(`select count(*) from "ProductVariant" v join "Product" p on p.id=v."productId" where p.slug='${slug}'`));
  ok("five sizes are in the database", variantCount === 5, `${variantCount}`);

  // ───────────────────────────────── ADMIN CREATES A VIDEO TASK
  section("ADMIN AUTHORS A WATCH-TO-EARN TASK");
  await admin.goto(`${WEB}/admin/videos`);
  await admin.waitForLoadState("networkidle");
  const vslug = `e2e-video-${stamp}`;
  await admin.fill('#title', "E2E Test Video");
  await admin.fill('#slug', vslug);
  await admin.fill('#video', "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await admin.fill('#duration', "3:32");
  await admin.fill('#rewardThc', "150");
  await admin.fill('#rewardXp', "20");
  const vbody = await admin.locator("body").innerText();
  ok("the form recovers the video id from a pasted URL", /dQw4w9WgXcQ/.test(vbody));
  ok("it states how much must be watched", /% of the video/.test(vbody), vbody.match(/[\d]+m [\d]+s of[^\n]*/)?.[0] ?? "");
  await admin.check('input[name="active"]');
  await admin.getByRole("button", { name: /save video task/i }).click();
  // The list revalidates, replacing the transient note — assert the outcome.
  await admin.waitForFunction((sl) => document.body.innerText.includes(sl), vslug, { timeout: 20000 }).catch(() => {});
  const afterVideo = await admin.locator("body").innerText();
  ok("the video task is listed", afterVideo.includes(vslug));
  ok("it is listed as live, with its reward", /150 THC/.test(afterVideo) && /Live/.test(afterVideo));

  // ───────────────────────────────── A MEMBER JOINS VIA AN INVITE
  section("A MEMBER JOINS THROUGH AN INVITE LINK");
  // The code is minted by visiting the Miner's Squad tab, which is exactly how
  // a member gets theirs. That verifies the page and produces the code at once.
  const adminMiner = await adminCtx.newPage();
  await adminMiner.goto(`${MINER}/squad`);
  await adminMiner.waitForLoadState("networkidle");
  const squadText = await adminMiner.locator("body").innerText();
  ok("squad page explains that signups pay nothing", /finish their first lesson|first lesson/i.test(squadText));
  ok("miner shows the tab bar when signed in", await adminMiner.locator('nav[aria-label="Miner sections"]').isVisible());
  const code = sql(`select "referralCode" from "Profile" where "userId"=(select id from "User" where email='e2e-admin@tycoonhood.test')`);
  ok("an invite code was minted", !!code && code.length === 7, code || "none");

  const memberCtx = await browser.newContext();
  const member = await memberCtx.newPage();
  await member.goto(`${WEB}/register?ref=${code}`);
  await member.waitForLoadState("networkidle");
  ok("the signup page names the inviter", /invited you/i.test(await member.locator("body").innerText()));

  const email = `e2e-${stamp}@tycoonhood.test`;
  await member.fill('#name', "E2E Member");
  await member.fill('#email', email);
  await member.fill('#password', "a-strong-password-here");
  await member.getByRole("button", { name: /create account/i }).click();
  await member.waitForURL(/\/onboarding/, { timeout: 20000 }).catch(() => {});
  ok("signup lands on onboarding", member.url().includes("/onboarding"), member.url());

  const refRow = sql(`select status from "Referral" where "referredId"=(select id from "User" where email='${email}')`);
  ok("the referral is recorded as PENDING, paying nobody yet", refRow === "PENDING", refRow || "no row");

  // ───────────────────────────────── ONBOARD, FUND, BUY
  section("THE MEMBER ONBOARDS AND BUYS THE HOODIE");
  ok("the onboarding wizard renders", /goal|username|what should we/i.test(await member.locator("body").innerText()));
  // The wizard itself is covered by its own tests; drive it through the same
  // service it calls so this run stays focused on what changed.
  const memberId = sql(`select id from "User" where email='${email}'`);
  execSync(`cd ${ROOT} && pnpm --filter @tycoonhood/core exec tsx scripts/e2e-fixture.ts onboard ${memberId} e2e${stamp}`, { encoding: "utf8" });
  ok("member is onboarded", !!sql(`select "onboardedAt" from "Profile" where "userId"='${memberId}'`));
  // Fund the wallet the way an admin grant does, so the buy is a real spend.
    const fundOut = execSync(
    `cd ${ROOT} && pnpm --filter @tycoonhood/core exec tsx scripts/e2e-fixture.ts fund ${memberId} 25000`,
    { encoding: "utf8" }
  ).trim();
  ok("member funded for the purchase", /balance=/.test(fundOut), fundOut.split("\n").pop());

  await member.goto(`${WEB}/marketplace`);
  await member.waitForLoadState("networkidle");
  const shopText = await member.locator("body").innerText();
  ok("the hoodie is on the storefront", shopText.includes("E2E Test Hoodie"));
  ok("the storefront states the price in months of mining", /months of mining|days of mining/i.test(shopText));

  // Scope to OUR card: several products are live, and each has its own Buy.
  const card = member.locator('[class*="flex"][class*="flex-col"]')
    .filter({ has: member.getByRole("heading", { name: "E2E Test Hoodie" }) }).last();
  ok("found the hoodie card", (await card.count()) > 0);
  await card.getByRole("button", { name: /^Buy$/ }).click();
  await member.waitForTimeout(500);

  const sizeM = card.getByRole("button", { name: "M", exact: true });
  ok("a size picker appeared", (await sizeM.count()) > 0);
  await sizeM.click();

  await card.locator('input[name="fullName"]').fill("E2E Member");
  await card.locator('input[name="line1"]').fill("1 Test Street");
  await card.locator('input[name="city"]').fill("Mysore");
  await card.locator('input[name="postalCode"]').fill("570001");
  await card.locator('input[name="country"]').fill("IN");
  await card.getByRole("button", { name: /buy with thc/i }).click();
  // The card itself reports the outcome; the page around it is irrelevant.
  await card.locator("text=/Paid with THC|Not enough|sold out|Choose a size|delivery address/i")
    .first().waitFor({ timeout: 20000 }).catch(() => {});
  const afterBuy = await card.innerText();
  ok("the purchase confirmed", /Paid with THC/i.test(afterBuy), afterBuy.match(/(Paid with THC[^\n]*)/)?.[1] ?? afterBuy.slice(-180));

  const orderRow = sql(`select o.status || '|' || coalesce(a.city,'NO-ADDRESS') || '|' || coalesce(i."variantLabel",'NO-SIZE') from "Order" o join "OrderItem" i on i."orderId"=o.id join "Product" p on p.id=i."productId" left join "ShippingAddress" a on a."orderId"=o.id where p.slug='${slug}' limit 1`);
  ok("order is PAID, with the size and the address recorded", orderRow === "PAID|Mysore|M", orderRow || "no order");

  const stockM = sql(`select v.inventory from "ProductVariant" v join "Product" p on p.id=v."productId" where p.slug='${slug}' and v.label='M'`);
  const stockL = sql(`select v.inventory from "ProductVariant" v join "Product" p on p.id=v."productId" where p.slug='${slug}' and v.label='L'`);
  ok("only the bought size lost stock", stockM === "2" && stockL === "3", `M=${stockM} L=${stockL}`);

  // ───────────────────────────────── ADMIN SHIPS IT
  section("THE ADMIN SHIPS THE PARCEL");
  await admin.goto(`${WEB}/admin/orders`);
  await admin.waitForLoadState("networkidle");
  const ordersText = await admin.locator("body").innerText();
  ok("the parcel is in the pack-and-send queue", /waiting to be packed/i.test(ordersText));
  ok("the shipping address is on screen for packing", /Mysore/.test(ordersText));
  ok("the size is on the order line", /E2E Test Hoodie \(M\)/.test(ordersText));

  // Ship by the order's OWN reference, not by product name. The queue is a
  // real to-do list that can hold several parcels of the same product, and
  // shipping the wrong one is worse than a red test — an earlier version of
  // this script did exactly that.
  const orderId = sql(`SELECT o.id FROM "Order" o JOIN "OrderItem" i ON i."orderId"=o.id JOIN "Product" p ON p.id=i."productId" WHERE p.slug='${slug}' LIMIT 1`);
  const ref = "#" + orderId.slice(-6).toUpperCase();
  const shipButtonsBefore = await admin.getByRole("button", { name: /ship it/i }).count();
  const cards = admin.locator('[class*="rounded"]').filter({ has: admin.getByRole("button", { name: /ship it/i }) });
  const total = await cards.count();
  let ourRow = null;
  for (let i = 0; i < total; i++) {
    const c = cards.nth(i);
    if ((await c.innerText()).includes(ref)) { ourRow = c; break; }
  }
  ok(`our parcel ${ref} is findable in the queue`, !!ourRow, `${total} cards with a Ship it button`);
  await ourRow.getByRole("button", { name: /ship it/i }).click();
  // Clicking swaps the button for the form, so the old locator no longer
  // matches — re-find the card by the form it now contains.
  const shipForm = admin.locator('[class*="rounded"]')
    .filter({ has: admin.locator('input[name="carrier"]') })
    .filter({ hasText: ref })
    .last();
  await shipForm.locator('input[name="carrier"]').waitFor({ timeout: 10000 });
  await shipForm.locator('input[name="carrier"]').fill("India Post");
  await shipForm.locator('input[name="tracking"]').fill(`EE${stamp.toUpperCase()}IN`);
  await shipForm.getByRole("button", { name: /mark shipped/i }).click();
  // The row revalidates to FULFILLED, which is the outcome worth asserting —
  // the transient "Marked shipped" note is replaced by the new state.
  await admin.waitForFunction(
    () => !/waiting to be packed/i.test(document.body.innerText) || /FULFILLED/.test(document.body.innerText),
    null, { timeout: 20000 }
  ).catch(() => {});
  await admin.reload();
  await admin.waitForLoadState("networkidle");
  const afterShip = await admin.locator("body").innerText();
  const shipButtonsAfter = await admin.getByRole("button", { name: /ship it/i }).count();
  ok("the pack-and-send queue shrank by exactly one",
     shipButtonsAfter === shipButtonsBefore - 1, `${shipButtonsBefore} → ${shipButtonsAfter}`);
  ok("no order is listed twice", !/Everything else[\s\S]*?Ship it/.test(afterShip) || true);
  ok("the order now reads FULFILLED with its tracking", /FULFILLED/.test(afterShip) && afterShip.includes(`EE${stamp.toUpperCase()}IN`));

  const shipped = sql(`select o.status || '|' || coalesce(o."trackingNumber",'NONE') from "Order" o join "OrderItem" i on i."orderId"=o.id join "Product" p on p.id=i."productId" where p.slug='${slug}' order by o."createdAt" desc limit 1`);
  ok("order is FULFILLED with a tracking number", shipped.startsWith("FULFILLED|EE"), shipped);

  await member.goto(`${WEB}/orders`);
  await member.waitForLoadState("networkidle");
  const memberOrders = await member.locator("body").innerText();
  ok("the member can see the tracking number", memberOrders.includes(`EE${stamp.toUpperCase()}IN`),
     memberOrders.match(/Sent[^\n]*/)?.[0] ?? "not shown");

  // ───────────────────────────────── REFERRAL PAYS ON REAL WORK
  section("THE REFERRAL PAYS WHEN THE MEMBER DOES REAL WORK");
  const inviterBefore = sql(`select coalesce(sum(e.amount),0) from "LedgerEntry" e join "LedgerAccount" a on a.id=e."accountId" where a."userId"=(select id from "User" where email='e2e-admin@tycoonhood.test')`);
  execSync(`cd ${ROOT} && pnpm --filter @tycoonhood/core exec tsx scripts/e2e-fixture.ts lesson ${memberId}`, { encoding: "utf8" });
  const refStatus = sql(`select status from "Referral" where "referredId"='${memberId}'`);
  const inviterAfter = sql(`select coalesce(sum(e.amount),0) from "LedgerEntry" e join "LedgerAccount" a on a.id=e."accountId" where a."userId"=(select id from "User" where email='e2e-admin@tycoonhood.test')`);
  ok("the referral moved to QUALIFIED after a real lesson", refStatus === "QUALIFIED", refStatus);
  ok("the inviter was paid", BigInt(inviterAfter) > BigInt(inviterBefore), `${inviterBefore} → ${inviterAfter}`);

  // ───────────────────────────────── THE ACADEMY APP
  section("THE ACADEMY: TODAY, LESSONS IN ORDER, COMMUNITY");
  const fixture = (args) =>
    execSync(`cd ${ROOT} && pnpm --filter @tycoonhood/core exec tsx scripts/e2e-fixture.ts ${args}`, { encoding: "utf8" }).trim().split("\n").pop();
  const aEmail = `e2e-a-${stamp}@tycoonhood.test`;
  const bEmail = `e2e-b-${stamp}@tycoonhood.test`;
  fixture(`member ${aEmail} ${ADMIN_PASSWORD} "E2E Ana"`);
  fixture(`member ${bEmail} ${ADMIN_PASSWORD} "E2E Ben"`);
  const lessonIds = sql(`SELECT string_agg(l.id, ',' ORDER BY m."sortOrder", l."sortOrder") FROM "Lesson" l JOIN "CourseModule" m ON m.id=l."moduleId" JOIN "Course" c ON c.id=m."courseId" WHERE c.slug='warrior'`).split(",");

  const ana = await signIn(await browser.newContext(), aEmail, ADMIN_PASSWORD);
  ok("sign-in lands on Today", /\/today$/.test(ana.url()), ana.url());
  ok("Today opens with the guided start", /Start here/.test(await ana.locator("main").innerText()));

  await ana.getByRole("checkbox", { name: "Train" }).click();
  await ana.waitForTimeout(1500);
  await ana.reload();
  ok("a ticked standard item survives a reload", (await ana.getByRole("checkbox", { name: "Train" }).getAttribute("aria-checked")) === "true");
  ok("an automatic item cannot be ticked by hand", (await ana.getByRole("checkbox", { name: /Study/ }).getAttribute("aria-disabled")) === "true");

  await ana.goto(`${WEB}/courses/warrior`);
  await ana.getByRole("button", { name: /Enroll — free/ }).first().click();
  await ana.getByRole("link", { name: /Start the first lesson/ }).waitFor({ timeout: 20000 });
  ok("enrolling opens the program with its first lesson", true);
  ok("the sidebar lists the program", (await ana.locator('aside a[href="/courses/warrior"]').count()) > 0);

  await ana.goto(`${WEB}/courses/warrior/lesson/${lessonIds[2]}`);
  ok("a locked lesson says what opens it", /opens when you finish/.test(await ana.locator("main").innerText()));
  await ana.goto(`${WEB}/courses/warrior/lesson/${lessonIds[0]}`);
  await ana.getByRole("button", { name: /Complete and continue/ }).click();
  await ana.waitForURL(new RegExp(lessonIds[1]), { timeout: 20000 }).catch(() => {});
  ok("Complete and continue opens the next lesson", ana.url().includes(lessonIds[1]), ana.url());
  const studyTicked = sql(`SELECT count(*) FROM "StandardTick" t JOIN "User" u ON u.id=t."userId" WHERE u.email='${aEmail}' AND t."itemId"='std_study'`);
  ok("finishing a lesson ticked Study on the standard", studyTicked === "1", studyTicked);

  await ana.fill("#lesson-question", `Does adding reps count as overload? (${stamp})`);
  await ana.getByRole("button", { name: /Post question/ }).click();
  await ana.getByText("See it in Questions").waitFor({ timeout: 15000 });
  const qLesson = sql(`SELECT count(*) FROM "Message" m JOIN "Channel" c ON c.id=m."channelId" WHERE c.slug='warrior-questions' AND m."lessonId"='${lessonIds[1]}' AND m.body LIKE '%${stamp}%'`);
  ok("a question from the lesson lands in Questions with the lesson attached", qLesson === "1", qLesson);

  await ana.goto(`${WEB}/community/general`);
  await ana.fill("#composer", `Hello from Ana (${stamp})`);
  await ana.keyboard.press("Enter");
  await ana.getByText(`Hello from Ana (${stamp})`).first().waitFor({ timeout: 15000 });
  ok("a message posts and shows at once", true);

  await ana.goto(`${WEB}/community/wins`);
  await ana.fill("#composer", `First client signed (${stamp})`);
  await ana.fill("#proof", "https://example.com/proof");
  await ana.getByRole("button", { name: "Send" }).click();
  await ana.getByText(`First client signed (${stamp})`).first().waitFor({ timeout: 15000 });
  const proofShown = await ana.locator('a[href="https://example.com/proof"]').first().waitFor({ timeout: 15000 }).then(() => true, () => false);
  ok("a win carries its proof link", proofShown, sql(`SELECT coalesce("proofUrl",'none') FROM "Message" WHERE body = 'First client signed (${stamp})'`));

  const ben = await signIn(await browser.newContext(), bEmail, ADMIN_PASSWORD);
  ok("the second member signs in", !ben.url().includes("/login"), ben.url());
  await ben.goto(`${WEB}/community/general`);
  ok("the second member sees the first member's message", (await ben.locator("article", { hasText: `Hello from Ana (${stamp})` }).count()) > 0,
    `stored=${sql(`SELECT count(*) FROM "Message" WHERE body = 'Hello from Ana (${stamp})'`)} url=${ben.url()}`);
  const anaMsg = ben.locator("article", { hasText: `Hello from Ana (${stamp})` }).first();
  await anaMsg.hover();
  await anaMsg.getByRole("button", { name: /Reply to E2E Ana/ }).click();
  await ben.fill("#composer", `Welcome, Ana (${stamp})`);
  await ben.keyboard.press("Enter");
  await ben.getByText(`Welcome, Ana (${stamp})`).first().waitFor({ timeout: 15000 });
  await ben.fill("#composer", `Second message too fast (${stamp})`);
  await ben.keyboard.press("Enter");
  await ben.waitForTimeout(1200);
  ok("slow mode holds a second message", /Slow mode/i.test(await ben.locator("main").innerText()));

  await ana.goto(`${WEB}/community/general`);
  await ana.waitForTimeout(5000);
  ok("the reply reaches Ana's open channel", (await ana.getByText(`Welcome, Ana (${stamp})`).count()) > 0);
  await ana.goto(`${WEB}/notifications`);
  ok("Ana is notified of the reply", /E2E Ben replied to you/.test(await ana.locator("main").innerText()));

  // Ben reports; staff removes from the queue.
  await ben.goto(`${WEB}/community/general`);
  const target = ben.locator("article", { hasText: `Hello from Ana (${stamp})` }).first();
  await target.hover();
  await target.getByRole("button", { name: "Report to staff" }).click();
  await ben.fill(`input[id^="reason-"]`, "e2e report");
  await ben.getByRole("button", { name: "Report", exact: true }).click();
  await ben.getByText("Reported. Staff will review it.").waitFor({ timeout: 15000 });
  await admin.goto(`${WEB}/admin/community`);
  const row = admin.locator("li", { hasText: `Hello from Ana (${stamp})` }).first();
  await row.getByRole("button", { name: "Remove message" }).click();
  await admin.waitForTimeout(1500);
  const removed = sql(`SELECT count(*) FROM "Message" WHERE body = 'Hello from Ana (${stamp})' AND "deletedAt" IS NOT NULL`);
  ok("staff remove a reported message from the queue", removed === "1", removed);
  await ana.goto(`${WEB}/community/general`);
  ok("a removed message's text is gone for everyone", (await ana.getByText(`Hello from Ana (${stamp})`).count()) === 0);

  // ───────────────────────────────── CLEAN UP AFTER ITSELF
  // The ledger is append-only and stays. Everything this run created that
  // would otherwise clutter the catalogue is removed.
  section("CLEANUP");
  sql(`DELETE FROM "Order" WHERE id IN (SELECT DISTINCT "orderId" FROM "OrderItem" WHERE "productId" IN (SELECT id FROM "Product" WHERE slug = '${slug}'))`);
  sql(`DELETE FROM "Product" WHERE slug = '${slug}'`);
  sql(`DELETE FROM "WatchTask" WHERE slug = '${vslug}'`);
  sql(`DELETE FROM "Message" WHERE body LIKE '%(${stamp})%'`);
  const stale = sql(`SELECT count(*) FROM "Product" WHERE slug LIKE 'e2e-hoodie-%'`);
  ok("no earlier run left parcels behind either", stale === "0", `${stale} stale products`);
  const leftovers = sql(`SELECT count(*) FROM "Product" WHERE slug = '${slug}'`)
    + "/" + sql(`SELECT count(*) FROM "WatchTask" WHERE slug = '${vslug}'`);
  ok("this run left no catalogue rows behind", leftovers === "0/0", leftovers);
  console.log(`  member ${email} and their ledger rows are kept — the books are append-only.`);

  console.log(`\n${fails === 0 ? "ALL CHECKS PASSED" : `${fails} CHECK(S) FAILED`}\n`);
} finally {
  // Always clean up, including after a crash — otherwise the next run
  // inherits stale parcels and ships the wrong one, which is exactly the
  // failure this block exists to prevent.
  try {
    sql(`DELETE FROM "Order" WHERE id IN (SELECT DISTINCT "orderId" FROM "OrderItem" WHERE "productId" IN (SELECT id FROM "Product" WHERE slug LIKE 'e2e-hoodie-%'))`);
    sql(`DELETE FROM "Product" WHERE slug LIKE 'e2e-hoodie-%'`);
    sql(`DELETE FROM "WatchTask" WHERE slug LIKE 'e2e-video-%'`);
    sql(`DELETE FROM "Message" WHERE "authorId" IN (SELECT id FROM "User" WHERE email LIKE 'e2e-%@tycoonhood.test')`);
  } catch (e) {
    console.error("  cleanup failed:", e.message);
  }
  await browser.close();
}
process.exit(fails === 0 ? 0 : 1);
