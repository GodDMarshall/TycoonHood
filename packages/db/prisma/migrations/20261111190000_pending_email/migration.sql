-- ============================================================================
-- PENDING EMAIL (account-security fix P3)
--
-- Additive only. An email change no longer takes effect at once: the address
-- the member asks for waits in "User"."pendingEmail" until the link emailed
-- to it is used. Until then "User"."email" stays the sign-in and reset
-- address.
--
-- Nullable with no default, so adding it does not rewrite the table and is
-- safe on a populated database. Deliberately not unique: two accounts may ask
-- for the same address, and the unique "email" decides who gets it when one
-- of them confirms.
-- ============================================================================

-- AlterTable
ALTER TABLE "User" ADD COLUMN "pendingEmail" TEXT;
