// Faithful serialization seam for synthetic tests; native browser Web Locks is
// separately verified in browser evidence. One coordinator is shared by stores.
export function createTestLocks(){const tails=new Map();return {request(name,options,task){const prior=tails.get(name)||Promise.resolve(),result=prior.catch(()=>{}).then(task),tail=result.catch(()=>{});tails.set(name,tail);return result;}};}
export const testLocks=createTestLocks();
