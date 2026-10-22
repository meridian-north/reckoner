import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {makeState} from '../dist/core.js';
const source=fs.readFileSync(new URL('../dist/demo-startup.js',import.meta.url),'utf8');
const key='garrison-cairn-workspace-v01',session='11111111-1111-4111-8111-111111111111';
function boot({href='https://example.org/reckoner/',draft=null,last=null,items={},denied=false}={}){
 const entries=new Map(Object.entries(items));if(draft!==null)entries.set(key,typeof draft==='string'?draft:JSON.stringify(draft));if(last!==null)entries.set('reckoner-last-review-url-v1',last);
 const before=[...entries],routes=[];
 vm.runInNewContext(source,{location:{href},URL,crypto:{randomUUID:()=>session},history:{state:{keep:true},replaceState:(state,unused,url)=>routes.push({state,url})},localStorage:{getItem:k=>{if(denied)throw Error('storage denied');return entries.get(k)??null;},setItem:()=>{throw Error('startup must not write drafts');}}});
 assert.deepEqual([...entries],before);return routes;
}
test('fresh visits and an untouched old landing draft open all-examples navigation via the first practice route',()=>{
 for(const draft of [null,makeState()]){const routes=boot({draft});assert.equal(routes.length,1);const u=new URL(routes[0].url);assert.equal(u.pathname,'/reckoner/index.html');assert.equal(u.searchParams.get('practice'),'notice-date');assert.equal(u.searchParams.get('practiceSession'),session);assert.deepEqual(routes[0].state,{keep:true});}
});
test('saved source, draft, context and every history collection prevent automatic demo replacement',()=>{
 const edits=[s=>s.draft.reason='unsaved reason',s=>s.draft.contributor='A reader',s=>s.context.title='My file',s=>s.sourceImage={name:'mine.png'},s=>s.activeRevisionId='saved',...['revisions','reviews','connections','modelRuns','resolutions','contextDefinitions','contextEvents','assertions','assertionReviews'].map(key=>s=>s[key].push({id:'kept'}))];
 for(const edit of edits){const s=makeState();edit(s);assert.equal(boot({draft:s}).length,0);}
 for(const draft of ['invalid JSON','null','{}'])assert.equal(boot({draft}).length,0);
});
test('explicit routes and unavailable storage keep their existing opening behavior',()=>{
 for(const suffix of ['?workspace='+session,'?practice=notice-date&practiceSession='+session,'?discovery=notes','?moduleTicket=task','?openBackup=1','#reading'])assert.equal(boot({href:'https://example.org/reckoner/index.html'+suffix}).length,0);
 assert.equal(boot({denied:true}).length,0);
});
test('returning practice users resume their exact retained draft; untrusted or other-work URLs are left alone',()=>{
 const last='https://example.org/reckoner/index.html?practice=notice-date&practiceSession='+session,items={['reckoner-practice:notice-date:'+session]:'retained bytes'};
 assert.equal(boot({last,items})[0].url,last);
 for(const url of [last.replace('example.org','other.invalid'),last+'&workspace='+session,last.replace('index.html','../index.html'),'https://example.org/reckoner/index.html?workspace='+session])assert.equal(boot({last:url,items}).length,0);
 assert.equal(boot({last}).length,0);
});
test('startup runs synchronously before app modules read the route',()=>{
 const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
 assert.ok(html.indexOf('<script src="demo-startup.js"></script>')<html.indexOf('type="module" src="app.js"'));
});
