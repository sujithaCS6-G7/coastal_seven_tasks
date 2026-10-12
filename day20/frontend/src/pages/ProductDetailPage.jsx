import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/axiosClient';
import { API_BASE_URL } from '../config/env';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  useProductDetailQuery,
  useProductsQuery,
  useDeleteProductMutation,
  useInvalidateProducts,
} from '../hooks/useProducts';
import LoadingSpinner from '../components/LoadingSpinner';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  ArrowLeft,
  Package,
  Truck,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  ChevronRight,
  Share2,
  Edit3,
  Trash2,
  Shield,
  ShoppingCart,
  Zap,
  Plus,
  Minus,
} from 'lucide-react';
import { useToast } from '../components/ui/toast';

const ProductFormModal = lazy(() => import('../components/ProductFormModal'));

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, buyNow } = useCart();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [quantity, setQuantity] = useState(1);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const backendBaseUrl = API_BASE_URL;

  // TanStack Query: Fetch single product with 60s cache
  const {
    data: product,
    isLoading: loading,
    error: queryError,
  } = useProductDetailQuery(id);

  // TanStack Query: Fetch related category products from cache
  const { data: categoryData } = useProductsQuery(product?.category || 'All');
  const deleteProductMutation = useDeleteProductMutation();
  const invalidateProducts = useInvalidateProducts();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setQuantity(1);
  }, [id]);

  const relatedProducts = useMemo(() => {
    if (!product || !categoryData?.products) return [];
    return categoryData.products
      .filter((p) => p.id !== product.id && p.category === product.category)
      .slice(0, 3);
  }, [product, categoryData]);

  const handleShare = useCallback(() => {
    navigator.clipboard?.writeText(window.location.href);
    toast({
      title: 'Link Copied',
      description: 'Product URL copied to clipboard!',
      variant: 'info',
    });
  }, [toast]);

  const handleDeleteProduct = useCallback(async () => {
    if (!product) return;
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${product.name}" (ID #${product.id})?`
    );
    if (!confirmed) return;

    try {
      await deleteProductMutation.mutateAsync(product.id);
      toast({
        title: 'Product Deleted',
        description: `"${product.name}" has been deleted and purged from TanStack Query cache.`,
        variant: 'success',
      });
      navigate('/');
    } catch (err) {
      toast({
        title: 'Delete Failed',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    }
  }, [product, deleteProductMutation, toast, navigate]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <LoadingSpinner text="Loading product details via TanStack Query..." size="lg" />
      </div>
    );
  }

  const error = queryError ? getErrorMessage(queryError) : null;

  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-8">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-3" />
          <h2 className="text-xl font-bold text-foreground">Product Not Found</h2>
          <p className="text-xs text-muted-foreground mt-2">{error || 'The requested product could not be found.'}</p>
          <Button asChild className="mt-6 text-xs">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Return to Catalog
            </Link>
          </Button>
        </div>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/" className="hover:text-foreground transition-colors">
          Catalog
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{product.category || 'General'}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-muted-foreground truncate max-w-[200px]">{product.name}</span>
      </nav>

      {/* Back Button */}
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-xs text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        {isAdmin && (
          <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-500/40 gap-1.5 py-1">
            <Shield className="h-3.5 w-3.5" /> Admin Viewing
          </Badge>
        )}
      </div>

      {/* Product Hero Layout: 2 Columns (Image + Details) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        {/* Left Column: Image Box */}
        <div className="relative rounded-2xl border border-border bg-card p-8 shadow-sm flex items-center justify-center overflow-hidden aspect-square">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              width="500"
              height="500"
              decoding="async"
              className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground/30">
              <Package className="h-24 w-24 stroke-[1]" />
              <span className="text-xs text-muted-foreground mt-2">No Image Provided</span>
            </div>
          )}

          {/* Quick share button */}
          <button
            type="button"
            onClick={handleShare}
            className="absolute top-4 right-4 rounded-full border border-border bg-background/80 p-2 text-muted-foreground hover:text-foreground shadow-sm backdrop-blur transition-colors"
            title="Share Product"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        {/* Right Column: Information & Actions */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs font-semibold">
                {product.category || 'General'}
              </Badge>
              <Badge
                variant={isOutOfStock ? 'destructive' : 'success'}
                className="text-xs"
              >
                {isOutOfStock ? 'Out of Stock' : `${product.stock} Units Available`}
              </Badge>
              <span className="text-[11px] text-muted-foreground ml-auto font-mono">
                SKU #{product.id}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
              {product.name}
            </h1>

            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-foreground">
                ${Number(product.price).toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">USD (Taxes Included)</span>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Description &amp; Specifications
            </h2>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
              {product.description || 'No detailed specifications available.'}
            </p>
          </div>

          {/* Value Props & Assurance Cards */}
          <div className="grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
            <div className="rounded-lg border border-border bg-muted/20 p-2.5">
              <Truck className="mx-auto h-4 w-4 text-primary mb-1" />
              <p className="text-[11px] font-semibold text-foreground">Express Delivery</p>
              <p className="text-[9px] text-muted-foreground">Ships in 24 Hours</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-2.5">
              <ShieldCheck className="mx-auto h-4 w-4 text-emerald-600 mb-1" />
              <p className="text-[11px] font-semibold text-foreground">1-Year Warranty</p>
              <p className="text-[9px] text-muted-foreground">100% Genuine</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-2.5">
              <RotateCcw className="mx-auto h-4 w-4 text-blue-600 mb-1" />
              <p className="text-[11px] font-semibold text-foreground">Easy Returns</p>
              <p className="text-[9px] text-muted-foreground">30-Day Policy</p>
            </div>
          </div>

          {/* Admin Management Panel */}
          {isAdmin && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Shield className="h-4 w-4" /> Admin Catalog Actions
                </span>
                <span className="text-[10px] text-muted-foreground">
                  TanStack Query Optimistic Sync
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModalOpen(true)}
                  className="w-full text-xs font-semibold gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Product
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteProduct}
                  className="w-full text-xs font-semibold gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Product
                </Button>
              </div>
            </div>
          )}

          {/* Customer Purchasing Controls */}
          {!isAdmin && (
            <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">Select Quantity:</span>
                  <span className="text-[10px] text-muted-foreground">
                    {isOutOfStock ? 'Sold out' : `Up to ${product.stock} units`}
                  </span>
                </div>

                <div className="flex items-center rounded-lg border border-border bg-card p-1 shadow-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={isOutOfStock || quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="px-3 text-xs font-bold font-mono text-foreground">
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={isOutOfStock || quantity >= (product.stock || 1)}
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  disabled={isOutOfStock}
                  onClick={() => addToCart(product, quantity)}
                  className="w-full text-xs font-bold gap-2 py-5 border-primary/40 text-foreground hover:bg-primary/10 hover:border-primary shadow-sm"
                >
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <span>Add to Bag</span>
                </Button>

                <Button
                  type="button"
                  size="lg"
                  disabled={isOutOfStock}
                  onClick={() => buyNow(product, quantity)}
                  className="w-full text-xs font-bold gap-2 py-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25"
                >
                  <Zap className="h-4 w-4 fill-current" />
                  <span>Instant Buy Now</span>
                </Button>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="border-t border-border pt-4">
            <Button
              asChild
              variant="outline"
              className="w-full text-sm font-semibold"
            >
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Catalog
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <div className="mt-16 border-t border-border pt-12">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                More in {product.category}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Served instantaneously from TanStack Query Cache
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs text-primary">
              <Link to="/">View all</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} layout="grid" />
            ))}
          </div>
        </div>
      )}

      {/* Lazy-Loaded Admin Edit Modal */}
      {isAdmin && editModalOpen && (
        <Suspense fallback={null}>
          <ProductFormModal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            onSuccess={() => invalidateProducts()}
            product={product}
          />
        </Suspense>
      )}
    </div>
  );
};

export default ProductDetailPage;
