'use strict';
const fs=require('node:fs'),path=require('node:path'),acorn=require('acorn'),{create}=require('../shared/locale.js');
const{interfaceStrings,polishRemainder}=require('./test-support/locale-audit.cjs');
const root=path.resolve(__dirname,'..'),en=create('en'),missing=new Set();let scripts=0;
// These forms are selected explicitly by the PL-only pluralization branch.
// Rendered English screens are checked separately for leaked PL forms.
const pluralForms=new Set(['zagranie','zagrania','polubienie','polubienia','sekunda','sekundy','sekund']);
function check(value){
 const parts=[...value.replace(/<[^>]*>/g,'\n').split('\n'),...[...value.matchAll(/(?:title|placeholder|aria-label|alt)\s*=\s*(["'])(.*?)\1/g)].map(m=>m[2])];
 for(const part of parts){const s=part.trim();if(s.length>2&&s.length<1500&&!pluralForms.has(s)&&polishRemainder(en.t(s)))missing.add(s);}
}
for(const file of ['game-source/index.html','launcher/index.html','launcher/launcher.js','scripts/preview-account.js']){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const inline=/<script\b[^>]*>([\s\S]*?)<\/script>/g;
 if(!file.endsWith('.js'))check(source.replace(inline,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,''));
 for(const m of file.endsWith('.js')?[[null,source]]:source.matchAll(inline)){
  scripts++;acorn.parse(m[1],{ecmaVersion:'latest'});if(m[1].includes('const pairs=`'))continue;
  for(const value of interfaceStrings(m[1]))check(value);
 }
}
require('./embed-shared.cjs').sync(true);
if(missing.size){console.error('Missing English UI strings:',[...missing]);process.exitCode=1;}else console.log('HTML text, attributes, embedded modules and '+scripts+' scripts of English UI text checked.');
