import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants: Record<string, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
  outline:
    'border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
};

const buttonSizes: Record<string, string> = {
  default: 'h-9 px-4 py-2 text-sm',
  sm: 'h-8 rounded-md px-3 text-xs',
  lg: 'h-10 rounded-md px-8 text-base',
  icon: 'h-9 w-9 p-0',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants | string;
  size?: keyof typeof buttonSizes | string;
  loading?: boolean;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      loading = false,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    if (asChild && React.isValidElement(children)) {
      const childElement = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(childElement, {
        className: cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none',
          buttonVariants[variant] || buttonVariants.default,
          buttonSizes[size] || buttonSizes.default,
          className,
          childElement.props.className
        ),
        ...props,
      });
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none',
          buttonVariants[variant] || buttonVariants.default,
          buttonSizes[size] || buttonSizes.default,
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export default Button;
