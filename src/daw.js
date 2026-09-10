/* MIDIROOM 2.2: presentation and navigation only; no changes to MIDI generation. */
const studioDock=document.createElement('div');
studioDock.className='studio-dock';
studioDock.innerHTML='<div class="transport-readout"><span class="status-led" id="transportLed"></span><div><small>POSITION · BAR / BEAT</small><output id="transportPosition">001 : 1</output></div></div><div class="dock-context" id="dockContext"></div><button id="commandOpen" title="Snelmenu (Ctrl/Cmd+K)">Snelmenu <kbd>⌘ / Ctrl K</kbd></button>';
document.querySelector('header').after(studioDock);
studioDock.insertBefore(document.querySelector('.transport'),$('dockContext'));
$('play').textContent='▶ Play';$('stop').textContent='■ Stop';
$('play').title='Start vanaf het begin · Spatie';$('stop').title='Stop · Spatie';
const search=document.createElement('div');search.className='track-search';
search.innerHTML='<input id="trackSearch" type="search" placeholder="Zoek instrument…" aria-label="Zoek instrument"><button id="activeTracks" aria-pressed="false" title="Toon alleen ingeschakelde instrumenten">Actief</button><span id="trackEmpty" class="hint" hidden>Geen instrumenten gevonden.</span>';
document.querySelector('.sidebar-title').after(search);
function filterTracks(){const q=$('trackSearch').value.trim().toLowerCase(),active=$('activeTracks').getAttribute('aria-pressed')==='true';let count=0;document.querySelectorAll('.part').forEach(p=>{p.hidden=!PART_DEFS[p.dataset.id].label.toLowerCase().includes(q)||(active&&!p.querySelector('[data-part]').checked);if(!p.hidden)count++;});document.querySelectorAll('.part-group').forEach(g=>{let p=g.nextElementSibling,visible=false;while(p&&!p.classList.contains('part-group')){if(p.classList.contains('part')&&!p.hidden)visible=true;p=p.nextElementSibling;}g.hidden=!visible;});$('trackEmpty').hidden=count>0;}
$('trackSearch').oninput=filterTracks;$('activeTracks').onclick=()=>{$('activeTracks').setAttribute('aria-pressed',$('activeTracks').getAttribute('aria-pressed')!=='true');filterTracks();};
$('parts').addEventListener('change',filterTracks);
const focusButton=document.createElement('button');focusButton.id='focusRoll';focusButton.textContent='Focus';focusButton.title='Meer ruimte voor de piano roll';focusButton.setAttribute('aria-pressed','false');document.querySelector('.daw-toolbar .action-row').appendChild(focusButton);
focusButton.onclick=()=>{const active=document.body.classList.toggle('roll-focus');focusButton.setAttribute('aria-pressed',active);focusButton.textContent=active?'Sluit focus':'Focus';rollCache=null;drawRoll();};
const viewport=document.createElement('div');viewport.id='rollViewport';viewport.tabIndex=0;viewport.setAttribute('aria-label','Piano roll, horizontaal scrollbaar bij zoom');cv.before(viewport);viewport.appendChild(cv);
const zoom=document.createElement('div');zoom.className='zoom-controls';zoom.innerHTML='<label for="rollZoom">Zoom</label><select id="rollZoom"><option value="1">Fit</option><option value="2">2×</option><option value="4">4×</option></select><label class="check"><input type="checkbox" id="followRoll" checked> Volg</label>';
document.querySelector('.roll-title').appendChild(zoom);
$('rollZoom').onchange=()=>{cv.style.width=(Number($('rollZoom').value)*100)+'%';viewport.scrollLeft=0;rollCache=null;drawRoll();};
function updateDaw(playhead){
 if(!$('transportPosition'))return;
 const tick=Math.max(0,playhead||0),bar=Math.floor(tick/1920)+1,beat=Math.floor(tick%1920/480)+1;
 $('transportPosition').textContent=String(bar).padStart(3,'0')+' : '+beat;
 $('transportLed').classList.toggle('running',playing);
 $('play').classList.toggle('running',playing);
 // Scale is held in the session controls for original and custom clips.
 $('dockContext').textContent=current?current.bpm+' BPM · '+NOTE_NAMES[current.meta.root]+' · '+current.meta.bars+' bars':'';
 if(playhead==null)filterTracks();
 if(playing&&playhead!=null&&$('followRoll').checked&&rollMap&&$('rollZoom').value!=='1'){
  const x=playheadX(playhead);if(x<viewport.scrollLeft||x>viewport.scrollLeft+viewport.clientWidth-32)viewport.scrollLeft=Math.max(0,x-60);
 }
}
const commands=[
 ['MIDI Generator','generator'],['Sound Lab','sound'],['Arrangement','arrange'],['Vocal Room','vocal'],['Studio Tools','tools'],['Idea Bank','ideas'],['MIDI Check','check'],
 ['Afspelen / stoppen',()=>playing?stopAudio():playAll()],['Nieuwe variatie',()=>$('reroll').click()],['Bewaar take in Idea Bank',()=>$('saveIdeaQuick').click()],['Undo',()=>$('undoTake').click()],['Redo',()=>$('redoTake').click()],['Mixer tonen / verbergen',()=>{selectView('generator');$('toggleMixer').click();}],['Focus piano roll',()=>{selectView('generator');focusButton.click();}],['Reset mute / solo',()=>$('clearMix').click()]
];
const dialog=document.createElement('dialog');dialog.id='commandDialog';dialog.setAttribute('aria-labelledby','commandTitle');dialog.innerHTML='<div class="command-head"><h2 id="commandTitle">Waar wil je naartoe?</h2><button id="commandClose" aria-label="Snelmenu sluiten">Esc</button></div><input type="search" id="commandSearch" placeholder="Zoek een scherm of actie…" aria-label="Zoek een commando"><div id="commandResults"></div><p class="hint">Tab om te kiezen · Enter om uit te voeren · Esc om te sluiten</p>';document.body.appendChild(dialog);
dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeCommands();}});
let commandReturn=null;
function renderCommands(){const q=$('commandSearch').value.trim().toLowerCase();const matches=commands.map((c,i)=>({c,i})).filter(({c})=>c[0].toLowerCase().includes(q));$('commandResults').innerHTML=matches.map(({c,i})=>'<button data-command="'+i+'">'+escapeHtml(c[0])+'<span>'+(typeof c[1]==='string'?'OPEN ↗':'ACTIE ↵')+'</span></button>').join('')||'<p class="hint">Geen resultaten.</p>';}
function closeCommands(){dialog.close();commandReturn?.focus();}
$('commandOpen').onclick=()=>{commandReturn=document.activeElement;$('commandSearch').value='';renderCommands();dialog.showModal();$('commandSearch').focus();};$('commandClose').onclick=closeCommands;dialog.addEventListener('cancel',e=>{e.preventDefault();closeCommands();});$('commandSearch').oninput=renderCommands;
$('commandResults').onclick=e=>{const b=e.target.closest('[data-command]');if(!b)return;const c=commands[+b.dataset.command];closeCommands();if(typeof c[1]==='string'){selectView(c[1]);$('tab-'+c[1]).focus();}else c[1]();};
$('commandSearch').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('commandResults').querySelector('button')?.click();}if(e.key==='ArrowDown'){e.preventDefault();$('commandResults').querySelector('button')?.focus();}};
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();dialog.open?closeCommands():$('commandOpen').click();}});
// Native checkboxes remain accessible while their labels act as transport toggles.
document.querySelectorAll('.transport input[type=checkbox]').forEach(input=>{input.parentElement.classList.add('transport-toggle');});

// Refresh the backing pixels when layout changes, including mixer and zoom sizing.
if(typeof ResizeObserver!=='undefined'){new ResizeObserver(()=>{if(!$('view-generator').hidden){rollCache=null;drawRoll();}}).observe(viewport);}
