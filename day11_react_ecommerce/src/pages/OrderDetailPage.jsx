import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { orderService } from '../api/orderService';
import { getErrorMessage } from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const isJustPlaced = Boolean(location.state?.justPlaced);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState(null);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orderService.getOrderById(orderId);
      setOrder(data);
      setSelectedStatus(data.status);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selectedStatus || selectedStatus === order.status) return;
    setUpdatingStatus(true);
    try {
      const updated = await orderService.updateOrderStatus(orderId, selectedStatus);
      setOrder(updated);
      setStatusSuccess(`✓ Order status updated to "${selectedStatus}"!`);
      setTimeout(() => setStatusSuccess(null), 3000);
    } catch (err) {
      alert(`Status update failed: ${getErrorMessage(err)}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving order details..." />;
  }

  if (error || !order) {
    return (
      <div className="form-card" style={{ maxWidth: '600px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)', marginBottom: '12px' }}>Order Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{error || 'Unable to find this order.'}</p>
        <Link to="/orders" className="btn btn-primary">
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <Link to="/orders" className="nav-link" style={{ display: 'inline-flex', marginBottom: '16px', padding: '6px 0' }}>
        &larr; Back to All Orders
      </Link>

      {/* Success banner if redirected immediately from checkout */}
      {isJustPlaced && (
        <div className="form-success" style={{ marginBottom: '24px', textAlign: 'center' }}>
          🎉 <strong>Order Placed Successfully!</strong> Celery has queued your confirmation email and inventory has been deducted atomically.
        </div>
      )}

      {/* Order Header Card */}
      <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Order #{order.order_number}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              Created: {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <div>
            <span className={`status-badge status-${order.status}`} style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
              Status: {order.status}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Shipping Address</h3>
            <p style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>{order.shipping_address}</p>
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Payment Summary</h3>
            <p style={{ fontSize: '0.95rem' }}>
              <strong>Total Billed:</strong> <span style={{ color: 'var(--primary)', fontWeight: 700 }}>${Number(order.total_amount).toFixed(2)}</span>
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--success)', marginTop: '4px' }}>✓ Paid / Confirmed</p>
          </div>
        </div>

        {/* Admin Order Status Update Panel (Only visible to Admin) */}
        {isAdmin && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#065f46', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚙️</span> <span>Admin Order Lifecycle Management</span>
            </h3>
            {statusSuccess && (
              <div className="form-success" style={{ padding: '6px 12px', fontSize: '0.85rem', marginBottom: '10px' }}>
                {statusSuccess}
              </div>
            )}
            <form onSubmit={handleStatusUpdate} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label htmlFor="order-status-select" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Change Lifecycle Status:</label>
              <select
                id="order-status-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="form-input"
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
              >
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="SHIPPED">SHIPPED</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
              <button
                type="submit"
                disabled={updatingStatus || selectedStatus === order.status}
                className="btn btn-primary"
                style={{ padding: '6px 14px', fontSize: '0.85rem', background: '#059669' }}
              >
                {updatingStatus ? 'Updating...' : 'Update Status'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Ordered Items Table */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>Items Purchased</h2>
      <div className="table-wrap" style={{ marginTop: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Unit Price</th>
              <th style={{ textAlign: 'center' }}>Quantity</th>
              <th style={{ textAlign: 'right' }}>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                <td>${Number(item.unit_price).toFixed(2)}</td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>${Number(item.total_price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderDetailPage;
