/**
 * MERCH + WATCH-TO-EARN SEED.
 *
 * THC prices are not typed in. They are DERIVED from the live mining rates via
 * suggestPrice(), so the house rule — a physical item costs a regular member
 * roughly two to three months of mining — stays true if the rates are ever
 * tuned. Change MINING in @tycoonhood/config and re-run this; every THC price
 * moves with it.
 *
 * Card prices are rupees (fiatCurrency "INR", amounts in paise) from
 * PLACEHOLDER_INR, and landed costs are paise from PLACEHOLDER_COST_INR — the
 * table in placeholder-prices.ts that seed-shop.ts uses too. Both are
 * PLACEHOLDERS, not decisions: set real prices and real landed costs in
 * Admin → Products before any of this goes live, or the margin is fiction.
 *
 * Safe to re-run on a live database (DR-33). A product, size or video the
 * database does not have yet is created, as a draft. A size is made only once,
 * even if staff later give it another SKU (seed-record.ts). One it has is staff's
 * (/admin/products, /admin/videos): its wording, prices, stock, sizes, image,
 * whether it is live, and a video's title, rewards and order stay as they
 * left them. The one write a re-run can make is money the seed itself put in
 * the wrong currency (placeholderMoney says exactly when): a product still
 * priced in dollars moves to its rupee placeholder, the same rule as
 * seed-shop, and a landed cost still equal to the old dollar placeholder is
 * replaced. A rupee price, or a cost an admin entered or cleared, is left alone.
 *
 * Run: pnpm db:seed:merch
 */
import { prisma } from "./client";
import { suggestPrice, judgePrice } from "@tycoonhood/config";
import { placeholderMoney } from "./placeholder-prices";
import { SeedRecord } from "./seed-record";

/** Rounds to something a human would actually print on a price tag. */
const tidy = (n: bigint): bigint => {
  const v = Number(n);
  const step = v >= 20_000 ? 1_000 : v >= 5_000 ? 500 : 100;
  return BigInt(Math.max(step, Math.round(v / step) * step));
};

const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
/** Stock weighted the way clothing actually sells. */
const SIZE_STOCK: Record<string, number> = { S: 8, M: 18, L: 20, XL: 12, XXL: 6 };
/** A seeded size's SKU: WARRIORHOO-M for the hoodie's M. */
const skuOf = (slug: string, label: string) => `${slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)}-${label}`;

