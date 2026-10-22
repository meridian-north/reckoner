// Text is evidence to display, never HTML/XML to execute or resolve.
export const MAX_TEXT_SOURCE_BYTES=200000;
export function isTextSource(file){return /\.(txt|html?|xml)$/i.test(file.name||'');}
export function decodeTextSource(file,buffer){
 if(!isTextSource(file))throw Error('Choose a .txt, .html, .htm or .xml text source.');
 if(file.size>MAX_TEXT_SOURCE_BYTES||buffer.byteLength>MAX_TEXT_SOURCE_BYTES)throw Error('Choose a text source under 200 KB.');
 let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{throw Error('This text source is not valid UTF-8. Preserve the original and convert a separate copy before opening.');}
 if(!text.trim()||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))throw Error('This source is empty or contains binary control bytes; it was not opened.');
 return text;
}
