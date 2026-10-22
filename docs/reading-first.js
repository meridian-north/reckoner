import {installExampleWalkthrough} from './example-walkthrough.js?v=focused-reading-1';
import {PRACTICE_TASKS} from './practice-tasks.js';
const d=document,g=id=>d.getElementById(id),h=d.querySelector('body>header');
const menu=d.createElement('details');menu.id='oc-tools';const s=d.createElement('summary');s.textContent='More · help & tools';const c=d.createElement('div');c.id='oc-tools-content';menu.append(s,c);h.append(menu);
for(const q of ['#quick-start','.workspace-options','#intro','.toolbar','#start-guided-review','#walkthrough','#first-use-guide','#next-steps','#backup-files','#open-settings','header>.local','header>a.quiet']){const n=d.querySelector(q);if(n)c.append(n);}
const nav=d.createElement('nav');nav.id='oc-start';nav.setAttribute('aria-label','Your document');for(const [label,id] of [['Open a backup','import-button'],['Try an example','load-example'],['Download backup','export-cairn']]){const b=d.createElement('button');b.type='button';b.className='quiet';b.textContent=label;b.addEventListener('click',()=>g(id)?.click());nav.append(b);}d.querySelector('main').prepend(nav);

// One ordered form, with supplemental guidance kept out of the reading path.
const transcript=d.querySelector('.transcript'),original=g('original'),proposed=g('proposed'),reason=g('reason'),contributor=g('contributor');
if(transcript&&original&&proposed&&reason&&contributor){
 const machine=original.closest('details');if(machine){machine.open=true;const summary=machine.querySelector('summary');if(summary)summary.textContent='Machine reading';}
 const reasonLabel=reason.closest('label'),nameLabel=contributor.closest('label');
 if(reasonLabel){reasonLabel.firstChild.textContent='Reason';proposed.after(reasonLabel);}
 if(nameLabel&&reasonLabel)reasonLabel.after(nameLabel);
 for(const node of [g('passage-task'),g('reading-context-panel')])if(node)c.append(node);
 const save=g('save-revision');if(save)save.textContent='Save reading';
}

const optional=g('uncertainty')?.closest('details');if(optional)optional.open=false;

if(original&&proposed&&reason&&contributor){
 const machine=original.closest('details');
 if(machine){const summary=machine.querySelector('summary');if(summary)summary.textContent='Machine says';for(const n of machine.querySelectorAll('label,.helper')){if(n.contains(original)){n.replaceWith(original);}else n.remove();};}
 const label=d.querySelector('label[for="proposed"]');if(label)label.textContent='What do you read?';
 const why=reason.closest('label');if(why)why.firstChild.textContent='Why?';
 const credit=contributor.closest('label');if(credit)credit.firstChild.textContent='Your name';
 const secondary=transcript.querySelector('.section-heading.secondary');if(secondary)secondary.remove();
 const comparison=g('disputed-text-comparison');if(comparison)comparison.hidden=true;
}

// Browse samples in a separate tab; each sample keeps its own existing draft key.
const samples=PRACTICE_TASKS.map(t=>[t.id,t.title]);
const params=new URL(location.href).searchParams,current=samples.findIndex(x=>x[0]===params.get('practice'));
const session=params.get('practiceSession')||crypto.randomUUID();
function sampleLink(index,label,separate=false){const a=d.createElement('a');a.className='quiet';a.textContent=label;const u=new URL('index.html',location.href);u.searchParams.set('practice',samples[index][0]);u.searchParams.set('practiceSession',session);a.href=u.href;if(separate){a.target='_blank';a.rel='noopener';}return a;}
const tryButton=[...nav.querySelectorAll('button')].find(x=>x.textContent==='Try an example');if(tryButton)tryButton.replaceWith(sampleLink(0,'Browse examples',true));
if(current>=0){const browse=d.createElement('nav');browse.id='sample-navigation';browse.setAttribute('aria-label','Browse examples');if(current>0)browse.append(sampleLink(current-1,'← Previous'));const count=d.createElement('span');count.textContent='Example '+(current+1)+' of '+samples.length;count.title=samples[current][1];browse.append(count);if(current<samples.length-1)browse.append(sampleLink(current+1,'Next example →'));else browse.append(sampleLink(0,'Back to first'));h.insertBefore(browse,menu);}

// One header and one tools menu; retain each action's existing handler.
s.textContent='More';h.insertBefore(nav,menu);
const recordItems=d.querySelector('#record-tools-menu .record-tool-items');if(recordItems){while(recordItems.firstChild)c.append(recordItems.firstChild);}
const recordBar=g('document-workspace-bar');if(recordBar)recordBar.remove();

