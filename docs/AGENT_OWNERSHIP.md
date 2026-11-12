# Agent ownership — the 11 November 2026 build

The full-platform build ran as parallel workstreams on the branch `build/full-platform`. Each stream owned the files below, and the lead integrated the streams, resolved conflicts and ran the gates. Use this table to find who decided what, and where to look first when something in an area breaks.

| Stream | Owned | Shared contract it built against |
|---|---|---|
| **Lead / integration** | Schema and migration `20261111000000_full_platform`; `auth/permissions.ts`; `lib/guard.ts`; `lib/admin-nav.ts`; `platform/audit.ts`; `platform/notify.ts`; `earn/hooks.ts`; nav; the sitemap; the docs; the final test, typecheck, lint and build gates | — |
| **Curriculum** (4 writers) | `packages/db/src/curriculum/{warrior,business-mastery,financial-planning,mindfulness}.ts`, `types.ts` | The curriculum types: 8 modules × 3 lessons + quiz, and a 12-question final |
| **LMS** | `lms/authoring.ts`, `lms/learner.ts`, `lms.ts` changes, `seed-academy.ts`, `seed-guard.ts`, `admin/courses/**`, `certificates/**`, `courses/history`, `(public)/learning`, `instructors/[slug]`, `verify/[serial]`, `components/learning/**` | The permissions `courses.author` and `courses.publish`. Since DR-34 (12 November), `courses.author` reaches only the programmes taught by the instructor profile linked to the account, and only while they are drafts unless the account may publish, and `courses.manage` (Admin) covers every programme, the profiles and their links |
| **Earn** | `earn/affiliates.ts`, `/r/[code]`, `(public)/earn/**`, `earnings`, `admin/earn`, `components/earn/**` | `EarnHooks`, `admin.earn` |
| **Community** | `discussions/*`, the rules engine's weekly bucketing, `community/discussions/**`, `community/groups/**`, `leaderboard`, `achievements`, `admin/moderation`, `seed-community.ts`, `lib/community-guidelines.ts` | `community.moderate` and `isStaff` |
| **Platform** | `platform/{email-verification,settings,profile,account-settings,members,cms,analytics}.ts`; suspension; the home, about, contact, success-stories, refund-policy, FAQ, terms and privacy pages; `admin/{members,site,analytics,audit}`; Today dashboard cards; `site-footer` | `admin.users`, `admin.content`, `admin.analytics`, `admin.audit` |
| **Commerce** | `shop/*` (cart, wishlist, coupons, pricing, checkout, payments, refunds, tracking, earn registry), the `commerce.ts` additions, `store/**`, `cart`, `wishlist`, `checkout/**`, `orders/**`, `admin/{coupons,refunds}`, the orders and products admin edits, `(public)/marketplace/**`, the Razorpay webhook, `seed-shop.ts` | `admin.commerce`, `EarnHooks` |
| **Browser verification** | `scripts/e2e/journeys.mjs`, plus small bug fixes found by driving the UI (listed in `docs/TEST_REPORT.md`) | — |
| **Launch** (12 November, after the review rounds) | `scripts/vercel-build.sh`, both `vercel.json` files, the Vercel project settings and environment, `scripts/e2e/a11y.mjs`, `LAUNCH.md`, `TYCOONHOOD_BLOCKED_ON_YOU.md`, `TYCOONHOOD_STATE.md`, `docs/TEST_REPORT.md` | DR-33: production builds migrate, the first one seeds; previews never touch the database |
| **3D campus** (DR-31, on its own branch `build/world`) | `packages/core/src/world/**` and `packages/core/test/world-*.test.ts`; `apps/web/components/world/**`; `app/(app)/world`; `lib/world-state.ts`; `apps/web/public/world/**`; `scripts/world/**`; the world rules in `eslint.config.mjs`; journey 9 in `scripts/e2e/journeys.mjs`; the sidebar link in `app-chrome.tsx` | `WorldState` version 1 (`world/state.ts`), `requireUser()`, the bundle rule (three only through `world-host.tsx`) |

## Rules every stream followed

- Roles are checked through `can()` on the server, never in a layout and never by comparing role strings.
- Money is stored in integer paise. THC is never converted into money.
- Payments are never simulated outside the labelled sandbox, and credentials are never invented.
- Raw IPs are never stored.
- No guaranteed-income claims, and no investment advice.
