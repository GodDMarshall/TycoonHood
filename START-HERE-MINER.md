# THE MINER — how to run it, what it does

The Miner is a separate application. It shares the Tycoonhood login and the
same database, but it is its own Next.js app, its own build, and its own
deployment — `apps/miner`, served on port 3001 in development.

It is built phone-first and installs to a home screen.

## Run it

```powershell
# from D:\TycoonHood
pnpm dev:miner          # http://localhost:3001
```

Run the main site at the same time in a second terminal, because the Miner
links back to it for signing in and for the marketplace:

```powershell
pnpm dev                # http://localhost:3000
```

Sign-in is shared. On localhost the session cookie crosses ports; in
production set `COOKIE_DOMAIN=".tycoonhood.com"` so `www` and `miner` share it.

## The five tabs

**Rig** — the idle miner. THC accrues at 12/hour per rig level and storage
holds ten hours of production before the rig idles, so a member who claims
twice a day out-earns one who claims once. The screen says how long until
storage fills, because the honest answer to "when should I come back" is a
number. Upgrades burn THC back through the ledger — the rig is the economy's
first sink, not a faucet.

**Watch** — Tycoonhood videos that pay THC for being genuinely watched. The
player reports; the server decides. Four things make it hard to farm:

- the server stamps the start and refuses to settle earlier than the required
  watch time of real wall-clock later
- one payout per video per member, for life, enforced by a unique key
- a daily cap, counted in the member's own timezone
- heartbeats must have arrived along the way, so opening and closing the page
  at the right interval is not enough

**Squad** — invites. Signing somebody up pays nothing. Both sides are paid
when the person they brought finishes their first lesson, which is what makes
farming cost more than it returns. One referrer per member, for life.

**Ranks** — the open books. Pool remaining, miners, total mined, the top ten,
and the member's own position computed rather than guessed.

**Wallet** — balance, every ledger movement, and — the part that matters —
what the balance actually reaches. If they can afford something it says so and
links to the marketplace. If they cannot, it says how far away the next thing
is, in months of mining.

## What pays, and roughly how much

| Source | Rate |
|---|---|
| The rig, rig level 1 | ~240 THC/day for a member who claims twice a day |
| A watch task | ~150 THC, one payout per video |
| A qualified invite | 2,000 THC to the inviter, 1,000 to the joiner |
| Missions | set per mission in `/admin/missions` |

A Warrior Hoodie is 18,000 THC, which is about two and a half months of
mining. That number is not typed in anywhere — it is derived from the mining
rate, so changing the rate moves every price with it.

## Publishing videos

`/admin/videos` on the main site. Paste any YouTube URL shape or the raw
11-character id, type the length as `9:42`, set the reward, tick Live. The
form tells you what fraction must be watched and the effective THC-per-hour of
attention before you save.

Video ids are stored rather than URLs, so a task can only ever point at a
video you chose.

## Building it

```powershell
pnpm build:miner
```

Five routes, ~110 kB first load. It is a PWA: `manifest.webmanifest`,
standalone display, safe-area insets for the notch, and icons at 192 and 512.
