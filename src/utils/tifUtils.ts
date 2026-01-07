import * as GeoTIFF from 'geotiff';

/**
 * Get TIF file dimensions without loading full pixel data.
 */
export async function getTifDimensions(file: File): Promise<{ width: number; height: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();
  return {
    width: image.getWidth(),
    height: image.getHeight(),
  };
}

/**
 * Try to load TIF using browser's native image decoder.
 * This works for many TIF formats that browsers can handle directly.
 */
async function tryBrowserNative(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();
    
    const cleanup = () => URL.revokeObjectURL(blobUrl);
    
    img.onload = () => {
      // Validate the image loaded correctly (not a 0x0 placeholder)
      if (img.width === 0 || img.height === 0) {
        cleanup();
        reject(new Error('Browser loaded empty image'));
        return;
      }
      
      // Success! Convert to data URL via canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      cleanup();
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    
    img.onerror = () => {
      cleanup();
      reject(new Error('Browser cannot display this TIF format'));
    };
    
    img.src = blobUrl;
  });
}

/**
 * Convert a TIF/GeoTIFF file to a data URL that can be displayed in <img> or canvas.
 * First tries browser-native loading, then falls back to geotiff.js for complex formats.
 */
export async function convertTifToDataUrl(file: File): Promise<string> {
  // First, try browser's native blob URL (works for many TIF formats)
  try {
    const result = await tryBrowserNative(file);
    console.log('TIF loaded via browser native');
    return result;
  } catch (nativeError) {
    console.warn('Browser native TIF loading failed, trying geotiff.js:', nativeError);
  }
  
  // Fallback to geotiff.js for formats browsers can't handle
  const arrayBuffer = await file.arrayBuffer();
  const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();
  
  const width = image.getWidth();
  const height = image.getHeight();
  const samplesPerPixel = image.getSamplesPerPixel();
  
  console.log(`TIF: ${width}x${height}, ${samplesPerPixel} samples/pixel`);
  
  // Create an offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Try readRGB first, fall back to readRasters if it fails
  try {
    const rgb = await image.readRGB({ interleave: true }) as Uint8Array;
    
    if (rgb && rgb.length > 0) {
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      
      for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) {
        data[j] = rgb[i];
        data[j + 1] = rgb[i + 1];
        data[j + 2] = rgb[i + 2];
        data[j + 3] = 255;
      }
      
      ctx.putImageData(imageData, 0, 0);
      console.log('TIF loaded via geotiff.js readRGB');
      return canvas.toDataURL('image/jpeg', 0.9);
    }
  } catch (rgbError) {
    console.warn('readRGB failed, trying readRasters:', rgbError);
  }
  
  // Fallback: Use readRasters which is more lenient
  const rasters = await image.readRasters({ interleave: true }) as Uint8Array;
  
  if (!rasters || rasters.length === 0) {
    throw new Error('Failed to read TIF pixel data - file may be corrupted or unsupported');
  }
  
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const pixelCount = width * height;
  
  if (samplesPerPixel >= 3) {
    // RGB or RGBA
    for (let i = 0; i < pixelCount; i++) {
      const srcIdx = i * samplesPerPixel;
      const dstIdx = i * 4;
      data[dstIdx] = rasters[srcIdx];
      data[dstIdx + 1] = rasters[srcIdx + 1];
      data[dstIdx + 2] = rasters[srcIdx + 2];
      data[dstIdx + 3] = samplesPerPixel >= 4 ? rasters[srcIdx + 3] : 255;
    }
  } else if (samplesPerPixel === 1) {
    // Grayscale
    for (let i = 0; i < pixelCount; i++) {
      const val = rasters[i];
      const dstIdx = i * 4;
      data[dstIdx] = val;
      data[dstIdx + 1] = val;
      data[dstIdx + 2] = val;
      data[dstIdx + 3] = 255;
    }
  } else {
    throw new Error(`Unsupported samples per pixel: ${samplesPerPixel}`);
  }
  
  ctx.putImageData(imageData, 0, 0);
  console.log('TIF loaded via geotiff.js readRasters');
  return canvas.toDataURL('image/jpeg', 0.9);
}
