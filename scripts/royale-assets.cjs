'use strict';
const fs=require('node:fs'),path=require('node:path'),{createCanvas,loadImage}=require('@napi-rs/canvas');
async function generate(){const root=path.resolve(__dirname,'..'),image=await loadImage(fs.readFileSync(root+'/assets/royale-logo.svg')),canvas=createCanvas(256,256);canvas.getContext('2d').drawImage(image,0,0,256,256);const png=canvas.toBuffer('image/png'),ico=Buffer.alloc(22);ico.writeUInt16LE(1,2);ico.writeUInt16LE(1,4);ico.writeUInt16LE(1,10);ico.writeUInt16LE(32,12);ico.writeUInt32LE(png.length,14);ico.writeUInt32LE(22,18);fs.writeFileSync(root+'/assets/royale-icon.png',png);fs.writeFileSync(root+'/assets/royale-icon.ico',Buffer.concat([ico,png]));}
if(require.main===module)generate().catch(e=>{console.error(e.stack);process.exitCode=1;});module.exports=generate;
