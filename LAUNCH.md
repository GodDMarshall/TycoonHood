# LAUNCH

Everything in this file is a step you take. I cannot do any of it: it needs
accounts that are yours — a database host, a hosting account, a domain, a
mail provider. What I have done is make each step short and make the platform
refuse to launch unsafely.

**Time: about 45 minutes**, most of it waiting for DNS.

Run `pnpm preflight` at the end. It reads the real production environment and
the real production database and tells you plainly whether to go. It exits
non-zero on anything that would hurt a member or the business.

---

## Before you start

You need four accounts. All have a free tier that is enough to open with.

| What | Why | Free tier |
|---|---|---|
| **Neon** (neon.tech) | Postgres. Serverless, scales to zero. | Yes |
| **Vercel** (vercel.com) | Hosting for both apps. | Yes |
| **Resend** (resend.com) | Password-reset email. Without it, a member who forgets their password is locked out for good. | 3,000/month |
| A domain | `tycoonhood.com` or whatever you own. | No — ~$12/yr |

Stripe is **optional**. Without it the card rail is hidden and everything is
bought with THC. That is a legitimate way to open.

---

## 1 · The database (5 min)

1. Create a Neon project. Region: **Singapore** or **Mumbai** — closest to you and to most early members.
2. Copy **two** connection strings from the dashboard:
   - the **pooled** one → this is `DATABASE_URL` for the apps
   - the **direct** one → used once, for migrations
3. Locally, put the **direct** string in `.env` and run:

```powershell
pnpm db:migrate:sql
```

That applies all seven migrations with the engine-free runner. Do **not** use
`prisma migrate deploy` — it downloads a binary that is blocked in several
environments, and the build has no database anyway.

## 2 · Seed the content (2 min)

Still pointed at the production database:

```powershell
$env:ADMIN_EMAIL    = "you@yourdomain.com"
$env:ADMIN_PASSWORD = "<a long password you generate, not one you invent>"
pnpm db:seed
pnpm db:seed:academy
pnpm db:seed:content
pnpm db:seed:merch
```

The seed **refuses** to run without `ADMIN_PASSWORD`. That is deliberate: the
built-in development password is printed in this repository and on GitHub.
Never set `ALLOW_DEFAULT_ADMIN` against a real database.

Merch seeds as **drafts**. Publish it in `/admin/products` once the real
landed costs are in — see `TYCOONHOOD_BLOCKED_ON_YOU.md` item 1.

## 3 · Email (5 min)

1. Add your domain in Resend and set the DNS records it gives you.
2. Create an API key.
3. Keep both for step 5: `RESEND_API_KEY` and `MAIL_FROM` (e.g. `Tycoonhood <no-reply@tycoonhood.com>`).

Skip this and password reset is dead. The platform says so honestly on the
page rather than pretending — but a member who forgets their password has no
way back in.

## 4 · Two Vercel projects, not one (10 min)

This monorepo ships **two apps**. They are two Vercel projects from the same
repository. Deploying only the root gives you the site and silently leaves the
Miner behind — the root `vercel.json` now fails loudly rather than let that
happen.

**Project A — the site**
- Import the repository
- **Root Directory:** `apps/web`
- Framework: Next.js (detected)
- Domain: `tycoonhood.com` and `www.tycoonhood.com`

**Project B — the Miner**
- Import the same repository again
- **Root Directory:** `apps/miner`
- Domain: `miner.tycoonhood.com`

Build and install commands come from each app's `vercel.json`. Leave the
Vercel UI fields empty.

## 5 · Environment variables (10 min)

Set these on **both** projects unless noted. Vercel → Settings → Environment
Variables → Production.

```
DATABASE_URL              = <the POOLED Neon string>
NEXT_PUBLIC_SITE_URL      = https://tycoonhood.com
NEXT_PUBLIC_MINER_URL     = https://miner.tycoonhood.com
NEXT_PUBLIC_MAIN_SITE_URL = https://tycoonhood.com
COOKIE_DOMAIN             = .tycoonhood.com
```

Site project only:

```
RESEND_API_KEY            = <from step 3>
MAIL_FROM                 = Tycoonhood <no-reply@tycoonhood.com>
```

**Do not set** `DEV_MODE`. **Do not set** `ALLOW_DEFAULT_ADMIN`. The code
refuses to honour them in production, but they should not be there at all.

`COOKIE_DOMAIN` is the one people get wrong. The leading dot matters: without
it, signing in on the site does not sign you in on the Miner, and the two apps
feel like two products.

## 6 · Preflight (2 min)

Point your local `.env` at the **production** database and run:

```powershell
$env:NODE_ENV = "production"
pnpm preflight
```

It checks the environment, the migrations, the admin password, whether the
books balance, whether there is anything to actually do on day one, and
whether the legal pages exist. Read every warning. Do not launch on a failure.

## 7 · Deploy, then check it yourself (10 min)

Push to `main`. Both projects build. Then, as a stranger would:

- [ ] `https://tycoonhood.com` loads, and the open-books figures are real
- [ ] Create an account with an email you own. You get onboarded and paid.
- [ ] Sign out, click **forgot password**, and the email actually arrives
- [ ] `https://miner.tycoonhood.com` — **you are already signed in.** If not, `COOKIE_DOMAIN` is wrong.
- [ ] Claim from the rig. The wallet moves.
- [ ] `/admin` works for you and **redirects everyone else**
- [ ] Open the site on your phone and go through signup again

Then change your own admin password from the one in step 2, and delete the
test account you just made.

---

## Rolling back

Vercel keeps every deployment. **Instant Rollback** on the previous one takes
about ten seconds.

Migrations are the part that does not roll back. Never run a migration that
drops a column against a database with real members in it without a backup
taken first — Neon's point-in-time restore is the backup, and it is on by
default.

---

## What you are launching with, stated plainly

| Works | Does not exist yet |
|---|---|
| Accounts, sessions, password reset | Membership tiers and subscriptions — **the business model** |
| The Academy: 4 courses, 24 lessons, quizzes, certificates | Course authoring in the admin (content is seeded by script) |
| Challenges with evidence review | Challenge authoring in the admin |
| XP, levels, ranks, streaks, achievements, missions | Analytics beyond the economy overview |
| The full THC ledger, provable supply | The AI layer |
| The Miner: rig, watch-to-earn, referrals, ranks, wallet | Telegram |
| Merch with sizes, stock, addresses, tracking | Mobile navigation on the main site |
| Admin: members, economy, content, missions, products, videos, orders | |

The honest summary: **you can open, and people can join, learn, earn and buy.
You cannot yet charge a subscription, and you cannot write a lesson without a
developer.** Those two are the top of `TYCOONHOOD_ROADMAP.md`.

---

## Before you take money from a stranger

`TYCOONHOOD_BLOCKED_ON_YOU.md` has the full list. The two that matter most:

1. **Real landed costs** on the five merch products. Until then they stay
   drafts and the margin reporting is fiction.
2. **Legal review.** `/terms` and `/privacy` exist and are accurate about what
   the platform actually does — I wrote them against the schema, not from a
   template — but they carry a visible banner saying no lawyer has read them.
   Get that banner removed before you are taking real money at scale.

And the one that is pure risk, unrelated to launch: **this project is still
not under version control.** `.gitignore` and `.gitattributes` are written and
waiting. One bad save currently loses work with no way back.
