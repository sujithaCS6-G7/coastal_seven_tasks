import apiClient from './axiosClient';

/**
 * Product Catalog API Service connecting to FastAPI /products endpoints.
 */
export const productService = {
  /**
   * Fetch list of products with optional category filtering and pagination.
   */
  async getProducts(category = null, limit = 50, offset = 0) {
    const params = { limit, offset };
    if (category && category !== 'All') {
      params.category = category;
    }
    const response = await apiClient.get('/products/', { params });
    return response.data; // { total, products, cached }
  },

  /**
   * Fetch single product details by ID.
   */
  async getProductById(id) {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  /**
   * Create a new product (Admin only).
   */
  async createProduct(productData) {
    const response = await apiClient.post('/products/', productData);
    return response.data;
  },

  /**
   * Update an existing product (Admin only).
   */
  async updateProduct(id, productData) {
    const response = await apiClient.put(`/products/${id}`, productData);
    return response.data;
  },

  /**
   * Delete a product by ID (Admin only).
   */
  async deleteProduct(id) {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },

  /**
   * Upload an optimized product image (Admin only).
   */
  async uploadProductImage(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/products/${id}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default productService;
