import { documentUrl } from './core.js';
function invalid(field,message){const error=new Error(message);error.field=field;throw error;}
export function prepareArchiveHandoff(state,{route,rightsBasis,rightsEvidence,publicChecked,preparedBy}){
 if(!['web_capture','file_upload'].includes(route))invalid('route','Choose web-page capture or file upload.');
 if(!['own_work','public_domain','permission','licensed'].includes(rightsBasis))invalid('rightsBasis','Resolve the permission question before preparing a public handoff.');
 if(!rightsEvidence?.trim())invalid('rightsEvidence','Record the permission, license, or public-domain basis you checked.');
 if(!publicChecked)invalid('publicChecked','Check that the selected material is appropriate to send publicly.');
 if(!preparedBy?.trim())invalid('preparedBy','Record who prepared this handoff.');
 let sourceUrl=null;try{sourceUrl=state.context.sourceUrl?.trim()?documentUrl(state.context.sourceUrl):null;}catch(error){invalid('sourceUrl',error.message);}
 if(route==='web_capture'&&!sourceUrl)invalid('sourceUrl','Add the public source URL first.');
 if(route==='file_upload'&&!state.sourceImage)invalid('sourceFile','Open the source file first so its name and digest can accompany the handoff.');
 return {schema:'garrison.archive_handoff.v0.1',id:crypto.randomUUID(),reviewRecordId:state.id,preparedAt:new Date().toISOString(),preparedBy:preparedBy.trim(),identity:'self_declared',status:'prepared_not_submitted',route,destination:route==='web_capture'?'https://web.archive.org/save':'https://archive.org/upload',source:{title:state.context.title||'Untitled source',url:sourceUrl,locator:state.context.locator||'Unknown',file:route==='file_upload'?structuredClone(state.sourceImage):null},rights:{basis:rightsBasis,evidence:rightsEvidence.trim(),assessment:'User-declared; not independently verified'},instructions:route==='web_capture'?'Open Save Page Now and review the URL and options before submitting there. Record the returned archived URL separately.':'Open the Archive uploader, select the authorized files, and review metadata and license before submitting there. Record the returned item identifier separately.',result:{archiveUrl:null,serviceReceipt:null,verified:false}};
}
