
export interface RouteData {
  candidateIndex: number;
  shortestSide: 'left' | 'right';
  shortestColor: string;
  mainRouteLength: number;
  altRouteLength: number;
}

export interface MapSource {
  id: string;
  name: string;
  aspect: '16:9' | '9:16';
  csvPath: string;
  imagePathPrefix: string;
  mapImagePath?: string; // Path to the full map image (for course setter)
  description?: string;
}

// Helper function to capitalize the first letter of each word
const capitalizeMapName = (folderName: string): string => {
  return folderName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Function to generate map sources based on available maps
export const getAvailableMaps = async (): Promise<MapSource[]> => {
  try {
    // In a production environment, this would be a server-side function
    // For now, we'll hardcode the available maps based on the folder structure
    
    const mapSources: MapSource[] = [
      {
        id: 'default-landscape',
        name: 'Default (Landscape)',
        aspect: '16:9',
        csvPath: '/maps/default/default.csv',
        imagePathPrefix: '/maps/default/16_9/candidate_',
        mapImagePath: '/maps/default/map.png',
        description: 'The original orienteering map in landscape format'
      },
      {
        id: 'default-portrait',
        name: 'Default (Portrait)',
        aspect: '9:16',
        csvPath: '/maps/default/default.csv',
        imagePathPrefix: '/maps/default/9_16/candidate_',
        mapImagePath: '/maps/default/map.png',
        description: 'The original orienteering map adapted for mobile devices'
      },
      {
        id: 'forest-landscape',
        name: 'Forest (Landscape)',
        aspect: '16:9',
        csvPath: '/maps/forest/forest.csv',
        imagePathPrefix: '/maps/forest/16_9/candidate_',
        mapImagePath: '/maps/forest/map.png',
        description: 'A dense forest map with complex route choices'
      },
      {
        id: 'forest-portrait',
        name: 'Forest (Portrait)',
        aspect: '9:16',
        csvPath: '/maps/forest/forest.csv',
        imagePathPrefix: '/maps/forest/9_16/candidate_',
        mapImagePath: '/maps/forest/map.png',
        description: 'A dense forest map with complex route choices for mobile'
      },
      {
        id: 'urban-landscape',
        name: 'Urban (Landscape)',
        aspect: '16:9',
        csvPath: '/maps/urban/urban.csv',
        imagePathPrefix: '/maps/urban/16_9/candidate_',
        mapImagePath: '/maps/urban/map.png',
        description: 'An urban environment with buildings and streets'
      },
      {
        id: 'urban-portrait',
        name: 'Urban (Portrait)',
        aspect: '9:16',
        csvPath: '/maps/urban/urban.csv',
        imagePathPrefix: '/maps/urban/9_16/candidate_',
        mapImagePath: '/maps/urban/map.png',
        description: 'An urban environment with buildings and streets for mobile'
      }
    ];

    // Filter out maps that don't exist by checking if their map image exists
    const validMaps = await Promise.all(
      mapSources.map(async (map) => {
        try {
          if (!map.mapImagePath) return null;
          
          // Try to fetch the map image to see if it exists
          const response = await fetch(map.mapImagePath, { method: 'HEAD' });
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

// Fallback data for when CSV fetch fails
const fallbackRouteData: RouteData[] = [
  { candidateIndex: 1, shortestSide: 'left' as const, shortestColor: 'red', mainRouteLength: 1451.24, altRouteLength: 1466.53 },
  { candidateIndex: 2, shortestSide: 'right' as const, shortestColor: 'blue', mainRouteLength: 1532.60, altRouteLength: 1542.85 },
  { candidateIndex: 3, shortestSide: 'right' as const, shortestColor: 'blue', mainRouteLength: 1205.36, altRouteLength: 1216.65 },
  { candidateIndex: 4, shortestSide: 'left' as const, shortestColor: 'red', mainRouteLength: 1651.07, altRouteLength: 1663.30 },
  { candidateIndex: 5, shortestSide: 'right' as const, shortestColor: 'blue', mainRouteLength: 1429.73, altRouteLength: 1452.24 },
  { candidateIndex: 6, shortestSide: 'left' as const, shortestColor: 'red', mainRouteLength: 1157.17, altRouteLength: 1169.77 },
  { candidateIndex: 7, shortestSide: 'left' as const, shortestColor: 'red', mainRouteLength: 1598.61, altRouteLength: 1620.62 },
  { candidateIndex: 8, shortestSide: 'right' as const, shortestColor: 'blue', mainRouteLength: 1079.92, altRouteLength: 1092.79 },
  { candidateIndex: 9, shortestSide: 'left' as const, shortestColor: 'red', mainRouteLength: 1564.17, altRouteLength: 1594.24 },
  { candidateIndex: 10, shortestSide: 'left' as const, shortestColor: 'red', mainRouteLength: 1060.21, altRouteLength: 1072.47 },
  { candidateIndex: 11, shortestSide: 'left' as const, shortestColor: 'red', mainRouteLength: 1419.95, altRouteLength: 1438.81 },
  { candidateIndex: 12, shortestSide: 'left' as const, shortestColor: 'red', mainRouteLength: 1295.52, altRouteLength: 1306.98 },
].sort((a, b) => a.candidateIndex - b.candidateIndex);

// Get default route data (for backward compatibility)
export const getRouteData = (): RouteData[] => {
  return fallbackRouteData;
};

// Fetch route data from a specific map source
export const fetchRouteDataForMap = async (mapSource: MapSource): Promise<RouteData[]> => {
  try {
    const response = await fetch(mapSource.csvPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
    }
    const csvText = await response.text();
    
    // Parse CSV
    const lines = csvText.split('\n');
    const header = lines[0].split(',');
    
    const data = lines.slice(1)
      .filter(line => line.trim() !== '') // Skip empty lines
      .map((line) => {
        const values = line.split(',');
        
        // Skip header line if it's repeated in the data
        if (values[0].toLowerCase() === 'candidate_index') {
          return null;
        }
        
        // Ensure the side value is a valid 'left' or 'right' value
        const sideValue = values[1]?.toLowerCase() || '';
        const shortestSide = (sideValue === 'left' ? 'left' : 'right') as 'left' | 'right';
        
        // Color mapping - use the actual color value from CSV
        const colorValue = values[2]?.toLowerCase() || 'red';
        
        const candidateIndex = parseInt(values[0]);
        if (isNaN(candidateIndex)) {
          return null; // Skip invalid data
        }
        
        return {
          candidateIndex,
          shortestSide,
          shortestColor: colorValue,
          mainRouteLength: parseFloat(values[3]) || 0,
          altRouteLength: parseFloat(values[4]) || 0
        };
      })
      .filter(item => item !== null) as RouteData[];
      
    return data.sort((a, b) => a.candidateIndex - b.candidateIndex); // Sort by candidateIndex
  } catch (error) {
    console.error('Error fetching or parsing CSV:', error);
    return fallbackRouteData; // Fallback to default data
  }
};

// Helper to get image URL based on map source and candidate index
export const getImageUrl = (mapSource: MapSource, candidateIndex: number, isMobile: boolean): string => {
  return `${mapSource.imagePathPrefix}${candidateIndex}.png`;
};

