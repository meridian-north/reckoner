import {createPath,appendEvent} from './discovery.mjs';
export const REPORTED_ISSUES=Object.freeze([
 {id:'bookreader-1517',title:'Cannot select search-result snippets',kind:'Text-selection problem; not a confirmed OCR error',status:'OPEN',issue:'https://github.com/internetarchive/bookreader/issues/1517',source:'https://archive.org/details/sim_flag-of-our-union_1856-02-23_11_8/page/n2/mode/1up',locator:'Archive viewer leaf n2; verify the passage and current behavior.',note:'The report concerns copying search snippets. It does not supply a verified transcription correction.'},
 {id:'bookreader-1260',title:'Search fails for a document name with spaces',kind:'Search-service problem; not a confirmed OCR error',status:'OPEN',issue:'https://github.com/internetarchive/bookreader/issues/1260',source:'https://archive.org/details/nintendo-magazine-system-uk-43-april-1996/',locator:'Reported query: mario rpg. Exact page has not been established.',note:'Historical report of a filename-encoding failure. Current behavior has not been independently reproduced.'},
 {id:'bookreader-1074',title:'OCR and text-layer highlights around a decorative frame',kind:'Historical OCR/text-layer example',status:'CLOSED',issue:'https://github.com/internetarchive/bookreader/issues/1074',source:'https://archive.org/details/bim_eighteenth-century_the-dutch-fortune-teller_booker-john-student-in_1750/page/n5/mode/2up',locator:'Archive viewer leaf n5; decorative frame and text-layer highlights.',note:'Closed upstream report. Use as a historical checking exercise, not a claim that the bug is still present or that a correction has been verified.'}
]);
export function issuePath(id){
 const row=REPORTED_ISSUES.find(x=>x.id===id);if(!row)throw Error('Choose a listed issue.');
 let path=createPath({goal:'phrase',title:row.title,by:'AI-prepared public issue lead; not verified'});
 path=appendEvent(path,{kind:'attempt',by:'AI-prepared public issue lead; not verified',query:row.title,destination:'Public upstream issue',url:row.issue,parentAttemptId:null,reason:'AI-prepared summary. '+row.note,stage:'planned'});
 path=appendEvent(path,{kind:'candidate',by:'AI-prepared public issue lead; not verified',attemptId:path.events[0].id,url:row.source,locator:row.locator,match:'possible',reason:'Reported lead only. '+row.kind+'. Upstream status '+row.status+' checked October 18, 2026. '+row.note});
 return {path,candidateId:path.events.at(-1).id};
}
