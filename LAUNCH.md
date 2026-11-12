# LAUNCH

How Tycoonhood goes live on Vercel. Last updated 12 November 2026.

The site runs as **one Vercel project**, `tycoonhood` in the `pharmacartel`
team, built from `apps/web`. The database is **Neon**, connected through the
Vercel Marketplace. A production deploy migrates the database by itself, and
the first one also fills it with the programmes and content.

Run-through, once the four steps marked **You** are done: about 15 minutes,
most of it the first build.

---

## Already done

These are set on the Vercel project. Nothing here needs you.

| What | Setting |
|---|---|
| Root Directory | `apps/web`, with files outside it included (the monorepo packages) |
| Framework, Node | Next.js, Node 22.x |
| Build | `apps/web/vercel.json` → `scripts/vercel-build.sh` (see "What a deploy does") |
| Function region | `iad1` (Washington), the same region as the database |
| Database | Neon store `neon-beige-kite`, region `iad1`, Free plan. The integration supplies `DATABASE_URL` (pooled, used by the site) and `DATABASE_URL_UNPOOLED` (direct, used for migrations and seeds) |
| `AFFILIATE_HASH_SECRET` | Generated, sensitive. Salts the hashes of affiliate clicks |
| `CRON_SECRET` | Generated, sensitive. The daily order sweep (`/api/cron/expire-orders`) refuses calls without it |
| `SEED_ON_DEPLOY=1` | First launch only. Remove it after the first successful production deploy |
| `ENABLE_EXPERIMENTAL_COREPACK=1` | Makes Vercel use the exact pnpm version in `package.json` |

`NEXT_PUBLIC_SITE_URL` was already set on the project. It must be your real
address (step 3).

---

## 1 · You: the admin account (2 min)

Vercel → `tycoonhood` → Settings → Environment Variables → add, for
**Production**, as **Sensitive**:

```
ADMIN_EMAIL     = the email you will sign in with
ADMIN_PASSWORD  = a long password from a password manager (12+ characters)
```

The first production deploy creates this admin account. **Without these two
the deploy stops before it touches the database**, with a message saying so,
and nothing goes live. Never paste the password into a chat or a commit.

Type the address in any case you like. It is stored the way sign-in reads it,
trimmed and in lower case.

`ADMIN_EMAIL` only makes the first admin. Changing it later creates no second
admin while you can sign in: add admins in `/admin/members` instead.

After launch you can delete `ADMIN_PASSWORD` from Vercel. The seed only sets
the password when it creates the account, so a later deploy never resets it.

## 2 · You: email (10 min, plus DNS time)

Without email, members can still sign up, learn, earn certificates, use the
community and THC. What does not work: confirming an email address (needed to
join the affiliate programme), password reset, and the email-change undo link.
The site says so plainly instead of pretending an email was sent.

1. In Resend (resend.com), add your domain and create the DNS records it shows
   you at your domain registrar.
2. Wait for Resend to show the domain as verified.
3. Create an API key.
4. Add, for **Production**, as **Sensitive**:

```
RESEND_API_KEY  = the key from Resend
MAIL_FROM       = Tycoonhood <no-reply@yourdomain.com>
```

`MAIL_FROM` must use the domain you verified.

## 3 · You: the domain (5 min, plus DNS time)

1. Vercel → `tycoonhood` → Settings → Domains → add `yourdomain.com` and
   `www.yourdomain.com`, and set the DNS records Vercel shows at your
   registrar. (Or tell Claude the domain, and it adds it to the project; the
   DNS records are still yours to set.)
2. Set `NEXT_PUBLIC_SITE_URL = https://yourdomain.com` for **Production**.
   Emails, certificates, affiliate links and the sitemap use it, and it is
   built into the site, so it needs a redeploy after any change.

**Until a custom domain is added, the site is not public.** The project's
Deployment Protection is "Standard Protection": every `*.vercel.app` address,
production included, asks for a Vercel login. That is on purpose, so nobody
stumbles on the site early. A custom domain is public as soon as it resolves.

