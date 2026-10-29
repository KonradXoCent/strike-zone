'use strict';
// Standalone Haunt preparation must not depend on building another game first.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
function prepare(){
 const sdkRoot=path.join(root,'node_modules/@supabase/supabase-js'),target=path.join(root,'vendor');
 const dependency=JSON.parse(fs.readFileSync(path.join(sdkRoot,'package.json'),'utf8'));
 if(dependency.version!=='2.45.4')throw Error('Expected the pinned Supabase SDK 2.45.4');
 fs.mkdirSync(target,{recursive:true});
 fs.copyFileSync(path.join(sdkRoot,'dist/umd/supabase.js'),path.join(target,'supabase.js'));
 fs.copyFileSync(path.join(sdkRoot,'LICENSE'),path.join(target,'SUPABASE-LICENSE.txt'));
}
if(require.main===module){prepare();console.log('Zone Haunt prepared with local Supabase SDK 2.45.4');}
module.exports={prepare};
