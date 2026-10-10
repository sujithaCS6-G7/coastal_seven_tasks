import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import CheckoutPage from '../pages/CheckoutPage';
import OrderHistoryPage from '../pages/OrderHistoryPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import { ToastProvider } from '../components/ui/toast';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ThemeProvider } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { useThemeStore } from '../store/useThemeStore';
import { mockUser, mockAdminUser, initialMockProducts } from './mocks/handlers';

const renderWithFullAppProviders = (ui: React.ReactElement, { route = '/' } = {}) => {
  const testQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return render(
    <QueryClientProvider client={testQueryClient}>
      <MemoryRouter
        initialEntries={[route]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <CartProvider>{ui}</CartProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Day 16 — E-Commerce Frontend (Part 2) Comprehensive Test Suite', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'mock-jwt-access-token',
      user: mockUser,
      loading: false,
    });
    useCartStore.setState({
      cart: {
        user_id: 2,
        items: [
          {
            product_id: 1,
            name: initialMockProducts[0].name,
            price: initialMockProducts[0].price,
            quantity: 1,
            subtotal: initialMockProducts[0].price,
            image_url: initialMockProducts[0].image_url,
          },
        ],
        total_items: 1,
        total_price: 299.99,
      },
      loading: false,
      isCartOpen: false,
      checkoutModalOpen: false,
      orderSuccessModalOpen: false,
      latestOrder: null,
    });
    useThemeStore.getState().setTheme('light');
  });

  describe('1. Zustand Cart Store Actions (Fetch, Remove & Clear)', () => {
    it('fetches current cart from FastAPI GET /cart/ and updates store state', async () => {
      useCartStore.setState({
        cart: { items: [], total_items: 0, total_price: 0 },
      });

      await useCartStore.getState().fetchCart();

      expect(useCartStore.getState().cart.items.length).toBe(1);
      expect(useCartStore.getState().cart.total_price).toBeCloseTo(299.99, 2);
    });

    it('optimistically removes an item from the cart via DELETE /cart/items/:id', async () => {
      await useCartStore.getState().removeFromCart(1);

      expect(useCartStore.getState().cart.items.length).toBe(0);
      expect(useCartStore.getState().cart.total_items).toBe(0);
      expect(useCartStore.getState().cart.total_price).toBe(0);
    });

    it('clears the entire shopping cart via DELETE /cart/', async () => {
      await useCartStore.getState().clearCart();

      expect(useCartStore.getState().cart.items).toEqual([]);
      expect(useCartStore.getState().cart.total_items).toBe(0);
    });
  });

  describe('2. Checkout Page (react-hook-form + Zod Validation & Order Creation)', () => {
    it('shows Zod validation messages when submitting empty shipping fields', async () => {
      const user = userEvent.setup();
      renderWithFullAppProviders(<CheckoutPage />, { route: '/checkout' });

      // Clear default fullName so all fields are empty
      const fullNameInput = screen.getByLabelText(/recipient full name/i);
      await user.clear(fullNameInput);

      const placeOrderBtn = screen.getByRole('button', { name: /place order/i });
      await user.click(placeOrderBtn);

      expect(
        await screen.findByText(/full name must be at least 3 characters/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/shipping address must be at least 10 characters/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/city name must be at least 2 characters/i)).toBeInTheDocument();
    });

    it('validates postal code and phone number formats using Zod regex rules', async () => {
      const user = userEvent.setup();
      renderWithFullAppProviders(<CheckoutPage />, { route: '/checkout' });

      await user.type(
        screen.getByLabelText(/street address/i),
        'Plot 42, Silicon Valley Colony, Madhapur'
      );
      await user.type(screen.getByLabelText(/city/i), 'Hyderabad');
      await user.type(screen.getByLabelText(/postal \/ zip code/i), '12'); // Invalid postal
      await user.type(screen.getByLabelText(/contact phone number/i), '12345'); // Invalid phone

      await user.click(screen.getByRole('button', { name: /place order/i }));

      expect(
        await screen.findByText(/postal code must be a valid 5 or 6 digit code/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/phone number must be 10 to 15 digits/i)).toBeInTheDocument();
    });

    it('submits valid checkout form via POST /orders/checkout and displays Order Confirmed screen', async () => {
      const user = userEvent.setup();
      renderWithFullAppProviders(<CheckoutPage />, { route: '/checkout' });

      const autoFillBtn = screen.getByRole('button', { name: /auto-fill demo address/i });
      await user.click(autoFillBtn);

      const placeOrderBtn = screen.getByRole('button', { name: /place order/i });
      await user.click(placeOrderBtn);

      expect(await screen.findByText(/order confirmed!/i)).toBeInTheDocument();
      expect(screen.getAllByText(/ORD-5003/i).length).toBeGreaterThanOrEqual(1);
    });

    it('renders empty cart state on CheckoutPage when cart has no items', () => {
      useCartStore.setState({
        cart: { items: [], total_items: 0, total_price: 0 },
      });

      renderWithFullAppProviders(<CheckoutPage />, { route: '/checkout' });

      expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    });
  });

  describe('3. Order History Page (Customer Orders, Status Filtering & Details Modal)', () => {
    it('fetches and displays logged-in user orders from GET /orders/', async () => {
      renderWithFullAppProviders(<OrderHistoryPage />, { route: '/orders' });

      expect(await screen.findByText('ORD-5001')).toBeInTheDocument();
      expect(screen.getByText('ORD-5002')).toBeInTheDocument();
      expect(screen.getByText('Pro Studio Wireless Headphones')).toBeInTheDocument();
      expect(screen.getByText('UltraBook Pro 16 Laptop')).toBeInTheDocument();
    });

    it('filters order history list by status when clicking DELIVERED or PENDING filter tabs', async () => {
      const user = userEvent.setup();
      renderWithFullAppProviders(<OrderHistoryPage />, { route: '/orders' });

      expect(await screen.findByText('ORD-5001')).toBeInTheDocument();

      const deliveredTab = screen.getByRole('button', { name: 'DELIVERED' });
      await user.click(deliveredTab);

      expect(screen.getByText('ORD-5001')).toBeInTheDocument();
      expect(screen.queryByText('ORD-5002')).not.toBeInTheDocument();
    });

    it('opens single Order Details modal via GET /orders/:id when clicking Details button', async () => {
      const user = userEvent.setup();
      renderWithFullAppProviders(<OrderHistoryPage />, { route: '/orders' });

      expect(await screen.findByText('ORD-5001')).toBeInTheDocument();

      const detailsButtons = screen.getAllByRole('button', { name: /details/i });
      await user.click(detailsButtons[0]);

      expect(
        await screen.findByRole('dialog', { name: /order details modal/i })
      ).toBeInTheDocument();
    });
  });

  describe('4. Admin Dashboard (Product CRUD & Customer Order Management)', () => {
    beforeEach(() => {
      useAuthStore.setState({
        token: 'mock-jwt-admin-token',
        user: mockAdminUser,
        loading: false,
      });
    });

    it('renders Admin Control Center and creates a new product via POST /products/', async () => {
      const user = userEvent.setup();
      renderWithFullAppProviders(<AdminDashboardPage />, { route: '/admin' });

      expect(await screen.findByText('Pro Studio Wireless Headphones')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /add new product/i }));

      await user.type(screen.getByLabelText(/product name/i), '4K OLED Gaming Monitor');
      await user.type(screen.getByLabelText(/price \(\$\)/i), '799.99');
      await user.type(screen.getByLabelText(/stock quantity/i), '12');
      await user.type(screen.getByLabelText(/description/i), '240Hz 4K OLED Display');

      await user.click(screen.getByRole('button', { name: /create product/i }));

      expect(await screen.findByText('4K OLED Gaming Monitor')).toBeInTheDocument();
    });

    it('updates an existing product via PUT /products/:id and deletes a product via DELETE /products/:id', async () => {
      const user = userEvent.setup();
      renderWithFullAppProviders(<AdminDashboardPage />, { route: '/admin' });

      expect(await screen.findByText('Pro Studio Wireless Headphones')).toBeInTheDocument();

      // Edit first product
      const editBtn = screen.getByRole('button', {
        name: /edit pro studio wireless headphones/i,
      });
      await user.click(editBtn);

      const nameInput = screen.getByLabelText(/product name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Pro Studio Headphones V2');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(await screen.findByText('Pro Studio Headphones V2')).toBeInTheDocument();

      // Delete third product
      const deleteBtn = screen.getByRole('button', {
        name: /delete limited edition mechanical keyboard/i,
      });
      await user.click(deleteBtn);

      await waitFor(() => {
        expect(
          screen.queryByText('Limited Edition Mechanical Keyboard')
        ).not.toBeInTheDocument();
      });
    });

    it('switches to Customer Orders tab and updates order status via PUT /orders/:id/status', async () => {
      const user = userEvent.setup();
      renderWithFullAppProviders(<AdminDashboardPage />, { route: '/admin' });

      const ordersTabBtn = await screen.findByRole('button', { name: /customer orders/i });
      await user.click(ordersTabBtn);

      expect(await screen.findByText('ORD-5002')).toBeInTheDocument();

      // Click SHIPPED status button on order card
      const shippedButtons = screen.getAllByRole('button', { name: 'SHIPPED' });
      await user.click(shippedButtons[shippedButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getAllByText('SHIPPED').length).toBeGreaterThan(1);
      });
    });
  });

  describe('5. Dark / Light Theme Toggle & LocalStorage Persistence', () => {
    it('toggles from light mode to dark mode and adds .dark class to documentElement', () => {
      expect(useThemeStore.getState().theme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      useThemeStore.getState().toggleTheme();

      expect(useThemeStore.getState().theme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem('day16_theme')).toBe('dark');
    });

    it('toggles back from dark mode to light mode and updates localStorage', () => {
      useThemeStore.getState().setTheme('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      useThemeStore.getState().toggleTheme();

      expect(useThemeStore.getState().theme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(localStorage.getItem('day16_theme')).toBe('light');
    });
  });
});
