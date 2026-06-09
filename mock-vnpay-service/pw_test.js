const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', (msg) => console.log(`[console:${msg.type()}]`, msg.text()));
  page.on('pageerror', (err) => console.log('[pageerror]', err.message, '\n', err.stack));
  page.on('requestfailed', (req) => console.log('[requestfailed]', req.url(), req.failure()?.errorText));
  page.on('response', (res) => { if (res.status() >= 400) console.log('[http-error]', res.status(), res.url()); });

  console.log('--- goto login ---');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

  await page.fill('input[name="email"], input[type="email"]', 'mocktest_1780869872@test.com');
  await page.fill('input[name="password"], input[type="password"]', 'Test@12345');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log('URL after login:', page.url());

  console.log('--- navigate to /account/profile ---');
  await page.goto('http://localhost:3000/account/profile', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('URL now:', page.url());
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
  console.log('BODY TEXT:', JSON.stringify(bodyText));
  const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML?.slice(0, 800));
  console.log('ROOT HTML (first 800):', rootHtml);

  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
