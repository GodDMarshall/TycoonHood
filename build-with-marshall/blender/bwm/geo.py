"""Geometry builders.

Pure math on mathutils vectors, no bpy: every builder returns a MeshData
(verts, quad/tri faces, per-corner UVs, per-face material slot) that
scene.to_object() turns into a Blender mesh. Keeping geometry out of bpy
makes every shape deterministic and easy to re-tune from the build scripts.

Winding convention: a ring is a closed loop of points that runs
counter-clockwise when seen from the direction of travel (ring_points does
this for any right-handed frame), so loft() always produces outward normals.
"""

import math

from mathutils import Matrix, Vector

TAU = math.tau


def clamp(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))


def lerp(a, b, t):
    return a + (b - a) * t


def smoothstep(e0, e1, x):
    t = clamp((x - e0) / (e1 - e0))
    return t * t * (3.0 - 2.0 * t)


def sgnpow(v, p):
    return math.copysign(abs(v) ** p, v)


class MeshData:
    """Mesh under construction: verts, faces, per-corner UVs, material slots."""

    def __init__(self):
        self.verts = []
        self.faces = []
        self.uvs = []
        self.mats = []

    def add_verts(self, pts):
        start = len(self.verts)
        self.verts.extend(Vector(p) for p in pts)
        return start

    def add_face(self, idx, uv=None, mat=0):
        self.faces.append(tuple(idx))
        self.uvs.append(uv)
        self.mats.append(mat)

    def extend(self, other, mat=None):
        off = len(self.verts)
        self.verts.extend(v.copy() for v in other.verts)
        for f, uv, m in zip(other.faces, other.uvs, other.mats):
            self.add_face([i + off for i in f], uv, m if mat is None else mat)
        return self

    def flip(self):
        self.faces = [tuple(reversed(f)) for f in self.faces]
        self.uvs = [list(reversed(uv)) if uv else uv for uv in self.uvs]
        return self

    def transform(self, matrix):
        m = Matrix(matrix)
        for v in self.verts:
            v[:] = m @ v
        if m.to_3x3().determinant() < 0:
            self.flip()
        return self

    def copy(self):
        return MeshData().extend(self)

    def subset(self, keep_face):
        """New MeshData with only the faces where keep_face[i] is true (verts compacted)."""
        out = MeshData()
        remap = {}
        for f, uv, m, keep in zip(self.faces, self.uvs, self.mats, keep_face):
            if not keep:
                continue
            idx = []
            for i in f:
                if i not in remap:
                    remap[i] = out.add_verts([self.verts[i]])
                idx.append(remap[i])
            out.add_face(idx, uv, m)
        return out

    def face_center(self, i):
        f = self.faces[i]
        return sum((self.verts[k] for k in f), Vector()) / len(f)

    def signed_volume(self):
        vol = 0.0
        for f in self.faces:
            a = self.verts[f[0]]
            for i in range(1, len(f) - 1):
                vol += a.dot(self.verts[f[i]].cross(self.verts[f[i + 1]]))
        return vol / 6.0

    def orient_outward(self):
        """Flip a closed mesh whose faces point inward."""
        if self.signed_volume() < 0:
            self.flip()
        return self


def mirrored_x(md):
    return md.copy().transform(Matrix.Scale(-1.0, 4, Vector((1, 0, 0))))


# ---------------------------------------------------------------- rings / lofts

def ring_points(center, n_axis, b_axis, rx, ry, count, exponent=2.0, phase=0.0):
    """Closed superellipse loop. CCW seen from n_axis x b_axis (the travel direction)."""
    p = 2.0 / exponent
    pts = []
    for j in range(count):
        th = phase + TAU * j / count
        pts.append(center + n_axis * (rx * sgnpow(math.cos(th), p))
                   + b_axis * (ry * sgnpow(math.sin(th), p)))
    return pts


def section(z, a, bf, bb=None, count=24, exponent=2.5, cx=0.0, cy=0.0):
    """Horizontal body cross-section: half-width a, front depth bf, back depth bb.
    Point 0 is front-centre (-Y); travel direction is +Z."""
    bb = bf if bb is None else bb
    p = 2.0 / exponent
    pts = []
    for j in range(count):
        th = TAU * j / count
        s, c = math.sin(th), math.cos(th)
        b = bf if c >= 0 else bb
        pts.append(Vector((cx + a * sgnpow(s, p), cy - b * sgnpow(c, p), z)))
    return pts


