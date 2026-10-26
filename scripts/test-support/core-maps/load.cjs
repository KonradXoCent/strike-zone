const fs=require('fs'),{JSDOM,VirtualConsole}=require('jsdom');
const {createCanvas,Path2D,DOMMatrix}=require('@napi-rs/canvas');
function load(file){
 const html=file?fs.readFileSync(file,'utf8'):require('../../prepare-preview.cjs').makePreview();const errors=[];
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type==='unhandled exception'){errors.push(e.message);console.error('PAGE ERROR:',e.message);}});vc.on('error',(...args)=>{errors.push(args.map(String).join(' '));console.error('GAME ERROR:',...args.map(x=>typeof x==='string'?x:x.message));});
 const dom=new JSDOM(html,{url:'https://sz2d-test.invalid/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.Path2D=Path2D;w.DOMMatrix=DOMMatrix;w.OffscreenCanvas=global.OffscreenCanvas;w.fetch=async()=>{throw Error('External network disabled in tests');};w.WebSocket=class{static CONNECTING=0;static OPEN=1;static CLOSED=3;constructor(){this.readyState=3;}addEventListener(){}removeEventListener(){}send(){}close(){}};
  w.structuredClone=structuredClone;w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};w.BroadcastChannel=class{postMessage(){}close(){}};
  w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;
  const canvases=new WeakMap(),contexts=new WeakMap();function native(c){let n=canvases.get(c);if(!n){n=createCanvas(c.width||300,c.height||150);canvases.set(c,n);}if(n.width!==c.width)n.width=Math.max(1,c.width);if(n.height!==c.height)n.height=Math.max(1,c.height);return n;}
  const cp=w.HTMLCanvasElement.prototype;
  cp.getContext=function(type){if(type!=='2d')return null;if(contexts.has(this))return contexts.get(this);const c=this,n=native(c),q=n.getContext('2d'),proxy=new Proxy(q,{get(target,key){const value=target[key];if(typeof value!=='function')return value;return(...args)=>{native(c);if(['drawImage','createPattern'].includes(key)&&args[0]instanceof w.HTMLCanvasElement)args[0]=native(args[0]);if(key==='drawImage'&&args[0]instanceof w.HTMLImageElement)return;return value.apply(target,args);};},set(target,key,value){target[key]=value;return true;}});contexts.set(c,proxy);return proxy;};
  cp.toDataURL=function(){return native(this).toDataURL('image/png');};cp.requestPointerLock=function(){return Promise.resolve();};w.document.exitPointerLock=()=>{};
  Object.defineProperty(w,'innerWidth',{value:1280});Object.defineProperty(w,'innerHeight',{value:720});
  Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return this.id==='game'?1280:this.width||900;}});Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return this.id==='game'?720:this.height||640;}});
  w.HTMLElement.prototype.getBoundingClientRect=function(){return{x:0,y:0,left:0,top:0,right:1280,bottom:720,width:1280,height:720};};
 }});
 return{dom,w:dom.window,errors};
}
module.exports={load};
