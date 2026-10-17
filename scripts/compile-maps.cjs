/* Rebuild the embedded map masks; no image downloads or runtime dependencies. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'maps/topology.json'),'utf8'));
const sourcePath=path.join(root,'game-source/index.html');
let source=fs.readFileSync(sourcePath,'utf8');
const match=source.match(/const REBUILT_MAPS=(\[.*?\]);/);
if(!match)throw new Error('Missing embedded map table');
const maps=JSON.parse(match[1]);
const C=config.gridSize,S=config.coordinateSize,scale=config.worldSize/S;
function inside(x,y,p){let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
for(const edit of config.maps){
 const m=maps.find(m=>m.id===edit.id);if(!m)throw new Error('Unknown map '+edit.id);
 const d=new Uint8Array(C*C);
 if(edit.floors){d.fill(1);for(let y=0;y<C;y++)for(let x=0;x<C;x++){const px=(x+.5)*S/C,py=(y+.5)*S/C;if(edit.floors.some(p=>inside(px,py,p)))d[y*C+x]=0;}}
 else{const bits=Buffer.from(edit.baseBits,'base64');for(let i=0;i<d.length;i++)d[i]=(bits[i>>3]>>(i&7))&1;}
 for(const polygon of edit.repairs||[])for(let y=0;y<C;y++)for(let x=0;x<C;x++)if(inside((x+.5)*S/C,(y+.5)*S/C,polygon))d[y*C+x]=0;
 const paint=(polygon,value)=>{for(let y=0;y<C;y++)for(let x=0;x<C;x++)if(inside((x+.5)*S/C,(y+.5)*S/C,polygon))d[y*C+x]=value;};
 for(const polygon of edit.walls||[])paint(polygon,1);
 for(const door of edit.doors||[])paint(door.polygon,0);
 for(const box of edit.boxes)paint(box.polygon,1);
 for(const {rect:[x,y,w,h]} of edit.windows||[])paint([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],1);
 const bits=Buffer.alloc(Math.ceil(d.length/8));for(let i=0;i<d.length;i++)bits[i>>3]|=d[i]<<(i&7);
 m.bits=bits.toString('base64');m.revision=4;
 m.covers=edit.boxes.map(b=>({...b,polygon:b.polygon.map(p=>p.map(v=>v*scale))}));
 m.windows=(edit.windows||[]).map(w=>({...w,rect:w.rect.map(v=>v*scale)}));
 for(const key of ['spawns','sites'])if(edit[key])m[key]=edit[key].map(r=>r.map(v=>v*scale));
 if(edit.labels)m.labels=edit.labels.map(([s,x,y])=>[s,x*scale,y*scale]);
}
source=source.replace(match[0],'const REBUILT_MAPS='+JSON.stringify(maps)+';');
if(process.argv.includes('--check')){if(fs.readFileSync(sourcePath,'utf8')!==source)throw new Error('Embedded maps are stale; run node scripts/compile-maps.cjs');}
else fs.writeFileSync(sourcePath,source);
console.log('Compiled '+config.maps.length+' map plans into the single HTML file.');
