/* Stem Splitter in a real browser: decode, separate in a worker, listen, download. */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const S=require('../src/stem-engine.js');

/* a short mix whose parts we know: low sine + centre tone + transients + hard-left tone */
function fixture(){
 const SR=44100,N=SR*3,l=new Float32Array(N),r=new Float32Array(N);
 for(let i=0;i<N;i++){
  const bass=Math.sin(2*Math.PI*60*i/SR)*0.35;
  const tone=Math.sin(2*Math.PI*880*i/SR)*0.25;
  const left=Math.sin(2*Math.PI*1500*i/SR)*0.18;
  l[i]=bass+tone+left; r[i]=bass+tone;
 }
 let seed=7;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296*2-1;};
 for(let beat=0;beat<12;beat++){const at=Math.floor(beat*SR/4);
  for(let i=0;i<300&&at+i<N;i++){const v=Math.exp(-i/40)*rnd()*0.6;l[at+i]+=v;r[at+i]+=v;}}
 return Buffer.from(S.encodeWav(l,r,SR));
}

(async()=>{
 const dir=process.env.QA_OUTPUT||path.resolve('test-results/stems');fs.mkdirSync(dir,{recursive:true});
 const wav=path.join(dir,'mix.wav');fs.writeFileSync(wav,fixture());
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 const ok=(v,m)=>{assert.ok(v,m);checks.push(m);};
 await page.goto('file://'+path.resolve(__dirname,'../index.html'));
 await page.evaluate(()=>applyGenre('rawphoric',false));

 // reachable as a tool, not buried
 await page.locator('#studioTool-stems').click();
 ok(await page.locator('#stemSplitter').isVisible(),'Stem Splitter is een eigen tool in de tray');
 ok(await page.locator('#stemControls').isHidden(),'geen knoppen voordat er audio is');

 // load
 await page.locator('#stemFile').setInputFiles(wav);
 await page.waitForFunction(()=>!document.getElementById('stemControls').hidden,null,{timeout:15000});
 const meta=await page.locator('#stemFileMeta').innerText();
 ok(/mix\.wav/.test(meta),'bestandsnaam getoond');
 ok(/0:03/.test(meta),'lengte getoond: '+meta);
 ok(/stereo/.test(meta),'kanalen getoond');
 ok(/44\.1 kHz/.test(meta),'samplerate getoond');

 // separate
 await page.locator('#stemRun').click();
 await page.waitForFunction(()=>!document.getElementById('stemList').hidden,null,{timeout:120000});
 const rows=await page.locator('.stem-row').count();
 ok(rows===4,'vier stems ('+rows+')');
 const levels=await page.evaluate(()=>['drums','bass','vocals','other']
   .map(k=>({k,db:document.getElementById('stemDb-'+k).textContent})));
 ok(levels.every(x=>/-?\d/.test(x.db)),'elke stem heeft een niveau: '+levels.map(x=>x.k+' '+x.db).join(', '));
 ok(await page.locator('#stemProgress').isHidden(),'voortgangsbalk verdwijnt na afloop');
 ok(await page.evaluate(()=>!document.getElementById('stemRun').disabled),'knop weer bruikbaar');

 // the separation must actually differ per stem, not four copies of the input
 const distinct=await page.evaluate(()=>{
  const keys=['drums','bass','vocals','other'];
  const sig=k=>{let s=0;const a=__midiroomStems[k].l;for(let i=0;i<a.length;i+=97)s+=Math.abs(a[i]);return Math.round(s*1000);};
  const vals=keys.map(sig);
  return new Set(vals).size;
 });
 ok(distinct===4,'de vier stems zijn onderling verschillend');

 // low content really is in the bass stem
 const bassIsLow=await page.evaluate(()=>{
  const lo=k=>{const a=__midiroomStems[k].l;let prev=0,low=0,all=0;
   for(let i=0;i<a.length;i++){prev=prev*0.97+a[i]*0.03;low+=prev*prev;all+=a[i]*a[i];}
   return all>0?low/all:0;};
  return lo('bass')>lo('drums');
 });
 ok(bassIsLow,'de basstem is laagfrequenter dan de drumstem');

 // listening
 await page.locator('[data-play="drums"]').click();
 ok(await page.evaluate(()=>document.querySelector('[data-play="drums"]').classList.contains('on')),'luisteren start');
 await page.locator('[data-play="drums"]').click();
 ok(await page.evaluate(()=>!document.querySelector('[data-play="drums"]').classList.contains('on')),'nog eens klikken stopt');
 await page.locator('[data-play="bass"]').click();
 await page.locator('#stemStop').click();
 ok(await page.evaluate(()=>document.querySelectorAll('[data-play].on').length===0),'stopknop zet alles uit');

 // download
 const dl=await Promise.all([page.waitForEvent('download',{timeout:20000}),page.locator('[data-save="drums"]').click()]);
 const saved=path.join(dir,'drums.wav');await dl[0].saveAs(saved);
 const head=fs.readFileSync(saved);
 ok(head.toString('ascii',0,4)==='RIFF','gedownloade stem is een geldige WAV');
 ok(head.length>44+10000,'de WAV bevat audio ('+head.length+' bytes)');
 ok(dl[0].suggestedFilename()==='stem-drums.wav','bestandsnaam benoemt de stem');

 // a file that is not audio must fail readably
 const junk=path.join(dir,'broken.wav');fs.writeFileSync(junk,Buffer.from([1,2,3,4,5]));
 await page.locator('#stemFile').setInputFiles(junk);
 await page.waitForFunction(()=>/Kon dit bestand niet lezen/.test(document.getElementById('stemStatus').textContent),null,{timeout:15000});
 ok(true,'onleesbaar bestand geeft een nette melding');
 ok(await page.locator('#stemControls').isHidden(),'mislukte laadbeurt verbergt de knoppen weer');

 ok(errors.length===0,'geen runtime-fouten'+(errors.length?': '+errors[0]:''));
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'past op '+width);
  await page.screenshot({path:path.join(dir,'stems-'+width+'.png'),fullPage:true});
 }
 const report={status:'PASS',checks:checks.length,results:checks,errors};
 fs.writeFileSync(path.join(dir,'stems-report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 await browser.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
