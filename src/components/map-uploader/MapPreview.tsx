
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';

interface MapPreviewProps {
  previewUrl: string;
  onRemove: () => void;
}

const MapPreview: React.FC<MapPreviewProps> = ({ previewUrl, onRemove }) => {
  return (
    <div className="relative border rounded-lg overflow-hidden">
      <img 
        src={previewUrl} 
        alt="Map preview" 
        className="w-full h-auto"
      />
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-2 right-2"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default MapPreview;
