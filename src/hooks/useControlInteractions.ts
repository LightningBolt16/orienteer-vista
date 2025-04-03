
import { useState } from 'react';
import { toast } from '../components/ui/use-toast';

interface Control {
  id: string;
  type: 'start' | 'control' | 'finish' | 'crossing-point' | 'uncrossable-boundary' | 'out-of-bounds' | 'water-station';
  x: number;
  y: number;
  number?: number;
  code?: string;
  description?: string;
}

interface UseControlInteractionsProps {
  controls: Control[];
  onUpdateControl?: (id: string, x: number, y: number) => void;
  onSelectControl?: (control: Control) => void;
  selectedTool: string;
  viewMode?: 'edit' | 'preview';
  canvasRef: React.RefObject<HTMLDivElement>;
  onAddControl: (control: Control) => void;
  snapDistance?: number;
  allControls?: Control[];
}

export function useControlInteractions({
  controls,
  onUpdateControl,
  onSelectControl,
  selectedTool,
  viewMode = 'edit',
  canvasRef,
  onAddControl,
  snapDistance = 2,
  allControls = []
}: UseControlInteractionsProps) {
  const [draggedControlId, setDraggedControlId] = useState<string | null>(null);

  // Handle map click to add a control with snapping
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || 
        selectedTool === 'pointer' || 
        selectedTool === 'zoom-in' || 
        selectedTool === 'zoom-out' ||
        selectedTool === 'move' ||
        viewMode === 'preview') return;
    
    // Get click position relative to the canvas
    const rect = canvasRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100; // Convert to percentage
    let y = ((e.clientY - rect.top) / rect.height) * 100; // Convert to percentage
    
    // Check if should snap to existing control
    const snapPoint = findSnapPoint(x, y, allControls, snapDistance);
    if (snapPoint) {
      x = snapPoint.x;
      y = snapPoint.y;
    }
    
    const controlType = selectedTool as Control['type'];
    
    const newControl: Control = {
      id: `control-${Date.now()}`,
      type: controlType,
      x,
      y,
      number: controlType === 'control' ? 
        controls.filter(c => c.type === 'control').length + 1 : undefined,
      code: controlType === 'control' ? `${controls.filter(c => c.type === 'control').length + 1}` : undefined
    };
    
    onAddControl(newControl);
  };

  // Find a snap point if within snap distance
  const findSnapPoint = (x: number, y: number, controls: Control[], snapDist: number): {x: number, y: number} | null => {
    if (!snapDist) return null;
    
    // Check all controls from all courses
    for (const control of controls) {
      const distance = Math.sqrt(Math.pow(control.x - x, 2) + Math.pow(control.y - y, 2));
      if (distance <= snapDist) {
        return { x: control.x, y: control.y };
      }
    }
    
    return null;
  };
  
  // Start dragging a control
  const handleControlMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    controlId: string,
    control: Control
  ) => {
    if (selectedTool !== 'pointer' || viewMode === 'preview') return;
    e.stopPropagation();
    setDraggedControlId(controlId);
    if (onSelectControl) {
      onSelectControl(control);
    }
  };
  
  // Handle control click for selection
  const handleControlClick = (
    e: React.MouseEvent<HTMLDivElement>,
    control: Control
  ) => {
    if (viewMode === 'preview') return;
    e.stopPropagation();
    if (onSelectControl) {
      onSelectControl(control);
    }
  };
  
  // Handle mouse move for dragging controls
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedControlId && canvasRef.current && onUpdateControl) {
      // Dragging a control
      const rect = canvasRef.current.getBoundingClientRect();
      let x = ((e.clientX - rect.left) / rect.width) * 100;
      let y = ((e.clientY - rect.top) / rect.height) * 100;
      
      // Check if should snap to existing control
      const snapPoint = findSnapPoint(x, y, allControls, snapDistance);
      if (snapPoint) {
        x = snapPoint.x;
        y = snapPoint.y;
      }
      
      onUpdateControl(draggedControlId, x, y);
    }
  };
  
  // End dragging
  const handleMouseUp = () => {
    setDraggedControlId(null);
  };
  
  // Map click handler based on selected tool
  const handleToolAction = (e: React.MouseEvent<HTMLDivElement>) => {
    handleMapClick(e);
  };

  return {
    draggedControlId,
    handleControlMouseDown,
    handleControlClick,
    handleMouseMove,
    handleMouseUp,
    handleToolAction,
    findSnapPoint
  };
}
