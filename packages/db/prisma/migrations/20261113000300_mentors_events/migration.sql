-- ============================================================================
-- LIVING ECOSYSTEM 3/8: MENTORS, CONTRIBUTORS AND LIVE EVENTS (§2, §6, §12)
--
-- Instructor becomes the one expert profile (status, kinds, verification);
-- MentorProfile, categories, credentials, offerings and availability;
-- contributor applications, accounts, revenue-share agreements (no row is
-- inserted: paid offerings stay unpublishable until staff set terms) and
-- earnings; mentor-led cohorts; the content review queue; calendar feeds;
-- the LiveEvent family, with attendance confirmation and disputes;
-- Order.source BOOKING; contributor payouts on PayoutRequest (affiliateId
-- becomes nullable; exactly one payee is set); a generated full-text search
-- column on Instructor (never written by the client).
--
-- Additive except PayoutRequest.affiliateId DROP NOT NULL. Existing
-- instructors become ACTIVE INSTRUCTOR experts; slug "harsha" is the founder.
-- The one-to-one EventKind row is inserted here so booking code and test
-- databases built from migrations can rely on it.
-- ============================================================================

-- ---- CreateEnum / AlterEnum ----
CREATE TYPE "ExpertStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'SUSPENDED', 'ARCHIVED');

CREATE TYPE "ContributorKind" AS ENUM ('MENTOR', 'INSTRUCTOR', 'CREATOR');

CREATE TYPE "ContributorApplicationStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'WITHDRAWN');

CREATE TYPE "ContributorAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

CREATE TYPE "MentorStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'SUSPENDED');

CREATE TYPE "BookingMode" AS ENUM ('INSTANT', 'REQUEST');

CREATE TYPE "CredentialKind" AS ENUM ('DEGREE', 'CERTIFICATION', 'LICENCE', 'EMPLOYMENT', 'AWARD', 'OTHER');

CREATE TYPE "CredentialStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

CREATE TYPE "AvailabilityExceptionKind" AS ENUM ('BLOCKED', 'EXTRA');

CREATE TYPE "RevenueScope" AS ENUM ('MENTORING', 'EVENT', 'COURSE');

CREATE TYPE "CourseDelivery" AS ENUM ('SELF_PACED', 'MENTOR_LED');

CREATE TYPE "CohortStatus" AS ENUM ('DRAFT', 'OPEN', 'RUNNING', 'COMPLETED', 'CANCELLED');

CREATE TYPE "ContentSubmissionType" AS ENUM ('COURSE', 'COURSE_UPDATE', 'RESOURCE');

CREATE TYPE "ContentSubmissionStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'WITHDRAWN');

CREATE TYPE "ResourceAudience" AS ENUM ('PUBLIC', 'MEMBERS', 'REGISTERED', 'ATTENDED');

CREATE TYPE "OrderSource" AS ENUM ('CART', 'BOOKING');

CREATE TYPE "EventMode" AS ENUM ('ONE_TO_ONE', 'GROUP');

CREATE TYPE "LiveEventFormat" AS ENUM ('ONLINE', 'IN_PERSON', 'HYBRID');

CREATE TYPE "LiveEventStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

CREATE TYPE "LiveEventVisibility" AS ENUM ('PUBLIC', 'MEMBERS', 'COURSE', 'GROUP', 'PRIVATE');

CREATE TYPE "LiveEventHostRole" AS ENUM ('HOST', 'CO_HOST', 'GUEST_SPEAKER');

CREATE TYPE "EventRegistrationStatus" AS ENUM ('REQUESTED', 'PENDING_PAYMENT', 'REGISTERED', 'WAITLISTED', 'DECLINED', 'CANCELLED', 'ATTENDED', 'NO_SHOW', 'REFUNDED');

CREATE TYPE "AttendanceSource" AS ENUM ('CODE', 'HOST', 'JOIN_LINK', 'MEMBER_CONFIRMED', 'INTEGRATION');

-- ---- AlterTable ----
ALTER TABLE "Course" ADD COLUMN     "deliveryMode" "CourseDelivery" NOT NULL DEFAULT 'SELF_PACED';

ALTER TABLE "Resource" ADD COLUMN     "audience" "ResourceAudience",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "instructorId" TEXT,
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN     "submittedById" TEXT;

ALTER TABLE "Enrollment" ADD COLUMN     "cohortId" TEXT,
ADD COLUMN     "progressSharedAt" TIMESTAMP(3);

