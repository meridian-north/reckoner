// View-only navigation. No record edits, storage, network or model requests.
export function initPageMap(doc) {
 const get=id=>doc.getElementById(id);
 if(!get('tab-reading')||get('page-map-toggle'))return null;
 const el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 const host=el('div');host.className='page-map';
 const toggle=el('button','On this page ▾');toggle.id='page-map-toggle';toggle.type='button';
 toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','page-map-panel');
 const panel=el('aside');panel.id='page-map-panel';panel.className='page-map-panel';panel.hidden=true;
 panel.setAttribute('aria-label','On this page');
 const heading=el('h2','On this page'),close=el('button','Close');close.type='button';
 const bar=el('div');bar.className='page-map-heading';bar.append(heading,close);
 const tools=el('div');tools.className='page-map-tools';
 const label=el('label','Menu text '),slider=el('input'),output=el('output','100%');
 slider.type='range';slider.min='90';slider.max='160';slider.step='10';slider.value='100';
 slider.setAttribute('aria-label','Page menu text size');label.append(slider,output);
 const normal=el('button','Normal'),enlarge=el('button','Enlarge ↗');
 normal.type=enlarge.type='button';enlarge.setAttribute('aria-pressed','false');
 tools.append(label,normal,enlarge);
 const nav=el('nav');nav.setAttribute('aria-label','Page locations');
 const links=[];
 function setOpen(open,restore=true){panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)close.focus();else if(restore)toggle.focus({preventScroll:true});}
 function location(title,panelId,targetId){
  const a=el('a',title);a.href='#'+targetId;
  a.addEventListener('click',event=>{event.preventDefault();const tab=get('tab-'+panelId),target=get(targetId);if(!tab||!target)return;
   tab.click();setOpen(false,false);if(target.tabIndex<0||target.tabIndex===undefined)target.tabIndex=-1;
   target.focus({preventScroll:true});target.scrollIntoView({block:'start'});
  });nav.append(a);links.push(a);
 }
 location('1. Compare & read','reading','reading');
 location('2. Source & context','context','context');
 location('3. Decisions & history','history','history');
 location('4. Contexts','contexts','contexts');
 const mentor=el('button','Mentor guidance');mentor.type='button';
 mentor.addEventListener('click',()=>{const source=get('read-mentor-guidance');if(source&&!source.closest('[hidden]')){setOpen(false,false);source.click();}});
 nav.append(mentor);
 panel.append(bar,tools,nav);host.append(toggle,panel);(doc.querySelector('body > header')||doc.body).append(host);
 toggle.addEventListener('click',()=>{const notice=get('mentor-notice');mentor.disabled=!notice||notice.hidden;setOpen(panel.hidden);});
 close.addEventListener('click',()=>setOpen(false));
 function scale(){const value=Number(slider.value);if(!Number.isFinite(value))return;const size=Math.max(90,Math.min(160,value));panel.style.fontSize=size+'%';output.textContent=size+'%';}
 slider.addEventListener('input',scale);normal.addEventListener('click',()=>{slider.value='100';scale();});
 enlarge.addEventListener('click',()=>{const wide=host.classList.toggle('page-map-wide');enlarge.textContent=wide?'Compact ↙':'Enlarge ↗';enlarge.setAttribute('aria-pressed',String(wide));});
 doc.addEventListener('keydown',event=>{if(event.key!=='Escape'||event.defaultPrevented||panel.hidden||doc.querySelector('dialog[open]'))return;event.preventDefault();event.stopPropagation();setOpen(false);},true);
 doc.addEventListener('click',event=>{if(!panel.hidden&&!host.contains(event.target))setOpen(false,false);});
 return {toggle,panel,slider,normal,enlarge,links,mentor,setOpen};
}
if(typeof document!=='undefined')initPageMap(document);
