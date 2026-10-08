import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import ProductCard from '../components/ProductCard';
import LoginPage from '../pages/LoginPage';
import CartDrawer from '../components/CartDrawer';
import HomePage from '../pages/HomePage';
import { ToastProvider } from '../components/ui/toast';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { mockProducts, mockUser } from './mocks/handlers';

// Helper to wrap components with Router, React Query, and Toast providers
const renderWithProviders = (ui: React.ReactElement, { route = '/' } = {}) => {
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
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

describe('Day 15 — Typed React Component & MSW Integration Tests', () => {
  beforeEach(() => {
    // Reset Zustand stores before each test
    useAuthStore.setState({
      token: null,
      user: null,
      loading: false,
    });
    useCartStore.setState({
      cart: { items: [], total_price: 0, total_items: 0 },
      loading: false,
      isCartOpen: false,
      checkoutModalOpen: false,
      orderSuccessModalOpen: false,
      latestOrder: null,
    });
  });

  describe('1. ProductCard Component (Typed Props & User Interactions)', () => {
    it('renders product details, formatted price, and stock badge accurately', () => {
      const product = mockProducts[0]; // Pro Studio Wireless Headphones ($299.99, stock: 15)
      renderWithProviders(
        <ProductCard
          product={product}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText('Pro Studio Wireless Headphones')).toBeInTheDocument();
      expect(screen.getByText('$299.99')).toBeInTheDocument();
      expect(screen.getByText(/15 in stock/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add to bag/i })).toBeEnabled();
    });

    it('disables the action button and displays Sold Out when stock is 0', () => {
      const outOfStockProduct = mockProducts[2]; // Limited Edition Mechanical Keyboard (stock: 0)
      renderWithProviders(
        <ProductCard
          product={outOfStockProduct}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText('Limited Edition Mechanical Keyboard')).toBeInTheDocument();
      const soldOutButtons = screen.getAllByText(/sold out/i);
      expect(soldOutButtons.length).toBeGreaterThanOrEqual(1);
      const button = screen.getByRole('button', { name: /sold out/i });
      expect(button).toBeDisabled();
    });

    it('adds a product to the cart via MSW and updates Zustand cart state when authenticated', async () => {
      const user = userEvent.setup();
      useAuthStore.setState({
        token: 'mock-jwt-access-token',
        user: mockUser,
        loading: false,
      });

      renderWithProviders(
        <ProductCard
          product={mockProducts[1]} // UltraBook Pro 16 Laptop
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const addButton = screen.getByRole('button', { name: /add to bag/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(useCartStore.getState().cart.items.length).toBeGreaterThan(0);
      });
    });
  });

  describe('2. LoginPage Component (Form Validation, Demo Fill & MSW Auth)', () => {
    it('displays a validation error alert when submitting empty credentials', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />, { route: '/login' });

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      expect(
        await screen.findByText(/please provide both username and password/i)
      ).toBeInTheDocument();
    });

    it('populates demo customer credentials and logs in via MSW API', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />, { route: '/login' });

      const demoCustomerBtn = screen.getByRole('button', { name: /customer \(customer1\)/i });
      await user.click(demoCustomerBtn);

      const usernameInput = screen.getByPlaceholderText('Enter your username') as HTMLInputElement;
      expect(usernameInput.value).toBe('customer1');

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      await waitFor(() => {
        expect(useAuthStore.getState().user?.username).toBe('customer1');
        expect(useAuthStore.getState().token).toBe('mock-jwt-access-token');
      });
    });

    it('displays server error message when MSW returns 401 Invalid Credentials', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />, { route: '/login' });

      const usernameInput = screen.getByPlaceholderText('Enter your username');
      const passwordInput = screen.getByPlaceholderText('Enter your password');

      await user.type(usernameInput, 'invalid_user');
      await user.type(passwordInput, 'wrongpass');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      const errorMessages = await screen.findAllByText(/invalid username or password/i);
      expect(errorMessages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. CartDrawer Component (Empty State & Optimistic Quantity Updates)', () => {
    it('renders empty bag message when cart has no items', () => {
      useCartStore.setState({
        cart: { items: [], total_price: 0, total_items: 0 },
        isCartOpen: true,
      });

      renderWithProviders(<CartDrawer />);

      expect(screen.getByText(/your bag is empty/i)).toBeInTheDocument();
    });

    it('renders cart items and optimistically updates quantity and subtotal via MSW', async () => {
      const user = userEvent.setup();
      useAuthStore.setState({
        token: 'mock-jwt-access-token',
        user: mockUser,
        loading: false,
      });
      useCartStore.setState({
        isCartOpen: true,
        cart: {
          user_id: 2,
          items: [
            {
              product_id: 1,
              name: mockProducts[0].name,
              price: mockProducts[0].price, // $299.99
              quantity: 1,
              subtotal: mockProducts[0].price,
              image_url: mockProducts[0].image_url,
            },
          ],
          total_items: 1,
          total_price: 299.99,
        },
        loading: false,
      });

      renderWithProviders(<CartDrawer />);

      expect(screen.getByText('Pro Studio Wireless Headphones')).toBeInTheDocument();

      // Click the increment (+) button using its accessible aria-label
      const incrementBtn = screen.getByRole('button', {
        name: /increase quantity/i,
      });
      await user.click(incrementBtn);

      await waitFor(() => {
        expect(useCartStore.getState().cart.total_items).toBe(2);
        expect(useCartStore.getState().cart.total_price).toBeCloseTo(599.98, 2);
      });
    });
  });

  describe('4. HomePage Catalog Integration (MSW Product Fetching & Search Filtering)', () => {
    it('fetches products from MSW and filters the catalog when searching', async () => {
      const user = userEvent.setup();
      renderWithProviders(<HomePage />);

      // Wait for MSW products to load into the catalog
      expect(await screen.findByText('Pro Studio Wireless Headphones')).toBeInTheDocument();
      expect(screen.getByText('UltraBook Pro 16 Laptop')).toBeInTheDocument();

      // Search for "UltraBook"
      const searchInput = screen.getByPlaceholderText(/search by name, spec/i);
      await user.type(searchInput, 'UltraBook');

      await waitFor(() => {
        expect(screen.getByText('UltraBook Pro 16 Laptop')).toBeInTheDocument();
        expect(screen.queryByText('Pro Studio Wireless Headphones')).not.toBeInTheDocument();
      });
    });
  });
});
