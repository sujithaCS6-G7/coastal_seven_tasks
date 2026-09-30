import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productService } from '../api/productService';
import { cartService } from '../api/cartService';
import { getErrorMessage } from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * Product Detail Page demonstrating useParams, controlled quantity input, and API integration.
 */
const ProductDetailPage = () => {
  // useParams from React Router v6
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // Admin edit and image upload state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', price: '', stock: '', category: '', description: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const backendBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productService.getProductById(id);
      setProduct(data);
      setEditForm({
        name: data.name,
        price: data.price,
        stock: data.stock,
        category: data.category || 'General',
        description: data.description || '',
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const updated = await productService.updateProduct(id, {
        name: editForm.name.trim(),
        price: parseFloat(editForm.price),
        stock: parseInt(editForm.stock, 10),
        category: editForm.category.trim(),
        description: editForm.description.trim(),
      });
      setProduct(updated);
      setIsEditing(false);
      setSuccessMsg('✓ Product details updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert(`Update failed: ${getErrorMessage(err)}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleImageUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select an image file first.');
      return;
    }
    setUploading(true);
    try {
      const updated = await productService.uploadImage(id, selectedFile);
      setProduct(updated);
      setSelectedFile(null);
      setSuccessMsg('✓ Product image optimized and updated via Pillow!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert(`Image upload failed: ${getErrorMessage(err)}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${product.name}"?`)) {
      return;
    }
    try {
      await productService.deleteProduct(id);
      alert(`Product "${product.name}" deleted.`);
      navigate('/');
    } catch (err) {
      alert(`Delete failed: ${getErrorMessage(err)}`);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/products/${id}` } } });
      return;
    }

    setAdding(true);
    setSuccessMsg(null);
    try {
      await cartService.addToCart(product.id, quantity);
      setSuccessMsg(`✓ Added ${quantity} item(s) to your cart!`);
    } catch (err) {
      alert(`Could not add to cart: ${getErrorMessage(err)}`);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading product details..." />;
  }

  if (error || !product) {
    return (
      <div className="form-card" style={{ maxWidth: '600px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)', marginBottom: '12px' }}>Product Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{error || 'The requested product does not exist.'}</p>
        <Link to="/" className="btn btn-primary">
          Back to Catalog
        </Link>
      </div>
    );
  }

  const isOutOfStock = product.stock <= 0;
  const imageUrl = product.image_url
    ? product.image_url.startsWith('http')
      ? product.image_url
      : `${backendBaseUrl}${product.image_url}`
    : null;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <Link to="/" className="nav-link" style={{ display: 'inline-flex', marginBottom: '20px', padding: '6px 0' }}>
        &larr; Back to Products
      </Link>

      {successMsg && (
        <div className="form-success" style={{ marginBottom: '20px', textAlign: 'center', fontWeight: 600 }}>
          {successMsg} <Link to="/cart" style={{ color: '#15803d', textDecoration: 'underline', marginLeft: '8px' }}>View Cart &rarr;</Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', background: 'var(--bg-card)', padding: '32px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        {/* Product Image */}
        <div style={{ height: '340px', background: '#f8fafc', borderRadius: 'var(--radius)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ fontSize: '5rem', color: '#94a3b8' }}>📦</div>
          )}
        </div>

        {/* Product Details & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="product-category" style={{ fontSize: '0.85rem' }}>{product.category || 'General'}</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '8px 0 12px' }}>{product.name}</h1>

          <div className="product-price" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '16px' }}>
            ${Number(product.price).toFixed(2)}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <span className={`stock-tag ${isOutOfStock ? 'stock-out' : 'stock-in'}`} style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
              {isOutOfStock ? 'Out of Stock' : `Available Inventory: ${product.stock} units`}
            </span>
          </div>

          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '24px', flex: 1 }}>
            {product.description || 'No description provided.'}
          </p>

          {/* Controlled Quantity Input and Add to Cart */}
          {!isOutOfStock && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <label htmlFor="qty" style={{ fontWeight: 600, fontSize: '0.9rem' }}>Quantity:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px' }}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <input
                  id="qty"
                  type="number"
                  min="1"
                  max={product.stock}
                  className="form-input"
                  style={{ width: '70px', textAlign: 'center', padding: '6px 8px' }}
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setQuantity(Math.min(product.stock, Math.max(1, val)));
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px' }}
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock}
                >
                  +
                </button>
              </div>
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
            disabled={isOutOfStock || adding}
            onClick={handleAddToCart}
          >
            {adding ? 'Adding to Cart...' : isOutOfStock ? 'Sold Out' : '🛒 Add to Shopping Cart'}
          </button>
        </div>
      </div>

      {/* Admin Operations Card (Visible only to Admin users) */}
      {isAdmin && (
        <div style={{ marginTop: '32px', background: '#f8fafc', border: '2px solid #059669', borderRadius: 'var(--radius)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #cbd5e1', paddingBottom: '12px' }}>
            <h2 style={{ fontSize: '1.25rem', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚙️</span> <span>Admin Product Controls</span>
            </h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                {isEditing ? '✕ Cancel Edit' : '✏️ Edit Details'}
              </button>
              <button
                onClick={handleDeleteProduct}
                className="btn btn-danger"
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                🗑️ Delete Product
              </button>
            </div>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <form onSubmit={handleUpdateProduct} style={{ marginBottom: '24px', background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: '#334155' }}>Update Specifications</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Category</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="form-input"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Inventory Stock</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="form-input"
                    value={editForm.stock}
                    onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Description</label>
                <textarea
                  rows="2"
                  className="form-input"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={savingEdit} style={{ background: '#059669', padding: '8px 16px' }}>
                {savingEdit ? 'Saving Changes...' : 'Save Product Changes'}
              </button>
            </form>
          )}

          {/* Pillow Image Upload Form */}
          <form onSubmit={handleImageUpload} style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '6px', color: '#334155' }}>Upload New Product Image (Pillow WebP Optimizer)</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>
              Select a JPEG, PNG, or WebP image. The server will resize and compress it to high-performance WebP.
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                className="form-input"
                style={{ width: 'auto', padding: '6px' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={uploading || !selectedFile}
                style={{ padding: '8px 16px', background: '#3b82f6' }}
              >
                {uploading ? 'Optimizing & Uploading...' : 'Upload Image'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
