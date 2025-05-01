import { useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { toast } from '../components/ui/use-toast';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../integrations/supabase/types';

export interface MapUploadData {
  name: string;
  file: File;
  type: 'sprint' | 'forest';
  scale: string;
  description?: string;
  isPublic?: boolean;
}

type Tables = Database['public']['Tables'];
export type Map = Tables['maps']['Row'] & {
  type?: 'sprint' | 'forest';
  scale?: string;
};

export const useMapStorage = () => {
  const [uploading, setUploading] = useState(false);
  const [maps, setMaps] = useState<Map[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const { user, session } = useUser();

  // Helper function to extract map metadata from description
  const parseMapMetadata = (map: Tables['maps']['Row']): Map => {
    let mapType: 'sprint' | 'forest' = 'forest';
    let mapScale = '10000';
    
    try {
      if (map.description) {
        const metadata = JSON.parse(map.description);
        // Ensure mapType is one of the allowed values
        if (metadata.type && (metadata.type === 'forest' || metadata.type === 'sprint')) {
          mapType = metadata.type;
        }
        if (metadata.scale) mapScale = metadata.scale;
      }
    } catch (e) {
      console.error('Error parsing map metadata:', e);
    }
    
    return {
      ...map,
      type: mapType,
      scale: mapScale
    };
  };

  // Fetch user's maps
  const fetchMaps = async () => {
    if (!session) {
      return [];
    }
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .eq('owner_id', session?.user.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      const mapsWithMetadata = (data || []).map(parseMapMetadata);
      setMaps(mapsWithMetadata);
      setLoading(false);
      return mapsWithMetadata;
    } catch (error: any) {
      console.error('Error in fetchMaps:', error);
      toast({
        title: t('error'),
        description: error.message || 'Failed to fetch maps',
        variant: 'destructive'
      });
      setLoading(false);
      return [];
    }
  };

  // Upload a map to storage and save metadata to database
  const uploadMap = async (mapData: MapUploadData) => {
    if (!session?.user) {
      toast({
        title: t('error'),
        description: t('signInRequired'),
        variant: 'destructive'
      });
      return null;
    }
    
    setUploading(true);
    
    try {
      // Generate a unique file path
      const fileExt = mapData.file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;
      
      console.log('Uploading map to:', filePath);
      
      // Upload file to storage
      const { error: uploadError, data: fileData } = await supabase.storage
        .from('maps')
        .upload(filePath, mapData.file, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('maps')
        .getPublicUrl(filePath);
        
      // Prepare metadata as JSON string
      const metadata = {
        type: mapData.type,
        scale: mapData.scale
      };
      
      // Create database entry
      const { error: dbError, data: mapRecord } = await supabase
        .from('maps')
        .insert({
          name: mapData.name,
          description: JSON.stringify(metadata), // Store metadata as JSON string
          file_url: publicUrl,
          thumbnail_url: null,
          owner_id: session.user.id,
          is_public: mapData.isPublic || false,
        })
        .select()
        .single();
        
      if (dbError) {
        throw dbError;
      }
      
      toast({
        title: t('success'),
        description: t('mapUploaded')
      });
      
      // Refresh maps list
      await fetchMaps();
      
      setUploading(false);
      return parseMapMetadata(mapRecord);
    } catch (error: any) {
      console.error('Error uploading map:', error);
      toast({
        title: t('error'),
        description: error.message || 'Failed to upload map',
        variant: 'destructive'
      });
      setUploading(false);
      return null;
    }
  };

  // Delete a map
  const deleteMap = async (mapId: string) => {
    if (!session?.user) {
      return false;
    }
    
    try {
      // First, fetch the map to get the file path
      const { data: mapData, error: fetchError } = await supabase
        .from('maps')
        .select('*')
        .eq('id', mapId)
        .single();
        
      if (fetchError) {
        throw fetchError;
      }
      
      // Delete the database record
      const { error: deleteError } = await supabase
        .from('maps')
        .delete()
        .eq('id', mapId);
        
      if (deleteError) {
        throw deleteError;
      }
      
      // Extract file path from URL
      if (mapData) {
        const fileUrl = mapData.file_url;
        const filePath = fileUrl.split('maps/')[1];
      
        if (filePath) {
          // Delete from storage
          const { error: storageError } = await supabase.storage
            .from('maps')
            .remove([filePath]);
            
          if (storageError) {
            console.error('Error deleting file from storage:', storageError);
          }
        }
      }
      
      toast({
        title: t('success'),
        description: t('mapDeleted')
      });
      
      // Refresh maps list
      await fetchMaps();
      
      return true;
    } catch (error: any) {
      console.error('Error deleting map:', error);
      toast({
        title: t('error'),
        description: error.message || 'Failed to delete map',
        variant: 'destructive'
      });
      return false;
    }
  };

  return {
    maps,
    loading,
    uploading,
    fetchMaps,
    uploadMap,
    deleteMap
  };
};
