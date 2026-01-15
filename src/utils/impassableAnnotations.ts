/**
 * Utilities for applying impassable annotations to TIF files.
 * Composites drawn areas and lines onto the map images before upload.
 */

import { convertTifToDataUrl } from './tifUtils';

interface Point {
  x: number;
  y: number;
}

interface ImpassableArea {
  points: Point[];
}

interface ImpassableLine {
  start: Point;
  end: Point;
}

// Standard ISOM colors
const VIOLET_COLOR = '#CD0BCE';
const BLACK_COLOR = '#000000';

// Line widths scaled for ~508 DPI maps (typical OCAD export)
// Impassable line symbol is ~0.4mm thick at print scale
// At 508 DPI: 0.4mm = ~8 pixels
const BASE_LINE_WIDTH = 8;
const AREA_BORDER_WIDTH = 4;

/**
 * Apply impassable annotations to a TIF file.
 * Returns a new File with annotations composited onto the image.
 * 
 * @param file - Original TIF file
 * @param areas - Array of impassable area polygons
 * @param lines - Array of impassable lines
 * @param color - Color to use for annotations ('#CD0BCE' for color map, '#000000' for B&W)
 * @returns Modified file as PNG (browser TIF encoding is limited)
 */
export async function applyAnnotationsToTif(
  file: File,
  areas: ImpassableArea[],
  lines: ImpassableLine[],
  color: string
): Promise<File> {
  // Load TIF into data URL
  const dataUrl = await convertTifToDataUrl(file);
  
  // Create image from data URL
  const img = await loadImage(dataUrl);
  
  // Create canvas at original image size
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Draw original image
  ctx.drawImage(img, 0, 0);
  
  // Calculate line width based on image size
  // Larger maps need thicker lines proportionally
  const scaleFactor = Math.max(1, Math.min(img.width, img.height) / 5000);
  const lineWidth = BASE_LINE_WIDTH * scaleFactor;
  const borderWidth = AREA_BORDER_WIDTH * scaleFactor;
  
  // Draw impassable areas
  areas.forEach(area => {
    if (area.points.length < 3) return;
    
    ctx.beginPath();
    ctx.moveTo(area.points[0].x, area.points[0].y);
    area.points.forEach((point, i) => {
      if (i > 0) ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    
    // Fill with semi-transparent color for color maps, solid for B&W
    if (color === BLACK_COLOR) {
      ctx.fillStyle = BLACK_COLOR;
    } else {
      ctx.fillStyle = hexToRgba(color, 0.5);
    }
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = color;
    ctx.lineWidth = borderWidth;
    ctx.lineJoin = 'round';
    ctx.stroke();
  });
  
  // Draw impassable lines
  lines.forEach(line => {
    ctx.beginPath();
    ctx.moveTo(line.start.x, line.start.y);
    ctx.lineTo(line.end.x, line.end.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  });
  
  // Export canvas to blob
  // Using PNG format since browser-based TIFF encoding is not well-supported
  const blob = await canvasToBlob(canvas, 'image/png');
  
  // Create new file with .png extension
  const originalName = file.name.replace(/\.(tif|tiff)$/i, '.png');
  return new File([blob], originalName, { type: 'image/png' });
}

/**
 * Load an image from a data URL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/**
 * Convert a canvas to a Blob
 */
function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      type,
      0.95 // Quality for JPEG/PNG
    );
  });
}

/**
 * Convert hex color to rgba string
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type { ImpassableArea, ImpassableLine, Point };
