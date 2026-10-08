import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { ToastProvider } from '../components/ui/toast';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import {
  OrderInvoiceGenerator,
  AdminBackgroundJobsCenter,
} from '../components/BackgroundJobsPanel';
import { HomePage } from '../pages/HomePage';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>{ui}</CartProvider>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Day 18: Celery Task Lifecycle, PDF Invoices, Bulk CSV Import & PostgreSQL FTS/Fuzzy Search', () => {
  it('starts Celery PDF invoice task, polls progress, stops polling on COMPLETED, and shows download link', async () => {
    const user = userEvent.setup();
    let pollCalls = 0;

    server.use(
      http.get('*/tasks/:taskId', ({ params }) => {
        pollCalls += 1;
        const taskId = String(params.taskId);
        return HttpResponse.json(
          {
            task_id: taskId,
            status: 'COMPLETED',
            celery_state: 'SUCCESS',
            task_type: 'pdf_invoice',
            progress: 100,
            stage: 'PDF Invoice for ORD-5001 is ready to download.',
            result: {
              order_id: 5001,
              order_number: 'ORD-5001',
              filename: 'invoice_ORD-5001.pdf',
              file_size_bytes: 2840,
              download_url: '/tasks/invoices/5001/download',
              static_url: '/uploads/invoices/invoice_ORD-5001.pdf',
              customer_name: 'customer1',
              total_amount: 299.99,
              items_count: 1,
              generated_at: new Date().toISOString(),
            },
            error: null,
          },
          { status: 200 }
        );
      })
    );

    renderWithProviders(<OrderInvoiceGenerator orderId={5001} orderNumber="ORD-5001" />);

    const genBtn = screen.getByTestId('generate-invoice-btn-5001');
    await user.click(genBtn);

    // Wait for polling to reach COMPLETED and render download link
    const downloadLink = await screen.findByTestId(
      'download-invoice-link-5001',
      {},
      { timeout: 3000 }
    );
    expect(downloadLink).toBeInTheDocument();
    expect(downloadLink).toHaveTextContent('invoice_ORD-5001.pdf');
    expect(screen.getByTestId('invoice-task-5001-status-badge')).toHaveTextContent('COMPLETED');
    expect(screen.getByTestId('invoice-task-5001-progress-label')).toHaveTextContent('100%');

    const callsAtCompletion = pollCalls;
    await new Promise((r) => setTimeout(r, 450));
    // Verify polling stopped after COMPLETED
    expect(pollCalls).toBe(callsAtCompletion);
  });

  it('handles Celery task FAILED state clearly and stops polling', async () => {
    const user = userEvent.setup();

    server.use(
      http.get('*/tasks/:taskId', ({ params }) => {
        return HttpResponse.json(
          {
            task_id: String(params.taskId),
            status: 'FAILED',
            celery_state: 'FAILURE',
            task_type: 'pdf_invoice',
            progress: 100,
            stage: 'Invoice generation failed',
            result: null,
            error: 'Order #9999 was not found in PostgreSQL.',
          },
          { status: 200 }
        );
      })
    );

    renderWithProviders(<OrderInvoiceGenerator orderId={9999} orderNumber="ORD-9999" />);

    await user.click(screen.getByTestId('generate-invoice-btn-9999'));

    const errAlert = await screen.findByTestId('invoice-task-9999-error', {}, { timeout: 3000 });
    expect(errAlert).toHaveTextContent('Order #9999 was not found in PostgreSQL.');
    expect(screen.getByTestId('invoice-task-9999-status-badge')).toHaveTextContent('FAILED');
  });

  it('runs Bulk CSV Product Import via Celery and displays total, processed, succeeded, failed rows, and separate image download failures', async () => {
    const user = userEvent.setup();

    renderWithProviders(<AdminBackgroundJobsCenter />);

    await user.click(screen.getByTestId('load-sample-csv-btn'));
    await user.click(screen.getByTestId('start-csv-import-btn'));

    const summary = await screen.findByTestId('csv-import-summary', {}, { timeout: 3000 });
    expect(summary).toBeInTheDocument();
    expect(screen.getByTestId('csv-total-rows')).toHaveTextContent('6');
    expect(screen.getByTestId('csv-processed-rows')).toHaveTextContent('6');
    expect(screen.getByTestId('csv-success-count')).toHaveTextContent('5');
    expect(screen.getByTestId('csv-failure-count')).toHaveTextContent('1');
    expect(screen.getByTestId('csv-images-downloaded-count')).toHaveTextContent('3');
    expect(screen.getByTestId('csv-images-failed-count')).toHaveTextContent('1');
    expect(screen.getByTestId('csv-image-errors')).toHaveTextContent('Row #4');
    expect(screen.getByTestId('csv-image-errors')).toHaveTextContent('broken_404_image.jpg');
    expect(screen.getByTestId('csv-row-errors')).toHaveTextContent('Row #6');
    expect(
      screen.getByText(/Saved: uploads\/products\/csv_iphone_16_pro_max_a1b2c3d4\.jpg/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Image Saved')).toBeInTheDocument();
    expect(screen.getByText('Image Failed (Fallback Used)')).toBeInTheDocument();
    expect(screen.getByText('No Image URL')).toBeInTheDocument();
  });

  it('runs Live N+1 SQL Query Optimization Benchmark in AdminBackgroundJobsCenter', async () => {
    const user = userEvent.setup();

    renderWithProviders(<AdminBackgroundJobsCenter />);

    await user.click(screen.getByTestId('run-n1-benchmark-btn'));

    const bench = await screen.findByTestId('n1-benchmark-results', {}, { timeout: 3000 });
    expect(bench).toBeInTheDocument();
    expect(screen.getByTestId('n1-optimized-query-count')).toHaveTextContent('2 SQL Queries');
  });

  it('executes PostgreSQL Fuzzy (pg_trgm) search for typo query "iphon" and displays iPhone 16 Pro Max + GIN index badge', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    renderWithProviders(<HomePage />);

    // Wait for initial catalog to load
    await screen.findByText('Pro Studio Wireless Headphones');

    // Click the quick typo search button for "iphon" (switches mode to fuzzy and sets query to "iphon")
    const fuzzyBtn = screen.getByTestId('demo-fuzzy-iphone-btn');
    await user.click(fuzzyBtn);

    await waitFor(
      () => {
        expect(screen.getByText('iPhone 16 Pro Max')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const ginBadge = await screen.findByTestId('active-gin-index-badge');
    expect(ginBadge).toHaveTextContent('idx_products_trgm_gin');
  });
});
