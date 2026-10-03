import React, { memo } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select } from './ui/select';
import {
  Search,
  X,
  SlidersHorizontal,
  RotateCcw,
  DollarSign,
  Layers,
} from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Day 14: Memoized ProductFilters Component (React.memo)
 * Prevents re-rendering sidebar filter controls when product cards or cart items update.
 */
const ProductFiltersBase = ({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  inStockOnly,
  onInStockToggle,
  sortBy,
  onSortChange,
  onResetFilters,
  totalResults,
}) => {
  const hasActiveFilters = Boolean(
    searchQuery ||
    selectedCategory !== 'All' ||
    minPrice ||
    maxPrice ||
    inStockOnly ||
    sortBy !== 'featured'
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-6">
      {/* Filter Header & Reset Button */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <h2 className="font-bold text-sm tracking-tight text-foreground">Filter &amp; Sort</h2>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-7 text-xs text-muted-foreground hover:text-destructive px-2"
            title="Reset all filters"
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Reset
          </Button>
        )}
      </div>

      {/* 1. Search Filter (Debounced 300ms in parent) */}
      <div className="space-y-2">
        <label htmlFor="search-input" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Search Products (Debounced)</span>
        </label>
        <div className="relative">
          <Input
            id="search-input"
            type="text"
            placeholder="Search by name, spec..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 pl-8 pr-8 text-xs"
          />
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search text"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Sorting Criteria */}
      <div className="space-y-2">
        <label htmlFor="sort-select" className="text-xs font-semibold text-foreground">
          Sort Catalog By
        </label>
        <Select
          id="sort-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="text-xs"
          aria-label="Sort product catalog"
        >
          <option value="featured">Featured (Default)</option>
          <option value="price_asc">Price: Low to High ($ &rarr; $$$)</option>
          <option value="price_desc">Price: High to Low ($$$ &rarr; $)</option>
          <option value="name_asc">Product Name: A to Z</option>
          <option value="name_desc">Product Name: Z to A</option>
        </Select>
      </div>

      {/* 3. Category Filter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Categories</span>
          </span>
          <span className="text-[10px] text-muted-foreground">{categories.length} total</span>
        </label>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat)}
                className={cn(
                  'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-all select-none',
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary/70 text-secondary-foreground hover:bg-secondary border border-border'
                )}
                aria-pressed={isSelected}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Price Range Filter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Price Range ($)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-muted-foreground">Min Price</span>
            <Input
              id="min-price"
              type="number"
              min="0"
              placeholder="Min $"
              value={minPrice}
              onChange={(e) => onMinPriceChange(e.target.value)}
              className="h-8 text-xs mt-0.5"
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">Max Price</span>
            <Input
              id="max-price"
              type="number"
              min="0"
              placeholder="Max $"
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(e.target.value)}
              className="h-8 text-xs mt-0.5"
            />
          </div>
        </div>
      </div>

      {/* 5. In-Stock Only Toggle */}
      <div className="pt-2 border-t border-border">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            id="in-stock-checkbox"
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => onInStockToggle(e.target.checked)}
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary cursor-pointer"
          />
          <span className="text-xs font-medium text-foreground">In-Stock Items Only</span>
        </label>
      </div>

      {/* Results Count Footer */}
      <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Matching Items:</span>
        <Badge variant="outline" className="font-mono text-xs">
          {totalResults} items
        </Badge>
      </div>
    </div>
  );
};

export const ProductFilters = memo(ProductFiltersBase);
ProductFilters.displayName = 'ProductFilters';

export default ProductFilters;
