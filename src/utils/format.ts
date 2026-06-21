import { PRESET_AVATARS } from "../constants/ui";
import { getRetroAvatar } from "./avatar";

export const formatPrice = (price: number) => {
  // Use LRM (Left-to-Right Mark) to ensure the number and DA don't get scrambled in RTL
  return "\u200E" + new Intl.NumberFormat("en-US").format(price) + "\u00A0DA";
};

export const convertSvgToDataUrl = (svgContent: string) => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
};

export const getAvatarSrc = (photoURL: string | undefined | null): string => {
  if (!photoURL) return getRetroAvatar("olma");
  if (photoURL.startsWith("preset:")) {
    const presetId = photoURL.replace("preset:", "");
    const found = PRESET_AVATARS.find((av) => av.id === presetId);
    if (found) {
      return convertSvgToDataUrl(found.svg);
    }
  }
  return photoURL;
};
