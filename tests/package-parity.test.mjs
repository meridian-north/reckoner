import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
test('downloaded bundle retains identical functional files and explicit complete offline downloads page',()=>{
 const root=fileURLToPath(new URL('..',import.meta.url));const code=String.raw`
import sys,runpy,pathlib,tempfile,zipfile,json,hashlib,re
root=pathlib.Path(sys.argv[1]);(root/'.build').mkdir(exist_ok=True);m=runpy.run_path(str(root/'scripts/package-release.py'));out=pathlib.Path(tempfile.mkdtemp(prefix='parity-',dir=root/'.build'))/'review.zip';m['package'](out)
with zipfile.ZipFile(out) as z:
 names=z.namelist();assert not any(n.lower().endswith('.zip') or 'white_paper' in n.lower() or 'whitepaper' in n.lower() or n.endswith('/ASSET_MANIFEST.json') for n in names)
 manifest=json.loads(z.read('reckoner/BUNDLE_MANIFEST.json'));listed={e['path']:e for e in manifest['files']};assert len(listed)==len(names)-1
 for name,pin in listed.items():
  data=z.read('reckoner/'+name);assert len(data)==pin['bytes'] and hashlib.sha256(data).hexdigest()==pin['sha256']
 count=0
 for source in (root/'dist').iterdir():
  if source.is_file() and source.name!='downloads.html':
   assert z.read('reckoner/dist/'+source.name)==source.read_bytes(),source.name;count+=1
 page=z.read('reckoner/dist/downloads.html');assert page==z.read('reckoner/scripts/package-downloads.html')
 assert b'no second ZIP is needed' in page and b'Reckoner_Contribution_Review.zip' not in page
 assert manifest['projections']==[{'path':'dist/downloads.html','sourcePath':'scripts/package-downloads.html','operation':'byte_exact_alias','sha256':hashlib.sha256(page).hexdigest()}]
 for href in re.findall(r'href="([^"]+)"',page.decode()):
  assert not href.startswith(('http:','https:','javascript:'))
  assert '..' not in pathlib.PurePosixPath(href).parts,'link leaves dist/, unreachable when dist/ is served: '+href
  target=pathlib.PurePosixPath('reckoner/dist')/href
  normalized=[]
  for part in target.parts:
   if part=='..':normalized.pop()
   else:normalized.append(part)
  assert '/'.join(normalized) in names,href
 extracted=out.parent/'extracted';z.extractall(extracted);second=out.parent/'rebuilt.zip';rebuild=runpy.run_path(str(extracted/'reckoner/scripts/package-release.py'));rebuild['package'](second);assert second.read_bytes()==out.read_bytes(),'Extracted bundle rebuild differs'
 print(json.dumps({'functionalFilesIdentical':count,'manifestFiles':len(listed),'downloadsLinksResolved':True,'reproducibleRebuild':True}))
`;
 const lines=execFileSync('python3',['-c',code,root],{encoding:'utf8'}).trim().split('\n');const result=JSON.parse(lines.at(-1));assert.ok(result.functionalFilesIdentical>=30);assert.equal(result.downloadsLinksResolved,true);
});
