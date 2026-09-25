# Runbook

## Daily commands
| Command | Does |
|---|---|
| `pnpm dev` | Web app on :3000 |
| `pnpm test` | Core test suites (needs Postgres + seed) |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:seed` | Idempotent seed — safe anytime |
| `pnpm db:studio` | Prisma Studio DB browser |

## Reset the database (destructive)
```powershell
docker rm -f tycoonhood-pg
docker run --name tycoonhood-pg -e POSTGRES_USER=tycoon -e POSTGRES_PASSWORD=tycoon_dev -e POSTGRES_DB=tycoonhood_dev -p 5432:5432 -d postgres:16
pnpm db:migrate; pnpm db:seed
```

## Common issues
- **P1001 can't reach database** → Postgres isn't running / wrong `DATABASE_URL` in `.env`.
- **Port 3000 busy** → `pnpm dev -- -p 3001`.
- **Schema changed, client stale** → `pnpm --filter @tycoonhood/db generate` (rewrites `src/generated`; commit the diff).
- **Ledger audit** → `LedgerService.auditAccount(id)` compares cached balance vs SUM(entries); tests assert it stays consistent.

---

## Deploying (Neon + Vercel — the recommended path)

Two Vercel projects out of one repo; one Neon Postgres between them.

1. **Database** — create a Neon project, copy the pooled connection string.
   Apply migrations + seeds from your machine:
   ```powershell
   $env:DATABASE_URL="<neon-pooled-url>"
   pnpm db:migrate ; pnpm db:seed ; pnpm db:seed:content ; pnpm db:seed:academy
   ```
   (`db:migrate` applies `packages/db/prisma/migrations/*.sql` in order — no
   Prisma engine download needed; the client in `packages/db/src/generated`
   is committed and engine-free.)

2. **Web project** — import the repo, root directory `apps/web`,
   install command `pnpm install`, build `pnpm --filter @tycoonhood/web build`.

3. **Miner project** — same repo, root `apps/miner`,
   build `pnpm --filter @tycoonhood/miner build`.

4. **Environment (set on BOTH projects unless noted):**

   | Key | Value | Notes |
   |---|---|---|
   | `DATABASE_URL` | Neon pooled URL | both |
   | `DEV_MODE` | `false` | disables the dev fiat provider |
   | `COOKIE_DOMAIN` | `.yourdomain.com` | shared sign-in across www + miner |
   | `NEXT_PUBLIC_SITE_URL` | `https://www.yourdomain.com` | web |
   | `NEXT_PUBLIC_MINER_URL` | `https://miner.yourdomain.com` | web (nav link) |
   | `NEXT_PUBLIC_MAIN_SITE_URL` | `https://www.yourdomain.com` | miner (register link) |
   | `ADMIN_EMAIL` / `ADMIN_PASSWORD` | your values | set BEFORE running seeds |
   | `STRIPE_SECRET_KEY` | `sk_live_…` | web; enables real card checkout |
   | `STRIPE_WEBHOOK_SECRET` | `whsec_…` | web; endpoint `/api/webhooks/stripe` |
   | `DISCORD_BOT_TOKEN` / `DISCORD_GUILD_ID` / `DISCORD_ROLE_MAP` | see settings page | optional; role sync goes live |
   | `RESEND_API_KEY` | `re_…` | web; password-reset emails go real |
   | `DISCORD_PUBLIC_KEY` / `DISCORD_APP_ID` | Developer Portal | web; enables the slash-command endpoint |
   | `MAIL_FROM` | `Tycoonhood <no-reply@yourdomain.com>` | web; must be a Resend-verified sender |

   `DISCORD_ROLE_MAP` is JSON: `{"initiate":"<roleId>", "apprentice":"<roleId>", …}`.

**VPS alternative:** one box, Postgres 16, `pnpm build && pnpm build:miner`,
run both `next start`s (3000/3001) behind Caddy/nginx with the two
hostnames. Same env vars; the in-memory rate limiter is fully effective in
this shape.

## Discord bot setup (10 minutes, no extra server)

The "bot" is the web app itself — Discord posts signed slash commands to
an HTTPS endpoint, so it deploys with Vercel and there is no gateway
process to host.

1. discord.com/developers → New Application → copy **Application ID** and
   **Public Key** → env `DISCORD_APP_ID`, `DISCORD_PUBLIC_KEY`.
2. Bot tab → Reset Token → env `DISCORD_BOT_TOKEN`.
3. General Information → **Interactions Endpoint URL** →
   `https://www.yourdomain.com/api/integrations/discord/interactions`
   (Discord PINGs it on save; the deployed app must be live first).
4. Invite the bot to your server with the **Manage Roles** permission and
   drag its role ABOVE the rank roles. Server ID → `DISCORD_GUILD_ID`.
5. Create one role per rank and map them:
   `DISCORD_ROLE_MAP={"initiate":"<id>","apprentice":"<id>","mastermind":"<id>","elite":"<id>","legend":"<id>"}`
6. Register the commands once:
   ```powershell
   cd packages/core ; npx tsx scripts/discord-register-commands.ts
   ```

Members then run `/link CODE` (code from Settings) and `/rank`. Rank-ups
sync roles automatically from that moment.

## If Prisma engines are unavailable

`prisma migrate deploy` downloads engine binaries from binaries.prisma.sh.
In locked-down networks, air-gapped CI, or minimal containers that download
fails and migrations cannot run. An engine-free path is provided:

```powershell
pnpm db:migrate:status   # show applied vs pending, change nothing
pnpm db:migrate:sql      # apply pending migrations via plain SQL
```

It reads the same `prisma/migrations` directory, applies each migration in a
transaction, records it in `_prisma_migrations` with Prisma's checksum scheme,
and refuses to run if an already-applied migration has been edited. Prisma
treats the database as up to date afterwards.

## Production checklist

- [ ] `ADMIN_PASSWORD` set to a real secret; default rejected
- [ ] `DEV_MODE=false` verified — marketplace shows no "(dev)" button
- [ ] `COOKIE_DOMAIN` set; sign in on www, open miner, still signed in
- [ ] Stripe keys live; test purchase + webhook settle round-trips
- [ ] `RESEND_API_KEY` + verified `MAIL_FROM` set; forgot-password round-trips to a real inbox
- [ ] Discord endpoint verified in the portal; `/link` + `/rank` answer in the server; a rank role actually moves
- [ ] Wallet audit line shows `cache = Σ entries ✓` on a real account
- [ ] `/thc` public books load; Treasury + pools + circulating reconcile
- [ ] Rate limiter note reviewed (Redis swap if serverless at scale)
- [ ] CSP added to `securityHeaders` once asset origins are final
- [ ] Legal review before ANY THC redemption, transfer, or chain work (D8)
