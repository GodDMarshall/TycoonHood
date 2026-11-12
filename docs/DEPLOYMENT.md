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
| `DATABASE_URL_UNPOOLED` | on Vercel | The direct connection to the same database as `DATABASE_URL`. `scripts/vercel-build.sh` migrates and seeds over it and holds the deploy lock on it; the Neon integration sets it. Migrations and the deploy lock refuse Neon's pooled address, so where this is not set, `DATABASE_URL` must be the direct connection when you migrate. If the two name different databases, the build, `pnpm deploy:db` and `pnpm db:migrate:sql` stop before they connect. A value in `.env` never replaces one set in your shell, so check both there too |
| `NEXT_PUBLIC_SITE_URL` | yes | e.g. `https://tycoonhood.com`; used in emails, certificates and affiliate links |
| `RESEND_API_KEY`, `MAIL_FROM` | yes for launch | Without them, verification and reset emails are not sent in production |
| `AFFILIATE_HASH_SECRET` | yes | A long random string; salts the click hashes |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | for card payments | `rzp_test_…` gives test mode; `rzp_live_…` gives real money. In production, test keys offer card checkout to admins only |
| `RAZORPAY_WEBHOOK_SECRET` | strongly recommended | Lets the webhook confirm payments if the browser closes |
| `CRON_SECRET` | yes | A long random string. Vercel Cron sends it to `/api/cron/expire-orders` and `/api/cron/email-holds`, which refuse calls without it. See "Scheduled jobs" |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first run only | Used by `db:seed` to create the first admin. The address is stored trimmed and in lower case, the way sign-in reads it, so any capitalisation finds the same account. It must be an address sign-in accepts, entered without quote marks: otherwise the deploy stops before it touches the database. The password is set only when the account is created. Once an admin can sign in, the seed makes no other: an address no account has creates nothing (add admins in `/admin/members`), and a re-run leaves roles alone. Only when no admin can sign in at all does it create the account, or make it admin. It never takes an address held after an email change (7 days, so the undo link keeps working) |
| `SEED_ON_DEPLOY` | first Vercel deploy only | `1` makes a production build run the seeds. Re-runs are safe, but remove it after the first successful deploy: every seeding run slows the deploy, and a re-run puts back a programme staff renamed, as an empty draft under its old address (see "Running the seeds again") |
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

1. On a **production** build (`VERCEL_ENV=production`) it takes the deploy
   lock (`scripts/with-db-lock.mjs`, see "Two builds at once"), then applies
   pending migrations with `pnpm db:migrate:sql`. The lock, the migrations and
   the seeds all use `DATABASE_URL_UNPOOLED` when it is set, else
   `DATABASE_URL`, and the build log names that database. It stops the build
   if `DATABASE_URL` is missing, if `DATABASE_URL` and `DATABASE_URL_UNPOOLED`
   name different databases, and, when `SEED_ON_DEPLOY=1`, if `ADMIN_EMAIL`
   or `ADMIN_PASSWORD` is missing or `ADMIN_EMAIL` is not an address sign-in
   accepts, before it touches the database.
2. With `SEED_ON_DEPLOY=1` it then runs `db:seed`, `db:seed:academy`,
   `db:seed:content`, `seed:shop` and `seed:community`, in that order, still
   under the lock.
3. It lets go of the lock and builds the site.

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

### Rows older code writes after a migration

A migration's backfill runs once, over the rows that exist then. Code from
before the migration can still write afterwards, and leaves the new column
empty: the previous production deployment while the new one builds, the
previous deployment if a later step fails, and every older preview, because
previews get the production `DATABASE_URL`. Before the first production
deploy there is no previous production deployment, so at launch only older
previews can do this.

The three email-change migrations of 12 November add columns that older code
never writes, and the current code reads an empty one as meaningful:

| Column | Left empty by older code when it | The current code then |
|---|---|---|
| `EmailHold.noticeSentAt` | confirms an email change (it sent the undo notice after the reply and never read whether it went out) | counts the notice as never sent, and puts the change back once it is 10 minutes old, telling no one |
| `User.pendingEmailAt` | takes an email change request | lets a change away from an address never confirmed go ahead at once, without its day's wait |
| `ContactMessage.userId` | files a deletion request | does not show it in Settings as the account's open request, and an undo does not close it |

Code that old also holds an address its account never confirmed, and mails
it an undo link, which DR-32 stopped. So:

- Once production is migrated, use no preview built before these migrations
  for anything that changes an account: an email change or its confirmation,
  a confirmation link, a deletion request. Use previews to look, as above.
