/* Original Halloween arrangements: layered bells, organ, choir, theremin and foley. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SzHalloweenMusic=api;})(globalThis,function(){'use strict';
 const scores=[
  {id:'m:202650',tempo:108,beats:3,bars:6,voice:'celesta',root:57,melody:[12,15,19,18,15,12,11,14,18,17,14,11,12,19,24,23,18,15],bass:[0,-5,-1,-7,0,-1],chords:[[0,3,7],[-5,-2,2],[-1,2,6],[-7,-4,0]],drums:'march',room:.24},
  {id:'m:202651',tempo:84,beats:4,bars:4,voice:'organ',root:50,melody:[12,19,15,18,24,23,18,15,11,18,14,17,23,22,17,14],bass:[0,-1,-5,-7],chords:[[0,3,6],[-1,2,5],[-5,-2,2],[-7,-4,-1]],drums:'ritual',room:.38},
  {id:'m:202652',tempo:68,beats:3,bars:4,voice:'bell',root:45,melody:[24,null,31,27,null,30,23,null,29,26,null,23],bass:[0,-5,-1,0],chords:[[0,3,7],[-5,-2,2],[-1,2,6],[0,3,6]],drums:'heart',room:.48},
  {id:'m:202653',tempo:138,beats:4,bars:8,voice:'harpsi',root:48,melody:[12,19,24,23,18,15,11,18,23,22,17,14,12,15,18,24,27,24,23,18,15,12,11,6,12,19,18,15,11,14,18,23],bass:[0,0,-1,-5,0,-7,-1,0],chords:[[0,3,7],[-1,2,6],[-5,-2,2],[-7,-4,-1]],drums:'rave',room:.2},
  {id:'m:202654',tempo:104,beats:4,bars:6,voice:'theremin',root:54,melody:[12,13,19,18,24,18,15,11,12,18,17,23,26,23,18,17,12,19,25,24,18,15,11,12],bass:[0,-6,-1,-5,0,-1],chords:[[0,3,6],[-6,-3,0],[-1,2,5],[-5,-2,1]],drums:'clock',room:.4}
 ];
 const get=id=>scores.find(s=>s.id===id),frequency=m=>440*Math.pow(2,(m-69)/12),length=id=>{const s=get(id);return s?s.bars*s.beats*60/s.tempo+3.4:0;};
 function play(ctx,id,volume=1){
  const s=get(id);if(!s||!ctx?.createOscillator)return null;const beat=60/s.tempo,start=ctx.currentTime+.07,duration=length(id),nodes=[],sources=[],master=ctx.createGain(),dry=ctx.createGain(),wet=ctx.createGain(),room=ctx.createConvolver(),delay=ctx.createDelay(2),echo=ctx.createGain(),compress=ctx.createDynamicsCompressor();let events=0,seed=202650+scores.indexOf(s),stopped=false;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const buffer=ctx.createBuffer(2,Math.ceil(ctx.sampleRate*2.2),ctx.sampleRate);for(let c=0;c<2;c++){const out=buffer.getChannelData(c);for(let i=0;i<out.length;i++)out[i]=(random()*2-1)*Math.pow(1-i/out.length,2.8)*.5;}room.buffer=buffer;
  master.gain.value=Math.max(0,Math.min(1,volume))*.52;dry.gain.value=.85;wet.gain.value=s.room;delay.delayTime.value=beat*.75;echo.gain.value=.15;compress.threshold.value=-15;compress.knee.value=18;compress.ratio.value=5;compress.attack.value=.004;compress.release.value=.18;
  dry.connect(master);wet.connect(master);room.connect(wet);dry.connect(room);dry.connect(delay);delay.connect(echo);echo.connect(master);master.connect(compress);compress.connect(ctx.destination);nodes.push(master,dry,wet,room,delay,echo,compress);
  function envelope(t,d,v,attack=.012){const gain=ctx.createGain();gain.gain.setValueAtTime(.00001,t);gain.gain.exponentialRampToValueAtTime(Math.max(.00002,v),t+attack);gain.gain.exponentialRampToValueAtTime(.00001,t+Math.max(attack+.02,d));gain.connect(dry);nodes.push(gain);return gain;}
  function osc(type,midi,t,d,v,attack=.012,detune=0){const o=ctx.createOscillator(),gain=envelope(t,d,v,attack);o.type=type;o.frequency.setValueAtTime(frequency(midi),t);o.detune.value=detune;o.connect(gain);o.start(t);o.stop(t+d+.05);sources.push(o);events++;return o;}
  function voice(kind,midi,t,d,v){
   if(kind==='bell'||kind==='celesta'){const ratios=kind==='bell'?[1,2.76,4.07]:[1,2,3.93];ratios.forEach((ratio,i)=>osc('sine',midi+12*Math.log2(ratio),t,d*(1-i*.17),v*[.7,.21,.09][i]));}
   else if(kind==='organ'||kind==='choir'){const choir=kind==='choir';osc(choir?'triangle':'sine',midi,t,d,v*.5,choir?.22:.035,-5);osc('sine',midi+12,t,d,v*.24,.04,6);osc('sine',midi-12,t,d,v*.17,.06);}
   else if(kind==='theremin'){const o=osc('sine',midi,t,d,v,.11),lfo=ctx.createOscillator(),depth=ctx.createGain();o.frequency.setValueAtTime(frequency(midi-2),t);o.frequency.exponentialRampToValueAtTime(frequency(midi),t+.15);lfo.frequency.value=5.7;depth.gain.value=frequency(midi)*.009;lfo.connect(depth);depth.connect(o.frequency);lfo.start(t);lfo.stop(t+d+.06);sources.push(lfo);nodes.push(depth);}
   else if(kind==='harpsi'){osc('sawtooth',midi,t,Math.min(.23,d),v*.29);osc('triangle',midi+12,t,Math.min(.18,d),v*.19);}
   else osc('triangle',midi,t,d,v,.025);
  }
  function noise(t,d,v,filter,frequency){const b=ctx.createBuffer(1,Math.max(1,Math.ceil(ctx.sampleRate*d)),ctx.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=random()*2-1;const source=ctx.createBufferSource(),tone=ctx.createBiquadFilter();source.buffer=b;tone.type=filter;tone.frequency.value=frequency;tone.Q.value=1.7;source.connect(tone);tone.connect(envelope(t,d,v,Math.min(.25,d*.45)));source.start(t);source.stop(t+d);sources.push(source);nodes.push(tone);events++;}
  function pulse(t,v){const o=osc('sine',43,t,.21,v,.005);o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(35,t+.18);}
  for(let bar=0;bar<s.bars;bar++){
   const at=start+bar*s.beats*beat,chord=s.chords[bar%s.chords.length],bass=s.bass[bar%s.bass.length];
   voice('bass',s.root+bass-12,at,beat*(s.beats-.2),.19);
   chord.forEach((n,i)=>voice(s.drums==='rave'?'organ':'choir',s.root+n,at+i*.025,beat*(s.beats-.25),s.drums==='rave'?.07:.047));
   for(let j=0;j<s.beats;j++){
    const n=s.melody[(bar*s.beats+j)%s.melody.length],t=at+j*beat;if(n!==null){voice(s.voice,s.root+n,t,beat*(s.voice==='bell'?2.6:.91),s.voice==='organ'?.16:.21);if(s.drums==='rave')voice('harpsi',s.root+n-12,t+beat*.5,beat*.35,.1);}
    if(s.drums==='march'){if(j===0)pulse(t,.22);else noise(t,.08,.06,'highpass',2200);}
    if(s.drums==='ritual'&&j%2===0){pulse(t,.18);pulse(t+.17,.1);}
    if(s.drums==='heart'&&j===0){pulse(t,.15);pulse(t+.24,.09);}
    if(s.drums==='rave'){pulse(t,.24);noise(t+beat*.5,.06,.08,'highpass',4200);if(j%2)noise(t,.12,.075,'bandpass',1300);}
    if(s.drums==='clock'){noise(t,.045,.09,'highpass',3300);if(j===2)voice('bell',s.root+36,t+beat*.5,beat*1.7,.1);}
   }
   if(bar%2===0)noise(at,beat*s.beats,.035,'bandpass',s.drums==='clock'?950:470);
  }
  const ending=start+s.bars*s.beats*beat;voice('bell',s.root+24,ending,2.3,.17);
  master.gain.setValueAtTime(master.gain.value,ending+.3);master.gain.exponentialRampToValueAtTime(.00001,ending+3.1);
  let cleanup=null;function stop(){if(stopped)return;stopped=true;clearTimeout(cleanup);for(const source of sources)try{source.stop();source.disconnect();}catch{}for(const n of nodes)try{n.disconnect();}catch{}}
  cleanup=setTimeout(stop,(duration+.2)*1000);
  return{id,duration,events,stop};
 }
 return{scores,get,length,play};
});
