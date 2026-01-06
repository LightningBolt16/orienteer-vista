import { supabase } from '@/integrations/supabase/client';

export interface RouteData {
  candidateIndex: number;
  shortestSide: 'left' | 'right';
  shortestColor: string;
  mainRouteLength: number;
  altRouteLength: number;
  mapName?: string;
  imagePath?: string;
}

export interface MapSource {
  id: string;
  name: string;
  aspect: '16_9' | '9_16';
  csvPath: string;
  imagePathPrefix: string;
  mapImagePath?: string;
  description?: string;
  folderName?: string;
  namingScheme?: 'candidate' | 'route';
  countryCode?: string;
  logoPath?: string;
  mapType?: string;
}

// Supabase storage URL for route images
const STORAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/route-images`;
const USER_ROUTE_STORAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/user-route-images`;

// Fallback local map folders (used when database is empty)
const MAP_FOLDER_NAMES = ['Rotondella', 'Matera'];

// Try different CSV naming patterns (for fallback)
const getCSVPatterns = (folderName: string): string[] => [
  `/maps/${folderName}/${folderName}.csv`,
  `/maps/${folderName}/${folderName.toLowerCase()}.csv`,
  `/maps/${folderName}/${folderName.toUpperCase()}.csv`,
];

// Find the working CSV path for a map folder (fallback)
const findCSVPath = async (folderName: string): Promise<string | null> => {
  const patterns = getCSVPatterns(folderName);
  
  for (const path of patterns) {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      if (response.ok) {
        return path;
      }
    } catch {
      continue;
    }
  }
  return null;
};

// Detect which naming scheme a map folder uses (fallback)
const detectNamingScheme = async (folderName: string, aspect: '16_9' | '9_16'): Promise<'candidate' | 'route' | null> => {
  const aspectFolder = aspect;
  
  try {
    const candidateResponse = await fetch(`/maps/${folderName}/${aspectFolder}/candidate_1.png`, { method: 'HEAD' });
    if (candidateResponse.ok) return 'candidate';
  } catch {}
  
  try {
    const routeResponse = await fetch(`/maps/${folderName}/${aspectFolder}/route_0.png`, { method: 'HEAD' });
    if (routeResponse.ok) return 'route';
  } catch {}
  
  return null;
};

// Fetch maps from database first, fallback to local files
export const getAvailableMaps = async (): Promise<MapSource[]> => {
  try {
    // Try database first
    const { data: dbMaps, error } = await supabase
      .from('route_maps')
      .select('id, name, description, country_code, logo_path, map_type');

    if (!error && dbMaps && dbMaps.length > 0) {
      console.log(`Found ${dbMaps.length} maps in database`);
      const mapSources: MapSource[] = [];

      for (const dbMap of dbMaps) {
        // Check if routes exist for this map in both aspects
      const { data: routes16_9 } = await supabase
        .from('route_images')
        .select('id')
        .eq('map_id', dbMap.id)
        .eq('aspect_ratio', '16_9')
        .limit(1);

      const { data: routes9_16 } = await supabase
        .from('route_images')
        .select('id')
        .eq('map_id', dbMap.id)
        .eq('aspect_ratio', '9_16')
        .limit(1);

      if (routes16_9 && routes16_9.length > 0) {
          mapSources.push({
            id: `${dbMap.id}-landscape`,
            name: dbMap.name,
            aspect: '16_9',
            csvPath: '', // Not used for database routes
            imagePathPrefix: `${STORAGE_URL}/${dbMap.name.toLowerCase()}/16_9/candidate_`,
            folderName: dbMap.name,
            description: dbMap.description || undefined,
            countryCode: dbMap.country_code || undefined,
            logoPath: dbMap.logo_path || undefined,
            mapType: dbMap.map_type || undefined,
          });
        }

      if (routes9_16 && routes9_16.length > 0) {
          mapSources.push({
            id: `${dbMap.id}-portrait`,
            name: dbMap.name,
            aspect: '9_16',
            csvPath: '',
            imagePathPrefix: `${STORAGE_URL}/${dbMap.name.toLowerCase()}/9_16/candidate_`,
            folderName: dbMap.name,
            description: dbMap.description || undefined,
            countryCode: dbMap.country_code || undefined,
            logoPath: dbMap.logo_path || undefined,
            mapType: dbMap.map_type || undefined,
          });
        }
      }

      if (mapSources.length > 0) {
        console.log(`Generated ${mapSources.length} map sources from database`);
        return mapSources;
      }
    }

    // Fallback to local files
    console.log('No maps in database, falling back to local files');
    return getLocalMaps();
  } catch (error) {
    console.error('Error loading maps from database:', error);
    return getLocalMaps();
  }
};

