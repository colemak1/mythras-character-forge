"use strict";
/* ================= RULES WIKI (render) =================
   Data lives in wiki-data.js (Core chapter index and its source notice)
   -- see the licensing note at the top of that file. This file is just the
   browsing/search UI over it: a chapter grid, a recursively-rendered
   chapter article (headings/paragraphs/lists/tables), and a live search box.
   WIKI_CHAPTER holds the open Core chapter id, or null for the chapter grid. */
let WIKI_CHAPTER=null;
function wikiAllChapters(){
  return WIKI_IMPERATIVE.map(c=>({id:c.id,title:c.title,source:"imperative",node:c}))
   .concat(WIKI_CORE_ONLY.map(c=>({id:c.id,title:c.title,source:"core",node:c})));
}
function wikiFindChapter(id){return WIKI_IMPERATIVE.find(c=>c.id===id)||null;}
function wikiFindCoreStub(id){return WIKI_CORE_ONLY.find(c=>c.id===id)||null;}

/* ---- search index: built once (lazily), then just filtered per keystroke.
   Each entry is one node of the tree (a chapter or any of its nested
   sections) flattened with its own text plus a breadcrumb trail, so a hit
   three subsections deep still tells you where it lives. ---- */
let WIKI_SEARCH_INDEX=null;
function wikiNodeText(node){
  return [node.title].concat((node.blocks||[]).map(b=>{
    if(b.t==="table")return (b.caption||"")+" "+b.rows.map(r=>r.join(" ")).join(" ");
    if(b.t==="ul")return b.items.join(" ");
    return b.text||"";
  })).join(" ");
}
function wikiBuildIndex(){
  const idx=[];
  function walk(node,chapterId,crumbs){
    idx.push({chapterId,sectionId:node.id,title:node.title,crumbs:crumbs.slice(),source:"imperative",
      blob:wikiNodeText(node).toLowerCase()});
    (node.sections||[]).forEach(s=>walk(s,chapterId,crumbs.concat(node.title)));
  }
  WIKI_IMPERATIVE.forEach(ch=>walk(ch,ch.id,[]));
  WIKI_CORE_ONLY.forEach(c=>idx.push({chapterId:c.id,sectionId:c.id,title:c.title,crumbs:[],source:"core",
    blob:(c.title+" "+c.blurb+" "+c.topics.join(" ")).toLowerCase()}));
  return idx;
}
function wikiSearchIndex(){if(!WIKI_SEARCH_INDEX)WIKI_SEARCH_INDEX=wikiBuildIndex();return WIKI_SEARCH_INDEX;}
function wikiSearchResults(q){
  q=q.trim().toLowerCase();if(!q)return [];
  const titleHits=[],bodyHits=[];
  wikiSearchIndex().forEach(e=>{
    if(e.title.toLowerCase().includes(q))titleHits.push(e);
    else if(e.blob.includes(q))bodyHits.push(e);
  });
  return titleHits.concat(bodyHits).slice(0,40);
}
// Pure DOM patch, not routed through render() -- same reasoning as
// pmFxFilter in play.js: rebuilding #main on every keystroke would tear out
// and rebuild the search <input> itself, losing focus mid-word. This only
// ever touches the sibling results/browse containers.
function wikiSearch(q){
  const resultsEl=$("#wikiSearchResults"),browseEl=$("#wikiBrowseArea");
  if(!resultsEl||!browseEl)return;
  if(!q.trim()){resultsEl.style.display="none";resultsEl.innerHTML="";browseEl.style.display="";return;}
  const results=wikiSearchResults(q);
  resultsEl.innerHTML=results.length?results.map(wikiResultRowHTML).join(""):'<p class="note">No matches.</p>';
  resultsEl.style.display="";
  browseEl.style.display="none";
}
function wikiResultRowHTML(e){
  const crumb=(e.crumbs.length?e.crumbs.join(" › ")+" › ":"");
  return '<button class="wiki-resrow" onclick="APP.wikiOpen(\''+e.chapterId+'\',\''+e.sectionId+'\')">'
   +'<span class="wiki-restitle">'+esc(e.title)+(e.source==="core"?' <span class="wiki-corebadge" title="Core rulebook only">core</span>':"")+'</span>'
   +(crumb?'<span class="wiki-rescrumb">'+esc(crumb)+'</span>':"")+'</button>';
}

