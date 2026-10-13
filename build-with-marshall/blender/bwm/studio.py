"""Presentation studio: cyclorama, lights, cameras, render settings, contact sheets.

The look matches the channel's real set: black backdrop, coloured rim lights
(orange for the brand, cyan as the complementary accent)."""

import math
import os

import bpy
import numpy as np
from mathutils import Vector

from . import geo
from . import materials as mt
from . import scene as sc


def look_at(obj, target):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def camera(name, col, location, target, lens=85.0):
    cam = bpy.data.cameras.new(name)
    cam.lens = lens
    cam.clip_start = 0.05
    cam.clip_end = 100.0
    cam.sensor_fit = 'AUTO'
    obj = bpy.data.objects.new(name, cam)
    col.objects.link(obj)
    obj.location = Vector(location)
    look_at(obj, target)
    return obj


def orbit_camera(name, col, target, azimuth, distance, height, lens):
    """azimuth 0 = in front of the character (-Y); positive swings toward the character's left (+X)."""
    az = math.radians(azimuth)
    loc = Vector((distance * math.sin(az), -distance * math.cos(az), height))
    return camera(name, col, loc, target, lens)


def area_light(name, col, location, target, energy, color_hex, size, size_y=None):
    light = bpy.data.lights.new(name, 'AREA')
    light.energy = energy
    light.color = mt.srgb(color_hex)
    if size_y:
        light.shape = 'RECTANGLE'
        light.size, light.size_y = size, size_y
    else:
        light.shape = 'DISK'
        light.size = size
    obj = bpy.data.objects.new(name, light)
    col.objects.link(obj)
    obj.location = Vector(location)
    look_at(obj, target)
    return obj


def cyclorama(col, mat, width=16.0, front=8.0, back=3.0, radius=2.0, height=7.0):
    """Seamless floor-to-wall backdrop (the wall stands at +Y, behind the character)."""
    prof = [Vector((0.0, -front, 0.0)), Vector((0.0, back - radius, 0.0))]
    for k in range(1, 12):
        a = (math.pi / 2) * k / 12
        prof.append(Vector((0.0, back - radius + radius * math.sin(a), radius - radius * math.cos(a))))
    prof += [Vector((0.0, back, radius)), Vector((0.0, back, height))]
    md = geo.MeshData()
    nx = 8
    for k, p in enumerate(prof):
        md.add_verts([Vector((-width / 2 + width * i / nx, p.y, p.z)) for i in range(nx + 1)])
    for k in range(len(prof) - 1):
        for i in range(nx):
            a = k * (nx + 1) + i
            md.add_face((a, a + nx + 1, a + nx + 2, a + 1))
    obj = sc.to_object(md, 'STUDIO_Cyclorama', col, [mat], smooth=True)
    obj.hide_select = True
    return obj


def world(scene, color_hex='#06070A', strength=1.0):
    w = bpy.data.worlds.get('BWM_World') or bpy.data.worlds.new('BWM_World')
    if hasattr(w, 'use_nodes') and not w.use_nodes:
        w.use_nodes = True
    bg = w.node_tree.nodes.get('Background')
    bg.inputs['Color'].default_value = (*mt.srgb(color_hex), 1.0)
    bg.inputs['Strength'].default_value = strength
    scene.world = w
    return w


def setup_render(scene, samples=96, res=(1080, 1920)):
    scene.render.engine = 'CYCLES'
    cy = scene.cycles
    cy.device = 'CPU'
    cy.samples = samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.02
    cy.use_denoising = True
    try:
        cy.denoiser = 'OPENIMAGEDENOISE'
    except TypeError:
        pass
    cy.max_bounces = 8
    cy.diffuse_bounces = 3
    cy.glossy_bounces = 3
    cy.transmission_bounces = 4
    cy.transparent_max_bounces = 8
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    img = scene.render.image_settings
    img.file_format = 'PNG'
    img.color_mode = 'RGB'
    img.color_depth = '8'
    img.compression = 90
    vs = scene.view_settings
    try:
        vs.view_transform = 'AgX'
        for look in ('AgX - Medium High Contrast', 'Medium High Contrast', 'AgX - Punchy', 'Punchy'):
            try:
                vs.look = look
                break
            except TypeError:
                continue
    except TypeError:
        vs.view_transform = 'Filmic'
    scene.render.fps = 24


def render(scene, cam, path, res=None, samples=None):
    scene.camera = cam
    if res:
        scene.render.resolution_x, scene.render.resolution_y = res
    if samples:
        scene.cycles.samples = samples
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


def contact_sheet(paths, cols, out_path, pad=12, bg='#0C0D11'):
    """Tile rendered PNGs into one sheet (row-major, top-left first). Pure Blender + numpy."""
    tiles = []
    for p in paths:
        img = bpy.data.images.load(p, check_existing=False)
        w, h = img.size
        buf = np.empty(w * h * 4, dtype=np.float32)
        img.pixels.foreach_get(buf)
        tiles.append(np.flipud(buf.reshape(h, w, 4)))
        bpy.data.images.remove(img)
    tw = max(t.shape[1] for t in tiles)
    th = max(t.shape[0] for t in tiles)
    rows = math.ceil(len(tiles) / cols)
    W, H = cols * tw + (cols + 1) * pad, rows * th + (rows + 1) * pad
    lin = mt.srgb(bg)
    srgb_bg = [c * 12.92 if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055 for c in lin]
    sheet = np.empty((H, W, 4), dtype=np.float32)
    sheet[:, :, :3] = srgb_bg
    sheet[:, :, 3] = 1.0
    for i, t in enumerate(tiles):
        r, c = divmod(i, cols)
        y0 = pad + r * (th + pad) + (th - t.shape[0]) // 2
        x0 = pad + c * (tw + pad) + (tw - t.shape[1]) // 2
        sheet[y0:y0 + t.shape[0], x0:x0 + t.shape[1]] = t
    out = bpy.data.images.new(os.path.basename(out_path), W, H, alpha=False)
    out.pixels.foreach_set(np.flipud(sheet).ravel())
    out.filepath_raw = out_path
    out.file_format = 'PNG'
    out.save()
    bpy.data.images.remove(out)
    return out_path
