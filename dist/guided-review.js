// A user-started explanation. Never writes review fields, storage or records.
const defaultSteps = [
 ['A useful lead, then your judgment', 'An agent or another reader may flag a possible problem. Choose a reported lead or bring your own. A report is a starting point, not a verified error. This form does not run an agent, download the source or make the decision for you.'],
 ['Choose one source', 'Open your original image or PDF yourself. Keep its filename, version and page reference. Starting this guide does not load an example or replace your draft.'],
 ['Read the layout', 'Inspect one passage against the image. A margin note may be one phrase broken over several printed lines. Keep it separate from the body text.'],
 ['Preserve the original reading', 'Keep the original OCR unchanged. Enter a proposed reading only where the source supports it. Do not remove every hyphen automatically.'],
 ['A real margin example', 'On printed page 458 of the retained statute example, the margin reads: “Public act ap- / proved February / 26, 1881. / Amended.” Reading the margin as one phrase gives: “Public act approved February 26, 1881. Amended.” Inspect the original before accepting that proposal. The original image is not bundled here; open your permitted source yourself.'],
 ['Separate the checks', 'This explanation is AI-written from a privately inspected source and your earlier correction recollection. The historical saved human ruling has not been reconciled. A separate June/Juno check must be made against its own passage. This guide does not establish a new human ruling or silently replace your text.'],
 ['Give a reason', 'Explain the precise change and what you checked. Record the page or region and any remaining uncertainty. Label AI-written examples and assistance clearly.'],
 ['Save deliberately', 'Add the contributor credit you want recorded, then use the form’s save control yourself. This guide does not save a reading or certify a contributor’s identity.'],
 ['Ask for a second check', 'In Decisions & history, a mentor can explain a repeatable source check. Keep disagreement and uncertainty visible. A mentor’s advice is separate from your first reason.'],
 ['Help the next reader', 'Export a review record, reopen it, and inspect the saved reason, mentor guidance, contributor credit and AI labels. Another reader can follow those saved checks instead of starting again. Keep your original source alongside the backup; do not assume it is embedded.'],
 ['Offer the host a checkable contribution', 'If you choose to submit, follow the host’s agreed process. Offer the exact source reference, minimal permitted evidence, proposed reading or documented gap, and remaining uncertainty. The host decides whether to use it. Nothing in this guide submits, changes a collection or claims Internet Archive approval.']
];
const courtSteps = [
 ['Start with your court sample', 'Open demo-001.png or demo-002.png from the court demo ZIP using Open file. This guide does not load a file, fetch a source or replace your draft.'],
 ['Keep the source reference', 'In Source & context, enter United States v. Spearin, 248 U.S. 132 (1918), the GovInfo PDF link, and printed page 134 for demo-001 or 136 for demo-002. Return to Compare & read.'],
 ['Load the machine reading', 'Use Load text to select the matching machine-text/demo-001.txt or demo-002.txt, or paste its contents into Original machine reading. These are real extraction results, not deliberately corrupted text.'],
 ['Compare one small passage', 'On page 134, inspect the dam height, including the printed fraction. On page 136, inspect the Simpson citation and U. S. Read the image before accepting any suggested change. Use Focus scan or Focus reading for more room.'],
 ['Propose and explain', 'Keep the original extraction unchanged. Enter your proposed reading and a precise reason. Distinguish layout hyphens from word hyphens; leave uncertain text unresolved. AI-selected task notes are suggestions, not a human ruling.'],
 ['Save your reading', 'Add the contributor credit you want recorded, then click 1. Save proposed reading in the persistent bottom bar. Read any missing-field message. Saving on this device is separate from downloading a backup.'],
 ['Ask for a mentor check', 'Click 3. Review / mentor. Select the saved reading, enter the reviewer credit, choose Mentor and record a repeatable source check. If AI supplies this example guidance, label it AI-assisted; do not attribute it to an independent human mentor.'],
 ['Download a backup', 'Click 2. Download backup. Keep that JSON review record next to the court page image. The image is separate and must be reopened locally; do not assume it is embedded in the backup.'],
 ['Reopen and follow the saved steps', 'Under Open / more actions choose Open saved work and select the downloaded JSON. Inspect Decisions & history, expand the full reason and mentor guidance, and use saved-step replay. Confirm credit, uncertainty and AI labels remain visible. Nothing is submitted to a source host.']
];
const isCourtSample = () => /govinfo\.gov\/content\/pkg\/USREPORTS-248\/pdf\/USREPORTS-248-132\.pdf/.test(document.querySelector('#sourceUrl')?.value || '') || /Spearin/i.test(document.querySelector('#title')?.value || '');
const start = document.querySelector('#start-guided-review');
if (start) {
 const panel=document.createElement('section');panel.hidden=true;panel.className='disclosure guided-review-card';panel.setAttribute('aria-label','Guided review');
 const heading=document.createElement('h2');heading.tabIndex=-1;
 const text=document.createElement('p');
 const status=document.createElement('p');status.setAttribute('role','status');
 const previous=document.createElement('button'),next=document.createElement('button'),close=document.createElement('button');
 for(const button of [previous,next,close])button.type='button';
 previous.textContent='Previous';close.textContent='Close guide';
 panel.append(heading,text,status,previous,next,close);start.after(panel);let index=0,returnFocus=start,steps=defaultSteps;
 const finish=()=>{panel.hidden=true;returnFocus.focus();};
 const render=()=>{heading.textContent=steps[index][0];text.textContent=steps[index][1];status.textContent=`Step ${index+1} of ${steps.length}`;previous.disabled=index===0;next.textContent=index===steps.length-1?'Finish':'Next';heading.focus();};
 const begin=trigger=>{returnFocus=trigger;steps=isCourtSample()?courtSteps:defaultSteps;index=0;panel.hidden=false;render();};
 start.addEventListener('click',()=>begin(start));
 const quick=document.getElementById('quick-guide');quick?.addEventListener('click',()=>begin(quick));
 previous.addEventListener('click',()=>{if(index>0){index--;render();}});
 next.addEventListener('click',()=>{if(index===steps.length-1)finish();else{index++;render();}});
 close.addEventListener('click',finish);
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish();}});
}

document.getElementById("quick-check")?.addEventListener("click",()=>document.getElementById("tab-reading")?.click());
