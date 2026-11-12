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
#    only safe order. Every seed is idempotent, but re-running some of them
#    would rewrite content staff have edited since, so remove SEED_ON_DEPLOY
#    after the first deploy. Seeding creates the admin account, so it needs
#    ADMIN_EMAIL and ADMIN_PASSWORD; without either, the build stops before
#    it touches the database.
# 3. Then it builds the site. Any failure stops the deploy, and the last good
#    deployment stays live.
set -euo pipefail

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
  (
    export DATABASE_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"
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
  )
else
  echo "── ${VERCEL_ENV:-local} build: the database is not touched"
fi

echo "── Building the site"
pnpm --filter @tycoonhood/web build
