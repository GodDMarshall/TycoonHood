# TYCOONHOOD — Design System ("HQ")

**Adopted:** 26 September 2026 · **Decision:** DR-17, DR-18 · **Live reference:** `/styleguide`
**One file of truth:** `packages/ui/src/tokens.css` (D14). Components define style; pages compose and never restyle.

> A black room holding one gold object.

The product should feel like entering a headquarters, not reading a website. Every page is a *room* of one
building, and every room shares the same materials: graphite, gold, hairline, figure.

---

## 1. Principles

1. **Gold is a material, not a colour.** One gold thing per view — the primary action, a lit edge, the figure that
   matters. Never a fill for large areas; never on every button.
2. **Architecture, not bubbles.** 2–6px corners, hairline borders, strong rectangles, generous negative space.
   Round only for status dots and people.
3. **Every number is a fact.** Figures are set in mono, tabular. If a figure is not a database fact it does not ship.
   Empty is stated honestly ("The first seat is open"), never faked and never shown as a proud zero.
4. **Motion carries hierarchy.** Slow arrivals, quick feedback, nothing that loops for decoration.
5. **Accessible by construction.** AA contrast on the surface an element actually sits on; visible focus
   everywhere; reduced motion honoured; every interactive thing reachable by keyboard.

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
`gold-shadow #5c4a26` (borders and underlines only). `--metal` is a gradient reserved for the coin and 3D.

### Pillars — threads, never fills
Warrior `#c9705f` (fired clay) · Builder `#7d9cb5` (steel) · Tycoon = gold · Mind `#86ab99` (sage).

### Type
| Role | Face | Token |
|---|---|---|
| Display / UI | Instrument Sans (variable 400–700) | `.display`, `--font-display`, `--font-ui` |
| The accent phrase | Instrument Serif italic | `.accent` — one per headline |
| Figures, labels | IBM Plex Mono 400/500 | `.figures`, `.eyebrow`, `.index` |

Scale: `text-hero` · `text-display` · `text-h1` · `text-h2` (fluid) · `text-h3` 20 · `text-lead` 18 · `text-body` 15 ·
`text-small` 13 · `text-caption` 11. Reading measure: `--measure` (68ch). Faces are self-hosted from
`packages/ui/src/fonts` (SIL OFL, licences beside the files) — no third-party font requests, CSP stays `font-src 'self'`.

### Geometry, elevation, motion
- Radii `xs 1 · sm 2 · md 3 · lg 4 · xl 6`.
- Shadows `--shadow-1/2/3` (lift) and `--shadow-gold` (the lit object).
- Durations `--dur-1 160ms` feedback · `--dur-2 240ms` hover · `--dur-3 400ms` panels · `--dur-4 700ms` reveals.
- Easing `--ease-premium` (arrivals) · `--ease-settle` (loops).
- `[data-reveal]` scroll reveals are progressive: visible without JS; a watchdog removes the opt-in if the bundle
  never runs; disabled under `prefers-reduced-motion`.

## 3. Components (`@tycoonhood/ui`)

| Group | Components |
|---|---|
| Actions | `Button` (primary · secondary · outline · ghost · danger × sm/md/lg, `loading`), `buttonStyles()` for links |
| Surfaces | `Card` (default · raised · interactive · gold, `ticks`), `CardHeader/Title/Description/Content/Footer` |
| Figures | `Stat`, `Metric`, `ThcAmount`, `Progress` (gold/pillar tones), `XpBar` |
| Identity | `Logo`, `CoinMark`, `Wordmark`, `Avatar`, `RankBadge`, `RankPips`, `PillarBadge`, `Badge` |
| Structure | `SectionRule`, `SectionHeading` |
| Controls | `Input`, `Textarea`, `Select`, `Label`, `Field` (hint/error, `aria-invalid`) |
| States | `Notice` (info/success/warning/danger), `EmptyState`, `Skeleton`, `Dialog` (standard · confirmation · premium, native `<dialog>`) |
| Icons | `Icon` — one geometric family, 24px grid, 1.5 stroke, square caps. Full set on `/styleguide`. |

App-level compositions (`apps/web/components`): `RoomHeader` (every page opens the same way), `SiteHeader` +
`nav-client` (context-aware navigation), `PillarArt` (the four pillar atmospheres), `Monument`, `RankMap`,
`ProgressRing`, `HQStage` / `HQDrawing`, `SubmitButton`.

**Rule carried from D14:** a non-component export never lives in a `"use client"` module (it becomes a client
reference when a server component imports it). That is why `buttonStyles` is in `button-styles.ts`, not `Button.tsx`.

