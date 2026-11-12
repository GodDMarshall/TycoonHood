-- ============================================================================
-- LIVING ECOSYSTEM 1/8: PLATFORM FOUNDATION
--
-- Academies (one per Pillar, rows inserted here because the backfills below
-- need them), academy links on courses, challenges, groups, categories, posts
-- and XP, the notification centre, the activity feed and the analytics
-- aggregates, profile fields, Order.paidAt and staff-confirmed stock.
--
-- Additive except two privacy clean-ups (house rule: no raw IPs):
--   · Referral.signupIp held raw addresses. Nulled; the column is dropped by
--     a later migration once no deployed build writes it.
--   · Session.ipHash held an unkeyed SHA-256 of the address, which can be
--     reversed by trying every IPv4 address. Nulled; new rows use ipKey().
-- ============================================================================

UPDATE "Referral" SET "signupIp" = NULL WHERE "signupIp" IS NOT NULL;
UPDATE "Session" SET "ipHash" = NULL WHERE "ipHash" IS NOT NULL;

-- ---- CreateEnum / AlterEnum ----
CREATE TYPE "AcademyJoinSource" AS ENUM ('SELF', 'ENROLMENT', 'ONBOARDING', 'BACKFILL');

CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH');

CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

CREATE TYPE "DigestFrequency" AS ENUM ('OFF', 'DAILY', 'WEEKLY');

CREATE TYPE "ScheduledNotificationStatus" AS ENUM ('PENDING', 'SENT', 'LOGGED', 'SKIPPED', 'CANCELLED', 'FAILED');

CREATE TYPE "AnnouncementPriority" AS ENUM ('NORMAL', 'IMPORTANT');

CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL', 'ROLE', 'ACADEMY', 'GROUP', 'COURSE');

CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'RETRACTED');

CREATE TYPE "ActivityEventKind" AS ENUM ('ACADEMY_JOINED', 'COURSE_COMPLETED', 'PATH_COMPLETED', 'ACHIEVEMENT_UNLOCKED', 'RANK_REACHED', 'CHALLENGE_JOINED', 'CHALLENGE_COMPLETED', 'PROJECT_PUBLISHED', 'PROJECT_VERIFIED', 'SKILL_VERIFIED', 'INTRODUCTION_POSTED', 'UPDATE_POSTED', 'DISCUSSION_FEATURED', 'GROUP_CREATED', 'GROUP_ANNOUNCEMENT', 'EVENT_PUBLISHED', 'MENTOR_JOINED', 'ARTICLE_PUBLISHED', 'OPPORTUNITY_PUBLISHED', 'COMMUNITY_MILESTONE');

CREATE TYPE "ActivityAudience" AS ENUM ('MEMBERS', 'ACADEMY', 'GROUP', 'COURSE', 'STAFF');

-- ---- AlterTable ----
ALTER TABLE "User" ADD COLUMN     "excludeFromMetrics" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Profile" ADD COLUMN     "aiGuideConsentAt" TIMESTAMP(3),
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "dashboard" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "links" JSONB,
ADD COLUMN     "pinnedItems" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "previousTimezone" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "timezoneEffectiveAt" TIMESTAMP(3);

ALTER TABLE "Course" ADD COLUMN     "academyId" TEXT;

ALTER TABLE "XpEvent" ADD COLUMN     "academyId" TEXT;

ALTER TABLE "Challenge" ADD COLUMN     "academyId" TEXT;

ALTER TABLE "Notification" ADD COLUMN     "actorId" TEXT,
ADD COLUMN     "announcementId" TEXT,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "dedupeKey" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "groupCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "groupKey" TEXT,
ADD COLUMN     "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "seenAt" TIMESTAMP(3),
ADD COLUMN     "topic" TEXT;

ALTER TABLE "Product" ADD COLUMN     "academyId" TEXT,
ADD COLUMN     "stockConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "stockConfirmedById" TEXT;

ALTER TABLE "Order" ADD COLUMN     "paidAt" TIMESTAMP(3);

ALTER TABLE "CommunityCategory" ADD COLUMN     "academyId" TEXT;

ALTER TABLE "CommunityGroup" ADD COLUMN     "academyId" TEXT;

ALTER TABLE "CommunityPost" ADD COLUMN     "academyId" TEXT;

