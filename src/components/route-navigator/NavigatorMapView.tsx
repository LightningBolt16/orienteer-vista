import React, { useMemo, useCallback, useState } from 'react';
import { bearingToFinish, DecisionPoint, Branch, getBranchPreviewPath } from '@/utils/routeNavigatorUtils';

type MapPoint = { x: number; y: number };

interface NavigatorMapViewProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  currentNode: DecisionPoint | null;
  finish: { x: number; y: number };
  start: { x: number; y: number };
  containerWidth: number;
  containerHeight: number;
  isOverview: boolean;
  isZoomedOut?: boolean;
  onBranchSelect: (branch: Branch) => void;
  selectedBranchId?: number | null;
  onImageLoaded?: () => void;
  traversedPath?: { x: number; y: number }[];
  correctPath?: { x: number; y: number }[];
  showResult?: boolean;
}

const BRANCH_COLORS = [
  'hsl(221 83% 53%)',
  'hsl(0 72% 51%)',
  'hsl(142 71% 45%)',
  'hsl(32 95% 44%)',
  'hsl(262 83% 58%)',
  'hsl(188 89% 38%)',
  'hsl(330 81% 43%)',
];
const IOF_PURPLE = 'hsl(300 95% 50%)';
const ARROW_CORE = 'hsl(0 0% 100%)';

const getSegmentLength = (from: MapPoint, to: MapPoint) => Math.hypot(to.x - from.x, to.y - from.y);

const trimPolylineStart = (points: MapPoint[], trimDistance: number): MapPoint[] => {
  if (points.length < 2 || trimDistance <= 0) return points;

  let remaining = trimDistance;

  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1];
    const to = points[i];
    const segmentLength = getSegmentLength(from, to);

    if (segmentLength === 0) continue;

    if (remaining <= segmentLength) {
      const t = remaining / segmentLength;
      return [
        {
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
        },
        ...points.slice(i),
      ];
    }

    remaining -= segmentLength;
  }

  return [points[points.length - 1]];
};

const trimPolyline = (points: MapPoint[], trimStart: number, trimEnd: number): MapPoint[] => {
  const trimmedStart = trimPolylineStart(points, trimStart);
  if (trimmedStart.length < 2) return trimmedStart;

  const reversed = [...trimmedStart].reverse();
  const trimmedEnd = trimPolylineStart(reversed, trimEnd).reverse();
  return trimmedEnd.length >= 2 ? trimmedEnd : trimmedStart;
};

