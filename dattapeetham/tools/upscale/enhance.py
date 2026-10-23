#!/usr/bin/env python3
"""Enhance one photo to a 4K master with Real-ESRGAN (general-x4v3 / wdn-x4v3 DNI).

    python tools/upscale/enhance.py INPUT OUTPUT [options]

Writes OUTPUT (a high-quality JPEG, q95 4:4:4 with an sRGB profile, or a PNG
when the photo has transparency) and prints one line of JSON: dimensions,
route, timings and the fidelity guard (the master scaled back down to the
original size and compared with it: PSNR in dB and SSIM on luma).

The network only sharpens and denoises what is in the pixels. It is NOT a face
restoration or generative model (no GFPGAN, CodeFormer or diffusion): faces of
Sri Swamiji, Sri Bala Swamiji, the Gurus and the deities are never redrawn.

Routes (--route):
  x4       one model pass (x4), then Lanczos to the target long edge
  x16      two model passes (x16), then Lanczos down to the target
  pre      Lanczos up to target/4, then one model pass (lands exactly on target)
  lanczos  no model: Lanczos to the target, then a gentle unsharp mask (--usm).
           The fallback for a photo whose review found the network changing
           faces, lettering or crowds (photos/overrides.json): softer, but
           nothing in it is invented
  auto     x4 when 4x the original reaches the target; otherwise the small-original
           rule (--small-route, default from calibration, see docs/PHOTOS.md)
An original whose long edge already reaches the target is only resized down.

--protect x,y,w,h[;x,y,w,h...] (fractions of the photo) keeps the network out of
those regions: there the master is the Lanczos + unsharp-mask enlargement,
blended into the enhanced rest over a soft edge. For lettering, paintings and
crowds that the review found redrawn, while the rest of the photo stays enhanced.

--faces MODEL.onnx is the face guard (on by default in tools/enhance-photos.mjs):
OpenCV's YuNet face detector finds every face in the original, and each one
smaller than --face-max px (default 130) is protected the same way. The photo
review (docs/PHOTOS.md) found the network redraws small faces at any strength:
doll eyes, drawn brows, plastic skin, a different expression; above 130 px the
faces stayed true. It needs `opencv-python-headless` (tools/upscale/README.md).

Tiles overlap by --tile-pad input pixels on every side. The compact network's
receptive field is 34 px (34 stacked 3x3 convolutions), so with a pad of at
least 34 the tiled result equals whole-image inference: there are no seams.
--check-seams proves it on the current image (max abs difference, 8-bit).
"""
import argparse
import io
import json
import math
import os
import sys
import time

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image, ImageCms, ImageOps

Image.MAX_IMAGE_PIXELS = 400_000_000
HERE = os.path.dirname(os.path.abspath(__file__))
RECEPTIVE_RADIUS = 34


# ---------- network (Real-ESRGAN SRVGGNetCompact, written out: no basicsr) ----------
class SRVGGNetCompact(nn.Module):
    def __init__(self, nf=64, nc=32, upscale=4):
        super().__init__()
        self.upscale = upscale
        body = [nn.Conv2d(3, nf, 3, 1, 1), nn.PReLU(num_parameters=nf)]
        for _ in range(nc):
            body += [nn.Conv2d(nf, nf, 3, 1, 1), nn.PReLU(num_parameters=nf)]
        body += [nn.Conv2d(nf, 3 * upscale * upscale, 3, 1, 1)]
        self.body = nn.ModuleList(body)
        self.upsampler = nn.PixelShuffle(upscale)

    def forward(self, x):
        out = x
        for m in self.body:
            out = m(out)
        return self.upsampler(out) + F.interpolate(x, scale_factor=self.upscale, mode='nearest')


def _state(path):
    sd = torch.load(path, map_location='cpu', weights_only=True)
    return sd.get('params_ema', sd.get('params', sd))


def load_net(models_dir, dni):
    """Deep network interpolation, as in Real-ESRGAN's inference script:
    weights = dni * general-x4v3 + (1 - dni) * general-wdn-x4v3.
    dni 1 = strongest denoise (general), 0 = keeps the most grain (wdn)."""
    a = _state(os.path.join(models_dir, 'realesr-general-x4v3.pth'))
    net = SRVGGNetCompact()
    if dni < 1:
        b = _state(os.path.join(models_dir, 'realesr-general-wdn-x4v3.pth'))
        a = {k: dni * a[k] + (1 - dni) * b[k] for k in a}
    net.load_state_dict(a, strict=True)
    return net.eval()


