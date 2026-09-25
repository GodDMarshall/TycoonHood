# TycoonHood — run it on your machine

## 1. Put it on your D: drive

Unzip `tycoonhood-complete.zip` so you end up with:

```
D:\tycoonhood\
```

Not `D:\tycoonhood\tycoonhood\` — if the zip created a nested folder, move the
inner one up. You should see `package.json` directly inside `D:\tycoonhood`.

## 2. Open it in VS Code

```powershell
cd D:\tycoonhood
code .
```

VS Code will offer to install the recommended extensions (ESLint, Prisma,
Tailwind). Accept — they make the editor understand the project.

## 3. Run setup once

Press **Ctrl+Shift+P** → `Tasks: Run Task` → **0 · First-time setup**.

Or in the terminal:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup-windows.ps1
```

It will check Node and pnpm, ask how you want PostgreSQL (Docker, Neon, or an
install you already have), write `.env`, install dependencies, apply
migrations, seed real content, and run 26 end-to-end checks. It stops and
explains itself if anything fails.

**You need Node 20+.** If you don't have it: https://nodejs.org (LTS).

## 4. Start it

Press **Ctrl+Shift+B**, or:

```powershell
pnpm --filter @tycoonhood/web dev      # http://localhost:3000
pnpm --filter @tycoonhood/miner dev    # http://localhost:3001
```

Sign in as admin:

- **admin@tycoonhood.local**
- **tycoon-admin-change-me** ← public password, change before going online

## The other tasks

`Ctrl+Shift+P` → `Tasks: Run Task`:

| Task | What it does |
|---|---|
| 1 · Run TycoonHood | starts web + miner together |
| 2 · Verify everything | typecheck, lint, 60 tests, both builds |
| 3 · Platform verification | 26 end-to-end checks against your database |
| DB · Re-seed | rebuilds courses and content |
| DB · Open Prisma Studio | browse the database in your browser |
| DB · Start Postgres (Docker) | starts the local database container |

## If something breaks

**`pnpm: command not found`** — close and reopen VS Code so PATH refreshes.

**`Can't reach database server`** — Docker Desktop isn't running, or the
`DATABASE_URL` in `.env` is wrong.

**`ExecutionPolicy` error** — use the full command in step 3; it bypasses the
policy for that one run without changing your system settings.

**Port already in use** — something else is on 3000/3001. Change the port:
`pnpm --filter @tycoonhood/web dev -- -p 3005`

## Deploying later

When you have a Neon database and want it online:

```powershell
$env:DATABASE_URL="postgresql://...neon.tech/tycoonhood?sslmode=require"
$env:ADMIN_EMAIL="you@yourdomain.com"
$env:ADMIN_PASSWORD="a real password"
pnpm deploy:db
```

That prepares the production database and verifies it. The Vercel import is
two clicks in their dashboard — see `docs/RUNBOOK.md`.
