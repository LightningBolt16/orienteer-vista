import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface RecoverMapButtonProps {
  mapId: string;
  userId: string;
  onRecovered: () => void;
}

const RecoverMapButton: React.FC<RecoverMapButtonProps> = ({
  mapId,
  userId,
  onRecovered,
}) => {
  const [recovering, setRecovering] = useState(false);

  const handleRecover = async () => {
    setRecovering(true);
    try {
      // Check if images exist in storage
      const { data: files16_9 } = await supabase.storage
        .from('user-route-images')
        .list(`${userId}/${mapId}/16_9`);
      
      const { data: files9_16 } = await supabase.storage
        .from('user-route-images')
        .list(`${userId}/${mapId}/9_16`);

      const count16_9 = files16_9?.filter(f => f.name.endsWith('.webp'))?.length || 0;
      const count9_16 = files9_16?.filter(f => f.name.endsWith('.webp'))?.length || 0;

      if (count16_9 === 0 && count9_16 === 0) {
        toast({
          title: 'No Images Found',
          description: 'No processed images were found for this map. Processing may still be in progress.',
          variant: 'destructive',
        });
        return;
      }

      // Get the map details
      const { data: userMap } = await supabase
        .from('user_maps')
        .select('name')
        .eq('id', mapId)
        .single();

      if (!userMap) {
        throw new Error('Map not found');
      }

      // Check if route_maps already exists
      const { data: existingRouteMap } = await supabase
        .from('route_maps')
        .select('id')
        .eq('source_map_id', mapId)
        .maybeSingle();

      let routeMapId: string;

      if (existingRouteMap) {
        routeMapId = existingRouteMap.id;
      } else {
        // Create route_maps entry
        const { data: newRouteMap, error: routeMapError } = await supabase
          .from('route_maps')
          .insert({
            name: userMap.name,
            user_id: userId,
            source_map_id: mapId,
            is_public: false,
            description: `${Math.max(count16_9, count9_16)} routes (recovered)`,
            map_type: 'forest',
          })
          .select()
          .single();

        if (routeMapError) throw routeMapError;
        routeMapId = newRouteMap.id;
      }

      // Check if route_images already exist
      const { data: existingImages } = await supabase
        .from('route_images')
        .select('id')
        .eq('map_id', routeMapId)
        .limit(1);

      if (!existingImages || existingImages.length === 0) {
        // Create route_images entries for 16:9
        const routeImages: any[] = [];
        
        if (files16_9) {
          files16_9.filter(f => f.name.endsWith('.webp')).forEach((file, idx) => {
            const candidateMatch = file.name.match(/candidate_(\d+)\.webp/);
            const candidateIndex = candidateMatch ? parseInt(candidateMatch[1]) : idx + 1;
            
            routeImages.push({
              map_id: routeMapId,
              candidate_index: candidateIndex,
              aspect_ratio: '16_9',
              shortest_side: 'left', // Default, as we don't have CSV data
              image_path: `${userId}/${mapId}/16_9/${file.name}`,
            });
          });
        }

        // Create route_images entries for 9:16
        if (files9_16) {
          files9_16.filter(f => f.name.endsWith('.webp')).forEach((file, idx) => {
            const candidateMatch = file.name.match(/candidate_(\d+)\.webp/);
            const candidateIndex = candidateMatch ? parseInt(candidateMatch[1]) : idx + 1;
            
            routeImages.push({
              map_id: routeMapId,
              candidate_index: candidateIndex,
              aspect_ratio: '9_16',
              shortest_side: 'left',
              image_path: `${userId}/${mapId}/9_16/${file.name}`,
            });
          });
        }

        if (routeImages.length > 0) {
          await supabase.from('route_images').insert(routeImages);
        }
      }

      // Update map status to completed
      await supabase
        .from('user_maps')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', mapId);

      toast({
        title: 'Map Recovered',
        description: `Successfully recovered ${Math.max(count16_9, count9_16)} routes from this map.`,
      });

      onRecovered();
    } catch (error) {
      console.error('Recovery error:', error);
      toast({
        title: 'Recovery Failed',
        description: 'Failed to recover the map. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRecovering(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRecover}
      disabled={recovering}
    >
      {recovering ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Recovering...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 mr-2" />
          Recover
        </>
      )}
    </Button>
  );
};

export default RecoverMapButton;
