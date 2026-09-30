import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartService } from '../api/cartService';
import { getErrorMessage } from '../api/axiosClient';
import LoadingSpinner from '../components/LoadingSpinner';

const CartPage = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total_items: 0, total_price: 0 });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cartService.getCart();
      setCart(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (productId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(productId);
      return;
    }

    setUpdatingId(productId);
    try {
      const updated = await cartService.updateQuantity(productId, newQuantity);
      setCart(updated);
    } catch (err) {
      alert(`Could not update quantity: ${getErrorMessage(err)}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveItem = async (productId) => {
    setUpdatingId(productId);
    try {
      const updated = await cartService.removeItem(productId);
      setCart(updated);
    } catch (err) {
      alert(`Could not remove item: ${getErrorMessage(err)}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm('Are you sure you want to empty your cart?')) return;
    try {
      await cartService.clearCart();
      setCart({ items: [], total_items: 0, total_price: 0 });
    } catch (err) {
      alert(`Could not clear cart: ${getErrorMessage(err)}`);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving your Redis shopping cart..." />;
  }

  if (error) {
    return (
      <div className="form-card" style={{ maxWidth: '600px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)', marginBottom: '12px' }}>Cart Error</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{error}</p>
        <button onClick={fetchCart} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const isEmpty = !cart.items || cart.items.length === 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Shopping Cart</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Stored in Redis with high performance and 24-hour expiration
          </p>
        </div>

        {!isEmpty && (
          <button onClick={handleClearCart} className="btn btn-danger" style={{ fontSize: '0.85rem' }}>
            🗑️ Clear Cart
          </button>
        )}
      </div>

      {isEmpty ? (
        <div style={{ background: 'var(--bg-card)', padding: '60px 20px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
          <p style={{ fontSize: '3rem', marginBottom: '16px' }}>🛒</p>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Your cart is empty</h2>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 24px' }}>Looks like you haven't added any products to your cart yet.</p>
          <Link to="/" className="btn btn-primary" style={{ padding: '10px 24px' }}>
            Explore Products
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          {/* Items Table */}
          <div className="table-wrap" style={{ marginTop: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th style={{ textAlign: 'center' }}>Quantity</th>
                  <th>Subtotal</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map((item) => (
                  <tr key={item.product_id}>
                    <td>
                      <Link to={`/products/${item.product_id}`} style={{ fontWeight: 600, color: 'var(--text-main)', textDecoration: 'none' }}>
                        {item.name}
                      </Link>
                    </td>
                    <td>${Number(item.price).toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '0.85rem' }}
                          onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                          disabled={updatingId === item.product_id}
                        >
                          -
                        </button>
                        <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 600 }}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '0.85rem' }}
                          onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                          disabled={updatingId === item.product_id}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>${Number(item.subtotal).toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleRemoveItem(item.product_id)}
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        disabled={updatingId === item.product_id}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cart Summary */}
          <div className="summary-card">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>Order Summary</h2>
            <div className="summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Total Items:</span>
              <span style={{ fontWeight: 600 }}>{cart.total_items}</span>
            </div>
            <div className="summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Estimated Shipping:</span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>FREE</span>
            </div>
            <div className="summary-row summary-total">
              <span>Total Price:</span>
              <span style={{ color: 'var(--primary)' }}>${Number(cart.total_price).toFixed(2)}</span>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '20px', padding: '12px', fontSize: '1rem' }}
            >
              Proceed to Checkout &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
