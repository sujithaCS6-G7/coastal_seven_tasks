import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/ui/toast';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ThemeProvider } from '../context/ThemeContext';
import { AiChatDrawer, AiChatFloatingButton } from '../components/AiChatDrawer';
import AiAssistantPage from '../pages/AiAssistantPage';
import { aiService } from '../api/aiService';

function renderWithDay20Providers(ui: React.ReactElement) {
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

describe('Day 20 — AI Streaming Chat, ChromaDB RAG & Multi-Provider Fallbacks Suite', () => {
  it('renders AiChatFloatingButton with pulsing badge and sparkles icon', () => {
    const handleClick = vi.fn();
    render(<AiChatFloatingButton onClick={handleClick} />);

    const button = screen.getByRole('button', { name: /open ai assistant/i });
    expect(button).toBeInTheDocument();
  });

  it('renders AiChatDrawer with SSE status, welcome message, and suggested questions', () => {
    const handleClose = vi.fn();
    renderWithDay20Providers(<AiChatDrawer isOpen={true} onClose={handleClose} />);

    expect(screen.getByText(/Nexora AI Assistant/i)).toBeInTheDocument();
    expect(screen.getByText(/SSE Live/i)).toBeInTheDocument();
    expect(screen.getByText(/How can I help you today\?/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask about products, specs, stock.../i)).toBeInTheDocument();

    // Check suggestion buttons
    expect(screen.getByText(/Noise cancelling headphones/i)).toBeInTheDocument();
    expect(screen.getByText(/Phones in stock/i)).toBeInTheDocument();
  });

  it('allows user to type into AiChatDrawer and dispatches streamChat', async () => {
    const user = userEvent.setup();
    const streamChatSpy = vi.spyOn(aiService, 'streamChat').mockImplementation(async (opts) => {
      opts.onMetadata?.({
        provider_used: 'gemini',
        fallback_triggered: false,
        citations: [
          {
            product_id: 1,
            name: 'Sony WH-1000XM5 Wireless Headphones',
            price: 399.99,
            stock: 42,
            category: 'Audio',
            similarity_score: 0.95,
          },
        ],
      });
      opts.onToken?.('Here are ');
      opts.onToken?.('the best headphones.');
      opts.onDone?.();
    });

    renderWithDay20Providers(<AiChatDrawer isOpen={true} onClose={() => {}} />);

    const input = screen.getByPlaceholderText(/Ask about products, specs, stock.../i);
    await user.type(input, 'Best headphones under $400');
    expect(input).toHaveValue('Best headphones under $400');

    const sendBtn = screen.getByRole('button', { name: /send message/i });
    await user.click(sendBtn);

    await waitFor(() => {
      expect(streamChatSpy).toHaveBeenCalled();
    });

    // Check that streamed token content appears
    await waitFor(() => {
      expect(screen.getByText(/the best headphones/i)).toBeInTheDocument();
      expect(screen.getByText(/Sony WH-1000XM5 Wireless Headphones/i)).toBeInTheDocument();
      expect(screen.getByText(/95% match/i)).toBeInTheDocument();
    });

    streamChatSpy.mockRestore();
  });

  it('renders AiAssistantPage with ChromaDB telemetry, vector counts, and providers hierarchy', async () => {
    renderWithDay20Providers(<AiAssistantPage />);

    expect(screen.getByText(/AI Assistant & RAG Semantic Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/SSE Progressive Streaming/i)).toBeInTheDocument();

    // Wait for AI status MSW response
    await waitFor(() => {
      expect(screen.getByText(/ChromaDB Vector Store/i)).toBeInTheDocument();
      expect(screen.getByText(/MiniLM-L6-v2/i)).toBeInTheDocument();
      expect(screen.getByText(/LLM Provider Fallback Hierarchy/i)).toBeInTheDocument();
      expect(screen.getByText(/Primary Provider/i)).toBeInTheDocument();
    });
  });

  it('executes ChromaDB semantic search playground on AiAssistantPage', async () => {
    const user = userEvent.setup();
    renderWithDay20Providers(<AiAssistantPage />);

    await waitFor(() => {
      expect(screen.getByText(/ChromaDB Semantic Search Tester/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/e\.g\. noise cancellation, 4K screen/i);
    await user.type(searchInput, 'wireless sound');
    const searchBtn = screen.getByRole('button', { name: /search/i });
    await user.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText(/Bose QuietComfort Ultra Headphones/i)).toBeInTheDocument();
      expect(screen.getByText(/88% match/i)).toBeInTheDocument();
    });
  });

  it('triggers Re-index Catalog button and displays success notification', async () => {
    const user = userEvent.setup();
    renderWithDay20Providers(<AiAssistantPage />);

    const reindexBtn = screen.getByRole('button', { name: /re-index catalog/i });
    await user.click(reindexBtn);

    await waitFor(() => {
      expect(screen.getByText(/Indexed 6 chunks into ChromaDB/i)).toBeInTheDocument();
    });
  });
});
