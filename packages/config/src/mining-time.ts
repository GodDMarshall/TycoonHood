/**
 * HOW LONG IS THIS PRICE?
 *
 * The house rule for merch is "two to three months of mining buys one item".
 * A number in a form cannot be checked against that rule by eye, so this
 * turns any THC price into the time it actually represents — computed from
 * the live MINING config, so it stays true when the rates are tuned.
 *
 * Three play styles, because "how long to mine 18,000 THC" has no single
 * answer. The rig holds `capacityHours` of production and then idles, so a
 * member who claims often out-earns one who claims once a day.
 */
import { MINING } from "./mining";

export type PlayStyle = "casual" | "regular" | "dedicated";

export interface DailyYield {
  style: PlayStyle;
  /** Human label for the admin screen. */
  label: string;
  /** Claims per day this style makes. */
  claimsPerDay: number;
  /** THC mined per day at a given rig level. */
  thcPerDay: bigint;
}

/**
 * Claims per day by style. The rig idles once storage is full, so claiming
 * more often is the only way to approach the theoretical maximum.
 *   casual    — opens it once a day
 *   regular   — morning and evening
 *   dedicated — claims whenever storage fills
 */
const CLAIMS_PER_DAY: Record<PlayStyle, number> = {
  casual: 1,
  regular: 2,
  dedicated: 24 / MINING.capacityHours,
};

const STYLE_LABEL: Record<PlayStyle, string> = {
  casual: "Opens it once a day",
  regular: "Morning and evening",
  dedicated: "Claims every time storage fills",
};

export function ratePerHour(rigLevel: number): bigint {
  return MINING.baseRatePerHour * BigInt(Math.max(1, rigLevel));
}

export function capacity(rigLevel: number): bigint {
  return ratePerHour(rigLevel) * BigInt(MINING.capacityHours);
}

/** THC a member mines in a day at this rig level and play style. */
export function dailyYield(rigLevel: number, style: PlayStyle): bigint {
  const claims = CLAIMS_PER_DAY[style];
  const hoursBanked = Math.min(MINING.capacityHours, 24 / claims);
  // Whole hours of production per claim, times claims — never more than a
  // full day of the rig running flat out.
  const perClaim = (ratePerHour(rigLevel) * BigInt(Math.round(hoursBanked * 1000))) / 1000n;
  const total = perClaim * BigInt(Math.round(claims * 1000)) / 1000n;
  const ceiling = ratePerHour(rigLevel) * 24n;
  return total > ceiling ? ceiling : total;
}

export function yieldTable(rigLevel = 1): DailyYield[] {
  return (Object.keys(CLAIMS_PER_DAY) as PlayStyle[]).map((style) => ({
    style,
    label: STYLE_LABEL[style],
    claimsPerDay: CLAIMS_PER_DAY[style],
    thcPerDay: dailyYield(rigLevel, style),
  }));
}

export interface PriceInTime {
  priceThc: bigint;
  rigLevel: number;
  /** Days of mining alone, by play style. */
  days: Record<PlayStyle, number>;
  /** The house-rule verdict for physical goods. */
  verdict: "too cheap" | "on target" | "too expensive";
  /** Plain sentence for the admin screen. */
  summary: string;
}

/**
 * THE HOUSE RULE, stated once.
 *
 * The anchor is the flagship item, the Warrior Hoodie: 75 days of mining for a
 * regular member, at a shelf price of ₹2,499. Everything else in the catalogue
 * is priced in proportion to it, so a ₹499 bottle of chalk costs about a fifth
 * of a hoodie in THC as well as in money.
 *
 * The anchor is in rupees because the shop sells in rupees (amounts in paise).
 * No exchange rate is involved: THC is never converted to money, and a card
 * price in any other currency is not compared at all.
 *
 * ₹2,499 is the hoodie's house PLACEHOLDER price (PLACEHOLDER_INR in
 * packages/db/src/placeholder-prices.ts). Once the owner sets the hoodie's real
 * price, change pricePaise here to that price. The anchor must follow the real
 * price, or every THC price is judged against a number nobody pays.
 *
 * The 60–90 day window applies only to an item with NO rupee shelf price,
 * where there is nothing to anchor against.
 */
export const MERCH_TARGET_DAYS = { min: 60, max: 90 } as const;
export const MERCH_ANCHOR = { days: 75, currency: "INR", pricePaise: 2_499_00, tolerance: 0.25 } as const;

/**
 * THC per rupee of shelf price, derived from the anchor — never typed in. It
 * only keeps the two price tags in proportion; it is not an exchange rate.
 */
