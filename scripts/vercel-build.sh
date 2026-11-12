#!/usr/bin/env bash
# Vercel build for the site (apps/web). Vercel runs it from apps/web as
# `cd ../.. && bash scripts/vercel-build.sh`, so the working directory is the
# repository root. See docs/DEPLOYMENT.md, "Deploying on Vercel".
#
# 1. Production deploys (VERCEL_ENV=production) apply pending migrations
#    first, over the direct (unpooled) connection when the database offers
#    one. Preview deploys never touch the database: they are built from
#    branches that are not merged yet, and they may share production's
#    connection settings.
# 2. With SEED_ON_DEPLOY=1, a production deploy also runs the seeds, in the
#    only safe order. Every seed is safe to re-run on a live database: it adds
#    what is missing and never rewrites what staff edit in the admin (DR-33).
#    Still remove SEED_ON_DEPLOY after the first deploy: a re-run puts back
#    seeded rows staff have deleted, and it slows every deploy. Seeding
#    creates the admin account, so it needs ADMIN_EMAIL and ADMIN_PASSWORD;
#    without either, or with an ADMIN_EMAIL sign-in would refuse, the build
#    stops before it touches the database.
# 3. Migrating and seeding run under one deploy lock (scripts/with-db-lock.mjs,
#    review finding 19). Two production builds can run at once, a redeploy
#    while one is still building or two merges close together; the second
#    waits for the first to finish, then finds the work done. The lock, the
#    migrations and the seeds all work on the database the lock was taken on.
# 4. Then it builds the site. Any failure stops the deploy, and the last good
#    deployment stays live.
set -euo pipefail

# The migrate-and-seed step. with-db-lock.mjs runs it, by calling this script
# again with --migrate-and-seed, while it holds the deploy lock.
migrate_and_seed() {
  echo "── Applying database migrations"
  pnpm db:migrate:sql
  if [ "${SEED_ON_DEPLOY:-}" = "1" ]; then
    echo "── SEED_ON_DEPLOY=1: seeding (remove the variable after the first deploy)"
    pnpm db:seed
    pnpm db:seed:academy
    pnpm db:seed:content
    pnpm --filter @tycoonhood/db seed:shop
    pnpm --filter @tycoonhood/db seed:community
  fi
}

if [ "${1:-}" = "--migrate-and-seed" ]; then
  migrate_and_seed
  exit 0
fi

if [ "${VERCEL_ENV:-}" = "production" ]; then
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "DATABASE_URL is not set for Production. Connect the database to this Vercel project, then redeploy." >&2
    exit 1
  fi
  if [ "${SEED_ON_DEPLOY:-}" = "1" ] && { [ -z "${ADMIN_EMAIL:-}" ] || [ -z "${ADMIN_PASSWORD:-}" ]; }; then
    echo "SEED_ON_DEPLOY=1 creates the admin account, so it needs ADMIN_EMAIL and ADMIN_PASSWORD for Production." >&2
    echo "Add both in Vercel (Settings → Environment Variables, Production, Sensitive), then redeploy. The database was not touched." >&2
    exit 1
  fi
  # The address the seed will use, checked the way sign-in checks it, so a
  # value sign-in would refuse stops the build here, not after the migrations.
  if [ "${SEED_ON_DEPLOY:-}" = "1" ] && ! pnpm --silent --filter @tycoonhood/db check:admin-email; then
    echo "Fix ADMIN_EMAIL in Vercel (Settings → Environment Variables, Production), then redeploy. The database was not touched." >&2
    exit 1
  fi
  # The lock, the migrations and the seeds all use the direct connection:
  # with-db-lock.mjs takes DATABASE_URL_UNPOOLED when it is set and hands it to
  # this step as DATABASE_URL. It also stops the build, before it connects, if
  # DATABASE_URL and DATABASE_URL_UNPOOLED name different databases.
  node scripts/with-db-lock.mjs bash "${BASH_SOURCE[0]}" --migrate-and-seed
else
  echo "── ${VERCEL_ENV:-local} build: the database is not touched"
fi

echo "── Building the site"
pnpm --filter @tycoonhood/web build
