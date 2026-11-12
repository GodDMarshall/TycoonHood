import { describe, it, expect } from "vitest";
import {
  emailChangedMail,
  emailChangedUnconfirmedMail,
  emailChangeLinkMail,
  emailChangeRequestedMail,
  emailChangeUndoneMail,
  emailChangeUndoneRemovedMail,
  maskEmail,
  passwordChangedMail,
} from "../src/platform/account-mail";

const SITE = "https://tycoonhood.test";

describe("maskEmail", () => {
  it("keeps two characters of each part and the top-level domain", () => {
    expect(maskEmail("newperson@example.com")).toBe("ne***@ex***.com");
    expect(maskEmail("me@mail.example.co.uk")).toBe("m***@ma***.uk");
  });

  it("shows one character of a short part, and never a whole one", () => {
    expect(maskEmail("ab@x.io")).toBe("a***@x***.io");
    expect(maskEmail("a@bc.in")).toBe("a***@b***.in");
    expect(maskEmail("not-an-email")).toBe("***");
  });
});

describe("Account security email", () => {
  it("the link goes only to the new address, and says nothing changes without it", () => {
    const m = emailChangeLinkMail(`${SITE}/verify-email/abc`);
    expect(m.text).toContain(`${SITE}/verify-email/abc`);
    expect(m.text).toMatch(/valid 24 hours, single use/);
    expect(m.text).toMatch(/changes only when the link is used/);
  });

  it("the notice to the current address masks the new one and says what to do if it wasn't them", () => {
    const m = emailChangeRequestedMail("newperson@example.com", SITE);
    expect(m.text).toContain("ne***@ex***.com");
    expect(m.text).not.toContain("newperson@example.com");
    expect(m.text).toMatch(/Nothing changes until that address is confirmed/);
    expect(m.text).toMatch(/If this wasn't you/);
    expect(m.text).toContain(`${SITE}/forgot-password`);
  });

  it("a change away from an address never confirmed: both say when the link starts to work, in India time, and the notice says to act before then", () => {
    const opensAt = new Date("2026-11-13T09:35:00Z"); // 15:05 in India: a link opens at a whole minute
    const link = emailChangeLinkMail(`${SITE}/verify-email/abc`, opensAt);
    expect(link.text).toContain(`${SITE}/verify-email/abc`);
    expect(link.text).toMatch(/never confirmed, so the change waits a day/);
    expect(link.text).toContain("from 13 Nov 2026, 15:05 IST");
    expect(link.text).toMatch(/changes only when the link is used/);

    const notice = emailChangeRequestedMail("newperson@example.com", SITE, opensAt);
    expect(notice.text).toContain("ne***@ex***.com");
    expect(notice.text).toMatch(/This address was never confirmed, so the change can't happen before 13 Nov 2026, 15:05 IST/);
    expect(notice.text).toMatch(/it can't be undone/);
    expect(notice.text).toMatch(/If this wasn't you, someone knows your password\. Before 13 Nov 2026, 15:05 IST, change it/);
    expect(notice.text).toContain(`${SITE}/forgot-password`);
    expect(notice.text).toMatch(/A new password cancels the change/);

    // With no wait, neither speaks of one.
    for (const m of [emailChangeLinkMail(`${SITE}/verify-email/abc`, null), emailChangeRequestedMail("newperson@example.com", SITE, null)]) {
      expect(m.text).not.toMatch(/never confirmed|IST/);
    }
  });

  it("the notice to the old address, once changed, masks the new one and carries the undo link", () => {
    const m = emailChangedMail("newperson@example.com", `${SITE}/undo-email/xyz`);
    expect(m.text).toContain("ne***@ex***.com");
    expect(m.text).not.toContain("newperson@example.com");
    expect(m.text).toMatch(/no longer signs in/);
    expect(m.text).toMatch(/If this wasn't you, undo it \(link valid 7 days, single use\)/);
    expect(m.text).toContain(`${SITE}/undo-email/xyz`);
    expect(m.text).toMatch(/signs out every device and asks for a new password/);
  });

  it("the notice to an old address never confirmed says the account moved, with no undo link, and where to ask", () => {
    const m = emailChangedUnconfirmedMail("newperson@example.com", SITE);
    expect(m.text).toContain("ne***@ex***.com");
    expect(m.text).not.toContain("newperson@example.com");
    expect(m.text).toMatch(/no longer signs in/);
    expect(m.text).toMatch(/never confirmed/);
    expect(m.text).not.toMatch(/undo-email/);
    expect(m.text).toContain(`${SITE}/contact`);
    // Whoever reads it may never have had the account, so it does not say "your email".
    expect(m.subject).not.toMatch(/your/i);
  });

  it("after an undo, each address hears about it and sees the other one masked", () => {
    const back = emailChangeUndoneMail("newperson@example.com", SITE);
    expect(back.text).toContain("ne***@ex***.com");
    expect(back.text).not.toContain("newperson@example.com");
    expect(back.text).toMatch(/was undone/);
    expect(back.text).toMatch(/signs in to your account again/);
    expect(back.text).toContain(`${SITE}/forgot-password`);

    const off = emailChangeUndoneRemovedMail("owner@example.com", SITE);
    expect(off.text).toContain("ow***@ex***.com");
    expect(off.text).not.toContain("owner@example.com");
    expect(off.subject).toMatch(/was undone/);
    expect(off.text).toMatch(/no longer signs in/);
    expect(off.text).toContain(`${SITE}/contact`);
  });

  it("the password notice says which devices were signed out", () => {
    expect(passwordChangedMail("settings", SITE).text).toMatch(/Every other device was signed out/);
    expect(passwordChangedMail("reset", SITE).text).toMatch(/Every device was signed out/);
    for (const via of ["settings", "reset"] as const) {
      const m = passwordChangedMail(via, SITE);
      expect(m.subject).toBe("Your Tycoonhood password was changed");
      expect(m.text).toContain(`${SITE}/forgot-password`);
    }
  });
});
