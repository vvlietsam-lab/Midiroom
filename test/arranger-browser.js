const {chromium}=require('playwright'),path=require('path'),fs=require('fs'),assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox']});
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),checks=[],errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 const ok=(v,m)=>{assert.ok(v,m);checks.push(m)};
 const out=process.env.QA_OUTPUT||path.resolve('test-results');fs.mkdirSync(out,{recursive:true});
 await p.goto('file://'+path.resolve(__dirname,'../index.html'));
 await p.locator('#genreSelect').selectOption('italo');
 await p.locator('#tab-arrange').click();await p.locator('#arrUse').click();
 const original=await p.evaluate(()=>JSON.stringify(current));
 const initial=await p.evaluate(()=>JSON.stringify(arrSections));
 await p.locator('#arrPreset').selectOption('sketch');
 ok(await p.evaluate(()=>JSON.stringify(arrSections))===initial,'choosing proposal leaves editor unchanged');
 await p.locator('#arrApplyPreset').click();
 ok(await p.evaluate(()=>arrSections.reduce((n,s)=>n+s.bars,0))===16,'sketch installs 16 bars');
 ok(await p.evaluate(()=>JSON.stringify(current))===original,'proposal leaves MIDI unchanged');
 await p.locator('[data-arr-transition="0"]').selectOption('roll');
 ok(await p.evaluate(()=>cleanProject(projectPayload()).session.state.x.sections[0].transition)==='roll','project sanitizer preserves transition');
 await p.locator('#tab-generator').click();await p.locator('#undoTake').click();
 ok(await p.evaluate(()=>arrSections[0].transition)==='breath','undo restores transition');
 await p.locator('#redoTake').click();
 ok(await p.evaluate(()=>arrSections[0].transition)==='roll','redo restores transition');
 await p.locator('#tab-arrange').click();await p.locator('[data-arr-transition="0"]').selectOption('breath');
 await p.locator('[data-section-variation="0"]').selectOption('wild');
 await p.locator('#arrBuild').click();
 ok(await p.evaluate(()=>current.arrangement&&current.meta.bars===16),'build creates 16-bar arrangement');
 ok(await p.evaluate(()=>current.parts.every(p=>p.events.every(e=>e.tick>=0&&e.dur>0&&e.tick+e.dur<=16*1920))),'arranged MIDI stays in bounds');
 ok(await p.evaluate(()=>current.parts.every(p=>p.events.every(e=>e.tick<4*1920-480||e.tick>=4*1920))),'breath remains empty after adventurous groove');
 ok(await p.evaluate(()=>!current.vocalTiming&&!current.vocalSourceSerial&&!vocalLinked),'arrangement makes no vocal source claim');
 await p.locator('#tab-arrange').click();
 for(const [kind,total] of [['club',48],['extended',88]]){
  await p.locator('#arrPreset').selectOption(kind);await p.locator('#arrApplyPreset').click();
  ok(await p.evaluate(()=>arrSections.reduce((n,s)=>n+s.bars,0))===total,kind+' proposal length');
 }
 for(const width of [1440,768,390]){
  await p.setViewportSize({width,height:1000});await p.evaluate(()=>document.body.classList.add('inspector-closed'));
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'arrangement fits '+width);
  await p.screenshot({path:path.join(out,'arranger-'+width+'.png'),fullPage:true});
 }
 ok(await p.evaluate(()=>{const s=[{name:'Roll',bars:2,gain:1,parts:baseLoop.parts.map(p=>p.id),variation:'wild',transition:'roll'}];const c=arrangeClip(baseLoop,s);const p=c.parts.find(p=>p.id==='drums');return p&&JSON.stringify(p.events.filter(e=>e.tick>=3360).map(e=>e.tick))===JSON.stringify([3360,3480,3600,3720]);}),'four-step roll survives groove variation');
 ok(errors.length===0,'no browser runtime errors');
 const report={status:'PASS',checks:checks.length,results:checks,errors};fs.writeFileSync(path.join(out,'arranger-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
