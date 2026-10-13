# Claude, "The Hard Worker, The Implementation Engine": v002

A compact industrial humanoid. The body design comes from the concept board; the role and brand colours come
from your written brief. It has warm-white chamfered armour over graphite mechanics, a boxy head with a dark
screen and glowing amber square eyes, ear modules with orange ring lights, a short antenna, big shoulder
pads, orange ring lights at the waist and elbows, orange trim, and a dark chest plate with a glowing
spark-style emblem.

v002 swaps the roles back. The v001 file used this body as ChatGPT.

## Files

| File | What it is |
|---|---|
| `BWM_Claude_v002.blend` | The editable robot, rig, poses, expressions and the shared studio. Saved in Blender 5.2 LTS |
| `renders/sheet_turnaround.png` | Front, ¾, side and back, using the same camera and scale as the Developer |
| `renders/sheet_expressions.png` | Neutral, Focused, Amused, Annoyed, Surprised, Thinking |
| `renders/sheet_poses.png` | Point (focused), Working (neutral), Thinking (thinking) |
| `renders/cld_hero_9x16.png` | 1080×1920 vertical hero frame |

## What's inside the .blend

- **Parts:** each one is a named object in `CLD_Body` or `CLD_Face`. The spark is `CLD_Emblem`, a separate object
  with its own material, sitting on the `CLD_Chest_Plate` object.
- **Hard-surface rig (`CLD_Rig`):** the same skeleton layout as the Developer (hips, spine, chest, neck, head,
  clavicles, arms, hands, legs, feet, toes), with every part riding one bone rigidly. `look` slides both
  eyes across the screen.
- **Face sliders** on the `face` bone: `eye_squint`, `eye_wide`, `eye_happy`, `eye_annoyed`, `eye_blink`,
  `mouth_smile`, `mouth_frown`, `mouth_open` (0–1, mixable).
- **Hand sliders** on `hand.L` and `hand.R`: `fist`, `point`, `open`.
- **Saved actions:** `CLD_Pose_Rest`, `_Point`, `_Working`, `_Thinking` and `CLD_Expr_Neutral`, `_Focused`,
  `_Amused`, `_Annoyed`, `_Surprised`, `_Thinking`.

## Honest limitations

- **Simplified shapes.** The armour plates are clean chamfered blocks, without the panel lines, bolts and
  layered plating in the board's illustration. Those would come in a detailing pass.
- **Glow colour.** The amber renders slightly softer and peachier than a pure amber, for the same AgX reason.
- **Hands.** They're the Developer's hand shape in graphite, not purpose-built mechanical hands.
- **The spark** is inspired by Claude's mark, not a copy of the official logo.
- **Rendering and compatibility** are the same as the Developer.
