import {Tokenizer} from './hf-tokenizers-0.2.0.mjs';
import {digest} from './core.js';
export const BITNET_PROFILE=Object.freeze({model:'microsoft/bitnet-b1.58-2B-4T',revision:'04c3b9ad9361b824064a1f25ea60a8be9599b127',contextTokens:4096,tokenizerSha256:'e134af98b985517b4f068e3755ae90d4e9cd2d45d328325dc503f1c6b2d06cc7',configSha256:'d27b698683435b0b0dd544a591a30196b2b63f5fd4c8c64b9060a84dc185386f'});
const E=new TextEncoder(),D=new TextDecoder('utf-8',{fatal:true});
export async function loadBudgetTokenizer(tokenizerBytes,configBytes){
 const owned=[[tokenizerBytes,12*1024*1024,BITNET_PROFILE.tokenizerSha256],[configBytes,128*1024,BITNET_PROFILE.configSha256]].map(([bytes,max,pin])=>{
  if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>max)throw Error('Tokenizer file exceeds its byte budget.');
  return {bytes:new Uint8Array(bytes),pin};
 });
 for(const {bytes,pin} of owned)if(await digest(bytes)!==pin)throw Error('Tokenizer file does not match the pinned BitNet revision.');
 return new Tokenizer(JSON.parse(D.decode(owned[0].bytes)),JSON.parse(D.decode(owned[1].bytes)));
}
export function measureContextBudget({tokenizer=null,definition='',before='',after='',outputTokens,marginTokens}){
 for(const text of [definition,before,after])if(typeof text!=='string'||E.encode(text).length>65536)throw Error('Each text part must fit 65,536 UTF-8 bytes; nothing was shortened.');
 for(const n of [outputTokens,marginTokens])if(!Number.isSafeInteger(n)||n<0||n>4096)throw Error('Enter whole-token reserves from 0 to 4,096.');
 const metrics={words:definition.trim()?definition.trim().split(/\s+/u).length:0,characters:[...definition].length,utf8Bytes:E.encode(definition).length};
 if(!tokenizer)return {status:'NOT_MEASURED',fits:null,...metrics};
 const count=t=>tokenizer.encode(t,{add_special_tokens:false}).ids.length;
 const assembled=before+definition+after,promptTokens=count(assembled),otherTokens=count(before+after),definitionTokens=count(definition),available=4096-outputTokens-marginTokens-otherTokens;
 return {status:promptTokens+outputTokens+marginTokens<=4096?'FITS_RENDERED_TEXT':'OVER_BUDGET',fits:promptTokens+outputTokens+marginTokens<=4096,...metrics,standaloneDefinitionTokens:definitionTokens,joinedOtherTextTokens:otherTokens,promptTokens,outputTokens,marginTokens,approximateDefinitionAllowanceTokens:Math.max(0,available),componentCountWarning:'Component tokenization changes at text boundaries. Only the full supplied prompt count, total remaining budget and fit verdict are exact for that supplied text.',remainingTokens:4096-promptTokens-outputTokens-marginTokens,model:BITNET_PROFILE.model,tokenizerRevision:BITNET_PROFILE.revision,scope:'Exact supplied rendered text; chat template and special tokens must already be included. No inference, comprehension or model execution claimed.'};
}
