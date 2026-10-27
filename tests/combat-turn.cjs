const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={console,setTimeout,clearTimeout,setInterval,clearInterval,URL,Date,Map,Set,WeakMap,
 localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
 document:{getElementById:()=>null,querySelector:()=>null,addEventListener(){},removeEventListener(){}},
 location:{hash:'#/'},supabase:{createClient:()=>({auth:{signOut:async()=>({})}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.addEventListener=()=>{};ctx.scrollTo=()=>{};vm.createContext(ctx);
for(const name of ['data','engine','cloud','render','router','play','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
run('render=()=>{};syncRouteFromState=()=>{};sessionStateCampaignUnified=async()=>{};CAMPAIGN_VIEW={campaign:{id:"camp",session_state:{round:1,cycle:1,turnIdx:0,combatants:[combatantFromNpc("A",20,"a"),combatantFromNpc("B",10,"b"),combatantFromNpc("C",5,"c")]}}};');
run('APP.gmAdvanceTurn();');assert.equal(run('CAMPAIGN_VIEW.campaign.session_state.activeId'),'b');
run('APP.gmSetInit("c",30);');assert.equal(run('CAMPAIGN_VIEW.campaign.session_state.activeId'),'b');
assert.match(run('gmToolsHTML(CAMPAIGN_VIEW.campaign)'),/Acting:<\/b> B/);
run('APP.gmRemoveCombatant("b");');assert.equal(run('CAMPAIGN_VIEW.campaign.session_state.activeId'),'c');
run('CAMPAIGN_VIEW.campaign.session_state.combatants[0].ap.used=1;APP.gmAdvanceTurn();');
assert.equal(run('CAMPAIGN_VIEW.campaign.session_state.combatants[0].ap.used'),1);
run('APP.gmNewRound();');assert.equal(run('CAMPAIGN_VIEW.campaign.session_state.combatants[0].ap.used'),0);
assert.equal(run('CAMPAIGN_VIEW.campaign.session_state.activeId'),'c');
console.log('PASS active combatant survives initiative edits and removal; AP restores only on new round');
