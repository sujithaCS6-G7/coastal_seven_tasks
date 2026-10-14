import React, { useState, useMemo } from 'react';
import {
  useProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} from '../hooks/useProducts';
import { useAdminOrdersQuery, useUpdateOrderStatusMutation } from '../hooks/useOrders';
import { getErrorMessage } from '../api/axiosClient';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { useToast } from '../components/ui/toast';
import {
  Shield,
  Package,
  ShoppingBag,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  DollarSign,
  CheckCircle2,
  Clock,
  Search,
  X,
  User,
  MapPin,
  MessageSquare,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';
import LiveChatWidget from '../components/LiveChatWidget';
import {
  AdminBackgroundJobsCenter,
  OrderInvoiceGenerator,
} from '../components/BackgroundJobsPanel';
import { aiService } from '../api/aiService';
import type { ProductDescriptionResponse } from '../types/ai';
import type { AdminOrderOut, OrderStatus, Product, ProductCreatePayload } from '../types/api';

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

const CATEGORY_OPTIONS = ['Electronics', 'Audio', 'Accessories', 'Peripherals', 'Displays', 'Computers', 'Smartphones', 'Monitors'];

interface ProductFormState {
  name: string;
  category: string;
  price: string;
  stock: string;
  description: string;
}

const INITIAL_PRODUCT_FORM: ProductFormState = {
  name: '',
  category: 'Electronics',
  price: '',
  stock: '',
  description: '',
};

export const AdminDashboardPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'jobs' | 'chat'>('products');


  // Product CRUD states
  const [productSearch, setProductSearch] = useState<string>('');
  const [showProductForm, setShowProductForm] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formState, setFormState] = useState<ProductFormState>(INITIAL_PRODUCT_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // Admin-Only Day 21 Generative AI Product Description states
  const [aiTone, setAiTone] = useState<'professional' | 'enthusiastic' | 'technical' | 'concise'>('professional');
  const [aiFeaturesInput, setAiFeaturesInput] = useState<string>('');
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<ProductDescriptionResponse | null>(null);

  // Order filter state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // TanStack Query: Products & Mutations
  const {
    data: productData,
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useProductsQuery('All');
  const createProductMutation = useCreateProductMutation();
  const updateProductMutation = useUpdateProductMutation();
  const deleteProductMutation = useDeleteProductMutation();

  // TanStack Query: Admin Orders & Status Mutation
  const {
    data: orders = [],
    isLoading: ordersLoading,
    isFetching: ordersFetching,
    refetch: refetchOrders,
  } = useAdminOrdersQuery('all');
  const updateOrderStatusMutation = useUpdateOrderStatusMutation();

  const products: Product[] = productData?.products || [];

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'ALL') return orders;
    return orders.filter(
      (o: AdminOrderOut) => (o.status || '').toUpperCase() === statusFilter
    );
  }, [orders, statusFilter]);

  const kpiMetrics = useMemo(() => {
    const totalRevenue = orders.reduce(
      (sum: number, o: AdminOrderOut) => sum + Number(o.total_amount || 0),
      0
    );
    const deliveredCount = orders.filter(
      (o: AdminOrderOut) => (o.status || '').toUpperCase() === 'DELIVERED'
    ).length;
    const activeOrdersCount = orders.filter((o: AdminOrderOut) =>
      ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(
        (o.status || '').toUpperCase()
      )
    ).length;

    return {
      totalProducts: products.length,
      totalOrders: orders.length,
      totalRevenue,
      deliveredCount,
      activeOrdersCount,
    };
  }, [products.length, orders]);

  const handleOpenCreateForm = () => {
    setEditingProduct(null);
    setFormState(INITIAL_PRODUCT_FORM);
    setAiFeaturesInput('');
    setAiResult(null);
    setFormError(null);
    setShowProductForm(true);
  };

  const handleOpenEditForm = (product: Product) => {
    setEditingProduct(product);
    setFormState({
      name: product.name,
      category: product.category || 'Electronics',
      price: String(product.price),
      stock: String(product.stock),
      description: product.description || '',
    });
    setAiFeaturesInput(product.description || '');
    setAiResult(null);
    setFormError(null);
    setShowProductForm(true);
  };

  const handleCloseProductForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    setFormState(INITIAL_PRODUCT_FORM);
    setAiFeaturesInput('');
    setAiResult(null);
    setFormError(null);
  };

  const handleGenerateAiDescription = async (overrideProduct?: Product) => {
    const targetName = (overrideProduct ? overrideProduct.name : formState.name).trim();
    const targetCategory = (overrideProduct ? overrideProduct.category : formState.category).trim() || 'Electronics';
    const targetPrice = Number(overrideProduct ? overrideProduct.price : formState.price);
    const rawFeatures = overrideProduct ? (overrideProduct.description || '') : (aiFeaturesInput || formState.description);

    if (!targetName) {
      setFormError('Please enter a Product Name first before generating an AI description.');
      return;
    }

    setFormError(null);
    setAiGenerating(true);
    try {
      const featuresList = rawFeatures
        ? rawFeatures
            .split(/[,.;]/)
            .map((s) => s.trim())
            .filter((s) => s.length > 2)
            .slice(0, 6)
        : [];
      const res = await aiService.generateProductDescription({
        product_id: overrideProduct?.id ?? editingProduct?.id,
        name: targetName,
        category: targetCategory,
        price: !Number.isNaN(targetPrice) && targetPrice > 0 ? targetPrice : undefined,
        features: featuresList,
        tone: aiTone,
      });
      setAiResult(res);
      setFormState((prev) => ({
        ...prev,
        description: res.description,
      }));
      toast({
        title: res.cached ? 'AI Description Loaded (Redis Cache HIT)' : 'AI Description Generated',
        description: `Generated ${res.tone} copy for "${targetName}" via ${res.provider_used}. Click Save to update catalog!`,
        variant: 'success',
      });
    } catch (err) {
      const msg = getErrorMessage(err);
      setFormError(msg);
      toast({
        title: 'AI Description Generation Failed',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleProductFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsedPrice = Number(formState.price);
    const parsedStock = Number(formState.stock);

    if (!formState.name.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setFormError('Price must be a valid positive number.');
      return;
    }
    if (Number.isNaN(parsedStock) || parsedStock < 0) {
      setFormError('Stock quantity must be 0 or greater.');
      return;
    }

    setFormError(null);
    const payload: ProductCreatePayload = {
      name: formState.name.trim(),
      category: formState.category.trim() || 'Electronics',
      price: parsedPrice,
      stock: parsedStock,
      description: formState.description.trim() || null,
    };

    try {
      if (editingProduct) {
        await updateProductMutation.mutateAsync({
          id: editingProduct.id,
          data: payload,
        });
        toast({
          title: 'Product Updated',
          description: `"${payload.name}" was updated in the catalog.`,
          variant: 'success',
        });
      } else {
        await createProductMutation.mutateAsync(payload);
        toast({
          title: 'Product Created',
          description: `"${payload.name}" was added to the catalog.`,
          variant: 'success',
        });
      }
      handleCloseProductForm();
    } catch (err) {
      const msg = getErrorMessage(err);
      setFormError(msg);
      toast({
        title: 'Product Save Failed',
        description: msg,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    try {
      await deleteProductMutation.mutateAsync(product.id);
      toast({
        title: 'Product Deleted',
        description: `"${product.name}" has been removed from the catalog.`,
        variant: 'default',
      });
    } catch (err) {
      toast({
        title: 'Delete Failed',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    }
  };

  const handleOrderStatusUpdate = async (orderId: number, newStatus: OrderStatus) => {
    try {
      await updateOrderStatusMutation.mutateAsync({ orderId, newStatus });
      toast({
        title: 'Order Status Updated',
        description: `Order #${orderId} status changed to ${newStatus}.`,
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Status Update Failed',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Shield className="h-7 w-7 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Admin Control Center
            </h1>
            <Badge className="bg-indigo-600 text-white text-xs">
              Product CRUD &amp; Order Management
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Centralized administrator dashboard connected to FastAPI /products and /orders/admin/all
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant={activeTab === 'products' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('products')}
            className="text-xs gap-1.5"
          >
            <Package className="h-3.5 w-3.5" />
            <span>Products ({products.length})</span>
          </Button>
          <Button
            type="button"
            variant={activeTab === 'orders' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('orders')}
            className="text-xs gap-1.5"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Customer Orders ({orders.length})</span>
          </Button>
          <Button
            type="button"
            variant={activeTab === 'jobs' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('jobs')}
            data-testid="admin-tab-jobs"
            className="text-xs gap-1.5"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Background Jobs &amp; CSV Import</span>
          </Button>
          <Button
            type="button"
            variant={activeTab === 'chat' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('chat')}
            className="text-xs gap-1.5"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Live Support Chat</span>
          </Button>
        </div>
      </div>


      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <Card className="border border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Catalog Products</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">
                {kpiMetrics.totalProducts}
              </p>
            </div>
            <Package className="h-8 w-8 text-primary/40" />
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Orders</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">
                {kpiMetrics.totalOrders}
              </p>
            </div>
            <ShoppingBag className="h-8 w-8 text-indigo-500/40" />
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Gross Revenue</p>
              <p className="text-2xl font-extrabold font-mono text-foreground mt-1">
                ₹{kpiMetrics.totalRevenue.toFixed(2)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-emerald-500/40" />
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Fulfillment</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">
                {kpiMetrics.activeOrdersCount}
              </p>
            </div>
            <Clock className="h-8 w-8 text-amber-500/40" />
          </CardContent>
        </Card>
      </div>

      {/* TAB 1: PRODUCT CRUD MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Input
                placeholder="Search catalog products by name or category..."
                value={productSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setProductSearch(e.target.value)
                }
                className="pl-8 text-xs"
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetchProducts()}
                className="text-xs gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleOpenCreateForm}
                className="text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Add New Product
              </Button>
            </div>
          </div>

          {/* Create / Edit Product Form Panel */}
          {showProductForm && (
            <Card className="border border-primary/40 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
                <div>
                  <CardTitle className="text-base font-bold">
                    {editingProduct ? `Edit Product #${editingProduct.id}` : 'Create New Product'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {editingProduct
                      ? 'Update product fields via PUT /products/:id'
                      : 'Add a new catalog item via POST /products/'}
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={handleCloseProductForm}
                  aria-label="Close product form"
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </CardHeader>

              <CardContent className="pt-4">
                {formError && (
                  <div
                    role="alert"
                    className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
                  >
                    {formError}
                  </div>
                )}

                <form onSubmit={handleProductFormSubmit} className="space-y-4" noValidate>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="admin-product-name" className="text-xs font-semibold">
                        Product Name
                      </label>
                      <Input
                        id="admin-product-name"
                        placeholder="e.g. Mechanical Keyboard Pro"
                        value={formState.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormState((prev) => ({ ...prev, name: e.target.value }))
                        }
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="admin-product-category" className="text-xs font-semibold">
                        Category
                      </label>
                      <select
                        id="admin-product-category"
                        value={formState.category}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          setFormState((prev) => ({ ...prev, category: e.target.value }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                      >
                        {CATEGORY_OPTIONS.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="admin-product-price" aria-label="Price ($)" className="text-xs font-semibold">
                        Price (₹)
                      </label>
                      <Input
                        id="admin-product-price"
                        type="number"
                        step="0.01"
                        placeholder="e.g. 149.99"
                        value={formState.price}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormState((prev) => ({ ...prev, price: e.target.value }))
                        }
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="admin-product-stock" className="text-xs font-semibold">
                        Stock Quantity
                      </label>
                      <Input
                        id="admin-product-stock"
                        type="number"
                        placeholder="e.g. 25"
                        value={formState.stock}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormState((prev) => ({ ...prev, stock: e.target.value }))
                        }
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* Day 21 Admin-Only Generative AI Product Description Studio */}
                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                          <Sparkles className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-foreground">
                              Generative AI Product Description Studio (Admin Only)
                            </span>
                            <Badge className="bg-indigo-600 text-white text-[10px]">
                              AI + Redis Cache
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Auto-generate factual product descriptions &amp; SEO highlights while creating or editing a catalog product.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          aria-label="AI Writing Tone"
                          value={aiTone}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            setAiTone(
                              e.target.value as 'professional' | 'enthusiastic' | 'technical' | 'concise'
                            )
                          }
                          className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-semibold"
                        >
                          <option value="professional">Tone: Professional</option>
                          <option value="enthusiastic">Tone: Enthusiastic</option>
                          <option value="technical">Tone: Technical</option>
                          <option value="concise">Tone: Concise</option>
                        </select>

                        <Button
                          type="button"
                          size="sm"
                          disabled={aiGenerating}
                          onClick={() => void handleGenerateAiDescription()}
                          className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>
                            {aiGenerating ? 'Generating AI Copy...' : '✨ Generate with AI'}
                          </span>
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="admin-ai-features" className="text-[11px] font-semibold text-muted-foreground">
                          Key Features / Specs for AI Prompt (comma-separated, optional)
                        </label>
                        <Input
                          id="admin-ai-features"
                          placeholder="e.g. 30-hour battery, active noise cancellation, USB-C fast charge"
                          value={aiFeaturesInput}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setAiFeaturesInput(e.target.value)
                          }
                          className="text-xs bg-background"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="admin-product-description" className="text-xs font-semibold">
                          Description
                        </label>
                        <Input
                          id="admin-product-description"
                          placeholder="Product description and specifications..."
                          value={formState.description}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormState((prev) => ({ ...prev, description: e.target.value }))
                          }
                          className="text-xs bg-background"
                        />
                      </div>
                    </div>

                    {aiResult && (
                      <div className="rounded-lg border border-indigo-500/20 bg-background/90 p-3 space-y-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            ✨ AI Generated Output ({aiResult.tone} tone)
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant={aiResult.cached ? 'success' : 'secondary'} className="text-[10px]">
                              {aiResult.cached ? '⚡ Redis Cache HIT' : '🔄 Redis Cache MISS'}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              Provider: {aiResult.provider_used}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-foreground leading-relaxed">{aiResult.description}</p>
                        {aiResult.highlights?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {aiResult.highlights.map((h: string, i: number) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium"
                              >
                                • {h}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCloseProductForm}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        createProductMutation.isPending || updateProductMutation.isPending
                      }
                      loading={
                        createProductMutation.isPending || updateProductMutation.isPending
                      }
                      className="text-xs"
                    >
                      {editingProduct ? 'Save Changes' : 'Create Product'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Products Table */}
          {productsLoading ? (
            <LoadingSpinner text="Loading products for admin management..." />
          ) : (
            <Card className="border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Stock</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProducts.map((product) => (
                      <tr
                        key={product.id}
                        data-testid={`admin-product-row-${product.id}`}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          #{product.id}
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground">{product.name}</td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary" className="text-[11px]">
                            {product.category}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-foreground">
                          ₹{Number(product.price).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={product.stock > 0 ? 'success' : 'destructive'}>
                            {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleOpenEditForm(product);
                              void handleGenerateAiDescription(product);
                            }}
                            className="h-7 px-2.5 text-xs gap-1 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                          >
                            <Sparkles className="h-3 w-3" /> ✨ AI Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditForm(product)}
                            aria-label={`Edit ${product.name}`}
                            className="h-7 px-2.5 text-xs gap-1"
                          >
                            <Edit3 className="h-3 w-3" /> Edit
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteProduct(product)}
                            aria-label={`Delete ${product.name}`}
                            className="h-7 px-2.5 text-xs gap-1"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: CUSTOMER ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {['ALL', ...ORDER_STATUS_OPTIONS].map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={statusFilter === status ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(status)}
                  className="text-xs h-8 px-3"
                >
                  {status}
                </Button>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetchOrders()}
              disabled={ordersFetching}
              className="text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${ordersFetching ? 'animate-spin' : ''}`} />
              <span>Sync Orders</span>
            </Button>
          </div>

          {ordersLoading ? (
            <LoadingSpinner text="Loading all customer orders..." />
          ) : filteredOrders.length === 0 ? (
            <Card className="border border-border text-center py-12">
              <CardContent className="space-y-2">
                <ShoppingBag className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-bold text-foreground">No matching customer orders</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order: AdminOrderOut) => (
                <Card
                  key={order.id}
                  data-testid={`admin-order-card-${order.id}`}
                  className="border border-border shadow-sm"
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-extrabold font-mono text-foreground">
                            {order.order_number || `ORD-#${order.id}`}
                          </span>
                          <Badge variant="default" className="text-xs">
                            {order.status}
                          </Badge>
                          {order.user && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" /> {order.user.username} ({order.user.email})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {order.shipping_address}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-muted-foreground block">Total</span>
                        <span className="text-lg font-extrabold font-mono text-foreground">
                          ₹{Number(order.total_amount).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Status Update Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        {(order.items || []).map((i) => `${i.quantity}x ${i.product_name}`).join(', ')}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                          Set Status:
                        </span>
                        {ORDER_STATUS_OPTIONS.map((st) => (
                          <Button
                            key={st}
                            type="button"
                            size="sm"
                            variant={
                              (order.status || '').toUpperCase() === st ? 'default' : 'outline'
                            }
                            disabled={(order.status || '').toUpperCase() === st}
                            onClick={() => handleOrderStatusUpdate(order.id, st)}
                            className="h-7 px-2 text-[11px]"
                          >
                            {st}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Day 18: Asynchronous PDF Invoice Generator per order */}
                    <OrderInvoiceGenerator
                      orderId={order.id}
                      orderNumber={order.order_number || `ORD-#${order.id}`}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DAY 18 BACKGROUND JOBS (CELERY CSV IMPORT + N+1 SQL OPTIMIZATION) */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <AdminBackgroundJobsCenter />
        </div>
      )}

      {/* TAB 4: ADMIN <-> CUSTOMER LIVE SUPPORT CHAT */}
      {activeTab === 'chat' && (
        <div className="space-y-4">
          <LiveChatWidget mode="embedded" />
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;

