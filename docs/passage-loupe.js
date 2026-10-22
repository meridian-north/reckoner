// Viewing only: magnify an identified source region without changing source bytes.
export function installPassageLoupe(doc=document){
 const image=doc.getElementById('scan-image'),stage=doc.getElementById('image-stage');if(!image||!stage)return;
 const visuals=doc.createElement('div');visuals.id='source-visuals';stage.before(visuals);visuals.append(stage);
 const panel=doc.createElement('section');panel.id='passage-loupe';panel.hidden=true;panel.setAttribute('aria-label','Readable source passage');
 const heading=doc.createElement('strong');heading.textContent='Highlighted source';heading.title='Highlighted passage from the original image';const canvas=doc.createElement('canvas');canvas.id='passage-loupe-canvas';canvas.setAttribute('role','img');
 const caption=doc.createElement('p');caption.id='passage-loupe-caption';caption.textContent='The small page at left keeps your place. The enlarged passage uses the same original image.';
 const toggle=doc.createElement('button');toggle.type='button';toggle.id='passage-loupe-toggle';toggle.textContent='Whole page';toggle.setAttribute('aria-label','Show whole page larger');
 const reset=doc.createElement('button');reset.type='button';reset.id='reset-passage-view';reset.textContent='Enlarge highlighted passage';reset.hidden=true;reset.addEventListener('click',()=>resize(18));
 const divider=doc.createElement('div');divider.id='source-pane-divider';divider.hidden=true;divider.tabIndex=0;divider.setAttribute('role','separator');divider.setAttribute('aria-orientation','vertical');divider.setAttribute('aria-label','Resize page overview and highlighted passage');divider.setAttribute('aria-controls','image-stage passage-loupe');divider.title='Drag to resize · arrow keys adjust · Home resets';
 panel.append(heading,canvas,caption,reset,toggle);visuals.append(divider,panel);
 let split=18;
 function resize(value){split=Math.max(12,Math.min(75,value));reset.hidden=split<=35;visuals.style.setProperty('--overview-share',split+'%');divider.setAttribute('aria-valuemin','12');divider.setAttribute('aria-valuemax','75');divider.setAttribute('aria-valuenow',String(Math.round(split)));divider.setAttribute('aria-valuetext',Math.round(split)+' percent page overview');requestAnimationFrame(draw);}
 resize(split);
 divider.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();resize(event.key==='Home'?18:event.key==='End'?75:split+(event.key==='ArrowRight'?1:-1)*(event.shiftKey?10:3));});
 let drag=null;
 divider.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();divider.focus();drag=event.pointerId;divider.setPointerCapture(drag);visuals.classList.add('resizing');});
 divider.addEventListener('pointermove',event=>{if(event.pointerId!==drag)return;const rect=visuals.getBoundingClientRect();if(rect.width)resize((event.clientX-rect.left)/rect.width*100);});
 function stop(){drag=null;visuals.classList.remove('resizing');}
 divider.addEventListener('pointerup',stop);divider.addEventListener('pointercancel',stop);divider.addEventListener('lostpointercapture',stop);divider.addEventListener('dblclick',()=>resize(18));
 let region=null,showing=false;
 function draw(){if(!region||image.hidden||!image.complete||!image.naturalWidth)return;const rect=canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
  const ratio=Math.min(devicePixelRatio||1,3),width=Math.round(rect.width*ratio),height=Math.round(rect.height*ratio);if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle='#f1f1ed';ctx.fillRect(0,0,rect.width,rect.height);
  const [x,y,w,h]=region.box,nw=image.naturalWidth,nh=image.naturalHeight,padX=Math.max(6,w*nw*.06),padY=Math.max(10,h*nh*.65);
  const left=Math.max(0,x*nw-padX),top=Math.max(0,y*nh-padY),right=Math.min(nw,(x+w)*nw+padX),bottom=Math.min(nh,(y+h)*nh+padY),sw=right-left,sh=bottom-top;
  const scale=Math.min((rect.width-12)/sw,(rect.height-12)/sh,4),dw=sw*scale,dh=sh*scale,dx=(rect.width-dw)/2,dy=(rect.height-dh)/2;
  ctx.imageSmoothingEnabled=true;ctx.drawImage(image,left,top,sw,sh,dx,dy,dw,dh);ctx.strokeStyle='#ad5100';ctx.lineWidth=2;ctx.strokeRect(dx+(x*nw-left)*scale,dy+(y*nh-top)*scale,w*nw*scale,h*nh*scale);
  canvas.setAttribute('aria-label','Magnified original source region. '+region.question);caption.textContent='Page overview at left · selected passage enlarged here. Viewing only; original bytes unchanged.';
 }
 function show(value){showing=Boolean(value&&region);panel.hidden=!showing;divider.hidden=!showing;visuals.classList.toggle('has-loupe',showing);stage.classList.add('fit-page');toggle.textContent='Whole page';toggle.setAttribute('aria-label','Show whole page larger');requestAnimationFrame(draw);}
 doc.addEventListener('reckoner-source-region',event=>{const value=event.detail;if(!value||!Array.isArray(value.box)||value.box.length!==4||!value.box.every(Number.isFinite))return;const [x,y,w,h]=value.box;if(x<0||y<0||w<=0||h<=0||x+w>1.000001||y+h>1.000001)return;const changed=!region||JSON.stringify(region.box)!==JSON.stringify(value.box);region={box:[...value.box],question:String(value.question||'Check this passage').slice(0,500)};if(changed||value.activate)show(true);else if(showing)draw();});
 toggle.onclick=()=>show(false);
 const reopen=doc.createElement('button');reopen.type='button';reopen.id='show-passage-loupe';reopen.textContent='Read highlighted passage';reopen.hidden=true;doc.querySelector('.image-controls').append(reopen);reopen.onclick=()=>show(true);
 new MutationObserver(()=>{reopen.hidden=!region||showing;}).observe(visuals,{attributes:true,attributeFilter:['class']});
 for(const id of ['source-image','open-document','new-workspace','import-button','load-example','example-image','load-real-example'])doc.getElementById(id)?.addEventListener(id==='source-image'?'change':'click',()=>{region=null;show(false);reopen.hidden=true;});
 image.addEventListener('load',draw);new ResizeObserver(draw).observe(canvas);
 return {draw};
}
if(typeof document!=='undefined')installPassageLoupe();
