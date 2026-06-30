import { Product } from "../types";

/**
 * Interface stricte pour les détails de l'offre d'un produit.
 */
interface SchemaOffer {
  "@type": "Offer";
  url: string;
  priceCurrency: string;
  price: number;
  priceValidUntil: string;
  itemCondition: "https://schema.org/NewCondition" | "https://schema.org/UsedCondition";
  availability: "https://schema.org/InStock" | "https://schema.org/OutOfStock";
  seller: {
    "@type": "Organization";
    name: string;
    url: string;
  };
  shippingDetails?: {
    "@type": "OfferShippingDetails";
    shippingRate: {
      "@type": "MonetaryAmount";
      value: number;
      currency: string;
    };
    shippingDestination: {
      "@type": "DefinedRegion";
      addressCountry: string;
    };
  };
}

/**
 * Interface stricte pour l'évaluation globale d'un produit.
 */
interface SchemaAggregateRating {
  "@type": "AggregateRating";
  ratingValue: number;
  reviewCount: number;
  bestRating: string;
  worstRating: string;
}

/**
 * Interface de données structurées conforme aux exigences de Schema.org pour un produit.
 */
interface ProductJsonLdSchema {
  "@context": "https://schema.org";
  "@type": "Product";
  name: string;
  image: string[];
  description: string;
  sku: string;
  mpn: string;
  brand: {
    "@type": "Brand";
    name: string;
  };
  offers: SchemaOffer;
  aggregateRating?: SchemaAggregateRating;
}

/**
 * Génère le balisage de données structurées JSON-LD pour un produit OLMART.
 * Conforme aux standards stricts du moteur de recherche Google (Google Merchant).
 * 
 * @param product Objet produit respectant l'interface Product.
 * @param baseUrl URL de base de l'application (ex: https://olmart.com).
 * @returns Une chaîne de caractères contenant la balise <script type="application/ld+json">.
 */
export function generateProductJsonLd(product: Partial<Product>, baseUrl: string = ""): string {
  if (!product || !product.id) {
    return "";
  }

  const title = product.name || "Produit OLMART";
  const rawDescription = product.description || "Achetez ce produit de qualité sur OLMART, la marketplace de confiance en Algérie.";
  const description = rawDescription.substring(0, 160).replace(/"/g, "&quot;");

  const images: string[] = product.images && product.images.length > 0
    ? product.images
    : (product.image ? [product.image] : []);

  const formattedImages: string[] = images.map((img: string): string => {
    if (img.startsWith("http")) {
      return img;
    }
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const cleanImgPath = img.startsWith("/") ? img : `/${img}`;
    return `${cleanBaseUrl}${cleanImgPath}`;
  });

  const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const productUrl = `${cleanBase}/product/${product.id}`;
  const price = product.promoPrice !== undefined && product.promoPrice !== null && product.promoPrice > 0
    ? product.promoPrice
    : (product.price || 0);

  const availability = product.stock !== undefined && product.stock > 0
    ? "https://schema.org/InStock" as const
    : "https://schema.org/OutOfStock" as const;

  const itemCondition = product.condition === "new"
    ? "https://schema.org/NewCondition" as const
    : "https://schema.org/UsedCondition" as const;

  const offer: SchemaOffer = {
    "@type": "Offer",
    url: productUrl,
    priceCurrency: "DZD",
    price: price,
    priceValidUntil: "2030-12-31",
    itemCondition: itemCondition,
    availability: availability,
    seller: {
      "@type": "Organization",
      name: product.sellerName || "Vendeur OLMART",
      url: baseUrl,
    },
  };

  if (product.freeShipping) {
    offer.shippingDetails = {
      "@type": "OfferShippingDetails",
      shippingRate: {
        "@type": "MonetaryAmount",
        value: 0,
        currency: "DZD",
      },
      shippingDestination: {
        "@type": "DefinedRegion",
        addressCountry: "DZ",
      },
    };
  }

  const jsonLd: ProductJsonLdSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    image: formattedImages,
    description: description,
    sku: product.sku || `OLMART-PRD-${product.id}`,
    mpn: product.id,
    brand: {
      "@type": "Brand",
      name: product.brand || "OLMART",
    },
    offers: offer,
  };

  if (product.rating !== undefined && product.rating > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.salesCount || 1,
      bestRating: "5",
      worstRating: "1",
    };
  }

  return `<script id="olmart-product-jsonld-${product.id}" type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
}
