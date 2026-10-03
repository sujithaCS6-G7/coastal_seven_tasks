import React, { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardFooter } from './ui/card';
import { Package, ArrowRight, Eye, Edit3, Trash2, Shield, ShoppingCart, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Day 14: Memoized ProductCard Component (React.memo + useCallback + Lazy Image Optimization)
 * Prevents unnecessary re-renders during search/filter/scroll updates and eliminates CLS.
 */
const ProductCardBase = ({ product, layout = 'grid', onEdit, onDelete }) => {
  const { user } = useAuth();
  const { addToCart, buyNow } = useCart();
  const isAdmin = user?.role === 'admin';

  const isOutOfStock = product.stock <= 0;
  const backendBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const imageUrl = product.image_url
    ? product.image_url.startsWith('http')
      ? product.image_url
      : `${backendBaseUrl}${product.image_url}`
    : null;

  const handleAddToCart = useCallback(
    (e) => {
      e.preventDefault();
      addToCart(product, 1);
    },
    [addToCart, product]
  );

  const handleBuyNow = useCallback(
    (e) => {
      e.preventDefault();
      buyNow(product, 1);
    },
    [buyNow, product]
  );

  const handleEdit = useCallback(
    (e) => {
      e.preventDefault();
      onEdit?.(product);
    },
    [onEdit, product]
  );

  const handleDelete = useCallback(
    (e) => {
      e.preventDefault();
      onDelete?.(product);
    },
    [onDelete, product]
  );

  if (layout === 'list') {
    return (
      <Card className="product-card group flex flex-col sm:flex-row items-center overflow-hidden border border-border bg-card transition-all duration-200 hover:shadow-md hover:border-primary/40">
        <Link
          to={`/products/${product.id}`}
          className="relative aspect-video sm:aspect-square w-full sm:w-48 shrink-0 overflow-hidden bg-muted/30 p-3 flex items-center justify-center"
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              loading="lazy"
              decoding="async"
              width="192"
              height="192"
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className="flex h-full w-full items-center justify-center text-muted-foreground/40"
            style={{ display: imageUrl ? 'none' : 'flex' }}
          >
            <Package className="h-10 w-10 stroke-[1.2]" />
          </div>
        </Link>

        <div className="flex flex-1 flex-col justify-between p-5 w-full">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-[11px] font-medium">
                {product.category || 'General'}
              </Badge>
              <Badge
                variant={isOutOfStock ? 'destructive' : 'success'}
                className="text-[10px]"
              >
                {isOutOfStock ? 'Out of Stock' : `${product.stock} in stock`}
              </Badge>
              {isAdmin && (
                <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 ml-auto">
                  <Shield className="h-3 w-3" /> Admin Manage
                </Badge>
              )}
            </div>

            <Link
              to={`/products/${product.id}`}
              className="product-title font-bold text-foreground text-lg hover:text-primary transition-colors line-clamp-1"
            >
              {product.name}
            </Link>

            <p className="product-description text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {product.description || 'No description provided.'}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between pt-3 border-t border-border">
            <span className="product-price text-2xl font-extrabold text-foreground">
              ${Number(product.price).toFixed(2)}
            </span>

            <div className="flex items-center gap-2">
              {isAdmin ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    className="text-xs gap-1 border-primary/40 hover:bg-primary/10 text-primary"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    className="text-xs gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    disabled={isOutOfStock}
                    onClick={handleAddToCart}
                    className="text-xs gap-1.5 shadow-sm"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span>{isOutOfStock ? 'Sold Out' : 'Add to Bag'}</span>
                  </Button>
                  {!isOutOfStock && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleBuyNow}
                      className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>Buy Now</span>
                    </Button>
                  )}
                </>
              )}
              <Button asChild variant="outline" size="sm" className="btn-view-details gap-1.5">
                <Link to={`/products/${product.id}`}>
                  <span>Details</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Default Grid Layout
  return (
    <Card className="product-card group relative flex flex-col justify-between overflow-hidden border border-border bg-card transition-all duration-200 hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5">
      {/* Product Image Box with explicit aspect ratio to eliminate CLS */}
      <Link
        to={`/products/${product.id}`}
        className="product-image-wrap block relative aspect-[4/3] w-full overflow-hidden bg-muted/30 border-b border-border transition-colors"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            decoding="async"
            width="400"
            height="300"
            className="product-image h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="product-image-fallback flex h-full w-full items-center justify-center text-muted-foreground/30"
          style={{ display: imageUrl ? 'none' : 'flex' }}
        >
          <Package className="h-12 w-12 stroke-[1.2]" />
        </div>

        {/* Quick View Floating Hint */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="bg-background/90 text-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-primary" /> Quick View
          </span>
        </div>
      </Link>

      {/* Content */}
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary" className="product-category text-[11px] font-medium tracking-wide">
            {product.category || 'General'}
          </Badge>
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/40 text-amber-600 dark:text-amber-400">
                Admin
              </Badge>
            )}
            <span
              className={cn(
                'text-[11px] font-semibold',
                isOutOfStock ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
              )}
            >
              {isOutOfStock ? 'Out of Stock' : `${product.stock} in stock`}
            </span>
          </div>
        </div>

        <Link
          to={`/products/${product.id}`}
          className="product-title font-semibold text-foreground text-base leading-snug line-clamp-1 group-hover:text-primary transition-colors"
        >
          {product.name}
        </Link>

        <p className="product-description text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed flex-1">
          {product.description || 'No description available.'}
        </p>

        <div className="mt-3 pt-2 flex items-baseline justify-between border-t border-border/50">
          <span className="product-price text-xl font-extrabold tracking-tight text-foreground">
            ${Number(product.price).toFixed(2)}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">ID #{product.id}</span>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex flex-col gap-2">
        {isAdmin ? (
          <div className="w-full flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="flex-1 text-xs gap-1 border-primary/30 hover:bg-primary/10 text-primary h-8 px-2"
            >
              <Edit3 className="h-3 w-3" />
              <span>Edit</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="flex-1 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10 h-8 px-2"
            >
              <Trash2 className="h-3 w-3" />
              <span>Delete</span>
            </Button>
            <Button
              asChild
              variant="secondary"
              size="icon"
              className="h-8 w-8 shrink-0"
              title="View Details"
            >
              <Link to={`/products/${product.id}`} aria-label={`View details for ${product.name}`}>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="w-full flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
              className="flex-1 text-xs font-semibold gap-1.5 h-8 shadow-sm"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>{isOutOfStock ? 'Sold Out' : 'Add to Bag'}</span>
            </Button>
            {!isOutOfStock && (
              <Button
                type="button"
                size="sm"
                onClick={handleBuyNow}
                className="text-xs font-semibold gap-1 h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Zap className="h-3 w-3" />
                <span>Buy</span>
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0 hover:bg-muted"
              title="Explore Details"
            >
              <Link to={`/products/${product.id}`} aria-label={`Explore details for ${product.name}`}>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export const ProductCard = memo(ProductCardBase);
ProductCard.displayName = 'ProductCard';

export default ProductCard;
