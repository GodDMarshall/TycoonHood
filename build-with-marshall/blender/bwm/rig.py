"""Armature construction, generated skin weights, slider drivers and posing."""

import math

import bpy
import numpy as np
from mathutils import Matrix, Vector


class BoneSpec:
    def __init__(self, name, head, tail, parent=None, connect=False, deform=True,
                 z_axis=(0, -1, 0), coll='Body', rot_mode='QUATERNION'):
        self.name, self.head, self.tail = name, Vector(head), Vector(tail)
        self.parent, self.connect, self.deform = parent, connect, deform
        self.z_axis, self.coll, self.rot_mode = z_axis, coll, rot_mode


def build_armature(name, col, specs, hidden_collections=('Mechanism',)):
    arm = bpy.data.armatures.new(name)
    arm.display_type = 'OCTAHEDRAL'
    obj = bpy.data.objects.new(name, arm)
    col.objects.link(obj)
    obj.show_in_front = True
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    colls = {}
    ebs = {}
    for s in specs:
        eb = arm.edit_bones.new(s.name)
        eb.head, eb.tail = s.head, s.tail
        if s.z_axis is not None:
            eb.align_roll(Vector(s.z_axis))
        eb.use_deform = s.deform
        ebs[s.name] = eb
        if s.coll not in colls:
            colls[s.coll] = arm.collections.new(s.coll)
        colls[s.coll].assign(eb)
    for s in specs:
        if s.parent:
            ebs[s.name].parent = ebs[s.parent]
            ebs[s.name].use_connect = s.connect
    bpy.ops.object.mode_set(mode='OBJECT')
    for c in hidden_collections:
        if c in colls:
            colls[c].is_visible = False
    for s in specs:
        obj.pose.bones[s.name].rotation_mode = s.rot_mode
    return obj


def parent_to_bone(obj, arm_obj, bone_name):
    """Rigidly attach obj to a bone, keeping its current world transform (rest pose)."""
    bone = arm_obj.data.bones[bone_name]
    obj.parent = arm_obj
    obj.parent_type = 'BONE'
    obj.parent_bone = bone_name
    tail = arm_obj.matrix_world @ bone.matrix_local @ Matrix.Translation((0, bone.length, 0))
    obj.matrix_parent_inverse = tail.inverted()


def parent_to_rig(obj, arm_obj):
    obj.parent = arm_obj
    obj.matrix_parent_inverse = arm_obj.matrix_world.inverted()


def _armature_first(obj, mod):
    mods = obj.modifiers
    idx = mods.find(mod.name)
    if idx > 0:
        if hasattr(mods, 'move'):
            mods.move(idx, 0)
        else:
            with bpy.context.temp_override(object=obj, active_object=obj):
                for _ in range(idx):
                    bpy.ops.object.modifier_move_up(modifier=mod.name)


def skin(obj, arm_obj, bone_names, beta=0.014, max_influences=3, min_weight=0.03):
    """Generated skin weights: soft-min over distance to each bone segment.

    Every surface that is skinned with the same bone list and beta deforms the
    same way, so layered clothing pieces (pocket, logo, strings) stay glued to
    the body underneath without shrinkwrap."""
    me = obj.data
    n = len(me.vertices)
    co = np.empty(n * 3)
    me.vertices.foreach_get('co', co)
    co = co.reshape(n, 3)
    m = np.array(arm_obj.matrix_world.inverted() @ obj.matrix_world)
    co = co @ m[:3, :3].T + m[:3, 3]
    dist = []
    for name in bone_names:
        b = arm_obj.data.bones[name]
        h, t = np.array(b.head_local), np.array(b.tail_local)
        seg = t - h
        s = np.clip(((co - h) @ seg) / seg.dot(seg), 0.0, 1.0)
        dist.append(np.linalg.norm(co - (h + s[:, None] * seg), axis=1))
    d = np.stack(dist, axis=1)
    w = np.exp(-(d - d.min(axis=1, keepdims=True)) / beta)
    keep = np.argsort(-w, axis=1)[:, :max_influences]
    mask = np.zeros_like(w, dtype=bool)
    np.put_along_axis(mask, keep, True, axis=1)
    w = np.where(mask, w, 0.0)
    w /= w.sum(axis=1, keepdims=True)
    w = np.where(w < min_weight, 0.0, w)
    w /= w.sum(axis=1, keepdims=True)
    for bi, name in enumerate(bone_names):
        vg = obj.vertex_groups.get(name) or obj.vertex_groups.new(name=name)
        for i in np.nonzero(w[:, bi])[0]:
            vg.add([int(i)], float(w[i, bi]), 'REPLACE')
    mod = obj.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm_obj
    _armature_first(obj, mod)
    parent_to_rig(obj, arm_obj)
    return mod


# ---------------------------------------------------------------- sliders & drivers

SLIDER_DEFAULTS = {}


def add_slider(arm_obj, bone, name, default=0.0, lo=0.0, hi=1.0, desc=''):
    pb = arm_obj.pose.bones[bone]
    pb[name] = float(default)
    ui = pb.id_properties_ui(name)
    ui.update(min=lo, max=hi, soft_min=lo, soft_max=hi, default=float(default), description=desc)
    try:
        pb.property_overridable_library_set(f'["{name}"]', True)
    except Exception:
        pass
    SLIDER_DEFAULTS[(arm_obj.name, bone, name)] = float(default)


