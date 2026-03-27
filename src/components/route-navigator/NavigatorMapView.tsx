import React, { useMemo, useCallback, useState } from 'react';
import { bearingToFinish, DecisionPoint, Branch, getBranchPreviewPath } from '@/utils/routeNavigatorUtils';

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

const BRANCH_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#be185d'];
const IOF_PURPLE = '#f20dff';

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
      const color = isSelected ? '#22c55e' : BRANCH_COLORS[idx % BRANCH_COLORS.length];

      // Build a smooth SVG path instead of polyline
      const first = points[0];
      let d = `M ${first.x} ${first.y}`;
      for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x} ${points[i].y}`;
      }

      // Arrowhead at the end
      const last = points[points.length - 1];
      const prev = points[points.length - 2];
      const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
      const headLen = 24;
      const headW = Math.PI / 5;
      const lx = last.x - headLen * Math.cos(angle - headW);
      const ly = last.y - headLen * Math.sin(angle - headW);
      const rx = last.x - headLen * Math.cos(angle + headW);
      const ry = last.y - headLen * Math.sin(angle + headW);

      return (
        <g key={branch.to_macro}>
          {/* Wide invisible hit area for the entire branch */}
          <path
            d={d}
            fill="none"
            stroke="transparent"
            strokeWidth={100}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ cursor: 'pointer' }}
            onClick={() => onBranchSelect(branch)}
          />
          {/* Soft shadow */}
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={isSelected ? 18 : 14}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.2}
            style={{ pointerEvents: 'none' }}
          />
          {/* Main stroke */}
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={isSelected ? 10 : 7}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.9}
            style={{ pointerEvents: 'none' }}
          />
          {/* Clean arrowhead triangle */}
          <polygon
            points={`${last.x},${last.y} ${lx},${ly} ${rx},${ry}`}
            fill={color}
            fillOpacity={0.9}
            style={{ pointerEvents: 'none' }}
          />
          {/* Extra hit area at arrow tip */}
          <circle
            cx={last.x}
            cy={last.y}
            r={50}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onClick={() => onBranchSelect(branch)}
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
