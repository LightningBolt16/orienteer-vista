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

const DEFAULT_SAFE_ZONE: SafeZone = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };

function computeSafeObjectPosition(
  safeZone: SafeZone,
  containerRatio: number,
): string {
  if (containerRatio >= 1) {
    const visibleH = 1 / containerRatio;
    if (visibleH >= 1) return '50% 50%';
    const safeCenterY = safeZone.y + safeZone.h / 2;
    const maxShift = 1 - visibleH;
    const idealTop = safeCenterY - visibleH / 2;
    const clampedTop = Math.max(0, Math.min(maxShift, idealTop));
    const posY = maxShift > 0 ? (clampedTop / maxShift) * 100 : 50;
    return `50% ${posY}%`;
  } else {
    const visibleW = containerRatio;
    if (visibleW >= 1) return '50% 50%';
    const safeCenterX = safeZone.x + safeZone.w / 2;
    const maxShift = 1 - visibleW;
    const idealLeft = safeCenterX - visibleW / 2;
    const clampedLeft = Math.max(0, Math.min(maxShift, idealLeft));
    const posX = maxShift > 0 ? (clampedLeft / maxShift) * 100 : 50;
    return `${posX}% 50%`;
  }
}

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

  // For 1:1 images, always use cover with safe zone (real or default)
  const effectiveSafeZone = sourceAspect === '1:1' ? (safeZone || DEFAULT_SAFE_ZONE) : undefined;

  const objectPosition = useMemo(() => {
    if (!effectiveSafeZone) return '50% 50%';
    return computeSafeObjectPosition(effectiveSafeZone, screenAspect.ratio);
  }, [effectiveSafeZone, screenAspect.ratio]);

  // For 1:1 source images: always use cover with smart positioning
  if (sourceAspect === '1:1') {
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

  // For legacy 16:9 or 9:16 images, use contain
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
