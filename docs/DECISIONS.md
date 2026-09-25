# Decision Log

Numbered decisions (D) are architecture; assumptions (A) are defaults chosen
to keep building — flag any you want changed and the change is cheap now.

## Architecture
- **D1** TypeScript everywhere; Next.js App Router.
- **D2** PostgreSQL from day one (the ledger deserves a real database).
- **D3** Prisma ORM. **Amended in Phase 1:** new-generation `prisma-client`
  generator, `engineType = "client"` (engine-free), `@prisma/adapter-pg`
  driver. Generated client is **committed** at `packages/db/src/generated`
  → deterministic builds, zero postinstall downloads, identical behavior on
  any network. Origin: the build sandbox's egress proxy blocks Prisma's
  binary CDN; the fix turned out to be the better architecture anyway.
- **D4** pnpm monorepo: `apps/web`, `packages/{db,core,config}` (+`ui` in Phase 2).
- **D5** One web app; `(public)`/`(app)` route groups. Not two deployments.
- **D6** THC = double-entry ledger. BigInt. Smallest unit = 1 (no decimals).
- **D7** Genesis mint of the full 1Q supply → TREASURY as transaction #1.
  Supply is forever provable as `-balance(SYSTEM_MINT)`.
- **D8** Phase 12 blockchain = adapter interface only, gated on legal review.
- **D9** Auth.js v5 + Argon2id (Phase 3); schema is ready now.
- **D10** Payments behind a provider-agnostic interface; Stripe first adapter (Phase 8).
- **D11** Every external dependency gets an honest dev-mode boundary — no
  silent fakes, ever.
- **D12** Initial migration authored as SQL (not generated): the sandbox
  cannot run Prisma's schema-engine, and the migration carries two
  hand-written safeguards Prisma can't express — the `user_balance_non_negative`
  CHECK and the deferred `trg_tx_zero_sum` trigger. `prisma migrate dev`
  consumes it natively on any normal network (checksum recorded).
- **D13** Ledger posting runs at Postgres default isolation (Read Committed),
  not Serializable. Invariants are enforced by atomic guarded updates,
  unique idempotency keys, and the DB trigger — Serializable only produced
  retry storms on hot rows (proven by the concurrency test). Deadlock
  retries with jitter remain as belt-and-suspenders.

- **D14** Styling: Tailwind v4, CSS-first. All tokens live in
  `packages/ui/src/tokens.css` as `@theme` custom properties — one file is
  the entire visual contract. Components in `@tycoonhood/ui` are the only
  place styles are defined; pages compose, never restyle.

- **D15** Auth amended from D9: sessions are implemented directly on our
  Session table (256-bit token in an httpOnly cookie, SHA-256 of it in the
  database, 30-day sliding expiry, user-agent + hashed IP per session)
  rather than through Auth.js. Reason: Auth.js v5's Credentials provider
  and database sessions are a documented impedance mismatch, and spec §8's
  device management wants sessions we own. The Account/VerificationToken
  tables stay Auth.js-compatible, so OAuth providers can still be layered
  on later without a migration. Passwords: Argon2id via @node-rs/argon2
  (OWASP parameters, prebuilt N-API — no toolchain on Windows).

- **D16** Blog: a minimal Post model (migration #2, same hand-authored SQL
  workflow) with markdown content rendered server-side via `marked`. The
  content is first-party (written in our own admin later), so no sanitizer
  layer sits between the database and the page — that stays true only as
  long as authorship stays internal, noted for Phase 10's editor.

- **D17** The Miner is a separate deployable (`apps/miner`, mobile-first
  PWA) sharing accounts, sessions (COOKIE_DOMAIN in prod), the ledger, and
  the design system. Mining is DISTRIBUTION, never minting: claims pay
  from a finite MINING_POOL (epoch 1: 50B, funded from Treasury), accrual
  is server-computed from lastClaimAt with a storage cap, claims are
  race-collapsed by keying the ledger transaction to the settled
  lastClaimAt, and rig upgrades burn THC back through spend() — the
  economy's first sink. Supply stays fixed and provable.
- **D18** Telegram is cut from scope on Monkey's call. The TelegramLink
  table remains in the schema (removing it is churn for nothing) but no
  integration will be built; Discord is the community surface.

- **D19** Admin console: role gate at the layout AND re-checked inside
  every server action (defense in depth). Every grant is an audited ledger
  transaction (`REWARD_ADMIN`, `createdById`) or an XP event
  (`ADMIN_GRANT`) — the house has no invisible hand.
- **D20** Rate limiting is a fixed-window in-memory Map, wired into
  login/register. The single-instance limitation is documented at the
  source and in the runbook; the function signature is Redis-swappable.
- **D21** Phase 12 ships exactly one artifact now: the `ChainAdapter`
  interface + `NullChainAdapter`. The internal ledger stays the source of
  truth; any future chain only mirrors it, idempotently, after counsel
  clears it (D8). Nothing else on-chain exists or pretends to.

- **D22** Evidence-verified challenges: submissions live in
  `ChallengeParticipation.progress` (no new table), reviewed one-by-one in
  the admin queue. `SUBMISSION` needs 1 approval, `GATED_SUBMISSIONS`
  needs `gates`. Approvals pay through the same idempotent keys as
  check-ins, and late approvals deliberately rescue FAILED participants —
  slow review must never punish a member.
