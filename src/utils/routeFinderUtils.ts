/**
 * Route Finder Utilities
 * 
 * Graph-based pathfinding and route comparison for the Route Finder gamemode.
 * Uses A* algorithm for shortest path finding and snaps freehand drawings to graph nodes.
 * Includes impassability mask validation for accurate path verification.
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

// Build adjacency list for efficient graph traversal
function buildAdjacencyList(graph: RouteFinderGraph): Map<string, Array<{ nodeId: string; weight: number }>> {
  const adjacencyList = new Map<string, Array<{ nodeId: string; weight: number }>>();
  
  // Initialize all nodes
  for (const node of graph.nodes) {
    adjacencyList.set(node.id, []);
  }
  
  // Add edges (bidirectional)
  for (const edge of graph.edges) {
    adjacencyList.get(edge.from)?.push({ nodeId: edge.to, weight: edge.weight });
    adjacencyList.get(edge.to)?.push({ nodeId: edge.from, weight: edge.weight });
  }
  
  return adjacencyList;
}

// Build a map for O(1) node lookup by ID
function buildNodeMap(graph: RouteFinderGraph): Map<string, GraphNode> {
  const nodeMap = new Map<string, GraphNode>();
  for (const node of graph.nodes) {
    nodeMap.set(node.id, node);
  }
  return nodeMap;
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
  // The mask is MASK_SCALE (4x) smaller than the bbox dimensions
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

// Check if a line segment between two points crosses impassable terrain
export function isPathSegmentPassable(
  from: Point,
  to: Point,
  mask: ImpassabilityMask | null,
  bboxWidth?: number,
  bboxHeight?: number,
  samples: number = 10
): boolean {
  if (!mask) return true;
  
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const point: Point = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    };
    if (!isPointPassable(point, mask, bboxWidth, bboxHeight)) {
      return false;
    }
  }
  return true;
}

// Find the nearest graph node to a given point
export function findNearestNode(point: Point, nodes: GraphNode[]): GraphNode | null {
  if (nodes.length === 0) return null;
  
  let nearest = nodes[0];
  let minDist = euclideanDistance(point, nearest);
  
  for (let i = 1; i < nodes.length; i++) {
    const dist = euclideanDistance(point, nodes[i]);
    if (dist < minDist) {
      minDist = dist;
      nearest = nodes[i];
    }
  }
  
  return nearest;
}

// Find the nearest passable graph node to a given point
export function findNearestPassableNode(
  point: Point,
  nodes: GraphNode[],
  mask: ImpassabilityMask | null,
  bboxWidth?: number,
  bboxHeight?: number
): GraphNode | null {
  if (nodes.length === 0) return null;
  
  // Filter to only passable nodes if we have a mask
  const passableNodes = mask
    ? nodes.filter(n => isPointPassable(n, mask, bboxWidth, bboxHeight))
    : nodes;
  
  if (passableNodes.length === 0) {
    // Fall back to nearest node if all are impassable
    return findNearestNode(point, nodes);
  }
  
  return findNearestNode(point, passableNodes);
}

// A* pathfinding algorithm
export function findShortestPath(
  graph: RouteFinderGraph,
  startId: string,
  endId: string
): { path: string[]; length: number } | null {
  const adjacencyList = buildAdjacencyList(graph);
  const nodeMap = buildNodeMap(graph);
  
  const startNode = nodeMap.get(startId);
  const endNode = nodeMap.get(endId);
  
  if (!startNode || !endNode) {
    return null;
  }
  
  // Priority queue using array (could use a proper heap for better performance)
  const openSet: Array<{ nodeId: string; fScore: number }> = [{ nodeId: startId, fScore: 0 }];
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  gScore.set(startId, 0);
  
  // Heuristic: Euclidean distance to goal
  const heuristic = (nodeId: string): number => {
    const node = nodeMap.get(nodeId);
    if (!node) return Infinity;
    return euclideanDistance(node, endNode);
  };
  
  while (openSet.length > 0) {
    // Find node with lowest fScore
    openSet.sort((a, b) => a.fScore - b.fScore);
    const current = openSet.shift()!;
    
    if (current.nodeId === endId) {
      // Reconstruct path
      const path: string[] = [endId];
      let currentId = endId;
      while (cameFrom.has(currentId)) {
        currentId = cameFrom.get(currentId)!;
        path.unshift(currentId);
      }
      return { path, length: gScore.get(endId) || 0 };
    }
    
    const neighbors = adjacencyList.get(current.nodeId) || [];
    for (const neighbor of neighbors) {
      const tentativeGScore = (gScore.get(current.nodeId) || 0) + neighbor.weight;
      
      if (tentativeGScore < (gScore.get(neighbor.nodeId) ?? Infinity)) {
        cameFrom.set(neighbor.nodeId, current.nodeId);
        gScore.set(neighbor.nodeId, tentativeGScore);
        const fScore = tentativeGScore + heuristic(neighbor.nodeId);
        
        // Add to open set if not already there
        if (!openSet.find(n => n.nodeId === neighbor.nodeId)) {
          openSet.push({ nodeId: neighbor.nodeId, fScore });
        }
      }
    }
  }
  
  return null; // No path found
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

// Snap freehand drawing points to nearest graph nodes
export function snapPointsToGraph(
  userPoints: Point[],
  graph: RouteFinderGraph,
  mask?: ImpassabilityMask | null,
  bboxWidth?: number,
  bboxHeight?: number
): string[] {
  if (userPoints.length === 0 || graph.nodes.length === 0) {
    return [];
  }
  
  // Sample the path at regular intervals
  const sampledPoints = samplePath(userPoints, 15);
  
  // Snap each sampled point to nearest node (preferring passable nodes)
  const snappedNodeIds: string[] = [];
  
  for (const point of sampledPoints) {
    const nearestNode = mask
      ? findNearestPassableNode(point, graph.nodes, mask, bboxWidth, bboxHeight)
      : findNearestNode(point, graph.nodes);
    
    if (nearestNode) {
      // Avoid consecutive duplicates
      if (snappedNodeIds.length === 0 || snappedNodeIds[snappedNodeIds.length - 1] !== nearestNode.id) {
        snappedNodeIds.push(nearestNode.id);
      }
    }
  }
  
  return snappedNodeIds;
}

// Reconstruct the actual path the user took through the graph
// by finding shortest paths between consecutive snapped nodes
export function reconstructUserPath(
  snappedNodeIds: string[],
  graph: RouteFinderGraph
): { path: string[]; totalLength: number } {
  if (snappedNodeIds.length < 2) {
    return { path: snappedNodeIds, totalLength: 0 };
  }
  
  const fullPath: string[] = [snappedNodeIds[0]];
  let totalLength = 0;
  
  for (let i = 1; i < snappedNodeIds.length; i++) {
    const segment = findShortestPath(graph, snappedNodeIds[i - 1], snappedNodeIds[i]);
    if (segment && segment.path.length > 1) {
      // Add all nodes except the first (already in fullPath)
      fullPath.push(...segment.path.slice(1));
      totalLength += segment.length;
    }
  }
  
  return { path: fullPath, totalLength };
}

// Check if user's path matches the optimal path
// The path is correct if it follows the same sequence of nodes
export function isPathOptimal(
  userPath: string[],
  optimalPath: string[]
): boolean {
  // Defensive checks for null/undefined
  if (!userPath || !optimalPath) return false;
  if (!Array.isArray(userPath) || !Array.isArray(optimalPath)) return false;
  
  // User path must connect start to finish
  if (userPath.length < 2 || optimalPath.length < 2) return false;
  if (userPath[0] !== optimalPath[0]) return false;
  if (userPath[userPath.length - 1] !== optimalPath[optimalPath.length - 1]) return false;
  
  // Check if paths traverse the same nodes
  // We allow some tolerance: user path should contain all critical nodes in order
  
  // Simple approach: check if user path length is within tolerance of optimal
  // And if the set of nodes largely overlaps
  
  const optimalSet = new Set(optimalPath);
  const userSet = new Set(userPath);
  
  // Calculate overlap
  let overlap = 0;
  for (const nodeId of userPath) {
    if (optimalSet.has(nodeId)) overlap++;
  }
  
  // Path is optimal if:
  // 1. User path covers at least 90% of optimal path nodes
  // 2. User path doesn't deviate too much (not more than 20% extra nodes)
  const optimalCoverage = overlap / optimalPath.length;
  const extraNodes = (userPath.length - overlap) / userPath.length;
  
  return optimalCoverage >= 0.85 && extraNodes <= 0.25;
}

// Get node coordinates for drawing the path
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

// Score a user's drawing against the optimal path
export function scoreDrawing(
  userPoints: Point[],
  graph: RouteFinderGraph,
  mask?: ImpassabilityMask | null,
  bboxWidth?: number,
  bboxHeight?: number
): {
  isCorrect: boolean;
  snappedPath: string[];
  userPathLength: number;
  optimalLength: number;
} {
  // Validate graph data to prevent crashes
  if (!graph || !graph.nodes || !graph.optimalPath || !Array.isArray(graph.optimalPath)) {
    console.error('Invalid graph data for scoring:', { 
      hasGraph: !!graph, 
      hasNodes: !!graph?.nodes, 
      hasOptimalPath: !!graph?.optimalPath 
    });
    return {
      isCorrect: false,
      snappedPath: [],
      userPathLength: 0,
      optimalLength: graph?.optimalLength || 0,
    };
  }

  // 1. Snap user's freehand points to graph nodes (considering impassability)
  const snappedNodeIds = snapPointsToGraph(userPoints, graph, mask, bboxWidth, bboxHeight);
  
  // 2. Reconstruct the actual path through the graph
  const { path: userPath, totalLength: userPathLength } = reconstructUserPath(snappedNodeIds, graph);
  
  // 3. Compare to optimal path
  const isCorrect = isPathOptimal(userPath, graph.optimalPath);
  
  return {
    isCorrect,
    snappedPath: userPath,
    userPathLength,
    optimalLength: graph.optimalLength,
  };
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
