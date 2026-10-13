"""Build With Marshall - Developer ("The Creator's Hand"), proof of concept.

Builds the character from scratch into a clean .blend (model, materials,
logo, rig, face sliders, saved poses and expressions, presentation studio)
and optionally renders the review sheets.

Run inside Blender (Windows, from the repo root):
  "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" --background --factory-startup
      --python build-with-marshall\\blender\\build_developer.py -- --render review

Or with the bpy module (what the cloud sandbox uses):
  python build_developer.py --render review

--render none|preview|check|review   (default none: just build and save the .blend)
--out DIR                      (default: build-with-marshall/characters/developer)
"""

import argparse
import math
import os
import random
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

from bwm import geo, rig, studio  # noqa: E402
from bwm import materials as mt  # noqa: E402
from bwm import scene as sc  # noqa: E402
from bwm.geo import clamp, lerp, smoothstep  # noqa: E402

VERSION = 'v002'

# ---------------------------------------------------------------- proportions
# 1.47 m to the crown, head 0.39 m tall: about a 1:4 head-to-body ratio (hair adds ~5 cm).
HEAD_C = Vector((0.0, 0.0, 1.262))
HEAD_R = (0.176, 0.180, 0.196)          # half width, half depth, half height
EYE_R = 0.052
EYE_X = 0.070
EYE_Z = HEAD_C.z - 0.026
MOUTH_Z = HEAD_C.z - 0.123
BROW_Z = HEAD_C.z + 0.062

PALETTE = {
    'skin': '#BF8259', 'hair': '#16100D',
    'sclera': '#F3F0EA', 'iris_in': '#A36A3A', 'iris_out': '#4B2B16', 'pupil': '#0A0706',
    'lash': '#140E0C', 'mouth': '#3A1416', 'teeth': '#F6F2EA', 'tongue': '#C25660',
    'hoodie': '#1D2028', 'hoodie_rib': '#171A20', 'string': '#D8D9DD', 'aglet': '#A0A5AE',
    'pants': '#2A3A5A', 'pants_rib': '#223049', 'shoe': '#ECECEE', 'sole': '#F7F6F2',
    'shoe_dark': '#3A3E47', 'logo': mt.BWM_ORANGE,
}


def rad(d):
    return math.radians(d)


# ---------------------------------------------------------------- materials

def make_materials():
    p = PALETTE
    M = {}
    M['skin'] = mt.principled('DEV_Skin', p['skin'], rough=0.48, spec=0.45, sss=0.18,
                              sss_radius=(1.0, 0.42, 0.25), sss_scale=0.025)
    M['hair'] = mt.principled('DEV_Hair', p['hair'], rough=0.46, spec=0.5, coat=0.08, coat_rough=0.3,
                              sheen=0.25, sheen_rough=0.4, bump=('noise', 140.0, 0.2))
    M['sclera'] = mt.principled('DEV_Eye_White', p['sclera'], rough=0.25, sss=0.1, coat=1.0, coat_rough=0.02)
    M['iris_in'] = mt.principled('DEV_Eye_Iris_Inner', p['iris_in'], rough=0.35, coat=1.0, coat_rough=0.02)
    M['iris_out'] = mt.principled('DEV_Eye_Iris_Outer', p['iris_out'], rough=0.35, coat=1.0, coat_rough=0.02)
    M['limbal'] = mt.principled('DEV_Eye_Limbal', '#1C110A', rough=0.4, coat=1.0, coat_rough=0.02)
    M['pupil'] = mt.principled('DEV_Eye_Pupil', p['pupil'], rough=0.3, coat=1.0, coat_rough=0.02)
    M['lash'] = mt.principled('DEV_Lash', p['lash'], rough=0.6)
    M['mouth'] = mt.principled('DEV_Mouth_Inner', p['mouth'], rough=0.6)
    M['teeth'] = mt.principled('DEV_Teeth', p['teeth'], rough=0.3, sss=0.05)
    M['tongue'] = mt.principled('DEV_Tongue', p['tongue'], rough=0.45, sss=0.2)
    M['hoodie'] = mt.principled('DEV_Hoodie', p['hoodie'], rough=0.85, spec=0.25, sheen=0.25, sheen_rough=0.5,
                                bump=('noise', 220.0, 0.12))
    M['hoodie_rib'] = mt.principled('DEV_Hoodie_Rib', p['hoodie_rib'], rough=0.88, spec=0.25, sheen=0.2,
                                    bump=('rib', 26.0, 0.35))
    M['string'] = mt.principled('DEV_Drawstring', p['string'], rough=0.7, sheen=0.4)
    M['aglet'] = mt.principled('DEV_Aglet', p['aglet'], rough=0.3, metal=1.0)
    M['logo'] = mt.principled('BWM_Logo_Orange', p['logo'], rough=0.42, spec=0.4,
                              emit=p['logo'], emit_strength=0.35)
    M['pants'] = mt.principled('DEV_Pants', p['pants'], rough=0.82, spec=0.28, sheen=0.2,
                               bump=('noise', 260.0, 0.12))
    M['pants_rib'] = mt.principled('DEV_Pants_Rib', p['pants_rib'], rough=0.85, sheen=0.4, bump=('rib', 22.0, 0.3))
    M['shoe'] = mt.principled('DEV_Shoe_Upper', p['shoe'], rough=0.5, spec=0.45)
    M['sole'] = mt.principled('DEV_Shoe_Sole', p['sole'], rough=0.6)
    M['shoe_dark'] = mt.principled('DEV_Shoe_Tongue', p['shoe_dark'], rough=0.75, sheen=0.3)
    M['shoe_accent'] = mt.principled('BWM_Accent_Orange', mt.BWM_ORANGE, rough=0.5)
    return M


# ---------------------------------------------------------------- head

def _bump(u, c, sx, sz, amp):
    """Gaussian bump on the head, in angle-ish units around direction c."""
    if u.dot(c) <= 0.0:
        return 0.0
    tx = Vector((0, 0, 1)).cross(c)
    if tx.length < 1e-6:
        tx = Vector((1, 0, 0))
    tx.normalize()
    tz = c.cross(tx).normalized()
    dv = u - c
    return amp * math.exp(-(dv.dot(tx) / sx) ** 2 - (dv.dot(tz) / sz) ** 2)


NOSE_DIR = Vector((0.0, -1.0, -0.52)).normalized()
EYE_DIRS = [Vector((s * EYE_X, -0.17, EYE_Z - HEAD_C.z)).normalized() for s in (1, -1)]


def head_local(u):
    """Unit direction -> head surface point relative to HEAD_C."""
    ax, ay, az = HEAD_R
    r = 1.0 / math.sqrt((u.x / ax) ** 2 + (u.y / ay) ** 2 + (u.z / az) ** 2)
    x, y, z = u.x * r, u.y * r, u.z * r
    low = smoothstep(0.0, -0.18, z)
    x *= 1.0 - 0.22 * low                                    # jaw narrows toward the chin
    if y > 0:
        y *= 1.0 - 0.30 * smoothstep(-0.03, -0.18, z)          # skull tucks into the neck
        y *= 1.0 + 0.07 * smoothstep(-0.08, 0.10, z)           # rounder back of the cranium
    else:
        y *= 0.955                                             # flatter face plane for the eyes
    p = Vector((x, y, z))
    d = _bump(u, NOSE_DIR, 0.085, 0.105, 0.030)               # button nose
    d += _bump(u, Vector((0, -0.78, -0.62)).normalized(), 0.24, 0.14, 0.008)   # muzzle
    d += _bump(u, Vector((0, -0.52, -0.85)).normalized(), 0.16, 0.12, 0.008)   # chin
    for s in (1, -1):
        d += _bump(u, Vector((0.60 * s, -0.62, -0.46)).normalized(), 0.22, 0.20, 0.011)  # cheeks
        d += _bump(u, Vector((0.33 * s, -0.88, 0.34)).normalized(), 0.20, 0.07, 0.006)   # brow ridge
    for e in EYE_DIRS:
        d -= _bump(u, e, 0.15, 0.15, 0.010)                    # eye sockets
    return p + p.normalized() * d


def head_point(u):
    return HEAD_C + head_local(u)


def head_normal(u):
    """Approximate outward normal from the base ellipsoid gradient."""
    ax, ay, az = HEAD_R
    return Vector((u.x / ax ** 2, u.y / ay ** 2, u.z / az ** 2)).normalized()


