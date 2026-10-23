# photos/originals — camera originals from the Peetham

The site's photos come from the Peetham's S3 buckets, where most are **small
web copies**: the median is 800 px wide, and none reaches 4K. The pipeline
(`tools/enhance-photos.mjs`, see [docs/PHOTOS.md](../../docs/PHOTOS.md))
enhances each to a 3840 px master with Real-ESRGAN. That makes them sharp and
clean on large and high-density screens, but an enhanced 800 px photo is not
the same as a 4K photograph: detail the camera captured and the web copy lost
cannot be recovered, only estimated.

**The honest route to true 4K is the camera original.** Put it here and the
pipeline uses it instead of the web copy:

1. Name the file after the S3 file it replaces, e.g. the photo at
   `https://dattapeetham.s3.amazonaws.com/homepage_assets/site_1/front_page_images/sadguru-deva.jpg`
   goes in as `photos/originals/sadguru-deva.jpg`. Any of `.jpg .jpeg .png
   .tif .tiff .webp` is fine (`sadguru-deva.tif` also matches).
2. Or, when the names do not line up, list it in `photos/originals/map.json`:

   ```json
   {
     "sadguru-deva.jpg": "IMG_4821.JPG",
     "https://dattapeetham.s3.amazonaws.com/content/page_images/523/523_e0e53980acae1f62.jpg": "bala-swamiji-2024-portrait.jpg"
   }
   ```

   Keys are the S3 file name or the full URL; values are files in this folder.
3. Run `node build.mjs && node tools/enhance-photos.mjs && node build.mjs`.

What happens to an original:

- **3840 px or more on the long edge**: it is only resized down to 3840 (Lanczos).
  No model touches it.
- **Smaller than 3840**: it is enhanced only as far as 3840, never further.
- Its EXIF rotation and colour profile are applied (converted to sRGB).
- If its shape differs from the web copy's by more than 2 %, the run report
  warns: the page may crop it differently (check the photo's `object-position`).
- If the photo has an entry in [`photos/overrides.json`](../overrides.json)
  (faces, lettering or crowds the photo review kept out of the network
  because the web copy was too small), look at the new master: with a large
  original the entry is usually no longer needed, so delete it and re-run.
  Its regions are fractions of the photo, so they no longer line up if the
  original is framed differently. The face guard needs no change: faces of
  130 px or more in the original go through the network as usual.
- The original stays here; only the WebP copies in `src/assets/img/opt/` are
  shipped. Large originals make the repository heavy: if they run to
  gigabytes, keep them in Git LFS or outside the repository and copy them in
  before a run.

The share previews (`src/assets/img/og/`) are cut from the same master, so
they improve too.
