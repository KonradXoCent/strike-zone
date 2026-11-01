'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{setup}=require('../scripts/test-support/wallet-db.cjs'),D=require('../game/football-ultimate/data.js');
test('Football ownership, starter, packs, squad and private room use authoritative shared wallet',async()=>{const f=await setup({progression:true}),[a,b,c]=f.ids;try{
 await f.db.exec(require('../scripts/football-economy-sql.cjs').sql());
 for(const id of f.ids)await f.db.query('insert into saves values($1,$2,now())',[id,JSON.stringify({cur:'Main',profiles:{Main:{wallet:id===c?10:3000,skins:[],royale:{wallet:0}}}})]);
 const hub=async(id,action,args={})=>(await f.as(id,'select zone_hub($1,$2::jsonb) v',[action,JSON.stringify({...args,walletProtocol:1})])).rows[0].v;
 const rpc=async(id,action,args={})=>(await f.as(id,'select zone_football($1,$2::jsonb) v',[action,JSON.stringify(args)])).rows[0].v;
 await assert.rejects(rpc(null,'state'),/HUB_LOGIN|permission denied/);await assert.rejects(rpc(a,'state'),/FOOTBALL_OWNERSHIP/);
 await hub(a,'home');await assert.rejects(hub(a,'add_game',{game_id:'zone-football',purchasePrice:0}),/PRICE|PURCHASE/);
 for(const id of[a,b])await hub(id,'add_game',{game_id:'zone-football',purchasePrice:50});
 assert.equal((await hub(a,'home')).wallet.balance,2950);await hub(a,'add_game',{game_id:'zone-football',purchasePrice:50});assert.equal((await hub(a,'home')).wallet.balance,2950);
 let s=await rpc(a,'state');assert.equal(s.club.cards.length,18);assert.equal(new Set(s.club.cards.map(c=>c.player_id)).size,18);assert.equal(s.club.squad.length,18);assert.deepEqual(s.club.cards.map(c=>c.player_id),D.starter);
 const starter=s.club.squad;assert.equal((await rpc(a,'state')).club.cards.length,18);const nonce=randomUUID();s=await rpc(a,'buy_pack',{pack:'gold',nonce,price:0,rating:99});assert.equal(s.wallet.balance,2450);assert.equal(s.pulled.length,3);for(const card of s.pulled)assert(['gold','elite'].includes(D.byId[card.player_id].tier));
 const retry=await rpc(a,'buy_pack',{pack:'gold',nonce});assert.deepEqual(retry.pulled,s.pulled);assert.equal(retry.wallet.balance,2450);assert.equal(retry.club.cards.length,21);await assert.rejects(rpc(a,'buy_pack',{pack:'bronze',nonce}),/FOOTBALL_NONCE/);await assert.rejects(rpc(a,'buy_pack',{pack:'free',nonce:randomUUID()}),/FOOTBALL_PACK/);
 const before=(await hub(a,'home')).wallet.balance;await assert.rejects(rpc(c,'buy_pack',{pack:'gold',nonce:randomUUID()}),/FOOTBALL_OWNERSHIP/);
 const bad=[...starter];[bad[0],bad[1]]=[bad[1],bad[0]];await assert.rejects(rpc(a,'squad',{name:'My club',formation:'4-3-3',squad:bad}),/FOOTBALL_KEEPER/);
 await assert.rejects(rpc(a,'squad',{name:'My club',formation:'4-3-3',squad:starter.map(()=>starter[0])}),/FOOTBALL_SQUAD/);
 const good=[...starter];[good[8],good[17]]=[good[17],good[8]];s=await rpc(a,'squad',{name:'My club',formation:'4-4-2',squad:good});assert.equal(s.club.name,'My club');assert.equal(s.club.formation,'4-4-2');assert.deepEqual(s.club.squad,good);
 await assert.rejects(f.as(a,'select * from zone_football_private.clubs'),/permission denied/);await assert.rejects(f.as(a,'select zone_football_private.public_club($1)',[b]),/permission denied/);
 await rpc(b,'state');const room=await rpc(a,'room_create'),joined=await rpc(b,'room_join',{code:room.code});assert.equal(room.topic,joined.topic);assert.equal(joined.host.roster.length,18);assert.equal(joined.guest.roster.length,18);assert(!('cards'in joined.host));await assert.rejects(rpc(c,'room_state',{id:room.id}),/FOOTBALL_OWNERSHIP/);
 await rpc(a,'progress',{progress:{'zone-league':{round:1,points:3}}});assert.equal((await rpc(a,'state')).club.progress['zone-league'].points,3);assert.equal((await hub(a,'home')).wallet.balance,before);
 await rpc(b,'room_leave',{id:room.id});assert.equal((await rpc(a,'room_state',{id:room.id})).guest_id,null);await rpc(a,'room_leave',{id:room.id});await assert.rejects(rpc(b,'room_state',{id:room.id}),/FOOTBALL_ROOM/);
 // Failed debit rolls back both receipt and collection, including a retry with the same nonce.
 await f.db.query('update zone_wallet_private.accounts set balance=10 where user_id=$1',[b]);const failNonce=randomUUID();await assert.rejects(rpc(b,'buy_pack',{pack:'gold',nonce:failNonce}),/WALLET_FUNDS/);assert.equal((await rpc(b,'state')).club.cards.length,18);assert.equal((await f.db.query('select count(*)::int n from zone_football_private.packs where user_id=$1',[b])).rows[0].n,0);
}finally{await f.db.close();}});
