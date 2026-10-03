import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge multiple Tailwind class values safely resolving conflicts.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