def build_head(col, M):
    md = geo.shaped_sphere(26, head_point)
    head = sc.to_object(md, 'DEV_Head', col, [M['skin']], subsurf=(1, 2))
    # ears
    prof = [(0.0, 0.0015), (0.010, 0.002), (0.019, 0.0045), (0.026, 0.0085), (0.031, 0.0075),
            (0.034, 0.002), (0.032, -0.005), (0.026, -0.010), (0.015, -0.014), (0.0, -0.016)]
    for s, suffix in ((1, 'L'), (-1, 'R')):
        ear = geo.lathe(prof, 20).orient_outward()
        ear.transform(Matrix.Diagonal((1.0, 1.42, 1.0, 1.0)))
        u = Vector((s * 0.98, 0.10, -0.12)).normalized()
        base = head_point(u)
        normal = Vector((s, -0.38, 0.05)).normalized()          # dish faces out and a bit forward
        # local Y = ear height (tilted back a touch), local Z = outward normal
        ear.transform(geo.frame_matrix(base - normal * 0.009, (0.0, 0.10, 1.0), normal))
        sc.to_object(ear, f'DEV_Ear.{suffix}', col, [M['skin']], subsurf=(1, 2))
    # neck
    pts = geo.resample([Vector((0, 0.020, 0.95)), Vector((0, 0.014, 1.06)), Vector((0, 0.010, 1.160))], 9)
    neck = geo.tube(pts, 0.053, count=16, up_hint=(0, -1, 0))
    sc.to_object(neck, 'DEV_Neck', col, [M['skin']], subsurf=(1, 2))
    return head


def eye_mesh():
    angles = [0, 7, 14, 20, 26, 31, 36, 39, 45, 55, 70, 90, 115, 145, 180]
    prof = [(EYE_R * math.sin(rad(a)), EYE_R * math.cos(rad(a))) for a in angles]
    prof[0] = (0.0, EYE_R)
    prof[-1] = (0.0, -EYE_R)
    mats = []
    for a0, a1 in zip(angles, angles[1:]):
        mid = (a0 + a1) / 2
        mats.append(4 if mid < 14 else 1 if mid < 26 else 2 if mid < 36 else 3 if mid < 39 else 0)
    md = geo.lathe(prof, 36, band_mats=mats).orient_outward()
    return md.transform(Matrix.Rotation(rad(90), 4, 'X'))      # pole (iris) faces -Y


def lid_mesh(upper):
    """Spherical lid shell around the eye; upper lids hinge down, lower lids hinge up."""
    if upper:
        R = EYE_R * 1.075
        angles = [0, 25, 50, 70, 82, 90, 95]
        prof = [(R * math.sin(rad(a)), R * math.cos(rad(a))) for a in angles]
        prof[0] = (0.0, R)
        prof.append((R * 1.06 * math.sin(rad(97.5)), R * 1.06 * math.cos(rad(97.5))))   # lash flare
        mats = [0, 0, 0, 0, 0, 1, 1]
        md = geo.lathe(prof, 36, band_mats=mats).flip()
        rest = rad(-37)
    else:
        R = EYE_R * 1.045
        angles = [0, 25, 50, 70, 85, 95, 100]
        prof = [(R * math.sin(rad(a)), -R * math.cos(rad(a))) for a in angles]
        prof[0] = (0.0, -R)
        md = geo.lathe(prof, 36)
        rest = rad(50)
    return md.transform(Matrix.Rotation(rest, 4, 'X'))


def face_frame(head, x, z):
    """Surface point + tangent frame on the face at (x, z), ray cast from the front."""
    hit, n = sc.surface_y(head, x, z)
    if hit is None:
        raise RuntimeError(f'face ray missed at x={x} z={z}')
    tx = Vector((0, 0, 1)).cross(n).normalized()     # screen right (+X) on a front-facing surface
    tz = n.cross(tx).normalized()                     # screen up
    return hit, n, tx, tz


# ---------------------------------------------------------------- mouth

MOUTH_COLS = 17


def _closed(W, curve, th=0.0024, wobble=0.0, tilt=0.0, lift_l=0.0, lift_r=0.0, wl=1.0, wr=1.0, dz=0.0):
    def f(s):
        x = W * s * (wl if s > 0 else wr)
        c = dz + curve * s * s + wobble * math.sin(3.0 * math.pi * s) + tilt * s
        c += lift_l * max(0.0, s) ** 2.5 + lift_r * max(0.0, -s) ** 2.5
        e = math.sqrt(max(0.0, 1.0 - s * s))
        h = th * (0.7 * e + 0.3) if abs(s) < 1.0 else 0.0
        return x, c + h / 2, c + h / 2, c - h / 2, c - h / 2
    return f


def _opened(W, top, depth, teeth, tongue, top_curve=0.0, top_pow=0.0, dz=0.0):
    def f(s):
        e = math.sqrt(max(0.0, 1.0 - s * s))
        u = dz + top * (e ** top_pow if top_pow else 1.0) + top_curve * s * s
        if abs(s) >= 1.0:
            u = dz + (0.0 if top_pow else top) + top_curve
        low = u - depth * e ** 0.85
        return W * s, u, u - teeth * e ** 0.6, low + tongue * e ** 0.7, low
    return f


MOUTH_SHAPES = {
    'Basis': _closed(0.030, 0.0058, th=0.0036),
    'M_Smile': _closed(0.035, 0.0115, th=0.0038, dz=-0.0025),
    'M_Grin': _opened(0.043, 0.0, 0.037, 0.0095, 0.012, top_curve=0.0085, dz=-0.001),
    'M_Open': _opened(0.022, 0.009, 0.033, 0.0045, 0.009, top_pow=0.6, dz=-0.004),
    'M_O': _opened(0.0125, 0.010, 0.025, 0.0, 0.0045, top_pow=0.6, dz=-0.003),
    'M_Frown': _closed(0.026, -0.0090, th=0.0036, dz=0.0025),
    'M_Wobble': _closed(0.031, 0.0, th=0.0036, wobble=0.0030, tilt=0.0018),
    'M_Smirk_L': _closed(0.030, 0.0058, th=0.0036, lift_l=0.012, wl=1.14),
    'M_Smirk_R': _closed(0.030, 0.0058, th=0.0036, lift_r=0.012, wr=1.14),
}


def mouth_layout(fn):
    """Columns of (x, U, T, G, L); corners collapse to a single point."""
    cols = []
    for i in range(MOUTH_COLS):
        u = -1.0 + 2.0 * i / (MOUTH_COLS - 1)
        s = math.copysign(abs(u) ** 0.85, u)
        cols.append(fn(s))
    return cols


def mouth_mesh(fn, frame):
    origin, n, tx, tz = frame
    cols = mouth_layout(fn)
    md = geo.MeshData()

    def P(x, z):
        return origin + tx * x + tz * z + n * 0.002

    left = md.add_verts([P(cols[0][0], cols[0][1])])
    ids = []
    for c in cols[1:-1]:
        ids.append(md.add_verts([P(c[0], c[k]) for k in (1, 2, 3, 4)]))
    right = md.add_verts([P(cols[-1][0], cols[-1][1])])
    band_mat = (0, 1, 2)          # teeth, mouth, tongue
    for r in range(3):
        md.add_face((left, ids[0] + r + 1, ids[0] + r), mat=band_mat[r])
        for k in range(len(ids) - 1):
            a, b = ids[k], ids[k + 1]
            md.add_face((a + r, a + r + 1, b + r + 1, b + r), mat=band_mat[r])
        md.add_face((ids[-1] + r, ids[-1] + r + 1, right), mat=band_mat[r])
    return md


