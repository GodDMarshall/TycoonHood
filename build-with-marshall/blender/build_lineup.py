"""Build With Marshall - line-up of all three characters, loaded from their finished .blend files into the
shared studio, to check scale and style consistency.

  python build_lineup.py [--render]
  blender -b --factory-startup --python build_lineup.py -- --render
"""

import argparse
import math
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import bpy  # noqa: E402

from bwm import scene as sc  # noqa: E402
from bwm import studio  # noqa: E402

CHARS = os.path.normpath(os.path.join(HERE, '..', 'characters'))
CAST = [  # file, collection, rig, (x, y) in the 16:9 line-up, (x, y, turn) in the 9:16 group shot
    ('developer/BWM_Developer_v002.blend', 'DEV_Developer', 'DEV_Rig', (-0.80, 0.0), (-0.42, -0.25, 10)),
    ('claude/BWM_Claude_v001.blend', 'CLD_Claude', 'CLD_Rig', (0.0, 0.0), (0.02, 0.00, 0)),
    ('chatgpt/BWM_ChatGPT_v001.blend', 'GPT_ChatGPT', 'GPT_Rig', (0.82, 0.0), (0.47, 0.32, -14)),
]


def load_cast(scn):
    rigs = []
    for rel, col_name, rig_name, _, _ in CAST:
        path = os.path.join(CHARS, rel)
        with bpy.data.libraries.load(path, link=False) as (src, dst):
            dst.collections = [col_name]
        scn.collection.children.link(bpy.data.collections[col_name])
        rigs.append(bpy.data.objects[rig_name])
    return rigs


def place(rigs, layout):
    for rig, spec in zip(rigs, CAST):
        if layout == 'line':
            x, y = spec[3]
            rig.location, rig.rotation_euler = (x, y, 0.0), (0.0, 0.0, 0.0)
        else:
            x, y, turn = spec[4]
            rig.location, rig.rotation_euler = (x, y, 0.0), (0.0, 0.0, math.radians(turn))
    bpy.context.view_layer.update()


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument('--render', action='store_true')
    ap.add_argument('--samples', type=int, default=80)
    args = ap.parse_args(argv)

    scn = sc.reset()
    rigs = load_cast(scn)
    cams = studio.standard_set(scn, 1.25)
    studio.setup_render(scn, samples=args.samples, res=(1920, 1080))
    col = bpy.data.collections['STUDIO']
    cams['line'] = studio.orbit_camera('CAM_Lineup_16x9', col, (0, 0, 0.74), 0, 6.6, 0.80, 70)
    cams['group'] = studio.orbit_camera('CAM_Group_9x16', col, (0.03, 0.05, 0.80), -6, 4.1, 0.72, 35)
    out = os.path.join(CHARS, 'lineup')
    os.makedirs(os.path.join(out, 'renders'), exist_ok=True)
    place(rigs, 'line')
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, 'BWM_Lineup.blend'), compress=True)
    print('[save] lineup', flush=True)
    if args.render:
        for layout, cam, res, name in (('line', 'line', (1920, 1080), 'lineup_16x9'),
                                       ('group', 'group', (1080, 1920), 'group_9x16')):
            place(rigs, layout)
            t0 = time.time()
            studio.render(scn, cams[cam], os.path.join(out, 'renders', f'{name}.png'), res, args.samples)
            print(f'[render] {name} {time.time() - t0:.1f}s', flush=True)
        place(rigs, 'line')


if __name__ == '__main__':
    main()