/* ---- chapter grid ---- */
// Rules as a table of contents (owner menu redesign, 2026-11-07): grouped
// chapters, dotted leader to the Core page number, live search and group
// chips. Page numbers refer to the Mythras Core Rulebook (said once, in the
// page header), so no per-row "core" badge. No rules text is shown.
const WIKI_TOC_GROUPS=[
  ['make','Making a character',['characters-core','culture-community-core','careers-core','skills-core','equipment-core']],
  ['play','Playing the game',['system-core','combat-core']],
  ['magic','Magic',['magic-core','folk-core','animism-core','mysticism-core','sorcery-core','theism-core','cults-core']],
  ['gm','Running the game',['creatures-core','gm-core']]
];
let WIKI_TOC_Q='',WIKI_TOC_GROUP='all';
function wikiTocControlsHTML(){
  const chip=(k,l)=>'<button type="button" class="st-chipbtn" aria-pressed="'+(WIKI_TOC_GROUP===k)+'" onclick="wikiTocGroup(\''+k+'\')">'+esc(l)+'</button>';
  return '<div class="st-tb"><div class="st-field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>'
    +'<label class="st-sr" for="wikiTocQ">Search chapters</label><input id="wikiTocQ" class="st-input" type="search" placeholder="Search chapters, e.g. &ldquo;Combat&rdquo;" value="'+esc(WIKI_TOC_Q)+'" oninput="wikiTocSearch(this.value)"></div></div>'
    +'<div class="st-chiprow" role="group" aria-label="Chapter groups">'+chip('all','All')+WIKI_TOC_GROUPS.map(g=>chip(g[0],g[1])).join('')+'</div>';
}
function wikiTocHTML(){
  const q=WIKI_TOC_Q.trim().toLowerCase(),all=wikiAllChapters(),used=new Set();
  const groups=WIKI_TOC_GROUPS.map(([k,label,ids])=>{ids.forEach(i=>used.add(i));return [k,label,ids.map(i=>all.find(e=>e.id===i)).filter(Boolean)];});
  const rest=all.filter(e=>!used.has(e.id));if(rest.length)groups.push(['notes','Table notes',rest]);
  const match=e=>!q||(e.title+' '+((e.node&&e.node.topics)||[]).join(' ')).toLowerCase().includes(q);
  const html=groups.filter(g=>WIKI_TOC_GROUP==='all'||g[0]===WIKI_TOC_GROUP).map(([k,label,rows])=>{
    rows=rows.filter(match);if(!rows.length)return '';
    return '<section class="st-toc-group"><h2>'+esc(label)+'</h2><ol>'+rows.map(e=>{
      const page=String((e.node&&e.node.page)||'').replace(/^Core\s*/i,'');
      return '<li><button type="button" onclick="APP.wikiOpen(\''+e.id+'\')"><span class="st-toc-title">'+esc(e.title)+'</span><span class="st-toc-dots" aria-hidden="true"></span><span class="st-toc-page">'+esc(page)+'</span></button></li>';
    }).join('')+'</ol></section>';
  }).join('');
  return html?'<div class="st-toc">'+html+'</div>':'<div class="st-empty">No chapters match “'+esc(WIKI_TOC_Q)+'”.</div>';
}
function wikiTocSearch(v){WIKI_TOC_Q=String(v||'');const el=document.getElementById('wikiToc');if(el)el.innerHTML=wikiTocHTML();}
function wikiTocGroup(k){WIKI_TOC_GROUP=k;render();}
function wikiChapterCardHTML(entry){
  if(entry.source==="core"){
    return '<button class="menutile" onclick="APP.wikiOpen(\''+entry.id+'\')"><span class="mt-title">'+esc(entry.title)+' <span class="wiki-corebadge">core</span></span>'
     +'<span class="mt-desc">Core rulebook only &middot; '+esc(entry.node.page)+'</span></button>';
  }
  const ch=entry.node;
  const firstP=(ch.blocks.find(b=>b.t==="p")||{}).text||"";
  return '<button class="menutile" onclick="APP.wikiOpen(\''+entry.id+'\')"><span class="mt-title">'+esc(entry.title)+'</span>'
   +'<span class="mt-desc">'+esc(firstP.slice(0,130))+(firstP.length>130?"…":"")+'</span></button>';
}

