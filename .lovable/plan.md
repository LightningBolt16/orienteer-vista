
# Route Finder Overhaul: Debug Mode, Proximity Scoring, and Correct Route Display

## Summary

This plan addresses the fundamental issues with Route Finder by:
1. Adding a debug mode to visualize the impassability mask overlay
2. Removing the broken snapping logic entirely
3. Implementing proximity-based scoring (how close did the user draw to the optimal path?)
4. Using the pre-rendered answer image to show the correct route (guaranteed accurate since it's generated server-side)

## Root Cause Analysis

### Problem 1: Coordinate Alignment Mismatch
The Modal processor uses `bbox_inches='tight', pad_inches=0` when saving images, which causes matplotlib to crop the output to fit the content. This means:
- The bbox is 2672x2039 pixels
- But the saved image might be 2650x2020 (slightly smaller due to tight layout)
- The graph coordinates are relative to the original 2672x2039 bbox
- Result: coordinates don't align with the actual image

### Problem 2: object-contain Creates Letterboxing
When the container aspect ratio doesn't match the image, `object-contain` adds letterboxing (black bars). The canvas overlay fills the entire container, but the image doesn't, causing misalignment.

### Problem 3: Snapping Is Fundamentally Broken
The snapping algorithm tries to match freehand points to graph nodes, but:
- Graph nodes are sparse (only at skeleton junctions)
- The mask validation uses coordinates that don't align with the image
- Path reconstruction through A* creates artificial paths

## Solution

### Part 1: Use Answer Image Instead of Reconstructing Optimal Path
The server already generates a perfect answer image with the route pre-drawn. Instead of trying to reconstruct the path client-side, simply swap to the answer image after submission.

### Part 2: Implement Proximity-Based Scoring
Instead of binary "correct/wrong" based on snapping:
- Sample points along the user's freehand drawing
- Measure average distance from each point to the nearest point on the optimal path
- Score = 100 - (average_distance / max_threshold) * 100
- Display percentage score with encouraging feedback

### Part 3: Add Debug Mode
Toggle-able overlay that shows:
- The impassability mask (black/white) at 50% opacity over the color map
- Helps diagnose coordinate alignment issues
- Graph nodes rendered as small circles (optional)

### Part 4: Fix Canvas Alignment
Calculate the actual image position within the container accounting for `object-contain` letterboxing.

## Implementation

### Step 1: Update RouteFinderResult - Use Answer Image

Show the pre-rendered answer image instead of trying to draw paths client-side:

```typescript
// RouteFinderResult.tsx
// Replace complex canvas path drawing with simple image swap

return (
  <div className="relative w-full h-full bg-black">
    {/* Show the answer image which has the correct route pre-rendered */}
    <img
      src={answerImageUrl}  // New prop - the pre-rendered answer image
      alt="Answer"
      className="absolute inset-0 w-full h-full object-contain"
    />
    
    {/* Overlay user's drawing on top */}
    <UserPathOverlay userPoints={userPoints} />
    
    {/* Result indicator and controls */}
    ...
  </div>
);
```

### Step 2: Update RouteFinderGame - Pass Answer Image URL

```typescript
// RouteFinderGame.tsx
// Pass the answer image path to the result component

<RouteFinderResult
  answerImageUrl={getImageUrl(currentChallenge.answer_image_path)}
  userPoints={lastResult.userPoints}  // Raw freehand points, not snapped
  score={lastResult.score}  // Proximity-based score 0-100
  ...
/>
```

### Step 3: New Proximity Scoring Function

```typescript
// routeFinderUtils.ts

export interface ProximityScore {
  score: number;           // 0-100 percentage
  averageDistance: number; // Average pixel distance from optimal path
  maxDistance: number;     // Maximum distance from optimal path
  reachedFinish: boolean;  // Did user's path end near the finish?
}

export function scoreByProximity(
  userPoints: Point[],
  optimalPath: Point[],
  startMarker: Point,
  finishMarker: Point,
  toleranceRadius: number = 80  // Pixels - how close is "good"
): ProximityScore {
  if (userPoints.length < 2 || optimalPath.length < 2) {
    return { score: 0, averageDistance: Infinity, maxDistance: Infinity, reachedFinish: false };
  }
  
  // Build KD-tree-like structure from optimal path for fast nearest neighbor
  // (For simplicity, use brute force with sampling)
  const sampledUser = samplePath(userPoints, 10);  // Sample every 10px
  
  let totalDistance = 0;
  let maxDist = 0;
  
  for (const userPt of sampledUser) {
    const minDist = Math.min(...optimalPath.map(optPt => 
      euclideanDistance(userPt, optPt)
    ));
    totalDistance += minDist;
    maxDist = Math.max(maxDist, minDist);
  }
  
  const avgDist = totalDistance / sampledUser.length;
  
  // Check if user reached the finish (within tolerance)
  const lastUserPoint = userPoints[userPoints.length - 1];
  const reachedFinish = euclideanDistance(lastUserPoint, finishMarker) <= toleranceRadius;
  
  // Calculate score (100 = perfect, 0 = avg distance >= toleranceRadius)
  // Bonus for reaching finish
  let score = Math.max(0, 100 - (avgDist / toleranceRadius) * 100);
  if (reachedFinish) {
    score = Math.min(100, score + 10);  // Bonus for reaching finish
  }
  
  return {
    score: Math.round(score),
    averageDistance: Math.round(avgDist),
    maxDistance: Math.round(maxDist),
    reachedFinish,
  };
}
```

### Step 4: Add Debug Mode Toggle

```typescript
// RouteDrawingCanvas.tsx - Add debug overlay

interface RouteDrawingCanvasProps {
  // ... existing props
  debugMode?: boolean;
}

// In the component:
{debugMode && impassabilityMask && (
  <canvas
    ref={debugCanvasRef}
    className="absolute inset-0 w-full h-full pointer-events-none opacity-50"
    style={{ mixBlendMode: 'multiply' }}
  />
)}

// Draw the mask on the debug canvas
useEffect(() => {
  if (!debugMode || !impassabilityMask || !debugCanvasRef.current) return;
  
  const ctx = debugCanvasRef.current.getContext('2d');
  // Create ImageData from mask and draw it
  const imageData = new ImageData(
    impassabilityMask.width,
    impassabilityMask.height
  );
  // Copy mask data (grayscale to RGBA)
  for (let i = 0; i < impassabilityMask.width * impassabilityMask.height; i++) {
    const val = impassabilityMask.data[i * 4];  // Red channel
    imageData.data[i * 4] = val;
    imageData.data[i * 4 + 1] = val;
    imageData.data[i * 4 + 2] = val;
    imageData.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
}, [debugMode, impassabilityMask]);
```

### Step 5: Update RouteFinder Page - Add Debug Toggle

```typescript
// RouteFinder.tsx
const [debugMode, setDebugMode] = useState(false);

// Add toggle button in game view
<Button
  variant="ghost"
  size="icon"
  onClick={() => setDebugMode(!debugMode)}
  className="absolute top-4 right-16 z-20 bg-background/80"
>
  <Bug className="h-5 w-5" />
</Button>
```

### Step 6: Fix Canvas Alignment for object-contain

```typescript
// Add utility function to calculate actual image bounds within container

function getImageBoundsInContainer(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number; width: number; height: number } {
  const containerRatio = containerWidth / containerHeight;
  const imageRatio = imageWidth / imageHeight;
  
  let renderWidth: number, renderHeight: number, offsetX: number, offsetY: number;
  
  if (imageRatio > containerRatio) {
    // Image is wider - letterbox top/bottom
    renderWidth = containerWidth;
    renderHeight = containerWidth / imageRatio;
    offsetX = 0;
    offsetY = (containerHeight - renderHeight) / 2;
  } else {
    // Image is taller - letterbox left/right
    renderHeight = containerHeight;
    renderWidth = containerHeight * imageRatio;
    offsetX = (containerWidth - renderWidth) / 2;
    offsetY = 0;
  }
  
  return { x: offsetX, y: offsetY, width: renderWidth, height: renderHeight };
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/routeFinderUtils.ts` | Add `scoreByProximity()`, remove complex snapping |
| `src/components/route-finder/RouteFinderGame.tsx` | Use proximity scoring, pass answer image URL |
| `src/components/route-finder/RouteFinderResult.tsx` | Show answer image instead of drawing paths, display score % |
| `src/components/route-finder/RouteDrawingCanvas.tsx` | Add debug mode overlay for mask |
| `src/pages/RouteFinder.tsx` | Add debug toggle button |

## Result Display Changes

### Before (Complex, Broken)
- Canvas draws user path (magenta)
- Canvas draws optimal path (green) by looking up node coordinates
- Both paths misaligned due to coordinate issues

### After (Simple, Reliable)
- Show answer image (has correct route pre-rendered in red)
- Optionally overlay user's raw freehand drawing (magenta)
- Display proximity score (e.g., "78% - Good job!")
- Score based on average distance from optimal path

## Scoring Feedback Examples

| Score Range | Feedback |
|-------------|----------|
| 90-100% | "Excellent! Nearly perfect route!" |
| 70-89% | "Good job! Close to the optimal path" |
| 50-69% | "Not bad, but there's a shorter route" |
| 0-49% | "Try to find a more direct path" |

## Technical Notes

### Why Use Answer Image?
- Generated server-side with perfect coordinate alignment
- No client-side coordinate transformation needed
- Route is drawn directly on the cropped map image
- Guaranteed to be correct (computed from the same A* path)

### Why Proximity Scoring?
- Works with raw freehand points (no snapping needed)
- Intuitive for users (higher % = closer to optimal)
- Tolerant of small deviations
- Rewards getting close even if not perfect

### Debug Mode Purpose
- Helps diagnose any remaining alignment issues
- Shows impassable areas as a semi-transparent overlay
- Can be used during development or by advanced users
