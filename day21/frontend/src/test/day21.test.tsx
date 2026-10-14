/**
 * Day 21 Automated Frontend Tests (Vitest + React Testing Library)
 * Verifies:
 * 1. AI-Powered Product Description Generator UI & mocked response rendering
 * 2. Safe Tool-Calling AI Agent Playground execution & tool step rendering
 * 3. AI Content Moderation Guardrail Tester UI (safe vs rejected prompt injection)
 * 4. Redis AI Cache & Per-User Rate Limit telemetry display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AiAssistantPage from '../pages/AiAssistantPage';
import { aiService } from '../api/aiService';

vi.mock('../api/aiService', () => ({
  aiService: {
    getStatus: vi.fn(),
    searchSemantic: vi.fn(),
    reindexCatalog: vi.fn(),
    streamChat: vi.fn(),
    generateProductDescription: vi.fn(),
    executeAgent: vi.fn(),
    moderateContent: vi.fn(),
    clearCache: vi.fn(),
  },
}));

const mockDay21Status = {
  status: 'online',
  version: '21.0.0',
  providers: {
    primary: 'gemini',
    fallback: 'groq',
    tertiary: 'mistral',
    available_backends: ['groq', 'gemini', 'mistral', 'local_contextual'],
    configured_keys: { groq: false, gemini: false, mistral: false, openai: false },
    models: {
      groq: 'llama-3.3-70b-versatile',
      gemini: 'gemini-2.5-flash',
      mistral: 'mistral-small-latest',
      openai: 'gpt-4o-mini',
    },
  },
  rag: {
    collection_name: 'nexora_products',
    vector_count: 12,
    embedding_model: 'all-MiniLM-L6-v2 (ONNX)',
    persist_directory: 'chroma_data/',
    chunk_size: 600,
    chunk_overlap: 100,
  },
  cache: {
    enabled: true,
    prefix: 'ai:cache:v21',
    ttl_seconds: 300,
    redis_connected: true,
    hits: 4,
    misses: 2,
    sets: 2,
    bypasses: 0,
    redis_errors: 0,
    hit_rate_percent: 66.67,
  },
  rate_limit: {
    identity_key: 'user:10:customer3',
    is_authenticated: true,
    user_id: 10,
    username: 'customer3',
    scope: 'ai_default',
    limit: 10,
    used: 2,
    remaining: 8,
    window_seconds: 60,
    reset_in_seconds: 45,
    storage_backend: 'redis',
  },
};

describe('Day 21 AI Focus Studio Frontend Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (aiService.getStatus as any).mockResolvedValue(mockDay21Status);
  });

  it('renders Day 21 Redis Cache, Per-User Rate Limit, Description Generator, and Tool Agent panels', async () => {
    render(
      <MemoryRouter>
        <AiAssistantPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/AI-Powered Product Description Generator/i)).toBeInTheDocument();
    expect(screen.getByText(/Safe Tool-Calling AI Agent Playground/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Content Moderation Guardrail Tester/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('user:10:customer3')).toBeInTheDocument();
      expect(screen.getByText('8 / 10')).toBeInTheDocument();
    });
  });

  it('generates an AI product description and displays Redis Cache HIT badge', async () => {
    (aiService.generateProductDescription as any).mockResolvedValue({
      product_id: 1,
      product_name: 'Sony WH-1000XM5 Wireless Headphones',
      category: 'Audio',
      tone: 'professional',
      description: 'The Sony WH-1000XM5 delivers 30-hour battery life and industry-leading noise cancellation.',
      highlights: ['Category: Audio', 'Verified Catalog Price: $399.99', '30-hour battery life'],
      seo_summary: 'Sony WH-1000XM5 in Audio ($399.99).',
      provider_used: 'gemini',
      fallback_triggered: false,
      fallback_chain_executed: ['gemini:success'],
      cached: true,
      cache_key: 'ai:cache:v21:product_description:gemini:public:abc12345',
      moderation_passed: true,
    });

    render(
      <MemoryRouter>
        <AiAssistantPage />
      </MemoryRouter>
    );

    const genBtn = screen.getByRole('button', { name: /Generate AI Product Description/i });
    fireEvent.click(genBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/The Sony WH-1000XM5 delivers 30-hour battery life/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Redis Cache HIT/i)).toBeInTheDocument();
    });
  });

  it('executes the Tool-Calling AI Agent and renders validated tool arguments and final answer', async () => {
    (aiService.executeAgent as any).mockResolvedValue({
      query: 'Show me exact details and stock for product #2',
      planner_mode: 'deterministic_local_planner',
      provider_used: 'local_contextual',
      fallback_triggered: true,
      iterations_used: 1,
      max_iterations: 3,
      tool_calls: [
        {
          step: 1,
          tool_name: 'get_product_details_tool',
          validated_arguments: { product_id: 2 },
          tool_output: { found: true, product: { name: 'Apple MacBook Air M3', price: 1299 } },
          status: 'success',
        },
      ],
      final_answer: 'Product #2 (Apple MacBook Air M3) is priced at $1299.00 with 18 in stock.',
      cached: false,
      moderation_passed: true,
    });

    render(
      <MemoryRouter>
        <AiAssistantPage />
      </MemoryRouter>
    );

    const runBtn = screen.getByRole('button', { name: /^Run Agent$/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByText(/Step 1: get_product_details_tool/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Product #2 \(Apple MacBook Air M3\) is priced at \$1299\.00/i)
      ).toBeInTheDocument();
    });
  });

  it('screens unsafe prompt injection via Content Moderation Guardrail Tester', async () => {
    (aiService.moderateContent as any).mockResolvedValue({
      allowed: false,
      flagged_categories: ['prompt_injection'],
      reason: 'Input rejected by AI safety moderation (prompt_injection).',
      sanitized_text: '',
      input_length: 55,
      moderation_engine: 'nexora_rule_pattern_guardrail_v1',
    });

    render(
      <MemoryRouter>
        <AiAssistantPage />
      </MemoryRouter>
    );

    const injBtn = screen.getByRole('button', { name: /Test Prompt Injection/i });
    fireEvent.click(injBtn);

    await waitFor(() => {
      expect(screen.getByText(/REJECTED \(Policy Violation\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Flagged Categories: prompt_injection/i)).toBeInTheDocument();
    });
  });
});
