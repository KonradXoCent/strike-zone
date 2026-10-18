/* Editor view only. Zoom and pan never become part of a published skin. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.SzSkinView=api;api.mount(root);}})(globalThis,function(){
 'use strict';
 const MIN=.5,MAX=4,clamp=n=>Math.max(MIN,Math.min(MAX,Number(n)||1));
 function transform(base,width,height,view){const zoom=clamp(view.zoom);return{scale:base.scale*zoom,x:width/2+(base.x-width/2)*zoom+view.x,y:height/2+(base.y-height/2)*zoom+view.y};}
 function zoomAt(view,next,anchor,width,height){next=clamp(next);const ratio=next/clamp(view.zoom);return{...view,zoom:next,x:anchor.x-width/2-(anchor.x-width/2-view.x)*ratio,y:anchor.y-height/2-(anchor.y-height/2-view.y)*ratio};}
 function mount(root){
  const views=new WeakMap(),t=s=>root.szLocale?.t(s)||s;let refreshLanguage=null;
  document.addEventListener('sz-language',()=>refreshLanguage?.());
  function view(){const state=creatorState();if(!views.has(state))views.set(state,{zoom:1,x:0,y:0,panMode:false});return views.get(state);}
  const original={transform:creatorSkinTransform,bind:creatorBindSkin};
  creatorSkinTransform=function(){const c=$('creator-skin');return transform(original.transform(),c.width,c.height,view());};
  function update(){const c=$('creator-skin');if(!c)return;const v=view(),bar=c.closest('.cr-skin-stage').querySelector('[data-skin-view]');
   if(bar){bar.querySelector('output').value=Math.round(v.zoom*100)+'%';bar.querySelector('[data-skin-zoom="out"]').disabled=v.zoom<=MIN;bar.querySelector('[data-skin-zoom="in"]').disabled=v.zoom>=MAX;const pan=bar.querySelector('[data-skin-pan]');pan.setAttribute('aria-pressed',String(v.panMode));c.classList.toggle('sz-skin-pan',v.panMode);}
   creatorDrawSkin();
  }
  function setZoom(value,anchor){const c=$('creator-skin');if(!c)return;Object.assign(view(),zoomAt(view(),value,anchor||{x:c.width/2,y:c.height/2},c.width,c.height));update();}
  function reset(){Object.assign(view(),{zoom:1,x:0,y:0});update();}
  creatorBindSkin=function(){original.bind();const c=$('creator-skin'),stage=c.closest('.cr-skin-stage');c.tabIndex=0;let pan=null,space=false,paintPointer=null;
   const bar=document.createElement('div');bar.className='sz-skin-view';bar.dataset.skinView='';bar.dataset.noTranslate='';
   function labels(){bar.innerHTML='<span>'+t('Widok')+'</span><button type="button" data-skin-zoom="out" aria-label="'+t('Oddal widok')+'">−</button><output aria-live="polite">100%</output><button type="button" data-skin-zoom="in" aria-label="'+t('Przybliż widok')+'">+</button><button type="button" data-skin-reset>'+t('Reset widoku')+'</button><button type="button" data-skin-pan aria-pressed="false">'+t('Przesuwanie')+'</button>';
    bar.querySelector('[data-skin-zoom="out"]').onclick=()=>setZoom(view().zoom/1.25);bar.querySelector('[data-skin-zoom="in"]').onclick=()=>setZoom(view().zoom*1.25);bar.querySelector('[data-skin-reset]').onclick=reset;bar.querySelector('[data-skin-pan]').onclick=()=>{view().panMode=!view().panMode;update();};update();
   }
   stage.prepend(bar);const help=document.createElement('p');help.className='sz-skin-view-help';help.dataset.noTranslate='';stage.append(help);
   const local=e=>{const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height};};
   c.addEventListener('wheel',e=>{e.preventDefault();if(pan||paintPointer!==null)return;const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?c.clientHeight:1);setZoom(view().zoom*Math.exp(-Math.max(-100,Math.min(100,delta))*.0025),local(e));},{passive:false});
   c.addEventListener('keydown',e=>{if(e.code==='Space'){space=true;e.preventDefault();}if(e.key==='+'||e.key==='='){e.preventDefault();setZoom(view().zoom*1.25);}if(e.key==='-'){e.preventDefault();setZoom(view().zoom/1.25);}if(e.key==='0'){e.preventDefault();reset();}});
   c.addEventListener('keyup',e=>{if(e.code==='Space'){space=false;e.preventDefault();}});
   c.addEventListener('pointerdown',e=>{c.focus({preventScroll:true});if(e.button!==1&&!(e.button===0&&(space||view().panMode))){if(e.button===0&&creatorState().brush)paintPointer=e.pointerId;return;}e.preventDefault();e.stopImmediatePropagation();const point=local(e),v=view();pan={id:e.pointerId,point,x:v.x,y:v.y};c.setPointerCapture(e.pointerId);c.classList.add('sz-skin-drag');},true);
   c.addEventListener('pointermove',e=>{if(!pan||pan.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const point=local(e),v=view();v.x=pan.x+point.x-pan.point.x;v.y=pan.y+point.y-pan.point.y;update();},true);
   function end(e){if(pan&&(!e||pan.id===e.pointerId)){const id=pan.id;pan=null;c.classList.remove('sz-skin-drag');if(c.hasPointerCapture(id))c.releasePointerCapture(id);}paintPointer=null;space=false;}
   c.addEventListener('pointerup',end,true);c.addEventListener('pointercancel',end,true);c.addEventListener('lostpointercapture',()=>{pan=null;paintPointer=null;c.classList.remove('sz-skin-drag');});c.addEventListener('blur',()=>{end();c.onpointercancel?.();});
   function language(){labels();help.textContent=t('Kółko: zoom · Spacja + przeciągnij lub środkowy przycisk: przesuń');}
   language();refreshLanguage=()=>{if(c.isConnected)language();};
  };
  Object.assign(root.SzSkinView,{view,setZoom,reset});
 }
 return{MIN,MAX,clamp,transform,zoomAt,mount};
});