def build_face(col, head, M):
    parts = {}
    for s, side in ((1, 'L'), (-1, 'R')):
        hit, _ = sc.surface_y(head, s * EYE_X, EYE_Z)
        center = Vector((s * EYE_X, hit.y + EYE_R * 0.60, EYE_Z))
        sc.to_object(eye_mesh(), f'DEV_Eye.{side}', col,
                           [M['sclera'], M['iris_in'], M['iris_out'], M['limbal'], M['pupil']],
                           subsurf=(1, 2), matrix=Matrix.Translation(center))
        up = sc.to_object(lid_mesh(True), f'DEV_Lid_Upper.{side}', col, [M['skin'], M['lash']],
                          matrix=Matrix.Translation(center))
        sc.add_solidify(up, 0.0026, offset=-1.0)
        sc.add_subsurf(up, 1, 2)
        lo = sc.to_object(lid_mesh(False), f'DEV_Lid_Lower.{side}', col, [M['skin']],
                          matrix=Matrix.Translation(center))
        sc.add_solidify(lo, 0.0014, offset=-1.0)
        sc.add_subsurf(lo, 1, 2)
        parts[f'eye_center.{side}'] = center

        # brow: flat tapered strip, shrinkwrapped to the forehead and thickened
        bx = s * 0.060
        origin, n, tx, tz = face_frame(head, bx, BROW_Z)
        md = geo.MeshData()
        K = 10
        top, bot = [], []
        for k in range(K + 1):
            t = k / K
            along = lerp(-0.038, 0.040, t)
            arch = 0.010 * math.sin(math.pi * clamp(t * 0.95)) - 0.006 * t
            w = 0.0195 * (1.0 - 0.55 * t) * (0.75 + 0.25 * smoothstep(0.0, 0.18, t))
            base = origin + tx * (s * along) + tz * arch + n * 0.003
            top.append(base + tz * (w / 2))
            bot.append(base - tz * (w / 2))
        a = md.add_verts(bot)
        b = md.add_verts(top)
        for k in range(K):
            if s > 0:
                md.add_face((a + k, a + k + 1, b + k + 1, b + k))
            else:
                md.add_face((a + k, b + k, b + k + 1, a + k + 1))
        brow = sc.to_object(md, f'DEV_Brow.{side}', col, [M['hair']])
        sc.add_shrinkwrap(brow, head, offset=0.0008)
        sc.add_solidify(brow, 0.0055, offset=1.0)
        sc.add_subsurf(brow, 1, 2)
        parts[f'brow_center.{side}'] = origin + tz * 0.004

    frame = face_frame(head, 0.0, MOUTH_Z)
    base = mouth_mesh(MOUTH_SHAPES['Basis'], frame)
    mouth = sc.to_object(base, 'DEV_Mouth', col, [M['teeth'], M['mouth'], M['tongue']], smooth=False)
    mouth.shape_key_add(name='Basis', from_mix=False)
    for key, fn in MOUTH_SHAPES.items():
        if key == 'Basis':
            continue
        kb = mouth.shape_key_add(name=key, from_mix=False)
        co = [c for v in mouth_mesh(fn, frame).verts for c in v]
        kb.data.foreach_set('co', co)
    sc.add_shrinkwrap(mouth, head, offset=0.0011)
    return parts


# ---------------------------------------------------------------- hair

# Hair follows the creator reference: thick, messy, tousled black hair pushed forward into a heavy fringe,
# volume on top, short tapered sides with the ears showing, flyaway wisps around the outline.
HAIRLINE = [(0, 0.46), (25, 0.43), (50, 0.34), (70, 0.25), (90, 0.15), (110, 0.01),
            (130, -0.22), (150, -0.38), (180, -0.46)]


def _interp(x, table):
    if x <= table[0][0]:
        return table[0][1]
    for (x0, y0), (x1, y1) in zip(table, table[1:]):
        if x <= x1:
            return lerp(y0, y1, (x - x0) / (x1 - x0))
    return table[-1][1]


def _azimuth(u):
    return math.degrees(math.atan2(u.x, -u.y))


def hairline(u):
    return _interp(abs(_azimuth(u)), HAIRLINE)


def _top_front(u):
    """1 on the top and front of the head (where the volume is), falling to 0 on the short sides."""
    return max(smoothstep(115.0, 40.0, abs(_azimuth(u))), smoothstep(0.55, 0.90, u.z))


def hair_offset(u):
    hl = hairline(u)
    return 0.009 + 0.068 * smoothstep(hl - 0.10, hl + 0.45, u.z) * lerp(0.35, 1.0, _top_front(u))


def hair_point(u):
    return head_point(u) + head_normal(u) * hair_offset(u)


def _tangent(n, v):
    v = Vector(v) - n * Vector(v).dot(n)
    return v.normalized() if v.length > 1e-6 else v


def hair_lock(u, flow, length, width, lift, wave_turns, wave_amp, phase, stop_z=None, steps=14, R=0.235):
    """One tapered lock walked over the hair surface along `flow`, gently waved and lifted at the tip."""
    n = head_normal(u)
    axis = u.cross(flow).normalized()
    pts = []
    for k in range(steps + 1):
        t = k / steps
        uk = (Matrix.Rotation(length * t / R, 3, axis) @ u).normalized()
        nk = head_normal(uk)
        amp = wave_amp * smoothstep(0.0, 0.35, t)
        phi = phase + wave_turns * math.tau * t
        p = (hair_point(uk) + nk * (lift * t * t - 0.008 * (1 - t) + 0.5 * amp * math.cos(phi))
             + axis * (amp * math.sin(phi)))
        if stop_z is not None and p.z < stop_z and k > 2:
            break
        pts.append(p)
    if len(pts) < 4:
        return None
    pts = geo.resample(pts, 16)
    return geo.tube(pts, lambda t: 0.5 * width * (1.0 - 0.92 * smoothstep(0.25, 1.0, t)) + 0.0008,
                    count=8, up_hint=n, ratio=0.5, cap_start='flat', cap_end='flat')


def build_hair(col, M, seed=11):
    rng = random.Random(seed)
    base = geo.quad_sphere(26)
    dirs = [v.copy() for v in base.verts]
    keep = [all(dirs[i].z > hairline(dirs[i]) for i in f) for f in base.faces]
    base.verts = [hair_point(d) for d in dirs]
    cap = base.subset(keep)
    cap_obj = sc.to_object(cap, 'DEV_Hair_Cap', col, [M['hair']])
    sc.add_solidify(cap_obj, 0.008, offset=-1.0)
    sc.add_subsurf(cap_obj, 1, 2)

    roots = []
    total = 520
    golden = math.pi * (3.0 - math.sqrt(5.0))
    for i in range(total):
        z = 1.0 - 2.0 * (i + 0.5) / total
        r = math.sqrt(1.0 - z * z)
        ph = i * golden
        u = Vector((r * math.cos(ph), r * math.sin(ph), z))
        u += Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * 0.03
        u.normalize()
        if u.z > hairline(u) + 0.03:
            roots.append(u)

    locks = geo.MeshData()
    for u in roots:
        n = head_normal(u)
        tf = _top_front(u)
        front = smoothstep(115.0, 40.0, abs(_azimuth(u)))
        fwd, down, back, sweep = (_tangent(n, (0, -1, 0)), _tangent(n, (0, 0, -1)),
                                  _tangent(n, (0, 1, 0)), _tangent(n, (1, 0, 0)))
        flow = (fwd * (0.80 * front + 0.6 * smoothstep(0.75, 0.95, u.z)) + sweep * (0.30 * front)
                + down * (0.40 + 0.45 * (1 - front)) + back * (0.20 * (1 - front)))
        flow = _tangent(n, flow)
        flow = Matrix.Rotation(rad(rng.uniform(-28, 28)), 3, n) @ flow
        is_fringe = front > 0.6 and u.z < hairline(u) + 0.30
        length = lerp(0.050, 0.120, tf) * rng.uniform(0.85, 1.15) * (1.3 if is_fringe else 1.0)
        lift = lerp(0.002, 0.036, tf) * rng.uniform(0.4, 1.2)
        width = lerp(0.032, 0.048, tf) * rng.uniform(0.85, 1.15)
        lock = hair_lock(u, flow, length, width, lift, rng.uniform(0.4, 0.9), rng.uniform(0.006, 0.014),
                         rng.uniform(0, math.tau), stop_z=BROW_Z + 0.014 if is_fringe else None)
        if lock:
            locks.extend(lock)

    # flyaway wisps around the top and fringe, for the messy outline
    for _ in range(46):
        az = rad(rng.uniform(-150, 150))
        uz = rng.uniform(0.45, 0.95)
        h = math.sqrt(1.0 - uz * uz)
        u = Vector((h * math.sin(az), -h * math.cos(az), uz)).normalized()
        if u.z < hairline(u) + 0.08 or _top_front(u) < 0.5:
            continue
        n = head_normal(u)
        flow = _tangent(n, _tangent(n, (0, -1, 0)) * 0.7 + Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 0)) * 0.6)
        lock = hair_lock(u, flow, rng.uniform(0.05, 0.085), rng.uniform(0.010, 0.016), rng.uniform(0.02, 0.045),
                         rng.uniform(0.3, 0.8), 0.008, rng.uniform(0, math.tau), stop_z=BROW_Z + 0.02)
        if lock:
            locks.extend(lock)
    obj = sc.to_object(locks, 'DEV_Hair_Locks', col, [M['hair']], subsurf=(1, 2))
    return cap_obj, obj


