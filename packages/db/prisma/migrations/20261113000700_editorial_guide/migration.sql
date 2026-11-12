-- ============================================================================
-- LIVING ECOSYSTEM 7/8: EDITORIAL ENGINE AND GUIDE (directive §14, §15, §9, §17)
--
-- Post status workflow, kinds, bylines (an expert profile or a staff user),
-- categories, tags and revisions; consent and verification fields on
-- Testimonial; help articles (the FAQ moves here); the Guide's
-- conversations, messages and daily usage; generated full-text search
-- columns on Lesson, Post and HelpArticle (never written by the client).
--
-- Existing posts: no publishedAt -> DRAFT, publishedAt in the past ->
-- PUBLISHED, in the future -> SCHEDULED, so nothing changes on the site.
-- ============================================================================

-- ---- CreateEnum / AlterEnum ----
CREATE TYPE "PostKind" AS ENUM ('ARTICLE', 'LEARNING_INSIGHT', 'FOUNDER_NOTE', 'EXPERT_CONTRIBUTION', 'ACADEMY_UPDATE', 'SUCCESS_STORY', 'BUSINESS_GUIDE', 'WELLNESS_RESOURCE', 'INTERVIEW', 'EVENT_RECAP', 'ANNOUNCEMENT', 'PLATFORM_UPDATE');

CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

CREATE TYPE "ConsentSource" AS ENUM ('CONTACT_FORM', 'WRITTEN', 'IN_APP');

CREATE TYPE "HelpTopic" AS ENUM ('GETTING_STARTED', 'LEARNING', 'ACADEMIES', 'MENTORS', 'EVENTS', 'OPPORTUNITIES', 'THC', 'EARN', 'SHOP', 'COMMUNITY', 'ACCOUNT', 'PRIVACY');

CREATE TYPE "HelpAudience" AS ENUM ('PUBLIC', 'MEMBER');

CREATE TYPE "GuideMode" AS ENUM ('GUIDED', 'AI');

CREATE TYPE "GuideRole" AS ENUM ('MEMBER', 'GUIDE');

CREATE TYPE "GuideMessageKind" AS ENUM ('ANSWER', 'NO_SOURCE', 'REFUSAL', 'INTENT_RESULT', 'ERROR');

CREATE TYPE "GuideFeedback" AS ENUM ('HELPFUL', 'NOT_HELPFUL', 'WRONG');

-- ---- AlterTable ----
ALTER TABLE "Lesson" ADD COLUMN     "searchVector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("contentMd", '')), 'C')
  ) STORED;

ALTER TABLE "Post" ADD COLUMN     "academyId" TEXT,
ADD COLUMN     "authorInstructorId" TEXT,
ADD COLUMN     "authorUserId" TEXT,
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "coverAlt" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "featuredAt" TIMESTAMP(3),
ADD COLUMN     "featuredRank" INTEGER,
ADD COLUMN     "founderApprovalNote" TEXT,
ADD COLUMN     "founderApprovedAt" TIMESTAMP(3),
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" "PostKind" NOT NULL DEFAULT 'ARTICLE',
ADD COLUMN     "notifiedAt" TIMESTAMP(3),
ADD COLUMN     "notifyOnPublish" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readingMinutes" INTEGER,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "searchVector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("excerpt", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("contentMd", '')), 'C')
  ) STORED,
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT,
ADD COLUMN     "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "subjectConsentAt" TIMESTAMP(3),
ADD COLUMN     "subjectConsentNote" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "testimonialId" TEXT,
ADD COLUMN     "updatedById" TEXT;

ALTER TABLE "Testimonial" ADD COLUMN     "consentNote" TEXT,
ADD COLUMN     "consentSource" "ConsentSource",
ADD COLUMN     "consentWithdrawnAt" TIMESTAMP(3),
ADD COLUMN     "contactMessageId" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userId" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT;

-- ---- CreateTable ----
CREATE TABLE "PostRevision" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "contentMd" TEXT NOT NULL,
    "editorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PostCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PostTag" (
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "PostTag_pkey" PRIMARY KEY ("postId","tagId")
);

CREATE TABLE "HelpArticle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answerMd" TEXT NOT NULL,
    "topic" "HelpTopic" NOT NULL,
    "audience" "HelpAudience" NOT NULL DEFAULT 'PUBLIC',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "searchVector" tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce("question", '')), 'A') ||
        setweight(to_tsvector('english', coalesce("answerMd", '')), 'B')
    ) STORED,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpArticle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuideConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mode" "GuideMode" NOT NULL DEFAULT 'GUIDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuideMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "GuideRole" NOT NULL,
    "body" TEXT NOT NULL,
    "kind" "GuideMessageKind" NOT NULL DEFAULT 'ANSWER',
    "intent" TEXT,
    "sources" JSONB NOT NULL DEFAULT '[]',
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "model" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cacheReadTokens" INTEGER,
    "stopReason" TEXT,
    "feedback" "GuideFeedback",
    "feedbackNote" TEXT,
    "flaggedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuideMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuideUsage" (
    "userId" TEXT NOT NULL,
    "dayKey" VARCHAR(10) NOT NULL,
    "questions" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideUsage_pkey" PRIMARY KEY ("userId","dayKey")
);

