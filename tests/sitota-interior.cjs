"use strict";
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sitota=fs.readFileSync(path.join(root,'js/sitota.js'),'utf8');
const css=fs.readFileSync(path.join(root,'sitota-interior.css'),'utf8');
const homeCss=fs.readFileSync(path.join(root,'sitota-home-16x9.css'),'utf8');
assert(html.includes('sitota-interior.css?v=1'),'Interior theme must be linked');
assert(html.includes('js/sitota.js?v=4'),'Site script must bust older cached renderer');
assert(html.indexOf('sitota-interior.css?v=1')>html.indexOf('sitota-home-16x9.css?v=2'),'Interior theme should load after home styles');
assert.match(sitota,/document\.body\.dataset\.sitotaView\s*=\s*APPVIEW/,'Site view flag missing');
new vm.Script(sitota,{filename:'js/sitota.js'});
for (const view of ['account','library','campaigns','campaign','board','wiki','character','play','world']) {
  assert(css.includes('data-sitota-view="'+view+'"'),'Missing view: '+view);
}
assert.match(css,/body\[data-sitota-view="character"\] #rail/);
assert.match(css,/body\[data-sitota-view="character"\] #ledger/);
assert.match(css,/body\[data-sitota-view="play"\] \.pm-mast/);
assert.match(css,/body\[data-sitota-view="wiki"\] \.wiki-article/);
assert.match(css,/@media print\s*\{/);
assert(!css.includes('data-sitota-view="sheet"] .app'),'Printable sheet should not be themed as a dark app');
assert(!css.includes('assets/sitota-hero'),'Interior must not duplicate the licensed painting');
assert(homeCss.includes('assets/sitota-hero.avif'),'Homepage asset must remain intact');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'CSS braces unbalanced');
assert.equal((html.match(/<header\b/g)||[]).length,1);
console.log('PASS: interior CSS scope, all views, unchanged homepage art, printable sheet, cached script version');
