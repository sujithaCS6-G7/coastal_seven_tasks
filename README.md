# ⚛️ Day 11 – React Fundamentals, Hooks & Router Integration

A production-grade, multi-page E-Commerce React frontend built with **React 18**, **React Router v6**, and **Axios Service Layer with Interceptors**, fully integrated with the **Day 10 FastAPI backend** (`http://localhost:8000`).

---

## 🌟 Architecture & Core Features

```mermaid
flowchart TD
    User["Browser Client (:5173)"] --> ReactRouter["React Router v6 (<Layout />)"]
    
    subgraph PublicRoutes ["Public Routes"]
        Home["HomePage (/)"]
        Detail["ProductDetailPage (/products/:id)"]
        Login["LoginPage (/login)"]
        Register["RegisterPage (/register)"]
    end
    
    subgraph ProtectedRoutes ["Protected Routes (<ProtectedRoute />)"]
        Cart["CartPage (/cart)"]
        Checkout["CheckoutPage (/checkout)"]
        Orders["OrdersPage (/orders)"]
        OrderDetail["OrderDetailPage (/orders/:id)"]
    end
    
    ReactRouter --> PublicRoutes
    ReactRouter --> ProtectedRoutes
    
    PublicRoutes --> AxiosClient["Central Axios Client (:8000)"]
    ProtectedRoutes --> AxiosClient
    
    AxiosClient -->|Request Interceptor (Bearer JWT)| FastAPI["FastAPI Backend Gateway"]
    FastAPI -->|Response Interceptor (401 Handler)| AxiosClient
```

---

## 📁 Day 11 Folder Structure

```text
day11_react_ecommerce/
├── index.html                   # HTML entrypoint
├── package.json                 # Dependencies & scripts
├── vite.config.js               # Vite build tool configuration
├── .env                         # VITE_API_URL=http://localhost:8000
├── .gitignore                   # Ignore node_modules, dist, logs
├── dist/                        # Production optimized build output
├── src/
│   ├── main.jsx                 # React root renderer (StrictMode)
│   ├── App.jsx                  # React Router v6 routes & ProtectedRoute setup
│   ├── index.css                # Global clean styling & component layout
│   ├── api/
│   │   ├── axiosClient.js       # Central Axios instance + Request & Response Interceptors
│   │   ├── authService.js       # Login, Register, Profile (/auth/me)
│   │   ├── productService.js    # Catalog list (Redis cached) & details
│   │   ├── cartService.js       # Redis shopping cart CRUD operations
│   │   └── orderService.js      # Checkout, order history & order details
│   ├── context/
│   │   └── AuthContext.jsx      # Global auth state, JWT token management & session restoration
│   ├── components/
│   │   ├── Navbar.jsx           # Responsive header, dynamic cart link, user badge & logout
│   │   ├── Footer.jsx           # Clean footer component
│   │   ├── ProtectedRoute.jsx   # Route guard redirecting unauthenticated users to /login
│   │   ├── ProductCard.jsx      # Reusable product card (props, conditional stock, add button)
│   │   └── LoadingSpinner.jsx   # Reusable loading spinner
│   └── pages/
│       ├── Layout.jsx           # Nested route wrapper using React Router v6 <Outlet />
│       ├── HomePage.jsx         # Product catalog, category filter pills, search with useRef
│       ├── ProductDetailPage.jsx# Single product view with useParams & controlled quantity input
│       ├── CartPage.jsx         # Full cart management, line items, totals & clear cart
│       ├── CheckoutPage.jsx     # Shipping address form (controlled input) & atomic order placement
│       ├── OrdersPage.jsx       # Order history with status badges & refresh button
│       ├── OrderDetailPage.jsx  # Single order breakdown with line items & shipping details
│       ├── LoginPage.jsx        # Login form with controlled inputs & useRef auto-focus
│       ├── RegisterPage.jsx     # Registration form with controlled inputs & validation
│       └── NotFoundPage.jsx     # 404 Not Found fallback view
└── README.md                    # Project documentation
```

---

## 🛠️ Verification of Day 11 Requirements

### 1. React Fundamentals
- **Components**: Modular hierarchy (`Navbar`, `Footer`, `ProductCard`, `LoadingSpinner`, `ProtectedRoute`, `Layout`, page views).
- **JSX**: Semantic, accessible markup throughout.
- **Props**: `ProductCard` receives `product`, `onAddToCart`, and `isAdding`; `LoadingSpinner` receives `message`; `ProtectedRoute` receives `children`.
- **Component Composition**: `<Layout />` composes `<Navbar />`, `<Outlet />`, and `<Footer />`; `<HomePage />` composes multiple `<ProductCard />` instances.
- **Conditional Rendering**:
  - Navbar renders user greeting + logout when authenticated vs Login/Register when unauthenticated.
  - "In Stock" vs "Out of Stock" badges on products.
  - Empty cart placeholder vs populated cart items table.
  - Loading spinners and error alerts.
