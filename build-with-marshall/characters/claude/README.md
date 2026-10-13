# Claude, "The Heartfelt Heart": v001

Built to match the approved concept board: a soft, floating companion with a warm-white helmet, a black
visor showing glowing orange eyes and mouth, an orange sprout on top, orange-ringed ear pods, an egg-shaped
body with an orange badge carrying a white asterisk-style spark, segmented arms, and a cool glow underneath
where it hovers. Palette from the board: `#FFF7ED`, `#FF8A3D`, `#FFE0B2`, `#2A2A2A`.

## Files

| File | What it is |
|---|---|
| `BWM_Claude_v001.blend` | The editable robot, rig, poses, expressions and the shared studio. Saved in Blender 5.2 LTS |
| `renders/sheet_turnaround.png` | Front, ¾, side and back, using the same camera and scale as the Developer |
| `renders/sheet_expressions.png` | Neutral, Happy, Concerned, Surprised, Thoughtful, Empathetic |
| `renders/sheet_poses.png` | Open hands (happy), Wave (happy), Heart hands (empathetic) |
| `renders/cld_hero_9x16.png` | 1080×1920 vertical hero frame |

## What's inside the .blend

- **Parts:** each one is a named object in `CLD_Body` or `CLD_Face`. The asterisk is `CLD_Emblem`, a separate
  object with its own material, sitting on the `CLD_Badge` object.
- **Hard-surface rig (`CLD_Rig`):** every part rides one bone rigidly, so nothing stretches. Move or rotate
  `chest` to hover, bob and lean. `sprout` lets the leaves wiggle, and `look` slides both eyes across the visor.
- **Face sliders** on the `face` bone (Properties → Bone → Custom Properties): `eye_happy`, `eye_wide`, `eye_sad`,
  `eye_blink`, `eye_focus`, `mouth_smile`, `mouth_grin`, `mouth_o`, `mouth_frown`, `mouth_flat` (0–1, mixable).
  The eyes and mouth are glowing shapes drawn on the visor, as on the board.
- **Hand sliders** on `hand.L` and `hand.R`: `fist`, `point`, `open`.
- **Saved actions:** `CLD_Pose_Rest`, `_OpenHands`, `_Wave`, `_HeartHands` and `CLD_Expr_Neutral`, `_Happy`,
  `_Concerned`, `_Surprised`, `_Thoughtful`, `_Empathetic`.

## Honest limitations of v001

- **Glow colour.** The glows render a little softer and pinker than the board's punchy orange, because the
  colour pipeline (AgX) desaturates bright emissive colours. Pushing them brighter turns them white.
- **Hands.** They're the Developer's hand shape in white, not purpose-built robot hands.
- **The asterisk** is inspired by Claude's mark, not a copy of the official logo. Using the official logo is
  your call.
- **Rendering and compatibility** are the same as the Developer: Cycles on a 4-core CPU, and a Blender 5.2
  file. Re-run the script for older Blender versions.
