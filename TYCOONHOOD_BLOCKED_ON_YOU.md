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

Once email works, sign in as the admin and confirm its address from the
banner (`LAUNCH.md`, step 5). The deploy leaves it unconfirmed, and until it
is confirmed, a change away from it gets no undo link.

### 2. Your domain
Add it in Vercel → Domains (or tell Claude which one), set its DNS records at
your registrar, and set `NEXT_PUBLIC_SITE_URL` to it.

**If you leave it:** the site works, but only behind a Vercel login, because
every `*.vercel.app` address is protected.

### 3. Email (Resend)
Verify your domain in Resend, then add `RESEND_API_KEY` and `MAIL_FROM`.

**If you leave it:** sign-up, learning, certificates, community and THC all
work. Email confirmation, password reset and email changes do not (with no
email, Settings refuses a change, because its link could never arrive), and
members cannot join the affiliate programme without a confirmed email. Pages
say this honestly.

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

## Decisions you can overrule at any time

The economy constants (THC rewards, affiliate rate, hold days, minimum payout)
live in `packages/config/src/index.ts` with the reasoning next to them. The
recorded decisions are in [`TYCOONHOOD_DECISIONS.md`](TYCOONHOOD_DECISIONS.md).
Overturn any of them and the code changes; nothing here needs an answer to
launch.