- **List Rendering**:
  - `products.map(...)` rendering catalog items.
  - `categories.map(...)` rendering filter pills.
  - `cart.items.map(...)` rendering cart table rows.
  - `orders.map(...)` rendering order history cards.
  - `order.items.map(...)` rendering order line item breakdown.

### 2. React Hooks
- **`useState`**:
  - `AuthContext`: `user`, `token`, `loading`.
  - `HomePage`: `products`, `categories`, `selectedCategory`, `searchQuery`, `loading`, `error`, `toastMessage`.
  - `ProductDetailPage`: `product`, `quantity`, `loading`, `adding`, `successMsg`.
  - `CartPage`: `cart`, `loading`, `updatingId`.
  - `CheckoutPage`: `shippingAddress`, `submitting`, `error`.
  - `OrdersPage`: `orders`, `loading`.
  - `LoginPage` & `RegisterPage`: `username`, `email`, `password`, `loading`, `error`.
- **`useEffect`**:
  - `AuthContext`: Restores active user session on app mount via `GET /auth/me`.
  - `HomePage`: Re-fetches catalog whenever `selectedCategory` changes.
  - `ProductDetailPage`: Fetches product whenever route param `:id` changes.
  - `CartPage` & `OrdersPage`: Fetches cart and orders on mount.
- **`useRef`**:
  - `HomePage`: `searchInputRef` to focus or clear search input.
  - `LoginPage` & `RegisterPage`: `usernameRef` to auto-focus username input on load.
  - `CheckoutPage`: `addressRef` to auto-focus the shipping address textarea.
- **Controlled Inputs**:
  - Search filter input in `HomePage`.
  - Quantity numerical input in `ProductDetailPage`.
  - Shipping address textarea in `CheckoutPage`.
  - Username, email, and password inputs in `LoginPage` and `RegisterPage`.
- **Event Handling**:
  - `onSubmit` with `e.preventDefault()` for forms.
  - `onClick` for category selection, quantity adjustments, item removals, cart clearing, and logout.

### 3. React Router v6
- **Nested Routing & `<Outlet />`**: Root `<Layout />` contains top navigation and renders child routes via `<Outlet />`.
- **`useParams`**:
  - `ProductDetailPage`: `const { id } = useParams()`
  - `OrderDetailPage`: `const { orderId } = useParams()`
- **`useNavigate`**:
  - Programmatic redirection after login to intended target route.
  - Programmatic navigation after checkout to `/orders/:orderId`.
  - Redirection after logout to `/login`.
- **`useLocation`**: Passes `{ from: location }` state so users return to their previous page after logging in.

### 4. Axios Service Layer & Interceptors
- **Central Instance (`src/api/axiosClient.js`)**: Base URL configured to `http://localhost:8000`.
- **Request Interceptor**: Automatically attaches `Authorization: Bearer <token>` from `localStorage` on all API calls.
- **Response Interceptor**: Catches `401 Unauthorized` errors, purges expired tokens, and dispatches global `auth:unauthorized` session termination.
- **Service Modules**:
  - `authService.js`: `register`, `login`, `getMe`.
  - `productService.js`: `getProducts`, `getProductById`.
  - `cartService.js`: `getCart`, `addToCart`, `updateQuantity`, `removeItem`, `clearCart`.
  - `orderService.js`: `checkout`, `getMyOrders`, `getOrderById`.

### 5. Protected Routes
- **`src/components/ProtectedRoute.jsx`**:
  - Unauthenticated visitors attempting to view `/cart`, `/checkout`, `/orders`, or `/orders/:id` are automatically redirected to `/login`.
  - Destination route is remembered in `location.state.from`.

---

## 🚀 Running the Project

### 1. Start the FastAPI Backend (Port 8000)
```powershell
cd E:\PYTHON\day10_ecommerce
uv run uvicorn app.main:app --reload --port 8000
```
- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Start the React Frontend (Port 5173)
```powershell
cd E:\PYTHON\day11_react_ecommerce
npm run dev
```
- Frontend Store: [http://localhost:5173/](http://localhost:5173/)

### 3. Build for Production
```powershell
npm run build
```
*(Produces optimized assets in `dist/` in ~3 seconds).*
