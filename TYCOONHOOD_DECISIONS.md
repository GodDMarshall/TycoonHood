# TYCOONHOOD — Decision Record (`TYCOONHOOD_DECISIONS.md`)

**Purpose (Directive §23):** the durable record of architectural, product, design and technical decisions. **History is never silently overwritten.** Two layers below: **Part A** preserves the decisions already recorded in `docs/DECISIONS.md` (provenance kept — these are historical constraints, binding until explicitly revisited); **Part B** is decisions this audit surfaced that need a product-level call, each in the required shape (date · decision · context · alternatives · reason · consequences · status).

---

## Part A — Preserved historical decisions (from `docs/DECISIONS.md`, unchanged)

These carry their original IDs. Status is **ADOPTED** unless noted; do not overturn without a new entry in Part B superseding them. Full text lives in `docs/DECISIONS.md` — this is the binding index.

**Architecture:** D1 TypeScript + Next.js App Router · D2 PostgreSQL from day one · **D3 Prisma with the new engine-free `prisma-client` generator, committed generated client** (deterministic builds, zero postinstall downloads — *verified essential: Prisma's engine CDN returns 403 in the build environment*) · D4 pnpm monorepo · D5 one web app, two route groups · **D6 THC = double-entry ledger, BigInt, smallest unit 1** · **D7 genesis mint of 1Q → TREASURY, supply provable as `-balance(SYSTEM_MINT)`** · D8 chain = adapter interface only, legal-gated · D9→**D15** own Session table (256-bit token, SHA-256 at rest, 30-day sliding, Argon2id) instead of Auth.js · D10 payments behind a provider interface, Stripe first · D11 every external dependency gets an honest dev-mode boundary · **D12 initial migration authored as hand-written SQL** carrying the USER-non-negative CHECK + deferred zero-sum trigger · D13 ledger posts at Read-Committed with atomic guarded updates + idempotency keys (not Serializable) · **D14 one token file (`packages/ui/src/tokens.css`); components define styles, pages compose never restyle** · D16 blog via `Post` + `marked`, first-party content, no sanitizer layer (revisit when authorship opens) · **D17 Miner is a separate deployable; mining is DISTRIBUTION from a finite MINING_POOL, never minting** · D18 Telegram cut (table retained, no integration) · D19 admin role gate at layout **and** re-checked in every server action · D20 rate limiting = in-memory fixed-window Map, Redis-swappable · D21 chain ships only `ChainAdapter` + `NullChainAdapter` · D22 evidence-verified challenges reviewed in the admin queue · D23 digital deliverables render at `/library/[slug]` gated by a FULFILLED order · D24 public profiles honor `Profile.privacy` (THC hidden by default); certificates verify at `/verify/[serial]` · D25 password-reset token discipline (hashed, single-use, 30-min, validate-before-consume, destroy all sessions) · D26 serverless Ed25519-verified Discord Interactions endpoint.

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

### DR-17 — The visual layer is "HQ", superseding the A9 "ledger" visual contract
- **Date:** 2026-09-26 · **Status:** **ADOPTED — owner directive ("Claude Code master takeover"), implemented and verified.**
- **Context:** A9 recorded a warm espresso "vault" palette, an engraved serif hero, **"no WebGL; the hero is typographic"**. DR-1 had been waiting since 15 September on whether a 3D direction existed. The owner's takeover directive now resolves it as option **(b): build it** — a premium dark/gold ecosystem with sophisticated, purposeful 3D, a spatial "headquarters" metaphor, and the same language across every room of the product. It names no red, so none was introduced.
- **What changed:** colour, geometry, type, motion, iconography and page composition only. **Token names were kept** (`bg-0…`, `ink-1…`, `gold…`, pillar names), so every page re-skinned from one file (D14 still holds). Data contracts, the ledger, the economy, routes, authorization (DR-3) and the honest-state rule (§1) are untouched.
- **The system:** five graphite surface levels; gold `#cfa95e` as a material used for one thing per view; every text colour ≥ 4.5:1 on every surface it sits on (measured, and verified with axe on every page at 1440 and 390); control boundaries at 3.3:1; architectural radii (2–6px); Instrument Sans (display + UI) with Instrument Serif italic for a single accent phrase and IBM Plex Mono for figures — self-hosted, SIL OFL, licences beside the files; one geometric icon family (emoji removed everywhere); motion tokens 160/240/400/700ms. Reference: `docs/DESIGN_SYSTEM.md` and `/styleguide`.
- **Alternatives rejected:** polishing the ledger system (the owner judged it weak, and the audit agreed: system fonts, template cards, text-only hero, emoji icons); a light theme (dark-first is the brand; a light theme would be a deliberate alternate, not an inversion); React Three Fiber (a second rendering model and ~2× the bundle for a scene that needs none of its reconciliation).
- **Consequences:** A9's *brand* content survives — the reeded-coin mark (redrawn as solid metal), the pillar identities (muted to threads), the open-books signature band. A9's visual rules ("no WebGL", "typographic hero", espresso palette) are superseded. DR-1 is **closed**.

### DR-18 — The HQ: districts are real rooms, and 3D is tiered, lazy and optional
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

### Open — decisions only the owner can make (surfaced by the takeover, not invented)
- **OQ-A · The progression ladder.** The directive sketches START → DISCIPLINE → KNOWLEDGE → EXECUTION → BUILDING → LEADERSHIP → TYCOON (seven stages). The live system has five seeded ranks, *Tycoon Initiate → Apprentice → Mastermind → Elite → Legend*, wired to level thresholds and Discord roles. I kept the five and drew them as the Ascent and the Monument's tiers. Renaming or re-cutting ranks is a data migration plus a Discord role change — your call.
- **OQ-B · Three pillars or four.** The directive names Warrior, Business Mastery and Mindfulness. The academy has a fourth published program, *Financial Planning and Investment Advisory* (Tycoon pillar), whose name already carries the legal flag in §3. I kept all four; the "Investment Advisory" wording still needs counsel or a rename.
- **OQ-C · "Enroll — free" on every program.** Enrollment is free for every published course in code (DR-6 is still open), while a paid *Warrior Program* product exists in the Vault. The UI states what the code does. Decide DR-6 and the copy follows.
- **OQ-D · Draft programs on the public Academy.** `/programs` lists DRAFT courses with an "In production" tag (pre-existing behaviour, kept). Hide them until published?
- **OQ-E · Hero line.** "Build yourself. / The rest compounds." — chosen by me from §55 of the directive (wealth as the compounding outcome of capability). Overrule freely; it is one string.
- **OQ-F · Photography.** Every visual in the product is drawn in code (3D, SVG, CSS). There is no photography because none exists that is ours. If you commission a shoot, the grade to match is: near-black ground, one warm key light, no faces required.

## How to use this file going forward
Add a Part B entry (or a new `D##` if it's architectural and adopted) for any decision that changes architecture, product scope, the economy, the design contract, or a security posture. Never edit a preserved entry to change its meaning — supersede it with a dated new entry that references the old ID. When an OPEN item is decided, change its status to ADOPTED/REJECTED with the date and a one-line outcome; leave the reasoning intact.
