import {validateCatalogue} from './ocr-catalogue.js';
export const CATALOGUE_KEY='reckoner-ocr-catalogue-v1';
export const RECOVERY_PREFIX=CATALOGUE_KEY+':recovery:';
// Cooperative same-origin writers serialize; imports never grant identity or admission.
export async function commitCatalogue({storage,locks,expectedRaw,next,preserveRaw=null}){
 if(!locks?.request)throw Error('Catalogue edits require browser Web Locks on HTTPS or localhost. Reading and export remain available.');
 const raw=JSON.stringify(validateCatalogue(next));
 return locks.request(CATALOGUE_KEY+':write',{mode:'exclusive'},async()=>{
  if(storage.getItem(CATALOGUE_KEY)!==expectedRaw)throw Error('Another tab changed this catalogue. Export your displayed copy and reload before editing.');
  if(preserveRaw!==null){if(typeof preserveRaw!=='string')throw Error('Invalid recovery snapshot');validateCatalogue(JSON.parse(preserveRaw));if(expectedRaw!==null&&preserveRaw!==expectedRaw)throw Error('Recovery snapshot differs from current catalogue');const recoveryKey=RECOVERY_PREFIX+new Date().toISOString()+':'+crypto.randomUUID();if(storage.getItem(recoveryKey)!==null)throw Error('Recovery key collision');storage.setItem(recoveryKey,preserveRaw);if(storage.getItem(recoveryKey)!==preserveRaw)throw Error('Recovery copy did not verify; replacement stopped');if(storage.getItem(CATALOGUE_KEY)!==expectedRaw)throw Error('Catalogue changed during recovery; replacement stopped');}
  storage.setItem(CATALOGUE_KEY,raw);
  if(storage.getItem(CATALOGUE_KEY)!==raw)throw Error('Catalogue write did not verify. Keep your displayed copy and reload before retrying.');
  return raw;
 });
}
