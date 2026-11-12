-- ============================================================================
-- DELETION REQUESTS BELONG TO THE ACCOUNT
--
-- Additive only: one nullable column, its index and its foreign key on
-- "ContactMessage". A request to delete an account was found by the address
-- it was made from, so after an email change the account's Settings no
-- longer saw it, and whoever later took the old address saw it as theirs.
-- "userId" names the account a deletion request is for. Other messages
-- leave it NULL. Deleting the account keeps the message (SET NULL).
--
-- Backfill: every deletion request already filed names its account in its
-- text ("Account deletion requested by user <id> (...)"). The column is set
-- where that account still exists.
-- ============================================================================

-- AlterTable
ALTER TABLE "ContactMessage" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "ContactMessage_userId_idx" ON "ContactMessage"("userId");

-- AddForeignKey
ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill
UPDATE "ContactMessage" AS m
SET "userId" = u."id"
FROM "User" AS u
WHERE m."topic" = 'account-deletion'
  AND m."userId" IS NULL
  AND u."id" = substring(m."message" from '^Account deletion requested by user ([^ ]+) ');
