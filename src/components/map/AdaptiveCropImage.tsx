import React, { useMemo } from 'react';
import { useScreenAspect } from '@/hooks/useScreenAspect';
import type { SafeZone } from '@/utils/routeDataUtils';

export type SourceAspect = '1:1' | '16_9' | '9_16';

interface AdaptiveCropImageProps {
  src: string;
  sourceAspect: SourceAspect;
  className?: string;
  alt?: string;
  onLoad?: () => void;
  isFullscreen?: boolean;
  safeZone?: SafeZone;
}

/**
 * Computes CSS object-position to ensure the safe zone stays visible
 * when using object-fit: cover on a 1:1 image.
 * 
 * The safe zone is defined in normalized [0,1] coordinates within the image.
 * We compute how much the image is cropped and shift to keep the safe zone centered.
 */
function computeSafeObjectPosition(
  safeZone: SafeZone,
  containerRatio: number, // width/height of the display container
  imageRatio: number = 1  // always 1 for 1:1 images
): string {
  // With object-fit: cover on a 1:1 image:
  // - If container is wider (ratio > 1): image is scaled by container width,
  //   so full width is visible but height is cropped. Visible height = 1/containerRatio
  // - If container is taller (ratio < 1): image is scaled by container height,
  //   so full height is visible but width is cropped. Visible width = containerRatio

  if (containerRatio >= 1) {
    // Landscape container: height is cropped
    const visibleH = 1 / containerRatio; // fraction of image height visible
    if (visibleH >= 1) return '50% 50%'; // no cropping needed

    // Safe zone vertical center
    const safeCenterY = safeZone.y + safeZone.h / 2;
    
    // We need safeCenterY to be at the center of the visible window
    // The visible window can scroll from 0 to (1 - visibleH)
    // object-position Y: 0% = top aligned, 100% = bottom aligned
    const maxShift = 1 - visibleH;
    const idealTop = safeCenterY - visibleH / 2;
    const clampedTop = Math.max(0, Math.min(maxShift, idealTop));
    const posY = maxShift > 0 ? (clampedTop / maxShift) * 100 : 50;

    return `50% ${posY}%`;
  } else {
    // Portrait container: width is cropped
    const visibleW = containerRatio; // fraction of image width visible
    if (visibleW >= 1) return '50% 50%'; // no cropping needed

    // Safe zone horizontal center
    const safeCenterX = safeZone.x + safeZone.w / 2;
    
    const maxShift = 1 - visibleW;
    const idealLeft = safeCenterX - visibleW / 2;
    const clampedLeft = Math.max(0, Math.min(maxShift, idealLeft));
    const posX = maxShift > 0 ? (clampedLeft / maxShift) * 100 : 50;

    return `${posX}% 50%`;
  }
}

/**
 * AdaptiveCropImage component that displays 1:1 images with smart cropping.
 * 
 * For 1:1 source images with a safe zone:
 * - Uses object-fit: cover to fill the screen
 * - Dynamically adjusts object-position to keep the safe zone visible
 * 
 * For 1:1 images without safe zone:
 * - Falls back to object-fit: contain (no cropping, may have letterboxing)
 * 
 * For legacy 16:9/9:16 images:
 * - Uses object-fit: contain to show the full image
 */
const AdaptiveCropImage: React.FC<AdaptiveCropImageProps> = ({
  src,
  sourceAspect,
  className = '',
  alt = 'Route image',
  onLoad,
  isFullscreen = false,
  safeZone,
}) => {
  const screenAspect = useScreenAspect();

  const objectPosition = useMemo(() => {
    if (sourceAspect !== '1:1' || !safeZone) return '50% 50%';
    return computeSafeObjectPosition(safeZone, screenAspect.ratio);
  }, [sourceAspect, safeZone, screenAspect.ratio]);

  // For 1:1 source images WITH safe zone: use cover with smart positioning
  if (sourceAspect === '1:1' && safeZone) {
    if (isFullscreen) {
      return (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover ${className}`}
          style={{ objectPosition }}
          onLoad={onLoad}
        />
      );
    }

    return (
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${className}`}
        style={{ objectPosition }}
        onLoad={onLoad}
      />
    );
  }

  // For 1:1 images WITHOUT safe zone: use contain (no cropping risk)
  if (sourceAspect === '1:1') {
    if (isFullscreen) {
      return (
        <img
          src={src}
          alt={alt}
          className={`max-w-full max-h-full w-auto h-auto object-contain ${className}`}
          onLoad={onLoad}
        />
      );
    }

    return (
      <img
        src={src}
        alt={alt}
        className={`w-full object-contain ${className}`}
        onLoad={onLoad}
      />
    );
  }

  // For legacy 16:9 or 9:16 images, use contain to show the full image
  if (isFullscreen) {
    return (
      <img
        src={src}
        alt={alt}
        className={`max-w-full max-h-full w-auto h-auto object-contain ${className}`}
        onLoad={onLoad}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`w-full h-auto object-contain ${className}`}
      onLoad={onLoad}
    />
  );
};

export default AdaptiveCropImage;
