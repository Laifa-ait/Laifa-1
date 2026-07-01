export const maskSensitiveData = (text: string): string => {
  let masked = text;
  
  // Mask phone numbers (Algerian format or general)
  const phoneRegex = /(?:(?:\+|00)213|0)(?:\s*|-|\.)?[567](?:\s*|-|\.)?(?:\d(?:\s*|-|\.)?){8}/g;
  masked = masked.replace(phoneRegex, '[Numéro masqué]');
  
  // Mask social media and external comms
  const socialRegex = /(whatsapp|viber|telegram|insta(?:gram)?|fb|facebook|messenger|twitter|snapchat|tiktok)/gi;
  masked = masked.replace(socialRegex, '[Réseau masqué]');
  
  // Mask emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  masked = masked.replace(emailRegex, '[Email masqué]');
  
  // Mask payment info
  const paymentRegex = /(ccp|baridimob|rip|rib|paypal|paysera|wise)/gi;
  masked = masked.replace(paymentRegex, '[Paiement masqué]');
  
  return masked;
};

export const hasExternalChannel = (text: string): boolean => {
  if (!text) return false;
  
  // 1. Check for normalized strings (remove common separators first to catch obfuscated)
  const normalized = text.toLowerCase().replace(/[\s\-_._()]/g, "");
  
  // Algerian phone format checks (05, 06, 07 followed by 8 digits, or with country code)
  const phoneRegexes = [
    /(?:213|00213|\+213|0)[567]\d{8}/g,
    /\d{9,15}/g, // Any block of 9+ contiguous digits
    /[567]\d{7}/g // Local 8-digit suffix
  ];
  
  for (const regex of phoneRegexes) {
    if (regex.test(normalized)) {
      return true;
    }
  }

  // Also check original text in case of spacing patterns style 06 61 22 33 44
  const rawSpacingPhoneRegex = /(?:(?:\+|00)213|0)(?:\s*|-|\.)?[567](?:\s*|-|\.)?(?:\d(?:\s*|-|\.)?){8}/g;
  if (rawSpacingPhoneRegex.test(text)) {
    return true;
  }
  
  // 2. Social apps / keywords
  const restrictedKeywords = [
    "whatsapp", "viber", "telegram", "instagram", "insta", "fb", "facebook", 
    "messenger", "snapchat", "tiktok", "contact", "tlphone", "phone", "tél", 
    "tel", "numéro", "numero", "baridimob", "ccp"
  ];
  
  for (const kw of restrictedKeywords) {
    if (normalized.includes(kw)) {
      return true;
    }
  }
  
  // 3. URLs
  const urlRegex = /(https?:\/\/[^\s$.?#].[^\s]*|www\.[a-z0-9-]+\.[a-z]{2,})/gi;
  if (urlRegex.test(text)) {
    return true;
  }
  
  // 4. Emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  if (emailRegex.test(text)) {
    return true;
  }
  
  return false;
};