## 4 · You: merge the pull request

Merging `build/full-platform` into `main` starts the production deploy.

## What a deploy does

`scripts/vercel-build.sh` runs on every Vercel build:

- **Production** (`VERCEL_ENV=production`):
  1. takes the deploy lock: if another build is migrating or seeding the
     same database, it says so and waits for it to finish;
  2. applies any pending migrations over the direct connection;
  3. if `SEED_ON_DEPLOY=1`: runs the seeds, in order (base and admin,
     academy, content, shop, community);
  4. lets go of the lock and builds the site.
- **Preview** (any other branch): builds the site only. **A preview never
  touches the database.**

Any failure stops the deploy, and the last good deployment stays live.

Two production builds can run at once, for example when you redeploy while
one is still building. The second waits at step 1, then finds the migrations
applied and nothing left for the seeds to add.

Every seed is safe to run again on the live database. A re-run adds what is
missing and never rewrites what staff can change in the admin: prices, stock,
what is on sale, programmes and their lessons, essays, missions, community
categories and groups, coupons, a challenge's dates and status, passwords,
and roles (unless no admin can sign in). It only refreshes what no admin
screen edits: levels, ranks, achievements, and a challenge's name,
description and rewards.
`SEED_ON_DEPLOY` still comes off after the first deploy, because a re-run
brings back a seeded item staff deleted. `docs/DEPLOYMENT.md`, "Running the
seeds again", has the details. `seed:merch` is never run by a deploy: its
prices are placeholders.

## 5 · After the first deploy (10 min)

1. Delete `SEED_ON_DEPLOY` from the Vercel environment variables.
2. Check it yourself, as a stranger would:
   - [ ] The home page, About (Harsha), the four programmes, Earn and the
         policy pages load on your domain.
   - [ ] Create an account with an email you own. Onboarding works and you
         land on Today.
   - [ ] With Resend set: the confirmation email arrives and its link works;
         sign out, use "Forgot password", and that email arrives too.
   - [ ] Enrol in a programme, finish a lesson, pass its quiz. XP rises.
   - [ ] `/admin` opens for your admin account and refuses everyone else.
   - [ ] Do the sign-up again on your phone.
3. Delete the test account you made, or suspend it in `/admin/members`.

## Card payments (when Razorpay KYC clears)

Until then the site takes no rupee payments: card checkout is hidden from
members, and everything else works. When KYC is approved, follow
"Turning on Razorpay" in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): test keys
first (admins only on a production build), then live keys and the webhook.

Merch stays in draft until it has real rupee prices and landed costs
(`/admin/products`).

---

## Limits to know about

- **Neon Free plan:** 100 compute-hours a month per project, and the database
  sleeps when idle, so the first request after a quiet spell is slower. Steady
  traffic can use up the hours; upgrade to a paid Neon plan before a marketing
  push.
- **Vercel plan:** Hobby is for non-commercial use only. A business site
  needs Pro. Hobby also allows the order sweep to run once a day, not more.
- **Region:** the database and the functions are in Washington (`iad1`), so
  pages reach India in roughly a quarter of a second more than they would
  from Mumbai. Moving both to Mumbai (`bom1`, Neon `aws-ap-south-1`) is a
  follow-up, not a launch blocker.
- **Previews share the database settings.** Preview deployments receive the
  same `DATABASE_URL` as production. They never migrate or seed, and they are
  behind Vercel login, but a preview built from an unmerged branch reads and
  writes the production database when someone uses it. Use previews to look,
  not to test sign-ups or orders. A separate Neon branch for previews removes
  this.

## Rolling back

Vercel keeps every deployment: Deployments → the previous one → **Instant
Rollback** takes seconds.

Migrations do not roll back. Neon keeps point-in-time history (the window
depends on the plan), so restore from there before any risky change to a
database with real members in it.
