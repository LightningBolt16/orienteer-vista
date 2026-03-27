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
  wrongBranchId?: number | null;
  onImageLoaded?: () => void;
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
  wrongBranchId,
  onImageLoaded,
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleImageLoad = useCallback(() => {
    setImgLoaded(true);
    onImageLoaded?.();
  }, [onImageLoaded]);

  // Camera transform
  const cameraTransform = useMemo(() => {
    if (isOverview || isZoomedOut || !currentNode) {
      // Overview: zoom into the start/finish region rather than full map
      if (isOverview && start.x > 0 && finish.x > 0) {
        const cx = (start.x + finish.x) / 2;
        const cy = (start.y + finish.y) / 2;
        const dx = Math.abs(finish.x - start.x);
        const dy = Math.abs(finish.y - start.y);
        const padding = Math.max(dx, dy) * 0.4;
        const regionW = dx + padding * 2;
        const regionH = dy + padding * 2;
        const scaleX = containerWidth / regionW;
        const scaleY = containerHeight / regionH;
        const scale = Math.min(scaleX, scaleY);
        // Clamp so we don't zoom in too much on very close start/finish
        const maxScale = Math.min(containerWidth, containerHeight) / 400;
        const fitScale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
        const finalScale = Math.max(fitScale, Math.min(scale, maxScale));
        return {
          transform: `translate(${containerWidth / 2}px, ${containerHeight / 2}px) scale(${finalScale}) translate(${-cx}px, ${-cy}px)`,
          transformOrigin: '0 0',
          transition: 'transform 0.8s ease-in-out',
        };
      }
      // Zoomed-out or fallback: contain-fit the full image
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

    // Navigation: center on current node, rotate so finish is "up"
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
  }, [currentNode, finish, start, containerWidth, containerHeight, imageWidth, imageHeight, isOverview, isZoomedOut]);

  // Branch SVG paths
  const branchPaths = useMemo(() => {
    if (isOverview || !currentNode) return null;
    return currentNode.branches.map((branch, idx) => {
      const points = getBranchPreviewPath(branch, 250);
      if (points.length < 2) return null;
      const pathStr = points.map((p) => `${p.x},${p.y}`).join(' ');
      const isWrong = wrongBranchId === branch.to_macro;
      const isSelected = selectedBranchId === branch.to_macro;
      const color = isWrong ? '#ef4444' : isSelected ? '#22c55e' : BRANCH_COLORS[idx % BRANCH_COLORS.length];

      return (
        <g key={branch.to_macro}>
          <polyline
            points={pathStr}
            fill="none"
            stroke="transparent"
            strokeWidth={60}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ cursor: 'pointer' }}
            onClick={() => onBranchSelect(branch)}
          />
          <polyline
            points={pathStr}
            fill="none"
            stroke={color}
            strokeWidth={isSelected || isWrong ? 16 : 12}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.35}
            style={{ pointerEvents: 'none' }}
          />
          <polyline
            points={pathStr}
            fill="none"
            stroke={color}
            strokeWidth={isSelected || isWrong ? 10 : 7}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.95}
            style={{ pointerEvents: 'none' }}
          />
          {points.length >= 2 && (() => {
            const last = points[points.length - 1];
            const prev = points[points.length - 2];
            const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
            const arrowLen = 18;
            const arrowAngle = 0.5;
            const x1 = last.x - arrowLen * Math.cos(angle - arrowAngle);
            const y1 = last.y - arrowLen * Math.sin(angle - arrowAngle);
            const x2 = last.x - arrowLen * Math.cos(angle + arrowAngle);
            const y2 = last.y - arrowLen * Math.sin(angle + arrowAngle);
            return (
              <polygon
                points={`${last.x},${last.y} ${x1},${y1} ${x2},${y2}`}
                fill={color}
                fillOpacity={0.9}
                style={{ pointerEvents: 'none' }}
              />
            );
          })()}
          {isWrong && (
            <polyline
              points={pathStr}
              fill="none"
              stroke="#ef4444"
              strokeWidth={18}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={0.4}
              style={{ pointerEvents: 'none' }}
            >
              <animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="0.6s" repeatCount="3" />
            </polyline>
          )}
        </g>
      );
    });
  }, [currentNode, isOverview, onBranchSelect, selectedBranchId, wrongBranchId]);

  // IOF markers — start triangle pointing toward finish, finish double circle
  const iofMarkers = useMemo(() => {
    if (start.x === 0 && start.y === 0) return null;

    const angle = Math.atan2(finish.x - start.x, -(finish.y - start.y)) * (180 / Math.PI);
    const triSize = 22;
    // Equilateral triangle pointing up by default, rotated to point toward finish
    const triPoints = `0,${-triSize} ${-triSize * 0.866},${triSize * 0.5} ${triSize * 0.866},${triSize * 0.5}`;

    const dist = Math.sqrt((finish.x - start.x) ** 2 + (finish.y - start.y) ** 2);
    // Gap near markers for the connecting line
    const gap = 30;
    const dx = (finish.x - start.x) / dist;
    const dy = (finish.y - start.y) / dist;
    const lineStart = { x: start.x + dx * gap, y: start.y + dy * gap };
    const lineEnd = { x: finish.x - dx * gap, y: finish.y - dy * gap };

    return (
      <>
        {/* Connecting dashed line */}
        <line
          x1={lineStart.x} y1={lineStart.y}
          x2={lineEnd.x} y2={lineEnd.y}
          stroke={IOF_PURPLE}
          strokeWidth={3}
          strokeDasharray="12,8"
          strokeOpacity={0.7}
          style={{ pointerEvents: 'none' }}
        />
        {/* Start triangle */}
        <g transform={`translate(${start.x},${start.y}) rotate(${angle})`}>
          <polygon
            points={triPoints}
            fill="none"
            stroke={IOF_PURPLE}
            strokeWidth={3.5}
            style={{ pointerEvents: 'none' }}
          />
        </g>
        {/* Finish double circle */}
        <circle cx={finish.x} cy={finish.y} r={20} fill="none" stroke={IOF_PURPLE} strokeWidth={3.5} style={{ pointerEvents: 'none' }} />
        <circle cx={finish.x} cy={finish.y} r={12} fill="none" stroke={IOF_PURPLE} strokeWidth={3} style={{ pointerEvents: 'none' }} />
      </>
    );
  }, [start, finish]);

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
            {/* IOF start/finish markers — always visible */}
            {iofMarkers}

            {/* Branch paths during navigation */}
            {branchPaths}

            {/* Current node marker */}
            {currentNode && !isOverview && (
              <>
                <circle cx={currentNode.x} cy={currentNode.y} r={18} fill="hsl(24, 100%, 50%)" stroke="white" strokeWidth={4} fillOpacity={0.9} />
                <circle cx={currentNode.x} cy={currentNode.y} r={7} fill="white" />
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
