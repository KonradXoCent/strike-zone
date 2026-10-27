'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),root=path.join(__dirname,'..');
// Added phrases are kept in a small canonical file and merged idempotently.
const pairs=require('../shared/hub-locale.json');const file=path.join(root,'shared/locale-data.js');let data=fs.readFileSync(file,'utf8');const add=pairs.filter(p=>!data.includes(p.join('|'))).map(p=>p.join('|'));if(add.length){data=data.replace('const pairs=`','const pairs=`\n'+add.join('\n'));fs.writeFileSync(file,data);}
require('./embed-shared.cjs').sync();
if(['items.js','items.css','items.webp'].some(n=>!fs.existsSync(path.join(root,'platform/ui',n))))execFileSync(process.execPath,[path.join(__dirname,'hub-items.cjs')],{stdio:'inherit'});