for(const b of nav.querySelectorAll('button')){if(b.textContent==='Open a backup'){b.textContent='Open saved review';b.title='Choose a previously downloaded review file';}if(b.textContent==='Download backup')b.textContent='Backup';}
const browseLink=nav.querySelector('a');if(browseLink)browseLink.textContent='Examples';

for(const b of [...h.querySelectorAll(':scope > button')])if(b.textContent.includes('Search libraries'))c.append(b);

const sourceInput=g('source-image'),stage=g('image-stage'),empty=g('image-empty');
if(sourceInput&&stage&&empty){
 const choose=d.createElement('button');choose.type='button';choose.id='choose-source-file';choose.textContent='Choose source file';choose.addEventListener('click',()=>sourceInput.click());empty.prepend(choose);
 const dropStatus=d.createElement('p');dropStatus.id='source-drop-status';dropStatus.setAttribute('role','status');dropStatus.setAttribute('aria-live','polite');stage.after(dropStatus);
 const help=d.createElement('p');help.textContent='Drop an image/PDF (20 MB) or TXT/HTML/XML (200 KB)';empty.append(help);
 stage.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('Files')){e.preventDefault();stage.classList.add('file-hover');}});
 stage.addEventListener('dragleave',()=>stage.classList.remove('file-hover'));
 stage.addEventListener('drop',e=>{e.preventDefault();stage.classList.remove('file-hover');const files=e.dataTransfer.files;if(files.length!==1){dropStatus.textContent='Choose one source file at a time. The current source is unchanged.';return;}dropStatus.textContent='';const transfer=new DataTransfer();transfer.items.add(files[0]);sourceInput.files=transfer.files;sourceInput.dispatchEvent(new Event('change',{bubbles:true}));});
 d.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('Files'))e.preventDefault();});
 d.addEventListener('drop',e=>{if([...e.dataTransfer.types].includes('Files'))e.preventDefault();});
}

const wordmark=g('brand-name');if(wordmark&&['OCRecon','Reckoner'].includes(wordmark.textContent)){wordmark.textContent='Reckoner';document.title='Reckoner';}if(wordmark)wordmark.title='Record an interpretation. Let others check it.';

// Dismiss the nearest open layer before page shortcuts consume Escape.
d.addEventListener('keydown',e=>{if(e.key!=='Escape'||d.querySelector('dialog[open]'))return;const intro=g('intro');if(intro&&!intro.hidden){e.preventDefault();e.stopImmediatePropagation();intro.hidden=true;g('toggle-intro')?.setAttribute('aria-expanded','false');return;}if(menu.open){e.preventDefault();e.stopImmediatePropagation();menu.open=false;s.focus();}},true);
d.addEventListener('click',e=>{if(menu.open&&!menu.contains(e.target))menu.open=false;});
c.addEventListener('click',e=>{if(e.target.closest('button,a')&&!e.target.closest('#intro')&&!e.target.closest('#toggle-intro')){menu.open=false;queueMicrotask(()=>{if(d.querySelector('dialog[open]'))return;const panel=d.querySelector('.panel.active');if(panel?.id==='history'){const target=g('review-reading')||g('tab-history');target?.focus();}else s.focus();});}});
const local=c.querySelector('.local');if(local)local.remove();

const nextFile=d.createElement('a');nextFile.className='quiet';nextFile.textContent='New file';nextFile.title='Start a separate blank workspace; previous work remains in its own workspace';
function newFileUrl(){const u=new URL('index.html',location.href);u.searchParams.set('workspace',crypto.randomUUID());return u.href;}
nextFile.href=newFileUrl();nextFile.addEventListener('click',()=>{nextFile.href=newFileUrl();});nav.prepend(nextFile);
// Remove older duplicate entry points while keeping their handlers available.
for(const id of ['quick-example','example-image']){const node=g(id);if(node)node.hidden=true;}

const moduleLink=d.createElement('a');moduleLink.href='data-module.html';moduleLink.textContent='Open a review pack';c.append(moduleLink);

if(current>=0)installExampleWalkthrough(d,g('sample-navigation'));
// Narrow headers keep one clear row; the same actions move into More, never clone.
const openBackupButton=[...nav.querySelectorAll('button')].find(b=>b.textContent==='Open saved review');
const narrowHeader=matchMedia('(max-width:620px)');
function fitHeader(){if(narrowHeader.matches){c.append(nextFile);if(openBackupButton)c.append(openBackupButton);}else{nav.prepend(nextFile);if(openBackupButton)nextFile.after(openBackupButton);}}
narrowHeader.addEventListener('change',fitHeader);fitHeader();

