"""Collect license files for the exact Rust dependency graph; run before publishing."""
import json,pathlib,subprocess,shutil,os
root=pathlib.Path(__file__).resolve().parents[1]
meta=json.loads(subprocess.check_output([str(pathlib.Path.home()/'.cargo/bin/cargo'),'metadata','--manifest-path',str(root/'physics/Cargo.toml'),'--format-version','1'],text=True))
out=root/'licenses/rust';out.mkdir(parents=True,exist_ok=True)
rows=[]
for p in meta['packages']:
    source=pathlib.Path(p['manifest_path']).parent
    dest=out/(p['name']+'-'+p['version']);dest.mkdir(exist_ok=True)
    copied=[]
    for f in source.iterdir():
        if f.is_file() and (f.name.lower().startswith(('license','licence','copying','notice'))):
            (dest/f.name).write_text('\n'.join(line.rstrip() for line in f.read_text().splitlines())+'\n');copied.append(f.name)
    rows.append({'name':p['name'],'version':p['version'],'license':p.get('license'),'repository':p.get('repository'),'files':copied})
(out/'DEPENDENCIES.json').write_text(json.dumps(rows,indent=2)+'\n')
print('Collected notices for',len(rows),'Rust crates')
