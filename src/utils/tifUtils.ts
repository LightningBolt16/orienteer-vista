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
 * Normalize BitsPerSample in the TIFF file directory to prevent geotiff.js errors.
 * Some TIFFs have BitsPerSample as a scalar or undefined, but geotiff expects an array.
 */
function normalizeTiffMetadata(image: any): void {
  try {
    const fd = image.fileDirectory || (typeof image.getFileDirectory === 'function' ? image.getFileDirectory() : null);
    if (!fd) {
      console.warn('[TIF] Could not access fileDirectory for normalization');
      return;
    }
    
    const samplesPerPixel = image.getSamplesPerPixel?.() ?? 1;
    const rawBps = fd.BitsPerSample;
    
    console.log(`[TIF] Normalizing metadata: samplesPerPixel=${samplesPerPixel}, raw BitsPerSample=`, rawBps);
    
    // Normalize BitsPerSample to array of correct length
    if (rawBps === undefined || rawBps === null) {
      // Default to 8 bits per sample (most common)
      fd.BitsPerSample = new Array(samplesPerPixel).fill(8);
    } else if (typeof rawBps === 'number') {
      // Convert scalar to array
      fd.BitsPerSample = new Array(samplesPerPixel).fill(rawBps);
    } else if (Array.isArray(rawBps) && rawBps.length < samplesPerPixel) {
      // Pad array if too short
      const lastVal = rawBps[rawBps.length - 1] ?? 8;
      while (fd.BitsPerSample.length < samplesPerPixel) {
        fd.BitsPerSample.push(lastVal);
      }
    }
    
    console.log(`[TIF] Normalized BitsPerSample=`, fd.BitsPerSample);
  } catch (e) {
    console.warn('[TIF] Error normalizing metadata (non-fatal):', e);
  }
}

/**
 * Safely extract the first band from readRasters result.
 * geotiff.js can return either an array of typed arrays or a single typed array.
 */
function extractFirstBand(rasters: any): Uint8Array | Uint16Array | Float32Array {
  if (!rasters) {
    throw new Error('readRasters returned null/undefined');
  }
  
  // If it's an array of bands, get first band
  if (Array.isArray(rasters)) {
    if (rasters.length === 0) {
      throw new Error('readRasters returned empty array');
    }
    return rasters[0] as Uint8Array | Uint16Array | Float32Array;
  }
  
  // If it has a numeric length and isn't an array, it's likely a typed array (single band)
  if (typeof rasters.length === 'number' && rasters.length > 0) {
    return rasters as Uint8Array | Uint16Array | Float32Array;
  }
  
  // If it has indexed properties (some geotiff versions return array-like objects)
  if (rasters[0] !== undefined) {
    return rasters[0] as Uint8Array | Uint16Array | Float32Array;
  }
  
  throw new Error('Could not extract band data from readRasters result');
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
  
  // Normalize metadata to prevent BitsPerSample[0] errors
  normalizeTiffMetadata(image);
  
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
  
  // Fallback: Use readRasters - handle grayscale differently
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const pixelCount = width * height;
  
  if (samplesPerPixel === 1) {
    // Grayscale - DON'T use interleave option, it fails for single-band images
    console.log('Processing grayscale TIF without interleave...');
    const rasters = await image.readRasters();
    const band = extractFirstBand(rasters);
    
    if (!band || band.length === 0) {
      throw new Error('Failed to read grayscale TIF pixel data');
    }
    
    // Normalize values if they're not 8-bit
    const maxVal = band instanceof Uint8Array ? 255 : 
                   band instanceof Uint16Array ? 65535 : 1;
    
    for (let i = 0; i < pixelCount; i++) {
      const val = Math.round((band[i] / maxVal) * 255);
      const dstIdx = i * 4;
      data[dstIdx] = val;
      data[dstIdx + 1] = val;
      data[dstIdx + 2] = val;
      data[dstIdx + 3] = 255;
    }
  } else {
    // RGB/RGBA - use interleave for efficiency
    const rasters = await image.readRasters({ interleave: true }) as Uint8Array;
    
    if (!rasters || rasters.length === 0) {
      throw new Error('Failed to read TIF pixel data - file may be corrupted or unsupported');
    }
    
    if (samplesPerPixel >= 3) {
      for (let i = 0; i < pixelCount; i++) {
        const srcIdx = i * samplesPerPixel;
        const dstIdx = i * 4;
        data[dstIdx] = rasters[srcIdx];
        data[dstIdx + 1] = rasters[srcIdx + 1];
        data[dstIdx + 2] = rasters[srcIdx + 2];
        data[dstIdx + 3] = samplesPerPixel >= 4 ? rasters[srcIdx + 3] : 255;
      }
    } else {
      throw new Error(`Unsupported samples per pixel: ${samplesPerPixel}`);
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  console.log('TIF loaded via geotiff.js readRasters');
  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Check if a TIF file can be decoded for annotation purposes.
 * Returns success status and optional error message.
 */
export async function canDecodeTif(file: File): Promise<{ success: boolean; error?: string }> {
  try {
    await convertTifToDataUrl(file);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Identify specific incompatibility errors
    if (message.includes('DataView') || message.includes('Offset') || message.includes('bounds')) {
      return { 
        success: false, 
        error: 'This TIFF format uses compression not supported for browser-based editing' 
      };
    }
    
    return { success: false, error: message };
  }
}
