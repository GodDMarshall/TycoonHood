/**
 * PLACEHOLDER RUPEE PRICES — one table for seed-shop.ts and seed-merch.ts.
 *
 * Every amount is paise (₹1 = 100 paise). These are PLACEHOLDERS: sensible
 * round numbers, not decisions and not supplier quotes. The owner sets real
 * prices and real landed costs in Admin → Products. Once a product is in
 * rupees its price is staff's: neither seed sets, changes or puts back a
 * rupee price, including one staff removed to sell for THC only.
 *
 * The Warrior Hoodie's ₹2,499 is also the anchor that THC price advice is
 * judged against (MERCH_ANCHOR in packages/config/src/mining-time.ts). If one
 * changes, change the other.
 *
 * Plain module with no database access, so tests can import it.
 */

/** Card price by product slug, in paise. PLACEHOLDERS — replace with real prices before launch. */
export const PLACEHOLDER_INR: Readonly<Record<string, number>> = {
  "warrior-hoodie": 2_499_00,
  "operator-tee": 1_199_00,
  "nano-chalk": 499_00,
  "lifting-straps": 699_00,
  "ledger-notebook": 599_00,
  "tycoonhood-training-tee": 999_00,
  "warrior-program-access": 3_999_00,
  "founders-playbook": 799_00,
};

/**
 * Landed cost per unit of the seeded merch, in paise. PLACEHOLDERS — replace
 * with real landed costs before anything ships, or the margin is fiction.
 * Each keeps about the share of its price that the old dollar placeholder had
 * (the hoodie's $31 of $89 is about 35%), rounded to ₹10. No exchange rate is
 * involved.
 */
export const PLACEHOLDER_COST_INR: Readonly<Record<string, number>> = {
  "warrior-hoodie": 870_00,
  "operator-tee": 370_00,
  "nano-chalk": 150_00,
  "lifting-straps": 200_00,
  "ledger-notebook": 180_00,
};

/** ₹2,499 or ₹2,499.50 — paise in, Indian digit grouping out. */
export const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;

/**
 * The rule both seeds follow: a product gets its placeholder rupee price only
 * while its card price is not in rupees. Every save in Admin → Products
 * writes INR (catalog.save), so a row in another currency is one only a seed
 * has written. A rupee row is staff's, with or without a card price: an
 * empty one means they sell it for THC only, and a re-run must not put a
 * price back (review finding 17).
 */
export function needsPlaceholderInr(p: { fiatCurrency: string }): boolean {
  return p.fiatCurrency !== "INR";
}

/**
 * Landed costs in US cents that the merch seed wrote before the shop moved to
 * rupees. A cost still equal to one of these is that stale dollar figure, not
 * a cost an admin entered.
 */
const OLD_DOLLAR_COST_CENTS: Readonly<Record<string, number>> = {
  "warrior-hoodie": 3100,
  "operator-tee": 1200,
  "nano-chalk": 480,
  "lifting-straps": 700,
  "ledger-notebook": 650,
};

export interface MoneyRow {
  priceFiatCents: number | null;
  fiatCurrency: string;
  costCents: number | null;
}

export interface PlaceholderMoney {
  /** Fields to write. A field left out is left as it is. */
  data: { priceFiatCents?: number; fiatCurrency?: "INR"; costCents?: number };
  /** The price moved to rupees from another currency, so size-level card prices (in that currency) must go. */
  clearSizeFiat: boolean;
  /** What happened, in plain words, for the seed's report. */
  notes: string[];
}

/**
 * What the merch seed writes for one product's money, given the row as it
 * stands (null when the product is new).
 *  - Price: the placeholder, only for a new product or when needsPlaceholderInr
 *    says so.
 *  - Cost: the placeholder, only for a new product, when the price is moving
 *    to rupees from another currency (the old cost was in that currency too),
 *    or when the cost is still exactly the old dollar placeholder the merch
 *    seed itself once wrote. A cost an admin entered, or cleared, is left alone.
 */
export function placeholderMoney(slug: string, existing: MoneyRow | null): PlaceholderMoney {
  const data: PlaceholderMoney["data"] = {};
  const notes: string[] = [];

  const price = PLACEHOLDER_INR[slug];
  const setPrice = price != null && (existing == null || needsPlaceholderInr(existing));
  const fromOtherCurrency = setPrice && existing != null && existing.fiatCurrency !== "INR";
  if (setPrice) {
    data.priceFiatCents = price;
    data.fiatCurrency = "INR";
    const was = fromOtherCurrency && existing.priceFiatCents != null
      ? `, was ${existing.fiatCurrency} ${(existing.priceFiatCents / 100).toFixed(2)}`
      : "";
    notes.push(`${rupees(price)} (PLACEHOLDER)${was}`);
  } else if (existing?.priceFiatCents != null && existing.fiatCurrency === "INR") {
    notes.push(`${rupees(existing.priceFiatCents)} already set in INR, kept`);
  } else if (existing?.fiatCurrency === "INR") {
    notes.push("no card price (THC only), kept");
  }

  const cost = PLACEHOLDER_COST_INR[slug];
  const old = existing?.costCents ?? null;
  const staleDollar = old != null && old === OLD_DOLLAR_COST_CENTS[slug];
  const setCost = cost != null && (existing == null || fromOtherCurrency || staleDollar);
  if (setCost) {
    data.costCents = cost;
    const was =
      old == null ? ""
      : fromOtherCurrency ? `, was ${existing!.fiatCurrency} ${(old / 100).toFixed(2)}`
      : `, was ${old}, the old dollar placeholder`;
    notes.push(`cost ${rupees(cost)} (PLACEHOLDER)${was}`);
  } else if (old != null) {
    notes.push(`cost ${rupees(old)} kept`);
  } else if (existing != null && cost != null) {
    notes.push("no landed cost, kept");
  }

  return { data, clearSizeFiat: fromOtherCurrency, notes };
}
