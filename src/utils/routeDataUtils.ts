export interface RouteData {
  candidateIndex: number;
  shortestSide: 'left' | 'right';
  shortestColor: string;
  mainRouteLength: number;
  altRouteLength: number;
  mapName?: string; // Added to track which map this route belongs to
}

export interface MapSource {
  id: string;
  name: string;
  aspect: '16:9' | '9:16';
  csvPath: string;
  imagePathPrefix: string;
  mapImagePath?: string;
  description?: string;
  folderName?: string; // The actual folder name for building paths
}

// Available map definitions - add new maps here
const MAP_DEFINITIONS = [
  { folderName: 'Rotondella', displayName: 'Rotondella', description: 'Italian orienteering terrain' },
  { folderName: 'Kista', displayName: 'Kista', description: 'Swedish urban orienteering' },
];

// Generate map sources for all available maps
export const getAvailableMaps = async (): Promise<MapSource[]> => {
  try {
    const mapSources: MapSource[] = [];
    
    for (const mapDef of MAP_DEFINITIONS) {
      // Add landscape version (16:9)
      mapSources.push({
        id: `${mapDef.folderName.toLowerCase()}-landscape`,
        name: mapDef.displayName,
        aspect: '16:9',
        csvPath: `/maps/${mapDef.folderName}/${mapDef.folderName}.csv`,
        imagePathPrefix: `/maps/${mapDef.folderName}/16_9/candidate_`,
        mapImagePath: `/maps/${mapDef.folderName}/${mapDef.folderName}.png`,
        description: mapDef.description,
        folderName: mapDef.folderName,
      });
      
      // Add portrait version (9:16)
      mapSources.push({
        id: `${mapDef.folderName.toLowerCase()}-portrait`,
        name: mapDef.displayName,
        aspect: '9:16',
        csvPath: `/maps/${mapDef.folderName}/${mapDef.folderName}.csv`,
        imagePathPrefix: `/maps/${mapDef.folderName}/9_16/candidate_`,
        mapImagePath: `/maps/${mapDef.folderName}/${mapDef.folderName}.png`,
        description: mapDef.description,
        folderName: mapDef.folderName,
      });
    }

    // Validate maps by checking if CSV exists
    const validMaps = await Promise.all(
      mapSources.map(async (map) => {
        try {
          const response = await fetch(map.csvPath, { method: 'HEAD' });
          return response.ok ? map : null;
        } catch (error) {
          console.warn(`Map ${map.name} not available:`, error);
          return null;
        }
      })
    );

    return validMaps.filter(Boolean) as MapSource[];
  } catch (error) {
    console.error('Error loading available maps:', error);
    return [];
  }
};

// Parse CSV text into RouteData array
const parseCSV = (csvText: string, mapName?: string): RouteData[] => {
  const lines = csvText.split('\n');
  
  return lines.slice(1)
    .filter(line => line.trim() !== '')
    .map((line) => {
      const values = line.split(',');
      
      if (values[0].toLowerCase() === 'candidate_index') {
        return null;
      }
      
      const candidateIndex = parseInt(values[0]);
      if (isNaN(candidateIndex)) {
        return null;
      }
      
      const sideValue = values[1]?.toLowerCase() || '';
      const shortestSide = (sideValue === 'left' ? 'left' : 'right') as 'left' | 'right';
      const colorValue = values[2]?.toLowerCase() || 'red';
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
    })
    .filter(item => item !== null) as RouteData[];
};

// Fetch route data from a specific map source
export const fetchRouteDataForMap = async (mapSource: MapSource): Promise<RouteData[]> => {
  try {
    const response = await fetch(mapSource.csvPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
    }
    const csvText = await response.text();
    const data = parseCSV(csvText, mapSource.name);
    
    console.log(`Loaded ${data.length} routes for map ${mapSource.name}`);
    return data.sort((a, b) => a.candidateIndex - b.candidateIndex);
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
    
    const allRoutes: RouteData[] = [];
    
    for (const mapSource of filteredMaps) {
      const routes = await fetchRouteDataForMap(mapSource);
      // Add map identifier to each route for image path resolution
      routes.forEach(route => {
        route.mapName = mapSource.name;
      });
      allRoutes.push(...routes);
    }
    
    // Shuffle the routes for variety
    const shuffledRoutes = allRoutes.sort(() => Math.random() - 0.5);
    
    return { routes: shuffledRoutes, maps: filteredMaps };
  } catch (error) {
    console.error('Error fetching all routes:', error);
    return { routes: [], maps: [] };
  }
};

// Helper to get image URL based on map source and candidate index
export const getImageUrl = (mapSource: MapSource, candidateIndex: number, isMobile: boolean): string => {
  const aspectFolder = isMobile ? '9_16' : '16_9';
  const folderName = mapSource.folderName || mapSource.name;
  
  return `/maps/${folderName}/${aspectFolder}/candidate_${candidateIndex}.png`;
};

// Get image URL when you have the map name instead of full MapSource
export const getImageUrlByMapName = (mapName: string, candidateIndex: number, isMobile: boolean): string => {
  const aspectFolder = isMobile ? '9_16' : '16_9';
  return `/maps/${mapName}/${aspectFolder}/candidate_${candidateIndex}.png`;
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
