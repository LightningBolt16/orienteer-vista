
import React from 'react';

interface MapEventHandlersProps {
  handleMapDragStart: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleCombinedMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleCombinedMouseUp: () => void;
  handleWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
  handleToolAction?: (e: React.MouseEvent<HTMLDivElement>) => void;
  mapRef: React.RefObject<HTMLDivElement>;
  zoomLevel: number;
  mapPosition: { x: number; y: number };
  children: React.ReactNode;
  viewMode: 'edit' | 'preview';
}

const MapEventHandlers: React.FC<MapEventHandlersProps> = ({
  handleMapDragStart,
  handleCombinedMouseMove,
  handleCombinedMouseUp,
  handleWheel,
  handleToolAction,
  mapRef,
  zoomLevel,
  mapPosition,
  children,
  viewMode
}) => {
  return (
    <div 
      ref={mapRef}
      className="flex-1 overflow-hidden"
      onMouseDown={handleMapDragStart}
      onMouseMove={handleCombinedMouseMove}
      onMouseUp={handleCombinedMouseUp}
      onMouseLeave={handleCombinedMouseUp}
      onWheel={handleWheel}
    >
      <div 
        className="relative cursor-crosshair h-full"
        onClick={viewMode === 'preview' ? undefined : handleToolAction}
        style={{
          transform: `scale(${zoomLevel}) translate(${mapPosition.x}px, ${mapPosition.y}px)`,
          transformOrigin: 'center',
          transition: 'transform 0.1s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default MapEventHandlers;
