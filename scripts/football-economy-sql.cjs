'use strict';
const fs=require('node:fs'),path=require('node:path'),D=require('../game/football-ultimate/data.js');
function sql(){const source=fs.readFileSync(path.join(__dirname,'../database/zone-football.sql'),'utf8');const insert='insert into zone_football_private.players(id,data) values\n'+D.players.map(p=>"('"+p.id+"','"+JSON.stringify(p).replace(/'/g,"''")+"'::jsonb)").join(',\n')+'\non conflict(id) do update set data=excluded.data;';const starter='array['+D.starter.map(id=>"'"+id+"'").join(',')+']';return source.replace('-- CATALOG INSERTED BY scripts/football-economy-sql.cjs',insert).replace(/array\['zf-001'[^;]+\]/,starter);}
if(require.main===module){if(process.argv[2])fs.writeFileSync(process.argv[2],sql());else process.stdout.write(sql());}module.exports={sql};
