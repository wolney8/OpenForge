import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const evidence = path.resolve("data/private/evidence/cp091-oddsmatcher-containment-20261026");
const profileId = "profile-demo-001";
const base = {
  opportunity_id:"event-1:h2h:HOME",provider:"The Odds API",competition_key:"soccer_epl",competition:"Premier League",event_id:"event-1",event_name:"Demo City v Demo United",starts_at:"2026-10-27T15:00:00Z",selection_key:"HOME",selection:"Demo City",market_key:"h2h",market:"Match Odds / 1X2",
  back:{provider_key:"williamhill",provider_name:"William Hill",account_name:"William Hill",odds:"4.50",observed_at:"2026-10-26T14:00:00Z",link:"https://example.invalid/back"},
  lay:{provider_key:"smarkets",provider_name:"Smarkets",account_name:"Smarkets",odds:"4.70",observed_at:"2026-10-26T14:00:05Z",link:null},
  display_rating:"100.00",commission_aware_rating:"100.00",exchange_commission:"0",commission_origin:"oddsmatcher-default",standard_lay_stake:"9.62",liability:"35.59",pnl_if_back_wins:"-1.09",pnl_if_lay_wins:"-0.57",conservative_result:"-1.09",liquidity_state:"UNKNOWN",freshness:"fresh",age_seconds:60,
  back_eligibility:{state:"eligible",reason:"Eligible",account_id:"account-b"},lay_eligibility:{state:"eligible",reason:"Eligible",account_id:"account-l"},can_create_prospecting_draft:true,
};
function feed(row=base){return {provider:"The Odds API",fetched_at:"2026-10-26T14:01:00Z",state:"fresh",warning:null,manual_refresh_only:true,competitions:["Premier League"],event_count:1,bookmaker_count:1,exchange_count:1,provider_credits_used:3,provider_credits_remaining:497,provider_last_refresh_cost:3,provider_quota_exhausted:false,opportunities:[row],excluded:[]};}
const prefs={version:1,default_back_stake:"10.00",exchange_commission_overrides:{},excluded_bookmaker_identities:[],excluded_exchange_identities:[],show_arbs_default:true,default_advanced:false,saved_filters:[{id:"saved-1",name:"Owner example",description:"Visible row actions",filters:{search:"",selectionKeys:[],startTime:"ALL",customStart:"",customEnd:"",backProviderKeys:[],backMin:"",backMax:"",layProviderKeys:[],layMin:"",layMax:"",minLiquidity:"",ratingMin:"",ratingMax:"",showArbs:true}}]};
async function mock(page:Page,row=base){await page.route("**/api/**",async route=>{const u=route.request().url(); if(u.includes("/fund-manager/preferences/oddsmatcher"))return route.fulfill({json:prefs}); if(u.includes("/oddsmatcher"))return route.fulfill({json:feed(row)}); if(u.includes("/account-catalogue/source"))return route.fulfill({json:{schema_version:"1.0",records:[]}}); if(/\/profiles\/?$/.test(new URL(u).pathname))return route.fulfill({json:[{profile_id:profileId,display_name:"ALPHA-001 Synthetic",status:"active"}]}); if(u.includes("/auth/session"))return route.fulfill({json:{authenticated:true,email:"alpha@example.invalid",linked_profile_ids:[profileId],name:"Alpha Owner",role:"fund_manager"}}); if(u.includes("/auth/activity"))return route.fulfill({status:204}); if(u.includes("/fund-manager/notifications"))return route.fulfill({json:[]}); return route.fulfill({status:404,json:{}});});}

async function open(page:Page,row=base,profile=false){await mock(page,row);await page.goto(profile?`/oddsmatcher?profile_id=${profileId}`:"/oddsmatcher");await expect(page.locator('.oddsmatcher-table tbody tr').first()).toBeVisible();}

