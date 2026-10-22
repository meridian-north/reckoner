import test from 'node:test';import assert from 'node:assert/strict';
import {initPageMap} from '../dist/page-map.js';
function fixture(){
 const map=new Map(),events={};let focused=null;
 class El{
  constructor(tag){this.tag=tag;this.children=[];this.events={};this.attrs={};this.style={};this.hidden=false;const classes=new Set();this.classList={toggle(c){if(classes.has(c)){classes.delete(c);return false;}classes.add(c);return true;}};}
  append(...nodes){nodes.forEach(n=>{n.parent=this;this.children.push(n);if(n.id)map.set(n.id,n);});}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
  fire(k,e={}){for(const fn of this.events[k]||[])fn({preventDefault(){},...e});}
  click(){this.clicks=(this.clicks||0)+1;this.fire('click');}
  focus(){focused=this;}
  scrollIntoView(){this.scrolled=true;}
  closest(){for(let n=this;n;n=n.parent)if(n.hidden)return n;return null;}
  contains(target){for(let n=target;n;n=n.parent)if(n===this)return true;return false;}
 }
 const make=id=>{const n=new El('div');n.id=id;map.set(id,n);return n;};
 for(const p of ['reading','context','history','contexts']){make(p);make('tab-'+p);}
 make('mentor-notice').append(make('read-mentor-guidance'));
 const doc={body:new El('body'),getElementById:id=>map.get(id),createElement:tag=>new El(tag),addEventListener:(k,fn)=>(events[k]??=[]).push(fn),querySelector:()=>null};
 return {doc,map,events,focused:()=>focused};
}
test('menu jumps through existing section tabs without invoking save controls',()=>{
 const f=fixture(),ui=initPageMap(f.doc);ui.toggle.click();assert.equal(ui.panel.hidden,false);
 ui.links[2].click();assert.equal(f.map.get('tab-history').clicks,1);assert.equal(f.map.get('history').scrolled,true);assert.equal(f.focused(),f.map.get('history'));assert.equal(ui.panel.hidden,true);
 assert.equal(f.map.get('tab-reading').clicks,undefined);
});
test('slider, reset and enlarged menu change only navigation appearance',()=>{
 const f=fixture(),ui=initPageMap(f.doc);ui.slider.value='140';ui.slider.fire('input');assert.equal(ui.panel.style.fontSize,'140%');
 ui.enlarge.click();assert.equal(ui.enlarge.attrs['aria-pressed'],'true');ui.normal.click();assert.equal(ui.slider.value,'100');assert.equal(ui.panel.style.fontSize,'100%');
 ui.enlarge.click();assert.equal(ui.enlarge.attrs['aria-pressed'],'false');assert.equal(f.map.get('tab-history').clicks,undefined);
});
test('Escape closes menu and restores opener; modal owns its own Escape',()=>{
 const f=fixture(),ui=initPageMap(f.doc);ui.toggle.click();let prevented=false;
 for(const fn of f.events.keydown)fn({key:'Escape',preventDefault(){prevented=true;},stopPropagation(){}});
 assert.equal(prevented,true);assert.equal(ui.panel.hidden,true);assert.equal(f.focused(),ui.toggle);
 ui.toggle.click();f.doc.querySelector=()=>({open:true});for(const fn of f.events.keydown)fn({key:'Escape'});assert.equal(ui.panel.hidden,false);
});
test('mentor navigation uses existing guidance control and disables if absent',()=>{
 const f=fixture(),ui=initPageMap(f.doc);f.map.get('mentor-notice').hidden=true;ui.toggle.click();assert.equal(ui.mentor.disabled,true);
 ui.setOpen(false);f.map.get('mentor-notice').hidden=false;ui.toggle.click();assert.equal(ui.mentor.disabled,false);ui.mentor.click();assert.equal(f.map.get('read-mentor-guidance').clicks,1);
});
test('outside click dismisses without stealing focus; init is idempotent',()=>{
 const f=fixture(),ui=initPageMap(f.doc);ui.toggle.click();const prior=f.focused();for(const fn of f.events.click)fn({target:{}});assert.equal(ui.panel.hidden,true);assert.equal(f.focused(),prior);assert.equal(initPageMap(f.doc),null);
});
test('menu belongs to the header so keyboard users reach it near the start',()=>{
 const f=fixture(),header=f.doc.createElement('header');f.doc.querySelector=s=>s==='body > header'?header:null;
 const ui=initPageMap(f.doc);assert.equal(ui.toggle.parent.parent,header);assert.equal(f.doc.body.children.length,0);
});
