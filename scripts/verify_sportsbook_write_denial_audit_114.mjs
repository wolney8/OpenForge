// Independent stored-state check for the existing Sportsbook write boundary. Audit, no repair.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {request} from '@playwright/test';
const runtime='/tmp/openforge-populated-audit-114-20260913';
const f=JSON.parse(fs.readFileSync(runtime+'/populated-fixture.json'));
const token=fs.readFileSync(runtime+'/session-token','utf8').trim();
const api=await request.newContext({baseURL:'http://127.0.0.1:8036',extraHTTPHeaders:{Cookie:`pd_session=${token}`}});
const sql=()=>{
 const r=spawnSync('scripts/run-python.sh',['-c','import sqlite3,json; c=sqlite3.connect("/tmp/openforge-populated-audit-114-20260913/acceptance.sqlite3"); print(json.dumps(c.execute("select sportsbook_bet_id,profile_id,event_name,back_stake from sportsbook_bets order by sportsbook_bet_id").fetchall()))'],{encoding:'utf8'});
 if(r.status)throw Error('Owned SQL read failed');return JSON.parse(r.stdout);
};
const payload={event_name:'Synthetic invalid Sportsbook probe',bookmaker:'Bet365',offer_type:'Bet & Get',bet_type:'Single',fixture_type:'Football',status:'Placed',result:'Pending',back_stake:'not-money',back_odds:'5.00',lay_odds_1:'5.20',lay_actual:'9.00',exchange_name:'Smarkets',match_strategy:'Standard',date_settled:'2026-09-13T12:00:00'};
if(process.argv.includes('--reads')){
 const evidence=JSON.parse(fs.readFileSync(runtime+'/sportsbook-write-denial-evidence.json'));
 const bad=evidence.malformed.after.find(r=>!evidence.malformed.before.some(b=>b[0]===r[0]));
 evidence.downstream={};
 for(const [name,path] of [['individual',`/profiles/${f.profileId}/sportsbook-bets/${bad[0]}`],['list',`/profiles/${f.profileId}/sportsbook-bets`],['export',`/profiles/${f.profileId}/imports/sportsbook/export.xlsx`]]){
  const r=await api.get(path);evidence.downstream[name]={status:r.status(),body:await r.text()};
 }
 fs.writeFileSync(runtime+'/sportsbook-write-denial-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(Object.fromEntries(Object.entries(evidence.downstream).map(([k,v])=>[k,v.status]))));await api.dispose();process.exit(0);
}
const before=sql();const missing=await api.post('/profiles/profile-pqa-missing/sportsbook-bets',{data:payload});const afterMissing=sql();
const malformed=await api.post(`/profiles/${f.profileId}/sportsbook-bets`,{data:payload});const afterMalformed=sql();
fs.writeFileSync(runtime+'/sportsbook-write-denial-evidence.json',JSON.stringify({expected:'Field-specific4xx and zero business writes; missing Profile controlled zero-write denial',missing:{status:missing.status(),body:await missing.text(),unchanged:JSON.stringify(before)===JSON.stringify(afterMissing)},malformed:{status:malformed.status(),body:await malformed.text(),before,after:afterMalformed}},null,2));
console.log(JSON.stringify({missing:missing.status(),malformed:malformed.status(),inserted:afterMalformed.length-before.length}));await api.dispose();
