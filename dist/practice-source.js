import {PRACTICE_TASKS} from './practice-tasks.js';
export const BUNDLED_PRACTICE_FILES=Object.freeze(['example.svg',...PRACTICE_TASKS.map(t=>t.sourceFile).filter(Boolean)]);
// Only the bundled synthetic source may be restored automatically. Never follow receipt URLs.
export async function pinnedPracticeSource(source,{load,hash}) {
 if(source?.synthetic!==true||!BUNDLED_PRACTICE_FILES.includes(source.name)||source.mime!=='image/svg+xml')return null;
 const response=await load();if(!response.ok)throw Error('Bundled practice image unavailable. Saved work is unchanged.');
 const blob=await response.blob();
 if(blob.type.split(';')[0]!=='image/svg+xml'||blob.size!==source.size||blob.size>1024*1024)throw Error('Bundled practice image format or size differs. Saved work is unchanged.');
 const bytes=await blob.arrayBuffer();if(await hash(bytes)!==source.sha256)throw Error('Bundled practice image fingerprint differs. No comparison restored.');
 return blob;
}