const machineSummary=original?.closest('details')?.querySelector('summary');if(machineSummary&&original?.getAttribute('aria-label'))machineSummary.textContent=original.getAttribute('aria-label');

// A separate action row cannot cover fields inside the scrolling reading pane.
if(transcript&&g('save-revision')){
 const fields=d.createElement('div');fields.id='reading-fields';
 const action=d.createElement('div');action.id='reading-save-row';
 const save=g('save-revision'),note=save.nextElementSibling;
 if(note?.classList.contains('helper'))c.append(note);
 for(const node of [...transcript.childNodes])if(node!==save)fields.append(node);
 action.append(save);transcript.append(fields,action);
 d.addEventListener('reckoner-reading-saved',()=>{fields.scrollTop=0;original.scrollTop=0;proposed.scrollTop=0;if(matchMedia('(max-width:650px)').matches)fields.scrollIntoView({block:'start'});});
}

// Header wrapping, task questions and validation messages all consume real space.
// Measure their result instead of assuming a fixed header height.
const readingGrid=g('reading-grid');
if(readingGrid){
 let queued=false;
 const fitReadingHeight=()=>{
  queued=false;if(!d.body.classList.contains('document-workspace')||!matchMedia('(min-width:651px)').matches){readingGrid.style.removeProperty('--reading-available-height');return;}
  if(!readingGrid.getClientRects().length)return;
  const top=readingGrid.getBoundingClientRect().top+window.scrollY;
  const height=Math.max(96,Math.floor((window.visualViewport?.height||window.innerHeight)-top-12));
  const value=height+'px';if(readingGrid.style.getPropertyValue('--reading-available-height')!==value)readingGrid.style.setProperty('--reading-available-height',value);
 };
 const scheduleFit=()=>{if(!queued){queued=true;requestAnimationFrame(fitReadingHeight);}};
 if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(scheduleFit);for(const node of [g('reading'),g('save-error'),h,d.querySelector('.archive-companion-bar'),d.querySelector('nav[role=tablist]')])if(node)observer.observe(node);}
 new MutationObserver(scheduleFit).observe(d.body,{attributes:true,attributeFilter:['class']});
 window.addEventListener('resize',scheduleFit);window.visualViewport?.addEventListener('resize',scheduleFit);d.addEventListener('reckoner-workspace-opened',scheduleFit);scheduleFit();
}

// Keep the menu an action list. Full guidance/recovery remains available in a dialog.
const allTools=d.createElement('dialog');allTools.id='additional-tools';allTools.setAttribute('aria-labelledby','additional-tools-title');
const closeTools=d.createElement('button');closeTools.type='button';closeTools.textContent='Close';
const toolsTitle=d.createElement('h2');toolsTitle.id='additional-tools-title';toolsTitle.textContent='Tools & guidance';
const toolsBody=d.createElement('div');toolsBody.id='additional-tools-body';allTools.append(closeTools,toolsTitle,toolsBody);d.body.append(allTools);
const settings=g('open-settings'),contribution=[...c.querySelectorAll('button')].find(n=>n.textContent==='Download contribution JSON');
const backup=g('export-cairn'),backupProxy=[...nav.querySelectorAll('button')].find(n=>n.textContent==='Backup');
if(backup&&backupProxy){backup.dataset.compactBackup='true';backup.textContent='Save to file';backup.classList.add('quiet');backup.title='Download the complete review history for reopening';backupProxy.replaceWith(backup);}
for(const node of [...c.childNodes])if(node!==settings&&node!==contribution&&node!==moduleLink&&node!==nextFile&&node!==openBackupButton)toolsBody.append(node);
// Preserve older handlers and their DOM targets, but hide redundant shortcuts.
for(const node of toolsBody.querySelectorAll('button,a'))if(node.textContent==='Download backup'||node.textContent==='Practice examples ↗')node.hidden=true;
const toolsButton=d.createElement('button');toolsButton.type='button';toolsButton.id='open-additional-tools';toolsButton.textContent='Tools & guidance';toolsButton.addEventListener('click',()=>allTools.showModal());
let toolsReturnTarget=s;closeTools.addEventListener('click',()=>allTools.close());allTools.addEventListener('close',()=>{menu.open=false;toolsReturnTarget.focus({preventScroll:true});toolsReturnTarget=s;});
d.addEventListener('reckoner-workspace-opened',()=>{if(allTools.open){g('tab-reading')?.click();toolsReturnTarget=g('proposed')||s;allTools.close();}});
c.prepend(toolsButton);if(contribution)contribution.textContent='Export contribution receipt';if(settings)c.append(settings);
const smallBackup=matchMedia('(max-width:540px)');function fitBackup(){if(!backup)return;if(smallBackup.matches)c.prepend(backup);else nav.append(backup);}smallBackup.addEventListener('change',fitBackup);fitBackup();
for(const [id,label]of [['popout-scan','Open source in a separate window'],['popout-reading','Open reading in a separate window']])g(id)?.setAttribute('aria-label',label);
for(const [id,label]of [['original','Copy selected source reading'],['proposed','Copy selected proposed reading']]){const field=g(id),bar=field?.previousElementSibling;if(bar)for(const button of bar.querySelectorAll('button'))if(button.textContent==='Copy selected passage')button.setAttribute('aria-label',label);}
toolsBody.addEventListener('click',event=>{const action=event.target.closest('button,a');if(action&&(['document-workspace-toggle','quick-check','quick-guide','start-guided-review','load-example','load-real-example'].includes(action.id)||action.textContent==='Review / mentor'))allTools.close();});

