import { supabase } from '@/integrations/supabase/client';

export interface RouteData {
  candidateIndex: number;
  shortestSide: 'left' | 'right';  // Legacy: for 2-route scenarios
  shortestColor: string;
  mainRouteLength: number;
  altRouteLength: number;
  altRouteLengths?: number[];  // For multi-alternate routes
  numAlternates?: number;      // Number of alternate routes (1-3)
  mainRouteIndex?: number;     // Index of main route in the sorted array (0-based, left to right)
  mapName?: string;
  imagePath?: string;
}

export interface MapSource {
  id: string;
  name: string;
  aspect: string;
  csvPath?: string;
  routeBasePath?: string;
  flagImage?: string;
  logoPath?: string;
  countryCode?: string;
  description?: string;
  namingScheme?: 'new' | 'old';
  isDbMap?: boolean;
  isUserMap?: boolean;
  mapCategory?: 'official' | 'private' | 'community';
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

const STORAGE_URL = 'https://pldlmtuxqxszaajxtufx.supabase.co/storage/v1/object/public/route-images';
const USER_STORAGE_URL = 'https://pldlmtuxqxszaajxtufx.supabase.co/storage/v1/object';
const USER_ROUTE_STORAGE_URL = 'https://pldlmtuxqxszaajxtufx.supabase.co/storage/v1/object/public/user-route-images';
const LOCAL_MAPS_BASE = '/maps';

// Cache for map data
const mapCache = new Map<string, MapSource[]>();
const routeCache = new Map<string, RouteData[]>();
const dbMapCache = new Set<string>();
const namingSchemeCache = new Map<string, 'new' | 'old'>();

// Helper to convert main_route_index to arrow color
export const getArrowColorForIndex = (index: number): string => {
  const colors = ['#FF5733', '#3357FF', '#33CC33', '#9933FF']; // Red, Blue, Green, Purple
  return colors[index] || colors[0];
};

// Helper to get the correct answer index from shortestSide for multi-route scenarios
export const getMainRouteIndexFromSide = (shortestSide: string, numAlternates: number = 1): number => {
  // For legacy 2-route scenarios, left=0, right=1
  if (numAlternates <= 1) {
    return shortestSide === 'left' ? 0 : 1;
  }
  
  // For multi-route scenarios, parse the position
  const positionMap: Record<string, number> = {
    'left': 0,
    'center-left': 1,
    'center': Math.floor((numAlternates + 1) / 2),
    'center-right': numAlternates,
    'right': numAlternates,
  };
  
  return positionMap[shortestSide] ?? 0;
};

// Check if image exists by testing URL
async function checkImageExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

// Detect naming scheme for a map
async function detectNamingScheme(mapName: string): Promise<'new' | 'old'> {
  if (namingSchemeCache.has(mapName)) {
    return namingSchemeCache.get(mapName)!;
  }

  // Try new scheme first
  const newUrl = `${LOCAL_MAPS_BASE}/${mapName}/16_9/candidate_0_ALL.webp`;
  const newExists = await checkImageExists(newUrl);
  
  if (newExists) {
    namingSchemeCache.set(mapName, 'new');
    return 'new';
  }
  
  namingSchemeCache.set(mapName, 'old');
  return 'old';
}

// Check if a map exists in the database
async function isDbMap(mapId: string): Promise<boolean> {
  if (dbMapCache.has(mapId)) {
    return true;
  }

  const { data } = await supabase
    .from('route_maps')
    .select('id')
    .eq('id', mapId)
    .maybeSingle();
  
  if (data) {
    dbMapCache.add(mapId);
    return true;
  }
  
  return false;
}

export async function getAvailableMaps(userId?: string | null): Promise<MapSource[]> {
  const cacheKey = `maps-${userId || 'public'}`;
  if (mapCache.has(cacheKey)) {
    return mapCache.get(cacheKey)!;
  }

  try {
    // Fetch from database first
    let query = supabase
      .from('route_maps')
      .select('id, name, logo_path, country_code, is_public, user_id, map_category, latitude, longitude, location_name, description')
      .order('name');
    
    // Get public maps OR user's private maps
    if (userId) {
      query = query.or(`is_public.eq.true,user_id.eq.${userId}`);
    } else {
      query = query.eq('is_public', true);
    }

    const { data: dbMaps, error } = await query;

    if (error) {
      console.error('Error fetching maps from database:', error);
    }

    if (dbMaps && dbMaps.length > 0) {
      console.log(`Loaded ${dbMaps.length} maps from database`);
      
      const maps: MapSource[] = dbMaps.map(map => {
        // Determine map category
        let mapCategory: 'official' | 'private' | 'community' = 'official';
        if ((map as any).map_category) {
          mapCategory = (map as any).map_category;
        } else if (map.user_id !== null && !map.is_public) {
          mapCategory = 'private';
        } else if (map.user_id !== null && map.is_public) {
          mapCategory = 'community';
        }
        
        return {
          id: map.id,
          name: map.name,
          aspect: '16_9', // Default, will be overridden per route
          logoPath: map.logo_path || undefined,
          flagImage: map.country_code || undefined,
          countryCode: map.country_code || undefined,
          description: (map as any).description || undefined,
          isDbMap: true,
          isUserMap: map.user_id !== null && !map.is_public,
          mapCategory,
          latitude: (map as any).latitude ? Number((map as any).latitude) : undefined,
          longitude: (map as any).longitude ? Number((map as any).longitude) : undefined,
          locationName: (map as any).location_name || undefined,
        };
      });

      mapCache.set(cacheKey, maps);
      return maps;
    }

    // Fallback to local maps
    return getLocalMaps();
  } catch (error) {
    console.error('Error in getAvailableMaps:', error);
    return getLocalMaps();
  }
}

// Get only official maps (for public leaderboard)
export async function getOfficialMaps(): Promise<MapSource[]> {
  const allMaps = await getAvailableMaps();
  return allMaps.filter(m => m.mapCategory === 'official');
}

// Get user's private maps
export async function getUserPrivateMaps(userId: string): Promise<MapSource[]> {
  const allMaps = await getAvailableMaps(userId);
  return allMaps.filter(m => m.mapCategory === 'private');
}

// Get community maps
export async function getCommunityMaps(): Promise<MapSource[]> {
  const allMaps = await getAvailableMaps();
  return allMaps.filter(m => m.mapCategory === 'community');
}

async function getLocalMaps(): Promise<MapSource[]> {
  // Try to detect local maps
  const localMaps: MapSource[] = [];
  const testMapNames = ['Linkoping', 'Angelholm', 'Huskvarna', 'Karlstad'];
  
  for (const mapName of testMapNames) {
    // Check if CSV exists
    const csvPath = `${LOCAL_MAPS_BASE}/${mapName}/routes.csv`;
    try {
      const response = await fetch(csvPath, { method: 'HEAD' });
      if (response.ok) {
        const namingScheme = await detectNamingScheme(mapName);
        localMaps.push({
          id: mapName,
          name: mapName,
          aspect: '16_9',
          csvPath,
          routeBasePath: `${LOCAL_MAPS_BASE}/${mapName}`,
          namingScheme,
        });
      }
    } catch {
      // Map doesn't exist locally
    }
  }

  return localMaps;
}

export function parseCSV(csvText: string): RouteData[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const isTabSeparated = header.includes('\t');
  const separator = isTabSeparated ? '\t' : ',';
  const headers = header.split(separator).map(h => h.trim());

  // Detect format
  const hasLengths = headers.includes('lengths');
  const hasMainRouteIndex = headers.includes('main_route_index');

  return lines.slice(1).map(line => {
    const values = line.split(separator).map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || '';
    });

    // New format with lengths array and main_route_index
    if (hasLengths && hasMainRouteIndex) {
      const lengths = JSON.parse(row.lengths || '[]') as number[];
      const mainRouteIndex = parseInt(row.main_route_index || '0', 10);
      const mainLength = lengths[mainRouteIndex] || 0;
      const altLengths = lengths.filter((_, i) => i !== mainRouteIndex);
      
      return {
        candidateIndex: parseInt(row.id || row.candidate_index || '0', 10),
        shortestSide: mainRouteIndex === 0 ? 'left' : 'right' as 'left' | 'right',
        shortestColor: getArrowColorForIndex(mainRouteIndex),
        mainRouteLength: mainLength,
        altRouteLength: altLengths[0] || 0,
        altRouteLengths: altLengths,
        numAlternates: lengths.length - 1,
        mainRouteIndex,
      };
    }

    // Legacy format
    const shortestSide = (row.shortest_side || row.main_side || 'left').toLowerCase() as 'left' | 'right';
    return {
      candidateIndex: parseInt(row.id || row.candidate_index || '0', 10),
      shortestSide: shortestSide === 'left' ? 'left' : 'right',
      shortestColor: shortestSide === 'left' ? 'red' : 'blue',
      mainRouteLength: parseFloat(row.main_length || row.main_route_length || '0'),
      altRouteLength: parseFloat(row.alt_length || row.alt_route_length || '0'),
      numAlternates: parseInt(row.num_alts || '1', 10),
    };
  });
}

