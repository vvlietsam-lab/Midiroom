/* Pure, offline vocal analysis. Monophonic input; estimates, not transcription guarantees. */
function analyseVocal(samples, sampleRate=8000) {
  const frame=1024,hop=160,minLag=Math.floor(sampleRate/650),maxLag=Math.ceil(sampleRate/65);
  const frames=[];let peak=0;for(let i=0;i<samples.length;i++)peak=Math.max(peak,Math.abs(samples[i]));
  if(peak<.003)return {segments:[],keys:[],voicedSeconds:0,duration:samples.length/sampleRate};
  for(let at=0;at+frame<samples.length;at+=hop){
    let mean=0,energy=0;for(let i=0;i<frame;i++)mean+=samples[at+i];mean/=frame;
    for(let i=0;i<frame;i++)energy+=(samples[at+i]-mean)**2;
    const rms=Math.sqrt(energy/frame);let midi=null,quality=0;
    if(rms>Math.max(.003,peak*.025)){
      const d=new Float64Array(maxLag+1);let sum=0;
      for(let lag=1;lag<=maxLag;lag++){
        let diff=0;for(let i=0;i<frame-maxLag;i++){const v=samples[at+i]-samples[at+i+lag];diff+=v*v;}
        sum+=diff;d[lag]=sum>0?diff*lag/sum:1;
      }
      let lag=0;
      for(let k=minLag;k<maxLag;k++)if(d[k]<.18&&d[k]<=d[k-1]&&d[k]<=d[k+1]){lag=k;break;}
      if(lag){const left=d[lag-1],right=d[lag+1],den=left-2*d[lag]+right;const refined=lag+(den?Math.max(-.5,Math.min(.5,(left-right)/(2*den))):0);midi=69+12*Math.log2(sampleRate/refined/440);quality=1-d[lag];}
    }
    frames.push({t:(at+frame/2)/sampleRate,midi,rms,quality});
  }
  // Median removes isolated octave/pitch spikes while preserving phrase onsets.
  const sm=frames.map((f,i)=>{const values=frames.slice(Math.max(0,i-2),i+3).filter(x=>x.midi!==null).map(x=>x.midi).sort((a,b)=>a-b);return {...f,n:f.midi===null||values.length<3?null:Math.round(values[Math.floor(values.length/2)])};});
  const segments=[];let run=null;
  for(let i=0;i<sm.length;i++){
    const f=sm[i],stable=f.n!==null&&sm.slice(i,i+3).filter(x=>x.n===f.n).length>=2;
    if(f.n===null){if(run){run.end=f.t; if(run.end-run.start>=.075)segments.push(run);run=null;}continue;}
    const onset=run&&f.t-run.start>.14&&f.rms>sm[Math.max(0,i-2)].rms*1.8;
    if(!run||((f.n!==run.midi||onset)&&stable)){
      if(run){run.end=f.t;if(run.end-run.start>=.075)segments.push(run);}
      run={start:Math.max(0,f.t-.04),end:f.t+.02,midi:f.n,quality:f.quality};
    }else if(run)run.end=f.t+.02;
  }
  if(run&&run.end-run.start>=.075)segments.push(run);
  // Trim overlap created by onset compensation.
  segments.forEach((s,i)=>{if(segments[i+1])s.end=Math.min(s.end,segments[i+1].start);});
  const histogram=Array(12).fill(0);segments.forEach(s=>histogram[((s.midi%12)+12)%12]+=Math.max(0,s.end-s.start)*s.quality);
  const profiles={ionian:[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88],aeolian:[6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17]};
  const correlation=(a,b)=>{const ma=a.reduce((x,y)=>x+y)/12,mb=b.reduce((x,y)=>x+y)/12;let n=0,aa=0,bb=0;for(let i=0;i<12;i++){const x=a[i]-ma,y=b[i]-mb;n+=x*y;aa+=x*x;bb+=y*y;}return n/Math.sqrt(aa*bb||1);};
  const keys=[];for(const [scale,profile] of Object.entries(profiles))for(let root=0;root<12;root++)keys.push({root,scale,score:correlation(histogram,Array.from({length:12},(_,i)=>profile[(i-root+12)%12]))});
  keys.sort((a,b)=>b.score-a.score);
  const voicedSeconds=segments.reduce((n,s)=>n+s.end-s.start,0),unique=histogram.filter(x=>x>.08).length;
  return {segments,keys:keys.slice(0,3),voicedSeconds,duration:samples.length/sampleRate,unique,certainty:voicedSeconds<2||unique<4?'laag':keys[0].score-keys[1].score>.12?'redelijk':'twijfel'};
}
function vocalMelodyEvents(segments,root,scaleSteps,bpm,offset=0,mode='follow'){
  const scale=[];for(let m=36;m<=96;m++)if(scaleSteps.includes(((m-root)%12+12)%12))scale.push(m);
  const nearest=n=>scale.reduce((best,v)=>Math.abs(v-n)<Math.abs(best-n)?v:best,scale[0]);
  const output=[];
  segments.forEach((s,i)=>{
    if(mode==='space'&&i%2)return;
    const start=s.start+offset,end=s.end+offset;if(end<=0)return;
    const pitch=nearest(s.midi-4),tick=Math.max(0,Math.round(start*bpm*480/60)),dur=Math.max(1,Math.round((end-Math.max(0,start))*bpm*480/60*.85));
    output.push({tick,dur,midi:pitch,vel:90});
  });
  output.sort((a,b)=>a.tick-b.tick);output.forEach((e,i)=>{if(output[i+1])e.dur=Math.min(e.dur,Math.max(1,output[i+1].tick-e.tick));});
  return output.filter((e,i)=>!i||e.tick!==output[i-1].tick);
}
if(typeof module!=='undefined')module.exports={analyseVocal,vocalMelodyEvents};
