"""Material library. Colours are written as sRGB hex and converted to linear.

Every material is a Principled BSDF with named, readable settings so it can be
re-tuned by hand in the Shader Editor. Optional procedural bump:
  ('noise', scale, strength)          fabric grain (object coordinates)
  ('rib', bands, strength)            knit rib lines running along V (needs UVs)
"""

import bpy

# Brand palette shared by all three characters.
BWM_ORANGE = '#FF7A1A'
BWM_CYAN = '#22D3EE'
BWM_AMBER = '#FFB020'
STUDIO_DARK = '#0C0D11'


def srgb(hexstr):
    h = hexstr.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


def _set(node, name, value):
    sock = node.inputs.get(name)
    if sock is not None:
        sock.default_value = value


def principled(name, color, rough=0.5, metal=0.0, spec=0.5, sss=0.0,
               sss_radius=(1.0, 0.45, 0.25), sss_scale=0.03, coat=0.0, coat_rough=0.03,
               sheen=0.0, sheen_rough=0.5, emit=None, emit_strength=0.0, bump=None):
    """Create (or rebuild) a Principled BSDF material."""
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    if hasattr(mat, 'use_nodes') and not mat.use_nodes:
        mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    out.location = (400, 0)
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (0, 0)
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

    rgb = srgb(color)
    _set(bsdf, 'Base Color', (*rgb, 1.0))
    _set(bsdf, 'Roughness', rough)
    _set(bsdf, 'Metallic', metal)
    _set(bsdf, 'Specular IOR Level', spec)
    if sss:
        _set(bsdf, 'Subsurface Weight', sss)
        _set(bsdf, 'Subsurface Radius', sss_radius)
        _set(bsdf, 'Subsurface Scale', sss_scale)
    if coat:
        _set(bsdf, 'Coat Weight', coat)
        _set(bsdf, 'Coat Roughness', coat_rough)
    if sheen:
        _set(bsdf, 'Sheen Weight', sheen)
        _set(bsdf, 'Sheen Roughness', sheen_rough)
    if emit:
        _set(bsdf, 'Emission Color', (*srgb(emit), 1.0))
        _set(bsdf, 'Emission Strength', emit_strength)

    if bump:
        kind = bump[0]
        bnode = nt.nodes.new('ShaderNodeBump')
        bnode.location = (-250, -300)
        bnode.inputs['Strength'].default_value = bump[2]
        bnode.inputs['Distance'].default_value = 0.002
        coord = nt.nodes.new('ShaderNodeTexCoord')
        coord.location = (-850, -300)
        if kind == 'noise':
            tex = nt.nodes.new('ShaderNodeTexNoise')
            tex.inputs['Scale'].default_value = bump[1]
            tex.inputs['Detail'].default_value = 3.0
            nt.links.new(coord.outputs['Object'], tex.inputs['Vector'])
            nt.links.new(tex.outputs['Fac'], bnode.inputs['Height'])
        else:
            tex = nt.nodes.new('ShaderNodeTexWave')
            tex.wave_type = 'BANDS'
            tex.bands_direction = 'X'
            tex.inputs['Scale'].default_value = bump[1]
            tex.inputs['Distortion'].default_value = 0.0
            nt.links.new(coord.outputs['UV'], tex.inputs['Vector'])
            nt.links.new(tex.outputs['Fac'], bnode.inputs['Height'])
        tex.location = (-550, -300)
        nt.links.new(bnode.outputs['Normal'], bsdf.inputs['Normal'])

    mat.diffuse_color = (*rgb, 1.0)
    mat.roughness = rough
    return mat