@torch.no_grad()
def sr_x4(net, img, tile=512, pad=40, precision='fp32'):
    """img: float32 numpy HxWx3 in 0..1 -> float32 numpy 4Hx4Wx3 (clamped)."""
    x = torch.from_numpy(np.ascontiguousarray(img.transpose(2, 0, 1))).unsqueeze(0)
    _, _, H, W = x.shape
    out = torch.empty(1, 3, H * 4, W * 4)
    ctx = torch.autocast('cpu', dtype=torch.bfloat16) if precision == 'bf16' else torch.autocast('cpu', enabled=False)
    for y in range(0, H, tile):
        for x0 in range(0, W, tile):
            ya, xa = max(y - pad, 0), max(x0 - pad, 0)
            yb, xb = min(y + tile + pad, H), min(x0 + tile + pad, W)
            with ctx:
                o = net(x[:, :, ya:yb, xa:xb])
            o = o.float().clamp_(0, 1)
            th, tw = min(tile, H - y) * 4, min(tile, W - x0) * 4
            oy, ox = (y - ya) * 4, (x0 - xa) * 4
            out[:, :, y * 4:y * 4 + th, x0 * 4:x0 * 4 + tw] = o[:, :, oy:oy + th, ox:ox + tw]
    return out[0].permute(1, 2, 0).numpy()


# ---------- image I/O ----------
SRGB = ImageCms.createProfile('sRGB')
SRGB_BYTES = ImageCms.ImageCmsProfile(SRGB).tobytes()


def open_image(path):
    """-> (rgb uint8 HxWx3, alpha uint8 HxW or None, grey bool, info dict)"""
    im = Image.open(path)
    info = {'format': im.format, 'mode': im.mode, 'icc': None, 'orientation': None}
    try:
        info['orientation'] = im.getexif().get(0x0112)
    except Exception:
        pass
    im = ImageOps.exif_transpose(im)
    icc = im.info.get('icc_profile')
    if im.mode in ('P', 'PA'):
        im = im.convert('RGBA' if ('transparency' in im.info or im.mode == 'PA') else 'RGB')
    if im.mode in ('I;16', 'I;16B', 'I;16L', 'I'):
        a = np.asarray(im, dtype=np.float64)
        im = Image.fromarray(np.clip(a / (257 if a.max() > 255 else 1), 0, 255).astype(np.uint8), 'L')
    if im.mode == '1':
        im = im.convert('L')
    grey = im.mode in ('L', 'LA')
    alpha = None
    if im.mode in ('RGBA', 'LA', 'RGBa', 'La'):
        alpha = np.asarray(im.getchannel('A'))
        if alpha.min() == 255:
            alpha = None
    if icc:
        try:
            prof = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            desc = (ImageCms.getProfileDescription(prof) or '').strip()
            info['icc'] = desc
            if 'srgb' not in desc.lower().replace(' ', '') or im.mode == 'CMYK':
                base = im.convert('CMYK') if im.mode == 'CMYK' else im.convert('L' if grey else 'RGB')
                im_rgb = ImageCms.profileToProfile(base, prof, SRGB, renderingIntent=ImageCms.Intent.PERCEPTUAL, outputMode='RGB')
                info['converted'] = f'{desc} -> sRGB'
                return np.asarray(im_rgb), alpha, False, info
        except Exception as e:  # a broken profile: fall back to the raw values
            info['icc_error'] = str(e)
    rgb = np.asarray(im.convert('RGB'))
    return rgb, alpha, grey, info


def lanczos(arr, w, h):
    mode = 'L' if arr.ndim == 2 else 'RGB'
    return np.asarray(Image.fromarray(arr, mode).resize((w, h), Image.LANCZOS))


def to_u8(f):
    return (np.clip(f, 0, 1) * 255 + 0.5).astype(np.uint8)


def gauss_blur(a, sigma):
    """separable Gaussian blur of a float32 HxW(xC) array (reflect borders)."""
    r = max(1, int(math.ceil(3 * sigma)))
    k = torch.exp(-(torch.arange(-r, r + 1, dtype=torch.float32) ** 2) / (2 * sigma * sigma))
    k = k / k.sum()
    t = torch.from_numpy(np.ascontiguousarray(a, dtype=np.float32))
    t = t[None, None] if t.ndim == 2 else t.permute(2, 0, 1)[:, None]
    t = F.pad(t, (r, r, 0, 0), mode='reflect')
    t = F.conv2d(t, k.view(1, 1, 1, -1))
    t = F.pad(t, (0, 0, r, r), mode='reflect')
    t = F.conv2d(t, k.view(1, 1, -1, 1))
    t = t[0, 0] if a.ndim == 2 else t[:, 0].permute(1, 2, 0)
    return t.numpy()


