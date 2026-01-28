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
 * AdaptiveCropImage component that dynamically crops images based on screen aspect ratio.
 * 
 * For 1:1 source images:
 * - Uses CSS object-fit: cover to crop to the screen's aspect ratio
 * - Fills the entire container without black bars
 * - Center-weighted cropping to keep the route visible
 * 
 * For legacy 16:9/9:16 images:
 * - Uses object-fit: contain to show the full image
 * - May have black bars on non-matching screens
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

  // For 1:1 source images, we crop to fill the screen
  if (sourceAspect === '1:1') {
    // In fullscreen mode, fill the entire viewport
    if (isFullscreen) {
      return (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover object-center ${className}`}
          onLoad={onLoad}
        />
      );
    }

    // In non-fullscreen mode, use the screen's aspect ratio
    return (
      <img
        src={src}
        alt={alt}
        className={`w-full object-cover object-center ${className}`}
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
