from probe import call
import json, os, subprocess
OUT = r"C:/Users/김시현/AppData/Local/Temp/claude/C--Users----/f3edc45f-6353-44cd-8380-eda5a5ad2b66/scratchpad/blender/out_badges"
os.makedirs(OUT, exist_ok=True)
chars = json.loads(subprocess.check_output(["node", "-e", "console.log(JSON.stringify(require('C:/Users/김시현/game-hub/site/math/characters.js').CHARACTERS.map(c=>[c.id,c.bg,c.color])))"], text=True))
def hexrgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) / 255 for i in (0, 2, 4))
code = r'''
import bpy, math
OUT = r"%s"
COLORS = %s
def clear():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.materials): bpy.data.materials.remove(m)
def srgb(c):
    return tuple(((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c)
clear()
sc = bpy.context.scene
bpy.ops.object.camera_add(location=(0, -6.2, 0.9), rotation=(math.radians(82), 0, 0)); cam = bpy.context.object; sc.camera = cam; cam.data.lens = 85
bpy.ops.object.light_add(type='AREA', location=(2.2, -3, 3.5)); k = bpy.context.object; k.data.energy = 150; k.data.size = 3
bpy.ops.object.light_add(type='AREA', location=(-3, -2, 1.5)); f = bpy.context.object; f.data.energy = 60; f.data.size = 4; f.data.color = (0.85, 0.9, 1)
bpy.ops.object.light_add(type='AREA', location=(0, 3, 2)); r = bpy.context.object; r.data.energy = 70; r.data.size = 3
w = sc.world or bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.9, 0.9, 1, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.4
sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.use_denoising = True
try: sc.cycles.device = 'GPU'
except Exception: pass
sc.render.film_transparent = True; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'; sc.render.image_settings.compression = 70
sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
sc.render.resolution_x = 200; sc.render.resolution_y = 200; sc.render.resolution_percentage = 100
bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, location=(0, 0, 0), segments=64, ring_count=32); s = bpy.context.object
for p in s.data.polygons: p.use_smooth = True
m = bpy.data.materials.new("ball"); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
b.inputs["Roughness"].default_value = 0.12
if "Coat Weight" in b.inputs: b.inputs["Coat Weight"].default_value = 0.9
s.data.materials.append(m)
for cid, bg, fg in COLORS:
    lb, lf = srgb(bg), srgb(fg)
    mixc = tuple(lb[i] * 0.5 + lf[i] * 0.5 for i in range(3))
    b.inputs["Base Color"].default_value = (*mixc, 1)
    sc.render.filepath = OUT + "/" + cid + ".png"; bpy.ops.render.render(write_still=True)
result = {"n": len(COLORS)}
''' % (OUT, json.dumps([[c[0], hexrgb(c[1]), hexrgb(c[2])] for c in chars]))
r = call("execute_code", {"code": code}, timeout=1800)
print(json.dumps(r, ensure_ascii=False)[:400])
