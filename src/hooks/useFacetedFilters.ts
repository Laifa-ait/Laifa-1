import { useState, useMemo, useCallback, useEffect } from 'react';
import { Product } from '../types';

// Types representing the active selection of each facet filter
export interface SelectedFacets {
  sizes: string[];
  colors: string[];
  materials: string[];
  brands: string[];
  wilayas: string[];
  priceRange: [number, number]; // [min, max]
}

// Types representing the available options and their real-time matching product count
export interface FacetOption {
  value: string;
  count: number;
}

export interface AvailableFacets {
  sizes: FacetOption[];
  colors: FacetOption[];
  materials: FacetOption[];
  brands: FacetOption[];
  wilayas: FacetOption[];
  minPrice: number;
  maxPrice: number;
}

const DEFAULT_PRICE_LIMIT: [number, number] = [0, 150000];

export function useFacetedFilters(
  products: Product[],
  activeCategory: string = "Tous"
) {
  // 1. Filter products belonging only to the currently active category (pre-filter)
  const categoryProducts = useMemo(() => {
    if (!activeCategory || activeCategory === "Tous") {
      return products;
    }
    return products.filter(p => p.category === activeCategory);
  }, [products, activeCategory]);

  // State for active chosen faceted filters
  const [selectedFacets, setSelectedFacets] = useState<SelectedFacets>({
    sizes: [],
    colors: [],
    materials: [],
    brands: [],
    wilayas: [],
    priceRange: [0, 150000] // Initial placeholder, will sync with category prices
  });

  // Track if pricing has been manually modified by the user
  const [isPriceModified, setIsPriceModified] = useState(false);

  // 2. Compute the subset of products matching all active non-price filters
  const nonPriceFilteredProducts = useMemo(() => {
    return categoryProducts.filter((prod) => {
      // Size filtration
      if (selectedFacets.sizes.length > 0) {
        const prodSizes = prod.sizes || [];
        const hasMatchingSize = selectedFacets.sizes.some((size) => prodSizes.includes(size));
        if (!hasMatchingSize) return false;
      }

      // Color filtration
      if (selectedFacets.colors.length > 0) {
        const prodColors = prod.colors || [];
        const hasMatchingColor = selectedFacets.colors.some((color) => prodColors.includes(color));
        if (!hasMatchingColor) return false;
      }

      // Material filtration
      if (selectedFacets.materials.length > 0) {
        const prodMaterial = prod.material || "";
        const prodMaterialsList = prod.materials || [];
        const hasMatchingMaterial = selectedFacets.materials.some(
          (mat) => mat === prodMaterial || prodMaterialsList.includes(mat)
        );
        if (!hasMatchingMaterial) return false;
      }

      // Brand filtration
      if (selectedFacets.brands.length > 0) {
        if (!prod.brand || !selectedFacets.brands.includes(prod.brand)) {
          return false;
        }
      }

      // Wilaya filtration
      if (selectedFacets.wilayas.length > 0) {
        if (!prod.wilaya || !selectedFacets.wilayas.includes(prod.wilaya)) {
          return false;
        }
      }

      return true;
    });
  }, [categoryProducts, selectedFacets.sizes, selectedFacets.colors, selectedFacets.materials, selectedFacets.brands, selectedFacets.wilayas]);

  // Determine the dynamic range of prices for the active category and current sub-filtration (excluding the price range filter itself)
  const dynamicPriceLimits = useMemo((): [number, number] => {
    const listToAnalyze = nonPriceFilteredProducts.length > 0 ? nonPriceFilteredProducts : categoryProducts;
    if (listToAnalyze.length === 0) {
      return DEFAULT_PRICE_LIMIT;
    }
    let min = Infinity;
    let max = -Infinity;
    listToAnalyze.forEach(p => {
      const price = p.promoPrice || p.price;
      if (price < min) min = price;
      if (price > max) max = price;
    });
    if (min === Infinity || max === -Infinity) {
      return DEFAULT_PRICE_LIMIT;
    }
    // Round min down to nearest 100 DA, max up to nearest 100 DA
    const roundedMin = Math.max(0, Math.floor(min / 100) * 100);
    const roundedMax = Math.ceil(max / 100) * 100;

    if (roundedMin === roundedMax) {
      return [Math.max(0, roundedMin - 1000), roundedMax + 1000];
    }
    return [roundedMin, roundedMax];
  }, [nonPriceFilteredProducts, categoryProducts]);

  // Track activeCategory changes to reset the price modification flag and reset price ranges
  const [prevCategory, setPrevCategory] = useState(activeCategory);
  useEffect(() => {
    if (activeCategory !== prevCategory) {
      setPrevCategory(activeCategory);
      setIsPriceModified(false);
      setSelectedFacets(prev => ({
        ...prev,
        priceRange: [dynamicPriceLimits[0], dynamicPriceLimits[1]]
      }));
    }
  }, [activeCategory, prevCategory, dynamicPriceLimits]);

  // Synchronize price bounds and clamp existing user selection to new dynamic range boundaries
  useEffect(() => {
    setSelectedFacets(prev => {
      const [limitMin, limitMax] = dynamicPriceLimits;
      const currentMin = prev.priceRange[0];
      const currentMax = prev.priceRange[1];

      if (isPriceModified) {
        const clampedMin = Math.max(limitMin, Math.min(limitMax, currentMin));
        const clampedMax = Math.max(limitMin, Math.min(limitMax, currentMax));
        return {
          ...prev,
          priceRange: [clampedMin, clampedMax]
        };
      } else {
        return {
          ...prev,
          priceRange: [limitMin, limitMax]
        };
      }
    });
  }, [dynamicPriceLimits, isPriceModified]);

  // Helper selectors to add or remove options from array facets
  const toggleFacet = useCallback((facetKey: keyof Omit<SelectedFacets, 'priceRange'>, value: string) => {
    setSelectedFacets((prev) => {
      const currentValues = prev[facetKey] as string[];
      const exists = currentValues.includes(value);
      const updatedValues = exists
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];

      return {
        ...prev,
        [facetKey]: updatedValues
      };
    });
  }, []);

  const setPriceRange = useCallback((range: [number, number]) => {
    setSelectedFacets((prev) => ({
      ...prev,
      priceRange: range
    }));
    setIsPriceModified(true);
  }, []);

  // Reset all active filters to default
  const resetFilters = useCallback(() => {
    setSelectedFacets({
      sizes: [],
      colors: [],
      materials: [],
      brands: [],
      wilayas: [],
      priceRange: [dynamicPriceLimits[0], dynamicPriceLimits[1]]
    });
    setIsPriceModified(false);
  }, [dynamicPriceLimits]);

  // Compute available filter options count dynamically
  const availableFacets = useMemo((): AvailableFacets => {
    const sizesMap: Record<string, number> = {};
    const colorsMap: Record<string, number> = {};
    const materialsMap: Record<string, number> = {};
    const brandsMap: Record<string, number> = {};
    const wilayasMap: Record<string, number> = {};

    categoryProducts.forEach((prod) => {
      if (Array.isArray(prod.sizes)) {
        prod.sizes.forEach(s => {
          sizesMap[s] = (sizesMap[s] || 0) + 1;
        });
      }
      if (Array.isArray(prod.colors)) {
        prod.colors.forEach(c => {
          colorsMap[c] = (colorsMap[c] || 0) + 1;
        });
      }
      if (prod.material) {
        materialsMap[prod.material] = (materialsMap[prod.material] || 0) + 1;
      }
      if (Array.isArray(prod.materials)) {
        prod.materials.forEach(m => {
          materialsMap[m] = (materialsMap[m] || 0) + 1;
        });
      }
      if (prod.brand) {
        brandsMap[prod.brand] = (brandsMap[prod.brand] || 0) + 1;
      }
      if (prod.wilaya) {
        wilayasMap[prod.wilaya] = (wilayasMap[prod.wilaya] || 0) + 1;
      }
    });

    const sortFn = (a: FacetOption, b: FacetOption) => b.count - a.count;

    return {
      sizes: Object.entries(sizesMap).map(([value, count]) => ({ value, count })).sort(sortFn),
      colors: Object.entries(colorsMap).map(([value, count]) => ({ value, count })).sort(sortFn),
      materials: Object.entries(materialsMap).map(([value, count]) => ({ value, count })).sort(sortFn),
      brands: Object.entries(brandsMap).map(([value, count]) => ({ value, count })).sort(sortFn),
      wilayas: Object.entries(wilayasMap).map(([value, count]) => ({ value, count })).sort(sortFn),
      minPrice: dynamicPriceLimits[0],
      maxPrice: dynamicPriceLimits[1],
    };
  }, [categoryProducts, dynamicPriceLimits]);

  // Compute final filtered products matching current constraints
  const filteredProducts = useMemo(() => {
    return categoryProducts.filter((prod) => {
      // 1. Price filtration
      const prodPrice = prod.promoPrice || prod.price;
      const [minP, maxP] = selectedFacets.priceRange;
      if (isPriceModified && (prodPrice < minP || prodPrice > maxP)) {
        return false;
      }

      // 2. Size filtration
      if (selectedFacets.sizes.length > 0) {
        const prodSizes = prod.sizes || [];
        const hasMatchingSize = selectedFacets.sizes.some((size) => prodSizes.includes(size));
        if (!hasMatchingSize) return false;
      }

      // 3. Color filtration
      if (selectedFacets.colors.length > 0) {
        const prodColors = prod.colors || [];
        const hasMatchingColor = selectedFacets.colors.some((color) => prodColors.includes(color));
        if (!hasMatchingColor) return false;
      }

      // 4. Material filtration
      if (selectedFacets.materials.length > 0) {
        const prodMaterial = prod.material || "";
        const prodMaterialsList = prod.materials || [];
        const hasMatchingMaterial = selectedFacets.materials.some(
          (mat) => mat === prodMaterial || prodMaterialsList.includes(mat)
        );
        if (!hasMatchingMaterial) return false;
      }

      // 5. Brand filtration
      if (selectedFacets.brands.length > 0) {
        if (!prod.brand || !selectedFacets.brands.includes(prod.brand)) {
          return false;
        }
      }

      // 6. Wilaya filtration
      if (selectedFacets.wilayas.length > 0) {
        if (!prod.wilaya || !selectedFacets.wilayas.includes(prod.wilaya)) {
          return false;
        }
      }

      return true;
    });
  }, [categoryProducts, selectedFacets, isPriceModified]);

  return {
    selectedFacets,
    availableFacets,
    filteredProducts,
    toggleFacet,
    setPriceRange,
    resetFilters,
    totalCount: filteredProducts.length,
    isFiltered: (
      selectedFacets.sizes.length > 0 ||
      selectedFacets.colors.length > 0 ||
      selectedFacets.materials.length > 0 ||
      selectedFacets.brands.length > 0 ||
      selectedFacets.wilayas.length > 0 ||
      isPriceModified
    )
  };
}
