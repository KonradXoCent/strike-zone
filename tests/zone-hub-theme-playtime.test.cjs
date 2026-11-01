'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{setup}=require('../scripts/test-support/wallet-db.cjs');
test('rate upgrade preserves past rewards and ownership, pays 5 once and supports new owned launcher themes',async()=>{
 const f=await setup(),[a]=f.ids;try{
  const upgrade=fs.readFileSync('database/zone-hub-theme-playtime.sql','utf8'),old=fs.readFileSync('database/zone-wallet.sql','utf8').replace("'rate_per_minute',5","'rate_per_minute',30").replace('(minutes-account.rewarded_minutes)*5,','(minutes-account.rewarded_minutes)*30,');await f.db.exec(old);
  await f.db.query('insert into saves values($1,$2,now())',[a,JSON.stringify({cur:'Main',profiles:{Main:{wallet:1000,skins:[]}}})]);
  const rpc=async(action,args={})=>(await f.as(a,'select zone_hub($1,$2::jsonb) value',[action,JSON.stringify({...args,walletProtocol:1})])).rows[0].value;
  await rpc('home');await rpc('add_game',{game_id:'strike-zone'});const run='22222222-0000-4000-8000-000000000032';await rpc('play_start',{id:run,game_id:'strike-zone'});
  await f.db.query("update zone_hub_private.play_sessions set last_tick=now()-interval '65 seconds' where id=$1",[run]);await rpc('play_tick',{id:run});assert.equal((await rpc('home')).wallet.balance,1030);
  await f.db.exec(upgrade);let home=await rpc('home');assert.equal(home.wallet.balance,1030);assert.equal(home.wallet.rate_per_minute,5);
  await f.db.query("update zone_hub_private.play_sessions set last_tick=now()-interval '65 seconds' where id=$1",[run]);await rpc('play_tick',{id:run});assert.equal((await rpc('home')).wallet.balance,1035);await rpc('play_tick',{id:run});await rpc('play_end',{id:run});assert.equal((await rpc('home')).wallet.balance,1035);
  assert.deepEqual((await f.db.query("select delta from zone_wallet_private.entries where user_id=$1 and reason='playtime' order by delta desc",[a])).rows.map(x=>Number(x.delta)),[30,5]);
  for(const id of['stadium','cyberpunk','winter'])assert(home.cosmetics.catalog.some(x=>x.id===id));
  await assert.rejects(rpc('theme_apply',{launcher:'cyberpunk'}),/HUB_COSMETIC_LOCKED/);await rpc('cosmetic_buy',{id:'cyberpunk'});await rpc('theme_apply',{launcher:'cyberpunk',profile:'cyberpunk'});home=await rpc('home');assert.equal(home.cosmetics.launcher,'cyberpunk');assert(home.cosmetics.owned.includes('cyberpunk'));assert.equal(home.wallet.balance,435);
  await rpc('theme_apply',{launcher:'cyberpunk'});assert.equal((await rpc('home')).wallet.balance,435);
 }finally{await f.db.close();}
});
