/**
 * The web app's email-change actions, run as written: which address gets
 * the notice with the undo link when a change is confirmed
 * (verifyEmailAction), what happens when it cannot be sent, or when the
 * request dies while sending it, and how a refused request words its time
 * (changeEmailAction). Also a reset request whose email cannot be sent
 * (forgotPasswordAction), and the cron route that puts back changes whose
 * notice never went out. Stand-ins: the mail provider, which records what it
 * is given and accepts it, refuses it or never answers; Next's after(),
 * whose work the test runs when the response would have gone, its cache and
 * its JSON response; and the request's session and device.
 */
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@tycoonhood/db";
import { AccountService } from "../src/auth/account";
import { SessionService } from "../src/auth/session";
import { PasswordResetService } from "../src/auth/password-reset";
import { AccountSettingsService } from "../src/platform/account-settings";
import { EmailVerificationService } from "../src/platform/email-verification";
import { emailUndo } from "../src/platform/email-undo";
import { formatDayTime } from "../src/time/format";
import { uid } from "./helpers";

const request = vi.hoisted(() => ({ session: null as unknown }));
const mail = vi.hoisted(() => ({
  provider: "accepts" as "accepts" | "refuses" | "none" | "hangs",
  outbox: [] as { to: string; subject: string; text: string; accepted: boolean }[],
  afterResponse: [] as (() => unknown)[],
}));
vi.mock("../../../apps/web/lib/mail/index", () => {
  const mailer = {
    name: "test",
    available: true,
    async send(m: { to: string; subject: string; text: string }) {
      const accepted = mail.provider === "accepts";
      mail.outbox.push({ to: m.to, subject: m.subject, text: m.text, accepted });
      // A provider that never answers, and a request that never gets past it: the platform ends it there.
      if (mail.provider === "hangs") return new Promise<never>(() => {});
      return { delivered: accepted, detail: accepted ? "accepted" : "refused" };
    },
  };
  return {
    activeMailer: () => (mail.provider === "none" ? null : mailer),
    mailMode: () => (mail.provider === "none" ? "off" : "live"),
  };
});
vi.mock("../../../apps/web/node_modules/next/server.js", () => ({
  after: (work: () => unknown) => {
    mail.afterResponse.push(work);
  },
  NextResponse: { json: (body: unknown, init?: { status?: number }) => Response.json(body, { status: init?.status ?? 200 }) },
}));
vi.mock("../../../apps/web/node_modules/next/cache.js", () => ({ revalidatePath: () => {} }));
vi.mock("../../../apps/web/lib/auth", () => ({
  getCurrentSession: async () => request.session,
  getCurrentUser: async () => (request.session as { user?: unknown } | null)?.user ?? null,
  // A fresh throttle key per request, so the per-IP limit never trips here.
  deviceInfo: async () => ({ userAgent: null, ip: `test-${Math.random()}` }),
  setSessionCookie: async () => {},
  clearSessionCookie: async () => {},
  SESSION_COOKIE: "th_session",
}));

/** A module of the web app. The path is a variable, so core's typecheck leaves the web app alone. */
function webModule<T>(path: string): Promise<T> {
  return import(/* @vite-ignore */ new URL(`../../../apps/web/${path}`, import.meta.url).href);
}

type VerifyState = { done?: "verified" | "email-changed"; email?: string; signedIn?: boolean; error?: string; retry?: boolean };
type ForgotState = { done?: string; error?: string };
const actions = () =>
  webModule<{
    verifyEmailAction: (token: string, prev: VerifyState, fd: FormData) => Promise<VerifyState>;
    forgotPasswordAction: (prev: ForgotState, fd: FormData) => Promise<ForgotState>;
  }>("app/(auth)/actions.ts");
type FormState = { ok?: string; error?: string };
const settingsActions = () =>
  webModule<{ changeEmailAction: (prev: FormState, fd: FormData) => Promise<FormState> }>("app/(app)/settings/actions.ts");

const accounts = new AccountService(prisma);
const sessions = new SessionService(prisma);
const accountSettings = new AccountSettingsService(prisma);
const verification = new EmailVerificationService(prisma);
const resets = new PasswordResetService(prisma);
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const PASSWORD = "first password ok";
const address = (tag: string) => `${tag}-${uid().slice(0, 8)}@tycoonhood.test`;

/** A member who asked to move to a new address, with the link that confirms it. `confirmed`: whether they confirmed the old one. */
async function memberAsking(confirmed: boolean) {
  const oldEmail = address("old");
  const user = await accounts.register({ email: oldEmail, password: PASSWORD, name: "Action Case" });
  if (confirmed) await verification.verify((await verification.issue(user.id)).rawToken);
  const newEmail = address("new");
  const change = await accountSettings.changeEmail(user.id, newEmail, PASSWORD);
  return { user, oldEmail, newEmail, link: change!.rawToken };
}

/** Run what after() was given, as Next does once the response has gone. */
async function responseSent() {
  while (mail.afterResponse.length) await mail.afterResponse.shift()!();
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  request.session = null;
  mail.provider = "accepts";
  mail.outbox.length = 0;
  mail.afterResponse.length = 0;
});

