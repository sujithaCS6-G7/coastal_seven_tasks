/**
 * Day 20–21 AI Focus & RAG Service Client
 * Handles Server-Sent Events (SSE) streaming, AI Product Descriptions,
 * Metadata-Filtered Semantic Search, Content Moderation, Redis AI Cache,
 * Per-User Rate Limit Diagnostics, and Safe Tool-Calling Agents.
 */

import axiosClient from './axiosClient';
import { API_BASE_URL, getApiBaseUrl } from '../config/env';
import {
  AgentExecuteRequest,
  AgentExecuteResponse,
  AiCacheStats,
  AiStatusResponse,
  ModerationResult,
  PerUserRateLimitStatus,
  ProductCitation,
  ProductDescriptionRequest,
  ProductDescriptionResponse,
  SemanticSearchResult,
} from '../types/ai';

export const aiService = {
  /**
   * Fetch current AI status, provider configs, ChromaDB vector stats, Redis cache, moderation, and rate limits.
   */
  async getStatus(): Promise<AiStatusResponse> {
    const res = await axiosClient.get<AiStatusResponse>('/ai/status');
    return res.data;
  },

  /**
   * Perform semantic vector search against ChromaDB with optional metadata filters.
   */
  async searchSemantic(
    query: string,
    limit = 4,
    filters?: {
      category?: string;
      min_price?: number;
      max_price?: number;
      in_stock_only?: boolean;
      bypass_cache?: boolean;
    }
  ): Promise<SemanticSearchResult> {
    const res = await axiosClient.get<SemanticSearchResult>('/ai/search', {
      params: {
        q: query,
        limit,
        ...(filters?.category && filters.category !== 'all' ? { category: filters.category } : {}),
        ...(filters?.min_price !== undefined ? { min_price: filters.min_price } : {}),
        ...(filters?.max_price !== undefined ? { max_price: filters.max_price } : {}),
        ...(filters?.in_stock_only ? { in_stock_only: true } : {}),
        ...(filters?.bypass_cache ? { bypass_cache: true } : {}),
      },
    });
    return res.data;
  },

  /**
   * Day 21: Generate AI-powered factual product description with Redis caching & fallback.
   */
  async generateProductDescription(
    payload: ProductDescriptionRequest
  ): Promise<ProductDescriptionResponse> {
    const res = await axiosClient.post<ProductDescriptionResponse>(
      '/ai/products/generate-description',
      payload
    );
    return res.data;
  },

  /**
   * Day 21: Screen user text through the AI Content Moderation Guardrail.
   */
  async moderateContent(text: string, field_name = 'text'): Promise<ModerationResult> {
    const res = await axiosClient.post<ModerationResult>('/ai/moderate', {
      text,
      field_name,
    });
    return res.data;
  },

  /**
   * Day 21: Execute the safe tool-calling AI shopping agent.
   */
  async executeAgent(payload: AgentExecuteRequest): Promise<AgentExecuteResponse> {
    const res = await axiosClient.post<AgentExecuteResponse>('/ai/agent/execute', payload);
    return res.data;
  },

  /**
   * Day 21: Fetch Redis AI response cache telemetry.
   */
  async getCacheStats(): Promise<AiCacheStats> {
    const res = await axiosClient.get<AiCacheStats>('/ai/cache/stats');
    return res.data;
  },

  /**
   * Day 21: Clear all Redis AI response cache keys.
   */
  async clearCache(): Promise<{ status: string; redis_keys_deleted: number; memory_keys_deleted: number }> {
    const res = await axiosClient.delete('/ai/cache/clear');
    return res.data;
  },

  /**
   * Day 21: Inspect caller's per-user AI rate limit status.
   */
  async getRateLimitStatus(scope = 'ai_default'): Promise<PerUserRateLimitStatus> {
    const res = await axiosClient.get<PerUserRateLimitStatus>('/ai/rate-limit/status', {
      params: { scope },
    });
    return res.data;
  },

  /**
   * Trigger full re-indexing of products into ChromaDB.
   */
  async reindexCatalog(): Promise<{ status: string; message: string; details: any }> {
    const res = await axiosClient.post('/ai/rag/reindex');
    return res.data;
  },

  /**
   * Stream progressive AI chat answers using native Server-Sent Events (SSE) over HTTP POST.
   */
  async streamChat({
    message,
    history = [],
    top_k = 4,
    onMetadata,
    onToken,
    onError,
    onDone,
    signal,
  }: {
    message: string;
    history?: { role: string; content: string }[];
    top_k?: number;
    onMetadata?: (meta: {
      provider_used: string;
      fallback_triggered: boolean;
      citations: ProductCitation[];
    }) => void;
    onToken?: (token: string) => void;
    onError?: (err: Error) => void;
    onDone?: () => void;
    signal?: AbortSignal;
  }): Promise<void> {
    const endpoint = `${getApiBaseUrl()}/ai/chat/stream`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message,
          history,
          top_k,
        }),
        signal,
      });

      if (!response.ok) {
        let errDetail = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const jsonErr = await response.json();
          if (typeof jsonErr.detail === 'string') {
            errDetail = jsonErr.detail;
          } else if (jsonErr.detail?.detail) {
            errDetail = jsonErr.detail.detail;
          }
        } catch {
          // ignore parsing error
        }
        throw new Error(errDetail);
      }

      if (!response.body) {
        throw new Error('ReadableStream is not supported in this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          if (!block.trim()) continue;

          let eventType = 'message';
          let eventData = '';

          for (const line of block.split('\n')) {
            if (line.startsWith('event: ')) {
              eventType = line.substring(7).trim();
            } else if (line.startsWith('data: ')) {
              eventData = line.substring(6).trim();
            }
          }

          if (eventType === 'metadata' && onMetadata) {
            try {
              const meta = JSON.parse(eventData);
              onMetadata(meta);
            } catch {
              // ignore json parse error
            }
          } else if (eventType === 'token' && onToken) {
            try {
              const parsed = JSON.parse(eventData);
              if (parsed.token) {
                onToken(parsed.token);
              }
            } catch {
              onToken(eventData);
            }
          } else if (eventType === 'error') {
            try {
              const errParsed = JSON.parse(eventData);
              onError?.(new Error(errParsed.error || errParsed.message || 'Stream error'));
            } catch {
              onError?.(new Error(eventData || 'Stream error'));
            }
          } else if (eventType === 'done') {
            onDone?.();
          }
        }
      }

      onDone?.();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        onDone?.();
        return;
      }
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  },
};
