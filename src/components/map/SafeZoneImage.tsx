import React, { useRef, useState, useEffect, useMemo } from 'react';
import type { SafeZone } from '@/utils/routeDataUtils';

interface SafeZoneImageProps {
  src: string;
  safeZone?: SafeZone;
  isFullscreen?: boolean;
  className?: string;
  alt?: string;
  onLoad?: () => void;
  children?: React.ReactNode;
}

/**
 * SafeZoneImage — clean zoom logic for 1:1 source images.
 *
 * Non-fullscreen: object-fit:contain inside a responsive container, no zoom.
 * Fullscreen: scale + translate so the safe zone fills the viewport
 *   without any part being cropped.
 */
const SafeZoneImage: React.FC<SafeZoneImageProps> = ({
  src,
  safeZone,
  isFullscreen = false,
  className = '',
  alt = 'Route image',
  onLoad,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  // Track container (fullscreen) or window size via ResizeObserver
  useEffect(() => {
    const update = () => {
      if (isFullscreen) {
        setViewport({ width: window.innerWidth, height: window.innerHeight });
      } else {
        const el = containerRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          setViewport({ width: rect.width, height: rect.height });
        }
      }
    };

    update();

    if (isFullscreen) {
      window.addEventListener('resize', update);
      window.addEventListener('orientationchange', update);
      return () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('orientationchange', update);
      };
    } else {
      const el = containerRef.current;
      if (!el) return;
      const ro = new ResizeObserver(() => update());
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [isFullscreen]);

  const transform = useMemo(() => {
    if (!isFullscreen || !safeZone || viewport.width === 0 || viewport.height === 0) {
      return null;
    }

    const sz = {
      x: safeZone.x,
      y: safeZone.y,
      w: safeZone.w,
      h: safeZone.h,
    };

    // Safe zone center (use explicit center if provided, else geometric center)
    const szCenterX = safeZone.center_x ?? (sz.x + sz.w / 2);
    const szCenterY = safeZone.center_y ?? (sz.y + sz.h / 2);

    const AR_vp = viewport.width / viewport.height;
    const AR_sz = sz.w / sz.h;

    // Scale: fit the safe zone into the viewport without cropping any part.
    // The image is displayed at viewport size (object-fit:contain for 1:1 means
    // it fills min(vw, vh)). We treat the image as occupying a square of side
    // length = min(vw,vh) centered in the viewport.
    //
    // But with transform-based zoom we can be simpler:
    // The image is rendered to fill the viewport width (since we set width:100vw,
    // height:100vw for a 1:1 image). One "image pixel" in normalized coords
    // equals imgSize px.
    const imgSize = Math.min(viewport.width, viewport.height);

    // How big is the safe zone in pixels at scale=1?
    const szPxW = sz.w * imgSize;
    const szPxH = sz.h * imgSize;

    // Scale needed so safe zone fills viewport
    let scale: number;
    if (AR_vp > AR_sz) {
      // viewport wider than safe zone → height is the constraint
      scale = viewport.height / szPxH;
    } else {
      // viewport taller than safe zone → width is the constraint
      scale = viewport.width / szPxW;
    }

    // Don't zoom in more than necessary — cap at scale where full image fits
    // (no point zooming past the image boundary)
    const maxScale = Math.max(viewport.width, viewport.height) / imgSize;
    // But also allow zooming in to the safe zone — only cap if safe zone IS the whole image
    // Actually: we want the safe zone fully visible, so no cap needed unless scale < 1
    // Keep scale as-is.

    // Translation: center the safe zone center in the viewport.
    // At scale=1, the image top-left is at ((vw - imgSize)/2, (vh - imgSize)/2)
    // The safe zone center in px from image top-left: szCenterX * imgSize, szCenterY * imgSize
    // After scaling, position of szCenter from image top-left: szCenterX * imgSize * scale
    // We want this point at viewport center (vw/2, vh/2)

    const imgLeft = (viewport.width - imgSize) / 2;
    const imgTop = (viewport.height - imgSize) / 2;

    // Position of sz center at scale=1 relative to viewport
    const szCenterPxX = imgLeft + szCenterX * imgSize;
    const szCenterPxY = imgTop + szCenterY * imgSize;

    // After scaling (from the image center as transform origin), the szCenter moves.
    // Using transform-origin: center of image = (imgLeft + imgSize/2, imgTop + imgSize/2)
    // But it's easier to compute the needed translate directly.
    //
    // Strategy: we want to scale around the szCenter point, then translate so it's centered.
    // translate → then scale from center of viewport:
    //
    // Final position of a point P on the image:
    //   P' = viewport_center + scale * (P - viewport_center) + translate
    //
    // We want szCenter to end up at viewport_center:
    //   viewport_center = viewport_center + scale * (szCenter - viewport_center) + translate
    //   0 = scale * (szCenter - viewport_center) + translate
    //   translate = -scale * (szCenter - viewport_center)
    //   translate = scale * (viewport_center - szCenter)

    const vpCenterX = viewport.width / 2;
    const vpCenterY = viewport.height / 2;

    const translateX = (vpCenterX - szCenterPxX) * (1 - 1 / scale);
    const translateY = (vpCenterY - szCenterPxY) * (1 - 1 / scale);

    // Wait, let me redo this more carefully.
    // We render the image with object-fit:contain in a viewport-sized container.
    // Then apply transform: scale(S) translate(tx, ty).
    // CSS transforms apply around transform-origin (default: center of element).
    //
    // The element is viewport.width x viewport.height.
    // transform-origin = (vw/2, vh/2).
    //
    // A pixel at (px, py) in the element maps to:
    //   final = origin + S * ((px, py) - origin) + (tx, ty) * S
    //   (because translate is applied before scale in CSS transform order,
    //    but in `transform: scale(S) translate(tx, ty)` — scale is applied first
    //    to the coordinate system, then translate in the scaled space)
    //
    // Actually, CSS `transform: scale(S) translate(tx,ty)` means:
    //   1. translate by (tx, ty)
    //   2. then scale by S around origin
    // So: final = origin + S * ((px + tx, py + ty) - origin)
    //           = origin + S * (px + tx - originX, py + ty - originY)
    //
    // We want szCenter to map to vpCenter:
    //   vpCenterX = originX + S * (szCenterPxX + tx - originX)
    //   (vpCenterX - originX) / S = szCenterPxX + tx - originX
    //   tx = (vpCenterX - originX) / S - szCenterPxX + originX
    //   Since originX = vpCenterX:
    //   tx = 0 / S - szCenterPxX + vpCenterX
    //   tx = vpCenterX - szCenterPxX

    const tx = vpCenterX - szCenterPxX;
    const ty = vpCenterY - szCenterPxY;

    return { scale, tx, ty, imgSize };
  }, [isFullscreen, safeZone, viewport.width, viewport.height]);

  // === NON-FULLSCREEN: simple contain ===
  if (!isFullscreen) {
    return (
      <div ref={containerRef} className={`relative w-full ${className}`}>
        <img
          src={src}
          alt={alt}
          className="w-full h-auto object-contain"
          style={{ maxHeight: '75vh' }}
          onLoad={onLoad}
          draggable={false}
        />
        {children && (
          <div className="absolute inset-0">{children}</div>
        )}
      </div>
    );
  }

  // === FULLSCREEN ===
  if (!safeZone || !transform) {
    // No safe zone — simple contain
    return (
      <div ref={containerRef} className={`w-full h-full bg-black flex items-center justify-center ${className}`}>
        <div className="relative" style={{ width: viewport.width, height: viewport.height }}>
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-contain"
            onLoad={onLoad}
            draggable={false}
          />
          {children && (
            <div className="absolute inset-0">{children}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-full bg-black overflow-hidden ${className}`}
      style={{ position: 'relative' }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${transform.scale}) translate(${transform.tx}px, ${transform.ty}px)`,
          transformOrigin: `${viewport.width / 2}px ${viewport.height / 2}px`,
          position: 'relative',
        }}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain"
          onLoad={onLoad}
          draggable={false}
        />
        {children && (
          <div className="absolute inset-0">{children}</div>
        )}
      </div>
    </div>
  );
};

export default SafeZoneImage;

