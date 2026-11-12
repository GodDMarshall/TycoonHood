-- ============================================================================
-- MIGRATION REHEARSAL FIXTURES (throwaway databases only)
--
-- scripts/db/rehearse-migrations.mjs applies this file to an empty database
-- after the base migrations (before 20261113000000) and before the
-- living-ecosystem ones, so the backfills in those migrations have rows to
-- work on. The rehearsal then checks what the backfills made of each row
-- against data-model c.4.
--
-- The first block is the planning fixture file as it was reviewed. The
-- second adds the rows for the rest of c.4: academies, community, XP, orders,
-- rank awards, instructors, blog posts and the two privacy clean-ups. Never
-- apply it to a database anyone uses.
-- ============================================================================

-- Minimal rows that exercise the eco backfills (throwaway database only).
INSERT INTO "User" (id, email, role, "updatedAt") VALUES
 ('u1','u1@example.test','MEMBER',now()), ('u2','u2@example.test','MEMBER',now()), ('adm','adm@example.test','ADMIN',now());
INSERT INTO "Course" (id, slug, title, description, pillar, "updatedAt") VALUES
 ('c_w','warrior','Warrior','d','WARRIOR',now()), ('c_b','business-mastery','Business','d','BUILDER',now());
INSERT INTO "Enrollment" (id,"userId","courseId",status,"enrolledAt") VALUES
 ('e1','u1','c_w','ACTIVE','2026-10-01'), ('e2','u1','c_b','DROPPED','2026-10-02'), ('e3','u2','c_w','COMPLETED','2026-09-01');
INSERT INTO "Mission" (id, slug, name, description, criteria, repeatable, "cooldownHours") VALUES
 ('m1','first-lesson','First','d','{"event":"LESSON_COMPLETED"}',false,NULL),
 ('m2','daily-check-in','Show Up','d','{"event":"DAILY_ACTIVE"}',true,20),
 ('m3','weekly-five','Five','d','{"event":"LESSON_COMPLETED","within":"week","count":5}',true,NULL),
 ('m4','every-three-days','Three','d','{"event":"DAILY_ACTIVE"}',true,72);
INSERT INTO "MissionCompletion" (id,"userId","missionId","idempotencyKey","completedAt") VALUES
 ('mc1','u1','m1','mission:m1:u1:once','2026-11-01'),
 ('mc2','u1','m2','mission:m2:u1:2026-11-10','2026-11-10'),
 ('mc3','u2','m3','legacy-key-without-prefix','2026-11-03');
INSERT INTO "Challenge" (id, slug, name, description, criteria) VALUES
 ('ch1','launch-week','Launch','d','{"event":"GATED_SUBMISSIONS"}');
INSERT INTO "ChallengeParticipation" (id,"userId","challengeId",progress,"joinedAt") VALUES
 ('cp1','u1','ch1', jsonb_build_object('checkins', jsonb_build_array('2026-11-01'),'submissions', jsonb_build_array(
    jsonb_build_object('id','sub_a','text','First evidence','url','https://example.test/a','submittedAt','2026-11-02T10:00:00.000Z','status','APPROVED','feedback','Good','reviewedAt','2026-11-03T09:00:00.000Z','reviewedBy','adm'),
    jsonb_build_object('id','sub_b','text','Second evidence','submittedAt','2026-11-04T10:00:00.000Z','status','PENDING'),
    jsonb_build_object('id','sub_c','text','Third','submittedAt','2026-11-05T10:00:00.000Z','status','REJECTED','reviewedAt','2026-11-06T09:00:00.000Z','reviewedBy','gone-user'))),
  '2026-11-01');

-- ---------------------------------------------------------------------------
-- The rest of c.4
-- ---------------------------------------------------------------------------

-- Every programme course, so all four academies get their flagship, and a second
-- Warrior course u1 enrolled in earlier, so u1's membership takes the earliest date.
INSERT INTO "Course" (id, slug, title, description, pillar, "updatedAt") VALUES
 ('c_f','financial-planning-investment-advisory','Wealth','d','TYCOON',now()),
 ('c_m','mindfulness-wellness','Mind','d','MIND',now()),
 ('c_w2','warrior-basics','Warrior basics','d','WARRIOR',now());
-- u2 holds two programmes (warrior, completed; mindfulness, active), so joins both academies.
INSERT INTO "Enrollment" (id,"userId","courseId",status,"enrolledAt") VALUES
 ('e4','u2','c_m','ACTIVE','2026-09-05'),
 ('e5','u1','c_w2','ACTIVE','2026-09-20');

-- XP of four sources: lesson and course take the course's academy, a challenge its
-- challenge's, an admin grant none.
INSERT INTO "CourseModule" (id,"courseId",title) VALUES ('mod1','c_w','Module one');
INSERT INTO "Lesson" (id,"moduleId",title,type,"contentMd") VALUES ('les1','mod1','Lesson one','READING','The first lesson.');
INSERT INTO "Challenge" (id, slug, name, description, criteria, pillar, lifecycle) VALUES
 ('ch2','30-days-of-iron','Iron','d','{"event":"DAILY_CHECKIN","days":30}','WARRIOR','ACTIVE');
INSERT INTO "XpEvent" (id,"userId",amount,source,"sourceId","idempotencyKey") VALUES
 ('x1','u1',10,'LESSON_COMPLETED','les1','xp:lesson'),
 ('x2','u2',100,'COURSE_COMPLETED','c_w','xp:course'),
 ('x3','u2',50,'CHALLENGE_COMPLETED','ch2','xp:challenge'),
 ('x4','u2',5,'ADMIN_GRANT',NULL,'xp:grant');

