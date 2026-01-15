import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { toast } from '@/components/ui/use-toast';
import { uploadMapFilesToR2 } from '@/utils/r2Upload';

export interface UserMap {
  id: string;
  user_id: string;
  name: string;
  color_tif_path: string;
  bw_tif_path: string;
  roi_coordinates: { x: number; y: number }[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  processing_parameters: ProcessingParameters;
  storage_provider?: 'supabase' | 'r2';
  r2_color_key?: string | null;
  r2_bw_key?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcessingParameters {
  num_random_points?: number;
  candidate_min_dist?: number;
  candidate_max_dist?: number;
  max_candidate_pairs?: number;
  num_output_routes?: number;
  max_overlap_percent?: number;
  batch_size?: number;
  zoom_margin?: number;
  marker_radius?: number;
  line_width?: number;
  line_alpha?: number;
  smoothing_window?: number;
  corridor_base_width?: number;
  corridor_scale_factor?: number;
  num_alternate_routes?: 1 | 2 | 3;
}

export const DEFAULT_PROCESSING_PARAMETERS: ProcessingParameters = {
  num_random_points: 1000,
  candidate_min_dist: 300,
  candidate_max_dist: 1500,
  max_candidate_pairs: 15000,
  num_output_routes: 50,
  max_overlap_percent: 0.20,
  batch_size: 25,
  zoom_margin: 50,
  marker_radius: 50,
  line_width: 8,
  line_alpha: 0.6,
  smoothing_window: 5,
  corridor_base_width: 50,
  corridor_scale_factor: 0.5,
  num_alternate_routes: 1,
};

interface ImpassableAnnotations {
  areas: Array<{ points: Array<{ x: number; y: number }> }>;
  lines: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }>;
}

interface UploadDataR2 {
  name: string;
  colorTifFile: File;
  bwTifFile: File;
  roiCoordinates: { x: number; y: number }[];
  processingParameters?: ProcessingParameters;
  dimensions: { width: number; height: number };
  impassableAnnotations?: ImpassableAnnotations | null;
  onProgress?: (colorPercent: number, bwPercent: number) => void;
}

export function useUserMaps() {
  const { user } = useUser();
  const [userMaps, setUserMaps] = useState<UserMap[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchUserMaps = useCallback(async () => {
    if (!user) return [];
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_maps' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }) as { data: any[] | null; error: any };

      if (error) throw error;
      
      const maps: UserMap[] = (data || []).map((map: any) => ({
        id: map.id,
        user_id: map.user_id,
        name: map.name,
        color_tif_path: map.color_tif_path,
        bw_tif_path: map.bw_tif_path,
        roi_coordinates: map.roi_coordinates as { x: number; y: number }[],
        processing_parameters: map.processing_parameters as ProcessingParameters,
        status: map.status as UserMap['status'],
        error_message: map.error_message,
        storage_provider: map.storage_provider,
        r2_color_key: map.r2_color_key,
        r2_bw_key: map.r2_bw_key,
        created_at: map.created_at,
        updated_at: map.updated_at,
      }));
      
      setUserMaps(maps);
      return maps;
    } catch (error) {
      console.error('Error fetching user maps:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch your maps',
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Upload map files directly to R2 using presigned URLs
   * This bypasses Supabase storage limits
   */
  const uploadUserMapR2 = useCallback(async (data: UploadDataR2): Promise<UserMap | null> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to upload maps',
        variant: 'destructive',
      });
      return null;
    }

    setUploading(true);
    try {
      // Step 1: Upload files directly to R2
      console.log('Uploading files to R2...');
      const r2Result = await uploadMapFilesToR2(
        user.id,
        data.name,
        data.colorTifFile,
        data.bwTifFile,
        data.onProgress
      );

      console.log('R2 upload complete:', r2Result);

      // Step 2: Create database record with R2 paths
      const insertData = {
        user_id: user.id,
        name: data.name,
        color_tif_path: r2Result.colorKey, // Store R2 key as path
        bw_tif_path: r2Result.bwKey,
        roi_coordinates: data.roiCoordinates as unknown,
        processing_parameters: (data.processingParameters || DEFAULT_PROCESSING_PARAMETERS) as unknown,
        status: 'pending',
        storage_provider: 'r2',
        r2_color_key: r2Result.colorKey,
        r2_bw_key: r2Result.bwKey,
        is_tiled: false,
        tile_grid: null,
        impassable_annotations: data.impassableAnnotations || null,
      };

      const { data: mapRecord, error: dbError } = await supabase
        .from('user_maps' as any)
        .insert(insertData as any)
        .select()
        .single() as { data: any; error: any };

      if (dbError) throw new Error(`Failed to create map record: ${dbError.message}`);

      const userMap: UserMap = {
        id: mapRecord.id,
        user_id: mapRecord.user_id,
        name: mapRecord.name,
        color_tif_path: mapRecord.color_tif_path,
        bw_tif_path: mapRecord.bw_tif_path,
        roi_coordinates: mapRecord.roi_coordinates as { x: number; y: number }[],
        processing_parameters: mapRecord.processing_parameters as ProcessingParameters,
        status: mapRecord.status as UserMap['status'],
        error_message: mapRecord.error_message,
        storage_provider: mapRecord.storage_provider,
        r2_color_key: mapRecord.r2_color_key,
        r2_bw_key: mapRecord.r2_bw_key,
        created_at: mapRecord.created_at,
        updated_at: mapRecord.updated_at,
      };

      setUserMaps(prev => [userMap, ...prev]);
      
      toast({
        title: 'Success',
        description: 'Map uploaded successfully! Processing will begin shortly.',
      });

      return userMap;
    } catch (error) {
      console.error('Error uploading user map:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload map',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  }, [user]);

  const deleteUserMap = useCallback(async (mapId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const mapToDelete = userMaps.find(m => m.id === mapId);
      if (!mapToDelete) return false;

      // For Supabase storage, delete files
      if (mapToDelete.storage_provider !== 'r2') {
        await supabase.storage
          .from('user-map-sources')
          .remove([mapToDelete.color_tif_path, mapToDelete.bw_tif_path]);
      }
      // Note: R2 files would need to be deleted via a separate endpoint/function

      // Delete database record
      const { error } = await supabase
        .from('user_maps' as any)
        .delete()
        .eq('id', mapId);

      if (error) throw error;

      setUserMaps(prev => prev.filter(m => m.id !== mapId));
      
      toast({
        title: 'Deleted',
        description: 'Map deleted successfully',
      });

      return true;
    } catch (error) {
      console.error('Error deleting user map:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete map',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, userMaps]);

  return {
    userMaps,
    loading,
    uploading,
    fetchUserMaps,
    uploadUserMapR2,
    deleteUserMap,
  };
}
