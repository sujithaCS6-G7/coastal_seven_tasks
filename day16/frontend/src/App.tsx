import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/toast';
import Layout from './pages/Layout';
import HomePage from './pages/HomePage';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderHistoryPage = lazy(() => import('./pages/OrderHistoryPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminOrdersPage = lazy(() => import('./pages/AdminOrdersPage'));
const PerformanceAuditPage = lazy(() => import('./pages/PerformanceAuditPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <CartProvider>
                <Suspense
                  fallback={
                    <div className="min-h-[60vh] flex items-center justify-center">
                      <LoadingSpinner text="Loading split route chunk..." />
                    </div>
                  }
                >
                  <Routes>
                    <Route path="/" element={<Layout />}>
                      <Route index element={<HomePage />} />
                      <Route path="products/:id" element={<ProductDetailPage />} />
                      <Route path="performance" element={<PerformanceAuditPage />} />
                      <Route path="login" element={<LoginPage />} />
                      <Route path="register" element={<RegisterPage />} />

                      <Route
                        path="checkout"
                        element={
                          <ProtectedRoute>
                            <CheckoutPage />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="orders"
                        element={
                          <ProtectedRoute>
                            <OrderHistoryPage />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="profile"
                        element={
                          <ProtectedRoute>
                            <ProfilePage />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="admin"
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <AdminDashboardPage />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="admin/orders"
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <AdminOrdersPage />
                          </ProtectedRoute>
                        }
                      />

                      <Route path="*" element={<NotFoundPage />} />
                    </Route>
                  </Routes>
                </Suspense>
              </CartProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
