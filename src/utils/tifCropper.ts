/**
 * Utility functions for cropping images to ROI bounds
 */

export interface CropBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Calculate the bounding box of an ROI polygon with optional margin
 */
export function calculateROIBounds(
  roiPoints: Point[],
  imageWidth: number,
  imageHeight: number,
  marginPercent: number = 0.05
): CropBounds {
  if (roiPoints.length < 3) {
    throw new Error('ROI must have at least 3 points');
  }

  // Find min/max coordinates
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of roiPoints) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  // Calculate dimensions
  const roiWidth = maxX - minX;
  const roiHeight = maxY - minY;

  // Add margin
  const marginX = roiWidth * marginPercent;
  const marginY = roiHeight * marginPercent;

  // Apply margin and clamp to image bounds
  const x = Math.max(0, Math.floor(minX - marginX));
  const y = Math.max(0, Math.floor(minY - marginY));
  const width = Math.min(imageWidth - x, Math.ceil(roiWidth + marginX * 2));
  const height = Math.min(imageHeight - y, Math.ceil(roiHeight + marginY * 2));

  return { x, y, width, height };
}

/**
 * Transform ROI coordinates to be relative to the cropped image
 */
export function transformROIToCropSpace(
  roiPoints: Point[],
  cropBounds: CropBounds
): Point[] {
  return roiPoints.map(point => ({
    x: point.x - cropBounds.x,
    y: point.y - cropBounds.y,
  }));
}

/**
 * Crop an image from a data URL and return a Blob
 */
export async function cropImageFromDataUrl(
  dataUrl: string,
  bounds: CropBounds,
  outputFormat: 'image/png' | 'image/jpeg' = 'image/png',
  quality: number = 0.95
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      // Create canvas with crop dimensions
      const canvas = document.createElement('canvas');
      canvas.width = bounds.width;
      canvas.height = bounds.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Draw the cropped region
      ctx.drawImage(
        img,
        bounds.x, bounds.y, bounds.width, bounds.height, // Source
        0, 0, bounds.width, bounds.height // Destination
      );

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        outputFormat,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for cropping'));
    };

    img.src = dataUrl;
  });
}

/**
 * Get image dimensions from a data URL
 */
export async function getImageDimensionsFromDataUrl(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = dataUrl;
  });
}
