const {PGlite}=require('@electric-sql/pglite'),fs=require('node:fs'),path=require('node:path');
const USERS={author:'10000000-0000-4000-8000-000000000001',admin:'10000000-0000-4000-8000-000000000002',other:'10000000-0000-4000-8000-000000000003'};
const OWNER_CODE='3'.repeat(64);
function mapProject(id='00000000-0000-4000-8000-000000000010'){return{kind:'sz-map',version:1,id,name:'Arena testowa',width:1536,height:1024,theme:'industrial',walls:[[448,160,32,256],[448,608,32,256],[1056,160,32,256],[1056,608,32,256],[704,352,128,32],[704,640,128,32]],covers:[[576,176,64,64],[896,784,64,64],[704,480,96,64]],windows:[],spawns:[[96,448,160,128],[1280,448,160,128]],sites:[[688,144,160,128],[688,752,160,128]]};}
function skinProject(id='00000000-0000-4000-8000-000000000011'){return{kind:'sz-skin',version:1,id,name:'Skin testowy',weapon:'knife',model:'kukri',pattern:'fade',colors:['#e87561','#c76bad','#7963cf'],strokes:[]};}
async function createWorkshopDB(){const db=new PGlite();await db.exec(`
create role anon;create role authenticated;create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
grant usage on schema auth to anon,authenticated;
create table public.saves(user_id uuid primary key references auth.users(id),json jsonb,updated_at timestamptz);
alter table public.saves enable row level security;grant select,insert,update on public.saves to authenticated;create policy saves_own on public.saves to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create table public.leaderboard(user_id uuid primary key references auth.users(id),name text,av text);
grant select on public.leaderboard to anon,authenticated;
insert into auth.users(id) values('${USERS.author}'),('${USERS.admin}'),('${USERS.other}');
insert into public.leaderboard(user_id,name) values('${USERS.author}','Autor'),('${USERS.admin}','Właściciel'),('${USERS.other}','Gracz');
`);await db.exec(fs.readFileSync(path.resolve(__dirname,'../../database/workshop.sql'),'utf8'));await db.query("insert into sz_workshop_private.owner_invite(token_hash,expires_at) values(sha256(convert_to($1,'UTF8')),now()+interval '7 days')",[OWNER_CODE]);
await db.exec(fs.readFileSync(path.resolve(__dirname,'../../database/community-case.sql'),'utf8'));
for(const file of fs.readdirSync(path.resolve(__dirname,'../../supabase/migrations')).filter(n=>n.endsWith('_launcher_friends_and_workshop_limits.sql')))await db.exec(fs.readFileSync(path.resolve(__dirname,'../../supabase/migrations',file),'utf8'));
let queue=Promise.resolve();function asUser(uid,fn,claims={}){const run=queue.then(()=>db.transaction(async tx=>{await tx.exec('set local role '+(uid?'authenticated':'anon'));await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:uid,role:uid?'authenticated':'anon',...claims})]);return fn(tx);}));queue=run.catch(()=>{});return run;}
return{db,asUser};}
module.exports={createWorkshopDB,USERS,OWNER_CODE,mapProject,skinProject};
