/**
 * Route Finder Utilities
 * 
 * Proximity-based scoring for the Route Finder gamemode.
 * Measures how closely a freehand drawing follows the optimal path.
 */

export interface GraphNode {
  id: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
}

export interface RouteFinderGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  start: string;
  finish: string;
  optimalPath: string[];
  optimalLength: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface ImpassabilityMask {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  scale: number; // How many original pixels per mask pixel (e.g., 4 = 1/4 resolution)
}

export interface ProximityScore {
  score: number;           // 0-100 percentage
  averageDistance: number; // Average pixel distance from optimal path
  maxDistance: number;     // Maximum distance from optimal path
  reachedStart: boolean;   // Did user's path start near the start?
  reachedFinish: boolean;  // Did user's path end near the finish?
}

// Calculate Euclidean distance between two points
export function euclideanDistance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Check if a point is on passable terrain using the mask
export function isPointPassable(
  point: Point,
  mask: ImpassabilityMask | null,
  bboxWidth?: number,
  bboxHeight?: number
): boolean {
  if (!mask) return true;
  
  // If we have bbox dimensions, we need to scale the point to mask coordinates
  const scaleX = mask.width / (bboxWidth || mask.width * mask.scale);
  const scaleY = mask.height / (bboxHeight || mask.height * mask.scale);
  
  const maskX = Math.floor(point.x * scaleX);
  const maskY = Math.floor(point.y * scaleY);
  
  // Bounds check
  if (maskX < 0 || maskX >= mask.width || maskY < 0 || maskY >= mask.height) {
    return false; // Out of bounds = impassable
  }
  
  // Get pixel value (RGBA format, check red channel)
  const idx = (maskY * mask.width + maskX) * 4;
  return mask.data[idx] > 128; // White (>128) is passable, black (<=128) is impassable
}

// Build a map for O(1) node lookup by ID
function buildNodeMap(graph: RouteFinderGraph): Map<string, GraphNode> {
  const nodeMap = new Map<string, GraphNode>();
  for (const node of graph.nodes) {
    nodeMap.set(node.id, node);
  }
  return nodeMap;
}

// Get node coordinates for a path
export function getPathCoordinates(
  nodeIds: string[],
  graph: RouteFinderGraph
): Point[] {
  const nodeMap = buildNodeMap(graph);
  return nodeIds
    .map(id => nodeMap.get(id))
    .filter((node): node is GraphNode => node !== undefined)
    .map(node => ({ x: node.x, y: node.y }));
}

// Sample points along a freehand path at regular intervals
export function samplePath(points: Point[], interval: number = 15): Point[] {
  if (points.length < 2) return points;
  
  const sampled: Point[] = [points[0]];
  let accumulatedDistance = 0;
  
  for (let i = 1; i < points.length; i++) {
    const dist = euclideanDistance(points[i - 1], points[i]);
    accumulatedDistance += dist;
    
    while (accumulatedDistance >= interval) {
      accumulatedDistance -= interval;
      // Interpolate between points[i-1] and points[i]
      const ratio = 1 - (accumulatedDistance / dist);
      sampled.push({
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * ratio,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * ratio,
      });
    }
  }
  
  // Always include the last point
  const lastPoint = points[points.length - 1];
  if (euclideanDistance(sampled[sampled.length - 1], lastPoint) > 1) {
    sampled.push(lastPoint);
  }
  
  return sampled;
}

// Densify the optimal path by sampling along edges
function densifyOptimalPath(optimalCoords: Point[], sampleInterval: number = 5): Point[] {
  if (optimalCoords.length < 2) return optimalCoords;
  
  const densified: Point[] = [optimalCoords[0]];
  
  for (let i = 1; i < optimalCoords.length; i++) {
    const from = optimalCoords[i - 1];
    const to = optimalCoords[i];
    const dist = euclideanDistance(from, to);
    const numSamples = Math.max(1, Math.ceil(dist / sampleInterval));
    
    for (let j = 1; j <= numSamples; j++) {
      const t = j / numSamples;
      densified.push({
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      });
    }
  }
  
  return densified;
}

