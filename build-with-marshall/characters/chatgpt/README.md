# ChatGPT, "The Implementation Engine": v001

Built to match the approved concept board: an industrial humanoid with white, chamfered armour over
graphite mechanics. It has a boxy head with a dark screen and square teal eyes, ear modules with glowing
rings, a short antenna, big shoulder pads, glowing ring lights at the waist and elbows, green trim, and a
dark chest plate with a glowing knot emblem. Palette from the board: `#E8FFF4`, `#10A37F`, `#2DD4BF`,
`#1A1A1A`.

## Files

| File | What it is |
|---|---|
| `BWM_ChatGPT_v001.blend` | The editable robot, rig, poses, expressions and the shared studio. Saved in Blender 5.2 LTS |
| `renders/sheet_turnaround.png` | Front, ¾, side and back, using the same camera and scale as the Developer |
| `renders/sheet_expressions.png` | Neutral, Focused, Amused, Annoyed, Surprised, Thinking |
| `renders/sheet_poses.png` | Point (focused), Working (neutral), Thinking (thinking) |
| `renders/gpt_hero_9x16.png` | 1080×1920 vertical hero frame |

## What's inside the .blend

- **Parts:** each one is a named object in `GPT_Body` or `GPT_Face`. The knot is `GPT_Emblem`, a separate object
  with its own material, sitting on the `GPT_Chest_Plate` object.
- **Hard-surface rig (`GPT_Rig`):** the same skeleton layout as the Developer (hips, spine, chest, neck, head,
  clavicles, arms, hands, legs, feet, toes), with every part riding one bone rigidly. `look` slides both
  eyes across the screen.
- **Face sliders** on the `face` bone: `eye_squint`, `eye_wide`, `eye_happy`, `eye_annoyed`, `eye_blink`,
  `mouth_smile`, `mouth_frown`, `mouth_open` (0–1, mixable).
- **Hand sliders** on `hand.L` and `hand.R`: `fist`, `point`, `open`.
- **Saved actions:** `GPT_Pose_Rest`, `_Point`, `_Working`, `_Thinking` and `GPT_Expr_Neutral`, `_Focused`,
  `_Amused`, `_Annoyed`, `_Surprised`, `_Thinking`.

## Honest limitations of v001

- **Simplified shapes.** The armour plates are clean chamfered blocks, without the panel lines, bolts and
  layered plating in the board's illustration. Those would come in a detailing pass.
- **Glow colour.** It renders mint-teal rather than the board's deeper green, for the same AgX reason as Claude.
- **Hands.** They're the Developer's hand shape in graphite, not purpose-built mechanical hands.
- **The knot** is inspired by the ChatGPT mark (six interlaced lobes), not a copy of OpenAI's official logo.
- **Rendering and compatibility** are the same as the Developer.
