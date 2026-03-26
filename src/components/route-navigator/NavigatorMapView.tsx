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
  onBranchSelect: (branch: Branch) => void;
  selectedBranchId?: number | null;
  wrongBranchId?: number | null;
  onImageLoaded?: () => void;
}

const BRANCH_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#be185d'];

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

  // Camera transform — proper world-stage model
  // Structure: viewport → camera (transform) → world (imageWidth×imageHeight) → img + svg
  const cameraTransform = useMemo(() => {
    if (isOverview || !currentNode) {
      // Contain-fit the full image
      const scaleX = containerWidth / imageWidth;
      const scaleY = containerHeight / imageHeight;
      const scale = Math.min(scaleX, scaleY);
      // Center the image
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
    const zoomRadius = 350;
    let scale = Math.min(containerWidth, containerHeight) / (zoomRadius * 2);

    // Clamp scale to sane range
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
  }, [currentNode, finish, containerWidth, containerHeight, imageWidth, imageHeight, isOverview]);

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
          {/* Wide invisible hit area for easy tapping */}
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
          {/* Visible path — outer glow */}
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
          {/* Visible path — core */}
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
          {/* Arrowhead at the end of each branch preview */}
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

  // Overview scale for markers
  const overviewScale = useMemo(() => {
    if (!isOverview) return 1;
    const scaleX = containerWidth / imageWidth;
    const scaleY = containerHeight / imageHeight;
    return Math.min(scaleX, scaleY);
  }, [isOverview, containerWidth, containerHeight, imageWidth, imageHeight]);

  return (
    <div
      className="relative overflow-hidden bg-black"
      style={{ width: containerWidth, height: containerHeight }}
    >
      {/* Camera layer — applies the world→screen transform */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          ...cameraTransform,
        }}
      >
        {/* World layer — fixed pixel dimensions matching source image */}
        <div style={{ position: 'relative', width: imageWidth, height: imageHeight }}>
          {/* Image layer */}
          <img
            src={imageUrl}
            alt="Orienteering map"
            width={imageWidth}
            height={imageHeight}
            style={{ display: 'block', width: imageWidth, height: imageHeight }}
            draggable={false}
            onLoad={handleImageLoad}
          />
          {/* SVG overlay — exact same coordinate space */}
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
            {/* Overview markers */}
            {isOverview && (
              <>
                {/* Start marker - triangle */}
                <polygon
                  points={`${start.x},${start.y - 22 / overviewScale} ${start.x - 20 / overviewScale},${start.y + 12 / overviewScale} ${start.x + 20 / overviewScale},${start.y + 12 / overviewScale}`}
                  fill="none"
                  stroke="#e11d48"
                  strokeWidth={5 / overviewScale}
                />
                {/* Finish marker - double circle */}
                <circle cx={finish.x} cy={finish.y} r={20 / overviewScale} fill="none" stroke="#e11d48" strokeWidth={5 / overviewScale} />
                <circle cx={finish.x} cy={finish.y} r={12 / overviewScale} fill="none" stroke="#e11d48" strokeWidth={4 / overviewScale} />
              </>
            )}

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

      {/* Loading overlay if image not yet loaded */}
      {!imgLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="text-white/60 text-sm">Loading map...</div>
        </div>
      )}
    </div>
  );
};

export default NavigatorMapView;
