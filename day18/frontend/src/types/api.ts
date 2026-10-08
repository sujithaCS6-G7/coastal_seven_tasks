/**
 * Day 15: TypeScript Fundamentals & Typed FastAPI Schemas
 * Strict 1-to-1 TypeScript interfaces matching FastAPI Pydantic models
 * in backend/app/schemas/{user,product,cart,order}.py
 */

// ============================================================================
// 1. Generic Utility Types (TypeScript Generics)
// ============================================================================

/**
 * Generic wrapper for paginated list endpoints from FastAPI.
 */
export interface PaginatedResult<T> {
  total: number;
  items: T[];
  cached?: boolean;
}

/**
 * Generic API mutation response wrapper for UI feedback.
 */
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// 2. Authentication & User Interfaces (app/schemas/user.py)
// ============================================================================

export type UserRole = 'customer' | 'admin';

export interface UserLoginPayload {
  username: string;
  password: string;
}

export interface UserRegisterPayload {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface UserOut {
  id: number;
  username: string;
  email: string;
  role: UserRole | string;
  is_active: boolean;
  created_at?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  user: UserOut;
}

// ============================================================================
// 3. Product Catalog Interfaces (app/schemas/product.py)
// ============================================================================

export type ProductSearchMode = 'client' | 'fulltext' | 'fuzzy' | 'combined';

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category: string;
  image_url: string | null;
  relevance_score?: number | null;
  match_type?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProductListResponse {
  total: number;
  products: Product[];
  cached: boolean;
  query?: string | null;
  search_mode?: string | null;
  index_used?: string | null;
}

export interface ProductCreatePayload {
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  category: string;
}

export type ProductUpdatePayload = Partial<ProductCreatePayload>;

export type ProductSortOption = 'featured' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';
export type CatalogLayoutMode = 'grid' | 'list';
export type PaginationMode = 'numbered' | 'infinite';


// ============================================================================
// 4. Redis Shopping Cart Interfaces (app/schemas/cart.py)
// ============================================================================

export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image_url?: string | null;
}

export interface CartOut {
  user_id?: number;
  items: CartItem[];
  total_items: number;
  total_price: number;
}

export interface CartItemAddPayload {
  product_id: number;
  quantity: number;
}

export interface CartItemUpdatePayload {
  quantity: number;
}

// ============================================================================
// 5. Orders & Admin Fulfillment Interfaces (app/schemas/order.py)
// ============================================================================

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderCreatePayload {
  shipping_address: string;
}

export interface OrderStatusUpdatePayload {
  status: OrderStatus | string;
}

export interface OrderItemOut {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface OrderOut {
  id: number;
  order_number: string;
  user_id: number;
  total_amount: number;
  status: OrderStatus | string;
  shipping_address: string;
  created_at: string;
  items: OrderItemOut[];
}

export interface AdminOrderUserOut {
  id: number;
  username: string;
  email: string;
}

export interface AdminOrderOut extends OrderOut {
  user?: AdminOrderUserOut | null;
  _optimistic?: boolean;
}

// ============================================================================
// 6. Day 17: Real-Time WebSockets, Notifications & Live Chat Interfaces
// ============================================================================

export type WebSocketConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export type OrderWebSocketEventType =
  | 'CONNECTED'
  | 'ORDER_CREATED'
  | 'ORDER_STATUS_UPDATED'
  | 'SUPPORT_CHAT_NOTIFICATION'
  | 'pong'
  | 'ACK'
  | 'echo';

export interface OrderWebSocketEvent {
  event: OrderWebSocketEventType | string;
  channel?: 'orders' | 'chat' | string;
  order_id?: number;
  user_id?: number;
  order_number?: string;
  status?: OrderStatus | string;
  total_amount?: number;
  message?: string;
  room_id?: string;
  sender_name?: string;
  updated_at?: string;
  timestamp?: string;
}

export type RealtimeNotificationType = 'order_status' | 'order_created' | 'chat' | 'system';

export interface RealtimeNotification {
  id: string;
  type: RealtimeNotificationType;
  title: string;
  message: string;
  orderId?: number;
  orderNumber?: string;
  status?: OrderStatus | string;
  timestamp: string;
  read: boolean;
}

export interface ChatMessage {
  event?: 'CHAT_MESSAGE' | string;
  id: string;
  room_id: string;
  sender_id: number;
  sender_name: string;
  sender_role: UserRole | string;
  message: string;
  timestamp: string;
}

export interface ChatWebSocketEvent {
  event: 'CHAT_CONNECTED' | 'CHAT_MESSAGE' | 'pong' | string;
  channel?: 'chat' | string;
  room_id?: string;
  history?: ChatMessage[];
  id?: string;
  sender_id?: number;
  sender_name?: string;
  sender_role?: UserRole | string;
  message?: string;
  timestamp?: string;
}

export interface ChatRoomSummary {
  room_id: string;
  customer_id: number;
  customer_name: string;
  active_connections: number;
  message_count: number;
  last_message?: ChatMessage | null;
}

// ============================================================================
// 7. Day 18: Celery Background Task Lifecycle, PDF Invoices, CSV Import & N+1
// ============================================================================

export type BackgroundTaskStatus = 'IDLE' | 'PENDING' | 'STARTED' | 'COMPLETED' | 'FAILED';

export interface PdfInvoiceTaskResult {
  order_id: number;
  order_number: string;
  filename: string;
  file_size_bytes: number;
  download_url: string;
  static_url: string;
  customer_name: string;
  total_amount: number;
  items_count: number;
  generated_at: string;
}

export interface CsvImportRowError {
  row: number;
  name: string;
  error: string;
}

export interface CsvImageDownloadError {
  row: number;
  name: string;
  image_url: string;
  error: string;
}

export interface CsvImportedProductItem {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  action: 'created' | 'updated' | string;
  image_url?: string;
  saved_image_filename?: string | null;
  source_image_url?: string | null;
  image_status?: 'downloaded' | 'failed' | 'missing' | string;
  image_error?: string | null;
}

export interface CsvImportTaskResult {
  filename: string;
  total_rows: number;
  processed_rows: number;
  success_count: number;
  failure_count: number;
  image_downloaded_count?: number;
  image_failed_count?: number;
  image_missing_count?: number;
  errors: CsvImportRowError[];
  image_errors?: CsvImageDownloadError[];
  imported_products: CsvImportedProductItem[];
  completed_at?: string;
}

export interface BackgroundTaskResponse<TResult = unknown> {
  task_id: string;
  status: 'PENDING' | 'STARTED' | 'COMPLETED' | 'FAILED' | string;
  celery_state: string;
  task_type: 'pdf_invoice' | 'csv_import' | string;
  progress: number;
  stage: string;
  result?: TResult | null;
  error?: string | null;
  updated_at?: string;
}

export interface N1OptimizationBenchmark {
  orders_inspected: number;
  unoptimized_lazy_loading: {
    strategy: string;
    sql_queries_executed: number;
    formula: string;
    sample_sql: string[];
  };
  optimized_eager_loading: {
    strategy: string;
    sql_queries_executed: number;
    formula: string;
    sample_sql: string[];
  };
  queries_saved: number;
  reduction_percentage: number;
}

