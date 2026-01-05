import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { toast } from '@/components/ui/use-toast';

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
};

interface UploadData {
  name: string;
  colorTifFile: File;
  bwTifFile: File;
  roiCoordinates: { x: number; y: number }[];
  processingParameters?: ProcessingParameters;
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

  const uploadUserMap = useCallback(async (data: UploadData): Promise<UserMap | null> => {
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
      const sanitizedName = data.name.replace(/[^a-zA-Z0-9-_]/g, '_');
      const colorPath = `${user.id}/${sanitizedName}/color.tif`;
      const bwPath = `${user.id}/${sanitizedName}/bw.tif`;

      // Upload color TIF
      const { error: colorError } = await supabase.storage
        .from('user-map-sources')
        .upload(colorPath, data.colorTifFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (colorError) throw new Error(`Failed to upload color TIF: ${colorError.message}`);

      // Upload B&W TIF
      const { error: bwError } = await supabase.storage
        .from('user-map-sources')
        .upload(bwPath, data.bwTifFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (bwError) throw new Error(`Failed to upload B&W TIF: ${bwError.message}`);

      // Create database record using any to bypass strict typing for new table
      const insertData = {
        user_id: user.id,
        name: data.name,
        color_tif_path: colorPath,
        bw_tif_path: bwPath,
        roi_coordinates: data.roiCoordinates as unknown,
        processing_parameters: (data.processingParameters || DEFAULT_PROCESSING_PARAMETERS) as unknown,
        status: 'pending',
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

      // Delete storage files
      await supabase.storage
        .from('user-map-sources')
        .remove([mapToDelete.color_tif_path, mapToDelete.bw_tif_path]);

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
    uploadUserMap,
    deleteUserMap,
  };
}