def loft(rings, mat=0, cap_start=None, cap_end=None, wrap_rings=False, mats=None):
    """Quad skin through rings of equal length.

    cap_*: None for open, 'pole' for a fan to the ring centroid, or a Vector pole.
    wrap_rings joins the last ring back to the first (torus-like bands).
    mats: optional per-band material list (len = number of bands)."""
    md = MeshData()
    count = len(rings[0])
    starts = [md.add_verts(r) for r in rings]
    bands = len(rings) if wrap_rings else len(rings) - 1
    for i in range(bands):
        i1 = (i + 1) % len(rings)
        v0, v1 = i / bands, (i + 1) / bands
        band_mat = mats[i] if mats else mat
        for j in range(count):
            j1 = (j + 1) % count
            u0, u1 = j / count, (j + 1) / count
            md.add_face((starts[i] + j, starts[i] + j1, starts[i1] + j1, starts[i1] + j),
                        [(u0, v0), (u1, v0), (u1, v1), (u0, v1)], band_mat)

    def cap(ring_idx, spec, end):
        ring = rings[ring_idx]
        pole = sum(ring, Vector()) / count if spec == 'pole' else Vector(spec)
        pi = md.add_verts([pole])
        s = starts[ring_idx]
        cap_mat = (mats[-1] if end else mats[0]) if mats else mat
        for j in range(count):
            j1 = (j + 1) % count
            a = (math.cos(TAU * j / count) * 0.5 + 0.5, math.sin(TAU * j / count) * 0.5 + 0.5)
            b = (math.cos(TAU * j1 / count) * 0.5 + 0.5, math.sin(TAU * j1 / count) * 0.5 + 0.5)
            if end:
                md.add_face((pi, s + j, s + j1), [(0.5, 0.5), a, b], cap_mat)
            else:
                md.add_face((pi, s + j1, s + j), [(0.5, 0.5), b, a], cap_mat)

    if cap_start is not None:
        cap(0, cap_start, False)
    if cap_end is not None:
        cap(len(rings) - 1, cap_end, True)
    return md


# ---------------------------------------------------------------- paths / tubes

