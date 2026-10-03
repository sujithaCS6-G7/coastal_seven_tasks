import { QueryClient } from '@tanstack/react-query';

/**
 * Day 14: Centralized TanStack Query Client
 * - staleTime: 60s (prevents redundant API calls when navigating between catalog & details)
 * - gcTime: 5 minutes (retains cached server responses in memory)
 * - refetchOnWindowFocus: true (automatic background revalidation)
 * - retry: 1 (fast failure recovery)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute fresh window
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default queryClient;
