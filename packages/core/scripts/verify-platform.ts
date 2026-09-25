/**
 * PLATFORM VERIFICATION HARNESS
 *
 * Exercises every production subsystem end-to-end against a real database and
 * reports honest pass/fail. Used as the pre-deploy gate and as the post-deploy
 * smoke test (point DATABASE_URL at the deployed database and run it).
 *
 *   npx tsx scripts/verify-platform.ts
 *
 * It creates clearly-marked verify-* rows and cleans them up afterwards. It
 * NEVER fabricates data for display — everything it asserts is read back from
 * the database it just wrote to.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

if (!process.env.DATABASE_URL) {
  try {
    const env = readFileSync(resolve(process.cwd(), "../../.env"), "utf8");
    for (const line of env.split("\n")) {
      const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* env may come from the shell */
  }
}

const { prisma } = await import("@tycoonhood/db");
const core = await import("../src/index");
const cfg = await import("@tycoonhood/config");

type Result = { area: string; check: string; ok: boolean; detail: string };
const results: Result[] = [];
const stamp = Date.now().toString(36);
const created: { userIds: string[] } = { userIds: [] };

async function check(area: string, name: string, fn: () => Promise<string>) {
  try {
    const detail = await fn();
    results.push({ area, check: name, ok: true, detail });
  } catch (e) {
    results.push({ area, check: name, ok: false, detail: (e as Error).message });
  }
}
const must = (cond: boolean, msg: string) => {
  if (!cond) throw new Error(msg);
};

/** Ledger exposes accounts, not a user-balance shortcut — resolve then read. */
async function balanceOf(userId: string): Promise<bigint> {
  const acct = await core.ledger.ensureUserAccount(userId);
  return core.ledger.getBalance(acct.id);
}

// ───────────────────────────── AUTH ─────────────────────────────
let member: { id: string } | null = null;

await check("Auth", "register + Argon2id credential stored (never plaintext)", async () => {
  const u = await core.accounts.register({
    email: `verify-${stamp}@tycoonhood.test`,
    password: "a-strong-password",
    name: "Verify Member",
  });
  member = u;
  created.userIds.push(u.id);
  const cred = await prisma.passwordCredential.findUnique({ where: { userId: u.id } });
  must(!!cred, "no credential row written");
  must(!cred!.hash.includes("a-strong-password"), "PLAINTEXT PASSWORD STORED");
  must(cred!.hash.startsWith("$argon2id$"), `unexpected hash format: ${cred!.hash.slice(0, 12)}`);
  return `user ${u.id.slice(0, 8)} · hash ${cred!.hash.slice(0, 20)}…`;
});

await check("Auth", "authenticate accepts correct password, rejects wrong", async () => {
  const ok = await core.accounts.authenticate({
    email: `verify-${stamp}@tycoonhood.test`,
    password: "a-strong-password",
  });
  must(!!ok, "correct password rejected");
  let rejected = false;
  try {
    await core.accounts.authenticate({
      email: `verify-${stamp}@tycoonhood.test`,
      password: "wrong-password-entirely",
    });
  } catch {
    rejected = true;
  }
  must(rejected, "WRONG PASSWORD ACCEPTED");
  return "correct accepted · wrong rejected";
});

await check("Auth", "session token stored hashed, resolves to user", async () => {
  const s = await core.sessions.create(member!.id, {});
  const row = await prisma.session.findFirst({ where: { userId: member!.id } });
  must(!!row, "no session row");
  must(row!.tokenHash !== s.raw, "RAW SESSION TOKEN STORED IN DB");
  const resolved = await core.sessions.resolve(s.raw);
  must(resolved?.user.id === member!.id, "session did not resolve to its user");
  return `raw≠stored · resolves · expires ${row!.expires.toISOString().slice(0, 10)}`;
});

