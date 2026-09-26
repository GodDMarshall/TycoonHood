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

```
components/hq/
  districts.ts         the plan — one source for scene, drawing and links
  drawing-frame.ts     isometric frame shared by server drawing + client labels
  hq-drawing.tsx       the static architectural drawing (server, zero JS)
  hq-stage.tsx         the host: tier detection, idle loading, DOM link overlay
  scene/
    create-scene.ts    renderer, loop, visibility, disposal, controller
    camera.ts          long lens, drift + pointer parallax + scroll dolly
    lighting.ts        warm key, cool rim, gold core
    materials.ts       stone · gold · light — nothing else
    objects.ts         the six districts, pathways, light pulses, dust
    performance.ts     tiering (full/lite/static) + FrameGovernor
```

Forms carry meaning: monolith (Command Center), colonnade (Academy), tiered ring (Arena), wheel-door cube
(Vault), coin stack (Treasury), connected pylons (Network). Light travels along each pathway toward the core:
every room feeds one ledger.

## 6. Asset strategy

| Kind | Used for | Why |
|---|---|---|
| Real-time 3D | the HQ hero only | the one place spatial understanding is the point |
| Code-drawn SVG | HQ drawing, pillar atmospheres, Monument, rank map, coin mark, icons | crisp at any size, themable, zero requests, honest data |
| CSS | grain, blueprint plane, glows | free |
| Photography | none yet | there is no photography that is ours; see OQ-F |

No stock photography, no AI people, no cartoon illustration. If photography arrives, it is graded to the room:
near-black ground, one warm key light.

## 7. Don'ts

Purple/neon, gradient text everywhere, glass cards, pill UIs, candlestick charts, "to the moon", wolves and lions,
luxury-car flexing, emoji as icons, fake numbers, a pretty homepage in front of a plain dashboard.
