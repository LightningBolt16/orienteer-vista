import { useState, useEffect, useCallback } from 'react';

export type AspectCategory = 'ultrawide' | 'wide' | 'standard' | 'portrait' | 'tall';

export interface ScreenAspect {
  width: number;
  height: number;
  ratio: number; // width/height
  category: AspectCategory;
}

function categorizeAspect(ratio: number): AspectCategory {
  if (ratio > 2.0) return 'ultrawide';     // 21:9 and wider
  if (ratio >= 1.6) return 'wide';         // 16:9, 16:10
  if (ratio >= 1.3) return 'standard';     // 4:3
  if (ratio >= 0.5) return 'portrait';     // 9:16 phones
  return 'tall';                           // Unusual tall screens
}

export function useScreenAspect(): ScreenAspect {
  const getScreenAspect = useCallback((): ScreenAspect => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = width / height;
    
    return {
      width,
      height,
      ratio,
      category: categorizeAspect(ratio),
    };
  }, []);

  const [screenAspect, setScreenAspect] = useState<ScreenAspect>(getScreenAspect);

  useEffect(() => {
    const handleResize = () => {
      setScreenAspect(getScreenAspect());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [getScreenAspect]);

  return screenAspect;
}

// Get CSS aspect ratio string for a given ratio
export function getAspectRatioCSS(ratio: number): string {
  // Round to common aspect ratios
  if (ratio > 2.2) return '21 / 9';
  if (ratio > 1.9) return '2 / 1';
  if (ratio > 1.7) return '16 / 9';
  if (ratio > 1.5) return '16 / 10';
  if (ratio > 1.2) return '4 / 3';
  if (ratio > 0.9) return '1 / 1';
  if (ratio > 0.7) return '3 / 4';
  if (ratio > 0.55) return '9 / 16';
  return '9 / 21';
}
