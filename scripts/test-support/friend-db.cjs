const {PGlite}=require('@electric-sql/pglite'),fs=require('node:fs'),path=require('node:path');
const IDS=['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003'];
async function fixture(){const db=new PGlite();await db.exec(`create role anon;create role authenticated;create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
grant usage on schema auth to anon,authenticated;
create table public.friends(user_id uuid references auth.users(id),friend_id uuid references auth.users(id),name text,primary key(user_id,friend_id));
create table public.leaderboard(user_id uuid primary key,name text,avimg text);
alter table friends enable row level security;create policy own_friends on friends to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());grant all on friends to authenticated;
insert into auth.users values('${IDS[0]}'),('${IDS[1]}'),('${IDS[2]}');
insert into leaderboard values('${IDS[0]}','KonradQA',null),('${IDS[1]}','Play',null),('${IDS[2]}','Gamma',null);`);
await db.exec(fs.readFileSync(path.resolve(__dirname,'../../database/friends.sql'),'utf8'));let queue=Promise.resolve();
const as=(id,sql,params=[])=>{const task=queue.then(()=>db.transaction(async tx=>{await tx.exec('set local role '+(id?'authenticated':'anon'));await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,role:id?'authenticated':'anon'})]);return tx.query(sql,params);}));queue=task.catch(()=>{});return task;};
return{db,ids:IDS,as,rpc:async(id,action,args={})=>(await as(id,'select public.sz_friends($1,$2::jsonb) as value',[action,JSON.stringify(args)])).rows[0].value};}
module.exports={fixture,IDS};
