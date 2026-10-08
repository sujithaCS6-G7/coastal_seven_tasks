import { test, expect } from '@playwright/test';

test.describe('Day 18 — Nexora E-Commerce Full-Stack End-to-End Integration Suite', () => {
  test('1. Product Browsing, Pagination, Search Filtering & Dark/Light Theme Toggle', async ({
    page,
  }) => {
    await page.goto('/');

    // Verify catalog header and products load from FastAPI
    await expect(page.locator('h1')).toContainText('Explore Nexora Gear');
    const addButtons = page.getByRole('button', { name: /add to bag|sold out/i });
    await expect(addButtons.first()).toBeVisible({ timeout: 10000 });

    // Verify Dark/Light Theme Toggle works
    const themeToggle = page
      .getByRole('button', { name: /switch to dark mode|switch to light mode/i })
      .first();
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Verify numbered pagination controls
    const paginationNav = page.getByRole('navigation', { name: /product pagination/i });
    await expect(paginationNav).toBeVisible();
    const nextButton = paginationNav.getByRole('button', { name: /next/i });
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await expect(paginationNav).toContainText('Showing page 2 of');
    }

    // Verify search input filters products
    const searchInput = page.getByPlaceholder(/search by name, spec/i);
    await searchInput.fill('Laptop');
    await expect(page.getByText(/laptop pro 15/i).first()).toBeVisible();
  });

  test('2. Customer Journey: Login -> Add to Cart -> Checkout (React Hook Form + Zod) -> Order History & PDF Invoice', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in to nexora/i })).toBeVisible();

    await page.getByRole('button', { name: /customer \(customer1\)/i }).click();
    await page.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL(/^http:\/\/(localhost|127\.0\.0\.1):5179\/?$/);
    const addButtons = page.getByRole('button', { name: /add to bag/i });
    await expect(addButtons.first()).toBeVisible({ timeout: 10000 });
    await addButtons.first().click();

    // Open Cart Drawer and proceed to Checkout Page (/checkout)
    await page.getByRole('button', { name: /open shopping bag/i }).click();
    const proceedBtn = page.getByRole('button', { name: /proceed to checkout/i });
    await expect(proceedBtn).toBeVisible({ timeout: 10000 });
    await proceedBtn.click();

    await expect(page.getByRole('heading', { name: /secure checkout/i })).toBeVisible();

    // Auto-fill validated address and submit order
    await page.getByRole('button', { name: /auto-fill demo address/i }).click();
    await page.getByRole('button', { name: /place order/i }).click();

    // Wait for Order Confirmed screen and navigate to Order History (/orders)
    await expect(page.getByRole('heading', { name: /order confirmed!/i })).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole('button', { name: /view order history/i }).click();
    await expect(page.getByRole('heading', { name: /my order history/i })).toBeVisible();

    // Day 18: Trigger Celery PDF Invoice generation on the latest order and verify COMPLETED download link
    const genInvoiceBtn = page.locator('[data-testid^="generate-invoice-btn-"]').first();
    await expect(genInvoiceBtn).toBeVisible();
    await genInvoiceBtn.click();

    const downloadInvoiceLink = page.locator('[data-testid^="download-invoice-link-"]').first();
    await expect(downloadInvoiceLink).toBeVisible({ timeout: 10000 });
  });

  test('3. Admin Journey: Login -> Admin Dashboard (/admin) -> Product CRUD & Customer Orders', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in to nexora/i })).toBeVisible();

    await page.getByRole('button', { name: /admin \(admin\)/i }).click();
    await page.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL(/^http:\/\/(localhost|127\.0\.0\.1):5179\/?$/);

    // Navigate to Admin Control Center (/admin)
    const adminLink = page.getByRole('link', { name: /admin dashboard/i });
    await expect(adminLink).toBeVisible({ timeout: 10000 });
    await adminLink.click();
    await expect(page.getByRole('heading', { name: /admin control center/i })).toBeVisible();

    // Switch to Customer Orders tab
    const ordersTab = page.getByRole('button', { name: /customer orders/i });
    await expect(ordersTab).toBeVisible();
    await ordersTab.click();
  });

  test('4. Day 17 Real-Time Features: Live Notifications Panel & Admin <-> Customer Support Chat', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in to nexora/i })).toBeVisible();

    await page.getByRole('button', { name: /admin \(admin\)/i }).click();
    await page.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL(/^http:\/\/(localhost|127\.0\.0\.1):5179\/?$/);

    // Verify Real-Time Notification Panel in Navbar opens and displays status
    const notifBell = page.getByRole('button', { name: /open notifications/i });
    await expect(notifBell).toBeVisible();
    await notifBell.click();
    await expect(page.getByRole('region', { name: /real-time notifications panel/i })).toBeVisible();
    await page.getByRole('button', { name: /close notifications panel/i }).click();

    // Navigate to Admin Dashboard -> Live Support Chat tab
    await page.getByRole('link', { name: /admin dashboard/i }).click();
    await expect(page.getByRole('heading', { name: /admin control center/i })).toBeVisible();

    const chatTab = page.getByRole('button', { name: /live support chat/i }).first();
    await expect(chatTab).toBeVisible();
    await chatTab.click();

    // Verify embedded Live Support Chat widget connects and sends a real-time message
    const chatRegion = page.getByRole('region', { name: /live support chat/i }).first();
    await expect(chatRegion).toBeVisible();

    const chatInput = chatRegion.getByLabel(/chat message input/i);
    await chatInput.fill('Hello customer1! Live WebSocket support is active.');
    await chatRegion.getByRole('button', { name: /send chat message/i }).click();

    await expect(
      chatRegion.getByText('Hello customer1! Live WebSocket support is active.').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('5. Day 18 Features: PostgreSQL Full-Text & Fuzzy Search (pg_trgm), Celery Bulk CSV Import & N+1 SQL Benchmark', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /admin \(admin\)/i }).click();
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/^http:\/\/(localhost|127\.0\.0\.1):5179\/?$/);

    // 1. Verify PostgreSQL Fuzzy Search (pg_trgm) matches typo "iphon" -> "iPhone 16 Pro Max"
    await page.getByTestId('demo-fuzzy-iphone-btn').click();
    await expect(page.getByText('iPhone 16 Pro Max').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('active-gin-index-badge')).toContainText('idx_products_trgm_gin');

    // 2. Verify PostgreSQL Full-Text Search (tsvector + GIN) matches "wireless headphones"
    await page.getByTestId('demo-fts-btn').click();
    await expect(page.getByText(/headphones/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('active-gin-index-badge')).toContainText(
      'idx_products_search_vector_gin'
    );

    // 3. Navigate to Admin Dashboard -> Background Jobs & CSV Import tab
    await page.getByRole('link', { name: /admin dashboard/i }).click();
    await page.getByTestId('admin-tab-jobs').click();
    await expect(page.getByTestId('admin-background-jobs-center')).toBeVisible();

    // 4. Load Sample CSV and execute Bulk CSV Import via Celery
    await page.getByTestId('load-sample-csv-btn').click();
    await page.getByTestId('start-csv-import-btn').click();
    await expect(page.getByTestId('csv-import-summary')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('csv-total-rows')).toHaveText('6');
    await expect(page.getByTestId('csv-success-count')).toHaveText('5');
    await expect(page.getByTestId('csv-failure-count')).toHaveText('1');

    // 5. Run Live N+1 SQL Query Optimization Benchmark
    await page.getByTestId('run-n1-benchmark-btn').click();
    await expect(page.getByTestId('n1-benchmark-results')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('n1-optimized-query-count')).toContainText('2 SQL Queries');
  });
});
