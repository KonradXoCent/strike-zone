(function(root){'use strict';
 class Audio{
  constructor(){this.context=null;this.master=null;this.volume=.4;this.hunt=false;this.step=0;this.timer=null;this.ambientTimer=null;this.ambientOn=false;this.nextEmf=0;this.effectGain=1;this.pan=0;this.huntVoices=new Set();}
  start(){if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=this.volume;this.master.connect(this.context.destination);}if(this.context.state==='suspended')this.context.resume();}
  setVolume(n){this.volume=Math.max(0,Math.min(1,Number(n)||0));if(this.master)this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.1);}
  tone(f,seconds=.15,type='sine',gain=.1,delay=0){gain*=this.effectGain;if(!this.context||gain<=0)return;const a=this.context.currentTime+delay,o=this.context.createOscillator(),g=this.context.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(20,f),a);g.gain.setValueAtTime(.0001,a);g.gain.exponentialRampToValueAtTime(gain,a+.012);g.gain.exponentialRampToValueAtTime(.0001,a+seconds);o.connect(g);this.output(g);o.start(a);o.stop(a+seconds+.02);}
  noise(seconds=.2,gain=.08,frequency=600){gain*=this.effectGain;if(!this.context||gain<=0)return;const n=Math.ceil(this.context.sampleRate*seconds),b=this.context.createBuffer(1,n,this.context.sampleRate),data=b.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*(1-i/n);const source=this.context.createBufferSource(),filter=this.context.createBiquadFilter(),g=this.context.createGain();source.buffer=b;filter.type='lowpass';filter.frequency.value=frequency;g.gain.value=gain;source.connect(filter);filter.connect(g);this.output(g);source.start();}
  output(node){if(this.context.createStereoPanner&&Math.abs(this.pan)>.01){const p=this.context.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,this.pan));node.connect(p);p.connect(this.master);}else node.connect(this.master);}
  whisper(variant=0,language='pl',scale=1){if(!this.context||scale<.08)return;const words=(language==='en'?['I am here.','Do not turn around.','Can you hear me?','Stay with me.']:['Jestem tu.','Nie odwracaj się.','Słyszysz mnie?','Zostań ze mną.']);if(root.speechSynthesis&&root.SpeechSynthesisUtterance){const u=new SpeechSynthesisUtterance(words[variant%4]);u.lang=language==='en'?'en-US':'pl-PL';u.rate=.6;u.pitch=.45;u.volume=this.volume*.35*scale;speechSynthesis.speak(u);}}
  speak(text,language='pl'){if(!this.context||this.volume===0)return;if(root.speechSynthesis&&root.SpeechSynthesisUtterance){const u=new SpeechSynthesisUtterance(text),voices=speechSynthesis.getVoices();u.lang=language==='en'?'en-US':'pl-PL';u.voice=voices.find(v=>v.lang.toLowerCase().startsWith(language))||null;u.rate=.72;u.pitch=.62;u.volume=this.volume*.85;speechSynthesis.cancel();speechSynthesis.speak(u);}this.noise(.8,.08,1400);this.tone(105,.7,'sawtooth',.025);}
  effect(type,data={}){if(!this.context)return;const previous=this.effectGain,pan=this.pan;this.effectGain=Number.isFinite(data.volume)?Math.max(0,Math.min(1,data.volume)):1;this.pan=Number(data.pan)||0;try{
   if(type==='ghost-event'){if(data.kind==='whisper'){this.noise(1.9,.13,1200);this.tone(97,1.3,'sawtooth',.027);this.tone(730,.45,'triangle',.018,.2);}else if(data.kind==='knock'){for(let i=0;i<3;i++){this.tone(85+i*9,.12,'triangle',.13,i*.18);this.tone(150,.06,'sine',.05,i*.18);}}else if(data.kind==='footsteps'){for(let i=0;i<4;i++)this.tone(52,.13,'triangle',.11,i*.3);}else{this.noise(1.15,.12,450);this.tone(171,.7,'sawtooth',.03);}}
   else if(type==='motion-alarm'){this.tone(820,.11,'sine',.07);this.tone(1180,.11,'sine',.06,.14);}
   else if(type==='rem-pulse'){const level=Math.max(1,Math.min(5,data.level||1));this.tone(540+level*195,.08+level*.015,level>=4?'triangle':'sine',.02+level*.012);if(level===5)this.tone(1720,.05,'sine',.035,.12);}
   else if(type==='toycar-event'){this.noise(.65,.11,1700);this.tone(127,.4,'triangle',.04);this.tone(92,.25,'triangle',.035,.27);}
   else if(type==='curse-break'||type==='curse-hunt'){this.noise(1.1,.18,2500);this.tone(37,1.9,'sawtooth',.07);this.tone(81,1.8,'triangle',.035,.12);}
   else if(type==='curse-reveal'||type==='curse-begin'){this.noise(1.8,.055,850);this.tone(94,1.9,'sine',.045);this.tone(96.5,1.9,'sine',.04);}
   else if(type==='curse-answer'){this.noise(.4,.045,1900);this.tone(190,.2,'triangle',.025);}
   else if(type==='tarot'){this.noise(.35,.09,2700);this.tone(360,.5,'sine',.035,.1);}
   else if(type==='curse-goodbye'){this.noise(.2,.025,500);this.tone(170,.35,'sine',.03);}
   else if(type==='evidence'){[523.25,659.25,783.99].forEach((n,i)=>this.tone(n,.5,'sine',.10,i*.1));}
   else if(type==='door'||type==='closet'){this.noise(.35,.12,data.material==='metal'?1900:400);this.tone(data.material==='metal'?280:82,.32,'triangle',.06);this.tone(data.material==='metal'?510:140,.18,'sine',.035,.12);}
   else if(type==='radio'){this.noise(.65,.1,2800);this.tone(380,.07,'sine',.06);this.tone(430,.06,'sine',.04,.1);}
   else if(type==='voice'||type==='manifest'){this.noise(1.1,.10,850);this.tone(110,1,'sawtooth',.025);this.tone(117,1,'sine',.04);}
   else if(type==='power-cut'){this.noise(.16,.19,1200);this.tone(58,.55,'sawtooth',.08);this.tone(42,.6,'triangle',.08,.1);}
   else if(type==='crucifix'){this.noise(.7,.16,1800);[180,240,360].forEach((f,i)=>this.tone(f,.6,'triangle',.06,i*.035));}
   else if(type==='hunt-start'){this.noise(.8,.2,1400);[220,233,110].forEach((n,i)=>this.tone(n,1.1,'triangle',.08,i*.06));}
   else if(type==='death'){this.noise(.6,.2,550);this.tone(58,.9,'sawtooth',.07);}
   else if(type==='photo'){this.noise(.045,.22,3200);this.tone(900,.035,'square',.025);this.noise(.08,.07,950);}
   else if(type==='photo-bonus'||type==='bone'){[330,440,660].forEach((f,i)=>this.tone(f,.3,'sine',.06,i*.08));}
   else if(type==='bot-tip'){this.noise(.09,.025,2000);this.tone(590,.08,'sine',.035);}
   else if(type==='recording'){this.tone(740,.08,'sine',.08);this.noise(.5,.025,2200);}
   else if(type==='recorded'){this.noise(.8,.09,900);this.tone(175,.6,'sawtooth',.025);}
   else if(['place','pickup','gear','breaker','light'].includes(type)){this.noise(.1,.12,700);this.tone(190,.06,'triangle',.035);}
   else if(type==='complete'){[261.63,311.13,392,523.25].forEach((n,i)=>this.tone(n,.7,'triangle',.1,i*.15));}
   else if(type==='step')this.noise(.065,.04,280);
   }finally{this.effectGain=previous;this.pan=pan;}
  }
  sensor(level,rem=false){const now=performance.now();if(level<2||now<this.nextEmf||!this.context)return;this.nextEmf=now+(level===5?160:1050/level);this.tone((rem?540:650)+level*(rem?195:155),.075,level===5?'triangle':'sine',level===5?.065:.035);}
  ambient(on){if(this.ambientOn===on)return;this.ambientOn=on;clearInterval(this.ambientTimer);if(!on)return;let n=0;const tick=()=>{if(!this.context||this.hunt)return;this.noise(2.8,.018,240);this.tone(n%2?54:49,2.8,'sine',.016);if(n%3===1){this.tone(87,.7,'triangle',.018);this.noise(.35,.028,380);}if(n%5===3){this.noise(.13,.045,500);this.tone(135,.3,'triangle',.025);}n++;};tick();this.ambientTimer=setInterval(tick,3200);}
  huntDrone(f,seconds=3,gain=.04){
   if(!this.context||!this.hunt)return;const ctx=this.context,a=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain(),filter=ctx.createBiquadFilter();
   o.type='sawtooth';o.frequency.setValueAtTime(f,a);o.frequency.exponentialRampToValueAtTime(f*(1+Math.sin(this.step*2.3)*.13),a+seconds);o.detune.value=Math.sin(this.step*1.7)*27;
   filter.type='lowpass';filter.frequency.setValueAtTime(180+this.step%3*120,a);filter.frequency.linearRampToValueAtTime(700,a+seconds*.65);filter.Q.value=3;
   g.gain.setValueAtTime(.0001,a);g.gain.exponentialRampToValueAtTime(gain,a+seconds*.48);g.gain.exponentialRampToValueAtTime(.0001,a+seconds);
   o.connect(filter);filter.connect(g);g.connect(this.master);const voice={o,g};this.huntVoices.add(voice);o.onended=()=>{this.huntVoices.delete(voice);o.disconnect();filter.disconnect();g.disconnect();};o.start(a);o.stop(a+seconds+.05);
  }
  setHunt(on){
   if(on===this.hunt)return;this.hunt=on;clearInterval(this.timer);
   if(!on){if(this.context)for(const {o,g}of this.huntVoices){try{g.gain.cancelScheduledValues(this.context.currentTime);g.gain.setTargetAtTime(.0001,this.context.currentTime,.06);o.stop(this.context.currentTime+.3);}catch{}}return;}
   this.step=0;const pulse=()=>{
    if(!this.hunt||!this.context)return;
    // Overlapping, detuned bowed tones and a rising breath have no regular melody.
    this.huntDrone([38.9,41.2,36.7,43.1,39.4][this.step%5],3.8,.042);
    this.huntDrone([117.1,122.6,110.3,129.4][this.step%4],3.1,.018);
    if(this.step%3===1){this.noise(1.7,.04,780);this.tone(74,.7,'triangle',.028,.31);}
    if(this.step%4===2){this.tone(43,.19,'sine',.09,.08);this.tone(49,.11,'sine',.045,.31);this.noise(.3,.026,1400);}
    if(this.step%5===4)this.huntDrone(710+this.step%7*11,2.5,.006);
    this.step++;
   };pulse();this.timer=setInterval(pulse,1370);
  }
  stop(){this.setHunt(false);this.ambient(false);if(root.speechSynthesis)root.speechSynthesis.cancel();}
 }
 root.HauntAudio=Audio;
})(globalThis);
