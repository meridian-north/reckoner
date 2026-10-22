// Copy exact user-visible text. Never edit a reading or navigate the source.
export async function copyTextField(field, clipboard, {selectedOnly=false, schedule=setTimeout, cancel=clearTimeout}={}) {
  const text=field.value;
  const start=selectedOnly?field.selectionStart:0,end=selectedOnly?field.selectionEnd:text.length;
  if(selectedOnly&&start===end)throw Error('Select a passage in the text first.');
  const copied=text.slice(start,end);
  if(!copied)throw Error('There is no text to copy yet.');
  let timer;
  const timeout=Symbol('clipboard timeout');
  try {
    if(typeof clipboard?.writeText!=='function')throw Error('Clipboard unavailable.');
    // A timeout bounds the UI wait; it cannot cancel the platform clipboard write.
    const result=await Promise.race([
      Promise.resolve(clipboard.writeText(copied)),
      new Promise(resolve=>{timer=schedule(()=>resolve(timeout),5000);})
    ]);
    if(result===timeout){
      const warning='Clipboard did not respond in time. The earlier copy may still finish later. ';
      if(field.value!==text)return {status:'timeout-changed',message:warning+'Text changed; select the current passage and use your browser’s Copy command.'};
      field.focus();field.setSelectionRange(start,end);
      return {status:'timeout-selected',message:warning+'Text selected for your browser’s Copy command. Nothing was edited.'};
    }
    return {status:'copied',message:'Copied the exact '+(selectedOnly?'selected passage':'text')+' as it was when you pressed Copy.'};
  } catch {
    if(field.value!==text)return {status:'changed',message:'Clipboard unavailable and the text changed. Select the passage again before copying.'};
    field.focus();field.setSelectionRange(start,end);
    return {status:'selected',message:'Text selected. Use your browser’s Copy command to copy it. Nothing was edited.'};
  } finally { if(timer!==undefined)cancel(timer); }
}
export function installCopyControls(document, clipboard, timing={}) {
  const buttons=[];let busy=false;
  for(const [id,label] of [['original','original OCR'],['proposed','proposed reading']]){
    const field=document.getElementById(id);if(!field)throw Error('Missing text field: '+id);
    const controls=document.createElement('div');controls.className='copy-passage-controls';
    const status=document.createElement('span');status.className='helper';status.setAttribute('role','status');
    for(const selectedOnly of [false,true]){
      const button=document.createElement('button');button.type='button';button.className='quiet compact';
      button.textContent=selectedOnly?'Copy selected passage':'Copy '+label;
      button.addEventListener('click',async()=>{
        if(busy)return;busy=true;for(const b of buttons)b.disabled=true;
        try{status.textContent=(await copyTextField(field,clipboard,{...timing,selectedOnly})).message;}
        catch(error){status.textContent=error.message;}
        finally{busy=false;for(const b of buttons)b.disabled=false;}
      });buttons.push(button);controls.append(button);
    }
    controls.append(status);field.before(controls);
  }
}
if(typeof document!=='undefined')installCopyControls(document,navigator.clipboard);
