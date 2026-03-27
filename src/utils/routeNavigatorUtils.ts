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

  for (const dp of decisionPoints) {
    const correctBranch = dp.branches.find((b) => b.is_correct);
    if (correctBranch && correctBranch.path.length >= 2) {
      for (let i = 1; i < correctBranch.path.length; i++) {
        totalLength += euclidean(correctBranch.path[i - 1], correctBranch.path[i]);
      }
    }
  }

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
  const avgTimePerDecision = timeMs / 1000;
  const timeMultiplier = Math.max(0.5, Math.min(1.5, 2 - avgTimePerDecision / 20));
  return Math.round(baseScore * timeMultiplier);
}

// Find the first decision point — prefer nodes with a correct outgoing branch
export function findStartNode(
  decisionPoints: DecisionPoint[],
  start: { x: number; y: number }
): DecisionPoint | null {
  if (decisionPoints.length === 0) return null;

  // Sort by distance to start
  const sorted = [...decisionPoints].sort(
    (a, b) => euclidean(start, a) - euclidean(start, b)
  );

  // Prefer the closest node that has at least one correct branch
  for (const dp of sorted) {
    if (dp.branches.some((b) => b.is_correct)) {
      return dp;
    }
  }

  // Fallback: nearest node regardless
  return sorted[0];
}

// Build adjacency: map from id → DecisionPoint
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

export function resolveBranchDestination(
  dpMap: Map<number, DecisionPoint>,
  branch: Branch,
  _currentNode?: DecisionPoint | null,
  _maxSnapDistance: number = 160
): DecisionPoint | null {
  return findNextNode(dpMap, branch);
}

export function mergeDecisionPointGraphs(graphs: DecisionPoint[][]): DecisionPoint[] {
  const nodeMap = new Map<number, DecisionPoint>();

  for (const graph of graphs) {
    for (const node of graph) {
      const existing = nodeMap.get(node.id);

      if (!existing) {
        nodeMap.set(node.id, {
          id: node.id,
          x: node.x,
          y: node.y,
          branches: node.branches.map((branch) => ({
            to_macro: branch.to_macro,
            path: branch.path.map((point) => ({ ...point })),
            is_correct: false,
          })),
        });
        continue;
      }

      existing.x = existing.x || node.x;
      existing.y = existing.y || node.y;

      const existingKeys = new Set(
        existing.branches.map(
          (branch) => `${branch.to_macro}:${branch.path.map((point) => `${point.x},${point.y}`).join('|')}`
        )
      );

      for (const branch of node.branches) {
        const branchKey = `${branch.to_macro}:${branch.path.map((point) => `${point.x},${point.y}`).join('|')}`;
        if (existingKeys.has(branchKey)) continue;

        existing.branches.push({
          to_macro: branch.to_macro,
          path: branch.path.map((point) => ({ ...point })),
          is_correct: false,
        });
        existingKeys.add(branchKey);
      }
    }
  }

  return Array.from(nodeMap.values());
}

export function applyCorrectEdgesToGraph(
  fullGraph: DecisionPoint[],
  challengeGraph: DecisionPoint[]
): DecisionPoint[] {
  const correctEdges = new Set<string>();

  for (const node of challengeGraph) {
    for (const branch of node.branches) {
      if (branch.is_correct) {
        correctEdges.add(`${node.id}->${branch.to_macro}`);
      }
    }
  }

  return fullGraph.map((node) => ({
    ...node,
    branches: node.branches.map((branch) => ({
      ...branch,
      is_correct: correctEdges.has(`${node.id}->${branch.to_macro}`),
    })),
  }));
}

// Check if a challenge is "reachable" — it must have a start node with a correct branch
// and the correct-path chain must eventually lead to a terminal node or near finish
export function validateChallenge(
  challenge: NavigatorChallenge
): boolean {
  const dps = challenge.decision_points;
  if (!dps || dps.length === 0) return false;

  const start = { x: challenge.start_x, y: challenge.start_y };
  const startNode = findStartNode(dps, start);
  if (!startNode) return false;

  // Must have at least one correct branch from start
  if (!startNode.branches.some((b) => b.is_correct)) return false;

  // Walk the correct-path chain — must terminate (no infinite loops, max depth)
  const dpMap = buildAdjacency(dps);
  const visited = new Set<number>();
  let current: DecisionPoint | null = startNode;
  let steps = 0;

  while (current && steps < 200) {
    if (visited.has(current.id)) return false; // cycle
    visited.add(current.id);
    const correctBranch = current.branches.find((b) => b.is_correct);
    if (!correctBranch) break; // terminal — valid end
    const next = resolveBranchDestination(dpMap, correctBranch, current);
    if (!next) break; // leads to unknown node — treat as terminal
    current = next;
    steps++;
  }

  return visited.size >= 1;
}

// Check if we've reached the finish — only when truly terminal (no branches to explore)
export function isFinishReached(
  nextNode: DecisionPoint | null,
  _branch: Branch,
  _finish: { x: number; y: number },
  _imageWidth: number,
  _imageHeight: number
): boolean {
  // No next node in the graph — terminal
  if (!nextNode) return true;

  // Next node has no branches — terminal
  if (nextNode.branches.length === 0) return true;

  return false;
}

// Get branch preview points — use cumulative distance rather than point count
export function getBranchPreviewPath(branch: Branch, maxDist: number = 200): { x: number; y: number }[] {
  if (branch.path.length < 2) return branch.path;

  const result: { x: number; y: number }[] = [branch.path[0]];
  let cumDist = 0;

  for (let i = 1; i < branch.path.length; i++) {
    const d = euclidean(branch.path[i - 1], branch.path[i]);
    cumDist += d;
    result.push(branch.path[i]);
    if (cumDist >= maxDist) break;
  }

  // Ensure minimum of 80px preview even if points are sparse
  if (cumDist < 80 && branch.path.length > result.length) {
    for (let i = result.length; i < branch.path.length && i < result.length + 20; i++) {
      result.push(branch.path[i]);
    }
  }

  return result;
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
