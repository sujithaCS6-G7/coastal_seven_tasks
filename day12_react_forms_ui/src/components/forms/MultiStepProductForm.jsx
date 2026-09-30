import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productFormSchema } from '../../schemas/productSchema';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { ImageDropzone } from './ImageDropzone';
import { useToast } from '../ui/toast';
import { productService } from '../../api/productService';
import { Check, ChevronRight, ChevronLeft, Sparkles, Tag, Plus, Trash2, Package } from 'lucide-react';
import { cn } from '../../lib/utils';

const STEPS = [
  { id: 1, title: 'Basic Info', desc: 'Name, Category & SKU' },
  { id: 2, title: 'Pricing & Specs', desc: 'Price, Stock & Description' },
  { id: 3, title: 'Media & Upload', desc: 'Dropzone Image Preview' },
  { id: 4, title: 'Review & Launch', desc: 'Summary & Confirmation' },
];

export const MultiStepProductForm = ({ onProductCreated, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedImage, setSelectedImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productFormSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      category: 'Electronics',
      sku: '',
      price: '',
      stock: '',
      description: '',
      tags: ['New Release', 'Featured'],
    },
  });

  const formValues = watch();

  // Dynamic tags management
  const handleAddTag = (e) => {
    e.preventDefault();
    if (newTagInput.trim()) {
      const currentTags = formValues.tags || [];
      if (!currentTags.includes(newTagInput.trim())) {
        setValue('tags', [...currentTags, newTagInput.trim()]);
      }
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (indexToRemove) => {
    const currentTags = formValues.tags || [];
    setValue(
      'tags',
      currentTags.filter((_, i) => i !== indexToRemove)
    );
  };

  // Step validation before advancing
  const handleNextStep = async () => {
    let fieldsToValidate = [];
    if (currentStep === 1) {
      fieldsToValidate = ['name', 'category', 'sku'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['price', 'stock', 'description'];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((prev) => Math.min(STEPS.length, prev + 1));
    } else {
      toast({
        title: 'Validation Error',
        description: 'Please review and correct the highlighted fields before proceeding.',
        variant: 'destructive',
      });
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // Final Form Submission
  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      // 1. Format payload matching FastAPI backend requirements
      const payload = {
        name: data.name.trim(),
        category: data.category.trim(),
        price: parseFloat(data.price),
        stock: parseInt(data.stock, 10),
        description: `${data.description.trim()} ${
          data.tags && data.tags.length > 0 ? `[Tags: ${data.tags.join(', ')}]` : ''
        }`.trim(),
      };

      // 2. Call FastAPI backend product creation
      const createdProduct = await productService.createProduct(payload);

      // 3. If an image file was selected in Step 3, upload and compress it via Pillow
      if (selectedImage && createdProduct.id) {
        await productService.uploadImage(createdProduct.id, selectedImage);
      }

      toast({
        title: '🚀 Product Published Successfully!',
        description: `"${createdProduct.name}" has been created with ID #${createdProduct.id}.`,
        variant: 'success',
      });

      if (onProductCreated) {
        onProductCreated(createdProduct);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail || err.message || 'Failed to publish product to backend.';
      toast({
        title: 'Submission Failed',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto rounded-xl border border-border bg-card p-6 shadow-sm">
      {/* Header and Stepper Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>Multi-Step Product Launch Wizard</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Powered by React Hook Form, Zod Schema Validation & React Dropzone
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            Step {currentStep} of {STEPS.length}
          </Badge>
        </div>

        {/* Stepper Progress Steps */}
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col border-t-2 pt-2 transition-colors",
                  isCompleted && "border-emerald-500 text-emerald-600 dark:text-emerald-400",
                  isCurrent && "border-primary text-primary font-semibold",
                  !isCompleted && !isCurrent && "border-muted text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-1.5 text-xs">
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      isCompleted && "bg-emerald-500 text-white",
                      isCurrent && "bg-primary text-primary-foreground",
                      !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? <Check className="h-3 w-3" /> : step.id}
                  </span>
                  <span className="hidden sm:inline truncate">{step.title}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* ================= STEP 1: BASIC INFORMATION ================= */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div>
              <Label htmlFor="product-name" className="text-sm font-semibold">
                Product Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="product-name"
                placeholder="e.g. Ergonomic Mechanical Keyboard"
                {...register('name')}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
                className="mt-1.5"
              />
              {errors.name && (
                <p id="name-error" role="alert" className="text-xs font-medium text-destructive mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product-category" className="text-sm font-semibold">
                  Category <span className="text-destructive">*</span>
                </Label>
                <select
                  id="product-category"
                  {...register('category')}
                  className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                >
                  <option value="Electronics">Electronics</option>
                  <option value="Peripherals">Peripherals</option>
                  <option value="Audio">Audio</option>
                  <option value="Wearables">Wearables</option>
                  <option value="Accessories">Accessories</option>
                </select>
                {errors.category && (
                  <p role="alert" className="text-xs font-medium text-destructive mt-1">
                    {errors.category.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="product-sku" className="text-sm font-semibold">
                  SKU / Product Code <span className="text-muted-foreground text-xs">(Optional)</span>
                </Label>
                <Input
                  id="product-sku"
                  placeholder="e.g. KB-RGB-99"
                  {...register('sku')}
                  aria-invalid={!!errors.sku}
                  className="mt-1.5"
                />
                {errors.sku && (
                  <p role="alert" className="text-xs font-medium text-destructive mt-1">
                    {errors.sku.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: PRICING, STOCK & SPECS ================= */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product-price" className="text-sm font-semibold">
                  Price ($ USD) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="product-price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 79.99"
                  {...register('price')}
                  aria-invalid={!!errors.price}
                  aria-describedby={errors.price ? 'price-error' : undefined}
                  className="mt-1.5"
                />
                {errors.price && (
                  <p id="price-error" role="alert" className="text-xs font-medium text-destructive mt-1">
                    {errors.price.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="product-stock" className="text-sm font-semibold">
                  Initial Inventory Stock <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="product-stock"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 25"
                  {...register('stock')}
                  aria-invalid={!!errors.stock}
                  aria-describedby={errors.stock ? 'stock-error' : undefined}
                  className="mt-1.5"
                />
                {errors.stock && (
                  <p id="stock-error" role="alert" className="text-xs font-medium text-destructive mt-1">
                    {errors.stock.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="product-description" className="text-sm font-semibold">
                Overview & Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="product-description"
                rows={3}
                placeholder="Describe key features, build material, compatibility..."
                {...register('description')}
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? 'desc-error' : undefined}
                className="mt-1.5"
              />
              {errors.description && (
                <p id="desc-error" role="alert" className="text-xs font-medium text-destructive mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Dynamic Tags Input */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                <span>Dynamic Product Tags (Press Enter or click Add)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(e);
                    }
                  }}
                  placeholder="Add a highlight tag, e.g. RGB Backlit"
                  className="h-8 text-xs"
                />
                <Button id="add-tag-btn" type="button" size="sm" variant="secondary" onClick={handleAddTag}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Tag
                </Button>
              </div>

              {/* Render dynamic tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(formValues.tags || []).map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full text-xs"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(idx)}
                      className="hover:text-destructive focus:outline-none"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: MEDIA UPLOAD VIA DROPZONE ================= */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div>
              <Label className="text-sm font-semibold">Product Hero Image</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                Upload a high-resolution image. The backend Pillow service will automatically optimize it to WebP.
              </p>
              <ImageDropzone
                selectedFile={selectedImage}
                onFileSelect={(file) => setSelectedImage(file)}
                onFileRemove={() => setSelectedImage(null)}
                maxSizeMB={5}
              />
            </div>
          </div>
        )}

        {/* ================= STEP 4: REVIEW & LAUNCH ================= */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span>Review Product Specifications</span>
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Product Name:</span>
                  <p className="font-semibold text-foreground">{formValues.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <p className="font-semibold text-foreground">{formValues.category}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Price:</span>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                    ${parseFloat(formValues.price || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Inventory:</span>
                  <p className="font-semibold text-foreground">{formValues.stock} units</p>
                </div>
                {formValues.sku && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">SKU:</span>
                    <p className="font-mono text-foreground">{formValues.sku}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-muted-foreground">Overview:</span>
                  <p className="text-foreground mt-0.5">{formValues.description}</p>
                </div>
                {formValues.tags && formValues.tags.length > 0 && (
                  <div className="col-span-2 flex flex-wrap gap-1 mt-1">
                    {formValues.tags.map((t, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">
                        #{t}
                      </Badge>
                    ))}
                  </div>
                )}
                {selectedImage && (
                  <div className="col-span-2 flex items-center gap-3 pt-2 border-t border-border">
                    <img
                      src={URL.createObjectURL(selectedImage)}
                      alt="Thumbnail"
                      className="h-12 w-12 rounded object-contain border border-border bg-background"
                    />
                    <div>
                      <p className="font-medium text-foreground">{selectedImage.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(selectedImage.size / 1024).toFixed(1)} KB • WebP Ready
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stepper Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
          <div>
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrevStep}
                disabled={submitting}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
            )}
            {currentStep === 1 && onCancel && (
              <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>

          <div>
            {currentStep < STEPS.length ? (
              <Button type="button" size="sm" onClick={handleNextStep}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button type="submit" size="sm" loading={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                <Check className="h-4 w-4 mr-1.5" /> Publish to Catalog
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
