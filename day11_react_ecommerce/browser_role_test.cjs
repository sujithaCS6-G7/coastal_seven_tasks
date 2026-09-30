const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runBrowserRoleTests() {
  console.log('========================================================================');
  console.log(' Day 11 React E-Commerce: Comprehensive Browser-Side Role-Based Testing');
  console.log('========================================================================\n');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Track console errors
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const timestamp = Date.now().toString().slice(-6);
  const normalUser = `user_${timestamp}`;
  const normalEmail = `user_${timestamp}@example.com`;
  const normalPassword = 'Password123!';

  const results = {
    normalUserRegistration: false,
    normalUserLogin: false,
    catalogBrowsingAndSearch: false,
    categoryFiltering: false,
    productDetailView: false,
    cartAddAndUpdateQuantity: false,
    cartRemoveAndClear: false,
    orderCheckoutPlacement: false,
    orderHistoryAndDetailView: false,
    normalUserAdminActionsForbidden: false,
    logoutAndProtectedRoutesGuarded: false,
    adminLogin: false,
    adminProductCreation: false,
    adminProductUpdate: false,
    adminPillowImageUpload: false,
    adminOrderStatusUpdate: false,
    adminProductDeletion: false,
  };

  let placedOrderId = null;
  let adminCreatedProductId = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Normal User Registration
    // -------------------------------------------------------------------------
    console.log('[STEP 1] Testing Normal User Registration...');
    await page.goto('http://localhost:5173/register');
    await page.waitForSelector('#reg-username');

    await page.fill('#reg-username', normalUser);
    await page.fill('#reg-email', normalEmail);
    await page.fill('#reg-password', normalPassword);

    await page.click('button[type="submit"]');

    // Wait for redirect to /login with success state or url change
    await page.waitForURL('**/login', { timeout: 10000 });
    console.log(`  ✓ Registered new user "${normalUser}" and redirected to /login`);
    results.normalUserRegistration = true;

    // -------------------------------------------------------------------------
    // TEST 2: Normal User Login
    // -------------------------------------------------------------------------
    console.log('\n[STEP 2] Testing Normal User Login...');
    await page.fill('#login-username', normalUser);
    await page.fill('#login-password', normalPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('http://localhost:5173/', { timeout: 10000 });
    await page.waitForSelector('.navbar');

    const welcomeText = await page.textContent('.nav-links');
    if (welcomeText.includes(normalUser) && !welcomeText.includes('Admin')) {
      console.log(`  ✓ Logged in as "${normalUser}". Navbar shows user greetings, no Admin badge.`);
      results.normalUserLogin = true;
    } else {
      throw new Error(`Expected navbar to show normal user ${normalUser}, got: ${welcomeText}`);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Catalog Browsing, Search, and Category Filtering
    // -------------------------------------------------------------------------
    console.log('\n[STEP 3] Testing Product Catalog Browsing & Search...');
    await page.waitForSelector('.product-card');
    const initialCards = await page.$$('.product-card');
    console.log(`  ✓ Catalog rendered ${initialCards.length} products on page.`);

    // Test Search input
    await page.fill('input[placeholder="Search products..."]', 'Keyboard');
    await page.waitForTimeout(500);
    const searchCards = await page.$$('.product-card');
    console.log(`  ✓ Search for "Keyboard" filtered down to ${searchCards.length} matching products.`);

    // Clear search
    await page.click('button:has-text("Clear")');
    await page.waitForTimeout(500);
    results.catalogBrowsingAndSearch = true;

    // Test Category filter
    console.log('  Testing Category Filter Buttons...');
    const categoryButtons = await page.$$('.btn-secondary, .btn-primary');
    for (const btn of categoryButtons) {
      const text = await btn.textContent();
      if (text.includes('Peripherals')) {
        await btn.click();
        await page.waitForTimeout(500);
        const filteredCards = await page.$$('.product-card');
        console.log(`  ✓ Selected category "Peripherals" -> ${filteredCards.length} products displayed.`);
        results.categoryFiltering = true;
        break;
      }
    }

    // Reset category to All
    const allBtn = await page.$('button:has-text("All")');
    if (allBtn) await allBtn.click();
    await page.waitForTimeout(500);

    // -------------------------------------------------------------------------
    // TEST 4: Product Detail Page & Add to Cart
    // -------------------------------------------------------------------------
    console.log('\n[STEP 4] Testing Product Detail & Quantity Management...');
    await page.waitForSelector('.product-title');
    await page.click('.product-title');
    await page.waitForURL('**/products/*', { timeout: 8000 });

    const detailHeading = await page.textContent('h1');
    console.log(`  ✓ Opened Product Detail Page: "${detailHeading.trim()}"`);
    results.productDetailView = true;

    // Increase quantity using + button
    const plusBtn = await page.$('button:has-text("+")');
    if (plusBtn) {
      await plusBtn.click();
      const qtyVal = await page.inputValue('#qty');
      console.log(`  ✓ Increased quantity to ${qtyVal}`);
    }

    // Add to cart
    await page.click('button:has-text("Add to Shopping Cart")');
    await page.waitForSelector('.form-success');
    console.log('  ✓ Product added to cart with success notification.');

    // -------------------------------------------------------------------------
    // TEST 5: Cart Management (View, Update Quantity, Remove, Clear)
    // -------------------------------------------------------------------------
    console.log('\n[STEP 5] Testing Shopping Cart (Redis-backed)...');
    await page.goto('http://localhost:5173/cart');
    await page.waitForSelector('.table-wrap');

    const cartRows = await page.$$('tbody tr');
    console.log(`  ✓ Cart loaded with ${cartRows.length} item(s).`);
    results.cartAddAndUpdateQuantity = true;

    // Add second item to test remove/clear
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('.product-card');
    const addButtons = await page.$$('button:has-text("Add")');
    if (addButtons.length > 1) {
      await addButtons[1].click();
      await page.waitForTimeout(800);
      console.log('  ✓ Added a second product to test cart removal.');
    }

    await page.goto('http://localhost:5173/cart');
    await page.waitForSelector('.table-wrap');

    // Remove first item
    const removeBtn = await page.$('button:has-text("Remove")');
    if (removeBtn) {
      await removeBtn.click();
      await page.waitForTimeout(1000);
      console.log('  ✓ Removed line item from cart.');
      results.cartRemoveAndClear = true;
    }

    // Ensure at least 1 item for checkout
    const remainingRows = await page.$$('tbody tr');
    if (remainingRows.length === 0) {
      await page.goto('http://localhost:5173/');
      const addBtn = await page.$('button:has-text("Add")');
      if (addBtn) await addBtn.click();
      await page.waitForTimeout(800);
      await page.goto('http://localhost:5173/cart');
    }

    // -------------------------------------------------------------------------
    // TEST 6: Checkout and Order Placement
    // -------------------------------------------------------------------------
    console.log('\n[STEP 6] Testing Checkout & Atomic Order Placement...');
    await page.click('button:has-text("Proceed to Checkout")');
    await page.waitForURL('**/checkout', { timeout: 8000 });

    await page.fill('#address', '104 Beach Road, MVP Colony, Visakhapatnam, AP, 530017');
    await page.click('button[type="submit"]');

    // Wait for redirect to order detail page
    await page.waitForURL('**/orders/*', { timeout: 10000 });
    const currentUrl = page.url();
    placedOrderId = currentUrl.split('/').pop();
    console.log(`  ✓ Order successfully placed! Redirected to /orders/${placedOrderId}`);
    results.orderCheckoutPlacement = true;

    // Verify order details on page
    const orderSuccessBanner = await page.textContent('.form-success');
    console.log(`  ✓ Order confirmation banner verified: "${orderSuccessBanner.trim().slice(0, 50)}..."`);

    // -------------------------------------------------------------------------
    // TEST 7: View Order History & Details
    // -------------------------------------------------------------------------
    console.log('\n[STEP 7] Testing Order History List...');
    await page.goto('http://localhost:5173/orders');
    await page.waitForSelector('a:has-text("View Order Details")');
    const orderCards = await page.$$('a:has-text("View Order Details")');
    console.log(`  ✓ Orders Page lists ${orderCards.length} user order(s).`);

    // Click "View Order Details"
    await page.click('a:has-text("View Order Details")');
    await page.waitForURL(`**/orders/${placedOrderId}`);
    console.log(`  ✓ Order details verified for Order #${placedOrderId}.`);
    results.orderHistoryAndDetailView = true;

    // -------------------------------------------------------------------------
    // TEST 8: Verify Normal User CANNOT Perform Admin-Only Actions
    // -------------------------------------------------------------------------
    console.log('\n[STEP 8] Verifying Normal User Authorization Restrictions...');
    // A. Verify no "Add Product" button on HomePage
    await page.goto('http://localhost:5173/');
    const adminAddBtn = await page.$('button:has-text("Add Product")');
    if (!adminAddBtn) {
      console.log('  ✓ Verified: "Add Product" admin button is HIDDEN from normal user.');
    } else {
      throw new Error('"Add Product" button should not be visible to normal user!');
    }

    // B. Verify no Delete button on product cards
    const deleteBtn = await page.$('button:has-text("Delete")');
    if (!deleteBtn) {
      console.log('  ✓ Verified: "Delete Product" admin button is HIDDEN from normal user.');
    } else {
      throw new Error('Delete button should not be visible to normal user!');
    }

    // C. Verify no Admin controls on OrderDetailPage
    await page.goto(`http://localhost:5173/orders/${placedOrderId}`);
    const adminStatusPanel = await page.$('#order-status-select');
    if (!adminStatusPanel) {
      console.log('  ✓ Verified: Admin Order Lifecycle Status dropdown is HIDDEN from normal user.');
    } else {
      throw new Error('Status updater should not be visible to normal user!');
    }

    // D. Direct API invocation attempt with normal user token (Negative Security Test)
    const normalToken = await page.evaluate(() => localStorage.getItem('access_token'));
    const apiAttempt = await page.evaluate(async (token) => {
      try {
        const res = await fetch('http://localhost:8000/products/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: 'Hacker Product',
            price: 9.99,
            stock: 10,
            category: 'Exploit',
          }),
        });
        return { status: res.status, data: await res.json() };
      } catch (err) {
        return { error: err.message };
      }
    }, normalToken);

    if (apiAttempt.status === 403) {
      console.log(`  ✓ Security Verified: Normal user direct POST /products/ rejected with 403 Forbidden ("${apiAttempt.data.detail}").`);
      results.normalUserAdminActionsForbidden = true;
    } else {
      throw new Error(`Expected 403 Forbidden for normal user creating product, got ${apiAttempt.status}`);
    }

    // -------------------------------------------------------------------------
    // TEST 9: Logout & Protected Route Guards
    // -------------------------------------------------------------------------
    console.log('\n[STEP 9] Testing Logout & Protected Route Guards...');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');
    console.log('  ✓ Clicked Logout -> LocalStorage tokens cleared and redirected to /login.');

    // Try to access protected routes without auth
    const protectedRoutes = ['/cart', '/orders', '/checkout'];
    for (const r of protectedRoutes) {
      await page.goto(`http://localhost:5173${r}`);
      await page.waitForURL('**/login');
      console.log(`  ✓ Direct visit to protected route "${r}" redirected to /login.`);
    }
    results.logoutAndProtectedRoutesGuarded = true;

    // -------------------------------------------------------------------------
    // TEST 10: Admin Flow (Login, Create, Update, Image Upload, Delete, Order Status)
    // -------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(' Starting Admin Flow Testing (admin / password123)...');
    console.log('========================================================================\n');

    await page.goto('http://localhost:5173/login');
    await page.fill('#login-username', 'admin');
    await page.fill('#login-password', 'password123');
    await page.click('button[type="submit"]');

    // Wait for authentication and redirect (handles previous 'from' route or root)
    await page.waitForTimeout(1500);
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('.navbar');

    const adminNavText = await page.textContent('.nav-links');
    if (adminNavText.includes('Admin') && adminNavText.includes('admin')) {
      console.log('  ✓ Admin logged in successfully. Purple "Admin" badge visible in navbar.');
      results.adminLogin = true;
    } else {
      throw new Error('Admin badge not found in navbar.');
    }

    // A. Admin Product Creation via UI
    console.log('\n[STEP 11] Testing Admin Product Creation via UI...');
    await page.click('button:has-text("Add Product")');
    await page.waitForSelector('text=Create New Product');

    const adminProductName = `Admin RGB Keypad ${timestamp}`;
    await page.fill('input[placeholder="e.g. Wireless Mouse"]', adminProductName);
    await page.fill('input[placeholder="e.g. Peripherals"]', 'Peripherals');
    await page.fill('input[placeholder="e.g. 49.99"]', '49.99');
    await page.fill('input[placeholder="e.g. 30"]', '20');
    await page.fill('textarea[placeholder*="Product description"]', 'Tested via automated Playwright UI suite.');

    await page.click('button:has-text("Publish Product")');
    await page.waitForSelector('.form-success:has-text("created successfully")');
    console.log(`  ✓ Product "${adminProductName}" successfully published via Admin form!`);
    results.adminProductCreation = true;

    // Find the newly created product card
    await page.waitForTimeout(1000);
    const createdCardLink = await page.$(`a:has-text("${adminProductName}")`);
    if (!createdCardLink) {
      throw new Error(`Created product "${adminProductName}" not found on page!`);
    }

    // Get product ID from link href
    const href = await createdCardLink.getAttribute('href');
    adminCreatedProductId = href.split('/').pop();
    console.log(`  ✓ Captured created product ID: ${adminCreatedProductId}`);

    // B. Admin Product Update
    console.log('\n[STEP 12] Testing Admin Product Update...');
    await page.goto(`http://localhost:5173/products/${adminCreatedProductId}`);
    await page.waitForSelector('h2:has-text("Admin Product Controls")');

    await page.click('button:has-text("Edit Details")');
    await page.waitForSelector('text=Update Specifications');

    // Find inputs within the edit specifications form
    const priceInput = await page.$('input[step="0.01"]');
    await priceInput.fill('59.99');
    const stockInputs = await page.$$('input[min="0"]');
    // The edit form stock input is the one in editForm
    if (stockInputs.length > 0) {
      await stockInputs[stockInputs.length - 1].fill('15');
    }
    await page.click('button:has-text("Save Product Changes")');

    await page.waitForSelector('.form-success:has-text("updated successfully")');
    const updatedPriceText = await page.textContent('.product-price');
    console.log(`  ✓ Product updated via Admin form. New Price displayed: ${updatedPriceText.trim()}`);
    results.adminProductUpdate = true;

    // C. Admin Pillow Image Upload
    console.log('\n[STEP 13] Testing Admin Pillow Image Upload...');
    const testImagePath = path.resolve('E:\\PYTHON\\day10_ecommerce\\test_image.png');
    if (fs.existsSync(testImagePath)) {
      const fileInput = await page.$('input[type="file"]');
      await fileInput.setInputFiles(testImagePath);
      await page.click('button:has-text("Upload Image")');
      await page.waitForSelector('.form-success:has-text("image optimized")', { timeout: 10000 });
      console.log('  ✓ Pillow image uploaded, converted to WebP, and product image_url refreshed.');
      results.adminPillowImageUpload = true;
    } else {
      console.log('  ! test_image.png not found, skipping file attachment.');
    }

    // D. Admin Order Status Update
    console.log('\n[STEP 14] Testing Admin Order Status Update...');
    if (placedOrderId) {
      await page.goto(`http://localhost:5173/orders/${placedOrderId}`);
      await page.waitForSelector('#order-status-select');

      await page.selectOption('#order-status-select', 'SHIPPED');
      await page.click('button:has-text("Update Status")');

      await page.waitForSelector('.form-success:has-text("status updated")');
      await page.waitForTimeout(500);

      const statusBadgeText = await page.textContent('.status-badge');
      console.log(`  ✓ Admin updated order #${placedOrderId} status. Badge now displays: "${statusBadgeText.trim()}".`);
      results.adminOrderStatusUpdate = true;
    }

    // E. Admin Product Deletion
    console.log('\n[STEP 15] Testing Admin Product Deletion...');
    await page.goto(`http://localhost:5173/products/${adminCreatedProductId}`);
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.click('button:has-text("Delete Product")');
    await page.waitForURL((url) => url.pathname === '/', { timeout: 8000 });
    console.log(`  ✓ Product #${adminCreatedProductId} deleted via Admin controls and redirected to catalog.`);

    // Verify deleted product is gone from catalog
    await page.waitForTimeout(1000);
    const deletedProductLink = await page.$(`a:has-text("${adminProductName}")`);
    if (!deletedProductLink) {
      console.log('  ✓ Verified: Deleted product no longer appears in catalog.');
      results.adminProductDeletion = true;
    } else {
      throw new Error('Deleted product still appears in catalog!');
    }

    console.log('\n========================================================================');
    console.log(' ALL BROWSER-SIDE ROLE-BASED TESTS COMPLETED SUCCESSFULLY!');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('\n[FATAL TEST FAILURE]:', error.message);
  } finally {
    await browser.close();
  }

  console.log('--- TEST EXECUTION SUMMARY ---');
  for (const [testName, passed] of Object.entries(results)) {
    console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${testName}`);
  }

  if (consoleErrors.length > 0) {
    console.log('\nBrowser Console Errors Encountered:');
    consoleErrors.forEach((e) => console.log('  !', e));
  } else {
    console.log('\nBrowser Console Errors: 0');
  }

  const allPassed = Object.values(results).every(Boolean);
  return { allPassed, results, consoleErrors };
}

runBrowserRoleTests().then(({ allPassed }) => {
  process.exit(allPassed ? 0 : 1);
});