// Human walkthrough repair: keep complete editable text visible, without changing its bytes.
function sizeReviewText(){for(const id of ['original','proposed','reason','review-reason']){const field=g(id);if(!field||!field.getClientRects().length)continue;field.style.setProperty('height','auto','important');field.style.setProperty('height',Math.max(id==='reason'?90:110,field.scrollHeight+4)+'px','important');}}
for(const id of ['original','proposed','reason','review-reason'])g(id)?.addEventListener('input',sizeReviewText);
window.addEventListener('resize',sizeReviewText);d.addEventListener('reckoner-workspace-opened',()=>requestAnimationFrame(sizeReviewText));d.addEventListener('reckoner-reading-saved',()=>requestAnimationFrame(sizeReviewText));
new MutationObserver(()=>requestAnimationFrame(sizeReviewText)).observe(g('workspace-title'),{childList:true,subtree:true,characterData:true});requestAnimationFrame(sizeReviewText);
// Preserve a same-origin return address only. No source bytes or history are copied.
try{if(params.has('practice')||params.has('workspace')||params.has('discovery'))localStorage.setItem('reckoner-last-review-url-v1',location.href);else{const previous=localStorage.getItem('reckoner-last-review-url-v1');if(previous){const url=new URL(previous);if(url.origin===location.origin&&url.pathname.endsWith('/index.html')&&(url.searchParams.has('practice')||url.searchParams.has('workspace')||url.searchParams.has('discovery'))){const resume=d.createElement('a');resume.className='quiet';resume.textContent='Return to last review';resume.href=url.href;nav.prepend(resume);}}}}catch{}
// Avoid a second save button with ambiguous scope on the document-details tab.
const contextSave=g('save-from-context');if(contextSave){contextSave.textContent='Return to reading before saving';contextSave.onclick=()=>{g('tab-reading').click();g('proposed').focus();};}

const assistanceField=g('assistance'),assistanceDetails=assistanceField?.closest('details');
if(assistanceDetails&&contributor){assistanceDetails.open=true;contributor.closest('label').after(assistanceDetails);const label=assistanceField.previousElementSibling;if(label?.tagName==='LABEL')label.textContent='AI assistance disclosure · saved with this reading';}

// Visible viewing controls reuse the existing handlers; no source bytes change.
const imageControls=d.querySelector('.image-controls');
if(imageControls){const bar=d.createElement('div');bar.id='visible-source-view';for(const id of ['zoom-out','zoom-level','zoom-in','zoom-reset'])if(g(id))bar.append(g(id));const whole=d.createElement('button');whole.type='button';whole.className='quiet';whole.textContent='Expand page';whole.id='expand-source-page';whole.onclick=()=>{const toggle=g('passage-loupe-toggle');if(toggle&&!toggle.closest('[hidden]'))toggle.click();g('image-stage')?.focus();};bar.append(whole);d.querySelector('.scan>.section-heading')?.after(bar);}

// The focused passage belongs before reason/credit, just like the original editor.
function placeFocusedTools(){
 if(!g('focused-reading'))return;
 let bar=g('visible-text-size');const label=g('reading-size')?.closest('label');
 if(!bar&&label){bar=d.createElement('div');bar.id='visible-text-size';bar.append(label);}
 if(bar)g('proposed').after(bar,g('focused-reading'));
}
d.addEventListener('reckoner-focused-ready',placeFocusedTools);placeFocusedTools();
