// The share image (og:image) of a page: its photo cut to the 1.91:1 frame that
// WhatsApp, Facebook, X and LinkedIn show, 1200x630, as a progressive JPEG of
// at most 300 KB (share previews drop larger images). Used by
// tools/enhance-photos.mjs (from each new 4K master) and tools/make-og.mjs
// (re-cuts them all from the masters or the 3840 copies).

export const OG = { w: 1200, h: 630, quality: 85, maxBytes: 300 * 1024 };

// Share-image crops are chosen by sharp's attention strategy (faces, skin,
// saturated colour); a page whose crop cut the subject gets a fixed one here:
// a sharp gravity ('north', 'centre', ...) or { x, y } = the crop centre as a
// fraction of the master. Checked by eye on every page (docs/PHOTOS.md).
export const OG_CROP = {
  // sadguru-deva.jpg (also the default share image): attention picked the
  // clasped hands and cut Sri Swamiji at the eyes; keep His head in frame
  404: { x: 0.5, y: 0.35 },
};

/** Cut `input` (a master, w x h) for page `slug`: { buf, quality, crop }. */
export async function cutShareImage(sharp, input, { w: mw, h: mh }, slug) {
  const crop = OG_CROP[slug];
  let img;
  if (crop && typeof crop === 'object') {
    // fixed centre: scale the master to cover the frame, then cut around (x, y)
    const s = Math.max(OG.w / mw, OG.h / mh);
    const W = Math.round(mw * s), H = Math.round(mh * s);
    const left = Math.min(Math.max(0, Math.round(crop.x * W - OG.w / 2)), W - OG.w);
    const top = Math.min(Math.max(0, Math.round(crop.y * H - OG.h / 2)), H - OG.h);
    img = sharp(input).resize(W, H, { kernel: 'lanczos3' }).extract({ left, top, width: OG.w, height: OG.h });
  } else {
    img = sharp(input).resize(OG.w, OG.h, { fit: 'cover', position: crop || sharp.strategy.attention, kernel: 'lanczos3' });
  }
  const frame = await img.flatten({ background: '#f8f3e9' }).toBuffer();
  let q = OG.quality, buf;
  do {
    buf = await sharp(frame).jpeg({ quality: q, mozjpeg: true, progressive: true }).toBuffer();
    q -= 5;
  } while (buf.length > OG.maxBytes && q >= 60);
  return { buf, quality: q + 5, crop: crop ? JSON.stringify(crop) : 'attention' };
}