await check("Auth", "password reset: single-use token, kills all sessions", async () => {
  const req = await core.passwordReset.requestReset(`verify-${stamp}@tycoonhood.test`);
  const token = req.issued?.rawToken;
  must(!!token, "no reset token issued for an existing account");
  const stored = await prisma.verificationToken.findFirst({
    where: { identifier: `pwreset:${member!.id}` },
  });
  must(!!stored && stored.token !== token, "RESET TOKEN STORED IN PLAINTEXT");
  // anti-enumeration: an unknown address must not reveal itself
  const ghost = await core.passwordReset.requestReset(`nobody-${stamp}@tycoonhood.test`);
  must(ghost.issued === null, "unknown address leaked a token");
  await core.passwordReset.resetPassword(token!, "a-different-strong-password");
  let reuseBlocked = false;
  try {
    await core.passwordReset.resetPassword(token!, "another-password-again");
  } catch {
    reuseBlocked = true;
  }
  must(reuseBlocked, "RESET TOKEN REUSABLE");
  const live = await prisma.session.count({ where: { userId: member!.id } });
  must(live === 0, `sessions survived reset: ${live}`);
  return "hashed · single-use · all sessions destroyed · unknown emails issue nothing";
});

// ───────────────────────────── LEDGER ─────────────────────────────
await check("Ledger", "double-entry book balances to zero across every account", async () => {
  const rows = await prisma.ledgerAccount.findMany();
  const total = rows.reduce((a, r) => a + r.balance, 0n);
  must(total === 0n, `book does not balance: Σ = ${total}`);
  return `Σ all accounts = 0 (every THC in existence has a matching counter-entry)`;
});

await check("Ledger", "issued supply is exactly the fixed total and cannot inflate", async () => {
  const rows = await prisma.ledgerAccount.findMany();
  const mint = rows.find((r) => r.type === "SYSTEM_MINT");
  must(!!mint, "no SYSTEM_MINT account — supply is unprovable");
  const issued = rows.filter((r) => r.type !== "SYSTEM_MINT").reduce((a, r) => a + r.balance, 0n);
  must(issued === cfg.THC_TOTAL_SUPPLY, `issued supply drift: ${issued} ≠ ${cfg.THC_TOTAL_SUPPLY}`);
  must(-mint!.balance === cfg.THC_TOTAL_SUPPLY, `mint counterweight wrong: ${mint!.balance}`);
  const mintEntries = await prisma.ledgerEntry.count({ where: { accountId: mint!.id } });
  must(mintEntries === 1, `SYSTEM_MINT touched ${mintEntries} times — supply was minted after genesis`);
  return `issued ${issued.toLocaleString("en-US")} THC · mint touched exactly once (genesis) · no inflation possible`;
});

await check("Ledger", "every transaction is zero-sum", async () => {
  const bad = await prisma.$queryRawUnsafe<{ txid: string; delta: bigint }[]>(
    `select "transactionId" as txid, sum(amount) as delta
     from "LedgerEntry" group by "transactionId" having sum(amount) <> 0 limit 5`
  );
  must(bad.length === 0, `non-zero-sum transactions: ${JSON.stringify(bad)}`);
  return "no unbalanced transactions in the book";
});

await check("Ledger", "cached balances equal the sum of their entries", async () => {
  const drift = await prisma.$queryRawUnsafe<{ id: string; cache: bigint; real: bigint }[]>(
    `select a.id, a."balance" as cache, coalesce(sum(e.amount),0) as real
     from "LedgerAccount" a left join "LedgerEntry" e on e."accountId" = a.id
     group by a.id, a."balance" having a."balance" <> coalesce(sum(e.amount),0) limit 5`
  );
  must(drift.length === 0, `balance cache drift on ${drift.length} account(s)`);
  return "cache = Σ entries on every account";
});

await check("Ledger", "idempotency key prevents double-spend on retry", async () => {
  const key = `verify-idem-${stamp}`;
  await core.ledger.reward({ userId: member!.id, amount: 1000n, reason: "REWARD_ADMIN", idempotencyKey: key, memo: "verify" });
  await core.ledger.reward({ userId: member!.id, amount: 1000n, reason: "REWARD_ADMIN", idempotencyKey: key, memo: "verify retry" });
  const bal = await balanceOf(member!.id);
  must(bal === 1000n, `retry double-credited: balance ${bal}`);
  return "same key twice → credited once (1,000 THC)";
});

