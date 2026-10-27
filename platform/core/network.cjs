'use strict';
const {Readable}=require('node:stream');
// Electron's fetch rejects manual redirects instead of returning their status.
// Expose each hop to Packages so it can validate the next URL before requesting it.
function createNetFetch(net){return (input,options={})=>new Promise((resolve,reject)=>{
 let request,body,settled=false;const signal=options.signal;
 const cleanup=()=>signal?.removeEventListener('abort',abort);
 const fail=error=>{cleanup();if(!settled){settled=true;reject(error);}else if(body&&!body.destroyed)body.destroy(error);};
 const abort=()=>{const error=new Error('Aborted');error.name='AbortError';fail(error);request?.abort();};
 if(signal?.aborted){abort();return;}
 try{request=net.request({url:String(input),method:'GET',redirect:'manual',credentials:'omit',cache:'no-store'});
  for(const[k,v]of new Headers(options.headers))request.setHeader(k,v);
  request.on('error',fail);
  request.on('redirect',(status,_method,url)=>{if(settled)return;settled=true;cleanup();resolve(new Response(null,{status,headers:{location:url}}));request.abort();});
  request.on('response',response=>{if(settled){response.resume();return;}body=response;const headers=new Headers();for(const[k,v]of Object.entries(response.headers||{}))headers.set(k,Array.isArray(v)?v.join(', '):String(v));response.once('end',cleanup);response.once('close',cleanup);settled=true;resolve(new Response([204,205,304].includes(response.statusCode)?null:Readable.toWeb(response),{status:response.statusCode,headers}));});
  signal?.addEventListener('abort',abort,{once:true});request.end();
 }catch(error){fail(error);request?.abort();}
});}
module.exports={createNetFetch};
