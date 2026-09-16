// Authenticated browser -> API -> SQLite proof for native portable Profile recovery.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {chromium, request, expect} from '@playwright/test';

const runtime=process.env.OPENFORGE_RECOVERY_RUNTIME ?? '/tmp/openforge-profile-recovery-114';
const webBase=process.env.OPENFORGE_RECOVERY_WEB_BASE ?? 'http://localhost:3010';
const apiBase=process.env.OPENFORGE_RECOVERY_API_BASE ?? 'http://127.0.0.1:8010';
const sourceProfileId=process.env.OPENFORGE_RECOVERY_SOURCE_PROFILE;
const databasePath=process.env.OPENFORGE_RECOVERY_DATABASE;
assert(sourceProfileId,'OPENFORGE_RECOVERY_SOURCE_PROFILE is required');
assert(databasePath,'OPENFORGE_RECOVERY_DATABASE is required');
fs.mkdirSync(runtime,{recursive:true});
const token=fs.readFileSync(runtime+'/session-token','utf8').trim();
const cookie={Cookie:'pd_session='+token};
const api=await request.newContext({baseURL:apiBase,extraHTTPHeaders:cookie});
const session=await(await api.get('/auth/session')).json();
assert.equal(session.authenticated,true);assert.equal(session.role,'fund_manager');

const exported=await api.get(`/profiles/${sourceProfileId}/exports/portable-profile.xlsx`);
assert.equal(exported.status(),200,await exported.text());
assert.equal(exported.headers()['x-export-format-version'],'profile-portable-export-v1');
const backup=await exported.body();
assert(backup.length>0);

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900}});
await context.addCookies([{name:'pd_session',value:token,domain:new URL(webBase).hostname,path:'/'}]);
const page=await context.newPage();page.setDefaultTimeout(30000);
const code='RECOVERY-'+Date.now();
const name='Synthetic Portable Recovery '+Date.now();
const evidence={source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),date:new Date().toISOString(),sourceProfileId,code};
try {
 await page.goto(webBase+'/profiles/restore');
 await page.getByLabel('Portable backup').setInputFiles({buffer:backup,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',name:'profile-portable-backup-synthetic.xlsx'});
 await page.getByLabel('New Profile name (optional)').fill(name);
 await page.getByLabel('New Profile code').fill(code);
 const [analysisResponse]=await Promise.all([
   page.waitForResponse(response=>response.url().endsWith('/fund-manager/portable-restores/analyse')&&response.request().method()==='POST'),
   page.locator('[data-pd-id="portable-profile-restore.analyse"]').click(),
 ]);
 assert.equal(analysisResponse.status(),201,await analysisResponse.text());
 const analysis=await analysisResponse.json();
 assert.equal(analysis.status,'READY');
 await expect(page.locator('[data-pd-id="portable-profile-restore.ready"]')).toBeVisible();
 await page.getByLabel('I confirm this backup should create a fresh Profile.').check();
 const [restoreResponse]=await Promise.all([
   page.waitForResponse(response=>response.url().endsWith(`/fund-manager/portable-restores/${analysis.restore_run_id}/execute`)&&response.request().method()==='POST'),
   page.locator('[data-pd-id="portable-profile-restore.execute"]').click(),
 ]);
 assert.equal(restoreResponse.status(),200,await restoreResponse.text());
 const restored=await restoreResponse.json();
 assert.equal(restored.status,'COMPLETE');
 assert.equal(restored.result.financial_reconciliation.status,'PASS');
 assert.equal(restored.result.operational_reconciliation.status,'OPERATIONAL HEALTH: PASSED');
 assert.equal(restored.result.logical_parity.status,'PASS');
 const targetProfileId=restored.target_profile_id;
 await expect(page.getByRole('link',{name:'View restored Profile'})).toHaveAttribute('href',`/profiles/${targetProfileId}/tracker/dashboard`);

 const db=new DatabaseSync(databasePath,{readOnly:true});db.exec('PRAGMA busy_timeout=5000');
 const count=(table,pid)=>Number(db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE profile_id=?`).get(pid).n);
 const sourceCounts={},targetCounts={};
 for(const table of ['accounts','sportsbook_bets','free_bets','casino_offers','each_way_extra_places','cash_adjustments']) {
   sourceCounts[table]=count(table,sourceProfileId);targetCounts[table]=count(table,targetProfileId);
   assert.equal(targetCounts[table],sourceCounts[table],`${table} count mismatch`);
 }
 const financial=(table,pid,key,columns)=>db.prepare(`SELECT ${columns.join(',')} FROM ${table} WHERE profile_id=? ORDER BY ${key}`).all(pid).map(row=>{
   const plan=row.lay_plan_json?JSON.parse(row.lay_plan_json):null;
   return {...row,lay_plan_json:plan?JSON.stringify({schema_version:plan.schema_version,calculation_contract_version:plan.calculation_contract_version,backing_basis:plan.backing_basis,selected_strategy:plan.selected_strategy,reviewed_planned_lay_stake:plan.reviewed_planned_lay_stake,commission:plan.commission,commission_units:plan.commission_units}):null};
 }).sort((left,right)=>JSON.stringify(left).localeCompare(JSON.stringify(right)));
 assert.deepEqual(
   financial('sportsbook_bets',targetProfileId,'sportsbook_bet_id',['result','back_stake','back_odds','lay_actual','lay_commission_1','lay_plan_json']),
   financial('sportsbook_bets',sourceProfileId,'sportsbook_bet_id',['result','back_stake','back_odds','lay_actual','lay_commission_1','lay_plan_json']),
 );
 assert.deepEqual(
   financial('free_bets',targetProfileId,'free_bet_id',['result','free_bet_value','back_odds','lay_actual','lay_commission_1','lay_plan_json']),
   financial('free_bets',sourceProfileId,'free_bet_id',['result','free_bet_value','back_odds','lay_actual','lay_commission_1','lay_plan_json']),
 );
 const targetExport=await api.get(`/profiles/${targetProfileId}/exports/portable-profile.xlsx`);
 assert.equal(targetExport.status(),200,await targetExport.text());
 assert.equal(targetExport.headers()['x-export-format-version'],'profile-portable-export-v1');
 await page.goto(`${webBase}/profiles/${targetProfileId}/tracker/reports`);
 await page.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();
 await page.reload();await page.getByRole('heading',{name:'Weekly reports',exact:true}).waitFor();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const archived=await api.patch(`/profiles/${targetProfileId}`,{data:{status:'Archived'}});
 assert.equal(archived.status(),200,await archived.text());
 const removed=await api.delete(`/profiles/${targetProfileId}`,{data:{confirmation_name:name}});
 assert.equal(removed.status(),200,await removed.text());assert.equal((await removed.json()).deleted,true);
 for(const table of ['accounts','sportsbook_bets','free_bets','casino_offers','each_way_extra_places','cash_adjustments']) assert.equal(count.call(null,table,targetProfileId),0);
 db.close();
 Object.assign(evidence,{result:'PASS',restoreRunId:analysis.restore_run_id,targetProfileId,sourceCounts,targetCounts,financialReconciliation:'PASS',operationalHealth:'PASSED',logicalParity:'PASS',reportReload:true,syntheticCleanup:'PASS'});
 console.log(JSON.stringify(evidence));
} finally {
 fs.writeFileSync(runtime+'/profile-portable-recovery-evidence.json',JSON.stringify(evidence,null,2));
 await context.close();await browser.close();await api.dispose();
}
