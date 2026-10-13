"""Open a character .blend and prove it is what the build claims: named parts bound to one rig,
separate materials, the logo/emblem as its own object, saved pose/expression actions, and every
face/hand slider really driving its shape. Works for any Build With Marshall character.
Exits non-zero on any failure.

  python verify_blend.py path/to/BWM_<Character>_vNNN.blend
  blender -b --factory-startup --python verify_blend.py -- path/to/file.blend
"""

import os
import re
import sys

import bpy

SLIDER = re.compile(r'pose\.bones\["([^"]+)"\]\["([^"]+)"\]')


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    path = argv[0]
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
    print(f'character mesh objects: {len(meshes)}; base faces (before subdivision): '
          f'{sum(len(o.data.polygons) for o in meshes)}')
    print(f'materials: {len(mats)}: ' + ', '.join(mats))
    check(len(rigs) == 1, f'one armature ({[r.name for r in rigs]})')
    arm = rigs[0]
    print(f'bones: {len(arm.data.bones)}; collections: {[c.name for c in arm.data.collections]}')
    unbound = [o.name for o in meshes if o.parent != arm]
    check(not unbound, f'every character mesh is bound to the rig {unbound or ""}')

    marks = [o for o in meshes if o.name.endswith(('_Logo', '_Emblem'))]
    for o in marks:
        own = {s.material for s in o.material_slots}
        shared = [m.name for m in own if any(m in {s.material for s in x.material_slots} for x in meshes if x != o)]
        check(len(own) == 1 and not shared, f'{o.name} is its own object with its own material')
    check(bool(marks), 'character has a logo/emblem object')

    acts = sorted(a.name for a in bpy.data.actions)
    print(f'actions: {acts}')
    check(any('_Pose_' in a for a in acts) and any('_Expr_' in a for a in acts), 'pose and expression actions saved')
    check(all(a.use_fake_user for a in bpy.data.actions), 'actions protected with fake users')

    # every driver on a shape key reads one rig slider; push all sliders to 1 and check each key follows
    driven = []
    for key in bpy.data.shape_keys:
        if not key.animation_data:
            continue
        for fc in key.animation_data.drivers:
            m = SLIDER.search(fc.driver.variables[0].targets[0].data_path)
            if m:
                driven.append((key, fc.data_path, m.group(1), m.group(2)))
    for _, _, bone, prop in driven:
        arm.pose.bones[bone][prop] = 1.0
    blink = [fc for fc in (arm.animation_data.drivers if arm.animation_data else [])]
    for fc in blink:
        m = SLIDER.search(fc.driver.variables[0].targets[0].data_path)
        arm.pose.bones[m.group(1)][m.group(2)] = 1.0
    arm.update_tag()  # slider edits from Python are not auto-tagged; the UI does this when you drag one
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    bad = []
    for key, data_path, bone, prop in driven:
        value = key.evaluated_get(dg).path_resolve(data_path)
        if abs(value - 1.0) > 1e-4:
            bad.append(f'{key.user.name}.{data_path} <- {prop} ({value:.2f})')
    check(driven and not bad, f'{len(driven)} slider-driven shape keys respond {bad or ""}')
    for fc in blink:
        bone = re.search(r'pose\.bones\["([^"]+)"\]', fc.data_path).group(1)
        rot = arm.evaluated_get(dg).pose.bones[bone].rotation_euler[fc.array_index]
        check(abs(rot) > 0.5, f'{bone} follows its slider ({rot:.2f} rad)')

    print('RESULT: ' + ('PASS' if not fails else f'FAIL ({len(fails)})'))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
