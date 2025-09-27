import { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion, MotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = forwardRef<
  HTMLButtonElement,
  ButtonProps & MotionProps
>(({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  fullWidth = false,
  children,
  disabled,
  ...props
}, ref) => {
  const baseClasses = [
    'relative inline-flex items-center justify-center',
    'font-medium rounded-lg transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    fullWidth && 'w-full'
  ];

  const variants = {
    primary: [
      'bg-gradient-to-r from-cyan-500 to-blue-500 text-white',
      'hover:from-cyan-400 hover:to-blue-400',
      'focus:ring-cyan-500',
      'shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/50'
    ],
    secondary: [
      'bg-white/10 text-white border border-white/20',
      'hover:bg-white/20 hover:border-white/30',
      'focus:ring-white/50',
      'backdrop-blur-sm'
    ],
    ghost: [
      'text-gray-300 hover:text-white hover:bg-white/10',
      'focus:ring-gray-500'
    ],
    danger: [
      'bg-gradient-to-r from-red-500 to-pink-500 text-white',
      'hover:from-red-400 hover:to-pink-400',
      'focus:ring-red-500',
      'shadow-lg shadow-red-500/25 hover:shadow-red-500/50'
    ]
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm h-8',
    md: 'px-4 py-2 text-sm h-10',
    lg: 'px-6 py-3 text-base h-12'
  };

  return (
    <motion.button
      ref={ref}
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      {...props}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      <div className={cn(
        'flex items-center gap-2',
        isLoading && 'opacity-0'
      )}>
        {icon}
        {children}
      </div>
    </motion.button>
  );
});

Button.displayName = 'Button';

export { Button };
