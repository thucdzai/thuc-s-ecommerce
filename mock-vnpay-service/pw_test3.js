const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));

  const ts = Date.now();
  const email = `cartcheck_${ts}@test.com`;

  console.log('--- register & login ---');
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle' });
  await page.fill('input[name="fullName"], input[placeholder*="họ" i], input[placeholder*="tên" i]', 'Cart Check User').catch(()=>{});
  await page.fill('input[type="email"]', email);
  const pwInputs = await page.locator('input[type="password"]').all();
  for (const inp of pwInputs) await inp.fill('Test@12345');
  await page.fill('input[type="tel"], input[name="phone"]', '0909000111').catch(()=>{});
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log('after register url:', page.url());

  if (page.url().includes('register')) {
    // maybe needs explicit login
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'Test@12345');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  }
  console.log('logged in url:', page.url());

  console.log('--- add product to cart ---');
  await page.goto('http://localhost:3000/products/1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const addBtn = page.locator('button:has-text("Thêm vào giỏ")').first();
  console.log('add-to-cart btn count:', await addBtn.count());
  await addBtn.click();
  await page.waitForTimeout(1500);

  console.log('--- check cart before checkout ---');
  await page.goto('http://localhost:3000/cart', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  let cartText = await page.evaluate(() => document.body.innerText);
  console.log('CART (before):', cartText.includes('Giỏ hàng trống') ? 'EMPTY' : 'HAS ITEMS');

  // need an address first
  console.log('--- ensure address exists ---');
  await page.goto('http://localhost:3000/account/addresses', {waitUntil:'networkidle'});
  await page.waitForTimeout(1000);
  const addAddrBtn = page.locator('button:has-text("Thêm địa chỉ")').first();
  if (await addAddrBtn.count() > 0 && (await page.evaluate(() => document.body.innerText)).includes('Chưa có địa chỉ')) {
    await addAddrBtn.click();
    await page.waitForTimeout(500);
    await page.fill('#recipientName', 'Cart Check User');
    await page.fill('#phone', '0909000111');
    await page.fill('#province', 'TP.HCM');
    await page.fill('#district', 'Quan 1');
    await page.fill('#ward', 'P. Ben Nghe');
    await page.fill('#streetDetail', '99 Test St');
    await page.click('button[form="address-form"]');
    await page.waitForTimeout(1500);
  }

  console.log('--- checkout ---');
  await page.goto('http://localhost:3000/checkout', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const placeOrderBtn = page.locator('button:has-text("Đặt hàng & Thanh toán")').first();
  console.log('place order btn count:', await placeOrderBtn.count());
  await placeOrderBtn.click();
  await page.waitForTimeout(3000);
  console.log('after checkout url:', page.url());

  console.log('--- check cart after checkout ---');
  await page.goto('http://localhost:3000/cart', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  cartText = await page.evaluate(() => document.body.innerText);
  console.log('CART (after):', cartText.includes('Giỏ hàng trống') ? 'EMPTY ✓' : 'STILL HAS ITEMS ✗');
  console.log(cartText.slice(0, 300));

  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