# ---------------------------------------------------------------- body: hoodie

TORSO = [  # z, half width, front depth, back depth
    (0.566, 0.150, 0.110, 0.102), (0.578, 0.163, 0.121, 0.112), (0.610, 0.168, 0.125, 0.115),
    (0.680, 0.170, 0.126, 0.116), (0.760, 0.175, 0.128, 0.118), (0.840, 0.184, 0.126, 0.121),
    (0.905, 0.190, 0.119, 0.120), (0.950, 0.184, 0.108, 0.112), (0.984, 0.158, 0.093, 0.097),
    (1.008, 0.110, 0.075, 0.083), (1.022, 0.070, 0.061, 0.067), (1.017, 0.057, 0.053, 0.059),
]


def arm_points(side):
    S = Vector((0.178 * side, 0.004, 0.950))
    d = Vector((math.cos(rad(52)) * side, 0.035, -math.sin(rad(52)))).normalized()
    E = S + d * 0.205
    axis = d.cross(Vector((0, -1, 0))).normalized()
    d2 = (Matrix.Rotation(rad(10), 3, axis) @ d).normalized()
    W = E + d2 * 0.190
    return S, E, W, W + d2 * 0.100, d, d2


def leg_points(side):
    H = Vector((0.085 * side, 0.000, 0.555))
    K = Vector((0.088 * side, -0.014, 0.300))
    A = Vector((0.090 * side, 0.004, 0.085))
    T = Vector((0.092 * side, -0.105, 0.022))
    return H, K, A, T


def band(path_a, path_b, r_out, r_in, count=20, up=(0, 0, 1)):
    """Closed rib band (torus-like cuff) between two centre points."""
    a, b = Vector(path_a), Vector(path_b)
    t = (b - a).normalized()
    nrm = Vector(up) - t * Vector(up).dot(t)
    nrm = t.orthogonal() if nrm.length < 1e-6 else nrm.normalized()
    bnm = t.cross(nrm)
    lip = (b - a).length * 0.12
    rings = [geo.ring_points(a + t * lip, nrm, bnm, r_in, r_in, count),
             geo.ring_points(a, nrm, bnm, r_out, r_out, count),
             geo.ring_points(b, nrm, bnm, r_out * 0.985, r_out * 0.985, count),
             geo.ring_points(b - t * lip, nrm, bnm, r_in, r_in, count)]
    return geo.loft(rings, wrap_rings=True).orient_outward()


def build_hoodie(col, M):
    rings = [geo.section(z, a, bf, bb, count=24, exponent=2.6) for z, a, bf, bb in TORSO]
    torso = sc.to_object(geo.loft(rings), 'DEV_Hoodie_Body', col, [M['hoodie']], subsurf=(1, 2))

    wb = geo.loft([geo.section(0.588, 0.148, 0.108, 0.100, 24, 2.6),
                   geo.section(0.584, 0.160, 0.119, 0.111, 24, 2.6),
                   geo.section(0.549, 0.158, 0.117, 0.109, 24, 2.6),
                   geo.section(0.545, 0.146, 0.106, 0.098, 24, 2.6)], wrap_rings=True).orient_outward()
    waist = sc.to_object(wb, 'DEV_Hoodie_Waistband', col, [M['hoodie_rib']], subsurf=(1, 2))

    # hood: thick rolled collar around the neck + folded hood resting on the upper back
    def collar(phi):
        c = math.cos(phi)
        return Vector((0.084 * math.sin(phi), 0.012 - 0.078 * c,
                       1.008 + 0.017 * (1 - c) - 0.014 * max(0.0, c) ** 6))

    ring_list = []
    count, steps = 14, 40
    for k in range(steps):
        phi = math.tau * k / steps
        P = collar(phi)
        T = (collar(phi + 0.01) - P).normalized()
        out = Vector((P.x, P.y - 0.012, 0.0))
        out = (out - T * out.dot(T)).normalized()
        r = 0.020 + 0.014 * (1 - math.cos(phi))
        ring_list.append(geo.ring_points(P, out, T.cross(out), r * 1.15, r, count))
    hood_md = geo.loft(ring_list, wrap_rings=True).orient_outward()
    bag = geo.rounded_box((0.118, 0.050, 0.108), res=6, roundness=0.8)
    bag.transform(Matrix.Translation((0, 0.114, 0.930)) @ Matrix.Rotation(rad(-14), 4, 'X'))
    hood_md.extend(bag.orient_outward())
    hood = sc.to_object(hood_md, 'DEV_Hoodie_Hood', col, [M['hoodie']], subsurf=(1, 2))

    sleeves, cuffs = [], []
    for s, side in ((1, 'L'), (-1, 'R')):
        S, E, W, _, d, d2 = arm_points(s)
        path = [S - d * 0.040, S, S + d * 0.1025, E, E + d2 * 0.095, W - d2 * 0.030]
        pts = geo.resample(path, 18)
        table = [(0.0, 0.050), (0.10, 0.061), (0.25, 0.059), (0.50, 0.054), (0.70, 0.052),
                 (0.88, 0.050), (1.0, 0.046)]

        def radius(t, table=table):
            r = _interp(t, table)
            return r * (1.0 + 0.045 * math.sin(t * 44.0) * smoothstep(0.62, 0.92, t))
        md = geo.tube(pts, radius, count=16, up_hint=(0, 0, 1))
        sleeves.append(sc.to_object(md, f'DEV_Hoodie_Sleeve.{side}', col, [M['hoodie']], subsurf=(1, 2)))
        cuff = band(W - d2 * 0.048, W + d2 * 0.004, 0.041, 0.030, count=18)
        cuffs.append(sc.to_object(cuff, f'DEV_Hoodie_Cuff.{side}', col, [M['hoodie_rib']], subsurf=(1, 2)))
    return torso, waist, hood, sleeves, cuffs


def slab(target, outline_fn, nx, ny, lift=0.0018, depth=0.0035):
    """Flat outline projected onto target's front surface and given thickness (MeshData)."""
    front, back = [], []
    for j in range(ny + 1):
        for i in range(nx + 1):
            x, z = outline_fn(i / nx, j / ny)
            hit, n = sc.surface_y(target, x, z)
            if hit is None:
                raise RuntimeError(f'projection onto {target.name} missed at x={x:.3f} z={z:.3f}')
            front.append(hit + n * lift)
            back.append(hit - n * (depth - lift))
    md = geo.MeshData()
    f0 = md.add_verts(front)
    b0 = md.add_verts(back)

    def idx(base, i, j):
        return base + j * (nx + 1) + i
    for j in range(ny):
        for i in range(nx):
            md.add_face((idx(f0, i, j), idx(f0, i + 1, j), idx(f0, i + 1, j + 1), idx(f0, i, j + 1)))
            md.add_face((idx(b0, i, j), idx(b0, i, j + 1), idx(b0, i + 1, j + 1), idx(b0, i + 1, j)))
    edge = ([(i, 0) for i in range(nx)] + [(nx, j) for j in range(ny)]
            + [(i, ny) for i in range(nx, 0, -1)] + [(0, j) for j in range(ny, 0, -1)])
    for k, (i, j) in enumerate(edge):
        i2, j2 = edge[(k + 1) % len(edge)]
        md.add_face((idx(f0, i, j), idx(b0, i, j), idx(b0, i2, j2), idx(f0, i2, j2)))
    return md.orient_outward()