test("CP-091 centres liquidity and suppresses redundant effective ratings",async({page})=>{
 await fs.mkdir(evidence,{recursive:true}); await page.setViewportSize({width:1440,height:900}); await open(page);
 await expect(page.getByText(/After commission/)).toHaveCount(0);
 const lay=page.locator(".oddsmatcher-table .oddsmatcher-lay-quote-stack").first(); const slot=lay.locator(".oddsmatcher-quote-status-slot"); const trigger=slot.locator(".compact-status-trigger");
 const centres=await Promise.all([lay.locator(".oddsmatcher-quote-block").boundingBox(),trigger.boundingBox()]); expect(centres[0]&&centres[1]).toBeTruthy(); expect(Math.abs((centres[0]!.x+centres[0]!.width/2)-(centres[1]!.x+centres[1]!.width/2))).toBeLessThan(1.5); expect(await slot.evaluate(n=>n.clientHeight)).toBeGreaterThanOrEqual(32);
 await page.screenshot({path:path.join(evidence,"01-liquidity-unavailable-centred-desktop.png"),fullPage:false});
 await slot.evaluate(n=>{n.innerHTML='<span data-known>£123.45</span>';}); const known=slot.locator("[data-known]"); const boxes=await Promise.all([lay.locator(".oddsmatcher-quote-block").boundingBox(),known.boundingBox()]); expect(Math.abs((boxes[0]!.x+boxes[0]!.width/2)-(boxes[1]!.x+boxes[1]!.width/2))).toBeLessThan(1.5);
 await page.screenshot({path:path.join(evidence,"02-known-liquidity-centred-desktop.png"),fullPage:false});
 await page.setViewportSize({width:430,height:900}); await page.screenshot({path:path.join(evidence,"03-liquidity-centred-card.png"),fullPage:false});
});

test("CP-091 shows effective rating only for material non-zero commission",async({page})=>{
 await page.setViewportSize({width:1440,height:820}); await open(page,{...base,exchange_commission:"0",commission_aware_rating:"98.97"},true); await expect(page.getByText(/After commission/)).toHaveCount(0);
 await page.unrouteAll({behavior:"wait"});
 await mock(page,{...base,display_rating:"99.42",exchange_commission:"0.02",commission_aware_rating:"98.97",commission_origin:"profile-account"});
 await page.goto(`/oddsmatcher?profile_id=${profileId}`);
 await expect(page.locator(".oddsmatcher-table").getByText("After 2% commission · 98.97%",{exact:true})).toBeVisible();
});

test("CP-091 end-aligns and clamps My Filters across resize",async({page})=>{
 await fs.mkdir(evidence,{recursive:true}); await page.setViewportSize({width:1440,height:900}); await open(page);
 const button=page.getByRole("button",{name:/My Filters/}); await button.click(); let menu=page.getByRole("dialog",{name:"My Filters"});
 for(const width of [1440,1100,900,760,430]){await page.setViewportSize({width,height:800}); await expect(menu).toBeVisible(); await expect.poll(async()=>menu.evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=15&&innerWidth-r.right>=15;})).toBe(true); const g=await menu.evaluate(n=>{const r=n.getBoundingClientRect();return{left:r.left,right:innerWidth-r.right,pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};}); expect(g.pageOverflow).toBeLessThanOrEqual(0);}
 await page.setViewportSize({width:1100,height:800}); await page.screenshot({path:path.join(evidence,"04-my-filters-end-aligned-1100.png"),fullPage:false}); await expect(menu.getByRole("button",{name:/Edit Owner example/})).toBeVisible(); await expect(menu.getByRole("button",{name:/Delete Owner example/})).toBeVisible();
 await page.keyboard.press("Escape"); await expect(menu).toBeHidden(); await expect(button).toBeFocused();
 await page.getByRole("button",{name:/Back/}).click(); const filter=page.getByRole("dialog",{name:"Back filter"}); const fg=await filter.evaluate(n=>{const r=n.getBoundingClientRect();return{left:r.left,right:innerWidth-r.right,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};});expect(fg.left).toBeGreaterThanOrEqual(15);expect(fg.right).toBeGreaterThanOrEqual(15);expect(fg.overflow).toBeLessThanOrEqual(0);
});
