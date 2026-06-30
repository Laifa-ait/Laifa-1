/**
 * Utilitaire d'optimisation (FinOps) pour réduire le trafic sortant (Egress)
 */

export const getOptimizedImageUrl = (url: string | null | undefined, width: number = 400): string => {
  if (!url) return "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=800";
  
  // Safe default: use original URL directly because rewriting Firebase Storage URLs 
  // without the actual Resize Extension output files will break the images with 404 / 403 errors.
  return url;
};
