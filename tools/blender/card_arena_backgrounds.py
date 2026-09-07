from probe import call
import json, os
OUT = r"C:/Users/김시현/AppData/Local/Temp/claude/C--Users----/f3edc45f-6353-44cd-8380-eda5a5ad2b66/scratchpad/blender/out_bg"
os.makedirs(OUT, exist_ok=True)
code = r'''
import bpy, math, random
OUT = r"%s"
random.seed(7)
def clear():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.materials): bpy.data.materials.remove(m)
def mat(name, rgb, rough=0.7, emit=None, strength=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = strength
    return m
def smooth(o):
    for p in o.data.polygons: p.use_smooth = True
def box(loc, scale, m):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object; o.scale = scale; o.data.materials.append(m); return o
def cyl(loc, r, h, m, verts=24):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, vertices=verts); o = bpy.context.object; smooth(o); o.data.materials.append(m); return o
def cone(loc, r, h, m, verts=24):
    bpy.ops.mesh.primitive_cone_add(radius1=r, depth=h, location=loc, vertices=verts); o = bpy.context.object; smooth(o); o.data.materials.append(m); return o
def sphere(loc, r, m, seg=24):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg//2); o = bpy.context.object; smooth(o); o.data.materials.append(m); return o
def setup(sky_top, sky_bot, res=(1800, 900), samples=64):
    sc = bpy.context.scene
    w = sc.world or bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
    nt = w.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld"); bg = nt.nodes.new("ShaderNodeBackground"); ramp = nt.nodes.new("ShaderNodeValToRGB"); tex = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); mr = nt.nodes.new("ShaderNodeMath")
    mr.operation = 'MULTIPLY_ADD'; mr.inputs[1].default_value = 0.5; mr.inputs[2].default_value = 0.5
    ramp.color_ramp.elements[0].color = (*sky_bot, 1); ramp.color_ramp.elements[1].color = (*sky_top, 1)
    nt.links.new(tex.outputs["Generated"], sep.inputs[0]); nt.links.new(sep.outputs["Z"], mr.inputs[0]); nt.links.new(mr.outputs[0], ramp.inputs[0]); nt.links.new(ramp.outputs["Color"], bg.inputs[0]); nt.links.new(bg.outputs[0], out.inputs[0])
    bg.inputs[1].default_value = 1.0
    sc.render.engine = 'CYCLES'; sc.cycles.samples = samples; sc.cycles.use_denoising = True
    try: sc.cycles.device = 'GPU'
    except Exception: pass
    sc.render.film_transparent = False; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGB'
    sc.view_settings.view_transform = 'Filmic' if 'Filmic' in [i.identifier for i in bpy.types.ColorManagedViewSettings.bl_rna.properties['view_transform'].enum_items] else 'Standard'
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.resolution_percentage = 100
def render(name):
    bpy.context.scene.render.filepath = OUT + "/" + name + ".png"; bpy.ops.render.render(write_still=True)
def stars(n, ymin=20, ymax=60):
    m = mat("star", (1, 1, 0.9), 0.5, (1, 0.95, 0.7), 12)
    for i in range(n):
        sphere((random.uniform(-70, 70), random.uniform(50, 90), random.uniform(ymin, ymax)), random.uniform(0.12, 0.3), m, 8)

# ---------- 1. 별빛 성 ----------
clear(); setup((0.015, 0.01, 0.06), (0.22, 0.1, 0.36))
ground = mat("ground", (0.10, 0.06, 0.2), 0.9); stone = mat("stone", (0.5, 0.48, 0.62), 0.8); roof = mat("roof", (0.35, 0.18, 0.5), 0.7)
win = mat("win", (1, 0.85, 0.5), 0.5, (1.0, 0.8, 0.4), 6); moonm = mat("moon", (1, 0.97, 0.85), 0.6, (1, 0.95, 0.75), 3)
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 20, -0.5)); bpy.context.object.data.materials.append(ground)
# 언덕
hill = mat("hill", (0.16, 0.1, 0.3), 0.9)
for (x, y, r) in ((-18, 34, 14), (2, 40, 18), (20, 36, 15), (-40, 44, 16), (40, 46, 17), (0, 22, 9)):
    h = sphere((x, y, -r * 0.5), r, hill, 24); h.scale = (1.6, 1, 0.5)
# 성: 중앙 본체 + 탑 4개 + 원뿔 지붕 + 창문
box((0, 30, 5.5), (16, 7, 11), stone)
for (x, y, h) in ((-6.5, 27, 13), (6.5, 27, 13), (-6.5, 33, 11), (6.5, 33, 11), (0, 30, 17)):
    cyl((x, y, h / 2), 1.6 if h < 15 else 2.2, h, stone); cone((x, y, h + 2.2), 2.0 if h < 15 else 2.8, 4.4 if h < 15 else 5.6, roof)
for (x, z) in ((-3, 5), (0, 6), (3, 5), (-6.5, 9), (6.5, 9), (0, 12)):
    box((x, 26.3, z), (0.9, 0.3, 1.4), win)
# 문
box((0, 26.3, 1.6), (2.4, 0.3, 3.2), mat("door", (0.3, 0.16, 0.08), 0.8))
# 달
sphere((-26, 75, 30), 7, moonm, 32)
stars(120, 14, 60)
# 조명
bpy.ops.object.light_add(type='SUN', location=(-20, 40, 40)); s = bpy.context.object; s.data.energy = 1.2; s.data.color = (0.75, 0.8, 1.0); s.rotation_euler = (math.radians(60), 0, math.radians(-40))
bpy.ops.object.light_add(type='POINT', location=(0, 20, 10)); p = bpy.context.object; p.data.energy = 250; p.data.color = (1, 0.8, 0.5); p.data.shadow_soft_size = 3
bpy.ops.object.camera_add(location=(0, -34, 9), rotation=(math.radians(84), 0, 0)); cam = bpy.context.object; bpy.context.scene.camera = cam; cam.data.lens = 30
render("arena_castle")

# ---------- 2. 마법 숲 ----------
clear(); setup((0.01, 0.04, 0.06), (0.05, 0.16, 0.14))
ground = mat("ground", (0.05, 0.14, 0.1), 0.9); trunk = mat("trunk", (0.22, 0.13, 0.08), 0.8)
leafm = [mat("leaf%%d" %% i, c, 0.7) for i, c in enumerate(((0.1, 0.35, 0.22), (0.14, 0.42, 0.25), (0.2, 0.3, 0.45)))]
shroom = mat("shroom", (0.4, 0.85, 1.0), 0.4, (0.3, 0.8, 1.0), 2.2); shroom2 = mat("shroom2", (1.0, 0.45, 0.8), 0.4, (1.0, 0.35, 0.75), 2.2); stem = mat("stem", (0.95, 0.95, 0.85), 0.7)
fire = mat("fire", (1, 0.95, 0.5), 0.5, (1, 0.85, 0.3), 9)
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 20, -0.5)); bpy.context.object.data.materials.append(ground)
for i in range(38):
    x = random.uniform(-34, 34); y = random.uniform(14, 48)
    if abs(x) < 7 and y < 24: continue
    h = random.uniform(9, 16); r = random.uniform(2.6, 4.2)
    cyl((x, y, h / 2), 0.55, h, trunk, 10)
    lm = random.choice(leafm)
    for k in range(3):
        cone((x, y, h * 0.55 + k * h * 0.2), r * (1 - k * 0.22), h * 0.5, lm, 10)
for i in range(16):
    x = random.uniform(-26, 26); y = random.uniform(8, 30); s = random.uniform(0.5, 1.2)
    cyl((x, y, 0.5 * s), 0.22 * s, 1.0 * s, stem, 10); c = sphere((x, y, 1.05 * s), 0.55 * s, random.choice((shroom, shroom2)), 16); c.scale = (1, 1, 0.6)
for i in range(60):
    sphere((random.uniform(-30, 30), random.uniform(6, 40), random.uniform(1, 9)), random.uniform(0.05, 0.12), fire, 8)
sphere((22, 70, 26), 6, mat("moon2", (0.9, 0.95, 1), 0.6, (0.9, 0.95, 1), 2.5), 32)
stars(80, 16, 50)
bpy.ops.object.light_add(type='SUN', location=(10, 40, 40)); s = bpy.context.object; s.data.energy = 0.6; s.data.color = (0.6, 0.8, 1.0); s.rotation_euler = (math.radians(55), 0, math.radians(30))
bpy.ops.object.light_add(type='POINT', location=(0, 18, 4)); p = bpy.context.object; p.data.energy = 500; p.data.color = (0.5, 0.9, 1)
bpy.ops.object.camera_add(location=(0, -26, 7), rotation=(math.radians(84), 0, 0)); cam = bpy.context.object; bpy.context.scene.camera = cam; cam.data.lens = 28
render("arena_forest")
result = {"ok": True}
''' % OUT
r = call("execute_code", {"code": code}, timeout=3600)
print(json.dumps(r, ensure_ascii=False)[:500])
