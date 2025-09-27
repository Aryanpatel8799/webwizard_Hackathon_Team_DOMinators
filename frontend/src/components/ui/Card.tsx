import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hover = false,
  glass = true
}) => {
  return (
    <motion.div
      className={cn(
        'rounded-xl border transition-all duration-300',
        glass ? [
          'bg-white/5 backdrop-blur-md border-white/10',
          'shadow-lg shadow-black/20'
        ] : [
          'bg-gray-800 border-gray-700',
          'shadow-lg shadow-gray-900/50'
        ],
        hover && 'hover:shadow-xl hover:shadow-cyan-500/20 hover:border-cyan-500/30',
        className
      )}
      whileHover={hover ? { y: -2, scale: 1.02 } : undefined}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn('p-6 pb-0', className)}>
      {children}
    </div>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  );
};

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn('p-6 pt-0', className)}>
      {children}
    </div>
  );
};
