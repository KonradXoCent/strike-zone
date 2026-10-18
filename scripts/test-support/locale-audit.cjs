'use strict';
const acorn=require('acorn'),pairs=require('../../shared/locale-data.js');
const words=text=>(String(text).toLocaleLowerCase('pl').match(/[\p{L}]{3,}/gu)||[]);
const english=new Set([...pairs.flatMap(p=>words(p[1])),'legit','bombsite']),polishOnly=new Set(pairs.flatMap(p=>words(p[0])).filter(w=>!english.has(w)));
const polish=new Set(pairs.flatMap(p=>words(p[0]))),englishOnly=new Set([...english].filter(w=>!polish.has(w)));
function polishRemainder(text){return /[ąćęłńóśźż]/i.test(text)||words(text).some(w=>polishOnly.has(w));}
function englishRemainder(text){return words(text).some(w=>englishOnly.has(w));}
function interfaceStrings(source){const ast=acorn.parse(source,{ecmaVersion:'latest'}),strings=[];
 function visit(node){if(!node||typeof node!=='object')return;if(node.type==='Literal'&&typeof node.value==='string')strings.push(node.value);else if(node.type==='TemplateElement')strings.push(node.value.cooked||'');
  // Property.value is another AST node. Skipping every key named "value"
  // silently misses map descriptions and all other object-valued UI data.
  for(const value of Object.values(node))if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);
 }visit(ast);return strings;
}
module.exports={interfaceStrings,polishRemainder,englishRemainder};
