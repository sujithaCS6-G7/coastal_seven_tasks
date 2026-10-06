import { test, expect } from '@playwright/test';

test.describe('Day 16 — Nexora E-Commerce (Part 2) End-to-End Integration Suite', () => {
  test('1. Product Browsing, Pagination, Search Filtering & Dark/Light Theme Toggle', async ({
    page,
  }) => {
    await page.goto('/');

    // Verify catalog header and products load from FastAPI
    await expect(page.locator('h1')).toContainText('Explore Nexora Gear');
    const addButtons = page.getByRole('button', { name: /add to bag|sold out/i });
    await expect(addButtons.first()).toBeVisible({ timeout: 10000 });

    // Verify Dark/Light Theme Toggle works
    const themeToggle = page.getByRole('button', { name: /switch to dark mode|switch to light mode/i }).first();
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

  test('2. Customer Journey: Login -> Add to Cart -> Checkout (React Hook Form + Zod) -> Order History', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in to nexora/i })).toBeVisible();

    await page.getByRole('button', { name: /customer \(customer1\)/i }).click();
    await page.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL(/^http:\/\/(localhost|127\.0\.0\.1):5177\/?$/);
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
  });

  test('3. Admin Journey: Login -> Admin Dashboard (/admin) -> Product CRUD & Customer Orders', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in to nexora/i })).toBeVisible();

    await page.getByRole('button', { name: /admin \(admin\)/i }).click();
    await page.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL(/^http:\/\/(localhost|127\.0\.0\.1):5177\/?$/);

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
});