-- ---- CreateTable ----
CREATE TABLE "Academy" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pillar" "Pillar" NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "focusAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accent" TEXT NOT NULL,
    "heroPhoto" TEXT,
    "disclaimer" TEXT,
    "welcomeMd" TEXT,
    "flagshipCourseId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Academy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademyMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "source" "AcademyJoinSource" NOT NULL DEFAULT 'SELF',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "notify" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AcademyMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationTopic" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "defaultInApp" BOOLEAN NOT NULL DEFAULT true,
    "defaultEmail" BOOLEAN NOT NULL DEFAULT false,
    "defaultPush" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTopic_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "NotificationPreference" (
    "userId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId","topic","channel")
);

CREATE TABLE "NotificationSettings" (
    "userId" TEXT NOT NULL,
    "emailDigest" "DigestFrequency" NOT NULL DEFAULT 'OFF',
    "digestHour" INTEGER NOT NULL DEFAULT 8,
    "quietStartMin" INTEGER,
    "quietEndMin" INTEGER,
    "pausedUntil" TIMESTAMP(3),
    "emailOptOutAt" TIMESTAMP(3),
    "unsubscribeTokenHash" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "label" TEXT,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "priority" "AnnouncementPriority" NOT NULL DEFAULT 'NORMAL',
    "audience" "AnnouncementAudience" NOT NULL,
    "role" "UserRole",
    "academyId" TEXT,
    "groupId" TEXT,
    "courseId" TEXT,
    "sendEmail" BOOLEAN NOT NULL DEFAULT false,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "retractedAt" TIMESTAMP(3),
    "retractedById" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduledNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "channel" "NotificationChannel",
    "notificationId" TEXT,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL,
    "notAfter" TIMESTAMP(3),
    "payload" JSONB,
    "dedupeKey" TEXT NOT NULL,
    "status" "ScheduledNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "provider" TEXT,
    "providerMessageId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "kind" "ActivityEventKind" NOT NULL,
    "actorId" TEXT,
    "audience" "ActivityAudience" NOT NULL DEFAULT 'MEMBERS',
    "academyId" TEXT,
    "groupId" TEXT,
    "courseId" TEXT,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "facet" TEXT,
    "data" JSONB NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "hiddenAt" TIMESTAMP(3),
    "hiddenById" TEXT,
    "hiddenReason" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MemberActivityDay" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "surfaces" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "MemberActivityDay_pkey" PRIMARY KEY ("userId","day")
);

CREATE TABLE "AnalyticsDaily" (
    "day" DATE NOT NULL,
    "dau" INTEGER NOT NULL,
    "wau" INTEGER NOT NULL,
    "mau" INTEGER NOT NULL,
    "newMembers" INTEGER NOT NULL,
    "returningMembers" INTEGER NOT NULL,
    "enrolments" INTEGER NOT NULL,
    "lessonsCompleted" INTEGER NOT NULL,
    "courseCompletions" INTEGER NOT NULL,
    "quizAttempts" INTEGER NOT NULL,
    "quizPassed" INTEGER NOT NULL,
    "certificates" INTEGER NOT NULL,
    "missionCompletions" INTEGER NOT NULL,
    "challengeCompletions" INTEGER NOT NULL,
    "achievementsUnlocked" INTEGER NOT NULL,
    "communityParticipants" INTEGER NOT NULL,
    "posts" INTEGER NOT NULL,
    "comments" INTEGER NOT NULL,
    "chatMessages" INTEGER NOT NULL,
    "groupJoins" INTEGER NOT NULL,
    "mentorBookings" INTEGER NOT NULL,
    "mentorSessionsCompleted" INTEGER NOT NULL,
    "eventRegistrations" INTEGER NOT NULL,
    "eventAttendances" INTEGER NOT NULL,
    "opportunityApplications" INTEGER NOT NULL,
    "productViews" INTEGER NOT NULL,
    "cartAdds" INTEGER NOT NULL,
    "checkoutsStarted" INTEGER NOT NULL,
    "ordersPaidLive" INTEGER NOT NULL,
    "formulaVersion" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsDaily_pkey" PRIMARY KEY ("day")
);

