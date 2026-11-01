/* Original fictional players and Zone Football rules, shared by the client and catalog migration. */
(function(root,factory){const data=factory();if(typeof module==='object'&&module.exports)module.exports=data;else root.ZoneUltimateData=data;})(globalThis,()=>{'use strict';
 const positions=['GK','LB','CB','CB','RB','CM','CM','CAM','LW','ST','RW'];
 const first=['Milan','Adrian','Niko','Leon','Oskar','Ruben','Ivo','Dario','Elias','Teo','Aron','Bruno','Luca','Emil','Noel','Kamil','Marek','Soren','Enzo','Tomas','Alex','Hugo','Rio','Jan','Erik','Felix','Alan','Igor','Lian','Victor'];
 const last=['Veldan','Morello','Rovik','Santoski','Kordel','Navaro','Silven','Torvik','Valenti','Zarecki','Lindaro','Bergan','Castelo','Norlund','Ferano','Wolenski','Demaro','Ostvik','Lazaro','Karven','Solano','Bravik','Caldor','Melnik','Astori','Renvald','Sorell','Vossan','Arden','Kovaro'];
 const roles=['GK','LB','CB','RB','CM','CAM','LW','ST','RW'];
 const players=Array.from({length:180},(_,i)=>{const tier=Math.floor(i/45),rating=[60,70,80,88][tier]+(i*7%[10,10,8,6][tier]),pos=roles[i%9];return{id:'zf-'+String(i+1).padStart(3,'0'),name:first[i%30]+' '+last[(Math.floor(i/30)*7+i%30)%30],position:pos,tier:['bronze','silver','gold','elite'][tier],rating,pace:Math.min(96,rating+((i*3)%15)-7),shoot:Math.max(40,rating+(pos==='ST'?7:-6)),pass:Math.min(96,rating+(pos==='CM'||pos==='CAM'?6:-3)),defend:Math.min(96,Math.max(40,rating+(['LB','CB','RB'].includes(pos)?7:-12))),keeper:pos==='GK'?rating:22,portrait:i%30};});
 const starterPositions=[...positions,'GK','CB','LB','CM','CAM','ST','RW'],used=new Set();
 const starter=starterPositions.map(pos=>{const p=players.find(p=>p.tier==='bronze'&&p.position===pos&&!used.has(p.id));used.add(p.id);return p.id;});
 const packs=[{id:'bronze',name:'Kickoff',price:75,count:3,odds:[85,14,1,0]},{id:'silver',name:'Rising Stars',price:200,count:3,odds:[0,85,14,1]},{id:'gold',name:'Elite Nights',price:500,count:3,odds:[0,0,94,6]}];
 const formations={
 '4-3-3':{roles:positions,spots:[[.045,.5],[.23,.15],[.2,.38],[.2,.62],[.23,.85],[.43,.28],[.4,.66],[.55,.49],[.7,.15],[.76,.5],[.7,.85]]},
 '4-4-2':{roles:['GK','LB','CB','CB','RB','LW','CM','CM','RW','ST','ST'],spots:[[.045,.5],[.23,.15],[.2,.38],[.2,.62],[.23,.85],[.47,.13],[.43,.38],[.43,.62],[.47,.87],[.74,.36],[.74,.64]]},
 '3-5-2':{roles:['GK','CB','CB','CB','LW','CM','CM','CAM','RW','ST','ST'],spots:[[.045,.5],[.23,.23],[.19,.5],[.23,.77],[.46,.1],[.4,.34],[.4,.66],[.57,.5],[.46,.9],[.75,.35],[.75,.65]]}
 };
 const competitions=[{id:'friendly',name:'Club Friendly',pl:'Mecz towarzyski',kind:'friendly',rounds:1,level:0},
 {id:'zone-league',name:'Zone League',pl:'Liga Zone',kind:'league',rounds:7,level:0},
 {id:'premier-league',name:'Premier League',pl:'Liga Premier',kind:'league',rounds:7,level:2},
 {id:'zone-cup',name:'Zone Cup',pl:'Puchar Zone',kind:'cup',rounds:3,level:1},
 {id:'night-cup',name:'Neon Champions Cup',pl:'Puchar Mistrzów Neon',kind:'cup',rounds:3,level:3}];
 const clubs=['Harbour Athletic','Forest United','Violet City','Northstar FC','Copper Rovers','Aurora Club','Summit Eleven'];
 const byId=Object.fromEntries(players.map(p=>[p.id,p]));
 function demoClub(){return{name:'Zone United',formation:'4-3-3',cards:starter.map((id,i)=>({id:'demo-'+i,player_id:id})),squad:starter.map((_,i)=>'demo-'+i),progress:{}};}
 function roster(club){return club.squad.map(id=>{const c=club.cards.find(c=>c.id===id);return c?{...byId[c.player_id],cardId:c.id}:null;}).filter(Boolean);}
 function opponent(level=0,seed=0){const pool=players.filter(p=>p.tier===['bronze','silver','gold','elite'][Math.max(0,Math.min(3,level))]),taken=new Set();return starterPositions.map((pos,i)=>{const list=pool.filter(p=>p.position===pos&&!taken.has(p.id)),p=list[(seed+i)%list.length]||pool.find(p=>!taken.has(p.id));taken.add(p.id);return{...p,cardId:'bot-'+i};});}
 return{players,byId,positions,starter,formations,packs,competitions,clubs,demoClub,roster,opponent,version:'0.2.0'};
});
