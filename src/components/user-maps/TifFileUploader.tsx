import React, { useState, useCallback } from 'react';
import { Upload, FileImage, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';

interface TifFileUploaderProps {
  label: string;
  description: string;
  onFileSelected: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

const TifFileUploader: React.FC<TifFileUploaderProps> = ({
  label,
  description,
  onFileSelected,
  selectedFile,
  onClear,
}) => {
  const [isDragging, setIsDragging] = useState(false);

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

  const validateFile = useCallback((file: File): boolean => {
    const validTypes = ['image/tiff', 'image/tif'];
    const extension = file.name.toLowerCase().split('.').pop();
    
    if (!validTypes.includes(file.type) && !['tif', 'tiff'].includes(extension || '')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a TIF/TIFF file',
        variant: 'destructive',
      });
      return false;
    }

    // Max 200MB
    if (file.size > 200 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 200MB',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        onFileSelected(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onFileSelected(file);
      }
    }
  };

  const inputId = `tif-upload-${label.replace(/\s+/g, '-').toLowerCase()}`;

  if (selectedFile) {
    return (
      <div className="border rounded-lg p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-sm">{label}</p>
              <p className="text-xs text-muted-foreground">
                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-border'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <FileImage className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
      <p className="font-medium text-sm mb-1">{label}</p>
      <p className="text-xs text-muted-foreground mb-4">{description}</p>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => document.getElementById(inputId)?.click()}
      >
        <Upload className="h-4 w-4 mr-2" />
        Select TIF File
      </Button>
      <Input
        id={inputId}
        type="file"
        accept=".tif,.tiff,image/tiff"
        className="hidden"
        onChange={handleFileInputChange}
      />
    </div>
  );
};

export default TifFileUploader;
