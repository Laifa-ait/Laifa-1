import React, { useEffect } from "react";

interface HelmetProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
}

export const Helmet: React.FC<HelmetProps> = ({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
  ogImage,
  ogUrl,
}) => {
  useEffect(() => {
    // 1. Dynamic Title
    if (title) {
      document.title = title;
    }

    // Helper to create or update meta elements
    const setMeta = (nameOrProperty: string, content: string, isProperty = false) => {
      const attribute = isProperty ? "property" : "name";
      let element = document.querySelector(`meta[${attribute}="${nameOrProperty}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, nameOrProperty);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    // 2. Meta tags
    if (description) {
      setMeta("description", description);
    }
    if (keywords) {
      setMeta("keywords", keywords);
    }
    if (ogTitle || title) {
      setMeta("og:title", ogTitle || title || "", true);
    }
    if (ogDescription || description) {
      setMeta("og:description", ogDescription || description || "", true);
    }
    if (ogImage) {
      setMeta("og:image", ogImage, true);
    }
    if (ogUrl) {
      setMeta("og:url", ogUrl, true);
    }
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, ogUrl]);

  return (
    <>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      {keywords && <meta name="keywords" content={keywords} />}
      {(ogTitle || title) && <meta property="og:title" content={ogTitle || title} />}
      {(ogDescription || description) && <meta property="og:description" content={ogDescription || description} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogUrl && <meta property="og:url" content={ogUrl} />}
    </>
  );
};
