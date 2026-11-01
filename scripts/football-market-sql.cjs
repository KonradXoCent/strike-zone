'use strict';
const fs=require('node:fs'),path=require('node:path'),D=require('../game/football-ultimate/data.js');
function sql(){return fs.readFileSync(path.join(__dirname,'../database/zone-football-market.sql'),'utf8').replace('-- PACK CATALOG INSERTED BY scripts/football-market-sql.cjs',`insert into zone_football_private.pack_catalog(id,data) values\n${D.packs.map(p=>`('${p.id}','${JSON.stringify(p).replace(/'/g,"''")}'::jsonb)`).join(',\n')}\non conflict(id) do update set data=excluded.data;`);}
if(require.main===module){if(process.argv[2])fs.writeFileSync(process.argv[2],sql());else process.stdout.write(sql());}module.exports={sql};
