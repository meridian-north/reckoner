import test from 'node:test';
import assert from 'node:assert/strict';
import {PRACTICE_TASKS} from '../dist/practice-tasks.js';
import {exampleSteps,installExampleWalkthrough} from '../dist/example-walkthrough.js';

// A small event-capable document for exercising guide actions without a browser.
function guideDocument(taskId='notice-date'){
 const nodes=new Map();let doc;
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.hidden=false;this.disabled=false;this.open=false;this.textContent='';this.value='';}
  set id(id){this._id=id;nodes.set(id,this);}get id(){return this._id;}
  append(...children){this.children.push(...children);}
  setAttribute(){}addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  dispatchEvent(event){event.target??=this;for(const fn of this.listeners[event.type]||[])fn(event);}
  click(){if(!this.disabled)this.dispatchEvent({type:'click'});}
  focus(){doc.activeElement=this;}showModal(){this.open=true;}
  close(){if(!this.open)return;this.open=false;this.dispatchEvent({type:'close'});}
  getBoundingClientRect(){return {left:20,right:620,top:20,bottom:500};}
 }
 doc=new Element('document');doc.createElement=tag=>new Element(tag);doc.getElementById=id=>nodes.get(id);doc.documentElement={dataset:{exampleTask:taskId}};doc.body=new Element('body');
 for(const [id,value]of Object.entries({proposed:'A visitor’s unfinished answer',reason:'A visitor’s reason',contributor:'Synthetic visitor',assistance:'Actual assistance only','save-revision':''})){const node=new Element('input');node.id=id;node.value=value;}
 const tab=new Element('button');tab.id='tab-reading';const host=new Element('nav');return {doc,host,nodes};
}

test('every exercise has two distinct hints followed by its own proposed answer and honest saving guidance',()=>{
 const firstHints=new Set();
 for(const task of PRACTICE_TASKS){const steps=exampleSteps(task.id);assert.equal(steps.length,6);assert.ok(steps[0].text.length>35);assert.notEqual(steps[0].text,steps[1].text);firstHints.add(steps[0].text);assert.equal(steps[2].answer,task.proposed);assert.equal(steps[2].text,task.reason);assert.equal(steps.filter(step=>step.answer!==undefined).length,1);assert.match(steps[3].text,/assistance you actually used/);assert.match(steps[4].text,/does not share your edits/);assert.match(steps[5].text,/do not prove a reading is correct or who wrote it/);}
 assert.equal(firstHints.size,14);assert.throws(()=>exampleSteps('not-a-task'),/Unknown/);
});

test('unchanged and uncertain examples teach preservation rather than forcing a correction',()=>{
 for(const id of ['historic-spelling','intentional-hyphen','ambiguous-layout','quote-normalization']){const task=PRACTICE_TASKS.find(t=>t.id===id);assert.equal(exampleSteps(id)[2].answer,task.original);}
 assert.match(exampleSteps('ambiguous-layout')[1].text,/uncertainty/);
});

test('saving guidance distinguishes the visitor’s browser and downloaded history from the shared GitHub examples',()=>{
 const text=exampleSteps('notice-date')[4].text;assert.match(text,/does not write them back to GitHub or change the shared examples/);assert.match(text,/downloads the JSON history to your device/);assert.match(text,/clearing browser data can remove local work/);
});

test('viewing every step, going back and closing leaves the visitor’s fields untouched',()=>{
 const {doc,host,nodes}=guideDocument();const before=[...nodes].map(([id,node])=>[id,node.value]);const {dialog,trigger}=installExampleWalkthrough(doc,host);const [previous,next,close]=dialog.children.at(-1).children;
 assert.equal(trigger.hidden,false);trigger.click();assert.equal(dialog.open,true);assert.equal(previous.disabled,true);
 for(let i=0;i<6;i++){assert.equal(nodes.get('example-walkthrough-status').textContent,`Step ${i+1} of 6`);assert.equal(nodes.get('example-walkthrough-answer').hidden,i!==2);if(i<5)next.click();}
 previous.click();assert.match(nodes.get('example-walkthrough-status').textContent,/Step 5/);close.click();assert.equal(dialog.open,false);assert.equal(doc.activeElement,trigger);
 assert.deepEqual(before,[...before].map(([id])=>[id,nodes.get(id).value]));
});

test('Try it yourself returns to the reading field without applying an answer',()=>{
 const {doc,host,nodes}=guideDocument();const {dialog,trigger}=installExampleWalkthrough(doc,host);const next=dialog.children.at(-1).children[1];trigger.click();for(let i=0;i<6;i++)next.click();assert.equal(dialog.open,false);assert.equal(doc.activeElement,nodes.get('proposed'));assert.equal(nodes.get('proposed').value,'A visitor’s unfinished answer');
});

test('a changed source closes and hides the guide; a newly selected example uses its own hints',()=>{
 const {doc,host,nodes}=guideDocument();const {dialog,trigger}=installExampleWalkthrough(doc,host);trigger.click();doc.dispatchEvent({type:'reckoner-example-changed',detail:{taskId:null}});assert.equal(dialog.open,false);assert.equal(trigger.hidden,true);assert.equal(nodes.get('save-revision').textContent,'Save reading');
 doc.dispatchEvent({type:'reckoner-example-changed',detail:{taskId:'column-order'}});assert.equal(trigger.hidden,false);trigger.click();assert.equal(nodes.get('example-walkthrough-title').textContent,PRACTICE_TASKS.find(t=>t.id==='column-order').title);assert.equal(nodes.get('example-walkthrough-text').textContent,exampleSteps('column-order')[0].text);assert.equal(nodes.get('save-revision').textContent,'Save my reading');
});

test('only a click outside the dialog bounds dismisses the guide',()=>{
 const {doc,host}=guideDocument();const {dialog,trigger}=installExampleWalkthrough(doc,host);trigger.click();dialog.dispatchEvent({type:'click',clientX:40,clientY:40});assert.equal(dialog.open,true);dialog.dispatchEvent({type:'click',clientX:0,clientY:0});assert.equal(dialog.open,false);assert.equal(doc.activeElement,trigger);
});

test('Tab and Shift-Tab wrap between enabled guide controls',()=>{
 const {doc,host}=guideDocument();const {dialog,trigger}=installExampleWalkthrough(doc,host);const [previous,next,close]=dialog.children.at(-1).children;trigger.click();let prevented=0;const tab=shiftKey=>dialog.dispatchEvent({type:'keydown',key:'Tab',shiftKey,preventDefault(){prevented++;}});
 tab(true);assert.equal(doc.activeElement,close);tab(false);assert.equal(doc.activeElement,next);next.click();previous.focus();tab(true);assert.equal(doc.activeElement,close);tab(false);assert.equal(doc.activeElement,previous);assert.equal(prevented,4);
});
