/* Groove DNA: derive feel from imported MIDI and apply it without changing harmony. */
(function(root){
'use strict';
const cp=o=>JSON.parse(JSON.stringify(o));
function groups(events,tolerance=5){const sorted=cp(events||[]).sort((a,b)=>a.tick-b.tick||a.midi-b.midi),out=[];for(const e of sorted){let g=out.at(-1);if(!g||Math.abs(e.tick-g.tick)>tolerance){g={tick:e.tick,events:[]};out.push(g);}g.events.push(e);}return out;}
function grooveProfile(events,cycleBars=1){const cycle=Math.max(1,Math.min(4,Number(cycleBars)||1))*1920,all=events||[];if(!all.length)throw new Error('De gekozen MIDI-track bevat geen groove.');const firstWindow=Math.floor(Math.min(...all.map(e=>e.tick))/cycle)*cycle,window=all.filter(e=>e.tick>=firstWindow&&e.tick<firstWindow+cycle).map(e=>({...e,tick:e.tick-firstWindow})),gs=groups(window,12);if(!gs.length)throw new Error('De gekozen cyclus bevat geen groove.');const slots=[];gs.forEach(g=>slots.push({tick:g.tick,dur:Math.max(1,Math.round(g.events.reduce((n,e)=>n+e.dur,0)/g.events.length)),vel:Math.round(g.events.reduce((n,e)=>n+e.vel,0)/g.events.length)}));slots.sort((a,b)=>a.tick-b.tick);return {cycleTicks:cycle,cycleBars:cycle/1920,slots};}
function applyGrooveDNA(clip,targetId,profile,locks={}){if(!clip?.parts||!profile?.slots?.length)throw new Error('Geen groove beschikbaar.');if(locks[targetId])throw new Error('De doeltrack staat vast.');const next=cp(clip),part=next.parts.find(p=>p.id===targetId);if(!part)throw new Error('Doeltrack ontbreekt.');const harmonic=groups(part.events,40),end=next.meta.bars*1920;if(!harmonic.length)return next;const sourcePatterns=harmonic.map(g=>g.events.map(e=>({midi:e.midi,offset:e.tick-g.tick,ratio:e.dur/Math.max(1,g.events[0].dur)}))),otherCount=next.parts.reduce((n,p)=>n+(p.id===targetId?0:(p.events||[]).length),0),estimated=otherCount+Math.ceil(end/profile.cycleTicks)*profile.slots.length*Math.max(...sourcePatterns.map(p=>p.length));if(estimated>50000)throw new Error('Deze combinatie zou de sessie boven 50.000 noten brengen. Kies een langere cyclus of rustigere brontrack.');const events=[];let slotIndex=0;
 for(let base=0;base<end;base+=profile.cycleTicks){for(const slot of profile.slots){const tick=base+slot.tick;if(tick>=end)continue;const pat=sourcePatterns[slotIndex++%sourcePatterns.length];pat.forEach(n=>{const placed=Math.max(0,tick+n.offset);if(placed<end)events.push({tick:placed,dur:Math.max(1,Math.min(end-placed,Math.round(slot.dur*n.ratio))),midi:n.midi,vel:Math.max(1,Math.min(127,slot.vel))});});}}
 part.events=events.filter(e=>e.tick<end).sort((a,b)=>a.tick-b.tick||a.midi-b.midi).filter((e,i,a)=>!i||e.tick!==a[i-1].tick||e.midi!==a[i-1].midi);const lastByPitch=new Map();part.events.forEach(e=>{const prev=lastByPitch.get(e.midi);if(prev&&prev.tick+prev.dur>e.tick)prev.dur=Math.max(1,e.tick-prev.tick);lastByPitch.set(e.midi,e);});if(!['chords','pad','harmony','drums'].includes(part.id)){for(let i=0;i<part.events.length-1;i++){const e=part.events[i],n=part.events[i+1];if(n.tick>e.tick)e.dur=Math.min(e.dur,n.tick-e.tick);}}if(next.parts.reduce((n,p)=>n+p.events.length,0)>50000)throw new Error('De sessie bevat meer dan 50.000 noten.');next.customEdit=true;next.vocalTiming=false;delete next.vocalSourceSerial;next.grooveDNA={targetId,cycleBars:profile.cycleBars};return next;
}
function importedTrackEvents(track,endTick){return cp(track?.events||[]).filter(e=>e.tick>=0&&e.tick<endTick).map(e=>({...e,dur:Math.max(1,Math.min(e.dur,endTick-e.tick))}));}
const api={grooveProfile,applyGrooveDNA,importedTrackEvents,groupMidiEvents:groups};if(typeof module!=='undefined')module.exports=api;Object.assign(root,api);
})(typeof globalThis!=='undefined'?globalThis:this);

