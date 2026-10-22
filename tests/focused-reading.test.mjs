import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedRange,practiceRange,focusedValue,replaceFocused} from '../dist/focused-reading.js';
import {PRACTICE_TASKS} from '../dist/practice-tasks.js';
const state=task=>({sourceImage:{synthetic:true},context:{locator:task.locator,sourceFile:task.sourceFile||'example.svg'},draft:{original:task.original}});
test('select-all replacement of the disputed date digit preserves every surrounding character',()=>{
 const task=PRACTICE_TASKS[0],range=practiceRange(state(task));
 assert.equal(task.original.slice(range.start,range.end),'4');
 for(const value of ['7','4','', '77']){
  const full=replaceFocused(task.original,range,value),parts=focusedValue(task.original,full,range);
  assert.equal(parts.value,value);assert.equal(full,task.original.slice(0,range.start)+value+task.original.slice(range.end));
 }
 assert.equal(replaceFocused(task.original,range,'7'),task.proposed);
});
test('single-letter selection expands to its word; a digit remains one character',()=>{
 const text='The orlginal record, 14 June.';
 const letter=text.indexOf('l',text.indexOf('orlginal'));
 const word=selectedRange(text,letter,letter+1);assert.equal(text.slice(word.start,word.end),'orlginal');
 const digit=text.indexOf('4'),range=selectedRange(text,digit,digit+1);assert.equal(text.slice(range.start,range.end),'4');
 assert.equal(selectedRange(text,2,2),null);assert.equal(selectedRange(text,-1,4),null);
});
test('existing wider edits are never silently dropped by narrowing the editor',()=>{
 const task=PRACTICE_TASKS[0],range=practiceRange(state(task));
 assert.equal(focusedValue(task.original,'EDITED TITLE\n'+task.proposed,range),null);
 assert.equal(focusedValue(task.original,'7',range),null);
});
test('every known practice range can reconstruct its unchanged baseline without applying an answer',()=>{
 for(const task of PRACTICE_TASKS){const range=practiceRange(state(task)),parts=focusedValue(task.original,task.original,range);assert.ok(parts,task.id);assert.equal(replaceFocused(task.original,range,parts.value),task.original);}
 const task=PRACTICE_TASKS[0],other=state(task);other.sourceImage.synthetic=false;assert.equal(practiceRange(other),null);
});
