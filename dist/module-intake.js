import {parseDataModule,MAX_MODULE_BYTES,verifyModuleSource} from './data-module.js';
// Same-origin, one-shot in-memory handoff. No source bytes are written to browser storage here.
export function receiveModuleTask({href,apply,hash,notify,location=globalThis.location,history=globalThis.history}){
 const ticket=new URL(href).searchParams.get('moduleTicket');if(ticket===null)return;
 // Consume the one-shot URL before waiting: reload/back must reopen the workspace, not replay a dead transfer.
 if(location&&history){const current=new URL(location.href);if(current.searchParams.get('moduleTicket')===ticket){current.searchParams.delete('moduleTicket');history.replaceState(history.state,'',current.href);}}
 if(!/^[a-f0-9-]{36}$/.test(ticket)||typeof BroadcastChannel==='undefined'){notify('Module handoff unavailable. Choose the source file manually; existing work is unchanged.');return;}
 const channel=new BroadcastChannel('reckoner-module:'+ticket);let busy=false,finished=false;
 const finish=()=>{finished=true;clearTimeout(timeout);channel.close();};
 const timeout=setTimeout(()=>{if(!finished)notify('Module handoff expired. Return to the queue and open this task again.');finish();},20000);
 channel.onmessage=async event=>{const p=event.data;if(finished||busy||p?.type!=='source'||p.ticket!==ticket)return;busy=true;
  try{
   if(!(p.manifestBytes instanceof ArrayBuffer)||p.manifestBytes.byteLength>MAX_MODULE_BYTES)throw Error('Invalid module manifest handoff');
   const raw=new TextDecoder('utf-8',{fatal:true}).decode(p.manifestBytes),module=parseDataModule(raw),item=module.items.find(r=>r.id===p.taskId);if(!item)throw Error('Module task not found');
   const verified=await verifyModuleSource(item,p.file,hash);if(finished)return;
   const manifestSha256=await hash(p.manifestBytes);if(finished)return;
   clearTimeout(timeout);
   await apply({module,item,file:new File([verified.buffer],p.file.name,{type:verified.mime}),sha256:verified.sha256,manifestSha256});
   channel.postMessage({type:'accepted',ticket});finish();
  }catch(error){if(!finished){notify('Module task not applied: '+error.message);channel.postMessage({type:'refused',ticket,message:error.message});finish();}}
 };
 channel.postMessage({type:'request',ticket});
}
