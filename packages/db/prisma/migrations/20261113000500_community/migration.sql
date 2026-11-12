-- ============================================================================
-- LIVING ECOSYSTEM 5/8: LIVE COMMUNITY (directive §4)
--
-- Post kinds, edits, last activity, staff highlights, accepted answers and
-- one level of replies; group topics, review status, join policy, roles,
-- bans and member counts; follows, blocks and saved posts; who resolved a
-- report.
--
-- Changes behaviour in one place: CommunityPost.groupId becomes ON DELETE
-- RESTRICT (was SET NULL), so deleting a group can never move its posts
-- into the main feed. Groups are archived instead. The archive list moves
-- from the "community.archived" SiteSetting to archivedAt/status; the
-- setting row is left in place (ignored) and removed by a later release.
-- Posts in the introductions category stay DISCUSSION: an author may
-- already have two, which the one-introduction index would refuse.
-- ============================================================================

-- ---- CreateEnum / AlterEnum ----
CREATE TYPE "CommunityPostKind" AS ENUM ('DISCUSSION', 'QUESTION', 'UPDATE', 'INTRODUCTION', 'PROJECT', 'ANNOUNCEMENT');

CREATE TYPE "GroupTopic" AS ENUM ('PROGRAMME', 'BUSINESS', 'FITNESS', 'ENTREPRENEURSHIP', 'PERSONAL_DEVELOPMENT', 'TECHNOLOGY', 'LOCAL', 'OTHER');

CREATE TYPE "GroupStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'ARCHIVED');

CREATE TYPE "GroupJoinPolicy" AS ENUM ('OPEN', 'APPROVAL');

CREATE TYPE "GroupVisibility" AS ENUM ('MEMBERS', 'GROUP_ONLY');

CREATE TYPE "GroupRole" AS ENUM ('OWNER', 'MODERATOR', 'MEMBER');

CREATE TYPE "GroupMemberStatus" AS ENUM ('PENDING', 'INVITED', 'ACTIVE', 'BANNED');

CREATE TYPE "GroupNotifyLevel" AS ENUM ('ALL_POSTS', 'ANNOUNCEMENTS', 'NONE');

-- ---- DropForeignKey ----
ALTER TABLE "CommunityPost" DROP CONSTRAINT "CommunityPost_groupId_fkey";

-- ---- AlterTable ----
ALTER TABLE "CommunityCategory" ADD COLUMN     "archivedAt" TIMESTAMP(3);

ALTER TABLE "CommunityGroup" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "joinPolicy" "GroupJoinPolicy" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "memberCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "rules" TEXT,
ADD COLUMN     "status" "GroupStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "topic" "GroupTopic" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "visibility" "GroupVisibility" NOT NULL DEFAULT 'MEMBERS';

ALTER TABLE "GroupMembership" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "banReason" TEXT,
ADD COLUMN     "bannedAt" TIMESTAMP(3),
ADD COLUMN     "bannedById" TEXT,
ADD COLUMN     "invitedById" TEXT,
ADD COLUMN     "notifyLevel" "GroupNotifyLevel" NOT NULL DEFAULT 'ANNOUNCEMENTS',
ADD COLUMN     "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
ADD COLUMN     "status" "GroupMemberStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "CommunityPost" ADD COLUMN     "acceptedCommentId" TEXT,
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "featuredAt" TIMESTAMP(3),
ADD COLUMN     "featuredById" TEXT,
ADD COLUMN     "kind" "CommunityPostKind" NOT NULL DEFAULT 'DISCUSSION',
ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "publicPreviewConsentAt" TIMESTAMP(3);

ALTER TABLE "CommunityComment" ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "parentId" TEXT;

ALTER TABLE "ContentReport" ADD COLUMN     "resolvedById" TEXT;

-- ---- CreateTable ----
CREATE TABLE "Follow" (
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId","followingId")
);

CREATE TABLE "MemberBlock" (
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberBlock_pkey" PRIMARY KEY ("blockerId","blockedId")
);

CREATE TABLE "SavedPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedPost_pkey" PRIMARY KEY ("id")
);

-- ---- CreateIndex ----
CREATE INDEX "Follow_followingId_createdAt_idx" ON "Follow"("followingId", "createdAt");

CREATE INDEX "MemberBlock_blockedId_idx" ON "MemberBlock"("blockedId");

CREATE INDEX "SavedPost_userId_createdAt_idx" ON "SavedPost"("userId", "createdAt");

