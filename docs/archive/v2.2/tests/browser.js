// Optional real-browser QA. Install playwright, then: node test/browser.js
// CHROMIUM_EXECUTABLE allows an already installed Chromium binary.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 const results=[];const check=(value,name)=>{assert.ok(value,name);results.push(name);};
 const file='file://'+path.resolve(__dirname,'../index.html'),out=process.env.QA_OUTPUT||path.resolve(__dirname,'../test-results');fs.mkdirSync(out,{recursive:true});
 await page.goto(file);await page.evaluate(()=>localStorage.clear());
 check((await page.title()).includes('MIDIROOM'),'brand');
 check(await page.locator('.part.open').count()===0,'instrument settings collapsed by default');
 const before=await page.locator('[data-part="screech"]').isChecked();
 await page.locator('[data-edit="screech"]').click();
 check(await page.locator('[data-part="screech"]').isChecked()===before,'opening settings does not toggle track');
 await page.locator('[data-style="screech"]').selectOption('tripletburst');
 await page.locator('[data-edit="screech"]').click();
 await page.locator('[data-genre="dubstep"]').click();
 check(await page.locator('#bpm').inputValue()==='140','Dubstep tempo');
 await page.locator('[data-genre="dnb"]').click();
 check(await page.locator('#bpm').inputValue()==='174','DnB tempo');
 const signature=await page.evaluate(()=>JSON.stringify(current.parts.map(p=>p.events)));
 await page.locator('#saveIdeaQuick').click();
 check(await page.locator('.idea-card').count()===1,'save take');
 const jsonDownload=page.waitForEvent('download');await page.locator('#exportIdeas').click();const bank=await jsonDownload;const bankPath=path.join(out,'ideas.json');await bank.saveAs(bankPath);
 const exported=JSON.parse(fs.readFileSync(bankPath));check(exported.ideas.length===1,'Idea Bank JSON export');
 await page.reload();await page.locator('#tab-ideas').click();
 check(await page.locator('.idea-card').count()===1,'Idea Bank persists across reload');
 await page.locator('[data-load-idea="0"]').click();
 check(await page.evaluate(()=>JSON.stringify(current.parts.map(p=>p.events)))===signature,'restore exact take');
 await page.locator('#play').click();
 check(await page.evaluate(()=>playing&&AC.state==='running'),'real Web Audio starts');
 await page.locator('#vol').fill('0');await page.locator('#vol').dispatchEvent('input');
 check(await page.evaluate(()=>master.gain.value)===0,'volume 0 is silent');await page.locator('#stop').click();
 // Solo on an unselected track must not silence the enabled instruments.
 await page.locator('[data-solo="lead"]').click();check(await page.evaluate(()=>audible('bass')),'inactive solo does not silence enabled tracks');await page.locator('[data-solo="lead"]').click();
 await page.locator('#tab-tools').click();await page.locator('#sampleRoot').selectOption('8');
 check((await page.locator('#transposeResult').innerText()).includes('+0 semitonen'),'sample transpose');
 await page.locator('#sourceBpm').fill('130');check((await page.locator('#stretchResult').innerText()).includes('74.71%'),'stretch ratio');
 await page.screenshot({path:path.join(out,'studio-desktop.png'),fullPage:true});
 await page.locator('#tab-check').click();check((await page.locator('#checkList').innerText()).includes('Noten en timing zijn geldig'),'MIDI check on generated track');
 await page.screenshot({path:path.join(out,'check-desktop.png'),fullPage:true});
 await page.locator('#tab-generator').click();
 const downloads=[];page.on('download',d=>downloads.push(d));await page.locator('#exports button').first().click();
 await page.waitForFunction(()=>true);await page.waitForTimeout(300);
 check(downloads.length===2,'MIDI plus notes downloaded');for(const d of downloads)await d.saveAs(path.join(out,d.suggestedFilename()));
 check(fs.readFileSync(path.join(out,downloads[0].suggestedFilename())).toString('ascii',0,4)==='MThd','actual MIDI download header');
 // Hostile seed must stay text through DOM, history, and Idea Bank.
 await page.locator('.advanced summary').click();await page.locator('#seed').fill('<img src=x onerror="window.__injected=1">');await page.locator('#seed').dispatchEvent('change');
 check(await page.locator('#meta img').count()===0,'seed escaped in UI');check(await page.evaluate(()=>!window.__injected),'no seed script execution');
 await page.locator('#seed').fill('MIDIROOM-DEMO');await page.locator('#seed').dispatchEvent('change');await page.locator('.advanced summary').click();
 await page.locator('[data-genre="free"]').click();await page.reload();
 check(await page.evaluate(()=>activeGenre)==='free','free mode survives reload');
 // Import validation and merge into same bank.
 await page.locator('#tab-ideas').click();await page.locator('#ideaFile').setInputFiles(bankPath);await page.waitForFunction(()=>document.getElementById('bankNotice').textContent.includes('geïmporteerd'));
 check(await page.locator('.idea-card').count()===1,'import deduplicates IDs');
 const invalid=path.join(out,'invalid.json');fs.writeFileSync(invalid,'{"app":"other","ideas":[]}');await page.locator('#ideaFile').setInputFiles(invalid);await page.waitForFunction(()=>document.getElementById('bankNotice').textContent.includes('Import mislukt'));
 check(await page.locator('.idea-card').count()===1,'invalid import leaves bank intact');
 await page.locator('[data-load-idea="0"]').click();await page.locator('[data-genre="dubstep"]').click();
 // Short, bounded browser generation sweep at production-quality settings.
 const perf=await page.evaluate(()=>{const times=[];for(let i=0;i<30;i++){const t=performance.now();$('seed').value='BROWSER'+i;generate();times.push(performance.now()-t);}return {runs:times.length,maxMs:Math.round(Math.max(...times)),meanMs:Math.round(times.reduce((a,b)=>a+b)/times.length)};});
 check(await page.evaluate(()=>current.parts.every(p=>p.events.length>0)),'30 browser generations remain usable');
 for(const width of [1440,1024,768,390]){
  await page.setViewportSize({width,height:950});await page.waitForTimeout(160);
  for(const view of ['generator','tools','ideas','check']){await page.locator('#tab-'+view).click();check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),view+' no overflow at '+width);}
 }
 await page.locator('#tab-generator').click();await page.screenshot({path:path.join(out,'generator-mobile.png'),fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(160);await page.screenshot({path:path.join(out,'generator-desktop.png'),fullPage:true});
 await page.evaluate(()=>{document.querySelectorAll('[data-part]').forEach(cb=>cb.checked=false);generate();});
 check(await page.locator('#play').isDisabled(),'empty selection disables playback');
 check(await page.locator('#exports button').count()===0,'empty selection clears exports');
 check(errors.length===0,'no browser JS errors');check(requests.length===0,'app makes no external requests');
 fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify({status:'PASS',checks:results.length,results,performance:perf,errors,externalRequests:requests},null,2));
 console.log(JSON.stringify({status:'PASS',checks:results.length,performance:perf,errors,externalRequests:requests},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