def build_front_details(col, torso, M):
    # kangaroo pocket
    def pocket(u, v):
        z = lerp(0.612, 0.718, v)
        half = lerp(0.098, 0.064, v)
        return lerp(-half, half, u), z
    pocket_obj = sc.to_object(slab(torso, pocket, 10, 5, lift=0.0022, depth=0.0045), 'DEV_Hoodie_Pocket',
                              col, [M['hoodie']], smooth=True)
    sc.add_bevel(pocket_obj, 0.0015, 2)

    # logo: the orange ">" chevron, centred on the chest
    s = 0.110
    A, B, C = Vector((-0.30 * s, 0.5 * s)), Vector((0.30 * s, 0.0)), Vector((-0.30 * s, -0.5 * s))
    t = 0.21 * s

    def nrm(a, b):
        d = (b - a).normalized()
        return Vector((-d.y, d.x))
    n1, n2 = nrm(A, B), nrm(B, C)
    bis_out = (n1 + n2).normalized()
    miter = (t / 2) / max(0.2, bis_out.dot(n1))
    quads = [(A + n1 * t / 2, B + bis_out * miter, B - bis_out * miter, A - n1 * t / 2),
             (B + bis_out * miter, C + n2 * t / 2, C - n2 * t / 2, B - bis_out * miter)]
    logo_md = geo.MeshData()
    LZ = 0.832
    for q in quads:
        def fn(u, v, q=q):
            top = q[0].lerp(q[1], u)
            bot = q[3].lerp(q[2], u)
            p2 = top.lerp(bot, v)
            return p2.x, LZ + p2.y
        logo_md.extend(slab(torso, fn, 6, 2, lift=0.0026, depth=0.0045))
    logo = sc.to_object(logo_md, 'DEV_Logo', col, [M['logo']], smooth=False)
    sc.add_bevel(logo, 0.0012, 2)

    # drawstrings with aglets
    strings = geo.MeshData()
    aglets = geo.MeshData()
    for side in (1, -1):
        pts = []
        for k, z in enumerate((1.000, 0.982, 0.962, 0.942, 0.922, 0.905)):
            x = side * (0.024 + 0.0042 * k)
            hit, n = sc.surface_y(torso, x, z)
            pts.append(Vector((x, hit.y - 0.011, z)))
        pts = geo.resample(pts, 12)
        strings.extend(geo.tube(pts, 0.0042, count=8, up_hint=(0, -1, 0), cap_start='flat', cap_end='round'))
        end, prev = pts[-1], pts[-2]
        d = (end - prev).normalized()
        apts = [end - d * 0.002, end + d * 0.008, end + d * 0.020]
        aglets.extend(geo.tube(apts, 0.0052, count=10, up_hint=(0, -1, 0), cap_start='flat', cap_end='round'))
    str_obj = sc.to_object(strings, 'DEV_Hoodie_Drawstrings', col, [M['string']], subsurf=(1, 2))
    agl_obj = sc.to_object(aglets, 'DEV_Hoodie_Aglets', col, [M['aglet']], subsurf=(1, 1))
    return pocket_obj, logo, str_obj, agl_obj


# ---------------------------------------------------------------- hands

FINGERS = [  # x at knuckle, splay, phalanx lengths, radius
    (0.0255, 7.0, (0.027, 0.017, 0.014), 0.0098),
    (0.0085, 1.0, (0.029, 0.019, 0.015), 0.0103),
    (-0.0085, -4.0, (0.027, 0.017, 0.014), 0.0098),
    (-0.0245, -10.0, (0.021, 0.014, 0.012), 0.0088),
]
HAND_POSES = {   # per-finger joint curls (deg), thumb curls, splay scale
    'relaxed': ([(10, 14, 8), (14, 16, 10), (18, 18, 12), (22, 20, 12)], (8, 12), 1.0),
    'fist': ([(88, 100, 62), (90, 100, 62), (92, 100, 62), (94, 100, 62)], (38, 48), 0.6),
    'point': ([(2, 3, 0), (90, 100, 62), (92, 100, 62), (94, 100, 62)], (34, 44), 0.6),
    'open': ([(0, 2, 0), (0, 2, 0), (0, 2, 0), (0, 2, 0)], (-6, 0), 1.7),
}
KNUCKLE_Y = 0.080


def hand_mesh(pose):
    """Left hand in bone space: +Y fingers, +Z back of hand, +X thumb side."""
    curls, thumb_curls, splay_k = HAND_POSES[pose]
    md = geo.MeshData()
    palm = geo.rounded_box((0.036, 0.042, 0.0158), res=6, roundness=0.6)
    for v in palm.verts:
        v.x *= lerp(0.84, 1.0, smoothstep(-0.042, 0.03, v.y))
        v.z *= lerp(1.0, 0.85, smoothstep(0.0, 0.042, v.y))
        v.y += 0.040
    md.extend(palm.orient_outward())
    wrist = geo.tube([Vector((0, -0.030, 0)), Vector((0, -0.010, 0)), Vector((0, 0.010, 0))],
                     0.0225, count=14, up_hint=(0, 0, 1), ratio=0.72)
    md.extend(wrist)
    for (x0, splay, lengths, r), curl in zip(FINGERS, curls):
        d = Vector((math.sin(rad(splay * splay_k)), math.cos(rad(splay * splay_k)), 0.0))
        axis = d.cross(Vector((0, 0, -1))).normalized()
        p = Vector((x0, KNUCKLE_Y - 0.018, 0.002))
        pts = [p.copy()]
        p = p + d * 0.018
        pts.append(p.copy())
        for L, c in zip(lengths, curl):
            d = (Matrix.Rotation(rad(c), 3, axis) @ d).normalized()
            for k in (1, 2):
                pts.append(p + d * (L * k / 2))
            p = p + d * L
        md.extend(geo.tube(pts, lambda t, r=r: r * (1.0 - 0.16 * t), count=10, up_hint=(0, 0, 1),
                           ratio=0.9, cap_start='flat', cap_end='round'))
    # thumb
    d = Vector((0.62, 0.66, -0.42)).normalized()
    axis = d.cross(Vector((-0.55, 0.15, -1.0)).normalized()).normalized()
    p = Vector((0.016, 0.010, -0.006))
    pts = [p.copy()]
    p = p + d * 0.022
    pts.append(p.copy())
    for L, c in zip((0.026, 0.021), thumb_curls):
        d = (Matrix.Rotation(rad(c), 3, axis) @ d).normalized()
        for k in (1, 2):
            pts.append(p + d * (L * k / 2))
        p = p + d * L
    md.extend(geo.tube(pts, lambda t: 0.0122 * (1.0 - 0.12 * t), count=10, up_hint=(0, 0, 1),
                       ratio=0.88, cap_start='flat', cap_end='round'))
    return md


# ---------------------------------------------------------------- pants & shoes

PELVIS = [(0.470, 0.060, 0.050, 0.050), (0.500, 0.115, 0.085, 0.090), (0.540, 0.145, 0.100, 0.105),
          (0.600, 0.152, 0.106, 0.112), (0.665, 0.144, 0.102, 0.108)]
LEG_R = [(0.0, 0.070), (0.12, 0.077), (0.35, 0.071), (0.60, 0.062), (0.75, 0.059), (0.88, 0.056),
         (0.95, 0.054), (1.0, 0.049)]


def build_pants(col, M):
    md = geo.loft([geo.section(z, a, bf, bb, 24, 2.4) for z, a, bf, bb in PELVIS], cap_start='pole')
    cuffs = geo.MeshData()
    for s in (1, -1):
        H, K, A, _ = leg_points(s)
        pts = geo.resample([H + Vector((0, 0, 0.050)), H, K, A + Vector((0, 0, 0.036))], 20)

        def radius(t):
            r = _interp(t, LEG_R)
            return r * (1.0 + 0.05 * math.sin(t * 46.0) * smoothstep(0.74, 0.95, t))
        md.extend(geo.tube(pts, radius, count=18, up_hint=(0, -1, 0)))
        cuffs.extend(band(A + Vector((0, 0, 0.050)), A + Vector((0, 0, 0.012)), 0.050, 0.038, count=18,
                          up=(0, -1, 0)))
    pants = sc.to_object(md, 'DEV_Pants', col, [M['pants']], subsurf=(1, 2))
    cuff_obj = sc.to_object(cuffs, 'DEV_Pants_Cuffs', col, [M['pants_rib']], subsurf=(1, 2))
    return pants, cuff_obj


