-- ============================================================================
-- LIVING ECOSYSTEM 4/8: DAILY ACTIVITY ENGINE (directive §5, §11)
--
-- Mission cadence, verification and targeting; MissionCompletion.occurrence
-- (the period a completion fills, taken from the existing idempotency key);
-- challenge kinds, scopes, recurring templates and evidence; daily plans;
-- goals and check-ins. EvidenceSubmission is created here; the copy of
-- existing challenge evidence out of ChallengeParticipation.progress lands
-- later, with DAILY-B (20261113000900_challenge_evidence_move).
--
-- Existing missions keep working unchanged: repeatable weekly missions
-- become WEEKLY, other repeatable missions DAILY, the rest ONCE, all
-- published. cooldownHours is kept: DAILY-A enforces a cooldown above 24
-- hours as a minimum gap, so a 72-hour mission keeps its meaning. Existing occurrence strings ("once", "YYYY-MM-DD",
-- "week:YYYY-MM-DD") are exactly what the new code writes.
-- ============================================================================

-- ---- CreateEnum / AlterEnum ----
CREATE TYPE "MissionCadence" AS ENUM ('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY');

CREATE TYPE "MissionVerification" AS ENUM ('AUTO', 'SELF_REPORT', 'REVIEW');

CREATE TYPE "MissionKind" AS ENUM ('LEARNING', 'DISCIPLINE', 'BUSINESS_EXERCISE', 'FINANCIAL_LITERACY', 'FITNESS', 'MINDFULNESS', 'COMMUNITY', 'MENTOR', 'EVENT', 'OPPORTUNITY');

CREATE TYPE "PlanSlot" AS ENUM ('LEARN', 'PRACTICE', 'COMMUNITY', 'WEEKLY', 'EXPLORE');

CREATE TYPE "PlanItemKind" AS ENUM ('MISSION', 'LESSON', 'CHALLENGE', 'DISCUSSION', 'GOAL_CHECKIN', 'STANDARD', 'EVENT', 'OPPORTUNITY');

CREATE TYPE "GoalMetric" AS ENUM ('MANUAL', 'LESSONS_COMPLETED', 'COURSE_COMPLETED', 'STANDARD_DAYS', 'MISSIONS_COMPLETED', 'CHALLENGES_COMPLETED');

CREATE TYPE "GoalCadence" AS ENUM ('DAILY', 'WEEKLY');

CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'PAUSED', 'ABANDONED');

CREATE TYPE "GoalSource" AS ENUM ('MEMBER', 'GUIDE_SUGGESTION', 'ONBOARDING');

CREATE TYPE "ChallengeKind" AS ENUM ('RULE', 'DAILY_CHECKIN', 'SUBMISSION', 'GATED_SUBMISSIONS');

CREATE TYPE "ChallengeScope" AS ENUM ('HOUSE', 'ACADEMY', 'GROUP');

CREATE TYPE "ChallengeCadence" AS ENUM ('ONE_OFF', 'WEEKLY', 'MONTHLY');

CREATE TYPE "EvidenceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- ---- AlterTable ----
ALTER TABLE "Challenge" ADD COLUMN     "cadence" "ChallengeCadence" NOT NULL DEFAULT 'ONE_OFF',
ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "instanceKey" TEXT,
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" "ChallengeKind" NOT NULL DEFAULT 'RULE',
ADD COLUMN     "maxParticipants" INTEGER,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "scope" "ChallengeScope" NOT NULL DEFAULT 'HOUSE',
ADD COLUMN     "showBoard" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Mission" ADD COLUMN     "academyId" TEXT,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "cadence" "MissionCadence" NOT NULL DEFAULT 'ONCE',
ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "ctaHref" TEXT,
ADD COLUMN     "ctaLabel" VARCHAR(40),
ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "estimatedMinutes" INTEGER,
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "interestTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "kind" "MissionKind",
ADD COLUMN     "maxLevel" INTEGER,
ADD COLUMN     "minLevel" INTEGER,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startsAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "verification" "MissionVerification" NOT NULL DEFAULT 'AUTO',
ADD COLUMN     "weight" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "MissionCompletion" ADD COLUMN     "note" VARCHAR(500),
ADD COLUMN     "occurrence" TEXT,
ADD COLUMN     "submissionId" TEXT,
ADD COLUMN     "verification" "MissionVerification" NOT NULL DEFAULT 'AUTO';

