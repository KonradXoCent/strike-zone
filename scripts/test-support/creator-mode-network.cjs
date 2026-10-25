const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),fixtures=require('../../tests/fixtures/creator-mode-maps.json');
exports.setup=async function(host,guest,mode){const release={id:randomUUID(),item_id:randomUUID(),version:1,payload:fixtures[mode]};for(const[i,page]of[host,guest].entries())await page.evaluate(({release,i})=>{const from=sb.from;sb.from=function(table){if(table!=='sz_workshop_releases')return from(table);let id;return{select(){return this;},eq(k,v){id=v;return this;},async maybeSingle(){return{data:id===release.id?release:null,error:null};}};};COMMUNITY.complete=false;COMMUNITY.explicitSelection=release.id;if(i)COMMUNITY.nextSlot+=2;const slot=communityRegisterMap(release);sel.map=slot;window.__creatorNetwork={release:release.id,slot};}, {release,i});};
exports.verify=async function(host,guest,mode){assert.equal(await host.evaluate(()=>GR.creatorMode),mode);assert.equal(await guest.evaluate(()=>GR.creatorMode),mode);assert.notEqual(await host.evaluate(()=>sel.map),await guest.evaluate(()=>sel.map));assert.equal(await host.evaluate(()=>G.communityMapRef?.release||communityRefAt(sel.map)?.release),await guest.evaluate(()=>G.communityMapRef.release));
 await host.evaluate(()=>{G.paused=true;G.over=false;keys={};mouse.d=0;netSnap();});
 if(mode==='football'){
  await guest.waitForFunction(()=>G.mg?.kind==='football');assert.deepEqual(await guest.evaluate(()=>[WW,WH]),[1280,832]);
  await host.evaluate(()=>{G.paused=false;G.mg.phase='live';G.ph='live';G.sc={CT:0,T:0};for(const p of G.ps){p.x=p.team==='CT'?300:900;p.y=160;p.mgBrain.fire=Infinity;}G.mg.ball={...SzFootball.ball(),x:1216,y:416,vx:820,vy:0,last:0};upd(.05);G.paused=true;netSnap();});await guest.waitForFunction(()=>G.sc.CT===1&&G.mg.phase==='goal');assert.equal(await guest.evaluate(()=>GR.creatorMode),'football');
 }else if(mode==='prophunt'){
  assert.deepEqual(await guest.evaluate(()=>SzPropHunt.ensure().objects.map(o=>[o.form,o.x,o.y])),await host.evaluate(()=>SzPropHunt.ensure().objects.map(o=>[o.form,o.x,o.y])));
  const state=await host.evaluate(()=>{const p=G.ps.find(p=>p.rh),q=SzPropHunt.ensure().objects.find(o=>o.form!==p.propForm);G.paused=false;p.propMorph=0;for(let i=0;i<16;i++){const a=i*Math.PI/8,x=q.x+Math.cos(a)*60,y=q.y+Math.sin(a)*60;if(!SzPropHunt.occupied(p,x,y)){p.x=x;p.y=y;if(SzPropHunt.transform(p,q))break;}}G.paused=true;netSnap();return p.propForm;});await guest.waitForFunction(form=>G.me.propForm===form,state);
 }else{
  await host.evaluate(()=>{const p=G.ps.find(p=>p.rh);G.ph='live';p.team='T';p.inv=0;p.zFreeze=0;boom({type:'smoke',by:G.me,team:'CT',x:p.x,y:p.y});netSnap();});await guest.waitForFunction(()=>G.me.zFreeze>0);assert.equal(await guest.evaluate(()=>GR.creatorMode),'zombie');
 }
 console.log('PASS approved custom-map SDK',mode,'different local slot IDs, identical geometry and synchronized mode gameplay');
};
