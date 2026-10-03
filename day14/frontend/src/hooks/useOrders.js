import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../api/orderService';

/**
 * Day 14: TanStack Query Hooks for Customer & Admin Orders
 * Implements automatic background revalidation and Optimistic UI Status Updates.
 */

export function useAdminOrdersQuery(statusFilter = 'all') {
  return useQuery({
    queryKey: ['admin-orders', { statusFilter }],
    queryFn: async () => {
      const data = await orderService.getAllOrders();
      return data || [];
    },
    staleTime: 30 * 1000, // 30s fresh window
    refetchInterval: 30 * 1000, // Auto-revalidate in background every 30s
  });
}

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, newStatus }) => {
      return await orderService.updateOrderStatus(orderId, newStatus);
    },
    // Optimistic UI update: immediately flip order status before API finishes
    onMutate: async ({ orderId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-orders'] });
      const previousOrdersQueries = queryClient.getQueriesData({ queryKey: ['admin-orders'] });

      queryClient.setQueriesData({ queryKey: ['admin-orders'] }, (oldOrders) => {
        if (!Array.isArray(oldOrders)) return oldOrders;
        return oldOrders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus, _optimistic: true } : order
        );
      });

      return { previousOrdersQueries };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousOrdersQueries) {
        context.previousOrdersQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}
