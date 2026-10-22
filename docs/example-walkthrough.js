import {practiceTask} from './practice-tasks.js';

const HINTS=Object.freeze({
 'notice-date':['The machine text says “14 June 1912”. Compare that with the boxed date in the printed notice. Check the final digit.','Your reading starts as a copy of the machine text. Keep the month, year and surrounding sentence; change only what the image supports.'],
 'retention-word':['Look closely at the middle of the word after “the”. One narrow letter may have been mistaken for another.','Use the printed letter and the surrounding sentence together. A familiar word is a clue, not proof by itself.'],
 'signature-date':['Read the date below the clerk’s signature, rather than the meeting date higher on the page.','Compare the last letter of the month. Explain which date you checked so another reader can find it.'],
 'hyphen-join':['The word continues on the next printed line. Try reading the two pieces together.','Ask whether the hyphen only marks a line ending. Keep the original image; your reading can join the word.'],
 'hyphen-glyph':['First join the two pieces exactly as the machine read them. Does that solve the whole problem?','Now inspect the letter that looks wrong. Joining a line break and correcting a letter are two separate checks.'],
 'proper-name':['A place name may be unfamiliar without being wrong. Read both parts across the line ending.','Use the visible letters before relying on a dictionary or changing the name into a more familiar one.'],
 'fragment-join':['Look for spaces inserted inside a single printed word. Read the fragments in order.','Removing extra spaces does not give permission to change the letters. Describe the smallest supported change.'],
 'historic-spelling':['Compare the word as printed with the machine reading. Old spellings may differ from modern ones.','An unchanged reading can be a good result. Explain why you kept the source’s spelling.'],
 'sidebar-reflow':['Read the narrow margin note on its own, then read the body sentence separately.','Short rows in a sidebar can belong to one sentence. Any added labels should clearly describe your transcription.'],
 'column-order':['Follow one column from top to bottom before moving to the other.','Reading straight across the page can mix two separate statements. Explain the order you chose.'],
 'note-attribution':['Find the statement marked as an editor’s opinion. Compare it with the report text.','Keep the speaker or role attached to the opinion. Do not make it sound like a fact stated by the report.'],
 'intentional-hyphen':['Look at the hyphen inside the place name. Is it at the end of a printed line?','Some names contain a real hyphen. A rule that removes every hyphen would change the source.'],
 'ambiguous-layout':['Try reading across and then down. Look for a mark or arrow that establishes either order.','If the layout does not settle the question, keep the text, choose uncertainty and explain what another reviewer should check.'],
 'quote-normalization':['Inspect the quotation marks in the image, not just the letters inside them.','A search-friendly version can use different punctuation, but literal transcription should preserve the source’s marks.']
});

export function exampleSteps(id){
 const task=practiceTask(id),hints=HINTS[id];
 return [
  {title:'Look at the source',text:hints[0]},
  {title:'Decide what to keep or change',text:hints[1]},
  {title:'One proposed answer',text:task.reason,answer:task.proposed},
  {title:'Save your own reading',text:'Return to the form and decide what you read. Add your reason, name or handle, uncertainty, and the assistance you actually used. If these AI-written hints helped, say so. Choose Save my reading to record a step. You can disagree with the proposed answer or leave an uncertain case unresolved.'},
  {title:'What Reckoner saves',text:'Your answers stay in your browser; Reckoner does not write them back to GitHub or change the shared examples. Draft edits are kept for this example session when device storage is available. Save my reading adds a dated snapshot of your reading, reason, credit and source reference. Save to file downloads the JSON history to your device; reopen it with Open saved review. Keep source files separately. Sharing this page’s link does not share your edits, and clearing browser data can remove local work.'},
  {title:'How the checks help',text:'Reckoner records a file fingerprint, called SHA-256, to check whether a reopened source matches the recorded file. Saved history snapshots also have fingerprints and links to earlier snapshots, so Reckoner can check their continuity. These checks do not prove a reading is correct or who wrote it. That is why your reason, uncertainty and another person’s review still matter.'}
 ];
}