// Fallback: Load maps from local public folder
const getLocalMaps = async (): Promise<MapSource[]> => {
  const mapSources: MapSource[] = [];
  
  for (const folderName of MAP_FOLDER_NAMES) {
    const csvPath = await findCSVPath(folderName);
    if (!csvPath) {
      console.warn(`No CSV found for map: ${folderName}`);
      continue;
    }
    
    const landscapeScheme = await detectNamingScheme(folderName, '16_9');
    if (landscapeScheme) {
      const prefix = landscapeScheme === 'candidate' ? 'candidate_' : 'route_';
      cacheNamingScheme(folderName, '16_9', landscapeScheme);
      mapSources.push({
        id: `${folderName.toLowerCase()}-landscape`,
        name: folderName,
        aspect: '16_9',
        csvPath,
        imagePathPrefix: `/maps/${folderName}/16_9/${prefix}`,
        folderName,
        namingScheme: landscapeScheme,
      });
    }
    
    const portraitScheme = await detectNamingScheme(folderName, '9_16');
    if (portraitScheme) {
      const prefix = portraitScheme === 'candidate' ? 'candidate_' : 'route_';
      cacheNamingScheme(folderName, '9_16', portraitScheme);
      mapSources.push({
        id: `${folderName.toLowerCase()}-portrait`,
        name: folderName,
        aspect: '9_16',
        csvPath,
        imagePathPrefix: `/maps/${folderName}/9_16/${prefix}`,
        folderName,
        namingScheme: portraitScheme,
      });
    }
  }

  console.log(`Found ${mapSources.length} local map sources`);
  return mapSources;
};

// Detect CSV format based on header
type CSVFormat = 'old' | 'new';

const detectCSVFormat = (headerLine: string): CSVFormat => {
  const header = headerLine.toLowerCase();
  // New format: ID, Main_Side, Main_Len, Alt_Len, Overlap_Pct, Hardness, Pass_Num
  if (header.includes('main_side') || header.includes('main_len')) {
    return 'new';
  }
  // Old format: Candidate_Index, Shortest_Side, Shortest_Color, Main_Route_Length, Alt_Route_Length
  return 'old';
};

// Parse CSV text into RouteData array (supports both old and new formats)
const parseCSV = (csvText: string, mapName?: string): RouteData[] => {
  const lines = csvText.split('\n');
  if (lines.length < 2) return [];
  
  const headerLine = lines[0];
  const format = detectCSVFormat(headerLine);
  
  // Handle both comma and tab-separated values
  const splitLine = (line: string): string[] => {
    if (line.includes('\t')) {
      return line.split('\t');
    }
    return line.split(',');
  };
  
  return lines.slice(1)
    .filter(line => line.trim() !== '')
    .map((line) => {
      const values = splitLine(line);
      
      const candidateIndex = parseInt(values[0]);
      if (isNaN(candidateIndex)) {
        return null;
      }
      
      if (format === 'new') {
        // New format: ID, Main_Side, Main_Len, Alt_Len, Overlap_Pct, Hardness, Pass_Num
        const sideValue = values[1]?.toLowerCase().trim() || '';
        const shortestSide = (sideValue === 'left' ? 'left' : 'right') as 'left' | 'right';
        const mainRouteLength = parseFloat(values[2]) || 0;
        const altRouteLength = parseFloat(values[3]) || 0;
        // Color is derived from side in new format
        const shortestColor = shortestSide === 'left' ? 'red' : 'blue';
        
        return {
          candidateIndex,
          shortestSide,
          shortestColor,
          mainRouteLength,
          altRouteLength,
          mapName,
        };
      } else {
        // Old format: Candidate_Index, Shortest_Side, Shortest_Color, Main_Route_Length, Alt_Route_Length
        const sideValue = values[1]?.toLowerCase().trim() || '';
        const shortestSide = (sideValue === 'left' ? 'left' : 'right') as 'left' | 'right';
        const colorValue = values[2]?.toLowerCase().trim() || 'red';
        const mainRouteLength = parseFloat(values[3]) || 0;
        const altRouteLength = parseFloat(values[4]) || 0;
        
        return {
          candidateIndex,
          shortestSide,
          shortestColor: colorValue,
          mainRouteLength,
          altRouteLength,
          mapName,
        };
      }
    })
    .filter(item => item !== null) as RouteData[];
};

