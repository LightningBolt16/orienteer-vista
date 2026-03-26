import React, { useMemo } from 'react';
import { bearingToFinish, DecisionPoint, Branch } from '@/utils/routeNavigatorUtils';

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
}) => {
  const transform = useMemo(() => {
    if (isOverview || !currentNode) {
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

    const bearing = bearingToFinish(currentNode, finish);
    const zoomRadius = 350;
    const scale = Math.min(containerWidth, containerHeight) / (zoomRadius * 2);

    const tx = containerWidth / 2 - currentNode.x * scale;
    const ty = containerHeight / 2 - currentNode.y * scale;

    return {
      transform: `translate(${tx}px, ${ty}px) scale(${scale}) rotate(${-bearing}deg)`,
      transformOrigin: `${currentNode.x}px ${currentNode.y}px`,
      transition: 'transform 0.6s ease-in-out',
    };
  }, [currentNode, finish, containerWidth, containerHeight, imageWidth, imageHeight, isOverview]);

  // Overview scale for markers
  const overviewScale = useMemo(() => {
    if (!isOverview) return 1;
    const scaleX = containerWidth / imageWidth;
    const scaleY = containerHeight / imageHeight;
    return Math.min(scaleX, scaleY);
  }, [isOverview, containerWidth, containerHeight, imageWidth, imageHeight]);

  const branchPaths = useMemo(() => {
    if (isOverview || !currentNode) return null;
    return currentNode.branches.map((branch, idx) => {
      const points = branch.path.slice(0, 30);
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
            strokeWidth={50}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ cursor: 'pointer' }}
            onClick={() => onBranchSelect(branch)}
          />
          <polyline
            points={pathStr}
            fill="none"
            stroke={color}
            strokeWidth={isSelected || isWrong ? 10 : 7}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.9}
            style={{ pointerEvents: 'none' }}
          />
          {isWrong && (
            <polyline
              points={pathStr}
              fill="none"
              stroke="#ef4444"
              strokeWidth={14}
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
          {/* Overview: start triangle and finish circle */}
          {isOverview && (
            <>
              {/* Start marker - triangle */}
              <polygon
                points={`${start.x},${start.y - 18 / overviewScale} ${start.x - 16 / overviewScale},${start.y + 10 / overviewScale} ${start.x + 16 / overviewScale},${start.y + 10 / overviewScale}`}
                fill="none"
                stroke="#e11d48"
                strokeWidth={4 / overviewScale}
              />
              {/* Finish marker - double circle */}
              <circle cx={finish.x} cy={finish.y} r={16 / overviewScale} fill="none" stroke="#e11d48" strokeWidth={4 / overviewScale} />
              <circle cx={finish.x} cy={finish.y} r={10 / overviewScale} fill="none" stroke="#e11d48" strokeWidth={3 / overviewScale} />
            </>
          )}

          {branchPaths}

          {/* Current node marker */}
          {currentNode && !isOverview && (
            <>
              <circle cx={currentNode.x} cy={currentNode.y} r={14} fill="hsl(24, 100%, 50%)" stroke="white" strokeWidth={3} />
              <circle cx={currentNode.x} cy={currentNode.y} r={6} fill="white" />
            </>
          )}
        </svg>
      </div>
    </div>
  );
};

export default NavigatorMapView;
