const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..'),store=new Map();
const ctx={console,URL,Date,Map,Set,WeakMap,setTimeout,clearTimeout,setInterval,clearInterval,
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}},
 location:{hash:'#/'},supabase:{createClient:()=>({auth:{signOut:async()=>({})}})},requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.addEventListener=()=>{};ctx.scrollTo=()=>{};vm.createContext(ctx);
for(const name of ['data','engine','cloud','render','router','play','app']){let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');if(name==='app')src=src.replace(/boot\(\);\s*$/,'');vm.runInContext(src,ctx,{filename:name+'.js'});}
const run=s=>vm.runInContext(s,ctx);run('render=()=>{};');
(async()=>{
 run('AUTH_USER=null;MOCK_AUTH={id:"local"};APPVIEW="campaigns";APP.newCampaign()');
 assert.equal(run('APPVIEW'),'campaign-setup');assert.equal(run('currentRoute()'),'/campaign/new');assert.match(run('campaignSetupHTML()'),/Permanent improvement|permanent improvement/);assert.match(run('campaignSetupHTML()'),/do not add or enable/);
 assert.equal(run('parseRoute("#/campaign/id/settings").view'),'campaign-setup');
 const fields={setupCampaignName:{value:'The Vale'},setupImprovement:{value:'permanent'},setupOtherBooks:{value:'House Guide'}};
 ctx.document.getElementById=id=>fields[id]||null;
 ctx.document.querySelectorAll=()=>[{value:'Mythic Babylon'}];
 await run('APP.saveCampaignSetup()');
 assert.equal(run('APPVIEW'),'campaign');assert.equal(run('CAMPAIGN_VIEW.campaign.name'),'The Vale');
 assert.equal(run('CAMPAIGN_VIEW.campaign.rules_settings.characteristicImprovement'),'permanent');
 assert.deepEqual(Array.from(run('CAMPAIGN_VIEW.campaign.rules_settings.books')),['Mythic Babylon','House Guide']);
 await run('var camp,cid;createCampaignUnified("Campaign",{characteristicImprovement:"permanent",books:["Mythic Babylon"]}).then(c=>{camp=c;cid=c.id;})');
 assert.equal(run('normalizeLocalCampaign(getCampaignLocal(cid)).rules_settings.characteristicImprovement'),'permanent');
 await run('sessionStateCampaignUnified(cid,{combatants:[],round:4});saveCampaignRulesUnified(camp,{characteristicImprovement:"training",books:["M-Space"]})');
 assert.equal(run('getCampaignLocal(cid).sessionState.round'),4);assert.equal(run('getCampaignLocal(cid).rulesSettings.books[0]'),'M-Space');
 run('S=freshState();S.campaignId=cid;S.chars={STR:12,CON:12,SIZ:12,DEX:12,INT:12,POW:12,CHA:12};S.xp.pool=30;VIEW_ONLY=false;');
 await run('APP.xpCharacteristicPermanent("STR",true)');assert.equal(run('S.xp.pool'),30);assert.match(run('XP_CHAR_MSG'),/GM has selected/);
 await run('APP.xpCharacteristicTrain("STR",true)');assert.equal(run('effectiveChars().STR'),14);
 await run('saveCampaignRulesUnified(camp,{characteristicImprovement:"permanent",books:[]})');
 await run('APP.xpCharacteristicTrain("DEX",true)');assert.equal(run('effectiveChars().DEX'),12);
 await run('APP.xpCharacteristicPermanent("DEX",true)');assert.equal(run('effectiveChars().DEX'),13);
 run('CHARACTER_CAMPAIGN_RULES={id:cid,status:"ready",rules:{characteristicImprovement:"permanent",books:[]}}');
 assert.doesNotMatch(run('xpModalHtml()'),/Add training step/);assert.match(run('xpModalHtml()'),/Buy permanent/);
 run('var before=JSON.stringify(S);loadCampaignRowUnified=async()=>{throw Error("offline")};');
 await run('APP.xpCharacteristicPermanent("STR",true)');assert.equal(run('JSON.stringify(S)'),run('before'));assert.match(run('XP_CHAR_MSG'),/could not be loaded/);
 run('S.campaignId=null;APP.xpCharacteristicTrain("DEX",true)');assert.equal(run('effectiveChars().DEX'),15);
 run('AUTH_USER={id:"player"};MOCK_AUTH=null;CAMPAIGN_VIEW={campaign:{id:"camp",dm_id:"dm"}};APPVIEW="campaign";APP.editCampaignRules()');assert.equal(run('APPVIEW'),'campaign');
 console.log('PASS campaign setup, routes, rule enforcement, offline failure, legacy isolation, and GM guard');
})().catch(e=>{console.error(e);process.exit(1)});