ALTER TABLE "Order" ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'CART';

ALTER TABLE "OrderItem" ADD COLUMN     "registrationId" TEXT;

ALTER TABLE "Channel" ADD COLUMN     "cohortId" TEXT;

ALTER TABLE "Instructor" ADD COLUMN     "contributorKinds" "ContributorKind"[] DEFAULT ARRAY[]::"ContributorKind"[],
ADD COLUMN     "experienceMd" TEXT,
ADD COLUMN     "expertise" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "identityNote" TEXT,
ADD COLUMN     "identityVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "identityVerifiedById" TEXT,
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isFounder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "links" JSONB,
ADD COLUMN     "photoSha256" TEXT,
ADD COLUMN     "photoVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "photoVerifiedById" TEXT,
ADD COLUMN     "searchVector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("name", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("headline", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("bio", '')), 'C')
  ) STORED,
ADD COLUMN     "status" "ExpertStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "statusReason" TEXT,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "trustedAuthor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "yearsExperience" INTEGER;

ALTER TABLE "PayoutRequest" ADD COLUMN     "contributorId" TEXT,
ALTER COLUMN "affiliateId" DROP NOT NULL;

ALTER TABLE "CommunityGroup" ADD COLUMN     "hostInstructorId" TEXT;

-- ---- CreateTable ----
CREATE TABLE "MentorProfile" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "status" "MentorStatus" NOT NULL DEFAULT 'DRAFT',
    "statusReason" TEXT,
    "acceptingBookings" BOOLEAN NOT NULL DEFAULT false,
    "bookingMode" "BookingMode" NOT NULL DEFAULT 'INSTANT',
    "minNoticeHours" INTEGER NOT NULL DEFAULT 24,
    "horizonDays" INTEGER NOT NULL DEFAULT 30,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 15,
    "maxSessionsPerDay" INTEGER,
    "cancellationHours" INTEGER,
    "priorHistoryMd" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MentorCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "academyId" TEXT,
    "disclaimer" TEXT,
    "paidAllowed" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MentorCategoryLink" (
    "mentorId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MentorCategoryLink_pkey" PRIMARY KEY ("mentorId","categoryId")
);

