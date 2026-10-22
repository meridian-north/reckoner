export function initCompactWorkspace(doc){
 const get=id=>doc.getElementById(id),host=doc.querySelector('.view-options'),image=get('view-adjustments'),reading=get('reading-size')?.closest('details');
 if(!host||!image||!reading)return null;
 const button=doc.createElement('button');button.id='toggle-view-tools';button.className='quiet';button.type='button';button.textContent='▸ Reading & image tools';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','view-tools-drawer');host.append(button);const example=doc.createElement('button');example.type='button';example.className='quiet';example.id='quick-example';example.textContent='Try an example';example.addEventListener('click',()=>get('load-example')?.click());host.append(example);
 const drawer=doc.createElement('aside');drawer.id='view-tools-drawer';drawer.className='view-tools-drawer';drawer.hidden=true;drawer.tabIndex=-1;drawer.setAttribute('aria-labelledby','view-tools-title');
 const title=doc.createElement('h2');title.id='view-tools-title';title.textContent='Reading & image tools';const close=doc.createElement('button');close.className='quiet';close.type='button';close.textContent='Close tools ◂';
 const note=doc.createElement('p');note.className='helper';note.textContent='Adjust the view without changing source bytes. Image viewing settings are recorded with your saved reading. Text size and line spacing are reading-comfort controls for this view.';
 drawer.append(close,title,note,image,reading);doc.body.append(drawer);
 function setOpen(open){drawer.hidden=!open;button.setAttribute('aria-expanded',String(open));button.textContent=open?'◂ Reading & image tools':'▸ Reading & image tools';if(open)close.focus();else button.focus({preventScroll:true});}
 button.addEventListener('click',()=>setOpen(drawer.hidden));close.addEventListener('click',()=>setOpen(false));
 const intro=get('intro'),toggle=get('toggle-intro');
 if(intro&&toggle)toggle.addEventListener('click',()=>{if(!intro.hidden)intro.querySelector('button')?.focus();});
 const within=(container,target)=>{if(!container||!target)return false;if(container.contains)return container.contains(target);for(let n=target;n;n=n.parentNode||n.parent)if(n===container)return true;return false;};
 // Capture phase: the topmost layer takes Escape before page-level shortcuts such as
 // returning to split view. Focus goes back to the opener without scrolling the page,
 // so a reader who scrolled beneath an open layer keeps their place.
 doc.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||event.defaultPrevented)return;
  const pageMenu=get('page-map-panel');if(pageMenu&&!pageMenu.hidden)return;
  if(doc.querySelector('dialog[open]')?.open||event.target?.closest?.('dialog[open]'))return;
  const editing=event.target?.closest?.('input,textarea,select,[contenteditable=true]');
  if(editing&&!within(drawer,event.target)&&!within(intro,event.target))return;
  if(!drawer.hidden){event.preventDefault();setOpen(false);return;}
  if(intro&&!intro.hidden){event.preventDefault();intro.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.textContent='▸ Introduction & examples';toggle.focus({preventScroll:true});}
 }, true);
 return {button,drawer,setOpen,imageControls:image,readingControls:reading};
}
export function initTaskActions(doc){
 const get=id=>doc.getElementById(id),main=doc.querySelector('main'),toolbar=doc.querySelector('.toolbar .actions');if(!main||!toolbar)return;
 const more=doc.createElement('details');more.className='task-more';const summary=doc.createElement('summary');summary.textContent='Open / more actions';more.append(summary);const help=doc.createElement('p');help.className='helper';help.textContent='Open saved work to resume; Merge keeps both copies. Print and text are readable copies; the review-record download preserves reopenable history.';more.append(help);
 for(const id of ['import-button','merge-button','new-workspace','print-cairn','export-text','export-save-as']){const node=get(id);if(node)more.append(node);}toolbar.append(more);
 const quick=get('quick-start');if(quick){const chooser=doc.createElement('details');chooser.id='task-start-options';const label=doc.createElement('summary');label.textContent='Start or choose another task';chooser.append(label);while(quick.firstChild)chooser.append(quick.firstChild);quick.append(chooser);chooser.open=true;const title=get('workspace-title');if(title&&typeof MutationObserver!=='undefined'){const update=()=>{if(title.textContent&&title.textContent!=='Untitled review'){chooser.open=false;const intro=get('intro');if(intro&&!intro.hidden){intro.hidden=true;const toggle=get('toggle-intro');toggle?.setAttribute('aria-expanded','false');if(toggle)toggle.textContent='▸ Introduction & examples';}}};new MutationObserver(update).observe(title,{childList:true,subtree:true,characterData:true});update();}}
 const bar=doc.createElement('aside');bar.className='task-action-bar';bar.setAttribute('aria-label','Save and next steps');const note=doc.createElement('span');note.textContent='1 Save a reading on this device → 2 Download a backup → 3 Ask for review';bar.append(note);
 for(const [id,label,target]of [['task-save','1. Save proposed reading','save-revision'],['task-backup','2. Download backup','export-cairn'],['task-review','3. Review / mentor','tab-history']]){const button=doc.createElement('button');button.id=id;button.type='button';button.className='quiet';button.textContent=label;button.addEventListener('click',()=>get(target)?.click());bar.append(button);}doc.body.append(bar);
 for(const selector of ['.scan','.transcript']){const panel=doc.querySelector(selector);if(panel){const hint=doc.createElement('p');hint.className='panel-scroll-hint';hint.textContent='More controls below ↓ · Focus view gives this panel more room';panel.prepend(hint);}}
}
if(typeof document!=='undefined'){initCompactWorkspace(document);initTaskActions(document);}
