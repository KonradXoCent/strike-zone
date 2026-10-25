/* Nine original arenas, installed before workshop slots are reserved. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.SzObjectiveMaps=api;api.install({MAPN,GRS,MAPS,WINS,FLRS,SITES,SPW,LB,SCL,FL,WC,FLG,WCG,BGC,MAP_BRIEFINGS});}})(globalThis,function(){'use strict';
 const W=1536,H=1024,CS=16;
 const themes={forest:{material:'forest',floor:'#687c58',wall:'#a4af89',dark:'#172b23',accent:'#b2d898',landmark:'temple'},desert:{material:'desert',floor:'#b39b6f',wall:'#d4ba86',dark:'#30291d',accent:'#f0cd83',landmark:'arch'},industrial:{material:'industrial',floor:'#647783',wall:'#a6bac2',dark:'#112631',accent:'#73ccd7',landmark:'reactor'},city:{material:'mall',floor:'#9a9388',wall:'#c4bcae',dark:'#242a31',accent:'#d7b991',landmark:'arch'},snow:{material:'snow',floor:'#afc5cf',wall:'#dce9ed',dark:'#162d3b',accent:'#a4e9ed',landmark:'reactor'},lab:{material:'lab',floor:'#7b9296',wall:'#c0d0c7',dark:'#152b2b',accent:'#b8e19d',landmark:'reactor'},swamp:{material:'forest',floor:'#506a58',wall:'#899c78',dark:'#12271e',accent:'#b9c678',landmark:'temple'}};
 const specs=[
 {name:'dom_forest_outpost',title:'Leśna placówka',mode:'domination',theme:'forest',walls:[[432,96,32,208],[432,416,32,192],[432,720,32,208],[1072,96,32,208],[1072,416,32,192],[1072,720,32,208]],covers:[[624,320,96,48],[816,656,96,48],[608,640,64,64],[864,320,64,64],[272,256,80,48],[1184,720,80,48]]},
 {name:'dom_desert_ruins',title:'Pustynne ruiny',mode:'domination',theme:'desert',walls:[[384,192,224,32],[928,192,224,32],[384,800,224,32],[928,800,224,32],[576,384,32,256],[928,384,32,256]],covers:[[256,352,96,64],[1184,608,96,64],[704,352,64,48],[768,624,64,48],[448,544,64,64],[1024,416,64,64]]},
 {name:'dom_freight_yard',title:'Terminal kontenerowy',mode:'domination',theme:'industrial',walls:[[320,144,256,64],[960,816,256,64],[320,816,256,64],[960,144,256,64],[384,368,64,272],[1088,368,64,272]],covers:[[608,368,80,48],[848,608,80,48],[608,608,80,48],[848,368,80,48],[240,688,80,48],[1216,288,80,48]]},
 {name:'heist_city_bank',title:'Bank miejski',mode:'heist',theme:'city',walls:[[448,192,32,224],[448,608,32,224],[736,320,32,144],[736,560,32,144],[1024,192,32,224],[1024,608,32,224]],covers:[[288,320,96,48],[288,656,96,48],[608,192,80,64],[832,768,80,64],[1152,416,64,64],[1152,544,64,64]]},
 {name:'heist_harbor',title:'Port przeładunkowy',mode:'heist',theme:'industrial',walls:[[448,224,288,64],[448,736,288,64],[912,224,256,64],[912,736,256,64],[720,416,160,64],[720,544,160,64]],covers:[[304,192,64,64],[304,768,64,64],[560,448,64,96],[1008,448,64,96],[1216,336,64,48],[1216,640,64,48]]},
 {name:'heist_sand_fort',title:'Skarbiec fortecy',mode:'heist',theme:'desert',walls:[[400,192,48,224],[400,608,48,224],[688,256,48,160],[688,608,48,160],[1008,352,48,304]],covers:[[240,256,80,48],[240,720,80,48],[560,480,80,64],[816,160,96,48],[816,816,96,48],[1168,480,80,64]]},
 {name:'survival_frozen_station',title:'Stacja polarna',mode:'survival',theme:'snow',walls:[[352,256,256,32],[928,256,256,32],[352,736,256,32],[928,736,256,32],[448,416,32,192],[1056,416,32,192]],covers:[[640,320,64,48],[832,656,64,48],[640,656,64,48],[832,320,64,48],[240,496,64,48],[1232,496,64,48]]},
 {name:'survival_reactor',title:'Kompleks reaktora',mode:'survival',theme:'lab',walls:[[384,192,32,224],[384,608,32,224],[1120,192,32,224],[1120,608,32,224],[576,256,160,32],[800,736,160,32]],covers:[[576,432,48,128],[912,432,48,128],[672,320,64,48],[800,656,64,48],[192,272,80,48],[1264,704,80,48]]},
 {name:'survival_swamp_camp',title:'Obóz na bagnach',mode:'survival',theme:'swamp',walls:[[320,272,224,48],[992,704,224,48],[320,704,224,48],[992,272,224,48],[464,432,48,160],[1024,432,48,160]],covers:[[624,352,64,48],[848,624,64,48],[624,624,64,48],[848,352,64,48],[192,480,64,64],[1280,480,64,64]]}
 ];
 // Domination uses a larger, symmetric three-lane battlefield. Scale existing
 // masonry and add screens between lanes; all positions remain on the 16-unit grid.
 for(const s of specs)if(s.mode==='domination'){
  s.width=2304;s.height=1536;
  const scale=r=>r.map(v=>Math.round(v*1.5/16)*16);
  s.walls=s.walls.map(scale);s.covers=s.covers.map(scale);
  s.walls.push([896,496,512,32],[896,1008,512,32]);
  s.points=[{id:'A',x:1152,y:256},{id:'B',x:1152,y:768},{id:'C',x:1152,y:1280}];
 }
 for(const s of specs)Object.assign(s,themes[s.theme],{description:s.mode==='domination'?'Przejmuj punkty A, B i C. Utrzymuj kontrolę, aby zdobyć 250 punktów.':s.mode==='heist'?'Napastnicy kradną trzy torby ze skarbca i dostarczają je do ewakuacji. Obrońcy odzyskują porzucony łup.':'Przetrwaj wspólnie dziesięć coraz silniejszych fal. Polegli wracają między falami; wtedy kupujesz wyposażenie.',label:s.title});
 function build(s){const width=s.width||W,height=s.height||H,cols=width/CS,rows=height/CS,d=new Uint8Array(cols*rows),paint=(r,v)=>{for(let y=r[1]/CS;y<(r[1]+r[3])/CS;y++)for(let x=r[0]/CS;x<(r[0]+r[2])/CS;x++)d[y*cols+x]=v;};for(const r of[[0,0,width,32],[0,height-32,width,32],[0,0,32,height],[width-32,0,32,height],...s.walls])paint(r,1);for(const r of s.covers)paint(r,2);
  return{cs:CS,cols,rows,d,nd:null,crates:[],windows:[],links:[],source:s.name,mode:s.mode,objectives:s.points||null,covers:s.covers.map((r,i)=>({name:'cover-'+i,material:s.theme==='industrial'||s.theme==='lab'?'metal':s.theme==='desert'?'stone':'wood',polygon:[[r[0],r[1]],[r[0]+r[2],r[1]],[r[0]+r[2],r[1]+r[3]],[r[0],r[1]+r[3]]]})),labels:[]};
 }
 const ids={domination:[],heist:[],survival:[]};
 function install(w){if(ids.domination.length)return ids;for(const s of specs){const i=w.MAPN.length;ids[s.mode].push(i);w.MAPN[i]=s.name;w.GRS[i]=build(s);w.MAPS[i]=[];w.WINS[i]=[];w.FLRS[i]=[];w.SITES[i]=[];w.SPW[i]=s.mode==='domination'?[[112,672,192,192],[2000,672,192,192]]:[s.mode==='survival'?[656,432,192,160]:[96,448,112,128],[1328,448,112,128]];w.LB[i]=[];w.SCL[i]=(s.width||W)/1000;w.FL[i]=w.FLG[i]=s.floor;w.WC[i]=w.WCG[i]=s.wall;w.BGC[i]=[s.floor,s.dark,s.accent];w.MAP_BRIEFINGS[i]={...s,tips:[s.description,'WASD — ruch · LPM — strzał · TAB — tabela wyników'],landmark:s.landmark};}return ids;}
 return{W,H,CS,specs,ids,build,install};
});
