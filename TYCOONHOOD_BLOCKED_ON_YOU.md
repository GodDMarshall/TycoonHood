# BLOCKED ON YOU

**Updated 12 November 2026, for the launch on 13 November.**

These need you: an account, a credential, a document or a decision only the
owner can make. Each says what happens if you leave it. The steps are in
[`LAUNCH.md`](LAUNCH.md).

## Needed for launch

### 1. Admin account in Vercel
Add `ADMIN_EMAIL` and `ADMIN_PASSWORD` (Production, Sensitive) to the
`tycoonhood` Vercel project.

**If you leave it:** the first production deploy stops before it touches
the database, says why, and the site does not go live.

### 2. Your domain
Add it in Vercel → Domains (or tell Claude which one), set its DNS records at
your registrar, and set `NEXT_PUBLIC_SITE_URL` to it.

**If you leave it:** the site works, but only behind a Vercel login, because
every `*.vercel.app` address is protected.

### 3. Email (Resend)
Verify your domain in Resend, then add `RESEND_API_KEY` and `MAIL_FROM`.

**If you leave it:** sign-up, learning, certificates, community and THC all
work. Email confirmation, password reset and the email-change undo link do
not, and members cannot join the affiliate programme without a confirmed
email. Pages say this honestly.

## Needed before taking money

### 4. Razorpay KYC
Card checkout stays off until KYC is approved and keys are set. Members can
still use everything that is free and spend THC. Steps: "Turning on Razorpay"
in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

### 5. Legal review
A lawyer should read the Terms, Privacy policy, Refund policy and Earn terms.
The programme name **"Financial Planning & Investment"** needs a specific look
because of the SEBI investment-adviser rules: the lessons teach and do not
advise, but the name matters too.

**If you leave it:** fine for a free launch; not fine once strangers pay.

### 6. Real merch prices and costs
The five merch items (Warrior Hoodie, Operator Tee, Nano Chalk, Lifting
Straps, The Ledger) have placeholder rupee prices and landed costs. They stay
in draft and hidden until you set real numbers in `/admin/products` and
publish them. The deploy never seeds them.

## Needed soon after launch

### 7. Harsha's review of the About page
The founder page uses the real photo and copy written from the brief. Harsha
should read it before it is promoted.

### 8. Plans that fit a business
- **Vercel:** Hobby is for non-commercial use only. Check the team's plan; a
  business site needs Pro.
- **Neon:** the Free plan has 100 compute-hours a month. Upgrade before
  traffic is steady.

### 9. A real GPU check of the 3D campus
`/world` is optional and has a 2D page. It was tested in Chromium's software
renderer, never on real graphics hardware. Open it once on a desktop with a
real GPU and on a phone (the phone should get the 2D page).

### 10. YouTube videos for watch-to-earn
Mining tasks with videos need your real YouTube links, added in
`/admin/videos`. Claude never invents video IDs: a wrong ID pays members for
watching someone else's channel.

### 11. Who teaches as Harsha
The four house programmes are taught as the instructor profile "Harsha",
which is not linked to any account. An Instructor account edits only the
programmes of the profile linked to it, and only while they are drafts
(DR-34; see item 12). To let someone else work on Harsha's programmes, give
their account the Instructor role, then link it under Admin → Courses →
Instructors by its email or username. Their email must be verified first:
an account that has not verified its email cannot be linked. Check the name,
role and email the page shows before you rely on the link. They can then
open the four house programmes and draft new ones as Harsha, but the four
are published, so changes to them still go through an administrator.

**If you leave it:** nothing breaks. Administrators edit the programmes, and
an instructor sees none to edit.

### 12. How an instructor changes a published programme
Today only an administrator changes a programme once it is published or
archived (DR-34). An instructor edits their own programmes while they are
drafts. Once one is published, they can open it but not change it, and the
page says why. They ask an administrator to make the change, or to move the
programme back to draft while they edit (members cannot see it until it is
published again). This is the strict choice: it keeps "Admin approval"
(directive §12) for everything members, visitors, the leaderboard and
certificates see. You can choose instead:
- **Reviewed revisions:** an instructor's changes to a live programme wait
  as a revision until an administrator approves it. This is the
  "Content review" of directive §12, and it needs building.
- **Live content edits:** an instructor changes lesson text, videos, quiz
  questions and resources live, but XP values, previews, titles, slugs and
  the final assessment stay with administrators, and administrators see the
  edits. Scam or affiliate links in lessons would go live unreviewed.

**If you leave it:** nothing an instructor writes reaches members, the
public, the leaderboard or a certificate until an administrator publishes
it. An instructor cannot fix even a typo in a published programme
themselves.

## Decisions you can overrule at any time

The economy constants (THC rewards, affiliate rate, hold days, minimum payout)
live in `packages/config/src/index.ts` with the reasoning next to them. The
recorded decisions are in [`TYCOONHOOD_DECISIONS.md`](TYCOONHOOD_DECISIONS.md).
Overturn any of them and the code changes; nothing here needs an answer to
launch.
