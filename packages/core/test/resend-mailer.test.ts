/**
 * The web app's Resend adapter (apps/web/lib/mail/resend.ts), with fetch
 * standing in for Resend. A provider that accepts the connection and never
 * answers must not hold the request open: the send gives up, and the caller
 * counts it as not sent (for the undo notice, that puts the change back).
 */
import { afterEach, describe, expect, it, vi } from "vitest";

type Mailer = { send(m: { to: string; subject: string; text: string }): Promise<{ delivered: boolean; detail: string }> };
const resendModule = () =>
  import(/* @vite-ignore */ new URL("../../../apps/web/lib/mail/resend.ts", import.meta.url).href) as Promise<{
    resendMailer: Mailer;
    MAIL_SEND_TIMEOUT_MS: number;
  }>;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("The Resend mailer", () => {
  it("gives up on a send the provider never answers", { timeout: 3_000 }, async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    // The send's own clock, run by the test instead of waiting for it.
    const clock = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(clock.signal);
    // Accepts the connection, then never answers, unless the request gives up.
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal!.reason)))
      )
    );
    const { resendMailer, MAIL_SEND_TIMEOUT_MS } = await resendModule();
    const sending = resendMailer.send({ to: "someone@tycoonhood.test", subject: "Hello", text: "Hello" });
    clock.abort(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
    await expect(sending).rejects.toThrow(/timeout/);
    expect(timeout).toHaveBeenCalledWith(MAIL_SEND_TIMEOUT_MS);
    // Well inside any platform's limit on how long a request may run.
    expect(MAIL_SEND_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
  });
});
