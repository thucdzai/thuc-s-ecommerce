const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (msg) => { if (msg.type() === 'error') console.log('[console:error]', msg.text()); });
  page.on('response', (res) => { if (res.status() >= 400 && res.url().includes('/api/')) console.log('[http-error]', res.status(), res.url()); });

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'admin@tttn.com');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  console.log('logged in url=', page.url());

  await page.goto('http://localhost:3000/admin/orders', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // open the status filter select and pick each option
  const selectTrigger = page.locator('button[role="combobox"], [data-slot="select-trigger"]').first();
  console.log('select trigger count:', await selectTrigger.count());
  await selectTrigger.click();
  await page.waitForTimeout(400);
  const options = await page.locator('[role="option"]').allTextContents();
  console.log('options:', options);

  for (const opt of options) {
    if (opt.trim() === 'Tất cả' || !opt.trim()) continue;
    await selectTrigger.click().catch(()=>{});
    await page.waitForTimeout(300);
    const optLocator = page.locator('[role="option"]', { hasText: opt }).first();
    await optLocator.click();
    await page.waitForTimeout(800);
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasError = bodyText.includes('không hợp lệ') || bodyText.includes('Không thể tải');
    console.log(`status="${opt}" -> ${hasError ? 'ERROR ✗' : 'OK ✓'}`);
  }

  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
