import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/ui/toast';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ThemeProvider } from '../context/ThemeContext';
import ProductCard from '../components/ProductCard';
import PerformanceAuditPage from '../pages/PerformanceAuditPage';
import { initialMockProducts } from './mocks/handlers';

function renderWithDay19Providers(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
}

describe('Day 19 — API Security, GZip Compression, Lazy Loading & Load Audit Suite', () => {
  it('renders priority LCP product card with loading="eager" and fetchpriority="high" and below-the-fold card with loading="lazy"', () => {
    const product1 = initialMockProducts[0];
    const product2 = initialMockProducts[1];

    renderWithDay19Providers(
      <div>
        <ProductCard product={product1} layout="grid" priority={true} />
        <ProductCard product={product2} layout="grid" priority={false} />
      </div>
    );

    const imgAboveFold = screen.getByTestId(`product-image-${product1.id}`);
    expect(imgAboveFold).toHaveAttribute('loading', 'eager');
    expect(imgAboveFold).toHaveAttribute('decoding', 'async');
    expect(imgAboveFold).toHaveAttribute('width', '320');
    expect(imgAboveFold).toHaveAttribute('height', '240');

    const imgBelowFold = screen.getByTestId(`product-image-${product2.id}`);
    expect(imgBelowFold).toHaveAttribute('loading', 'lazy');
    expect(imgBelowFold).toHaveAttribute('decoding', 'async');
  });

  it('loads live Day 19 Security, OWASP Headers, GZip Compression, Bundle & Locust 50-User telemetry on PerformanceAuditPage', async () => {
    renderWithDay19Providers(<PerformanceAuditPage />);

    expect(screen.getByTestId('day19-security-performance-page')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('gzip-savings-pct')).toHaveTextContent('72.2%');
    });

    expect(screen.getByTestId('gzip-raw-bytes')).toHaveTextContent('4820 B');
    expect(screen.getByTestId('gzip-compressed-bytes')).toHaveTextContent('1340 B');
    expect(screen.getByText(/X-Content-Type-Options:/i)).toBeInTheDocument();
    expect(screen.getByText(/GET \/products\/ \(Catalog \+ GZip\)/i)).toBeInTheDocument();
    expect(screen.getByText(/vendor-react\.js/i)).toBeInTheDocument();
  });

  it('triggers SlowAPI Rate Limiter probe and verifies 5 allowed (200 OK) followed by 6th blocked (HTTP 429)', async () => {
    const user = userEvent.setup();
    renderWithDay19Providers(<PerformanceAuditPage />);

    const probeBtn = await screen.findByTestId('trigger-rate-limit-btn');
    await user.click(probeBtn);

    await waitFor(() => {
      expect(screen.getByTestId('probe-attempt-6')).toHaveTextContent('HTTP 429 — BLOCKED (429)');
    });

    expect(screen.getByTestId('probe-attempt-1')).toHaveTextContent('HTTP 200 — ALLOWED');
    expect(screen.getByTestId('probe-attempt-5')).toHaveTextContent('HTTP 200 — ALLOWED');
  });
});
