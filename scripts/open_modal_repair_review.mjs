// Reuse the existing authenticated synthetic runtime; never reset data or mint credentials.
import fs from "node:fs";
import {chromium,request} from "@playwright/test";
const runtime="/tmp/openforge-modal-114-repair";
const token=fs.readFileSync(runtime+"/session-token","utf8").trim();
const api=await request.newContext({baseURL:"http://127.0.0.1:8034",extraHTTPHeaders:{Cookie:`pd_session=${token}`}});
const response=await api.get("/auth/session");
if(response.status()!==200||(await response.json()).email!=="notification-acceptance@example.invalid")throw Error("Existing synthetic session unavailable; do not reset any runtime.");
const fixture=JSON.parse(fs.readFileSync(runtime+"/free-bet-converted-journey.json","utf8"));
if((await api.get(`/profiles/${fixture.profileId}/free-bets`)).status()!==200)throw Error("Prepared synthetic review fixture unavailable; do not reset data.");
await api.dispose();
if(process.argv.includes("--check")){console.log(`Ready: authenticated synthetic http://localhost:3034/profiles/${fixture.profileId}/tracker/free-bets`);process.exit(0);}
const context=await chromium.launchPersistentContext(runtime+"/local-review-browser",{headless:false,viewport:null});
await context.addCookies([{name:"pd_session",value:token,domain:"localhost",path:"/"}]);
const page=context.pages()[0]??await context.newPage();
await page.goto(`http://localhost:3034/profiles/${fixture.profileId}/tracker/free-bets`);
console.log("Opened isolated review on3034. Existing data retained. Close this review browser when finished; normal/manual runtimes are unaffected.");
await new Promise(resolve=>context.on("close",resolve));
