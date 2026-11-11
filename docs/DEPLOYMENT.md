# Deployment

**Nothing has been deployed by this build.** These are the steps for when you deploy.

## Requirements

- Node 20+ and pnpm 9.
- PostgreSQL 16, managed (for example Neon, Supabase or RDS).
- A host for Next.js (for example Vercel, Railway or Render). `apps/web` is the only app you need. `apps/miner` only redirects.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `NEXT_PUBLIC_SITE_URL` | yes | e.g. `https://tycoonhood.com`; used in emails, certificates and affiliate links |
| `RESEND_API_KEY`, `MAIL_FROM` | yes for launch | Without them, verification and reset emails are not sent in production |
| `AFFILIATE_HASH_SECRET` | yes | A long random string; salts the click hashes |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | for card payments | `rzp_test_…` gives test mode; `rzp_live_…` gives real money |
| `RAZORPAY_WEBHOOK_SECRET` | strongly recommended | Lets the webhook confirm payments if the browser closes |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first run only | Used by `db:seed` to create the first admin |
| `COOKIE_DOMAIN` | optional | Only if you serve several subdomains |
| `TRUSTED_PROXY_HOPS` | optional | How many proxies in front of the app add to `X-Forwarded-For`; per-IP limits read the address that many entries from the right. 1 to 5, default 1 (one proxy such as nginx, or Vercel). If the app is exposed directly with no proxy in front, visitors can set that header themselves, so IP-based limits can be spoofed |
| `DISCORD_*` | optional | Discord role sync |
| `DEV_MODE` | **never in production** | Must be unset or `false` in production. With `NODE_ENV=production` the sandbox and dev mailer are off regardless |
| `ALLOW_DEFAULT_ADMIN`, `ALLOW_TESTS_ON_THIS_DB` | **never in production** | Local only |

## First deploy

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

## Turning on Razorpay

1. In the Razorpay dashboard, go to Settings → API Keys and generate **test** keys first.
2. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, then redeploy. Checkout shows a "test mode" banner, and payments are recorded as TEST, excluded from revenue, with any commission flagged "do not pay out".
3. In the Razorpay dashboard, go to Settings → Webhooks and add `https://<your-domain>/api/webhooks/razorpay`.
   - Events: `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`.
   - Choose a secret and set the same value as `RAZORPAY_WEBHOOK_SECRET`.
4. Buy something with a Razorpay test card. Check that the order shows Paid in `/admin/orders`, then refund it from `/admin/refunds`.
5. When KYC is approved, swap in the `rzp_live_…` keys and the live webhook secret. Real money flows from then on.

## Before launch

- Set real INR prices and landed costs for every product. The seeded values are placeholders and are marked as such in the seed output.
- Have the Terms, Privacy, Refund policy, Earn terms and the "Financial Planning & Investment" programme name reviewed by a lawyer. The last one needs this because of the SEBI investment-adviser rules.
- Have Harsha review the About page copy.
- Change the seeded admin password, or create your admin and remove `ADMIN_PASSWORD` from the environment.
- Run `pnpm preflight` against the production environment. It checks for unsafe flags.
