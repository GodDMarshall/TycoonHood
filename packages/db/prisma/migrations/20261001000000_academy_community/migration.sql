-- ============================================================================
-- THE ACADEMY: COMMUNITY AND THE DAILY STANDARD
--
--   1. COMMUNITY — channels house-wide or inside one program, messages that
--      can carry the lesson they ask about or the proof of a win, unread
--      markers, member reports and moderator mutes.
--   2. THE DAILY STANDARD — the house's daily non-negotiables plus a few of a
--      member's own; ticks per local day; one row per day the standard is met.
--
-- Additive throughout. The seed rows at the end give an existing database the
-- default channels and standard without a re-seed; an admin edits them after.
-- ============================================================================

-- CreateEnum
CREATE TYPE "ChannelKind" AS ENUM ('CHAT', 'ANNOUNCEMENTS', 'WINS', 'QUESTIONS');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMMUNITY';

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "topic" TEXT,
    "kind" "ChannelKind" NOT NULL DEFAULT 'CHAT',
    "courseId" TEXT,
    "adminOnly" BOOLEAN NOT NULL DEFAULT false,
    "slowModeSec" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "proofUrl" TEXT,
    "lessonId" TEXT,
    "replyToId" TEXT,
    "pinnedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelRead" (
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelRead_pkey" PRIMARY KEY ("userId","channelId")
);

-- CreateTable
CREATE TABLE "MessageReport" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolution" TEXT,

    CONSTRAINT "MessageReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMute" (
    "userId" TEXT NOT NULL,
    "until" TIMESTAMP(3),
    "reason" TEXT,
    "mutedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMute_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "StandardItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "autoEvent" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StandardItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandardTick" (
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "tickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StandardTick_pkey" PRIMARY KEY ("userId","itemId","day")
);

-- CreateTable
CREATE TABLE "StandardDay" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "items" INTEGER NOT NULL,
    "metAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StandardDay_pkey" PRIMARY KEY ("userId","day")
);

-- CreateIndex
CREATE UNIQUE INDEX "Channel_slug_key" ON "Channel"("slug");

-- CreateIndex
CREATE INDEX "Channel_courseId_sortOrder_idx" ON "Channel"("courseId", "sortOrder");

-- CreateIndex
CREATE INDEX "Message_channelId_createdAt_idx" ON "Message"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_authorId_createdAt_idx" ON "Message"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_lessonId_createdAt_idx" ON "Message"("lessonId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageReport_resolvedAt_createdAt_idx" ON "MessageReport"("resolvedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReport_messageId_reporterId_key" ON "MessageReport"("messageId", "reporterId");

-- CreateIndex
CREATE INDEX "StandardItem_userId_active_idx" ON "StandardItem"("userId", "active");

-- CreateIndex
CREATE INDEX "StandardTick_userId_day_idx" ON "StandardTick"("userId", "day");

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelRead" ADD CONSTRAINT "ChannelRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelRead" ADD CONSTRAINT "ChannelRead_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMute" ADD CONSTRAINT "CommunityMute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardItem" ADD CONSTRAINT "StandardItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardTick" ADD CONSTRAINT "StandardTick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardTick" ADD CONSTRAINT "StandardTick_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StandardItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardDay" ADD CONSTRAINT "StandardDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A message is a message, not a document. The service caps it at 2,000
-- characters; this is the last line of defence.
ALTER TABLE "Message" ADD CONSTRAINT "message_body_length" CHECK (char_length("body") BETWEEN 1 AND 4000);
ALTER TABLE "Channel" ADD CONSTRAINT "channel_slow_mode_non_negative" CHECK ("slowModeSec" >= 0);

-- ════════════════════════════════════════════════════════════════════
-- Default channels. House-wide first, then two per published program.
-- ════════════════════════════════════════════════════════════════════
INSERT INTO "Channel" ("id", "slug", "name", "topic", "kind", "adminOnly", "slowModeSec", "sortOrder") VALUES
  ('chn_announcements', 'announcements', 'Announcements', 'News from the house. Only staff post here.', 'ANNOUNCEMENTS', true, 0, 0),
  ('chn_general', 'general', 'General', 'Talk to the rest of the house. Keep it useful.', 'CHAT', false, 10, 1),
  ('chn_wins', 'wins', 'Wins', 'Results, with proof. What you did and what it got you.', 'WINS', false, 60, 2)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Channel" ("id", "slug", "name", "topic", "kind", "courseId", "adminOnly", "slowModeSec", "sortOrder")
SELECT 'chn_' || c."slug" || '_discussion', c."slug" || '-discussion', 'Discussion',
       'Talk about the work of this program with the people doing it.', 'CHAT', c."id", false, 10, 0
FROM "Course" c WHERE c."status" = 'PUBLISHED'
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Channel" ("id", "slug", "name", "topic", "kind", "courseId", "adminOnly", "slowModeSec", "sortOrder")
SELECT 'chn_' || c."slug" || '_questions', c."slug" || '-questions', 'Questions',
       'Stuck on a lesson? Ask here. Questions from the lesson page land here with the lesson attached.', 'QUESTIONS', c."id", false, 10, 1
FROM "Course" c WHERE c."status" = 'PUBLISHED'
ON CONFLICT ("slug") DO NOTHING;

-- ════════════════════════════════════════════════════════════════════
-- The house standard. Edit or replace in Admin → Daily standard.
-- "Study" ticks itself when a lesson is completed that day.
-- ════════════════════════════════════════════════════════════════════
INSERT INTO "StandardItem" ("id", "title", "detail", "autoEvent", "sortOrder") VALUES
  ('std_train', 'Train', '30 minutes of deliberate physical training.', NULL, 0),
  ('std_study', 'Study', 'Complete one lesson. Ticks itself when you do.', 'LESSON_COMPLETED', 1),
  ('std_deep_work', 'Deep work', '90 minutes on your most important project, phone in another room.', NULL, 2),
  ('std_read', 'Read', 'Ten pages of a real book.', NULL, 3),
  ('std_plan', 'Plan tomorrow', 'Write tomorrow''s three priorities before you sleep.', NULL, 4)
ON CONFLICT ("id") DO NOTHING;
