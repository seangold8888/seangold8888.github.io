from probe import call
import json, os
OUT = r"C:/Users/김시현/AppData/Local/Temp/claude/C--Users----/f3edc45f-6353-44cd-8380-eda5a5ad2b66/scratchpad/blender/out_covers"
os.makedirs(OUT, exist_ok=True)
code = r'''
import bpy, math, random
OUT = r"%s"
random.seed(11)
def clear():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.materials): bpy.data.materials.remove(m)
def mat(name, rgb, rough=0.5, metal=0.0, emit=None, strength=0, coat=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if "Coat Weight" in b.inputs: b.inputs["Coat Weight"].default_value = coat
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = strength
    return m
def glass(name, rgb):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = 0.05
    if "Transmission Weight" in b.inputs: b.inputs["Transmission Weight"].default_value = 0.85
    b.inputs["Emission Color"].default_value = (*rgb, 1); b.inputs["Emission Strength"].default_value = 0.6
    return m
def smooth(o):
    for p in o.data.polygons: p.use_smooth = True
def add(fn, m, loc=(0,0,0), scale=(1,1,1), rot=(0,0,0), sm=True, **kw):
    fn(location=loc, rotation=rot, **kw); o = bpy.context.object; o.scale = scale
    if sm: smooth(o)
    o.data.materials.append(m); return o
def setup(top, bot, res=(1200, 800), samples=64):
    sc = bpy.context.scene
    w = sc.world or bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
    nt = w.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld"); bg = nt.nodes.new("ShaderNodeBackground"); ramp = nt.nodes.new("ShaderNodeValToRGB"); tex = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); mr = nt.nodes.new("ShaderNodeMath")
    mr.operation = 'MULTIPLY_ADD'; mr.inputs[1].default_value = 0.5; mr.inputs[2].default_value = 0.5
    ramp.color_ramp.elements[0].color = (*bot, 1); ramp.color_ramp.elements[1].color = (*top, 1)
    nt.links.new(tex.outputs["Generated"], sep.inputs[0]); nt.links.new(sep.outputs["Z"], mr.inputs[0]); nt.links.new(mr.outputs[0], ramp.inputs[0]); nt.links.new(ramp.outputs["Color"], bg.inputs[0]); nt.links.new(bg.outputs[0], out.inputs[0])
    sc.render.engine = 'CYCLES'; sc.cycles.samples = samples; sc.cycles.use_denoising = True
    try: sc.cycles.device = 'GPU'
    except Exception: pass
    sc.render.film_transparent = False; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGB'
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.resolution_percentage = 100
def render(name):
    bpy.context.scene.render.filepath = OUT + "/" + name + ".png"; bpy.ops.render.render(write_still=True)
def lights(key=600, fill=200, kc=(1, 0.95, 0.9), fc=(0.8, 0.9, 1)):
    bpy.ops.object.light_add(type='AREA', location=(4, -5, 7)); k = bpy.context.object; k.data.energy = key; k.data.size = 6; k.data.color = kc
    bpy.ops.object.light_add(type='AREA', location=(-6, -2, 4)); f = bpy.context.object; f.data.energy = fill; f.data.size = 8; f.data.color = fc
def cam(loc, rot, lens=45):
    bpy.ops.object.camera_add(location=loc, rotation=rot); c = bpy.context.object; bpy.context.scene.camera = c; c.data.lens = lens

def kart(body_rgb, x=0, y=0, yaw=0):
    body = mat("body", body_rgb, 0.25, 0, None, 0, 0.8); tire = mat("tire", (0.12, 0.12, 0.14), 0.8); rim = mat("rim", (0.95, 0.95, 0.95), 0.3, 0.6); seat = mat("seat", (0.25, 0.2, 0.3), 0.7); chrome = mat("chrome", (0.9, 0.9, 0.95), 0.2, 1.0)
    objs = []
    objs.append(add(bpy.ops.mesh.primitive_cube_add, body, (0, 0, 0.45), (2.2, 1.3, 0.5), sm=False, size=1))
    objs[-1].modifiers.new("b", 'BEVEL').width = 0.18; objs[-1].modifiers["b"].segments = 6
    objs.append(add(bpy.ops.mesh.primitive_cube_add, body, (-0.3, 0, 0.8), (1.1, 1.0, 0.35), sm=False, size=1)); objs[-1].modifiers.new("b", 'BEVEL').width = 0.14; objs[-1].modifiers["b"].segments = 6
    objs.append(add(bpy.ops.mesh.primitive_cube_add, seat, (-0.5, 0, 1.05), (0.6, 0.7, 0.5), sm=False, size=1)); objs[-1].modifiers.new("b", 'BEVEL').width = 0.12; objs[-1].modifiers["b"].segments = 5
    objs.append(add(bpy.ops.mesh.primitive_cylinder_add, chrome, (0.45, 0, 0.95), (1, 1, 1), (0, math.radians(20), 0), radius=0.03, depth=0.5, vertices=8))
    objs.append(add(bpy.ops.mesh.primitive_torus_add, chrome, (0.53, 0, 1.18), (1, 1, 1), (0, math.radians(110), 0), major_radius=0.22, minor_radius=0.03))
    for (wx, wy) in ((0.8, 0.75), (0.8, -0.75), (-0.8, 0.75), (-0.8, -0.75)):
        objs.append(add(bpy.ops.mesh.primitive_cylinder_add, tire, (wx, wy, 0.32), (1, 1, 1), (math.radians(90), 0, 0), radius=0.32, depth=0.28, vertices=24))
        objs.append(add(bpy.ops.mesh.primitive_cylinder_add, rim, (wx, wy + (0.15 if wy > 0 else -0.15), 0.32), (1, 1, 1), (math.radians(90), 0, 0), radius=0.18, depth=0.02, vertices=16))
    for o in objs:
        o.location = (o.location.x * math.cos(yaw) - o.location.y * math.sin(yaw) + x, o.location.x * math.sin(yaw) + o.location.y * math.cos(yaw) + y, o.location.z)
        o.rotation_euler.z += yaw
    return objs

# ---------- kart3d 커버: 핑크 카트, 보라 트랙, 속도선 ----------
clear(); setup((0.36, 0.3, 0.8), (0.12, 0.17, 0.36))
road = mat("road", (0.55, 0.5, 0.9), 0.9); stripe = mat("stripe", (1, 1, 1), 0.8); grass = mat("grass", (0.35, 0.72, 0.5), 0.9)
add(bpy.ops.mesh.primitive_plane_add, grass, (0, 6, 0), (30, 30, 1), sm=False, size=1)
add(bpy.ops.mesh.primitive_plane_add, road, (0, 6, 0.01), (7, 40, 1), sm=False, size=1)
for i in range(-6, 14): add(bpy.ops.mesh.primitive_plane_add, stripe, (0, i * 3, 0.02), (0.25, 1.4, 1), sm=False, size=1)
kart((1.0, 0.45, 0.65), 0, 0, math.radians(-12))
kart((0.4, 0.75, 1.0), -2.4, 5, math.radians(-8)); kart((1.0, 0.85, 0.3), 2.2, 8, math.radians(-4))
for i in range(10):
    add(bpy.ops.mesh.primitive_cube_add, stripe, (random.uniform(-5, 5), random.uniform(-4, 4), random.uniform(0.6, 2.4)), (random.uniform(0.6, 1.6), 0.03, 0.03), sm=False, size=1)
lights(700, 250); cam((5.5, -6.5, 3.6), (math.radians(68), 0, math.radians(38)), 40)
render("cover_kart3d")

# ---------- kart(2D) 커버: 노란 카트 위에서 내려다보기 ----------
clear(); setup((0.98, 0.55, 0.7), (0.45, 0.2, 0.5))
road = mat("road", (0.95, 0.88, 0.8), 0.9); stripe = mat("stripe", (0.9, 0.4, 0.6), 0.8); grass = mat("grass", (0.45, 0.78, 0.55), 0.9)
add(bpy.ops.mesh.primitive_plane_add, grass, (0, 6, 0), (30, 30, 1), sm=False, size=1)
add(bpy.ops.mesh.primitive_plane_add, road, (0, 6, 0.01), (7, 40, 1), sm=False, size=1)
for i in range(-6, 14): add(bpy.ops.mesh.primitive_plane_add, stripe, (i %% 2 * 6 - 3, i * 3, 0.02), (0.6, 0.6, 1), sm=False, size=1)
kart((1.0, 0.85, 0.3), 0, 0, math.radians(-20)); kart((1.0, 0.45, 0.65), 2.6, 5.5, math.radians(-10))
lights(700, 250); cam((1.5, -7, 7.5), (math.radians(48), 0, math.radians(10)), 42)
render("cover_kart")

# ---------- gem(보리 젬) 커버: 빛나는 보석 무더기 ----------
clear(); setup((0.25, 0.15, 0.45), (0.06, 0.06, 0.2))
floor = mat("floor", (0.12, 0.08, 0.25), 0.9); add(bpy.ops.mesh.primitive_plane_add, floor, (0, 0, 0), (40, 40, 1), sm=False, size=1)
cols = [(0.4, 0.95, 1.0), (1.0, 0.55, 0.85), (0.6, 1.0, 0.6), (1.0, 0.9, 0.4), (0.7, 0.6, 1.0)]
for i in range(14):
    c = random.choice(cols); g = glass("g%%d" %% i, c)
    x, y = random.uniform(-3.2, 3.2), random.uniform(-1.5, 2.5); h = random.uniform(0.9, 2.4)
    add(bpy.ops.mesh.primitive_cone_add, g, (x, y, h / 2), (random.uniform(0.35, 0.6), random.uniform(0.35, 0.6), 1), (random.uniform(-0.2, 0.2), random.uniform(-0.2, 0.2), random.uniform(0, 3)), sm=False, radius1=0.6, radius2=0.12, depth=h, vertices=6)
    add(bpy.ops.mesh.primitive_cone_add, g, (x, y, h * 0.15), (random.uniform(0.35, 0.6), random.uniform(0.35, 0.6), 1), (math.pi, 0, 0), sm=False, radius1=0.6, radius2=0.0, depth=h * 0.3, vertices=6)
sparkle = mat("spark", (1, 1, 1), 0.5, 0, (1, 1, 1), 10)
for i in range(30): add(bpy.ops.mesh.primitive_ico_sphere_add, sparkle, (random.uniform(-4, 4), random.uniform(-2, 3), random.uniform(0.5, 3.5)), (1, 1, 1), radius=random.uniform(0.02, 0.06), subdivisions=1)
lights(500, 200, (0.9, 0.85, 1), (0.6, 0.9, 1)); cam((0.5, -7.5, 3.4), (math.radians(70), 0, math.radians(4)), 45)
render("cover_gem")

# ---------- stage(케데훈) 커버: 무대·조명·마이크 ----------
clear(); setup((0.08, 0.04, 0.2), (0.02, 0.02, 0.08))
stage = mat("stage", (0.16, 0.12, 0.3), 0.6); edge = mat("edge", (1, 0.4, 0.6), 0.5, 0, (1, 0.4, 0.6), 4); beam_c = mat("beam", (0.5, 0.9, 1), 0.5, 0, (0.4, 0.85, 1), 3); beam_p = mat("beamp", (1, 0.5, 0.9), 0.5, 0, (1, 0.45, 0.9), 3)
add(bpy.ops.mesh.primitive_cylinder_add, stage, (0, 2, 0.3), (1, 1, 1), radius=6, depth=0.6, vertices=48)
add(bpy.ops.mesh.primitive_torus_add, edge, (0, 2, 0.62), (1, 1, 1), major_radius=6, minor_radius=0.06, major_segments=64)
for (x, c) in ((-3.5, beam_c), (-1.2, beam_p), (1.2, beam_c), (3.5, beam_p)):
    add(bpy.ops.mesh.primitive_cone_add, c, (x, 4, 4.5), (1, 1, 1), (math.radians(-12), math.radians(x * 5), 0), radius1=1.6, radius2=0.08, depth=8.5, vertices=24)
    bpy.context.object.active_material.blend_method = 'BLEND' if hasattr(bpy.context.object.active_material, 'blend_method') else None
    bpy.context.object.active_material.node_tree.nodes["Principled BSDF"].inputs["Alpha"].default_value = 0.35
mic = mat("mic", (0.85, 0.85, 0.9), 0.3, 0.8); micm = mat("micm", (0.25, 0.25, 0.3), 0.7)
add(bpy.ops.mesh.primitive_cylinder_add, mic, (0, 0.5, 1.4), (1, 1, 1), radius=0.03, depth=1.6, vertices=8)
add(bpy.ops.mesh.primitive_uv_sphere_add, micm, (0, 0.5, 2.3), (1, 1, 1), radius=0.14, segments=16, ring_count=8)
add(bpy.ops.mesh.primitive_cylinder_add, mic, (0, 0.5, 0.63), (1, 1, 1), radius=0.35, depth=0.04, vertices=24)
star = mat("star", (1, 0.9, 0.4), 0.5, 0, (1, 0.85, 0.3), 8)
for i in range(40): add(bpy.ops.mesh.primitive_ico_sphere_add, star, (random.uniform(-6, 6), random.uniform(1, 6), random.uniform(1, 6)), (1, 1, 1), radius=random.uniform(0.02, 0.06), subdivisions=1)
lights(150, 80, (1, 0.6, 0.8), (0.5, 0.8, 1)); cam((0, -8.5, 3.2), (math.radians(76), 0, 0), 40)
render("cover_stage")
result = {"ok": True}
''' % OUT
r = call("execute_code", {"code": code}, timeout=3600)
print(json.dumps(r, ensure_ascii=False)[:500])
