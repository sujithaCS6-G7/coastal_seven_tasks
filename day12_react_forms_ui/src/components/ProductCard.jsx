import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardFooter } from './ui/card';
import { ShoppingCart, Trash2, Package, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Reusable ProductCard component styled with Tailwind CSS and shadcn/ui Card.
 */
export const ProductCard = ({ product, onAddToCart, isAdding = false, isAdmin = false, onDelete }) => {
  const isOutOfStock = product.stock <= 0;
  const backendBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const imageUrl = product.image_url
    ? product.image_url.startsWith('http')
      ? product.image_url
      : `${backendBaseUrl}${product.image_url}`
    : null;

  return (
    <Card className="product-card group relative flex flex-col justify-between overflow-hidden border border-border bg-card transition-all duration-200 hover:shadow-md hover:border-primary/40">
      {/* Admin Quick Delete Badge */}
      {isAdmin && (
        <div className="absolute top-2.5 right-2.5 z-10">
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => onDelete && onDelete(product.id, product.name, e)}
            title="Delete Product (Admin)"
            className="btn btn-danger h-7 px-2 text-xs shadow-sm bg-destructive/90 hover:bg-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>
      )}

      {/* Product Image Wrap */}
      <Link
        to={`/products/${product.id}`}
        className="product-image-wrap block relative aspect-[4/3] w-full overflow-hidden bg-muted/40 transition-colors"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="product-image h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="product-image-fallback flex h-full w-full items-center justify-center text-4xl text-muted-foreground/40"
          style={{ display: imageUrl ? 'none' : 'flex' }}
        >
          <Package className="h-12 w-12 stroke-[1.2]" />
        </div>
      </Link>

      {/* Card Content & Metadata */}
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between mb-1.5">
          <Badge variant="secondary" className="product-category text-[11px] font-medium tracking-wide">
            {product.category || 'General'}
          </Badge>
          <span
            className={cn(
              "text-[11px] font-medium",
              isOutOfStock ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {isOutOfStock ? "Out of Stock" : `${product.stock} in stock`}
          </span>
        </div>

        <Link
          to={`/products/${product.id}`}
          className="product-title font-semibold text-foreground text-base leading-snug line-clamp-1 group-hover:text-primary transition-colors"
        >
          {product.name}
        </Link>

        <p className="product-description text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed flex-1">
          {product.description || 'No description available.'}
        </p>

        <div className="mt-3 flex items-baseline gap-1">
          <span className="product-price text-xl font-bold tracking-tight text-foreground">
            ${Number(product.price).toFixed(2)}
          </span>
        </div>
      </CardContent>

      {/* Card Footer with Add to Cart or Admin Manage Action */}
      <CardFooter className="p-4 pt-0">
        {isAdmin ? (
          <div className="w-full text-center py-2 px-3 rounded-md bg-secondary/70 text-xs font-semibold text-muted-foreground border border-border flex items-center justify-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-indigo-500" />
            <span>Admin Catalog Item</span>
          </div>
        ) : (
          <Button
            variant={isOutOfStock ? "outline" : "default"}
            size="sm"
            className="w-full text-xs font-semibold"
            disabled={isOutOfStock || isAdding}
            onClick={(e) => onAddToCart(product, e)}
          >
            <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
            {isAdding ? "Adding to Cart..." : isOutOfStock ? "Out of Stock" : "Add to Cart"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
