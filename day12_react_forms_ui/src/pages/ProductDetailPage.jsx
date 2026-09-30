import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productService } from '../api/productService';
import { cartService } from '../api/cartService';
import { getErrorMessage } from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Edit3,
  Upload,
  CheckCircle2,
  Package,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { cn } from '../lib/utils';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // Admin edit and image upload state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    price: '',
    stock: '',
    category: '',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const backendBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productService.getProductById(id);
      setProduct(data);
      setEditForm({
        name: data.name,
        price: data.price,
        stock: data.stock,
        category: data.category || 'General',
        description: data.description || '',
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const updated = await productService.updateProduct(id, {
        name: editForm.name.trim(),
        price: parseFloat(editForm.price),
        stock: parseInt(editForm.stock, 10),
        category: editForm.category.trim(),
        description: editForm.description.trim(),
      });
      setProduct(updated);
      setIsEditing(false);
      const msg = '✓ Product details updated successfully!';
      setSuccessMsg(msg);
      toast({
        title: 'Product Updated',
        description: `"${updated.name}" specifications updated.`,
        variant: 'success',
      });
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      toast({
        title: 'Update Failed',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleImageUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast({
        title: 'No Image Selected',
        description: 'Please select a file to upload.',
        variant: 'destructive',
      });
      return;
    }
    setUploading(true);
    try {
      const updated = await productService.uploadImage(id, selectedFile);
      setProduct(updated);
      setSelectedFile(null);
      const msg = '✓ Product image optimized and updated successfully!';
      setSuccessMsg(msg);
      toast({
        title: 'Image Optimized via Pillow',
        description: 'Converted to WebP and associated with product.',
        variant: 'success',
      });
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      toast({
        title: 'Upload Failed',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${product.name}"?`)) {
      return;
    }
    try {
      await productService.deleteProduct(id);
      alert(`Product "${product.name}" deleted.`);
      navigate('/');
    } catch (err) {
      alert(`Delete failed: ${getErrorMessage(err)}`);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/products/${id}` } } });
      return;
    }

    setAdding(true);
    setSuccessMsg(null);
    try {
      await cartService.addToCart(product.id, quantity);
      const msg = `✓ Added ${quantity} item(s) to your cart!`;
      setSuccessMsg(msg);
      toast({
        title: 'Added to Cart',
        description: `${quantity} unit(s) of "${product.name}" added to cart.`,
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Cart Error',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading product details..." />;
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 rounded-xl border border-destructive/20 bg-destructive/5 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
        <h2 className="text-xl font-bold text-destructive">Product Not Found</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-6">{error || 'The requested product does not exist.'}</p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Catalog
          </Button>
        </Link>
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      <Link
        to="/"
        className="nav-link inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Products
      </Link>

      {/* Success Banner */}
      {successMsg && (
        <div className="form-success mb-6 rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/60 p-4 text-center text-sm font-semibold text-emerald-900 dark:text-emerald-100 shadow-sm animate-in fade-in-0 duration-200">
          <span>{successMsg}</span>
          <Link to="/cart" className="ml-3 text-emerald-700 dark:text-emerald-300 underline font-bold">
            View Cart &rarr;
          </Link>
        </div>
      )}

      {/* Product Hero Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        {/* Left: Image Container */}
        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30 p-6">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="h-full w-full object-contain transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Package className="h-20 w-20 stroke-[1.2]" />
              <span className="text-xs mt-2">No image uploaded</span>
            </div>
          )}
        </div>

        {/* Right: Product Details & Purchase Form */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="product-category text-xs">
                {product.category || 'General'}
              </Badge>
              <Badge
                variant={isOutOfStock ? "destructive" : "outline"}
                className={cn(
                  "stock-tag text-xs font-medium",
                  !isOutOfStock && "text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                )}
              >
                {isOutOfStock ? "stock-out Out of Stock" : `stock-in Available Inventory: ${product.stock} units`}
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {product.name}
            </h1>

            <div className="product-price text-3xl font-extrabold text-foreground tracking-tight">
              ${Number(product.price).toFixed(2)}
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed pt-2">
              {product.description || 'No description provided.'}
            </p>
          </div>

          {/* Controlled Quantity & Add to Cart (Customers Only) */}
          {!isAdmin ? (
            <div className="space-y-4 pt-4 border-t border-border">
              {!isOutOfStock && (
                <div className="flex items-center gap-4">
                  <Label htmlFor="qty" className="text-sm font-semibold">
                    Quantity:
                  </Label>
                  <div className="flex items-center rounded-lg border border-input bg-background p-1 shadow-sm">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-sm"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <input
                      id="qty"
                      type="number"
                      min="1"
                      max={product.stock}
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setQuantity(Math.min(product.stock, Math.max(1, val)));
                        }
                      }}
                      className="form-input h-7 w-12 border-0 bg-transparent text-center text-sm font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      aria-label="Product quantity"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-sm"
                      onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                      disabled={quantity >= product.stock}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              <Button
                className="w-full text-base font-semibold py-6 shadow-md"
                disabled={isOutOfStock || adding}
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {adding ? 'Adding to Cart...' : isOutOfStock ? 'Sold Out' : '🛒 Add to Shopping Cart'}
              </Button>
            </div>
          ) : (
            <div className="pt-4 border-t border-border">
              <div className="rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 p-4 text-center">
                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-1.5">
                  <Shield className="h-4 w-4" />
                  <span>Admin Store Mode</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  You are viewing this product as Store Administrator. Use the controls below to edit details, upload images, or delete.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Operations Panel */}
      {isAdmin && (
        <Card className="mt-10 border-indigo-200 dark:border-indigo-900 bg-indigo-50/20 dark:bg-indigo-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span>Admin Product Controls</span>
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                {isEditing ? '✕ Cancel Edit' : '✏️ Edit Details'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteProduct}
                className="btn btn-danger"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete Product
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Inline Specifications Edit Form */}
            {isEditing && (
              <form onSubmit={handleUpdateProduct} className="rounded-lg border border-border bg-card p-4 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-foreground">Update Specifications</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">Name</Label>
                    <Input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Category</Label>
                    <Input
                      type="text"
                      required
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Inventory Stock</Label>
                    <Input
                      type="number"
                      min="0"
                      required
                      value={editForm.stock}
                      onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Description</Label>
                  <Textarea
                    rows={2}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <Button type="submit" size="sm" loading={savingEdit} className="bg-emerald-600 hover:bg-emerald-700">
                  Save Product Changes
                </Button>
              </form>
            )}

            {/* Pillow Image Upload Form */}
            <form onSubmit={handleImageUpload} className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-sm">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                <span>Upload New Product Image (Pillow WebP Optimizer)</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Select a JPEG, PNG, or WebP image. The server will resize and compress it to high-performance WebP.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  className="form-input text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={uploading || !selectedFile}
                  loading={uploading}
                >
                  Upload Image
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductDetailPage;
