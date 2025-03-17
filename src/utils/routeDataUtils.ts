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
    { candidateIndex: 1, shortestSide: 'left', shortestColor: '#FF5733', mainRouteLength: 100, altRouteLength: 120 },
    { candidateIndex: 2, shortestSide: 'right', shortestColor: '#33FF57', mainRouteLength: 90, altRouteLength: 80 },
    { candidateIndex: 7, shortestSide: 'left', shortestColor: '#3357FF', mainRouteLength: 110, altRouteLength: 130 },
    { candidateIndex: 8, shortestSide: 'right', shortestColor: '#FF33A8', mainRouteLength: 85, altRouteLength: 75 },
    // Add more placeholder entries to match your available images
    { candidateIndex: 3, shortestSide: 'left', shortestColor: '#33FFF0', mainRouteLength: 95, altRouteLength: 85 },
    
    { candidateIndex: 5, shortestSide: 'left', shortestColor: '#33FFF0', mainRouteLength: 95, altRouteLength: 85 },
    { candidateIndex: 6, shortestSide: 'right', shortestColor: '#F0FF33', mainRouteLength: 105, altRouteLength: 95 },
    { candidateIndex: 7, shortestSide: 'left', shortestColor: '#FF8833', mainRouteLength: 120, altRouteLength: 110 },
    { candidateIndex: 8, shortestSide: 'right', shortestColor: '#8833FF', mainRouteLength: 100, altRouteLength: 90 },
    // Add more entries for all 32 images
    { candidateIndex: 9, shortestSide: 'left', shortestColor: '#33FF80', mainRouteLength: 130, altRouteLength: 120 },
    { candidateIndex: 10, shortestSide: 'right', shortestColor: '#FF3380', mainRouteLength: 110, altRouteLength: 100 },
    { candidateIndex: 11, shortestSide: 'left', shortestColor: '#8080FF', mainRouteLength: 95, altRouteLength: 85 },
    { candidateIndex: 12, shortestSide: 'right', shortestColor: '#FF8080', mainRouteLength: 120, altRouteLength: 110 },
    { candidateIndex: 13, shortestSide: 'left', shortestColor: '#80FF80', mainRouteLength: 105, altRouteLength: 95 },
    { candidateIndex: 14, shortestSide: 'right', shortestColor: '#8080FF', mainRouteLength: 115, altRouteLength: 105 },
    { candidateIndex: 15, shortestSide: 'left', shortestColor: '#FFFF80', mainRouteLength: 125, altRouteLength: 115 },
    { candidateIndex: 16, shortestSide: 'right', shortestColor: '#80FFFF', mainRouteLength: 100, altRouteLength: 90 },
    { candidateIndex: 17, shortestSide: 'left', shortestColor: '#FF5733', mainRouteLength: 110, altRouteLength: 100 },
    { candidateIndex: 18, shortestSide: 'right', shortestColor: '#33FF57', mainRouteLength: 120, altRouteLength: 110 },
    { candidateIndex: 19, shortestSide: 'left', shortestColor: '#3357FF', mainRouteLength: 95, altRouteLength: 85 },
    { candidateIndex: 20, shortestSide: 'right', shortestColor: '#FF33A8', mainRouteLength: 105, altRouteLength: 95 },
    { candidateIndex: 21, shortestSide: 'left', shortestColor: '#33FFF0', mainRouteLength: 130, altRouteLength: 120 },
    { candidateIndex: 22, shortestSide: 'right', shortestColor: '#F0FF33', mainRouteLength: 110, altRouteLength: 100 },
    { candidateIndex: 23, shortestSide: 'left', shortestColor: '#FF8833', mainRouteLength: 100, altRouteLength: 90 },
    { candidateIndex: 24, shortestSide: 'right', shortestColor: '#8833FF', mainRouteLength: 120, altRouteLength: 110 },
    { candidateIndex: 25, shortestSide: 'left', shortestColor: '#33FF80', mainRouteLength: 115, altRouteLength: 105 },
    { candidateIndex: 26, shortestSide: 'right', shortestColor: '#FF3380', mainRouteLength: 125, altRouteLength: 115 },
    { candidateIndex: 27, shortestSide: 'left', shortestColor: '#8080FF', mainRouteLength: 105, altRouteLength: 95 },
    { candidateIndex: 28, shortestSide: 'right', shortestColor: '#FF8080', mainRouteLength: 100, altRouteLength: 90 },
    { candidateIndex: 29, shortestSide: 'left', shortestColor: '#80FF80', mainRouteLength: 110, altRouteLength: 100 },
    { candidateIndex: 30, shortestSide: 'right', shortestColor: '#8080FF', mainRouteLength: 120, altRouteLength: 110 },
    { candidateIndex: 31, shortestSide: 'left', shortestColor: '#FFFF80', mainRouteLength: 95, altRouteLength: 85 },
    { candidateIndex: 32, shortestSide: 'right', shortestColor: '#80FFFF', mainRouteLength: 105, altRouteLength: 95 },
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
        return {
          candidateIndex: parseInt(values[0]),
          shortestSide: values[1].toLowerCase() === 'left' ? 'left' : 'right',
          shortestColor: values[2],
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
