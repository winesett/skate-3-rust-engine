"""Run with Blender --background --python build-city.py. CC0 Kenney kit + original layout."""
import bpy,math,json,pathlib,urllib.request,zipfile,hashlib,tempfile,random
from mathutils import Vector,Matrix
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/environments/custom/junction';OUT.mkdir(parents=True,exist_ok=True)
URL='https://opengameart.org/sites/default/files/kenney_city-kit-commercial_2.1.zip'
SHA='f8b09b081c2bb88bcc126e2dec1cb40fd0dad7e7e591b6c26aaefe96fb35276b'
cache=pathlib.Path(tempfile.gettempdir())/'skateplus-city';cache.mkdir(exist_ok=True)
archive=cache/'city-kit.zip'
if not archive.exists():archive.write_bytes(urllib.request.urlopen(URL).read())
assert hashlib.sha256(archive.read_bytes()).hexdigest()==SHA,'Asset archive differs from pinned source'
kit=cache/'kit'
with zipfile.ZipFile(archive)as z:z.extractall(kit)
(OUT/'Kenney-LICENSE.txt').write_text((kit/'License.txt').read_text().replace('\r\n','\n'))
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(42)
def mat(name,color,rough=1):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
 return m
asphalt=mat('Street asphalt',(.12,.15,.2));concrete=mat('Warm plaza concrete',(.63,.65,.60));stone=mat('Civic limestone',(.69,.65,.54));metal=mat('Dark green metal',(.13,.23,.2),.6);lime=mat('Session lime',(.71,.91,.19));paint=mat('Road paint',(.85,.85,.68));wood=mat('Bench timber',(.43,.21,.12));grass=mat('Planter moss',(.18,.35,.2));leaf=mat('Foliage',(.24,.48,.3));water=mat('Fountain turquoise',(.16,.48,.52),.22)
def proxy(obj,name=None):
 p=obj.copy();p.data=obj.data.copy();bpy.context.collection.objects.link(p);p.name='COLLISION_'+(name or obj.name);return p

def box(name,x,y,z,w,h,d,material,collide=True,cast=True):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.name=('CAST_' if cast else 'NO_SHADOW_')+name;o.dimensions=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 if collide:proxy(o)
 return o

def ramp(name,x,z,w,l,h,reverse=False):
 direction=-1 if reverse else 1
 points=[(-w/2,-direction*l/2,0),(w/2,-direction*l/2,0),(w/2,direction*l/2,h),(-w/2,direction*l/2,h),(-w/2,-direction*l/2,-.2),(w/2,-direction*l/2,-.2),(w/2,direction*l/2,-.2),(-w/2,direction*l/2,-.2)]
 verts=[(x+a,-(z+b),c)for a,b,c in points];faces=[(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7),(0,3,7,4),(1,5,6,2)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('CAST_'+name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(stone)
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False);proxy(o)

def cylinder(name,x,y,z,radius,height,material,collide=False,vertices=12):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=height,location=(x,-z,y));o=bpy.context.object;o.name='CAST_'+name;o.data.materials.append(material)
 if collide:proxy(o)
 return o

def text(name,body,x,y,z,size,material,rotation=0):
 bpy.ops.object.text_add(location=(x,-z,y));o=bpy.context.object;o.name='NO_SHADOW_'+name;o.data.body=body;o.data.size=size;o.data.align_x='CENTER';o.data.extrude=.012;o.rotation_euler=(math.pi/2,0,math.radians(rotation));o.data.materials.append(material);bpy.ops.object.convert(target='MESH')

# A continuous collision floor; thin visual inlays never create snagging seams.
box('City foundation',0,-.2,0,152,.4,152,asphalt,True,False)
box('Plaza paving',0,-.015,0,50,.04,60,concrete,False,False)
for x in [-26,26]:box('Promenade',x,-.01,0,2,.04,72,stone,False,False)
for z in [-32,32]:box('Promenade',0,-.01,z,54,.04,2,stone,False,False)
for x in [-35,35]:
 for z in range(-60,61,8):box('Street dash',x,.012,z,.16,.012,3,paint,False,False)
for z in [-39,39]:
 for x in range(-60,61,8):box('Street dash',x,.012,z,3,.012,.16,paint,False,False)
for x in [-30,30]:
 for z in [-32,32]:
  for dz in range(-3,4):box('Crosswalk',x,.014,z+dz*.65,5,.012,.32,paint,False,False)
