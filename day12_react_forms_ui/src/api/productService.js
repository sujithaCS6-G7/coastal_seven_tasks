/**
 * Product & Catalog API Service connecting to FastAPI /products endpoints.
 */
import axiosClient from './axiosClient';

export const productService = {
  /**
   * Retrieve list of products with optional category filter
   * GET /products/
   */
  async getProducts(category = null, limit = 50, offset = 0) {
    const params = { limit, offset };
    if (category && category !== 'All') {
      params.category = category;
    }
    const response = await axiosClient.get('/products/', { params });
    return response.data; // { total, products: [...], cached }
  },

  /**
   * Retrieve single product details by ID
   * GET /products/{id}
   */
  async getProductById(id) {
    const response = await axiosClient.get(`/products/${id}`);
    return response.data; // ProductOut
  },

  /**
   * Create a new product (Admin only)
   * POST /products/
   */
  async createProduct(productData) {
    const response = await axiosClient.post('/products/', productData);
    return response.data;
  },

  /**
   * Update an existing product (Admin only)
   * PUT /products/{id}
   */
  async updateProduct(id, productData) {
    const response = await axiosClient.put(`/products/${id}`, productData);
    return response.data;
  },

  /**
   * Upload and process product image with Pillow (Admin only)
   * POST /products/{id}/image
   */
  async uploadImage(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosClient.post(`/products/${id}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Delete product by ID (Admin only)
   * DELETE /products/{id}
   */
  async deleteProduct(id) {
    const response = await axiosClient.delete(`/products/${id}`);
    return response.data;
  },
};
