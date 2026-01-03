export interface RouteData {
  candidateIndex: number;
  shortestSide: 'left' | 'right';
  shortestColor: string;
  mainRouteLength: number;
  altRouteLength: number;
  mapName?: string;
}

export interface MapSource {
  id: string;
  name: string;
  aspect: '16:9' | '9:16';
  csvPath: string;
  imagePathPrefix: string;
  mapImagePath?: string;
  description?: string;
  folderName?: string;
  namingScheme?: 'candidate' | 'route'; // 'candidate' = candidate_1.png, 'route' = route_0.png
}

// Known map folders - the system will try to find CSVs in these folders
// To add a new map, just add the folder name here
const MAP_FOLDER_NAMES = ['Rotondella', 'Matera'];

// Try different CSV naming patterns
const getCSVPatterns = (folderName: string): string[] => [
  `/maps/${folderName}/${folderName}.csv`,
  `/maps/${folderName}/${folderName.toLowerCase()}.csv`,
  `/maps/${folderName}/${folderName.toUpperCase()}.csv`,
];

// Find the working CSV path for a map folder
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

// Detect which naming scheme a map folder uses
const detectNamingScheme = async (folderName: string, aspect: '16:9' | '9:16'): Promise<'candidate' | 'route' | null> => {
  const aspectFolder = aspect === '16:9' ? '16_9' : '9_16';
  
  // Try candidate_1.png first (old scheme)
  try {
    const candidateResponse = await fetch(`/maps/${folderName}/${aspectFolder}/candidate_1.png`, { method: 'HEAD' });
    if (candidateResponse.ok) return 'candidate';
  } catch {}
  
  // Try route_0.png (new scheme)
  try {
    const routeResponse = await fetch(`/maps/${folderName}/${aspectFolder}/route_0.png`, { method: 'HEAD' });
    if (routeResponse.ok) return 'route';
  } catch {}
  
  return null;
};

// Generate map sources for all available maps
export const getAvailableMaps = async (): Promise<MapSource[]> => {
  try {
    const mapSources: MapSource[] = [];
    
    for (const folderName of MAP_FOLDER_NAMES) {
      const csvPath = await findCSVPath(folderName);
      if (!csvPath) {
        console.warn(`No CSV found for map: ${folderName}`);
        continue;
      }
      
      // Check landscape
      const landscapeScheme = await detectNamingScheme(folderName, '16:9');
      if (landscapeScheme) {
        const prefix = landscapeScheme === 'candidate' ? 'candidate_' : 'route_';
        cacheNamingScheme(folderName, '16:9', landscapeScheme);
        mapSources.push({
          id: `${folderName.toLowerCase()}-landscape`,
          name: folderName,
          aspect: '16:9',
          csvPath,
          imagePathPrefix: `/maps/${folderName}/16_9/${prefix}`,
          folderName,
          namingScheme: landscapeScheme,
        });
      }
      
      // Check portrait
      const portraitScheme = await detectNamingScheme(folderName, '9:16');
      if (portraitScheme) {
        const prefix = portraitScheme === 'candidate' ? 'candidate_' : 'route_';
        cacheNamingScheme(folderName, '9:16', portraitScheme);
        mapSources.push({
          id: `${folderName.toLowerCase()}-portrait`,
          name: folderName,
          aspect: '9:16',
          csvPath,
          imagePathPrefix: `/maps/${folderName}/9_16/${prefix}`,
          folderName,
          namingScheme: portraitScheme,
        });
      }
    }

    console.log(`Found ${mapSources.length} valid map sources`);
    return mapSources;
  } catch (error) {
    console.error('Error loading available maps:', error);
    return [];
  }
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

// Check if a specific route image exists (tries both naming schemes)
const checkImageExists = async (mapName: string, candidateIndex: number, aspect: '16:9' | '9:16', namingScheme?: 'candidate' | 'route'): Promise<boolean> => {
  const aspectFolder = aspect === '16:9' ? '16_9' : '9_16';
  
  // If we know the scheme, use it directly
  if (namingScheme === 'route') {
    const imagePath = `/maps/${mapName}/${aspectFolder}/route_${candidateIndex}.png`;
    try {
      const response = await fetch(imagePath, { method: 'HEAD' });
      return response.ok;
    } catch { return false; }
  }
  
  // Default: try candidate scheme
  const imagePath = `/maps/${mapName}/${aspectFolder}/candidate_${candidateIndex}.png`;
  try {
    const response = await fetch(imagePath, { method: 'HEAD' });
    return response.ok;
  } catch { return false; }
};

// Fetch route data from a specific map source, validating each image exists
export const fetchRouteDataForMap = async (mapSource: MapSource): Promise<RouteData[]> => {
  try {
    console.log(`Fetching routes from: ${mapSource.csvPath} (scheme: ${mapSource.namingScheme})`);
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
      } else {
        console.log(`Skipping route ${route.candidateIndex} for ${mapSource.name} (${mapSource.aspect}) - image not found`);
      }
    }
    
    console.log(`Loaded ${validatedRoutes.length}/${data.length} routes for map ${mapSource.name} (${mapSource.aspect})`);
    return validatedRoutes.sort((a, b) => a.candidateIndex - b.candidateIndex);
  } catch (error) {
    console.error('Error fetching or parsing CSV:', error);
    return [];
  }
};

// Fetch route data from ALL maps (for "All" option)
export const fetchAllRoutesData = async (isMobile: boolean): Promise<{ routes: RouteData[]; maps: MapSource[] }> => {
  try {
    const allMaps = await getAvailableMaps();
    const aspect = isMobile ? '9:16' : '16:9';
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

// Helper to get image URL by map name
// Uses cached scheme if available, otherwise defaults based on known map configurations
export const getImageUrlByMapName = (mapName: string, candidateIndex: number, isMobile: boolean): string => {
  const aspectFolder = isMobile ? '9_16' : '16_9';
  const cacheKey = `${mapName}-${aspectFolder}`;
  const cachedScheme = namingSchemeCache.get(cacheKey);
  
  // Use cached scheme, or determine default based on map name
  // Rotondella uses 'route_' prefix, others use 'candidate_'
  let prefix: string;
  if (cachedScheme) {
    prefix = cachedScheme === 'route' ? 'route_' : 'candidate_';
  } else {
    // Fallback: Rotondella uses route_ prefix, others use candidate_
    prefix = mapName.toLowerCase() === 'rotondella' ? 'route_' : 'candidate_';
  }
  
  return `/maps/${mapName}/${aspectFolder}/${prefix}${candidateIndex}.png`;
};

// Initialize naming scheme cache for a map
export const cacheNamingScheme = (mapName: string, aspect: '16:9' | '9:16', scheme: 'candidate' | 'route'): void => {
  const aspectFolder = aspect === '16:9' ? '16_9' : '9_16';
  namingSchemeCache.set(`${mapName}-${aspectFolder}`, scheme);
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