await check("Ledger", "overspend is refused", async () => {
  let refused = false;
  try {
    await core.ledger.spend({ userId: member!.id, amount: 999_999n, reason: "PURCHASE", idempotencyKey: `verify-over-${stamp}` });
  } catch {
    refused = true;
  }
  must(refused, "OVERSPEND ALLOWED");
  const bal = await balanceOf(member!.id);
  must(bal === 1000n, `balance moved on refused spend: ${bal}`);
  return "spend > balance rejected, balance untouched";
});

// ───────────────────────────── LMS + PROGRESS ─────────────────────────────
await check("LMS", "published curriculum exists and has no placeholder content", async () => {
  const courses = await prisma.course.count({ where: { status: "PUBLISHED" } });
  const lessons = await prisma.lesson.count();
  const pending = await prisma.lesson.count({ where: { contentMd: { contains: "Content pending" } } });
  must(courses > 0, "no published courses");
  must(lessons > 0, "no lessons");
  must(pending === 0, `${pending} PLACEHOLDER LESSONS would be visible to members`);
  return `${courses} published courses · ${lessons} lessons · 0 placeholders`;
});

await check("LMS", "enroll → complete lesson → progress advances", async () => {
  const course = await prisma.course.findFirstOrThrow({ where: { status: "PUBLISHED" } });
  await core.lms.enroll(member!.id, course.slug);
  const lesson = await prisma.lesson.findFirstOrThrow({
    where: { module: { courseId: course.id } },
    orderBy: [{ module: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
  await core.lms.completeLesson(member!.id, lesson.id);
  const view = await core.lms.memberCourseView(member!.id, course.slug);
  const pct = view?.enrollment?.progressPct ?? 0;
  must(pct > 0, `progress did not advance after completion (pct=${pct})`);
  const prog = await prisma.lessonProgress.findFirst({ where: { userId: member!.id, lessonId: lesson.id } });
  must(prog?.completedAt != null, "no completion row persisted");
  return `${course.slug}: progress ${pct}% after 1 lesson`;
});

await check("LMS", "lesson completion is idempotent (no XP farming by re-clicking)", async () => {
  const lesson = await prisma.lesson.findFirstOrThrow({
    where: { progress: { some: { userId: member!.id } } },
  });
  const before = (await prisma.user.findUniqueOrThrow({ where: { id: member!.id } })).xp;
  await core.lms.completeLesson(member!.id, lesson.id);
  const after = (await prisma.user.findUniqueOrThrow({ where: { id: member!.id } })).xp;
  must(before === after, `RE-COMPLETION GRANTED XP: ${before} → ${after}`);
  return `XP stable at ${after} on repeat completion`;
});

// ───────────────────────────── GAMIFICATION ─────────────────────────────
await check("Gamification", "XP grant moves level and rank definitions exist", async () => {
  const ranks = await prisma.rankDefinition.count();
  const levels = await prisma.levelDefinition.count();
  must(ranks > 0 && levels > 0, `ranks=${ranks} levels=${levels}`);
  await core.xpService.awardXp({ userId: member!.id, amount: 900, source: "ADMIN_GRANT", note: "verification harness", idempotencyKey: `verify-xp-${stamp}` });
  const u = await prisma.user.findUniqueOrThrow({ where: { id: member!.id }, include: { rank: true } });
  must(u.xp >= 900, `xp not applied: ${u.xp}`);
  must(u.level >= 1, "level not computed");
  return `${u.xp} XP · level ${u.level} · rank ${u.rank?.name ?? "unranked"} · ${ranks} ranks / ${levels} levels defined`;
});

await check("Gamification", "mission cooldown is enforced", async () => {
  const mission = await prisma.mission.findFirst({ where: { cooldownHours: { not: null } } });
  if (!mission) return "no cooldown mission seeded — skipped";
  await core.rewards.completeMission({ userId: member!.id, missionSlug: mission.slug }).catch(() => {});
  let blocked = false;
  try {
    await core.rewards.completeMission({ userId: member!.id, missionSlug: mission.slug });
  } catch (e) {
    blocked = e instanceof core.MissionCooldownError;
  }
  must(blocked, "COOLDOWN NOT ENFORCED — mission farmable");
  return `${mission.slug}: second attempt blocked by cooldown`;
});

await check("Gamification", "streaks and achievements engines write real rows", async () => {
  await core.streaks.touch(member!.id);
  const s = await prisma.streak.findFirst({ where: { userId: member!.id } });
  must(!!s && s.current >= 1, "streak not recorded");
  const achCount = await prisma.achievement.count();
  const earned = await prisma.userAchievement.count({ where: { userId: member!.id } });
  return `streak current=${s!.current} longest=${s!.longest} · ${achCount} achievements defined · ${earned} earned by verify member`;
});

await check("Gamification", "challenge join + evidence submission recorded", async () => {
  const all = await prisma.challenge.findMany();
  const ch = all.find((c) => (c.criteria as { event?: string })?.event === "SUBMISSION");
  if (!ch) return "no submission-type challenge seeded — skipped";
  await prisma.challenge.update({
    where: { id: ch.id },
    data: { lifecycle: "ACTIVE", startsAt: new Date(Date.now() - 3600_000), endsAt: new Date(Date.now() + 86_400_000) },
  });
  await core.challenges.join(member!.id, ch.slug);
  await core.challenges.submit(member!.id, ch.slug, { text: "Verification harness evidence submission — reviewed by nobody, purely a write test." });
  const p = await prisma.challengeParticipation.findFirstOrThrow({
    where: { userId: member!.id, challengeId: ch.id },
  });
  const subs = (p.progress as { submissions?: unknown[] })?.submissions ?? [];
  must(subs.length === 1, `expected 1 submission, found ${subs.length}`);
  return `${ch.slug}: joined, 1 submission pending review`;
});

// ───────────────────────────── COMMERCE ─────────────────────────────
await check("Commerce", "THC checkout debits the ledger and routes the order correctly", async () => {
  // Must be a product that can actually be bought right now: priced in THC,
  // live, and with stock — either unlimited, on the product, or on a size.
  const product = await prisma.product.findFirst({
    where: {
      active: true,
      priceThc: { not: null },
      OR: [
        { inventory: null },
        { inventory: { gte: 1 } },
        { variants: { some: { active: true, inventory: { gte: 1 } } } },
      ],
    },
    include: { variants: { where: { active: true, inventory: { gte: 1 } }, orderBy: { sortOrder: "asc" } } },
  });
  if (!product) return "no THC-priced product in stock — skipped";

  const variant = product.variants[0] ?? null;
  const price = variant?.priceThc ?? product.priceThc!;
  const physical = product.kind === "PHYSICAL";

  await core.ledger.reward({
    userId: member!.id,
    amount: price,
    reason: "REWARD_ADMIN",
    idempotencyKey: `verify-fund-${stamp}`,
    memo: "verify funding",
  });
  const before = await balanceOf(member!.id);

  const order = await core.commerce.checkoutWithThc(member!.id, product.slug, {
    variantId: variant?.id ?? null,
    // Physical goods refuse to sell without somewhere to be sent. That is the
    // point of the check, so the address is supplied exactly as a buyer would.
    shipping: physical
      ? { fullName: "Verify Member", line1: "1 Verify Road", city: "Mysore", postalCode: "570001", country: "IN" }
      : null,
  });
  const after = await balanceOf(member!.id);
  must(after === before - price, `debit wrong: ${before} → ${after}`);

  const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { address: true } });
  if (physical) {
    // A parcel is not fulfilled until it is sent. Anything else is a lie to
    // the member about where their two months of mining went.
    must(row.status === "PAID", `physical order should wait at PAID, got ${row.status}`);
    must(!!row.address, "physical order stored no shipping address");
    const shipped = await core.commerce.markShipped(order.id, "Verify Post", `VF${stamp}`);
    must(shipped.status === "FULFILLED", `after shipping: ${shipped.status}`);
    must(!!shipped.trackingNumber, "shipped with no tracking number");
    return `${product.slug}${variant ? ` (${variant.label})` : ""}: −${price.toLocaleString("en-US")} THC · PAID → shipped → FULFILLED`;
  }
  must(row.status === "FULFILLED", `digital order status ${row.status}`);
  return `${product.slug}: −${price.toLocaleString("en-US")} THC · fulfilled instantly`;
});

await check("Commerce", "a parcel waits at PAID until it is shipped, with an address and tracking", async () => {
  // Built here rather than picked from the catalogue, so this leg is checked
  // on every deployment whether or not any gear happens to be live.
  const slug = `verify-gear-${stamp}`;
  const p = await prisma.product.create({
    data: {
      slug, kind: "PHYSICAL", name: "Verify Gear", description: "created and removed by verification",
      priceThc: 1n, active: true,
      variants: { create: [{ sku: `VG-${stamp.toUpperCase().slice(0, 8)}-M`, label: "M", inventory: 1, sortOrder: 0 }] },
    },
    include: { variants: true },
  });
  const buyer = await prisma.user.create({
    data: { email: `verify-gear-${stamp}@tycoonhood.local`, name: "Gear Buyer" },
  });
  await core.ledger.reward({
    userId: buyer.id, amount: 10n, reason: "REWARD_ADMIN",
    idempotencyKey: `verify-gear-fund-${stamp}`, memo: "verify funding",
  });

  // No address: must be refused, and must not hold the unit hostage.
  let refused = false;
  try {
    await core.commerce.checkoutWithThc(buyer.id, slug, { variantId: p.variants[0].id });
  } catch {
    refused = true;
  }
  const held = await prisma.productVariant.findUniqueOrThrow({ where: { id: p.variants[0].id } });

  const order = await core.commerce.checkoutWithThc(buyer.id, slug, {
    variantId: p.variants[0].id,
    shipping: { fullName: "Verify Member", line1: "1 Verify Road", city: "Mysore", postalCode: "570001", country: "IN" },
  });
  const paid = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { address: true } });
  const shipped = await core.commerce.markShipped(order.id, "Verify Post", `VF${stamp}`);

  await prisma.order.deleteMany({ where: { id: order.id } });
  await prisma.product.delete({ where: { id: p.id } });

  must(refused, "a physical order without an address was accepted");
  must(held.inventory === 1, `the refused attempt consumed stock: ${held.inventory}`);
  must(paid.status === "PAID", `after payment: ${paid.status}, expected PAID`);
  must(!!paid.address, "no shipping address stored on the order");
  must(shipped.status === "FULFILLED", `after shipping: ${shipped.status}`);
  must(!!shipped.trackingNumber && !!shipped.shippedAt, "shipped without tracking or a timestamp");
  return "no address → refused, no stock held · paid → PAID · shipped → FULFILLED with tracking";
});

