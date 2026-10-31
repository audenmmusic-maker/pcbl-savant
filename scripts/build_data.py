import csv,json,re
rows=list(csv.reader(open('/tmp/pcblcheck2.csv')))
cols={'Auden':1,'Jason':3,'Jarvis':5,'Najee':11,'Coel':13}
sections=[('ALL TIME',38,39,76),('S1',79,80,117),('S2',120,121,158),('S3',161,162,199)]
result={}
for season,header,start,end in sections:
 players=[]
 for player,col in cols.items():
  record=re.search(r'\((\d+-\d+)\)',rows[header-1][col])
  stats={'hitting':{},'pitching':{},'overall':{}}; phase=None
  for line in range(start+1,end+1):
   row=rows[line-1]; key=row[0].strip().upper()
   val=row[col].strip() if col<len(row) else ''
   if key.startswith('TWR'):
    match=re.match(r'^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))',val)
    if match:stats['overall']['TWR']=float(match.group(1))
    continue
   if key in ('HITTING','PITCHING'):phase=key.lower();continue
   if not phase:continue
   key={'BA':'AVG','HA (HITS AGAINST)':'HA','HRA (HR AGAINST)':'HRA','RA (RUNS-AGAINST)':'RA','3RD+ INN. RUNS':'LATE RUNS'}.get(key,key)
   if phase=='pitching' and key=='SV/SVO':
    match=re.match(r'^\s*(\d+)\s*/\s*(\d+)',val)
    if match:
     stats['pitching']['SV']=float(match.group(1)); stats['pitching']['SVO']=float(match.group(2))
     if float(match.group(2))>0: stats['pitching']['SV%']=100*float(match.group(1))/float(match.group(2))
    elif re.match(r'^\s*0(?:\.0+)?\s*$',val): stats['pitching']['SV']=0.0; stats['pitching']['SVO']=0.0
    continue
   if phase=='pitching' and key=='DP':
    match=re.match(r'^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))',val)
    if match:stats['pitching']['DP']=float(match.group(1))
    continue
   if key not in ['PA','AB','AVG','OBP','SLG','OPS','K','H','2B','3B','HR','BB','HBP','R','XBH','AB/HR','K RATE','ISO','K/BB','ERA','WHIP','IP','K/3','HA','HRA','RA','NO HITTERS','LATE RUNS']:continue
   match=re.match(r'^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))',val)
   if match:stats[phase][key]=float(match.group(1))
  if stats['hitting'].get('PA',0)>0 or stats['pitching'].get('IP',0)>0:
   players.append({'name':player,'record':record.group(1) if record else None,'stats':stats})
 result[season]=players
open('/workspace/scratch/b47dbfb26d57/pcbl-savant/data.json','w').write(json.dumps(result,separators=(',',':')))