- **D23** Digital deliverables render at `/library/[slug]` from
  `Product.contentMd` (migration 4), gated by a FULFILLED order. No file
  hosting exists yet; when it does, it slots in beside `contentMd`.
- **D24** Public profiles (`/u/[username]`) honor every privacy facet in
  `Profile.privacy` — including THC (default hidden). Certificates verify
  publicly at `/verify/[serial]`. Rank-ups now fire a best-effort Discord
  role sync through the honest transport.

- **D25** Password reset: raw tokens travel only in the email link; the
  DB stores SHA-256 (same discipline as sessions, D15). Single-use, 30-min
  expiry, new password validated BEFORE the token is consumed (a typo
  never burns the link), and success destroys every session. The forgot
  endpoint is IP-throttled and does constant-shape work whether or not the
  email exists — no account enumeration. Mail rides a provider layer
  identical to payments: coded Resend adapter activates with a key; until
  then the dev mailer logs, and the UI shows the link under an explicit
  "dev mode — no email was sent" label.

- **D26** The Discord bot is serverless: an Ed25519-verified Interactions
  Endpoint inside the web app (`/api/integrations/discord/interactions`),
  not a hosted gateway process. Signature checks use Node's built-in
  crypto against `DISCORD_PUBLIC_KEY`; the route is a thin adapter over a
  fully-tested core handler. Commands: `/link` (claims the Settings code,
  fires role sync, reports the transport's honest status) and `/rank`.
  A one-time script registers the guild commands. Zero extra infra.

## Assumptions (cheap to change now)
- **A1** XP curve: cumulative `250·(L−1)·L` → L2@500, L5@5,000, L10@22,500. Seeded to L50.
- **A2** Rank thresholds: Initiate L1 · Apprentice L5 · Mastermind L12 · Elite L20 · Legend L30.
- **A3** Rewards pool funded with 10,000,000,000 THC from treasury at seed, so
  daily rewards never touch the treasury directly.
- **A4** Default lesson XP: 50. Course completion default: 500.
- **A5** THC has no decimals anywhere — clean mental model, clean math.
- **A6** Three starter missions + three achievements seeded as engine fuel;
  real catalog is Phase 6/10 admin work.
- **A7** Course media (video) will be external URLs; hosting chosen when
  content exists.
- **A8** Typography ships on deliberate system stacks (Georgia display /
  Segoe UI interface / Consolas figures) because licensed webfonts are a
  spend-money decision — the token file has one line per role to swap when
  fonts are bought. The banknote-serif direction was chosen to survive that
  swap.
- **A10** Password policy: minimum 10 characters, no composition rules
  (length beats complexity theater). Reserved-username list covers system
  account names and staff impersonation.
- **A11** Onboarding option lists (goals, interests, experience) originated
  by me; they're plain string arrays in one schema file — edit freely.
- **A12** Session length 30 days, sliding under 15; sign-out-everywhere is
  built (`destroyAllForUser`) and gets UI in Phase 10.
- **A13** All public copy is originated: homepage, about, FAQ, THC page,
  three launch essays, three seeded challenges (two UPCOMING, one DRAFT),
  and three preview products (inactive until Phase 8). Everything is data
  or plain arrays — edit freely, nothing is load-bearing.
- **A14** The blog is presented as "Journal" in navigation; the route stays
  `/blog` per the spec's route list.
- **A15** The Phase 1 status page lives on at `/status`, linked publicly as
  "Open books" — it earned its keep.
- **A16** Miner economy numbers (12 THC/h base, ×level, 10h storage,
  upgrade cost curve 500→700k, 50B epoch) live in one config block —
  tune freely; nothing else hardcodes them.
- **A17** "Mining" is game language for pool distribution; every screen
  that says it also says supply is fixed and credits are non-redeemable.
  If you ever want mining to create new supply, that is a one-line
  economic change but a big legal/optics one — flag me first.
- **A18** Reversals post as `ADJUSTMENT` transactions linked by
  `reversesId`; the admin UI hides the reverse button on reversals and
  already-reversed rows. Originals are never mutated.
- **A19** The Founder's Playbook ships with real content authored in the
  Business Mastery voice (seeded, editable). Test fixtures now archive
  themselves after every suite run so the dev DB's public pages stay clean.
- **A9** Brand direction originated: "the ledger" — warm espresso-black
  vault surfaces (deliberately not blue-black), brass/gold as the house
  metal, reeded-coin mark as the signature (logo, favicon, THC glyph, rank
  insignia base), pillar palette Warrior #B5443A · Builder #5B87A6 ·
  Tycoon #C9A227 · Mind #6FA08B, rank insignia as filled pips ●●●○○.

## Legal flags (unchanged, tracked)
- "Financial Planning and **Investment Advisory**" is a regulated term in most
  jurisdictions — lawyer review before launch; ships as education with
  disclaimers until cleared.
- THC ships as **non-redeemable internal utility credits** until counsel
  reviews; no fiat exchange, no withdrawal.
