-- ============================================================================
-- EMAIL HOLD (OQ-P, option 1: the undo link)
--
-- Additive only: one new, empty table. When an email change takes effect,
-- the address it replaced is held for the account for 7 days. While it is
-- held no one can register with it and no other account can move to it. The
-- notice to that address carries a single-use link that undoes the change;
-- "undoToken" is that link's SHA-256, cleared when the link is spent or a
-- later change ends it (the hold itself stays until "expires").
--
-- "address" is unique: an address is held for one account at a time. A
-- stale row for an address whose hold has ended is replaced, not added to.
-- Deleting a user deletes their holds.
-- ============================================================================

-- CreateTable
CREATE TABLE "EmailHold" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "changedTo" TEXT NOT NULL,
    "undoToken" TEXT,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailHold_address_key" ON "EmailHold"("address");

-- CreateIndex
CREATE UNIQUE INDEX "EmailHold_undoToken_key" ON "EmailHold"("undoToken");

-- CreateIndex
CREATE INDEX "EmailHold_userId_idx" ON "EmailHold"("userId");

-- AddForeignKey
ALTER TABLE "EmailHold" ADD CONSTRAINT "EmailHold_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
