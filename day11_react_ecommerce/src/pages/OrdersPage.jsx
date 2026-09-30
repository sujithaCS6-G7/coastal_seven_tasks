import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../api/orderService';
import { getErrorMessage } from '../api/axiosClient';
import LoadingSpinner from '../components/LoadingSpinner';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orderService.getMyOrders();
      setOrders(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Fetching your order history from PostgreSQL..." />;
  }

  if (error) {
    return (
      <div className="form-card" style={{ maxWidth: '600px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)', marginBottom: '12px' }}>Could Not Load Orders</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{error}</p>
        <button onClick={fetchOrders} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>My Orders</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Purchase records persisted in PostgreSQL database (day10_db)
          </p>
        </div>

        <button onClick={fetchOrders} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
          🔄 Refresh
        </button>
      </div>

      {orders.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', padding: '60px 20px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
          <p style={{ fontSize: '3rem', marginBottom: '16px' }}>📦</p>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>No orders placed yet</h2>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 24px' }}>
            When you purchase items from the catalog, your tracking history will appear here.
          </p>
          <Link to="/" className="btn btn-primary">
            Start Shopping
          </Link>
        </div>
      ) : (
        /* List rendering of orders */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map((order) => {
            const dateStr = new Date(order.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={order.id}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', boxShadow: 'var(--shadow)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{order.order_number}</span>
                    <span className={`status-badge status-${order.status}`}>{order.status}</span>
                  </div>

                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px' }}>
                    Placed on: {dateStr}
                  </p>

                  <p style={{ fontSize: '0.9rem' }}>
                    <strong>Items:</strong> {order.items?.length || 0} product(s) &bull;{' '}
                    <strong>Total:</strong> ${Number(order.total_amount).toFixed(2)}
                  </p>
                </div>

                <div>
                  <Link to={`/orders/${order.id}`} className="btn btn-secondary">
                    View Order Details &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
