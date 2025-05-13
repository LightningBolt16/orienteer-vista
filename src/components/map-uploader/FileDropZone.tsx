
import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useLanguage } from '../../context/LanguageContext';
import { toast } from '../ui/use-toast';

interface FileDropZoneProps {
  onFileSelected: (file: File) => void;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({ onFileSelected }) => {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  
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
    
    onFileSelected(file);
  };
  
  return (
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
  );
};

export default FileDropZone;
