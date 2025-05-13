
import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from './ui/use-toast';
import { useLanguage } from '../context/LanguageContext';
import { useMapStorage, MapUploadData } from '../hooks/useMapStorage';
import { useUser } from '../context/UserContext';
import FileDropZone from './map-uploader/FileDropZone';
import MapPreview from './map-uploader/MapPreview';
import MapMetadataForm from './map-uploader/MapMetadataForm';

interface MapUploaderProps {
  onMapUploaded?: (metadata: MapUploadData) => void;
}

const MapUploader: React.FC<MapUploaderProps> = ({ onMapUploaded }) => {
  const { t } = useLanguage();
  const { user } = useUser();
  const { uploadMap, uploading } = useMapStorage();
  const [mapFile, setMapFile] = useState<File | null>(null);
  const [mapName, setMapName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'sprint' | 'forest'>('forest');
  const [mapScale, setMapScale] = useState('10000');
  const [customScale, setCustomScale] = useState('');
  const [useCustomScale, setUseCustomScale] = useState(false);
  
  // Handle file selected from FileDropZone
  const handleFileSelected = (file: File) => {
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
  const handleUpload = async () => {
    if (!user) {
      toast({
        title: t('error'),
        description: t('signInRequired'),
        variant: "destructive"
      });
      return;
    }
    
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
    const metadata: MapUploadData = {
      name: mapName,
      file: mapFile,
      type: mapType,
      scale: useCustomScale ? customScale : mapScale,
      isPublic: false
    };
    
    // Upload the map using our hook
    const result = await uploadMap(metadata);
    
    if (result && onMapUploaded) {
      onMapUploaded(metadata);
    }
    
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
        <FileDropZone onFileSelected={handleFileSelected} />
      ) : (
        <div className="space-y-4">
          <MapPreview 
            previewUrl={previewUrl}
            onRemove={resetForm}
          />
          
          <MapMetadataForm
            mapName={mapName}
            setMapName={setMapName}
            mapType={mapType}
            setMapType={setMapType}
            mapScale={mapScale}
            setMapScale={setMapScale}
            customScale={customScale}
            setCustomScale={setCustomScale}
            useCustomScale={useCustomScale}
            setUseCustomScale={setUseCustomScale}
          />
          
          <Button 
            className="w-full" 
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                {t('uploading')}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t('upload.map')}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default MapUploader;
