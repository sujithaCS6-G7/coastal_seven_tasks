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

  // GET /products/search -> PostgreSQL FTS & Fuzzy search simulation
  http.get('*/products/search', ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const mode = (url.searchParams.get('mode') || 'fulltext').toLowerCase();
    const category = url.searchParams.get('category') || '';

    const searchPool: Product[] = [
      ...mockProducts,
      {
        id: 99,
        name: 'iPhone 16 Pro Max',
        description: 'Flagship smartphone with A18 Pro chip and Titanium design.',
        price: 1199.99,
        stock: 30,
        category: 'Electronics',
        image_url: 'http://localhost:8003/uploads/products/laptop.jpg',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ];

    let matches = searchPool.filter((p) => {
      if (category && category !== 'All' && p.category.toLowerCase() !== category.toLowerCase()) {
        return false;
      }
      if (!q) return true;
      const hay = `${p.name} ${p.category} ${p.description || ''}`.toLowerCase();
      if (mode === 'fuzzy' || mode === 'combined') {
        if (q === 'iphon' && p.name.toLowerCase().includes('iphone')) return true;
        if (q === 'keybord' && p.name.toLowerCase().includes('keyboard')) return true;
        if ((q === 'lapto' || q === 'laptp') && p.name.toLowerCase().includes('laptop')) return true;
      }
      return q.split(/\s+/).some((tok) => hay.includes(tok));
    });

    matches = matches.map((p, idx) => ({
      ...p,
      relevance_score: Number((0.92 - idx * 0.12).toFixed(2)),
      match_type: mode === 'fuzzy' ? 'fuzzy_pg_trgm' : 'fulltext_tsvector',
    }));

    return HttpResponse.json(
      {
        total: matches.length,
        products: matches,
        cached: false,
        query: q,
        search_mode: mode,
        index_used:
          mode === 'fuzzy'
            ? 'idx_products_trgm_gin (GIN pg_trgm)'
            : 'idx_products_search_vector_gin (GIN tsvector)',
      },
      { status: 200 }
    );
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

  // GET /ws/chat/rooms -> returns active support rooms
  http.get('*/ws/chat/rooms', () => {
    return HttpResponse.json(
      {
        rooms: [
          {
            room_id: '18',
            customer_id: 18,
            customer_name: 'customer1',
            active_connections: 1,
            message_count: 1,
          },
          {
            room_id: '19',
            customer_id: 19,
            customer_name: 'customer2',
            active_connections: 0,
            message_count: 1,
          },
          {
            room_id: '20',
            customer_id: 20,
            customer_name: 'customer3',
            active_connections: 0,
            message_count: 1,
          },
        ],
      },
      { status: 200 }
    );
  }),

  // GET /ws/chat/:roomId/history -> returns chat room message history
  http.get('*/ws/chat/:roomId/history', ({ params }) => {
    return HttpResponse.json(
      {
        room_id: String(params.roomId),
        messages: [],
      },
      { status: 200 }
    );
  }),

  // GET /orders/admin/n1-benchmark -> returns N+1 SQL optimization comparison
  http.get('*/orders/admin/n1-benchmark', () => {
    return HttpResponse.json(
      {
        orders_inspected: 5,
        unoptimized_lazy_loading: {
          strategy: 'Lazy Loading (default relationship loading)',
          sql_queries_executed: 11,
          formula: '1 (orders) + N (order_items per order) + U (distinct users)',
          sample_sql: ['SELECT orders.id ...', 'SELECT order_items.id ...'],
        },
        optimized_eager_loading: {
          strategy: 'joinedload(Order.user) + selectinload(Order.items)',
          sql_queries_executed: 2,
          formula: '1 (orders LEFT JOIN users) + 1 (order_items WHERE order_id IN (...))',
          sample_sql: ['SELECT orders.id, users.id ...', 'SELECT order_items.id WHERE order_id IN (...)'],
        },
        queries_saved: 9,
        reduction_percentage: 81.8,
      },
      { status: 200 }
    );
  }),

  // POST /tasks/invoices/:orderId -> starts Celery PDF invoice task
  http.post('*/tasks/invoices/:orderId', ({ params }) => {
    const orderId = Number(params.orderId);
    return HttpResponse.json(
      {
        task_id: `invoice-task-${orderId}`,
        status: 'STARTED',
        celery_state: 'STARTED',
        task_type: 'pdf_invoice',
        progress: 45,
        stage: `Formatting line items for Order #${orderId}...`,
        result: null,
        error: null,
      },
      { status: 202 }
    );
  }),

  // POST /tasks/csv-import -> starts Celery Bulk CSV Import task
  http.post('*/tasks/csv-import', () => {
    return HttpResponse.json(
      {
        task_id: 'csv-task-101',
        status: 'STARTED',
        celery_state: 'STARTED',
        task_type: 'csv_import',
        progress: 50,
        stage: 'Processed 3 / 6 rows (3 succeeded, 0 failed)...',
        result: null,
        error: null,
      },
      { status: 202 }
    );
  }),

  // GET /tasks/:taskId -> returns completed Celery task payload on poll
  http.get('*/tasks/:taskId', ({ params }) => {
    const taskId = String(params.taskId);
    if (taskId.startsWith('invoice-task-')) {
      const orderId = Number(taskId.replace('invoice-task-', '')) || 5001;
      return HttpResponse.json(
        {
          task_id: taskId,
          status: 'COMPLETED',
          celery_state: 'SUCCESS',
          task_type: 'pdf_invoice',
          progress: 100,
          stage: `PDF Invoice for ORD-${orderId} is ready to download.`,
          result: {
            order_id: orderId,
            order_number: `ORD-${orderId}`,
            filename: `invoice_ORD-${orderId}.pdf`,
            file_size_bytes: 2840,
            download_url: `/tasks/invoices/${orderId}/download`,
            static_url: `/uploads/invoices/invoice_ORD-${orderId}.pdf`,
            customer_name: 'customer1',
            total_amount: 299.99,
            items_count: 1,
            generated_at: new Date().toISOString(),
          },
          error: null,
        },
        { status: 200 }
      );
    }

    return HttpResponse.json(
      {
        task_id: taskId,
        status: 'COMPLETED',
        celery_state: 'SUCCESS',
        task_type: 'csv_import',
        progress: 100,
        stage: 'CSV Import completed: 5/6 products imported (3 images saved, 1 image errors, 1 failed rows).',
        result: {
          filename: 'sample_products_import.csv',
          total_rows: 6,
          processed_rows: 6,
          success_count: 5,
          failure_count: 1,
          image_downloaded_count: 3,
          image_failed_count: 1,
          image_missing_count: 1,
          errors: [
            {
              row: 6,
              name: 'Invalid Demo Row',
              error: "Price must be greater than 0 (received '-15.00').",
            },
          ],
          image_errors: [
            {
              row: 4,
              name: 'Keychron Q1 Pro Mechanical Keyboard',
              image_url: 'http://127.0.0.1:8003/uploads/products/broken_404_image.jpg',
              error: "Image not found (404) at 'http://127.0.0.1:8003/uploads/products/broken_404_image.jpg'.",
            },
          ],
          imported_products: [
            {
              id: 99,
              name: 'iPhone 16 Pro Max',
              price: 1199.99,
              stock: 30,
              category: 'Electronics',
              action: 'created',
              image_url: '/uploads/products/csv_iphone_16_pro_max_a1b2c3d4.jpg',
              saved_image_filename: 'csv_iphone_16_pro_max_a1b2c3d4.jpg',
              source_image_url: 'http://127.0.0.1:8003/uploads/products/laptop.jpg',
              image_status: 'downloaded',
              image_error: null,
            },
            {
              id: 100,
              name: 'Keychron Q1 Pro Mechanical Keyboard',
              price: 199.0,
              stock: 25,
              category: 'Accessories',
              action: 'created',
              image_url: '/uploads/products/laptop.jpg',
              saved_image_filename: null,
              source_image_url: 'http://127.0.0.1:8003/uploads/products/broken_404_image.jpg',
              image_status: 'failed',
              image_error: "Image not found (404) at 'http://127.0.0.1:8003/uploads/products/broken_404_image.jpg'.",
            },
            {
              id: 101,
              name: 'LG UltraGear 32-inch OLED 240Hz',
              price: 899.99,
              stock: 12,
              category: 'Displays',
              action: 'created',
              image_url: '/uploads/products/laptop.jpg',
              saved_image_filename: null,
              source_image_url: null,
              image_status: 'missing',
              image_error: null,
            },
          ],
        },
        error: null,
      },
      { status: 200 }
    );
  }),

  http.get('*/system/security-status', () => {
    return HttpResponse.json(
      {
        status: 'hardened',
        rate_limiting: {
          library: 'slowapi (limits backend)',
          rules: {
            'POST /auth/login': '20/minute',
            'POST /auth/register': '15/minute',
            'GET /products/': '600/minute',
            'GET /products/search': '300/minute',
            'POST /tasks/csv-import': '30/minute',
            'GET /system/rate-limit-probe': '5/minute',
          },
          metrics: {
            total_requests_inspected: 145,
            rate_limit_blocks_429: 2,
            oversized_payload_blocks_413: 1,
          },
        },
        owasp_security: {
          headers: {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
            'Cross-Origin-Opener-Policy': 'same-origin',
          },
          max_request_body_bytes: 6291456,
          practices_enforced: [
            'API1:2023 Broken Object Level Authorization — Order ownership verified in OrderService.get_order_by_id',
            'API2:2023 Broken Authentication — bcrypt password hashing + HS256 JWT expiration + SlowAPI login rate limiting',
            'API4:2023 Unrestricted Resource Consumption — SlowAPI rate limits + 6MB payload ceiling',
            'API8:2023 Security Misconfiguration — Defensive CSP, X-Frame-Options, nosniff, Referrer-Policy & CORS allowlist',
          ],
        },
        compression: {
          middleware: 'GZipMiddleware',
          minimum_size_bytes: 500,
          catalog_sample_products: 15,
          uncompressed_bytes: 4820,
          gzip_compressed_bytes: 1340,
          bytes_saved: 3480,
          compression_savings_percent: 72.2,
        },
        bundle_analysis: {
          built: true,
          total_raw_kb: 382.4,
          total_gzip_kb: 118.6,
          chunks: [
            { filename: 'vendor-react.js', type: 'js', raw_kb: 162.1, gzip_kb: 52.8 },
            { filename: 'vendor-query-state.js', type: 'js', raw_kb: 74.5, gzip_kb: 24.9 },
          ],
        },
        lighthouse: {
          executed: true,
          final_url: 'http://localhost:5180/',
          scores: {
            performance: 95,
            accessibility: 96,
            'best-practices': 100,
            seo: 100,
          },
          metrics: {
            fcp: '0.8 s',
            lcp: '1.2 s',
            cls: '0',
          },
        },
        locust_load_test: {
          executed: true,
          concurrent_users: 50,
          spawn_rate: 10,
          aggregated: {
            name: 'Aggregated',
            request_count: 1420,
            failure_count: 0,
            median_ms: 14,
            average_ms: 18.4,
            p95_ms: 36,
            rps: 94.6,
          },
          endpoints: [
            {
              name: 'GET /products/ (Catalog + GZip)',
              request_count: 580,
              failure_count: 0,
              median_ms: 11,
              average_ms: 14.2,
              p95_ms: 28,
              rps: 38.6,
            },
          ],
        },
      },
      { status: 200 }
    );
  }),

  http.get('*/system/rate-limit-probe', (() => {
    const bucketCounts: Record<string, number> = {};
    return ({ request }) => {
      const bucket = request.headers.get('X-RateLimit-Client-Id') || 'default';
      bucketCounts[bucket] = (bucketCounts[bucket] || 0) + 1;
      if (bucketCounts[bucket] > 5) {
        return HttpResponse.json(
          {
            detail: 'Rate limit exceeded: 5 per 1 minute. Please slow down and retry later.',
            error: 'rate_limit_exceeded',
            limit: '5 per 1 minute',
            retry_after_seconds: 60,
          },
          { status: 429 }
        );
      }
      return HttpResponse.json(
        {
          status: 'allowed',
          message: 'Request permitted by SlowAPI rate limiter.',
          limit: '5/minute',
          client_bucket: bucket,
        },
        { status: 200 }
      );
    };
  })()),
];



