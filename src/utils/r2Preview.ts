/**
 * Utilities for resolving map preview URLs.
 * Uses pre-stored browser-friendly PNG/WebP preview URLs.
 * No remote TIFF fetching — that fails due to R2 CORS restrictions.
 */

/**
 * Resolve the best available color map URL for a public map.
 * Returns a browser-displayable URL or null if nothing is available.
 */
export function resolveColorPreview(
  colorImageUrl: string | null,
  fallbackRouteImageUrl: string | null,
): string | null {
  // 1. Pre-stored browser-friendly preview (PNG/WebP in Supabase bucket)
  if (colorImageUrl) return colorImageUrl;

  // 2. Legacy route image fallback (cropped route image)
  return fallbackRouteImageUrl;
}

/**
 * Resolve the best available B&W impassability URL for editing.
 * Returns a browser-displayable URL or null.
 */
export function resolveBwPreview(
  impassabilityImageUrl: string | null,
): string | null {
  // Only use pre-stored browser-friendly preview
  if (impassabilityImageUrl) return impassabilityImageUrl;
  return null;
}
