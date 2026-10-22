// A user gesture opens the picker. No directory is selected or granted silently.
export async function saveToChosenFile(blob, filename, picker = globalThis.showSaveFilePicker?.bind(globalThis)) {
 if(typeof picker!=='function')return {status:'unsupported'};
 let writable;
 try{
  const extension=filename.endsWith('.json')?'.json':filename.endsWith('.csv')?'.csv':'.txt';
  const mime={'.json':'application/json','.csv':'text/csv','.txt':'text/plain'}[extension];
  const handle=await picker({suggestedName:filename,id:'reckoner-export',startIn:'documents',types:[{description:{'.json':'Review record','.csv':'Readings index','.txt':'Readable report'}[extension],accept:{[mime]:[extension]}}]});
  writable=await handle.createWritable();await writable.write(blob);await writable.close();
  return {status:'saved'};
 }catch(error){
  if(writable){try{await writable.abort();}catch{}}
  if(error?.name==='AbortError')return {status:'cancelled'};
  throw error;
 }
}