CREATE TABLE "EngagementCounterDay" (
    "day" DATE NOT NULL,
    "metric" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL DEFAULT '',
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EngagementCounterDay_pkey" PRIMARY KEY ("day","metric","subjectId")
);

-- ---- CreateIndex ----
CREATE UNIQUE INDEX "Academy_slug_key" ON "Academy"("slug");

CREATE UNIQUE INDEX "Academy_pillar_key" ON "Academy"("pillar");

CREATE UNIQUE INDEX "Academy_flagshipCourseId_key" ON "Academy"("flagshipCourseId");

CREATE INDEX "AcademyMembership_academyId_leftAt_idx" ON "AcademyMembership"("academyId", "leftAt");

CREATE UNIQUE INDEX "AcademyMembership_userId_academyId_key" ON "AcademyMembership"("userId", "academyId");

CREATE UNIQUE INDEX "NotificationSettings_unsubscribeTokenHash_key" ON "NotificationSettings"("unsubscribeTokenHash");

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

CREATE INDEX "Announcement_status_scheduledFor_idx" ON "Announcement"("status", "scheduledFor");

CREATE UNIQUE INDEX "ScheduledNotification_dedupeKey_key" ON "ScheduledNotification"("dedupeKey");

CREATE INDEX "ScheduledNotification_status_runAt_idx" ON "ScheduledNotification"("status", "runAt");

CREATE INDEX "ScheduledNotification_subjectType_subjectId_idx" ON "ScheduledNotification"("subjectType", "subjectId");

CREATE INDEX "ScheduledNotification_userId_status_idx" ON "ScheduledNotification"("userId", "status");

CREATE UNIQUE INDEX "ActivityEvent_dedupeKey_key" ON "ActivityEvent"("dedupeKey");

CREATE INDEX "ActivityEvent_occurredAt_id_idx" ON "ActivityEvent"("occurredAt" DESC, "id");

CREATE INDEX "ActivityEvent_actorId_occurredAt_idx" ON "ActivityEvent"("actorId", "occurredAt");

CREATE INDEX "ActivityEvent_groupId_occurredAt_idx" ON "ActivityEvent"("groupId", "occurredAt");

CREATE INDEX "ActivityEvent_academyId_occurredAt_idx" ON "ActivityEvent"("academyId", "occurredAt");

CREATE INDEX "ActivityEvent_subjectType_subjectId_idx" ON "ActivityEvent"("subjectType", "subjectId");

CREATE INDEX "ActivityEvent_courseId_occurredAt_idx" ON "ActivityEvent"("courseId", "occurredAt");

CREATE INDEX "MemberActivityDay_day_idx" ON "MemberActivityDay"("day");

CREATE INDEX "Course_academyId_status_idx" ON "Course"("academyId", "status");

CREATE INDEX "XpEvent_academyId_createdAt_idx" ON "XpEvent"("academyId", "createdAt");

CREATE INDEX "XpEvent_source_createdAt_idx" ON "XpEvent"("source", "createdAt");

CREATE INDEX "Challenge_academyId_lifecycle_idx" ON "Challenge"("academyId", "lifecycle");

CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

CREATE INDEX "Notification_userId_archivedAt_createdAt_idx" ON "Notification"("userId", "archivedAt", "createdAt");

CREATE INDEX "Notification_announcementId_idx" ON "Notification"("announcementId");

CREATE INDEX "CommunityCategory_academyId_idx" ON "CommunityCategory"("academyId");

CREATE INDEX "CommunityPost_academyId_state_createdAt_idx" ON "CommunityPost"("academyId", "state", "createdAt");

