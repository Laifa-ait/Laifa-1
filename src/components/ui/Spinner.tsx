import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'primary' | 'white' | 'muted';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
  xl: 'w-16 h-16',
};

const variantClasses = {
  primary: 'text-orange-500',
  white: 'text-white',
  muted: 'text-zinc-400',
};

export const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'md', 
  className = '',
  variant = 'primary'
}) => {
  return (
    <Loader2 
      className={`animate-spin ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} 
    />
  );
};
