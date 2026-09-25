'use strict';
const assert=require('node:assert/strict');
const C=require('../src/core');
let checks=0;
function check(value,label){assert.ok(value,label);checks++;}
function params(extra={}){return {seed:'MIDIROOM-REGRESSION',root:7,octave:5,scale:'aeolian',progression:'pedal',bars:8,chordSize:3,bpm:174,parts:['drums','bass'],partOpts:{},tries:8,humanize:false,...extra};}
function generate(id,style,opts={},extra={}){return C.generateSection(params({parts:[id],partOpts:{[id]:{style,opts}},...extra})).parts[0];}
// Musical invariants distinguish real genre behaviour from renamed presets.
const dub=generate('drums','dubstep',{fills:false});
check(dub.events.filter(e=>e.midi===38).every(e=>e.tick%(C.TPQ*4)===C.TPQ*2),'dubstep backbeat must be on beat 3');
const dnb=generate('drums','dnb',{fills:false});
check(dnb.events.filter(e=>e.midi===38).every(e=>[480,1440].includes(e.tick%1920)),'DnB snare must be on beats 2 and 4');
check(dnb.events.filter(e=>e.midi===36).some(e=>e.tick%1920===1200),'DnB must have syncopated kick');
check(JSON.stringify(dub.events)!==JSON.stringify(dnb.events),'Dubstep and DnB must differ');
const liquid=generate('drums','liquid',{fills:false});
check(liquid.events.some(e=>e.midi===38&&e.vel<60),'liquid must have soft ghost notes');
const tri=generate('screech','tripletburst',{density:'dicht',phrase:'fixed',motion:'root',octaveAccent:false});
check(tri.events.some(e=>e.tick===160)&&tri.events.some(e=>e.tick===320),'true triplets need 160-tick spacing');
const machine=generate('screech','machine',{density:'dicht',phrase:'fixed'});
check(machine.events.some(e=>e.tick===60),'machine stutter needs 32nd notes');
const modern=C.STYLES.screech.filter(s=>s.modern);
let runs=0,noteCount=0;
for(const style of modern){
 const signatures=new Set();
 for(let seed=0;seed<30;seed++){
  const p=generate('screech',style.id,{density:['sober','normaal','dicht'][seed%3],phrase:['fixed','call-response','evolving'][seed%3],motion:['root','tonal','rising','falling'][seed%4],octaveAccent:true},{seed:'S'+seed,root:seed%12,scale:Object.keys(C.SCALES)[seed%7],timingHumanize:seed%2===1,swing:.4});
  runs++;noteCount+=p.events.length;signatures.add(JSON.stringify(p.events));
  p.events.forEach((e,i)=>{check([e.tick,e.dur,e.midi,e.vel].every(Number.isInteger),'integer MIDI events');check(e.tick>=0&&e.tick+e.dur<=8*1920,'no notes outside clip');if(i)check(p.events[i-1].tick+p.events[i-1].dur<=e.tick,'screech is monophonic');});
 }
 check(signatures.size>=20,style.id+' needs diversity across settings');
}
for(const genre of C.GENRES.filter(g=>!g.free)){
 for(const energy of C.ENERGY){
  const parts=genre.energy[energy];
  const opts=Object.fromEntries(parts.map(id=>[id,genre.parts[id]||{}]));
  const cfg=params({seed:'GENRE-'+genre.id,parts,partOpts:opts,root:8,bpm:genre.bpm,scale:genre.scale,progression:genre.progressions[0],chordSize:genre.chordSize,chordBars:genre.chordBars});
  const sec=C.generateSection(cfg);runs++;
  check(sec.parts.length===parts.length,genre.id+' enabled tracks');
  check(sec.parts.every(p=>p.events.length>0),genre.id+' populated tracks');
  check(JSON.stringify(sec)===JSON.stringify(C.generateSection(cfg)),genre.id+' deterministic');
  for(const structure of C.STRUCTURES){const arr=C.generateArrangement(cfg,structure.id,genre);runs++;check(arr.parts.every(p=>parts.includes(p.id)),genre.id+' respects selected instruments');check(arr.parts.some(p=>p.events.length),'arrangement not empty');}
 }
}
const chord=generate('chords','whole',{}, {chordSize:2,root:0,scale:'aeolian'});
const pcs=[...new Set(chord.events.filter(e=>e.tick===0).map(e=>e.midi%12))].sort((a,b)=>a-b);
check(JSON.stringify(pcs)==='[0,7]','Kwint is root and fifth, never third');
// Parse actual SMF bytes independently: events, channels, tempo, and padded EOT.
function parseMidi(bytes){
 const b=Buffer.from(bytes);check(b.toString('ascii',0,4)==='MThd','SMF header');const tracks=[];let pos=14;
 while(pos<b.length){check(b.toString('ascii',pos,pos+4)==='MTrk','track chunk');let end=pos+8+b.readUInt32BE(pos+4);pos+=8;let tick=0,events=[],tempo=null;
 const vlq=()=>{let n=0,v;do{v=b[pos++];n=(n<<7)|(v&127);}while(v&128);return n;};
 while(pos<end){tick+=vlq();const status=b[pos++];if(status===255){const type=b[pos++],len=vlq();if(type===81)tempo=b.readUIntBE(pos,3);pos+=len;}else{check(status>=128&&status<160,'explicit note status');events.push({tick,status,note:b[pos++],velocity:b[pos++]});}}
 tracks.push({tick,events,tempo});check(pos===end,'valid chunk bounds');
 }return tracks;
}
const exported=C.buildMidi([{id:'drums',name:'Drums',events:dnb.events},{id:'bass',name:'Bass',events:generate('bass','dnb').events}],174,8*1920);
const parsed=parseMidi(exported);
check(parsed.length===3,'tempo plus 2 MIDI tracks');check(parsed.every(t=>t.tick===15360),'all tracks pad to 8-bar end');check(parsed[0].tempo===Math.round(60000000/174),'correct tempo');check(parsed[1].events.every(e=>(e.status&15)===9),'GM drum channel 10');check(parsed[2].events.every(e=>(e.status&15)!==9),'melodic track avoids drum channel');
console.log(JSON.stringify({status:'PASS',checks,generationRuns:runs,screechNotes:noteCount,screechStyles:modern.length,genres:C.GENRES.length-1},null,2));