-- ---- CreateTable ----
CREATE TABLE "DailyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" VARCHAR(10) NOT NULL,
    "timezone" TEXT NOT NULL,
    "algorithm" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyPlanItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "slot" "PlanSlot" NOT NULL,
    "kind" "PlanItemKind" NOT NULL,
    "refId" TEXT NOT NULL,
    "missionId" TEXT,
    "reason" VARCHAR(160) NOT NULL,
    "position" INTEGER NOT NULL,
    "swappedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "DailyPlanItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "why" VARCHAR(500),
    "academyId" TEXT,
    "metric" "GoalMetric" NOT NULL,
    "courseId" TEXT,
    "challengeId" TEXT,
    "targetCount" INTEGER,
    "cadence" "GoalCadence",
    "source" "GoalSource" NOT NULL DEFAULT 'MEMBER',
    "startsOn" DATE NOT NULL,
    "targetDate" DATE,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "achievedAt" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GoalCheckIn" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" VARCHAR(10) NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 1,
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalCheckIn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvidenceSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionId" TEXT,
    "challengeId" TEXT,
    "participationId" TEXT,
    "occurrence" TEXT,
    "text" TEXT NOT NULL,
    "url" TEXT,
    "status" "EvidenceStatus" NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "legacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceSubmission_pkey" PRIMARY KEY ("id")
);

-- ---- CreateIndex ----
CREATE INDEX "DailyPlan_dayKey_idx" ON "DailyPlan"("dayKey");

CREATE UNIQUE INDEX "DailyPlan_userId_dayKey_key" ON "DailyPlan"("userId", "dayKey");

CREATE INDEX "DailyPlanItem_kind_refId_idx" ON "DailyPlanItem"("kind", "refId");

CREATE UNIQUE INDEX "DailyPlanItem_planId_slot_position_key" ON "DailyPlanItem"("planId", "slot", "position");

CREATE INDEX "Goal_userId_status_idx" ON "Goal"("userId", "status");

CREATE INDEX "GoalCheckIn_userId_dayKey_idx" ON "GoalCheckIn"("userId", "dayKey");

CREATE UNIQUE INDEX "GoalCheckIn_goalId_dayKey_key" ON "GoalCheckIn"("goalId", "dayKey");

CREATE INDEX "EvidenceSubmission_status_createdAt_idx" ON "EvidenceSubmission"("status", "createdAt");

CREATE INDEX "EvidenceSubmission_challengeId_userId_idx" ON "EvidenceSubmission"("challengeId", "userId");

CREATE INDEX "EvidenceSubmission_missionId_userId_idx" ON "EvidenceSubmission"("missionId", "userId");

CREATE INDEX "Challenge_scope_lifecycle_idx" ON "Challenge"("scope", "lifecycle");

CREATE INDEX "Challenge_groupId_idx" ON "Challenge"("groupId");

CREATE UNIQUE INDEX "Challenge_templateId_instanceKey_key" ON "Challenge"("templateId", "instanceKey");

CREATE INDEX "Mission_active_cadence_idx" ON "Mission"("active", "cadence");

CREATE INDEX "Mission_academyId_idx" ON "Mission"("academyId");

CREATE UNIQUE INDEX "MissionCompletion_submissionId_key" ON "MissionCompletion"("submissionId");

CREATE INDEX "MissionCompletion_userId_completedAt_idx" ON "MissionCompletion"("userId", "completedAt");

CREATE UNIQUE INDEX "MissionCompletion_missionId_userId_occurrence_key" ON "MissionCompletion"("missionId", "userId", "occurrence");

