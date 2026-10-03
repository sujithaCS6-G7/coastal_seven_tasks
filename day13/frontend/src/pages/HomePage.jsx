import React, { useState, useEffect, useMemo } from 'react';
import { productService } from '../api/productService';
import { getErrorMessage } from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import ProductFilters from '../components/ProductFilters';
import ProductFormModal from '../components/ProductFormModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/toast';
import {
  LayoutGrid,
  List,
  Zap,
  PackageOpen,
  RefreshCw,
  Plus,
  Shield,
} from 'lucide-react';

export const HomePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cached, setCached] = useState(false);

  // Admin Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Filtering and Sorting States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const [layoutMode, setLayoutMode] = useState('grid'); // 'grid' | 'list'

  // Fetch product catalog on mount and whenever category changes
  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productService.getProducts(selectedCategory);
      setProducts(data.products || []);
      setCached(Boolean(data.cached));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Admin Edit Handler
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  // Admin Delete Handler
  const handleDeleteProduct = async (product) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${product.name}" (ID #${product.id})?`
    );
    if (!confirmed) return;

    try {
      await productService.deleteProduct(product.id);
      toast({
        title: 'Product Deleted',
        description: `"${product.name}" has been removed from catalog.`,
        variant: 'success',
      });
      // Immediately remove from client state
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err) {
      toast({
        title: 'Delete Failed',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    }
  };

  // Admin Modal Save Callback
  const handleModalSuccess = () => {
    fetchProducts();
  };

  // Derive all unique categories from products
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [products]);

  // Client-side search, filtering, and sorting
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    // 1. Search filter (Name & Description)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    // 2. Price filter
    const min = parseFloat(minPrice);
    if (!isNaN(min) && min >= 0) {
      result = result.filter((p) => p.price >= min);
    }
    const max = parseFloat(maxPrice);
    if (!isNaN(max) && max >= 0) {
      result = result.filter((p) => p.price <= max);
    }

    // 3. In-Stock filter
    if (inStockOnly) {
      result = result.filter((p) => p.stock > 0);
    }

    // 4. Sorting
    switch (sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'featured':
      default:
        result.sort((a, b) => a.id - b.id);
        break;
    }

    return result;
  }, [products, searchQuery, minPrice, maxPrice, inStockOnly, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setSortBy('featured');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      {/* Hero / Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <span>Explore Nexora Gear</span>
            </h1>
            {isAdmin && (
              <Badge variant="default" className="text-xs bg-indigo-600 text-white gap-1 py-1">
                <Shield className="h-3 w-3" /> Admin Mode
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            <span>FastAPI Catalog</span>
            <span>&bull;</span>
            <span>PostgreSQL & Redis Cache-Aside</span>
            {cached && (
              <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Zap className="h-3 w-3 mr-0.5 fill-current" /> Redis Cached
              </Badge>
            )}
          </div>
        </div>

        {/* Action Controls: Add Product (Admin), Layout Mode, Refresh */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => {
                setEditingProduct(null);
                setModalOpen(true);
              }}
              className="text-xs font-semibold gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/20"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Product</span>
            </Button>
          )}

          <div className="flex items-center rounded-lg border border-border bg-card p-0.5 shadow-sm">
            <Button
              variant={layoutMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => setLayoutMode('grid')}
              aria-label="Grid layout view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={layoutMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => setLayoutMode('list')}
              aria-label="List layout view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchProducts}
            className="text-xs"
            title="Reload products from backend"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Main Content Layout: Filters Sidebar + Products Grid */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1">
          <ProductFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onMinPriceChange={setMinPrice}
            onMaxPriceChange={setMaxPrice}
            inStockOnly={inStockOnly}
            onInStockToggle={setInStockOnly}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onResetFilters={handleResetFilters}
            totalResults={filteredAndSortedProducts.length}
          />
        </div>

        {/* Products Results Container */}
        <div className="lg:col-span-3">
          {/* Active Filter Status Bar */}
          <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
            <p>
              Showing <strong className="text-foreground">{filteredAndSortedProducts.length}</strong> of{' '}
              {products.length} products
            </p>
            {sortBy !== 'featured' && (
              <Badge variant="outline" className="text-[10px]">
                Sorted by {sortBy.replace('_', ' ')}
              </Badge>
            )}
          </div>

          {loading ? (
            <LoadingSpinner text="Retrieving latest catalog from FastAPI..." />
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center">
              <p className="text-sm font-semibold text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchProducts}
                className="mt-4 text-xs"
              >
                Try Again
              </Button>
            </div>
          ) : filteredAndSortedProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-bold text-foreground">No Products Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                No catalog items matched your current search, price, or category criteria.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResetFilters}
                className="mt-4 text-xs"
              >
                Clear All Filters
              </Button>
            </div>
          ) : layoutMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAndSortedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  layout="grid"
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  layout="list"
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Admin Create / Edit Modal */}
      <ProductFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
        product={editingProduct}
      />
    </div>
  );
};

export default HomePage;
