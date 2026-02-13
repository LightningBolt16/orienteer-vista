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

// Add padding around the safe zone to ensure routes aren't clipped at edges
const SAFE_ZONE_PADDING = 0.05; // 5% padding on each side

/**
 * Compute the visible region of a 1:1 image that:
 * 1. Contains the entire safe zone (with padding)
 * 2. Matches the container aspect ratio
 * 3. Zooms in as much as possible
 */
function computeZoomRegion(
  safeZone: SafeZone,
  containerRatio: number,
) {
  // Expand safe zone with padding
  const padded = {
    x: Math.max(0, safeZone.x - SAFE_ZONE_PADDING),
    y: Math.max(0, safeZone.y - SAFE_ZONE_PADDING),
    w: Math.min(1, safeZone.w + SAFE_ZONE_PADDING * 2),
    h: Math.min(1, safeZone.h + SAFE_ZONE_PADDING * 2),
  };
  // Clamp right/bottom edges
  if (padded.x + padded.w > 1) padded.w = 1 - padded.x;
  if (padded.y + padded.h > 1) padded.h = 1 - padded.y;

  // Region must have same aspect ratio as container
  // For a 1:1 image: regionW / regionH = containerRatio
  
  // Minimum region size to contain the padded safe zone
  let regionH = Math.max(padded.h, padded.w / containerRatio);
  let regionW = containerRatio * regionH;

  // Clamp so region doesn't exceed image bounds (0-1)
  if (regionW > 1) {
    regionW = 1;
    regionH = regionW / containerRatio;
  }
  if (regionH > 1) {
    regionH = 1;
    regionW = containerRatio * regionH;
    if (regionW > 1) regionW = 1;
  }

  // Center the region on the safe zone center, clamped to image
  const centerX = safeZone.x + safeZone.w / 2;
  const centerY = safeZone.y + safeZone.h / 2;
  const regionLeft = Math.max(0, Math.min(1 - regionW, centerX - regionW / 2));
  const regionTop = Math.max(0, Math.min(1 - regionH, centerY - regionH / 2));

  return { regionLeft, regionTop, regionW, regionH };
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

  const zoomData = useMemo(() => {
    if (!safeZone || sourceAspect !== '1:1') return null;

    const { regionLeft, regionTop, regionW, regionH } = computeZoomRegion(
      safeZone,
      screenAspect.ratio,
    );

    return {
      imgStyle: {
        position: 'absolute' as const,
        width: `${100 / regionW}%`,
        height: `${100 / regionH}%`,
        left: `-${(regionLeft / regionW) * 100}%`,
        top: `-${(regionTop / regionH) * 100}%`,
      },
      containerRatio: screenAspect.ratio,
    };
  }, [safeZone, screenAspect.ratio, sourceAspect]);

  // For 1:1 source images WITH safe zone: zoom into the safe zone area
  if (sourceAspect === '1:1' && zoomData) {
    // In fullscreen: the parent provides w-full h-full, so the container can use it
    // In non-fullscreen: use aspect-ratio to give the container intrinsic height
    const containerClass = isFullscreen
      ? 'w-full h-full overflow-hidden relative'
      : 'w-full overflow-hidden relative';

    const containerStyle = isFullscreen
      ? undefined
      : { aspectRatio: `${zoomData.containerRatio}`, maxHeight: '75vh' };

    return (
      <div className={`${containerClass} ${className}`} style={containerStyle}>
        <img
          src={src}
          alt={alt}
          className="block"
          style={zoomData.imgStyle}
          onLoad={onLoad}
        />
      </div>
    );
  }

  // For 1:1 source images WITHOUT safe zone: use contain to avoid cutting off routes
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
        style={{ maxHeight: '75vh' }}
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
