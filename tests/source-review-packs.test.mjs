import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {parseDataModule,verifyModuleSource} from '../dist/data-module.js';
const root=fileURLToPath(new URL('..',import.meta.url));
for(const name of ['Wildlife','Brownfields','Territorial'])test(name+' pack has intact permitted-source metadata and two unsolved claim-review tasks',async t=>{
 const zip=root+'/dist/resources/Reckoner_'+name+'_Review.zip';
 if(!fs.existsSync(zip)&&fs.existsSync(root+'/BUNDLE_MANIFEST.json')){t.skip('Optional sample packs are separate downloads');return;}
 const content=JSON.parse(execFileSync('python3',['-c',String.raw`
import zipfile,sys,json,base64
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 prefix='Reckoner_'+sys.argv[2]+'_Review/'
 assert all(n.startswith(prefix) and '..' not in n.split('/') for n in z.namelist())
 print(json.dumps({n[len(prefix):]:base64.b64encode(z.read(n)).decode() for n in z.namelist()}))
`,zip,name],{encoding:'utf8',maxBuffer:8*1024*1024}));
 const bytes=Object.fromEntries(Object.entries(content).map(([k,v])=>[k,Buffer.from(v,'base64')]));
 const sums=JSON.parse(bytes['CHECKSUMS.json']);assert.equal(sums.algorithm,'SHA-256');assert.equal(sums.files.length,Object.keys(bytes).length-1);
 for(const pin of sums.files){assert.equal(bytes[pin.file].length,pin.bytes);assert.equal(createHash('sha256').update(bytes[pin.file]).digest('hex'),pin.sha256);}
 const module=parseDataModule(bytes['MODULE.json'].toString());assert.equal(module.items.length,2);
 const provenance=JSON.parse(bytes['PROVENANCE.json']);assert.match(provenance.evidence_status,/No confirmed archive defect/);assert.match(provenance.task_author,/AI-written/);
 assert.match(bytes['OPEN.txt'].toString(),/MODULE.json/);assert.match(bytes['RIGHTS.txt'].toString(),/No institutional endorsement/);
 for(const item of module.items){assert.equal(item.baselineKind,'claim');const b=bytes[item.source.path];assert.ok(b);const file={name:item.source.path.split('/').at(-1),size:b.length,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};const verified=await verifyModuleSource(item,file,async value=>createHash('sha256').update(new Uint8Array(value)).digest('hex'));assert.equal(verified.sha256,provenance.sha256);}
 if(name==='Brownfields')assert.match(module.reuseStatement,/not relicensed.*MIT/);
});
