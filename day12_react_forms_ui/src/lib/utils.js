import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind classes cleanly resolving any class conflicts.
 * Standard helper for shadcn/ui components.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
