// Isolated synthetic browser checks of the current compact workspace.
// Exercises source geometry, reachable inputs, one More menu, keyboard/touch resize,
// theme contrast and no source/reading mutation. No operator profile is accessed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {STATIC_TYPES} from './static-types.mjs';
const {chromium}=process.env.PLAYWRIGHT_MODULE?createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE):await import('playwright');
const root=fileURLToPath(new URL('../dist',import.meta.url));
const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error('outside');const bytes=await fs.readFile(file);res.writeHead(200,{'content-type':STATIC_TYPES[path.extname(file)]||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/',output=path.resolve(process.argv[2]||'.build/compact-pairing');
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),errors=[],external=[],results=[];
async function page(options){const p=await browser.newPage(options);p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',route=>route.request().url().startsWith(base)?route.continue():(external.push(route.request().url()),route.abort()));await p.goto(base+'index.html?practice=notice-date&practiceSession='+crypto.randomUUID());await p.waitForFunction(()=>document.getElementById('scan-image').naturalWidth>0);return p;}
async function sourceDigest(p){return p.locator('#scan-image').evaluate(async image=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await (await fetch(image.src)).arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join(''));}
function contrast(a,b){const luminance=c=>{const v=c.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return v[0]*.2126+v[1]*.7152+v[2]*.0722;};const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
async function saveAccessible(p,size){const box=await p.locator('#save-revision').boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=size.height,'Save must remain inside the viewport: '+JSON.stringify({size,box}));}
async function aligned(p){await p.waitForFunction(()=>{const i=document.getElementById('scan-image').getBoundingClientRect(),m=document.getElementById('passage-highlight').getBoundingClientRect();return Math.abs(m.left-i.left-.142*i.width)<2&&Math.abs(m.top-i.top-.375*i.height)<2;},{},{timeout:3000});}
try{
 for(const size of [{width:1280,height:800},{width:847,height:498}]){
  const p=await page({viewport:size}),before=await p.locator('#proposed').inputValue(),baseline=await p.locator('#original').inputValue(),source=await sourceDigest(p);
  assert.equal(await p.locator('#preview-stage').innerText(),'Alpha');
  assert.equal(await p.locator('#record-tools-menu').count(),0,'Obsolete duplicate menu must be absent');
  assert.equal(await p.locator('#oc-tools > summary').innerText(),'More');
  await p.locator('#passage-highlight').focus();await p.keyboard.press('Enter');
  assert.equal(await p.evaluate(()=>document.activeElement.id),'focused-reading-input');
  assert.equal(await p.locator('#focused-reading-input').inputValue(),'4','Only the disputed digit is editable');
  assert.equal(await p.locator('#proposed').inputValue(),before);
  const divider=p.locator('#source-pane-divider'),initialWidth=await p.locator('#image-stage').evaluate(e=>e.getBoundingClientRect().width);await divider.focus();await p.keyboard.press('ArrowRight');await p.waitForFunction(width=>document.getElementById('image-stage').getBoundingClientRect().width>width,initialWidth);assert.equal(await divider.getAttribute('aria-valuenow'),'45');
  const bounds=await p.locator('#source-visuals').boundingBox(),grip=await divider.boundingBox();await p.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);await p.mouse.down();await p.mouse.move(bounds.x+bounds.width*.45,grip.y+grip.height/2);await p.mouse.up();assert.equal(await divider.getAttribute('aria-valuenow'),'45');await p.waitForTimeout(80);await aligned(p);
  await divider.focus();await p.keyboard.press('End');assert.equal(await divider.getAttribute('aria-valuenow'),'75');await p.waitForTimeout(80);await aligned(p);await p.keyboard.press('Home');assert.equal(await divider.getAttribute('aria-valuenow'),'42');
  // Whole-page view must fit actual portrait image pixels inside the available pane.
  // The enclosing pane can be landscape in a short window; its aspect is not the image aspect.
  await p.getByRole('button',{name:'Show whole page larger',exact:true}).click();
  const full=await p.locator('#scan-image').evaluate(image=>{const r=image.getBoundingClientRect(),s=document.getElementById('image-stage').getBoundingClientRect();return {w:r.width,h:r.height,ratio:r.width/r.height,natural:image.naturalWidth/image.naturalHeight,fits:r.left>=s.left-1&&r.top>=s.top-1&&r.right<=s.right+1&&r.bottom<=s.bottom+1};});
  assert.ok(full.fits&&full.w>0&&full.h>0&&Math.abs(full.ratio-full.natural)<.01,JSON.stringify({size,full}));
  assert.equal(await p.locator('#passage-loupe').isVisible(),false);await p.locator('#show-passage-loupe').click();await aligned(p);
  // Fields may scroll in a compact pane. Each must be reachable without a fixed save row covering it.
  for(const id of ['focused-reading-input','reason','contributor','assistance']){await p.locator('#'+id).focus();await p.locator('#'+id).scrollIntoViewIfNeeded();const visible=await p.locator('#'+id).evaluate(e=>{const r=e.getBoundingClientRect(),pane=document.getElementById('reading-fields').getBoundingClientRect(),save=document.getElementById('save-revision').getBoundingClientRect();return Math.min(r.bottom,pane.bottom,save.top)-Math.max(r.top,pane.top)>20;});assert.ok(visible,'Reachable input: '+id+' at '+size.width);await saveAccessible(p,size);}
  // Settings remains in the single More menu; theme changes may not mutate a reading.
  await p.locator('#oc-tools > summary').click();await p.locator('#open-settings').click();await p.locator('#workspace-appearance').selectOption('archive-companion');await p.locator('#settings button[aria-label]').filter({hasText:'×'}).click();
  assert.match(await p.locator('.archive-companion-bar').innerText(),/No Internet Archive endorsement implied/);
  assert.equal(await p.locator('#proposed').inputValue(),before);await saveAccessible(p,size);
  const colors=await p.locator('#oc-start a.quiet, #preview-stage').evaluateAll(items=>items.filter(e=>e.getClientRects().length).map(e=>{let node=e,paper='rgb(255, 255, 255)';while(node){const bg=getComputedStyle(node).backgroundColor;if(bg!=='transparent'&&bg!=='rgba(0, 0, 0, 0)'){paper=bg;break;}node=node.parentElement;}return {label:e.textContent,ink:getComputedStyle(e).color,paper};}));assert.ok(colors.length>=2);for(const color of colors)assert.ok(contrast(color.ink,color.paper)>=4.5,'Readable theme text contrast: '+JSON.stringify(color));
  assert.equal(await p.locator('#original').inputValue(),baseline);assert.equal(await sourceDigest(p),source);
  await p.locator('#oc-tools > summary').click();await p.keyboard.press('Escape');assert.equal(await p.locator('#oc-tools').evaluate(e=>e.open),false);assert.equal(await p.evaluate(()=>document.activeElement===document.querySelector('#oc-tools > summary')),true);
  await p.locator('#oc-tools > summary').click();await p.locator('#image-stage').click({position:{x:3,y:3}});assert.equal(await p.locator('#oc-tools').evaluate(e=>e.open),false);assert.equal(await p.locator('#proposed').inputValue(),before);
  await p.screenshot({path:output+'/'+size.width+'x'+size.height+'.png'});results.push({size,fullImageFits:true,highlightAligned:true,inputsReachable:true,saveVisible:true,singleMenu:true,themePreservesReading:true});await p.close();
 }
 const size={width:1280,height:800},p=await page({viewport:size,hasTouch:true}),before=await p.locator('#proposed').inputValue(),baseline=await p.locator('#original').inputValue(),source=await sourceDigest(p),divider=p.locator('#source-pane-divider'),area=await p.locator('#source-visuals').boundingBox(),grip=await divider.boundingBox(),cdp=await p.context().newCDPSession(p),point=x=>({x,y:grip.y+grip.height/2,radiusX:2,radiusY:2,force:1,id:1});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(grip.x+grip.width/2)]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(area.x+area.width*.55)]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await divider.getAttribute('aria-valuenow'),'55');assert.equal(await p.locator('#source-visuals').evaluate(e=>e.classList.contains('resizing')),false);
 await divider.focus();await p.keyboard.press('Home');await p.keyboard.press('Shift+ArrowRight');assert.equal(await divider.getAttribute('aria-valuenow'),'52');await p.keyboard.press('End');await p.keyboard.press('ArrowRight');assert.equal(await divider.getAttribute('aria-valuenow'),'75');await p.keyboard.press('Home');for(let i=0;i<12;i++)await p.keyboard.press('ArrowLeft');assert.equal(await divider.getAttribute('aria-valuenow'),'12');assert.equal(await p.locator('#proposed').inputValue(),before);
 assert.equal(await p.locator('#original').inputValue(),baseline);assert.equal(await sourceDigest(p),source);await p.screenshot({path:output+'/emulated-touch-keyboard.png'});await p.close();assert.deepEqual(errors,[]);assert.deepEqual(external,[]);results.push({emulatedTouchResize:true,keyboardBounds:true,sourceReadingUnchanged:true,scope:'Chromium CDP touch emulation; physical touchscreen and VoiceOver speech acceptance remain pending'});await fs.writeFile(output+'/RESULTS.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();server.close();}
