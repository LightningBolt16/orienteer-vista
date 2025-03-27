
import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from './ui/use-toast';
import { useLanguage } from '../context/LanguageContext';

const MapUploader: React.FC = () => {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [mapFile, setMapFile] = useState<File | null>(null);
  const [mapName, setMapName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  // Handle drop event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };
  
  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFileSelected(file);
    }
  };
  
  // Common file handling logic
  const handleFileSelected = (file: File) => {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('error'),
        description: t('please.upload.image'),
        variant: "destructive"
      });
      return;
    }
    
    setMapFile(file);
    setMapName(file.name.replace(/\.[^/.]+$/, "")); // Remove file extension
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle upload
  const handleUpload = () => {
    if (!mapFile || !mapName) {
      toast({
        title: t('error'),
        description: t('missing.required.fields'),
        variant: "destructive"
      });
      return;
    }
    
    // Here we would typically upload to a server
    console.log('Uploading map:', { file: mapFile, name: mapName });
    
    toast({
      title: t('success'),
      description: t('map.uploaded'),
    });
    
    // Reset form
    setMapFile(null);
    setMapName('');
    setPreviewUrl(null);
  };
  
  // Reset the form
  const handleReset = () => {
    setMapFile(null);
    setMapName('');
    setPreviewUrl(null);
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t('upload.new.map')}</h3>
      
      {!previewUrl ? (
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm mb-2">{t('drag.drop.map')}</p>
          <p className="text-xs text-muted-foreground mb-4">{t('supported.formats')}</p>
          
          <Button 
            variant="outline" 
            onClick={() => document.getElementById('map-file-input')?.click()}
          >
            {t('select.file')}
          </Button>
          <Input 
            id="map-file-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>
      ) : (
        <div className="space-y-4">
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
              onClick={handleReset}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="map-name">{t('map.name')}</Label>
            <Input 
              id="map-name"
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              placeholder={t('enter.map.name')}
            />
          </div>
          
          <Button 
            className="w-full" 
            onClick={handleUpload}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t('upload.map')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default MapUploader;
