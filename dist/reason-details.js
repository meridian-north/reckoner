// Read-only disclosure: source text is never interpreted as HTML or edited.
export function reasonDetails(doc,{label,actor,reason}) {
 const details=doc.createElement('details'),summary=doc.createElement('summary');summary.textContent=label;
 const attribution=doc.createElement('p');attribution.textContent=actor;attribution.className='meta';
 const field=doc.createElement('textarea');field.readOnly=true;field.rows=Math.min(10,Math.max(2,Math.ceil((reason||'').length/75)));field.value=reason||'';
 field.setAttribute('aria-label',label+' — '+actor);field.style.width='100%';field.style.whiteSpace='pre-wrap';
 details.append(summary,attribution,field);return details;
}
