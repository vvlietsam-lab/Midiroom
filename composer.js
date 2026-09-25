/* Pure composition transforms. Integer MIDI ticks, deterministic local PRNG, no DOM. */
function composeRandom(seed){let n=2166136261;for(const c of String(seed))n=Math.imul(n^c.charCodeAt(0),16777619);return()=>{n+=0x6D2B79F5;let t=Math.imul(n^n>>>15,n|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function tidyEvents(events,total,mono=false){
 const seen=new Set();const list=events.filter(e=>Number.isFinite(e.tick)&&Number.isFinite(e.dur)).map(e=>({tick:Math.max(0,Math.round(e.tick)),dur:Math.max(1,Math.round(e.dur)),midi:Math.max(0,Math.min(127,Math.round(e.midi))),vel:Math.max(1,Math.min(127,Math.round(e.vel)))})).filter(e=>e.tick<total).sort((a,b)=>a.tick-b.tick||a.midi-b.midi).filter(e=>{const k=e.tick+':'+(mono?'one':e.midi);if(seen.has(k))return false;seen.add(k);return true;});
 const next=new Map();for(let i=list.length-1;i>=0;i--){const e=list[i],key=mono?'one':e.midi;e.dur=Math.min(e.dur,total-e.tick,(next.get(key)??total)-e.tick);next.set(key,e.tick);}return list.filter(e=>e.dur>0);
}
function rhythmVariation(part,bars,seed,strength='explore',scaleSteps=[0,2,3,5,7,8,10],root=0){
 const rand=composeRandom(seed+':'+part.id),total=bars*1920,poly=['chords','pad','harmony'].includes(part.id),drums=part.id==='drums',mono=!poly&&!drums;
 if(!part.events.length)return {...part,events:[]};
 const choose=a=>a[Math.floor(rand()*a.length)],patterns=[[0,3,6,10,12],[2,6,10,14],[0,7,10],[0,4,8,12],[0,3,8,11,14],[0,6,12],[0,2,3,8,10,11],[0,8],[0,5,9,14],[0,1,6,8,9,14],[0,4,7,10,12,15],[0]];
 let result=[];const baseRhythm=choose(patterns),scale=[];for(let n=12;n<116;n++)if(scaleSteps.includes((n-root+120)%12))scale.push(n);
 const snap=n=>scale.reduce((best,v)=>Math.abs(v-n)<Math.abs(best-n)?v:best,scale[0]);
 for(let bar=0;bar<bars;bar++){
  const start=bar*1920,original=part.events.filter(e=>e.tick<start+1920&&e.tick+e.dur>start);if(!original.length)continue;
  if(strength==='subtle'||drums){
   original.filter(e=>e.tick>=start).forEach((e,i)=>{const anchor=drums&&[36,38,39].includes(e.midi);const shift=anchor?0:choose([-120,0,0,120]);const tick=Math.max(start,Math.min(start+1800,e.tick+shift));result.push({...e,tick,dur:e.dur*choose([.55,.8,1.25])});if(!anchor&&rand()>(strength==='subtle'?.88:.56)&&tick+180<start+1920)result.push({...e,tick:tick+180,dur:Math.min(e.dur*.45,120),vel:e.vel*.8});});if(drums&&strength!=='subtle'&&bar%2===1){const hit=original.find(e=>[38,39].includes(e.midi))||original[0];result.push({...hit,tick:start+choose([1560,1680,1800]),dur:90,vel:hit.vel*.7});}continue;
  }
  const groups=[];original.forEach(e=>{const t=Math.max(start,Math.round(e.tick/30)*30);let g=groups.find(g=>Math.abs(g.tick-t)<=30);if(!g){g={tick:t,events:[]};groups.push(g);}g.events.push(e);});groups.sort((a,b)=>a.tick-b.tick);
  // Repeat a rhythmic motif on alternating bars; the intervening bars can answer it.
  // This keeps discovery broad without making every measure feel unrelated.
  const rhythm=bar%2===0||rand()<(strength==='wild'?.22:.5)?baseRhythm:choose(patterns),gate=choose(part.id==='pad'?[.6,.85,1]:[.28,.5,.72,.95]);
  rhythm.forEach((step,i)=>{const tick=start+step*120,until=start+(rhythm[i+1]??16)*120;const group=groups.reduce((best,g)=>Math.abs(g.tick-tick)<Math.abs(best.tick-tick)?g:best,groups[0]);const notes=poly?group.events:[choose(group.events)];
   notes.forEach((e,j)=>{let midi=e.midi;if(!poly&&part.id!=='kick'&&rand()>.55){const index=scale.indexOf(snap(midi));midi=scale[Math.max(0,Math.min(scale.length-1,index+choose(strength==='wild'?[-4,-2,2,4,7]:[-2,0,1,2])))];}const strum=poly&&strength==='wild'?j*15:0;result.push({tick:tick+strum,dur:Math.max(30,(until-tick)*gate-strum),midi,vel:e.vel+Math.floor(rand()*15)-7});});
  });
 }
 if(!result.length)result=part.events.map(e=>({...e,dur:Math.max(1,e.dur*.7)}));
 return {...part,events:tidyEvents(result,total,mono),part:{...part.part,rhythmLabel:'Ritmevariatie · '+strength}};
}
function relateParts(clip,targets,mode='space',locked={}){
 if(mode==='off')return clip;const total=clip.meta.bars*1920,lead=clip.parts.find(p=>p.id==='lead')||clip.parts.find(p=>p.id==='melody'),chords=clip.parts.find(p=>p.id==='chords')||clip.parts.find(p=>p.id==='pad'),kick=clip.parts.find(p=>p.id==='kick')||clip.parts.find(p=>p.id==='drums');
 clip.parts.forEach(p=>{if(!targets.includes(p.id)||locked[p.id])return;
  if(p.id==='bass'&&chords?.events.length){p.events=p.events.map(e=>{const active=chords.events.filter(c=>c.tick<=e.tick&&c.tick+c.dur>e.tick);if(!active.length)return e;const pcs=[...new Set(active.map(c=>(c.midi%12+12)%12))];let root=pcs[0];for(const pc of pcs)if((pcs.includes((pc+3)%12)||pcs.includes((pc+4)%12))&&pcs.includes((pc+7)%12)){root=pc;break;}let midi=e.midi+((root-e.midi%12+18)%12-6);while(midi<28)midi+=12;while(midi>52)midi-=12;return {...e,midi};});}
  if(p.id==='bass'&&mode==='space'&&kick){p.events=p.events.map(e=>kick.events.some(k=>Math.abs(k.tick-e.tick)<50)?{...e,tick:e.tick+120,dur:Math.max(30,e.dur-120)}:e);}
  if(lead&&['screech','darkmelody','pluck','arp'].includes(p.id)&&p.id!==lead.id&&mode==='space'){
   const reduced=p.events.filter(e=>!lead.events.some(l=>e.tick<l.tick+Math.min(l.dur,360)&&e.tick+e.dur>l.tick));if(reduced.length)p.events=reduced;
  }
  p.events=tidyEvents(p.events,total,!['drums','chords','pad','harmony'].includes(p.id));
 });return clip;
}
function vocalHarmony(segments,root,steps,bpm,offset,duration){
 const secondsPerBar=240/bpm,bars=Math.max(1,Math.ceil((duration+offset)/secondsPerBar)),chords=[];let last=0;
 for(let b=0;b<bars;b++){const start=b*secondsPerBar-offset,end=start+secondsPerBar;let scored=[];
  for(let d=0;d<7;d++){const pcs=[0,2,4].map(n=>(root+steps[(d+n)%7])%12);let score=d===last?.08:0;segments.forEach(s=>{const weight=Math.max(0,Math.min(end,s.end)-Math.max(start,s.start));if(weight){const pc=s.midi%12;score+=weight*(pcs.includes(pc)?2:-.35);}});scored.push({degree:d,pcs,score});}
  scored.sort((a,b)=>b.score-a.score);const selected=scored[0];last=selected.degree;const rootNote=48+root+steps[last];chords.push({bar:b,degree:last,pcs:selected.pcs,notes:[0,2,4].map(n=>48+root+steps[(last+n)%7]+(last+n>=7?12:0)),bass:rootNote-12});
 }return chords;
}
function guidedVocalParts(segments,ids,root,steps,bpm,offset,duration,mode='follow',seed='vocal'){
 bpm=Number.isFinite(bpm)&&bpm>0?bpm:120;offset=Number.isFinite(offset)?Math.max(0,offset):0;duration=Number.isFinite(duration)?Math.max(0,duration):0;
 segments=(Array.isArray(segments)?segments:[]).filter(s=>Number.isFinite(s.start)&&Number.isFinite(s.end)&&Number.isFinite(s.midi)&&s.end>s.start).map(s=>({start:Math.max(0,s.start),end:Math.min(duration,s.end),midi:Math.max(0,Math.min(127,Math.round(s.midi)))})).filter(s=>s.end>s.start).sort((a,b)=>a.start-b.start||a.end-b.end);
 const harmony=vocalHarmony(segments,root,steps,bpm,offset,duration),bars=harmony.length,total=bars*1920,ts=bpm*8,rand=composeRandom(seed),out=[];
 const pitch=(n)=>{let best=-1000;for(let m=24;m<96;m++)if(steps.includes((m-root+120)%12)&&Math.abs(m-n)<Math.abs(best-n))best=m;return best;};
 const sounds=ids.filter(id=>!['drums','kick'].includes(id));
 sounds.forEach(id=>{let events=[];const poly=['chords','pad','harmony'].includes(id),low=id==='bass';
  if(poly||low||mode==='support'){
   harmony.forEach(h=>{const notes=low?[h.bass]:poly?h.notes:[h.notes[2]];const ticks=low?[0,960]:id==='chords'?[0,720,1440]:[0];ticks.forEach(t=>notes.forEach(m=>events.push({tick:h.bar*1920+t,dur:low?360:id==='chords'?300:1700,midi:m,vel:low?88:70})));});
  }else if(mode==='answer'){
   // Answer only in measured gaps. Never fall back to playing over the singer.
   let end=0;const gaps=[];segments.forEach(s=>{if(s.start-end>.24)gaps.push([end,s.start]);end=Math.max(end,s.end);});if(duration-end>.24)gaps.push([end,duration]);
   gaps.forEach(([a,b])=>{const source=segments.filter(s=>s.end<=a+.02).slice(-1)[0]||segments.find(s=>s.start>=b-.02),sourceMidi=source?.midi??(60+root),gap=b-a;for(let n=0;n<Math.min(4,Math.floor(gap/.16));n++){const st=a+.04+n*.16;if(st+.11>b-.02)break;events.push({tick:Math.round((st+offset)*ts),dur:Math.round(.11*ts),midi:pitch(sourceMidi-7+(n%2?2:0)),vel:82});}});
  }else{
   segments.forEach((s,i)=>{if(id==='arp'&&i%2)return;events.push({tick:Math.round((s.start+offset)*ts),dur:Math.max(1,Math.round((s.end-s.start)*ts*(id==='pluck'?.45:.82))),midi:pitch(s.midi-(id==='lead'?0:5)),vel:Math.round(82+rand()*13)});});
  }
  out.push({id,events:tidyEvents(events,total,!poly),part:{bars:[],rhythmLabel:'Vocal · '+mode}});
 });return {parts:out,harmony,bars};
}
if(typeof module!=='undefined')module.exports={composeRandom,tidyEvents,rhythmVariation,relateParts,vocalHarmony,guidedVocalParts};
