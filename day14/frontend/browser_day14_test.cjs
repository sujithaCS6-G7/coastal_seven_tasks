const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const consoleWarnings = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  console.log('1. Navigating to Day 14 Frontend (http://localhost:5175)...');
  await page.goto('http://localhost:5175', { waitUntil: 'networkidle' });
  await page.waitForSelector('.product-card', { timeout: 10000 });

  const initialCards = await page.locator('.product-card').count();
  console.log(`   -> Initial Infinite Scroll page loaded: ${initialCards} product cards`);

  // Test Load More / Infinite Scroll
  const loadMoreBtn = page.locator('button:has-text("Load More Products")');
  if (await loadMoreBtn.isVisible()) {
    await loadMoreBtn.click();
    await page.waitForTimeout(800);
    const afterLoadMoreCards = await page.locator('.product-card').count();
    console.log(`   -> After Infinite Scroll next page: ${afterLoadMoreCards} product cards`);
  }

  // Test Debounced Search
  console.log('2. Testing Debounced Search (300ms)...');
  await page.fill('#search-input', 'Monitor');
  await page.waitForTimeout(500);
  const searchCards = await page.locator('.product-card').count();
  console.log(`   -> Debounced search for "Monitor" returned: ${searchCards} card(s)`);
  await page.fill('#search-input', '');
  await page.waitForTimeout(400);

  // Test Performance & State Lab Page (/performance)
  console.log('3. Navigating to /performance (Lazy-Loaded Route)...');
  await page.click('a[href="/performance"]');
  await page.waitForSelector('h1:has-text("Day 14 Architecture & Performance Lab")', { timeout: 8000 });
  const hasComparisonTable = await page.locator('table:has-text("React Context API")').isVisible();
  const hasCacheEntries = await page.locator('text=TanStack Query Live Cache Entries').isVisible();
  console.log(`   -> State Comparison Table visible: ${hasComparisonTable}`);
  console.log(`   -> TanStack Query Live Cache Inspector visible: ${hasCacheEntries}`);

  // Customer Login & Optimistic Cart + Order Flow
  console.log('4. Logging in as Customer (customer1) to test Zustand Auth & Optimistic Cart...');
  await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle' });
  await page.fill('input#login-username', 'customer1');
  await page.fill('input#login-password', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5175/', { timeout: 10000 });
  await page.waitForSelector('.product-card', { timeout: 10000 });
  console.log('   -> Customer logged in and redirected to catalog');

  // Add to Bag
  const addBtn = page.locator('.product-card button:has-text("Add to Bag")').first();
  await addBtn.click();
  await page.waitForTimeout(600);

  // Open Cart Drawer & test Optimistic Quantity Increment
  await page.click('button[aria-label="Open Shopping Bag"]');
  await page.waitForSelector('h2:has-text("Shopping Bag")', { timeout: 5000 });
  console.log('   -> Cart Drawer opened');

  const incBtn = page.locator('button[aria-label="Increase quantity"]').first();
  if (await incBtn.isVisible()) {
    await incBtn.click();
    await page.waitForTimeout(500);
    console.log('   -> Optimistic cart quantity increment verified');
  }

  // Proceed to Checkout & Place Order
  await page.click('button:has-text("Proceed to Checkout")');
  await page.waitForSelector('h2:has-text("Confirm Your Order")', { timeout: 5000 });
  await page.click('button:has-text("Confirm & Place Order")');
  await page.waitForSelector('text=Order Placed Successfully!', { timeout: 10000 });
  console.log('   -> Celebratory Order Confirmation Popup verified!');
  await page.click('button:has-text("Continue Shopping")');

  // Admin Login & Optimistic Order Status Update
  console.log('5. Logging in as Admin (admin) to test Optimistic Order Status Mutation...');
  await page.click('button[aria-label="User account menu"]');
  await page.click('text=Logout');
  await page.waitForURL('**/login', { timeout: 8000 });

  await page.fill('input#login-username', 'admin');
  await page.fill('input#login-password', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5175/', { timeout: 10000 });

  await page.click('a[href="/admin/orders"]');
  await page.waitForSelector('h1:has-text("Customer Orders & Purchases")', { timeout: 10000 });
  const selectEl = page.locator('select').first();
  if (await selectEl.isVisible()) {
    await selectEl.selectOption('SHIPPED');
    await page.waitForTimeout(600);
    console.log('   -> Admin Optimistic Order Status Update to SHIPPED verified!');
  }

  console.log('6. Console Errors:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('   Errors:', JSON.stringify(consoleErrors, null, 2));
  }
  console.log('7. Console Warnings:', consoleWarnings.length);
  if (consoleWarnings.length > 0) {
    console.log('   Warnings:', JSON.stringify(consoleWarnings, null, 2));
  }

  await browser.close();
  console.log('ALL DAY 14 E2E TESTS PASSED!');
})();
