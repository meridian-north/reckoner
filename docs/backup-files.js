// File labels are conveniences; receipt verification remains authoritative.
export function backupFilename(state, now=new Date()) {
 const clean=value=>String(value||'').normalize('NFKC').replace(/[^\p{L}\p{N}_-]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,32);
 const pad=n=>String(n).padStart(2,'0');
 const stamp=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${String(now.getMilliseconds()).padStart(3,'0')}`;
 return `${clean(state.context?.title)||'Document-review'}_${stamp}_${state.revisions.length}-readings_${state.reviews.length}-reviews_${clean(state.id.split(':').at(-1))}.review-backup.json`;
}
export function freshBackupUrl(href,id) {
 if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid new workspace identifier');
 const url=new URL(href);url.search='';url.hash='';url.searchParams.set('workspace',id);url.searchParams.set('openBackup','1');return url.href;
}
export function backupPreview(state,filename) {
 return `Open backup: ${filename}\n${String(state.context?.title||'Untitled review').slice(0,200)}\n${state.revisions.length} saved readings · ${state.reviews.length} reviews\nContributor labels: ${[...new Set(state.revisions.map(r=>r.reading.contributor))].slice(0,4).map(name=>String(name).replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,' ').slice(0,70)).join(', ')||'not recorded'}\nNames are self-declared. File integrity does not establish correctness or identity.`;
}
export function installBackupFiles({doc,getState,save,choose,href,uuid}) {
 const panel=doc.createElement('details');panel.id='backup-files';panel.className='backup-files';
 const heading=doc.createElement('summary');heading.textContent='Your files · save & reopen';panel.append(heading);
 const intro=doc.createElement('p');intro.textContent='Keep one complete backup JSON. Original images and hOCR stay separate. Opening JSON from Downloads may launch a text editor; use Choose backup file here instead.';panel.append(intro);
 const actions=doc.createElement('div');actions.className='actions wrap';panel.append(actions);
 const fresh=doc.createElement('a');fresh.textContent='Open backup in new workspace';fresh.href=freshBackupUrl(href,uuid());fresh.target='_blank';fresh.rel='noopener';fresh.addEventListener('click',()=>{fresh.href=freshBackupUrl(href,uuid());});actions.append(fresh);
 for(const [label,action] of [['Download complete backup',save],['Choose backup file in this workspace',choose]]){const b=doc.createElement('button');b.type='button';b.className='quiet';b.textContent=label;b.addEventListener('click',action);actions.append(b);}
 const confirmations=doc.createElement('p');confirmations.textContent='You may see two confirmation messages: first check the backup title and counts, then—if this browser has not seen it before—choose whether to remember its starting fingerprint. These checks do not approve the reading or verify a person. Cancel leaves your current work unchanged.';panel.append(confirmations);
 const status=doc.createElement('p');status.id='backup-file-status';status.setAttribute('role','status');status.textContent='No disk backup confirmed in this view. Browser-saved work is separate from a file on your drive.';panel.append(status);
 const help=doc.createElement('details');const label=doc.createElement('summary');label.textContent='Where is my downloaded backup?';help.append(label);const p=doc.createElement('p');p.textContent='Check your browser’s Downloads list for the exact filename shown below after export. Use Show in Finder / Show in folder if offered. Your browser chooses the folder; this page cannot search your drive. In a file picker, select Downloads or your chosen folder, select the backup JSON and press Open. Choose the latest timestamp, then check its title and counts before importing.';help.append(p);panel.append(help);
 doc.getElementById('reading').before(panel);
 if(new URL(href).searchParams.get('openBackup')==='1'){const existing=getState();const hasWork=existing.revisions.length||existing.draft?.original;panel.open=!hasWork;status.textContent=hasWork?`This workspace already contains work: ${existing.revisions.length} saved readings · ${existing.reviews.length} reviews. Opening another backup requires confirmation.`:'New separate workspace ready. Choose backup file to load your downloaded JSON. Your previous tab is unchanged.';}
 return {failed(message){panel.open=true;status.textContent=`Could not finish opening this backup. ${message} Your file on disk has not been modified.`;status.setAttribute('role','alert');},downloadRequested(filename){panel.open=true;status.textContent=`Download requested: ${filename}. Check your browser’s Downloads list and finish any Save dialog. Disk delivery is not confirmed by this page.`;},opened(filename){panel.open=true;const s=getState();status.textContent=`Opened ${filename}: ${s.revisions.length} saved readings · ${s.reviews.length} reviews. Inspect Decisions & history and replay the saved steps.`;}};
}
