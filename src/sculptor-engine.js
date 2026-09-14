(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else Object.assign(root,api);})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const BAR=1920,DRUMS=new Set(['kick','clap','hats','drums']);
function copy(x){return JSON.parse(JSON.stringify(x));}
function hash(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function random(seed){let a=hash(seed);return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function scalePitch(midi,step,clip){const root=Number(clip.meta&&clip.meta.root)||0,steps=clip.meta&&clip.meta.scale&&clip.meta.scale.steps||[0,2,3,5,7,8,10],pool=[];for(let m=0;m<128;m++)if(steps.includes((m-root+1200)%12))pool.push(m);let i=pool.reduce((best,p,j)=>Math.abs(p-midi)<Math.abs(pool[best]-midi)?j:best,0);return pool[clamp(i+step,0,pool.length-1)];}
function groups(events){const map=new Map();events.forEach(e=>{if(!map.has(e.tick))map.set(e.tick,[]);map.get(e.tick).push(e);});return [...map.values()].sort((a,b)=>a[0].tick-b[0].tick);}
function changeGroup(group,action,index,total,clip,part,rng,start,end){
  if(action==='space'){
    const phase=Math.floor(rng()*3),shape=.48+rng()*.34;
    if(total>2&&index%3===phase)return [];
    return group.map(e=>({...e,dur:Math.max(1,Math.min(end-e.tick,e.dur,Math.round(e.dur*(index%2?shape:Math.min(.9,shape+.16))))),vel:clamp(e.vel+(index%4===phase?5:-3),1,127)}));
  }
  if(action==='tension'){
    const late=index>=Math.max(1,Math.floor(total*(.45+rng()*.2))),accent=rng()>.5?2:1,lift=late?(index%3===1?accent:1):(index%4===3?1:0);
    return group.map(e=>({...e,midi:DRUMS.has(part.id)?e.midi:scalePitch(e.midi,lift,clip),dur:Math.max(1,Math.min(e.dur,end-e.tick,Math.round(e.dur*(late?.62+rng()*.18:.84+rng()*.12)))),vel:clamp(e.vel+(late?5+Math.floor(rng()*5):1+Math.floor(rng()*3)),1,127)}));
  }
  if(action==='answer'){
    const delay=index%2?[60,120,180][Math.floor(rng()*3)]:0,dir=(index+Math.floor(rng()*3))%4<2?-1:1;
    return group.map(e=>{const tick=Math.min(e.tick+delay,end-1),dur=Math.max(1,Math.min(e.dur,Math.round(e.dur*(index%2?.52+rng()*.2:.76+rng()*.16)),end-tick));return {...e,tick,dur,midi:DRUMS.has(part.id)?e.midi:scalePitch(e.midi,dir,clip),vel:clamp(e.vel+(index%2?-3-Math.floor(rng()*4):3+Math.floor(rng()*3)),1,127)};});
  }
  // Broken rhythm keeps every new onset inside the original note span, so existing silent gaps survive.
  return group.flatMap(e=>{const room=Math.min(e.dur,end-e.tick),canSplit=room>=180&&rng()>.18;if(!canSplit)return [{...e,dur:Math.max(30,Math.round(room*.68)),vel:clamp(e.vel+3,1,127)}];const offset=Math.max(60,Math.min(room-45,Math.round(room*(index%2?.58:.42)/30)*30));return [{...e,dur:Math.max(30,Math.min(offset-20,Math.round(room*.4))),vel:clamp(e.vel+7,1,127)},{...e,tick:e.tick+offset,dur:Math.max(30,Math.min(Math.round(room*.28),end-e.tick-offset)),vel:clamp(e.vel-8,1,127)}];});
}
function sculptPhrase(source,options){
  const clip=copy(source),o=options||{},partId=String(o.partId||''),action=['space','tension','answer','broken'].includes(o.action)?o.action:'space',bars=Math.max(1,Number(clip.meta&&clip.meta.bars)||1),startBar=clamp(Math.floor(Number(o.startBar)||1),1,bars),endBar=clamp(Math.floor(Number(o.endBar)||startBar),startBar,bars),start=(startBar-1)*BAR,end=endBar*BAR;
  if(!partId||o.locks&&o.locks[partId])return clip;
  const part=clip.parts&&clip.parts.find(p=>p.id===partId);if(!part||!Array.isArray(part.events))return clip;
  const contained=part.events.filter(e=>e.tick>=start&&e.tick+e.dur<=end),untouched=part.events.filter(e=>!(e.tick>=start&&e.tick+e.dur<=end));if(!contained.length)return clip;
  const onsetGroups=groups(contained),rng=random(String(o.seed||0)+':'+action+':'+partId+':'+startBar+':'+endBar),changed=onsetGroups.flatMap((g,i)=>changeGroup(g,action,i,onsetGroups.length,clip,part,rng,start,end));
  const normalized=changed.filter(e=>Number.isFinite(e.tick)&&Number.isFinite(e.dur)&&e.dur>0&&e.tick>=start&&e.tick+e.dur<=end).map(e=>({...e,tick:Math.round(e.tick),dur:Math.max(1,Math.round(e.dur)),midi:clamp(Math.round(e.midi),0,127),vel:clamp(Math.round(e.vel),1,127)}));
  part.events=untouched.concat(normalized).sort((a,b)=>a.tick-b.tick||a.midi-b.midi);
  const count=clip.parts.reduce((n,p)=>n+p.events.length,0);if(count>50000)throw new Error('Deze sculptuur zou meer dan 50.000 noten maken. Kies een kleiner bereik.');
  clip.customEdit=true;clip.vocalTiming=false;delete clip.vocalSourceSerial;clip.meta=clip.meta||{};clip.meta.sculpt={partId,action,startBar,endBar,seed:String(o.seed||0)};return clip;
}
return {sculptPhrase};
});
