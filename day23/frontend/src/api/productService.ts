import apiClient from './axiosClient';
import { SAMPLE_CATALOG } from '../data/sampleCatalog';
import type {
  Product,
  ProductListResponse,
  ProductCreatePayload,
  ProductUpdatePayload,
} from '../types/api';

function getSampleCatalogFiltered(
  category: string | null = null,
  limit: number = 50,
  offset: number = 0
): ProductListResponse {
  let list = [...SAMPLE_CATALOG];
  if (category && category !== 'All') {
    list = list.filter(
      (p) => p.category?.toLowerCase() === category.toLowerCase()
    );
  }
  const total = list.length;
  const paginated = list.slice(offset, offset + limit);
  return {
    products: paginated,
    total,
    cached: true,
  };
}

function searchSampleCatalog(
  query: string,
  category: string | null = null,
  limit: number = 50,
  offset: number = 0
): ProductListResponse {
  const q = query.toLowerCase().trim();
  let list = SAMPLE_CATALOG.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
  );
  if (category && category !== 'All') {
    list = list.filter(
      (p) => p.category?.toLowerCase() === category.toLowerCase()
    );
  }
  const total = list.length;
  const paginated = list.slice(offset, offset + limit);
  return {
    products: paginated,
    total,
    cached: true,
  };
}

/**
 * Day 15: Typed Product Catalog API Service connecting to FastAPI /products endpoints
 * with automatic resilient fallback to authentic sample tech catalog for preview deployments.
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
    try {
      const response = await apiClient.get<ProductListResponse>('/products/', { params });
      if (response.data && Array.isArray(response.data.products) && response.data.products.length > 0) {
        return response.data;
      }
      return getSampleCatalogFiltered(category, limit, offset);
    } catch (err) {
      console.warn('[ProductService] Backend offline or unreachable, serving offline preview catalog:', err);
      return getSampleCatalogFiltered(category, limit, offset);
    }
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
    try {
      const response = await apiClient.get<ProductListResponse>('/products/search', { params });
      if (response.data && Array.isArray(response.data.products) && response.data.products.length > 0) {
        return response.data;
      }
      return searchSampleCatalog(query, category, limit, offset);
    } catch (err) {
      console.warn('[ProductService] Search failed, falling back to local query search:', err);
      return searchSampleCatalog(query, category, limit, offset);
    }
  },

  async getProductById(id: number | string): Promise<Product> {
    try {
      const response = await apiClient.get<Product>(`/products/${id}`);
      return response.data;
    } catch (err) {
      const numId = Number(id);
      const found = SAMPLE_CATALOG.find((p) => p.id === numId);
      if (found) return found;
      throw err;
    }
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