-- ---- CreateIndex ----
CREATE INDEX "PostRevision_postId_createdAt_idx" ON "PostRevision"("postId", "createdAt");

CREATE UNIQUE INDEX "PostCategory_slug_key" ON "PostCategory"("slug");

CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

CREATE INDEX "PostTag_tagId_idx" ON "PostTag"("tagId");

CREATE UNIQUE INDEX "HelpArticle_slug_key" ON "HelpArticle"("slug");

CREATE INDEX "HelpArticle_topic_published_sortOrder_idx" ON "HelpArticle"("topic", "published", "sortOrder");

CREATE INDEX "HelpArticle_searchVector_idx" ON "HelpArticle" USING GIN ("searchVector");

CREATE INDEX "GuideConversation_userId_updatedAt_idx" ON "GuideConversation"("userId", "updatedAt");

CREATE INDEX "GuideMessage_conversationId_createdAt_idx" ON "GuideMessage"("conversationId", "createdAt");

CREATE INDEX "GuideMessage_feedback_createdAt_idx" ON "GuideMessage"("feedback", "createdAt");

CREATE INDEX "Lesson_searchVector_idx" ON "Lesson" USING GIN ("searchVector");

CREATE UNIQUE INDEX "Post_testimonialId_key" ON "Post"("testimonialId");

CREATE INDEX "Post_status_publishedAt_idx" ON "Post"("status", "publishedAt");

CREATE INDEX "Post_kind_status_publishedAt_idx" ON "Post"("kind", "status", "publishedAt");

CREATE INDEX "Post_featuredAt_idx" ON "Post"("featuredAt");

CREATE INDEX "Post_authorInstructorId_idx" ON "Post"("authorInstructorId");

CREATE INDEX "Post_categoryId_idx" ON "Post"("categoryId");

CREATE INDEX "Post_academyId_status_publishedAt_idx" ON "Post"("academyId", "status", "publishedAt");

CREATE INDEX "Post_searchVector_idx" ON "Post" USING GIN ("searchVector");

-- ---- AddForeignKey ----
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorInstructorId_fkey" FOREIGN KEY ("authorInstructorId") REFERENCES "Instructor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Post" ADD CONSTRAINT "Post_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Post" ADD CONSTRAINT "Post_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PostCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Post" ADD CONSTRAINT "Post_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Post" ADD CONSTRAINT "Post_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Post" ADD CONSTRAINT "Post_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "LiveEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Post" ADD CONSTRAINT "Post_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "Testimonial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Post" ADD CONSTRAINT "Post_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Post" ADD CONSTRAINT "Post_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Post" ADD CONSTRAINT "Post_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_contactMessageId_fkey" FOREIGN KEY ("contactMessageId") REFERENCES "ContactMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PostRevision" ADD CONSTRAINT "PostRevision_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostRevision" ADD CONSTRAINT "PostRevision_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HelpArticle" ADD CONSTRAINT "HelpArticle_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GuideConversation" ADD CONSTRAINT "GuideConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GuideMessage" ADD CONSTRAINT "GuideMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "GuideConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GuideMessage" ADD CONSTRAINT "GuideMessage_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GuideUsage" ADD CONSTRAINT "GuideUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---- Posts ----
UPDATE "Post" SET "status" = (CASE
  WHEN "publishedAt" IS NULL THEN 'DRAFT'
  WHEN "publishedAt" <= CURRENT_TIMESTAMP THEN 'PUBLISHED'
  ELSE 'SCHEDULED' END)::"PostStatus";
-- Each rule applies while a post is live or queued to go live.
ALTER TABLE "Post" ADD CONSTRAINT "Post_live_has_time" CHECK ("status" NOT IN ('SCHEDULED', 'PUBLISHED') OR "publishedAt" IS NOT NULL);
ALTER TABLE "Post" ADD CONSTRAINT "Post_story_has_testimonial" CHECK ("kind" <> 'SUCCESS_STORY' OR "status" NOT IN ('SCHEDULED', 'PUBLISHED') OR "testimonialId" IS NOT NULL);
ALTER TABLE "Post" ADD CONSTRAINT "Post_interview_has_consent" CHECK ("kind" <> 'INTERVIEW' OR "status" NOT IN ('SCHEDULED', 'PUBLISHED') OR "subjectConsentAt" IS NOT NULL);
ALTER TABLE "Post" ADD CONSTRAINT "Post_founder_note_approved" CHECK ("kind" <> 'FOUNDER_NOTE' OR "status" NOT IN ('SCHEDULED', 'PUBLISHED') OR "founderApprovedAt" IS NOT NULL);

-- ---- Guide ----
ALTER TABLE "GuideUsage" ADD CONSTRAINT "GuideUsage_counts_nonneg" CHECK ("questions" >= 0 AND "inputTokens" >= 0 AND "outputTokens" >= 0);
