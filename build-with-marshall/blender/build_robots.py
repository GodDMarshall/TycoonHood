"""Build With Marshall - the two robots, v001, following the approved concept board
(docs/reference/concept_board.png):

  Claude   "The Heartfelt Heart"        floating and soft: warm-white shell, black visor, glowing orange
                                        eyes, orange sprout, orange badge with a white asterisk
  ChatGPT  "The Implementation Engine"  industrial humanoid: white armour over graphite mechanics,
                                        teal square eyes, ear rings and a glowing knot on the chest

Same conventions as build_developer.py (one material per surface, emblem as its own object, rig with
face sliders, saved poses/expressions, shared studio). Robots are hard-surface, so every part rides a
bone rigidly - no skin weights.

  python build_robots.py --character claude|chatgpt|both --render none|preview|check|review
  blender -b --factory-startup --python build_robots.py -- --character both --render review
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
from mathutils import Matrix, Vector  # noqa: E402

import build_developer as dev  # noqa: E402
from bwm import emblems, geo, rig, studio  # noqa: E402
from bwm import materials as mt  # noqa: E402
from bwm import scene as sc  # noqa: E402
from bwm.geo import lerp, smoothstep  # noqa: E402

VERSION = 'v001'
HAND_SLIDERS = ('fist', 'point', 'open')


def rad(d):
    return math.radians(d)


# ---------------------------------------------------------------- shared robot parts

def put(md, name, col, mats, subsurf=(1, 2), smooth=True):
    mats = list(mats) if isinstance(mats, (list, tuple)) else [mats]
    return sc.to_object(md, name, col, mats, smooth=smooth, subsurf=subsurf)


def _perp(v):
    v = Vector(v).normalized()
    a = Vector((0, 0, 1)) if abs(v.z) < 0.9 else Vector((0, 1, 0))
    return (a - v * a.dot(v)).normalized()


def capsule(a, b, r, count=16, cap='round'):
    a, b = Vector(a), Vector(b)
    pts = [a.lerp(b, k / 6) for k in range(7)]
    return geo.tube(pts, r, count=count, up_hint=_perp(b - a), cap_start=cap, cap_end=cap)


def ball(center, r, res=8):
    return geo.shaped_sphere(res, lambda u: Vector(center) + u * r)


def box(center, half, roundness=0.45, rot=None, res=6):
    md = geo.rounded_box(half, res, roundness).orient_outward()
    return md.transform(Matrix.Translation(Vector(center)) @ (rot or Matrix()))


def box_along(a, b, half_w, half_d, roundness=0.45, z_hint=(0, -1, 0)):
    """Rounded box whose length runs from a to b (armour plates on limbs)."""
    a, b = Vector(a), Vector(b)
    md = geo.rounded_box((half_w, (b - a).length / 2, half_d), 6, roundness).orient_outward()
    zh = Vector(z_hint)
    if abs(zh.normalized().dot((b - a).normalized())) > 0.95:
        zh = _perp(b - a)
    return md.transform(geo.frame_matrix((a + b) / 2, b - a, zh))


def puck(center, axis, r, h, rings=(), bevel=0.25, count=32):
    """Closed disc around `axis`; rings: (r0, r1) bands on the outer face that use material slot 1."""
    stops = sorted({0.0, *[x for band in rings for x in band], 1.0 - bevel})
    prof = [(0.0, h / 2)]
    mats = []
    for x0, x1 in zip(stops, stops[1:]):
        prof.append((r * x1, h / 2))
        mats.append(1 if any(abs(x0 - a) < 1e-9 and abs(x1 - b) < 1e-9 for a, b in rings) else 0)
    prof += [(r, h / 2 - h * bevel), (r, -h / 2 + h * bevel), (r * (1.0 - bevel), -h / 2), (0.0, -h / 2)]
    mats += [0, 0, 0, 0]
    md = geo.lathe(prof, count, band_mats=mats).orient_outward()
    return md.transform(geo.frame_matrix(Vector(center), _perp(axis), Vector(axis)))


def rounded_rect_fn(cx, cz, a, b, n=4.0):
    """Outline function for dev.slab: maps the unit grid onto a superellipse (rounded rectangle)."""
    def fn(u, v):
        s, t = 2.0 * u - 1.0, 2.0 * v - 1.0
        if abs(s) < 1e-9 and abs(t) < 1e-9:
            return cx, cz
        ang = math.atan2(t, s)
        c, sn = abs(math.cos(ang)), abs(math.sin(ang))
        k = (c ** n + sn ** n) ** (-1.0 / n) * max(c, sn)
        return cx + a * s * k, cz + b * t * k
    return fn


def rim_faces(a, b, n, width, steps=72):
    pts = []
    for k in range(steps):
        th = math.tau * k / steps
        c, s = math.cos(th), math.sin(th)
        pts.append((a * math.copysign(abs(c) ** (2.0 / n), c), b * math.copysign(abs(s) ** (2.0 / n), s)))
    return emblems._loop_stroke(pts, width)


def decal(name, col, mat, target, cx, cz, faces2d, size, thickness=0.002, offset=0.001):
    """Flat 2D design projected onto target around (cx, cz), then given a little thickness."""
    origin, n, tx, tz = dev.face_frame(target, cx, cz)
    md = geo.MeshData()
    for f in faces2d:
        start = md.add_verts([origin + tx * (x * size) + tz * (y * size) + n * 0.003 for x, y in f])
        md.add_face(range(start, start + len(f)))
    obj = sc.to_object(md, name, col, [mat], smooth=False)
    sc.add_shrinkwrap(obj, target, offset=offset)
    sc.add_solidify(obj, thickness, offset=1.0)
    return obj


def eye_shape(W, upper, lower):
    def f(s):
        e = math.sqrt(max(0.0, 1.0 - s * s))
        u, low = upper(s, e), lower(s, e)
        return W * s, u, u, low, low
    return f


def arc_shape(W, rise, base, th):
    """Closed-eye arc: rises to the middle (happy) or dips (sad, with negative rise)."""
    return eye_shape(W, lambda s, e: base + rise * e + th * (0.3 + 0.7 * e) / 2,
                     lambda s, e: base + rise * e - th * (0.3 + 0.7 * e) / 2)


def shape_decal(name, col, mat, target, cx, cz, shapes, offset=0.0012):
    """Glowing face shape (eye or mouth) drawn on a screen, with one shape key per expression shape."""
    frame = dev.face_frame(target, cx, cz)

    def mesh(fn):
        md = dev.mouth_mesh(fn, frame)
        md.mats = [0] * len(md.faces)
        return md
    obj = sc.to_object(mesh(shapes['Basis']), name, col, [mat], smooth=False)
    obj.shape_key_add(name='Basis', from_mix=False)
    for key, fn in shapes.items():
        if key != 'Basis':
            kb = obj.shape_key_add(name=key, from_mix=False)
            kb.data.foreach_set('co', [c for v in mesh(fn).verts for c in v])
    sc.add_shrinkwrap(obj, target, offset=offset)
    return obj


def arm_chain(S, down_deg, l1, l2, lh, side):
    d = Vector((math.cos(rad(down_deg)) * side, 0.03, -math.sin(rad(down_deg)))).normalized()
    E = S + d * l1
    axis = d.cross(Vector((0, -1, 0))).normalized()
    d2 = (Matrix.Rotation(rad(12), 3, axis) @ d).normalized()
    W = E + d2 * l2
    return E, W, W + d2 * lh, d, d2


def robot_hands(prefix, col, chains, mat, scale):
    for s, side in ((1, 'L'), (-1, 'R')):
        W, d2 = chains[s]['W'], chains[s]['d2']
        frame = geo.frame_matrix(W, d2, dev.dorsal(d2, s)) @ Matrix.Scale(scale, 4)
        meshes = {k: dev.hand_mesh(k) for k in dev.HAND_POSES}
        if s < 0:
            meshes = {k: geo.mirrored_x(v) for k, v in meshes.items()}
        obj = sc.to_object(meshes['relaxed'], f'{prefix}_Hand.{side}', col, [mat], subsurf=(1, 2), matrix=frame)
        obj.shape_key_add(name='Basis', from_mix=False)
        for key, src in (('H_Fist', 'fist'), ('H_Point', 'point'), ('H_Open', 'open')):
            kb = obj.shape_key_add(name=key, from_mix=False)
            kb.data.foreach_set('co', [c for v in meshes[src].verts for c in v])


def arm_specs(B, chains, clavicle_z):
    specs = []
    for s, side in ((1, 'L'), (-1, 'R')):
        c = chains[s]
        specs += [
            B(f'shoulder.{side}', (0.04 * s, 0.004, clavicle_z), c['S'], parent='chest', z_axis=(0, 0, 1)),
            B(f'upper_arm.{side}', c['S'], c['E'], parent=f'shoulder.{side}', connect=True,
              z_axis=dev.dorsal(c['d'], s)),
            B(f'forearm.{side}', c['E'], c['W'], parent=f'upper_arm.{side}', connect=True,
              z_axis=dev.dorsal(c['d2'], s)),
            B(f'hand.{side}', c['W'], c['Ht'], parent=f'forearm.{side}', connect=True,
              z_axis=dev.dorsal(c['d2'], s)),
        ]
    return specs


def finish_rig(arm, face_sliders, eye_keys, mouth_keys, prefix):
    for name in face_sliders:
        rig.add_slider(arm, 'face', name, desc='Face shape (0-1)')
    for side in ('L', 'R'):
        for name in HAND_SLIDERS:
            rig.add_slider(arm, f'hand.{side}', name, desc='Hand shape (0-1)')
        hk = bpy.data.objects[f'{prefix}_Hand.{side}'].data.shape_keys.key_blocks
        for slider, key in (('fist', 'H_Fist'), ('point', 'H_Point'), ('open', 'H_Open')):
            rig.drive(hk[key], 'value', None, arm, f'hand.{side}', slider)
        keys = bpy.data.objects[f'{prefix}_Eye.{side}'].data.shape_keys.key_blocks
        for slider, key in eye_keys:
            rig.drive(keys[key], 'value', None, arm, 'face', slider)
    keys = bpy.data.objects[f'{prefix}_Mouth'].data.shape_keys.key_blocks
    for slider, key in mouth_keys:
        rig.drive(keys[key], 'value', None, arm, 'face', slider)


def bind_rigid(arm, mapping):
    for name, bone in mapping.items():
        rig.parent_to_bone(bpy.data.objects[name], arm, bone)


# ---------------------------------------------------------------- Claude (floating, "The Heartfelt Heart")

CLD_PAL = {'shell': '#FFF7ED', 'orange': '#FF8A3D', 'peach': '#FFE0B2', 'charcoal': '#2A2A2A'}
CLD_HEAD_C = Vector((0.0, 0.0, 1.18))
CLD_HEAD_R = (0.215, 0.190, 0.175)
CLD_BODY_C = Vector((0.0, 0.0, 0.79))
CLD_SLIDERS = ['eye_happy', 'eye_wide', 'eye_sad', 'eye_blink', 'eye_focus',
               'mouth_smile', 'mouth_grin', 'mouth_o', 'mouth_frown', 'mouth_flat']


def claude_materials():
    p = CLD_PAL
    return {
        'shell': mt.principled('CLD_Shell', p['shell'], rough=0.28, spec=0.5, coat=0.5, coat_rough=0.1, sss=0.04),
        'joint': mt.principled('CLD_Joint_Charcoal', p['charcoal'], rough=0.45, metal=0.3),
        'visor': mt.principled('CLD_Visor', '#060709', rough=0.30, spec=0.45, coat=0.35, coat_rough=0.2),
        'rim': mt.principled('CLD_Visor_Rim', p['peach'], rough=0.3, emit=p['peach'], emit_strength=2.5),
        'glow': mt.principled('CLD_Face_Glow', '#FF6A10', rough=0.4, emit='#FF6A10', emit_strength=1.6),
        'orange': mt.principled('CLD_Orange', '#FF5E14', rough=0.3, emit='#FF5E14', emit_strength=0.2),
        'sprout': mt.principled('CLD_Sprout', '#FF6A10', rough=0.35, emit='#FF6A10', emit_strength=0.35),
        'emblem': mt.principled('CLD_Emblem_White', '#FFFFFF', rough=0.3, emit='#FFFFFF', emit_strength=0.5),
        'thruster': mt.principled('CLD_Thruster_Glow', '#DDEEFF', rough=0.5, emit='#CFE6FF', emit_strength=8.0),
    }


def claude_eye_shapes(side):
    return {
        'Basis': eye_shape(0.030, lambda s, e: 0.040 * e ** 0.8, lambda s, e: -0.036 * e ** 0.8),
        'E_Happy': arc_shape(0.042, 0.026, -0.006, 0.016),
        'E_Wide': eye_shape(0.036, lambda s, e: 0.050 * e ** 0.75, lambda s, e: -0.046 * e ** 0.75),
        'E_Sad': eye_shape(0.032, lambda s, e: e * (0.034 - 0.018 * (s * side + 1) / 2),
                           lambda s, e: -0.030 * e ** 0.8),
        'E_Blink': arc_shape(0.038, 0.0, -0.008, 0.009),
        'E_Focus': eye_shape(0.032, lambda s, e: 0.013 * e, lambda s, e: -0.028 * e ** 0.8),
    }


CLD_MOUTH = {
    'Basis': dev._closed(0.022, 0.005, th=0.0075),
    'M_Smile': dev._closed(0.033, 0.013, th=0.0090, dz=-0.002),
    'M_Grin': dev._opened(0.036, 0.0, 0.028, 0.0, 0.0, top_curve=0.008),
    'M_O': dev._opened(0.013, 0.010, 0.024, 0.0, 0.0, top_pow=0.6, dz=-0.002),
    'M_Frown': dev._closed(0.026, -0.009, th=0.008, dz=0.002),
    'M_Flat': dev._closed(0.021, 0.0, th=0.007),
}
CLD_EYE_KEYS = [('eye_happy', 'E_Happy'), ('eye_wide', 'E_Wide'), ('eye_sad', 'E_Sad'),
                ('eye_blink', 'E_Blink'), ('eye_focus', 'E_Focus')]
CLD_MOUTH_KEYS = [('mouth_smile', 'M_Smile'), ('mouth_grin', 'M_Grin'), ('mouth_o', 'M_O'),
                  ('mouth_frown', 'M_Frown'), ('mouth_flat', 'M_Flat')]


def claude_body_shape(u):
    k = lerp(0.50, 1.0, smoothstep(-1.0, 0.05, u.z))
    z = u.z * (0.170 if u.z < 0 else 0.165)
    return CLD_BODY_C + Vector((0.152 * k * u.x, 0.138 * k * u.y, z))


def leaf(base, direction, length, width, bend=0.25):
    d = Vector(direction).normalized()
    side = Vector((0, -1, 0)).cross(d).normalized()
    tip = base + d * length + Vector((0, 0, 1)) * (length * bend * 0.2)
    mid = base + d * (length * 0.5) + side * (length * bend * 0.12)
    pts = geo.bezier(base, mid, tip, samples=9)
    return geo.tube(pts, lambda t: width * 0.5 * math.sin(math.pi * min(0.97, 0.06 + t)) ** 0.75 + 0.0008,
                    count=10, up_hint=(0, -1, 0), ratio=0.22, cap_start='flat', cap_end='flat')


def build_claude():
    scn = sc.reset()
    M = claude_materials()
    root = sc.collection('CLD_Claude')
    c_body = sc.collection('CLD_Body', root)
    c_face = sc.collection('CLD_Face', root)
    c_rig = sc.collection('CLD_Rig', root)
    c_wgt = sc.collection('CLD_Widgets', root)

    HC = CLD_HEAD_C
    head = put(geo.rounded_box(CLD_HEAD_R, 8, 0.86).orient_outward().transform(Matrix.Translation(HC)),
               'CLD_Head', c_body, M['shell'])
    visor = put(dev.slab(head, rounded_rect_fn(0.0, HC.z - 0.008, 0.160, 0.112, n=3.2), 16, 12,
                         lift=0.006, depth=0.012), 'CLD_Visor', c_face, M['visor'], subsurf=None)
    sc.add_bevel(visor, 0.003, 3)
    for p in visor.data.polygons:
        p.use_smooth = True
    decal('CLD_Visor_Rim', c_face, M['rim'], head, 0.0, HC.z - 0.008, rim_faces(0.167, 0.119, 3.2, 0.009), 1.0,
          thickness=0.002, offset=0.0015)
    for s, side in ((1, 'L'), (-1, 'R')):
        put(puck((0.207 * s, 0.004, HC.z - 0.004), (s, -0.12, 0.0), 0.060, 0.046, rings=((0.52, 0.70),)),
            f'CLD_Ear.{side}', c_body, [M['shell'], M['orange']])
        shape_decal(f'CLD_Eye.{side}', c_face, M['glow'], visor, 0.074 * s, HC.z + 0.016, claude_eye_shapes(s))
    shape_decal('CLD_Mouth', c_face, M['glow'], visor, 0.0, HC.z - 0.056, CLD_MOUTH)

    top = HC.z + CLD_HEAD_R[2]
    sprout = capsule((0, 0, top - 0.012), (0, 0, top + 0.026), 0.008)
    stem_top = Vector((0, 0, top + 0.024))
    sprout.extend(leaf(stem_top, (0, 0, 1), 0.066, 0.040, bend=0.0))
    for s in (1, -1):
        sprout.extend(leaf(stem_top, (0.85 * s, 0, 0.55), 0.056, 0.034, bend=0.4 * s))
    put(sprout, 'CLD_Sprout', c_body, M['sprout'])

    put(capsule((0, 0, 0.925), (0, 0, 1.045), 0.042), 'CLD_Neck', c_body, M['joint'])
    body = put(geo.shaped_sphere(18, claude_body_shape), 'CLD_Body_Shell', c_body, M['shell'])
    thr = geo.lathe([(0.0, 0.615), (0.028, 0.602), (0.034, 0.575), (0.026, 0.535), (0.0, 0.495)], 24)
    put(thr.orient_outward(), 'CLD_Thruster', c_body, M['thruster'])
    light = bpy.data.lights.new('CLD_Thruster_Light', 'POINT')
    light.energy, light.color, light.shadow_soft_size = 14.0, mt.srgb('#CFE6FF'), 0.05
    lamp = bpy.data.objects.new('CLD_Thruster_Light', light)
    c_body.objects.link(lamp)
    lamp.location = (0.0, 0.0, 0.47)

    badge = put(dev.slab(body, rounded_rect_fn(0.0, 0.805, 0.057, 0.057, n=3.0), 10, 10, lift=0.004, depth=0.009),
                'CLD_Badge', c_body, M['orange'], subsurf=None)
    sc.add_bevel(badge, 0.003, 3)
    decal('CLD_Emblem', c_body, M['emblem'], badge, 0.0, 0.805, emblems.spark(base_w=0.21, tip_w=0.11), 0.098,
          thickness=0.0015, offset=0.0008)

    chains = {}
    for s in (1, -1):
        S = Vector((0.150 * s, 0.0, 0.875))
        E, W, Ht, d, d2 = arm_chain(S, 55, 0.120, 0.110, 0.075, s)
        chains[s] = {'S': S, 'E': E, 'W': W, 'Ht': Ht, 'd': d, 'd2': d2}
        side = 'L' if s > 0 else 'R'
        put(ball(S, 0.036), f'CLD_Shoulder.{side}', c_body, M['joint'])
        put(capsule(S + d * 0.020, E - d * 0.018, 0.036), f'CLD_UpperArm.{side}', c_body, M['shell'])
        put(ball(E, 0.029), f'CLD_Elbow.{side}', c_body, M['joint'])
        put(capsule(E + d2 * 0.018, W - d2 * 0.006, 0.034), f'CLD_Forearm.{side}', c_body, M['shell'])
    robot_hands('CLD', c_body, chains, M['shell'], 0.95)

    B = rig.BoneSpec
    specs = [
        B('root', (0, 0, 0), (0, 0.25, 0), deform=False, z_axis=(0, 0, 1)),
        B('chest', (0, 0, 0.62), (0, 0, 0.94), parent='root', deform=False),
        B('neck', (0, 0, 0.94), (0, 0, 1.03), parent='chest', connect=True, deform=False),
        B('head', (0, 0, 1.03), (0, 0, top), parent='neck', connect=True, deform=False),
        B('sprout', (0, 0, top - 0.01), (0, 0, top + 0.07), parent='head', deform=False, coll='Face'),
        B('look', (0, -0.25, HC.z + 0.02), (0, -0.25, HC.z + 0.06), parent='head', deform=False, coll='Face'),
        B('face', (0, -0.32, HC.z - 0.12), (0, -0.32, HC.z - 0.08), parent='head', deform=False, coll='Face'),
    ] + arm_specs(B, chains, 0.90)
    for spec in specs:
        spec.deform = False
    arm = rig.build_armature('CLD_Rig', c_rig, specs)
    mapping = {'CLD_Head': 'head', 'CLD_Visor': 'head', 'CLD_Visor_Rim': 'head', 'CLD_Ear.L': 'head',
               'CLD_Ear.R': 'head', 'CLD_Mouth': 'head', 'CLD_Eye.L': 'look', 'CLD_Eye.R': 'look',
               'CLD_Sprout': 'sprout', 'CLD_Neck': 'neck', 'CLD_Body_Shell': 'chest', 'CLD_Thruster': 'chest',
               'CLD_Thruster_Light': 'chest', 'CLD_Badge': 'chest', 'CLD_Emblem': 'chest'}
    for side in ('L', 'R'):
        mapping.update({f'CLD_Shoulder.{side}': f'upper_arm.{side}', f'CLD_UpperArm.{side}': f'upper_arm.{side}',
                        f'CLD_Elbow.{side}': f'forearm.{side}', f'CLD_Forearm.{side}': f'forearm.{side}',
                        f'CLD_Hand.{side}': f'hand.{side}'})
    bind_rigid(arm, mapping)
    finish_rig(arm, CLD_SLIDERS, CLD_EYE_KEYS, CLD_MOUTH_KEYS, 'CLD')
    widgets(arm, c_wgt, extra={'sprout': ('circle', 0.5), 'look': ('cross', 0.6)})
    return scn, arm, HC.z


# ---------------------------------------------------------------- ChatGPT (industrial, "The Implementation Engine")

GPT_PAL = {'armor': '#EEF4F0', 'green': '#10A37F', 'teal': '#2DD4BF', 'black': '#1A1A1A'}
GPT_HEAD_C = Vector((0.0, 0.0, 1.305))
GPT_HEAD_R = (0.185, 0.150, 0.130)
GPT_SLIDERS = ['eye_squint', 'eye_wide', 'eye_happy', 'eye_annoyed', 'eye_blink',
               'mouth_smile', 'mouth_frown', 'mouth_open']


def gpt_materials():
    p = GPT_PAL
    return {
        'armor': mt.principled('GPT_Armor', p['armor'], rough=0.32, spec=0.5, coat=0.3, coat_rough=0.15),
        'mech': mt.principled('GPT_Mechanics', p['black'], rough=0.4, metal=0.5),
        'joint': mt.principled('GPT_Joint', '#2B2F33', rough=0.32, metal=0.75),
        'screen': mt.principled('GPT_Screen', '#05070A', rough=0.08, spec=0.7, coat=1.0, coat_rough=0.02),
        'glow': mt.principled('GPT_Face_Glow', '#0FCFA8', rough=0.4, emit='#0FCFA8', emit_strength=1.3),
        'ring': mt.principled('GPT_Ring_Glow', '#14D9B4', rough=0.4, emit='#14D9B4', emit_strength=1.4),
        'green': mt.principled('GPT_Green_Trim', p['green'], rough=0.4, spec=0.4),
        'plate': mt.principled('GPT_Chest_Plate', '#0E1113', rough=0.2, spec=0.6, coat=0.6),
        'emblem': mt.principled('GPT_Emblem_Glow', '#0FCFA8', rough=0.4, emit='#0FCFA8', emit_strength=1.3),
    }


def gpt_eye_shapes(side):
    def sq(e):
        return e ** 0.12
    return {
        'Basis': eye_shape(0.034, lambda s, e: 0.029 * sq(e), lambda s, e: -0.029 * sq(e)),
        'E_Squint': eye_shape(0.037, lambda s, e: 0.008 * sq(e), lambda s, e: -0.012 * sq(e)),
        'E_Wide': eye_shape(0.038, lambda s, e: 0.037 * sq(e), lambda s, e: -0.037 * sq(e)),
        'E_Happy': arc_shape(0.036, 0.022, -0.007, 0.012),
        'E_Annoyed': eye_shape(0.034, lambda s, e: sq(e) * (0.024 - 0.020 * max(0.0, -s * side)),
                               lambda s, e: -0.026 * sq(e)),
        'E_Blink': eye_shape(0.036, lambda s, e: 0.0035 * sq(e), lambda s, e: -0.0035 * sq(e)),
    }


GPT_MOUTH = {
    'Basis': dev._closed(0.016, 0.0, th=0.0045),
    'M_Smile': dev._closed(0.022, 0.008, th=0.006, dz=-0.001),
    'M_Frown': dev._closed(0.018, -0.006, th=0.005, dz=0.002),
    'M_Open': dev._opened(0.014, 0.006, 0.016, 0.0, 0.0, top_pow=0.6),
}
GPT_EYE_KEYS = [('eye_squint', 'E_Squint'), ('eye_wide', 'E_Wide'), ('eye_happy', 'E_Happy'),
                ('eye_annoyed', 'E_Annoyed'), ('eye_blink', 'E_Blink')]
GPT_MOUTH_KEYS = [('mouth_smile', 'M_Smile'), ('mouth_frown', 'M_Frown'), ('mouth_open', 'M_Open')]


def gpt_legs(side):
    H = Vector((0.100 * side, 0.000, 0.640))
    K = Vector((0.105 * side, -0.012, 0.360))
    A = Vector((0.105 * side, 0.005, 0.095))
    T = Vector((0.107 * side, -0.100, 0.030))
    return H, K, A, T


def build_chatgpt():
    scn = sc.reset()
    M = gpt_materials()
    root = sc.collection('GPT_ChatGPT')
    c_body = sc.collection('GPT_Body', root)
    c_face = sc.collection('GPT_Face', root)
    c_rig = sc.collection('GPT_Rig', root)
    c_wgt = sc.collection('GPT_Widgets', root)
    HC = GPT_HEAD_C

    head = put(geo.rounded_box(GPT_HEAD_R, 8, 0.24).orient_outward().transform(Matrix.Translation(HC)),
               'GPT_Head', c_body, M['armor'])
    screen = put(dev.slab(head, rounded_rect_fn(0.0, HC.z - 0.010, 0.150, 0.095, n=5.0), 16, 10,
                          lift=0.005, depth=0.010), 'GPT_Screen', c_face, M['screen'], subsurf=None)
    sc.add_bevel(screen, 0.0025, 2)
    for s, side in ((1, 'L'), (-1, 'R')):
        put(puck((0.190 * s, 0.010, HC.z - 0.005), (s, 0, 0), 0.068, 0.060, rings=((0.30, 0.40), (0.62, 0.72))),
            f'GPT_Ear.{side}', c_body, [M['mech'], M['ring']])
        shape_decal(f'GPT_Eye.{side}', c_face, M['glow'], screen, 0.066 * s, HC.z + 0.004, gpt_eye_shapes(s))
    shape_decal('GPT_Mouth', c_face, M['glow'], screen, 0.0, HC.z - 0.055, GPT_MOUTH)
    top = HC.z + GPT_HEAD_R[2]
    ant = capsule((0.045, 0.02, top - 0.01), (0.045, 0.02, top + 0.060), 0.007, cap='flat')
    put(ant, 'GPT_Antenna', c_body, M['mech'])
    put(ball((0.045, 0.02, top + 0.066), 0.012), 'GPT_Antenna_Tip', c_body, M['ring'])

    neck = capsule((0, 0, 1.110), (0, 0, 1.200), 0.050)
    for s in (1, -1):
        neck.extend(capsule((0.058 * s, 0.01, 1.115), (0.058 * s, 0.01, 1.195), 0.011))
    put(neck, 'GPT_Neck', c_body, M['joint'])
    torso = put(box((0, 0, 0.985), (0.200, 0.135, 0.150), 0.24), 'GPT_Torso_Armor', c_body, M['armor'])
    plate = put(dev.slab(torso, rounded_rect_fn(0.0, 0.995, 0.074, 0.074, n=4.0), 10, 10, lift=0.005, depth=0.010),
                'GPT_Chest_Plate', c_body, M['plate'], subsurf=None)
    sc.add_bevel(plate, 0.003, 2)
    decal('GPT_Emblem', c_body, M['emblem'], plate, 0.0, 0.995, emblems.rosette(), 0.112,
          thickness=0.0015, offset=0.0008)
    trims = geo.MeshData()
    for s in (1, -1):
        trims.extend(dev.slab(torso, rounded_rect_fn(0.150 * s, 0.990, 0.011, 0.085, n=4.0), 2, 8,
                              lift=0.003, depth=0.006))
    put(trims, 'GPT_Trim_Green', c_body, M['green'], subsurf=None)
    put(box((0, 0.150, 1.000), (0.125, 0.050, 0.110), 0.4), 'GPT_Backpack', c_body, M['mech'])
    vents = geo.MeshData()
    for k in range(3):
        vents.extend(box((0.0, 0.201, 1.045 - 0.030 * k), (0.070, 0.004, 0.006), 0.6))
    put(vents, 'GPT_Backpack_Lights', c_body, M['ring'], subsurf=None)
    abdomen = box((0, 0, 0.790), (0.128, 0.098, 0.050), 0.6)
    abdomen.extend(box((0, 0, 0.725), (0.112, 0.086, 0.035), 0.6))
    put(abdomen, 'GPT_Abdomen', c_body, M['mech'])
    put(dev.band((0, 0, 0.760), (0, 0, 0.752), 0.118, 0.100, count=28), 'GPT_Waist_Ring', c_body, M['ring'])
    put(box((0, 0, 0.665), (0.150, 0.108, 0.060), 0.45), 'GPT_Pelvis', c_body, M['mech'])

    chains = {}
    for s in (1, -1):
        side = 'L' if s > 0 else 'R'
        S = Vector((0.245 * s, 0.0, 1.075))
        E, W, Ht, d, d2 = arm_chain(S, 62, 0.235, 0.220, 0.090, s)
        chains[s] = {'S': S, 'E': E, 'W': W, 'Ht': Ht, 'd': d, 'd2': d2}
        put(box(S + Vector((0.012 * s, 0, 0.036)), (0.074, 0.084, 0.058), 0.30), f'GPT_Shoulder_Pad.{side}',
            c_body, M['armor'])
        put(ball(S, 0.045), f'GPT_Shoulder_Joint.{side}', c_body, M['joint'])
        put(capsule(S, E, 0.026), f'GPT_UpperArm.{side}', c_body, M['mech'])
        put(box_along(S + d * 0.080, E - d * 0.055, 0.0465, 0.0465, 0.25), f'GPT_UpperArm_Armor.{side}',
            c_body, M['armor'])
        put(ball(E, 0.034), f'GPT_Elbow.{side}', c_body, M['joint'])
        put(dev.band(E - d * 0.012, E + d * 0.012, 0.039, 0.030, count=20), f'GPT_Elbow_Ring.{side}', c_body,
            M['ring'])
        put(capsule(E, W, 0.024), f'GPT_Forearm.{side}', c_body, M['mech'])
        put(box_along(E + d2 * 0.045, W - d2 * 0.020, 0.050, 0.050, 0.25), f'GPT_Forearm_Armor.{side}', c_body,
            M['armor'])
        H, K, A, T = gpt_legs(s)
        put(capsule(H, K, 0.030), f'GPT_Thigh.{side}', c_body, M['mech'])
        put(box_along(H + Vector((0, 0, -0.035)), K + Vector((0, 0, 0.055)), 0.062, 0.062, 0.25),
            f'GPT_Thigh_Armor.{side}', c_body, M['armor'])
        put(ball(K, 0.040), f'GPT_Knee.{side}', c_body, M['joint'])
        put(box(K + Vector((0, -0.044, 0.004)), (0.034, 0.018, 0.034), 0.6), f'GPT_Kneecap.{side}', c_body,
            M['armor'])
        put(capsule(K, A, 0.028), f'GPT_Shin.{side}', c_body, M['mech'])
        put(box_along(K + Vector((0, 0, -0.055)), A + Vector((0, 0, 0.065)), 0.056, 0.055, 0.25),
            f'GPT_Shin_Armor.{side}', c_body, M['armor'])
        put(dev.slab(bpy.data.objects[f'GPT_Shin_Armor.{side}'], rounded_rect_fn(A.x, 0.235, 0.010, 0.045, n=4.0),
                     2, 6, lift=0.003, depth=0.006), f'GPT_Shin_Trim.{side}', c_body, M['green'], subsurf=None)
        put(ball(A, 0.030), f'GPT_Ankle.{side}', c_body, M['joint'])
        foot = box((A.x, A.y - 0.035, 0.036), (0.056, 0.096, 0.036), 0.30)
        put(foot, f'GPT_Foot.{side}', c_body, M['mech'])
        put(box((A.x, A.y - 0.105, 0.040), (0.052, 0.036, 0.032), 0.55), f'GPT_Toe_Cap.{side}', c_body, M['armor'])
    robot_hands('GPT', c_body, chains, M['mech'], 1.10)

    B = rig.BoneSpec
    specs = [
        B('root', (0, 0, 0), (0, 0.30, 0), deform=False, z_axis=(0, 0, 1)),
        B('hips', (0, 0.004, 0.620), (0, 0.004, 0.720), parent='root'),
        B('spine', (0, 0.004, 0.720), (0, 0.004, 0.840), parent='hips', connect=True),
        B('chest', (0, 0.004, 0.840), (0, 0.006, 1.120), parent='spine', connect=True),
        B('neck', (0, 0.006, 1.120), (0, 0.004, 1.180), parent='chest', connect=True),
        B('head', (0, 0.004, 1.180), (0, 0.004, top), parent='neck', connect=True),
        B('look', (0, -0.25, HC.z), (0, -0.25, HC.z + 0.04), parent='head', coll='Face'),
        B('face', (0, -0.32, HC.z - 0.13), (0, -0.32, HC.z - 0.09), parent='head', coll='Face'),
    ] + arm_specs(B, chains, 1.09)
    for s, side in ((1, 'L'), (-1, 'R')):
        H, K, A, T = gpt_legs(s)
        specs += [
            B(f'thigh.{side}', H, K, parent='hips'),
            B(f'shin.{side}', K, A, parent=f'thigh.{side}', connect=True),
            B(f'foot.{side}', A, T, parent=f'shin.{side}', connect=True, z_axis=(0, 0, 1)),
            B(f'toe.{side}', T, T + Vector((0, -0.05, 0)), parent=f'foot.{side}', connect=True, z_axis=(0, 0, 1)),
        ]
    for spec in specs:
        spec.deform = False
    arm = rig.build_armature('GPT_Rig', c_rig, specs)
    mapping = {'GPT_Head': 'head', 'GPT_Screen': 'head', 'GPT_Ear.L': 'head', 'GPT_Ear.R': 'head',
               'GPT_Mouth': 'head', 'GPT_Antenna': 'head', 'GPT_Antenna_Tip': 'head',
               'GPT_Eye.L': 'look', 'GPT_Eye.R': 'look', 'GPT_Neck': 'neck',
               'GPT_Torso_Armor': 'chest', 'GPT_Chest_Plate': 'chest', 'GPT_Emblem': 'chest',
               'GPT_Trim_Green': 'chest', 'GPT_Backpack': 'chest', 'GPT_Backpack_Lights': 'chest',
               'GPT_Abdomen': 'spine', 'GPT_Waist_Ring': 'spine', 'GPT_Pelvis': 'hips'}
    for side in ('L', 'R'):
        mapping.update({
            f'GPT_Shoulder_Pad.{side}': f'shoulder.{side}', f'GPT_Shoulder_Joint.{side}': f'upper_arm.{side}',
            f'GPT_UpperArm.{side}': f'upper_arm.{side}', f'GPT_UpperArm_Armor.{side}': f'upper_arm.{side}',
            f'GPT_Elbow.{side}': f'forearm.{side}', f'GPT_Elbow_Ring.{side}': f'forearm.{side}',
            f'GPT_Forearm.{side}': f'forearm.{side}', f'GPT_Forearm_Armor.{side}': f'forearm.{side}',
            f'GPT_Hand.{side}': f'hand.{side}',
            f'GPT_Thigh.{side}': f'thigh.{side}', f'GPT_Thigh_Armor.{side}': f'thigh.{side}',
            f'GPT_Knee.{side}': f'shin.{side}', f'GPT_Kneecap.{side}': f'shin.{side}',
            f'GPT_Shin.{side}': f'shin.{side}', f'GPT_Shin_Armor.{side}': f'shin.{side}',
            f'GPT_Shin_Trim.{side}': f'shin.{side}', f'GPT_Ankle.{side}': f'foot.{side}',
            f'GPT_Foot.{side}': f'foot.{side}', f'GPT_Toe_Cap.{side}': f'foot.{side}'})
    bind_rigid(arm, mapping)
    finish_rig(arm, GPT_SLIDERS, GPT_EYE_KEYS, GPT_MOUTH_KEYS, 'GPT')
    widgets(arm, c_wgt, extra={'hips': ('circle', 1.9), 'spine': ('circle', 1.4), 'look': ('cross', 0.6)})
    return scn, arm, HC.z


# ---------------------------------------------------------------- shared rig widgets, poses, renders

def widgets(arm, col, extra=None):
    shapes = {'root': ('circle', 1.4), 'chest': ('circle', 0.9), 'head': ('circle', 0.9), 'face': ('square', 0.6)}
    shapes.update(extra or {})
    for side in ('L', 'R'):
        shapes[f'hand.{side}'] = ('circle', 0.5)
    for bone, (kind, size) in shapes.items():
        if bone in arm.pose.bones:
            arm.pose.bones[bone].custom_shape = rig.widget(f'WGT_{arm.name}_{bone}', col, kind, size)
    col.hide_viewport = True
    col.hide_render = True


def arm_to(arm, side, wrist, pole, hand_dir, hand_dorsal):
    dev.place_arm(arm, side, Vector(wrist), Vector(pole), Vector(hand_dir), Vector(hand_dorsal))


# Claude poses
def cld_open_hands(arm):
    rig.rotate_world(arm, 'chest', (1, 0, 0), -4)
    for side, s in (('L', 1), ('R', -1)):
        arm_to(arm, side, (0.255 * s, -0.10, 0.800), (0.30 * s, 0.25, 0.70), (0.6 * s, -0.5, 0.25), (0, 0.2, -1))
        arm.pose.bones[f'hand.{side}']['open'] = 0.7
    rig.rotate_world(arm, 'head', (0, 1, 0), 8)


def cld_wave(arm):
    rig.rotate_world(arm, 'chest', (0, 1, 0), 5)
    arm_to(arm, 'R', (-0.240, -0.05, 1.050), (-0.45, 0.10, 0.80), (-0.10, -0.05, 1.0), (0.10, 1.0, 0.1))
    arm_to(arm, 'L', (0.200, -0.02, 0.700), (0.30, 0.25, 0.80), (0.30, -0.10, -1.0), (1.0, 0.0, 0.2))
    arm.pose.bones['hand.R']['open'] = 1.0
    rig.rotate_world(arm, 'head', (0, 1, 0), 9)


def cld_heart(arm):
    rig.rotate_world(arm, 'chest', (1, 0, 0), 5)
    for side, s in (('L', 1), ('R', -1)):
        arm_to(arm, side, (0.050 * s, -0.170, 0.830), (0.30 * s, -0.05, 0.70), (-0.6 * s, -0.2, 0.7), (0, -1, 0.2))
        arm.pose.bones[f'hand.{side}']['fist'] = 0.25
    rig.rotate_world(arm, 'head', (0, 1, 0), -10)


# ChatGPT poses
def gpt_point(arm):
    dev.plant_legs(arm, (0.012, 0.0, -0.006), hip_roll=-2)
    arm_to(arm, 'R', (-0.300, -0.280, 1.120), (-0.45, 0.10, 0.95), (-0.15, -1.0, 0.15), (0, 0, 1))
    arm_to(arm, 'L', (0.250, -0.040, 0.730), (0.50, 0.20, 0.90), (-0.6, -0.1, -0.3), (0.5, 0, 0.5))
    arm.pose.bones['hand.R']['point'] = 1.0
    arm.pose.bones['hand.L']['fist'] = 0.5
    rig.rotate_world(arm, 'head', (0, 1, 0), 5)


def gpt_work(arm):
    dev.plant_legs(arm, (0.0, 0.0, -0.010))
    rig.rotate_world(arm, 'spine', (1, 0, 0), 6)
    for side, s in (('L', 1), ('R', -1)):
        arm_to(arm, side, (0.160 * s, -0.320, 0.860), (0.40 * s, 0.05, 0.85), (0, -1, -0.2), (0, 0.2, 1))
        arm.pose.bones[f'hand.{side}']['fist'] = 0.15
    rig.rotate_world(arm, 'head', (1, 0, 0), 10)


def gpt_think(arm):
    dev.plant_legs(arm, (-0.010, 0.0, -0.005), hip_roll=2)
    arm_to(arm, 'R', (-0.050, -0.200, 1.110), (-0.25, -0.15, 0.85), (0.15, 0.1, 1.0), (0, -1, 0))
    arm_to(arm, 'L', (-0.080, -0.200, 0.930), (0.40, -0.10, 0.85), (-1.0, 0.0, 0.1), (0, -0.3, -1))
    arm.pose.bones['hand.R']['fist'] = 0.6
    arm.pose.bones['hand.L']['fist'] = 0.2
    rig.rotate_world(arm, 'head', (0, 1, 0), -8)
    rig.rotate_world(arm, 'head', (1, 0, 0), -5)


CHARACTERS = {
    'claude': {
        'name': 'Claude', 'prefix': 'CLD', 'file': 'BWM_Claude', 'build': build_claude, 'folder': 'claude',
        'expressions': {
            'Neutral': {'eye_happy': 1.0, 'mouth_smile': 0.3},
            'Happy': {'eye_happy': 1.0, 'mouth_grin': 1.0},
            'Concerned': {'eye_sad': 1.0, 'mouth_frown': 0.7},
            'Surprised': {'eye_wide': 1.0, 'mouth_o': 1.0},
            'Thoughtful': {'eye_focus': 0.6, 'mouth_flat': 1.0, 'look': (0.014, 0.010)},
            'Empathetic': {'eye_happy': 0.55, 'eye_sad': 0.5, 'mouth_smile': 0.6},
        },
        'poses': {'Rest': None, 'OpenHands': cld_open_hands, 'Wave': cld_wave, 'HeartHands': cld_heart},
        'pose_shots': (('OpenHands', 'Happy'), ('Wave', 'Happy'), ('HeartHands', 'Empathetic')),
        'hero': ('OpenHands', 'Happy'),
    },
    'chatgpt': {
        'name': 'ChatGPT', 'prefix': 'GPT', 'file': 'BWM_ChatGPT', 'build': build_chatgpt, 'folder': 'chatgpt',
        'expressions': {
            'Neutral': {},
            'Focused': {'eye_squint': 0.8},
            'Amused': {'eye_happy': 1.0, 'mouth_smile': 1.0},
            'Annoyed': {'eye_annoyed': 1.0, 'mouth_frown': 0.7},
            'Surprised': {'eye_wide': 1.0, 'mouth_open': 1.0},
            'Thinking': {'eye_squint': 0.35, 'look': (0.014, 0.012)},
        },
        'poses': {'Rest': None, 'Point': gpt_point, 'Working': gpt_work, 'Thinking': gpt_think},
        'pose_shots': (('Point', 'Focused'), ('Working', 'Neutral'), ('Thinking', 'Thinking')),
        'hero': ('Point', 'Amused'),
    },
}


def set_look(arm, spec, expr, pose):
    rig.reset_pose(arm)
    if pose and spec['poses'].get(pose):
        spec['poses'][pose](arm)
    e = spec['expressions'][expr]
    face = arm.pose.bones['face']
    for k, v in e.items():
        if k != 'look':
            face[k] = v
    lx, lz = e.get('look', (0.0, 0.0))
    arm.pose.bones['look'].location = (lx, lz, 0.0)
    arm.update_tag()
    rig.update()


def store_library(arm, spec):
    prefix = spec['prefix']
    body = [b.name for b in arm.data.bones if b.collections.get('Body')]
    face = [b.name for b in arm.data.bones if b.collections.get('Face')]
    sliders = [k for k in arm.pose.bones['face'].keys() if isinstance(arm.pose.bones['face'][k], float)]
    for pose, fn in spec['poses'].items():
        rig.reset_pose(arm)
        if fn:
            fn(arm)
        rig.store_action(arm, f'{prefix}_Pose_{pose}', body, [(f'hand.{s}', h) for s in 'LR' for h in HAND_SLIDERS])
    for expr in spec['expressions']:
        set_look(arm, spec, expr, None)
        rig.store_action(arm, f'{prefix}_Expr_{expr}', face, [('face', k) for k in sliders])
    rig.reset_pose(arm)


def render_set(scn, arm, cams, spec, out_dir, mode):
    rdir = os.path.join(out_dir, 'renders')
    os.makedirs(rdir, exist_ok=True)
    spp = {'preview': 24, 'check': 24, 'review': 80}[mode]
    k = 1.0 if mode == 'review' else 0.5
    tag = spec['prefix'].lower()

    def r(cam, name, res, expr='Neutral', pose=None, turn=0.0):
        set_look(arm, spec, expr, pose)
        arm.rotation_euler = (0.0, 0.0, rad(turn))
        path = os.path.join(rdir, f'{name}.png')
        t0 = time.time()
        studio.render(scn, cams[cam], path, (int(res[0] * k), int(res[1] * k)), spp)
        arm.rotation_euler = (0.0, 0.0, 0.0)
        print(f'[render] {name} {time.time() - t0:.1f}s', flush=True)
        return path

    views = (('front', 0.0), ('three_quarter', 40.0), ('side', 90.0), ('back', 180.0))
    turn = [r('turn', f'{tag}_turn_{v}', (720, 1080), turn=a) for v, a in views]
    studio.contact_sheet(turn, 4, os.path.join(rdir, 'sheet_turnaround.png'))
    exprs = list(spec['expressions'])
    if mode == 'preview':
        exprs = exprs[:2]
    faces = [r('face', f'{tag}_expr_{e.lower()}', (640, 640), e) for e in exprs]
    if mode == 'preview':
        return
    studio.contact_sheet(faces, len(faces), os.path.join(rdir, 'sheet_expressions.png'))
    poses = [r('pose', f'{tag}_pose_{p.lower()}', (720, 1080), e, p) for p, e in spec['pose_shots']]
    studio.contact_sheet(poses, len(poses), os.path.join(rdir, 'sheet_poses.png'))
    hp, he = spec['hero']
    r('hero', f'{tag}_hero_9x16', (1080, 1920), he, hp)
    set_look(arm, spec, 'Neutral', None)


def build(key, out_root, render_mode, save=True):
    spec = CHARACTERS[key]
    t0 = time.time()
    scn, arm, face_z = spec['build']()
    store_library(arm, spec)
    cams = studio.standard_set(scn, face_z)
    studio.setup_render(scn, samples=96, res=(1080, 1920))
    scn.frame_start, scn.frame_end = 1, 1
    set_look(arm, spec, 'Neutral', None)
    print(f'[build] {spec["name"]} done in {time.time() - t0:.1f}s', flush=True)
    out = os.path.join(out_root, spec['folder'])
    os.makedirs(out, exist_ok=True)
    if save:
        path = os.path.join(out, f'{spec["file"]}_{VERSION}.blend')
        bpy.ops.wm.save_as_mainfile(filepath=path, compress=True)
        print(f'[save] {path}', flush=True)
    if render_mode != 'none':
        render_set(scn, arm, cams, spec, out, render_mode)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument('--character', choices=('claude', 'chatgpt', 'both'), default='both')
    ap.add_argument('--render', choices=('none', 'preview', 'check', 'review'), default='none')
    ap.add_argument('--out', default=os.path.normpath(os.path.join(HERE, '..', 'characters')))
    ap.add_argument('--no-save', action='store_true')
    args = ap.parse_args(argv)
    for key in (('claude', 'chatgpt') if args.character == 'both' else (args.character,)):
        build(key, args.out, args.render, save=not args.no_save)


if __name__ == '__main__':
    main()
