import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../api/orderService';
import { useCartStore } from '../store/useCartStore';
import type { AdminOrderOut, OrderOut, OrderStatus } from '../types/api';

export interface UpdateOrderStatusVariables {
  orderId: number;
  newStatus: OrderStatus | string;
}

/**
 * Day 16: TanStack Query Hook for Logged-in Customer's Order History (GET /orders/)
 */
export function useMyOrdersQuery(enabled: boolean = true) {
  return useQuery<OrderOut[]>({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const data = await orderService.getMyOrders();
      return data || [];
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Day 16: TanStack Query Hook for Single Order Details (GET /orders/{order_id})
 */
export function useOrderDetailQuery(orderId: number | null) {
  return useQuery<OrderOut>({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      return await orderService.getOrderById(orderId as number);
    },
    enabled: Boolean(orderId),
    staleTime: 30 * 1000,
  });
}

/**
 * Day 16: TanStack Query Mutation for Checkout (POST /orders/checkout)
 * Synchronizes Zustand Cart Store and invalidates Order History, Admin Orders, and Product Stock caches.
 */
export function useCheckoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shippingAddress: string) => {
      return await orderService.checkout(shippingAddress);
    },
    onSuccess: async (createdOrder: OrderOut) => {
      const cartStore = useCartStore.getState();
      useCartStore.setState({
        cart: { items: [], total_price: 0, total_items: 0 },
        latestOrder: createdOrder,
      });
      await cartStore.fetchCart();

      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['products-infinite'] });
    },
  });
}

/**
 * Day 16: TanStack Query Hook for Admin All Customer Orders (GET /orders/admin/all)
 */
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

/**
 * Day 16: TanStack Query Optimistic Mutation for Admin Order Status Update (PUT /orders/{id}/status)
 */
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
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    },
  });
}
