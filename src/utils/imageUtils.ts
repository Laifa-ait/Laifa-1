/**
 * Utilitaire d'optimisation (FinOps) pour réduire le trafic sortant (Egress)
 */

export const getOptimizedImageUrl = (url: string | null | undefined, width: number = 400): string => {
  if (!url) return "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=800";
  
  if (url.includes("unsplash.com")) {
    const urlObj = new URL(url);
    urlObj.searchParams.set("w", width.toString());
    urlObj.searchParams.set("q", "80");
    urlObj.searchParams.set("auto", "format,compress");
    return urlObj.toString();
  }

  return url;
};

export const getImageSrcSet = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.includes("unsplash.com")) {
    return `${getOptimizedImageUrl(url, 320)} 320w,
            ${getOptimizedImageUrl(url, 480)} 480w,
            ${getOptimizedImageUrl(url, 800)} 800w,
            ${getOptimizedImageUrl(url, 1200)} 1200w`;
  }
  return ''; // Return empty to avoid broken srcSet
};
