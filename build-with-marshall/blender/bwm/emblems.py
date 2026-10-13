"""2D emblem outlines (unit size, centred on the origin) as lists of quads/tris in (x, z).

Each emblem is *inspired by* a public mark, not a copy of it:
  rosette()  six interlocking rounded links around a hexagonal centre (ChatGPT-inspired)
  spark()    radial burst of tapered, uneven rays (Claude-inspired)
Faces are counter-clockwise, so placed on a surface they face outward.
"""

import math


def _ccw(face):
    area = 0.0
    for i in range(len(face)):
        x0, y0 = face[i]
        x1, y1 = face[(i + 1) % len(face)]
        area += x0 * y1 - x1 * y0
    return face if area > 0 else list(reversed(face))


def _stadium(cx, cy, angle, half_len, radius, steps=10):
    """Closed CCW outline of a stadium (rounded rectangle) centred at (cx, cy)."""
    pts = []
    ca, sa = math.cos(angle), math.sin(angle)
    for end, base in ((1, -math.pi / 2), (-1, math.pi / 2)):
        for k in range(steps + 1):
            t = base + math.pi * k / steps
            lx = end * half_len + radius * math.cos(t)
            ly = radius * math.sin(t)
            pts.append((cx + lx * ca - ly * sa, cy + lx * sa + ly * ca))
    return pts


def _loop_stroke(pts, width):
    n = len(pts)
    faces = []
    out, inn = [], []
    for i in range(n):
        (x0, y0), (x1, y1) = pts[i - 1], pts[(i + 1) % n]
        tx, ty = x1 - x0, y1 - y0
        ln = math.hypot(tx, ty) or 1.0
        nx, ny = ty / ln, -tx / ln
        x, y = pts[i]
        out.append((x + nx * width / 2, y + ny * width / 2))
        inn.append((x - nx * width / 2, y - ny * width / 2))
    for i in range(n):
        j = (i + 1) % n
        faces.append(_ccw([inn[i], out[i], out[j], inn[j]]))
    return faces


def rosette(links=6, half_len=0.18, radius=0.13, offset=0.19, width=0.068):
    """Six rounded links, each rotated 60 degrees and pushed off-centre so they interlace."""
    faces = []
    for k in range(links):
        a = math.tau * k / links
        cx, cy = offset * math.cos(a + math.pi / 2), offset * math.sin(a + math.pi / 2)
        faces += _loop_stroke(_stadium(cx, cy, a, half_len, radius), width)
    return faces


def spark(rays=12, seed_lengths=(1.0, 0.80, 0.94, 0.76, 0.98, 0.84, 0.90, 0.78, 1.0, 0.82, 0.92, 0.74),
          base_w=0.16, tip_w=0.075, twist=(0, 4, -3, 2, -4, 3, 0, -2, 4, -3, 2, -1)):
    """Tapered rays from the centre with rounded tips and slightly uneven lengths and angles."""
    faces = []
    segs = 4
    for k in range(rays):
        a = math.tau * k / rays + math.radians(twist[k % len(twist)])
        L = 0.5 * seed_lengths[k % len(seed_lengths)]
        ca, sa = math.cos(a), math.sin(a)

        def pt(r, s):
            return (r * ca - s * sa, r * sa + s * ca)
        prev = None
        for i in range(segs + 1):
            t = i / segs
            r = L * t
            w = (base_w + (tip_w - base_w) * t) * 0.5 * 0.5
            cur = (pt(r, -w), pt(r, w))
            if prev:
                faces.append(_ccw([prev[0], cur[0], cur[1], prev[1]]))
            prev = cur
        # rounded tip
        w = tip_w * 0.25
        cap = [pt(L + w * math.sin(math.pi * j / 6), -w * math.cos(math.pi * j / 6)) for j in range(7)]
        for j in range(6):
            faces.append(_ccw([pt(L, 0.0), cap[j], cap[j + 1]]))
    return faces
