/* Portable session files and conservative local recovery. Audio stays in RAM. */
const RECOVERY_KEY='midiroom.recovery.v1';
let pendingRecovery=null,recoveryBlocked=false,recoveryTimer=null;
function cleanProject(raw){
 if(!raw||raw.format!=='MIDIROOM-project'||raw.version!==1||!raw.session)throw new Error('Dit is geen ondersteund MIDIROOM-project.');
 const s=raw.session,state=normalizeState(s.state),clip=cleanClip(s.clip),source=cleanClip(s.source);
 if(!clip||!clip.parts.length)throw new Error('Het project bevat geen MIDI-tracks.');
 // Make control metadata agree with the exact clip, avoiding stale URL settings.
 state.r=String(clip.meta.root);state.bp=String(clip.bpm);
 const scaleId=Object.keys(SCALES).find(id=>JSON.stringify(SCALES[id].steps)===JSON.stringify(clip.meta.scale.steps));if(scaleId)state.sc=scaleId;
 return {name:String(raw.name||'Mijn sessie').slice(0,80),saved:String(raw.saved||'').slice(0,40),session:{state,clip,source:source&&source.parts.length?source:clone(clip),linked:false}};
}
function projectPayload(){return {format:'MIDIROOM-project',version:1,name:$('projectName').value.trim()||'Mijn sessie',saved:new Date().toISOString(),session:{state:collectState(),clip:current,source:baseLoop||current}};}
const projectbar=document.createElement('div');projectbar.className='projectbar';projectbar.innerHTML='<div class="project-name"><span class="eyebrow">PROJECT</span><input id="projectName" maxlength="80" aria-label="Projectnaam" value="Mijn sessie"></div><span id="projectStatus" role="status"></span><button id="saveProject" title="Bewaar noten, locks, mixer en klanken">'+icon('download')+' Bewaar project</button><button id="openProject">Open</button><input id="projectFile" type="file" accept=".json,application/json" hidden>';
document.querySelector('.workspace-heading').before(projectbar);
const recovery=document.createElement('div');recovery.id='recoveryBanner';recovery.hidden=true;recovery.innerHTML='<span>Vorige sessie beschikbaar.</span><button id="recoverProject">Herstel</button><button id="discardRecovery">Begin opnieuw</button>';
projectbar.after(recovery);
try{const stored=localStorage.getItem(RECOVERY_KEY);if(stored){if(stored.length>12*1024*1024)throw new Error('Te groot');pendingRecovery=cleanProject(JSON.parse(stored));recovery.hidden=false;$('projectStatus').textContent='Herstel vorige sessie of begin opnieuw.';}}catch(e){recoveryBlocked=true;recovery.hidden=false;recovery.firstElementChild.textContent='Lokale kopie niet leesbaar. Begin opnieuw om lokaal bewaren te hervatten.';$('recoverProject').disabled=true;$('projectStatus').textContent='Bewaar eventueel eerst je huidige project.';}
function scheduleRecovery(){
 if(pendingRecovery||recoveryBlocked||!current)return;
 clearTimeout(recoveryTimer);$('projectStatus').textContent='Lokale kopie bijwerken…';
 recoveryTimer=setTimeout(()=>{try{const payload=JSON.stringify(projectPayload());if(payload.length>12*1024*1024)throw new Error('Te groot');localStorage.setItem(RECOVERY_KEY,payload);$('projectStatus').textContent='Lokaal bewaard · audio apart';}catch(e){$('projectStatus').textContent='Lokale opslag vol of geblokkeerd. Bewaar project.';}},400);
}
function loadProject(project){
 clearTimeout(recoveryTimer);stopAudio();pendingRecovery=null;recovery.hidden=true;
 // Exact restored notes must not be overwritten by an already active vocal source.
 vocalLinked=false;recoveryBlocked=false;historyRestoring=true;
 try{location.hash=encodeURIComponent(JSON.stringify(project.session.state));restoreFromHash();current=clone(project.session.clip);baseLoop=clone(project.session.source);$('projectName').value=project.name;redrawCurrent();}finally{historyRestoring=false;}
 rememberTake();scheduleRecovery();sessionMessage('Project geopend: exacte MIDI, mixer en klanken. Laad vocal-audio apart.');
}
$('recoverProject').onclick=()=>{if(pendingRecovery)loadProject(pendingRecovery);};
$('discardRecovery').onclick=()=>{pendingRecovery=null;recovery.hidden=true;recoveryBlocked=false;scheduleRecovery();};
$('projectName').onchange=scheduleRecovery;
$('saveProject').onclick=()=>{if(!current)return;const payload=projectPayload();downloadText(JSON.stringify(payload,null,2),(payload.name.replace(/[^a-z0-9_-]/gi,'_')||'MIDIROOM')+'.midiroom.json');$('projectStatus').textContent='Project gedownload · vocal-audio apart';};
$('openProject').onclick=()=>$('projectFile').click();
$('projectFile').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>12*1024*1024)throw new Error('Maximaal 12 MB.');const parsed=cleanProject(JSON.parse(await file.text()));loadProject(parsed);}catch(err){$('projectStatus').textContent='Project niet geopend: '+err.message;}};
const rememberBeforeProjects=rememberTake;rememberTake=function(){rememberBeforeProjects();if(!historyRestoring)scheduleRecovery();};
const renderSessionBeforeProjects=renderSession;renderSession=function(){renderSessionBeforeProjects();$('saveProject').disabled=!current;};
// Vocal controls describe pending edits until MIDI is rebuilt.
['vocalRoot','vocalScale','vocalBpm','vocalOffset','vocalMode'].forEach(id=>$(id).addEventListener('change',()=>{if(current?.vocalTiming){$('vocalStatus').textContent='Instellingen gewijzigd. Klik Maak MIDI uit vocal om ze toe te passen.';$('vocalLaneLabel').textContent='Vocalinstellingen gewijzigd · MIDI nog niet bijgewerkt';}}));
function vocalSettingsDirty(){return !!current?.vocalTiming&&!!vocalBuffer&&current.vocalSourceSerial===vocalSourceSerial&&(current.bpm!==Number($('vocalBpm').value)||current.meta.root!==Number($('vocalRoot').value)||JSON.stringify(current.meta.scale.steps)!==JSON.stringify(SCALES[$('vocalScale').value].steps)||(current.vocalOffset||0)!==Number($('vocalOffset').value)||current.vocalMode!==$('vocalMode').value);}
const renderProjectSession=renderSession;renderSession=function(){renderProjectSession();if(vocalSettingsDirty()){$('vocalLaneLabel').textContent='Vocalinstellingen gewijzigd · MIDI nog niet bijgewerkt';$('vocalSummary').textContent='Wijzigingen nog toepassen';}};
// Larger enable targets and explicit vocal transport state.
document.querySelectorAll('[data-part]').forEach(input=>{const label=document.createElement('label');label.className='track-enable';label.title=input.getAttribute('aria-label');input.before(label);label.appendChild(input);});
$('tab-vocal').removeAttribute('role');$('tab-vocal').removeAttribute('aria-selected');$('tab-vocal').tabIndex=0;$('tab-vocal').setAttribute('aria-controls','vocalDrawer');
$('vocalDrawer').addEventListener('toggle',()=>$('tab-vocal').setAttribute('aria-expanded',$('vocalDrawer').open));
const vocalTransport=document.createElement('button');vocalTransport.id='vocalTransport';vocalTransport.hidden=true;vocalTransport.title='Schakel de gekoppelde vocal in of uit';document.querySelector('.transport').appendChild(vocalTransport);
vocalTransport.onclick=()=>{if(!$('vocalAudible').disabled){$('vocalAudible').checked=!$('vocalAudible').checked;$('vocalAudible').dispatchEvent(new Event('change'));}else selectView('vocal');};
const renderBeforeVocalChip=renderSession;renderSession=function(){renderBeforeVocalChip();vocalTransport.hidden=!vocalBuffer;vocalTransport.innerHTML=icon('mic')+(vocalLinked?'Vocal + MIDI':'Vocal uit');vocalTransport.setAttribute('aria-pressed',!!vocalLinked);};

// Undo/Redo restore snapshots without rememberTake; persist that restored choice too.
const restoreBeforeProjects=restoreSnapshot;restoreSnapshot=function(s){restoreBeforeProjects(s);scheduleRecovery();};
