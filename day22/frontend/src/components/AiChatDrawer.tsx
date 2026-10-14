/**
 * Day 20 AI Chat Drawer Component
 * Interactive floating assistant with SSE progressive streaming,
 * multi-provider fallback status, and interactive product citation cards.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  RotateCcw,
  Square,
  Bot,
  User,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Tag,
  CheckCircle2,
  Maximize2,
} from 'lucide-react';
import { useAiChatStream } from '../hooks/useAiChatStream';
import { ProductCitation } from '../types/ai';
import { resolveAssetUrl } from '../config/env';
import { useNavigate } from 'react-router-dom';

interface AiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiChatDrawer({ isOpen, onClose }: AiChatDrawerProps) {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const handleSuggestionClick = (promptText: string) => {
    sendMessage(promptText);
  };

  const formatProviderLabel = (prov: string) => {
    switch (prov.toLowerCase()) {
      case 'gemini':
        return 'Gemini 1.5 Flash';
      case 'groq':
        return 'Groq (Llama 3.3)';
      case 'mistral':
        return 'Mistral Small';
      case 'local_contextual':
        return 'Local RAG Engine';
      default:
        return prov || 'AI Engine';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
          
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-md">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  Nexora AI Assistant
                  <span className="text-[10px] font-medium bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    SSE Live
                  </span>
                </h2>
                <div className="flex items-center gap-2 text-xs text-indigo-100">
                  <span>Provider: {formatProviderLabel(activeProvider)}</span>
                  {fallbackTriggered && (
                    <span className="bg-amber-400/20 text-amber-200 text-[10px] px-1.5 py-0.2 rounded border border-amber-300/30">
                      Fallback Active
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => navigate('/ai-assistant')}
                title="Open full page inspector"
                className="p-1.5 text-indigo-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={clearMessages}
                title="Clear conversation"
                className="p-1.5 text-indigo-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                aria-label="Close assistant"
                className="p-1.5 text-indigo-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70 dark:bg-slate-950/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex-shrink-0 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                  {/* Streaming pulse cursor */}
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse align-middle rounded-sm"></span>
                  )}

                  {/* Product Citations Cards */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-indigo-500" />
                        Retrieved Catalog Citations ({msg.citations.length}):
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {msg.citations.map((item: ProductCitation) => (
                          <div
                            key={item.product_id}
                            onClick={() => {
                              onClose();
                              navigate(`/products/${item.product_id}`);
                            }}
                            className="group flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer transition-all duration-200 shadow-2xs"
                          >
                            <div className="flex items-center space-x-2.5 overflow-hidden">
                              {item.image_url ? (
                                <img
                                  src={resolveAssetUrl(item.image_url)}
                                  alt={item.name}
                                  className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700 flex-shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 flex-shrink-0">
                                  <Tag className="w-4 h-4" />
                                </div>
                              )}
                              <div className="truncate">
                                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                                  {item.name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                    ₹{item.price.toFixed(2)}
                                  </span>
                                  {item.similarity_score !== undefined && (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1 rounded border border-emerald-200 dark:border-emerald-800">
                                      {Math.round(item.similarity_score * 100)}% match
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-1" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className={`text-[10px] mt-1.5 flex items-center justify-between ${
                      msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {msg.provider && (
                      <span className="text-[9px] uppercase tracking-wider font-semibold opacity-70">
                        {msg.provider}
                      </span>
                    )}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Error & Retry Banner */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={retryLastMessage}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 flex-shrink-0">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Try:
            </span>
            {[
              'Noise cancelling headphones',
              'Compare MacBook M3 vs Dell 4K',
              'Phones in stock',
            ].map((suggestion, sIdx) => (
              <button
                key={sIdx}
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={isLoading}
                className="whitespace-nowrap px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/50 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 rounded-full border border-slate-200/80 dark:border-slate-700/80 transition-colors cursor-pointer text-[11px]"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about products, specs, stock..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100 transition-all"
            />

            {isLoading ? (
              <button
                type="button"
                onClick={stopStreaming}
                title="Stop generation"
                className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors flex items-center justify-center shadow-md shadow-rose-500/20"
              >
                <Square className="w-4 h-4 fill-white" />
              </button>
            ) : (
              <button
                type="submit"
                aria-label="Send message"
                disabled={!input.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center justify-center shadow-md shadow-indigo-500/20"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Floating AI Trigger Button Component for global page access.
 * Positioned cleanly above the Live Support Chat widget to prevent overlapping.
 */
export function AiChatFloatingButton({
  onClick,
  isOpen = false,
}: {
  onClick: () => void;
  isOpen?: boolean;
}) {
  if (isOpen) return null;

  return (
    <button
      onClick={onClick}
      aria-label="Open AI Assistant"
      title="Ask Nexora AI Shopping Assistant (Day 20)"
      className="fixed bottom-20 right-6 z-40 px-3.5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white rounded-full shadow-xl shadow-purple-500/25 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200 group border border-white/20"
    >
      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse group-hover:rotate-12 transition-transform" />
      <span className="text-xs font-bold tracking-wide">Ask AI</span>
      <span className="flex h-2 w-2 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
      </span>
    </button>
  );
}