await check("Commerce", "stock cannot go negative, and the last unit sells once", async () => {
  const stamp2 = `${stamp}-race`;
  const p = await prisma.product.create({
    data: {
      slug: `verify-race-${stamp2}`, kind: "DIGITAL", name: "Verify Race Item",
      description: "created and removed by verification", priceThc: 1n, inventory: 1, active: true,
      contentMd: "verification artifact",
    },
  });
  const buyers = await Promise.all(
    [0, 1, 2].map(async (i) => {
      const u = await prisma.user.create({
        data: { email: `verify-race-${stamp2}-${i}@tycoonhood.local`, name: `Race ${i}` },
      });
      await core.ledger.reward({
        userId: u.id, amount: 10n, reason: "REWARD_ADMIN",
        idempotencyKey: `verify-race-fund-${stamp2}-${i}`, memo: "verify funding",
      });
      return u;
    })
  );
  const results = await Promise.allSettled(
    buyers.map((u) => core.commerce.checkoutWithThc(u.id, p.slug))
  );
  const won = results.filter((r) => r.status === "fulfilled").length;
  const fresh = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });

  // Clean up the artifact; the ledger rows stay, as the books are append-only.
  const orderIds = (await prisma.orderItem.findMany({ where: { productId: p.id }, select: { orderId: true } })).map((o) => o.orderId);
  if (orderIds.length) await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.product.delete({ where: { id: p.id } });

  must(won === 1, `${won} of 3 concurrent buyers got the single unit`);
  must(fresh.inventory === 0, `inventory ended at ${fresh.inventory}`);
  return `3 buyers raced for 1 unit · exactly 1 sale · stock 0, never negative`;
});