-- A member with a rank, at level 4: the award records the level they held.
INSERT INTO "RankDefinition" (id, slug, name, "sortOrder", "minLevel") VALUES ('rk1','initiate','Initiate',1,1);
UPDATE "User" SET "rankId" = 'rk1', level = 4 WHERE id = 'u2';

-- Orders: THC paid by a ledger transaction; rupees with two order.paid rows (the
-- first wins); rupees settled by hand and since FULFILLED; one still pending.
INSERT INTO "LedgerTransaction" (id, reason, "idempotencyKey", "createdAt") VALUES
 ('tx1','PURCHASE','order:o1','2026-11-01 09:30:00');
INSERT INTO "Order" (id,"userId",status,"totalThc","ledgerTxId","createdAt","updatedAt") VALUES
 ('o1','u1','PAID',100,'tx1','2026-11-01 09:29:00',now());
INSERT INTO "Order" (id,"userId",status,"totalFiatCents","fiatCurrency","paymentProvider","createdAt","updatedAt") VALUES
 ('o2','u1','PAID',49900,'INR','razorpay','2026-11-02 10:00:00',now()),
 ('o3','u2','FULFILLED',29900,'INR','razorpay','2026-11-03 11:00:00',now()),
 ('o4','u2','PENDING',19900,'INR','razorpay','2026-11-04 09:00:00',now());
INSERT INTO "AuditLog" (id,"actorId",action,"targetType","targetId",meta,"createdAt") VALUES
 ('a1','u1','order.paid','order','o2','{"rail":"INR"}','2026-11-02 10:05:00'),
 ('a2',NULL,'order.paid','order','o2','{"rail":"INR"}','2026-11-02 10:09:00'),
 ('a3','adm','order.settle_manual','order','o3','{"from":"PENDING","to":"FULFILLED"}','2026-11-03 12:00:00');

-- Privacy: a referral that kept the raw signup address, a session with an unkeyed hash.
INSERT INTO "User" (id, email, role, "updatedAt") VALUES ('u3','u3@example.test','MEMBER',now());
INSERT INTO "Referral" (id,"referrerId","referredId",code,"signupIp") VALUES ('r1','u1','u3','CODE1','203.0.113.9');
INSERT INTO "Session" (id,"sessionToken","userId",expires,"ipHash") VALUES ('s1','tok1','u1',now() + interval '1 day','abc123');

-- Instructors: the founder, and another who is not.
INSERT INTO "Instructor" (id, slug, name, bio, "updatedAt") VALUES
 ('i_h','harsha','Harsha','Founder.',now()),
 ('i_g','guest-teacher','Guest Teacher','Teaches.',now());

-- Community: the pillar categories and the four with no academy; a programme group
-- with two members and a post; an empty programme group; a group and a category on
-- the archive list.
INSERT INTO "CommunityCategory" (id, slug, name) VALUES
 ('cat_warrior','warrior','Warrior'), ('cat_business','business','Business'),
 ('cat_money','money','Money'), ('cat_mind','mind','Mind'),
 ('cat_intro','introductions','Introductions'), ('cat_wins','wins','Wins'),
 ('cat_questions','questions','Questions'), ('cat_feedback','feedback','Feedback');
INSERT INTO "CommunityGroup" (id, slug, name, description, pillar) VALUES
 ('g_w','warrior-program','Warrior programme','d','WARRIOR'),
 ('g_m','mindfulness-wellness-program','Mind programme','d','MIND'),
 ('g_old','old-circle','Old circle','d',NULL);
INSERT INTO "GroupMembership" (id,"groupId","userId") VALUES ('gm1','g_w','u1'), ('gm2','g_w','u2');
INSERT INTO "CommunityPost" (id,"authorId","categoryId","groupId",title,body,"createdAt","updatedAt") VALUES
 ('p1','u1',NULL,'g_w','Group post','Body','2026-11-01 08:00:00',now()),
 ('p2','u1','cat_money',NULL,'Money post','Body','2026-11-02 08:00:00',now()),
 ('p3','u1','cat_intro',NULL,'Hi','Body','2026-10-01 08:00:00',now()),
 ('p4','u1','cat_intro',NULL,'Hi again','Body','2026-10-02 08:00:00',now());
INSERT INTO "CommunityComment" (id,"postId","authorId",body,state,"createdAt","updatedAt") VALUES
 ('cm1','p1','u2','Reply','VISIBLE','2026-11-05 08:00:00',now()),
 ('cm2','p1','u2','Hidden later reply','HIDDEN','2026-11-07 08:00:00',now());
INSERT INTO "SiteSetting" (key,value,"updatedAt") VALUES
 ('community.archived', '{"categories":["cat_feedback"],"groups":["g_old"]}', now());

-- Blog: three published (two about pillars), one scheduled about pillars, one draft.
INSERT INTO "Post" (id,slug,title,excerpt,"contentMd","publishedAt","updatedAt") VALUES
 ('bp1','the-four-pillars','The Four Pillars','Why four','The pillars of a balanced life.','2026-10-01 08:00:00',now()),
 ('bp2','pillars-in-practice','In practice','Daily work','Living the pillars every day.','2026-10-08 08:00:00',now()),
 ('bp3','money-basics','Money basics','Budgets','Start with a budget.','2026-10-15 08:00:00',now()),
 ('bp4','future-post','Coming soon','Soon','More on the pillars.',now() + interval '3 days',now()),
 ('bp5','draft-post','Draft','Ex','Body',NULL,now());
