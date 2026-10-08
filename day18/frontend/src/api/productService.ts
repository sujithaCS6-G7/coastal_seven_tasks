import apiClient from './axiosClient';
import type {
  Product,
  ProductListResponse,
  ProductCreatePayload,
  ProductUpdatePayload,
} from '../types/api';

/**
 * Day 15: Typed Product Catalog API Service connecting to FastAPI /products endpoints.
 */
export const productService = {
  async getProducts(
    category: string | null = null,
    limit: number = 50,
    offset: number = 0
  ): Promise<ProductListResponse> {
    const params: Record<string, string | number> = { limit, offset };
    if (category && category !== 'All') {
      params.category = category;
    }
    const response = await apiClient.get<ProductListResponse>('/products/', { params });
    return response.data;
  },

  async searchProducts(
    query: string,
    mode: 'fulltext' | 'fuzzy' | 'combined' = 'fulltext',
    category: string | null = null,
    limit: number = 50,
    offset: number = 0
  ): Promise<ProductListResponse> {
    const params: Record<string, string | number> = {
      q: query,
      mode,
      limit,
      offset,
    };
    if (category && category !== 'All') {
      params.category = category;
    }
    const response = await apiClient.get<ProductListResponse>('/products/search', { params });
    return response.data;
  },

  async getProductById(id: number | string): Promise<Product> {

    const response = await apiClient.get<Product>(`/products/${id}`);
    return response.data;
  },

  async createProduct(productData: ProductCreatePayload): Promise<Product> {
    const response = await apiClient.post<Product>('/products/', productData);
    return response.data;
  },

  async updateProduct(id: number, productData: ProductUpdatePayload): Promise<Product> {
    const response = await apiClient.put<Product>(`/products/${id}`, productData);
    return response.data;
  },

  async deleteProduct(id: number): Promise<void> {
    await apiClient.delete(`/products/${id}`);
  },

  async uploadProductImage(id: number, file: File): Promise<Product> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<Product>(`/products/${id}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default productService;
