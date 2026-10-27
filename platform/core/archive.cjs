'use strict';
const fs=require('node:fs'),fsp=fs.promises,path=require('node:path'),zlib=require('node:zlib'),{pipeline}=require('node:stream/promises'),{Transform,Readable}=require('node:stream');
const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crcStep(crc,b){for(const n of b)crc=crcTable[(crc^n)&255]^(crc>>>8);return crc;}
function safeEntry(name){if(!name||name.length>240||/[\x00-\x1f\\:]/.test(name)||name.startsWith('/')||name.split('/').some(p=>p==='..'||p==='.'||/[. ]$/.test(p)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(p)))throw Error('PACKAGE_PATH');return name;}
async function extract(file,destination){const h=await fsp.open(file,'r'),entries=[];try{
 const stat=await h.stat(),length=Math.min(stat.size,65557),tail=Buffer.alloc(length);await h.read(tail,0,length,stat.size-length);let end=-1;
 for(let p=tail.length-22;p>=0;p--)if(tail.readUInt32LE(p)===0x06054b50&&p+22+tail.readUInt16LE(p+20)===tail.length){end=p;break;}
 if(end<0||tail.readUInt16LE(end+4)||tail.readUInt16LE(end+6))throw Error('PACKAGE_ZIP');
 const count=tail.readUInt16LE(end+10),size=tail.readUInt32LE(end+12),offset=tail.readUInt32LE(end+16);if(count<1||count>30000||size>12e6||offset+size>stat.size-length+end)throw Error('PACKAGE_ZIP');
 const dir=Buffer.alloc(size);await h.read(dir,0,size,offset);let pos=0,total=0;const names=new Set();
 for(let i=0;i<count;i++){if(pos+46>dir.length||dir.readUInt32LE(pos)!==0x02014b50)throw Error('PACKAGE_ZIP');
  const flags=dir.readUInt16LE(pos+8),method=dir.readUInt16LE(pos+10),crc=dir.readUInt32LE(pos+16),packed=dir.readUInt32LE(pos+20),bytes=dir.readUInt32LE(pos+24),nl=dir.readUInt16LE(pos+28),el=dir.readUInt16LE(pos+30),cl=dir.readUInt16LE(pos+32),attrs=dir.readUInt32LE(pos+38),local=dir.readUInt32LE(pos+42);
  if(pos+46+nl+el+cl>size||flags&1||![0,8].includes(method)||[bytes,packed,local].includes(0xffffffff)||(attrs>>>16&0xf000)===0xa000)throw Error('PACKAGE_ZIP');
  const name=safeEntry(dir.subarray(pos+46,pos+46+nl).toString('utf8')),key=name.replace(/\/$/,'').toLowerCase();if(names.has(key)||bytes>1.2e9||(total+=bytes)>2e9||local+30+packed>offset)throw Error('PACKAGE_LIMIT');names.add(key);
  const header=Buffer.alloc(30);await h.read(header,0,30,local);if(header.readUInt32LE(0)!==0x04034b50||header.readUInt16LE(8)!==method)throw Error('PACKAGE_ZIP');const data=local+30+header.readUInt16LE(26)+header.readUInt16LE(28);if(data+packed>offset)throw Error('PACKAGE_ZIP');entries.push({name,data,packed,bytes,method,crc});pos+=46+nl+el+cl;
 }if(pos!==dir.length)throw Error('PACKAGE_ZIP');
 }finally{await h.close();}await fsp.mkdir(destination,{recursive:true});
 for(const e of entries){const target=path.join(destination,e.name);if(e.name.endsWith('/')){await fsp.mkdir(target,{recursive:true});continue;}await fsp.mkdir(path.dirname(target),{recursive:true});let count=0,crc=0xffffffff;const check=new Transform({transform(b,_enc,cb){count+=b.length;if(count>e.bytes)return cb(Error('PACKAGE_LIMIT'));crc=crcStep(crc,b);cb(null,b);}});const source=e.packed?fs.createReadStream(file,{start:e.data,end:e.data+e.packed-1}):Readable.from([]),streams=[source];if(e.method===8)streams.push(zlib.createInflateRaw());streams.push(check,fs.createWriteStream(target,{flags:'wx'}));await pipeline(...streams);if(count!==e.bytes||((crc^0xffffffff)>>>0)!==e.crc)throw Error('PACKAGE_CHECKSUM');}
 return entries.length;
}
module.exports={extract,safeEntry,crcStep};
