import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../api/orderService';
import type { AdminOrderOut, OrderStatus } from '../types/api';

export interface UpdateOrderStatusVariables {
  orderId: number;
  newStatus: OrderStatus | string;
}

export function useAdminOrdersQuery(statusFilter: string = 'all') {
  return useQuery<AdminOrderOut[]>({
    queryKey: ['admin-orders', { statusFilter }],
    queryFn: async () => {
      const data = await orderService.getAllOrders();
      return data || [];
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, newStatus }: UpdateOrderStatusVariables) => {
      return await orderService.updateOrderStatus(orderId, newStatus);
    },
    onMutate: async ({ orderId, newStatus }: UpdateOrderStatusVariables) => {
      await queryClient.cancelQueries({ queryKey: ['admin-orders'] });
      const previousOrdersQueries = queryClient.getQueriesData<AdminOrderOut[]>({
        queryKey: ['admin-orders'],
      });

      queryClient.setQueriesData<AdminOrderOut[]>(
        { queryKey: ['admin-orders'] },
        (oldOrders) => {
          if (!Array.isArray(oldOrders)) return oldOrders;
          return oldOrders.map((order) =>
            order.id === orderId
              ? { ...order, status: newStatus, _optimistic: true }
              : order
          );
        }
      );

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
