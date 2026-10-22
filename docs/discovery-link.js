import {prepareDiscoveryReview,handoffKey} from './discovery-bridge.js';
// Preparation never opens or navigates a window. The resulting real anchor is
// followed by a separate direct user click, preserving browser activation.
export async function prepareReviewLink({path,candidateId,isCurrent,storage,baseUrl,prepare=prepareDiscoveryReview,uuid=()=>crypto.randomUUID()}){
 const base=new URL(baseUrl);if(!['http:','https:'].includes(base.protocol)||base.username||base.password)throw Error('Unsupported local workspace address.');
 const context=await prepare(path,candidateId);
 if(!isCurrent())throw Error('Search notes or unfinished fields changed while preparing the review. Choose the candidate again.');
 const id=uuid(),key=handoffKey(id),raw=JSON.stringify(context);storage.setItem(key+':intake',raw);
 if(storage.getItem(key+':intake')!==raw)throw Error('Could not preserve this handoff. Export your search notes first.');
 const target=new URL('index.html',base);target.search='';target.hash='';target.searchParams.set('discovery',id);
 if(target.origin!==base.origin)throw Error('Review destination must stay in this workspace.');
 return {href:target.href,label:'Open your separate review workspace',scope:'This link opens a new review in this workspace. The candidate source is not fetched.'};
}
