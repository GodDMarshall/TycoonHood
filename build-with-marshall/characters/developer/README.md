# Developer, "The Creator's Hand": v002

A stylised young developer at about a 1:4 head-to-body ratio: dark charcoal hoodie, big expressive eyes
and the orange Build With Marshall ">" on the chest. v002 changes only the hair, which now follows the creator
reference photo: thick, messy, tousled black hair pushed forward into a heavy fringe, with volume on top,
short sides that show the ears, and flyaway wisps. Everything else is the approved v001 (the v001 file and
renders are in the git history).

## Files

| File | What it is |
|---|---|
| `BWM_Developer_v002.blend` | The editable character, rig, poses, expressions and presentation studio. Saved in Blender 5.2 LTS |
| `renders/sheet_turnaround.png` | Front, ¾, side and back in the rest pose |
| `renders/sheet_expressions.png` | Neutral, Happy, Awkward, Surprised, Determined |
| `renders/sheet_poses.png` | Wave (happy), Head-scratch (awkward), Thinking (determined) |
| `renders/dev_hero_9x16.png` | 1080×1920 vertical hero frame |
| `renders/dev_*.png` | The individual frames behind each sheet |

## What's inside the .blend

- **Collections:** `DEV_Body`, `DEV_Face`, `DEV_Clothing`, `DEV_Rig`, `DEV_Widgets` (hidden control shapes), `STUDIO`.
- **Geometry:** 32 named mesh objects (about 21k base faces). Subdivision is left live as a modifier
  (viewport 1, render 2), so the cage stays light and editable.
- **Materials:** 22 separate materials, one per surface: skin, hair, eye white, two-tone iris, pupil,
  lash line, mouth, teeth, tongue, hoodie, rib knit, drawstring, aglet, pants, shoe parts.
  `BWM_Logo_Orange` and `BWM_Accent_Orange` are the shared brand materials.
- **Logo:** `DEV_Logo` is its own object with its own material, projected onto the chest and bound to
  the rig. To use your real logo, import the SVG, put it in the same place, then delete `DEV_Logo`.
- **Rig (`DEV_Rig`, 34 bones):** forward-kinematics body (hips, spine, chest, neck, head, clavicles, arms,
  hands, legs, feet, toes) plus face controls. Clothing deforms with generated weights. The head, hair,
  eyes, lids, brows, hands and shoes ride their bones rigidly.

## Animating it

Select `DEV_Rig`, switch to **Pose Mode**, then:

| Control | How |
|---|---|
| Mouth shapes | Select the `face` bone (the small square in front of the chin), open Properties → Bone → Custom Properties, and set `mouth_smile`, `mouth_grin`, `mouth_open`, `mouth_o`, `mouth_frown`, `mouth_wobble`, `mouth_smirk_L` or `mouth_smirk_R` (0–1, mixable) |
| Blinks | `blink_L` and `blink_R` on the same `face` bone |
| Eye direction | Move the `eye_target` bone (the cross in front of the face) |
| Eyelid shape | Rotate `lid_upper.L/R` and `lid_lower.L/R` on X. Positive closes |
| Brows | Move `brow.L/R` up and down, rotate on Z to tilt (angry or worried) |
| Hands | Select `hand.L` or `hand.R`, then use custom properties `fist`, `point`, `open` |
| Saved poses | Actions `DEV_Pose_Rest`, `_Wave`, `_HeadScratch`, `_Thinking` (body) and `DEV_Expr_Neutral`, `_Happy`, `_Awkward`, `_Surprised`, `_Determined` (face). They're marked as assets, so they also show in the Asset Browser and Pose Library |

The cameras are `CAM_Turnaround`, `CAM_Face`, `CAM_Pose_34` and `CAM_Hero_9x16`. The render settings
are 1080×1920 Cycles. For the turnaround views, rotate `DEV_Rig` on Z rather than moving the camera.

## Honest limitations of v002

- **It's a scripted base, not a final sculpt.** The forms are clean and readable, but there are no
  sculpted details, wrinkles or fabric folds beyond the rib knit and cuff bunching. The face is simple.
- **The hair** is about 200 scripted locks plus flyaway wisps over a hair mass (`DEV_Hair_Locks`,
  `DEV_Hair_Cap`). It matches the reference's shape and messiness but not the fine, strand-level texture of
  real hair. The forehead locks stop just above the brows so the brows stay readable for expressions.
- **Clothing pieces overlap rather than merge.** The sleeves tuck into the torso and the legs into the
  pelvis. That's hidden in normal poses but can show in extreme ones (arms straight up, deep squats).
- **The rig is FK only:** no IK feet or hands, no hand-painted weights, no corrective shapes. The fingers
  are shape-key presets, not individual bones. The mouth is a 2D-style shape on the face, with no mouth
  interior to show in profile.
- **Colours and details are my choices:** warm medium skin, brown eyes, indigo joggers, white sneakers with
  an orange heel tab. The ">" logo is a placeholder for your real artwork.
- **Rendering:** all renders here are Cycles on a 4-core CPU with no GPU. Eevee hasn't been tested.
- **Compatibility:** the .blend is a Blender 5.2 LTS file. Older Blender versions may not open it, so
  re-run the build script in your version instead. The script is written for 4.2+ but has only been
  tested on 5.2.2.
