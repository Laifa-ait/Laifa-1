import React, { useState, useEffect } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { Product } from '../../types';
import { ProductCard } from '../Product/ProductCard';

interface VirtualizedProductGridProps {
  products: Product[];
  variant?: 'default' | 'compact' | 'premium_immersive';
}

export const VirtualizedProductGrid: React.FC<VirtualizedProductGridProps> = ({ products, variant = 'default' }) => {
  const [cols, setCols] = useState(2);
  
  useEffect(() => {
    const updateCols = () => {
      const width = window.innerWidth;
      if (width >= 1536) setCols(6);
      else if (width >= 1280) setCols(5);
      else if (width >= 768) setCols(4);
      else if (width >= 640) setCols(3);
      else setCols(2);
    };
    updateCols();
    window.addEventListener('resize', updateCols, { passive: true });
    return () => window.removeEventListener('resize', updateCols);
  }, []);

  const rowCount = Math.ceil(products.length / cols);
  
  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => 400,
    overscan: 2,
  });

  return (
    <div
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
      }}
    >
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const startIndex = virtualRow.index * cols;
        const rowProducts = products.slice(startIndex, startIndex + cols);

        return (
          <div
            key={virtualRow.key}
            ref={rowVirtualizer.measureElement}
            data-index={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6 md:gap-8 pb-4 sm:gap-y-6 md:gap-y-8"
          >
            {rowProducts.map((product, i) => (
              <div key={product.id}>
                <ProductCard product={product} index={startIndex + i} variant={variant as any} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};
