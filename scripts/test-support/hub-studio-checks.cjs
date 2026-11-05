'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
module.exports=async({page,app,db})=>{
 await page.evaluate(()=>H.navigate('studio'));
 await page.locator('[data-act=studio-edit]').waitFor();
 const newWindow=app.waitForEvent('window');
 await page.locator('[data-act=studio-edit]').click();
 const editor=await newWindow;await editor.locator('[data-command=game][data-id=football]').click();
 assert.equal(await editor.evaluate(()=>typeof window.zoneStudioCloud.catalog),'function');
 assert.equal(await editor.evaluate(()=>typeof require),'undefined');
 await editor.locator('[data-command=cloud-refresh]').click();
 await editor.waitForFunction(()=>document.querySelectorAll('[data-cloud-pick] option').length===8);
 await editor.locator('[data-command=add-pack]').click();
 await editor.locator('[data-pack=name]').fill('Paczka testowa QA');
 await editor.locator('[data-command=cloud-save]').click();
 await editor.waitForFunction(()=>document.querySelector('#notification')?.textContent.includes('zapisana w sklepie online'));
 const saved=(await db.db.query("select id,active from zone_football_private.pack_catalog where data->>'name'='Paczka testowa QA'")).rows[0];
 assert(saved?.active);await editor.locator('[data-command=cloud-withdraw]').click();
 await editor.waitForFunction(()=>document.querySelector('#notification')?.textContent.includes('wycofana ze sklepu'));
 assert.equal((await db.db.query('select active from zone_football_private.pack_catalog where id=$1',[saved.id])).rows[0].active,false);
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()==='zonehub://app/platform/studio/index.html')?.close());
 const html='<!doctype html><title>Ostatnia Noc QA</title><p id="night-game">Gra działa</p>',file=path.join(os.tmpdir(),'zone-night-studio-qa.zonegame');
 fs.writeFileSync(file,JSON.stringify({schema:'zone-studio-build-1',gameId:'night',modeId:'mode-test',name:'Ostatnia Noc QA',project:'Test',baseVersion:'0.1.0',version:'0.1.0',html,sha256:crypto.createHash('sha256').update(html).digest('hex')}));
 try{
  await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);
  await page.locator('[data-act=studio-import]').click();await page.locator('[data-studio-play][data-game=night]').waitFor();
  const gamePromise=app.waitForEvent('window');await page.locator('[data-studio-play][data-game=night]').click();const game=await gamePromise;
  await game.locator('#night-game').waitFor();assert.equal(await game.evaluate(()=>typeof require),'undefined');assert.equal(await game.evaluate(()=>typeof window.zoneStudioCloud),'undefined');
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()==='zonehub://studio/game.html')?.close());
 }finally{fs.rmSync(file,{force:true});}
 console.log('PASS: Zone Studio opens in Hub; owner refreshes, adds and withdraws a pack against the isolated database');
};
