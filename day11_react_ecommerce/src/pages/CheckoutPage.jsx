import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { orderService } from '../api/orderService';
import { cartService } from '../api/cartService';
import { getErrorMessage } from '../api/axiosClient';
import LoadingSpinner from '../components/LoadingSpinner';

const CheckoutPage = () => {
  const navigate = useNavigate();

  // Controlled input for shipping address
  const [shippingAddress, setShippingAddress] = useState(
    'Beach Road, MVP Colony, Visakhapatnam, AP, 530017'
  );
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // useRef to focus shipping address textarea on mount
  const addressRef = useRef(null);

  useEffect(() => {
    const loadCart = async () => {
      try {
        const data = await cartService.getCart();
        setCart(data);
        if (!data.items || data.items.length === 0) {
          navigate('/cart');
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    loadCart();

    if (addressRef.current) {
      addressRef.current.focus();
    }
  }, [navigate]);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!shippingAddress.trim()) {
      setError('Please provide a valid shipping address.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // Calls FastAPI POST /orders/checkout
      const order = await orderService.checkout(shippingAddress.trim());
      // Navigate to order details with created order
      navigate(`/orders/${order.id}`, { state: { justPlaced: true } });
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Validating cart items for checkout..." />;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Link to="/cart" className="nav-link" style={{ display: 'inline-flex', marginBottom: '16px', padding: '6px 0' }}>
        &larr; Back to Shopping Cart
      </Link>

      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '8px' }}>Checkout Order</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
        Atomic PostgreSQL stock deduction & Celery order confirmation email
      </p>

      {error && <div className="form-error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
        {/* Shipping Form */}
        <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>Delivery Address</h2>

          <form onSubmit={handleSubmitOrder}>
            <div className="form-group">
              <label htmlFor="address" className="form-label">
                Full Street & Delivery Address:
              </label>
              <textarea
                id="address"
                ref={addressRef}
                rows={4}
                className="form-textarea"
                placeholder="Enter street, apartment, city, state, postal code..."
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius)', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              ℹ️ Clicking Place Order will deduct PostgreSQL stock atomically, enqueue a Celery confirmation email, and push an update over WebSockets.
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
              disabled={submitting}
            >
              {submitting ? 'Placing Order...' : `Confirm & Place Order ($${Number(cart?.total_price || 0).toFixed(2)})`}
            </button>
          </form>
        </div>

        {/* Order Preview */}
        <div className="summary-card">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>Cart Items ({cart?.total_items})</h2>

          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '16px' }}>
            {cart?.items.map((item) => (
              <div key={item.product_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '10px' }}>
                <div>
                  <strong>{item.name}</strong> &times; {item.quantity}
                </div>
                <span>${Number(item.subtotal).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="summary-row summary-total">
            <span>Total Payable:</span>
            <span style={{ color: 'var(--primary)' }}>${Number(cart?.total_price || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
