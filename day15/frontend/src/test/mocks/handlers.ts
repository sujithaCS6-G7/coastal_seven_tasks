import { http, HttpResponse } from 'msw';
import type {
  Product,
  ProductListResponse,
  UserOut,
  TokenResponse,
  CartOut,
  CartItem,
  OrderOut,
} from '../../types/api';

export const mockUser: UserOut = {
  id: 2,
  username: 'customer1',
  email: 'customer1@example.com',
  role: 'customer',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

export const mockProducts: Product[] = [
  {
    id: 1,
    name: 'Pro Studio Wireless Headphones',
    description: 'Active noise cancelling over-ear studio headphones with 40h battery.',
    price: 299.99,
    stock: 15,
    category: 'Audio',
    image_url: 'http://localhost:8000/static/images/headphones.jpg',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'UltraBook Pro 16 Laptop',
    description: 'High-performance workstation laptop with 32GB RAM and 1TB NVMe SSD.',
    price: 1899.00,
    stock: 8,
    category: 'Electronics',
    image_url: 'http://localhost:8000/static/images/laptop.jpg',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'Limited Edition Mechanical Keyboard',
    description: 'Custom hot-swappable aluminum mechanical keyboard with tactile switches.',
    price: 179.50,
    stock: 0, // Out of stock item for testing Sold Out state
    category: 'Accessories',
    image_url: 'http://localhost:8000/static/images/keyboard.jpg',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

let currentCart: CartOut = {
  user_id: 2,
  items: [
    {
      product_id: 1,
      name: mockProducts[0].name,
      price: mockProducts[0].price,
      quantity: 1,
      subtotal: mockProducts[0].price,
      image_url: mockProducts[0].image_url,
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
  currentCart = recalculateCart([
    {
      product_id: 1,
      name: mockProducts[0].name,
      price: mockProducts[0].price,
      quantity: 1,
      subtotal: mockProducts[0].price,
      image_url: mockProducts[0].image_url,
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

  // POST /auth/login -> returns TokenResponse
  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string };
    if (body.username === 'invalid_user' || body.password === 'wrongpass') {
      return HttpResponse.json({ detail: 'Invalid username or password' }, { status: 401 });
    }
    const tokenResponse: TokenResponse = {
      access_token: 'mock-jwt-access-token',
      token_type: 'bearer',
      expires_in_minutes: 60,
      user: mockUser,
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
    return HttpResponse.json(currentCart, { status: 200 });
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

  // POST /orders/checkout -> returns OrderOut
  http.post('*/orders/checkout', async ({ request }) => {
    const body = (await request.json()) as { shipping_address?: string };
    const order: OrderOut = {
      id: 5001,
      order_number: 'ORD-5001',
      user_id: mockUser.id,
      status: 'PENDING',
      total_amount: currentCart.total_price,
      shipping_address: body.shipping_address || '123 Tech Blvd',
      created_at: new Date().toISOString(),
      items: currentCart.items.map((item: CartItem, idx: number) => ({
        id: idx + 1,
        product_id: item.product_id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.subtotal,
      })),
    };
    currentCart = recalculateCart([]);
    return HttpResponse.json(order, { status: 201 });
  }),
];
