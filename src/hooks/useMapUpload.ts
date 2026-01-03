import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ParsedRoute {
  candidateIndex: number;
  mainSide: string;
  mainLength: number;
  altLength: number;
  overlapPct?: number;
  hardness?: number;
  passNum?: number;
}

interface UploadProgress {
  stage: 'idle' | 'validating' | 'creating-map' | 'uploading-16_9' | 'uploading-9_16' | 'saving-metadata' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
}

interface FolderValidation {
  isValid: boolean;
  mapName: string;
  csvFile: File | null;
  images16_9: File[];
  images9_16: File[];
  parsedRoutes: ParsedRoute[];
  errors: string[];
}

export const useMapUpload = () => {
  const [progress, setProgress] = useState<UploadProgress>({
    stage: 'idle',
    current: 0,
    total: 0,
    message: ''
  });

  const parseCSV = useCallback(async (file: File): Promise<ParsedRoute[]> => {
    const text = await file.text();
    const lines = text.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows');
    }

    const header = lines[0].toLowerCase();
    const delimiter = header.includes(';') ? ';' : ',';
    const headers = header.split(delimiter).map(h => h.trim());

    const routes: ParsedRoute[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim());
      if (values.length < 4) continue;

      const idIdx = headers.findIndex(h => h === 'id');
      const mainSideIdx = headers.findIndex(h => h === 'main_side');
      const mainLenIdx = headers.findIndex(h => h === 'main_len');
      const altLenIdx = headers.findIndex(h => h === 'alt_len');
      const hardnessIdx = headers.findIndex(h => h === 'hardness');

      routes.push({
        candidateIndex: parseInt(values[idIdx] || String(i)),
        mainSide: values[mainSideIdx] || 'left',
        mainLength: parseFloat(values[mainLenIdx]) || 0,
        altLength: parseFloat(values[altLenIdx]) || 0,
        hardness: hardnessIdx >= 0 ? parseFloat(values[hardnessIdx]) : undefined
      });
    }

    return routes;
  }, []);

  const validateFolder = useCallback(async (files: FileList): Promise<FolderValidation> => {
    const result: FolderValidation = {
      isValid: false,
      mapName: '',
      csvFile: null,
      images16_9: [],
      images9_16: [],
      parsedRoutes: [],
      errors: []
    };

    const fileArray = Array.from(files);
    
    // Find map name from folder structure
    const paths = fileArray.map(f => f.webkitRelativePath || f.name);
    const folderMatch = paths[0]?.match(/^([^/]+)\//);
    
    if (!folderMatch) {
      result.errors.push('Could not detect map folder name');
      return result;
    }

    result.mapName = folderMatch[1];

    // Find CSV file
    const csvFile = fileArray.find(f => {
      const path = f.webkitRelativePath || f.name;
      return path.toLowerCase().endsWith('.csv') && 
             path.toLowerCase().includes(result.mapName.toLowerCase());
    });

    if (!csvFile) {
      result.errors.push(`CSV file not found. Expected: ${result.mapName}/${result.mapName}.csv`);
    } else {
      result.csvFile = csvFile;
      try {
        result.parsedRoutes = await parseCSV(csvFile);
      } catch (e) {
        result.errors.push(`Failed to parse CSV: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    // Find 16:9 images
    result.images16_9 = fileArray.filter(f => {
      const path = (f.webkitRelativePath || f.name).toLowerCase();
      return path.includes('/16_9/') && path.endsWith('.webp');
    }).sort((a, b) => {
      const numA = parseInt(a.name.match(/(\d+)/)?.[1] || '0');
      const numB = parseInt(b.name.match(/(\d+)/)?.[1] || '0');
      return numA - numB;
    });

    // Find 9:16 images
    result.images9_16 = fileArray.filter(f => {
      const path = (f.webkitRelativePath || f.name).toLowerCase();
      return path.includes('/9_16/') && path.endsWith('.webp');
    }).sort((a, b) => {
      const numA = parseInt(a.name.match(/(\d+)/)?.[1] || '0');
      const numB = parseInt(b.name.match(/(\d+)/)?.[1] || '0');
      return numA - numB;
    });

    if (result.images16_9.length === 0) {
      result.errors.push('No 16:9 WebP images found in /16_9/ folder');
    }

    if (result.images9_16.length === 0) {
      result.errors.push('No 9:16 WebP images found in /9_16/ folder');
    }

    // Validate counts match
    if (result.parsedRoutes.length > 0) {
      if (result.images16_9.length !== result.parsedRoutes.length) {
        result.errors.push(`16:9 image count (${result.images16_9.length}) doesn't match CSV rows (${result.parsedRoutes.length})`);
      }
      if (result.images9_16.length !== result.parsedRoutes.length) {
        result.errors.push(`9:16 image count (${result.images9_16.length}) doesn't match CSV rows (${result.parsedRoutes.length})`);
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }, [parseCSV]);

  const uploadImages = useCallback(async (
    mapName: string,
    images: File[],
    aspectRatio: '16_9' | '9_16',
    onProgress: (current: number) => void
  ): Promise<string[]> => {
    const paths: string[] = [];
    const batchSize = 5;
    const folderName = mapName.toLowerCase();

    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      
      const uploads = batch.map(async (file, batchIndex) => {
        const index = i + batchIndex + 1;
        const filePath = `${folderName}/${aspectRatio}/candidate_${index}.webp`;
        
        const { error } = await supabase.storage
          .from('route-images')
          .upload(filePath, file, { 
            upsert: true,
            contentType: 'image/webp'
          });

        if (error) throw new Error(`Failed to upload ${filePath}: ${error.message}`);
        
        return filePath;
      });

      const batchPaths = await Promise.all(uploads);
      paths.push(...batchPaths);
      onProgress(Math.min(i + batchSize, images.length));
    }

    return paths;
  }, []);

  const uploadMap = useCallback(async (validation: FolderValidation): Promise<void> => {
    try {
      // Stage: Creating map entry
      setProgress({
        stage: 'creating-map',
        current: 0,
        total: 1,
        message: `Creating map entry for "${validation.mapName}"...`
      });

      const { data: mapData, error: mapError } = await supabase
        .from('route_maps')
        .insert({ name: validation.mapName })
        .select('id')
        .single();

      if (mapError) throw new Error(`Failed to create map: ${mapError.message}`);

      const mapId = mapData.id;
      const total16_9 = validation.images16_9.length;
      const total9_16 = validation.images9_16.length;

      // Stage: Upload 16:9 images
      setProgress({
        stage: 'uploading-16_9',
        current: 0,
        total: total16_9,
        message: `Uploading 16:9 images (0/${total16_9})...`
      });

      await uploadImages(validation.mapName, validation.images16_9, '16_9', (current) => {
        setProgress({
          stage: 'uploading-16_9',
          current,
          total: total16_9,
          message: `Uploading 16:9 images (${current}/${total16_9})...`
        });
      });

      // Stage: Upload 9:16 images
      setProgress({
        stage: 'uploading-9_16',
        current: 0,
        total: total9_16,
        message: `Uploading 9:16 images (0/${total9_16})...`
      });

      await uploadImages(validation.mapName, validation.images9_16, '9_16', (current) => {
        setProgress({
          stage: 'uploading-9_16',
          current,
          total: total9_16,
          message: `Uploading 9:16 images (${current}/${total9_16})...`
        });
      });

      // Stage: Save metadata
      setProgress({
        stage: 'saving-metadata',
        current: 0,
        total: validation.parsedRoutes.length * 2,
        message: 'Saving route metadata...'
      });

      const folderName = validation.mapName.toLowerCase();
      const routeRecords = validation.parsedRoutes.flatMap((route) => [
        {
          map_id: mapId,
          candidate_index: route.candidateIndex,
          aspect_ratio: '16:9',
          shortest_side: route.mainSide.toLowerCase(),
          main_route_length: route.mainLength,
          alt_route_length: route.altLength,
          image_path: `${folderName}/16_9/candidate_${route.candidateIndex}.webp`
        },
        {
          map_id: mapId,
          candidate_index: route.candidateIndex,
          aspect_ratio: '9:16',
          shortest_side: route.mainSide.toLowerCase(),
          main_route_length: route.mainLength,
          alt_route_length: route.altLength,
          image_path: `${folderName}/9_16/candidate_${route.candidateIndex}.webp`
        }
      ]);

      // Insert in batches
      const batchSize = 100;
      for (let i = 0; i < routeRecords.length; i += batchSize) {
        const batch = routeRecords.slice(i, i + batchSize);
        const { error } = await supabase.from('route_images').insert(batch);
        if (error) throw new Error(`Failed to save metadata: ${error.message}`);
        
        setProgress({
          stage: 'saving-metadata',
          current: Math.min(i + batchSize, routeRecords.length),
          total: routeRecords.length,
          message: `Saving route metadata (${Math.min(i + batchSize, routeRecords.length)}/${routeRecords.length})...`
        });
      }

      setProgress({
        stage: 'complete',
        current: 1,
        total: 1,
        message: `Successfully uploaded "${validation.mapName}" with ${validation.parsedRoutes.length} routes!`
      });

    } catch (error) {
      setProgress({
        stage: 'error',
        current: 0,
        total: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      throw error;
    }
  }, [uploadImages]);

  const reset = useCallback(() => {
    setProgress({
      stage: 'idle',
      current: 0,
      total: 0,
      message: ''
    });
  }, []);

  return {
    progress,
    validateFolder,
    uploadMap,
    reset
  };
};
