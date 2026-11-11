import { describe, it, expect } from "vitest";
import {
  emailChangeReply,
  mailWentOut,
  passwordResetReply,
  verificationResendReply,
  verifyLinkState,
  type MailMode,
  type MailOutcome,
} from "../src/platform/mail-outcome";

const OUTCOMES: MailOutcome[] = ["sent", "logged", "no-mailer", "failed"];
const MODES: MailMode[] = ["live", "dev", "off"];
/** Words that tell someone an email reached them. */
const CLAIMS_DELIVERY = /\bwe sent\b|^sent\b|we've emailed|on its way/i;
const text = (r: { ok?: string; error?: string; done?: string }) => r.ok ?? r.error ?? r.done ?? "";

describe("mailWentOut", () => {
  it("is true only when the email was accepted, or logged in dev mode", () => {
    expect(OUTCOMES.filter(mailWentOut)).toEqual(["sent", "logged"]);
  });
});

describe("verifyLinkState — what the banner may say", () => {
  it("never says a link was sent when there is no mail provider, whatever the database holds", () => {
    expect(verifyLinkState("off", true)).toBe("off");
    expect(verifyLinkState("off", false)).toBe("off");
  });

  it("says sent only when a usable link exists", () => {
    expect(verifyLinkState("live", true)).toBe("sent");
    expect(verifyLinkState("live", false)).toBe("unsent");
  });

  it("in dev mode, a usable link was logged, not emailed", () => {
    expect(verifyLinkState("dev", true)).toBe("logged");
    expect(verifyLinkState("dev", false)).toBe("unsent");
  });
});

describe("verificationResendReply", () => {
  it("claims delivery only when the provider accepted the email", () => {
    for (const o of OUTCOMES) {
      expect(CLAIMS_DELIVERY.test(text(verificationResendReply(o, "a@b.test"))), o).toBe(o === "sent");
    }
    expect(verificationResendReply("sent", "a@b.test").ok).toContain("a@b.test");
  });

  it("an email that was not sent is an error that says what to do", () => {
    for (const o of ["no-mailer", "failed"] as const) {
      const r = verificationResendReply(o, "a@b.test");
      expect(r.ok).toBeUndefined();
      expect(r.error).toMatch(/couldn't send/i);
      expect(r.error).toMatch(/try again later, or contact us/i);
    }
    expect(verificationResendReply("no-mailer", "a@b.test").error).toMatch(/email isn't available right now/);
  });

  it("dev mode says nothing was emailed", () => {
    expect(verificationResendReply("logged", "a@b.test").ok).toMatch(/^Dev mode: nothing was emailed/);
  });
});

describe("emailChangeReply", () => {
  it("always confirms the change, and claims the link went out only when it did", () => {
    for (const o of OUTCOMES) {
      const r = emailChangeReply(o, "new@b.test");
      expect(r.ok).toMatch(/^Email changed/);
      expect(CLAIMS_DELIVERY.test(r.ok.replace(/^Email changed\.\s*/, "")), o).toBe(o === "sent");
    }
  });

  it("when the link was not sent, says so and what to do", () => {
    for (const o of ["no-mailer", "failed"] as const) {
      const r = emailChangeReply(o, "new@b.test");
      expect(r.ok).toContain("new@b.test");
      expect(r.ok).toMatch(/couldn't send a confirmation link/);
      expect(r.ok).toMatch(/try again later, or contact us/i);
    }
  });
});

describe("passwordResetReply — never reveals whether an account exists", () => {
  it("depends on the mode alone, and never speaks of a missing account", () => {
    // The signature is the guarantee: no account (or lookup result) goes in.
    expect(passwordResetReply.length).toBe(1);
    for (const m of MODES) {
      expect(text(passwordResetReply(m)), m).not.toMatch(/no account|not found|doesn't exist|does not exist|unknown|not registered/i);
    }
  });

  it("with a mail provider, uses the conditional 'if an account uses that address' reply", () => {
    const r = passwordResetReply("live");
    expect(r.error).toBeUndefined();
    expect(r.done).toMatch(/^If an account uses that address, we've emailed it a link/);
    expect(r.done).toMatch(/contact us/);
  });

  it("with no mail provider, says email isn't available instead of claiming a send", () => {
    const r = passwordResetReply("off");
    expect(r.done).toBeUndefined();
    expect(r.error).toMatch(/^Email isn't available right now/);
    expect(r.error).toMatch(/try again later, or contact us/i);
    expect(CLAIMS_DELIVERY.test(r.error!)).toBe(false);
  });

  it("in dev mode, says nothing was emailed", () => {
    const r = passwordResetReply("dev");
    expect(r.done).toMatch(/^Dev mode: nothing was emailed/);
    expect(CLAIMS_DELIVERY.test(r.done!)).toBe(false);
  });
});