SHOE_UPPER = [  # y, half width, z bottom, z top
    (0.074, 0.018, 0.032, 0.084), (0.066, 0.036, 0.024, 0.104), (0.042, 0.046, 0.020, 0.112),
    (0.006, 0.050, 0.020, 0.104), (-0.034, 0.054, 0.020, 0.090), (-0.074, 0.056, 0.020, 0.075),
    (-0.104, 0.053, 0.022, 0.063), (-0.127, 0.045, 0.026, 0.054), (-0.141, 0.030, 0.031, 0.047),
]
SHOE_SOLE = [
    (0.080, 0.024, 0.003, 0.026), (0.072, 0.043, 0.000, 0.029), (0.040, 0.053, 0.000, 0.030),
    (0.000, 0.057, 0.000, 0.030), (-0.040, 0.061, 0.000, 0.030), (-0.080, 0.063, 0.000, 0.031),
    (-0.110, 0.060, 0.004, 0.032), (-0.134, 0.051, 0.011, 0.035), (-0.151, 0.034, 0.018, 0.037),
]


def shoe_part(table, exponent):
    rings = []
    for y, a, zb, zt in table:
        c = Vector((0.0, y, (zb + zt) / 2))
        rings.append(geo.ring_points(c, Vector((0, 0, 1)), Vector((-1, 0, 0)), (zt - zb) / 2, a, 20, exponent))
    return geo.loft(rings, cap_start='pole', cap_end='pole').orient_outward()


def build_shoes(col, M):
    shoes = []
    for s, side in ((1, 'L'), (-1, 'R')):
        _, _, A, _ = leg_points(s)
        upper = shoe_part(SHOE_UPPER, 3.0)
        for i in range(len(upper.faces)):
            c = upper.face_center(i)
            if c.y > 0.046 and c.z > 0.07:
                upper.mats[i] = 2                       # orange heel tab
            elif abs(c.x) < 0.030 and -0.085 < c.y < 0.030 and c.z > 0.080:
                upper.mats[i] = 1                       # tongue / laces
        sole = shoe_part(SHOE_SOLE, 4.0)
        md = geo.MeshData().extend(upper)
        md.extend(sole, mat=3)
        md.transform(Matrix.Translation((A.x, A.y, 0.0)))
        obj = sc.to_object(md, f'DEV_Shoe.{side}', col, [M['shoe'], M['shoe_dark'], M['shoe_accent'], M['sole']],
                           subsurf=(1, 2))
        shoes.append(obj)
    return shoes


# ---------------------------------------------------------------- rig

BODY_TORSO = ['hips', 'spine', 'chest', 'neck', 'shoulder.L', 'shoulder.R']
FACE_SLIDERS = ['mouth_smile', 'mouth_grin', 'mouth_open', 'mouth_o', 'mouth_frown', 'mouth_wobble',
                'mouth_smirk_L', 'mouth_smirk_R', 'blink_L', 'blink_R']
HAND_SLIDERS = ['fist', 'point', 'open']


def dorsal(d, side):
    out = Vector((side, 0.0, 0.0))
    v = out - d * out.dot(d)
    return v.normalized()


def build_rig(col, face):
    B = rig.BoneSpec
    specs = [
        B('root', (0, 0, 0), (0, 0.30, 0), deform=False, z_axis=(0, 0, 1)),
        B('hips', (0, 0.004, 0.560), (0, 0.004, 0.660), parent='root'),
        B('spine', (0, 0.004, 0.660), (0, 0.004, 0.800), parent='hips', connect=True),
        B('chest', (0, 0.004, 0.800), (0, 0.006, 0.975), parent='spine', connect=True),
        B('neck', (0, 0.006, 0.975), (0, 0.004, 1.100), parent='chest', connect=True),
        B('head', (0, 0.004, 1.100), (0, 0.004, 1.460), parent='neck', connect=True),
    ]
    for s, side in ((1, 'L'), (-1, 'R')):
        S, E, W, Ht, d, d2 = arm_points(s)
        H, K, A, T = leg_points(s)
        specs += [
            B(f'shoulder.{side}', (0.028 * s, 0.004, 0.975), S, parent='chest', z_axis=(0, 0, 1)),
            B(f'upper_arm.{side}', S, E, parent=f'shoulder.{side}', connect=True, z_axis=dorsal(d, s)),
            B(f'forearm.{side}', E, W, parent=f'upper_arm.{side}', connect=True, z_axis=dorsal(d2, s)),
            B(f'hand.{side}', W, Ht, parent=f'forearm.{side}', connect=True, z_axis=dorsal(d2, s)),
            B(f'thigh.{side}', H, K, parent='hips'),
            B(f'shin.{side}', K, A, parent=f'thigh.{side}', connect=True),
            B(f'foot.{side}', A, T, parent=f'shin.{side}', connect=True, z_axis=(0, 0, 1)),
            B(f'toe.{side}', T, T + Vector((0, -0.045, 0)), parent=f'foot.{side}', connect=True, z_axis=(0, 0, 1)),
        ]
        ec = face[f'eye_center.{side}']
        bc = face[f'brow_center.{side}']
        specs += [
            B(f'eye.{side}', ec, ec + Vector((0, -0.05, 0)), parent='head', deform=False, coll='Mechanism',
              z_axis=(0, 0, 1)),
            B(f'lid_upper.{side}', ec, ec + Vector((0, 0, 0.042)), parent='head', deform=False, coll='Face',
              rot_mode='XYZ'),
            B(f'lid_upper_blink.{side}', ec, ec + Vector((0, 0, 0.034)), parent=f'lid_upper.{side}',
              deform=False, coll='Mechanism', rot_mode='XYZ'),
            B(f'lid_lower.{side}', ec, ec + Vector((0, 0, -0.036)), parent='head', deform=False, coll='Face',
              rot_mode='XYZ'),
            B(f'brow.{side}', bc, bc + Vector((0, 0, 0.026)), parent='head', deform=False, coll='Face',
              rot_mode='XYZ'),
        ]
    specs += [
        B('eye_target', (0, -0.85, EYE_Z), (0, -0.85, EYE_Z + 0.06), parent='head', deform=False, coll='Face'),
        B('face', (0, -0.30, HEAD_C.z - 0.14), (0, -0.30, HEAD_C.z - 0.10), parent='head', deform=False,
          coll='Face'),
    ]
    arm = rig.build_armature('DEV_Rig', col, specs)
    for side in ('L', 'R'):
        c = arm.pose.bones[f'eye.{side}'].constraints.new('DAMPED_TRACK')
        c.target = arm
        c.subtarget = 'eye_target'
        c.track_axis = 'TRACK_Y'
    for name in FACE_SLIDERS:
        rig.add_slider(arm, 'face', name, desc='Face shape (0-1)')
    for side in ('L', 'R'):
        for name in HAND_SLIDERS:
            rig.add_slider(arm, f'hand.{side}', name, desc='Hand shape (0-1)')
        rig.drive(arm.pose.bones[f'lid_upper_blink.{side}'], 'rotation_euler', 0, arm, 'face',
                  f'blink_{side}', 'var * 1.22')
    return arm


def widgets(arm, col):
    shapes = {
        'root': ('circle', 1.4), 'hips': ('circle', 1.9), 'chest': ('circle', 1.25), 'head': ('circle', 0.62),
        'neck': ('circle', 0.35), 'face': ('square', 0.6), 'eye_target': ('cross', 0.7),
        'spine': ('circle', 1.3),
    }
    for side in ('L', 'R'):
        shapes.update({f'hand.{side}': ('circle', 0.5), f'brow.{side}': ('square', 0.45),
                       f'lid_upper.{side}': ('circle', 0.5), f'lid_lower.{side}': ('circle', 0.5)})
    for bone, (kind, size) in shapes.items():
        w = rig.widget(f'WGT_{bone}', col, kind, size)
        arm.pose.bones[bone].custom_shape = w
    col.hide_viewport = True
    col.hide_render = True


