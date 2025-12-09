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
}

// Known map folders - the system will try to find CSVs in these folders
// To add a new map, just add the folder name here
const MAP_FOLDER_NAMES = ['Rotondella', 'Kista'];

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

// Validate that images exist for a map
const validateMapImages = async (folderName: string, aspect: '16:9' | '9:16'): Promise<boolean> => {
  const aspectFolder = aspect === '16:9' ? '16_9' : '9_16';
  const testImagePath = `/maps/${folderName}/${aspectFolder}/candidate_1.png`;
  
  try {
    const response = await fetch(testImagePath, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

// Generate map sources for all available maps
export const getAvailableMaps = async (): Promise<MapSource[]> => {
  try {
    const mapSources: MapSource[] = [];
    
    for (const folderName of MAP_FOLDER_NAMES) {
      // Find the CSV file
      const csvPath = await findCSVPath(folderName);
      if (!csvPath) {
        console.warn(`No CSV found for map: ${folderName}`);
        continue;
      }
      
      // Check if landscape images exist
      const hasLandscape = await validateMapImages(folderName, '16:9');
      if (hasLandscape) {
        mapSources.push({
          id: `${folderName.toLowerCase()}-landscape`,
          name: folderName,
          aspect: '16:9',
          csvPath,
          imagePathPrefix: `/maps/${folderName}/16_9/candidate_`,
          folderName,
        });
      }
      
      // Check if portrait images exist
      const hasPortrait = await validateMapImages(folderName, '9:16');
      if (hasPortrait) {
        mapSources.push({
          id: `${folderName.toLowerCase()}-portrait`,
          name: folderName,
          aspect: '9:16',
          csvPath,
          imagePathPrefix: `/maps/${folderName}/9_16/candidate_`,
          folderName,
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
    })
    .filter(item => item !== null) as RouteData[];
};

// Fetch route data from a specific map source
export const fetchRouteDataForMap = async (mapSource: MapSource): Promise<RouteData[]> => {
  try {
    console.log(`Fetching routes from: ${mapSource.csvPath}`);
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

// Helper to get image URL by map name
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
