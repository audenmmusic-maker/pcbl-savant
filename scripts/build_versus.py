"""Build conservative matchup event counts from the public PCBL game log tabs.

Usage: python build_versus.py --s1 S1.docx --s2 S2.docx --s3 S3.docx
Only unambiguous 1v1 game logs and explicitly named pitching changes are counted.
Each season, stage, and game has an explicit route. New or changed headings fail
the build until reviewed instead of quietly assigning events to another game.
"""
import argparse, json, re
from docx import Document

NAMES = {'A':'Auden','JD':'Jason','JM':'Jarvis','N':'Najee','C':'Coel'}
HEAD = re.compile(r'^(REGULAR SEASON|WILD CARD|PETER COOPER CHAMPIONSHIP) GAME(?:\s+(\d+))?\s+LOG\s*\(([^)]*)\)', re.I)
HALF = re.compile(r'^(?:TO\s*P|TOP|T|BOTTOM|BOT|B)\s*(\d+)(?:ST|ND|RD|TH)?\b', re.I)
OUTCOMES = re.compile(r'(?<![A-Z0-9])(?:HBP|BB|WALK|HR|3B|2B|1B|SINGLE|DOUBLE|TRIPLE|HOMER|K|GO|FO|PO|LO|GROUNDOUT|POPOUT|FLYOUT)(?![A-Z0-9])', re.I)
MAP = {'WALK':'BB','SINGLE':'1B','DOUBLE':'2B','TRIPLE':'3B','HOMER':'HR','GROUNDOUT':'GO','POPOUT':'PO','FLYOUT':'FO'}
ROUTES = {
    'S1': {
        ('regular',1):('A 3-4 J','Auden','Jason'),
        ('regular',2):('J 2-3 A','Jason','Auden'),
        ('regular',3):('J v A','Jason','Auden'),
        ('regular',4):('A v C','Auden','Coel'),
        ('regular',5):('JARVIS v A','Jarvis','Auden'),
        ('regular',6):('A v JARVIS','Auden','Jarvis'),
        ('regular',7):('JARVIS v JASON','Jarvis','Jason'),
        ('regular',8):('JARVIS v JASON','Jarvis','Jason'),
        ('regular',9):('JARVIS v JASON','Jarvis','Jason'),
        ('wild_card',1):('JD v A','Jason','Auden'),
        ('championship',1):('A v JM','Auden','Jarvis'),
        ('championship',2):('A v JM','Auden','Jarvis'),
    },
    'S2': {
        ('regular',1):('J 6-0 N','Jarvis','Najee'),
        ('regular',2):('N 3-7 J','Najee','Jarvis'),
        ('regular',3):('N 7-8 A','Najee','Auden'),
        ('regular',4):('A 3-8 N','Auden','Najee'),
        ('regular',5):('N 9-7 A','Najee','Auden'),
        ('regular',6):('J 3-1 N','Jarvis','Najee'),
        ('regular',7):('A 4-5 J','Auden','Jarvis'),
        ('regular',8):('J 2-0 A','Jarvis','Auden'),
        ('regular',9):('A 0-2 J','Auden','Jarvis'),
        ('wild_card',1):('A 1-3 N','Auden','Najee'),
        ('championship',1):('N v JM','Najee','Jarvis'),
        ('championship',2):('N v JM','Najee','Jarvis'),
    },
    'S3': {
        ('regular',1):('A 7-1 BY/JD','Auden','Jason'),
        ('regular',2):('N 15-11 A','Najee','Auden'),
        ('regular',3):('JM 5-1 N','Jarvis','Najee'),
        ('regular',4):('A 3-4 JM','Auden','Jarvis'),
        ('regular',5):('JD 3-6 N','Jason','Najee'),
        ('regular',6):('A 4-5 N','Auden','Najee'),
        ('regular',7):('JD 6-5 A','Jason','Auden'),
        ('regular',8):('N 4-2 JD','Najee','Jason'),
        ('regular',9):('JM 3-6 A','Jarvis','Auden'),
        ('regular',10):('JM 13-2 JD','Jarvis','Jason'),
        ('regular',11):('JD 2-5 JM','Jason','Jarvis'),
    },
}
EXCLUDED = {
    'S1': {},
    'S2': {},
    'S3': {},
}
ALIASES={'Auden':'Auden','Jason':'Jason','Jarvis':'Jarvis','Najee':'Najee','Coel':'Coel'}
INITIALS={'A':'Auden','AUDEN':'Auden','JD':'Jason','JASON':'Jason','JM':'Jarvis','JARVIS':'Jarvis','JARV':'Jarvis','N':'Najee','NAJ':'Najee','NAJEE':'Najee','C':'Coel','COEL':'Coel'}

def check_half_names(label, game, side):
    """Cross-check explicit batter/pitcher labels; bare J varies by season/opponent."""
    if not label:return
    batter=game[side]
    pitcher=game['bottom' if side=='top' else 'top']
    parts=re.split(r'\bPITCHING\b',label.upper(),maxsplit=1)
    for section,expected in ((parts[0],batter),(parts[1] if len(parts)>1 else '',pitcher)):
        section=re.sub(r'\([^)]*\)',' ',section)
        words=re.findall(r'\b[A-Z]+\b',section)
        if 'BATTING' in words:words=words[:words.index('BATTING')]
        for word in words:
            named=INITIALS.get(word)
            if word=='J' and {'Jarvis','Jason'}&{batter,pitcher}:named=None
            if named:assert named==expected,(game['id'],side,label,named,expected)

