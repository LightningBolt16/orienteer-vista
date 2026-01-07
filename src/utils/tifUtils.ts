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
 * Convert a TIF/GeoTIFF file to a data URL that can be displayed in <img> or canvas.
 * Uses readRGB() to automatically handle palette, CMYK, YCbCr, CIELab, and other color formats.
 */
export async function convertTifToDataUrl(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();
  
  const width = image.getWidth();
  const height = image.getHeight();
  
  // Use readRGB() - automatically handles palette, CMYK, YCbCr, CIELab, etc.
  const rgb = await image.readRGB({ interleave: true }) as Uint8Array;
  
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
  
  // RGB data is interleaved: [R,G,B,R,G,B,...]
  for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) {
    data[j] = rgb[i];         // R
    data[j + 1] = rgb[i + 1]; // G
    data[j + 2] = rgb[i + 2]; // B
    data[j + 3] = 255;        // A
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // Convert to data URL (use JPEG for smaller size with photos/maps)
  return canvas.toDataURL('image/jpeg', 0.9);
}
