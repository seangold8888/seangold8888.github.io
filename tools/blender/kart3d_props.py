from probe import call
import json, os
OUT = r"C:/Users/김시현/AppData/Local/Temp/claude/C--Users----/f3edc45f-6353-44cd-8380-eda5a5ad2b66/scratchpad/blender/out_props"
os.makedirs(OUT, exist_ok=True)
# 산리오 카트 3D 소품: 각 소품 = 하나의 메시(재질 여러 개), 바닥 z=0, 높이 약 1. 게임에서 ×50.
code = r'''
import bpy, bmesh, math, random
from mathutils import Vector
OUT = r"%s"
random.seed(3)
def clear():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.materials): bpy.data.materials.remove(m)
    for me in list(bpy.data.meshes): bpy.data.meshes.remove(me)
def mat(name, rgb, rough=0.85):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Specular IOR Level"].default_value = 0.2 if "Specular IOR Level" in b.inputs else 0
    return m
def add(fn, m, loc=(0,0,0), scale=(1,1,1), rot=(0,0,0), flat=False, **kw):
    fn(location=loc, rotation=rot, **kw); o = bpy.context.object; o.scale = scale
    if not flat:
        for p in o.data.polygons: p.use_smooth = True
    o.data.materials.append(m); return o
def join(name, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join(); o = bpy.context.object; o.name = name; o.data.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o
def sph(m, loc, r, scale=(1,1,1), seg=12): return add(bpy.ops.mesh.primitive_uv_sphere_add, m, loc, scale, radius=r, segments=seg, ring_count=max(6, seg//2))
def cyl(m, loc, r, h, scale=(1,1,1), rot=(0,0,0), v=8, r2=None): return add(bpy.ops.mesh.primitive_cone_add if r2 is not None else bpy.ops.mesh.primitive_cylinder_add, m, loc, scale, rot, **({"radius1": r, "radius2": r2, "depth": h, "vertices": v} if r2 is not None else {"radius": r, "depth": h, "vertices": v}))
def cone(m, loc, r, h, v=8, scale=(1,1,1), rot=(0,0,0)): return add(bpy.ops.mesh.primitive_cone_add, m, loc, scale, rot, radius1=r, depth=h, vertices=v)
def cube(m, loc, scale, rot=(0,0,0)): return add(bpy.ops.mesh.primitive_cube_add, m, loc, scale, rot, flat=True, size=1)

clear()
trunk = mat("trunk", (0.45, 0.28, 0.14)); leaf1 = mat("leaf_green", (0.42, 0.75, 0.35)); leaf2 = mat("leaf_light", (0.56, 0.83, 0.43)); pink = mat("blossom", (1.0, 0.7, 0.85))
pine = mat("pine", (0.2, 0.5, 0.35)); rock = mat("rock", (0.6, 0.6, 0.68)); rock2 = mat("rock_dark", (0.45, 0.45, 0.55))
white = mat("white", (0.97, 0.97, 0.97), 0.6); red = mat("red", (0.95, 0.3, 0.35)); yellow = mat("yellow", (1.0, 0.83, 0.3)); sky = mat("skyblue", (0.55, 0.8, 1.0)); lav = mat("lavender", (0.78, 0.7, 0.95))
wood = mat("wood", (0.72, 0.5, 0.28)); gold = mat("gold", (1.0, 0.8, 0.3), 0.4); dark = mat("dark", (0.2, 0.2, 0.3)); glow = mat("lamp_glow", (1.0, 0.9, 0.6), 0.3)
props = []
# 1. 둥근 나무 (공원)
props.append(join("tree_round", [cyl(trunk, (0, 0, 0.22), 0.07, 0.44, r2=0.05), sph(leaf1, (0, 0, 0.62), 0.34, seg=14), sph(leaf2, (0.18, 0.1, 0.72), 0.22, seg=12), sph(leaf2, (-0.16, -0.08, 0.7), 0.2, seg=12)]))
# 2. 벚꽃 나무
props.append(join("tree_blossom", [cyl(trunk, (0, 0, 0.24), 0.07, 0.48, r2=0.05), sph(pink, (0, 0, 0.66), 0.34, scale=(1, 1, 0.85), seg=14), sph(mat("blossom2", (1.0, 0.8, 0.9)), (0.2, 0.05, 0.78), 0.2, seg=12), sph(mat("blossom2", (1.0, 0.8, 0.9)), (-0.2, -0.05, 0.74), 0.18, seg=12)]))
# 3. 소나무 (밤)
props.append(join("tree_pine", [cyl(trunk, (0, 0, 0.14), 0.06, 0.28, r2=0.045), cone(pine, (0, 0, 0.42), 0.34, 0.38, v=10), cone(pine, (0, 0, 0.66), 0.27, 0.34, v=10), cone(pine, (0, 0, 0.86), 0.18, 0.3, v=10)]))
# 4. 바위 (2개 뭉치)
props.append(join("rock", [sph(rock, (0, 0, 0.2), 0.3, scale=(1.3, 1, 0.7), seg=8), sph(rock2, (0.3, 0.15, 0.13), 0.18, scale=(1.1, 1, 0.75), seg=8)]))
# 5. 버섯
props.append(join("mushroom", [cyl(white, (0, 0, 0.22), 0.12, 0.44, v=10), sph(red, (0, 0, 0.48), 0.32, scale=(1, 1, 0.6), seg=14), sph(white, (0.14, 0.1, 0.62), 0.05, seg=8), sph(white, (-0.12, -0.06, 0.6), 0.045, seg=8), sph(white, (0.02, -0.18, 0.58), 0.04, seg=8)]))
# 6. 꽃밭 (꽃 5송이)
fl = [cube(leaf1, (0, 0, 0.02), (0.9, 0.9, 0.04))]
for i, (x, y, c) in enumerate(((-0.25, -0.15, yellow), (0.2, -0.2, red), (0.0, 0.2, sky), (-0.28, 0.22, lav), (0.3, 0.15, pink))):
    fl.append(cyl(leaf1, (x, y, 0.12), 0.015, 0.2, v=5)); fl.append(sph(c, (x, y, 0.24), 0.07, scale=(1, 1, 0.5), seg=10)); fl.append(sph(yellow if c is not yellow else white, (x, y, 0.27), 0.03, seg=8))
props.append(join("flower_patch", fl))
# 7. 화살표 표지판
arrow = cube(yellow, (0, 0, 0.72), (0.5, 0.06, 0.26))
props.append(join("sign_arrow", [cyl(wood, (0, 0, 0.32), 0.035, 0.64, v=8), arrow, cone(yellow, (0.3, 0, 0.72), 0.22, 0.2, v=4, rot=(0, math.radians(90), 0))]))
# 8. 막대사탕 (캔디)
props.append(join("lollipop", [cyl(white, (0, 0, 0.32), 0.035, 0.64, v=8), sph(pink, (0, 0, 0.78), 0.26, scale=(1, 0.35, 1), seg=16), add(bpy.ops.mesh.primitive_torus_add, red, (0, 0, 0.78), (1, 1, 1), (math.radians(90), 0, 0), major_radius=0.17, minor_radius=0.035, major_segments=24, minor_segments=6)]))
# 9. 가로등 (밤)
props.append(join("lamp", [cyl(dark, (0, 0, 0.42), 0.03, 0.84, v=8), cyl(dark, (0, 0, 0.04), 0.1, 0.08, v=10), cube(dark, (0, 0, 0.9), (0.16, 0.16, 0.12)), sph(glow, (0, 0, 0.9), 0.07, seg=10), cone(dark, (0, 0, 0.99), 0.13, 0.08, v=4)]))
# 10. 야자수 (해변)
palm = [cyl(wood, (0.05, 0, 0.4), 0.05, 0.8, r2=0.035, rot=(0, math.radians(6), 0))]
for k in range(6):
    a = k / 6 * math.pi * 2
    palm.append(cone(leaf1, (0.1 + math.cos(a) * 0.22, math.sin(a) * 0.22, 0.8), 0.07, 0.5, v=4, rot=(math.radians(-70) * math.sin(a), math.radians(70) * math.cos(a), 0)))
palm.append(sph(trunk, (0.1, 0, 0.78), 0.06, seg=8)); palm.append(sph(trunk, (0.16, 0.05, 0.76), 0.05, seg=8))
props.append(join("palm", palm))
# 11. 구름 뭉치 (구름 트랙)
props.append(join("cloud", [sph(white, (0, 0, 0.3), 0.3, seg=12), sph(white, (0.32, 0.05, 0.26), 0.24, seg=12), sph(white, (-0.3, -0.05, 0.25), 0.22, seg=12), sph(white, (0.05, 0.2, 0.34), 0.2, seg=12)]))
# 12. 풍선 (무지개)
props.append(join("balloon", [cyl(white, (0, 0, 0.3), 0.005, 0.6, v=4), sph(sky, (0, 0, 0.78), 0.2, scale=(1, 1, 1.15), seg=14), cone(sky, (0, 0, 0.56), 0.035, 0.05, v=4)]))
# 나란히 배치(확인용) 후 각자 원점으로 내보내기
for i, o in enumerate(props): o.location = (i * 1.4, 0, 0)
bpy.ops.object.select_all(action='DESELECT')
for o in props: o.select_set(True)
for o in props: o.location = (0, 0, 0)
bpy.ops.export_scene.gltf(filepath=OUT + "/props.glb", export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_materials='EXPORT', export_image_format='NONE', export_animations=False, export_skins=False, export_morph=False, export_texcoords=False, export_normals=True)
result = {"props": [o.name for o in props], "tris": sum(len(o.data.polygons) for o in props)}
''' % OUT
r = call("execute_code", {"code": code}, timeout=1800)
print(json.dumps(r, ensure_ascii=False)[:600])
