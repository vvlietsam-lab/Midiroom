/* Vocal Conversation: deterministic MIDI transforms driven by measured vocal activity. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else Object.assign(root,api);})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clone=o=>o===undefined?undefined:JSON.parse(JSON.stringify(o));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function sanitizeSegments(segments,duration){
 return (Array.isArray(segments)?segments:[]).filter(s=>Number.isFinite(+s.start)&&Number.isFinite(+s.end)&&Number.isFinite(+s.midi)&&+s.end>+s.start).map(s=>({start:clamp(+s.start,0,duration),end:clamp(+s.end,0,duration),midi:clamp(Math.round(+s.midi),0,127)})).filter(s=>s.end>s.start).sort((a,b)=>a.start-b.start||a.end-b.end);
}
function vocalWindows(segments,duration,minGap=.28){
 const active=[];for(const s of segments){const last=active.at(-1);if(last&&s.start<=last.end+.08)last.end=Math.max(last.end,s.end);else active.push({start:s.start,end:s.end});}
 const gaps=[];let at=0;for(const s of active){if(s.start-at>=minGap)gaps.push({start:at,end:s.start});at=Math.max(at,s.end);}if(duration-at>=minGap)gaps.push({start:at,end:duration});
 return {active,gaps};
}
function snapScale(n,root,steps){let best=clamp(Math.round(n),0,127),distance=999;for(let m=0;m<128;m++){if(steps.includes((m-root+120)%12)&&Math.abs(m-n)<distance){best=m;distance=Math.abs(m-n);}}return best;}
function tidy(events,total,poly){const out=events.map(e=>({tick:clamp(Math.round(e.tick),0,total-1),dur:Math.max(1,Math.round(e.dur)),midi:clamp(Math.round(e.midi),0,127),vel:clamp(Math.round(e.vel),1,127)})).sort((a,b)=>a.tick-b.tick||a.midi-b.midi),seen=new Set(),clean=[];for(const e of out){const k=e.tick+':'+(poly?e.midi:'mono');if(seen.has(k))continue;seen.add(k);e.dur=Math.min(e.dur,total-e.tick);if(e.dur>0)clean.push(e);}if(poly){let group=0;while(group<clean.length){let after=group+1;while(after<clean.length&&clean[after].tick===clean[group].tick)after++;if(after<clean.length){const room=clean[after].tick-clean[group].tick;for(let i=group;i<after;i++)clean[i].dur=Math.min(clean[i].dur,room);}group=after;}}else for(let i=0;i<clean.length-1;i++)clean[i].dur=Math.min(clean[i].dur,clean[i+1].tick-clean[i].tick);return clean.filter(e=>e.dur>0);}
function overlaps(e,window,ticksPerSecond){const a=e.tick/ticksPerSecond,b=(e.tick+e.dur)/ticksPerSecond;return a<window.end&&b>window.start;}
function conversationClip(source,segments,options={}){
 if(!source||!Array.isArray(source.parts)||!source.meta)throw new Error('Ongeldige bronclip.');
 if(source.parts.reduce((n,p)=>n+(Array.isArray(p.events)?p.events.length:0),0)>50000)throw new Error('Clip bevat te veel noten.');
 const bpm=Number(source.bpm)||Number(source.meta.bpm)||120,bars=clamp(Math.round(source.meta.bars)||1,1,256),total=bars*1920,duration=total/(bpm*8),offset=clamp(Number(options.offset)||0,0,30),closeness=clamp(Number(options.closeness)||0,0,100)/100,mode=options.mode==='support'?'support':'converse',rootNote=clamp(Math.round(Number(options.root??source.meta.root)||0),0,11),steps=Array.isArray(options.steps)&&options.steps.length?options.steps:[0,2,3,5,7,8,10],locks=options.locks||{},targets=new Set(Array.isArray(options.targets)?options.targets:[]);
 const clean=sanitizeSegments(segments,Math.max(0,duration-offset)).slice(0,50000).map(s=>({...s,start:s.start+offset,end:s.end+offset})),windows=vocalWindows(clean,duration),leadIds=new Set(['lead','melody','screech','darkmelody','pluck','arp']),polyIds=new Set(['chords','pad','harmony']),supported=new Set(['bass',...leadIds,...polyIds]);
 if(!clean.length)throw new Error('Geen bruikbare zangnoten gevonden.');
 const out=clone(source);out.parts=source.parts.map(part=>{
  if(locks[part.id]||!supported.has(part.id)||!targets.has(part.id)||closeness===0)return clone(part);
  const poly=polyIds.has(part.id);let events=clone(part.events||[]);
  if(leadIds.has(part.id)){
   // Create breathing room as closeness rises. Converse then places short replies only in measured rests.
   if(closeness>0){events=events.filter((e,i)=>!windows.active.some(w=>overlaps(e,w,bpm*8))||((i*37+e.tick)%100)/100>closeness*(mode==='converse'?.94:.62));
   if(mode==='converse')windows.gaps.forEach((gap,g)=>{if(gap.end-gap.start<.34||events.length>=50000)return;const count=Math.min(4,Math.max(1,Math.floor((gap.end-gap.start-.12)/.18))),anchor=(part.events||[]).filter(e=>e.tick/(bpm*8)<=gap.start).at(-1)||(part.events||[])[g%(part.events||[]).length];if(!anchor)return;for(let i=0;i<count&&events.length<50000;i++){if(((g*19+i*31)%100)/100>closeness)continue;const time=gap.start+.07+i*Math.min(.22,(gap.end-gap.start-.14)/count);events.push({tick:time*bpm*8,dur:Math.min(.14,gap.end-time-.03)*bpm*8,midi:snapScale(anchor.midi+[0,2,-2,4][i%4],rootNote,steps),vel:clamp(anchor.vel-4+i*2,52,112)});}});}
  } else if(poly){
   // Under active singing, use longer harmonic beds while retaining every original pitch.
   events=events.map(e=>{const w=windows.active.find(x=>overlaps(e,x,bpm*8));if(!w)return e;const desired=(w.end*bpm*8)-e.tick;return {...e,dur:Math.max(e.dur,Math.round(e.dur+(Math.max(1,desired)-e.dur)*closeness*(mode==='support'?1:.65))),vel:clamp(e.vel-(mode==='support'?8:4)*closeness,1,127)};});
  } else if(part.id==='bass'){
   // Pull nearby existing bass notes towards vocal onsets; pitch identity and harmony remain unchanged.
   const onsets=clean.map(s=>Math.round(s.start*bpm*8/120)*120).filter(t=>t>=0&&t<total);events=events.map(e=>{let nearest=null,dist=241;for(const t of onsets){const d=Math.abs(t-e.tick);if(d<dist){dist=d;nearest=t;}}if(nearest===null||dist>240)return e;return {...e,tick:Math.round(e.tick+(nearest-e.tick)*closeness*(mode==='support'?.7:.4)),vel:clamp(e.vel+Math.round(8*closeness),1,127)};});
  }
  return {...clone(part),events:tidy(events,total,poly),part:{...(clone(part.part)||{}),rhythmLabel:'Vocal Conversation · '+mode}};
 });
 out.customEdit=true;out.vocalTiming=true;out.vocalConversation={mode,closeness:Math.round(closeness*100),active:windows.active.length,gaps:windows.gaps.length};
 if(out.parts.reduce((n,p)=>n+p.events.length,0)>50000)throw new Error('Resultaat bevat te veel noten.');
 return {clip:out,activity:windows};
}
return {conversationClip,sanitizeSegments,vocalWindows};
});
