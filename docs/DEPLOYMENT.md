# Deployment

Reference for running Tycoonhood in production. The step-by-step launch on the
`tycoonhood` Vercel project is [`LAUNCH.md`](../LAUNCH.md); what still needs the
owner is [`TYCOONHOOD_BLOCKED_ON_YOU.md`](../TYCOONHOOD_BLOCKED_ON_YOU.md).

## Requirements

- Node 22.12 or later (the Markdown sanitiser, sanitize-html 2.18, needs it; `.nvmrc` pins 22) and pnpm 9.
- PostgreSQL 16, managed (for example Neon, Supabase or RDS).
- A host for Next.js (for example Vercel, Railway or Render). `apps/web` is the only app you need. `apps/miner` only redirects.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string. On serverless hosts use the pooled one |
| `DATABASE_URL_UNPOOLED` | on Vercel | The direct connection. `scripts/vercel-build.sh` migrates and seeds over it; the Neon integration sets it |
| `NEXT_PUBLIC_SITE_URL` | yes | e.g. `https://tycoonhood.com`; used in emails, certificates and affiliate links |
| `RESEND_API_KEY`, `MAIL_FROM` | yes for launch | Without them, verification and reset emails are not sent in production |
| `AFFILIATE_HASH_SECRET` | yes | A long random string; salts the click hashes |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | for card payments | `rzp_test_…` gives test mode; `rzp_live_…` gives real money. In production, test keys offer card checkout to admins only |
| `RAZORPAY_WEBHOOK_SECRET` | strongly recommended | Lets the webhook confirm payments if the browser closes |
| `CRON_SECRET` | yes | A long random string. Vercel Cron sends it to `/api/cron/expire-orders` and `/api/cron/email-holds`, which refuse calls without it. See "Scheduled jobs" |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first run only | Used by `db:seed` to create the first admin. The password is set only when the account is created |
| `SEED_ON_DEPLOY` | first Vercel deploy only | `1` makes a production build run the seeds. Remove it after the first successful deploy |
| `ENABLE_EXPERIMENTAL_COREPACK` | on Vercel | `1` makes Vercel use the pnpm version pinned in `package.json` |
| `COOKIE_DOMAIN` | optional | Only if you serve several subdomains |
| `TRUSTED_PROXY_HOPS` | optional | How many proxies in front of the app add to `X-Forwarded-For`; per-IP limits read the address that many entries from the right. 1 to 5, default 1 (one proxy such as nginx, or Vercel). If the app is exposed directly with no proxy in front, visitors can set that header themselves, so IP-based limits can be spoofed |
| `DISCORD_*` | optional | Discord role sync |
| `DEV_MODE` | **never in production** | Must be unset or `false` in production. With `NODE_ENV=production` the sandbox and dev mailer are off regardless |
| `ALLOW_DEFAULT_ADMIN`, `ALLOW_TESTS_ON_THIS_DB` | **never in production** | Local only |

## Deploying on Vercel

The site is one Vercel project with Root Directory `apps/web` (files outside it
included) and Node 22.x. `apps/web/vercel.json` sets the install and build
commands, the function region and the daily cron. The build command runs
`scripts/vercel-build.sh` from the repository root:

1. On a **production** build (`VERCEL_ENV=production`) it applies pending
   migrations with `pnpm db:migrate:sql`, over `DATABASE_URL_UNPOOLED` when it
   is set. It stops the build if `DATABASE_URL` is missing, and, when
   `SEED_ON_DEPLOY=1`, if `ADMIN_EMAIL` or `ADMIN_PASSWORD` is missing, before
   it touches the database.
2. With `SEED_ON_DEPLOY=1` it then runs `db:seed`, `db:seed:academy`,
   `db:seed:content`, `seed:shop` and `seed:community`, in that order.
3. It builds the site.

**Preview builds never touch the database.** They are built from branches that
are not merged yet, and on this project they receive the same `DATABASE_URL`
as production. They are behind Vercel login, but a preview someone uses still
reads and writes the production database, so use previews to look, not to
test sign-ups or orders. A separate Neon branch for previews would remove this.

Functions run in `iad1`, the region of the Neon database: every page makes
several queries, so the functions belong next to the database. If the database
moves to Mumbai (`aws-ap-south-1`), change `regions` to `["bom1"]`.

A failed step fails the deploy, and the previous deployment stays live. A
migration that ran before a later step failed stays applied, and the previous
deployment then runs against it. So write each migration to be safe for the
code that is live before it: add tables and columns, and drop them only in a
later release.

The whole sequence was rehearsed on 12 November 2026 against an empty
PostgreSQL 16 database from a fresh clone with no `.env`: 12 migrations, the
five seeds and the build in 81 seconds, then a second run that changed
nothing, then `next start` serving the pages and the cron endpoint.

## First deploy on another host

```
pnpm install --frozen-lockfile
pnpm db:deploy                 # apply migrations
pnpm db:seed && pnpm db:seed:academy && pnpm db:seed:content
pnpm --filter @tycoonhood/db seed:shop
pnpm --filter @tycoonhood/db seed:community
pnpm build:web
pnpm --filter @tycoonhood/web start
```

