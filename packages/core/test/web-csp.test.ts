import { describe, it, expect } from "vitest";
import { videoEmbed } from "../../../apps/web/lib/video";

type HeaderRule = { source: string; headers: Array<{ key: string; value: string }> };

/** The Content-Security-Policy apps/web/next.config.mjs sends, as directive → sources. */
async function contentSecurityPolicy(): Promise<Map<string, string[]>> {
  const configUrl = new URL("../../../apps/web/next.config.mjs", import.meta.url).href;
  const config = (await import(/* @vite-ignore */ configUrl)).default;
  const rules: HeaderRule[] = await config.headers();
  const value = rules.flatMap((r) => r.headers).find((h) => h.key === "Content-Security-Policy")?.value;
  expect(value, "next.config.mjs sends a Content-Security-Policy").toBeTruthy();
  return new Map(
    value!
      .split(";")
      .map((d) => d.trim().split(/\s+/))
      .filter((parts) => parts[0])
      .map(([name, ...sources]) => [name, sources]),
  );
}

describe("Content-Security-Policy — lesson video players", () => {
  it("lets every player lib/video.ts embeds load in a frame", async () => {
    const frameSrc = (await contentSecurityPolicy()).get("frame-src") ?? [];
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://vimeo.com/123456789",
      "https://player.vimeo.com/video/123456789",
    ]) {
      const embed = videoEmbed(url);
      expect(embed && embed.kind !== "link", url).toBe(true);
      if (!embed || embed.kind === "link") continue;
      expect(frameSrc, `${url} embeds ${embed.src}`).toContain(new URL(embed.src).origin);
    }
  });

  it("frames only the payment and video providers", async () => {
    expect((await contentSecurityPolicy()).get("frame-src")?.slice().sort()).toEqual(
      [
        "https://js.stripe.com",
        "https://hooks.stripe.com",
        "https://api.razorpay.com",
        "https://checkout.razorpay.com",
        "https://www.youtube-nocookie.com",
        "https://player.vimeo.com",
      ].sort(),
    );
  });

  it("allows Vimeo as a frame and nowhere else", async () => {
    const policy = await contentSecurityPolicy();
    for (const [name, sources] of policy) {
      if (name !== "frame-src") expect(sources.join(" "), name).not.toMatch(/vimeo/i);
    }
    expect(policy.get("default-src")).toEqual(["'self'"]);
    expect(policy.get("object-src")).toEqual(["'none'"]);
    expect(policy.get("frame-ancestors")).toEqual(["'none'"]);
  });
});