## 4. Navigation

- **Guests:** Academy · Arena · Vault · Treasury · Journal, plus *Sign in* and *Enter*. Phone: one full-screen sheet.
- **Members:** Command · Academy · Arena · Network · Vault · Wallet, the wallet readout, the rank, and an account menu
  (profile, orders, settings, the Miner, the House for admins, sign out). Phone: a four-tab bar + *More* sheet.
- Active state: a 1px gold rule under the item. The sheet and the tab bar are portalled to `<body>`.

## 5. The HQ (3D)

Members live in it (DR-21); guests see it from the air on the homepage.

```
components/world/
  world-host.tsx         React host: tier detection, loader, HUD, labels, dock, minimap, fallback
  return-to-hq.tsx       "Walk back into the …" on member pages (only where the world can run)
  engine/
    quality.ts           tiers (cinematic/balanced/performance/none) + FrameGovernor
    assets.ts            textures, HDRIs, models — loaded once, with progress
    materials.ts         the material library (plaza paving shader lives here)
    navigation.ts        first-person walker: keys, drag-look, click-to-walk, colliders
    world.ts             renderer, post chain, spaces, deep links, tour mode, disposal
  architecture/
    geo.ts               metre-scale UV helpers — every texture reads at real size
    facades.ts           curtain walls, lobby and library glass, drawn into canvases
    campus.ts            plaza, the six buildings, pathways, pool, skyline
    landscape.ts         promenade, parterres, clipped trees, lanterns, benches
  interiors/rooms.ts     the six rooms and their stations
  hud/panels.tsx         station panels: live data and real actions
lib/world-state.ts       everything the world shows, from the database (server-only)
scripts/world/generate-textures.mjs   the PBR sets in public/world/tex
components/hq/hq-stage.tsx            the homepage: drawing first, the same world in `tour` mode after
```

Forms carry meaning: tower (Command Center), colonnade + library (Academy), open arena (Arena), wheel-door
vault (Vault), rotunda with a coin stack (Treasury), linked pavilions (Network). Every building faces the
medallion, and every room's data comes from `getWorldState()`, never from the scene.

**Deep links:**
- `/world?room=academy` enters a room.
- `/world?cam=x,z,yawDeg,pitchDeg` places the camera.
- `/world?world=balanced` forces a tier (QA).
- `/?hq=3d&tourt=18` starts the homepage tour at a given second (QA).

### Engine traps (each one cost a debugging session — read before touching materials)

- **three r186 ignores `envMapIntensity` on any material that inherits `scene.environment`.** The renderer
  overwrites it with `scene.environmentIntensity`. `bindEnvironment()` in `world.ts` binds each space's
  environment to its materials explicitly, and scales the authored intensity by the space's level.
  Remove it and every per-material reflection level silently goes flat.
- **`roughness` multiplies the roughness map.** The marble map is authored polished (mean ≈ 0.09), so
  `roughness: 0.6` makes it *glossier*, not honed. The plaza remaps the map in its shader instead.
- **Coplanar faces z-fight across the whole plaza.** `boxGeo` sits on its base, so a 0.6m box at y=0 has its
  top at exactly floor height. Keep decals ≥ 1cm clear of what they sit on, and the tour camera's near
  plane is 1.5m for depth precision at 150m.
- **Polished metal reflects the sky through its own tint.** Polished brass at grazing angles mirrors the dusk
  sky and reads as a strip of green ice. Use brushed brass (`m.brass`) for anything flat on the ground.
- **Outdoor paving is honed, never polished.** A polished plaza mirrors the sky at grazing angles and reads
  as open water. Interiors keep the polish.

## 6. Asset strategy

| Kind | Used for | Why |
|---|---|---|
| Real-time 3D | the members' HQ (`/world`) and the homepage fly-over | the product is a place; you walk into the room you need |
| Code-drawn SVG | HQ drawing, pillar atmospheres, Monument, rank map, coin mark, icons | crisp at any size, themable, zero requests, honest data |
| CSS | grain, blueprint plane, glows | free |
| Photography | none yet | there is no photography that is ours; see OQ-F |
| Third-party 3D | two CC BY 4.0 models, two CC0 HDRIs | credited on `/credits`; nothing else is borrowed (DR-23) |

No stock photography, no AI people, no cartoon illustration. If photography arrives, it is graded to the room:
near-black ground, one warm key light.

## 7. Don'ts

Purple/neon, gradient text everywhere, glass cards, pill UIs, candlestick charts, "to the moon", wolves and lions,
luxury-car flexing, emoji as icons, fake numbers, a pretty homepage in front of a plain dashboard.
