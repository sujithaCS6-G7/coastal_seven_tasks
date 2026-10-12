/**
 * Day 20 AI Streaming RAG & LangChain Type Definitions
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

export interface AiStatusResponse {
  status: string;
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
}

export interface SemanticSearchResult {
  query: string;
  results_count: number;
  citations: ProductCitation[];
}
