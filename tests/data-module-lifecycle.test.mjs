import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const source=fs.readFileSync(new URL('../dist/data-module-ui.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
async function setup(){
 const nodes=new Map(),channels=[],timers=[];let uuid=0;const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',disabled:false,hidden:false,replaceChildren(){},append(){}});return nodes.get(id);};
 const module={title:'Synthetic',reuseStatement:'Synthetic test only',items:[{id:'one',title:'Task',question:'Claim?',baseline:'Claim',baselineKind:'claim',source:{path:'a.txt',bytes:1,sha256:'x'}}]};
 const context=vm.createContext({document:{getElementById:node,createElement:()=>({})},parseDataModule:()=>module,MAX_MODULE_BYTES:1048576,TextDecoder,URL,location:{href:'http://localhost/data-module.html'},crypto:{randomUUID:()=>String(++uuid)},digest:()=>{},verifyModuleSource:async()=>({buffer:new ArrayBuffer(1),mime:'text/plain'}),selectedSources:()=>new Map(),File:class{},BroadcastChannel:class{constructor(name){this.name=name;channels.push(this);}postMessage(){}close(){this.closed=true;}},window:{open:()=>({document:{body:{}},location:{replace(){}},closed:false})},setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout:()=>{}});
 vm.runInContext(source,context);await node('module-manifest').onchange({target:{files:[{size:1,arrayBuffer:async()=>new ArrayBuffer(1)}],value:''}});node('module-single').onchange({target:{files:[{name:'a.txt'}],value:''}});
 async function open(){await node('module-review').onclick();return channels.at(-1);}
 function message(channel,type){channel.onmessage({data:{ticket:channel.name.split(':')[1],type,message:'late failure'}});}
 return {node,channels,timers,open,message};
}
test('completed module handoff ignores queued late messages and cannot unlock a newer transfer',async()=>{
 const s=await setup(),first=await s.open();s.message(first,'accepted');const status=s.node('module-status').textContent;s.message(first,'refused');assert.equal(s.node('module-status').textContent,status);
 await s.open();assert.equal(s.node('module-manifest').disabled,true);s.message(first,'accepted');assert.equal(s.node('module-manifest').disabled,true);assert.match(s.node('module-status').textContent,/Checking/);
});
test('expired module handoff ignores late acknowledgements during a retry',async()=>{
 const s=await setup(),first=await s.open();s.timers[0]();assert.match(s.node('module-status').textContent,/No review acknowledgement/);await s.open();s.message(first,'accepted');assert.equal(s.node('module-manifest').disabled,true);assert.match(s.node('module-status').textContent,/Checking/);
});
