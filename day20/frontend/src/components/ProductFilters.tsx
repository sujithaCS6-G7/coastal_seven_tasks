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
  Database,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { ProductSearchMode, ProductSortOption } from '../types/api';

export interface ProductFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchMode?: ProductSearchMode;
  onSearchModeChange?: (mode: ProductSearchMode) => void;
  activeIndexUsed?: string | null;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  inStockOnly: boolean;
  onInStockToggle: (checked: boolean) => void;
  sortBy: ProductSortOption | string;
  onSortChange: (sortBy: ProductSortOption) => void;
  onResetFilters: () => void;
  totalResults: number;
}

const ProductFiltersBase: React.FC<ProductFiltersProps> = ({
  searchQuery,
  onSearchChange,
  searchMode = 'client',
  onSearchModeChange,
  activeIndexUsed,
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
      searchMode !== 'client' ||
      selectedCategory !== 'All' ||
      minPrice ||
      maxPrice ||
      inStockOnly ||
      sortBy !== 'featured'
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-6">
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

      <div className="space-y-2.5">
        <label
          htmlFor="search-input"
          className="text-xs font-semibold text-foreground flex items-center gap-1.5"
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Search Products (Debounced)</span>
        </label>
        <div className="relative">
          <Input
            id="search-input"
            type="text"
            placeholder="Search by name, spec, or typo (e.g. iphon)..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
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

        {/* Day 18: PostgreSQL Search Engine Mode Selector */}
        {onSearchModeChange && (
          <div className="space-y-1.5 pt-1">
            <label
              htmlFor="search-mode-select"
              className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1"
            >
              <Database className="h-3 w-3 text-primary" />
              <span>Search Engine Mode (Day 18)</span>
            </label>
            <Select
              id="search-mode-select"
              data-testid="search-mode-select"
              value={searchMode}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                onSearchModeChange(e.target.value as ProductSearchMode)
              }
              className="text-xs"
              aria-label="PostgreSQL search mode"
            >
              <option value="client">Standard Filter (Client-Side)</option>
              <option value="fulltext">PostgreSQL Full-Text (tsvector + GIN)</option>
              <option value="fuzzy">PostgreSQL Fuzzy (pg_trgm Typo-Tolerant)</option>
              <option value="combined">PostgreSQL Combined (FTS + pg_trgm)</option>
            </Select>

            <div className="flex flex-wrap gap-1 pt-1">
              <button
                type="button"
                data-testid="demo-fts-btn"
                onClick={() => {
                  onSearchModeChange('fulltext');
                  onSearchChange('wireless headphones');
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors"
              >
                Try FTS: &ldquo;wireless headphones&rdquo;
              </button>
              <button
                type="button"
                data-testid="demo-fuzzy-iphone-btn"
                onClick={() => {
                  onSearchModeChange('fuzzy');
                  onSearchChange('iphon');
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-500/20 font-medium transition-colors"
              >
                Try Typo: &ldquo;iphon&rdquo;
              </button>
              <button
                type="button"
                data-testid="demo-fuzzy-kbd-btn"
                onClick={() => {
                  onSearchModeChange('fuzzy');
                  onSearchChange('keybord');
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-500/20 font-medium transition-colors"
              >
                Try Typo: &ldquo;keybord&rdquo;
              </button>
            </div>

            {activeIndexUsed && (
              <p
                data-testid="active-gin-index-badge"
                className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 pt-0.5"
              >
                GIN Index: {activeIndexUsed}
              </p>
            )}
          </div>
        )}
      </div>


      <div className="space-y-2">
        <label htmlFor="sort-select" className="text-xs font-semibold text-foreground">
          Sort Catalog By
        </label>
        <Select
          id="sort-select"
          value={sortBy}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            onSortChange(e.target.value as ProductSortOption)
          }
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

      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Categories</span>
          </span>
          <span className="text-[10px] text-muted-foreground">{categories.length} total</span>
        </label>
        <div className="flex flex-wrap content-start gap-1.5 pt-1 min-h-[64px]">
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onMinPriceChange(e.target.value)
              }
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onMaxPriceChange(e.target.value)
              }
              className="h-8 text-xs mt-0.5"
            />
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            id="in-stock-checkbox"
            type="checkbox"
            checked={inStockOnly}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onInStockToggle(e.target.checked)
            }
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary cursor-pointer"
          />
          <span className="text-xs font-medium text-foreground">In-Stock Items Only</span>
        </label>
      </div>

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
