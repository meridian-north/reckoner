import {PRACTICE_TASKS} from './practice-tasks.js';

// UI ranges refer to the unchanged baseline. No guessed correction is applied.
const targets={
 'notice-date':'4', 'retention-word':'orlginal', 'signature-date':'Juno',
 'hyphen-join':'ap-\nproved', 'hyphen-glyph':'Aua-\ncostia',
 'proper-name':'Co-\nlumbia', 'fragment-join':'S ect io n',
 'historic-spelling':'intituled', 'intentional-hyphen':'Miami-Dade',
 'quote-normalization':'“record”'
};
export function selectedRange(text,start,end){
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>text.length||end<=start)return null;
 // A single letter needs its word. A digit can stand alone within a number.
 if(end-start===1&&/[\p{L}\p{M}]/u.test(text.slice(start,end))){
  while(start>0&&/[\p{L}\p{M}'’\-]/u.test(text[start-1]))start--;
  while(end<text.length&&/[\p{L}\p{M}'’\-]/u.test(text[end]))end++;
 }
 return {start,end};
}
export function practiceRange(state){
 const task=PRACTICE_TASKS.find(t=>state.sourceImage?.synthetic&&state.context?.sourceFile===(t.sourceFile||'example.svg')&&state.context?.locator===t.locator&&state.draft?.original===t.original);
 if(!task)return null;
 const target=targets[task.id]||task.original,start=task.original.indexOf(target);
 return {start,end:start+target.length,taskId:task.id};
}
export function focusedValue(original,proposed,range){
 if(!range)return null;
 const before=original.slice(0,range.start),after=original.slice(range.end);
 if(!proposed.startsWith(before)||!proposed.endsWith(after)||proposed.length<before.length+after.length)return null;
 return {before,after,value:proposed.slice(before.length,after.length?proposed.length-after.length:undefined)};
}
export function replaceFocused(original,range,value){return original.slice(0,range.start)+value+original.slice(range.end);}

export function installFocusedReading(doc,{getState}){
 const original=doc.getElementById('original'),proposed=doc.getElementById('proposed');
 const box=doc.createElement('section');box.id='focused-reading';box.hidden=true;
 const help=doc.createElement('p');help.id='focused-reading-help';help.className='helper';help.textContent='Edit only the boxed text. The surrounding passage is read-only and stays in your saved reading.';
 const passage=doc.createElement('div');passage.id='focused-reading-context';
 const before=doc.createElement('span'),after=doc.createElement('span'),input=doc.createElement('textarea');input.id='focused-reading-input';input.rows=1;input.spellcheck=false;input.setAttribute('aria-label','Your reading of the boxed text');input.setAttribute('aria-describedby',help.id);
 passage.append(before,input,after);box.append(help,passage);proposed.after(box);
 const choose=doc.createElement('button');choose.id='edit-selected-reading';choose.type='button';choose.className='quiet';choose.textContent='Edit selected word or passage';choose.title='Select text in the baseline above, then choose this action';original.after(choose);
 const status=doc.createElement('p');status.id='focused-reading-status';status.setAttribute('role','status');choose.after(status);
 let range=null,manual=null,owner=null,parts=null;
 const target=()=>{if(range?.taskId==='notice-date')doc.dispatchEvent(new CustomEvent('reckoner-focus-target',{detail:{taskId:range.taskId}}));};
 function size(){input.style.width=Math.min(38,Math.max(3,input.value.split('\n').reduce((n,line)=>Math.max(n,line.length),0)+1))+'ch';input.rows=Math.min(6,Math.max(1,input.value.split('\n').length));}
 function refresh(){
  const state=getState(),key=state.id+'\n'+state.draft.original;
  if(owner!==key){owner=key;manual=null;}
  range=manual||practiceRange(state);parts=focusedValue(state.draft.original,state.draft.proposed,range);
  box.hidden=!parts;proposed.hidden=!!parts;
  const label=doc.querySelector('label[for="proposed"],label[for="focused-reading-input"]');if(label)label.htmlFor=parts?input.id:'proposed';
  if(parts){original.readOnly=true;before.textContent=parts.before;after.textContent=parts.after;if(input.value!==parts.value)input.value=parts.value;size();}
  status.textContent=range&&!parts?'This draft has edits outside that box. They are preserved in the full editor; select a wider passage above to include them.':'';
 }
 input.addEventListener('input',()=>{if(!parts)return;proposed.value=parts.before+input.value+parts.after;size();proposed.dispatchEvent(new Event('input',{bubbles:true}));});
 input.addEventListener('focus',target);input.addEventListener('click',target);
 choose.addEventListener('click',()=>{
  const state=getState(),picked=selectedRange(original.value,original.selectionStart,original.selectionEnd);
  if(!picked){status.textContent='Select the doubtful text in the baseline first. A single letter selects its whole word.';return;}
  if(!focusedValue(state.draft.original,state.draft.proposed,picked)){status.textContent='Your draft has other changes. Select a range that includes those changes; none have been discarded.';return;}
  manual=picked;refresh();input.focus();
 });
 proposed.addEventListener('input',()=>{if(doc.activeElement!==input)refresh();});
 return {refresh,focus:()=>{(parts?input:proposed).focus();},range:()=>range};
}