- If older code did write such rows (a build failed after migrating and the
  previous deployment kept serving, or someone used an older preview), redeploy
  or roll forward promptly, then run the three backfills again as soon as the
  current code is live. From that moment the daily cron, a change or reset
  request for the account, and its page in the admin put back a change whose
  notice is not recorded once it is 10 minutes old. The first statement counts the holds made before then
  as told, as the migration did; give it the time the current deployment went
  live, in UTC, because the database stores times in UTC:

```sql
UPDATE "EmailHold" SET "noticeSentAt" = "createdAt"
WHERE "noticeSentAt" IS NULL AND "createdAt" < '2026-11-13 09:30:00'; -- when the current deployment went live, in UTC

UPDATE "User" SET "pendingEmailAt" = (now() AT TIME ZONE 'UTC')
WHERE "pendingEmail" IS NOT NULL AND "pendingEmailAt" IS NULL;

UPDATE "ContactMessage" AS m SET "userId" = u."id"
FROM "User" AS u
WHERE m."topic" = 'account-deletion' AND m."userId" IS NULL
  AND u."id" = substring(m."message" from '^Account deletion requested by user ([^ ]+) ');
```

The second statement makes a change away from an address never confirmed
wait a day from when it runs, as the migration did. The third is the
migration's own.

### Two builds at once

Vercel can run two production builds together: a redeploy while one is still
building, or two merges close together. Before the locks, both migrated and
seeded the same database at the same time (review finding 19). Now:

- The whole migrate-and-seed step runs under a Postgres advisory lock that
  `scripts/with-db-lock.mjs` holds on a connection of its own. The second
  build prints "Another build is migrating or seeding" with the database's
  host and name, then "Waiting for it to finish …", waits, then finds the
  migrations applied and nothing left for the seeds to add.
- `migrate-sql` holds Prisma Migrate's own lock for its whole run. Another
  `migrate-sql` waits for it. A `pnpm db:deploy` (`prisma migrate deploy`)
  waits only 10 seconds, then fails with P1002 and applies nothing, so it
  never runs alongside either; see "A deploy waits for the database lock".
- `db:seed` makes the system ledger accounts and the genesis mint one seed at
  a time, so two seeds run by hand cannot make two treasuries.
- The locks go when the step ends, whether it worked or failed, and Postgres
  drops them if the build is killed. A build gives up after 15 minutes of
  waiting rather than hang; see "A deploy waits for the database lock".
- If the deploy lock's connection is lost, or the build is told to stop,
  `with-db-lock.mjs` stops the whole step, not just its first process: the
  step runs in a process group of its own, which gets the signal, and
  whatever still runs 10 seconds later is killed. Only then does the build
  fail, so no migration or seed carries on without the lock. (On Windows,
  which has no process groups, only the first process is stopped.)
- The lock connections send TCP keepalive probes after 10 seconds of
  silence, not Linux's default two hours, so a NAT or firewall that drops
  idle connections does not cut them while a step runs or a build waits.
- They need a direct connection: through a pooler, a lock belongs to whichever
  server connection ran the query and can outlive the build. So both refuse
  Neon's pooled address (`-pooler` in the host name) and name
  `DATABASE_URL_UNPOOLED`.
- Everything under the lock works on the database the lock was taken on. The
  wrapper gives the migrate-and-seed step that address as `DATABASE_URL`, which
  the seeds read, and `pnpm deploy:db` gives it to each of its steps. Before,
  with `DATABASE_URL` and `DATABASE_URL_UNPOOLED` naming different databases,
  the migrations and the lock went to one and the seeds to the other. Now the
  build, `deploy:db` and `db:migrate:sql` refuse that pair before they
  connect. They compare the addresses only: another database name, or another
  Neon endpoint (the pooled host is the direct one with `-pooler` added), is
  refused. A pooler with a host or port of its own, as Supabase's and RDS
  Proxy have, is accepted beside its direct address, so for those, check the
  two yourself. Each script prints the database it uses and the variable it
  came from.

### Running the seeds again

Every seed is safe to run again on a live database (DR-33). A re-run adds what
is missing and refreshes only what no admin screen edits. It never rewrites
what staff change in the admin.

| Left as staff keep it | Refreshed from the seed files |
|---|---|
| Products: prices, landed costs, stock, sizes, category, wording, whether on sale | Levels, ranks and achievements |
| Programmes: details, status, instructor, modules, lessons, quizzes; instructors | A challenge's name, description, pillar, criteria and rewards |
| Essays, missions, community categories, groups and channels, coupons, videos | |
| A challenge's dates and status | |
| The admin's password and role (unless no admin can sign in) | |

