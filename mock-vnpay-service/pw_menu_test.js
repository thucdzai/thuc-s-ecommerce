const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'mocktest_1780869872@test.com');
  await page.fill('input[type="password"]', 'Test@12345');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  const targets = [
    ['Hồ sơ', '/account/profile'],
    ['Sổ địa chỉ', '/account/addresses'],
    ['Đơn hàng của tôi', '/account/orders'],
    ['Lịch sử thanh toán', '/account/payments'],
    ['Vận chuyển của tôi', '/account/shipments'],
  ];

  let pass = 0, fail = 0;
  for (let round = 1; round <= 3; round++) {
    for (const [label, expectedPath] of targets) {
      await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const trigger = page.locator('header button:has-text("Mock Test User")').first();
      await trigger.click();
      await page.waitForTimeout(300);
      const item = page.locator(`[role="menuitem"]:has-text("${label}")`).first();
      await item.click();
      await page.waitForTimeout(800);
      const url = page.url();
      const ok = url.includes(expectedPath);
      console.log(`round ${round} | ${label.padEnd(20)} -> ${url.replace('http://localhost:3000','')}  ${ok ? 'OK' : 'FAIL ✗'}`);
      ok ? pass++ : fail++;
    }
  }
  console.log(`\nTOTAL: ${pass} passed, ${fail} failed (out of ${pass+fail})`);
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
