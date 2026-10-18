const fs=require('node:fs'),path=require('node:path'),acorn=require('acorn'),{create}=require('../shared/locale.js');
const root=path.resolve(__dirname,'..'),en=create('en'),missing=new Set();let scripts=0;
for(const file of ['game-source/index.html','launcher/index.html']){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){
  scripts++;const ast=acorn.parse(m[1],{ecmaVersion:'latest'});if(m[1].includes('const pairs=`'))continue;
  function check(value){if(typeof value!=='string')return;for(const part of value.replace(/<[^>]*>/g,'\n').split('\n')){const s=part.trim();if(s.length>2&&s.length<1500&&!/[{}=;]/.test(s)&&/[ąćęłńóśźż]/i.test(en.t(s)))missing.add(s);}}
  function walk(n){if(!n||typeof n!=='object')return;if(n.type==='Literal')check(n.value);if(n.type==='TemplateElement')check(n.value.cooked);for(const[k,v]of Object.entries(n)){if(k==='value')continue;if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}}walk(ast);
 }
}
require('./embed-shared.cjs').sync(true);
if(missing.size){console.error('Missing English UI strings:',[...missing]);process.exitCode=1;}else console.log('Inline syntax, embedded modules and '+scripts+' scripts of English UI text checked.');
