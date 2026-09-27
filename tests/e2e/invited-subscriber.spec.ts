import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';

async function geometry(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const clipped = await page.locator('main .field-control').evaluateAll(fields => fields.flatMap(field => {
    const box=field.getBoundingClientRect(); return [...field.querySelectorAll('input,textarea,select')].filter(node => { const r=node.getBoundingClientRect(); return r.width && (r.left < box.left-1 || r.right > box.right+1); }).map(node=>node.tagName);
  })); expect(clipped).toEqual([]);
}
for (const theme of ['light', 'dark']) {
 test(`invited request to explicit read-only access: ${theme}`, async ({ browser, baseURL }) => {
  const owner=await browser.newContext({ baseURL });
  await owner.addCookies([{name:'pd_session',value:process.env.OPENFORGE_E2E_SESSION_TOKEN!,url:baseURL!,httpOnly:true,sameSite:'Lax'}]);
  const page=await owner.newPage();
  const health=await (await owner.request.get('/api/healthz')).json();expect(health.runtime_role).toBe('test');expect(health.database_identity).toBe('cp056-synthetic');
  await page.goto('/profiles/requests');
  await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;localStorage.setItem('pd-required-storage-notice','acknowledged');},theme);
  const email=`browser-${theme}-${Date.now()}@example.invalid`;
  await page.getByLabel('Invited email').fill(email);
  await page.getByRole('button',{name:'Create private invitation'}).click();
  const link=page.getByLabel('Private invitation link');await expect(link).not.toHaveValue('');const invite=await link.inputValue();
  const applicant=await browser.newContext({baseURL,permissions:["clipboard-read","clipboard-write"]});const a=await applicant.newPage();await a.goto(invite);
  await expect(a.getByRole('heading',{name:'Your private invitation'})).toBeVisible();
  expect(a.url()).not.toContain('token=');
  await a.route('https://accounts.google.com/**', route=>route.fulfill({body:'Synthetic OAuth transport boundary; binding is covered by API tests.'}));
  const inviteResponse=a.waitForResponse(r=>r.url().includes('/api/auth/invite-login'));
  await a.getByRole('button',{name:'Continue with Google'}).click();
  expect((await inviteResponse).status()).toBe(200);
  await a.waitForURL('https://accounts.google.com/**');
  // Real OAuth binding/mismatch/return login are covered through TestClient's
  // synthetic Google transport. Browser sessions use that same acceptance primitive.
  const session=execFileSync('./scripts/run-python.sh',['tests/helpers/subscriber-browser-session.py'],{input:JSON.stringify({email,token:new URLSearchParams(new URL(invite).hash.slice(1)).get('token')}),encoding:'utf8'}).trim();
  await applicant.addCookies([{name:'pd_session',value:session,url:baseURL!,httpOnly:true,sameSite:'Lax'}]);
  await a.goto('/subscriber');
  await a.getByLabel('Display name',{exact:true}).fill('Applicant draft');
  await a.getByRole('button',{name:'Discard changes'}).click();await expect(a.getByLabel('Display name',{exact:true})).toHaveValue('Synthetic Applicant');
  await a.getByLabel('Country code (two letters)').fill('GB');await a.getByLabel('Proposed self-funding (£, optional)').fill('208.51');
  await a.getByLabel('Request Fund Manager funding review').check();await a.getByLabel('Message / response').fill('Synthetic application message');
  for (const [width,scale] of [[1440,100],[390,100],[760,200]]) {await a.setViewportSize({width,height:1000});await a.evaluate(({theme,scale})=>{document.documentElement.dataset.theme=theme;document.documentElement.style.fontSize=`${scale}%`;},{theme,scale});await geometry(a);}
  await a.emulateMedia({reducedMotion:'reduce'});await a.getByLabel('Country code (two letters)').focus();await expect(a.getByLabel('Country code (two letters)')).toBeFocused();
  await a.route('**/api/subscriber/applications/*/submit',async route=>{await route.fulfill({status:503,json:{detail:'Synthetic temporary save failure'}});},{times:1});
  await a.getByRole('button',{name:'Submit request',exact:true}).click();await expect(a.locator('main').getByRole('alert')).toContainText('Synthetic temporary save failure');await expect(a.getByLabel('Message / response')).toHaveValue('Synthetic application message');
  await a.getByRole('button',{name:'Submit request',exact:true}).click();await expect(a.getByRole('heading',{name:'Pending review',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Refresh requests'}).click();
  const card=page.locator('[data-pd-id="subscriber.request"]').filter({hasText:email});
  await card.getByLabel('Message to applicant').fill('Please confirm your region');await card.getByLabel('Private Fund Manager note').fill('PRIVATE NOTE NEVER SHARED');
  await card.getByRole('button',{name:'Request more information'}).click();
  await a.getByRole('button',{name:'Refresh status'}).click();await expect(a.getByRole('heading',{name:'More information requested',exact:true})).toBeVisible();await expect(a.getByText('Please confirm your region',{exact:true})).toBeVisible();await expect(a.getByText('PRIVATE NOTE NEVER SHARED')).toHaveCount(0);
  await a.getByLabel('Region (optional)').fill('Synthetic region');await a.getByRole('button',{name:'Submit response'}).click();await expect(a.getByRole('heading',{name:'Pending review',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Refresh requests'}).click();await card.getByRole('button',{name:'Approve request'}).click();
  await a.getByRole('button',{name:'Refresh status'}).click();await expect(a.getByRole('heading',{name:'Approved',exact:true})).toBeVisible();await expect(a.getByRole('link',{name:/View .* · /})).toHaveCount(0);
  await card.getByLabel('Profile name',{exact:true}).fill(`Managed ${theme}`);await card.getByLabel('Profile code',{exact:true}).fill(`CP056-${theme.toUpperCase()}-${Date.now()}`);await card.getByLabel('Management fee (%)').fill('12.5');await card.getByLabel('Investment fee (%)').fill('5');await card.getByLabel('Tracking start').fill('2026-01-01');
  await page.setViewportSize({width:390,height:1000});await geometry(page);
  await card.getByRole('button',{name:'Create and link Managed Profile'}).click();await expect(card.getByRole('button',{name:'Grant read-only access'})).toBeVisible();
  await a.getByRole('button',{name:'Refresh status'}).click();await expect(a.getByRole('link',{name:/View .* · /})).toHaveCount(0);
  await card.getByRole('button',{name:'Grant read-only access'}).click();await expect(card.getByRole('button',{name:'Revoke read-only access'})).toBeVisible();
  await a.getByRole('button',{name:'Refresh status'}).click();await a.getByRole('link',{name:/View .* · /}).click();await expect(a.getByRole('heading',{name:'Confirmed fee statements'})).toBeVisible();await expect(a.getByText('No confirmed statements are available.')).toBeVisible();await geometry(a);
  const profileId=a.url().split('/').pop()!;
  execFileSync('./scripts/run-python.sh',['tests/helpers/subscriber-browser-session.py'],{input:JSON.stringify({action:'statements',email,profile_id:profileId}),encoding:'utf8'});
  await a.getByRole('button',{name:'Refresh Profile'}).click();
  await expect(a.locator('tbody tr')).toHaveCount(3);
  const statement=await (await applicant.request.get(`/api/subscriber/profiles/${profileId}`)).json();
  expect(statement.statements.map((s: {eligible_period_profit:string})=>s.eligible_period_profit).sort()).toEqual(['-20.00','0.00','100.00']);
  for (const [width,scale] of [[390,100],[760,200]]) {await a.setViewportSize({width,height:1000});await a.evaluate(scale=>document.documentElement.style.fontSize=`${scale}%`,scale);await geometry(a);}
  const copy=a.getByRole('button',{name:/Copy eligible period profit.*100/});
  await copy.focus();await expect(copy).toBeFocused();await copy.press('Enter');
  expect(await a.evaluate(()=>navigator.clipboard.readText())).toBe('100.00');
  await geometry(a);
  // Synthetic screenshots retained privately for inspection of the newly exposed statement table.
  await a.screenshot({path:`/private/tmp/cp056/subscriber-${theme}.png`,fullPage:true});
  expect((await applicant.request.get('/api/profiles')).status()).toBe(403);
  expect((await applicant.request.post('/api/profiles/other/cash-adjustments',{data:{}})).status()).toBe(403);
  await a.goto('/profiles');await expect(a).toHaveURL(/\/subscriber$/);
  await a.getByRole('link',{name:/View .* · /}).click();
  let releaseOld!:()=>void;let oldStarted!:()=>void;
  const started=new Promise<void>(resolve=>{oldStarted=resolve;});
  const release=new Promise<void>(resolve=>{releaseOld=resolve;});
  await a.route(`**/api/subscriber/profiles/${profileId}`,async route=>{const old=await route.fetch();oldStarted();await release;await route.fulfill({response:old});},{times:1});
  await a.getByRole('button',{name:'Refresh Profile'}).click();await started;
  await card.getByRole('button',{name:'Revoke read-only access'}).click();await expect(card.getByRole('button',{name:'Grant read-only access'})).toBeVisible();
  await a.getByRole('button',{name:'Refresh Profile'}).click();await expect(a.locator('main').getByRole('alert')).toContainText('Profile unavailable');await expect(a.getByRole('heading',{name:'Confirmed fee statements'})).toHaveCount(0);releaseOld();await a.waitForTimeout(100);await expect(a.getByRole('heading',{name:'Confirmed fee statements'})).toHaveCount(0);
  await owner.close();await applicant.close();
 });
}
