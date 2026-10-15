/**
 * Day 20–21 AI Focus Type Definitions:
 * Streaming RAG, Product Descriptions, Semantic Search with Metadata Filters,
 * Content Moderation, Redis AI Cache, Per-User Rate Limiting & Tool-Calling Agent.
 */

export interface ProductCitation {
  product_id: number;
  name: string;
  price: number;
  stock?: number;
  category?: string;
  image_url?: string;
  similarity_score?: number;
  snippet?: string;
  description?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  error?: string;
  provider?: string;
  fallbackTriggered?: boolean;
  citations?: ProductCitation[];
}

export interface ProductDescriptionRequest {
  product_id?: number;
  name: string;
  category: string;
  price?: number;
  features: string[];
  tone?: 'professional' | 'technical' | 'concise' | 'enthusiastic';
  bypass_cache?: boolean;
}

export interface ProductDescriptionResponse {
  product_id?: number | null;
  product_name: string;
  category: string;
  tone: string;
  description: string;
  highlights: string[];
  seo_summary: string;
  provider_used: string;
  fallback_triggered: boolean;
  fallback_chain_executed: string[];
  cached: boolean;
  cache_key: string;
  moderation_passed: boolean;
}

export interface ModerationResult {
  allowed: boolean;
  flagged_categories: string[];
  reason?: string | null;
  sanitized_text: string;
  input_length: number;
  moderation_engine: string;
}

export interface AgentToolCallStep {
  step: number;
  tool_name: string;
  validated_arguments: Record<string, any>;
  tool_output: Record<string, any>;
  status: string;
}

export interface AgentExecuteRequest {
  query: string;
  preferred_tool?: string;
  tool_arguments?: Record<string, any>;
  bypass_cache?: boolean;
}

export interface AgentExecuteResponse {
  query: string;
  planner_mode: string;
  provider_used: string;
  fallback_triggered: boolean;
  iterations_used: number;
  max_iterations: number;
  tool_calls: AgentToolCallStep[];
  final_answer: string;
  cached: boolean;
  cache_key?: string | null;
  moderation_passed: boolean;
}

export interface AiCacheStats {
  enabled: boolean;
  prefix: string;
  ttl_seconds: number;
  redis_connected: boolean;
  hits: number;
  misses: number;
  sets: number;
  bypasses: number;
  redis_errors: number;
  hit_rate_percent: number;
  last_cache_key?: string | null;
  last_status?: string | null;
}

export interface PerUserRateLimitStatus {
  identity_key: string;
  is_authenticated: boolean;
  user_id?: number | string | null;
  username: string;
  scope: string;
  limit: number;
  used: number;
  remaining: number;
  window_seconds: number;
  reset_in_seconds: number;
  storage_backend: string;
}

export interface AiStatusResponse {
  status: string;
  version?: string;
  providers: {
    primary: string;
    fallback: string;
    tertiary?: string;
    available_backends: string[];
    configured_keys: {
      groq: boolean;
      gemini: boolean;
      mistral: boolean;
      openai: boolean;
      openai_compatible?: boolean;
      local_contextual?: boolean;
    };
    models: {
      groq: string;
      gemini: string;
      mistral: string;
      openai: string;
    };
  };
  rag: {
    collection_name: string;
    vector_count: number;
    embedding_model: string;
    persist_directory: string;
    chunk_size: number;
    chunk_overlap: number;
  };
  cache?: AiCacheStats;
  moderation?: {
    enabled: boolean;
    engine: string;
    max_input_chars: number;
    metrics: {
      total_checked: number;
      allowed_count: number;
      rejected_count: number;
      category_counts: Record<string, number>;
    };
  };
  rate_limit?: PerUserRateLimitStatus;
  agent_tools?: string[];
}

export interface SemanticSearchResult {
  query: string;
  count?: number;
  results_count: number;
  results?: ProductCitation[];
  citations: ProductCitation[];
  cached?: boolean;
  cache_key?: string;
  filters?: {
    category?: string | null;
    min_price?: number | null;
    max_price?: number | null;
    in_stock_only?: boolean;
    min_similarity?: number;
  };
}
