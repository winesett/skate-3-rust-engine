import json,struct,base64,pathlib
positions=[];normals=[];indices=[]
def box(center,size):
 for n,vs in [((1,0,0),[(1,-1,-1),(1,1,-1),(1,1,1),(1,-1,1)]),((-1,0,0),[(-1,-1,1),(-1,1,1),(-1,1,-1),(-1,-1,-1)]),((0,1,0),[(-1,1,-1),(-1,1,1),(1,1,1),(1,1,-1)]),((0,-1,0),[(-1,-1,1),(-1,-1,-1),(1,-1,-1),(1,-1,1)]),((0,0,1),[(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]),((0,0,-1),[(1,-1,-1),(-1,-1,-1),(-1,1,-1),(1,1,-1)])]:
  b=len(positions)
  for p in vs:positions.append([center[i]+p[i]*size[i]/2 for i in range(3)]);normals.append(n)
  indices.extend([b,b+1,b+2,b,b+2,b+3])
box([0,-.15,0],[24,.3,32]);box([4,.2,3],[3,.4,6])
blob=bytearray();views=[];access=[]
def acc(data,fmt,typ,component):
 while len(blob)%4:blob.append(0)
 off=len(blob);flat=[v for a in data for v in a] if isinstance(data[0],(list,tuple)) else data;blob.extend(struct.pack('<'+fmt*len(flat),*flat));views.append({'buffer':0,'byteOffset':off,'byteLength':len(blob)-off});a={'bufferView':len(views)-1,'componentType':component,'count':len(data),'type':typ}
 if typ=='VEC3':a.update(min=[min(v[i] for v in data)for i in range(3)],max=[max(v[i]for v in data)for i in range(3)])
 access.append(a);return len(access)-1
pos=acc(positions,'f','VEC3',5126);normal=acc(normals,'f','VEC3',5126);ind=acc(indices,'H','SCALAR',5123)
g={'asset':{'version':'2.0','generator':'SkatePlus original CC0 import sandbox'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':'Sandbox','mesh':0}],'meshes':[{'primitives':[{'attributes':{'POSITION':pos,'NORMAL':normal},'indices':ind,'material':0}]}],'materials':[{'pbrMetallicRoughness':{'baseColorFactor':[.48,.6,.52,1],'metallicFactor':0,'roughnessFactor':.9}}],'buffers':[{'byteLength':len(blob),'uri':'data:application/octet-stream;base64,'+base64.b64encode(blob).decode()}],'bufferViews':views,'accessors':access}
(pathlib.Path(__file__).resolve().parents[2]/'assets/environments/custom/import-sandbox.gltf').write_text(json.dumps(g,separators=(',',':')))
