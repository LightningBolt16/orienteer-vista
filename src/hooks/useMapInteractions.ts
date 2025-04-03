
import { useState, useRef, RefObject } from 'react';

interface MapPosition {
  x: number;
  y: number;
}

interface UseMapInteractionsProps {
  viewMode?: 'edit' | 'preview';
}

export function useMapInteractions({ viewMode = 'edit' }: UseMapInteractionsProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [mapPosition, setMapPosition] = useState<MapPosition>({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [dragStart, setDragStart] = useState<MapPosition>({ x: 0, y: 0 });
  
  // Handle zoom operations
  const handleZoom = (direction: 'in' | 'out') => {
    if (direction === 'in') {
      setZoomLevel(prev => Math.min(prev + 0.1, 3));
    } else {
      setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
    }
  };
  
  // Reset map zoom and position
  const resetView = () => {
    setZoomLevel(1);
    setMapPosition({ x: 0, y: 0 });
  };
  
  // Start panning the map
  const handleMapDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (viewMode !== 'preview') {
      setIsDraggingMap(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };
  
  // Handle mouse move for panning the map
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingMap) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setMapPosition({
        x: mapPosition.x + dx,
        y: mapPosition.y + dy
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };
  
  // End dragging
  const handleMouseUp = () => {
    setIsDraggingMap(false);
  };
  
  return {
    zoomLevel,
    mapPosition,
    isDraggingMap,
    handleZoom,
    resetView,
    handleMapDragStart,
    handleMouseMove,
    handleMouseUp
  };
}
