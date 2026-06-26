import React, { useState } from 'react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  className?: string;
}

const DEFAULT_FALLBACK = '/placeholder-product.png';

export const SafeImage: React.FC<SafeImageProps> = ({ 
  src, 
  alt, 
  fallback = DEFAULT_FALLBACK,
  className,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(src || fallback);
  const [hasError, setHasError] = useState(false);
  
  const handleError = () => {
    if (!hasError) {
      setImgSrc(fallback);
      setHasError(true);
    }
  };
  
  return (
    <img 
      src={imgSrc} 
      alt={alt} 
      className={className}
      onError={handleError}
      loading="lazy"
      {...props}
    />
  );
};
