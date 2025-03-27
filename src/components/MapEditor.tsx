
import React, { useRef, useState, useEffect } from 'react';
import { Circle, Flag } from 'lucide-react';
import { toast } from '../components/ui/use-toast';

interface Control {
  id: string;
  type: 'start' | 'control' | 'finish';
  x: number;
  y: number;
  number?: number;
}

interface MapEditorProps {
  mapUrl: string;
  controls: Control[];
  onAddControl: (x: number, y: number) => void;
}

const MapEditor: React.FC<MapEditorProps> = ({ mapUrl, controls, onAddControl }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Handle map click to add a control
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    
    // Get click position relative to the canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100; // Convert to percentage
    const y = ((e.clientY - rect.top) / rect.height) * 100; // Convert to percentage
    
    onAddControl(x, y);
  };
  
  // Track map dimensions when image loads
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setMapDimensions({
      width: e.currentTarget.naturalWidth,
      height: e.currentTarget.naturalHeight,
    });
    setMapLoaded(true);
  };
  
  return (
    <div className="relative border rounded-lg overflow-hidden">
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}
      
      <div 
        ref={canvasRef}
        className="relative cursor-crosshair"
        onClick={handleMapClick}
      >
        <img 
          src={mapUrl} 
          alt="Orienteering Map" 
          className="w-full h-auto"
          onLoad={handleImageLoad}
        />
        
        {/* Render controls on the map */}
        {controls.map(control => (
          <div 
            key={control.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{ 
              left: `${control.x}%`, 
              top: `${control.y}%`,
            }}
          >
            {control.type === 'start' && (
              <div className="relative">
                <Flag className="h-8 w-8 text-green-600" />
              </div>
            )}
            
            {control.type === 'control' && (
              <div className="relative">
                <div className="h-7 w-7 rounded-full border-2 border-purple-600"></div>
                {control.number !== undefined && (
                  <div className="absolute -top-3 -right-3 bg-white text-purple-600 rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
                    {control.number}
                  </div>
                )}
              </div>
            )}
            
            {control.type === 'finish' && (
              <div className="relative">
                <Flag className="h-8 w-8 text-red-600" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapEditor;
