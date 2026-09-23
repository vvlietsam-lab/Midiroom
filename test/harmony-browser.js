/* Chord import -> pack: uses a real 16-bar chord MIDI exported from Ableton. */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const FIXTURE=path.resolve(__dirname,'fixtures/chords-16bar.mid');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 const ok=(v,m)=>{assert.ok(v,m);checks.push(m);};
 const out=process.env.QA_OUTPUT||path.resolve('test-results/harmony');fs.mkdirSync(out,{recursive:true});
 await page.goto('file://'+path.resolve(__dirname,'../index.html'));
 await page.evaluate(()=>applyGenre('rawphoric',false));
 await page.locator('#studioTool-groove').click();
 await page.locator('#grooveFile').setInputFiles(FIXTURE);
 await page.waitForFunction(()=>!$('grooveControls').hidden);

 // 1. detection
 await page.locator('#grooveHarmony').click();
 await page.waitForFunction(()=>!$('grooveHarmonyBox').hidden);
 ok(await page.locator('#grooveHarmonyKey option').count()>=3,'alternatieve toonsoorten aangeboden');
 const info=await page.locator('#grooveHarmonyInfo').innerText();
 ok(/16 maten/.test(info),'lengte van het bronbestand herkend: '+info);
 ok(/–|-/.test(info),'schema getoond');

 // 2. takeover keeps the user's own chord notes
 const srcPitches=await page.evaluate(()=>window.__midiroomHarmony.sourceEvents.map(e=>e.midi).sort((a,b)=>a-b).join(','));
 await page.locator('#grooveHarmonyUse').click();
 ok(await page.evaluate(()=>current.meta.bars===16),'sessie volgt de 16 maten van het bestand');
 const kept=await page.evaluate(()=>current.parts.find(p=>p.id==='chords').events.map(e=>e.midi).sort((a,b)=>a-b).join(','));
 ok(kept===srcPitches,'eigen akkoordnoten exact behouden');

 // 3. pack
 await page.locator('#grooveHarmonyPack').click();
 const pack=await page.evaluate(()=>({
   parts:current.parts.map(p=>p.id),
   bars:current.meta.bars,
   notes:current.parts.reduce((a,p)=>a+p.events.length,0),
   chords:current.parts.find(p=>p.id==='chords').events.map(e=>e.midi).sort((a,b)=>a-b).join(','),
   root:+$('root').value, scale:$('scale').value,
 }));
 ok(pack.parts.length>=7,'pack bevat meerdere instrumenten ('+pack.parts.length+')');
 ok(pack.bars===16,'pack is 16 maten');
 ok(pack.notes>200,'pack bevat noten ('+pack.notes+')');
 ok(pack.chords===srcPitches,'pack laat de eigen akkoorden onaangeroerd');

 // 4. everything generated sits in the detected key
 const off=await page.evaluate(()=>{
  const root=+$('root').value,steps=SCALES[$('scale').value].steps;
  const allowed=new Set(steps.map(s=>(root+s)%12));
  let bad=0;
  current.parts.filter(p=>p.id!=='drums'&&p.id!=='chords')
   .forEach(p=>p.events.forEach(e=>{if(!allowed.has(((e.midi%12)+12)%12))bad++;}));
  return bad;
 });
 ok(off===0,'geen gegenereerde noot buiten de herkende toonladder');

 // 5. the pack is exportable and undoable
 ok(await page.locator('#exports button').count()>=8,'exportknop per partij aanwezig');
 await page.locator('#undoTake').click();
 ok(errors.length===0,'geen runtime-fouten'+(errors.length?': '+errors[0]:''));
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'past op '+width);
  await page.screenshot({path:path.join(out,'harmony-'+width+'.png'),fullPage:true});
 }
 const report={status:'PASS',checks:checks.length,results:checks,errors};
 fs.writeFileSync(path.join(out,'harmony-report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 await browser.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
