const {test}=require('node:test'),assert=require('node:assert/strict');
const {move}=require('../shared/game-input.js'),{transform,zoomAt}=require('../shared/skin-view.js');
test('relative aim follows CSS movement at widescreen, small and scaled viewports',()=>{
 for(const [width,height]of[[1920,1080],[1280,720],[800,600],[3840,2160]]){
  const vw=Math.round(640*width/height),rect={width,height},p={x:vw/2,y:320},next=move(p,60,-30,vw,640,rect);
  assert.ok(Math.abs((next.x-p.x)*width/vw-60)<1e-8);assert.ok(Math.abs((next.y-p.y)*height/640+30)<1e-8);
 }
});
test('relative aim stays on the canvas and ignores invalid movement',()=>{
 assert.deepEqual(move({x:500,y:300},1e9,-1e9,1000,640,{width:1000,height:640}),{x:1000,y:0});
 assert.deepEqual(move({x:20,y:30},NaN,Infinity,1000,640,{width:0,height:0}),{x:20,y:30});
});
test('zoom and pan invert to the original model coordinates at every zoom level',()=>{
 const base={x:46,y:160,scale:16/3};
 for(const zoom of[.5,.8,1,1.25,2,3,4])for(const[x,y]of[[0,0],[54,0],[75,-10]]){
  const t=transform(base,660,320,{zoom,x:137,y:-61}),screen={x:t.x+x*t.scale,y:t.y+y*t.scale};
  assert.ok(Math.abs((screen.x-t.x)/t.scale-x)<1e-10);assert.ok(Math.abs((screen.y-t.y)/t.scale-y)<1e-10);
 }
});
test('wheel zoom preserves the model point under the pointer, including the limits',()=>{
 const base={x:46,y:160,scale:16/3},anchor={x:541,y:117};let view={zoom:1,x:80,y:-20};
 for(const next of[2,4,100,.7,.1,1]){
  const a=transform(base,660,320,view),point=[(anchor.x-a.x)/a.scale,(anchor.y-a.y)/a.scale];view=zoomAt(view,next,anchor,660,320);const b=transform(base,660,320,view);
  assert.ok(view.zoom>=.5&&view.zoom<=4);assert.ok(Math.abs(point[0]-(anchor.x-b.x)/b.scale)<1e-10);assert.ok(Math.abs(point[1]-(anchor.y-b.y)/b.scale)<1e-10);
 }
});
