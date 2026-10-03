import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../api/productService';

/**
 * Day 14: TanStack Query Hooks for Product Catalog
 * Provides server-state caching, automatic revalidation, infinite scrolling pagination,
 * and optimistic mutations.
 */

export function useProductsQuery(category = 'All') {
  return useQuery({
    queryKey: ['products', { category }],
    queryFn: () => productService.getProducts(category === 'All' ? null : category, 50, 0),
    staleTime: 60 * 1000, // 1 min fresh cache
  });
}

export function useInfiniteProductsQuery(category = 'All', pageSize = 4) {
  return useInfiniteQuery({
    queryKey: ['products-infinite', { category, pageSize }],
    queryFn: ({ pageParam = 0 }) =>
      productService.getProducts(category === 'All' ? null : category, pageSize, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((acc, page) => acc + (page.products?.length || 0), 0);
      const totalCount = lastPage?.total || 0;
      return loadedCount < totalCount ? loadedCount : undefined;
    },
    staleTime: 60 * 1000,
  });
}

export function useProductDetailQuery(productId) {
  return useQuery({
    queryKey: ['product', String(productId)],
    queryFn: () => productService.getProductById(productId),
    enabled: Boolean(productId),
    staleTime: 60 * 1000,
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId) => productService.deleteProduct(productId),
    // Optimistic update: remove product from cached lists immediately
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });
      const previousQueries = queryClient.getQueriesData({ queryKey: ['products'] });

      queryClient.setQueriesData({ queryKey: ['products'] }, (oldData) => {
        if (!oldData || !oldData.products) return oldData;
        return {
          ...oldData,
          total: Math.max(0, (oldData.total || 1) - 1),
          products: oldData.products.filter((p) => p.id !== productId),
        };
      });

      return { previousQueries };
    },
    onError: (_err, _productId, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-infinite'] });
    },
  });
}

export function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['products-infinite'] });
    queryClient.invalidateQueries({ queryKey: ['product'] });
  };
}
