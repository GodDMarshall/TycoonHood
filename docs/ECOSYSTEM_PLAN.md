# Living Ecosystem: build plan

This is the build plan for the Living Ecosystem directive, docs/LIVING_ECOSYSTEM_DIRECTIVE.md (§1 to §21). It was written on 12 November 2026 against `build/living-ecosystem` at `1ace306`, into which the lead first merges `build/full-platform`. Full-platform was at `5d6d243` when the plan was drafted and is at `d990d1d` now. The one commit between them changes only packages/core/test/deploy-lock.test.ts, so the schema, the migrations and apps/web/vercel.json that this plan builds on are the same.

Nothing in this plan has been built yet. The schema and the migrations were drafted outside the repository and rehearsed on a throwaway database. The application and the vitest suite have not yet run against the new schema (section 4, 0.4).

**Who reads what.**
- **The owner:** section 3.1 (what gets built, in what order, and what you will see), section 7 (the decisions only you can make, each with the default that ships), section 8 (what is blocked and what ships meanwhile) and section 9 (how long it takes).
- **The lead:** all of it.
- **An implementing or reviewing agent:** section 1 (the rules), section 2 (the names), its own brief in W2, sections 4 and 5 (the data model and the shared contracts), section 6 (tests) and its rows in Appendix A. The schema is Appendix B.

**Contents.**
1. Purpose and rules
2. One name per concept
3. Phases and workstreams: 3.1 for the owner, then the engineering detail (W0 to W3)
4. Data model summary
5. Foundation contracts
6. Tests, and the §21 definition of done mapped to journeys
7. Owner decisions, with the default that ships
8. Blocked items, and what ships meanwhile
9. Timeline
10. End-of-build report format
- Appendix A. Every map requirement and its owner
- Appendix B. The Prisma schema

---

## 1. Purpose and rules

### 1.1 Purpose

The directive turns Tycoonhood into a connected ecosystem: academies, mentors and bookings, live events, a daily activity engine, a live community with groups, an opportunity marketplace, progression and identity, a personal guide, an editorial engine, a notification centre, an admin control centre and engagement analytics. §21 lists the lines that define "done".

This plan does five things:
- It splits the work into a foundation phase (P0), 25 build units in five phases (P1 to P5) and a final integration unit (INT). Each unit has a brief that can be handed to an implementing agent as it stands (W2).
- It fixes one name for every concept (section 2) and one data model (sections 4 and 5, and Appendix B), so that units built in parallel fit together.
- It gives each of the 451 requirements in the seven requirement maps exactly one owner (Appendix A), and ties every §21 line to the journeys that prove it (section 6.3).
- It lists what only the owner can decide, each with a safe default (section 7), and what is blocked on something outside the code, with what ships meanwhile (section 8).
- It gives a timeline with its assumptions (section 9) and the format of the end-of-build report (section 10).

### 1.2 Rules every unit follows

These rules bind every unit, the lead's included. The reviewer of each unit checks them (W3.1).

1. **One name per concept.** Every model, field, enum, permission, function, file, route and notification topic uses the name in section 2 and in the data model. A name that is not there is a request to the lead, not a choice the unit makes.
2. **Nothing is invented.** No made-up mentors, events, reviews, counts, prices, scarcity, testimonials or "online now" figures.
   - Public numbers show only at or above their thresholds (`MIN_COUNT_FOR_AGGREGATE`, `MIN_REVIEWS_FOR_RATING`) and count members through `countableMemberWhere`.
   - Demo rows (`isDemo`, names ending in " (Demo)") exist only in local development and never show in production (D1).
   - An empty database shows honest empty states. Each unit's authenticity test proves it for its public loaders.
3. **The schema belongs to the lead.** No unit edits packages/db/prisma/schema.prisma, the migrations or the generated client. A missing field or enum value stops the unit and becomes a request. The lead adds it as a new migration file dated after every existing one (W3.6). An applied migration is never edited, because migrate-sql.ts refuses a file whose checksum changed.
4. **Each file has one owner at a time.**
   - A unit changes only the files its brief owns (W1.4), and scripts/ownership/check.mjs enforces it.
   - It reads other domains only through the Phase 0 visibility helpers and the exported read functions of merged units.
   - It writes other domains only through their owners' service functions.
   - A change to a lead-owned file is a request in docs/ecosystem/requests/&lt;unit&gt;.md.
5. **Every requirement has one owner and an honest classification.**
   - VERIFIED COMPLETE needs an automated test or journey that exercises the row and ran on the integrated head. A feature with a page needs a journey, not only a unit test.
   - IMPLEMENTED BUT UNVERIFIED means built, but the end-to-end check needs a credential, hardware or person that is not here.
   - PARTIAL names the gap, BLOCKED names the BLOCKED_ON_YOU item, and NOT IMPLEMENTED gives the reason.
6. **Privacy by default.**
   - Every member-facing read applies the privacy facets (`PRIVACY_FACETS`, `canView`; data-model e.11).
   - No table stores a raw IP address or a full user agent; IP keys are HMACs (`ipKey`, e.10).
   - Contact details are never shown to other members. A partner sees only the contact fields an applicant ticks (`sharedFields`).
   - Interests, goals and location are opt-in.
7. **No money figure is invented.**
   - Revenue share, payout minimum, hold days and refund window come only from a `RevenueShareAgreement` that staff set.
   - Until every term is set, paid offerings and paid events cannot be published (O4 to O7).
   - One-to-one guidance in financial literacy is free until the owner decides (O39).
8. **Authorisation on every action.**
   - Every server action and route checks a permission or a grant (`requirePermission`, `requireGrant`).
   - It also checks the actor's ownership or scope: `assertHostsEvent`, `assertOwnsMentorProfile`, `assertPartnerMember`, `assertCanVerify` or `authoring.assertCanEditCourse`.
   - Approving a contributor never changes `User.role` (D3).
9. **Member time.**
   - Day, week and month boundaries use the member's zone through packages/core/src/time/zoned.ts (`memberDayKey`, `effectiveZoneAt`, `nextZoneCutover`).
   - A missing or invalid zone falls back to Asia/Kolkata.
   - A zone change takes effect at the next local midnight, so no day is skipped or counted twice.
10. **Tests first.**
    - A unit writes its vitest files and its journey before it implements.
    - While it works, it runs only its own tests.
    - It runs the full suite once, before review, inside the heavy-command semaphore (W1.3).
11. **Production stays safe.**
    - Preview builds never migrate.
    - Eco branches never build previews (`git.deploymentEnabled`).
    - The demo seed refuses any database that is not a local development or test database (D1).
    - The taxonomy seed is create-only and runs on every production deploy, under the deploy lock (D5).
12. **Plain, honest copy.**
    - No marketing claims, and no promise of income or outcomes.
    - No "campus" outside /world.
    - A clear label on anything automated (the Guide) and on any text not yet reviewed by a lawyer ("pending legal review").

### 1.3 How references work in this document

**Kinds of reference.**
- **§N** is a section of the directive. **Section N** and **N.M** are sections of this document.
- **W0 to W3** are the engineering detail inside section 3. For example, W1.4 is ownership and W3.2 is merge order and gates.
- **Ids:**
  - D1 to D6 are the defects of LEAD_DECISIONS (section 1.4).
  - N1 to N7 are naming rules (section 2.1).
  - O1 to O39 are owner decisions (section 7).
  - B1 to B20 are blocked items (section 8).
  - A1 to A8 are adversarial review passes (W3.4).
  - J1 to J31 are the e2e journeys (section 6).

**Data-model labels.** Labels such as 0.5, a.1, b.2, c.1, e.5, f.3 or g.18 are sections of the data model. The full data model is docs/ecosystem/data-model.md, which P0a commits from the planning file plan/data-model.md.
- The sections this plan needs are reproduced here under their own labels, so that the data model's own references still resolve:
  - 0.2 to 0.7, a.1, a.2, b.2, c.1 and c.5 in section 4;
  - e in section 5;
  - f in section 2.2;
  - g in section 7.2.
- The rest is only in docs/ecosystem/data-model.md, and the schema itself is Appendix B. That covers the Prisma code of a.3, the changes per model of b.3, each migration's SQL in c.3, the checks of c.4 and the seed rows of d.

**Other sources.**
- **LEAD #n** is decision n of LEAD_DECISIONS.
- **WS** in section 2.2 means the draft of this plan's workstreams that the review corrected. Its current text is W0 to W3 and sections 7 to 10.
- **DR-nn and OQ-x** are entries in TYCOONHOOD_DECISIONS.md.
- **"BLOCKED_ON_YOU item n" and "existing item n"** are entries in TYCOONHOOD_BLOCKED_ON_YOU.md.

**Where the planning inputs live.** LEAD_DECISIONS.md, the review in plan/critique.md and the seven requirement maps live in the planning scratchpad, not in the repository. Everything binding in them is restated here:
- the defects of LEAD_DECISIONS in section 1.4;
- the review's changes in W1.8 and 0.7;
- every map requirement in Appendix A.

**Paths.**
- Paths are relative to the repository root.
- Route groups are written as they appear in the repo: apps/web/app/(public), apps/web/app/(app) and apps/web/app/(app)/admin.
- Core tests live in packages/core/test.

### 1.4 LEAD_DECISIONS: defects, and the smallest change for each

LEAD_DECISIONS is binding and its decisions stand. It has six concrete defects. Each is listed below with the smallest change that fixes it. P0f-S records them in TYCOONHOOD_DECISIONS.md.

- **D1. The demo seed guard checks only the environment** (ground rules: refuse when NODE_ENV or VERCEL_ENV is production).
  - **Failure:** a developer runs `vercel env pull`, or copies Preview settings, which share the production database (TYCOONHOOD_STATE §5). They then run the demo seed locally with NODE_ENV=development. Demo mentors land in the production database.
  - **Smallest change:** `assertDemoSeedAllowed(env, argv)` in packages/config/src/demo.ts, called by packages/db/src/seed-demo/index.ts, also refuses unless:
    - the database host is local (localhost, 127.0.0.1, ::1 or a socket),
    - the database name ends in `_dev`, `_test` or `_e2e`, and
    - `--confirm-demo` is passed.
  - **Defence in depth:** `demoVisible()` returns false whenever VERCEL_ENV=production. A stray demo row is then never shown in production.
- **D2. Review suppression.** `EventFeedback` is "only from a verified attended registration" (decision 4), and the host marks attendance.
  - **Failure:** a mentor marks a member NO_SHOW and so blocks a bad review. This decision is also the mentor review.
  - **Smallest change:** attendance is recorded with an `AttendanceSource`: CODE, HOST, JOIN_LINK, MEMBER_CONFIRMED or INTEGRATION. A member who confirms attendance within 7 days can leave feedback. `publicWhere.feedback` shows a review only when attendance was recorded by someone other than the reviewer, or the member's own confirmation is over 7 days old with no dispute.
  - **Disputes:** a host NO_SHOW on a 1:1 is shown to the member, who can dispute it (`attendanceDispute*` fields). Disputes go to the Reviews tab in /admin/mentors. Feedback is accepted while a dispute is open, but stays off public pages until staff decide.
- **D3. CREATOR name collision.** `ContributorApplication.kind = CREATOR` (decision 3) collides with the existing `Role.CREATOR`, which means "approved affiliate".
  - **Failure:** approval code that "promotes the creator" would give a content creator affiliate payouts.
  - **Smallest change:** approval never changes `User.role`; the grant comes from the approved row. The affiliate role keeps its enum value, but `ROLE_LABEL.CREATOR` becomes "Affiliate". A test asserts that approving any contributor application leaves `User.role` unchanged.
- **D4. The outbox assumes a frequent dispatcher.** The Vercel Hobby plan runs crons once a day, and apps/web/vercel.json has two daily crons (`expire-orders` and `email-holds`).
  - **Failure:** a 1-hour event reminder could arrive up to a day late.
  - **Smallest change:**
    - `dispatchDue()` also runs on read: loading the bell dispatches that member's due rows, and `dispatchSoon()` runs a full dispatch inside Next's `after()` at most once a minute per server instance. Claims use `FOR UPDATE SKIP LOCKED`.
    - A reminder carries `notAfter` (the event start), so a late dispatch skips it instead of sending it after the event.
    - Event and booking pages show "starts in N minutes" from the event row itself, and ICS files carry VALARM reminders.
    - Reminder settings say reminders "may arrive late" until a frequent schedule exists.
    - `/api/cron/dispatch`, with the existing CRON_SECRET check, is ready for Vercel Pro or an external scheduler (owner decision O11).
- **D5. Taxonomy seeds that run only once.** LEAD_DECISIONS says production seeds run once, on the first production deploy, under SEED_ON_DEPLOY.
  - **Failure:** a later release adds a mentor category, an event kind or a skill. Production never receives it, and code that expects the row fails.
  - **Smallest change:** packages/db/src/seed-taxonomy.ts is create-only and records what it made in `SeedRecord`, so a row staff renamed or deleted is never made again. `scripts/vercel-build.sh` runs `pnpm db:seed:taxonomy` on every production deploy, straight after the migrations and outside the SEED_ON_DEPLOY block, under the same deploy lock. The topic catalogue stays in code, and `NotificationTopic` rows only let staff relabel or silence a topic; code never depends on a row existing.
- **D6. Paid financial-literacy mentoring.** LEAD_DECISIONS lets any approved mentor sell paid offerings. Paid one-to-one guidance in the Wealth academy can read as investment advice, which may need SEBI registration.
  - **Smallest change:** `MentorCategory.paidAllowed`, seeded false for `financial-literacy`, and a category `disclaimer` that a member acknowledges before registering (`EventRegistration.disclaimerAckAt`). Financial-literacy offerings and events are free until the owner decides (O39).

The data model also departs from LEAD_DECISIONS in eight deliberate places. Each departure, with its reason, is in section 4 (0.5).

---

## 2. One name per concept

Units built in parallel fit together only if they use the same names. Every name in this plan is the data model's.
- Section 2.1 gives the names that matter most, with the names that must never be used, and the other naming rules.
- Section 2.2 is the data model's full list of collisions: every name that lost, where it came from, and why.

Both bind every unit. A reviewer rejects a unit that uses a losing name (W3.1).

### 2.1 The names that matter most

These names are binding. In each row, the middle column is the one name to use, and the last column lists names that must never be used for that concept. Section 2.2 has the full list, with where each losing name came from.

| Concept | The one name | Never |
|---|---|---|
| Academy (keyed on `Pillar`; slugs warrior, business, wealth, wellness) | `Academy`, `AcademyMembership`; `Course.academyId` is the source of truth | "campus" |
| Expert profile | `Instructor` (extended), with `MentorProfile` 1:1 | an Author model, a separate mentor model |
| Live event, booking, registration, review | `LiveEvent`, `LiveEventHost`, `EventRegistration`, `EventFeedback`; `MentoringService` in mentors/mentoring.ts; member pages under `/bookings` | `Session`, SessionService, `/sessions` |
| Outbox | `ScheduledNotification`; `schedule`, `reschedule`, `cancelForSubject`, `dispatchDue(opts, deps, db?)` | NotificationDelivery, enqueue, cancelByPrefix |
| Gateway | `notify({ userId, topic, groupKey, dedupeKey, ... })`; `effectiveChannels`, `preferencesFor`, `setPreference`; `notificationLink` | memberId, coalesceKey, notificationHref |
| Visibility | `publicWhere.mentor()`, `.liveEvent()`, `.opportunity()`, `.partner()`, `.post()`, `.feedback()`; `countableMemberWhere` | visibleMentorWhere, livePostWhere, publicFeedbackWhere |
| Permissions | `contributors.review`, `admin.economy`, `progression.verify` | mentors.review, admin.engagement, progression.manage |
| Domain events | MENTOR_APPROVED, MENTORING_BOOKED, MENTORING_COMPLETED, GOAL_ACHIEVED, PROJECT_PUBLISHED | MENTOR_VERIFIED, SESSION_BOOKED, SESSION_COMPLETED, GOAL_COMPLETED, PROJECT_SHARED |
| Topics | `mentoring.new_mentor`, `mentoring.request`, `contributor.application`, `opportunity.application` | mentor.new, application.status |
| Product kind for paid bookings and events | `ProductKind.LIVE_EVENT` | SESSION, EVENT |
| Post kind | `PostKind.BUSINESS_GUIDE` | PRACTICAL_GUIDE |
| Time | `memberZone`, `memberDayKey`, `effectiveZoneAt`, `nextZoneCutover` | zoneOrDefault |
| Evidence | `EvidenceSubmission` | ChallengeSubmission |
| Money pages | `/admin/revenue-terms`, `/admin/contributor-earnings` | /admin/revenue-share |
| Opportunity kind | `FREELANCE_PROJECT` | PROJECT |

**Other naming rules.**
- **N1.** Author pages are the expert profile: /mentors/[slug] or /instructors/[slug]. There is no Author model and no /authors route.
- **N2.** The daily map proposes a "production starter-mission seed". That conflicts with taxonomy-only seeds. DAILY-A ships an "Import starter library (drafts)" admin action instead. Nothing goes live until staff publish it.
- **N4.** Three different things are called "event". Their modules keep them apart: packages/core/src/events is the domain bus (`DOMAIN_EVENTS`), packages/core/src/live is `LiveEvent`, and packages/core/src/activity is `ActivityEvent`. The daily-plan engine is packages/core/src/plan.
- **N6.** The LLM mode of the guide (decision 12) needs three things before it turns on: the key, an admin toggle that can be set only after staff record the updated privacy-notice version, and each member's own opt-in. The Guide never poses as a human mentor.
- **N7.** Academy names are data the owner can rename. `Course.academyId` is the source of truth for a course's academy: the course editor has an academy picker (ACAD), and the authoring service sets `Course.pillar` from the academy, so the two never disagree.

N3 and N5 of the first draft are now part of the tables:
- N3 (the requirement maps' model names become the LEAD_DECISIONS names) is in f.1 below.
- N5 (`FREELANCE_PROJECT`, not `PROJECT`, so that a member's `Project` and a freelance listing never share a word) is the last row of the table above.

### 2.2 Every collision, and the name that won (data-model section f)

Each row gives the name this model uses, then the names it replaces and where each losing name came from, then the reason. The review (critique issue 3) found 22 places where the workstreams plan used a losing name; the plan now uses the names here, and these rows bind every stream. Sources:
- **LEAD**: `plan/LEAD_DECISIONS.md`. Where a row only applies a lead decision, it says so.
- **WS**: the draft of this plan's workstreams (`plan/workstreams.md`) that the review corrected. Its current text is W0 to W3 and sections 7 to 10.
- **Maps**: the seven area maps in the planning scratchpad (`maps/`: academies, community, content, daily, events-opps, mentors, platform).
- **Repo**: names that exist in the code today.

#### f.1 Models and tables

| This model | Losing names (source) | Why |
|---|---|---|
| `Academy`, `AcademyMembership` | "campus" (directive) | LEAD #1. "Campus" is the 3D world |
| `academyId` stored on `Course`, `Challenge`, `CommunityGroup`, `CommunityCategory`, `CommunityPost`, `XpEvent`, backfilled in 000100 | joining to an academy through `Course.pillar` (LEAD #1 interim rule; WS P0) | A stored column can be indexed and filtered, and lets a course move academy without changing its pillar |
| `Instructor` (extended) with `MentorProfile` | a separate Author model (content map); separate mentor and expert profiles | LEAD #2 |
| `ExpertCredential` | MentorCredential (mentors map) | Instructors have credentials too |
| `ContributorApplication` | RoleApplication (platform map) | LEAD #3 |
| `Partner`, `PartnerMember` | PartnerProfile (platform map) | LEAD #3 |
| `LiveEvent`, `LiveEventHost`, `EventRegistration`, `EventFeedback` | LiveSession, SessionRegistration, SessionReview (mentors map); MentorSession, MentorReview (platform map); Event (events-opps map) | LEAD #4. "Session" is the sign-in table |
| `MentorAvailabilityRule`, `MentorAvailabilityException` | MentorAvailability (platform map) | Weekly rules and dated exceptions are different rows |
| `EventKind` (a table) | LiveEventType (events-opps map); SessionKind, OfferingKind (mentors map) | Departure 2 in 0.5 |
| `ScheduledNotification` | NotificationDelivery (community map; WS P0), the events map's own outbox | LEAD #5: one outbox |
| `Announcement` | NotificationBroadcast (platform map) | LEAD #10 |
| `NotificationPreference`, one row per topic and channel | per-topic boolean columns and a category enum (community map) | LEAD #10 |
| `Project`, `ProjectSkill` | MemberProject (community map; WS); ShowcaseItem, ShowcaseKind (academies and mentors maps) | LEAD #6. The expert showcase reads public projects. A member's pinned items are `Profile.pinnedItems` |
| `Goal`, `GoalCheckIn` | MemberGoal (content map) | LEAD #7 |
| `ModuleSkill` | CourseSkill (events-opps map) | Departure 7 |
| `PostCategory` | EditorialCategory (platform map) | LEAD #11 |
| `Tag`, `PostTag` | `Post.tags String[]` (platform map) | LEAD #11; tags get pages and counts |
| `ContentSubmission` | `Course.reviewStatus` and CourseRevision (platform map) | One review queue for course submissions, course updates and resources |
| The founder's `Instructor` row, `isFounder = true` | the "founder setting" and a FOUNDER author (content map) | The founder's profile, photo and bio live where every expert's do. Copy for /about may still be a site setting |
| Grants derived from rows | `CapabilityGrant` table (WS P0) | Departure 5 |

#### f.2 Enums and enum values

| This model | Losing names (source) | Why |
|---|---|---|
| `MissionKind` | ActivityKind (daily map) | `ActivityKind` would collide with the feed's kinds |
| `ActivityEventKind` | ActivityKind (community map) | Matches the model name `ActivityEvent` |
| `ActivityEventKind.MENTOR_JOINED`, `EVENT_PUBLISHED`, `DISCUSSION_FEATURED` | MENTOR_ANNOUNCEMENT, WORKSHOP_ANNOUNCED, DISCUSSION_HIGHLIGHTED (community map) | Named after what happened; an event is not always a workshop |
| `EvidenceStatus`, `ContentSubmissionStatus` | SubmissionStatus (daily and mentors maps) | Two queues with different states |
| `ContentSubmissionType` | SubmissionType | Same reason |
| `ContributorApplicationStatus`, `OpportunityApplicationStatus` | ApplicationStatus (events-opps and mentors maps) | Same reason |
| `Post.kind` of type `PostKind` | `Post.type` of type PostType (content map) | LEAD #11 says "kinds" |
| `PostKind.BUSINESS_GUIDE` | PRACTICAL_GUIDE (WS) | The directive's wording |
| `CommunityPostKind` | PostKind (community map) | `PostKind` belongs to editorial posts |
| `ProjectVerificationStatus` plus `Project.publishedAt` | ProjectStatus (academies and community maps) | Publishing and verification are separate questions |
| `LiveEventStatus.SUBMITTED` | PENDING_REVIEW (mentors map) | One word for "waiting for review" across queues |
| `LiveEventStatus.SCHEDULED` | PUBLISHED (events-opps map) | A published event is scheduled until it completes or is cancelled |
| `LiveEventStatus`, `LiveEventVisibility`, `EventRegistrationStatus`, `LiveEventHostRole` | SessionStatus, SessionVisibility (mentors map); RegistrationStatus (events-opps and mentors maps); HostRole (events-opps map) | LEAD #4 |
| The event kind `fitness-session` | FITNESS_CHALLENGE (events-opps map) | The challenge is a `Challenge` row; the live session is an event |
| `ContributorKind` | ContributorType (mentors map) | LEAD #3 says "kind" |
| `PartnerStatus.VERIFIED` | APPROVED (platform map) | LEAD #3: PENDING to VERIFIED |
| `OpportunityKind`, the directive's ten | OpportunityCategory (events-opps map); LEAD #6's PROJECT, GIG, JOB, COLLABORATION, AFFILIATE | Departure 4. `FREELANCE_PROJECT` replaces PROJECT (WS N5) |
| `OpportunityStatus.SUBMITTED` | PENDING_REVIEW (platform map) | Same word as the other queues |
| `ProductKind.LIVE_EVENT` | SESSION and EVENT (WS P0 and P4-MONEY) | Departure 6 |
| `RevenueScope` (MENTORING, EVENT, COURSE) | SESSION, WORKSHOP and EarningSource (mentors map) | No "session"; a workshop is an event |
| `GoalMetric.MANUAL` | CUSTOM (content map) | Says how progress is recorded |
| `GoalStatus.ACHIEVED` | DONE (content map) | Matches `achievedAt` and the GOAL_ACHIEVED event |
| `PlanItemKind.EVENT` | MENTOR_SESSION (daily map) | A mentoring session is an event |
| `ConsentSource` (CONTACT_FORM, WRITTEN, IN_APP) | `source` with MEMBER_SUBMITTED, STAFF_ENTERED (platform map) | Records how consent was given, which is what a later dispute needs |
| `AttendanceSource`, one field with CODE, HOST, JOIN_LINK, MEMBER_CONFIRMED, INTEGRATION | separate attendance flags (WS D2) | One field says how attendance was recorded |

#### f.3 Fields and flags

| This model | Losing names (source) | Why |
|---|---|---|
| `featuredAt`, `featuredById` | highlightedAt, highlightedById (community map) | Same word on posts, projects and opportunities |
| `User.isDemo` | demoAt (community map) | LEAD ground rules say `isDemo=true` |
| `progress.checkins` (kept) | checkIns (daily map) | The key existing rows already use |
| A cap of 3 active goals | 5 (content map) | The dashboard shows three (daily map) |
| Demo names end in " (Demo)", e.g. "Mentor A (Demo)" | names that start with "Demo" (WS) | The label stays visible when a long name is cut |
| `Referral.signupIp` deprecated, then dropped later | dropped now | No deployed build may still write it (b.1) |

#### f.4 Domain events and activity kinds

| This model | Losing names (source) | Why |
|---|---|---|
| MENTOR_APPROVED | MENTOR_VERIFIED (WS) | Approval is the event; verification is of credentials |
| MENTORING_BOOKED, MENTORING_COMPLETED | SESSION_BOOKED (WS; mentors map); SESSION_COMPLETED (WS; daily and platform maps) | No "session" (LEAD #4) |
| GOAL_ACHIEVED | GOAL_COMPLETED (WS) | Matches `GoalStatus.ACHIEVED` |
| PROJECT_PUBLISHED | PROJECT_SHARED (community map) | Matches `Project.publishedAt` |

The other 15 new events, PROJECT_PUBLISHED among them, keep the workstreams plan's names (e.6).

#### f.5 Permissions, grants and guards

| This model | Losing names (source) | Why |
|---|---|---|
| `contributors.review` | mentors.review (WS) | It covers instructor and creator applications too |
| `courses.publish` for course and resource submissions; `events.manage` for submitted events | contributors.review for "course, resource and workshop submissions" (WS) | Each queue stays with the permission that publishes what it reviews (DR-34 for courses). In this model `contributors.review` decides contributor applications |
| `admin.economy` | admin.engagement and progression.manage (WS) | Missions, challenges, ranks and achievements already sit under `admin.economy` in the repo |
| `courses.author` and `content.write` | content.submit (WS) | Existing names cover it |
| `assertPartnerMember(actor, partnerId)` | partner.applications.read (WS) | A scope check, not a permission |
| Staff areas need ADMIN (or MODERATOR for moderation); a `StaffGrant` table is owner decision O37, default not built | grants for staff areas in `CapabilityGrant` (WS) | Departure 5 |
| `APPROVED_MENTOR_PERMISSIONS` (`progression.verify` for an approved mentor only) | `progression.verify` on every holder of the mentor grant (first draft of e.1) | A DRAFT mentor must not verify skills (critique issue 30) |
| `GroupAction` `createEvent` and `createChallenge` (OWNER, MODERATOR) | no group action for them (first draft of e.2) | WS P3-GROUPS lets group owners and moderators propose events and challenges |
| `authoring.canEditCourse`, `authoring.assertCanEditCourse`, `authoring.linkInstructorUser` (repo, DR-34) | linkInstructorToUser (WS); linkInstructorProfile (mentors map) | They exist and are tested |

#### f.6 Functions, files and keys

| This model | Losing names (source) | Why |
|---|---|---|
| `publicWhere.mentor()`, `.liveEvent()`, `.opportunity()`, `.partner()`, `.post()`, `.feedback()` | visibleMentorWhere, visibleEventWhere, visibleOpportunityWhere, visiblePartnerWhere, livePostWhere, publicFeedbackWhere (WS) | One object, one import |
| `memberZone` (repo) | zoneOrDefault (WS) | It exists |
| `userId` in `NotifyInput` | memberId (WS) | Every table calls it `userId` |
| `groupKey` | coalesceKey (WS) | The column is `Notification.groupKey` |
| `schedule({ dedupeKey, runAt, ... })` | enqueue({ key, dueAt, ... }) (WS) | Column names of `ScheduledNotification` |
| `dispatchDue(opts, deps, db?)` | dispatchDue(now, limit) (WS) | It needs the mailer and push ports |
| `effectiveChannels`, `preferencesFor`, `setPreference` | resolve, get, set (WS) | Says what they return |
| `notificationLink` (repo) | notificationHref (WS) | It exists |
| Topic catalogue in code plus `NotificationTopic` rows | a catalogue in code only (WS, D5) | Staff can relabel or silence a topic without a release |
| `ensureHousePartner(actor, input)`, created on first use | ensureHouse() in the taxonomy seed (WS; events-opps map) | The house partner needs a real contact email, which is not in the repository |
| `ipKey` (repo name kept; now keyed, with a fallback secret) | "no key, no hash" (WS P0) | Sessions keep a usable key for the self-dealing check in every environment |
| `assertDemoSeedAllowed` in `packages/config/src/demo.ts` | the same function in `seed-demo/index.ts` (WS) | Testable without a database, and shared with `demoVisible` |
| `MentoringService` in `packages/core/src/mentors/mentoring.ts`; member pages under `/bookings` | SessionService, `/sessions` (WS P2-BOOK) | LEAD #4: "session" is the sign-in table |
| `cancelForSubject(subject, { userId? })` | cancelByPrefix (first draft of e.5) | A LIKE on the key cannot use the (subjectType, subjectId) index |
| `/admin/revenue-terms`, `/admin/contributor-earnings` | /admin/revenue-share (WS O4 to O7) | The two pages hold different things: terms and earnings |
| `OpportunityApplication.sharedFields` (`ApplicantContactField[]`) | shareContact (first draft) | The member chooses each field the partner sees |

#### f.7 Notification topics

| This model | Losing names (source) | Why |
|---|---|---|
| `mentoring.new_mentor` | mentor.new (WS) | Groups with the other `mentoring.*` topics |
| `mentoring.request` | booking requests filed under `mentoring.booking` | A request and its answer are a separate notice from a confirmed booking |
| `opportunity.application`, `contributor.application` | application.status (WS) | Two different audiences and senders |

#### f.8 Seeds and deploy

| This model | Losing names (source) | Why |
|---|---|---|
| The taxonomy seed runs on every production deploy, outside SEED_ON_DEPLOY | "added to the SEED_ON_DEPLOY list" (WS P0f) | WS contradicts itself (D5 says outside the block). Departure 3 |

---

## 3. Phases and workstreams

### 3.1 For the owner

**What gets built, and in what order.** The work runs in seven stages. Every stage after the foundation is a set of units that agents build in parallel. A unit starts as soon as what it needs has merged, so the stages overlap.

| Stage | What you get | Units |
|---|---|---|
| P0 Foundation (about a day of continuous running) | Nothing new on screen yet. Under the hood, P0 puts in place: every new database table, at once; the access rules; member time zones; the notification system; the trust and privacy rules; the grouped admin menu; the test harness | the lead, with helper agents |
| P1 Mentors and academies | /academies and the four academy pages, which members can join. Mentor and instructor applications, with staff approval and credential checks. The /mentors directory and expert profiles. Live events with registration, waitlists, attendance and feedback | ACAD, MENTOR-A, MENTOR-B, LIVE-A |
| P2 Learning and daily activity | Outside instructors submit courses and resources for review. Learning paths and assignments. Mentor bookings, instant or on request. Daily and weekly missions; monthly challenges with evidence; goals. Articles and guides with drafts, review, scheduling, categories and tags. The founder's note, shown only once approved; help pages and site search | LEARN, BOOK, DAILY-A, DAILY-B, EDIT-A, EDIT-B |
| P3 Community | /today, the member's daily plan. The activity feed, follows, saved posts, questions with accepted answers, the member directory and one report flow. Community groups with roles, invitations, group events and challenges. The notification centre with per-topic settings, digests and unsubscribe links. The events list and calendar, calendar files and reminders | TODAY, SOCIAL, GROUPS, NOTIFY, LIVE-B |
| P4 Earning, progression and shopping | The opportunity marketplace, with verified partners and applications. Skills, projects and the member's public identity. Ranks, achievements and leaderboards. Paid bookings and paid events, with contributor earnings and manual payouts | OPPS-A, OPPS-B, SKILLS, RANKS, MONEY |
| P5 Personalisation and finish | The new homepage; the personal Tycoonhood Guide; engagement analytics and the admin overview; links between the pillars; motion, transitions and the trust pages | HOME, GUIDE, ANALYTICS, CONNECT, POLISH |
| Final integration | Every admin screen opened by the role that should reach it. The whole beginner journey run with the 3D world switched off. Eight adversarial reviews, every test and the end-of-build report | INT (the lead) |

**Where the order differs from the directive's priority list (§20), and why.**
- Live events start with mentors, because a mentor booking is a live event.
- The notification system is part of the foundation, because events, bookings, challenges and articles all send notices through it.
- Articles and the founder's pages rank with community, because the homepage needs them.
- Paid bookings and events come after free ones, because they extend them.
- The homepage, the Guide, analytics and the links between pillars start as soon as the parts they read have merged, not after everything else.

**What you will see along the way.** After each stage passes its full test gate, the lead merges it into `build/full-platform` on the machine. Pushing that branch builds a Vercel preview, but previews share the production database settings and never migrate it. A preview of the new code therefore fails until the first production deploy has run the new migrations (O34). So the lead pushes only at stage boundaries and says so in PR #2, and PR #2 stays in draft until you approve it.

**What only you can decide.** Section 7 lists 39 decisions. None of them stops the build. Each ships with a safe default that you can change later, mostly from an admin page and without code. The ones that matter most before launch:
- the revenue share, payout terms and refund window for paid bookings and events (O4 to O7). Until you set them, nothing paid can be published;
- whether one-to-one guidance in financial literacy may be paid (O39). It is free until you decide, after legal advice;
- the rank ladder (O3), the academy names (O1, O2) and the privacy defaults (O14);
- whether to turn on the Guide's language model (O10), push notifications (O12) and frequent reminders (O11).

**What is blocked on you or on someone else.** Section 8 lists 20 items. Among them: the Razorpay live keys, email sending, the domain, legal review of the new terms, real mentors, instructors and partners, photos, and a frequent scheduler for reminders. For each one, the plan says what ships meanwhile and how the affected requirements are reported.

**How long it takes.** About 145 hours of continuous running, which is six days. The work runs round the clock from 12 November 12:00 UTC, so the site is ready for the owner's check around Wednesday 18 November. The range is 105 to 185 hours, about 16 to 20 November (section 9).

**What "done" means.** Every line of §21 has journeys that prove it on the final code (section 6.3). The end-of-build report in TYCOONHOOD_STATE.md classifies every feature and all 451 requirements honestly (section 10).

### 3.2 Engineering detail

The rest of this section is the engineering plan:
- **W0** is the plan on one page.
- **W1** gives the phases, the scheduling rules, file ownership, the slot files, the permission catalogue and what the review changed.
- **W2** is the brief for each unit: what it covers, its requirements, what it owns, what it reads, its routes, its tests, its exit condition and its estimate.
- **W3** is how a unit is built, reviewed, merged, gated and landed.

### W0. The plan on one page

- **Phase 0, Foundation (lead plus helper agents).** The lead first merges `build/full-platform` into `build/living-ecosystem`, so the build starts from the launch branch: its three newer migrations, the `fix/seed-review` seeds and every review fix. Then Phase 0 builds what every stream shares:
  - the whole schema (Appendix B) and the migrations of the data model (section 4), and the fixes for the code they break (P0a)
  - file splits, so streams never edit the same file, and a frozen posts and reports API (P0s)
  - derived grants, the guards and the remaining ADMIN-only checks (P0b)
  - the zoned-time module (P0c)
  - the notification gateway, preferences and the `ScheduledNotification` outbox (P0d)
  - the authenticity helpers, privacy facets, the `ActivityEvent` write side and the shared trust components (P0e)
  - the test harness, the stream databases and the heavy-command semaphore (P0f-H)
  - the slot files, the grouped admin navigation, the taxonomy seed and the dev-only demo seed runner (P0f-S)
- **Five build phases** follow the §20 priority order, adjusted for real dependencies:
  - **P1, mentors and academies:** ACAD, MENTOR-A, MENTOR-B, LIVE-A. Live events move up because a mentor booking is a `LiveEvent`.
  - **P2, meaningful learning and daily activity:** LEARN, BOOK, DAILY-A, DAILY-B, EDIT-A, EDIT-B.
  - **P3, community:** TODAY, SOCIAL, GROUPS, NOTIFY, LIVE-B.
  - **P4, earning, progression and shopping:** OPPS-A, OPPS-B, SKILLS, RANKS, MONEY.
  - **P5, personalization and finish:** HOME, GUIDE, ANALYTICS, CONNECT and POLISH. All but POLISH start as soon as the streams they read have merged.
- **Final integration (INT).** The lead integrates and verifies: the admin-control-centre journey, the FINAL MISSION journey without /world, eight adversarial review passes, the full gates and the end-of-build report.
- **Workstreams.** 20 domain streams. Five of them are split into an A and a B half (MENTOR, LIVE, DAILY, EDIT, OPPS), so there are 25 build units, plus the lead's Phase 0 and INT. Phases are priority tiers, not barriers: a unit starts as soon as its dependencies have merged and a slot is free.
- **Requirement coverage.** Every one of the 451 map requirements has exactly one owner (Appendix A, checked by a script).
  - 3 requirements are BLOCKED because no exact red or runtime WebGL lattice exists in the repo (DR-1, DR-24).
  - 7 belong to INT: four cross-section touchpoints whose screens other streams build, plus "no 3D world required", "journeys tested" and the report format.
- **Machine.** 4 CPUs and 15 GB of RAM, one PostgreSQL 16.15 server. Three queue-runner workflows with two lanes each (at most 6 agents), at most 4 units implementing at once, and the heavy commands (typecheck, the full vitest suite, `next dev`, `build:web`) behind a 2-permit semaphore.
- **Timeline:** 105 to 185 wall-clock hours. Plan on about 145 hours, six days of continuous running from 12 November 12:00 UTC: ready for the owner's check around Wednesday 18 November. Section 9 gives the assumptions and the schedule.

### W1. Phases, order and ownership rules

#### W1.1 Phases

| Phase | §20 priority served | Units, with what each starts after | Merge order in the tier |
|---|---|---|---|
| P0 Foundation | prerequisite for all | the full-platform merge; then P0a, P0s and P0f-H at once; P0b, P0c, P0d, P0e and P0f-S after P0a's generated client (section W2, P0) | P0s, P0a, P0c, P0b, P0d, P0e, P0f-H, P0f-S |
| P1 Mentors and academies | 1 (and 5, moved up) | ACAD, MENTOR-A, MENTOR-B, LIVE-A: after P0 | MENTOR-A, MENTOR-B, ACAD, LIVE-A |
| P2 Learning and daily activity | 2, 3 (and the booking half of 1) | LEARN (after MENTOR-A, MENTOR-B, ACAD); BOOK (after MENTOR-A, MENTOR-B, LIVE-A); DAILY-A, DAILY-B, EDIT-A, EDIT-B (after P0) | DAILY-A, DAILY-B, EDIT-A, EDIT-B, LEARN, BOOK |
| P3 Community | 4 (and the dashboard half of 3) | TODAY (after DAILY-A, DAILY-B, ACAD); SOCIAL, NOTIFY (after P0); GROUPS (after LIVE-A, DAILY-B); LIVE-B (after LIVE-A) | NOTIFY, SOCIAL, LIVE-B, GROUPS, TODAY |
| P4 Earning, progression, shopping | 6, 7, 8 | OPPS-A, OPPS-B (after P0); SKILLS (after MENTOR-A, MENTOR-B); RANKS (after DAILY-A); MONEY (after BOOK, LIVE-A) | OPPS-A, OPPS-B, RANKS, SKILLS, MONEY |
| P5 Personalization and finish | 9, 10 (with §10 and §16) | GUIDE (after ACAD, MENTOR-B, LEARN, DAILY-A, DAILY-B, LIVE-A); CONNECT (after LEARN, DAILY-A, OPPS-B); ANALYTICS (after ACAD, LIVE-A, DAILY-A, DAILY-B, LEARN); HOME (after ACAD, MENTOR-B, LIVE-A, EDIT-A, EDIT-B); POLISH (after every other unit) | CONNECT, GUIDE, ANALYTICS, HOME, POLISH |
| F Final integration | §21 sign-off | INT (lead), after POLISH; its journeys and early passes use idle slots before that | — |

#### W1.2 Where the order departs from §20, and why

1. **Live events (priority 5) start in P1, beside mentors.** LEAD_DECISIONS 4 makes a mentor 1:1 booking a `LiveEvent` with one `EventRegistration`. BOOK cannot be built without LIVE-A's `LiveEventService`, registrations, capacity and attendance. LIVE-B (series, calendar, reminders, resources, the event pages) keeps priority 5.
2. **The notification gateway, preferences and the outbox are in Phase 0.** LEAD_DECISIONS 5 and 10 make them shared by events, bookings, challenges, editorial scheduling and digests. The member-facing centre, templates, digests and announcements (NOTIFY) stay at community priority.
3. **Editorial and founder presence (§14, §15) are not in the §20 list,** but HOME needs their content. EDIT-A and EDIT-B therefore rank with community (4) rather than below every listed stream.
4. **DAILY, SOCIAL, NOTIFY and OPPS depend only on P0.** They start during P1 and P2 as slots free (section 9.3). Priority decides who gets a free slot; it does not hold a ready unit back.
5. **Shopping (priority 8) sits in P4 behind BOOK and LIVE-A,** because paid bookings and events extend both.
6. **Progression (priority 7) waits for its inputs.** SKILLS waits for MENTOR (verification needs approved mentors); its hook on module completion is wired when LEARN has merged, at SKILLS' merge if LEARN merges later. RANKS waits for DAILY-A, because rank criteria use the rules engine.
7. **Personalization (priority 9) starts when its reads exist,** not after all of P4. TODAY's daily-plan engine (P3) is the first personalization. GUIDE, CONNECT, ANALYTICS and HOME read other streams only through their exported read functions, so each starts once the streams it reads have merged (about hour 75 to 85 at the midpoints) and shows honest empty states for domains that merge later.
8. **Immersive (priority 10) adds no new 3D work.** /world stays optional. POLISH covers §16 motion. INT's J31 proves the whole loop works with WebGL turned off.

#### W1.3 Scheduling rules

- **Workflows and slots.** Three queue-runner workflows, each with two lanes, so at most 6 agents. A lane takes the next ready unit from the shared queue. One lane of a workflow implements while the other reviews or re-checks another unit; a unit keeps its worktree from implement through review and fixes.
- **How many units implement at once.** At most 4. Before P1 starts, the lead measures the peak memory of one unit running typecheck, a targeted vitest run and `next dev` together, and of the PostgreSQL server under four test databases. With 15 GB the expected answer is 4; if the measurement says 3, section 9.4 gives the effect.
- **Heavy commands.** `scripts/dev/heavy.sh <command>` wraps typecheck, the full vitest suite, `next dev` and `build:web` in a `flock` semaphore with 2 permits (two lock files under /tmp/tycoonhood-heavy). During implementation an agent runs only `pnpm vitest run <files>` for the tests it touches; it runs the full suite once, before review.
- **Database connections.** `scripts/db/create-stream-db.mjs` writes stream database URLs with `connection_limit=3`. The lead raises PostgreSQL `max_connections` from 100 to about 300 at a quiet moment before P1 (it needs a server restart), and every gate checks `pg_stat_activity` for leftover connections.
- **When a unit starts.** All three conditions hold:
  1. Every unit it starts after has merged into `build/living-ecosystem`, and typecheck, lint and vitest pass on the merged head. Full gates may still be running.
  2. An implementing slot is free.
  3. No unit in flight owns any file the new unit would change.
- **Who gets a free slot.** The eligible unit with the highest §20 priority. If a higher-priority unit will become eligible within 1.5 hours, the slot waits for it. Units from sections §20 does not list (§10, §16 to §19) rank below every listed unit, except EDIT-A and EDIT-B (rule 3 in W1.2).
- **Gates run on a timer,** not only at tier ends: the lead's full gate (section W3.2) runs at least every 8 hours on the integrated head, inside the semaphore, so a regression is found within a working day.
- **Idle slots** go to work that is safe to run early: the early adversarial passes on merged code (section W3.4), INT's journeys, and fixing gate failures.

#### W1.4 Ownership rules

**Lead-owned for the whole build.** No stream edits these files. A stream that needs a change asks for it (see below).

| Area | Files |
|---|---|
| Database | packages/db/prisma/schema.prisma; packages/db/prisma/migrations/**; packages/db/src/generated/**; docs/DATABASE.md; docs/ecosystem/data-model.md; docs/ecosystem/pending-migrations/** |
| Access | packages/core/src/auth/{permissions,grants}.ts; apps/web/lib/guard.ts; apps/web/lib/auth.ts |
| Shared platform | packages/core/src/platform/{audit,notify,notification-topics,notification-preferences,authenticity,privacy,ip-key,settings}.ts; packages/core/src/platform/settings/keys/index.ts; packages/config/src/{ecosystem,demo,index}.ts |
| Events and time | packages/core/src/events/{types,bus}.ts; packages/core/src/activity/record.ts; packages/core/src/time/** |
| Registries | packages/core/src/index.ts (barrels pre-wired in P0); packages/core/src/rules/counters/index.ts; packages/core/src/cron/index.ts; packages/core/src/dashboard/slots/types.ts |
| Web shell | apps/web/components/app/nav.ts; apps/web/lib/admin-nav.ts; apps/web/components/admin-tabs.tsx; apps/web/components/trust/**; apps/web/next.config.mjs; apps/web/app/sitemap.ts; apps/web/app/robots.ts; apps/web/app/api/cron/**; the layouts of (app)/settings, (app)/studio, (app)/admin and (app)/admin/site |
| Deploy and harness | apps/web/vercel.json; scripts/vercel-build.sh; scripts/deploy-db.mjs; root and package package.json scripts; packages/core/test/{setup,helpers,throwaway-db}.ts; scripts/e2e/run-journeys.mjs, scripts/e2e/lib/**, scripts/e2e/a11y.mjs; scripts/ownership/**; scripts/db/**; scripts/dev/** |
| Seeds | packages/db/src/seed-taxonomy.ts; packages/db/src/seed-demo/index.ts (runner and guard) |
| Docs | TYCOONHOOD_STATE.md, TYCOONHOOD_DECISIONS.md, TYCOONHOOD_BLOCKED_ON_YOU.md, LAUNCH.md, docs/DEPLOYMENT.md, docs/TEST_REPORT.md, docs/AGENT_OWNERSHIP.md, docs/ECOSYSTEM_PLAN.md |

After P0 merges, `packages/core/src/platform/{scheduled,notification-delivery}.ts` pass to NOTIFY, and `packages/core/src/academies/academies.ts` to ACAD. When POLISH starts, apps/web/components/trust/** passes to POLISH. Their exported signatures and props, as data-model section e (section 5) gives them, are frozen; a change to one is a request to the lead.

**Requests to the lead.** A stream that needs a change in a lead-owned file writes it into docs/ecosystem/requests/&lt;unit&gt;.md. That file belongs to the unit. The request is an exact patch or an exact description, for example: a nav entry, a sitemap entry, a permission, a topic, an audit action, or a missing field.
- The lead applies the request at merge time and deletes the file.
- A missing field or enum value stops the unit until the lead lands a migration on the integration branch (section W3.6). The unit then merges the integration branch into its own branch.

**Read rule.** A stream may read any table, but only read-only:
- through the Phase 0 visibility helpers (`publicWhere.*`, `countableMemberWhere`, `realWhere`), and
- through the exported read functions of units that have already merged.

A stream writes only through services it owns, or through another unit's exported service functions. It never writes another domain's tables directly.

**Frozen shared files.** P0s splits `discussions/discussions.ts` into `discussions/{posts,groups,reports,moderation}.ts`. The exported API of `posts.ts` and `reports.ts` (including `createPost({kind})` and `reports.file`) is frozen at the end of P0s. SOCIAL owns both files afterwards; GROUPS and the other units ask SOCIAL, through the lead, for any addition instead of editing them. `platform/pulse.ts`, extracted from `world/load.ts` by P0s, belongs to HOME.

**Machine check.** scripts/ownership/streams.json lists each unit's owned globs, with an `except` list per glob, and a deny-list of lead-owned paths that no unit may touch. `node scripts/ownership/check.mjs <unit>` fails when `git diff --name-only <base>...HEAD` touches a path outside the unit's globs (after exceptions) or inside the deny-list. Its own requests file and its own test files are allowed. Both the implementer and the reviewer run the check.

**Within one phase, the OWNS lists do not overlap.** Where two phases touch the same file, the later unit starts only after the earlier one has merged. Each brief says when that happens. For a split stream, the brief's "Split" block says which owned files belong to the A half and which to the B half.

#### W1.5 Slot files that Phase 0 creates

**Contract for every slot.** Each slot is a typed stub with a fixed signature that returns "nothing", for example `null` or a component that renders nothing. The owning unit replaces the body, and only the owning unit edits the file. A section whose slot returns nothing is hidden. Pages never show a placeholder that pretends there is content.

| Slot | Path pattern | Filled by |
|---|---|---|
| Rule counters (one per evidence type; `count(userId, window) => number \| null`, where `null` means "no source of truth" and never pays) | packages/core/src/rules/counters/&lt;name&gt;.ts | ACAD (academy-joined); LIVE-A (event-registered, event-attended); BOOK (mentoring-completed); LEARN (module-completed, certificate-issued, path-completed); DAILY-A (the existing counters and practice); DAILY-B (goal and challenge counters); GROUPS (group-joined); OPPS-B (opportunity-applied); SKILLS (skill-level-reached, project-published, project-verified) |
| Dashboard data (`load(userId, ctx) => SlotResult \| null`) | packages/core/src/dashboard/slots/{events,mentors,bookings,contributor-applications,opportunity-applications,opportunities,skills,badges,group-activity,guide}.ts | LIVE-B, MENTOR-B, BOOK, MENTOR-A, OPPS-B, OPPS-B, SKILLS, RANKS, GROUPS, GUIDE |
| Academy page sections | apps/web/app/(public)/academies/[slug]/_sections/{mentors,events,challenges,discussions,achievements,leaderboard,paths,products}.tsx | MENTOR-B, LIVE-B, DAILY-B, SOCIAL, RANKS, RANKS, LEARN, MONEY (ACAD owns courses.tsx, instructors.tsx, activity.tsx) |
| Expert profile sections (created by MENTOR-B in P1, not by P0) | apps/web/components/expert/sections/{offerings,availability,upcoming,reviews,history,programmes,writing,showcase,pricing}.tsx | BOOK (first five), LEARN, EDIT-A, SKILLS, MONEY |
| Studio hub cards and sub-routes (P0 creates the shell at apps/web/app/(app)/studio/{layout,page}.tsx, gated by `studio.access`) | apps/web/app/(app)/studio/_cards/&lt;x&gt;.tsx and apps/web/app/(app)/studio/&lt;x&gt;/** | MENTOR-A (credentials, applications); MENTOR-B (profile); LIVE-A (events); BOOK (offerings, availability, bookings, reviews); LEARN (courses, resources, assignments, analytics); EDIT-A (writing); SOCIAL (announcements); SKILLS (showcase); MONEY (earnings) |
| Settings sub-routes (P0 creates the layout; the existing page becomes "Account") | apps/web/app/(app)/settings/{privacy,academies,notifications,focus,guide}/** | P0e, ACAD, NOTIFY, TODAY, GUIDE |
| Settings keys (zod schema plus default per key; the registry index is lead-owned) | packages/core/src/platform/settings/keys/{home,founder,guide,mentoring,events,opportunities,engagement,leaderboards,roadmap,community,groups,academies}.ts | HOME, EDIT-B, GUIDE, BOOK, LIVE-A, OPPS-B, DAILY-A, RANKS, P0e, SOCIAL, GROUPS, ACAD |
| Admin site sub-routes (P0 splits /admin/site; "general" keeps today's fields) | apps/web/app/(app)/admin/site/{general,founder,stories,announcements,homepage,house-rules}/** | P0f-S, EDIT-B, EDIT-B, NOTIFY (removes it in favour of /admin/announcements), HOME, POLISH |
| Admin member detail panels | apps/web/app/(app)/admin/members/[id]/_panels/{contributor,reports,follows,metrics}.tsx | MENTOR-A, SOCIAL, SOCIAL, ANALYTICS |
| Admin applications inbox tabs (MENTOR-A owns the inbox page) | apps/web/app/(app)/admin/applications/_tabs/{contributors,partners,listings}.tsx | MENTOR-A, OPPS-A, OPPS-B |
| Admin mentors tabs | apps/web/app/(app)/admin/mentors/_tabs/{bookings,reviews}.tsx | BOOK |
| Member profile sections | apps/web/app/(app)/profile/_sections/{academies,identity,skills,projects,rank}.tsx | ACAD, SKILLS, SKILLS, SKILLS, RANKS |
| Public profile sections | apps/web/app/(public)/u/[username]/_sections/{academies,skills,projects,achievements}.tsx | ACAD, SKILLS, SKILLS, RANKS |
| Challenge page leaderboard | apps/web/app/(app)/challenges/_sections/leaderboard.tsx | RANKS |
| Daily cron sweeps (`sweep(now) => SweepReport`; one daily route calls them all) | packages/core/src/cron/sweeps/{live,engagement,challenges,notifications,community,analytics,editorial,commerce,mentoring}.ts | LIVE-A (LIVE-B adds the reminder backstop after LIVE-A merges), DAILY-A, DAILY-B, NOTIFY, SOCIAL, ANALYTICS, EDIT-A, MONEY, MENTOR-B (the photo recheck; BOOK adds the booking-request expiry after MENTOR-B merges) |
| Domain metrics (aggregates only, no personal data; ANALYTICS reads them) | packages/core/src/&lt;domain&gt;/metrics.ts plus `pendingCounts()` | each domain unit |
| Demo data (runner refuses production; see D1). Names end in " (Demo)" | packages/db/src/seed-demo/&lt;domain&gt;.ts | MENTOR-B (mentors), BOOK (offerings), LIVE-A (events), EDIT-A (posts), SOCIAL (community), GROUPS (groups), OPPS-A (partners), OPPS-B (opportunities), SKILLS (projects) |
| Journeys and page lists | scripts/e2e/journeys/NN[a\|b]-&lt;name&gt;.mjs; scripts/e2e/pages/&lt;unit&gt;.txt (each line has a path and the role to sign in as) | each unit |
| Requirement evidence | docs/ecosystem/requirements/&lt;unit&gt;.json (generated from Appendix A; the unit fills `evidence` and `classification`) | each unit |

#### W1.6 Permission and grant catalogue (Phase 0, P0b)

The names are those of data-model e.1 (section 5), which holds the full signatures.

**`can(user, permission)` is the union of three sources,** read in this order:
- the member's role (the existing static table);
- the grants derived from rows the member already has (`GRANT_TABLE`);
- `APPROVED_MENTOR_PERMISSIONS` (`progression.verify`) when `mentorApproved` is true.

There is no grant table. `grantsFromUserRow` (packages/core/src/auth/grants.ts) reads the expert and partner rows in the same query as the session (`GRANT_INCLUDE`), so suspending a mentor or a partner removes the grant on the member's next request. Ownership and scope checks stay in services (`assertHostsEvent`, `assertOwnsMentorProfile`, `assertPartnerMember`, `assertCanVerify`, `authoring.assertCanEditCourse`). `can()` answers only "may this kind of actor do this kind of thing".

**New staff permissions.** ADMIN holds all of them.

| Permission | Lets the holder |
|---|---|
| `academies.manage` | edit academies, learning paths and the skill catalogue |
| `contributors.review` | decide contributor applications; verify credentials, identity and photos |
| `mentors.manage` | manage mentor profiles, mentor categories (disclaimers, `paidAllowed`), offerings and bookings |
| `events.manage` | every live event, event kinds, series, registrations and attendance disputes |
| `opportunities.manage` | partners, opportunities and applications |
| `content.write`, `content.publish` | write editorial posts; approve, schedule, publish and archive them |
| `progression.verify` | verify a member's skill or project |
| `guide.review` | read Guide conversations that a member flagged; nothing else |

Missions, challenges, evidence, ranks and achievements stay under the existing `admin.economy`. Course and resource submissions stay under `courses.publish` (DR-34), submitted events under `events.manage`. Site-wide announcements keep `admin.content` together with `community.announce`.

**Member capabilities, reached only through grants:** `studio.access`, `mentoring.host`, `events.host`, `opportunities.post`.

| Grant | Held while | Gives |
|---|---|---|
| `mentor` | `Instructor.status` is ACTIVE, `contributorKinds` contains MENTOR, and `MentorProfile.status` is DRAFT, ACTIVE or PAUSED | `studio.access`, `mentoring.host`, `events.host`, `content.write`; and `progression.verify` only while the profile is ACTIVE with `approvedAt` set (`mentorApproved`), scoped to the mentor's categories and needing evidence |
| `contributor` | `Instructor.status` is ACTIVE and `contributorKinds` contains INSTRUCTOR or CREATOR | `studio.access`, `courses.author` (on the contributor's own courses only, through DR-34's `authoring.assertCanEditCourse`), `events.host`, `content.write` |
| `partner` | the member has a `PartnerMember` row on a VERIFIED `Partner` | `opportunities.post`, scoped to that partner by `assertPartnerMember` |

A suspended user holds no grants. There are no staff grants: staff areas need ADMIN, or MODERATOR for moderation. Delegating one staff area to someone else needs a `StaffGrant` table, which is owner decision O37 (default: not built).

**Group roles.** `groupCan(member, group, action)` reads `GROUP_ROLE_TABLE` (packages/core/src/community/group-roles.ts): OWNER, MODERATOR and MEMBER, against post, announce, moderate, invite, approve, edit, archive, createEvent and createChallenge.

**Guards** (apps/web/lib/guard.ts): `requirePermission`, `requireAnyPermission`, `actorWith`, `actorWithAny`, and the new `requireGrant` and `actorWithGrant`. P0b replaces every remaining ADMIN-only check (data-model e.1 lists them) and then deletes `requireAdmin` and its two local copies.

#### W1.7 LEAD_DECISIONS: defects found, and the naming table

The six defects of LEAD_DECISIONS, D1 to D6, each with the smallest change that fixes it, are section 1.4. The naming table and the naming rules N1 to N7 are section 2.1.

#### W1.8 What the review changed

The review raised 36 issues (7 high, 17 medium, 12 low). All are accepted, with one part rejected:

- **Rejected (part of issue 18):** a separate `platformFeeBps` on `RevenueShareAgreement`. The platform keeps exactly 10000 − `contributorShareBps` basis points; a second field could disagree with it, and LEAD #15 forbids inventing a share. The other money terms the review asked for (`holdDays`, `minPayoutCents`, `refundWindowHours`, `MentorProfile.cancellationHours`) are in the model.

| Issue | Where the fix is |
|---|---|
| 1 Untested or unowned requirements | tests added to GROUPS (location), SOCIAL (directory facets), EDIT-B (founder); R007 academy-linked products built by MONEY; R022 reported PARTIAL (B6, B9) by POLISH |
| 2 SEBI and paid financial mentoring | D6; MENTOR-B, BOOK, LIVE-A, MONEY |
| 3 Naming drift from the data model | the naming table in section 2.1; every brief renamed |
| 4 Staff grants in a grant table | W1.6: derived grants only; O37 |
| 5 SESSION and EVENT product kinds | MONEY uses `ProductKind.LIVE_EVENT` only; O5 reworded |
| 6 DR-34 and the INSTRUCTOR fix | P0b keeps DR-34 and extends its actor types with grants; MENTOR no longer waits on an INSTRUCTOR fix that has landed; the founder link uses `/admin/courses/instructors`; P0 exit uses the full suite of the merged base |
| 7 Notification split | P0d owns the gateway, preferences, the outbox and the ports; NOTIFY owns rendering, digests, unsubscribe pages, the centre and announcements; unsubscribe is per topic, plus one all-non-essential switch |
| 8 P0 file conflicts | the P0 file table (section W2, P0) |
| 9 Ownership globs, posts.ts, pulse.ts | W1.4 |
| 10 Course revisions versus DR-34 | LEARN builds reviewed revisions that only an administrator approves; `trustedAuthor` stays unused; O35 |
| 11 Course academy | N7; ACAD |
| 12 Shared trust components | P0e builds them; POLISH restyles only |
| 13 Drift check | W3.2: the check removes exactly the five `searchVector` lines |
| 14 TODAY's §21 line | IMPLEMENTED BUT UNVERIFIED at P3; INT verifies it with J31 |
| 15 Branch base | merge full-platform before P0a; migrations dated 20261113; daily launch-branch merges (W3.2) |
| 16 P0a exit and breaks | P0a fixes the code the schema breaks; the evidence move waits for DAILY-B |
| 17 Booking mode | INSTANT by default; BOOK also builds REQUEST |
| 18 Money terms | O4, O6, O7; MONEY |
| 19 One order per registration | MONEY: a plain index, and one PENDING or PAID order per registration under a row lock |
| 20 Stale reminders | `notAfter`; P0d test |
| 21 Project collaborators | `ProjectCollaborator`; SKILLS |
| 22 Academy notices for enrolment joins | `AcademyMembership.notify`; ACAD |
| 23 Mission cooldowns | DAILY-A honours a cooldown above 24 hours as a minimum gap |
| 24 Group invites | `GroupMemberStatus.INVITED`, `invitedById`; GROUPS |
| 25 Applicant contact fields | `sharedFields`; OPPS-B |
| 26 Cancelling scheduled rows | `cancelForSubject`; P0d, LIVE-A, LIVE-B, BOOK |
| 27 Contributor account deletion | RESTRICT plus anonymisation; MENTOR-A; O36 |
| 28 Schema changes after P0 | W3.6 |
| 29 Founder text approval | EDIT-B |
| 30 Who may verify | `mentorApproved`; P0b |
| 31 Public feedback | D2; P0e |
| 32 Expert photos | P0e (hosts, CSP), MENTOR-B (verification and recheck); O38 |
| 33 Honest timeline | section 9 |
| 34 Database connections | W1.3 |
| 35 Late starts for P5 | W1.2 rule 7 |
| 36 Units too large for one review | the five splits |

### W2. Workstreams

**How to read each unit.**
- **Requirements** use the map name and the requirement's position in that map (Appendix A). A split stream lists them for the whole stream, and its **Split** table says which rows belong to the A half and which to the B half.
- **Owns** lists the files and directories the unit may change. For a split stream, the Split table divides them.
- **Reads** lists what it reads, read-only.
- **Exit** ties the unit to §21.
- **Estimate** is implementation hours only. Every unit also needs 2 to 4.5 hours of review, fixes and the pre-review full run (section 9.1).

**Shared exit conditions.** Every unit also meets the definition of done in section W3.1.

#### P0 — Foundation (lead, with helper agents)

**Covers:**
- §17 infrastructure
- the §13 gateway, preferences and outbox
- the §18 admin structure
- the "establish file ownership, define database relationships" steps of §20
- the §4 privacy rules

**Requirements (9):** community R45-R46; platform R017, R031-R034, R041-R042.

**The parts.** P0 has eight parts. The lead writes P0a and merges every part; helper agents write the others.

| Part | What it builds | Starts after |
|---|---|---|
| P0a Schema | the schema, migrations 20261113000000 to 000800, the generated client, and the code fixes the new client needs | the full-platform merge |
| P0s Splits | the file splits, plus two frozen additions to the posts and reports API | the full-platform merge |
| P0f-H Harness | the journey runner split, stream databases, the ownership check, the heavy-command semaphore | the full-platform merge |
| P0b Access | permissions, derived grants, guards, the remaining ADMIN-only checks | P0a |
| P0c Time | the zoned-time module and the time-zone setting | P0a |
| P0d Notifications | the gateway, topics, preferences, the outbox, delivery ports, cron routes, and the move of the 34 write sites | P0a and P0s |
| P0e Trust | authenticity and visibility helpers, privacy facets, the activity write side, the domain events, the shared trust components, the house-rule fixes | P0a |
| P0f-S Scaffolding | slot stubs, the grouped admin navigation, the shells, the taxonomy seed, the demo seed runner, config catalogues, docs | P0a |

**Order of work.**
1. **The base.** The lead merges `build/full-platform` into `build/living-ecosystem` (the merge task already in progress, which settles the seed conflict between DR-33 and DR-34). On the merged head the lead runs typecheck, lint and the full vitest suite, and records the pass, fail and skip counts and the journey counts. Those numbers, not the older "610 tests", are the P0 baseline.
2. P0a, P0s and P0f-H start at once. P0a's first commit is the schema, the nine migrations, the generated client and the code fixes, together, so typecheck and the suite stay green at every commit.
3. P0b, P0c, P0e and P0f-S start when that commit has merged. P0d starts when P0a and P0s have both merged.
4. The lead merges the parts in this order: P0s, P0a, P0c, P0b, P0d, P0e, P0f-H, P0f-S. The lead runs the full gate after the last part merges.

**Who changes which file during P0.** Where two parts change one file, the later part starts on that file only after the earlier one has merged. The ownership check (P0f-H) reads this table for P0.

| File | Part, in order |
|---|---|
| packages/db/prisma/schema.prisma; packages/db/prisma/migrations/20261113000000 to 20261113000800; packages/db/src/generated/**; docs/DATABASE.md; docs/ecosystem/data-model.md; docs/ecosystem/pending-migrations/**; scripts/db/rehearse-migrations.mjs | P0a |
| packages/core/src/rewards/rewards.ts | P0a (line 73 passes `occurrence`), then P0d (the notice at line 109) |
| packages/core/src/earn/affiliates.ts | P0a (`ipKey` moves to platform/ip-key.ts; a payout's `affiliateId` is narrowed at lines 212-213, 824, 897 and 981), then P0d (ten notices) |
| apps/web/app/(app)/admin/earn/page.tsx | P0a (lines 54 and 256-269) |
| packages/core/src/commerce/commerce.ts; packages/core/src/shop/checkout.ts | P0a (`Order.paidAt` at commerce.ts:254 and :323, checkout.ts:198 and :362), then P0d (notices) |
| packages/core/src/growth/referrals.ts; apps/web/app/(auth)/actions.ts | P0a (no IP is passed or stored), then P0d (referrals.ts:134) |
| packages/core/src/platform/ip-key.ts (new); packages/core/src/auth/session.ts | P0a (`ipKey`), then P0b (`GRANT_INCLUDE` in session.ts) |
| packages/core/src/discussions/discussions.ts, split into discussions/{posts,groups,reports,moderation}.ts with index.ts re-exports | P0s, then P0d (the three notices, in their new files) |
| packages/core/src/rules/counters.ts, split into rules/counters/index.ts and one file per counter | P0s |
| packages/core/src/world/load.ts, with the pulse query extracted to packages/core/src/platform/pulse.ts | P0s |
| packages/core/src/auth/{permissions,grants}.ts; apps/web/lib/guard.ts; apps/web/app/(app)/admin/actions.ts; apps/web/app/(app)/admin/missions/actions.ts; the admin pages and actions listed in data-model e.1; packages/core/src/lms/authoring.ts | P0b |
| apps/web/lib/auth.ts | P0b (grants on the current user), then P0e (the active-day hook) |
| packages/core/src/community/community.ts | P0b (`isAdmin` checks), then P0d (lines 425 and 478) |
| packages/core/src/time/{zoned,day}.ts; packages/core/test/rules-engine.test.ts | P0c |
| packages/core/src/platform/profile.ts | P0c (`setTimezone`), then P0e (privacy facets) |
| apps/web/app/onboarding/**; apps/web/app/(app)/settings/page.tsx and actions.ts | P0c (time-zone field), then P0e (the privacy card moves to /settings/privacy), then P0f-S (the page becomes "Account" under the new layout) |
| packages/core/src/platform/{notify,notification-topics,notification-preferences,scheduled,notification-delivery,mail-outcome}.ts; apps/web/lib/notifications.ts; apps/web/lib/mail/index.ts; apps/web/app/api/cron/{daily,dispatch}/route.ts; packages/core/src/cron/index.ts | P0d |
| the other write sites of data-model e.5: platform/cms.ts, gamification/{challenges,xp,achievements}.ts, rules/engine.ts, shop/refunds.ts | P0d |
| packages/core/src/lms/lms.ts | P0d (notices at lines 160 and 305), then P0f-S (the `academies.ensureFromEnrolment` call where an `Enrollment` is created) |
| packages/core/src/academies/academies.ts (new) | P0f-S |
| apps/web/vercel.json | the lead (`git.deploymentEnabled`, landed at the start of P0 so that unit branches can be pushed as backups), then P0d (`daily` replaces `expire-orders`) |
| packages/core/src/platform/{authenticity,privacy}.ts; packages/core/src/activity/record.ts; packages/core/src/events/{types,bus}.ts; apps/web/components/trust/**; packages/ui/src/components/ProgressRing.tsx; apps/web/next.config.mjs; the /status, /roadmap and /u/[username] loaders; apps/web/app/(app)/settings/privacy/** | P0e |
| scripts/e2e/**; scripts/db/create-stream-db.mjs; scripts/ownership/**; scripts/dev/heavy.sh; packages/core/test/{setup,helpers}.ts | P0f-H |
| every slot stub in section W1.5; apps/web/lib/admin-nav.ts and apps/web/components/admin-tabs.tsx (after P0b has merged, because they read `can()`); the settings, studio and admin-site layouts; packages/db/src/seed-taxonomy.ts; packages/db/src/seed-demo/index.ts; packages/config/src/{ecosystem,demo,index}.ts; scripts/vercel-build.sh; scripts/deploy-db.mjs; package scripts; the docs below | P0f-S |

**P0a. Schema and migrations (lead).** Data-model section c is the specification; this is the order of work.
- Copy the schema of Appendix B (`final/dm/schema.prisma` in the planning scratchpad) over packages/db/prisma/schema.prisma (or run `final/dm/merge.py` against the repo schema if it has moved; the script stops when a pattern no longer matches), then `prisma format`.
- Copy the nine folders 20261113000000 to 20261113000800 into packages/db/prisma/migrations. The tenth, `20261113000900_challenge_evidence_move`, lands with DAILY-B, which moves the challenge code to `EvidenceSubmission`. Until then it is kept at docs/ecosystem/pending-migrations/20261113000900_challenge_evidence_move/migration.sql, outside the migrations folder, so nothing applies it early.
- Commit plan/data-model.md as docs/ecosystem/data-model.md, so the full specification (every migration's SQL, the seed rows, sections a to g) lives in the repo and not only in the planning scratchpad.
  - 000000 holds only `ALTER TYPE ... ADD VALUE` statements, because a value added in a transaction cannot be used in it.
  - The folders sort after full-platform's `20261112110000_pending_email_at`. migrate-sql.ts applies pending folders in name order but would also apply an older-named folder after newer applied ones, so dating them after the launch branch keeps one order on every database.
- Generate the client and, in the same commit, fix the code it breaks (data-model 0.5, items 1 to 6):
  - `rewards.ts:73` passes `occurrence`, because 000400 makes it NOT NULL;
  - payout code narrows the now-nullable `PayoutRequest.affiliateId`;
  - `Order.paidAt` is set wherever an order becomes PAID;
  - `ipKey()` becomes an HMAC (data-model e.10), and no code passes a raw IP to referrals;
  - `rules-engine.test.ts:246-249` waits for P0c, which changes the fallback it tests.
- Update docs/DATABASE.md: 141 models, the new migration rows, and paid time from `Order.paidAt`.
- **Rehearsal:** scripts/db/rehearse-migrations.mjs is the checked-in form of `final/rehearse.sh` in the planning scratchpad. It creates a throwaway database, applies the 15 base migrations, the fixtures and the nine new folders, prints each check of data-model c.4 (defaults, nullability, the evidence rows, the CHECK and RESTRICT refusals), and drops the database. It also runs against a copy of the populated local database.
- **Drift check:** `prisma migrate diff --from-migrations ... --to-schema-datamodel ...` output, filtered to remove exactly the five lines that recreate the generated `searchVector` columns (Prisma cannot express them), is empty. The filter matches those five lines by full text, so any other difference fails the check.

**P0s. Pure-move splits (helper).**
- `discussions/discussions.ts` becomes `discussions/{posts,groups,reports,moderation}.ts` with `discussions/index.ts` re-exporting the same names. The existing discussion and moderation tests pass unchanged.
- Two additions ride on the split, because GROUPS, OPPS, SKILLS and BOOK build on them before SOCIAL merges: `listPosts({kind})` and `createPost({kind})` accept `CommunityPostKind` (default DISCUSSION), and `reports.file({targetType, targetId, reason})` files a `ContentReport` for any target type the schema lists. The exported API of `posts.ts` and `reports.ts`, with these two, is frozen at the end of P0s (section W1.4).
- `rules/counters.ts` becomes `rules/counters/index.ts`, a dispatcher, plus one file per existing counter. `countsStandardDays`, `eventAdvances` and `repeatBucket` in rules/criteria.ts are untouched.
- The pulse query in `world/load.ts` moves to `platform/pulse.ts`; world-load.test.ts passes unchanged. HOME owns pulse.ts afterwards.

**P0b. Access (helper).** Data-model e.1 and e.2 give every signature.
- packages/core/src/auth/permissions.ts gains the new permissions, `GRANT_TABLE`, `APPROVED_MENTOR_PERMISSIONS` and `mentorApproved` on `HasRole`. packages/core/src/auth/grants.ts (new) has `GRANT_INCLUDE`, `grantsFromUserRow` and `actorFor`. `auth/session.ts` selects `GRANT_INCLUDE` in the session query.
- apps/web/lib/guard.ts gains `requireGrant` and `actorWithGrant`. Every remaining ADMIN-only check listed in e.1 moves to a named permission, including the two local `requireAdmin` copies in apps/web/app/(app)/admin/actions.ts:24 and admin/missions/actions.ts:16; then `requireAdmin` is deleted. `community.ts` keeps `isAdmin` only where the rule really is "an admin" (an admin's mute), as e.1 lists.
- DR-34 stays as it landed (`authoring.assertCanEditCourse`, `courses.publish` review). The authoring actor types gain `grants`, so a contributor edits only their own courses.
- `ROLE_LABEL.CREATOR` becomes "Affiliate" (D3).
- `assertHostsEvent`, `assertOwnsMentorProfile`, `assertPartnerMember` and `assertCanVerify` (which requires `mentorApproved`) go in the new access modules of e.2; `groupCan` and `GROUP_ROLE_TABLE` in community/group-roles.ts.
- **Tests:** packages/core/test/permissions-grants.test.ts (table-driven over every role, grant and suspension state, including "approval leaves `User.role` unchanged" and "an unapproved mentor cannot verify"), guards.test.ts. course-ownership.test.ts keeps passing.

**P0c. Time (helper).** Data-model e.4 gives the signatures.
- packages/core/src/time/zoned.ts: `memberDayKey`, `memberWeekKey`, `memberMonthKey`, `analyticsDayKey`, `effectiveZoneAt`, `nextZoneCutover`, `parseZonedDateTime`, `formatTimeRange`, `utcOffsetLabel` and the zoned arithmetic helpers. `memberZone` (time/format.ts) stays the single fallback.
- `time/day.ts` falls back to Asia/Kolkata instead of UTC for a missing or invalid zone; `rules-engine.test.ts:246-249` changes with it.
- `profile.setTimezone` validates against `Intl.supportedValuesOf('timeZone')` and writes `Profile.previousTimezone` and `Profile.timezoneEffectiveAt`, so the old zone stays in force until the next local midnight. Onboarding captures the zone, prefilled from the browser; settings can edit it.
- Streams adopt the module in their own code (streaks, missions, events, availability).
- **Tests:** zoned.test.ts covers New York and London DST transitions, Kolkata, Kathmandu (+5:45), Apia, and the cutover rule (a day is neither skipped nor counted twice).

**P0d. Notification core (helper).** Data-model e.5 is the specification, including "who builds what".
- The topic catalogue (42 topics, 7 essential, including `mentoring.request`), `notify` and `notifyMany` (suppression, preferences, dedupe, `groupKey`), `notification-preferences.ts` (`effectiveChannels`, `preferencesFor`, `setPreference`, `updateSettings`, `unsubscribeToken`, `unsubscribeByToken(token, topic | "all")`).
- `scheduled.ts`: `schedule` (with `notAfter`), `reschedule`, `cancelForSubject`, `dispatchDue` (claims with `FOR UPDATE SKIP LOCKED`, retries, stale rows, quiet hours that never push past `notAfter`, pause and opt-out).
- `notification-delivery.ts`: `MailerPort`, `PushPort`, `nullPush`, `pushConfigured`, and a plain-text `renderEmail`. `mailModeFromEnv` in mail-outcome.ts.
- apps/web/lib/notifications.ts (`dispatchDeps`, `dispatchSoon`), the bell's per-member dispatch, `/api/cron/daily` (replacing the `expire-orders` cron entry, and running that work first) and `/api/cron/dispatch`, both behind `cronAuth`.
- The 34 write sites move to the gateway with their titles unchanged.
- **Tests:** notify-gateway.test.ts; scheduled-outbox.test.ts (two concurrent dispatchers never send a row twice; `cancelForSubject` for all registrants and for one; a row past `notAfter` is SKIPPED as stale; quiet hours never move a row past `notAfter`); notification-sites.test.ts (every site and its unchanged title).

**P0e. Trust, privacy and activity (helper).** Data-model e.3, e.6 and e.11.
- packages/core/src/platform/authenticity.ts: `realWhere`, `publicWhere.{mentor,liveEvent,opportunity,partner,post,feedback}`, `countableMemberWhere`, `scarcityAllowed`, `ratingSummary`, `publicCount`, `bannedClaims`, `demoVisible`. `publicWhere.feedback` applies D2.
- An admin banner says "Demo data present" when demo rows exist.
- The shared trust components: apps/web/components/trust/{DemoBadge,VerificationBadge,EmptyState}.tsx, and `ProgressRing` in packages/ui. POLISH restyles them later; it does not rebuild them.
- Expert photos: `IMAGE_REMOTE_HOSTS` (default: none, owner decision O38) feeds `images.remotePatterns` and the CSP `img-src` in apps/web/next.config.mjs. Photos render through next/image; with no allowed host, profiles show initials.
- **House-rule fixes:** /status counts use `countableMemberWhere`; /roadmap's claims move into the `roadmap` setting and are corrected; /u/[username] returns 404 for a suspended member.
- **Privacy:** packages/core/src/platform/privacy.ts holds `PRIVACY_FACETS`, `facetOn` and `canView`. /settings/privacy carries the full facet form, including the missing achievements and THC toggles.
- **Activity:** packages/core/src/activity/record.ts subscribes to the bus, is fail-soft, and writes `ActivityEvent` rows whose visibility follows the facet they reveal. The `MemberActivityDay` hook in apps/web/lib/auth.ts is memoised per member-day and skips polling routes.
- **Domain events:** the 19 new `DOMAIN_EVENTS` of data-model e.6, with the binding names (MENTOR_APPROVED, MENTORING_BOOKED, MENTORING_COMPLETED, GOAL_ACHIEVED, PROJECT_PUBLISHED and the rest).
- **Tests:** authenticity-empty-db.test.ts (every public loader on an empty database shows no invented number, name or rating), privacy-facets.test.ts, activity-record.test.ts, house-rules.test.ts. Each later unit adds authenticity-&lt;unit&gt;.test.ts for its own public loaders.

**P0f-H. Harness (helper).**
- **Journeys:** scripts/e2e/journeys.mjs becomes scripts/e2e/journeys/01-guest.mjs to 09-world.mjs plus scripts/e2e/run-journeys.mjs. The runner filters by number, has a `--dev` mode for sandbox journeys, and shards with `--shard i/n` (a database and port per shard). After the split, `pnpm e2e:journeys` reports the same counts as the baseline of step 1.
- **Page lists:** scripts/e2e/a11y.mjs and J8 read scripts/e2e/pages/*.txt. Each line is a path and the role to sign in as.
- **Stream databases:** `node scripts/db/create-stream-db.mjs <unit>` creates `tycoonhood_<unit>_test` and `tycoonhood_<unit>_e2e`, migrated, and prints URLs with `connection_limit=3`. `--recreate` drops and rebuilds them after a lead migration (section W3.6), and `--extra-migration <folder>` applies one more folder after the committed ones (DAILY-B uses it for 000900).
- **Ownership:** scripts/ownership/{streams.json,check.mjs}, with `except` lists and the lead deny-list (section W1.4).
- **Heavy commands:** scripts/dev/heavy.sh, a `flock` semaphore with 2 permits for typecheck, the full vitest suite, `next dev` and `build:web`.
- **Measurement:** the peak-memory measurement of section W1.3, recorded in docs/ecosystem/machine.md.

**P0f-S. Scaffolding (helper).**
- **Slot stubs:** every slot in section W1.5, each with its fixed signature and a body that returns nothing.
- **Admin navigation:** `adminNavFor(user)` (data-model e.8) groups apps/web/lib/admin-nav.ts into Members; Learning; Mentors and contributors; Events; Community; Engagement; Opportunities; Commerce; Content and site; Insights; System. The mobile admin tabs follow, and J7 is updated.
- **Shells:** the settings layout (the existing page becomes "Account"), the studio shell gated by `studio.access`, and the admin site layout (`/admin/site/general` keeps today's fields).
- **Academies:** packages/core/src/academies/academies.ts with the signatures of data-model e.7 (`academySlugForPillar`, `academyForPillar`, `academyIdForCourse`, and `AcademyService` with `ensureFromEnrolment`, which joins with `notify` false), and its call in lms.ts. ACAD owns the file afterwards and fills in the rest.
- **Config:** packages/config/src/ecosystem.ts holds the seed catalogues of data-model e.12 (academies, mentor categories with `disclaimer` and `paidAllowed`, event kinds, post categories). packages/config/src/demo.ts holds `assertDemoSeedAllowed(env, argv)` (D1).
- **Seeds:** packages/db/src/seed-taxonomy.ts is create-only and records each row in `SeedRecord`. It holds the four academies (a test checks they equal the rows migration 000100 inserts), the ten §2 mentor categories with disclaimers and `paidAllowed` false for financial-literacy, the event kinds, a starter skill catalogue and module-to-skill map flagged for owner review, the editorial categories, and the HOUSE partner. scripts/vercel-build.sh runs it on every production deploy, after the migrations and outside the SEED_ON_DEPLOY block, under the deploy lock (D5). The demo runner packages/db/src/seed-demo/index.ts calls `assertDemoSeedAllowed` before anything else.
- **vercel.json:** `git.deploymentEnabled` is false for `eco/*` and `build/living-ecosystem`, so a pushed backup branch never builds a preview against the shared database settings. (The lead landed this at the start of P0, so unit branches can be pushed as backups from the first day.)
- **Docs:** the TYCOONHOOD_STATE.md §21 skeleton (section 10); docs/AGENT_OWNERSHIP.md rows; DECISIONS entries for D1 to D6, N1 to N7 and the red/lattice gap; the new BLOCKED_ON_YOU items; docs/ecosystem/requirements/&lt;unit&gt;.json generated from Appendix A. docs/ECOSYSTEM_PLAN.md already exists.

**P0 exit:**
- typecheck and lint are clean;
- the full vitest suite of the merged base, as recorded in step 1, plus every new P0 test, passes with zero failures;
- build:web and the bundle rule pass;
- e2e:a11y finds 0 violations;
- journeys 1 to 9 report the baseline counts after the split;
- migrations 000000 to 000800 apply to an empty database and to a populated copy; the rehearsal prints every expected check; the filtered drift check is empty;
- the empty-database authenticity suite passes;
- the demo runner refuses production, Vercel, a non-local host, a database name without `_dev`, `_test` or `_e2e`, and a run without `--confirm-demo`, with tests;
- `pg_stat_activity` shows no leftover connections; `max_connections` is raised (section W1.3); the memory measurement is recorded.

**Estimate:** 20 to 32 hours of wall clock, including the merge of the launch branch and the gates (25 at the midpoint).

#### P1-ACAD — Academies

**Covers:**
- §3, §8 (academy memberships), §1 (premium institution), §18 (Academies)
- §21 "Members can discover and join academies"

**Requirements (17):** academies R00-R08, R10, R17, R19-R20, R24; platform R000, R046, R086.

**Starts after:** P0.

**Owns:**
- **Core:** packages/core/src/academies/{academies,memberships,metrics}.ts. academies.ts comes from P0 with the signatures of data-model e.7, which are frozen; ACAD fills in the bodies and adds:
  - `overview(academyId, viewer)` for the academy page;
  - `memberCount`, shown only at or above `MIN_COUNT_FOR_AGGREGATE` and counted with `countableMemberWhere`;
  - `setNotify(userId, academyId, on)`: `AcademyMembership.notify` is true for SELF and ONBOARDING joins and false for ENROLMENT and BACKFILL joins, and the member turns it on or off on the academy page.
- **Course academy (N7):** the academy picker replaces the pillar field in apps/web/app/(app)/admin/courses/[id]/page.tsx and its action, and in packages/core/src/lms/authoring.ts the course input takes `academyId` and sets `Course.pillar` from the academy in the same write. LEARN owns the rest of the editor after ACAD merges.
- **Pages:**
  - apps/web/app/(public)/academies/{page.tsx, [slug]/layout.tsx, [slug]/page.tsx, [slug]/_sections/{courses,instructors,activity}.tsx}. The other `_sections` files, `paths/` and `leaderboard/` belong to other units.
  - apps/web/app/(app)/admin/academies/** except `[id]/paths/**`
  - apps/web/components/academies/**: AcademyCard and AcademyMark (code-drawn SVG marks; accents mapped to existing design tokens, with no new red)
  - apps/web/app/(app)/settings/academies/**
  - the academy step in apps/web/app/onboarding/** (P1 only)
  - grouping by academy on apps/web/app/(public)/programs/page.tsx and (public)/learning/page.tsx
- **Slots:** profile `_sections/academies.tsx`, u `_sections/academies.tsx`, counters/academy-joined.ts, settings key academies.ts.
- **Harness:** scripts/e2e/journeys/10-academies.mjs, pages/acad.txt.

**Reads:** Course, Instructor, ActivityEvent (visibility-filtered), the academy taxonomy.

**Routes:** /academies, /academies/[slug], /settings/academies, the onboarding academy step.

**Admin:** /admin/academies, /admin/academies/[id] (name, tagline, description, accent token, flagship programme, order, published).

**Requests to the lead:** "Academies" in the main nav and footer; sitemap entries.

**Tests:**
- academies-service.test.ts:
  - join and leave are idempotent; a member can join several academies
  - `ensureFromEnrolment` joins with `notify` false and never re-joins a member who left (`leftAt`)
  - academy notices go only to members with `notify` true
  - setting a course's academy writes `academyId` and `pillar` together
  - counts are thresholded and leave out demo, staff and suspended members
  - unpublished academies are hidden
- a route-name test: no "campus" outside /world
- authenticity-acad.test.ts
- **J10:** a guest browses /academies and an academy page. A member joins two academies, from the list and from settings, and leaves one. The profile shows the result. The academy page shows its courses, and an honest "no upcoming events" state.
- a11y pages: /academies and the four academy pages.

**Exit:** J10 passes on the production build. §21 "discover and join academies" is VERIFIED COMPLETE.

**Estimate:** 6.5 to 9.5 hours.

#### P1-MENTOR — Mentor network and contributor applications (MENTOR-A and MENTOR-B)

**Covers:**
- §2: directory, categories, profiles, registration, application, verification, dashboard, authenticity, founder-led fallback
- §12: contributor registration, creator profiles, mentor applications
- §13: new mentor announcements
- §18: Mentors, Mentor applications, Applications
- §21 "discover genuine mentors" and "mentors can apply and be verified"

**Requirements (32):** mentors R00-R10, R17-R22, R35-R40, R44; academies R09; community R48; platform R001, R043-R044, R056, R087-R088.

**Starts after:** P0. Both halves start at once; their owned files do not overlap. DR-34's course-ownership work has already landed, so nothing waits on an INSTRUCTOR fix.

**Split.**

| | MENTOR-A: applications, credentials, approval | MENTOR-B: directory, profiles, categories |
|---|---|---|
| Requirements | mentors R09, R18-R21, R38-R39, R44; platform R044, R056, R088 (11) | mentors R00-R08, R10, R17, R22, R35-R37, R40; academies R09; community R48; platform R001, R043, R087 (21) |
| Core | packages/core/src/contributors/{applications,accounts,terms}.ts; packages/core/src/mentors/verification.ts | packages/core/src/mentors/{directory,profile,categories,photos,metrics}.ts |
| Pages | apps/web/app/(public)/contribute/page.tsx; apps/web/app/(app)/apply/{mentor,instructor,creator,status}/**; apps/web/app/(app)/studio/credentials/** with `_cards/{credentials,applications}.tsx` | apps/web/app/(public)/mentors/**; apps/web/app/(public)/instructors/**; apps/web/app/(app)/studio/profile/** with `_cards/profile.tsx`; apps/web/components/expert/** (ExpertProfile and its section stubs); apps/web/components/mentors/** |
| Admin | apps/web/app/(app)/admin/applications/** (the inbox, with `_tabs/contributors.tsx` filled and stubs for OPPS); apps/web/app/(app)/admin/mentors/credentials/**; the member panel `contributor.tsx` | apps/web/app/(app)/admin/mentors/** except `credentials/**` (list, [id], categories), with tab stubs for BOOK |
| Slots and data | dashboard slot contributor-applications | dashboard slot mentors; academy section mentors.tsx; seed-demo/mentors.ts; sweeps: the photo recheck (in the mentoring sweep stub, until BOOK fills the rest) |
| Harness | journeys/11a-mentor-apply.mjs, pages/mentor-a.txt | journeys/11b-mentor-directory.mjs, pages/mentor-b.txt |
| Estimate | 4.5 to 6.5 hours | 5.5 to 8.5 hours |

**MENTOR-A builds:**
- `ContributorApplicationService`: `submit(userId, kind, answers)`, `withdraw`, `decide(id, staff, decision, reasonForApplicant)`. On approval it creates or links the `Instructor`, adds the contributor kind, creates the `MentorProfile` (DRAFT) for MENTOR, emits MENTOR_APPROVED when a mentor is approved, notifies `contributor.application`, and writes an audit row. It never changes `User.role` (D3). A re-application cooldown applies after a rejection.
- `VerificationService` (mentors/verification.ts): `verifyCredential(credentialId, staff, method, note)` records method and date and stores no ID images; `suspend` and `reinstate`. All need `contributors.review`.
- `terms.ts` records acceptance of the contributor terms version. Until legal review the text is labelled a draft (B7).
- **Account deletion (O36):** `ContributorAccount.user` is RESTRICT, so a user with a contributor account cannot simply be deleted. `contributorAccounts.anonymise(staff, userId)` clears the expert profile, payout method and contact fields, sets the profile to SUSPENDED and keeps the earnings, agreements and payouts. Account deletion today is a staff action on a contact-page request (DELETION_TOPIC); the member panel `contributor.tsx` gets the audited "Anonymise contributor" action, which needs `admin.users`.

**MENTOR-B builds:**
- `MentorDirectory.search({academy, category, language, q, page})` through `publicWhere.mentor()` (approved, public, not suspended, not demo in production). `MentorDirectory.recommendFor(userId)` recommends by academy memberships and interests, and returns an empty list honestly when nothing fits.
- `MentorProfileService`: the mentor's own profile (get, update, submit for approval). `approvedAt` is set when staff approve the profile, which turns on `mentorApproved` (section W1.6).
- **Categories:** /admin/mentors/categories edits the ten §2 categories, including `disclaimer` and `paidAllowed` (D6; financial-literacy is seeded with `paidAllowed` false and "Educational content, not financial advice."). A category disclaimer shows on every profile and offering in that category.
- **Photos:** a mentor photo shows only after staff verify it (`photoVerifiedAt`, `photoSha256`). A daily recheck compares the stored hash and hides a photo that changed. Photos render through next/image from `IMAGE_REMOTE_HOSTS` (P0e); with no allowed host the profile shows initials (O38).
- **Public pages:** the directory with academy, category and language filters, and /mentors/[slug]. /instructors/[slug] moves to the shared ExpertProfile; when the instructor has an approved mentor profile it redirects with a 308 to /mentors/[slug]. On an empty database /mentors shows the founder-led programmes and instructors and says applications are open (R37).
- **Notice:** `mentoring.new_mentor` goes to members of the mentor's academies who have `AcademyMembership.notify` on and the topic on.
- **Demo mentors:** packages/db/src/seed-demo/mentors.ts; `isDemo=true`, names end in " (Demo)", and no photo of a real person.

**Reads:** Instructor, Course (programmes taught), Academy, MentorCategory, User.

**Routes:** /mentors, /mentors/[slug], /instructors/[slug], /contribute, /apply/*, /studio, /studio/profile, /studio/credentials.

**Admin:** /admin/mentors (+ /credentials, /categories, /[id]), /admin/applications.

**Tests:**
- MENTOR-A: contributors-applications.test.ts (submit, withdraw, decide; approval gives the grant and never changes the role; the cooldown; audit rows); mentors-verification.test.ts (only `contributors.review` can verify; a qualification shows only when verified; method and date are stored); contributor-anonymise.test.ts (deleting the user is refused while the account exists; anonymising keeps the money rows and clears the profile).
- MENTOR-B: mentors-directory.test.ts (only approved, public, non-suspended mentors are listed; demo mentors hidden in production mode; filters; an empty database gives an empty list); mentor-categories.test.ts (disclaimer shown; `paidAllowed` false for financial-literacy); mentor-photos.test.ts (unverified or changed photo is hidden); authenticity-mentor.test.ts (R37 fallback).
- **J11a:** a member applies as a mentor; staff approve in /admin/applications; staff verify a credential; a rejected applicant sees the reason.
- **J11b:** an approved mentor completes /studio/profile and staff approve the profile; the mentor appears in /mentors as Verified; a guest finds them by category and sees the category disclaimer.

**Exit:** MENTOR-A: §21 "mentors can apply and be verified" is VERIFIED COMPLETE through J11a. MENTOR-B: §21 "discover genuine mentors" is VERIFIED COMPLETE through J11b.

**Estimate:** 10 to 15 hours in all (see the split table).

#### P1-LIVE — Live events (LIVE-A and LIVE-B)

**Covers:**
- §6 (all)
- §2: live workshops, workshop submissions
- §3: academy live sessions, workshops, upcoming events
- §4: workshop announcements
- §13: event reminders
- §17: no fake live events
- §18: Live events, Event registrations
- §21 "Events can be created and registered for"

**Requirements (39):** mentors R28, R42; academies R12-R13, R18; community R07, R49; events-opps R00-R27; platform R038, R049-R050, R095.

**Starts after:** LIVE-A after P0; LIVE-B after LIVE-A has merged.

**Split.**

| | LIVE-A: events, registrations, hosts, attendance, feedback | LIVE-B: event lists, series, ICS, calendar, reminders, resources |
|---|---|---|
| Requirements | events-opps R02-R18, R20, R22, R25-R26; mentors R28, R42; community R07; platform R038, R049-R050, R095 (28) | events-opps R00-R01, R19, R21, R23-R24, R27; academies R12-R13, R18; community R49 (11) |
| Core | packages/core/src/live/{events,registrations,hosts,attendance,feedback,meeting,metrics}.ts; live/reminders.ts as a stub (`planReminders(eventId, tx)` that does nothing) | packages/core/src/live/{series,ics,calendar,resources}.ts; the body of live/reminders.ts |
| Pages | apps/web/app/(public)/events/[slug]/** (detail, register, join, feedback); apps/web/app/(app)/studio/events/** with `_cards/events.tsx`; apps/web/app/(app)/admin/events/**; apps/web/components/events/** | apps/web/app/(public)/events/{page.tsx,recordings/**} (list and month view); apps/web/app/(public)/events/[slug]/ics/route.ts; apps/web/app/(app)/calendar/**; apps/web/app/api/calendar/[token]/route.ts |
| Slots and data | settings key events.ts; counters event-registered.ts and event-attended.ts; sweeps/live.ts (ENDED status, feedback window); seed-demo/events.ts | dashboard slot events; academy section events.tsx; the reminder backstop in sweeps/live.ts |
| Harness | journeys/12a-events.mjs, pages/live-a.txt | journeys/12b-event-calendar.mjs, pages/live-b.txt |
| Estimate | 6 to 8.5 hours | 4 to 6 hours |

**LIVE-A builds:**
- **`LiveEventService`:**
  - the lifecycle `createDraft`, `submitForReview`, `approve`, `reject`, `publish`. `createDraft` accepts staff, hosts with `events.host`, and group owners or moderators (`groupCan(…, "createEvent")`). A group-only meetup (`visibility` GROUP) publishes to its group without staff review; anything wider is SUBMITTED for `events.manage`.
  - `reschedule` raises `icsSequence`, notifies registrants (`event.changed`), calls `cancelForSubject({ type: "live_event", id })` and `planReminders`.
  - `cancel` notifies, calls `cancelForSubject({ type: "live_event", id })` and releases holds.
  - `listUpcoming({academy, host, kind, from, to})` through `publicWhere.liveEvent()`; `listPast({withRecording})`; `pendingReview()` for LEARN's submissions queue.
- **`RegistrationService`:** `register` checks capacity under a row lock on the event and puts members on the waitlist when it is full; `cancel` promotes the first waitlisted member and calls `cancelForSubject` for that member only. A category with a `disclaimer` (D6) needs the member's acknowledgement first (`EventRegistration.disclaimerAckAt`).
- **Attendance (D2):** check-in codes, host marks, join-link attendance and member self-confirmation, each with its `AttendanceSource`; a member can dispute a host NO_SHOW on a 1:1.
- **`meeting.ts`:** `joinInfo(viewer, event)` returns the link only to confirmed registrants inside the join window; links are https and never appear in public HTML or in another member's ICS.
- **`feedback.ts`:** one feedback per registration, from attendees only; public display goes through `publicWhere.feedback()`, and the aggregate shows only at or above `MIN_REVIEWS_FOR_RATING`.
- **Notices:** `event.announced` (academy members with `notify` on; also writes the "workshop announced" `ActivityEvent`), `event.registration` and `event.changed`.
- **Admin:** /admin/events, [id] with approval and cancel, [id]/registrations and a CSV export; emails only with `admin.users`.

**LIVE-B builds:**
- **`reminders.ts`:** `planReminders` schedules `event:<eventId>:user:<userId>:s<icsSequence>:T-1440` and `:T-60` through `schedule()` with subject `live_event` and `notAfter` the event start, for every confirmed registration, under the topic `event.reminder`, or `mentoring.reminder` for a one-to-one booking. The daily sweep re-plans any registration missing its rows.
- **`ics.ts`:** VEVENT with UID, UTC times, SEQUENCE from `icsSequence`, and VALARM. **`calendar.ts`:** `calendarFeedFor(userId)` covers events the member attends and hosts, so it also covers 1:1 bookings; the feed URL uses a revocable token.
- **`series.ts`:** explicit occurrences for weekly series. **`resources.ts`:** https resources and recordings, shown to registrants (or publicly when the host marks them public).
- **Pages:** the /events list and month view with academy, host and kind filters; /events/recordings; the transparent upcoming-schedule copy from settings when nothing is scheduled (R27); /calendar.

**Reads:** Academy, Instructor and MentorProfile (hosts), MentorCategory, User.

**Routes:** /events, /events/[slug], /events/[slug]/ics, /events/recordings, /calendar, /api/calendar/[token], /studio/events.

**Admin:** /admin/events, /admin/events/[id], /admin/events/[id]/registrations.

**Tests:**
- LIVE-A: live-events.test.ts (20 parallel registrations for 10 seats give exactly 10 REGISTERED and 10 WAITLISTED; cancelling promotes the next member; a reschedule and a cancel clear PENDING reminder rows through `cancelForSubject`; a group-only meetup skips review and a public event does not; drafts are not public; demo events hidden in production mode; the disclaimer acknowledgement is required); meeting.test.ts (no link before the window or to non-registrants; https only); event-feedback.test.ts (attendees only; one per registration; the D2 rules); authenticity-live.test.ts (an empty database never shows an invented event).
- LIVE-B: ics.test.ts (UTC, DST, SEQUENCE, escaping); reminders.test.ts (keys, `notAfter`, re-planning after a reschedule, the backstop); calendar-feed.test.ts (hosted and attended events; a revoked token fails).
- **J12a:** staff publish a workshop; a host drafts and submits an event and staff approve it; a member registers on /events/[slug]; when capacity is full the next member joins the waitlist; the host marks attendance and the member leaves feedback; a guest never sees the meeting link.
- **J12b:** a guest filters /events by academy and sees the month view; a registered member sees the event in /calendar, downloads the ICS and sees the resources; the academy page lists its upcoming events.

**Exit:** LIVE-A: §21 "Events can be created and registered for" is VERIFIED COMPLETE through J12a. LIVE-B: J12b passes; its rows are VERIFIED COMPLETE.

**Estimate:** 10 to 14.5 hours in all (see the split table).

#### P2-LEARN — Learning pipeline, paths and instructor studio

**Covers:**
- §12: course submissions, learning resources, content review, admin approval, performance analytics, instructors managing approved courses and seeing permitted progress
- §2: available programmes, mentor-led programmes
- §3: learning paths
- §8: learning milestones
- §13: course updates, assignment feedback
- §1: social learning
- §18: Courses, Instructors, Creator accounts
- §21 "Instructors can publish approved content"

**Requirements (17):** mentors R11, R34, R41, R43, R46-R49; academies R11, R40; community R50-R51; platform R005, R047-R048, R057, R090.

**Starts after:** MENTOR-A and MENTOR-B (contributor accounts and the studio) and ACAD (academies and the course academy picker).

**Owns:**
- **packages/core/src/lms/** (lms.ts after P0, authoring.ts after ACAD):**
  - `submissions.ts`: DRAFT → SUBMITTED → CHANGES_REQUESTED → APPROVED → PUBLISHED. Only `courses.publish` approves, as DR-34 left it.
  - `revisions.ts` (O35): an outside author's edit to a published course is a `COURSE_UPDATE` revision. It goes live only when an administrator approves it, because DR-34 says a published or archived programme changes only through an administrator. `Instructor.trustedAuthor` stays in the schema and is never read; no author publishes directly.
  - `assignments.ts`: submissions on ASSIGNMENT lessons, instructor feedback, and the `learning.feedback` notice.
  - `progress-sharing.ts`: `instructorLearners(instructor, courseId)` lists only learners who consented. Below `MIN_COUNT_FOR_AGGREGATE` it returns aggregates only, and it never returns emails.
  - `access.ts`: `canReadLesson` and `readableLessonIds`, also used by GUIDE. A paid course cannot be read without a paid order.
  - learner.ts emits MODULE_COMPLETED and CERTIFICATE_ISSUED. Enrolment already calls `academies.ensureFromEnrolment` (P0).
- **packages/core/src/contributors/{submissions,analytics,cohorts}.ts:**
  - `analytics.forInstructor`: enrolments, completion, pass rates and ratings, all aggregate and suppressed below the threshold
  - instructor-led cohorts that link `LiveEvent`s for live classes (through LIVE-A's service)
- **packages/core/src/academies/paths.ts:** `LearningPathService` with ordered steps (courses, events, challenges), progress, PATH_COMPLETED, and the `learning.path` notice.
- **Studio:** apps/web/app/(app)/studio/{courses,resources,assignments,analytics}/** and their cards.
- **Admin:**
  - apps/web/app/(app)/admin/submissions/**: one queue for course submissions, course updates, resources and workshop submissions (through LIVE-A's `pendingReview()`)
  - apps/web/app/(app)/admin/courses/** (existing; the academy picker stays as ACAD built it)
  - apps/web/app/(app)/admin/contributors/**: instructor and creator accounts, suspension, linked user. Linking an instructor to a user uses DR-34's `authoring.linkInstructorUser` at /admin/courses/instructors.
  - apps/web/app/(app)/admin/academies/[id]/paths/**
- **Pages and sections:**
  - apps/web/app/(public)/academies/[slug]/paths/** and `_sections/paths.tsx`
  - apps/web/app/(app)/courses/[slug]/** (mentors for this programme, cohort, assignments)
  - apps/web/app/(public)/programs/[slug]/page.tsx (instructor links to the expert profile)
  - expert section programmes.tsx
- **Counters:** module-completed, certificate-issued, path-completed.
- **Notices:** `learning.course_update` to enrolled learners, grouped by course; `learning.progress` for milestones.
- **Refund hook:** one hook in packages/core/src/shop/refunds.ts revokes a refunded course order's enrolment (TYCOONHOOD_STATE §6). MONEY owns the file after LEARN merges.
- **Harness:** journeys/14-instructor-content.mjs, pages/learn.txt.

**Reads:** Instructor, ContributorApplication (account state), Academy, LiveEvent (through LIVE-A), MentorProfile (through MENTOR-B's directory).

**Routes:** /studio/courses, /studio/resources, /studio/assignments, /studio/analytics, /academies/[slug]/paths, /courses/[slug].

**Admin:** /admin/submissions, /admin/courses, /admin/contributors, /admin/academies/[id]/paths.

**Tests:**
- submissions.test.ts: only `courses.publish` approves; an outside author cannot publish directly.
- revisions.test.ts: a published course changes only when an administrator approves a revision; a non-admin approver is refused; `trustedAuthor` changes nothing.
- progress-sharing.test.ts: consent, suppression below the threshold, no emails.
- paths.test.ts, assignments.test.ts, lms-access.test.ts, refund-revokes-enrolment.test.ts.
- course-ownership.test.ts (DR-34) still passes.
- **J14:**
  1. An outside instructor drafts a course in /studio/courses and submits it.
  2. Staff request changes; the instructor resubmits; staff approve and publish.
  3. The course appears in its academy.
  4. The instructor submits an update to the published course, and it goes live only after an administrator approves it.
  5. A learner completes a module and submits an assignment; the instructor gives feedback, and the learner is notified.
  6. The instructor sees consented progress and aggregate analytics.

**Exit:** §21 "Instructors can publish approved content" is VERIFIED COMPLETE.

**Estimate:** 10 to 13 hours.

#### P2-BOOK — Mentor bookings

**Covers:**
- §2: upcoming bookings, availability, reviews, mentorship history, scheduling, booking management, calendar availability, 1:1, group mentoring, reminders, reviews and feedback, discover-and-book
- §18: Mentor bookings
- §21 "Members can book available sessions"

**Requirements (14):** mentors R12-R13, R15-R16, R23-R27, R29-R30, R33; platform R045, R089.

**Starts after:** MENTOR-A, MENTOR-B and LIVE-A. Reminders for bookings arrive when LIVE-B merges; BOOK does not wait for it.

**Owns:**
- **packages/core/src/mentors/{offerings,availability,booking,mentoring,reviews,history}.ts:**
  - **`OfferingService`:** `MentorOffering` rows of the one-to-one or a group `EventKind`, with duration, capacity, academy and `categoryId` (one of the mentor's own categories). Only an approved mentor (`mentorApproved`) can activate an offering. The price stays empty until MONEY, and an offering in a category with `paidAllowed` false can never carry a price (D6).
  - **`AvailabilityService`:** `MentorAvailabilityRule` (weekly, in the mentor's zone) and `MentorAvailabilityException`, with `bufferMinutes`, `minNoticeHours`, `horizonDays` and `maxSessionsPerDay`. `slotsFor(offeringId, viewerZone, range)` uses zoned.ts.
  - **`BookingService`:**
    - `book(userId, offeringId, slotStart)`: one transaction that locks the mentor row, re-checks the slot, and creates the one-to-one or group `LiveEvent`, its `LiveEventHost` and the `EventRegistration`. The exclusion constraint of migration 000800 is the last guard against a double booking. A one-to-one booking records an 18+ self-attestation with a timestamp (O8), and a category disclaimer is acknowledged first (`disclaimerAckAt`).
    - **Booking mode.** `MentorProfile.bookingMode` is INSTANT by default: the booking is REGISTERED at once. In REQUEST mode the registration is REQUESTED and holds the slot until the mentor accepts or declines it (`decidedAt`), or until `holdExpiresAt = min(slot start − minNoticeHours, now + 48 hours)`. A member has at most 3 open requests. The mentor is told through `mentoring.request` (essential), the member through `mentoring.booking`. sweeps/mentoring.ts expires lapsed requests and releases their slots.
    - `cancel` and `reschedule`: a free booking can be cancelled until the start. A cancellation inside `MentorProfile.cancellationHours` is recorded as late; with no value set there is no late window. Refunds never follow this field (MONEY uses the agreement's `refundWindowHours`). Both call `cancelForSubject({ type: "live_event", id })` for the member.
  - **`MentoringService`** (mentoring.ts): attendance through LIVE-A, the host reply (`EventFeedback.hostReply`), and MENTORING_BOOKED and MENTORING_COMPLETED.
  - **`ReviewService`:** wraps LIVE-A's feedback, adds the mentor reply and review reports, and shows reviews through `publicWhere.feedback()`. Hiding a review needs `mentors.manage` and is audited; the mentor cannot hide one.
  - **`history.ts`:** counts are thresholded; a member sees their own history.
- **Pages:**
  - apps/web/app/(app)/bookings/**: /bookings, /bookings/[id] (join, cancel, reschedule, feedback, dispute a NO_SHOW), and /bookings/book/[offeringId]. The ICS comes from LIVE-B's /events/[slug]/ics.
  - apps/web/app/(app)/studio/{offerings,availability,bookings,reviews}/** and their cards, including the request inbox (accept or decline).
- **Admin:** admin mentors `_tabs/{bookings,reviews}.tsx`. Staff can cancel with a reason, and decide attendance disputes (D2).
- **Profile sections:** offerings, availability, upcoming, reviews, history.
- **Counters, slots and keys:** counter mentoring-completed; dashboard slot bookings; settings key mentoring.ts (default notice, horizon, review threshold, the 18+ switch); the request-expiry part of sweeps/mentoring.ts (MENTOR-B wrote the photo recheck there).
- **Demo data:** seed-demo/offerings.ts.
- **Harness:** journeys/13-mentor-booking.mjs, pages/book.txt.

**Reads:** MentorProfile, MentorCategory, LiveEvent and EventRegistration (through LIVE-A's services), Profile time zone.

**Routes:** /bookings, /bookings/[id], /bookings/book/[offeringId], /studio/offerings, /studio/availability, /studio/bookings, /studio/reviews.

**Admin:** /admin/mentors Bookings and Reviews tabs.

**Tests:**
- availability.test.ts: DST in the mentor zone against the member zone, buffers, notice, horizon, exceptions.
- booking.test.ts: 10 parallel bookings for one slot give exactly one booking; the exclusion constraint rejects overlaps; a cancelled booking frees the slot; an unapproved or demo mentor cannot be booked in production mode; the attestation and disclaimer acknowledgement are stored; a late cancellation is marked late only when `cancellationHours` is set.
- booking-requests.test.ts: a request holds the slot; accept registers, decline frees it; the hold expires at the computed time; a fourth open request is refused; `mentoring.request` reaches the mentor even with notices turned down.
- offerings.test.ts: only an approved mentor activates an offering; the offering's category must be one of the mentor's; a `paidAllowed` false category refuses a price.
- mentor-reviews.test.ts: attendees only, one review per booking, the mentor cannot hide reviews, the D2 dispute path.
- **J13:**
  1. A member finds a mentor and picks a slot shown in their own zone.
  2. They book a free slot (INSTANT), and both people see it in /bookings and /calendar.
  3. A second member cannot take the same slot.
  4. A REQUEST-mode mentor accepts one request and declines another.
  5. The mentor marks the member attended; the member reviews; the review shows on the profile.

**Exit:** §21 "Members can book available sessions" is VERIFIED COMPLETE for free bookings. Paid bookings belong to MONEY.

**Estimate:** 11 to 15 hours.

#### P2-DAILY — Missions, challenges, goals and streaks (DAILY-A and DAILY-B)

**Covers:**
- §5: daily and weekly missions, monthly challenges, personal goals, academy and group challenges, streaks, progress, XP, achievement unlocks, non-identical tasks, admin mission management, clear criteria and rewards
- §3: academy challenges
- §13: challenge reminders
- §18: Daily missions, Weekly challenges
- §21 "Daily missions work" and "Challenges work"

**Requirements (20):** academies R14; community R52; daily R09, R12-R21, R23-R25; platform R053-R054, R093-R094.

**Starts after:** P0, both halves at once; they may start during P1 when slots are free.

**Split.**

| | DAILY-A: rules, rewards, missions | DAILY-B: challenges, evidence, goals |
|---|---|---|
| Requirements | daily R09, R12-R13, R18-R21, R23-R25; platform R053, R093 (12) | daily R14-R17; academies R14; community R52; platform R054, R094 (8) |
| Core | packages/core/src/rules/** except counters/index.ts and other units' counter files; packages/core/src/rewards/**; packages/core/src/missions/{board,authoring,practice}.ts; packages/core/src/standard/standard.ts; gamification/streaks.ts; the retirement of gamification/achievements.ts | packages/core/src/gamification/challenges.ts; packages/core/src/engagement/evidence.ts; packages/core/src/goals/** |
| Pages | apps/web/app/(app)/missions/**; the missions link on (app)/achievements | apps/web/app/(app)/challenges/** except `_sections/leaderboard.tsx`; apps/web/app/(app)/goals/** |
| Admin | apps/web/app/(app)/admin/{missions,standard}/**; apps/web/components/admin/criteria-builder.tsx | apps/web/app/(app)/admin/{challenges,evidence}/** |
| Slots and data | the existing counters and practice; settings key engagement.ts; sweeps/engagement.ts | goal and challenge counters; sweeps/challenges.ts; academy section challenges.tsx; migration 000900 |
| Harness | journeys/15a-missions.mjs, pages/daily-a.txt | journeys/15b-challenges-goals.mjs, pages/daily-b.txt |
| Estimate | 6 to 8 hours | 6 to 8.5 hours |

**DAILY-A builds:**
- **Rules:** month windows and occurrence keys per period, eligibility by academy, interest and level, and a counter that returns `null` never pays. `repeatBucket` and `missionCadence` keep their meaning.
- **Rewards:** day keys move to `memberDayKey`, which fixes the daily reward lost to the 20-hour cooldown; reward limits come from the engagement setting; rewards are idempotent by occurrence (`MissionCompletion.occurrence`, made NOT NULL by 000400).
- **Cooldowns:** a mission's `cooldownHours` of 24 or less is replaced by the day or week bucket; a value above 24 hours is honoured as a minimum gap between two completions.
- **Board:** `missions/board.ts` builds a personal board from academies, interests, level and recency. It is deterministic per member-day, and a member with no signals gets an honest general board.
- **Authoring:** `missions/authoring.ts` validates instructions, criteria and rewards within limits. An "Import starter library (drafts)" action in /admin/missions loads the starter set as drafts (N2).
- **Practice and standard:** capped self-reported practice and PRACTICE_LOGGED (standard.ts, audited).
- **Legacy:** route the callers of gamification/achievements.ts to the data-driven path, and delete the file only when no caller remains.

**DAILY-B builds:**
- **Challenges:** emit CHALLENGE_COMPLETED, which nothing emits today; group-scoped and academy-scoped challenges. Staff create any challenge; a group owner or moderator creates a group challenge (`groupCan(…, "createChallenge")`), which carries no THC reward and XP only within the engagement limits.
- **Evidence:** challenge evidence moves from the race-prone JSON write to `EvidenceSubmission` rows with row-locked updates. Migration `20261113000900_challenge_evidence_move` moves the existing rows. DAILY-B tests against a stream database rebuilt with that folder added (`create-stream-db.mjs daily-b --recreate --extra-migration docs/ecosystem/pending-migrations/20261113000900_challenge_evidence_move`), and the lead moves the folder into packages/db/prisma/migrations in DAILY-B's merge.
- **Goals:** `GoalService` with create, check in, achieve (GOAL_ACHIEVED) and abandon; private by default; an optional weekly reminder through `schedule()` under `goal:<goalId>:<memberWeekKey>` with `notAfter` the week's end.
- **Reminders:** sweeps/challenges.ts closes ended challenges and schedules `challenge.reminder` one day before the end for joined members who have not finished (`challenge:<challengeId>:user:<userId>:T-1d`, `notAfter` the end); members can opt out.

**Reads:** academy memberships (ACAD), lesson progress, XP rows, profile interests.

**Routes:** /missions, /goals, /challenges.

**Admin:** /admin/missions, /admin/challenges, /admin/evidence, /admin/standard.

**Tests:**
- DAILY-A: rules-engine.test.ts (extended: month windows, occurrence keys, eligibility, a null counter never pays); rewards-zones.test.ts (no lost daily reward across zones; limits apply); mission-cooldown.test.ts (a cooldown above 24 hours is a minimum gap); mission-board.test.ts (different academies give different boards; the same board all day; an honest general board); mission-authoring.test.ts.
- DAILY-B: challenges.test.ts (CHALLENGE_COMPLETED fires once; concurrent evidence writes are safe; a group challenge pays no THC); evidence-migration.test.ts (the 000900 move keeps every row); goals.test.ts.
- **J15a:** staff import the starter drafts, then edit and publish a daily mission; a Warrior member sees their personal board; completing a lesson completes the mission and the XP is paid once.
- **J15b:** staff publish a monthly Warrior Academy challenge; the member joins, submits evidence, and staff approve it; completion and the achievement follow; the member sets a goal and checks in.

**Exit:** DAILY-A: §21 "Daily missions work" is VERIFIED COMPLETE through J15a. DAILY-B: §21 "Challenges work" is VERIFIED COMPLETE through J15b.

**Estimate:** 12 to 16.5 hours in all (see the split table).

#### P2-EDIT — Editorial engine and founder presence (EDIT-A and EDIT-B)

**Covers:**
- §14 (all), §15 (all)
- §17: no fabricated student reviews or stories
- §18: Articles, Editorial calendar
- the §10 founder introduction, used by HOME

**Requirements (37):** content R33-R66; platform R035, R058-R059.

**Starts after:** P0, both halves at once. EDIT-A fills the expert section writing.tsx only after MENTOR-B has merged (MENTOR-B creates it).

**Split.**

| | EDIT-A: post workflow, revisions, calendar | EDIT-B: help, search, about, stories, founder text |
|---|---|---|
| Requirements | content R33-R49, R51-R52; platform R058-R059 (21) | content R50, R53-R66; platform R035 (16) |
| Core | packages/core/src/content/{editorial,taxonomy,bylines}.ts | packages/core/src/content/{search,help}.ts; packages/core/src/platform/founder.ts; the stories part of packages/core/src/platform/cms.ts |
| Pages | apps/web/app/(public)/{blog,updates}/**; apps/web/app/(app)/studio/writing/** with its card; expert section writing.tsx | apps/web/app/(public)/{about,success-stories,faq,search}/** |
| Admin | apps/web/app/(app)/admin/content/** (hub, editor with revisions and preview, review queue, calendar, taxonomy) | apps/web/app/(app)/admin/site/{founder,stories}/** |
| Slots and data | sweeps/editorial.ts; seed-demo/posts.ts | settings key founder.ts |
| Harness | journeys/16a-editorial.mjs, pages/edit-a.txt | journeys/16b-founder-help.mjs, pages/edit-b.txt |
| Estimate | 5 to 6.5 hours | 4 to 5.5 hours |

**EDIT-A builds:**
- **Post workflow:** DRAFT → IN_REVIEW → SCHEDULED → PUBLISHED → ARCHIVED, with `PostRevision`, by `content.write` and `content.publish`.
- **Kinds:** every §14 type in `PostKind`: ARTICLE, LEARNING_INSIGHT, FOUNDER_NOTE, EXPERT_CONTRIBUTION, ACADEMY_UPDATE, SUCCESS_STORY, BUSINESS_GUIDE, WELLNESS_RESOURCE, INTERVIEW, EVENT_RECAP, ANNOUNCEMENT, PLATFORM_UPDATE. A FOUNDER_NOTE post, or an announcement signed by the founder, publishes only with the founder's recorded approval (`founderApprovedAt`, audited as `post.founder_approve`).
- **Scheduling:** a post is live when it is SCHEDULED or PUBLISHED and `publishedAt <= now`, so a scheduled post appears on time without any job; sweeps/editorial.ts only tidies SCHEDULED to PUBLISHED and sends `editorial.post` to followers.
- **Every public loader uses `publicWhere.post()`.** Today scheduled posts leak because loaders only check that `publishedAt` is not null.
- Featured content, `PostCategory`, `Tag` and `PostTag`. Bylines point to an Instructor or a staff user; the author page is the expert profile (N1).

**EDIT-B builds:**
- **Founder text:** `founder.note` (data-model e.3). Saving clears the approval; approving needs `admin.content` and is audited (`founder.note.approve`); Home, Today and /updates render the text only while it is approved. /admin/site/founder holds the editor and the approval.
- **Stories:** the consent chain (who consented, when, `consentSource`, the reference, and withdrawal) and testimonial provenance. No story publishes without consent, and withdrawing consent unpublishes it (`publicWhere.testimonial()`).
- **Help and search:** help articles, and Postgres full-text search over posts and help (the `searchVector` columns).
- **About:** /about keeps today's copy, with the founder's approved note when there is one.

**Reads:** Instructor (bylines), Academy, LiveEvent (recap links).

**Routes:** /blog, /blog/[slug], /updates, /about, /success-stories, /faq, /search, /studio/writing.

**Admin:** /admin/content, /admin/content/calendar, /admin/content/review, /admin/content/taxonomy, /admin/site/founder, /admin/site/stories.

**Requests to the lead:** the sitemap switches to `publicWhere.post()`; the /updates and /search nav entries.

**Tests:**
- EDIT-A: editorial.test.ts (transitions by permission; a scheduled post stays invisible until due; every loader uses `publicWhere.post()`; revisions; founder approval for FOUNDER_NOTE); bylines.test.ts.
- EDIT-B: founder.test.ts (saving clears the approval; an unapproved note never renders; only `admin.content` approves; the audit row); stories-consent.test.ts; content-search.test.ts.
- **J16a:** a contributor submits an article from /studio/writing; an editor reviews it and schedules it two minutes ahead; it appears on /blog, /updates, its category and tag pages when due; the calendar shows it.
- **J16b:** staff save and approve the founder note, and it shows on /updates; a story without consent cannot be published; search finds the article and a help page.

**Exit:** §14 and §15 are delivered; EDIT-A feeds §21 "Administrators can manage all these systems" (Articles, Editorial calendar). The About copy stays IMPLEMENTED BUT UNVERIFIED until Harsha reviews it.

**Estimate:** 9 to 12 hours in all (see the split table).

#### P3-TODAY — Daily plan and member dashboard

**Covers:**
- §11 (all)
- §5: dashboard examples and personalization
- §21 "The dashboard surfaces relevant activity"

**Requirements (42):** daily R00-R08, R10-R11, R22, R26-R54; platform R099.

**Starts after:** DAILY-A, DAILY-B and ACAD. LIVE-A, MENTOR-B, BOOK, LEARN and EDIT have usually merged by then; slots that are still empty hide their sections.

**Owns:**
- **packages/core/src/plan/**:** `DailyPlanService.forMember(userId, dayKey)` assembles the "Today at Tycoonhood" items:
  - the next lesson or recommended lesson
  - the member's missions (DAILY-A's board)
  - upcoming events and the next mentor booking (slots)
  - one relevant discussion, chosen with `publicWhere.post()` and the member's academies
  - a new course or path in the member's academies
  - the founder's note, only while it is approved (EDIT-B)

  Each item says why it is there. The plan is stable for the member-day (`memberDayKey`) and capped in size (R53, R54).
- **packages/core/src/dashboard/**, except slots:** `loadDashboard(userId)` with these sections:
  - **Welcome back:** greeting, rank, current goals, progress summary.
  - **Your journey:** active academies, current programmes, continue learning, skills (slot).
  - **Today:** the plan.
  - **Your people:** mentors (slot), group activity (slot), new discussions, community updates.
  - **Your opportunities:** opportunities and applications (slots), affiliate activity, challenges.
  - **Your achievements:** XP, level, badges (slot), streak, certificates.

  When everything is empty, the dashboard shows one honest next step.
- **packages/core/src/personalization/signals.ts:** `signalsFor(userId)` uses academies, interests, focus, activity and progress. It never uses protected attributes.
- **Pages and settings:**
  - apps/web/app/(app)/today/**, including the existing page.tsx and dashboard.ts
  - apps/web/components/today/**
  - apps/web/app/(app)/settings/focus/** (`updateFocus`: focus academies and interests, plan size)
- **Onboarding (P3 only):** the interest list in apps/web/app/onboarding/** gains "Technology and AI" and "Local networking", for GROUPS.
- **Harness:** journeys/17-today.mjs, pages/today.txt.

**Reads:** every dashboard slot; `academies`; DAILY-A's board; LEARN progress; goals (DAILY-B); XP and streak rows.

**Routes:** /today, /settings/focus.

**Admin:** none. The plan's limits live in the engagement setting, which DAILY-A owns; TODAY requests any change there.

**Tests:**
- daily-plan.test.ts: different academies give different plans; the plan is stable for the day across a time-zone change (the cutover rule); caps hold; an empty member gets one next step; no demo items in production mode.
- dashboard.test.ts: each section hides on `null`; a query budget for the /today loader, measured with a Prisma query counter.
- signals.test.ts.
- **J17:**
  1. A new member chooses academies and interests at onboarding and lands on /today with a next step.
  2. After registering for an event and booking a mentor, both appear.
  3. Completing a mission updates the page.
  4. The 390-pixel layout is checked.

**Exit:** J17 passes. TODAY's §21 line, "The dashboard surfaces relevant activity", is reported IMPLEMENTED BUT UNVERIFIED when TODAY merges, because the opportunity, skill, badge and group slots fill only in P3 and P4. INT verifies it with J31 once every slot is filled, and only then reports it VERIFIED COMPLETE.

**Estimate:** 8 to 11 hours.

#### P3-SOCIAL — Community feed, follows, directory and moderation

**Covers:**
- §4: activity feed items, posts, updates, questions, comments, reactions, follow, save, report, academy spaces, member directory and its fields
- §13: community replies
- §18: Community moderation
- §1: entrepreneurial community
- §21 "Members can participate in real discussions"

**Requirements (31):** academies R15; community R00-R06, R09-R13, R15-R20, R35-R39, R41-R42, R44, R54; platform R002, R052, R091.

**Starts after:** P0.

**Owns:**
- **packages/core/src/activity/feed.ts and packages/core/src/community/{follows,directory,saves}.ts:**
  - **feed** (data-model e.6): reads `ActivityEvent`, applying privacy facets, follows, blocks, mutes and academy scope. It covers course completions, introductions, challenge participation, achievements, mentor and workshop announcements, project showcases, discussion highlights and community milestones. Milestones come only from real counts at or above the thresholds.
  - **directory:** `profileView(viewer, member)` is the one projection used by /u, the directory and author chips, through `canView`. The directory is members-only, a member can leave it (the `directory` facet), and it never shows contact details. Interests and goals appear, and can be filtered on, only for members who turned those opt-in facets on.
- **packages/core/src/community/community.ts (chat):** academy channels. (P0b and P0d changed this file in P0; SOCIAL owns it afterwards.)
- **packages/core/src/discussions/{posts,reports,moderation}.ts:**
  - post kinds DISCUSSION, INTRODUCTION, UPDATE, QUESTION, PROJECT and ANNOUNCEMENT through the frozen `createPost({kind})`
  - replies, `editedAt`, and accepted answers
  - highlights, which need the author's consent before public featuring
  - announcement fan-out to academy members with `notify` on
  - one report queue over `ContentReport`, with `resolvedById` and audit rows
  - group-moderator checks through `groupCan`
  - additions GROUPS or other units request, applied through the lead
- **Pages:**
  - apps/web/app/(app)/community/{page.tsx (feed), [channel], members, saved, discussions, academies/[academy]}/**
  - apps/web/app/(public)/u/**, until SKILLS takes it over in P4
- **Admin:** apps/web/app/(app)/admin/moderation/**; apps/web/app/(app)/admin/community/** except groups; the member panels reports.tsx and follows.tsx.
- **Studio:** apps/web/app/(app)/studio/announcements/** with its card (mentor announcements to followers and academy members).
- **Sweeps, sections and notices:** sweeps/community.ts (milestones); the academy section discussions.tsx; settings key community.ts; `community.reply` (replies, and mentions inside replies), `community.reaction` (grouped under `reaction:<postId>`), `community.follow` and `community.following_post`, all through `notify`.
- **Demo data:** seed-demo/community.ts.
- **Harness:** journeys/18-community.mjs, pages/social.txt.

**Reads:** ActivityEvent, Profile, privacy facets, AcademyMembership, Follow.

**Routes:** /community, /community/[channel], /community/discussions/**, /community/members, /community/saved, /community/academies/[academy], /u/[username], /studio/announcements.

**Admin:** /admin/moderation, /admin/community.

**Tests:**
- community-feed.test.ts: a member who hides achievements never appears in achievement items; blocks and mutes apply; demo rows are excluded in production mode; milestones come only from real counts.
- follows.test.ts.
- directory.test.ts: members only; opting out works; no email or phone; suspended members are hidden; interests and goals show and filter only for members who turned those facets on, and a filter never reveals a member whose facet is off.
- posts-kinds.test.ts: only the asker or a moderator can accept an answer; `editedAt` is set; highlight consent is required.
- reports-unified.test.ts: every target type, `resolvedById`, audit rows.
- **J18:**
  1. A member posts an introduction and a question.
  2. Another member replies, and a notification arrives.
  3. The asker accepts the answer.
  4. The member follows someone, and the feed shows the followed member's course completion.
  5. The member saves a post, then reports one; a moderator resolves the report in /admin/moderation.
  6. The directory shows only members who stayed in it, without contact details, and filters by an interest only among members who share interests.

**Exit:** §21 "Members can participate in real discussions" is VERIFIED COMPLETE, with the existing J6.

**Estimate:** 10 to 13 hours.

#### P3-GROUPS — Community groups

**Covers:**
- §4 Community Groups: business interests, fitness, learning programmes, entrepreneurship, personal development, technology, local networking; owners, moderators, membership, posts, events, challenges, announcements
- the group-challenge user interface for §5
- §18: Community groups
- §21 "Groups function properly"

**Requirements (16):** community R21-R34; platform R051, R092.

**Starts after:** LIVE-A and DAILY-B, for group events and group challenges. It posts through SOCIAL's frozen `createPost({kind})` and asks SOCIAL, through the lead, for anything more in posts.ts.

**Owns:**
- **packages/core/src/discussions/groups.ts:**
  - **Categories:** these include Technology and Local networking. Local networking uses a member-entered city or region, coarse and opt-in (the `location` facet); it never stores an exact location, and a member can filter groups by it.
  - **Roles:** OWNER, MODERATOR and MEMBER, checked with `groupCan`.
  - **Membership:** join, leave, request and approve for private groups; invitations (`GroupMemberStatus.INVITED`, `invitedById`), which the invited member accepts or declines; ownership transfer; archive.
  - **Group creation** follows the settings key groups.ts, which GROUPS owns (O32): by default members request a group and staff approve it.
  - **Announcements:** posted with `createPost({kind: "ANNOUNCEMENT"})` after `groupCan(…, "announce")`, and sent through `community.group` by each member's group notify level (all, announcements only, or none).
  - **Group events** are `LiveEvent`s with a group, created through LIVE-A's service (`groupCan(…, "createEvent")`; a group-only meetup needs no staff review).
  - **Group challenges** are created through DAILY-B's service (`groupCan(…, "createChallenge")`; no THC reward).
- **Pages and admin:**
  - apps/web/app/(app)/community/groups/**: the directory (with category and location filters) and [slug], with tabs for Posts, Announcements, Events, Challenges and Members, plus settings and invitations
  - apps/web/app/(app)/admin/community/groups/**
- **Slots, counters and keys:** dashboard slot group-activity; counter group-joined; settings key groups.ts.
- **Demo data:** seed-demo/groups.ts.
- **Harness:** journeys/19-groups.mjs, pages/groups.txt.

**Reads:** CommunityPost (through posts.ts), LiveEvent and Challenge (through their services), Profile.

**Routes:** /community/groups, /community/groups/[slug] (and its tabs), /community/groups/[slug]/settings.

**Admin:** /admin/community/groups.

**Tests:**
- groups.test.ts:
  - the role table, including createEvent and createChallenge
  - private join requests; invitations (only an owner or moderator invites; the invited member accepts or declines; an invitation to a suspended member is refused)
  - ownership transfer; archived groups are read-only
  - announcement permission and delivery by level
  - group events are visible only to members unless made public
  - group challenge progress, with no THC paid
  - member counts are thresholded
  - location: the field is opt-in and coarse (`Profile.city` and `region` as text, never coordinates), the group filter matches it, and a member whose `location` facet is off never appears in a location filter
- **J19:**
  1. A member requests a Technology group, and staff approve it.
  2. The owner invites a member, who accepts; another member joins; the owner promotes a moderator.
  3. The moderator posts an announcement, and members are notified by level.
  4. The owner creates a meetup and a group challenge; a member registers and joins.
  5. A moderator removes a post.
  6. Staff archive the group.

**Exit:** §21 "Groups function properly" is VERIFIED COMPLETE.

**Estimate:** 7.5 to 10.5 hours.

#### P3-NOTIFY — Notification centre

**Covers:**
- §13: the centre, preferences, in-app first, email and push integration points, avoiding spam, platform announcements
- §18: Notifications
- §21 "Notifications work"

**Requirements (8):** community R47, R58-R62; platform R060, R098.

**Starts after:** P0. P0d built the gateway, topics, preferences, the outbox and the ports (data-model e.5, "who builds what"). NOTIFY builds what members and staff see on top of them.

**Owns:**
- **packages/core/src/platform/notification-centre.ts:** `list`, `unreadCount`, `markSeen`, `markRead`, `markAllRead`, `archive`; expired rows are left out.
- **packages/core/src/platform/notification-delivery.ts** (from P0d, signatures frozen): the designed email templates per topic, replacing P0d's plain-text `renderEmail`, with a List-Unsubscribe header.
- **packages/core/src/platform/scheduled.ts** (from P0d, signatures frozen): the digest deferral step in `dispatchDue` (digestible topics wait when `emailDigest` is DAILY or WEEKLY).
- **packages/core/src/platform/digests.ts:** the daily or weekly digest at `digestHour` in the member's zone, under `digest:<userId>:<memberDayKey or memberWeekKey>`.
- **packages/core/src/platform/announcements.ts:** `Announcement` audiences (all, academy, role), scheduling, expiry, retraction, and banner or inbox placement, sent through `notifyMany` under `platform.announcement`. The staff broadcast in cms.ts became an `Announcement` in P0d.
- **Pages and APIs:**
  - apps/web/app/(app)/notifications/**, including open/[id], which marks the notification read and redirects through `notificationLink`
  - apps/web/app/(app)/settings/notifications/** (a topic-by-channel matrix from `preferencesFor`; essential topics are locked on; quiet hours, digest and pause)
  - apps/web/app/(public)/unsubscribe/** (`/unsubscribe?t=<token>&topic=<topic or all>`, through `unsubscribeByToken`): one topic, or every non-essential topic at once
  - apps/web/app/api/notifications/count/route.ts
  - apps/web/app/api/push/subscribe/route.ts, which answers 503 "push not configured" without keys
- **Admin:** apps/web/app/(app)/admin/announcements/** (composer, audience, schedule, retract) and apps/web/app/(app)/admin/notifications/** (delivery aggregates and failures, topic labels and silencing through `NotificationTopic`). The /admin/site/announcements form is removed.
- **Sweeps:** sweeps/notifications.ts (digests, and retention of read notifications for 180 days and unread for 365, pending legal review).
- **Harness:** journeys/20-notifications.mjs, pages/notify.txt.

**Reads:** Notification, NotificationPreference, NotificationSettings, Profile time zone, AcademyMembership.

**Routes:** /notifications, /notifications/open/[id], /settings/notifications, /unsubscribe.

**Admin:** /admin/announcements, /admin/notifications.

**Tests:**
- notification-centre.test.ts.
- email-templates.test.ts: every topic renders; the unsubscribe link carries the topic.
- digests.test.ts: quiet hours by zone; one digest a day; deferred rows send in the digest and never twice.
- unsubscribe.test.ts: one topic; "all" turns off every non-essential topic; essential topics stay on; a bad token fails.
- announcements.test.ts: audience, expiry, retraction.
- **J20:**
  1. A reply notification raises the badge.
  2. Opening it through /notifications/open marks it read.
  3. With email for replies turned off, the next reply arrives in-app only.
  4. An academy announcement reaches only that academy's members.
  5. The unsubscribe link turns off one topic.
  6. The push control says it is not available yet.

**Exit:** §21 "Notifications work" is VERIFIED COMPLETE for in-app notifications. Email delivery stays IMPLEMENTED BUT UNVERIFIED until Resend is set up (B2), and push stays BLOCKED (B5).

**Estimate:** 7 to 10 hours.

#### P4-OPPS — Opportunity marketplace and partners (OPPS-A and OPPS-B)

**Covers:**
- §7 (all)
- §13: opportunity updates, application status
- §1: opportunity marketplace
- §18: Opportunities
- §21 "Opportunities can be published and applied for"

**Requirements (41):** community R55-R56; events-opps R28-R63; platform R004, R055, R096.

**Starts after:** P0, both halves at once. Matching works on interests and certificates alone, and gives verified `MemberSkill` rows more weight once SKILLS has merged.

**Split.**

| | OPPS-A: partners and their verification | OPPS-B: listings, applications, matching |
|---|---|---|
| Requirements | events-opps R47-R48, R57 (3) | community R55-R56; events-opps R28-R46, R49-R56, R58-R63; platform R004, R055, R096 (38) |
| Core | packages/core/src/opportunities/partners.ts | packages/core/src/opportunities/{opportunities,risk,matching,applications,saved,metrics}.ts |
| Pages | apps/web/app/(app)/partner/{page.tsx,profile,members}/** (organisation profile and members) | apps/web/app/(public)/opportunities/**; apps/web/app/(public)/earn/page.tsx; apps/web/app/(app)/earnings/**; apps/web/app/(app)/partner/{listings,applicants}/**; apps/web/components/earn/format.ts |
| Admin | admin applications `_tabs/partners.tsx`; apps/web/app/(app)/admin/opportunities/partners/** | apps/web/app/(app)/admin/opportunities/** except partners; admin applications `_tabs/listings.tsx` |
| Slots and data | seed-demo/partners.ts | settings key opportunities.ts; counter opportunity-applied; dashboard slots opportunities and opportunity-applications; seed-demo/opportunities.ts |
| Harness | journeys/21a-partners.mjs, pages/opps-a.txt | journeys/21b-opportunities.mjs, pages/opps-b.txt |
| Estimate | 3 to 4.5 hours | 8.5 to 11 hours |

**OPPS-A builds:** `Partner` moves PENDING → VERIFIED, SUSPENDED or REJECTED, with `PartnerMember` roles OWNER and EDITOR. Verification records the method (HOUSE, DOMAIN_EMAIL, BUSINESS_REGISTRATION, GSTIN or MANUAL) and the date. The HOUSE partner (seeded by P0f-S) covers Tycoonhood's own affiliate programme and competitions. A partner member holds the `partner` grant (`opportunities.post`) only while the partner is VERIFIED; `assertPartnerMember` scopes every partner action. Notices go through `opportunity.partner`.

**OPPS-B builds:**
- **Listings:** every §7 kind (`OpportunityKind`: FREELANCE_PROJECT, REMOTE_WORK, INTERNSHIP, CREATOR_COLLABORATION, AFFILIATE_PROGRAMME, BUSINESS_PARTNERSHIP, DIGITAL_PRODUCT, MARKETPLACE_SELLER, SKILL_PROJECT, COMMUNITY_COMPETITION) and field. The lifecycle is DRAFT → SUBMITTED → OPEN, then PAUSED, CLOSED or FILLED; staff can REJECT a submission or REMOVE a listing. Public pages use `publicWhere.opportunity()`. Compensation terms are required and shown exactly as the partner states them; unpaid listings cannot be published until O22 is set; listings close at their deadline.
- **Risk:** the banned-claims check (guaranteed income, pay to apply, upfront fees), an https link check, and automatic hiding pending review after N reports (through `reports.file`).
- **Matching:** `recommendFor(userId)` uses interests, academies, certificates and verified skills, with a stated reason for each match. It never promises an outcome. Matches go out through `opportunity.match`.
- **Applications:** the applicant ticks which contact fields to share (`sharedFields`: EMAIL, PHONE, PORTFOLIO), and the partner sees only those. Status moves SUBMITTED → VIEWED → SHORTLISTED → ACCEPTED, DECLINED, WITHDRAWN or COMPLETED; each change notifies `opportunity.application`.
- **Search:** the `searchVector` column of `Opportunity`. Saved listings that change or are about to close notify `opportunity.match`.
- **Earn pages:** /earnings becomes the Earn hub (affiliate activity, my applications, saved listings); /earn lists the opportunity categories and the real affiliate programme (R28). The earn formatting fix in apps/web/components/earn/format.ts that the events-opps map flagged.

**Reads:** Skill and MemberSkill, certificates, AcademyMembership, Profile interests.

**Routes:** /opportunities, /opportunities/[slug], /earn, /earnings, /partner, /partner/listings/**, /partner/applicants/**.

**Admin:** /admin/opportunities, and the /admin/applications partner and listing tabs.

**Tests:**
- OPPS-A: partners.test.ts (only a VERIFIED partner's members hold the grant; suspension removes it on the next request; a member of partner A cannot read partner B's data).
- OPPS-B: opportunities.test.ts (required fields; banned claims refused; deadlines close listings; unpaid listings blocked; the lifecycle); matching.test.ts (a verified skill outranks a self-declared one; no guarantee wording; an empty profile gets a general list); opportunity-applications.test.ts (only the ticked fields reach the partner; a member of partner A cannot read partner B's applicants; status transitions and notices); authenticity-opps.test.ts (on an empty database the only listing is the real HOUSE affiliate programme, if it is published).
- **J21a:** an organisation applies as a partner, and staff verify it; a partner member gains the partner area.
- **J21b:** a partner member posts a listing and staff approve it; a member finds it by search and filter, saves it, and applies sharing only an email; the partner shortlists the member, who is notified; the listing closes at its deadline; a fraud report hides a listing pending review.

**Exit:** OPPS-B: §21 "Opportunities can be published and applied for" is VERIFIED COMPLETE through J21a and J21b. OPPS-A: J21a passes and its rows are VERIFIED COMPLETE.

**Estimate:** 11.5 to 15.5 hours in all (see the split table).

#### P4-SKILLS — Skills, projects and member identity

**Covers:**
- §8: unified identity, profile, learning progress, skills, missions completed, community contributions, projects, certificates, skill progression
- §4: project showcases, shared projects, directory skills and projects
- §12: creators showing their work and collaborating

**Requirements (14):** mentors R50; academies R21-R22, R25-R26, R29-R32, R39; community R08, R14, R40, R43.

**Starts after:** MENTOR-A and MENTOR-B (the verifiers). The module-completion hook needs LEARN: it is wired when LEARN has merged, or at SKILLS' own merge if LEARN merges later.

**Owns:**
- **packages/core/src/progression/skills.ts (`SkillService`):**
  - the catalogue, seeded as drafts for owner review (P0f-S)
  - self-declared `MemberSkill`
  - levels from evidence: mapped module completions (`ModuleSkill`), verified projects, challenges
  - verification through `assertCanVerify`: by an approved mentor (`progression.verify` through `mentorApproved`) within their categories and with evidence, or by staff; recording who, when and the evidence; SKILL_VERIFIED
  - revocation
- **packages/core/src/progression/projects.ts:**
  - `Project` and `ProjectSkill`; visibility PRIVATE, MEMBERS or PUBLIC (`publicWhere.project()`)
  - collaborators through `ProjectCollaborator`: the owner invites (INVITED, `invitedById`), the invited member accepts or declines (`acceptedAt`), and the owner can remove one
  - a verification status
  - PROJECT_PUBLISHED and PROJECT_VERIFIED, which become "project showcase" feed items; notices through `progress.project`
- **packages/core/src/progression/showcase.ts:** a view over public and featured projects. Featuring needs the author's consent.
- **packages/core/src/progression/identity.ts:** `identityFor(viewer, userId)` returns level and rank (read from RANKS' data), academies, progress, skills, the missions completed count, the community contributions count, projects and certificates. Every item is checked with `canView`.
- **Pages:**
  - apps/web/app/(app)/profile/**, except `_sections/rank.tsx`
  - apps/web/app/(public)/u/**, taken over from SOCIAL
  - apps/web/app/(app)/community/projects/**
- **Admin:** apps/web/app/(app)/admin/{skills,projects}/** (catalogue, module-to-skill map review, verification queue, featuring).
- **Studio and profile section:** /studio/showcase with its card; expert section showcase.tsx.
- **Slots, counters and directory:**
  - dashboard slot skills
  - counters skill-level-reached, project-published and project-verified
  - the skill filter in packages/core/src/community/directory.ts (SKILLS' only during P4, after SOCIAL has merged)
- **Notices:** `progress.skill`.
- **Demo data:** seed-demo/projects.ts.
- **Harness:** journeys/22-skills-projects.mjs, pages/skills.txt.

**Reads:** LessonProgress and module completions, MissionCompletion counts, post counts, certificates, MentorProfile categories.

**Routes:** /profile, /u/[username], /community/projects, /community/projects/[id], /studio/showcase.

**Admin:** /admin/skills, /admin/projects.

**Tests:**
- skills.test.ts: self-declared and verified skills stay distinct; an approved mentor can verify only with evidence and within their category; an unapproved mentor cannot verify; revocation works; completing a mapped module raises the level; self-report alone never raises a level.
- projects.test.ts: visibility; an invited collaborator appears only after accepting; a declined or removed collaborator disappears; verification; consent to feature.
- identity.test.ts: facets.
- **J22:**
  1. A module completion adds a skill marked "from coursework".
  2. The member declares a second skill, which shows as "self-declared".
  3. The member publishes a public project and invites a collaborator, who accepts.
  4. A mentor verifies the project, and the skill becomes verified.
  5. The project appears in the showcase and the feed.
  6. A directory skill filter finds the member, and /u shows only allowed facets.

**Exit:** SKILLS supports §21 "Progress and achievements update correctly" (with RANKS) and the FINAL MISSION's "build practical skills".

**Estimate:** 10 to 13 hours.

#### P4-RANKS — Ranks, achievements, badges and leaderboards

**Covers:**
- §8: member level, achievements, badges, XP history, ranks earned meaningfully, achievement showcase, academy and challenge leaderboards, community recognition, avoiding spam and compulsive engagement
- §13: achievement unlocks
- §1: gamified achievement system
- §18: Achievements, Leaderboards
- §21 "Progress and achievements update correctly"

**Requirements (17):** academies R16, R23, R27-R28, R33-R38, R41-R42; community R53; platform R006, R061-R062, R097.

**Starts after:** DAILY-A. It runs in parallel with SKILLS; criteria that use skills are checked in J23 once both have merged.

**Owns:**
- **packages/core/src/progression/ranks.ts (`RankService`):**
  - the current five ranks and thresholds stay active
  - a criteria-based Initiate-to-Master ladder exists as a draft, with an impact preview (O3)
  - members are never demoted
  - the rank changes in the same transaction as the XP write
  - RANK_CHANGED is emitted
- **packages/core/src/progression/recognition.ts:** recognition from staff or mentors with a reason, recognition for accepted answers, and caps.
- **packages/core/src/gamification/{xp,catalogue,challenge-board}.ts:** XP rows carry the academy, there is an XP history, and achievements and badges are data evaluated by the rules engine.
- **packages/core/src/discussions/leaderboard.ts:** academy and challenge leaderboards; opt-out (the `leaderboard` facet) and a minimum population of `MIN_COUNT_FOR_AGGREGATE`; weekly and monthly windows in `memberWeekKey` and `memberMonthKey`; only meaningful XP sources count, with daily caps.
- **Pages:**
  - apps/web/app/(public)/progression/** (the transparent rules)
  - apps/web/app/(app)/{leaderboard,achievements}/**
  - challenges `_sections/leaderboard.tsx`
  - apps/web/app/(public)/academies/[slug]/leaderboard/** and `_sections/{achievements,leaderboard}.tsx`
  - profile `_sections/rank.tsx` (rank, XP history, up to N pinned achievements)
  - u `_sections/achievements.tsx`
- **Admin:** apps/web/app/(app)/admin/{achievements,progression,leaderboards,recognition}/**. Missions, achievements and ranks stay under `admin.economy`.
- **Slots and keys:** dashboard slot badges; settings key leaderboards.ts.
- **Notices:** `progress.achievement`, `progress.level`, `progress.rank` and `progress.xp` through `notify`.
- **Harness:** journeys/23-progress.mjs, pages/ranks.txt.

**Reads:** rules engine results, XP rows, challenge progress, accepted answers, MemberSkill (criteria).

**Routes:** /progression, /leaderboard, /achievements, /academies/[slug]/leaderboard.

**Admin:** /admin/achievements, /admin/progression, /admin/leaderboards, /admin/recognition.

**Tests:**
- ranks.test.ts: no demotion; the rank changes atomically with XP; the draft ladder preview counts correctly.
- leaderboard.test.ts: boards below the threshold are hidden; opt-out works; demo and staff accounts are excluded; XP is attributed to the right academy.
- achievements-catalogue.test.ts: an achievement unlocks once and notifies.
- anti-spam.test.ts: repeated low-value actions are capped.
- **J23:**
  1. A lesson and a challenge add XP history entries and unlock an achievement, with a notification.
  2. The member pins the achievement on their profile.
  3. The academy board shows the member once a five-person fixture exists, and opting out removes them.
  4. Staff edit an achievement and preview the draft ladder.

**Exit:** §21 "Progress and achievements update correctly" is VERIFIED COMPLETE, through J23 and J22.

**Estimate:** 7 to 10 hours.

#### P4-MONEY — Paid bookings and events, contributor earnings, payouts, shop hygiene

**Covers:**
- §2: booking pricing, mentor earnings dashboard, payout management
- §12: revenue-sharing configuration
- §17: no invented earnings, no false scarcity, no simulated transactions shown as real
- §1: shopping destination (academy-linked products)
- §13: order updates

**Requirements (9):** mentors R14, R31-R32, R45; community R57; platform R007, R036-R037, R039.

**Starts after:** BOOK and LIVE-A. It owns the price fields in BOOK's offering form and LIVE-A's event form during P4.

**Owns:**
- **One product kind.** A paid booking or paid event sells through a system-managed product of `ProductKind.LIVE_EVENT` (`MentorOffering.productId`, and the event's product). There are no other new product kinds.
- **packages/core/src/shop/checkout.ts:**
  - `startDirectInrCheckout(userId, productId, { eventId } | { offeringId, slotStart })` for LIVE_EVENT products only
  - the one-open-rupee-order rule (lines 242-247) is scoped by `Order.source`, so an open booking order never blocks merch and merch never blocks a booking
  - **one order per registration:** `OrderItem.registrationId` has a plain index (`OrderItem_registrationId_idx`). Inside the checkout transaction the registration row is locked (`SELECT ... FOR UPDATE`), and checkout refuses when a PENDING or PAID order already exists for it; an expired or failed order does not block a new attempt.
  - prices are explicitly in INR
- **packages/core/src/shop/refunds.ts** (from LEARN): a booking or event refund follows the agreement's `refundWindowHours`, counted back from the event start, never `MentorProfile.cancellationHours`. A refund cancels the registration and reverses the contributor's earning.
- **Other shop files:** cart.ts refuses LIVE_EVENT products; tracking.ts; earn-registry.ts; metrics.ts (the marketplace funnel).
- **packages/core/src/commerce/commerce.ts:** `fulfillIn` gains a LIVE_EVENT branch. A paid order moves the registration from PENDING_PAYMENT to REGISTERED; a failed or expired order releases the hold.
- **Held slots:** a paid slot is held as a PENDING_PAYMENT registration with `holdExpiresAt` 15 minutes out; sweeps/commerce.ts releases expired holds.
- **packages/core/src/earn/revenue-terms.ts:** `RevenueShareAgreement` rows per contributor and scope (MENTORING, EVENT, COURSE), versioned with `effectiveFrom`, holding `contributorShareBps`, `holdDays`, `minPayoutCents` and `refundWindowHours`. The platform keeps 10000 − `contributorShareBps`. Staff set them; there are no defaults. A paid offering or event cannot be published while any term on its agreement is null, and a new version reaches only new orders.
- **packages/core/src/earn/contributors.ts:** `ContributorEarning` rows per paid order item, available after `holdDays`, then paid, using the existing commission status lifecycle.
- **packages/core/src/earn/payouts.ts:** extracted from affiliates.ts. `PayoutRequest` has an affiliate or a contributor payee (`PayoutRequest_one_payee`); payouts are manual, and staff record the bank or UPI payment and its UTR reference. affiliates.ts is adapted to the extracted module.
- **D6:** a price on an offering or event in a mentor category with `paidAllowed` false is refused, whatever the agreement says (O39).
- **Academy products (R007):** `Product.academyId` links a product to an academy. /admin/products gets an academy picker; the academy page section `_sections/products.tsx` lists the academy's active products through `storefrontProductWhere`.
- **Shared storefront filter:** `storefrontProductWhere` excludes LIVE_EVENT from /store, /marketplace and the sitemap, by request to the lead for the sitemap.
- **Scarcity gate:** `scarcityAllowed` with `stockConfirmedAt`, so "only N left" appears only for stock that staff confirmed in the last 7 days.
- **Studio and forms:**
  - apps/web/app/(app)/studio/earnings/** with its card. The real ledger shows ₹0 and "no paid bookings yet" when there are none. It never shows projections.
  - expert section pricing.tsx
  - the price fields in BOOK's offering form and LIVE-A's event form
- **Admin:** apps/web/app/(app)/admin/{revenue-terms,contributor-earnings,earn,products}/**. /admin/revenue-terms edits agreements; /admin/contributor-earnings lists earnings and contributor payouts.
- **Notices:** `order.update` and `earnings.update` through the gateway.
- **Harness:** journeys/24-paid-booking.mjs (dev sandbox only, run with `--dev`, skipped on the production build like J4 and J5), pages/money.txt.

**Reads:** MentorOffering, MentorCategory, LiveEvent, EventRegistration, Order, Product, Academy.

**Routes:** /studio/earnings, /bookings/book/[offeringId] (the paid path), /events/[slug] (the paid path), /checkout (existing), /academies/[slug] (products section).

**Admin:** /admin/revenue-terms, /admin/contributor-earnings, /admin/earn, /admin/products.

**Tests:**
- revenue-terms.test.ts: no agreement or any null term means no paid publishing; a new version reaches only new orders; the platform share is 10000 − `contributorShareBps`.
- checkout-booking.test.ts: hold, pay, confirm; an expired hold releases the slot; the open-order rule is scoped; two concurrent checkouts for one registration create one PENDING order; an expired order allows a retry; production refuses the sandbox.
- refunds-booking.test.ts: the window comes from `refundWindowHours`, never `cancellationHours`.
- contributor-payouts.test.ts: minimum, hold, UTR recorded; one payee per payout.
- storefront.test.ts: LIVE_EVENT is never listed; an academy's products section lists only its active products.
- paid-allowed.test.ts: a financial-literacy offering cannot be priced.
- scarcity.test.ts.
- **J24 (sandbox):**
  1. Staff set the terms, and a mentor sets a price.
  2. A member books a paid slot, and the labelled sandbox payment confirms it.
  3. The mentor's earning appears as pending, then becomes available after the hold.
  4. The mentor requests a payout, and staff record the UTR.
  5. A cancellation inside the refund window refunds.

**Exit:**
- Paid bookings and events are IMPLEMENTED BUT UNVERIFIED for live money: they need Razorpay KYC and keys (B1) and owner terms (O4 to O7).
- The sandbox path is verified by J24 under `next dev`.

**Estimate:** 10 to 14 hours.

#### P5-HOME — Homepage and the Grow pillar

**Covers:**
- §10 (all)
- §1: the pillars
- §16: active without chaos
- §18: Homepage content

**Requirements (24):** content R13-R32; platform R009, R011, R013, R063.

**Starts after:** ACAD, MENTOR-B, LIVE-A, EDIT-A and EDIT-B. The homepage reads every domain only through its exported read functions, so a domain that merges later shows its editorial fallback until it lands. INT reruns J25 on the final head.

**Owns:**
- **packages/core/src/platform/home.ts:** `loadHome()` builds the 15 sections from real data through the domain read functions and `publicWhere`.
  - The order and visibility of the sections come from the `home` setting.
  - Every section has an editorial fallback for an empty database: staff copy, programmes, the founder. It never invents a count.
- **packages/core/src/platform/pulse.ts** (extracted by P0s; HOME owns it): real 24-hour counts, shown only at or above the thresholds.
- **Settings key home.ts:** version 2 schema, with a preprocess that migrates the old setting.
- **Pages:**
  - apps/web/app/(public)/page.tsx
  - apps/web/app/(public)/grow/** (new pillar page: progression, skills, goals)
  - apps/web/components/home/**
- **Admin:** apps/web/app/(app)/admin/site/homepage/**, the homepage builder, with "preview as empty database" and "preview as live".
- **Harness:** journeys/25-homepage.mjs, pages/home.txt.

**Reads:** Academy, Course, MentorProfile, LiveEvent, Post, Challenge, Opportunity, Product, achievements, and the `founder.note` setting (shown only while approved).

**Routes:** /, /grow.

**Admin:** /admin/site/homepage.

**Tests:**
- home.test.ts:
  - on an empty database every section shows its fallback or hides
  - no number appears below its threshold
  - demo rows are excluded in production mode
  - section toggles and order are honoured
  - the old setting migrates
- pulse.test.ts.
- **J25:**
  1. On an empty database, the homepage shows no zero-count widgets and no invented names.
  2. Fixtures added through the UI fill the sections.
  3. Staff reorder and hide a section, and the change shows.

**Exit:** §10 is delivered, and HOME supports §21 "Administrators can manage all these systems" (homepage content).

**Estimate:** 8 to 10 hours.

#### P5-GUIDE — Personal Tycoonhood Guide

**Covers:** §9 (all).

**Requirements (13):** content R00-R12.

**Starts after:** ACAD, MENTOR-B, LEARN, DAILY-A, DAILY-B and LIVE-A. Answers about opportunities, skills and the daily plan say "nothing yet" and give the next step until OPPS-B, SKILLS and TODAY have merged; INT reruns J26 on the final head.

**Owns:**
- **packages/core/src/guide/**:**
  - **Context:** `memberContext(userId)` holds only data the member has authorised. Consent is set in /settings/guide.
  - **Intents:**
    - explain a feature
    - recommend a path
    - explain progress
    - suggest missions
    - find mentors
    - find events
    - surface opportunities
    - help set a goal (creates a draft Goal only after the member confirms)
    - answer a course question (lesson search through `lms/access.ts`, readable lessons only)
  - **Answers** are deterministic, built from domain services, and cite their source pages.
  - **Providers:** `NullProvider` is the default. `AnthropicProvider` stays inert unless `ANTHROPIC_API_KEY` is set and the admin toggle is on (N6) and the member has opted in.
  - **Refusals:** no financial, medical or legal advice, and the answer says plainly "I am an automated guide, not a mentor".
  - **Limits:** `GuideUsage` quotas per member per day, and a retention setting.
- **Pages and API:**
  - apps/web/app/(app)/guide/**, labelled "Tycoonhood Guide (automated)"; every answer shows its sources and an "automated, not professional advice" line
  - apps/web/app/api/guide/ask/route.ts, rate-limited
  - apps/web/app/(app)/settings/guide/** (consent, history on or off, delete history)
  - apps/web/components/guide/** (the "Ask the Guide" button, added to the lesson page under (app)/courses/[slug]; LEARN has merged by then)
- **Admin:** apps/web/app/(app)/admin/guide/** (usage aggregates, answers members flagged, provider status, the LLM toggle).
- **Keys and slots:** settings key guide.ts; dashboard slot guide.
- **Harness:** journeys/26-guide.mjs, pages/guide.txt.

**Reads:** the daily plan (TODAY), `MentorDirectory`, `LiveEventService`, opportunities matching, LearningPathService, GoalService, help articles, lesson text through `lms/access.ts`.

**Routes:** /guide, /settings/guide.

**Admin:** /admin/guide.

**Tests:**
- guide-intents.test.ts:
  - every intent answers from real data with citations
  - an empty database gets an honest "nothing yet" and the next step
  - the guide never speaks as a named person
  - it refuses advice
- guide-privacy.test.ts: no consent means no personal context; quotas; deletion.
- guide-provider.test.ts:
  - no key gives `NullProvider`, and a key without the toggle still gives `NullProvider`
  - prompts never contain another member's data
- **J26:**
  1. A member asks: what to learn next, for a fitness mentor, about events this week, and for help with a goal.
  2. The answers cite real pages and are labelled automated.
  3. The goal draft is created only on confirmation.
  4. Turning consent off removes personal context.

**Exit:**
- §9 is VERIFIED COMPLETE in deterministic mode.
- LLM mode is BLOCKED on a key and on legal review (B4).

**Estimate:** 9 to 12 hours.

#### P5-ANALYTICS — Engagement analytics and the admin overview

**Covers:**
- §19 (all)
- §18: Engagement analytics
- §4: community participation analytics

**Requirements (22):** community R64; platform R064, R066-R085.

**Starts after:** ACAD, LIVE-A, DAILY-A, DAILY-B and LEARN. A domain's metrics.ts slot returns nothing until its unit merges, and the overview hides that panel; INT checks the full overview on the final head.

**Owns:**
- **packages/core/src/platform/analytics.ts:**
  - active members: DAU, WAU and MAU from `MemberActivityDay`
  - retention cohorts by signup week, and the returning-member rate
  - learning: enrolments, and lesson and course completion
  - mentor bookings
  - events: registrations and attendance
  - missions completed
  - community participation
  - opportunity applications
  - marketplace conversions
  - learning outcomes, so the dashboard shows whether members are actually learning:
    - quiz pass rates
    - completion within N days
    - verified skills
- **packages/core/src/activity/{days,rollups,prune}.ts:** daily rollups, a backfill, and retention.
- **Sweeps:** sweeps/analytics.ts.
- **Admin pages:**
  - apps/web/app/(app)/admin/analytics/**:
    - tabs: Overview, Learning, Mentoring and events, Community, Opportunities and commerce, Retention
    - IST date ranges, with the zone shown
    - CSV export of aggregates only
  - apps/web/app/(app)/admin/page.tsx: the overview queues, counted from each domain's `pendingCounts()`
  - the admin member panel metrics.tsx ("exclude from metrics")
- **Harness:** journeys/27-analytics.mjs, pages/analytics.txt.

**Reads:** MemberActivityDay, the rollup tables, each domain's metrics.ts and `pendingCounts()`.

**Routes:** none for members.

**Admin:** /admin, /admin/analytics and its tabs.

**Tests:**
- analytics.test.ts:
  - DAU, WAU and MAU from fixtures
  - retention math
  - excluded, demo and staff accounts are not counted
  - breakdowns below 5 are suppressed
  - exports carry no personal data
- rollups.test.ts: idempotent, with a backfill.
- **J27:**
  1. Staff open the tabs, change the range, and export the CSV.
  2. The overview queue counts link to the right queues.

**Exit:** §19 is delivered, and ANALYTICS supports §21 "Administrators can manage all these systems".

**Estimate:** 8 to 11 hours.

#### P5-CONNECT — Cross-pillar connections

**Covers:**
- §1: personal development ecosystem, growing alongside others, every pillar connecting
- §20 priority 9, personalization

**Requirements (3):** platform R003, R008, R010.

**Starts after:** LEARN, DAILY-A and OPPS-B.

**Owns:**
- packages/core/src/personalization/next-steps.ts: `nextStepsFor(viewer, context)` for a programme, mentor, event, opportunity or goal. It composes `opportunities.recommendFor`, the mentor directory, `LiveEventService.listUpcoming`, `LearningPathService`, the mission board and signals. It returns at most 3 items, each with a reason, and never pads.
- apps/web/components/next-steps/**
- the one-line include on these pages, whose owner streams have merged:
  - apps/web/app/(public)/programs/[slug]/page.tsx
  - /mentors/[slug]
  - /events/[slug]
  - /opportunities/[slug]
  - /goals/[id]
- **Harness:** journeys/28-connections.mjs, pages/connect.txt.

**Reads:** the domain recommenders listed above.

**Routes and admin:** no new routes and no admin screen.

**Tests:**
- next-steps.test.ts: relevant cross-links, no padding, demo rows excluded, privacy respected.
- **J28:** a Warrior programme page leads to a mentor in that academy, then to their workshop, a related challenge, and an opportunity that matches the skill.

**Exit:** §1 interconnection; the FINAL MISSION path.

**Estimate:** 5 to 8 hours.

#### P5-POLISH — Visual and interaction design, motion, trust pages

**Covers:**
- §16, except the blocked red and lattice
- §17: engaging, transparent empty states
- §21 "Mobile access works"

**Requirements (16):** platform R012, R016, R018-R019, R021-R030, R040, R101.

**Starts after:** every other unit has merged. It touches only shared components and its own pages, and merges last. When it starts, the lead hands it apps/web/components/trust/**; the components' props stay frozen.

**Owns:**
- **packages/ui/**:**
  - tokens: dark foundation, gold and amber accents, academy accents on existing tokens
  - restyles the shared trust components P0e built (`DemoBadge`, `VerificationBadge` and `EmptyState` in apps/web/components/trust, and `ProgressRing` in packages/ui) without changing their props or rebuilding them
  - replaces today's duplicate progress rings with `ProgressRing`
  - emblems
- **apps/web/app/layout.tsx:** view transitions that respect `prefers-reduced-motion`.
- **apps/web/components/app/**, except nav.ts:**
  - celebration feedback, only for real achievements
  - ProgressHistory
  - StreakCalendar
- **apps/web/app/(public)/{roadmap,status,privacy,terms,refund-policy}/**:**
  - the privacy draft is corrected to describe actual processing: activity days, notification email, and the guide processor paragraph
  - these pages are labelled "pending legal review"
- **Other:**
  - apps/web/app/(app)/admin/site/house-rules/** (the community rules text, backed by a setting)
  - the globals.css clean-up: remove `.grid-plane` and the mono uppercase labels
  - docs/DESIGN_SYSTEM.md
- **Final page-list check:** every stream's page list is in a11y and J8.
- **Harness:** journeys/29-motion.mjs, pages/polish.txt.

**Reads:** every page, for the a11y and mobile sweep.

**Routes:** /roadmap, /status, /privacy, /terms, /refund-policy.

**Admin:** /admin/site/house-rules.

**Tests:**
- empty-state.test.ts.
- **J29:**
  - with reduced motion there are no transitions
  - with normal motion, transitions never block navigation or shift layout
  - celebrations fire only on real events
- the full a11y run at 1280 and 390 pixels over every page list.

**Exit:** §16 is delivered, except B16. Platform R022 (beautiful imagery) is reported PARTIAL: real photography waits on the owner's media and an allowed image host (B6, B9, O38). §21 "Mobile access works" is VERIFIED COMPLETE through J8 over all page lists and axe at 390 pixels.

**Estimate:** 6 to 9 hours.

#### INT — Lead integration and verification

**Requirements (7):** community R63, R65 and platform R065, R100 are cross-section touchpoints whose screens the domain units build. Platform R102 (no 3D world required), R103 (journeys tested) and R104 (report format) are INT's own deliverables.

**Starts after:** POLISH has merged. J30, J31 and the early adversarial passes are written and run on merged code in idle slots before that (section W1.3).

**Owns:**

| Item | What it covers |
|---|---|
| scripts/e2e/journeys/30-admin-control-centre.mjs | **Every §18 screen**, opened by a role that should reach it. **Role walls:** MEMBER, INSTRUCTOR, MODERATOR, a member with the mentor grant (approved and unapproved), a contributor and a partner member are refused what they lack. **Owner without code:** rename an academy, approve a mentor, publish an event, approve a listing, publish an article, edit the homepage, send an announcement, edit a mission, set revenue terms |
| scripts/e2e/journeys/31-final-mission.mjs | The FINAL MISSION on a fresh database (taxonomy plus fixtures made through the UI), with WebGL disabled in the browser context and /world never visited. A beginner registers, picks an academy, gets a next step on /today, finds a verified mentor, books a free slot, registers for an event, completes a module, completes a challenge, posts an introduction and gets a reply, joins a group, declares a skill and publishes a project, applies to an opportunity, and sees each of these on /today, the profile and the feed. J31 is also the evidence for TODAY's §21 line |
| Reruns on the final head | J25 (homepage), J26 (guide) and the analytics overview, which started before every domain had merged |
| Reviews and reports | the adversarial passes (section W3.4); docs/TEST_REPORT.md; TYCOONHOOD_STATE.md; TYCOONHOOD_BLOCKED_ON_YOU.md; LAUNCH.md; the end-of-build report (section 10) |

**Exit:** every §21 line has a classification backed by evidence that ran on the integrated head.

**Estimate:** 16 to 30 hours (23 at the midpoint), most of it gates, reruns, passes and fixes.

### W3. Integration plan

#### W3.1 One unit, from start to finish

**Setup (the lead):**
1. Creates the worktree from the latest integrated head:

   ```
   git worktree add /home/user/tycoonhood-wt/<unit> -b eco/<phase>-<unit> build/living-ecosystem
   ```
2. Creates the unit's databases with `node scripts/db/create-stream-db.mjs <unit>`, which makes `tycoonhood_<unit>_test` and `tycoonhood_<unit>_e2e` and prints URLs with `connection_limit=3`.
3. Assigns a dev port: 3300 plus the unit's number.

**Implementer.** Writes tests first (vitest, then the journey), then implements.
- While implementing it runs only `pnpm vitest run <files>` for the tests it touches, against its own database.
- Before review, once, through `scripts/dev/heavy.sh`: `pnpm typecheck`, `pnpm lint`, the full `pnpm test`, and its own journey under `next dev`.
- `node scripts/ownership/check.mjs <unit>`.
- TODAY, HOME and POLISH, which add client code to shared layouts, also run `pnpm build:web` and `node scripts/world/check-bundle.mjs` once, inside the semaphore. Everyone else leaves those to the lead's gates.

**Reviewer.** A fresh, read-only agent in the other lane of the same workflow. It returns findings with file and line, using this checklist:
- every requirement in docs/ecosystem/requirements/&lt;unit&gt;.json is met
- every name matches section 2 and docs/ecosystem/data-model.md (the naming table in section 2.1)
- tests assert behaviour, not just that code runs
- authenticity: no invented data, demo rows hidden, thresholds applied
- authorisation and ownership on every action and route (IDOR)
- privacy facets
- time zones
- concurrency
- no schema or other lead-owned file changed (the ownership check)
- no secrets
- honest copy

**Fixes.** The implementer fixes the findings, and the reviewer re-checks only those findings.

**Definition of done for a unit:**
- every check above is green;
- the requirements file has evidence for each row;
- lead requests are written up;
- the journey and page list are added;
- the authenticity test for its public loaders passes.

#### W3.2 Merge order and gates

**Order.** Section W1.1 gives the merge order within each tier. When several units are ready at once, readiness order decides.

**How one merge works:**
1. Merge `build/living-ecosystem` into the unit branch (no rebase of a reviewed branch), and rerun the unit's targeted tests.
2. Apply the unit's requests: nav, sitemap, permissions, topics, audit actions; for DAILY-B, also commit migration 000900.
3. Run typecheck, lint and the full vitest suite on the result, inside the semaphore.
4. Merge into `build/living-ecosystem` with `--no-ff`.

**The full gate.** It runs on the integrated head at least every 8 hours and after the last merge of each tier:
- typecheck, lint, the full vitest suite;
- build:web and the bundle rule;
- e2e:a11y at 1280 and 390 pixels over every page list;
- `pnpm e2e:journeys` on the production build, in two shards once the suite passes about 15 journeys;
- the sandbox journeys J4, J5 and J24 under `next dev`;
- the drift check: `prisma migrate diff` from the migrations to the schema, with exactly the five lines that recreate the generated `searchVector` columns removed by full-text match. Anything else in the output fails the gate;
- connections: `pg_stat_activity` grouped by database; a finished unit's databases must show none, and the gate drops them.

After the last merge of a tier passes the gate, the head is tagged `eco-p<N>`.

**How long the gates take.** Today's 9 journeys take 30 to 45 minutes. The final suite has 36 journey files (J1 to J31, with five split into a and b), and a full gate takes about 2 to 3 hours, or about 1.5 hours in two shards.

**The launch branch.** Once a day, and at each tier tag, the lead merges `build/full-platform` into `build/living-ecosystem`, so fixes made on the launch branch reach the units while their branches are small. If the launch branch adds a migration, the lead checks that its folder does not depend on an eco table (and the reverse) before the merge, because migrate-sql.ts applies pending folders in name order.

#### W3.3 Journeys for §21

Section 6.3 maps each §21 line to its owner and to the journeys that prove it. Section 6.2 lists every unit's tests and journeys.

#### W3.4 Adversarial review passes

**How every pass runs:**
- Fresh read-only agents run each pass, two per workflow.
- The lead checks every finding before it counts.
- A fixer agent works on `eco/fix-<pass>`, and a reviewer re-checks the fixes.
- The early passes use idle slots.

| Pass | Focus | When |
|---|---|---|
| A1 Authenticity | Empty-database page tour; banned claims in copy; every public count thresholded; demo guard D1; no invented names, figures, scarcity or "online" | after P1, after P4, final |
| A2 Security and authorisation | Every server action and route checks permission and ownership (IDOR on events, bookings, applications, partner applicants, projects); grants follow suspension on the next request; meeting-link leaks; guide prompt injection and data leakage; open redirects; rate limits | after P1, after P4, final |
| A3 Privacy (DPDP) | Facets in the feed, directory, /u, leaderboards, analytics exports and guide context; contact details never exposed; contributor anonymisation; retention; no raw IPs; consent records | final |
| A4 Money | No invented revenue share; paid publishing blocked without complete terms; `paidAllowed`; sandbox never in production; holds, one order per registration, refunds and reversals; manual payouts with UTR; the scoped open-order rule | after P4 |
| A5 Concurrency and data | Bookings and requests, registrations, rewards, challenge evidence, outbox dispatch; migrations on a populated copy and on an empty database | after P2, final |
| A6 Time zones | Day keys and the cutover rule, availability across DST, reminders and `notAfter`, digests, analytics ranges | after P2, final |
| A7 Accessibility, mobile, performance | axe on every page list at 390 and 1280 pixels; keyboard paths through booking, registration and application; query counts on /today and /; bundle rule; homepage LCP | final |
| A8 Regression | The original 9 journeys and the full vitest suite of the merged base (the P0 baseline) behave as before; spot checks of shop, earn, certificates, email change and community chat | final |

#### W3.5 Landing in the launch PR

**At each tier.** `build/living-ecosystem` is the integration branch. After each tier's gate passes, the lead merges it into `build/full-platform` locally.

**Pushing before the end.** Pushing `build/full-platform` builds a Vercel preview that uses the production database settings (TYCOONHOOD_STATE §5).
- Previews never migrate, and the production database has not been migrated yet, so a preview of eco code fails on the missing tables.
- Default: push only at phase boundaries, and say in the PR that previews are not usable until the first production deploy. `eco/*` and `build/living-ecosystem` pushes are kept off Vercel by the P0 `deploymentEnabled` rule.

**Deploy timing (data-model g.18, in section 7.2).** Three changes are safe only if these migrations ship before production first runs: `MissionCompletion.occurrence` SET NOT NULL, RESTRICT on `CommunityPost.groupId`, and the `Post.status` backfill. If a production build goes live first, the lead splits them into a later migration or uses a maintenance window.

**Before the final push:**
1. Run the full gate on the `build/full-platform` head.
2. Repeat the deploy rehearsal: a fresh clone and an empty database, then every migration, every seed including taxonomy, the build and serving; check that a preview build leaves the database untouched, and that a second deploy's taxonomy seed creates nothing.
3. Update LAUNCH.md and docs/DEPLOYMENT.md: the new variables `IP_HASH_KEY`, `IMAGE_REMOTE_HOSTS` and `DEMO_DATA`, plus the optional `ANTHROPIC_API_KEY` and VAPID keys; the taxonomy seed on every deploy; the cron entries.

**Then:** push; update the PR #2 description with the §21 table; keep PR #2 in draft until the owner approves. PR #2 is not merged until everything in section 10 is reported.

#### W3.6 When something goes wrong

- **A field or enum value is missing.** The unit stops and files a request. The lead lands a new migration file on the integration branch (enum values in their own file first, then the rest, then the generated client), dated after every existing folder. Applied migrations are never edited, because migrate-sql.ts refuses a changed checksum. Every in-flight unit merges the integration branch and recreates its databases with `node scripts/db/create-stream-db.mjs <unit> --recreate`. Plan for one to three small migrations per tier.
- **A gate fails after a merge.** The lead fixes it, or a fixer agent does, on the integration branch before the next merge. The tier tag waits.
- **A review finds a design flaw that crosses units.** The lead decides. The fix goes to the unit that owns the file, or to a short fix unit after the tier merges.
- **A journey is flaky.** It is fixed, not skipped. A skip is allowed only for a stated credential reason, as with J4, J5 and J24 on the production build.
- **The machine runs short.** If a heavy command waits more than 30 minutes for a permit, or memory runs out, the lead drops to 3 implementing slots (section 9.4).

---

## 4. Data model summary

### 4.1 Where the model is

- **The schema** is Appendix B: packages/db/prisma/schema.prisma as P0a lands it, 4757 lines, 141 models and 106 enums. It passes `prisma format` and `prisma validate`.
- **The migrations** are ten new folders:
  - 20261113000000_ecosystem_enum_values to 20261113000800_live_event_overlap_guard, which P0a commits;
  - 20261113000900_challenge_evidence_move, which DAILY-B commits. Until then it waits at docs/ecosystem/pending-migrations/20261113000900_challenge_evidence_move/migration.sql.

  With the 15 migrations of the merged base, that makes 25.
- **The full data model** is docs/ecosystem/data-model.md, which P0a commits from plan/data-model.md. It holds:
  - a: every new model and enum, with the Prisma code;
  - b: every change to an existing model;
  - c: the ten migrations with all their hand-written SQL, how they were checked, and the deploy notes;
  - d: the seeds, with exact rows;
  - e: the foundation contracts;
  - f: the naming collisions;
  - g: the open questions.

The rest of this section reproduces the summary parts of the data model under their own labels:
- 0.2 counts, 0.3 where each directive section lives, 0.4 what was checked, 0.5 defects and departures, 0.6 conventions and 0.7 what the review changed;
- a.1 and a.2, the indexes of new models and enums;
- b.2, the changes to existing models;
- c.1, the order of the migrations, and c.5, the deploy notes.

Sections e, f and g are sections 5, 2.2 and 7.2.

### 0.2 Counts

| What | Count |
|---|---|
| New models | 67 (sections 17 to 26 of the schema) |
| New enums | 83 |
| Existing models changed | 33. 28 change in the database; 5 change only in Prisma (relation names or doc comments): `Session`, `CourseModule`, `ChallengeParticipation`, `Referral`, `ContactMessage` |
| Existing enums gaining values | 2. `NotificationType` gains 8, `ProductKind` gains 1 |
| Migrations | 10, `20261113000000` to `20261113000900`. With the 15 on the merged base, 25 in all |
| Models after the change | 141 (74 + 67) |
| Enums after the change | 106 (23 + 83) |
| Columns added to or changed on existing tables | 196 |
| Indexes and foreign keys that Prisma generates | 173 indexes and 226 foreign keys. On existing tables: 45 indexes, 54 new foreign keys, and 1 foreign key replaced |
| Hand-written SQL | 58 CHECK constraints, 1 exclusion constraint, 11 partial unique indexes, 5 generated full-text columns, and the backfills |

### 0.3 Where each directive section lives

| § | Directive section | Models and fields |
|---|---|---|
| 1 | New product experience (Learn, Earn, Grow, Connect, Shop) | No tables of its own. It reads the models below. `Profile.dashboard` holds the member's card layout |
| 2 | Mentors | `Instructor` (extended into the one expert profile), `MentorProfile`, `MentorCategory`, `MentorCategoryLink`, `ExpertCredential`, `MentorOffering`, `MentorAvailabilityRule`, `MentorAvailabilityException`, `CourseCohort`, `CalendarFeedToken`. A booking is a `LiveEvent` of the one-to-one kind with one `EventRegistration`. A mentor review is an `EventFeedback` |
| 3 | Academies (the directive's "campuses"; never "campus" in code) | `Academy`, `AcademyMembership`. `academyId` is added to `Course`, `Challenge`, `CommunityGroup`, `CommunityCategory`, `CommunityPost` and `XpEvent`, and to new models where it applies |
| 4 | Live community | `ActivityEvent`, `Follow`, `MemberBlock`, `SavedPost`. Kinds, edits, highlights, replies and accepted answers on `CommunityPost` and `CommunityComment`. Topics, review, join policy, roles and bans on `CommunityGroup` and `GroupMembership`. Headline and opt-in location on `Profile` |
| 5 | Daily activity engine | `Mission` (cadence, verification, targeting), `MissionCompletion.occurrence`, `Challenge` (kinds, scopes, templates), `EvidenceSubmission`, `DailyPlan`, `DailyPlanItem`, `Goal`, `GoalCheckIn` |
| 6 | Live events and workshops | `EventKind`, `LiveEvent`, `LiveEventHost`, `EventRegistration`, `EventFeedback`, `LiveEventSeries`, `EventInterest`. Also `Resource.eventId`, `ProductKind.LIVE_EVENT`, `OrderItem.registrationId` and `Order.source` |
| 7 | Opportunity marketplace | `Partner`, `PartnerMember`, `Opportunity`, `OpportunitySkill`, `OpportunityApplication`, `OpportunityApplicationEvent`, `SavedOpportunity` |
| 8 | Progression and identity | `Skill`, `ModuleSkill`, `ChallengeSkill`, `MemberSkill`, `Project`, `ProjectSkill`, `RankAward`, `LearningPath`, `LearningPathStep`, `LearningPathFollow`. Also `RankDefinition.criteria`, `Achievement.kind`, the award fields on `UserAchievement`, and `Profile.pinnedItems` |
| 9 | Personal Tycoonhood Guide | `GuideConversation`, `GuideMessage`, `GuideUsage`, `Profile.aiGuideConsentAt` |
| 10 | Homepage | No tables of its own. It reads the `publicWhere` helpers (e.3). The founder section reads the `Instructor` row with `isFounder` |
| 11 | Member dashboard | `Profile.dashboard`, `DailyPlan`, `Goal`, `ActivityEvent` |
| 12 | Creator and instructor ecosystem | `ContributorApplication`, `ContributorAccount`, `RevenueShareAgreement`, `ContributorEarning`, `ContentSubmission`. Also `Resource.status` and `Resource.submittedById`, `PayoutRequest.contributorId`, `Course.deliveryMode` and `Enrollment.cohortId` |
| 13 | Notification system | `Notification` (extended), `NotificationTopic`, `NotificationPreference`, `NotificationSettings`, `PushSubscription`, `Announcement`, `ScheduledNotification`. `NotificationType` gains 8 values |
| 14 | Content and editorial engine | `Post` (status workflow, kinds, bylines, search), `PostRevision`, `PostCategory`, `Tag`, `PostTag`, `HelpArticle`. Also `Lesson.searchVector` |
| 15 | Founder presence | `Instructor.isFounder`. `FOUNDER_NOTE` posts with `Post.founderApprovedAt`. The `founder-session` event kind |
| 16 | Visual and interaction design | No tables |
| 17 | Trust and authenticity | `isDemo` on 13 models. Verification fields on `Instructor`, `ExpertCredential`, `Partner`, `Project`, `MemberSkill` and `Testimonial`. `Product.stockConfirmedAt` (no scarcity claims without confirmed stock) and `User.excludeFromMetrics`. Keyed `Session.ipHash`; `Referral.signupIp` is nulled |
| 18 | Admin control centre | No tables of its own. It uses the review queues: `ContributorApplication`, `ContentSubmission`, `EvidenceSubmission`, `Partner`, `Opportunity`, submitted `LiveEvent` rows and `Post` rows in review. Plus `Announcement`, `NotificationTopic`, the audit actions (e.9) and the grouped navigation (e.8) |
| 19 | Engagement analytics | `MemberActivityDay`, `AnalyticsDaily`, `EngagementCounterDay`, `Order.paidAt`, `User.excludeFromMetrics` |
| 20 | Execution instructions | Sections c and d: migration order and seeds |
| 21 | Definition of done | Members join academies (`AcademyMembership`). Section c.4 lists what was verified |

### 0.4 What was checked

- `prisma format` and `prisma validate` (Prisma 6.19.3) pass on the merged schema.
- **The first draft** was checked on a private PostgreSQL 16 cluster, outside the repository, on a Unix socket only, against the 12-migration base.
  - **A database with data.** It held the 12 existing migrations and the seeds of that time. It also holds fixture rows for the cases a backfill could get wrong:
    - an enrolment that was dropped
    - XP events of four sources
    - a mission completion with a legacy key
    - challenge submissions in JSON, one reviewed by an account that no longer exists
    - four orders: a THC order, a rupee order with two `order.paid` audit rows, a manually settled order now FULFILLED, and a pending order
    - a referral with `signupIp` and a session with `ipHash`
    - posts and comments, one of them hidden
    - the `community.archived` setting
    - a future-dated blog post and a draft one

    The nine draft migrations were applied in order, each in one transaction as `migrate-sql.ts` does. Every backfill was checked row by row (c.4).
  - **An empty database.** All 21 migrations (12 existing, 9 draft) applied, then the seeds of that time ran.
  - **Drift.** `prisma migrate diff` from the migrated database to the schema leaves only five lines of the form `ALTER TABLE "X" ALTER COLUMN "searchVector" DROP DEFAULT`. This is how Prisma 6 reports a generated column. Nothing else drifts.
  - **Behaviour tests.**
    - The notification coalescing insert works.
    - The mentor overlap exclusion works.
    - 15 constraint cases are refused as intended.
    - Full-text search finds the right posts.
    - Deleting a user cascades as designed. (The review changed one rule: a contributor's account now blocks the delete; see the rerun.)
- **The rerun after the review**, on the merged base. A throwaway database on the repo's PostgreSQL 16.15 server (`tycoonhood_plancheck_test`, dropped afterwards) took the 15 base migrations, the fixtures in `final/rehearse_fixtures.sql` and the ten files, in name order, each in one transaction. It checked what the review changed:
  - academy memberships: BACKFILL rows with `notify` false, and a dropped enrolment left out;
  - course academies, mission cadences (a 20-hour and a 72-hour cooldown both became DAILY and kept their cooldown) and the three kinds of occurrence key;
  - the evidence move in 000900: APPROVED with its reviewer, PENDING, and REJECTED with a deleted reviewer as null; `progress` kept only `checkins`;
  - the new defaults (`notify` false, `bookingMode` INSTANT, `sharedFields` empty, `cancellationHours` and `notAfter` nullable) and the plain index `OrderItem_registrationId_idx`;
  - the new CHECK constraints: a 200-hour cancellation window and a 400-day hold were refused, NULL and in-range terms accepted;
  - RESTRICT: deleting a user who has a `ContributorAccount` was refused, and allowed once that row was gone;
  - drift: exactly the five `searchVector` lines again.
- **Not checked.** The application and the vitest suite were not run against the new schema. The generated client and the code changes do not exist yet. The rerun did not repeat the empty-database seed run or the first draft's behaviour tests; the SQL those exercised is unchanged apart from what the rerun covered.

### 0.5 Defects found, and where this model departs from LEAD_DECISIONS

**Defects in the existing code and data.** Each comes with the smallest change that fixes it.

1. **Raw IP addresses are stored, which breaks a house rule.**
   - Where: `apps/web/app/(auth)/actions.ts:90-91` passes the raw IP from `deviceInfo()` to `referrals.attach(user.id, code, ip)`, and `growth/referrals.ts:75,91` writes it to `Referral.signupIp`. Nothing reads the column.
   - Smallest change: remove the `ip` parameter from `attach` and from its caller. Migration 000100 nulls the column, and a later migration drops it.
2. **`Session.ipHash` can be reversed.**
   - Where: `auth/session.ts:35` stores `sha256(ip).slice(0, 32)`. An unkeyed hash of an IPv4 address can be reversed by hashing all 2^32 addresses.
   - Smallest change: `ipKey()` becomes an HMAC with a server secret (e.10). Migration 000100 nulls the old values.
3. **`docs/DATABASE.md` gets the paid time wrong.** It says paid time is read from `Payment.createdAt`, but `checkout.ts` creates `Payment` rows when the order is started (status CREATED).
   - Smallest change: add `Order.paidAt`, set when an order becomes PAID. Migration 000100 backfills it from the ledger transaction (THC) and from the first `order.paid` or `order.settle_manual` audit row (rupees).

4. **`rewards.ts` writes mission completions without an occurrence.** `packages/core/src/rewards/rewards.ts:73` creates `MissionCompletion` with `userId`, `missionId` and `idempotencyKey` only. Migration 000400 makes `occurrence` NOT NULL, so every mission payout would fail.
   - Smallest change: pass `occurrence` (the value the function already computes for the key) in the same commit as the migration. It is the only production write site.
5. **Payout code assumes every payout has an affiliate.** `PayoutRequest.affiliateId` becomes nullable, because a payout now has an affiliate or a contributor (`PayoutRequest_one_payee`). Typecheck then fails where code reads it as a string.
   - Where: `earn/affiliates.ts:212-213`, `:824`, `:897` and `:981`; `apps/web/app/(app)/admin/earn/page.tsx:54` and `:256-269`.
   - Smallest change: affiliate queries filter `affiliateId: { not: null }`, and the code narrows the value before use. Contributor payouts get their own queries (MONEY).
6. **One test expects the UTC fallback.** `packages/core/test/rules-engine.test.ts:246-249` ("falls back to UTC on a garbage zone") expects UTC. After e.4 the fallback is India time; the test changes with `time/day.ts` (P0c).

**Departures from LEAD_DECISIONS.** Each one is deliberate and comes with its reason.

1. **The four `Academy` rows are inserted by migration 000100**, not only by a seed. The academy backfills in the same migration need the rows to exist. `seed-taxonomy.ts` holds the same rows, create-only, and a test checks the two are equal.
2. **Event kinds are a table (`EventKind`), not an enum, and its one-to-one row is inserted by migration 000300.** LEAD #4 says only "kind". As a table, staff can add a kind without a migration. Booking code needs the one-to-one row in every database built from migrations, and a partial unique index allows only one ONE_TO_ONE kind.
3. **The taxonomy seed runs on every production deploy, not once. This fixes a defect in LEAD_DECISIONS.** The LEAD rule is that production seeds run once, on the first production deploy, under SEED_ON_DEPLOY. With that rule, a skill or event kind added in a later release would never reach production (workstreams D5). The seed is create-only, so running it again changes nothing that staff edited. It also records what it made (`SeedRecord`, from the `fix/seed-review` branch), so a row that staff renamed or deleted is never made again.
4. **Opportunity kinds follow the directive's ten (§7)** instead of LEAD #6's examples. `FREELANCE_PROJECT` replaces `PROJECT`, as workstreams N5 recommends.
5. **Grants are derived from rows; there is no grant table.** LEAD #14's grant names (mentor, contributor, partner) are kept. Each grant is read from the expert and partner rows the member already has, so there is no separate grant table and no `CapabilityGrant` table as in the workstreams plan. This gives one source of truth: suspending a mentor or a partner removes the grant on the member's next request. Grants for staff areas would need a table; that is open question 6 (owner decision O37, default: not built).
6. **One product kind, `LIVE_EVENT`, covers paid sessions and paid events** (LEAD #15). There are not two kinds such as SESSION and EVENT. LEAD #4 rules out the word "session", and both are `LiveEvent` rows.
7. **There is no `CourseSkill` join table.** LEAD #8 lists "modules/courses". A course's skills are the union of its modules' skills (`ModuleSkill`), so a second join table could only drift from them.
8. **`isDemo` is on 13 models, not on every model that can show sample content.** `CommunityPost` and `CommunityComment` do not carry it, because a demo post always has a demo author and the filter goes through `author.isDemo`. `Post` does carry it, because a byline can be a plain name.

**The workstreams plan (W0 to W3, and sections 7 to 10 of this document).**
- The defects D1 to D6 that the plan finds in LEAD_DECISIONS (section 1.4) are allowed for:
  - D1 (demo seed guard) in d.3.
  - D2 (a host could block a bad review by marking NO_SHOW): `EventRegistration` gains `memberConfirmedAt` and the `attendanceDispute*` fields, and `AttendanceSource` has `JOIN_LINK` and `MEMBER_CONFIRMED`.
  - D3 (the CREATOR label) in e.1.
  - D4 (no frequent dispatcher) in e.5.
  - D5 (taxonomy seeds that run only once) in d.1 and departure 3 above.
  - D6 (paid financial-literacy guidance) in d.1.2: `MentorCategory.paidAllowed` and `disclaimer`, with `EventRegistration.disclaimerAckAt` (owner decision O39).
- One gap in the plan is closed here. Its time-zone rule ("a change applies from the next local midnight") does not say which zone's midnight. The schema it assumes keeps only `Profile.timezone`, so once a member saves a new zone, nothing records the zone that must stay in force until the switch. `Profile.previousTimezone` and `Profile.timezoneEffectiveAt` record both. `nextZoneCutover` (e.4) picks a switch point at which the member's day key neither goes back nor skips a day.
- Section f lists every name on which this model and the plan differ.

### 0.6 Conventions

- **Tags.** Every new model and enum has a `/// §N` tag at the start of its doc comment. Every block of new fields on an existing model starts with `// ---- Living ecosystem (directive §...) ----`. The schema's numbered section headers continue from 17 to 26.
- **Types.** Ids are cuid strings. Money is in integer paise (`...Cents Int`) and THC amounts are `BigInt`. Long text is `@db.Text`. Calendar dates are `@db.Date`.
- **onDelete.**
  - `Cascade` for rows a member or a parent owns.
  - `SetNull` for references to an actor, reviewer or editor. History survives when a staff account is removed.
  - `Restrict` where a delete would move or orphan public content: a community post's group, an opportunity's partner, a live event's kind.
- **Soft states.** Anything with history is closed with a timestamp (`archivedAt`, `revokedAt`, `leftAt`, `hiddenAt`) instead of being deleted.
- **Review queues.** Every review queue has a status, `reviewedAt`, `reviewedById` and a reason field that the submitter sees.
- **Privacy.** No table stores a raw IP or a full user agent. Tokens are stored as sha256 hashes.
- **Hand-written SQL.** CHECK constraints, partial unique indexes and the exclusion constraint are hand-written, because Prisma does not model them. `prisma migrate diff` ignores them.
- **Full-text search.** Search columns are `Unsupported("tsvector")?` with `@@index([searchVector], type: Gin)` in the schema, and `GENERATED ALWAYS AS (...) STORED` in the SQL. The client never writes them.

### 0.7 What the review changed

The review (`plan/critique.md`) raised 36 issues. Every one was accepted except one part of issue 18 (below). These are the changes to this model; the plan's changes are in W1.8.

| Issue | Change |
|---|---|
| 1 (R007) | `Product.academyId` (SET NULL), so academy and programme pages can list products linked to the academy |
| 2 (SEBI) | `MentorCategory.disclaimer` and `paidAllowed`; `MentorOffering.categoryId`; `EventRegistration.disclaimerAckAt`. Financial-literacy offerings are free only until the owner decides (O39) |
| 3 (names) | Section f now lists the plan's names that this model replaced; they are binding. `GroupAction` gains `createEvent` and `createChallenge` (e.2) |
| 11 | `Course.academyId` is the source of truth; the authoring service sets `pillar` from it (e.7) |
| 15 | The migrations are renamed to `20261113...` and built against the merged base |
| 16 | The evidence move leaves 000400 for its own file, 000900, which lands with DAILY-B. The code the schema breaks is listed in 0.5 (items 4 to 6) and fixed in the commit that lands the schema |
| 17 | `MentorProfile.bookingMode` defaults to INSTANT. REQUEST is built too, with the hold and cap rules in the model's doc comment |
| 18 | `RevenueShareAgreement.holdDays`, `minPayoutCents` and `refundWindowHours`, and `MentorProfile.cancellationHours`, with range checks. **Rejected:** a separate `platformFeeBps`. The platform keeps exactly 10000 − `contributorShareBps`; a second field could disagree with it |
| 19 | `OrderItem.registrationId` is a plain index, not unique: a registration can have a cancelled order and then a paid one. One PENDING or PAID order per registration is enforced in code, under a row lock on the registration |
| 20 | `ScheduledNotification.notAfter`: a stale reminder is skipped, and quiet hours never push a row past it |
| 21 | `ProjectCollaborator` and `ProjectCollaboratorStatus` |
| 22 | `AcademyMembership.notify`, false for BACKFILL and ENROLMENT, true for SELF and ONBOARDING |
| 23 | The mission backfill keeps `cooldownHours`. DAILY-A honours a cooldown above 24 hours as a minimum gap; at 24 hours or less the day key decides |
| 24 | `GroupMemberStatus.INVITED` and `GroupMembership.invitedById` |
| 25 | `OpportunityApplication.sharedFields` (`ApplicantContactField[]`) replaces a single share-contact flag |
| 26 | Rows are cancelled by subject (`cancelForSubject`, index on `subjectType, subjectId`), never by a key prefix |
| 27 | `ContributorAccount.user` is RESTRICT. Account deletion anonymises a contributor instead, as the published privacy policy promises (O36) |
| 30 | Only an approved mentor (`MentorProfile` ACTIVE with `approvedAt`) holds `progression.verify` (e.1) |
| 31 | Event feedback is public only when the host or a check-in recorded attendance, or a member's own confirmation is over 7 days old with no dispute (e.3) |
| 32 | `Instructor.photoSha256`. Changing `photoUrl` clears `photoVerifiedAt` and the hash; a daily sweep re-fetches verified photos and clears verification when the bytes change |
| Feed | `ActivityEvent @@index([courseId, occurredAt])` for the course feed scope |

### a.1 New models: index

The migration column says which migration creates the table. The text is the first line of the model's doc comment.

| Section | Model | Migration | Directive tag | What it holds |
|---|---|---|---|---|
| 17. Academies | `Academy` | 000100 | §3 | A learning academy (Warrior, Business, Wealth, Wellness). |
| 17. Academies | `AcademyMembership` | 000100 | §3/§21 | Members join any number of academies. Leaving is soft. |
| 18. Notification centre | `NotificationTopic` | 000100 | §13 | Staff-editable label and default channels for one topic of the code catalogue (packages/core/src/platform/notification-topics.ts). The catalogue decides which topics exist and which are locked; a missing row falls back to catalogue defaults. |
| 18. Notification centre | `NotificationPreference` | 000100 | §13 | A member's override for one topic on one channel. No row = the topic default. |
| 18. Notification centre | `NotificationSettings` | 000100 | §13 | Digest, quiet hours, pause and one-click unsubscribe. Created on first change or first email. |
| 18. Notification centre | `PushSubscription` | 000100 | §13 | A web push endpoint. Built but inert until VAPID keys exist (OQ-K). |
| 18. Notification centre | `Announcement` | 000100 | §13/§18 | A stored, scheduled, audience-targeted, retractable announcement. Replaces fire-and-forget cms.announce. |
| 18. Notification centre | `ScheduledNotification` | 000100 | §13 | The one outbox for timed and out-of-band delivery (LEAD #5). A row is either a scheduled notice (channel null: at runAt the gateway delivers it on every channel the member's preferences then allow) or one EMAIL/PUSH copy of a notice (channel set). Used by event and mentoring reminders, challenge deadlines, goal nudges, digests and the email/push copies of immediate notices. |
| 19. Activity feed and analytics | `ActivityEvent` | 000100 | §4/§10/§11 | One item of the member-facing feed. Privacy is applied on read, so turning a facet off hides past items too. |
| 19. Activity feed and analytics | `MemberActivityDay` | 000100 | §19 | One row per member per platform day (IST) on which they used the signed-in app. The source for DAU, WAU, MAU and retention. No IP, user agent, URL or device. |
| 19. Activity feed and analytics | `AnalyticsDaily` | 000100 | §19 | Immutable daily rollup. Counts use countableMemberWhere (no staff, suspended, excluded or demo accounts); money counts LIVE payments only. |
| 19. Activity feed and analytics | `EngagementCounterDay` | 000100 | §19 | Anonymous daily counters that give funnels a denominator. No user id. |
| 20. Progression and identity | `Skill` | 000200 | §8/§7 | A skill. academyId null = cross-academy. |
| 20. Progression and identity | `ModuleSkill` | 000200 | §8 | Curriculum modules teach skills. A course's skills are its modules' skills. seed-academy recreates these rows whenever it rebuilds modules. |
| 20. Progression and identity | `ChallengeSkill` | 000200 | §8/§5 |  |
| 20. Progression and identity | `MemberSkill` | 000200 | §8/§7 | A member's standing in one skill. DECLARED comes from the member; higher levels are recomputed from evidence; VERIFIED needs someone other than the member. |
| 20. Progression and identity | `Project` | 000200 | §8/§4/§12 | A member's project or portfolio piece (also a contributor's showcased work). The showcase is a view over published, VISIBLE, PUBLIC/MEMBERS projects. |
| 20. Progression and identity | `ProjectCollaborator` | 000200 | §12/§4 | A member the project owner invited. Shown only after they accept, and only where their own `projects` facet allows it. Declining or removal hides them again. |
| 20. Progression and identity | `ProjectSkill` | 000200 | §8 | Skills a project claims; they count only once the project is VERIFIED. |
| 20. Progression and identity | `RankAward` | 000200 | §8 | Why a member holds a rank. User.rankId stays the cache; ranks never demote. |
| 20. Progression and identity | `LearningPath` | 000200 | §3 | An ordered route through an academy's material. Duration is computed from the steps. |
| 20. Progression and identity | `LearningPathStep` | 000200 | §3 | One step of a path pointing at real content. A target that is deleted becomes null (SetNull) and the admin flags the step. |
| 20. Progression and identity | `LearningPathFollow` | 000200 | §3 | A member following a path. Progress is derived, never stored. |
| 21. Mentors and contributors | `MentorProfile` | 000300 | §2 | Mentor-specific settings and standing, 1:1 with the expert profile. |
| 21. Mentors and contributors | `MentorCategory` | 000300 | §2 | The directive's ten mentor categories, as data (seed-taxonomy.ts). |
| 21. Mentors and contributors | `MentorCategoryLink` | 000300 | §2 | One primary category per mentor (partial unique index). |
| 21. Mentors and contributors | `ExpertCredential` | 000300 | §2 | A qualification. Public only when VERIFIED ("qualifications where verified"). |
| 21. Mentors and contributors | `ContributorApplication` | 000300 | §2/§12 | One application flow for mentors, instructors and creators. |
| 21. Mentors and contributors | `ContributorAccount` | 000300 | §2/§12 | The private payee record of an approved contributor, kept apart from the public profile so payout data never leaks through profile queries. |
| 21. Mentors and contributors | `RevenueShareAgreement` | 000300 | §2/§12 | The contributor's share for a scope. contributorId null = platform default. No row is seeded: paid offerings stay unpublishable until staff set terms (LEAD #15). |
| 21. Mentors and contributors | `ContributorEarning` | 000300 | §2/§12 | Money a contributor earns from one paid order line, in INR paise. Held, then approved by staff, like Commission. Lines paid in TEST mode are never payable. |
| 21. Mentors and contributors | `MentorOffering` | 000300 | §2 | What a member can book or join: format, length, seats and an honest price. |
| 21. Mentors and contributors | `MentorAvailabilityRule` | 000300 | §2 | A mentor's recurring weekly availability in their own zone: the only source of bookable slots, so availability is never invented. |
| 21. Mentors and contributors | `MentorAvailabilityException` | 000300 | §2 | Dated changes to the weekly rules: time off, or extra one-off availability (UTC instants). |
| 21. Mentors and contributors | `CourseCohort` | 000300 | §2 | A dated, mentor-led run of a course with its own members, sessions and channel. |
| 21. Mentors and contributors | `ContentSubmission` | 000300 | §12 | One review queue: contributor course submissions, edits to published courses by authors without trustedAuthor, and contributor resources. Events, posts, projects, opportunities, applications and partners keep their own status and join the admin review inbox as a read model. |
| 21. Mentors and contributors | `CalendarFeedToken` | 000300 | §2/§6 | A private ICS feed of a member's registrations and a host's events. Only the hash is stored. |
| 22. Live events | `EventKind` | 000300 | §6 | Event kinds as data. Exactly one row has mode ONE_TO_ONE (slug "one-to-one", inserted by migration); the others are seeded by seed-taxonomy.ts. |
| 22. Live events | `LiveEvent` | 000300 | §6/§2 | Every scheduled live thing: mentor 1:1s, group mentoring, workshops, masterclasses, AMAs, live classes, meetups, founder sessions. Named LiveEvent because `events` is the EventBus. Times are UTC; `timezone` is the host's zone for display. |
| 22. Live events | `LiveEventHost` | 000300 | §6 | Who runs an event. Publishing needs at least one confirmed host; a guest speaker without an account is named only after staff confirm them. |
| 22. Live events | `EventRegistration` | 000300 | §6/§2 | A seat, a waitlist place or a 1:1 booking, and its attendance. |
| 22. Live events | `EventFeedback` | 000300 | §6/§2 | Feedback from a verified attendee only (registration ATTENDED). Also the mentor review. Public only when the host or check-in marked attendance, or memberConfirmedAt is over 7 days old with no dispute. |
| 22. Live events | `LiveEventSeries` | 000300 | §6 | A recurring programme on the open schedule. It never invents dates: each dated session is its own LiveEvent, and cadenceNote is the owner's own wording. |
| 22. Live events | `EventInterest` | 000300 | §6/§2 | "Tell me when": a member asks to hear when a matching real event or mentor slot is published. |
| 23. Daily activity engine | `DailyPlan` | 000400 | §5/§11 | The member's activities for one local day, generated once on first view. |
| 23. Daily activity engine | `DailyPlanItem` | 000400 | §5 | One chosen activity with an honest reason. Done-state is derived from real rows. |
| 23. Daily activity engine | `Goal` | 000400 | §5/§9/§11 | A personal goal, private by default; progress is derived from real rows. |
| 23. Daily activity engine | `GoalCheckIn` | 000400 | §5 | A manual check-in on the member's day. |
| 23. Daily activity engine | `EvidenceSubmission` | 000400 | §5 | One piece of evidence for a REVIEW mission or a SUBMISSION / GATED_SUBMISSIONS challenge. Replaces ChallengeParticipation.progress.submissions (moved by migration). |
| 24. Live community | `Follow` | 000500 | §4 | Following a member (mentors are members too). CHECK: no self-follow. |
| 24. Live community | `MemberBlock` | 000500 | §4/§17 | A block removes follows both ways, prevents re-following, and hides the blocked member's activity and notices from the blocker. CHECK: no self-block. |
| 24. Live community | `SavedPost` | 000500 | §4 | Saved posts (a project is saved through its discussion post). |
| 25. Opportunity marketplace | `Partner` | 000600 | §7 | An organisation or person that posts opportunities, with its own PENDING -> VERIFIED review. |
| 25. Opportunity marketplace | `PartnerMember` | 000600 | §7 | Rights scoped to one partner (the partner dashboard). Partners are not a UserRole. |
| 25. Opportunity marketplace | `Opportunity` | 000600 | §7 | One listing in the opportunity marketplace. |
| 25. Opportunity marketplace | `OpportunitySkill` | 000600 | §7 | Required and nice-to-have skills of a listing. |
| 25. Opportunity marketplace | `OpportunityApplication` | 000600 | §7 | A member's application, and its status. |
| 25. Opportunity marketplace | `OpportunityApplicationEvent` | 000600 | §7 | The status timeline an applicant sees, and the trail of partner decisions. |
| 25. Opportunity marketplace | `SavedOpportunity` | 000600 | §7 | Saved opportunities (like WishlistItem). |
| 26. Editorial engine and Guide | `PostRevision` | 000700 | §14 | Edit history, written on every save of a draft and before publishing. |
| 26. Editorial engine and Guide | `PostCategory` | 000700 | §14 | Editorial categories (seed-taxonomy.ts). |
| 26. Editorial engine and Guide | `Tag` | 000700 | §14 | Free-form tags. |
| 26. Editorial engine and Guide | `PostTag` | 000700 | §14 |  |
| 26. Editorial engine and Guide | `HelpArticle` | 000700 | §9/§14 | FAQ and feature explanations as data: one source for /faq, the Guide and search. |
| 26. Editorial engine and Guide | `GuideConversation` | 000700 | §9 | A member's own Guide thread. Only the member sees it; deletable. |
| 26. Editorial engine and Guide | `GuideMessage` | 000700 | §9 | Questions and answers with sources, labelling, usage and feedback. |
| 26. Editorial engine and Guide | `GuideUsage` | 000700 | §9 | The daily question quota per member day (memberDayKey), in the database because the in-memory limiter counts per instance. |

### a.2 New enums: index

| Section | Migration | Enums |
|---|---|---|
| 17. Academies | 000100 | `AcademyJoinSource` |
| 18. Notification centre | 000100 | `NotificationChannel`, `NotificationPriority`, `DigestFrequency`, `ScheduledNotificationStatus`, `AnnouncementPriority`, `AnnouncementAudience`, `AnnouncementStatus` |
| 19. Activity feed and analytics | 000100 | `ActivityEventKind`, `ActivityAudience` |
| 20. Progression and identity | 000200 | `SkillLevel`, `SkillVerifiedVia`, `ProjectKind`, `ProjectVisibility`, `ProjectVerificationStatus`, `ProjectCollaboratorStatus`, `RankAwardReason`, `AchievementKind`, `PathStepKind` |
| 21. Mentors and contributors | 000300 | `ExpertStatus`, `ContributorKind`, `ContributorApplicationStatus`, `ContributorAccountStatus`, `MentorStatus`, `BookingMode`, `CredentialKind`, `CredentialStatus`, `AvailabilityExceptionKind`, `RevenueScope`, `CourseDelivery`, `CohortStatus`, `ContentSubmissionType`, `ContentSubmissionStatus`, `ResourceAudience`, `OrderSource` |
| 22. Live events | 000300 | `EventMode`, `LiveEventFormat`, `LiveEventStatus`, `LiveEventVisibility`, `LiveEventHostRole`, `EventRegistrationStatus`, `AttendanceSource` |
| 23. Daily activity engine | 000400 | `MissionCadence`, `MissionVerification`, `MissionKind`, `PlanSlot`, `PlanItemKind`, `GoalMetric`, `GoalCadence`, `GoalStatus`, `GoalSource`, `ChallengeKind`, `ChallengeScope`, `ChallengeCadence`, `EvidenceStatus` |
| 24. Live community | 000500 | `CommunityPostKind`, `GroupTopic`, `GroupStatus`, `GroupJoinPolicy`, `GroupVisibility`, `GroupRole`, `GroupMemberStatus`, `GroupNotifyLevel` |
| 25. Opportunity marketplace | 000600 | `PartnerKind`, `PartnerStatus`, `PartnerVerificationMethod`, `PartnerMemberRole`, `OpportunityKind`, `WorkMode`, `CompensationType`, `OpportunityApplyMode`, `OpportunityStatus`, `OpportunityApplicationStatus`, `ApplicantContactField` |
| 26. Editorial engine and Guide | 000700 | `PostKind`, `PostStatus`, `ConsentSource`, `HelpTopic`, `HelpAudience`, `GuideMode`, `GuideRole`, `GuideMessageKind`, `GuideFeedback` |

The values of every new enum are in Appendix B. Where a value's meaning is not obvious it has a doc comment.

### b.2 Changes to existing models: summary

"New column" counts include generated columns. "changed" means a column whose type or nullability changes. Changes that only add a relation name or a doc comment are not counted.

| Model | Change |
|---|---|
| `User` | 2 new columns in 000100 |
| `Session` | no DDL (relation names and doc comments only) |
| `Profile` | 10 new columns in 000100 |
| `Course` | 1 new column in 000100; 1 new column in 000300 |
| `CourseModule` | no DDL (relation names and doc comments only) |
| `Lesson` | 1 new column in 000700 |
| `Resource` | 6 new columns in 000300 |
| `Enrollment` | 2 new columns in 000300 |
| `XpEvent` | 1 new column in 000100 |
| `RankDefinition` | 2 new columns in 000200 |
| `Achievement` | 6 new columns in 000200 |
| `UserAchievement` | 4 new columns in 000200 |
| `Challenge` | 1 new column in 000100; 16 new columns in 000400 |
| `ChallengeParticipation` | no DDL (relation names and doc comments only) |
| `Mission` | 21 new columns in 000400 |
| `MissionCompletion` | 4 new columns in 000400 |
| `Notification` | 10 new columns in 000100 |
| `Product` | 3 new columns in 000100 |
| `Order` | 1 new column in 000100; 1 new column in 000300 |
| `OrderItem` | 1 new column in 000300 |
| `Post` | 29 new columns in 000700 |
| `Referral` | no DDL (relation names and doc comments only) |
| `Channel` | 1 new column in 000300 |
| `Instructor` | 19 new columns in 000300 |
| `PayoutRequest` | 1 new column in 000300; changed: affiliateId |
| `CommunityCategory` | 1 new column in 000100; 1 new column in 000500 |
| `CommunityGroup` | 1 new column in 000100; 1 new column in 000300; 18 new columns in 000500 |
| `GroupMembership` | 9 new columns in 000500 |
| `CommunityPost` | 1 new column in 000100; 7 new columns in 000500 |
| `CommunityComment` | 2 new columns in 000500 |
| `ContentReport` | 1 new column in 000500 |
| `ContactMessage` | no DDL (relation names and doc comments only) |
| `Testimonial` | 9 new columns in 000700 |

### c.1 Migrations: order, names and why

The names follow the existing pattern `YYYYMMDDHHMMSS_snake_name`. They sort after the last migration on the merged base, `20261112110000_pending_email_at` from `build/full-platform`. That matters: `migrate-sql.ts` applies folders in name order, and on a database that already has newer migrations it applies an older-named pending folder after them, out of order. Dating these 13 November keeps every database on one order.

| # | Folder | What it holds | Why it sits here |
|---|---|---|---|
| 0 | `20261113000000_ecosystem_enum_values` | 9 `ALTER TYPE ... ADD VALUE` statements and nothing else | A value added inside a transaction cannot be used in that transaction |
| 1 | `20261113000100_platform_foundation` | Academies (rows plus backfills); the notification centre; the activity feed and analytics tables; profile fields; `Order.paidAt`; confirmed stock; the two privacy clean-ups | Almost every later table references `Academy`, and every later feature sends notifications |
| 2 | `20261113000200_progression` | Skills, member skills, projects, rank awards, achievement kinds, learning paths | Mentors (300), challenges (400) and opportunities (600) link to `Skill` |
| 3 | `20261113000300_mentors_events` | The expert profile, mentors, contributors, revenue terms and earnings, cohorts, the content review queue, calendar feeds, and the whole `LiveEvent` family | These reference each other: a `LiveEvent` points at a `MentorProfile`, `MentorOffering` and `CourseCohort`; a `ContributorEarning` points at an `EventRegistration`; `Resource` and `OrderItem` point at events. Splitting them would create a cycle |
| 4 | `20261113000400_daily_engine` | Mission and challenge extensions, evidence, daily plans, goals | Plan items and evidence reference live events (300) and skills (200) |
| 5 | `20261113000500_community` | Post kinds and replies, group extensions, follows, blocks, saved posts | Group columns reference `Course` and `Instructor`. The changed group foreign key is kept away from the foundation migration |
| 6 | `20261113000600_opportunities` | Partners, opportunities, applications | References skills (200), challenges (400) and courses |
| 7 | `20261113000700_editorial_guide` | The post workflow, categories, tags, revisions, testimonial consent, help articles, the Guide tables, full-text search on lessons, posts and help | Posts reference live events (300) and instructors |
| 8 | `20261113000800_live_event_overlap_guard` | `btree_gist` and the mentor double-booking exclusion constraint | Kept alone, so it can be left out of a release if the production database refuses the extension, without touching anything else |
| 9 | `20261113000900_challenge_evidence_move` | Copies the JSON challenge submissions into `EvidenceSubmission` and removes them from `ChallengeParticipation.progress` | It lands in the same commit as the code that reads and writes `EvidenceSubmission` (DAILY-B). Until then `gamification/challenges.ts` reads `progress.submissions`; moving them in 000400 would break the existing challenge pages for all of Phases 1 and 2 |

No foreign key or enum column in any migration points at a table or type created by a later one. This was checked from the schema by script, then confirmed by applying the files in order to an empty database.

### c.5 Deploy notes

- **Build order.** Since `fix/seed-review` (merged through full-platform), `scripts/vercel-build.sh` migrates and seeds inside `migrate_and_seed()`, which runs under the deploy lock (`node scripts/with-db-lock.mjs bash scripts/vercel-build.sh --migrate-and-seed`). The function changes to:
  1. `pnpm db:migrate:sql`
  2. `pnpm db:seed:taxonomy`, on every production build
  3. the existing `SEED_ON_DEPLOY` block, unchanged, still for the first deploy only

  The taxonomy seed therefore runs under the same lock as the migrations, so two builds at once cannot both create the same row. Preview builds still never touch the database. `scripts/deploy-db.mjs` gets the same step straight after "apply migrations", and `DEPLOY_SEEDS` in `packages/core/test/throwaway-db.ts` starts with it (d.1).
- **Live production.** These migrations assume that no older build writes to the database after they have run. That is true for the first production deploy, because production has never run; the parent task "watch production deploy" is still open. If a production build goes live before these migrations ship, deploy them in a short maintenance window. Otherwise split three changes into a second migration that ships with the code that writes the new columns:
  - `MissionCompletion.occurrence` SET NOT NULL. An older build inserts completions without it.
  - The RESTRICT on `CommunityPost.groupId`. An older build may delete groups.
  - The `Post.status` backfill. Posts an older build publishes would stay DRAFT under the new reading rule.
- **000900 lands later.** It is committed with DAILY-B. Every database built before then, the stream databases and the lead's, applies it when DAILY-B merges. It only copies rows and removes a JSON key, so it is safe on a database where members made challenge submissions in the meantime.
- **Schema changes after P0.** A later change is a new migration file named after the last one. No file that has been applied anywhere is edited: `migrate-sql.ts` checksums each file, comments included, and refuses one whose checksum changed. Stream databases are recreated with `scripts/db/create-stream-db.mjs`.
- **`btree_gist`.** Neon lists it among its supported extensions. Confirm it on the production branch before the first deploy. If it is refused, leave 000800 out: the booking code's row lock on `MentorProfile` still prevents double booking.
- **Drift checks.** Any script that runs `prisma migrate diff --exit-code` between the migrations and the schema must ignore the five `ALTER COLUMN "searchVector" DROP DEFAULT` lines. The smallest change is to filter exactly those lines before deciding.
- **Session hashes.** Nulling `Session.ipHash` empties the history that `earn/affiliates.ts:540-545` compares when it looks for self-dealing. New sessions refill it within the window. Before launch this has no effect.
- **Rollback.** Every migration is additive apart from the two constraint changes in b.1. Code that predates them keeps working against the new schema. The exceptions are the three changes listed under "Live production" above.

---

## 5. Foundation contracts (data-model section e)

These are the shared pieces that every stream builds on. The lead owns `permissions.ts`, `guard.ts`, `admin-nav.ts`, `audit.ts` and `notify.ts`; the other files below are new and also belong to Phase 0. Each entry gives the path, the exact signature and the rule it enforces.

Notation used in the signatures:

```ts
import type { Prisma, PrismaClient } from "@tycoonhood/db";
type Db = PrismaClient | Prisma.TransactionClient; // every `db?: Db` defaults to the shared client
```

### e.1 Permissions and grants

**`packages/core/src/auth/permissions.ts`** (changed). The existing 13 permissions stay. Nine staff permissions and four member capabilities are added, 26 in all.

```ts
export type Permission =
  // existing (13)
  | "admin.access" | "admin.users" | "admin.economy" | "admin.commerce" | "admin.earn"
  | "admin.content" | "admin.analytics" | "admin.audit"
  | "courses.author" | "courses.manage" | "courses.publish"
  | "community.moderate" | "community.announce"
  // staff areas (9)
  | "academies.manage"     // academies, learning paths, the skill catalogue
  | "contributors.review"  // contributor applications, credentials, identity and photo checks
  | "mentors.manage"       // mentor profiles, mentor categories, offerings, bookings
  | "events.manage"        // every live event, event kinds, series, registrations, attendance disputes
  | "opportunities.manage" // partners, opportunities, applications
  | "content.write"        // write editorial posts and send them for review
  | "content.publish"      // approve, schedule, publish and archive editorial posts
  | "progression.verify"   // verify member skills and projects
  | "guide.review"         // read Guide conversations that a member flagged
  // member capabilities, reached through grants (4)
  | "studio.access"        // open /studio
  | "mentoring.host"       // keep a mentor profile, offerings and availability
  | "events.host"          // propose and host live events
  | "opportunities.post";  // post opportunities for a partner the member belongs to
```

| Role | Permissions |
|---|---|
| MEMBER, STUDENT, CREATOR | none (unchanged) |
| INSTRUCTOR | admin.access, courses.author, studio.access, events.host, content.write |
| MODERATOR | admin.access, community.moderate, community.announce, events.host |
| ADMIN | all 26 |

**Grants.** A grant is a capability that a member holds because of rows they already have, not because of their role (LEAD #14; departure 5).

```ts
export type Grant = "mentor" | "contributor" | "partner";

export const GRANT_TABLE: Record<Grant, readonly Permission[]> = {
  mentor: ["studio.access", "mentoring.host", "events.host", "content.write"],
  contributor: ["studio.access", "courses.author", "events.host", "content.write"],
  partner: ["opportunities.post"],
};
/** Held only by an approved mentor: the mentor grant, and MentorProfile ACTIVE with approvedAt set. */
export const APPROVED_MENTOR_PERMISSIONS: readonly Permission[] = ["progression.verify"];

export type HasRole = { role: UserRole; grants?: readonly Grant[]; mentorApproved?: boolean } | null | undefined;

/** Who is acting. Built from the session (getCurrentUser) or by actorFor() in scripts. */
export type Actor = {
  id: string;
  role: UserRole;
  grants?: readonly Grant[];
  mentorApproved?: boolean;
  instructorId?: string | null;
  mentorId?: string | null;
  partnerIds?: readonly string[];
};

/** The role table first, then each grant's list, then APPROVED_MENTOR_PERMISSIONS when mentorApproved. */
export function can(user: HasRole, permission: Permission): boolean;
export function hasGrant(user: HasRole, grant: Grant): boolean;
/** Every permission the user holds, role and grants together, for the admin overview and tests. */
export function permissionsOf(user: HasRole): Permission[];
```

- `assertCan`, `isStaff`, `promoteTo` and `ForbiddenError` do not change.
- `isAdmin` stays until `community/community.ts` (lines 148, 543-544, 554, 558, 583 and 603) asks `can(viewer, "admin.users")` instead. Then it is removed.
- `ROLE_LABEL.CREATOR` changes from "Creator / Affiliate" to "Affiliate" (workstreams D3; open question 5). A contributor is not a CREATOR. Approving a contributor or mentor application never changes `User.role`; a test checks this.
- `courses.author` held through the contributor grant is scoped exactly as DR-34 scopes it for INSTRUCTOR: `authoring.assertCanEditCourse` allows only courses whose `Instructor.userId` is the actor.

**`packages/core/src/auth/grants.ts`** (new):

```ts
export const GRANT_INCLUDE = {
  instructorProfile: {
    select: { id: true, status: true, contributorKinds: true, mentorProfile: { select: { id: true, status: true, approvedAt: true } } },
  },
  partnerMemberships: { select: { partnerId: true, role: true, partner: { select: { status: true } } } },
} satisfies Prisma.UserInclude;

export type ActorGrants = { grants: Grant[]; mentorApproved: boolean; instructorId: string | null; mentorId: string | null; partnerIds: string[] };

export function grantsFromUserRow(
  row: { suspendedAt: Date | null } & Prisma.UserGetPayload<{ include: typeof GRANT_INCLUDE }>
): ActorGrants;

/** For crons, scripts and tests: the same Actor that a request would see. Null for an unknown user. */
export async function actorFor(userId: string, db?: Db): Promise<(Actor & ActorGrants) | null>;
```

| Grant | Held when |
|---|---|
| `mentor` | `Instructor.status` is ACTIVE, `contributorKinds` contains MENTOR, and `MentorProfile.status` is DRAFT, ACTIVE or PAUSED |
| `contributor` | `Instructor.status` is ACTIVE and `contributorKinds` contains INSTRUCTOR or CREATOR |
| `partner` | the member has a `PartnerMember` row on a VERIFIED `Partner`. `partnerIds` lists those partners |

- A suspended user (`suspendedAt` set) holds no grants.
- `instructorId` is the linked `Instructor.id` while that profile is ACTIVE. `mentorId` is set only while the mentor grant holds.
- `mentorApproved` is true only while the mentor grant holds, `MentorProfile.status` is ACTIVE and `approvedAt` is set. A DRAFT or PAUSED mentor can prepare a profile and host, but cannot verify anyone's skills or projects.
- `ContributorAccount.status` governs payouts only. A suspended contributor account does not remove a grant.
- **Request path.** `sessions.resolve` (`auth/session.ts`) adds `GRANT_INCLUDE` to its `user` include, in the same query. `getCurrentUser()` (`apps/web/lib/auth.ts`) returns the user row merged with `grantsFromUserRow(user)`, so every existing `can(user, ...)` call sees grants without other changes.

**Replacing the remaining ADMIN-only checks.** These places still check for the ADMIN role instead of a permission. Each moves to the permission that matches its work:

| Where | Today | Becomes |
|---|---|---|
| `admin/actions.ts` `grantThcAction`, `grantXpAction`, `reverseTxAction` | local `requireAdmin()` | `actorWith("admin.economy")` |
| `admin/actions.ts` `setChallengeLifecycleAction`, `reviewSubmissionAction` | local `requireAdmin()` | `actorWith("admin.economy")` |
| `admin/actions.ts` `setCourseCoverAction` | local `requireAdmin()` | `actorWithAny("courses.author", "courses.manage")`, then `authoring.assertCanEditCourse(actor, courseId)` |
| `admin/actions.ts` `savePostAction` | local `requireAdmin()` | `actorWith("content.write")`, plus `content.publish` when the save publishes or schedules |
| `admin/actions.ts` `shipOrderAction` | local `requireAdmin()` | `actorWith("admin.commerce")` |
| `admin/missions/actions.ts` (2 actions) | local `requireAdmin()` | `actorWith("admin.economy")` |
| `admin/videos/actions.ts` (2 actions), `admin/videos/page.tsx`, `admin/economy/page.tsx`, `admin/missions/page.tsx`, `admin/challenges/page.tsx` | `requireAdmin()` | `requirePermission("admin.economy")` or `actorWith("admin.economy")` |
| `admin/content/page.tsx`, `admin/content/post/[postId]/page.tsx` | `requireAdmin()` | `requirePermission("content.write")` |
| `admin/standard/page.tsx`, `admin/standard/actions.ts` | `requireAdmin()`, and a `role !== "ADMIN"` test | `requirePermission("admin.content")` and `actorWith("admin.content")` |

After this, `requireAdmin` in `apps/web/lib/guard.ts` and the two local copies are deleted. `toggleCoursePublishAction` and `settlePendingFiatAction` already use `actorWith`.

### e.2 Guards and ownership

**`apps/web/lib/guard.ts`** (changed). Two functions are added; the existing ones stay.

```ts
/** Page gate: signed in, onboarded, and holding this grant. Otherwise redirect("/today"). Staff work in /admin instead. */
export async function requireGrant(grant: Grant): Promise<CurrentUser>;
/** Server-action gate: throws like actorWith instead of redirecting. */
export async function actorWithGrant(grant: Grant): Promise<CurrentUser>;
```

`CurrentUser` is the return type of `getCurrentUser()` without null. `/studio` pages call `requirePermission("studio.access")`; actions that change one row also call the scope check for that row.

**Scope checks** (core; each throws `ForbiddenError`):

```ts
// packages/core/src/live/access.ts
/** events.manage, or the actor is a LiveEventHost of the event (by userId, or by the actor's instructorId). */
export async function assertHostsEvent(actor: Actor, eventId: string, db?: Db): Promise<void>;

// packages/core/src/mentors/access.ts
/** mentors.manage, or mentorId is the actor's own mentor profile. */
export async function assertOwnsMentorProfile(actor: Actor, mentorId: string, db?: Db): Promise<void>;

// packages/core/src/opportunities/access.ts
/** opportunities.manage, or the actor's PartnerMember role on this VERIFIED partner is at least minRole (OWNER > EDITOR). */
export async function assertPartnerMember(actor: Actor, partnerId: string, minRole?: PartnerMemberRole, db?: Db): Promise<void>;

// packages/core/src/progression/access.ts
export async function assertCanVerify(
  actor: Actor,
  target: { userId: string; skillId?: string; projectId?: string },
  db?: Db
): Promise<void>;
```

`assertCanVerify` rules:
- Nobody verifies their own skill or project, staff included.
- `progression.verify` from the role table (ADMIN) passes for every academy.
- With `mentorApproved` (e.1), and only then, the skill's academy (or the project's academy) must be the academy of one of the mentor's categories (`MentorCategoryLink` to `MentorCategory.academyId`). A skill with no academy, such as `sleep-and-recovery`, is open to any mentor.
- A mentor's verification records `verifiedVia = MENTOR_ASSESSMENT` and must cite evidence in `MemberSkill.evidence`: a project, an evidence submission, or a mentoring event the member attended.

**Group roles** (`packages/core/src/community/group-roles.ts`, new):

```ts
export type GroupAction =
  | "post" | "announce" | "moderate" | "invite" | "approve" | "edit" | "archive" | "createEvent" | "createChallenge";
export const GROUP_ROLE_TABLE: Record<GroupRole, readonly GroupAction[]> = {
  OWNER: ["post", "announce", "moderate", "invite", "approve", "edit", "archive", "createEvent", "createChallenge"],
  MODERATOR: ["post", "announce", "moderate", "invite", "createEvent", "createChallenge"],
  MEMBER: ["post"],
};
/** False for a missing or non-ACTIVE membership, and for a group that is archived or not ACTIVE. */
export function groupCan(
  member: Pick<GroupMembership, "role" | "status"> | null,
  group: Pick<CommunityGroup, "status" | "archivedAt">,
  action: GroupAction
): boolean;
```

Staff with `community.moderate` act on any group through the community services, not through `groupCan`. `createEvent` and `createChallenge` let a group's owner and moderators create a group-only meetup (LIVE-A: visibility GROUP, published to the group without staff review; anything wider is SUBMITTED for `events.manage`) or a group challenge (DAILY-B: scope GROUP, with no THC reward and XP within the engagement limits). GROUPS calls them through those services.

**DR-34 is reused, not replaced.** `authoring.canEditCourse`, `authoring.assertCanEditCourse`, `editableCoursesWhere`, `liveCourseBlock` and `authoring.linkInstructorUser` stay as they are. Their actor types (`Editor`, `AuthoringActor` = `{ id, role }`) gain `grants?: readonly Grant[]`, so the contributor grant's `courses.author` reaches the existing `mayEdit` check.

### e.3 Authenticity

**`packages/core/src/platform/authenticity.ts`** (new). Every public page and every count shown to members reads through these helpers, so no demo row, unverified expert or unconfirmed claim reaches a visitor.

```ts
export { demoVisible } from "@tycoonhood/config"; // e.12

/** {} where demo rows may show; { isDemo: false } elsewhere. Always { isDemo: false } when VERCEL_ENV is production. */
export function realWhere(): { isDemo?: false };

export const publicWhere: {
  instructor(): Prisma.InstructorWhereInput;                        // status ACTIVE
  mentor(): Prisma.MentorProfileWhereInput;                         // status ACTIVE, approvedAt set, its Instructor passes instructor()
  liveEvent(opts?: { now?: Date; signedIn?: boolean }): Prisma.LiveEventWhereInput;
                                                                    // SCHEDULED or COMPLETED, publishedAt set, PUBLIC (and MEMBERS when signed in)
  opportunity(now?: Date): Prisma.OpportunityWhereInput;            // OPEN, publishedAt set, applyBy null or >= now, partner VERIFIED
  partner(): Prisma.PartnerWhereInput;                              // VERIFIED
  project(now?: Date): Prisma.ProjectWhereInput;                    // PUBLIC, publishedAt <= now, state VISIBLE, owner not suspended
  group(): Prisma.CommunityGroupWhereInput;                         // ACTIVE, archivedAt null, visibility MEMBERS
  feedback(now?: Date): Prisma.EventFeedbackWhereInput;             // hidden false, publicConsent, and attendance recorded by the host or a check-in, or member-confirmed over 7 days ago with no dispute
  credential(now?: Date): Prisma.ExpertCredentialWhereInput;       // VERIFIED, expiresAt null or > now
  testimonial(): Prisma.TestimonialWhereInput;                      // published, consentWithdrawnAt null
  post(now?: Date): Prisma.PostWhereInput;                          // SCHEDULED or PUBLISHED, publishedAt <= now
};

/** Members counted in public numbers: not demo, not excludeFromMetrics, not suspended. */
export function countableMemberWhere(): Prisma.UserWhereInput;

/** "Only N left" may show only when stock is below the threshold and staff confirmed it in the last 7 days. */
export function scarcityAllowed(
  product: { inventory: number | null; stockConfirmedAt: Date | null },
  opts?: { threshold?: number; now?: Date } // threshold defaults to 10
): boolean;

export const MIN_REVIEWS_FOR_RATING = 3;
export const MIN_COUNT_FOR_AGGREGATE = 5;
/** Average and count, or null below MIN_REVIEWS_FOR_RATING. */
export function ratingSummary(ratings: readonly number[]): { average: number; count: number } | null;
/** n, or null below MIN_COUNT_FOR_AGGREGATE, so the page shows no number rather than a small one. */
export function publicCount(n: number): number | null;

/** Phrases that promise outcomes or invent proof, e.g. "guaranteed income", "100% placement", "join 10,000+". */
export const BANNED_CLAIMS: readonly RegExp[];
/** The banned phrases found in text. Editorial, opportunity and offering forms refuse to publish while any remain. */
export function bannedClaims(text: string): string[];
```

- Every helper except `credential` and `testimonial` also applies `realWhere()`. Those two models have no `isDemo`, because demo data never holds credentials or testimonials (d.3).
- `publicWhere.post` fixes a leak the workstreams plan found: today a scheduled post shows once `publishedAt` is set, even before that time.
- **Feedback.** A review is public only when attendance was recorded by someone other than the reviewer (`attendanceSource` CODE, HOST, JOIN_LINK or INTEGRATION), or when the member confirmed it themselves (`MEMBER_CONFIRMED`, `memberConfirmedAt`) more than 7 days ago and no attendance dispute was opened. A host therefore cannot hide a bad review by marking NO_SHOW, and a member cannot publish a review for an event nobody saw them attend.
- **Founder text.** The founder's note on Home, Today and `/updates` is the `SiteSetting` `founder.note`, JSON `{ text, updatedAt, updatedById, approvedAt, approvedById }`. Saving the text clears `approvedAt` and `approvedById`. Approving needs `admin.content` and is audited (`founder.note.approve`). The three surfaces render the text only while `approvedAt` is set; `/about` keeps today's copy.
- **Expert photos.** Changing `Instructor.photoUrl` clears `photoVerifiedAt` and `photoSha256`. Verifying stores the sha256 of the fetched bytes; a daily sweep re-fetches verified photos and clears the verification when the bytes changed. Images load only from hosts listed in `IMAGE_REMOTE_HOSTS` (comma-separated), which feeds `next.config` `images.remotePatterns` and the `img-src` of the CSP, and are served through `next/image`. With the variable empty, which is the default (O38), profiles show initials.
- **Shared trust components** (P0, lead-owned): `apps/web/components/trust/DemoBadge.tsx`, `VerificationBadge.tsx` and `EmptyState.tsx`, and `ProgressRing` in `packages/ui`. Every stream uses them; POLISH only restyles them.
- **Test.** On an empty, migrated database, every public page renders with no invented name, count or rating: the honest empty states only.

### e.4 Zoned time

**`packages/core/src/time/zoned.ts`** (new). Pure functions on `Intl`, with no dependency.

```ts
export type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number; second: number; weekday: number }; // weekday 0 = Sunday
export function utcToZonedParts(at: Date, zone: string): ZonedParts;
/** A wall-clock time in a zone, as an instant. A time in a DST gap moves forward; a time in an overlap takes the earlier instant. */
export function zonedWallTimeToUtc(parts: Omit<ZonedParts, "weekday" | "second"> & { second?: number }, zone: string): Date;
export function startOfDayInZone(dayKey: string, zone: string): Date;
export function addDaysInZone(at: Date, days: number, zone: string): Date;   // same wall time, n local days later
export function weekdayInZone(at: Date, zone: string): number;               // 0 = Sunday

export type ZoneSource = { timezone: string | null; previousTimezone?: string | null; timezoneEffectiveAt?: Date | null };
/** previousTimezone until timezoneEffectiveAt, timezone from then on; memberZone() of the result. */
export function effectiveZoneAt(source: ZoneSource, at: Date): string;
/** When a change of zone made at changedAt takes effect (rule below). */
export function nextZoneCutover(oldZone: string, newZone: string, changedAt: Date): Date;

export function memberDayKey(source: ZoneSource, at?: Date): string;   // "YYYY-MM-DD"
export function memberWeekKey(source: ZoneSource, at?: Date): string;  // "week:YYYY-MM-DD", the Monday
export function memberMonthKey(source: ZoneSource, at?: Date): string; // "month:YYYY-MM"
/** The platform's own day, India time, for analytics rows. */
export function analyticsDayKey(at?: Date): string;

export function parseZonedDateTime(value: string, zone: string): Date | null; // "YYYY-MM-DDTHH:mm" from a form
export function formatTimeRange(start: Date, end: Date, zone: string): string; // "14 Nov, 18:00 to 19:30"
export function utcOffsetLabel(zone: string, at?: Date): string;             // "GMT+5:30"
```

**The cutover rule.** Let K be the member's day key in the old zone at `changedAt`, and N the day key in the new zone at the same moment.
- If N equals K or K + 1, the new zone takes effect at `changedAt`. The day key stays or moves forward by one day, as it does at midnight.
- If N equals K − 1, and the old zone is still on day K at `startOfDayInZone(K, newZone)`, the old zone stays in force until that moment and the new zone takes over from then. The member's day key never goes back.
- Otherwise the move crosses the date line, by 24 hours or more. The switch happens at `changedAt`, and one date is repeated or skipped. The settings page says so before the member saves.

**`ProfileService.setTimezone(userId: string, zone: string, now?: Date): Promise<void>`** (`platform/profile.ts`). It validates the zone and does nothing when the zone is unchanged. Otherwise it stores the zone in force at `now` (`effectiveZoneAt`) as `previousTimezone` and sets `timezoneEffectiveAt = nextZoneCutover(previousTimezone, zone, now)`. A second change before the first cutover therefore starts from the zone the member is still on. Every day-keyed mechanic (streaks, check-ins, mission occurrences, plans, goals) reads `memberDayKey`.

**Existing time helpers.**
- `memberZone` (`time/format.ts`) is the single fallback: the profile's zone when valid, else India time.
- `localDayKey(at, timezone)` in `time/day.ts` keeps its signature and becomes `memberDayKey({ timezone }, at)`. Its fallback for a missing or invalid zone changes from UTC to India time, so a member's day key matches the dates the site shows them. The one test that expects the UTC fallback, `rules-engine.test.ts:246-249`, changes to expect India time (there is no `day.test.ts`). Production has never run, so no stored key changes meaning.
- `localDayKeyOffset`, `isSameLocalDay` and `localWeekStartKey` keep their signatures and use the same fallback.

### e.5 Notifications

**The topic catalogue.** `packages/config/src/ecosystem.ts` (e.12) holds it, so the taxonomy seed and core share one list:

```ts
export type NotificationChannelName = "IN_APP" | "EMAIL" | "PUSH";
export type TopicDef = {
  key: string;                 // "mentoring.booking"; the group is the first segment
  label: string;
  description: string;
  type: string;                // the NotificationType value stored on the row, e.g. "MENTORSHIP"
  defaults: { inApp: boolean; email: boolean; push: boolean };
  /** Channels the member cannot turn off. */
  locked?: readonly NotificationChannelName[];
  /** Transactional: ignores pause, opt-out and quiet hours. */
  essential?: boolean;
  /** May wait for the member's email digest. */
  digestible: boolean;
};
export const NOTIFICATION_TOPICS: readonly TopicDef[]; // the 42 below
```

Push is off by default for every topic. Labels and descriptions are plain sentences, written with the stream that sends the topic.

| Topic | Type | In-app | Email | Locked | Notes |
|---|---|---|---|---|---|
| learning.progress | LEARNING | on | off | | digestible |
| learning.course_update | LEARNING | on | off | | digestible |
| learning.feedback | LEARNING | on | on | | |
| learning.path | LEARNING | on | off | | digestible |
| progress.xp | XP_AWARDED | on | off | | digestible |
| progress.level | LEVEL_UP | on | off | | |
| progress.rank | RANK_UP | on | off | | |
| progress.achievement | ACHIEVEMENT | on | off | | |
| progress.mission | MISSION | on | off | | |
| progress.skill | PROJECT | on | on | | |
| progress.project | PROJECT | on | on | | |
| challenge.update | CHALLENGE | on | off | | |
| challenge.reminder | CHALLENGE | on | off | | scheduled |
| goal.achieved | GOAL | on | off | | |
| goal.reminder | GOAL | on | off | | scheduled |
| mentoring.booking | MENTORSHIP | on | on | in-app, email | essential |
| mentoring.request | MENTORSHIP | on | on | in-app, email | essential; a booking request to the mentor, and the answer to the member |
| mentoring.reminder | MENTORSHIP | on | on | | scheduled |
| mentoring.feedback | MENTORSHIP | on | off | | |
| mentoring.new_mentor | MENTORSHIP | on | off | | digestible |
| event.registration | EVENT | on | on | in-app, email | essential |
| event.reminder | EVENT | on | on | | scheduled |
| event.changed | EVENT | on | on | in-app, email | essential |
| event.announced | EVENT | on | off | | digestible |
| event.resources | EVENT | on | off | | |
| opportunity.application | OPPORTUNITY | on | on | in-app, email | essential |
| opportunity.match | OPPORTUNITY | on | off | | digestible |
| opportunity.partner | OPPORTUNITY | on | on | | |
| contributor.application | CONTRIBUTOR | on | on | in-app, email | essential |
| contributor.review | CONTRIBUTOR | on | on | | |
| earnings.update | EARNINGS | on | on | | |
| community.reply | COMMUNITY | on | off | | digestible |
| community.reaction | COMMUNITY | on | off | | digestible |
| community.follow | COMMUNITY | on | off | | digestible |
| community.following_post | COMMUNITY | off | off | | digestible |
| community.group | COMMUNITY | on | off | | digestible |
| community.moderation | COMMUNITY | on | off | in-app | |
| order.update | ORDER | on | on | in-app, email | essential |
| wallet.thc | THC | on | off | | |
| platform.announcement | ANNOUNCEMENT | on | off | | |
| platform.announcement.important | ANNOUNCEMENT | on | on | in-app | |
| editorial.post | SYSTEM | on | off | | |

Which topics are essential is open question 14.

**`packages/core/src/platform/notification-topics.ts`** (new):

```ts
export type TopicKey = (typeof NOTIFICATION_TOPICS)[number]["key"];
export function isTopicKey(v: unknown): v is TopicKey;
export function topicDef(key: TopicKey): TopicDef;
/** The topic a legacy notify(userId, type, ...) call is filed under. */
export function topicFor(type: NotificationType): TopicKey;
/** The catalogue merged with the NotificationTopic rows (label, defaults, active). A topic with no row uses the catalogue. */
export async function effectiveTopics(db?: Db): Promise<Map<TopicKey, TopicDef & { active: boolean }>>;
```

| Legacy type | `topicFor` |
|---|---|
| XP_AWARDED | progress.xp |
| LEVEL_UP | progress.level |
| RANK_UP | progress.rank |
| ACHIEVEMENT | progress.achievement |
| MISSION | progress.mission |
| CHALLENGE | challenge.update |
| THC | wallet.thc |
| SYSTEM | platform.announcement |
| ORDER | order.update |
| COMMUNITY | community.reply |
| EARNINGS | earnings.update |
| LEARNING | learning.progress |
| MENTORSHIP | mentoring.booking |
| EVENT | event.registration |
| OPPORTUNITY | opportunity.application |
| CONTRIBUTOR | contributor.application |
| PROJECT | progress.project |
| GOAL | goal.achieved |
| ANNOUNCEMENT | platform.announcement |

**The gateway: `packages/core/src/platform/notify.ts`** (changed). One function writes every notification. The positional form stays, so the 34 existing write sites keep working while they move over.

```ts
export type NotifyInput = {
  userId: string;
  topic: TopicKey;
  title: string;
  body?: string;
  href?: string;                     // a path on this site; checked with safeSitePath
  data?: Prisma.InputJsonObject;
  actorId?: string;                  // who caused it; used for blocks and self-action
  priority?: NotificationPriority;   // default NORMAL; HIGH skips quiet hours
  dedupeKey?: string;                // at most one notification ever with this key
  groupKey?: string;                 // coalesce into the member's unread notification with this key
  expiresAt?: Date;
  announcementId?: string;
  email?: { subject?: string; text?: string };
};

export type NotifyResult =
  | { status: "created"; notificationId: string; deliveries: NotificationChannel[] }
  | { status: "coalesced"; notificationId: string; groupCount: number }
  | { status: "duplicate"; notificationId: string }
  | { status: "suppressed"; reason: "recipient_suspended" | "self_action" | "blocked_actor" | "topic_inactive" | "all_channels_off" };

export async function notify(input: NotifyInput, db?: Db): Promise<NotifyResult>;
/** Legacy form: stores the given type, with topic = topicFor(type). Never coalesces. */
export async function notify(
  userId: string, type: NotificationType, title: string, body?: string,
  data?: Prisma.InputJsonValue & { href?: string }, db?: Db
): Promise<NotifyResult>;
/** One input for many recipients; checks run per recipient. Rows are written in batches of 1000. */
export async function notifyMany(userIds: readonly string[], input: Omit<NotifyInput, "userId">, db?: Db): Promise<NotifyResult[]>;

export function notificationLink(data: unknown): string | null; // unchanged
```

Rules, in the order they are checked:
1. **Recipient suspended:** suppressed.
2. **Self action** (`actorId === userId`): suppressed.
3. **Blocked:** either side has a `MemberBlock` with the actor: suppressed. Essential topics skip this check.
4. **Topic inactive** (`NotificationTopic.active = false`): suppressed, unless the topic is essential.
5. **Channels:** `effectiveChannels` for the member and topic. No channel left: suppressed.
6. **Dedupe:** a `dedupeKey` that already exists returns `duplicate`.

- An input carries a `dedupeKey` or a `groupKey`, never both; the gateway throws otherwise.
- **Coalescing** uses the partial unique index `Notification_unread_group_key` (migration 000100). The statement, as tested in c.4, with `id` from `randomUUID()` and `at` from the caller:

  ```sql
  INSERT INTO "Notification" ("id", "userId", "type", "topic", "title", "body", "data", "groupKey", "actorId", "priority", "createdAt")
  VALUES (${id}, ${userId}, ${type}::"NotificationType", ${topic}, ${title}, ${body}, ${data}, ${groupKey}, ${actorId}, ${priority}::"NotificationPriority", ${at})
  ON CONFLICT ("userId", "groupKey") WHERE "groupKey" IS NOT NULL AND "readAt" IS NULL AND "archivedAt" IS NULL
  DO UPDATE SET "groupCount" = "Notification"."groupCount" + 1, "title" = EXCLUDED."title",
                "body" = EXCLUDED."body", "createdAt" = EXCLUDED."createdAt", "seenAt" = NULL
  RETURNING "id", "groupCount", (xmax = 0) AS "inserted";
  ```

  Once the member reads the row, the next notice starts a new one.
- **Email and push.** In-app is the `Notification` row. For EMAIL and PUSH the gateway writes one `ScheduledNotification` per channel, in the same transaction, with `dedupeKey = "copy:<notificationId>:EMAIL"` or `":PUSH"`.
  - Mail mode `off` (`mailModeFromEnv()`): no EMAIL rows.
  - Mail mode `dev`: the rows are dispatched to the log and end LOGGED.
  - PUSH rows are written only when `pushConfigured()` is true.
- Legacy calls pass no `groupKey`, so they never coalesce. Code that finds notices by `data`, such as `community.ts:454`, which removes the notice for a hidden message, keeps working.

**Preferences: `packages/core/src/platform/notification-preferences.ts`** (new):

```ts
export type ChannelSet = { IN_APP: boolean; EMAIL: boolean; PUSH: boolean };
/** Catalogue defaults, then the topic row, then the member's NotificationPreference rows; locked channels always on. */
export async function effectiveChannels(userId: string, topic: TopicKey, db?: Db): Promise<ChannelSet>;
export async function preferencesFor(userId: string, db?: Db): Promise<{ topic: TopicDef; channels: ChannelSet; locked: NotificationChannelName[] }[]>;
/** Throws on a locked channel. */
export async function setPreference(userId: string, topic: TopicKey, channel: NotificationChannel, enabled: boolean, db?: Db): Promise<void>;
export async function updateSettings(
  userId: string,
  patch: Partial<Pick<NotificationSettings, "emailDigest" | "digestHour" | "quietStartMin" | "quietEndMin" | "pausedUntil">>,
  db?: Db
): Promise<NotificationSettings>;
/**
 * The one-click link in every non-essential email: /unsubscribe?t=<token>&topic=<key>.
 * With a topic, turns EMAIL off for that topic (a NotificationPreference row). With topic "all", sets
 * emailOptOutAt, which stops every non-essential email. An essential topic cannot be unsubscribed:
 * its emails link to /settings/notifications instead.
 */
export async function unsubscribeByToken(token: string, topic: TopicKey | "all", db?: Db): Promise<{ ok: boolean }>;
/** HMAC-SHA256(privacySecret(), "unsub|" + userId), hex. Only its sha256 is stored, in unsubscribeTokenHash. */
export function unsubscribeToken(userId: string): string;
```

**The outbox: `packages/core/src/platform/scheduled.ts`** (new):

```ts
export type ScheduleInput = {
  userId: string; topic: TopicKey; channel?: NotificationChannel; runAt: Date; dedupeKey: string;
  subject: { type: string; id: string }; payload?: Prisma.InputJsonObject;
  /** Past this the row is stale: SKIPPED with lastError "stale". The event start, challenge end or goal week end. */
  notAfter?: Date;
};
/** INSERT ... ON CONFLICT ("dedupeKey") DO NOTHING. Scheduling the same key twice is a no-op. */
export async function schedule(input: ScheduleInput, db?: Db): Promise<{ created: boolean }>;
/** Moves a PENDING row to a new time (an event moved). */
export async function reschedule(dedupeKey: string, runAt: Date, db?: Db): Promise<boolean>;
/**
 * Cancels PENDING rows for a subject, through the (subjectType, subjectId) index; for one member when userId
 * is given. Event reminders are filed under the event ("live_event"), so a reschedule or cancellation clears
 * every registrant's rows in one statement and a member's own cancellation clears only theirs.
 */
export async function cancelForSubject(subject: { type: string; id: string }, opts?: { userId?: string }, db?: Db): Promise<number>;

export type DispatchDeps = { mailer: MailerPort | null; push: PushPort; mailMode: MailMode; now?: () => Date };
export async function dispatchDue(
  opts: { limit?: number; userId?: string },
  deps: DispatchDeps,
  db?: PrismaClient
): Promise<{ sent: number; logged: number; skipped: number; failed: number }>;
```

`dispatchDue`:
1. In a short transaction it claims due rows with `FOR UPDATE SKIP LOCKED` and sets `lockedUntil = now + 2 minutes`, so two dispatchers never send the same row.
2. It sends outside the transaction.
3. A failed send returns to PENDING with `runAt = now + 10 minutes × attempts` while `attempts` is below 3. After that the row is FAILED, with `lastError`.
4. Before sending it applies the member's settings:
   - A row past its `notAfter` is SKIPPED with `lastError` "stale".
   - Quiet hours move EMAIL and PUSH to the end of the quiet window, unless the priority is HIGH or the topic is essential. They never move a row past its `notAfter`: when the quiet window ends after it, the row is SKIPPED as stale instead of arriving late.
   - Digestible topics wait for the digest when `emailDigest` is DAILY or WEEKLY. The digest goes at `digestHour`, member time, under `digest:<userId>:<memberDayKey>` (daily) or `digest:<userId>:<memberWeekKey>` (weekly). NOTIFY adds this step; until it lands every row sends on its own.
   - `pausedUntil` and `emailOptOutAt` skip the row (SKIPPED), except for essential topics. A per-topic EMAIL preference that is off skips it with `pref_off`.

**Who builds what.**
- **P0 (P0d, lead-owned `notify.ts`):** the catalogue and `notification-topics.ts`; the gateway (`notify`, `notifyMany`); preferences read and write (`notification-preferences.ts`, including `unsubscribeToken` and `unsubscribeByToken`); the outbox (`scheduled.ts`: `schedule`, `reschedule`, `cancelForSubject`, `dispatchDue` with claims, retries, stale rows, quiet hours, pause and opt-out); the ports (`MailerPort`, `PushPort`, `nullPush`, `pushConfigured`) and a plain-text `renderEmail`; the cron routes and `dispatchSoon`; and the move of the 34 write sites.
- **NOTIFY:** the designed email templates and the digest (rendering and the deferral step above); the `/unsubscribe` page; `notification-centre.ts` with its API, the bell and the centre; `/settings/notifications`; announcements (`Announcement`, `/admin/announcements`); and `/admin/notifications`. After P0 merges, NOTIFY owns `scheduled.ts` and `notification-delivery.ts`; their exported signatures above are frozen.

**Delivery and the notification centre.**
- `packages/core/src/platform/notification-delivery.ts`: `MailerPort` (`send(mail): Promise<{ id: string }>`), `PushPort`, `nullPush`, `pushConfigured(env?)` and `renderEmail(topic, notification, unsubscribeUrl)`.
- `packages/core/src/platform/mail-outcome.ts` gains `mailModeFromEnv(env?): MailMode`: RESEND_API_KEY set means live, `isDevMode()` means dev, otherwise off. `apps/web/lib/mail/index.ts` `mailMode()` calls it, so web and core agree.
- `packages/core/src/platform/notification-centre.ts`:
  - `list(userId, { cursor?, take?, unreadOnly? })`
  - `unreadCount(userId)`
  - `markSeen(userId, ids)`, `markRead(userId, id)`, `markAllRead(userId)`
  - `archive(userId, id)`

  Expired rows (`expiresAt` past) are left out.

**What triggers dispatch.** The workstreams plan's defect D4 is that nothing runs often enough on the current plan.
- `apps/web/lib/notifications.ts` (new): `dispatchDeps()` binds `activeMailer()`, and `dispatchSoon()` runs `dispatchDue` inside Next's `after()`, at most once a minute per server instance.
- Loading the bell runs `dispatchDue({ userId, limit: 20 })` for that member.
- `/api/cron/daily` replaces the `expire-orders` entry in `apps/web/vercel.json`, so the file keeps two once-a-day entries (`daily`, and the launch branch's `email-holds` at 00:30, which stays as it is); every Vercel plan allows that. It runs the expire-orders work first, then the sweeps, the analytics roll-up, the digests and a full dispatch. The `/api/cron/expire-orders` route stays for manual runs.
- `/api/cron/dispatch` (guarded by `cronAuth`, CRON_SECRET) is for an external scheduler that calls it every few minutes (open question 8).

**Dedupe keys** (one format each):

| Use | Key |
|---|---|
| Event reminders | `event:<eventId>:user:<userId>:s<icsSequence>:T-1440` and `:T-60`; subject `live_event`, `notAfter` the event start |
| Challenge reminder | `challenge:<challengeId>:user:<userId>:T-1d` |
| Goal reminder | `goal:<goalId>:<memberWeekKey>` |
| Email digest | `digest:<userId>:<memberDayKey or memberWeekKey>` |
| Email or push copy of a notification | `copy:<notificationId>:EMAIL` or `:PUSH` |
| Announcement | `announcement:<announcementId>:<userId>` |
| New follower | `follow:<followerId>:<userId>` |

A rescheduled event raises `icsSequence`; its PENDING reminders are cancelled with `cancelForSubject({ type: "live_event", id: eventId })` and new ones are scheduled under keys with the new sequence.

`groupKey` values: `reply:<postId>` and `reaction:<postId>`.

**The 34 existing write sites move to the gateway.** They keep their titles and types, so members see the same text. A test lists every site and checks that its title is unchanged.
- 18 `notify(...)` calls:
  - `earn/affiliates.ts`: 333, 373, 507, 600, 634, 636, 677, 696, 750, 824
  - `discussions/discussions.ts`: 622, 737, 857
  - `shop/refunds.ts`: 135, 228, 337, 475, 536
- 16 direct `notification.create` or `createMany` writes:
  - `community/community.ts`: 425, 478
  - `growth/referrals.ts`: 134
  - `platform/cms.ts`: 138, the staff broadcast. It becomes an `Announcement` row sent through `notifyMany`, so it can be retracted.
  - `gamification/challenges.ts`: 163, 261
  - `gamification/xp.ts`: 104, 115
  - `gamification/achievements.ts`: 72
  - `rewards/rewards.ts`: 109
  - `rules/engine.ts`: 146
  - `commerce/commerce.ts`: 376, 413
  - `lms/lms.ts`: 160, 305
  - `shop/checkout.ts`: 387

### e.6 Activity feed

**`packages/core/src/activity/record.ts`** (new):

```ts
export type ActivityInput = {
  kind: ActivityEventKind;
  actorId: string | null;
  audience?: ActivityAudience;            // default MEMBERS
  academyId?: string; groupId?: string; courseId?: string;
  subject: { type: string; id: string };
  facet: PrivacyFacet | null;             // the actor's facet checked on read (e.11)
  data: { title: string; href: string; count?: number };
  occurredAt?: Date;
  dedupeKey: string;                      // e.g. "COURSE_COMPLETED:<userId>:<courseId>"
};
/**
 * Idempotent on dedupeKey (ON CONFLICT DO NOTHING). Without tx it is fail-soft: an error is logged, never thrown.
 * With tx it writes in the caller's transaction, so the item commits or rolls back with the change.
 */
export async function record(input: ActivityInput, tx?: Prisma.TransactionClient): Promise<void>;
/** Maps a domain event to a feed item, or to nothing. */
export async function fromDomainEvent(event: DomainEvent, outcome: RuleOutcome): Promise<void>;
/** community.moderate; sets hiddenAt, hiddenById, hiddenReason; audit "activity.hide". */
export async function hide(actor: Actor, id: string, reason: string): Promise<void>;
```

`EventBus.emit` (`events/bus.ts`) calls `fromDomainEvent(event, outcome)` after the rules engine, in a try of its own, so a feed error neither undoes the event nor changes the rules outcome that `emit` returns.

**`packages/core/src/activity/feed.ts`** (new):

```ts
export type FeedScope =
  | { kind: "members" } | { kind: "academy"; academyId: string } | { kind: "group"; groupId: string }
  | { kind: "course"; courseId: string } | { kind: "following" } | { kind: "member"; userId: string };
export type FeedItem = {
  id: string;
  kind: ActivityEventKind;
  actor: { id: string; displayName: string | null; username: string | null } | null;
  data: { title: string; href: string; count?: number };
  occurredAt: Date;
};
export async function feed(
  viewer: Actor | null,
  opts: { scope: FeedScope; cursor?: string; take?: number } // take defaults to 20, at most 50
): Promise<{ items: FeedItem[]; nextCursor: string | null }>;
```

On read, `feed` drops:
- hidden items;
- items whose actor is suspended or demo (outside development);
- items where either side has blocked the other;
- items whose actor turned the `activity` facet off;
- items whose own facet is off for this viewer (`canView`, e.11).

**New domain events** (`events/types.ts`). They are added to `DOMAIN_EVENTS`, so staff can attach missions to them:

| Event | Payload (besides `userId`, `at`) |
|---|---|
| MODULE_COMPLETED | moduleId, courseId |
| CERTIFICATE_ISSUED | certificateId, courseId |
| PATH_COMPLETED | pathId |
| ACADEMY_JOINED | academyId, source |
| MENTOR_APPROVED | mentorId |
| MENTORING_BOOKED | eventId, registrationId, mentorId |
| MENTORING_COMPLETED | eventId, registrationId, mentorId |
| EVENT_REGISTERED | eventId, registrationId |
| EVENT_ATTENDED | eventId, registrationId, mode |
| GOAL_CHECKED_IN | goalId, value |
| GOAL_ACHIEVED | goalId |
| PRACTICE_LOGGED | kind, missionId? |
| PROJECT_PUBLISHED | projectId |
| PROJECT_VERIFIED | projectId |
| SKILL_VERIFIED | skillId, memberSkillId |
| OPPORTUNITY_APPLIED | opportunityId, applicationId |
| GROUP_JOINED | groupId |
| MEMBER_FOLLOWED | followingId |
| RANK_CHANGED | fromRankId, toRankId, direction ("up" or "down") |

**Facets per feed kind:**

| Facet | Kinds |
|---|---|
| academies | ACADEMY_JOINED |
| courses | COURSE_COMPLETED, PATH_COMPLETED |
| achievements | ACHIEVEMENT_UNLOCKED |
| rank | RANK_REACHED |
| challenges | CHALLENGE_JOINED, CHALLENGE_COMPLETED |
| projects | PROJECT_PUBLISHED, PROJECT_VERIFIED |
| skills | SKILL_VERIFIED |
| none: the subject's own visibility decides | INTRODUCTION_POSTED, UPDATE_POSTED, DISCUSSION_FEATURED, GROUP_CREATED, GROUP_ANNOUNCEMENT, EVENT_PUBLISHED, MENTOR_JOINED, ARTICLE_PUBLISHED, OPPORTUNITY_PUBLISHED, COMMUNITY_MILESTONE |

- ACADEMY_JOINED makes a feed item only for SELF and ONBOARDING joins, never for ENROLMENT or BACKFILL.
- RANK_REACHED is recorded only when the rank goes up.

### e.7 Academies

**`packages/core/src/academies/academies.ts`** (new):

```ts
export { ACADEMY_SLUG_BY_PILLAR } from "@tycoonhood/config"; // WARRIOR warrior, BUILDER business, TYCOON wealth, MIND wellness
export function academySlugForPillar(pillar: Pillar): AcademySlug;
/** Cached per process; the four rows are inserted by migration 000100 and never deleted. */
export async function academyForPillar(pillar: Pillar, db?: Db): Promise<{ id: string; slug: AcademySlug } | null>;
export async function academyIdForCourse(courseId: string, db?: Db): Promise<string | null>;

export class AcademyService {
  constructor(db?: PrismaClient);
  list(opts?: { includeDraft?: boolean }): Promise<Academy[]>;
  bySlug(slug: string): Promise<Academy | null>;
  join(userId: string, academyId: string, source?: "SELF" | "ONBOARDING"): Promise<AcademyMembership>;
  /** Sets leftAt. A later enrolment does not re-join a member who left. */
  leave(userId: string, academyId: string): Promise<void>;
  membershipsOf(userId: string): Promise<(AcademyMembership & { academy: Academy })[]>;
  /** Called from enrolment: joins with source ENROLMENT and notify false, unless a membership row exists (left or not). */
  ensureFromEnrolment(userId: string, courseId: string, tx?: Prisma.TransactionClient): Promise<void>;
}
export const academies: AcademyService;
```

`lms.ts` calls `ensureFromEnrolment` where it creates an `Enrollment`.

- **Notices.** `AcademyMembership.notify` is true for SELF and ONBOARDING joins and false for ENROLMENT and BACKFILL. Academy announcements and new-mentor notices go only to members with `notify` true; a member turns it on or off on the academy page.
- **A course's academy.** `Course.academyId` is the source of truth. The authoring service sets `Course.pillar` from the academy's pillar whenever it sets `academyId`, so the two never disagree; a test checks both are written together. ACAD owns the academy picker in the course editor and `academyIdForCourse`.

### e.8 Admin navigation

**`apps/web/lib/admin-nav.ts`** (changed). Sections gain a group, and `needs` may list several permissions, any of which opens the section.

```ts
export type AdminGroupKey =
  | "members" | "learning" | "experts" | "events" | "community" | "engagement"
  | "opportunities" | "commerce" | "content" | "insights" | "system";
export type AdminSection = AdminTab & {
  group: AdminGroupKey | null;              // null: Overview, shown first, outside any group
  needs: Permission | readonly Permission[]; // any of
  unless?: Permission;
};
export type AdminNavGroup = { key: AdminGroupKey; label: string; sections: AdminTab[] };
export function adminNavFor(user: HasRole): { overview: AdminTab[]; groups: AdminNavGroup[] };
/** Kept: the same sections as a flat list, for the existing tab bar. */
export function adminTabsFor(user: HasRole): AdminTab[];
```

| Group (label) | Section | Needs |
|---|---|---|
| (Overview) | /admin | admin.access |
| (Overview) | /admin/review: every review queue in one list | any of contributors.review, mentors.manage, events.manage, opportunities.manage, content.publish, progression.verify, community.moderate, courses.publish |
| Members | /admin/members | admin.users |
| Learning | /admin/academies, /admin/paths, /admin/skills | academies.manage |
| Learning | /admin/courses | courses.author |
| Learning | /admin/courses/reviews | community.moderate, unless courses.author (as today) |
| Learning | /admin/submissions | courses.publish |
| Mentors and contributors (`experts`) | /admin/applications | contributors.review |
| Mentors and contributors | /admin/mentors | mentors.manage |
| Mentors and contributors | /admin/experts | any of courses.manage, mentors.manage |
| Mentors and contributors | /admin/revenue-terms, /admin/contributor-earnings | admin.earn |
| Events | /admin/events, /admin/events/kinds | events.manage |
| Community | /admin/community, /admin/groups, /admin/moderation, /admin/activity | community.moderate |
| Engagement | /admin/missions, /admin/challenges, /admin/achievements, /admin/ranks, /admin/videos, /admin/economy, /admin/evidence | admin.economy |
| Engagement | /admin/projects | progression.verify |
| Engagement | /admin/standard | admin.content |
| Opportunities | /admin/opportunities, /admin/partners | opportunities.manage |
| Commerce | /admin/orders, /admin/products, /admin/coupons, /admin/refunds | admin.commerce |
| Commerce | /admin/earn | admin.earn |
| Content and site (`content`) | /admin/content | content.write |
| Content and site | /admin/help, /admin/testimonials, /admin/site | admin.content |
| Content and site | /admin/announcements | community.announce |
| Insights | /admin/analytics | admin.analytics |
| Insights | /admin/guide | guide.review |
| System | /admin/audit | admin.audit |
| System | /admin/notifications (topics and the outbox) | admin.content |

`components/admin-tabs.tsx` renders the groups. A group with no visible section is not shown.

### e.9 Audit actions

**`packages/core/src/platform/audit.ts`** (changed):

```ts
export const AUDIT_ACTIONS = [ /* the new actions below */ ] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
```

`AuditEntry.action` stays a `string`, so the existing literals and the template-built `community.*` actions keep working. A test scans the source for audit literals that start with one of the new prefixes and fails on any that is not in `AUDIT_ACTIONS`.

| Area | Actions |
|---|---|
| Academies, paths, skills | academy.create, academy.update, academy.publish, academy.archive, academy.flagship.set; path.create, path.update, path.publish, path.archive; skill.create, skill.update, skill.archive; memberskill.verify, memberskill.revoke |
| Projects, ranks, achievements | project.verify, project.request_changes, project.reject, project.feature, project.unfeature, project.hide; rank.award, rank.criteria.update; achievement.create, achievement.update, achievement.award, achievement.revoke |
| Contributors and money | contributor.application.approve, contributor.application.reject, contributor.application.request_info; contributor.account.suspend, contributor.account.restore; contributor.payout_method.view; revenue.terms.create, revenue.terms.accept; earning.approve, earning.reject, earning.reverse; payout.contributor.approve, payout.contributor.paid, payout.contributor.reject |
| Experts | expert.status.change, expert.identity.verify, expert.photo.verify; credential.verify, credential.reject; mentor.approve, mentor.status.change, mentor.category.save; offering.save, offering.activate |
| Events | event.create, event.submit, event.approve, event.reject, event.publish, event.reschedule, event.cancel, event.complete; event.host.confirm, event.attendance.mark, event.attendance.dispute_resolve, event.kind.save, event.series.save; registration.cancel_staff, registration.refund; feedback.hide, feedback.restore |
| Review and community | content_submission.approve, content_submission.reject, content_submission.request_changes; group.approve, group.reject, group.archive, group.restore, group.member.ban; activity.hide |
| Opportunities | partner.verify, partner.reject, partner.suspend; opportunity.approve, opportunity.reject, opportunity.remove, opportunity.feature |
| Notifications | announcement.create, announcement.send, announcement.retract; notification.topic.update |
| Editorial | post.submit, post.approve, post.request_changes, post.publish, post.schedule, post.archive, post.founder_approve; founder.note.save, founder.note.approve; help.save; testimonial.verify, testimonial.consent_withdraw |
| Other | guide.message.review; user.exclude_metrics; evidence.approve, evidence.reject; mission.publish (the existing mission.create, mission.update, mission.activate and mission.pause stay) |

- Linking an `Instructor` to an account keeps DR-34's `instructor.link` and `instructor.unlink`.
- The existing `notification.announce` stays for rows already written; new broadcasts log `announcement.send`.

### e.10 IP keys

**`packages/core/src/platform/ip-key.ts`** (new). It fixes defects 1 and 2 (0.5).

```ts
/** IP_HASH_KEY, else AFFILIATE_HASH_SECRET, else sha256("affiliate-visitor|" + DATABASE_URL), as affiliates.ts derives its secret today. */
export function privacySecret(env?: NodeJS.ProcessEnv): string;
/** HMAC-SHA256(privacySecret(), "ip|" + ip), hex, first 32 characters. "" for no IP. */
export function ipKey(ip: string | null | undefined): string;
```

- `ipKey` moves here from `earn/affiliates.ts:141`, where it is an unkeyed `sha256(ip).slice(0, 32)`. `earn/index.ts` keeps re-exporting it.
- `auth/session.ts:35` stores `ipHash: ipKey(device.ip) || null`.
- `affiliates.ts` keeps `visitorHash(ipKey, userAgent, day)` and its own `hashSecret()`. The input it receives is now keyed.
- `referrals.attach(userId, code)` loses its `ip` parameter, and `apps/web/app/(auth)/actions.ts:90-91` stops passing it. Nothing writes `Referral.signupIp` again.
- `.env.example` gains `IP_HASH_KEY` (a long random string in production) and `DEMO_DATA`.
- Switching the key changes the affiliate click dedupe once: a visitor who clicked before the switch can count once more on the day of the switch (open question 20).

### e.11 Privacy facets

**`packages/core/src/platform/privacy.ts`** (new). It takes over the facet rules from `platform/profile.ts`.

```ts
export const PRIVACY_FACETS = {
  // existing; their behaviour does not change
  level: { default: true }, rank: { default: true }, streak: { default: true },
  leaderboard: { default: true }, achievements: { default: true }, thc: { default: true },
  courses: { default: false },
  // new, on unless the member turns them off
  activity: { default: true, membersOnly: true }, skills: { default: true }, projects: { default: true },
  challenges: { default: true }, follows: { default: true }, directory: { default: true },
  // new, opt-in
  academies: { default: false }, xpHistory: { default: false }, celebrate: { default: false },
  interests: { default: false }, goals: { default: false }, location: { default: false },
} as const satisfies Record<string, { default: boolean; membersOnly?: boolean }>;
export type PrivacyFacet = keyof typeof PRIVACY_FACETS;

/** The stored value when it is a boolean, else the facet's default. */
export function facetOn(privacy: unknown, facet: PrivacyFacet): boolean;

export function canView(
  viewer: { id: string } | null,
  member: { id: string; suspendedAt: Date | null; privacy: unknown },
  facet: PrivacyFacet,
  ctx?: { blocked?: boolean } // true when either side blocks the other
): boolean;
```

- `canView` is true for the member themselves. Otherwise it is false when the member is suspended, when either side blocks the other, or when the facet is off. A members-only facet also needs a signed-in viewer.
- `privacyShows` and `showsCourses` (`platform/profile.ts`) stay, and call `facetOn`, so today's behaviour holds: courses is opt-in, and the other existing facets show unless turned off. `thc` already reads as hidden for new members, because the column default stores `thc: false`.
- `PRIVACY_FORM_KEYS` grows with the facets the settings page shows. `privacyFromForm` is unchanged.
- The defaults of the new facets need a DPDP review (open question 3).

### e.12 Shared catalogues in `packages/config`

**`packages/config/src/ecosystem.ts`** (new):

```ts
export type AcademySlug = "warrior" | "business" | "wealth" | "wellness";
export const ACADEMY_SLUG_BY_PILLAR: Record<"WARRIOR" | "BUILDER" | "TYCOON" | "MIND", AcademySlug>;
export const ACADEMY_SEED: readonly {
  id: string; slug: AcademySlug; pillar: "WARRIOR" | "BUILDER" | "TYCOON" | "MIND"; name: string; shortName: string;
  tagline: string; description: string; focusAreas: readonly string[]; accent: string; disclaimer: string | null;
  sortOrder: number; flagshipCourseSlug: string;
}[];
export const MENTOR_CATEGORY_SEED: readonly { slug: string; name: string; academy: AcademySlug | null; sortOrder: number }[];
export const EVENT_KIND_SEED: readonly { id?: string; slug: string; name: string; mode: "ONE_TO_ONE" | "GROUP"; academy: AcademySlug | null; sortOrder: number }[];
export const POST_CATEGORY_SEED: readonly { slug: string; name: string; sortOrder: number }[];
export const NOTIFICATION_TOPICS: readonly TopicDef[]; // e.5
export type { TopicDef, NotificationChannelName };
```

The rows are the tables in d.1. `packages/config` has no Prisma dependency, so enum-typed fields are string literal unions; core narrows them to the Prisma enums.

**`packages/config/src/demo.ts`** (new):

```ts
export type Env = Record<string, string | undefined>;
/** False when VERCEL_ENV is production. Otherwise true when NODE_ENV is not production, or DEMO_DATA is "show". */
export function demoVisible(env?: Env): boolean;
export class DemoSeedRefused extends Error {}
/** The six refusals of d.3; throws DemoSeedRefused with the reason. */
export function assertDemoSeedAllowed(env: Env, argv: readonly string[]): void;
```

Both files are re-exported from `packages/config/src/index.ts`.

### e.13 Existing files that change

| Area | Files |
|---|---|
| Core auth | `auth/permissions.ts`; `auth/grants.ts` (new); `auth/session.ts` (`GRANT_INCLUDE`, `ipKey`) |
| Core platform | `platform/notify.ts`; new: `notification-topics.ts`, `notification-preferences.ts`, `scheduled.ts`, `notification-delivery.ts`, `notification-centre.ts`, `authenticity.ts`, `privacy.ts`, `ip-key.ts`; changed: `audit.ts`, `mail-outcome.ts`, `profile.ts` (`setTimezone`, facets), `cms.ts` (announcements), `platform/index.ts` |
| Core courses | `lms/authoring.ts` (actor types gain `grants`); `lms/lms.ts` (`ensureFromEnrolment`, notices) |
| Core time | `time/zoned.ts` (new); `time/day.ts` (fallback); `test/rules-engine.test.ts` (the fallback case); `test/zoned.test.ts` (new) |
| Core events | `events/types.ts` (19 events); `events/bus.ts` (`fromDomainEvent`) |
| New core modules | `activity/record.ts`, `activity/feed.ts`, `academies/academies.ts`, `community/group-roles.ts`, `live/access.ts`, `mentors/access.ts`, `opportunities/access.ts`, `progression/access.ts`. Later streams add, among others, `mentors/mentoring.ts` (`MentoringService`, BOOK; member pages under `/bookings`, never `/sessions`) |
| Other core | `community/community.ts` (`isAdmin` calls, notices); `earn/affiliates.ts` (`ipKey` moves out, notices); `growth/referrals.ts` (no IP, notices); `discussions/discussions.ts`, `shop/refunds.ts` and the other write sites in e.5; `commerce/commerce.ts:254` and `:323`, `shop/checkout.ts:198` and `:362` (set `Order.paidAt` where an order becomes PAID); `rewards/rewards.ts:73` (passes `occurrence`); `earn/affiliates.ts:212-213`, `:824`, `:897`, `:981` and `apps/web/app/(app)/admin/earn/page.tsx:54`, `:256-269` (a payout's `affiliateId` is now nullable); `index.ts` exports |
| Config | `ecosystem.ts` (new), `demo.ts` (new), `index.ts` |
| Web | `lib/guard.ts`; `lib/admin-nav.ts`; `components/admin-tabs.tsx`; `lib/auth.ts` (grants on the current user); `lib/mail/index.ts` (`mailModeFromEnv`); `lib/notifications.ts` (new); `app/(auth)/actions.ts` (no IP to referrals); the admin pages and actions in e.1; `app/api/cron/daily/route.ts` and `app/api/cron/dispatch/route.ts` (new) |
| Deploy | `apps/web/vercel.json` (`daily` replaces `expire-orders`; `email-holds` is unchanged); `scripts/vercel-build.sh` and `scripts/deploy-db.mjs` (taxonomy seed); `packages/db/package.json` and the root `package.json` (scripts); `.env.example` |
| Seeds | as in d.2 |
| Docs | `docs/DATABASE.md` |

---

## 6. Tests

### 6.1 Test layers and rules

| Layer | What it proves | Where | When it runs |
|---|---|---|---|
| Service tests (vitest) | each service's rules, permissions, ownership checks, concurrency and time-zone behaviour, against a real PostgreSQL 16 test database | packages/core/test/*.test.ts | the unit's own files while it works; the full suite once before review, at every merge and in every gate |
| Authenticity tests | each public loader, on an empty database, shows no invented number, name or rating, and hides demo rows in production mode | packages/core/test/authenticity-empty-db.test.ts (P0e) and authenticity-&lt;unit&gt;.test.ts for each unit with public loaders | as above |
| Journeys (Playwright) | a feature works end to end in the browser, signed in as the right role | scripts/e2e/journeys/NN[a\|b]-&lt;name&gt;.mjs, run by scripts/e2e/run-journeys.mjs | the unit's own journey before review; every journey in every gate, on the production build; J4, J5 and J24 under `next dev`, because they need the payment sandbox |
| Accessibility and mobile | axe finds no violation on any listed page at 1280 and 390 pixels; J8 walks every page list at 390×844 | scripts/e2e/a11y.mjs over scripts/e2e/pages/&lt;unit&gt;.txt | every gate |
| Migrations | the migrations apply to an empty and to a populated database; the backfills give the expected rows; the schema does not drift | scripts/db/rehearse-migrations.mjs; the filtered drift check (W3.2) | P0a, after every lead migration, every gate |
| Ownership | a unit changed only its own files | `node scripts/ownership/check.mjs <unit>` | the implementer and the reviewer of every unit |
| Adversarial passes | authenticity, security, privacy, money, concurrency, time zones, accessibility and regression, checked by fresh read-only agents | A1 to A8 (W3.4) | some after P1, P2 and P4; all of them at the end |

**Rules.**
- **Tests first.** A unit writes its vitest files and its journey, sees them fail, then implements.
- **Behaviour, not execution.** A test asserts what must happen, not just that code runs.
  - Concurrency tests make real parallel writes: 20 registrations for 10 seats, 10 bookings for one slot, two dispatchers on one outbox.
  - Time-zone tests use the zones of P0c's zoned.test.ts: New York and London across their DST changes, Kolkata, Kathmandu (+5:45) and Apia.
- **Fix, never skip.** A journey that fails is fixed, not skipped. The only skips allowed are for a credential that is not here: J4, J5 and J24 on the production build.
- **The baseline holds.** P0 records the pass, fail and skip counts of the merged base before it changes anything (P0, order of work, step 1). Every gate must keep them, and A8 checks them at the end.
- **Evidence is recorded.** Every unit records its evidence in docs/ecosystem/requirements/&lt;unit&gt;.json: one row per requirement, with the test or journey that proves it and its classification (rule 5 in 1.2).

### 6.2 Tests and journeys per unit

This table is generated from the briefs in W2. Where the two differ, the brief is right. Each unit also passes its page list through axe (scripts/e2e/pages/&lt;unit&gt;.txt) and the ownership check.

| Unit | Vitest files in packages/core/test, and other checks | Journeys |
|---|---|---|
| P0a | scripts/db/rehearse-migrations.mjs (every check of data-model c.4, on an empty and a populated database); the filtered drift check | none |
| P0s | world-load.test.ts; the existing discussion and moderation tests, unchanged | none |
| P0b | permissions-grants.test.ts, guards.test.ts, course-ownership.test.ts | none |
| P0c | rules-engine.test.ts, zoned.test.ts | none |
| P0d | notify-gateway.test.ts, scheduled-outbox.test.ts, notification-sites.test.ts | none |
| P0e | authenticity-empty-db.test.ts, privacy-facets.test.ts, activity-record.test.ts, house-rules.test.ts | none |
| P0f-H | the harness itself: the journey runner and its shards, the page lists, the stream databases, the ownership check and the heavy-command semaphore | J1 to J9, which must report the baseline counts after the split |
| P0f-S | the demo runner's refusal tests (D1); the taxonomy seed's test that its academies equal the rows migration 000100 inserts | none |
| ACAD | academies-service.test.ts, authenticity-acad.test.ts | J10 |
| MENTOR-A | contributors-applications.test.ts, mentors-verification.test.ts, contributor-anonymise.test.ts | J11a |
| MENTOR-B | mentors-directory.test.ts, mentor-categories.test.ts, mentor-photos.test.ts, authenticity-mentor.test.ts | J11b |
| LIVE-A | live-events.test.ts, meeting.test.ts, event-feedback.test.ts, authenticity-live.test.ts | J12a |
| LIVE-B | ics.test.ts, reminders.test.ts, calendar-feed.test.ts | J12b |
| LEARN | submissions.test.ts, revisions.test.ts, progress-sharing.test.ts, paths.test.ts, assignments.test.ts, lms-access.test.ts, refund-revokes-enrolment.test.ts, course-ownership.test.ts | J14 |
| BOOK | availability.test.ts, booking.test.ts, booking-requests.test.ts, offerings.test.ts, mentor-reviews.test.ts | J13 |
| DAILY-A | rules-engine.test.ts, rewards-zones.test.ts, mission-cooldown.test.ts, mission-board.test.ts, mission-authoring.test.ts | J15a |
| DAILY-B | challenges.test.ts, evidence-migration.test.ts, goals.test.ts | J15b |
| EDIT-A | editorial.test.ts, bylines.test.ts | J16a |
| EDIT-B | founder.test.ts, stories-consent.test.ts, content-search.test.ts | J16b |
| TODAY | daily-plan.test.ts, dashboard.test.ts, signals.test.ts | J17 |
| SOCIAL | community-feed.test.ts, follows.test.ts, directory.test.ts, posts-kinds.test.ts, reports-unified.test.ts | J18 |
| GROUPS | groups.test.ts | J19 |
| NOTIFY | notification-centre.test.ts, email-templates.test.ts, digests.test.ts, unsubscribe.test.ts, announcements.test.ts | J20 |
| OPPS-A | partners.test.ts | J21a |
| OPPS-B | opportunities.test.ts, matching.test.ts, opportunity-applications.test.ts, authenticity-opps.test.ts | J21b |
| SKILLS | skills.test.ts, projects.test.ts, identity.test.ts | J22 |
| RANKS | ranks.test.ts, leaderboard.test.ts, achievements-catalogue.test.ts, anti-spam.test.ts | J23 |
| MONEY | revenue-terms.test.ts, checkout-booking.test.ts, refunds-booking.test.ts, contributor-payouts.test.ts, storefront.test.ts, paid-allowed.test.ts, scarcity.test.ts | J24 |
| HOME | home.test.ts, pulse.test.ts | J25 |
| GUIDE | guide-intents.test.ts, guide-privacy.test.ts, guide-provider.test.ts | J26 |
| ANALYTICS | analytics.test.ts, rollups.test.ts | J27 |
| CONNECT | next-steps.test.ts | J28 |
| POLISH | empty-state.test.ts | J29 |
| INT | none of its own; reruns the full suite on the final head | J30 (admin control centre), J31 (final mission); reruns J25, J26 and the analytics overview (J27) on the final head |

### 6.3 The §21 definition of done, mapped to journeys

Each §21 line has an owner, the unit that makes it pass, and the journeys that prove it. INT runs every journey on the final integrated head and classifies each line in the end-of-build report (section 10, table 10.1 of the report).

| §21 line | Journeys | Owner of the line |
|---|---|---|
| Members can discover and join academies | J10, J31 | ACAD |
| Members can discover genuine mentors | J11b, J31 | MENTOR-B |
| Mentors can apply and be verified | J11a | MENTOR-A |
| Members can book available sessions | J13 (free), J24 (paid, sandbox), J31 | BOOK |
| Instructors can publish approved content | J14 | LEARN |
| Members can participate in real discussions | J18, J6, J31 | SOCIAL |
| Groups function properly | J19 | GROUPS |
| Daily missions work | J15a, J3, J31 | DAILY-A |
| Challenges work | J15b, J31 | DAILY-B |
| Events can be created and registered for | J12a, J12b, J31 | LIVE-A |
| Opportunities can be published and applied for | J21a, J21b, J31 | OPPS-B |
| Progress and achievements update correctly | J23, J22, J3 | RANKS |
| Notifications work | J20, and the notification checks inside J13, J18 and J21b | NOTIFY |
| The dashboard surfaces relevant activity | J17 at P3 (IMPLEMENTED BUT UNVERIFIED), then J31 on the final head | TODAY, verified by INT |
| Administrators can manage all these systems | J30, J7 | INT |
| Mobile access works | J8 over every page list at 390×844, and axe at 390 pixels | POLISH |
| No 3D world is required | J31 with WebGL disabled; J9 keeps /world optional | INT |
| All important user journeys are tested | J1 to J31, reported in docs/TEST_REPORT.md | INT |

The other new journeys are J16a and J16b (editorial and founder), J25 (homepage), J26 (guide), J27 (analytics), J28 (connections) and J29 (motion).

### 6.4 The existing journeys J1 to J9

P0f-H splits today's scripts/e2e/journeys.mjs into scripts/e2e/journeys/01-guest.mjs to 09-world.mjs, plus a runner. After the split they must report the same counts as before. They keep running in every gate.

| Journey | What it covers today | Its part in this build |
|---|---|---|
| J1 | Guest: the public pages | runs as before; new public pages are checked through the page lists and their units' journeys |
| J2 | Sign-up, onboarding, email verification, /today | P0c adds the time-zone field and ACAD the academy step to onboarding; J17 covers the new /today |
| J3 | Learner: enrol, complete, quiz, XP, gating | evidence, with J15a and J23, for "Daily missions work" and "Progress and achievements update correctly" |
| J4 | Shop: cart, coupon, sandbox checkout, order, refund | runs under `next dev` (payment sandbox); A8 checks it behaves as before |
| J5 | Earn: affiliate link, referred purchase, commission | runs under `next dev`; A8 checks it behaves as before |
| J6 | Community: post, comment, react, report, moderate | evidence, with J18, for "Members can participate in real discussions" |
| J7 | Admin and roles | P0f-S updates it for the grouped admin navigation; evidence, with J30, for "Administrators can manage all these systems" |
| J8 | Mobile at 390×844 | reads every unit's page list; evidence for "Mobile access works" |
| J9 | The optional 3D campus and its 2D fallback | unchanged; with J31, evidence that no 3D world is required |

---

## 7. Owner decisions, with the default that ships

Section 7.1 is the list of decisions only the owner can make. Section 7.2 is the data model's own list of open questions; most of them are the same decisions seen from the schema, and each says what happens until it is answered. Every default below is what the build ships if the owner says nothing.

### 7.1 Decisions only the owner (Marshall) can make: O1 to O39

Every default is safe and can be reversed without code unless the table says otherwise. No default invents a money figure: each money setting is off until it is set.

| # | Decision | Default that ships | How to change it |
|---|---|---|---|
| O1 | Academy names and the pillar mapping (WARRIOR Warrior Academy, BUILDER Business Academy, TYCOON Wealth Academy, MIND Wellness Academy) | The directive's names, as data. Existing pillar badges keep Builder, Tycoon and Mind until one constant is flipped | /admin/academies; one constant for the badges |
| O2 | "Financial Planning & Investment" naming under SEBI rules (OQ-B) | Listed with an education-only disclaimer on the academy and programme pages; not featured on the homepage | One admin edit to rename; one homepage toggle |
| O3 | Rank ladder (OQ-A) | The current five ranks and thresholds stay live. The criteria ladder (Initiate to Master) exists as a draft with an impact preview. Members are never demoted | /admin/progression: publish the draft |
| O4 | Revenue share for paid bookings and events (`RevenueShareAgreement.contributorShareBps`; the platform keeps the rest) | Unset. Paid offerings and paid events cannot be published | /admin/revenue-terms |
| O5 | Affiliate commission on paid bookings and events | None. `ProductKind.LIVE_EVENT` products are excluded from affiliate commission | /admin/revenue-terms |
| O6 | Contributor minimum payout and hold days (`minPayoutCents`, `holdDays`) | Unset. Contributors cannot request payouts | /admin/revenue-terms |
| O7 | Refund window for paid bookings and events (`refundWindowHours`), and each mentor's late-cancellation notice (`MentorProfile.cancellationHours`) | Free bookings can be cancelled until the start, and no cancellation counts as late. Paid ones cannot be published until the refund window is set | /admin/revenue-terms; each mentor's settings |
| O8 | Minors and 1:1 bookings | 1:1 needs an 18+ self-attestation with a timestamp. Group bookings and events follow the existing terms | settings key mentoring |
| O9 | Identity and credential verification policy | A manual staff check that records the method and date. No ID images are stored. "Verified" means staff checked it on that date | /admin/mentors policy text |
| O10 | Guide LLM provider and key | Deterministic guide only. The toggle stays unavailable without a key and an updated privacy notice | Add the key, record the notice version, switch it on in /admin/guide |
| O11 | Frequent reminders (Vercel Pro or an external scheduler) | Daily cron, plus on-read dispatch, ICS alarms, "starts soon" banners and `notAfter` on reminders. The UI says email reminders may be late | Pro plan or a scheduler calling /api/cron/dispatch with CRON_SECRET |
| O12 | Push notifications (OQ-K) | Off. `PushSubscription` stays inert and the settings page says so | Add the VAPID keys |
| O13 | Named "who's online" presence (OQ-G) | No named presence. Only 24-hour activity counts above thresholds | Code change; not planned |
| O14 | Privacy facet defaults | Feed items follow the facet of the field they reveal. Interests, goals and location are opt-in. The directory is members-only and shows what /u shows. Members can opt out of leaderboards | /admin/site/general defaults; each member's settings |
| O15 | "Creator" naming (D3) | The affiliate role is labelled "Affiliate". "Creator" means a content creator | One label constant |
| O16 | Outside contributors | They get grants (mentor, contributor), never the INSTRUCTOR staff role | Role change in /admin/members if ever wanted |
| O17 | Progress sharing with instructors | Off for each member until they opt in. Aggregates below 5 learners are suppressed | Member settings |
| O18 | Founder availability | The founder is not bookable. Founder sessions are staff-created events | Give the founder Instructor a mentor profile and offerings |
| O19 | Retention (guide history, activity days, notifications at 180/365 days, ActivityEvent) | Configurable values, marked pending legal review | Settings |
| O20 | Leaderboard minimum population | 5 | settings key leaderboards |
| O21 | THC reward limits per day and week | Derived from the current seeded mission rewards. No new THC economics | settings key engagement |
| O22 | Unpaid internships and unpaid listings | Not publishable until a rule is set | settings key opportunities |
| O23 | What partners see of applicants | Only the contact fields the applicant ticks on each application (`sharedFields`) | Policy text in settings |
| O24 | Starter missions and challenges | Available as drafts through the admin import. Nothing goes live on its own | Publish in /admin/missions |
| O25 | Skill catalogue and module-to-skill map | Seeded create-only, flagged "needs owner review" | /admin/skills |
| O26 | The Business Academy "leadership" focus line | Flagged. The academy description lists only what the programme teaches | /admin/academies |
| O27 | Membership pricing and tiers | Free | Not in this build (STATE A3) |
| O28 | House standard and community rules text (OQ-I) | The current text, as an editable setting | /admin/site/house-rules |
| O29 | Exact red and runtime WebGL lattice (DR-1, DR-24) | Nothing introduced, so nothing is guessed. Recorded as BLOCKED | Supply the specification |
| O30 | Hero media for the homepage and academies | The existing graded photos and code-drawn academy marks | Upload or link new media |
| O31 | Meaning of "Applications" in admin | One inbox: contributor applications, partner verification, listing approvals | Not expected to change |
| O32 | Who may create community groups | Members request; staff approve | settings key groups: staff-only, approval or open |
| O33 | When mentor ratings are shown | Individual reviews always. The average only at 3 or more reviews | settings key mentoring |
| O34 | Preview database | Previews share production settings and are not used. Eco branches don't deploy | Create a Neon branch for previews (STATE §5) |
| O35 | Course revisions by outside authors, and `Instructor.trustedAuthor` | Built: an outside author's change to a published course is a revision that only an administrator approves (DR-34). `trustedAuthor` is never read | A code change to let trusted authors publish directly; not planned |
| O36 | A contributor who asks to delete their account | Keep the earnings, agreements and payouts for the books, and anonymise the person (profile, payout method and contact fields cleared) | Staff action per request; a full delete needs the records settled first |
| O37 | Delegating one staff area (for example events) to a non-admin | Not built: staff areas need ADMIN, or MODERATOR for moderation | Build a `StaffGrant` table (a later release) |
| O38 | Which hosts may serve expert photos (`IMAGE_REMOTE_HOSTS`) | None, so profiles show initials | Set the variable to the storage host, redeploy |
| O39 | Paid one-to-one guidance in financial literacy | Free only: `MentorCategory.paidAllowed` is false for financial-literacy, and its disclaimer must be acknowledged before booking | Flip `paidAllowed` in /admin/mentors/categories after legal advice (SEBI) |

### 7.2 Open questions in the data model (data-model section g)

Each item says who must answer it and what happens until then.

1. **The rank ladder (OQ-A).** `RankDefinition.criteria` and `RankAward` are in place, and members who hold a rank keep it as a GRANDFATHERED award. Which ranks exist and what each requires is the owner's decision. Until then the existing ranks and their XP rules stay.
2. **`btree_gist` on Neon.** Confirm the extension on the production branch before the first deploy. If it is refused, leave migration 000800 out; the row lock in the booking code still prevents double booking.
3. **Privacy defaults.** The new facets activity, skills, projects, challenges, follows and directory are on by default. They need a DPDP review before launch.
4. **Academy names (OQ-B).** The academies use the directive's names, while the pillar badges still say Builder, Tycoon and Mind. The owner should confirm the names, and whether "Investment Advisory" in the Wealth flagship's name is acceptable under SEBI rules.
5. **The CREATOR label.** It changes to "Affiliate" (e.1). Confirm.
6. **Staff grants (owner decision O37).** Delegating one staff area, such as `events.manage`, to someone who is not a moderator or administrator needs a small `StaffGrant` table. It is not in this model. Default: not built; staff areas need ADMIN, or MODERATOR for the moderation areas.
7. **Money terms.** Revenue share, payout terms and the cancellation and refund policy for paid sessions and events are the owner's to set (LEAD #15). Until a `RevenueShareAgreement` exists, paid offerings cannot be published. An agreement holds the share, `holdDays`, `minPayoutCents` and `refundWindowHours`; publishing is refused while any of them is null. There is no separate platform fee field: the platform keeps 10000 − `contributorShareBps` basis points. A mentor's cancellation window is `MentorProfile.cancellationHours` (null: until the start).
8. **A frequent dispatcher.** Vercel crons on the current plan run daily, so a reminder 60 minutes before an event needs Vercel Pro or an external scheduler calling `/api/cron/dispatch`. Until then dispatch runs when a member opens the bell and after requests (e.5), which may be late on a quiet site.
9. **Event kinds as a table** (departure 2). Confirm.
10. **The founder link (B10).** The founder's `Instructor` row is linked to an account with `authoring.linkInstructorUser` (DR-34) at `/admin/courses/instructors`, once that account exists and its email is verified.
11. **Editorial categories.** The eight in d.1.4 are a proposal. Confirm or replace before the first articles are filed.
12. **Rows inserted by migrations** (departure 1 and 2): the four academies and the one-to-one event kind. Confirm.
13. **Dropping `Referral.signupIp`.** Drop it in a later migration, once a release has shipped in which no build writes it.
14. **Essential topics.** The seven transactional topics in e.5 ignore pause, email opt-out and quiet hours. Confirm the list.
15. **Testimonials on account deletion.** `Testimonial.userId` is set to null when the account is deleted, so the quote survives. Proposed: deleting the account also sets `consentWithdrawnAt`, which unpublishes it. The owner should confirm.
16. **INSTRUCTOR and `/admin`.** Instructors keep `admin.access` for `/admin/courses`. Once `/studio` covers authoring, the owner may remove it.
17. **Deleting a contributor's account (owner decision O36).** `ContributorAccount.user` is RESTRICT, so deleting the user is refused while the account exists (c.4, rerun). The published privacy policy promises anonymisation, so the account-deletion flow anonymises a contributor: it clears the profile, payout method and contact fields and keeps the earnings, agreements and payouts for the books. Default: keep and anonymise.
18. **Deploy timing.** Three changes are safe only if these migrations ship before production first runs (c.5): `MissionCompletion.occurrence` SET NOT NULL, RESTRICT on `CommunityPost.groupId`, and the `Post.status` backfill. If a production build goes live first, split them into a second migration or use a maintenance window.
19. **The `fix/seed-review` branch.** Settled: `build/full-platform` merged it at `dd5810e`, and the merge of full-platform before P0a brings it in.
20. **The key switch for IP hashes.** Moving `ipKey` to HMAC changes the affiliate click dedupe once (e.10). Before launch this has no effect.
21. **`docs/DATABASE.md`.** It says paid time comes from `Payment.createdAt`, which is wrong (defect 3). Correct it when the migrations land.
22. **Reviewed course edits and DR-34 (owner decision O35).** DR-34 lets a published programme change only through an administrator. LEARN builds `ContentSubmission` (type COURSE_UPDATE) so an author can propose an edit to a published programme as a reviewed revision, and only an administrator can approve it, which keeps DR-34's rule. `Instructor.trustedAuthor` (BLOCKED_ON_YOU item 12) would let a named author skip that review; it stays unused until the owner decides.
23. **The skill catalogue.** The 31 skills in d.1.6 are derived from the module titles of the four programmes. The owner should review the list before members can declare skills.
24. **Photo hosts (owner decision O38).** Expert photos load only from hosts in `IMAGE_REMOTE_HOSTS`. Default: none, so profiles show initials until the owner names hosts or uploads ship.
25. **Paid financial-literacy offerings (owner decision O39).** `MentorCategory.paidAllowed` is false for `financial-literacy`. Default: free only, until the owner confirms the regulatory position.
26. **Booking mode.** Mentors book INSTANT by default. REQUEST holds the slot for `min(slot start − minNoticeHours, now + 48 hours)`, and a member may have at most three open requests. The owner may change either number.

---

## 8. Blocked items, and what ships meanwhile

Each item says what it is blocked on, what ships meanwhile, and how the affected requirements are classified in the end-of-build report. "Existing item n" is an entry already in TYCOONHOOD_BLOCKED_ON_YOU.md; P0f-S adds the new ones.

| # | Blocked on | What ships meanwhile | Classification it causes |
|---|---|---|---|
| B1 | Razorpay KYC and live keys | Paid offerings, paid events and paid courses stay off in production. Free bookings, free events and THC spending work. The sandbox runs only under `next dev`, labelled | Paid checkout IMPLEMENTED BUT UNVERIFIED |
| B2 | Resend and a verified domain | Notifications are in-app. In development, email goes to the dev log. Settings say "Email notifications start when email is set up". Digests are skipped | Email IMPLEMENTED BUT UNVERIFIED |
| B3 | The domain | Everything works behind Vercel login. ICS, calendar feeds and email links use `NEXT_PUBLIC_SITE_URL` | Deploy item, existing item 2 |
| B4 | An LLM key, and legal sign-off on the AI processor notice | The deterministic guide, labelled automated | Guide LLM mode BLOCKED |
| B5 | VAPID keys | Push is inert, and the settings page says it is not available | Push BLOCKED |
| B6 | File storage for uploads, and an allowed image host (O38) | No uploads. Mentor photos, project images and resources are https URLs, validated; a photo shows only from an allowed host after staff verify it, otherwise initials. Credential evidence is a staff note, not a file | PARTIAL where a map asks for uploads or imagery (platform R022) |
| B7 | Legal review: DPDP privacy policy, terms, contributor and partner terms, opportunity rules, booking refunds, minors policy, SEBI naming and paid financial-literacy guidance (`paidAllowed`, O39), GST and TDS on contributor payouts | Drafts are labelled "pending legal review". Acceptance is recorded against version "draft-1". Contributor payouts cannot be requested (O6). Unpaid listings stay off (O22). Financial-literacy bookings are free | IMPLEMENTED BUT UNVERIFIED for the legal text |
| B8 | Real mentors, instructors, events, partners and listings | Honest empty states, founder-led programmes, recordings if any, and "applications open" copy. Demo data only in local development | The features stay VERIFIED COMPLETE by journeys with fixtures. Content is reported as "awaiting real people" |
| B9 | Photos and hero media | Existing graded photos; code-drawn academy marks | PARTIAL for platform R022 |
| B10 | Harsha's copy approval and a linked account | The About page stays IMPLEMENTED BUT UNVERIFIED. The founder note shows only once approved. The founder Instructor is linked to a user through `authoring.linkInstructorUser` at /admin/courses/instructors when the account exists | Existing item 7 |
| B11 | Real success stories with consent | /success-stories shows none and explains how stories are collected | — |
| B12 | Merch prices and stock | Unchanged: the merch is draft and hidden. Scarcity copy never appears without confirmed stock | Existing item 6 |
| B13 | YouTube links for watch-to-earn | Unchanged | Existing item 10 |
| B14 | Vercel Pro or a scheduler | The D4 behaviour (O11): daily cron, on-read dispatch, and reminders that are skipped as stale after `notAfter` rather than sent late | Reminder timing PARTIAL |
| B15 | Neon plan | Free plan for launch | Existing item 8 |
| B16 | The exact red and lattice specification | Nothing is introduced. Platform R014, R015 and R020 are BLOCKED | BLOCKED |
| B17 | Discord roles for new ranks | Discord sync stays on the current five ranks | PARTIAL if the new ladder is published |
| B18 | Video-conferencing or calendar OAuth (optional) | Any https meeting link, plus ICS and the calendar feed. No meetings are created automatically | — |
| B19 | The admin account in Vercel | Unchanged: the first deploy stops without it | Existing item 1 |
| B20 | A real-GPU check of /world | Unchanged. /world stays optional and J31 proves it is not needed | Existing item 9 |

---

## 9. Timeline

### 9.1 Assumptions

- **Wall-clock hours of continuous running,** with the lead supervising. Units run through the queue-runner workflows of section W1.3: at most 4 implementing at once on this machine (4 CPUs, 15 GB, one PostgreSQL 16.15 server), heavy commands behind the 2-permit semaphore.
- **Per unit:** the implementation estimate in its brief, plus 2 hours (low), 3 hours (mid) or 4.5 hours (high) for review, fixes and the pre-review full run. A merge, with its full-suite check, takes 0.5 to 1 hour.
- **P0** takes 20, 25 or 32 hours including the launch-branch merge and its gate. **INT** takes 16, 23 or 30 hours after POLISH merges.
- The schedule was simulated (greedy list scheduling of the 25 units over 4 slots, in §20 priority order with the departures of W1.2), from `final/ws/sched.py` in the planning scratchpad.
- **Not in the simulation,** so added as an allowance: lead migrations for missing fields (section W3.6), gate failures, the daily launch-branch merges and owner questions that stop a unit. They add about 10 percent at the midpoint and more at the high end.

### 9.2 Estimates per unit (implementation hours)

| Unit | Hours | Unit | Hours | Unit | Hours |
|---|---|---|---|---|---|
| ACAD | 6.5-9.5 | DAILY-B | 6-8.5 | OPPS-B | 8.5-11 |
| MENTOR-A | 4.5-6.5 | EDIT-A | 5-6.5 | SKILLS | 10-13 |
| MENTOR-B | 5.5-8.5 | EDIT-B | 4-5.5 | RANKS | 7-10 |
| LIVE-A | 6-8.5 | TODAY | 8-11 | MONEY | 10-14 |
| LIVE-B | 4-6 | SOCIAL | 10-13 | HOME | 8-10 |
| LEARN | 10-13 | GROUPS | 7.5-10.5 | GUIDE | 9-12 |
| BOOK | 11-15 | NOTIFY | 7-10 | ANALYTICS | 8-11 |
| DAILY-A | 6-8 | OPPS-A | 3-4.5 | CONNECT | 5-8 |
| | | | | POLISH | 6-9 |

### 9.3 The midpoint schedule (4 slots)

Hours from the start of P0. "Merged" includes the merge.

| Unit | Starts | Merged | Unit | Starts | Merged |
|---|---|---|---|---|---|
| ACAD | 25.0 | 37.0 | GROUPS | 58.2 | 71.2 |
| LIVE-A | 25.0 | 36.2 | LIVE-B | 59.5 | 68.5 |
| MENTOR-A | 25.0 | 34.5 | OPPS-A | 59.8 | 67.5 |
| MENTOR-B | 25.0 | 36.0 | OPPS-B | 66.5 | 80.2 |
| DAILY-A | 33.5 | 44.5 | RANKS | 67.5 | 80.0 |
| DAILY-B | 35.0 | 46.2 | SKILLS | 68.0 | 83.5 |
| EDIT-A | 35.2 | 45.0 | MONEY | 70.2 | 86.2 |
| EDIT-B | 36.0 | 44.8 | GUIDE | 79.0 | 93.5 |
| BOOK | 43.5 | 60.5 | ANALYTICS | 79.2 | 92.8 |
| LEARN | 43.8 | 59.2 | CONNECT | 82.5 | 93.0 |
| NOTIFY | 44.0 | 56.5 | HOME | 85.2 | 98.2 |
| SOCIAL | 45.2 | 60.8 | POLISH | 98.2 | 109.8 |
| TODAY | 55.5 | 69.0 | INT | 109.8 | 132.8 |

The critical path runs P0 → the P1 units → BOOK and LEARN → MONEY and the P5 readers → HOME → POLISH → INT. INT's journeys and the early passes use idle slots before POLISH merges, which the simulation does not count.

### 9.4 Range

| Case | P0 ends | Last unit merges | INT ends | With the allowance |
|---|---|---|---|---|
| Low | 20 | 87.5 | 103.5 | about 105 |
| Mid | 25 | 109.8 | 132.8 | about 145 |
| High | 32 | 138.5 | 168.5 | about 185 |

**Plan on about 145 hours** of continuous running: six days. The work runs round the clock from 12 November 12:00 UTC, so the site is ready for the owner's check around **Wednesday 18 November**; the range is 105 to 185 hours (about 16 to 20 November). Any time the work stops moves the date by the same amount.

**Effect of the slot count** (midpoint, before INT and the allowance): with 3 implementing slots the last unit merges at 132.5 hours (about 23 hours later); with 5 at 95.5; with 6 at 88.8. Going above 4 needs more memory than this machine has with `next dev` running per unit, so 4 is the plan, and 3 is the fallback of section W3.6.

---

## 10. End-of-build report format (in TYCOONHOOD_STATE.md)

INT adds this as a new top-level section of TYCOONHOOD_STATE.md and keeps the existing sections. scripts/report/ecosystem-status.mjs builds the tables from docs/ecosystem/requirements/*.json, the vitest JSON report and the journeys JSON summary, so the report can be regenerated.

```markdown
## 10. Living Ecosystem directive (§1-§21)

**Integrated head:** build/full-platform @ <sha> (from build/living-ecosystem @ <sha>), <date>.
**Evidence rule:** a row is VERIFIED COMPLETE only when an automated test or journey that exercises it ran
on this head on this date. A feature that has a page needs a journey, not only a unit test.
IMPLEMENTED BUT UNVERIFIED = built, but the end-to-end check needs a credential, hardware or person that is not here.
PARTIAL = works, with the gap named. BLOCKED = needs an owner item (BLOCKED_ON_YOU number). NOT IMPLEMENTED = not built,
with the reason.

### 10.1 Definition of done (§21)
| # | §21 line | Classification | Evidence | Gap or blocker |
|---|---|---|---|---|
| 1 | Members can discover and join academies | … | J10, J31; academies-service.test.ts (n tests) | … |
| … one row for each of the 18 §21 lines (the 15 capabilities, mobile, no 3D world, journeys tested) … |

### 10.2 Directive features
| Feature | § | Unit | Classification | Evidence | Gap or blocker (item) |
|---|---|---|---|---|---|
| … one row per feature, grouped by section, using the row list below … |

### 10.3 Requirement counts (451 map requirements)
| Classification | Count |
|---|---|
| VERIFIED COMPLETE | … |
| IMPLEMENTED BUT UNVERIFIED | … |
| PARTIAL | … |
| BLOCKED | … |
| NOT IMPLEMENTED | … (each listed with its reason) |

### 10.4 Units
| Unit | Merged at | Requirements (verified / other) | Journeys | Review findings fixed / accepted |
|---|---|---|---|---|
| … one row for each of the 25 units, plus P0 and INT … |

### 10.5 Gates on the integrated head
| Gate | Result |
|---|---|
| pnpm typecheck / lint | … |
| pnpm test | N / N (files, duration, PostgreSQL 16), against the P0 baseline |
| pnpm build:web | routes; bundle rule: no route chunk carries three.js |
| pnpm e2e:a11y | pages × 2 widths: violations |
| pnpm e2e:journeys | passed / failed / skipped (and which skips ran under next dev) |
| Migrations | applied to an empty and a populated database; drift output after the five-line filter: empty |
| Deploy rehearsal | migrations, seeds (a second taxonomy run creates nothing), empty DB, preview leaves DB untouched |
| Adversarial passes A1-A8 | findings found / fixed / accepted with reason |

### 10.6 Owner decisions shipped with their default (O1-O39)
### 10.7 Blocked items and the behaviour that ships (B1-B20)
```

**Rows for table 10.2 of the report.** There is one row per feature. Every row maps to Appendix A rows and the unit that built it.

| § | Feature rows |
|---|---|
| §1 | interconnected pillars |
| §2 | mentor directory; mentor profiles; categories and disclaimers; application and verification; mentor studio; availability and booking (free, instant and request); paid bookings; reminders; reviews; mentor earnings and payouts; founder-led fallback; demo mentors (development only) |
| §3 | academy pages; join several academies; academy identity; academy courses, mentors, instructors, paths, live sessions, workshops, challenges, discussions, achievements, activity, upcoming events, products |
| §4 | activity feed; posts, updates, questions, comments, reactions; follow; save; report; academy spaces; groups (roles, invitations, posts, events, challenges, announcements, location); member directory and its facets; privacy |
| §5 | daily and weekly missions; monthly challenges; goals; academy and group challenges; streaks; progress; XP; achievement unlocks; personal boards; mission admin |
| §6 | events section and kinds; event fields; calendar and filters; external meeting links; reminders; attendance; resources; feedback; honest empty state |
| §7 | marketplace and categories; listing fields; discovery, search, filters; applications, chosen contact fields and status; saved; partner dashboard; approval; reporting; fraud prevention; skill matching; no guarantees |
| §8 | identity; level and ranks; academies; progress; skills; achievements and badges; missions and contributions; projects and collaborators; certificates; XP history; showcase; academy and challenge leaderboards; skill progression; milestones; recognition; anti-spam |
| §9 | deterministic guide; guide LLM mode |
| §10 | each of the 15 homepage sections; dynamic content; empty-database look; homepage admin |
| §11 | each of the 6 dashboard sections; personalization without clutter |
| §12 | contributor registration; creator profiles; course, workshop and resource submissions; course revisions; review and approval; contributor analytics; revenue terms; instructor view of learners |
| §13 | centre; each topic group; preferences; per-topic unsubscribe; in-app; email; push; anti-spam |
| §14 | each content kind; drafts, review, scheduling; categories and tags; bylines; search; featured; calendar; no fabricated stories |
| §15 | founder identity, About, portrait, message (approved), vision, announcements, notes, updates, community messages |
| §16 | design direction; imagery (PARTIAL, B6 and B9); motion; transitions; progress visuals; red (BLOCKED); lattice (BLOCKED) |
| §17 | each authenticity rule |
| §18 | each of the 22 admin screens |
| §19 | each of the 15 metrics; analytics dashboard; privacy |

---

## Appendix A. Every map requirement and its owner

Generated from the seven map files by a checker that fails if any requirement is unassigned or assigned twice. Requirement ids are the zero-based position of the requirement in that map's `requirements` array (platform uses three digits). `Status` is the map's own finding against commit f7c8ff1. `Unit` is the build unit that owns the row; a split stream's rows carry its A or B half. `INT` rows are the lead's verification items: cross-section touchpoints whose screens other units build, plus 'no 3D world required', 'journeys tested' and the report format. `BLOCKED` rows ship with the interim behaviour in section 8.

Total: 451 requirements.

| Unit | Requirements owned |
|---|---|
| P0 | 9 |
| ACAD | 17 |
| MENTOR-A | 11 |
| MENTOR-B | 21 |
| LIVE-A | 28 |
| LIVE-B | 11 |
| LEARN | 17 |
| BOOK | 14 |
| DAILY-A | 12 |
| DAILY-B | 8 |
| EDIT-A | 21 |
| EDIT-B | 16 |
| TODAY | 42 |
| SOCIAL | 31 |
| GROUPS | 16 |
| NOTIFY | 8 |
| OPPS-A | 3 |
| OPPS-B | 38 |
| SKILLS | 14 |
| RANKS | 17 |
| MONEY | 9 |
| HOME | 24 |
| GUIDE | 13 |
| ANALYTICS | 22 |
| CONNECT | 3 |
| POLISH | 16 |
| INT | 7 |
| BLOCKED | 3 |

### Map `mentors` (51 requirements)

| Id | § | Requirement | Status | Unit |
|---|---|---|---|---|
| R00 | §2 | Build a complete MENTOR NETWORK. | missing | MENTOR-B |
| R01 | §2 | Mentorship must become a central part of Tycoonhood. | missing | MENTOR-B |
| R02 | §2 | Create a dedicated Mentor Directory. | missing | MENTOR-B |
| R03 | §2 | Mentor categories: 1 Business Mentors, 2 Entrepreneurship Mentors, 3 Marketing Mentors, 4 Sale… | missing | MENTOR-B |
| R04 | §2 | Profile: Real photograph. | partial | MENTOR-B |
| R05 | §2 | Profile: Name. | partial | MENTOR-B |
| R06 | §2 | Profile: Professional biography. | partial | MENTOR-B |
| R07 | §2 | Profile: Expertise. | missing | MENTOR-B |
| R08 | §2 | Profile: Experience. | missing | MENTOR-B |
| R09 | §2 | Profile: Qualifications where verified. | missing | MENTOR-A |
| R10 | §2 | Profile: Areas of mentorship. | missing | MENTOR-B |
| R11 | §2 | Profile: Available programmes. | partial | LEARN |
| R12 | §2 | Profile: Upcoming sessions. | missing | BOOK |
| R13 | §2 | Profile: Availability. | missing | BOOK |
| R14 | §2 | Profile: Session pricing, if applicable. | missing | MONEY |
| R15 | §2 | Profile: Reviews from verified participants. | partial | BOOK |
| R16 | §2 | Profile: Mentorship history. | missing | BOOK |
| R17 | §2 | Profile: Languages. | missing | MENTOR-B |
| R18 | §2 | Profile: Verification status. | missing | MENTOR-A |
| R19 | §2 | Build: Mentor registration. | missing | MENTOR-A |
| R20 | §2 | Build: Mentor application. | missing | MENTOR-A |
| R21 | §2 | Build: Admin verification. | missing | MENTOR-A |
| R22 | §2 | Build: Mentor dashboard. | missing | MENTOR-B |
| R23 | §2 | Build: Session scheduling. | missing | BOOK |
| R24 | §2 | Build: Booking management. | missing | BOOK |
| R25 | §2 | Build: Calendar availability. | missing | BOOK |
| R26 | §2 | Build: One-to-one sessions. | missing | BOOK |
| R27 | §2 | Build: Group mentoring. | missing | BOOK |
| R28 | §2 | Build: Live workshops. | missing | LIVE-A |
| R29 | §2 | Build: Session reminders. | missing | BOOK |
| R30 | §2 | Build: Reviews and feedback. | partial | BOOK |
| R31 | §2 | Build: Mentor earnings dashboard. | partial | MONEY |
| R32 | §2 | Build: Payout management. | partial | MONEY |
| R33 | §2 | Members must be able to discover mentors, understand what they offer and book sessions. | missing | BOOK |
| R34 | §2 | Create mentor-led learning programmes. | partial | LEARN |
| R35 | §2 | Do not invent mentors, qualifications, testimonials or availability. | partial | MENTOR-B |
| R36 | §2 | Create sample mentor profiles only in clearly labelled development/demo data. | missing | MENTOR-B |
| R37 | §2 | Allow the platform to operate with founder-led and instructor-led content initially. | partial | MENTOR-B |
| R38 | §12 | Create a system that allows qualified contributors to participate in Tycoonhood. | partial | MENTOR-A |
| R39 | §12 | Support: Instructor registration. | missing | MENTOR-A |
| R40 | §12 | Support: Creator profiles. | partial | MENTOR-B |
| R41 | §12 | Support: Course submissions. | partial | LEARN |
| R42 | §12 | Support: Workshop submissions. | missing | LIVE-A |
| R43 | §12 | Support: Learning resources. | partial | LEARN |
| R44 | §12 | Support: Mentor applications. | missing | MENTOR-A |
| R45 | §12 | Support: Revenue-sharing configuration. | missing | MONEY |
| R46 | §12 | Support: Content review. | partial | LEARN |
| R47 | §12 | Support: Admin approval. | partial | LEARN |
| R48 | §12 | Support: Performance analytics. | partial | LEARN |
| R49 | §12 | Instructors should be able to manage their approved courses and see student progress where per… | partial | LEARN |
| R50 | §12 | Creators should be able to showcase useful work and collaborate with the community. | partial | SKILLS |

### Map `academies` (43 requirements)

| Id | § | Requirement | Status | Unit |
|---|---|---|---|---|
| R00 | §3 | Introduce a campus-based learning architecture. | partial | ACAD |
| R01 | §3 | Do not confuse campuses with the existing 3D world. | partial | ACAD |
| R02 | §3 | Campuses must be accessible through normal web navigation. | missing | ACAD |
| R03 | §3 | WARRIOR ACADEMY: physical discipline, mental resilience, fitness, habits and self-mastery. | partial | ACAD |
| R04 | §3 | BUSINESS ACADEMY: entrepreneurship, business strategy, marketing, sales, leadership and execut… | partial | ACAD |
| R05 | §3 | WEALTH ACADEMY: financial literacy, investment education, budgeting, wealth creation and finan… | partial | ACAD |
| R06 | §3 | WELLNESS ACADEMY: mindfulness, meditation, emotional awareness, sleep and sustainable wellness. | partial | ACAD |
| R07 | §3 | Each academy should have: Academy homepage. | missing | ACAD |
| R08 | §3 | Each academy should have: Courses. | partial | ACAD |
| R09 | §3 | Each academy should have: Mentors. | missing | MENTOR-B |
| R10 | §3 | Each academy should have: Instructors. | partial | ACAD |
| R11 | §3 | Each academy should have: Learning paths. | missing | LEARN |
| R12 | §3 | Each academy should have: Live sessions. | missing | LIVE-B |
| R13 | §3 | Each academy should have: Workshops. | missing | LIVE-B |
| R14 | §3 | Each academy should have: Challenges. | partial | DAILY-B |
| R15 | §3 | Each academy should have: Community discussions. | partial | SOCIAL |
| R16 | §3 | Each academy should have: Achievements. | partial | RANKS |
| R17 | §3 | Each academy should have: Member activity. | missing | ACAD |
| R18 | §3 | Each academy should have: Upcoming events. | missing | LIVE-B |
| R19 | §3 | Each academy must have its own visual identity within the overall Tycoonhood design system. | partial | ACAD |
| R20 | §3 | Users should be able to join multiple academies. | partial | ACAD |
| R21 | §8 | Make membership feel meaningful. Build a unified identity and progression system. | partial | SKILLS |
| R22 | §8 | Every member should have: Profile. | exists | SKILLS |
| R23 | §8 | Every member should have: Member level. | exists | RANKS |
| R24 | §8 | Every member should have: Academy memberships. | missing | ACAD |
| R25 | §8 | Every member should have: Learning progress. | partial | SKILLS |
| R26 | §8 | Every member should have: Skills. | missing | SKILLS |
| R27 | §8 | Every member should have: Achievements. | partial | RANKS |
| R28 | §8 | Every member should have: Badges. | partial | RANKS |
| R29 | §8 | Every member should have: Missions completed. | partial | SKILLS |
| R30 | §8 | Every member should have: Community contributions. | partial | SKILLS |
| R31 | §8 | Every member should have: Projects. | missing | SKILLS |
| R32 | §8 | Every member should have: Certificates. | exists | SKILLS |
| R33 | §8 | Every member should have: XP history. | partial | RANKS |
| R34 | §8 | Create meaningful ranks (Initiate, Apprentice, Practitioner, Specialist, Strategist, Master ar… | partial | RANKS |
| R35 | §8 | Ranks must be earned through meaningful activities, not arbitrary engagement. | partial | RANKS |
| R36 | §8 | Implement: Personal achievement showcase. | partial | RANKS |
| R37 | §8 | Implement: Academy leaderboards. | missing | RANKS |
| R38 | §8 | Implement: Challenge leaderboards. | missing | RANKS |
| R39 | §8 | Implement: Skill progression. | missing | SKILLS |
| R40 | §8 | Implement: Learning milestones. | partial | LEARN |
| R41 | §8 | Implement: Community recognition. | partial | RANKS |
| R42 | §8 | Avoid creating a system that rewards spam or unhealthy compulsive engagement. | partial | RANKS |

### Map `community` (66 requirements)

| Id | § | Requirement | Status | Unit |
|---|---|---|---|---|
| R00 | §4 | Build a proper community experience. A dead discussion board is not enough. (151-153) | partial | SOCIAL |
| R01 | §4 | Show genuine member activity (an activity feed) (155-157) | missing | SOCIAL |
| R02 | §4 | Course completions (159) | partial | SOCIAL |
| R03 | §4 | New member introductions (160) | partial | SOCIAL |
| R04 | §4 | Challenge participation (161) | partial | SOCIAL |
| R05 | §4 | Achievements (162) | partial | SOCIAL |
| R06 | §4 | Mentor announcements (163) | missing | SOCIAL |
| R07 | §4 | Workshop announcements (164) | missing | LIVE-A |
| R08 | §4 | Project showcases (165) | missing | SKILLS |
| R09 | §4 | Discussion highlights (166) | partial | SOCIAL |
| R10 | §4 | Community milestones (167) | missing | SOCIAL |
| R11 | §4 | Create posts (171) | exists | SOCIAL |
| R12 | §4 | Share updates (172) | partial | SOCIAL |
| R13 | §4 | Ask questions (173) | exists | SOCIAL |
| R14 | §4 | Share projects (174) | partial | SKILLS |
| R15 | §4 | Comment (175) | exists | SOCIAL |
| R16 | §4 | React (176) | exists | SOCIAL |
| R17 | §4 | Follow members (177) | missing | SOCIAL |
| R18 | §4 | Save posts (178) | missing | SOCIAL |
| R19 | §4 | Report inappropriate content (179) | partial | SOCIAL |
| R20 | §4 | Provide academy-specific discussion spaces (181) | partial | SOCIAL |
| R21 | §4 | Join groups based on business interests (187) | partial | GROUPS |
| R22 | §4 | Fitness goals (188) | partial | GROUPS |
| R23 | §4 | Learning programmes (189) | partial | GROUPS |
| R24 | §4 | Entrepreneurship (190) | partial | GROUPS |
| R25 | §4 | Personal development (191) | partial | GROUPS |
| R26 | §4 | Technology (192) | missing | GROUPS |
| R27 | §4 | Local networking (193) | missing | GROUPS |
| R28 | §4 | Group owners (197) | missing | GROUPS |
| R29 | §4 | Moderators (198) | partial | GROUPS |
| R30 | §4 | Membership (199) | partial | GROUPS |
| R31 | §4 | Group posts (200) | exists | GROUPS |
| R32 | §4 | Events (201) | missing | GROUPS |
| R33 | §4 | Group challenges (202) | missing | GROUPS |
| R34 | §4 | Group announcements (203) | partial | GROUPS |
| R35 | §4 | Create a member directory (207) | missing | SOCIAL |
| R36 | §4 | Name (210) | exists | SOCIAL |
| R37 | §4 | Profile image (211) | partial | SOCIAL |
| R38 | §4 | Bio (212) | exists | SOCIAL |
| R39 | §4 | Interests (213) | partial | SOCIAL |
| R40 | §4 | Skills (214) | missing | SKILLS |
| R41 | §4 | Academies joined (215) | missing | SOCIAL |
| R42 | §4 | Achievements (216) | exists | SOCIAL |
| R43 | §4 | Projects (217) | missing | SKILLS |
| R44 | §4 | Learning interests (218) | partial | SOCIAL |
| R45 | §4 | Respect member privacy settings (220) | partial | P0 |
| R46 | §4 | Never expose personal contact information without consent (221) | exists | P0 |
| R47 | §13 | Build an actual notification centre (510) | partial | NOTIFY |
| R48 | §13 | New mentor announcements (513) | missing | MENTOR-B |
| R49 | §13 | Session reminders (514) | missing | LIVE-B |
| R50 | §13 | Course updates (515) | partial | LEARN |
| R51 | §13 | Assignment feedback (516) | partial | LEARN |
| R52 | §13 | Challenge reminders (517) | missing | DAILY-B |
| R53 | §13 | Achievement unlocks (518) | exists | RANKS |
| R54 | §13 | Community replies (519) | exists | SOCIAL |
| R55 | §13 | Opportunity updates (520) | missing | OPPS-B |
| R56 | §13 | Application status (521) | partial | OPPS-B |
| R57 | §13 | Order updates (522) | exists | MONEY |
| R58 | §13 | Important platform announcements (523) | partial | NOTIFY |
| R59 | §13 | Implement notification preferences (525) | missing | NOTIFY |
| R60 | §13 | Support in-app notifications first (526) | exists | NOTIFY |
| R61 | §13 | Design email and push notification integration points (527) | partial | NOTIFY |
| R62 | §13 | Avoid unnecessary spam (528) | partial | NOTIFY |
| R63 | §18 | Admin control centre: Community groups, Community moderation, Notifications (639-640, 648) | partial | INT |
| R64 | §19 | Community participation analytics (671) | partial | ANALYTICS |
| R65 | §21 | Members can participate in real discussions; Groups function properly; Notifications work (733… | partial | INT |

### Map `daily` (55 requirements)

| Id | § | Requirement | Status | Unit |
|---|---|---|---|---|
| R00 | §5 | Give members a meaningful reason to return; build a Daily Activity Engine (directive:225-227) | partial | TODAY |
| R01 | §5 | Every day, the member dashboard should offer relevant activities (directive:228) | partial | TODAY |
| R02 | §5 | Example: Today's learning task (directive:231) | partial | TODAY |
| R03 | §5 | Example: Daily discipline challenge (directive:232) | partial | TODAY |
| R04 | §5 | Example: Business exercise (directive:233) | partial | TODAY |
| R05 | §5 | Example: Financial literacy lesson (directive:234) | partial | TODAY |
| R06 | §5 | Example: Fitness activity (directive:235) | partial | TODAY |
| R07 | §5 | Example: Mindfulness exercise (directive:236) | partial | TODAY |
| R08 | §5 | Example: Community discussion (directive:237) | partial | TODAY |
| R09 | §5 | Example: Weekly mission (directive:238) | exists | DAILY-A |
| R10 | §5 | Example: Mentor session (directive:239) | missing | TODAY |
| R11 | §5 | Example: New learning opportunity (directive:240) | partial | TODAY |
| R12 | §5 | Implement: Daily missions (directive:244) | partial | DAILY-A |
| R13 | §5 | Implement: Weekly missions (directive:245) | partial | DAILY-A |
| R14 | §5 | Implement: Monthly challenges (directive:246) | partial | DAILY-B |
| R15 | §5 | Implement: Personal goals (directive:247) | missing | DAILY-B |
| R16 | §5 | Implement: Academy challenges (directive:249) | partial | DAILY-B |
| R17 | §5 | Implement: Group challenges (directive:250) | missing | DAILY-B |
| R18 | §5 | Implement: Learning streaks (directive:251) | partial | DAILY-A |
| R19 | §5 | Implement: Progress tracking (directive:252) | partial | DAILY-A |
| R20 | §5 | Implement: XP rewards (directive:253) | exists | DAILY-A |
| R21 | §5 | Implement: Achievement unlocks (directive:254) | partial | DAILY-A |
| R22 | §5 | Personalize activities on the member's selected interests and progress (directive:256) | partial | TODAY |
| R23 | §5 | Do not give every user identical meaningless tasks (directive:257) | partial | DAILY-A |
| R24 | §5 | Create an admin-controlled mission management system (directive:258) | partial | DAILY-A |
| R25 | §5 | Missions must have clear instructions, completion criteria and appropriate rewards (directive:… | partial | DAILY-A |
| R26 | §11 | The dashboard must feel like a personal command centre (directive:440) | partial | TODAY |
| R27 | §11 | Create the sections WELCOME BACK, YOUR JOURNEY, TODAY AT TYCOONHOOD, YOUR PEOPLE, YOUR OPPORTU… | partial | TODAY |
| R28 | §11 | WELCOME BACK: Personalized greeting (directive:444) | exists | TODAY |
| R29 | §11 | WELCOME BACK: Member rank (directive:445) | exists | TODAY |
| R30 | §11 | WELCOME BACK: Current goals (directive:446) | missing | TODAY |
| R31 | §11 | WELCOME BACK: Progress summary (directive:447) | partial | TODAY |
| R32 | §11 | YOUR JOURNEY: Active academies (directive:451) | missing | TODAY |
| R33 | §11 | YOUR JOURNEY: Current programmes (directive:452) | partial | TODAY |
| R34 | §11 | YOUR JOURNEY: Continue learning (directive:453) | exists | TODAY |
| R35 | §11 | YOUR JOURNEY: Skills being developed (directive:454) | missing | TODAY |
| R36 | §11 | TODAY AT TYCOONHOOD: Daily mission (directive:458) | partial | TODAY |
| R37 | §11 | TODAY AT TYCOONHOOD: Recommended lesson (directive:459) | partial | TODAY |
| R38 | §11 | TODAY AT TYCOONHOOD: Upcoming events (directive:460) | missing | TODAY |
| R39 | §11 | TODAY AT TYCOONHOOD: Relevant community discussion (directive:461) | partial | TODAY |
| R40 | §11 | YOUR PEOPLE: Recommended mentors (directive:465) | missing | TODAY |
| R41 | §11 | YOUR PEOPLE: Group activity (directive:466) | partial | TODAY |
| R42 | §11 | YOUR PEOPLE: New discussions (directive:467) | exists | TODAY |
| R43 | §11 | YOUR PEOPLE: Community updates (directive:468) | exists | TODAY |
| R44 | §11 | YOUR OPPORTUNITIES: Recommended projects (directive:472) | missing | TODAY |
| R45 | §11 | YOUR OPPORTUNITIES: Affiliate activity (directive:473) | exists | TODAY |
| R46 | §11 | YOUR OPPORTUNITIES: Applications (directive:474) | partial | TODAY |
| R47 | §11 | YOUR OPPORTUNITIES: Available challenges (directive:475) | partial | TODAY |
| R48 | §11 | YOUR ACHIEVEMENTS: XP (directive:479) | exists | TODAY |
| R49 | §11 | YOUR ACHIEVEMENTS: Level (directive:480) | exists | TODAY |
| R50 | §11 | YOUR ACHIEVEMENTS: Badges (directive:481) | partial | TODAY |
| R51 | §11 | YOUR ACHIEVEMENTS: Streak (directive:482) | exists | TODAY |
| R52 | §11 | YOUR ACHIEVEMENTS: Certificates (directive:483) | partial | TODAY |
| R53 | §11 | Keep the interface clean and useful (directive:485) | partial | TODAY |
| R54 | §11 | Personalization must improve relevance rather than add clutter (directive:486) | partial | TODAY |

### Map `events-opps` (64 requirements)

| Id | § | Requirement | Status | Unit |
|---|---|---|---|---|
| R00 | §6 | Create a dedicated LIVE EVENTS section (:263) | missing | LIVE-B |
| R01 | §6 | Feature: upcoming workshops (:266) | missing | LIVE-B |
| R02 | §6 | Feature: mentor sessions (:267) | missing | LIVE-A |
| R03 | §6 | Feature: group learning events (:268) | missing | LIVE-A |
| R04 | §6 | Feature: business discussions (:269) | missing | LIVE-A |
| R05 | §6 | Feature: fitness challenges (:270) | partial | LIVE-A |
| R06 | §6 | Feature: wellness sessions (:271) | missing | LIVE-A |
| R07 | §6 | Feature: guest lectures (:272) | missing | LIVE-A |
| R08 | §6 | Feature: community meetups (:273) | missing | LIVE-A |
| R09 | §6 | Feature: online events (:274) | missing | LIVE-A |
| R10 | §6 | Each event must have: title (:278) | missing | LIVE-A |
| R11 | §6 | Each event must have: description (:279) | missing | LIVE-A |
| R12 | §6 | Each event must have: host (:280) | partial | LIVE-A |
| R13 | §6 | Each event must have: date (:281) | missing | LIVE-A |
| R14 | §6 | Each event must have: time (:282) | missing | LIVE-A |
| R15 | §6 | Each event must have: time zone (:283) | partial | LIVE-A |
| R16 | §6 | Each event must have: registration (:284) | missing | LIVE-A |
| R17 | §6 | Each event must have: participant limits (:285) | missing | LIVE-A |
| R18 | §6 | Each event must have: meeting link (:286) | missing | LIVE-A |
| R19 | §6 | Each event must have: reminder system (:287) | partial | LIVE-B |
| R20 | §6 | Each event must have: attendance tracking (:288) | missing | LIVE-A |
| R21 | §6 | Each event must have: post-event resources (:289) | partial | LIVE-B |
| R22 | §6 | Each event must have: feedback (:290) | missing | LIVE-A |
| R23 | §6 | Create an event calendar (:292) | missing | LIVE-B |
| R24 | §6 | Add filters by academy, mentor and event type (:293) | missing | LIVE-B |
| R25 | §6 | Support external meeting services through configurable links (:294) | missing | LIVE-A |
| R26 | §6 | Never display invented live sessions as real events (:295; §17 :621) | partial | LIVE-A |
| R27 | §6 | With no upcoming events, present useful recorded workshops and a transparent upcoming schedule… | missing | LIVE-B |
| R28 | §7 | The EARN section must become more than a referral page (:300) | partial | OPPS-B |
| R29 | §7 | Build a proper opportunity marketplace (:301) | missing | OPPS-B |
| R30 | §7 | Category: freelance projects (:304) | missing | OPPS-B |
| R31 | §7 | Category: remote work (:305) | missing | OPPS-B |
| R32 | §7 | Category: internships (:306) | missing | OPPS-B |
| R33 | §7 | Category: creator collaborations (:307) | missing | OPPS-B |
| R34 | §7 | Category: affiliate programmes (:309) | partial | OPPS-B |
| R35 | §7 | Category: business partnerships (:310) | missing | OPPS-B |
| R36 | §7 | Category: digital product opportunities (:311) | partial | OPPS-B |
| R37 | §7 | Category: marketplace seller opportunities (:312) | missing | OPPS-B |
| R38 | §7 | Category: skill-based projects (:313) | missing | OPPS-B |
| R39 | §7 | Category: community competitions (:314) | partial | OPPS-B |
| R40 | §7 | Each opportunity: title (:318) | partial | OPPS-B |
| R41 | §7 | Each opportunity: description (:319) | partial | OPPS-B |
| R42 | §7 | Each opportunity: category (:320) | missing | OPPS-B |
| R43 | §7 | Each opportunity: required skills (:321) | missing | OPPS-B |
| R44 | §7 | Each opportunity: eligibility (:322) | partial | OPPS-B |
| R45 | §7 | Each opportunity: compensation or reward terms (:323) | partial | OPPS-B |
| R46 | §7 | Each opportunity: application deadline (:324) | missing | OPPS-B |
| R47 | §7 | Each opportunity: provider (:325) | missing | OPPS-A |
| R48 | §7 | Each opportunity: verification status (:326) | missing | OPPS-A |
| R49 | §7 | Each opportunity: application process (:327) | partial | OPPS-B |
| R50 | §7 | Each opportunity: status (:328) | partial | OPPS-B |
| R51 | §7 | Implement: opportunity discovery (:332) | partial | OPPS-B |
| R52 | §7 | Implement: search (:333) | missing | OPPS-B |
| R53 | §7 | Implement: filters (:334) | missing | OPPS-B |
| R54 | §7 | Implement: applications (:335) | partial | OPPS-B |
| R55 | §7 | Implement: saved opportunities (:336) | missing | OPPS-B |
| R56 | §7 | Implement: application status tracking (:337) | partial | OPPS-B |
| R57 | §7 | Implement: employer/partner dashboard (:338) | missing | OPPS-A |
| R58 | §7 | Implement: admin approval (:339) | partial | OPPS-B |
| R59 | §7 | Implement: reporting (:340) | partial | OPPS-B |
| R60 | §7 | Implement: fraud prevention (:341) | partial | OPPS-B |
| R61 | §7 | Build a skill-to-opportunity matching system (:343) | missing | OPPS-B |
| R62 | §7 | Recommend opportunities from learning progress, interests and verified skills (:344) | missing | OPPS-B |
| R63 | §7 | Never promise guaranteed employment or income (:345) | partial | OPPS-B |

### Map `content` (67 requirements)

| Id | § | Requirement | Status | Unit |
|---|---|---|---|---|
| R00 | §9 | Build an intelligent member companion. The companion should help members navigate Tycoonhood. | missing | GUIDE |
| R01 | §9 | Explain platform features. | partial | GUIDE |
| R02 | §9 | Recommend relevant learning paths. | partial | GUIDE |
| R03 | §9 | Help users understand their progress. | partial | GUIDE |
| R04 | §9 | Suggest appropriate missions. | partial | GUIDE |
| R05 | §9 | Find relevant mentors. | missing | GUIDE |
| R06 | §9 | Discover upcoming events. | missing | GUIDE |
| R07 | §9 | Surface suitable opportunities. | missing | GUIDE |
| R08 | §9 | Help members set goals. | partial | GUIDE |
| R09 | §9 | Answer questions about course material. | missing | GUIDE |
| R10 | §9 | It should use actual Tycoonhood content and member-authorized data. | missing | GUIDE |
| R11 | §9 | Do not fabricate answers or claim to be a human mentor. | missing | GUIDE |
| R12 | §9 | Keep AI recommendations distinguishable from verified professional advice. | missing | GUIDE |
| R13 | §10 | Completely evaluate the homepage. The homepage must communicate movement, activity and opportu… | partial | HOME |
| R14 | §10 | 1. Powerful cinematic hero. | partial | HOME |
| R15 | §10 | 2. Clear Tycoonhood positioning. | exists | HOME |
| R16 | §10 | 3. Learn, Earn, Grow, Connect and Shop. | partial | HOME |
| R17 | §10 | 4. Featured academies. | missing | HOME |
| R18 | §10 | 5. Featured courses. | partial | HOME |
| R19 | §10 | 6. Mentor highlights. | missing | HOME |
| R20 | §10 | 7. Upcoming live events. | missing | HOME |
| R21 | §10 | 8. Active community discussions. | partial | HOME |
| R22 | §10 | 9. Current challenges. | missing | HOME |
| R23 | §10 | 10. Featured opportunities. | missing | HOME |
| R24 | §10 | 11. Marketplace products. | exists | HOME |
| R25 | §10 | 12. Member achievements. | partial | HOME |
| R26 | §10 | 13. Founder introduction. | exists | HOME |
| R27 | §10 | 14. Community invitation. | partial | HOME |
| R28 | §10 | 15. Registration CTA. | exists | HOME |
| R29 | §10 | Create dynamic sections powered by actual database content. | partial | HOME |
| R30 | §10 | Do not hardcode fake members, fake testimonials, fake activity counts, fake earnings or fake o… | exists | HOME |
| R31 | §10 | If the database is empty, the homepage should still look intentional through editorial content… | partial | HOME |
| R32 | §10 | Create a content management system so the owner can control homepage sections. | partial | HOME |
| R33 | §14 | A living platform requires ongoing useful content. Build an editorial publishing system. | partial | EDIT-A |
| R34 | §14 | Support: Articles. | partial | EDIT-A |
| R35 | §14 | Support: Learning insights. | missing | EDIT-A |
| R36 | §14 | Support: Founder notes. | missing | EDIT-A |
| R37 | §14 | Support: Expert contributions. | missing | EDIT-A |
| R38 | §14 | Support: Academy updates. | missing | EDIT-A |
| R39 | §14 | Support: Success stories. | partial | EDIT-A |
| R40 | §14 | Support: Practical business guides. | missing | EDIT-A |
| R41 | §14 | Support: Wellness resources. | missing | EDIT-A |
| R42 | §14 | Support: Interviews. | missing | EDIT-A |
| R43 | §14 | Support: Event recaps. | missing | EDIT-A |
| R44 | §14 | Implement: Drafts. | partial | EDIT-A |
| R45 | §14 | Implement: Editorial review. | missing | EDIT-A |
| R46 | §14 | Implement: Scheduled publishing. | missing | EDIT-A |
| R47 | §14 | Implement: Categories. | missing | EDIT-A |
| R48 | §14 | Implement: Tags. | missing | EDIT-A |
| R49 | §14 | Implement: Author profiles. | partial | EDIT-A |
| R50 | §14 | Implement: Search. | missing | EDIT-B |
| R51 | §14 | Implement: Featured content. | missing | EDIT-A |
| R52 | §14 | Build an admin-controlled content calendar. | missing | EDIT-A |
| R53 | §14 | Do not generate fabricated success stories. | partial | EDIT-B |
| R54 | §15 | Harsha must be visibly identified as the Founder & Creator of Tycoonhood. | exists | EDIT-B |
| R55 | §15 | Build a founder presence across the ecosystem. | partial | EDIT-B |
| R56 | §15 | Include: Premium About page. | partial | EDIT-B |
| R57 | §15 | Include: Founder portrait. | exists | EDIT-B |
| R58 | §15 | Include: Founder message. | partial | EDIT-B |
| R59 | §15 | Include: Vision and mission. | partial | EDIT-B |
| R60 | §15 | Include: Founder announcements. | missing | EDIT-B |
| R61 | §15 | Include: Selected editorial notes. | missing | EDIT-B |
| R62 | §15 | Include: Platform updates. | missing | EDIT-B |
| R63 | §15 | Include: Community messages. | partial | EDIT-B |
| R64 | §15 | Use the actual founder photograph. | exists | EDIT-B |
| R65 | §15 | Never invent personal achievements or credentials. | exists | EDIT-B |
| R66 | §15 | The founder's presence should establish identity and accountability without making the entire… | partial | EDIT-B |

### Map `platform` (105 requirements)

| Id | § | Requirement | Status | Unit |
|---|---|---|---|---|
| R000 | §1 | Tycoonhood must feel like a premium educational institution. | partial | ACAD |
| R001 | §1 | Tycoonhood must feel like a mentorship network. | missing | MENTOR-B |
| R002 | §1 | Tycoonhood must feel like an entrepreneurial community. | partial | SOCIAL |
| R003 | §1 | Tycoonhood must feel like a personal development ecosystem. | partial | CONNECT |
| R004 | §1 | Tycoonhood must feel like a professional opportunity marketplace. | missing | OPPS-B |
| R005 | §1 | Tycoonhood must feel like a social learning environment. | partial | LEARN |
| R006 | §1 | Tycoonhood must feel like a gamified achievement system. | partial | RANKS |
| R007 | §1 | Tycoonhood must feel like a shopping destination. | partial | MONEY |
| R008 | §1 | Members should feel they have entered an ecosystem where they can grow alongside other ambitio… | partial | CONNECT |
| R009 | §1 | The core pillars remain: LEARN. EARN. GROW. CONNECT. SHOP. | partial | HOME |
| R010 | §1 | Every pillar must connect to the others; members should experience one interconnected ecosyste… | partial | CONNECT |
| R011 | §16 | The platform must feel active without looking chaotic. | partial | HOME |
| R012 | §16 | Maintain the established Tycoonhood brand decisions. | exists | POLISH |
| R013 | §16 | Preserve the existing headline decision. | exists | HOME |
| R014 | §16 | Preserve the existing exact red colour specification. | missing | BLOCKED |
| R015 | §16 | Preserve the existing runtime WebGL lattice. | missing | BLOCKED |
| R016 | §16 | Preserve the existing brand assets and visual identity. | exists | POLISH |
| R017 | §16 | Do not silently replace these decisions. | exists | P0 |
| R018 | §16 | Design direction: premium dark foundation. | exists | POLISH |
| R019 | §16 | Design direction: controlled gold/amber accents. | exists | POLISH |
| R020 | §16 | Design direction: existing approved red used consistently. | missing | BLOCKED |
| R021 | §16 | Design direction: strong editorial typography. | exists | POLISH |
| R022 | §16 | Design direction: beautiful imagery. | partial | POLISH |
| R023 | §16 | Design direction: excellent visual hierarchy. | exists | POLISH |
| R024 | §16 | Design direction: meaningful animation. | partial | POLISH |
| R025 | §16 | Design direction: smooth page transitions. | missing | POLISH |
| R026 | §16 | Design direction: interactive progress visualizations. | partial | POLISH |
| R027 | §16 | Design direction: responsive dashboards. | exists | POLISH |
| R028 | §16 | Design direction: high-quality mobile experience. | exists | POLISH |
| R029 | §16 | Every interaction must have a real purpose. | exists | POLISH |
| R030 | §16 | Animations must never interfere with usability or performance. | exists | POLISH |
| R031 | §17 | A living platform must be authentic. | partial | P0 |
| R032 | §17 | Never manufacture activity. | partial | P0 |
| R033 | §17 | Never show fake online users. | exists | P0 |
| R034 | §17 | Never invent mentor profiles. | partial | P0 |
| R035 | §17 | Never fabricate student reviews. | exists | EDIT-B |
| R036 | §17 | Never invent earnings. | exists | MONEY |
| R037 | §17 | Never display false scarcity. | partial | MONEY |
| R038 | §17 | Never create fake live events. | exists | LIVE-A |
| R039 | §17 | Never present simulated transactions as genuine. | exists | MONEY |
| R040 | §17 | Build the infrastructure for real activity and make empty states engaging and transparent. | partial | POLISH |
| R041 | §17 | Trust is more valuable than temporary visual excitement. | partial | P0 |
| R042 | §18 | Extend the existing admin panel. | exists | P0 |
| R043 | §18 | Add management for: Mentors. | missing | MENTOR-B |
| R044 | §18 | Add management for: Mentor applications. | missing | MENTOR-A |
| R045 | §18 | Add management for: Mentor bookings. | missing | BOOK |
| R046 | §18 | Add management for: Academies. | missing | ACAD |
| R047 | §18 | Add management for: Courses. | exists | LEARN |
| R048 | §18 | Add management for: Instructors. | partial | LEARN |
| R049 | §18 | Add management for: Live events. | missing | LIVE-A |
| R050 | §18 | Add management for: Event registrations. | missing | LIVE-A |
| R051 | §18 | Add management for: Community groups. | partial | GROUPS |
| R052 | §18 | Add management for: Community moderation. | exists | SOCIAL |
| R053 | §18 | Add management for: Daily missions. | partial | DAILY-A |
| R054 | §18 | Add management for: Weekly challenges. | partial | DAILY-B |
| R055 | §18 | Add management for: Opportunities. | missing | OPPS-B |
| R056 | §18 | Add management for: Applications. | partial | MENTOR-A |
| R057 | §18 | Add management for: Creator accounts. | partial | LEARN |
| R058 | §18 | Add management for: Articles. | partial | EDIT-A |
| R059 | §18 | Add management for: Editorial calendar. | missing | EDIT-A |
| R060 | §18 | Add management for: Notifications. | partial | NOTIFY |
| R061 | §18 | Add management for: Achievements. | missing | RANKS |
| R062 | §18 | Add management for: Leaderboards. | missing | RANKS |
| R063 | §18 | Add management for: Homepage content. | partial | HOME |
| R064 | §18 | Add management for: Engagement analytics. | partial | ANALYTICS |
| R065 | §18 | The owner must be able to manage the ecosystem without editing code. | partial | INT |
| R066 | §19 | Track meaningful product engagement. | partial | ANALYTICS |
| R067 | §19 | Measure: Daily active members. | missing | ANALYTICS |
| R068 | §19 | Measure: Weekly active members. | partial | ANALYTICS |
| R069 | §19 | Measure: Monthly active members. | missing | ANALYTICS |
| R070 | §19 | Measure: Course enrolments. | partial | ANALYTICS |
| R071 | §19 | Measure: Lesson completion. | partial | ANALYTICS |
| R072 | §19 | Measure: Course completion. | partial | ANALYTICS |
| R073 | §19 | Measure: Mentor bookings. | missing | ANALYTICS |
| R074 | §19 | Measure: Event registrations. | missing | ANALYTICS |
| R075 | §19 | Measure: Event attendance. | missing | ANALYTICS |
| R076 | §19 | Measure: Mission completion. | missing | ANALYTICS |
| R077 | §19 | Measure: Community participation. | partial | ANALYTICS |
| R078 | §19 | Measure: Opportunity applications. | missing | ANALYTICS |
| R079 | §19 | Measure: Marketplace conversions. | partial | ANALYTICS |
| R080 | §19 | Measure: Member retention. | missing | ANALYTICS |
| R081 | §19 | Measure: Returning member rate. | missing | ANALYTICS |
| R082 | §19 | Do not optimize for clicks alone. | exists | ANALYTICS |
| R083 | §19 | Measure whether members are actually learning, progressing and finding value. | partial | ANALYTICS |
| R084 | §19 | Create a product analytics dashboard. | partial | ANALYTICS |
| R085 | §19 | Respect privacy and applicable data-protection requirements. | partial | ANALYTICS |
| R086 | §21 | Members can discover and join academies. | partial | ACAD |
| R087 | §21 | Members can discover genuine mentors. | missing | MENTOR-B |
| R088 | §21 | Mentors can apply and be verified. | missing | MENTOR-A |
| R089 | §21 | Members can book available sessions. | missing | BOOK |
| R090 | §21 | Instructors can publish approved content. | partial | LEARN |
| R091 | §21 | Members can participate in real discussions. | exists | SOCIAL |
| R092 | §21 | Groups function properly. | partial | GROUPS |
| R093 | §21 | Daily missions work. | exists | DAILY-A |
| R094 | §21 | Challenges work. | partial | DAILY-B |
| R095 | §21 | Events can be created and registered for. | missing | LIVE-A |
| R096 | §21 | Opportunities can be published and applied for. | missing | OPPS-B |
| R097 | §21 | Progress and achievements update correctly. | exists | RANKS |
| R098 | §21 | Notifications work. | partial | NOTIFY |
| R099 | §21 | The dashboard surfaces relevant activity. | partial | TODAY |
| R100 | §21 | Administrators can manage all these systems. | partial | INT |
| R101 | §21 | Mobile access works. | exists | POLISH |
| R102 | §21 | No 3D world is required. | exists | INT |
| R103 | §21 | All important user journeys are tested. | partial | INT |
| R104 | §21 | Report each feature as: VERIFIED COMPLETE / IMPLEMENTED BUT UNVERIFIED / PARTIAL / BLOCKED / N… | exists | INT |

---

## Appendix B. The Prisma schema

This is packages/db/prisma/schema.prisma as P0a lands it. It is the merged base schema of `build/full-platform` with every model, field, enum and relation of the data model added: 141 models and 106 enums in 4757 lines. It passes `prisma format` and `prisma validate` (Prisma 6.19.3).

It is the schema that the 25 migrations produce, apart from what Prisma cannot express. The following are hand-written SQL in the migrations (data-model c.3), and the drift check removes exactly the five lines Prisma prints for the generated columns (W3.2):
- the 58 CHECK constraints;
- the exclusion constraint;
- the 11 partial unique indexes;
- the five generated `searchVector` columns.

New sections of the schema are numbered 17 to 26. New fields on existing models sit under `// ---- Living ecosystem (directive §...) ----` markers.

```prisma
// ============================================================
// TYCOONHOOD — Master Schema (Phase 1)
// Every domain module from the spec lives here. Modules are
// decoupled by convention (section headers) and wired only
// through explicit relations.
// ============================================================

generator client {
  provider   = "prisma-client"
  output     = "../src/generated"
  engineType = "client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// 1. IDENTITY & ACCOUNTS  (spec §8–§10)
// Auth.js v5 compatible: User / Account / Session / VerificationToken
// ============================================================

/// Server-enforced roles. Guests are signed-out visitors.
/// Permissions live in @tycoonhood/core (auth/permissions.ts), never the client.
enum UserRole {
  MEMBER
  STUDENT
  CREATOR
  INSTRUCTOR
  MODERATOR
  ADMIN
}

model User {
  id             String    @id @default(cuid())
  email          String    @unique
  emailVerified  DateTime?
  /// An email change waiting for its link to be used. `email` stays the
  /// sign-in and reset address until then. Not unique: the unique `email`
  /// decides who gets an address when a change is confirmed.
  pendingEmail   String?
  /// When that change was asked for; set and cleared with `pendingEmail`. A
  /// change away from an address never confirmed waits a day from then.
  pendingEmailAt DateTime?
  name           String?
  image          String?
  role           UserRole  @default(MEMBER)

  // Gamification cache (source of truth = XpEvent ledger below)
  xp    Int @default(0)
  level Int @default(1)

  rankId String?
  rank   RankDefinition? @relation(fields: [rankId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  credential         PasswordCredential?
  profile            Profile?
  accounts           Account[]
  sessions           Session[]
  ledgerAccount      LedgerAccount?
  enrollments        Enrollment[]
  lessonProgress     LessonProgress[]
  certificates       Certificate[]
  xpEvents           XpEvent[]
  achievements       UserAchievement[]        @relation("UserAchievementOwner")
  participations     ChallengeParticipation[]
  missionCompletions MissionCompletion[]
  streak             Streak?
  notifications      Notification[]           @relation("NotificationRecipient")
  orders             Order[]
  discordLink        DiscordLink?
  telegramLink       TelegramLink?
  quizAttempts       QuizAttempt[]
  minerState         MinerState?
  referralsMade      Referral[]               @relation("ReferralReferrer")
  referralReceived   Referral?                @relation("ReferralReferred")
  watchCompletions   WatchCompletion[]

  // Community and the daily standard
  messages       Message[]
  messageReports MessageReport[]
  channelReads   ChannelRead[]
  communityMute  CommunityMute?
  standardItems  StandardItem[]
  standardTicks  StandardTick[]
  standardDays   StandardDay[]

  /// Set by an admin; suspended members cannot sign in.
  suspendedAt DateTime?

  courseReviews     CourseReview[]
  affiliate         AffiliateProfile?
  cartItems         CartItem[]
  wishlistItems     WishlistItem[]
  refundRequests    RefundRequest[]
  communityPosts    CommunityPost[]    @relation("CommunityPostAuthor")
  communityComments CommunityComment[]
  reactions         Reaction[]
  groupMemberships  GroupMembership[]  @relation("GroupMembershipUser")
  reports           ContentReport[]    @relation("ReportReporter")
  auditLogs         AuditLog[]
  couponRedemptions CouponRedemption[]
  instructorProfile Instructor?        @relation("InstructorUser")
  emailHolds        EmailHold[]
  contactMessages   ContactMessage[]

  // ---- Living ecosystem (directive §1, §17, §19; LEAD #8) ----
  /// Created by the dev-only demo seed (packages/db/src/seed-demo/). Never true in production.
  isDemo             Boolean @default(false)
  /// Staff test or internal account, left out of analytics (countableMemberWhere). Audited.
  excludeFromMetrics Boolean @default(false)

  // §3 academies
  academyMemberships AcademyMembership[]

  // §13 notifications
  notificationPreferences  NotificationPreference[]
  notificationSettings     NotificationSettings?
  pushSubscriptions        PushSubscription[]
  scheduledNotifications   ScheduledNotification[]
  notificationsActed       Notification[]           @relation("NotificationActor")
  notificationTopicsEdited NotificationTopic[]      @relation("NotificationTopicEditor")
  announcementsCreated     Announcement[]           @relation("AnnouncementCreator")
  announcementsRetracted   Announcement[]           @relation("AnnouncementRetractor")

  // §4 §19 activity and analytics
  activity       ActivityEvent[]     @relation("ActivityActor")
  activityHidden ActivityEvent[]     @relation("ActivityHider")
  activityDays   MemberActivityDay[]

  // §8 progression
  skills                MemberSkill[]         @relation("MemberSkillOwner")
  skillsVerified        MemberSkill[]         @relation("MemberSkillVerifier")
  projects              Project[]             @relation("ProjectOwner")
  projectCollaborations ProjectCollaborator[] @relation("ProjectCollaborations")
  collaboratorInvites   ProjectCollaborator[] @relation("ProjectCollaboratorInviter")
  groupInvitesSent      GroupMembership[]     @relation("GroupMembershipInviter")
  projectsVerified      Project[]             @relation("ProjectVerifier")
  projectsFeatured      Project[]             @relation("ProjectFeaturer")
  rankAwards            RankAward[]           @relation("RankAwardMember")
  rankAwardsGiven       RankAward[]           @relation("RankAwardGiver")
  achievementsAwarded   UserAchievement[]     @relation("UserAchievementAwarder")
  learningPathsAuthored LearningPath[]        @relation("LearningPathAuthor")
  pathFollows           LearningPathFollow[]

  // §2 §12 mentors and contributors
  contributorApplications         ContributorApplication[] @relation("ContributorApplicant")
  contributorApplicationsReviewed ContributorApplication[] @relation("ContributorReviewer")
  contributorAccount              ContributorAccount?
  agreementsAuthored              RevenueShareAgreement[]  @relation("AgreementAuthor")
  agreementsAccepted              RevenueShareAgreement[]  @relation("AgreementAcceptor")
  mentorsApproved                 MentorProfile[]          @relation("MentorApprover")
  credentialsVerified             ExpertCredential[]       @relation("CredentialVerifier")
  instructorsIdentityVerified     Instructor[]             @relation("InstructorIdentityVerifier")
  instructorsPhotoVerified        Instructor[]             @relation("InstructorPhotoVerifier")
  contentSubmissions              ContentSubmission[]      @relation("ContentSubmitter")
  contentReviews                  ContentSubmission[]      @relation("ContentReviewer")
  resourcesSubmitted              Resource[]               @relation("ResourceSubmitter")
  calendarFeedTokens              CalendarFeedToken[]

  // §6 live events
  eventHostings               LiveEventHost[]     @relation("LiveEventHostUser")
  eventHostsConfirmed         LiveEventHost[]     @relation("LiveEventHostConfirmer")
  eventRegistrations          EventRegistration[] @relation("EventRegistrant")
  eventRegistrationsCancelled EventRegistration[] @relation("EventRegistrationCanceller")
  attendanceMarked            EventRegistration[] @relation("EventAttendanceMarker")
  eventFeedback               EventFeedback[]     @relation("EventFeedbackAuthor")
  eventFeedbackHidden         EventFeedback[]     @relation("EventFeedbackHider")
  liveEventsCreated           LiveEvent[]         @relation("LiveEventCreator")
  liveEventsReviewed          LiveEvent[]         @relation("LiveEventReviewer")
  eventSeriesCreated          LiveEventSeries[]   @relation("LiveEventSeriesCreator")
  eventInterests              EventInterest[]
  attendanceDisputes          EventRegistration[] @relation("EventAttendanceDisputer")
  attendanceDisputesResolved  EventRegistration[] @relation("EventAttendanceDisputeResolver")

  // §5 daily engine
  dailyPlans          DailyPlan[]
  goals               Goal[]
  goalCheckIns        GoalCheckIn[]
  evidenceSubmissions EvidenceSubmission[] @relation("EvidenceAuthor")
  evidenceReviewed    EvidenceSubmission[] @relation("EvidenceReviewer")
  challengesAuthored  Challenge[]          @relation("ChallengeAuthor")
  missionsAuthored    Mission[]            @relation("MissionAuthor")

  // §4 community
  following                Follow[]          @relation("Following")
  followers                Follow[]          @relation("Followers")
  blocking                 MemberBlock[]     @relation("Blocker")
  blockedBy                MemberBlock[]     @relation("Blocked")
  savedPosts               SavedPost[]
  communityPostsFeatured   CommunityPost[]   @relation("CommunityPostFeaturer")
  groupsCreated            CommunityGroup[]  @relation("GroupCreator")
  groupsReviewed           CommunityGroup[]  @relation("GroupReviewer")
  groupMembershipsApproved GroupMembership[] @relation("GroupMembershipApprover")
  groupMembershipsBanned   GroupMembership[] @relation("GroupMembershipBanner")
  reportsResolved          ContentReport[]   @relation("ReportResolver")

  // §7 opportunities
  partnerMemberships           PartnerMember[]               @relation("PartnerMemberUser")
  partnerInvites               PartnerMember[]               @relation("PartnerMemberInviter")
  partnersReviewed             Partner[]                     @relation("PartnerReviewer")
  partnersCreated              Partner[]                     @relation("PartnerCreator")
  opportunitiesCreated         Opportunity[]                 @relation("OpportunityCreator")
  opportunitiesReviewed        Opportunity[]                 @relation("OpportunityReviewer")
  opportunityApplications      OpportunityApplication[]      @relation("OpportunityApplicant")
  opportunityApplicationEvents OpportunityApplicationEvent[] @relation("OpportunityApplicationActor")
  savedOpportunities           SavedOpportunity[]

  // §17 shop honesty
  stockConfirmations Product[] @relation("ProductStockConfirmer")

  // §14 §9 editorial and guide
  postsAuthored         Post[]              @relation("PostAuthorUser")
  postsCreated          Post[]              @relation("PostCreator")
  postsUpdated          Post[]              @relation("PostUpdater")
  postsReviewed         Post[]              @relation("PostReviewer")
  postRevisions         PostRevision[]      @relation("PostRevisionEditor")
  helpArticlesEdited    HelpArticle[]       @relation("HelpArticleEditor")
  testimonials          Testimonial[]       @relation("TestimonialMember")
  testimonialsVerified  Testimonial[]       @relation("TestimonialVerifier")
  guideConversations    GuideConversation[]
  guideMessagesReviewed GuideMessage[]      @relation("GuideMessageReviewer")
  guideUsage            GuideUsage[]

  @@index([rankId])
}

/// Password auth lives separately from User so social-only accounts
/// simply have no row here. Hash = Argon2id (Phase 3).
model PasswordCredential {
  userId    String   @id
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  hash      String
  updatedAt DateTime @updatedAt
}

/// Auth.js OAuth account linkage (social login, later)
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  // Device management (spec §8): populated at login, Phase 3
  userAgent    String?
  /// ipKey(ip): a keyed HMAC prefix (platform/ip-key.ts). Rows written before 20261113000100 were
  /// unkeyed SHA-256 and are nulled by that migration. Never the IP itself.
  ipHash       String?
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

/// The address an email change replaced, held for its account until
/// `expires` (7 days): no one can register with it and no other account can
/// move to it. The notice to that address carries the link that undoes the
/// change. The hold ends early when the undo is used or the member moves
/// back to the address.
model EmailHold {
  id           String    @id @default(cuid())
  /// The address the change replaced.
  address      String    @unique
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  /// The address the change set. The undo works only while the account still has it.
  changedTo    String
  /// SHA-256 of the undo link's token. Null once the link is spent or a later
  /// change ended it; the hold itself lasts until `expires`.
  undoToken    String?   @unique
  /// When the mail provider accepted the notice carrying the undo link. Null
  /// while it is being sent. A change whose notice is still not recorded a
  /// few minutes after `createdAt` is put back (platform/email-notice).
  noticeSentAt DateTime?
  expires      DateTime
  /// When the change took effect (a replaced row gets the new change's time).
  createdAt    DateTime  @default(now())

  @@index([userId])
}

/// Member-facing identity, separate from auth identity. (spec §10)
model Profile {
  userId      String  @id
  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  username    String  @unique
  displayName String
  bio         String? @db.Text
  avatarUrl   String?
  timezone    String?

  // Onboarding answers (spec §9)
  goals           String[]  @default([])
  interests       String[]  @default([])
  experienceLevel String?
  onboardedAt     DateTime?

  /// Privacy controls (spec §10): which profile facets are public.
  /// Shape: { "achievements": true, "level": true, "streak": false, ... }
  privacy Json @default("{\"level\": true, \"rank\": true, \"achievements\": true, \"streak\": true, \"courses\": false, \"thc\": false}")

  /// Their invite code. Minted on onboarding, stable for life.
  referralCode String? @unique

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // ---- Living ecosystem (directive §10, §8, §9, §11) ----
  /// One line under the name on the profile.
  headline            String?
  /// Location is opt-in: shown only when privacy.location is true. City and region only.
  city                String?
  region              String?
  /// ISO 3166-1 alpha-2.
  country             String?
  /// At most 5 {label, url}, https only (cleanUrl).
  links               Json?
  /// Dashboard layout: hidden and ordered cards. Shape checked in core (dashboard.ts).
  dashboard           Json      @default("{}")
  /// At most 6 {kind: ACHIEVEMENT|CERTIFICATE|PROJECT|SKILL, refId}, each checked against the member's own rows.
  pinnedItems         Json      @default("[]")
  /// The member agreed that the Guide's optional AI mode may send their questions to the model provider.
  aiGuideConsentAt    DateTime?
  /// The zone in force before the last time-zone change. It stays in force until timezoneEffectiveAt
  /// (the start of the next member day in the new zone), so no member day is counted twice or skipped.
  previousTimezone    String?
  timezoneEffectiveAt DateTime?
}

// ============================================================
// 2. LEARNING MANAGEMENT SYSTEM  (spec §12–§13)
// Courses are DATA. The four launch programs are seed rows,
// never frontend components.
// ============================================================

enum Pillar {
  WARRIOR
  BUILDER
  TYCOON
  MIND
}

enum ContentStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum LessonType {
  VIDEO
  READING
  QUIZ
  ASSIGNMENT
}

model Course {
  id          String        @id @default(cuid())
  slug        String        @unique
  title       String
  subtitle    String?
  description String        @db.Text
  pillar      Pillar
  status      ContentStatus @default(DRAFT)
  coverImage  String?
  sortOrder   Int           @default(0)

  /// Instructor display info (legacy free text; prefer instructorId)
  instructorName String?
  instructorBio  String?
  instructorId   String?
  instructor     Instructor?    @relation(fields: [instructorId], references: [id], onDelete: SetNull)
  reviews        CourseReview[]

  /// Prerequisite course (nullable chain)
  prerequisiteId String?
  prerequisite   Course?  @relation("CoursePrereq", fields: [prerequisiteId], references: [id])
  unlocks        Course[] @relation("CoursePrereq")

  xpOnCompletion Int @default(500)

  modules      CourseModule[]
  enrollments  Enrollment[]
  resources    Resource[]
  certificates Certificate[]
  channels     Channel[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // ---- Living ecosystem (directive §3, §2, §12) ----
  /// The owning academy and the source of truth: the authoring service sets pillar from academy.pillar in
  /// the same write, and no other write path sets either. Backfilled from pillar by migration 000100.
  academyId    String?
  academy      Academy?       @relation("AcademyCourses", fields: [academyId], references: [id], onDelete: SetNull)
  /// Set when this course is an academy's flagship programme.
  flagshipOf   Academy?       @relation("AcademyFlagship")
  deliveryMode CourseDelivery @default(SELF_PACED)

  cohorts                CourseCohort[]
  liveEvents             LiveEvent[]
  announcements          Announcement[]
  activity               ActivityEvent[]
  projects               Project[]
  pathSteps              LearningPathStep[]
  missions               Mission[]
  challenges             Challenge[]
  goals                  Goal[]
  groups                 CommunityGroup[]
  posts                  Post[]
  submissions            ContentSubmission[]
  opportunitiesRequiring Opportunity[]

  @@index([pillar, status])
  @@index([academyId, status])
}

model CourseModule {
  id          String  @id @default(cuid())
  courseId    String
  course      Course  @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title       String
  description String?
  sortOrder   Int     @default(0)
  /// Learning objectives, as a JSON array of strings.
  objectives  Json?
  /// What a member must do to complete the module.
  completion  String?

  lessons Lesson[]

  // §8 §3
  skills    ModuleSkill[]
  pathSteps LearningPathStep[]

  @@index([courseId, sortOrder])
}

model Lesson {
  id        String       @id @default(cuid())
  moduleId  String
  module    CourseModule @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  title     String
  type      LessonType
  sortOrder Int          @default(0)

  contentMd   String? @db.Text /// READING lessons + notes under videos
  videoUrl    String? /// external/CDN URL — media hosting decided at content time
  durationSec Int?
  isPreview   Boolean @default(false) /// visible before enrollment
  xpReward    Int     @default(50)
  /// The programme's final assessment (required for the certificate).
  isFinal     Boolean @default(false)

  quiz      Quiz?
  resources Resource[]
  progress  LessonProgress[]
  messages  Message[]

  // ---- Living ecosystem (directive §9, §12) ----
  /// GENERATED ALWAYS AS (title weight A, contentMd weight C) STORED (raw SQL in 20261113000700). Never written.
  searchVector Unsupported("tsvector")?
  submissions  ContentSubmission[]

  @@index([moduleId, sortOrder])
  @@index([searchVector], type: Gin)
}

model Resource {
  id       String  @id @default(cuid())
  title    String
  url      String
  kind     String  @default("link") /// link | file | template | recording | slides
  courseId String?
  course   Course? @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lessonId String?
  lesson   Lesson? @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  // ---- Living ecosystem (directive §6, §12) ----
  /// Event resource (recording, slides, worksheet). Exactly one of courseId, lessonId, eventId, instructorId is set (CHECK).
  eventId       String?
  event         LiveEvent?        @relation(fields: [eventId], references: [id], onDelete: Cascade)
  /// Expert-profile resource.
  instructorId  String?
  instructor    Instructor?       @relation(fields: [instructorId], references: [id], onDelete: Cascade)
  /// Contributor resources stay DRAFT until their ContentSubmission is approved.
  status        ContentStatus     @default(PUBLISHED)
  submittedById String?
  submittedBy   User?             @relation("ResourceSubmitter", fields: [submittedById], references: [id], onDelete: SetNull)
  /// Required for event and expert resources (CHECK). Course and lesson resources follow course access.
  audience      ResourceAudience?
  createdAt     DateTime          @default(now())

  submissions ContentSubmission[]

  @@index([courseId])
  @@index([lessonId])
  @@index([eventId])
  @@index([instructorId, status])
}

model Quiz {
  id        String @id @default(cuid())
  lessonId  String @unique
  lesson    Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  passScore Int    @default(70) /// percent

  questions QuizQuestion[]
  attempts  QuizAttempt[]
}

model QuizQuestion {
  id           String  @id @default(cuid())
  quizId       String
  quiz         Quiz    @relation(fields: [quizId], references: [id], onDelete: Cascade)
  sortOrder    Int     @default(0)
  prompt       String  @db.Text
  options      Json /// ["option a", "option b", ...]
  correctIndex Int
  explanation  String? @db.Text

  @@index([quizId, sortOrder])
}

model QuizAttempt {
  id        String   @id @default(cuid())
  quizId    String
  quiz      Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  scorePct  Int
  passed    Boolean
  answers   Json
  createdAt DateTime @default(now())

  @@index([userId, quizId])
}

enum EnrollmentStatus {
  ACTIVE
  COMPLETED
  DROPPED
}

model Enrollment {
  id          String           @id @default(cuid())
  userId      String
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId    String
  course      Course           @relation(fields: [courseId], references: [id], onDelete: Cascade)
  status      EnrollmentStatus @default(ACTIVE)
  progressPct Int              @default(0) /// cache; truth = LessonProgress rows
  enrolledAt  DateTime         @default(now())
  completedAt DateTime?

  // ---- Living ecosystem (directive §2, §12) ----
  /// The learner let this course's instructor or cohort mentor see their named progress. Null = aggregates only.
  progressSharedAt DateTime?
  /// Mentor-led run the learner joined.
  cohortId         String?
  cohort           CourseCohort? @relation(fields: [cohortId], references: [id], onDelete: SetNull)

  @@unique([userId, courseId])
  @@index([courseId])
  @@index([cohortId])
}

model LessonProgress {
  id               String    @id @default(cuid())
  userId           String
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  lessonId         String
  lesson           Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  videoPositionSec Int?
  completedAt      DateTime?
  updatedAt        DateTime  @updatedAt

  @@unique([userId, lessonId])
  @@index([lessonId])
}

model Certificate {
  id       String   @id @default(cuid())
  serial   String   @unique
  userId   String
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId String
  course   Course   @relation(fields: [courseId], references: [id])
  issuedAt DateTime @default(now())

  @@unique([userId, courseId])
}

// ============================================================
// 3. GAMIFICATION ENGINE  (spec §14–§19)
// XP is an append-only event log; User.xp/level are caches
// recomputed inside the same transaction that appends events.
// ============================================================

enum XpSource {
  LESSON_COMPLETED
  COURSE_COMPLETED
  QUIZ_PASSED
  CHALLENGE_COMPLETED
  MISSION_COMPLETED
  ACHIEVEMENT_UNLOCKED
  STREAK_BONUS
  ADMIN_GRANT
  WATCH_TASK
  REFERRAL
  COMMUNITY
}

model XpEvent {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  amount         Int
  source         XpSource
  sourceId       String? /// e.g. lessonId, challengeId
  note           String?
  idempotencyKey String   @unique
  createdAt      DateTime @default(now())

  // ---- Living ecosystem (directive §3, §8, §19) ----
  /// The academy the XP was earned in. Backfilled from lesson, course or challenge; null for house-wide XP.
  academyId String?
  academy   Academy? @relation(fields: [academyId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@index([academyId, createdAt])
  @@index([source, createdAt])
}

/// Cumulative XP thresholds. Seeded from config curve; editable in admin later.
model LevelDefinition {
  level      Int     @id
  xpRequired Int /// cumulative XP to REACH this level
  title      String?
}

/// Community ranks (spec §15): Initiate → Legend, extensible.
model RankDefinition {
  id            String  @id @default(cuid())
  slug          String  @unique
  name          String
  sortOrder     Int     @unique
  minLevel      Int
  description   String?
  discordRoleId String? /// wired in Phase 9

  users User[]

  // ---- Living ecosystem (directive §8) ----
  /// Conditions beyond minLevel, e.g. {"verifiedSkills": 2, "verifiedProjects": 1}. Null = level only.
  criteria Json?
  /// One plain sentence on what the rank means, shown on the rank ladder.
  summary  String?

  awards RankAward[]
}

model Achievement {
  id          String  @id @default(cuid())
  slug        String  @unique
  name        String
  description String
  icon        String?
  xpReward    Int     @default(0)
  thcReward   BigInt  @default(0)
  /// Rule evaluated server-side by the achievement engine (Phase 6).
  /// Shape: { "event": "COURSE_COMPLETED", "count": 1, ... }
  criteria    Json
  isSecret    Boolean @default(false) /// hidden until unlocked (spec §18)
  active      Boolean @default(true)

  unlocks UserAchievement[]

  // ---- Living ecosystem (directive §8, §3) ----
  kind       AchievementKind @default(ACHIEVEMENT)
  academyId  String?
  academy    Academy?        @relation(fields: [academyId], references: [id], onDelete: SetNull)
  /// Awarded by staff only (RECOGNITION); the rules engine skips it.
  manualOnly Boolean         @default(false)
  sortOrder  Int             @default(0)
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @default(now()) @updatedAt
}

model UserAchievement {
  id            String      @id @default(cuid())
  userId        String
  user          User        @relation("UserAchievementOwner", fields: [userId], references: [id], onDelete: Cascade)
  achievementId String
  achievement   Achievement @relation(fields: [achievementId], references: [id], onDelete: Cascade)
  unlockedAt    DateTime    @default(now())

  // ---- Living ecosystem (directive §8) ----
  /// Staff member who awarded a manual achievement. Null = earned by rule.
  awardedById String?
  awardedBy   User?     @relation("UserAchievementAwarder", fields: [awardedById], references: [id], onDelete: SetNull)
  /// Shown to the member with a manual award.
  note        String?
  /// What earned it, e.g. "course:<id>" or "project:<id>".
  sourceRef   String?
  /// A revoked award stays for the record and is hidden everywhere.
  revokedAt   DateTime?

  @@unique([userId, achievementId])
}

enum ChallengeLifecycle {
  DRAFT
  UPCOMING
  ACTIVE
  ENDED
  ARCHIVED
}

model Challenge {
  id          String             @id @default(cuid())
  slug        String             @unique
  name        String
  description String             @db.Text
  pillar      Pillar?
  lifecycle   ChallengeLifecycle @default(DRAFT)
  startsAt    DateTime?
  endsAt      DateTime?
  /// Recurrence descriptor for recurring challenges (spec §16), engine in Phase 6
  recurrence  Json?
  /// Completion criteria evaluated server-side
  criteria    Json
  xpReward    Int                @default(0)
  thcReward   BigInt             @default(0)

  participations ChallengeParticipation[]

  // ---- Living ecosystem (directive §5, §3, §4) ----
  /// Backfilled from criteria.event: DAILY_CHECKIN, SUBMISSION and GATED_SUBMISSIONS keep their name; anything else is RULE.
  kind            ChallengeKind    @default(RULE)
  scope           ChallengeScope   @default(HOUSE)
  /// Backfilled from pillar.
  academyId       String?
  academy         Academy?         @relation(fields: [academyId], references: [id], onDelete: SetNull)
  /// GROUP scope: the group that runs it. Groups are archived, never deleted.
  groupId         String?
  group           CommunityGroup?  @relation(fields: [groupId], references: [id], onDelete: Restrict)
  /// A programme challenge.
  courseId        String?
  course          Course?          @relation(fields: [courseId], references: [id], onDelete: SetNull)
  cadence         ChallengeCadence @default(ONE_OFF)
  /// A dated instance of a recurring challenge points at its template.
  templateId      String?
  template        Challenge?       @relation("ChallengeTemplate", fields: [templateId], references: [id], onDelete: SetNull)
  instances       Challenge[]      @relation("ChallengeTemplate")
  /// The period an instance covers, e.g. "2026-12" or "2026-W49". Unique per template.
  instanceKey     String?
  instructions    String?          @db.Text
  coverImage      String?
  /// A real limit, checked in the joining transaction. Null = no limit.
  maxParticipants Int?
  /// Staff opt-in for the challenge leaderboard. Off by default, and stays off for Wellness.
  showBoard       Boolean          @default(false)
  /// Null = never published. Backfilled for UPCOMING, ACTIVE and ENDED rows.
  publishedAt     DateTime?
  createdById     String?
  createdBy       User?            @relation("ChallengeAuthor", fields: [createdById], references: [id], onDelete: SetNull)
  isDemo          Boolean          @default(false)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @default(now()) @updatedAt

  skills        ChallengeSkill[]
  submissions   EvidenceSubmission[]
  projects      Project[]
  pathSteps     LearningPathStep[]
  goals         Goal[]
  liveEvents    LiveEvent[]
  opportunities Opportunity[]

  @@unique([templateId, instanceKey])
  @@index([lifecycle, startsAt])
  @@index([scope, lifecycle])
  @@index([academyId, lifecycle])
  @@index([groupId])
}

enum ParticipationStatus {
  JOINED
  COMPLETED
  FAILED
  WITHDRAWN
}

model ChallengeParticipation {
  id          String              @id @default(cuid())
  userId      String
  user        User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  challengeId String
  challenge   Challenge           @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  status      ParticipationStatus @default(JOINED)
  /// Rule progress and the "checkins" day list. Submissions move to EvidenceSubmission (20261113000900, with DAILY-B).
  progress    Json?
  joinedAt    DateTime            @default(now())
  completedAt DateTime?

  // §5 evidence (was progress.submissions)
  submissions EvidenceSubmission[]

  @@unique([userId, challengeId])
  @@index([challengeId, status])
}

model Mission {
  id            String  @id @default(cuid())
  slug          String  @unique
  name          String
  description   String
  criteria      Json
  xpReward      Int     @default(0)
  thcReward     BigInt  @default(0)
  repeatable    Boolean @default(false)
  cooldownHours Int? /// for repeatable missions
  active        Boolean @default(true)

  completions MissionCompletion[]

  // ---- Living ecosystem (directive §5, §3, §9) ----
  /// Backfilled: repeatable with criteria.within = "week" -> WEEKLY; other repeatable -> DAILY; else ONCE.
  cadence          MissionCadence      @default(ONCE)
  verification     MissionVerification @default(AUTO)
  kind             MissionKind?
  /// Markdown. Required before publishing.
  instructions     String?             @db.Text
  ctaLabel         String?             @db.VarChar(40)
  /// An internal path only (safeSitePath).
  ctaHref          String?
  estimatedMinutes Int?
  academyId        String?
  academy          Academy?            @relation(fields: [academyId], references: [id], onDelete: SetNull)
  /// Onboarding interest and goal values the mission suits. Empty = everyone.
  interestTags     String[]            @default([])
  minLevel         Int?
  maxLevel         Int?
  courseId         String?
  course           Course?             @relation(fields: [courseId], references: [id], onDelete: SetNull)
  /// Null = draft. Backfilled to the migration time for existing rows.
  publishedAt      DateTime?
  startsAt         DateTime?
  endsAt           DateTime?
  archivedAt       DateTime?
  /// Relative weight when the daily plan chooses between eligible missions.
  weight           Int                 @default(1)
  sortOrder        Int                 @default(0)
  createdById      String?
  createdBy        User?               @relation("MissionAuthor", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @default(now()) @updatedAt

  planItems   DailyPlanItem[]
  submissions EvidenceSubmission[]

  @@index([active, cadence])
  @@index([academyId])
}

model MissionCompletion {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  missionId      String
  mission        Mission  @relation(fields: [missionId], references: [id], onDelete: Cascade)
  idempotencyKey String   @unique
  completedAt    DateTime @default(now())

  // ---- Living ecosystem (directive §5) ----
  /// The period this completion fills: "once", a memberDayKey, "week:YYYY-MM-DD" or "month:YYYY-MM".
  /// Backfilled from idempotencyKey ("mission:<missionId>:<userId>:<occurrence>").
  occurrence   String
  verification MissionVerification @default(AUTO)
  /// SELF_REPORT: the member's short note.
  note         String?             @db.VarChar(500)
  /// REVIEW: the approved evidence.
  submissionId String?             @unique
  submission   EvidenceSubmission? @relation(fields: [submissionId], references: [id], onDelete: SetNull)

  @@unique([missionId, userId, occurrence])
  @@index([userId, missionId, completedAt])
  @@index([userId, completedAt])
}

model Streak {
  userId       String    @id
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  current      Int       @default(0)
  longest      Int       @default(0)
  lastActiveOn DateTime? @db.Date
  updatedAt    DateTime  @updatedAt
}

enum NotificationType {
  XP_AWARDED
  LEVEL_UP
  RANK_UP
  ACHIEVEMENT
  CHALLENGE
  MISSION
  THC
  SYSTEM
  ORDER
  COMMUNITY
  EARNINGS
  // ---- Living ecosystem (directive §13, §6; added by 20261113000000) ----
  LEARNING
  MENTORSHIP
  EVENT
  OPPORTUNITY
  CONTRIBUTOR
  PROJECT
  GOAL
  ANNOUNCEMENT
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation("NotificationRecipient", fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  title     String
  body      String?
  data      Json?
  readAt    DateTime?
  createdAt DateTime         @default(now())

  // ---- Living ecosystem (directive §13; LEAD #10) ----
  /// Catalogue key (platform/notification-topics.ts). Null on older rows; read derives it from type.
  topic          String?
  /// Writing the same key twice is a no-op, e.g. "follow:<followerId>:<userId>".
  dedupeKey      String?              @unique
  /// Unread notices with the same key coalesce into one row ("3 people replied").
  groupKey       String?
  groupCount     Int                  @default(1)
  /// The member whose action caused the notice, when there is one.
  actorId        String?
  actor          User?                @relation("NotificationActor", fields: [actorId], references: [id], onDelete: SetNull)
  priority       NotificationPriority @default(NORMAL)
  /// The notice was on screen in the centre; readAt is set when it is opened.
  seenAt         DateTime?
  archivedAt     DateTime?
  /// Time-bound notices leave the centre after this.
  expiresAt      DateTime?
  /// Retracting an announcement deletes its notices.
  announcementId String?
  announcement   Announcement?        @relation(fields: [announcementId], references: [id], onDelete: Cascade)

  deliveries ScheduledNotification[]

  @@index([userId, readAt, createdAt])
  @@index([userId, archivedAt, createdAt])
  @@index([announcementId])
}

// ============================================================
// 4. THC INTERNAL ECONOMY  (spec §25–§32)
// Double-entry ledger. Balances are NEVER mutated arbitrarily:
// every movement is a transaction with entries summing to zero,
// enforced by BOTH the service layer and a deferred DB trigger.
// ============================================================

enum LedgerAccountType {
  SYSTEM_MINT /// counter-account for genesis; goes deeply negative by design
  TREASURY
  REWARDS_POOL
  MINING_POOL /// ring-fenced budget the Miner app distributes from
  REVENUE /// receives THC spent on Tycoonhood products
  ESCROW
  USER
}

model LedgerAccount {
  id      String            @id @default(cuid())
  type    LedgerAccountType
  name    String?
  /// USER accounts link to exactly one user; system accounts have null
  userId  String?           @unique
  user    User?             @relation(fields: [userId], references: [id])
  /// Cached balance, updated atomically inside the posting transaction.
  /// Auditable truth = SUM(entries.amount). DB CHECK forbids negative USER balances.
  balance BigInt            @default(0)

  entries   LedgerEntry[]
  createdAt DateTime      @default(now())

  @@index([type])
}

enum TxStatus {
  POSTED
  REVERSED /// original stands; a compensating transaction points back via reversesId
}

enum TxReason {
  GENESIS_MINT
  POOL_FUNDING
  REWARD_MISSION
  REWARD_CHALLENGE
  REWARD_ACHIEVEMENT
  REWARD_MINING
  REWARD_ADMIN
  PURCHASE
  REFUND
  TRANSFER
  ADJUSTMENT
}

model LedgerTransaction {
  id             String   @id @default(cuid())
  reason         TxReason
  status         TxStatus @default(POSTED)
  idempotencyKey String   @unique
  sourceType     String? /// e.g. "mission", "order"
  sourceId       String?
  memo           String?
  createdById    String? /// admin userId for manual ops — audited (spec §27)
  createdAt      DateTime @default(now())

  /// Reversal linkage: the compensating tx points at the original
  reversesId String?            @unique
  reverses   LedgerTransaction? @relation("Reversal", fields: [reversesId], references: [id])
  reversedBy LedgerTransaction? @relation("Reversal")

  entries LedgerEntry[]

  @@index([reason, createdAt])
  @@index([sourceType, sourceId])
}

model LedgerEntry {
  id            String            @id @default(cuid())
  transactionId String
  transaction   LedgerTransaction @relation(fields: [transactionId], references: [id], onDelete: Restrict)
  accountId     String
  account       LedgerAccount     @relation(fields: [accountId], references: [id], onDelete: Restrict)
  /// Signed amount. Per-transaction sum MUST equal 0 (DB-enforced).
  amount        BigInt

  @@index([accountId])
  @@index([transactionId])
}

// ============================================================
// 5. MARKETPLACE  (spec §23–§24) — schema now, flows in Phase 8
// ============================================================

enum ProductKind {
  DIGITAL
  PHYSICAL
  COURSE
  MEMBERSHIP
  // ---- Living ecosystem (directive §13, §6; added by 20261113000000) ----
  LIVE_EVENT
}

model Product {
  id             String      @id @default(cuid())
  slug           String      @unique
  kind           ProductKind
  name           String
  description    String      @db.Text
  image          String?
  active         Boolean     @default(false)
  /// Dual rails: either or both may be set (spec §23/§26)
  priceThc       BigInt?
  priceFiatCents Int?
  fiatCurrency   String      @default("USD")
  /// null = unlimited (digital); integer = physical stock
  inventory      Int?
  /// For kind=COURSE: which course access is granted on fulfillment
  grantsCourseId String?
  /// For kind=DIGITAL: the deliverable itself, rendered at /library/[slug]
  contentMd      String?     @db.Text
  /// Landed cost per unit. The economy model says fulfilment cost, not the
  /// THC pool, is the binding constraint — so it has to be recorded.
  costCents      Int?

  variants      ProductVariant[]
  orderItems    OrderItem[]
  cartItems     CartItem[]
  wishlistItems WishlistItem[]
  /// Seller architecture: null = sold by Tycoonhood. Multi-vendor later.
  sellerName    String?
  category      String?
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  // ---- Living ecosystem (directive §17, §2, §6; LEAD #15) ----
  /// Staff confirmed the stock count is real. Scarcity copy ("Only N left") needs it (scarcityAllowed).
  stockConfirmedAt   DateTime?
  stockConfirmedById String?
  stockConfirmedBy   User?           @relation("ProductStockConfirmer", fields: [stockConfirmedById], references: [id], onDelete: SetNull)
  /// Optional academy link: academy and programme pages list active, priced products of their academy.
  academyId          String?
  academy            Academy?        @relation(fields: [academyId], references: [id], onDelete: SetNull)
  /// LIVE_EVENT product behind a paid mentor offering (system-managed).
  mentorOffering     MentorOffering?
  /// LIVE_EVENT product behind paid group events (system-managed).
  liveEvents         LiveEvent[]

  @@index([kind, active])
}

/// One buyable size/colour of a product. Stock lives here when variants
/// exist; Product.inventory stays authoritative for variant-less items.
model ProductVariant {
  id             String  @id @default(cuid())
  productId      String
  product        Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku            String  @unique
  label          String
  /// null = inherit the product's price. An override exists because XXL
  /// genuinely costs more to make than S.
  priceThc       BigInt?
  priceFiatCents Int?
  costCents      Int?
  inventory      Int     @default(0)
  sortOrder      Int     @default(0)
  active         Boolean @default(true)

  orderItems OrderItem[]
  cartItems  CartItem[]
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt

  @@index([productId, sortOrder])
}

enum OrderStatus {
  PENDING
  PAID
  FULFILLED
  CANCELLED
  REFUNDED
}

model Order {
  id              String      @id @default(cuid())
  userId          String
  user            User        @relation(fields: [userId], references: [id])
  status          OrderStatus @default(PENDING)
  totalThc        BigInt      @default(0)
  totalFiatCents  Int         @default(0)
  fiatCurrency    String      @default("USD")
  /// THC purchases link to their ledger transaction — atomic pay+record (spec §28)
  ledgerTxId      String?     @unique
  /// Fiat provider linkage (Phase 8): provider name + external ids
  paymentProvider String?
  paymentRef      String?
  /// Physical fulfilment
  shippedAt       DateTime?
  trackingCarrier String?
  trackingNumber  String?
  /// Coupon + discount snapshot
  couponCode      String?
  discountCents   Int         @default(0)
  /// Affiliate attribution captured at checkout (th_aff cookie)
  affiliateCode   String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  items          OrderItem[]
  address        ShippingAddress?
  payments       Payment[]
  refundRequests RefundRequest[]
  commissions    Commission[]

  // ---- Living ecosystem (directive §2, §6, §19) ----
  /// BOOKING orders carry one LIVE_EVENT line and never touch the cart.
  source              OrderSource          @default(CART)
  /// When the order became PAID. Backfilled only where the time is exact.
  paidAt              DateTime?
  contributorEarnings ContributorEarning[]

  @@index([userId, createdAt])
  @@index([source, status])
}

model OrderItem {
  id             String          @id @default(cuid())
  orderId        String
  order          Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId      String
  product        Product         @relation(fields: [productId], references: [id])
  variantId      String?
  variant        ProductVariant? @relation(fields: [variantId], references: [id])
  /// Snapshot, not a join: renaming "M" to "Medium" next year must not
  /// rewrite what someone bought last year.
  variantLabel   String?
  qty            Int             @default(1)
  unitPriceThc   BigInt?
  unitPriceFiatC Int?

  // ---- Living ecosystem (directive §6, §2) ----
  /// The seat or 1:1 booking this LIVE_EVENT line pays for.
  /// Not unique: a retry after an expired hold adds a new line. Checkout keeps one PENDING or PAID order
  /// per registration under the registration's row lock.
  registrationId String?
  registration   EventRegistration?  @relation(fields: [registrationId], references: [id], onDelete: SetNull)
  earning        ContributorEarning?

  @@index([orderId])
  @@index([variantId])
  @@index([registrationId])
}

/// Snapshotted per order rather than read from the profile, so changing
/// your address never alters where a past parcel was sent.
model ShippingAddress {
  id         String   @id @default(cuid())
  orderId    String   @unique
  order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  fullName   String
  line1      String
  line2      String?
  city       String
  region     String?
  postalCode String
  country    String
  phone      String?
  createdAt  DateTime @default(now())
}

// ============================================================
// 6. COMMUNITY INTEGRATIONS  (spec §21–§22) — link tables now,
// bots in Phase 9
// ============================================================

model DiscordLink {
  userId        String    @id
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  discordUserId String    @unique
  linkedAt      DateTime  @default(now())
  lastSyncAt    DateTime?
}

model TelegramLink {
  userId         String   @id
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  telegramUserId String   @unique
  linkedAt       DateTime @default(now())
}

// ============================================================
// 7. PUBLIC CONTENT  (spec §5 — blog)
// ============================================================

model Post {
  id          String    @id @default(cuid())
  slug        String    @unique
  title       String
  excerpt     String
  contentMd   String    @db.Text
  coverImage  String?
  authorName  String    @default("Tycoonhood")
  publishedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // ---- Living ecosystem (directive §14, §15, §17; LEAD #11) ----
  kind                PostKind                 @default(ARTICLE)
  /// Live when SCHEDULED or PUBLISHED and publishedAt <= now(). Backfilled from publishedAt.
  status              PostStatus               @default(DRAFT)
  /// Byline: an expert profile or a staff member. authorName stays the display fallback.
  authorInstructorId  String?
  authorInstructor    Instructor?              @relation(fields: [authorInstructorId], references: [id], onDelete: SetNull)
  authorUserId        String?
  authorUser          User?                    @relation("PostAuthorUser", fields: [authorUserId], references: [id], onDelete: SetNull)
  categoryId          String?
  category            PostCategory?            @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  academyId           String?
  academy             Academy?                 @relation(fields: [academyId], references: [id], onDelete: SetNull)
  courseId            String?
  course              Course?                  @relation(fields: [courseId], references: [id], onDelete: SetNull)
  /// EVENT_RECAP posts.
  eventId             String?
  event               LiveEvent?               @relation(fields: [eventId], references: [id], onDelete: SetNull)
  /// SUCCESS_STORY posts need a consented Testimonial (CHECK while SCHEDULED or PUBLISHED).
  testimonialId       String?                  @unique
  testimonial         Testimonial?             @relation(fields: [testimonialId], references: [id], onDelete: SetNull)
  /// INTERVIEW posts: when and how the subject agreed.
  subjectConsentAt    DateTime?
  subjectConsentNote  String?
  featuredAt          DateTime?
  featuredRank        Int?
  /// Required when there is a cover image.
  coverAlt            String?
  seoTitle            String?
  seoDescription      String?
  readingMinutes      Int?
  submittedAt         DateTime?
  reviewedAt          DateTime?
  reviewedById        String?
  reviewedBy          User?                    @relation("PostReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)
  /// Shown to the author.
  reviewNote          String?
  /// FOUNDER_NOTE posts, and announcements signed by the founder, need the founder's recorded approval.
  founderApprovedAt   DateTime?
  founderApprovalNote String?
  createdById         String?
  createdBy           User?                    @relation("PostCreator", fields: [createdById], references: [id], onDelete: SetNull)
  updatedById         String?
  updatedBy           User?                    @relation("PostUpdater", fields: [updatedById], references: [id], onDelete: SetNull)
  /// Members subscribed to editorial.post hear once, when it goes live.
  notifyOnPublish     Boolean                  @default(false)
  notifiedAt          DateTime?
  /// Created by the dev-only demo seed. Never true in production; publicWhere.post() leaves it out.
  isDemo              Boolean                  @default(false)
  /// GENERATED ALWAYS AS (title A, excerpt B, contentMd C) STORED (raw SQL in 20261113000700). Never written.
  searchVector        Unsupported("tsvector")?

  revisions PostRevision[]
  tags      PostTag[]

  @@index([publishedAt])
  @@index([status, publishedAt])
  @@index([kind, status, publishedAt])
  @@index([featuredAt])
  @@index([authorInstructorId])
  @@index([categoryId])
  @@index([academyId, status, publishedAt])
  @@index([searchVector], type: Gin)
}

// ============================================================
// 8. THE MINER  (separate app: apps/miner)
// Server-authoritative idle rig. Accrual is computed from
// lastClaimAt on the server; claims pay from MINING_POOL via the
// standard ledger; upgrades burn THC back through spend().
// ============================================================

model MinerState {
  userId      String   @id
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  rigLevel    Int      @default(1)
  lastClaimAt DateTime @default(now())
  totalMined  BigInt   @default(0)
  updatedAt   DateTime @updatedAt

  @@index([totalMined])
}

// ============================================================
// 9. GROWTH & ATTENTION  (spec §17 referrals, watch-to-earn)
// ============================================================

enum ReferralStatus {
  PENDING
  QUALIFIED
  REJECTED
}

/// One row per referred member, ever. The unique key on referredId is the
/// structural defence against referral farming — not a rule in code that a
/// later refactor can drop.
model Referral {
  id          String         @id @default(cuid())
  referrerId  String
  referrer    User           @relation("ReferralReferrer", fields: [referrerId], references: [id], onDelete: Cascade)
  referredId  String         @unique
  referred    User           @relation("ReferralReferred", fields: [referredId], references: [id], onDelete: Cascade)
  code        String
  status      ReferralStatus @default(PENDING)
  /// Signup pays nothing. The reward lands only when the referred member does
  /// real work, which is what this timestamp records.
  qualifiedAt DateTime?
  rewardTxId  String?
  /// Deprecated (house rule: no raw IPs). Nulled by 20261113000100 and never written again;
  /// dropped by a later migration once no deployed build writes it.
  signupIp    String?
  createdAt   DateTime       @default(now())

  @@index([referrerId, status])
}

/// A Tycoonhood video that pays THC for being genuinely watched.
model WatchTask {
  id             String    @id @default(cuid())
  slug           String    @unique
  title          String
  description    String?
  /// Our own channel only — storing the id, not a URL, keeps a third party
  /// from being paid for our members' attention.
  youtubeVideoId String
  durationSec    Int
  /// How much must actually be watched before it pays.
  requiredSec    Int
  rewardThc      BigInt    @default(0)
  rewardXp       Int       @default(0)
  active         Boolean   @default(false)
  sortOrder      Int       @default(0)
  publishedAt    DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  completions WatchCompletion[]

  @@index([active, sortOrder])
}

model WatchCompletion {
  id             String    @id @default(cuid())
  userId         String
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  taskId         String
  task           WatchTask @relation(fields: [taskId], references: [id], onDelete: Cascade)
  /// The server stamps this and refuses to settle earlier than requiredSec of
  /// real wall-clock later. A script cannot outrun a clock.
  startedAt      DateTime  @default(now())
  completedAt    DateTime?
  secondsWatched Int       @default(0)
  /// Member-local day, so a daily cap means their day, not UTC's.
  dayKey         String
  rewardTxId     String?

  @@unique([userId, taskId])
  @@index([userId, dayKey])
}

// ============================================================
// 10. COMMUNITY
// Channels live house-wide (courseId null) or inside one program,
// where only members enrolled in it can read and post. Learning is
// the product; the community serves it — so questions carry the
// lesson they are about, and wins carry their proof.
// ============================================================

enum ChannelKind {
  CHAT
  ANNOUNCEMENTS
  WINS
  QUESTIONS
}

model Channel {
  id          String      @id @default(cuid())
  slug        String      @unique
  name        String
  topic       String?
  kind        ChannelKind @default(CHAT)
  /// null = house-wide; set = this program's members only
  courseId    String?
  course      Course?     @relation(fields: [courseId], references: [id], onDelete: Cascade)
  /// Only admins post here (announcements). Members read.
  adminOnly   Boolean     @default(false)
  /// Seconds a member waits between messages in this channel. 0 = off.
  slowModeSec Int         @default(0)
  sortOrder   Int         @default(0)
  archivedAt  DateTime?
  createdAt   DateTime    @default(now())

  messages Message[]
  reads    ChannelRead[]

  // ---- Living ecosystem (directive §2) ----
  /// The members-only chat of a mentor-led cohort.
  cohortId String?       @unique
  cohort   CourseCohort? @relation(fields: [cohortId], references: [id], onDelete: Cascade)

  @@index([courseId, sortOrder])
}

model Message {
  id          String    @id @default(cuid())
  channelId   String
  channel     Channel   @relation(fields: [channelId], references: [id], onDelete: Cascade)
  authorId    String
  author      User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  body        String    @db.Text
  /// A win's proof: a link to the result (http/https only).
  proofUrl    String?
  /// The lesson a question is about, when asked from the lesson player.
  lessonId    String?
  lesson      Lesson?   @relation(fields: [lessonId], references: [id], onDelete: SetNull)
  replyToId   String?
  replyTo     Message?  @relation("MessageReplies", fields: [replyToId], references: [id], onDelete: SetNull)
  replies     Message[] @relation("MessageReplies")
  /// Set by a moderator: the message is worth everyone's attention.
  pinnedAt    DateTime?
  /// Soft delete: the row stays for moderation history; the body is never served.
  deletedAt   DateTime?
  deletedById String?
  createdAt   DateTime  @default(now())

  reports MessageReport[]

  @@index([channelId, createdAt])
  @@index([authorId, createdAt])
  @@index([lessonId, createdAt])
}

/// Where a member stopped reading a channel — the source of unread counts.
model ChannelRead {
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  channelId  String
  channel    Channel  @relation(fields: [channelId], references: [id], onDelete: Cascade)
  lastReadAt DateTime

  @@id([userId, channelId])
}

model MessageReport {
  id           String    @id @default(cuid())
  messageId    String
  message      Message   @relation(fields: [messageId], references: [id], onDelete: Cascade)
  reporterId   String
  reporter     User      @relation(fields: [reporterId], references: [id], onDelete: Cascade)
  reason       String
  createdAt    DateTime  @default(now())
  resolvedAt   DateTime?
  resolvedById String?
  /// "removed" | "dismissed"
  resolution   String?

  @@unique([messageId, reporterId])
  @@index([resolvedAt, createdAt])
}

/// A member who may read but not post. until = null means until lifted.
model CommunityMute {
  userId    String    @id
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  until     DateTime?
  reason    String?
  mutedById String
  createdAt DateTime  @default(now())
}

// ============================================================
// 11. THE DAILY STANDARD
// The house sets the standard (userId null); a member may add a
// few items of their own. A day is met when every item in force
// is ticked. Items with an autoEvent tick themselves from real
// activity and cannot be ticked by hand.
// ============================================================

model StandardItem {
  id        String   @id @default(cuid())
  /// null = the house standard every member holds; set = this member's own item
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  detail    String?
  /// A domain event that ticks this item (e.g. "LESSON_COMPLETED").
  autoEvent String?
  sortOrder Int      @default(0)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())

  ticks StandardTick[]

  @@index([userId, active])
}

model StandardTick {
  userId   String
  user     User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  itemId   String
  item     StandardItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
  /// The member's local day (timezone from Profile), stored at UTC midnight.
  day      DateTime     @db.Date
  tickedAt DateTime     @default(now())

  @@id([userId, itemId, day])
  @@index([userId, day])
}

/// The record: one row per day the member met the whole standard.
model StandardDay {
  userId String
  user   User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  day    DateTime @db.Date
  /// How many items were in force when it was met.
  items  Int
  metAt  DateTime @default(now())

  @@id([userId, day])
}

// ============================================================
// 12. LMS EXTENSIONS — instructors and reviews
// ============================================================

model Instructor {
  id        String   @id @default(cuid())
  slug      String   @unique
  name      String
  headline  String?
  bio       String   @db.Text
  avatar    String?
  userId    String?  @unique
  user      User?    @relation("InstructorUser", fields: [userId], references: [id], onDelete: SetNull)
  courses   Course[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // ---- Living ecosystem (directive §2, §12, §15, §17; LEAD #2) ----
  /// The one public expert profile for mentors, instructors and creators.
  status               ExpertStatus             @default(ACTIVE)
  /// Shown to the expert when paused or suspended.
  statusReason         String?
  /// What this expert does here. Backfilled to {INSTRUCTOR}. Grants in can() come from it.
  contributorKinds     ContributorKind[]        @default([])
  /// Areas of expertise, plain labels (at most 8).
  expertise            String[]                 @default([])
  experienceMd         String?                  @db.Text
  yearsExperience      Int?
  /// ISO 639-1 codes from a fixed list.
  languages            String[]                 @default([])
  /// IANA zone, checked with isValidTimeZone.
  timezone             String?
  /// At most 5 {label, url}, https only.
  links                Json?
  /// Staff confirmed the person is who the profile says. No ID images are stored; the method goes in identityNote.
  identityVerifiedAt   DateTime?
  identityVerifiedById String?
  identityVerifiedBy   User?                    @relation("InstructorIdentityVerifier", fields: [identityVerifiedById], references: [id], onDelete: SetNull)
  /// Private to staff.
  identityNote         String?
  /// Staff confirmed the photo shows this person (verified mentor photos, §17). Changing photoUrl clears
  /// it and photoSha256; a daily sweep re-fetches the image and clears both when the hash changes.
  photoVerifiedAt      DateTime?
  /// sha256 of the image bytes fetched when staff verified the photo.
  photoSha256          String?
  photoVerifiedById    String?
  photoVerifiedBy      User?                    @relation("InstructorPhotoVerifier", fields: [photoVerifiedById], references: [id], onDelete: SetNull)
  /// The founder's own profile (§15). Backfilled for slug "harsha".
  isFounder            Boolean                  @default(false)
  /// Owner option (BLOCKED_ON_YOU item 12): once reviewed course revisions exist, this author's
  /// revisions skip review. Unused while DR-34's strict rule stands.
  trustedAuthor        Boolean                  @default(false)
  isDemo               Boolean                  @default(false)
  /// GENERATED ALWAYS AS (name A, headline B, bio C) STORED (raw SQL in 20261113000300). Never written.
  searchVector         Unsupported("tsvector")?

  mentorProfile      MentorProfile?
  credentials        ExpertCredential[]
  contributorAccount ContributorAccount?
  cohorts            CourseCohort[]
  hostedGroups       CommunityGroup[]
  resources          Resource[]
  submissions        ContentSubmission[]
  eventHosts         LiveEventHost[]
  feedback           EventFeedback[]
  posts              Post[]

  @@index([status, isDemo])
  @@index([searchVector], type: Gin)
}

model CourseReview {
  id        String   @id @default(cuid())
  courseId  String
  course    Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  rating    Int
  body      String?  @db.Text
  hidden    Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([courseId, userId])
  @@index([courseId, hidden])
}

// ============================================================
// 13. EARN — affiliate programme (money, tracked in minor units)
// Separate from THC referral rewards. Commissions are only ever
// created from a PAID order, held for the refund window, then
// approved by an admin. No commission is paid for signups alone.
// ============================================================

enum AffiliateStatus {
  PENDING
  APPROVED
  SUSPENDED
  REJECTED
}

model AffiliateProfile {
  id              String          @id @default(cuid())
  userId          String          @unique
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  code            String          @unique
  status          AffiliateStatus @default(PENDING)
  /// Where members promote (for review), free text
  channels        String?         @db.Text
  /// UPI id or bank details, stored as given; shown only to admins at payout
  payoutMethod    Json?
  termsAcceptedAt DateTime
  statusReason    String?
  reviewedAt      DateTime?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  clicks      AffiliateClick[]
  commissions Commission[]
  payouts     PayoutRequest[]
}

model AffiliateClick {
  id          String           @id @default(cuid())
  affiliateId String
  affiliate   AffiliateProfile @relation(fields: [affiliateId], references: [id], onDelete: Cascade)
  /// SHA-256 of IP + daily salt — never the raw IP
  visitorHash String
  landingPath String
  referrer    String?
  createdAt   DateTime         @default(now())

  @@index([affiliateId, createdAt])
  @@index([visitorHash, affiliateId, createdAt])
}

enum CommissionStatus {
  PENDING
  APPROVED
  REJECTED
  PAID
  REVERSED
}

model Commission {
  id          String           @id @default(cuid())
  affiliateId String
  affiliate   AffiliateProfile @relation(fields: [affiliateId], references: [id], onDelete: Cascade)
  orderId     String
  order       Order            @relation(fields: [orderId], references: [id], onDelete: Cascade)
  /// Commissionable amount (order total after discount, before shipping), minor units
  baseCents   Int
  rateBps     Int
  amountCents Int
  currency    String           @default("INR")
  status      CommissionStatus @default(PENDING)
  reason      String?
  /// Earliest date an admin may approve (refund window)
  holdUntil   DateTime
  payoutId    String?
  payout      PayoutRequest?   @relation(fields: [payoutId], references: [id], onDelete: SetNull)
  reviewedAt  DateTime?
  createdAt   DateTime         @default(now())

  @@unique([orderId])
  @@index([affiliateId, status])
}

enum PayoutStatus {
  REQUESTED
  APPROVED
  PAID
  REJECTED
}

model PayoutRequest {
  id          String            @id @default(cuid())
  /// Exactly one of affiliateId and contributorId is set (CHECK).
  affiliateId String?
  affiliate   AffiliateProfile? @relation(fields: [affiliateId], references: [id], onDelete: Cascade)
  amountCents Int
  currency    String            @default("INR")
  status      PayoutStatus      @default(REQUESTED)
  method      Json
  reference   String?
  reason      String?
  reviewedAt  DateTime?
  paidAt      DateTime?
  createdAt   DateTime          @default(now())

  commissions Commission[]

  // ---- Living ecosystem (directive §2, §12) ----
  /// A contributor payout (mentor, instructor or creator earnings).
  contributorId String?
  contributor   ContributorAccount?  @relation(fields: [contributorId], references: [id], onDelete: Cascade)
  earnings      ContributorEarning[]

  @@index([affiliateId, status])
  @@index([contributorId, status])
}

// ============================================================
// 14. SHOP EXTENSIONS — cart, wishlist, coupons, payments, refunds
// ============================================================

model CartItem {
  id        String          @id @default(cuid())
  userId    String
  user      User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId String
  product   Product         @relation(fields: [productId], references: [id], onDelete: Cascade)
  variantId String?
  variant   ProductVariant? @relation(fields: [variantId], references: [id], onDelete: Cascade)
  /// Product + variant collapsed into one key so (user, line) is unique even when variant is null
  lineKey   String
  qty       Int             @default(1)
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  @@unique([userId, lineKey])
}

model WishlistItem {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, productId])
}

model Coupon {
  id               String    @id @default(cuid())
  code             String    @unique
  description      String?
  percentOff       Int?
  amountOffCents   Int?
  minSubtotalCents Int       @default(0)
  maxRedemptions   Int?
  perUserLimit     Int       @default(1)
  redeemedCount    Int       @default(0)
  startsAt         DateTime?
  endsAt           DateTime?
  active           Boolean   @default(true)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  redemptions CouponRedemption[]
}

model CouponRedemption {
  id        String   @id @default(cuid())
  couponId  String
  coupon    Coupon   @relation(fields: [couponId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  orderId   String   @unique
  createdAt DateTime @default(now())

  @@index([couponId, userId])
}

enum PaymentStatus {
  CREATED
  CAPTURED
  FAILED
  REFUNDED
}

model Payment {
  id                String        @id @default(cuid())
  orderId           String
  order             Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  provider          String
  /// TEST payments are sandbox only and are never counted as revenue
  mode              String        @default("TEST")
  providerOrderId   String?       @unique
  providerPaymentId String?       @unique
  amountCents       Int
  currency          String
  status            PaymentStatus @default(CREATED)
  /// Paise sent back so far, here or in the Razorpay dashboard. REFUNDED only once it reaches amountCents
  refundedCents     Int           @default(0)
  /// Provider refund ids already counted in refundedCents, so a retried webhook counts once
  refundIds         String[]      @default([])
  raw               Json?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  @@index([orderId])
}

enum RefundStatus {
  REQUESTED
  APPROVED
  REJECTED
  REFUNDED
}

model RefundRequest {
  id        String       @id @default(cuid())
  orderId   String
  order     Order        @relation(fields: [orderId], references: [id], onDelete: Cascade)
  userId    String
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  reason    String       @db.Text
  status    RefundStatus @default(REQUESTED)
  adminNote String?
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  @@index([status, createdAt])
  @@index([orderId])
}

// ============================================================
// 15. COMMUNITY DISCUSSIONS
// ============================================================

model CommunityCategory {
  id          String          @id @default(cuid())
  slug        String          @unique
  name        String
  description String?
  sortOrder   Int             @default(0)
  posts       CommunityPost[]

  // ---- Living ecosystem (directive §3, §4) ----
  /// Backfilled: warrior -> warrior, business -> business, money -> wealth, mind -> wellness.
  academyId  String?
  academy    Academy?  @relation(fields: [academyId], references: [id], onDelete: SetNull)
  /// Moved from the "community.archived" SiteSetting.
  archivedAt DateTime?

  @@index([academyId])
}

model CommunityGroup {
  id          String            @id @default(cuid())
  slug        String            @unique
  name        String
  description String            @db.Text
  pillar      Pillar?
  createdAt   DateTime          @default(now())
  members     GroupMembership[]
  posts       CommunityPost[]

  // ---- Living ecosystem (directive §4, §3, §2) ----
  /// Backfilled to PROGRAMME for the four "-program" groups.
  topic            GroupTopic      @default(OTHER)
  /// Member-created groups start PENDING_REVIEW. ARCHIVED is moved from the "community.archived" SiteSetting.
  status           GroupStatus     @default(ACTIVE)
  joinPolicy       GroupJoinPolicy @default(OPEN)
  visibility       GroupVisibility @default(MEMBERS)
  academyId        String?
  academy          Academy?        @relation(fields: [academyId], references: [id], onDelete: SetNull)
  /// A programme group belongs to its course (backfilled for the four "-program" groups).
  courseId         String?
  course           Course?         @relation(fields: [courseId], references: [id], onDelete: SetNull)
  /// A mentor-hosted group.
  hostInstructorId String?
  hostInstructor   Instructor?     @relation(fields: [hostInstructorId], references: [id], onDelete: SetNull)
  createdById      String?
  createdBy        User?           @relation("GroupCreator", fields: [createdById], references: [id], onDelete: SetNull)
  reviewedById     String?
  reviewedBy       User?           @relation("GroupReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)
  reviewedAt       DateTime?
  /// Shown to the member who proposed the group.
  rejectionReason  String?
  archivedAt       DateTime?
  /// LOCAL groups: city and region only, never an address.
  city             String?
  region           String?
  country          String?
  coverImageUrl    String?
  rules            String?         @db.Text
  /// ACTIVE memberships, kept in the joining transaction. Backfilled.
  memberCount      Int             @default(0)
  isDemo           Boolean         @default(false)
  updatedAt        DateTime        @default(now()) @updatedAt

  challenges    Challenge[]
  liveEvents    LiveEvent[]
  activity      ActivityEvent[]
  announcements Announcement[]

  @@index([status, topic])
  @@index([academyId, status])
}

model GroupMembership {
  id        String         @id @default(cuid())
  groupId   String
  group     CommunityGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  userId    String
  user      User           @relation("GroupMembershipUser", fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime       @default(now())

  // ---- Living ecosystem (directive §4) ----
  role         GroupRole         @default(MEMBER)
  /// APPROVAL groups: PENDING until an owner or moderator approves.
  status       GroupMemberStatus @default(ACTIVE)
  notifyLevel  GroupNotifyLevel  @default(ANNOUNCEMENTS)
  approvedById String?
  approvedBy   User?             @relation("GroupMembershipApprover", fields: [approvedById], references: [id], onDelete: SetNull)
  approvedAt   DateTime?
  bannedById   String?
  bannedBy     User?             @relation("GroupMembershipBanner", fields: [bannedById], references: [id], onDelete: SetNull)
  bannedAt     DateTime?
  banReason    String?
  /// Set for an INVITED membership: who invited the member.
  invitedById  String?
  invitedBy    User?             @relation("GroupMembershipInviter", fields: [invitedById], references: [id], onDelete: SetNull)

  @@unique([groupId, userId])
  @@index([groupId, status, role])
  @@index([userId, status])
}

enum ModerationState {
  VISIBLE
  HIDDEN
  REMOVED
}

model CommunityPost {
  id            String             @id @default(cuid())
  authorId      String
  author        User               @relation("CommunityPostAuthor", fields: [authorId], references: [id], onDelete: Cascade)
  categoryId    String?
  category      CommunityCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  groupId       String?
  /// Restrict (was SetNull): deleting a group must never move its posts into the main feed.
  group         CommunityGroup?    @relation(fields: [groupId], references: [id], onDelete: Restrict)
  title         String
  body          String             @db.Text
  state         ModerationState    @default(VISIBLE)
  pinned        Boolean            @default(false)
  locked        Boolean            @default(false)
  commentCount  Int                @default(0)
  reactionCount Int                @default(0)
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  comments  CommunityComment[] @relation("PostComments")
  reactions Reaction[]

  // ---- Living ecosystem (directive §4, §3, §8, §10) ----
  kind                   CommunityPostKind @default(DISCUSSION)
  /// Set when the author edits after posting (the "edited" marker).
  editedAt               DateTime?
  /// Creation or the latest visible comment: the "active" sort. Backfilled from comments.
  lastActivityAt         DateTime          @default(now())
  /// Staff highlight. Cleared when the post is hidden, removed or its group archived.
  featuredAt             DateTime?
  featuredById           String?
  featuredBy             User?             @relation("CommunityPostFeaturer", fields: [featuredById], references: [id], onDelete: SetNull)
  /// The author agreed that a featured post's title and a short excerpt may show on the public homepage.
  publicPreviewConsentAt DateTime?
  /// QUESTION posts: the reply the author accepted.
  acceptedCommentId      String?           @unique
  acceptedComment        CommunityComment? @relation("AcceptedAnswer", fields: [acceptedCommentId], references: [id], onDelete: SetNull)
  academyId              String?
  academy                Academy?          @relation(fields: [academyId], references: [id], onDelete: SetNull)

  saves   SavedPost[]
  /// The project this post is the discussion thread of.
  project Project?

  @@index([state, createdAt])
  @@index([categoryId, state, createdAt])
  @@index([groupId, state, createdAt])
  @@index([authorId])
  @@index([kind, createdAt])
  @@index([featuredAt])
  @@index([state, lastActivityAt])
  @@index([academyId, state, createdAt])
}

model CommunityComment {
  id        String          @id @default(cuid())
  postId    String
  post      CommunityPost   @relation("PostComments", fields: [postId], references: [id], onDelete: Cascade)
  authorId  String
  author    User            @relation(fields: [authorId], references: [id], onDelete: Cascade)
  body      String          @db.Text
  state     ModerationState @default(VISIBLE)
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  reactions Reaction[]

  // ---- Living ecosystem (directive §4) ----
  /// One level of replies.
  parentId    String?
  parent      CommunityComment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies     CommunityComment[] @relation("CommentReplies")
  editedAt    DateTime?
  acceptedFor CommunityPost?     @relation("AcceptedAnswer")

  @@index([postId, createdAt])
  @@index([parentId])
}

model Reaction {
  id        String            @id @default(cuid())
  userId    String
  user      User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  postId    String?
  post      CommunityPost?    @relation(fields: [postId], references: [id], onDelete: Cascade)
  commentId String?
  comment   CommunityComment? @relation(fields: [commentId], references: [id], onDelete: Cascade)
  /// "respect" | "insight" | "fire"
  kind      String
  /// "post:<id>" or "comment:<id>" — one reaction of each kind per member per target
  targetKey String
  createdAt DateTime          @default(now())

  @@unique([userId, targetKey, kind])
  @@index([postId])
  @@index([commentId])
}

enum ReportStatus {
  OPEN
  ACTIONED
  DISMISSED
}

model ContentReport {
  id         String       @id @default(cuid())
  reporterId String
  reporter   User         @relation("ReportReporter", fields: [reporterId], references: [id], onDelete: Cascade)
  /// "post" | "comment" | "user" | "group" | "project" | "event" | "event_feedback" | "opportunity" | "partner"
  targetType String
  targetId   String
  reason     String       @db.Text
  status     ReportStatus @default(OPEN)
  resolution String?
  resolvedAt DateTime?
  createdAt  DateTime     @default(now())

  // ---- Living ecosystem (directive §4, §18) ----
  resolvedById String?
  resolvedBy   User?   @relation("ReportResolver", fields: [resolvedById], references: [id], onDelete: SetNull)

  @@unique([reporterId, targetType, targetId])
  @@index([status, createdAt])
  @@index([targetType, targetId])
}

// ============================================================
// 16. PLATFORM — audit, settings/CMS, contact, testimonials
// ============================================================

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?
  actor      User?    @relation(fields: [actorId], references: [id], onDelete: SetNull)
  action     String
  targetType String?
  targetId   String?
  meta       Json?
  createdAt  DateTime @default(now())

  @@index([createdAt])
  @@index([targetType, targetId])
}

/// Key/value store for admin-editable settings and homepage content blocks.
model SiteSetting {
  key       String   @id
  value     Json
  updatedAt DateTime @updatedAt
}

model ContactMessage {
  id        String   @id @default(cuid())
  name      String
  email     String
  topic     String
  message   String   @db.Text
  handled   Boolean  @default(false)
  /// The account a deletion request is for, whatever its address is now.
  /// Null for other messages, and once the account is deleted.
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  createdAt DateTime @default(now())

  // §17 consent carried by a contact-form message
  testimonials Testimonial[]

  @@index([handled, createdAt])
  @@index([userId])
}

/// Genuine member stories only — published by an admin with the member's consent.
model Testimonial {
  id        String   @id @default(cuid())
  name      String
  role      String?
  quote     String   @db.Text
  consentAt DateTime
  published Boolean  @default(false)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())

  // ---- Living ecosystem (directive §14, §17) ----
  /// The member the story is about, when they have an account.
  userId             String?
  user               User?           @relation("TestimonialMember", fields: [userId], references: [id], onDelete: SetNull)
  /// How consent was given. Null on rows written before this column.
  consentSource      ConsentSource?
  /// CONTACT_FORM consent: the message that carried it.
  contactMessageId   String?
  contactMessage     ContactMessage? @relation(fields: [contactMessageId], references: [id], onDelete: SetNull)
  consentNote        String?
  /// Withdrawal unpublishes the testimonial and any story built on it.
  consentWithdrawnAt DateTime?
  publishedAt        DateTime?
  /// Staff checked the story against the member's real record.
  verifiedAt         DateTime?
  verifiedById       String?
  verifiedBy         User?           @relation("TestimonialVerifier", fields: [verifiedById], references: [id], onDelete: SetNull)
  updatedAt          DateTime        @default(now()) @updatedAt

  story Post?
}

// ============================================================
// 17. LIVING ECOSYSTEM — ACADEMIES  (directive §3, §1, §21)
// One Academy row per Pillar, inserted by migration. Names are
// editable data; the pillar is the stable key older rows map
// through. Never "campus" in code or URLs (that is the 3D world).
// ============================================================

/// §3 How a member came to belong to an academy.
enum AcademyJoinSource {
  SELF
  ENROLMENT
  ONBOARDING
  BACKFILL
}

/// §3 A learning academy (Warrior, Business, Wealth, Wellness).
model Academy {
  id               String        @id @default(cuid())
  /// warrior | business | wealth | wellness
  slug             String        @unique
  pillar           Pillar        @unique
  name             String
  shortName        String
  /// The directive's focus line.
  tagline          String
  description      String        @db.Text
  focusAreas       String[]      @default([])
  /// Design token key (warrior | builder | tycoon | mind), never a hex value.
  accent           String
  /// A PhotoName from apps/web/lib/photos.ts.
  heroPhoto        String?
  /// Wealth: education, not advice. Wellness: not medical treatment.
  disclaimer       String?       @db.Text
  welcomeMd        String?       @db.Text
  flagshipCourseId String?       @unique
  flagshipCourse   Course?       @relation("AcademyFlagship", fields: [flagshipCourseId], references: [id], onDelete: SetNull)
  status           ContentStatus @default(PUBLISHED)
  sortOrder        Int           @default(0)
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  courses          Course[]            @relation("AcademyCourses")
  memberships      AcademyMembership[]
  challenges       Challenge[]
  groups           CommunityGroup[]
  categories       CommunityCategory[]
  communityPosts   CommunityPost[]
  xpEvents         XpEvent[]
  achievements     Achievement[]
  missions         Mission[]
  skills           Skill[]
  learningPaths    LearningPath[]
  projects         Project[]
  goals            Goal[]
  mentorCategories MentorCategory[]
  eventKinds       EventKind[]
  liveEvents       LiveEvent[]
  eventSeries      LiveEventSeries[]
  eventInterests   EventInterest[]
  activity         ActivityEvent[]
  announcements    Announcement[]
  opportunities    Opportunity[]
  posts            Post[]
  /// Shop products staff link to this academy (academy and programme pages list them when active).
  products         Product[]
}

/// §3/§21 Members join any number of academies. Leaving is soft.
model AcademyMembership {
  id        String            @id @default(cuid())
  userId    String
  user      User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  academyId String
  academy   Academy           @relation(fields: [academyId], references: [id], onDelete: Cascade)
  source    AcademyJoinSource @default(SELF)
  joinedAt  DateTime          @default(now())
  /// Soft leave keeps history; rejoining clears it; automatic joins never override it.
  leftAt    DateTime?
  /// Academy updates and announcements reach this member. Opt-in: SELF and ONBOARDING joins set it
  /// true; BACKFILL and ENROLMENT joins leave it false, because enrolling is not a request for notices.
  notify    Boolean           @default(false)

  @@unique([userId, academyId])
  @@index([academyId, leftAt])
}

// ============================================================
// 18. NOTIFICATION CENTRE  (directive §13; LEAD #5, #10)
// In-app rows are written at once; email and push copies and
// every timed notice go through the one outbox,
// ScheduledNotification. Push is inert until VAPID keys exist.
// ============================================================

/// §13 Delivery channels.
enum NotificationChannel {
  IN_APP
  EMAIL
  PUSH
}

/// §13
enum NotificationPriority {
  LOW
  NORMAL
  HIGH
}

/// §13
enum DigestFrequency {
  OFF
  DAILY
  WEEKLY
}

/// §13
enum ScheduledNotificationStatus {
  PENDING
  SENT
  /// Dev mail mode: written to the server log, not emailed.
  LOGGED
  /// Not sent on purpose: preference off at dispatch, no mail provider, push not configured, subject gone.
  SKIPPED
  CANCELLED
  FAILED
}

/// §13/§18
enum AnnouncementPriority {
  NORMAL
  IMPORTANT
}

/// §13/§18
enum AnnouncementAudience {
  ALL
  ROLE
  ACADEMY
  GROUP
  COURSE
}

/// §13/§18
enum AnnouncementStatus {
  DRAFT
  SCHEDULED
  SENT
  RETRACTED
}

/// §13 Staff-editable label and default channels for one topic of the code catalogue
/// (packages/core/src/platform/notification-topics.ts). The catalogue decides which
/// topics exist and which are locked; a missing row falls back to catalogue defaults.
model NotificationTopic {
  key          String   @id
  label        String
  description  String?
  defaultInApp Boolean  @default(true)
  defaultEmail Boolean  @default(false)
  defaultPush  Boolean  @default(false)
  /// Staff can silence a noisy topic. Ignored for locked topics.
  active       Boolean  @default(true)
  updatedById  String?
  updatedBy    User?    @relation("NotificationTopicEditor", fields: [updatedById], references: [id], onDelete: SetNull)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

/// §13 A member's override for one topic on one channel. No row = the topic default.
model NotificationPreference {
  userId    String
  user      User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  topic     String
  channel   NotificationChannel
  enabled   Boolean
  updatedAt DateTime            @updatedAt

  @@id([userId, topic, channel])
}

/// §13 Digest, quiet hours, pause and one-click unsubscribe. Created on first change or first email.
model NotificationSettings {
  userId               String          @id
  user                 User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  emailDigest          DigestFrequency @default(OFF)
  /// Hour of the member's own day (memberZone), 0-23.
  digestHour           Int             @default(8)
  /// Minutes of the member's local day, 0-1439. Both null = no quiet hours.
  quietStartMin        Int?
  quietEndMin          Int?
  pausedUntil          DateTime?
  /// Opted out of all non-essential email.
  emailOptOutAt        DateTime?
  /// sha256 of the member's unsubscribe token, HMAC(privacySecret(), "unsub|" + userId); the token is never stored.
  /// Links carry the token plus one topic key: they turn off that topic's email, and the page also offers
  /// "all non-essential email" (emailOptOutAt). Essential topics cannot be unsubscribed.
  unsubscribeTokenHash String          @unique
  updatedAt            DateTime        @updatedAt
}

/// §13 A web push endpoint. Built but inert until VAPID keys exist (OQ-K).
model PushSubscription {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint     String    @unique
  p256dh       String
  auth         String
  /// e.g. "Chrome on Android". No raw user agent, no IP.
  label        String?
  failureCount Int       @default(0)
  lastUsedAt   DateTime?
  revokedAt    DateTime?
  createdAt    DateTime  @default(now())

  @@index([userId])
}

/// §13/§18 A stored, scheduled, audience-targeted, retractable announcement.
/// Replaces fire-and-forget cms.announce.
model Announcement {
  id            String               @id @default(cuid())
  title         String
  body          String               @db.Text
  /// A site path, checked by safeSitePath.
  href          String?
  priority      AnnouncementPriority @default(NORMAL)
  audience      AnnouncementAudience
  role          UserRole?
  academyId     String?
  academy       Academy?             @relation(fields: [academyId], references: [id], onDelete: SetNull)
  groupId       String?
  group         CommunityGroup?      @relation(fields: [groupId], references: [id], onDelete: SetNull)
  courseId      String?
  course        Course?              @relation(fields: [courseId], references: [id], onDelete: SetNull)
  /// Allows email copies; each member's preference for the topic still decides.
  sendEmail     Boolean              @default(false)
  status        AnnouncementStatus   @default(DRAFT)
  scheduledFor  DateTime?
  sentAt        DateTime?
  /// Members it was delivered to, counted at send time.
  recipients    Int                  @default(0)
  retractedAt   DateTime?
  retractedById String?
  retractedBy   User?                @relation("AnnouncementRetractor", fields: [retractedById], references: [id], onDelete: SetNull)
  createdById   String?
  createdBy     User?                @relation("AnnouncementCreator", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt

  notifications Notification[]

  @@index([status, scheduledFor])
}

/// §13 The one outbox for timed and out-of-band delivery (LEAD #5). A row is either a
/// scheduled notice (channel null: at runAt the gateway delivers it on every channel the
/// member's preferences then allow) or one EMAIL/PUSH copy of a notice (channel set).
/// Used by event and mentoring reminders, challenge deadlines, goal nudges, digests and
/// the email/push copies of immediate notices.
model ScheduledNotification {
  id                String                      @id @default(cuid())
  userId            String
  user              User                        @relation(fields: [userId], references: [id], onDelete: Cascade)
  /// Catalogue key, e.g. "event.reminder".
  topic             String
  /// Null = a scheduled notice; EMAIL or PUSH = one delivery copy. Never IN_APP (CHECK).
  channel           NotificationChannel?
  /// The in-app notice an EMAIL/PUSH copy belongs to (null when in-app is off for the topic).
  notificationId    String?
  notification      Notification?               @relation(fields: [notificationId], references: [id], onDelete: SetNull)
  /// e.g. "live_event", "event_registration", "challenge", "goal", "digest".
  subjectType       String
  subjectId         String
  runAt             DateTime
  /// Past this moment the row is stale: dispatchDue marks it SKIPPED with lastError "stale". Set to the
  /// event start, the challenge end or the goal week's end. Quiet hours never defer a row past it.
  notAfter          DateTime?
  /// Render inputs only (offset, snapshot). Text is rendered at dispatch from topic + subject.
  payload           Json?
  /// e.g. "event:<eventId>:user:<userId>:s<icsSequence>:T-60". Scheduling the same key twice is a no-op.
  /// Rows are cancelled by subject (cancelForSubject on subjectType + subjectId), never by a LIKE prefix.
  dedupeKey         String                      @unique
  status            ScheduledNotificationStatus @default(PENDING)
  attempts          Int                         @default(0)
  /// Claimed by a dispatcher until then (FOR UPDATE SKIP LOCKED; sending happens outside the transaction).
  lockedUntil       DateTime?
  /// A short code with no personal data: no_mailer, push_unconfigured, pref_off, subject_gone, stale.
  lastError         String?
  provider          String?
  providerMessageId String?
  processedAt       DateTime?
  createdAt         DateTime                    @default(now())

  @@index([status, runAt])
  @@index([subjectType, subjectId])
  @@index([userId, status])
}

// ============================================================
// 19. ACTIVITY FEED AND ANALYTICS  (directive §4, §10, §11, §19; LEAD #9)
// ActivityEvent is the member-facing feed. Analytics uses its own
// private aggregate tables. They are never merged.
// ============================================================

/// §4 Kinds of genuine activity shown in the feed.
enum ActivityEventKind {
  ACADEMY_JOINED
  COURSE_COMPLETED
  PATH_COMPLETED
  ACHIEVEMENT_UNLOCKED
  RANK_REACHED
  CHALLENGE_JOINED
  CHALLENGE_COMPLETED
  PROJECT_PUBLISHED
  PROJECT_VERIFIED
  SKILL_VERIFIED
  INTRODUCTION_POSTED
  UPDATE_POSTED
  DISCUSSION_FEATURED
  GROUP_CREATED
  GROUP_ANNOUNCEMENT
  EVENT_PUBLISHED
  MENTOR_JOINED
  ARTICLE_PUBLISHED
  OPPORTUNITY_PUBLISHED
  COMMUNITY_MILESTONE
}

/// §4 Who may see a feed item, before the actor's privacy facet is applied on read.
enum ActivityAudience {
  MEMBERS
  ACADEMY
  GROUP
  COURSE
  STAFF
}

/// §4/§10/§11 One item of the member-facing feed. Privacy is applied on read, so
/// turning a facet off hides past items too.
model ActivityEvent {
  id           String            @id @default(cuid())
  kind         ActivityEventKind
  /// Null for milestones and staff items.
  actorId      String?
  actor        User?             @relation("ActivityActor", fields: [actorId], references: [id], onDelete: Cascade)
  audience     ActivityAudience  @default(MEMBERS)
  academyId    String?
  academy      Academy?          @relation(fields: [academyId], references: [id], onDelete: SetNull)
  groupId      String?
  group        CommunityGroup?   @relation(fields: [groupId], references: [id], onDelete: Cascade)
  courseId     String?
  course       Course?           @relation(fields: [courseId], references: [id], onDelete: Cascade)
  subjectType  String
  subjectId    String
  /// The actor's privacy facet checked on read, e.g. "achievements", "courses", "projects".
  facet        String?
  /// Render snapshot: title, safe href, counts. No email, no other member's free text.
  data         Json
  dedupeKey    String            @unique
  /// When the source event really happened.
  occurredAt   DateTime
  hiddenAt     DateTime?
  hiddenById   String?
  hiddenBy     User?             @relation("ActivityHider", fields: [hiddenById], references: [id], onDelete: SetNull)
  hiddenReason String?
  isDemo       Boolean           @default(false)
  createdAt    DateTime          @default(now())

  @@index([occurredAt(sort: Desc), id])
  @@index([actorId, occurredAt])
  @@index([groupId, occurredAt])
  @@index([academyId, occurredAt])
  @@index([subjectType, subjectId])
  @@index([courseId, occurredAt])
}

/// §19 One row per member per platform day (IST) on which they used the signed-in app.
/// The source for DAU, WAU, MAU and retention. No IP, user agent, URL or device.
model MemberActivityDay {
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  /// Platform day (IST) from analyticsDayKey().
  day         DateTime @db.Date
  firstSeenAt DateTime
  lastSeenAt  DateTime
  /// Coarse areas only: learn, grow, connect, shop, earn, mentor, event, opportunity.
  surfaces    String[] @default([])

  @@id([userId, day])
  @@index([day])
}

/// §19 Immutable daily rollup. Counts use countableMemberWhere (no staff, suspended,
/// excluded or demo accounts); money counts LIVE payments only.
model AnalyticsDaily {
  day                     DateTime @id @db.Date
  dau                     Int
  wau                     Int
  mau                     Int
  newMembers              Int
  returningMembers        Int
  enrolments              Int
  lessonsCompleted        Int
  courseCompletions       Int
  quizAttempts            Int
  quizPassed              Int
  certificates            Int
  missionCompletions      Int
  challengeCompletions    Int
  achievementsUnlocked    Int
  communityParticipants   Int
  posts                   Int
  comments                Int
  chatMessages            Int
  groupJoins              Int
  mentorBookings          Int
  mentorSessionsCompleted Int
  eventRegistrations      Int
  eventAttendances        Int
  opportunityApplications Int
  productViews            Int
  cartAdds                Int
  checkoutsStarted        Int
  ordersPaidLive          Int
  formulaVersion          Int
  computedAt              DateTime
}

/// §19 Anonymous daily counters that give funnels a denominator. No user id.
model EngagementCounterDay {
  day       DateTime @db.Date
  /// e.g. "product.view", "cart.add", "checkout.start", "event.view", "opportunity.view".
  metric    String
  /// Loose reference (no FK) to a Product, LiveEvent or Opportunity; "" when not applicable.
  subjectId String   @default("")
  count     Int      @default(0)

  @@id([day, metric, subjectId])
}

// ============================================================
// 20. PROGRESSION AND IDENTITY  (directive §8, §3; LEAD #6, #8)
// ============================================================

/// §8
enum SkillLevel {
  /// Self-declared by the member; always labelled "self-declared".
  DECLARED
  STARTED
  PRACTISED
  PROFICIENT
  VERIFIED
}

/// §8
enum SkillVerifiedVia {
  PROJECT_REVIEW
  STAFF_CHECK
  MENTOR_ASSESSMENT
}

/// §8/§12
enum ProjectKind {
  PROJECT
  ARTICLE
  VIDEO
  TEMPLATE
  TOOL
  OTHER
}

/// §8
enum ProjectVisibility {
  PRIVATE
  MEMBERS
  PUBLIC
}

/// §8
enum ProjectVerificationStatus {
  NOT_SUBMITTED
  SUBMITTED
  CHANGES_REQUESTED
  VERIFIED
  NOT_VERIFIED
}

/// §12 A collaborator invitation. Only ACCEPTED collaborators are ever shown.
enum ProjectCollaboratorStatus {
  INVITED
  ACCEPTED
  DECLINED
  REMOVED
}

/// §8
enum RankAwardReason {
  EARNED
  GRANDFATHERED
  ADMIN
}

/// §8
enum AchievementKind {
  ACHIEVEMENT
  MILESTONE
  BADGE
  RECOGNITION
}

/// §3
enum PathStepKind {
  COURSE
  MODULE
  CHALLENGE
  PROJECT_BRIEF
  RESOURCE
}

/// §8/§7 A skill. academyId null = cross-academy.
model Skill {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  description String?
  academyId   String?
  academy     Academy? @relation(fields: [academyId], references: [id], onDelete: SetNull)
  sortOrder   Int      @default(0)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  modules       ModuleSkill[]
  challenges    ChallengeSkill[]
  projects      ProjectSkill[]
  opportunities OpportunitySkill[]
  members       MemberSkill[]

  @@index([academyId, active])
}

/// §8 Curriculum modules teach skills. A course's skills are its modules' skills.
/// seed-academy recreates these rows whenever it rebuilds modules.
model ModuleSkill {
  moduleId String
  module   CourseModule @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  skillId  String
  skill    Skill        @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@id([moduleId, skillId])
  @@index([skillId])
}

/// §8/§5
model ChallengeSkill {
  challengeId String
  challenge   Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  skillId     String
  skill       Skill     @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@id([challengeId, skillId])
  @@index([skillId])
}

/// §8/§7 A member's standing in one skill. DECLARED comes from the member; higher
/// levels are recomputed from evidence; VERIFIED needs someone other than the member.
model MemberSkill {
  id               String            @id @default(cuid())
  userId           String
  user             User              @relation("MemberSkillOwner", fields: [userId], references: [id], onDelete: Cascade)
  skillId          String
  skill            Skill             @relation(fields: [skillId], references: [id], onDelete: Cascade)
  level            SkillLevel
  /// When the member declared it (kept after evidence raises the level).
  declaredAt       DateTime?
  /// Ids of the modules, certificate, challenges and projects behind the level.
  evidence         Json              @default("{}")
  /// When the evidence-derived level was reached.
  reachedAt        DateTime?
  verifiedAt       DateTime?
  verifiedById     String?
  verifiedBy       User?             @relation("MemberSkillVerifier", fields: [verifiedById], references: [id], onDelete: SetNull)
  verifiedVia      SkillVerifiedVia?
  verificationNote String?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  @@unique([userId, skillId])
  @@index([skillId, level])
}

/// §8/§4/§12 A member's project or portfolio piece (also a contributor's showcased work).
/// The showcase is a view over published, VISIBLE, PUBLIC/MEMBERS projects.
model Project {
  id                 String                    @id @default(cuid())
  userId             String
  user               User                      @relation("ProjectOwner", fields: [userId], references: [id], onDelete: Cascade)
  slug               String
  kind               ProjectKind               @default(PROJECT)
  title              String
  summary            String
  bodyMd             String?                   @db.Text
  url                String?
  /// At most 5 {label, url}, https only.
  links              Json?
  coverImageUrl      String?
  academyId          String?
  academy            Academy?                  @relation(fields: [academyId], references: [id], onDelete: SetNull)
  /// A capstone for this course.
  courseId           String?
  course             Course?                   @relation(fields: [courseId], references: [id], onDelete: SetNull)
  challengeId        String?
  challenge          Challenge?                @relation(fields: [challengeId], references: [id], onDelete: SetNull)
  visibility         ProjectVisibility         @default(PRIVATE)
  /// Null = draft.
  publishedAt        DateTime?
  verificationStatus ProjectVerificationStatus @default(NOT_SUBMITTED)
  submittedAt        DateTime?
  verifiedAt         DateTime?
  /// Never the owner (CHECK).
  verifiedById       String?
  verifiedBy         User?                     @relation("ProjectVerifier", fields: [verifiedById], references: [id], onDelete: SetNull)
  reviewNote         String?
  state              ModerationState           @default(VISIBLE)
  featuredAt         DateTime?
  featuredById       String?
  featuredBy         User?                     @relation("ProjectFeaturer", fields: [featuredById], references: [id], onDelete: SetNull)
  /// The community thread that carries comments, reactions and reports.
  postId             String?                   @unique
  post               CommunityPost?            @relation(fields: [postId], references: [id], onDelete: SetNull)
  isDemo             Boolean                   @default(false)
  createdAt          DateTime                  @default(now())
  updatedAt          DateTime                  @updatedAt

  skills        ProjectSkill[]
  collaborators ProjectCollaborator[]

  @@unique([userId, slug])
  @@index([verificationStatus, submittedAt])
  @@index([academyId, verificationStatus])
  @@index([visibility, state, publishedAt])
  @@index([featuredAt])
}

/// §12/§4 A member the project owner invited. Shown only after they accept, and only where
/// their own `projects` facet allows it. Declining or removal hides them again.
model ProjectCollaborator {
  id          String                    @id @default(cuid())
  projectId   String
  project     Project                   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId      String
  user        User                      @relation("ProjectCollaborations", fields: [userId], references: [id], onDelete: Cascade)
  /// What they did, in their own words; at most 60 characters.
  role        String?                   @db.VarChar(60)
  status      ProjectCollaboratorStatus @default(INVITED)
  invitedById String?
  invitedBy   User?                     @relation("ProjectCollaboratorInviter", fields: [invitedById], references: [id], onDelete: SetNull)
  invitedAt   DateTime                  @default(now())
  /// Set when status becomes ACCEPTED.
  acceptedAt  DateTime?
  /// When they accepted or declined, or the owner removed them.
  respondedAt DateTime?

  @@unique([projectId, userId])
  @@index([userId, status])
}

/// §8 Skills a project claims; they count only once the project is VERIFIED.
model ProjectSkill {
  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  skillId   String
  skill     Skill   @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@id([projectId, skillId])
  @@index([skillId])
}

/// §8 Why a member holds a rank. User.rankId stays the cache; ranks never demote.
model RankAward {
  id          String          @id @default(cuid())
  userId      String
  user        User            @relation("RankAwardMember", fields: [userId], references: [id], onDelete: Cascade)
  rankId      String
  rank        RankDefinition  @relation(fields: [rankId], references: [id], onDelete: Restrict)
  reason      RankAwardReason
  /// The counts that met the criteria.
  evidence    Json            @default("{}")
  awardedById String?
  awardedBy   User?           @relation("RankAwardGiver", fields: [awardedById], references: [id], onDelete: SetNull)
  note        String?
  awardedAt   DateTime        @default(now())

  @@index([userId, awardedAt])
}

/// §3 An ordered route through an academy's material. Duration is computed from the steps.
model LearningPath {
  id            String        @id @default(cuid())
  academyId     String
  academy       Academy       @relation(fields: [academyId], references: [id], onDelete: Restrict)
  slug          String        @unique
  title         String
  summary       String
  descriptionMd String?       @db.Text
  /// Plain "who it is for".
  audience      String?
  status        ContentStatus @default(DRAFT)
  sortOrder     Int           @default(0)
  createdById   String?
  createdBy     User?         @relation("LearningPathAuthor", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  steps   LearningPathStep[]
  follows LearningPathFollow[]

  @@index([academyId, status, sortOrder])
}

/// §3 One step of a path pointing at real content. A target that is deleted becomes
/// null (SetNull) and the admin flags the step.
model LearningPathStep {
  id          String        @id @default(cuid())
  pathId      String
  path        LearningPath  @relation(fields: [pathId], references: [id], onDelete: Cascade)
  sortOrder   Int
  kind        PathStepKind
  courseId    String?
  course      Course?       @relation(fields: [courseId], references: [id], onDelete: SetNull)
  moduleId    String?
  module      CourseModule? @relation(fields: [moduleId], references: [id], onDelete: SetNull)
  challengeId String?
  challenge   Challenge?    @relation(fields: [challengeId], references: [id], onDelete: SetNull)
  /// PROJECT_BRIEF and RESOURCE steps.
  title       String?
  bodyMd      String?       @db.Text
  /// https only.
  url         String?
  required    Boolean       @default(true)

  @@unique([pathId, sortOrder])
}

/// §3 A member following a path. Progress is derived, never stored.
model LearningPathFollow {
  id          String       @id @default(cuid())
  userId      String
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  pathId      String
  path        LearningPath @relation(fields: [pathId], references: [id], onDelete: Cascade)
  startedAt   DateTime     @default(now())
  /// Stamped once, when every required step is done.
  completedAt DateTime?

  @@unique([userId, pathId])
  @@index([pathId])
}

// ============================================================
// 21. MENTORS AND CONTRIBUTORS  (directive §2, §12; LEAD #2, #3, #15)
// Instructor is the one public expert profile. Mentor data lives in
// MentorProfile. Applications, payee records, revenue terms and
// earnings are private and staff-reviewed. No revenue share is seeded.
// ============================================================

/// §2/§12
enum ExpertStatus {
  PENDING
  ACTIVE
  PAUSED
  SUSPENDED
  ARCHIVED
}

/// §2/§12
enum ContributorKind {
  MENTOR
  INSTRUCTOR
  CREATOR
}

/// §2/§12
enum ContributorApplicationStatus {
  SUBMITTED
  IN_REVIEW
  NEEDS_INFO
  APPROVED
  REJECTED
  WITHDRAWN
}

/// §2/§12
enum ContributorAccountStatus {
  ACTIVE
  SUSPENDED
}

/// §2
enum MentorStatus {
  DRAFT
  ACTIVE
  PAUSED
  SUSPENDED
}

/// §2
enum BookingMode {
  INSTANT
  REQUEST
}

/// §2
enum CredentialKind {
  DEGREE
  CERTIFICATION
  LICENCE
  EMPLOYMENT
  AWARD
  OTHER
}

/// §2
enum CredentialStatus {
  PENDING
  VERIFIED
  REJECTED
  EXPIRED
}

/// §2
enum AvailabilityExceptionKind {
  BLOCKED
  EXTRA
}

/// §2/§12 What a revenue share applies to.
enum RevenueScope {
  MENTORING
  EVENT
  COURSE
}

/// §2
enum CourseDelivery {
  SELF_PACED
  MENTOR_LED
}

/// §2
enum CohortStatus {
  DRAFT
  OPEN
  RUNNING
  COMPLETED
  CANCELLED
}

/// §12
enum ContentSubmissionType {
  COURSE
  COURSE_UPDATE
  RESOURCE
}

/// §12
enum ContentSubmissionStatus {
  SUBMITTED
  IN_REVIEW
  CHANGES_REQUESTED
  APPROVED
  REJECTED
  WITHDRAWN
}

/// §6/§12 Who may open an event or expert-profile resource.
enum ResourceAudience {
  PUBLIC
  MEMBERS
  REGISTERED
  ATTENDED
}

/// §2/§6 Keeps booking orders apart from cart orders.
enum OrderSource {
  CART
  BOOKING
}

/// §2 Mentor-specific settings and standing, 1:1 with the expert profile.
model MentorProfile {
  id                String       @id @default(cuid())
  instructorId      String       @unique
  instructor        Instructor   @relation(fields: [instructorId], references: [id], onDelete: Cascade)
  status            MentorStatus @default(DRAFT)
  statusReason      String?
  acceptingBookings Boolean      @default(false)
  /// INSTANT books a published slot at once. REQUEST holds the slot until the mentor accepts or the
  /// hold expires (min(slot start - minNoticeHours, now + 48h)); a member has at most 3 open requests.
  bookingMode       BookingMode  @default(INSTANT)
  /// 0-720.
  minNoticeHours    Int          @default(24)
  /// 1-120.
  horizonDays       Int          @default(30)
  /// 0-120.
  bufferMinutes     Int          @default(15)
  maxSessionsPerDay Int?
  /// Notice a member must give for a cancellation not to count as late. Null = until the start (no
  /// invented policy). Refunds follow the agreement's refundWindowHours, never this field.
  cancellationHours Int?
  /// Self-reported; labelled so on the profile.
  priorHistoryMd    String?      @db.Text
  approvedAt        DateTime?
  approvedById      String?
  approvedBy        User?        @relation("MentorApprover", fields: [approvedById], references: [id], onDelete: SetNull)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  categories             MentorCategoryLink[]
  offerings              MentorOffering[]
  availabilityRules      MentorAvailabilityRule[]
  availabilityExceptions MentorAvailabilityException[]
  events                 LiveEvent[]
  interests              EventInterest[]

  @@index([status, acceptingBookings])
}

/// §2 The directive's ten mentor categories, as data (seed-taxonomy.ts).
model MentorCategory {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  description String?
  academyId   String?
  academy     Academy? @relation(fields: [academyId], references: [id], onDelete: SetNull)
  /// Shown on every offering in this category, on the booking form and in the confirmation; the
  /// member's acknowledgement is stored (EventRegistration.disclaimerAckAt). Seeded for categories 5-8.
  disclaimer  String?  @db.Text
  /// False = offerings in this category are free only. Seeded false for financial-literacy until the owner
  /// confirms the regulatory position (B7); staff change it in /admin/mentors/categories, audited.
  paidAllowed Boolean  @default(true)
  sortOrder   Int      @default(0)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  mentors   MentorCategoryLink[]
  offerings MentorOffering[]
}

/// §2 One primary category per mentor (partial unique index).
model MentorCategoryLink {
  mentorId   String
  mentor     MentorProfile  @relation(fields: [mentorId], references: [id], onDelete: Cascade)
  categoryId String
  category   MentorCategory @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  isPrimary  Boolean        @default(false)

  @@id([mentorId, categoryId])
  @@index([categoryId])
}

/// §2 A qualification. Public only when VERIFIED ("qualifications where verified").
model ExpertCredential {
  id              String                  @id @default(cuid())
  instructorId    String
  instructor      Instructor              @relation(fields: [instructorId], references: [id], onDelete: Cascade)
  kind            CredentialKind
  title           String
  issuer          String
  year            Int?
  /// The issuer's own verification link, if any.
  publicUrl       String?
  /// Private: how staff verified it. Never selected by public queries. No ID images are stored.
  evidenceNote    String?                 @db.Text
  status          CredentialStatus        @default(PENDING)
  verifiedById    String?
  verifiedBy      User?                   @relation("CredentialVerifier", fields: [verifiedById], references: [id], onDelete: SetNull)
  verifiedAt      DateTime?
  rejectionReason String?
  expiresAt       DateTime?
  applicationId   String?
  application     ContributorApplication? @relation(fields: [applicationId], references: [id], onDelete: SetNull)
  createdAt       DateTime                @default(now())
  updatedAt       DateTime                @updatedAt

  @@index([instructorId, status])
}

/// §2/§12 One application flow for mentors, instructors and creators.
model ContributorApplication {
  id              String                       @id @default(cuid())
  userId          String
  user            User                         @relation("ContributorApplicant", fields: [userId], references: [id], onDelete: Cascade)
  kind            ContributorKind
  status          ContributorApplicationStatus @default(SUBMITTED)
  /// A zod schema per kind: display name, headline, bio, expertise, experience, languages,
  /// time zone, sample links, proposed offerings or outline, policy acknowledgements.
  answers         Json
  /// Checked against MentorCategory.slug.
  categorySlugs   String[]                     @default([])
  termsVersion    String
  termsAcceptedAt DateTime
  /// Shown to the applicant.
  statusReason    String?
  reviewerId      String?
  reviewer        User?                        @relation("ContributorReviewer", fields: [reviewerId], references: [id], onDelete: SetNull)
  reviewedAt      DateTime?
  submittedAt     DateTime                     @default(now())
  updatedAt       DateTime                     @updatedAt

  credentials ExpertCredential[]

  @@index([status, kind, submittedAt])
  @@index([userId])
}

/// §2/§12 The private payee record of an approved contributor, kept apart from the public
/// profile so payout data never leaks through profile queries.
model ContributorAccount {
  id                    String                   @id @default(cuid())
  /// RESTRICT: an account with contributor money is anonymised, never deleted, as the privacy policy
  /// already says for orders and commissions (O36).
  userId                String                   @unique
  user                  User                     @relation(fields: [userId], references: [id], onDelete: Restrict)
  instructorId          String?                  @unique
  instructor            Instructor?              @relation(fields: [instructorId], references: [id], onDelete: SetNull)
  status                ContributorAccountStatus @default(ACTIVE)
  statusReason          String?
  /// normalisePayoutMethod shape, with fingerprint. Shown only to admin.earn at payout.
  payoutMethod          Json?
  payoutMethodUpdatedAt DateTime?
  termsVersion          String
  termsAcceptedAt       DateTime
  createdAt             DateTime                 @default(now())
  updatedAt             DateTime                 @updatedAt

  agreements RevenueShareAgreement[]
  earnings   ContributorEarning[]
  payouts    PayoutRequest[]
}

/// §2/§12 The contributor's share for a scope. contributorId null = platform default.
/// No row is seeded: paid offerings stay unpublishable until staff set terms (LEAD #15).
model RevenueShareAgreement {
  id                  String              @id @default(cuid())
  contributorId       String?
  contributor         ContributorAccount? @relation(fields: [contributorId], references: [id], onDelete: Cascade)
  scope               RevenueScope
  /// Basis points, 0-10000, of the line's net paid amount. The platform keeps the rest: that remainder is the
  /// platform fee, so there is no second fee field that could disagree with it.
  contributorShareBps Int
  /// Days an earning is held after the later of payment and the event's end. Null until staff set it.
  holdDays            Int?
  /// Smallest payout a contributor may request, in paise. Null until staff set it.
  minPayoutCents      Int?
  /// A member who cancels at least this many hours before the start is refunded in full. Null until set.
  /// A paid offering or event in this scope cannot be published while any term on its agreement is null.
  refundWindowHours   Int?
  version             Int
  /// The text shown when the contributor accepts.
  termsMd             String              @db.Text
  effectiveFrom       DateTime
  effectiveUntil      DateTime?
  createdById         String?
  createdBy           User?               @relation("AgreementAuthor", fields: [createdById], references: [id], onDelete: SetNull)
  acceptedAt          DateTime?
  acceptedById        String?
  acceptedBy          User?               @relation("AgreementAcceptor", fields: [acceptedById], references: [id], onDelete: SetNull)
  createdAt           DateTime            @default(now())

  earnings ContributorEarning[]

  @@unique([contributorId, scope, version])
  @@index([contributorId, scope, effectiveFrom])
}

/// §2/§12 Money a contributor earns from one paid order line, in INR paise. Held, then
/// approved by staff, like Commission. Lines paid in TEST mode are never payable.
model ContributorEarning {
  id             String                @id @default(cuid())
  contributorId  String
  contributor    ContributorAccount    @relation(fields: [contributorId], references: [id], onDelete: Cascade)
  scope          RevenueScope
  orderId        String
  order          Order                 @relation(fields: [orderId], references: [id], onDelete: Cascade)
  /// One earning per paid line.
  orderItemId    String                @unique
  orderItem      OrderItem             @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  registrationId String?
  registration   EventRegistration?    @relation(fields: [registrationId], references: [id], onDelete: SetNull)
  /// Net paise paid for the line after any coupon.
  baseCents      Int
  /// Snapshot of the agreement's share.
  shareBps       Int
  /// floor(baseCents * shareBps / 10000).
  amountCents    Int
  currency       String                @default("INR")
  status         CommissionStatus      @default(PENDING)
  agreementId    String
  agreement      RevenueShareAgreement @relation(fields: [agreementId], references: [id], onDelete: Restrict)
  /// The later of payment and the event's end, plus the contributor hold days.
  holdUntil      DateTime
  reason         String?
  reviewedAt     DateTime?
  payoutId       String?
  payout         PayoutRequest?        @relation(fields: [payoutId], references: [id], onDelete: SetNull)
  createdAt      DateTime              @default(now())

  @@index([contributorId, status])
  @@index([payoutId])
}

/// §2 What a member can book or join: format, length, seats and an honest price.
model MentorOffering {
  id            String          @id @default(cuid())
  mentorId      String
  mentor        MentorProfile   @relation(fields: [mentorId], references: [id], onDelete: Cascade)
  eventKindId   String
  eventKind     EventKind       @relation(fields: [eventKindId], references: [id], onDelete: Restrict)
  /// One of the mentor's own categories; decides the disclaimer and whether the offering may be paid.
  categoryId    String?
  category      MentorCategory? @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  title         String
  /// At most 200 characters.
  summary       String
  descriptionMd String          @db.Text
  /// 15-240 minutes.
  durationMin   Int
  /// Exactly 1 for the one-to-one kind (core rule).
  capacity      Int             @default(1)
  /// Paise; null = free. A paid offering cannot be activated until revenue terms exist.
  priceCents    Int?
  currency      String          @default("INR")
  /// System-managed LIVE_EVENT product behind a paid offering.
  productId     String?         @unique
  product       Product?        @relation(fields: [productId], references: [id], onDelete: SetNull)
  active        Boolean         @default(false)
  isDemo        Boolean         @default(false)
  sortOrder     Int             @default(0)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  availabilityRules MentorAvailabilityRule[]
  events            LiveEvent[]

  @@index([mentorId, active])
}

/// §2 A mentor's recurring weekly availability in their own zone: the only source of
/// bookable slots, so availability is never invented.
model MentorAvailabilityRule {
  id          String          @id @default(cuid())
  mentorId    String
  mentor      MentorProfile   @relation(fields: [mentorId], references: [id], onDelete: Cascade)
  /// 0 = Sunday … 6 = Saturday, in `timezone`.
  weekday     Int
  /// Minutes of local wall time; 0 <= startMinute < endMinute <= 1440.
  startMinute Int
  endMinute   Int
  /// IANA zone the rule is written in.
  timezone    String
  /// Null = every offering.
  offeringId  String?
  offering    MentorOffering? @relation(fields: [offeringId], references: [id], onDelete: Cascade)
  /// Local dates in `timezone`.
  validFrom   DateTime?       @db.Date
  validUntil  DateTime?       @db.Date
  createdAt   DateTime        @default(now())

  @@index([mentorId])
}

/// §2 Dated changes to the weekly rules: time off, or extra one-off availability (UTC instants).
model MentorAvailabilityException {
  id        String                    @id @default(cuid())
  mentorId  String
  mentor    MentorProfile             @relation(fields: [mentorId], references: [id], onDelete: Cascade)
  kind      AvailabilityExceptionKind
  startsAt  DateTime
  endsAt    DateTime
  note      String?
  createdAt DateTime                  @default(now())

  @@index([mentorId, startsAt])
}

/// §2 A dated, mentor-led run of a course with its own members, sessions and channel.
model CourseCohort {
  id                 String       @id @default(cuid())
  courseId           String
  course             Course       @relation(fields: [courseId], references: [id], onDelete: Cascade)
  mentorInstructorId String
  mentor             Instructor   @relation(fields: [mentorInstructorId], references: [id], onDelete: Restrict)
  title              String
  startsOn           DateTime     @db.Date
  endsOn             DateTime?    @db.Date
  capacity           Int?
  status             CohortStatus @default(DRAFT)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  enrollments Enrollment[]
  channel     Channel?
  events      LiveEvent[]

  @@index([courseId, status])
}

/// §12 One review queue: contributor course submissions, edits to published courses by
/// authors without trustedAuthor, and contributor resources. Events, posts, projects,
/// opportunities, applications and partners keep their own status and join the admin
/// review inbox as a read model.
model ContentSubmission {
  id           String                  @id @default(cuid())
  type         ContentSubmissionType
  status       ContentSubmissionStatus @default(SUBMITTED)
  submitterId  String
  submitter    User                    @relation("ContentSubmitter", fields: [submitterId], references: [id], onDelete: Cascade)
  instructorId String
  instructor   Instructor              @relation(fields: [instructorId], references: [id], onDelete: Cascade)
  courseId     String?
  course       Course?                 @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lessonId     String?
  lesson       Lesson?                 @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  resourceId   String?
  resource     Resource?               @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  /// "course:<id>" | "lesson:<id>" | "resource:<id>": one open submission per target.
  targetKey    String
  /// The proposed change for COURSE_UPDATE.
  payload      Json?
  /// Author confirmations: rights, no guaranteed income, no investment advice, health disclaimer.
  checklist    Json
  /// publishProblems output at submission.
  autoChecks   Json?
  reviewerId   String?
  reviewer     User?                   @relation("ContentReviewer", fields: [reviewerId], references: [id], onDelete: SetNull)
  /// Shown to the submitter.
  reviewNote   String?
  submittedAt  DateTime                @default(now())
  decidedAt    DateTime?
  updatedAt    DateTime                @updatedAt

  @@index([status, type, submittedAt])
  @@index([instructorId, status])
}

/// §2/§6 A private ICS feed of a member's registrations and a host's events. Only the hash is stored.
model CalendarFeedToken {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash  String    @unique
  label      String?
  lastUsedAt DateTime?
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  @@index([userId])
}

// ============================================================
// 22. LIVE EVENTS  (directive §6, §2; LEAD #4)
// One family for everything scheduled and live. A mentor 1:1 is a
// LiveEvent of the one-to-one kind with one registration.
// Feedback is accepted only from an ATTENDED registration.
// ============================================================

/// §6
enum EventMode {
  ONE_TO_ONE
  GROUP
}

/// §6
enum LiveEventFormat {
  ONLINE
  IN_PERSON
  HYBRID
}

/// §6 "Live" and "ended" are derived from startsAt/endsAt, never stored.
enum LiveEventStatus {
  DRAFT
  /// Awaiting a decision: staff review of a public event, or the mentor's acceptance of a 1:1 request.
  SUBMITTED
  SCHEDULED
  COMPLETED
  CANCELLED
  ARCHIVED
}

/// §6
enum LiveEventVisibility {
  PUBLIC
  MEMBERS
  COURSE
  GROUP
  /// Mentor 1:1s: host, registrant and staff only. No slug.
  PRIVATE
}

/// §6
enum LiveEventHostRole {
  HOST
  CO_HOST
  GUEST_SPEAKER
}

/// §6/§2
enum EventRegistrationStatus {
  REQUESTED
  PENDING_PAYMENT
  REGISTERED
  WAITLISTED
  DECLINED
  CANCELLED
  ATTENDED
  NO_SHOW
  REFUNDED
}

/// §6
enum AttendanceSource {
  /// The member entered the event's check-in code.
  CODE
  /// The host or staff marked it.
  HOST
  /// The member opened the platform join link inside the join window.
  JOIN_LINK
  /// The member confirmed attendance after the event and the host did not dispute it within 7 days.
  MEMBER_CONFIRMED
  INTEGRATION
}

/// §6 Event kinds as data. Exactly one row has mode ONE_TO_ONE (slug "one-to-one",
/// inserted by migration); the others are seeded by seed-taxonomy.ts.
model EventKind {
  id          String    @id @default(cuid())
  slug        String    @unique
  name        String
  description String?
  /// Set at creation and never changed; LiveEvent.mode copies it.
  mode        EventMode @default(GROUP)
  academyId   String?
  academy     Academy?  @relation(fields: [academyId], references: [id], onDelete: SetNull)
  sortOrder   Int       @default(0)
  active      Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  events    LiveEvent[]
  offerings MentorOffering[]
  series    LiveEventSeries[]
  interests EventInterest[]
}

/// §6/§2 Every scheduled live thing: mentor 1:1s, group mentoring, workshops, masterclasses,
/// AMAs, live classes, meetups, founder sessions. Named LiveEvent because `events` is the
/// EventBus. Times are UTC; `timezone` is the host's zone for display.
model LiveEvent {
  id                      String              @id @default(cuid())
  /// Null for PRIVATE (1:1) events; required otherwise (CHECK).
  slug                    String?             @unique
  kindId                  String
  kind                    EventKind           @relation(fields: [kindId], references: [id], onDelete: Restrict)
  /// Copied from the kind at creation.
  mode                    EventMode
  title                   String
  summary                 String?
  descriptionMd           String              @db.Text
  format                  LiveEventFormat     @default(ONLINE)
  status                  LiveEventStatus     @default(DRAFT)
  visibility              LiveEventVisibility @default(MEMBERS)
  academyId               String?
  academy                 Academy?            @relation(fields: [academyId], references: [id], onDelete: SetNull)
  offeringId              String?
  offering                MentorOffering?     @relation(fields: [offeringId], references: [id], onDelete: SetNull)
  /// The mentor whose calendar this occupies (1:1s and mentor-hosted group events).
  mentorId                String?
  mentor                  MentorProfile?      @relation(fields: [mentorId], references: [id], onDelete: SetNull)
  courseId                String?
  course                  Course?             @relation(fields: [courseId], references: [id], onDelete: SetNull)
  cohortId                String?
  cohort                  CourseCohort?       @relation(fields: [cohortId], references: [id], onDelete: SetNull)
  groupId                 String?
  group                   CommunityGroup?     @relation(fields: [groupId], references: [id], onDelete: SetNull)
  challengeId             String?
  challenge               Challenge?          @relation(fields: [challengeId], references: [id], onDelete: SetNull)
  seriesId                String?
  series                  LiveEventSeries?    @relation(fields: [seriesId], references: [id], onDelete: SetNull)
  startsAt                DateTime
  endsAt                  DateTime
  /// IANA zone of the host, checked by isValidTimeZone.
  timezone                String
  registrationOpensAt     DateTime?
  registrationClosesAt    DateTime?
  /// Null = no limit.
  capacity                Int?
  /// Seats taken (REGISTERED, unexpired PENDING_PAYMENT, ATTENDED, NO_SHOW), kept in the registering transaction.
  registeredCount         Int                 @default(0)
  waitlistEnabled         Boolean             @default(true)
  /// Paise; null = free.
  priceCents              Int?
  currency                String              @default("INR")
  /// LIVE_EVENT product: one per paid group event; a 1:1 uses its offering's product.
  productId               String?
  product                 Product?            @relation(fields: [productId], references: [id], onDelete: SetNull)
  /// Derived label: zoom, meet, teams, youtube, jitsi, other.
  meetingProvider         String?
  /// Private: shown to confirmed registrants from linkRevealMinutes before the start.
  meetingUrl              String?
  /// Private, e.g. a passcode.
  meetingNote             String?
  linkRevealMinutes       Int                 @default(30)
  venueName               String?
  /// Registrants only.
  venueAddress            String?
  city                    String?
  country                 String?
  /// Short, rotatable check-in code.
  attendanceCode          String?
  attendanceCodeRotatedAt DateTime?
  coverImage              String?
  /// Shown to the host: why it was sent back or cancelled.
  statusReason            String?
  submittedAt             DateTime?
  reviewedAt              DateTime?
  reviewedById            String?
  reviewedBy              User?               @relation("LiveEventReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)
  publishedAt             DateTime?
  cancelledAt             DateTime?
  cancelReason            String?
  completedAt             DateTime?
  rescheduledAt           DateTime?
  /// ICS SEQUENCE, bumped on every time or status change.
  icsSequence             Int                 @default(0)
  isDemo                  Boolean             @default(false)
  createdById             String?
  createdBy               User?               @relation("LiveEventCreator", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt               DateTime            @default(now())
  updatedAt               DateTime            @updatedAt

  hosts         LiveEventHost[]
  registrations EventRegistration[]
  feedback      EventFeedback[]
  resources     Resource[]
  posts         Post[]

  @@index([status, startsAt])
  @@index([academyId, startsAt])
  @@index([kindId, startsAt])
  @@index([mentorId, startsAt])
  @@index([groupId, startsAt])
  @@index([productId])
}

/// §6 Who runs an event. Publishing needs at least one confirmed host; a guest speaker
/// without an account is named only after staff confirm them.
model LiveEventHost {
  id            String            @id @default(cuid())
  eventId       String
  event         LiveEvent         @relation(fields: [eventId], references: [id], onDelete: Cascade)
  role          LiveEventHostRole @default(HOST)
  userId        String?
  user          User?             @relation("LiveEventHostUser", fields: [userId], references: [id], onDelete: SetNull)
  instructorId  String?
  instructor    Instructor?       @relation(fields: [instructorId], references: [id], onDelete: SetNull)
  /// Snapshot shown on the event.
  displayName   String
  headline      String?
  avatarUrl     String?
  /// Set by staff, or by the host accepting in-app.
  confirmedAt   DateTime?
  confirmedById String?
  confirmedBy   User?             @relation("LiveEventHostConfirmer", fields: [confirmedById], references: [id], onDelete: SetNull)
  sortOrder     Int               @default(0)

  @@unique([eventId, userId])
  @@unique([eventId, instructorId])
  @@index([userId])
  @@index([instructorId])
}

/// §6/§2 A seat, a waitlist place or a 1:1 booking, and its attendance.
model EventRegistration {
  id                            String                  @id @default(cuid())
  eventId                       String
  event                         LiveEvent               @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId                        String
  user                          User                    @relation("EventRegistrant", fields: [userId], references: [id], onDelete: Cascade)
  status                        EventRegistrationStatus @default(REGISTERED)
  /// REQUESTED and PENDING_PAYMENT holds stop blocking the seat or slot once expired.
  holdExpiresAt                 DateTime?
  /// The member's private note to the host (1:1 agenda).
  agendaMd                      String?                 @db.Text
  /// The member ticked the category disclaimer on the booking form (categories with a disclaimer only).
  disclaimerAckAt               DateTime?
  registeredAt                  DateTime                @default(now())
  waitlistedAt                  DateTime?
  promotedAt                    DateTime?
  /// When a request was accepted or declined.
  decidedAt                     DateTime?
  cancelledAt                   DateTime?
  cancelledById                 String?
  cancelledBy                   User?                   @relation("EventRegistrationCanceller", fields: [cancelledById], references: [id], onDelete: SetNull)
  cancelReason                  String?
  /// First use of the join link.
  joinedAt                      DateTime?
  attendedAt                    DateTime?
  attendanceSource              AttendanceSource?
  markedById                    String?
  markedBy                      User?                   @relation("EventAttendanceMarker", fields: [markedById], references: [id], onDelete: SetNull)
  /// The member says they attended. Counts as attended (MEMBER_CONFIRMED) unless the host disputes within 7 days.
  memberConfirmedAt             DateTime?
  /// A member disputing a host NO_SHOW, or a host disputing a member's confirmation. Staff decide in
  /// /admin/mentors; feedback stays off public pages while a dispute is open.
  attendanceDisputedAt          DateTime?
  attendanceDisputedById        String?
  attendanceDisputedBy          User?                   @relation("EventAttendanceDisputer", fields: [attendanceDisputedById], references: [id], onDelete: SetNull)
  attendanceDisputeNote         String?
  attendanceDisputeResolvedAt   DateTime?
  attendanceDisputeResolvedById String?
  attendanceDisputeResolvedBy   User?                   @relation("EventAttendanceDisputeResolver", fields: [attendanceDisputeResolvedById], references: [id], onDelete: SetNull)
  updatedAt                     DateTime                @updatedAt

  feedback   EventFeedback?
  /// One PENDING or PAID order per registration, enforced under this row's lock in checkout; an expired
  /// hold's order stays for the record and a new attempt adds a new item.
  orderItems OrderItem[]
  earnings   ContributorEarning[]

  @@unique([eventId, userId])
  @@index([eventId, status, waitlistedAt])
  @@index([userId, status])
  @@index([attendanceDisputedAt])
}

/// §6/§2 Feedback from a verified attendee only (registration ATTENDED). Also the mentor review. Public only
/// when the host or check-in marked attendance, or memberConfirmedAt is over 7 days old with no dispute.
model EventFeedback {
  id             String            @id @default(cuid())
  registrationId String            @unique
  registration   EventRegistration @relation(fields: [registrationId], references: [id], onDelete: Cascade)
  eventId        String
  event          LiveEvent         @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId         String
  user           User              @relation("EventFeedbackAuthor", fields: [userId], references: [id], onDelete: Cascade)
  /// The host being reviewed (the mentor for a 1:1); feeds the expert profile's ratings.
  instructorId   String?
  instructor     Instructor?       @relation(fields: [instructorId], references: [id], onDelete: SetNull)
  /// 1-5.
  rating         Int
  body           String?           @db.Text
  /// Host and staff only.
  privateNote    String?           @db.Text
  /// May be quoted publicly only with this consent.
  publicConsent  Boolean           @default(false)
  hostReply      String?           @db.Text
  hostRepliedAt  DateTime?
  hidden         Boolean           @default(false)
  hiddenById     String?
  hiddenBy       User?             @relation("EventFeedbackHider", fields: [hiddenById], references: [id], onDelete: SetNull)
  hiddenReason   String?
  isDemo         Boolean           @default(false)
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  @@index([eventId, hidden])
  @@index([instructorId, hidden])
}

/// §6 A recurring programme on the open schedule. It never invents dates: each dated
/// session is its own LiveEvent, and cadenceNote is the owner's own wording.
model LiveEventSeries {
  id          String    @id @default(cuid())
  slug        String    @unique
  title       String
  description String    @db.Text
  academyId   String?
  academy     Academy?  @relation(fields: [academyId], references: [id], onDelete: SetNull)
  kindId      String
  kind        EventKind @relation(fields: [kindId], references: [id], onDelete: Restrict)
  /// e.g. "Fortnightly; dates announced once the host confirms".
  cadenceNote String?
  active      Boolean   @default(true)
  isDemo      Boolean   @default(false)
  createdById String?
  createdBy   User?     @relation("LiveEventSeriesCreator", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  events    LiveEvent[]
  interests EventInterest[]
}

/// §6/§2 "Tell me when": a member asks to hear when a matching real event or mentor slot is published.
model EventInterest {
  id         String           @id @default(cuid())
  userId     String
  user       User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  academyId  String?
  academy    Academy?         @relation(fields: [academyId], references: [id], onDelete: Cascade)
  kindId     String?
  kind       EventKind?       @relation(fields: [kindId], references: [id], onDelete: Cascade)
  seriesId   String?
  series     LiveEventSeries? @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  mentorId   String?
  mentor     MentorProfile?   @relation(fields: [mentorId], references: [id], onDelete: Cascade)
  /// "a:<academyId|*>|k:<kindId|*>|s:<seriesId|*>|m:<mentorId|*>", so uniqueness needs no NULLS NOT DISTINCT.
  scopeKey   String
  notifiedAt DateTime?
  createdAt  DateTime         @default(now())

  @@unique([userId, scopeKey])
  @@index([academyId])
  @@index([mentorId])
}

// ============================================================
// 23. DAILY ACTIVITY ENGINE  (directive §5, §11; LEAD #7, #16)
// Day keys come from memberDayKey (time/zoned.ts).
// ============================================================

/// §5
enum MissionCadence {
  ONCE
  DAILY
  WEEKLY
  MONTHLY
}

/// §5
enum MissionVerification {
  AUTO
  SELF_REPORT
  REVIEW
}

/// §5 The kind of practice a mission is.
enum MissionKind {
  LEARNING
  DISCIPLINE
  BUSINESS_EXERCISE
  FINANCIAL_LITERACY
  FITNESS
  MINDFULNESS
  COMMUNITY
  MENTOR
  EVENT
  OPPORTUNITY
}

/// §5
enum PlanSlot {
  LEARN
  PRACTICE
  COMMUNITY
  WEEKLY
  EXPLORE
}

/// §5
enum PlanItemKind {
  MISSION
  LESSON
  CHALLENGE
  DISCUSSION
  GOAL_CHECKIN
  STANDARD
  EVENT
  OPPORTUNITY
}

/// §5/§11
enum GoalMetric {
  /// Reported by the member, and labelled so.
  MANUAL
  LESSONS_COMPLETED
  COURSE_COMPLETED
  STANDARD_DAYS
  MISSIONS_COMPLETED
  CHALLENGES_COMPLETED
}

/// §5
enum GoalCadence {
  DAILY
  WEEKLY
}

/// §5/§11
enum GoalStatus {
  ACTIVE
  ACHIEVED
  PAUSED
  ABANDONED
}

/// §5/§9
enum GoalSource {
  MEMBER
  GUIDE_SUGGESTION
  ONBOARDING
}

/// §5
enum ChallengeKind {
  RULE
  DAILY_CHECKIN
  SUBMISSION
  GATED_SUBMISSIONS
}

/// §5/§3/§4
enum ChallengeScope {
  HOUSE
  ACADEMY
  GROUP
}

/// §5
enum ChallengeCadence {
  ONE_OFF
  WEEKLY
  MONTHLY
}

/// §5
enum EvidenceStatus {
  PENDING
  APPROVED
  REJECTED
  WITHDRAWN
}

/// §5/§11 The member's activities for one local day, generated once on first view.
model DailyPlan {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  /// memberDayKey: YYYY-MM-DD in the member's zone.
  dayKey    String   @db.VarChar(10)
  /// The zone used to compute dayKey.
  timezone  String
  /// e.g. "v1".
  algorithm String   @db.VarChar(20)
  createdAt DateTime @default(now())

  items DailyPlanItem[]

  @@unique([userId, dayKey])
  @@index([dayKey])
}

/// §5 One chosen activity with an honest reason. Done-state is derived from real rows.
model DailyPlanItem {
  id          String       @id @default(cuid())
  planId      String
  plan        DailyPlan    @relation(fields: [planId], references: [id], onDelete: Cascade)
  slot        PlanSlot
  kind        PlanItemKind
  /// Lesson, Challenge, CommunityPost, Goal, StandardItem, LiveEvent or Opportunity id; checked in core, no FK.
  refId       String
  missionId   String?
  mission     Mission?     @relation(fields: [missionId], references: [id], onDelete: SetNull)
  /// e.g. "Because you chose Marketing & sales".
  reason      String       @db.VarChar(160)
  position    Int
  swappedAt   DateTime?
  dismissedAt DateTime?

  @@unique([planId, slot, position])
  @@index([kind, refId])
}

/// §5/§9/§11 A personal goal, private by default; progress is derived from real rows.
model Goal {
  id          String       @id @default(cuid())
  userId      String
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  title       String       @db.VarChar(120)
  why         String?      @db.VarChar(500)
  academyId   String?
  academy     Academy?     @relation(fields: [academyId], references: [id], onDelete: SetNull)
  metric      GoalMetric
  courseId    String?
  course      Course?      @relation(fields: [courseId], references: [id], onDelete: SetNull)
  challengeId String?
  challenge   Challenge?   @relation(fields: [challengeId], references: [id], onDelete: SetNull)
  targetCount Int?
  /// For habits.
  cadence     GoalCadence?
  source      GoalSource   @default(MEMBER)
  startsOn    DateTime     @db.Date
  targetDate  DateTime?    @db.Date
  status      GoalStatus   @default(ACTIVE)
  achievedAt  DateTime?
  /// Shown on the profile only with this opt-in and when Profile.privacy allows "goals".
  isPublic    Boolean      @default(false)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  checkIns GoalCheckIn[]

  @@index([userId, status])
}

/// §5 A manual check-in on the member's day.
model GoalCheckIn {
  id        String   @id @default(cuid())
  goalId    String
  goal      Goal     @relation(fields: [goalId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  /// memberDayKey of the check-in.
  dayKey    String   @db.VarChar(10)
  value     Int      @default(1)
  note      String?  @db.VarChar(500)
  createdAt DateTime @default(now())

  @@unique([goalId, dayKey])
  @@index([userId, dayKey])
}

/// §5 One piece of evidence for a REVIEW mission or a SUBMISSION / GATED_SUBMISSIONS
/// challenge. Replaces ChallengeParticipation.progress.submissions (moved by migration).
model EvidenceSubmission {
  id              String                  @id @default(cuid())
  userId          String
  user            User                    @relation("EvidenceAuthor", fields: [userId], references: [id], onDelete: Cascade)
  missionId       String?
  mission         Mission?                @relation(fields: [missionId], references: [id], onDelete: Cascade)
  challengeId     String?
  challenge       Challenge?              @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  participationId String?
  participation   ChallengeParticipation? @relation(fields: [participationId], references: [id], onDelete: Cascade)
  /// Mission occurrence ("once", day key or "week:YYYY-MM-DD").
  occurrence      String?
  text            String                  @db.Text
  /// https only.
  url             String?
  status          EvidenceStatus          @default(PENDING)
  feedback        String?                 @db.Text
  reviewedById    String?
  reviewedBy      User?                   @relation("EvidenceReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)
  reviewedAt      DateTime?
  /// The JSON submission id a migrated row came from.
  legacyId        String?
  createdAt       DateTime                @default(now())
  updatedAt       DateTime                @updatedAt

  completion MissionCompletion?

  @@index([status, createdAt])
  @@index([challengeId, userId])
  @@index([missionId, userId])
}

// ============================================================
// 24. LIVE COMMUNITY  (directive §4)
// ============================================================

/// §4
enum CommunityPostKind {
  DISCUSSION
  QUESTION
  UPDATE
  INTRODUCTION
  PROJECT
  ANNOUNCEMENT
}

/// §4
enum GroupTopic {
  PROGRAMME
  BUSINESS
  FITNESS
  ENTREPRENEURSHIP
  PERSONAL_DEVELOPMENT
  TECHNOLOGY
  LOCAL
  OTHER
}

/// §4
enum GroupStatus {
  PENDING_REVIEW
  ACTIVE
  REJECTED
  ARCHIVED
}

/// §4
enum GroupJoinPolicy {
  OPEN
  APPROVAL
}

/// §4
enum GroupVisibility {
  /// Every signed-in member can read the group's posts (today's behaviour).
  MEMBERS
  GROUP_ONLY
}

/// §4
enum GroupRole {
  OWNER
  MODERATOR
  MEMBER
}

/// §4
enum GroupMemberStatus {
  PENDING
  /// Invited by an owner or moderator; ACTIVE only when the member accepts.
  INVITED
  ACTIVE
  BANNED
}

/// §4/§13
enum GroupNotifyLevel {
  ALL_POSTS
  ANNOUNCEMENTS
  NONE
}

/// §4 Following a member (mentors are members too). CHECK: no self-follow.
model Follow {
  followerId  String
  follower    User     @relation("Following", fields: [followerId], references: [id], onDelete: Cascade)
  followingId String
  following   User     @relation("Followers", fields: [followingId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())

  @@id([followerId, followingId])
  @@index([followingId, createdAt])
}

/// §4/§17 A block removes follows both ways, prevents re-following, and hides the
/// blocked member's activity and notices from the blocker. CHECK: no self-block.
model MemberBlock {
  blockerId String
  blocker   User     @relation("Blocker", fields: [blockerId], references: [id], onDelete: Cascade)
  blockedId String
  blocked   User     @relation("Blocked", fields: [blockedId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@id([blockerId, blockedId])
  @@index([blockedId])
}

/// §4 Saved posts (a project is saved through its discussion post).
model SavedPost {
  id        String        @id @default(cuid())
  userId    String
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  postId    String
  post      CommunityPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  createdAt DateTime      @default(now())

  @@unique([userId, postId])
  @@index([userId, createdAt])
}

// ============================================================
// 25. OPPORTUNITY MARKETPLACE  (directive §7; LEAD #3, #6)
// Organisations are Partners with their own review. Never promises
// income or employment.
// ============================================================

/// §7
enum PartnerKind {
  /// Tycoonhood itself (house opportunities, THC rewards). Created on first use, never seeded.
  HOUSE
  BUSINESS
  INDIVIDUAL
  NONPROFIT
  EDUCATION
}

/// §7
enum PartnerStatus {
  PENDING
  VERIFIED
  SUSPENDED
  REJECTED
}

/// §7
enum PartnerVerificationMethod {
  HOUSE
  DOMAIN_EMAIL
  BUSINESS_REGISTRATION
  GSTIN
  MANUAL
}

/// §7
enum PartnerMemberRole {
  OWNER
  EDITOR
}

/// §7 The directive's ten opportunity categories.
enum OpportunityKind {
  FREELANCE_PROJECT
  REMOTE_WORK
  INTERNSHIP
  CREATOR_COLLABORATION
  AFFILIATE_PROGRAMME
  BUSINESS_PARTNERSHIP
  DIGITAL_PRODUCT
  MARKETPLACE_SELLER
  SKILL_PROJECT
  COMMUNITY_COMPETITION
}

/// §7
enum WorkMode {
  REMOTE
  ONSITE
  HYBRID
}

/// §7
enum CompensationType {
  FIXED_FEE
  HOURLY
  STIPEND_MONTHLY
  SALARY_ANNUAL
  COMMISSION
  REVENUE_SHARE
  PRIZE
  THC_REWARD
  UNPAID
  TO_BE_DISCUSSED
}

/// §7
enum OpportunityApplyMode {
  IN_APP
  EXTERNAL_URL
  AFFILIATE_PROGRAMME
  CHALLENGE
}

/// §7
enum OpportunityStatus {
  DRAFT
  SUBMITTED
  OPEN
  PAUSED
  CLOSED
  FILLED
  REJECTED
  REMOVED
}

/// §7
enum OpportunityApplicationStatus {
  SUBMITTED
  VIEWED
  SHORTLISTED
  ACCEPTED
  DECLINED
  WITHDRAWN
  COMPLETED
}

/// §7 Contact details an applicant may share with a partner, one tick each.
enum ApplicantContactField {
  EMAIL
  PHONE
  PORTFOLIO
}

/// §7 An organisation or person that posts opportunities, with its own PENDING -> VERIFIED review.
model Partner {
  id                 String                     @id @default(cuid())
  slug               String                     @unique
  name               String
  kind               PartnerKind
  status             PartnerStatus              @default(PENDING)
  /// Shown to the partner.
  statusReason       String?
  reviewedAt         DateTime?
  reviewedById       String?
  reviewedBy         User?                      @relation("PartnerReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)
  verifiedAt         DateTime?
  verificationMethod PartnerVerificationMethod?
  /// Staff only.
  verificationNote   String?
  about              String                     @db.Text
  websiteUrl         String?
  logoUrl            String?
  city               String?
  country            String                     @default("IN")
  /// Private: staff only.
  contactEmail       String
  /// Private: staff only.
  registrationNumber String?
  termsVersion       String
  termsAcceptedAt    DateTime
  isDemo             Boolean                    @default(false)
  createdById        String?
  createdBy          User?                      @relation("PartnerCreator", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt          DateTime                   @default(now())
  updatedAt          DateTime                   @updatedAt

  members       PartnerMember[]
  opportunities Opportunity[]

  @@index([status, kind])
}

/// §7 Rights scoped to one partner (the partner dashboard). Partners are not a UserRole.
model PartnerMember {
  id          String            @id @default(cuid())
  partnerId   String
  partner     Partner           @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  userId      String
  user        User              @relation("PartnerMemberUser", fields: [userId], references: [id], onDelete: Cascade)
  role        PartnerMemberRole @default(EDITOR)
  invitedById String?
  invitedBy   User?             @relation("PartnerMemberInviter", fields: [invitedById], references: [id], onDelete: SetNull)
  createdAt   DateTime          @default(now())

  @@unique([partnerId, userId])
  @@index([userId])
}

/// §7 One listing in the opportunity marketplace.
model Opportunity {
  id                 String                   @id @default(cuid())
  slug               String                   @unique
  partnerId          String
  partner            Partner                  @relation(fields: [partnerId], references: [id], onDelete: Restrict)
  createdById        String?
  createdBy          User?                    @relation("OpportunityCreator", fields: [createdById], references: [id], onDelete: SetNull)
  kind               OpportunityKind
  title              String
  summary            String
  descriptionMd      String                   @db.Text
  academyId          String?
  academy            Academy?                 @relation(fields: [academyId], references: [id], onDelete: SetNull)
  workMode           WorkMode?
  location           String?
  /// e.g. "10 hours a week for 6 weeks".
  commitment         String?
  startsOn           DateTime?                @db.Date
  endsOn             DateTime?                @db.Date
  eligibilityMd      String                   @db.Text
  minLevel           Int?
  /// 18 by default for paid work.
  minAge             Int?
  /// A certificate in this course is required to apply.
  requiredCourseId   String?
  requiredCourse     Course?                  @relation(fields: [requiredCourseId], references: [id], onDelete: SetNull)
  compensationType   CompensationType
  /// Integer paise.
  compMinCents       Int?
  compMaxCents       Int?
  compCurrency       String                   @default("INR")
  commissionBps      Int?
  /// HOUSE partner only; never shown as money.
  thcReward          BigInt?
  /// Required, in plain words.
  compensationTerms  String                   @db.Text
  /// Null = rolling.
  applyBy            DateTime?
  openings           Int?
  applyMode          OpportunityApplyMode     @default(IN_APP)
  externalApplyUrl   String?
  applicationStepsMd String?                  @db.Text
  /// At most 5 {id, label, required}.
  questions          Json                     @default("[]")
  requiresPortfolio  Boolean                  @default(false)
  challengeId        String?
  challenge          Challenge?               @relation(fields: [challengeId], references: [id], onDelete: SetNull)
  status             OpportunityStatus        @default(DRAFT)
  statusReason       String?
  /// Fraud and income-promise checks that fired.
  riskFlags          String[]                 @default([])
  submittedAt        DateTime?
  reviewedAt         DateTime?
  reviewedById       String?
  reviewedBy         User?                    @relation("OpportunityReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)
  publishedAt        DateTime?
  closedAt           DateTime?
  featuredAt         DateTime?
  isDemo             Boolean                  @default(false)
  createdAt          DateTime                 @default(now())
  updatedAt          DateTime                 @updatedAt
  /// GENERATED ALWAYS AS (title A, summary B, descriptionMd C) STORED (raw SQL in 20261113000600). Never written.
  searchVector       Unsupported("tsvector")?

  skills       OpportunitySkill[]
  applications OpportunityApplication[]
  saves        SavedOpportunity[]

  @@index([status, kind, applyBy])
  @@index([partnerId, status])
  @@index([academyId, status])
  @@index([searchVector], type: Gin)
}

/// §7 Required and nice-to-have skills of a listing.
model OpportunitySkill {
  opportunityId String
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  skillId       String
  skill         Skill       @relation(fields: [skillId], references: [id], onDelete: Cascade)
  required      Boolean     @default(true)

  @@id([opportunityId, skillId])
  @@index([skillId])
}

/// §7 A member's application, and its status.
model OpportunityApplication {
  id              String                       @id @default(cuid())
  opportunityId   String
  opportunity     Opportunity                  @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  applicantId     String
  applicant       User                         @relation("OpportunityApplicant", fields: [applicantId], references: [id], onDelete: Cascade)
  status          OpportunityApplicationStatus @default(SUBMITTED)
  coverNote       String                       @db.Text
  answers         Json                         @default("{}")
  portfolioUrl    String?
  /// The contact fields the applicant ticked on this application; partners see only these.
  sharedFields    ApplicantContactField[]      @default([])
  /// When sharedFields was last set to a non-empty list.
  contactSharedAt DateTime?
  attestedAdultAt DateTime?
  /// Shown to the applicant.
  statusNote      String?
  /// Private to the partner and staff.
  partnerNote     String?
  /// Verified skills, certificates and verified projects at apply time.
  skillSnapshot   Json                         @default("{}")
  riskFlags       String[]                     @default([])
  decidedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime                     @default(now())
  updatedAt       DateTime                     @updatedAt

  events OpportunityApplicationEvent[]

  @@unique([opportunityId, applicantId])
  @@index([applicantId, status])
  @@index([opportunityId, status])
}

/// §7 The status timeline an applicant sees, and the trail of partner decisions.
model OpportunityApplicationEvent {
  id            String                        @id @default(cuid())
  applicationId String
  application   OpportunityApplication        @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  fromStatus    OpportunityApplicationStatus?
  toStatus      OpportunityApplicationStatus
  actorId       String?
  actor         User?                         @relation("OpportunityApplicationActor", fields: [actorId], references: [id], onDelete: SetNull)
  note          String?
  createdAt     DateTime                      @default(now())

  @@index([applicationId, createdAt])
}

/// §7 Saved opportunities (like WishlistItem).
model SavedOpportunity {
  id            String      @id @default(cuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  opportunityId String
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  createdAt     DateTime    @default(now())

  @@unique([userId, opportunityId])
  @@index([userId, createdAt])
}

// ============================================================
// 26. EDITORIAL ENGINE AND GUIDE  (directive §14, §15, §9; LEAD #11, #12)
// Post is the one editorial record. The Guide works without an LLM.
// ============================================================

/// §14
enum PostKind {
  ARTICLE
  LEARNING_INSIGHT
  FOUNDER_NOTE
  EXPERT_CONTRIBUTION
  ACADEMY_UPDATE
  SUCCESS_STORY
  BUSINESS_GUIDE
  WELLNESS_RESOURCE
  INTERVIEW
  EVENT_RECAP
  ANNOUNCEMENT
  PLATFORM_UPDATE
}

/// §14 A post is live when status is SCHEDULED or PUBLISHED and publishedAt <= now().
enum PostStatus {
  DRAFT
  IN_REVIEW
  CHANGES_REQUESTED
  SCHEDULED
  PUBLISHED
  ARCHIVED
}

/// §14/§17
enum ConsentSource {
  CONTACT_FORM
  WRITTEN
  IN_APP
}

/// §9/§14
enum HelpTopic {
  GETTING_STARTED
  LEARNING
  ACADEMIES
  MENTORS
  EVENTS
  OPPORTUNITIES
  THC
  EARN
  SHOP
  COMMUNITY
  ACCOUNT
  PRIVACY
}

/// §9/§14
enum HelpAudience {
  PUBLIC
  MEMBER
}

/// §9
enum GuideMode {
  /// Deterministic guide over real data; needs no LLM.
  GUIDED
  /// Optional LLM mode; only with an owner-supplied key and the member's consent.
  AI
}

/// §9
enum GuideRole {
  MEMBER
  /// The automated guide. Always labelled automated, never presented as a person.
  GUIDE
}

/// §9
enum GuideMessageKind {
  ANSWER
  NO_SOURCE
  REFUSAL
  INTENT_RESULT
  ERROR
}

/// §9
enum GuideFeedback {
  HELPFUL
  NOT_HELPFUL
  WRONG
}

/// §14 Edit history, written on every save of a draft and before publishing.
model PostRevision {
  id        String   @id @default(cuid())
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  title     String
  excerpt   String
  contentMd String   @db.Text
  editorId  String?
  editor    User?    @relation("PostRevisionEditor", fields: [editorId], references: [id], onDelete: SetNull)
  note      String?
  createdAt DateTime @default(now())

  @@index([postId, createdAt])
}

/// §14 Editorial categories (seed-taxonomy.ts).
model PostCategory {
  id          String    @id @default(cuid())
  slug        String    @unique
  name        String
  description String?
  sortOrder   Int       @default(0)
  archivedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  posts Post[]
}

/// §14 Free-form tags.
model Tag {
  id        String   @id @default(cuid())
  slug      String   @unique
  name      String
  createdAt DateTime @default(now())

  posts PostTag[]
}

/// §14
model PostTag {
  postId String
  post   Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
  tagId  String
  tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
  @@index([tagId])
}

/// §9/§14 FAQ and feature explanations as data: one source for /faq, the Guide and search.
model HelpArticle {
  id           String                   @id @default(cuid())
  slug         String                   @unique
  question     String
  answerMd     String                   @db.Text
  topic        HelpTopic
  audience     HelpAudience             @default(PUBLIC)
  sortOrder    Int                      @default(0)
  published    Boolean                  @default(true)
  /// GENERATED ALWAYS AS (question A, answerMd B) STORED (raw SQL in 20261113000700). Never written.
  searchVector Unsupported("tsvector")?
  updatedById  String?
  updatedBy    User?                    @relation("HelpArticleEditor", fields: [updatedById], references: [id], onDelete: SetNull)
  createdAt    DateTime                 @default(now())
  updatedAt    DateTime                 @updatedAt

  @@index([topic, published, sortOrder])
  @@index([searchVector], type: Gin)
}

/// §9 A member's own Guide thread. Only the member sees it; deletable.
model GuideConversation {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  /// The first question, clipped.
  title     String
  mode      GuideMode @default(GUIDED)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  messages GuideMessage[]

  @@index([userId, updatedAt])
}

/// §9 Questions and answers with sources, labelling, usage and feedback.
model GuideMessage {
  id              String            @id @default(cuid())
  conversationId  String
  conversation    GuideConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role            GuideRole
  body            String            @db.Text
  kind            GuideMessageKind  @default(ANSWER)
  intent          String?
  /// [{type, id, title, href, quote?}]; type: lesson|course|post|help|mission|challenge|goal|event|mentor|opportunity.
  sources         Json              @default("[]")
  /// True only for LLM-written text.
  aiGenerated     Boolean           @default(false)
  model           String?
  inputTokens     Int?
  outputTokens    Int?
  cacheReadTokens Int?
  stopReason      String?
  feedback        GuideFeedback?
  feedbackNote    String?
  flaggedAt       DateTime?
  reviewedAt      DateTime?
  reviewedById    String?
  reviewedBy      User?             @relation("GuideMessageReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)
  createdAt       DateTime          @default(now())

  @@index([conversationId, createdAt])
  @@index([feedback, createdAt])
}

/// §9 The daily question quota per member day (memberDayKey), in the database because the
/// in-memory limiter counts per instance.
model GuideUsage {
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  dayKey       String   @db.VarChar(10)
  questions    Int      @default(0)
  inputTokens  Int      @default(0)
  outputTokens Int      @default(0)
  updatedAt    DateTime @updatedAt

  @@id([userId, dayKey])
}
```