def bind(arm):
    rig_bones = {
        'DEV_Head': 'head', 'DEV_Ear.L': 'head', 'DEV_Ear.R': 'head', 'DEV_Hair_Cap': 'head',
        'DEV_Hair_Locks': 'head', 'DEV_Mouth': 'head',
        'DEV_Eye.L': 'eye.L', 'DEV_Eye.R': 'eye.R',
        'DEV_Lid_Upper.L': 'lid_upper_blink.L', 'DEV_Lid_Upper.R': 'lid_upper_blink.R',
        'DEV_Lid_Lower.L': 'lid_lower.L', 'DEV_Lid_Lower.R': 'lid_lower.R',
        'DEV_Brow.L': 'brow.L', 'DEV_Brow.R': 'brow.R',
        'DEV_Hand.L': 'hand.L', 'DEV_Hand.R': 'hand.R',
        'DEV_Shoe.L': 'foot.L', 'DEV_Shoe.R': 'foot.R',
    }
    for name, bone in rig_bones.items():
        rig.parent_to_bone(bpy.data.objects[name], arm, bone)
    torso_like = ['DEV_Hoodie_Body', 'DEV_Hoodie_Hood', 'DEV_Hoodie_Pocket', 'DEV_Logo',
                  'DEV_Hoodie_Drawstrings', 'DEV_Hoodie_Aglets']
    for name in torso_like:
        rig.skin(bpy.data.objects[name], arm, BODY_TORSO, beta=0.022)
    rig.skin(bpy.data.objects['DEV_Hoodie_Waistband'], arm, ['hips', 'spine'], beta=0.03)
    rig.skin(bpy.data.objects['DEV_Neck'], arm, ['chest', 'neck', 'head'], beta=0.02)
    for side in ('L', 'R'):
        chain = [f'shoulder.{side}', f'upper_arm.{side}', f'forearm.{side}', f'hand.{side}']
        rig.skin(bpy.data.objects[f'DEV_Hoodie_Sleeve.{side}'], arm, chain, beta=0.016)
        rig.skin(bpy.data.objects[f'DEV_Hoodie_Cuff.{side}'], arm, chain[2:], beta=0.016)
    legs = ['hips', 'thigh.L', 'shin.L', 'foot.L', 'thigh.R', 'shin.R', 'foot.R']
    rig.skin(bpy.data.objects['DEV_Pants'], arm, legs, beta=0.016)
    rig.skin(bpy.data.objects['DEV_Pants_Cuffs'], arm, legs, beta=0.016)

    # mouth shapes and hand shapes follow the sliders
    keys = bpy.data.objects['DEV_Mouth'].data.shape_keys.key_blocks
    for slider, key in (('mouth_smile', 'M_Smile'), ('mouth_grin', 'M_Grin'), ('mouth_open', 'M_Open'),
                        ('mouth_o', 'M_O'), ('mouth_frown', 'M_Frown'), ('mouth_wobble', 'M_Wobble'),
                        ('mouth_smirk_L', 'M_Smirk_L'), ('mouth_smirk_R', 'M_Smirk_R')):
        rig.drive(keys[key], 'value', None, arm, 'face', slider)
    for side in ('L', 'R'):
        hk = bpy.data.objects[f'DEV_Hand.{side}'].data.shape_keys.key_blocks
        for slider, key in (('fist', 'H_Fist'), ('point', 'H_Point'), ('open', 'H_Open')):
            rig.drive(hk[key], 'value', None, arm, f'hand.{side}', slider)


def build_hands(col, arm_points_by_side, M):
    hands = {}
    for s, side in ((1, 'L'), (-1, 'R')):
        S, E, W, Ht, d, d2 = arm_points_by_side[s]
        frame = geo.frame_matrix(W, d2, dorsal(d2, s))
        meshes = {k: hand_mesh(k) for k in HAND_POSES}
        if s < 0:
            meshes = {k: geo.mirrored_x(v) for k, v in meshes.items()}
        obj = sc.to_object(meshes['relaxed'], f'DEV_Hand.{side}', col, [M['skin']], subsurf=(1, 2), matrix=frame)
        obj.shape_key_add(name='Basis', from_mix=False)
        for key, src in (('H_Fist', 'fist'), ('H_Point', 'point'), ('H_Open', 'open')):
            kb = obj.shape_key_add(name=key, from_mix=False)
            kb.data.foreach_set('co', [c for v in meshes[src].verts for c in v])
        hands[side] = obj
    return hands


# ---------------------------------------------------------------- poses & expressions

EXPRESSIONS = {
    'Neutral': {},
    'Happy': {'sliders': {'mouth_grin': 1.0}, 'lid_up': -4, 'lid_lo': 16, 'brow_lift': 0.006, 'brow_tilt': -6},
    'Awkward': {'sliders': {'mouth_wobble': 1.0, 'mouth_smirk_R': 0.35}, 'lid_up': 18, 'lid_lo': 6,
                'brow_lift': 0.005, 'brow_tilt': -15, 'look': (0.26, -0.16)},
    'Surprised': {'sliders': {'mouth_o': 1.0, 'mouth_open': 0.25}, 'lid_up': -10, 'lid_lo': -4,
                  'brow_lift': 0.016, 'brow_tilt': -3},
    'Determined': {'sliders': {'mouth_smirk_L': 0.9, 'mouth_smile': 0.15}, 'lid_up': 12, 'lid_lo': 10,
                   'brow_lift': -0.008, 'brow_tilt': 19},
}


def apply_expression(arm, name):
    e = EXPRESSIONS[name]
    pb = arm.pose.bones
    for k, v in e.get('sliders', {}).items():
        pb['face'][k] = v
    for side, s in (('L', 1), ('R', -1)):
        pb[f'lid_upper.{side}'].rotation_euler = (rad(e.get('lid_up', 0)), 0, 0)
        pb[f'lid_lower.{side}'].rotation_euler = (rad(e.get('lid_lo', 0)), 0, 0)
        pb[f'brow.{side}'].location = (0, e.get('brow_lift', 0.0), 0)
        pb[f'brow.{side}'].rotation_euler = (0, 0, rad(e.get('brow_tilt', 0)) * s)
    lx, lz = e.get('look', (0.0, 0.0))
    pb['eye_target'].location = (lx, lz, 0)
    rig.update()


def plant_legs(arm, sway=(0.0, 0.0, 0.0), hip_roll=0.0):
    """Shift/tilt the hips, then re-solve both legs so the feet stay planted."""
    feet = {}
    for side in ('L', 'R'):
        feet[side] = (rig.pose_head(arm, f'foot.{side}'), rig.pose_head(arm, f'toe.{side}'))
    pb = arm.pose.bones['hips']
    pb.location = arm.data.bones['hips'].matrix_local.to_3x3().inverted() @ Vector(sway)
    rig.update()
    if hip_roll:
        rig.rotate_world(arm, 'hips', (0, 1, 0), hip_roll)
    for side in ('L', 'R'):
        H = rig.pose_head(arm, f'thigh.{side}')
        A, T = feet[side]
        lt = arm.data.bones[f'thigh.{side}'].length
        ls = arm.data.bones[f'shin.{side}'].length
        knee, end = rig.two_bone(H, A, lt, ls, H + Vector((0, -0.6, -0.2)))
        rig.aim(arm, f'thigh.{side}', knee - H, (0, -1, 0))
        rig.aim(arm, f'shin.{side}', end - knee, (0, -1, 0))
        rig.aim(arm, f'foot.{side}', T - rig.pose_head(arm, f'foot.{side}'), (0, 0, 1))


def place_arm(arm, side, wrist, pole, hand_dir, hand_dorsal):
    S = rig.pose_head(arm, f'upper_arm.{side}')
    l1 = arm.data.bones[f'upper_arm.{side}'].length
    l2 = arm.data.bones[f'forearm.{side}'].length
    elbow, end = rig.two_bone(S, wrist, l1, l2, pole)
    s = 1 if side == 'L' else -1
    d1, d2 = (elbow - S).normalized(), (end - elbow).normalized()
    rig.aim(arm, f'upper_arm.{side}', d1, dorsal(d1, s) + Vector((0, 0, 0.3)))
    rig.aim(arm, f'forearm.{side}', d2, Vector(hand_dorsal))
    rig.aim(arm, f'hand.{side}', Vector(hand_dir), Vector(hand_dorsal))


def pose_wave(arm):
    plant_legs(arm, (0.018, 0.0, -0.006), hip_roll=-3)
    rig.rotate_world(arm, 'spine', (0, 1, 0), 3)
    rig.rotate_world(arm, 'chest', (0, 0, 1), -6)
    rig.rotate_world(arm, 'shoulder.R', (0, 1, 0), 14)
    place_arm(arm, 'R', Vector((-0.33, -0.07, 1.25)), Vector((-0.65, 0.10, 0.85)),
              (-0.10, -0.08, 1.0), (0.10, 1.0, 0.1))
    place_arm(arm, 'L', Vector((0.235, -0.015, 0.615)), Vector((0.32, 0.30, 0.80)),
              (0.30, -0.05, -1.0), (1.0, 0.0, 0.25))
    rig.rotate_world(arm, 'head', (0, 1, 0), 7)
    rig.rotate_world(arm, 'head', (1, 0, 0), -3)
    arm.pose.bones['hand.R']['open'] = 1.0
    arm.pose.bones['hand.L']['fist'] = 0.15


