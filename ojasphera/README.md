# Ojasphera Labs — ojasphera.com

The official website of Ojasphera Labs Private Limited.

**This is a completely separate project from TycoonHood.** It only happens to sit in
the same repository. It has its own `package.json`, its own lockfile, its own
`pnpm-workspace.yaml` (so pnpm treats this folder as its own root), its own
TypeScript and ESLint config, and its own Vercel project. It imports nothing from
outside this folder, and nothing in TycoonHood imports from it. You can copy this
folder into a new repository as-is and it builds.

**Stack:** Next.js 15 (App Router) · React 19 · Tailwind v4 · Geist via
`next/font/google` (downloaded from Google Fonts at build time, then served from
this site's own domain — the build needs network access to fonts.googleapis.com). No 3D or animation libraries — every visual system is hand-built
on Canvas 2D / SVG so it stays fast on phones.

Run every command **inside this folder**:

```bash
cd ojasphera
pnpm install
pnpm dev          # http://localhost:3002
pnpm build        # production build
pnpm start        # serve the production build on :3002
pnpm typecheck
pnpm lint
pnpm add -w <package>   # add a dependency (-w: this folder is its own pnpm root)
```

### Running it next to TycoonHood

The two never share a port or a process:

| Project | Folder | Command | URL |
|---|---|---|---|
| TycoonHood site | repo root | `pnpm dev` | http://localhost:3000 |
| TycoonHood Miner | repo root | `pnpm dev:miner` | http://localhost:3001 |
| **Ojasphera** | `ojasphera/` | `pnpm dev` | http://localhost:3002 |

## Living inside the TycoonHood repository

This folder shares a Git repository with TycoonHood and nothing else. A few
consequences of that, all handled from inside this folder:

- **`.gitignore`** — TycoonHood's root `.gitignore` ignores every `build/` folder,
  which would hide this site's `/build` route. `ojasphera/.gitignore` re-includes
  `app/build/` (this also keeps Tailwind scanning it).
- **Lint** — TycoonHood's root `pnpm lint` runs `eslint .`, which also lints this
  folder with TycoonHood's own config. So `pnpm lint` here runs two passes:
  1. this folder's config (Next.js rules plus TycoonHood's base rules, warnings as
     errors, no `eslint-disable`/inline-config comments for plugin rules TycoonHood
     doesn't load);
  2. `scripts/lint-as-host.mjs`, which runs **TycoonHood's actual lint** on this
     folder. It needs TycoonHood's dependencies installed (`pnpm install` at the repo
     root); without them it prints a warning and skips, and in a separate repository
     it does nothing.

  If `pnpm lint` passes here with pass 2 running, TycoonHood's lint stays green.
- **CI / Vercel** — TycoonHood's GitHub workflow and Vercel projects run on every
  commit, including Ojasphera-only ones. That is harmless; to skip them, add an
  Ignored Build Step in those Vercel projects (dashboard setting, no file change).
- **Moving out** — the folder builds unchanged in its own repository; delete the
  `!/app/build/` line from `.gitignore` afterwards if you like (it becomes a no-op).

## Map

| Route | What it is |
|---|---|
| `/` | The story: hero system → problem → what we build → method → agents → projects → capabilities → built for → why → about → build with us |
| `/systems` | What we build, the method, the agent environment, why Ojasphera |
| `/projects` · `/projects/[slug]` | Project library and immersive case studies (problem → idea → system → experience → intelligence → result) |
| `/capabilities` | Technology layer grouped by capability, who it's for |
| `/about` | Mission, vision, what Ojasphera is and isn't |
| `/build` | Project-intake console (`?mode=talk` for a short message) |
| `/api/intake` | Receives briefs (see below) |
| `/privacy` `/terms` | Plain-language legal pages |

## Where things live

- `lib/site.ts` — brand, navigation, SEO copy.
- `lib/projects.ts` — **the project library.** Add a project by appending one
  `Project` object; the homepage, `/projects`, the case-study route and the sitemap
  pick it up. Anything not yet known goes in `pending` and is shown as "to be
  documented" rather than invented.
- `components/projects/demos.tsx` — registry of interactive demos (code-split). A
  new project can ship without one; the page shows a placeholder.
- `lib/content.ts` — offerings, method steps, built-for, technology groups.
- `components/hero/` — the interactive intelligence system (Canvas 2D).
- `components/agents/` — the agent operating environment (scripted simulation,
  labelled as such in the UI).

## Project intake delivery

`/api/intake` validates the brief (same schema as the form, `lib/intake.ts`), then
delivers it through whichever channels are configured:

| Variable | Purpose |
|---|---|
| `INTAKE_WEBHOOK_URL` | JSON POST of the brief (Slack, Zapier, Make, a CRM…) |
| `RESEND_API_KEY` + `INTAKE_TO_EMAIL` | Email the brief via Resend (`INTAKE_FROM_EMAIL` optional; must be a verified sender) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional public inbox shown in the footer and offered as a fallback |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL (defaults to `https://ojasphera.com`) |

With no channel configured, production returns `503` and the form keeps the
visitor's text with a "copy brief" fallback — a brief is never silently dropped.
In development the brief is logged to the server console.

## Deploying

Its own Vercel project with **Root Directory = `ojasphera`** (see `vercel.json`),
pointed at the `ojasphera.com` domain. Every page is static except `/api/intake`.
The TycoonHood Vercel projects (`apps/web`, `apps/miner`) are unaffected. If you
don't want them to rebuild when only this folder changes, add an Ignored Build
Step in those projects — optional, not required.

## Content rules

No invented clients, statistics, awards or partnerships. Interactive demos are
simulations that illustrate how the systems behave and say so on screen.