CREATE TABLE "ExpertCredential" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "kind" "CredentialKind" NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "year" INTEGER,
    "publicUrl" TEXT,
    "evidenceNote" TEXT,
    "status" "CredentialStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "applicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpertCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContributorApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ContributorKind" NOT NULL,
    "status" "ContributorApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "answers" JSONB NOT NULL,
    "categorySlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "termsVersion" TEXT NOT NULL,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "statusReason" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContributorApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContributorAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instructorId" TEXT,
    "status" "ContributorAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "statusReason" TEXT,
    "payoutMethod" JSONB,
    "payoutMethodUpdatedAt" TIMESTAMP(3),
    "termsVersion" TEXT NOT NULL,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContributorAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RevenueShareAgreement" (
    "id" TEXT NOT NULL,
    "contributorId" TEXT,
    "scope" "RevenueScope" NOT NULL,
    "contributorShareBps" INTEGER NOT NULL,
    "holdDays" INTEGER,
    "minPayoutCents" INTEGER,
    "refundWindowHours" INTEGER,
    "version" INTEGER NOT NULL,
    "termsMd" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "createdById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "acceptedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueShareAgreement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContributorEarning" (
    "id" TEXT NOT NULL,
    "contributorId" TEXT NOT NULL,
    "scope" "RevenueScope" NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "registrationId" TEXT,
    "baseCents" INTEGER NOT NULL,
    "shareBps" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "agreementId" TEXT NOT NULL,
    "holdUntil" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContributorEarning_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MentorOffering" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "eventKindId" TEXT NOT NULL,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "descriptionMd" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "priceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "productId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorOffering_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MentorAvailabilityRule" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "offeringId" TEXT,
    "validFrom" DATE,
    "validUntil" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorAvailabilityRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MentorAvailabilityException" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "kind" "AvailabilityExceptionKind" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorAvailabilityException_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseCohort" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "mentorInstructorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE,
    "capacity" INTEGER,
    "status" "CohortStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseCohort_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentSubmission" (
    "id" TEXT NOT NULL,
    "type" "ContentSubmissionType" NOT NULL,
    "status" "ContentSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submitterId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "courseId" TEXT,
    "lessonId" TEXT,
    "resourceId" TEXT,
    "targetKey" TEXT NOT NULL,
    "payload" JSONB,
    "checklist" JSONB NOT NULL,
    "autoChecks" JSONB,
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalendarFeedToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarFeedToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventKind" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mode" "EventMode" NOT NULL DEFAULT 'GROUP',
    "academyId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventKind_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveEvent" (
    "id" TEXT NOT NULL,
    "slug" TEXT,
    "kindId" TEXT NOT NULL,
    "mode" "EventMode" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "descriptionMd" TEXT NOT NULL,
    "format" "LiveEventFormat" NOT NULL DEFAULT 'ONLINE',
    "status" "LiveEventStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "LiveEventVisibility" NOT NULL DEFAULT 'MEMBERS',
    "academyId" TEXT,
    "offeringId" TEXT,
    "mentorId" TEXT,
    "courseId" TEXT,
    "cohortId" TEXT,
    "groupId" TEXT,
    "challengeId" TEXT,
    "seriesId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "registrationOpensAt" TIMESTAMP(3),
    "registrationClosesAt" TIMESTAMP(3),
    "capacity" INTEGER,
    "registeredCount" INTEGER NOT NULL DEFAULT 0,
    "waitlistEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "productId" TEXT,
    "meetingProvider" TEXT,
    "meetingUrl" TEXT,
    "meetingNote" TEXT,
    "linkRevealMinutes" INTEGER NOT NULL DEFAULT 30,
    "venueName" TEXT,
    "venueAddress" TEXT,
    "city" TEXT,
    "country" TEXT,
    "attendanceCode" TEXT,
    "attendanceCodeRotatedAt" TIMESTAMP(3),
    "coverImage" TEXT,
    "statusReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "rescheduledAt" TIMESTAMP(3),
    "icsSequence" INTEGER NOT NULL DEFAULT 0,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveEventHost" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "role" "LiveEventHostRole" NOT NULL DEFAULT 'HOST',
    "userId" TEXT,
    "instructorId" TEXT,
    "displayName" TEXT NOT NULL,
    "headline" TEXT,
    "avatarUrl" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LiveEventHost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EventRegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "holdExpiresAt" TIMESTAMP(3),
    "agendaMd" TEXT,
    "disclaimerAckAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "waitlistedAt" TIMESTAMP(3),
    "promotedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancelReason" TEXT,
    "joinedAt" TIMESTAMP(3),
    "attendedAt" TIMESTAMP(3),
    "attendanceSource" "AttendanceSource",
    "markedById" TEXT,
    "memberConfirmedAt" TIMESTAMP(3),
    "attendanceDisputedAt" TIMESTAMP(3),
    "attendanceDisputedById" TEXT,
    "attendanceDisputeNote" TEXT,
    "attendanceDisputeResolvedAt" TIMESTAMP(3),
    "attendanceDisputeResolvedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventFeedback" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instructorId" TEXT,
    "rating" INTEGER NOT NULL,
    "body" TEXT,
    "privateNote" TEXT,
    "publicConsent" BOOLEAN NOT NULL DEFAULT false,
    "hostReply" TEXT,
    "hostRepliedAt" TIMESTAMP(3),
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "hiddenById" TEXT,
    "hiddenReason" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveEventSeries" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "academyId" TEXT,
    "kindId" TEXT NOT NULL,
    "cadenceNote" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveEventSeries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventInterest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "academyId" TEXT,
    "kindId" TEXT,
    "seriesId" TEXT,
    "mentorId" TEXT,
    "scopeKey" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventInterest_pkey" PRIMARY KEY ("id")
);

-- ---- CreateIndex ----
CREATE UNIQUE INDEX "MentorProfile_instructorId_key" ON "MentorProfile"("instructorId");

CREATE INDEX "MentorProfile_status_acceptingBookings_idx" ON "MentorProfile"("status", "acceptingBookings");

CREATE UNIQUE INDEX "MentorCategory_slug_key" ON "MentorCategory"("slug");

CREATE INDEX "MentorCategoryLink_categoryId_idx" ON "MentorCategoryLink"("categoryId");

CREATE INDEX "ExpertCredential_instructorId_status_idx" ON "ExpertCredential"("instructorId", "status");

CREATE INDEX "ContributorApplication_status_kind_submittedAt_idx" ON "ContributorApplication"("status", "kind", "submittedAt");

CREATE INDEX "ContributorApplication_userId_idx" ON "ContributorApplication"("userId");

CREATE UNIQUE INDEX "ContributorAccount_userId_key" ON "ContributorAccount"("userId");

CREATE UNIQUE INDEX "ContributorAccount_instructorId_key" ON "ContributorAccount"("instructorId");

CREATE INDEX "RevenueShareAgreement_contributorId_scope_effectiveFrom_idx" ON "RevenueShareAgreement"("contributorId", "scope", "effectiveFrom");

CREATE UNIQUE INDEX "RevenueShareAgreement_contributorId_scope_version_key" ON "RevenueShareAgreement"("contributorId", "scope", "version");

CREATE UNIQUE INDEX "ContributorEarning_orderItemId_key" ON "ContributorEarning"("orderItemId");

CREATE INDEX "ContributorEarning_contributorId_status_idx" ON "ContributorEarning"("contributorId", "status");

CREATE INDEX "ContributorEarning_payoutId_idx" ON "ContributorEarning"("payoutId");

CREATE UNIQUE INDEX "MentorOffering_productId_key" ON "MentorOffering"("productId");

CREATE INDEX "MentorOffering_mentorId_active_idx" ON "MentorOffering"("mentorId", "active");

CREATE INDEX "MentorAvailabilityRule_mentorId_idx" ON "MentorAvailabilityRule"("mentorId");

CREATE INDEX "MentorAvailabilityException_mentorId_startsAt_idx" ON "MentorAvailabilityException"("mentorId", "startsAt");

CREATE INDEX "CourseCohort_courseId_status_idx" ON "CourseCohort"("courseId", "status");

CREATE INDEX "ContentSubmission_status_type_submittedAt_idx" ON "ContentSubmission"("status", "type", "submittedAt");

CREATE INDEX "ContentSubmission_instructorId_status_idx" ON "ContentSubmission"("instructorId", "status");

CREATE UNIQUE INDEX "CalendarFeedToken_tokenHash_key" ON "CalendarFeedToken"("tokenHash");

CREATE INDEX "CalendarFeedToken_userId_idx" ON "CalendarFeedToken"("userId");

CREATE UNIQUE INDEX "EventKind_slug_key" ON "EventKind"("slug");

CREATE UNIQUE INDEX "LiveEvent_slug_key" ON "LiveEvent"("slug");

CREATE INDEX "LiveEvent_status_startsAt_idx" ON "LiveEvent"("status", "startsAt");

CREATE INDEX "LiveEvent_academyId_startsAt_idx" ON "LiveEvent"("academyId", "startsAt");

CREATE INDEX "LiveEvent_kindId_startsAt_idx" ON "LiveEvent"("kindId", "startsAt");

CREATE INDEX "LiveEvent_mentorId_startsAt_idx" ON "LiveEvent"("mentorId", "startsAt");

CREATE INDEX "LiveEvent_groupId_startsAt_idx" ON "LiveEvent"("groupId", "startsAt");

CREATE INDEX "LiveEvent_productId_idx" ON "LiveEvent"("productId");

CREATE INDEX "LiveEventHost_userId_idx" ON "LiveEventHost"("userId");

CREATE INDEX "LiveEventHost_instructorId_idx" ON "LiveEventHost"("instructorId");

CREATE UNIQUE INDEX "LiveEventHost_eventId_userId_key" ON "LiveEventHost"("eventId", "userId");

CREATE UNIQUE INDEX "LiveEventHost_eventId_instructorId_key" ON "LiveEventHost"("eventId", "instructorId");

CREATE INDEX "EventRegistration_eventId_status_waitlistedAt_idx" ON "EventRegistration"("eventId", "status", "waitlistedAt");

CREATE INDEX "EventRegistration_userId_status_idx" ON "EventRegistration"("userId", "status");

CREATE INDEX "EventRegistration_attendanceDisputedAt_idx" ON "EventRegistration"("attendanceDisputedAt");

CREATE UNIQUE INDEX "EventRegistration_eventId_userId_key" ON "EventRegistration"("eventId", "userId");

CREATE UNIQUE INDEX "EventFeedback_registrationId_key" ON "EventFeedback"("registrationId");

CREATE INDEX "EventFeedback_eventId_hidden_idx" ON "EventFeedback"("eventId", "hidden");

CREATE INDEX "EventFeedback_instructorId_hidden_idx" ON "EventFeedback"("instructorId", "hidden");

CREATE UNIQUE INDEX "LiveEventSeries_slug_key" ON "LiveEventSeries"("slug");

CREATE INDEX "EventInterest_academyId_idx" ON "EventInterest"("academyId");

CREATE INDEX "EventInterest_mentorId_idx" ON "EventInterest"("mentorId");

CREATE UNIQUE INDEX "EventInterest_userId_scopeKey_key" ON "EventInterest"("userId", "scopeKey");

CREATE INDEX "Resource_eventId_idx" ON "Resource"("eventId");

CREATE INDEX "Resource_instructorId_status_idx" ON "Resource"("instructorId", "status");

CREATE INDEX "Enrollment_cohortId_idx" ON "Enrollment"("cohortId");

CREATE INDEX "Order_source_status_idx" ON "Order"("source", "status");

CREATE INDEX "OrderItem_registrationId_idx" ON "OrderItem"("registrationId");

CREATE UNIQUE INDEX "Channel_cohortId_key" ON "Channel"("cohortId");

CREATE INDEX "Instructor_status_isDemo_idx" ON "Instructor"("status", "isDemo");

CREATE INDEX "Instructor_searchVector_idx" ON "Instructor" USING GIN ("searchVector");

CREATE INDEX "PayoutRequest_contributorId_status_idx" ON "PayoutRequest"("contributorId", "status");

-- ---- AddForeignKey ----
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "LiveEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Resource" ADD CONSTRAINT "Resource_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Resource" ADD CONSTRAINT "Resource_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "CourseCohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Channel" ADD CONSTRAINT "Channel_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "CourseCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Instructor" ADD CONSTRAINT "Instructor_identityVerifiedById_fkey" FOREIGN KEY ("identityVerifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Instructor" ADD CONSTRAINT "Instructor_photoVerifiedById_fkey" FOREIGN KEY ("photoVerifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "ContributorAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityGroup" ADD CONSTRAINT "CommunityGroup_hostInstructorId_fkey" FOREIGN KEY ("hostInstructorId") REFERENCES "Instructor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MentorProfile" ADD CONSTRAINT "MentorProfile_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MentorProfile" ADD CONSTRAINT "MentorProfile_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MentorCategory" ADD CONSTRAINT "MentorCategory_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MentorCategoryLink" ADD CONSTRAINT "MentorCategoryLink_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "MentorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MentorCategoryLink" ADD CONSTRAINT "MentorCategoryLink_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MentorCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExpertCredential" ADD CONSTRAINT "ExpertCredential_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExpertCredential" ADD CONSTRAINT "ExpertCredential_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExpertCredential" ADD CONSTRAINT "ExpertCredential_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ContributorApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContributorApplication" ADD CONSTRAINT "ContributorApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContributorApplication" ADD CONSTRAINT "ContributorApplication_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContributorAccount" ADD CONSTRAINT "ContributorAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ContributorAccount" ADD CONSTRAINT "ContributorAccount_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RevenueShareAgreement" ADD CONSTRAINT "RevenueShareAgreement_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "ContributorAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RevenueShareAgreement" ADD CONSTRAINT "RevenueShareAgreement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RevenueShareAgreement" ADD CONSTRAINT "RevenueShareAgreement_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContributorEarning" ADD CONSTRAINT "ContributorEarning_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "ContributorAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContributorEarning" ADD CONSTRAINT "ContributorEarning_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContributorEarning" ADD CONSTRAINT "ContributorEarning_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContributorEarning" ADD CONSTRAINT "ContributorEarning_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContributorEarning" ADD CONSTRAINT "ContributorEarning_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "RevenueShareAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ContributorEarning" ADD CONSTRAINT "ContributorEarning_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "PayoutRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MentorOffering" ADD CONSTRAINT "MentorOffering_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "MentorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MentorOffering" ADD CONSTRAINT "MentorOffering_eventKindId_fkey" FOREIGN KEY ("eventKindId") REFERENCES "EventKind"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MentorOffering" ADD CONSTRAINT "MentorOffering_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MentorCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MentorOffering" ADD CONSTRAINT "MentorOffering_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MentorAvailabilityRule" ADD CONSTRAINT "MentorAvailabilityRule_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "MentorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MentorAvailabilityRule" ADD CONSTRAINT "MentorAvailabilityRule_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "MentorOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MentorAvailabilityException" ADD CONSTRAINT "MentorAvailabilityException_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "MentorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseCohort" ADD CONSTRAINT "CourseCohort_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseCohort" ADD CONSTRAINT "CourseCohort_mentorInstructorId_fkey" FOREIGN KEY ("mentorInstructorId") REFERENCES "Instructor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ContentSubmission" ADD CONSTRAINT "ContentSubmission_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentSubmission" ADD CONSTRAINT "ContentSubmission_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentSubmission" ADD CONSTRAINT "ContentSubmission_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentSubmission" ADD CONSTRAINT "ContentSubmission_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentSubmission" ADD CONSTRAINT "ContentSubmission_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentSubmission" ADD CONSTRAINT "ContentSubmission_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CalendarFeedToken" ADD CONSTRAINT "CalendarFeedToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventKind" ADD CONSTRAINT "EventKind_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_kindId_fkey" FOREIGN KEY ("kindId") REFERENCES "EventKind"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "MentorOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "MentorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "CourseCohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CommunityGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "LiveEventSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiveEventHost" ADD CONSTRAINT "LiveEventHost_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "LiveEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LiveEventHost" ADD CONSTRAINT "LiveEventHost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiveEventHost" ADD CONSTRAINT "LiveEventHost_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiveEventHost" ADD CONSTRAINT "LiveEventHost_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "LiveEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_attendanceDisputedById_fkey" FOREIGN KEY ("attendanceDisputedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_attendanceDisputeResolvedById_fkey" FOREIGN KEY ("attendanceDisputeResolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "LiveEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_hiddenById_fkey" FOREIGN KEY ("hiddenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiveEventSeries" ADD CONSTRAINT "LiveEventSeries_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiveEventSeries" ADD CONSTRAINT "LiveEventSeries_kindId_fkey" FOREIGN KEY ("kindId") REFERENCES "EventKind"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LiveEventSeries" ADD CONSTRAINT "LiveEventSeries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventInterest" ADD CONSTRAINT "EventInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventInterest" ADD CONSTRAINT "EventInterest_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventInterest" ADD CONSTRAINT "EventInterest_kindId_fkey" FOREIGN KEY ("kindId") REFERENCES "EventKind"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventInterest" ADD CONSTRAINT "EventInterest_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "LiveEventSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventInterest" ADD CONSTRAINT "EventInterest_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "MentorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---- Existing instructors ----
UPDATE "Instructor" SET "contributorKinds" = ARRAY['INSTRUCTOR']::"ContributorKind"[] WHERE cardinality("contributorKinds") = 0;
UPDATE "Instructor" SET "isFounder" = true WHERE "slug" = 'harsha';
ALTER TABLE "Instructor" ADD CONSTRAINT "Instructor_years_range" CHECK ("yearsExperience" IS NULL OR "yearsExperience" BETWEEN 0 AND 80);

-- ---- The one-to-one kind (exactly one; mentor bookings use it) ----
INSERT INTO "EventKind" ("id", "slug", "name", "mode", "sortOrder", "active", "createdAt", "updatedAt")
VALUES ('evk_one_to_one', 'one-to-one', 'One-to-one session', 'ONE_TO_ONE', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
CREATE UNIQUE INDEX "EventKind_one_to_one_key" ON "EventKind" ("mode") WHERE "mode" = 'ONE_TO_ONE';

-- ---- Mentors ----
ALTER TABLE "MentorProfile" ADD CONSTRAINT "MentorProfile_booking_rules_range" CHECK (
  "minNoticeHours" BETWEEN 0 AND 720 AND "horizonDays" BETWEEN 1 AND 120 AND "bufferMinutes" BETWEEN 0 AND 120
  AND ("maxSessionsPerDay" IS NULL OR "maxSessionsPerDay" >= 1)
  AND ("cancellationHours" IS NULL OR "cancellationHours" BETWEEN 0 AND 168));
ALTER TABLE "MentorOffering" ADD CONSTRAINT "MentorOffering_shape" CHECK (
  "durationMin" BETWEEN 15 AND 240 AND "capacity" >= 1 AND ("priceCents" IS NULL OR "priceCents" >= 100));
ALTER TABLE "MentorAvailabilityRule" ADD CONSTRAINT "MentorAvailabilityRule_window" CHECK (
  "weekday" BETWEEN 0 AND 6 AND "startMinute" >= 0 AND "startMinute" < "endMinute" AND "endMinute" <= 1440
  AND ("validFrom" IS NULL OR "validUntil" IS NULL OR "validUntil" >= "validFrom"));
ALTER TABLE "MentorAvailabilityException" ADD CONSTRAINT "MentorAvailabilityException_order" CHECK ("endsAt" > "startsAt");
CREATE UNIQUE INDEX "MentorCategoryLink_primary_key" ON "MentorCategoryLink" ("mentorId") WHERE "isPrimary";

-- ---- Contributors and money ----
CREATE UNIQUE INDEX "ContributorApplication_open_key" ON "ContributorApplication" ("userId", "kind")
  WHERE "status" IN ('SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO');
ALTER TABLE "RevenueShareAgreement" ADD CONSTRAINT "RevenueShareAgreement_terms_range" CHECK (
  "contributorShareBps" BETWEEN 0 AND 10000 AND "version" >= 1
  AND ("effectiveUntil" IS NULL OR "effectiveUntil" > "effectiveFrom")
  AND ("holdDays" IS NULL OR "holdDays" BETWEEN 0 AND 365)
  AND ("minPayoutCents" IS NULL OR "minPayoutCents" >= 0)
  AND ("refundWindowHours" IS NULL OR "refundWindowHours" BETWEEN 0 AND 720));
-- @@unique([contributorId, scope, version]) does not cover the platform defaults (contributorId null).
CREATE UNIQUE INDEX "RevenueShareAgreement_default_key" ON "RevenueShareAgreement" ("scope", "version") WHERE "contributorId" IS NULL;
ALTER TABLE "ContributorEarning" ADD CONSTRAINT "ContributorEarning_amount_range" CHECK (
  "baseCents" >= 0 AND "shareBps" BETWEEN 0 AND 10000 AND "amountCents" >= 0 AND "amountCents" <= "baseCents");
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_one_payee" CHECK (num_nonnulls("affiliateId", "contributorId") = 1);
CREATE UNIQUE INDEX "PayoutRequest_open_contributor_key" ON "PayoutRequest" ("contributorId")
  WHERE "contributorId" IS NOT NULL AND "status" IN ('REQUESTED', 'APPROVED');
-- A LIVE_EVENT product is bought in rupees only.
ALTER TABLE "Product" ADD CONSTRAINT "Product_live_event_no_thc" CHECK ("kind" <> 'LIVE_EVENT' OR "priceThc" IS NULL);

-- ---- Cohorts, review queue, resources ----
ALTER TABLE "CourseCohort" ADD CONSTRAINT "CourseCohort_shape" CHECK (
  ("endsOn" IS NULL OR "endsOn" >= "startsOn") AND ("capacity" IS NULL OR "capacity" > 0));
CREATE UNIQUE INDEX "ContentSubmission_open_target_key" ON "ContentSubmission" ("type", "targetKey")
  WHERE "status" IN ('SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED');
-- Every existing write path sets exactly one of courseId and lessonId (both CASCADE).
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_one_owner" CHECK (num_nonnulls("courseId", "lessonId", "eventId", "instructorId") = 1);
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_audience_required" CHECK (("eventId" IS NULL AND "instructorId" IS NULL) OR "audience" IS NOT NULL);

-- ---- Live events ----
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_time_order" CHECK ("endsAt" > "startsAt");
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_capacity" CHECK (
  "registeredCount" >= 0 AND ("capacity" IS NULL OR ("capacity" > 0 AND "registeredCount" <= "capacity")));
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_price_min" CHECK ("priceCents" IS NULL OR "priceCents" >= 100);
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_listed_has_slug" CHECK ("visibility" = 'PRIVATE' OR "slug" IS NOT NULL);
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_one_to_one_shape" CHECK ("mode" <> 'ONE_TO_ONE' OR ("capacity" = 1 AND "visibility" = 'PRIVATE'));
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_link_reveal_range" CHECK ("linkRevealMinutes" BETWEEN 0 AND 1440);
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_ics_sequence_nonneg" CHECK ("icsSequence" >= 0);
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_attended_has_time" CHECK ("status" <> 'ATTENDED' OR "attendedAt" IS NOT NULL);
-- A dispute is resolved only after it is opened (workstreams D2).
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_dispute_order" CHECK ("attendanceDisputeResolvedAt" IS NULL OR "attendanceDisputedAt" IS NOT NULL);
ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
