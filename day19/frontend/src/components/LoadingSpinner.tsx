import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export interface LoadingSpinnerProps {
  text?: string;
  size?: 'sm' | 'default' | 'lg' | string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  text = 'Loading catalog...',
  size = 'default',
  className = '',
}) => {
  const sizeClasses: Record<string, string> = {
    sm: 'h-5 w-5',
    default: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center text-muted-foreground',
        className
      )}
    >
      <Loader2
        className={cn(
          'animate-spin text-primary mb-3',
          sizeClasses[size] || sizeClasses.default
        )}
      />
      {text && <p className="text-sm font-medium tracking-wide">{text}</p>}
      <span className="sr-only">Loading</span>
    </div>
  );
};

export default LoadingSpinner;