def parse(season,path):
    lines=[(pidx,part.strip()) for pidx,p in enumerate(Document(path).paragraphs,1) for part in p.text.splitlines()]
    assert lines and lines[0][1].upper().startswith('SEASON '+season[1]), f'{path}: wrong season tab; expected {season}'
    games=[]; current=None; half=None; inning_hint=1; seen=set()
    for paragraph,line in lines:
        h=HEAD.match(line)
        if h:
            stage={'REGULAR SEASON':'regular','WILD CARD':'wild_card','PETER COOPER CHAMPIONSHIP':'championship'}[h[1].upper()]
            n=int(h[2] or 1)
            route=(stage,n)
            assert route not in seen, f'{season}: duplicate game heading {route}'
            seen.add(route)
            current=None;half=None;inning_hint=1
            if route in EXCLUDED[season]:continue
            assert route in ROUTES[season], f'{season}: unreviewed game {route}: {line}'
            expected,top,bottom=ROUTES[season][route]
            assert h[3].strip()==expected, f'{season} {route}: heading changed: {h[3]!r}'
            score=re.search(r'\b(\d+)\s*-\s*(\d+)\b',expected)
            current={'id':f'{season}:{stage}:{n}','season':season,'phase':'regular' if stage=='regular' else 'postseason','stage':stage,'number':n,'title':line,'top':top,'bottom':bottom,'score':[int(score[1]),int(score[2])] if score else None,'events':[]}
            games.append(current)
            continue
        if current is None:continue
        marker=re.match(r'^([123])(?:st|nd|rd)\s*:?[ ]*$',line,re.I) if season=='S1' else None
        if marker:
            inning_hint=int(marker[1]);half=None;continue
        special=re.match(r'^(Top|Bottom)\s+(A|C|JM|JD|JARVIS|JASON)\s*:\s*(.*)$',line,re.I) if season=='S1' else None
        m=HALF.match(line)
        if m:
            half=('top' if re.match(r'^(?:TO\s*P|TOP|T)',line,re.I) else 'bottom',int(m[1]))
            inline=line[m.end():].strip()
            check_half_names(inline.split(':',1)[0] if inline.startswith('(') else '',current,half[0])
            inline=re.sub(r'^\([^)]*\)\s*:?', '', inline).lstrip(': ').strip()
            if inline and OUTCOMES.search(inline):line=inline
            else:continue
        elif special:
            half=('top' if special[1].lower()=='top' else 'bottom',inning_hint)
            check_half_names(special[2],current,half[0]);line=special[3]
        elif season=='S1' and re.match(r'^(Top|Bottom)(?:\s*\([^)]*\))?\s*:',line,re.I):
            half=('top' if line.lower().startswith('top') else 'bottom',inning_hint)
            line=line.split(':',1)[1]
        if re.match(r'^(?:STATS|GAME STATS|STANDINGS|PITCHING STATS|HITTING STATS|FINAL|LHH\*|NOTE|\w+ (?:HITTING|PITCHING))\b',line,re.I):half=None;continue
        if half is None:continue
        # Guard against side notes and stat summaries masquerading as a play sequence.
        if len(line)>400 or ':' in line[:35] or not OUTCOMES.search(line):continue
        # S1 game 8 has a single 'GOr' shorthand for a groundout.
        if current['id']=='S1:regular:8':line=re.sub(r'\bGOr\b','GO',line,flags=re.I)
        batter=current[half[0]]
        pitcher=current['bottom' if half[0]=='top' else 'top']
        if current['id']=='S3:regular:1' and half[0]=='top':
            pitcher='Coel' if half[1]<=2 else 'Jason'
        for match in OUTCOMES.finditer(line.upper()):
            result=MAP.get(match.group(),match.group())
            current['events'].append({'id':f'{current["id"]}:{len(current["events"])+1}','batter':batter,'pitcher':pitcher,'inning':half[1],'half':half[0],'result':result,'sourceParagraph':paragraph})
    assert seen==set(ROUTES[season])|set(EXCLUDED[season]), f'{season}: missing/extra headings: {seen ^ (set(ROUTES[season])|set(EXCLUDED[season]))}'
    return games

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    for season in ('s1','s2'):parser.add_argument('--'+season,required=True)
    parser.add_argument('--s3',help='Season 3 DOCX; otherwise retain verified S3 events from the existing snapshot')
    args=parser.parse_args()
    games=parse('S1',args.s1)+parse('S2',args.s2)
    if args.s3:games+=parse('S3',args.s3)
    else:
        with open('versus-data.js') as f:old=json.loads(f.read().split('=',1)[1].strip().rstrip(';'))
        games += [g for g in old if g['season']=='S3']
    assert all(g['events'] for g in games),'Game with no readable events'
    ids=[g['id'] for g in games]
    assert len(ids)==len(set(ids)),'Duplicate game ID'
    event_ids=[e['id'] for g in games for e in g['events']]
    assert len(event_ids)==len(set(event_ids)),'Duplicate event ID'
    for g in games:
        for e in g['events']:
            assert e['id'].startswith(g['id']+':'),(g['id'],e['id'])
            assert e['batter']==g[e['half']],(g['id'],e)
            assert e['pitcher'] in ALIASES and e['pitcher']!=e['batter'],(g['id'],e)
            assert e['inning']>=1 and e['result'] in {'HBP','BB','HR','3B','2B','1B','K','GO','FO','PO','LO'},(g['id'],e)
    with open('versus-data.js','w') as f:
        f.write('window.PCBL_VERSUS='+json.dumps(games,separators=(',',':'),ensure_ascii=False)+';\n')
    print('Included',len(games),'games,',sum(len(g['events']) for g in games),'plate appearance events')
    for s in ('S1','S2','S3'):
        print(s,[(g['phase'],g['number'],len(g['events'])) for g in games if g['season']==s])
