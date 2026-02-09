import React from 'react';
import { useScreenAspect, getAspectRatioCSS } from '@/hooks/useScreenAspect';

export type SourceAspect = '1:1' | '16_9' | '9_16';

interface AdaptiveCropImageProps {
  src: string;
  sourceAspect: SourceAspect;
  className?: string;
  alt?: string;
  onLoad?: () => void;
  isFullscreen?: boolean;
}

/**
 * AdaptiveCropImage component that displays images based on screen aspect ratio.
 * 
 * For all source types:
 * - Uses CSS object-fit: contain to guarantee the full image is always visible
 * - No cropping ever occurs, ensuring routes are never cut off
 * - 1:1 images with sufficient padding will fill most of the screen naturally
 */
const AdaptiveCropImage: React.FC<AdaptiveCropImageProps> = ({
  src,
  sourceAspect,
  className = '',
  alt = 'Route image',
  onLoad,
  isFullscreen = false,
}) => {
  const screenAspect = useScreenAspect();

  // For 1:1 source images, use contain to guarantee full visibility
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
        style={{ aspectRatio: getAspectRatioCSS(screenAspect.ratio) }}
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
