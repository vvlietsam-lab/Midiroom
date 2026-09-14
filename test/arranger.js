const assert=require('assert');
const {proposeArrangement,applyTransitions,estimatedNotes}=require('../src/arranger.js');
const ids=['drums','kick','bass','chords','lead'];
for(const kind of ['club','sketch','extended']){
  const s=proposeArrangement(kind,ids);assert(s.length>=3);assert(s.every(x=>x.bars>=1&&x.parts.length&&x.parts.every(id=>ids.includes(id))));assert(s.reduce((n,x)=>n+x.bars,0)<=256);
}
const event=(tick,midi=36)=>({tick,dur:240,midi,vel:100});
const source={meta:{bars:1},parts:[{id:'kick',events:[event(0)]},{id:'bass',events:[event(0,40),event(1700,41)]}]};
const arranged={meta:{bars:2},parts:[{id:'kick',events:[event(0),event(1920)]},{id:'bass',events:[event(0,40),event(1700,41),event(1920,40),event(3620,41)]}]};
const sections=[{bars:1,gain:1,parts:['kick','bass'],transition:'breath'},{bars:1,gain:.8,parts:['kick','bass'],transition:'roll'}];
const before=JSON.stringify(arranged),out=applyTransitions(arranged,source,sections,{});assert.strictEqual(JSON.stringify(arranged),before);assert(!out.parts.find(p=>p.id==='bass').events.some(e=>e.tick>=1440&&e.tick<1920));assert.strictEqual(out.parts.find(p=>p.id==='kick').events.filter(e=>e.tick>=3360).length,4);assert(out.parts.flatMap(p=>p.events).every(e=>e.tick>=0&&e.tick<3840&&e.dur>0&&e.tick+e.dur<=3840&&e.vel>=1&&e.vel<=127));
const locked=applyTransitions(arranged,source,sections,{bass:true,kick:true});assert.deepStrictEqual(locked.parts,arranged.parts);
assert.strictEqual(estimatedNotes(source,sections),6);const huge=JSON.parse(JSON.stringify(arranged));huge.parts[0].events=Array(50001).fill(event(0));assert.throws(()=>applyTransitions(huge,source,sections,{}),/50.000/);
console.log('ARRANGER PASS · presets · breath · roll · locks · bounds · immutability');
