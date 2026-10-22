// Optimistic detection only: localStorage has no atomic compare-and-swap.
// Keep both the foreign bytes and this session's in-memory state on conflict.
export function createStorageGuard(storage){
 const expected=new Map();
 const read=key=>{const raw=storage.getItem(key);if(!expected.has(key))expected.set(key,raw);return raw;};
 const write=(key,value)=>{
  if(typeof value!=='string')throw Error('Storage values must be text.');
  if(!expected.has(key))read(key);
  const current=storage.getItem(key),previous=expected.get(key);
  if(current!==previous){const error=Error('Another tab changed this saved work. Its saved copy is preserved. Export your current work before closing, then open the other saved copy in a separate tab.');error.code='STORAGE_CONFLICT';throw error;}
  storage.setItem(key,value);
  if(storage.getItem(key)!==value){const error=Error('Saved work changed during the write. Export your current work before closing.');error.code='STORAGE_CONFLICT';throw error;}
  expected.set(key,value);
 };
 const assertCurrent=key=>{if(!expected.has(key))read(key);if(storage.getItem(key)!==expected.get(key)){const error=Error('Another tab changed this saved work. Download draft recovery before adopting the latest saved copy.');error.code='STORAGE_CONFLICT';throw error;}};
 const adopt=(key,raw)=>{if(storage.getItem(key)!==raw)throw Error('Browser draft changed during explicit recovery. Try again.');expected.set(key,raw);};
 return {read,write,assertCurrent,adopt};
}