def pose_scratch(arm):
    plant_legs(arm, (-0.012, 0.0, -0.004), hip_roll=2)
    rig.rotate_world(arm, 'chest', (0, 1, 0), 4)
    rig.rotate_world(arm, 'shoulder.R', (0, 1, 0), 18)
    place_arm(arm, 'R', Vector((-0.205, 0.075, 1.285)), Vector((-0.65, -0.20, 1.20)),
              (0.30, 0.35, 0.90), (-1.0, 0.1, 0.2))
    place_arm(arm, 'L', Vector((0.215, 0.0, 0.62)), Vector((0.30, 0.30, 0.80)),
              (0.20, 0.0, -1.0), (1.0, 0.0, 0.2))
    rig.rotate_world(arm, 'head', (0, 1, 0), -9)
    rig.rotate_world(arm, 'head', (1, 0, 0), 6)
    arm.pose.bones['hand.R']['fist'] = 0.35
    arm.pose.bones['hand.L']['fist'] = 0.2


def pose_think(arm):
    plant_legs(arm, (0.010, 0.0, -0.004), hip_roll=-2)
    rig.rotate_world(arm, 'chest', (0, 0, 1), 5)
    place_arm(arm, 'R', Vector((-0.035, -0.175, 1.055)), Vector((-0.22, -0.30, 0.70)),
              (0.08, 0.10, 1.0), (0.0, -1.0, 0.0))
    place_arm(arm, 'L', Vector((-0.09, -0.175, 0.80)), Vector((0.40, -0.15, 0.70)),
              (-1.0, 0.0, 0.10), (0.0, -0.3, -1.0))
    rig.rotate_world(arm, 'head', (0, 1, 0), 8)
    rig.rotate_world(arm, 'head', (1, 0, 0), -6)
    arm.pose.bones['hand.R']['fist'] = 0.75
    arm.pose.bones['hand.L']['fist'] = 0.25
    arm.pose.bones['eye_target'].location = (-0.20, 0.22, 0)


POSES = {'Rest': None, 'Wave': pose_wave, 'HeadScratch': pose_scratch, 'Thinking': pose_think}


def set_look(arm, name, body):
    rig.reset_pose(arm)
    if body and POSES.get(body):
        POSES[body](arm)
    look = arm.pose.bones['eye_target'].location.copy()
    apply_expression(arm, name)
    if body == 'Thinking' and name != 'Awkward':
        arm.pose.bones['eye_target'].location = look
    rig.update()


def store_library(arm):
    body = [b.name for b in arm.data.bones if b.collections.get('Body')]
    face = [b.name for b in arm.data.bones if b.collections.get('Face')]
    actions = []
    for pose in POSES:
        rig.reset_pose(arm)
        if POSES[pose]:
            POSES[pose](arm)
        props = [(f'hand.{s}', h) for s in ('L', 'R') for h in HAND_SLIDERS]
        actions.append(rig.store_action(arm, f'DEV_Pose_{pose}', body, props))
    for expr in EXPRESSIONS:
        rig.reset_pose(arm)
        apply_expression(arm, expr)
        props = [('face', f) for f in FACE_SLIDERS]
        actions.append(rig.store_action(arm, f'DEV_Expr_{expr}', face, props))
    rig.reset_pose(arm)
    return actions


# ---------------------------------------------------------------- studio

def build_studio(scn):
    return studio.standard_set(scn, HEAD_C.z)


# ---------------------------------------------------------------- main

def build():
    scn = sc.reset()
    M = make_materials()
    root = sc.collection('DEV_Developer')
    c_body = sc.collection('DEV_Body', root)
    c_face = sc.collection('DEV_Face', root)
    c_cloth = sc.collection('DEV_Clothing', root)
    c_rig = sc.collection('DEV_Rig', root)
    c_wgt = sc.collection('DEV_Widgets', root)

    head = build_head(c_body, M)
    face = build_face(c_face, head, M)
    build_hair(c_body, M)
    torso, *_ = build_hoodie(c_cloth, M)
    build_front_details(c_cloth, torso, M)
    build_pants(c_cloth, M)
    build_shoes(c_cloth, M)
    build_hands(c_body, {s: arm_points(s) for s in (1, -1)}, M)

    arm = build_rig(c_rig, face)
    widgets(arm, c_wgt)
    bind(arm)
    store_library(arm)
    cams = build_studio(scn)
    studio.setup_render(scn, samples=96, res=(1080, 1920))
    scn.frame_start, scn.frame_end = 1, 1
    rig.reset_pose(arm)
    return scn, arm, cams


GAZE = {'turn': (0.0, 0.0), 'face': (-0.21, 0.0), 'pose': (-0.40, 0.0), 'hero': (-0.32, -0.12)}


def render_set(scn, arm, cams, out_dir, mode):
    """preview: turnaround + two faces (fast). check: everything, half size. review: everything, full."""
    rdir = os.path.join(out_dir, 'renders')
    os.makedirs(rdir, exist_ok=True)
    spp = {'preview': 24, 'check': 24, 'review': 80}[mode]
    k = 1.0 if mode == 'review' else 0.5

    def r(cam, name, res, look='Neutral', body=None, turn=0.0):
        set_look(arm, look, body)
        if look != 'Awkward' and body != 'Thinking':
            gx, gz = GAZE[cam]
            arm.pose.bones['eye_target'].location.x += gx
            arm.pose.bones['eye_target'].location.y += gz
            rig.update()
        arm.rotation_euler = (0.0, 0.0, rad(turn))      # turntable: same camera and lights for every view
        path = os.path.join(rdir, f'{name}.png')
        t0 = time.time()
        studio.render(scn, cams[cam], path, (int(res[0] * k), int(res[1] * k)), spp)
        arm.rotation_euler = (0.0, 0.0, 0.0)
        print(f'[render] {name} {time.time() - t0:.1f}s', flush=True)
        return path

    views = (('front', 0.0), ('three_quarter', 40.0), ('side', 90.0), ('back', 180.0))
    turn = [r('turn', f'dev_turn_{v}', (720, 1080), turn=a) for v, a in views]
    studio.contact_sheet(turn, 4, os.path.join(rdir, 'sheet_turnaround.png'))
    if mode == 'preview':
        r('face', 'dev_face_neutral', (640, 640))
        r('face', 'dev_face_happy', (640, 640), 'Happy')
        return
    exprs = [r('face', f'dev_expr_{e.lower()}', (640, 640), e) for e in EXPRESSIONS]
    studio.contact_sheet(exprs, 5, os.path.join(rdir, 'sheet_expressions.png'))
    poses = [r('pose', f'dev_pose_{p.lower()}', (720, 1080), e, p)
             for p, e in (('Wave', 'Happy'), ('HeadScratch', 'Awkward'), ('Thinking', 'Determined'))]
    studio.contact_sheet(poses, 3, os.path.join(rdir, 'sheet_poses.png'))
    r('hero', 'dev_hero_9x16', (1080, 1920), 'Happy', 'Wave')
    set_look(arm, 'Neutral', None)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument('--render', choices=('none', 'preview', 'check', 'review'), default='none')
    ap.add_argument('--out', default=os.path.normpath(os.path.join(HERE, '..', 'characters', 'developer')))
    ap.add_argument('--no-save', action='store_true')
    args = ap.parse_args(argv)
    t0 = time.time()
    scn, arm, cams = build()
    print(f'[build] done in {time.time() - t0:.1f}s', flush=True)
    os.makedirs(args.out, exist_ok=True)
    if not args.no_save:
        path = os.path.join(args.out, f'BWM_Developer_{VERSION}.blend')
        bpy.ops.wm.save_as_mainfile(filepath=path, compress=True)
        print(f'[save] {path}', flush=True)
    if args.render != 'none':
        render_set(scn, arm, cams, args.out, args.render)


if __name__ == '__main__':
    main()
