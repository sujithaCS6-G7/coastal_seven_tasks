import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService } from '../api/productService';
import { cartService } from '../api/cartService';
import { getErrorMessage } from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/toast';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { MultiStepProductForm } from '../components/forms/MultiStepProductForm';
import { Search, X, Plus, Zap, AlertCircle } from 'lucide-react';

const HomePage = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cached, setCached] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Admin Multi-Step Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);

  const searchInputRef = useRef(null);

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

  // Add to cart handler
  const handleAddToCart = async (product, e) => {
    if (e) e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/' } } });
      return;
    }

    setAddingId(product.id);
    try {
      await cartService.addToCart(product.id, 1);
      const msg = `✓ Added "${product.name}" to your cart!`;
      setToastMessage(msg);
      toast({
        title: 'Item Added to Cart',
        description: `"${product.name}" has been added to your shopping cart.`,
        variant: 'success',
      });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      toast({
        title: 'Could not add item',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setAddingId(null);
    }
  };

  // Admin delete product handler
  const handleDeleteProduct = async (productId, productName, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!window.confirm(`Are you sure you want to delete "${productName}" (ID: ${productId})?`)) {
      return;
    }
    try {
      await productService.deleteProduct(productId);
      toast({
        title: 'Product Deleted',
        description: `"${productName}" has been removed from catalog.`,
        variant: 'default',
      });
      fetchProducts(selectedCategory);
    } catch (err) {
      toast({
        title: 'Delete Failed',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    }
  };

  // Callback when multi-step wizard completes
  const handleProductCreated = (newProd) => {
    setDialogOpen(false);
    setToastMessage(`✓ Product "${newProd.name}" created successfully!`);
    fetchProducts(selectedCategory);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Client-side search filtering
  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      {/* Toast Feedback for automated tests compatibility */}
      {toastMessage && (
        <div className="form-success mb-6 rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/60 p-3.5 text-center text-sm font-semibold text-emerald-800 dark:text-emerald-200 shadow-sm animate-in fade-in-0 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Hero / Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Explore Nexora Gear
          </h1>
          <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
            <span>FastAPI Backend with Redis Cache-Aside</span>
            {cached && (
              <Badge variant="secondary" className="flex items-center gap-1 text-[11px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                <Zap className="h-3 w-3 fill-current" /> Cached in Redis
              </Badge>
            )}
          </div>
        </div>

        {/* Search bar and Admin Add Product trigger */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8"
              aria-label="Search catalog products"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear search query"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Admin-only Add Product Trigger using shadcn Dialog */}
          {isAdmin && (
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              aria-label="Open multi-step product creation wizard"
            >
              <Plus className="h-4 w-4 mr-1.5" /> ➕ Add Product
            </Button>
          )}
        </div>
      </div>

      {/* Category Pills Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto py-5 scrollbar-none" role="tablist" aria-label="Product categories">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive flex items-center gap-3 my-4">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="text-sm font-medium">{error}</div>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-16">
          <LoadingSpinner message="Loading products from FastAPI backend..." />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center my-8">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-base font-semibold text-foreground">No products found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery
              ? `No catalog items matched "${searchQuery}". Try a different keyword.`
              : 'No products are currently available in this category.'}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="mt-4"
            >
              Clear Search Filter
            </Button>
          )}
        </div>
      ) : (
        /* Responsive Product Grid: 1 col on mobile, 2 on sm, 3 on lg, 4 on xl */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-2 pb-12">
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

      {/* shadcn/ui Dialog Modal containing the Multi-Step Product Wizard */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0 sr-only">
            <DialogTitle>Create New Product</DialogTitle>
            <DialogDescription>
              Launch a new catalog item with multi-step validation and image optimization.
            </DialogDescription>
          </DialogHeader>
          <MultiStepProductForm
            onProductCreated={handleProductCreated}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomePage;
