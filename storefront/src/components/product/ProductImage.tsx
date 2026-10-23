import { useState } from 'react';
import { photoSrcSet, photoUrl } from '../../lib/images';
import { Icon } from '../ui/Icon';

interface Props {
  src: string | null;
  alt: string;
  /** Largest width the image is shown at, in CSS pixels. Used to pick a small enough file. */
  width?: number;
  sizes?: string;
  eager?: boolean;
  className?: string;
}

const WIDTHS = [240, 400, 640, 960, 1400];

/** A product photo, or a calm placeholder when there is none (or it cannot load). */
export function ProductImage({ src, alt, width = 640, sizes, eager = false, className = '' }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`grid place-items-center bg-sunken text-line-strong ${className}`} role="img" aria-label={alt}>
        <Icon name="image" size={40} />
      </div>
    );
  }
  return (
    <img
      src={photoUrl(src, width)}
      srcSet={photoSrcSet(src, WIDTHS)}
      sizes={sizes}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={`bg-sunken object-contain ${className}`}
    />
  );
}
