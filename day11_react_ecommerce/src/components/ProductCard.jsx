import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Reusable ProductCard component showcasing Props, Conditional Rendering, and JSX.
 */
const ProductCard = ({ product, onAddToCart, isAdding = false, isAdmin = false, onDelete }) => {
  const isOutOfStock = product.stock <= 0;
  const backendBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Construct absolute image URL if product.image_url is relative
  const imageUrl = product.image_url
    ? product.image_url.startsWith('http')
      ? product.image_url
      : `${backendBaseUrl}${product.image_url}`
    : null;

  return (
    <div className="product-card" style={{ position: 'relative' }}>
      {/* Admin Action Badge and Controls */}
      {isAdmin && (
        <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10, display: 'flex', gap: '6px' }}>
          <button
            onClick={(e) => onDelete && onDelete(product.id, product.name, e)}
            className="btn btn-danger"
            title="Delete Product (Admin)"
            style={{ padding: '3px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
          >
            🗑️ Delete
          </button>
        </div>
      )}

      <Link to={`/products/${product.id}`} className="product-image-wrap">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="product-image"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="product-image-fallback"
          style={{ display: imageUrl ? 'none' : 'flex' }}
        >
          📦
        </div>
      </Link>

      <div className="product-info">
        <span className="product-category">{product.category || 'General'}</span>
        <Link to={`/products/${product.id}`} className="product-title">
          {product.name}
        </Link>
        <p className="product-description">{product.description || 'No description available.'}</p>

        <div className="product-price-row">
          <div>
            <div className="product-price">${Number(product.price).toFixed(2)}</div>
            {/* Conditional Rendering based on inventory */}
            <span className={`stock-tag ${isOutOfStock ? 'stock-out' : 'stock-in'}`}>
              {isOutOfStock ? 'Out of Stock' : `${product.stock} in stock`}
            </span>
          </div>

          <button
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            disabled={isOutOfStock || isAdding}
            onClick={(e) => onAddToCart(product, e)}
          >
            {isAdding ? 'Adding...' : isOutOfStock ? 'Sold Out' : '🛒 Add'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