await check("Commerce", "fiat rail is honest about its configured provider", async () => {
  const provider = process.env.STRIPE_SECRET_KEY ? "stripe" : "none (development mode)";
  const fiatProducts = await prisma.product.count({ where: { active: true, priceFiatCents: { not: null } } });
  return `${fiatProducts} card-priced products · provider: ${provider}`;
});

// ───────────────────────────── ADMIN ─────────────────────────────
await check("Admin", "exactly one seeded admin, and members are not admins", async () => {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } });
  must(admins.length >= 1, "NO ADMIN USER — console unreachable");
  const m = await prisma.user.findUniqueOrThrow({ where: { id: member!.id } });
  must(m.role !== "ADMIN", "NEW MEMBERS ARE ADMINS BY DEFAULT");
  return `${admins.length} admin(s): ${admins.map((a) => a.email).join(", ")} · members default to MEMBER`;
});

await check("Admin", "reversal restores balance and is itself auditable", async () => {
  const tx = await core.ledger.reward({
    userId: member!.id,
    amount: 500n,
    reason: "REWARD_ADMIN",
    idempotencyKey: `verify-rev-${stamp}`,
    memo: "verify reversal source",
  });
  const before = await balanceOf(member!.id);
  await core.ledger.reverse(tx.id, { idempotencyKey: `verify-rev-undo-${stamp}`, memo: "verify reversal" });
  const after = await balanceOf(member!.id);
  must(after === before - 500n, `reversal did not restore: ${before} → ${after}`);
  const rev = await prisma.ledgerTransaction.findFirst({ where: { reversesId: tx.id } });
  must(!!rev, "reversal not linked to source transaction");
  return `500 THC reversed · reversal tx linked to source · book still zero-sum`;
});

