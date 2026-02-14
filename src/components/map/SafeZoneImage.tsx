import React, { useRef, useState, useEffect, useMemo } from 'react';
import type { SafeZone } from '@/utils/routeDataUtils';

interface SafeZoneImageProps {
  src: string;
  safeZone?: SafeZone;
  isFullscreen?: boolean;
  className?: string;
  alt?: string;
  onLoad?: () => void;
}

/**
 * SafeZoneImage — renders ONLY the map image with zoom transform.
 * No children/overlays — those belong in a separate UI layer.
 *
 * Non-fullscreen: object-fit:contain inside a responsive container.
 * Fullscreen: scale + translate so the safe zone fills the viewport.
 */
const SafeZoneImage: React.FC<SafeZoneImageProps> = ({
  src,
  safeZone,
  isFullscreen = false,
  className = '',
  alt = 'Route image',
  onLoad,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

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

    const sz = { x: safeZone.x, y: safeZone.y, w: safeZone.w, h: safeZone.h };
    const szCenterX = safeZone.center_x ?? (sz.x + sz.w / 2);
    const szCenterY = safeZone.center_y ?? (sz.y + sz.h / 2);

    const AR_vp = viewport.width / viewport.height;
    const AR_sz = sz.w / sz.h;

    const imgSize = Math.min(viewport.width, viewport.height);

    const szPxW = sz.w * imgSize;
    const szPxH = sz.h * imgSize;

    let scale: number;
    if (AR_vp > AR_sz) {
      scale = viewport.height / szPxH;
    } else {
      scale = viewport.width / szPxW;
    }

    const imgLeft = (viewport.width - imgSize) / 2;
    const imgTop = (viewport.height - imgSize) / 2;

    const szCenterPxX = imgLeft + szCenterX * imgSize;
    const szCenterPxY = imgTop + szCenterY * imgSize;

    const vpCenterX = viewport.width / 2;
    const vpCenterY = viewport.height / 2;

    // Translate AFTER scale so offset is in screen pixels, not scaled pixels
    const tx = vpCenterX - szCenterPxX;
    const ty = vpCenterY - szCenterPxY;

    return { scale, tx, ty, originX: szCenterPxX, originY: szCenterPxY };
  }, [isFullscreen, safeZone, viewport.width, viewport.height]);

  // === NON-FULLSCREEN ===
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
      </div>
    );
  }

  // === FULLSCREEN without safe zone ===
  if (!safeZone || !transform) {
    return (
      <div ref={containerRef} className={`w-full h-full bg-black flex items-center justify-center ${className}`}>
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain"
          onLoad={onLoad}
          draggable={false}
        />
      </div>
    );
  }

  // === FULLSCREEN with safe zone zoom ===
  return (
    <div
      ref={containerRef}
      className={`w-full h-full bg-black overflow-hidden ${className}`}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
          transformOrigin: `${transform.originX}px ${transform.originY}px`,
        }}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain"
          onLoad={onLoad}
          draggable={false}
        />
      </div>
    </div>
  );
};

export default SafeZoneImage;
