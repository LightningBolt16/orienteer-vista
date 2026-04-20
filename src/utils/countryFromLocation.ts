/**
 * Reverse-geocodes a lat/lng to an ISO 3166-1 alpha-2 country code
 * using the Mapbox Geocoding API. Returns null on failure.
 */
export async function countryCodeFromLocation(
  lat: number,
  lng: number,
  mapboxToken: string,
): Promise<string | null> {
  if (!mapboxToken) return null;
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=country&limit=1`,
    );
    const data = await res.json();
    const feature = data?.features?.[0];
    // Mapbox returns short_code like "se", "gb", etc.
    const code: string | undefined = feature?.properties?.short_code;
    if (code && code.length >= 2) {
      return code.slice(0, 2).toUpperCase();
    }
    return null;
  } catch (err) {
    console.warn('countryCodeFromLocation failed:', err);
    return null;
  }
}
