/* Read-only check of the live official PCBL sheet. Never echoes full sheet contents. */
const url='https://docs.google.com/spreadsheets/d/1-wyh_XRSgYGF8GIynNH1ZYvm__1bf0m7bs0WNNWRmuk/gviz/tq?gid=0&tqx='+encodeURIComponent('out:json;responseHandler:PCBLVerifySheet')+'&_='+Date.now();
async function main(){
 const res=await fetch(url,{signal:AbortSignal.timeout(25000)});
 const body=await res.text();
 console.log('Google Sheets HTTP',res.status,'response bytes',body.length);
 if(!res.ok)throw Error('Sheet returned '+res.status);
 const start=body.indexOf('PCBLVerifySheet('),end=body.lastIndexOf(')');
 if(start<0||end<start)throw Error('Sheet was not available as expected GViz JSONP');
 const data=JSON.parse(body.slice(start+'PCBLVerifySheet('.length,end));
 if(data.status!=='ok'||!Array.isArray(data.table?.rows))throw Error('No accessible sheet rows');
 const rows=data.table.rows.map(r=>(r.c||[]).map(x=>String(x?.f??x?.v??'').trim()));
 function block(label){
  const i=rows.findIndex(r=>r[0]?.toUpperCase()===label);
  if(i<0)return {error:'Section missing'};
  const stats={},header=rows[i-1]?.[1]||'';
  let mode='';
  for(const row of rows.slice(i+1,i+45)){
   const key=row[0]?.trim().toUpperCase()||'';
   if(key==='HITTING'||key==='PITCHING'){mode=key;continue}
   if(key.startsWith('SEASON ')||key==='PLAYER')break;
   if(mode==='HITTING'&&/^(PA|AB|BA|OBP|SLG|OPS|K|H|2B|3B|HR|BB|HBP|R|AB\/HR|XBH|3RD\+?\s*INN|K RATE|ISO|K\/BB)/.test(key))stats[key]=row[1]||'';
  }
  return {header,stats};
 }
 const s3=block('SEASON 3'),career=block('CAREER');
 console.log('S3 AUDEN',JSON.stringify(s3));
 console.log('CAREER AUDEN',JSON.stringify(career));
 console.log('Available season sections',rows.map(r=>r[0]).filter(x=>/^SEASON [1-9]\d*$/i.test(x)).join(', '));
}
main().catch(e=>{console.error('Live sheet verification FAILED:',e.message);process.exitCode=1});
