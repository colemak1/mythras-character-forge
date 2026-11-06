// New item gifts: GM gives an item, the player sees a notice or full reveal
// once, and the player's own saves can't erase a gift.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),store=new Map();
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 document:{getElementById:()=>null,querySelector:()=>null,addEventListener(){},removeEventListener(){}},
 location:{hash:'#/',pathname:'/mythras-character-forge/',origin:'https://example.test'},
 supabase:{createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const name of ['data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
let passed=0;const test=async(name,fn)=>{await fn();passed++;console.log('PASS '+name);};
const form=v=>{ctx.document.getElementById=id=>id in v?(id==='giftReveal'?{checked:v[id]}:{value:v[id]}):null;};
run('render=()=>{};');
(async()=>{
await test('only the campaign GM can give an item, and the gift is validated',()=>{
 run('S=freshState();VIEW_ONLY=true;VIEW_ONLY_IS_DM=false;');form({giftName:'Ring',giftQty:'1',giftEnc:'0',giftCost:'0',giftNote:'',giftReveal:true});
 run('APP.gmGiveItem()');assert.equal(run('S.inventory.length'),0,'a teammate viewing the sheet cannot give');
 run('VIEW_ONLY_IS_DM=true;');form({giftName:'',giftQty:'1',giftEnc:'0',giftCost:'0'});run('APP.gmGiveItem()');assert.match(run('GIFT_MSG'),/Name the item/);
 form({giftName:'Rope',giftQty:'0',giftEnc:'0',giftCost:'0'});run('APP.gmGiveItem()');assert.match(run('GIFT_MSG'),/at least 1/);
 form({giftName:'Ring of the Drowned King',giftQty:'1',giftEnc:'0',giftCost:'250',giftNote:'From the shrine',giftReveal:true});run('APP.gmGiveItem()');
 const it=JSON.parse(run('JSON.stringify(S.inventory[0])'));
 assert.equal(it.name,'Ring of the Drowned King');assert.equal(it.cost,250);assert.equal(it.gift.reveal,true);assert.equal(it.gift.note,'From the shrine');assert(run('giftValid(S.inventory[0].gift)'));
 assert.equal(run('giftPopupHtml()'),'','the GM never sees the player pop-up');
});
await test('the player sees the full reveal once, then the plain notice for the next gift',()=>{
 run('S=freshState();VIEW_ONLY=false;VIEW_ONLY_IS_DM=false;APPVIEW="play";S.inventory=[{name:"Old rope",qty:1,enc:1,cost:0},{name:"Ring <b>",qty:1,enc:0,cost:250,gift:{id:"abc123",reveal:true,note:"From the shrine"}},{name:"Torch",qty:3,enc:1,cost:0,gift:{id:"def456",reveal:false,note:""}}];');
 let h=run('giftPopupHtml()');assert.match(h,/class="gift-reveal"/);assert.match(h,/Ring &lt;b&gt;/,'names are escaped');assert.match(h,/From the shrine/);assert.match(h,/1 more new item/);
 run('APP.giftSeen("abc123")');h=run('giftPopupHtml()');assert.match(h,/class="gift-toast"/);assert.match(h,/Torch/);assert.match(h,/×3/);
 run('APP.giftSeen("def456")');assert.equal(run('giftPopupHtml()'),'');
 assert.equal(run('S.inventory.length'),3,'seeing a gift keeps the item');
});
await test('a teammate viewing the sheet never gets the pop-up',()=>{
 run('S=freshState();VIEW_ONLY=true;APPVIEW="play";S.inventory=[{name:"Ring",qty:1,enc:0,cost:0,gift:{id:"abc123",reveal:true}}];');
 assert.equal(run('giftPopupHtml()'),'');run('APP.giftSeen("abc123")');assert.equal(run('S.inventory[0].gift.seen'),undefined);
});
await test('gifts on the account copy are merged in, sanitised, and a dropped gift never comes back',async()=>{
 run('S=freshState();VIEW_ONLY=false;S._libId="11111111-1111-4111-8111-111111111111";S.inventory=[{name:"Rope",qty:1,enc:1,cost:0}];var serverInv=[{name:"Rope",qty:1,enc:1,cost:0},{name:"Ring",qty:-5,enc:"x",cost:2,gift:{id:"abc123",reveal:true,note:"n",extra:1}},{name:"Bad",gift:{id:"!!"}}];sb.from=()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{state:{inventory:serverInv}}})})})});');
 assert.equal(await run('mergeServerGifts(S)'),1);
 const ring=JSON.parse(run('JSON.stringify(S.inventory[1])'));assert.equal(ring.name,'Ring');assert.equal(ring.qty,1);assert.equal(ring.enc,0);assert.equal(ring.gift.extra,undefined);
 assert.equal(await run('mergeServerGifts(S)'),0,'already held');
 run('S.inventory.splice(1,1);');assert.equal(await run('mergeServerGifts(S)'),0,'a gift the player dropped stays dropped');
});
await test("the owner's save pulls gifts in first, so it can't erase them",async()=>{
 run('MOCK_AUTH=null;AUTH_USER={id:"owner"};S=freshState();S.concept.name="Hero";S._libId="22222222-2222-4222-8222-222222222222";S._ownerId="owner";S.inventory=[];var sent=null;serverInv=[{name:"Map",qty:1,enc:0,cost:0,gift:{id:"map999",reveal:false}}];cloudUpsertCharacter=async e=>{sent=e.state;return {id:e.id};};');
 await run('saveToLibraryUnified(true,S)');
 assert.equal(run('sent.inventory.length'),1);assert.equal(run('sent.inventory[0].gift.id'),'map999');assert.equal(run('S.inventory[0].name'),'Map');
});
await test('a failed gift check never blocks the save',async()=>{
 run('S=freshState();S.concept.name="Hero";S._libId="33333333-3333-4333-8333-333333333333";S._ownerId="owner";sb.from=()=>({select:()=>({eq:()=>({maybeSingle:async()=>{throw new Error("offline")}})})});sent=null;');
 await run('saveToLibraryUnified(true,S)');assert.notEqual(run('sent'),null);
});
await test('the remembered gift list is cleaned on load',()=>{
 run('S=freshState();S.play.giftKnown=["abc123","<script>",5];normalizeState();');assert.deepEqual(JSON.parse(run('JSON.stringify(S.play.giftKnown)')),['abc123']);
});
console.log(passed+' gift tests passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
