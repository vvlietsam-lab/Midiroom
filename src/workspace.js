/* MIDIROOM workspace. No network, dependencies, credentials or build-time services. */
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

// Treat URL and imported JSON as untrusted input. Restore only known controls.
function normalizeState(raw){
  const s=raw&&typeof raw==='object'?raw:{};
  const choose=(value,allowed,fallback)=>allowed.includes(String(value))?String(value):String(fallback);
  const num=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Math.round(Number(value)))):fallback;
  const st={r:String(num(s.r,0,11,8)),sc:choose(s.sc,Object.keys(SCALES),'phrygian'),pg:choose(s.pg,PROGRESSIONS.map(p=>p.id),'pedal'),bp:String(num(s.bp,40,300,160)),ba:choose(s.ba,['1','2','4','8','16','32'],'8'),cs:String(num(s.cs,2,5,3)),cb:choose(s.cb,['1','2','4'],'1'),sd:String(s.sd??'MIDIROOM').slice(0,120),sw:String(num(s.sw,0,60,0)),gn:choose(s.gn,GENRES.map(g=>g.id),'free'),sr:choose(s.sr,['',...STRUCTURES.map(x=>x.id)],''),en:String(num(s.en,0,2,1)),hu:s.hu?1:0,th:s.th?1:0,p:{}};
  PART_ORDER.forEach(id=>{
    const p=s.p&&s.p[id]&&typeof s.p[id]==='object'?s.p[id]:{};
    const op={};
    (EXTRAS[id]||[]).forEach(e=>{const v=p.op&&p.op[e.key];op[e.key]=e.options?(e.options.includes(v)?v:e.def):(v==null?+e.def:+!!v);});
    st.p[id]={on:+!!p.on,st:choose(p.st,['',...STYLES[PART_DEFS[id].styles].map(x=>x.id)],''),oc:num(p.oc,-3,3,0),vy:num(p.vy,0,100000,0),ar:choose(p.ar,ARTICULATIONS.map(x=>x.id),'auto'),op};
  });
  st.x=cleanStudioState(s.x);
  return st;
}
function selectView(view){
  ['generator','tools','ideas','check','sound','arrange','vocal'].forEach(id=>{$('view-'+id).hidden=id!==view;const tab=$('tab-'+id);tab.setAttribute('aria-selected',id===view);tab.tabIndex=id===view?0:-1;});
  if(view==='generator'){rollCache=null;drawRoll();}
  if(view==='tools'){renderStudio();renderTools();}
  if(view==='ideas')renderIdeas();
  if(view==='check')renderCheck();
  if(view==='sound')renderSound();
  if(view==='arrange')renderArrangement();
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>selectView(b.dataset.view)));
document.querySelector('.topnav').addEventListener('keydown',e=>{
  const tabs=[...document.querySelectorAll('[data-view]')],i=tabs.indexOf(document.activeElement);
  if(i<0||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  tabs[n].focus();selectView(tabs[n].dataset.view);
});
// Grouping does not change core generation order.
[['Ritme & low end',['drums','kick','bass']],['Melodie & karakter',['lead','screech','darkmelody','melody','pluck','arp']],['Harmonie & ruimte',['chords','pad','harmony']]].forEach(([title,ids])=>{
  const label=document.createElement('div');label.className='part-group';label.textContent=title;$('parts').appendChild(label);
  ids.forEach(id=>$('parts').appendChild(document.querySelector('.part[data-id="'+id+'"]')));
});
// Label every dynamically built control for keyboard and screen reader users.
document.querySelectorAll('.part').forEach(row=>{
  const name=PART_DEFS[row.dataset.id].label;
  row.querySelectorAll('select').forEach((sel,i)=>{sel.id='control-'+row.dataset.id+'-'+i;const label=sel.parentElement.querySelector('label');if(label)label.htmlFor=sel.id;});
  row.querySelectorAll('[data-oct]').forEach(b=>b.setAttribute('aria-label',name+(b.dataset.d==='1'?' octaaf omhoog':' octaaf omlaag')));
});
$('rollFilter').addEventListener('change',()=>{rollCache=null;drawRoll();});

function renderTools(){
  const bpm=Number($('bpm').value)||160,root=Number($('root').value),source=Number($('sourceBpm').value),bars=Number($('toolBars').value);
  $('toolContext').innerHTML='<span class="pill">'+bpm+' BPM</span><span class="pill">'+escapeHtml(NOTE_NAMES[root]+' '+SCALES[$('scale').value].name)+'</span><span class="pill">4/4</span>';
  const from=Number($('sampleRoot').value);const semitones=((root-from+18)%12)-6+Number($('sampleOctave').value);
  $('transposeResult').textContent=NOTE_NAMES[from]+' → '+NOTE_NAMES[root]+' : '+(semitones>=0?'+':'')+semitones+' semitonen ('+(semitones>=0?'+':'')+(semitones*100)+' cents)';
  if(!Number.isFinite(source)||source<20||source>400||!Number.isInteger(bars)||bars<1||bars>512){$('stretchResult').textContent='Vul 20–400 BPM en 1–512 hele maten in.';return;}
  $('stretchResult').innerHTML=(bars*240/bpm).toFixed(3)+' s op '+bpm+' BPM<br>Nieuwe duur: '+(source/bpm*100).toFixed(2)+'% van origineel<br>Afspeelsnelheid: '+(bpm/source).toFixed(3)+'×<br>Re-pitch zonder warp: '+(12*Math.log2(bpm/source)).toFixed(2)+' semitonen';
}
NOTE_NAMES.forEach((name,i)=>{const op=document.createElement('option');op.value=i;op.textContent=name;$('sampleRoot').appendChild(op);});
['sampleRoot','sampleOctave','sourceBpm','toolBars'].forEach(id=>$(id).addEventListener('input',renderTools));
$('exportBrief').onclick=()=>{if(current)downloadText(notesFor(fileStem()+'.mid'),fileStem()+'_production_brief.md');};

const BANK_KEY='midiroom.ideas.v2';
let ideas=[],bankStorageError=false;
function cleanIdea(item){
  if(!item||typeof item!=='object'||!item.state||typeof item.state!=='object'||!item.state.p)throw new Error('Ongeldig idee: instellingen ontbreken.');
  return {id:String(item.id||Date.now()+'-'+Math.random()).slice(0,100),name:String(item.name||'Naamloze take').slice(0,80),date:String(item.date||new Date().toISOString()).slice(0,50),state:normalizeState(item.state),clip:cleanClip(item.clip),source:cleanClip(item.source)};
}
try {const data=JSON.parse(localStorage.getItem(BANK_KEY)||'[]');if(Array.isArray(data))ideas=data.slice(0,100).map(cleanIdea);}catch(e){bankStorageError=true;}
function persistIdeas(){
  try{localStorage.setItem(BANK_KEY,JSON.stringify(ideas));bankStorageError=false;return true;}catch(e){bankStorageError=true;return false;}
}
function bankNotice(msg){$('bankNotice').textContent=msg;}
function saveIdea(){
  if(!current){bankNotice('Genereer eerst een take met minstens één instrument.');return;}
  if(ideas.length>=100){bankNotice('Je bank bevat 100 ideeën. Exporteer de bank en verwijder enkele takes.');return;}
  const name=$('ideaName').value.trim()||((GENRES.find(g=>g.id===activeGenre)||GENRES[0]).label+' / '+$('seed').value);
  const idea=cleanIdea({id:Date.now()+'-'+newSeed(),name,date:new Date().toISOString(),state:collectState(),clip:current,source:baseLoop});
  if(new Blob([JSON.stringify({app:'MIDIROOM',version:3,ideas:[idea,...ideas]})]).size>12000000){bankNotice('Je bank is vol (12 MB). Exporteer en verwijder enkele takes.');return;}
  ideas.unshift(idea);
  const saved=persistIdeas();$('ideaName').value='';renderIdeas();bankNotice(saved?'Take bewaard.':'Alleen tijdelijk bewaard: browseropslag niet beschikbaar. Exporteer je bank.');
}
function renderIdeas(){
  if(bankStorageError)bankNotice('Browseropslag niet beschikbaar of onleesbaar. Exporteer je bank om je takes te bewaren.');
  if(!ideas.length){$('ideaList').innerHTML='<div class="empty">Je volgende goede idee hoort hier.<br><span class="hint">Bewaar een take vanuit de generator.</span></div>';return;}
  $('ideaList').innerHTML=ideas.map((idea,i)=>{
    const st=idea.state,n=Object.values(st.p).filter(p=>p.on).length;
    return '<article class="idea-card"><div class="eyebrow">TAKE '+String(ideas.length-i).padStart(2,'0')+'</div><h3>'+escapeHtml(idea.name)+'</h3><p>'+escapeHtml(NOTE_NAMES[+st.r]+' '+SCALES[st.sc].name)+' · '+st.bp+' BPM · '+n+' instrumenten<br>Seed '+escapeHtml(st.sd)+'</p><div class="action-row"><button data-load-idea="'+i+'">Open take</button><button data-delete-idea="'+i+'">Verwijder</button></div></article>';
  }).join('');
}
$('saveIdea').onclick=saveIdea;
$('saveIdeaQuick').onclick=()=>{selectView('ideas');saveIdea();};
$('ideaList').addEventListener('click',e=>{
  const load=e.target.closest('[data-load-idea]');
  if(load){const idea=ideas[+load.dataset.loadIdea];if(!idea)return;PART_ORDER.forEach(id=>{muted[id]=false;soloed[id]=false;});location.hash=encodeURIComponent(JSON.stringify(idea.state));restoreFromHash();if(idea.clip){stopAudio();current=clone(idea.clip);baseLoop=clone(idea.source||idea.clip);vocalLinked=false;redrawCurrent();rememberTake();}else generate();paintMS();selectView('generator');return;}
  const del=e.target.closest('[data-delete-idea]');if(del){const i=+del.dataset.deleteIdea;ideas.splice(i,1);const saved=persistIdeas();renderIdeas();bankNotice(saved?'Take verwijderd.':'Verwijderd uit deze sessie; browseropslag kon niet worden bijgewerkt.');}
});
function downloadJson(value,name){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},400);}
$('exportIdeas').onclick=()=>downloadJson({app:'MIDIROOM',version:3,ideas},'MIDIROOM_ideas.json');
$('importIdeas').onclick=()=>$('ideaFile').click();
$('ideaFile').addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    if(f.size>12000000)throw new Error('Bestand is te groot (max. 12 MB).');
    const data=JSON.parse(await f.text());if(data.app!=='MIDIROOM'||![2,3].includes(data.version)||!Array.isArray(data.ideas))throw new Error('Kies een MIDIROOM Idea Bank-bestand (versie 2 of 3).');
    if(data.ideas.length>100)throw new Error('Maximaal 100 ideeën per bank.');
    const incoming=data.ideas.map(cleanIdea),known=new Set(ideas.map(x=>x.id)),add=[];
    incoming.forEach(x=>{if(!known.has(x.id)){known.add(x.id);add.push(x);}});
    if(ideas.length+add.length>100)throw new Error('Samen meer dan 100 ideeën. Exporteer en maak eerst ruimte.');
    if(new Blob([JSON.stringify({app:'MIDIROOM',version:3,ideas:[...add,...ideas]})]).size>12000000)throw new Error('Samen groter dan 12 MB. Maak eerst ruimte.');
    ideas=[...add,...ideas];const saved=persistIdeas();renderIdeas();bankNotice(add.length+' ideeën geïmporteerd.'+(saved?'':' Exporteer ze: browseropslag niet beschikbaar.'));
  }catch(err){bankNotice('Import mislukt: '+err.message);}finally{e.target.value='';}
});

