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

    // Container aspect ratio R
    const R = isFullscreen ? screenAspect.ratio : cw / maxH;

    // Step 1: minimum region containing padded safe zone with ratio R
    let regionW: number, regionH: number;
    if (padded.w / padded.h > R) {
      regionW = padded.w;
      regionH = padded.w / R;
    } else {
      regionH = padded.h;
      regionW = padded.h * R;
    }

    // Step 2: clamp to image bounds [0,1]
    regionW = Math.min(regionW, 1.0);
    regionH = Math.min(regionH, 1.0);

    // Step 3: center on safe zone center
    const cx = safeZone.x + safeZone.w / 2;
    const cy = safeZone.y + safeZone.h / 2;
    const left = Math.max(0, Math.min(cx - regionW / 2, 1 - regionW));
    const top = Math.max(0, Math.min(cy - regionH / 2, 1 - regionH));

    // Actual displayed container ratio
    const containerRatio = regionW / regionH;

    return {
      containerRatio,
      imgStyle: {
        position: 'absolute' as const,
        width: `${(100 / regionW).toFixed(4)}%`,
        height: `${(100 / regionH).toFixed(4)}%`,
        left: `${(-(left / regionW) * 100).toFixed(4)}%`,
        top: `${(-(top / regionH) * 100).toFixed(4)}%`,
      },
    };
  }, [safeZone, screenAspect.ratio, screenAspect.width, screenAspect.height, sourceAspect, isFullscreen, measuredWidth]);

  // === 1:1 with safe zone ===
  if (sourceAspect === '1:1' && safeZone) {
    if (!zoomData) {
      // Still measuring
      return (
        <div ref={outerRef} className={`w-full ${className}`}>
          <div className="w-full bg-black" style={{ aspectRatio: '1' }} />
        </div>
      );
    }

    if (isFullscreen) {
      return (
        <div ref={outerRef} className={`w-full h-full bg-black flex items-center justify-center ${className}`}>
          <div style={{
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
            height: '100%',
            maxWidth: `${screenAspect.height * zoomData.containerRatio}px`,
            maxHeight: `${screenAspect.width / zoomData.containerRatio}px`,
            aspectRatio: `${zoomData.containerRatio}`,
          }}>
            <img src={src} alt={alt} style={zoomData.imgStyle} onLoad={onLoad} />
          </div>
        </div>
      );
    }

    return (
      <div ref={outerRef} className={`w-full ${className}`}>
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          aspectRatio: `${zoomData.containerRatio}`,
          maxHeight: `${MAX_HEIGHT_VH * 100}vh`,
          backgroundColor: 'black',
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
