/* Four exact, project-portable scene slots. Audio files intentionally remain outside scenes. */
let sessionScenes=[];
const SCENE_LIMIT=4,SCENE_BYTES=8*1024*1024;
function sceneNoteCount(clip){return clip?.parts?.reduce((n,p)=>n+p.events.length,0)||0;}
function cleanSceneSnapshot(raw){
 if(!raw||typeof raw!=='object')throw new Error('Ongeldige scene.');
 const state=normalizeState(raw.state),clip=cleanClip(raw.clip),source=cleanClip(raw.source);
 if(!clip||!clip.parts.length||clip.meta.bars>32||sceneNoteCount(clip)>20000)throw new Error('Scene is te groot (maximaal 32 maten en 20.000 noten).');
 const safeSource=source&&source.parts.length?source:clone(clip);
 if(safeSource.meta.bars>32||sceneNoteCount(safeSource)>20000)throw new Error('Scene-bron is te groot.');
 return {state,clip,source:safeSource,linked:false};
}
function cleanScenes(raw){
 if(!Array.isArray(raw))return [];
 const out=Array(SCENE_LIMIT).fill(null);
 raw.slice(0,SCENE_LIMIT).forEach((entry,i)=>{if(entry){const snap=cleanSceneSnapshot(entry.snapshot);out[i]={name:String(entry.name||('Scene '+(i+1))).slice(0,32),snapshot:snap};}});
 if(JSON.stringify(out).length>SCENE_BYTES)throw new Error('Scenes zijn samen te groot.');
 return out;
}
function sceneProjectFits(scenes){const payload=projectPayloadBeforeScenes();payload.scenes=scenes;return JSON.stringify(payload).length<=12*1024*1024;}
const sceneRack=document.createElement('details');sceneRack.id='sceneRack';sceneRack.className='scene-rack';sceneRack.innerHTML='<summary>'+icon('music')+' Scene Launcher <span id="sceneSummary">0 / 4 gevuld</span></summary><div class="scene-head"><div><span class="eyebrow">LIVE IDEAS</span><strong>Bewaar vier volledige versies</strong></div><p>Een scene onthoudt MIDI, locks, mixer en klanken. Starten gebeurt direct.</p></div><div class="scene-grid" id="sceneGrid"></div><p class="hint" id="sceneStatus" role="status">Capture bewaart je huidige sessie exact. Scene-audio start direct en is niet gekwantiseerd.</p>';
document.querySelector('.rollbox').before(sceneRack);
function renderScenes(){
 $('sceneSummary').textContent=sessionScenes.filter(Boolean).length+' / 4 gevuld';
 $('sceneGrid').innerHTML=Array.from({length:SCENE_LIMIT},(_,i)=>{const s=sessionScenes[i],c=s?.snapshot.clip;return '<article class="scene-slot'+(s?' loaded':' empty')+'" data-scene-slot="'+i+'"><div class="scene-number">'+String(i+1).padStart(2,'0')+'</div><input data-scene-name="'+i+'" maxlength="32" aria-label="Naam scene '+(i+1)+'" '+(s?'':'disabled')+' placeholder="Scene '+(i+1)+'">'+(s?discoveryMini(c)+'<span class="scene-stats">'+c.bpm+' BPM · '+c.meta.bars+' maten · '+c.parts.length+' tracks</span>':'<span class="scene-stats">Leeg slot</span>')+'<div class="scene-actions">'+(s?'<button class="primary" data-scene-launch="'+i+'">'+icon('play')+' Start</button><button data-scene-capture="'+i+'" title="Overschrijf met huidige sessie">Vervang</button><button data-scene-clear="'+i+'" aria-label="Scene '+(i+1)+' wissen">Wis</button>':'<button class="primary" data-scene-capture="'+i+'">'+icon('vary')+' Capture</button>')+'</div></article>';}).join('');
 sessionScenes.forEach((s,i)=>{const input=document.querySelector('[data-scene-name="'+i+'"]');if(input&&s)input.value=s.name;});
}
function captureScene(i){
 if(!current){$('sceneStatus').textContent='Maak eerst MIDI om een scene vast te leggen.';return;}
 try{stopAudio();const snap=cleanSceneSnapshot(snapshot());const next=sessionScenes.slice();next[i]={name:next[i]?.name||('Scene '+(i+1)),snapshot:snap};const cleaned=cleanScenes(next);if(!sceneProjectFits(cleaned))throw new Error('Project met scenes is te groot (maximaal 12 MB).');sessionScenes=cleaned;renderScenes();scheduleRecovery();$('sceneStatus').textContent='Scene '+(i+1)+' vastgelegd · MIDI, locks, mixer en klanken.';}catch(e){$('sceneStatus').textContent=e.message;}
}
function launchScene(i){
 const scene=sessionScenes[i];if(!scene)return;
 try{rememberTake();restoreSnapshot(clone(scene.snapshot));rememberTake();$('sceneStatus').textContent=scene.name+' gestart · Undo keert terug. Start is direct, zonder maat-kwantisatie.';playAll();}catch(e){$('sceneStatus').textContent='Scene kon niet starten: '+e.message;}
}
$('sceneGrid').addEventListener('click',e=>{const launch=e.target.closest('[data-scene-launch]'),capture=e.target.closest('[data-scene-capture]'),clear=e.target.closest('[data-scene-clear]');if(launch)launchScene(+launch.dataset.sceneLaunch);else if(capture)captureScene(+capture.dataset.sceneCapture);else if(clear){stopAudio();sessionScenes[+clear.dataset.sceneClear]=null;renderScenes();scheduleRecovery();$('sceneStatus').textContent='Scene gewist.';}});
$('sceneGrid').addEventListener('change',e=>{if(!e.target.matches('[data-scene-name]'))return;const i=+e.target.dataset.sceneName;if(sessionScenes[i]){sessionScenes[i].name=(e.target.value.trim()||('Scene '+(i+1))).slice(0,32);renderScenes();scheduleRecovery();}});
const cleanProjectBeforeScenes=cleanProject;
cleanProject=function(raw){const project=cleanProjectBeforeScenes(raw);project.scenes=cleanScenes(raw.scenes);if(JSON.stringify(project).length>12*1024*1024)throw new Error('Project is te groot.');return project;};
const projectPayloadBeforeScenes=projectPayload;
projectPayload=function(){const payload=projectPayloadBeforeScenes();payload.scenes=clone(sessionScenes);return payload;};
$('saveProject').onclick=()=>{if(!current)return;try{const payload=projectPayload(),json=JSON.stringify(payload,null,2);if(new TextEncoder().encode(json).length>12*1024*1024)throw new Error('Project is groter dan 12 MB. Wis een scene of maak de sessie korter.');downloadText(json,(payload.name.replace(/[^a-z0-9_-]/gi,'_')||'MIDIROOM')+'.midiroom.json');$('projectStatus').textContent='Project gedownload · vocal-audio apart';}catch(e){$('projectStatus').textContent='Project niet bewaard: '+e.message;}};
const loadProjectBeforeScenes=loadProject;
loadProject=function(project){sessionScenes=cleanScenes(project.scenes);loadProjectBeforeScenes(project);renderScenes();};
// projects.js reads recovery before this module is installed; enrich that clean session once.
if(pendingRecovery){try{const raw=JSON.parse(localStorage.getItem(RECOVERY_KEY)||'null');pendingRecovery.scenes=cleanScenes(raw?.scenes);}catch(e){pendingRecovery=null;recoveryBlocked=true;recovery.firstElementChild.textContent='Lokale kopie niet leesbaar. Begin opnieuw om lokaal bewaren te hervatten.';$('recoverProject').disabled=true;$('projectStatus').textContent='Lokale kopie niet leesbaar. Begin opnieuw om lokaal bewaren te hervatten.';}}
renderScenes();
