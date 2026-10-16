"""Run with Blender: blender -b --python tools/export-character.py -- SOURCE.blend OUTPUT.glb"""
import sys
from pathlib import Path
import bpy

source, output = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.open_mainfile(filepath=str(Path(source).resolve()))
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
print('RIG', arm.name, [b.name for b in arm.pose.bones])
# Rigid segments become one skin with a weight of 1 per segment, preserving the
# existing owner's geometry/materials while reducing per-frame draw overhead.
arm.animation_data_clear()
for b in arm.pose.bones:
    b.location = (0, 0, 0)
    b.rotation_euler = (0, 0, 0)
    for c in list(b.constraints):
        b.constraints.remove(c)
bpy.context.view_layer.update()
meshes = []
for ob in list(bpy.context.scene.objects):
    if ob.type != 'MESH' or ob.parent != arm:
        continue
    bone, matrix = ob.parent_bone if ob.parent_type == 'BONE' else None, ob.matrix_world.copy()
    ob.animation_data_clear()
    ob.parent = None
    ob.matrix_world = matrix
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if ob.data.shape_keys:
        ob.shape_key_clear()
    if bone:
        group = ob.vertex_groups.new(name=bone)
        group.add(list(range(len(ob.data.vertices))), 1, 'REPLACE')
    for modifier in list(ob.modifiers):
        ob.modifiers.remove(modifier)
    meshes.append(ob)
bpy.ops.object.select_all(action='DESELECT')
for ob in meshes:
    ob.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.join()
body = bpy.context.object
body.name = 'GoosnavPS1Guy'
mod = body.modifiers.new('Rig', 'ARMATURE')
mod.object = arm
body.parent = arm
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
arm.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(Path(output).resolve()), export_format='GLB',
                         use_selection=True, export_animations=False, export_yup=True,
                         export_skins=True, export_morph=False)
print('EXPORTED', len(body.data.vertices), 'vertices', len(body.data.polygons), 'polygons')