/**
 * Score a user's freehand drawing based on proximity to the optimal path.
 * 
 * @param userPoints - Raw freehand drawing points from the user
 * @param optimalCoords - Coordinates of the optimal path nodes
 * @param startMarker - Start point coordinates
 * @param finishMarker - Finish point coordinates
 * @param toleranceRadius - Maximum distance (in pixels) for a "perfect" score
 * @returns ProximityScore with percentage score and distance metrics
 */
export function scoreByProximity(
  userPoints: Point[],
  optimalCoords: Point[],
  startMarker: Point,
  finishMarker: Point,
  toleranceRadius: number = 100
): ProximityScore {
  if (userPoints.length < 2 || optimalCoords.length < 2) {
    return { 
      score: 0, 
      averageDistance: Infinity, 
      maxDistance: Infinity, 
      reachedStart: false,
      reachedFinish: false 
    };
  }
  
  // Densify the optimal path for better distance measurements
  const denseOptimal = densifyOptimalPath(optimalCoords, 5);
  
  // Sample user's path at regular intervals
  const sampledUser = samplePath(userPoints, 10);
  
  // Calculate distance from each user point to nearest optimal point
  let totalDistance = 0;
  let maxDist = 0;
  
  for (const userPt of sampledUser) {
    let minDist = Infinity;
    for (const optPt of denseOptimal) {
      const dist = euclideanDistance(userPt, optPt);
      if (dist < minDist) minDist = dist;
    }
    totalDistance += minDist;
    maxDist = Math.max(maxDist, minDist);
  }
  
  const avgDist = totalDistance / sampledUser.length;
  
  // Check if user started near the start marker
  const firstUserPoint = userPoints[0];
  const reachedStart = euclideanDistance(firstUserPoint, startMarker) <= toleranceRadius;
  
  // Check if user reached the finish (within tolerance)
  const lastUserPoint = userPoints[userPoints.length - 1];
  const reachedFinish = euclideanDistance(lastUserPoint, finishMarker) <= toleranceRadius;
  
  // Calculate base score (100 = perfect, decays as avgDist increases)
  // Using a smoother decay function
  let score = Math.max(0, 100 - (avgDist / toleranceRadius) * 50);
  
  // Bonus for reaching start and finish
  if (reachedStart) score = Math.min(100, score + 5);
  if (reachedFinish) score = Math.min(100, score + 10);
  
  // Penalty for not reaching endpoints
  if (!reachedStart) score = Math.max(0, score - 15);
  if (!reachedFinish) score = Math.max(0, score - 15);
  
  return {
    score: Math.round(score),
    averageDistance: Math.round(avgDist),
    maxDistance: Math.round(maxDist),
    reachedStart,
    reachedFinish,
  };
}

/**
 * Get feedback message based on proximity score
 */
export function getScoreFeedback(score: number, reachedFinish: boolean): string {
  if (score >= 90) return "Excellent! Nearly perfect route!";
  if (score >= 70) return "Good job! Close to the optimal path";
  if (score >= 50) return "Not bad, but there's a shorter route";
  if (!reachedFinish) return "Try to reach the finish marker";
  return "Try to find a more direct path";
}

// Load impassability mask from image URL
export async function loadImpassabilityMask(
  maskUrl: string,
  scale: number = 4
): Promise<ImpassabilityMask | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Failed to get canvas context for mask');
        resolve(null);
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      resolve({
        data: imageData.data,
        width: canvas.width,
        height: canvas.height,
        scale,
      });
    };
    
    img.onerror = () => {
      console.error('Failed to load impassability mask:', maskUrl);
      resolve(null);
    };
    
    img.src = maskUrl;
  });
}
