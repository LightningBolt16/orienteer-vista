
import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from './ui/use-toast';
import { useLanguage } from '../context/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

export interface MapMetadata {
  name: string;
  file: File;
  type: 'sprint' | 'forest';
  scale: string;
  customScale?: string;
}

const MapUploader: React.FC<{
  onMapUploaded?: (metadata: MapMetadata) => void;
}> = ({ onMapUploaded }) => {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [mapFile, setMapFile] = useState<File | null>(null);
  const [mapName, setMapName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'sprint' | 'forest'>('forest');
  const [mapScale, setMapScale] = useState('10000');
  const [customScale, setCustomScale] = useState('');
  const [useCustomScale, setUseCustomScale] = useState(false);
  
  // Define available scales based on map type
  const sprintScales = ['4000', '3000'];
  const forestScales = ['7500', '10000', '15000'];
  
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
    
    const scale = useCustomScale ? customScale : mapScale;
    
    if (!scale) {
      toast({
        title: t('error'),
        description: t('please.select.scale'),
        variant: "destructive"
      });
      return;
    }
    
    // Create metadata object
    const metadata: MapMetadata = {
      name: mapName,
      file: mapFile,
      type: mapType,
      scale: useCustomScale ? customScale : mapScale,
    };
    
    // Here we would typically upload to a server
    console.log('Uploading map:', metadata);
    
    if (onMapUploaded) {
      onMapUploaded(metadata);
    }
    
    toast({
      title: t('success'),
      description: t('map.uploaded'),
    });
    
    // Reset form
    resetForm();
  };
  
  // Reset the form
  const resetForm = () => {
    setMapFile(null);
    setMapName('');
    setPreviewUrl(null);
    setMapType('forest');
    setMapScale('10000');
    setCustomScale('');
    setUseCustomScale(false);
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
              onClick={resetForm}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="map-name">{t('map.name')}</Label>
              <Input 
                id="map-name"
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                placeholder={t('enter.map.name')}
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('map.type')}</Label>
              <RadioGroup 
                value={mapType} 
                onValueChange={(value: 'sprint' | 'forest') => {
                  setMapType(value);
                  // Reset scale when changing map type
                  if (value === 'sprint') {
                    setMapScale(sprintScales[0]);
                  } else {
                    setMapScale(forestScales[1]); // Default to 1:10000 for forest
                  }
                  setUseCustomScale(false);
                }}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sprint" id="sprint" />
                  <Label htmlFor="sprint">{t('sprint')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="forest" id="forest" />
                  <Label htmlFor="forest">{t('forest')}</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label>{t('map.scale')}</Label>
              <div className="space-y-2">
                {!useCustomScale ? (
                  <Select 
                    value={mapScale}
                    onValueChange={setMapScale}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('select.scale')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(mapType === 'sprint' ? sprintScales : forestScales).map(scale => (
                        <SelectItem key={scale} value={scale}>
                          1:{parseInt(scale).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center">
                    <span className="mr-2">1:</span>
                    <Input 
                      type="text"
                      value={customScale}
                      onChange={(e) => setCustomScale(e.target.value)}
                      placeholder="Enter custom scale"
                      className="flex-1"
                    />
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="custom-scale" 
                    checked={useCustomScale}
                    onChange={(e) => setUseCustomScale(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="custom-scale" className="text-sm">{t('use.custom.scale')}</Label>
                </div>
              </div>
            </div>
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
