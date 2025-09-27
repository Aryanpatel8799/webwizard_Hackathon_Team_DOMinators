import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  className,
  type = 'text',
  label,
  error,
  helperText,
  icon,
  fullWidth = false,
  ...props
}, ref) => {
  const hasError = Boolean(error);

  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
      {label && (
        <label className="text-sm font-medium text-gray-300">
          {label}
          {props.required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        
        <input
          type={type}
          className={cn(
            'w-full px-4 py-2 rounded-lg',
            'bg-white/5 border border-white/10',
            'text-white placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent',
            'transition-all duration-200',
            'backdrop-blur-sm',
            hasError && 'border-red-500 focus:ring-red-500',
            icon && 'pl-10',
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
      
      {(error || helperText) && (
        <p className={cn(
          'text-xs',
          hasError ? 'text-red-400' : 'text-gray-500'
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export { Input };
