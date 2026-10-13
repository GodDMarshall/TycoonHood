"""Blender scene plumbing: reset, collections, MeshData -> objects, modifiers, ray casts."""

import bpy
from mathutils import Matrix, Vector


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    return scene


def collection(name, parent=None, hide_render=False):
    col = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    parent = parent or bpy.context.scene.collection
    if col.name not in parent.children:
        parent.children.link(col)
    col.hide_render = hide_render
    return col


def to_object(md, name, col, materials=(), smooth=True, subsurf=None, matrix=None):
    """Build a mesh object from geo.MeshData. subsurf=(viewport, render) levels."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in md.verts], [], list(md.faces))
    for m in materials:
        me.materials.append(m)
    if len(me.polygons):
        me.polygons.foreach_set('material_index', [min(m, max(len(materials) - 1, 0)) for m in md.mats])
        me.polygons.foreach_set('use_smooth', [smooth] * len(me.polygons))
    if any(uv is not None for uv in md.uvs):
        layer = me.uv_layers.new(name='UVMap')
        flat = []
        for f, uv in zip(md.faces, md.uvs):
            for k in range(len(f)):
                flat.extend(uv[k] if uv else (0.0, 0.0))
        layer.data.foreach_set('uv', flat)
    me.update()
    obj = bpy.data.objects.new(name, me)
    col.objects.link(obj)
    if matrix is not None:
        obj.matrix_world = Matrix(matrix)
    if subsurf:
        add_subsurf(obj, *subsurf)
    return obj


def add_subsurf(obj, levels=1, render_levels=2):
    m = obj.modifiers.new('Subdivision', 'SUBSURF')
    m.levels = levels
    m.render_levels = render_levels
    m.quality = 3
    return m


def add_solidify(obj, thickness, offset=-1.0, rim=True):
    m = obj.modifiers.new('Solidify', 'SOLIDIFY')
    m.thickness = thickness
    m.offset = offset
    m.use_even_offset = True
    m.use_rim = rim
    return m


def add_shrinkwrap(obj, target, offset=0.0015):
    m = obj.modifiers.new('Shrinkwrap', 'SHRINKWRAP')
    m.target = target
    m.wrap_method = 'NEAREST_SURFACEPOINT'
    m.wrap_mode = 'OUTSIDE_SURFACE'
    m.offset = offset
    return m


def add_bevel(obj, width=0.001, segments=2):
    m = obj.modifiers.new('Bevel', 'BEVEL')
    m.width = width
    m.segments = segments
    m.limit_method = 'ANGLE'
    return m


def evaluated_ray(obj, origin, direction, distance=10.0):
    """Ray cast against the evaluated (modifiers applied) object, in world space.
    Returns (hit_location, normal) or (None, None)."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(depsgraph)
    inv = ev.matrix_world.inverted()
    o = inv @ Vector(origin)
    d = (inv.to_3x3() @ Vector(direction)).normalized()
    ok, loc, nor, _ = ev.ray_cast(o, d, distance=distance)
    if not ok:
        return None, None
    mw = ev.matrix_world
    n = (mw.to_3x3().inverted().transposed() @ nor).normalized()
    return mw @ loc, n


def surface_y(obj, x, z, from_front=True):
    """Front (or back) surface point of obj on the line (x, *, z)."""
    if from_front:
        return evaluated_ray(obj, (x, -5.0, z), (0, 1, 0))
    return evaluated_ray(obj, (x, 5.0, z), (0, -1, 0))
