# TYCOONHOOD — Design System ("Academy")

**Adopted:** 1 October 2026 · **Decision:** DR-24 (supersedes the "HQ" system, DR-17/18) · **Live reference:** `/styleguide`
**One file of truth:** `packages/ui/src/tokens.css` (D14). Components define style; pages compose and never restyle.

> A serious place to learn and to work.

Tycoonhood is an academy with a member app, not a game and not an AI workspace. A member should open it, see their
one next step, and do it. The Miner is the only game, and it lives in its own app.

---

## 1. Principles

1. **The next step is always obvious.** Today shows the one next lesson and today's standard. Nothing competes with it.
2. **Gold means "act" or "progress".** The primary button, a progress bar, an unread count, a met day. Never decoration,
   never large fills.
3. **Standard application geometry.** 8–12px radii, hairline borders, one sans family, comfortable density. No
   monospace labels, no blueprint grids, no corner ticks, no "rooms".
4. **Every number is a fact.** If a figure is not a count of real rows it does not ship. Empty is said plainly.
5. **Accessible by construction.** AA contrast on the surface an element actually sits on; visible focus everywhere;
   reduced motion honoured; every action reachable by keyboard and touch.

## 2. Tokens

### Surfaces — five levels
| Token | Hex | Level |
|---|---|---|
| `bg-0` | `#0a0908` | L1 ground |
| `bg-1` | `#100f0d` | L2 environment bands, shells |
| `bg-2` | `#171613` | L3 content surface |
| `bg-3` | `#1f1d19` | L4 interactive / hovered |
| gold edge + `--shadow-gold` | — | L5 the one premium object |
| `line` / `line-strong` | `#26241f` / `#37342d` | hairline / structural edge |
| `line-input` | `#6b665a` | control boundary, 3.3:1 on `bg-0` (WCAG 1.4.11) |

### Ink (contrast measured on `bg-0` … `bg-3`)
`ink-1 #f3efe7` 17.3–14.7:1 · `ink-2 #b4ad9f` 8.9–7.6:1 · `ink-3 #8f897c` 5.7–4.8:1

### Metal
`gold #cfa95e` (9.0:1) · `gold-bright #e8cf94` (hover, lit edge) · `gold-deep #a38449` (5.6:1, safe as text) ·
`gold-shadow #5c4a26` (borders and underlines only). `--metal` is a gradient reserved for the coin mark.

### Pillars — threads, never fills
Warrior `#c9705f` (fired clay) · Builder `#7d9cb5` (steel) · Tycoon = gold · Mind `#86ab99` (sage).

### Type
| Role | Face | Token |
|---|---|---|
| Everything a member reads | Instrument Sans (variable 400–700) | `--font-ui`, `.display` |
| Figures | Instrument Sans, tabular numerals | `.figures`, `tabular-nums` |
| The website's accent phrase | Instrument Serif italic | `.accent` — public website only, one per headline |

Scale: `text-hero` · `text-display` · `text-h1` · `text-h2` (fluid, website) · app headings 26–30px page titles, 16px
section titles · body 15px · small 13px. Faces are self-hosted from `packages/ui/src/fonts` (SIL OFL) — CSP stays
`font-src 'self'`. `.eyebrow` is a quiet 12px uppercase label in `ink-3`.

### Geometry, elevation, motion
- Radii `xs 4 · sm 6 · md 8 · lg 12 · xl 16`. Buttons and inputs `md`; cards `lg`; avatars and counts round.
- Shadows `--shadow-1/2/3` for lift; menus and sheets use `--shadow-3`.
- Durations `--dur-1 160ms` feedback · `--dur-2 240ms` hover · `--dur-3 400ms` panels. Nothing loops for decoration.

## 3. Components (`@tycoonhood/ui`)

| Group | Components |
|---|---|
| Actions | `Button` (primary · secondary · outline · ghost · danger × sm/md/lg, `loading`), `buttonStyles()` for links |
| Surfaces | `Card` family, `Stat`, `Metric` |
| Figures | `ThcAmount`, `Progress`, `XpBar` |
| Identity | `Logo`, `CoinMark`, `Avatar` (round), `RankBadge`, `PillarBadge`, `Badge` (sentence case, pill) |
| Controls | `Input`, `Textarea`, `Select`, `Label`, `Field` |
| States | `Notice`, `EmptyState`, `Skeleton`, `Dialog` (native `<dialog>`) |
| Icons | `Icon` — one family, 24px grid, 1.5 stroke, round caps. App icons include `today`, `courses`, `chat`, `bell`, `checklist`, `pin`, `flag`, `send`. |

App compositions (`apps/web/components`):
- `app/` — `AppShell` (server), `app-chrome` (sidebar, phone top bar, tab bar, More sheet), `page.tsx` (`Page`,
  `PageHeader`, `SectionTitle`, `Panel`), `install-app`, `register-sw`.
- `learning/` — `CourseCard`, `CourseCover`, `AskQuestion`. `today/` — `StandardChecklist`, `RecordGrid`.
- `community/` — `CommunityFrame`, `ChannelList`, `HouseRules`, `ChatView`. `store/` — `ProductShelves`.
- Website: `SiteHeader`, `SiteFooter`, `RoomHeader` (content pages), `LegalPage`.

**Rule carried from D14:** a non-component export never lives in a `"use client"` module.

## 4. Navigation

- **Member app:** a 248px sidebar — Today, Courses, Community (unread count), Challenges; *Your programs* with
  progress; Store, Wallet, Mining (outside link to the Miner), Admin; Notifications and the account menu at the
  bottom. Phone: a top bar (logo, notifications, profile) and a tab bar — Today, Courses, Community, Challenges, More.
- **Website:** Programs · How it works · Store · THC · Journal, *Sign in* and *Join free*. A signed-in member sees one
  button: *Open the app*. Members who open `/programs` or `/marketplace` are taken to `/courses` or `/store`.
- Every list of destinations is one array (`components/app/nav.ts`), so the sidebar, tabs and sheet cannot disagree.

## 5. Screens

| Screen | Job |
|---|---|
| Today | greeting · guided start for new members · today's standard · continue learning · record · announcements · wins |
| Courses | search every lesson · pick up where you left off · programs with honest durations |
| Program | progress, next lesson, syllabus with every lesson's state and why it is locked, program channels |
| Lesson | content or video · complete and continue · knowledge check · questions about this lesson |
| Community | channels by group with unread counts · chat with replies, pins, reports, removals, wins with proof |
| Profile | the record: streaks, met days, lessons, certificates, rank and what earns it, achievements |
| Admin → Community / Daily standard | reports queue, mutes, channels, announcements · the house standard |

## 6. Asset strategy

| Kind | Used for | Why |
|---|---|---|
| Code-drawn | coin mark, icons, program covers (pillar-tinted gradients) | crisp, themable, zero requests |
| App icons | `apps/web/public/icons` (generated from `app/icon.svg`) | home-screen install |
| Photography | none yet | there is no photography that is ours; see OQ-F |

No stock photography, no AI people, no cartoon illustration, no 3D.

## 7. Don'ts

Game HUDs, 3D worlds, "rooms" and "districts", monospace uppercase labels, blueprint grids, purple/neon, gradient
text, glass cards, candlestick charts, "to the moon", wolves and lions, luxury-car flexing, emoji as icons, fake
numbers, leaderboards, anything that rewards chat volume.