function inspectMidi(){
  if(!current)return [];
  const result=[],end=current.meta.bars*4*TPQ;let invalid=0,overlaps=0,outside=0,notes=0;
  const classes=new Set(SCALES[$('scale').value].steps.map(n=>(n+Number($('root').value))%12));
  current.parts.forEach(p=>{const last=new Map();p.events.forEach(e=>{
    notes++;if(![e.tick,e.dur,e.midi,e.vel].every(Number.isInteger)||e.tick<0||e.dur<=0||e.midi<0||e.midi>127||e.vel<1||e.vel>127||e.tick+e.dur>end)invalid++;
    if(last.has(e.midi)&&last.get(e.midi)>e.tick)overlaps++;last.set(e.midi,e.tick+e.dur);
    if(p.id!=='drums'&&!classes.has(e.midi%12))outside++;
  });});
  result.push({kind:invalid||overlaps?'warn':'good',title:invalid||overlaps?'MIDI heeft technische aandachtspunten':'Noten en timing zijn geldig',body:invalid+' ongeldige noten · '+overlaps+' overlappende noten met dezelfde toonhoogte. Export houdt de ingestelde cliplengte aan.'});
  result.push({kind:outside?'warn':'good',title:outside?'Chromatische noten aanwezig':'Binnen de gekozen toonladder',body:outside?outside+' noten vallen buiten de ladder. Dit kan bewust zijn bij chromatische aanloopnoten of Dark melody; luister naar de oplossing.':'Alle melodische noten vallen binnen de gekozen ladder. Drum Rack-noten tellen niet mee.'});
  const kick=current.parts.find(p=>p.id==='kick'),drums=current.parts.find(p=>p.id==='drums'),bass=current.parts.find(p=>p.id==='bass');
  if(kick&&drums){const hits=new Set(kick.events.map(e=>e.tick));const doubles=drums.events.filter(e=>e.midi===DRUM_MAP.kick&&hits.has(e.tick)).length;if(doubles)result.push({kind:'warn',title:'Dubbele kicks',body:doubles+' gelijktijdige kicks: controleer layering, fase en het low end in je DAW.'});}
  if(bass){const low=bass.events.filter(e=>noteFreq(e.midi)<30).length;if(low)result.push({kind:'warn',title:'Zeer lage basnoten',body:low+' basnoten onder 30 Hz. Controleer of een octaaf hoger beter werkt met jouw sound.'});}
  if(current.parts.filter(p=>['lead','screech','darkmelody','melody','pluck','arp'].includes(p.id)).length>=4)result.push({kind:'warn',title:'Veel partijen in de voorgrond',body:'Vier of meer leadachtige partijen. Probeer een vraag-antwoordverdeling of mute een laag om de hoofdfrase ruimte te geven.'});
  if($('timingHum').checked)result.push({kind:'info',title:'Timing humanize staat aan',body:'Kleine afwijkingen van het raster zijn bewust toegevoegd. Zet timingvariatie uit voor volledig strakke noten.'});
  result.push({kind:'info',title:'Sound design gebeurt in je DAW',body:'Dit is een controle op MIDI, geen analyse van je audiomix. Screech-timbre, wobble, sidechain, clipping en loudness zijn niet uit deze noten af te leiden.'});
  return result;
}
function renderCheck(){
  const reports=inspectMidi();
  if(!current){$('checkMetrics').innerHTML='';$('checkList').innerHTML='<div class="empty">Genereer eerst een loop.</div>';return;}
  const n=current.parts.reduce((a,p)=>a+p.events.length,0),sec=current.meta.bars*240/current.bpm;
  $('checkMetrics').innerHTML=[[current.parts.length,'instrumenten'],[n,'noten'],[current.meta.bars,'maten'],[sec.toFixed(1)+' s','cliplengte']].map(([v,l])=>'<div class="metric"><b>'+v+'</b><span>'+l+'</span></div>').join('');
  $('checkList').innerHTML=reports.map(r=>'<article class="check-item '+r.kind+'"><h3>'+escapeHtml(r.title)+'</h3><p>'+escapeHtml(r.body)+'</p></article>').join('');
}
$('exportCheck').onclick=()=>{if(!current)return;downloadText('# MIDIROOM MIDI-check\n\nSeed: '+$('seed').value+'\n\n'+inspectMidi().map(r=>'## '+r.title+'\n\n'+r.body).join('\n\n'),fileStem()+'_check.md');};
function refreshWorkspace(){
  const parts=current?current.parts:[];$('partCount').textContent=parts.length+' actief';
  const filter=$('rollFilter'),old=filter.value;
  filter.innerHTML='<option value="all">Alle instrumenten</option>'+parts.map(p=>'<option value="'+p.id+'">'+p.label+'</option>').join('');
  if(parts.some(p=>p.id===old))filter.value=old;
  $('legend').innerHTML=parts.map(p=>'<span><i style="background:'+p.colour+'"></i>'+p.label+'</span>').join('');
  $('rollInfo').textContent=current?current.meta.bars+' maten · '+(current.meta.bars*240/current.bpm).toFixed(1)+' s · 480 PPQ':'480 PPQ · 4/4';
  $('saveIdeaQuick').disabled=!current;$('saveIdea').disabled=!current;$('exportCheck').disabled=!current;$('exportBrief').disabled=!current;
  $('play').disabled=!current||playing;
  paintMS();renderTools();renderCheck();refreshProduction();
}
renderIdeas();
