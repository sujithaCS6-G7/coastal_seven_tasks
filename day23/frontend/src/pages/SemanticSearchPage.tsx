/**
 * Day 21 Dedicated Page: Semantic Product Search (ChromaDB + ONNX Embeddings + Metadata Filters + Redis Cache)
 * Route: /semantic-search
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  Database,
  Zap,
  CheckCircle2,
  Package,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { aiService } from '../api/aiService';
import { ProductCitation } from '../types/ai';

const INTENT_PRESETS = [
  {
    label: '✈️ Quiet gear for airplane flight',
    query: 'quiet ear gear for long airplane flight travel',
    category: 'Audio',
  },
  {
    label: '💻 Portable computer for coding & video editing',
    query: 'portable computer for software coding and video editing',
    category: 'Electronics',
  },
  {
    label: '☕ Fresh morning espresso maker',
    query: 'compact espresso and cappuccino maker with milk frother',
    category: 'Home & Kitchen',
  },
  {
    label: '✨ Glowing skin & dark spots serum',
    query: 'brightening vitamin c serum for dark spots and glowing face',
    category: 'Beauty & Personal Care',
  },
  {
    label: '👟 Streetwear sneakers & outfits',
    query: 'retro high sneakers and heavyweight fleece hoodie',
    category: 'Fashion',
  },
  {
    label: '🏋️ Home workout & muscle recovery',
    query: 'adjustable smart dumbbells and whey protein powder',
    category: 'Fitness & Sports',
  },
];

export default function SemanticSearchPage() {
  const navigate = useNavigate();

  const [query, setQuery] = useState('quiet ear gear for long airplane flight travel');
  const [category, setCategory] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [limit, setLimit] = useState(6);

  const [results, setResults] = useState<ProductCitation[]>([]);
  const [cached, setCached] = useState<boolean | null>(null);
  const [cacheKey, setCacheKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSemanticSearch = async (
    customQuery?: string,
    customCategory?: string
  ) => {
    const q = (customQuery !== undefined ? customQuery : query).trim();
    if (!q) return;

    const cat = customCategory !== undefined ? customCategory : category;
    setIsLoading(true);
    setError(null);

    try {
      const parsedMin = minPrice.trim() ? parseFloat(minPrice) : undefined;
      const parsedMax = maxPrice.trim() ? parseFloat(maxPrice) : undefined;

      const res = await aiService.searchSemantic(q, limit, {
        category: cat !== 'all' ? cat : undefined,
        min_price: parsedMin !== undefined && !isNaN(parsedMin) ? parsedMin : undefined,
        max_price: parsedMax !== undefined && !isNaN(parsedMax) ? parsedMax : undefined,
        in_stock_only: inStockOnly,
      });

      setResults(res.citations || res.results || []);
      setCached(Boolean(res.cached));
      setCacheKey(res.cache_key || null);
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail || err?.message || 'Semantic search failed.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runSemanticSearch('quiet ear gear for long airplane flight travel', 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    setQuery('quiet ear gear for long airplane flight travel');
    setCategory('all');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setLimit(6);
    runSemanticSearch('quiet ear gear for long airplane flight travel', 'all');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Dedicated Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-purple-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl border border-indigo-500/30">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-indigo-500/30 text-indigo-200 text-xs font-bold rounded-full border border-indigo-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                AI Semantic Vector Search
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-full border border-emerald-400/30 flex items-center gap-1">
                <Database className="w-3.5 h-3.5" />
                ChromaDB (nexora_products • 25 Products)
              </span>
              <span className="px-3 py-1 bg-amber-500/20 text-amber-200 text-xs font-semibold rounded-full border border-amber-400/30 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                all-MiniLM-L6-v2 (ONNX) + Redis Cache
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              AI Semantic Product Search
            </h1>
            <p className="text-sm text-indigo-200 max-w-2xl">
              Discover products by customer intent and contextual meaning rather than exact keywords—powered by ChromaDB vector embeddings, metadata filtering, and Redis AI response caching.
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar + Metadata Filters Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-lg border border-slate-200 dark:border-slate-800 space-y-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSemanticSearch();
          }}
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-indigo-500 absolute left-4 top-3.5 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe what you need by meaning (e.g. quiet ear gear for airplane flight)..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              {isLoading ? 'Searching Vectors...' : 'Semantic Search'}
            </button>
          </div>

          {/* One-Click User Intent Presets */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Try Customer Intent Queries (No Exact Keyword Needed):
            </span>
            <div className="flex flex-wrap gap-2">
              {INTENT_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(preset.query);
                    setCategory(preset.category);
                    runSemanticSearch(preset.query, preset.category);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Metadata Filters Row */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                Category Filter
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
              >
                <option value="all">All Categories</option>
                <option value="Electronics">Electronics</option>
                <option value="Audio">Audio</option>
                <option value="Fashion">Fashion</option>
                <option value="Home & Kitchen">Home & Kitchen</option>
                <option value="Beauty & Personal Care">Beauty & Personal Care</option>
                <option value="Fitness & Sports">Fitness & Sports</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Min Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="e.g. 50"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Max Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="e.g. 500"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Top-K Results
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
              >
                <option value={4}>Top 4 Matches</option>
                <option value={6}>Top 6 Matches</option>
                <option value={9}>Top 9 Matches</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer py-2">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                In Stock Only
              </label>
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Telemetry Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>
            Showing <strong>{results.length}</strong> semantic vector matches for{' '}
            <strong className="text-indigo-600 dark:text-indigo-400">&ldquo;{query}&rdquo;</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {cached !== null && (
            <span
              className={`px-3 py-1 rounded-full font-bold text-[11px] border ${
                cached
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {cached ? '⚡ Redis AI Cache HIT' : '🔍 ChromaDB Vector Computation (Cache MISS)'}
            </span>
          )}
          {cacheKey && (
            <span className="font-mono text-[10px] text-slate-500 hidden md:inline">
              Key: {cacheKey}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-56 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse p-6"
            />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="p-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
          <Package className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            No Semantic Matches Found
          </h3>
          <p className="text-xs text-slate-500">
            Try loosening your price or category filters, or try another natural language query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((item, idx) => {
            const matchPercent = Math.round((item.similarity_score || 0) * 100);
            return (
              <div
                key={`${item.product_id}-${idx}`}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-md hover:shadow-xl hover:border-indigo-400 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                      {item.category} • ID #{item.product_id}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs border border-emerald-200 dark:border-emerald-800">
                      {matchPercent}% Semantic Match
                    </span>
                  </div>

                  {/* Similarity Score Bar */}
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(15, matchPercent))}%` }}
                    />
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {item.name}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                    {item.snippet}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                      ₹{Number(item.price).toFixed(2)}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500">
                      {(item.stock ?? 0) > 0 ? `${item.stock} units in stock` : 'Out of Stock'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/products/${item.product_id}`)}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>View Product</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
