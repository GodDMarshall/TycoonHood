# tools/upscale — the photo enhancer

`enhance.py` turns one photo into a high-resolution **master** (3840 px on the
long edge; 512 px for app icons) with Real-ESRGAN. `tools/enhance-photos.mjs`
runs it for every photo on the site and publishes the WebP copies; read
[docs/PHOTOS.md](../../docs/PHOTOS.md) for the whole pipeline. This file covers
setting the enhancer up and running it by hand.

What it is, and what it is not: Real-ESRGAN **realesr-general-x4v3** blended
with **realesr-general-wdn-x4v3** by deep network interpolation (DNI). It
sharpens and cleans what is already in the pixels. It is **not** a
face-restoration model or a diffusion upscaler (no GFPGAN, CodeFormer or
diffusion upscalers): those would redraw the faces of Sri Swamiji, Sri Bala
Swamiji, the Gurus and the deities from what faces usually look like. Do
not add one.

It was trained as a GAN, though, and it is set conservatively to avoid
inventing detail rather than guaranteed not to. It redraws what is too small
to resolve: the photo review
(docs/PHOTOS.md) found it gives small faces doll eyes, drawn brows and plastic
skin, and rewrites small lettering into look-alike glyphs. So it runs with a
**face guard**: OpenCV's YuNet face *detector* (it only finds faces, it draws
nothing) locates every face in the original, and each one under 130 px is
enlarged with Lanczos and a gentle unsharp mask instead of the network.
Lettering, deity faces and crowds the detector cannot find are listed in
`photos/overrides.json` and treated the same way.

## Set-up (once per machine)

Python 3.10 or newer, about 1 GB of disk for PyTorch (CPU build), no GPU needed.

```bash
cd dattapeetham
python3 -m venv .cache/upscale-venv
.cache/upscale-venv/bin/pip install --index-url https://download.pytorch.org/whl/cpu torch
.cache/upscale-venv/bin/pip install numpy pillow opencv-python-headless
```

(`pip install torch numpy pillow opencv-python-headless` also works; the
CPU-only index above avoids downloading 3 GB of CUDA libraries. Tested with
torch 2.5.1, numpy 2.5, Pillow 13, opencv-python-headless 4.14.0.94.
OpenCV is only used for the face guard's detector.)

Download the weights from the official Real-ESRGAN releases into
`.cache/realesrgan/` (git-ignored, like everything under `.cache/`):

```bash
mkdir -p .cache/realesrgan && cd .cache/realesrgan
curl -fLO https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth
curl -fLO https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-wdn-x4v3.pth
# the face guard's detector (OpenCV Zoo, YuNet 2023mar, 228 KB)
curl -fLO https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx
# optional, not used by the pipeline (only for comparisons: ~12x slower, more "painted" look)
curl -fLO https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth
sha256sum *.pth *.onnx
```

The files used for the current images:

| file | SHA-256 |
| --- | --- |
| realesr-general-x4v3.pth | `8dc7edb9ac80ccdc30c3a5dca6616509367f05fbc184ad95b731f05bece96292` |
| realesr-general-wdn-x4v3.pth | `1641f8c4464b9f097c9fdda5589273713f67cf59f3d909e0bd688f0cee269dca` |
| RealESRGAN_x4plus.pth | `4fa0d38905f75ac06eb49a7951b426670021be3018265fd191d2125df9d682f1` |
| face_detection_yunet_2023mar.onnx | `8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4` |

`tools/enhance-photos.mjs` finds the interpreter at `.cache/upscale-venv/bin/python`
and the weights and the face model in `.cache/realesrgan/`; elsewhere, point it at them with
`--python=PATH --models=DIR` (or `PHOTOS_PYTHON` / `REALESRGAN_MODELS`).
Without them it stops before touching anything: it never falls back to
publishing the small web copy.

## Running it by hand

```bash
.cache/upscale-venv/bin/python tools/upscale/enhance.py IN.jpg OUT.jpg --models .cache/realesrgan
```

Prints one line of JSON: source and master size, route, timings, and the
fidelity guard (the master scaled back down to the source size with Lanczos,
compared with the source: PSNR in dB, SSIM on luma).

| option | default | meaning |
| --- | --- | --- |
| `--dni S` | 0.5 | denoise strength: weights = S x general + (1-S) x wdn. 1 cleans the most, 0 keeps the most grain. The pipeline's value is in `tools/enhance-photos.mjs` (see docs/PHOTOS.md) |
| `--target-long-edge N` | 3840 | master long edge; an original already this big is only resized down |
| `--route` | auto | `x4`: one model pass then Lanczos to the target; `x16`: two passes then Lanczos down; `pre`: Lanczos up to target/4 then one pass; `lanczos`: no network at all, Lanczos then a gentle unsharp mask (the review's fallback); `auto`: x4 when 4x the original reaches the target, else `--small-route` |
| `--faces MODEL.onnx` | | the face guard: faces the YuNet detector finds that are under `--face-max` px tall (default 130) get Lanczos + unsharp mask instead of the network. The pipeline always passes it |
| `--protect x,y,w,h[;...]` | | regions (fractions of the photo) kept out of the network the same way, feathered into the enhanced rest (lettering, deity faces, crowds: `photos/overrides.json`) |
| `--usm A[,T[,S]]` | 0.5,2 | the unsharp mask for `lanczos` and protected regions: amount, threshold in levels (smaller differences are left alone, so skin and sky stay smooth), radius in master px (default 0.45 x the enlargement) |
| `--passes 1\|2` | | shorthand for `--route x4` / `--route x16` |
| `--small-route`, `--small-below` | x4, 0 | the rule for originals whose 4x falls short of the target (set by the pipeline from calibration) |
| `--icon`, `--icon-size N` | 512 | app icons: square master of N px |
| `--tile N`, `--tile-pad P` | 512, 40 | tiled inference; P must be at least 34 (the network's receptive field), then the result equals whole-image inference |
| `--threads N` | 3 | PyTorch threads |
| `--precision fp32\|bf16` | fp32 | bf16 uses the CPU's AMX/AVX-512 units (2.4x faster here); the pipeline uses it: its output differs from fp32 by 54 dB PSNR (mean 0.23 of a level), far below the master's own JPEG q95 noise |
| `--check-seams` | | also runs whole-image inference and reports the largest tile difference (0 = seamless) |
| `--save-x4 FILE` | | debug: keep the raw first-pass output |

Input handling: EXIF orientation is applied; embedded ICC profiles other than
sRGB (and CMYK) are converted to sRGB; greyscale stays greyscale; 16-bit and
palette images are converted; transparency is kept (the colour is enhanced, the
alpha channel is resized with Lanczos) and such masters are written as PNG.
Other masters are JPEG q95 with 4:4:4 chroma and an sRGB profile.

Speed on the 4-core build machine: an 800 x 642 photo takes about 15 s (bf16,
3 threads); a 1600 x 1067 photo about 40 s. The face guard adds 0.2 s for the
detector and well under a second for the blend.

The JSON also reports the face guard (`faces`: found, protected, their heights
in source px) and the protected regions (`protect`).
