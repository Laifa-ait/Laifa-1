import React from 'react';

interface PremiumLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const PremiumLayout: React.FC<PremiumLayoutProps> = ({ children, className = '' }) => {
  return (
    <div className={`w-full max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 lg:pt-16 pb-16 md:pb-24 lg:pb-32 ${className}`}>
      {children}
    </div>
  );
};
