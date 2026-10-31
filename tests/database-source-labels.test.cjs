const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const site=path.resolve(__dirname,'../public');
const read=n=>fs.readFileSync(path.join(site,n),'utf8');
test('Situational default no longer displays scary historical mismatch banner',()=>{
 const s=read('situational.js');
 assert.ok(!s.includes('PARTIAL / INCONSISTENT GAME LOGS'));
 assert.ok(s.includes('CHECK GAME-LOG COVERAGE (OPTIONAL)'));
 assert.ok(s.includes('published season totals come from the official sheet'));
});
test('Database explicitly labels row sources and retains record columns',()=>{
 const s=read('app.js');
 assert.ok(s.includes("['STAT SOURCE',null,null]"));
 assert.ok(s.includes("case 'STAT SOURCE':return p.source"));
 assert.ok(s.includes("['POSTW','record','POSTW']"));
 assert.ok(s.includes("window.PCBLUnified?.profiles(s,phase,park)"));
});
test('Data integrity details remain accessible but not alarming by default',()=>{
 const s=read('data-integrity-ui.js');
 assert.ok(s.includes('VIEW SEASON COVERAGE & OPTIONAL SOURCE AUDIT'));
 assert.ok(!s.includes("SOURCE DIFFERENCES UNDER REVIEW"));
});
