// Copies the Pits fight reports from the site's database into the repository (owner, 2026-11-14), where Claude and
// ChatGPT read them. Run by the manual workflow .github/workflows/pits-reports-export.yml on the `pits-reports` branch,
// never by hand with a real token on a shared machine. How it fits together: docs/pits-reports.md.
//   node scripts/pits-reports-export.cjs --cloud js/cloud.js --out reports      (needs PITS_REPORTS_TOKEN)
// One file per report (<UTC date>-<time>-<id start>.json), never rewritten, and README.md: every report, newest first.
const fs=require('node:fs'),path=require('node:path');

const stamp=iso=>{const d=new Date(iso);const p=n=>String(n).padStart(2,'0');
  return d.getUTCFullYear()+p(d.getUTCMonth()+1)+p(d.getUTCDate())+'-'+p(d.getUTCHours())+p(d.getUTCMinutes())+p(d.getUTCSeconds());};
const fileFor=r=>stamp(r.created_at)+'-'+String(r.id).slice(0,8)+'.json';
const cell=s=>String(s==null?'':s).replace(/\s+/g,' ').replace(/\|/g,'\\|').replace(/</g,'&lt;').trim();
// rows (oldest first, as the database gives them) and the files already there -> {write: {name: text}, index: text}
function plan(rows,existing){
  const have=new Set(existing||[]),write={};
  for(const r of rows){const f=fileFor(r);if(!have.has(f))write[f]=JSON.stringify({id:r.id,created_at:r.created_at,reporter:r.reporter||null,note:r.note,page:r.page,build:r.build,record:r.record},null,1)+'\n';}
  const lines=['# Pits fight reports','',
    'Copied from the site by the "Export Pits fight reports" workflow. One file per report: the note and name, the page and',
    'build it came from, and the fight record (dice and rulings in the order shown, the engine\'s log, what the stage drew).',
    'Diagnoses go in `docs/pits-report-ledger.md` on the working branch, not here. How it works: `docs/pits-reports.md`.','',
    rows.length+' report'+(rows.length===1?'':'s')+'.','',
    '| When (UTC) | Who | Note | Page | Build | File |','|---|---|---|---|---|---|'];
  for(const r of [...rows].reverse()){const f=fileFor(r),n=cell(r.note);
    lines.push('| '+new Date(r.created_at).toISOString().slice(0,16).replace('T',' ')+' | '+(cell(r.reporter)||'-')+' | '+(n.length>160?n.slice(0,157)+'...':n)+' | '+cell(r.page)+' | '+cell(r.build)+' | ['+f+']('+f+') |');}
  return {write,index:lines.join('\n')+'\n'};
}
async function fetchRows(url,key,token){
  const r=await fetch(url+'/rest/v1/rpc/pits_reports_export',{method:'POST',
    headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({p_token:token})});
  const text=await r.text();
  if(!r.ok)throw new Error('the database refused the export ('+r.status+'): '+text.slice(0,300));
  const rows=JSON.parse(text);if(!Array.isArray(rows))throw new Error('unexpected answer');return rows;
}
async function main(){
  const arg=n=>{const i=process.argv.indexOf(n);return i>0?process.argv[i+1]:null;};
  const cloud=fs.readFileSync(arg('--cloud')||'js/cloud.js','utf8'),out=arg('--out')||'reports';
  const url=/const SUPABASE_URL="([^"]+)"/.exec(cloud)[1],key=/const SUPABASE_ANON_KEY="([^"]+)"/.exec(cloud)[1];
  const token=process.env.PITS_REPORTS_TOKEN;
  if(!token){console.error('PITS_REPORTS_TOKEN is not set (add it as a repository secret: docs/pits-reports.md)');process.exit(1);}
  const rows=await fetchRows(url,key,token);
  fs.mkdirSync(out,{recursive:true});
  const p=plan(rows,fs.readdirSync(out));
  for(const [f,t] of Object.entries(p.write))fs.writeFileSync(path.join(out,f),t);
  fs.writeFileSync(path.join(out,'README.md'),p.index);
  console.log(rows.length+' reports, '+Object.keys(p.write).length+' new');
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exit(1);});
module.exports={plan,fileFor};
