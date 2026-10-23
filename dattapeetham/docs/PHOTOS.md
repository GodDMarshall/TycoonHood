# Photos — 4K masters and how the site serves them

The client asked for every photo on the site in 4K quality, rendered to 4K
first and then placed in its section, with no low-quality picture anywhere.
This is how that is done, what it can and cannot achieve, and how to keep it
true when photos change.

## The honest part first

The site's photos come from the Peetham's S3 buckets, and almost all of them
are **small web copies**. Of the 172 images on the site, 63 are under 500 px
wide, 42 are 500–959, 66 are 960–1919 and one is 2048; the median is 800 px.
None is 4K.

Every one of them is now rendered to a **3840 px master** (long edge) before
the site uses it, with Real-ESRGAN, a super-resolution network that sharpens
edges and removes the JPEG blocking and noise of the web copies. On a phone,
a laptop or a 4K screen the photos are clean and sharp at any size the
layout shows them.

But a master enhanced from an 800 px copy is **not a 4K photograph**. Detail
the camera captured and the web copy threw away (a strand of hair, the weave
of a silk, the face of a devotee in the back row) cannot be recovered, only
estimated. And where the web copy is too small, the network's estimate is a
guess: the photo review (below) found it gave small faces doll eyes and drawn
brows, rewrote the lettering of certificates and album covers into
look-alike glyphs, and turned crowds into mosaics. So those parts are now
**kept out of the network**: every face under 130 px, and the lettering,
deity faces and crowds listed in `photos/overrides.json`, are enlarged with
Lanczos and a gentle unsharp mask instead. They are faithful, and exactly as
soft as the source allows.

The way to true 4K is the camera originals: when the Peetham supplies
one, drop it into [`photos/originals/`](../photos/originals/README.md) and the
pipeline uses it instead of the web copy, and does not enlarge it more than
the target needs (an original of 3840 px or more is only scaled down). **Ask
the Peetham for the camera originals** listed under "Ask the Peetham for
camera originals of these", with the page and section each one is on;
the portraits of the Gurus, the deities and the page heroes first.

## The rule for every photo, from now on

**No photo is used on the site until it has been through
`node tools/enhance-photos.mjs`** (or `npm run images`, which now routes
through it): a 3840 px master (512 px for an app icon), its WebP copies and
its manifest entry, made before the page that uses it is published. Then
**`node build.mjs && node --test tests/photos.test.mjs`** must pass. That test
fails the check when a low-quality photo slips in: an `<img>`, background,
lightbox source or script that still loads a photo straight from S3, a
srcset (or hero preload) that stops below the photo's 4K master, a manifest
entry without a 3840 px master or without its provenance, a copy that is
missing or not as wide as it claims, a fidelity-flagged photo nobody has
reviewed here, or a master made by the network without the face guard. (It
is not part of `npm test` yet; see "Stage 2", item 6.) The steps are under
"When a page gets a new photo".

## What runs, in order

```
node build.mjs                      # the site, so the tool can see which photos pages use
node tools/enhance-photos.mjs       # masters, WebP copies, manifest, share images
node build.mjs                      # the site again, now pointing at the new copies
```

(`npm run images` does the same: `tools/optimize-images.mjs` now hands over to
`tools/enhance-photos.mjs`. Set-up for the enhancer, once per machine:
[tools/upscale/README.md](../tools/upscale/README.md).)

1. **Which photos.** Every image URL on the Peetham's S3 buckets that the built
   site uses (pages, scripts, styles), every one already in the manifest, and
   every page's share image (`image` in `src/pages/*.mjs`).
2. **Source.** The camera original in `photos/originals/` when there is one,
   otherwise the web copy, downloaded once into
   `.cache/img-src/<sha1(url)[:12]>.<ext>`.
3. **Class.** The 18 app-store icons (`homepage_assets/.../app-*.png`, 100×100)
   are icons: they get a 512×512 master. Everything else is a photo: 3840 px
   on the long edge, aspect ratio unchanged. (Logos and the two store badges
   are treated as photos; they are sharp graphics and enhance cleanly.)
4. **Master.** `tools/upscale/enhance.py` (see below) writes it to
   `.cache/img-4k/<sha1(url)[:12]>-<key>.jpg` (PNG when the photo has
   transparency) with a JSON sidecar. The **face guard** keeps every face
   under 130 px out of the network, and the photo's entry in
   [`photos/overrides.json`](../photos/overrides.json), if it has one, keeps
   its lettering, deity faces or crowds out too, or sends the whole photo to
   the Lanczos route (see "Photo review"). The key is a hash of the source bytes
   and the settings that affect that photo (including its override and the
   face-guard model), so a re-run skips every photo
   whose source and settings are unchanged. Masters are not shipped and not
   committed (`.cache/` is git-ignored).