Skip `db:seed:merch` unless you want the sample merch. Its prices and costs are placeholders.

## Upgrading a database that ran an earlier build

Run this once after deploying. In earlier builds, finishing a programme set to 0 XP marked it complete but stopped before the certificate, the "Program complete" notice, and the achievements and missions for finishing a programme. This script catches those up. It awards no completion XP, and running it again changes nothing.

```
pnpm --filter @tycoonhood/core exec tsx scripts/repair-course-completions.ts
```

## Turning on Razorpay

1. In the Razorpay dashboard, go to Settings → API Keys and generate **test** keys first.
2. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, then redeploy. If you can, do this test run on a preview or staging deployment rather than the public site.
   - Test payments move no money. So on any production build (`next build` and `next start`, which includes Vercel previews), card checkout is offered **only to admins**. Members see "Card payments are not available yet" and can still pay with THC. The server enforces this when an order is started, not just the page.
   - Checkout shows a "test mode" banner. Payments are recorded as TEST and excluded from revenue. A commission on a test order is flagged "do not pay out" and cannot be approved.
   - On a production build, a member's test-mode payment never completes an order, even one started before the keys were fenced. The order is cancelled, its stock goes back, and a refund request is queued for you to approve, which closes it. An admin's own test order goes through and can be shipped, so you can try the whole flow.
   - `pnpm preflight` warns while test keys are set in production.
   - On a local `next dev` run, test keys work for every account, as before.
3. In the Razorpay dashboard, go to Settings → Webhooks and add `https://<your-domain>/api/webhooks/razorpay`.
   - Events: `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, `refund.failed`.
   - Choose a secret and set the same value as `RAZORPAY_WEBHOOK_SECRET`.
   - A failed attempt (`payment.failed`) does not cancel the order. Razorpay lets the member retry on the same order, so it stays open until it is paid, the member cancels it, or its 30-minute hold runs out. Before cancelling an expired order, the app asks Razorpay about it. A paid order is confirmed instead. An order the member has started paying gets 30 more minutes.
   - A refund made in the Razorpay dashboard is counted when Razorpay confirms it (`refund.processed`). A partial refund leaves the order as it is, and a later refund from `/admin/refunds` sends only the rest. Once the whole payment is refunded, the order is marked refunded, unshipped stock goes back and any commission is reversed.
   - If Razorpay cannot complete a refund (`refund.failed`), `/admin/refunds` lists the payment until it is refunded again.
   - Live payments that an older version marked refunded may have been refunded only in part. `/admin/refunds` lists them under "Refunds to count" until you press "Check with Razorpay", which counts Razorpay's own record of their refunds. Live keys are needed.
4. Signed in as an admin, buy something with a Razorpay test card. Check that the order shows Paid in `/admin/orders`, then refund it there with Refund. Members can ask for a refund within 14 days; staff can refund any paid order from `/admin/orders` at any time.
5. When KYC is approved, swap in the `rzp_live_…` keys and the live webhook secret. From then on every member sees card checkout, and real money flows.
   - A test payment taken before the swap can still be refunded from `/admin/refunds`. It is marked refunded without calling Razorpay, because no money moved.

## Scheduled jobs

`apps/web/vercel.json` calls two routes once a day:

- `/api/cron/expire-orders` ends unpaid rupee orders whose 30-minute hold has run out, so their stock and coupon uses go back even when nobody is browsing the shop.
- `/api/cron/email-holds` puts back email changes whose undo notice never went out. A change takes effect before the notice to the old address is sent; if the request dies before it can send it or put the change back, this puts the change back once it is 10 minutes old.

- Set `CRON_SECRET` on the site project. Vercel sends it with each call as `Authorization: Bearer <CRON_SECRET>`, and both routes refuse any call without it. Another scheduler can call the same URLs with the same header.
- Once a day works on every Vercel plan. Hobby refuses to deploy a cron that runs more often. On Pro you can run them every 10 minutes by changing a schedule to `*/10 * * * *`, or point an external scheduler at the URLs.
- The store, product, cart, wishlist, checkout and admin order pages also run the order sweep when they load, at most once a minute per server, and checkout always releases the member's own expired holds first. So between the daily runs, an expired hold goes back within about a minute of someone browsing the shop.
- The email sweep also runs, for what it touches, before a member's next email change request, before a reset request for either address, and on the admin member page. So an owner who was told nothing and asks for a reset link gets the account back with it.

## Before launch

- Set real INR prices and landed costs for every product. The seeded values are placeholders and are marked as such in the seed output.
- Have the Terms, Privacy, Refund policy, Earn terms and the "Financial Planning & Investment" programme name reviewed by a lawyer. The last one needs this because of the SEBI investment-adviser rules.
- Have Harsha review the About page copy.
- Change the seeded admin password, or create your admin and remove `ADMIN_PASSWORD` from the environment.
- Run `pnpm preflight` against the production environment. It checks for unsafe flags.
