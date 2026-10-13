# ChatGPT, "The Friend, The Heartfelt Heart": v002

A soft, floating companion. The body design comes from the concept board; the role and brand colours come
from your written brief. It has a white helmet and a rounded black visor showing glowing cyan eyes and a
smile, a cyan sprout on top, ear pods with cyan rings, an egg-shaped body with a green badge carrying a white
knot-style emblem, segmented arms, and a cool glow underneath where it hovers.

v002 swaps the roles back. The v001 file used this body as Claude.

## Files

| File | What it is |
|---|---|
| `BWM_ChatGPT_v002.blend` | The editable robot, rig, poses, expressions and the shared studio. Saved in Blender 5.2 LTS |
| `renders/sheet_turnaround.png` | Front, ¾, side and back, using the same camera and scale as the Developer |
| `renders/sheet_expressions.png` | Neutral, Happy, Concerned, Surprised, Thoughtful, Empathetic |
| `renders/sheet_poses.png` | Open hands (happy), Wave (happy), Heart hands (empathetic) |
| `renders/gpt_hero_9x16.png` | 1080×1920 vertical hero frame |

## What's inside the .blend

- **Parts:** each one is a named object in `GPT_Body` or `GPT_Face`. The knot is `GPT_Emblem`, a separate object
  with its own material, sitting on the `GPT_Badge` object.
- **Hard-surface rig (`GPT_Rig`):** every part rides one bone rigidly, so nothing stretches. Move or rotate
  `chest` to hover, bob and lean. `sprout` lets the leaves wiggle, and `look` slides both eyes across the visor.
- **Face sliders** on the `face` bone (Properties → Bone → Custom Properties): `eye_happy`, `eye_wide`, `eye_sad`,
  `eye_blink`, `eye_focus`, `mouth_smile`, `mouth_grin`, `mouth_o`, `mouth_frown`, `mouth_flat` (0–1, mixable).
- **Hand sliders** on `hand.L` and `hand.R`: `fist`, `point`, `open`.
- **Saved actions:** `GPT_Pose_Rest`, `_OpenHands`, `_Wave`, `_HeartHands` and `GPT_Expr_Neutral`, `_Happy`,
  `_Concerned`, `_Surprised`, `_Thoughtful`, `_Empathetic`.

## Honest limitations

- **Glow colour.** The glows render slightly softer and more mint than a pure cyan, because the colour
  pipeline (AgX) desaturates bright emissive colours.
- **Hands.** They're the Developer's hand shape in white, not purpose-built robot hands.
- **The knot** is inspired by the ChatGPT mark, not a copy of OpenAI's official logo.
- **Rendering and compatibility** are the same as the Developer: Cycles on a 4-core CPU, and a Blender 5.2
  file. Re-run the script for older Blender versions.