def lanczos_usm(rgb, w, h, scale, sigma=None, amount=0.5, threshold=2.0):
    """Lanczos enlargement + a gentle unsharp mask whose radius follows the
    enlargement (the softness Lanczos leaves is about scale/2 px wide). Only
    differences above `threshold` levels are sharpened, so flat skin, sky and
    JPEG noise are left alone. Nothing is invented: every edge is the source's."""
    up = lanczos(rgb, w, h).astype(np.float32)
    if amount <= 0:
        return up.astype(np.uint8)
    sigma = sigma or max(0.8, min(scale, 8) * 0.45)
    d = up - gauss_blur(up, sigma)
    if threshold > 0:
        m = np.abs(d)
        d = np.where(m > threshold, d * np.clip((m - threshold) / threshold, 0, 1), 0)
    return np.clip(up + amount * d, 0, 255).round().astype(np.uint8)


def detect_faces(rgb, model, min_px=10, score=0.6):
    """YuNet on the original (enlarged to a 1400 px long edge when smaller, so
    faces of 10-20 px are found too). -> [{x, y, w, h, score}] in source px."""
    import cv2  # opencv-python-headless; only needed for the face guard
    cv2.setNumThreads(1)
    h, w = rgb.shape[:2]
    s = max(1.0, 1400 / max(w, h))
    img = lanczos(rgb, round(w * s), round(h * s)) if s > 1 else rgb
    bgr = np.ascontiguousarray(img[..., ::-1])
    det = cv2.FaceDetectorYN.create(model, '', (bgr.shape[1], bgr.shape[0]), score, 0.3, 5000)
    _, found = det.detect(bgr)
    out = []
    for r in (found if found is not None else []):
        x, y, fw, fh = (float(v) / s for v in r[:4])
        if fh >= min_px and r[14] >= score:
            out.append({'x': round(x, 1), 'y': round(y, 1), 'w': round(fw, 1), 'h': round(fh, 1), 'score': round(float(r[14]), 3)})
    return sorted(out, key=lambda f: -f['h'])


def face_regions(faces, w, h, max_px, pad=0.3):
    """protect regions (fractions) for the faces under max_px: the face box
    grown by `pad` on every side (hair, ears, the edge of a turban)."""
    out = []
    for f in faces:
        if f['h'] >= max_px:
            continue
        x0, y0 = max(0.0, f['x'] - pad * f['w']), max(0.0, f['y'] - pad * f['h'])
        x1, y1 = min(w, f['x'] + f['w'] * (1 + pad)), min(h, f['y'] + f['h'] * (1 + pad))
        if x1 > x0 and y1 > y0:
            out.append([x0 / w, y0 / h, (x1 - x0) / w, (y1 - y0) / h])
    return out


def parse_regions(spec):
    out = []
    for part in (spec or '').split(';'):
        if part.strip():
            v = [float(x) for x in part.split(',')]
            if len(v) != 4 or min(v) < 0 or v[0] + v[2] > 1.0001 or v[1] + v[3] > 1.0001:
                raise SystemExit(f'--protect: bad region {part!r} (x,y,w,h as fractions of the photo)')
            out.append(v)
    return out


def region_windows(regions, w, h, scale):
    """each region with its feather: (x0, y0, x1, y1, feather, window), the
    window being the pixel box the region and its feather cover."""
    out = []
    for x, y, rw, rh in regions:
        x0, y0, x1, y1 = x * w, y * h, (x + rw) * w, (y + rh) * h
        f = max(3 * scale, 0.12 * min(x1 - x0, y1 - y0), 8)
        win = (max(0, int(x0 - f)), max(0, int(y0 - f)), min(w, int(math.ceil(x1 + f)) + 1), min(h, int(math.ceil(y1 + f)) + 1))
        if win[2] > win[0] and win[3] > win[1]:
            out.append((x0, y0, x1, y1, f, win))
    return out


def merge_boxes(boxes):
    """union of overlapping boxes, until none overlap."""
    boxes = [list(b) for b in boxes]
    changed = True
    while changed:
        changed = False
        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                a, b = boxes[i], boxes[j]
                if a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]:
                    boxes[i] = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]
                    del boxes[j]
                    changed = True
                    break
            if changed:
                break
    return boxes