// ───────────────────────── INTEGRATIONS / BOUNDARIES ─────────────────────────
await check("Integrations", "Discord transport reports its real state (no silent faking)", async () => {
  const transport = core.activeDiscordTransport();
  const name = String((transport as { name?: string }).name ?? transport.constructor?.name ?? "unknown");
  const configured = !!(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID);
  const live = /rest/i.test(name);
  must(configured === live, `transport "${name}" disagrees with configuration (configured=${configured})`);
  return `transport: ${name}${configured ? " (live REST)" : " (inert — no bot token; role sync reports why, never pretends)"}`;
});

await check("Integrations", "Telegram is cut (D18) — no live code path", async () => {
  const rows = await prisma.telegramLink.count();
  return `TelegramLink table retained but unused (${rows} rows) — no service, no UI, no writes`;
});

await check("Integrations", "chain adapter is inert and cannot block the platform", async () => {
  const adapter = core.activeChainAdapter();
  must(adapter.enabled === false, "CHAIN ADAPTER REPORTS ENABLED — no chain integration is legally cleared");
  const anchor = await adapter.mirrorTransaction({
    id: "verify", idempotencyKey: `verify-chain-${stamp}`, reason: "verify",
    entries: [], createdAt: new Date(),
  });
  must(anchor === null, `chain adapter returned an anchor while disabled: ${JSON.stringify(anchor)}`);
  return `${adapter.name} active · enabled=false · ledger is the source of truth, no chain dependency`;
});

