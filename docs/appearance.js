import {readSkin} from './skin-format.js';
// Device appearance only: never changes source bytes, review history or approval.
const KEY='reckoner-appearance-v1';
const root=document.documentElement;
const customStyle=document.createElement('style');document.head.append(customStyle);
let appearanceStatus=null,appearanceNote='';
function apply(value){
 appearanceNote='';value=['original','archive-companion','community'].includes(value)?value:'original';
 customStyle.textContent='';root.dataset.skinChoice=value;
 if(value==='community'){
  try{const skin=readSkin(localStorage.getItem('reckoner-community-skin-v1'));root.dataset.appearance='archive-companion';
   customStyle.textContent=':root[data-appearance="archive-companion"]{'+Object.entries(skin.palette).map(([k,v])=>'--'+k+':'+v+'!important').join(';')+'}:root[data-skin-choice="community"] body{font-family:'+(skin.font==='serif'?'Georgia,serif':'system-ui,sans-serif')+'}'+(skin.density==='compact'?':root[data-skin-choice="community"] .intro{padding:22px 0}:root[data-skin-choice="community"] .toolbar{padding:14px 0}':'');
   root.dataset.skinName=skin.name;return;
  }catch{root.dataset.skinChoice='original';appearanceNote='No valid community skin is saved. Open a skin file from the gallery first. Reckoner original is selected.';}
 }
 root.dataset.appearance=value==='archive-companion'?value:'original';delete root.dataset.skinName;
}
try{apply(localStorage.getItem(KEY));}catch{apply('original');}
const label=document.createElement('label');label.textContent='Workspace appearance';
const select=document.createElement('select');select.id='workspace-appearance';
for(const [value,text] of [['original','Reckoner original'],['archive-companion','Archive companion — independent prototype'],['community','My community skin']]){const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o);}
select.value=root.dataset.skinChoice;label.append(select);
const form=document.querySelector('#settings form');form.insertBefore(label,document.getElementById('apply-brand'));
appearanceStatus=document.createElement('p');appearanceStatus.className='helper';appearanceStatus.setAttribute('role','status');appearanceStatus.textContent=appearanceNote;form.append(appearanceStatus);
select.addEventListener('change',()=>{apply(select.value);select.value=root.dataset.skinChoice;appearanceStatus.textContent=appearanceNote;try{localStorage.setItem(KEY,root.dataset.skinChoice);}catch{appearanceStatus.textContent='Appearance changed for this session. Device storage is unavailable.';}});
const bar=document.createElement('div');bar.className='archive-companion-bar';
const title=document.createElement('strong');title.textContent='Independent companion for Internet Archive research';bar.append(title);
for(const [text,url] of [['Search Internet Archive','https://archive.org/advancedsearch.php'],['Browse collections','https://archive.org/details/collection'],['Community forums','https://archive.org/iathreads/forums.php']]){const a=document.createElement('a');a.textContent=text;a.href=url;a.target='_blank';a.rel='noopener noreferrer';bar.append(a);}
const note=document.createElement('span');note.textContent='Developed by John Reed · Garrison Node. No Internet Archive endorsement implied.';bar.append(note);
document.querySelector('header').after(bar);

const searchButton=document.createElement('button');searchButton.type='button';searchButton.className='quiet';searchButton.textContent='Search libraries ↗';
const headerFallback=document.createElement('a');headerFallback.textContent='Open search in a tab';headerFallback.href='library-search.html';headerFallback.target='_blank';headerFallback.rel='noopener noreferrer';headerFallback.hidden=true;
searchButton.addEventListener('click',()=>{const popup=window.open(new URL('library-search.html',import.meta.url),'reckoner-library-search','popup,width=900,height=750');headerFallback.hidden=!!popup;if(!popup){appearanceStatus.textContent='Search popout unavailable. Use Open search in a tab beside the search button.';headerFallback.focus();}});document.querySelector('header').append(searchButton,headerFallback);
const fallback=document.createElement('a');fallback.textContent='Open library search';fallback.href='library-search.html';fallback.target='_blank';fallback.rel='noopener noreferrer';form.append(fallback);

window.addEventListener('storage',event=>{if([KEY,'reckoner-community-skin-v1'].includes(event.key)){try{apply(localStorage.getItem(KEY));select.value=root.dataset.skinChoice;if(appearanceStatus)appearanceStatus.textContent=appearanceNote;}catch{}}});
const gallery=document.createElement('a');gallery.href='skin-gallery.html';gallery.textContent='Browse or contribute a skin';gallery.target='_blank';gallery.rel='noopener noreferrer';form.append(document.createElement('br'),gallery);
