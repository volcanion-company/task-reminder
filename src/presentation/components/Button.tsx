import { ReactNode, ButtonHTMLAttributes, memo } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

function ButtonComponent({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className,
  disabled,
  ...props 
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          // Variants
          'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary': variant === 'primary',
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary': variant === 'secondary',
          'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600': variant === 'danger',
          'bg-transparent hover:bg-accent text-foreground focus:ring-accent': variant === 'ghost',
          
          // Sizes
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

// Memoize to prevent unnecessary re-renders
export const Button = memo(ButtonComponent);
