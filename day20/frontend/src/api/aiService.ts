/**
 * Day 20 AI & RAG Service Client
 * Handles Server-Sent Events (SSE) streaming, RAG reindexing, and diagnostics.
 */

import axiosClient from './axiosClient';
import { API_BASE_URL } from '../config/env';
import { AiStatusResponse, ProductCitation, SemanticSearchResult } from '../types/ai';

export const aiService = {
  /**
   * Fetch current AI status, provider configs, and ChromaDB vector stats.
   */
  async getStatus(): Promise<AiStatusResponse> {
    const res = await axiosClient.get<AiStatusResponse>('/ai/status');
    return res.data;
  },

  /**
   * Perform direct semantic vector search against ChromaDB.
   */
  async searchSemantic(query: string, limit = 4): Promise<SemanticSearchResult> {
    const res = await axiosClient.get<SemanticSearchResult>('/ai/search', {
      params: { q: query, limit },
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
    const endpoint = `${API_BASE_URL}/ai/chat/stream`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
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
          errDetail = jsonErr.detail || errDetail;
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
        // Stream aborted gracefully by user
        onDone?.();
        return;
      }
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  },
};
