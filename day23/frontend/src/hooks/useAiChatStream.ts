/**
 * Day 20 Custom Hook: useAiChatStream
 * Manages streaming AI chat state, token accumulation, product citations,
 * provider fallback tracking, and retry logic.
 */

import { useState, useRef, useCallback } from 'react';
import { aiService } from '../api/aiService';
import { ChatMessage, ProductCitation } from '../types/ai';

export function useAiChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        "Hello! I am Nexora AI, your intelligent shopping assistant. I can help you search our catalog, compare laptops, check headphone battery life, and verify live stock. How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string>('auto');
  const [fallbackTriggered, setFallbackTriggered] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const sendMessage = useCallback(
    async (userInput: string) => {
      const text = userInput.trim();
      if (!text || isLoading) return;

      lastUserMessageRef.current = text;
      setError(null);

      // Abort any ongoing stream
      stopStreaming();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const userMsgId = `user-${Date.now()}`;
      const assistantMsgId = `assistant-${Date.now()}`;
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newUserMsg: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: text,
        timestamp,
      };

      const newAssistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp,
        isStreaming: true,
        citations: [],
      };

      // Update message list
      setMessages((prev) => [...prev, newUserMsg, newAssistantMsg]);
      setIsLoading(true);

      // Format conversation history for LLM context (exclude system/welcome)
      const historyPayload = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      await aiService.streamChat({
        message: text,
        history: historyPayload,
        signal: controller.signal,
        onMetadata: (meta) => {
          setActiveProvider(meta.provider_used);
          setFallbackTriggered(meta.fallback_triggered);

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    provider: meta.provider_used,
                    fallbackTriggered: meta.fallback_triggered,
                    citations: meta.citations || [],
                  }
                : msg
            )
          );
        },
        onToken: (token) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    content: msg.content + token,
                  }
                : msg
            )
          );
        },
        onError: (err) => {
          setError(err.message || 'Failed to complete AI stream');
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    isStreaming: false,
                    error: err.message || 'Stream interrupted',
                  }
                : msg
            )
          );
          setIsLoading(false);
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    isStreaming: false,
                  }
                : msg
            )
          );
          setIsLoading(false);
          abortControllerRef.current = null;
        },
      });
    },
    [isLoading, messages, stopStreaming]
  );

  const retryLastMessage = useCallback(() => {
    if (lastUserMessageRef.current) {
      sendMessage(lastUserMessageRef.current);
    }
  }, [sendMessage]);

  const clearMessages = useCallback(() => {
    stopStreaming();
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content:
          "Conversation cleared! Ask me anything about our products, specifications, and availability.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setError(null);
  }, [stopStreaming]);

  return {
    messages,
    isLoading,
    error,
    activeProvider,
    fallbackTriggered,
    sendMessage,
    stopStreaming,
    retryLastMessage,
    clearMessages,
  };
}
