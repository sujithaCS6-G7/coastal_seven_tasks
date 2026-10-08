import React, { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Component-level Code Splitting for Drawers, Modals & Live Chat
const CartDrawer = lazy(() => import('../components/CartDrawer'));
const CheckoutModal = lazy(() => import('../components/CheckoutModal'));
const OrderSuccessModal = lazy(() => import('../components/OrderSuccessModal'));
const LiveChatWidget = lazy(() => import('../components/LiveChatWidget'));

export const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <Navbar />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <Footer />

      {/* Lazy-Loaded Global Shopping Modals, Drawers & Live Support Chat */}
      <Suspense fallback={null}>
        <CartDrawer />
        <CheckoutModal />
        <OrderSuccessModal />
        <LiveChatWidget mode="floating" />
      </Suspense>
    </div>
  );
};

export default Layout;
