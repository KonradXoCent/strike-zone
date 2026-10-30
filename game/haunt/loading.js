(function(root){'use strict';
 class Loading{
  constructor(view,language){this.view=view;this.language=language;this.token=0;this.active=false;}
  cancel(){this.token++;this.active=false;document.getElementById('map-loading').hidden=true;}
  async start(world){
   const token=++this.token,map=world.map,en=this.language()==='en',box=document.getElementById('map-loading'),progress=document.getElementById('map-load-progress');this.active=true;box.hidden=false;box.style.setProperty('--site-accent',map.accent);
   document.getElementById('map-load-name').textContent=en?map.en:map.pl;document.getElementById('map-load-description').textContent=en?map.descriptionEn:map.descriptionPl;
   document.getElementById('map-load-eyebrow').textContent=en?'BUREAU / FIELD DEPLOYMENT':'BIURO / WYPRAWA TERENOWA';document.getElementById('map-load-detail').textContent=(en?map.sizeEn:map.sizePl)+' · '+map.rooms.length+' '+(en?'rooms':'pomieszczeń')+' · '+(en?'Ground floor + basement':'Parter + piwnica');
   const tips=en?['E on the stairs switches between the ground floor and basement. The breaker is downstairs.','Z → This is the ghost room asks bots to bring equipment and investigate the marked room.','Dirty water and salt footprints earn photo bonuses. Keep the target in view.']:['E przy schodach przełącza parter i piwnicę. Bezpieczniki są na dole.','Z → Tu jest pokój ducha kieruje boty ze sprzętem do wskazanego pomieszczenia.','Brudna woda i odciski w soli dają bonus za zdjęcie. Wyceluj w fotografowany obiekt.'];
   document.getElementById('map-load-tip').textContent=tips[Math.abs(world.seed||Math.floor(world.time))%tips.length];progress.value=12;document.getElementById('map-load-status').textContent=en?'Preparing the location…':'Przygotowanie lokacji…';
   await new Promise(resolve=>requestAnimationFrame(resolve));if(token!==this.token)return;
   this.view.prepare(map);progress.value=60;document.getElementById('map-load-status').textContent=en?'Scenery and floor plans ready':'Sceneria i plany pięter gotowe';this.paint(map);
   await(document.fonts?.ready||Promise.resolve());if(token!==this.token)return;progress.value=100;document.getElementById('map-load-status').textContent=en?'Equipment ready · entering the investigation':'Sprzęt gotowy · wejście do śledztwa';
   await new Promise(resolve=>setTimeout(resolve,550));if(token!==this.token)return;box.hidden=true;this.active=false;document.getElementById('scene').focus();
  }
  paint(map){
   const canvas=document.getElementById('map-load-plan'),c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,scale=Math.min((w-80)/map.width,(h-70)/map.groundHeight);c.fillStyle='#0b1c21';c.fillRect(0,0,w,h);c.save();c.translate((w-map.width*scale)/2,(h-map.groundHeight*scale)/2);c.scale(scale,scale);c.drawImage(this.view.floor,0,0,map.width,map.groundHeight,0,0,map.width,map.groundHeight);c.restore();c.fillStyle='#d6e2c4';c.font='12px monospace';c.fillText(this.language()==='en'?'SITE PLAN / GROUND FLOOR':'PLAN LOKACJI / PARTER',22,28);
   const grad=c.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#8abbb314');grad.addColorStop(1,'#09172255');c.fillStyle=grad;c.fillRect(0,0,w,h);
  }
 }
 root.HauntLoading=Loading;
})(globalThis);