def drive(owner, data_path, index, arm_obj, src_bone, src_prop, expr='var'):
    """Driver: owner.data_path[index] = expr(var), var = pose.bones[src_bone][src_prop].
    Plain expressions like 'var * 0.6' run without enabling Python auto-execution."""
    fc = owner.driver_add(data_path, index) if index is not None else owner.driver_add(data_path)
    drv = fc.driver
    drv.type = 'SCRIPTED'
    drv.expression = expr
    var = drv.variables.new()
    var.name = 'var'
    var.type = 'SINGLE_PROP'
    var.targets[0].id_type = 'OBJECT'
    var.targets[0].id = arm_obj
    var.targets[0].data_path = f'pose.bones["{src_bone}"]["{src_prop}"]'
    for mod in list(fc.modifiers):
        fc.modifiers.remove(mod)
    return fc


# ---------------------------------------------------------------- posing

def update():
    bpy.context.view_layer.update()


def reset_pose(arm_obj):
    for pb in arm_obj.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.rotation_euler = (0, 0, 0)
        pb.scale = (1, 1, 1)
    for (arm_name, bone, prop), default in SLIDER_DEFAULTS.items():
        if arm_name == arm_obj.name:
            arm_obj.pose.bones[bone][prop] = default
    update()


def aim(arm_obj, bone, direction, z_hint):
    """Point a pose bone along a world direction, rolling its Z axis toward z_hint."""
    update()
    pb = arm_obj.pose.bones[bone]
    inv = arm_obj.matrix_world.inverted().to_3x3()
    y = (inv @ Vector(direction)).normalized()
    zh = inv @ Vector(z_hint)
    z = (zh - y * zh.dot(y)).normalized()
    x = y.cross(z)
    m = Matrix((x, y, z)).transposed().to_4x4()
    m.translation = pb.head
    pb.matrix = m
    update()


def rotate_world(arm_obj, bone, axis, degrees):
    """Rotate a pose bone about a world axis through its head (on top of its current pose)."""
    update()
    pb = arm_obj.pose.bones[bone]
    head = pb.head.copy()
    rot = Matrix.Rotation(math.radians(degrees), 4, Vector(axis).normalized())
    m = Matrix.Translation(head) @ rot @ Matrix.Translation(-head) @ pb.matrix
    pb.matrix = m
    update()


def two_bone(root, target, l1, l2, pole):
    """Analytic two-bone IK: returns (joint, end) for a chain from root toward target,
    bending toward pole."""
    root, target, pole = Vector(root), Vector(target), Vector(pole)
    d = target - root
    dist = min(d.length, (l1 + l2) * 0.999)
    d.normalize()
    cos_a = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)
    a = math.acos(max(-1.0, min(1.0, cos_a)))
    p = pole - root
    p = (p - d * p.dot(d)).normalized()
    joint = root + d * (l1 * math.cos(a)) + p * (l1 * math.sin(a))
    return joint, root + d * dist


def pose_head(arm_obj, bone):
    update()
    return arm_obj.matrix_world @ arm_obj.pose.bones[bone].head


def store_action(arm_obj, name, bones, props=()):
    """Key the current pose of `bones` (+ slider props) into a new reusable Action."""
    adt = arm_obj.animation_data or arm_obj.animation_data_create()
    adt.action = None
    for bname in bones:
        pb = arm_obj.pose.bones[bname]
        pb.keyframe_insert('location', frame=1, group=bname)
        if pb.rotation_mode == 'QUATERNION':
            pb.keyframe_insert('rotation_quaternion', frame=1, group=bname)
        else:
            pb.keyframe_insert('rotation_euler', frame=1, group=bname)
    for bname, prop in props:
        arm_obj.pose.bones[bname].keyframe_insert(f'["{prop}"]', frame=1, group=bname)
    act = adt.action
    act.name = name
    act.use_fake_user = True
    try:
        act.asset_mark()
    except Exception:
        pass
    adt.action = None
    return act


# ---------------------------------------------------------------- widgets

def widget(name, col, kind='circle', size=1.0):
    """Wire shapes for control bones (drawn in bone space, Y = along the bone)."""
    verts, edges = [], []
    if kind == 'circle':
        n = 32
        verts = [(size * math.cos(math.tau * i / n), 0.0, size * math.sin(math.tau * i / n)) for i in range(n)]
        edges = [(i, (i + 1) % n) for i in range(n)]
    elif kind == 'square':
        verts = [(-size, 0, -size), (size, 0, -size), (size, 0, size), (-size, 0, size)]
        edges = [(0, 1), (1, 2), (2, 3), (3, 0)]
    elif kind == 'cross':
        verts = [(-size, 0, 0), (size, 0, 0), (0, 0, -size), (0, 0, size), (0, -size, 0), (0, size, 0)]
        edges = [(0, 1), (2, 3), (4, 5)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, edges, [])
    obj = bpy.data.objects.new(name, me)
    col.objects.link(obj)
    return obj
