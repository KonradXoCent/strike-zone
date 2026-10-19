/* Original arenas reserved before Workshop slots are allocated. Coordinates are
   shared by the renderer, collision, navigation and future prop placement. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.SzHideSeekMaps=api;api.install({MAPN,GRS,MAPS,WINS,FLRS,SITES,SPW,LB,SCL,FL,WC,FLG,WCG,BGC,MAP_BRIEFINGS});}})(globalThis,function(){
 'use strict';
 const specs=[
  {name:'hs_warehouse',material:'industrial',floor:'#697b83',wall:'#a4b5b9',dark:'#172732',accent:'#69d0da',landmark:'reactor',
   label:'MAGAZYN / CHOWANY',description:'Osobna arena zabawy w chowanego: magazyn z bocznymi składami, rzędami kontenerów i kilkoma drogami między halami.',tips:['Zmieniaj alejkę za osłoną, aby zgubić szukającego.','Zryw pod E pomaga uciec z otwartej hali.'],
   walls:[[736,32,32,160],[736,288,32,224],[736,608,32,208],[736,912,32,80],[32,352,224,32],[352,352,384,32],[768,352,256,32],[1120,352,384,32],[32,704,352,32],[480,704,256,32],[768,704,352,32],[1216,704,288,32]],
   covers:[[160,160,160,64],[464,160,128,64],[160,496,128,96],[448,512,160,64],[160,832,160,64],[480,832,112,64],[928,160,128,64],[1216,176,128,96],[944,496,144,64],[1264,496,128,64],[912,848,128,64],[1232,832,144,64]]},
  {name:'hs_garden',material:'forest',floor:'#62795b',wall:'#b4b79a',dark:'#233128',accent:'#a4dda1',landmark:'temple',
   label:'OGRÓD / CHOWANY',description:'Osobna arena zabawy w chowanego: ogród z pawilonami, kamiennymi parawanami i okrężnymi ścieżkami wokół dziedzińca.',tips:['Pawilony pozwalają wyjść inną stroną niż wejście.','Sygnał dźwiękowy wskazuje okolicę, a nie dokładną kryjówkę.'],
   walls:[[384,96,32,224],[384,416,32,192],[384,704,32,224],[1120,96,32,224],[1120,416,32,192],[1120,704,32,224],[96,320,160,32],[256,608,128,32],[1152,320,160,32],[1312,608,192,32],[544,208,192,32],[832,208,192,32],[544,784,192,32],[832,784,192,32]],
   covers:[[576,416,112,64],[848,416,112,64],[576,576,112,64],[848,576,112,64],[160,160,80,64],[160,800,80,64],[1280,160,96,64],[1280,816,96,64],[736,464,64,96]]},
  {name:'hs_motel',material:'mall',floor:'#b28d6b',wall:'#dfc7aa',dark:'#3a2d2b',accent:'#f0c285',landmark:'arch',
   label:'MOTEL / CHOWANY',description:'Osobna arena zabawy w chowanego: motel z pokojami połączonymi korytarzami, recepcją i przejściami przez tylne podwórze.',tips:['Korytarz jest szybki, ale łatwo zostać w nim zauważonym.','Za meblami znajdziesz osłony; sprawdzaj także drugie wyjście.'],
   walls:[[352,32,32,224],[352,352,32,64],[736,32,32,224],[736,352,32,64],[1120,32,32,224],[1120,352,32,64],[352,608,32,64],[352,768,32,224],[736,608,32,64],[736,768,32,224],[1120,608,32,64],[1120,768,32,224],[32,416,128,32],[256,416,256,32],[608,416,256,32],[960,416,256,32],[1312,416,192,32],[32,576,128,32],[256,576,256,32],[608,576,256,32],[960,576,256,32],[1312,576,192,32]],
   covers:[[112,144,128,64],[480,144,128,64],[864,144,128,64],[1248,144,128,64],[112,832,128,64],[480,832,128,64],[864,832,128,64],[1248,832,128,64],[480,480,112,48],[944,496,112,48]]}
 ];
 function build(spec){
  const cs=16,cols=96,rows=64,d=new Uint8Array(cols*rows),rect=(r,value)=>{for(let y=r[1]/cs;y<(r[1]+r[3])/cs;y++)for(let x=r[0]/cs;x<(r[0]+r[2])/cs;x++)d[y*cols+x]=value;};
  for(const r of[[0,0,1536,32],[0,992,1536,32],[0,0,32,1024],[1504,0,32,1024],...spec.walls])rect(r,1);
  spec.covers.forEach(r=>rect(r,2));
  const clear=(x,y)=>{for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++)if(xx<0||yy<0||xx>=cols||yy>=rows||d[yy*cols+xx])return false;return true;},points=[];
  for(let y=6;y<rows-5;y+=4)for(let x=6;x<cols-5;x+=4){if(!clear(x,y))continue;let shelter=0;for(const[dx,dy]of[[3,0],[-3,0],[0,3],[0,-3]])if(d[(y+dy)*cols+x+dx])shelter++;if(shelter&&points.every(p=>Math.hypot(p.x-(x+.5)*cs,p.y-(y+.5)*cs)>72))points.push({x:(x+.5)*cs,y:(y+.5)*cs});}
  const covers=spec.covers.map((r,i)=>({name:'cover-'+i,material:spec.landmark==='temple'?'stone':spec.landmark==='reactor'?'metal':'wood',polygon:[[r[0],r[1]],[r[0]+r[2],r[1]],[r[0]+r[2],r[1]+r[3]],[r[0],r[1]+r[3]]]}));
  return{cs,cols,rows,d,crates:[],covers,windows:[],links:[],labels:[],hidePoints:points,mode:'hns',source:spec.name};
 }
 const ids=[];
 function install(w){if(ids.length)return ids;for(const spec of specs){const id=w.MAPN.length;ids.push(id);w.MAPN[id]=spec.name;w.GRS[id]=build(spec);w.MAPS[id]=[];w.WINS[id]=[];w.FLRS[id]=[];w.SITES[id]=[];w.SPW[id]=[[64,448,128,96],[1280,448,160,96]];w.LB[id]=[];w.SCL[id]=1.536;w.FL[id]=w.FLG[id]=spec.floor;w.WC[id]=w.WCG[id]=spec.wall;w.BGC[id]=[spec.floor,spec.dark,spec.accent];w.MAP_BRIEFINGS[id]={...spec};}return ids;}
 return{specs,build,install,ids};
});
