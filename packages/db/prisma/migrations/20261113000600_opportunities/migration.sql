-- ============================================================================
-- LIVING ECOSYSTEM 6/8: OPPORTUNITY MARKETPLACE (directive §7)
--
-- Partners (organisations, PENDING -> VERIFIED review) and their members,
-- opportunities with honest compensation fields and skills, applications
-- with an append-only event log, saved opportunities, and a generated
-- full-text search column on Opportunity (never written by the client). One
-- HOUSE partner at most (created on first use by ensureHousePartner()). New
-- tables only.
-- ============================================================================

-- ---- CreateEnum / AlterEnum ----
CREATE TYPE "PartnerKind" AS ENUM ('HOUSE', 'BUSINESS', 'INDIVIDUAL', 'NONPROFIT', 'EDUCATION');

CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'VERIFIED', 'SUSPENDED', 'REJECTED');

CREATE TYPE "PartnerVerificationMethod" AS ENUM ('HOUSE', 'DOMAIN_EMAIL', 'BUSINESS_REGISTRATION', 'GSTIN', 'MANUAL');

CREATE TYPE "PartnerMemberRole" AS ENUM ('OWNER', 'EDITOR');

CREATE TYPE "OpportunityKind" AS ENUM ('FREELANCE_PROJECT', 'REMOTE_WORK', 'INTERNSHIP', 'CREATOR_COLLABORATION', 'AFFILIATE_PROGRAMME', 'BUSINESS_PARTNERSHIP', 'DIGITAL_PRODUCT', 'MARKETPLACE_SELLER', 'SKILL_PROJECT', 'COMMUNITY_COMPETITION');

CREATE TYPE "WorkMode" AS ENUM ('REMOTE', 'ONSITE', 'HYBRID');

CREATE TYPE "CompensationType" AS ENUM ('FIXED_FEE', 'HOURLY', 'STIPEND_MONTHLY', 'SALARY_ANNUAL', 'COMMISSION', 'REVENUE_SHARE', 'PRIZE', 'THC_REWARD', 'UNPAID', 'TO_BE_DISCUSSED');

CREATE TYPE "OpportunityApplyMode" AS ENUM ('IN_APP', 'EXTERNAL_URL', 'AFFILIATE_PROGRAMME', 'CHALLENGE');

CREATE TYPE "OpportunityStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'OPEN', 'PAUSED', 'CLOSED', 'FILLED', 'REJECTED', 'REMOVED');

CREATE TYPE "OpportunityApplicationStatus" AS ENUM ('SUBMITTED', 'VIEWED', 'SHORTLISTED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'COMPLETED');

CREATE TYPE "ApplicantContactField" AS ENUM ('EMAIL', 'PHONE', 'PORTFOLIO');

-- ---- CreateTable ----
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PartnerKind" NOT NULL,
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
    "statusReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verificationMethod" "PartnerVerificationMethod",
    "verificationNote" TEXT,
    "about" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "logoUrl" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "contactEmail" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "termsVersion" TEXT NOT NULL,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerMember" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PartnerMemberRole" NOT NULL DEFAULT 'EDITOR',
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "createdById" TEXT,
    "kind" "OpportunityKind" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "descriptionMd" TEXT NOT NULL,
    "academyId" TEXT,
    "workMode" "WorkMode",
    "location" TEXT,
    "commitment" TEXT,
    "startsOn" DATE,
    "endsOn" DATE,
    "eligibilityMd" TEXT NOT NULL,
    "minLevel" INTEGER,
    "minAge" INTEGER,
    "requiredCourseId" TEXT,
    "compensationType" "CompensationType" NOT NULL,
    "compMinCents" INTEGER,
    "compMaxCents" INTEGER,
    "compCurrency" TEXT NOT NULL DEFAULT 'INR',
    "commissionBps" INTEGER,
    "thcReward" BIGINT,
    "compensationTerms" TEXT NOT NULL,
    "applyBy" TIMESTAMP(3),
    "openings" INTEGER,
    "applyMode" "OpportunityApplyMode" NOT NULL DEFAULT 'IN_APP',
    "externalApplyUrl" TEXT,
    "applicationStepsMd" TEXT,
    "questions" JSONB NOT NULL DEFAULT '[]',
    "requiresPortfolio" BOOLEAN NOT NULL DEFAULT false,
    "challengeId" TEXT,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'DRAFT',
    "statusReason" TEXT,
    "riskFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "featuredAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "searchVector" tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
        setweight(to_tsvector('english', coalesce("summary", '')), 'B') ||
        setweight(to_tsvector('english', coalesce("descriptionMd", '')), 'C')
    ) STORED,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpportunitySkill" (
    "opportunityId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OpportunitySkill_pkey" PRIMARY KEY ("opportunityId","skillId")
);

