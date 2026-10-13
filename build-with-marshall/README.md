# Build With Marshall: 3D characters

Characters for Episode 01, "Do You Ever Feel Stupid?" (vertical, ≤30 s), built in Blender with
Python build scripts. Everything here is free software. There are no paid tools, APIs or AI model downloads.

| Character | Status | Where |
|---|---|---|
| Developer, "The Creator's Hand" | **v001 proof of concept, waiting for your review** | [`characters/developer/`](characters/developer/) |
| ChatGPT, "The Friend" | Not started (waiting on Developer approval) | — |
| Claude, "The Hard Worker" | Not started (waiting on Developer approval) | — |

## Folder layout

```
build-with-marshall/
  docs/00-audit-and-method.md      audit results, chosen method, phase blueprint
  tools/audit-windows.ps1          read-only PC audit (paste into PowerShell)
  blender/build_developer.py       builds the Developer .blend (+ optional renders)
  blender/verify_blend.py          re-opens a .blend and checks parts, materials, rig, sliders
  blender/bwm/                     shared helpers every character uses (geometry, materials,
                                   rig, studio), so all three follow the same conventions
  characters/developer/            the .blend, review renders and notes
```

## Rebuilding on Windows

You need Blender 4.2 LTS or newer from blender.org (free). Run these from the repository root in PowerShell.
Change `5.2` to match the Blender folder on your PC.

```powershell
# rebuild the .blend only (a few seconds)
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup `
    --python build-with-marshall\blender\build_developer.py -- --render none

# rebuild and render every review image (Cycles; a GPU makes this much faster)
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup `
    --python build-with-marshall\blender\build_developer.py -- --render review

# check a .blend
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup `
    --python build-with-marshall\blender\verify_blend.py -- build-with-marshall\characters\developer\BWM_Developer_v001.blend
```

Rebuilding overwrites `BWM_Developer_v001.blend`. If you've hand-edited that file, copy it first.
