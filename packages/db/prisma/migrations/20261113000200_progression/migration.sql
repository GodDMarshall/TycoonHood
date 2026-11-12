-- ============================================================================
-- LIVING ECOSYSTEM 2/8: PROGRESSION AND IDENTITY (directive §8)
--
-- Skills (linked to course modules, challenges, projects and opportunities),
-- member skills with self-declared vs verified levels, member projects with a
-- verification status, rank awards, achievement kinds and manual awards, and
-- learning paths. Additive only. Members who already hold a rank get a
-- GRANDFATHERED award so the rank page has a record of how they got it.
-- ============================================================================

-- ---- CreateEnum / AlterEnum ----
CREATE TYPE "SkillLevel" AS ENUM ('DECLARED', 'STARTED', 'PRACTISED', 'PROFICIENT', 'VERIFIED');

CREATE TYPE "SkillVerifiedVia" AS ENUM ('PROJECT_REVIEW', 'STAFF_CHECK', 'MENTOR_ASSESSMENT');

CREATE TYPE "ProjectKind" AS ENUM ('PROJECT', 'ARTICLE', 'VIDEO', 'TEMPLATE', 'TOOL', 'OTHER');

CREATE TYPE "ProjectVisibility" AS ENUM ('PRIVATE', 'MEMBERS', 'PUBLIC');

CREATE TYPE "ProjectVerificationStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED', 'CHANGES_REQUESTED', 'VERIFIED', 'NOT_VERIFIED');

CREATE TYPE "ProjectCollaboratorStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED', 'REMOVED');

CREATE TYPE "RankAwardReason" AS ENUM ('EARNED', 'GRANDFATHERED', 'ADMIN');

CREATE TYPE "AchievementKind" AS ENUM ('ACHIEVEMENT', 'MILESTONE', 'BADGE', 'RECOGNITION');

CREATE TYPE "PathStepKind" AS ENUM ('COURSE', 'MODULE', 'CHALLENGE', 'PROJECT_BRIEF', 'RESOURCE');

-- ---- AlterTable ----
ALTER TABLE "RankDefinition" ADD COLUMN     "criteria" JSONB,
ADD COLUMN     "summary" TEXT;

ALTER TABLE "Achievement" ADD COLUMN     "academyId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "kind" "AchievementKind" NOT NULL DEFAULT 'ACHIEVEMENT',
ADD COLUMN     "manualOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "UserAchievement" ADD COLUMN     "awardedById" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "sourceRef" TEXT;

-- ---- CreateTable ----
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "academyId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModuleSkill" (
    "moduleId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "ModuleSkill_pkey" PRIMARY KEY ("moduleId","skillId")
);

CREATE TABLE "ChallengeSkill" (
    "challengeId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "ChallengeSkill_pkey" PRIMARY KEY ("challengeId","skillId")
);

CREATE TABLE "MemberSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" "SkillLevel" NOT NULL,
    "declaredAt" TIMESTAMP(3),
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "reachedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "verifiedVia" "SkillVerifiedVia",
    "verificationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberSkill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "ProjectKind" NOT NULL DEFAULT 'PROJECT',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "bodyMd" TEXT,
    "url" TEXT,
    "links" JSONB,
    "coverImageUrl" TEXT,
    "academyId" TEXT,
    "courseId" TEXT,
    "challengeId" TEXT,
    "visibility" "ProjectVisibility" NOT NULL DEFAULT 'PRIVATE',
    "publishedAt" TIMESTAMP(3),
    "verificationStatus" "ProjectVerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "reviewNote" TEXT,
    "state" "ModerationState" NOT NULL DEFAULT 'VISIBLE',
    "featuredAt" TIMESTAMP(3),
    "featuredById" TEXT,
    "postId" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectCollaborator" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" VARCHAR(60),
    "status" "ProjectCollaboratorStatus" NOT NULL DEFAULT 'INVITED',
    "invitedById" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectCollaborator_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectSkill" (
    "projectId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "ProjectSkill_pkey" PRIMARY KEY ("projectId","skillId")
);

CREATE TABLE "RankAward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rankId" TEXT NOT NULL,
    "reason" "RankAwardReason" NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "awardedById" TEXT,
    "note" TEXT,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankAward_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningPath" (
    "id" TEXT NOT NULL,
    "academyId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "descriptionMd" TEXT,
    "audience" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningPathStep" (
    "id" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "kind" "PathStepKind" NOT NULL,
    "courseId" TEXT,
    "moduleId" TEXT,
    "challengeId" TEXT,
    "title" TEXT,
    "bodyMd" TEXT,
    "url" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LearningPathStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningPathFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "LearningPathFollow_pkey" PRIMARY KEY ("id")
);

-- ---- CreateIndex ----
CREATE UNIQUE INDEX "Skill_slug_key" ON "Skill"("slug");

CREATE INDEX "Skill_academyId_active_idx" ON "Skill"("academyId", "active");

CREATE INDEX "ModuleSkill_skillId_idx" ON "ModuleSkill"("skillId");

CREATE INDEX "ChallengeSkill_skillId_idx" ON "ChallengeSkill"("skillId");

CREATE INDEX "MemberSkill_skillId_level_idx" ON "MemberSkill"("skillId", "level");

CREATE UNIQUE INDEX "MemberSkill_userId_skillId_key" ON "MemberSkill"("userId", "skillId");

