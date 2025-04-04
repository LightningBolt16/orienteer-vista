
import { Control } from '../hooks/useEventState';

/**
 * Utility functions for handling map operations
 */

// Calculate distance between two points on the map
export const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
};

// Find the nearest control to a given point
export const findNearestControl = (
  x: number, 
  y: number, 
  controls: Control[], 
  maxDistance: number
): Control | null => {
  let nearestControl = null;
  let minDistance = maxDistance;
  
  for (const control of controls) {
    const distance = calculateDistance(x, y, control.x, control.y);
    if (distance < minDistance) {
      minDistance = distance;
      nearestControl = control;
    }
  }
  
  return nearestControl;
};

// Convert map coordinates based on scale
export const convertMapCoordinates = (
  x: number, 
  y: number, 
  fromScale: string, 
  toScale: string
): { x: number, y: number } => {
  const fromScaleNum = parseInt(fromScale);
  const toScaleNum = parseInt(toScale);
  
  if (!fromScaleNum || !toScaleNum) {
    return { x, y }; // Return unchanged if scales are invalid
  }
  
  const scaleFactor = fromScaleNum / toScaleNum;
  
  return {
    x: x * scaleFactor,
    y: y * scaleFactor
  };
};

// Get position relative to an element
export const getRelativePosition = (
  clientX: number, 
  clientY: number, 
  element: HTMLElement
): { x: number, y: number } => {
  const rect = element.getBoundingClientRect();
  
  return {
    x: ((clientX - rect.left) / rect.width) * 100, // Convert to percentage
    y: ((clientY - rect.top) / rect.height) * 100
  };
};
