/**
 * Utilitaire d'optimisation (FinOps) pour réduire le trafic sortant (Egress)
 */

export const getOptimizedImageUrl = (url: string | null | undefined, width: number = 400): string => {
  if (!url) return "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=800";
  
  // FINOPS FIX: Convert Firebase Cloud Storage URLs to use resized/WebP versions
  // Requires Firebase Extension "Resize Images" configured with matching dimensions
  if (url.includes('firebasestorage.googleapis.com')) {
    // Prevent double-suffixing if already compressed
    if (url.match(/_[0-9]+x[0-9]+(\.webp|\.jpg|\.png)/i)) {
      return url;
    }
    
    // Replace the extension with the resized WebP version to slash bandwidth costs by up to 80%
    return url.replace(/(\.jpg|\.png|\.jpeg)(?=\?alt=media)/i, `_${width}x${width}.webp`);
  }

  return url;
};
