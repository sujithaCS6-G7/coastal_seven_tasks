import React, { useState, useEffect } from 'react';
import { productService } from '../api/productService';
import { aiService } from '../api/aiService';
import { getErrorMessage } from '../api/axiosClient';
import { API_BASE_URL, getApiBaseUrl } from '../config/env';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { useToast } from './ui/toast';
import {
  X,
  PlusCircle,
  Edit3,
  Upload,
  AlertCircle,
  Loader2,
  DollarSign,
  Package,
  Folder,
  FileText,
  Sparkles,
} from 'lucide-react';

const CATEGORY_PRESETS = ['Electronics', 'Audio', 'Accessories', 'Office', 'Wearables', 'General'];

/**
 * ProductFormModal handles both Creating and Editing products for Admin users.
 * Supports image file upload to /products/{id}/image.
 * @param {{ isOpen: boolean, onClose: () => void, onSuccess: () => void, product?: any }} props
 */
export const ProductFormModal = ({
  isOpen,
  onClose,
  onSuccess,
  product = null, // If provided, mode is 'edit'; if null, mode is 'create'
}) => {
  const isEditMode = Boolean(product);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    category: 'Electronics',
    price: '',
    stock: '',
    description: '',
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiTone, setAiTone] = useState('professional');
  const [aiFeatures, setAiFeatures] = useState('');
  const [aiCacheBadge, setAiCacheBadge] = useState(null);
  const [aiHighlights, setAiHighlights] = useState([]);
  const [error, setError] = useState(null);

  // Sync form data when modal opens or initial product changes
  useEffect(() => {
    if (isOpen) {
      if (product) {
        setFormData({
          name: product.name || '',
          category: product.category || 'Electronics',
          price: product.price !== undefined ? String(product.price) : '',
          stock: product.stock !== undefined ? String(product.stock) : '',
          description: product.description || '',
        });
        setAiFeatures(product.description || '');
        setFilePreview(product.image_url ? (product.image_url.startsWith('http') ? product.image_url : `${getApiBaseUrl()}${product.image_url}`) : null);
      } else {
        setFormData({
          name: '',
          category: 'Electronics',
          price: '',
          stock: '10',
          description: '',
        });
        setAiFeatures('');
        setFilePreview(null);
      }
      setAiCacheBadge(null);
      setAiHighlights([]);
      setSelectedFile(null);
      setError(null);
    }
  }, [isOpen, product]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setFilePreview(previewUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setError('Product name must be at least 2 characters long.');
      return;
    }
    const parsedPrice = parseFloat(formData.price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('Please provide a valid price greater than ₹0.');
      return;
    }
    const parsedStock = parseInt(formData.stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      setError('Please provide a valid stock quantity (0 or greater).');
      return;
    }

    setSubmitting(true);
    try {
      let savedProduct;
      const payload = {
        name: formData.name.trim(),
        category: formData.category.trim() || 'General',
        price: parsedPrice,
        stock: parsedStock,
        description: formData.description.trim() || null,
      };

      if (isEditMode) {
        // Update product
        savedProduct = await productService.updateProduct(product.id, payload);
        toast({
          title: 'Product Updated',
          description: `"${savedProduct.name}" has been updated successfully.`,
          variant: 'success',
        });
      } else {
        // Create product
        savedProduct = await productService.createProduct(payload);
        toast({
          title: 'Product Created',
          description: `"${savedProduct.name}" has been added to catalog.`,
          variant: 'success',
        });
      }

      // If an image was selected, upload it
      if (selectedFile && savedProduct?.id) {
        try {
          await productService.uploadProductImage(savedProduct.id, selectedFile);
          toast({
            title: 'Image Uploaded',
            description: 'Product photo optimized and saved.',
            variant: 'info',
          });
        } catch (imgErr) {
          console.warn('Image upload failed:', imgErr);
          toast({
            title: 'Image Upload Notice',
            description: 'Product was saved, but image upload failed.',
            variant: 'warning',
          });
        }
      }

      if (onSuccess) {
        onSuccess(savedProduct);
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {isEditMode ? <Edit3 className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {isEditMode ? `Edit Product #${product.id}` : 'Create New Product'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEditMode ? 'Modify catalog details and specifications' : 'Add a new item to the live catalog'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Product Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" /> Product Title *
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Ultra Ergonomic Mechanical Keyboard"
                required
              />
            </div>

            {/* Category & Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Folder className="h-3.5 w-3.5 text-primary" /> Category *
              </label>
              <Input
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="Category name"
                required
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CATEGORY_PRESETS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, category: cat }))}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      formData.category.toLowerCase() === cat.toLowerCase()
                        ? 'border-primary bg-primary text-primary-foreground font-semibold'
                        : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Price & Stock Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-primary" /> Price (₹ INR / $) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="99.99"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-primary" /> Stock Quantity *
                </label>
                <Input
                  type="number"
                  min="0"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  placeholder="25"
                  required
                />
              </div>
            </div>

            {/* Description + Day 21 Admin-Only AI Description Generator */}
            <div className="space-y-2 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Description &amp; Admin Generative AI Copy</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {aiCacheBadge && (
                    <Badge variant="outline" className="text-[10px]">
                      {aiCacheBadge}
                    </Badge>
                  )}
                  <select
                    aria-label="Writing Tone"
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value)}
                    className="h-7 rounded-md border border-input bg-background px-2 text-[11px] font-semibold"
                  >
                    <option value="professional">Professional</option>
                    <option value="enthusiastic">Enthusiastic</option>
                    <option value="technical">Technical</option>
                    <option value="concise">Concise</option>
                  </select>
                  <button
                    type="button"
                    disabled={aiGenerating}
                    onClick={async () => {
                      const cleanName = formData.name.trim();
                      if (!cleanName || cleanName.length < 2) {
                        setError('Enter a Product Title first to generate an AI description.');
                        return;
                      }
                      if (/^\d+$/.test(cleanName)) {
                        setError(`Invalid product title: "${cleanName}" consists only of numbers. Please enter a descriptive product name (e.g. "Sony WH-1000XM5 Headphones").`);
                        return;
                      }
                      const alnumChars = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
                      if (cleanName.length >= 3 && new Set(alnumChars).size < 2) {
                        setError(`Invalid product title: "${cleanName}" is repetitive gibberish. Please enter a meaningful product title.`);
                        return;
                      }
                      const personalNames = [
                        'revathi', 'ramesh', 'suresh', 'priya', 'rahul', 'john', 'alex', 'david', 'kumar',
                        'pooja', 'kavitha', 'swathi', 'anita', 'rohit', 'sneha', 'vijay', 'ajay', 'sunil',
                        'deepak', 'anjali', 'manoj', 'sanjay', 'rajesh', 'vikram', 'amit', 'neha', 'divya',
                        'meena', 'geetha', 'lakshmi', 'bhanu', 'sai', 'ravi', 'kiran', 'prasad', 'satish',
                        'harish', 'venkat', 'naresh', 'srinu', 'raju', 'battu', 'sharma', 'singh', 'reddy',
                        'varma', 'patel', 'rao', 'gupta', 'mary', 'emily', 'michael', 'james'
                      ];
                      const words = cleanName.toLowerCase().split(/\s+/).filter(Boolean);
                      const validSingleWords = new Set([
                         'headphones', 'smartwatch', 'smartphone', 'keyboard', 'laptop',
                         'backpack', 'microphone', 'television', 'monitor', 'earbuds',
                         'earphones', 'speaker', 'mouse', 'camera', 'tablet', 'projector',
                         'smartband', 'powerbank', 'processor', 'smartplug', 'webcam',
                         'headset', 'soundbar', 'adapter', 'charger', 'cable'
                      ]);
                      if (words.length === 1 && !validSingleWords.has(words[0])) {
                        setError(
                          `"${cleanName}" is not a descriptive product title. In an e-commerce catalog, please provide a title with at least 2 words (e.g. "${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)} Cotton Saree" or "${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)} Wireless Earbuds").`
                        );
                        return;
                      }
                      if (words.length > 0 && words.every((w) => personalNames.includes(w))) {
                        setError(
                          `"${cleanName}" consists solely of personal names. In a real store catalog, please specify a product item (e.g. "${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)} Smart Watch" or "Cotton T-Shirt").`
                        );
                        return;
                      }
                      setError(null);
                      setAiGenerating(true);
                      try {
                        const parsedPrice = parseFloat(formData.price);
                        const isAlreadyAiGenerated = formData.description && (
                          formData.description.includes('solution engineered') ||
                          formData.description.includes('• Category:') ||
                          formData.description.includes('Verified Catalog')
                        );
                        const rawSource = aiFeatures || (isAlreadyAiGenerated ? '' : formData.description) || '';
                        const res = await aiService.generateProductDescription({
                          product_id: product?.id,
                          name: cleanName,
                          category: formData.category.trim() || 'Electronics',
                          price: !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : undefined,
                          features: rawSource
                            ? rawSource
                                .split(/[,.;]/)
                                .map((s) => s.trim())
                                .filter((s) => s.length > 2 && !s.includes('solution engineered'))
                                .slice(0, 6)
                            : [],
                          tone: aiTone,
                        });
                        setFormData((prev) => ({ ...prev, description: res.description }));
                        setAiHighlights(res.highlights || []);
                        setAiCacheBadge(res.cached ? '⚡ Redis Cache HIT' : '🔄 Redis Cache MISS');
                      } catch (err) {
                        setError(getErrorMessage(err));
                      } finally {
                        setAiGenerating(false);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>{aiGenerating ? 'Generating...' : '✨ Generate with AI'}</span>
                  </button>
                </div>
              </div>

              <Input
                value={aiFeatures}
                onChange={(e) => setAiFeatures(e.target.value)}
                placeholder="Key specs/features for AI prompt (e.g. 30h battery, ANC, USB-C)..."
                className="text-xs bg-background"
              />

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Enter detailed product description, technical specifications, and key features..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />

              {aiHighlights.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {aiHighlights.map((h, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium"
                    >
                      • {h}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Image File Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5 text-primary" /> Product Image (JPEG, PNG, WEBP)
              </label>

              <div className="flex items-center gap-4">
                {filePreview && (
                  <div className="h-16 w-16 shrink-0 rounded-lg border border-border bg-muted/30 overflow-hidden flex items-center justify-center p-1">
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}

                <label className="flex-1 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/10 p-3 hover:bg-muted/30 cursor-pointer transition-colors text-center">
                  <Upload className="h-4 w-4 text-muted-foreground mb-1" />
                  <span className="text-xs font-medium text-foreground">
                    {selectedFile ? selectedFile.name : 'Choose an image file'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Max size: 5MB &bull; Auto-optimized by Pillow
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 border-t border-border px-6 py-4 bg-muted/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isEditMode ? (
                <>
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Update Product</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Create Product</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
