const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));

  const email = 'mocktest_1780869872@test.com';
  console.log('--- login ---');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'Test@12345');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log('logged in url:', page.url());

  console.log('--- add product to cart ---');
  await page.goto('http://localhost:3000/products/2', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const addBtn = page.locator('button:has-text("Thêm vào giỏ")').first();
  console.log('add-to-cart btn count:', await addBtn.count());
  await addBtn.click();
  await page.waitForTimeout(1500);

  await page.goto('http://localhost:3000/cart', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  let cartText = await page.evaluate(() => document.body.innerText);
  console.log('CART (before checkout):', cartText.includes('Giỏ hàng trống') ? 'EMPTY' : 'HAS ITEMS');

  console.log('--- checkout ---');
  await page.goto('http://localhost:3000/checkout', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  console.log('checkout page text snippet:', (await page.evaluate(() => document.body.innerText)).slice(0, 200));
  const placeOrderBtn = page.locator('button:has-text("Đặt hàng & Thanh toán")').first();
  console.log('place order btn count:', await placeOrderBtn.count());
  if (await placeOrderBtn.count() > 0) {
    await placeOrderBtn.click();
    await page.waitForTimeout(3000);
  }
  console.log('after checkout url:', page.url());

  await page.goto('http://localhost:3000/cart', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  cartText = await page.evaluate(() => document.body.innerText);
  console.log('CART (after checkout):', cartText.includes('Giỏ hàng trống') ? 'EMPTY ✓ (fix works)' : 'STILL HAS ITEMS ✗');
  console.log(cartText.slice(0, 200));

  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
