# Build With Marshall: 3D characters

Characters for Episode 01, "Do You Ever Feel Stupid?" (vertical, ≤30 s), built in Blender with
Python build scripts. Everything here is free software. There are no paid tools, APIs or AI model downloads.

The visual reference is the approved concept board, [`docs/reference/concept_board.png`](docs/reference/concept_board.png).

| Character | Status | Where |
|---|---|---|
| Developer, "The Creator's Hand" | **v002**: hair changed to match the creator reference, rest approved | [`characters/developer/`](characters/developer/) |
| Claude, "The Heartfelt Heart" | **v001, waiting for your review**: floating, soft, orange glow | [`characters/claude/`](characters/claude/) |
| ChatGPT, "The Implementation Engine" | **v001, waiting for your review**: industrial, teal glow | [`characters/chatgpt/`](characters/chatgpt/) |
| Line-up (all three, to scale) | Review renders | [`characters/lineup/`](characters/lineup/) |

The robots follow the concept board, which differs from the original written brief. On the board, Claude is
the floating "Heartfelt Heart" and ChatGPT is the industrial "Implementation Engine". The written brief had
them the other way round.

## Folder layout

```
build-with-marshall/
  docs/00-audit-and-method.md      audit results, chosen method, phase blueprint
  docs/reference/                  the approved concept board
  tools/audit-windows.ps1          read-only PC audit (paste into PowerShell)
  blender/build_developer.py       builds the Developer .blend (+ optional renders)
  blender/build_robots.py          builds the Claude and ChatGPT robots (+ optional renders)
  blender/build_lineup.py          loads all three finished characters into one scene and renders them
  blender/verify_blend.py          re-opens any character .blend and checks parts, materials, rig, sliders
  blender/bwm/                     shared helpers every character uses (geometry, materials, emblems,
                                   rig, studio), so all three follow the same conventions
  characters/<name>/               each character's .blend, review renders and notes
```

## Rebuilding on Windows

You need Blender 4.2 LTS or newer from blender.org (free). Run these from the repository root in PowerShell.
Change `5.2` to match the Blender folder on your PC. Add `-- --render review` to re-render the review images
(Cycles; a GPU makes this much faster).

```powershell
$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"

# the characters (a few seconds each without renders)
& $blender --background --factory-startup --python build-with-marshall\blender\build_developer.py
& $blender --background --factory-startup --python build-with-marshall\blender\build_robots.py -- --character both

# the line-up scene (needs the three character files)
& $blender --background --factory-startup --python build-with-marshall\blender\build_lineup.py -- --render

# check any character file
& $blender --background --factory-startup --python build-with-marshall\blender\verify_blend.py `
    -- build-with-marshall\characters\claude\BWM_Claude_v001.blend
```

Rebuilding overwrites that character's `.blend`. If you've hand-edited one, copy it first.