const NavigatorMapView: React.FC<NavigatorMapViewProps> = ({
  imageUrl,
  imageWidth,
  imageHeight,
  currentNode,
  finish,
  start,
  containerWidth,
  containerHeight,
  isOverview,
  isZoomedOut = false,
  onBranchSelect,
  selectedBranchId,
  onImageLoaded,
  traversedPath,
  correctPath,
  showResult = false,
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleImageLoad = useCallback(() => {
    setImgLoaded(true);
    onImageLoaded?.();
  }, [onImageLoaded]);

  // Marker sizes scaled to map
  const markerScale = useMemo(() => {
    const mapDiag = Math.sqrt(imageWidth ** 2 + imageHeight ** 2);
    return Math.max(0.6, Math.min(2.5, mapDiag / 3000));
  }, [imageWidth, imageHeight]);

  const triSize = 32 * markerScale;
  const finishOuterR = 28 * markerScale;
  const finishInnerR = 18 * markerScale;
  const strokeW = 4.5 * markerScale;
  const markerGap = 40 * markerScale;

  // Camera transform
  const cameraTransform = useMemo(() => {
    if (isOverview || isZoomedOut || !currentNode) {
      if ((isOverview || showResult) && start.x > 0 && finish.x > 0) {
        const cx = (start.x + finish.x) / 2;
        const cy = (start.y + finish.y) / 2;
        const dx = Math.abs(finish.x - start.x);
        const dy = Math.abs(finish.y - start.y);
        // For result view, use more padding so routes aren't hidden behind the card
        const paddingMul = showResult ? 0.7 : 0.4;
        const padding = Math.max(dx, dy) * paddingMul;
        const regionW = dx + padding * 2;
        const regionH = dy + padding * 2;
        const scaleX = containerWidth / regionW;
        const scaleY = containerHeight / regionH;
        const scale = Math.min(scaleX, scaleY);
        const maxScale = Math.min(containerWidth, containerHeight) / 400;
        const fitScale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
        const finalScale = Math.max(fitScale, Math.min(scale, maxScale));
        // For result, shift the map upward so the bottom card doesn't cover routes
        const yOffset = showResult ? -containerHeight * 0.12 : 0;
        return {
          transform: `translate(${containerWidth / 2}px, ${containerHeight / 2 + yOffset}px) scale(${finalScale}) translate(${-cx}px, ${-cy}px)`,
          transformOrigin: '0 0',
          transition: 'transform 0.8s ease-in-out',
        };
      }
      const scaleX = containerWidth / imageWidth;
      const scaleY = containerHeight / imageHeight;
      const scale = Math.min(scaleX, scaleY);
      const cx = imageWidth / 2;
      const cy = imageHeight / 2;
      return {
        transform: `translate(${containerWidth / 2}px, ${containerHeight / 2}px) scale(${scale}) translate(${-cx}px, ${-cy}px)`,
        transformOrigin: '0 0',
        transition: 'transform 0.8s ease-in-out',
      };
    }

    const bearing = bearingToFinish(currentNode, finish);
    const zoomRadius = 250;
    let scale = Math.min(containerWidth, containerHeight) / (zoomRadius * 2);
    const minScale = Math.min(containerWidth, containerHeight) / Math.max(imageWidth, imageHeight);
    scale = Math.max(scale, minScale * 0.5);
    scale = Math.min(scale, 8);

    return {
      transform: [
        `translate(${containerWidth / 2}px, ${containerHeight / 2}px)`,
        `rotate(${-bearing}deg)`,
        `scale(${scale})`,
        `translate(${-currentNode.x}px, ${-currentNode.y}px)`,
      ].join(' '),
      transformOrigin: '0 0',
      transition: 'transform 0.6s ease-in-out',
    };
  }, [currentNode, finish, start, containerWidth, containerHeight, imageWidth, imageHeight, isOverview, isZoomedOut, showResult]);

  // Branch SVG paths — clean arrows with large hit areas
  const branchPaths = useMemo(() => {
    if (isOverview || !currentNode) return null;
    return currentNode.branches.map((branch, idx) => {
      const points = getBranchPreviewPath(branch, 300);
      if (points.length < 2) return null;

      const isSelected = selectedBranchId === branch.to_macro;
      const color = isSelected ? 'hsl(142 71% 45%)' : BRANCH_COLORS[idx % BRANCH_COLORS.length];
      const totalLength = points.slice(1).reduce((sum, point, pointIndex) => {
        return sum + getSegmentLength(points[pointIndex], point);
      }, 0);

      const headLength = Math.min(34, Math.max(22, totalLength * 0.22));
      const trimStart = Math.min(28, totalLength * 0.18);
      const shaftPoints = trimPolyline(points, trimStart, headLength);
      if (shaftPoints.length < 2) return null;

      const first = shaftPoints[0];
      let d = `M ${first.x} ${first.y}`;
      for (let i = 1; i < shaftPoints.length; i++) {
        d += ` L ${shaftPoints[i].x} ${shaftPoints[i].y}`;
      }

      const last = points[points.length - 1];
      const prev = points[points.length - 2];
      const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
      const baseCenter = shaftPoints[shaftPoints.length - 1];
      const headWidth = headLength * 0.95;
      const normalX = Math.sin(angle);
      const normalY = -Math.cos(angle);
      const leftBase = {
        x: baseCenter.x + normalX * (headWidth / 2),
        y: baseCenter.y + normalY * (headWidth / 2),
      };
      const rightBase = {
        x: baseCenter.x - normalX * (headWidth / 2),
        y: baseCenter.y - normalY * (headWidth / 2),
      };
      const innerHeadScale = 0.52;
      const innerBaseCenter = {
        x: last.x + (baseCenter.x - last.x) * innerHeadScale,
        y: last.y + (baseCenter.y - last.y) * innerHeadScale,
      };
      const innerHalfWidth = (headWidth * innerHeadScale) / 2;
      const innerLeftBase = {
        x: innerBaseCenter.x + normalX * innerHalfWidth,
        y: innerBaseCenter.y + normalY * innerHalfWidth,
      };
      const innerRightBase = {
        x: innerBaseCenter.x - normalX * innerHalfWidth,
        y: innerBaseCenter.y - normalY * innerHalfWidth,
      };
      const hitWidth = Math.max(18, Math.min(30, totalLength * 0.12));

      return (
        <g key={branch.to_macro}>
          <path
            d={d}
            fill="none"
            stroke="transparent"
            strokeWidth={hitWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ cursor: 'pointer' }}
            onClick={() => onBranchSelect(branch)}
          />
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={isSelected ? 14 : 11}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.22}
            style={{ pointerEvents: 'none' }}
          />
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={isSelected ? 8.5 : 6.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.96}
            style={{ pointerEvents: 'none' }}
          />
          <path
            d={d}
            fill="none"
            stroke={ARROW_CORE}
            strokeWidth={isSelected ? 3.6 : 2.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.96}
            style={{ pointerEvents: 'none' }}
          />
          <polygon
            points={`${last.x},${last.y} ${leftBase.x},${leftBase.y} ${rightBase.x},${rightBase.y}`}
            fill={color}
            fillOpacity={0.98}
            style={{ cursor: 'pointer' }}
            onClick={() => onBranchSelect(branch)}
          />
          <polygon
            points={`${last.x},${last.y} ${innerLeftBase.x},${innerLeftBase.y} ${innerRightBase.x},${innerRightBase.y}`}
            fill={ARROW_CORE}
            fillOpacity={0.96}
            style={{ pointerEvents: 'none' }}
          />
        </g>
      );
    });
  }, [currentNode, isOverview, onBranchSelect, selectedBranchId]);

  // IOF markers
  const iofMarkers = useMemo(() => {
    if (start.x === 0 && start.y === 0) return null;

    const angle = Math.atan2(finish.x - start.x, -(finish.y - start.y)) * (180 / Math.PI);
    const triPoints = `0,${-triSize} ${-triSize * 0.866},${triSize * 0.5} ${triSize * 0.866},${triSize * 0.5}`;

    const dist = Math.sqrt((finish.x - start.x) ** 2 + (finish.y - start.y) ** 2);
    const dx = (finish.x - start.x) / dist;
    const dy = (finish.y - start.y) / dist;
    const lineStart = { x: start.x + dx * markerGap, y: start.y + dy * markerGap };
    const lineEnd = { x: finish.x - dx * markerGap, y: finish.y - dy * markerGap };

    return (
      <>
        <line
          x1={lineStart.x} y1={lineStart.y}
          x2={lineEnd.x} y2={lineEnd.y}
          stroke={IOF_PURPLE}
          strokeWidth={strokeW * 0.8}
          strokeDasharray={`${16 * markerScale},${10 * markerScale}`}
          strokeOpacity={0.7}
          style={{ pointerEvents: 'none' }}
        />
        <g transform={`translate(${start.x},${start.y}) rotate(${angle})`}>
          <polygon
            points={triPoints}
            fill="none"
            stroke={IOF_PURPLE}
            strokeWidth={strokeW}
            style={{ pointerEvents: 'none' }}
          />
        </g>
        <circle cx={finish.x} cy={finish.y} r={finishOuterR} fill="none" stroke={IOF_PURPLE} strokeWidth={strokeW} style={{ pointerEvents: 'none' }} />
        <circle cx={finish.x} cy={finish.y} r={finishInnerR} fill="none" stroke={IOF_PURPLE} strokeWidth={strokeW * 0.85} style={{ pointerEvents: 'none' }} />
      </>
    );
  }, [start, finish, triSize, finishOuterR, finishInnerR, strokeW, markerGap, markerScale]);

  // Correct path rendering (green, for result screen)
  const correctPathSvg = useMemo(() => {
    if (!showResult || !correctPath || correctPath.length < 2) return null;
    const pathStr = correctPath.map((p) => `${p.x},${p.y}`).join(' ');
    return (
      <>
        <polyline
          points={pathStr}
          fill="none"
          stroke="#22c55e"
          strokeWidth={14}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.25}
          style={{ pointerEvents: 'none' }}
        />
        <polyline
          points={pathStr}
          fill="none"
          stroke="#22c55e"
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.8}
          style={{ pointerEvents: 'none' }}
        />
      </>
    );
  }, [showResult, correctPath]);

  // Traversed path rendering (red/orange, for result screen — player's actual path)
  const traversedPathSvg = useMemo(() => {
    if (!showResult || !traversedPath || traversedPath.length < 2) return null;
    const pathStr = traversedPath.map((p) => `${p.x},${p.y}`).join(' ');
    return (
      <>
        <polyline
          points={pathStr}
          fill="none"
          stroke="#f97316"
          strokeWidth={14}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.25}
          style={{ pointerEvents: 'none' }}
        />
        <polyline
          points={pathStr}
          fill="none"
          stroke="#f97316"
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.85}
          strokeDasharray="12,8"
          style={{ pointerEvents: 'none' }}
        />
        {/* Decision point dots on player path */}
        {traversedPath.map((p, i) => (
          i > 0 && i < traversedPath.length - 1 ? (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={5}
              fill="#f97316"
              fillOpacity={0.8}
              stroke="white"
              strokeWidth={1.5}
              style={{ pointerEvents: 'none' }}
            />
          ) : null
        ))}
      </>
    );
  }, [showResult, traversedPath]);

  return (
    <div
      className="relative overflow-hidden bg-black"
      style={{ width: containerWidth, height: containerHeight }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          ...cameraTransform,
        }}
      >
        <div style={{ position: 'relative', width: imageWidth, height: imageHeight }}>
          <img
            src={imageUrl}
            alt="Orienteering map"
            width={imageWidth}
            height={imageHeight}
            style={{ display: 'block', width: imageWidth, height: imageHeight }}
            draggable={false}
            onLoad={handleImageLoad}
          />
          <svg
            width={imageWidth}
            height={imageHeight}
            viewBox={`0 0 ${imageWidth} ${imageHeight}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
            {iofMarkers}
            {correctPathSvg}
            {traversedPathSvg}
            {branchPaths}

            {/* Current node marker */}
            {currentNode && !isOverview && !showResult && (
              <>
                <circle cx={currentNode.x} cy={currentNode.y} r={22} fill="hsl(24, 100%, 50%)" stroke="white" strokeWidth={5} fillOpacity={0.9} />
                <circle cx={currentNode.x} cy={currentNode.y} r={8} fill="white" />
              </>
            )}
          </svg>
        </div>
      </div>

      {!imgLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="text-white/60 text-sm">Loading map...</div>
        </div>
      )}
    </div>
  );
};

export default NavigatorMapView;
