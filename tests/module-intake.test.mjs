import test from 'node:test';
import assert from 'node:assert/strict';
import {receiveModuleTask} from '../dist/module-intake.js';
const ticket='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
function address(href){const location={href};const history={state:{workspace:'retained'},replaceState(state,title,url){assert.equal(state,this.state);location.href=url;}};return {location,history};}
test('invalid one-shot handoff is consumed without losing workspace, hash or history state',()=>{
 const state=address('http://localhost/index.html?workspace=one&moduleTicket=bad#reading');const messages=[];
 receiveModuleTask({href:state.location.href,...state,notify:m=>messages.push(m)});
 assert.equal(state.location.href,'http://localhost/index.html?workspace=one#reading');assert.match(messages[0],/unavailable/);
});
test('valid handoff requests once, expires once, and reload does not request another transfer',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const old=globalThis.BroadcastChannel;const channels=[];
 globalThis.BroadcastChannel=class{constructor(name){this.name=name;this.sent=[];channels.push(this);}postMessage(p){this.sent.push(p);}close(){this.closed=true;}};
 try{
 const state=address('http://localhost/index.html?workspace=one&moduleTicket='+ticket);const messages=[];
 receiveModuleTask({href:state.location.href,...state,notify:m=>messages.push(m)});
 assert.equal(new URL(state.location.href).searchParams.has('moduleTicket'),false);assert.equal(channels.length,1);assert.equal(channels[0].sent[0].type,'request');
 receiveModuleTask({href:state.location.href,...state,notify:m=>messages.push(m)});assert.equal(channels.length,1);
 t.mock.timers.tick(20000);assert.equal(channels[0].closed,true);assert.equal(messages.length,1);assert.match(messages[0],/expired/);
 }finally{globalThis.BroadcastChannel=old;t.mock.timers.reset();}
});
test('stale receiver cannot rewrite a different task address',()=>{
 const state=address('http://localhost/index.html?workspace=two&moduleTicket=other');
 receiveModuleTask({href:'http://localhost/index.html?moduleTicket=bad',...state,notify:()=>{}});
 assert.equal(new URL(state.location.href).searchParams.get('moduleTicket'),'other');
});
