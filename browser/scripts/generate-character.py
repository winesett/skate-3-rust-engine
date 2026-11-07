"""Original CC0 geometric skater. Generates self-contained skinned GLB with 5 clips."""
import json,struct,math,pathlib
out=pathlib.Path(__file__).resolve().parents[2]/'assets/characters/custom'
out.mkdir(parents=True,exist_ok=True)
bones=[('Hips',None,(0,.88,0)),('Spine',0,(0,1.13,0)),('Head',1,(0,1.52,0)),('LeftUpperArm',1,(0,1.3,-.24)),('LeftForeArm',3,(0,1.04,-.38)),('LeftHand',4,(0,.86,-.42)),('RightUpperArm',1,(0,1.3,.24)),('RightForeArm',6,(0,1.04,.38)),('RightHand',7,(0,.86,.42)),('LeftUpLeg',0,(0,.85,-.2)),('LeftLeg',9,(0,.46,-.26)),('LeftFoot',10,(.04,.1,-.3)),('RightUpLeg',0,(0,.85,.2)),('RightLeg',12,(0,.46,.26)),('RightFoot',13,(.04,.1,.3))]
verts=[];norms=[];colors=[];joints=[];weights=[];indices=[]
# Rigidly weighted cuboids on an articulated skeleton, with bevel-free original geometry.
def box(center,size,bone,color):
    start=len(verts)
    faces=[((1,0,0),[(1,-1,-1),(1,1,-1),(1,1,1),(1,-1,1)]),((-1,0,0),[(-1,-1,1),(-1,1,1),(-1,1,-1),(-1,-1,-1)]),((0,1,0),[(-1,1,-1),(-1,1,1),(1,1,1),(1,1,-1)]),((0,-1,0),[(-1,-1,1),(-1,-1,-1),(1,-1,-1),(1,-1,1)]),((0,0,1),[(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]),((0,0,-1),[(1,-1,-1),(-1,-1,-1),(-1,1,-1),(1,1,-1)])]
    for n,vs in faces:
        base=len(verts)
        for p in vs:
            verts.append([center[i]+p[i]*size[i]/2 for i in range(3)]);norms.append(n);colors.append(color);joints.append([bone,0,0,0]);weights.append([1,0,0,0])
        indices.extend([base,base+1,base+2,base,base+2,base+3])
shirt=[.73,.9,.23,1];pants=[.08,.14,.17,1];skin=[.72,.43,.25,1];shoe=[.92,.94,.84,1]
box((0,1.15,0),(.32,.45,.4),1,shirt);box((0,1.52,0),(.27,.3,.28),2,skin);box((0,1.69,0),(.3,.08,.31),2,pants);box((.15,1.53,0),(.015,.05,.16),2,[.1,.13,.12,1])
for sign,ids in [(-1,(3,4,5,9,10,11)),(1,(6,7,8,12,13,14))]:
    a,b,c,d,e,f=ids
    box((0,1.18,sign*.29),(.14,.28,.15),a,shirt);box((0,.96,sign*.40),(.11,.25,.12),b,skin);box((0,.82,sign*.42),(.13,.13,.13),c,skin)
    box((0,.65,sign*.22),(.19,.42,.20),d,pants);box((0,.28,sign*.28),(.16,.38,.18),e,pants);box((.06,.07,sign*.3),(.30,.13,.20),f,shoe)
g={'asset':{'version':'2.0','generator':'SkatePlus original procedural skater (CC0)'},'scene':0,'scenes':[{'nodes':[0,16]}],'nodes':[],'meshes':[],'skins':[],'materials':[{'name':'Original vertex palette','pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'metallicFactor':0,'roughnessFactor':.85}}],'bufferViews':[],'accessors':[],'animations':[]}
blob=bytearray()
def acc(data,fmt,typ,component,minmax=False):
    while len(blob)%4:blob.append(0)
    offset=len(blob);flat=[v for row in data for v in row] if isinstance(data[0],(list,tuple)) else data
    blob.extend(struct.pack('<'+fmt*len(flat),*flat));vi=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(blob)-offset})
    a={'bufferView':vi,'componentType':component,'count':len(data),'type':typ}
    if minmax:
        a['min']=[min(v[i] for v in data) for i in range(len(data[0]))];a['max']=[max(v[i] for v in data) for i in range(len(data[0]))]
    g['accessors'].append(a);return len(g['accessors'])-1
for i,(name,parent,pos) in enumerate(bones):
    parentpos=bones[parent][2] if parent is not None else (0,0,0)
    node={'name':name,'translation':[pos[k]-parentpos[k] for k in range(3)]}
    children=[j for j,b in enumerate(bones) if b[1]==i]
    if children:node['children']=children
    g['nodes'].append(node)
g['nodes'].append({'name':'SkaterMesh','mesh':0,'skin':0}) # index 15
g['nodes'].append({'name':'Skater','children':[15]}) # 16
ibm=[]
for _,_,p in bones:ibm.append([1,0,0,0,0,1,0,0,0,0,1,0,-p[0],-p[1],-p[2],1])
g['skins'].append({'name':'SkatePlusHumanoid','joints':list(range(len(bones))),'skeleton':0,'inverseBindMatrices':acc(ibm,'f','MAT4',5126)})
g['meshes'].append({'name':'OriginalSkater','primitives':[{'attributes':{'POSITION':acc(verts,'f','VEC3',5126,True),'NORMAL':acc(norms,'f','VEC3',5126),'COLOR_0':acc(colors,'f','VEC4',5126),'JOINTS_0':acc(joints,'H','VEC4',5123),'WEIGHTS_0':acc(weights,'f','VEC4',5126)},'indices':acc(indices,'H','SCALAR',5123),'material':0}]})
for name,amp in [('Idle',.015),('Ride',.045),('Push',.5),('Crouch',.3),('Jump',.16)]:
    times=acc([0.,.25,.5,.75,1.],'f','SCALAR',5126);g['accessors'][times].update({'min':[0.],'max':[1.]})
    anim={'name':name,'samplers':[],'channels':[]}
    for j in [1,3,6,9,10,12,13]:
        values=[]
        for t in [0,.25,.5,.75,1.]:
            angle=amp*math.sin(t*math.pi*2)*(1 if j%2 else -1)
            values.append([0,0,math.sin(angle/2),math.cos(angle/2)])
        a=acc(values,'f','VEC4',5126);idx=len(anim['samplers']);anim['samplers'].append({'input':times,'output':a,'interpolation':'LINEAR'});anim['channels'].append({'sampler':idx,'target':{'node':j,'path':'rotation'}})
    g['animations'].append(anim)
g['buffers']=[{'byteLength':len(blob)}]
j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);blob+=b'\x00'*((-len(blob))%4)
result=struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(blob))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(blob),0x004e4942)+blob
(out/'yard-skater.glb').write_bytes(result)
print(f'Wrote {len(result)} bytes, {len(bones)} bones, {len(g["animations"])} clips')
