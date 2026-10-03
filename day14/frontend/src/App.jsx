import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/toast';
import Layout from './pages/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

// Day 14: Route-Level Code Splitting via React.lazy()
const HomePage = lazy(() => import('./pages/HomePage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AdminOrdersPage = lazy(() => import('./pages/AdminOrdersPage'));
const PerformanceAuditPage = lazy(() => import('./pages/PerformanceAuditPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export function App() {
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
                    {/* Nested Application Layout */}
                    <Route path="/" element={<Layout />}>
                      {/* Public Browsing Routes */}
                      <Route index element={<HomePage />} />
                      <Route path="products/:id" element={<ProductDetailPage />} />
                      <Route path="performance" element={<PerformanceAuditPage />} />
                      <Route path="login" element={<LoginPage />} />
                      <Route path="register" element={<RegisterPage />} />

                      {/* Protected Route (Guarded by ProtectedRoute and JWT Token) */}
                      <Route
                        path="profile"
                        element={
                          <ProtectedRoute>
                            <ProfilePage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Admin Orders Dashboard (Guarded for role === 'admin') */}
                      <Route
                        path="admin/orders"
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <AdminOrdersPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* 404 Fallback */}
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
}

export default App;
