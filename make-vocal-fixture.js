/* Generates a synthetic sung phrase so the vocal tests run without an external file. */
const S=require('../src/stem-engine.js'),fs=require('fs'),path=require('path');
const SR=44100,SEC=6,N=SR*SEC,out=new Float32Array(N);
const notes=[[0,1.1,220],[1.4,1.0,261.63],[2.6,1.2,196],[4.1,1.4,246.94]];
for(const [start,dur,hz] of notes){
 const a=Math.floor(start*SR),n=Math.floor(dur*SR);
 for(let i=0;i<n&&a+i<N;i++){
  const t=i/SR;
  const vib=1+0.006*Math.sin(2*Math.PI*5.2*t);            // vibrato
  const env=Math.min(1,t/0.08)*Math.min(1,(dur-t)/0.12);   // soft edges
  let v=0;
  for(let h=1;h<=6;h++) v+=Math.sin(2*Math.PI*hz*vib*h*t)/(h*h);  // voiced harmonics
  out[a+i]+=v*env*0.3;
 }
}
const file=path.resolve(__dirname,'../test/fixtures/vocal-phrase.wav');
fs.mkdirSync(path.dirname(file),{recursive:true});
fs.writeFileSync(file,Buffer.from(S.encodeWav(out,null,SR)));
console.log('geschreven: '+file+' ('+(fs.statSync(file).size/1024).toFixed(0)+' kB)');