def region_mask(wins, box):
    """mask for one merged box: 1 inside the regions, a raised-cosine ramp to 0
    over each region's feather outside it."""
    bx0, by0, bx1, by1 = box
    m = np.zeros((by1 - by0, bx1 - bx0), np.float32)
    for x0, y0, x1, y1, f, (wx0, wy0, wx1, wy1) in wins:
        if wx1 <= bx0 or wx0 >= bx1 or wy1 <= by0 or wy0 >= by1:
            continue
        xx = np.arange(wx0, wx1, dtype=np.float32)[None, :]
        yy = np.arange(wy0, wy1, dtype=np.float32)[:, None]
        dx = np.maximum(np.maximum(x0 - xx, xx - x1), 0)
        dy = np.maximum(np.maximum(y0 - yy, yy - y1), 0)
        d = np.sqrt(dx * dx + dy * dy)
        r = np.where(d >= f, 0.0, 0.5 * (1 + np.cos(np.pi * np.minimum(d / f, 1)))).astype(np.float32)
        sub = m[wy0 - by0:wy1 - by0, wx0 - bx0:wx1 - bx0]
        np.maximum(sub, r, out=sub)
    return m


def protect(out, rgb, regions, scale, usm):
    """blend the Lanczos + unsharp-mask enlargement into `out` over the regions
    (only the windows they cover are computed)."""
    H, W = out.shape[:2]
    wins = region_windows(regions, W, H, scale)
    up = lanczos(rgb, W, H)
    sigma = usm['sigma'] or max(0.8, min(scale, 8) * 0.45)
    margin = int(math.ceil(3 * sigma)) + 2
    res = out.astype(np.float32) if len(wins) > 50 else out.copy()
    for box in merge_boxes([w[5] for w in wins]):
        bx0, by0, bx1, by1 = box
        # unsharp mask on the window plus a margin, so the blur sees real pixels
        cx0, cy0, cx1, cy1 = max(0, bx0 - margin), max(0, by0 - margin), min(W, bx1 + margin), min(H, by1 + margin)
        crop = up[cy0:cy1, cx0:cx1].astype(np.float32)
        if usm['amount'] > 0:
            d = crop - gauss_blur(crop, sigma)
            t = usm['threshold']
            if t > 0:
                mag = np.abs(d)
                d = np.where(mag > t, d * np.clip((mag - t) / t, 0, 1), 0)
            crop = np.clip(crop + usm['amount'] * d, 0, 255).round()
        soft = crop[by0 - cy0:by1 - cy0, bx0 - cx0:bx1 - cx0]
        m = region_mask(wins, box)[..., None]
        cur = res[by0:by1, bx0:bx1].astype(np.float32)
        res[by0:by1, bx0:bx1] = np.clip(cur * (1 - m) + soft * m, 0, 255).round()
    return res.astype(np.uint8)


# ---------- fidelity ----------
def psnr(a, b, mask=None):
    d = (a.astype(np.float64) - b.astype(np.float64)) ** 2
    if d.ndim == 3:
        d = d.mean(axis=2)
    mse = d[mask].mean() if mask is not None else d.mean()
    return 99.0 if mse == 0 else float(10 * math.log10(255 ** 2 / mse))


def luma(a):
    a = a.astype(np.float64)
    return a if a.ndim == 2 else 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def ssim(a, b, mask=None):
    """Wang et al. SSIM on luma, 11x11 Gaussian (sigma 1.5), K1 .01, K2 .03."""
    g = torch.exp(-((torch.arange(11, dtype=torch.float64) - 5) ** 2) / (2 * 1.5 ** 2))
    g = (g / g.sum())
    k = (g[:, None] * g[None, :])[None, None]
    x = torch.from_numpy(luma(a))[None, None]
    y = torch.from_numpy(luma(b))[None, None]
    f = lambda t: F.conv2d(t, k)
    mx, my = f(x), f(y)
    sxx, syy, sxy = f(x * x) - mx ** 2, f(y * y) - my ** 2, f(x * y) - mx * my
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    m = ((2 * mx * my + c1) * (2 * sxy + c2)) / ((mx ** 2 + my ** 2 + c1) * (sxx + syy + c2))
    m = m[0, 0].numpy()
    if mask is not None:
        mm = mask[5:-5, 5:-5]
        return float(m[mm].mean()) if mm.any() else float(m.mean())
    return float(m.mean())


