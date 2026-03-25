import React, { useMemo } from 'react';
import { bearingToFinish, DecisionPoint, Branch } from '@/utils/routeNavigatorUtils';

interface NavigatorMapViewProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  currentNode: DecisionPoint | null;
  finish: { x: number; y: number };
  containerWidth: number;
  containerHeight: number;
  isOverview: boolean;
  onBranchSelect: (branch: Branch) => void;
  selectedBranchId?: number | null;
  wrongBranchId?: number | null;
}

const BRANCH_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed'];

const NavigatorMapView: React.FC<NavigatorMapViewProps> = ({
  imageUrl,
  imageWidth,
  imageHeight,
  currentNode,
  finish,
  containerWidth,
  containerHeight,
  isOverview,
  onBranchSelect,
  selectedBranchId,
  wrongBranchId,
}) => {
  const transform = useMemo(() => {
    if (isOverview || !currentNode) {
      // Fit entire image in container
      const scaleX = containerWidth / imageWidth;
      const scaleY = containerHeight / imageHeight;
      const scale = Math.min(scaleX, scaleY);
      const tx = (containerWidth - imageWidth * scale) / 2;
      const ty = (containerHeight - imageHeight * scale) / 2;
      return {
        transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
        transformOrigin: '0 0',
        transition: 'transform 0.8s ease-in-out',
      };
    }

    // Zoomed into current node, rotated so finish is UP
    const bearing = bearingToFinish(currentNode, finish);
    const zoomRadius = 350; // pixels of source image visible
    const scale = Math.min(containerWidth, containerHeight) / (zoomRadius * 2);

    // Center the current node in the container
    const tx = containerWidth / 2 - currentNode.x * scale;
    const ty = containerHeight / 2 - currentNode.y * scale;

    return {
      transform: `translate(${tx}px, ${ty}px) scale(${scale}) rotate(${-bearing}deg)`,
      transformOrigin: `${currentNode.x}px ${currentNode.y}px`,
      transition: 'transform 0.6s ease-in-out',
    };
  }, [currentNode, finish, containerWidth, containerHeight, imageWidth, imageHeight, isOverview]);

  // Render branch paths as SVG polylines on top of the image
  const branchPaths = useMemo(() => {
    if (isOverview || !currentNode) return null;
    return currentNode.branches.map((branch, idx) => {
      const points = branch.path.slice(0, 30); // first ~30 points for visibility
      if (points.length < 2) return null;
      const pathStr = points.map((p) => `${p.x},${p.y}`).join(' ');
      const isWrong = wrongBranchId === branch.to_macro;
      const isSelected = selectedBranchId === branch.to_macro;
      const color = isWrong ? '#ef4444' : isSelected ? '#22c55e' : BRANCH_COLORS[idx % BRANCH_COLORS.length];

      return (
        <g key={branch.to_macro}>
          {/* Invisible fat hit area */}
          <polyline
            points={pathStr}
            fill="none"
            stroke="transparent"
            strokeWidth={40}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ cursor: 'pointer' }}
            onClick={() => onBranchSelect(branch)}
          />
          {/* Visible path */}
          <polyline
            points={pathStr}
            fill="none"
            stroke={color}
            strokeWidth={isSelected || isWrong ? 8 : 6}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.85}
            style={{ pointerEvents: 'none' }}
          />
          {/* Animated pulse for wrong */}
          {isWrong && (
            <polyline
              points={pathStr}
              fill="none"
              stroke="#ef4444"
              strokeWidth={12}
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

  return (
    <div
      className="relative overflow-hidden bg-black"
      style={{ width: containerWidth, height: containerHeight }}
    >
      <div style={transform}>
        <img
          src={imageUrl}
          alt="Orienteering map"
          width={imageWidth}
          height={imageHeight}
          style={{ display: 'block', width: imageWidth, height: imageHeight }}
          draggable={false}
        />
        {/* SVG overlay for branches */}
        <svg
          width={imageWidth}
          height={imageHeight}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: imageWidth,
            height: imageHeight,
          }}
        >
          {branchPaths}
          {/* Current node marker */}
          {currentNode && !isOverview && (
            <circle
              cx={currentNode.x}
              cy={currentNode.y}
              r={12}
              fill="hsl(24, 100%, 50%)"
              stroke="white"
              strokeWidth={3}
            />
          )}
        </svg>
      </div>

      {/* Overview markers for start/finish */}
      {isOverview && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ ...transform }}
        >
          {/* These could be positioned in image coords */}
        </div>
      )}
    </div>
  );
};

export default NavigatorMapView;
