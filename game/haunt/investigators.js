(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;else root.HauntInvestigators=value;})(globalThis,()=>{
 'use strict';
 function create(H){
  const rack=w=>({x:w.map.van.x+82,y:w.map.van.y});
  const{distance,roomAt,line,sameFloor,atRack,follow,gear,equip,owns,use,pickup,collectBone,readings,vacant,event,tip}=H;
  const scanners=['thermo','emf','uv','recorder'],deployable=['book','camera','dots','motion','rempod','salt','crucifix','toycar'];
  function mark(w,p){
   const id=roomAt(w.map,p);if(!p.alive||p.hidden||id<0){event(w,'focus-invalid',p.id);return false;}
   w.focusRoom={id,by:p.id,at:w.time,revision:++w.focusRevision};
   for(const bot of w.players.filter(q=>q.bot)){bot.brain.focus=null;bot.brain.survey=null;bot.brain.route=[];}
   event(w,'focus-room',p.id,{room:id,name:p.name});return true;
  }
  function clear(w,p){if(!p.alive)return false;w.focusRoom=null;for(const bot of w.players.filter(q=>q.bot)){bot.brain.focus=null;bot.brain.survey=null;}event(w,'focus-clear',p.id);return true;}
  function bone(w,p,dt){
   const b=p.brain;
   if(w.bone.collected&&b.boneTask?.phase!=='return'){b.boneTask=null;return false;}
   if(!b.boneTask&&(!w.bone.assignedBot||!w.players.some(q=>q.id===w.bone.assignedBot&&q.alive))&&w.time>20&&distance(p,w.bone)<190&&line(w,p,w.bone)){
    if(!w.bone.known)event(w,'bone-found',p.id,{name:p.name,x:w.bone.x,y:w.bone.y});w.bone.known=true;w.bone.sightedBy=p.id;if(!w.stock.photo&&!owns(p,'photo')&&!w.photos.some(x=>x.target==='bone')){b.nextBone=w.time+30;return false;}w.bone.assignedBot=p.id;b.boneTask={phase:w.photos.some(x=>x.target==='bone')?'collect':'fetch',at:w.time};b.route=[];
   }
   const task=b.boneTask;if(!task)return false;
   if(w.time-task.at>200){w.bone.assignedBot=null;b.boneTask=null;b.nextBone=w.time+40;return false;}
   p.assignment='bone';
   if(task.phase==='fetch'){
    if(!atRack(w,p)){follow(w,p,rack(w),112,dt);return true;}
    if(!owns(p,'photo')){
     if(!w.stock.photo){if(!task.waited){tip(w,p,'photo-busy');task.waited=w.time;}if(w.time-task.waited>12){w.bone.assignedBot=null;b.boneTask=null;b.nextBone=w.time+40;return false;}return true;}
     if(p.inventory.length>=4)gear(w,p,p.inventory.find(id=>id!=='flashlight'),true);
     if(!gear(w,p,'photo'))return true;
    }
    task.phase='photo';b.route=[];return true;
   }
   if(task.phase==='photo'){
    follow(w,p,w.bone,107,dt);
    if(!sameFloor(w,p,w.bone)||distance(p,w.bone)>135||!line(w,p,w.bone))return true;
    p.angle=Math.atan2(w.bone.y-p.y,w.bone.x-p.x);equip(p,'photo');
    if(w.time-p.lastUse<.9)return true;
    use(w,p);if(w.photos.some(x=>x.target==='bone')){task.phase='collect';tip(w,p,'bone-photo');}return true;
   }
   if(task.phase==='collect'){
    follow(w,p,w.bone,105,dt);
    if(distance(p,w.bone)<45&&collectBone(w,p)){task.phase='return';tip(w,p,'bone-collected');}
    return true;
   }
   if(!atRack(w,p)){follow(w,p,rack(w),110,dt);return true;}
   if(owns(p,'photo'))gear(w,p,'photo',true);b.boneTask=null;b.survey=null;b.focus=null;return false;
  }
  function focus(w,p,dt,index){
   const marker=w.focusRoom;if(!marker)return false;const b=p.brain,r=w.map.rooms[marker.id];if(!r)return false;
   if(p.sanity<25)b.focusRest=true;
   if(b.focusRest){p.assignment='rest';if(!atRack(w,p)){follow(w,p,rack(w),110,dt);return true;}if(p.sanity<60)return true;b.focusRest=false;b.focus=null;}
   let job=b.focus;
   if(!job||job.revision!==marker.revision){job=b.focus={revision:marker.revision,phase:index===1&&p.inventory.some(id=>scanners.includes(id))?'travel':'load',nextScan:0,lastSupply:w.time,checked:0,reportAt:0};b.route=[];}
   const plan=[['thermo','book','salt','crucifix'],['emf','camera','motion','toycar'],['uv','recorder','dots','rempod']][(index-1)%3];
   const needs=id=>!w.devices.some(d=>d.kind===id&&d.room===r.id&&(id!=='crucifix'||d.charges>0));
   if(job.phase==='load'){
    p.assignment='return';if(!atRack(w,p)){follow(w,p,rack(w),110,dt);return true;}
    for(const id of [...p.inventory])if(!plan.includes(id)&&id!=='flashlight')gear(w,p,id,true);
    for(const id of plan)if(!owns(p,id)&&w.stock[id]>0&&(!deployable.includes(id)||needs(id))&&p.inventory.length<4)gear(w,p,id);
    // A sole camera or book placed in another room is retrieved physically.
    const old=w.devices.find(d=>plan.includes(d.kind)&&deployable.includes(d.kind)&&d.room!==r.id&&!owns(p,d.kind)&&needs(d.kind)&&p.inventory.length<4&&(d.kind!=='crucifix'||d.charges>0));
    if(old){job.phase='retrieve';job.device=old.id;}else job.phase='travel';
    job.target=vacant(w,r,index*11+job.checked*3);job.lastSupply=w.time;b.route=[];return true;
   }
   if(job.phase==='retrieve'){
    p.assignment='supply';const device=w.devices.find(d=>d.id===job.device);if(!device){job.phase='travel';return true;}
    follow(w,p,device,108,dt);if(distance(p,device)<43&&pickup(w,p,device)){job.phase='travel';b.route=[];}return true;
   }
   if(job.phase==='travel'){
    p.assignment='supply';job.target=job.target||vacant(w,r,index*11);follow(w,p,job.target,108,dt);
    if(sameFloor(w,p,r)&&distance(p,job.target)<40){job.phase='deploy';job.nextScan=w.time+5;}return true;
   }
   p.assignment='scan';
   if(job.phase==='deploy'){
    const kind=p.inventory.find(id=>deployable.includes(id)&&needs(id));
    if(kind){equip(p,kind);p.angle=index*Math.PI/2;if(w.time-p.lastUse>.9&&use(w,p))tip(w,p,'placed',{tool:kind,room:r.id});return true;}
    job.phase='scan';job.nextScan=w.time+7;
   }
   const tool=plan.find(id=>scanners.includes(id)&&owns(p,id))||p.inventory.find(id=>scanners.includes(id));if(tool)equip(p,tool);
   if(w.time>=job.nextScan){
    const measured=readings(w,p);if(w.time>=job.reportAt){
     if(tool==='thermo')tip(w,p,measured.temperature<10?'cold':'warm',{room:r.id,temperature:measured.temperature});
     else if(tool==='emf'&&measured.emf>1)tip(w,p,'emf',{room:r.id,value:measured.emf});
     else if(tool==='uv'&&measured.uv)tip(w,p,'uv',{room:r.id});
     else tip(w,p,'focus-check',{room:r.id});job.reportAt=w.time+38;
    }
    if(tool==='recorder')use(w,p);job.checked++;job.target=vacant(w,r,index*13+job.checked*7);job.nextScan=w.time+12;
   }
   if(distance(p,job.target)>30)follow(w,p,job.target,65,dt);
   if(w.time-job.lastSupply>15&&!p.inventory.some(id=>scanners.includes(id))&&plan.some(id=>scanners.includes(id)&&w.stock[id]>0))job.phase='load';
   if(w.time-job.lastSupply>50&&plan.some(id=>deployable.includes(id)&&needs(id)&&(w.stock[id]>0||w.devices.some(d=>d.kind===id&&d.room!==r.id))))job.phase='load';
   return true;
  }
  function tick(w,p,dt,index){
   if(w.time>=(p.brain.nextBone||0)&&(p.brain.boneTask||!w.bone.collected)&&bone(w,p,dt))return true;
   return focus(w,p,dt,index);
  }
  return{mark,clear,tick};
 }
 return{create};
});
