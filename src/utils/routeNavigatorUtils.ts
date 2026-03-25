// Bearing from current node to finish (degrees, 0 = up/north)
export function bearingToFinish(
  current: { x: number; y: number },
  finish: { x: number; y: number }
): number {
  // atan2 with inverted Y (pixel coords: Y increases downward)
  const rad = Math.atan2(finish.x - current.x, -(finish.y - current.y));
  return (rad * 180) / Math.PI;
}

// Euclidean distance between two points
export function euclidean(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// Compute optimal length by summing distances along correct branch paths
export function computeOptimalLength(
  decisionPoints: DecisionPoint[],
  start: { x: number; y: number },
  finish: { x: number; y: number }
): number {
  let totalLength = 0;

  // Sum distances along correct branches between consecutive decision points
  for (const dp of decisionPoints) {
    const correctBranch = dp.branches.find((b) => b.is_correct);
    if (correctBranch && correctBranch.path.length >= 2) {
      for (let i = 1; i < correctBranch.path.length; i++) {
        totalLength += euclidean(correctBranch.path[i - 1], correctBranch.path[i]);
      }
    }
  }

  // If no path data, fall back to straight-line sum between decision points
  if (totalLength === 0) {
    const correctDPs = decisionPoints.filter((dp) =>
      dp.branches.some((b) => b.is_correct)
    );
    if (correctDPs.length > 0) {
      totalLength += euclidean(start, correctDPs[0]);
      for (let i = 1; i < correctDPs.length; i++) {
        totalLength += euclidean(correctDPs[i - 1], correctDPs[i]);
      }
      totalLength += euclidean(correctDPs[correctDPs.length - 1], finish);
    } else {
      totalLength = euclidean(start, finish);
    }
  }

  return totalLength;
}

// Score calculation
export function calculateScore(wrongTurns: number, timeMs: number): number {
  const baseScore = Math.max(0, 100 - wrongTurns * 10);
  // Time multiplier: 1.5x if under 5s per decision, scaling down to 0.5x at 30s+
  const avgTimePerDecision = timeMs / 1000; // rough
  const timeMultiplier = Math.max(0.5, Math.min(1.5, 2 - avgTimePerDecision / 20));
  return Math.round(baseScore * timeMultiplier);
}

// Find the first decision point (closest to start)
export function findStartNode(
  decisionPoints: DecisionPoint[],
  start: { x: number; y: number }
): DecisionPoint | null {
  if (decisionPoints.length === 0) return null;
  let closest = decisionPoints[0];
  let minDist = euclidean(start, closest);
  for (const dp of decisionPoints) {
    const d = euclidean(start, dp);
    if (d < minDist) {
      minDist = d;
      closest = dp;
    }
  }
  return closest;
}

// Build adjacency: for each decision point, which other DPs can be reached via branches
export function buildAdjacency(decisionPoints: DecisionPoint[]): Map<number, DecisionPoint> {
  const dpMap = new Map<number, DecisionPoint>();
  for (const dp of decisionPoints) {
    dpMap.set(dp.id, dp);
  }
  return dpMap;
}

// Find the next decision point after choosing a branch
export function findNextNode(
  dpMap: Map<number, DecisionPoint>,
  branch: Branch
): DecisionPoint | null {
  return dpMap.get(branch.to_macro) || null;
}

// Types
export interface Branch {
  to_macro: number;
  path: { x: number; y: number }[];
  is_correct: boolean;
}

export interface DecisionPoint {
  id: number;
  x: number;
  y: number;
  branches: Branch[];
}

export interface NavigatorChallenge {
  id: string;
  map_id: string;
  challenge_index: number;
  start_x: number;
  start_y: number;
  finish_x: number;
  finish_y: number;
  bbox: { min_x: number; max_x: number; min_y: number; max_y: number } | null;
  decision_points: DecisionPoint[];
  optimal_length: number | null;
  difficulty_score: number | null;
}
