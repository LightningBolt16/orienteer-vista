/**
 * Utilities for resolving R2-stored source maps into browser-displayable URLs.
 * Handles TIFF conversion via geotiff.js when needed.
 */

const R2_PUBLIC_BASE = 'https://pub-d72218e4aec146adb567299c2968aed4.r2.dev';

/**
 * Build a public R2 URL from a key.
 */
export function r2KeyToUrl(key: string): string {
  return `${R2_PUBLIC_BASE}/${key}`;
}

/**
 * Check if a URL points to a TIFF file (by extension or content-type).
 */
function isTiffUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.endsWith('.tif') || lower.endsWith('.tiff');
}

/**
 * Fetch a remote file and convert it to a browser-displayable data URL.
 * For TIFF files, uses geotiff.js conversion.
 * For PNG/JPG/WebP, returns a blob URL directly.
 */
export async function resolveImageUrl(url: string): Promise<string> {
  if (!isTiffUrl(url)) {
    // For non-TIFF, just verify it's reachable and return URL as-is
    return url;
  }

  // TIFF: fetch and convert via geotiff.js
  const { convertTifToDataUrl } = await import('@/utils/tifUtils');
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const blob = await response.blob();
  const file = new File([blob], 'source.tif', { type: 'image/tiff' });
  return convertTifToDataUrl(file);
}

/**
 * Resolve the best available color map URL for a public map.
 * Returns a browser-displayable URL or null if nothing is available.
 */
export async function resolveColorPreview(
  colorImageUrl: string | null,
  colorR2Key: string | null,
  sourceUserMapR2Key: string | null,
  fallbackRouteImageUrl: string | null,
): Promise<string | null> {
  // 1. Admin-uploaded browser-friendly preview
  if (colorImageUrl) {
    try {
      return await resolveImageUrl(colorImageUrl);
    } catch (e) {
      console.warn('color_image_url failed:', e);
    }
  }

  // 2. R2 source key on route_maps
  if (colorR2Key) {
    try {
      return await resolveImageUrl(r2KeyToUrl(colorR2Key));
    } catch (e) {
      console.warn('color_r2_key failed:', e);
    }
  }

  // 3. Linked user_maps R2 key
  if (sourceUserMapR2Key) {
    try {
      return await resolveImageUrl(r2KeyToUrl(sourceUserMapR2Key));
    } catch (e) {
      console.warn('source user_maps r2_color_key failed:', e);
    }
  }

  // 4. Legacy route image fallback
  return fallbackRouteImageUrl;
}

/**
 * Resolve the best available B&W impassability URL for editing.
 * Returns a browser-displayable URL or null.
 */
export async function resolveBwPreview(
  impassabilityImageUrl: string | null,
  bwR2Key: string | null,
  sourceUserMapBwKey: string | null,
): Promise<string | null> {
  // 1. Admin-uploaded browser-friendly preview
  if (impassabilityImageUrl) {
    try {
      return await resolveImageUrl(impassabilityImageUrl);
    } catch (e) {
      console.warn('impassability_image_url failed:', e);
    }
  }

  // 2. R2 source key on route_maps
  if (bwR2Key) {
    try {
      return await resolveImageUrl(r2KeyToUrl(bwR2Key));
    } catch (e) {
      console.warn('bw_r2_key failed:', e);
    }
  }

  // 3. Linked user_maps R2 key
  if (sourceUserMapBwKey) {
    try {
      return await resolveImageUrl(r2KeyToUrl(sourceUserMapBwKey));
    } catch (e) {
      console.warn('source user_maps r2_bw_key failed:', e);
    }
  }

  return null;
}
