import { http, HttpResponse } from 'msw';
import type {
  Product,
  ProductListResponse,
  ProductCreatePayload,
  ProductUpdatePayload,
  UserOut,
  TokenResponse,
  CartOut,
  CartItem,
  OrderOut,
  AdminOrderOut,
} from '../../types/api';

export const mockUser: UserOut = {
  id: 2,
  username: 'customer1',
  email: 'customer1@example.com',
  role: 'customer',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

export const mockAdminUser: UserOut = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  role: 'admin',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

export const initialMockProducts: Product[] = [
  {
    id: 1,
    name: 'Pro Studio Wireless Headphones',
    description: 'Active noise cancelling over-ear studio headphones with 40h battery.',
    price: 299.99,
    stock: 15,
    category: 'Audio',
    image_url: 'http://localhost:8000/uploads/products/headphones.jpg',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'UltraBook Pro 16 Laptop',
    description: 'High-performance workstation laptop with 32GB RAM and 1TB NVMe SSD.',
    price: 1899.0,
    stock: 8,
    category: 'Electronics',
    image_url: 'http://localhost:8000/uploads/products/laptop.jpg',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'Limited Edition Mechanical Keyboard',
    description: 'Custom hot-swappable aluminum mechanical keyboard with tactile switches.',
    price: 179.5,
    stock: 0,
    category: 'Accessories',
    image_url: 'http://localhost:8000/uploads/products/keyboard.jpg',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

export let mockProducts: Product[] = [...initialMockProducts];

export const initialMockOrders: AdminOrderOut[] = [
  {
    id: 5001,
    order_number: 'ORD-5001',
    user_id: 2,
    total_amount: 299.99,
    status: 'DELIVERED',
    shipping_address: 'Alice Customer, Plot 42, Hi-Tech City, Hyderabad - 500081',
    created_at: '2026-09-28T10:30:00Z',
    user: {
      id: 2,
      username: 'customer1',
      email: 'customer1@example.com',
    },
    items: [
      {
        id: 1,
        product_id: 1,
        product_name: 'Pro Studio Wireless Headphones',
        quantity: 1,
        unit_price: 299.99,
        total_price: 299.99,
      },
    ],
  },
  {
    id: 5002,
    order_number: 'ORD-5002',
    user_id: 2,
    total_amount: 1899.0,
    status: 'PENDING',
    shipping_address: 'Alice Customer, Plot 42, Hi-Tech City, Hyderabad - 500081',
    created_at: '2026-10-01T14:15:00Z',
    user: {
      id: 2,
      username: 'customer1',
      email: 'customer1@example.com',
    },
    items: [
      {
        id: 2,
        product_id: 2,
        product_name: 'UltraBook Pro 16 Laptop',
        quantity: 1,
        unit_price: 1899.0,
        total_price: 1899.0,
      },
    ],
  },
];

let currentOrders: AdminOrderOut[] = [...initialMockOrders];

let currentCart: CartOut = {
  user_id: 2,
  items: [
    {
      product_id: 1,
      name: initialMockProducts[0].name,
      price: initialMockProducts[0].price,
      quantity: 1,
      subtotal: initialMockProducts[0].price,
      image_url: initialMockProducts[0].image_url,
    },
  ],
  total_items: 1,
  total_price: 299.99,
};

const recalculateCart = (items: CartItem[]): CartOut => {
  const total_items = items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
  const total_price = items.reduce((sum: number, item: CartItem) => sum + item.subtotal, 0);
  return {
    user_id: 2,
    items,
    total_items,
    total_price,
  };
};

export const resetMockCart = (): void => {
  mockProducts = initialMockProducts.map((p) => ({ ...p }));
  currentOrders = initialMockOrders.map((o) => ({
    ...o,
    items: o.items.map((i) => ({ ...i })),
  }));
  currentCart = recalculateCart([
    {
      product_id: 1,
      name: initialMockProducts[0].name,
      price: initialMockProducts[0].price,
      quantity: 1,
      subtotal: initialMockProducts[0].price,
      image_url: initialMockProducts[0].image_url,
    },
  ]);
};

export const handlers = [
  // GET /products/ -> returns ProductListResponse { total, products, cached }
  http.get('*/products/', ({ request }) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category') || '';

    let filtered = [...mockProducts];
    if (category && category !== 'All') {
      filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }

    const response: ProductListResponse = {
      total: filtered.length,
      products: filtered,
      cached: false,
    };
    return HttpResponse.json(response, { status: 200 });
  }),

  // GET /products/:id
  http.get('*/products/:id', ({ params }) => {
    const id = Number(params.id);
    const product = mockProducts.find((p) => p.id === id);
    if (!product) {
      return HttpResponse.json({ detail: 'Product not found' }, { status: 404 });
    }
    return HttpResponse.json(product, { status: 200 });
  }),

  // POST /products/ (Admin Create Product)
  http.post('*/products/', async ({ request }) => {
    const body = (await request.json()) as ProductCreatePayload;
    const newProduct: Product = {
      id: mockProducts.length + 10,
      name: body.name,
      description: body.description ?? null,
      price: Number(body.price),
      stock: Number(body.stock),
      category: body.category || 'Electronics',
      image_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockProducts = [newProduct, ...mockProducts];
    return HttpResponse.json(newProduct, { status: 201 });
  }),

  // PUT /products/:id (Admin Update Product)
  http.put('*/products/:id', async ({ params, request }) => {
    const id = Number(params.id);
    const body = (await request.json()) as ProductUpdatePayload;
    const idx = mockProducts.findIndex((p) => p.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: 'Product not found' }, { status: 404 });
    }
    const updated: Product = {
      ...mockProducts[idx],
      ...body,
      updated_at: new Date().toISOString(),
    };
    mockProducts[idx] = updated;
    return HttpResponse.json(updated, { status: 200 });
  }),

  // DELETE /products/:id (Admin Delete Product)
  http.delete('*/products/:id', ({ params }) => {
    const id = Number(params.id);
    mockProducts = mockProducts.filter((p) => p.id !== id);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /auth/login -> returns TokenResponse
  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string };
    if (body.username === 'invalid_user' || body.password === 'wrongpass') {
      return HttpResponse.json({ detail: 'Invalid username or password' }, { status: 401 });
    }
    const userToReturn = body.username === 'admin' ? mockAdminUser : mockUser;
    const tokenResponse: TokenResponse = {
      access_token: 'mock-jwt-access-token',
      token_type: 'bearer',
      expires_in_minutes: 60,
      user: userToReturn,
    };
    return HttpResponse.json(tokenResponse, { status: 200 });
  }),

  // GET /auth/me -> returns UserOut
  http.get('*/auth/me', () => {
    return HttpResponse.json(mockUser, { status: 200 });
  }),

  // GET /cart/ -> returns CartOut
  http.get('*/cart/', () => {
    return HttpResponse.json(currentCart, { status: 200 });
  }),

  // POST /cart/items -> returns updated CartOut
  http.post('*/cart/items', async ({ request }) => {
    const body = (await request.json()) as { product_id: number; quantity: number };
    const product = mockProducts.find((p) => p.id === body.product_id) || mockProducts[0];
    const existing = currentCart.items.find((i: CartItem) => i.product_id === body.product_id);

    const updatedItems = [...currentCart.items];
    if (existing) {
      existing.quantity += body.quantity;
      existing.subtotal = existing.price * existing.quantity;
    } else {
      updatedItems.push({
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: body.quantity,
        subtotal: product.price * body.quantity,
        image_url: product.image_url,
      });
    }

    currentCart = recalculateCart(updatedItems);
    return HttpResponse.json(currentCart, { status: 201 });
  }),

  // PUT /cart/items/:productId -> returns updated CartOut
  http.put('*/cart/items/:productId', async ({ params, request }) => {
    const productId = Number(params.productId);
    const body = (await request.json()) as { quantity: number };

    const updatedItems = currentCart.items.map((item: CartItem) =>
      item.product_id === productId
        ? { ...item, quantity: body.quantity, subtotal: item.price * body.quantity }
        : item
    );

    currentCart = recalculateCart(updatedItems);
    return HttpResponse.json(currentCart, { status: 200 });
  }),

  // DELETE /cart/items/:productId -> returns updated CartOut
  http.delete('*/cart/items/:productId', ({ params }) => {
    const productId = Number(params.productId);
    const updatedItems = currentCart.items.filter(
      (item: CartItem) => item.product_id !== productId
    );
    currentCart = recalculateCart(updatedItems);
    return HttpResponse.json(currentCart, { status: 200 });
  }),

  // DELETE /cart/ -> clears cart
  http.delete('*/cart/', () => {
    currentCart = recalculateCart([]);
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /orders/admin/all -> returns AdminOrderOut[]
  http.get('*/orders/admin/all', () => {
    return HttpResponse.json(currentOrders, { status: 200 });
  }),

  // GET /orders/ -> returns OrderOut[] for current user
  http.get('*/orders/', () => {
    return HttpResponse.json(currentOrders, { status: 200 });
  }),

  // GET /orders/:orderId -> returns single OrderOut
  http.get('*/orders/:orderId', ({ params }) => {
    const id = Number(params.orderId);
    const found = currentOrders.find((o) => o.id === id);
    if (!found) {
      return HttpResponse.json({ detail: 'Order not found' }, { status: 404 });
    }
    return HttpResponse.json(found, { status: 200 });
  }),

  // POST /orders/checkout -> creates OrderOut and clears cart
  http.post('*/orders/checkout', async ({ request }) => {
    const body = (await request.json()) as { shipping_address?: string };
    const order: AdminOrderOut = {
      id: 5000 + currentOrders.length + 1,
      order_number: `ORD-${5000 + currentOrders.length + 1}`,
      user_id: mockUser.id,
      status: 'CONFIRMED',
      total_amount: currentCart.total_price,
      shipping_address: body.shipping_address || '123 Tech Blvd',
      created_at: new Date().toISOString(),
      user: {
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
      },
      items: currentCart.items.map((item: CartItem, idx: number) => ({
        id: idx + 1,
        product_id: item.product_id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.subtotal,
      })),
    };
    currentOrders = [order, ...currentOrders];
    currentCart = recalculateCart([]);
    return HttpResponse.json(order, { status: 201 });
  }),

  // PUT /orders/:orderId/status -> updates order status
  http.put('*/orders/:orderId/status', async ({ params, request }) => {
    const id = Number(params.orderId);
    const body = (await request.json()) as { status: string };
    const idx = currentOrders.findIndex((o) => o.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: 'Order not found' }, { status: 404 });
    }
    currentOrders[idx] = {
      ...currentOrders[idx],
      status: body.status,
    };
    return HttpResponse.json(currentOrders[idx], { status: 200 });
  }),
];