CREATE TABLE "OpportunityApplication" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "status" "OpportunityApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "coverNote" TEXT NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "portfolioUrl" TEXT,
    "sharedFields" "ApplicantContactField"[] DEFAULT ARRAY[]::"ApplicantContactField"[],
    "contactSharedAt" TIMESTAMP(3),
    "attestedAdultAt" TIMESTAMP(3),
    "statusNote" TEXT,
    "partnerNote" TEXT,
    "skillSnapshot" JSONB NOT NULL DEFAULT '{}',
    "riskFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "decidedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunityApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpportunityApplicationEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromStatus" "OpportunityApplicationStatus",
    "toStatus" "OpportunityApplicationStatus" NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityApplicationEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedOpportunity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedOpportunity_pkey" PRIMARY KEY ("id")
);

-- ---- CreateIndex ----
CREATE UNIQUE INDEX "Partner_slug_key" ON "Partner"("slug");

CREATE INDEX "Partner_status_kind_idx" ON "Partner"("status", "kind");

CREATE INDEX "PartnerMember_userId_idx" ON "PartnerMember"("userId");

CREATE UNIQUE INDEX "PartnerMember_partnerId_userId_key" ON "PartnerMember"("partnerId", "userId");

CREATE UNIQUE INDEX "Opportunity_slug_key" ON "Opportunity"("slug");

CREATE INDEX "Opportunity_status_kind_applyBy_idx" ON "Opportunity"("status", "kind", "applyBy");

CREATE INDEX "Opportunity_partnerId_status_idx" ON "Opportunity"("partnerId", "status");

CREATE INDEX "Opportunity_academyId_status_idx" ON "Opportunity"("academyId", "status");

CREATE INDEX "Opportunity_searchVector_idx" ON "Opportunity" USING GIN ("searchVector");

CREATE INDEX "OpportunitySkill_skillId_idx" ON "OpportunitySkill"("skillId");

CREATE INDEX "OpportunityApplication_applicantId_status_idx" ON "OpportunityApplication"("applicantId", "status");

CREATE INDEX "OpportunityApplication_opportunityId_status_idx" ON "OpportunityApplication"("opportunityId", "status");

CREATE UNIQUE INDEX "OpportunityApplication_opportunityId_applicantId_key" ON "OpportunityApplication"("opportunityId", "applicantId");

CREATE INDEX "OpportunityApplicationEvent_applicationId_createdAt_idx" ON "OpportunityApplicationEvent"("applicationId", "createdAt");

CREATE INDEX "SavedOpportunity_userId_createdAt_idx" ON "SavedOpportunity"("userId", "createdAt");

CREATE UNIQUE INDEX "SavedOpportunity_userId_opportunityId_key" ON "SavedOpportunity"("userId", "opportunityId");

-- ---- AddForeignKey ----
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Partner" ADD CONSTRAINT "Partner_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PartnerMember" ADD CONSTRAINT "PartnerMember_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartnerMember" ADD CONSTRAINT "PartnerMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartnerMember" ADD CONSTRAINT "PartnerMember_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_requiredCourseId_fkey" FOREIGN KEY ("requiredCourseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OpportunitySkill" ADD CONSTRAINT "OpportunitySkill_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpportunitySkill" ADD CONSTRAINT "OpportunitySkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpportunityApplication" ADD CONSTRAINT "OpportunityApplication_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpportunityApplication" ADD CONSTRAINT "OpportunityApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpportunityApplicationEvent" ADD CONSTRAINT "OpportunityApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "OpportunityApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpportunityApplicationEvent" ADD CONSTRAINT "OpportunityApplicationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SavedOpportunity" ADD CONSTRAINT "SavedOpportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavedOpportunity" ADD CONSTRAINT "SavedOpportunity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Partner_house_key" ON "Partner" ("kind") WHERE "kind" = 'HOUSE';
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_compensation_range" CHECK (
  ("compMinCents" IS NULL OR "compMinCents" >= 0) AND ("compMaxCents" IS NULL OR "compMaxCents" >= 0)
  AND ("compMinCents" IS NULL OR "compMaxCents" IS NULL OR "compMaxCents" >= "compMinCents"));
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_commission_range" CHECK ("commissionBps" IS NULL OR "commissionBps" BETWEEN 0 AND 10000);
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_openings_pos" CHECK ("openings" IS NULL OR "openings" > 0);
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_thc_reward_pos" CHECK ("thcReward" IS NULL OR "thcReward" > 0);
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_external_url" CHECK ("applyMode" <> 'EXTERNAL_URL' OR "externalApplyUrl" IS NOT NULL);
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_min_age_range" CHECK ("minAge" IS NULL OR "minAge" BETWEEN 13 AND 100);
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_dates" CHECK ("startsOn" IS NULL OR "endsOn" IS NULL OR "endsOn" >= "startsOn");