describe("Confirming an email change in the web app", () => {
  it("mails the undo link to the previous address, and to no other", async () => {
    const { verifyEmailAction } = await actions();
    const { user, oldEmail, newEmail, link } = await memberAsking(true);
    expect(await verifyEmailAction(link, {}, new FormData())).toMatchObject({ done: "email-changed", email: newEmail });
    await responseSent();
    const withUndo = mail.outbox.filter((m) => m.text.includes("/undo-email/"));
    expect(withUndo.map((m) => m.to)).toEqual([oldEmail]);
    // The link it carries is the one that undoes this change.
    const raw = /\/undo-email\/([\w-]+)/.exec(withUndo[0]!.text)![1]!;
    const hold = await prisma.emailHold.findUnique({ where: { undoToken: sha256(raw) } });
    expect(hold).toMatchObject({ userId: user.id, address: oldEmail, changedTo: newEmail });
  });

  it.each([
    ["the provider refuses it", "refuses"],
    ["there is no mail provider", "none"],
  ] as const)("when that notice cannot be sent (%s), the change is put back and the member is told", async (_how, provider) => {
    const { verifyEmailAction } = await actions();
    const { user, oldEmail, newEmail, link } = await memberAsking(true);
    mail.provider = provider;
    const state = await verifyEmailAction(link, {}, new FormData());
    expect(state.done).toBeUndefined();
    expect(state.error).toMatch(/didn't go through/);
    expect(state.error).toMatch(/has not changed/);
    expect(state.error).not.toContain(oldEmail); // whoever used the link may not be the owner
    expect(state.retry).toBe(false); // the change is over: a new link for it cannot help
    const now = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(now).toMatchObject({ email: oldEmail, pendingEmail: null });
    expect(await prisma.emailHold.count({ where: { userId: user.id } })).toBe(0);
    await expect(accounts.authenticate({ email: oldEmail, password: PASSWORD })).resolves.toBeTruthy();
    const log = await prisma.auditLog.findFirst({ where: { action: "account.email.change.revert", targetId: user.id } });
    expect(log?.meta).toMatchObject({ from: newEmail, to: oldEmail, reason: "notice-not-sent" });
    await responseSent();
    expect(mail.outbox.filter((m) => m.accepted)).toEqual([]);
  });

  it("when the change is put back, the browser that used the link stays signed in, the other devices stay signed out, and the member is told", async () => {
    const { verifyEmailAction } = await actions();
    const { user, link } = await memberAsking(true);
    const phone = await sessions.create(user.id);
    const laptop = await sessions.create(user.id);
    request.session = await sessions.resolve(laptop.raw);
    mail.provider = "refuses";
    const state = await verifyEmailAction(link, {}, new FormData());
    expect(state.error).toMatch(/didn't go through/);
    // The confirmation signed the phone out before the notice was tried, and putting the address back does not sign it in again.
    expect(await sessions.resolve(laptop.raw)).not.toBeNull();
    expect(await sessions.resolve(phone.raw)).toBeNull();
    expect(state.error).toContain("You may need to sign in again on your other devices.");
  });

  it("an old address never confirmed gets a notice with no undo link, after the response, and the change stands", async () => {
    const { verifyEmailAction } = await actions();
    const { user, oldEmail, newEmail, link } = await memberAsking(false);
    expect(await verifyEmailAction(link, {}, new FormData())).toMatchObject({ done: "email-changed", email: newEmail });
    expect(mail.outbox).toEqual([]);
    await responseSent();
    expect(mail.outbox).toEqual([expect.objectContaining({ to: oldEmail, subject: "A Tycoonhood account changed its email" })]);
    expect(mail.outbox[0]!.text).not.toMatch(/undo-email/);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(newEmail);
  });

  it("when the notice went out, the hold records it and the change stands", async () => {
    const { verifyEmailAction } = await actions();
    const { user, newEmail, link } = await memberAsking(true);
    expect(await verifyEmailAction(link, {}, new FormData())).toMatchObject({ done: "email-changed", email: newEmail });
    const hold = await prisma.emailHold.findFirstOrThrow({ where: { userId: user.id } });
    expect(hold.noticeSentAt).toBeInstanceOf(Date);
  });

  it("when the notice went out but could not be recorded, the change is put back and the member is told", async () => {
    const { verifyEmailAction } = await actions();
    const { user, oldEmail, link } = await memberAsking(true);
    vi.spyOn(emailUndo, "markNoticeSent").mockRejectedValueOnce(new Error("Timed out fetching a new connection from the connection pool."));
    const state = await verifyEmailAction(link, {}, new FormData());
    expect(state.error).toMatch(/didn't go through/);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(oldEmail);
  });

  it("when putting the change back fails, the member is told it will be undone, and the sweep does it", async () => {
    const { verifyEmailAction } = await actions();
    const { user, oldEmail, newEmail, link } = await memberAsking(true);
    mail.provider = "refuses";
    const failing = vi
      .spyOn(emailUndo, "revertUnnotified")
      .mockRejectedValueOnce(new Error("Timed out fetching a new connection from the connection pool."));
    const state = await verifyEmailAction(link, {}, new FormData());
    expect(failing).toHaveBeenCalled();
    expect(state.done).toBeUndefined();
    expect(state.error).toMatch(/won't go through/);
    expect(state.error).not.toContain(oldEmail);
    expect(state.retry).toBe(false);
    // For now the change stands, recorded as never told. Once it is old enough, the sweep puts it back.
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(newEmail);
    await prisma.emailHold.updateMany({ where: { userId: user.id }, data: { createdAt: new Date(Date.now() - 60 * 60_000) } });
    expect(await emailUndo.putBackUnnotified({ userId: user.id })).toBe(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(oldEmail);
  });
});

describe("A confirmation whose request dies while the undo notice is being sent", () => {
  /** Use the link with a provider that never answers. Returns once the change has taken effect and its notice is stuck. */
  async function confirmedThenStuck(link: string, oldEmail: string) {
    const { verifyEmailAction } = await actions();
    mail.provider = "hangs";
    void verifyEmailAction(link, {}, new FormData());
    for (let i = 0; i < 300 && !mail.outbox.some((m) => m.to === oldEmail); i++) await new Promise((r) => setTimeout(r, 10));
    expect(mail.outbox.some((m) => m.to === oldEmail && m.text.includes("/undo-email/"))).toBe(true);
    mail.provider = "accepts";
  }

  /** As if the change took effect an hour ago. */
  const anHourOn = (userId: string) =>
    prisma.emailHold.updateMany({ where: { userId }, data: { createdAt: new Date(Date.now() - 60 * 60_000) } });

  it("is put back when the owner, told nothing, asks for a reset link for their address, and the link reaches them", async () => {
    const { forgotPasswordAction } = await actions();
    const { user, oldEmail, newEmail, link } = await memberAsking(true);
    await confirmedThenStuck(link, oldEmail);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(newEmail);
    await anHourOn(user.id);

    const form = new FormData();
    form.set("email", oldEmail);
    expect((await forgotPasswordAction({}, form)).done).toBeTruthy();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(oldEmail);
    const reset = mail.outbox.filter((m) => m.accepted && m.text.includes("/reset-password/"));
    expect(reset.map((m) => m.to)).toEqual([oldEmail]);
  });

  it("is put back by the daily sweep, which only Vercel Cron may call", async () => {
    const { user, oldEmail, link } = await memberAsking(true);
    await confirmedThenStuck(link, oldEmail);
    await anHourOn(user.id);
    vi.stubEnv("CRON_SECRET", "cron-test-secret");
    const { GET } = await webModule<{ GET: (req: Request) => Promise<Response> }>("app/api/cron/email-holds/route.ts");
    expect((await GET(new Request("http://localhost/api/cron/email-holds"))).status).toBe(401);
    const res = await GET(new Request("http://localhost/api/cron/email-holds", { headers: { authorization: "Bearer cron-test-secret" } }));
    expect(res.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(oldEmail);
    expect(await prisma.emailHold.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe("Asking for an email change in the web app", () => {
  it("a request refused as too soon names the moment it opens in the member's own zone", async () => {
    const { changeEmailAction } = await settingsActions();
    const { user, link } = await memberAsking(true);
    await verification.confirm(link); // the old address is held, and the change can be undone for 7 days
    const zone = "Australia/Sydney";
    await prisma.profile.create({ data: { userId: user.id, username: `zone${uid().slice(0, 8)}`, displayName: "Zone Case", timezone: zone } });
    request.session = await sessions.resolve((await sessions.create(user.id)).raw);
    const form = new FormData();
    form.set("email", address("second"));
    form.set("password", PASSWORD);
    const state = await changeEmailAction({}, form);
    const hold = await prisma.emailHold.findFirstOrThrow({ where: { userId: user.id } });
    const opens = new Date(Math.ceil(hold.expires.getTime() / 60_000) * 60_000);
    expect(state.error).toContain(`from ${formatDayTime(opens, zone)}.`);
    expect(state.error).not.toContain("IST");
  });
});

describe("Asking for a reset link in the web app", () => {
  it("a link that could not be sent does not count: after three refused sends, the next request still delivers one that works", async () => {
    const { forgotPasswordAction } = await actions();
    const email = address("reset");
    await accounts.register({ email, password: PASSWORD, name: "Reset Case" });
    const form = new FormData();
    form.set("email", email);
    // A provider outage, or a burst of refused sends someone provoked.
    mail.provider = "refuses";
    for (let i = 0; i < 3; i++) expect((await forgotPasswordAction({}, form)).done).toBeTruthy();
    expect(mail.outbox.filter((m) => m.to === email)).toHaveLength(3);

    mail.provider = "accepts";
    expect((await forgotPasswordAction({}, form)).done).toBeTruthy();
    const sent = mail.outbox.filter((m) => m.accepted);
    expect(sent.map((m) => m.to)).toEqual([email]);
    const raw = /\/reset-password\/([\w-]+)/.exec(sent[0]!.text)![1]!;
    await resets.resetPassword(raw, "owners new password");
    await expect(accounts.authenticate({ email, password: "owners new password" })).resolves.toBeTruthy();
  });
});
