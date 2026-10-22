import {PRACTICE_TASKS} from './practice-tasks.js';
// Viewing guidance only. Never changes source bytes, readings, history or decisions.
export const PASSAGES = Object.freeze({
 ...Object.fromEntries(PRACTICE_TASKS.filter(t=>t.box).map(t=>[t.id,{question:t.question,box:t.box,answer:t.reason}])),
 'notice-date':{question:'Does the highlighted notice say 14 June or 17 June?',box:[.142,.375,.020,.030],viewBox:[.11,.365,.31,.05],answer:'The printed notice says 17 June 1912. The practice machine reading says 14 June. Check the final digit against the highlighted line.'},
 'retention-word':{question:'Does the highlighted word read “orlginal” or “original”?',box:[.11,.50,.40,.055],answer:'The printed sentence says “the original record.” The practice machine reading substitutes l for i.'},
 'signature-date':{question:'Does the highlighted signature date say June or Juno?',box:[.11,.70,.30,.05],answer:'The signature date says 4 June 1912. It is separate from the meeting date above.'}
});
export function initPassage(doc){
 const image=doc.getElementById('scan-image'),stage=doc.getElementById('image-stage'),reading=doc.getElementById('reading');if(!image||!stage||!reading)return;
 let id=new URL(globalThis.location.href).searchParams.get('practice');let task=PASSAGES[id];
 const pageProportions=()=>{if(image.naturalWidth&&image.naturalHeight)reading.style.setProperty('--source-aspect',String(Math.max(.25,Math.min(4,image.naturalWidth/image.naturalHeight))));};image.addEventListener('load',pageProportions);pageProportions();
 const proposed=doc.getElementById('proposed'),proposalHeading=reading.querySelector('.section-heading.secondary h2');
 const comparison=doc.createElement('p');comparison.id='disputed-text-comparison';comparison.className='disputed-comparison';comparison.setAttribute('aria-live','polite');proposed.before(comparison);
 const renderDisputed=()=>{comparison.replaceChildren();if(id!=='notice-date'||!task)return;for(const [label,value] of [['Machine-read text: ',doc.getElementById('original').value],['Your reading: ',proposed.value]]){const match=/(14|17)(?= June 1912)/.exec(value);if(!match)continue;const row=doc.createElement('span');row.append(doc.createTextNode(label));const mark=doc.createElement('mark');mark.textContent=match[0];row.append(mark,doc.createTextNode(' June 1912'));comparison.append(row);}};
 proposed.addEventListener('input',renderDisputed);
 const clearPair=()=>{proposed.classList.remove('source-paired');if(proposalHeading)proposalHeading.textContent='Your reading';};
 doc.addEventListener('reckoner-source-region',event=>{
  if(!event.detail?.box)return;proposed.classList.add('source-paired');
  if(proposalHeading)proposalHeading.textContent='Your reading';renderDisputed();
  if(event.detail.activate){
   const patterns={'notice-date':/(?:14|17)(?= June 1912)/,'retention-word':/or(?:l|i)ginal/,'signature-date':/4 Jun[eo] 1912/};
   const match=task&&patterns[id||'notice-date']?.exec(proposed.value);
   if(match){proposed.focus({preventScroll:true});proposed.setSelectionRange(match.index,match.index+match[0].length);}
  }
 });
 doc.addEventListener('reckoner-hocr-word',()=>{proposed.classList.add('source-paired');if(proposalHeading)proposalHeading.textContent='Your reading of the highlighted word · edit here';});
 doc.getElementById('source-image')?.addEventListener('change',clearPair);
 for(const key of ['new-workspace','import-button','open-document'])doc.getElementById(key)?.addEventListener('click',clearPair);

 const card=doc.createElement('section');card.id='passage-task';card.setAttribute('aria-label','Passage to check');card.hidden=true;
 const title=doc.createElement('h2');title.textContent='Your task';const question=doc.createElement('p');question.id='passage-question';
 const note=doc.createElement('p');note.textContent='Compare the marked line with the machine-read text. Explain your proposed reading before saving. Synthetic practice; not an archival record.';
 const reveal=doc.createElement('details'),summary=doc.createElement('summary'),answer=doc.createElement('p');summary.textContent='Show practice explanation · AI-written';reveal.append(summary,answer);
 const focus=doc.createElement('button');focus.type='button';focus.className='quiet';focus.textContent='Show highlighted passage';
 card.append(title,question,note,focus,reveal);reading.querySelector('.transcript').prepend(card);
 const mark=doc.createElement('button');mark.type='button';mark.id='passage-highlight';mark.hidden=true;mark.setAttribute('aria-controls','proposed');mark.title='Review this highlighted passage';mark.addEventListener('click',()=>{if(task)doc.dispatchEvent(new CustomEvent('reckoner-source-region',{detail:{box:task.box,viewBox:task.viewBox,question:task.question,activate:true}}));(doc.getElementById('focused-reading-input')&&!doc.getElementById('focused-reading')?.hidden?doc.getElementById('focused-reading-input'):doc.getElementById('proposed'))?.focus({preventScroll:true});});stage.append(mark);
 doc.addEventListener('reckoner-module-region',event=>{id=null;task=event.detail?.box?{module:true,box:event.detail.box,question:event.detail.question,answer:'Module-supplied region; check its correspondence against the source.'}:null;renderDisputed();render();});
 doc.addEventListener('reckoner-hocr-word',()=>{task=null;render();});
 doc.addEventListener('reckoner-focus-target',()=>{if(task&&id==='notice-date')render();});
 const render=()=>{if(!task||image.hidden||!image.complete||!image.naturalWidth){card.hidden=true;mark.hidden=true;return;}card.hidden=false;mark.hidden=false;question.textContent=task.question;answer.textContent=task.answer;reveal.hidden=!!task.module;note.textContent=task.module?'Module-supplied region; check its correspondence against the selected source.':'Compare the marked line with the machine-read text. Explain your proposed reading before saving. Synthetic practice; not an archival record.';mark.setAttribute('aria-label','Highlighted passage: '+task.question);const [x,y,w,h]=task.box;mark.style.left=(image.offsetLeft+x*image.clientWidth)+'px';mark.style.top=(image.offsetTop+y*image.clientHeight)+'px';mark.style.width=(w*image.clientWidth)+'px';mark.style.height=(h*image.clientHeight)+'px';doc.dispatchEvent(new CustomEvent('reckoner-source-region',{detail:{box:task.box,viewBox:task.viewBox,question:task.question}}));};
 doc.addEventListener('reckoner-practice-restored',event=>{const ids={'Notice paragraph, line 2':'notice-date','Retention sentence, lower half of the notice':'retention-word','Date below Council clerk':'signature-date'};id=ids[event.detail?.locator]||PRACTICE_TASKS.find(t=>t.locator===event.detail?.locator)?.id;task=PASSAGES[id];renderDisputed();render();});
 const locate=()=>{render();if(mark.hidden)return;stage.scrollTop=Math.max(0,parseFloat(mark.style.top)-stage.clientHeight*.35);card.scrollIntoView({block:'start'});};focus.addEventListener('click',locate);
 image.addEventListener('load',()=>{const line=doc.getElementById('module-current-question');if(line?.dataset.region){try{const box=JSON.parse(line.dataset.region);if(Array.isArray(box)&&box.length===4&&box.every(n=>Number.isFinite(n)&&n>=0&&n<=1)&&box[2]>0&&box[3]>0&&box[0]+box[2]<=1&&box[1]+box[3]<=1)task={module:true,box,question:line.textContent,answer:''};}catch{}}if(!task&&!id&&image.getAttribute('src')?.endsWith('example.svg'))task=PASSAGES['notice-date'];render();});
 for(const key of ['quick-example','load-example','example-image'])doc.getElementById(key)?.addEventListener('click',()=>{task=PASSAGES['notice-date'];render();});
 doc.getElementById('source-image')?.addEventListener('change',()=>{task=null;render();});
 for(const key of ['open-document','new-workspace','import-button','load-real-example'])doc.getElementById(key)?.addEventListener('click',()=>{task=null;render();});
 new MutationObserver(render).observe(image,{attributes:true,attributeFilter:['style','hidden','src']});
 if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(render);observer.observe(image);observer.observe(stage);}
 render();
 // Starting a task removes the landing-page height; controls remain available.
 const compact=()=>{const modeToggle=doc.getElementById('document-workspace-toggle');if(modeToggle)modeToggle.textContent='More tools / full form';doc.body.classList.add('document-workspace');stage.classList.add('fit-page');const chooser=doc.getElementById('task-start-options');if(chooser)chooser.open=false;doc.body.classList.add('task-working');};
 doc.addEventListener('reckoner-workspace-opened',compact);doc.getElementById('quick-check')?.addEventListener('click',compact);image.addEventListener('load',compact);
 const toggle=doc.createElement('button');toggle.type='button';toggle.id='document-workspace-toggle';toggle.textContent='More tools / full form';const workspaceBar=doc.createElement('div');workspaceBar.id='document-workspace-bar';const tools=doc.createElement('details');tools.id='record-tools-menu';const toolsLabel=doc.createElement('summary');toolsLabel.textContent='Record tools';const toolItems=doc.createElement('div');toolItems.className='record-tool-items';tools.append(toolsLabel,toolItems);toolItems.append(toggle);workspaceBar.append(tools);reading.before(workspaceBar);tools.addEventListener('click',event=>{if(event.target.closest('button,a'))tools.open=false;});doc.addEventListener('click',event=>{if(!tools.contains(event.target))tools.open=false;});
 for(const [label,target] of [['Download backup','export-cairn'],['Review / mentor','tab-history']]){const button=doc.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',()=>doc.getElementById(target)?.click());toolItems.append(button);}
 const contribution=document.createElement('button');contribution.type='button';contribution.textContent='Download contribution JSON';contribution.title='Readable saved correction, source references, credit, AI records and reviews; source bytes stay separate';contribution.addEventListener('click',()=>doc.dispatchEvent(new CustomEvent('reckoner-export-contribution')));toolItems.append(contribution);
 const next=doc.createElement('a');next.textContent='Practice examples ↗';next.href='practice-queue.html';next.target='_blank';next.rel='noopener';next.title='Opens the bundled practice queue in a separate tab; current work stays here';toolItems.append(next);toggle.addEventListener('click',()=>{doc.body.classList.toggle('document-workspace');toggle.textContent=doc.body.classList.contains('document-workspace')?'More tools / full form':'Return to document workspace';stage.classList.add('fit-page');render();});
 for(const key of ['zoom-in','zoom-out','image-zoom'])doc.getElementById(key)?.addEventListener('click',()=>stage.classList.remove('fit-page'));
 doc.getElementById('zoom-reset')?.addEventListener('click',()=>{stage.classList.add('fit-page');requestAnimationFrame(render);});
}
if(typeof document!=='undefined')initPassage(document);
