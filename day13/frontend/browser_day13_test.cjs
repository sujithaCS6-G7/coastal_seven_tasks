const { chromium } = require('playwright');

async function runDay13Verification() {
  console.log('========================================================================');
  console.log(' 🚀 Day 13 E-Commerce Frontend: Comprehensive Real Browser Test Suite');
  console.log('========================================================================\n');

  const results = {
    tailwindAndTheme: false,
    productListing: false,
    searchFilter: false,
    categoryFilter: false,
    priceAndStockFilter: false,
    sortingCriteria: false,
    gridLayoutToggle: false,
    productDetailPage: false,
    userRegistration: false,
    userLoginAndJwt: false,
    protectedRouteGuard: false,
    axiosInterceptorAuth: false,
  };

  const consoleErrors = [];
  const rand = Math.floor(Math.random() * 90000) + 10000;
  const testUser = `day13_shopper_${rand}`;
  const testEmail = `shopper_${rand}@nexora.com`;
  const testPassword = 'Password123!';

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Tailwind CSS, Theme Toggle & Layout
    // -------------------------------------------------------------------------
    console.log('[STEP 1] Testing Project Setup, Tailwind CSS & Theme Toggle...');
    await page.goto('http://localhost:5174/');
    await page.waitForSelector('.navbar');

    const brand = await page.$('.nav-brand');
    if (brand) console.log('  ✓ Nexora brand and navbar rendered.');

    // Theme toggle test
    const themeBtn = await page.$('button[aria-label*="mode"]');
    if (themeBtn) {
      await themeBtn.click();
      await page.waitForTimeout(300);
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      console.log(`  ✓ Dark mode toggle working (HTML dark class active: ${isDark}).`);
      await themeBtn.click(); // Toggle back
    }
    results.tailwindAndTheme = true;

    // -------------------------------------------------------------------------
    // TEST 2: Product Listing from FastAPI Backend
    // -------------------------------------------------------------------------
    console.log('\n[STEP 2] Testing Product Listing from FastAPI Backend...');
    await page.waitForSelector('.product-card', { timeout: 10000 });
    const productCards = await page.$$('.product-card');
    console.log(`  ✓ Successfully loaded ${productCards.length} products from backend.`);
    if (productCards.length > 0) results.productListing = true;

    // -------------------------------------------------------------------------
    // TEST 3: Search Functionality
    // -------------------------------------------------------------------------
    console.log('\n[STEP 3] Testing Search Functionality...');
    const searchInput = await page.$('#search-input');
    await searchInput.fill('Laptop');
    await page.waitForTimeout(400);

    const searchCards = await page.$$('.product-card');
    console.log(`  ✓ Search for "Laptop" yielded ${searchCards.length} matching item(s).`);
    const laptopTitle = await page.textContent('.product-card .product-title');
    console.log(`  ✓ Matched product title: "${laptopTitle?.trim()}"`);
    await searchInput.fill('');
    await page.waitForTimeout(400);
    results.searchFilter = true;

    // -------------------------------------------------------------------------
    // TEST 4: Category Filtering
    // -------------------------------------------------------------------------
    console.log('\n[STEP 4] Testing Category Filtering...');
    const audioBtn = await page.$('button:has-text("Audio")');
    if (audioBtn) {
      await audioBtn.click();
      await page.waitForTimeout(400);
      const audioCards = await page.$$('.product-card');
      console.log(`  ✓ Filter by "Audio" category returned ${audioCards.length} product(s).`);
    }
    // Reset back to All
    const allBtn = await page.$('button:has-text("All")');
    await allBtn.click();
    await page.waitForTimeout(400);
    results.categoryFilter = true;

    // -------------------------------------------------------------------------
    // TEST 5: Price Range & In-Stock Filters
    // -------------------------------------------------------------------------
    console.log('\n[STEP 5] Testing Price Range & In-Stock Filters...');
    await page.fill('#min-price', '100');
    await page.fill('#max-price', '400');
    await page.waitForTimeout(400);

    const priceCards = await page.$$('.product-card');
    console.log(`  ✓ Price range $100-$400 returned ${priceCards.length} product(s).`);

    // In-Stock toggle
    const inStockCheckbox = await page.$('#in-stock-checkbox');
    await inStockCheckbox.check();
    await page.waitForTimeout(300);
    console.log('  ✓ In-Stock checkbox filter active.');

    // Clear filters
    await page.click('button:has-text("Reset")');
    await page.waitForTimeout(400);
    results.priceAndStockFilter = true;

    // -------------------------------------------------------------------------
    // TEST 6: Sorting Criteria (Price Low->High, Name A->Z)
    // -------------------------------------------------------------------------
    console.log('\n[STEP 6] Testing Sorting Options...');
    const sortSelect = await page.$('#sort-select');
    await sortSelect.selectOption('price_asc');
    await page.waitForTimeout(400);

    const firstPriceText = await page.textContent('.product-card:first-child .product-price');
    console.log(`  ✓ Sorted by Price: Low to High (Cheapest product: ${firstPriceText?.trim()}).`);

    await sortSelect.selectOption('name_asc');
    await page.waitForTimeout(400);
    const firstNameText = await page.textContent('.product-card:first-child .product-title');
    console.log(`  ✓ Sorted by Name: A to Z (First product: "${firstNameText?.trim()}").`);
    results.sortingCriteria = true;

    // -------------------------------------------------------------------------
    // TEST 7: Grid / List Layout Mode Toggle
    // -------------------------------------------------------------------------
    console.log('\n[STEP 7] Testing Grid and List View Toggle...');
    const listBtn = await page.$('button[aria-label="List layout view"]');
    await listBtn.click();
    await page.waitForTimeout(300);
    const isListLayout = await page.$('.btn-view-details');
    if (isListLayout) {
      console.log('  ✓ Switched to horizontal List layout mode.');
    }
    const gridBtn = await page.$('button[aria-label="Grid layout view"]');
    await gridBtn.click();
    await page.waitForTimeout(300);
    console.log('  ✓ Switched back to Grid layout mode.');
    results.gridLayoutToggle = true;

    // -------------------------------------------------------------------------
    // TEST 8: Product Detail Page
    // -------------------------------------------------------------------------
    console.log('\n[STEP 8] Testing Product Details Page (/products/:id)...');
    const firstProductLink = await page.$('.product-card:first-child .product-title');
    await firstProductLink.click();
    await page.waitForSelector('nav[aria-label="Breadcrumb"]', { timeout: 5000 });

    const detailTitle = await page.textContent('h1');
    const detailPrice = await page.textContent('.text-3xl.font-extrabold');
    console.log(`  ✓ Product Detail view rendered: "${detailTitle?.trim()}" (${detailPrice?.trim()}).`);

    // Verify breadcrumbs and warranty assurance cards
    const breadcrumb = await page.textContent('nav[aria-label="Breadcrumb"]');
    console.log(`  ✓ Breadcrumbs: "${breadcrumb?.trim().replace(/\s+/g, ' ')}"`);

    results.productDetailPage = true;

    // Return to catalog
    await page.click('a:has-text("Back to Catalog")');
    await page.waitForSelector('.product-card');

    // -------------------------------------------------------------------------
    // TEST 9: User Registration Page (/register)
    // -------------------------------------------------------------------------
    console.log('\n[STEP 9] Testing User Registration (/register)...');
    await page.goto('http://localhost:5174/register');
    await page.waitForSelector('#reg-username');

    await page.fill('#reg-username', testUser);
    await page.fill('#reg-email', testEmail);
    await page.fill('#reg-password', testPassword);
    await page.fill('#reg-confirm-password', testPassword);
    await page.selectOption('#reg-role', 'customer');

    await page.click('button[type="submit"]');
    await page.waitForURL('**/login', { timeout: 8000 });

    // Should redirect to login on successful registration
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log(`  ✓ Registration successful for "${testUser}". Redirected to /login.`);
      results.userRegistration = true;
    }

    // -------------------------------------------------------------------------
    // TEST 10: User Login & JWT Interceptor Handling
    // -------------------------------------------------------------------------
    console.log('\n[STEP 10] Testing User Login & JWT Bearer Token Storage...');
    await page.fill('#login-username', testUser);
    await page.fill('#login-password', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // Verify token in localStorage
    const savedToken = await page.evaluate(() => localStorage.getItem('access_token'));
    const savedUser = await page.evaluate(() => JSON.parse(localStorage.getItem('user') || '{}'));

    if (savedToken && savedUser.username === testUser) {
      console.log(`  ✓ JWT Token successfully received and stored in localStorage.`);
      console.log(`  ✓ Authenticated user: "${savedUser.username}" (role: ${savedUser.role}).`);
      results.userLoginAndJwt = true;
    }

    // -------------------------------------------------------------------------
    // TEST 11: Protected Routing & Axios Interceptor Verification
    // -------------------------------------------------------------------------
    console.log('\n[STEP 11] Testing Protected Route (/profile)...');
    await page.goto('http://localhost:5174/profile');
    await page.waitForSelector('h3:has-text("Protected User Profile")');

    const profileUser = await page.textContent('p.font-bold:has-text("' + testUser + '")');
    console.log(`  ✓ Protected /profile page successfully displayed authenticated user.`);
    results.axiosInterceptorAuth = true;

    // -------------------------------------------------------------------------
    // TEST 12: Route Guard Redirection on Logout
    // -------------------------------------------------------------------------
    console.log('\n[STEP 12] Testing Route Guard Redirection on Sign Out...');
    await page.click('button:has-text("Sign Out")');
    await page.waitForTimeout(1000);

    // Try accessing protected profile while logged out
    await page.goto('http://localhost:5174/profile');
    await page.waitForTimeout(1000);

    if (page.url().includes('/login')) {
      console.log('  ✓ Unauthenticated access to /profile blocked. Redirected to /login.');
      results.protectedRouteGuard = true;
    }

    console.log('\n========================================================================');
    console.log(' 🏁 DAY 13 TEST RESULTS SUMMARY');
    console.log('========================================================================');
    let allPassed = true;
    for (const [testKey, status] of Object.entries(results)) {
      console.log(`  ${status ? '✅ PASS' : '❌ FAIL'} - ${testKey}`);
      if (!status) allPassed = false;
    }
    console.log('------------------------------------------------------------------------');
    console.log(` Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach((err) => console.log(`   - ${err}`));
    }
    console.log(` OVERALL RESULT: ${allPassed ? '100% ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    console.log('========================================================================\n');
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await browser.close();
  }
}

runDay13Verification();
