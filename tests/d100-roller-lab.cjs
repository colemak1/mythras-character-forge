'use strict';
// Run with: node tests/d100-roller-lab.cjs
// Exercises the independent Dice Lab without a browser or network access.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const page=fs.readFileSync(path.join(__dirname,'../experiments/d100-roller-lab.html'),'utf8');
const script=page.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const css=page.match(/<style>([\s\S]*?)<\/style>/)?.[1];
assert.ok(script&&css,'Standalone HTML has inline JS and CSS');
new Function(script);
let braces=0;for(const ch of css){if(ch==='{')braces++;if(ch==='}')braces--;}
assert.equal(braces,0,'CSS braces balanced');
let pass=0;function check(name,predicate){assert.ok(predicate,name);console.log('PASS',name);pass++;}
function stripped(s){return String(s).replace(/<[^>]*>/g,'');}
function fakeNode(){
 let html='',txt='';
 return {
   dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},
   get innerHTML(){return html;},set innerHTML(v){html=String(v);txt=stripped(v);},
   get textContent(){return txt;},set textContent(v){txt=String(v);html=String(v);},
   addEventListener(type,fn){this.handlers??={};this.handlers[type]=fn;},
   setAttribute(name,value){this.attributes??={};this.attributes[name]=value;},
   get offsetWidth(){return 1;}
 };
}
const nodes={grid:fakeNode(),selected:fakeNode(),target:fakeNode(),speed:fakeNode(),
 all:fakeNode(),edge1:fakeNode(),edge100:fakeNode()};
nodes.target.value='67';nodes.speed.value='1450';
const cards={};
function cardFor(id){
 if(cards[id])return cards[id];
 const visual=fakeNode(),out=fakeNode(),roll=fakeNode(),choose=fakeNode(),selection=fakeNode(),value=fakeNode();
 const digits={d0:fakeNode(),d1:fakeNode(),d2:fakeNode()};
 visual.querySelector=s=>s==='.value'?value:s==='.dial-pointer'?fakeNode():
   s.startsWith('.d')?digits[s.slice(1)]:null;
 const card=fakeNode();
 card.querySelector=s=>({
   '.visual':visual,'.rolled':out,'.roll':roll,'.choose':choose,'.selection':selection
 })[s]||null;
 card.state={visual,out,roll,choose,selection,value,digits};
 cards[id]=card;
 return card;
}
const sandbox={
 document:{getElementById(id){return id.startsWith('card-')?cardFor(id.slice(5)):nodes[id]||null;}},
 window:{matchMedia:()=>({matches:true})},
 self:{crypto:{getRandomValues(arr){arr[0]=42;}}},
 performance:{now:()=>0},
 localStorage:{getItem:()=>null,setItem(k,v){sandbox.stored={k,v};}},
 requestAnimationFrame(){return 1;},cancelAnimationFrame(){},
 setTimeout(){return 1;},clearTimeout(){}
};
vm.runInNewContext(script,sandbox,{filename:'d100-roller-lab-inline.js'});
const api=sandbox.window.diceLab;
check('Five distinct interactive roller styles render',
 api.styles.length===5 &&
 (nodes.grid.innerHTML.match(/<article class="card/g)||[]).length===5 &&
 new Set(api.styles).size===5);
check('Each roller has its own visual, roll and select controls',
 (nodes.grid.innerHTML.match(/class="visual /g)||[]).length===5 &&
 (nodes.grid.innerHTML.match(/class="secondary roll"/g)||[]).length===5 &&
 (nodes.grid.innerHTML.match(/class="choose"/g)||[]).length===5);
api.rollAll(100);
check('Roll all can share exactly 100 across all five styles',
 api.styles.every(id=>cards[id].state.out.innerHTML.includes('<strong>100</strong>')));
check('100 correctly reports above a 67% sample target',
 api.styles.every(id=>cards[id].state.out.innerHTML.includes('Above target (67%)')));
nodes.edge1.handlers.click();
check('01 edge-case control uses an exact 1 for all five',
 api.styles.every(id=>cards[id].state.out.innerHTML.includes('<strong>1</strong>')));
check('01 counts within the 67% threshold',
 api.styles.every(id=>cards[id].state.out.innerHTML.includes('Within target (67%)')));
api.choose('facet');
check('Selecting one style saves the choice without altering the simulator',
 sandbox.stored.k==='sitota-d100-lab-pick'&&sandbox.stored.v==='facet' &&
 nodes.selected.innerHTML.includes('Faceted Toss'));
check('Chosen option exposes aria-pressed without selecting the other options',
 cards.facet.state.choose.attributes['aria-pressed']==='true' &&
 cards.minimal.state.choose.attributes['aria-pressed']==='false');
nodes.target.value='1';nodes.target.handlers.change();
check('Changing target refreshes the sample interpretation on existing results',
 api.styles.every(id=>cards[id].state.out.innerHTML.includes('(1%)')));
nodes.all.handlers.click();
check('A fair random result is taken once and shared across all five',
 api.styles.every(id=>cards[id].state.out.innerHTML.includes('<strong>43</strong>')));
check('Individual roll buttons are enabled after each result',
 api.styles.every(id=>cards[id].state.roll.disabled===false));
check('The lab does not reference the live combat engine or modify rules',
 !page.includes('practice-combat-ux.css') &&
 page.includes('Practice Combat has not been changed.'));
check('Animations respect reduced-motion preferences',
 page.includes("prefers-reduced-motion:reduce") && script.includes('prefers-reduced-motion: reduce'));
console.log('Dice Lab UI smoke checks passed: '+pass+'.');