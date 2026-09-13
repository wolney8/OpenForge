// Public calculator controls only: no bookmaker/member login, wager or tracker writes.
import fs from "node:fs";
import assert from "node:assert/strict";
import {chromium} from "@playwright/test";
const url="https://matchedbettingblog.com/matched-betting-calculator/";
const browser=await chromium.launch(),observations=[];
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.goto(url,{waitUntil:"domcontentloaded",timeout:45000});
  const stake=page.locator('input[id^="back-stake-"]');
  await stake.fill("10");await stake.focus();await page.keyboard.press("Tab");
  const afterTab=await page.evaluate(()=>document.activeElement?.id);
  assert(afterTab,"keyboard focus lost");
  for(const [prefix,value] of [["back-odds-","3"],["back-commission-","0"],["lay-odds-","3.1"],["lay-commission-","2"]])await page.locator(`input[id^="${prefix}"]`).fill(value);
  await page.locator("#free").focus();await page.keyboard.press("Space");assert(await page.locator("#free").isChecked());
  await page.locator("#initial").focus();await page.keyboard.press("Space");assert(await page.locator("#initial").isChecked());
  const geometry=await stake.evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,viewport:innerWidth,outline:getComputedStyle(el).outlineStyle};});
  const bounds=await page.locator('input[id^="back-odds-"],input[id^="lay-odds-"]').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {id:e.id,left:r.left,right:r.right};}));
  const noFieldOverflow=bounds.every(r=>r.left>=0&&r.right<=width);
  observations.push({source:url,date:"2026-09-13",method:"actual public Chromium keyboard/input",width,controls:["back stake","back/lay odds","back/lay commission","Normal/Free Bet radio"],afterTab,radioSpaceWorks:true,noFieldOverflow,geometry,bounds,numericalParity:"NOT ASSESSED",trackerInteraction:"NOT ASSESSED"});
  await page.close();
 }
 fs.writeFileSync("/tmp/openforge-modal-114-repair/public-calculator-usability.json",JSON.stringify(observations,null,2));console.log(JSON.stringify(observations));
}finally{await browser.close();}