-- ---- AddForeignKey ----
ALTER TABLE "Course" ADD CONSTRAINT "Course_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_stockConfirmedById_fkey" FOREIGN KEY ("stockConfirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunityCategory" ADD CONSTRAINT "CommunityCategory_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunityGroup" ADD CONSTRAINT "CommunityGroup_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Academy" ADD CONSTRAINT "Academy_flagshipCourseId_fkey" FOREIGN KEY ("flagshipCourseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AcademyMembership" ADD CONSTRAINT "AcademyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AcademyMembership" ADD CONSTRAINT "AcademyMembership_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationTopic" ADD CONSTRAINT "NotificationTopic_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationSettings" ADD CONSTRAINT "NotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CommunityGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_retractedById_fkey" FOREIGN KEY ("retractedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScheduledNotification" ADD CONSTRAINT "ScheduledNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScheduledNotification" ADD CONSTRAINT "ScheduledNotification_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CommunityGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_hiddenById_fkey" FOREIGN KEY ("hiddenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MemberActivityDay" ADD CONSTRAINT "MemberActivityDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---- Academies: the four rows (names are editable data; slug and pillar are stable) ----
INSERT INTO "Academy" ("id", "slug", "pillar", "name", "shortName", "tagline", "description", "focusAreas", "accent", "disclaimer", "status", "sortOrder", "createdAt", "updatedAt") VALUES
  ('academy_warrior', 'warrior', 'WARRIOR', 'Warrior Academy', 'Warrior',
   'Physical discipline, mental resilience, fitness, habits and self-mastery.',
   'Courses, challenges and discussions on physical discipline, mental resilience, fitness, habits and self-mastery.',
   ARRAY['Physical discipline', 'Mental resilience', 'Fitness', 'Habits', 'Self-mastery'],
   'warrior', NULL, 'PUBLISHED', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('academy_business', 'business', 'BUILDER', 'Business Academy', 'Business',
   'Entrepreneurship, business strategy, marketing, sales, leadership and execution.',
   'Courses, challenges and discussions on entrepreneurship, business strategy, marketing, sales, leadership and execution.',
   ARRAY['Entrepreneurship', 'Business strategy', 'Marketing', 'Sales', 'Leadership', 'Execution'],
   'builder', NULL, 'PUBLISHED', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('academy_wealth', 'wealth', 'TYCOON', 'Wealth Academy', 'Wealth',
   'Financial literacy, investment education, budgeting, wealth creation and financial planning.',
   'Courses, challenges and discussions on financial literacy, investment education, budgeting, wealth creation and financial planning.',
   ARRAY['Financial literacy', 'Investment education', 'Budgeting', 'Wealth creation', 'Financial planning'],
   'tycoon', 'Educational content, not financial advice.', 'PUBLISHED', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('academy_wellness', 'wellness', 'MIND', 'Wellness Academy', 'Wellness',
   'Mindfulness, meditation, emotional awareness, sleep and sustainable wellness.',
   'Courses, challenges and discussions on mindfulness, meditation, emotional awareness, sleep and sustainable wellness.',
   ARRAY['Mindfulness', 'Meditation', 'Emotional awareness', 'Sleep', 'Sustainable wellness'],
   'mind', 'Educational content, not medical advice.', 'PUBLISHED', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Flagship programmes. On a fresh database the courses do not exist yet, and the
-- base seed (seed.ts) sets the flagship when it creates them (only where it is still null).
UPDATE "Academy" a SET "flagshipCourseId" = c."id"
FROM "Course" c
WHERE a."flagshipCourseId" IS NULL
  AND c."slug" = CASE a."slug"
    WHEN 'warrior'  THEN 'warrior'
    WHEN 'business' THEN 'business-mastery'
    WHEN 'wealth'   THEN 'financial-planning-investment-advisory'
    WHEN 'wellness' THEN 'mindfulness-wellness'
  END;

-- ---- academyId backfills ----
UPDATE "Course" c SET "academyId" = a."id" FROM "Academy" a WHERE a."pillar" = c."pillar" AND c."academyId" IS NULL;
UPDATE "Challenge" ch SET "academyId" = a."id" FROM "Academy" a WHERE a."pillar" = ch."pillar" AND ch."academyId" IS NULL;
UPDATE "CommunityGroup" g SET "academyId" = a."id" FROM "Academy" a WHERE a."pillar" = g."pillar" AND g."academyId" IS NULL;
UPDATE "CommunityCategory" cc SET "academyId" = a."id"
FROM "Academy" a
WHERE cc."academyId" IS NULL
  AND a."slug" = CASE cc."slug" WHEN 'warrior' THEN 'warrior' WHEN 'business' THEN 'business' WHEN 'money' THEN 'wealth' WHEN 'mind' THEN 'wellness' END;
UPDATE "CommunityPost" p SET "academyId" = s."academyId"
FROM (
  SELECT p2."id", COALESCE(g."academyId", cc."academyId") AS "academyId"
  FROM "CommunityPost" p2
  LEFT JOIN "CommunityGroup" g ON g."id" = p2."groupId"
  LEFT JOIN "CommunityCategory" cc ON cc."id" = p2."categoryId"
) s
WHERE s."id" = p."id" AND s."academyId" IS NOT NULL AND p."academyId" IS NULL;
UPDATE "XpEvent" x SET "academyId" = c."academyId"
FROM "Lesson" l JOIN "CourseModule" m ON m."id" = l."moduleId" JOIN "Course" c ON c."id" = m."courseId"
WHERE x."source" = 'LESSON_COMPLETED' AND x."sourceId" = l."id" AND x."academyId" IS NULL;
UPDATE "XpEvent" x SET "academyId" = c."academyId" FROM "Course" c
WHERE x."source" = 'COURSE_COMPLETED' AND x."sourceId" = c."id" AND x."academyId" IS NULL;
UPDATE "XpEvent" x SET "academyId" = ch."academyId" FROM "Challenge" ch
WHERE x."source" = 'CHALLENGE_COMPLETED' AND x."sourceId" = ch."id" AND x."academyId" IS NULL;

-- Members already enrolled belong to the course's academy (dropped enrolments do not count).
-- notify stays false: enrolling in a programme is not a request for academy notices.
INSERT INTO "AcademyMembership" ("id", "userId", "academyId", "source", "joinedAt", "notify")
SELECT 'am' || md5(e."userId" || ':' || c."academyId"), e."userId", c."academyId", 'BACKFILL', MIN(e."enrolledAt"), false
FROM "Enrollment" e JOIN "Course" c ON c."id" = e."courseId"
WHERE e."status" <> 'DROPPED' AND c."academyId" IS NOT NULL
GROUP BY e."userId", c."academyId"
ON CONFLICT ("userId", "academyId") DO NOTHING;

-- ---- Notification centre ----
-- One unread, unarchived row per (member, groupKey): notify() coalesces into it with
-- INSERT ... ON CONFLICT ("userId", "groupKey") WHERE <same predicate> DO UPDATE.
CREATE UNIQUE INDEX "Notification_unread_group_key" ON "Notification" ("userId", "groupKey")
  WHERE "groupKey" IS NOT NULL AND "readAt" IS NULL AND "archivedAt" IS NULL;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_group_count_pos" CHECK ("groupCount" >= 1);
ALTER TABLE "NotificationSettings" ADD CONSTRAINT "NotificationSettings_digest_hour_range" CHECK ("digestHour" BETWEEN 0 AND 23);
ALTER TABLE "NotificationSettings" ADD CONSTRAINT "NotificationSettings_quiet_hours" CHECK (
  ("quietStartMin" IS NULL AND "quietEndMin" IS NULL)
  OR ("quietStartMin" BETWEEN 0 AND 1439 AND "quietEndMin" BETWEEN 0 AND 1439 AND "quietStartMin" <> "quietEndMin"));
-- The outbox carries email and push copies and timed notices; in-app rows are written directly.
ALTER TABLE "ScheduledNotification" ADD CONSTRAINT "ScheduledNotification_not_in_app" CHECK ("channel" IS NULL OR "channel" <> 'IN_APP');
ALTER TABLE "ScheduledNotification" ADD CONSTRAINT "ScheduledNotification_attempts_nonneg" CHECK ("attempts" >= 0);

-- ---- Order.paidAt, only where the time is recorded ----
-- THC orders: the ledger transaction that paid them.
UPDATE "Order" o SET "paidAt" = t."createdAt"
FROM "LedgerTransaction" t
WHERE o."ledgerTxId" = t."id" AND o."paidAt" IS NULL;
-- Rupee orders: the first order.paid (provider capture) or order.settle_manual audit row.
-- settle_manual is written only after a successful settle; its meta.to may be FULFILLED.
UPDATE "Order" o SET "paidAt" = a."firstPaid"
FROM (
  SELECT "targetId", MIN("createdAt") AS "firstPaid"
  FROM "AuditLog"
  WHERE "targetType" = 'order' AND "action" IN ('order.paid', 'order.settle_manual')
  GROUP BY "targetId"
) a
WHERE a."targetId" = o."id" AND o."paidAt" IS NULL;
