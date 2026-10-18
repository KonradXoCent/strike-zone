const TABLES=new Set(['sz_workshop_admins','sz_workshop_submissions','sz_workshop_catalog','sz_workshop_releases','sz_workshop_items','sz_workshop_cases','sz_workshop_owned_skins','sz_workshop_map_stats','sz_workshop_map_policy','sz_workshop_map_likes']);
const ident=value=>{if(!/^[a-z_]+$/.test(value))throw Error('Bad test identifier');return '"'+value+'"';};
async function requestWorkshopDB(asUser,uid,req){try{return await asUser(uid,async tx=>{
 if(req.rpc){const names={sz_workshop_map:['action','args'],sz_workshop_claim_owner:['code'],sz_workshop_review:['submission','decision','note'],sz_workshop_withdraw:['item'],sz_workshop_case_buy:['request_id','profile_name','expected_ts'],sz_workshop_case_open:['case_id'],sz_workshop_skin_proof:['instance_id']},params=names[req.rpc];if(!params)throw Error('Bad RPC');const r=await tx.query(`select public.${ident(req.rpc)}(${params.map((_,i)=>'$'+(i+1)).join(',')}) as value`,params.map(p=>req.args[p]));return{data:r.rows[0].value,error:null};}
 if(!TABLES.has(req.table))return{data:[],error:null};const values=[],param=v=>{values.push(v);return'$'+values.length;};let sql;
 const selection=req.select==='*'?'*':req.select.split(',').map(ident).join(',');
 if(req.insert){const keys=Object.keys(req.insert);sql=`insert into public.${ident(req.table)}(${keys.map(ident).join(',')}) values(${keys.map(k=>param(req.insert[k])).join(',')}) returning ${selection}`;}
 else{sql=`select ${selection} from public.${ident(req.table)}`;if(req.filters.length)sql+=' where '+req.filters.map(([k,v])=>ident(k)+'='+param(v)).join(' and ');if(req.order)sql+=' order by '+ident(req.order[0])+(req.order[1]?' asc':' desc');if(req.limit!=null)sql+=' limit '+param(req.limit);if(req.offset)sql+=' offset '+param(req.offset);}
 const r=await tx.query(sql,values);if(req.single){if(r.rows.length>1||req.single==='one'&&r.rows.length!==1)return{data:null,error:{code:'PGRST116',message:'Row count'}};return{data:r.rows[0]||null,error:null};}return{data:r.rows,error:null};
 });}catch(e){return{data:null,error:{message:e.message,code:e.code}};}}
function attachWorkshopAPI(page,asUser,uid){return page.exposeFunction('__workshopDB',req=>requestWorkshopDB(asUser,uid,req));}
async function installWorkshopClient(page,uid,name){await page.evaluate(({uid,name})=>{
 cloudPush=async()=>{};SBU={id:uid,email:'fixture@example.test'};P().name=name;P().bd=ACH.map(a=>a[0]);
 sb={from(table){const r={table,select:'*',filters:[],limit:null,offset:0};const b={select(v='*'){r.select=v;return b;},eq(k,v){r.filters.push([k,v]);return b;},order(k,{ascending=true}={}){r.order=[k,ascending];return b;},range(a,z){r.offset=a;r.limit=z-a+1;return b;},limit(n){r.limit=n;return b;},insert(v){r.insert=v;return b;},maybeSingle(){r.single='maybe';return b;},single(){r.single='one';return b;},then(ok,bad){return window.__workshopDB(r).then(ok,bad);}};return b;},rpc(name,args){return window.__workshopDB({rpc:name,args});}};
 sb.channel=function(){const ch={on(){return ch;},subscribe(callback){queueMicrotask(()=>callback?.('SUBSCRIBED'));return ch;},track:async()=> 'ok',send:async()=> 'ok',presenceState:()=>({}),unsubscribe:async()=> 'ok'};return ch;};sb.removeChannel=async ch=>ch.unsubscribe();
 $('splash').style.display='none';window.szGameAccountReady();
 },{uid,name});await page.waitForFunction(()=>COMMUNITY.ready&&!COMMUNITY_REFRESH);}
module.exports={attachWorkshopAPI,installWorkshopClient,requestWorkshopDB};
