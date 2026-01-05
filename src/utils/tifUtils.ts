import * as GeoTIFF from 'geotiff';

/**
 * Convert a TIF/GeoTIFF file to a data URL that can be displayed in <img> or canvas.
 * Handles various TIF formats including orienteering maps.
 */
export async function convertTifToDataUrl(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();
  
  const width = image.getWidth();
  const height = image.getHeight();
  const samplesPerPixel = image.getSamplesPerPixel();
  
  // Read the raster data
  const rasters = await image.readRasters();
  
  // Create an offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Create ImageData
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  // Handle different pixel formats
  if (samplesPerPixel >= 3) {
    // RGB or RGBA image
    const red = rasters[0] as Uint8Array | Uint16Array | Float32Array;
    const green = rasters[1] as Uint8Array | Uint16Array | Float32Array;
    const blue = rasters[2] as Uint8Array | Uint16Array | Float32Array;
    const alpha = samplesPerPixel >= 4 ? (rasters[3] as Uint8Array | Uint16Array | Float32Array) : null;
    
    // Determine if we need to normalize (16-bit or float data)
    const maxValue = getMaxValue(red, green, blue);
    const scale = maxValue > 255 ? 255 / maxValue : 1;
    
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      data[idx] = Math.round(Number(red[i]) * scale);     // R
      data[idx + 1] = Math.round(Number(green[i]) * scale); // G
      data[idx + 2] = Math.round(Number(blue[i]) * scale);  // B
      data[idx + 3] = alpha ? Math.round(Number(alpha[i]) * scale) : 255; // A
    }
  } else if (samplesPerPixel === 1) {
    // Grayscale image
    const gray = rasters[0] as Uint8Array | Uint16Array | Float32Array;
    const maxValue = Math.max(...Array.from(gray).slice(0, 1000)); // Sample first 1000 pixels
    const scale = maxValue > 255 ? 255 / maxValue : 1;
    
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      const value = Math.round(Number(gray[i]) * scale);
      data[idx] = value;     // R
      data[idx + 1] = value; // G
      data[idx + 2] = value; // B
      data[idx + 3] = 255;   // A
    }
  } else {
    throw new Error(`Unsupported TIF format: ${samplesPerPixel} samples per pixel`);
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // Convert to data URL (use JPEG for smaller size with photos/maps)
  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Get the maximum value from RGB channels to determine if normalization is needed.
 */
function getMaxValue(
  red: Uint8Array | Uint16Array | Float32Array,
  green: Uint8Array | Uint16Array | Float32Array,
  blue: Uint8Array | Uint16Array | Float32Array
): number {
  // Sample pixels to find max value (check every 100th pixel for performance)
  let max = 0;
  const step = Math.max(1, Math.floor(red.length / 1000));
  
  for (let i = 0; i < red.length; i += step) {
    max = Math.max(max, Number(red[i]), Number(green[i]), Number(blue[i]));
  }
  
  return max;
}
