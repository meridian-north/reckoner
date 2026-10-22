import {REPORTED_ISSUES,issuePath} from './reported-issues.js';
import {prepareReviewLink} from './discovery-link.js';
const list=document.getElementById('issue-list');
const text=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;return n;};
for(const row of REPORTED_ISSUES){
 const card=document.createElement('article');card.className='revision';card.append(text('h2',row.title),text('p',row.kind+' · upstream '+row.status+' · checked October 18, 2026'),text('p',row.note));
 const upstream=text('a','Read original issue');upstream.href=row.issue;upstream.target='_blank';upstream.rel='noopener noreferrer';card.append(upstream);
 const button=text('button','Prepare a separate review');button.type='button';const result=text('p','');result.setAttribute('role','status');
 button.onclick=async()=>{button.disabled=true;try{const {path,candidateId}=issuePath(row.id);const link=await prepareReviewLink({path,candidateId,isCurrent:()=>true,storage:localStorage,baseUrl:location.href});result.replaceChildren();const a=text('a','Open prepared review');a.href=link.href;a.target='_blank';a.rel='noopener noreferrer';result.append(a,text('span',' — source reference only; open the source and add OCR, your reading, name and evidence. Nothing is submitted.'));a.focus();}catch(e){result.textContent=e.message;}finally{button.disabled=false;}};
 card.append(button,result);list.append(card);
}
