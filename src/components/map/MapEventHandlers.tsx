
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
  selectedTool?: string; // Added to help with cursor styles
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
  viewMode,
  selectedTool = 'pointer'
}) => {
  // Determine the appropriate cursor based on tool and view mode
  const getCursorStyle = () => {
    if (viewMode === 'preview') return 'cursor-default';
    
    switch (selectedTool) {
      case 'pointer': return 'cursor-default';
      case 'move': return 'cursor-move';
      default: return 'cursor-crosshair';
    }
  };
  
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
        className={`relative h-full ${getCursorStyle()}`}
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