# ---------- main ----------
def target_size(w, h, long_edge):
    s = long_edge / max(w, h)
    return (long_edge, max(1, round(h * s))) if w >= h else (max(1, round(w * s)), long_edge)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('input')
    p.add_argument('output', help='.jpg master, or .png (forced when the photo has transparency)')
    p.add_argument('--models', default=os.environ.get('REALESRGAN_MODELS', os.path.join(HERE, 'models')))
    p.add_argument('--dni', type=float, default=0.5, help='denoise strength: weight of general-x4v3 vs wdn-x4v3 (0..1, default 0.5)')
    p.add_argument('--route', choices=['auto', 'x4', 'x16', 'pre', 'lanczos'], default='auto')
    p.add_argument('--protect', help='x,y,w,h[;...] regions (fractions of the photo) kept out of the network: Lanczos + unsharp mask there')
    p.add_argument('--usm', default='0.5,2', help='unsharp mask for the lanczos route and protected regions: amount[,threshold[,sigma]] (sigma in master px; default 0.45 x scale)')
    p.add_argument('--faces', help='face guard: YuNet ONNX model (face_detection_yunet_2023mar.onnx); faces under --face-max px are protected')
    p.add_argument('--face-max', type=int, default=130, help='faces at least this tall (source px) are left to the network (default 130)')
    p.add_argument('--passes', type=int, choices=[1, 2], help='shorthand: 1 = x4 route, 2 = x16 route')
    p.add_argument('--small-route', choices=['x4', 'x16', 'pre'], default='x4', help='route for originals whose 4x falls short of the target (auto only)')
    p.add_argument('--small-below', type=int, default=0, help='with auto: use --small-route only when the long edge is below this (0 = whenever 4x < target)')
    p.add_argument('--target-long-edge', type=int, default=3840)
    p.add_argument('--icon', action='store_true', help='app icon: square master of --icon-size px')
    p.add_argument('--icon-size', type=int, default=512)
    p.add_argument('--tile', type=int, default=512, help='tile size in input pixels')
    p.add_argument('--tile-pad', type=int, default=40)
    p.add_argument('--threads', type=int, default=3)
    p.add_argument('--precision', choices=['fp32', 'bf16'], default='fp32')
    p.add_argument('--quality', type=int, default=95, help='JPEG quality of the master')
    p.add_argument('--check-seams', action='store_true', help='also run whole-image inference and report the tiled difference')
    p.add_argument('--save-x4', help='debug: save the raw first-pass x4 output here')
    a = p.parse_args()
    if a.passes:
        a.route = 'x4' if a.passes == 1 else 'x16'
    if a.tile_pad < RECEPTIVE_RADIUS:
        print(f'warning: --tile-pad {a.tile_pad} < receptive radius {RECEPTIVE_RADIUS}: tiles will not match whole-image inference', file=sys.stderr)

    torch.set_num_threads(a.threads)
    try:
        torch.set_num_interop_threads(1)
    except RuntimeError:
        pass
    t0 = time.time()
    rgb, alpha, grey, info = open_image(a.input)
    H, W = rgb.shape[:2]
    target = a.icon_size if a.icon else a.target_long_edge
    tw, th = target_size(W, H, target)
    L = max(W, H)
    if L >= target:
        route = 'resize'
    elif a.route != 'auto':
        route = a.route
    elif L * 4 >= target or (a.small_below and L >= a.small_below):
        route = 'x4'
    else:
        route = a.small_route
    t_load = time.time() - t0

    timings = {'load': round(t_load, 2)}
    seams = None
    passes = 0
    regions = parse_regions(a.protect) if route not in ('resize', 'lanczos') else []
    faces = None
    if a.faces and route not in ('resize', 'lanczos'):
        t1 = time.time()
        found = detect_faces(rgb, a.faces)
        fr = face_regions(found, W, H, a.face_max)
        regions += fr
        faces = {'found': len(found), 'protected': len(fr), 'max_px': a.face_max,
                 'heights': [int(round(f['h'])) for f in found][:40]}
        timings['faces'] = round(time.time() - t1, 2)
    u = [float(x) for x in a.usm.split(',')]
    usm = {'amount': u[0], 'threshold': u[1] if len(u) > 1 else 2.0, 'sigma': u[2] if len(u) > 2 else None}
    if route == 'resize':
        out = lanczos(rgb, tw, th)
        method = 'lanczos-down (original already >= target)'
    elif route == 'lanczos':
        t1 = time.time()
        out = lanczos_usm(rgb, tw, th, tw / W, usm['sigma'], usm['amount'], usm['threshold'])
        timings['resize'] = round(time.time() - t1, 2)
        method = f"lanczos + unsharp mask (amount {usm['amount']:g}, no network)"
    else:
        net = load_net(a.models, a.dni)
        t1 = time.time()
        if route == 'pre':
            pw, ph = target_size(W, H, math.ceil(target / 4))
            src = lanczos(rgb, pw, ph).astype(np.float32) / 255
        else:
            src = rgb.astype(np.float32) / 255
        y = sr_x4(net, src, a.tile, a.tile_pad, a.precision)
        passes = 1
        if a.check_seams:
            whole = sr_x4(net, src, tile=max(src.shape[:2]), pad=0, precision=a.precision)
            d = np.abs(to_u8(y).astype(np.int16) - to_u8(whole).astype(np.int16))
            seams = {'max_abs_diff': int(d.max()), 'mean_abs_diff': float(d.mean()), 'tile': a.tile, 'pad': a.tile_pad}
            del whole
        if a.save_x4:
            Image.fromarray(to_u8(y)).save(a.save_x4)
        if route == 'x16':
            y = sr_x4(net, y, a.tile, a.tile_pad, a.precision)
            passes = 2
        timings['sr'] = round(time.time() - t1, 2)
        t2 = time.time()
        out = lanczos(to_u8(y), tw, th)
        del y
        timings['resize'] = round(time.time() - t2, 2)
        method = {
            'x4': 'realesrgan-x4 + lanczos',
            'x16': 'realesrgan-x4 x2 passes (x16) + lanczos-down',
            'pre': 'lanczos-up to target/4 + realesrgan-x4',
        }[route]
        if regions:
            t2 = time.time()
            out = protect(out, rgb, regions, tw / W, usm)
            timings['protect'] = round(time.time() - t2, 2)
            nf = faces['protected'] if faces else 0
            parts = ([f"{nf} small face{'s' if nf > 1 else ''}"] if nf else []) + ([f"{len(regions) - nf} region{'s' if len(regions) - nf > 1 else ''}"] if len(regions) > nf else [])
            method += f"; {' + '.join(parts)} kept out of the network (lanczos + unsharp mask)"
    if grey:
        out = np.asarray(Image.fromarray(out).convert('L'))

    # fidelity guard: the master scaled back to the original size vs the original
    t3 = time.time()
    back = lanczos(out, W, H)
    ref = np.asarray(Image.fromarray(rgb).convert('L')) if grey else rgb
    mask = alpha > 0 if alpha is not None else None
    fid = {'psnr': round(psnr(back, ref, mask), 2), 'ssim': round(ssim(back, ref, mask), 4)}
    timings['fidelity'] = round(time.time() - t3, 2)

    # write the master
    os.makedirs(os.path.dirname(os.path.abspath(a.output)) or '.', exist_ok=True)
    outpath = a.output
    if alpha is not None:
        al = lanczos(alpha, tw, th)
        base = Image.fromarray(out, 'L' if grey else 'RGB').convert('RGBA')
        base.putalpha(Image.fromarray(al, 'L'))
        if not outpath.lower().endswith('.png'):
            outpath = os.path.splitext(outpath)[0] + '.png'
        base.save(outpath, 'PNG', compress_level=6, icc_profile=SRGB_BYTES)
    else:
        img = Image.fromarray(out, 'L' if grey else 'RGB')
        if outpath.lower().endswith('.png'):
            img.save(outpath, 'PNG', compress_level=6, icc_profile=None if grey else SRGB_BYTES)
        else:
            img.save(outpath, 'JPEG', quality=a.quality, subsampling=0, optimize=True, icc_profile=None if grey else SRGB_BYTES)
    timings['total'] = round(time.time() - t0, 2)

    res = {
        'input': a.input, 'output': outpath,
        'src': {'w': W, 'h': H, **info, 'alpha': alpha is not None, 'grey': grey},
        'master': {'w': tw, 'h': th},
        'method': method, 'route': route, 'passes': passes,
        'scale': round(tw / W, 4),
        'dni': a.dni if passes else None, 'precision': a.precision if passes else None,
        'tile': [a.tile, a.tile_pad] if passes else None,
        'fidelity': fid, 'timings': timings,
    }
    if regions:
        res['protect'] = [[round(v, 4) for v in r] for r in regions]
    if faces is not None:
        res['faces'] = faces
    if route == 'lanczos' or regions:
        res['usm'] = usm
    if seams:
        res['seams'] = seams
    print(json.dumps(res))


if __name__ == '__main__':
    main()
