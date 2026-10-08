import React, { useState, useMemo, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { getErrorMessage } from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import {
  useProductsQuery,
  useProductSearchQuery,
  usePaginatedProductsQuery,
  useInfiniteProductsQuery,
  useDeleteProductMutation,
  useInvalidateProducts,
} from '../hooks/useProducts';
import { useDebounce } from '../hooks/useDebounce';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import ProductCard from '../components/ProductCard';
import ProductFilters from '../components/ProductFilters';
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
  Database,
  Infinity as InfinityIcon,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Hash,
} from 'lucide-react';
import type {
  CatalogLayoutMode,
  PaginationMode,
  Product,
  ProductSearchMode,
  ProductSortOption,
} from '../types/api';

const ProductFormModal = lazy(() => import('../components/ProductFormModal'));

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  // Typed Component State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearch = useDebounce<string>(searchQuery, 300);
  const [searchMode, setSearchMode] = useState<ProductSearchMode>('combined');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<ProductSortOption>('featured');
  const [layoutMode, setLayoutMode] = useState<CatalogLayoutMode>('grid');

  const [paginationType, setPaginationType] = useState<PaginationMode>('numbered');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

  const isDatabaseSearchActive = Boolean(
    searchMode !== 'client' && debouncedSearch.trim()
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, debouncedSearch, searchMode, minPrice, maxPrice, inStockOnly, sortBy]);

  const {
    data: fullCatalogData,
    isFetching: isFullFetching,
    refetch: refetchFull,
    dataUpdatedAt,
  } = useProductsQuery(selectedCategory);

  const {
    data: dbSearchData,
    isLoading: isDbSearchLoading,
    error: dbSearchError,
    refetch: refetchDbSearch,
  } = useProductSearchQuery(
    debouncedSearch,
    searchMode === 'client' ? 'fulltext' : searchMode,
    selectedCategory,
    isDatabaseSearchActive
  );

  const {
    data: paginatedData,
    isLoading: isPaginatedLoading,
    isPlaceholderData,
    error: paginatedError,
    refetch: refetchPaginated,
  } = usePaginatedProductsQuery(
    selectedCategory,
    currentPage,
    pageSize,
    paginationType === 'numbered' && !isDatabaseSearchActive
  );

  const {
    data: infiniteData,
    isLoading: isInfiniteLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error: infiniteError,
    refetch: refetchInfinite,
  } = useInfiniteProductsQuery(
    selectedCategory,
    pageSize,
    paginationType === 'infinite' && !isDatabaseSearchActive
  );

  const deleteProductMutation = useDeleteProductMutation();
  const invalidateProducts = useInvalidateProducts();

  // Typed useRef
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const handleLoadNextPage = useCallback(() => {
    if (paginationType === 'infinite' && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [paginationType, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useIntersectionObserver({
    targetRef: loadMoreSentinelRef,
    onIntersect: handleLoadNextPage,
    enabled: paginationType === 'infinite' && Boolean(hasNextPage) && !isFetchingNextPage,
  });

  const hasClientFilter = Boolean(
    isDatabaseSearchActive ||
      debouncedSearch.trim() ||
      minPrice ||
      maxPrice ||
      inStockOnly ||
      sortBy !== 'featured'
  );

  const rawProducts = useMemo<Product[]>(() => {
    if (isDatabaseSearchActive) {
      return dbSearchData?.products || [];
    }
    if (hasClientFilter) {
      return fullCatalogData?.products || [];
    }
    if (paginationType === 'infinite') {
      if (!infiniteData?.pages) return [];
      const seen = new Set<number>();
      const merged: Product[] = [];
      for (const page of infiniteData.pages) {
        for (const item of page.products || []) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            merged.push(item);
          }
        }
      }
      return merged;
    }
    return paginatedData?.products || [];
  }, [
    isDatabaseSearchActive,
    dbSearchData,
    hasClientFilter,
    paginationType,
    infiniteData,
    paginatedData,
    fullCatalogData,
  ]);

  const filteredAndSortedProducts = useMemo<Product[]>(() => {
    let result = [...rawProducts];

    // Apply client filter when in 'client' searchMode (with typo-tolerant trigram fallback)
    if (!isDatabaseSearchActive && debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      const exactMatches = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
      if (exactMatches.length > 0) {
        result = exactMatches;
      } else if (q.length >= 3) {
        const qGrams = new Set<string>();
        for (let i = 0; i <= q.length - 3; i++) {
          qGrams.add(q.slice(i, i + 3));
        }
        result = result.filter((p) => {
          const text = `${p.name || ''} ${p.description || ''}`.toLowerCase();
          let hits = 0;
          qGrams.forEach((gram) => {
            if (text.includes(gram)) hits += 1;
          });
          return qGrams.size > 0 && hits / qGrams.size >= 0.5;
        });
      } else {
        result = exactMatches;
      }
    }

    const min = parseFloat(minPrice);
    if (!isNaN(min) && min >= 0) {
      result = result.filter((p) => p.price >= min);
    }
    const max = parseFloat(maxPrice);
    if (!isNaN(max) && max >= 0) {
      result = result.filter((p) => p.price <= max);
    }

    if (inStockOnly) {
      result = result.filter((p) => p.stock > 0);
    }

    if (hasClientFilter) {
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
          // Preserve PostgreSQL ts_rank / pg_trgm relevance ordering when database search is active
          if (!isDatabaseSearchActive) {
            result.sort((a, b) => a.id - b.id);
          }
          break;
      }
    }

    return result;
  }, [
    rawProducts,
    isDatabaseSearchActive,
    debouncedSearch,
    minPrice,
    maxPrice,
    inStockOnly,
    sortBy,
    hasClientFilter,
  ]);

  const totalServerCount = useMemo<number>(() => {
    if (hasClientFilter) {
      return filteredAndSortedProducts.length;
    }
    if (paginationType === 'infinite' && infiniteData?.pages?.[0]) {
      return infiniteData.pages[0].total || 0;
    }
    return paginatedData?.total || fullCatalogData?.total || 0;
  }, [
    hasClientFilter,
    filteredAndSortedProducts.length,
    paginationType,
    infiniteData,
    paginatedData,
    fullCatalogData,
  ]);

  const totalPages = Math.max(1, Math.ceil(totalServerCount / pageSize));

  const displayedProducts = useMemo<Product[]>(() => {
    if (hasClientFilter && paginationType === 'numbered') {
      const start = (currentPage - 1) * pageSize;
      return filteredAndSortedProducts.slice(start, start + pageSize);
    }
    return filteredAndSortedProducts;
  }, [hasClientFilter, paginationType, currentPage, pageSize, filteredAndSortedProducts]);

  const isRedisCached = Boolean(
    paginationType === 'infinite'
      ? infiniteData?.pages?.[0]?.cached
      : paginatedData?.cached
  );

  const categories = useMemo<string[]>(() => {
    const source = fullCatalogData?.products || rawProducts;
    const set = new Set<string>(source.map((p) => p.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [fullCatalogData?.products, rawProducts]);


  const handleEditProduct = useCallback((product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  }, []);

  const handleDeleteProduct = useCallback(
    async (product: Product) => {
      const confirmed = window.confirm(
        `Are you sure you want to permanently delete "${product.name}" (ID #${product.id})?`
      );
      if (!confirmed) return;

      try {
        await deleteProductMutation.mutateAsync(product.id);
        toast({
          title: 'Optimistic Delete Complete',
          description: `"${product.name}" removed immediately & synced with TanStack Query cache.`,
          variant: 'success',
        });
      } catch (err) {
        toast({
          title: 'Delete Failed (Rolled Back)',
          description: getErrorMessage(err),
          variant: 'destructive',
        });
      }
    },
    [deleteProductMutation, toast]
  );

  const handleModalSuccess = useCallback(() => {
    invalidateProducts();
  }, [invalidateProducts]);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSearchMode('combined');
    setSelectedCategory('All');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setSortBy('featured');
    setCurrentPage(1);
  }, []);

  const handleManualRefresh = useCallback(() => {
    refetchFull();
    refetchPaginated();
    refetchInfinite();
    if (isDatabaseSearchActive) {
      refetchDbSearch();
    }
    toast({
      title: 'TanStack Query Revalidated',
      description: 'Server cache revalidated in background.',
      variant: 'info',
    });
  }, [refetchFull, refetchPaginated, refetchInfinite, refetchDbSearch, isDatabaseSearchActive, toast]);

  const loading = isDatabaseSearchActive
    ? isDbSearchLoading
    : paginationType === 'infinite'
      ? isInfiniteLoading
      : isPaginatedLoading;
  const errorObj = isDatabaseSearchActive
    ? dbSearchError
    : paginationType === 'infinite'
      ? infiniteError
      : paginatedError;
  const error = errorObj ? getErrorMessage(errorObj) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <span>Explore Nexora Gear</span>
            </h1>
            <Badge
              variant="outline"
              className="text-[11px] border-primary/40 text-primary bg-primary/5 font-semibold"
            >
              Day 18 FTS + Fuzzy + Celery
            </Badge>
            {isAdmin && (
              <Badge variant="default" className="text-xs bg-indigo-600 text-white gap-1 py-1">
                <Shield className="h-3 w-3" /> Admin Mode
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> TypeScript Strict Mode
            </span>
            <span>&bull;</span>
            <span>Vitest + RTL + MSW Tested</span>
            <span>&bull;</span>
            <span>Playwright E2E</span>
            {isRedisCached && (
              <Badge
                variant="secondary"
                className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400"
              >
                <Zap className="h-3 w-3 mr-0.5 fill-current" /> Redis + React Query Cached
              </Badge>
            )}
            {dataUpdatedAt > 0 && (
              <span className="text-[11px] font-mono text-muted-foreground/80">
                (Synced {new Date(dataUpdatedAt).toLocaleTimeString()})
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5 shadow-sm">
            <Button
              type="button"
              variant={paginationType === 'numbered' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPaginationType('numbered')}
              className="h-8 text-xs gap-1.5 rounded-md px-2.5"
            >
              <Hash className="h-3.5 w-3.5" />
              <span>Pages (1, 2, 3)</span>
            </Button>
            <Button
              type="button"
              variant={paginationType === 'infinite' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPaginationType('infinite')}
              className="h-8 text-xs gap-1.5 rounded-md px-2.5"
            >
              <InfinityIcon className="h-3.5 w-3.5" />
              <span>Infinite Scroll</span>
            </Button>
          </div>

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
            onClick={handleManualRefresh}
            className="text-xs"
            title="Revalidate TanStack Query Cache"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFullFetching ? 'animate-spin' : ''}`} />
            Revalidate
          </Button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <div className="lg:col-span-1">
          <ProductFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchMode={searchMode}
            onSearchModeChange={setSearchMode}
            activeIndexUsed={isDatabaseSearchActive ? dbSearchData?.index_used : null}
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
            totalResults={totalServerCount}
          />
        </div>


        <div className="lg:col-span-3">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground bg-muted/30 px-3.5 py-2.5 rounded-lg border border-border">
            <p>
              {paginationType === 'numbered' ? (
                <>
                  Page <strong className="text-foreground">{currentPage}</strong> of{' '}
                  <strong className="text-foreground">{totalPages}</strong> &bull; Showing{' '}
                  <strong className="text-foreground">{displayedProducts.length}</strong> of{' '}
                  <strong className="text-foreground">{totalServerCount}</strong> total products
                </>
              ) : (
                <>
                  Showing <strong className="text-foreground">{displayedProducts.length}</strong>{' '}
                  loaded of <strong className="text-foreground">{totalServerCount}</strong> total
                  products
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="page-size-select" className="text-[11px] text-muted-foreground">
                Per Page:
              </label>
              <select
                id="page-size-select"
                value={pageSize}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                aria-label="Products per page"
                className="text-xs bg-background border border-border rounded px-1.5 py-0.5 font-semibold text-foreground"
              >
                <option value={3}>3 items</option>
                <option value={6}>6 items</option>
                <option value={9}>9 items</option>
              </select>

              <Badge variant="secondary" className="text-[10px] gap-1">
                <Database className="h-3 w-3 text-primary" />
                {paginationType === 'numbered'
                  ? 'Numbered Pagination'
                  : 'useInfiniteQuery (Infinite Scroll)'}
              </Badge>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner text="Fetching cached catalog via TanStack Query..." />
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center">
              <p className="text-sm font-semibold text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                className="mt-4 text-xs"
              >
                Try Again
              </Button>
            </div>
          ) : displayedProducts.length === 0 ? (
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
          ) : (
            <>
              {layoutMode === 'grid' ? (
                <div
                  className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 transition-opacity ${
                    isPlaceholderData ? 'opacity-60' : 'opacity-100'
                  }`}
                >
                  {displayedProducts.map((product, idx) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      layout="grid"
                      priority={idx < 3}
                      onEdit={handleEditProduct}
                      onDelete={handleDeleteProduct}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedProducts.map((product) => (
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

              {paginationType === 'numbered' && totalPages > 1 && (
                <nav
                  aria-label="Product Pagination"
                  className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <p className="text-xs text-muted-foreground">
                    Showing page <strong className="text-foreground">{currentPage}</strong> of{' '}
                    <strong className="text-foreground">{totalPages}</strong> ({totalServerCount}{' '}
                    total items)
                  </p>

                  <div className="inline-flex items-center rounded-xl border border-border bg-card shadow-sm overflow-hidden divide-x divide-border">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Previous</span>
                    </button>

                    {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => {
                      const isActive = pageNum === currentPage;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => {
                            setCurrentPage(pageNum);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          aria-current={isActive ? 'page' : undefined}
                          className={`min-w-[40px] px-3.5 py-2 text-xs font-bold transition-colors ${
                            isActive
                              ? 'bg-primary text-primary-foreground ring-2 ring-inset ring-primary'
                              : 'bg-card text-foreground hover:bg-muted'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 transition-colors"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </nav>
              )}

              {paginationType === 'infinite' && (
                <div
                  ref={loadMoreSentinelRef}
                  className="mt-8 flex flex-col items-center justify-center py-6 border-t border-dashed border-border"
                >
                  {isFetchingNextPage ? (
                    <div className="flex items-center gap-2 text-xs font-medium text-primary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading next page of products via useInfiniteQuery...</span>
                    </div>
                  ) : hasNextPage ? (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        Loaded {displayedProducts.length} of {totalServerCount} products
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fetchNextPage()}
                        className="text-xs font-semibold gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                      >
                        <InfinityIcon className="h-3.5 w-3.5" />
                        <span>
                          Load More Products ({totalServerCount - displayedProducts.length}{' '}
                          remaining)
                        </span>
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      All {totalServerCount} catalog products loaded into TanStack Query cache
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modalOpen && (
        <Suspense fallback={null}>
          <ProductFormModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onSuccess={handleModalSuccess}
            product={editingProduct}
          />
        </Suspense>
      )}
    </div>
  );
};

export default HomePage;