async function main() {
  // The anchor: one item ≈ 75 days of mining for a regular member.
  const anchor = tidy(suggestPrice(1, 75));

  const products = [
    {
      slug: "warrior-hoodie",
      kind: "PHYSICAL" as const,
      name: "Warrior Hoodie",
      description:
        "420gsm brushed-back cotton, boxy cut, embroidered mark at the chest — no print to crack. The thing you earn, not the thing you buy on impulse.",
      priceThc: anchor,
      sizes: true,
    },
    {
      slug: "operator-tee",
      kind: "PHYSICAL" as const,
      name: "Operator Tee",
      description:
        "240gsm heavyweight cotton, side-seamed, pre-shrunk. Plain enough to wear anywhere, heavy enough to last the year.",
      priceThc: tidy((anchor * 45n) / 100n),
      sizes: true,
    },
    {
      slug: "nano-chalk",
      kind: "PHYSICAL" as const,
      name: "Nano Chalk",
      description:
        "Liquid chalk, fast-drying, no dust and no mess in the bag. One bottle is roughly forty sessions.",
      priceThc: tidy((anchor * 18n) / 100n),
      sizes: false,
      inventory: 60,
    },
    {
      slug: "lifting-straps",
      kind: "PHYSICAL" as const,
      name: "Lifting Straps",
      description:
        "Cotton-weave straps with a neoprene wrist pad. Nothing clever — they just do not slip and they do not fray.",
      priceThc: tidy((anchor * 25n) / 100n),
      sizes: false,
      inventory: 40,
    },
    {
      slug: "ledger-notebook",
      kind: "PHYSICAL" as const,
      name: "The Ledger",
      description:
        "A5 hardcover, 192 dot-grid pages, lies flat. Built for the daily review: what you did, what it cost, what it returned.",
      priceThc: tidy((anchor * 22n) / 100n),
      sizes: false,
      inventory: 50,
    },
  ];

  // Sizes are made once and recorded (seed-record.ts), each product's as a
  // group: a size staff gave a new SKU must not come back on sale under its old
  // one, with stock that is not there.
  const sizeGroups = products.filter((p) => p.sizes).map((p) => SIZES.map((label) => skuOf(p.slug, label)));
  const madeSizes = await SeedRecord.load("sizes", sizeGroups, async (skus) =>
    (await prisma.productVariant.findMany({ where: { sku: { in: skus } }, select: { sku: true } })).map((v) => v.sku)
  );

  const moneyReport: string[] = [];
  for (const p of products) {
    const { sizes, inventory, ...rest } = p;
    // What the row already holds decides which money fields may be written.
    const existing = await prisma.product.findUnique({
      where: { slug: p.slug },
      select: { priceFiatCents: true, fiatCurrency: true, costCents: true },
    });
    const money = placeholderMoney(p.slug, existing);
    const data = {
      ...rest,
      ...money.data,
      image: null,
      category: "merchandise",
      // Seeded as DRAFTS on purpose. Nothing ships until the real costs and
      // the real stock are in, so publishing is a deliberate act in /admin.
      active: false,
      inventory: sizes ? null : (inventory ?? 0),
    };
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      // Staff own everything about it once it exists, but money still in the wrong currency.
      update: { ...money.data },
      create: { ...data, slug: p.slug },
    });
    if (money.clearSizeFiat) {
      // Size-level card prices were in the old currency, not paise.
      await prisma.productVariant.updateMany({ where: { productId: product.id }, data: { priceFiatCents: null } });
    }
    const { verdict } = judgePrice(product.priceThc!, product.priceFiatCents, product.fiatCurrency);
    moneyReport.push(`     ${p.slug}: ${product.priceThc!.toLocaleString("en-US")} THC (${verdict}) · ${money.notes.join(" · ")}`);

    if (sizes) {
      for (const [i, label] of SIZES.entries()) {
        const sku = skuOf(p.slug, label);
        const vdata = {
          label,
          // XXL genuinely costs more to make; the override exists for this.
          priceThc: label === "XXL" ? tidy((p.priceThc * 110n) / 100n) : null,
          inventory: SIZE_STOCK[label] ?? 10,
          sortOrder: i,
          active: true,
        };
        // Created once: staff rename, restock, reprice and reorder sizes in /admin/products.
        await madeSizes.once(sku, () =>
          prisma.productVariant.upsert({
            where: { sku },
            update: {},
            create: { productId: product.id, sku, ...vdata },
          })
        );
      }
    }
  }

  // ── Watch-to-earn ──────────────────────────────────────────────────────
  //
  // Video IDs are DELIBERATELY absent. A task pointing at the wrong video
  // pays members for watching somebody else's channel, so these are created
  // only when real ids are supplied via TH_SEED_VIDEOS.
  const videoSpec = process.env.TH_SEED_VIDEOS;
  let videoCount = 0;
  if (videoSpec) {
    // Format: slug|videoId|seconds|title  (one per line)
    for (const line of videoSpec.split("\n").map((l) => l.trim()).filter(Boolean)) {
      const [slug, videoId, secs, ...titleParts] = line.split("|");
      const durationSec = Number(secs);
      if (!slug || !/^[A-Za-z0-9_-]{11}$/.test(videoId ?? "") || !Number.isFinite(durationSec)) {
        console.warn(`  skipped malformed video line: ${line}`);
        continue;
      }
      const data = {
        title: titleParts.join("|") || slug,
        youtubeVideoId: videoId,
        durationSec,
        requiredSec: Math.floor(durationSec * 0.9),
        // Watching pays real but modest money: a video is minutes, the rig is days.
        rewardThc: tidy(suggestPrice(1, 0.5)),
        rewardXp: 20,
        active: false,
        sortOrder: videoCount,
      };
      // Created once, as a draft: staff edit and publish it in /admin/videos.
      await prisma.watchTask.upsert({ where: { slug }, update: {}, create: { ...data, slug } });
      videoCount++;
    }
  }

  // ── Report ─────────────────────────────────────────────────────────────
  const hoodie = await prisma.product.findUniqueOrThrow({
    where: { slug: "warrior-hoodie" },
    include: { variants: true },
  });
  const t = judgePrice(hoodie.priceThc!, hoodie.priceFiatCents, hoodie.fiatCurrency);

  console.log(`── Merch seed complete`);
  console.log(`   ${products.length} products (all DRAFT — publish them in /admin when costs are real)`);
  console.log(`   Prices and landed costs:`);
  for (const line of moneyReport) console.log(line);
  console.log(`   ${hoodie.variants.length} sizes on the hoodie, ${hoodie.variants.reduce((s, v) => s + v.inventory, 0)} units`);
  console.log(`   Hoodie at ${hoodie.priceThc!.toLocaleString("en-US")} THC — ${t.summary}`);
  console.log(`   Verdict: ${t.verdict}`);
  if (videoCount) {
    console.log(`   ${videoCount} watch tasks (DRAFT)`);
  } else {
    console.log(`   0 watch tasks — set TH_SEED_VIDEOS, or add them in /admin/videos.`);
    console.log(`     Format per line: slug|youtubeId|durationSeconds|Title`);
  }
  console.log(`   Rupee prices and costs marked PLACEHOLDER are not decisions. Set real ones in Admin → Products before publishing, or the margin is fiction.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