export async function fetchRouteDataForMap(mapSource: MapSource): Promise<RouteData[]> {
  const cacheKey = `routes-${mapSource.id}-${mapSource.aspect}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // Try database first for DB maps
  if (mapSource.isDbMap || await isDbMap(mapSource.id)) {
    const { data: dbRoutes, error } = await supabase
      .from('route_images')
      .select('candidate_index, shortest_side, main_route_length, alt_route_length, alt_route_lengths, num_alternates, image_path')
      .eq('map_id', mapSource.id)
      .eq('aspect_ratio', mapSource.aspect)
      .order('candidate_index');

    if (!error && dbRoutes && dbRoutes.length > 0) {
      console.log(`Loaded ${dbRoutes.length} routes from database for ${mapSource.name} (${mapSource.aspect})`);
      
      const routes = dbRoutes.map(route => {
        // User maps have paths like "userId/mapId/aspect/file.webp"
        // Admin maps have paths like "mapname/aspect/file.webp"
        const isUserMap = route.image_path.split('/').length > 3;
        const baseUrl = isUserMap ? USER_ROUTE_STORAGE_URL : STORAGE_URL;
        
        // Parse alt_route_lengths from JSON if present
        let altRouteLengths: number[] | undefined;
        if (route.alt_route_lengths && Array.isArray(route.alt_route_lengths)) {
          altRouteLengths = route.alt_route_lengths as number[];
        }
        
        // Parse shortest_side to get main_route_index for multi-route scenarios
        const numAlternates = route.num_alternates || 1;
        const totalRoutes = 1 + numAlternates;
        const mainRouteIndex = getMainRouteIndexFromSide(route.shortest_side, numAlternates);
        
        // For legacy 2-route scenarios, keep left/right
        // For multi-route, we use the mainRouteIndex
        const shortestSide: 'left' | 'right' = route.shortest_side === 'left' ? 'left' : 'right';
        
        return {
          candidateIndex: route.candidate_index,
          shortestSide,
          shortestColor: getArrowColorForIndex(mainRouteIndex),
          mainRouteLength: Number(route.main_route_length) || 0,
          altRouteLength: Number(route.alt_route_length) || 0,
          altRouteLengths,
          numAlternates,
          mainRouteIndex,
          mapName: mapSource.name,
          imagePath: `${baseUrl}/${route.image_path}`,
        };
      });

      routeCache.set(cacheKey, routes);
      return routes;
    }
  }

  // Fallback to local CSV
  if (mapSource.csvPath) {
    try {
      const response = await fetch(mapSource.csvPath);
      if (response.ok) {
        const csvText = await response.text();
        const routes = parseCSV(csvText);
        
        // Add image paths and map name
        const namingScheme = mapSource.namingScheme || await detectNamingScheme(mapSource.name);
        routes.forEach(route => {
          route.mapName = mapSource.name;
          const suffix = namingScheme === 'new' ? '_ALL.webp' : '.webp';
          route.imagePath = `${mapSource.routeBasePath}/${mapSource.aspect}/candidate_${route.candidateIndex}${suffix}`;
        });

        routeCache.set(cacheKey, routes);
        return routes;
      }
    } catch (error) {
      console.error(`Error loading CSV for ${mapSource.name}:`, error);
    }
  }

  return [];
}

export async function fetchAllRoutesData(isMobile: boolean = false, userId?: string | null): Promise<RouteData[]> {
  const maps = await getAvailableMaps(userId);
  const targetAspect = isMobile ? '9_16' : '16_9';
  
  const allRoutes: RouteData[] = [];
  
  for (const map of maps) {
    const mapWithAspect = { ...map, aspect: targetAspect };
    const routes = await fetchRouteDataForMap(mapWithAspect);
    allRoutes.push(...routes);
  }

  // Shuffle routes
  for (let i = allRoutes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allRoutes[i], allRoutes[j]] = [allRoutes[j], allRoutes[i]];
  }

  return allRoutes;
}

export function getImageUrlByMapName(
  mapName: string,
  candidateIndex: number,
  aspectOrMobile: string | boolean = '16_9'
): string {
  // Support both aspect string and isMobile boolean
  const aspect = typeof aspectOrMobile === 'boolean' 
    ? (aspectOrMobile ? '9_16' : '16_9') 
    : aspectOrMobile;
  
  // Check if it's a DB map
  if (dbMapCache.has(mapName)) {
    return `${STORAGE_URL}/${mapName}/${aspect}/candidate_${candidateIndex}_ALL.webp`;
  }
  
  // Check naming scheme cache
  const scheme = namingSchemeCache.get(mapName) || 'new';
  const suffix = scheme === 'new' ? '_ALL.webp' : '.webp';
  
  return `${LOCAL_MAPS_BASE}/${mapName}/${aspect}/candidate_${candidateIndex}${suffix}`;
}

// Get unique map names from a list of map sources
export function getUniqueMapNames(maps: MapSource[]): string[] {
  const uniqueNames = new Set<string>();
  maps.forEach(map => uniqueNames.add(map.name));
  return Array.from(uniqueNames).sort();
}

export async function loadUserMapRoutes(
  mapId: string,
  isMobile: boolean = false
): Promise<{ routes: RouteData[], map: MapSource | null, userMapName: string }> {
  const aspect = isMobile ? '9_16' : '16_9';
  
  // Get the user map info - no user_id filter since mapId is unique
  const { data: userMap, error: userMapError } = await supabase
    .from('user_maps')
    .select('id, name, user_id, status')
    .eq('id', mapId)
    .single();

  if (userMapError || !userMap) {
    console.error('User map not found:', userMapError);
    return { routes: [], map: null, userMapName: '' };
  }

  if (userMap.status !== 'completed') {
    console.error('User map not yet processed:', userMap.status);
    return { routes: [], map: null, userMapName: userMap.name };
  }

  // Get the route_maps entry for this user map
  const { data: routeMap, error: routeMapError } = await supabase
    .from('route_maps')
    .select('id, name')
    .eq('source_map_id', mapId)
    .single();

  if (routeMapError || !routeMap) {
    console.error('Route map not found:', routeMapError);
    return { routes: [], map: null, userMapName: userMap.name };
  }

  // Get route images
  const { data: routeImages, error: routeImagesError } = await supabase
    .from('route_images')
    .select('candidate_index, shortest_side, main_route_length, alt_route_length, alt_route_lengths, num_alternates, image_path')
    .eq('map_id', routeMap.id)
    .eq('aspect_ratio', aspect)
    .order('candidate_index');

  if (routeImagesError || !routeImages || routeImages.length === 0) {
    console.error('No route images found:', routeImagesError);
    return { routes: [], map: null, userMapName: userMap.name };
  }

  // User maps always use user-route-images bucket
  const bucketName = 'user-route-images';

  // Build routes with proper image URLs
  const routes: RouteData[] = routeImages.map(route => {
    const imagePath = route.image_path;
    const imageUrl = `${USER_STORAGE_URL}/public/${bucketName}/${imagePath}`;
    
    // Parse alt_route_lengths
    let altRouteLengths: number[] | undefined;
    if (route.alt_route_lengths && Array.isArray(route.alt_route_lengths)) {
      altRouteLengths = route.alt_route_lengths as number[];
    }
    
    // Calculate mainRouteIndex from shortest_side
    const numAlternates = route.num_alternates || 1;
    const mainRouteIndex = getMainRouteIndexFromSide(route.shortest_side, numAlternates);
    
    return {
      candidateIndex: route.candidate_index,
      shortestSide: (route.shortest_side === 'left' ? 'left' : 'right') as 'left' | 'right',
      shortestColor: getArrowColorForIndex(mainRouteIndex),
      mainRouteLength: Number(route.main_route_length) || 0,
      altRouteLength: Number(route.alt_route_length) || 0,
      altRouteLengths,
      numAlternates,
      mainRouteIndex,
      mapName: userMap.name,
      imagePath: imageUrl,
    };
  });

  const mapSource: MapSource = {
    id: routeMap.id,
    name: userMap.name,
    aspect,
    isDbMap: true,
    isUserMap: true,
  };

  return { routes, map: mapSource, userMapName: userMap.name };
}

// Clear caches (useful for testing or when data changes)
export function clearRouteCaches(): void {
  mapCache.clear();
  routeCache.clear();
  dbMapCache.clear();
  namingSchemeCache.clear();
}
