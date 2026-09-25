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
 * The anchor is the flagship item: roughly 75 days of mining for a regular
 * member, at a shelf price of $89. Everything else in the catalogue is priced
 * against that same exchange rate, so a $16 bottle of chalk costs about a
 * sixth of a hoodie in THC as well as in money.
 *
 * The 60–90 day window applies only to an item with NO shelf price, where
 * there is nothing to anchor against.
 */
export const MERCH_TARGET_DAYS = { min: 60, max: 90 } as const;
export const MERCH_ANCHOR = { days: 75, fiatCents: 8_900, tolerance: 0.25 } as const;

/** THC per dollar of shelf price, derived — never typed in. */
export function thcPerDollar(rigLevel = 1): number {
  const anchorThc = Number(dailyYield(rigLevel, "regular")) * MERCH_ANCHOR.days;
  return anchorThc / (MERCH_ANCHOR.fiatCents / 100);
}

/** What this item should cost in THC, given what it costs in money. */
export function thcFor(priceFiatCents: number, rigLevel = 1): bigint {
  const raw = thcPerDollar(rigLevel) * (priceFiatCents / 100);
  const step = raw >= 20_000 ? 1_000 : raw >= 5_000 ? 500 : 100;
  return BigInt(Math.max(step, Math.round(raw / step) * step));
}

/**
 * Judges a THC price.
 *
 * With a shelf price to anchor against, the question is whether the two agree
 * at the house exchange rate — a small item being "only twelve days of mining"
 * is not a fault, it is a small item. Without one, the 60–90 day window is all
 * there is to go on.
 */
export function judgePrice(
  priceThc: bigint,
  priceFiatCents: number | null | undefined,
  rigLevel = 1
): { verdict: PriceInTime["verdict"]; expected: bigint | null; summary: string } {
  const time = priceInTime(priceThc, rigLevel);

  if (priceFiatCents == null || priceFiatCents <= 0) {
    return { verdict: time.verdict, expected: suggestPrice(rigLevel), summary: time.summary };
  }

  const expected = thcFor(priceFiatCents, rigLevel);
  const ratio = Number(priceThc) / Number(expected);
  const verdict =
    ratio < 1 - MERCH_ANCHOR.tolerance ? "too cheap"
    : ratio > 1 + MERCH_ANCHOR.tolerance ? "too expensive"
    : "on target";

  const money = `$${(priceFiatCents / 100).toFixed(2)}`;
  const summary =
    verdict === "on target"
      ? `${time.summary.replace(/\.$/, "")} — in step with the ${money} shelf price.`
      : verdict === "too cheap"
        ? `${time.summary.replace(/\.$/, "")}, but ${money} on the shelf works out at about ${expected.toLocaleString("en-US")} THC. This is cheaper in THC than in money.`
        : `${time.summary.replace(/\.$/, "")}, while ${money} on the shelf works out at about ${expected.toLocaleString("en-US")} THC. This is dearer in THC than in money.`;

  return { verdict, expected, summary };
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