def bezier(p0, p1, p2, p3=None, samples=8):
    pts = []
    for i in range(samples):
        t = i / (samples - 1)
        if p3 is None:
            pts.append((1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t * t * p2)
        else:
            pts.append((1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1
                       + 3 * (1 - t) * t * t * p2 + t ** 3 * p3)
    return pts


def resample(points, samples):
    """Evenly re-space a polyline by arc length (Catmull-Rom smoothed)."""
    pts = [Vector(p) for p in points]
    dense = []
    for i in range(len(pts) - 1):
        p0 = pts[max(i - 1, 0)]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[min(i + 2, len(pts) - 1)]
        for k in range(12):
            t = k / 12
            t2, t3 = t * t, t * t * t
            dense.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                                + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    dense.append(pts[-1])
    lengths = [0.0]
    for i in range(1, len(dense)):
        lengths.append(lengths[-1] + (dense[i] - dense[i - 1]).length)
    total = lengths[-1]
    out, k = [], 0
    for s in range(samples):
        target = total * s / (samples - 1)
        while k < len(lengths) - 2 and lengths[k + 1] < target:
            k += 1
        seg = lengths[k + 1] - lengths[k]
        t = 0.0 if seg == 0 else (target - lengths[k]) / seg
        out.append(dense[k].lerp(dense[k + 1], clamp(t)))
    return out


def path_frames(points, up_hint):
    """Parallel-transport frames (T, N, B) along a polyline; N starts toward up_hint."""
    n = len(points)
    tangents = []
    for i in range(n):
        a = points[max(i - 1, 0)]
        b = points[min(i + 1, n - 1)]
        tangents.append((b - a).normalized())
    up = Vector(up_hint)
    t0 = tangents[0]
    n0 = up - t0 * up.dot(t0)
    if n0.length < 1e-6:
        n0 = t0.orthogonal()
    n0.normalize()
    frames = [(t0, n0, t0.cross(n0))]
    for i in range(1, n):
        t_prev, n_prev, _ = frames[-1]
        q = t_prev.rotation_difference(tangents[i])
        ni = q @ n_prev
        ni = (ni - tangents[i] * ni.dot(tangents[i])).normalized()
        frames.append((tangents[i], ni, tangents[i].cross(ni)))
    return frames


def tube(points, radius, count=12, up_hint=(0, 0, 1), ratio=1.0, exponent=2.0,
         cap_start=None, cap_end=None, cap_rings=3, twist=0.0, mat=0, mats=None):
    """Loft a cross-section along a path.

    radius / ratio may be numbers or functions of t in [0, 1]. The section's
    first axis (N, starts toward up_hint) gets radius*ratio, the second gets radius.
    cap_*: None, 'flat' (fan) or 'round' (hemispherical rings + pole)."""
    rad = radius if callable(radius) else (lambda t, r=radius: r)
    rat = ratio if callable(ratio) else (lambda t, r=ratio: r)
    frames = path_frames(points, up_hint)
    last = len(points) - 1
    rings, info = [], []
    for i, (p, (t_ax, n_ax, b_ax)) in enumerate(zip(points, frames)):
        t = i / last
        ang = twist * t
        n2 = n_ax * math.cos(ang) + b_ax * math.sin(ang)
        b2 = t_ax.cross(n2)
        r = max(rad(t), 1e-5)
        rings.append(ring_points(p, n2, b2, r * rat(t), r, count, exponent))
        info.append((p, t_ax, n2, b2, r, rat(t)))

    def round_rings(idx, sign):
        p, t_ax, n_ax, b_ax, r, ra = info[idx]
        extra = []
        for k in range(1, cap_rings + 1):
            phi = (math.pi / 2) * k / (cap_rings + 1)
            c = p + t_ax * (sign * r * math.sin(phi))
            extra.append(ring_points(c, n_ax, b_ax, r * ra * math.cos(phi), r * math.cos(phi),
                                     count, exponent))
        return extra, p + t_ax * (sign * r)

    cs = ce = None
    if cap_start == 'round':
        extra, cs = round_rings(0, -1.0)
        rings = list(reversed(extra)) + rings
        if mats:
            mats = [mats[0]] * len(extra) + list(mats)
    elif cap_start == 'flat':
        cs = 'pole'
    if cap_end == 'round':
        extra, ce = round_rings(last, 1.0)
        rings = rings + extra
        if mats:
            mats = list(mats) + [mats[-1]] * len(extra)
    elif cap_end == 'flat':
        ce = 'pole'
    return loft(rings, mat=mat, cap_start=cs, cap_end=ce, mats=mats)


# ---------------------------------------------------------------- spheres / lathes

_CUBE_FACES = (
    ((1, 0, 0), (0, 1, 0), (0, 0, 1)),
    ((-1, 0, 0), (0, 0, 1), (0, 1, 0)),
    ((0, 1, 0), (0, 0, 1), (1, 0, 0)),
    ((0, -1, 0), (1, 0, 0), (0, 0, 1)),
    ((0, 0, 1), (1, 0, 0), (0, 1, 0)),
    ((0, 0, -1), (0, 1, 0), (1, 0, 0)),
)


def quad_sphere(res=16):
    """All-quad sphere (spherified cube). Verts are unit directions; shape them afterwards."""
    md = MeshData()
    lookup = {}
    grid = [math.tan((-1.0 + 2.0 * i / res) * math.pi / 4.0) for i in range(res + 1)]

    def vid(p):
        key = (round(p.x, 5), round(p.y, 5), round(p.z, 5))
        if key not in lookup:
            lookup[key] = md.add_verts([p.normalized()])
        return lookup[key]

    for n, u, v in _CUBE_FACES:
        n, u, v = Vector(n), Vector(u), Vector(v)
        ids = [[vid(n + u * grid[i] + v * grid[j]) for j in range(res + 1)] for i in range(res + 1)]
        for i in range(res):
            for j in range(res):
                md.add_face((ids[i][j], ids[i + 1][j], ids[i + 1][j + 1], ids[i][j + 1]))
    return md


def shaped_sphere(res, shape_fn):
    """Quad sphere whose unit directions are mapped through shape_fn(dir) -> position."""
    md = quad_sphere(res)
    md.verts = [Vector(shape_fn(v.copy())) for v in md.verts]
    return md


def rounded_box(size, res=6, roundness=0.6):
    """Soft box from a quad sphere: size=(x, y, z) half extents, roundness 1=sphere, 0=box."""
    e = clamp(roundness, 0.05, 1.0)

    def shape(d):
        return Vector((size[0] * sgnpow(d.x, e), size[1] * sgnpow(d.y, e), size[2] * sgnpow(d.z, e)))
    return shaped_sphere(res, shape)


def lathe(profile, count=24, band_mats=None):
    """Revolve [(r, z), ...] around local +Z. r == 0 at either end becomes a pole.
    band_mats: optional material per profile segment. Call orient_outward() on closed results."""
    first_pole = profile[0][0] == 0.0
    last_pole = profile[-1][0] == 0.0
    body = profile[(1 if first_pole else 0):(len(profile) - 1 if last_pole else len(profile))]
    rings = []
    for r, z in body:
        rings.append([Vector((r * math.cos(TAU * j / count), r * math.sin(TAU * j / count), z))
                      for j in range(count)])
    mats = None
    if band_mats:
        inner = band_mats[(1 if first_pole else 0):(len(band_mats) - 1 if last_pole else len(band_mats))]
        mats = list(inner) if inner else [band_mats[0]]
        if len(rings) - 1 > len(mats):
            mats += [mats[-1]] * (len(rings) - 1 - len(mats))
    md = loft(rings, mats=mats,
              cap_start=Vector((0, 0, profile[0][1])) if first_pole else None,
              cap_end=Vector((0, 0, profile[-1][1])) if last_pole else None)
    if band_mats:
        # cap fans take the end bands' materials
        n_caps = (1 if first_pole else 0) + (1 if last_pole else 0)
        quads = len(md.faces) - count * n_caps
        if first_pole:
            for k in range(quads, quads + count):
                md.mats[k] = band_mats[0]
        if last_pole:
            for k in range(len(md.faces) - count, len(md.faces)):
                md.mats[k] = band_mats[-1]
    return md


def frame_matrix(origin, y_axis, z_hint):
    """4x4 matrix whose local Y points along y_axis and local Z leans toward z_hint."""
    y = Vector(y_axis).normalized()
    z = Vector(z_hint) - y * Vector(z_hint).dot(y)
    z.normalize()
    x = y.cross(z)
    m = Matrix((x, y, z)).transposed().to_4x4()
    m.translation = Vector(origin)
    return m
