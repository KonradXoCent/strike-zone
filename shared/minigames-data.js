/* Original arcade arenas and shared physics; the host and clients use the same geometry. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.SzMiniData=api;api.install({MAPN,GRS,MAPS,WINS,FLRS,SITES,SPW,LB,SCL,FL,WC,FLG,WCG,BGC,MAP_BRIEFINGS});}})(globalThis,function(){
 'use strict';
 const WIDTH=1280,HEIGHT=832,RADIUS=12,FOOTBALL_GOALS=10,keys=['grenade','bomb','snow','football'];
 const FOOTBALL={keeperX:112,drag:.65,kickSpeed:820,kickRange:52,kickCooldown:.35,ballCooldown:.45,maxSpeed:900};
 const specs={
  grenade:{name:'mg_dodgeyard',title:'Granatowy zbijak',description:'Rzucaj granatami na drugą połowę i unikaj wybuchów. Środka boiska nie można przekroczyć.',control:'LPM — rzuć granat · E — zryw',duration:100,material:'industrial',floor:'#647585',wall:'#b9c5cb',dark:'#14232f',accent:'#ecb85b',covers:[[192,192,96,32],[192,608,96,32],[992,192,96,32],[992,608,96,32]]},
  bomb:{name:'mg_bombtag',title:'Berek z bombą',description:'Dotknij innego gracza, aby przekazać bombę. Przekazanie nie resetuje zapalnika. Przetrwaj do końca.',control:'Dotknij gracza — przekaż bombę · E — zryw',duration:135,material:'industrial',floor:'#667875',wall:'#c3b59b',dark:'#172a29',accent:'#f18369',covers:[[384,208,64,112],[832,208,64,112],[384,512,64,112],[832,512,64,112]]},
  snow:{name:'mg_snowfield',title:'Bitwa na śnieżki',description:'Celuj śnieżkami w przeciwników. Trafienie spowalnia, a po eliminacji wracasz do gry. Pierwsza drużyna do 15 punktów wygrywa.',control:'LPM — rzuć śnieżkę · E — zryw',duration:100,material:'industrial',floor:'#bacdd7',wall:'#edf4f4',dark:'#182d40',accent:'#b7efff',covers:[[288,192,128,48],[864,192,128,48],[288,592,128,48],[864,592,128,48],[608,320,64,64],[608,448,64,64]]},
  football:{name:'mg_stadium',title:'Piłka nożna',description:'Podawaj i strzelaj do bramki przeciwnika na osobnym stadionie. Pierwsza drużyna do 10 goli wygrywa.',control:'LPM / Spacja — strzał · PPM / P — podaj · E — odbiór · Lewy Shift — sprint',duration:0,material:'forest',floor:'#43805c',wall:'#b5c8bb',dark:'#102b24',accent:'#f3dfad',covers:[]}
 };
 const iconPaths={grenade:'M12 10h8v4l4 4v8l-5 4h-6l-5-4v-8l4-4Zm2-6h8v4h-8Zm8 2h5v7M10 22h12',bomb:'M16 12a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0-7v7m0-7 5-3m1 5 4-1m-1 7 4 1',snow:'M16 2v28M4 9l24 14M4 23 28 9M12 5l4 4 4-4M12 27l4-4 4 4M4 14l6-1-1-6m18 11-6 1 1 6M4 18l6 1-1 6m18-11-6-1 1-6',football:'M16 3a13 13 0 1 0 0 26 13 13 0 0 0 0-26Zm0 8 6 4-2 7h-8l-2-7ZM16 3v8M3 14l7 1m2 7-4 5m12-5 4 5m-2-12 7-1'};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function build(key){const s=specs[key],cs=16,cols=WIDTH/cs,rows=HEIGHT/cs,d=new Uint8Array(cols*rows),rect=(r,value)=>{for(let y=r[1]/cs;y<(r[1]+r[3])/cs;y++)for(let x=r[0]/cs;x<(r[0]+r[2])/cs;x++)d[y*cols+x]=value;};
  for(const r of[[0,0,WIDTH,32],[0,HEIGHT-32,WIDTH,32],[0,0,32,HEIGHT],[WIDTH-32,0,32,HEIGHT]])rect(r,1);s.covers.forEach(r=>rect(r,2));
  return{cs,cols,rows,d,nd:null,crates:[],windows:[],links:[],labels:[],covers:s.covers.map((r,i)=>({name:'arcade-'+i,material:key==='snow'?'stone':'metal',polygon:[[r[0],r[1]],[r[0]+r[2],r[1]],[r[0]+r[2],r[1]+r[3]],[r[0],r[1]+r[3]]]})),source:s.name,mode:'minigames'};
 }
 const ids={};
 function install(w){if(Object.keys(ids).length)return ids;for(const key of keys){const s=specs[key],i=w.MAPN.length;ids[key]=i;w.MAPN[i]=s.name;w.GRS[i]=build(key);w.MAPS[i]=[];w.WINS[i]=[];w.FLRS[i]=[];w.SITES[i]=[];w.SPW[i]=[[112,128,112,576],[1056,128,112,576]];w.LB[i]=[];w.SCL[i]=1.28;w.FL[i]=w.FLG[i]=s.floor;w.WC[i]=w.WCG[i]=s.wall;w.BGC[i]=[s.floor,s.dark,s.accent];w.MAP_BRIEFINGS[i]={...s,label:s.title,tips:[s.control,s.description],landmark:'arena'};}return ids;}
 function limit(kind,team,x,y,r=RADIUS,keeper=false){const football=kind==='football',left=football?(keeper?60:80):48,right=WIDTH-left,top=football?88:48,bottom=HEIGHT-top;let a=left+r,b=right-r;if(kind==='grenade'){if(team==='CT')b=WIDTH/2-20-r;else a=WIDTH/2+20+r;}return{x:clamp(x,a,b),y:clamp(y,top+r,bottom-r)};}
 function segmentCircle(a,b,p,r){const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy,t=d?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/d,0,1):0;return Math.hypot(a.x+dx*t-p.x,a.y+dy*t-p.y)<=r?t:null;}
 function goalCrossing(a,b){const half=92-RADIUS,mid=HEIGHT/2;for(const[x,team,direction]of[[48,'T',-1],[WIDTH-48,'CT',1]])if((a.x-x)*direction<0&&(b.x-x)*direction>=0){const f=(x-a.x)/(b.x-a.x),y=a.y+(b.y-a.y)*f;if(Math.abs(y-mid)<half)return team;}return null;}
 function stepBall(ball,dt){const n=Math.max(1,Math.ceil(dt*120));for(let i=0;i<n;i++){const step=dt/n,old={x:ball.x,y:ball.y},speed=Math.hypot(ball.vx,ball.vy);if(speed>FOOTBALL.maxSpeed){ball.vx*=FOOTBALL.maxSpeed/speed;ball.vy*=FOOTBALL.maxSpeed/speed;}ball.x+=ball.vx*step;ball.y+=ball.vy*step;const goal=goalCrossing(old,ball);if(goal){ball.vx=ball.vy=0;return goal;}
   if(ball.y<76||ball.y>HEIGHT-76){ball.y=clamp(ball.y,76,HEIGHT-76);ball.vy*=-.72;}if(Math.abs(ball.y-HEIGHT/2)>=80&&(ball.x<60||ball.x>WIDTH-60)){ball.x=clamp(ball.x,60,WIDTH-60);ball.vx*=-.72;}const drag=Math.exp(-FOOTBALL.drag*step);ball.vx*=drag;ball.vy*=drag;
  }return null;
 }
 function nextKind(current,random=Math.random()){const pool=keys.filter(k=>k!==current);return pool[clamp(Math.floor(random*pool.length),0,pool.length-1)];}
 return{WIDTH,HEIGHT,RADIUS,FOOTBALL_GOALS,FOOTBALL,keys,specs,iconPaths,ids,build,install,limit,clamp,segmentCircle,goalCrossing,stepBall,nextKind};
});
