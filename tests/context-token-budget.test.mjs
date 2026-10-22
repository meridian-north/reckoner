import test from 'node:test';import assert from 'node:assert/strict';import {measureContextBudget,loadBudgetTokenizer} from '../dist/context-token-budget.js';
// Owned counter fixture tests arithmetic only; real tokenizer has a separate pinned-file check.
const counter={encode:text=>({ids:[...text]})};
test('no tokenizer never implies fit; Unicode bytes and characters differ',()=>{const r=measureContextBudget({definition:'é 🙂',outputTokens:512,marginTokens:128});assert.equal(r.fits,null);assert.equal(r.status,'NOT_MEASURED');assert.equal(r.characters,3);assert.equal(r.utf8Bytes,7);});
test('whole prompt and response/margin determine exact boundary without truncation',()=>{const args={tokenizer:counter,definition:'x'.repeat(3000),before:'b'.repeat(200),after:'a'.repeat(256),outputTokens:512,marginTokens:128};assert.equal(measureContextBudget(args).remainingTokens,0);assert.equal(measureContextBudget(args).fits,true);assert.equal(measureContextBudget({...args,definition:args.definition+'x'}).fits,false);assert.equal(args.definition.length,3000);});
test('oversize text, invalid reserves and wrong tokenizer bytes fail closed',async()=>{for(const extra of [{outputTokens:-1},{marginTokens:1.5},{definition:'x'.repeat(65537)}])assert.throws(()=>measureContextBudget({definition:'x',outputTokens:512,marginTokens:128,...extra}));await assert.rejects(loadBudgetTokenizer(new Uint8Array([1]),new Uint8Array([2])),/pinned/);});
test('boundary-merging tokenizer keeps whole-prompt fit exact and component allowance explicitly approximate',()=>{
 const merges={encode:text=>({ids:[...text.replaceAll('ab','!')]})};
 const r=measureContextBudget({tokenizer:merges,before:'a',definition:'XYZ',after:'b',outputTokens:0,marginTokens:0});
 assert.equal(r.promptTokens,5);assert.equal(r.remainingTokens,4091);assert.equal(r.standaloneDefinitionTokens,3);assert.equal(r.joinedOtherTextTokens,1);assert.equal(r.approximateDefinitionAllowanceTokens,4095);assert.match(r.componentCountWarning,/boundaries/);assert.equal(Object.hasOwn(r,'availableForDefinition'),false);assert.equal(Object.hasOwn(r,'definitionTokens'),false);
});
