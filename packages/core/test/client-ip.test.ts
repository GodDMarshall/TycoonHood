import { describe, it, expect } from "vitest";
import { clientIpFrom, trustedProxyHops } from "../src/platform/client-ip";

describe("clientIpFrom — which X-Forwarded-For entry to believe", () => {
  it("takes the right-most entry by default, ignoring what the visitor put on the left", () => {
    expect(clientIpFrom({ forwardedFor: "6.6.6.6, 203.0.113.9" })).toBe("203.0.113.9");
    expect(clientIpFrom({ forwardedFor: "1.1.1.1,2.2.2.2, 3.3.3.3 , 198.51.100.7" }, 1)).toBe("198.51.100.7");
  });

  it("gives the same answer however the spoofed entries are rotated", () => {
    const seen = new Set(
      ["10.0.0.1", "10.0.0.2, 10.0.0.3", "", "not-an-ip"].map((spoof) =>
        clientIpFrom({ forwardedFor: `${spoof}, 198.51.100.7` }),
      ),
    );
    expect([...seen]).toEqual(["198.51.100.7"]);
  });

  it("counts trusted hops from the right", () => {
    expect(clientIpFrom({ forwardedFor: "6.6.6.6, 203.0.113.9, 10.1.2.3" }, 2)).toBe("203.0.113.9");
    expect(clientIpFrom({ forwardedFor: "6.6.6.6, 203.0.113.9, 10.1.2.3, 10.4.5.6" }, 3)).toBe("203.0.113.9");
  });

  it("uses a single entry, as Vercel or next start with no proxy leaves it", () => {
    expect(clientIpFrom({ forwardedFor: "203.0.113.9" })).toBe("203.0.113.9");
    // Fewer entries than hops: the left-most valid one.
    expect(clientIpFrom({ forwardedFor: "203.0.113.9" }, 2)).toBe("203.0.113.9");
  });

  it("reads IPv6, including compressed and IPv4-mapped forms", () => {
    expect(clientIpFrom({ forwardedFor: "6.6.6.6, 2001:db8::7" })).toBe("2001:db8::7");
    expect(clientIpFrom({ forwardedFor: "::1" })).toBe("::1");
    expect(clientIpFrom({ forwardedFor: "::ffff:192.0.2.1" })).toBe("::ffff:192.0.2.1");
    expect(clientIpFrom({ forwardedFor: "2001:0db8:0000:0000:0000:ff00:0042:8329" })).toBe("2001:0db8:0000:0000:0000:ff00:0042:8329");
    expect(clientIpFrom({ forwardedFor: "2001:DB8::A" })).toBe("2001:db8::a");
    expect(clientIpFrom({ forwardedFor: "2001:db8::1, fe80::1:2" }, 2)).toBe("2001:db8::1");
  });

  it("drops empty and malformed entries before counting", () => {
    expect(clientIpFrom({ forwardedFor: "garbage, , 203.0.113.9" })).toBe("203.0.113.9");
    expect(clientIpFrom({ forwardedFor: "203.0.113.9, unknown" })).toBe("203.0.113.9");
    expect(clientIpFrom({ forwardedFor: "1.1.1.1, 999.0.0.1, 2.2.2.2" }, 2)).toBe("1.1.1.1");
    for (const bad of [
      "unknown",
      "999.1.1.1",
      "1.2.3",
      "1.2.3.4.5",
      "01.2.3.4",
      "1.2.3.4:8080",
      "[::1]",
      "2001:db8:::1",
      "1::2::3",
      "1:2:3:4:5:6:7:8:9",
      "1:2:3:4:5:6:7",
      "fe80::1%eth0",
      "1.2.3.4 5.6.7.8",
      "<script>",
      `1:${"0:".repeat(40)}1`,
    ]) {
      expect(clientIpFrom({ forwardedFor: bad }), bad).toBeNull();
    }
  });

  it("falls back to X-Real-IP only when X-Forwarded-For has nothing usable", () => {
    expect(clientIpFrom({ forwardedFor: null, realIp: "203.0.113.9" })).toBe("203.0.113.9");
    expect(clientIpFrom({ forwardedFor: "garbage", realIp: " 203.0.113.9 " })).toBe("203.0.113.9");
    expect(clientIpFrom({ forwardedFor: "198.51.100.7", realIp: "203.0.113.9" })).toBe("198.51.100.7");
    expect(clientIpFrom({ realIp: "not an ip" })).toBeNull();
  });

  it("returns null when nothing valid is present", () => {
    expect(clientIpFrom({})).toBeNull();
    expect(clientIpFrom({ forwardedFor: "", realIp: "" })).toBeNull();
    expect(clientIpFrom({ forwardedFor: " , ,", realIp: null })).toBeNull();
  });

  it("treats an invalid hop count as 1", () => {
    for (const hops of [0, -1, 6, 1.5, Number.NaN]) {
      expect(clientIpFrom({ forwardedFor: "1.1.1.1, 2.2.2.2" }, hops), String(hops)).toBe("2.2.2.2");
    }
  });
});

describe("trustedProxyHops — reading TRUSTED_PROXY_HOPS", () => {
  it("accepts an integer from 1 to 5", () => {
    expect([1, 2, 3, 4, 5].map((n) => trustedProxyHops(String(n)))).toEqual([1, 2, 3, 4, 5]);
    expect(trustedProxyHops(" 2 ")).toBe(2);
  });

  it("means 1 when unset or invalid", () => {
    for (const raw of [undefined, null, "", " ", "0", "6", "10", "-1", "2.5", "1e1", "two", "0x2"]) {
      expect(trustedProxyHops(raw), String(raw)).toBe(1);
    }
  });
});