# Manual pads, benches, banks, gaps and civic steps.
box('Manual island',-11,.18,-7,5,.36,8,stone);box('Manual coping',-11,.37,-7,5.08,.04,8.08,metal,False)
box('Long ledge',10,.25,0,1.1,.5,9,stone)
for x,z in [(-17,8),(-17,-19),(17,-20),(18,25)]:
 box('Bench seat',x,.47,z,3.4,.16,.65,wood)
 for dx in [-1.3,1.3]:box('Bench leg',x+dx,.2,z,.12,.4,.42,metal)
ramp('Alley bank north',-34,8,10,12,1.4)
box('Alley deck',-34,.7,19,10,1.4,10,concrete)
ramp('Alley bank south',-34,30,10,12,1.4,True)
ramp('Plaza kicker',-9,18,6,6,1.15)
for i in range(6):box('Civic step',18,(i+1)*.09,4+i*.8,10,(i+1)*.18,.8,stone)
box('Civic platform',18,.54,13,10,1.08,10,stone)
ramp('Civic bank',18,24,10,12,1.08,True)
# Rail posts correspond to metadata bars created by the runtime.
rails=[{'a':[0,.55,-14],'b':[0,.55,6]},{'a':[10,.63,-3.8],'b':[10,.63,3.8]},{'a':[-34,.55,-13],'b':[-34,.55,-3]},{'a':[18,1.63,9],'b':[18,1.63,17]}]
for rail in rails:
 a,b=rail['a'],rail['b'];direction=Vector((b[0]-a[0],b[2]-a[2])).normalized()
 for t in [.3,math.dist([a[0],a[2]],[b[0],b[2]])-.3]:
  x,z=a[0]+direction.x*t,a[2]+direction.y*t;base=1.08 if a[1]>1.5 else (.5 if a[0]==10 else 0)
  box('Rail post',x,(base+a[1]-.13)/2,z,.1,a[1]-.13-base,.1,metal)
# Trees and street furniture frame clear skating routes.
for x,z in [(-22,-25),(-22,-14),(-22,0),(-22,22),(23,-26),(23,-12),(24,30),(-12,29),(4,29)]:
 box('Planter',x,.4,z,2.4,.8,2.4,metal)
 box('Soil',x,.815,z,2.1,.04,2.1,grass,False)
 cylinder('Tree trunk',x,2.5,z,.18,4,wood)
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=2.5,location=(x,-z,5.2));o=bpy.context.object;o.name='CAST_Tree crown';o.scale=(1,1,1.25);o.data.materials.append(leaf)
for x,z in [(-28,-24),(28,-24),(-28,24),(28,24),(-42,-4),(42,8)]:
 cylinder('Lamp post',x,3,z,.09,6,metal)
 box('Lamp cap',x,6.05,z,1.3,.18,.5,paint,False)
# Raised fountain deliberately leaves the main grind line open.
cylinder('Fountain stone',-10,.26,5,2.3,.52,stone,True,24)
cylinder('Fountain water',-10,.535,5,1.95,.04,water,False,24)
cylinder('Fountain pedestal',-10,1.05,5,.4,1,stone,True)
text('Welcome','JUNCTION',-15,1.7,-29,1.1,metal,180)
text('Tagline','SKATE YOUR OWN LINE',-15,.65,-29,.32,metal,180)
box('Welcome board',-15,1.35,-29.2,10,2,.18,lime,False)
# Original authored spot markers and landing stripes.
for x,z,label in [(0,-21,'01'),(-34,-23,'02'),(18,-15,'03')]:
 box('Spot marker',x,.02,z,2,.02,1.7,lime,False,False)

