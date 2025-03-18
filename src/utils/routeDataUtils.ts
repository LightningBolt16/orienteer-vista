
export interface RouteData {
  candidateIndex: number;
  shortestSide: 'left' | 'right';
  shortestColor: string;
  mainRouteLength: number;
  altRouteLength: number;
}

// This function would typically fetch and parse a CSV file
// For now, we'll use a placeholder that should be replaced with the actual CSV data
export const getRouteData = (): RouteData[] => {
  // This is a placeholder for the CSV data
  // The actual implementation should fetch and parse the CSV file from your GitHub repo
  // Format: Candidate_Index,Shortest_Side,Shortest_Color,Main_Route_Length,Alt_Route_Length
  return [
    // Example data format - replace with your actual data
    { candidateIndex: 1, shortestSide: 'left', shortestColor: 'red', mainRouteLength: 1451.24, altRouteLength: 1466.53 },
    { candidateIndex: 2, shortestSide: 'right', shortestColor: 'blue', mainRouteLength: 1532.60, altRouteLength: 1542.85 },
    { candidateIndex: 3, shortestSide: 'right', shortestColor: 'blue', mainRouteLength: 1205.36, altRouteLength: 1216.65 },
    { candidateIndex: 4, shortestSide: 'left', shortestColor: 'red', mainRouteLength: 1651.07, altRouteLength: 1663.30 },
    { candidateIndex: 5, shortestSide: 'right', shortestColor: 'blue', mainRouteLength: 1429.73, altRouteLength: 1452.24 },
    { candidateIndex: 6, shortestSide: 'left', shortestColor: 'red', mainRouteLength: 1157.17, altRouteLength: 1169.77 },
    { candidateIndex: 7, shortestSide: 'left', shortestColor: 'red', mainRouteLength: 1598.61, altRouteLength: 1620.62 },
    { candidateIndex: 8, shortestSide: 'right', shortestColor: 'blue', mainRouteLength: 1079.92, altRouteLength: 1092.79 },
    { candidateIndex: 9, shortestSide: 'left', shortestColor: 'red', mainRouteLength: 1564.17, altRouteLength: 1594.24 },
    { candidateIndex: 10, shortestSide: 'left', shortestColor: 'red', mainRouteLength: 1060.21, altRouteLength: 1072.47 },
    { candidateIndex: 11, shortestSide: 'left', shortestColor: 'red', mainRouteLength: 1419.95, altRouteLength: 1438.81 },
    { candidateIndex: 12, shortestSide: 'left', shortestColor: 'red', mainRouteLength: 1295.52, altRouteLength: 1306.98 },
  ].sort((a, b) => a.candidateIndex - b.candidateIndex); // Sort by candidateIndex to ensure consistent order
};

// You can fetch the CSV from GitHub once you've uploaded it using this function
export const fetchRouteDataFromCSV = async (url: string): Promise<RouteData[]> => {
  try {
    const response = await fetch(url);
    const csvText = await response.text();
    
    // Parse CSV
    const lines = csvText.split('\n');
    const header = lines[0].split(',');
    
    const data = lines.slice(1)
      .filter(line => line.trim() !== '') // Skip empty lines
      .map((line) => {
        const values = line.split(',');
        
        // Ensure the side value is a valid 'left' or 'right' value
        const sideValue = values[1].toLowerCase();
        const shortestSide = sideValue === 'left' ? 'left' : 'right' as 'left' | 'right';
        
        // Color mapping - use the actual color value from CSV
        const colorValue = values[2].toLowerCase();
        
        return {
          candidateIndex: parseInt(values[0]),
          shortestSide: shortestSide,
          shortestColor: colorValue,
          mainRouteLength: parseFloat(values[3]),
          altRouteLength: parseFloat(values[4])
        };
      })
      .sort((a, b) => a.candidateIndex - b.candidateIndex); // Sort by candidateIndex
      
    return data;
  } catch (error) {
    console.error('Error fetching or parsing CSV:', error);
    return getRouteData(); // Fallback to default data
  }
};
