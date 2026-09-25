-- ============================================================================
-- LAUNCH FOUNDATION
--
-- Three things the platform cannot launch without, in one migration so the
-- schema moves once:
--
--   1. MERCH   — a hoodie is five sizes with five stock counts, and a paid
--                parcel needs an address. Neither existed.
--   2. REFERRALS — spec §17. Growth loop, with the anti-abuse shape baked in
--                (one referrer per member, ever; reward on qualification,
--                not on signup).
--   3. WATCH-TO-EARN — tasks that pay THC for watching Tycoonhood videos,
--                with server-side timing so it cannot be farmed by a tab
--                left open or a script.
--
-- Additive throughout: every existing row keeps working untouched.
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════
-- 1. MERCH
-- ════════════════════════════════════════════════════════════════════

-- The economy model found fulfilment cost, not the THC pool, is the binding
-- constraint. It cannot be managed if it is never recorded.
ALTER TABLE "Product" ADD COLUMN "costCents" INTEGER;

CREATE TABLE "ProductVariant" (
    "id"             TEXT NOT NULL,
    "productId"      TEXT NOT NULL,
    "sku"            TEXT NOT NULL,
    "label"          TEXT NOT NULL,
    -- NULL price = inherit the parent product's price. An override exists for
    -- the real case where XXL costs more to make than S.
    "priceThc"       BIGINT,
    "priceFiatCents" INTEGER,
    "costCents"      INTEGER,
    "inventory"      INTEGER NOT NULL DEFAULT 0,
    "sortOrder"      INTEGER NOT NULL DEFAULT 0,
    "active"         BOOLEAN NOT NULL DEFAULT true,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");
CREATE INDEX "ProductVariant_productId_sortOrder_idx" ON "ProductVariant"("productId", "sortOrder");
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Stock is never negative. The guarded decrement in commerce relies on this as
-- its last line of defence, so a bug oversells nothing silently.
ALTER TABLE "ProductVariant" ADD CONSTRAINT "variant_inventory_non_negative" CHECK ("inventory" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "product_inventory_non_negative"
  CHECK ("inventory" IS NULL OR "inventory" >= 0);

-- variantLabel is a snapshot, not a join: renaming "M" to "Medium" next year
-- must not rewrite what someone bought last year.
ALTER TABLE "OrderItem" ADD COLUMN "variantId"    TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantLabel" TEXT;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");

-- Snapshotted per order rather than read from the profile, so an address
-- change never alters where a past parcel was sent.
CREATE TABLE "ShippingAddress" (
    "id"         TEXT NOT NULL,
    "orderId"    TEXT NOT NULL,
    "fullName"   TEXT NOT NULL,
    "line1"      TEXT NOT NULL,
    "line2"      TEXT,
    "city"       TEXT NOT NULL,
    "region"     TEXT,
    "postalCode" TEXT NOT NULL,
    "country"    TEXT NOT NULL,
    "phone"      TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShippingAddress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShippingAddress_orderId_key" ON "ShippingAddress"("orderId");
ALTER TABLE "ShippingAddress" ADD CONSTRAINT "ShippingAddress_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order" ADD COLUMN "shippedAt"       TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "trackingCarrier" TEXT;
ALTER TABLE "Order" ADD COLUMN "trackingNumber"  TEXT;

-- ════════════════════════════════════════════════════════════════════
-- 2. REFERRALS  (spec §17)
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE "Profile" ADD COLUMN "referralCode" TEXT;
CREATE UNIQUE INDEX "Profile_referralCode_key" ON "Profile"("referralCode");

CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'QUALIFIED', 'REJECTED');

CREATE TABLE "Referral" (
    "id"          TEXT NOT NULL,
    "referrerId"  TEXT NOT NULL,
    -- UNIQUE: a member can be referred once, by one person, ever. This is the
    -- structural defence against referral farming, not a policy in code.
    "referredId"  TEXT NOT NULL,
    "code"        TEXT NOT NULL,
    "status"      "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    -- Signup pays nothing. The reward lands only when the referred member
    -- does real work (finishes a lesson), which is what qualifiedAt records.
    "qualifiedAt" TIMESTAMP(3),
    "rewardTxId"  TEXT,
    "signupIp"    TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Referral_referredId_key" ON "Referral"("referredId");
CREATE INDEX "Referral_referrerId_status_idx" ON "Referral"("referrerId", "status");
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey"
  FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredId_fkey"
  FOREIGN KEY ("referredId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Nobody refers themselves.
ALTER TABLE "Referral" ADD CONSTRAINT "referral_not_self" CHECK ("referrerId" <> "referredId");

-- ════════════════════════════════════════════════════════════════════
-- 3. WATCH-TO-EARN
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE "WatchTask" (
    "id"             TEXT NOT NULL,
    "slug"           TEXT NOT NULL,
    "title"          TEXT NOT NULL,
    "description"    TEXT,
    -- Our own channel only. Storing the id, not a URL, keeps a third party
    -- from being paid for our attention.
    "youtubeVideoId" TEXT NOT NULL,
    "durationSec"    INTEGER NOT NULL,
    -- How much of it must actually be watched before it pays.
    "requiredSec"    INTEGER NOT NULL,
    "rewardThc"      BIGINT NOT NULL DEFAULT 0,
    "rewardXp"       INTEGER NOT NULL DEFAULT 0,
    "active"         BOOLEAN NOT NULL DEFAULT false,
    "sortOrder"      INTEGER NOT NULL DEFAULT 0,
    "publishedAt"    TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WatchTask_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WatchTask_slug_key" ON "WatchTask"("slug");
CREATE INDEX "WatchTask_active_sortOrder_idx" ON "WatchTask"("active", "sortOrder");
ALTER TABLE "WatchTask" ADD CONSTRAINT "watch_required_within_duration"
  CHECK ("requiredSec" > 0 AND "requiredSec" <= "durationSec");

CREATE TABLE "WatchCompletion" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "taskId"         TEXT NOT NULL,
    -- The server stamps startedAt and refuses to settle earlier than
    -- requiredSec of real wall-clock later. A script cannot outrun a clock.
    "startedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt"    TIMESTAMP(3),
    "secondsWatched" INTEGER NOT NULL DEFAULT 0,
    -- Member-local day, so a daily cap means their day, not UTC's.
    "dayKey"         TEXT NOT NULL,
    "rewardTxId"     TEXT,
    CONSTRAINT "WatchCompletion_pkey" PRIMARY KEY ("id")
);
-- One payout per member per video, ever.
CREATE UNIQUE INDEX "WatchCompletion_userId_taskId_key" ON "WatchCompletion"("userId", "taskId");
CREATE INDEX "WatchCompletion_userId_dayKey_idx" ON "WatchCompletion"("userId", "dayKey");
ALTER TABLE "WatchCompletion" ADD CONSTRAINT "WatchCompletion_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WatchCompletion" ADD CONSTRAINT "WatchCompletion_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "WatchTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
