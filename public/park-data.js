/* Independent park route: official stadium document snapshot plus explicit annotations in future game logs.
   Event positions count result plays, not individual pitches. An unknown field remains unassigned. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PCBLParkData=api;})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
const HOME='PCBL HOME FIELD',POLO='POLO RINK',MURPHY='MURPHY PARK';
const names=[HOME,MURPHY,POLO];
const snapshot={};
function set(season,stage,num,segments){snapshot[`${season}:${stage}:${num}`]=segments}
for(let n=1;n<=9;n++)set('S1','regular',n,[{from:0,park:n===2?POLO:HOME}]);
for(let stage of ['wild_card','championship'])for(let n=1;n<=2;n++)set('S1',stage,n,[{from:0,park:HOME}]);
for(let n=1;n<=9;n++)set('S2','regular',n,[{from:0,park:n<=2||n===6?HOME:MURPHY}]);
set('S2','regular',3,[{from:0,park:HOME},{from:5,park:POLO},{from:21,park:MURPHY}]);
set('S2','regular',6,[{from:0,park:HOME},{from:18,park:MURPHY}]);
for(let stage of ['wild_card','championship'])for(let n=1;n<=2;n++)set('S2',stage,n,[{from:0,park:MURPHY}]);
for(let n=1;n<=11;n++)set('S3','regular',n,[{from:0,park:n<=4?MURPHY:n===8?POLO:HOME}]);
set('S3','regular',9,[{from:0,park:MURPHY},{from:5,park:HOME}]);
let live={};let issues=[];
function normalize(raw){let text=String(raw||'').trim().toUpperCase().replace(/[.\s_-]+/g,' ').trim();if(/^(PCBL(?: HOME)? FIELD|HOME FIELD|PCBL HOME|PCBL FIELD)$/.test(text))return HOME;if(/^(MURPHY(?: PARK| FIELD)?|MURPHY)$/.test(text))return MURPHY;if(/^(POLO(?: RINK)?|POLO)$/.test(text))return POLO;return null}
function resolve(game,event){let list=live[game.id]||snapshot[game.id];if(!list)return null;let index=game.events.indexOf(event);if(index<0&&event?.id){index=game.events.findIndex(e=>e.id===event.id)}if(index<0)return null;return list.filter(s=>s.from<=index).at(-1)?.park||null}
function gameParks(game){let found=new Set(game.events.map(e=>resolve(game,e)).filter(Boolean));return [...found]}
const header=/^(REGULAR SEASON|WILD CARD|PETER COOPER CHAMPIONSHIP) GAME(?:\s+(\d+))?\s+LOG\s*\(/i;
const parkLine=/^(?:BALLPARK|PARK|FIELD)\s*:\s*(.+?)\s*$/i;
const switchLine=/^(?:BALLPARK|PARK|FIELD)\s+SWITCH(?:\s+DURING\s+PA)?\s*:\s*(.+?)\s*$/i;
function mentionedParks(text){let found=[];if(/\bPCBL\s+(?:HOME\s+)?FIELD\b|\bHOME\s+FIELD\b/i.test(text))found.push(HOME);if(/\bMURPHY(?:\s+PARK|\s+FIELD)?\b/i.test(text))found.push(MURPHY);if(/\bPOLO\s+RINK\b/i.test(text))found.push(POLO);return found}
function acceptTabs(tabs,games){let pending={},warnings=[];if(!Array.isArray(tabs))return {updated:0,issues:['No game-log tabs']};let byId=new Map(games.map(g=>[g.id,g]));for(let tab of tabs){let lines=(tab.lines||[]).flatMap((row,i)=>String(row.text??row).split(/\r?\n/).map(text=>({text:text.trim(),paragraph:row.paragraph||i+1}))),season=lines.find(l=>l.text)?.text.match(/^SEASON\s*([1-9]\d*)\b/i)?.[1];if(!season)continue;let id=null,gameLines=[];
function commit(){if(!id||!gameLines.length)return;let mentions=[...new Set(gameLines.flatMap(row=>mentionedParks(row.text)))];if(!mentions.length)return;let g=byId.get(id);if(!g){warnings.push(id+': park mention has no readable game log');return}let switches=gameLines.map(row=>({row,match:row.text.match(switchLine)})).filter(x=>x.match);if(mentions.length===1&&!switches.length){pending[id]=[{from:0,park:mentions[0]}];return}if(!switches.length){warnings.push(id+': multiple parks mentioned without switch markers; snapshot retained');return}
let initial=gameLines.filter(row=>!switchLine.test(row.text)).flatMap(row=>mentionedParks(row.text).map(park=>({park,row}))).filter(x=>x.row.paragraph<switches[0].row.paragraph);if(!initial.length||new Set(initial.map(x=>x.park)).size!==1){warnings.push(id+': label the starting park before its first switch; snapshot retained');return}let segments=[{from:0,park:initial[0].park}];for(let {row,match} of switches){let park=normalize(match[1]);if(!park){warnings.push(id+': unknown switch park '+match[1]);return}let at=g.events.findIndex(e=>e.sourceParagraph>row.paragraph);if(at<0){warnings.push(id+': park switch has no later recorded play');return}if(at<=segments.at(-1).from){warnings.push(id+': put switches between play lines');return}segments.push({from:at,park})}pending[id]=segments}
for(let row of lines){let m=row.text.match(header);if(m){commit();let stage=m[1].toUpperCase()==='REGULAR SEASON'?'regular':m[1].toUpperCase()==='WILD CARD'?'wild_card':'championship';id=`S${season}:${stage}:${Number(m[2]||1)}`;gameLines=[row];continue}if(id)gameLines.push(row)}commit()}
live=pending;issues=warnings;return {updated:Object.keys(pending).length,issues:warnings}}

return {names,snapshot,resolve,gameParks,normalize,acceptTabs,sourceFor:id=>live[id]?'LIVE GAME PAGE':snapshot[id]?'STADIUM SNAPSHOT':'UNASSIGNED',get issues(){return issues},get liveCount(){return Object.keys(live).length}};
});
