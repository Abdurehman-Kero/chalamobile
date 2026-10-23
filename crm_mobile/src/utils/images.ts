import { getApiBaseUrl } from '../api/axios';

// Photos are normally full web addresses (the image host). Photos saved before that
// were stored as "/uploads/..." on the server itself, so those get the server address.
export function absoluteImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return getApiBaseUrl().replace(/\/api$/i, '') + (url.startsWith('/') ? url : `/${url}`);
}

// Asks the image host for a small square copy, so lists load fast on mobile data.
export function thumbUrl(url: string | null | undefined, size = 160): string | null {
  const full = absoluteImageUrl(url);
  if (!full || !full.includes('res.cloudinary.com') || !full.includes('/upload/')) return full;
  return full.replace('/upload/', `/upload/c_fill,w_${size},h_${size},f_auto,q_auto/`);
}