CREATE UNIQUE INDEX "SavedPost_userId_postId_key" ON "SavedPost"("userId", "postId");

CREATE INDEX "CommunityGroup_status_topic_idx" ON "CommunityGroup"("status", "topic");

CREATE INDEX "CommunityGroup_academyId_status_idx" ON "CommunityGroup"("academyId", "status");

CREATE INDEX "GroupMembership_groupId_status_role_idx" ON "GroupMembership"("groupId", "status", "role");

CREATE INDEX "GroupMembership_userId_status_idx" ON "GroupMembership"("userId", "status");

CREATE UNIQUE INDEX "CommunityPost_acceptedCommentId_key" ON "CommunityPost"("acceptedCommentId");

CREATE INDEX "CommunityPost_kind_createdAt_idx" ON "CommunityPost"("kind", "createdAt");

CREATE INDEX "CommunityPost_featuredAt_idx" ON "CommunityPost"("featuredAt");

CREATE INDEX "CommunityPost_state_lastActivityAt_idx" ON "CommunityPost"("state", "lastActivityAt");

CREATE INDEX "CommunityComment_parentId_idx" ON "CommunityComment"("parentId");

CREATE INDEX "ContentReport_targetType_targetId_idx" ON "ContentReport"("targetType", "targetId");

-- ---- AddForeignKey ----
ALTER TABLE "CommunityGroup" ADD CONSTRAINT "CommunityGroup_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunityGroup" ADD CONSTRAINT "CommunityGroup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunityGroup" ADD CONSTRAINT "CommunityGroup_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_bannedById_fkey" FOREIGN KEY ("bannedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CommunityGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_featuredById_fkey" FOREIGN KEY ("featuredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_acceptedCommentId_fkey" FOREIGN KEY ("acceptedCommentId") REFERENCES "CommunityComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CommunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MemberBlock" ADD CONSTRAINT "MemberBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MemberBlock" ADD CONSTRAINT "MemberBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavedPost" ADD CONSTRAINT "SavedPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavedPost" ADD CONSTRAINT "SavedPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---- Backfills ----
UPDATE "CommunityPost" p SET "lastActivityAt" = GREATEST(p."createdAt", COALESCE(
  (SELECT MAX(c."createdAt") FROM "CommunityComment" c WHERE c."postId" = p."id" AND c."state" = 'VISIBLE'),
  p."createdAt"));
UPDATE "CommunityGroup" g SET "memberCount" = (SELECT COUNT(*) FROM "GroupMembership" m WHERE m."groupId" = g."id");
UPDATE "CommunityGroup" g SET "topic" = 'PROGRAMME', "courseId" = c."id"
FROM "Course" c
WHERE (g."slug", c."slug") IN (
  ('warrior-program', 'warrior'),
  ('business-mastery-program', 'business-mastery'),
  ('financial-planning-program', 'financial-planning-investment-advisory'),
  ('mindfulness-wellness-program', 'mindfulness-wellness'));
UPDATE "CommunityCategory" c SET "archivedAt" = CURRENT_TIMESTAMP
FROM "SiteSetting" s
WHERE s."key" = 'community.archived' AND c."archivedAt" IS NULL
  AND jsonb_typeof(s."value"->'categories') = 'array' AND (s."value"->'categories') ? c."id";
UPDATE "CommunityGroup" g SET "status" = 'ARCHIVED', "archivedAt" = CURRENT_TIMESTAMP
FROM "SiteSetting" s
WHERE s."key" = 'community.archived' AND g."archivedAt" IS NULL
  AND jsonb_typeof(s."value"->'groups') = 'array' AND (s."value"->'groups') ? g."id";

-- ---- Rules ----
CREATE UNIQUE INDEX "GroupMembership_owner_key" ON "GroupMembership" ("groupId") WHERE "role" = 'OWNER';
CREATE UNIQUE INDEX "CommunityPost_introduction_key" ON "CommunityPost" ("authorId") WHERE "kind" = 'INTRODUCTION' AND "state" <> 'REMOVED';
ALTER TABLE "CommunityGroup" ADD CONSTRAINT "CommunityGroup_member_count_nonneg" CHECK ("memberCount" >= 0);
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_not_self" CHECK ("followerId" <> "followingId");
ALTER TABLE "MemberBlock" ADD CONSTRAINT "MemberBlock_not_self" CHECK ("blockerId" <> "blockedId");
