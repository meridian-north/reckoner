// A different source must not inherit the machine-text lock of an older reading.
export function savedMachineReading(state){
 const original=state.draft?.original;if(typeof original!=='string'||!original.trim())return false;
 return state.revisions.some(r=>r.reading.original===original&&
  (state.sourceImage?.sha256 ? r.sourceImage?.sha256===state.sourceImage.sha256 : !r.sourceImage?.sha256)&&
  ['sourceFile','sourceUrl','locator'].every(k=>(r.context[k]||'')===(state.context[k]||'')));
}
