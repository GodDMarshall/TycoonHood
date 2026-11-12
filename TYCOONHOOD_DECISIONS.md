# TYCOONHOOD — Decision Record (`TYCOONHOOD_DECISIONS.md`)

**Purpose (Directive §23):** the durable record of architectural, product, design and technical decisions. **History is never silently overwritten.** Two layers below: **Part A** preserves the decisions already recorded in `docs/DECISIONS.md` (provenance kept — these are historical constraints, binding until explicitly revisited); **Part B** is decisions this audit surfaced that need a product-level call, each in the required shape (date · decision · context · alternatives · reason · consequences · status).

---

## Part A — Preserved historical decisions (from `docs/DECISIONS.md`, unchanged)

These carry their original IDs. Status is **ADOPTED** unless noted; do not overturn without a new entry in Part B superseding them. Full text lives in `docs/DECISIONS.md` — this is the binding index.

**Architecture:** D1 TypeScript + Next.js App Router · D2 PostgreSQL from day one · **D3 Prisma with the new engine-free `prisma-client` generator, committed generated client** (deterministic builds, zero postinstall downloads — *verified essential: Prisma's engine CDN returns 403 in the build environment*) · D4 pnpm monorepo · D5 one web app, two route groups · **D6 THC = double-entry ledger, BigInt, smallest unit 1** · **D7 genesis mint of 1Q → TREASURY, supply provable as `-balance(SYSTEM_MINT)`** · D8 chain = adapter interface only, legal-gated · D9→**D15** own Session table (256-bit token, SHA-256 at rest, 30-day sliding, Argon2id) instead of Auth.js · D10 payments behind a provider interface, Stripe first · D11 every external dependency gets an honest dev-mode boundary · **D12 initial migration authored as hand-written SQL** carrying the USER-non-negative CHECK + deferred zero-sum trigger · D13 ledger posts at Read-Committed with atomic guarded updates + idempotency keys (not Serializable) · **D14 one token file (`packages/ui/src/tokens.css`); components define styles, pages compose never restyle** · D16 blog via `Post` + `marked`, first-party content, no sanitizer layer (revisit when authorship opens; **superseded by DR-30**) · **D17 Miner is a separate deployable; mining is DISTRIBUTION from a finite MINING_POOL, never minting** · D18 Telegram cut (table retained, no integration) · D19 admin role gate at layout **and** re-checked in every server action · D20 rate limiting = in-memory fixed-window Map, Redis-swappable · D21 chain ships only `ChainAdapter` + `NullChainAdapter` · D22 evidence-verified challenges reviewed in the admin queue · D23 digital deliverables render at `/library/[slug]` gated by a FULFILLED order · D24 public profiles honor `Profile.privacy` (THC hidden by default); certificates verify at `/verify/[serial]` · D25 password-reset token discipline (hashed, single-use, 30-min, validate-before-consume, destroy all sessions) · D26 serverless Ed25519-verified Discord Interactions endpoint.

**Brand (A9) — ADOPTED, load-bearing:** "the ledger" — warm espresso-black vault surfaces (deliberately not blue-black), brass/gold as the house metal, reeded-coin mark as the signature, pillar palette Warrior `#B5443A` · Builder `#5B87A6` · Tycoon `#C9A227` · Mind `#6FA08B`, rank insignia as filled pips. **No red in the palette; no WebGL; the hero is typographic.** (This is the visual contract actually in the repository — see DR-1.)

**Assumptions (cheap to change):** A1 XP curve `250·(L−1)·L` · A2 rank thresholds · A3 rewards pool 10B from treasury · A5 no decimals · A8 system font stacks until webfonts are bought · A10 password ≥10 chars · A16 miner economy constants · A17 "mining" is game language for pool distribution (every screen also states supply is fixed). **Legal flags (tracked, unchanged):** "Investment Advisory" is a regulated term — lawyer review before launch; THC ships as non-redeemable internal utility credits until counsel reviews.

---

## Part B — Decisions surfaced by this audit (require your call)

Each needs a product-level judgment. I have not made these for you; I state the recommendation and mark status **OPEN** until you decide. Where I already had to act to keep the audit moving, I say so and mark it **PROVISIONAL**.

### DR-1 — Where does the WebGL lattice / "exact red" / "Ascent" homepage live? *(the Directive §4/§8 decisions)*
- **Date:** 2026-09-15 · **Status:** **CLOSED 2026-09-26 by DR-17** — the owner's takeover directive chose (b): build a 3D direction. No lattice and no red were ever found; neither was invented.
- **Context:** the Master Directive names a "runtime WebGL lattice", an "exact red / visual red specification", and a "headline" as historical decisions to preserve. **None exist in `D:\TycoonHood`:** no Three.js/GSAP/WebGL/canvas anywhere, no red in the token palette, and the homepage hero is plain text. The repository's recorded brand is "the ledger" (A9, above). `PROJECT_STATUS.md:82`'s "code-drawn 3D/SVG hero art" is a stale/false claim (verified — no such asset exists).
- **Alternatives:** (a) these decisions belong to a **different TycoonHood artifact** not in this repo (an earlier "Ascent" homepage, a chat-exported zip, another folder); (b) they are **intended future direction** not yet built; (c) they were superseded by the "ledger" direction and the Directive text is out of date.
- **Reason a decision is needed:** the Directive forbids inventing implementation and forbids silently choosing between conflicting decisions. I cannot preserve, audit, or reconcile what is not present.
- **Consequences:** until resolved, the visual layer is audited as the shipped "ledger" system, and the lattice/red/Ascent work is **PARKED (roadmap P3)** and recorded as NOT PRESENT — not as "removed" or "done".
- **Recommendation:** tell me which of (a)/(b)/(c) is true. If (a), point me at the source and I fold it into the audit. If (b), it becomes a design track behind the Directive §8 WebGL checklist. If (c), we update the Directive and close this.

### DR-2 — Invert the dev-mode default to fail closed
- **Date:** 2026-09-15 · **Status:** **OPEN (strong recommend: adopt).**
- **Context:** D11's honest dev boundaries are implemented **default-open** (`isDevMode()` is true unless `DEV_MODE==="false"`). On that default a forgotten flag returns admin password-reset links on screen (P0-2, reproduced) and gives away card-priced products (P0-3, reproduced).
- **Alternatives:** keep default-open and rely on operators setting `DEV_MODE=false` (status quo); **invert** so boundaries need `DEV_MODE==="true"` AND `NODE_ENV!=="production"` and fail closed otherwise; or remove the dev boundaries entirely and require real providers.
- **Reason:** one missing env var currently equals admin takeover + free store — the opposite of the "no faking / production-safe" value.
- **Consequences of inverting:** local dev must set `DEV_MODE=true` explicitly (a one-line RUNBOOK change); production without a real mailer/Stripe shows honest "not configured" states instead of leaking. **Recommendation: invert (roadmap N3).**

### DR-3 — Authorization must live in pages/DAL, not only layouts (supersedes the *implementation* of D19 for reads)
- **Date:** 2026-09-15 · **Status:** **OPEN (strong recommend: adopt).**
- **Context:** D19 says "role gate at the layout AND re-checked in every server action." Writes comply. **Reads do not:** pages rely on the layout, and Next's partial rendering skips the layout for a crafted RSC request — I dumped member PII + the ledger anonymously (P0-1).
- **Alternatives:** add `middleware.ts` (a broad gate, but middleware has its own CVE history and the project deliberately has none); **add an in-page check / Data Access Layer** so no page renders data without authorizing (Next's own recommended pattern); or both.
- **Reason:** layouts are not a security boundary in the App Router.
- **Consequences:** every `(app)` page gains one guard call (or goes through a DAL). This does not overturn D19's intent — it corrects its implementation. **Recommendation: DAL (roadmap N2).**

### DR-4 — One deploy/migrate story
- **Date:** 2026-09-15 · **Status:** **OPEN (recommend: migrations out-of-band).**
- **Context:** three sources disagree — `apps/web/vercel.json` runs `migrate:deploy` in the build (needs the Prisma engine that returns 403 here), root `vercel.json` doesn't, and `PROJECT_STATUS.md:173` says the build "deliberately does not run migrations."
- **Alternatives:** run migrations in the build via the engine-free `db:migrate:sql` (not `migrate:deploy`); or keep migrations fully out-of-band (operator runs `db:migrate:sql` before deploy) and make `vercel.json` build-only.
- **Reason:** the currently-wired path can't run in the stated environment, and a failed mid-build migration leaves a half-applied schema.
- **Consequences:** out-of-band is safest (a failed migration never corrupts a deploy) but adds one operator step. **Recommendation: out-of-band, build-only vercel (roadmap N4).**

### DR-5 — Seed must require an explicit admin password, not infer "production"
- **Date:** 2026-09-15 · **Status:** **OPEN (recommend: adopt).**
- **Context:** the seed decides "production" from a hostname regex (`neon|supabase|rds|railway|render`). Docker/VPS/Fly/DO/Azure/GCP/Vercel-Postgres hosts fall through and get the **published** admin password `tycoon-admin-change-me`.
- **Alternatives:** extend the regex forever (loses); **require `ADMIN_PASSWORD` (min length) always, unless `ALLOW_DEFAULT_ADMIN=1`** is explicitly set for local convenience.
- **Reason:** hostname inference cannot enumerate every prod host; the failure mode is a published admin credential on a live box.
- **Consequences:** local seeding needs either `ADMIN_PASSWORD` or the explicit escape hatch. **Recommendation: require it (roadmap N4).**

### DR-6 — Enforce the finite pools and the paid-course gate (uphold D17 / D23 in code)
- **Date:** 2026-09-15 · **Status:** **OPEN (recommend: adopt).**
- **Context:** D17 says mining pays from a *finite* pool; D23 gates deliverables on a FULFILLED order. In code, system pools are exempt from the non-negative guard so they overdraw indefinitely (`EpochExhaustedError` is unreachable), and `enroll` accepts any slug for free — voiding the $49 paid COURSE product and exposing DRAFT courses.
- **Alternatives:** accept the gap (contradicts the brand); floor the pools (guard `gte`) and gate enrollment on PUBLISHED + purchase.
- **Reason:** the "fixed, provable economy" is the entire differentiator; today it is neither bounded nor monetisable as designed.
- **Consequences:** mining stops at epoch exhaustion (as intended); paid courses actually require payment. Validate pool numbers against A3/A16. **Recommendation: adopt (roadmap X3/X5).**

### DR-7 — `admin/page.tsx` corruption: restore, and add a guard against recurrence
- **Date:** 2026-09-15 · **Status:** **PROVISIONAL — I restored the file in my sandbox copy only; the on-disk repo is still broken.**
- **Context:** the on-disk overview page is a byte-for-byte duplicate of the content page (likely a bad copy/paste or a merge/save accident). The correct overview is preserved in `files.zip` in the repo root; I used it to prove the rest of the build is green.
- **Alternatives:** rewrite the overview from scratch; restore the archived original.
- **Reason:** the archived original is known-good and matches the ledger/economy overview the admin nav expects.
- **Consequences:** restoring unblocks typecheck + web build. I did **not** write it back to your machine (this task was audit-only). **Recommendation:** restore from `files.zip`, then let CI's build gate (which would have caught this) run on every push (roadmap N1). Decide whether you want me to apply that one-file restore now.

### DR-8 — Delete the empty nested `tycoonhood\` folder
- **Date:** 2026-09-15 · **Status:** **OPEN (recommend: delete).**
- **Context:** `D:\TycoonHood\tycoonhood\` is a directory-only skeleton with **zero files** — an extraction/move artifact (`START-HERE.md` warns about exactly this nesting). It is not a second version; it holds nothing.
- **Alternatives:** leave it (confuses the tree and any tooling that walks it); delete it.
- **Reason:** dead, empty, misleading. **Consequences:** none — nothing references it. **Recommendation: delete (roadmap tech-debt).** I will not delete anything on your machine without your say-so.

### DR-9 — Consolidate the 11 env loaders + add `.gitattributes`
- **Date:** 2026-09-15 · **Status:** **OPEN (recommend: adopt).**
- **Context:** a fragile regex `.env` parser is copy-pasted 11×; it mis-parses CRLF, which on the documented Windows platform can make `DATABASE_URL` read as unset and `DEV_MODE=false` stay truthy (re-opening DR-2's holes) and can break migration checksums between Windows and CI.
- **Alternatives:** keep the copies; standardise on Node `--env-file`/`dotenv` and pin line endings.
- **Reason:** correctness on the primary platform; one loader instead of eleven. **Consequences:** minor refactor. **Recommendation: adopt (roadmap N5).**

### DR-10 — Stock is taken in one guarded statement (overselling closed)
- **Date:** 2026-09-24 · **Status:** **ADOPTED — shipped and covered by tests.**
- **Context:** `takeInventory` checked stock in one statement and decremented in another. Two members buying the last hoodie at the same instant both passed the check and both decremented, so the item oversold and the count went negative. There was no database floor to catch it.
- **Alternatives:** wrap in a serialisable transaction (correct but heavy, and retries would need handling); one guarded `UPDATE … WHERE inventory >= 1` (atomic by definition, row-locked by Postgres).
- **Reason:** the single statement is both simpler and stricter. A concurrent buyer either matches the remaining stock or matches nothing and is told the truth.
- **Consequences:** `CHECK (inventory >= 0)` added on both `Product` and `ProductVariant` as a second line of defence. Covered by a test that races eight buyers for three units and by a deployment check that races three buyers for one.

### DR-11 — Merch is sized; stock lives on the size
- **Date:** 2026-09-24 · **Status:** **ADOPTED.**
- **Context:** a hoodie is not one thing, it is five sizes with five separate counts. The schema had a single `Product.inventory`.
- **Alternatives:** encode sizes in separate products (`hoodie-m`, `hoodie-l` — duplicates the description, breaks the storefront); a `ProductVariant` table.
- **Reason:** one product, many sizes, is how the thing actually exists. Price stays on the product and a size may override it, because XXL genuinely costs more to make than S.
- **Consequences:** a product with no variants behaves exactly as before, so nothing existing changed. `Product.inventory` is set to `null` when sizes exist, so there is never a second count claiming authority. Sizes removed in the admin form are **retired** (`active = false`), never deleted, because past orders point at them.

### DR-12 — A physical order cannot be placed without an address
- **Date:** 2026-09-24 · **Status:** **ADOPTED.**
- **Context:** there was no address anywhere in the schema. A member could pay two months of mining for a hoodie that had nowhere to be sent, and an admin could mark it "fulfilled" without ever posting it.
- **Alternatives:** collect the address after payment (a second step people abandon, leaving paid orders unshippable); store it on the profile (changing your address would rewrite where a past parcel was sent); snapshot it on the order.
- **Reason:** the snapshot is the only version that stays true. The address is validated **before** stock is taken, so a half-filled form never holds the last unit hostage.
- **Consequences:** `FULFILLED` now means posted. `markShipped` requires a carrier and a tracking number, notifies the member, and is the only way a physical order leaves `PAID`. Orders placed before this change show "no address on this order" in the admin rather than pretending.

### DR-13 — A THC price is quoted in months of mining
- **Date:** 2026-09-24 · **Status:** **ADOPTED.**
- **Context:** the house rule is "two to three months of mining buys one item". A number typed into a form cannot be checked against that rule by eye, and a rate change silently invalidates every price.
- **Alternatives:** write prices down once and maintain them by hand; derive them from the live `MINING` config.
- **Reason:** derived. `priceInTime()` turns any price into the time it represents, the admin form shows the verdict as you type, the storefront shows it to the member, and the seed **computes** prices rather than hard-coding them — so tuning the mining rate moves every price with it.
- **Consequences:** the house rule is stated once, as `MERCH_TARGET_DAYS = { min: 60, max: 90 }`. Anything under the floor is flagged as giving merch away; anything over the ceiling is flagged as unreachable. The seeded hoodie lands at 18,000 THC ≈ 2.5 months.

### DR-14 — Referrals pay for work, never for signups
- **Date:** 2026-09-24 · **Status:** **ADOPTED.**
- **Context:** spec §17 wants a referral loop and explicitly forbids engagement farming. Paying on signup is the farm.
- **Alternatives:** pay on signup (farmable with a mail generator); pay on payment (excludes free members, who are most of them); pay on the first finished lesson.
- **Reason:** a fake account has to be carried through real study before it is worth anything, which costs more than the reward. The rest of the defence is structural rather than procedural: `UNIQUE(referredId)` means one referrer per member for life, and a `CHECK` constraint stops self-referral — neither is a rule in code that a later refactor can drop.
- **Consequences:** 2,000 THC to the inviter and 1,000 to the joiner, both on the same event, both idempotent. A bad or unknown code never blocks a signup.

### DR-15 — Watch-to-earn is timed by the server, not the browser
- **Date:** 2026-09-24 · **Status:** **ADOPTED.**
- **Context:** paying for watched videos invites a script that calls "finished" in a loop, or a muted tab in the corner.
- **Alternatives:** trust the player's callback (trivially forged); require a quiz afterwards (annoying, and answers leak); time it server-side.
- **Reason:** four defences, none of which the browser can talk its way around. The server stamps the start and refuses to settle earlier than the required watch time of real wall-clock later. `UNIQUE(userId, taskId)` means one payout per video for life. A daily cap applies in the member's **own** local day. And heartbeats must have arrived along the way, so opening and closing the page at the right interval is not enough.
- **Consequences:** this does not make farming impossible; it makes farming slower than watching, which is the only honest goal. Heartbeats are clamped to elapsed wall-clock and are monotonic, so a client cannot walk the figure backwards and re-earn. Video ids are stored, not URLs, so a task can only ever point at a video we chose.

### DR-16 — Product authoring is idempotent, and SKUs are namespaced by slug
- **Date:** 2026-09-24 · **Status:** **ADOPTED — found by the end-to-end run, not by review.**
- **Context:** saving the same product twice failed with a raw database error, because the form posts no variant ids and every save tried to *create* the sizes again. The auto-generated SKU also truncated the slug to ten characters, so two products with similar names collided.
- **Alternatives:** make the form carry variant ids (works, but any other caller still collides); match on SKU inside the service.
- **Reason:** the service is the one door, so the rule belongs there. An existing size is matched by SKU when no id is given, so re-saving updates rather than collides.
- **Consequences:** a SKU that belongs to a *different* product is now refused with a message naming that product, instead of a constraint error nobody can act on. Three regression tests cover re-saving, cross-product collision, and size retirement.

---

### DR-17 — The visual layer is "HQ", superseding the A9 "ledger" visual contract · **SUPERSEDED by DR-24 (2026-10-01)**
- **Date:** 2026-09-26 · **Status:** **ADOPTED — owner directive ("Claude Code master takeover"), implemented and verified.**
- **Context:** A9 recorded a warm espresso "vault" palette, an engraved serif hero, **"no WebGL; the hero is typographic"**. DR-1 had been waiting since 15 September on whether a 3D direction existed. The owner's takeover directive now resolves it as option **(b): build it** — a premium dark/gold ecosystem with sophisticated, purposeful 3D, a spatial "headquarters" metaphor, and the same language across every room of the product. It names no red, so none was introduced.
- **What changed:** colour, geometry, type, motion, iconography and page composition only. **Token names were kept** (`bg-0…`, `ink-1…`, `gold…`, pillar names), so every page re-skinned from one file (D14 still holds). Data contracts, the ledger, the economy, routes, authorization (DR-3) and the honest-state rule (§1) are untouched.
- **The system:** five graphite surface levels; gold `#cfa95e` as a material used for one thing per view; every text colour ≥ 4.5:1 on every surface it sits on (measured, and verified with axe on every page at 1440 and 390); control boundaries at 3.3:1; architectural radii (2–6px); Instrument Sans (display + UI) with Instrument Serif italic for a single accent phrase and IBM Plex Mono for figures — self-hosted, SIL OFL, licences beside the files; one geometric icon family (emoji removed everywhere); motion tokens 160/240/400/700ms. Reference: `docs/DESIGN_SYSTEM.md` and `/styleguide`.
- **Alternatives rejected:** polishing the ledger system (the owner judged it weak, and the audit agreed: system fonts, template cards, text-only hero, emoji icons); a light theme (dark-first is the brand; a light theme would be a deliberate alternate, not an inversion); React Three Fiber (a second rendering model and ~2× the bundle for a scene that needs none of its reconciliation).
- **Consequences:** A9's *brand* content survives — the reeded-coin mark (redrawn as solid metal), the pillar identities (muted to threads), the open-books signature band. A9's visual rules ("no WebGL", "typographic hero", espresso palette) are superseded. DR-1 is **closed**.

### DR-18 — The HQ: districts are real rooms, and 3D is tiered, lazy and optional · **SUPERSEDED by DR-24 (2026-10-01)**
- **Date:** 2026-09-26 · **Status:** **ADOPTED.**
- **Decision:** the product's spatial language is six districts — **Command Center** (`/dashboard`), **Academy** (`/programs`, `/academy`), **Arena** (`/challenges`), **Vault** (`/marketplace`), **Treasury** (`/thc`, `/status`), **Network** (`/leaderboard`). No route was renamed; the district is the name, the route is unchanged. A district with no route is not shown (there is no "Exchange" or "War Room": nothing exists behind them).
- **3D policy:** the homepage HQ is a framework-free three.js scene (`apps/web/components/hq/scene/*`: scene, camera, lighting, materials, objects, interaction, performance). It is fetched **on idle**, only for viewports ≥1280px with a real GPU, no reduced-motion, no Save-Data, not 2G. Everyone else — and anyone whose GPU cannot hold ~25fps, or whose context is lost — gets an isometric SVG drawing of the **same plan**, server-rendered, which is also the poster the scene fades in over. District labels are DOM links in both, so the hero is crawlable and keyboard-navigable with or without WebGL. `?hq=3d` / `?hq=static` override detection for QA only.
- **Cost:** homepage first-load JS 107 kB → 115 kB; three.js (~141 kB gzip) never loads on phones or constrained devices.
- **Rejected:** a video hero (heavy, not interactive, dated the moment the product changes); 3D on every page (the Command Center's signature visual — the Monument — is SVG on purpose: it must be cheap and always present).

### DR-19 — Member profiles are not indexed
- **Date:** 2026-09-26 · **Status:** **PROVISIONAL — mine, confirm or overrule.**
- **Context:** `/u/[username]` is public by design (D24) and honours per-facet privacy, but it is personal. Search engines indexing member pages is a decision about members, not a design default.
- **Decision:** `noindex, nofollow` on profiles; they remain reachable by link. Sitemap unchanged (profiles were never in it).

### DR-20 — The e2e sign-in waits for the outcome, not for idle
- **Date:** 2026-09-26 · **Status:** **ADOPTED — test bug, not a weakened test.**
- **Context:** `full-loop.mjs` clicked "Sign in" then called `waitForLoadState("networkidle")`, which resolves **immediately** when the page was already idle. It raced the server action's redirect and only passed while the dashboard rendered fast. The richer Command Center lost the race.
- **Decision:** wait for either leaving `/login` or a **non-empty** `role=alert` (Next's route announcer is an always-present empty alert). Same assertions, now deterministic: 39/39.

### DR-21 — Members live in the HQ: a walkable 3D campus is the signed-in home (extends DR-18) · **SUPERSEDED by DR-24 (2026-10-01)**
- **Date:** 2026-09-29 · **Status:** **ADOPTED — owner direction ("explorable 3D world", "cinematic, near-photoreal", "the whole experience").**
- **Context:** The owner rejected the DR-17/18 result as "just info". DR-18 made 3D a tiered, optional hero. The owner asked for the world to be *the* interface.
- **Decision:**
  - Sign-in, register and onboarding land on `/world`: a campus at dusk with six enterable buildings (Command, Academy, Arena, Vault, Treasury, Network). Each room shows the member's live state and real actions: check-in, continue lesson, open in Vault, Treasury figures.
  - The 2D pages remain the source of truth and the fallback. Every room links to its page, and the world never holds logic the pages do not.
  - Quality is tiered before three.js loads: cinematic, balanced or performance, plus the 2D view for reduced motion, no WebGL2 or software GPUs. A frame governor steps down on sustained slow frames.
  - The homepage flies over the same campus (`tour` mode, no models) on capable desktops only. Phones and everything else keep the architectural drawing.
  - `/world` is `noindex` and disallowed in `robots.ts`. It is behind `requireUser()` (DR-3).
- **Consequence:** DR-18's "3D is optional" still holds for guests. For members it is the default, with "2D view" one click away.

### DR-22 — Presence in the world is counts, never people · **SUPERSEDED by DR-24 (2026-10-01)**
- **Date:** 2026-09-29 · **Status:** **ADOPTED.**
- **Decision:**
  - The world shows activity as 24-hour **counts** per district: lessons completed, challenges joined, orders, mining payouts, rank-ups and missions completed. They are drawn as anonymous figures, capped.
  - The Network room shows members per rank (`groupBy rankId`). No name, avatar, username or location of another member reaches the world payload.
  - The member's own data (balance, streak, lessons) is the only personal data it carries.
- **Why:** DR-19 already keeps profiles out of search. A world that shows "who is here" would publish exactly what DR-19 hides. Real-time, named presence is a product and privacy decision for the owner (OQ-G).

### DR-23 — World assets are ours, or credited · **SUPERSEDED by DR-24 (2026-10-01)**
- **Date:** 2026-09-29 · **Status:** **ADOPTED.**
- **Decision:**
  - Every stone, brass, oak, concrete and hedge texture and every facade is generated in code: `scripts/world/generate-textures.mjs` and `components/world/architecture/facades.ts`.
  - Third-party assets are limited to two CC BY 4.0 Wayfair models from the Khronos glTF sample set and two CC0 Poly Haven HDRIs.
  - CC BY attribution is on `/credits` (linked in the footer), copied from each file's embedded `asset.copyright`, and mirrored in `public/world/CREDITS.md`.
- **Constraint recorded:** the build sandbox cannot reach Poly Haven, ambientCG or most CDNs. Scanned PBR sets would raise realism further; adding any means adding its licence line to both places.

### DR-24 — Tycoonhood is an academy app; the Miner is the only game (supersedes DR-17, DR-18, DR-21, DR-22, DR-23)
- **Date:** 2026-10-01 · **Status:** **ADOPTED — owner direction:** "a serious motivational course and working area… a standard application… mining part is the only game." Owner answers: in-app chat, an installable web app, and progress kept as a serious record with no leaderboard.
- **Removed:**
  - The 3D world (`/world`), the homepage fly-over, and the HQ/district vocabulary: Command Center, Arena, Vault, Treasury and Network as product names.
  - The leaderboard.
  - The CC BY models and the `/credits` page that existed only for them.
- **The product now:**
  - A public website (`/`, `/programs`, `/marketplace`, `/thc`, …).
  - A member app in a standard shell: a sidebar on desktop; on phones, a top bar, tabs and a "More" sheet.
  - The app's screens are Today, Courses, Community, Challenges, Store, Wallet, Profile, Notifications, Settings and Admin.
  - Old URLs redirect temporarily: `/dashboard`, `/academy/*`, `/leaderboard` and `/world`.
- **Design language:**
  - Kept: the dark ground and the gold accent.
  - Gold is now reserved for the primary action and progress.
  - 8–12px radii, one sans family, tabular numerals, round-cap icons.
  - The serif italic accent survives only on the public website.
- **Why the old direction failed:** "rooms", monospace labels and a 3D world read as a game or an AI workspace. A member needs to find the next lesson in one click.

### DR-25 — Lessons open in order; a knowledge check completes only by passing
- **Date:** 2026-10-01 · **Status:** **ADOPTED.**
- **Decision:**
  - A lesson opens when every earlier lesson in the program is complete. The order is module order, then lesson order.
  - Completed lessons stay open for review.
  - A lesson with a quiz completes only through `submitQuiz`; `completeLesson` refuses it (`QuizRequiredError`).
  - A locked quiz is not scored.
  - The same pure rule (`lms/gating.ts`) draws the screens and enforces the server.
- **Kept on purpose:** each quiz's own pass mark (default 70%), explained answers and unlimited retries. "100% or blocked" is a known complaint about chat-first academies and was not copied.
- **Before this:** the server let any enrolled member complete any lesson, including a quiz lesson, by calling the action directly.

### DR-26 — The daily standard and the in-app community
- **Date:** 2026-10-01 · **Status:** **ADOPTED.**
- **The daily standard:**
  - The house sets the items; a member may add up to five of their own.
  - A member's first tick of the day emits `DAILY_ACTIVE`, so the existing "Show Up" mission decides its worth. No new reward numbers were invented.
  - Meeting every item advances the streak.
  - "Study" ticks itself from a completed lesson and cannot be ticked by hand.
  - Days are the member's local days.
  - *Behaviour change:* a member's first lesson of the day now also counts as showing up.
- **The community:**
  - Channels are house-wide (Announcements, General, Wins) plus Discussion and Questions per program. Program channels are readable only by members enrolled in that program.
  - A question asked from a lesson carries that lesson. Wins carry a proof link.
  - Moderation tools: slow mode, reports, staff removal, mutes, and staff pins.
  - There are no direct messages, and no reactions.
  - New messages arrive by polling a members-only JSON feed every 4s while the tab is visible, so no socket server has to be run.
- **Rank stays unfarmable:** nothing posted in chat raises rank. `COMMUNITY_CONTRIBUTION` (the contributor achievement) counts only staff-pinned messages that are still standing.
- **Installable app:**
  - A manifest that opens on `/today`, with icons, an offline page and an install button (the iOS steps are shown).
  - The service worker never caches pages or API responses; it caches only hashed build assets and icons.
  - Push notifications are not built (OQ-K).

### Open — decisions only the owner can make (surfaced by the takeover, not invented)
- **OQ-A · The progression ladder.** The directive sketches START → DISCIPLINE → KNOWLEDGE → EXECUTION → BUILDING → LEADERSHIP → TYCOON (seven stages). The live system has five seeded ranks, *Tycoon Initiate → Apprentice → Mastermind → Elite → Legend*, wired to level thresholds and Discord roles. I kept the five and drew them as the Ascent and the Monument's tiers. Renaming or re-cutting ranks is a data migration plus a Discord role change — your call.
- **OQ-B · Three pillars or four.** The directive names Warrior, Business Mastery and Mindfulness. The academy has a fourth published program, *Financial Planning and Investment Advisory* (Tycoon pillar), whose name already carries the legal flag in §3. I kept all four; the "Investment Advisory" wording still needs counsel or a rename.
- **OQ-C · "Enroll — free" on every program.** Enrollment is free for every published course in code (DR-6 is still open), while a paid *Warrior Program* product exists in the Vault. The UI states what the code does. Decide DR-6 and the copy follows.
- **OQ-D · Draft programs on the public Academy.** *(Resolved by DR-29: drafts are hidden.)* `/programs` lists DRAFT courses with an "In production" tag (pre-existing behaviour, kept). Hide them until published?
- **OQ-E · Hero line.** "Build yourself. / The rest compounds." — chosen by me from §55 of the directive (wealth as the compounding outcome of capability). Overrule freely; it is one string. **Changed 11 Nov 2026 (full-platform build, spec A):** the hero is now the four-line positioning "Master yourself. / Build your skills. / Create your wealth. / Own your freedom." (sentence case; last line in the accent face). It is admin-editable (Admin → Site & CMS, SiteSetting `home`), with the default in `packages/core/src/platform/settings.ts`. The old line is retired from the homepage and footer.
- **OQ-F · Photography.** *(Resolved by DR-28.)* Real photos are in. Replace any of them with your own shoot by setting a program's cover in Admin → Content, or by swapping the files in `apps/web/public/photos/`.
- **OQ-G · Named, live presence.** *(DR-24: the world is gone; the question now only concerns showing who is online in Community.)* Should members see *who* is in a room right now (names, avatars), not just counts? It needs realtime infrastructure (the stack has none), a per-member visibility setting, and a moderation posture. DR-22 ships counts until you decide. *2026-11-11 — the world is reopened as an optional extra by DR-31. It still shows counts only, so this question stands.*
- **OQ-H · Where members land.** ~~Sign-in lands in the HQ (DR-21).~~ Superseded by DR-24: sign-in lands on Today.

- **OQ-I · The house standard and house rules.** The five standard items (Train 30 min, Study one lesson, Deep work 90 min, Read 10 pages, Plan tomorrow) and the five community house rules were written by me as reasonable defaults. Both are yours to change: the standard in Admin → Daily standard, the rules in `components/community/community-frame.tsx`.
- **OQ-J · Moderators.** *(Resolved by DR-29: a MODERATOR role now exists.)* Only ADMIN accounts can pin, remove, mute and post announcements. A separate MODERATOR role (staff who cannot touch the economy) does not exist yet.
- **OQ-K · Push notifications.** The installable app shows notifications inside the app only. Phone push needs VAPID keys and a decision about what is worth interrupting someone for.
- **OQ-L · Realtime.** Chat polls every 4 seconds. That is fine into the low thousands of concurrent members; past that, move to a hosted realtime service (e.g. Pusher/Ably) or SSE behind Postgres LISTEN/NOTIFY.
- **OQ-N · "Burned, not minted."** The rig upgrade copy says the cost is burned. In the ledger it is a spend to the REVENUE system account — it leaves the member's wallet and no new THC is created, but it is not destroyed. The Mining page says exactly that. Decide whether upgrades should truly burn (move to a sink account excluded from supply) or whether "burned" should leave the copy.
- **OQ-O · The old Miner app.** `apps/miner` now only forwards (308) to `/mining`. Its old components, actions and auth file are unused but still compile. Delete the app, or keep it as a redirect for old installs/bookmarks?
- **OQ-M · Memberships.** Everything is still free to join and enroll in (OQ-C). The academy now has the shape of a paid product; pricing is your call.
- **OQ-P · An email change the owner did not make.** *(Decided 2026-11-11: option 1 (undo link, 7-day hold). Built as described in DR-32. 2026-11-12: a second change waits until the last one can no longer be undone.)* Someone who knows the password and controls the new address can confirm a change before the owner reacts (DR-32). Two ways to close it: (1) an undo link in the "your email was changed" notice, valid about 7 days, that restores the old address, signs out every session and asks for a new password (the old address must be held for those days so no one else can register it); (2) holding the switch for a waiting period during which the old address can cancel it. Either changes how every member's email change works, so it is your call. **Trade-off of option 1:** whoever controls the old mailbox can undo a genuine change within 7 days. That is the same trust the old address had before the change.

### DR-27 — The Miner lives inside the app; the product is illustrated

- **Decision (owner, 2026-10-01):** "Inside the app" and "Photos + graphics".
- **The Miner** is a Mining tab in the member app: `/mining` (the Rig: an animated, drawn rig whose GPUs, fans, storage tank and coin flow show the member's real level, storage and accrual), `/mining/tasks` (watch-to-earn), `/mining/squad` (referrals) and `/mining/ranks`. It runs with plain `pnpm dev`. Mining is one of the four phone tabs; Challenges moved to "More". Today shows a compact rig card. The old Miner app at :3001 redirects every page here with a permanent redirect.
- **Visuals** are drawn in code and draw real numbers only: a pillar scene per program (barbell under a spotlight, a rising structure, coin stacks under a compounding curve, a still lake), a sky on Today set by the member's local hour, a progress ring for today's standard, a streak flame that grows at 1/7/30 days, rank emblems by ladder position, and achievement medals (earned in gold, not yet earned in iron). The homepage shows the app on a phone with the real house standard, and the rig as an illustration that has no member's numbers on it.
- **Photos:** a cover-photo slot per program (see OQ-F).
- **CSP:** `script-src` now allows `https://www.youtube.com` and `https://s.ytimg.com` so the watch-to-earn player's iframe API can load (it was blocked before, in the old Miner app too).

### DR-28 — Real photographs, graded to the house look

- **Decision (owner, 2026-10-01):** "i want real cover photos too … images matching its theme."
- **Source:** nine Unsplash photos (Unsplash License — free for commercial use, no permission needed; credits kept in `apps/web/public/photos/CREDITS.json`). Chosen for the theme: a barbell in a shaft of light (Warrior), a city at night with cranes (Business), stacked coins in the dark (Tycoon — crypto-branded coins and trading screens were deliberately passed over), a lone figure at dusk (Mind), a dumbbell in chalk dust (30 Days of Iron), a laptop glowing in the dark (Launch Week), a fountain pen under a lamp (The 1% Ledger), a desk and notebook under a lamp (homepage close), a skyline at last light (sign in / register).
- **Grade:** every photo is processed the same way — less saturation, a warm shift, crushed blacks and a vignette — so the set reads as one shoot on the near-black ground.
- **How they were made:** the build sandbox cannot reach any image host, so `.github/workflows/covers.yml` runs `scripts/covers/run.mjs` on a GitHub runner and commits the files back. Pass 1 rendered numbered contact sheets of 47 candidates for review; pass 2 built the nine chosen photos at two widths as WebP. Re-run it by editing `scripts/covers/selection.json`.
- **Where:** program covers everywhere (Courses, Today, program pages, homepage), challenge banners, the sign-in/register side panel, and the homepage's closing band. An admin cover (Admin → Content) still overrides a program's photo.
- **Kept drawn:** the rig, the Today sky, rank emblems, medals, the streak flame and the phone preview — those draw live numbers, which a photo cannot.
- **Fixed alongside:** the CSP's `img-src` only allowed the site itself, so an admin cover given as an `https://` URL would have been silently blocked. It now allows `https:` images.

### DR-29 — The full platform (11 Nov 2026 build spec); partly reverses DR-24 and DR-26
- **Date:** 2026-11-11 · **Status:** **ADOPTED — owner direction:** Marshall uploaded the "Tycoonhood Complete Product Build Prompt" and asked for the whole platform to be built.
- **Reversed from DR-24 / DR-26, on the owner's spec:**
  - The **leaderboard** is back (`/leaderboard`, weekly and all-time XP). Members can opt out in Settings. It ranks XP only, never THC or money.
  - **Reactions** exist on discussion posts and comments (not in the chat channels).
  - A **forum** (categories, posts, comments, groups) sits beside the chat channels from DR-26. The chat is unchanged.
- **Roles:** seven, in `packages/core/src/auth/permissions.ts`: Guest (no session), Member, Student (set automatically on first enrolment), Creator/Affiliate, Instructor, Moderator, Admin. Pages and actions ask `can(user, permission)`; nothing compares role strings. This answers **OQ-J**: Moderators can moderate and post announcements but cannot touch the economy.
- **Money:**
  - THC stays an internal, non-monetary credit (unchanged).
  - Affiliate commissions are a separate programme, tracked in **INR** on paid rupee orders: 10% of what the buyer paid, held 14 days, then reviewed by an admin. Minimum payout ₹500. They have nothing to do with the THC referral reward.
  - No guaranteed-income wording anywhere.
- **Payments:**
  - Razorpay is the rupee rail. With no keys, development runs a clearly labelled sandbox; production without keys hides card checkout.
  - `rzp_test_…` keys are treated as TEST: they are labelled as test, excluded from revenue, and any commission on them is flagged "do not pay out". Only `rzp_live_…` keys are LIVE.
  - No payment is ever simulated outside the labelled sandbox.
- **Curriculum:** four programmes (Warrior, Business Mastery, Financial Planning & Investment, Mindfulness & Wellness), each with 8 modules × 3 taught lessons + a module quiz, then a 12-question final assessment. That is 96 taught lessons. The certificate requires passing the final.
- **OQ-D answered:** draft programmes are no longer listed publicly; `/programs` shows published ones only.
- **3D world:** optional only, and it must never gate a feature. Its return is the owner's call (decision card in the build thread).
- **Founder:** the About page features HARSHA with the photo supplied by the owner (`apps/web/public/founder/harsha.jpg`). Only that photo is used.

### DR-30 — Author Markdown is sanitised (supersedes D16's "no sanitizer layer")
- **Date:** 2026-11-11 · **Status:** **ADOPTED** — security fix from the platform review.
- **Why:** D16 rendered Markdown unsanitised only while authorship stayed internal. DR-29 gave lesson and course authoring to the Instructor role, so an instructor could store script that ran in the browsers of learners, guests and admins.
- **Decision:** every Markdown body renders through `renderMarkdown()` in `packages/core/src/content/markdown.ts`: marked, then sanitize-html with an allowlist of what Markdown produces.
  - No script, style, iframe, SVG or MathML. No event handler, style, class or id attributes.
  - Links go only to http, https, mailto or a path on this site; images only to http, https or a path. External links get `rel="noopener noreferrer nofollow"`.
  - Used by the lesson page, programme previews, the admin editor's preview (in the browser), blog posts and library items. ESLint blocks importing marked or sanitize-html anywhere else.
- **Fixed alongside:** JSON-LD is written with `jsonLdHtml()`, which escapes <, >, &, U+2028 and U+2029, so a course title cannot end its script block. The CSP's `frame-src` allows `https://player.vimeo.com`, so Vimeo lessons play.
- **Not done here:** `script-src` still allows `'unsafe-inline'`. A nonce-based CSP would add defence in depth.

### DR-31 — Optional 3D campus at /world (answers DR-29's decision card; partly reverses DR-24)
- **Date:** 2026-11-11 · **Status:** **ADOPTED — the owner's choice on the DR-29 decision card:** "Restore it as optional".
- **Decision:** the 3D campus returns at `/world` for signed-in members, as an extra. Nothing depends on it, it never gates a feature, and every action in it is a link into the 2D app.
- **Who gets it:** desktops with a hardware GPU only.
  - Phones, tablets (an iPad that asks for the desktop site included), windows under 1024px, reduced motion, data saver, no WebGL2 and software GPUs get the 2D page at the same address. That page is complete on its own: one card per building, with the member's figures and every link.
  - The device decides after the page loads, before anything 3D is downloaded: the device first, then the GPU (one probe canvas, released at once), then the quality tier. `?world=cinematic|balanced|performance` picks the tier for QA; no override skips a gate.
  - The 2D page stays up while the campus loads, with a "2D view" button that stops the downloads.
  - A failed load, a load that makes no progress for 20 seconds, a lost GPU, slow frames (judged against the display's own frame rate, so a browser capped at 30 Hz is not "slow"), reduced motion switched on, a window made narrower than 1024px, or the member's own "2D view" returns to the 2D page and disposes the engine down to its GL context.
- **One way in:** a link at the foot of the desktop sidebar, marked "optional", shown only where the campus can open and never prefetched. It is not in the tab bar, the More sheet or `components/app/nav.ts`. There is no homepage fly-over and no HQ stage; DR-21 stays retired.
- **Landing:** sign-in, register and onboarding still land on `/today`, and the homepage is unchanged. `/login?next=/world` returns to `/world`, as it does for any page.
- **Names:** product names only: Today, Courses, Community, Leaderboard, Mining and Store. The DR-24 vocabulary (Command Center, Arena, Vault, Treasury, Network, HQ) stays retired.
- **Counts, never people (DR-22's rule, restated for `/world`):** the page carries the member's own figures and house-wide counts for the last 24 hours. The Leaderboard building shows members per rank as heights. No other member's name, username, avatar or email reaches the page. Named presence is still OQ-G.
- **Assets are ours or credited (DR-23's rule, restated):** today that means only the textures generated by `scripts/world/generate-textures.mjs`. The CC BY models, the HDRIs and `/credits` stay removed. Anything added later must be CC0, or credited in `apps/web/public/world/CREDITS.md` and on a public `/credits` page before it ships.
- **The bundle rule:** three.js reaches the browser only through `components/world/world-host.tsx`, by `import()` once both gates pass. An ESLint rule rejects any other static import of `three`, `postprocessing`, `n8ao` or the engine folders. After `pnpm build:web`, `node scripts/world/check-bundle.mjs` fails if any route's chunks carry three's renderer, or if the engine chunk is missing.
- **No decorative loops:** nothing in the scene moves unless the member moves.
- **Versions:** `three`, `postprocessing`, `n8ao` and `@types/three` are pinned to exact versions and upgraded together.
- **Security:** the page calls `requireUser()` (DR-3). Its loader, `packages/core/src/world/load.ts`, only reads. `/world` is `noindex`, disallowed in `robots.ts` and absent from the sitemap. The CSP is unchanged.
- **Checked by:** the core tests `packages/core/test/world-*.test.ts`, and browser journey 9 in `scripts/e2e/journeys.mjs` (with `TH_WORLD_ENGINE=1` it also loads the engine on Chromium's software GPU and drives each way back to 2D).
- **Supersedes:** only DR-24's removal of `/world` and its temporary redirect to `/today`. The rest of DR-24 stands, and DR-17, DR-18 and DR-21 to DR-23 stay superseded.

### DR-32 — An email change waits for the new address, and the account's address is told about account changes
- **Date:** 2026-11-11 · **Status:** **ADOPTED** — account-security fixes P2 and P3 (ASVS V2.2.3). The undo link and the 7-day hold were added the same day (OQ-P, option 1).
- **Before:** Settings changed `User.email` at once, on the current password alone. Anyone who knew the password could move the account to their own address, and reset links then went there. Reset links also outlived a password change or an email change.
- **Now:**
  - The address asked for waits in `User.pendingEmail`. A link (24 hours, single use) goes to it. Until the link is used, the current address still signs in and still gets reset links.
  - The current address is told about the request. The notice shows the new address masked ("ne***@ex***.com") and says to change the password if it wasn't them.
  - Using the link moves the account in one transaction. The address must still be free, and the account becomes verified at it. Every link for the old address, every reset link and the change link die. Every other session is signed out; the browser that used the link stays signed in only if it is the member's. The old address is told.
  - A password change in Settings, or a reset, cancels a waiting change and spends every reset link. The account's address is told the password changed.
  - With no mail provider, an email change is refused: its link could never arrive.
  - Resending the change link shares the confirmation-resend limit: three an hour per member.
- **Not unique:** two accounts may wait for the same address. The unique `email` decides who gets it; the other confirmation fails with a clear message and the waiting change is dropped.
- **Undo (OQ-P, option 1):** someone who knows the password and controls the new address can still move the account with one click on the link, but the old address can now take it back.
  - The address a change replaced is held for the account for 7 days (`EmailHold`, migration `20261111200000_email_hold`). No one can register with it, and no other account can ask for it or move to it; each refusal uses the words a taken address gets, so it does not say who holds what. The hold ends early when the undo is used, or when the member moves back to the address with a normal change.
  - The "your email was changed" notice to the old address carries an undo link: single use, valid 7 days, stored as a hash on the hold and bound to the account and both addresses. Each change ends every earlier link, so only the latest change can be undone.
  - Using it, in one transaction: the old address is back on the account, verified; a waiting change is dropped; the password is replaced by one nobody knows; every session is signed out; every confirmation, email-change, reset and undo link dies; and one new reset link is made. The browser that used the link goes straight to the new-password page with it. The restored address gets a confirmation, and the removed address is told the change was undone (each shows the other masked). Audited as `auth.email.undo` (from, to) and `account.password.revoke`.
  - An undo and a confirmation for the same account take one lock, so they never interleave: whichever is second fails. A password change now checks the password again under the credential lock, as an email-change request does, so one that checked the old password before an undo cannot land after it.
  - The notice to the current address now goes out before the reply, started before the link to the new address; neither send waits on the other.
  - Staff with `admin.users` see a waiting change and any held address (with when its hold ends and whether its undo link still works) on the member's admin page, and can cancel the waiting change, audited as theirs. There is no tool to set an email.
- **Updated 2026-11-12 (the two limits found in review are closed):**
  - **No second change while the last one can be undone.** Someone who knew the password and controlled two new mailboxes could otherwise change twice within minutes: the second change would end the first change's undo link, and the owner would have no way back. A change request is now refused while the account's last change still has a live undo link (`EmailChangeTooSoonError`, which names when it opens and points to the undo link). The request takes the account's address lock first, so a change taking effect at the same moment is always seen. A member who used the undo, or whose 7 days ran out, can change again. Settings shows the message; the undo link is the way back for a member who changed to the wrong address.
  - **Sign-in cannot outlive a password change.** A sign-in now opens its session only while the password is still the one it matched (`SessionService.createForPassword` reads the credential row `FOR SHARE`). A sign-in that matched the old password just before an undo, a reset or a password change fails like a wrong password; one that lands first is signed out by it.
  - An undo that Postgres ends to break a deadlock with a password reset at the same moment starts over (up to 3 tries) instead of failing. *(As built that day, the retry looked for P2034 only and never saw a deadlock; corrected below.)*
- **Updated 2026-11-12 (second review):**
  - **Undo only for a confirmed address.** Registration never requires a confirmed address, so the one a member changes away from may never have been theirs (a typo at registration). An undo link sent there would hand the account to whoever reads that mailbox. A change away from an address the member never confirmed holds nothing and makes no undo link: the old address gets a notice with no link that points to /contact, is free to register at once, and the next change need not wait. Settings promises the undo link only when the current address is confirmed.
  - **The change stands only if its old address got the undo link.** The link exists only in the request that confirmed the change, so the notice carrying it is now sent before the reply, and its outcome is read. When it cannot go out (no mail provider, or the provider refused it), the change is put back at once: the old address is back on the account, and the hold, the reset links and any links for the removed address end. The password stays, because only the telling failed. Sessions stay as the confirmation left them: the browser that used the link stays signed in, and the other devices it signed out stay signed out. Audited as `account.email.change.revert` (reason `notice-not-sent`). The member is told the change didn't go through, that they may need to sign in again on their other devices, and to ask again; the message does not name the old address.
  - **One lock order for every account flow.** A change request, its resend, confirmation or cancellation, an undo, a reset request, a reset and a password change all take the account's lock first (`lockEmailOf`), before any row. Two of them for one account run one after the other and never deadlock; the second sees what the first did (a resend after a confirmed or cancelled change is refused, and a resend never mails one address a link that moves the account to another). Should Postgres still end one of them (deadlock 40P01, or 40001), the retry now recognises it in every shape this client throws (`packages/core/src/db/retry.ts`, tested against real deadlocks).
  - **Reset links are not revoked by new requests.** Anyone who knows an address can ask for a reset link, so asking no longer ends the earlier ones; it would have ended the one an undo hands its owner. A request clears links that ran out and issues nothing while 3 are live (`RESET_LIVE_LIMIT`), with the same reply either way. It is made under the account's lock, and only while the account still has the address asked for.
  - **Deletion requests follow the account** (`ContactMessage.userId`, migration `20261112000000_contact_message_user`), whatever its address becomes. An undo closes one filed since the change it reverts (`account.delete.request.close`, reason `email-undo`); one the owner filed before stays open.
  - **The refusal names the minute.** `EmailChangeTooSoonError` names the date and time a change opens: India time in core, the member's own zone in Settings.
- **Updated 2026-11-12 (third review):**
  - **A change away from an address never confirmed waits a day.** That address gets no undo link, so once such a change happens nothing puts it back. Anyone with the password alone could ask for a change and use the link seconds later, before the owner could act on the notice, and the owner had no way back: forgot-password no longer finds the account, and staff cannot set an email. The link now works only from the first whole minute a day after the request (`UNCONFIRMED_CHANGE_WAIT_MS`; the request time is `User.pendingEmailAt`, migration `20261112110000_pending_email_at`).
    - The notice to the address names that time (India time, as in every email) and says to change or reset the password before then. A new password cancels the change, as before. The link mail, the reply in Settings and the settings page name the time too, the last two in the member's own zone.
    - A link used early is refused and not spent (`EmailChangeNotYetError`, "This link works from …"). It then works for 24 hours. A resend keeps the wait; a new request starts it again, and its notice tells the owner anew.
    - An owner who confirms the address meanwhile need not wait: the change goes ahead, and the address is held with an undo link.
    - A stranger at a typo address gains nothing from the wait: while the account has that address, they can already reset its password.
    - Not built: an audited staff tool that sets an account's email after identity checks, the review's other option. The wait gives the owner a way back without one; the notice after the change still points to /contact.
  - **A change stands only once its notice is recorded as sent.** The second review put a change back when its notice could not be sent, but only if the request lived that long. A provider that never answered held the request until the platform ended it, and a crash or a deploy at that moment did the same: the change stood, with an undo link nobody received.
    - A send gives up after 10 seconds (`MAIL_SEND_TIMEOUT_MS` in `apps/web/lib/mail/resend.ts`) and counts as not sent.
    - The hold records when the provider accepted the notice (`EmailHold.noticeSentAt`, migration `20261112100000_email_hold_notice_sent`). If the notice went out but cannot be recorded, the change is put back too.
    - A change whose notice is still not recorded 10 minutes after it took effect (`NOTICE_GRACE_MS`, longer than any request runs) is put back the same way (`platform/email-notice.ts`). A daily cron does it (`/api/cron/email-holds`, so `CRON_SECRET` is now required). So does whatever would otherwise trust the hold, first: a new change request for the account, a reset request for either address, and the member's admin page. It never runs once the hold has run out, because the old address may be someone else's by then.
    - If putting the change back fails in the request, the member is told the change won't go through and will be undone on its own.
  - **A reset link that could not be sent is revoked.** Links whose email never went out still counted towards the three live links. A provider outage, or refused sends someone provoked, could keep the owner from getting a link for 30 minutes. The web app now revokes such a link at once, and only that link (`PasswordResetService.revoke`).
  - **Confirmation links take the account's lock too.** Issuing, resending and using the link that confirms a member's address now take `lockEmailOf` first, like every other account flow. They could deadlock with a change being confirmed. A link used at that moment could also confirm an address the change had just moved off, so the address was left with no hold and no undo link. Now whichever comes second sees what the first did.
  - After a change is put back because its notice was not sent, the devices the confirmation signed out stay signed out; the second review's entry above now says so (it said every session stays).
- **Trade-off:** whoever controls the old mailbox can undo a genuine change within 7 days. That is the same trust the old address had before the change, and an address never confirmed gets no undo. A member waits 7 days between email changes unless they use the undo or their old address was never confirmed. A change whose notice cannot be sent does not go through, so with no mail provider no confirmed address can be changed. A change away from an address never confirmed waits a day before it can happen, so a member who registered with a typo waits a day to fix it.

### DR-33 — One Vercel project; production builds migrate the database, and the first one seeds it
- **Date:** 2026-11-12 · **Status:** **ADOPTED** — the owner chose "Yes, deploy it for me" on 12 November, for a launch on 13 November. Supersedes LAUNCH.md's two-project plan and its "migrations are never run from a build" rule.
- **Why the build:** the database credentials are Vercel "sensitive" variables. Nobody can read them back, so a migration run from a laptop needs the owner to copy the connection string out of Neon by hand. The build is the one place that already has them.
- **Now:**
  - The site is the Vercel project `tycoonhood`, Root Directory `apps/web`. `apps/miner` only redirects (DR-27) and is not deployed.
  - `scripts/vercel-build.sh`: a production build applies pending migrations over the direct connection; with `SEED_ON_DEPLOY=1` it runs the five seeds in order; then it builds. A preview build only builds: previews come from unmerged branches and receive the production `DATABASE_URL`.
  - `SEED_ON_DEPLOY` is set for the first deploy only. Every seed is idempotent, but a later re-run would rewrite content staff have edited since.
  - The admin account comes from `ADMIN_EMAIL` and `ADMIN_PASSWORD`, which the owner sets in Vercel. No password passes through chat or a commit. With `SEED_ON_DEPLOY=1`, the build stops before touching the database if either is missing, and the seed itself refuses to run without a password (DR-5).
  - `AFFILIATE_HASH_SECRET` and `CRON_SECRET` were generated and stored as sensitive variables.
  - Functions run in `iad1`, the Neon database's region, not `bom1`: a page makes several queries, and each would otherwise cross the world.
  - Both `vercel.json` files lost their `"//"` comment key, which Vercel's schema rejects; it failed the deploy of 11 November before the build started.
- **Updated 2026-11-12 (review findings 17 to 19):**
  - **A re-run never rewrites what staff edit (17).** The rehearsal's "a second run changed nothing" looked at exit codes, not rows. That run repriced the Warrior Program to ₹49 and the tee to ₹32, reset stock, put products back on sale, moved challenges back to UPCOMING with new dates, and rebuilt the programmes. Now every seed adds what is missing and refreshes only what no admin screen edits: levels, ranks, achievements, and a challenge's name, description and rewards. Products, essays, missions, community rows and coupons are created once. A challenge keeps its dates and status. `seed:shop` and `seed:merch` touch only money still in another currency, which only a seed writes. `seed:academy` builds each programme once (SiteSetting `seed.academy.built`); only `SEED_ACADEMY_FORCE=1` rebuilds. `packages/core/test/seed-rerun.test.ts` proves it row by row. Missions, sizes, essays, community categories and groups are made once even if staff change their slug or SKU: the seeds record what they made (SiteSettings `seed.created.*`, `packages/db/src/seed-record.ts`), because a renamed mission made again under its old slug was live and paid twice, and a size made again under its old SKU went on sale with stock that did not exist. `SEED_ON_DEPLOY` still comes off after the first deploy: seeding slows every deploy, and a renamed programme comes back as an empty draft.
  - **The admin's address is stored the way sign-in reads it (18).** `ADMIN_EMAIL` is checked with sign-in's own rule (`packages/db/src/admin-email.ts`, the same zod chain as `loginSchema`), trimmed and lower-cased before every use. A value sign-in would refuse, quote marks included, stops the build before it touches the database. A re-run finds the admin whatever the case, and repairs one an older seed stored with capitals, keeping its password. `ADMIN_EMAIL` makes the first admin only: once an admin can sign in, an address no account has creates nothing, and a re-run changes no role. Only when no admin can sign in does the seed create the account (with a free username, `admin_2`, …, if "admin" is taken) or promote it. It never takes an address held after an email change, which would break that account's undo link.
  - **Deploys take turns (19).** The build's migrate-and-seed step runs under a Postgres advisory lock (`scripts/with-db-lock.mjs`). `migrate-sql` holds Prisma Migrate's own lock for its whole run, and `db:seed` makes the system ledger accounts and genesis one seed at a time. A second build waits, then finds the work done. The locks use `DATABASE_URL_UNPOOLED` when it is set, refuse Neon's pooled address, and give up after 15 minutes. Everything under the lock works on the database it was taken on (the wrapper hands that address down as `DATABASE_URL`), and the build, `deploy:db` and `db:migrate:sql` stop before they connect when `DATABASE_URL` and `DATABASE_URL_UNPOOLED` name different databases: before, the migrations went to one and the seeds to the other. A lost lock connection or a stop signal ends the step's whole process group (SIGKILL after 10 seconds), not just its first process, and the lock connections probe after 10 seconds of silence. See `docs/DEPLOYMENT.md`, "Two builds at once".
- **Rejected:** running migrations by hand before each promotion (needs the connection string copied out of Neon each time, and is easy to forget); a Vercel deploy hook or GitHub Action holding a second copy of the credentials (two places to rotate).
- **Trade-offs:** a migration that applies before a later step fails stays applied while the previous deployment keeps running, so migrations must stay safe for the code live before them. Previews can still read and write the production database when someone uses one; they are behind Vercel login, and a Neon preview branch is the fix. Pages from India travel to Washington and back: moving the database and functions to Mumbai is on the roadmap.
- **Rehearsed** on 12 November from a fresh clone with no `.env`, against an empty PostgreSQL 16: 12 migrations, five seeds and the build in 81 seconds; ~~a second run changed nothing~~ a second run finished without an error, but it did change rows (finding 17, in the update above), and `packages/core/test/seed-rerun.test.ts` is now the proof, row by row, that a second run changes nothing; `next start` served the pages and the cron endpoint. See `docs/TEST_REPORT.md`.

### DR-34 — An instructor edits only the programmes they teach; course managers manage the rest (narrows DR-29's Instructor role)
- **Date:** 2026-11-12 · **Status:** **ADOPTED** — P0 permissions fix from the Living Ecosystem directive review (§2, §12, §17).
- **Before:** the Instructor role held `courses.author`, and `courses.author` reached every programme. Any instructor could rewrite or delete any programme's modules, lessons, knowledge checks and resources, add links to them, and set any programme's instructor. They could also create, edit and delete any instructor profile (a public page), hide reviews, and read reviewers' email addresses. `Instructor.userId` existed, but nothing ever set it, so no account was tied to a profile.
- **Now:**
  - A new permission, `courses.manage`, held by Admin only, covers every programme, each programme's instructor, the instructor profiles, and which account each profile is linked to.
  - `courses.author` (Instructor and Admin) is scoped by ownership: it creates programmes and edits the programmes taught by the instructor profile linked to the account. Role gives the capability; the link gives the scope.
  - Core enforces it. Every authoring write (programme, module, lesson, knowledge check, resource) finds its programme from the target's own id and calls `assertCanEditCourse(actor, courseId)`. That allows a holder of `courses.manage`, or an author whose linked profile teaches the programme. A refused write changes nothing and writes no audit row. The pages check too (`canEditCourse`, `editableCoursesWhere`), but core is the wall.
  - A programme an instructor creates is theirs: its instructor is their own linked profile. An account with no linked profile cannot create one, and is told why. Choosing or changing a programme's instructor needs `courses.manage`. Publishing still needs `courses.publish` (Admin), unchanged.
  - A programme that is published or archived changes only through someone who may publish it (`courses.publish`, Admin): `assertCanEditCourse` refuses every other write to it, with the reason, after the ownership check. An instructor edits their own programmes while they are drafts; a published one still opens for them, with a notice saying why they cannot change it. Before, an instructor's edits to an approved programme went live at once: rewritten lessons and links, previews shown to signed-out visitors, new titles and slugs on the listings, XP values paid at completion, and a swapped final assessment behind public certificates (directive §12, "Admin approval"). This is the strict choice; the owner may choose reviewed revisions or live content edits instead (TYCOONHOOD_BLOCKED_ON_YOU item 12).
  - A course manager links a profile to an account on Admin → Courses → Instructors, by the member's exact email or username. Nothing guesses a link or matches part of a name. Only an account whose email is verified can be linked, because anyone can sign up with an address, or take a free username, before the person it names does; the page and the reply to a link show the account's role and whether its email is verified. The username `harsha`, the founder profile's slug, is reserved (his own account is `@admin`). One profile per account (`Instructor.userId` was already unique, so no migration). Link and unlink are audited as `instructor.link` and `instructor.unlink`, with the account before and after. Unlinking the account, or changing its role to one without `courses.author`, ends its editing at once.
  - Reviews: hiding one needs `community.moderate` (Moderator, Admin). `REVIEW_MODERATORS` no longer includes `courses.author`. A reviewer's email shows only to holders of `admin.users`; a moderator sees the review and the reviewer's name.
  - The course admin lists an instructor's own programmes only. A programme's editor and its lesson pages answer 404 to anyone who cannot edit it. The Instructors page and link are for course managers. On the admin overview, house-wide course counts are for course managers, and an instructor's "Your courses" card links each of their programmes.
  - The academy seed (`pnpm db:seed:academy`, which a deploy also runs while `SEED_ON_DEPLOY=1`) never takes a programme from the instructor an administrator assigned. A re-run leaves a built programme exactly as staff left it, instructor "None" included (DR-33's build-once rule). A build, the first one or a `SEED_ACADEMY_FORCE=1` rebuild, gives the founder's profile only to a programme with no instructor. Before, every run set all four back to the founder, unaudited, which since this decision would silently take a programme from the instructor an administrator assigned it to.
- **The founder's profile is not linked.** The seeded profile "Harsha" has no account, and nothing links it on its own. Until an administrator links it to the right account (one with the Instructor or Admin role), only administrators edit the four house programmes.
- **Trade-offs:** an instructor no longer sees their programmes' reviews in the admin, because the reviews page is for moderators; a read-only view of reviews of one's own programmes would be a follow-up. An instructor cannot fix even a typo in a published programme: an administrator makes the change, or moves the programme back to draft, which hides it from members until it is published again. Approval is of the draft as it stands when an administrator publishes it: nothing records the version they read. One profile per account, and one account per profile, so two people co-teaching one programme need an administrator.
- **Checked by:** `packages/core/test/course-ownership.test.ts` (the rules in core: another instructor's programme is refused by every authoring function) and `packages/core/test/course-admin-web.test.ts` (the course admin's pages and server actions as each role).

## How to use this file going forward
Add a Part B entry (or a new `D##` if it's architectural and adopted) for any decision that changes architecture, product scope, the economy, the design contract, or a security posture. Never edit a preserved entry to change its meaning — supersede it with a dated new entry that references the old ID. When an OPEN item is decided, change its status to ADOPTED/REJECTED with the date and a one-line outcome; leave the reasoning intact.
