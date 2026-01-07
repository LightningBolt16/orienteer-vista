import * as GeoTIFF from 'geotiff';

const TILE_SIZE_THRESHOLD = 50 * 1024 * 1024; // 50MB - Supabase limit
const MAX_TILES = 10; // Maximum 10 tiles for 500MB files

export interface TileConfig {
  rows: number;
  cols: number;
  tileWidth: number;
  tileHeight: number;
  originalWidth: number;
  originalHeight: number;
}

export interface TileResult {
  blob: Blob;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculate optimal grid for splitting a file into tiles.
 * Returns null if no splitting is needed.
 */
export function calculateTileGrid(
  width: number,
  height: number,
  fileSize: number
): TileConfig | null {
  // No splitting needed if under threshold
  if (fileSize <= TILE_SIZE_THRESHOLD) {
    return null;
  }

  // Calculate how many tiles we need
  const numTilesNeeded = Math.ceil(fileSize / TILE_SIZE_THRESHOLD);
  const numTiles = Math.min(numTilesNeeded, MAX_TILES);

  // Determine optimal grid layout (prefer fewer columns for landscape maps)
  let cols: number, rows: number;
  
  if (width >= height) {
    // Landscape or square: 2 cols x N rows
    cols = 2;
    rows = Math.ceil(numTiles / cols);
  } else {
    // Portrait: N cols x 2 rows
    rows = 2;
    cols = Math.ceil(numTiles / rows);
  }

  const tileWidth = Math.ceil(width / cols);
  const tileHeight = Math.ceil(height / rows);

  return {
    rows,
    cols,
    tileWidth,
    tileHeight,
    originalWidth: width,
    originalHeight: height,
  };
}

/**
 * Split a TIF file into tiles using the provided configuration.
 * Both color and B&W files MUST use the same config for identical splits.
 */
export async function splitTifIntoTiles(
  file: File,
  config: TileConfig,
  onProgress?: (current: number, total: number) => void
): Promise<TileResult[]> {
  const arrayBuffer = await file.arrayBuffer();
  const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();

  const width = image.getWidth();
  const height = image.getHeight();

  // Validate dimensions match config
  if (width !== config.originalWidth || height !== config.originalHeight) {
    throw new Error(
      `Image dimensions (${width}x${height}) don't match config (${config.originalWidth}x${config.originalHeight})`
    );
  }

  // Read full RGB data
  const rgb = await image.readRGB({ interleave: true }) as Uint8Array;

  const totalTiles = config.rows * config.cols;
  const tiles: TileResult[] = [];

  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      const x = col * config.tileWidth;
      const y = row * config.tileHeight;

      // Calculate actual tile dimensions (may be smaller for edge tiles)
      const actualWidth = Math.min(config.tileWidth, width - x);
      const actualHeight = Math.min(config.tileHeight, height - y);

      // Extract tile pixel data
      const canvas = document.createElement('canvas');
      canvas.width = actualWidth;
      canvas.height = actualHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      const imageData = ctx.createImageData(actualWidth, actualHeight);
      const data = imageData.data;

      // Copy pixel data for this tile region
      for (let ty = 0; ty < actualHeight; ty++) {
        for (let tx = 0; tx < actualWidth; tx++) {
          const srcX = x + tx;
          const srcY = y + ty;
          const srcIdx = (srcY * width + srcX) * 3;
          const dstIdx = (ty * actualWidth + tx) * 4;

          data[dstIdx] = rgb[srcIdx];         // R
          data[dstIdx + 1] = rgb[srcIdx + 1]; // G
          data[dstIdx + 2] = rgb[srcIdx + 2]; // B
          data[dstIdx + 3] = 255;             // A
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Convert to PNG blob (lossless for accuracy)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to create blob'));
          },
          'image/png',
          1.0
        );
      });

      tiles.push({
        blob,
        row,
        col,
        x,
        y,
        width: actualWidth,
        height: actualHeight,
      });

      onProgress?.(tiles.length, totalTiles);
    }
  }

  return tiles;
}

/**
 * Check if a file needs to be split based on size.
 */
export function needsSplitting(fileSize: number): boolean {
  return fileSize > TILE_SIZE_THRESHOLD;
}