/* Browser interface. Kept in this file so Groove DNA can be moved as one tool panel. */
if(typeof document!=='undefined'){
let importedMidi=null,groovePreview=null,grooveImportToken=0,harmonyResult=null;
const panel=document.createElement('section');panel.id='grooveDNA';panel.className='future-tool groove-dna';panel.innerHTML='<div class="tool-title"><span class="eyebrow">GROOVE DNA</span><h2>Laat jouw MIDI de feel bepalen</h2><p>Importeer een MIDI uit Ableton. Neem de timing, accenten en rust over terwijl de doeltrack zijn eigen noten en akkoorden houdt.</p></div><div class="groove-load"><label class="midi-drop" for="grooveFile"><strong>Sleep of kies MIDI</strong><span>Type 0/1 · maximaal 4 MB, 32 maten en 20.000 noten</span><input id="grooveFile" type="file" accept=".mid,.midi,audio/midi,audio/x-midi"></label><div id="grooveFileMeta" class="groove-file-meta">Nog geen MIDI geladen</div></div><div id="grooveControls" class="groove-controls" hidden><label>Brontrack<select id="grooveTrack"></select></label><label>Doel in MIDIROOM<select id="grooveTarget"></select></label><label>Groove-lus<select id="grooveCycle"><option value="1">1 maat</option><option value="2">2 maten</option><option value="4">4 maten</option></select></label><div class="groove-actions"><button id="grooveListen">▶ Vergelijk groove</button><button id="grooveApply" class="primary">Neem Groove DNA over</button><button id="grooveImport">Importeer als track</button><button id="grooveHarmony">Neem akkoorden over</button></div></div><div id="grooveHarmonyBox" class="groove-controls" hidden><label>Toonsoort<select id="grooveHarmonyKey"></select></label><p id="grooveHarmonyInfo" class="groove-file-meta"></p><div class="groove-actions"><button id="grooveHarmonyUse" class="primary">Bouw hierop verder</button><button id="grooveHarmonyPack">Maak pack van deze akkoorden</button></div><label class="check" style="margin-top:6px"><input type="checkbox" id="grooveKeepChords" checked> mijn eigen akkoorden behouden als Chords-track</label></div><p id="grooveStatus" role="status">Je bestand blijft lokaal. Sustain (CC64) wordt verwerkt; overige CC, program changes, aftertouch en pitch bend worden genegeerd.</p>';
(document.querySelector('.rollbox')||document.querySelector('main')).before(panel);
const ge=id=>document.getElementById(id),status=s=>ge('grooveStatus').textContent=s;
function fillGrooveTargets(){const old=ge('grooveTarget').value;ge('grooveTarget').innerHTML=(current?.parts||[]).map(p=>'<option value="'+p.id+'">'+p.label+(sessionConfig.locks[p.id]?' · vast':'')+'</option>').join('');if(current?.parts.some(p=>p.id===old))ge('grooveTarget').value=old;}
function selectedImportedTrack(){return importedMidi?.tracks[Number(ge('grooveTrack').value)];}
function buildGrooveCandidate(){if(!current)throw new Error('Genereer eerst een MIDIROOM-loop.');const id=ge('grooveTarget').value;if(sessionConfig.locks[id])throw new Error('Ontgrendel '+PART_DEFS[id].label+' om de groove te wijzigen.');const profile=grooveProfile(selectedImportedTrack()?.events,Number(ge('grooveCycle').value));return applyGrooveDNA(current,id,profile,sessionConfig.locks);}
async function loadGrooveFile(file){if(!file)return;const token=++grooveImportToken;try{if(file.size>4*1024*1024)throw new Error('MIDI is groter dan 4 MB.');const bytes=await file.arrayBuffer();if(token!==grooveImportToken)return;const parsed=readMidiFile(bytes);if(token!==grooveImportToken)return;importedMidi=parsed;groovePreview=null;ge('grooveTrack').innerHTML=parsed.tracks.map((t,i)=>'<option value="'+i+'">'+escapeHtml(t.name)+' · '+t.events.length+' noten</option>').join('');fillGrooveTargets();ge('grooveControls').hidden=false;ge('grooveFileMeta').innerHTML='<strong>'+escapeHtml(file.name)+'</strong><span>'+parsed.tracks.length+' tracks · '+parsed.notes+' noten · '+parsed.bars+' maten · '+parsed.bpm+' BPM bronbestand</span>';const sessionBpm=current?.meta?.bpm;status((parsed.warnings.join(' ')+' ').trim()+'Timing wordt als PPQ-groove gelezen en speelt '+(sessionBpm?'op '+sessionBpm+' BPM van je MIDIROOM-sessie.':'op het tempo van je MIDIROOM-sessie.')).trim();}catch(err){if(token!==grooveImportToken)return;importedMidi=null;groovePreview=null;ge('grooveControls').hidden=true;ge('grooveFileMeta').textContent='Bestand niet geladen';status(err.message);ge('grooveFile').value='';}}
ge('grooveFile').onchange=e=>loadGrooveFile(e.target.files?.[0]);const drop=panel.querySelector('.midi-drop');drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragging');};drop.ondragleave=()=>drop.classList.remove('dragging');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragging');loadGrooveFile(e.dataTransfer.files?.[0]);};
ge('grooveListen').onclick=()=>{try{groovePreview=buildGrooveCandidate();listenDiscovery(groovePreview,'Groove DNA');status('Preview speelt met de huidige klanken. Stop of Spatie zet je sessie terug.');}catch(err){status(err.message);}};
ge('grooveHarmony').onclick=()=>{try{
 if(!importedMidi)throw new Error('Laad eerst een MIDI-bestand.');
 const tr=importedMidi.tracks[Number(ge('grooveTrack').value)];
 const src=(tr&&(tr.events||tr.notes))||[];
 if(!src.length)throw new Error('De gekozen track bevat geen noten.');
 const r=importedMidi;
 const h=detectHarmony(src,{});
 if(!h.ok)throw new Error(h.reason);
 h.sourceEvents=src.map(e=>({tick:e.tick,dur:e.dur,midi:e.midi,vel:e.vel}));
 if(r&&r.bpm)h.bpm=r.bpm;
 harmonyResult=h;
 if(typeof window!=='undefined')window.__midiroomHarmony=h;
 ge('grooveHarmonyKey').innerHTML=h.candidates.map((c,i)=>'<option value="'+i+'">'+c.rootName+' '+c.scaleName+' ('+c.fit+'% passend)</option>').join('');
 ge('grooveHarmonyInfo').textContent=h.label+'  \u00b7  '+h.bars+' maten  \u00b7  akkoord duurt '+h.chordBars+' maat/maten  \u00b7  '+h.chordSize+' noten per akkoord';
 ge('grooveHarmonyBox').hidden=false;
 status('Akkoorden herkend. Bevestig de toonsoort: relatieve majeur en mineur bevatten dezelfde noten, dus alleen jij weet welke klopt.');
}catch(err){status(err.message);}};
function setControl(id,v){const el=document.getElementById(id);if(el&&v!=null){el.value=String(v);el.dispatchEvent(new Event('change',{bubbles:true}));}}
function applyHarmonyToSession(h,c,barOverride){
 window.__midiroomCustomDegrees=h.degrees.slice();
 setControl('root',c.root);setControl('scale',c.scale);
 setControl('chordBars',h.chordBars);setControl('chordSize',h.chordSize);
 if(h.bpm)setControl('bpm',Math.round(h.bpm));
 // match the imported length, otherwise a 16-bar progression gets cut to the 8-bar default
 const barsEl=document.getElementById('bars');
 if(barsEl&&barOverride){
  const want=String(Math.min(32,Math.max(1,barOverride)));
  const has=Array.from(barsEl.options||[]).some(o=>o.value===want);
  if(!has&&barsEl.options){const o=document.createElement('option');o.value=want;o.textContent=want;barsEl.appendChild(o);}
  setControl('bars',want);
 }
}
// Keep the user's own chord notes instead of a regenerated approximation of them.
function restoreOwnChords(h){
 if(!current||!h.sourceEvents||!h.sourceEvents.length)return false;
 const part=current.parts.find(p=>p.id==='chords');
 if(!part)return false;
 const end=current.meta.bars*1920;
 part.events=h.sourceEvents.filter(e=>e.tick<end)
   .map(e=>({tick:e.tick,dur:Math.max(1,Math.min(e.dur,end-e.tick)),midi:e.midi,vel:e.vel}));
 current.customEdit=true;
 return part.events.length>0;
}
ge('grooveHarmonyUse').onclick=()=>{try{
 const h=harmonyResult;if(!h)throw new Error('Herken eerst de akkoorden.');
 const c=h.candidates[Number(ge('grooveHarmonyKey').value)]||h.candidates[0];
 applyHarmonyToSession(h,c,h.bars);
 if(typeof generate==='function')generate();
 let msg='Overgenomen: '+c.rootName+' '+c.scaleName+' \u00b7 '+h.label+' \u00b7 '+h.bars+' maten.';
 if(ge('grooveKeepChords').checked&&restoreOwnChords(h)){
  if(typeof finishSession==='function')finishSession(current,'Jouw akkoorden staan in de Chords-track.');
  msg+=' Je eigen akkoorden staan onaangeroerd in de Chords-track.';
 }
 status(msg);
}catch(err){status(err.message);}};
ge('grooveHarmonyPack').onclick=()=>{try{
 const h=harmonyResult;if(!h)throw new Error('Herken eerst de akkoorden.');
 const c=h.candidates[Number(ge('grooveHarmonyKey').value)]||h.candidates[0];
 // switch every complementary instrument on; the chords themselves stay the user's
 const want=['drums','kick','bass','chords','pad','lead','harmony','pluck','arp'];
 document.querySelectorAll('[data-part]').forEach(cb=>{
  const on=want.includes(cb.dataset.part);
  if(cb.checked!==on){cb.checked=on;cb.dispatchEvent(new Event('change',{bubbles:true}));}
 });
 applyHarmonyToSession(h,c,h.bars);
 if(typeof generate==='function')generate();
 const kept=ge('grooveKeepChords').checked&&restoreOwnChords(h);
 if(kept&&typeof finishSession==='function')finishSession(current,'Pack gebouwd op jouw akkoorden.');
 const made=current&&current.parts?current.parts.length:0;
 status('Pack gebouwd: '+made+' partijen in '+c.rootName+' '+c.scaleName+' \u00b7 '+h.label+' \u00b7 '+h.bars+' maten.'
  +(kept?' Je eigen akkoorden zijn behouden.':'')+' Exporteer hieronder per partij of als \u00e9\u00e9n bestand.');
}catch(err){status(err.message);}};ge('grooveApply').onclick=()=>{try{const next=buildGrooveCandidate();vocalLinked=false;finishSession(next,'Groove DNA toegepast op '+PART_DEFS[ge('grooveTarget').value].label+'. Undo herstelt het origineel.');status('Groove toegepast. Toonhoogtes en akkoordvormen van de doeltrack zijn behouden.');}catch(err){status(err.message);}};
ge('grooveImport').onclick=()=>{try{if(!current)throw new Error('Genereer eerst een MIDIROOM-loop.');const id=ge('grooveTarget').value;if(sessionConfig.locks[id])throw new Error('Ontgrendel '+PART_DEFS[id].label+' om MIDI te importeren.');const track=selectedImportedTrack();if(!track)throw new Error('Kies een brontrack.');const next=clone(current),part=next.parts.find(p=>p.id===id);if(!part)throw new Error('De doeltrack ontbreekt.');const end=next.meta.bars*1920,imported=importedTrackEvents(track,end),other=next.parts.reduce((n,p)=>n+(p.id===id?0:p.events.length),0);if(other+imported.length>50000)throw new Error('De sessie zou meer dan 50.000 noten bevatten. Kies een rustigere MIDI-track.');part.events=imported;next.customEdit=true;next.vocalTiming=false;delete next.vocalSourceSerial;vocalLinked=false;finishSession(next,'MIDI geïmporteerd in '+PART_DEFS[id].label+'. Undo herstelt het origineel.');const clipped=track.events.some(e=>e.tick+e.dur>end);status('Track geïmporteerd zonder timestretch.'+(clipped?' Noten buiten '+next.meta.bars+' maten zijn afgekapt.':''));}catch(err){status(err.message);}};
const oldRenderGroove=renderSession;renderSession=function(){oldRenderGroove();if(ge('grooveTarget'))fillGrooveTargets();};
}
