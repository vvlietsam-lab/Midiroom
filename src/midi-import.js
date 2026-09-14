/* Offline Standard MIDI File reader. No dependencies, no uploads. */
(function(root){
'use strict';
const LIMITS={bytes:4*1024*1024,notes:20000,bars:32};
function fail(message){throw new Error(message);}
function readMidiFile(input){
 const b=input instanceof Uint8Array?input:new Uint8Array(input);if(b.length>LIMITS.bytes)fail('MIDI is groter dan 4 MB.');if(b.length<14)fail('Dit bestand is geen volledige MIDI.');let p=0;
 const u8=()=>{if(p>=b.length)fail('MIDI is onverwacht afgebroken.');return b[p++];},u16=()=>u8()*256+u8(),u32=()=>u8()*0x1000000+u8()*0x10000+u8()*256+u8(),tag=()=>String.fromCharCode(u8(),u8(),u8(),u8());
 if(tag()!=='MThd')fail('Geen geldig MIDI-bestand.');const hlen=u32();if(hlen<6||p+hlen>b.length)fail('Ongeldige MIDI-header.');const format=u16(),trackCount=u16(),division=u16();p+=hlen-6;
 if(format>1)fail('MIDI type 2 wordt niet ondersteund.');if((format===0&&trackCount!==1)||!trackCount||trackCount>256)fail('Ongeldig aantal MIDI-tracks.');if(division&0x8000)fail('SMPTE-timing wordt niet ondersteund; exporteer met PPQ.');if(!division)fail('MIDI heeft geen geldige PPQ-resolutie.');
 const tempos=[],warnings=[],out=[];let totalNotes=0,maxSourceTick=0;
 for(let ti=0;ti<trackCount;ti++){
  if(p+8>b.length||tag()!=='MTrk')fail('MIDI-track ontbreekt of is beschadigd.');const len=u32(),end=p+len;if(end>b.length)fail('MIDI-track is onverwacht afgebroken.');let tick=0,running=0,name='Track '+(ti+1);const active=new Map(),held=new Map(),sustain=Array(16).fill(false),channels=new Map();
  const vlq=()=>{let v=0;for(let i=0;i<4;i++){const x=u8();v=v*128+(x&127);if(!(x&128))return v;}fail('Ongeldige MIDI delta-tijd.');};
  const bucket=ch=>{if(!channels.has(ch))channels.set(ch,[]);return channels.get(ch);};
  const close=(ch,n,at)=>{const key=ch+':'+n,stack=active.get(key);if(!stack?.length)return;const hit=stack.shift();if(!stack.length)active.delete(key);if(sustain[ch]){if(!held.has(ch))held.set(ch,[]);held.get(ch).push(hit);}else add(hit,at);};
  const add=(hit,at)=>{if(totalNotes>=LIMITS.notes)fail('MIDI bevat meer dan 20.000 noten.');bucket(hit.ch).push({tick:hit.tick,dur:Math.max(1,at-hit.tick),midi:hit.note,vel:hit.vel});totalNotes++;};
  while(p<end){tick+=vlq();maxSourceTick=Math.max(maxSourceTick,tick);if(p>=end)fail('MIDI-event is afgebroken.');let status=b[p];if(status<0x80){if(!running)fail('Ongeldige running status in MIDI.');status=running;}else{p++;if(status<0xf0)running=status;else running=0;}
   if(status===0xff){const type=u8(),n=vlq();if(p+n>end)fail('MIDI meta-event is afgebroken.');if(type===0x03){name=new TextDecoder().decode(b.slice(p,p+n)).replace(/[\x00-\x1f]/g,' ').trim().slice(0,80)||name;}else if(type===0x51&&n===3){const us=b[p]*65536+b[p+1]*256+b[p+2];if(us)tempos.push({tick,us,bpm:60000000/us});}p+=n;continue;}
   if(status===0xf0||status===0xf7){const n=vlq();if(p+n>end)fail('MIDI SysEx-event is afgebroken.');p+=n;continue;}if(status>=0xf0)fail('Niet-ondersteund MIDI systeemevent.');
   const kind=status>>4,ch=status&15,a=u8(),two=!([0xc,0xd].includes(kind)),v=two?u8():0;
   if(a>127||v>127)fail('Ongeldige MIDI eventdata.');
   if(kind===9&&v){const key=ch+':'+a;if(!active.has(key))active.set(key,[]);active.get(key).push({ch,note:a,vel:v,tick});}
   else if(kind===8||kind===9)close(ch,a,tick);
   else if(kind===11&&a===64){const on=v>=64;if(sustain[ch]&&!on){(held.get(ch)||[]).forEach(hit=>add(hit,tick));held.delete(ch);}sustain[ch]=on;}
  }
  if(p!==end)fail('Ongeldige MIDI-tracklengte.');active.forEach(stack=>stack.forEach(hit=>add(hit,tick)));held.forEach(stack=>stack.forEach(hit=>add(hit,tick)));
  channels.forEach((events,ch)=>{events.sort((a,b)=>a.tick-b.tick||a.midi-b.midi);out.push({index:out.length,sourceTrack:ti,channel:ch,name:(name+(channels.size>1?' · Ch '+(ch+1):'')).slice(0,90),events});});
 }
 if(p!==b.length)warnings.push('Data na de laatste MIDI-track is genegeerd.');if(!out.length)fail('Deze MIDI bevat geen noten.');
 const scale=480/division;out.forEach(t=>t.events=t.events.map(e=>({tick:Math.round(e.tick*scale),dur:Math.max(1,Math.round(e.dur*scale)),midi:e.midi,vel:e.vel})));
 const maxTick=Math.max(1,...out.flatMap(t=>t.events.map(e=>e.tick+e.dur))),bars=Math.ceil(maxTick/1920);if(bars>LIMITS.bars)fail('MIDI is langer dan 32 maten. Kort hem eerst in je DAW in.');
 tempos.sort((a,b)=>a.tick-b.tick);const bpm=tempos.length?Math.round(Math.max(40,Math.min(300,tempos[0].bpm))):120;if(tempos.some(t=>Math.abs(t.bpm-tempos[0].bpm)>.01))warnings.push('Tempowisselingen gevonden. De timing wordt als PPQ-groove gelezen; afspelen volgt je MIDIROOM-sessie.');
 return {format,ppq:division,bpm,bars,tracks:out,tempos,warnings,notes:totalNotes};
}
const api={readMidiFile,MIDI_IMPORT_LIMITS:LIMITS};if(typeof module!=='undefined')module.exports=api;Object.assign(root,api);
})(typeof globalThis!=='undefined'?globalThis:this);
