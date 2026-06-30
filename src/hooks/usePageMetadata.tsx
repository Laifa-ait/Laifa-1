import React, { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

export interface PageMetadataOptions {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalPath?: string; // e.g., '/shop'
  ogImage?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogType?: "website" | "article" | "product";
  structuredData?: Record<string, any> | Record<string, any>[];
}

/**
 * Valeurs SEO par défaut pour la marketplace OLMART.
 */
export const DEFAULT_SEO = {
  title: "Marketplace de confiance en Algérie",
  description: "OLMART - Votre marketplace de confiance en Algérie. Achetez et vendez en toute sécurité avec livraison sur 58 wilayas.",
  keywords: "OLMART, e-commerce Algérie, marketplace Algérie, achat en ligne, vente en ligne, 58 wilayas, Cash on Delivery",
  canonicalPath: "",
  ogImage: "/og-image.png",
  ogType: "website" as const,
};

/**
 * Reusable hook to dynamically manage document head tags for SEO optimization.
 * Returns a <Helmet> React element containing structured meta tags, ensuring SSR compatibility
 * and eliminating repetitive Helmet boilerplate across page files.
 *
 * @param options - SEO metadata configurations
 * @returns A JSX/React element to render inside the page component
 */
export function usePageMetadata({
  title = DEFAULT_SEO.title,
  description = DEFAULT_SEO.description,
  keywords = DEFAULT_SEO.keywords,
  canonicalPath = DEFAULT_SEO.canonicalPath,
  ogImage = DEFAULT_SEO.ogImage,
  ogImageWidth = 1200,
  ogImageHeight = 630,
  ogType = DEFAULT_SEO.ogType,
  structuredData,
}: PageMetadataOptions = {}): React.ReactElement {
  const { t } = useTranslation();

  return useMemo(() => {
    // Traduction avec fallback pour préserver l'internationalisation (RTL/Arabe/Anglais)
    const translatedTitle = t(title, { defaultValue: title });
    const translatedDescription = t(description, { defaultValue: description });
    const translatedKeywords = t(keywords, { defaultValue: keywords });

    const formattedTitle = translatedTitle.endsWith("OLMART")
      ? translatedTitle
      : `${translatedTitle} | OLMART`;

    // Génération automatique du lien canonique
    const baseUrl = import.meta.env.VITE_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
    const canonicalUrl = `${baseUrl}${canonicalPath || (typeof window !== "undefined" ? window.location.pathname : "")}`;

    // Données structurées (JSON-LD) combinées sous un seul tag script avec ID constant
    const finalStructuredData = structuredData
      ? (Array.isArray(structuredData) ? structuredData : [structuredData])
      : [
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "OLMART",
            "url": baseUrl,
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": `${baseUrl}/shop?search={search_term_string}`
              },
              "query-input": "required name=search_term_string"
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "OLMART",
            "url": baseUrl,
            "logo": `${baseUrl}/logo.png`,
            "description": translatedDescription
          }
        ];

    // Consolidation dans un seul script JSON-LD pour éviter tout doublon ou accumulation au fil de la navigation
    const jsonLdContent = finalStructuredData.length === 1
      ? JSON.stringify(finalStructuredData[0])
      : JSON.stringify({
          "@context": "https://schema.org",
          "@graph": finalStructuredData.map(item => {
            const { "@context": _, ...rest } = item;
            return rest;
          })
        });

    return (
      <Helmet>
        {/* Balises Standard */}
        <title key="title">{formattedTitle}</title>
        <meta key="description" name="description" content={translatedDescription} />
        <meta key="keywords" name="keywords" content={translatedKeywords || ""} />
        <link key="canonical" rel="canonical" href={canonicalUrl} />

        {/* Open Graph (Facebook / LinkedIn) */}
        <meta key="og:title" property="og:title" content={formattedTitle} />
        <meta key="og:description" property="og:description" content={translatedDescription} />
        <meta key="og:url" property="og:url" content={canonicalUrl} />
        <meta key="og:type" property="og:type" content={ogType} />
        <meta key="og:image" property="og:image" content={ogImage || ""} />
        {ogImage && <meta key="og:image:width" property="og:image:width" content={String(ogImageWidth)} />}
        {ogImage && <meta key="og:image:height" property="og:image:height" content={String(ogImageHeight)} />}

        {/* Twitter Card */}
        <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
        <meta key="twitter:title" name="twitter:title" content={formattedTitle} />
        <meta key="twitter:description" name="twitter:description" content={translatedDescription} />
        <meta key="twitter:image" name="twitter:image" content={ogImage || ""} />

        {/* Structured Data (JSON-LD) - Unique script tag with fixed ID to prevent duplication */}
        <script
          id="olmart-jsonld-schema"
          key="olmart-jsonld-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdContent }}
        />
      </Helmet>
    );
  }, [
    title,
    description,
    canonicalPath,
    keywords,
    ogImage,
    ogImageWidth,
    ogImageHeight,
    ogType,
    structuredData,
    t,
  ]);
}
