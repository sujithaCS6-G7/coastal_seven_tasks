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

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category: string;
  image_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProductListResponse {
  total: number;
  products: Product[];
  cached: boolean;
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
