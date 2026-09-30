import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService } from '../api/productService';
import { cartService } from '../api/cartService';
import { getErrorMessage } from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';

const HomePage = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  // State Management with useState
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cached, setCached] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Admin New Product Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newProd, setNewProd] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: 'Peripherals',
  });

  // useRef to manage search input focus
  const searchInputRef = useRef(null);

  // useEffect to fetch catalog when selectedCategory changes
  useEffect(() => {
    fetchProducts(selectedCategory);
  }, [selectedCategory]);

  const fetchProducts = async (category) => {
    setLoading(true);
    setError(null);
    try {
      const data = await productService.getProducts(category);
      setProducts(data.products || []);
      setCached(Boolean(data.cached));

      // Extract unique categories dynamically from products
      if (category === 'All' && data.products) {
        const unique = ['All', ...new Set(data.products.map((p) => p.category).filter(Boolean))];
        setCategories(unique);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Event handler for Adding to Cart
  const handleAddToCart = async (product, e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/' } } });
      return;
    }

    setAddingId(product.id);
    try {
      await cartService.addToCart(product.id, 1);
      setToastMessage(`✓ Added "${product.name}" to your cart!`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      alert(`Could not add to cart: ${getErrorMessage(err)}`);
    } finally {
      setAddingId(null);
    }
  };

  // Admin Event Handler for creating a new product
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProd.name || !newProd.price || !newProd.stock) {
      alert('Please fill in product name, price, and stock.');
      return;
    }
    setCreateLoading(true);
    try {
      await productService.createProduct({
        name: newProd.name.trim(),
        description: newProd.description.trim(),
        price: parseFloat(newProd.price),
        stock: parseInt(newProd.stock, 10),
        category: newProd.category.trim() || 'General',
      });
      setToastMessage(`✓ Product "${newProd.name}" created successfully!`);
      setTimeout(() => setToastMessage(null), 4000);
      setShowAddForm(false);
      setNewProd({ name: '', description: '', price: '', stock: '', category: 'Peripherals' });
      fetchProducts(selectedCategory);
    } catch (err) {
      alert(`Failed to create product: ${getErrorMessage(err)}`);
    } finally {
      setCreateLoading(false);
    }
  };

  // Admin Event Handler for deleting a product
  const handleDeleteProduct = async (productId, productName, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${productName}" (ID: ${productId})?`)) {
      return;
    }
    try {
      await productService.deleteProduct(productId);
      setToastMessage(`✓ Product "${productName}" deleted successfully!`);
      setTimeout(() => setToastMessage(null), 3000);
      fetchProducts(selectedCategory);
    } catch (err) {
      alert(`Could not delete product: ${getErrorMessage(err)}`);
    }
  };

  // Focus search input using useRef
  const handleClearSearch = () => {
    setSearchQuery('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Filter products based on search query (controlled input)
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
  });

  return (
    <div>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="form-success" style={{ textAlign: 'center', fontWeight: 600 }}>
          {toastMessage}
        </div>
      )}

      {/* Header and Search Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Product Catalog</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            FastAPI Backend with Redis Cache-Aside {cached && <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>⚡ Cached in Redis</span>}
          </p>
        </div>

        {/* Search input and Admin Add button */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            ref={searchInputRef}
            type="text"
            className="form-input"
            style={{ width: '220px', padding: '8px 12px' }}
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={handleClearSearch} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
              Clear
            </button>
          )}

          {/* Admin-only Add Product Trigger Button */}
          {isAdmin && (
            <button
              onClick={() => setShowAddForm((prev) => !prev)}
              className="btn btn-primary"
              style={{ padding: '8px 14px', background: showAddForm ? '#475569' : '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>{showAddForm ? '✕ Close' : '➕ Add Product'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin New Product Creation Form Panel (Conditional Rendering) */}
      {isAdmin && showAddForm && (
        <div style={{ background: '#f8fafc', border: '2px dashed #059669', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '14px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🛠️</span> <span>Create New Product (Admin Portal)</span>
          </h3>
          <form onSubmit={handleCreateProduct}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wireless Mouse"
                  className="form-input"
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Category *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Peripherals"
                  className="form-input"
                  value={newProd.category}
                  onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Price ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 49.99"
                  className="form-input"
                  value={newProd.price}
                  onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Initial Stock *</label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 30"
                  className="form-input"
                  value={newProd.stock}
                  onChange={(e) => setNewProd({ ...newProd, stock: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Description</label>
              <textarea
                rows="2"
                placeholder="Product description and technical specifications..."
                className="form-input"
                value={newProd.description}
                onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createLoading}
                style={{ background: '#059669', padding: '8px 18px' }}
              >
                {createLoading ? 'Creating...' : '✓ Publish Product'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAddForm(false)}
                style={{ padding: '8px 14px' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Filter Pills (List Rendering) */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', borderRadius: '9999px', fontSize: '0.85rem' }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Conditional Rendering: Loading, Error, or Products Grid */}
      {loading ? (
        <LoadingSpinner message="Loading products from FastAPI..." />
      ) : error ? (
        <div className="form-error">
          <p><strong>Error loading catalog:</strong> {error}</p>
          <button onClick={() => fetchProducts(selectedCategory)} className="btn btn-primary" style={{ marginTop: '10px', padding: '6px 12px' }}>
            Retry
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '2.5rem' }}>🔍</p>
          <h3 style={{ marginTop: '12px' }}>No products found</h3>
          <p style={{ marginTop: '6px' }}>Try searching for a different keyword or category.</p>
        </div>
      ) : (
        /* List Rendering of ProductCard components */
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              isAdding={addingId === product.id}
              isAdmin={isAdmin}
              onDelete={handleDeleteProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;
