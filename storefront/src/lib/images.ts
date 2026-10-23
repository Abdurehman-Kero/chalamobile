import { API_URL } from './config';

const absolute = (url: string): string =>
  /^https?:\/\//i.test(url) ? url : API_URL.replace(/\/api$/i, '') + (url.startsWith('/') ? url : `/${url}`);

/** A copy of the photo sized for the screen. The image host resizes and converts it (WebP/AVIF) for us. */
export function photoUrl(url: string, width: number): string {
  const full = absolute(url);
  if (!full.includes('res.cloudinary.com') || !full.includes('/upload/')) return full;
  return full.replace('/upload/', `/upload/c_limit,w_${width},f_auto,q_auto/`);
}

export function photoSrcSet(url: string, widths: number[]): string | undefined {
  const full = absolute(url);
  if (!full.includes('res.cloudinary.com')) return undefined;
  return widths.map(w => `${photoUrl(url, w)} ${w}w`).join(', ');
}