-- ---- AddForeignKey ----
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CommunityGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Mission" ADD CONSTRAINT "Mission_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Mission" ADD CONSTRAINT "Mission_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Mission" ADD CONSTRAINT "Mission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MissionCompletion" ADD CONSTRAINT "MissionCompletion_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "EvidenceSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DailyPlan" ADD CONSTRAINT "DailyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DailyPlanItem" ADD CONSTRAINT "DailyPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DailyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DailyPlanItem" ADD CONSTRAINT "DailyPlanItem_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Goal" ADD CONSTRAINT "Goal_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Goal" ADD CONSTRAINT "Goal_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Goal" ADD CONSTRAINT "Goal_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GoalCheckIn" ADD CONSTRAINT "GoalCheckIn_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GoalCheckIn" ADD CONSTRAINT "GoalCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EvidenceSubmission" ADD CONSTRAINT "EvidenceSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EvidenceSubmission" ADD CONSTRAINT "EvidenceSubmission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EvidenceSubmission" ADD CONSTRAINT "EvidenceSubmission_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EvidenceSubmission" ADD CONSTRAINT "EvidenceSubmission_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "ChallengeParticipation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EvidenceSubmission" ADD CONSTRAINT "EvidenceSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---- Missions ----
UPDATE "Mission" SET
  "cadence" = (CASE
    WHEN "repeatable" AND "criteria"->>'within' = 'week' THEN 'WEEKLY'
    WHEN "repeatable" THEN 'DAILY'
    ELSE 'ONCE' END)::"MissionCadence",
  "publishedAt" = COALESCE("publishedAt", CURRENT_TIMESTAMP);
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_weight_nonneg" CHECK ("weight" >= 0);
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_level_range" CHECK ("minLevel" IS NULL OR "maxLevel" IS NULL OR "maxLevel" >= "minLevel");
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_window" CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "endsAt" > "startsAt");
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_minutes_pos" CHECK ("estimatedMinutes" IS NULL OR "estimatedMinutes" > 0);

-- idempotencyKey is "mission:<missionId>:<userId>:<occurrence>" (rewards.ts). A key
-- without that prefix keeps the whole key as its occurrence, so no row collides.
UPDATE "MissionCompletion" SET "occurrence" = CASE
  WHEN left("idempotencyKey", length('mission:' || "missionId" || ':' || "userId" || ':')) = 'mission:' || "missionId" || ':' || "userId" || ':'
  THEN substr("idempotencyKey", length('mission:' || "missionId" || ':' || "userId" || ':') + 1)
  ELSE "idempotencyKey" END
WHERE "occurrence" IS NULL;
ALTER TABLE "MissionCompletion" ALTER COLUMN "occurrence" SET NOT NULL;

-- ---- Challenges ----
UPDATE "Challenge" SET "kind" = (CASE "criteria"->>'event'
  WHEN 'DAILY_CHECKIN' THEN 'DAILY_CHECKIN'
  WHEN 'SUBMISSION' THEN 'SUBMISSION'
  WHEN 'GATED_SUBMISSIONS' THEN 'GATED_SUBMISSIONS'
  ELSE 'RULE' END)::"ChallengeKind";
UPDATE "Challenge" SET "publishedAt" = CURRENT_TIMESTAMP WHERE "lifecycle" IN ('UPCOMING', 'ACTIVE', 'ENDED') AND "publishedAt" IS NULL;
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_max_participants_pos" CHECK ("maxParticipants" IS NULL OR "maxParticipants" > 0);
-- Groups are archived, never deleted (groupId is RESTRICT); academies are archived, never deleted.
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_scope_target" CHECK (
  ("scope" <> 'GROUP' OR "groupId" IS NOT NULL) AND ("scope" <> 'ACADEMY' OR "academyId" IS NOT NULL));

-- ---- Evidence ----
ALTER TABLE "EvidenceSubmission" ADD CONSTRAINT "EvidenceSubmission_one_target" CHECK (num_nonnulls("missionId", "challengeId") = 1);
ALTER TABLE "EvidenceSubmission" ADD CONSTRAINT "EvidenceSubmission_mission_occurrence" CHECK ("missionId" IS NULL OR "occurrence" IS NOT NULL);
CREATE UNIQUE INDEX "EvidenceSubmission_open_mission_key" ON "EvidenceSubmission" ("missionId", "userId", "occurrence")
  WHERE "missionId" IS NOT NULL AND "status" IN ('PENDING', 'APPROVED');

-- Existing evidence stays in ChallengeParticipation.progress until DAILY-B switches
-- gamification/challenges.ts to EvidenceSubmission; 20261113000900_challenge_evidence_move
-- copies it then.

-- ---- Goals ----
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_target_count_pos" CHECK ("targetCount" IS NULL OR "targetCount" > 0);
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_dates" CHECK ("targetDate" IS NULL OR "targetDate" >= "startsOn");
ALTER TABLE "GoalCheckIn" ADD CONSTRAINT "GoalCheckIn_value_pos" CHECK ("value" > 0);
