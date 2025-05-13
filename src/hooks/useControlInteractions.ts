
import { useState } from 'react';
import { toast } from '../components/ui/use-toast';

interface Control {
  id: string;
  type: string;
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

  // Define advanced tool types
  const advancedToolTypes = [
    'timed-start', 'mandatory-crossing', 'optional-crossing', 'out-of-bounds',
    'temporary-construction', 'water-location', 'first-aid', 'forbidden-route',
    'uncrossable-boundary', 'registration-mark'
  ];
  
  // Check if selected tool is an advanced tool
  const isAdvancedTool = advancedToolTypes.includes(selectedTool);

  // Handle map click to add a control with snapping
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || 
        selectedTool === 'pointer' || 
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
    
    // For regular controls only (not advanced tools), auto-number them
    let number = undefined;
    let code = undefined;
    if (selectedTool === 'control') {
      number = controls.filter(c => c.type === 'control').length + 1;
      code = `${number}`;
    }
    
    // Check if adding a start control when one already exists
    if (selectedTool === 'start') {
      const existingStart = controls.find(c => c.type === 'start');
      if (existingStart) {
        toast({
          title: "Only one start allowed",
          description: "A course can only have one start point. Delete the existing one first.",
          variant: "destructive"
        });
        return;
      }
    }
    
    const newControl: Control = {
      id: `control-${Date.now()}`,
      type: selectedTool,
      x,
      y,
      number,
      code
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
