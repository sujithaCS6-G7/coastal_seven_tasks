import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { productService } from '../api/productService';
import type { Product, ProductListResponse } from '../types/api';

/**
 * Day 15: Typed TanStack Query Hooks for Product Catalog
 */

export function useProductsQuery(category: string = 'All') {
  return useQuery<ProductListResponse>({
    queryKey: ['products', { category }],
    queryFn: () => productService.getProducts(category === 'All' ? null : category, 50, 0),
    staleTime: 60 * 1000,
  });
}

export function usePaginatedProductsQuery(
  category: string = 'All',
  page: number = 1,
  pageSize: number = 3
) {
  const offset = (page - 1) * pageSize;
  return useQuery<ProductListResponse>({
    queryKey: ['products-paginated', { category, page, pageSize }],
    queryFn: () =>
      productService.getProducts(category === 'All' ? null : category, pageSize, offset),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

export function useInfiniteProductsQuery(category: string = 'All', pageSize: number = 3) {
  return useInfiniteQuery<ProductListResponse>({
    queryKey: ['products-infinite', { category, pageSize }],
    queryFn: ({ pageParam = 0 }) =>
      productService.getProducts(
        category === 'All' ? null : category,
        pageSize,
        Number(pageParam)
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce(
        (acc, page) => acc + (page.products?.length || 0),
        0
      );
      const totalCount = lastPage?.total || 0;
      return loadedCount < totalCount ? loadedCount : undefined;
    },
    staleTime: 60 * 1000,
  });
}

export function useProductDetailQuery(productId: string | number | undefined) {
  return useQuery<Product>({
    queryKey: ['product', String(productId)],
    queryFn: () => productService.getProductById(productId as string | number),
    enabled: Boolean(productId),
    staleTime: 60 * 1000,
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: number) => productService.deleteProduct(productId),
    onMutate: async (productId: number) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });
      const previousQueries = queryClient.getQueriesData<ProductListResponse>({
        queryKey: ['products'],
      });

      queryClient.setQueriesData<ProductListResponse>(
        { queryKey: ['products'] },
        (oldData) => {
          if (!oldData || !oldData.products) return oldData;
          return {
            ...oldData,
            total: Math.max(0, (oldData.total || 1) - 1),
            products: oldData.products.filter((p) => p.id !== productId),
          };
        }
      );

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
      queryClient.invalidateQueries({ queryKey: ['products-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['products-infinite'] });
    },
  });
}

export function useInvalidateProducts(): () => void {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['products-paginated'] });
    queryClient.invalidateQueries({ queryKey: ['products-infinite'] });
    queryClient.invalidateQueries({ queryKey: ['product'] });
  };
}
