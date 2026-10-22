import {PRACTICE_TASKS} from './practice-tasks.js';
import {PRACTICE_SOURCE_PINS} from './practice-source-pins.js';
// Imported assertions cannot substitute another version for an installed exercise.
export function installedPracticeTask(row){
 if(row?.sourceGroup!=='Bundled synthetic practice'||row.url!==null||row.kind!=='source-review-occurrence'||row.bucket!=='held-review-confirmed')return null;
 return PRACTICE_TASKS.find(t=>row.id==='practice:'+t.id&&row.filename===(t.sourceFile||'example.svg')&&row.sha256===PRACTICE_SOURCE_PINS[row.filename])||null;
}