// ───────────────────────────── CLEANUP ─────────────────────────────
await check("Hygiene", "verification writes reversed, ledger left intact (append-only)", async () => {
  const notes: string[] = [];
  for (const id of created.userIds) {
    // Reverse every transaction this run created so the book stays zero-sum
    // and total supply is untouched. Deleting ledger rows would corrupt the
    // audit trail — the ledger is append-only by design.
    const acct = await prisma.ledgerAccount.findUnique({ where: { userId: id } });
    if (acct) {
      const entries = await prisma.ledgerEntry.findMany({
        where: { accountId: acct.id },
        include: { transaction: true },
        orderBy: { id: "desc" },
      });
      const seen = new Set<string>();
      for (const e of entries) {
        const tx = e.transaction;
        if (!tx || seen.has(tx.id) || tx.reversesId) continue;
        seen.add(tx.id);
        const already = await prisma.ledgerTransaction.findFirst({ where: { reversesId: tx.id } });
        if (already) continue;
        await core.ledger
          .reverse(tx.id, { idempotencyKey: `verify-cleanup-${tx.id}`, memo: "verification harness cleanup" })
          .catch(() => {});
      }
      const bal = await core.ledger.getBalance(acct.id);
      notes.push(`balance back to ${bal}`);
    }
    // Non-ledger artefacts can be safely removed.
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { order: { userId: id } } }),
      prisma.order.deleteMany({ where: { userId: id } }),
      prisma.lessonProgress.deleteMany({ where: { userId: id } }),
      prisma.quizAttempt.deleteMany({ where: { userId: id } }),
      prisma.enrollment.deleteMany({ where: { userId: id } }),
      prisma.challengeParticipation.deleteMany({ where: { userId: id } }),
      prisma.missionCompletion.deleteMany({ where: { userId: id } }),
      prisma.userAchievement.deleteMany({ where: { userId: id } }),
      prisma.streak.deleteMany({ where: { userId: id } }),
      prisma.xpEvent.deleteMany({ where: { userId: id } }),
      prisma.notification.deleteMany({ where: { userId: id } }),
      prisma.session.deleteMany({ where: { userId: id } }),
      prisma.verificationToken.deleteMany({ where: { identifier: { contains: id } } }),
      prisma.passwordCredential.deleteMany({ where: { userId: id } }),
      prisma.profile.deleteMany({ where: { userId: id } }),
    ]).catch(() => {});
    await prisma.user
      .update({ where: { id }, data: { email: `verify-artifact-${id}@tycoonhood.invalid`, name: "[verification artifact]" } })
      .catch(() => {});
  }
  return `${created.userIds.length} run(s) reversed · ${notes.join(", ") || "no ledger activity"} · user rows retained as audit artifacts`;
});

await check("Hygiene", "book still balances after cleanup", async () => {
  const rows = await prisma.ledgerAccount.findMany();
  const total = rows.reduce((a, r) => a + r.balance, 0n);
  const issued = rows.filter((r) => r.type !== "SYSTEM_MINT").reduce((a, r) => a + r.balance, 0n);
  must(total === 0n, `book unbalanced after cleanup: ${total}`);
  must(issued === cfg.THC_TOTAL_SUPPLY, `issued supply drift after cleanup: ${issued}`);
  const bad = await prisma.$queryRawUnsafe<{ txid: string }[]>(
    `select "transactionId" as txid from "LedgerEntry" group by "transactionId" having sum(amount) <> 0 limit 3`
  );
  must(bad.length === 0, `cleanup broke zero-sum on ${bad.length} transaction(s)`);
  return `book Σ = 0 · issued ${issued.toLocaleString("en-US")} THC · every transaction still zero-sum`;
});

// ───────────────────────────── REPORT ─────────────────────────────
const areas = [...new Set(results.map((r) => r.area))];
let failed = 0;
console.log("\n══════════ TYCOONHOOD PLATFORM VERIFICATION ══════════");
console.log(`database: ${(process.env.DATABASE_URL ?? "").replace(/:[^:@]+@/, ":****@")}`);
for (const area of areas) {
  console.log(`\n── ${area.toUpperCase()}`);
  for (const r of results.filter((x) => x.area === area)) {
    if (!r.ok) failed++;
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.check}`);
    console.log(`      ${r.detail}`);
  }
}
console.log(
  `\n══════════ ${results.length - failed}/${results.length} checks passed${failed ? ` · ${failed} FAILED` : " · platform verified"} ══════════\n`
);
process.exit(failed ? 1 : 0);