// Check if a specific route image exists (tries both naming schemes) - for local fallback
const checkImageExists = async (mapName: string, candidateIndex: number, aspect: '16_9' | '9_16', namingScheme?: 'candidate' | 'route'): Promise<boolean> => {
  const aspectFolder = aspect;
  
  if (namingScheme === 'route') {
    const imagePath = `/maps/${mapName}/${aspectFolder}/route_${candidateIndex}.png`;
    try {
      const response = await fetch(imagePath, { method: 'HEAD' });
      return response.ok;
    } catch { return false; }
  }
  
  const imagePath = `/maps/${mapName}/${aspectFolder}/candidate_${candidateIndex}.png`;
  try {
    const response = await fetch(imagePath, { method: 'HEAD' });
    return response.ok;
  } catch { return false; }
};

// Fetch route data from database or local CSV
export const fetchRouteDataForMap = async (mapSource: MapSource): Promise<RouteData[]> => {
  try {
    // Try database first if mapSource.id contains a UUID (database map)
    const isDbMap = mapSource.id.length > 20 && mapSource.id.includes('-');
    
    if (isDbMap) {
      const mapId = mapSource.id.replace('-landscape', '').replace('-portrait', '');
      
      const { data: dbRoutes, error } = await supabase
        .from('route_images')
        .select('candidate_index, shortest_side, main_route_length, alt_route_length, image_path')
        .eq('map_id', mapId)
        .eq('aspect_ratio', mapSource.aspect)
        .order('candidate_index');

      if (!error && dbRoutes && dbRoutes.length > 0) {
        console.log(`Loaded ${dbRoutes.length} routes from database for ${mapSource.name} (${mapSource.aspect})`);
        
        return dbRoutes.map(route => {
          // User maps have paths like "userId/mapId/aspect/file.webp"
          // Admin maps have paths like "mapname/aspect/file.webp"
          const isUserMap = route.image_path.split('/').length > 3;
          const baseUrl = isUserMap ? USER_ROUTE_STORAGE_URL : STORAGE_URL;
          
          return {
            candidateIndex: route.candidate_index,
            shortestSide: (route.shortest_side === 'left' ? 'left' : 'right') as 'left' | 'right',
            shortestColor: route.shortest_side === 'left' ? 'red' : 'blue',
            mainRouteLength: Number(route.main_route_length) || 0,
            altRouteLength: Number(route.alt_route_length) || 0,
            mapName: mapSource.name,
            imagePath: `${baseUrl}/${route.image_path}`,
          };
        });
      }
    }

    // Fallback to local CSV
    if (!mapSource.csvPath) {
      console.warn(`No CSV path for ${mapSource.name}`);
      return [];
    }

    console.log(`Fetching routes from local CSV: ${mapSource.csvPath}`);
    const response = await fetch(mapSource.csvPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
    }
    const csvText = await response.text();
    const data = parseCSV(csvText, mapSource.name);
    
    // Validate each route has a corresponding image
    const validatedRoutes: RouteData[] = [];
    const imageCheckPromises = data.map(async (route) => {
      const exists = await checkImageExists(mapSource.name, route.candidateIndex, mapSource.aspect, mapSource.namingScheme);
      return { route, exists };
    });
    
    const results = await Promise.all(imageCheckPromises);
    
    for (const { route, exists } of results) {
      if (exists) {
        validatedRoutes.push(route);
      }
    }
    
    console.log(`Loaded ${validatedRoutes.length}/${data.length} routes for map ${mapSource.name} (${mapSource.aspect})`);
    return validatedRoutes.sort((a, b) => a.candidateIndex - b.candidateIndex);
  } catch (error) {
    console.error('Error fetching route data:', error);
    return [];
  }
};

