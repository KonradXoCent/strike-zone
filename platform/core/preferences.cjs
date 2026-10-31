'use strict';
const themes=require('../../shared/hub-cosmetics.js').themeIds;
function settings(v={}){
 if(!v||typeof v!=='object'||Array.isArray(v))v={};
 return {
  games:Object.fromEntries(Object.entries(v.games&&typeof v.games==='object'?v.games:{}).filter(([id,value])=>/^[a-z0-9-]{1,48}$/.test(id)&&typeof value?.fullscreen==='boolean').slice(0,100).map(([id,value])=>[id,{fullscreen:value.fullscreen}])),
  language:['pl','en'].includes(v.language)?v.language:'pl',theme:themes.includes(v.theme)?v.theme:'violet',
  minimizeOnPlay:v.minimizeOnPlay!==false,fullscreen:v.fullscreen!==false,
  accent:typeof v.accent==='string'&&/^#[0-9a-f]{6}$/i.test(v.accent)?v.accent.toLowerCase():'theme',
  density:v.density==='comfortable'?'comfortable':'compact',showFriends:v.showFriends!==false,
  reduceMotion:v.reduceMotion===true,highContrast:v.highContrast===true,backgroundGlow:v.backgroundGlow!==false,
  favorites:[...new Set((Array.isArray(v.favorites)?v.favorites:[]).filter(id=>typeof id==='string'&&/^[a-z0-9][a-z0-9-]{0,47}$/.test(id)))].slice(0,100)
 };
}
module.exports={settings};
