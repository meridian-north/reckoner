import test from 'node:test';
import assert from 'node:assert/strict';
import {reasonDetails} from '../dist/reason-details.js';
test('full long AI reasons remain read-only literal text with visible attribution',()=>{
 const doc={createElement(tag){return {tag,children:[],style:{},attrs:{},append(...v){this.children.push(...v)},setAttribute(k,v){this.attrs[k]=v}}}};
 const reason='AI-SCRIPTED EXAMPLE\n'+('<script>literal</script> '.repeat(100))+'FINAL SENTENCE';
 const el=reasonDetails(doc,{label:'Read full mentor guidance',actor:'AI example — same assistant',reason});
 assert.equal(el.tag,'details');assert.equal(el.open,undefined);assert.equal(el.children[1].textContent,'AI example — same assistant');
 const field=el.children[2];assert.equal(field.value,reason);assert.equal(field.readOnly,true);assert.match(field.attrs['aria-label'],/same assistant/);assert.equal(field.innerHTML,undefined);
});
