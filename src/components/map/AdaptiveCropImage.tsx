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

function getPaddedSafeZone(safeZone: SafeZone) {
  const padded = {
    x: Math.max(0, safeZone.x - SAFE_ZONE_PADDING),
    y: Math.max(0, safeZone.y - SAFE_ZONE_PADDING),
    w: Math.min(1, safeZone.w + SAFE_ZONE_PADDING * 2),
    h: Math.min(1, safeZone.h + SAFE_ZONE_PADDING * 2),
  };
  if (padded.x + padded.w > 1) padded.w = 1 - padded.x;
  if (padded.y + padded.h > 1) padded.h = 1 - padded.y;
  return padded;
}

/**
 * Compute the visible region of a 1:1 image that:
 * 1. Contains the entire safe zone (with padding)
 * 2. Matches the container aspect ratio
 * 3. Zooms in as much as possible
 * 
 * When the region exceeds image bounds (regionW > 1 or regionH > 1),
 * the image won't fill the container — background shows as letterboxing.
 */
function computeZoomRegion(
  safeZone: SafeZone,
  containerRatio: number,
) {
  const padded = getPaddedSafeZone(safeZone);

  const regionH = Math.max(padded.h, padded.w / containerRatio);
  const regionW = containerRatio * regionH;

  // NO clamping to ≤1 — allow letterboxing when image can't fill the view

  const centerX = safeZone.x + safeZone.w / 2;
  const centerY = safeZone.y + safeZone.h / 2;

  let regionLeft: number;
  let regionTop: number;

  if (regionW <= 1) {
    // Image fills or overflows container width — clamp to image edges
    regionLeft = Math.max(0, Math.min(1 - regionW, centerX - regionW / 2));
  } else {
    // Image is narrower than container — center image in view
    regionLeft = -(regionW - 1) / 2;
  }

  if (regionH <= 1) {
    regionTop = Math.max(0, Math.min(1 - regionH, centerY - regionH / 2));
  } else {
    regionTop = -(regionH - 1) / 2;
  }

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

    const padded = getPaddedSafeZone(safeZone);

    // For non-fullscreen: cap the container ratio so the zoom region
    // always fits within image bounds (no letterboxing needed).
    // maxRatio: regionW = ratio * padded.h ≤ 1 → ratio ≤ 1/padded.h
    // minRatio: regionH = padded.w / ratio ≤ 1 → ratio ≥ padded.w
    const effectiveRatio = isFullscreen
      ? screenAspect.ratio
      : Math.max(padded.w, Math.min(screenAspect.ratio, 1 / padded.h));

    const { regionLeft, regionTop, regionW, regionH } = computeZoomRegion(
      safeZone,
      effectiveRatio,
    );

    return {
      imgStyle: {
        position: 'absolute' as const,
        width: `${100 / regionW}%`,
        height: `${100 / regionH}%`,
        left: `${-(regionLeft / regionW) * 100}%`,
        top: `${-(regionTop / regionH) * 100}%`,
      },
      containerRatio: effectiveRatio,
      hasLetterbox: regionW > 1 || regionH > 1,
    };
  }, [safeZone, screenAspect.ratio, sourceAspect, isFullscreen]);

  // For 1:1 source images WITH safe zone: zoom into the safe zone area
  if (sourceAspect === '1:1' && zoomData) {
    const containerClass = isFullscreen
      ? `w-full h-full overflow-hidden relative ${zoomData.hasLetterbox ? 'bg-black' : ''}`
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
