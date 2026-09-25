/* MIDIROOM Arrangement Director. Pure helpers are exported for tests. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.MidiroomArranger=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const TICKS=1920,BEAT=480;
  const copy=x=>JSON.parse(JSON.stringify(x));
  const unique=x=>[...new Set(x)];
  function available(ids,wanted){return unique(wanted.filter(id=>ids.includes(id)));}
  function section(name,bars,gain,parts,variation='same',transition='none'){
    return {name,bars,gain,parts:unique(parts),variation,transition};
  }
  function proposeArrangement(kind,partIds){
    const ids=unique((partIds||[]).filter(Boolean));
    const rhythm=available(ids,['drums','kick']);
    const low=available(ids,['bass']);
    const harmony=available(ids,['chords','pad','harmony','arp']);
    const lead=available(ids,['melody','lead','screech']);
    const all=ids.slice();
    const sparse=unique([...rhythm.filter(id=>id!=='kick'),...low,...harmony.slice(0,1)]);
    const tension=unique([...rhythm.filter(id=>id!=='kick'),...low,...harmony,...lead.slice(0,1)]);
    const intro=sparse.length?sparse:all.slice(0,1);
    const finish=sections=>sections.map(s=>({...s,parts:s.parts.length?s.parts:all.slice(0,1)}));
    if(kind==='sketch')return finish([
      section('Open',4,.62,intro,'same','breath'),
      section('Reveal',4,.82,tension.length?tension:all,'subtle','roll'),
      section('Main',8,1,all,'explore','none')
    ]);
    if(kind==='extended')return finish([
      section('Atmosphere',16,.55,intro,'same','breath'),
      section('Pulse',16,.72,unique([...rhythm,...low,...harmony.slice(0,1)]),'subtle','roll'),
      section('Lift',8,.86,tension.length?tension:all,'explore','breath'),
      section('Peak',32,1,all,'explore','roll'),
      section('Release',16,.66,unique([...rhythm.filter(id=>id!=='kick'),...harmony,...lead.slice(0,1)]),'subtle','none')
    ]);
    return finish([
      section('DJ Intro',8,.6,intro,'same','breath'),
      section('Pressure',16,.78,tension.length?tension:all,'subtle','roll'),
      section('Drop',16,1,all,'explore','breath'),
      section('Return',8,.7,unique([...rhythm,...low,...harmony]),'subtle','none')
    ]);
  }
  function clampEvent(e,total){
    const tick=Math.max(0,Math.min(total-1,Math.round(Number(e.tick)||0)));
    return {...e,tick,dur:Math.max(1,Math.min(total-tick,Math.round(Number(e.dur)||1))),midi:Math.max(0,Math.min(127,Math.round(Number(e.midi)||0))),vel:Math.max(1,Math.min(127,Math.round(Number(e.vel)||1)))};
  }
  function estimatedNotes(source,sections){
    const sourceBars=Math.max(1,Number(source?.meta?.bars)||1);
    return (sections||[]).reduce((sum,s)=>sum+(source?.parts||[]).filter(p=>s.parts?.includes(p.id)).reduce((n,p)=>n+p.events.length*Math.ceil((Number(s.bars)||0)/sourceBars),0),0);
  }
  function applyTransitions(clip,source,sections,locks={}){
    const out=copy(clip),total=Math.max(1,(out.meta?.bars||0)*TICKS);let cursor=0;
    (sections||[]).forEach(s=>{
      const end=(cursor+(Number(s.bars)||0))*TICKS,cut=Math.max(cursor*TICKS,end-BEAT),mode=['breath','roll'].includes(s.transition)?s.transition:'none';
      if(mode==='breath')out.parts.forEach(p=>{
        if(locks[p.id])return;
        p.events=p.events.filter(e=>e.tick<cut||e.tick>=end).map(e=>e.tick<cut&&e.tick+e.dur>cut?{...e,dur:Math.max(1,cut-e.tick)}:e);
      });
      if(mode==='roll'){
        const target=['drums','kick'].find(id=>s.parts?.includes(id)&&!locks[id]&&out.parts.some(p=>p.id===id));
        if(target){const track=out.parts.find(p=>p.id===target),donor=source?.parts?.find(p=>p.id===target)?.events?.[0];
          if(donor){track.events=track.events.filter(e=>e.tick<cut||e.tick>=end);for(let i=0;i<4;i++)track.events.push(clampEvent({...donor,tick:cut+i*120,dur:Math.min(90,donor.dur||90),vel:Math.min(127,Math.max(1,Math.round((donor.vel||90)*(s.gain||1)*(0.76+i*.08))))},total));track.events.sort((a,b)=>a.tick-b.tick||a.midi-b.midi);}
        }
      }
      cursor+=Number(s.bars)||0;
    });
    out.parts.forEach(p=>{if(!locks[p.id])p.events=p.events.map(e=>clampEvent(e,total));});
    if(out.parts.reduce((n,p)=>n+p.events.length,0)>50000)throw new Error('Arrangement bevat te veel noten (maximaal 50.000). Maak secties korter.');
    return out;
  }
  return {proposeArrangement,applyTransitions,estimatedNotes};
});

if(typeof document!=='undefined'&&typeof arrangeClip==='function'){
  const arrangerApi=globalThis.MidiroomArranger;
  const director=document.createElement('section');director.className='arr-director';director.setAttribute('aria-label','Arrangement Director');
  director.innerHTML='<div><span class="eyebrow">ARRANGEMENT DIRECTOR</span><strong>Start met een plan, pas daarna iedere sectie aan.</strong><p id="arrProposalSummary" class="hint"></p></div><select id="arrPreset" aria-label="Arrangementvoorstel"><option value="club">Club Journey · 48 maten</option><option value="sketch">Short Sketch · 16 maten</option><option value="extended">Extended · 88 maten</option></select><button id="arrApplyPreset">Zet voorstel in editor</button>';
  document.querySelector('#view-arrange .action-row').before(director);
  const transitionHelp=document.createElement('p');transitionHelp.className='hint arr-transition-help';transitionHelp.textContent='Einde: Adempauze maakt de laatste tel vrij op ontgrendelde tracks. Drumroll zet vier slagen op de laatste tel als drums of kick actief en ontgrendeld zijn. Overgangen wijzigen geen gelockte tracks.';director.after(transitionHelp);
  function proposal(){const ids=(baseLoop||current)?.parts?.map(p=>p.id)||[];return arrangerApi.proposeArrangement($('arrPreset').value,ids);}
  function paintProposal(){const p=proposal();$('arrProposalSummary').textContent=p.length+' secties · '+p.reduce((n,s)=>n+s.bars,0)+' maten · vervangt pas na je klik.';$('arrApplyPreset').disabled=!(baseLoop||current);}
  $('arrPreset').onchange=paintProposal;
  $('arrApplyPreset').onclick=()=>{if(!(baseLoop||current))return;arrSections=proposal();renderArrangement();saveToHash();rememberTake();$('arrStatus').textContent='Voorstel staat in de editor. Pas instrumenten, groove en overgangen vrij aan.';};

  const arrangeBase=arrangeClip;
  arrangeClip=function(source,sections){if(arrangerApi.estimatedNotes(source,sections)>50000)throw new Error('Arrangement bevat te veel noten (maximaal 50.000). Maak secties korter.');return arrangerApi.applyTransitions(arrangeBase(source,sections),source,sections,sessionConfig?.locks||{});};
  const renderBase=renderArrangement;
  renderArrangement=function(){
    renderBase();paintProposal();
    document.querySelectorAll('.arr-settings').forEach((row,i)=>{
      const control=document.createElement('label');control.className='transition-control';control.innerHTML='Einde <select data-arr-transition="'+i+'"><option value="none">Door</option><option value="breath">Adempauze</option><option value="roll">Drumroll</option></select>';
      const select=control.querySelector('select');select.value=['breath','roll'].includes(arrSections[i].transition)?arrSections[i].transition:'none';row.appendChild(control);
    });
    document.querySelectorAll('.arr-clip').forEach((clip,i)=>{const s=arrSections[i],count=s.parts?.length||0;clip.title=count+' tracks · '+({none:'doorlopend',breath:'adempauze',roll:'drumroll'}[s.transition||'none']);clip.insertAdjacentHTML('beforeend','<small>'+count+' tracks · '+({none:'→',breath:'⌁',roll:'≋'}[s.transition||'none'])+'</small>');});
  };
  $('arrRows').addEventListener('change',e=>{if(e.target.dataset.arrTransition===undefined)return;const s=arrSections[+e.target.dataset.arrTransition];if(!s)return;s.transition=['breath','roll'].includes(e.target.value)?e.target.value:'none';renderArrangement();saveToHash();rememberTake();});
}