// Fetch route data from ALL maps (for "All" option)
export const fetchAllRoutesData = async (isMobile: boolean): Promise<{ routes: RouteData[]; maps: MapSource[] }> => {
  try {
    const allMaps = await getAvailableMaps();
    const aspect = isMobile ? '9_16' : '16_9';
    const filteredMaps = allMaps.filter(map => map.aspect === aspect);
    
    console.log(`Fetching all routes for ${filteredMaps.length} maps`);
    
    const allRoutes: RouteData[] = [];
    
    for (const mapSource of filteredMaps) {
      const routes = await fetchRouteDataForMap(mapSource);
      allRoutes.push(...routes);
    }
    
    // Shuffle the routes for variety
    const shuffledRoutes = allRoutes.sort(() => Math.random() - 0.5);
    
    console.log(`Total routes loaded: ${shuffledRoutes.length}`);
    return { routes: shuffledRoutes, maps: filteredMaps };
  } catch (error) {
    console.error('Error fetching all routes:', error);
    return { routes: [], maps: [] };
  }
};

// Cache for detected naming schemes per map
const namingSchemeCache: Map<string, 'candidate' | 'route'> = new Map();

// Cache for database maps (to know if we should use storage URL)
const dbMapCache: Set<string> = new Set();

// Mark a map as coming from database
export const markAsDbMap = (mapName: string): void => {
  dbMapCache.add(mapName.toLowerCase());
};

// Helper to get image URL by map name
export const getImageUrlByMapName = (mapName: string, candidateIndex: number, isMobile: boolean, imagePath?: string): string => {
  // If imagePath is provided (from database), use it directly
  if (imagePath) {
    return imagePath;
  }

  const aspectFolder = isMobile ? '9_16' : '16_9';
  
  // Check if this is a database map
  if (dbMapCache.has(mapName.toLowerCase())) {
    return `${STORAGE_URL}/${mapName.toLowerCase()}/${aspectFolder}/candidate_${candidateIndex}.webp`;
  }

  // Fallback to local files
  const cacheKey = `${mapName}-${aspectFolder}`;
  const cachedScheme = namingSchemeCache.get(cacheKey);
  
  let prefix: string;
  if (cachedScheme) {
    prefix = cachedScheme === 'route' ? 'route_' : 'candidate_';
  } else {
    prefix = mapName.toLowerCase() === 'rotondella' ? 'route_' : 'candidate_';
  }
  
  return `/maps/${mapName}/${aspectFolder}/${prefix}${candidateIndex}.png`;
};

// Initialize naming scheme cache for a map
export const cacheNamingScheme = (mapName: string, aspect: '16_9' | '9_16', scheme: 'candidate' | 'route'): void => {
  namingSchemeCache.set(`${mapName}-${aspect}`, scheme);
};

// Get unique map names from available maps
export const getUniqueMapNames = (maps: MapSource[]): string[] => {
  const uniqueNames = new Set(maps.map(m => m.name));
  return Array.from(uniqueNames);
};

