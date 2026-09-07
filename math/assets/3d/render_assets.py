from probe import call
import json, os, sys

OUT = r"C:/Users/김시현/AppData/Local/Temp/claude/C--Users----/f3edc45f-6353-44cd-8380-eda5a5ad2b66/scratchpad/blender/out"
os.makedirs(OUT, exist_ok=True)

code = r'''
import bpy, math
from mathutils import Vector
OUT = r"%s"
def clear():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.materials): bpy.data.materials.remove(m)
def mat(name, rgb, rough=0.25, metal=0.0, coat=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if "Coat Weight" in b.inputs: b.inputs["Coat Weight"].default_value = coat
    return m
def smooth(o):
    for p in o.data.polygons: p.use_smooth = True
def only(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
def half_sphere(radius, keep_top, material, loc):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=loc, segments=64, ring_count=32); s = bpy.context.object; smooth(s)
    only(s); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.bisect(plane_co=(0, 0, loc[2]), plane_no=(0, 0, 1 if keep_top else -1), clear_inner=True, use_fill=True)
    bpy.ops.object.mode_set(mode='OBJECT'); s.data.materials.append(material); return s
def setup_scene(cam_loc, cam_rot, lens):
    sc = bpy.context.scene
    bpy.ops.object.camera_add(location=cam_loc, rotation=cam_rot); cam = bpy.context.object; sc.camera = cam; cam.data.lens = lens
    bpy.ops.object.light_add(type='AREA', location=(2.5, -3, 4.5)); k = bpy.context.object; k.data.energy = 380; k.data.size = 4; k.data.color = (1, 0.97, 0.94)
    bpy.ops.object.light_add(type='AREA', location=(-3.5, -1.5, 3)); f = bpy.context.object; f.data.energy = 140; f.data.size = 5; f.data.color = (0.85, 0.92, 1)
    bpy.ops.object.light_add(type='AREA', location=(0, 3.5, 3)); r = bpy.context.object; r.data.energy = 220; r.data.size = 3
    w = sc.world or bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.85, 0.85, 0.95, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.35
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 64; sc.cycles.use_denoising = True
    try: sc.cycles.device = 'GPU'
    except Exception: pass
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'; sc.render.image_settings.compression = 60
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
def render(name, w, h):
    sc = bpy.context.scene; sc.render.resolution_x = w; sc.render.resolution_y = h; sc.render.resolution_percentage = 100
    sc.render.filepath = OUT + "/" + name + ".png"; bpy.ops.render.render(write_still=True)

def capsule(name, top_rgb, open_lid):
    clear()
    top = mat("top", top_rgb, 0.15, 0, 0.8); white = mat("white", (0.97, 0.97, 1.0), 0.12, 0, 0.6); rim = mat("rim", (0.9, 0.9, 0.95), 0.3)
    base = half_sphere(1.0, False, white, (0, 0, 1))
    lid = half_sphere(1.0, True, top, (0, 0, 1))
    bpy.ops.mesh.primitive_torus_add(location=(0, 0, 1), major_radius=1.0, minor_radius=0.05, major_segments=64, minor_segments=16); t = bpy.context.object; smooth(t); t.data.materials.append(rim)
    if open_lid:
        lid.location = (0.25, 0, 1.9); lid.rotation_euler = (0, math.radians(-32), 0)
        star = mat("star", (1.0, 0.82, 0.25), 0.3, 0.6)
        for (x, y, z, r) in ((-0.55, -0.3, 1.75, 0.1), (0.7, -0.35, 2.2, 0.08), (0.05, -0.6, 2.45, 0.06), (-0.2, -0.2, 2.1, 0.05)):
            bpy.ops.mesh.primitive_ico_sphere_add(radius=r, location=(x, y, z), subdivisions=2); smooth(bpy.context.object); bpy.context.object.data.materials.append(star)
    setup_scene((0, -7.0, 3.4), (math.radians(70), 0, 0), 48)
    render(("capsule_open_" if open_lid else "capsule_") + name, 520, 640)

def chest(open_lid):
    clear()
    wood = mat("wood", (0.55, 0.3, 0.12), 0.55); wood_d = mat("wood_d", (0.42, 0.22, 0.09), 0.6)
    gold = mat("gold", (1.0, 0.72, 0.22), 0.3, 1.0)
    glow = bpy.data.materials.new("glow"); glow.use_nodes = True
    e = glow.node_tree.nodes["Principled BSDF"]; e.inputs["Emission Color"].default_value = (1.0, 0.8, 0.35, 1); e.inputs["Emission Strength"].default_value = 5; e.inputs["Base Color"].default_value = (1, 0.9, 0.5, 1)
    def bevel(o, w=0.06, seg=5):
        b = o.modifiers.new("Bevel", 'BEVEL'); b.width = w; b.segments = seg
    # 몸통 2.0 x 1.2 x 0.9
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.45)); box = bpy.context.object; box.scale = (2.0, 1.2, 0.9); box.data.materials.append(wood); bevel(box)
    for x in (-0.65, 0.65):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, 0, 0.45)); b = bpy.context.object; b.scale = (0.18, 1.26, 0.94); b.data.materials.append(gold); bevel(b, 0.03, 3)
    # 뚜껑: 힌지(0, 0.6, 0.9)를 원점으로 하는 둥근 상자 2.0 x 1.2 x 0.5
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0)); lid = bpy.context.object
    for v in lid.data.vertices: v.co = Vector((v.co.x * 2.0, v.co.y * 1.2 - 0.6, v.co.z * 0.5 + 0.25))
    lid.location = (0, 0.6, 0.9); lid.data.materials.append(wood_d); bevel(lid, 0.18, 8)
    for x in (-0.65, 0.65):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0)); g = bpy.context.object
        for v in g.data.vertices: v.co = Vector((v.co.x * 0.18 + x, v.co.y * 1.26 - 0.6, v.co.z * 0.54 + 0.25))
        g.location = (0, 0.6, 0.9); g.data.materials.append(gold); bevel(g, 0.12, 6); g.parent = lid; g.matrix_parent_inverse = lid.matrix_world.inverted()
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.63, 0.78)); lock = bpy.context.object; lock.scale = (0.34, 0.08, 0.36); lock.data.materials.append(gold); bevel(lock, 0.03, 3)
    if open_lid:
        lid.rotation_euler = (math.radians(-105), 0, 0)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.75)); inner = bpy.context.object; inner.scale = (1.8, 1.0, 0.35); inner.data.materials.append(glow)
        coin = mat("coin", (1.0, 0.8, 0.3), 0.3, 1.0)
        for i, (x, y, z) in enumerate(((-0.55, -0.15, 0.98), (0.3, 0.15, 1.02), (0.7, -0.3, 0.96), (-0.1, -0.35, 1.08), (0.0, 0.3, 1.12), (0.45, -0.05, 1.16))):
            bpy.ops.mesh.primitive_cylinder_add(radius=0.2, depth=0.05, location=(x, y, z), rotation=(math.radians(15 * (i %% 3)), math.radians(12 * (i %% 2)), 0), vertices=32); c = bpy.context.object; smooth(c); c.data.materials.append(coin); bevel(c, 0.01, 2)
        bpy.ops.object.light_add(type='POINT', location=(0, -0.2, 1.4)); pl = bpy.context.object; pl.data.energy = 60; pl.data.color = (1, 0.85, 0.4)
    setup_scene((0, -6.6, 4.0), (math.radians(58), 0, 0), 55)
    render("chest_open" if open_lid else "chest_closed", 640, 560)

colors = {"pink": (1.0, 0.33, 0.55), "sky": (0.22, 0.58, 1.0), "lemon": (1.0, 0.76, 0.2)}
for n, rgb in colors.items():
    capsule(n, rgb, False); capsule(n, rgb, True)
chest(False); chest(True)
result = {"files": sorted(__import__("os").listdir(OUT))}
''' % OUT
r = call("execute_code", {"code": code}, timeout=1800)
print(json.dumps(r, ensure_ascii=False)[:800])
