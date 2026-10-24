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
  /** Size, shape and rounding of the frame, e.g. "aspect-square w-full rounded-xl". */
  className?: string;
  /** Extra classes for the photo itself, e.g. a hover zoom. */
  imgClassName?: string;
}

const WIDTHS = [240, 400, 640, 960, 1400];

/**
 * A product photo in a fixed frame. Photos come in every shape, so the whole photo is shown
 * (never cropped) over a soft blurred copy of itself that fills the rest of the frame. Every
 * card then has the same shape and nothing looks cut off or boxed in. Without a photo, or if
 * it cannot load, a calm placeholder shows instead.
 */
export function ProductImage({ src, alt, width = 640, sizes, eager = false, className = '', imgClassName = '' }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`grid place-items-center bg-sunken text-line-strong ${className}`} role="img" aria-label={alt}>
        <Icon name="image" size={40} />
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-sunken ${className}`}>
      <img
        src={photoUrl(src, 64)} alt="" aria-hidden="true" loading="lazy" decoding="async"
        className="absolute inset-0 h-full w-full scale-125 object-cover opacity-70 blur-2xl"
      />
      <img
        src={photoUrl(src, width)}
        srcSet={photoSrcSet(src, WIDTHS)}
        sizes={sizes}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        decoding="async"
        onError={() => setFailed(true)}
        className={`relative h-full w-full object-contain ${imgClassName}`}
      />
    </div>
  );
}
