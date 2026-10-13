"""Open a character .blend and prove it is what the build claims: named parts,
separate materials, a rig whose sliders really drive the face and hands, and
saved pose/expression actions. Exits non-zero on any failure.

  python verify_blend.py path/to/BWM_Developer_v001.blend [--render-dir DIR]
  blender -b --factory-startup --python verify_blend.py -- path/to/file.blend
"""

import os
import sys

import bpy


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    path = argv[0]
    render_dir = argv[argv.index('--render-dir') + 1] if '--render-dir' in argv else None
    bpy.ops.wm.open_mainfile(filepath=path)
    fails = []

    def check(ok, msg):
        print(('  ok   ' if ok else '  FAIL ') + msg)
        if not ok:
            fails.append(msg)

    meshes = [o for o in bpy.data.objects if o.type == 'MESH' and not o.name.startswith(('WGT_', 'STUDIO_'))]
    mats = sorted({s.material.name for o in meshes for s in o.material_slots if s.material})
    rigs = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    print(f'file: {os.path.basename(path)}  (Blender {bpy.app.version_string})')
    print(f'character mesh objects: {len(meshes)}')
    print(f'materials: {len(mats)}: ' + ', '.join(mats))
    check(len(rigs) == 1, f'one armature ({[r.name for r in rigs]})')
    arm = rigs[0]
    print(f'bones: {len(arm.data.bones)}; collections: {[c.name for c in arm.data.collections]}')
    unbound = [o.name for o in meshes if o.parent != arm]
    check(not unbound, f'every character mesh is bound to the rig {unbound or ""}')
    logo = bpy.data.objects.get('DEV_Logo')
    logo_ok = (logo is not None and len(logo.material_slots) == 1
               and logo.material_slots[0].material.name == 'BWM_Logo_Orange')
    check(logo_ok, 'logo is its own object with its own material')
    tris = sum(len(o.data.polygons) for o in meshes)
    print(f'base faces (before subdivision): {tris}')

    acts = sorted(a.name for a in bpy.data.actions)
    print(f'actions: {acts}')
    check(any(a.startswith('DEV_Pose_') for a in acts) and any(a.startswith('DEV_Expr_') for a in acts),
          'pose and expression actions saved')
    check(all(a.use_fake_user for a in bpy.data.actions), 'actions protected with fake users')

    face = arm.pose.bones['face']
    keys = bpy.data.objects['DEV_Mouth'].data.shape_keys.key_blocks
    face['mouth_grin'] = 1.0
    face['blink_L'] = 1.0
    arm.pose.bones['hand.R']['fist'] = 1.0
    # Slider edits made from Python are not tagged for re-evaluation (dragging the slider in
    # Blender's UI is), so tag the rig the way the UI would, then evaluate.
    arm.update_tag()
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    grin = keys['M_Grin'].id_data.evaluated_get(dg).key_blocks['M_Grin'].value
    check(abs(grin - 1.0) < 1e-4, f'mouth_grin slider drives M_Grin ({grin:.2f})')
    lid = arm.evaluated_get(dg).pose.bones['lid_upper_blink.L'].rotation_euler.x
    check(abs(lid - 1.22) < 1e-3, f'blink_L slider drives the upper lid ({lid:.2f} rad)')
    hk = bpy.data.objects['DEV_Hand.R'].data.shape_keys
    fist = hk.evaluated_get(dg).key_blocks['H_Fist'].value
    check(abs(fist - 1.0) < 1e-4, f'fist slider drives the right hand ({fist:.2f})')

    if render_dir:
        os.makedirs(render_dir, exist_ok=True)
        scn = bpy.context.scene
        scn.camera = bpy.data.objects['CAM_Face']
        scn.render.resolution_x = scn.render.resolution_y = 480
        scn.cycles.samples = 24
        scn.render.filepath = os.path.join(render_dir, 'verify_blink_grin_fist.png')
        bpy.ops.render.render(write_still=True)
        print('  rendered ' + scn.render.filepath)

    print('RESULT: ' + ('PASS' if not fails else f'FAIL ({len(fails)})'))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
