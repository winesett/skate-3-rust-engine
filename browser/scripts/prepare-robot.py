"""Reproduce Bolt from the pinned CC0 RobotExpressive asset; repair FBX skin sums."""
import hashlib,json,pathlib,struct,urllib.request
URL='https://raw.githubusercontent.com/mrdoob/three.js/739478bc5ac18509be78095ed8f2fa4403b8207e/examples/models/gltf/RobotExpressive/RobotExpressive.glb'
SOURCE_SHA='047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319'
blob=bytearray(urllib.request.urlopen(URL).read())
assert hashlib.sha256(blob).hexdigest()==SOURCE_SHA,'Upstream bytes changed'
size=struct.unpack_from('<I',blob,12)[0]
doc=json.loads(blob[20:20+size]);binary=20+size+8
accessors={p['attributes'][k] for m in doc['meshes'] for p in m['primitives'] for k in p['attributes'] if k.startswith('WEIGHTS_')}
repaired=0
for index in accessors:
    accessor=doc['accessors'][index];view=doc['bufferViews'][accessor['bufferView']]
    assert accessor['componentType']==5126 and accessor['type']=='VEC4'
    assert not ('min' in accessor or 'max' in accessor),'Update accessor bounds if source changes'
    offset=binary+view.get('byteOffset',0)+accessor.get('byteOffset',0)
    for i in range(accessor['count']):
        address=offset+i*view.get('byteStride',16)
        weights=struct.unpack_from('<4f',blob,address);total=sum(weights)
        if abs(total-1.)>1e-6:
            assert total>0
            struct.pack_into('<4f',blob,address,*(w/total for w in weights));repaired+=1
out=pathlib.Path(__file__).resolve().parents[2]/'assets/characters/custom/quaternius/robot-expressive.glb'
out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(blob)
print(f'Normalized {repaired} skin-weight rows; output SHA-256 {hashlib.sha256(blob).hexdigest()}')