/* ---- chapter article ---- */
function wikiBlockHTML(b){
  if(b.t==="p")return '<p>'+esc(b.text)+'</p>';
  if(b.t==="ul")return '<ul>'+b.items.map(i=>'<li>'+esc(i)+'</li>').join("")+'</ul>';
  if(b.t==="table"){
    const rows=b.rows||[];if(!rows.length)return '';
    const head=rows[0],body=rows.slice(1);
    return (b.caption?'<div class="wiki-tcap">'+esc(b.caption)+'</div>':'')
     +'<div class="wiki-twrap"><table class="wiki-table"><tr>'+head.map(c=>'<th>'+esc(c)+'</th>').join("")+'</tr>'
     +body.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join("")+'</tr>').join("")+'</table></div>';
  }
  return '';
}
// Section heading depth is capped at h6 (the deepest the tree ever nests
// past a chapter's own h1 is four heading levels) so a very deeply nested
// subsection never asks the browser for a heading tag that doesn't exist.
function wikiSectionHTML(node,depth){
  const tag='h'+Math.min(depth+2,6);
  return '<div class="wiki-sec" id="wsec-'+node.id+'">'
   +'<'+tag+'>'+esc(node.title)+'</'+tag+'>'
   +node.blocks.map(wikiBlockHTML).join("")
   +node.sections.map(s=>wikiSectionHTML(s,depth+1)).join("")
   +'</div>';
}
function wikiChapterDetailHTML(ch){
  let h='<div class="wiki-article">';
  h+='<h1>'+esc(ch.title)+'</h1>';
  h+=ch.blocks.map(wikiBlockHTML).join("");
  if(ch.sections.length){
    h+='<nav class="wiki-toc"><b>In this chapter</b><ul>'+ch.sections.map(s=>
      '<li><a href="#wsec-'+s.id+'">'+esc(s.title)+'</a>'
      +(s.sections.length?'<ul>'+s.sections.map(s2=>'<li><a href="#wsec-'+s2.id+'">'+esc(s2.title)+'</a></li>').join("")+'</ul>':'')
      +'</li>').join("")+'</ul></nav>';
  }
  h+=ch.sections.map(s=>wikiSectionHTML(s,1)).join("");
  h+='</div>';
  return h;
}
function wikiCoreStubHTML(stub){
  return '<div class="wiki-article"><h1>'+esc(stub.title)+' <span class="wiki-corebadge">core</span></h1>'
   +'<p class="wiki-corenote">Core rulebook only &mdash; '+esc(stub.page)+'. This app has no redistribution rights to that book, so this is a topic index, not rule text &mdash; look it up in your own copy.</p>'
   +'<p>'+esc(stub.blurb)+'</p>'
   +'<div class="field"><label>What this chapter covers</label><ul>'+stub.topics.map(t=>'<li>'+esc(t)+'</li>').join("")+'</ul></div>'
   +'</div>';
}

function wikiHTML(){
  let h='<div class="menuwrap wiki-wrap st-page">'+stPageHead({eyebrow:'Core rulebook',title:'Rules',
    sub:'Find a chapter, then look the rule up in your own rulebook. Page numbers refer to the Mythras Core Rulebook.',
    action:WIKI_CHAPTER?'<button type="button" class="st-btn" onclick="APP.wikiBack()">&#8592; All chapters</button>':''});
  if(WIKI_CHAPTER){
    h+='<input type="text" class="wiki-search" id="wikiSearchBox" placeholder="Search the rules&hellip;" oninput="wikiSearch(this.value)">';
    h+='<div id="wikiSearchResults" class="wiki-results" style="display:none"></div>';
  }
  h+='<div id="wikiBrowseArea">';
  if(WIKI_CHAPTER){
    const ch=wikiFindChapter(WIKI_CHAPTER);
    if(ch)h+=wikiChapterDetailHTML(ch);
    else{const stub=wikiFindCoreStub(WIKI_CHAPTER);h+=stub?wikiCoreStubHTML(stub):'<p class="note">Not found.</p>';}
  }else{
    h+=wikiTocControlsHTML()+'<div id="wikiToc">'+wikiTocHTML()+'</div>';
  }
  h+='</div>';
  h+='<p class="note rulesrc" style="margin-top:20px">'+esc(WIKI_ORC_NOTICE)+'</p>';
  h+='</div>';
  return h;
}
function renderWikiView(){
  document.body.classList.remove("play-mode");
  document.body.classList.remove("sheet-mode");
  document.body.classList.add("menu-mode");
  const openTitle=WIKI_CHAPTER&&(wikiFindChapter(WIKI_CHAPTER)||wikiFindCoreStub(WIKI_CHAPTER));
  document.title=(openTitle?openTitle.title+" — ":"")+"Rules Wiki — Mythras Character Forge";
  $("#main").innerHTML=wikiHTML();
}
