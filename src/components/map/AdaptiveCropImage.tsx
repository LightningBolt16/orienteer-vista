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
  children?: React.ReactNode;
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
  children,
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

    // Container is always full width, height capped at maxH
    const containerWidth = isFullscreen ? screenAspect.width : cw;
    const containerHeight = isFullscreen ? screenAspect.height : maxH;
    const R = containerWidth / containerHeight;

    // Step 1: minimum region containing padded safe zone with container aspect ratio R
    let regionW: number, regionH: number;
    if (padded.w / padded.h > R) {
      regionW = padded.w;
      regionH = padded.w / R;
    } else {
      regionH = padded.h;
      regionW = padded.h * R;
    }

    // Step 2: clamp to image bounds [0,1]
    // After clamping one axis, ensure the safe zone still fits on the other.
    if (regionW > 1.0) {
      regionW = 1.0;
      regionH = regionW / R;
    }
    if (regionH > 1.0) {
      regionH = 1.0;
      regionW = regionH * R;
    }

    // Step 3: guarantee the safe zone is NEVER cropped.
    // If clamping shrank a dimension below the padded safe zone, expand it back.
    if (regionW < padded.w) {
      regionW = Math.min(padded.w, 1.0);
    }
    if (regionH < padded.h) {
      regionH = Math.min(padded.h, 1.0);
    }
    // The region may no longer match R exactly — that's fine,
    // the container will letterbox the difference.

    // Step 4: center on explicit center point if available, else safe zone center
    const cx = safeZone.center_x ?? (safeZone.x + safeZone.w / 2);
    const cy = safeZone.center_y ?? (safeZone.y + safeZone.h / 2);
    const left = Math.max(0, Math.min(cx - regionW / 2, 1 - regionW));
    const top = Math.max(0, Math.min(cy - regionH / 2, 1 - regionH));

    // Step 5: final safety — ensure entire padded safe zone is within [left, left+regionW] x [top, top+regionH]
    // Shift if the safe zone extends beyond the visible region
    let finalLeft = left;
    let finalTop = top;
    if (padded.x < finalLeft) finalLeft = Math.max(0, padded.x);
    if (padded.y < finalTop) finalTop = Math.max(0, padded.y);
    if (padded.x + padded.w > finalLeft + regionW) {
      finalLeft = Math.min(1 - regionW, padded.x + padded.w - regionW);
    }
    if (padded.y + padded.h > finalTop + regionH) {
      finalTop = Math.min(1 - regionH, padded.y + padded.h - regionH);
    }

    return {
      containerWidth,
      containerHeight,
      imgStyle: {
        position: 'absolute' as const,
        width: `${(100 / regionW).toFixed(4)}%`,
        height: `${(100 / regionH).toFixed(4)}%`,
        left: `${(-(finalLeft / regionW) * 100).toFixed(4)}%`,
        top: `${(-(finalTop / regionH) * 100).toFixed(4)}%`,
      },
    };
  }, [safeZone, screenAspect.width, screenAspect.height, sourceAspect, isFullscreen, measuredWidth]);

  // === 1:1 with safe zone ===
  if (sourceAspect === '1:1' && safeZone) {
    if (!zoomData) {
      // Still measuring — render invisible placeholder
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
            width: `${zoomData.containerWidth}px`,
            height: `${zoomData.containerHeight}px`,
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
            }}>
              <img src={src} alt={alt} style={zoomData.imgStyle} onLoad={onLoad} draggable={false} />
            </div>
            {children}
          </div>
        </div>
      );
    }

    return (
      <div ref={outerRef} className={`w-full ${className}`}>
        <div style={{
          position: 'relative',
          width: `${zoomData.containerWidth}px`,
          height: `${zoomData.containerHeight}px`,
          margin: '0 auto',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
          }}>
            <img src={src} alt={alt} style={zoomData.imgStyle} onLoad={onLoad} draggable={false} />
          </div>
          {children}
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
          draggable={false}
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
        draggable={false}
      />
    </div>
  );
};

export default AdaptiveCropImage;