// Fallback data (for backward compatibility)
export const getRouteData = (): RouteData[] => {
  return [
    { candidateIndex: 1, shortestSide: 'left', shortestColor: 'red', mainRouteLength: 1303.79, altRouteLength: 1318.85 },
    { candidateIndex: 2, shortestSide: 'left', shortestColor: 'red', mainRouteLength: 1157.17, altRouteLength: 1169.77 },
    { candidateIndex: 3, shortestSide: 'left', shortestColor: 'red', mainRouteLength: 959.73, altRouteLength: 975.09 },
  ];
};

// Storage URL for user-uploaded route images
const USER_STORAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object`;

/**
 * Load routes for a user's private map (from user_maps table).
 * These routes are stored in route_maps with source_map_id pointing to user_maps.
 */
export async function loadUserMapRoutes(
  userMapId: string,
  isMobile: boolean
): Promise<{ routes: RouteData[]; map: MapSource | null; userMapName: string }> {
  try {
    // First, get the user map details
    const { data: userMap, error: userMapError } = await supabase
      .from('user_maps')
      .select('id, name, status')
      .eq('id', userMapId)
      .single();

    if (userMapError || !userMap) {
      console.error('User map not found:', userMapError);
      return { routes: [], map: null, userMapName: '' };
    }

    if (userMap.status !== 'completed') {
      console.log('User map is not yet completed:', userMap.status);
      return { routes: [], map: null, userMapName: userMap.name };
    }

    const aspect = isMobile ? '9_16' : '16_9';

    // Find the route_maps entry for this user map
    const { data: routeMap, error: routeMapError } = await supabase
      .from('route_maps')
      .select('id, name, description')
      .eq('source_map_id', userMapId)
      .single();

    if (routeMapError || !routeMap) {
      console.error('Route map not found for user map:', routeMapError);
      return { routes: [], map: null, userMapName: userMap.name };
    }

    // Fetch route images for this map
    const { data: routeImages, error: routeImagesError } = await supabase
      .from('route_images')
      .select('candidate_index, shortest_side, main_route_length, alt_route_length, image_path')
      .eq('map_id', routeMap.id)
      .eq('aspect_ratio', aspect)
      .order('candidate_index');

    if (routeImagesError || !routeImages || routeImages.length === 0) {
      console.error('No route images found:', routeImagesError);
      return { routes: [], map: null, userMapName: userMap.name };
    }

    // Check if images are in user-route-images (private) or route-images (public)
    const firstImagePath = routeImages[0].image_path;
    const isPrivateStorage = firstImagePath.startsWith('user-route-images/') || !firstImagePath.includes('/');
    const bucketName = isPrivateStorage ? 'user-route-images' : 'route-images';

    // Build routes with proper image URLs
    const routes: RouteData[] = routeImages.map(route => {
      // For private bucket, we need to construct signed URL or use public URL if bucket is public
      const imagePath = route.image_path.startsWith(bucketName) 
        ? route.image_path.replace(`${bucketName}/`, '')
        : route.image_path;
      
      const imageUrl = `${USER_STORAGE_URL}/public/${bucketName}/${imagePath}`;
      
      return {
        candidateIndex: route.candidate_index,
        shortestSide: (route.shortest_side === 'left' ? 'left' : 'right') as 'left' | 'right',
        shortestColor: route.shortest_side === 'left' ? 'red' : 'blue',
        mainRouteLength: Number(route.main_route_length) || 0,
        altRouteLength: Number(route.alt_route_length) || 0,
        mapName: userMap.name,
        imagePath: imageUrl,
      };
    });

    // Create a MapSource for compatibility
    const mapSource: MapSource = {
      id: routeMap.id,
      name: userMap.name,
      aspect: aspect,
      csvPath: '',
      imagePathPrefix: '',
      description: routeMap.description || 'User uploaded map',
      folderName: userMap.name,
    };

    console.log(`Loaded ${routes.length} routes for user map: ${userMap.name}`);
    return { routes, map: mapSource, userMapName: userMap.name };
  } catch (error) {
    console.error('Error loading user map routes:', error);
    return { routes: [], map: null, userMapName: '' };
  }
}