Limits worth knowing:

- Missions, sizes, essays, community categories and groups are made once,
  whatever staff do to them later. The seeds record the slugs and SKUs they
  made (the SiteSettings `seed.created.*`) and never make one again. So a
  mission staff gave a new slug does not come back live under its old one to
  pay its reward twice, and a size given a new SKU does not come back on sale
  with stock that is not there. An item a later release adds to the seed
  files is still made. The first run after an upgrade counts everything an
  older seed made as made, even a row staff renamed before the upgrade.
- Other seeded rows are found by their slug alone. A programme staff gave a
  new slug comes back under its old one as an empty draft (the academy seed
  does not build it again). Products, challenges, coupons, achievements and
  ranks cannot be renamed or deleted in the admin; one removed in the
  database comes back on the next run, as the seed first wrote it.
- `seed:academy` builds each programme once and records it (the SiteSetting
  `seed.academy.built`). `SEED_ACADEMY_FORCE=1` rebuilds a programme from the
  curriculum files: that undoes every edit made to it since, and erases
  members' lesson progress in it, with a warning. Never set it in Vercel:
  every deploy that seeds would rebuild.
- `seed:shop` only touches a product still priced in a currency other than
  rupees, which only a seed writes. `seed:merch` does the same, and also
  replaces a landed cost that is still exactly the old dollar placeholder.

`packages/core/test/seed-rerun.test.ts` proves this row by row: it seeds an
empty database, makes staff edits through the real admin services, runs the
five deploy seeds again, and finds nothing changed.

### Rehearsals

The whole sequence was rehearsed on 12 November 2026 against an empty
PostgreSQL 16 database from a fresh clone with no `.env`: 12 migrations, the
five seeds and the build in 81 seconds, then a second run, then `next start`
serving the pages and the cron endpoint. That second run exited cleanly but
did change rows: it repriced products and rebuilt the programmes (review
finding 17, since fixed and covered by the test above).

Later that day, two production builds were started at once against one empty
database with `SEED_ON_DEPLOY=1`. The second waited 10 seconds for the first,
then found the migrations applied and the seeds' work done. The database held
one admin, one of each system ledger account and one genesis mint.

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

If a build could be migrating or seeding the same database while you run these
by hand, run them under the deploy lock, which waits its turn:
`node scripts/with-db-lock.mjs <command>`. `pnpm deploy:db` already does.
Migrations and the lock need the direct connection, not a pooled one. Set it
as `DATABASE_URL_UNPOOLED` beside the pooled `DATABASE_URL`, for the same
database, or set `DATABASE_URL` alone to it.

## A deploy waits for the database lock

A production build that finds another build migrating or seeding the same
database says "Another build is migrating or seeding", names the database, then
"Waiting for it to finish …", and waits. That is normal. It lasts as long as the other
build's migrate-and-seed step, usually under a minute. `pnpm db:migrate:sql`
says "Another migration run is applying migrations to this database" when it
waits for the migration lock in the same way.

`pnpm db:deploy` (`prisma migrate deploy`) takes the same migration lock but
waits only 10 seconds. Then it stops with P1002, "Timed out trying to acquire
a postgres advisory lock", having applied nothing. Run it again when the other
run has finished.

If it gives up after 15 minutes, something still holds the lock: a build or a
`pnpm deploy:db` that is still running, or one whose machine vanished without
closing its connection (Postgres holds the lock until it notices). To see who
holds it, run this against the database:

```sql
SELECT a.pid, a.application_name, a.backend_start, a.state
FROM pg_locks l JOIN pg_stat_activity a ON a.pid = l.pid
WHERE l.locktype = 'advisory' AND l.granted AND l.objsubid = 1
  AND l.objid IN (1954112367, 72707369);
```

`1954112367` is the deploy lock (`tycoonhood deploy lock`). `72707369` is the
migration lock (`tycoonhood migrate-sql`, or `prisma migrate deploy`). If no
build or deploy is running any more, end that session with
`SELECT pg_terminate_backend(<pid>);` and deploy again.

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
- Once email works, sign in as the admin and confirm its address from the banner. The seed leaves it unconfirmed, because it cannot know the mailbox is yours, and a change away from an address never confirmed gets no hold and no undo link (DR-32).
- Run `pnpm preflight` against the production environment. It checks for unsafe flags.
