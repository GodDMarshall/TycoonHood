# Build With Marshall: Phase 0, audit and production method

Episode 01, "Do You Ever Feel Stupid?". Characters: Developer, ChatGPT, Claude.

**Status:** I've audited the cloud sandbox and built the Developer v001 proof of concept, which is waiting for your
review in [`characters/developer/`](../characters/developer/). The PC audit is still waiting on you. Blender was
installed in the sandbox only, with your approval (bpy 5.2.2 from PyPI).

## 1. Where this work runs

This session runs in a temporary Claude Code **cloud sandbox (Linux)**, not on your Windows PC.
I can't see or change your PC from here, and nothing installed here touches it. Every file
I make reaches you through this repo branch (`ccr-e984b2f6-oteypm`), in the folder `build-with-marshall/`.

## 2. Audit

### 2a. Cloud sandbox (I checked this directly, read-only)

| Item | Result | What it means |
|---|---|---|
| OS | Ubuntu 24.04.5 LTS, x86-64 | — |
| CPU | 4 vCPU Intel Xeon @ 2.1 GHz | Fine for build scripts. Renders take minutes, not seconds |
| RAM | 15 GB | Enough for character scenes |
| GPU | **None** | Renders use Cycles on the CPU. Eevee and Workbench previews aren't possible here |
| Free disk | ~31 GB | Plenty |
| Blender | **Not installed** | Has to be installed before anything can be built |
| Python | 3.13.16 | Matches the official Blender-as-a-Python-module package |
| Other tools | ffmpeg, ImageMagick, git | Enough to make contact sheets and preview clips |
| Network | `download.blender.org` is **blocked** by this environment's network policy (the proxy returns 403). PyPI is allowed | The only way to get Blender here is the official **`bpy` 5.2.2** package from PyPI (~402 MB) |

To use the normal Blender download in future sessions, add `download.blender.org` under
*Allowed domains* in the environment's network settings (the cloud environment menu in the
session title bar, then **Edit**). Steps: https://code.claude.com/docs/en/cloud-environments#network-access

### 2b. Your Windows PC (not checked yet)

Run [`tools/audit-windows.ps1`](../tools/audit-windows.ps1) on the PC and send me the output. The easiest way is to open
**Windows PowerShell** (normal, not admin), paste the file's contents and press Enter. Pasting
avoids having to change PowerShell's script-execution policy.

The script only reads information. It reports the Windows version, CPU, RAM, GPU and VRAM, free disk space,
installed creative tools (Blender, Python, Krita, GIMP, Inkscape, DaVinci Resolve, OBS, FFmpeg, Git)
and Blender's version via `blender --version`, which prints one line and exits. It opens no window and writes no settings.

Its output decides three things:
- **Blender version.** Which version our files have to open in. A file saved in Blender 5.2 may not open in older versions.
- **GPU.** Whether the PC can use Eevee for fast previews and final renders.
- **Scene weight.** How heavy the rigs and scenes can be (RAM and VRAM).

## 3. Recommended production method

**Blender, driven by Python build scripts, refined by hand where scripts can't reach.**

One build script per character, plus a shared module so all three follow the same conventions.
Each script produces a normal, editable `.blend` file containing:

- **Clean geometry.** Named quad meshes built from shaped quad-spheres and lofted cross-sections (not raw
  primitives), smoothed with Subdivision Surface. They can be sculpted, retopologised or reused.
- **Separate materials.** One material per surface (skin, hair, hoodie, logo, eyes and so on), named the same way on every character.
- **Logos as their own objects** with their own material, so your final artwork (an SVG import) can replace
  them without touching the body.
- **A rig.** An armature for the body, plus face controls (eye aim, blinks, brows, mouth shapes) driven
  by a few sliders.
- **Poses and expressions** saved as named, reusable Actions.
- **A presentation scene.** A dark studio that suits your black-backdrop and RGB-light look, rim lights in the
  brand colours, turnaround cameras and a 9:16 hero camera.

The script is the source of truth. Change a parameter, re-run it, and you get a new version. Re-running
it in *your* Blender produces a native file for your version.

### Why this method

| Need | How it's met |
|---|---|
| Three consistent characters | Shared scale, naming, materials, lighting and rig conventions in one module |
| Editable, reusable | Normal `.blend` objects with modifiers left live (not applied) |
| ₹0, no large installs on your PC | Blender only: no AI models, no paid APIs, no credits |
| Animation-ready | Rig, expression sliders and saved poses are in place before any animation |

### Honest limits

- Scripts give clean, readable, stylised forms. They don't give the subtle, hand-sculpted appeal of a
  finished film character. Expect a strong, rigged base, then refinement rounds driven by your feedback
  (or hand-sculpting).
- The face is a **cartoon rig**: shape-key mouth, rotating lids, brow bones. It isn't a full blendshape face.
- Without your concept board I'm working from your written descriptions.

### Alternatives considered

| Option | Verdict |
|---|---|
| AI image-to-3D (TRELLIS, Hunyuan3D, Meshy or Tripo free tiers) | Messy triangle meshes with baked textures, no separate materials or logos, not ready to rig. Local models need big downloads and a strong GPU. Free web tiers limit credits and licences. At most a sculpting reference |
| VRoid Studio (free) | Fast rigged humans, but anime-only and can't make the robots, so the three wouldn't match |
| Rigify (built into Blender) | A good upgrade later for the Developer's body rig, but too much for a proof of concept |
| Mixamo (free with an Adobe account) | Optional later for Developer motion, but humanoids only and it means uploading the model to Adobe |

## 4. Blueprint

| Phase | Produces | Gate |
|---|---|---|
| 0. Audit and method | This report and the PC audit script | Done (PC audit pending) |
| 1. Developer proof of concept | Build script, `.blend` (model, materials, logo, rig, expressions, poses), presentation renders | **Done, waiting for your review** |
| 2. Developer review | v003: straight, messy hair matched to the creator reference | **Done** |
| 3. ChatGPT robot | Floating "Heartfelt Heart", cyan (board design, brief's role) | **Done, waiting for your review** |
| 4. Claude robot | Industrial "Implementation Engine", amber (board design, brief's role) | **Done, waiting for your review** |
| 5. Line-up | All three to scale, shared lighting, 16:9 line-up and 9:16 group shot | **Done, waiting for your review** |
| 6. Episode 01 animation | ≤30 s vertical, 1080×1920 | Separate go-ahead |

For phases 3–4: the emblems are clearly *inspired by* the ChatGPT and Claude marks, as you specified, not
copies of the official logos (those are OpenAI's and Anthropic's trademarks).
