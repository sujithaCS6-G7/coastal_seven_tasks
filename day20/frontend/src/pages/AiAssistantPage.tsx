/**
 * Day 20 Dedicated AI Assistant & RAG Diagnostic Studio Page
 * Full-page conversational shopping interface and ChromaDB vector telemetry inspector.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  User,
  Send,
  Square,
  RotateCcw,
  Database,
  Cpu,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { useAiChatStream } from '../hooks/useAiChatStream';
import { aiService } from '../api/aiService';
import { AiStatusResponse, ProductCitation } from '../types/ai';
import { resolveAssetUrl } from '../config/env';
import { useNavigate } from 'react-router-dom';

export default function AiAssistantPage() {
  const navigate = useNavigate();
  const {
    messages,
    isLoading,
    error,
    activeProvider,
    fallbackTriggered,
    sendMessage,
    stopStreaming,
    retryLastMessage,
    clearMessages,
  } = useAiChatStream();

  const [input, setInput] = useState('');
  const [aiStatus, setAiStatus] = useState<AiStatusResponse | null>(null);
  const [isReindexing, setIsReindexing] = useState(false);
  const [reindexSuccess, setReindexSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductCitation[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadStatus = async () => {
    try {
      const data = await aiService.getStatus();
      setAiStatus(data);
    } catch (err) {
      console.error('Failed to load AI status:', err);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const handleReindex = async () => {
    setIsReindexing(true);
    setReindexSuccess(null);
    try {
      const res = await aiService.reindexCatalog();
      setReindexSuccess(`Indexed ${res.details?.chunks_indexed || 'all'} chunks into ChromaDB`);
      await loadStatus();
    } catch (err: any) {
      alert(`Re-indexing error: ${err.message || err}`);
    } finally {
      setIsReindexing(false);
    }
  };

  const handleDirectSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await aiService.searchSemantic(searchQuery, 4);
      setSearchResults(res.citations);
    } catch (err: any) {
      alert(`Search error: ${err.message || err}`);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner */}
      <div className="mb-8 p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-white/10 text-indigo-200 text-xs font-semibold rounded-full border border-white/20 backdrop-blur-sm flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Day 20 AI Focus
            </span>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-full border border-emerald-400/30">
              SSE Progressive Streaming
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            AI Assistant & RAG Semantic Studio
          </h1>
          <p className="mt-1 text-sm text-indigo-200 max-w-2xl">
            Live Server-Sent Events (SSE) AI chat grounded in ChromaDB vector embeddings with LangChain prompt templates, multi-provider fallbacks, and real-time product citations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReindex}
            disabled={isReindexing}
            className="px-4 py-2.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-semibold rounded-xl border border-white/20 backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isReindexing ? 'animate-spin' : ''}`} />
            {isReindexing ? 'Re-indexing Chroma...' : 'Re-index Catalog'}
          </button>
        </div>
      </div>

      {/* Main Grid: Chat on Left, RAG Diagnostics on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Conversational Chat UI (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-800 h-[720px] overflow-hidden">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Nexora Shopping Copilot
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Active Provider: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{activeProvider}</span>
                  {fallbackTriggered && (
                    <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                      (Fallback Engaged)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={clearMessages}
              title="Reset Conversation"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Scroller */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50 dark:bg-slate-950/20">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex-shrink-0 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-3xl px-5 py-3.5 text-sm shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                  {/* Streaming pulse cursor */}
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse align-middle rounded-sm"></span>
                  )}

                  {/* Citations Preview Cards */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-700/80 space-y-2">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-500" />
                        Grounded Sources & Citations ({msg.citations.length}):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.citations.map((item) => (
                          <div
                            key={item.product_id}
                            onClick={() => navigate(`/products/${item.product_id}`)}
                            className="group p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700/60 cursor-pointer transition-all flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-2.5 overflow-hidden">
                              {item.image_url ? (
                                <img
                                  src={resolveAssetUrl(item.image_url)}
                                  alt={item.name}
                                  className="w-11 h-11 object-cover rounded-xl border border-slate-200 dark:border-slate-700 flex-shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 flex-shrink-0">
                                  <Tag className="w-4 h-4" />
                                </div>
                              )}
                              <div className="truncate">
                                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                                  {item.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                                    ${item.price.toFixed(2)}
                                  </span>
                                  {item.similarity_score !== undefined && (
                                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                      {Math.round(item.similarity_score * 100)}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className={`text-[10px] mt-2 flex items-center justify-between ${
                      msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {msg.provider && (
                      <span className="text-[9px] uppercase tracking-wider font-semibold opacity-80">
                        {msg.provider}
                      </span>
                    )}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-2xl text-red-700 dark:text-red-300 text-sm flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={retryLastMessage}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions Bar */}
          <div className="px-6 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
            <span className="text-slate-400 font-semibold flex items-center gap-1 text-[11px] flex-shrink-0">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Suggested:
            </span>
            {[
              'Compare Sony WH-1000XM5 and Bose Ultra',
              'Apple MacBook Air M3 specs and price',
              'What 4K monitors are in stock?',
            ].map((s, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(s)}
                disabled={isLoading}
                className="whitespace-nowrap px-3 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 rounded-full border border-slate-200 dark:border-slate-700/80 transition-colors cursor-pointer text-xs font-medium"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Chat Form */}
          <form
            onSubmit={handleSubmit}
            className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about our product catalog..."
              disabled={isLoading}
              className="flex-1 px-5 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100 transition-all"
            />

            {isLoading ? (
              <button
                type="button"
                onClick={stopStreaming}
                className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/30"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            )}
          </form>
        </div>

        {/* Right Column: RAG & LLM Diagnostic Studio (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* ChromaDB Status Card */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-500" />
                ChromaDB Vector Store
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                Persistent Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Total Indexed Vectors
                </div>
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {aiStatus?.rag.vector_count ?? '...'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Embedding Model
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1.5 truncate">
                  MiniLM-L6-v2 (ONNX)
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Collection:</span>
                <span className="font-mono font-medium">{aiStatus?.rag.collection_name || 'nexora_products'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Chunk Size / Overlap:</span>
                <span className="font-mono font-medium">
                  {aiStatus?.rag.chunk_size || 600} / {aiStatus?.rag.chunk_overlap || 100} chars
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Persist Path:</span>
                <span className="font-mono text-[11px] truncate max-w-[180px]">
                  {aiStatus?.rag.persist_directory || 'chroma_data/'}
                </span>
              </div>
            </div>

            {reindexSuccess && (
              <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{reindexSuccess}</span>
              </div>
            )}
          </div>

          {/* Multi-Provider Hierarchy Card */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-purple-500" />
              LLM Provider Fallback Hierarchy
            </h2>

            <div className="space-y-3">
              {[
                {
                  role: 'Primary Provider',
                  name: aiStatus?.providers.primary || 'Gemini',
                  model: aiStatus?.providers.models?.gemini || 'gemini-1.5-flash',
                  hasKey: aiStatus?.providers.configured_keys?.gemini,
                },
                {
                  role: 'Fallback Provider',
                  name: aiStatus?.providers.fallback || 'Groq',
                  model: aiStatus?.providers.models?.groq || 'llama-3.3-70b-versatile',
                  hasKey: aiStatus?.providers.configured_keys?.groq,
                },
                {
                  role: 'Tertiary Provider',
                  name: aiStatus?.providers.tertiary || 'Mistral',
                  model: aiStatus?.providers.models?.mistral || 'mistral-small-latest',
                  hasKey: aiStatus?.providers.configured_keys?.mistral,
                },
                {
                  role: 'Offline Safety Net',
                  name: 'Local Contextual RAG Engine',
                  model: 'Deterministic Semantic Synthesizer',
                  hasKey: true,
                },
              ].map((prov, pIdx) => (
                <div
                  key={pIdx}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60"
                >
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {prov.role}
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {prov.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {prov.model}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      prov.hasKey
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {prov.hasKey ? 'Ready' : 'Mock/Fallback'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Semantic Search Playground */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <Search className="w-5 h-5 text-indigo-500" />
              ChromaDB Semantic Search Tester
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Test vector distance retrieval directly without calling an LLM.
            </p>

            <form onSubmit={handleDirectSearch} className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. noise cancellation, 4K screen"
                className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {isSearching ? '...' : 'Search'}
              </button>
            </form>

            {searchResults && (
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                {searchResults.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No items found for this query.</p>
                ) : (
                  searchResults.map((item) => (
                    <div
                      key={item.product_id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          {Math.round((item.similarity_score || 0) * 100)}% match
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 line-clamp-2">
                        {item.snippet}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