// A viewing aid only: no review-field, storage or history writes.
export function installExampleWalkthrough(doc,host){
 const make=tag=>doc.createElement(tag),get=id=>doc.getElementById(id);
 const trigger=make('button');trigger.id='example-walkthrough-open';trigger.type='button';trigger.textContent='Walk me through';trigger.hidden=true;trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','example-walkthrough');host.append(trigger);
 const prompt=make('section');prompt.id='example-task-prompt';prompt.hidden=true;prompt.setAttribute('aria-labelledby','example-task-question');
 const taskLabel=make('strong');taskLabel.textContent='Your task';const taskQuestion=make('p');taskQuestion.id='example-task-question';const taskHelp=make('p');taskHelp.textContent='Your reading starts as a copy of the machine text. Check the highlighted image, then change or keep that reading. Use Walk me through for hints.';prompt.append(taskLabel,taskQuestion,taskHelp);get('reading')?.prepend(prompt);
 const dialog=make('dialog');dialog.id='example-walkthrough';dialog.setAttribute('aria-labelledby','example-walkthrough-title');
 const heading=make('h2');heading.id='example-walkthrough-title';
 const label=make('p');label.className='helper';label.textContent='Optional hints · AI-written synthetic example';
 const status=make('p');status.id='example-walkthrough-status';status.setAttribute('role','status');
 const stepHeading=make('h3');stepHeading.id='example-walkthrough-step';stepHeading.tabIndex=-1;
 const text=make('p');text.id='example-walkthrough-text';
 const answer=make('pre');answer.id='example-walkthrough-answer';answer.hidden=true;
 const actions=make('div');actions.className='example-walkthrough-actions';
 const previous=make('button'),next=make('button'),close=make('button');
 for(const button of [previous,next,close]){button.type='button';button.className='quiet';}
 previous.textContent='Previous hint';close.textContent='Close guide';actions.append(previous,next,close);dialog.append(heading,label,status,stepHeading,text,answer,actions);doc.body.append(dialog);
 let task=null,steps=[],index=0,returnToReading=false;
 const render=()=>{const step=steps[index];heading.textContent=task.title;status.textContent='Step '+(index+1)+' of '+steps.length;stepHeading.textContent=step.title;text.textContent=step.text;answer.hidden=!step.answer;answer.textContent=step.answer||'';previous.disabled=index===0;next.textContent=index===steps.length-1?'Try it yourself':'Next hint';stepHeading.focus();};
 const finish=()=>{returnToReading=true;dialog.close();};
 const select=id=>{let selected=null;try{if(id)selected=practiceTask(id);}catch{}if(dialog.open)dialog.close();task=selected;steps=task?exampleSteps(task.id):[];trigger.hidden=!task;prompt.hidden=!task;if(task)taskQuestion.textContent=task.question||({'notice-date':'Does the boxed meeting date match the machine reading of 14 June 1912?','retention-word':'Check the boxed word: does the image agree with “orlginal” in the machine text?','signature-date':'Check the signature date below Council clerk: does the month agree with “Juno” in the machine text?'}[task.id]||task.title);const save=get('save-revision');if(save)save.textContent=task?'Save my reading':'Save reading';};
 trigger.addEventListener('click',()=>{if(!task)return;index=0;returnToReading=false;dialog.showModal();render();});
 previous.addEventListener('click',()=>{if(index>0){index--;render();}});
 next.addEventListener('click',()=>{if(index===steps.length-1)finish();else{index++;render();}});
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const buttons=[previous,next,close].filter(button=>!button.disabled),first=buttons[0],last=buttons.at(-1),active=doc.activeElement;if(event.shiftKey&&(active===first||!buttons.includes(active))){event.preventDefault();last.focus();}else if(!event.shiftKey&&active===last){event.preventDefault();first.focus();}});
 dialog.addEventListener('close',()=>{if(returnToReading){get('tab-reading')?.click();get('proposed')?.focus();}else if(!trigger.hidden)trigger.focus();returnToReading=false;});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();});
 doc.addEventListener('reckoner-example-changed',event=>select(event.detail?.taskId));
 select(doc.documentElement.dataset.exampleTask);
 return {dialog,trigger};
}