5. **WebP copies** from the master: widths 480, 960, 1600, 2560, 3840 (icons
   96, 192, 384, 512), never wider than the master, and the master's own width
   always last (a portrait master 2570 px wide gets 480, 960, 1600, 2570; a
   width within 10 % of the master's is dropped). Quality q78 up to 960 px,
   q72 at 1600, q66 at 2560 and 3840 (icons q86), Lanczos-3 resampling, smart
   chroma subsampling (keeps the saffron and red edges clean). Written to
   `src/assets/img/opt/<sha1(url)[:12]>-<w>.webp`; copies no entry uses any
   more are deleted.
6. **Manifest** `src/assets/img/opt/manifest.json`, one entry per URL:

   ```json
   { "w": 3840, "h": 3082,
     "srcs": [[480, "assets/img/opt/32ead86a6b9c-480.webp"], …, [3840, "assets/img/opt/32ead86a6b9c-3840.webp"]],
     "class": "photo", "src": { "w": 800, "h": 642, "from": "s3" },
     "method": "realesrgan-x4 + lanczos", "route": "x4", "scale": 4.8, "dni": 0.25,
     "fidelity": { "psnr": 33.68, "ssim": 0.9752 },
     "faces": { "found": 1, "protected": 0 } }
   ```

   `w`/`h` are the master's size. `build.mjs` reads only `w`, `h` and `srcs`
   (`loadImageManifest`, `pick`, `optimizeHtml`): every `<img>` gets the full
   srcset up to the master, `width`/`height` in the master's proportions,
   and a 960 px `src` fallback; `og:image` and JSON-LD keep the absolute S3
   URL. The other fields are provenance: the source size, how the master was
   made (`method` names the faces and regions kept out of the network), the
   fidelity guard, the face guard (`faces`: faces found, faces under 130 px
   kept out of the network) and `protected`, the number of regions
   `photos/overrides.json` kept out. `route` is `x4` or `lanczos` (no network).
7. **Share images.** For every page, its `image` is cut from the master to a
   1200×630 JPEG (q85, mozjpeg, progressive, under 300 KB) in
   `src/assets/img/og/<slug>.jpg`, centred by sharp's *attention* strategy
   (faces, skin, saturated colour). See "Share images" below for the mapping
   and the wiring that is still to be done.
8. **Report.** A JSON report and a text summary (counts, timings, sizes
   before and after, per-width totals, the largest files, the fidelity
   distribution, everything flagged or failed): `.cache/img-4k/report.json`
   and `report-summary.txt`, or `--report=FILE`.

A photo that cannot be enhanced (download failed, the network crashed) is
**never** published from its small copy: its manifest entry is removed, so it
keeps loading from S3 at its original size, the run exits non-zero and the
summary lists it. Nothing is pruned on a failed run.

## The enhancer

Real-ESRGAN **realesr-general-x4v3** blended with **realesr-general-wdn-x4v3**
by deep network interpolation (DNI, the method of Real-ESRGAN's own inference
script): `weights = s × general + (1 − s) × wdn`, where `s` is the denoise
strength. It is a 1.2 M-parameter convolutional network that works on local
texture. It was trained as a GAN, so it can still invent fine detail the
source does not hold: it is set conservatively (a light denoise blend, and
the face guard below) to avoid inventing detail, and the review below
records where it still did and what was done. **No face-restoration model or
diffusion upscaler is used** (no GFPGAN, CodeFormer or diffusion upscaler):
those redraw whole faces, and the photos of Sri Swamiji, Sri Bala Swamiji,
the Gurus and the deities must never be redrawn. Do not add one.

- **Route.** One x4 pass, then a high-quality Lanczos resize to 3840 px on
  the long edge (down when 4× overshoots, up by at most 3.8× for the smallest
  photos). Masters are never made bigger than the target. The `lanczos`
  route (no network: Lanczos, then an unsharp mask of amount 0.5 with a
  2-level threshold and a radius of 0.45 × the enlargement) is the review's
  fallback for a photo the network cannot be trusted with at all.
- **Face guard.** Before the network runs, OpenCV's YuNet face *detector*
  (a 228 KB model that only reports boxes; it draws nothing) finds the faces
  in the original. Every face under **130 px** tall, with 30 % margin for hair
  and turban, is filled in from the Lanczos + unsharp-mask enlargement
  instead, blended into the enhanced rest over a soft raised-cosine edge
  (3 × the enlargement wide). Why 130 px: see "Photo review".
- **Protected regions.** `photos/overrides.json` lists, per photo, regions
  (fractions of the photo) treated the same way: lettering, deity faces the
  detector does not find, crowds. Only the windows they cover are computed.
- **Tiles.** The image is processed in 512 px tiles that overlap by 40 px.
  The network sees 34 px around each pixel, so the tiled result is identical
  to processing the whole image at once: checked on the 800×642 portrait with
  `--check-seams`, the largest difference between tiled and whole-image output
  was **0** (not one 8-bit level anywhere), so there are no seams.
- **Precision.** bfloat16 on the CPU's AMX units: 2.4× faster than float32.
  Its output differs from float32 by 54 dB PSNR (mean 0.23 of a level, 0.01 %
  of pixels off by more than 4 levels), about 10 dB below the q95 master's own
  encoding noise and 15 dB below the q66 WebP's.
- **Input handling.** EXIF orientation applied; ICC profiles other than sRGB
  (and CMYK) converted to sRGB; greyscale stays greyscale (the App Store
  badge); transparency kept (colour enhanced, alpha resized with Lanczos;
  master written as PNG).
- **Fidelity guard.** Every master is scaled back to the source size
  (Lanczos) and compared with the source: PSNR (RGB, masked to visible
  pixels) and SSIM (luma, 11×11 Gaussian). This measures *faithfulness*, not
  beauty: a blurry bicubic enlargement scores higher than any sharpening, and
  photos with dense texture (flowers, foliage, ornament) score lower because
  the network removes their JPEG noise. A photo below the threshold is
  flagged in the report and the manifest (`flag`) and must be looked at and
  recorded under "Review" below (a test enforces that).

## Calibration (October 2026)

Settings were chosen on 18 samples (16 photos, 2 app icons) covering the site's subjects and sizes,
from before/after crop sheets (the original enlarged bicubically next to each
candidate, 1:1 crops of faces, lettering and ornament, and the same crops at
a typical 1600 px display size), looked at side by side, and from the
fidelity numbers. Fidelity below is PSNR dB / SSIM of the master scaled back
to the source, then the network time on this machine (bf16, under load).

**Denoise strength** (x4 route; s = 0.25 / 0.5 / 0.75):

| sample | source | s 0.25 | s 0.5 | s 0.75 |
| --- | --- | --- | --- | --- |
| Sri Swamiji portrait (`sadguru-deva.jpg`) | 800×642 | 33.68 / 0.975 | 32.69 / 0.973 | 31.66 / 0.970 |
| Sri Bala Swamiji portrait | 605×904 | 33.87 / 0.975 | 33.70 / 0.974 | 33.21 / 0.971 |
| Marakata Subrahmanya Swami (deity, ornaments) | 502×600 | 27.78 / 0.950 | 27.24 / 0.947 | 26.57 / 0.942 |
| Crowd, NOW Arena Chicago | 1600×1066 | 30.70 / 0.945 | 30.10 / 0.937 | 29.43 / 0.928 |
| Temple exterior, gopurams (PNG, alpha) | 1024×644 | 32.61 / 0.967 | 32.02 / 0.964 | 31.24 / 0.960 |
| Bonsai garden landscape | 750×510 | 28.48 / 0.932 | 27.80 / 0.928 | 27.07 / 0.922 |
| Lettering: Shuka Vana banner | 820×312 | 33.64 / 0.974 | 32.79 / 0.970 | 31.93 / 0.965 |

Decision: **s = 0.25** (the inference script's default is 0.5). It is the
most faithful on every sample, and by eye the most natural: at 0.5 and more
visibly at 0.75 the skin of the portraits turns smooth and waxy, beard
strands merge, and rock, foliage and the silver filigree behind the deity
smear into flat painted patches. At 0.25 skin keeps its pores, the beard its
strands, and no JPEG noise or blocking is amplified. No halos in any sample.
Lettering is crisp at every strength.

*Corrected by the photo review:* the calibration's faces were all large (the
portraits are 150–330 px tall in the source) and its lettering large and
clean. On the whole site, small faces and small lettering were redrawn at
every strength, 0 included, which the review fixed with the face guard and
protected regions rather than with the strength (see "Photo review").

**Small originals.** For photos whose 4× is still short of 3840 (long edge
under 960 px) three routes were compared at s = 0.25: (a) one x4 pass, then
Lanczos up; (b) two passes (x16), then Lanczos down; (c) Lanczos up to 960,
then one x4 pass.

| sample | source | (a) x4 + up | (b) x16 + down | (c) up + x4 |
| --- | --- | --- | --- | --- |
| Kshetra thumbnail: deity + Sri Swamiji | 250×250 | 26.43 / 0.962 (1 s) | 25.17 / 0.953 (23 s) | 32.29 / 0.989 (22 s) |
| Album cover: lettering + Sri Swamiji | 300×300 | 29.77 / 0.965 (3 s) | 29.06 / 0.962 (61 s) | 36.06 / 0.989 (21 s) |
| Sri Swamiji standing | 353×531 | 38.71 / 0.992 (2 s) | 37.09 / 0.991 (68 s) | 41.24 / 0.995 (11 s) |
| Concert poster: lettering + Sri Swamiji | 400×267 | 29.12 / 0.963 (3 s) | 28.17 / 0.955 (56 s) | 32.88 / 0.986 (16 s) |
| Kaalaagni Shamana Dattatreya + Sri Swamiji | 402×500 | 28.14 / 0.972 (3 s) | 26.71 / 0.963 (95 s) | 30.76 / 0.986 (18 s) |
| Sri Bala Swamiji | 411×386 | 33.50 / 0.974 (10 s) | 32.56 / 0.968 (75 s) | 37.67 / 0.988 (14 s) |
| Marakata Subrahmanya Swami | 502×600 | 27.78 / 0.950 (6 s) | 26.75 / 0.939 (94 s) | 29.84 / 0.967 (18 s) |
| Pathashala students | 600×400 | 30.21 / 0.957 (5 s) | 29.41 / 0.951 (84 s) | 32.90 / 0.975 (10 s) |
| Sri Swamiji with cockatoos | 620×327 | 29.85 / 0.960 (4 s) | 29.06 / 0.954 (70 s) | 31.92 / 0.972 (9 s) |

Decision: **(a) for every size class.** (c) scores best on fidelity only
because it changes the least: the network treats Lanczos ringing and the
source's JPEG blocks as real structure, so the 8×8 blocks in Sri Bala
Swamiji's 411 px photo survive, and lettering ("Raga Sagara", "SGS Ashrama")
comes out ragged with speckled edges. (b) redraws more than it reveals: at
the same display size the beards turn brushy and waxy, Sri Swamiji's
forehead goes plastic and the deities' faces look painted; it is never
better than (a) and costs 15–30× the time. (a) removes the blocking, keeps
faces natural and lettering clean. The same holds for the 500–699 px class.

**App icons** (100×100 → 512): the same three routes; (a) is crisp with clean
lettering, (b) slightly bolder but more stylised, (c) softer. Decision: (a),
s = 0.25.

**WebP quality.** At 3840 px, q66 against the q95 master: 40 dB PSNR on the
portrait, 41 dB on lettering, 37.5 dB on the temple's sculpture; at 1:1 no
blocking, banding or colour bleed on the red tilak and saffron edges, and
lettering intact. q72 and q80 cost 8 % and 40 % more bytes for no visible
change. Kept: q78 ≤ 960, q72 at 1600, q66 at 2560/3840.

**Fidelity threshold.** The approved samples scored between 26.4 and 38.7 dB
and SSIM 0.932–0.992 (icons 25.7 dB / 0.952). The thresholds sit just below
those: **photos PSNR < 26 dB or SSIM < 0.93, icons PSNR < 25 dB or SSIM <
0.94** are flagged. (A generic "30 dB" would have flagged half of the
approved samples, every photo of flowers and ornament.)

**Workers.** On this shared 4-core machine, 4 photos took 62–66 s one at a
time with 3 threads, and 40 s two at a time with 2 threads each (the
decoding, resizing and encoding around the network are single-threaded and
overlap). Default: `--workers=2 --threads=2`.

The crop sheets used for these decisions were working files (not committed);
re-create them for a new kind of photo by running `enhance.py` with the
options above on a sample and comparing crops.

## Photo review (23 October 2026)

After the first full run, every one of the 172 masters was looked at as an
art director would, against its source, before anything was approved.

**How.** For each photo, a before/after sheet: the S3 original enlarged with
bicubic next to the *shipped* 3840 WebP (so the WebP compression was judged
too), the whole photo side by side, and three crops: the most important face
(found by a face detector) fitted, its eyes at 1:1, and the windows where the
network changed the picture most at 1:1 (lettering, ornament, texture), with
deity faces and certificates cropped by hand where needed. App icons: all 18
side by side at 384 px. Then every detected face of 140 px or less, 360 of
them, on 45 face sheets: bicubic | first run | Lanczos + unsharp mask. Numbers
were used to choose where to look first, not to approve: the fidelity guard,
the PSNR/SSIM of each face, the colour difference (CIELAB ΔE of the master
scaled back against the source, both colour-managed), an overshoot measure for
halos (master luma beyond the local range of the bicubic enlargement) and the
WebP-against-master PSNR.

**What it found** (first run, s = 0.25):

| problem | where | verdict |
| --- | --- | --- |
| **Small faces redrawn**: doll eyes, drawn brows, plastic skin, a different expression | real faces 16–104 px tall in the source, at enlargements from 2.7× to 15×: the pathashala group (69 faces), students (`dhyana.jpg`, `students-1.jpg`, `small-students.jpg`), the women at the hospital seva, the bonsai convention guests; **Sri Swamiji's own face** in more than a dozen photos (22–104 px, e.g. the kshetra and darshan photos `01-kalagni-…`, `dattatreya-nirajanam.jpg`, `527_dc26632e472dd434.jpg`, the Auckland album, `515_47c13ada69bd6850.jpg`, the stamp-record certificate); Sri Bala Swamiji at 56 px; painted and sculpted faces 57–128 px, from 1.9× (the Datta painting `521_f2fc…`, the Trimurti painting, the Guru painting `521_a785…`, the Guru Purnima portraits, Garuda statues) | **fixed: face guard** (below) |
| **Lettering rewritten** into look-alike glyphs | Guinness certificates (on one, Sri Swamiji's name came out "Gonopathy Sachchidononda Swomiji"), the giant Gita's pages, album covers ("Guest Artist" → "Guunt Ar"), posters, signs ("SURABHI", "HUNDI" → "HUIIDI"), banners ("21 JUNE" → "1100116", "Service to God" → "Sorvloo") | **fixed: protected regions**, 30 photos |
| **Deity faces drawn bolder**: silver eye covers turned into graphic almonds, kohl thickened, eyes rounder | Marakata Subrahmanya Swami, Padmavathi Devi, the three faces of the Datta murti in `525_8898…` (the face guard alone protects those of `521_f84a…`); in the 16 kshetra thumbnails (enlarged 15×) the eyes turned to rings, so all their deity faces are protected as a rule | **fixed: protected regions**, 28 photos (the detector finds some murti faces itself and protects them) |
| **Crowds turned to mosaic** | `nadamandapa-sahsrachandra.jpg` (400 px, every devotee ~5 px), the Vadya Vaibhavam album (113 musicians at 2–3 px), the yoga-camp rows of `kriya-yoga-all.jpg`, the far crowd of `nadamandapa-interior.jpg`, the arena's upper tiers | **fixed**: the first two go to the Lanczos route, the others have protected regions |
| **App icons** | 9 of 18: the goddess's open eyes became slits, Sri Rama and Sita's eyes black blobs, invented faces on the Vishwaroopa, Sri Swamiji's 20 px face sterner on two icons, a deity's eyes turned to yellow almonds, the lettering of the Veda Pathashala logo and two seals ("MYSORE" drifting) | **fixed: Lanczos route** (the face guard protects Sri Swamiji's face on two more) |
| Painterly texture at 1:1 | foliage, flowers, granite, silk in sources under ~600 px (the kshetra thumbnails, `bonsai*.jpg`, `vishwam-outer.jpg`, the entrance gate) | **approved**: invisible at the sizes the pages show them; only the originals can fix it (see the list below) |
| Colour shift | none. Three photos first looked shifted (ΔE 4–4.6): they carry Display P3 or Adobe RGB profiles, which the enhancer converts to sRGB as it should; compared colour-managed, mean ΔE is 0.6–2.5 (median 1.3), the removed JPEG noise | approved |
| Halos, ringing | none visible; the overshoot measure peaks on logos and lettering (a 1–2 px dark rim on the logo's lace edge at 1:1) | approved |
| Tiling seams | none (tiled = whole-image output, see "Tiles"; no seam on any sheet) | approved |
| WebP q66 at 3840 | 33.7–45.7 dB against the master; no blocking, banding or colour bleed seen on any sheet at 1:1 (skies: the sunset album, Sydney, the mountain poster) | approved |

**Lower denoise strength is not the fix.** On `dhyana.jpg` (faces 44 px)
s = 0.25, 0.1 and 0 all gave the same doll faces: the network invents a face
when the source has too few pixels of one, whatever the blend. Lanczos +
unsharp mask was the only faithful version, so faces and lettering that are
too small are kept out of the network instead.

**The face guard, and why 130 px.** On the face sheets, real faces up to
104 px and painted or sculpted faces up to 128 px changed character at some
enlargement; every face of 130 px or more stayed true (`sadguru-deva.jpg`
202 px, the Sri Bala Swamiji portrait 333 px, the honours photos 130–140 px,
the Mekedatu murti 136 px). So faces under 130 px are protected at every
enlargement; above it the network sharpens them. The detector also finds a
few parrots, cows and ornaments: protecting those costs nothing.

**`photos/overrides.json`** holds every per-photo decision, each with a
note saying why: **73 photos**. 11 go to the Lanczos route entirely (the
400 px crowd `nadamandapa-sahsrachandra.jpg`, the Vadya Vaibhavam album
and 9 app icons); 62 keep **99 regions** out of the network: 12 photos of
certificates, 18 of lettering (album covers, posters, signs, banners, the
logo ribbon), 28 of deity faces (including 14 kshetra thumbnails) and 4 of
crowds and painted portraits. Regions were placed on a
grid over each original and checked on the result. Re-rendered, every
fixed photo was compared again: first run | reviewed (the faces are back to
the source's expression, certificates read as they do in the source,
crowds are soft but not invented).

**Approved as they were**: the large portraits and every photo whose faces
are 130 px or more (the portraits of Sri Swamiji and Sri Bala Swamiji, the
speech and darshan photos), architecture, the stage and hall
photos, the logos and store badges, the lettering that was already legible
and stayed exact (the Vishwam stamp, "sgsbirds.com", the German poster).

**Showcase for the client.** The 12 best before/after pairs from the final
masters (the portraits of Sri Swamiji and Sri Bala Swamiji, the Mekedatu
murti, the Vishwam stamp, the Shuka Vana logo, the home page gopurams, the
Sydney Opera House) were delivered with the review as two sheets
(`showcase-1.png`, `showcase-2.png`, not committed): the same crop of the
web copy enlarged with bicubic and of the shipped 3840 copy, side by side.

## Results (23 October 2026)

**After the review** (the masters the site ships now):

- **172 of 172** masters: 154 photos at 3840 px on the long edge (portraits
  2533–2858 px wide), 18 app icons at 512 px. Enlargement from 1.9× (the
  2048 px photo) to 15.7× (the 245 px kshetra thumbnails).
- **Route**: 161 by the network (x4, s = 0.25), 11 by Lanczos + unsharp mask
  (2 photos, 9 icons). The face guard found 1 052 faces in the photos and
  kept the 1 015 under 130 px out of the network, in 106 photos (and 4
  icons); `photos/overrides.json` kept 99 more regions out in 62 photos.
  Only 19 photos are enhanced edge to edge; in the others the protected
  parts are as soft as the source allows, by design.
- **Fidelity**, master scaled back to the source: PSNR 26.3–42.9 dB, median
  31.6 (`<28`: 9, 28–30: 38, 30–32: 37, 32–34: 35, 34–36: 13, ≥36: 22).
  5 flagged and reviewed below (10 before the review).
- **Time**: 53 minutes for the re-render with 2 workers × 2 threads on the
  shared machine (load 6–10); the face guard adds about 0.2 s per photo and
  each protected blend well under a second. A re-run with nothing new: 8 s.
- **Masters**: 458 MB in `.cache/img-4k/` (not shipped).
- **Shipped WebP**: 149.1 MB in 828 files (before the review 152.0 MB: the
  protected regions compress a little better). Share images: 16 × 1200×630,
  2.1 MB.

**The first full run** (before the review, for the record): 172 of 172 by
the x4 route in 48 minutes; PSNR 25.8–38.7 dB, median 30.7; 10 flagged.

- **Shipped WebP**, `src/assets/img/opt/` (sizes after the review):

  | width | before: files | before: MB | after: files | after: MB |
  | --- | ---: | ---: | ---: | ---: |
  | 96 / 192 / 384 / 512 (icons) | 0 | 0 | 72 | 1.1 |
  | 480 | 111 | 3.4 | 154 | 5.6 |
  | 960 | 67 | 5.7 | 154 | 15.3 |
  | 1600 | 33 | 6.0 | 154 | 26.1 |
  | 2560 | 0 | 0 | 148 | 41.0 |
  | 3840 | 0 | 0 | 131 | 53.7 |
  | the photo's own width | 129 | 6.4 | 15 | 6.5 |
  | **total** | **340** | **21.5** | **828** | **149.1** |

  Before, a photo's largest copy was its web copy's width (median 800 px);
  now every photo has 480, 960 and 1600 copies, and the 2560/3840 ones only
  load where a screen needs them. Largest files: `67ceae7ed033-2858.webp`
  975 KB (Karya Siddhi Hanuman, portrait master), `f3b75a2f951a-3840.webp`
  922 KB (veena ensemble), `adb4b0949566-3840.webp` 876 KB,
  `817f0c8ef0e3-2560.webp` 871 KB, `220ece1aebe7-3840.webp` 847 KB. Nothing
  is over 1 MB.

## In the browser (23 October 2026)

What a visitor's browser actually downloads and shows, measured in Chromium,
against the site as it was before the enhanced photos.

**How.** Two copies of the built site from the same snapshot of the code: one
with the current photo copies (identical to `site/`), one with the previous
copies (`src/assets/img/opt/` of commit `7f51385`, the last commit before the
enhanced ones; `HEAD` already carries the new manifest, so `git show HEAD:`
would compare the site with itself). Both served by a small static server on
127.0.0.1:18800 and :18801; third-party hosts (Google Fonts, YouTube) made
unreachable for both, so absolute times are a little optimistic and the
comparison is fair. Chromium 141 (Playwright 1.49.1), headless, on the shared
4-core build machine (load about 4), no CPU throttling. Seven pages (index,
sri-swamiji, darshan, attractions, media with its gallery and lightbox, seva,
kn/index) at three devices: **phone** 390×844 at 3×, **laptop** 1440×900 at
2×, **4K monitor** 3840×2160 at 1×. For every `<img>`: the srcset candidate it
loaded (`currentSrc`), its layout size and fit; for every file under
`assets/img/`: its bytes (Resource Timing, encoded body). *First view* = after
load and network quiet, no scrolling (it includes lazy images inside
Chromium's loading margin); *full scroll* = the page scrolled top to bottom.
LCP from a `PerformanceObserver`, median of 3 runs: laptop and 4K throttled
to 20 Mbit/s down, 5 up, 20 ms; phone to DevTools' "Fast 4G" (8.1 Mbit/s,
1.35 up, 165 ms). The rig (servers, measuring and lightbox scripts) was a
working tool, not committed.

**Which copy each screen gets.**

- **4K monitor**: every one of the 21 images whose box needs 2000 screen
  pixels or more loaded the **3840** copy (before: 620–1600 px copies,
  stretched up to 6×). The home hero (2688×2038 box) now draws from 3840
  instead of 1024.
- **Laptop**: page heroes load 3840 (a 1440×~700 hero cropped by
  `object-fit: cover` needs ~2880 px at 2×); cards 960, thumbnails 480.
- **Phone**: heroes load **1600** (before 1024–1600). Of 253 image loads on
  the seven pages: 55 app icons at 192, 34 at 480, 63 at 960, 72 at 1600, and
  35 at 2560/3840. Those 35 are all `object-fit: cover` crops whose crop
  really needs it at 3× (a 390×844 story plate of a landscape photo shows a
  1266 px wide slice: 3797 screen px), sized by `site.js`.
- With `sizes="auto"` (Chromium 126+) the picks are close to ideal: only
  **3** of all images loaded a copy more than one step too large. One is a
  real waste: the Sri Swamiji page hero on the 4K screen (a 460×684 box,
  `sizes="100vw"`) loads 3840 (280 KB) where 1600 (108 KB) is enough. The
  other two reuse a 3840 copy already loaded by the hero (no extra bytes).
- **Double downloads**: 10 times over the 21 page loads, 476 KB in all
  (before: 7, 215 KB). A lazy image near the top starts loading with
  `sizes="auto"`, then `site.js` raises its `sizes` for the cover crop and the
  browser fetches the larger copy as well (e.g. the home page's Sri Swamiji
  portrait, 960 then 1600 on the laptop).

**Image bytes, MB** (now, before in brackets):

| page | phone: first view | phone: full scroll | laptop: first view | laptop: full scroll | 4K: first view | 4K: full scroll |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| index | 0.22 (0.11) | 5.96 (2.18) | 0.77 (0.23) | 5.52 (1.98) | 0.63 (0.24) | 4.54 (1.79) |
| sri-swamiji | 0.30 (0.15) | 3.57 (2.26) | 0.48 (0.15) | 3.24 (2.02) | 0.84 (0.51) | 1.88 (1.39) |
| darshan | 0.29 (0.25) | 5.47 (2.47) | 0.92 (0.28) | 4.54 (2.11) | 0.81 (0.28) | 2.47 (1.62) |
| attractions | 0.24 (0.24) | 5.35 (2.47) | 1.08 (0.27) | 5.67 (2.34) | 0.91 (0.30) | 4.22 (1.95) |
| media | 0.15 (0.08) | 3.59 (2.21) | 0.24 (0.08) | 3.80 (2.39) | 0.72 (0.47) | 1.94 (1.44) |
| seva | 0.71 (0.58) | 3.45 (1.97) | 1.10 (0.46) | 3.59 (1.72) | 1.25 (0.54) | 2.37 (1.54) |
| kn/index | 0.22 (0.11) | 5.96 (2.18) | 0.77 (0.23) | 5.47 (1.98) | 0.63 (0.24) | 4.54 (1.79) |
| **7 pages** | **2.13** (1.52) | **33.35** (15.74) | **5.36** (1.70) | **31.83** (14.54) | **5.79** (2.58) | **21.96** (11.52) |

So a full read of a page costs about twice the image bytes it did (phone
4.8 MB instead of 2.2 on average), and the first screen 1.4× (phone) to 3.2×
(laptop).

**LCP** (median of 3; before in brackets):

| page | phone, Fast 4G | laptop, 20 Mbit/s | 4K, 20 Mbit/s | LCP image now (phone / laptop / 4K) |
| --- | ---: | ---: | ---: | --- |
| index | 1.43 s (1.37) | 1.50 s (1.24) | 3.23 s (2.66) | hero 1600 / 3840 / 3840 |
| sri-swamiji | 1.24 s (1.25) | 1.09 s (1.24) | 2.35 s (2.50) | hero 1600 / 3840; 4K: a 960 portrait |
| darshan | 1.36 s (1.30) | 1.18 s (1.20) | 2.40 s (2.65) | hero 1600 / 3840 / 3840 |
| attractions | 1.35 s (1.33) | 1.27 s (1.22) | 3.21 s (2.24) | hero 1600 / 3840 / 3840 |
| media | 1.30 s (1.16) | 1.05 s (1.12) | 2.31 s (2.36) | hero 1600 / 3840 / 3840 |
| seva | 0.87 s (0.94) | 1.09 s (1.32) | 1.96 s (2.37) | hero 1600 / 3840 / 3840 |
| kn/index | 1.56 s (1.58) | 1.46 s (1.36) | 2.92 s (3.87) | hero 1600 / 3840 / 3840 |
| **mean** | **1.30 s** (1.27) | **1.23 s** (1.24) | **2.63 s** (2.67) | |

Every page stays under 2.5 s on the phone and the laptop, and the means do
not move: the heroes are preloaded with the right candidate, the phone's
hero copy grows only from 0.11 to 0.22 MB, and before the first paint the
page's HTML, CSS and scripts weigh more than the photo (on the phone home
page 574 KB against the hero's 224 KB, served uncompressed here; a real host
compresses them, which helps old and new alike). The home
page on the laptop is the one clear loss (+0.26 s: its 3840 hero is 397 KB
where the 2560 one, 228 KB, would cover the box; see the `sizes` list below).
The 4K numbers are dominated by painting a 3840×2160 screen on this shared CPU
(runs of one page vary from 1.5 to 4.0 s), so read them as "no measurable
change", not as a gain.

**Browsers without `sizes="auto"`.** Every lazy `<img>` says
`sizes="auto, 100vw"`. Browsers that do not implement `auto` use `100vw`:
according to caniuse that is **Safari on macOS and iOS** (no version yet) and
Firefox before 150. Emulated in Chromium (the attribute served as
`"autox, 100vw"`, which Chromium skips as Safari skips `auto`; Safari's own
choice between two candidates can differ a little):

| 7 pages | first view now (before) | full scroll now (before) |
| --- | ---: | ---: |
| phone | 3.20 MB (1.95) | 38.87 MB (16.46) |
| laptop | **12.37 MB** (2.56) | **63.53 MB** (16.43) |
| 4K | **13.29 MB** (3.69) | **57.74 MB** (15.23) |

On a Mac every card and thumbnail asks for the full window width: a 120×90
thumbnail on attractions loads the 3840 copy (761 KB) where 480 (40 KB) is
enough, a 220×124 media thumbnail the 2858 one (975 KB instead of 80 KB).
434 images were loaded too large, 77 MB in all. This is the most important
thing stage 2 has to fix (list below); it is not something the copies can
fix, because the copies must go up to 3840 for the screens that need them.

**Lightbox.** Opening a gallery photo on media.html:

- On the **4K screen** it loads the 3840 copy (255–575 KB) and shows it
  **1200 px wide**: `site.css` caps `.lightbox-dialog img` at
  `max-width: min(1200px, 92vw)` and `max-height: 80vh`. With the cap lifted
  (shot with `max-width: 92vw` injected, not changed in the site) it fills
  2748×1728 px: the 4K view the copies were made for.
- On a 4K monitor at 200 % (1920×1080 at 2×) it shows 2400 screen px from the
  3840 copy: right.
- On the **phone** it shows 359×226 px (1077 screen px) and still loads the
  3840 copy (255–575 KB); the 1600 copy (99–217 KB) is enough. Over all 154
  photos the largest copy averages 410 KB, the 1600 one 165 KB.
- Detail crops at 1:1 screen pixels on the 4K screen, before (the previous
  site's largest copy, enlarged by the browser to the same 2748 px display)
  and after (the 3840 copy): the temple gopuram (source 1024 px), the
  Rajarajeshwari Sannidhi with Sri Swamiji (source 1600 px) and Sri Swamiji
  at Shuka Vana (source 620 px). The sculpture, the beard and the cockatoos'
  crests are crisp where the previous copy is visibly blurred; Sri Swamiji's
  face at Shuka Vana (kept out of the network by the face guard) is clean
  but only as detailed as its 620 px source. Delivered with this report as
  `crop-4k-*.png` (not committed).

## Review of flagged photos

Each flagged photo was compared with its source (whole image, and crops at a
1600 px display width and at 1:1). `tests/photos.test.mjs` requires every
flagged hash to appear here. Flagged now (after the photo review):

| hash | photo | source | PSNR / SSIM | verdict |
| --- | --- | --- | --- | --- |
| `dd88796ffdce` | `guru-linage.png`, the Datta Guru Parampara composition (guru-parampara) | 1057×1600, transparent | 28.11 / 0.889 | Approved. The source is a 256-colour dithered palette image; the master drops the dither speckle (hence the low SSIM against the speckled source). The face guard keeps 6 of its 7 painted faces (86–115 px) out of the network: the first run had darkened their eyes. Composition unchanged. Semi-transparent (35 % of pixels): copies use WebP alpha quality 70. |
| `84867b012479` | `504_a0ea7bcb7689b96a.jpg`, Sri Swamiji and Sri Bala Swamiji with guests at the Bonsai Convention 2016 (attractions) | 1050×700 | 29.78 / 0.909 | Approved after the review. The first run turned the guests' faces (37–54 px) into plastic masks; now all 12 faces are kept out of the network and match the source. The low SSIM comes from the enhanced background. Ask for the original. |
| `7bad4a829c50` | `app-store.jpg`, "Download on the App Store" badge | 421×125, greyscale | 30.87 / 0.928 | Approved: lettering and logo crisp; the source's JPEG ringing on black is gone. (Apple's official SVG badge would be better still.) |
| `275ae60ac712`, `5d1a44045aa9` | app icons: "uddharedatmanatmanam" yoga seal, the padukas | 100×100 | 24.77 / 0.943, 29.34 / 0.936 | Approved: the lettering of the first stays true; on the second the ring of tiny script (illegible in the source too) becomes graphic dashes, at 96–192 px on the page. |

Flagged in the first run and no longer: `ed04f9253cfc`
(`nadamandapa-sahsrachandra.jpg`, the crowd from above: the network turned
the ~5 px devotees into an invented mosaic at every strength, so it now goes
to the Lanczos route: soft, but every head is where the photo has it; it
needs a larger original), `2f9daf178993` (`datta-peetham-logo.png`: approved,
its ribbon lettering now kept letter-true), and the icons `869d09d677c1`,
`9e2489ce3d3f`, `a9d9eb595603` (sent to the Lanczos route by the review:
eyes and faces were redrawn).

## Ask the Peetham for camera originals of these

The enhancement makes every photo clean at the sizes the pages show it, but
these web copies are too small to look truly 4K, however they are enlarged:
on a 4K screen, in the lightbox, or wherever the face guard and
`photos/overrides.json` had to keep faces, lettering or crowds out of the
network (those parts stay exactly as soft as the source). Put each original
in [`photos/originals/`](../photos/originals/README.md) under the S3 file
name below and re-run; the photo's override can then usually be deleted. For
the album covers, posters and logos, the design files are what to ask for.

Every photo under 1000 px is listed (none of them can be true 4K), then the
larger photos whose faces or lettering the review protected. "Enlarged" is
the master's width divided by the source's.

### First: the Gurus, the deities and the page heroes

| what | photo (S3 file) | source px | enlarged | where it is used (page › section) |
| --- | --- | --- | --- | --- |
| Sri Swamiji, the main portrait; also the default share image | `sadguru-deva.jpg` | 800×642 | ×4.8 | Guru Parampara › A golden thread of Gurus; Home › A Life of Divine Compassion; Media › Watch the living tradition; Teachings › Sayings for the seeker |
| Sri Bala Swamiji, the main portrait | `523_e0e53980acae1f62.jpg` | 605×904 | ×4.2 | Home › A Life of Divine Compassion; Media › Watch the living tradition; Sri Swamiji › Sri Datta Vijayananda Teertha Swamiji |
| Sri Bala Swamiji | `bala-swamiji.jpg` | 411×386 | ×9.3 | Guru Parampara › A golden thread of Gurus |
| Sri Swamiji, standing | `521_8c4d6d00c834d30b.jpg` | 353×531 | ×7.2 | About › Guru Parampara |
| Sri Jayalakshmi Maata | `524_61f724d553c7b9ff.jpg` | 255×321 | ×12.0 | Guru Parampara › A golden thread of Gurus; Guru Parampara › Sri Jayalakshmi Maata; Sri Swamiji › A Life of Divine Compassion |
| Sri Swamiji; share image of the Sri Swamiji page | `appaji-4.jpeg` | 1024×683 | ×3.8 | Darshan › Festivals through the year; Events › Twelve months, one sacred cycle; Sri Swamiji › Sri Ganapathy Sachchidananda Swamiji; Teachings › Words that awaken |
| Sri Bala Swamiji; share image of the Media page | `bs-2-speech.jpeg` | 1079×720 | ×3.6 | Events › The rhythm of Ashram life; Media › Media & Teachings; Teachings › Words that awaken |
| Kaalaagni Shamana Dattatreya, the presiding deity, with Sri Swamiji | `01-kalagni-shamana-dattatreya-mysore-karnataka-india.jpg` | 402×500 | ×7.7 | About › From a straw hut to an international institution; Darshan › Universal Prayer Hall; Home › Our Pillars of Service; Home › Datta Peetham Mandir Nagari; Seva › Our Pillars of Service |
| Padmavathi Devi alankara, with Sri Swamiji | `527_dc26632e472dd434.jpg` | 526×789 | ×4.9 | Darshan › Sri Datta Venkateshwara Temple |
| Marakata Subrahmanya Swami | `527_1ad4471b592a4c0b.jpg` | 502×600 | ×6.4 | Darshan › Sri Datta Venkateshwara Temple |
| painting of Lord Datta | `521_f2fc8688669a865d.png` | 480×548 | ×7.0 | About › Guru Parampara; Guru Parampara › A golden thread of Gurus |
| painting of a Guru of the lineage | `521_a785386beb92ac80.png` | 368×368 | ×10.4 | About › Guru Parampara; Guru Parampara › A golden thread of Gurus |
| the Guru Parampara composition (a 256-colour web copy) | `guru-linage.png` | 1057×1600 | ×2.4 | Guru Parampara › A golden thread of Gurus |
| home page hero and share image | `502_43ac49e40550ce21.png` | 1024×644 | ×3.8 | About › The campus at a glance; Home › Guiding humanity towards a more conscious, compassionate world; Home › Walk the Ashram before you arrive; Media › Darshan in pictures; Visit › Visit the Ashram; Visit › Once you arrive |
| share image of the Centres page | `528_322ad0b196f6e909.jpg` | 1000×666 | ×3.8 | About › From a straw hut to an international institution; Attractions › More to discover; Centres › From Mysuru to the world; Darshan › Karya Siddhi Hanuman Temple; Home › Datta Peetham Mandir Nagari; Home › Immersive Visual Experience; Visit › A serene and pure atmosphere |
| share image of the Seva page | `516_2d522eb6783cea2d.jpg` | 1000×666 | ×3.8 | About › The campus at a glance; Seva › Nitya Annadana; Sri Swamiji › Six streams of one mission |
| Kriya Yoga hero and share image (a collage of ~60 small photos) | `kriya-yoga-all.jpg` | 1080×810 | ×3.6 | Kriya Yoga › Datta Kriya Yoga |

### A. Under 600 px: enlarged 6.4× to 15.7× (48 photos)

| photo (S3 file) | what it shows | source px | enlarged | where it is used (page › section) | review |
| --- | --- | --- | --- | --- | --- |
| `thumb_16-leela-vishwambara-dattatreya-surat-gujarat-india.jpg` | The flower-garlanded idol of Leela Vishwambhara Dattatreya at Surat | 245×245 | ×15.7 | Centres › Sixteen shrines for the sixteen manifestations of Lord Datta | 2 regions not enhanced |
| `thumb_11-deva-deva-dattatreya-nuzividu-andhra-pradesh-india.jpg` | The copper-toned idol of Deva Deva Dattatreya at Nuzvid, under a golden arch | 248×248 | ×15.5 | Centres › Sixteen shrines for the sixteen manifestations of Lord Datta | 3 regions not enhanced |
| `thumb_15-maaya-mukta-avadhoota-dattatreya-achcharapakam-tamil-nadu-india.jpg` | The flower-garlanded idol of Maaya Mukta Avadhoota Dattatreya at Acharapakkam | 248×248 | ×15.5 | Centres › Sixteen shrines for the sixteen manifestations of Lord Datta | 1 region not enhanced |
| `thumb_14-siddha-raja-dattatreya-cochin-kerala-india.jpg` | The black multi-armed idol of Siddha Raja Dattatreya at Kochi, dressed in yellow and red silk | 249×249 | ×15.4 | Centres › Sixteen shrines for the sixteen manifestations of Lord Datta | 2 small faces not enhanced |
| `thumb_01-kalagni-shamana-dattatreya-mysore-karnataka-india.jpg` | Arati being offered to Kaalaagni Shamana Dattatreya, the main deity of the Peetham, in Mysuru | 250×250 | ×15.4 | Centres › Sixteen shrines for the sixteen manifestations of Lord Datta; Centres › Avadhoota Datta Peetham, Mysuru | 1 small face not enhanced; 1 region not enhanced |
| `thumb_02-yogi-raja-vallabha-dattatreya-proddatur-andhra-pradesh-india.jpg` | The flower-garlanded idol of Yogiraja Vallabha Dattatreya at Proddatur | 250×250 | ×15.4 | Centres › Sixteen shrines for the sixteen manifestations of Lord Datta | 1 region not enhanced |
| `thumb_03-datta-yogi-raja-bangalore-karnataka-india.jpg` | The flower-garlanded idol of Datta Yogiraja at Bengaluru | 250×250 | ×15.4 | Centres › Sixteen shrines for the sixteen manifestations of Lord Datta | 2 regions not enhanced |
| `thumb_04-gnaana-saagara-dattatreya-anantapur-andhra-pradesh-india.jpg` | The flower-garlanded idol of Gnaana Saagara Dattatreya at Anantapur | 250×250 | ×15.4 | Centres › Sixteen shrines for the sixteen manifestations of Lord Datta | 1 small face not enhanced; 2 regions not enhanced |
| `thumb_05-shyamakamala-lochana-dattatreya-vijayawada-andhra-pradesh-india.jpg` | The flower-garlanded idol of Shyamakamala Lochana Dattatreya at Vijayawada | 250×250 | ×15.4 | Centres › Sixteen shrines for the sixteen manifestations of Lord Datta | 1 small face not enhanced; 1 region not enhanced |
| `thumb_06-atri-varada-dattatreya-machilipatnam-andhra-pradesh-india.jpg` | The flower-garlanded idol of Atri Varada Dattatreya at Machilipatnam | 250×250 | ×15.4 | Centres › Sixteen shrines for the sixteen manifestations of Lord Datta | 3 regions not enhanced |
| `thumb_07-samskaara-heena-shivaroopa-dattatreya-jaya-lakshmi-puram-andhra-pradesh-india.jpg` | The idol of Samskaara Heena Shivaroopa Dattatreya at Jayalakshmipuram, draped in red with bead malas | 250×250 | ×15.4 | Centres › Sixteen shrines for the sixteen manifestations of Lord Datta | 2 regions not enhanced |
| `thumb_08-aadi-guru-dattatreya-chennai-tamil-nadu-india.jpg` | The flower-garlanded idol of Aadi Guru Dattatreya at Chennai | 250×250 | ×15.4 | Centres › Sixteen shrines for the sixteen manifestations of Lord Datta | 2 regions not enhanced |
| `thumb_09-digambara-datta-rishikesh-uttarakhand-india.jpg` | The flower-garlanded idol of Digambara Datta at Rishikesh | 250×250 | ×15.4 | Centres › Sixteen shrines for the sixteen manifestations of Lord Datta | 1 region not enhanced |
| `thumb_10-vishwambara-avadhoota-dattatreya-aakividu-andhra-pradesh-india.jpg` | The idol of Vishwambaravadhoota Dattatreya at Akividu, in white and purple robes with bead malas | 250×250 | ×15.4 | Centres › Sixteen shrines for the sixteen manifestations of Lord Datta | 2 regions not enhanced |
| `thumb_12-datta-avadhoota-hyderabad-andhra-pradesh-india.jpg` | The flower-garlanded idol of Dattavadhoota at Hyderabad | 250×250 | ×15.4 | Centres › Sixteen shrines for the sixteen manifestations of Lord Datta | 3 regions not enhanced |
| `thumb_13-datta-digambara-gandigunta-andhra-pradesh-india.jpg` | The flower-garlanded idol of Datta Digambara at Gandigunta | 250×250 | ×15.4 | Centres › Sixteen shrines for the sixteen manifestations of Lord Datta | 1 small face not enhanced; 1 region not enhanced |
| `album-67f4d6465a899.png` | Sri Aditya Raga Sagara album cover | 300×300 | ×12.8 | Home › Healing through music; Media › Listen in stillness; Music › Albums of healing music | 1 small face not enhanced; 2 regions not enhanced |
| `album-67f4d68c59289.png` | Atma Shanti Raga Sagara album cover | 300×300 | ×12.8 | Home › Healing through music; Media › Listen in stillness; Music › Albums of healing music | 1 region not enhanced |
| `album-67f4d6c569d84.png` | Mauna Dhyana Raga Sagara album cover | 300×300 | ×12.8 | Home › Healing through music; Media › Listen in stillness; Music › Albums of healing music | 3 regions not enhanced |
| `album-67f4d7178d0d3.png` | Sachchidananda Vadya Vaibhavam album cover | 300×300 | ×12.8 | Home › Healing through music; Media › Listen in stillness; Music › Albums of healing music | kept out of the network entirely |
| `album-67f4d7a752613.png` | Raga Sagara album cover | 300×300 | ×12.8 | Home › Healing through music; Media › Listen in stillness; Music › Albums of healing music | 1 small face not enhanced; 3 regions not enhanced |
| `524_61f724d553c7b9ff.jpg` | Sri Jayalakshmi Maata | 255×321 | ×12.0 | Guru Parampara › A golden thread of Gurus; Guru Parampara › Sri Jayalakshmi Maata; Sri Swamiji › A Life of Divine Compassion | 1 small face not enhanced |
| `521_a785386beb92ac80.png` | Narasimha Saraswati Swami | 368×368 | ×10.4 | About › Guru Parampara; Guru Parampara › A golden thread of Gurus | 1 small face not enhanced |
| `522_0d2ff86d5c11536d.png` | The arched entrance gate of Avadhoota Datta Peetham, Mysuru, framed by palms | 396×240 | ×9.7 | About › From a straw hut to an international institution; Visit › Write to the Ashram | – |
| `bonsai-1.jpg` | A paved path through the Bonsai Garden lined with potted bonsai trees | 400×267 | ×9.6 | Attractions › Kishkindha Moolika Bonsai Garden | – |
| `bonsai.jpg` | Sri Swamiji seated among bonsai trees in the garden, one hand raised in blessing | 400×267 | ×9.6 | Attractions › Kishkindha Moolika Bonsai Garden | 1 small face not enhanced |
| `concert-67f4d4ecb0b8a.png` | Sri Swamiji on a stage set with snow-capped peaks, raising a staff — Antar Mukha Raga Sagara | 400×267 | ×9.6 | Events › Raga Sagara concerts; Music › Music for Meditation & Healing | 1 small face not enhanced |
| `concert-67f4d5588be18.png` | Sri Swamiji at the keyboard before a waterfall backdrop — Krishnamrutha Raga Sagara | 400×267 | ×9.6 | Events › Raga Sagara concerts; Music › Music for Meditation & Healing | 1 small face not enhanced |
| `concert-67f4d58f252ca.png` | Sri Swamiji at the keyboard before garlanded deities — Vishwavasu Raga Sagara | 400×267 | ×9.6 | Events › Raga Sagara concerts; Music › Music for Meditation & Healing | 3 small faces not enhanced |
| `concert-67fb669375448.png` | Concert image for Adi Guru Raga Sagara, Music for Meditation, SGS Ashrama, Chennai, 15 April 2025, showing Sri Swamiji at the keyboard | 400×267 | ×9.6 | Events › Raga Sagara concerts; Music › Music for Meditation & Healing | 1 small face not enhanced; 2 regions not enhanced |
| `datta-peetham-logo.png` | (decorative, no alt text) | 400×400 | ×9.6 | Darshan › Temple timings; Home › Timings, live; Visit › The rhythm of the day | 1 region not enhanced |
| `dattatreya-nirajanam.jpg` | Nirajanam (aarti) offered to a garlanded idol of Lord Dattatreya | 400×267 | ×9.6 | Attractions › More to discover; Darshan › Temple timings; Darshan › Festivals through the year; Events › What’s coming up; Events › Twelve months, one sacred cycle; Teachings › Protecting the eternal way | 1 small face not enhanced |
| `hanuman-400-logo.png` | (decorative, no alt text) | 400×400 | ×9.6 | Darshan › Temple timings; Home › Timings, live; Visit › The rhythm of the day | 1 small face not enhanced |
| `hanuman-temple.jpeg` | Worship at the Karya Siddhi Hanuman temple | 400×267 | ×9.6 | Home › Walk the Ashram before you arrive; Visit › Once you arrive | 1 small face not enhanced |
| `nadamandapa-sahsrachandra.jpg` | Nada Mantapa filled with devotees seated in rows, seen from above | 400×267 | ×9.6 | Attractions › Nada Mantapa; Music › Nada Mantapa | kept out of the network entirely |
| `nadamantapa.jpg` | The lit stage of Nada Mantapa beneath its curved ceiling | 400×267 | ×9.6 | Attractions › Nada Mantapa; Music › Sit with the music | 1 small face not enhanced |
| `sgs-birds-logo-2.png` | (decorative, no alt text) | 400×400 | ×9.6 | Attractions › Shuka Vana; Home › Timings, live; Visit › The rhythm of the day | 1 small face not enhanced |
| `vadhya-section.jpg` | Glass display cases of musical instruments in the Vishwam Museum | 400×266 | ×9.6 | Attractions › Vishwam Museum | 1 small face not enhanced |
| `vishwam-outer.jpg` | The Vishwam Museum entrance pavilion and building, framed by trees | 400×267 | ×9.6 | Attractions › Vishwam Museum | 3 regions not enhanced |
| `bala-swamiji.jpg` | Sri Datta Vijayananda Teertha Swamiji (Sri Bala Swamiji) | 411×386 | ×9.3 | Guru Parampara › A golden thread of Gurus | 1 small face not enhanced |
| `app-store.jpg` | Download on the App Store | 421×125 | ×9.1 | Home › Datta Peetham in your pocket; Media › The Peetham in your pocket | – |
| `feeding-gow.jpg` | Sri Swamiji feeding a calf | 500×333 | ×7.7 | Media › Darshan in pictures | 1 small face not enhanced |
| `sgs-cows.jpg` | Sri Swamiji with garlanded cows at the Ashram Goshala | 500×333 | ×7.7 | Seva › Gomaata — Mother Cow; Visit › Once you arrive | 3 small faces not enhanced |
| `sgs-gau-shala-3.jpg` | Sri Swamiji among the cows in the Goshala stalls | 500×333 | ×7.7 | Seva › Gomaata — Mother Cow | 2 small faces not enhanced |
| `sgs-kamadenu.jpg` | Gau Pooja | 500×333 | ×7.7 | Darshan › Offer worship, wherever you are; Home › Latest sevas; Media › Darshan in pictures; Seva › Gomaata — Mother Cow | 3 regions not enhanced |
| `01-kalagni-shamana-dattatreya-mysore-karnataka-india.jpg` | Sri Swamiji before Kaalaagni Shamana Dattatreya, the main deity of the Peetham | 402×500 | ×7.7 | About › From a straw hut to an international institution; Darshan › Universal Prayer Hall; Home › Our Pillars of Service; Home › Datta Peetham Mandir Nagari; Seva › Our Pillars of Service | 1 small face not enhanced; 1 region not enhanced |
| `521_8c4d6d00c834d30b.jpg` | Sri Ganapathy Sachchidananda Swamiji | 353×531 | ×7.2 | About › Guru Parampara | 1 small face not enhanced |
| `521_f2fc8688669a865d.png` | Sripada Vallabha Swami | 480×548 | ×7.0 | About › Guru Parampara; Guru Parampara › A golden thread of Gurus | 5 small faces not enhanced |

### B. 600 to 999 px: enlarged 3.8× to 6.4× (37 photos)

| photo (S3 file) | what it shows | source px | enlarged | where it is used (page › section) | review |
| --- | --- | --- | --- | --- | --- |
| `527_1ad4471b592a4c0b.jpg` | Marakata Subrahmanya Swami, adorned with flowers | 502×600 | ×6.4 | Darshan › Sri Datta Venkateshwara Temple | 1 region not enhanced |
| `18-datta-rameshvara-kshetra-manginapudi.jpg` | The garlanded idols at the seaside Datta Rameshwaram temple, Manginapudi, with worship being offered beside them | 600×450 | ×6.4 | Centres › Sixteen shrines for the sixteen manifestations of Lord Datta | 1 small face not enhanced; 2 regions not enhanced |
| `dhyana.jpg` | Three Pathashala students chanting before the shrine | 600×400 | ×6.4 | Seva › Preserving the Vedas | 3 small faces not enhanced |
| `dp-app.png` | The Datta Peetham app on two phones: a sign-in screen and a page about Sri Swamiji | 600×600 | ×6.4 | Home › Datta Peetham in your pocket; Media › The Peetham in your pocket | 1 small face not enhanced |
| `hospitalseva-67f4b197b5e90.png` | Staff and volunteers gathered beside a mobile cancer detection unit, a saffron-robed swami on its steps | 600×400 | ×6.4 | Media › Darshan in pictures; Seva › Serving with compassion | 25 small faces not enhanced |
| `sgs-hospital.jpg` | The SGS Hospital building | 600×400 | ×6.4 | Visit › Once you arrive | 3 regions not enhanced |
| `small-students.jpg` | Two young students of the Pathashala chanting | 600×400 | ×6.4 | Seva › Preserving the Vedas | 2 small faces not enhanced |
| `students-1.jpg` | Three Veda Pathashala students seated at a microphone, chanting | 600×400 | ×6.4 | Home › Our Pillars of Service; Media › Darshan in pictures; Seva › Our Pillars of Service; Seva › Preserving the Vedas | 3 small faces not enhanced; 1 region not enhanced |
| `513_89d98c9589d0e47e.png` | Cover of the treatise Raga Ragini Nadayoga, showing Sri Swamiji at the keyboard before chakra symbols | 488×606 | ×6.3 | Music › An ocean of ragas; Sri Swamiji › Six streams of one mission | 1 small face not enhanced; 1 region not enhanced |
| `shukhavana-2.jpg` | Sri Swamiji, smiling and waving, surrounded by green parrots at Shuka Vana | 620×327 | ×6.2 | Attractions › Shuka Vana; Home › Immersive Visual Experience; Media › Watch the living tradition; Media › Darshan in pictures | 1 small face not enhanced |
| `shukhavanam.jpg` | Sri Swamiji smiling, with dark palm cockatoos perched on his arms and shoulders and white cockatoos on perches behind him | 620×327 | ×6.2 | Attractions › Shuka Vana; Media › Watch the living tradition; Media › Darshan in pictures | 1 small face not enhanced |
| `517_b44ff25ab7d80e86.jpg` | Sri Swamiji receiving the honorary doctorate from Sri Krishna Devaraya University | 640×395 | ×6.0 | Music › Honours in music | 5 small faces not enhanced; 1 region not enhanced |
| `bonsai-3.jpg` | A pavilion and pools in the Kishkindha Moolika Bonsai Garden | 750×510 | ×5.1 | Home › Walk the Ashram before you arrive; Media › Darshan in pictures; Visit › Once you arrive | – |
| `527_dc26632e472dd434.jpg` | Goddess Padmavathi Devi, adorned with garlands | 526×789 | ×4.9 | Darshan › Sri Datta Venkateshwara Temple | 1 small face not enhanced; 1 region not enhanced |
| `517_83aaf9bd0e92e042.jpg` | Sri Swamiji receives the framed Guinness World Records certificate for the largest breathing lesson from a Guinness World Records official, Milpitas, 2016 | 663×794 | ×4.8 | Kriya Yoga › Taught across the world | 2 regions not enhanced |
| `08-aadi-guru-dattatreya-chennai-tamil-nadu-india.jpg` | Aadi Guru Dattatreya, the Datta Kshetra at Chennai | 800×608 | ×4.8 | About › The campus at a glance | 2 small faces not enhanced; 2 regions not enhanced |
| `513_104a06683924cef7.png` | Sri Swamiji seated in a forest, playing the veena (black-and-white photograph) | 800×600 | ×4.8 | Music › Nada Chikitsa healing through music | 1 small face not enhanced |
| `517_f883351cdab78b0a.jpg` | Sri Swamiji and two bonsai artists in aprons shaping a bonsai on stage at the 2016 Bonsai Convention and Exhibition | 800×534 | ×4.8 | Attractions › Kishkindha Moolika Bonsai Garden | 4 small faces not enhanced |
| `nadamandapa-interior.jpg` | Inside Nada Mantapa: a large audience faces a row of figures in saffron robes seated facing them | 800×534 | ×4.8 | Attractions › Nada Mantapa; Home › Walk the Ashram before you arrive; Media › Darshan in pictures; Music › Nada Mantapa; Teachings › Teachings you can live; Visit › Once you arrive | 2 regions not enhanced |
| `sadguru-deva.jpg` | Sri Ganapathy Sachchidananda Swamiji | 800×642 | ×4.8 | Guru Parampara › A golden thread of Gurus; Home › A Life of Divine Compassion; Media › Watch the living tradition; Teachings › Sayings for the seeker | – |
| `shikhavana-avairy.jpg` | Aerial view of the Shuka Vana aviary, a tall meshed enclosure among trees, with the Shuka Vana logo | 800×450 | ×4.8 | Attractions › Shuka Vana; Home › Walk the Ashram before you arrive; Media › Watch the living tradition; Visit › Once you arrive | – |
| `playstore.png` | Android app on Google Play | 817×242 | ×4.7 | Home › Datta Peetham in your pocket; Media › The Peetham in your pocket | – |
| `503_45eeebc041e1b039.jpg` | Shuka Vana banner reading “Paradise for birds, Mysore, India” over an aerial view of the aviary | 820×312 | ×4.7 | Attractions › Shuka Vana | – |
| `518_9b28c72e49a393cb.jpg` | Collage announcing the Guinness World Record for the largest display of bonsai trees: 2,649 trees, 21 December 2016 | 820×312 | ×4.7 | Attractions › Kishkindha Moolika Bonsai Garden | 2 small faces not enhanced; 2 regions not enhanced |
| `518_dc50e08d3e9b68eb.png` | Sri Swamiji holding the Guinness World Records certificate, with a green parrot on his shoulder | 843×863 | ×4.4 | Attractions › Shuka Vana; Seva › Two eyes: birds and trees; Sri Swamiji › Honoured across the world | 1 small face not enhanced; 1 region not enhanced |
| `515_47c13ada69bd6850.jpg` | Sri Swamiji seated on a stage, arms outstretched, teaching Datta Kriya Yoga | 900×599 | ×4.3 | About › A day at the Peetham; Home › Healing through music; Kriya Yoga › Union, through action; Teachings › Teachings you can live | 1 small face not enhanced |
| `523_e0e53980acae1f62.jpg` | Sri Datta Vijayananda Teertha Swamiji (Sri Bala Swamiji), smiling, with sacred marks on His forehead and a rudraksha mala | 605×904 | ×4.2 | Home › A Life of Divine Compassion; Media › Watch the living tradition; Sri Swamiji › Sri Datta Vijayananda Teertha Swamiji | – |
| `517_6bdd743580dc469e.png` | Sri Swamiji leading Nadi Shuddhi breathing exercises for a hall of participants | 950×536 | ×4.0 | Sri Swamiji › Six streams of one mission | 4 small faces not enhanced |
| `503_01480717a489eef4.jpg` | Sri Swamiji holding the Guinness World Records certificate, a parrot perched on his shoulder | 960×959 | ×4.0 | Attractions › Shuka Vana | 1 region not enhanced |
| `505_f73389d00159c742.jpg` | Sri Swamiji and a Guinness World Records adjudicator holding the certificate in front of the giant Vishwam Museum stamp | 960×540 | ×4.0 | Attractions › Vishwam Museum | 2 small faces not enhanced; 1 region not enhanced |
| `508_445bbfeadfdd6504.jpg` | Datta Kriya Yoga students demonstrating asanas on stage during International Yoga Day | 960×638 | ×4.0 | Attractions › More to discover; Kriya Yoga › Datta Kriya Yoga International Centre; Kriya Yoga › Yoga for everyone | 3 small faces not enhanced; 4 regions not enhanced |
| `516_90f2ada10257f568.jpg` | Sri Swamiji hands over sacks of food grains to the Mysuru District Administration | 960×540 | ×4.0 | Seva › Nitya Annadana | 7 small faces not enhanced; 1 region not enhanced |
| `517_0493971d50e245b1.png` | Sri Swamiji receiving the honorary doctorate from the World Classical Tamil University | 960×640 | ×4.0 | Music › Honours in music | 6 small faces not enhanced |
| `517_3c24d6f6884e527e.jpg` | (decorative, no alt text) | 960×641 | ×4.0 | Media › Watch the living tradition; Music › Honours in music | 4 small faces not enhanced |
| `517_99cf47641ac970a1.jpg` | Sri Swamiji receiving the honorary doctorate at Raj Bhavan, Bengaluru | 960×540 | ×4.0 | Music › Honours in music | 6 small faces not enhanced |
| `517_f9c8d58a028375da.png` | Sri Swamiji receiving the Piteelu Chowdaiah Award in Mysuru | 960×540 | ×4.0 | Music › Honours in music | 6 small faces not enhanced |
| `523_718dd21197aeb983.jpg` | Sri Swamiji seated with Sri Bala Swamiji | 960×640 | ×4.0 | Sri Swamiji › Sri Datta Vijayananda Teertha Swamiji | 3 small faces not enhanced |

### C. 1000 px and more, but with faces or lettering the review kept out of the network (44 photos)

| photo (S3 file) | what it shows | source px | enlarged | where it is used (page › section) | review |
| --- | --- | --- | --- | --- | --- |
| `517_a428def1e565d4c4.jpg` | Rows of musicians with veenas seated on the floor of an arena before a large audience | 1600×816 | ×2.4 | Music › Bhajans: singing the divine names | 231 small faces not enhanced |
| `506_575a490450b5a1d7.jpg` | A concert in Nada Mantapa: musicians on stage before a large seated audience, with portraits of composers along the walls | 1600×1067 | ×2.4 | Attractions › Nada Mantapa; Events › Events & Festivals; Home › Our Pillars of Service; Music › Nada Mantapa; Seva › Our Pillars of Service | 72 small faces not enhanced |
| `529_c0e2947cb6606657.jpg` | Teachers and students of SGS Veda Pathashala, Mysuru, gathered outside the Pathashala | 1440×846 | ×2.7 | Seva › Preserving the Vedas | 69 small faces not enhanced |
| `502_5e6da55ae891b81e.jpg` | Devotees gathered in the Universal Prayer Hall before Sri Swamiji | 1600×1067 | ×2.4 | About › From a straw hut to an international institution; Attractions › Plan your visit to the Ashram; Centres › Avadhoota Datta Peetham, Mysuru; Centres › Come to the Mysuru Ashram; Darshan › Temples & Darshan; Darshan › Universal Prayer Hall; Home › Immersive Visual Experience; Home › Walk the Ashram before you arrive; Media › Darshan in pictures; Sri Swamiji › A Life of Divine Compassion; Visit › Once you arrive | 52 small faces not enhanced |
| `pooja_1007_97003de666a7ddda.jpeg` | Ganapathy Homa | 1080×720 | ×3.6 | Darshan › Offer worship, wherever you are; Home › Latest sevas | 51 small faces not enhanced |
| `526_18a79af1bd690c69.JPG` | Devotees seated at long tables for Annadana while Sri Swamiji walks past | 1000×666 | ×3.8 | About › A day at the Peetham; Darshan › Rajarajeshwari Temple | 45 small faces not enhanced |
| `502_f4837402856c5496.jpg` | Salagramas arranged as Ananthanaga Shayana beneath a great serpent hood at Hari Sannidhi | 1600×1067 | ×2.4 | Darshan › Hari Sannidhi; Media › Darshan in pictures; Visit › Once you arrive | 44 small faces not enhanced |
| `appaji-in-homa.jpeg` | (decorative, no alt text) | 2048×1366 | ×1.9 | Events › Celebrate with the Ashram; Sri Swamiji › Come for darshan in Mysuru | 41 small faces not enhanced |
| `514_6a747f84068c1524.jpg` | Vedic scholars and students seated in rows at the Annual Veda Sabha | 1600×1066 | ×2.4 | About › A day at the Peetham | 31 small faces not enhanced; 2 regions not enhanced |
| `kriya-yoga-all.jpg` | (decorative, no alt text) | 1080×810 | ×3.6 | Kriya Yoga › Datta Kriya Yoga | 28 small faces not enhanced; 1 region not enhanced |
| `523_d72e3bd45e536b33.jpg` | (decorative, no alt text) | 1600×1066 | ×2.4 | Media › Watch the living tradition; Sri Swamiji › Sri Datta Vijayananda Teertha Swamiji | 24 small faces not enhanced |
| `512_2ba4f2446543d71a.jpg` | Sri Swamiji walks past rows of SDHS volunteers at a parade | 1024×704 | ×3.8 | About › A day at the Peetham; Seva › Volunteer with SDHS | 19 small faces not enhanced |
| `516_2d522eb6783cea2d.jpg` | Annadana by Sri Swamiji: devotees seated in rows for a meal | 1000×666 | ×3.8 | About › The campus at a glance; Seva › Nitya Annadana; Sri Swamiji › Six streams of one mission | 19 small faces not enhanced |
| `516_583cfb7a3a724742.jpg` | (decorative, no alt text) | 1000×750 | ×3.8 | not on a page today | 16 small faces not enhanced; 3 regions not enhanced |
| `526_c5009ca5f3f06179.jpg` | Annakoota of many food items arranged before Sri Rajarajeshwari Devi | 1600×1067 | ×2.4 | Darshan › Rajarajeshwari Temple | 13 small faces not enhanced |
| `504_a0ea7bcb7689b96a.jpg` | Sri Swamiji and Sri Bala Swamiji with honoured guests holding plaques at the International Bonsai Convention and Exhibition 2016 | 1050×700 | ×3.7 | Attractions › Kishkindha Moolika Bonsai Garden | 12 small faces not enhanced |
| `521_6bf96e8628462d56.png` | Painting of the Guru Parampara: the Trinity above Lord Dattatreya, with the lineage of Gurus below | 877×1200 | ×3.2 | Guru Parampara › What is Guru Parampara? | 11 small faces not enhanced |
| `517_28d9d127ff58baf4.jpg` | Sri Swamiji seated with the Nada Yoga Sarvabhauma citation, surrounded by dignitaries | 1600×1067 | ×2.4 | Music › Honours in music | 11 small faces not enhanced |
| `517_9731381c10bc96c2.jpg` | Sri Swamiji receiving the Guinness World Records certificate for most people chanting at a single venue | 1600×1039 | ×2.4 | Sri Swamiji › Honoured across the world | 11 small faces not enhanced; 1 region not enhanced |
| `522_76f24eb8666dc213.jpg` | A healing music concert in progress: musicians on a darkened stage, and above them a large screen showing Raga Saama with its zodiac sign, element, chakra and the part of the body it is said to affect | 1600×1066 | ×2.4 | Music › Where melody becomes medicine | 6 small faces not enhanced; 1 region not enhanced |
| `guru-linage.png` | The Datta Guru Parampara, from Lord Dattatreya at the top to Sri Swamiji | 1057×1600 | ×2.4 | Guru Parampara › A golden thread of Gurus | 6 small faces not enhanced |
| `521_c857a326b3939174.jpg` | Garlanded portraits of the Guru Parampara arranged for worship | 1600×1066 | ×2.4 | Events › Twelve months, one sacred cycle; Guru Parampara › Guru Parampara | 5 small faces not enhanced; 1 region not enhanced |
| `album_image_34_2de4d4104dae5c00.jpg` | Cover of the Proddatur Ashrama photo album | 1000×666 | ×3.8 | Media › Darshan in pictures | 5 small faces not enhanced |
| `524_60f82f9dcd1649ad.jpg` | Sri Swamiji at the Aradhana of Sri Narahari Teertha Swami, before the shrine | 1190×1200 | ×3.2 | Guru Parampara › Sri Jayalakshmi Maata | 5 small faces not enhanced; 1 region not enhanced |
| `512_b7f437033ed03d4a.jpg` | Rows of volunteers in matching shirts seated in a large hall at an earlier volunteers’ camp at SGS Ashram, Mysuru | 1600×1067 | ×2.4 | Events › What’s coming up; Seva › Volunteer with SDHS | 4 small faces not enhanced |
| `521_f84a964b2a2a31f4.jpg` | Lord Dattatreya | 800×1200 | ×3.2 | About › Guru Parampara; Guru Parampara › A golden thread of Gurus; Media › Darshan in pictures | 4 small faces not enhanced |
| `album_image_64_5ee720afebbd6e36.jpg` | Cover of the DYC Canada photo album | 1000×667 | ×3.8 | Media › Darshan in pictures | 4 small faces not enhanced; 1 region not enhanced |
| `513_a9cd007c07ab1712.jpg` | Collage: the Sydney Opera House at dusk, the audience in its hall, and Sri Swamiji holding a Guinness World Records certificate | 1600×1130 | ×2.4 | Centres › Golden threads from Mysuru | 3 small faces not enhanced; 1 region not enhanced |
| `525_8898ed676f2abba2.jpg` | Lord Dattatreya with three heads, adorned with garlands | 800×1200 | ×3.2 | Guru Parampara › Lord Dattatreya; Media › Watch the living tradition | 3 small faces not enhanced; 1 region not enhanced |
| `524_e81cb9e39404b7ea.jpg` | Sri Swamiji offering flowers before the image of Sri Jayalakshmi Maata at her Aradhana | 1600×1067 | ×2.4 | Guru Parampara › Sri Jayalakshmi Maata; Sri Swamiji › A Life of Divine Compassion | 3 small faces not enhanced |
| `526_e88b9dc2cc6ecfa2.jpg` | Sri Swamiji performs Kumbhabhisheka atop the Rajarajeshwari temple | 800×1200 | ×3.2 | Darshan › Rajarajeshwari Temple | 3 small faces not enhanced |
| `514_bb5a23cc41a0f878.jpg` | Sri Swamiji feeds the cows at the Gau Shala, Mysuru Ashram | 1600×1067 | ×2.4 | Home › Our Pillars of Service; Seva › Our Pillars of Service; Teachings › Protecting the eternal way | 3 small faces not enhanced |
| `527_e54f0e9f5481af23.jpeg` | Sri Swamiji offers worship to Sri Datta Venkateshwara Swamy | 1440×958 | ×2.7 | Darshan › Sri Datta Venkateshwara Temple; Events › What’s coming up; Events › Twelve months, one sacred cycle; Home › Datta Peetham Mandir Nagari | 2 small faces not enhanced; 1 region not enhanced |
| `vishwam-record.jpg` | Sri Swamiji and a Guinness World Records adjudicator holding a certificate before a giant stamp of the Vishwam Museum | 1600×1065 | ×2.4 | Attractions › Vishwam Museum | 2 small faces not enhanced; 1 region not enhanced |
| `517_0f1b0c465f134173.jpg` | Sri Swamiji with three Guinness World Records certificates before the giant Bhagavad Gita book | 1100×824 | ×3.5 | Sri Swamiji › Honoured across the world | 1 small face not enhanced; 1 region not enhanced |
| `514_b7a1c01aeacc37c6.jpg` | An arena filled with thousands of devotees seated in rows, facing a stage and large screens | 1600×1066 | ×2.4 | Centres › Golden threads from Mysuru; Home › Our Pillars of Service; Seva › Our Pillars of Service; Teachings › Protecting the eternal way; Teachings › Carry the teachings home | 1 small face not enhanced; 2 regions not enhanced |
| `527_398025271699adef.jpg` | Sri Swamiji before Sachchidananda Ganapathy | 800×1200 | ×3.2 | Darshan › Sri Datta Venkateshwara Temple; Events › Twelve months, one sacred cycle | 1 small face not enhanced; 2 regions not enhanced |
| `527_4e2708a40a3ee0ce.jpg` | Sri Swamiji worships Sarva Dosha Hara Shiva | 1600×1067 | ×2.4 | Darshan › Sri Datta Venkateshwara Temple; Darshan › Festivals through the year; Events › Twelve months, one sacred cycle | 1 small face not enhanced; 1 region not enhanced |
| `517_0eaa9fdc9b71b96c.jpg` | Sri Swamiji holding the Guinness World Records certificate for the largest Carnatic band | 1600×1066 | ×2.4 | Music › Honours in music; Sri Swamiji › Honoured across the world | 1 region not enhanced |
| `pooja_1189_b7bd843d77efb493.jpg` | Sri Lakshmi Narasimha Swamy Kalyana | 1080×720 | ×3.6 | Darshan › Offer worship, wherever you are; Home › Latest sevas | 1 region not enhanced |
| `526_d126a05ad90b71ef.jpg` | Sri Swamiji offers arati to Sri Rajarajeshwari Devi | 1600×1067 | ×2.4 | Darshan › Festivals through the year; Events › Twelve months, one sacred cycle; Home › Immersive Visual Experience; Visit › Come for darshan | 1 region not enhanced |
| `517_253e8bbd49117dcc.jpg` | Sri Swamiji receiving the Guinness World Records certificate from an adjudicator | 1600×1066 | ×2.4 | Attractions › Kishkindha Moolika Bonsai Garden | 1 region not enhanced |
| `album_image_62_1269c3f481bde5b4.jpg` | Cover of the DYC Germany photo album | 1000×380 | ×3.8 | Media › Darshan in pictures | 1 region not enhanced |
| `502_2b81050a75adc422.jpg` | Sri Swamiji at the Rajarajeshwari Sannidhi | 1600×1067 | ×2.4 | About › From a straw hut to an international institution; Darshan › Rajarajeshwari Temple; Home › Datta Peetham Mandir Nagari; Media › Darshan in pictures; Visit › Once you arrive | 1 region not enhanced |

The 16 kshetra thumbnails (250 px, enlarged 15×) have larger versions on S3
for two of the shrines (`01-kalagni-…` 402×500, `08-aadi-guru-…` 800×608):
the centres page could use those files instead (a page change: `object-fit`
crops them square); the others need originals.

## Share images

One per page, 1200×630, cut from the page's master (attention crop; 404 has a
fixed one so Sri Swamiji's head stays in frame). Pages that share a photo
share identical files.

| slug | page | photo (S3 path) | `ogKey(url)` | crop | size |
| --- | --- | --- | --- | --- | --- |
| 404 | 404.html | `homepage_assets/site_1/front_page_images/sadguru-deva.jpg` | `32ead86a6b9c` | centre (0.5, 0.35) | 98 KB |
| about | about.html | `content/page_images/527/527_3e9d83aa1fdb79cf.png` | `0eb90facd8a7` | attention | 213 KB |
| attractions | attractions.html | `content/page_images/504/504_0ec527dbfb1dd0a2.jpg` | `f3291f67254f` | attention | 190 KB |
| centers | centers.html | `content/page_images/528/528_322ad0b196f6e909.jpg` | `44ea93755121` | attention | 121 KB |
| contact | contact.html | `content/page_images/522/522_e6aadc94cb31b022.jpg` | `be2e0bc4233f` | attention | 91 KB |
| darshan | darshan.html | `content/page_images/502/502_5e6da55ae891b81e.jpg` | `7c65cb825ff3` | attention | 157 KB |
| events | events.html | `content/page_images/506/506_575a490450b5a1d7.jpg` | `e0b821ff85fa` | attention | 197 KB |
| guru-parampara | guru-parampara.html | `content/page_images/521/521_c857a326b3939174.jpg` | `15a2baaaf4c6` | attention | 211 KB |
| index | index.html | `content/page_images/502/502_43ac49e40550ce21.png` | `d9993ce6fb77` | attention | 100 KB |
| kriya-yoga | kriya-yoga.html | `homepage_assets/site_1/front_page_images/kriya-yoga-all.jpg` | `0473a560a827` | attention | 154 KB |
| media | media.html | `homepage_assets/site_1/front_page_images/bs-2-speech.jpeg` | `3123cdb41815` | attention | 72 KB |
| music | music.html | `content/page_images/522/522_76f24eb8666dc213.jpg` | `3c1a2fc5c8a8` | attention | 68 KB |
| seva | seva.html | `content/page_images/516/516_2d522eb6783cea2d.jpg` | `ff8a3e3a410e` | attention | 116 KB |
| sri-swamiji | sri-swamiji.html | `homepage_assets/site_1/front_page_images/appaji-4.jpeg` | `14a588216c97` | attention | 114 KB |
| teachings | teachings.html | `content/page_images/522/522_e6aadc94cb31b022.jpg` | `be2e0bc4233f` | attention | 91 KB |
| visit | visit.html | `content/page_images/502/502_43ac49e40550ce21.png` | `d9993ce6fb77` | attention | 100 KB |

**Not wired yet (stage 2).** `src/layout.mjs` shares
`src/assets/img/og/<ogKey(url)>-<w>x<h>.jpg`, which `tools/make-og.mjs` cuts
from the small web copies (never enlarged, so `sadguru-deva.jpg` gives
800×420). Two things to settle when wiring these:

- `tools/make-og.mjs` deletes every `.jpg` in `src/assets/img/og/` it did not
  write, so running it removes the `<slug>.jpg` files (re-run
  `tools/enhance-photos.mjs` to restore them; `tests/photos.test.mjs` fails
  while they are missing).
- Pick one: have `shareImage()` in `src/layout.mjs` use `og/<slug>.jpg`
  (absolute URL, 1200×630, `image/jpeg`), or have `make-og.mjs` crop from the
  master in `.cache/img-4k/` (the run report lists each photo's master), and
  drop the other set so both are not shipped (2.2 MB).

## Stage 2: what the pages should change

Measured in "In the browser" above. None of these is in the photo pipeline's
files: they are in the components, `site.css` and `site.js`.

1. **State a real `sizes` per component** (Safari, iOS, older Firefox; worth
   up to 77 MB over the seven pages). `img()` in `src/components.mjs` already
   takes a `sizes` option and `build.mjs` keeps a `sizes` it finds, but no
   caller passes one, so every lazy image gets `auto, 100vw`. Keep `auto`
   first (`sizes="auto, …"`): Chromium then still uses the layout width and
   `site.js`'s cover fix still finds `[sizes^="auto"]`. The largest layout
   widths measured (CSS px at 390 / 768 / 1024 / 1440 / 3840 wide windows;
   wider than the box where `object-fit: cover` crops), and a value that never
   asks for less:

   | component | pages | extra MB without it | widths | `sizes="auto, …"` |
   | --- | --- | ---: | --- | --- |
   | `.gallery .g-item img` | media, sri-swamiji (attractions' `.ch-gallery` up to 768) | 11.3 | 462 / 588 / 648 / 648 / 648 | `(min-width: 1100px) 650px, (min-width: 700px) 590px, 120vw` |
   | `article.card .card-media img` | sri-swamiji, darshan, attractions, seva, index | 12.0 | 434 / 705 / 367 / 452 / 452 | `(min-width: 1100px) 460px, (min-width: 700px) 92vw, 115vw` |
   | `.dn-strip-item img` | darshan | 5.7 | 331 / 257 / 257 / 271 / 271 | `(min-width: 700px) 275px, 85vw` |
   | `.hours-card .hc-img img` | index, darshan, attractions | 5.5 | 60 (darshan up to 130) | `130px` |
   | `.dn-fest-media img` | darshan | 3.4 | 356 / 385 / 523 / 304 / 304 | `(min-width: 1100px) 305px, (min-width: 700px) 525px, 95vw` |
   | `.dn-moment img` | darshan | 3.1 | 129 / 258 / 158 / 192 / 192 | `(min-width: 700px) 260px, 130px` |
   | `.ix-album img` | index | 3.0 | 229 / 192 / 174 / 175 / 175 | `230px` |
   | `.photo-tile img` | index | 2.6 | 601 / 571 / 571 / 721 / 721 | `(min-width: 1100px) 725px, (min-width: 700px) 575px, 155vw` |
   | `.track-cover img` | media | 2.5 | 64 / 76 / 76 / 76 / 76 | `76px` |
   | `.ix-app img`, `.app-icon img` | index, media | 2.9 | 60 | `60px` |
   | `.cta-bg img` | sri-swamiji, darshan, attractions, media | 1.9 | 781 / 707 / 960 / 1176 / 1176 | `(min-width: 1240px) 1180px, (min-width: 700px) 95vw, 205vw` |
   | `.series-art img` | media | 1.9 | 372 / 705 / 495 / 606 / 606 | `(min-width: 1100px) 610px, (min-width: 700px) 92vw, 100vw` |
   | `.rt-media img` | media | 1.7 | 245 / 235 / 235 / 235 / 235 | `245px` |
   | `.pa-img img` | media | 1.5 | 303 / 603 / 397 / 492 / 492 | `(min-width: 1100px) 495px, (min-width: 700px) 80vw, 80vw` |
   | `.at-record-img img` | attractions | 1.9 | 312 / 135 / 135 / 135 / 135 | `(min-width: 700px) 135px, 80vw` |

   Check the breakpoints against `site.css` (700 / 1100 px were read off the
   measured widths, not the stylesheet). A test like the one in
   `tests/photos.test.mjs` can then forbid a bare `auto, 100vw` on anything
   that is not full-bleed.
2. **Hero `sizes`.** The home hero (`.ix-hero-img`, `src/pages/index.mjs`)
   says `100vw` but its crop needs 79–86 % of the window from 1440 px up
   (1237 px at 1440, 3241 at 3840; 100 % at 1024):
   `sizes="(min-width: 1440px) 86vw, 100vw"` gives the laptop the 2560 copy
   (228 KB) instead of 3840 (397 KB) and should win back its +0.26 s LCP. The
   Sri Swamiji page hero (`pageHero` in `src/components.mjs`; on that page a
   portrait frame needing 1012–1026 px from 1440 up, 954 at 1024) needs a
   `sizes` option: `(min-width: 1440px) 1030px, 100vw` (4K: the 1600 copy,
   108 KB, instead of 3840, 280 KB). Full-bleed page heroes are right as they
   are. (On phones the heroes' cover crops are up to 3× the window wide;
   `100vw` gives them the 1600 copy, about 2 screen pixels per image pixel at
   3× (before: 1024 or 1600 copies). Leave it: asking for more would cost the
   phone's LCP.)
3. **Lightbox** (`src/assets/css/site.css` `.lightbox-dialog img`,
   `src/assets/js/site.js` `show()`): lift the 1200 px cap (`max-width:
   92vw`, keep `max-height: 80vh`) so a 4K screen shows the 4K copy; and make
   it pick by screen: give the dialog `<img>` the thumbnail's `srcset` (the
   gallery `<img>` inside the button has it) and `sizes` set to the box it
   will fill (`min(92vw, 80vh × aspect)` computed in `show()`), keeping
   `data-full` as the fallback. Phones then load 1600 (165 KB on average)
   instead of the largest copy (410 KB).
4. **Double downloads from the cover fix** (476 KB over 21 page loads):
   `site.js` raises `sizes` after Chromium has started loading the lazy images
   near the top. Either let the component state the cover `sizes` (item 1
   covers most), or run the cover fix before those images start (an inline
   script right after them, or `loading="lazy"` images given their `sizes`
   by the build from the layout).
5. **Optional: cap phones at 2×.** `site.js` asks for the full 3× density on
   cover crops. Capping the density at 2 (`need × min(devicePixelRatio, 2) /
   devicePixelRatio`) would cut the phone's full-scroll bytes on the seven
   pages from 33.3 MB to 20.9 MB (−37 %), with no difference anyone can see on
   a phone. A decision for the lead.
6. **Run the photo tests.** `npm test` does not run `tests/photos.test.mjs`;
   add it to `test` and `verify` in `package.json`.

## Open issues for the build

- **Size of the site.** The shipped photos grow from 21.5 MB to 149 MB
  (the built site from 45 MB to about 170 MB; all five languages share the
  copies). Check the host's deployment size limits and the repository's.
- **Soft patches by design.** At 1:1 on a 4K screen, a face or a line of
  lettering kept out of the network is visibly softer than the enhanced
  photo around it (a feathered edge, no seam). That is the honest result of a
  small source; the camera original removes it.
- **Disk.** A full re-render needs about 1 GB free on the build machine
  (masters, the copies being replaced, the downloads); the review's run hit
  `ENOSPC` on the shared box twice and those two photos were re-run. A failed
  photo keeps its previous copies and the run exits 1, so nothing broken
  ships, but the summary must be read.
- **An unused photo.** `516_583cfb7a3a724742.jpg` (the Dallas food drive) is
  in the manifest and named in `src/pages/seva.mjs`, but no page shows it
  today; its copies (0.8 MB) ship for nothing until a page uses it or
  its manifest entry is removed.
- **Cache.** File names are unchanged for the widths that existed before
  (`<hash>-480/960/1600.webp`), and `/assets/img/*` is cached for 30 days, so
  a returning visitor can see the old, softer copy for up to a month.
- **Not photos.** Logos and the two store badges go through the photo route
  (they enhance cleanly). The official App Store / Google Play badges exist
  as SVG and would be sharper and smaller.
- **npm script.** `package.json` still runs `npm run images` →
  `tools/optimize-images.mjs`, which now hands over to
  `tools/enhance-photos.mjs`; a direct script (`"photos": "node build.mjs &&
  node tools/enhance-photos.mjs && node build.mjs"`) is for the lead to add.


## Running it

```
node tools/enhance-photos.mjs [options]
  --only=a,b        only photos whose URL contains a or whose hash is b
  --dry-run         list what would be downloaded / enhanced, change nothing
  --force           re-render masters and copies even when cached
  --workers=N --threads=N   pool size (default 2 x 2)
  --python=PATH --models=DIR   the enhancer (default .cache/upscale-venv, .cache/realesrgan)
  --report=FILE     where to write the JSON report (+ -summary.txt)
  --no-og           skip share images      --no-prune  keep unused copies
```

The models directory holds the two Real-ESRGAN weights and the face guard's
`face_detection_yunet_2023mar.onnx`; the Python needs `opencv-python-headless`
too (tools/upscale/README.md). Without them the tool stops before doing
anything.

A full run from scratch took 48–53 minutes on the shared 4-core build machine;
a re-run with nothing new takes seconds (cached masters, cached copies). Then `node build.mjs` and `node --test tests/photos.test.mjs`.

To change a setting (denoise strength, the face-guard size, a quality, the
widths), edit the constants at the top of `tools/enhance-photos.mjs`; the
masters and copies the change affects are re-rendered on the next run.
`VERSION` forces all of them.

**Per-photo decisions** go in `photos/overrides.json`, keyed by the photo's S3
path (or its file name, full URL or `sha1(url)[:12]`), always with a `note`
saying why:

```json
"content/page_images/518/518_dc50e08d3e9b68eb.png": {
  "protect": [[0.41, 0.31, 0.38, 0.45]],
  "note": "Guinness certificate: misspelt Sri Swamiji's name" }
```

- `protect`: `[x, y, w, h]` regions, fractions of the photo (0,0 = top
  left), kept out of the network. Place them on a grid drawn over the
  original and check the result at 1:1.
- `route: "lanczos"`: no network at all for this photo.
- `dni`: its own denoise strength (the review found no photo that needed one).
- `faceMax`: its own face-guard limit in source px (default 130).
- `usm`: `"amount,threshold[,sigma]"` for its Lanczos parts (default `0.5,2`).

The tool checks the file before it starts (unknown fields, a region outside
the photo) and `tests/photos.test.mjs` checks that every entry still names a
photo on the site and was applied. Only a person who has looked at the photo
should add an entry; nothing in the pipeline writes this file.

### When a page gets a new photo

1. Use the S3 URL in the page as before.
2. Run the three commands above (or `npm run images`). The tool finds the new
   URL in the built site, downloads it, renders its master and copies, and
   the second build serves it from the copies. Until then it loads from S3,
   and `tests/photos.test.mjs` fails on that page: do not publish it so.
3. Look at it, at 1:1 against the source enlarged with bicubic: faces
   (the face guard has kept those under 130 px faithful; check the larger
   ones and any deity face or painting), lettering, crowds. Anything the
   network redrew gets a region in `photos/overrides.json` and a re-run.
   The summary prints its fidelity; a flagged photo needs a look and a line
   under "Review of flagged photos" before `tests/photos.test.mjs` passes.
4. If the Peetham has the camera original, put it in `photos/originals/`.
5. `node build.mjs && node --test tests/photos.test.mjs`: it must pass.
6. Commit `src/assets/img/opt/` (copies + manifest) and `src/assets/img/og/`.
7. If the photo goes into a new component, give that `img()` a real `sizes`
   (see "Stage 2", item 1), or Safari loads its 3840 copy for any box.

A photo on the dev bucket stops the build until it has a copy (the CSP blocks
that bucket), exactly as before.

## Tests

`node --test tests/photos.test.mjs` (after `node build.mjs`):

- every manifest entry has a 3840 px master (512 px for app icons), in the
  source's proportions, with its source size, method, scale and fidelity;
- its WebP copies exist, are as wide as their srcset descriptors say, end at
  the master's full width, and nothing in `src/assets/img/opt/` is orphaned;
- every `<img>` on every page (all five languages) that uses a copy has a
  srcset ending at the master's full width (≥ 3840w, or the master's width
  for portraits and icons), every candidate exists in the build, and its
  `width`/`height` match the master's proportions;
- every hero preload (`<link rel="preload" imagesrcset>`) offers exactly the
  srcset of an `<img>` on its page, so no screen preloads a smaller copy;
- no `<img>`, background, lightbox source or script loads a photo straight
  from S3 (share tags and JSON-LD keep their S3 URLs on purpose);
- every page has a 1200×630 share image under 300 KB;
- every flagged photo is reviewed in this file;
- every master the network made went through the face guard (`faces` is
  recorded), and no method names a face-restoration or generative model;
- every entry of `photos/overrides.json` names a photo on the site, says why,
  and was applied (the Lanczos route, or at least as many protected regions).

Checked on 23 October 2026 that it catches what it is for: a copy of the
build with one `<img>` pointing straight at an S3 photo fails ("loads a photo
straight from S3"), one with the home hero's srcset cut to 480/960 fails
("largest candidate 960w is below 3840"), one with the hero preload cut the
same way fails; the real build passes (91 tests). `npm test` does not run
this file yet (`package.json` is the lead's; add it to `test` and `verify`).