CREATE UNIQUE INDEX "Project_postId_key" ON "Project"("postId");

CREATE INDEX "Project_verificationStatus_submittedAt_idx" ON "Project"("verificationStatus", "submittedAt");

CREATE INDEX "Project_academyId_verificationStatus_idx" ON "Project"("academyId", "verificationStatus");

CREATE INDEX "Project_visibility_state_publishedAt_idx" ON "Project"("visibility", "state", "publishedAt");

CREATE INDEX "Project_featuredAt_idx" ON "Project"("featuredAt");

CREATE UNIQUE INDEX "Project_userId_slug_key" ON "Project"("userId", "slug");

CREATE INDEX "ProjectCollaborator_userId_status_idx" ON "ProjectCollaborator"("userId", "status");

CREATE UNIQUE INDEX "ProjectCollaborator_projectId_userId_key" ON "ProjectCollaborator"("projectId", "userId");

CREATE INDEX "ProjectSkill_skillId_idx" ON "ProjectSkill"("skillId");

CREATE INDEX "RankAward_userId_awardedAt_idx" ON "RankAward"("userId", "awardedAt");

CREATE UNIQUE INDEX "LearningPath_slug_key" ON "LearningPath"("slug");

CREATE INDEX "LearningPath_academyId_status_sortOrder_idx" ON "LearningPath"("academyId", "status", "sortOrder");

CREATE UNIQUE INDEX "LearningPathStep_pathId_sortOrder_key" ON "LearningPathStep"("pathId", "sortOrder");

CREATE INDEX "LearningPathFollow_pathId_idx" ON "LearningPathFollow"("pathId");

CREATE UNIQUE INDEX "LearningPathFollow_userId_pathId_key" ON "LearningPathFollow"("userId", "pathId");

-- ---- AddForeignKey ----
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Skill" ADD CONSTRAINT "Skill_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ModuleSkill" ADD CONSTRAINT "ModuleSkill_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ModuleSkill" ADD CONSTRAINT "ModuleSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChallengeSkill" ADD CONSTRAINT "ChallengeSkill_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChallengeSkill" ADD CONSTRAINT "ChallengeSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MemberSkill" ADD CONSTRAINT "MemberSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MemberSkill" ADD CONSTRAINT "MemberSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MemberSkill" ADD CONSTRAINT "MemberSkill_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_featuredById_fkey" FOREIGN KEY ("featuredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectCollaborator" ADD CONSTRAINT "ProjectCollaborator_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectCollaborator" ADD CONSTRAINT "ProjectCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectCollaborator" ADD CONSTRAINT "ProjectCollaborator_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectSkill" ADD CONSTRAINT "ProjectSkill_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectSkill" ADD CONSTRAINT "ProjectSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RankAward" ADD CONSTRAINT "RankAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RankAward" ADD CONSTRAINT "RankAward_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "RankDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RankAward" ADD CONSTRAINT "RankAward_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LearningPathStep" ADD CONSTRAINT "LearningPathStep_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "LearningPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LearningPathStep" ADD CONSTRAINT "LearningPathStep_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LearningPathStep" ADD CONSTRAINT "LearningPathStep_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LearningPathStep" ADD CONSTRAINT "LearningPathStep_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LearningPathFollow" ADD CONSTRAINT "LearningPathFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LearningPathFollow" ADD CONSTRAINT "LearningPathFollow_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "LearningPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---- Rank awards for ranks already held ----
INSERT INTO "RankAward" ("id", "userId", "rankId", "reason", "evidence", "awardedAt")
SELECT 'ra' || md5(u."id" || ':' || u."rankId"), u."id", u."rankId", 'GRANDFATHERED', jsonb_build_object('level', u."level"), CURRENT_TIMESTAMP
FROM "User" u
WHERE u."rankId" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

-- ---- Verification rules ----
ALTER TABLE "MemberSkill" ADD CONSTRAINT "MemberSkill_not_self_verified" CHECK ("verifiedById" IS NULL OR "verifiedById" <> "userId");
ALTER TABLE "MemberSkill" ADD CONSTRAINT "MemberSkill_verified_has_time" CHECK ("level" <> 'VERIFIED' OR "verifiedAt" IS NOT NULL);
ALTER TABLE "Project" ADD CONSTRAINT "Project_not_self_verified" CHECK ("verifiedById" IS NULL OR "verifiedById" <> "userId");
ALTER TABLE "Project" ADD CONSTRAINT "Project_verified_has_time" CHECK ("verificationStatus" <> 'VERIFIED' OR "verifiedAt" IS NOT NULL);
-- A step points at one kind of target. Target FKs are SET NULL on delete, so the
-- target itself may be null (the step then shows as unavailable).
ALTER TABLE "LearningPathStep" ADD CONSTRAINT "LearningPathStep_one_target" CHECK (CASE "kind"
  WHEN 'COURSE'    THEN "moduleId" IS NULL AND "challengeId" IS NULL
  WHEN 'MODULE'    THEN "courseId" IS NULL AND "challengeId" IS NULL
  WHEN 'CHALLENGE' THEN "courseId" IS NULL AND "moduleId" IS NULL
  ELSE "courseId" IS NULL AND "moduleId" IS NULL AND "challengeId" IS NULL AND "title" IS NOT NULL
END);
