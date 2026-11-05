// Loaded before the arena runtime. Only validates a disposable profile; it
// has no access to the Forge save API and never writes character state.
window.readPracticeCharacter=function(){
  if(typeof location==='undefined'||!new URLSearchParams(location.search).has('forge'))return null;
  try{
    const raw=sessionStorage.getItem('sitota-practice-character-v1');
    if(!raw||raw.length>100000)throw Error('missing profile');
    const p=JSON.parse(raw),locs=['Head','Chest','Abdomen','Right Arm','Left Arm','Right Leg','Left Leg'];
    const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
    const label=n=>typeof n==='string'&&n.length<=200;
    if(p.version!==1||!label(p.name)||!label(p.player)||!integer(p.apMax,1,20)||!integer(p.init,0,100)||!integer(p.armourInitPenalty,0,100))throw Error('invalid profile');
    if(!['STR','SIZ','CON','DEX','INT'].every(k=>integer(p.chars?.[k],1,100))||p.chars.STR+p.chars.SIZ>130)throw Error('invalid characteristics');
    if(!locs.every(l=>integer(p.hp?.[l],1,999)&&integer(p.armour?.[l],0,100)))throw Error('invalid locations');
    if(!['Evade','Brawn','Endurance','Athletics','First Aid','Willpower'].every(k=>integer(p.skills?.[k],0,10000)))throw Error('invalid skills');
    if(!Array.isArray(p.styles)||p.styles.length>100||!p.styles.every(s=>label(s.key)&&label(s.name)&&integer(s.percent,0,10000)&&Array.isArray(s.traits)&&s.traits.every(label)&&Array.isArray(s.weapons)&&s.weapons.every(w=>label(w.name)&&['sword','spear','mace','dagger','greatsword'].includes(w.key))&&Array.isArray(s.shields)&&s.shields.every(w=>label(w.name)&&['buckler','heater','hoplite'].includes(w.key))))throw Error('invalid styles');
    if(!Array.isArray(p.unsupportedGear)||!p.unsupportedGear.every(label))throw Error('invalid equipment');
    return p;
  }catch(e){return {error:'Your practice character could not be loaded. Return to My Characters and choose Practice Combat again.'};}
};