# Reuse the actual Kenney building geometry and texture atlas.
shared=None;used=[]
def building(asset,x,z,width,rotation=0):
 global shared
 path=kit/'Models/GLB format'/(asset+'.glb');before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(path));objects=list(set(bpy.data.objects)-before)
 pts=[o.matrix_world@Vector(c)for o in objects if o.type=='MESH'for c in o.bound_box]
 lo=Vector(tuple(min(p[i]for p in pts)for i in range(3)));hi=Vector(tuple(max(p[i]for p in pts)for i in range(3)))
 scale=width/(hi.x-lo.x);centre=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
 transform=Matrix.Translation((x,-z,0))@Matrix.Rotation(math.radians(rotation),4,'Z')@Matrix.Scale(scale,4)@Matrix.Translation(-centre)
 for o in objects:
  if o.type!='MESH':continue
  world=transform@o.matrix_world;o.data=o.data.copy();o.data.transform(world);o.parent=None;o.matrix_world=Matrix.Identity(4);o.name='CAST_Kenney_'+asset
  for i,m in enumerate(o.data.materials):
   if shared is None:shared=m
   o.data.materials[i]=shared
  used.append(asset)
 # Simple closed collision proxies keep facades/decor from snagging the player.
 bpy.context.view_layer.update();pts=[v.co for o in objects if o.type=='MESH' for v in o.data.vertices]
 low=Vector(tuple(min(p[i]for p in pts)for i in range(3)));high=Vector(tuple(max(p[i]for p in pts)for i in range(3)));c=(low+high)/2;d=high-low
 b=box('Building proxy',c.x,c.z,-c.y,d.x,d.z,d.y,metal,False);b.name='COLLISION_Building'

for side in [-1,1]:
 for i,z in enumerate([-53,-30,-8,14,38,58]):
  building(['building-a','building-h','building-k','building-n','building-g','building-m'][i],side*50,z,12 if i!=2 else 17,90 if side==1 else -90)
for side in [-1,1]:
 for i,x in enumerate([-28,-9,11,30]):building(['building-d','building-j','building-f','building-l'][i],x,side*52,13,0 if side==1 else 180)
for x,z,name in [(-68,-41,'a'),(66,40,'b'),(-65,30,'c'),(66,-40,'d'),(-31,70,'e'),(29,-71,'a')]:building('building-skyscraper-'+name,x,z,12)
# Join static visual objects by material to limit draw calls; keep collision separate.
for obj in list(bpy.data.objects):
 if obj.type=='MESH' and not obj.name.startswith('COLLISION_'):
  world=obj.matrix_world.copy();obj.data=obj.data.copy();obj.data.transform(world);obj.parent=None;obj.matrix_world=Matrix.Identity(4)
groups={}
for obj in bpy.data.objects:
 if obj.type!='MESH' or obj.name.startswith('COLLISION_'):continue
 key=('CAST' if obj.name.startswith('CAST_') else 'NO_SHADOW',obj.data.materials[0].name if obj.data.materials else 'none')
 groups.setdefault(key,[]).append(obj)
for (group,material),objects in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for obj in objects:obj.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 if len(objects)>1:bpy.ops.object.join()
 objects[0].name=group+'_'+material
# Babylon glTF loader converts right-handed assets by reflecting X.
# Export that reflection so catalog positions remain in the game's coordinates.
for obj in bpy.data.objects:
 if obj.type=='MESH':obj.matrix_world=Matrix.Diagonal((-1,1,1,1))@obj.matrix_world
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT/'junction-city.glb'),export_format='GLB',export_animations=False,export_yup=True,export_extras=True)
entry={'id':'junction','name':'Junction City','file':'junction/junction-city.glb','scale':1,'rotation':0,'spawn':[0,1,-24],'heading':0,'mood':'sunset','rails':rails,'spots':[{'id':'plaza','name':'Junction Plaza','spawn':[0,1,-24],'heading':0,'hint':'Ollie onto the lime-marked center rail. Manual pads and benches flank the line.'},{'id':'alley','name':'Bank Alley','spawn':[-34,1,-23],'heading':0,'hint':'Build speed along the street, grind the low rail, then carry it over the banks.'},{'id':'civic','name':'Civic Steps','spawn':[18,1,-15],'heading':0,'hint':'Take the six-step gap, or circle behind the platform for a smooth bank approach.'}]}
(OUT/'entry.json').write_text(json.dumps(entry,indent=2)+'\n')
manifest=ROOT/'assets/environments/custom/manifest.json';data=json.loads(manifest.read_text());data['environments']=[entry]+[e for e in data['environments']if e['id']!='junction'];manifest.write_text(json.dumps(data,indent=2)+'\n')
(OUT/'build-info.json').write_text(json.dumps({'kit_sha256':SHA,'used_models':sorted(set(used)),'visual_groups':len(groups),'layout':'Original SkatePlus Junction City','license':'CC0-1.0'},indent=2)+'\n')
print('CITY_READY',OUT/'junction-city.glb',len(groups),'visual groups')
