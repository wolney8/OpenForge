// Reuse the existing authenticated synthetic runtime; never reset data or mint credentials.
import fs from "node:fs";
import {execFileSync} from "node:child_process";
import {chromium,request} from "@playwright/test";
const corrections=process.argv.includes("--calculator-corrections");
const runtime=corrections?"/tmp/openforge-award-integrity-91-20260914":"/tmp/openforge-modal-114-repair";
const apiPort=corrections?8039:8034,webPort=corrections?3040:3034;
if(corrections&&execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim()!=="repair/calculator-corrections-113")throw Error("Launch from the calculator-corrections worktree, not a protected build.");
const token=fs.readFileSync(runtime+"/session-token","utf8").trim();
const api=await request.newContext({baseURL:`http://127.0.0.1:${apiPort}`,extraHTTPHeaders:{Cookie:`pd_session=${token}`}});
const response=await api.get("/auth/session");
if(response.status()!==200||(await response.json()).email!=="notification-acceptance@example.invalid")throw Error("Existing synthetic session unavailable; do not reset any runtime.");
const fixture=JSON.parse(fs.readFileSync(runtime+(corrections?"/core-lay-planner-ui-evidence.json":"/free-bet-converted-journey.json"),"utf8"));
if((await api.get(`/profiles/${fixture.profileId}/free-bets`)).status()!==200)throw Error("Prepared synthetic review fixture unavailable; do not reset data.");
await api.dispose();
const url=corrections?`http://localhost:${webPort}/fund-manager/calculators?family=matched-betting&betType=free_bet&freeBetMode=SNR&backStake=10.00&backOdds=4.00&layOdds=4.20&exchangeCommission=0.02&commissionUnits=ratio`:`http://localhost:${webPort}/profiles/${fixture.profileId}/tracker/free-bets`;
if(corrections){
 const evidencePath=runtime+"/core-lay-planner-ui-evidence.json";
 const lastRun=fs.existsSync(evidencePath)?JSON.parse(fs.readFileSync(evidencePath,"utf8")):null;
 const served=JSON.parse(fs.readFileSync(runtime+'/review-source.json','utf8'));
 if(!lastRun?.result || lastRun.result!=='PASS' || lastRun.source!==served.checkout)throw Error('Current matching API/browser build has not passed the core journey; do not open an older candidate as evidence.');
 console.log(`Tested review build ${lastRun.source}; API started from ${served.checkout}, API product source ${served.api_source}; ${lastRun.cases.length} real native/conversion variants. Current report checkout ${execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()}. Main remains unchanged; wider correction acceptance is pending.`);
}
if(process.argv.includes("--check")){console.log(`Ready: authenticated synthetic ${url}`);process.exit(0);}
const context=await chromium.launchPersistentContext(runtime+"/local-review-browser",{headless:false,viewport:null});
await context.addCookies([{name:"pd_session",value:token,domain:"localhost",path:"/"}]);
const page=context.pages()[0]??await context.newPage();
await page.goto(url);
if(corrections)for(const record of fixture.reviewRecords??[]) {
 const existing=context.pages().find(p=>p.url()===`http://localhost:${webPort}`+record.href);
 const review=existing??await context.newPage();await review.goto(`http://localhost:${webPort}`+record.href);
}
console.log(`Opened isolated review on${webPort}. Existing data retained. Close this review browser when finished; normal/manual runtimes are unaffected.`);
await new Promise(resolve=>context.on("close",resolve));
