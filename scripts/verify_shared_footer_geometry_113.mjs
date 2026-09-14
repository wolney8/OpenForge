// Shared footer containment: owned synthetic runtime only, no financial mutations.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium, request, expect} from '@playwright/test';
const token=fs.readFileSync('/tmp/openforge-award-integrity-91-20260914/session-token','utf8').trim();
const api=await request.newContext({baseURL:'http://127.0.0.1:8039',extraHTTPHeaders:{Cookie:'pd_session='+token}});
assert.equal((await(await api.get('/auth/session')).json()).email,'notification-acceptance@example.invalid');
const created=await api.post('/profiles/onboarding',{data:{setup_path:'import',display_name:'Synthetic Footer Geometry',profile_code:'PQA-FOOTER-'+Date.now(),tracking_start_date:'2026-09-01',enabled_modules:['sportsbook-bets','free-bets','casino-offers','cash-adjustments'],accounts:[],quick_actions:[]}});
assert.equal(created.status(),201,await created.text());const pid=(await created.json()).profile.profile_id;
assert.equal((await api.patch('/profiles/'+pid,{data:{status:'Active'}})).status(),200);
const browser=await chromium.launch({headless:true});const results=[],keyboardFailures=[];
try {
 for(const width of [1440,760,390])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:1050},reducedMotion:theme==='light'?'reduce':'no-preference'});
  await context.addCookies([{name:'pd_session',value:token,domain:'localhost',path:'/'}]);
  await context.addInitScript(t=>localStorage.setItem('openforge-theme',t),theme);
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [route,name,id] of [['sportsbook-bets','Add sportsbook row','sportsbook.editor.dialog'],['free-bets','Add free-bet row','free-bets.editor.dialog'],['casino-offers','Add casino row','casino-offers.editor.dialog']]){
   await page.goto('http://localhost:3040/profiles/'+pid+'/tracker/'+route);
   await page.getByRole('button',{name,exact:true}).click();
   const dialog=page.locator('[data-pd-id="'+id+'"]');await dialog.waitFor();
   const footer=dialog.locator('.workflow-editor-footer');await footer.waitFor();
   const buttons=footer.locator('button:not(:disabled)').filter({visible:true});await buttons.last().focus();
   const geometry=await dialog.evaluate(el=>{const b=el.querySelector('.workflow-editor-body'),r=el.getBoundingClientRect();return {left:r.left,right:r.right,bodyWidth:b.clientWidth,scrollWidth:b.scrollWidth,scrollLeft:b.scrollLeft,buttons:[...el.querySelectorAll('.workflow-editor-footer button')].filter(e=>e.getClientRects().length).map(e=>{const t=e.getBoundingClientRect();return {left:t.left,right:t.right,width:t.width,height:t.height};})};});
   assert(geometry.scrollWidth<=geometry.bodyWidth+1,JSON.stringify({route,width,theme,geometry}));
   assert.equal(geometry.scrollLeft,0);
   assert(geometry.buttons.every(b=>b.left>=geometry.left&&b.right<=geometry.right),JSON.stringify({route,width,theme,geometry}));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert(await dialog.evaluate(el=>el.contains(document.activeElement)));
   await page.keyboard.press('Escape');let keyboardEscape=true;
   try { await expect(dialog).toBeHidden(); } catch(error) {
    keyboardEscape=false;keyboardFailures.push({route,width,theme,error:error.message.split('\n')[0]});
   }
   results.push({route,width,theme,geometry,keyboardEscape});
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log(JSON.stringify({geometryStatus:'PASS',keyboardStatus:keyboardFailures.length?'FAIL':'PASS',scope:'three native shared footer consumers',results,keyboardFailures},null,2));
 assert.deepEqual(keyboardFailures,[], 'Native modal Escape regressions remain open; geometry success is not full modal acceptance.');
}finally{await browser.close();await api.dispose();}
