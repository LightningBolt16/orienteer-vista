import React, { useMemo, useRef, useState, useEffect } from 'react';
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

const SAFE_ZONE_PADDING = 0.05;
const MAX_HEIGHT_VH = 0.75;

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

const AdaptiveCropImage: React.FC<AdaptiveCropImageProps> = ({
  src,
  sourceAspect,
  className = '',
  alt = 'Route image',
  onLoad,
  isFullscreen = false,
  safeZone,
}) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const screenAspect = useScreenAspect();

  // Measure actual available width
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setMeasuredWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const zoomData = useMemo(() => {
    if (!safeZone || sourceAspect !== '1:1') return null;

    const cw = isFullscreen ? screenAspect.width : measuredWidth;
    if (cw === 0) return null;

    const padded = getPaddedSafeZone(safeZone);
    const maxH = isFullscreen ? screenAspect.height : screenAspect.height * MAX_HEIGHT_VH;
    const naturalRatio = cw / maxH;

    let containerRatio: number;
    if (isFullscreen) {
      containerRatio = screenAspect.ratio;
    } else {
      // Cap so zoom fits within image bounds
      containerRatio = Math.max(padded.w, Math.min(naturalRatio, 1 / padded.h));
      // Re-check maxHeight constraint
      const heightFromRatio = cw / containerRatio;
      if (heightFromRatio > maxH) {
        containerRatio = Math.max(containerRatio, cw / maxH);
      }
    }

    const regionH = Math.max(padded.h, padded.w / containerRatio);
    const regionW = containerRatio * regionH;
    const needsLetterbox = regionW > 1 || regionH > 1;

    if (needsLetterbox) {
      return { needsLetterbox: true as const, containerRatio };
    }

    const centerX = safeZone.x + safeZone.w / 2;
    const centerY = safeZone.y + safeZone.h / 2;
    const regionLeft = Math.max(0, Math.min(1 - regionW, centerX - regionW / 2));
    const regionTop = Math.max(0, Math.min(1 - regionH, centerY - regionH / 2));

    return {
      needsLetterbox: false as const,
      containerRatio,
      imgStyle: {
        position: 'absolute' as const,
        width: `${(100 / regionW).toFixed(4)}%`,
        height: `${(100 / regionH).toFixed(4)}%`,
        left: `${(-(regionLeft / regionW) * 100).toFixed(4)}%`,
        top: `${(-(regionTop / regionH) * 100).toFixed(4)}%`,
      },
    };
  }, [safeZone, screenAspect.ratio, screenAspect.width, screenAspect.height, sourceAspect, isFullscreen, measuredWidth]);

  // === 1:1 with safe zone ===
  if (sourceAspect === '1:1' && safeZone) {
    // Still measuring or letterbox
    if (!zoomData || zoomData.needsLetterbox) {
      return (
        <div ref={outerRef} className={`w-full ${className}`}>
          <div className={`flex items-center justify-center ${isFullscreen ? 'w-full h-full bg-black' : 'w-full'}`}
            style={isFullscreen ? undefined : { maxHeight: `${MAX_HEIGHT_VH * 100}vh` }}
          >
            <img src={src} alt={alt} className="max-w-full max-h-full w-auto h-auto object-contain" onLoad={onLoad} />
          </div>
        </div>
      );
    }

    // Zoom case — fullscreen
    if (isFullscreen) {
      return (
        <div ref={outerRef} className={className} style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>
          <img src={src} alt={alt} style={zoomData.imgStyle} onLoad={onLoad} />
        </div>
      );
    }

    // Zoom case — non-fullscreen
    return (
      <div ref={outerRef} className={`w-full ${className}`}>
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          aspectRatio: `${zoomData.containerRatio}`,
          maxHeight: `${MAX_HEIGHT_VH * 100}vh`,
        }}>
          <img src={src} alt={alt} style={zoomData.imgStyle} onLoad={onLoad} />
        </div>
      </div>
    );
  }

  // === 1:1 without safe zone ===
  if (sourceAspect === '1:1') {
    return (
      <div ref={outerRef} className={`flex items-center justify-center ${isFullscreen ? 'w-full h-full bg-black' : 'w-full'} ${className}`}>
        <img src={src} alt={alt}
          className={isFullscreen ? 'max-w-full max-h-full w-auto h-auto object-contain' : 'w-full object-contain'}
          style={isFullscreen ? undefined : { maxHeight: `${MAX_HEIGHT_VH * 100}vh` }}
          onLoad={onLoad}
        />
      </div>
    );
  }

  // === Legacy 16:9 / 9:16 ===
  return (
    <div ref={outerRef} className={`flex items-center justify-center ${isFullscreen ? 'w-full h-full bg-black' : 'w-full'} ${className}`}>
      <img src={src} alt={alt}
        className={isFullscreen ? 'max-w-full max-h-full w-auto h-auto object-contain' : 'w-full h-auto object-contain'}
        onLoad={onLoad}
      />
    </div>
  );
};

export default AdaptiveCropImage;
