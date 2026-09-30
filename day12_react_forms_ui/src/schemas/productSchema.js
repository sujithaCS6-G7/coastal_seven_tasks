import { z } from 'zod';

/**
 * Zod schema for Product Creation & Multi-Step Wizard validation.
 */
export const productFormSchema = z.object({
  // Step 1: Basic Details
  name: z
    .string()
    .min(2, { message: 'Product name must be at least 2 characters.' })
    .max(150, { message: 'Product name cannot exceed 150 characters.' }),
  category: z
    .string()
    .min(2, { message: 'Please select or enter a valid category.' }),
  sku: z
    .string()
    .min(3, { message: 'SKU code must be at least 3 characters.' })
    .optional()
    .or(z.literal('')),

  // Step 2: Pricing, Stock, and Specifications
  price: z
    .coerce
    .number({ invalid_type_error: 'Price must be a valid number.' })
    .positive({ message: 'Price must be greater than $0.00.' })
    .max(100000, { message: 'Price cannot exceed $100,000.00.' }),
  stock: z
    .coerce
    .number({ invalid_type_error: 'Stock must be a valid number.' })
    .int({ message: 'Stock must be an integer count.' })
    .min(0, { message: 'Stock quantity cannot be negative.' }),
  description: z
    .string()
    .min(5, { message: 'Please provide a descriptive overview (at least 5 characters).' })
    .max(1000, { message: 'Description cannot exceed 1000 characters.' }),

  // Dynamic tags / specifications
  tags: z.array(z.string().min(1, 'Tag cannot be empty')).optional(),
});