export function thcPerRupee(rigLevel = 1): number {
  const anchorThc = Number(dailyYield(rigLevel, "regular")) * MERCH_ANCHOR.days;
  return anchorThc / (MERCH_ANCHOR.pricePaise / 100);
}

/** What this item should cost in THC, given its rupee shelf price in paise. */
export function thcFor(pricePaise: number, rigLevel = 1): bigint {
  const raw = thcPerRupee(rigLevel) * (pricePaise / 100);
  const step = raw >= 20_000 ? 1_000 : raw >= 5_000 ? 500 : 100;
  return BigInt(Math.max(step, Math.round(raw / step) * step));
}

/** ₹2,499.00 — paise in, rupees out, with Indian digit grouping (en-IN). */
const rupees = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);

/**
 * Judges a THC price.
 *
 * With a rupee shelf price to anchor against, the question is whether the two
 * agree at the house rate — a small item being "only twelve days of mining" is
 * not a fault, it is a small item. Without one, the 60–90 day window is all
 * there is to go on. A card price in any other currency is not compared: the
 * anchor is in rupees and there is no exchange rate to use, so the time-only
 * verdict stands and the summary says no money comparison was made.
 *
 * `priceFiatCents` is the card price in minor units of `fiatCurrency` (paise
 * for INR). `anchored` is true only when the rupee comparison was made.
 */
export function judgePrice(
  priceThc: bigint,
  priceFiatCents: number | null | undefined,
  fiatCurrency: string | null | undefined,
  rigLevel = 1
): { verdict: PriceInTime["verdict"]; expected: bigint | null; summary: string; anchored: boolean } {
  const time = priceInTime(priceThc, rigLevel);

  if (priceFiatCents == null || priceFiatCents <= 0) {
    return { verdict: time.verdict, expected: suggestPrice(rigLevel), summary: time.summary, anchored: false };
  }

  if (fiatCurrency !== MERCH_ANCHOR.currency) {
    const where = fiatCurrency ? `in ${fiatCurrency}, not rupees` : "not in rupees";
    return {
      verdict: time.verdict,
      expected: suggestPrice(rigLevel),
      summary: `${time.summary} No money comparison is made, because the card price is ${where}.`,
      anchored: false,
    };
  }

  const expected = thcFor(priceFiatCents, rigLevel);
  const ratio = Number(priceThc) / Number(expected);
  const verdict =
    ratio < 1 - MERCH_ANCHOR.tolerance ? "too cheap"
    : ratio > 1 + MERCH_ANCHOR.tolerance ? "too expensive"
    : "on target";

  const money = rupees(priceFiatCents);
  const summary =
    verdict === "on target"
      ? `${time.summary.replace(/\.$/, "")} — in step with the ${money} shelf price.`
      : verdict === "too cheap"
        ? `${time.summary.replace(/\.$/, "")}, but ${money} on the shelf works out at about ${expected.toLocaleString("en-US")} THC. This is cheaper in THC than in money.`
        : `${time.summary.replace(/\.$/, "")}, while ${money} on the shelf works out at about ${expected.toLocaleString("en-US")} THC. This is dearer in THC than in money.`;

  return { verdict, expected, summary, anchored: true };
}

export function priceInTime(priceThc: bigint, rigLevel = 1): PriceInTime {
  const days = {} as Record<PlayStyle, number>;
  for (const style of Object.keys(CLAIMS_PER_DAY) as PlayStyle[]) {
    const per = dailyYield(rigLevel, style);
    days[style] = per <= 0n ? Infinity : Number(priceThc) / Number(per);
  }
  const regular = days.regular;
  const verdict =
    regular < MERCH_TARGET_DAYS.min ? "too cheap"
    : regular > MERCH_TARGET_DAYS.max ? "too expensive"
    : "on target";

  const months = regular / 30;
  const human =
    !isFinite(regular) ? "unreachable by mining"
    : regular < 1 ? "under a day of mining"
    : regular < 45 ? `about ${Math.round(regular)} days of mining`
    : `about ${months.toFixed(1)} months of mining`;

  return {
    priceThc,
    rigLevel,
    days,
    verdict,
    summary: `${human} for a member who claims twice a day at rig L${rigLevel}.`,
  };
}

/** The inverse: what should this cost to land on the house rule? */
export function suggestPrice(rigLevel = 1, targetDays = 75): bigint {
  return dailyYield(rigLevel, "regular") * BigInt(Math.round(targetDays));
}
